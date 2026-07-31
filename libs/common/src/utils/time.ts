export const nowIso = (): string => new Date().toISOString();

export const toClickHouseDateTime = (iso: string): string => {
  const date = new Date(iso);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
};

export const formatTimestampHeader = (date: Date, locale: 'uz' | 'ru'): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return locale === 'ru' ? `Сформировано: ${stamp}` : `Shakllantirilgan vaqt: ${stamp}`;
};
