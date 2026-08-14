import { BadRequestException } from '@nestjs/common';
import { MAX_FILE_SIZE, kiemTraFile } from './hop-dong-file.rules';

const file = (over: Partial<Express.Multer.File> = {}) =>
  ({
    originalname: 'hop-dong.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('x'),
    ...over,
  }) as Express.Multer.File;

describe('kiemTraFile', () => {
  it('cho qua file hợp lệ', () => {
    expect(() => kiemTraFile(file())).not.toThrow();
  });

  it('thiếu file thì báo lỗi', () => {
    expect(() => kiemTraFile(undefined)).toThrow(BadRequestException);
  });

  it('quá 25MB thì báo lỗi', () => {
    expect(() => kiemTraFile(file({ size: MAX_FILE_SIZE + 1 }))).toThrow(
      /25MB/,
    );
    expect(() => kiemTraFile(file({ size: MAX_FILE_SIZE }))).not.toThrow();
  });

  it('định dạng ngoài whitelist thì báo lỗi', () => {
    expect(() =>
      kiemTraFile(file({ mimetype: 'application/x-msdownload' })),
    ).toThrow(/không hỗ trợ/);
  });

  it('nhận ảnh, Word và Excel — giấy tờ hay đính kèm nhất', () => {
    ['image/jpeg', 'image/png', 'application/vnd.ms-excel'].forEach((m) => {
      expect(() => kiemTraFile(file({ mimetype: m }))).not.toThrow();
    });
  });
});
