import { describe, it, expect } from "vitest";
import { buildNkcSummaryRows } from "./nkcSummaryRows";
import type { StatsData } from "../sub-handler/init/init.state";

const stats: StatsData = {
  tongButToan: 100,
  tongThu: 0,
  tongChi: 0,
  soDu: 0,
  tongGiaTri: 1_000_000_000,
  hopLe: { soLuong: 60, giaTri: 800_000_000 },
  chuaHopLe: { soLuong: 20, giaTri: 100_000_000 },
  khongHopLe: { soLuong: 5, giaTri: 50_000_000 },
  chuaKiemSoat: { soLuong: 15, giaTri: 50_000_000 },
};

describe("buildNkcSummaryRows", () => {
  it("dựng đủ 8 thẻ theo đúng thứ tự yêu cầu", () => {
    expect(buildNkcSummaryRows(stats).map((r) => r.key)).toEqual([
      "tong",
      "hopLe",
      "chuaHopLe",
      "khongHopLe",
      "chuaKiemSoat",
      "tyLeHopLe",
      "tyLeChuaHopLe",
      "tyLeKhongHopLe",
    ]);
  });

  it("4 nhóm kiểm soát cộng lại đúng bằng thẻ tổng", () => {
    const rows = buildNkcSummaryRows(stats);
    const [tong, ...nhom] = rows.filter((r) => r.kind === "count");

    expect(nhom.reduce((s, r) => s + r.theoSoLuong, 0)).toBe(tong.theoSoLuong);
    expect(nhom.reduce((s, r) => s + r.theoGiaTri, 0)).toBe(tong.theoGiaTri);
  });

  it("tỷ lệ tính riêng theo số lượng và theo giá trị", () => {
    const rows = buildNkcSummaryRows(stats);
    const tyLeHopLe = rows.find((r) => r.key === "tyLeHopLe")!;

    // 60/100 bút toán nhưng 800tr/1 tỷ giá trị — hai con số cố tình khác nhau.
    expect(tyLeHopLe.theoSoLuong).toBeCloseTo(0.6);
    expect(tyLeHopLe.theoGiaTri).toBeCloseTo(0.8);
  });

  it("bộ lọc không ra bút toán nào → tỷ lệ là 0, không phải NaN", () => {
    const rows = buildNkcSummaryRows({
      ...stats,
      tongButToan: 0,
      tongGiaTri: 0,
      hopLe: { soLuong: 0, giaTri: 0 },
      chuaHopLe: { soLuong: 0, giaTri: 0 },
      khongHopLe: { soLuong: 0, giaTri: 0 },
      chuaKiemSoat: { soLuong: 0, giaTri: 0 },
    });

    for (const row of rows.filter((r) => r.kind === "ratio")) {
      expect(row.theoSoLuong).toBe(0);
      expect(row.theoGiaTri).toBe(0);
    }
  });

  it("BE cũ chưa trả bóc tách kiểm soát → thẻ về 0 chứ không vỡ", () => {
    const rows = buildNkcSummaryRows(undefined);

    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.theoSoLuong === 0 && r.theoGiaTri === 0)).toBe(
      true,
    );
  });
});
