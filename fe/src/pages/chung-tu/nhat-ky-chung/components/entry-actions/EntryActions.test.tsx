// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const permission = {
  canCreate: true,
  canEdit: true,
  canDelete: true,
};

vi.mock("@/hooks/usePagePermission", () => ({
  usePagePermission: () => permission,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentTenant: { tenantName: "Cty A" } }),
}));

const openViewModal = vi.fn();
vi.mock("../../NhatKyChungHandlerContext", () => ({
  useNhatKyChungHandler: () => ({
    executeEvent: (name: string, params: unknown) => {
      if (name === "openViewModal") openViewModal(params);
    },
  }),
  useNhatKyChungState: (key: string) =>
    key === "editingRowId" ? [null] : [false],
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
  w.getComputedStyle =
    w.getComputedStyle ||
    (() => ({ getPropertyValue: () => "" }) as unknown as CSSStyleDeclaration);
});

const entry = {
  id: "e1",
  soPhieu: "PT001/2026",
  loaiChungTu: "Phiếu thu",
  soTien: 1000,
} as never;

async function renderActions() {
  const { EntryActions } = await import("./EntryActions");
  return render(
    <MemoryRouter>
      <EntryActions entry={entry} />
    </MemoryRouter>,
  );
}

describe("EntryActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permission.canCreate = true;
    permission.canEdit = true;
    permission.canDelete = true;
  });

  it("nút chính là Xem, bấm thì mở modal chi tiết", async () => {
    await renderActions();

    const xem = screen.getByText("Xem");
    fireEvent.click(xem);

    expect(openViewModal).toHaveBeenCalledWith({ entry });
  });

  it("mũi tên mở đủ Sửa / Nhân bản / In / Xóa", async () => {
    const { container } = await renderActions();

    const caret = container.querySelector(".ant-dropdown-trigger")!;
    fireEvent.click(caret);

    for (const nhan of ["Sửa", "Nhân bản", "In", "Xóa"]) {
      expect(screen.getByText(nhan)).toBeTruthy();
    }
  });

  it("không có quyền sửa/thêm/xóa thì menu chỉ còn In", async () => {
    permission.canCreate = false;
    permission.canEdit = false;
    permission.canDelete = false;

    const { container } = await renderActions();
    fireEvent.click(container.querySelector(".ant-dropdown-trigger")!);

    expect(screen.getByText("In")).toBeTruthy();
    expect(screen.queryByText("Sửa")).toBeNull();
    expect(screen.queryByText("Nhân bản")).toBeNull();
    expect(screen.queryByText("Xóa")).toBeNull();
  });
});
