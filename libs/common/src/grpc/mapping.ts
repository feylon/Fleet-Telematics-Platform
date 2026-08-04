export const isoOrEmpty = (value: Date | string | null | undefined): string => {
  if (!value) return '';
  return value instanceof Date ? value.toISOString() : String(value);
};

export const stringOrEmpty = (value: string | number | null | undefined): string => (value === null || value === undefined ? '' : String(value));

export const numberOrZero = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const emptyToNull = (value: string | null | undefined): string | null => (value === undefined || value === null || value === '' ? null : value);

export const dateOrNull = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const zeroToNull = (value: number | null | undefined): number | null => (value === undefined || value === null || value === 0 ? null : value);

export interface PageInput {
  page?: number;
  pageSize?: number;
}

export const pageOf = (pagination?: PageInput | null): { page: number; pageSize: number; skip: number; take: number } => {
  const page = Math.max(1, pagination?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, pagination?.pageSize ?? 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};
