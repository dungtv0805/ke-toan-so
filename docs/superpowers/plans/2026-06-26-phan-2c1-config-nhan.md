# Phần 2c-1 — Nền + Màn cấu hình nhãn (config glossary) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin công ty tự sửa `tenant.glossary` qua một màn cấu hình nhãn (mở từ icon settings), áp dụng tức thì; chọn Ngành khi tạo/sửa công ty; SuperAdmin "Lưu thành chuẩn ngành".

**Architecture:** BE thêm endpoint self-service `PUT /tenants/current/glossary` (theo tenantId trong JWT). FE thêm `nganhService` + `tenantService.updateGlossary`, một setter `applyGlossary` trong AuthContext (patch `currentTenant.glossary` cục bộ → TermContext render lại tức thì), một `GlossaryConfigModal` mở từ gear, và ô chọn Ngành trên form Công ty. "Lưu chuẩn ngành" tái dùng `PUT /nganh/:id` (2a).

**Tech Stack:** NestJS + MongoDB + class-validator (BE); React 18 + TS + AntD (FE); jest (BE), vitest (FE).

## Global Constraints

- Glossary shape (đồng nhất BE+FE): `Glossary = Record<string, { label: string; surfaces?: Record<string,string> }>`.
- Endpoint self-service sửa glossary CÔNG TY HIỆN TẠI lấy `tenantId` từ JWT qua `@CurrentUser('tenantId')` (KHÔNG nhận id tùy ý) → người dùng chỉ sửa được công ty của mình. Guard: `JwtGuard`.
- Route đặt `@Put('current/glossary')` (KHÔNG để `:id` nuốt) — khai báo TRƯỚC route `@Put(':id')` trong controller cho chắc.
- Màn cấu hình nhãn mở từ **icon settings (bánh răng)** → item "Cấu hình nhãn" (mount Modal trong MainLayout), KHÔNG tạo route/page mới (tránh khai báo phân quyền). Chỉ hiện cho admin (`canManageConfig`) hoặc SuperAdmin.
- Danh sách thuật ngữ lấy từ `TERM_REGISTRY` (Phần 2b); mỗi term cho sửa **label gốc** + các **surface** đã khai báo trong registry.
- Lưu xong cập nhật `currentTenant.glossary` cục bộ (không reload) để nhãn đổi ngay.
- "Lưu thành chuẩn ngành": chỉ SuperAdmin và chỉ khi `currentTenant.nganh` có giá trị; gọi `PUT /nganh/:id` với `{ glossary }`.
- BE test: `cd be && yarn jest <path>`; build: `npx nest build master-data-service`. FE build: `cd fe && npm run build`; lint `npm run lint` (2 lỗi pre-existing TenantPage/ThanhVienPage được phép).

---

## File Structure

- `be/libs/dto/src/tenant/update-tenant-glossary.dto.ts` (CREATE) + barrel — `UpdateTenantGlossaryDto { glossary }`.
- `be/apps/master-data-service/src/tenant/tenant.service.ts` (MODIFY) — `updateGlossary(tenantId, glossary)`.
- `be/apps/master-data-service/src/tenant/tenant.controller.ts` (MODIFY) — `PUT current/glossary`.
- `be/apps/master-data-service/src/tenant/tenant.service.spec.ts` (MODIFY) — test updateGlossary.
- `fe/src/services/nganhService.ts` (CREATE) — getAll/update.
- `fe/src/services/tenantService.ts` (MODIFY) — `updateGlossary(glossary)`.
- `fe/src/contexts/AuthContext.tsx` (MODIFY) — `applyGlossary(glossary)`.
- `fe/src/components/glossary/GlossaryConfigModal.tsx` (CREATE) — màn cấu hình nhãn.
- `fe/src/components/layout/MainLayout.tsx` (MODIFY) — gear item + mount modal.
- `fe/src/pages/cau-hinh/tenant/TenantPage.tsx` (MODIFY) — ô chọn Ngành.

