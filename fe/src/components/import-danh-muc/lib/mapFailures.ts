import type { RowValidationResult } from "../types";
import type { ImportFailure } from "@/services/importDanhMucService";

/**
 * Dòng Excel thật (rowNumber) của từng phần tử trong mảng `items` đã gửi lên BE, theo
 * đúng thứ tự đã gửi. `results` có thể chứa cả dòng lỗi (payload null, không được gửi)
 * xen giữa các dòng hợp lệ — và `parseRows` đã bỏ qua các dòng trống hoàn toàn khi đọc
 * file — nên vị trí trong mảng đã gửi không khớp 1-1 với rowNumber. Đây là nơi duy nhất
 * biết cách quy đổi, vì chỉ FE giữ rowNumber gốc của từng dòng.
 */
export function excelRowsOfSentItems(results: RowValidationResult[]): number[] {
  return results.filter((r) => r.payload !== null).map((r) => r.rowNumber);
}

/**
 * Quy đổi `failed[].index` (vị trí 0-based trong mảng items đã gửi BE) → rowNumber Excel
 * thật, trả về map rowNumber → message để dò khớp với bảng preview.
 */
export function mapFailuresToRows(
  results: RowValidationResult[],
  failures: ImportFailure[],
): Map<number, string> {
  const sentRows = excelRowsOfSentItems(results);
  const byRow = new Map<number, string>();
  for (const f of failures) {
    const rowNumber = sentRows[f.index];
    if (rowNumber !== undefined) byRow.set(rowNumber, f.message);
  }
  return byRow;
}
