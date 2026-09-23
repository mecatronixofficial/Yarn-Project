import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';
import { documentNo } from '../common/numbering';
import { AuthUser } from '../common/auth-user';
import { CreateDeliveryDto, CreateDispatchDto, CreatePackingDto } from './dto/dispatch.dto';
import { MANAGEMENT_ROLES, notifyRoles } from '../notifications/notify.util';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  list() {
    return this.prisma.dispatch.findMany({
      include: { salesOrder: { include: { customer: true } }, packingList: true, invoice: true, deliveries: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async context() {
    const [orders, rolls, packingLists, invoices, warehouses] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: { status: { notIn: ['DRAFT', 'CANCELLED', 'CLOSED'] } },
        include: { customer: true, items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.finishedFabricRoll.findMany({
        where: { qcStatus: 'PASSED' },
        include: { packingItems: true, productionOrder: { include: { salesOrder: true, salesOrderItem: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.packingList.findMany({
        where: { status: 'PACKED' },
        include: { salesOrder: true, items: { include: { roll: true } }, dispatches: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.findMany({
        where: { status: { notIn: ['DRAFT', 'CANCELLED'] } },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouse.findMany({ where: { active: true }, orderBy: { code: 'asc' } }),
    ]);

    return {
      orders,
      rolls: rolls.filter((roll) => roll.packingItems.length === 0),
      packingLists: packingLists.filter((packing) => packing.dispatches.length === 0),
      invoices,
      warehouses,
    };
  }

  async pack(dto: CreatePackingDto) {
    if (!dto.rollIds.length) throw new BadRequestException('Select finished rolls');
    const order = await this.prisma.salesOrder.findUnique({ where: { id: dto.salesOrderId } });
    if (!order || ['DRAFT', 'CANCELLED', 'CLOSED'].includes(order.status)) throw new BadRequestException('Order is not eligible for packing');

    const rolls = await this.prisma.finishedFabricRoll.findMany({
      where: { id: { in: dto.rollIds }, qcStatus: 'PASSED' },
      include: { packingItems: true, productionOrder: true },
    });
    if (rolls.length !== dto.rollIds.length) throw new BadRequestException('Only QC-passed finished rolls can be packed');
    if (rolls.some((roll) => roll.productionOrder.salesOrderId !== dto.salesOrderId)) throw new BadRequestException('All rolls must belong to the selected sales order');
    if (rolls.some((roll) => roll.packingItems.length > 0)) throw new BadRequestException('One or more rolls are already packed');

    const netWeightKg = rolls.reduce((sum, roll) => sum + Number(roll.netWeightKg), 0);
    const packing = await this.prisma.packingList.create({
      data: {
        packingNo: documentNo('PK'),
        salesOrderId: dto.salesOrderId,
        packingType: dto.packingType,
        netWeightKg,
        grossWeightKg: dto.grossWeightKg ?? netWeightKg,
        status: 'PACKED',
        items: { create: rolls.map((roll) => ({ rollId: roll.id, weightKg: roll.netWeightKg })) },
      },
      include: { items: { include: { roll: true } } },
    });
    await notifyRoles(this.prisma, MANAGEMENT_ROLES, {
      title: 'Packing list created',
      message: `${packing.packingNo} • ${order.orderNo} • ${netWeightKg.toFixed(2)} KG packed`,
      type: 'SYSTEM',
      referenceType: 'PackingList',
      referenceId: packing.id,
    });
    return packing;
  }

  async dispatch(dto: CreateDispatchDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const packing = await tx.packingList.findUnique({
        where: { id: dto.packingListId },
        include: { dispatches: true, items: { include: { roll: { include: { productionOrder: { include: { salesOrderItem: true } } } } } } },
      });
      if (!packing || packing.salesOrderId !== dto.salesOrderId) throw new NotFoundException('Packing list not found');
      if (packing.status !== 'PACKED' || packing.dispatches.length > 0) throw new BadRequestException('Packing list is already dispatched or cancelled');

      const invoice = await tx.invoice.findUnique({ where: { id: dto.invoiceId } });
      if (!invoice || invoice.salesOrderId !== dto.salesOrderId || ['DRAFT', 'CANCELLED'].includes(invoice.status)) {
        throw new BadRequestException('Select an issued invoice for this sales order');
      }

      for (const item of packing.items) {
        const code = `FIN:${item.roll.productionOrder.salesOrderItem.fabricType}:${item.roll.color}`;
        await this.inventory.requireStock('FINISHED_FABRIC', code, dto.warehouseId, Number(item.weightKg), item.roll.rollNo, tx);
      }

      const dispatch = await tx.dispatch.create({
        data: {
          dispatchNo: documentNo('DSP'),
          salesOrderId: dto.salesOrderId,
          packingListId: dto.packingListId,
          invoiceId: dto.invoiceId,
          vehicle: dto.vehicle,
          driver: dto.driver,
          transporter: dto.transporter,
          lrNumber: dto.lrNumber,
          totalWeightKg: packing.netWeightKg,
          status: 'DISPATCHED',
        },
      });

      for (const item of packing.items) {
        const code = `FIN:${item.roll.productionOrder.salesOrderItem.fabricType}:${item.roll.color}`;
        await this.inventory.createTxn({
          category: 'FINISHED_FABRIC', txnType: 'DISPATCH_OUT', itemCode: code,
          itemName: `${item.roll.productionOrder.salesOrderItem.fabricType} ${item.roll.color}`,
          lotNo: item.roll.rollNo, warehouseId: dto.warehouseId, quantityOut: Number(item.weightKg),
          referenceType: 'DISPATCH', referenceId: dispatch.id, productionOrderId: item.roll.productionOrderId, createdById: user.id,
        }, tx);
      }

      await tx.packingList.update({ where: { id: packing.id }, data: { status: 'DISPATCHED' } });
      await this.lifecycle.syncOrder(dto.salesOrderId, tx);
      await notifyRoles(tx, MANAGEMENT_ROLES, {
        title: 'Order dispatched',
        message: `${dispatch.dispatchNo} • ${Number(dispatch.totalWeightKg).toFixed(2)} KG dispatched`,
        type: 'SYSTEM',
        referenceType: 'Dispatch',
        referenceId: dispatch.id,
      });
      return dispatch;
    });
  }

  async markInTransit(dispatchId: string) {
    const dispatch = await this.prisma.dispatch.findUnique({ where: { id: dispatchId } });
    if (!dispatch) throw new NotFoundException('Dispatch not found');
    if (dispatch.status !== 'DISPATCHED') throw new BadRequestException('Only dispatched loads can move to in transit');
    const updated = await this.prisma.dispatch.update({ where: { id: dispatchId }, data: { status: 'IN_TRANSIT' } });
    await notifyRoles(this.prisma, MANAGEMENT_ROLES, {
      title: 'Shipment in transit',
      message: `${dispatch.dispatchNo} is now in transit`,
      type: 'SYSTEM',
      referenceType: 'Dispatch',
      referenceId: dispatchId,
    });
    return updated;
  }

  async deliver(dispatchId: string, dto: CreateDeliveryDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findUnique({ where: { id: dispatchId }, include: { deliveries: true } });
      if (!dispatch) throw new NotFoundException('Dispatch not found');
      if (!['DISPATCHED', 'IN_TRANSIT'].includes(dispatch.status)) throw new BadRequestException('Dispatch is not awaiting delivery');
      if (dispatch.deliveries.length > 0) throw new BadRequestException('Delivery is already recorded for this dispatch');

      const accounted = dto.receivedKg + dto.shortageKg + dto.damagedKg + dto.returnedKg;
      if (Math.abs(accounted - Number(dispatch.totalWeightKg)) > 0.02) {
        throw new BadRequestException(`Delivery quantities must total ${Number(dispatch.totalWeightKg).toFixed(3)} KG`);
      }

      const delivery = await tx.delivery.create({
        data: {
          deliveryNo: documentNo('DLV'), dispatchId, receivedKg: dto.receivedKg,
          shortageKg: dto.shortageKg, damagedKg: dto.damagedKg, returnedKg: dto.returnedKg,
          podObjectKey: dto.podObjectKey, notes: dto.notes,
        },
      });
      await tx.dispatch.update({ where: { id: dispatchId }, data: { status: 'DELIVERED' } });
      await this.lifecycle.syncOrder(dispatch.salesOrderId, tx);
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'DELIVERY_RECORDED', module: 'delivery', entity: 'Delivery', entityId: delivery.id, newValue: { receivedKg: dto.receivedKg, dispatchNo: dispatch.dispatchNo } },
      });
      const hasIssue = dto.shortageKg > 0 || dto.damagedKg > 0;
      await notifyRoles(tx, MANAGEMENT_ROLES, {
        title: hasIssue ? 'Delivery recorded with shortage/damage' : 'Delivery recorded',
        message: `${dispatch.dispatchNo} • received ${dto.receivedKg} KG${hasIssue ? ` • shortage ${dto.shortageKg} / damaged ${dto.damagedKg} KG` : ''}`,
        type: hasIssue ? 'DELIVERY_DELAYED' : 'SYSTEM',
        priority: hasIssue ? 'HIGH' : 'NORMAL',
        referenceType: 'Delivery',
        referenceId: delivery.id,
      });
      return delivery;
    });
  }
}
