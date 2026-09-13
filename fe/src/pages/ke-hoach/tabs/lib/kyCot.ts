/**
 * Phép tính theo KỲ dùng chung cho hai bảng P&L: bảng P&L một lớp (tab KQKD của
 * Kế hoạch / Dự báo, và trang P&L Thực hiện) và bảng P&L so sánh ba lớp.
 *
 * Hai bảng có cùng bộ cột kỳ (Năm · 6 tháng đầu/cuối · 4 quý · 12 tháng) nên
 * phải cùng một định nghĩa "kỳ" — để riêng mỗi bên một bản là sớm muộn cũng
 * lệch nhau ở đúng chỗ khó thấy nhất.
 */

/** Ép về số: BE có thể trả `null`/thiếu phần tử cho tháng chưa phát sinh. */
export const so = (v?: number) => Number(v) || 0;

/** Tổng của dãy 12 tháng trong khoảng [tu, den) — chỉ số 0 là T1. */
export function congKhoang(thang: number[] = [], tu: number, den: number): number {
  let tong = 0;
  for (let i = tu; i < den; i++) tong += so(thang[i]);
  return tong;
}

/** Bốn quý, mỗi quý là khoảng ba tháng: [0,3) [3,6) [6,9) [9,12). */
export const KHOANG_QUY: [number, number][] = [
  [0, 3],
  [3, 6],
  [6, 9],
  [9, 12],
];

/**
 * Doanh thu hòa vốn = tổng định phí / (1 − tổng biến phí / doanh thu thuần).
 *
 * Tính cho MỘT kỳ (một khoảng tháng), không cộng dồn được từ các kỳ nhỏ hơn:
 * nó là tỷ số nên hòa vốn cả năm khác tổng hòa vốn 12 tháng.
 *
 * Trả 0 khi không xác định được — doanh thu bằng 0, hoặc biến phí đã ăn hết
 * doanh thu (tỷ lệ số dư đảm phí ≤ 0, bán bao nhiêu cũng không hòa vốn). Cột
 * hiển thị vẽ số 0 thành dấu gạch ngang, đúng ý "chưa có số".
 */
export function hoaVon(dinhPhi: number, bienPhi: number, doanhThu: number): number {
  if (doanhThu <= 0) return 0;
  const tyLeSoDuDamPhi = 1 - bienPhi / doanhThu;
  if (tyLeSoDuDamPhi <= 0) return 0;
  return dinhPhi / tyLeSoDuDamPhi;
}

/** Ba dãy 12 tháng làm nguyên liệu cho dòng hòa vốn của MỘT lớp số liệu. */
export interface NguonHoaVon {
  doanhThuThuanThang: number[];
  dinhPhiThang: number[];
  bienPhiThang: number[];
}

/** Hòa vốn của một kỳ: cộng ba dãy trong đúng khoảng đó rồi mới lấy tỷ số. */
export const hoaVonKhoang = (n: NguonHoaVon, tu: number, den: number): number =>
  hoaVon(
    congKhoang(n.dinhPhiThang, tu, den),
    congKhoang(n.bienPhiThang, tu, den),
    congKhoang(n.doanhThuThuanThang, tu, den),
  );
