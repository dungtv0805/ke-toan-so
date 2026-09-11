import { describe, it, expect } from 'vitest';
import { cotKqkdTheoManHinh } from './KqkdTable';
import { RONG_COT_GHIM_DIEN_THOAI } from '@/components/table/ghimTheoManHinh';

const keys = (cols: ReturnType<typeof cotKqkdTheoManHinh>) => cols.map((c) => c.key ?? c.title);

describe('cotKqkdTheoManHinh', () => {
  it('máy tính / máy tính bảng: cùng một bộ cột gốc, không ghim', () => {
    const goc = cotKqkdTheoManHinh('desktop');
    expect(cotKqkdTheoManHinh('tablet')).toBe(goc);
    expect(goc[0].key).toBe('stt');
    expect(goc.some((c) => 'fixed' in c && c.fixed)).toBe(false);
  });

  it('điện thoại: bỏ STT, "Chỉ tiêu" đứng đầu và ghim trái, hẹp lại', () => {
    const cot = cotKqkdTheoManHinh('mobile');
    expect(keys(cot)).not.toContain('stt');
    expect(cot[0]).toMatchObject({ key: 'ten', fixed: 'left', width: RONG_COT_GHIM_DIEN_THOAI });
    // Các cột số / nhóm cột còn nguyên.
    expect(cot).toHaveLength(cotKqkdTheoManHinh('desktop').length - 1);
  });
});
