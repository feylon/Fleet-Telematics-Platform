import { dayBounds, daysBetween } from './rollups.service';

describe('rollup day helpers', () => {
  it('computes UTC day bounds', () => {
    expect(dayBounds('2026-08-05')).toEqual({ from: '2026-08-05T00:00:00.000Z', to: '2026-08-06T00:00:00.000Z' });
  });

  it('enumerates days in a range', () => {
    expect(daysBetween('2026-08-05T10:00:00.000Z', '2026-08-08T00:00:00.000Z')).toEqual(['2026-08-05', '2026-08-06', '2026-08-07']);
  });
});
