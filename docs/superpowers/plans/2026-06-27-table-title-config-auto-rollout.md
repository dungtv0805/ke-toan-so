# Nhân ⚙️ config title ra mọi bảng (cơ chế tự động per-table) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Một hook dùng chung cho phép gắn nút ⚙️ "đổi tiêu đề cột" vào BẤT KỲ bảng nào: tự liệt kê mọi cột có title chữ, đổi tên, lưu riêng theo bảng (per-page), theo phạm vi lĩnh vực (SuperAdmin) / công ty.

**Architecture:** Override lưu trong glossary đang có (không schema) dưới key tổng hợp `tbl:<pageKey>:<colKey>` (label-based, không surface). Hook `useTableTitleConfig(pageKey, columns)` trả về `columns` đã thay title = override ?? title gốc, và `settingsButton` (⚙️ + Drawer). Drawer tái dùng `TableTitleSettings` (tổng quát hoá nhận `defaults`). Lưu qua `buildTitleGlossary` + `nganhService.update`/`tenantService.updateGlossary`. Resolve/đọc-live giữ nguyên.

**Tech Stack:** React + TS, Ant Design, Vitest.

## Global Constraints
- Không đổi schema/field DB; `PUT /nganh/:id` giữ `SuperAdminGuard` → chỉ SuperAdmin lưu "Cả lĩnh vực".
- Override title bảng: term key = `tbl:<pageKey>:<colKey>`, **không surface**, ghi `label`. Không đụng các term NKC (chuDauTu...) đã có.
- Chỉ bọc cột có `title` là **chuỗi** + có `key`/`dataIndex`. Cột khác (title JSX, action) giữ nguyên.
- Test: `cd fe && npx vitest run <path>`. Nhãn tiếng Việt.

---

### Task 1: Helper `tableTitleConfig.ts` + tests

**Files:**
- Create: `fe/src/config/tableTitleConfig.ts`
- Create: `fe/src/config/tableTitleConfig.test.ts`

**Interfaces:**
- `tableTermKey(pageKey: string, colKey: string): string` → `` `tbl:${pageKey}:${colKey}` ``
- `interface ColTitle { colKey: string; def: string }`
- `extractColTitles(columns: readonly unknown[]): ColTitle[]` — các cột có title chuỗi + key/dataIndex.
- `lookupOverride(tenantG, nganhG, tk, surface?): string | undefined` — tenant thắng nganh.

- [ ] **Step 1: Test trước**
```ts
import { describe, it, expect } from 'vitest';
import { tableTermKey, extractColTitles, lookupOverride } from './tableTitleConfig';

describe('tableTitleConfig', () => {
  it('tableTermKey', () => {
    expect(tableTermKey('danhMuc.boPhan', 'ten')).toBe('tbl:danhMuc.boPhan:ten');
  });

  it('extractColTitles chỉ lấy cột title chuỗi + có key/dataIndex', () => {
    const cols = [
      { title: 'Tên bộ phận', dataIndex: 'ten' },
      { title: 'Mã', key: 'ma' },
      { title: <span>JSX</span>, key: 'x' }, // bỏ (title không chuỗi)
      { title: 'Thao tác' },                  // bỏ (không key/dataIndex)
      { title: '   ', key: 'blank' },         // bỏ (rỗng)
    ];
    expect(extractColTitles(cols as never)).toEqual([
      { colKey: 'ten', def: 'Tên bộ phận' },
      { colKey: 'ma', def: 'Mã' },
    ]);
  });

  it('lookupOverride: tenant thắng nganh, label cho không-surface', () => {
    const tenant = { 'tbl:p:ten': { label: 'KH' } };
    const nganh = { 'tbl:p:ten': { label: 'Khách' }, 'tbl:p:ma': { label: 'Mã KH' } };
    expect(lookupOverride(tenant, nganh, 'tbl:p:ten')).toBe('KH');
    expect(lookupOverride(undefined, nganh, 'tbl:p:ma')).toBe('Mã KH');
    expect(lookupOverride(undefined, undefined, 'tbl:p:none')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy → FAIL** — `cd fe && npx vitest run src/config/tableTitleConfig.test.ts`.

- [ ] **Step 3: Tạo `tableTitleConfig.ts`**
```ts
import type { Glossary } from '@/types/tenant';

