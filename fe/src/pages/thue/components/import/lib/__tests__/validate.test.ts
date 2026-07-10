import { describe, it, expect } from "vitest";
import { validateRows } from "../validate";
import { RawImportRow } from "../columns";

const row = (over: Partial<RawImportRow> = {}): RawImportRow => ({
  rowNumber: 2,
  ngayHoaDon: "01/06/2026",
  soHoaDon: "0000123",
  kyHieuHoaDon: "1C25TAA",
  ten: "Công ty ABC",
  mst: "0101243150",
  tenHangHoa: "Văn phòng phẩm",
  giaTriChuaThue: "10000000",
  thueSuat: "10 - 10%",
  ghiChu: "",
  ...over,
});

const errorsOf = (r: RawImportRow) => validateRows([r], "mua").results[0].errors;
const warningsOf = (r: RawImportRow) =>
  validateRows([r], "mua").results[0].warnings;

describe("validateRows — dòng hợp lệ", () => {
  it("dựng payload mua vào với tenNguoiBan / mstNguoiBan", () => {
    const { results, validItems, hasErrors } = validateRows([row()], "mua");

    expect(hasErrors).toBe(false);
    expect(results[0].errors).toEqual([]);
    expect(validItems).toEqual([
      {
        ngayHoaDon: "2026-06-01",
        soHoaDon: "0000123",
        kyHieuHoaDon: "1C25TAA",
        tenHangHoa: "Văn phòng phẩm",
        giaTriChuaThue: 10_000_000,
        thueSuat: "10",
        tenNguoiBan: "Công ty ABC",
        mstNguoiBan: "0101243150",
      },
    ]);
  });

  it("dựng payload bán ra với tenNguoiMua / mstNguoiMua", () => {
    const { validItems } = validateRows([row()], "ban");

    expect(validItems[0]).toMatchObject({
      tenNguoiMua: "Công ty ABC",
      mstNguoiMua: "0101243150",
    });
    expect(validItems[0]).not.toHaveProperty("tenNguoiBan");
    expect(validItems[0]).not.toHaveProperty("mstNguoiBan");
  });

  it("không gửi các trường tùy chọn để trống (BE bật forbidNonWhitelisted)", () => {
    const { validItems } = validateRows(
      [row({ kyHieuHoaDon: "", tenHangHoa: "", ghiChu: "", mst: "" })],
      "mua",
    );

    expect(Object.keys(validItems[0]).sort()).toEqual([
      "giaTriChuaThue",
      "ngayHoaDon",
      "soHoaDon",
      "tenNguoiBan",
      "thueSuat",
    ]);
  });

  it("chấp nhận ô ngày là Date (cell định dạng ngày của Excel)", () => {
    const { validItems, hasErrors } = validateRows(
      [row({ ngayHoaDon: new Date(Date.UTC(2026, 5, 1)) })],
      "mua",
    );

    expect(hasErrors).toBe(false);
    expect(validItems[0].ngayHoaDon).toBe("2026-06-01");
  });

  it("chấp nhận thuế suất gõ mã thuần thay vì chọn dropdown", () => {
    expect(errorsOf(row({ thueSuat: "KCT" }))).toEqual([]);
    expect(errorsOf(row({ thueSuat: "kct" }))).toEqual([]);
  });

  it("chấp nhận số tiền có dấu phẩy ngăn cách nghìn", () => {
    const { validItems } = validateRows(
      [row({ giaTriChuaThue: "10,000,000" })],
      "mua",
    );
    expect(validItems[0].giaTriChuaThue).toBe(10_000_000);
  });

  it("giá trị chưa thuế bằng 0 là hợp lệ", () => {
    expect(errorsOf(row({ giaTriChuaThue: "0" }))).toEqual([]);
  });
});

describe("validateRows — lỗi chặn import", () => {
  it.each([
    ["ngayHoaDon", "Ngày hóa đơn"],
    ["soHoaDon", "Số hóa đơn"],
    ["ten", "Tên người bán"],
    ["giaTriChuaThue", "Giá trị chưa thuế"],
    ["thueSuat", "Thuế suất"],
  ])("cột bắt buộc %s để trống", (key, header) => {
    const errors = errorsOf(row({ [key]: "" } as Partial<RawImportRow>));
    expect(errors.map((e) => e.field)).toContain(key);
    expect(errors[0].message).toContain(header);
  });

  it("ngày sai định dạng", () => {
    const errors = errorsOf(row({ ngayHoaDon: "2026-06-01" }));
    expect(errors.map((e) => e.field)).toEqual(["ngayHoaDon"]);
  });

  it("giá trị chưa thuế không phải số", () => {
    expect(errorsOf(row({ giaTriChuaThue: "abc" })).map((e) => e.field)).toEqual([
      "giaTriChuaThue",
    ]);
  });

  it("giá trị chưa thuế âm", () => {
    const errors = errorsOf(row({ giaTriChuaThue: "-100" }));
    expect(errors[0].message).toContain("không được là số âm");
  });

  it("thuế suất không thuộc danh sách hợp lệ", () => {
    const errors = errorsOf(row({ thueSuat: "12" }));
    expect(errors.map((e) => e.field)).toEqual(["thueSuat"]);
  });

  it("dòng lỗi không sinh payload và bật hasErrors", () => {
    const { validItems, hasErrors, results } = validateRows(
      [row(), row({ rowNumber: 3, soHoaDon: "" })],
      "mua",
    );
    expect(hasErrors).toBe(true);
    expect(validItems).toHaveLength(1);
    expect(results[1].item).toBeNull();
  });
});

describe("validateRows — cảnh báo (vẫn import được)", () => {
  it("MST không phải 10 hoặc 13 chữ số", () => {
    const warnings = warningsOf(row({ mst: "12345" }));
    expect(warnings.map((w) => w.field)).toEqual(["mst"]);
    expect(errorsOf(row({ mst: "12345" }))).toEqual([]);
  });

  it("chấp nhận MST 13 số dạng có gạch nối", () => {
    expect(warningsOf(row({ mst: "0101243150-001" }))).toEqual([]);
  });

  it("MST để trống không cảnh báo", () => {
    expect(warningsOf(row({ mst: "" }))).toEqual([]);
  });
});

describe("validateRows — khóa hóa đơn", () => {
  it("dựng khóa chuẩn hóa hoa thường", () => {
    const { results } = validateRows([row({ kyHieuHoaDon: "1c25taa" })], "mua");
    expect(results[0].key).toBe("0000123|1C25TAA|0101243150");
  });

  it("không dựng khóa khi thiếu số hóa đơn", () => {
    const { results } = validateRows([row({ soHoaDon: "" })], "mua");
    expect(results[0].key).toBe("");
  });
});
