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
  it("cột xếp theo tháng → quý của chính ba tháng đó → 6 tháng → cả năm", async () => {
    const { container } = render(<Pnl3LopTab nam={2026} />);

    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());

    // Hàng tiêu đề THỨ NHẤT là hàng tên kỳ; hàng thứ hai là Số tiền/%DS/Tỷ trọng.
    const tieuDe = Array.from(
      container.querySelectorAll(".ant-table-thead tr:first-child th"),
    ).map((th) => th.textContent?.trim());
    // Ba tháng rồi tới quý của chính chúng, hết bốn quý mới tới 6 tháng và năm.
    expect(tieuDe.slice(0, 6)).toEqual([
      "Chỉ tiêu",
      "T1",
      "T2",
      "T3",
      "QUÝ I",
      "T4",
    ]);
    expect(tieuDe.slice(-3)).toEqual(["6 tháng đầu", "6 tháng cuối", "Cả năm"]);
    // Không còn cụm "Quý"/"Tháng" gộp của bố cục cũ, cũng không còn ô chọn kỳ.
    expect(tieuDe).not.toContain("Quý");
    expect(tieuDe).not.toContain("Tháng");
    expect(screen.queryByText("Kỳ xem")).toBeNull();
    expect(screen.getByText("Xem")).toBeTruthy();
  });

  it("mặc định hiện lớp Thực hiện — đúng dạng bảng nghiệp vụ", async () => {
    render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());
    // Thực hiện T1 = 70; chưa có số chênh lệch nào.
    expect(screen.getAllByText("70").length).toBeGreaterThan(0);
    expect(screen.queryByText("−30")).toBeNull();
  });

  it("có dòng DOANH THU HÒA VỐN ở cuối bảng", async () => {
    render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("DOANH THU HÒA VỐN")).toBeTruthy());
  });

  it("đổi sang lớp Chênh lệch: mỗi kỳ rút còn một cột, bỏ %DS/Tỷ trọng", async () => {
    const { container } = render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getByText("I. DOANH THU")).toBeTruthy());

    fireEvent.mouseDown(container.querySelector(".ant-select") as HTMLElement);
    fireEvent.click(await screen.findByTitle("Chênh lệch"));

    // Cả năm −130, T1 −30, T2 −100.
    await waitFor(() => expect(screen.getAllByText("−30").length).toBeGreaterThan(0));
    expect(screen.getAllByText("−130").length).toBeGreaterThan(0);
    expect(screen.queryByText("%DS")).toBeNull();
    expect(screen.queryByText("Tỷ trọng")).toBeNull();
  });

  it("lớp Thực hiện: mỗi kỳ là cụm Số tiền · %DS · Tỷ trọng", async () => {
    const { container } = render(<Pnl3LopTab nam={2026} />);
    await waitFor(() => expect(screen.getAllByText("70").length).toBeGreaterThan(0));
    // 19 kỳ, mỗi kỳ một bộ ba cột. Đếm trong MỘT thead: antd vẽ hai bảng
    // (header cố định + thân) nên mỗi tiêu đề xuất hiện hai lần trong DOM.
    const thead = container.querySelector(".ant-table-thead") as HTMLElement;
    const demNhan = (nhan: string) =>
      Array.from(thead.querySelectorAll("th")).filter(
        (th) => th.textContent?.trim() === nhan,
      ).length;
    expect(demNhan("Số tiền")).toBe(19);
    expect(demNhan("%DS")).toBe(19);
    expect(demNhan("Tỷ trọng")).toBe(19);
    // Không còn số chênh lệch nào trên bảng.
    expect(screen.queryByText("−30")).toBeNull();
  });
});