export const tableTermKey = (pageKey: string, colKey: string): string =>
  `tbl:${pageKey}:${colKey}`;

export interface ColTitle {
  colKey: string;
  def: string;
}

interface ColLike {
  title?: unknown;
  key?: unknown;
  dataIndex?: unknown;
}

/** Các cột có title là chuỗi không rỗng + có key/dataIndex → đổi-tên-được. */
export function extractColTitles(columns: readonly unknown[]): ColTitle[] {
  const out: ColTitle[] = [];
  for (const c of columns as ColLike[]) {
    if (typeof c?.title !== 'string' || c.title.trim() === '') continue;
    const key = c.key ?? c.dataIndex;
    if (key == null) continue;
    out.push({ colKey: String(key), def: c.title });
  }
  return out;
}

/** Tra override hiện tại (tenant thắng nganh). */
export function lookupOverride(
  tenantG: Glossary | undefined,
  nganhG: Glossary | undefined,
  tk: string,
  surface?: string,
): string | undefined {
  for (const g of [tenantG, nganhG]) {
    const e = g?.[tk];
    if (!e) continue;
    if (surface && e.surfaces?.[surface]) return e.surfaces[surface];
    if (!surface && e.label) return e.label;
  }
  return undefined;
}
```

- [ ] **Step 4: Chạy → PASS** — `cd fe && npx vitest run src/config/tableTitleConfig.test.ts` (3 tests).

- [ ] **Step 5: Commit**
```bash
git add fe/src/config/tableTitleConfig.ts fe/src/config/tableTitleConfig.test.ts
git commit -m "feat(term): tableTitleConfig — key per-table + extractColTitles + lookupOverride"
```

---

### Task 2: Tổng quát hoá `TableTitleSettings` (nhận `defaults`, seed bằng lookupOverride)

**Files:**
- Modify: `fe/src/components/glossary/TableTitleSettings.tsx`

**Interfaces:**
- Props mới: `TableTitleSettings({ terms: TitleTermSpec[]; defaults?: Record<string,string>; buttonText?: string })`.
- Khi `defaults[key]` có → dùng làm "tên mặc định"; nếu không → `resolveTerm(undefined,undefined,TERM_REGISTRY,tk,surface)` (giữ NKC chạy như cũ).
- Seed ô nhập = `lookupOverride(...) ?? default` (thay vì `t()` — để hỗ trợ key không có trong registry).

- [ ] **Step 1: Sửa component**

Trong `TableTitleSettings.tsx`:
- Thêm `defaults?: Record<string, string>` vào `Props`.
- Import thêm: `import { lookupOverride } from '@/config/tableTitleConfig';` và lấy thêm `currentTenant`/`currentNganh` glossary (đã có currentTenant/currentNganh từ useAuth).
- Tính default mỗi term:
```ts
const defaultOf = (term: TitleTermSpec): string => {
  const k = titleKey(term);
  return props.defaults?.[k] ?? resolveTerm(undefined, undefined, TERM_REGISTRY, term.tk, term.surface);
};
```
- Bảng `defaults` (map) cho save:
```ts
const defaultsMap: Record<string, string> = {};
for (const term of terms) defaultsMap[titleKey(term)] = defaultOf(term);
```
  Dùng `defaultsMap` thay cho map cũ dựng từ resolveTerm, và truyền vào `buildTitleGlossary(base, terms, values, defaultsMap)`.
- Cột "Tên mặc định" hiển thị `defaultsMap[row.key]` (đã có sẵn `def` trong dataSource — đổi nguồn sang defaultsMap).
- `onOpen`: seed
```ts
for (const term of terms)
  init[titleKey(term)] =
    lookupOverride(currentTenant?.glossary, currentNganh?.glossary, term.tk, term.surface)
    ?? defaultOf(term);
