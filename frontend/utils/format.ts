import dayjs from 'dayjs';

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('DD.MM.YYYY HH:mm:ss') : '';
};

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('DD.MM.YYYY') : '';
};

export const formatHours = (seconds: number | null | undefined): string => {
  const hours = (seconds ?? 0) / 3600;
  return hours.toFixed(2);
};

export const formatNumber = (value: number | string | null | undefined, digits = 1): string => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(digits) : '0';
};

export const isoLocal = (value: Date): string => dayjs(value).format('YYYY-MM-DDTHH:mm');

export const toIso = (local: string): string => (local ? dayjs(local).toISOString() : '');

export const defaultRange = (hours = 24): { from: string; to: string } => ({
  from: isoLocal(new Date(Date.now() - hours * 3600 * 1000)),
  to: isoLocal(new Date()),
});
