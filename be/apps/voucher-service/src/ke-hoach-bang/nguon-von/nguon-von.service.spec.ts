import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KeHoachNguonVon } from '@app/entities';
import { TenantContextService } from '@app/core';
import { KeHoachNguonVonService } from './nguon-von.service';

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
  nhom: 'NO_PHAI_TRA' as const,
  maChiTieu: 'NV001',
  tenChiTieu: 'Công nợ phải trả',
  soDuDauNam: 500_000_000,
  giaTriMucTieu: 120_000_000,
  thang: Array(12).fill(10_000_000) as number[],
};

const themItem = (nhom: 'NO_PHAI_TRA' | 'VON_CHU_SO_HUU', ma: string) => ({
  nhom,
  maChiTieu: ma,
  soDuDauNam: 0,
  giaTriMucTieu: 0,
  thang: Array(12).fill(0) as number[],
});

describe('KeHoachNguonVonService', () => {
  let service: KeHoachNguonVonService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        KeHoachNguonVonService,
        { provide: getRepositoryToken(KeHoachNguonVon), useValue: repo },
        { provide: TenantContextService, useValue: tenant },
      ],
    }).compile();
    service = mod.get(KeHoachNguonVonService);
  });

  it('chặn trùng mã chỉ tiêu trong cùng nhóm', async () => {
    repo.countDocuments.mockResolvedValue(1);
    await expect(service.taoMoi(dtoMau, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('giữ nguyên biến động âm — giảm nguồn vốn là hợp lệ', async () => {
    repo.countDocuments.mockResolvedValue(0);
    const thangCoAm = [...Array(11).fill(0), -50_000_000];
    const dong = await service.taoMoi(
      { ...dtoMau, thang: thangCoAm, giaTriMucTieu: -50_000_000 },
      'u1',
    );
    expect(dong).toEqual(
      expect.objectContaining({ thang: thangCoAm, giaTriMucTieu: -50_000_000 }),
    );
  });

  it('giữ số dư đầu năm âm', async () => {
    repo.countDocuments.mockResolvedValue(0);
    const dong = await service.taoMoi({ ...dtoMau, soDuDauNam: -1000 }, 'u1');
    expect(dong).toEqual(expect.objectContaining({ soDuDauNam: -1000 }));
  });

  describe('luuHangLoat', () => {
    const dongCu = { id: 'r1', nhom: 'NO_PHAI_TRA', maChiTieu: 'NV001' };

    it('cùng mã chỉ tiêu ở hai nhóm khác nhau vẫn hợp lệ', async () => {
      repo.find.mockResolvedValue([dongCu]);
      const kq = await service.luuHangLoat(
        { nam: 2026, them: [themItem('VON_CHU_SO_HUU', 'NV001')] },
        'u1',
      );
      expect(kq.daThem).toBe(1);
    });

    it('chặn khi SỬA chỉ tiêu sang nhóm làm trùng dòng khác', async () => {
      repo.find.mockResolvedValue([
        dongCu,
        { id: 'r2', nhom: 'VON_CHU_SO_HUU', maChiTieu: 'NV001' },
      ]);
      await expect(
        service.luuHangLoat(
          { nam: 2026, sua: [{ id: 'r2', nhom: 'NO_PHAI_TRA' }] },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sửa id không tồn tại thì 404', async () => {
      repo.find.mockResolvedValue([dongCu]);
      await expect(
        service.luuHangLoat({ nam: 2026, sua: [{ id: 'khong-co' }] }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
