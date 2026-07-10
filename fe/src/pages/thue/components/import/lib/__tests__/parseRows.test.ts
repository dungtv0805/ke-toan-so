import { describe, it, expect } from "vitest";
import { aoaToRawRows, headerMatches } from "../parseRows";
import { buildColumns } from "../columns";

const columns = buildColumns("mua");
const header = columns.map((c) => c.header);

describe("headerMatches", () => {
  it("khớp header đúng template", () => {
    expect(headerMatches([header], columns)).toBe(true);
  });

  it("bỏ qua hoa thường và khoảng trắng thừa", () => {
    const messy = header.map((h) => `  ${h.toUpperCase()} `);
    expect(headerMatches([messy], columns)).toBe(true);
  });

  it("phát hiện header sai thứ tự", () => {
    const swapped = [...header];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    expect(headerMatches([swapped], columns)).toBe(false);
  });

  it("phát hiện header của biến thể khác", () => {
    expect(headerMatches([buildColumns("ban").map((c) => c.header)], columns)).toBe(
      false,
    );
  });

  it("file rỗng không khớp", () => {
    expect(headerMatches([], columns)).toBe(false);
  });
});

describe("aoaToRawRows", () => {
  it("bỏ header, map theo vị trí cột, rowNumber tính theo Excel", () => {
    const aoa = [
      header,
      ["01/06/2026", "0000123", "1C25TAA", "Cty A", "0101243150", "VPP", 10000000, "10 - 10%", ""],
    ];
    const rows = aoaToRawRows(aoa, columns);

    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(2);
    expect(rows[0].soHoaDon).toBe("0000123");
    expect(rows[0].giaTriChuaThue).toBe(10000000);
  });

  it("giữ nguyên ô số (serial ngày, số tiền) — không ép về chuỗi", () => {
    const rows = aoaToRawRows([header, [46053, "1", "", "A", "", "", 1500.75, "10", ""]], columns);
    expect(rows[0].ngayHoaDon).toBe(46053);
    expect(rows[0].giaTriChuaThue).toBe(1500.75);
  });

  it("bỏ qua dòng trống hoàn toàn nhưng giữ đúng rowNumber các dòng sau", () => {
    const aoa = [
      header,
      ["", "", "", "", "", "", "", "", ""],
      ["01/06/2026", "0000123", "", "Cty A", "", "", "1000", "10", ""],
    ];
    const rows = aoaToRawRows(aoa, columns);

    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
  });

  it("trả mảng rỗng khi file chỉ có header", () => {
    expect(aoaToRawRows([header], columns)).toEqual([]);
    expect(aoaToRawRows([], columns)).toEqual([]);
  });

  it("cắt khoảng trắng thừa hai đầu ô", () => {
    const rows = aoaToRawRows(
      [header, ["01/06/2026", "  0000123  ", "", "A", "", "", "1000", "10", ""]],
      columns,
    );
    expect(rows[0].soHoaDon).toBe("0000123");
  });
});
