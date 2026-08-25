import { describe, expect, it } from "vitest";
import { taiKhoanKetChuyenImportConfig } from "../taiKhoanKetChuyen.config";

const cot = (key: string) =>
  taiKhoanKetChuyenImportConfig.columns.find((c) => c.key === key);

describe("taiKhoanKetChuyenImportConfig", () => {
  // Entity giữ `tenTaiKhoanTu`/`tenTaiKhoanDen` làm snapshot tên tài khoản. Thiếu hai
  // cột này thì dòng nhập bằng Excel mang snapshot tên RỖNG — đúng thứ mà hai field
  // sinh ra để tránh.
  it("có cột tên tài khoản kết chuyển từ", () => {
    expect(cot("tenTaiKhoanTu")).toBeDefined();
  });

  it("có cột tên tài khoản kết chuyển đến", () => {
    expect(cot("tenTaiKhoanDen")).toBeDefined();
  });

  it("hai cột tên không bắt buộc — file cũ không có hai cột này vẫn nhập được", () => {
    expect(cot("tenTaiKhoanTu")?.required).toBeFalsy();
    expect(cot("tenTaiKhoanDen")?.required).toBeFalsy();
  });

  it("hai cột tên có ví dụ trong file mẫu", () => {
    expect(cot("tenTaiKhoanTu")?.example).toBeTruthy();
    expect(cot("tenTaiKhoanDen")?.example).toBeTruthy();
  });

  it("cột tên đứng ngay sau cột mã tài khoản tương ứng", () => {
    const keys = taiKhoanKetChuyenImportConfig.columns.map((c) => c.key);

    expect(keys.indexOf("tenTaiKhoanTu")).toBe(keys.indexOf("taiKhoanTu") + 1);
    expect(keys.indexOf("tenTaiKhoanDen")).toBe(keys.indexOf("taiKhoanDen") + 1);
  });
});
