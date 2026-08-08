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

export const KIEM_SOAT_OPTIONS = [
  { value: "HOP_LE", label: "Hợp lệ" },
  { value: "CHUA_HOP_LE", label: "Chưa hợp lệ" },
  { value: "KHONG_DUOC_TRU", label: "Không được trừ" },
  { value: "CHUA_KIEM_SOAT", label: "Chưa kiểm soát" },
];
