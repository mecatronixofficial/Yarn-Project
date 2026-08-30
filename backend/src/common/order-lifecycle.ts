import type { OrderStatus } from '@prisma/client';

export type OrderLifecycleSnapshot = {
  currentStatus: OrderStatus;
  orderedKg: number;
  readyKg: number;
  dispatchedKg: number;
  deliveredKg: number;
  hasProductionOrders: boolean;
  productionStarted: boolean;
  financiallySettled: boolean;
};

export function deriveOrderStatus(snapshot: OrderLifecycleSnapshot): OrderStatus {
  if (snapshot.currentStatus === 'CANCELLED') return 'CANCELLED';
  if (snapshot.deliveredKg >= snapshot.orderedKg - 0.01 && snapshot.financiallySettled) return 'CLOSED';
  if (snapshot.deliveredKg >= snapshot.orderedKg - 0.01) return 'DELIVERED';
  if (snapshot.deliveredKg > 0) return 'PARTIALLY_DELIVERED';
  if (snapshot.dispatchedKg >= snapshot.orderedKg - 0.01) return 'DISPATCHED';
  if (snapshot.dispatchedKg > 0) return 'PARTIALLY_DISPATCHED';
  if (snapshot.readyKg >= snapshot.orderedKg - 0.01) return 'READY';
  if (snapshot.readyKg > 0) return 'PARTIALLY_COMPLETED';
  if (snapshot.productionStarted) return 'IN_PRODUCTION';
  if (snapshot.hasProductionOrders) return 'PLANNING';
  return snapshot.currentStatus === 'DRAFT' ? 'DRAFT' : 'CONFIRMED';
}
