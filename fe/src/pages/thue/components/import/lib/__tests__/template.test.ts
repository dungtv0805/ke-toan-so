import { describe, it, expect } from "vitest";
import { buildTemplateWorkbook } from "../template";
import { THUE_SUAT_SHEET, buildColumns } from "../columns";
import { THUE_SUAT_OPTIONS } from "@/services/taxService";

describe("buildTemplateWorkbook", () => {
  it.each([
    ["mua", "BangKeMuaVao", "Tên người bán", "MST người bán"] as const,
    ["ban", "BangKeBanRa", "Tên người mua", "MST người mua"] as const,
  ])("biến thể %s: sheet chính + header đúng", (variant, sheetName, tenHeader, mstHeader) => {
    const wb = buildTemplateWorkbook(variant);
    const main = wb.getWorksheet(sheetName);

    expect(main).toBeDefined();
    const header = main!.getRow(1).values as unknown[];
    expect(header.slice(1)).toEqual(buildColumns(variant).map((c) => c.header));
    expect(header).toContain(tenHeader);
    expect(header).toContain(mstHeader);
  });

  it("có đúng 9 cột, 1 dòng ví dụ, dòng 3 trở đi để trống", () => {
    const wb = buildTemplateWorkbook("mua");
    const main = wb.getWorksheet("BangKeMuaVao")!;

    expect(buildColumns("mua")).toHaveLength(9);
    expect(main.getRow(2).getCell(1).value).toBe("01/06/2026");
    expect(main.getRow(2).getCell(8).value).toBe("10 - 10%");
    // các hàng sau chỉ tồn tại để mang dropdown, không có dữ liệu
    expect(main.getRow(3).getCell(1).value).toBeNull();
  });

  it("không có cột Tiền thuế / Tổng thanh toán (BE tự tính)", () => {
    const headers = buildColumns("mua").map((c) => c.header);
    expect(headers.some((h) => h.includes("Tiền thuế"))).toBe(false);
    expect(headers.some((h) => h.includes("Tổng thanh toán"))).toBe(false);
  });

  it("sheet DM_ThueSuat liệt kê đủ 6 thuế suất dạng 'Mã - Tên'", () => {
    const wb = buildTemplateWorkbook("mua");
    const ref = wb.getWorksheet(THUE_SUAT_SHEET)!;

    expect(ref.rowCount).toBe(THUE_SUAT_OPTIONS.length);
    expect(ref.getRow(1).getCell(1).value).toBe("0 - 0%");
    expect(ref.getRow(6).getCell(1).value).toBe("KKKT - Không kê khai/khấu trừ");
  });

  it("gắn dropdown thuế suất vào đúng cột, tham chiếu sheet danh mục", () => {
    const wb = buildTemplateWorkbook("mua");
    const main = wb.getWorksheet("BangKeMuaVao")!;
    const colNumber = buildColumns("mua").findIndex((c) => c.key === "thueSuat") + 1;

    const validation = main.getCell(2, colNumber).dataValidation;
    expect(validation?.type).toBe("list");
    expect(validation?.formulae?.[0]).toBe(`'${THUE_SUAT_SHEET}'!$A$1:$A$6`);

    // Không áp dropdown lên cột khác
    expect(main.getCell(2, 1).dataValidation).toBeUndefined();
  });
});
