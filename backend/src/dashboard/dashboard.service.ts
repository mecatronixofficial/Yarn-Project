import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_ORDER_STATUSES = [
  'CONFIRMED',
  'PLANNING',
  'IN_PRODUCTION',
  'PARTIALLY_COMPLETED',
  'READY',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'PARTIALLY_DELIVERED',
] as const;

const FINISHED_PRODUCTION_STATUSES = [
  'COMPLETED',
  'CLOSED',
  'REJECTED',
] as const;

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private inFlightRequests = new Map<string, ReturnType<DashboardService['load']>>();

  get(userId: string) {
    // A dashboard load performs several independent reads. Reuse the same work
    // when the browser sends overlapping requests (for example in development
    // Strict Mode) instead of consuming another set of pool connections.
    // Keyed per user so one user's in-flight load is never handed to another.
    let inFlight = this.inFlightRequests.get(userId);
    if (!inFlight) {
      inFlight = this.load(userId).finally(() => {
        this.inFlightRequests.delete(userId);
      });
      this.inFlightRequests.set(userId, inFlight);
    }
    return inFlight;
  }

  private async load(userId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const trendStart = new Date(todayStart);
    trendStart.setDate(trendStart.getDate() - 6);

    const dueSoonEnd = new Date(todayStart);
    dueSoonEnd.setDate(dueSoonEnd.getDate() + 7);

    // Keep each batch below Prisma's connection limit. Starting every query in
    // one Promise.all used to enqueue 19 reads against a 13-connection pool,
    // causing unrelated requests to fail with P2024 while they waited.
    const [
      openOrders,
      activeProductionCount,
      productionOrders,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.salesOrder.count({
        where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
      }),
      this.prisma.productionOrder.count({
        where: { status: { notIn: [...FINISHED_PRODUCTION_STATUSES] } },
      }),
      this.prisma.productionOrder.findMany({
        where: { status: { notIn: [...FINISHED_PRODUCTION_STATUSES] } },
        take: 8,
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
        include: {
          salesOrder: { include: { customer: true } },
          salesOrderItem: true,
          yarnEntries: { select: { outputKg: true } },
          knittingJobs: {
            select: { entries: { select: { outputKg: true } } },
          },
          dyeingBatches: {
            select: { entries: { select: { outputKg: true } } },
          },
          inspections: { select: { approvedKg: true } },
        },
      }),
      this.prisma.notification.count({ where: { isRead: false, userId } }),
    ]);

    const [
      recentNotifications,
      machines,
      workers,
      stock,
    ] = await Promise.all([
      this.prisma.notification.findMany({
        where: { isRead: false, userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          priority: true,
          createdAt: true,
        },
      }),
      this.prisma.machine.groupBy({ by: ['status'], _count: true }),
      this.prisma.user.count({
        where: { role: 'WORKER', status: 'ACTIVE' },
      }),
      this.prisma.stockTransaction.groupBy({
        by: ['category'],
        _sum: { quantityIn: true, quantityOut: true },
      }),
    ]);

    const [
      readyDispatch,
      inTransitDispatch,
      wasteToday,
      yarnTrend,
    ] = await Promise.all([
      this.prisma.dispatch.aggregate({
        where: { status: 'READY' },
        _sum: { totalWeightKg: true },
        _count: true,
      }),
      this.prisma.dispatch.aggregate({
        where: { status: { in: ['DISPATCHED', 'IN_TRANSIT'] } },
        _sum: { totalWeightKg: true },
        _count: true,
      }),
      this.prisma.wasteEntry.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { quantityKg: true },
      }),
      this.prisma.yarnProductionEntry.findMany({
        where: { createdAt: { gte: trendStart } },
        select: { createdAt: true, outputKg: true },
      }),
    ]);

    const [
      knittingTrend,
      dyeingTrend,
      orderPipeline,
      qualitySummary,
    ] = await Promise.all([
      this.prisma.knittingProductionEntry.findMany({
        where: { createdAt: { gte: trendStart } },
        select: { createdAt: true, outputKg: true },
      }),
      this.prisma.dyeingEntry.findMany({
        where: { createdAt: { gte: trendStart } },
        select: { createdAt: true, outputKg: true },
      }),
      this.prisma.salesOrder.groupBy({ by: ['status'], _count: true }),
      this.prisma.qualityInspection.groupBy({
        by: ['status'],
        _count: true,
        _sum: { approvedKg: true, rejectedKg: true, reworkKg: true },
      }),
    ]);

    const [overdueOrders, dueSoonOrders, openMaintenance] = await Promise.all([
      this.prisma.productionOrder.count({
        where: {
          dueDate: { lt: todayStart },
          status: { notIn: [...FINISHED_PRODUCTION_STATUSES] },
        },
      }),
      this.prisma.productionOrder.count({
        where: {
          dueDate: { gte: todayStart, lte: dueSoonEnd },
          status: { notIn: [...FINISHED_PRODUCTION_STATUSES] },
        },
      }),
      this.prisma.maintenanceRecord.count({ where: { endedAt: null } }),
    ]);

    const stockBalance = Object.fromEntries(
      stock.map((item) => [
        item.category,
        Number(item._sum.quantityIn || 0) - Number(item._sum.quantityOut || 0),
      ]),
    );

    const productionTrend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(trendStart);
      date.setDate(date.getDate() + index);
      const key = this.dayKey(date);
      return { date: key, yarnKg: 0, knittingKg: 0, dyeingKg: 0 };
    });
    const trendByDay = new Map(productionTrend.map((day) => [day.date, day]));

    for (const entry of yarnTrend) {
      const day = trendByDay.get(this.dayKey(entry.createdAt));
      if (day) day.yarnKg += Number(entry.outputKg);
    }
    for (const entry of knittingTrend) {
      const day = trendByDay.get(this.dayKey(entry.createdAt));
      if (day) day.knittingKg += Number(entry.outputKg);
    }
    for (const entry of dyeingTrend) {
      const day = trendByDay.get(this.dayKey(entry.createdAt));
      if (day) day.dyeingKg += Number(entry.outputKg);
    }

    const pipelineCounts = Object.fromEntries(
      orderPipeline.map((item) => [item.status, item._count]),
    );
    const pipeline = [
      {
        key: 'confirmed',
        label: 'Confirmed',
        count: Number(pipelineCounts.CONFIRMED || 0),
      },
      {
        key: 'production',
        label: 'In production',
        count:
          Number(pipelineCounts.PLANNING || 0) +
          Number(pipelineCounts.IN_PRODUCTION || 0) +
          Number(pipelineCounts.PARTIALLY_COMPLETED || 0),
      },
      {
        key: 'ready',
        label: 'Ready to ship',
        count: Number(pipelineCounts.READY || 0),
      },
      {
        key: 'dispatch',
        label: 'In dispatch',
        count:
          Number(pipelineCounts.PARTIALLY_DISPATCHED || 0) +
          Number(pipelineCounts.DISPATCHED || 0) +
          Number(pipelineCounts.PARTIALLY_DELIVERED || 0),
      },
    ];

    const quality = qualitySummary.reduce(
      (summary, item) => {
        summary.counts[item.status] = item._count;
        summary.approvedKg += Number(item._sum.approvedKg || 0);
        summary.rejectedKg += Number(item._sum.rejectedKg || 0);
        summary.reworkKg += Number(item._sum.reworkKg || 0);
        return summary;
      },
      {
        counts: {} as Record<string, number>,
        approvedKg: 0,
        rejectedKg: 0,
        reworkKg: 0,
      },
    );

    return {
      success: true,
      data: {
        generatedAt: now.toISOString(),
        kpis: {
          openOrders,
          activeProduction: activeProductionCount,
          workersActive: workers,
          unreadNotifications,
          readyDispatchKg: Number(readyDispatch._sum.totalWeightKg || 0),
          readyDispatches: readyDispatch._count,
          inTransitKg: Number(inTransitDispatch._sum.totalWeightKg || 0),
          inTransitDispatches: inTransitDispatch._count,
          wasteTodayKg: Number(wasteToday._sum.quantityKg || 0),
          overdueOrders,
          dueSoonOrders,
          openMaintenance,
          ...stockBalance,
        },
        machines: Object.fromEntries(
          machines.map((machine) => [machine.status, machine._count]),
        ),
        productionTrend,
        pipeline,
        quality,
        alerts: recentNotifications,
        activeProduction: productionOrders.map((production) => {
          const yarnOutputKg = this.sum(
            production.yarnEntries.map((entry) => entry.outputKg),
          );
          const knittingOutputKg = this.sum(
            production.knittingJobs.flatMap((job) =>
              job.entries.map((entry) => entry.outputKg),
            ),
          );
          const dyeingOutputKg = this.sum(
            production.dyeingBatches.flatMap((batch) =>
              batch.entries.map((entry) => entry.outputKg),
            ),
          );
          const qcApprovedKg = this.sum(
            production.inspections.map((inspection) => inspection.approvedKg),
          );
          const latestOutputKg =
            qcApprovedKg || dyeingOutputKg || knittingOutputKg || yarnOutputKg;
          const plannedQtyKg = Number(production.plannedQtyKg);

          return {
            id: production.id,
            salesOrderId: production.salesOrderId,
            productionNo: production.productionNo,
            orderNo: production.salesOrder.orderNo,
            customer: production.salesOrder.customer.name,
            fabric: production.salesOrderItem.fabricType,
            color: production.salesOrderItem.color,
            qtyKg: plannedQtyKg,
            outputKg: latestOutputKg,
            progressPct: plannedQtyKg
              ? Math.min(100, Math.round((latestOutputKg / plannedQtyKg) * 100))
              : 0,
            dueDate: production.dueDate?.toISOString() || null,
            priority: production.priority,
            status: production.status,
          };
        }),
      },
    };
  }

  private dayKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private sum(values: Array<{ toString(): string }>): number {
    return values.reduce<number>((total, value) => total + Number(value), 0);
  }
}
