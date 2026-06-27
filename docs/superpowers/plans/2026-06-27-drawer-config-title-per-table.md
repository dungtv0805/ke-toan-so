# Drawer config title theo bảng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Thay cơ chế "sửa nhãn tại chỗ + nút global" bằng **nút ⚙️ trên từng bảng** → mở **Drawer 2 cột** (Tên mặc định | Tên hiển thị muốn đổi) để config title của bảng đó; lưu theo lĩnh vực (SuperAdmin) hoặc công ty.

**Architecture:** Gỡ EditMode/✏️ inline + 2 mục gear ("Cấu hình nhãn", "Đổi tiêu đề/nhãn"). Term hiển thị thành component thuần `TermText` (chỉ `t(tk,surface)`). Thêm `TableTitleSettings` (⚙️ + Drawer) dùng helper thuần `buildTitleGlossary` để gom override rồi gọi `nganhService.update` / `tenantService.updateGlossary`. Chuỗi resolve `tenant → nganh(live) → registry` và việc đọc nganh live giữ nguyên.

**Tech Stack:** React + TS, Ant Design (Drawer, Table/Input, Radio), Vitest.

## Global Constraints
- Không đổi schema/field DB; `PUT /nganh/:id` giữ `SuperAdminGuard` → chỉ SuperAdmin thấy lựa chọn "Cả lĩnh vực".
- Chuỗi resolve: `tenant.surfaces[surface]` → `tenant.label` → `nganh.surfaces[surface]` → `nganh.label` → `registry.surfaces[surface]` → `registry.label` → `key`.
- **Override 1 cột (surface) KHÔNG được set `label`** (vì `tenant.label` đứng trên `registry.surfaces` → set label sẽ che các cột anh em). Vì vậy `GlossaryItem.label` thành optional và `buildTitleGlossary` chỉ ghi `surfaces[surface]` cho term có surface.
- Test: `cd fe && npx vitest run <path>`. Nhãn/ý tiếng Việt.

---

### Task 1: Gỡ EditMode + 2 mục gear; Term hiển thị thuần `TermText`

**Files:**
- Modify: `fe/src/types/tenant.ts` (label optional)
- Create: `fe/src/components/glossary/TermText.tsx`
- Delete: `fe/src/components/glossary/EditableTerm.tsx`, `fe/src/contexts/EditModeContext.tsx`
- Modify: `fe/src/config/termCol.tsx`, `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`, `fe/src/App.tsx`, `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Produces: `TermText({ tk: string; surface?: string })` — render `t(tk, surface)`.
- `GlossaryItem.label?: string`.

- [ ] **Step 1: `GlossaryItem.label` optional**

Trong `fe/src/types/tenant.ts`, đổi:
```ts
export interface GlossaryItem {
  label?: string;
  surfaces?: Record<string, string>;
}
```

- [ ] **Step 2: Tạo `TermText.tsx`**
```tsx
import { useTerm } from '@/contexts/TermContext';

interface Props {
  tk: string;
  surface?: string;
}

/** Hiển thị nhãn động theo glossary (không sửa tại chỗ — sửa qua TableTitleSettings). */
export function TermText({ tk, surface }: Props) {
  const { t } = useTerm();
  return <>{t(tk, surface)}</>;
}
```

- [ ] **Step 3: `termCol.tsx` dùng TermText**

Thay import + body của `fe/src/config/termCol.tsx`:
```tsx
import type { ColumnType } from 'antd/es/table';
import { TermText } from '@/components/glossary/TermText';

