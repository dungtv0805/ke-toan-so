# Phần 2b — Render nhãn động (FE) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FE đọc `glossary` của công ty (BE đã trả trong `/me` ở 2a) và render nhãn động qua hook `t(key, surface?)`, áp pilot term `chuDauTu` vào menu, bảng NKC và trang Chủ đầu tư.

**Architecture:** Một `termRegistry` (glossary mặc định hệ thống) + hàm thuần `resolveTerm(...)` (chuỗi fallback). `TermContext`/`useTerm` đọc `currentTenant.glossary` từ `useAuth()` và cung cấp `t()`. Các màn pilot thay chuỗi hardcode bằng `t("chuDauTu", surface?)`.

**Tech Stack:** React 18 + TS + Vite, Ant Design, vitest (node env).

## Global Constraints

- FE-only (BE 2a đã trả `glossary` trong mọi `TenantInfo`).
- Shape glossary FE khớp BE: `GlossaryItem = { label: string; surfaces?: Record<string,string> }`; `Glossary = Record<string, GlossaryItem>`.
- **Chuỗi fallback của `resolveTerm(glossary, registry, key, surface?)` (đúng thứ tự):**
  1. `glossary[key].surfaces[surface]` (nếu có surface)
  2. `glossary[key].label`
  3. `registry[key].surfaces[surface]` (nếu có surface)
  4. `registry[key].label`
  5. `key`
  (Tenant override luôn thắng default; trong cùng cấp, surface-specific thắng label.)
- Pilot term = **chuDauTu**; surfaces dùng: `nkc.colMa` ("Mã CĐT"), `nkc.colTen` ("CĐT").
- Phạm vi pilot: sidebar menu `/danh-muc/chu-dau-tu`; bảng NKC (cột Mã CĐT/CĐT); trang `danh-muc/chu-dau-tu` (breadcrumb, tiêu đề modal tạo/sửa, header cột bảng, label form). **Ngoài phạm vi 2b** (vẫn hardcode, mở rộng sau): HopDong, DuAn, DataTabs tab "CĐT", SummaryTabs, ChuDauTuTab, AllocationFields, DetailPopover, export-excel.
- `TermProvider` mount BÊN TRONG `AuthProvider` (vì đọc `useAuth()`).
- vitest env = node → KHÔNG viết test render React; chỉ unit-test hàm thuần `resolveTerm`. Context/áp dụng dùng build + lint làm gate.
- Test: `cd fe && npx vitest run <path>`; build: `cd fe && npm run build`; lint: `cd fe && npm run lint` (đã có sẵn 2 lỗi pre-existing ở TenantPage/ThanhVienPage — không tính).

---

## File Structure

- `fe/src/types/tenant.ts` (MODIFY) — thêm `GlossaryItem`/`Glossary` + `glossary?` vào `TenantInfo`.
- `fe/src/config/termRegistry.ts` (CREATE) — `TERM_REGISTRY: Glossary` + `resolveTerm(...)`.
- `fe/src/config/termRegistry.test.ts` (CREATE) — unit test `resolveTerm`.
- `fe/src/contexts/TermContext.tsx` (CREATE) — `TermProvider` + `useTerm()` (cung cấp `t`).
- `fe/src/App.tsx` (MODIFY) — bọc `<TermProvider>` trong `<AuthProvider>`.
- `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx` (MODIFY) — cột Mã CĐT/CĐT dùng `t`.
- `fe/src/components/layout/MainLayout.tsx` (MODIFY) — relabel menu `/danh-muc/chu-dau-tu` qua `t`.
- `fe/src/pages/danh-muc/chu-dau-tu/ChuDauTuPage.tsx` (MODIFY) — breadcrumb/modal/cột/label dùng `t`.

Thứ tự: types+resolver → context+mount → áp dụng (NKC, menu, trang CĐT). Build-green mỗi task.

---

### Task 1: Glossary types + termRegistry + resolveTerm (TDD)

