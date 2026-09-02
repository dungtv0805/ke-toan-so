import { describe, expect, it } from 'vitest';
import { capCot, nhanChenhLech, rowClassName } from './cotChung';

describe('nhanChenhLech', () => {
  it('khớp mục tiêu thì không cảnh báo', () => {
    expect(nhanChenhLech(0)).toBeNull();
  });

  it('lệch dưới 1 đồng thì không cảnh báo', () => {
    expect(nhanChenhLech(0.4)).toBeNull();
    expect(nhanChenhLech(-0.9)).toBeNull();
  });

  it('phân bổ vượt thì chữ xanh, có dấu cộng', () => {
    const kq = nhanChenhLech(20000000)!;
    expect(kq.text).toBe('+20.000.000');
    expect(kq.lop).toContain('text-green');
    expect(kq.tooltip).toBe('Phân bổ vượt mục tiêu 20.000.000 ₫');
  });

  it('còn thiếu thì chữ đỏ, có dấu trừ và số dương', () => {
    const kq = nhanChenhLech(-5000000)!;
    expect(kq.text).toBe('−5.000.000');
    expect(kq.lop).toContain('text-red');
    expect(kq.tooltip).toBe('Còn thiếu 5.000.000 ₫');
  });
});

describe('capCot', () => {
  it('gắn cùng một lớp cho cả ô tiêu đề lẫn ô dữ liệu', () => {
    const kq = capCot('kh-cot-quy');
    expect(kq.className).toBe('kh-cot-quy');
    expect(kq.onHeaderCell()).toEqual({ className: 'kh-cot-quy' });
  });
});

describe('rowClassName', () => {
  it('hàng tổng và hàng nhóm giữ nền cấp hàng của mình, không tô đỏ', () => {
    expect(rowClassName({ loai: 'tong', lech: true })).toBe('kh-hang-tong');
    expect(rowClassName({ loai: 'nhom', lech: true })).toBe('kh-hang-nhom');
  });

  it('dòng chi tiết lệch mục tiêu thì tô đỏ', () => {
    expect(rowClassName({ loai: 'chiTiet', lech: true })).toBe('kh-hang-lech');
  });

  it('dòng chi tiết khớp mục tiêu thì không tô gì', () => {
    expect(rowClassName({ loai: 'chiTiet', lech: false })).toBe('');
  });

  // Dòng vừa thêm luôn lệch (chưa phân bổ tháng nào) — tô đỏ ngay lúc đang gõ
  // dở là báo động giả, nền vàng "chưa lưu" phải thắng.
  it('dòng chưa lưu giữ nền vàng dù đang lệch', () => {
    expect(rowClassName({ loai: 'chiTiet', lech: true, chuaLuu: true })).toBe(
      'kh-hang-nhap',
    );
  });
});
