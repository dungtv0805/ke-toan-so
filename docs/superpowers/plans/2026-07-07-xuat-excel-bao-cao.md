# Xuất Excel cho tất cả báo cáo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi trang báo cáo có nút "Xuất Excel" hoạt động, xuất file `.xlsx` giống cấu trúc bảng đang hiển thị (đúng cột/thứ tự, header gộp, phân cấp/thụt lề, in đậm dòng tổng, định dạng số).

**Architecture:** Một helper styled dùng chung `exportReportExcel.ts` (dùng `exceljs`) nhận mô hình bảng thuần dữ liệu (`ReportSheet[]`) và tự lo định dạng + tải file. Mỗi báo cáo có 1 hàm adapter **thuần** (`buildXxxSheets(state) → ReportSheet[]`, unit-test được) rồi gắn vào nút. Báo cáo nhiều tab xuất **tab đang mở**; adapter trả `[]` khi không có bảng để xuất và page hiện `message.warning`.

**Tech Stack:** React + TS + Vite, antd, `exceljs` (đã có trong `fe/package.json`), Vitest.

## Global Constraints

- FE dir: `fe/`. Chạy test: `cd fe && npx vitest run <path>`. Build: `cd fe && npm run build`. Lint: `cd fe && npm run lint`.
- Import exceljs theo đúng style repo: `import * as ExcelJS from "exceljs";`.
- KHÔNG sửa `fe/src/utils/exportExcel.ts` (xlsx, dùng cho Nhật ký chung).
- KHÔNG gọi lại API trong adapter — chỉ dùng state client đang render.
- Adapter là **hàm thuần** export riêng trong file `*.export.ts` cạnh page, nhận state, trả `ReportSheet[]`. Page chỉ import + gọi + `message`.
- Định dạng số dùng hằng từ helper: `NUM_FMT` (số, âm trong ngoặc, 0 → `-`) và `PCT_FMT` (phần trăm).
- Tên file: `<Tên báo cáo>_<DDMMYYYY>-<DDMMYYYY>.xlsx` khi có khoảng ngày; nếu không có ngày thì chỉ `<Tên báo cáo>`.
- Wiring nút mỗi page theo mẫu:
  ```tsx
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    const sheets = buildXxxSheets(/* state */);
    if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
    setExporting(true);
    try {
      await exportReportExcel(fileName, sheets);
      message.success("Đã xuất Excel");
    } catch (e) {
      console.error("export excel error", e);
      message.error("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };
  ```
  Gắn `onClick={handleExport} loading={exporting}` vào nút "Xuất Excel" (thêm mới nếu chưa có).

---

## File Structure

- Create `fe/src/utils/exportReportExcel.ts` — helper + model types + `NUM_FMT`/`PCT_FMT` + `leafCols`/`headerDepth`.
- Create `fe/src/utils/exportReportExcel.test.ts`.
- Create `fe/src/pages/bao-cao/bang-tong-hop/congNoExport.ts` (+ `.test.ts`), sửa `BangTongHopCongNoPage.tsx`.
- Create `fe/src/pages/bao-cao/hop-dong/hopDongExport.ts` (+ `.test.ts`), sửa `BaoCaoHopDongPage.tsx`.
- Create `fe/src/pages/bao-cao/kqkd/kqkdExport.ts` (+ `.test.ts`), sửa `KqkdPage.tsx`.
- Create `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietExport.ts` (+ `.test.ts`), sửa `SoChiTietTaiKhoanPage.tsx`.
- Create `fe/src/pages/bao-cao/pnl/pnlExport.ts` (+ `.test.ts`), sửa `PnLPage.tsx`.
- Create `fe/src/pages/bao-cao/so-cai/soCaiExport.ts` (+ `.test.ts`), sửa `SoCaiPage.tsx`.
- Create `fe/src/pages/bao-cao/bang-can-doi/bangCanDoiExport.ts` (+ `.test.ts`), sửa `BangCanDoiPage.tsx`.
- Create `fe/src/pages/bao-cao/tai-chinh/taiChinhExport.ts` (+ `.test.ts`), sửa `BaoCaoTaiChinhPage.tsx`.

---

## Task 1: Helper `exportReportExcel`

**Files:**
- Create: `fe/src/utils/exportReportExcel.ts`
- Test: `fe/src/utils/exportReportExcel.test.ts`

**Interfaces:**
- Produces:
  - Types `ReportCol`, `ReportRow`, `ReportSheet` (shapes below).
  - `NUM_FMT: string`, `PCT_FMT: string`.
  - `leafCols(columns: ReportCol[]): ReportCol[]` — cột lá theo thứ tự.
  - `headerDepth(columns: ReportCol[]): 1 | 2`.
  - `exportReportExcel(fileName: string, sheets: ReportSheet[]): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/utils/exportReportExcel.test.ts
import { describe, it, expect } from "vitest";
import { leafCols, headerDepth, type ReportCol } from "./exportReportExcel";

const cols: ReportCol[] = [
  { key: "ten", header: "Tên" },
  {
    key: "dk",
    header: "Số dư đầu kỳ",
    children: [
      { key: "dkNo", header: "Nợ", numFmt: "#,##0" },
      { key: "dkCo", header: "Có", numFmt: "#,##0" },
    ],
  },
];

describe("exportReportExcel helpers", () => {
  it("leafCols flattens nested columns in order", () => {
    expect(leafCols(cols).map((c) => c.key)).toEqual(["ten", "dkNo", "dkCo"]);
  });

  it("headerDepth is 2 when any column has children", () => {
    expect(headerDepth(cols)).toBe(2);
    expect(headerDepth([{ key: "a", header: "A" }])).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/utils/exportReportExcel.test.ts`
Expected: FAIL — cannot find module `./exportReportExcel`.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/utils/exportReportExcel.ts
import * as ExcelJS from "exceljs";

export interface ReportCol {
  key: string;
  header: string;
  children?: ReportCol[];
  width?: number;
  align?: "left" | "right" | "center";
  numFmt?: string;
}

export interface ReportRow {
  cells?: Record<string, string | number | null | undefined>;
  bold?: boolean;
  indent?: number;
  fill?: "total" | "group" | "category";
  section?: string;
  spacer?: boolean;
}

export interface ReportSheet {
  name: string;
  title: string;
  meta?: string[];
  columns: ReportCol[];
  rows: ReportRow[];
}

// Số: phân cách nghìn, âm trong ngoặc, 0/rỗng -> "-"
export const NUM_FMT = '#,##0;(#,##0);"-"';
// Phần trăm: 1 chữ số thập phân, âm trong ngoặc, 0/rỗng -> "-"
export const PCT_FMT = '0.0"%";(0.0"%");"-"';

export function leafCols(columns: ReportCol[]): ReportCol[] {
  const out: ReportCol[] = [];
  for (const c of columns) {
    if (c.children && c.children.length) out.push(...leafCols(c.children));
    else out.push(c);
  }
  return out;
}

export function headerDepth(columns: ReportCol[]): 1 | 2 {
  return columns.some((c) => c.children && c.children.length) ? 2 : 1;
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim();
  return (cleaned || "Sheet").slice(0, 31);
}

const FILL: Record<string, string> = {
  total: "FFE6F7FF",
  group: "FFFFF7E6",
  category: "FFFAFAFA",
  header: "FFF0F0F0",
};

const solid = (argb: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});

const THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD9D9D9" } },
  left: { style: "thin", color: { argb: "FFD9D9D9" } },
  bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
  right: { style: "thin", color: { argb: "FFD9D9D9" } },
};

function styleHeader(
  ws: ExcelJS.Worksheet,
  rows: ExcelJS.Row[],
  nCols: number,
): void {
  for (const r of rows) {
    for (let i = 1; i <= nCols; i++) {
      const cell = r.getCell(i);
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = solid(FILL.header);
      cell.border = THIN;
    }
  }
}

function writeSheet(ws: ExcelJS.Worksheet, sheet: ReportSheet): void {
  const leaves = leafCols(sheet.columns);
  const nCols = Math.max(leaves.length, 1);
  const depth = headerDepth(sheet.columns);

  // Tiêu đề lớn
  const titleRow = ws.addRow([sheet.title]);
  titleRow.font = { bold: true, size: 14 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, nCols);
  titleRow.getCell(1).alignment = { horizontal: "center" };

  // Meta
  for (const line of sheet.meta ?? []) {
    const r = ws.addRow([line]);
    ws.mergeCells(r.number, 1, r.number, nCols);
    r.getCell(1).font = { italic: true, size: 10 };
  }
  ws.addRow([]); // ngăn cách trước header

  // Header 1 hoặc 2 tầng
  if (depth === 2) {
    const top = ws.addRow([]);
    const bottom = ws.addRow([]);
    let col = 1;
    for (const c of sheet.columns) {
      if (c.children && c.children.length) {
        ws.mergeCells(top.number, col, top.number, col + c.children.length - 1);
        top.getCell(col).value = c.header;
        for (const child of c.children) {
          bottom.getCell(col).value = child.header;
          col += 1;
        }
      } else {
        ws.mergeCells(top.number, col, bottom.number, col);
        top.getCell(col).value = c.header;
        col += 1;
      }
    }
    styleHeader(ws, [top, bottom], nCols);
  } else {
    const hr = ws.addRow(leaves.map((c) => c.header));
    styleHeader(ws, [hr], nCols);
  }
  const freezeTo = ws.rowCount;

  // Dòng dữ liệu
  for (const row of sheet.rows) {
    if (row.spacer) {
      ws.addRow([]);
      continue;
    }
    if (row.section) {
      const r = ws.addRow([row.section]);
      ws.mergeCells(r.number, 1, r.number, nCols);
      r.getCell(1).font = { bold: true };
      r.getCell(1).fill = solid(FILL.group);
      continue;
    }
    const values = leaves.map((c) => {
      const v = row.cells?.[c.key];
      return v === undefined ? null : v;
    });
    const r = ws.addRow(values);
    leaves.forEach((c, idx) => {
      const cell = r.getCell(idx + 1);
      cell.border = THIN;
      if (c.numFmt) {
        cell.numFmt = c.numFmt;
        cell.alignment = { horizontal: "right" };
      } else if (c.align) {
        cell.alignment = { horizontal: c.align };
      }
      if (idx === 0 && row.indent) {
        cell.alignment = { ...(cell.alignment ?? {}), indent: row.indent };
      }
      if (row.bold) cell.font = { ...(cell.font ?? {}), bold: true };
      if (row.fill) cell.fill = solid(FILL[row.fill]);
    });
  }

  // Độ rộng cột
  leaves.forEach((c, idx) => {
    ws.getColumn(idx + 1).width = c.width ?? 15;
  });

  ws.views = [{ state: "frozen", ySplit: freezeTo }];
}

