# Nhãn theo Lĩnh vực — nhiều trường, mọi trang, đọc live — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép sửa title (nhãn) ở mọi trang, lưu vào config Lĩnh vực (`nganh.glossary`) và đọc **live** để mọi công ty cùng lĩnh vực ăn theo ngay; mở rộng vượt khỏi term `chuDauTu`.

**Architecture:** Thêm tầng `nganh.glossary` (đọc live qua `GET /nganh` đã có) vào chuỗi resolve nhãn FE: `tenant → nganh(live) → TERM_REGISTRY`. `EditableTerm` thêm phạm vi lưu "Cả lĩnh vực" (chỉ SuperAdmin → `PUT /nganh/:id`). Mở rộng `TERM_REGISTRY` + helper `termCol` để nhân ra nhiều cột/trang. Task 1–5 thuần FE; Task 6 (tùy chọn) bỏ clone ở BE để live inherit áp cho cả term cũ.

**Tech Stack:** React + TS + Vite, Ant Design, Vitest (test colocated `*.test.ts(x)`), context CHanlder. BE NestJS (chỉ Task 6).

## Global Constraints

- **Không đổi schema/field DB.** Tái dùng `Nganh.glossary`, `Tenant.glossary`, `Tenant.nganh`.
- **Không nới guard BE.** `PUT /master-data/nganh/:id` giữ `SuperAdminGuard` → chỉ SuperAdmin thấy lựa chọn "Cả lĩnh vực".
- Test bằng `vitest run` trong `fe/` (lệnh: `cd fe && npx vitest run <path>`).
- Chuỗi resolve nhãn (thứ tự ưu tiên): `tenant.surfaces[surface]` → `tenant.label` → `nganh.surfaces[surface]` → `nganh.label` → `registry.surfaces[surface]` → `registry.label` → `key`.
- Giữ phong cách tiếng Việt cho nhãn UI và message.

---

### Task 1: `resolveTerm` — thêm tầng glossary Lĩnh vực (live)

**Files:**
- Modify: `fe/src/config/termRegistry.ts`
- Test: `fe/src/config/termRegistry.test.ts`

**Interfaces:**
- Consumes: type `Glossary` từ `@/types/tenant`.
- Produces: `resolveTerm(tenantGlossary: Glossary | undefined, nganhGlossary: Glossary | undefined, registry: Glossary, key: string, surface?: string): string`. (Thêm tham số `nganhGlossary` ở vị trí thứ 2.)

- [ ] **Step 1: Sửa test hiện có + thêm test tầng nganh (viết test trước)**

Thay toàn bộ `fe/src/config/termRegistry.test.ts` bằng:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTerm, TERM_REGISTRY } from './termRegistry';
import type { Glossary } from '@/types/tenant';

