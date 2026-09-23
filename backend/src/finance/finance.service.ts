import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';
import { documentNo } from '../common/numbering';
import { CreateInvoiceDto, ExpenseDto, PaymentDto } from './dto/finance.dto';
import { MANAGEMENT_ROLES, notifyRoles } from '../notifications/notify.util';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  expenses() {
    return this.prisma.expense.findMany({ orderBy: { expenseDate: 'desc' }, take: 500 });
  }

  addExpense(dto: ExpenseDto, userId: string) {
    return this.prisma.expense.create({ data: { expenseNo: documentNo('EXP'), ...dto, createdById: userId } });
  }

  payments() {
    return this.prisma.customerPayment.findMany({ include: { customer: true, invoice: true }, orderBy: { paidAt: 'desc' }, take: 500 });
  }

  async invoices() {
    await this.prisma.invoice.updateMany({
      where: { dueDate: { lt: new Date() }, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
      data: { status: 'OVERDUE' },
    });
    return this.prisma.invoice.findMany({
      include: { customer: true, salesOrder: true, payments: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async context() {
    const [customers, orders, invoices] = await Promise.all([
      this.prisma.customer.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      this.prisma.salesOrder.findMany({ where: { status: { notIn: ['DRAFT', 'CANCELLED', 'CLOSED'] } }, include: { customer: true, items: true }, orderBy: { createdAt: 'desc' } }),
      this.invoices(),
    ]);
    return { customers, orders, invoices };
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id: dto.salesOrderId } });
    if (!order) throw new NotFoundException('Sales order not found');
    if (order.customerId !== dto.customerId) throw new BadRequestException('Customer does not match the sales order');
    if (['DRAFT', 'CANCELLED'].includes(order.status)) throw new BadRequestException('Confirm the order before issuing an invoice');

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNo: documentNo('INV'),
        customerId: dto.customerId,
        salesOrderId: dto.salesOrderId,
        taxableValue: dto.taxableValue,
        gstAmount: dto.gstAmount,
        totalAmount: dto.taxableValue + dto.gstAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: 'ISSUED',
      },
      include: { customer: true, salesOrder: true, payments: true },
    });
    await notifyRoles(this.prisma, MANAGEMENT_ROLES, {
      title: 'Invoice issued',
      message: `${invoice.invoiceNo} • ${invoice.customer.name} • ${Number(invoice.totalAmount).toFixed(2)}`,
      type: 'SYSTEM',
      referenceType: 'Invoice',
      referenceId: invoice.id,
    });
    return invoice;
  }

  async pay(dto: PaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: dto.invoiceId }, include: { payments: true } });
        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.customerId !== dto.customerId) throw new BadRequestException('Customer does not match the invoice');
        if (['DRAFT', 'CANCELLED', 'PAID'].includes(invoice.status)) throw new BadRequestException('Invoice is not open for payment');
        const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const outstanding = Number(invoice.totalAmount) - paid;
        if (dto.amount > outstanding + 0.01) throw new BadRequestException(`Payment exceeds outstanding amount ${outstanding.toFixed(2)}`);
      }

      const payment = await tx.customerPayment.create({ data: dto, include: { customer: true } });
      let invoice = null;
      if (dto.invoiceId) invoice = await this.lifecycle.syncInvoice(dto.invoiceId, tx);
      await notifyRoles(tx, MANAGEMENT_ROLES, {
        title: 'Payment received',
        message: `${payment.customer.name} • ${Number(payment.amount).toFixed(2)} via ${payment.mode}`,
        type: 'SYSTEM',
        referenceType: 'CustomerPayment',
        referenceId: payment.id,
      });
      return { payment, invoice };
    });
  }

  async summary() {
    const [sales, paid, expense] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
      this.prisma.customerPayment.aggregate({ _sum: { amount: true } }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);
    const invoiced = Number(sales._sum.totalAmount || 0);
    const received = Number(paid._sum.amount || 0);
    return { invoiced, received, expenses: Number(expense._sum.amount || 0), outstanding: Math.max(0, invoiced - received) };
  }
}