Thứ tự: BE endpoint → FE services → AuthContext setter → modal → tenant form. Build-green mỗi task.

---

### Task 1: BE — endpoint self-service sửa glossary công ty hiện tại (TDD)

**Files:**
- Create: `be/libs/dto/src/tenant/update-tenant-glossary.dto.ts`
- Modify: `be/libs/dto/src/tenant/index.ts`
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.ts`
- Modify: `be/apps/master-data-service/src/tenant/tenant.controller.ts`
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.spec.ts`

**Interfaces:**
- Consumes: `Glossary` (`@app/entities`), `@CurrentUser` (`@app/auth`), `JwtGuard` (`@app/auth`).
- Produces: `TenantService.updateGlossary(tenantId: string, glossary: Glossary): Promise<Tenant>`; route `PUT /master-data/tenants/current/glossary` body `{ glossary }`.

- [ ] **Step 1: DTO** `be/libs/dto/src/tenant/update-tenant-glossary.dto.ts`:

```ts
import { IsObject, IsOptional } from 'class-validator';
import type { Glossary } from '@app/entities';

export class UpdateTenantGlossaryDto {
  @IsObject()
  @IsOptional()
  glossary?: Glossary;
}
```

- [ ] **Step 2: Export** — `be/libs/dto/src/tenant/index.ts`: thêm `export * from './update-tenant-glossary.dto';` (cạnh các export tenant hiện có).

- [ ] **Step 3: Viết test thất bại** — thêm vào `be/apps/master-data-service/src/tenant/tenant.service.spec.ts` (dùng lại setup mock repo đã có trong file; nếu file có `describe` riêng, thêm describe mới):

