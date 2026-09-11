// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { GanChungTuModal, type HoaDonGan } from "./GanChungTuModal";

const getEntries = vi.fn();
vi.mock("@/services/nhatKyChungService", () => ({
  nhatKyChungService: { getEntries: (...a: unknown[]) => getEntries(...a) },
}));

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = w.ResizeObserver;
});

const HD: HoaDonGan = {
  soHoaDon: "00000012",
  ngayHoaDon: "2026-09-08",
  mst: "0101277953",
  tenDoiTac: "Công ty A",
  tongThanhToan: 25_000_000,
  giaTriChuaThue: 23_148_149,
};

const but = (soPhieu: string, ngay: string, soTien: number, soHopDong?: string) => ({
  soPhieu,
  ngay,
  dienGiai: `Diễn giải ${soPhieu}`,
  soTien,
  danhMuc: soHopDong ? { hopDong: { soHopDong } } : {},
});

describe("GanChungTuModal", () => {
  beforeEach(() => getEntries.mockReset());

  it("mở ra là GỢI Ý ngay theo MST — không bắt gõ rồi Enter", async () => {
    getEntries.mockResolvedValue({
      data: [but("PC09", "2026-09-08", 5), but("PT33", "2026-09-01", 25_000_000, "DH128")],
    });
    render(<GanChungTuModal open hoaDon={HD} onCancel={() => {}} onChon={() => {}} />);

    await waitFor(() => expect(screen.getByText("PT33")).toBeTruthy());
    expect(getEntries).toHaveBeenCalledWith({ mst: "0101277953", limit: 100 });
    // Khớp số tiền lên đầu, có nhãn "Khớp", hiện đơn hàng của chứng từ.
    const hang = screen.getAllByRole("row").filter((r) => within(r).queryByText(/^P[CT]\d+$/));
    expect(within(hang[0]).getByText("PT33")).toBeTruthy();
    expect(within(hang[0]).getByText("Khớp")).toBeTruthy();
    expect(within(hang[0]).getByText("DH128")).toBeTruthy();
  });

  it("gõ thì tìm theo từ khóa (không cần Enter)", async () => {
    getEntries.mockResolvedValue({ data: [] });
    render(<GanChungTuModal open hoaDon={HD} onCancel={() => {}} onChon={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Tìm số phiếu/), { target: { value: "DH128" } });
    await waitFor(() =>
      expect(getEntries).toHaveBeenLastCalledWith({ search: "DH128", limit: 100 }),
    );
  });

  it("nút Chọn gửi đúng số phiếu", async () => {
    getEntries.mockResolvedValue({ data: [but("PT01/26", "2026-09-08", 25_000_000)] });
    const onChon = vi.fn();
    render(<GanChungTuModal open hoaDon={HD} onCancel={() => {}} onChon={onChon} />);
    await waitFor(() => expect(screen.getByText("PT01/26")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Chọn" }));
    expect(onChon).toHaveBeenCalledWith("PT01/26");
  });

  it("hóa đơn không có MST: không gọi API, báo cần gõ để tìm", async () => {
    render(
      <GanChungTuModal open hoaDon={{ ...HD, mst: undefined }} onCancel={() => {}} onChon={() => {}} />,
    );
    expect(screen.getByText(/chưa có MST/)).toBeTruthy();
    expect(getEntries).not.toHaveBeenCalled();
  });
});
