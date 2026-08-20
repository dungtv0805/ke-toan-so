// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { docCheDoXem, luuCheDoXem, CHE_DO_MAC_DINH } from "./cheDoXem";

describe("cheDoXem", () => {
  beforeEach(() => localStorage.clear());

  it("chưa lưu gì → mặc định dạng cây", () => {
    expect(docCheDoXem()).toBe("cay");
    expect(CHE_DO_MAC_DINH).toBe("cay");
  });

  it("lưu rồi đọc lại đúng giá trị", () => {
    luuCheDoXem("danhSach");
    expect(docCheDoXem()).toBe("danhSach");
    luuCheDoXem("cay");
    expect(docCheDoXem()).toBe("cay");
  });

  it("giá trị lạ trong localStorage rơi về mặc định, không nổ", () => {
    localStorage.setItem("quyChuan.cheDoXem", "linh-tinh");
    expect(docCheDoXem()).toBe("cay");
  });
});
