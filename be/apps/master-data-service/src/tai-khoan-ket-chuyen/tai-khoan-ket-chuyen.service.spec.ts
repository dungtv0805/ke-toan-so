import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { TenantContextService } from '@app/core';
import { TaiKhoanKetChuyen } from '@app/entities';
import { TaiKhoanKetChuyenService } from './tai-khoan-ket-chuyen.service';

describe('TaiKhoanKetChuyenService', () => {
  let service: TaiKhoanKetChuyenService;
  let mockRepository: any;

  const taoBanGhi = (ma: string, thuTu: number): TaiKhoanKetChuyen => {
    const e = new TaiKhoanKetChuyen();
    e._id = new ObjectId();
    e.ma = ma;
    e.thuTu = thuTu;
    e.taiKhoanTu = '511';
    e.taiKhoanDen = '911';
    e.ben = 'CO';
    e.loai = 'XAC_DINH_KQKD';
    e.isActive = true;
    return e;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((d: any) => d),
      save: jest.fn((d: any) => d),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaiKhoanKetChuyenService,
        { provide: getRepositoryToken(TaiKhoanKetChuyen), useValue: mockRepository },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => 'tenant-1' } },
      ],
    }).compile();

    service = module.get<TaiKhoanKetChuyenService>(TaiKhoanKetChuyenService);
  });

  it('từ chối tạo khi mã kết chuyển đã tồn tại', async () => {
    mockRepository.findOne.mockResolvedValue(taoBanGhi('511-911', 10));

    await expect(
      service.create({
        thuTu: 10,
        ma: '511-911',
        taiKhoanTu: '511',
        taiKhoanDen: '911',
        ben: 'CO',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('từ chối tạo khi kết chuyển từ và đến trùng nhau', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        thuTu: 10,
        ma: '511-511',
        taiKhoanTu: '511',
        taiKhoanDen: '511',
        ben: 'CO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('từ chối tạo khi kết chuyển đến là tài khoản con của kết chuyển từ', async () => {
    // Engine gom TK nguồn theo TIỀN TỐ: khai `511 → 5111` khiến TK đích nằm trong chính
    // tập nguồn và sinh bút toán vô nghĩa `Nợ 5111 / Có 5111`.
    mockRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        thuTu: 10,
        ma: '511-5111',
        taiKhoanTu: '511',
        taiKhoanDen: '5111',
        ben: 'CO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('từ chối tạo khi kết chuyển đến là tài khoản cha của kết chuyển từ', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        thuTu: 10,
        ma: '5111-511',
        taiKhoanTu: '5111',
        taiKhoanDen: '511',
        ben: 'CO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('vẫn cho phép cặp tài khoản không lồng nhau', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    const ketQua = await service.create({
      thuTu: 10,
      ma: '511-911',
      taiKhoanTu: '511',
      taiKhoanDen: '911',
      ben: 'CO',
    });

    expect(ketQua.taiKhoanDen).toBe('911');
  });

  it('từ chối khi sửa thành cặp tài khoản lồng nhau', async () => {
    const banGhi = taoBanGhi('511-911', 10);
    mockRepository.findOne.mockResolvedValue(banGhi);

    await expect(
      service.update(banGhi._id.toHexString(), { taiKhoanDen: '5111' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sắp xếp theo thứ tự kết chuyển tăng dần, mã dùng làm tie-break', async () => {
    mockRepository.findAndCount.mockResolvedValue([
      [taoBanGhi('911-4212', 99), taoBanGhi('642-911', 20), taoBanGhi('511-911', 20)],
      3,
    ]);

    const ketQua = await service.findAllPaginated({ page: 1, limit: 10 } as any);

    expect(ketQua.data.map((d) => d.ma)).toEqual(['511-911', '642-911', '911-4212']);
  });

  it('mặc định loai là XAC_DINH_KQKD khi không truyền', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    const ketQua = await service.create({
      thuTu: 10,
      ma: '511-911',
      taiKhoanTu: '511',
      taiKhoanDen: '911',
      ben: 'CO',
    });

    expect(ketQua.loai).toBe('XAC_DINH_KQKD');
  });
});
