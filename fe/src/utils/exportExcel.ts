import * as XLSX from "xlsx";

export interface ExcelColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export type ExcelRow = Record<string, string | number | undefined | null>;

/**
 * Một nhóm trên file Excel — dòng tiêu đề gộp trọn chiều ngang, các dòng con
 * nằm ngay dưới ở outline cấp 1 (Excel hiện nút +/- ở lề trái để thu/mở).
 */
export interface ExcelGroup {
  ten: string;
  /** Mặc định là số dòng con. */
  soLuong?: number;
  rows: ExcelRow[];
}

export interface ExportExcelOptions {
  title: string;
  columns: ExcelColumn[];
  data?: ExcelRow[];
  /** Khi có: xuất dạng cây 2 cấp, thay cho `data`. */
  groups?: ExcelGroup[];
  /** Đơn vị đếm trên dòng tiêu đề nhóm, vd "sản phẩm" → "12 sản phẩm". */
  donVi?: string;
  fileName: string;
  sheetName?: string;
}

/** Số hàng đứng trước hàng dữ liệu đầu tiên: tiêu đề, hàng trống, hàng header. */
const SO_HANG_DAU = 3;

interface BangXuat {
  wsData: (string | number)[][];
  merges: XLSX.Range[];
  /** `!rows` — dòng con mang level 1 để Excel gom nhóm được. */
  rows: (XLSX.RowInfo | undefined)[];
}

const oCuaDong = (row: ExcelRow, columns: ExcelColumn[]) =>
  columns.map((col) => {
    const val = row[col.dataKey];
    if (val === null || val === undefined) return "";
    return val;
  });

/**
 * Dựng nội dung sheet — tách riêng khỏi việc ghi file để kiểm thử được.
 *
 * Dạng cây trên Excel không có cột thụt lề: thụt bằng dấu cách sẽ dính vào giá
 * trị (mã "SP01" thành "  SP01") và hỏng ngay khi ai đó nhập ngược file vào.
 * Thay vào đó dùng ĐÚNG cơ chế của Excel: dòng tiêu đề nhóm gộp trọn chiều
 * ngang, dòng con đặt outline cấp 1 kèm `summaryBelow = 0` để nút thu/mở nằm
 * đúng dòng tiêu đề ở TRÊN.
 */
export function dungBangXuat({
  title,
  columns,
  data = [],
  groups,
  donVi,
}: Pick<ExportExcelOptions, "title" | "columns" | "data" | "groups" | "donVi">): BangXuat {
  const headers = columns.map((col) => col.header);
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(columns.length - 1, 0) } },
  ];
  const body: (string | number)[][] = [];
  const rows: (XLSX.RowInfo | undefined)[] = [];

  if (groups) {
    for (const nhom of groups) {
      const soLuong = nhom.soLuong ?? nhom.rows.length;
      const dem = donVi ? `${soLuong} ${donVi}` : `${soLuong}`;
      const r = SO_HANG_DAU + body.length;
      body.push([`${nhom.ten} (${dem})`]);
      merges.push({ s: { r, c: 0 }, e: { r, c: Math.max(columns.length - 1, 0) } });
      for (const row of nhom.rows) {
        rows[SO_HANG_DAU + body.length] = { level: 1 };
        body.push(oCuaDong(row, columns));
      }
    }
  } else {
    for (const row of data) body.push(oCuaDong(row, columns));
  }

  return { wsData: [[title], [], headers, ...body], merges, rows };
}

export function exportToExcel(options: ExportExcelOptions): void {
  const { columns, fileName, sheetName = "Sheet1", groups } = options;
  const { wsData, merges, rows } = dungBangXuat(options);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!merges"] = merges;
  ws["!cols"] = columns.map((col) => ({ wch: col.width ?? 15 }));
  if (groups) {
    ws["!rows"] = rows as XLSX.RowInfo[];
    // Dòng tổng (tiêu đề nhóm) nằm TRÊN các dòng con — không khai báo thì Excel
    // gắn nút thu/mở vào dòng ngay dưới nhóm, bấm vào là nhầm nhóm.
    ws["!outline"] = { above: true };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
