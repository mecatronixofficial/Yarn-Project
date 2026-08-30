import { deriveOrderStatus } from './order-lifecycle';

const base = {
  currentStatus: 'CONFIRMED' as const,
  orderedKg: 1000,
  readyKg: 0,
  dispatchedKg: 0,
  deliveredKg: 0,
  hasProductionOrders: false,
  productionStarted: false,
  financiallySettled: false,
};

describe('sales-order lifecycle', () => {
  it('keeps an unplanned order confirmed', () => expect(deriveOrderStatus(base)).toBe('CONFIRMED'));
  it('moves a planned order to planning', () => expect(deriveOrderStatus({ ...base, hasProductionOrders: true })).toBe('PLANNING'));
  it('moves active production to in production', () => expect(deriveOrderStatus({ ...base, hasProductionOrders: true, productionStarted: true })).toBe('IN_PRODUCTION'));
  it('tracks partial and complete finished output', () => {
    expect(deriveOrderStatus({ ...base, readyKg: 500 })).toBe('PARTIALLY_COMPLETED');
    expect(deriveOrderStatus({ ...base, readyKg: 1000 })).toBe('READY');
  });
  it('distinguishes partial and complete dispatch from delivery', () => {
    expect(deriveOrderStatus({ ...base, readyKg: 1000, dispatchedKg: 500 })).toBe('PARTIALLY_DISPATCHED');
    expect(deriveOrderStatus({ ...base, readyKg: 1000, dispatchedKg: 1000 })).toBe('DISPATCHED');
    expect(deriveOrderStatus({ ...base, dispatchedKg: 1000, deliveredKg: 500 })).toBe('PARTIALLY_DELIVERED');
  });
  it('closes only after full delivery and financial settlement', () => {
    expect(deriveOrderStatus({ ...base, dispatchedKg: 1000, deliveredKg: 1000 })).toBe('DELIVERED');
    expect(deriveOrderStatus({ ...base, dispatchedKg: 1000, deliveredKg: 1000, financiallySettled: true })).toBe('CLOSED');
  });
  it('never reopens a cancelled order', () => expect(deriveOrderStatus({ ...base, currentStatus: 'CANCELLED', readyKg: 1000 })).toBe('CANCELLED'));
});
