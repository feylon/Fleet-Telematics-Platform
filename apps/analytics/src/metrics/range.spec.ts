import { parseRange } from './metrics.service';

describe('parseRange', () => {
  it('rejects spans longer than 92 days and inverted ranges', () => {
    expect(() => parseRange({ organizationId: 'o', from: '2026-01-01T00:00:00Z', to: '2026-06-01T00:00:00Z' })).toThrow();
    expect(() => parseRange({ organizationId: 'o', from: '2026-06-01T00:00:00Z', to: '2026-05-01T00:00:00Z' })).toThrow();
    expect(() => parseRange({ organizationId: '', from: '', to: '' })).toThrow();
  });

  it('defaults to the last 24 hours in ClickHouse format', () => {
    const range = parseRange({ organizationId: 'o', from: '', to: '2026-08-02T00:00:00.000Z' });
    expect(range.from).toBe('2026-08-01 00:00:00.000');
    expect(range.to).toBe('2026-08-02 00:00:00.000');
  });
});
