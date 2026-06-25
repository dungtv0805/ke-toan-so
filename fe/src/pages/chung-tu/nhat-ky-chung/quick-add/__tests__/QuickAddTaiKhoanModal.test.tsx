// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddTaiKhoanModal } from "../QuickAddTaiKhoanModal";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

describe("QuickAddTaiKhoanModal", () => {
  it("không gọi onSubmit khi thiếu mã/tên/loại/nhóm", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddTaiKhoanModal open onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  it("mặc định cấp độ = 1", () => {
    render(<QuickAddTaiKhoanModal open onClose={() => {}} onSubmit={vi.fn()} />);
    expect((screen.getByDisplayValue("1") as HTMLInputElement)).toBeTruthy();
  });
});
