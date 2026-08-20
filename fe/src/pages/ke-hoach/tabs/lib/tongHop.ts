/**
 * Dựng cây hàng cho hai bảng kế hoạch hai cấp: TỔNG CỘNG → nhóm → chi tiết.
 *
 * Thuần, không đụng React — bảng Bán hàng và bảng Nhân sự chỉ khác nhau ở cách
 * rút `MoTaHang` ra khỏi dòng của mình, phần cộng dồn dùng chung ở đây.
 */

export type LoaiHang = 'tong' | 'nhom' | 'chiTiet';

export const SO_THANG = 12;

/** Khoá của hàng TỔNG CỘNG — dùng làm rowKey nên phải không trùng id thật. */
export const KEY_TONG = '__tong__';

/** Tiền tố khoá hàng nhóm — cùng lý do. */
export const KEY_NHOM = '__nhom__';

/** Dữ liệu tối thiểu mà mỗi bảng phải rút ra từ dòng của mình. */
export interface MoTaHang {
  key: string;
  nhomKey: string;
  nhomNhan: string;
  nhan: string;
  thang: number[];
  /** Số năm người dùng khai: Doanh thu = Lượng × Giá, hoặc CỘNG 6 loại chi phí. */
  namKhaiBao: number;
}

export interface HangBang<T> {
  key: string;
  loai: LoaiHang;
  nhan: string;
  /** Khoá nhóm cha — có ở hàng nhóm và hàng chi tiết, không có ở hàng tổng. */
  nhomKey?: string;
  thang: number[];
  /** Đúng 4 phần tử: Q1…Q4. */
  quy: number[];
  namTheoThang: number;
  namKhaiBao: number;
  phanTram: number;
  /** Tổng 12 tháng khác số khai báo — chỉ cảnh báo, không chặn lưu. */
  lech: boolean;
  /** Dòng gốc — chỉ có ở hàng chi tiết, dùng để sửa. */
  dong?: T;
}

const mang12 = (thang: number[] = []): number[] =>
  Array.from({ length: SO_THANG }, (_, i) => Number(thang[i]) || 0);

export const tongMang = (a: number[], b: number[]): number[] => {
  const n = Math.max(a.length, b.length);
  return Array.from({ length: n }, (_, i) => (a[i] || 0) + (b[i] || 0));
};

export const quyTuThang = (thang: number[]): number[] => {
  const m = mang12(thang);
  return [0, 1, 2, 3].map((q) => m[q * 3] + m[q * 3 + 1] + m[q * 3 + 2]);
};

const cong = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

/** So khớp tiền: lệch dưới 1 đồng coi như bằng nhau. */
const bangNhau = (a: number, b: number): boolean => Math.abs(a - b) < 1;

export function dungCayBang<T>(
  items: T[],
  doc: (item: T) => MoTaHang,
): HangBang<T>[] {
  const moTa = items.map((item) => ({ item, m: doc(item) }));

  // Giữ đúng thứ tự nhóm xuất hiện lần đầu — BE đã sắp theo mã nhóm rồi mã con.
  const thuTuNhom: string[] = [];
  const theoNhom = new Map<string, { nhan: string; con: typeof moTa }>();
  for (const x of moTa) {
    let nhom = theoNhom.get(x.m.nhomKey);
    if (!nhom) {
      nhom = { nhan: x.m.nhomNhan, con: [] };
      theoNhom.set(x.m.nhomKey, nhom);
      thuTuNhom.push(x.m.nhomKey);
    }
    nhom.con.push(x);
  }

  const tongThang = moTa.reduce(
    (acc, x) => tongMang(acc, mang12(x.m.thang)),
    mang12([]),
  );
  const tongKhaiBao = cong(moTa.map((x) => x.m.namKhaiBao));
  const tyLe = (v: number) => (tongKhaiBao === 0 ? 0 : v / tongKhaiBao);

  const rows: HangBang<T>[] = [
    {
      key: KEY_TONG,
      loai: 'tong',
      nhan: 'TỔNG CỘNG',
      thang: tongThang,
      quy: quyTuThang(tongThang),
      namTheoThang: cong(tongThang),
      namKhaiBao: tongKhaiBao,
      phanTram: tyLe(tongKhaiBao),
      lech: !bangNhau(cong(tongThang), tongKhaiBao),
    },
  ];

  for (const nhomKey of thuTuNhom) {
    const nhom = theoNhom.get(nhomKey)!;
    const thangNhom = nhom.con.reduce(
      (acc, x) => tongMang(acc, mang12(x.m.thang)),
      mang12([]),
    );
    const khaiBaoNhom = cong(nhom.con.map((x) => x.m.namKhaiBao));

    rows.push({
      key: `${KEY_NHOM}${nhomKey}`,
      loai: 'nhom',
      nhan: nhom.nhan,
      nhomKey,
      thang: thangNhom,
      quy: quyTuThang(thangNhom),
      namTheoThang: cong(thangNhom),
      namKhaiBao: khaiBaoNhom,
      phanTram: tyLe(khaiBaoNhom),
      lech: !bangNhau(cong(thangNhom), khaiBaoNhom),
    });

    for (const { item, m } of nhom.con) {
      const t = mang12(m.thang);
      rows.push({
        key: m.key,
        loai: 'chiTiet',
        nhan: m.nhan,
        nhomKey,
        thang: t,
        quy: quyTuThang(t),
        namTheoThang: cong(t),
        namKhaiBao: m.namKhaiBao,
        phanTram: tyLe(m.namKhaiBao),
        lech: !bangNhau(cong(t), m.namKhaiBao),
        dong: item,
      });
    }
  }

  return rows;
}
