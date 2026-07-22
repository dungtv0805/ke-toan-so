import { describe, it, expect, vi, beforeEach } from "vitest";

// Test này khoá lại hợp đồng của sự kiện "search" trên CrudHandler: dispatch
// "search" với keyword rỗng phải xoá searchText đã áp dụng VÀ reset pagination
// về trang 1. Đây chính là hợp đồng mà handleImported()/onReset() của trang
// Nhóm khuyến mại dựa vào (dispatch "search" với keyword rỗng thay vì
// "refresh" - vốn đọc lại filter cũ đã lưu trong state).
//
// File này KHÔNG render/thực thi component trang (NhomKhuyenMaiPage...): repo
// hiện chưa có harness test component (RTL/jsdom) cho các trang danh mục, nên
// việc handleImported()/onReset() có thực sự dispatch đúng "search" hay không
// được xác minh thủ công, không phải bằng test tự động ở đây.

// Mock the service before importing the handler, so the sub-handlers
// (registered as a side effect of importing "./nhom-khuyen-mai.handler") call
// the mock instead of hitting the network.
vi.mock("@/services/nhomKhuyenMaiService", () => {
  const getPaginated = vi.fn(async ({ page = 1, limit = 10 }: { page?: number; limit?: number; search?: string }) => ({
    data: [],
    meta: { page, limit, total: 0 },
  }));
  const getStats = vi.fn(async () => ({ total: 0 }));
  return { nhomKhuyenMaiService: { getPaginated, getStats } };
});

import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import { NhomKhuyenMaiHandler } from "./nhom-khuyen-mai.handler";

const getPaginatedMock = vi.mocked(nhomKhuyenMaiService.getPaginated);

describe("NhomKhuyenMaiHandler - hợp đồng của sự kiện \"search\" (nền tảng cho fix Task 12 ở trang)", () => {
  beforeEach(() => {
    getPaginatedMock.mockClear();
  });

  it('dispatch "search" ghi searchText vào state store mà refresh()/changePage() đọc lại', async () => {
    const handler = new NhomKhuyenMaiHandler();

    await handler.executeEvent("search", { keyword: "ABC" });

    expect(handler.getState("searchText")).toBe("ABC");
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: "ABC" })
    );
  });

  it('dispatch "search" với keyword rỗng xoá filter đã áp dụng (searchText), không chỉ ô input', async () => {
    const handler = new NhomKhuyenMaiHandler();

    await handler.executeEvent("search", { keyword: "ABC" });
    expect(handler.getState("searchText")).toBe("ABC");

    // This is what handleImported() / onReset() now dispatch instead of "refresh".
    await handler.executeEvent("search", { keyword: "" });

    expect(handler.getState("searchText")).toBe("");
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: undefined })
    );

    getPaginatedMock.mockClear();
    await handler.executeEvent("refresh", {});
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: undefined })
    );
  });

  it('sự kiện "search" luôn tự reset về trang 1, độc lập với refresh()', async () => {
    const handler = new NhomKhuyenMaiHandler();

    await handler.executeEvent("changePage", { page: 3, pageSize: 50 });
    expect(handler.getState("pagination")).toMatchObject({ current: 3 });

    await handler.executeEvent("search", { keyword: "" });
    expect(handler.getState("pagination")).toMatchObject({ current: 1 });
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });
});
