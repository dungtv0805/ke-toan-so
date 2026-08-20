import { ImportDanhMucRegistry } from './import-danh-muc.registry';

import { CreateTaiKhoanDto } from '../tai-khoan/dto';
import { CreateDoiTuongDto } from '../doi-tuong/dto';
import { CreateDuAnDto } from '../du-an/dto';
import { CreateSanPhamDto } from '../san-pham/dto';
import { CreateHopDongDto } from '../hop-dong/dto';
import { CreateBoPhanDto } from '../bo-phan/dto';
import { CreateKhoanMucDto } from '../khoan-muc/dto';
import { CreateKhoDto } from '../kho/dto';
import { CreateHangHoaVatTuDto } from '../hang-hoa-vat-tu/dto';
import { CreateDonViTinhDto } from '../don-vi-tinh/dto';
import { CreateLyDoKhongHopLeDto } from '../ly-do-khong-hop-le/dto';
import { CreateNhomVatTuDto } from '../nhom-vat-tu/dto';
import { CreateNhomSanPhamDto } from '../nhom-san-pham/dto';
import { CreateChuDauTuDto } from '../chu-dau-tu/dto';
import { CreateNhomKhoanMucDto } from '../nhom-khoan-muc/dto';
import { CreateNganHangDto } from '../ngan-hang/dto';
import { CreateDongTienDto } from '../dong-tien/dto';
import { CreateNhomKhuyenMaiDto } from '../nhom-khuyen-mai/dto';
import { CreateNhomQuanLyDto } from '../nhom-quan-ly/dto';
import { CreateLoaiChungTuDto } from '../loai-chung-tu/dto';
import { CreateLoaiGiaoDichDto } from '../loai-giao-dich/dto';
import { CreateHoSoChungTuDto } from '../ho-so-chung-tu/dto';

describe('ImportDanhMucRegistry', () => {
  /** 22 service giả, chỉ cần có create() vì registry không gọi gì khác. */
  const fakes = Array.from({ length: 22 }, () => ({ create: jest.fn() }));
  const registry = new ImportDanhMucRegistry(
    ...(fakes as unknown as ConstructorParameters<
      typeof ImportDanhMucRegistry
    >),
  );

  /**
   * Bảng kỳ vọng: resource -> (vị trí tham số constructor, DTO đúng).
   *
   * Được chép tay từ thứ tự tham số constructor và các import DTO trong
   * import-danh-muc.registry.ts (KHÔNG được sinh tự động từ registry —
   * nếu không test sẽ tự chứng minh chính nó, mất tác dụng bắt lỗi ghép
   * nhầm service/DTO).
   */
  const expected: Array<{
    resource: string;
    position: number;
    dtoClass: new (...args: any[]) => unknown;
  }> = [
    { resource: 'tai-khoan', position: 0, dtoClass: CreateTaiKhoanDto },
    { resource: 'doi-tuong', position: 1, dtoClass: CreateDoiTuongDto },
    { resource: 'du-an', position: 2, dtoClass: CreateDuAnDto },
    { resource: 'san-pham', position: 3, dtoClass: CreateSanPhamDto },
    { resource: 'hop-dong', position: 4, dtoClass: CreateHopDongDto },
    { resource: 'bo-phan', position: 5, dtoClass: CreateBoPhanDto },
    { resource: 'khoan-muc', position: 6, dtoClass: CreateKhoanMucDto },
    { resource: 'kho', position: 7, dtoClass: CreateKhoDto },
    {
      resource: 'hang-hoa-vat-tu',
      position: 8,
      dtoClass: CreateHangHoaVatTuDto,
    },
    { resource: 'don-vi-tinh', position: 9, dtoClass: CreateDonViTinhDto },
    {
      resource: 'ly-do-khong-hop-le',
      position: 10,
      dtoClass: CreateLyDoKhongHopLeDto,
    },
    { resource: 'nhom-vat-tu', position: 11, dtoClass: CreateNhomVatTuDto },
    {
      resource: 'nhom-san-pham',
      position: 12,
      dtoClass: CreateNhomSanPhamDto,
    },
    { resource: 'chu-dau-tu', position: 13, dtoClass: CreateChuDauTuDto },
    {
      resource: 'nhom-khoan-muc',
      position: 14,
      dtoClass: CreateNhomKhoanMucDto,
    },
    { resource: 'ngan-hang', position: 15, dtoClass: CreateNganHangDto },
    { resource: 'dong-tien', position: 16, dtoClass: CreateDongTienDto },
    {
      resource: 'nhom-khuyen-mai',
      position: 17,
      dtoClass: CreateNhomKhuyenMaiDto,
    },
    { resource: 'nhom-quan-ly', position: 18, dtoClass: CreateNhomQuanLyDto },
    { resource: 'loai-chung-tu', position: 19, dtoClass: CreateLoaiChungTuDto },
    {
      resource: 'loai-giao-dich',
      position: 20,
      dtoClass: CreateLoaiGiaoDichDto,
    },
    {
      resource: 'ho-so-chung-tu',
      position: 21,
      dtoClass: CreateHoSoChungTuDto,
    },
  ];

  it('đăng ký đủ 22 danh mục', () => {
    expect(registry.resources()).toHaveLength(22);
    expect(expected).toHaveLength(22);
  });

  it('mỗi entry có đủ service, dtoClass và label', () => {
    for (const resource of registry.resources()) {
      const entry = registry.get(resource)!;
      expect(entry.service).toBeDefined();
      expect(typeof entry.dtoClass).toBe('function');
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('resource không đăng ký trả về undefined', () => {
    expect(registry.get('khong-ton-tai')).toBeUndefined();
  });

  it.each(expected)(
    'ghép đúng service theo vị trí constructor cho $resource',
    ({ resource, position, dtoClass }) => {
      const entry = registry.get(resource);
      expect(entry).toBeDefined();
      expect(entry!.service).toBe(fakes[position]);
      expect(entry!.dtoClass).toBe(dtoClass);
    },
  );
});
