import { kiemTraFile, MAX_FILE, MIME_CHO_PHEP } from './ho-so.helper';

const file = (over: Partial<Express.Multer.File> = {}) =>
  ({
    originalname: 'hoa-don.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('x'),
    ...over,
  }) as Express.Multer.File;

describe('kiemTraFile — hồ sơ kèm theo, mục 8', () => {
  it('PDF hợp lệ thì qua', () => {
    expect(() => kiemTraFile(file())).not.toThrow();
  });

  it('nhận đủ các định dạng tài liệu mục 8 liệt kê: scan, ảnh, PDF', () => {
    for (const mime of ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']) {
      expect(() => kiemTraFile(file({ mimetype: mime }))).not.toThrow();
    }
  });

  it('nhận Word/Excel — hợp đồng và bảng kê hay ở hai định dạng này', () => {
    for (const mime of [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]) {
      expect(() => kiemTraFile(file({ mimetype: mime }))).not.toThrow();
    }
  });

  it('không có file thì báo rõ', () => {
    expect(() => kiemTraFile(undefined)).toThrow(/thiếu file/i);
  });

  it('file thực thi bị chặn', () => {
    expect(() => kiemTraFile(file({ mimetype: 'application/x-msdownload' }))).toThrow(
      /không hỗ trợ/i,
    );
  });

  it('quá 25MB bị chặn', () => {
    expect(() => kiemTraFile(file({ size: MAX_FILE + 1 }))).toThrow(/25MB/);
  });

  it('đúng 25MB vẫn qua — ranh giới không bị lệch một byte', () => {
    expect(() => kiemTraFile(file({ size: MAX_FILE }))).not.toThrow();
  });

  it('danh sách mime không rỗng và không chứa định dạng thực thi', () => {
    expect(MIME_CHO_PHEP.size).toBeGreaterThan(5);
    expect([...MIME_CHO_PHEP].some((m) => m.includes('msdownload'))).toBe(false);
  });
});
