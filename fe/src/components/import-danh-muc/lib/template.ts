import * as ExcelJS from "exceljs";
import type { ImportColumn, ImportDanhMucConfig, RefItem, RefRecord } from "../types";
import type { RefData } from "./validate";

/**
 * `worksheet.dataValidations` tồn tại ở runtime (lib/doc/data-validations.js) nhưng
 * thiếu trong .d.ts của exceljs — chỉ `Cell.dataValidation` được khai báo. Bổ sung
 * để gọi `add(address, ...)` thẳng, không phải qua `getCell`/`getRow` (xem lý do ở
 * dưới, phần gắn dropdown).
 */
declare module "exceljs" {
  interface Worksheet {
    dataValidations: {
      add(address: string, validation: ExcelJS.DataValidation): ExcelJS.DataValidation;
    };
  }
}

/** Số dòng dữ liệu được gắn dropdown ở sheet chính (hàng 2 → MAX_DATA_ROWS+1). */
const MAX_DATA_ROWS = 500;

/** Tên sheet danh sách của một cột. Tên sheet Excel không được chứa dấu/khoảng trắng lạ. */
const listSheetName = (col: ImportColumn): string => `DS_${col.key}`;

/** Các giá trị đưa vào sheet danh sách của một cột. Rỗng nghĩa là cột không cần dropdown. */
function listValuesOf(col: ImportColumn, refData: RefData): string[] {
  if (col.enumValues && (col.type === "enum" || col.type === "enumList")) {
    return col.enumValues.map((o) => o.label);
  }
  if (col.ref) {
    const items = refData[col.key] ?? [];
    const ref = col.ref;
    const read = (it: RefItem, key: string) => (it as RefRecord)[key];
    return items.map((it) => {
      const ma = String(read(it, ref.matchBy) ?? "");
      const ten = ref.displayField ? String(read(it, ref.displayField) ?? "") : "";
      return ten ? `${ma} - ${ten}` : ma;
    });
  }
  return [];
}

/** Dựng workbook file mẫu (đồng bộ để test được). */
export function buildTemplateWorkbook(
  config: ImportDanhMucConfig,
  refData: RefData,
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  const main = wb.addWorksheet("DuLieu");
  main.addRow(config.columns.map((c) => c.header));
  main.addRow(config.columns.map((c) => c.example ?? ""));
  main.getRow(1).font = { bold: true };
  config.columns.forEach((c, i) => {
    main.getColumn(i + 1).width = Math.max(14, c.header.length + 4);
  });

  config.columns.forEach((col, idx) => {
    const values = listValuesOf(col, refData);
    if (values.length === 0) return;

    const sheetName = listSheetName(col);
    const ws = wb.addWorksheet(sheetName);
    for (const v of values) ws.addRow([v]);

    // Gắn thẳng vào worksheet.dataValidations (khớp địa chỉ ô) thay vì
    // main.getCell(r, c).dataValidation = ... — cách đó gọi getRow(r) và
    // TẠO các dòng trống tới tận MAX_DATA_ROWS, khiến rowCount phình lên
    // dù sheet chỉ có 1 dòng ví dụ.
    const colLetter = main.getColumn(idx + 1).letter;
    const formula = `'${sheetName}'!$A$1:$A$${values.length}`;
    for (let r = 2; r <= MAX_DATA_ROWS + 1; r++) {
      main.dataValidations.add(`${colLetter}${r}`, {
        type: "list",
        allowBlank: !col.required,
        formulae: [formula],
      });
    }
  });

  return wb;
}

/** Tạo và tải file mẫu .xlsx cho một danh mục. */
export async function downloadTemplate(
  config: ImportDanhMucConfig,
  refData: RefData,
): Promise<void> {
  const wb = buildTemplateWorkbook(config, refData);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Mau-import-${config.title}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
