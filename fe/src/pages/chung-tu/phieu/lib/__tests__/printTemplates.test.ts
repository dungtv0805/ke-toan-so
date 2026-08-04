import { describe, it, expect } from "vitest";
import { getDefaultTemplate, PHIEU_PLACEHOLDERS } from "../printTemplates";
import { buildPhieuHtml } from "../printPhieu";
import type { PhieuLine } from "../phieuLines";
import type { ChungTu } from "@/types";

const chungTu = {
  soPhieu: "NKC202607/007",
  ngay: "2026-07-20T00:00:00.000Z",
  soTien: 24000000,
  noiDung: "Phí tư vấn quản lý",
} as unknown as ChungTu;

const dong: PhieuLine[] = [
  { dienGiai: "Phí tư vấn quản lý", taiKhoanNo: "131", taiKhoanCo: "511", soTien: 24000000 },
  { dienGiai: "THUẾ GTGT", taiKhoanNo: "131", taiKhoanCo: "3331", soTien: 1920000 },
];

describe("mẫu in mặc định", () => {
  it.each(["PHIEU_THU", "PHIEU_CHI"] as const)(
    "%s có {{bangChiTiet}} nằm trước phần viết bằng chữ",
    (loai) => {
      const tpl = getDefaultTemplate(loai);
      expect(tpl).toContain("{{bangChiTiet}}");
      expect(tpl.indexOf("{{bangChiTiet}}")).toBeLessThan(
        tpl.indexOf("{{soTienBangChu}}")
      );
    }
  );

  it("khai báo {{bangChiTiet}} trong danh sách placeholder cho modal Mẫu in", () => {
    expect(PHIEU_PLACEHOLDERS.map((p) => p.token)).toContain("{{bangChiTiet}}");
  });

  it("in chứng từ 2 dòng ra đúng một bảng chi tiết đủ cả 2 dòng", () => {
    const out = buildPhieuHtml(chungTu, getDefaultTemplate("PHIEU_THU"), undefined, dong);
    expect(out.split("<table").length - 1).toBe(1);
    expect(out).toContain("Phí tư vấn quản lý");
    expect(out).toContain("THUẾ GTGT");
    expect(out).toContain("Cộng");
    expect(out).not.toContain("{{");
  });

  it("có CSS cho bảng chi tiết để in ra kẻ khung", () => {
    expect(getDefaultTemplate("PHIEU_THU")).toContain(".ct-chi-tiet");
  });
});
