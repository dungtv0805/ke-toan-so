import * as XLSX from "xlsx";
import { IMPORT_COLUMNS } from "./columns";

/** Tạo array-of-arrays cho file mẫu: header + 1 dòng ví dụ. */
export function buildTemplateAoa(): string[][] {
  const header = IMPORT_COLUMNS.map((c) => c.header);
  const example: Record<string, string> = {
    ngay: "01/06/2026",
    loaiGiaoDich: "PHIEU_THU",
    nghiepVu: "NV01",
    taiKhoanNo: "111",
    taiKhoanCo: "511",
    soTien: "1000000",
    dienGiai: "Ví dụ: thu tiền bán hàng",
  };
  const exampleRow = IMPORT_COLUMNS.map((c) => example[c.key] ?? "");
  return [header, exampleRow];
}

/** Xuất file mẫu .xlsx và tải về. */
export function downloadTemplate(fileName = "mau-import-nhat-ky-chung"): void {
  const aoa = buildTemplateAoa();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NhatKyChung");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
