// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { docCheDoXem, luuCheDoXem, CHE_DO_MAC_DINH } from "./cheDoXem";

const KHOA = "quyChuan.cheDoXem";

describe("cheDoXem", () => {
  beforeEach(() => localStorage.clear());

  it("chưa lưu gì → mặc định dạng cây", () => {
    expect(docCheDoXem(KHOA)).toBe("cay");
    expect(CHE_DO_MAC_DINH).toBe("cay");
  });

  it("lưu rồi đọc lại đúng giá trị", () => {
    luuCheDoXem(KHOA, "danhSach");
    expect(docCheDoXem(KHOA)).toBe("danhSach");
    luuCheDoXem(KHOA, "cay");
    expect(docCheDoXem(KHOA)).toBe("cay");
  });

  it("giá trị lạ trong localStorage rơi về mặc định, không nổ", () => {
    localStorage.setItem(KHOA, "linh-tinh");
    expect(docCheDoXem(KHOA)).toBe("cay");
  });
});