```ts
describe('TenantService.updateGlossary', () => {
  it('ghi glossary mới vào tenant theo id', async () => {
    const tenant: any = { _id: 'tid', glossary: {} };
    const tenantRepo: any = {
      findOne: jest.fn(async () => tenant),
      save: jest.fn(async (x: any) => x),
    };
    const empty: any = { findOne: jest.fn(), find: jest.fn(async () => []), save: jest.fn(async (x: any) => x), create: jest.fn((x: any) => x), count: jest.fn(async () => 0) };
    const { Test } = await import('@nestjs/testing');
    const { RAW_REPOSITORY_TOKEN_PREFIX } = await import('@app/database');
    const moduleRef = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`, useValue: tenantRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}User`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}UserCredential`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}UserTenant`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`, useValue: empty },
      ],
    }).compile();
    const service = moduleRef.get(TenantService);
    // findOne dùng ObjectId(id) → stub tenantRepo.findOne luôn trả tenant ở trên
    const g = { chuDauTu: { label: 'Nhà tài trợ' } };
    const res = await service.updateGlossary('tid', g as any);
    expect(res.glossary).toEqual(g);
    expect(tenantRepo.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Chạy test để xác nhận FAIL**

Run: `cd be && yarn jest apps/master-data-service/src/tenant/tenant.service.spec.ts -t "updateGlossary"`
Expected: FAIL — `updateGlossary` không tồn tại.

- [ ] **Step 5: Thêm method service** — `tenant.service.ts`, thêm (import `Glossary` đã có từ Phần 2a; nếu chưa, thêm vào import `@app/entities`):

```ts
  /** Ghi đè glossary của 1 tenant (self-service: admin công ty sửa nhãn công ty mình). */
  async updateGlossary(tenantId: string, glossary: Glossary): Promise<Tenant> {
    const tenant = await this.findOne(tenantId);
    tenant.glossary = glossary ?? {};
    return this.tenantRepository.save(tenant);
  }
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `cd be && yarn jest apps/master-data-service/src/tenant/tenant.service.spec.ts -t "updateGlossary"`
Expected: PASS.

- [ ] **Step 7: Thêm route controller** — `tenant.controller.ts`: import + route ĐẶT TRƯỚC `@Put(':id')`:

```ts
import { CurrentUser } from '@app/auth';
import { UpdateTenantGlossaryDto } from '@app/dto';
```
```ts
  @Put('current/glossary')
  @UseGuards(JwtGuard)
  async updateCurrentGlossary(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateTenantGlossaryDto,
  ) {
    const data = await this.tenantService.updateGlossary(tenantId, dto.glossary ?? {});
    return { success: true, data };
  }
```
(Đảm bảo `JwtGuard` đã import sẵn trong file; nếu chưa, thêm vào import `@app/auth`.)

- [ ] **Step 8: Build + test lại**

Run: `cd be && npx nest build master-data-service && yarn jest apps/master-data-service/src/tenant/tenant.service.spec.ts`
Expected: build PASS; test file PASS.

- [ ] **Step 9: Commit**

```bash
git add be/libs/dto/src/tenant be/apps/master-data-service/src/tenant
git commit -m "feat(tenant): endpoint self-service PUT /tenants/current/glossary"
```

---

### Task 2: FE — nganhService + tenantService.updateGlossary + FE Nganh type

**Files:**
- Create: `fe/src/services/nganhService.ts`
- Modify: `fe/src/services/tenantService.ts`

**Interfaces:**
- Consumes: `ServiceBase` pattern (như `linhVucService`); `Glossary` (`@/types/tenant`).
- Produces: `nganhService.getAll(): Promise<Nganh[]>`, `nganhService.update(id, { glossary }): Promise<Nganh>`; `export interface Nganh { id; code; name; isActive; glossary }`; `tenantService.updateGlossary(glossary: Glossary): Promise<{ glossary: Glossary }>`.

- [ ] **Step 1: Tạo** `fe/src/services/nganhService.ts` (mirror `linhVucService`):

```ts
import { ServiceBase } from '@/services/base/service-base';
import type { Glossary } from '@/types/tenant';

export interface Nganh {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  glossary: Glossary;
}

class NganhService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/nganh' });
  }

  async getAll(): Promise<Nganh[]> {
    const res = await this.get<Array<Record<string, unknown>>>({});
    return res.map(this.transform);
  }

  async update(id: string, data: { glossary?: Glossary; name?: string; isActive?: boolean }): Promise<Nganh> {
    const res = await this.put<Record<string, unknown>>(data, { endpoint: `/${id}` });
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): Nganh {
    return {
      id: (x._id as string) || (x.id as string),
      code: x.code as string,
      name: x.name as string,
      description: x.description as string | undefined,
      isActive: x.isActive as boolean,
      glossary: (x.glossary as Glossary) ?? {},
    };
  }
}

export const nganhService = new NganhService();
```

- [ ] **Step 2: Thêm `updateGlossary` vào** `fe/src/services/tenantService.ts` — thêm method trong class (cạnh `update`):

```ts
  async updateGlossary(glossary: import('@/types/tenant').Glossary): Promise<{ glossary: import('@/types/tenant').Glossary }> {
    const res = await this.put<Record<string, unknown>>(
      { glossary },
      { endpoint: '/current/glossary' },
    );
    return { glossary: (res.glossary as import('@/types/tenant').Glossary) ?? {} };
  }
```

- [ ] **Step 3: Build**

Run: `cd fe && npm run build`
Expected: build PASS.

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/nganhService.ts fe/src/services/tenantService.ts
git commit -m "feat(term): nganhService + tenantService.updateGlossary"
```

---

### Task 3: FE — AuthContext.applyGlossary (patch currentTenant cục bộ)

**Files:**
- Modify: `fe/src/contexts/AuthContext.tsx`

**Interfaces:**
- Produces: `applyGlossary(glossary: Glossary): void` trong context (patch `currentTenant.glossary` + cache, để nhãn render lại ngay).

- [ ] **Step 1: Khai báo trong type** — thêm vào `interface AuthContextType` (cạnh các method khác):

```ts
  applyGlossary: (glossary: import('@/types/tenant').Glossary) => void;
```

