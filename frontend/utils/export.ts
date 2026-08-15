export type ExportLocale = 'uz' | 'ru';

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportPayload {
  header: string;
  title: string;
  columns: string[];
  rows: string[][];
}

const pad = (n: number): string => String(n).padStart(2, '0');

export const generationHeader = (date: Date, locale: ExportLocale): string => {
  const stamp = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return locale === 'ru' ? `Сформировано: ${stamp}` : `Shakllantirilgan vaqt: ${stamp}`;
};

export const buildExportRows = (title: string, columns: ExportColumn[], rows: Array<Record<string, unknown>>, locale: ExportLocale, now = new Date()): ExportPayload => ({
  header: generationHeader(now, locale),
  title,
  columns: columns.map((column) => column.label),
  rows: rows.map((row) => columns.map((column) => formatCell(row[column.key]))),
});

export const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const fileStamp = (now: Date): string => `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

const download = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportToExcel = async (title: string, columns: ExportColumn[], rows: Array<Record<string, unknown>>, locale: ExportLocale): Promise<void> => {
  const now = new Date();
  const payload = buildExportRows(title, columns, rows, locale, now);
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31) || 'Report');
  sheet.addRow([payload.header]).font = { italic: true, color: { argb: 'FF64748B' } };
  sheet.addRow([payload.title]).font = { bold: true, size: 14 };
  sheet.addRow([]);
  const head = sheet.addRow(payload.columns);
  head.font = { bold: true };
  head.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  });
  payload.rows.forEach((row) => sheet.addRow(row));
  payload.columns.forEach((_, index) => {
    sheet.getColumn(index + 1).width = 20;
  });
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  const buffer = await workbook.xlsx.writeBuffer();
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${title.replace(/\s+/g, '_')}_${fileStamp(now)}.xlsx`);
};

export const exportToPdf = async (title: string, columns: ExportColumn[], rows: Array<Record<string, unknown>>, locale: ExportLocale): Promise<void> => {
  const now = new Date();
  const payload = buildExportRows(title, columns, rows, locale, now);
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const fontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as typeof import('pdfmake/build/pdfmake');
  const vfs = (fontsModule as { default?: { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> }; pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> });
  const resolvedVfs = vfs.default?.pdfMake?.vfs ?? vfs.pdfMake?.vfs ?? vfs.default?.vfs ?? vfs.vfs;
  if (resolvedVfs) (pdfMake as unknown as { vfs: Record<string, string> }).vfs = resolvedVfs;
  const widths = payload.columns.map(() => '*');
  const definition = {
    pageOrientation: payload.columns.length > 6 ? 'landscape' : 'portrait',
    pageMargins: [28, 40, 28, 40],
    header: { text: payload.header, alignment: 'right', fontSize: 8, color: '#64748b', margin: [28, 14, 28, 0] },
    footer: (currentPage: number, pageCount: number) => ({ columns: [{ text: payload.header, fontSize: 7, color: '#94a3b8' }, { text: `${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 7, color: '#94a3b8' }], margin: [28, 12, 28, 0] }),
    watermark: { text: payload.header, color: '#cbd5e1', opacity: 0.12, bold: true, fontSize: 24 },
    content: [
      { text: payload.title, fontSize: 15, bold: true, margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths,
          body: [payload.columns.map((column) => ({ text: column, bold: true, fillColor: '#e2e8f0', fontSize: 8 })), ...payload.rows.map((row) => row.map((cell) => ({ text: cell, fontSize: 8 })))],
        },
        layout: 'lightHorizontalLines',
      },
    ],
    defaultStyle: { font: 'Roboto', fontSize: 9 },
  };
  pdfMake.createPdf(definition as never).download(`${title.replace(/\s+/g, '_')}_${fileStamp(now)}.pdf`);
};
