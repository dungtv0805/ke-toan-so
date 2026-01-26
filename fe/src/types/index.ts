// ===== DANH MỤC =====

export interface TaiKhoan {
  id: string;
  ma: string;
  ten: string;
  capDo: number;
  loai: 'NO' | 'CO';
  nhom: string;
  parentId?: string;
  moTa?: string;
}

export interface DoiTuong {
  id: string;
  loai: 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU';
  ma: string;
  ten: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
  nguoiLienHe?: string;
}

export interface DuAn {
  id: string;
  ma: string;
  ten: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  chuDuAnMa?: string;
  chuDuAn?: string;
  chuDauTuId?: string;
  trangThai: 'DANG_THUC_HIEN' | 'HOAN_THANH' | 'TAM_DUNG';
}

export interface SanPham {
  id: string;
  ma: string;
  ten: string;
  donVi?: string;
  giaBan?: number;
  nhom?: string;
  moTa?: string;
}

export interface BoPhan {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

export interface KhoanMuc {
  id: string;
  ma: string;
  ten: string;
  loai: 'CHI_PHI' | 'DOANH_THU';
  nhom: string;
}

export interface TaiKhoanNganHang {
  id: string;
  ma: string;
  ten: string;
  loai: 'TIEN_MAT' | 'NGAN_HANG';
  soDu: number;
  nganHang?: string;
  soTaiKhoan?: string;
}

export interface DongTien {
  id: string;
  ma: string;
  ten: string;
  loai: 'KINH_DOANH' | 'DAU_TU' | 'TAI_CHINH';
  moTa?: string;
}

export interface ChuDauTu {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

export interface NhomKhuyenMai {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

export interface NhomQuanLy {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}

export interface LoaiGiaoDich {
  id: string;
  ma: string;
  ten: string;
  color?: string;
  moTa?: string;
}

// ===== DANH MỤC DTO (New Backend Structure) =====

export type LoaiChungTu = 'PHIEU_THU' | 'PHIEU_CHI';

// DanhMuc nested types (matching backend DTO)
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

export interface DanhMucLoaiGiaoDich {
  ma: string;
  ten: string;
}

export interface DanhMucLoaiChungTu {
  ma: string;
  ten: string;
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

// Main DanhMuc interface containing all category references
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
  loaiGiaoDich?: DanhMucLoaiGiaoDich;
  loaiChungTu?: DanhMucLoaiChungTu;
  chuDauTu?: DanhMucChuDauTu;
  nhomKhuyenMai?: DanhMucNhomKhuyenMai;
  nhomQuanLy?: DanhMucNhomQuanLy;
}

// Backend response type for ChungTu (taiKhoanNo/taiKhoanCo now inside danhMuc)
export interface ChungTuResponse {
  _id: string;
  soPhieu: string;
  loai: LoaiChungTu;
  ngay: string | Date;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  nguoiTaoId: string;
  ngayTao: string | Date;
  danhMuc?: DanhMuc;
}

// ===== SNAPSHOT INTERFACES (Legacy - kept for backward compatibility) =====

export interface DoiTuongSnapshot {
  id: string;
  ma: string;
  ten: string;
  loai: 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU';
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  maSoThue?: string;
}

export interface DuAnSnapshot {
  id: string;
  ma: string;
  ten: string;
  trangThai: 'DANG_THUC_HIEN' | 'HOAN_THANH' | 'TAM_DUNG';
  chuDauTuId?: string;
  chuDauTuMa?: string;
  chuDauTuTen?: string;
}

export interface BoPhanSnapshot {
  id: string;
  ma: string;
  ten: string;
}

export interface DoiSnapshot {
  id: string;
  ma: string;
  ten: string;
}

export interface NhanVienSnapshot {
  id: string;
  ma: string;
  ten: string;
}

export interface TaiKhoanSnapshot {
  id: string;
  ma: string;
  ten: string;
  loai: 'NO' | 'CO';
  nhom: string;
}

export interface KhoanMucSnapshot {
  id: string;
  ma: string;
  ten: string;
  loai: 'CHI_PHI' | 'DOANH_THU';
  nhom: string;
}

export interface SanPhamSnapshot {
  id: string;
  ma: string;
  ten: string;
  donVi?: string;
  giaBan?: number;
}

export interface DongTienSnapshot {
  id: string;
  ma: string;
  ten: string;
  loai: 'KINH_DOANH' | 'DAU_TU' | 'TAI_CHINH';
}

// ===== CHỨNG TỪ =====

export interface ChungTu {
  id: string;
  soPhieu: string;
  loai: 'PHIEU_THU' | 'PHIEU_CHI';
  ngay: string;
  soTien: number;
  noiDung: string;