- [ ] **Step 2: Cài đặt** — trong `AuthProvider`, thêm (đặt gần `refreshUser`):

```ts
  const applyGlossary = useCallback((glossary: import('@/types/tenant').Glossary) => {
    setCurrentTenantState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, glossary };
      setCurrentTenant(next); // cập nhật cache localStorage
      return next;
    });
  }, []);
```
(`setCurrentTenant` là helper cache đã import sẵn ở đầu file — dùng như các chỗ login/selectTenant.)

- [ ] **Step 3: Expose trong value** — thêm `applyGlossary,` vào object truyền cho `AuthContext.Provider`.

- [ ] **Step 4: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS; không lỗi mới.

- [ ] **Step 5: Commit**

```bash
git add fe/src/contexts/AuthContext.tsx
git commit -m "feat(term): AuthContext.applyGlossary patch currentTenant cục bộ"
```

---

### Task 4: FE — GlossaryConfigModal + gear item + mount

**Files:**
- Create: `fe/src/components/glossary/GlossaryConfigModal.tsx`
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `TERM_REGISTRY` (`@/config/termRegistry`), `useAuth()` (`currentTenant`, `applyGlossary`, `user.isSuperAdmin`), `tenantService.updateGlossary`, `nganhService` (Task 2), `Glossary` type.
- Produces: `GlossaryConfigModal` (props `{ open: boolean; onClose: () => void }`).

- [ ] **Step 1: Tạo** `fe/src/components/glossary/GlossaryConfigModal.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Divider, Typography, message } from 'antd';
import { TERM_REGISTRY } from '@/config/termRegistry';
import type { Glossary } from '@/types/tenant';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService } from '@/services/tenantService';
import { nganhService } from '@/services/nganhService';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

// Gộp glossary công ty hiện tại lên trên registry để hiện giá trị đang dùng.
function initialValue(g: Glossary | undefined) {
  const out: Record<string, { label: string; surfaces: Record<string, string> }> = {};
  for (const key of Object.keys(TERM_REGISTRY)) {
    const reg = TERM_REGISTRY[key];
    const cur = g?.[key];
    const surfaces: Record<string, string> = {};
    for (const s of Object.keys(reg.surfaces ?? {})) {
      surfaces[s] = cur?.surfaces?.[s] ?? reg.surfaces![s];
    }
    out[key] = { label: cur?.label ?? reg.label, surfaces };
  }
  return out;
}

export function GlossaryConfigModal({ open, onClose }: Props) {
  const { currentTenant, applyGlossary, user } = useAuth();
  const [value, setValue] = useState(() => initialValue(currentTenant?.glossary));
  const [saving, setSaving] = useState(false);
  const [savingStd, setSavingStd] = useState(false);

  useEffect(() => {
    if (open) setValue(initialValue(currentTenant?.glossary));
  }, [open, currentTenant?.glossary]);

  const buildGlossary = (): Glossary => {
    const g: Glossary = {};
    for (const key of Object.keys(value)) {
      const v = value[key];
      const surfaces: Record<string, string> = {};
      for (const s of Object.keys(v.surfaces)) {
        if (v.surfaces[s]?.trim()) surfaces[s] = v.surfaces[s].trim();
      }
      g[key] = Object.keys(surfaces).length ? { label: v.label, surfaces } : { label: v.label };
    }
    return g;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const g = buildGlossary();
      const res = await tenantService.updateGlossary(g);
      applyGlossary(res.glossary);
      message.success('Đã lưu nhãn hiển thị');
      onClose();
    } catch {
      message.error('Lưu nhãn thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStandard = async () => {
    if (!currentTenant?.nganh) return;
    setSavingStd(true);
    try {
      const list = await nganhService.getAll();
      const nganh = list.find((n) => n.code === currentTenant.nganh);
      if (!nganh) {
        message.error('Không tìm thấy ngành để lưu chuẩn');
        return;
      }
      await nganhService.update(nganh.id, { glossary: buildGlossary() });
      message.success(`Đã lưu thành chuẩn ngành ${nganh.name}`);
    } catch {
      message.error('Lưu chuẩn ngành thất bại');
    } finally {
      setSavingStd(false);
    }
  };

  return (
    <Modal
      title="Cấu hình nhãn hiển thị"
      open={open}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose}>Đóng</Button>,
        ...(user?.isSuperAdmin && currentTenant?.nganh
          ? [<Button key="std" loading={savingStd} onClick={handleSaveStandard}>Lưu thành chuẩn ngành</Button>]
          : []),
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>,
      ]}
    >
      <Form layout="vertical">
        {Object.keys(value).map((key) => (
          <div key={key}>
            <Form.Item label={`Nhãn: ${key}`} style={{ marginBottom: 8 }}>
              <Input
                value={value[key].label}
                onChange={(e) =>
                  setValue((p) => ({ ...p, [key]: { ...p[key], label: e.target.value } }))
                }
              />
            </Form.Item>
            {Object.keys(value[key].surfaces).map((s) => (
              <Form.Item key={s} label={<Text type="secondary">{`  ↳ ${s}`}</Text>} style={{ marginBottom: 8 }}>
                <Input
                  value={value[key].surfaces[s]}
                  onChange={(e) =>
                    setValue((p) => ({
                      ...p,
                      [key]: { ...p[key], surfaces: { ...p[key].surfaces, [s]: e.target.value } },
                    }))
                  }
                />
              </Form.Item>
            ))}
            <Divider style={{ margin: '8px 0' }} />
          </div>
        ))}
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 2: Gear item + mount trong** `fe/src/components/layout/MainLayout.tsx`:

(a) Import:
```tsx
import { GlossaryConfigModal } from "@/components/glossary/GlossaryConfigModal";
import { FontColorsOutlined } from "@ant-design/icons";
```
(b) State (cạnh các useState khác):
```tsx
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
```
(c) Trong `settingsMenuItems`, thêm item (đặt trong nhánh `canManageConfig ? [...]` hoặc ngay sau, hiện cho admin/superadmin):
```tsx
    ...(canManageConfig || user?.isSuperAdmin ? [{
      key: "cau-hinh-nhan",
      icon: <FontColorsOutlined />,
      label: "Cấu hình nhãn",
      onClick: () => setGlossaryModalOpen(true),
    }] : []),