export async function exportReportExcel(
  fileName: string,
  sheets: ReportSheet[],
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sanitizeSheetName(sheet.name));
    writeSheet(ws, sheet);
  }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/utils/exportReportExcel.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add a round-trip test (write → read back)**

Append to `exportReportExcel.test.ts`:

```ts
import * as ExcelJS from "exceljs";
import { exportReportExcel, NUM_FMT, type ReportSheet } from "./exportReportExcel";

// Bắt writeBuffer để lấy nội dung mà không cần DOM download.
async function buildWorkbook(sheets: ReportSheet[]): Promise<ExcelJS.Workbook> {
  // Dùng chính exportReportExcel nhưng chặn phần tải file bằng cách
  // gọi lại logic qua một workbook mới: đơn giản hơn là tự dựng từ sheets.
  const wb = new ExcelJS.Workbook();
  // Tận dụng exportReportExcel gián tiếp không khả thi (nó tải file);
  // nên test round-trip đi qua API công khai bằng stub DOM:
  return wb;
}

describe("exportReportExcel round-trip", () => {
  it("ghi được title + số có numFmt, không ném lỗi", async () => {
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    // jsdom có thể thiếu 2 API này — stub để không ném.
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:x";
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
    const sheets: ReportSheet[] = [
      {
        name: "S1",
        title: "BÁO CÁO TEST",
        columns: [
          { key: "ten", header: "Tên", width: 20 },
          { key: "tien", header: "Số tiền", numFmt: NUM_FMT },
        ],
        rows: [
          { cells: { ten: "A", tien: 1000 } },
          { cells: { ten: "Tổng", tien: -5 }, bold: true, fill: "total" },
        ],
      },
    ];
    await expect(exportReportExcel("test", sheets)).resolves.toBeUndefined();
    (URL as unknown as { createObjectURL: typeof origCreate }).createObjectURL = origCreate;
    (URL as unknown as { revokeObjectURL: typeof origRevoke }).revokeObjectURL = origRevoke;
  });
});
```

Xoá hàm `buildWorkbook` chưa dùng nếu lint cảnh báo (nó chỉ minh hoạ). Giữ test `it(...)` là đủ.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd fe && npx vitest run src/utils/exportReportExcel.test.ts`
Expected: PASS. Nếu `URL.createObjectURL` vẫn lỗi trong jsdom, giữ nguyên phần stub ở test (đã có).

- [ ] **Step 7: Commit**

```bash
git add fe/src/utils/exportReportExcel.ts fe/src/utils/exportReportExcel.test.ts
git commit -m "feat(bao-cao): helper exportReportExcel (exceljs) cho xuất báo cáo"
```

---

## Task 2: Bảng tổng hợp công nợ (#5)

**Files:**
- Create: `fe/src/pages/bao-cao/bang-tong-hop/congNoExport.ts`
- Test: `fe/src/pages/bao-cao/bang-tong-hop/congNoExport.test.ts`
- Modify: `fe/src/pages/bao-cao/bang-tong-hop/BangTongHopCongNoPage.tsx`

**Interfaces:**
- Consumes: `ReportSheet`, `NUM_FMT`, `exportReportExcel` từ Task 1; `BangTongHopCongNo`, `CongNoRowVal` từ `@/services/congNoTongHopService`.
- Produces: `buildCongNoSheets(data: BangTongHopCongNo | null, from: string, to: string): ReportSheet[]` (mảng rỗng nếu `data` null).

Cấu trúc dữ liệu (đã xác nhận trong page): `data.totals: CongNoRowVal`; `data.accounts: { ma, ten, dauKy, phatSinh, cuoiKy, doiTuongs: {ma,ten,dauKy,phatSinh,cuoiKy}[] }[]`; mỗi `dauKy/phatSinh/cuoiKy` = `{ phaiThu: number; phaiTra: number }`.

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/pages/bao-cao/bang-tong-hop/congNoExport.test.ts
import { describe, it, expect } from "vitest";
import { buildCongNoSheets } from "./congNoExport";
import type { BangTongHopCongNo } from "@/services/congNoTongHopService";

const data = {
  totals: {
    dauKy: { phaiThu: 100, phaiTra: 0 },
    phatSinh: { phaiThu: 50, phaiTra: 20 },
    cuoiKy: { phaiThu: 130, phaiTra: 0 },
  },
  accounts: [
    {
      ma: "131",
      ten: "Phải thu KH",
      dauKy: { phaiThu: 100, phaiTra: 0 },
      phatSinh: { phaiThu: 50, phaiTra: 20 },
      cuoiKy: { phaiThu: 130, phaiTra: 0 },
      doiTuongs: [
        {
          ma: "KH01",
          ten: "Khách 1",
          dauKy: { phaiThu: 100, phaiTra: 0 },
          phatSinh: { phaiThu: 50, phaiTra: 20 },
          cuoiKy: { phaiThu: 130, phaiTra: 0 },
        },
      ],
    },
  ],
} as unknown as BangTongHopCongNo;

describe("buildCongNoSheets", () => {
  it("returns empty when no data", () => {
    expect(buildCongNoSheets(null, "01/07/2026", "31/07/2026")).toEqual([]);
  });

  it("first data row is bold TỔNG CỘNG then account then đối tượng", () => {
    const [sheet] = buildCongNoSheets(data, "01/07/2026", "31/07/2026");
    expect(sheet.rows[0].cells?.ten).toBe("TỔNG CỘNG");
    expect(sheet.rows[0].bold).toBe(true);
    expect(sheet.rows[1].cells?.ma).toBe("131");
    expect(sheet.rows[2].indent).toBe(1);
    expect(sheet.rows[2].cells?.ck_pt).toBe(130);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/bang-tong-hop/congNoExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/pages/bao-cao/bang-tong-hop/congNoExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { BangTongHopCongNo, CongNoRowVal } from "@/services/congNoTongHopService";

const num = (k: string, header: string): ReportCol => ({ key: k, header, numFmt: NUM_FMT, width: 15 });

const COLUMNS: ReportCol[] = [
  { key: "ma", header: "Mã ĐT", width: 12 },
  { key: "ten", header: "Tên đối tượng", width: 32 },
  { key: "dk", header: "Số dư đầu kỳ", children: [num("dk_pt", "Phải thu"), num("dk_ptr", "Phải trả")] },
  { key: "ps", header: "Số phát sinh", children: [num("ps_pt", "Phải thu"), num("ps_ptr", "Phải trả")] },
  { key: "ck", header: "Số dư cuối kỳ", children: [num("ck_pt", "Phải thu"), num("ck_ptr", "Phải trả")] },
];

const valCells = (v: CongNoRowVal) => ({
  dk_pt: v.dauKy.phaiThu, dk_ptr: v.dauKy.phaiTra,
  ps_pt: v.phatSinh.phaiThu, ps_ptr: v.phatSinh.phaiTra,
  ck_pt: v.cuoiKy.phaiThu, ck_ptr: v.cuoiKy.phaiTra,
});

export function buildCongNoSheets(
  data: BangTongHopCongNo | null,
  from: string,
  to: string,
): ReportSheet[] {
  if (!data) return [];
  const rows: ReportRow[] = [
    { cells: { ma: "", ten: "TỔNG CỘNG", ...valCells(data.totals) }, bold: true, fill: "total" },
  ];
  for (const acc of data.accounts) {
    rows.push({
      cells: { ma: acc.ma, ten: acc.ten, ...valCells({ dauKy: acc.dauKy, phatSinh: acc.phatSinh, cuoiKy: acc.cuoiKy }) },
      bold: true,
      fill: "category",
    });
    for (const dt of acc.doiTuongs) {
      rows.push({
        cells: { ma: dt.ma, ten: dt.ten, ...valCells({ dauKy: dt.dauKy, phatSinh: dt.phatSinh, cuoiKy: dt.cuoiKy }) },
        indent: 1,
      });
    }
  }
  return [
    {
      name: "Tổng hợp công nợ",
      title: "BẢNG TỔNG HỢP CÔNG NỢ",
      meta: [`Từ ngày ${from} đến ngày ${to}`],
      columns: COLUMNS,
      rows,
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/bang-tong-hop/congNoExport.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the button in the page**

Trong `BangTongHopCongNoPage.tsx`:
1. Thêm import: `import { Button } from "antd"` đã có; thêm `message` vào import antd; thêm `import { ExportOutlined } from "@ant-design/icons";` (đã có `ReloadOutlined, HomeOutlined, TableOutlined` — thêm `ExportOutlined`). Thêm `import { exportReportExcel } from "@/utils/exportReportExcel";` và `import { buildCongNoSheets } from "./congNoExport";`.
2. Thêm state + handler (dùng `range` sẵn có, format `DD-MM-YYYY`):

```tsx
const [exporting, setExporting] = useState(false);
const handleExport = async () => {
  const from = range[0].format("DD/MM/YYYY");
  const to = range[1].format("DD/MM/YYYY");
  const sheets = buildCongNoSheets(data, from, to);
  if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
  setExporting(true);
  try {
    await exportReportExcel(
      `Bang tong hop cong no_${range[0].format("DDMMYYYY")}-${range[1].format("DDMMYYYY")}`,
      sheets,
    );
    message.success("Đã xuất Excel");
  } catch (e) {
    console.error("export excel error", e);
    message.error("Xuất Excel thất bại");
  } finally {
    setExporting(false);
  }
};
```
3. Trong `extra` của `<Card>` (đang chỉ có nút "Xem báo cáo"), bọc trong `<Space>` và thêm trước nó:

```tsx
extra={
  <Space>
    <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
      Xuất Excel
    </Button>
    <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
      Xem báo cáo
    </Button>
  </Space>
}
```
(`Space` đã được import trong file.)

- [ ] **Step 6: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/bang-tong-hop/
git commit -m "feat(bao-cao): xuất Excel Bảng tổng hợp công nợ"
```

