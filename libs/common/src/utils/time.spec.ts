import { toClickHouseDateTime, formatTimestampHeader } from './time';

describe('toClickHouseDateTime', () => {
  it('formats an ISO timestamp as ClickHouse DateTime64 string in UTC', () => {
    expect(toClickHouseDateTime('2026-07-30T04:05:06.789Z')).toBe('2026-07-30 04:05:06.789');
  });
});

describe('formatTimestampHeader', () => {
  const date = new Date(2026, 6, 30, 9, 5, 7);

  it('produces an Uzbek header', () => {
    expect(formatTimestampHeader(date, 'uz')).toBe('Shakllantirilgan vaqt: 30.07.2026 09:05:07');
  });

  it('produces a Russian header', () => {
    expect(formatTimestampHeader(date, 'ru')).toBe('Сформировано: 30.07.2026 09:05:07');
  });
});
