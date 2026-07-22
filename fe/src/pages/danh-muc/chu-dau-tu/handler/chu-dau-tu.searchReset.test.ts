import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the service before importing the handler, so the sub-handlers
// (registered as a side effect of importing "./chu-dau-tu.handler") call
// the mock instead of hitting the network.
vi.mock("@/services/chuDauTuService", () => {
  const getPaginated = vi.fn(async ({ page = 1, limit = 10 }: { page?: number; limit?: number; search?: string }) => ({
    data: [],
    meta: { page, limit, total: 0 },
  }));
  const getStats = vi.fn(async () => ({ total: 0 }));
  return { chuDauTuService: { getPaginated, getStats } };
});

import { chuDauTuService } from "@/services/chuDauTuService";
import { ChuDauTuHandler } from "./chu-dau-tu.handler";

const getPaginatedMock = vi.mocked(chuDauTuService.getPaginated);

describe("ChuDauTuHandler - search / reset filter (Task 12 fix)", () => {
  beforeEach(() => {
    getPaginatedMock.mockClear();
  });

  it('dispatching "search" writes searchText into the shared state store read by refresh()/changePage()', async () => {
    const handler = new ChuDauTuHandler();

    await handler.executeEvent("search", { keyword: "ABC" });

    // This is the exact key refresh() and changePage() read via this.getState("searchText").
    expect(handler.getState("searchText")).toBe("ABC");
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: "ABC" })
    );
  });

  it('dispatching "search" with an empty keyword (the post-import / reset fix) clears the applied filter, not just the input', async () => {
    const handler = new ChuDauTuHandler();

    // Simulate a user having searched "ABC" first (applied filter is now "ABC").
    await handler.executeEvent("search", { keyword: "ABC" });
    expect(handler.getState("searchText")).toBe("ABC");

    // This is what handleImported() / onReset() now dispatch instead of "refresh".
    await handler.executeEvent("search", { keyword: "" });

    // The store's searchText - the value refresh()/changePage() actually read - is genuinely cleared.
    expect(handler.getState("searchText")).toBe("");
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: undefined })
    );

    // A subsequent refresh() must now agree: no filter is re-applied.
    getPaginatedMock.mockClear();
    await handler.executeEvent("refresh", {});
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: undefined })
    );
  });

  it('the "search" event itself resets to page 1, independent of refresh()', async () => {
    const handler = new ChuDauTuHandler();

    // Move away from page 1 first (simulating changePage to page 3).
    await handler.executeEvent("changePage", { page: 3, pageSize: 50 });
    expect(handler.getState("pagination")).toMatchObject({ current: 3 });

    // Old bug: calling refresh() alone would have kept page 3 (refresh reads
    // this.getState("pagination").current, it does not reset it).
    // Fix: handleImported/onReset now dispatch "search" with an empty keyword,
    // whose handler always requests { page: 1, ... }.
    await handler.executeEvent("search", { keyword: "" });
    expect(handler.getState("pagination")).toMatchObject({ current: 1 });
    expect(getPaginatedMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });
});
