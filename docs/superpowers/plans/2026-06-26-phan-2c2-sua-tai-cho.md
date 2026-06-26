# Phần 2c-2 — Sửa nhãn tại chỗ (edit-in-place) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bật "chế độ sửa nhãn" từ icon settings; khi bật, các nhãn động (pilot: cột Chủ đầu tư trong bảng NKC) click được → popover sửa (nhãn + phạm vi "Mọi nơi"/"Chỉ chỗ này") → lưu vào `tenant.glossary`, áp dụng tức thì.

**Architecture:** `EditModeContext` (bật/tắt chế độ sửa, toggle từ gear). `EditableTerm` component render `t(tk, surface)`; khi `editMode` bật thì bọc Popover sửa, lưu qua `tenantService.updateGlossary` + `applyGlossary` (đường ghi của 2c-1). Logic ghi 1 nhãn tách thành hàm thuần `applyGlossaryEdit` (TDD). Áp pilot vào cột NKC (Mã CĐT/CĐT).

**Tech Stack:** React 18 + TS + AntD, vitest (node).

## Global Constraints

- FE-only (dùng endpoint/đường ghi glossary của 2c-1: `tenantService.updateGlossary` + `AuthContext.applyGlossary`).
- Chế độ sửa nhãn bật từ **icon settings (bánh răng)** → item "Đổi tiêu đề/nhãn" (toggle). Chỉ hiện cho admin (`canManageConfig`).
- `EditableTerm` ngoài chế độ sửa → render đúng chuỗi `t(tk, surface)` (không thêm DOM thừa). Trong chế độ sửa → có affordance (gạch chân nét đứt + icon bút) mở Popover.
- Popover: input nhãn + (nếu có `surface`) Radio phạm vi **"Mọi nơi"** (ghi `glossary[tk].label`) / **"Chỉ chỗ này"** (ghi `glossary[tk].surfaces[surface]`); mặc định "Mọi nơi". Lưu → `updateGlossary(next)` → `applyGlossary(res.glossary)`.
- Khi tạo entry mới cho 1 term chưa có trong glossary công ty: phải set `label` = nhãn gốc đang dùng (`t(tk)` không surface) để không mất nhãn nền.
- Click vào nhãn/popover phải `stopPropagation` (tránh kích hoạt sort cột / điều hướng).
- **Phạm vi pilot 2c-2:** chỉ áp `EditableTerm` cho **cột NKC** (Mã CĐT/CĐT). Menu sidebar và trang Chủ đầu tư **không** sửa tại chỗ ở đợt này (đã sửa được qua màn "Cấu hình nhãn" của 2c-1); lý do: nhúng popover vào antd Menu / chuỗi nội suy ("Tên ...") rủi ro/ít giá trị — để mở rộng sau.
- vitest env=node → chỉ unit-test hàm thuần `applyGlossaryEdit`; context/component dùng build+lint làm gate.
- Test: `cd fe && npx vitest run <path>`; build `npm run build`; lint `npm run lint` (2 lỗi pre-existing TenantPage/ThanhVienPage + warnings cũ được phép).

---

## File Structure

- `fe/src/config/glossaryEdit.ts` (CREATE) — `applyGlossaryEdit(...)` + `EditScope`.
- `fe/src/config/glossaryEdit.test.ts` (CREATE) — unit test.
- `fe/src/contexts/EditModeContext.tsx` (CREATE) — `EditModeProvider` + `useEditMode`.
- `fe/src/App.tsx` (MODIFY) — mount `<EditModeProvider>` (trong TermProvider).
- `fe/src/components/glossary/EditableTerm.tsx` (CREATE) — component nhãn sửa-tại-chỗ.
- `fe/src/components/layout/MainLayout.tsx` (MODIFY) — gear toggle "Đổi tiêu đề/nhãn".
- `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx` (MODIFY) — cột Mã CĐT/CĐT dùng `<EditableTerm>`.

Thứ tự: helper → context → component → gear → áp NKC. Build-green mỗi task.

---

### Task 1: Hàm thuần applyGlossaryEdit (TDD)

