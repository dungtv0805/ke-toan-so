import { describe, it, expect } from "vitest";
import { buildDanhMucFromResolved } from "../buildDanhMucFromRow";

describe("buildDanhMucFromResolved", () => {
  it("dựng danhMuc với TK Nợ/Có, loại GD, nghiệp vụ", () => {
    const danhMuc = buildDanhMucFromResolved({
      taiKhoanNo: { ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" },
      taiKhoanCo: { ma: "511", ten: "Doanh thu", loai: "DT", nhom: "B" },
      loaiGiaoDich: { ma: "PHIEU_THU", ten: "Phiếu thu" },
      nghiepVu: "NV01",
    });

    expect(danhMuc.taiKhoanNo).toEqual({ ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" });
    expect(danhMuc.taiKhoanCo?.ma).toBe("511");
    expect(danhMuc.loaiGiaoDich).toEqual({ ma: "PHIEU_THU", ten: "Phiếu thu" });
    expect(danhMuc.nghiepVu).toEqual({ ma: "NV01", ten: "NV01" });
  });

  it("bỏ qua chiều phân bổ không truyền vào", () => {
    const danhMuc = buildDanhMucFromResolved({
      taiKhoanNo: { ma: "111", ten: "", loai: "", nhom: "" },
      taiKhoanCo: { ma: "511", ten: "", loai: "", nhom: "" },
      loaiGiaoDich: { ma: "PHIEU_THU", ten: "Phiếu thu" },
      nghiepVu: "NV01",
    });
    expect(danhMuc.doiTuong).toBeUndefined();
    expect(danhMuc.duAn).toBeUndefined();
  });
});
