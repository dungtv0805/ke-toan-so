import { ImportColumn, RawImportRow } from "./columns";

/**
 * Chuyển array-of-arrays (đọc từ sheet) → RawImportRow[].
 * Dòng 0 là header (bỏ). Map theo VỊ TRÍ cột (index), không theo tên.
 * Ô kiểu Date giữ nguyên để normalizeDate xử lý; còn lại ép về chuỗi đã trim.
 * Bỏ qua dòng trống hoàn toàn. rowNumber tính theo Excel (1-based, gồm header).
 */
export function aoaToRawRows(
  aoa: unknown[][],
  columns: ImportColumn[],
): RawImportRow[] {
  if (!aoa || aoa.length <= 1) return [];

  const rows: RawImportRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    const values = cells.map((c) => {
      if (c instanceof Date) return c;
      return c === undefined || c === null ? "" : String(c).trim();
    });

    const isEmpty = values.every((v) => v === "");
    if (isEmpty) continue;

    const row: RawImportRow = { rowNumber: r + 1 };
    columns.forEach((col, i) => {
      row[col.key] = values[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

/** Header của file có khớp template không (so sánh không phân biệt hoa thường). */
export function headerMatches(
  aoa: unknown[][],
  columns: ImportColumn[],
): boolean {
  const header = (aoa?.[0] ?? []).map((c) =>
    String(c ?? "")
      .trim()
      .toLowerCase(),
  );
  return columns.every(
    (col, i) => header[i] === col.header.trim().toLowerCase(),
  );
}
