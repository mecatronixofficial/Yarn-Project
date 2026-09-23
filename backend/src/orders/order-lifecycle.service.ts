import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, JobStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { deriveOrderStatus } from '../common/order-lifecycle';
import { MANAGEMENT_ROLES, notifyRoles } from '../notifications/notify.util';

type DbClient = PrismaService | Prisma.TransactionClient;

const quantity = (value: Prisma.Decimal | number | null | undefined) => Number(value ?? 0);

@Injectable()
export class OrderLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async markProductionStarted(productionOrderId: string, db: DbClient = this.prisma) {
    const productionOrder = await db.productionOrder.findUnique({
      where: { id: productionOrderId },
      select: { id: true, salesOrderId: true, status: true },
    });
    if (!productionOrder) throw new NotFoundException('Production order not found');

    if (!['COMPLETED', 'CLOSED', 'REJECTED'].includes(productionOrder.status)) {
      await db.productionOrder.update({ where: { id: productionOrderId }, data: { status: 'RUNNING' } });
    }

    const order = await db.salesOrder.findUnique({
      where: { id: productionOrder.salesOrderId },
      select: { status: true },
    });
    if (order && !['CANCELLED', 'CLOSED', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'PARTIALLY_DELIVERED', 'DELIVERED'].includes(order.status)) {
      await db.salesOrder.update({ where: { id: productionOrder.salesOrderId }, data: { status: 'IN_PRODUCTION' } });
    }
  }

  async syncProductionOutput(productionOrderId: string, db: DbClient = this.prisma) {
    const productionOrder = await db.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: { finishedRolls: true, finishingJobs: true, inspections: true },
    });
    if (!productionOrder) throw new NotFoundException('Production order not found');

    const finishingOutputKg = productionOrder.finishingJobs.reduce((sum, job) => sum + quantity(job.outputKg), 0);
    const terminalQcKg = productionOrder.inspections.reduce(
      (sum, inspection) => sum + quantity(inspection.approvedKg) + quantity(inspection.rejectedKg),
      0,
    );
    const nextStatus: JobStatus = finishingOutputKg > 0 && terminalQcKg >= finishingOutputKg - 0.01 ? 'COMPLETED' : 'RUNNING';
    await db.productionOrder.update({ where: { id: productionOrderId }, data: { status: nextStatus } });
    if (nextStatus === 'COMPLETED' && productionOrder.status !== 'COMPLETED') {
      await notifyRoles(db, MANAGEMENT_ROLES, {
        title: 'Production order completed',
        message: `${productionOrder.productionNo} finished production`,
        type: 'JOB_COMPLETED',
        referenceType: 'ProductionOrder',
        referenceId: productionOrderId,
      });
    }
    return this.syncOrder(productionOrder.salesOrderId, db);
  }

  async syncInvoice(invoiceId: string, db: DbClient = this.prisma) {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'CANCELLED') return invoice;

    const paid = invoice.payments.reduce((sum, payment) => sum + quantity(payment.amount), 0);
    const total = quantity(invoice.totalAmount);
    let status: InvoiceStatus = 'ISSUED';
    if (paid >= total - 0.01) status = 'PAID';
    else if (invoice.dueDate && invoice.dueDate < new Date()) status = 'OVERDUE';
    else if (paid > 0) status = 'PARTIALLY_PAID';

    const updated = await db.invoice.update({ where: { id: invoiceId }, data: { status } });
    if (status !== invoice.status) {
      if (status === 'PAID') {
        await notifyRoles(db, MANAGEMENT_ROLES, {
          title: 'Invoice paid in full',
          message: `${invoice.invoiceNo} is fully settled`,
          type: 'SYSTEM',
          referenceType: 'Invoice',
          referenceId: invoiceId,
        });
      } else if (status === 'OVERDUE') {
        await notifyRoles(db, MANAGEMENT_ROLES, {
          title: 'Invoice overdue',
          message: `${invoice.invoiceNo} has crossed its due date unpaid`,
          type: 'PAYMENT_DUE',
          priority: 'HIGH',
          referenceType: 'Invoice',
          referenceId: invoiceId,
        });
      }
    }
    if (invoice.salesOrderId) await this.syncOrder(invoice.salesOrderId, db);
    return updated;
  }

  async syncOrder(salesOrderId: string, db: DbClient = this.prisma) {
    const order = await db.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        items: true,
        productionOrders: { include: { finishedRolls: true } },
        dispatches: { include: { deliveries: true } },
        invoices: { include: { payments: true } },
      },
    });
    if (!order) throw new NotFoundException('Sales order not found');
    if (order.status === 'CANCELLED') return order;

    const orderedKg = order.items.reduce((sum, item) => sum + quantity(item.quantityKg), 0);
    const readyKg = order.productionOrders.flatMap((po) => po.finishedRolls).reduce((sum, roll) => sum + quantity(roll.netWeightKg), 0);
    const dispatchedKg = order.dispatches
      .filter((dispatch) => dispatch.status !== 'RETURNED')
      .reduce((sum, dispatch) => sum + quantity(dispatch.totalWeightKg), 0);
    const deliveredKg = order.dispatches.flatMap((dispatch) => dispatch.deliveries).reduce((sum, delivery) => sum + quantity(delivery.receivedKg), 0);
    const activeInvoices = order.invoices.filter((invoice) => invoice.status !== 'CANCELLED');
    const orderValue = order.items.reduce((sum, item) => sum + quantity(item.amount), 0);
    const invoicedValue = activeInvoices.reduce((sum, invoice) => sum + quantity(invoice.taxableValue), 0);
    const invoicedPaid = activeInvoices.length > 0 && invoicedValue >= orderValue - 0.01 && activeInvoices.every((invoice) => {
      const paid = invoice.payments.reduce((sum, payment) => sum + quantity(payment.amount), 0);
      return paid >= quantity(invoice.totalAmount) - 0.01;
    });

    const status: OrderStatus = deriveOrderStatus({
      currentStatus: order.status,
      orderedKg,
      readyKg,
      dispatchedKg,
      deliveredKg,
      hasProductionOrders: order.productionOrders.length > 0,
      productionStarted: order.productionOrders.some((po) => !['PLANNED', 'WAITING'].includes(po.status)),
      financiallySettled: invoicedPaid,
    });

    if (status !== order.status) {
      if (status === 'READY') {
        await notifyRoles(db, MANAGEMENT_ROLES, {
          title: 'Order ready for dispatch',
          message: `${order.orderNo} is fully produced and ready to pack/dispatch`,
          type: 'ORDER_READY',
          priority: 'HIGH',
          referenceType: 'SalesOrder',
          referenceId: salesOrderId,
        });
      } else if (status === 'CLOSED') {
        await notifyRoles(db, MANAGEMENT_ROLES, {
          title: 'Order closed',
          message: `${order.orderNo} is fully delivered and paid`,
          type: 'ORDER_COMPLETED',
          referenceType: 'SalesOrder',
          referenceId: salesOrderId,
        });
      }
    }

    return db.salesOrder.update({ where: { id: salesOrderId }, data: { status } });
  }

  async closeOrder(salesOrderId: string, db: DbClient = this.prisma) {
    const synced = await this.syncOrder(salesOrderId, db);
    if (synced.status !== 'CLOSED') {
      throw new BadRequestException('Order can close only after full delivery and full payment');
    }
    return synced;
  }
}
