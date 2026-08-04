import { describe, it, expect } from "vitest";
import { buildPhieuHtml } from "../printPhieu";
import { formatCurrency } from "../format";
import type { PhieuLine } from "../phieuLines";
import { ChungTu } from "@/types";

const phieu = {
  id: "1",
  soPhieu: "PT001",
  loai: "PHIEU_THU",
  ngay: "2026-06-20T00:00:00.000Z",
  soTien: 1234567,
  noiDung: "Thu tiền dịch vụ",
  nguoiGiaoDich: "Nguyễn Văn A",
  diaChi: "Hà Nội",
  ghiChu: "02",
  danhMuc: {
    taiKhoanNo: { ma: "111", ten: "Tiền mặt", loai: "", nhom: "" },
    taiKhoanCo: { ma: "511", ten: "Doanh thu", loai: "", nhom: "" },
  },
} as unknown as ChungTu;

describe("buildPhieuHtml", () => {
  it("thay placeholder bằng dữ liệu phiếu", () => {
    const out = buildPhieuHtml(phieu, "{{soPhieu}}|{{nguoiGiaoDich}}|{{taiKhoanNo}}|{{taiKhoanCo}}");
    expect(out).toBe("PT001|Nguyễn Văn A|111|511");
  });

  it("đọc số tiền bằng chữ và định dạng số tiền", () => {
    const out = buildPhieuHtml(phieu, "{{soTienBangChu}}");
    expect(out).toBe(
      "Một triệu hai trăm ba mươi tư nghìn năm trăm sáu mươi bảy đồng"
    );
  });

  it("tách ngày/tháng/năm", () => {
    const out = buildPhieuHtml(phieu, "{{ngay}}-{{thang}}-{{nam}}");
    expect(out).toBe("20-06-2026");
  });

  it("placeholder thiếu dữ liệu → chuỗi rỗng, không sót {{...}}", () => {
    const minimal = { soPhieu: "PC9", loai: "PHIEU_CHI", ngay: "2026-01-02", soTien: 0 } as unknown as ChungTu;
    const out = buildPhieuHtml(minimal, "[{{nguoiGiaoDich}}][{{diaChi}}][{{taiKhoanNo}}]");
    expect(out).toBe("[][][]");
    expect(out).not.toContain("{{");
  });

  it("dùng thông tin công ty truyền vào", () => {
    const out = buildPhieuHtml(phieu, "{{tenCongTy}}", { tenCongTy: "CTY ABC" });
    expect(out).toBe("CTY ABC");
  });
});

