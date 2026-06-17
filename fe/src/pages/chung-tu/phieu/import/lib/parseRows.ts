import { IMPORT_COLUMNS, RawImportRow } from "./columns";

/**
 * Chuyển array-of-arrays (đọc từ sheet) → RawImportRow[].
 * Dòng 0 là header (bỏ). Map theo VỊ TRÍ cột (index), không theo tên.
 * Bỏ qua dòng trống hoàn toàn. rowNumber tính theo Excel (1-based, gồm header).
 */
export function aoaToRawRows(aoa: unknown[][]): RawImportRow[] {
  if (!aoa || aoa.length <= 1) return [];

  const rows: RawImportRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    const values = cells.map((c) =>
      c === undefined || c === null ? "" : String(c).trim(),
    );

    const isEmpty = values.every((v) => v === "");
    if (isEmpty) continue;

    const row: RawImportRow = { rowNumber: r + 1 };
    IMPORT_COLUMNS.forEach((col, i) => {
      row[col.key] = values[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}
