import { describe, it, expect } from "vitest";
import { dungBangXuat, type ExcelColumn } from "./exportExcel";

const columns: ExcelColumn[] = [
  { header: "Mã", dataKey: "ma" },
  { header: "Tên", dataKey: "ten" },
];

describe("dungBangXuat — xuất phẳng", () => {
  it("giữ nguyên tiêu đề, header và dòng dữ liệu; chỉ gộp ô tiêu đề", () => {
    const { wsData, merges, rows } = dungBangXuat({
      title: "DANH MỤC",
      columns,
      data: [{ ma: "A1", ten: "Alpha" }, { ma: "B1", ten: null }],
    });
    expect(wsData).toEqual([
      ["DANH MỤC"],
      [],
      ["Mã", "Tên"],
      ["A1", "Alpha"],
      ["B1", ""],
    ]);
    expect(merges).toEqual([{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]);
    expect(rows).toEqual([]);
  });
});

describe("dungBangXuat — xuất cây", () => {
  const ket = () =>
    dungBangXuat({
      title: "DANH MỤC",
      columns,
      donVi: "sản phẩm",
      groups: [
        { ten: "Nhóm A", rows: [{ ma: "A1", ten: "Alpha" }, { ma: "A2", ten: "An" }] },
        { ten: "(Chưa gán nhóm)", rows: [{ ma: "B1", ten: "Beta" }] },
      ],
    });

  it("mỗi nhóm một dòng tiêu đề kèm số đếm, dòng con nằm ngay dưới", () => {
    expect(ket().wsData).toEqual([
      ["DANH MỤC"],
      [],
      ["Mã", "Tên"],
      ["Nhóm A (2 sản phẩm)"],
      ["A1", "Alpha"],
      ["A2", "An"],
      ["(Chưa gán nhóm) (1 sản phẩm)"],
      ["B1", "Beta"],
    ]);
  });

  it("dòng tiêu đề nhóm gộp trọn chiều ngang", () => {
    expect(ket().merges).toEqual([
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
    ]);
  });

  it("chỉ dòng CON mang outline cấp 1 — dòng nhóm phải ở cấp 0 mới thu/mở được", () => {
    const { rows } = ket();
    expect(rows[3]).toBeUndefined();
    expect(rows[4]).toEqual({ level: 1 });
    expect(rows[5]).toEqual({ level: 1 });
    expect(rows[6]).toBeUndefined();
    expect(rows[7]).toEqual({ level: 1 });
  });

  it("soLuong truyền vào được ưu tiên hơn số dòng con", () => {
    const { wsData } = dungBangXuat({
      title: "T",
      columns,
      donVi: "dòng",
      groups: [{ ten: "N", soLuong: 9, rows: [{ ma: "x", ten: "y" }] }],
    });
    expect(wsData[3]).toEqual(["N (9 dòng)"]);
  });
});
