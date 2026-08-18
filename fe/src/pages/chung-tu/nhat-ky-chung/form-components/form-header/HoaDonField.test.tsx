// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HoaDonField } from "./HoaDonField";
import type { HoaDonGan } from "../../hoaDonLienKet";

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
      dispatchEvent() {
        return false;
      },
    }));
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const nut = (ten: string) => screen.getByRole("radio", { name: ten }) as HTMLInputElement;

describe("HoaDonField — loại bảng kê bám theo loại giao dịch", () => {
  it("mount khi chưa biết loại giao dịch, sau đó biết là PHIẾU THU → chuyển sang Bán ra", () => {
    // Đúng cảnh màn SỬA: FormHeader render trước khi load-data set header.
    const { rerender } = render(
      <HoaDonField loaiGiaoDich={undefined} soTienChungTu={0} value={[]} onChange={() => {}} />,
    );
    expect(nut("Mua vào").checked).toBe(true);

    rerender(
      <HoaDonField loaiGiaoDich="PHIEU_THU" soTienChungTu={0} value={[]} onChange={() => {}} />,
    );
    expect(nut("Bán ra").checked).toBe(true);
  });

  it("người dùng tự bấm Mua vào cho phiếu thu thì đổi loại giao dịch KHÔNG đè lựa chọn", () => {
    const { rerender } = render(
      <HoaDonField loaiGiaoDich="PHIEU_THU" soTienChungTu={0} value={[]} onChange={() => {}} />,
    );
    expect(nut("Bán ra").checked).toBe(true);

    fireEvent.click(nut("Mua vào"));
    expect(nut("Mua vào").checked).toBe(true);

    rerender(
      <HoaDonField loaiGiaoDich="BAO_CO" soTienChungTu={0} value={[]} onChange={() => {}} />,
    );
    expect(nut("Mua vào").checked).toBe(true);
  });

  it("PHIEU_CHI → Mua vào", () => {
    render(
      <HoaDonField loaiGiaoDich="PHIEU_CHI" soTienChungTu={0} value={[]} onChange={() => {}} />,
    );
    expect(nut("Mua vào").checked).toBe(true);
  });
});

describe("HoaDonField — hai hóa đơn TRÙNG SỐ khác nhà cung cấp", () => {
  it("hiện đủ hai chip, không bị gộp làm một", () => {
    const value: HoaDonGan[] = [
      { id: "ncc-a", soHoaDon: "000123", loai: "mua", tongThanhToan: 1_100_000 },
      { id: "ncc-b", soHoaDon: "000123", loai: "mua", tongThanhToan: 2_200_000 },
    ];
    const { container } = render(
      <HoaDonField loaiGiaoDich="PHIEU_CHI" soTienChungTu={3_300_000} value={value} onChange={() => {}} />,
    );
    expect(container.querySelectorAll(".ant-select-selection-item")).toHaveLength(2);
    expect(screen.getByText(/2 hóa đơn/)).toBeTruthy();
  });
});