---

## Task 3: Báo cáo hợp đồng (#6)

**Files:**
- Create: `fe/src/pages/bao-cao/hop-dong/hopDongExport.ts`
- Test: `fe/src/pages/bao-cao/hop-dong/hopDongExport.test.ts`
- Modify: `fe/src/pages/bao-cao/hop-dong/BaoCaoHopDongPage.tsx`

**Interfaces:**
- Consumes: `ReportSheet`, `NUM_FMT` (Task 1); `BaoCaoHopDongRow` từ `@/types`.
- Produces: `buildHopDongSheets(rows: BaoCaoHopDongRow[], tong: BaoCaoHopDongRow | null): ReportSheet[]` (rỗng nếu `rows` rỗng).

Fields `BaoCaoHopDongRow` (đã dùng trong page): `nam: number|null, soLuong, giaTri, quyetToan, thuTien, chuaCoHD, hdChuaKy, hdPhotoScan, hdGoc, giaTriBinhQuan`.

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/pages/bao-cao/hop-dong/hopDongExport.test.ts
import { describe, it, expect } from "vitest";
import { buildHopDongSheets } from "./hopDongExport";
import type { BaoCaoHopDongRow } from "@/types";

const rows = [
  { nam: 2025, soLuong: 3, giaTri: 900, quyetToan: 800, thuTien: 700, chuaCoHD: 1, hdChuaKy: 0, hdPhotoScan: 1, hdGoc: 1, giaTriBinhQuan: 300 },
] as unknown as BaoCaoHopDongRow[];
const tong = { nam: null, soLuong: 3, giaTri: 900, quyetToan: 800, thuTien: 700, chuaCoHD: 1, hdChuaKy: 0, hdPhotoScan: 1, hdGoc: 1, giaTriBinhQuan: 300 } as unknown as BaoCaoHopDongRow;

