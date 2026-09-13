// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("dựng đủ bộ cột kỳ như bảng P&L, không còn ô chọn kỳ", async () => {
    render(<Pnl3LopTab nam={2026} />);

    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());

    for (const tieuDe of ["Năm", "6 tháng đầu", "6 tháng cuối", "Quý", "Tháng", "Q1", "Q4", "T1", "T12"]) {
      expect(screen.getAllByText(tieuDe).length).toBeGreaterThan(0);
    }
    // Lớp mặc định là Chênh lệch — không có cột "%" trên doanh thu.
    expect(screen.queryByText("Kỳ xem")).toBeNull();
    expect(screen.getByText("Xem")).toBeTruthy();
  });

  it("mặc định hiện lớp Chênh lệch: T1 hụt 30 so kế hoạch", async () => {
    render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());
    // Cả năm −130, T1 −30, T2 −100.
    expect(screen.getAllByText("−30").length).toBeGreaterThan(0);
    expect(screen.getAllByText("−130").length).toBeGreaterThan(0);
  });

  it("có dòng DOANH THU HÒA VỐN ở cuối bảng", async () => {
    render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("DOANH THU HÒA VỐN")).toBeTruthy());
  });

  it("đổi sang lớp Thực hiện: hiện số tiền và cột % trên doanh thu", async () => {
    const { container } = render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());

    fireEvent.mouseDown(container.querySelector(".ant-select") as HTMLElement);
    fireEvent.click(await screen.findByTitle("Thực hiện"));

    await waitFor(() => expect(screen.getAllByText("70").length).toBeGreaterThan(0));
    // Cột "%" chỉ xuất hiện với ba lớp số tiền.
    expect(screen.getAllByText("%").length).toBeGreaterThan(0);
    // Không còn số chênh lệch nào trên bảng.
    expect(screen.queryByText("−30")).toBeNull();
  });
});
