import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KeHoachNhanSu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { KeHoachNhanSuService } from './nhan-su.service';

const repo = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
  deleteOne: jest.fn(),
};
const tenant = { getCurrentTenantId: jest.fn(() => 't1') };

const dtoMau = {
  nam: 2026,
  boPhan: { id: 'b1', ma: 'BGD', ten: 'Ban giám đốc' },
  maViTri: 'GD',
  chiPhi: {
    luongChinh: 360000000,
    luongKpi: 0,
    thuongDoanhSo: 0,
    baoHiem: 0,
    daoTao: 0,
    thuongCongNhan: 0,
  },
  thang: Array(12).fill(30000000) as number[],
};

describe('KeHoachNhanSuService', () => {
  let service: KeHoachNhanSuService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        KeHoachNhanSuService,
        { provide: getRepositoryToken(KeHoachNhanSu), useValue: repo },
        { provide: TenantContextService, useValue: tenant },
      ],
    }).compile();
    service = mod.get(KeHoachNhanSuService);
  });

  it('lọc theo năm, tenant và loại kế hoạch', async () => {
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

  it('chặn trùng mã vị trí trong cùng bộ phận và năm', async () => {
    repo.countDocuments.mockResolvedValue(1);
    await expect(service.taoMoi(dtoMau, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cùng mã vị trí ở bộ phận khác thì vẫn thêm được', async () => {
    repo.countDocuments.mockResolvedValue(0);
    const dong = await service.taoMoi(dtoMau, 'u1');
    expect(repo.countDocuments).toHaveBeenCalledWith({
      nam: 2026,
      loaiKeHoach: 'KE_HOACH',
      'boPhan.id': 'b1',
      maViTri: 'GD',
      tenantId: 't1',
    });
    expect(dong).toEqual(
      expect.objectContaining({ nguoiTaoId: 'u1', tenantId: 't1' }),
    );
  });

  it('sửa dòng không tồn tại thì 404', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      service.capNhat('507f1f77bcf86cd799439011', { maViTri: 'PGD' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mã dòng sai định dạng thì 400', async () => {
    await expect(service.xoa('khong-phai-objectid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  describe('luuHangLoat', () => {
    const dongCu = {
      id: 'r1',
      boPhan: { id: 'b1', ma: 'BGD', ten: 'Ban giám đốc' },
      maViTri: 'GD',
      chiPhi: dtoMau.chiPhi,
      thang: Array(12).fill(0),
    };

    const themItem = (boPhanId: string, maViTri: string) => ({
      boPhan: { id: boPhanId, ma: boPhanId, ten: boPhanId },
      maViTri,
      chiPhi: dtoMau.chiPhi,
      thang: Array(12).fill(0) as number[],
    });

    it('thêm nhiều chức vụ vào CÙNG một bộ phận trong một lần lưu', async () => {
      repo.find.mockResolvedValue([dongCu]);
      const kq = await service.luuHangLoat(
        { nam: 2026, them: [themItem('b1', 'PGD'), themItem('b1', 'TROLY')] },
        'u1',
      );
      expect(kq).toEqual({ daThem: 2, daSua: 0 });
      expect(repo.save.mock.calls[0][0]).toHaveLength(2);
    });

    it('cùng mã vị trí ở hai bộ phận khác nhau vẫn hợp lệ', async () => {
      repo.find.mockResolvedValue([dongCu]);
      const kq = await service.luuHangLoat(
        { nam: 2026, them: [themItem('b2', 'GD')] },
        'u1',
      );
      expect(kq.daThem).toBe(1);
    });

    it('chặn hai dòng mới cùng bộ phận cùng mã vị trí', async () => {
      repo.find.mockResolvedValue([dongCu]);
      await expect(
        service.luuHangLoat(
          { nam: 2026, them: [themItem('b2', 'KTT'), themItem('b2', 'KTT')] },
          'u1',
        ),
      ).rejects.toThrow(/KTT/);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('chặn khi SỬA mã vị trí thành trùng dòng khác cùng bộ phận', async () => {
      repo.find.mockResolvedValue([
        dongCu,
        { ...dongCu, id: 'r2', maViTri: 'PGD' },
      ]);
      await expect(
        service.luuHangLoat({ nam: 2026, sua: [{ id: 'r2', maViTri: 'GD' }] }, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('chuyển dòng sang bộ phận khác thì hết trùng, cho lưu', async () => {
      repo.find.mockResolvedValue([
        dongCu,
        { ...dongCu, id: 'r2', boPhan: { id: 'b2', ma: 'KT', ten: 'Kế toán' } },
      ]);
      const kq = await service.luuHangLoat(
        { nam: 2026, sua: [{ id: 'r2', maViTri: 'GD' }] },
        'u1',
      );
      expect(kq).toEqual({ daThem: 0, daSua: 1 });
    });

    it('sửa id không tồn tại thì 404', async () => {
      repo.find.mockResolvedValue([dongCu]);
      await expect(
        service.luuHangLoat({ nam: 2026, sua: [{ id: 'khong-co' }] }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('loaiKeHoach', () => {
    it('Dự báo chỉ lấy đúng dòng dự báo', async () => {
      repo.find.mockResolvedValue([]);
      await service.layTheoNam(2026, 'DU_BAO');
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nam: 2026, tenantId: 't1', loaiKeHoach: 'DU_BAO' },
        }),
      );
    });

    it('cùng chức vụ ở hai loại khác nhau không coi là trùng', async () => {
      repo.countDocuments.mockResolvedValue(0);
      await service.taoMoi({ ...dtoMau, loaiKeHoach: 'DU_BAO' }, 'u1');
      expect(repo.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ loaiKeHoach: 'DU_BAO' }),
      );
    });
  });
});
