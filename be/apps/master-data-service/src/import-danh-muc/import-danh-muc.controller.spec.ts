import { NotFoundException } from '@nestjs/common';
import { ImportDanhMucController } from './import-danh-muc.controller';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportDanhMucRegistry } from './import-danh-muc.registry';
import { ImportEntry } from './import-danh-muc.types';

describe('ImportDanhMucController', () => {
  const entry = {
    service: { create: jest.fn() },
    dtoClass: class {},
    label: 'Đơn vị tính',
  } as unknown as ImportEntry;

  function makeController(importItems: jest.Mock) {
    const importService = { importItems } as unknown as ImportDanhMucService;
    const registry = {
      get: (resource: string) =>
        resource === 'don-vi-tinh' ? entry : undefined,
      resources: () => ['don-vi-tinh'],
    } as unknown as ImportDanhMucRegistry;
    return new ImportDanhMucController(importService, registry);
  }

  it('resource hợp lệ thì gọi importItems và bọc kết quả', async () => {
    const importItems = jest.fn().mockResolvedValue({ created: 2, failed: [] });
    const controller = makeController(importItems);

    const res = await controller.importDanhMuc('don-vi-tinh', {
      items: [{ ma: 'DVT01', ten: 'Cái' }],
    });

    expect(importItems).toHaveBeenCalledWith(entry, [
      { ma: 'DVT01', ten: 'Cái' },
    ]);
    expect(res).toEqual({ success: true, data: { created: 2, failed: [] } });
  });

  it('resource lạ thì ném NotFoundException', async () => {
    const controller = makeController(jest.fn());

    await expect(
      controller.importDanhMuc('khong-ton-tai', { items: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('items rỗng vẫn trả created 0', async () => {
    const importItems = jest.fn().mockResolvedValue({ created: 0, failed: [] });
    const controller = makeController(importItems);

    const res = await controller.importDanhMuc('don-vi-tinh', { items: [] });
    expect(res).toEqual({ success: true, data: { created: 0, failed: [] } });
  });
});
