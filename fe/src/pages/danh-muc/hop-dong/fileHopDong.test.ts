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
  const file = (size: number, type = 'application/pdf', name = 'a.pdf') =>
    ({ size, type, name }) as File;

  it('file PDF hợp lệ thì không có lỗi', () => {
    expect(kiemTraTruocKhiTaiLen(file(1024))).toBeNull();
  });

  it('quá 25MB thì báo lỗi ngay ở trình duyệt, khỏi tải lên rồi mới hỏng', () => {
    expect(kiemTraTruocKhiTaiLen(file(25 * 1024 * 1024 + 1))).toMatch(/25MB/);
  });

  it('không phải PDF thì báo lỗi, kể cả ảnh và Word', () => {
    for (const type of [
      'application/x-msdownload',
      'image/png',
      'application/msword',
    ]) {
      expect(kiemTraTruocKhiTaiLen(file(1024, type, 'a.doc'))).toMatch(/PDF/);
    }
  });

  it('kéo-thả không đoán ra MIME thì xét đuôi .pdf', () => {
    expect(kiemTraTruocKhiTaiLen(file(1024, '', 'hop-dong.PDF'))).toBeNull();
    expect(kiemTraTruocKhiTaiLen(file(1024, '', 'hop-dong.docx'))).toMatch(/PDF/);
  });

  it('báo lỗi có kèm tên file — kéo cả mẻ mới biết file nào hỏng', () => {
    expect(kiemTraTruocKhiTaiLen(file(1024, 'image/png', 'anh.png'))).toContain(
      'anh.png',
    );
  });
});