**Files:**
- Create: `fe/src/config/glossaryEdit.ts`
- Create: `fe/src/config/glossaryEdit.test.ts`

**Interfaces:**
- Consumes: `Glossary` (`@/types/tenant`).
- Produces: `type EditScope = 'all' | 'surface'`; `applyGlossaryEdit(glossary: Glossary | undefined, baseLabelFallback: string, key: string, value: string, scope: EditScope, surface?: string): Glossary` — trả glossary MỚI (deep-copy), set label (scope 'all') hoặc surfaces[surface] (scope 'surface', đảm bảo có label nền).

- [ ] **Step 1: Viết test thất bại** `fe/src/config/glossaryEdit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyGlossaryEdit } from './glossaryEdit';
import type { Glossary } from '@/types/tenant';

describe('applyGlossaryEdit', () => {
  it("scope 'all' ghi label, không đụng nguồn (deep copy)", () => {
    const g: Glossary = { chuDauTu: { label: 'Chủ đầu tư' } };
    const next = applyGlossaryEdit(g, 'Chủ đầu tư', 'chuDauTu', 'Nhà tài trợ', 'all');
    expect(next.chuDauTu.label).toBe('Nhà tài trợ');
    expect(g.chuDauTu.label).toBe('Chủ đầu tư'); // nguồn không đổi
  });

  it("scope 'surface' ghi surface, giữ label nền", () => {
    const g: Glossary = { chuDauTu: { label: 'Chủ đầu tư' } };
    const next = applyGlossaryEdit(g, 'Chủ đầu tư', 'chuDauTu', 'NTT', 'surface', 'nkc.colTen');
    expect(next.chuDauTu.surfaces?.['nkc.colTen']).toBe('NTT');
    expect(next.chuDauTu.label).toBe('Chủ đầu tư');
  });

  it('tạo entry mới khi term chưa có: dùng baseLabelFallback làm label nền', () => {
    const next = applyGlossaryEdit(undefined, 'Chủ đầu tư', 'chuDauTu', 'CĐT2', 'surface', 'nkc.colTen');
    expect(next.chuDauTu.label).toBe('Chủ đầu tư');
    expect(next.chuDauTu.surfaces?.['nkc.colTen']).toBe('CĐT2');
  });

  it("scope 'all' trên glossary rỗng tạo entry với label mới", () => {
    const next = applyGlossaryEdit({}, 'Chủ đầu tư', 'chuDauTu', 'Nhà tài trợ', 'all');
    expect(next.chuDauTu).toEqual({ label: 'Nhà tài trợ' });
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/config/glossaryEdit.test.ts`
Expected: FAIL — không tìm thấy `./glossaryEdit`.

- [ ] **Step 3: Cài đặt** `fe/src/config/glossaryEdit.ts`:

```ts
import type { Glossary } from '@/types/tenant';

export type EditScope = 'all' | 'surface';

/**
 * Trả glossary MỚI (deep-copy) sau khi sửa 1 nhãn.
 * - scope 'all'    → ghi entry.label = value.
 * - scope 'surface'→ ghi entry.surfaces[surface] = value, đảm bảo entry.label có (baseLabelFallback).
 */
export function applyGlossaryEdit(
  glossary: Glossary | undefined,
  baseLabelFallback: string,
  key: string,
  value: string,
  scope: EditScope,
  surface?: string,
): Glossary {
  const next: Glossary = JSON.parse(JSON.stringify(glossary ?? {}));
  const entry = next[key] ?? { label: baseLabelFallback };
  if (scope === 'surface' && surface) {
    entry.surfaces = { ...(entry.surfaces ?? {}), [surface]: value };
    if (!entry.label) entry.label = baseLabelFallback;
  } else {
    entry.label = value;
  }
  next[key] = entry;
  return next;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/config/glossaryEdit.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add fe/src/config/glossaryEdit.ts fe/src/config/glossaryEdit.test.ts
git commit -m "feat(term): applyGlossaryEdit (ghi 1 nhãn theo phạm vi, deep-copy)"
```

---

### Task 2: EditModeContext + EditableTerm + mount + gear toggle