describe('resolveTerm', () => {
  const reg = TERM_REGISTRY;

  it('không có glossary nào → dùng registry (label + surface)', () => {
    expect(resolveTerm(undefined, undefined, reg, 'chuDauTu')).toBe('Chủ đầu tư');
    expect(resolveTerm(undefined, undefined, reg, 'chuDauTu', 'nkc.colTen')).toBe('CĐT');
    expect(resolveTerm(undefined, undefined, reg, 'chuDauTu', 'nkc.colMa')).toBe('Mã CĐT');
  });

  it('glossary công ty override label + surface (thắng tất cả)', () => {
    const g: Glossary = { chuDauTu: { label: 'Nhà tài trợ', surfaces: { 'nkc.colTen': 'NTT' } } };
    expect(resolveTerm(g, undefined, reg, 'chuDauTu')).toBe('Nhà tài trợ');
    expect(resolveTerm(g, undefined, reg, 'chuDauTu', 'nkc.colTen')).toBe('NTT');
  });

  it('nganh thắng registry khi tenant không có key', () => {
    const nganh: Glossary = { chuDauTu: { label: 'Khách hàng', surfaces: { 'nkc.colTen': 'KH' } } };
    expect(resolveTerm(undefined, nganh, reg, 'chuDauTu')).toBe('Khách hàng');
    expect(resolveTerm(undefined, nganh, reg, 'chuDauTu', 'nkc.colTen')).toBe('KH');
  });

  it('tenant thắng nganh khi tenant có key', () => {
    const tenant: Glossary = { chuDauTu: { label: 'Chủ nhà' } };
    const nganh: Glossary = { chuDauTu: { label: 'Khách hàng' } };
    expect(resolveTerm(tenant, nganh, reg, 'chuDauTu')).toBe('Chủ nhà');
  });

  it('tenant.label thắng nganh.surface khi tenant không có surface đó', () => {
    const tenant: Glossary = { chuDauTu: { label: 'Chủ nhà' } };
    const nganh: Glossary = { chuDauTu: { label: 'Khách hàng', surfaces: { 'nkc.colTen': 'KH' } } };
    expect(resolveTerm(tenant, nganh, reg, 'chuDauTu', 'nkc.colTen')).toBe('Chủ nhà');
  });

  it('key không có ở đâu → trả chính key', () => {
    expect(resolveTerm(undefined, undefined, reg, 'khongCo')).toBe('khongCo');
    expect(resolveTerm(undefined, undefined, reg, 'khongCo', 'x')).toBe('khongCo');
  });
});
```

- [ ] **Step 2: Chạy test → FAIL (sai số tham số)**

Run: `cd fe && npx vitest run src/config/termRegistry.test.ts`
Expected: FAIL (resolveTerm nhận sai số tham số / kết quả sai).

- [ ] **Step 3: Cập nhật `resolveTerm`**

Thay hàm `resolveTerm` trong `fe/src/config/termRegistry.ts` (giữ nguyên `TERM_REGISTRY`) bằng:

```ts
/**
 * Giải nhãn theo chuỗi fallback:
 * tenant.surfaces[surface] → tenant.label
 * → nganh.surfaces[surface] → nganh.label
 * → registry.surfaces[surface] → registry.label → key
 */