**Files:**
- Modify: `fe/src/types/tenant.ts`
- Create: `fe/src/config/termRegistry.ts`
- Create: `fe/src/config/termRegistry.test.ts`

**Interfaces:**
- Produces: `GlossaryItem`, `Glossary` (trong `@/types/tenant`); `TERM_REGISTRY: Glossary`; `resolveTerm(glossary: Glossary | undefined, registry: Glossary, key: string, surface?: string): string`.

- [ ] **Step 1: Thêm types vào** `fe/src/types/tenant.ts` — thêm trước `interface TenantInfo` và field vào interface:

```ts
export interface GlossaryItem {
  label: string;
  surfaces?: Record<string, string>;
}
export type Glossary = Record<string, GlossaryItem>;
```
Và trong `interface TenantInfo`, sau `modules?: string[];`:
```ts
  // Từ điển nhãn của công ty (theo ngành); BE trả trong /me. Optional cho data cũ.
  glossary?: Glossary;
```

- [ ] **Step 2: Viết test thất bại** `fe/src/config/termRegistry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTerm, TERM_REGISTRY } from './termRegistry';
import type { Glossary } from '@/types/tenant';

describe('resolveTerm', () => {
  const reg = TERM_REGISTRY;

  it('không có glossary công ty → dùng registry (label + surface)', () => {
    expect(resolveTerm(undefined, reg, 'chuDauTu')).toBe('Chủ đầu tư');
    expect(resolveTerm(undefined, reg, 'chuDauTu', 'nkc.colTen')).toBe('CĐT');
    expect(resolveTerm(undefined, reg, 'chuDauTu', 'nkc.colMa')).toBe('Mã CĐT');
  });

  it('glossary công ty override label + surface', () => {
    const g: Glossary = {
      chuDauTu: { label: 'Nhà tài trợ', surfaces: { 'nkc.colTen': 'NTT' } },
    };
    expect(resolveTerm(g, reg, 'chuDauTu')).toBe('Nhà tài trợ');
    expect(resolveTerm(g, reg, 'chuDauTu', 'nkc.colTen')).toBe('NTT');
  });

  it('tenant label thắng registry surface khi tenant không có surface đó', () => {
    const g: Glossary = { chuDauTu: { label: 'Nhà tài trợ' } };
    // surface nkc.colTen: tenant không có surface → rơi xuống tenant.label (không lấy registry "CĐT")
    expect(resolveTerm(g, reg, 'chuDauTu', 'nkc.colTen')).toBe('Nhà tài trợ');
  });

  it('key không có ở đâu → trả chính key', () => {
    expect(resolveTerm(undefined, reg, 'khongCo')).toBe('khongCo');
    expect(resolveTerm(undefined, reg, 'khongCo', 'x')).toBe('khongCo');
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/config/termRegistry.test.ts`
Expected: FAIL — không tìm thấy module `./termRegistry`.

- [ ] **Step 4: Tạo** `fe/src/config/termRegistry.ts`:

```ts
import type { Glossary } from '@/types/tenant';

/** Glossary mặc định hệ thống (fallback cuối). Mở rộng thêm term tại đây. */
export const TERM_REGISTRY: Glossary = {
  chuDauTu: {
    label: 'Chủ đầu tư',
    surfaces: { 'nkc.colMa': 'Mã CĐT', 'nkc.colTen': 'CĐT' },
  },
};

/**
 * Giải nhãn theo chuỗi fallback:
 * tenant.surfaces[surface] → tenant.label → registry.surfaces[surface] → registry.label → key
 */
export function resolveTerm(
  glossary: Glossary | undefined,
  registry: Glossary,
  key: string,
  surface?: string,
): string {
  const tenant = glossary?.[key];
  if (surface && tenant?.surfaces?.[surface]) return tenant.surfaces[surface];
  if (tenant?.label) return tenant.label;
  const def = registry?.[key];
  if (surface && def?.surfaces?.[surface]) return def.surfaces[surface];
  if (def?.label) return def.label;
  return key;
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/config/termRegistry.test.ts`
Expected: PASS (4/4).

