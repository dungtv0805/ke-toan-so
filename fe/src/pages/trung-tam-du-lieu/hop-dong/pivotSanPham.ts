/** Khoá hàng gom các đóng góp không xác định được sản phẩm. */
export const KEY_CHUA_PHAN_LOAI = '__CHUA_PHAN_LOAI__';
/** Khoá hàng gom các đóng góp không biết rơi vào tháng nào (đơn cũ thiếu ngày ký). */
export const KEY_KHONG_RO_THANG = '__KHONG_RO_THANG__';

/** Một khoản tiền đóng góp vào ô (sản phẩm × tháng). */
export interface DongGopPivot {
  /** Khoá gom — id/mã sản phẩm; luôn là mã, không phải tên. */
  key: string;
  ten: string;
  /** Chỉ số tháng 0–11; `null` hoặc ngoài khoảng nghĩa là không biết tháng. */
  thang: number | null;
  soTien: number;
}

export interface HangPivot {
  key: string;
  ten: string;
  /** 12 tháng. */
  thang: number[];
  caNam: number;
  hk1: number;
  hk2: number;
  /** 4 quý. */
  quy: number[];
}

export interface KetQuaPivot {
  hang: HangPivot[];
  tong: HangPivot;
}

const hangRong = (key: string, ten: string): HangPivot => ({
  key,
  ten,
  thang: Array(12).fill(0) as number[],
  caNam: 0,
  hk1: 0,
  hk2: 0,
  quy: [0, 0, 0, 0],
});

const cong = (thang: number[], tu: number, den: number) =>
  thang.slice(tu, den + 1).reduce((s, x) => s + x, 0);

/** Hai hàng đặc biệt luôn nằm cuối bảng, phần còn lại xếp theo tên. */
const thuTu = (key: string) =>
  key === KEY_KHONG_RO_THANG ? 2 : key === KEY_CHUA_PHAN_LOAI ? 1 : 0;

/**
 * Gom các khoản tiền thành bảng sản phẩm × tháng, kèm cột cả năm / nửa năm / quý.
 *
 * Đóng góp không biết tháng dồn vào một hàng riêng chỉ có cột "Cả năm" — nhờ vậy với
 * mọi hàng sản phẩm bình thường thì "Cả năm" luôn đúng bằng tổng 12 tháng, đọc bảng
 * không bị hụt hẫng.
 */
export function pivotTheoThang(items: DongGopPivot[]): KetQuaPivot {
  const map = new Map<string, HangPivot>();

  for (const it of items) {
    if (!it.soTien) continue;
    const roThang = it.thang != null && it.thang >= 0 && it.thang <= 11;
    const key = roThang ? it.key : KEY_KHONG_RO_THANG;
    const ten = roThang ? it.ten : 'Không rõ tháng';

    const cur = map.get(key) ?? hangRong(key, ten);
    if (roThang) cur.thang[it.thang as number] += it.soTien;
    else cur.caNam += it.soTien;
    map.set(key, cur);
  }

  const hang = [...map.values()];
  for (const h of hang) {
    if (h.key !== KEY_KHONG_RO_THANG) h.caNam = cong(h.thang, 0, 11);
    h.hk1 = cong(h.thang, 0, 5);
    h.hk2 = cong(h.thang, 6, 11);
    h.quy = [0, 1, 2, 3].map((q) => cong(h.thang, q * 3, q * 3 + 2));
  }

  hang.sort((a, b) => thuTu(a.key) - thuTu(b.key) || a.ten.localeCompare(b.ten, 'vi'));

  const tong = hangRong('__TONG__', 'TỔNG');
  for (const h of hang) {
    h.thang.forEach((v, i) => {
      tong.thang[i] += v;
    });
    tong.caNam += h.caNam;
  }
  tong.hk1 = cong(tong.thang, 0, 5);
  tong.hk2 = cong(tong.thang, 6, 11);
  tong.quy = [0, 1, 2, 3].map((q) => cong(tong.thang, q * 3, q * 3 + 2));

  return { hang, tong };
}