export function resolveTerm(
  tenantGlossary: Glossary | undefined,
  nganhGlossary: Glossary | undefined,
  registry: Glossary,
  key: string,
  surface?: string,
): string {
  for (const g of [tenantGlossary, nganhGlossary, registry]) {
    const entry = g?.[key];
    if (!entry) continue;
    if (surface && entry.surfaces?.[surface]) return entry.surfaces[surface];
    if (entry.label) return entry.label;
  }
  return key;
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd fe && npx vitest run src/config/termRegistry.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add fe/src/config/termRegistry.ts fe/src/config/termRegistry.test.ts
git commit -m "feat(term): resolveTerm thêm tầng glossary lĩnh vực (live) giữa tenant và registry"
```

---

### Task 2: Nạp glossary Lĩnh vực live ở `AuthContext` + truyền vào `TermContext`

**Files:**
- Modify: `fe/src/contexts/AuthContext.tsx`
- Modify: `fe/src/contexts/TermContext.tsx`
- Dùng sẵn: `fe/src/services/nganhService.ts` (`nganhService.getAll()`, type `Nganh`)

**Interfaces:**
- Consumes: `resolveTerm` (5 tham số, Task 1); `nganhService.getAll(): Promise<Nganh[]>`; `Nganh { id, code, name, glossary }`.
- Produces (trên `useAuth()`):
  - `currentNganh: Nganh | null`
  - `refreshNganh: () => Promise<void>`
  - `applyNganhGlossary: (glossary: Glossary) => void`

- [ ] **Step 1: AuthContext — import + state nganh**

Trong `fe/src/contexts/AuthContext.tsx`, thêm import (cạnh import `linhVucService`):

```ts
import { nganhService, type Nganh } from '@/services/nganhService';
```

Thêm state (cạnh `const [allModules, setAllModules] = ...`):

```ts
const [nganhList, setNganhList] = useState<Nganh[]>([]);
```

- [ ] **Step 2: AuthContext — refreshNganh + derive currentNganh**

Thêm ngay dưới `refreshModules`:

```ts
const refreshNganh = useCallback(async () => {
  try {
    const list = await nganhService.getAll();
    setNganhList(list);
    localStorage.setItem('nganhCache', JSON.stringify(list));
  } catch {
    const cached = localStorage.getItem('nganhCache');
    if (cached) {
      try {
        setNganhList(JSON.parse(cached));
      } catch {
        /* ignore */
      }
    }
  }
}, []);
```

Thêm derive (cạnh `availableModules`):

```ts
const currentNganh = currentTenant?.nganh
  ? nganhList.find((n) => n.code === currentTenant.nganh) ?? null
  : null;
```

- [ ] **Step 3: AuthContext — gọi refreshNganh cùng chỗ refreshModules + applyNganhGlossary**

Tìm nơi gọi `refreshModules()` (sau khi xác thực thành công / load app) và gọi kèm `refreshNganh()`. Nếu `refreshModules` được gọi trong một `useEffect` mount, thêm `refreshNganh();` ngay cạnh nó.

Thêm callback (cạnh `applyGlossary`):

```ts
const applyNganhGlossary = useCallback((glossary: import('@/types/tenant').Glossary) => {
  setNganhList((prev) =>
    prev.map((n) =>
      currentTenant?.nganh && n.code === currentTenant.nganh ? { ...n, glossary } : n,
    ),
  );
}, [currentTenant?.nganh]);
```

- [ ] **Step 4: AuthContext — khai báo type + đưa vào value**

Trong `interface AuthContextType` thêm:

```ts
  currentNganh: import('@/services/nganhService').Nganh | null;
  refreshNganh: () => Promise<void>;
  applyNganhGlossary: (glossary: import('@/types/tenant').Glossary) => void;
```

Trong object `value={{ ... }}` thêm: `currentNganh, refreshNganh, applyNganhGlossary,`.

- [ ] **Step 5: TermContext — truyền nganh glossary**

Thay nội dung `fe/src/contexts/TermContext.tsx` phần provider:

```tsx
export const TermProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant, currentNganh } = useAuth();
  const tenantGlossary = currentTenant?.glossary;
  const nganhGlossary = currentNganh?.glossary;

  const t = useCallback(
    (key: string, surface?: string) =>
      resolveTerm(tenantGlossary, nganhGlossary, TERM_REGISTRY, key, surface),
    [tenantGlossary, nganhGlossary],
  );

  return <TermContext.Provider value={{ t }}>{children}</TermContext.Provider>;
};
```

- [ ] **Step 6: Kiểm tra biên dịch + test toàn FE**

Run: `cd fe && npx tsc --noEmit && npx vitest run src/config src/contexts`
Expected: không lỗi TS; test PASS.

- [ ] **Step 7: Commit**

```bash
git add fe/src/contexts/AuthContext.tsx fe/src/contexts/TermContext.tsx
git commit -m "feat(term): AuthContext nạp glossary lĩnh vực live, TermContext resolve theo tenant+nganh"
```

---

### Task 3: `EditableTerm` — phạm vi lưu "Cả lĩnh vực" (SuperAdmin)

**Files:**
- Modify: `fe/src/config/glossaryEdit.ts`
- Create: `fe/src/config/saveTarget.ts`
- Create: `fe/src/config/saveTarget.test.ts`
- Modify: `fe/src/components/glossary/EditableTerm.tsx`

**Interfaces:**
- Consumes: `applyGlossaryEdit(glossary, baseLabelFallback, key, value, scope, surface)` (đã có); `nganhService.update(id, { glossary })`; `tenantService.updateGlossary(glossary)`; `useAuth(): { user, currentTenant, currentNganh, applyGlossary, applyNganhGlossary }`.
- Produces: `buildSaveOptions(args): SaveOption[]`, `SaveOption { value, label, target: 'nganh' | 'tenant', scope: EditScope }`.

- [ ] **Step 1: Viết test cho `buildSaveOptions` (test trước)**

Tạo `fe/src/config/saveTarget.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSaveOptions } from './saveTarget';

