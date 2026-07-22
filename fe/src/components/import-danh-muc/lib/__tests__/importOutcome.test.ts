import { describe, it, expect } from "vitest";
import { resolveImportOutcome } from "../importOutcome";
import type { RowValidationResult } from "../../types";
import type { ImportApiResult } from "@/services/importDanhMucService";

const results: RowValidationResult[] = [
  { rowNumber: 2, display: "A", errors: [], payload: { ma: "A" } },
  { rowNumber: 3, display: "B", errors: [], payload: { ma: "B" } },
  { rowNumber: 4, display: "C", errors: [], payload: { ma: "C" } },
];

describe("resolveImportOutcome", () => {
  it('thành công toàn phần (không có dòng lỗi từ BE) → kind "success"', () => {
    const res: ImportApiResult = { created: 3, failed: [] };
    const outcome = resolveImportOutcome(results, res);

    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.created).toBe(3);
    }
  });

  it('có dòng lỗi từ BE → kind "partial", đổ đúng lỗi vào dòng tương ứng và giữ nguyên các dòng còn lại', () => {
    const res: ImportApiResult = {
      created: 2,
      failed: [{ index: 1, message: "Mã B đã tồn tại" }],
    };
    const outcome = resolveImportOutcome(results, res);

    expect(outcome.kind).toBe("partial");
    if (outcome.kind === "partial") {
      expect(outcome.created).toBe(2);
      expect(outcome.failedCount).toBe(1);
      const rowB = outcome.results.find((r) => r.rowNumber === 3);
      expect(rowB?.errors).toEqual(["Mã B đã tồn tại"]);
      expect(rowB?.payload).toBeNull();
      // Các dòng không lỗi phải giữ nguyên, không bị đổi payload.
      const rowA = outcome.results.find((r) => r.rowNumber === 2);
      expect(rowA?.errors).toEqual([]);
      expect(rowA?.payload).toEqual({ ma: "A" });
    }
  });

  it("tất cả các dòng đều lỗi (created = 0) vẫn phải là partial, không phải success", () => {
    const res: ImportApiResult = {
      created: 0,
      failed: [
        { index: 0, message: "Mã A đã tồn tại" },
        { index: 1, message: "Mã B đã tồn tại" },
        { index: 2, message: "Mã C đã tồn tại" },
      ],
    };
    const outcome = resolveImportOutcome(results, res);

    expect(outcome.kind).toBe("partial");
    if (outcome.kind === "partial") {
      expect(outcome.created).toBe(0);
      expect(outcome.failedCount).toBe(3);
    }
  });
});

/**
 * Đây chính là nhánh mà lỗi Critical đã ẩn: cả 2 kết quả (thành công toàn phần và một
 * phần) đều gọi `params.onSuccess?.()` giống hệt nhau, nên modal không thể biết để đóng
 * hay ở lại. Test dưới mô phỏng đúng cách `submit.handler.ts` dùng `resolveImportOutcome`
 * để quyết định gọi callback nào — không dựng CSubHanlder/CHanlder thật (cần Provider,
 * DI, effect subscription... không cần thiết cho riêng quyết định này).
 */
describe("submit.handler.ts dùng resolveImportOutcome để chọn callback (mô phỏng nhánh outcome)", () => {
  function runOutcomeBranch(
    res: ImportApiResult,
    callbacks: { onImported?: () => void; onSuccess?: () => void },
  ) {
    const outcome = resolveImportOutcome(results, res);
    if (outcome.kind === "partial") {
      callbacks.onImported?.();
      return outcome;
    }
    callbacks.onImported?.();
    callbacks.onSuccess?.();
    return outcome;
  }

  it("thành công toàn phần → gọi onImported VÀ onSuccess (modal phải đóng)", () => {
    let importedCalled = false;
    let successCalled = false;
    runOutcomeBranch(
      { created: 3, failed: [] },
      {
        onImported: () => {
          importedCalled = true;
        },
        onSuccess: () => {
          successCalled = true;
        },
      },
    );

    expect(importedCalled).toBe(true);
    expect(successCalled).toBe(true);
  });

  it("thành công một phần → CHỈ gọi onImported (trang cha nạp lại), KHÔNG gọi onSuccess (modal phải ở lại)", () => {
    let importedCalled = false;
    let successCalled = false;
    runOutcomeBranch(
      { created: 2, failed: [{ index: 1, message: "Mã B đã tồn tại" }] },
      {
        onImported: () => {
          importedCalled = true;
        },
        onSuccess: () => {
          successCalled = true;
        },
      },
    );

    expect(importedCalled).toBe(true);
    expect(successCalled).toBe(false);
  });
});
