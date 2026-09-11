import { describe, it, expect } from 'vitest';
import { ghimCotTen } from './ghimCotTen';
import { RONG_COT_GHIM_DIEN_THOAI } from '@/components/table/ghimTheoManHinh';

const cot = [
  { key: 'ten', title: 'Chỉ tiêu', width: 350 },
  { key: 'dauNam', title: 'Số đầu năm', width: 150 },
];

describe('ghimCotTen', () => {
  it('máy tính / máy tính bảng: trả lại đúng mảng cũ', () => {
    expect(ghimCotTen(cot, 'desktop')).toBe(cot);
    expect(ghimCotTen(cot, 'tablet')).toBe(cot);
  });

  it('điện thoại: cột đầu ghim trái, hẹp lại, không cắt chữ', () => {
    const kq = ghimCotTen(cot, 'mobile');
    expect(kq[0]).toMatchObject({ key: 'ten', fixed: 'left', width: RONG_COT_GHIM_DIEN_THOAI });
    expect(kq[0]).not.toHaveProperty('ellipsis');
    expect(kq[1]).toBe(cot[1]);
    // Không sửa mảng/cột gốc (cột có thể là hằng dùng lại giữa các lần render).
    expect(cot[0]).toEqual({ key: 'ten', title: 'Chỉ tiêu', width: 350 });
  });

  it('mảng rỗng không vỡ', () => {
    expect(ghimCotTen([], 'mobile')).toEqual([]);
  });
});