describe('buildSaveOptions', () => {
  it('SuperAdmin + có lĩnh vực + có surface → 3 lựa chọn, mặc định lĩnh vực', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: true, hasSurface: true, nganhName: 'Xây dựng' });
    expect(opts.map((o) => o.value)).toEqual(['nganh-all', 'tenant-all', 'tenant-surface']);
    expect(opts[0].label).toBe('Cả lĩnh vực (Xây dựng)');
    expect(opts[0].target).toBe('nganh');
    expect(opts[0].scope).toBe('all');
  });

  it('không phải SuperAdmin → không có lựa chọn lĩnh vực', () => {
    const opts = buildSaveOptions({ isSuperAdmin: false, hasNganh: true, hasSurface: true, nganhName: 'Xây dựng' });
    expect(opts.map((o) => o.value)).toEqual(['tenant-all', 'tenant-surface']);
  });

  it('không có surface → bỏ lựa chọn "chỉ chỗ này"', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: true, hasSurface: false, nganhName: 'Xây dựng' });
    expect(opts.map((o) => o.value)).toEqual(['nganh-all', 'tenant-all']);
  });

  it('SuperAdmin nhưng tenant không thuộc lĩnh vực nào → không có lựa chọn lĩnh vực', () => {
    const opts = buildSaveOptions({ isSuperAdmin: true, hasNganh: false, hasSurface: false });
    expect(opts.map((o) => o.value)).toEqual(['tenant-all']);
  });
});
```

- [ ] **Step 2: Chạy test → FAIL (chưa có module)**

Run: `cd fe && npx vitest run src/config/saveTarget.test.ts`
Expected: FAIL ("Cannot find module './saveTarget'").

- [ ] **Step 3: Tạo `saveTarget.ts`**

```ts
import type { EditScope } from './glossaryEdit';

export type SaveTarget = 'nganh' | 'tenant';

export interface SaveOption {
  value: 'nganh-all' | 'tenant-all' | 'tenant-surface';
  label: string;
  target: SaveTarget;
  scope: EditScope;
}

export function buildSaveOptions(args: {
  isSuperAdmin: boolean;
  hasNganh: boolean;
  hasSurface: boolean;
  nganhName?: string;
}): SaveOption[] {
  const out: SaveOption[] = [];
  if (args.isSuperAdmin && args.hasNganh) {
    const ten = args.nganhName ? ` (${args.nganhName})` : '';
    out.push({ value: 'nganh-all', label: `Cả lĩnh vực${ten}`, target: 'nganh', scope: 'all' });
  }
  out.push({ value: 'tenant-all', label: 'Chỉ công ty này', target: 'tenant', scope: 'all' });
  if (args.hasSurface) {
    out.push({ value: 'tenant-surface', label: 'Chỉ ở chỗ này', target: 'tenant', scope: 'surface' });
  }
  return out;
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `cd fe && npx vitest run src/config/saveTarget.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Viết lại `EditableTerm.tsx`**

Thay toàn bộ `fe/src/components/glossary/EditableTerm.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Popover, Input, Radio, Button, Space, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTerm } from '@/contexts/TermContext';
import { useEditMode } from '@/contexts/EditModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { applyGlossaryEdit } from '@/config/glossaryEdit';
import { buildSaveOptions } from '@/config/saveTarget';
import { tenantService } from '@/services/tenantService';
import { nganhService } from '@/services/nganhService';

interface Props {
  tk: string;
  surface?: string;
}