- [ ] **Step 6: Commit**

```bash
git add fe/src/types/tenant.ts fe/src/config/termRegistry.ts fe/src/config/termRegistry.test.ts
git commit -m "feat(term): glossary types + termRegistry + resolveTerm (fallback chain)"
```

---

### Task 2: TermContext + useTerm + mount trong App

**Files:**
- Create: `fe/src/contexts/TermContext.tsx`
- Modify: `fe/src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`currentTenant?.glossary`), `resolveTerm`, `TERM_REGISTRY` (Task 1).
- Produces: `TermProvider` (component); `useTerm(): { t: (key: string, surface?: string) => string }`.

- [ ] **Step 1: Tạo** `fe/src/contexts/TermContext.tsx`:

```tsx
import React, { createContext, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { resolveTerm, TERM_REGISTRY } from '@/config/termRegistry';

interface TermContextType {
  t: (key: string, surface?: string) => string;
}

const TermContext = createContext<TermContextType | undefined>(undefined);

export const TermProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant } = useAuth();
  const glossary = currentTenant?.glossary;

  const t = useCallback(
    (key: string, surface?: string) => resolveTerm(glossary, TERM_REGISTRY, key, surface),
    [glossary],
  );

  return <TermContext.Provider value={{ t }}>{children}</TermContext.Provider>;
};

export const useTerm = () => {
  const ctx = useContext(TermContext);
  if (ctx === undefined) {
    throw new Error('useTerm must be used within a TermProvider');
  }
  return ctx;
};
```

- [ ] **Step 2: Mount trong** `fe/src/App.tsx` — bọc nội dung `AuthProvider` bằng `TermProvider`. Thêm import:

```tsx
import { TermProvider } from "./contexts/TermContext";
```
Và sửa cây JSX (định vị `<AuthProvider>` ... `<Routes>`):
```tsx
          <AuthProvider>
            <TermProvider>
              <Routes>
                {/* ... toàn bộ Routes giữ nguyên ... */}
              </Routes>
            </TermProvider>
          </AuthProvider>
```
(Chỉ thêm 2 thẻ bọc `<TermProvider>...</TermProvider>` quanh `<Routes>`; không đổi nội dung Routes.)

- [ ] **Step 3: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS; không lỗi lint mới (2 lỗi pre-existing TenantPage/ThanhVienPage được phép).

- [ ] **Step 4: Commit**

```bash
git add fe/src/contexts/TermContext.tsx fe/src/App.tsx
git commit -m "feat(term): TermContext + useTerm, mount trong AuthProvider"
```

---

### Task 3: Áp `t` vào cột Mã CĐT / CĐT trong bảng NKC

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`

**Interfaces:**
- Consumes: `useTerm()` (Task 2).

- [ ] **Step 1: Thêm tham số `t` cho `getColumnDefinitions`** — đổi chữ ký (khoảng dòng 133):

```tsx
const getColumnDefinitions = (
  taiKhoanOptions: SelectOption[],
  t: (key: string, surface?: string) => string
): Omit<ColumnType<NhatKyChung>, "width">[] => [
```

- [ ] **Step 2: Thay 2 title cột** (khoảng dòng 344 và 364) — cột key `chuDauTuMa` và `chuDauTu`:

```tsx
    title: t("chuDauTu", "nkc.colMa"),   // thay "Mã CĐT"
```
```tsx
    title: t("chuDauTu", "nkc.colTen"),  // thay "CĐT"
```
(Chỉ đổi dòng `title:`, giữ nguyên `key`, `render`, ...)

- [ ] **Step 3: Inject `t` ở component + call-site** — trong component `EntryListTab` thêm import + hook, và truyền `t` vào `getColumnDefinitions`:

Thêm import (đầu file):
```tsx
import { useTerm } from "@/contexts/TermContext";
```
Trong thân component (gần các hook khác):
```tsx
  const { t } = useTerm();
```
Tại `const columns = useMemo(...)` (khoảng dòng 799) đổi call + thêm `t` vào deps:
```tsx
  const columns = useMemo(
    () =>
      getColumnDefinitions(taiKhoanOptions, t).map((col) => ({
        ...col,
        width: col.width || DEFAULT_WIDTHS[col.key as string] || 100,
      })),
    [taiKhoanOptions, t]
  );
```
(Giữ nguyên phần thân `.map(...)` hiện có; chỉ thêm `, t` vào lời gọi và `, t` vào mảng deps.)

- [ ] **Step 4: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS; không lỗi mới.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx
git commit -m "feat(term): cột Mã CĐT/CĐT trong bảng NKC dùng t()"
```

---

### Task 4: Relabel menu sidebar `/danh-muc/chu-dau-tu` qua `t`

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `useTerm()` (Task 2); `createLabel` (đã có, module-level), `MenuItem` type, `filterByModule`/`byRole` (đã có).

- [ ] **Step 1: Thêm map + hàm relabel (module-level)** — đặt sau `createLabel`/`getMenuItem` (gần dòng 206):

```tsx
// Map menuKey → termKey cho các menu đổi tên theo ngành.
const MENU_TERM_KEYS: Record<string, string> = {
  "/danh-muc/chu-dau-tu": "chuDauTu",
};

// Trả mảng MỚI, thay label các item có termKey bằng nhãn động (đệ quy children).
function relabelMenu(
  items: MenuItem[],
  t: (key: string, surface?: string) => string
): MenuItem[] {
  return items.map((item) => {
    const mi = item as { key?: string; children?: MenuItem[] };
    const key = mi.key as string;
    let next: MenuItem = item;
    if (mi.children && mi.children.length > 0) {
      next = { ...(next as any), children: relabelMenu(mi.children, t) };
    }
    const termKey = MENU_TERM_KEYS[key];
    if (termKey) {
      next = { ...(next as any), label: createLabel(t(termKey), key) };
    }
    return next;
  });
}
```

- [ ] **Step 2: Thêm hook `t` trong component** — thêm import + hook:

```tsx
import { useTerm } from "@/contexts/TermContext";
```
Trong thân `MainLayout` (gần `const { ... } = useAuth();`):
```tsx
  const { t } = useTerm();
```

- [ ] **Step 3: Áp relabel cho các menu đã render** — bọc kết quả filter bằng `relabelMenu(..., t)`. Sửa:

```tsx
  const filteredDieuHanhMenu = relabelMenu(
    byRole(filterByModule(dieuHanhMenuItems, allEffectiveKeys)),
    t
  );
  const filteredThuVienMenu = relabelMenu(
    byRole(filterByModule(thuVienMenuItems, allEffectiveKeys)),
    t
  );
```
Và trong `moduleSections` (chỗ tính `items`):
```tsx
      const items = relabelMenu(byRole(filterByModule(keToAnMenuItems, keys)), t);
```
(`/danh-muc/chu-dau-tu` thuộc THƯ VIỆN nên thực tế đổi ở `filteredThuVienMenu`; áp cả 3 cho nhất quán/mở rộng.)

- [ ] **Step 4: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS; không lỗi mới.

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/layout/MainLayout.tsx
git commit -m "feat(term): relabel menu Chủ đầu tư theo glossary công ty"
```

---

### Task 5: Áp `t` vào trang Chủ đầu tư

**Files:**
- Modify: `fe/src/pages/danh-muc/chu-dau-tu/ChuDauTuPage.tsx`

**Interfaces:**
- Consumes: `useTerm()` (Task 2).

- [ ] **Step 1: Thêm hook `t`** — thêm import + hook trong component:

```tsx
import { useTerm } from "@/contexts/TermContext";
```
Trong thân component (gần các hook khác):
```tsx
  const { t } = useTerm();
```

- [ ] **Step 2: Thay các chuỗi hardcode** (line số gần đúng — định vị theo nội dung):

- Breadcrumb (≈ dòng 178): `{ title: "Chủ đầu tư" }` → `{ title: t("chuDauTu") }`
- Header cột bảng (≈ dòng 116): `title: "Tên chủ đầu tư"` → `` title: `Tên ${t("chuDauTu")}` ``
- Tiêu đề modal (≈ dòng 245): `editing ? "Sửa chủ đầu tư" : "Thêm chủ đầu tư mới"` → `` editing ? `Sửa ${t("chuDauTu")}` : `Thêm ${t("chuDauTu")} mới` `` (giữ đúng biến điều kiện hiện có trong file — chỉ thay 2 chuỗi literal).
- Label form (≈ dòng 271): `label: "Tên chủ đầu tư"` → `` label: `Tên ${t("chuDauTu")}` ``

> Lưu ý: chỉ thay đúng các literal trên. Nếu cấu trúc điều kiện modal khác mô tả, giữ logic, chỉ thay 2 literal "Sửa chủ đầu tư"/"Thêm chủ đầu tư mới".

- [ ] **Step 3: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS; không lỗi mới.

- [ ] **Step 4: Kiểm thử tay (sau deploy/dev)** — công ty ngành `XAY_DUNG` thấy "Chủ đầu tư"/"CĐT" như cũ; nếu sửa glossary công ty (vd "Nhà tài trợ") thì menu + cột NKC + trang CĐT đổi đồng bộ. (Edit glossary là 2c; ở 2b kiểm bằng tenant có/không glossary.)

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/danh-muc/chu-dau-tu/ChuDauTuPage.tsx
git commit -m "feat(term): trang Chủ đầu tư dùng t() theo glossary"
```

---

## Self-Review (đã rà soát)

- **Spec coverage (Phần 2b):** term registry (Task 1); TermContext + `t()` (Task 2); áp pilot `chuDauTu` vào menu (Task 4), bảng NKC cột Mã CĐT/CĐT (Task 3), trang/form chủ đầu tư (Task 5). Map `menuKey→termKey` (Task 4). ✓
- **Fallback chain:** định nghĩa 1 nơi (`resolveTerm`, Task 1), test phủ 4 nhánh (registry-only, tenant override, tenant-label-thắng-registry-surface, key trả chính nó). ✓
- **Placeholder scan:** không có TBD; mọi step có code/lệnh cụ thể (line số ghi rõ là gần đúng, định vị theo nội dung).
- **Type consistency:** `Glossary`/`GlossaryItem` (Task 1) dùng nhất quán ở `TenantInfo`, `termRegistry`, `resolveTerm`, `TermContext`. `t: (key, surface?) => string` đồng nhất giữa `useTerm`, `getColumnDefinitions` param (Task 3), `relabelMenu` param (Task 4). Surface keys `nkc.colMa`/`nkc.colTen` khớp seed 2a.
- **Build-green:** Task 1→2 (types/resolver trước context); Task 3/4/5 độc lập sau khi `useTerm` sẵn (Task 2). Mỗi task build/lint xanh; vitest chỉ ở Task 1 (hàm thuần) đúng env node.
- **Ngoài phạm vi (ghi rõ):** các nơi CĐT khác (HopDong/DuAn/DataTabs/SummaryTabs/ChuDauTuTab/AllocationFields/DetailPopover/export) vẫn hardcode — mở rộng sau, không thuộc 2b.
- **Cosmetic đã biết:** nội suy `Tên ${t("chuDauTu")}` cho ra "Tên Chủ đầu tư" (C hoa giữa câu) — chấp nhận cho pilot; tinh chỉnh bằng surface riêng sau nếu cần.
- **Deploy (sau khi xong, ngoài plan):** build + deploy FE (không đụng BE).
