# File mẫu import có dropdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** File mẫu import Nhật ký chung có dropdown (data validation) cho mọi cột danh mục — người dùng chọn "Mã - Tên" thay vì nhớ/gõ mã; khi import tự tách mã để khớp.

**Architecture:** Thêm `exceljs` (FE) để ghi template có data validation (xlsx community không làm được). `template.ts` sinh 1 sheet chính + 12 sheet danh mục ("Mã - Tên"), gắn dropdown trỏ tới range của sheet danh mục. Phần đọc import giữ `xlsx`; `validate.ts` thêm bước `extractCode` (lấy phần trước " - ") cho các cột danh mục trước khi khớp — tương thích cả file mới (dropdown) lẫn file cũ (gõ mã thuần).

**Tech Stack:** React + TS + Vite + Ant Design; `exceljs` (ghi template), `xlsx` (đọc). Test: vitest.

**Spec:** `docs/superpowers/specs/2026-06-03-import-excel-dropdown-template-design.md`

**Branch:** `feat/import-excel-dropdown-template`

---

## File Structure

- Create: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/extractCode.ts` — tách mã từ "Mã - Tên"
- Create test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/extractCode.test.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/columns.ts` — thêm `CODE_COLUMN_KEYS`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/validate.ts` — áp `extractCode` cho cột danh mục
- Modify test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts` — thêm case "Mã - Tên"
- Modify (rewrite): `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts` — exceljs
- Modify (rewrite) test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/components/UploadStep.tsx` — truyền masterData, disable đến khi load xong
- Modify: `fe/package.json` — dependency `exceljs`

---

## Task 1: `extractCode` helper

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/extractCode.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/extractCode.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `__tests__/extractCode.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractCode } from "../extractCode";

