import { GetEntriesParams } from "@/services/nhatKyChungService";

/**
 * Các tiêu chí lọc của màn hình "Dữ liệu tổng hợp" (hàng lọc trên cùng).
 * Mỗi tiêu chí = 1 state trên handler ↔ 1 query param gửi lên voucher-service.
 * Nguồn duy nhất — handler dựng params, component render dropdown, persistence lưu
 * đều đọc từ đây để không lệch nhau khi thêm tiêu chí mới.
 */
export const NKC_FILTER_PARAMS = {
  filterKiemSoat: "kiemSoat",
  filterLoaiChungTu: "loai",
  filterNghiepVu: "nghiepVu",
  filterTaiKhoan: "taiKhoan",
  filterDoiTuong: "doiTuong",
  filterKhoanMuc: "khoanMuc",
  filterNhanVien: "nhanVien",
  filterDuAn: "duAn",
  filterSanPham: "sanPham",
  filterHopDong: "hopDong",
  filterNguoiGiaoDich: "nguoiGiaoDich",
  filterDoi: "doi",
  filterBoPhan: "boPhan",
  filterNhomKhuyenMai: "nhomKhuyenMai",
  // Lọc TK Nợ / TK Có riêng — không nằm trên hàng lọc nhưng vẫn dùng khi mở trang
  // từ chỗ khác (drill-down) nên phải gộp vào params.
  filterAccount: "taiKhoanNo",
  filterTaiKhoanCo: "taiKhoanCo",
} as const satisfies Record<string, keyof GetEntriesParams>;

export type NkcFilterStateKey = keyof typeof NKC_FILTER_PARAMS;

export const NKC_FILTER_STATE_KEYS = Object.keys(
  NKC_FILTER_PARAMS,
) as NkcFilterStateKey[];

/** Nhãn hiển thị (placeholder) của từng tiêu chí trên hàng lọc. */
export const NKC_FILTER_LABELS: Record<NkcFilterStateKey, string> = {
  filterKiemSoat: "Trạng thái kiểm soát",
  filterLoaiChungTu: "Loại giao dịch",
  filterNghiepVu: "Nghiệp vụ",
  filterTaiKhoan: "Tài khoản",
  filterDoiTuong: "Đối tượng",
  filterKhoanMuc: "Khoản mục",
  filterNhanVien: "Nhân viên",
  filterDuAn: "Dự án",
  filterSanPham: "Sản phẩm",
  filterHopDong: "Hợp đồng",
  filterNguoiGiaoDich: "Người giao dịch",
  filterDoi: "Đội",
  filterBoPhan: "Bộ phận",
  filterNhomKhuyenMai: "Nhóm KM",
  filterAccount: "TK Nợ",
  filterTaiKhoanCo: "TK Có",
};

/** Thứ tự các dropdown trên hàng lọc — đúng theo tài liệu cải tiến. */
export const NKC_FILTER_BAR_KEYS: NkcFilterStateKey[] = [
  "filterKiemSoat",
  "filterLoaiChungTu",
  "filterNghiepVu",
  "filterTaiKhoan",
  "filterDoiTuong",
  "filterKhoanMuc",
  "filterNhanVien",
  "filterDuAn",
  "filterSanPham",
  "filterHopDong",
  "filterNguoiGiaoDich",
  "filterDoi",
  "filterBoPhan",
  "filterNhomKhuyenMai",
];

/**
 * Cột của bảng bút toán → tiêu chí lọc gắn vào header cột đó.
 * Cột "Mã" và cột "Tên" của cùng một danh mục dùng CHUNG một tiêu chí — bấm ở đâu cũng
 * ra cùng popover. Cột không có mặt ở đây thì không có nút lọc (BE chưa có tham số lọc;
 * lọc phía client sẽ chỉ lọc trong 1 trang 100 dòng nên gây hiểu nhầm).
 */
export const NKC_COLUMN_FILTER_KEYS: Record<string, NkcFilterStateKey> = {
  kiemSoat: "filterKiemSoat",
  loaiGiaoDich: "filterLoaiChungTu",
  nghiepVu: "filterNghiepVu",
  taiKhoanNo: "filterAccount",
  taiKhoanCo: "filterTaiKhoanCo",
  // Tham số `doiTuong` của BE khớp cả đối tượng Nợ lẫn đối tượng Có.
  doiTuongMa: "filterDoiTuong",
  doiTuong: "filterDoiTuong",
  doiTuong2Ma: "filterDoiTuong",
  doiTuong2: "filterDoiTuong",
  khoanMucMa: "filterKhoanMuc",
  khoanMuc: "filterKhoanMuc",
  nhanVienMa: "filterNhanVien",
  nhanVien: "filterNhanVien",
  duAnMa: "filterDuAn",
  duAn: "filterDuAn",
  sanPhamMa: "filterSanPham",
  sanPham: "filterSanPham",
  hopDongSo: "filterHopDong",
  hopDong: "filterHopDong",
  doiMa: "filterDoi",
  doi: "filterDoi",
  boPhanMa: "filterBoPhan",
  boPhan: "filterBoPhan",
  nhomKhuyenMaiMa: "filterNhomKhuyenMai",
  nhomKhuyenMai: "filterNhomKhuyenMai",
  nguoiGiaoDich: "filterNguoiGiaoDich",
};

export const KIEM_SOAT_OPTIONS = [
  { value: "HOP_LE", label: "Hợp lệ" },
  { value: "CHUA_HOP_LE", label: "Chưa hợp lệ" },
  { value: "KHONG_DUOC_TRU", label: "Không được trừ" },
  { value: "CHUA_KIEM_SOAT", label: "Chưa kiểm soát" },
];
