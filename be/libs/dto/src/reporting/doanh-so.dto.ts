export type DoanhSoGroupBy = 'ngay' | 'thang' | 'quy' | 'nam';

export interface DoanhSoThoiGianPoint {
  /** Nhãn kỳ, ví dụ 'T3/2026' hoặc 'Q1/2026'. */
  ky: string;
  kyNay: number;
  /** Doanh số cùng kỳ năm trước, khớp theo vị trí thứ tự kỳ. */
  cungKy: number;
}

export interface DoanhSoChieuRow {
  ten: string;
  soTien: number;
}

export interface DoanhSoTheoResult {
  theoThoiGian: DoanhSoThoiGianPoint[];
  theoChieu: DoanhSoChieuRow[];
  tong: number;
  tongCungKy: number;
}