export function EditableTerm({ tk, surface }: Props) {
  const { t } = useTerm();
  const { editMode } = useEditMode();
  const { user, currentTenant, currentNganh, applyGlossary, applyNganhGlossary } = useAuth();
  const label = t(tk, surface);

  const options = buildSaveOptions({
    isSuperAdmin: !!user?.isSuperAdmin,
    hasNganh: !!currentNganh,
    hasSurface: !!surface,
    nganhName: currentNganh?.name,
  });

  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(label);
  const [optValue, setOptValue] = useState(options[0]?.value ?? 'tenant-all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editMode) setOpen(false);
  }, [editMode]);

  if (!editMode) return <>{label}</>;

  const onOpenChange = (o: boolean) => {
    if (o) {
      setVal(label);
      setOptValue(options[0]?.value ?? 'tenant-all');
    }
    setOpen(o);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!val.trim()) {
      message.warning('Nhãn không được để trống');
      return;
    }
    const opt = options.find((o) => o.value === optValue) ?? options[0];
    if (!opt) return;
    setSaving(true);
    try {
      const base = t(tk); // nhãn nền (không surface)
      if (opt.target === 'nganh' && currentNganh) {
        const next = applyGlossaryEdit(currentNganh.glossary, base, tk, val.trim(), opt.scope, surface);
        const res = await nganhService.update(currentNganh.id, { glossary: next });
        applyNganhGlossary(res.glossary);
      } else {
        const next = applyGlossaryEdit(currentTenant?.glossary, base, tk, val.trim(), opt.scope, surface);
        const res = await tenantService.updateGlossary(next);
        applyGlossary(res.glossary);
      }
      message.success('Đã lưu nhãn');
      setOpen(false);
    } catch {
      message.error('Lưu nhãn thất bại');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <Space direction="vertical" onClick={(e) => e.stopPropagation()}>
      <Input
        size="small"
        style={{ width: 240 }}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onPressEnter={handleSave}
      />
      {options.length > 1 && (
        <Radio.Group
          size="small"
          value={optValue}
          onChange={(e) => setOptValue(e.target.value)}
        >
          <Space direction="vertical" size={0}>
            {options.map((o) => (
              <Radio key={o.value} value={o.value}>{o.label}</Radio>
            ))}
          </Space>
        </Radio.Group>
      )}
      <Button type="primary" size="small" loading={saving} onClick={handleSave}>
        Lưu
      </Button>
    </Space>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange} trigger="click" title="Sửa nhãn" content={content}>
      <span
        style={{ cursor: 'pointer', borderBottom: '1px dashed #999' }}
        onClick={(e) => e.stopPropagation()}
      >
        {label} <EditOutlined style={{ fontSize: 10 }} />
      </span>
    </Popover>
  );
}
```

- [ ] **Step 6: Kiểm tra biên dịch + test**

Run: `cd fe && npx tsc --noEmit && npx vitest run src/config`
Expected: không lỗi TS; test PASS.

- [ ] **Step 7: Commit**

```bash
git add fe/src/config/saveTarget.ts fe/src/config/saveTarget.test.ts fe/src/components/glossary/EditableTerm.tsx
git commit -m "feat(term): EditableTerm thêm phạm vi lưu Cả lĩnh vực (SuperAdmin → PUT /nganh)"
```

---

### Task 4: Mở rộng `TERM_REGISTRY` + helper `termCol`

**Files:**
- Modify: `fe/src/config/termRegistry.ts`
- Create: `fe/src/config/termCol.tsx`
- Test: `fe/src/config/termRegistry.test.ts`

**Interfaces:**
- Produces: `termCol<T>(args: { tk: string; surface?: string } & ColumnType<T>): ColumnType<T>` — trả column antd với `title = <EditableTerm tk surface/>`.

- [ ] **Step 1: Thêm term mới vào `TERM_REGISTRY` (cập nhật test trước)**

Thêm vào cuối `describe` trong `fe/src/config/termRegistry.test.ts`:

```ts
  it('registry có các term cần dùng cho rollout NKC', () => {
    expect(TERM_REGISTRY.chuDauTu).toBeTruthy();
    expect(TERM_REGISTRY.duAn?.label).toBe('Dự án');
    expect(TERM_REGISTRY.doiTuong?.label).toBe('Đối tượng');
  });
```

- [ ] **Step 2: Chạy → FAIL**

Run: `cd fe && npx vitest run src/config/termRegistry.test.ts`
Expected: FAIL (duAn/doiTuong chưa có).

- [ ] **Step 3: Mở rộng `TERM_REGISTRY`**

Trong `fe/src/config/termRegistry.ts`, thay object `TERM_REGISTRY`:

```ts
export const TERM_REGISTRY: Glossary = {
  chuDauTu: {
    label: 'Chủ đầu tư',
    surfaces: { 'nkc.colMa': 'Mã CĐT', 'nkc.colTen': 'CĐT' },
  },
  duAn: {
    label: 'Dự án',
    surfaces: { 'nkc.colMa': 'Mã dự án', 'nkc.colTen': 'Dự án' },
  },
  doiTuong: {
    label: 'Đối tượng',
    surfaces: { 'nkc.colMa': 'Mã đối tượng', 'nkc.colTen': 'Đối tượng' },
  },
};
```

> Lưu ý: chỉ thêm term thực sự có cột "đổi-tên-được" trong rollout. `duAn`/`doiTuong` là ví dụ; khi rollout trang cụ thể, thêm term tương ứng theo cùng mẫu (không đổi kiến trúc).

- [ ] **Step 4: Chạy → PASS**

Run: `cd fe && npx vitest run src/config/termRegistry.test.ts`
Expected: PASS.

- [ ] **Step 5: Tạo helper `termCol.tsx`**

```tsx
import type { ColumnType } from 'antd/es/table';
import { EditableTerm } from '@/components/glossary/EditableTerm';

