import { describe, it, expect } from "vitest";
import { nhomKhoanMucMa, nhomKhoanMucTen } from "./nhomKhoanMuc";
import type { NhatKyChung } from "@/types";

const nhomList = [
  { id: "id-1", ma: "NKM1", ten: "Nhóm doanh thu" },
  { id: "id-2", ma: "NKM2", ten: "Nhóm chi phí" },
];

const dong = (nhom?: string) =>
  ({ danhMuc: { khoanMuc: { ma: "KM01", ten: "Khoản mục 1", loai: "", nhom } } } as unknown as NhatKyChung);

describe("nhomKhoanMucMa", () => {
  it("lấy nhóm đang lưu trên snapshot khoản mục", () => {
    expect(nhomKhoanMucMa(dong("NKM1"))).toBe("NKM1");
  });

  it("không chọn khoản mục thì không có nhóm", () => {
    expect(nhomKhoanMucMa({} as NhatKyChung)).toBeUndefined();
  });
});

describe("nhomKhoanMucTen", () => {
  it("tra tên theo mã nhóm", () => {
    expect(nhomKhoanMucTen("NKM2", nhomList)).toBe("Nhóm chi phí");
  });

  it("dữ liệu cũ lưu theo id vẫn tra được", () => {
    expect(nhomKhoanMucTen("id-1", nhomList)).toBe("Nhóm doanh thu");
  });

  it("nhóm không còn trong danh mục thì hiện thẳng giá trị đang lưu", () => {
    expect(nhomKhoanMucTen("NKM-CU", nhomList)).toBe("NKM-CU");
  });

  it("trống thì trả chuỗi rỗng", () => {
    expect(nhomKhoanMucTen(undefined, nhomList)).toBe("");
  });
});
