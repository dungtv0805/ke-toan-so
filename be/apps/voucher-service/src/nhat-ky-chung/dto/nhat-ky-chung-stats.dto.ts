export interface NhatKyChungStats {
  tongSo: number;
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  /** Tổng giá trị (cộng soTien) của các bút toán khớp bộ lọc. */
  tongGiaTri: number;
}

export interface NhatKyChungStatsResponse {
  success: boolean;
  data: NhatKyChungStats;
}
