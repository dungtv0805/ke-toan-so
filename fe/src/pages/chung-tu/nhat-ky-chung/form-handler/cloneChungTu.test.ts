import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import { buildCloneFromLoaded } from "./cloneChungTu";
import type { ChungTuHeader, ChungTuChiTiet } from "./sub-handler/init/init.state";

const header: ChungTuHeader = {
  soPhieu: "PT0001",
  ngay: dayjs("2025-01-15"),
  ngayGhiSo: dayjs("2025-01-20"),
  loaiGiaoDich: "PHIEU_THU",
  loai: "BAN_HANG",
  loaiTen: "Bán hàng",
  dienGiaiChung: "Thu tiền bán hàng",
  nguoiGiaoDich: "Nguyễn Văn A",
  diaChi: "Hà Nội",
  ghiChu: "ghi chú",
};

const chiTietList: ChungTuChiTiet[] = [
  {
    key: "id-1",
    id: "id-1",
    taiKhoanNo: "1111",
    taiKhoanCo: "5111",
    soTien: 1000,
    noiDung: "Dòng 1",
    nghiepVu: "BH01",
    nghiepVuTen: "Bán hàng thu tiền",
    doiTuongId: "dt-1",
    doiTuongSnapshot: { ma: "KH01", ten: "Khách hàng 1" },
    khoanMucSnapshot: { ma: "KM01", ten: "Doanh thu" },
  },
  {
    key: "id-2",
    id: "id-2",
    taiKhoanNo: "1121",
    taiKhoanCo: "5111",
    soTien: 2000,
    noiDung: "Dòng 2",
    nghiepVu: "BH01",
  },
];

const today = dayjs("2026-07-27");
let counter = 0;
const genKey = () => `new-key-${++counter}`;

describe("buildCloneFromLoaded", () => {
  it("bỏ số phiếu để backend sinh số mới", () => {
    const result = buildCloneFromLoaded(header, chiTietList, today, genKey);
    expect(result.header.soPhieu).toBeUndefined();
  });

  it("đặt ngày chứng từ và ngày ghi sổ = ngày hiện tại", () => {
    const result = buildCloneFromLoaded(header, chiTietList, today, genKey);
    expect(result.header.ngay.isSame(today, "day")).toBe(true);
    expect(result.header.ngayGhiSo?.isSame(today, "day")).toBe(true);
  });

  it("giữ nguyên các thông tin còn lại của header", () => {
    const result = buildCloneFromLoaded(header, chiTietList, today, genKey);
    expect(result.header.loaiGiaoDich).toBe("PHIEU_THU");
    expect(result.header.loai).toBe("BAN_HANG");
    expect(result.header.loaiTen).toBe("Bán hàng");
    expect(result.header.dienGiaiChung).toBe("Thu tiền bán hàng");
    expect(result.header.nguoiGiaoDich).toBe("Nguyễn Văn A");
    expect(result.header.diaChi).toBe("Hà Nội");
    expect(result.header.ghiChu).toBe("ghi chú");
  });

  it("bỏ id từng dòng chi tiết và cấp key mới", () => {
    const result = buildCloneFromLoaded(header, chiTietList, today, genKey);
    expect(result.chiTietList).toHaveLength(2);
    result.chiTietList.forEach((ct) => {
      expect(ct.id).toBeUndefined();
      expect(ct.key).toMatch(/^new-key-/);
    });
    const keys = result.chiTietList.map((ct) => ct.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("giữ nguyên hạch toán và toàn bộ snapshot danh mục", () => {
    const result = buildCloneFromLoaded(header, chiTietList, today, genKey);
    const [first] = result.chiTietList;
    expect(first.taiKhoanNo).toBe("1111");
    expect(first.taiKhoanCo).toBe("5111");
    expect(first.soTien).toBe(1000);
    expect(first.noiDung).toBe("Dòng 1");
    expect(first.nghiepVu).toBe("BH01");
    expect(first.nghiepVuTen).toBe("Bán hàng thu tiền");
    expect(first.doiTuongId).toBe("dt-1");
    expect(first.doiTuongSnapshot).toEqual({ ma: "KH01", ten: "Khách hàng 1" });
    expect(first.khoanMucSnapshot).toEqual({ ma: "KM01", ten: "Doanh thu" });
  });

  it("không thay đổi dữ liệu gốc", () => {
    buildCloneFromLoaded(header, chiTietList, today, genKey);
    expect(header.soPhieu).toBe("PT0001");
    expect(header.ngay.isSame(dayjs("2025-01-15"), "day")).toBe(true);
    expect(chiTietList[0].id).toBe("id-1");
  });

  it("dùng ngày chứng từ làm ngày ghi sổ khi bản gốc không có ngày ghi sổ", () => {
    const { ngayGhiSo: _ngayGhiSo, ...noNgayGhiSo } = header;
    const result = buildCloneFromLoaded(noNgayGhiSo, chiTietList, today, genKey);
    expect(result.header.ngayGhiSo?.isSame(today, "day")).toBe(true);
  });
});
