import {
  DanhMuc,
  DoiTuong,
  DuAn,
  BoPhan,
  SanPham,
  DongTien,
  NhomKhuyenMai,
  NhomQuanLy,
  KhoanMuc,
  HopDong,
} from "@/types";
import {
  buildDoiTuongSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildDoiSnapshot,
  buildNhanVienSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
  buildKhoanMucSnapshot,
  buildNhomKhuyenMaiSnapshot,
  buildNhomQuanLySnapshot,
  buildHopDongSnapshot,
} from "@/utils/snapshotBuilder";

export interface TaiKhoanLite {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

/** Các bản ghi master data đã khớp xong cho 1 dòng. */
export interface ResolvedRow {
  taiKhoanNo: TaiKhoanLite;
  taiKhoanCo: TaiKhoanLite;
  loaiGiaoDich: { ma: string; ten: string };
  nghiepVu: string;
  nghiepVuTen?: string;
  doiTuong?: DoiTuong;
  doiTuong2?: DoiTuong;
  duAn?: DuAn;
  boPhan?: BoPhan;
  doi?: BoPhan;
  nhanVien?: DoiTuong;
  sanPham?: SanPham;
  dongTien?: DongTien;
  khoanMuc?: KhoanMuc;
  hopDong?: HopDong;
  nhomKhuyenMai?: NhomKhuyenMai;
  nhomQuanLy?: NhomQuanLy;
}

export function buildDanhMucFromResolved(r: ResolvedRow): DanhMuc {
  const danhMuc: DanhMuc = {};

  danhMuc.taiKhoanNo = { ...r.taiKhoanNo };
  danhMuc.taiKhoanCo = { ...r.taiKhoanCo };
  danhMuc.loaiGiaoDich = { ...r.loaiGiaoDich };
  danhMuc.nghiepVu = { ma: r.nghiepVu, ten: r.nghiepVuTen || r.nghiepVu };

  if (r.doiTuong) danhMuc.doiTuong = buildDoiTuongSnapshot(r.doiTuong) as DanhMuc["doiTuong"];
  if (r.doiTuong2) danhMuc.doiTuong2 = buildDoiTuongSnapshot(r.doiTuong2) as DanhMuc["doiTuong2"];
  if (r.duAn) danhMuc.duAn = buildDuAnSnapshot(r.duAn) as DanhMuc["duAn"];
  if (r.boPhan) danhMuc.boPhan = buildBoPhanSnapshot(r.boPhan) as DanhMuc["boPhan"];
  if (r.doi) danhMuc.doi = buildDoiSnapshot(r.doi) as DanhMuc["doi"];
  if (r.nhanVien) danhMuc.nhanVien = buildNhanVienSnapshot(r.nhanVien) as DanhMuc["nhanVien"];
  if (r.sanPham) danhMuc.sanPham = buildSanPhamSnapshot(r.sanPham) as DanhMuc["sanPham"];
  if (r.dongTien) danhMuc.dongTien = buildDongTienSnapshot(r.dongTien) as DanhMuc["dongTien"];
  if (r.khoanMuc) danhMuc.khoanMuc = buildKhoanMucSnapshot(r.khoanMuc) as DanhMuc["khoanMuc"];
  if (r.hopDong) danhMuc.hopDong = buildHopDongSnapshot(r.hopDong) as unknown as DanhMuc["hopDong"];
  if (r.nhomKhuyenMai) danhMuc.nhomKhuyenMai = buildNhomKhuyenMaiSnapshot(r.nhomKhuyenMai) as DanhMuc["nhomKhuyenMai"];
  if (r.nhomQuanLy) danhMuc.nhomQuanLy = buildNhomQuanLySnapshot(r.nhomQuanLy) as DanhMuc["nhomQuanLy"];

  return danhMuc;
}
