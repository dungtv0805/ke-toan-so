import { describe, it, expect } from "vitest";
import { toPhieuLines } from "../phieuLines";
import type { ChungTu, NhatKyChung } from "@/types";

describe("toPhieuLines", () => {
  it("đọc bản ghi ChungTu: diễn giải từ noiDung, tài khoản từ danhMuc", () => {
    const record = {
      soPhieu: "PT001",
      soTien: 24000000,
      noiDung: "Phí tư vấn quản lý",
      danhMuc: {
        taiKhoanNo: { ma: "131", ten: "", loai: "", nhom: "" },
        taiKhoanCo: { ma: "511", ten: "", loai: "", nhom: "" },
      },
    } as unknown as ChungTu;

    expect(toPhieuLines([record])).toEqual([
      {
        dienGiai: "Phí tư vấn quản lý",
        taiKhoanNo: "131",
        taiKhoanCo: "511",
        soTien: 24000000,
      },
    ]);
  });

  it("đọc bản ghi NhatKyChung: diễn giải từ dienGiai, tài khoản ở top-level", () => {
    const record = {
      soPhieu: "NKC202607/007",
      soTien: 1920000,
      dienGiai: "THUẾ GTGT",
      taiKhoanNo: "131",
      taiKhoanCo: "3331",
    } as unknown as NhatKyChung;

    expect(toPhieuLines([record])).toEqual([
      {
        dienGiai: "THUẾ GTGT",
        taiKhoanNo: "131",
        taiKhoanCo: "3331",
        soTien: 1920000,
      },
    ]);
  });

  it("tài khoản top-level rỗng thì lấy từ danhMuc", () => {
    const record = {
      soTien: 100,
      dienGiai: "X",
      taiKhoanNo: "",
      taiKhoanCo: "",
      danhMuc: {
        taiKhoanNo: { ma: "642", ten: "", loai: "", nhom: "" },
        taiKhoanCo: { ma: "111", ten: "", loai: "", nhom: "" },
      },
    } as unknown as NhatKyChung;

    const [line] = toPhieuLines([record]);
    expect(line.taiKhoanNo).toBe("642");
    expect(line.taiKhoanCo).toBe("111");
  });

  it("giữ nguyên thứ tự và số lượng dòng truyền vào", () => {
    const records = [
      { soTien: 1, dienGiai: "A" },
      { soTien: 2, dienGiai: "B" },
      { soTien: 3, dienGiai: "C" },
    ] as unknown as NhatKyChung[];

    expect(toPhieuLines(records).map((l) => l.dienGiai)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("thiếu dữ liệu → chuỗi rỗng và số tiền 0", () => {
    expect(toPhieuLines([{} as unknown as ChungTu])).toEqual([
      { dienGiai: "", taiKhoanNo: "", taiKhoanCo: "", soTien: 0 },
    ]);
  });

  it("danh sách rỗng → mảng rỗng", () => {
    expect(toPhieuLines([])).toEqual([]);
  });
});
