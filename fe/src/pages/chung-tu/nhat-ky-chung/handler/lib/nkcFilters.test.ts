import { describe, it, expect } from "vitest";
import {
  NKC_COLUMN_FILTER_KEYS,
  NKC_FILTER_BAR_KEYS,
  NKC_FILTER_LABELS,
  NKC_FILTER_PARAMS,
  NKC_FILTER_STATE_KEYS,
} from "./nkcFilters";

/**
 * Ở view "Bút toán" hàng lọc bị ẩn, tiêu chí nằm hết trên header cột. Tiêu chí nào
 * không có cột thì người dùng KHÔNG lọc được ở view đó — nên phải khoá lại bằng test.
 */
const COVERED_ELSEWHERE: Record<string, string> = {
  // "Tài khoản" gộp Nợ/Có được thay bằng hai cột riêng: TK Nợ (filterAccount)
  // và TK Có (filterTaiKhoanCo).
  filterTaiKhoan: "tách thành TK Nợ / TK Có",
};

describe("NKC_COLUMN_FILTER_KEYS", () => {
  it("mọi tiêu chí trên hàng lọc đều gắn được vào một cột của bảng bút toán", () => {
    const mapped = new Set(Object.values(NKC_COLUMN_FILTER_KEYS));
    const missing = NKC_FILTER_BAR_KEYS.filter(
      (key) => !mapped.has(key) && !COVERED_ELSEWHERE[key],
    );
    expect(missing).toEqual([]);
  });

  it("hai cột thay thế cho tiêu chí Tài khoản gộp đều có mặt", () => {
    expect(NKC_COLUMN_FILTER_KEYS.taiKhoanNo).toBe("filterAccount");
    expect(NKC_COLUMN_FILTER_KEYS.taiKhoanCo).toBe("filterTaiKhoanCo");
  });

  it("cột Mã và cột Tên của cùng danh mục dùng chung một tiêu chí", () => {
    expect(NKC_COLUMN_FILTER_KEYS.duAnMa).toBe(NKC_COLUMN_FILTER_KEYS.duAn);
    expect(NKC_COLUMN_FILTER_KEYS.khoanMucMa).toBe(NKC_COLUMN_FILTER_KEYS.khoanMuc);
    // BE khớp `doiTuong` ở cả bên Nợ lẫn bên Có → 4 cột chung một tiêu chí
    expect(NKC_COLUMN_FILTER_KEYS.doiTuong2Ma).toBe(NKC_COLUMN_FILTER_KEYS.doiTuongMa);
  });

  it("mỗi tiêu chí được gắn đều có param BE và nhãn hiển thị", () => {
    for (const stateKey of Object.values(NKC_COLUMN_FILTER_KEYS)) {
      expect(NKC_FILTER_STATE_KEYS).toContain(stateKey);
      expect(NKC_FILTER_PARAMS[stateKey]).toBeTruthy();
      expect(NKC_FILTER_LABELS[stateKey]).toBeTruthy();
    }
  });
});
