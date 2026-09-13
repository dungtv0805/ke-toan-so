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

/** Một cột kỳ của bảng: khoảng tháng [tu, den), chỉ số 0 là T1. */
export interface CotKy {
  key: string;
  title: string;
  tu: number;
  den: number;
}

const SO_LA_MA_QUY = ["I", "II", "III", "IV"];

/**
 * Bộ cột kỳ dùng chung cho MỌI bảng P&L (một lớp lẫn so sánh ba lớp): đi từ
 * RỘNG tới HẸP — cả năm → 6 tháng → quý → tháng. Mở bảng ra là thấy ngay bức
 * tranh cả năm, muốn soi chi tiết thì vuốt dần sang phải.
 */
export const COT_KY: CotKy[] = [
  { key: "nam", title: "Cả năm", tu: 0, den: 12 },
  { key: "s1", title: "6 tháng đầu", tu: 0, den: 6 },
  { key: "s2", title: "6 tháng cuối", tu: 6, den: 12 },
  ...[0, 1, 2, 3].map((q) => ({
    key: `q${q + 1}`,
    title: `QUÝ ${SO_LA_MA_QUY[q]}`,
    tu: q * 3,
    den: q * 3 + 3,
  })),
  ...Array.from({ length: 12 }, (_, t) => ({
    key: `t${t + 1}`,
    title: `T${t + 1}`,
    tu: t,
    den: t + 1,
  })),
];

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

/**
 * Cột "%DS": tỷ lệ trên DOANH THU THUẦN CỦA CHÍNH KỲ ĐÓ.
 *
 * Cố ý không chia cho doanh thu cả năm: mỗi cột là một kỳ độc lập, chia cho cả
 * năm thì tháng nào cũng ra con số bé tí, không so được giữa các tháng.
 *
 * `null` khi kỳ đó chưa có doanh thu — không chia được.
 */
export function tyLeTrenDoanhThu(
  giaTri: number,
  doanhThuThang: number[],
  tu: number,
  den: number,
): number | null {
  const doanhThu = congKhoang(doanhThuThang, tu, den);
  if (doanhThu === 0) return null;
  return giaTri / doanhThu;
}

/**
 * Cột "Tỷ trọng": tỷ lệ trên DÒNG CHA trong cùng kỳ — các dòng con của một mục
 * cộng lại đúng 100%. Dòng không có cha là gốc của nhóm bên dưới nên bằng 100%.
 *
 * Dòng KHÔNG PHÁT SINH trả `null` chứ không phải 100%: cột toàn "100,0%" nằm
 * cạnh ô số tiền để trống thì vô nghĩa và gây hiểu nhầm là có phát sinh.
 */
export function tyLeTrenCha(
  giaTri: number,
  chaThang: number[] | undefined,
  tu: number,
  den: number,
): number | null {
  if (giaTri === 0) return null;
  if (!chaThang) return 1;
  const mauSo = congKhoang(chaThang, tu, den);
  if (mauSo === 0) return null;
  return giaTri / mauSo;
}