/**
 * Tạo cột antd với tiêu đề là nhãn đổi-tên-được (EditableTerm).
 * Dùng để nhân nhanh cột có title cấu hình theo lĩnh vực.
 */
export function termCol<T>(
  args: { tk: string; surface?: string } & ColumnType<T>,
): ColumnType<T> {
  const { tk, surface, ...col } = args;
  return { ...col, title: <EditableTerm tk={tk} surface={surface} /> };
}
```

- [ ] **Step 6: Biên dịch**

Run: `cd fe && npx tsc --noEmit`
Expected: không lỗi TS.

- [ ] **Step 7: Commit**

```bash
git add fe/src/config/termRegistry.ts fe/src/config/termRegistry.test.ts fe/src/config/termCol.tsx
git commit -m "feat(term): mở rộng TERM_REGISTRY + helper termCol cho rollout nhiều cột"
```

---

### Task 5: Rollout NKC — chuyển cột đổi-tên-được sang `EditableTerm`/`termCol`

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`

**Interfaces:**
- Consumes: `EditableTerm` (Task 3), `termCol` (Task 4), term keys trong `TERM_REGISTRY`.

- [ ] **Step 1: Xác định cột đổi-tên-được**

Mở `EntryListTab.tsx`, tìm mảng cột (quanh dòng ~345–382 có 2 cột `chuDauTuMa`/`chuDauTu` đã dùng `EditableTerm`). Liệt kê các cột khác có nhãn nghiệp vụ đổi-tên-được theo lĩnh vực (vd cột dự án/đối tượng nếu có trong bảng này). Chỉ chuyển cột **thuần nhãn** — không đụng cột số liệu/logic.

- [ ] **Step 2: Áp `EditableTerm` cho các cột đó**

Với mỗi cột đổi-tên-được, đặt `title: <EditableTerm tk="<key>" surface="nkc.col..." />` (đã import `EditableTerm` sẵn ở file này cho 2 cột pilot). Với cột mới phát sinh nhiều, có thể dùng `termCol({ tk, surface, key, render, ... })` — import:

```ts
import { termCol } from '@/config/termCol';
```

Ví dụ chuyển 1 cột:

```tsx
// trước:
{ title: 'Dự án', key: 'duAn', render: (r) => r.duAnTen },
// sau:
termCol({ tk: 'duAn', surface: 'nkc.colTen', key: 'duAn', render: (r) => r.duAnTen }),
```

> Chỉ thêm `tk` vào `TERM_REGISTRY` (Task 4) nếu cột đó thực sự tồn tại trong bảng. Không tạo term "mồ côi".

- [ ] **Step 3: Biên dịch + test render hiện có**

Run: `cd fe && npx tsc --noEmit && npx vitest run`
Expected: không lỗi TS; toàn bộ test PASS.

- [ ] **Step 4: Kiểm thử tay (bắt buộc)**

