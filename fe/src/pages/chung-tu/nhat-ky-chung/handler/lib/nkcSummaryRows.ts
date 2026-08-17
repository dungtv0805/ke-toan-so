import type { StatsData } from "../sub-handler/init/init.state";

/** Màu viền trái của thẻ — khớp màu thẻ trạng thái trong cột "Kiểm soát". */
export type NkcSummaryTone =
  | "total"
  | "hopLe"
  | "chuaHopLe"
  | "khongHopLe"
  | "chuaKiemSoat";

export interface NkcSummaryRow {
  key: string;
  label: string;
  tone: NkcSummaryTone;
  /** `count`: dòng 1 là số bút toán, dòng 2 là tiền. `ratio`: cả hai là tỷ lệ 0..1. */
  kind: "count" | "ratio";
  /** Theo số lượng bút toán. */
  theoSoLuong: number;
  /** Theo giá trị (tổng soTien). */
  theoGiaTri: number;
}

/** Chia an toàn — tổng bằng 0 (bộ lọc không ra bút toán nào) thì tỷ lệ là 0. */
const tyLe = (phan: number, tong: number): number =>
  tong > 0 ? phan / tong : 0;

/**
 * 8 thẻ số liệu của hàng "Dữ liệu tổng hợp": 5 thẻ đếm (số lượng + giá trị) và
 * 3 thẻ tỷ lệ. Tỷ lệ trả về theo CẢ HAI cách tính — số lượng và giá trị — vì một
 * bút toán không hợp lệ 2 tỷ khác hẳn một bút toán không hợp lệ 20 nghìn.
 */
export function buildNkcSummaryRows(stats?: StatsData): NkcSummaryRow[] {
  const tongSo = stats?.tongButToan || 0;
  const tongGiaTri = stats?.tongGiaTri || 0;
  const zero = { soLuong: 0, giaTri: 0 };
  const hopLe = stats?.hopLe || zero;
  const chuaHopLe = stats?.chuaHopLe || zero;
  const khongHopLe = stats?.khongHopLe || zero;
  const chuaKiemSoat = stats?.chuaKiemSoat || zero;

  return [
    {
      key: "tong",
      label: "Tổng bút toán",
      tone: "total",
      kind: "count",
      theoSoLuong: tongSo,
      theoGiaTri: tongGiaTri,
    },
    {
      key: "hopLe",
      label: "Hợp lệ",
      tone: "hopLe",
      kind: "count",
      theoSoLuong: hopLe.soLuong,
      theoGiaTri: hopLe.giaTri,
    },
    {
      key: "chuaHopLe",
      label: "Chưa hợp lệ",
      tone: "chuaHopLe",
      kind: "count",
      theoSoLuong: chuaHopLe.soLuong,
      theoGiaTri: chuaHopLe.giaTri,
    },
    {
      key: "khongHopLe",
      label: "Không hợp lệ",
      tone: "khongHopLe",
      kind: "count",
      theoSoLuong: khongHopLe.soLuong,
      theoGiaTri: khongHopLe.giaTri,
    },
    {
      key: "chuaKiemSoat",
      label: "Chưa kiểm soát",
      tone: "chuaKiemSoat",
      kind: "count",
      theoSoLuong: chuaKiemSoat.soLuong,
      theoGiaTri: chuaKiemSoat.giaTri,
    },
    {
      key: "tyLeHopLe",
      label: "Tỷ lệ hợp lệ",
      tone: "hopLe",
      kind: "ratio",
      theoSoLuong: tyLe(hopLe.soLuong, tongSo),
      theoGiaTri: tyLe(hopLe.giaTri, tongGiaTri),
    },
    {
      key: "tyLeChuaHopLe",
      label: "Tỷ lệ chưa hợp lệ",
      tone: "chuaHopLe",
      kind: "ratio",
      theoSoLuong: tyLe(chuaHopLe.soLuong, tongSo),
      theoGiaTri: tyLe(chuaHopLe.giaTri, tongGiaTri),
    },
    {
      key: "tyLeKhongHopLe",
      label: "Tỷ lệ không hợp lệ",
      tone: "khongHopLe",
      kind: "ratio",
      theoSoLuong: tyLe(khongHopLe.soLuong, tongSo),
      theoGiaTri: tyLe(khongHopLe.giaTri, tongGiaTri),
    },
  ];
}
