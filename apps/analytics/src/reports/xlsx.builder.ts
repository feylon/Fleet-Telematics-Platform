import { Workbook } from 'exceljs';
import { label, Locale } from './report-labels';
import { ReportTable } from './report-table';

export const buildXlsx = async (table: ReportTable, locale: Locale): Promise<Buffer> => {
  const workbook = new Workbook();
  workbook.creator = 'FleetView';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(table.title.slice(0, 31));
  sheet.addRow([table.generatedHeader]);
  sheet.getRow(1).font = { italic: true, color: { argb: 'FF555555' } };
  sheet.addRow([table.title]);
  sheet.getRow(2).font = { bold: true, size: 14 };
  sheet.addRow([table.subtitle]);
  sheet.addRow([]);
  const header = sheet.addRow(table.columns.map((column) => label(locale, column.labelKey)));
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = { bottom: { style: 'thin' } };
  });
  for (const row of table.rows) {
    sheet.addRow(table.columns.map((column) => row[column.key] ?? ''));
  }
  if (table.summary && table.summary.length > 0) {
    sheet.addRow([]);
    for (const [key, value] of table.summary) {
      const summaryRow = sheet.addRow([key, value]);
      summaryRow.font = { bold: true };
    }
  }
  table.columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width ?? 18;
  });
  sheet.views = [{ state: 'frozen', ySplit: 5 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
};
