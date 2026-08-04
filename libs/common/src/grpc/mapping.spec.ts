import { dateOrNull, emptyToNull, isoOrEmpty, numberOrZero, pageOf, zeroToNull } from './mapping';

describe('grpc mapping helpers', () => {
  it('maps dates and empties symmetrically', () => {
    const date = new Date('2026-08-01T00:00:00.000Z');
    expect(isoOrEmpty(date)).toBe('2026-08-01T00:00:00.000Z');
    expect(isoOrEmpty(null)).toBe('');
    expect(dateOrNull('')).toBeNull();
    expect(dateOrNull('2026-08-01T00:00:00.000Z')?.getTime()).toBe(date.getTime());
    expect(dateOrNull('not a date')).toBeNull();
  });

  it('maps strings and numbers', () => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull('x')).toBe('x');
    expect(numberOrZero('12.5')).toBe(12.5);
    expect(numberOrZero(null)).toBe(0);
    expect(zeroToNull(0)).toBeNull();
    expect(zeroToNull(5)).toBe(5);
  });

  it('clamps pagination', () => {
    expect(pageOf({ page: 0, pageSize: 1000 })).toEqual({ page: 1, pageSize: 200, skip: 0, take: 200 });
    expect(pageOf(undefined)).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
    expect(pageOf({ page: 3, pageSize: 10 })).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
  });
});
