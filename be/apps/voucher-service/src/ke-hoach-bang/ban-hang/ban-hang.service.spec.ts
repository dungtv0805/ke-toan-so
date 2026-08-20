import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KeHoachBanHang } from '@app/entities';
import { TenantContextService } from '@app/core';
import { KeHoachBanHangService } from './ban-hang.service';

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
  nhomSanPham: { id: 'n1', ma: 'N1', ten: 'Nhóm 1' },
  sanPham: { id: 's1', ma: 'SP1', ten: 'Sản phẩm 1' },
  luong: 2000,
  giaBinhQuan: 10000000,
  thang: Array(12).fill(0) as number[],
};

describe('KeHoachBanHangService', () => {
  let service: KeHoachBanHangService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        KeHoachBanHangService,
        { provide: getRepositoryToken(KeHoachBanHang), useValue: repo },
        { provide: TenantContextService, useValue: tenant },
      ],
    }).compile();
    service = mod.get(KeHoachBanHangService);
  });

  it('lọc theo năm và tenant', async () => {
    repo.find.mockResolvedValue([]);
    await service.layTheoNam(2026);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nam: 2026, tenantId: 't1' } }),
    );
  });

  it('chặn trùng sản phẩm trong cùng năm', async () => {
    repo.countDocuments.mockResolvedValue(1);
    await expect(service.taoMoi(dtoMau, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cho thêm khi sản phẩm chưa có trong năm đó', async () => {
    repo.countDocuments.mockResolvedValue(0);
    const dong = await service.taoMoi(dtoMau, 'u1');
    expect(dong).toEqual(
      expect.objectContaining({ nguoiTaoId: 'u1', tenantId: 't1', nam: 2026 }),
    );
  });

  it('sửa dòng không tồn tại thì 404', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      service.capNhat('507f1f77bcf86cd799439011', { luong: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mã dòng sai định dạng thì 400', async () => {
    await expect(service.capNhat('khong-phai-objectid', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