export function termCol<T>(
  args: { tk: string; surface?: string } & ColumnType<T>,
): ColumnType<T> {
  const { tk, surface, ...col } = args;
  return { ...col, title: <TermText tk={tk} surface={surface} /> };
}
```

- [ ] **Step 4: EntryListTab — đổi import EditableTerm → TermText**

Trong `EntryListTab.tsx`: đổi dòng import `import { EditableTerm } from "@/components/glossary/EditableTerm";` thành `import { TermText } from "@/components/glossary/TermText";`, và thay **mọi** `<EditableTerm ` thành `<TermText ` (các title cột). Dùng find/replace; không đổi gì khác.

- [ ] **Step 5: App.tsx — bỏ EditModeProvider**

Trong `fe/src/App.tsx`: xóa `import { EditModeProvider } from "./contexts/EditModeContext";` (dòng 11) và bỏ cặp thẻ `<EditModeProvider>` (110) `</EditModeProvider>` (560) — giữ nguyên children bên trong.

- [ ] **Step 6: MainLayout — gỡ 2 mục gear + modal**

Trong `fe/src/components/layout/MainLayout.tsx`:
- Xóa import dòng 69 `GlossaryConfigModal` và dòng 70 `useEditMode`.
- Xóa state `glossaryModalOpen` (dòng 365) và `const { editMode, setEditMode } = useEditMode();` (dòng 382).
- Trong mảng menu của gear, xóa 2 mục: "Cấu hình nhãn" (≈595–596) và mục toggle "Đổi tiêu đề/nhãn" / "Tắt sửa nhãn tại chỗ" (≈601–602). Xóa cả dấu phẩy/đối tượng item bao quanh cho đúng cú pháp.
- Xóa `<GlossaryConfigModal ... />` (≈932).
- Giữ nguyên `relabelMenu` (nhãn menu động vẫn chạy).

- [ ] **Step 7: Xóa file cũ**
```bash
git rm fe/src/components/glossary/EditableTerm.tsx fe/src/contexts/EditModeContext.tsx
```

- [ ] **Step 8: Biên dịch + test**

Run: `cd fe && npx tsc --noEmit && npx vitest run`
Expected: 0 lỗi TS (không còn ai import EditableTerm/useEditMode); test cũ liên quan EditableTerm đã xóa cùng file — nếu `saveTarget.test.ts` vẫn còn thì để Task 4 dọn. Nếu tsc báo `saveTarget.ts` lỗi do `EditScope`/label, KHÔNG sửa vội — saveTarget chỉ EditableTerm dùng, sẽ xóa ở Task 4; tạm thời giữ vì không ai import nữa (no-op). Đảm bảo build chính (`npx tsc --noEmit`) sạch.

- [ ] **Step 9: Commit**
```bash
git add -A && git commit -m "refactor(term): gỡ sửa-nhãn-tại-chỗ + mục gear; Term hiển thị thuần TermText, label optional"
```

---

### Task 2: Helper thuần `buildTitleGlossary` + tests

**Files:**
- Create: `fe/src/config/titleConfig.ts`
- Create: `fe/src/config/titleConfig.test.ts`

**Interfaces:**
- Produces:
  - `interface TitleTermSpec { tk: string; surface?: string }`
  - `titleKey(t: TitleTermSpec): string` → `` `${tk}|${surface ?? ''}` ``
  - `buildTitleGlossary(base: Glossary | undefined, terms: TitleTermSpec[], values: Record<string,string>, defaults: Record<string,string>): Glossary`

- [ ] **Step 1: Viết test trước**

`fe/src/config/titleConfig.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildTitleGlossary, titleKey, type TitleTermSpec } from './titleConfig';

const terms: TitleTermSpec[] = [
  { tk: 'chuDauTu', surface: 'nkc.colMa' },
  { tk: 'chuDauTu', surface: 'nkc.colTen' },
  { tk: 'duAn' }, // term không surface
];
const defaults: Record<string, string> = {
  [titleKey(terms[0])]: 'Mã CĐT',
  [titleKey(terms[1])]: 'CĐT',
  [titleKey(terms[2])]: 'Dự án',
};

describe('buildTitleGlossary', () => {
  it('ghi override surface KHÔNG set label (tránh che cột anh em)', () => {
    const g = buildTitleGlossary(undefined, terms, { [titleKey(terms[1])]: 'NTT' }, defaults);
    expect(g.chuDauTu.surfaces?.['nkc.colTen']).toBe('NTT');
    expect(g.chuDauTu.label).toBeUndefined();
    expect(g.chuDauTu.surfaces?.['nkc.colMa']).toBeUndefined();
  });

  it('giá trị bằng default hoặc rỗng → KHÔNG ghi (gỡ override)', () => {
    const base = { chuDauTu: { surfaces: { 'nkc.colTen': 'NTT' } } };
    const g = buildTitleGlossary(base, terms, { [titleKey(terms[1])]: 'CĐT' }, defaults); // = default
    expect(g.chuDauTu?.surfaces?.['nkc.colTen']).toBeUndefined();
    expect(g.chuDauTu).toBeUndefined(); // entry rỗng → xóa
  });

  it('term không surface → ghi label', () => {
    const g = buildTitleGlossary(undefined, terms, { [titleKey(terms[2])]: 'Công trình' }, defaults);
    expect(g.duAn.label).toBe('Công trình');
  });

  it('không thay đổi gì → glossary rỗng', () => {
    const g = buildTitleGlossary(undefined, terms, {}, defaults);
    expect(g).toEqual({});
  });
});
```

- [ ] **Step 2: Chạy → FAIL** — `cd fe && npx vitest run src/config/titleConfig.test.ts` (Cannot find module).

- [ ] **Step 3: Tạo `titleConfig.ts`**
```ts
import type { Glossary } from '@/types/tenant';

