// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Pnl3LopTab } from "./Pnl3LopTab";

const thang = (...v: number[]) => {
  const a = Array(12).fill(0);
  v.forEach((x, i) => (a[i] = x));
  return a;
};

const lop = (dong: unknown[], doanhThuThuanNam = 0) => ({
  nam: 2026,
  dong,
  doanhThuThuanNam,
  doanhThuThuanThang: Array(12).fill(0),
  dinhPhiThang: Array(12).fill(0),
  bienPhiThang: Array(12).fill(0),
});

vi.mock("@/services/kqkd3LopService", () => ({
  kqkd3LopService: {
    layBaoCao: () =>
      Promise.resolve({
        nam: 2026,
        keHoach: lop(
          [{ key: "01", soLaMa: "I", ten: "DOANH THU", cap: 0, thang: thang(100, 100) }],
          200,
        ),
        duBao: lop([]),
        thucHien: lop(
          [{ key: "01", soLaMa: "I", ten: "DOANH THU", cap: 0, thang: thang(70, 0) }],
          70,
        ),
      }),
  },
}));

beforeAll(() => {
  // antd đo màn hình qua matchMedia; jsdom không có sẵn.
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

describe("Pnl3LopTable", () => {
  it("hàng tiêu đề trên cùng là các kỳ, xếp từ rộng tới hẹp như bảng P&L", async () => {
    const { container } = render(<Pnl3LopTab nam={2026} />);

    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());

    // Hàng 1 = tên kỳ, hàng 2 = tên khối, hàng 3 = tên cột.
    const tieuDe = Array.from(
      container.querySelectorAll(".ant-table-thead tr:first-child th"),
    ).map((th) => th.textContent?.trim());
    expect(tieuDe).toEqual([
      "Chỉ tiêu",
      "Cả năm",
      "6 tháng đầu",
      "6 tháng cuối",
      "QUÝ I",
      "QUÝ II",
      "QUÝ III",
      "QUÝ IV",
      "T1", "T2", "T3", "T4", "T5", "T6",
      "T7", "T8", "T9", "T10", "T11", "T12",
    ]);
    // Không còn ô chọn kỳ lẫn ô chọn lớp — bảng bày hết.
    expect(screen.queryByText("Kỳ xem")).toBeNull();
    expect(screen.queryByText("Xem")).toBeNull();
  });

  it("mỗi kỳ có đủ năm khối: ba lớp số liệu + hai khối so sánh", async () => {
    const { container } = render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());

    // Đếm trong MỘT thead: antd vẽ hai bảng (header cố định + thân) nên mỗi
    // tiêu đề xuất hiện hai lần trong DOM.
    const thead = container.querySelector(".ant-table-thead") as HTMLElement;
    const dem = (nhan: string) =>
      Array.from(thead.querySelectorAll("th")).filter(
        (th) => th.textContent?.trim() === nhan,
      ).length;

    for (const khoi of [
      "KẾ HOẠCH",
      "DỰ BÁO",
      "THỰC HIỆN",
      "THỰC HIỆN vs KẾ HOẠCH",
      "THỰC HIỆN vs DỰ BÁO",
    ]) {
      expect(dem(khoi)).toBe(19);
    }
    // 19 kỳ × 5 khối, mỗi khối một cột GIÁ TRỊ.
    expect(dem("GIÁ TRỊ")).toBe(19 * 5);
    // %DS và Tỷ trọng chỉ có ở ba lớp số liệu; Tỷ lệ chỉ ở hai khối so sánh.
    expect(dem("%DS")).toBe(19 * 3);
    expect(dem("Tỷ trọng")).toBe(19 * 3);
    expect(dem("Tỷ lệ")).toBe(19 * 2);
  });

  it("hiện số của cả ba lớp và số so sánh trên cùng một dòng", async () => {
    render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());

    // T1: kế hoạch 100, thực hiện 70 → chênh lệch (30).
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
    expect(screen.getAllByText("70").length).toBeGreaterThan(0);
    expect(screen.getAllByText("(30)").length).toBeGreaterThan(0);
  });

  it("có dòng DOANH THU HÒA VỐN ở cuối bảng", async () => {
    render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("DOANH THU HÒA VỐN")).toBeTruthy());
  });
});