```

Giữ nguyên: scope radio (canNganh), nhánh save nganh/tenant, applyGlossary/applyNganhGlossary, Drawer/Table layout.

- [ ] **Step 2: Biên dịch + test toàn bộ** — `cd fe && npx tsc --noEmit && npx vitest run` (NKC vẫn chạy; 0 lỗi).

- [ ] **Step 3: Commit**
```bash
git add fe/src/components/glossary/TableTitleSettings.tsx
git commit -m "feat(term): TableTitleSettings nhận defaults + seed bằng lookupOverride (hỗ trợ key per-table)"
```

---

### Task 3: Hook `useTableTitleConfig`

**Files:**
- Create: `fe/src/components/glossary/useTableTitleConfig.tsx`

**Interfaces:**
- `useTableTitleConfig<T>(pageKey: string, columns: ColumnType<T>[]): { columns: ColumnType<T>[]; settingsButton: ReactNode }`

- [ ] **Step 1: Tạo hook**
```tsx
import { useMemo } from 'react';
import type { ColumnType } from 'antd/es/table';
import { useAuth } from '@/contexts/AuthContext';
import { TableTitleSettings } from '@/components/glossary/TableTitleSettings';
import { tableTermKey, extractColTitles, lookupOverride } from '@/config/tableTitleConfig';
import type { TitleTermSpec } from '@/config/titleConfig';

/**
 * Bọc cột bảng để đổi tiêu đề theo lĩnh vực/công ty (lưu per-page).
 * Trả về columns (đã thay title = override ?? title gốc) và nút ⚙️ mở Drawer.
 */
export function useTableTitleConfig<T>(pageKey: string, columns: ColumnType<T>[]) {
  const { currentTenant, currentNganh } = useAuth();
  const tenantG = currentTenant?.glossary;
  const nganhG = currentNganh?.glossary;

  const colTitles = useMemo(() => extractColTitles(columns), [columns]);

  const terms: TitleTermSpec[] = useMemo(
    () => colTitles.map((c) => ({ tk: tableTermKey(pageKey, c.colKey) })),
    [colTitles, pageKey],
  );
  const defaults: Record<string, string> = useMemo(() => {
    const d: Record<string, string> = {};
    for (const c of colTitles) d[`${tableTermKey(pageKey, c.colKey)}|`] = c.def;
    return d;
  }, [colTitles, pageKey]);

  const mappedColumns = useMemo(() => {
    return columns.map((col) => {
      if (typeof col.title !== 'string' || col.title.trim() === '') return col;
      const key = (col as { key?: unknown; dataIndex?: unknown }).key ??
        (col as { dataIndex?: unknown }).dataIndex;
      if (key == null) return col;
      const ov = lookupOverride(tenantG, nganhG, tableTermKey(pageKey, String(key)));
      return ov ? { ...col, title: ov } : col;
    });
  }, [columns, tenantG, nganhG, pageKey]);

  const settingsButton =
    terms.length > 0 ? <TableTitleSettings terms={terms} defaults={defaults} /> : null;

  return { columns: mappedColumns, settingsButton };
}
```

- [ ] **Step 2: Biên dịch** — `cd fe && npx tsc --noEmit` (0 lỗi).

- [ ] **Step 3: Commit**
```bash
git add fe/src/components/glossary/useTableTitleConfig.tsx
git commit -m "feat(term): useTableTitleConfig — hook bọc cột + nút ⚙️ cho mọi bảng"
```

---

### Task 4: Áp thử 3 trang đại diện

**Files:**
- Modify: `fe/src/pages/danh-muc/bo-phan/BoPhanPage.tsx` (FilterBar `actions`)
- Modify: `fe/src/pages/chung-tu/phieu-kho/PhieuKhoListPage.tsx` (toolbar tùy biến) — đường dẫn chính xác xác minh khi làm
- Modify: `fe/src/pages/cong-no/CongNoPhaiThuPage.tsx` (FilterBar, bảng chính)

**Interfaces:** Consumes `useTableTitleConfig`.

- [ ] **Step 1: Mẫu áp dụng (mỗi trang)**

Trong mỗi page, ở nơi có `columns` (mảng) và `<Table columns={columns} .../>`:
```tsx
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
// ...trong component, sau khi `columns` được định nghĩa:
const { columns: cfgColumns, settingsButton } = useTableTitleConfig('<pageKey>', columns);
// <Table columns={cfgColumns} .../>
// đặt {settingsButton} vào FilterBar `actions` (cạnh nút Thêm/Export) HOẶC vào toolbar tùy biến.
```
`pageKey` đặt ổn định, duy nhất theo trang: BoPhan → `'danhMuc.boPhan'`; PhieuKho → `'kho.phieu'`; CongNoPhaiThu → `'congNo.phaiThu'`.

Lưu ý: nếu `columns` được `useMemo`/tạo lại mỗi render, vẫn OK (hook tự memo theo `columns`). Nếu page có nhiều bảng, chỉ áp cho bảng chính (1 pageKey/bảng — bảng phụ đặt pageKey khác nếu muốn, hoặc bỏ qua đợt này).

- [ ] **Step 2: Áp cho BoPhanPage** — đọc file, chèn theo mẫu, `pageKey='danhMuc.boPhan'`, đặt `settingsButton` vào `actions` của FilterBar (cạnh các nút hành động).

- [ ] **Step 3: Áp cho PhieuKhoListPage** — xác minh đường dẫn file (`grep -rl "PhieuKhoListPage" fe/src`), chèn theo mẫu, `pageKey='kho.phieu'`, đặt `settingsButton` vào toolbar tùy biến (cạnh nút trong toolbar div).

- [ ] **Step 4: Áp cho CongNoPhaiThuPage** — chèn cho **bảng chính** (`columns`, không phải summaryColumns), `pageKey='congNo.phaiThu'`, `settingsButton` vào FilterBar `actions`.

- [ ] **Step 5: Biên dịch + test** — `cd fe && npx tsc --noEmit && npx vitest run` (0 lỗi; test PASS).

- [ ] **Step 6: Kiểm thử tay** — `npm run dev`, đăng nhập SuperAdmin:
  1. Mỗi trang trên có nút ⚙️ trong thanh công cụ.
  2. ⚙️ → Drawer liệt kê các cột (Tên mặc định | ô nhập).
  3. Đổi 1 tên → chọn phạm vi → Lưu → header cột đổi ngay.
  4. Non-SuperAdmin: không có radio "Cả lĩnh vực".

- [ ] **Step 7: Commit**
```bash
git add fe/src/pages/danh-muc/bo-phan/BoPhanPage.tsx \
        fe/src/pages/chung-tu/phieu-kho/PhieuKhoListPage.tsx \
        fe/src/pages/cong-no/CongNoPhaiThuPage.tsx
