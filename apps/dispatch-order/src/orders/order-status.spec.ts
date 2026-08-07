import { OrderStatus } from '@fleet/database';
import { canTransition, driverCanTransition, generateOrderNumber, isActiveStatus } from './order-status';

describe('order status machine', () => {
  it('allows the happy path', () => {
    expect(canTransition(OrderStatus.CREATED, OrderStatus.ASSIGNED)).toBe(true);
    expect(canTransition(OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED)).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition(OrderStatus.CREATED, OrderStatus.COMPLETED)).toBe(false);
    expect(canTransition(OrderStatus.COMPLETED, OrderStatus.IN_PROGRESS)).toBe(false);
    expect(canTransition(OrderStatus.CANCELLED, OrderStatus.ASSIGNED)).toBe(false);
  });

  it('limits drivers to start and complete', () => {
    expect(driverCanTransition(OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS)).toBe(true);
    expect(driverCanTransition(OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED)).toBe(true);
    expect(driverCanTransition(OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED)).toBe(false);
    expect(driverCanTransition(OrderStatus.CREATED, OrderStatus.ASSIGNED)).toBe(false);
  });

  it('identifies active statuses and formats numbers', () => {
    expect(isActiveStatus(OrderStatus.ASSIGNED)).toBe(true);
    expect(isActiveStatus(OrderStatus.COMPLETED)).toBe(false);
    expect(generateOrderNumber(new Date('2026-08-05T10:00:00Z'), 7)).toBe('ORD-20260805-0007');
  });
});
