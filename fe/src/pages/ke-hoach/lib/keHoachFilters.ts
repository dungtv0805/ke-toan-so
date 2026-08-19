import type { Dayjs } from "dayjs";
import type { KeHoachFilters, LoaiKeHoach } from "@/services/keHoachService";

/**
 * Tiêu chí lọc của màn hình Kế hoạch / Dự báo — mỗi tiêu chí = 1 state trên handler ↔
 * 1 query param gửi lên voucher-service. Bố cục bám đúng "Dữ liệu tổng hợp": dropdown
 * lọc nằm ở HEADER CỘT chứ không bày hết trên hàng lọc.
 */
export const KE_HOACH_FILTER_PARAMS = {
  filterNghiepVu: "nghiepVu",
  filterTaiKhoanNo: "taiKhoanNo",
  filterTaiKhoanCo: "taiKhoanCo",
  filterDoiTuong: "doiTuong",
  filterChuDauTu: "chuDauTu",
  filterDuAn: "duAn",
  filterSanPham: "sanPham",
  filterBoPhan: "boPhan",
  filterDoi: "doi",
  filterNhanVien: "nhanVien",
  filterDongTien: "dongTien",
  filterKhoanMuc: "khoanMuc",
  filterNhomQuanLy: "nhomQuanLy",
} as const satisfies Record<string, keyof KeHoachFilters>;

export type KeHoachFilterStateKey = keyof typeof KE_HOACH_FILTER_PARAMS;

export const KE_HOACH_FILTER_STATE_KEYS = Object.keys(
  KE_HOACH_FILTER_PARAMS,
) as KeHoachFilterStateKey[];

export const KE_HOACH_FILTER_LABELS: Record<KeHoachFilterStateKey, string> = {
  filterNghiepVu: "Nghiệp vụ",
  filterTaiKhoanNo: "TK Nợ",
  filterTaiKhoanCo: "TK Có",
  filterDoiTuong: "Đối tượng",
  filterChuDauTu: "Chủ đầu tư",
  filterDuAn: "Dự án",
  filterSanPham: "Sản phẩm",
  filterBoPhan: "Bộ phận",
  filterDoi: "Đội",
  filterNhanVien: "Nhân viên",
  filterDongTien: "Dòng tiền",
  filterKhoanMuc: "Khoản mục",
  filterNhomQuanLy: "Nhóm quản lý",
};

/**
 * Cột của lưới → tiêu chí lọc gắn vào header cột đó. Cột không có mặt ở đây thì không
 * có nút lọc (BE chưa có tham số tương ứng; lọc phía client chỉ lọc trong 1 trang nên
 * gây hiểu nhầm) — cùng quy ước với `NKC_COLUMN_FILTER_KEYS`.
 */
export const KE_HOACH_COLUMN_FILTER_KEYS: Record<string, KeHoachFilterStateKey> = {
  nghiepVu: "filterNghiepVu",
  taiKhoanNo: "filterTaiKhoanNo",
  taiKhoanCo: "filterTaiKhoanCo",
  // Tham số `doiTuong` của BE khớp cả đối tượng Nợ lẫn đối tượng Có.
  doiTuong: "filterDoiTuong",
  doiTuong2: "filterDoiTuong",
  chuDauTu: "filterChuDauTu",
  duAn: "filterDuAn",
  sanPham: "filterSanPham",
  boPhan: "filterBoPhan",
  doi: "filterDoi",
  nhanVien: "filterNhanVien",
  dongTien: "filterDongTien",
  khoanMuc: "filterKhoanMuc",
  nhomQuanLy: "filterNhomQuanLy",
};

/**
 * Gom bộ lọc hiện hành từ state — dùng chung cho lưới nhập liệu và báo cáo so sánh
 * để hai bên không bao giờ lệch điều kiện.
 */
export function buildFilters(get: (key: string) => unknown): KeHoachFilters {
  const range = get("dateRange") as [Dayjs, Dayjs] | undefined;
  const phienBan = get("phienBan") as string | undefined;
  const search = get("searchText") as string | undefined;

  const filters: KeHoachFilters = {
    loaiKeHoach: (get("loaiKeHoach") as LoaiKeHoach) || "KE_HOACH",
    ...(phienBan ? { phienBan } : {}),
    ...(search ? { search } : {}),
    ...(range?.[0] ? { startDate: range[0].format("YYYY-MM-DD") } : {}),
    ...(range?.[1] ? { endDate: range[1].format("YYYY-MM-DD") } : {}),
  };

  for (const stateKey of KE_HOACH_FILTER_STATE_KEYS) {
    const value = get(stateKey);
    if (value) {
      (filters as Record<string, unknown>)[KE_HOACH_FILTER_PARAMS[stateKey]] = value;
    }
  }

  return filters;
}