```
(d) Mount modal (gần cuối JSX, cạnh các overlay khác — ví dụ trước thẻ đóng `</Layout>` ngoài cùng):
```tsx
      <GlossaryConfigModal open={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
```

- [ ] **Step 3: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS; không lỗi mới (cảnh báo `any` nếu có là chấp nhận, nhưng code trên không dùng `any`).

- [ ] **Step 4: Kiểm thử tay (sau dev/deploy)** — bấm gear → "Cấu hình nhãn" → đổi label `chuDauTu` (vd "Nhà tài trợ") → Lưu → menu/cột/trang CĐT đổi ngay không cần reload.

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/glossary/GlossaryConfigModal.tsx fe/src/components/layout/MainLayout.tsx
git commit -m "feat(term): màn Cấu hình nhãn mở từ gear + lưu chuẩn ngành (superadmin)"
```

---

### Task 5: FE — ô chọn Ngành trên form Công ty

**Files:**
- Modify: `fe/src/pages/cau-hinh/tenant/TenantPage.tsx`

**Interfaces:**
- Consumes: `nganhService.getAll()` (Task 2).

- [ ] **Step 1: Nạp danh sách ngành** — trong `TenantPage`, thêm import + state + fetch:

```tsx
import { nganhService, type Nganh } from "@/services/nganhService";
```
```tsx
  const [nganhList, setNganhList] = useState<Nganh[]>([]);
```
Trong `useEffect` nạp dữ liệu ban đầu (cạnh `fetchTenants()`), thêm:
```tsx
    nganhService.getAll().then(setNganhList).catch(() => setNganhList([]));
```
(Nếu file đã có 1 useEffect mount, thêm dòng trên vào đó; nếu không, tạo `useEffect(() => { ... }, [])`.)

- [ ] **Step 2: Ô chọn Ngành trong form** — thêm `Form.Item` (ngay sau `Form.Item name="modules"`):

```tsx
    <Form.Item
      name="nganh"
      label="Ngành"
      extra="Chọn ngành để áp bộ nhãn hiển thị chuẩn (Chủ đầu tư, ...)"
    >
      <Select
        allowClear
        placeholder="Chọn ngành"
        options={nganhList.map((n) => ({ value: n.code, label: n.name }))}
      />
    </Form.Item>
```

- [ ] **Step 3: Prefill khi sửa + gửi khi tạo** —
  - Khi mở form sửa (chỗ `form.setFieldsValue(...)` cho editingTenant), đảm bảo có `nganh: editingTenant.nganh` (thêm field nếu object set values liệt kê tay; nếu dùng spread toàn bộ tenant thì bỏ qua).
  - Trong `handleSubmit` nhánh tạo (`createData`), thêm `nganh: formValues.nganh` vào object `CreateTenantDto`. Nhánh sửa đã gửi nguyên `values` nên `nganh` tự đi theo.
  - Thêm `nganh?: string` vào FE type `Tenant`/`CreateTenantDto` nếu type FE chặt (nếu `tenantService`/types báo lỗi thiếu field). Định vị FE `CreateTenantDto`/`UpdateTenantDto`/`Tenant` type và thêm `nganh?: string` cho khớp.

- [ ] **Step 4: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS; không lỗi mới.

- [ ] **Step 5: Kiểm thử tay (sau deploy)** — tạo/sửa công ty, chọn Ngành "Xây dựng" → BE clone glossary ngành vào tenant (2a) → công ty đó có sẵn nhãn chuẩn ngành.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/cau-hinh/tenant/TenantPage.tsx
git commit -m "feat(tenant): ô chọn Ngành trên form công ty"
```

---

## Self-Review (đã rà soát)

- **Spec coverage (2c-1):** self-service sửa glossary công ty (Task 1 BE + Task 4 UI); FE service (Task 2); render lại tức thì (Task 3 applyGlossary + TermContext của 2b); trang/màn cấu hình nhãn = modal từ gear (Task 4); "Lưu thành chuẩn ngành" (Task 4, tái dùng PUT /nganh/:id); chọn Ngành khi tạo/sửa công ty + clone (Task 5 + clone 2a). ✓
- **Ngoài phạm vi (đúng phân rã):** sửa **tại chỗ** (gear toggle + click nhãn + popover scope) = **2c-2**; tạo/xoá template Ngành mới (ngoài seed) — chưa cần, "Lưu thành chuẩn" cập nhật ngành đang gán; mở rộng term ngoài chuDauTu — đã sẵn cơ chế (thêm vào TERM_REGISTRY).
- **Placeholder scan:** không có TBD; code/lệnh cụ thể (line số ghi rõ gần đúng, định vị theo nội dung).
- **Type consistency:** `Glossary` đồng nhất BE (`@app/entities`) ↔ FE (`@/types/tenant`); `updateGlossary(tenantId, glossary)` (BE) ↔ `tenantService.updateGlossary(glossary)` (FE) ↔ route `current/glossary`; `applyGlossary(glossary)` khớp giữa type + impl + consumer (modal). `nganhService.update(id,{glossary})` khớp PUT /nganh/:id (2a UpdateNganhDto.glossary).
- **Route collision:** `@Put('current/glossary')` khai báo trước `@Put(':id')` → không bị nuốt. ✓
- **Build-green:** BE (Task 1) độc lập; FE services (Task 2) trước modal (Task 4) & form (Task 5); AuthContext setter (Task 3) trước modal. Mỗi task build/test xanh.
- **Deploy (sau khi xong, ngoài plan):** redeploy master-data-service (BE) + deploy FE.
