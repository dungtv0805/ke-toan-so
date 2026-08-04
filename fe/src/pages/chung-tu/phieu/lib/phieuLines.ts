import type { DanhMuc } from "@/types";

/** Một dòng hạch toán hiển thị trên phiếu in. */
export interface PhieuLine {
  dienGiai: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
}

/**
 * Bản ghi thô từ API. Hai màn dùng hai kiểu khác nhau:
 * `ChungTu` để diễn giải ở `noiDung` + tài khoản trong `danhMuc`,
 * `NhatKyChung` để ở `dienGiai` + tài khoản đã trải phẳng ra top-level.
 */
export interface PhieuLineSource {
  noiDung?: string;
  dienGiai?: string;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  soTien?: number;
  danhMuc?: DanhMuc;
}

/** Chuẩn hoá các bản ghi cùng một số phiếu thành danh sách dòng để in. */
export function toPhieuLines(
  records: ReadonlyArray<PhieuLineSource>
): PhieuLine[] {
  return records.map((r) => ({
    dienGiai: r.dienGiai || r.noiDung || "",
    taiKhoanNo: r.taiKhoanNo || r.danhMuc?.taiKhoanNo?.ma || "",
    taiKhoanCo: r.taiKhoanCo || r.danhMuc?.taiKhoanCo?.ma || "",
    soTien: r.soTien ?? 0,
  }));
}
