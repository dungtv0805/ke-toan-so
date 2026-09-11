// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PhieuListPage } from "../PhieuListPage";
import { PHIEU_CONFIG } from "../phieuConfig";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentTenant: { tenantName: "Test Co" },
    user: { isSuperAdmin: true },
    hasPermission: () => true,
  }),
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
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
    () => {};
});

const datBeRong = (w: number) => {
  Object.defineProperty(window, "innerWidth", { value: w, writable: true, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
};

afterEach(() => {
  cleanup();
  datBeRong(1440);
});

/** Ô lọc (Select) theo placeholder — cột bảng cũng tên "Đối tượng", "TK Có" nên phải khoanh vùng. */
const oLoc = (nhan: string) =>
  screen.queryByText(nhan, { selector: ".ant-select-placeholder" });

const renderTrang = () =>
  render(
    <MemoryRouter>
      <PhieuListPage config={PHIEU_CONFIG.PHIEU_THU} />
    </MemoryRouter>,
  );

/**
 * Hàng lọc Phiếu thu/chi theo màn: điện thoại gập 5 ô lọc danh mục và nút lệnh
 * chỉ còn icon; máy tính phải y hệt cũ (nút có chữ, 5 ô lọc luôn hiện).
 */
describe("PhieuListPage — hàng lọc theo màn hình", () => {
  it("máy tính: nút có chữ, 5 ô lọc luôn hiện, không có nút 'Bộ lọc khác'", () => {
    datBeRong(1440);
    renderTrang();

    expect(screen.getByRole("button", { name: /Thêm phiếu/ }).textContent).toContain(
      "Thêm phiếu",
    );
    expect(oLoc("Đối tượng")).toBeTruthy();
    expect(oLoc("TK Có")).toBeTruthy();
    expect(screen.queryByLabelText("Bộ lọc khác")).toBeNull();
  });

  it("điện thoại: nút lệnh chỉ còn icon nhưng vẫn có tên (aria-label)", () => {
    datBeRong(390);
    renderTrang();

    const them = screen.getByLabelText("Thêm phiếu");
    expect(them.textContent).toBe("");
    expect(screen.getByLabelText("Import Excel").textContent).toBe("");
    expect(screen.getByLabelText("Mẫu in").textContent).toBe("");
  });

  it("điện thoại: 5 ô lọc danh mục gập sau nút 'Bộ lọc khác', bấm mới hiện", () => {
    datBeRong(390);
    renderTrang();

    expect(oLoc("Đối tượng")).toBeNull();
    expect(oLoc("TK Có")).toBeNull();

    const nut = screen.getByLabelText("Bộ lọc khác");
    expect(nut.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(nut);

    expect(nut.getAttribute("aria-expanded")).toBe("true");
    expect(oLoc("Đối tượng")).toBeTruthy();
    expect(oLoc("TK Có")).toBeTruthy();
  });
});
