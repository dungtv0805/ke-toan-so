import { describe, it, expect } from "vitest";
import { aoaToRawRows, findMissingHeaders } from "../parseRows";
import type { ImportColumn } from "../../types";

const columns: ImportColumn[] = [
  { key: "ma", header: "Mã đơn vị tính", required: true },
  { key: "ten", header: "Tên đơn vị tính", required: true },
  { key: "moTa", header: "Mô tả" },
];

describe("findMissingHeaders", () => {
  it("trả về rỗng khi file có đủ cột bắt buộc", () => {
    const aoa = [["Mã đơn vị tính", "Tên đơn vị tính", "Mô tả"]];
    expect(findMissingHeaders(aoa, columns)).toEqual([]);
  });

  it("chỉ báo thiếu cột bắt buộc, không báo cột tùy chọn", () => {
    const aoa = [["Tên đơn vị tính"]];
    expect(findMissingHeaders(aoa, columns)).toEqual(["Mã đơn vị tính"]);
  });

  it("bỏ qua khác biệt hoa thường và khoảng trắng thừa ở header", () => {
    const aoa = [["  mã đơn vị TÍNH ", "Tên đơn vị tính"]];
    expect(findMissingHeaders(aoa, columns)).toEqual([]);
  });

  it("file rỗng thì báo thiếu hết cột bắt buộc", () => {
    expect(findMissingHeaders([], columns)).toEqual([
      "Mã đơn vị tính",
      "Tên đơn vị tính",
    ]);
  });
});

describe("aoaToRawRows", () => {
  it("map theo tên header chứ không theo vị trí", () => {
    const aoa = [
      ["Mô tả", "Tên đơn vị tính", "Mã đơn vị tính"],
      ["ghi chú", "Cái", "DVT01"],
    ];
    const rows = aoaToRawRows(aoa, columns);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      rowNumber: 2,
      values: { ma: "DVT01", ten: "Cái", moTa: "ghi chú" },
    });
  });

  it("bỏ dòng trống hoàn toàn và giữ đúng rowNumber của các dòng còn lại", () => {
    const aoa = [
      ["Mã đơn vị tính", "Tên đơn vị tính", "Mô tả"],
      ["", "", ""],
      ["DVT02", "Hộp", ""],
    ];
    const rows = aoaToRawRows(aoa, columns);
    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
    expect(rows[0].values.ma).toBe("DVT02");
  });

  it("trim giá trị và ép về chuỗi", () => {
    const aoa = [
      ["Mã đơn vị tính", "Tên đơn vị tính"],
      ["  DVT03  ", 123],
    ];
    const rows = aoaToRawRows(aoa, columns);
    expect(rows[0].values.ma).toBe("DVT03");
    expect(rows[0].values.ten).toBe("123");
  });

  it("giữ nguyên số serial ở cột kiểu ngày", () => {
    const dateColumns: ImportColumn[] = [
      { key: "ma", header: "Mã dự án", required: true },
      { key: "ngayBatDau", header: "Ngày bắt đầu", type: "date" },
    ];
    const aoa = [
      ["Mã dự án", "Ngày bắt đầu"],
      ["DA01", 45870],
    ];
    const rows = aoaToRawRows(aoa, dateColumns);
    expect(rows[0].values.ngayBatDau).toBe(45870);
  });

  it("cột khai báo trong config nhưng không có trong file thì để chuỗi rỗng", () => {
    const aoa = [
      ["Mã đơn vị tính", "Tên đơn vị tính"],
      ["DVT04", "Kg"],
    ];
    const rows = aoaToRawRows(aoa, columns);
    expect(rows[0].values.moTa).toBe("");
  });

  it("file chỉ có header thì trả mảng rỗng", () => {
    expect(aoaToRawRows([["Mã đơn vị tính"]], columns)).toEqual([]);
  });
});
