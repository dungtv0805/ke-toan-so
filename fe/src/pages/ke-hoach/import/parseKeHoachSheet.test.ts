import { describe, it, expect } from "vitest";
import { IMPORT_COLUMNS, parseKeHoachSheet, normalizeNgay } from "./parseKeHoachSheet";
import type { DanhMucLists } from "../lib/keHoachRow";

const lists: DanhMucLists = {
  taiKhoanList: [
    { ma: "511", ten: "Doanh thu" },
    { ma: "131", ten: "Phải thu" },
  ],
  doiTuongList: [{ ma: "KH01", ten: "Công ty A", loai: ["KHACH_HANG"] }],
  duAnList: [{ ma: "DA01", ten: "Dự án A" }],
  boPhanList: [{ ma: "BP01", ten: "Phòng KD" }],
  sanPhamList: [{ ma: "SP01", ten: "Sản phẩm 1" }],
  dongTienList: [{ ma: "DT01", ten: "Thu bán hàng" }],
  khoanMucList: [{ ma: "KM01", ten: "Doanh thu dịch vụ", nhom: "NKM1" }],
  nhomQuanLyList: [{ ma: "NQL1", ten: "Khối KD" }],
  chuDauTuList: [{ ma: "CDT1", ten: "Chủ đầu tư 1" }],
  nhomKhoanMucList: [{ ma: "NKM1", ten: "Nhóm doanh thu" }],
};

const header = IMPORT_COLUMNS.map((c) => c.header);
/** Dựng một dòng sheet theo đúng thứ tự cột của file mẫu. */
const dong = (giaTri: Partial<Record<string, unknown>>) =>
  IMPORT_COLUMNS.map((c) => giaTri[c.key] ?? "");

describe("normalizeNgay", () => {
  it("đọc được số serial của Excel", () => {
    expect(normalizeNgay(45658)?.slice(0, 10)).toBe("2025-01-01");
  });

  it("đọc được dd/mm/yyyy", () => {
    expect(normalizeNgay("15/03/2026")?.slice(0, 10)).toBe("2026-03-15");
  });

  it("đọc được yyyy-mm-dd", () => {
    expect(normalizeNgay("2026-03-15")?.slice(0, 10)).toBe("2026-03-15");
  });

  it("giá trị rác trả null", () => {
    expect(normalizeNgay("hôm qua")).toBeNull();
  });
});

describe("parseKeHoachSheet", () => {
  it("bỏ dòng header và dòng trống", () => {
    const res = parseKeHoachSheet(
      [header, [], dong({ ngay: "01/01/2026", taiKhoanCo: "511", soTien: 1000 })],
      lists,
      "KE_HOACH",
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].rowNumber).toBe(3);
  });

  it("dựng payload đủ chiều từ mã", () => {
    const res = parseKeHoachSheet(
      [
        header,
        dong({
          ngay: "01/03/2026",
          nghiepVu: "Bán hàng",
          noiDung: "Doanh thu T3",
          taiKhoanNo: "131",
          taiKhoanCo: "511",
          soTien: "1.500.000",
          doiTuong: "KH01",
          duAn: "DA01",
          khoanMuc: "KM01",
        }),
      ],
      lists,
      "DU_BAO",
      "KH 2026",
    );
    const { payload, loi } = res.rows[0];
    expect(loi).toBeNull();
    expect(payload).toMatchObject({
      loaiKeHoach: "DU_BAO",
      phienBan: "KH 2026",
      soTien: 1500000,
      noiDung: "Doanh thu T3",
    });
    expect(payload.danhMuc?.taiKhoanCo?.ma).toBe("511");
    expect(payload.danhMuc?.doiTuong?.ma).toBe("KH01");
    expect(payload.danhMuc?.duAn?.ma).toBe("DA01");
  });

  it("chấp nhận ô dạng 'MÃ - Tên' do dropdown của file mẫu sinh ra", () => {
    const res = parseKeHoachSheet(
      [header, dong({ ngay: "01/03/2026", taiKhoanCo: "511 - Doanh thu", soTien: 10 })],
      lists,
      "KE_HOACH",
    );
    expect(res.rows[0].payload.danhMuc?.taiKhoanCo?.ma).toBe("511");
  });

  it("báo lỗi khi mã tài khoản không có trong danh mục", () => {
    const res = parseKeHoachSheet(
      [header, dong({ ngay: "01/03/2026", taiKhoanCo: "999", soTien: 10 })],
      lists,
      "KE_HOACH",
    );
    expect(res.rows[0].loi).toMatch(/999/);
  });

  it("báo lỗi khi thiếu ngày hoặc số tiền", () => {
    const res = parseKeHoachSheet(
      [
        header,
        dong({ taiKhoanCo: "511", soTien: 10 }),
        dong({ ngay: "01/03/2026", taiKhoanCo: "511", soTien: 0 }),
      ],
      lists,
      "KE_HOACH",
    );
    expect(res.rows[0].loi).toMatch(/ngày/i);
    expect(res.rows[1].loi).toMatch(/số tiền/i);
  });

  it("đếm số dòng hợp lệ và số dòng lỗi", () => {
    const res = parseKeHoachSheet(
      [
        header,
        dong({ ngay: "01/03/2026", taiKhoanCo: "511", soTien: 10 }),
        dong({ ngay: "", taiKhoanCo: "511", soTien: 10 }),
      ],
      lists,
      "KE_HOACH",
    );
    expect(res.soDongHopLe).toBe(1);
    expect(res.soDongLoi).toBe(1);
  });
});