describe("buildHopDongSheets", () => {
  it("empty when no rows", () => {
    expect(buildHopDongSheets([], null)).toEqual([]);
  });
  it("maps rows + bold Tổng row last", () => {
    const [sheet] = buildHopDongSheets(rows, tong);
    expect(sheet.rows[0].cells?.nam).toBe(2025);
    const last = sheet.rows[sheet.rows.length - 1];
    expect(last.cells?.nam).toBe("Tổng");
    expect(last.bold).toBe(true);
    expect(last.cells?.giaTri).toBe(900);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/hop-dong/hopDongExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/pages/bao-cao/hop-dong/hopDongExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { BaoCaoHopDongRow } from "@/types";

const num = (k: string, header: string): ReportCol => ({ key: k, header, numFmt: NUM_FMT, width: 15 });

const COLUMNS: ReportCol[] = [
  { key: "nam", header: "Năm", width: 10, align: "center" },
  { key: "gt", header: "Giá trị Hợp đồng + phụ lục", children: [num("soLuong", "Số lượng"), num("giaTri", "Số tiền")] },
  num("quyetToan", "Quyết toán"),
  num("thuTien", "Thu tiền"),
  {
    key: "tt", header: "Tình trạng Hợp đồng",
    children: [num("chuaCoHD", "Chưa có HĐ"), num("hdChuaKy", "HĐ chưa ký"), num("hdPhotoScan", "HĐ photo/scan"), num("hdGoc", "HĐ gốc")],
  },
  num("giaTriBinhQuan", "Giá trị HĐ bình quân"),
];

const rowCells = (r: BaoCaoHopDongRow) => ({
  soLuong: r.soLuong, giaTri: r.giaTri, quyetToan: r.quyetToan, thuTien: r.thuTien,
  chuaCoHD: r.chuaCoHD, hdChuaKy: r.hdChuaKy, hdPhotoScan: r.hdPhotoScan, hdGoc: r.hdGoc,
  giaTriBinhQuan: r.giaTriBinhQuan,
});

export function buildHopDongSheets(
  rows: BaoCaoHopDongRow[],
  tong: BaoCaoHopDongRow | null,
): ReportSheet[] {
  if (!rows.length) return [];
  const out: ReportRow[] = rows.map((r) => ({
    cells: { nam: r.nam ?? "Chưa rõ", ...rowCells(r) },
  }));
  if (tong) out.push({ cells: { nam: "Tổng", ...rowCells(tong) }, bold: true, fill: "total" });
  return [
    { name: "Báo cáo hợp đồng", title: "BÁO CÁO NHANH HỢP ĐỒNG (THEO NĂM)", columns: COLUMNS, rows: out },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/hop-dong/hopDongExport.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the button**

Trong `BaoCaoHopDongPage.tsx` (hiện chưa có nút, chỉ có Title):
1. Thêm imports: `Button, Space` vào import antd (đang có `Breadcrumb, Card, Table, Typography, message`); `import { ExportOutlined } from "@ant-design/icons";` (đang có `HomeOutlined, FileProtectOutlined`); `import { exportReportExcel } from "@/utils/exportReportExcel";` và `import { buildHopDongSheets } from "./hopDongExport";`.
2. Thêm state + handler:

```tsx
const [exporting, setExporting] = useState(false);
const handleExport = async () => {
  const sheets = buildHopDongSheets(rows, tong);
  if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
  setExporting(true);
  try {
    await exportReportExcel("Bao cao hop dong", sheets);
    message.success("Đã xuất Excel");
  } catch (e) {
    console.error("export excel error", e);
    message.error("Xuất Excel thất bại");
  } finally {
    setExporting(false);
  }
};
```
3. Sửa header block (dòng chứa Title) để thêm nút bên phải:

```tsx
<div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-2">
    <FileProtectOutlined className="text-primary" />
    <Title level={5} className="!mb-0">Báo cáo nhanh hợp đồng (theo năm)</Title>
  </div>
  <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
    Xuất Excel
  </Button>
</div>
```
(`useState` cần thêm vào import React: đổi `import React, { useEffect, useState } from "react"` — file đã import `useEffect, useState`.)

- [ ] **Step 6: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/hop-dong/
git commit -m "feat(bao-cao): xuất Excel Báo cáo hợp đồng"
```

---

## Task 4: KQKD (#8) — adapter dùng chung

**Files:**
- Create: `fe/src/pages/bao-cao/kqkd/kqkdExport.ts`
- Test: `fe/src/pages/bao-cao/kqkd/kqkdExport.test.ts`
- Modify: `fe/src/pages/bao-cao/kqkd/KqkdPage.tsx`

**Interfaces:**
- Consumes: `ReportSheet`, `NUM_FMT`, `PCT_FMT` (Task 1); `KqkdChiTieu` từ `@/services/kqkdService`.
- Produces:
  - `buildKqkdSheet(data: KqkdChiTieu[], title: string, meta?: string[], name?: string): ReportSheet` — dùng lại ở Task 9 (tab 3 tài chính).
  - `buildKqkdSheets(data: KqkdChiTieu[], title: string, meta?: string[]): ReportSheet[]` — wrapper trả `[]` nếu rỗng.

`KqkdChiTieu` fields (theo `KqkdTable.tsx`): `ten, ma, kyHienTai, phanTramDTThuan, tyTrongChiPhi, kyTruoc, phanTramDTThuanKyTruoc, tyTrongChiPhiKyTruoc, bienDong, phanTramBienDong, isBold?, isCalculated?`.

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/pages/bao-cao/kqkd/kqkdExport.test.ts
import { describe, it, expect } from "vitest";
import { buildKqkdSheet, buildKqkdSheets } from "./kqkdExport";
import type { KqkdChiTieu } from "@/services/kqkdService";

const data = [
  { ten: "Doanh thu bán hàng", ma: "01", kyHienTai: 1000, phanTramDTThuan: 100, tyTrongChiPhi: null, kyTruoc: 800, phanTramDTThuanKyTruoc: 100, tyTrongChiPhiKyTruoc: null, bienDong: 200, phanTramBienDong: 25, isBold: false, isCalculated: false },
  { ten: "Lợi nhuận gộp", ma: "20", kyHienTai: 300, phanTramDTThuan: 30, tyTrongChiPhi: null, kyTruoc: 250, phanTramDTThuanKyTruoc: 31, tyTrongChiPhiKyTruoc: null, bienDong: 50, phanTramBienDong: 20, isBold: true, isCalculated: true },
] as unknown as KqkdChiTieu[];

describe("buildKqkdSheet", () => {
  it("empty wrapper when no data", () => {
    expect(buildKqkdSheets([], "T")).toEqual([]);
  });
  it("STT tăng dần, dòng isBold/isCalculated là bold + indent nhỏ hơn", () => {
    const sheet = buildKqkdSheet(data, "KQKD");
    expect(sheet.rows[0].cells?.stt).toBe(1);
    expect(sheet.rows[0].indent).toBe(2);
    expect(sheet.rows[1].bold).toBe(true);
    expect(sheet.rows[1].indent).toBe(1);
    expect(sheet.rows[1].cells?.kyHienTai).toBe(300);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/kqkd/kqkdExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/pages/bao-cao/kqkd/kqkdExport.ts
import { NUM_FMT, PCT_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { KqkdChiTieu } from "@/services/kqkdService";

const numC = (k: string, h: string): ReportCol => ({ key: k, header: h, numFmt: NUM_FMT, width: 16 });
const pctC = (k: string, h: string): ReportCol => ({ key: k, header: h, numFmt: PCT_FMT, width: 12 });

const COLUMNS: ReportCol[] = [
  { key: "stt", header: "STT", width: 6, align: "center" },
  { key: "ten", header: "Chỉ tiêu", width: 40 },
  { key: "ma", header: "Mã số", width: 8, align: "center" },
  { key: "kht", header: "Kỳ hiện tại", children: [numC("kyHienTai", "Số tiền"), pctC("phanTramDTThuan", "% DT thuần"), pctC("tyTrongChiPhi", "Tỷ trọng CP")] },
  { key: "kt", header: "Kỳ trước", children: [numC("kyTruoc", "Số tiền"), pctC("phanTramDTThuanKyTruoc", "% DT thuần"), pctC("tyTrongChiPhiKyTruoc", "Tỷ trọng CP")] },
  { key: "bd", header: "Biến động", children: [numC("bienDong", "Số tiền"), pctC("phanTramBienDong", "%")] },
];

export function buildKqkdSheet(
  data: KqkdChiTieu[],
  title: string,
  meta?: string[],
  name = "KQKD",
): ReportSheet {
  const rows: ReportRow[] = data.map((c, i) => ({
    cells: {
      stt: i + 1,
      ten: c.ten,
      ma: c.ma,
      kyHienTai: c.kyHienTai,
      phanTramDTThuan: c.phanTramDTThuan,
      tyTrongChiPhi: c.tyTrongChiPhi,
      kyTruoc: c.kyTruoc,
      phanTramDTThuanKyTruoc: c.phanTramDTThuanKyTruoc,
      tyTrongChiPhiKyTruoc: c.tyTrongChiPhiKyTruoc,
      bienDong: c.bienDong,
      phanTramBienDong: c.phanTramBienDong,
    },
    bold: Boolean(c.isBold || c.isCalculated),
    indent: c.isCalculated ? 1 : 2,
  }));
  return { name, title, meta, columns: COLUMNS, rows };
}

export function buildKqkdSheets(data: KqkdChiTieu[], title: string, meta?: string[]): ReportSheet[] {
  if (!data.length) return [];
  return [buildKqkdSheet(data, title, meta)];
}
```

Lưu ý: `phanTramDTThuan`/`tyTrongChiPhi` có thể là `null`; helper ghi `null` → hiển thị `-` theo `PCT_FMT`. Nếu `KqkdChiTieu` không khai báo `null` cho các field này, ép kiểu bằng `?? null` khi gán (đổi `c.phanTramDTThuan` thành `c.phanTramDTThuan ?? null`, tương tự các field %).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/kqkd/kqkdExport.test.ts`
Expected: PASS (2 tests). Nếu FAIL do type `null`, áp `?? null` như ghi chú trên.

- [ ] **Step 5: Wire the button in KqkdPage**

`KqkdPage.tsx` hiện KHÔNG có nút. Thêm nút cạnh tiêu đề `<h1>`:
1. Imports: `import { Button, message } from "antd";` `import { ExportOutlined } from "@ant-design/icons";` `import { exportReportExcel } from "@/utils/exportReportExcel";` `import { buildKqkdSheets } from "./kqkdExport";` `import { useState } from "react";` (đang import `useEffect` — thêm `useState`).
2. Trong `KqkdPageInner`, sau `const [loading] = ...`, thêm:

```tsx
const [exporting, setExporting] = useState(false);
const handleExport = async () => {
  const chiTieu = kqkdData?.chiTieu ?? [];
  const meta = kqkdData?.kyHienTai && kqkdData?.kyTruoc
    ? [`Kỳ hiện tại: ${formatDate(kqkdData.kyHienTai.startDate)} – ${formatDate(kqkdData.kyHienTai.endDate)}`,
       `Kỳ trước: ${formatDate(kqkdData.kyTruoc.startDate)} – ${formatDate(kqkdData.kyTruoc.endDate)}`]
    : undefined;
  const sheets = buildKqkdSheets(chiTieu, "BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH", meta);
  if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
  setExporting(true);
  try {
    await exportReportExcel("Bao cao KQKD", sheets);
    message.success("Đã xuất Excel");
  } catch (e) {
    console.error("export excel error", e);
    message.error("Xuất Excel thất bại");
  } finally {
    setExporting(false);
  }
};
```
3. Đổi khối tiêu đề:

```tsx
<div className="flex items-center justify-between">
  <h1 className="text-xl font-semibold">Báo cáo kết quả hoạt động kinh doanh</h1>
  {canExport && (
    <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
      Xuất Excel
    </Button>
  )}
</div>
```
(`canExport` đang được destructure nhưng chưa dùng — nay dùng để gate nút, hết cảnh báo unused.)

- [ ] **Step 6: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/kqkd/
git commit -m "feat(bao-cao): xuất Excel KQKD (+ adapter dùng chung)"
```

---

## Task 5: Sổ chi tiết tài khoản (#7) — 1 sheet nhiều khối

**Files:**
- Create: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietExport.ts`
- Test: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietExport.test.ts`
- Modify: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx`

**Interfaces:**
- Consumes: `ReportSheet`, `NUM_FMT` (Task 1); `REGISTRY`, `buildDisplayRows`, type `DisplayRow`, `ColumnDef` từ `./columnRegistry`; `SoChiTietReport` từ `@/services/soChiTietTaiKhoanService`.
- Produces: `buildSoChiTietSheets(reports: SoChiTietReport[], visibleKeys: string[], from: string, to: string): ReportSheet[]` (rỗng nếu `reports` rỗng).

Ghi chú: cột số = `['phatSinhNo','phatSinhCo','soDuNo','soDuCo']` (dùng `NUM_FMT`). Header gộp theo `parentHeader` (giống `buildAntdColumns`). Mỗi report = 1 `section` (mã+tên TK, dòng đối tượng nếu có vào section text) rồi các dòng `buildDisplayRows`; dòng không phải `entry` (opening/cong/cuoi) in đậm.

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietExport.test.ts
import { describe, it, expect } from "vitest";
import { buildSoChiTietSheets } from "./soChiTietExport";
import { defaultVisibleKeys } from "./columnRegistry";
import type { SoChiTietReport } from "@/services/soChiTietTaiKhoanService";

const report = {
  taiKhoan: { ma: "111", ten: "Tiền mặt" },
  doiTuong: null,
  soDuDauKyNo: 100, soDuDauKyCo: 0,
  tongPhatSinhNo: 50, tongPhatSinhCo: 20,
  soDuCuoiKyNo: 130, soDuCuoiKyCo: 0,
  rows: [
    { ngay: "2026-07-02", ngayChungTu: "2026-07-02", soPhieu: "PT001", noiDung: "Thu tiền", tkDoiUng: "131", phatSinhNo: 50, phatSinhCo: 0, soDuNo: 150, soDuCo: 0 },
  ],
} as unknown as SoChiTietReport;

describe("buildSoChiTietSheets", () => {
  it("empty when no reports", () => {
    expect(buildSoChiTietSheets([], defaultVisibleKeys(), "01/07/2026", "31/07/2026")).toEqual([]);
  });
  it("one sheet, section title per account, bold non-entry rows", () => {
    const [sheet] = buildSoChiTietSheets([report], defaultVisibleKeys(), "01/07/2026", "31/07/2026");
    expect(sheet.rows[0].section).toContain("111");
    // opening là dòng đầu tiên sau section
    const opening = sheet.rows.find((r) => r.cells?.noiDung === "Số dư đầu kỳ");
    expect(opening?.bold).toBe(true);
    expect(opening?.cells?.soDuNo).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { SoChiTietReport } from "@/services/soChiTietTaiKhoanService";
import { REGISTRY, buildDisplayRows, type ColumnDef, type DisplayRow } from "./columnRegistry";

const NUMERIC_KEYS = new Set(["phatSinhNo", "phatSinhCo", "soDuNo", "soDuCo"]);

function toReportCol(c: ColumnDef): ReportCol {
  return {
    key: c.dataIndex,
    header: c.title,
    width: c.width ? Math.round(c.width / 8) : 15,
    align: c.align,
    numFmt: NUMERIC_KEYS.has(c.key) ? NUM_FMT : undefined,
  };
}

// Gộp cột liền kề cùng parentHeader (giống buildAntdColumns).
function buildColumns(visibleKeys: string[]): ReportCol[] {
  const visible = REGISTRY.filter((c) => visibleKeys.includes(c.key));
  const cols: ReportCol[] = [];
  let i = 0;
  while (i < visible.length) {
    const c = visible[i];
    if (!c.parentHeader) { cols.push(toReportCol(c)); i += 1; continue; }
    const header = c.parentHeader;
    const children: ReportCol[] = [];
    while (i < visible.length && visible[i].parentHeader === header) {
      children.push(toReportCol(visible[i]));
      i += 1;
    }
    cols.push({ key: header, header, children });
  }
  return cols;
}

function rowCells(r: DisplayRow): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const def of REGISTRY) {
    const v = (r as unknown as Record<string, unknown>)[def.dataIndex];
    out[def.dataIndex] = typeof v === "number" || typeof v === "string" ? v : null;
  }
  return out;
}

export function buildSoChiTietSheets(
  reports: SoChiTietReport[],
  visibleKeys: string[],
  from: string,
  to: string,
): ReportSheet[] {
  if (!reports.length) return [];
  const columns = buildColumns(visibleKeys);
  const rows: ReportRow[] = [];
  reports.forEach((rep, idx) => {
    const dt = rep.doiTuong ? ` | Đối tượng: ${rep.doiTuong.ma} - ${rep.doiTuong.ten}` : "";
    if (idx > 0) rows.push({ spacer: true }); // dòng trống ngăn cách khối (từ khối 2)
    rows.push({ section: `Tài khoản: ${rep.taiKhoan.ma} - ${rep.taiKhoan.ten}${dt}` });
    for (const dr of buildDisplayRows(rep)) {
      rows.push({ cells: rowCells(dr), bold: dr.kind !== "entry" });
    }
  });
  return [
    {
      name: "Sổ chi tiết tài khoản",
      title: "SỔ CHI TIẾT TÀI KHOẢN",
      meta: [`Từ ngày ${from} đến ngày ${to}`],
      columns,
      rows,
    },
  ];
}
```

Ghi chú: mỗi `ReportRow` chỉ mang 1 vai trò — `spacer` HOẶC `section` HOẶC `cells`. `writeSheet` xử lý `spacer` rồi `continue`, nên dòng trống ngăn cách khối phải là row riêng đứng TRƯỚC row `section` (đã làm đúng ở code trên).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietExport.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the button**

Trong `SoChiTietTaiKhoanPage.tsx`:
1. Imports: thêm `ExportOutlined` (đang có `AccountBookOutlined, HomeOutlined, ReloadOutlined`); `import { exportReportExcel } from "@/utils/exportReportExcel";` `import { buildSoChiTietSheets } from "./soChiTietExport";`.
2. Thêm state + handler (dùng `reports`, `visibleKeys`, `range`):

```tsx
const [exporting, setExporting] = useState(false);
const handleExport = async () => {
  const from = range[0].format("DD/MM/YYYY");
  const to = range[1].format("DD/MM/YYYY");
  const sheets = buildSoChiTietSheets(reports ?? [], visibleKeys, from, to);
  if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
  setExporting(true);
  try {
    await exportReportExcel(
      `So chi tiet tai khoan_${range[0].format("DDMMYYYY")}-${range[1].format("DDMMYYYY")}`,
      sheets,
    );
    message.success("Đã xuất Excel");
  } catch (e) {
    console.error("export excel error", e);
    message.error("Xuất Excel thất bại");
  } finally {
    setExporting(false);
  }
};
```
3. Trong `FilterBar` `actions`, thêm nút trước "Xem":

```tsx
actions={
  <>
    <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
      Xuất Excel
    </Button>
    <Button type="primary" onClick={loadReport}>Xem</Button>
    <Button icon={<ReloadOutlined />} onClick={loadReport}>Làm mới</Button>
  </>
}
```

- [ ] **Step 6: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/
git commit -m "feat(bao-cao): xuất Excel Sổ chi tiết tài khoản (nhiều khối)"
```

---

## Task 6: PnL / Lãi lỗ (#3)

**Files:**
- Create: `fe/src/pages/bao-cao/pnl/pnlExport.ts`
- Test: `fe/src/pages/bao-cao/pnl/pnlExport.test.ts`
- Modify: `fe/src/pages/bao-cao/pnl/PnLPage.tsx`

**Interfaces:**
- Consumes: `ReportSheet`, `NUM_FMT` (Task 1); `PnLGroupedData`, `PnLSummary`, `PnLItem` từ `@/services/pnlService`.
- Produces: `buildPnLSheets(groupedData: PnLGroupedData[], summary: PnLSummary | null, periodLabel: string): ReportSheet[]` (rỗng nếu `groupedData` rỗng và `summary` null).

Logic sao chép từ `buildTableData()` trong page: mỗi group → dòng category (bold) + các item (indent 1); rồi LỢI NHUẬN TRƯỚC THUẾ (bold), Thuế TNDN (indent 1), LỢI NHUẬN SAU THUẾ (bold).

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/pages/bao-cao/pnl/pnlExport.test.ts
import { describe, it, expect } from "vitest";
import { buildPnLSheets } from "./pnlExport";
import type { PnLGroupedData, PnLSummary } from "@/services/pnlService";

const grouped = [
  { category: { name: "DOANH THU" }, subtotal: 1000, items: [{ ma: "511", ten: "Bán hàng", soTien: 1000 }] },
] as unknown as PnLGroupedData[];
const summary = { loiNhuanTruocThue: 300, thue: 60, loiNhuanSauThue: 240 } as unknown as PnLSummary;

describe("buildPnLSheets", () => {
  it("empty when no data", () => {
    expect(buildPnLSheets([], null, "Tháng này")).toEqual([]);
  });
  it("category bold, item indented, summary rows bold", () => {
    const [sheet] = buildPnLSheets(grouped, summary, "Tháng này");
    expect(sheet.rows[0].cells?.khoanMuc).toBe("DOANH THU");
    expect(sheet.rows[0].bold).toBe(true);
    expect(sheet.rows[1].indent).toBe(1);
    const lnst = sheet.rows.find((r) => r.cells?.khoanMuc === "LỢI NHUẬN SAU THUẾ");
    expect(lnst?.bold).toBe(true);
    expect(lnst?.cells?.soTien).toBe(240);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/pnl/pnlExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/pages/bao-cao/pnl/pnlExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { PnLGroupedData, PnLItem, PnLSummary } from "@/services/pnlService";

const COLUMNS: ReportCol[] = [
  { key: "khoanMuc", header: "Khoản mục", width: 42 },
  { key: "soTien", header: "Số tiền", numFmt: NUM_FMT, width: 20 },
];

export function buildPnLSheets(
  groupedData: PnLGroupedData[],
  summary: PnLSummary | null,
  periodLabel: string,
): ReportSheet[] {
  if (!groupedData.length && !summary) return [];
  const rows: ReportRow[] = [];
  for (const group of groupedData) {
    rows.push({ cells: { khoanMuc: group.category.name, soTien: group.subtotal }, bold: true, fill: "category" });
    group.items.forEach((item: PnLItem) => {
      rows.push({ cells: { khoanMuc: `${item.ma} - ${item.ten}`, soTien: item.soTien }, indent: 1 });
    });
  }
  rows.push({ cells: { khoanMuc: "LỢI NHUẬN TRƯỚC THUẾ", soTien: summary?.loiNhuanTruocThue ?? 0 }, bold: true, fill: "total" });
  rows.push({ cells: { khoanMuc: "Thuế TNDN (20%)", soTien: -(summary?.thue ?? 0) }, indent: 1 });
  rows.push({ cells: { khoanMuc: "LỢI NHUẬN SAU THUẾ", soTien: summary?.loiNhuanSauThue ?? 0 }, bold: true, fill: "total" });
  return [
    {
      name: "Lãi lỗ (P&L)",
      title: "BÁO CÁO LÃI LỖ (P&L)",
      meta: [`Kỳ: ${periodLabel}`],
      columns: COLUMNS,
      rows,
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/pnl/pnlExport.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the button**

Trong `PnLPage.tsx` (nút "Xuất Excel" đã có, no-op, trong `FilterBar` actions):
1. Imports: `import { message } from "antd";` (thêm vào import antd); `import { exportReportExcel } from "@/utils/exportReportExcel";` `import { buildPnLSheets } from "./pnlExport";`.
2. `periodLabel` từ `selectedPeriod`:

```tsx
const PERIOD_LABEL: Record<typeof selectedPeriod, string> = {
  thangNay: "Tháng này", thangTruoc: "Tháng trước", luyKe: "Lũy kế năm",
};
const [exporting, setExporting] = useState(false);
const handleExport = async () => {
  const sheets = buildPnLSheets(groupedData, summary, PERIOD_LABEL[selectedPeriod]);
  if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
  setExporting(true);
  try {
    await exportReportExcel("Bao cao lai lo PnL", sheets);
    message.success("Đã xuất Excel");
  } catch (e) {
    console.error("export excel error", e);
    message.error("Xuất Excel thất bại");
  } finally {
    setExporting(false);
  }
};
```
(Khai `PERIOD_LABEL` với key literal type có thể vướng lint; nếu vậy dùng `Record<string, string>`.)
3. Đổi nút no-op:

```tsx
{canExport && (
  <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
    Xuất Excel
  </Button>
)}
```

- [ ] **Step 6: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/pnl/
git commit -m "feat(bao-cao): xuất Excel Lãi lỗ (P&L)"
```

---

## Task 7: Sổ cái (#1) — theo tab đang mở

**Files:**
- Create: `fe/src/pages/bao-cao/so-cai/soCaiExport.ts`
- Test: `fe/src/pages/bao-cao/so-cai/soCaiExport.test.ts`
- Modify: `fe/src/pages/bao-cao/so-cai/SoCaiPage.tsx`

**Interfaces:**
- Consumes: `ReportSheet`, `NUM_FMT` (Task 1); `SoCaiByAccount`, `SoCaiEntry`, `TrialBalance` từ `@/services/soCaiService`.
- Produces: `buildSoCaiSheets(activeTab: string, s: { summaryData: SoCaiByAccount[]; selectedAccount: SoCaiByAccount | null; trialBalance: TrialBalance[] }): ReportSheet[]` (rỗng nếu tab không có dữ liệu).

`SoCaiByAccount`: `taiKhoan, tenTaiKhoan, soDuDauKyNo, soDuDauKyCo, phatSinhNo, phatSinhCo, soDuCuoiKyNo, soDuCuoiKyCo, chiTiet: SoCaiEntry[]`. `SoCaiEntry`: `ngay, soPhieu, loaiChungTu, dienGiai, phatSinhNo, phatSinhCo, soDuNo, soDuCo`. `TrialBalance`: `taiKhoan, tenTaiKhoan, soDuDauKyNo, soDuDauKyCo, phatSinhNo, phatSinhCo, soDuCuoiKyNo, soDuCuoiKyCo`.

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/pages/bao-cao/so-cai/soCaiExport.test.ts
import { describe, it, expect } from "vitest";
import { buildSoCaiSheets } from "./soCaiExport";
import type { SoCaiByAccount, TrialBalance } from "@/services/soCaiService";

const acc = {
  taiKhoan: "111", tenTaiKhoan: "Tiền mặt",
  soDuDauKyNo: 100, soDuDauKyCo: 0, phatSinhNo: 50, phatSinhCo: 20,
  soDuCuoiKyNo: 130, soDuCuoiKyCo: 0, chiTiet: [],
} as unknown as SoCaiByAccount;
const tb = [{ taiKhoan: "111", tenTaiKhoan: "Tiền mặt", soDuDauKyNo: 100, soDuDauKyCo: 0, phatSinhNo: 50, phatSinhCo: 20, soDuCuoiKyNo: 130, soDuCuoiKyCo: 0 }] as unknown as TrialBalance[];

describe("buildSoCaiSheets", () => {
  it("tab 1: summary + Tổng cộng bold", () => {
    const [sheet] = buildSoCaiSheets("1", { summaryData: [acc], selectedAccount: null, trialBalance: [] });
    expect(sheet.rows[0].cells?.taiKhoan).toBe("111");
    const total = sheet.rows[sheet.rows.length - 1];
    expect(total.bold).toBe(true);
    expect(total.cells?.phatSinhNo).toBe(50);
  });
  it("tab 2 without selectedAccount returns empty", () => {
    expect(buildSoCaiSheets("2", { summaryData: [], selectedAccount: null, trialBalance: [] })).toEqual([]);
  });
  it("tab 3: trial balance grouped + total", () => {
    const [sheet] = buildSoCaiSheets("3", { summaryData: [], selectedAccount: null, trialBalance: tb });
    expect(sheet.columns.some((c) => c.children)).toBe(true);
    expect(sheet.rows[sheet.rows.length - 1].cells?.taiKhoan).toBe("Tổng cộng");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-cai/soCaiExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/pages/bao-cao/so-cai/soCaiExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { SoCaiByAccount, SoCaiEntry, TrialBalance } from "@/services/soCaiService";

const numC = (k: string, h: string): ReportCol => ({ key: k, header: h, numFmt: NUM_FMT, width: 16 });

interface SoCaiExportState {
  summaryData: SoCaiByAccount[];
  selectedAccount: SoCaiByAccount | null;
  trialBalance: TrialBalance[];
}

const BALANCE_COLUMNS: ReportCol[] = [
  { key: "taiKhoan", header: "TK", width: 10 },
  { key: "tenTaiKhoan", header: "Tên tài khoản", width: 28 },
  { key: "dk", header: "Số dư đầu kỳ", children: [numC("soDuDauKyNo", "Nợ"), numC("soDuDauKyCo", "Có")] },
  { key: "ps", header: "Phát sinh trong kỳ", children: [numC("phatSinhNo", "Nợ"), numC("phatSinhCo", "Có")] },
  { key: "ck", header: "Số dư cuối kỳ", children: [numC("soDuCuoiKyNo", "Nợ"), numC("soDuCuoiKyCo", "Có")] },
];

type BalanceLike = {
  taiKhoan: string; tenTaiKhoan: string;
  soDuDauKyNo: number; soDuDauKyCo: number;
  phatSinhNo: number; phatSinhCo: number;
  soDuCuoiKyNo: number; soDuCuoiKyCo: number;
};

function balanceRows(list: BalanceLike[]): ReportRow[] {
  const rows: ReportRow[] = list.map((r) => ({
    cells: {
      taiKhoan: r.taiKhoan, tenTaiKhoan: r.tenTaiKhoan,
      soDuDauKyNo: r.soDuDauKyNo, soDuDauKyCo: r.soDuDauKyCo,
      phatSinhNo: r.phatSinhNo, phatSinhCo: r.phatSinhCo,
      soDuCuoiKyNo: r.soDuCuoiKyNo, soDuCuoiKyCo: r.soDuCuoiKyCo,
    },
  }));
  const t = list.reduce(
    (a, r) => ({
      soDuDauKyNo: a.soDuDauKyNo + r.soDuDauKyNo, soDuDauKyCo: a.soDuDauKyCo + r.soDuDauKyCo,
      phatSinhNo: a.phatSinhNo + r.phatSinhNo, phatSinhCo: a.phatSinhCo + r.phatSinhCo,
      soDuCuoiKyNo: a.soDuCuoiKyNo + r.soDuCuoiKyNo, soDuCuoiKyCo: a.soDuCuoiKyCo + r.soDuCuoiKyCo,
    }),
    { soDuDauKyNo: 0, soDuDauKyCo: 0, phatSinhNo: 0, phatSinhCo: 0, soDuCuoiKyNo: 0, soDuCuoiKyCo: 0 },
  );
  rows.push({ cells: { taiKhoan: "Tổng cộng", tenTaiKhoan: "", ...t }, bold: true, fill: "total" });
  return rows;
}

const DETAIL_COLUMNS: ReportCol[] = [
  { key: "ngay", header: "Ngày", width: 12 },
  { key: "soPhieu", header: "Số chứng từ", width: 14 },
  { key: "loaiChungTu", header: "Loại CT", width: 12 },
  { key: "dienGiai", header: "Diễn giải", width: 40 },
  numC("phatSinhNo", "Phát sinh Nợ"),
  numC("phatSinhCo", "Phát sinh Có"),
  numC("soDuNo", "Số dư Nợ"),
  numC("soDuCo", "Số dư Có"),
];

export function buildSoCaiSheets(activeTab: string, s: SoCaiExportState): ReportSheet[] {
  if (activeTab === "1") {
    if (!s.summaryData.length) return [];
    return [{ name: "Tổng hợp theo TK", title: "SỔ CÁI - TỔNG HỢP THEO TÀI KHOẢN", columns: BALANCE_COLUMNS, rows: balanceRows(s.summaryData) }];
  }
  if (activeTab === "2") {
    const a = s.selectedAccount;
    if (!a) return [];
    const rows: ReportRow[] = (a.chiTiet ?? []).map((e: SoCaiEntry) => ({
      cells: {
        ngay: e.ngay, soPhieu: e.soPhieu, loaiChungTu: e.loaiChungTu, dienGiai: e.dienGiai,
        phatSinhNo: e.phatSinhNo, phatSinhCo: e.phatSinhCo, soDuNo: e.soDuNo, soDuCo: e.soDuCo,
      },
    }));
    return [{
      name: "Chi tiết tài khoản",
      title: `SỔ CÁI - CHI TIẾT TÀI KHOẢN ${a.taiKhoan} - ${a.tenTaiKhoan}`,
      meta: [
        `Số dư đầu kỳ: Nợ ${a.soDuDauKyNo.toLocaleString("vi-VN")} / Có ${a.soDuDauKyCo.toLocaleString("vi-VN")}`,
        `Số dư cuối kỳ: Nợ ${a.soDuCuoiKyNo.toLocaleString("vi-VN")} / Có ${a.soDuCuoiKyCo.toLocaleString("vi-VN")}`,
      ],
      columns: DETAIL_COLUMNS,
      rows,
    }];
  }
  if (activeTab === "3") {
    if (!s.trialBalance.length) return [];
    return [{ name: "Bảng cân đối phát sinh", title: "BẢNG CÂN ĐỐI PHÁT SINH", columns: BALANCE_COLUMNS, rows: balanceRows(s.trialBalance) }];
  }
  return [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-cai/soCaiExport.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the button**

Trong `SoCaiPage.tsx` (nút no-op trong `FilterBar` actions, có `activeTab` state):
1. Imports: `import { message } from "antd";` (thêm vào import antd); `import { exportReportExcel } from "@/utils/exportReportExcel";` `import { buildSoCaiSheets } from "./soCaiExport";`.
2. Handler:

```tsx
const [exporting, setExporting] = useState(false);
const handleExport = async () => {
  const sheets = buildSoCaiSheets(activeTab, { summaryData, selectedAccount, trialBalance });
  if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất (tab hiện tại)"); return; }
  setExporting(true);
  try {
    await exportReportExcel("So cai", sheets);
    message.success("Đã xuất Excel");
  } catch (e) {
    console.error("export excel error", e);
    message.error("Xuất Excel thất bại");
  } finally {
    setExporting(false);
  }
};
```
3. Đổi nút no-op thành `onClick={handleExport} loading={exporting}`.

- [ ] **Step 6: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/so-cai/
git commit -m "feat(bao-cao): xuất Excel Sổ cái (theo tab)"
```

---

## Task 8: Bảng cân đối kế toán (#2)

**Files:**
- Create: `fe/src/pages/bao-cao/bang-can-doi/bangCanDoiExport.ts`
- Test: `fe/src/pages/bao-cao/bang-can-doi/bangCanDoiExport.test.ts`
- Modify: `fe/src/pages/bao-cao/bang-can-doi/BangCanDoiPage.tsx`

**Interfaces:**
- Consumes: `ReportSheet`, `NUM_FMT` (Task 1); `BalanceSheetData`, `BalanceSheetItem` từ `@/services/balanceSheetService`.
- Produces: `buildBangCanDoiSheets(activeTab: string, data: BalanceSheetData | null): ReportSheet[]` (rỗng nếu tab ≠ "1" hoặc data null).

`BalanceSheetItem`: `ma, tenChiTieu, dauNam, cuoiKy, level, isSection?, isTotal?`. `BalanceSheetData`: `taiSan: BalanceSheetItem[]; nguonVon: BalanceSheetItem[]; tongTaiSan: { cuoiKy: number; dauNam?: number }; tongNguonVon: {...}`.

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/pages/bao-cao/bang-can-doi/bangCanDoiExport.test.ts
import { describe, it, expect } from "vitest";
import { buildBangCanDoiSheets } from "./bangCanDoiExport";
import type { BalanceSheetData } from "@/services/balanceSheetService";

const data = {
  taiSan: [
    { ma: "100", tenChiTieu: "TÀI SẢN NGẮN HẠN", dauNam: 0, cuoiKy: 500, level: 0, isSection: true },
    { ma: "110", tenChiTieu: "Tiền", dauNam: 100, cuoiKy: 300, level: 1 },
  ],
  nguonVon: [
    { ma: "300", tenChiTieu: "NỢ PHẢI TRẢ", dauNam: 0, cuoiKy: 200, level: 0, isSection: true },
  ],
  tongTaiSan: { cuoiKy: 500, dauNam: 100 },
  tongNguonVon: { cuoiKy: 500, dauNam: 100 },
} as unknown as BalanceSheetData;

describe("buildBangCanDoiSheets", () => {
  it("empty on chart tab", () => {
    expect(buildBangCanDoiSheets("2", data)).toEqual([]);
  });
  it("tab 1: two blocks with section titles + tổng cộng bold rows", () => {
    const [sheet] = buildBangCanDoiSheets("1", data);
    const sections = sheet.rows.filter((r) => r.section);
    expect(sections.map((s) => s.section)).toEqual(["TÀI SẢN", "NGUỒN VỐN"]);
    const totals = sheet.rows.filter((r) => r.bold && typeof r.cells?.tenChiTieu === "string" && String(r.cells?.tenChiTieu).startsWith("TỔNG CỘNG"));
    expect(totals.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/bang-can-doi/bangCanDoiExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/pages/bao-cao/bang-can-doi/bangCanDoiExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { BalanceSheetData, BalanceSheetItem } from "@/services/balanceSheetService";

const COLUMNS: ReportCol[] = [
  { key: "tenChiTieu", header: "Chỉ tiêu", width: 45 },
  { key: "ma", header: "Mã số", width: 10, align: "center" },
  { key: "dauNam", header: "Số đầu năm", numFmt: NUM_FMT, width: 18 },
  { key: "cuoiKy", header: "Số cuối kỳ", numFmt: NUM_FMT, width: 18 },
  { key: "chenhLech", header: "Chênh lệch", numFmt: NUM_FMT, width: 16 },
];

function itemRows(items: BalanceSheetItem[]): ReportRow[] {
  return items.map((it) => ({
    cells: {
      tenChiTieu: it.tenChiTieu, ma: it.ma,
      dauNam: it.dauNam, cuoiKy: it.cuoiKy,
      chenhLech: it.cuoiKy - it.dauNam,
    },
    bold: Boolean(it.isSection || it.isTotal),
    indent: it.level,
  }));
}

export function buildBangCanDoiSheets(activeTab: string, data: BalanceSheetData | null): ReportSheet[] {
  if (activeTab !== "1" || !data) return [];
  const rows: ReportRow[] = [];
  rows.push({ section: "TÀI SẢN" });
  rows.push(...itemRows(data.taiSan));
  rows.push({ cells: { tenChiTieu: "TỔNG CỘNG TÀI SẢN", ma: "", dauNam: data.tongTaiSan.dauNam ?? 0, cuoiKy: data.tongTaiSan.cuoiKy, chenhLech: data.tongTaiSan.cuoiKy - (data.tongTaiSan.dauNam ?? 0) }, bold: true, fill: "total" });
  rows.push({ spacer: true });
  rows.push({ section: "NGUỒN VỐN" });
  rows.push(...itemRows(data.nguonVon));
  rows.push({ cells: { tenChiTieu: "TỔNG CỘNG NGUỒN VỐN", ma: "", dauNam: data.tongNguonVon.dauNam ?? 0, cuoiKy: data.tongNguonVon.cuoiKy, chenhLech: data.tongNguonVon.cuoiKy - (data.tongNguonVon.dauNam ?? 0) }, bold: true, fill: "total" });
  return [{ name: "Cân đối kế toán", title: "BẢNG CÂN ĐỐI KẾ TOÁN", columns: COLUMNS, rows }];
}
```

Ghi chú kiểu: nếu `tongTaiSan`/`tongNguonVon` không có field `dauNam`, dùng `(data.tongTaiSan as { dauNam?: number }).dauNam ?? 0` — đã xử lý bằng `?? 0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/bang-can-doi/bangCanDoiExport.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the button**

Trong `BangCanDoiPage.tsx` (nút no-op trong `extra`, có `activeTab`, `data`):
1. Imports: `import { message } from "antd";` (thêm); `import { exportReportExcel } from "@/utils/exportReportExcel";` `import { buildBangCanDoiSheets } from "./bangCanDoiExport";`.
2. Handler:

```tsx
const [exporting, setExporting] = useState(false);
const handleExport = async () => {
  const sheets = buildBangCanDoiSheets(activeTab, data);
  if (sheets.length === 0) { message.warning("Tab này không có bảng để xuất"); return; }
  setExporting(true);
  try {
    await exportReportExcel("Bang can doi ke toan", sheets);
    message.success("Đã xuất Excel");
  } catch (e) {
    console.error("export excel error", e);
    message.error("Xuất Excel thất bại");
  } finally {
    setExporting(false);
  }
};
```
3. Đổi nút no-op thành `onClick={handleExport} loading={exporting}`.

- [ ] **Step 6: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/bang-can-doi/
git commit -m "feat(bao-cao): xuất Excel Bảng cân đối kế toán"
```

---

## Task 9: Báo cáo tài chính (#4) — theo tab, có cây

**Files:**
- Create: `fe/src/pages/bao-cao/tai-chinh/taiChinhExport.ts`
- Test: `fe/src/pages/bao-cao/tai-chinh/taiChinhExport.test.ts`
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`

**Interfaces:**
- Consumes: `ReportSheet`, `NUM_FMT` (Task 1); `buildKqkdSheet` (Task 4); `TreeNode` từ `./utils/buildAccountTree`; `TrialBalance` từ `@/services/soCaiService`; `BalanceSheetItem` từ `@/services/balanceSheetService`; `KqkdReport` từ `@/services/kqkdService`; `PnLComparisonData` từ `@/services/pnlService`.
- Produces: `buildTaiChinhSheets(activeTab, s, periodLabel): ReportSheet[]` với
  `s: { trialBalanceTree: TreeNode<TrialBalance>[]; trialBalance: TrialBalance[]; taiSanTree: TreeNode<BalanceSheetItem>[]; nguonVonTree: TreeNode<BalanceSheetItem>[]; kqkdData: KqkdReport | null; pnlComparison: PnLComparisonData | null }`.

Nguyên tắc số tiền cây (khớp web `renderTrialAmount`/`CurrencyCell`): node cha (`__isParent`) = giá trị của chính nó **cộng** `__rollup[field]`; node lá = giá trị chính nó. Thụt lề = độ sâu trong cây.

- [ ] **Step 1: Write the failing test**

```ts
// fe/src/pages/bao-cao/tai-chinh/taiChinhExport.test.ts
import { describe, it, expect } from "vitest";
import { buildTaiChinhSheets } from "./taiChinhExport";
import type { TreeNode } from "./utils/buildAccountTree";
import type { TrialBalance } from "@/services/soCaiService";

const tree: TreeNode<TrialBalance>[] = [
  {
    taiKhoan: "1", tenTaiKhoan: "Loại 1",
    soDuDauKyNo: 0, soDuDauKyCo: 0, phatSinhNo: 0, phatSinhCo: 0, soDuCuoiKyNo: 0, soDuCuoiKyCo: 0,
    __ma: "1", __isParent: true, __rollup: { soDuCuoiKyNo: 130 } as Record<string, number>,
    children: [
      {
        taiKhoan: "111", tenTaiKhoan: "Tiền mặt",
        soDuDauKyNo: 100, soDuDauKyCo: 0, phatSinhNo: 50, phatSinhCo: 20, soDuCuoiKyNo: 130, soDuCuoiKyCo: 0,
        __ma: "111", __isParent: false, __rollup: {} as Record<string, number>,
      } as TreeNode<TrialBalance>,
    ],
  } as TreeNode<TrialBalance>,
];

const state = {
  trialBalanceTree: tree,
  trialBalance: [{ taiKhoan: "111", tenTaiKhoan: "Tiền mặt", soDuDauKyNo: 100, soDuDauKyCo: 0, phatSinhNo: 50, phatSinhCo: 20, soDuCuoiKyNo: 130, soDuCuoiKyCo: 0 }] as unknown as TrialBalance[],
  taiSanTree: [], nguonVonTree: [], kqkdData: null, pnlComparison: null,
};

describe("buildTaiChinhSheets", () => {
  it("tab 1: parent indent 0, child indent 1, parent cuoiKyNo = own + rollup", () => {
    const [sheet] = buildTaiChinhSheets("1", state, "Năm 2026");
    expect(sheet.rows[0].indent).toBe(0);
    expect(sheet.rows[0].cells?.soDuCuoiKyNo).toBe(130); // 0 + rollup 130
    expect(sheet.rows[1].indent).toBe(1);
    expect(sheet.rows[1].cells?.soDuCuoiKyNo).toBe(130);
    const total = sheet.rows[sheet.rows.length - 1];
    expect(total.cells?.taiKhoan).toBe("Tổng cộng");
    expect(total.cells?.phatSinhNo).toBe(50);
  });
  it("tab 3 without kqkd returns empty", () => {
    expect(buildTaiChinhSheets("3", state, "Năm 2026")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/tai-chinh/taiChinhExport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// fe/src/pages/bao-cao/tai-chinh/taiChinhExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import { buildKqkdSheet } from "@/pages/bao-cao/kqkd/kqkdExport";
import type { TreeNode } from "./utils/buildAccountTree";
import type { TrialBalance } from "@/services/soCaiService";
import type { BalanceSheetItem } from "@/services/balanceSheetService";
import type { KqkdReport } from "@/services/kqkdService";
import type { PnLComparisonData } from "@/services/pnlService";

const numC = (k: string, h: string): ReportCol => ({ key: k, header: h, numFmt: NUM_FMT, width: 16 });

export interface TaiChinhExportState {
  trialBalanceTree: TreeNode<TrialBalance>[];
  trialBalance: TrialBalance[];
  taiSanTree: TreeNode<BalanceSheetItem>[];
  nguonVonTree: TreeNode<BalanceSheetItem>[];
  kqkdData: KqkdReport | null;
  pnlComparison: PnLComparisonData | null;
}

// Số hiển thị: cha = own + rollup, lá = own.
function amount<T>(node: TreeNode<T>, field: string): number {
  const own = Number((node as unknown as Record<string, unknown>)[field]) || 0;
  if (node.__isParent) return own + (node.__rollup[field] ?? 0);
  return own;
}

// Duyệt cây phẳng kèm độ sâu.
function flatten<T>(nodes: TreeNode<T>[], depth: number, out: { node: TreeNode<T>; depth: number }[]): void {
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children && n.children.length) flatten(n.children, depth + 1, out);
  }
}

const TB_COLUMNS: ReportCol[] = [
  { key: "taiKhoan", header: "Tài khoản", width: 12 },
  { key: "tenTaiKhoan", header: "Tên tài khoản", width: 32 },
  { key: "dk", header: "Số dư đầu kỳ", children: [numC("soDuDauKyNo", "Nợ"), numC("soDuDauKyCo", "Có")] },
  { key: "ps", header: "Phát sinh trong kỳ", children: [numC("phatSinhNo", "Nợ"), numC("phatSinhCo", "Có")] },
  { key: "ck", header: "Số dư cuối kỳ", children: [numC("soDuCuoiKyNo", "Nợ"), numC("soDuCuoiKyCo", "Có")] },
];

const TB_FIELDS = ["soDuDauKyNo", "soDuDauKyCo", "phatSinhNo", "phatSinhCo", "soDuCuoiKyNo", "soDuCuoiKyCo"] as const;

function trialBalanceSheet(state: TaiChinhExportState, periodLabel: string): ReportSheet {
  const flat: { node: TreeNode<TrialBalance>; depth: number }[] = [];
  flatten(state.trialBalanceTree, 0, flat);
  const rows: ReportRow[] = flat.map(({ node, depth }) => {
    const cells: Record<string, string | number> = { taiKhoan: node.taiKhoan, tenTaiKhoan: node.tenTaiKhoan };
    for (const f of TB_FIELDS) cells[f] = amount(node, f);
    return { cells, bold: node.__isParent, indent: depth };
  });
  const t = state.trialBalance.reduce(
    (a, r) => {
      for (const f of TB_FIELDS) a[f] += Number(r[f as keyof TrialBalance]) || 0;
      return a;
    },
    Object.fromEntries(TB_FIELDS.map((f) => [f, 0])) as Record<string, number>,
  );
  rows.push({ cells: { taiKhoan: "Tổng cộng", tenTaiKhoan: "", ...t }, bold: true, fill: "total" });
  return { name: "Cân đối tài khoản", title: "CÂN ĐỐI TÀI KHOẢN", meta: [`Kỳ: ${periodLabel}`], columns: TB_COLUMNS, rows };
}

const BS_COLUMNS: ReportCol[] = [
  { key: "tenChiTieu", header: "Chỉ tiêu", width: 45 },
  { key: "ma", header: "Mã số", width: 10, align: "center" },
  numC("dauNam", "Số đầu năm"),
  numC("cuoiKy", "Số cuối kỳ"),
  numC("chenhLech", "Chênh lệch"),
];

function bsRows(nodes: TreeNode<BalanceSheetItem>[]): ReportRow[] {
  const flat: { node: TreeNode<BalanceSheetItem>; depth: number }[] = [];
  flatten(nodes, 0, flat);
  return flat.map(({ node, depth }) => {
    const dauNam = amount(node, "dauNam");
    const cuoiKy = amount(node, "cuoiKy");
    return {
      cells: { tenChiTieu: node.tenChiTieu, ma: node.ma, dauNam, cuoiKy, chenhLech: cuoiKy - dauNam },
      bold: Boolean(node.isSection || node.isTotal || node.__isParent),
      indent: depth,
    };
  });
}

function balanceSheetSheet(state: TaiChinhExportState, periodLabel: string): ReportSheet {
  const rows: ReportRow[] = [];
  rows.push({ section: "TÀI SẢN" });
  rows.push(...bsRows(state.taiSanTree));
  rows.push({ spacer: true });
  rows.push({ section: "NGUỒN VỐN" });
  rows.push(...bsRows(state.nguonVonTree));
  return { name: "Cân đối kế toán", title: "BẢNG CÂN ĐỐI KẾ TOÁN", meta: [`Kỳ: ${periodLabel}`], columns: BS_COLUMNS, rows };
}

const PNL_COMP_COLUMNS: ReportCol[] = [
  { key: "khoanMuc", header: "Khoản mục", width: 42 },
  numC("kyHienTai", "Kỳ hiện tại"),
  numC("kyTruoc", "Kỳ trước"),
  numC("bienDong", "Biến động"),
  { key: "phanTramBienDong", header: "% Biến động", numFmt: '0.0"%";(0.0"%");"-"', width: 14 },
];

type PnLCompRow = { key: string; khoanMuc: string; kyHienTai: number; kyTruoc: number; bienDong: number; phanTramBienDong: number | null; isCategory?: boolean; isSummary?: boolean };

// Sao chép nguyên logic buildPnLComparisonData của page (không phụ thuộc render).
function buildPnLComparisonRows(pnl: PnLComparisonData): PnLCompRow[] {
  const rows: PnLCompRow[] = [];
  const prev = pnl.kyTruoc;
  const makeRow = (key: string, name: string, cur: number, pre: number, opts?: { isCategory?: boolean; isSummary?: boolean }): PnLCompRow => {
    const diff = cur - pre;
    const pct = pre !== 0 ? (diff / Math.abs(pre)) * 100 : cur !== 0 ? 100 : null;
    return { key, khoanMuc: name, kyHienTai: cur, kyTruoc: pre, bienDong: diff, phanTramBienDong: pct, ...opts };
  };
  rows.push(makeRow("cat-dt", "DOANH THU", pnl.tongDoanhThu, prev.tongDoanhThu, { isCategory: true }));
  pnl.doanhThu.forEach((item, i) => {
    const p = prev.doanhThu.find((x) => x.ma === item.ma);
    rows.push(makeRow(`dt-${i}`, `${item.ma} - ${item.ten}`, item.soTien, p?.soTien ?? 0));
  });
  rows.push(makeRow("cat-cp", "CHI PHÍ", pnl.tongChiPhi, prev.tongChiPhi, { isCategory: true }));
  pnl.chiPhi.forEach((item, i) => {
    const p = prev.chiPhi.find((x) => x.ma === item.ma);
    rows.push(makeRow(`cp-${i}`, `${item.ma} - ${item.ten}`, item.soTien, p?.soTien ?? 0));
  });
  const lnttCur = pnl.loiNhuan;
  const lnttPrev = prev.loiNhuan;
  rows.push(makeRow("lntt", "LỢI NHUẬN TRƯỚC THUẾ", lnttCur, lnttPrev, { isSummary: true }));
  const thueCur = lnttCur > 0 ? lnttCur * 0.2 : 0;
  const thuePrev = lnttPrev > 0 ? lnttPrev * 0.2 : 0;
  rows.push(makeRow("thue", "Thuế TNDN (20%)", -thueCur, -thuePrev));
  rows.push(makeRow("lnst", "LỢI NHUẬN SAU THUẾ", lnttCur - thueCur, lnttPrev - thuePrev, { isSummary: true }));
  return rows;
}

function pnlComparisonSheet(pnl: PnLComparisonData, periodLabel: string): ReportSheet {
  const rows: ReportRow[] = buildPnLComparisonRows(pnl).map((r) => ({
    cells: { khoanMuc: r.khoanMuc, kyHienTai: r.kyHienTai, kyTruoc: r.kyTruoc, bienDong: r.bienDong, phanTramBienDong: r.phanTramBienDong },
    bold: Boolean(r.isCategory || r.isSummary),
    indent: r.isCategory || r.isSummary ? 0 : 1,
    fill: r.isSummary ? "total" : r.isCategory ? "category" : undefined,
  }));
  return { name: "So sánh lãi lỗ", title: "SO SÁNH LÃI LỖ", meta: [`Kỳ: ${periodLabel}`], columns: PNL_COMP_COLUMNS, rows };
}

export function buildTaiChinhSheets(
  activeTab: string,
  state: TaiChinhExportState,
  periodLabel: string,
): ReportSheet[] {
  if (activeTab === "1") {
    if (!state.trialBalanceTree.length) return [];
    return [trialBalanceSheet(state, periodLabel)];
  }
  if (activeTab === "2") {
    if (!state.taiSanTree.length && !state.nguonVonTree.length) return [];
    return [balanceSheetSheet(state, periodLabel)];
  }
  if (activeTab === "3") {
    const chiTieu = state.kqkdData?.chiTieu ?? [];
    if (!chiTieu.length) return [];
    return [buildKqkdSheet(chiTieu, "KẾT QUẢ KINH DOANH", [`Kỳ: ${periodLabel}`], "Kết quả kinh doanh")];
  }
  if (activeTab === "4") {
    if (!state.pnlComparison) return [];
    return [pnlComparisonSheet(state.pnlComparison, periodLabel)];
  }
  return [];
}
```

Ghi chú kiểu: nếu `PnLComparisonData` không expose đúng field (`kyTruoc`, `doanhThu`, `chiPhi`, `tongDoanhThu`, `tongChiPhi`, `loiNhuan`), đối chiếu type ở `@/services/pnlService` và chỉnh tên field cho khớp (logic đã sao đúng từ `BaoCaoTaiChinhPage.tsx` nên field name khớp với page). Tương tự `KqkdReport.chiTieu` là `KqkdChiTieu[]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/tai-chinh/taiChinhExport.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the button**

Trong `BaoCaoTaiChinhPage.tsx` (nút no-op, có `activeTab`, `tbState`, `trialBalanceTree`, `taiSanTree`, `nguonVonTree`, `kqkdData`, `pnlComparison`, `filterParams`, hàm `getPeriodLabel`):
1. Imports: `import { message } from "antd";` (thêm vào import antd); `import { exportReportExcel } from "@/utils/exportReportExcel";` `import { buildTaiChinhSheets } from "./taiChinhExport";`.
2. Handler:

```tsx
const [exporting, setExporting] = useState(false);
const handleExport = async () => {
  const sheets = buildTaiChinhSheets(activeTab, {
    trialBalanceTree,
    trialBalance: tbState.trialBalance,
    taiSanTree,
    nguonVonTree,
    kqkdData,
    pnlComparison,
  }, getPeriodLabel(filterParams));
  if (sheets.length === 0) { message.warning("Tab này không có bảng để xuất"); return; }
  setExporting(true);
  try {
    await exportReportExcel("Bao cao tai chinh", sheets);
    message.success("Đã xuất Excel");
  } catch (e) {
    console.error("export excel error", e);
    message.error("Xuất Excel thất bại");
  } finally {
    setExporting(false);
  }
};
```
3. Tìm nút `<Button icon={<ExportOutlined />}>Xuất Excel</Button>` (dòng ~542) và đổi thành `onClick={handleExport} loading={exporting}`. Nếu nút đang bị gate bởi `canExport` thì giữ nguyên gate.

- [ ] **Step 6: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/tai-chinh/
git commit -m "feat(bao-cao): xuất Excel Báo cáo tài chính (theo tab, cây)"
```

---

## Task 10: Kiểm thử thủ công toàn bộ + tài liệu

**Files:** không tạo file; chỉ chạy app, đối chiếu.

- [ ] **Step 1: Chạy full test + build**

Run: `cd fe && npx vitest run src/pages/bao-cao src/utils/exportReportExcel.test.ts && npm run lint && npm run build`
Expected: tất cả PASS, build không lỗi.

- [ ] **Step 2: Kiểm thử tay**

`cd fe && npm run dev`, đăng nhập, mở từng báo cáo, bấm Xuất Excel, mở file kiểm tra:
- Đúng cột & thứ tự như bảng; header gộp đúng (công nợ, hợp đồng, KQKD, sổ cái tab 3, tài chính tab 1).
- Dòng tổng/nhóm in đậm; thụt lề đúng cấp (PnL, cân đối, tài chính cây).
- Số âm hiện `(1.234)`, ô 0/rỗng hiện `-`, phần trăm đúng (KQKD).
- Báo cáo nhiều tab: xuất đúng tab đang mở; tab biểu đồ (bảng cân đối tab 2) hiện `message.warning`.
- Sổ chi tiết nhiều TK: 1 file, mỗi TK 1 khối cách nhau dòng trống + tiêu đề.

- [ ] **Step 3: Commit (nếu có chỉnh sửa nhỏ khi kiểm thử)**

```bash
git add -A && git commit -m "test(bao-cao): kiểm thử tay xuất Excel + chỉnh nhỏ"
```
