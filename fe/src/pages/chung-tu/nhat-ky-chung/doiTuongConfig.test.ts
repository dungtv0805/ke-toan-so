// fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.test.ts
import { describe, it, expect } from "vitest";
import {
  getDoiTuongSelectConfig,
  getSelectedDoiTuongLoai,
} from "./doiTuongConfig";
import { DoiTuong, TaiKhoanNganHang } from "@/types";

const doiTuongList: DoiTuong[] = [
  { id: "kh1", loai: "KHACH_HANG", ma: "KH001", ten: "Cty A" },
  { id: "ncc1", loai: "NHA_CUNG_CAP", ma: "NCC001", ten: "Cty B" },
  { id: "nv1", loai: "NHAN_VIEN", ma: "NV001", ten: "Nguyễn Văn C" },
];

const nganHangList: TaiKhoanNganHang[] = [
  { id: "nh1", ma: "VCB01", ten: "Vietcombank CN1", loai: "NGAN_HANG", soDu: 0 },
  { id: "tm1", ma: "TM01", ten: "Quỹ tiền mặt", loai: "TIEN_MAT", soDu: 0 },
];

describe("getDoiTuongSelectConfig", () => {
  it("TK không khai chiTietTheo → disabled, không có options", () => {
    const cfg = getDoiTuongSelectConfig(undefined, doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(true);
    expect(cfg.options).toEqual([]);
  });

  it("chiTietTheo=KHACH_HANG → chỉ đối tượng loại KHACH_HANG", () => {
    const cfg = getDoiTuongSelectConfig("KHACH_HANG", doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(false);
    expect(cfg.options).toEqual([{ value: "kh1", label: "KH001 - Cty A" }]);
  });

  it("chiTietTheo=NGAN_HANG_QUY → danh sách ngân hàng & quỹ", () => {
    const cfg = getDoiTuongSelectConfig("NGAN_HANG_QUY", doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(false);
    expect(cfg.options).toEqual([
      { value: "nh1", label: "VCB01 - Vietcombank CN1" },
      { value: "tm1", label: "TM01 - Quỹ tiền mặt" },
    ]);
  });

  it("chiTietTheo=NHAN_VIEN → chỉ nhân viên", () => {
    const cfg = getDoiTuongSelectConfig("NHAN_VIEN", doiTuongList, nganHangList);
    expect(cfg.options).toEqual([{ value: "nv1", label: "NV001 - Nguyễn Văn C" }]);
  });
});

describe("getSelectedDoiTuongLoai", () => {
  it("id thuộc doiTuongList → trả về loai của đối tượng", () => {
    expect(getSelectedDoiTuongLoai("ncc1", doiTuongList, nganHangList)).toBe("NHA_CUNG_CAP");
  });

  it("id thuộc nganHangList → trả về NGAN_HANG_QUY", () => {
    expect(getSelectedDoiTuongLoai("nh1", doiTuongList, nganHangList)).toBe("NGAN_HANG_QUY");
  });

  it("id không tồn tại → undefined", () => {
    expect(getSelectedDoiTuongLoai("xxx", doiTuongList, nganHangList)).toBeUndefined();
  });
});
