import { describe, it, expect } from "vitest";
import { COT_THEO_TRUONG, taoBoLocTruong } from "./truongTheoCot";

describe("taoBoLocTruong", () => {
  it("chưa từng chọn cột → hiện mọi ô", () => {
    const hien = taoBoLocTruong(null);
    expect(hien("doiTuongId")).toBe(true);
    expect(hien("ghiChu")).toBe(true);
  });

  it("tắt cả cột mã lẫn cột tên → ẩn ô tương ứng", () => {
    const hien = taoBoLocTruong(["ngay", "soTien", "duAnMa", "duAn"]);
    expect(hien("doiTuongId")).toBe(false);
    expect(hien("duAnId")).toBe(true);
  });

  it("chỉ tắt cột mã, còn cột tên → vẫn hiện (vẫn đang dùng chiều đó)", () => {
    const hien = taoBoLocTruong(["doiTuong"]);
    expect(hien("doiTuongId")).toBe(true);
  });

  it("ô xương sống không khai cột nào → luôn hiện, kể cả khi không cột nào bật", () => {
    const hien = taoBoLocTruong([]);
    for (const truong of ["stt", "nghiepVu", "noiDung", "taiKhoanNo", "taiKhoanCo", "soTien", "ngay"]) {
      expect(hien(truong), truong).toBe(true);
    }
  });

  it("ngày ghi sổ / người GD / địa chỉ theo đúng cột cùng tên", () => {
    const hien = taoBoLocTruong(["ngay", "nguoiGiaoDich"]);
    expect(hien("ngayGhiSo")).toBe(false);
    expect(hien("nguoiGiaoDich")).toBe(true);
    expect(hien("diaChi")).toBe(false);
  });

  it("mỗi ô khai ít nhất một cột", () => {
    for (const [truong, cot] of Object.entries(COT_THEO_TRUONG)) {
      expect(cot.length, `${truong} phải khai ít nhất 1 cột`).toBeGreaterThan(0);
    }
  });
});