export interface TitleTermSpec {
  tk: string;
  surface?: string;
}

export const titleKey = (t: TitleTermSpec): string => `${t.tk}|${t.surface ?? ''}`;

/**
 * Gom các override title của 1 bảng vào glossary mới (deep-copy `base`).
 * - value rỗng hoặc bằng default → GỠ override (xóa surface / xóa label; xóa entry nếu rỗng).
 * - term có surface → chỉ ghi `surfaces[surface]` (KHÔNG set label → tránh che cột anh em).
 * - term không surface → ghi `label`.
 */
export function buildTitleGlossary(
  base: Glossary | undefined,
  terms: TitleTermSpec[],
  values: Record<string, string>,
  defaults: Record<string, string>,
): Glossary {
  const g: Glossary = JSON.parse(JSON.stringify(base ?? {}));
  for (const term of terms) {
    const key = titleKey(term);
    const v = (values[key] ?? '').trim();
    const def = (defaults[key] ?? '').trim();
    const entry = g[term.tk] ?? {};
    const keep = v !== '' && v !== def;

    if (term.surface) {
      const surfaces = { ...(entry.surfaces ?? {}) };
      if (keep) surfaces[term.surface] = v;
      else delete surfaces[term.surface];
      if (Object.keys(surfaces).length > 0) entry.surfaces = surfaces;
      else delete entry.surfaces;
    } else {
      if (keep) entry.label = v;
      else delete entry.label;
    }

    if (entry.label === undefined && (!entry.surfaces || Object.keys(entry.surfaces).length === 0)) {
      delete g[term.tk];
    } else {
      g[term.tk] = entry;
    }
  }
  return g;
}
```

- [ ] **Step 4: Chạy → PASS** — `cd fe && npx vitest run src/config/titleConfig.test.ts` (4 tests).

- [ ] **Step 5: Commit**
```bash
git add fe/src/config/titleConfig.ts fe/src/config/titleConfig.test.ts
git commit -m "feat(term): buildTitleGlossary — gom override title theo bảng (surface không set label)"
```

---

### Task 3: Component `TableTitleSettings` (⚙️ + Drawer 2 cột)

**Files:**
- Create: `fe/src/components/glossary/TableTitleSettings.tsx`

**Interfaces:**
- Consumes: `useTerm`, `useAuth` (`user`, `currentTenant`, `currentNganh`, `applyGlossary`, `applyNganhGlossary`), `resolveTerm`+`TERM_REGISTRY`, `buildTitleGlossary`/`titleKey`/`TitleTermSpec`, `nganhService`, `tenantService`.
- Produces: `TableTitleSettings({ terms: TitleTermSpec[]; buttonText?: string })`.

- [ ] **Step 1: Tạo component**
```tsx
import { useState } from 'react';
import { Button, Drawer, Input, Radio, Space, Table, Tooltip, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useTerm } from '@/contexts/TermContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveTerm, TERM_REGISTRY } from '@/config/termRegistry';
import { buildTitleGlossary, titleKey, type TitleTermSpec } from '@/config/titleConfig';
import { nganhService } from '@/services/nganhService';
import { tenantService } from '@/services/tenantService';

interface Props {
  terms: TitleTermSpec[];
  buttonText?: string;
}

type Target = 'nganh' | 'tenant';