describe("buildPhieuHtml — chứng từ nhiều dòng", () => {
  const chungTu = {
    id: "7",
    soPhieu: "NKC202607/007",
    loai: "PHIEU_THU",
    ngay: "2026-07-20T00:00:00.000Z",
    soTien: 24000000,
    noiDung: "Phí tư vấn quản lý",
    nguoiGiaoDich: "Công ty B",
  } as unknown as ChungTu;

  const dong: PhieuLine[] = [
    {
      dienGiai: "Phí tư vấn quản lý",
      taiKhoanNo: "131",
      taiKhoanCo: "511",
      soTien: 24000000,
    },
    {
      dienGiai: "THUẾ GTGT",
      taiKhoanNo: "131",
      taiKhoanCo: "3331",
      soTien: 1920000,
    },
  ];

  it("{{soTien}} là tổng các dòng, không phải số tiền dòng đầu", () => {
    const out = buildPhieuHtml(chungTu, "[{{soTien}}]", undefined, dong);
    expect(out).toContain(`[${formatCurrency(25920000)}]`);
  });

  it("{{soTienBangChu}} đọc theo tổng các dòng", () => {
    const out = buildPhieuHtml(chungTu, "[{{soTienBangChu}}]", undefined, dong);
    expect(out).toContain(
      "[Hai mươi lăm triệu chín trăm hai mươi nghìn đồng]"
    );
  });

  it("{{bangChiTiet}} liệt kê đủ mọi dòng kèm dòng cộng", () => {
    const out = buildPhieuHtml(chungTu, "{{bangChiTiet}}", undefined, dong);
    expect(out).toContain("Phí tư vấn quản lý");
    expect(out).toContain("THUẾ GTGT");
    expect(out).toContain("3331");
    expect(out).toContain(formatCurrency(24000000));
    expect(out).toContain(formatCurrency(1920000));
    expect(out).toContain("Cộng");
    expect(out).toContain(formatCurrency(25920000));
  });

  it("{{taiKhoanNo}}/{{taiKhoanCo}} gộp các mã duy nhất theo thứ tự xuất hiện", () => {
    const out = buildPhieuHtml(
      chungTu,
      "[{{taiKhoanNo}}|{{taiKhoanCo}}]",
      undefined,
      dong
    );
    expect(out).toContain("[131|511, 3331]");
  });

  it("{{noiDung}} nối diễn giải của mọi dòng", () => {
    const out = buildPhieuHtml(chungTu, "[{{noiDung}}]", undefined, dong);
    expect(out).toContain("[Phí tư vấn quản lý; THUẾ GTGT]");
  });

  it("thoát ký tự HTML trong diễn giải", () => {
    const out = buildPhieuHtml(chungTu, "{{bangChiTiet}}", undefined, [
      { dienGiai: "<script>x</script>", taiKhoanNo: "1", taiKhoanCo: "2", soTien: 1 },
      { dienGiai: "b", taiKhoanNo: "1", taiKhoanCo: "2", soTien: 1 },
    ]);
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("bỏ trống tham số dòng → giữ nguyên hành vi 1 dòng của chính chứng từ", () => {
    const out = buildPhieuHtml(chungTu, "{{soTien}}|{{noiDung}}");
    expect(out).toBe(`${formatCurrency(24000000)}|Phí tư vấn quản lý`);
  });
});

describe("buildPhieuHtml — tự chèn bảng vào mẫu in cũ", () => {
  const chungTu = { soPhieu: "X1", ngay: "2026-07-20", soTien: 0 } as unknown as ChungTu;

  const dong: PhieuLine[] = [
    { dienGiai: "A", taiKhoanNo: "131", taiKhoanCo: "511", soTien: 100 },
    { dienGiai: "B", taiKhoanNo: "131", taiKhoanCo: "3331", soTien: 200 },
  ];

  const mauCu = [
    "<p>Lý do: {{noiDung}}</p>",
    "<p>Số tiền: {{soTien}}</p>",
    "<p>Viết bằng chữ: {{soTienBangChu}}</p>",
  ].join("\n");

  it("mẫu thiếu {{bangChiTiet}} → chèn bảng ngay trước dòng viết bằng chữ", () => {
    const out = buildPhieuHtml(chungTu, mauCu, undefined, dong);
    expect(out).toContain("<table");
    expect(out.indexOf("<table")).toBeGreaterThan(out.indexOf("Số tiền:"));
    expect(out.indexOf("<table")).toBeLessThan(out.indexOf("Viết bằng chữ:"));
  });

  it("mẫu không có cả {{soTienBangChu}} lẫn {{soTien}} → chèn bảng ở cuối", () => {
    const out = buildPhieuHtml(chungTu, "<p>Lý do: {{noiDung}}</p>", undefined, dong);
    expect(out.indexOf("<table")).toBeGreaterThan(out.indexOf("Lý do:"));
  });

  it("mẫu đã có {{bangChiTiet}} → không chèn lặp bảng thứ hai", () => {
    const out = buildPhieuHtml(chungTu, `{{bangChiTiet}}\n${mauCu}`, undefined, dong);
    expect(out.split("<table").length - 1).toBe(1);
  });

  it("chứng từ 1 dòng → không tự chèn bảng vào mẫu cũ", () => {
    const out = buildPhieuHtml(chungTu, mauCu, undefined, [dong[0]]);
    expect(out).not.toContain("<table");
  });
});
