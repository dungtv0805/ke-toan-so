import { describe, it, expect } from 'vitest';
import { dinhDangDungLuong, kiemTraTruocKhiTaiLen } from './fileHopDong';

describe('dinhDangDungLuong', () => {
  it('dưới 1MB thì hiện KB', () => {
    expect(dinhDangDungLuong(2048)).toBe('2 KB');
    expect(dinhDangDungLuong(0)).toBe('0 KB');
  });

  it('từ 1MB trở lên thì hiện MB một số lẻ', () => {
    expect(dinhDangDungLuong(1024 * 1024)).toBe('1 MB');
    expect(dinhDangDungLuong(1.55 * 1024 * 1024)).toBe('1.6 MB');
  });
});

describe('kiemTraTruocKhiTaiLen', () => {
  const file = (size: number, type = 'application/pdf') =>
    ({ size, type, name: 'a.pdf' }) as File;

  it('file hợp lệ thì không có lỗi', () => {
    expect(kiemTraTruocKhiTaiLen(file(1024))).toBeNull();
  });

  it('quá 25MB thì báo lỗi ngay ở trình duyệt, khỏi tải lên rồi mới hỏng', () => {
    expect(kiemTraTruocKhiTaiLen(file(25 * 1024 * 1024 + 1))).toMatch(/25MB/);
  });

  it('định dạng lạ thì báo lỗi', () => {
    expect(kiemTraTruocKhiTaiLen(file(1024, 'application/x-msdownload'))).toMatch(
      /không hỗ trợ/,
    );
  });
});
