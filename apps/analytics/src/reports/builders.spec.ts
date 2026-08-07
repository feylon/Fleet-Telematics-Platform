import { Workbook } from 'exceljs';
import { buildXlsx } from './xlsx.builder';
import { buildPdf } from './pdf.builder';
import { buildHeader, ReportTable } from './report-table';

const table = (): ReportTable => ({
  ...buildHeader('uz', 'FLEET_SUMMARY', '2026-08-01T00:00:00.000Z', '2026-08-02T00:00:00.000Z', new Date(2026, 7, 2, 9, 30, 0)),
  columns: [
    { key: 'plate', labelKey: 'plate' },
    { key: 'mileageKm', labelKey: 'mileageKm', align: 'right' },
  ],
  rows: [
    { plate: '01A123BC', mileageKm: 120.5 },
    { plate: '01B555CC', mileageKm: 80 },
  ],
  summary: [['Jami', 200.5]],
});

describe('report builders', () => {
  it('writes the generation timestamp header into the first excel row', async () => {
    const buffer = await buildXlsx(table(), 'uz');
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    expect(String(sheet.getRow(1).getCell(1).value)).toBe('Shakllantirilgan vaqt: 02.08.2026 09:30:00');
    expect(String(sheet.getRow(5).getCell(1).value)).toBe('Davlat raqami');
    expect(sheet.getRow(6).getCell(1).value).toBe('01A123BC');
  });

  it('produces a pdf document with a russian header', async () => {
    const russian = { ...table(), ...buildHeader('ru', 'FLEET_SUMMARY', '2026-08-01T00:00:00.000Z', '2026-08-02T00:00:00.000Z', new Date(2026, 7, 2, 9, 30, 0)) };
    const buffer = await buildPdf(russian, 'ru');
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