**Files:**
- Create: `fe/src/contexts/EditModeContext.tsx`
- Create: `fe/src/components/glossary/EditableTerm.tsx`
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `applyGlossaryEdit`/`EditScope` (Task 1); `useTerm` (2b); `useAuth` (`currentTenant`, `applyGlossary`); `tenantService.updateGlossary` (2c-1).
- Produces: `EditModeProvider`, `useEditMode(): { editMode: boolean; setEditMode: (v: boolean) => void }`; `<EditableTerm tk surface? />`.

- [ ] **Step 1: Tạo** `fe/src/contexts/EditModeContext.tsx`:

```tsx
import React, { createContext, useContext, useState } from 'react';

interface EditModeContextType {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export const EditModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editMode, setEditMode] = useState(false);
  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => {
  const ctx = useContext(EditModeContext);
  if (ctx === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return ctx;
};
```

- [ ] **Step 2: Mount trong** `fe/src/App.tsx` — bọc `<Routes>` thêm `<EditModeProvider>` (bên trong `<TermProvider>`):

```tsx
import { EditModeProvider } from "./contexts/EditModeContext";
```
```tsx
          <AuthProvider>
            <TermProvider>
              <EditModeProvider>
                <Routes>
                  {/* ... giữ nguyên ... */}
                </Routes>
              </EditModeProvider>
            </TermProvider>
          </AuthProvider>
```

- [ ] **Step 3: Tạo** `fe/src/components/glossary/EditableTerm.tsx`:

```tsx
import { useState } from 'react';
import { Popover, Input, Radio, Button, Space, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTerm } from '@/contexts/TermContext';
import { useEditMode } from '@/contexts/EditModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { applyGlossaryEdit, type EditScope } from '@/config/glossaryEdit';
import { tenantService } from '@/services/tenantService';

interface Props {
  tk: string;
  surface?: string;
}

export function EditableTerm({ tk, surface }: Props) {
  const { t } = useTerm();
  const { editMode } = useEditMode();
  const { currentTenant, applyGlossary } = useAuth();
  const label = t(tk, surface);

  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(label);
  const [scope, setScope] = useState<EditScope>(surface ? 'surface' : 'all');
  const [saving, setSaving] = useState(false);

  if (!editMode) return <>{label}</>;

  const onOpenChange = (o: boolean) => {
    if (o) {
      setVal(label);
      setScope(surface ? 'surface' : 'all');
    }
    setOpen(o);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const base = t(tk); // nhãn nền (không surface)
      const next = applyGlossaryEdit(currentTenant?.glossary, base, tk, val.trim(), scope, surface);
      const res = await tenantService.updateGlossary(next);
      applyGlossary(res.glossary);
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
        style={{ width: 220 }}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onPressEnter={handleSave}
      />
      {surface && (
        <Radio.Group size="small" value={scope} onChange={(e) => setScope(e.target.value)}>
          <Radio value="all">Mọi nơi</Radio>
          <Radio value="surface">Chỉ chỗ này</Radio>
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

- [ ] **Step 4: Gear toggle trong** `fe/src/components/layout/MainLayout.tsx`:

(a) Import:
```tsx
import { useEditMode } from "@/contexts/EditModeContext";
import { EditOutlined } from "@ant-design/icons";
```
(b) Hook trong component (gần `useTerm`):
```tsx
  const { editMode, setEditMode } = useEditMode();
```
(c) Thêm item vào `settingsMenuItems` (cạnh "Cấu hình nhãn", gate `canManageConfig`):
```tsx
    ...(canManageConfig ? [{
      key: "sua-nhan-tai-cho",
      icon: <EditOutlined />,
      label: editMode ? "Tắt sửa nhãn tại chỗ" : "Đổi tiêu đề/nhãn",
      onClick: () => setEditMode(!editMode),
    }] : []),
```
(Nếu `EditOutlined` đã import cho việc khác thì không import trùng.)

- [ ] **Step 5: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS; không lỗi mới.

- [ ] **Step 6: Commit**

```bash
git add fe/src/contexts/EditModeContext.tsx fe/src/components/glossary/EditableTerm.tsx fe/src/App.tsx fe/src/components/layout/MainLayout.tsx
git commit -m "feat(term): EditMode + EditableTerm + toggle sửa nhãn tại chỗ từ gear"
```

---

### Task 3: Áp EditableTerm vào cột Mã CĐT / CĐT (bảng NKC)

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`

