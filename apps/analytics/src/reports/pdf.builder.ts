import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { label, Locale } from './report-labels';
import { ReportTable } from './report-table';

const fontsDir = (): string => process.env.FONTS_DIR ?? join(process.cwd(), 'assets', 'fonts');

export const buildPdf = (table: ReportTable, locale: Locale): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: table.columns.length > 6 ? 'landscape' : 'portrait', margin: 36, bufferPages: true, info: { Title: table.title, Author: 'FleetView' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const regular = join(fontsDir(), 'DejaVuSans.ttf');
    const bold = join(fontsDir(), 'DejaVuSans-Bold.ttf');
    const hasFonts = existsSync(regular) && existsSync(bold);
    if (hasFonts) {
      doc.registerFont('body', regular);
      doc.registerFont('bold', bold);
    }
    const bodyFont = hasFonts ? 'body' : 'Helvetica';
    const boldFont = hasFonts ? 'bold' : 'Helvetica-Bold';
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.font(bodyFont).fontSize(8).fillColor('#555555').text(table.generatedHeader, { align: 'right' });
    doc.moveDown(0.3);
    doc.font(boldFont).fontSize(15).fillColor('#111111').text(table.title);
    doc.font(bodyFont).fontSize(9).fillColor('#333333').text(table.subtitle);
    doc.moveDown(0.8);
    const totalWeight = table.columns.reduce((sum, column) => sum + (column.width ?? 18), 0);
    const widths = table.columns.map((column) => ((column.width ?? 18) / totalWeight) * pageWidth);
    const rowHeight = 16;
    const headerHeight = 28;
    const drawHeader = () => {
      let x = doc.page.margins.left;
      const y = doc.y;
      doc.rect(x, y, pageWidth, headerHeight).fill('#e2e8f0');
      doc.fillColor('#111111').font(boldFont).fontSize(7.5);
      table.columns.forEach((column, index) => {
        doc.text(label(locale, column.labelKey), x + 3, y + 4, { width: widths[index] - 6, height: headerHeight - 6, align: column.align ?? 'left' });
        x += widths[index];
      });
      doc.y = y + headerHeight;
    };
    drawHeader();
    doc.font(bodyFont).fontSize(8);
    table.rows.forEach((row, rowIndex) => {
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        doc.font(bodyFont).fontSize(8).fillColor('#555555').text(table.generatedHeader, { align: 'right' });
        doc.moveDown(0.3);
        drawHeader();
        doc.font(bodyFont).fontSize(8);
      }
      let x = doc.page.margins.left;
      const y = doc.y;
      if (rowIndex % 2 === 1) doc.rect(x, y, pageWidth, rowHeight).fill('#f8fafc');
      doc.fillColor('#111111');
      table.columns.forEach((column, index) => {
        doc.text(String(row[column.key] ?? ''), x + 3, y + 4, { width: widths[index] - 6, align: column.align ?? 'left', lineBreak: false, ellipsis: true });
        x += widths[index];
      });
      doc.y = y + rowHeight;
    });
    if (table.summary && table.summary.length > 0) {
      doc.moveDown(1);
      doc.font(boldFont).fontSize(9);
      for (const [key, value] of table.summary) {
        doc.text(`${key}: ${value}`, doc.page.margins.left);
      }
    }
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font(bodyFont).fontSize(7).fillColor('#777777').text(`${label(locale, 'page')} ${i + 1} / ${range.count} · ${table.generatedHeader}`, doc.page.margins.left, doc.page.height - doc.page.margins.bottom + 8, { width: pageWidth, align: 'center', lineBreak: false });
    }
    doc.end();
  });
