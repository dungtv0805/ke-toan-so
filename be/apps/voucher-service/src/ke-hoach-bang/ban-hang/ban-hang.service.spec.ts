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

  describe('luuHangLoat', () => {
    const dongCu = {
      id: 'r1',
      sanPham: { id: 's1', ma: 'SP1', ten: 'Sản phẩm 1' },
      nhomSanPham: { id: 'n1', ma: 'N1', ten: 'Nhóm 1' },
      luong: 1,
      giaBinhQuan: 1,
      thang: Array(12).fill(0),
    };

    const themItem = (id: string, ma: string) => ({
      nhomSanPham: { id: 'n1', ma: 'N1', ten: 'Nhóm 1' },
      sanPham: { id, ma, ten: ma },
      luong: 1,
      giaBinhQuan: 1000,
      thang: Array(12).fill(0) as number[],
    });

    it('payload rỗng thì không đụng tới kho', async () => {
      const kq = await service.luuHangLoat({ nam: 2026 }, 'u1');
      expect(kq).toEqual({ daThem: 0, daSua: 0 });
      expect(repo.find).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('thêm nhiều dòng trong một lần lưu', async () => {
      repo.find.mockResolvedValue([dongCu]);
      const kq = await service.luuHangLoat(
        { nam: 2026, them: [themItem('s2', 'SP2'), themItem('s3', 'SP3')] },
        'u1',
      );
      expect(kq).toEqual({ daThem: 2, daSua: 0 });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.save.mock.calls[0][0]).toHaveLength(2);
    });

    it('chặn hai dòng mới cùng sản phẩm trong CÙNG payload', async () => {
      repo.find.mockResolvedValue([dongCu]);
      await expect(
        service.luuHangLoat(
          { nam: 2026, them: [themItem('s2', 'SP2'), themItem('s2', 'SP2')] },
          'u1',
        ),
      ).rejects.toThrow(/SP2/);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('chặn dòng mới trùng sản phẩm đã có trong kho', async () => {
      repo.find.mockResolvedValue([dongCu]);
      await expect(
        service.luuHangLoat({ nam: 2026, them: [themItem('s1', 'SP1')] }, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sửa dòng có sẵn thì áp thay đổi lên đúng dòng đó', async () => {
      repo.find.mockResolvedValue([dongCu]);
      const kq = await service.luuHangLoat(
        { nam: 2026, sua: [{ id: 'r1', luong: 99 }] },
        'u1',
      );
      expect(kq).toEqual({ daThem: 0, daSua: 1 });
      expect(repo.save.mock.calls[0][0][0]).toEqual(
        expect.objectContaining({ id: 'r1', luong: 99 }),
      );
    });

    it('thêm và sửa lẫn lộn trong một lần lưu', async () => {
      repo.find.mockResolvedValue([dongCu]);
      const kq = await service.luuHangLoat(
        { nam: 2026, them: [themItem('s2', 'SP2')], sua: [{ id: 'r1', luong: 5 }] },
        'u1',
      );
      expect(kq).toEqual({ daThem: 1, daSua: 1 });
      expect(repo.save.mock.calls[0][0]).toHaveLength(2);
    });

    it('sửa id không tồn tại thì 404', async () => {
      repo.find.mockResolvedValue([dongCu]);
      await expect(
        service.luuHangLoat({ nam: 2026, sua: [{ id: 'khong-co', luong: 1 }] }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
