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

  it('lọc theo năm và tenant', async () => {
    repo.find.mockResolvedValue([]);
    await service.layTheoNam(2026);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nam: 2026, tenantId: 't1' } }),
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
});
