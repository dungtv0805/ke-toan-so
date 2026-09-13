// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { KqkdTab } from "./KqkdTab";

vi.mock("@/services/kqkdKeHoachService", () => ({
  kqkdKeHoachService: {
    layBaoCao: () =>
      Promise.resolve({
        nam: 2026,
        doanhThuThuanNam: 100,
        doanhThuThuanThang: Array(12).fill(0),
        dinhPhiThang: Array(12).fill(0),
        bienPhiThang: Array(12).fill(0),
        dong: [
          { key: "01", soLaMa: "I", ten: "DOANH THU", cap: 0, thang: Array(12).fill(10) },
        ],
      }),
  },
}));

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    (((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia);
  window.ResizeObserver =
    window.ResizeObserver ||
    (class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver);
});

describe("KqkdTable", () => {
  it("mang class kh-bang — cột ghim mới có nền đục", async () => {
    // Mọi quy tắc "ô ghim phải đục" trong index.css đều khai dưới `.kh-bang`.
    // Bảng có cột ghim mà thiếu class này thì ô ghim trong suốt, phần bảng
    // đang cuộn hiện xuyên qua và chữ chồng lên nhau.
    const { container } = render(<KqkdTab nam={2026} loaiKeHoach="KE_HOACH" />);
    await waitFor(() =>
      expect(container.querySelector(".ant-table-wrapper")).toBeTruthy(),
    );
    expect(container.querySelector(".ant-table-wrapper.kh-bang")).toBeTruthy();
  });
});