  // Legacy ID references (for backward compatibility)
  doiTuongId?: string;
  doiTuong2Id?: string;
  duAnId?: string;
  chuDauTuId?: string;
  boPhanId?: string;
  doiId?: string;
  nhanVienId?: string;
  sanPhamId?: string;
  dongTienId?: string;
  khoanMucId?: string;
  taiKhoanNo: string;
  taiKhoanCo: string;

  // Legacy name fields (for backward compatibility)
  doiTuongTen?: string;
  doiTuong2Ten?: string;
  duAnTen?: string;
  chuDauTuTen?: string;
  boPhanTen?: string;
  doiTen?: string;
  nhanVienTen?: string;
  sanPhamTen?: string;
  dongTienTen?: string;
  khoanMucTen?: string;

  // Snapshot fields
  doiTuongSnapshot?: DoiTuongSnapshot;
  doiTuong2Snapshot?: DoiTuongSnapshot;
  duAnSnapshot?: DuAnSnapshot;
  boPhanSnapshot?: BoPhanSnapshot;
  doiSnapshot?: DoiSnapshot;
  nhanVienSnapshot?: NhanVienSnapshot;
  taiKhoanNoSnapshot?: TaiKhoanSnapshot;
  taiKhoanCoSnapshot?: TaiKhoanSnapshot;
  khoanMucSnapshot?: KhoanMucSnapshot;
  sanPhamSnapshot?: SanPhamSnapshot;
  dongTienSnapshot?: DongTienSnapshot;

  trangThai: 'NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  nguoiTao: string;
  ngayTao: string;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  ghiChu?: string;
}

export interface NhatKyChung {
  id: string;
  ngay: string;
  soPhieu: string;
  loaiChungTu: string;
  dienGiai: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;

  // Display fields extracted from danhMuc
  doiTuong?: string;
  doiTuong2?: string;
  duAn?: string;
  chuDauTu?: string;
  boPhan?: string;
  doi?: string;
  nhanVien?: string;
  sanPham?: string;
  dongTien?: string;

  // Full danhMuc object for detailed views
  danhMuc?: DanhMuc;
}

// ===== SỔ QUỸ =====

export interface SoQuy {
  id: string;
  ngay: string;
  soPhieu: string;
  dienGiai?: string;
  noiDung?: string;
  thu: number;
  chi: number;
  tonSau?: number;
  soDu?: number;
}

// ===== CÔNG NỢ =====

export interface CongNo {
  id?: string;
  _id?: string;
  loai: 'PHAI_THU' | 'PHAI_TRA';
  doiTuongId: string;
  doiTuongTen?: string;
  soTienGoc: number;
  daThu: number;
  conLai: number;
  ngayPhatSinh?: string;
  hanThanhToan?: string;
  trangThai: 'CHUA_THU' | 'DA_THU_MOT_PHAN' | 'DA_THU_DU';
}

// ===== QUY CHUẨN HẠCH TOÁN =====

export interface QuyChuan {
  id: string;
  loaiGiaoDich: string;
  nghiepVu: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  moTa?: string;
}

// ===== BÁO CÁO =====

export interface BaoCaoPnL {
  khoanMuc: string;
  thangTruoc: number;
  thangNay: number;
  luyKe: number;
  keHoach: number;
  chenhLech: number;
}

export interface SoCai {
  ngay: string;
  soPhieu: string;
  dienGiai: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
}

// ===== USER & PHÂN QUYỀN =====

export type VaiTro = 'ADMIN' | 'GIAM_DOC' | 'KE_TOAN_TRUONG' | 'KE_TOAN_QUY' | 'KE_TOAN_CONG_NO' | 'KE_TOAN_TONG_HOP' | 'MANAGER' | 'KIEM_SOAT';

export interface NguoiDung {
  id: string;
  hoTen: string;
  email: string;
  vaiTro: VaiTro;
  trangThai: 'HOAT_DONG' | 'KHOA';
}

// ===== DASHBOARD =====

export interface ThongKeTongQuan {
  soDuQuy: number;
  doanhThuThang: number;
  chiPhiThang: number;
  loiNhuanThang: number;
  congNoPhaiThu: number;
  congNoPhaiTra: number;
  soChungTuChoXuLy: number;
}

export interface BieuDoThuChi {
  thang: string;
  thu: number;
  chi: number;
}
