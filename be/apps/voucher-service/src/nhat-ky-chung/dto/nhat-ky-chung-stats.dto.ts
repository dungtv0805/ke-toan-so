/** Một nhóm trạng thái kiểm soát: số lượng bút toán + tổng giá trị của nhóm đó. */
export interface KiemSoatBucket {
  soLuong: number;
  giaTri: number;
}

export interface NhatKyChungStats {
  tongSo: number;
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  /** Tổng giá trị (cộng soTien) của các bút toán khớp bộ lọc. */
  tongGiaTri: number;
  /**
   * Bóc tách theo trạng thái kiểm soát (`kiemSoat.trangThai`). Bút toán chưa được
   * kiểm soát (không có `kiemSoat`, hoặc trạng thái lạ) rơi vào `chuaKiemSoat`, nên
   * 4 nhóm cộng lại luôn đúng bằng `tongSo` / `tongGiaTri`.
   */
  hopLe: KiemSoatBucket;
  chuaHopLe: KiemSoatBucket;
  /** `KHONG_DUOC_TRU` — chi phí không được trừ, người dùng gọi là "không hợp lệ". */
  khongHopLe: KiemSoatBucket;
  chuaKiemSoat: KiemSoatBucket;
}

export interface NhatKyChungStatsResponse {
  success: boolean;
  data: NhatKyChungStats;
}
