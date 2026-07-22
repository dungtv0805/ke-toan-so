import { describe, it, expect, vi, beforeEach } from "vitest";

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

describe("NhomKhuyenMaiHandler - search / reset filter (Task 12 fix)", () => {
  beforeEach(() => {
    getPaginatedMock.mockClear();
  });

  it('dispatching "search" writes searchText into the shared state store read by refresh()/changePage()', async () => {
    const handler = new NhomKhuyenMaiHandler();

    await handler.executeEvent("search", { keyword: "ABC" });

    expect(handler.getState("searchText")).toBe("ABC");
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: "ABC" })
    );
  });

  it('dispatching "search" with an empty keyword (the post-import / reset fix) clears the applied filter, not just the input', async () => {
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

  it('the "search" event itself resets to page 1, independent of refresh()', async () => {
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
