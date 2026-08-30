import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PurchaseOrderStatus } from '@prisma/client';
import { AuthUser } from '../common/auth-user';
import { documentNo } from '../common/numbering';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from './dto/procurement.dto';

const purchaseOrderInclude = {
  supplier: true,
  items: { include: { receiptItems: true } },
  receipts: { include: { warehouse: true, items: true }, orderBy: { receivedAt: 'desc' as const } },
};

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  list() {
    return this.prisma.purchaseOrder.findMany({
      include: purchaseOrderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async context() {
    const [suppliers, warehouses] = await Promise.all([
      this.prisma.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      this.prisma.warehouse.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    ]);
    return { suppliers, warehouses };
  }

  async create(dto: CreatePurchaseOrderDto, user: AuthUser) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, active: true } });
    if (!supplier) throw new BadRequestException('Select an active supplier');

    const codes = dto.items.map((item) => item.itemCode.trim().toUpperCase());
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException('Each item code can appear only once in a purchase order');
    }

    return this.prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          poNo: documentNo('PUR'),
          supplierId: supplier.id,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
          status: PurchaseOrderStatus.ORDERED,
          items: {
            create: dto.items.map((item) => ({
              itemCode: item.itemCode.trim().toUpperCase(),
              itemName: item.itemName.trim(),
              quantity: item.quantity,
              unit: item.unit.trim().toUpperCase(),
              rate: item.rate,
            })),
          },
        },
        include: purchaseOrderInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'PURCHASE_ORDER_CREATED',
          module: 'procurement',
          entity: 'PurchaseOrder',
          entityId: purchaseOrder.id,
          newValue: { poNo: purchaseOrder.poNo, supplierId: supplier.id, itemCount: dto.items.length },
        },
      });
      return purchaseOrder;
    });
  }

  async receive(id: string, dto: ReceivePurchaseOrderDto, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: { include: { receiptItems: true } } },
      });
      if (!purchaseOrder) throw new NotFoundException('Purchase order not found');
      if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED || purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException(`A ${purchaseOrder.status.toLowerCase()} purchase order cannot receive material`);
      }

      const warehouse = await tx.warehouse.findFirst({ where: { id: dto.warehouseId, active: true } });
      if (!warehouse) throw new BadRequestException('Select an active warehouse');

      const receiptItemIds = dto.items.map((item) => item.purchaseOrderItemId);
      if (new Set(receiptItemIds).size !== receiptItemIds.length) {
        throw new BadRequestException('A purchase-order line can appear only once in a receipt');
      }

      const itemById = new Map(purchaseOrder.items.map((item) => [item.id, item]));
      for (const input of dto.items) {
        const item = itemById.get(input.purchaseOrderItemId);
        if (!item) throw new BadRequestException('Receipt contains an item that is not part of this purchase order');
        const alreadyReceived = item.receiptItems.reduce((sum, receiptItem) => sum + Number(receiptItem.quantity), 0);
        const remaining = Number(item.quantity) - alreadyReceived;
        if (input.quantity > remaining + 1e-9) {
          throw new BadRequestException(`${item.itemName} has only ${remaining.toFixed(3)} ${item.unit} remaining`);
        }
      }

      const receipt = await tx.purchaseReceipt.create({
        data: {
          receiptNo: documentNo('GRN'),
          purchaseOrderId: purchaseOrder.id,
          warehouseId: warehouse.id,
          category: dto.category,
          lotNo: dto.lotNo?.trim() || undefined,
          receivedById: user.id,
          items: { create: dto.items.map((item) => ({ purchaseOrderItemId: item.purchaseOrderItemId, quantity: item.quantity })) },
        },
        include: { items: true },
      });

      for (const input of dto.items) {
        const item = itemById.get(input.purchaseOrderItemId)!;
        await this.inventory.createTxn({
          category: dto.category,
          txnType: 'PURCHASE_IN',
          itemCode: item.itemCode,
          itemName: item.itemName,
          lotNo: dto.lotNo?.trim() || undefined,
          warehouseId: warehouse.id,
          quantityIn: input.quantity,
          referenceType: 'PURCHASE_RECEIPT',
          referenceId: receipt.id,
          createdById: user.id,
          notes: `${purchaseOrder.poNo} / ${receipt.receiptNo}`,
        }, tx);
      }

      const receivedNow = new Map(dto.items.map((item) => [item.purchaseOrderItemId, item.quantity]));
      const fullyReceived = purchaseOrder.items.every((item) => {
        const previous = item.receiptItems.reduce((sum, receiptItem) => sum + Number(receiptItem.quantity), 0);
        return previous + (receivedNow.get(item.id) || 0) >= Number(item.quantity) - 1e-9;
      });
      const status = fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
      await tx.purchaseOrder.update({ where: { id }, data: { status } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'PURCHASE_RECEIVED',
          module: 'procurement',
          entity: 'PurchaseReceipt',
          entityId: receipt.id,
          newValue: { receiptNo: receipt.receiptNo, purchaseOrderId: id, warehouseId: warehouse.id, status },
        },
      });
      return { success: true, message: 'Material received and stock ledger updated', receiptNo: receipt.receiptNo, status };
    });
  }

  async cancel(id: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({ where: { id }, include: { receipts: { select: { id: true } } } });
      if (!purchaseOrder) throw new NotFoundException('Purchase order not found');
      if (purchaseOrder.status !== PurchaseOrderStatus.ORDERED || purchaseOrder.receipts.length > 0) {
        throw new BadRequestException('Only an unreceived ordered purchase order can be cancelled');
      }
      const updated = await tx.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.CANCELLED } });
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'PURCHASE_ORDER_CANCELLED', module: 'procurement', entity: 'PurchaseOrder', entityId: id },
      });
      return updated;
    });
  }
}
