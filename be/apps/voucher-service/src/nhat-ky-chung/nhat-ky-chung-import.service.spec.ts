import 'reflect-metadata';
import { NhatKyChungService } from './nhat-ky-chung.service';

describe('NhatKyChungService.importEntries', () => {
  function setup() {
    const created: any[] = [];
    const chungTuRepo = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (list: any[]) => {
        created.push(...list);
        return list.map((x, i) => ({ ...x, _id: `id-${i}` }));
      }),
    };
    // voucherNumberService mock: sinh số theo prefix + count
    const voucherNumberService = {
      generateVoucherNumbers: jest.fn(async (loai: string, count: number) => {
        const prefix = loai === 'PHIEU_THU' ? 'PT' : 'PC';
        return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
      }),
    };
    const tenantContext = { getCurrentTenantId: () => undefined };
    const loaiResolver = {
      resolveLoai: async (_dm: any, fb: any) => fb,
      resolveLoaiInfo: async (_dm: any, fb: any) => ({ loai: fb }),
    };
    const service = new NhatKyChungService(
      chungTuRepo as any,
      voucherNumberService as any,
      tenantContext as any,
      loaiResolver as any,
    );
    return { service, chungTuRepo, voucherNumberService, created };
  }

  it('mỗi item nhận 1 số phiếu riêng', async () => {
    const { service, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 100, noiDung: 'a' },
      { loai: 'PHIEU_THU', ngay: '2026-01-02', soTien: 200, noiDung: 'b' },
    ] as any;

    const res = await service.importEntries(items, 'user-1');

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    const saved = chungTuRepo.save.mock.calls[0][0];
    const soPhieus = saved.map((x: any) => x.soPhieu);
    expect(new Set(soPhieus).size).toBe(2); // khác nhau
    expect(saved[0].nguoiTaoId).toBe('user-1');
  });

  it('gom theo loai và đặt dải số riêng từng loại', async () => {
    const { service, voucherNumberService, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 1, noiDung: 'a' },
      { loai: 'PHIEU_CHI', ngay: '2026-01-01', soTien: 2, noiDung: 'b' },
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 3, noiDung: 'c' },
    ] as any;

    await service.importEntries(items, 'u');

    expect(voucherNumberService.generateVoucherNumbers).toHaveBeenCalledWith(
      'PHIEU_THU',
      2,
      { maLoaiChungTu: undefined, date: expect.any(Date) },
    );
    expect(voucherNumberService.generateVoucherNumbers).toHaveBeenCalledWith(
      'PHIEU_CHI',
      1,
      { maLoaiChungTu: undefined, date: expect.any(Date) },
    );
    const saved = chungTuRepo.save.mock.calls[0][0];
    // item index 0 và 2 là PHIEU_THU → PT1, PT2; index 1 là PHIEU_CHI → PC1
    expect(saved[0].soPhieu).toBe('PT1');
    expect(saved[1].soPhieu).toBe('PC1');
    expect(saved[2].soPhieu).toBe('PT2');
  });

  it('mảng rỗng → trả về data rỗng, không lưu', async () => {
    const { service, chungTuRepo } = setup();
    const res = await service.importEntries([] as any, 'u');
    expect(res.data).toEqual([]);
    expect(chungTuRepo.save).not.toHaveBeenCalled();
  });
});
