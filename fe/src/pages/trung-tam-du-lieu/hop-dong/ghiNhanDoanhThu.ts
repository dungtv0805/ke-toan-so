import type { NhatKyChung } from '@/types';

/** TK doanh thu đã thực hiện — dòng Có 511* là một lần ghi nhận doanh thu. */
export const TK_DOANH_THU = '511';
/** TK doanh thu chưa thực hiện — số dư Có 3387* là phần chưa ghi nhận. */
export const TK_CHUA_THUC_HIEN = '3387';

const isTk = (ma: string | undefined, prefix: string) => Boolean(ma?.startsWith(prefix));

const sum = (list: NhatKyChung[]) => list.reduce((s, e) => s + (Number(e.soTien) || 0), 0);

export interface DoanhThuHopDong {
  /** Các dòng Có 511 — mỗi dòng là một lần ghi nhận doanh thu. */
  ghiNhan: NhatKyChung[];
  /** Tổng doanh thu đã ghi nhận (Có 511). */
  daGhiNhan: number;
  /** Số dư 3387 còn treo = Có 3387 − Nợ 3387. Âm thì trả 0. */
  chuaGhiNhan: number;
}

/**
 * Tách các dòng hạch toán của một đơn hàng thành phần đã / chưa ghi nhận doanh thu.
 * Chỉ đọc, không phụ thuộc thứ tự chứng từ.
 */
export function tinhDoanhThuHopDong(entries: NhatKyChung[]): DoanhThuHopDong {
  const ghiNhan = entries.filter((e) => isTk(e.taiKhoanCo, TK_DOANH_THU));
  const treoCo = entries.filter((e) => isTk(e.taiKhoanCo, TK_CHUA_THUC_HIEN));
  const treoNo = entries.filter((e) => isTk(e.taiKhoanNo, TK_CHUA_THUC_HIEN));

  return {
    ghiNhan,
    daGhiNhan: sum(ghiNhan),
    chuaGhiNhan: Math.max(0, sum(treoCo) - sum(treoNo)),
  };
}
