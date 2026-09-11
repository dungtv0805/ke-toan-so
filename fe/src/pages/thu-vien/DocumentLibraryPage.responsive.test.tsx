// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, act, cleanup, waitFor } from "@testing-library/react";
import { DocumentLibraryPage } from "./DocumentLibraryPage";

vi.mock("@/hooks/usePagePermission", () => ({
  usePagePermission: () => ({
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    canView: true,
  }),
}));

vi.mock("@/services/taiLieuService", () => ({
  taiLieuService: {
    list: vi.fn(async () => [
      {
        _id: "t1",
        category: "quy-trinh",
        title: "Quy trình thu tiền",
        moTa: "Mô tả",
        type: "file",
        mimeType: "application/pdf",
        size: 2048,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ]),
  },
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

/** Tiêu đề cột theo thứ tự hiển thị (bỏ cột icon không có chữ). */
const tieuDeCot = (container: HTMLElement) =>
  [...container.querySelectorAll(".ant-table-thead th")]
    .map((th) => th.textContent?.trim() ?? "")
    .filter(Boolean);

/**
 * Thư viện tài liệu dùng cho 22 route. Điện thoại: bảng rộng 800px nên cột Thao tác
 * (Xem/Tải/Xoá) phải đứng ngay sau Tiêu đề, không bắt vuốt hết bảng mới bấm được.
 * Máy tính: y hệt cũ — Thao tác ở cuối, ghim phải.
 */
describe("DocumentLibraryPage — thứ tự cột theo màn hình", () => {
  it("máy tính: Thao tác ở cuối và vẫn ghim phải", async () => {
    datBeRong(1440);
    const { container, findByText } = render(
      <DocumentLibraryPage category="quy-trinh" label="Quy trình" />,
    );
    await findByText("Quy trình thu tiền");

    const cot = tieuDeCot(container);
    expect(cot[0]).toMatch(/^Tiêu đề/);
    expect(cot[cot.length - 1]).toBe("Thao tác");
    const thThaoTac = [...container.querySelectorAll(".ant-table-thead th")].find(
      (th) => th.textContent?.trim() === "Thao tác",
    )!;
    expect(thThaoTac.className).toMatch(/ant-table-cell-fix-(end|right)/);
  });

  it("điện thoại: Thao tác ngay sau Tiêu đề, thành cột thường", async () => {
    datBeRong(375);
    const { container, findByText } = render(
      <DocumentLibraryPage category="quy-trinh" label="Quy trình" />,
    );
    await findByText("Quy trình thu tiền");

    await waitFor(() => {
      const cot = tieuDeCot(container);
      expect(cot[0]).toMatch(/^Tiêu đề/);
      expect(cot[1]).toBe("Thao tác");
    });
    const thThaoTac = [...container.querySelectorAll(".ant-table-thead th")].find(
      (th) => th.textContent?.trim() === "Thao tác",
    )!;
    expect(thThaoTac.className).not.toMatch(/ant-table-cell-fix/);
    // Không mất cột nào khi đổi chỗ.
    expect(tieuDeCot(container)).toHaveLength(5);
  });
});
