import { formatTimestampHeader } from '@fleet/common';
import { label, Locale } from './report-labels';

export interface ReportColumn {
  key: string;
  labelKey: string;
  width?: number;
  align?: 'left' | 'right';
}

export interface ReportTable {
  title: string;
  subtitle: string;
  generatedHeader: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number>>;
  summary?: Array<[string, string | number]>;
}

export const buildHeader = (locale: Locale, reportType: string, from: string, to: string, generatedAt: Date): Pick<ReportTable, 'title' | 'subtitle' | 'generatedHeader'> => ({
  title: label(locale, reportType),
  subtitle: `${label(locale, 'period')}: ${from.slice(0, 16).replace('T', ' ')} — ${to.slice(0, 16).replace('T', ' ')}`,
  generatedHeader: formatTimestampHeader(generatedAt, locale),
});

export const hoursOf = (seconds: number): number => Number((seconds / 3600).toFixed(2));
