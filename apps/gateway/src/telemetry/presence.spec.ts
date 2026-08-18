import { isNewerPing } from './presence.service';

describe('isNewerPing', () => {
  it('accepts the first ping and newer or equal timestamps', () => {
    expect(isNewerPing(null, '2026-08-01T10:00:00.000Z')).toBe(true);
    expect(isNewerPing('2026-08-01T10:00:00.000Z', '2026-08-01T10:00:00.000Z')).toBe(true);
    expect(isNewerPing('2026-08-01T10:00:00.000Z', '2026-08-01T10:00:05.000Z')).toBe(true);
  });

  it('rejects pings older than the stored one', () => {
    expect(isNewerPing('2026-08-01T10:00:05.000Z', '2026-08-01T10:00:00.000Z')).toBe(false);
  });
});