git commit -m "feat(term): áp ⚙️ config title cho Bộ phận / Phiếu kho / Công nợ phải thu (proof)"
```

---

## Self-Review
- Hook tự bọc cột + nút ⚙️ cho mọi bảng → Task 3. ✓
- Lưu per-page (key `tbl:<pageKey>:<colKey>`), không đụng term NKC → Task 1 + Constraint. ✓
- Drawer dùng lại (tổng quát hoá defaults) → Task 2. ✓
- 3 trang đại diện (FilterBar + toolbar tùy biến + công nợ) → Task 4. ✓
- Không đổi schema/guard; lưu lĩnh vực/công ty + live → giữ TableTitleSettings/AuthContext. ✓
- Type consistency: `tableTermKey`/`extractColTitles`/`lookupOverride` (T1) dùng ở T2/T3; `TableTitleSettings` props mới (T2) dùng ở T3; hook (T3) dùng ở T4.
- Placeholder: Task 4 cố ý theo "mẫu áp dụng" vì cấu trúc mỗi page khác — implementer đọc file & đặt đúng chỗ; pageKey cho sẵn.

## Phần đuôi (ngoài plan này — wave sau)
Các trang danh sách còn lại (danh-mục khác, sổ quỹ, kho chi tiết, trung-tâm-dữ-liệu, phiếu thu/chi...) áp **cùng mẫu Task 4** (2 dòng + pageKey). Bỏ qua: bảng preview/import, dashboard tổng hợp, báo cáo header lồng nhiều tầng (cần xử lý riêng).
