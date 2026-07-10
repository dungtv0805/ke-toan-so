import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildTemplateWorkbook } from "../template";
import { aoaToRawRows, headerMatches } from "../parseRows";
import { validateRows } from "../validate";
import { BangKeVariant, buildColumns } from "../columns";

/**
 * File mẫu tải về phải tự đọc lại được: header khớp, dòng ví dụ parse sạch lỗi.
 * Bắt lỗi lệch tiêu đề cột và chuỗi dropdown ("10 - 10%") không tách được mã.
 */
async function readTemplateBack(variant: BangKeVariant) {
  const wb = buildTemplateWorkbook(variant);
  const buffer = await wb.xlsx.writeBuffer();

  const read = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = read.Sheets[read.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: "",
  }) as unknown[][];
}

describe.each(["mua", "ban"] as const)("round-trip template %s", (variant) => {
  it("sheet đầu tiên là sheet dữ liệu, header khớp template", async () => {
    const aoa = await readTemplateBack(variant);
    expect(headerMatches(aoa, buildColumns(variant))).toBe(true);
  });

  it("dòng ví dụ đọc lại được và validate không lỗi", async () => {
    const aoa = await readTemplateBack(variant);
    const rows = aoaToRawRows(aoa, buildColumns(variant));
    expect(rows).toHaveLength(1);

    const { hasErrors, validItems, results } = validateRows(rows, variant);
    expect(results[0].errors).toEqual([]);
    expect(hasErrors).toBe(false);

    expect(validItems[0]).toMatchObject({
      ngayHoaDon: "2026-06-01",
      soHoaDon: "0000123",
      kyHieuHoaDon: "1C25TAA",
      giaTriChuaThue: 10_000_000,
      thueSuat: "10", // tách được mã từ chuỗi dropdown "10 - 10%"
    });
  });

  it("file mẫu của biến thể kia bị từ chối vì lệch header", async () => {
    const other: BangKeVariant = variant === "mua" ? "ban" : "mua";
    const aoa = await readTemplateBack(other);
    expect(headerMatches(aoa, buildColumns(variant))).toBe(false);
  });
});
