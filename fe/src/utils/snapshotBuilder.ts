import {
  DoiTuong,
  DuAn,
  BoPhan,
  TaiKhoan,
  KhoanMuc,
  SanPham,
  DongTien,
  NhomKhuyenMai,
  NhomQuanLy,
  DoiTuongSnapshot,
  DuAnSnapshot,
  BoPhanSnapshot,
  DoiSnapshot,
  NhanVienSnapshot,
  TaiKhoanSnapshot,
  KhoanMucSnapshot,
  SanPhamSnapshot,
  DongTienSnapshot,
  DanhMucNhomKhuyenMai,
  DanhMucNhomQuanLy,
} from '@/types';

/**
 * Build DoiTuongSnapshot from DoiTuong master data
 */
export const buildDoiTuongSnapshot = (doiTuong: DoiTuong): DoiTuongSnapshot => ({
  id: doiTuong.id,
  ma: doiTuong.ma,
  ten: doiTuong.ten,
  loai: doiTuong.loai,
  diaChi: doiTuong.diaChi,
  soDienThoai: doiTuong.soDienThoai,
  email: doiTuong.email,
  maSoThue: doiTuong.maSoThue,
});

/**
 * Build DuAnSnapshot from DuAn master data
 */
export const buildDuAnSnapshot = (duAn: DuAn): DuAnSnapshot => ({
  id: duAn.id,
  ma: duAn.ma,
  ten: duAn.ten,
  trangThai: duAn.trangThai,
  chuDauTuId: duAn.chuDauTuId,
  chuDauTuMa: duAn.chuDuAnMa,
  chuDauTuTen: duAn.chuDuAn, // chuDuAn is the investor name field
});

/**
 * Build BoPhanSnapshot from BoPhan master data
 */
export const buildBoPhanSnapshot = (boPhan: BoPhan): BoPhanSnapshot => ({
  id: boPhan.id,
  ma: boPhan.ma,
  ten: boPhan.ten,
});

/**
 * Build DoiSnapshot from BoPhan master data (Đội is a type of BoPhan)
 */
export const buildDoiSnapshot = (doi: BoPhan): DoiSnapshot => ({
  id: doi.id,
  ma: doi.ma,
  ten: doi.ten,
});


/**
 * Build NhanVienSnapshot from DoiTuong master data (NhanVien is a type of DoiTuong)
 */
export const buildNhanVienSnapshot = (nhanVien: DoiTuong): NhanVienSnapshot => ({
  id: nhanVien.id,
  ma: nhanVien.ma,
  ten: nhanVien.ten,
});

/**
 * Build TaiKhoanSnapshot from TaiKhoan master data
 */
export const buildTaiKhoanSnapshot = (taiKhoan: TaiKhoan): TaiKhoanSnapshot => ({
  id: taiKhoan.id,
  ma: taiKhoan.ma,
  ten: taiKhoan.ten,
  loai: taiKhoan.loai,
  nhom: taiKhoan.nhom,
});

/**
 * Build KhoanMucSnapshot from KhoanMuc master data
 */
export const buildKhoanMucSnapshot = (khoanMuc: KhoanMuc): KhoanMucSnapshot => ({
  id: khoanMuc.id,
  ma: khoanMuc.ma,
  ten: khoanMuc.ten,
  loai: khoanMuc.loai,
  nhom: khoanMuc.nhom,
});

/**
 * Build SanPhamSnapshot from SanPham master data
 */
export const buildSanPhamSnapshot = (sanPham: SanPham): SanPhamSnapshot => ({
  id: sanPham.id,
  ma: sanPham.ma,
  ten: sanPham.ten,
  donVi: sanPham.donVi,
  giaBan: sanPham.giaBan,
});

/**
 * Build DongTienSnapshot from DongTien master data
 */
export const buildDongTienSnapshot = (dongTien: DongTien): DongTienSnapshot => ({
  id: dongTien.id,
  ma: dongTien.ma,
  ten: dongTien.ten,
  loai: dongTien.loai,
});


/**
 * Build NhomKhuyenMaiSnapshot from NhomKhuyenMai master data
 */
export const buildNhomKhuyenMaiSnapshot = (nhomKhuyenMai: NhomKhuyenMai): DanhMucNhomKhuyenMai => ({
  ma: nhomKhuyenMai.ma,
  ten: nhomKhuyenMai.ten,
});

/**
 * Build NhomQuanLySnapshot from NhomQuanLy master data
 */
export const buildNhomQuanLySnapshot = (nhomQuanLy: NhomQuanLy): DanhMucNhomQuanLy => ({
  ma: nhomQuanLy.ma,
  ten: nhomQuanLy.ten,
});