**Interfaces:**
- Consumes: `<EditableTerm>` (Task 2).

- [ ] **Step 1: Import EditableTerm**

```tsx
import { EditableTerm } from "@/components/glossary/EditableTerm";
```

- [ ] **Step 2: Đổi title 2 cột** — cột key `chuDauTuMa` và `chuDauTu` (hiện đang `title: t("chuDauTu","nkc.colMa")` / `title: t("chuDauTu","nkc.colTen")` từ 2b):

```tsx
    title: <EditableTerm tk="chuDauTu" surface="nkc.colMa" />,
```
```tsx
    title: <EditableTerm tk="chuDauTu" surface="nkc.colTen" />,
```

- [ ] **Step 3: Bỏ tham số `t` khỏi getColumnDefinitions nếu hết dùng** — sau khi 2 title trên không còn gọi `t`, kiểm tra `getColumnDefinitions` còn dùng `t` ở đâu không:
  - Nếu KHÔNG còn: bỏ param `t` khỏi `getColumnDefinitions(...)`, bỏ `const { t } = useTerm();` + import `useTerm` nếu hết dùng, và sửa call-site `getColumnDefinitions(taiKhoanOptions)` + bỏ `t` khỏi mảng deps của `useMemo`.
  - Nếu CÒN dùng `t` chỗ khác: giữ nguyên param/hook, chỉ đổi 2 title.
  (Định vị theo nội dung; build sẽ báo nếu `t` thừa hay thiếu.)

- [ ] **Step 4: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS (không còn biến `t` mồ côi / không thiếu import); không lỗi mới.

- [ ] **Step 5: Kiểm thử tay (sau deploy/dev)** — bật gear → "Đổi tiêu đề/nhãn" → vào bảng NKC, header **Mã CĐT/CĐT** có gạch chân nét đứt; click → popover sửa nhãn + chọn phạm vi → Lưu → đổi ngay; tắt chế độ → header trở lại bình thường (không còn affordance).

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx
git commit -m "feat(term): cột Mã CĐT/CĐT sửa nhãn tại chỗ bằng EditableTerm"
```

---

## Self-Review (đã rà soát)

- **Spec coverage (2c-2):** chế độ sửa bật từ gear "Đổi tiêu đề/nhãn" (Task 2 gear toggle); click nhãn → popover label + phạm vi "Mọi nơi/Chỉ chỗ này" (Task 2 EditableTerm); lưu vào `tenant.glossary` qua đường 2c-1 + áp dụng tức thì (EditableTerm save + applyGlossary); pilot cột NKC (Task 3). ✓
- **Ngoài phạm vi (ghi rõ):** sửa tại chỗ ở MENU sidebar và TRANG Chủ đầu tư — chưa làm (popover trong antd Menu / chuỗi nội suy rủi ro; đã sửa được qua màn "Cấu hình nhãn" 2c-1). Mở rộng sau bằng cách bọc thêm `<EditableTerm>` ở các điểm phù hợp.
- **Placeholder scan:** không có TBD; code/lệnh cụ thể.
- **Type consistency:** `EditScope`/`applyGlossaryEdit` (Task 1) khớp dùng trong EditableTerm (Task 2); `useEditMode()` shape khớp giữa định nghĩa + consumer (MainLayout, EditableTerm); `tenantService.updateGlossary`/`applyGlossary` chữ ký khớp 2c-1.
- **Build-green:** Task 1 thuần; Task 2 (context+component+gear) sau helper; Task 3 áp dụng sau khi EditableTerm tồn tại + EditModeProvider đã mount. Mỗi task build/test xanh; vitest chỉ Task 1.
- **An toàn tương tác:** `stopPropagation` trên nhãn + nội dung popover để không kích hoạt sort cột; ngoài editMode component trả đúng chuỗi (không đổi hành vi bảng).
- **Deploy (sau khi xong, ngoài plan):** chỉ FE.
