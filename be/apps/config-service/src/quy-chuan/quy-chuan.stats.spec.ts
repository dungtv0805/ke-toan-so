import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuyChuan } from '@app/entities';
import { QuyChuan_Service } from './quy-chuan.service';

/**
 * Thống kê quy chuẩn ĐẾM THEO MÃ LOẠI GIAO DỊCH CÓ THẬT trong dữ liệu.
 *
 * Bản cũ đếm cứng đúng 4 mã PHIEU_THU / PHIEU_CHI / BAO_CO / BAO_NO — công ty
 * nào đặt loại giao dịch riêng ("Tăng tiền gửi ngân hàng", "Mua hàng"…) thì mọi
 * thẻ và mọi tab đều hiện 0 trong khi tổng là 46.
 */
describe('QuyChuan_Service.getStats — đếm theo loại giao dịch thật', () => {
  const find = jest.fn();
  let service: QuyChuan_Service;

  const qc = (loaiGiaoDich: string, nghiepVu = 'nv') => ({
    loaiGiaoDich,
    nghiepVu,
    taiKhoanNo: '111',
    taiKhoanCo: '511',
    isActive: true,
  });

  beforeEach(async () => {
    find.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuyChuan_Service,
        { provide: getRepositoryToken(QuyChuan), useValue: { find } },
      ],
    }).compile();
    service = moduleRef.get(QuyChuan_Service);
  });

  it('đếm đúng từng mã công ty tự đặt, không chỉ 4 mã mặc định', async () => {
    find.mockResolvedValue([
      qc('TANG_TIEN_GUI'),
      qc('TANG_TIEN_GUI'),
      qc('MUA_HANG'),
      qc('TIEN_LUONG'),
    ]);

    const stats = await service.getStats();

    expect(stats.tongQuyChuan).toBe(4);
    expect(stats.theoLoai).toEqual({
      TANG_TIEN_GUI: 2,
      MUA_HANG: 1,
      TIEN_LUONG: 1,
    });
  });

  it('vẫn đếm đúng 4 mã mặc định (dữ liệu cũ không hỏng)', async () => {
    find.mockResolvedValue([qc('PHIEU_THU'), qc('PHIEU_THU'), qc('PHIEU_CHI'), qc('BAO_CO')]);

    const stats = await service.getStats();

    expect(stats.theoLoai.PHIEU_THU).toBe(2);
    expect(stats.theoLoai.PHIEU_CHI).toBe(1);
    expect(stats.theoLoai.BAO_CO).toBe(1);
    expect(stats.theoLoai.BAO_NO).toBeUndefined();
  });

  it('bản ghi chưa gán loại giao dịch không đội lốt mã rỗng phá tổng', async () => {
    find.mockResolvedValue([qc(''), qc('MUA_HANG')]);

    const stats = await service.getStats();

    expect(stats.tongQuyChuan).toBe(2);
    expect(stats.theoLoai.MUA_HANG).toBe(1);
    expect(Object.values(stats.theoLoai).reduce((s, n) => s + n, 0)).toBe(2);
  });

  it('lọc theo từ khoá thì thống kê đếm trên phần đã lọc', async () => {
    find.mockResolvedValue([
      qc('MUA_HANG', 'Mua nguyên vật liệu'),
      qc('MUA_HANG', 'Mua hàng hoá'),
      qc('TIEN_LUONG', 'Chi lương nhân viên'),
    ]);

    const stats = await service.getStats('lương');

    expect(stats.tongQuyChuan).toBe(1);
    expect(stats.theoLoai).toEqual({ TIEN_LUONG: 1 });
  });

  it('không có dữ liệu → tổng 0, không nổ', async () => {
    find.mockResolvedValue([]);

    const stats = await service.getStats();

    expect(stats.tongQuyChuan).toBe(0);
    expect(stats.theoLoai).toEqual({});
  });
});
