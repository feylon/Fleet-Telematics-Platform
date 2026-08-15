import { describe, expect, it } from 'vitest';
import { buildExportRows, generationHeader } from '~/utils/export';

const now = new Date(2026, 7, 5, 9, 30, 7);

describe('export builders', () => {
  it('places the generation timestamp header first in uzbek', () => {
    const payload = buildExportRows('Transportlar', [{ key: 'plate', label: 'Raqam' }], [{ plate: '01A123BC' }, { plate: '01B555CC' }], 'uz', now);
    expect(payload.header).toBe('Shakllantirilgan vaqt: 05.08.2026 09:30:07');
    expect(payload.rows).toHaveLength(2);
    expect(payload.columns).toEqual(['Raqam']);
  });

  it('formats the header in russian', () => {
    expect(generationHeader(now, 'ru')).toBe('Сформировано: 05.08.2026 09:30:07');
  });

  it('formats booleans, numbers and nulls into cells', () => {
    const payload = buildExportRows('x', [{ key: 'a', label: 'a' }, { key: 'b', label: 'b' }, { key: 'c', label: 'c' }], [{ a: true, b: 12.345, c: null }], 'uz', now);
    expect(payload.rows[0]).toEqual(['✓', '12.35', '']);
  });
});
