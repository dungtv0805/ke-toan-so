import { IsNotEmpty, IsString } from 'class-validator';
import { ConflictException } from '@nestjs/common';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportEntry } from './import-danh-muc.types';

class FakeDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;
}

function makeEntry(create: jest.Mock): ImportEntry {
  return { service: { create }, dtoClass: FakeDto, label: 'Đơn vị tính' };
}

describe('ImportDanhMucService', () => {
  let service: ImportDanhMucService;

  beforeEach(() => {
    service = new ImportDanhMucService();
  });

  it('tạo hết các dòng hợp lệ và đếm đúng', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'x' });
    const result = await service.importItems(makeEntry(create), [
      { ma: 'DVT01', ten: 'Cái' },
      { ma: 'DVT02', ten: 'Hộp' },
    ]);

    expect(create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ created: 2, failed: [] });
  });

  it('dòng sai DTO bị đẩy vào failed, không gọi create', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'x' });
    const result = await service.importItems(makeEntry(create), [
      { ma: '', ten: 'Cái' },
    ]);

    expect(create).not.toHaveBeenCalled();
    expect(result.created).toBe(0);
    expect(result.failed).toHaveLength(1);
    // dòng 1 của items = dòng 2 của file Excel (dòng 1 là header)
    expect(result.failed[0].row).toBe(2);
    expect(result.failed[0].message).toContain('ma');
  });

  it('dòng lỗi không chặn dòng sau, message lấy từ exception', async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce(new ConflictException('Mã đơn vị tính DVT01 đã tồn tại'))
      .mockResolvedValueOnce({ id: 'y' });

    const result = await service.importItems(makeEntry(create), [
      { ma: 'DVT01', ten: 'Cái' },
      { ma: 'DVT02', ten: 'Hộp' },
    ]);

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.created).toBe(1);
    expect(result.failed).toEqual([
      { row: 2, message: 'Mã đơn vị tính DVT01 đã tồn tại' },
    ]);
  });

  it('danh sách rỗng trả về created 0', async () => {
    const create = jest.fn();
    const result = await service.importItems(makeEntry(create), []);
    expect(result).toEqual({ created: 0, failed: [] });
  });
});
