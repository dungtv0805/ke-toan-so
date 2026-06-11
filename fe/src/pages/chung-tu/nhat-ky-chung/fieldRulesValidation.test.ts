import { describe, it, expect } from "vitest";
import { validateFieldRules, formatViolation } from "./fieldRulesValidation";
import { ChungTuChiTiet, TaiKhoanItem } from "./form-handler/sub-handler/init/init.state";

const taiKhoanList: TaiKhoanItem[] = [
  {
    ma: "112", ten: "Tiền gửi NH", loai: "TAI_SAN", nhom: "NO",
    chiTietTheo: "NGAN_HANG_QUY",
    fieldRules: { duAn: "BAT_BUOC", doi: "CANH_BAO", doiTuong: "BAT_BUOC" },
  },
  { ma: "131", ten: "Phải thu KH", loai: "TAI_SAN", nhom: "LUONG_TINH", fieldRules: { duAn: "CANH_BAO" } },
  { ma: "511", ten: "Doanh thu", loai: "DOANH_THU", nhom: "CO" },
];

const line = (over: Partial<ChungTuChiTiet>): ChungTuChiTiet => ({
  key: "k1", taiKhoanNo: "112", taiKhoanCo: "511", soTien: 100, ...over,
});

describe("validateFieldRules", () => {
  it("thiếu trường BAT_BUOC → violation mức BAT_BUOC", () => {
    const violations = validateFieldRules([line({})], taiKhoanList);
    const duAn = violations.find((v) => v.field === "duAn");
    expect(duAn).toMatchObject({ level: "BAT_BUOC", taiKhoanMa: "112", lineIndex: 0 });
  });

  it("đã nhập đủ → không có violation", () => {
    const violations = validateFieldRules(
      [line({ duAnId: "da1", doiTuongId: "nh1", doiId: "d1" })],
      taiKhoanList,
    );
    expect(violations).toEqual([]);
  });

  it("thiếu trường CANH_BAO → violation mức CANH_BAO", () => {
    const violations = validateFieldRules(
      [line({ duAnId: "da1", doiTuongId: "nh1" })],
      taiKhoanList,
    );
    expect(violations).toEqual([
      expect.objectContaining({ field: "doi", level: "CANH_BAO" }),
    ]);
  });

  it("trường chung 2 TK đều có rule → lấy mức nặng hơn (BAT_BUOC), 1 violation duy nhất", () => {
    const violations = validateFieldRules(
      [line({ taiKhoanCo: "131", doiTuongId: "nh1" })],
      taiKhoanList,
    );
    const duAn = violations.filter((v) => v.field === "duAn");
    expect(duAn).toHaveLength(1);
    expect(duAn[0].level).toBe("BAT_BUOC");
  });

  it("rule doiTuong: TK Nợ kiểm doiTuongId, TK Có kiểm doiTuong2Id", () => {
    const violations = validateFieldRules(
      [line({ taiKhoanNo: "511", taiKhoanCo: "112", duAnId: "da1", doiId: "d1" })],
      taiKhoanList,
    );
    const dt = violations.find((v) => v.field === "doiTuong");
    expect(dt).toMatchObject({ level: "BAT_BUOC", taiKhoanMa: "112" });
  });

  it("TK không có fieldRules → không violation", () => {
    const violations = validateFieldRules(
      [{ key: "k", taiKhoanNo: "511", taiKhoanCo: "511", soTien: 1 }],
      taiKhoanList,
    );
    expect(violations).toEqual([]);
  });
});

describe("formatViolation", () => {
  it("format thông điệp tiếng Việt theo dòng", () => {
    expect(
      formatViolation({ lineIndex: 1, field: "duAn", fieldLabel: "Dự án", level: "BAT_BUOC", taiKhoanMa: "112" }),
    ).toBe("Dòng 2: TK 112 yêu cầu bắt buộc nhập Dự án");
  });
});
