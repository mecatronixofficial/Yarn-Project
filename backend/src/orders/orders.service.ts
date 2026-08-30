import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { documentNo } from '../common/numbering';
import { CreateOrderDto, CreateProductionOrderDto, UpdateOrderDto } from './dto/create-order.dto';
import { OrderLifecycleService } from './order-lifecycle.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  list() {
    return this.prisma.salesOrder.findMany({
      include: { customer: true, items: true, productionOrders: true, invoices: { include: { payments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        productionOrders: {
          include: {
            yarnEntries: true,
            knittingJobs: { include: { entries: true, greyRolls: true } },
            dyeingBatches: { include: { entries: true, rolls: true } },
            finishingJobs: true,
            inspections: true,
            finishedRolls: true,
          },
        },
        packingLists: { include: { items: true } },
        dispatches: { include: { deliveries: true } },
        invoices: { include: { payments: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  create(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const total = dto.items.reduce((sum, item) => sum + item.quantityKg * (item.rate || 0), 0);
      const order = await tx.salesOrder.create({
        data: {
          orderNo: documentNo('SO'),
          customerId: dto.customerId,
          poNumber: dto.poNumber,
          expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : undefined,
          notes: dto.notes,
          status: 'DRAFT',
          items: { create: dto.items.map((item) => ({ ...item, amount: item.quantityKg * (item.rate || 0) })) },
        },
        include: { customer: true, items: true },
      });
      await tx.auditLog.create({
        data: { action: 'ORDER_CREATED', module: 'orders', entity: 'SalesOrder', entityId: order.id, newValue: { orderNo: order.orderNo, total } },
      });
      return order;
    });
  }

  async update(id: string, dto: UpdateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.salesOrder.findUnique({ where: { id }, include: { items: true } });
      if (!current) throw new NotFoundException('Order not found');
      if (current.status !== 'DRAFT') throw new BadRequestException('Only draft orders can be edited');

      const updated = await tx.salesOrder.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          poNumber: dto.poNumber,
          expectedDelivery: dto.expectedDelivery === null ? null : dto.expectedDelivery ? new Date(dto.expectedDelivery) : undefined,
          notes: dto.notes,
          items: dto.items ? {
            deleteMany: {},
            create: dto.items.map((item) => ({ ...item, amount: item.quantityKg * (item.rate || 0) })),
          } : undefined,
        },
        include: { customer: true, items: true },
      });
      await tx.auditLog.create({
        data: {
          action: 'ORDER_UPDATED',
          module: 'orders',
          entity: 'SalesOrder',
          entityId: id,
          previousValue: JSON.parse(JSON.stringify({ customerId: current.customerId, poNumber: current.poNumber, expectedDelivery: current.expectedDelivery, notes: current.notes, items: current.items })),
          newValue: JSON.parse(JSON.stringify(dto)),
        },
      });
      return updated;
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { productionOrders: true, packingLists: true, dispatches: true, invoices: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (!['DRAFT', 'CANCELLED'].includes(order.status)) {
        throw new BadRequestException('Only draft or cancelled orders can be deleted');
      }
      if (order.productionOrders.length || order.packingLists.length || order.dispatches.length || order.invoices.length) {
        throw new BadRequestException('This order has linked production, packing, dispatch, or invoice records and cannot be deleted');
      }
      await tx.salesOrder.delete({ where: { id } });
      await tx.auditLog.create({
        data: { action: 'ORDER_DELETED', module: 'orders', entity: 'SalesOrder', entityId: id, previousValue: { orderNo: order.orderNo, status: order.status } },
      });
      return { success: true, id };
    });
  }

  async confirm(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'DRAFT') throw new BadRequestException('Only draft orders can be confirmed');
      const updated = await tx.salesOrder.update({ where: { id }, data: { status: 'CONFIRMED' } });
      await tx.auditLog.create({ data: { action: 'ORDER_CONFIRMED', module: 'orders', entity: 'SalesOrder', entityId: id } });
      return updated;
    });
  }

  async cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({ where: { id }, include: { productionOrders: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (!['DRAFT', 'CONFIRMED'].includes(order.status) || order.productionOrders.length > 0) {
        throw new BadRequestException('Only unplanned draft or confirmed orders can be cancelled');
      }
      const updated = await tx.salesOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.auditLog.create({ data: { action: 'ORDER_CANCELLED', module: 'orders', entity: 'SalesOrder', entityId: id } });
      return updated;
    });
  }

  close(id: string) {
    return this.lifecycle.closeOrder(id);
  }

  async createProductionOrder(orderId: string, dto: CreateProductionOrderDto) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!['CONFIRMED', 'PLANNING', 'IN_PRODUCTION', 'PARTIALLY_COMPLETED'].includes(order.status)) {
      throw new BadRequestException('Confirm the order before production planning');
    }
    const item = await this.prisma.salesOrderItem.findFirst({ where: { id: dto.salesOrderItemId, salesOrderId: orderId } });
    if (!item) throw new BadRequestException('Order item does not belong to this order');

    return this.prisma.$transaction(async (tx) => {
      const productionOrder = await tx.productionOrder.create({
        data: {
          productionNo: documentNo('PO'),
          salesOrderId: orderId,
          salesOrderItemId: item.id,
          plannedQtyKg: dto.plannedQtyKg,
          requiredYarnKg: dto.requiredYarnKg,
          expectedKnittingLossPct: dto.expectedKnittingLossPct ?? 2,
          expectedDyeingLossPct: dto.expectedDyeingLossPct ?? 3,
          priority: dto.priority ?? 'NORMAL',
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: 'PLANNED',
        },
      });
      await tx.salesOrder.update({ where: { id: orderId }, data: { status: 'PLANNING' } });
      return productionOrder;
    });
  }

  async trace(id: string) {
    const order = await this.get(id);
    const stages: Array<Record<string, unknown>> = [];
    for (const production of order.productionOrders) {
      const yarn = production.yarnEntries.reduce(
        (sum, entry) => ({ input: sum.input + Number(entry.inputKg), output: sum.output + Number(entry.outputKg), waste: sum.waste + Number(entry.wasteKg) }),
        { input: 0, output: 0, waste: 0 },
      );
      const knitting = production.knittingJobs.flatMap((job) => job.entries).reduce(
        (sum, entry) => ({ output: sum.output + Number(entry.outputKg), waste: sum.waste + Number(entry.wasteKg) }),
        { output: 0, waste: 0 },
      );
      const knittingInput = production.knittingJobs.reduce((sum, job) => sum + Number(job.yarnIssuedKg), 0);
      const dyeing = production.dyeingBatches.flatMap((batch) => batch.entries).reduce(
        (sum, entry) => ({ input: sum.input + Number(entry.inputKg), output: sum.output + Number(entry.outputKg), waste: sum.waste + Number(entry.lossKg) + Number(entry.rejectedKg) }),
        { input: 0, output: 0, waste: 0 },
      );
      const finishing = production.finishingJobs.reduce(
        (sum, entry) => ({ input: sum.input + Number(entry.inputKg), output: sum.output + Number(entry.outputKg), waste: sum.waste + Number(entry.lossKg) }),
        { input: 0, output: 0, waste: 0 },
      );
      const qc = production.inspections.reduce(
        (sum, entry) => ({ input: sum.input + Number(entry.inputKg), output: sum.output + Number(entry.approvedKg), waste: sum.waste + Number(entry.rejectedKg), rework: sum.rework + Number(entry.reworkKg) }),
        { input: 0, output: 0, waste: 0, rework: 0 },
      );
      stages.push({
        productionNo: production.productionNo,
        status: production.status,
        planned: Number(production.plannedQtyKg),
        rows: [
          { stage: 'Yarn', ...yarn, balance: yarn.input - yarn.output - yarn.waste },
          { stage: 'Knitting', input: knittingInput, ...knitting, balance: knittingInput - knitting.output - knitting.waste },
          { stage: 'Dyeing', ...dyeing, balance: dyeing.input - dyeing.output - dyeing.waste },
          { stage: 'Finishing', ...finishing, balance: finishing.input - finishing.output - finishing.waste },
          { stage: 'QC', ...qc, balance: qc.input - qc.output - qc.waste - qc.rework },
        ],
      });
    }

    const delivered = order.dispatches.flatMap((dispatch) => dispatch.deliveries).reduce((sum, delivery) => sum + Number(delivery.receivedKg), 0);
    const ordered = order.items.reduce((sum, item) => sum + Number(item.quantityKg), 0);
    const qcApproved = order.productionOrders.flatMap((production) => production.inspections).reduce((sum, qc) => sum + Number(qc.approvedKg), 0);
    const readyProduced = order.productionOrders.flatMap((production) => production.finishedRolls).reduce((sum, roll) => sum + Number(roll.netWeightKg), 0);
    const dispatched = order.dispatches.filter((dispatch) => dispatch.status !== 'RETURNED').reduce((sum, dispatch) => sum + Number(dispatch.totalWeightKg), 0);
    const invoiced = order.invoices.filter((invoice) => invoice.status !== 'CANCELLED').reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
    const paid = order.invoices.flatMap((invoice) => invoice.payments).reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      success: true,
      data: {
        orderNo: order.orderNo,
        customer: order.customer.name,
        orderedKg: ordered,
        qcApprovedKg: qcApproved,
        deliveredKg: delivered,
        orderPendingKg: Math.max(0, ordered - delivered),
        readyPendingDeliveryKg: Math.max(0, readyProduced - dispatched),
        productionShortfallKg: Math.max(0, ordered - qcApproved),
        invoicedAmount: invoiced,
        paidAmount: paid,
        paymentPendingAmount: Math.max(0, invoiced - paid),
        stages,
      },
    };
  }
}
