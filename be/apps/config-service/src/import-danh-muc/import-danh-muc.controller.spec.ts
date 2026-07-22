import { NotFoundException } from '@nestjs/common';
import { ImportDanhMucController } from './import-danh-muc.controller';
import { ImportDanhMucService } from './import-danh-muc.service';
import { QuyChuan_Service } from '../quy-chuan/quy-chuan.service';

describe('ImportDanhMucController', () => {
  function makeController(
    importItems: jest.Mock,
    quyChuan: Partial<QuyChuan_Service> = { create: jest.fn() },
  ) {
    const importService = { importItems } as unknown as ImportDanhMucService;
    return new ImportDanhMucController(
      importService,
      quyChuan as QuyChuan_Service,
    );
  }

  it('resource "quy-chuan" hợp lệ thì gọi importItems và bọc kết quả', async () => {
    const importItems = jest.fn().mockResolvedValue({ created: 2, failed: [] });
    const quyChuanService = { create: jest.fn() };
    const controller = makeController(importItems, quyChuanService);

    const res = await controller.importDanhMuc('quy-chuan', {
      items: [{ loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'Thu tiền mặt' }],
    });

    expect(importItems).toHaveBeenCalledWith(
      expect.objectContaining({
        service: quyChuanService,
        label: 'Quy chuẩn hạch toán',
      }),
      [{ loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'Thu tiền mặt' }],
    );
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

    const res = await controller.importDanhMuc('quy-chuan', { items: [] });
    expect(res).toEqual({ success: true, data: { created: 0, failed: [] } });
  });
});