describe("extractCode", () => {
  it("lấy mã từ 'Mã - Tên'", () => {
    expect(extractCode("111 - Tiền mặt")).toBe("111");
    expect(extractCode("NV01 - Bán hàng (PHIEU_THU)")).toBe("NV01");
  });
  it("mã thuần giữ nguyên", () => {
    expect(extractCode("111")).toBe("111");
  });
  it("tên có dấu '-' thường (không có khoảng trắng hai bên) không bị tách", () => {
    expect(extractCode("ABC-XYZ")).toBe("ABC-XYZ");
  });
  it("tách ở ' - ' đầu tiên", () => {
    expect(extractCode("A - B - C")).toBe("A");
  });
  it("trim khoảng trắng", () => {
    expect(extractCode("  111 - x  ")).toBe("111");
  });
  it("rỗng / null / undefined → ''", () => {
    expect(extractCode("")).toBe("");
    expect(extractCode(undefined)).toBe("");
    expect(extractCode(null)).toBe("");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/extractCode.test.ts`
Expected: FAIL — module `../extractCode` không tồn tại.

- [ ] **Step 3: Cài đặt**

Create `extractCode.ts`:

```typescript
/**
 * Lấy mã từ giá trị dropdown dạng "Mã - Tên".
 * Nếu không chứa " - " (dấu gạch có khoảng trắng hai bên) → trả nguyên chuỗi đã trim.
 * Hỗ trợ cả file chọn dropdown ("111 - Tiền mặt") lẫn file gõ mã thuần ("111").
 */
export function extractCode(value: string | undefined | null): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (s === "") return "";
  const idx = s.indexOf(" - ");
  return idx === -1 ? s : s.slice(0, idx).trim();
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/extractCode.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/lib/extractCode.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/extractCode.test.ts
git commit -m "feat(fe): extractCode - tách mã từ chuỗi 'Mã - Tên'"
```

---

## Task 2: Áp `extractCode` trong validate

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/columns.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/validate.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`

- [ ] **Step 1: Viết test thất bại**

Thêm vào CUỐI `describe("validateAndBuild", ...)` trong `validate.test.ts` (giữ nguyên các test cũ), trước dấu đóng `});` của describe:

```typescript
  it("nhận giá trị dropdown dạng 'Mã - Tên' và map đúng về mã", () => {
    const res = validateAndBuild(
      [
        row({
          loaiGiaoDich: "PHIEU_THU - Phiếu thu",
          nghiepVu: "NV01 - Bán hàng (PHIEU_THU)",
          taiKhoanNo: "111 - Tiền mặt",
          taiKhoanCo: "511 - Doanh thu",
          doiTuong: "KH001 - KH A",
        }),
      ],
      masterData,
    );
    expect(res.hasErrors).toBe(false);
    expect(res.validItems).toHaveLength(1);
    const item = res.validItems[0];
    expect(item.loai).toBe("PHIEU_THU");
    expect(item.danhMuc?.taiKhoanNo?.ma).toBe("111");
    expect(item.danhMuc?.taiKhoanCo?.ma).toBe("511");
    expect(item.danhMuc?.nghiepVu?.ma).toBe("NV01");
    expect(item.danhMuc?.doiTuong?.ma).toBe("KH001");
  });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`
Expected: FAIL — case mới fail vì validate hiện so khớp nguyên chuỗi "PHIEU_THU - Phiếu thu" (không tách mã).

- [ ] **Step 3: Thêm `CODE_COLUMN_KEYS` vào columns.ts**

Thêm vào CUỐI `columns.ts`:

```typescript
/**
 * Các cột gắn danh mục — giá trị có thể ở dạng "Mã - Tên" (chọn từ dropdown).
 * Cần tách mã (extractCode) trước khi khớp với master data.
 */
export const CODE_COLUMN_KEYS: ImportColumnKey[] = [
  "loaiGiaoDich",
  "nghiepVu",
  "taiKhoanNo",
  "taiKhoanCo",
  "doiTuong",
  "doiTuong2",
  "duAn",
  "boPhan",
  "doi",
  "nhanVien",
  "sanPham",
  "dongTien",
  "khoanMuc",
  "hopDong",
  "nhomKhuyenMai",
  "nhomQuanLy",
];
```

- [ ] **Step 4: Áp `extractCode` trong validate.ts**

Trong `validate.ts`, sửa import từ `./columns` để thêm `CODE_COLUMN_KEYS`, và thêm import `extractCode`:

```typescript
import {
  RawImportRow,
  RowError,
  RowValidationResult,
  ValidateResult,
  IMPORT_COLUMNS,
  CODE_COLUMN_KEYS,
} from "./columns";
import { extractCode } from "./extractCode";
```

Sửa đầu hàm `validateRow`: đổi tên tham số `row` → `rawRow`, và thêm bước tách mã ở đầu hàm (tạo bản sao `row` để phần còn lại giữ nguyên):

```typescript
function validateRow(
  rawRow: RawImportRow,
  md: ImportMasterData,
): RowValidationResult {
  // Tách mã từ dạng "Mã - Tên" cho các cột danh mục (hỗ trợ cả dropdown lẫn gõ mã thuần)
  const row: RawImportRow = { ...rawRow };
  for (const key of CODE_COLUMN_KEYS) {
    if (row[key] != null) row[key] = extractCode(row[key]);
  }

  const errors: RowError[] = [];
  const warnings: RowError[] = [];
```

(Phần thân còn lại của `validateRow` GIỮ NGUYÊN — nó vẫn dùng `row[...]`, giờ là giá trị đã tách mã. `rawRow` không dùng tiếp.)

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`
Expected: PASS (tất cả test cũ + case mới = 12 tests)

- [ ] **Step 6: Type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -iE "import/lib/(validate|columns|extractCode)"`
Expected: rỗng (không lỗi ở các file này).

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/lib/columns.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/validate.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts
git commit -m "feat(fe): validate tách mã từ 'Mã - Tên' cho cột danh mục"
```

---

## Task 3: Tạo template bằng exceljs

**Files:**
- Modify: `fe/package.json` (cài `exceljs`)
- Rewrite: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts`
- Rewrite test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts`

- [ ] **Step 1: Cài exceljs**

Run: `cd fe && npm install exceljs`
Expected: thêm `exceljs` vào `dependencies`, cài thành công.

- [ ] **Step 2: Viết lại test (thất bại trước)**

GHI ĐÈ toàn bộ `__tests__/template.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildTemplateWorkbook } from "../template";
import { ImportMasterData } from "../validate";

const md: ImportMasterData = {
  taiKhoanList: [{ ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" }],
  loaiGiaoDichList: [{ id: "1", ma: "PHIEU_THU", ten: "Phiếu thu" }] as ImportMasterData["loaiGiaoDichList"],
  quyChuanList: [{ id: "q1", loaiGiaoDich: "PHIEU_THU", nghiepVu: "NV01", taiKhoanNo: "111", taiKhoanCo: "511", moTa: "Bán hàng" }] as ImportMasterData["quyChuanList"],
  doiTuongList: [{ id: "d1", ma: "KH001", ten: "KH A", loai: "KHACH_HANG" }] as ImportMasterData["doiTuongList"],
  duAnList: [],
  boPhanList: [],
  sanPhamList: [],
  dongTienList: [],
  khoanMucList: [],
  hopDongList: [],
  nhomKhuyenMaiList: [],
  nhomQuanLyList: [],
};

describe("buildTemplateWorkbook", () => {
  it("có sheet chính NhatKyChung + đủ 12 sheet danh mục", () => {
    const wb = buildTemplateWorkbook(md);
    const names = wb.worksheets.map((w) => w.name);
    expect(names[0]).toBe("NhatKyChung");
    [
      "DM_LoaiGiaoDich", "DM_NghiepVu", "DM_TaiKhoan", "DM_DoiTuong",
      "DM_DuAn", "DM_BoPhan", "DM_SanPham", "DM_DongTien",
      "DM_KhoanMuc", "DM_HopDong", "DM_NhomKhuyenMai", "DM_NhomQuanLy",
    ].forEach((n) => expect(names).toContain(n));
    expect(names.length).toBe(13);
  });

  it("hàng 1 sheet chính là header đúng cột đầu", () => {
    const wb = buildTemplateWorkbook(md);
    const main = wb.getWorksheet("NhatKyChung")!;
    expect(main.getCell(1, 1).value).toBe("Ngày chứng từ");
    expect(main.getCell(1, 2).value).toBe("Loại giao dịch");
  });

  it("sheet danh mục chứa chuỗi 'Mã - Tên'", () => {
    const wb = buildTemplateWorkbook(md);
    expect(wb.getWorksheet("DM_TaiKhoan")!.getCell("A1").value).toBe("111 - Tiền mặt");
    expect(wb.getWorksheet("DM_NghiepVu")!.getCell("A1").value).toBe("NV01 - Bán hàng (PHIEU_THU)");
  });

  it("cột danh mục ở sheet chính có data validation list; cột Ngày thì không", () => {
    const wb = buildTemplateWorkbook(md);
    const main = wb.getWorksheet("NhatKyChung")!;
    const lgdCell = main.getCell(2, 2); // cột 2 = Loại giao dịch
    expect(lgdCell.dataValidation?.type).toBe("list");
    expect(lgdCell.dataValidation?.formulae?.[0]).toContain("DM_LoaiGiaoDich");
    expect(main.getCell(2, 1).dataValidation).toBeUndefined(); // cột 1 = Ngày
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts`
Expected: FAIL — `buildTemplateWorkbook` chưa tồn tại (template.ts còn bản cũ `buildTemplateAoa`).

- [ ] **Step 4: Viết lại template.ts**

GHI ĐÈ toàn bộ `template.ts`:

```typescript
import ExcelJS from "exceljs";
import { IMPORT_COLUMNS, ImportColumnKey } from "./columns";
import { ImportMasterData } from "./validate";

/** Số dòng dữ liệu áp dropdown ở sheet chính (hàng 2 → MAX_DATA_ROWS+1). */
const MAX_DATA_ROWS = 500;

/** Định nghĩa 12 sheet danh mục (tên ASCII), cột A là chuỗi "Mã - Tên". */
interface RefSheet {
  name: string;
  items: (md: ImportMasterData) => string[];
}

const REF_SHEETS: RefSheet[] = [
  { name: "DM_LoaiGiaoDich", items: (md) => md.loaiGiaoDichList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_NghiepVu", items: (md) => md.quyChuanList.map((q) => `${q.nghiepVu} - ${q.moTa || q.nghiepVu} (${q.loaiGiaoDich})`) },
  { name: "DM_TaiKhoan", items: (md) => md.taiKhoanList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_DoiTuong", items: (md) => md.doiTuongList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_DuAn", items: (md) => md.duAnList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_BoPhan", items: (md) => md.boPhanList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_SanPham", items: (md) => md.sanPhamList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_DongTien", items: (md) => md.dongTienList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_KhoanMuc", items: (md) => md.khoanMucList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_HopDong", items: (md) => md.hopDongList.map((x) => `${x.soHopDong} - ${x.tenCongTrinh || ""}`) },
  { name: "DM_NhomKhuyenMai", items: (md) => md.nhomKhuyenMaiList.map((x) => `${x.ma} - ${x.ten}`) },
  { name: "DM_NhomQuanLy", items: (md) => md.nhomQuanLyList.map((x) => `${x.ma} - ${x.ten}`) },
];

/** Cột sheet chính → sheet danh mục để gắn dropdown. */
const COLUMN_TO_SHEET: Partial<Record<ImportColumnKey, string>> = {
  loaiGiaoDich: "DM_LoaiGiaoDich",
  nghiepVu: "DM_NghiepVu",
  taiKhoanNo: "DM_TaiKhoan",
  taiKhoanCo: "DM_TaiKhoan",
  doiTuong: "DM_DoiTuong",
  doiTuong2: "DM_DoiTuong",
  duAn: "DM_DuAn",
  boPhan: "DM_BoPhan",
  doi: "DM_BoPhan",
  nhanVien: "DM_DoiTuong",
  sanPham: "DM_SanPham",
  dongTien: "DM_DongTien",
  khoanMuc: "DM_KhoanMuc",
  hopDong: "DM_HopDong",
  nhomKhuyenMai: "DM_NhomKhuyenMai",
  nhomQuanLy: "DM_NhomQuanLy",
};

/** Giá trị ví dụ cho dòng mẫu (các cột không-danh-mục). */
const EXAMPLE_ROW: Partial<Record<ImportColumnKey, string>> = {
  ngay: "01/06/2026",
  soTien: "1000000",
  dienGiai: "Ví dụ: thu tiền bán hàng",
};

/** Dựng workbook template (đồng bộ, test được). */
export function buildTemplateWorkbook(md: ImportMasterData): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  // Sheet chính
  const main = wb.addWorksheet("NhatKyChung");
  main.addRow(IMPORT_COLUMNS.map((c) => c.header));
  main.addRow(IMPORT_COLUMNS.map((c) => EXAMPLE_ROW[c.key] ?? ""));

  // 12 sheet danh mục: cột A = "Mã - Tên", bắt đầu từ hàng 1 (không header)
  for (const ref of REF_SHEETS) {
    const ws = wb.addWorksheet(ref.name);
    for (const v of ref.items(md)) ws.addRow([v]);
  }

  // Gắn data validation (dropdown) cho các cột danh mục, hàng 2 → MAX_DATA_ROWS+1
  IMPORT_COLUMNS.forEach((col, idx) => {
    const sheetName = COLUMN_TO_SHEET[col.key];
    if (!sheetName) return;
    const refWs = wb.getWorksheet(sheetName);
    const endRow = Math.max(refWs ? refWs.rowCount : 0, 1);
    const formula = `'${sheetName}'!$A$1:$A$${endRow}`;
    const colNumber = idx + 1;
    for (let r = 2; r <= MAX_DATA_ROWS + 1; r++) {
      main.getCell(r, colNumber).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
      };
    }
  });

  return wb;
}

/** Tạo và tải file mẫu .xlsx. */
export async function downloadTemplate(
  md: ImportMasterData,
  fileName = "mau-import-nhat-ky-chung",
): Promise<void> {
  const wb = buildTemplateWorkbook(md);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

> NOTE: nếu `import ExcelJS from "exceljs"` báo lỗi type/default-export, đổi thành `import * as ExcelJS from "exceljs"` và dùng `new ExcelJS.Workbook()` như cũ. Kiểm tra `ImportColumnKey` đã được export từ `columns.ts` (đã có từ Task 4 feature trước).

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -iE "import/lib/template"`
Expected: rỗng.

- [ ] **Step 7: Commit**

```bash
git add fe/package.json fe/package-lock.json fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts
git commit -m "feat(fe): template import bằng exceljs - sheet danh mục + dropdown"
```

---

## Task 4: Wire UploadStep (truyền masterData, disable đến khi load xong)

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/components/UploadStep.tsx`

- [ ] **Step 1: Cập nhật UploadStep.tsx**

GHI ĐÈ toàn bộ `UploadStep.tsx`:

```tsx
import { Button, Upload, Space, Typography, message } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useImportHandler, useImportState } from "../ImportHandlerContext";
import { downloadTemplate } from "../lib/template";
import { ImportMasterData } from "../lib/validate";

const { Text } = Typography;

export function UploadStep() {
  const handler = useImportHandler();
  const [parsing] = useImportState("parsing", false);
  const [loadingMasterData] = useImportState("loadingMasterData", false);
  const [masterDataLoaded] = useImportState("masterDataLoaded", false);
  const [masterData] = useImportState("masterData", null);
  const [fileName] = useImportState("fileName", "");

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: (file) => {
      handler.executeEvent("parseFile", { file });
      return false; // chặn upload tự động
    },
  };

  const handleDownload = () => {
    if (!masterData) return;
    downloadTemplate(masterData as ImportMasterData).catch(() => {
      message.error("Không tạo được file mẫu");
    });
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Space>
        <Button
          icon={<DownloadOutlined />}
          loading={loadingMasterData}
          disabled={!masterDataLoaded || !masterData}
          onClick={handleDownload}
        >
          Tải file mẫu
        </Button>
        <Upload {...uploadProps}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={parsing || loadingMasterData}
            disabled={loadingMasterData}
          >
            Chọn file Excel
          </Button>
        </Upload>
        {fileName && <Text type="secondary">{fileName}</Text>}
      </Space>
      <Text type="secondary">
        Mỗi dòng = 1 chứng từ. Cột 1–6 bắt buộc. Chọn giá trị từ danh sách thả xuống trong từng cột danh mục (có thể gõ tay mã nếu muốn). File còn lỗi sẽ không import được.
      </Text>
    </Space>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -iE "UploadStep"`
Expected: rỗng.

- [ ] **Step 3: Build FE**

Run: `cd fe && npm run build 2>&1 | tail -5`
Expected: build thành công.

- [ ] **Step 4: Chạy toàn bộ test import lib**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import`
Expected: tất cả PASS (extractCode 6 + normalize 9 + parseRows 3 + buildDanhMucFromRow 4 + validate 12 + template 4).

- [ ] **Step 5: Verify thủ công (deferred cho human)**

Tải file mẫu từ modal Import → mở bằng Excel/LibreOffice: kiểm tra các cột danh mục có dropdown chọn "Mã - Tên", có các sheet `DM_*`. Nhập vài dòng bằng cách chọn dropdown → import → đúng dữ liệu.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/components/UploadStep.tsx
git commit -m "feat(fe): nút Tải file mẫu dùng masterData + dropdown, disable đến khi load xong"
```

---

## Self-Review

**1. Spec coverage:**
- exceljs cho template (Mục 4 spec) → Task 3 ✓
- Giá trị "Mã - Tên" (Mục 3,5) → Task 3 (ref sheets) ✓
- 16 cột dropdown / 12 sheet vật lý (Mục 5) → Task 3 `COLUMN_TO_SHEET` + `REF_SHEETS` ✓
- Nghiệp vụ kèm loại GD, không cascading (Mục 3,5) → Task 3 `DM_NghiepVu` items ✓
- extractCode + áp cho 16 cột, tương thích file cũ (Mục 6) → Task 1 + Task 2 ✓
- UX: nút disable đến khi load master data + đổi guide (Mục 7) → Task 4 ✓
- Testing (Mục 8) → mỗi task có test ✓

**2. Placeholder scan:** không có TBD/TODO; mọi step có code/lệnh cụ thể.

**3. Type consistency:** `extractCode`, `CODE_COLUMN_KEYS`, `buildTemplateWorkbook`, `downloadTemplate(md, fileName?)`, `ImportMasterData`, `ImportColumnKey` dùng nhất quán. `downloadTemplate` đổi signature (thêm `md`) → chỉ gọi ở `UploadStep` (Task 4 cập nhật). `template.test.ts` cũ (buildTemplateAoa) bị thay hoàn toàn ở Task 3.

**Điểm chú ý khi thực thi:**
- exceljs default vs namespace import (xem NOTE Task 3).
- `dataValidation` undefined khi chưa set (test dựa vào điều này) — đúng với exceljs.
- Field thật của master data: `LoaiGiaoDich{ma,ten}`, `QuyChuan{nghiepVu,loaiGiaoDich,moTa?}`, `HopDong{soHopDong,tenCongTrinh}`, còn lại `{ma,ten}`. Nếu lệch, chỉnh builder trong `REF_SHEETS` cho khớp type thật (không nới type).

## Ngoài phạm vi (YAGNI)
- Cascading dropdown; đổi phần đọc sang exceljs; tự sinh danh mục khi thiếu mã.
