import { describe, it, expect } from "vitest";
import { buildTemplateAoa } from "../template";
import { IMPORT_COLUMNS } from "../columns";

describe("buildTemplateAoa", () => {
  it("dòng đầu là header đúng thứ tự cột", () => {
    const aoa = buildTemplateAoa();
    expect(aoa[0]).toEqual(IMPORT_COLUMNS.map((c) => c.header));
  });
  it("có ít nhất 1 dòng ví dụ mẫu", () => {
    const aoa = buildTemplateAoa();
    expect(aoa.length).toBeGreaterThanOrEqual(2);
    expect(aoa[1].length).toBe(IMPORT_COLUMNS.length);
  });
});
