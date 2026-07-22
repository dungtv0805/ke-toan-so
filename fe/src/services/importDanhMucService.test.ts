import { describe, it, expect, vi, afterEach } from "vitest";
import { importDanhMucService } from "./importDanhMucService";
import type { ImportDanhMucConfig } from "@/components/import-danh-muc/types";

const config = {
  title: "Bộ phận",
  resource: "bo-phan",
  service: { getAll: async () => [] },
  uniqueBy: ["ma"],
  columns: [],
} as ImportDanhMucConfig;

describe("importDanhMucService.importItems", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gửi request với timeout dài hơn hẳn timeout mặc định (30s) của mọi request khác", async () => {
    const postSpy = vi
      .spyOn(importDanhMucService, "post")
      .mockResolvedValue({ created: 0, failed: [] });

    await importDanhMucService.importItems(config, [{ ma: "BP01" }]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [, options] = postSpy.mock.calls[0];
    expect(options?.endpoint).toBe("/master-data/import/bo-phan");
    expect(options?.timeout).toBeGreaterThan(30000);
  });
});
