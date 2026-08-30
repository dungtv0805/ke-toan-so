import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KeHoachTaiSan } from '@app/entities';
import { TenantContextService } from '@app/core';
import { DongBoHachToanKeHoachService } from '../dong-bo';
import { KeHoachTaiSanService } from './tai-san.service';

const repo = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => v),
  deleteOne: jest.fn(),
};
const tenant = { getCurrentTenantId: jest.fn(() => 't1') };
// Engine đồng bộ được kiểm riêng ở dong-bo.service.spec.ts; ở đây chỉ cần
// xác nhận bảng có gọi nó đúng lúc.
const dongBo = { dongBo: jest.fn(), xoaTheoNguon: jest.fn() };

const dtoMau = {
  nam: 2026,
  boPhan: { id: 'b1', ma: 'KT', ten: 'Phòng kế toán' },
  maTaiSan: 'TS001',
  tenTaiSan: 'Máy tính',
  soLuong: 2,
  giaBinhQuan: 20_000_000,
  thang: Array(12).fill(0) as number[],
};

const themItem = (boPhanId: string, maTaiSan: string) => ({
  boPhan: { id: boPhanId, ma: boPhanId, ten: boPhanId },
  maTaiSan,
  soLuong: 1,
  giaBinhQuan: 0,
  thang: Array(12).fill(0) as number[],
});

describe('KeHoachTaiSanService', () => {
  let service: KeHoachTaiSanService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        KeHoachTaiSanService,
        { provide: getRepositoryToken(KeHoachTaiSan), useValue: repo },
        { provide: TenantContextService, useValue: tenant },
        { provide: DongBoHachToanKeHoachService, useValue: dongBo },
      ],
    }).compile();
    service = mod.get(KeHoachTaiSanService);
  });

  it('Dự báo chỉ lấy đúng dòng dự báo', async () => {
    repo.find.mockResolvedValue([]);
    await service.layTheoNam(2026, 'DU_BAO');
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { nam: 2026, tenantId: 't1', loaiKeHoach: 'DU_BAO' },
      }),
    );
  });

  it('chặn trùng mã tài sản trong cùng nơi sử dụng', async () => {
    repo.countDocuments.mockResolvedValue(1);
    await expect(service.taoMoi(dtoMau, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('trùng soi theo cả bộ phận lẫn mã tài sản', async () => {
    repo.countDocuments.mockResolvedValue(0);
    await service.taoMoi(dtoMau, 'u1');
    expect(repo.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ 'boPhan.id': 'b1', maTaiSan: 'TS001' }),
    );
  });

  it('mã dòng sai định dạng thì 400', async () => {
    await expect(service.xoa('khong-phai-objectid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  describe('luuHangLoat', () => {
    const dongCu = {
      id: 'r1',
      boPhan: { id: 'b1', ma: 'KT', ten: 'Phòng kế toán' },
      maTaiSan: 'TS001',
    };

    it('cùng mã tài sản ở hai bộ phận khác nhau vẫn hợp lệ', async () => {
      repo.find.mockResolvedValue([dongCu]);
      const kq = await service.luuHangLoat(
        { nam: 2026, them: [themItem('b2', 'TS001')] },
        'u1',
      );
      expect(kq.daThem).toBe(1);
    });

    it('chặn khi SỬA mã tài sản thành trùng dòng khác cùng bộ phận', async () => {
      repo.find.mockResolvedValue([
        dongCu,
        { ...dongCu, id: 'r2', maTaiSan: 'TS002' },
      ]);
      await expect(
        service.luuHangLoat(
          { nam: 2026, sua: [{ id: 'r2', maTaiSan: 'TS001' }] },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('chuyển sang bộ phận khác thì hết trùng, cho lưu', async () => {
      repo.find.mockResolvedValue([
        dongCu,
        {
          ...dongCu,
          id: 'r2',
          boPhan: { id: 'b2', ma: 'KD', ten: 'Kinh doanh' },
        },
      ]);
      const kq = await service.luuHangLoat(
        { nam: 2026, sua: [{ id: 'r2', maTaiSan: 'TS001' }] },
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
});
