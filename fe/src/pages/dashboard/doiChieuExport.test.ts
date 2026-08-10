import { describe, it, expect } from 'vitest';
import { buildDoiChieuSheets } from './doiChieuExport';
import type { DoiChieuRow } from './trialBalanceDerive';

const rows: DoiChieuRow[] = [
  { doiTuong: 'Công ty A', duDauKy: 100, phatSinhTang: 500, phatSinhGiam: 300, duCuoiKy: 300 },
  { doiTuong: 'Công ty B', duDauKy: 0, phatSinhTang: 200, phatSinhGiam: 0, duCuoiKy: 200 },
];

describe('buildDoiChieuSheets', () => {
  it('không có dòng nào → không sinh sheet', () => {
    expect(buildDoiChieuSheets([], 'thu', 'Năm 2026')).toEqual([]);
  });

  it('tiêu đề nêu rõ loại công nợ và kỳ', () => {
    const [sheet] = buildDoiChieuSheets(rows, 'thu', 'Năm 2026');
    expect(sheet.title).toContain('PHẢI THU');
    expect(sheet.title).toContain('Năm 2026');
  });

  it('loại "tra" đổi tiêu đề sang phải trả', () => {
    const [sheet] = buildDoiChieuSheets(rows, 'tra', 'Quý 1');
    expect(sheet.title).toContain('PHẢI TRẢ');
  });

  it('mỗi đối tượng một dòng, cuối cùng là dòng tổng', () => {
    const [sheet] = buildDoiChieuSheets(rows, 'thu', 'Năm 2026');
    expect(sheet.rows).toHaveLength(3);
    const tong = sheet.rows[2];
    expect(tong.cells?.doiTuong).toBe('TỔNG CỘNG');
    expect(tong.cells?.duCuoiKy).toBe(500);
    expect(tong.cells?.phatSinhTang).toBe(700);
    expect(tong.bold).toBe(true);
  });

  it('cột số dùng header tiếng Việt và định dạng số', () => {
    const [sheet] = buildDoiChieuSheets(rows, 'thu', 'Năm 2026');
    expect(sheet.columns[0].header).toBe('Đối tượng');
    expect(sheet.columns[4].align).toBe('right');
    expect(sheet.columns[4].numFmt).toBeTruthy();
  });
});