export function TableTitleSettings({ terms, buttonText }: Props) {
  const { t } = useTerm();
  const { user, currentTenant, currentNganh, applyGlossary, applyNganhGlossary } = useAuth();
  const canNganh = !!user?.isSuperAdmin && !!currentNganh;

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>('tenant');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const defaults: Record<string, string> = {};
  for (const term of terms) {
    defaults[titleKey(term)] = resolveTerm(undefined, undefined, TERM_REGISTRY, term.tk, term.surface);
  }

  const onOpen = () => {
    const init: Record<string, string> = {};
    for (const term of terms) init[titleKey(term)] = t(term.tk, term.surface);
    setValues(init);
    setTarget(canNganh ? 'nganh' : 'tenant');
    setOpen(true);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (target === 'nganh' && currentNganh) {
        const next = buildTitleGlossary(currentNganh.glossary, terms, values, defaults);
        const res = await nganhService.update(currentNganh.id, { glossary: next });
        applyNganhGlossary(res.glossary);
      } else {
        const next = buildTitleGlossary(currentTenant?.glossary, terms, values, defaults);
        const res = await tenantService.updateGlossary(next);
        applyGlossary(res.glossary);
      }
      message.success('Đã lưu tiêu đề');
      setOpen(false);
    } catch {
      message.error('Lưu tiêu đề thất bại');
    } finally {
      setSaving(false);
    }
  };

  const dataSource = terms.map((term) => {
    const key = titleKey(term);
    return { key, def: defaults[key], term };
  });

  return (
    <>
      <Tooltip title="Đổi tiêu đề cột">
        <Button size="small" icon={<SettingOutlined />} onClick={onOpen}>
          {buttonText}
        </Button>
      </Tooltip>
      <Drawer
        title="Đổi tiêu đề hiển thị"
        width={520}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Button type="primary" loading={saving} onClick={handleSave}>
            Lưu
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {canNganh && (
            <Radio.Group value={target} onChange={(e) => setTarget(e.target.value)}>
              <Radio value="nganh">Cả lĩnh vực{currentNganh ? ` (${currentNganh.name})` : ''}</Radio>
              <Radio value="tenant">Chỉ công ty này</Radio>
            </Radio.Group>
          )}
          <Table
            size="small"
            pagination={false}
            dataSource={dataSource}
            columns={[
              { title: 'Tên mặc định', dataIndex: 'def', width: 200 },
              {
                title: 'Tên hiển thị',
                render: (_: unknown, row: { key: string; def: string }) => (
                  <Input
                    size="small"
                    value={values[row.key] ?? ''}
                    placeholder={row.def}
                    onChange={(e) => setValues((p) => ({ ...p, [row.key]: e.target.value }))}
                  />
                ),
              },
            ]}
          />
        </Space>
      </Drawer>
    </>
  );
}
```

- [ ] **Step 2: Biên dịch** — `cd fe && npx tsc --noEmit` (0 lỗi).

- [ ] **Step 3: Commit**
```bash
git add fe/src/components/glossary/TableTitleSettings.tsx
git commit -m "feat(term): TableTitleSettings — nút ⚙️ + Drawer 2 cột config title theo bảng"
```

---

### Task 4: Gắn vào NKC + dọn file chết + verify

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/nkcTitleTerms.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`
- Delete (nếu không còn ai import): `fe/src/config/saveTarget.ts`, `fe/src/config/saveTarget.test.ts`, `fe/src/config/glossaryEdit.ts`, `fe/src/config/glossaryEdit.test.ts`, `fe/src/components/glossary/GlossaryConfigModal.tsx`

**Interfaces:**
- Consumes: `TableTitleSettings`, `TitleTermSpec`.

- [ ] **Step 1: Danh sách term của NKC**

Tạo `nkcTitleTerms.ts`:
```ts
import type { TitleTermSpec } from '@/config/titleConfig';

export const NKC_TITLE_TERMS: TitleTermSpec[] = [
  { tk: 'chuDauTu', surface: 'nkc.colMa' }, { tk: 'chuDauTu', surface: 'nkc.colTen' },
  { tk: 'doiTuong', surface: 'nkc.dtNoMa' }, { tk: 'doiTuong', surface: 'nkc.dtNo' },
  { tk: 'doiTuong', surface: 'nkc.dtCoMa' }, { tk: 'doiTuong', surface: 'nkc.dtCo' },
  { tk: 'duAn', surface: 'nkc.colMa' }, { tk: 'duAn', surface: 'nkc.colTen' },
  { tk: 'sanPham', surface: 'nkc.colMa' }, { tk: 'sanPham', surface: 'nkc.colTen' },
  { tk: 'boPhan', surface: 'nkc.colMa' }, { tk: 'boPhan', surface: 'nkc.colTen' },
  { tk: 'doi', surface: 'nkc.colMa' }, { tk: 'doi', surface: 'nkc.colTen' },
  { tk: 'nhanVien', surface: 'nkc.colMa' }, { tk: 'nhanVien', surface: 'nkc.colTen' },
  { tk: 'dongTien', surface: 'nkc.colMa' }, { tk: 'dongTien', surface: 'nkc.colTen' },
  { tk: 'khoanMuc', surface: 'nkc.colMa' }, { tk: 'khoanMuc', surface: 'nkc.colTen' },
  { tk: 'nhomKhuyenMai', surface: 'nkc.colMa' }, { tk: 'nhomKhuyenMai', surface: 'nkc.colTen' },
  { tk: 'nhomQuanLy', surface: 'nkc.colMa' }, { tk: 'nhomQuanLy', surface: 'nkc.colTen' },
  { tk: 'hopDong', surface: 'nkc.colMa' }, { tk: 'hopDong', surface: 'nkc.colTen' },
];
```

