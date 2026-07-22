import type { ImportColumn, RawImportRow } from "../types";

/** Chuẩn hoá header để so khớp: bỏ khoảng trắng thừa, không phân biệt hoa thường. */
const normalizeHeader = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Dò vị trí cột theo tên header. Cột không tìm thấy có index -1. */
function buildHeaderIndex(
  aoa: unknown[][],
  columns: ImportColumn[],
): Record<string, number> {
  const headerRow = (aoa[0] ?? []).map(normalizeHeader);
  const index: Record<string, number> = {};
  for (const col of columns) {
    index[col.key] = headerRow.indexOf(normalizeHeader(col.header));
  }
  return index;
}

/** Danh sách header bắt buộc mà file đang thiếu. Rỗng nghĩa là file hợp lệ để parse. */
export function findMissingHeaders(
  aoa: unknown[][],
  columns: ImportColumn[],
): string[] {
  const index = buildHeaderIndex(aoa ?? [], columns);
  return columns
    .filter((col) => col.required && index[col.key] === -1)
    .map((col) => col.header);
}

/**
 * Chuyển array-of-arrays đọc từ sheet → RawImportRow[].
 * Dòng 0 là header. Map theo TÊN header nên đổi thứ tự cột vẫn chạy đúng.
 * Ô của cột kiểu 'date' hoặc 'number' giữ nguyên kiểu number của Excel (không ép về
 * chuỗi) để bước validate nhận được giá trị gốc, không phải văn bản đã mất dấu thập phân.
 * Dòng trống hoàn toàn bị bỏ qua nhưng rowNumber vẫn theo đúng vị trí trong file.
 */
export function aoaToRawRows(
  aoa: unknown[][],
  columns: ImportColumn[],
): RawImportRow[] {
  if (!aoa || aoa.length <= 1) return [];

  const index = buildHeaderIndex(aoa, columns);
  const rows: RawImportRow[] = [];

  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    const isEmpty = cells.every(
      (c) => c === undefined || c === null || String(c).trim() === "",
    );
    if (isEmpty) continue;

    const values: Record<string, string | number> = {};
    for (const col of columns) {
      const at = index[col.key];
      const cell = at === -1 ? "" : cells[at];
      if ((col.type === "date" || col.type === "number") && typeof cell === "number") {
        values[col.key] = cell;
      } else {
        values[col.key] =
          cell === undefined || cell === null ? "" : String(cell).trim();
      }
    }
    rows.push({ rowNumber: r + 1, values });
  }

  return rows;
}
