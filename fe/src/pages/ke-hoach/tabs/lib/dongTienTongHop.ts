/**
 * Năm dòng tổng hợp của bảng kế hoạch dòng tiền — tính khi đọc, không lưu.
 *
 * Thuần, không đụng React.
 */

import { SO_THANG } from './tongHop';

export type ChieuDongTien = 'THU' | 'CHI';

/** Phần một dòng chi tiết đóng góp vào các dòng tổng hợp. */
export interface DongTienChiTiet {
  chieu: ChieuDongTien;
  thang: number[];
}

export interface TongHopDongTien {
  /** Tồn đầu mỗi tháng. T1 là tồn đầu năm; T2 trở đi là tồn cuối tháng trước. */
  tonDau: number[];
  thu: number[];
  chi: number[];
  /** Tồn đầu + Thu − Chi. */
  tonCuoi: number[];
  /** Thu − Chi. */
  thangDu: number[];
}

const mang12 = (thang: number[] = []): number[] =>
  Array.from({ length: SO_THANG }, (_, i) => Number(thang[i]) || 0);

export function tinhTongHopDongTien(
  dong: DongTienChiTiet[],
  tonDauNam: number,
): TongHopDongTien {
  const thu = mang12([]);
  const chi = mang12([]);

  for (const d of dong) {
    const t = mang12(d.thang);
    const dich = d.chieu === 'CHI' ? chi : thu;
    for (let i = 0; i < SO_THANG; i += 1) dich[i] += t[i];
  }

  const tonDau = mang12([]);
  const tonCuoi = mang12([]);
  const thangDu = mang12([]);

  // Tồn cuộn qua từng tháng: tồn đầu T(n) là tồn cuối T(n-1).
  let dauKy = Number(tonDauNam) || 0;
  for (let i = 0; i < SO_THANG; i += 1) {
    tonDau[i] = dauKy;
    thangDu[i] = thu[i] - chi[i];
    tonCuoi[i] = dauKy + thangDu[i];
    dauKy = tonCuoi[i];
  }

  return { tonDau, thu, chi, tonCuoi, thangDu };
}

/**
 * Quý của dòng TỒN ĐẦU KỲ: lấy tháng ĐẦU quý.
 *
 * Số dư không cộng dồn được — cộng ba tháng tồn đầu lại sẽ ra một con số vô
 * nghĩa gấp ba lần thực tế.
 */
export const quyTuSoDuDau = (thang: number[]): number[] =>
  [0, 1, 2, 3].map((q) => Number(thang[q * 3]) || 0);

/** Quý của dòng TỒN CUỐI KỲ: lấy tháng CUỐI quý. Cùng lý do như trên. */
export const quyTuSoDuCuoi = (thang: number[]): number[] =>
  [0, 1, 2, 3].map((q) => Number(thang[q * 3 + 2]) || 0);