- [ ] **Step 2: Gắn nút vào toolbar NKC**

Trong `EntryListTab.tsx`: thêm import
```ts
import { TableTitleSettings } from '@/components/glossary/TableTitleSettings';
import { NKC_TITLE_TERMS } from './nkcTitleTerms';
```
Trong `<div className="excel-toolbar">` nhóm `<Space size="small">` bên phải (chỗ có nút Refresh + `<FilterDrawer />`), thêm trước `<FilterDrawer />`:
```tsx
<TableTitleSettings terms={NKC_TITLE_TERMS} />
```

- [ ] **Step 3: Dọn file chết**

Kiểm tra không còn import:
```bash
cd fe && grep -rl "saveTarget\|glossaryEdit\|GlossaryConfigModal" src || echo "no refs"
```
Với mỗi file không còn ai import, xóa:
```bash
git rm fe/src/config/saveTarget.ts fe/src/config/saveTarget.test.ts \
       fe/src/config/glossaryEdit.ts fe/src/config/glossaryEdit.test.ts \
       fe/src/components/glossary/GlossaryConfigModal.tsx
```
(Nếu `grep` còn báo file nào đang được import, GIỮ file đó lại và ghi chú trong report thay vì xóa.)

- [ ] **Step 4: Biên dịch + toàn bộ test**

Run: `cd fe && npx tsc --noEmit && npx vitest run`
Expected: 0 lỗi TS; toàn bộ test PASS.

- [ ] **Step 5: Kiểm thử tay (bắt buộc)**

`cd fe && npm run dev` → đăng nhập **SuperAdmin có tenant gắn lĩnh vực**.
1. Vào Nhật ký chung → toolbar có nút ⚙️ "Đổi tiêu đề cột".
2. Bấm ⚙️ → Drawer hiện 2 cột (Tên mặc định | ô nhập), có radio "Cả lĩnh vực / Chỉ công ty này".
3. Đổi 1 ô (vd "CĐT" → "Khách hàng") → chọn "Cả lĩnh vực" → Lưu → header bảng đổi ngay; các cột anh em (Mã CĐT...) KHÔNG bị đổi nhầm.
4. Xác nhận gear KHÔNG còn "Cấu hình nhãn"/"Đổi tiêu đề/nhãn".
5. Tài khoản không phải SuperAdmin: Drawer không hiện radio "Cả lĩnh vực" (chỉ lưu công ty).

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat(term): NKC gắn nút ⚙️ Drawer config title; dọn EditableTerm/saveTarget/glossaryEdit/GlossaryConfigModal"
```

---

## Self-Review
- Nút ⚙️ trên bảng + Drawer 2 cột (mặc định | nhập) → Task 3, 4. ✓
- Bỏ mục gear global + sửa tại chỗ → Task 1. ✓
- Lưu lĩnh vực (SuperAdmin) / công ty, đọc live → Task 3 (giữ resolve/AuthContext cũ). ✓
- Override surface không che cột anh em (label optional + buildTitleGlossary surface-only) → Constraint + Task 1/2. ✓
- Không đổi schema/guard BE → Global Constraints. ✓
- Placeholder: không có; mọi step có code/lệnh. Task 1 Step 8 nêu rõ cách xử lý saveTarget tạm thời (xóa ở Task 4).
- Type consistency: `TitleTermSpec`/`titleKey`/`buildTitleGlossary` (Task 2) dùng nhất quán ở Task 3/4; `TermText` (Task 1) dùng ở termCol/EntryListTab; `GlossaryItem.label?` nhất quán với resolveTerm (guard truthy) và buildTitleGlossary.
