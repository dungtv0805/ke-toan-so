// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddQuyChuanModal } from "../QuickAddQuyChuanModal";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

const tkOpts = [{ value: "152", label: "152 - Vật tư" }, { value: "331", label: "331 - Phải trả NCC" }];

describe("QuickAddQuyChuanModal", () => {
  it("hiển thị nhãn Loại GD read-only", () => {
    render(<QuickAddQuyChuanModal open onClose={() => {}} loaiGiaoDichLabel="Mua hàng" taiKhoanOptions={tkOpts} onSubmit={vi.fn()} />);
    expect(screen.getByText("Mua hàng")).toBeTruthy();
  });

  it("không gọi onSubmit khi thiếu trường bắt buộc", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddQuyChuanModal open onClose={() => {}} loaiGiaoDichLabel="Mua hàng" taiKhoanOptions={tkOpts} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });
});
