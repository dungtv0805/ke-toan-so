import type { RowValidationResult } from "../types";
import type { ImportApiResult } from "@/services/importDanhMucService";
import { mapFailuresToRows } from "./mapFailures";

/**
 * Kết quả sau khi gọi API import, đã được diễn giải thành hành động cho handler và modal.
 * - "success": không còn dòng lỗi nào — modal phải đóng.
 * - "partial": có ít nhất 1 dòng lỗi — bản ghi hợp lệ VẪN đã được tạo (trang cha phải nạp
 *   lại), nhưng modal phải ở lại để người dùng xem/sửa các dòng lỗi mới được đánh dấu.
 */
export type ImportOutcome =
  | { kind: "success"; created: number }
  | {
      kind: "partial";
      created: number;
      failedCount: number;
      /** `results` đã được đổ lỗi từ BE vào đúng dòng, sẵn sàng để setState. */
      results: RowValidationResult[];
    };

/**
 * Quyết định kết quả import từ phản hồi BE — tách riêng khỏi handler để test được
 * không cần dựng CSubHanlder/CHanlder thật.
 */
export function resolveImportOutcome(
  results: RowValidationResult[],
  res: ImportApiResult,
): ImportOutcome {
  if (res.failed.length === 0) {
    return { kind: "success", created: res.created };
  }

  const byRow = mapFailuresToRows(results, res.failed);
  const updatedResults = results.map((r) =>
    byRow.has(r.rowNumber)
      ? { ...r, errors: [byRow.get(r.rowNumber) as string], payload: null }
      : r,
  );

  return {
    kind: "partial",
    created: res.created,
    failedCount: res.failed.length,
    results: updatedResults,
  };
}
