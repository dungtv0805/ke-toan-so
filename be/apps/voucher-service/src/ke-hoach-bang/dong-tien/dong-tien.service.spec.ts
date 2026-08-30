import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { KeHoachDongTien, KeHoachTonDau } from '@app/entities';
import { TenantContextService } from '@app/core';
import { DongBoHachToanKeHoachService } from '../dong-bo';
import { KeHoachDongTienService } from './dong-tien.service';

const repo = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
  deleteOne: jest.fn(),
};
const tonDauRepo = {
  findOne: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
};
const tenant = { getCurrentTenantId: jest.fn(() => 't1') };
// Engine đồng bộ được kiểm riêng ở dong-bo.service.spec.ts; ở đây chỉ cần
// xác nhận bảng có gọi nó đúng lúc.
const dongBo = { dongBo: jest.fn(), xoaTheoNguon: jest.fn() };

const dtoMau = {
  nam: 2026,
  nhomDongTien: { id: 'n1', ma: 'THU_KD', ten: 'Thu hoạt động kinh doanh' },
  dongTien: { id: 'd1', ma: 'T001', ten: 'Thu bán hàng' },
  chieu: 'THU' as const,
  giaTriMucTieu: 1_200_000_000,
  thang: Array(12).fill(100_000_000) as number[],
};

const themItem = (dongTienId: string, ma: string) => ({
  nhomDongTien: dtoMau.nhomDongTien,
  dongTien: { id: dongTienId, ma, ten: ma },
  chieu: 'CHI' as const,
  giaTriMucTieu: 0,
  thang: Array(12).fill(0) as number[],
});

describe('KeHoachDongTienService', () => {
  let service: KeHoachDongTienService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        KeHoachDongTienService,
        { provide: getRepositoryToken(KeHoachDongTien), useValue: repo },
        { provide: getRepositoryToken(KeHoachTonDau), useValue: tonDauRepo },
        { provide: TenantContextService, useValue: tenant },
        { provide: DongBoHachToanKeHoachService, useValue: dongBo },
      ],
    }).compile();
    service = mod.get(KeHoachDongTienService);
  });

  it('Kế hoạch nhận cả dòng cũ chưa có trường loaiKeHoach', async () => {
    repo.find.mockResolvedValue([]);
    await service.layTheoNam(2026, 'KE_HOACH');
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          nam: 2026,
          tenantId: 't1',
          $or: [
            { loaiKeHoach: 'KE_HOACH' },
            { loaiKeHoach: { $exists: false } },
          ],
        },
      }),
    );
  });

  it('chặn trùng dòng tiền trong cùng năm và cùng loại', async () => {
    repo.countDocuments.mockResolvedValue(1);
    await expect(service.taoMoi(dtoMau, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('không truyền loại thì mặc định là Kế hoạch', async () => {
    repo.countDocuments.mockResolvedValue(0);
    const dong = await service.taoMoi(dtoMau, 'u1');
    expect(dong).toEqual(
      expect.objectContaining({ loaiKeHoach: 'KE_HOACH', nguoiTaoId: 'u1' }),
    );
  });

  it('giữ nguyên chiều Thu/Chi người dùng chọn', async () => {
    // Chiều KHÔNG suy từ danh mục: DongTien.loai là Kinh doanh/Đầu tư/Tài chính.
    repo.countDocuments.mockResolvedValue(0);
    const dong = await service.taoMoi({ ...dtoMau, chieu: 'CHI' }, 'u1');
    expect(dong).toEqual(expect.objectContaining({ chieu: 'CHI' }));
  });

  describe('luuHangLoat', () => {
    const dongCu = {
      id: 'r1',
      dongTien: { id: 'd1', ma: 'T001', ten: 'Thu bán hàng' },
    };

    it('payload rỗng thì không đụng tới kho', async () => {
      const kq = await service.luuHangLoat({ nam: 2026 }, 'u1');
      expect(kq).toEqual({ daThem: 0, daSua: 0 });
      expect(repo.find).not.toHaveBeenCalled();
    });

    it('chặn hai dòng mới cùng dòng tiền trong CÙNG payload', async () => {
      repo.find.mockResolvedValue([dongCu]);
      await expect(
        service.luuHangLoat(
          { nam: 2026, them: [themItem('d2', 'C001'), themItem('d2', 'C001')] },
          'u1',
        ),
      ).rejects.toThrow(/C001/);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('chặn dòng mới trùng dòng tiền đã có trong kho', async () => {
      repo.find.mockResolvedValue([dongCu]);
      await expect(
        service.luuHangLoat({ nam: 2026, them: [themItem('d1', 'T001')] }, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lô Dự báo soi trùng trong phạm vi Dự báo', async () => {
      repo.find.mockResolvedValue([]);
      await service.luuHangLoat(
        { nam: 2026, loaiKeHoach: 'DU_BAO', them: [themItem('d1', 'T001')] },
        'u1',
      );
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nam: 2026, tenantId: 't1', loaiKeHoach: 'DU_BAO' },
        }),
      );
    });
  });

  describe('tồn quỹ đầu năm', () => {
    it('chưa khai thì coi như 0', async () => {
      tonDauRepo.findOne.mockResolvedValue(null);
      expect(await service.layTonDau({ nam: 2026 })).toEqual({ soTien: 0 });
    });

    it('lưu lần đầu thì tạo bản ghi mới', async () => {
      tonDauRepo.findOne.mockResolvedValue(null);
      const kq = await service.luuTonDau({ nam: 2026, soTien: 500 }, 'u1');
      expect(kq).toEqual({ soTien: 500 });
      expect(tonDauRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ nam: 2026, loaiKeHoach: 'KE_HOACH' }),
      );
    });

    it('lưu lần sau thì ghi đè, không tạo thêm bản ghi', async () => {
      tonDauRepo.findOne.mockResolvedValue({ nam: 2026, soTien: 500 });
      const kq = await service.luuTonDau({ nam: 2026, soTien: 900 }, 'u1');
      expect(kq).toEqual({ soTien: 900 });
      expect(tonDauRepo.create).not.toHaveBeenCalled();
    });

    it('cho phép tồn đầu âm — kế hoạch có thể bắt đầu bằng thấu chi', async () => {
      tonDauRepo.findOne.mockResolvedValue(null);
      expect(
        await service.luuTonDau({ nam: 2026, soTien: -1000 }, 'u1'),
      ).toEqual({ soTien: -1000 });
    });
  });
});
