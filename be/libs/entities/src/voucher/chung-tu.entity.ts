import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type LoaiChungTu = 'PHIEU_THU' | 'PHIEU_CHI';

// Types cho danh mục (embedded in ChungTu.danhMuc)
// Prefixed with DanhMuc to avoid conflicts with master-data entities
export interface DanhMucDoiTuong {
  ma: string;
  ten: string;
  loai: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
}

export interface DanhMucDuAn {
  ma: string;
  ten: string;
  trangThai: string;
  chuDauTuMa?: string;
  chuDauTuTen?: string;
}

export interface DanhMucBoPhan {
  ma: string;
  ten: string;
}

export interface DanhMucDoi {
  ma: string;
  ten: string;
}

export interface DanhMucNhanVien {
  ma: string;
  ten: string;
}

export interface DanhMucTaiKhoan {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

export interface DanhMucKhoanMuc {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

export interface DanhMucSanPham {
  ma: string;
  ten: string;
  donVi?: string;
  giaBan?: number;
}

export interface DanhMucDongTien {
  ma: string;
  ten: string;
  loai: string;
}

export interface DanhMucChuDauTu {
  ma: string;
  ten: string;
}

export interface DanhMucNhomKhuyenMai {
  ma: string;
  ten: string;
}

export interface DanhMucNhomQuanLy {
  ma: string;
  ten: string;
}

// Gộp tất cả danh mục vào 1 field
export interface DanhMuc {
  doiTuong?: DanhMucDoiTuong;
  doiTuong2?: DanhMucDoiTuong;
  duAn?: DanhMucDuAn;
  boPhan?: DanhMucBoPhan;
  doi?: DanhMucDoi;
  nhanVien?: DanhMucNhanVien;
  taiKhoanNo?: DanhMucTaiKhoan;
  taiKhoanCo?: DanhMucTaiKhoan;
  khoanMuc?: DanhMucKhoanMuc;
  sanPham?: DanhMucSanPham;
  dongTien?: DanhMucDongTien;
  chuDauTu?: DanhMucChuDauTu;
  nhomKhuyenMai?: DanhMucNhomKhuyenMai;
  nhomQuanLy?: DanhMucNhomQuanLy;
}

@Entity('chung_tu')
export class ChungTu extends BaseEntity {
  @Column()
  soPhieu: string;

  @Column()
  loai: LoaiChungTu;

  @Column()
  ngay: Date;

  @Column()
  soTien: number;

  @Column()
  noiDung: string;

  @Column({ nullable: true })
  nguoiGiaoDich: string;

  @Column({ nullable: true })
  diaChi: string;

  @Column({ nullable: true })
  ghiChu: string;

  @Column()
  nguoiTaoId: string;

  // Gộp tất cả danh mục vào 1 field
  @Column({ type: 'simple-json', nullable: true })
  danhMuc: DanhMuc;
}

export interface ChungTuEntities {
  ChungTu: typeof ChungTu;
}

declare module '../entities' {
  interface Entities extends ChungTuEntities {}
}
