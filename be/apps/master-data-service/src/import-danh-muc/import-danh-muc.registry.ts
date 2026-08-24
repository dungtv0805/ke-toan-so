import { Injectable } from '@nestjs/common';
import { ImportEntry } from './import-danh-muc.types';

import { TaiKhoanService } from '../tai-khoan/tai-khoan.service';
import { DoiTuongService } from '../doi-tuong/doi-tuong.service';
import { DuAnService } from '../du-an/du-an.service';
import { SanPhamService } from '../san-pham/san-pham.service';
import { HopDongService } from '../hop-dong/hop-dong.service';
import { BoPhanService } from '../bo-phan/bo-phan.service';
import { KhoanMucService } from '../khoan-muc/khoan-muc.service';
import { KhoService } from '../kho/kho.service';
import { HangHoaVatTuService } from '../hang-hoa-vat-tu/hang-hoa-vat-tu.service';
import { DonViTinhService } from '../don-vi-tinh/don-vi-tinh.service';
import { LyDoKhongHopLeService } from '../ly-do-khong-hop-le/ly-do-khong-hop-le.service';
import { NhomVatTuService } from '../nhom-vat-tu/nhom-vat-tu.service';
import { NhomSanPhamService } from '../nhom-san-pham/nhom-san-pham.service';
import { ChuDauTuService } from '../chu-dau-tu/chu-dau-tu.service';
import { NhomKhoanMucService } from '../nhom-khoan-muc/nhom-khoan-muc.service';
import { NhomDongTienService } from '../nhom-dong-tien/nhom-dong-tien.service';
import { NganHangService } from '../ngan-hang/ngan-hang.service';
import { DongTienService } from '../dong-tien/dong-tien.service';
import { NhomKhuyenMaiService } from '../nhom-khuyen-mai/nhom-khuyen-mai.service';
import { NhomQuanLyService } from '../nhom-quan-ly/nhom-quan-ly.service';
import { LoaiChungTuService } from '../loai-chung-tu/loai-chung-tu.service';
import { LoaiGiaoDichService } from '../loai-giao-dich/loai-giao-dich.service';
import { HoSoChungTuService } from '../ho-so-chung-tu/ho-so-chung-tu.service';

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
import { CreateNhomDongTienDto } from '../nhom-dong-tien/dto';
import { CreateNganHangDto } from '../ngan-hang/dto';
import { CreateDongTienDto } from '../dong-tien/dto';
import { CreateNhomKhuyenMaiDto } from '../nhom-khuyen-mai/dto';
import { CreateNhomQuanLyDto } from '../nhom-quan-ly/dto';
import { CreateLoaiChungTuDto } from '../loai-chung-tu/dto';
import { CreateLoaiGiaoDichDto } from '../loai-giao-dich/dto';
import { CreateHoSoChungTuDto } from '../ho-so-chung-tu/dto';

@Injectable()
export class ImportDanhMucRegistry {
  private readonly entries: Map<string, ImportEntry>;

