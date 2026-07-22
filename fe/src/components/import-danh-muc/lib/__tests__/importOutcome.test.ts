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

  it('có dòng lỗi từ BE → kind "partial", đổ đúng lỗi vào dòng tương ứng; các dòng đã gửi và KHÔNG lỗi được đánh dấu created + null hoá payload (Fix 4)', () => {
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
      expect(rowB?.created).toBeFalsy();
      // Các dòng đã gửi lên BE và không nằm trong danh sách lỗi ⇒ đã được tạo thành công:
      // đánh dấu created = true và null hoá payload để không bao giờ bị gửi lại.
      const rowA = outcome.results.find((r) => r.rowNumber === 2);
      expect(rowA?.errors).toEqual([]);
      expect(rowA?.created).toBe(true);
      expect(rowA?.payload).toBeNull();
      const rowC = outcome.results.find((r) => r.rowNumber === 4);
      expect(rowC?.created).toBe(true);
      expect(rowC?.payload).toBeNull();
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
 * QUAN TRỌNG (Fix 8): describe block dưới đây KHÔNG gọi `submit.handler.ts` thật — nó tự
 * định nghĩa lại `runOutcomeBranch` bên trong file test, mô phỏng lại đúng cách handler
 * đang if/else theo `outcome.kind`. Vì vậy các test này chỉ chứng minh MỘT ĐIỀU: nếu ai đó
 * viết một hàm if/else theo `outcome.kind` giống hệt thế này thì nó gọi đúng callback — chứ
 * KHÔNG chứng minh rằng `submit.handler.ts` thật sự làm đúng như vậy. Nếu wiring thật trong
 * `submit.handler.ts` bị đổi/hỏng (vd gọi nhầm `onSuccess` cho cả nhánh partial), các test
 * này vẫn xanh như thường vì chúng không hề chạm vào file đó. Phần bọc CSubHanlder/CHanlder
 * (Provider, DI, effect subscription...) cần để test `submit.handler.ts` thật không có ở
 * đây — đây là khoảng trống chưa được test, không phải bài test end-to-end.
 */
describe("hàm nội bộ mô phỏng lại nhánh if/else theo outcome.kind (KHÔNG phải submit.handler.ts thật)", () => {
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

  it('outcome.kind === "success" → hàm mô phỏng gọi cả onImported lẫn onSuccess', () => {
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

  it('outcome.kind === "partial" → hàm mô phỏng CHỈ gọi onImported, không gọi onSuccess', () => {
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
