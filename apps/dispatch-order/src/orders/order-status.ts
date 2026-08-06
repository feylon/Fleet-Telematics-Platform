import { OrderStatus } from '@fleet/database';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  [OrderStatus.ASSIGNED]: [OrderStatus.IN_PROGRESS, OrderStatus.CREATED, OrderStatus.CANCELLED],
  [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

const DRIVER_TRANSITIONS: Array<[OrderStatus, OrderStatus]> = [
  [OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS],
  [OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED],
];

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => TRANSITIONS[from].includes(to);

export const driverCanTransition = (from: OrderStatus, to: OrderStatus): boolean => DRIVER_TRANSITIONS.some(([a, b]) => a === from && b === to);

export const isActiveStatus = (status: OrderStatus): boolean => status === OrderStatus.ASSIGNED || status === OrderStatus.IN_PROGRESS;

export const generateOrderNumber = (date: Date, sequence: number): string => {
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  return `ORD-${stamp}-${String(sequence).padStart(4, '0')}`;
};