  constructor(
    taiKhoan: TaiKhoanService,
    doiTuong: DoiTuongService,
    duAn: DuAnService,
    sanPham: SanPhamService,
    hopDong: HopDongService,
    boPhan: BoPhanService,
    khoanMuc: KhoanMucService,
    kho: KhoService,
    hangHoaVatTu: HangHoaVatTuService,
    donViTinh: DonViTinhService,
    lyDoKhongHopLe: LyDoKhongHopLeService,
    nhomVatTu: NhomVatTuService,
    nhomSanPham: NhomSanPhamService,
    chuDauTu: ChuDauTuService,
    nhomKhoanMuc: NhomKhoanMucService,
    nhomDongTien: NhomDongTienService,
    nganHang: NganHangService,
    dongTien: DongTienService,
    nhomKhuyenMai: NhomKhuyenMaiService,
    nhomQuanLy: NhomQuanLyService,
    loaiChungTu: LoaiChungTuService,
    loaiGiaoDich: LoaiGiaoDichService,
    hoSoChungTu: HoSoChungTuService,
  ) {
    this.entries = new Map<string, ImportEntry>([
      [
        'tai-khoan',
        { service: taiKhoan, dtoClass: CreateTaiKhoanDto, label: 'Tài khoản' },
      ],
      [
        'doi-tuong',
        { service: doiTuong, dtoClass: CreateDoiTuongDto, label: 'Đối tượng' },
      ],
      ['du-an', { service: duAn, dtoClass: CreateDuAnDto, label: 'Dự án' }],
      [
        'san-pham',
        { service: sanPham, dtoClass: CreateSanPhamDto, label: 'Sản phẩm' },
      ],
      [
        'hop-dong',
        { service: hopDong, dtoClass: CreateHopDongDto, label: 'Hợp đồng' },
      ],
      [
        'bo-phan',
        { service: boPhan, dtoClass: CreateBoPhanDto, label: 'Bộ phận' },
      ],
      [
        'khoan-muc',
        { service: khoanMuc, dtoClass: CreateKhoanMucDto, label: 'Khoản mục' },
      ],
      ['kho', { service: kho, dtoClass: CreateKhoDto, label: 'Kho' }],
      [
        'hang-hoa-vat-tu',
        {
          service: hangHoaVatTu,
          dtoClass: CreateHangHoaVatTuDto,
          label: 'Hàng hóa vật tư',
        },
      ],
      [
        'don-vi-tinh',
        {
          service: donViTinh,
          dtoClass: CreateDonViTinhDto,
          label: 'Đơn vị tính',
        },
      ],
      [
        'ly-do-khong-hop-le',
        {
          service: lyDoKhongHopLe,
          dtoClass: CreateLyDoKhongHopLeDto,
          label: 'Lý do không hợp lệ',
        },
      ],
      [
        'nhom-vat-tu',
        {
          service: nhomVatTu,
          dtoClass: CreateNhomVatTuDto,
          label: 'Nhóm vật tư',
        },
      ],
      [
        'nhom-san-pham',
        {
          service: nhomSanPham,
          dtoClass: CreateNhomSanPhamDto,
          label: 'Nhóm sản phẩm',
        },
      ],
      [
        'chu-dau-tu',
        { service: chuDauTu, dtoClass: CreateChuDauTuDto, label: 'Chủ đầu tư' },
      ],
      [
        'nhom-khoan-muc',
        {
          service: nhomKhoanMuc,
          dtoClass: CreateNhomKhoanMucDto,
          label: 'Nhóm khoản mục',
        },
      ],
      [
        'nhom-dong-tien',
        {
          service: nhomDongTien,
          dtoClass: CreateNhomDongTienDto,
          label: 'Nhóm dòng tiền',
        },
      ],
      [
        'ngan-hang',
        {
          service: nganHang,
          dtoClass: CreateNganHangDto,
          label: 'Ngân hàng & Quỹ',
        },
      ],
      [
        'dong-tien',
        { service: dongTien, dtoClass: CreateDongTienDto, label: 'Dòng tiền' },
      ],
      [
        'nhom-khuyen-mai',
        {
          service: nhomKhuyenMai,
          dtoClass: CreateNhomKhuyenMaiDto,
          label: 'Nhóm khuyến mại',
        },
      ],
      [
        'nhom-quan-ly',
        {
          service: nhomQuanLy,
          dtoClass: CreateNhomQuanLyDto,
          label: 'Nhóm quản lý',
        },
      ],
      [
        'loai-chung-tu',
        {
          service: loaiChungTu,
          dtoClass: CreateLoaiChungTuDto,
          label: 'Loại chứng từ',
        },
      ],
      [
        'loai-giao-dich',
        {
          service: loaiGiaoDich,
          dtoClass: CreateLoaiGiaoDichDto,
          label: 'Loại giao dịch',
        },
      ],
      [
        'ho-so-chung-tu',
        {
          service: hoSoChungTu,
          dtoClass: CreateHoSoChungTuDto,
          label: 'Hồ sơ chứng từ',
        },
      ],
    ]);
  }

  /** Trả về entry của resource, hoặc undefined nếu resource không được hỗ trợ. */
  get(resource: string): ImportEntry | undefined {
    return this.entries.get(resource);
  }

  /** Danh sách resource đang hỗ trợ — dùng cho test và thông báo lỗi. */
  resources(): string[] {
    return [...this.entries.keys()];
  }
}
