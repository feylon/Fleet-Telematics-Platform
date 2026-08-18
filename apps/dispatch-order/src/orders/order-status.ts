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

export const orderNumberPrefix = (date: Date): string => {
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  return `ORD-${stamp}-`;
};

export const generateOrderNumber = (date: Date, sequence: number): string => `${orderNumberPrefix(date)}${String(sequence).padStart(4, '0')}`;

export const nextSequence = (prefix: string, existingNumbers: string[]): number => {
  let max = 0;
  for (const number of existingNumbers) {
    if (!number.startsWith(prefix)) continue;
    const parsed = Number.parseInt(number.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed > max) max = parsed;
  }
  return max + 1;
};

export const isUniqueViolation = (error: unknown): boolean => (error as { code?: string })?.code === '23505';
