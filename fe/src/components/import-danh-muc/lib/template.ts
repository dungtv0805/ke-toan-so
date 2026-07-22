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

/** Excel cắt cụt tên sheet dài quá 31 ký tự (exceljs chỉ warn, không tự tránh đụng độ). */
const MAX_SHEET_NAME_LEN = 31;

/**
 * Tên sheet danh sách cho một cột, đảm bảo hợp lệ (≤31 ký tự) và không trùng sheet
 * nào khác đã sinh ra trong cùng lần build. Cột key ngắn (đa số trường hợp thật, vd
 * "chuDauTu") giữ nguyên dạng `DS_<key>` dễ đọc; chỉ khi vượt 31 ký tự — hoặc sau khi
 * cắt lại trùng một tên đã dùng — mới cắt bớt và thêm hậu tố số để phân biệt. Nhận
 * `used` từ ngoài truyền vào vì tên phải duy nhất trong phạm vi CẢ workbook, không
 * chỉ dựa vào col.key của riêng cột đó.
 */
function makeListSheetName(col: ImportColumn, used: Set<string>): string {
  const base = `DS_${col.key}`;
  const candidate = base.length <= MAX_SHEET_NAME_LEN ? base : base.slice(0, MAX_SHEET_NAME_LEN);
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  for (let n = 2; ; n++) {
    const suffix = `_${n}`;
    const truncated = `${base.slice(0, MAX_SHEET_NAME_LEN - suffix.length)}${suffix}`;
    if (!used.has(truncated)) {
      used.add(truncated);
      return truncated;
    }
  }
}

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

  const usedSheetNames = new Set<string>();

  config.columns.forEach((col, idx) => {
    const values = listValuesOf(col, refData);
    if (values.length === 0) return;

    const sheetName = makeListSheetName(col, usedSheetNames);
    const ws = wb.addWorksheet(sheetName);
    for (const v of values) ws.addRow([v]);

    // `enumList` là nhiều giá trị cách nhau bởi dấu phẩy trong CÙNG MỘT Ô (xem
    // validate.ts, vd "Khách hàng, Nhà cung cấp"). Nếu gắn validation "list" chặt
    // như enum một-giá-trị, Excel sẽ mặc định errorStyle="stop" khi thiếu
    // showErrorMessage và từ chối mọi ô không khớp NGUYÊN VĂN một item trong danh
    // sách — chặn luôn chính tổ hợp hợp lệ mà cột này yêu cầu. Tắt showErrorMessage
    // riêng cho enumList: dropdown vẫn hiện để tra cứu nhãn hợp lệ, nhưng gõ tay tổ
    // hợp nhiều giá trị không bị Excel chặn. Cột enum một-giá-trị và cột tham chiếu
    // vẫn giữ chặt vì đúng nghĩa chỉ nhận một giá trị khớp sheet danh sách.
    const strict = col.type !== "enumList";
    const colLetter = main.getColumn(idx + 1).letter;
    const formula = `'${sheetName}'!$A$1:$A$${values.length}`;
    for (let r = 2; r <= MAX_DATA_ROWS + 1; r++) {
      main.dataValidations.add(`${colLetter}${r}`, {
        type: "list",
        allowBlank: !col.required,
        formulae: [formula],
        ...(strict ? { showErrorMessage: true, errorStyle: "stop" } : { showErrorMessage: false }),
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