Run: `cd fe && npm run dev` → đăng nhập tài khoản **SuperAdmin** có tenant gắn lĩnh vực (vd Xây dựng).
1. ⚙️ góc dưới-phải → "Đổi tiêu đề/nhãn".
2. Mở trang Nhật ký chung → mỗi cột đổi-tên-được hiện ✏️.
3. Sửa 1 nhãn → chọn **"Cả lĩnh vực (Xây dựng)"** → Lưu → thấy đổi ngay.
4. (Xác nhận live) Đăng nhập **công ty khác cùng lĩnh vực** chưa từng override → thấy nhãn mới. *(Với term đã từng clone như `chuDauTu`, công ty cũ có thể vẫn thấy bản clone — xem Task 6.)*
5. Tài khoản **không SuperAdmin** → popover chỉ có "Chỉ công ty này"/"Chỉ ở chỗ này", **không** có "Cả lĩnh vực".

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx
git commit -m "feat(term): NKC rollout EditableTerm cho các cột đổi-tên-được theo lĩnh vực"
```

---

### Task 6 (TÙY CHỌN — cần xác nhận trước khi làm): BE bỏ clone glossary để live inherit áp cho cả term cũ

> **Vì sao tùy chọn:** Task 1–5 đã cho live inherit với **mọi term mới** (tenant.glossary không có key → rơi xuống nganh live). Clone cũ chỉ ảnh hưởng term đã từng clone (vd `chuDauTu`): công ty cũ thấy bản clone thay vì nhãn lĩnh vực mới. Task này là **sửa logic BE** (không đổi schema) để dừng tạo clone mới. Người dùng đã nói ưu tiên "chỉ sửa giao diện" → **hỏi xác nhận trước.**

**Files:**
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.ts:241,410`
- Modify (test): `be/apps/master-data-service/src/tenant/tenant.service.spec.ts`

**Interfaces:**
- Đổi hành vi: tạo tenant và đổi `nganh` của tenant **không** clone `nganh.glossary` vào `tenant.glossary` (để trống `{}`), nhãn đọc live từ `nganh`.

- [ ] **Step 1: Sửa test spec (test trước)**

Trong `tenant.service.spec.ts`, đổi kỳ vọng test clone-on-create: tạo tenant với `nganh` → `tenant.glossary` là `{}` (không clone). Sửa các assert tương ứng (vd test quanh dòng 161–211).

- [ ] **Step 2: Chạy → FAIL**

Run: `cd be && npx jest apps/master-data-service/src/tenant/tenant.service.spec.ts`
Expected: FAIL (vẫn còn clone).

- [ ] **Step 3: Bỏ clone**

Tại `tenant.service.ts:241` (tạo) và `:410` (đổi nganh), thay `await this.cloneGlossaryFromNganh(...)` bằng `{}`:

```ts
// create:
const glossary = {} as Glossary; // không clone — nhãn đọc live từ nganh
// update nganh:
tenant.glossary = {} as Glossary;
```

Giữ `updateGlossary` (override riêng công ty) nguyên vẹn. Có thể xóa `cloneGlossaryFromNganh` nếu không còn ai gọi (kiểm tra references trước khi xóa).

- [ ] **Step 4: Chạy → PASS**

Run: `cd be && npx jest apps/master-data-service/src/tenant/tenant.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add be/apps/master-data-service/src/tenant/tenant.service.ts be/apps/master-data-service/src/tenant/tenant.service.spec.ts
git commit -m "feat(tenant): bỏ clone nganh.glossary → tenant.glossary, đọc nhãn live từ lĩnh vực"
```

---

## Self-Review

**Spec coverage:**
- Chuỗi resolve thêm tầng nganh live → Task 1, 2. ✓
- Đọc live qua GET /nganh (không đổi BE) → Task 2. ✓
- EditableTerm "Cả lĩnh vực" chỉ SuperAdmin, PUT /nganh → Task 3. ✓
- Mở rộng nhiều trường (TERM_REGISTRY + termCol) → Task 4. ✓
- Rollout theo trang (NKC trước) → Task 5. ✓
- Bỏ clone để live cho term cũ (đã nêu Mục 3/5 spec, "xác nhận khi viết plan") → Task 6 (tùy chọn). ✓
- Không đổi schema, giữ guard SuperAdmin → Global Constraints + Task 3/6. ✓

**Placeholder scan:** Không có TBD/“xử lý lỗi phù hợp” chung chung; mọi step có code/lệnh cụ thể. Task 5 cố ý mô tả theo cấu trúc file thực tế (danh sách cột) vì cột nghiệp vụ phụ thuộc dữ liệu trang — đã nêu nguyên tắc + ví dụ cụ thể.

**Type consistency:** `resolveTerm` 5 tham số dùng nhất quán (Task 1 định nghĩa, Task 2 gọi). `buildSaveOptions`/`SaveOption` (Task 3) khớp dùng trong EditableTerm. `termCol` (Task 4) khớp dùng Task 5. `currentNganh`/`applyNganhGlossary`/`refreshNganh` (Task 2) khớp dùng Task 3.
