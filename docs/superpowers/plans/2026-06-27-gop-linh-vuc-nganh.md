# Gộp Ngành vào Lĩnh vực — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Một khái niệm "Lĩnh vực" (`LinhVuc`) duy nhất mang cả menu + glossary; nhãn (title) đọc từ lĩnh vực của công ty thay vì `Nganh`; bỏ `Nganh` khỏi luồng.

**Architecture:** Thêm `glossary` vào `LinhVuc`. Lĩnh vực của công ty = `LinhVuc` của `tenant.modules[0]` (mặc định `KE_TOAN`). FE đổi nguồn đọc/ghi nhãn từ `currentNganh`→`currentLinhVuc`; "Cả lĩnh vực" lưu qua `PUT /linh-vuc/:id`. Di trú: copy `nganh.glossary`→`linh_vuc.glossary`.

**Tech Stack:** NestJS + TypeORM(Mongo), React+TS, Vitest/Jest.

## Global Constraints
- Một công ty = **một** lĩnh vực (= `modules[0]`, mặc định `KE_TOAN`). Menu giữ nguyên (đọc từ `LinhVuc.menuKeys`).
- Chuỗi resolve: `tenant.surfaces→tenant.label→linhVuc.surfaces→linhVuc.label→TERM_REGISTRY→key`.
- `PUT /linh-vuc/:id` giữ `SuperAdminGuard` → chỉ SuperAdmin lưu "Cả lĩnh vực".
- Không xoá entity/endpoint `Nganh` (chỉ ngừng dùng ở luồng FE/clone). Không đổi menu công ty.
- FE test: `cd fe && npx vitest run`; BE test: `cd be && npx jest <path>`.

---

### Task 1: BE — thêm `glossary` vào LinhVuc (entity + DTO + trả về/cập nhật)

**Files:**
- Modify: `be/libs/entities/src/linh-vuc/linh-vuc.entity.ts`
- Modify: `be/libs/dto/src/linh-vuc/create-linh-vuc.dto.ts`, `be/libs/dto/src/linh-vuc/update-linh-vuc.dto.ts`
- Test: `be/apps/master-data-service/src/linh-vuc/linh-vuc.service.spec.ts`

**Interfaces:**
- Produces: `LinhVuc.glossary: Glossary` (default `{}`); `UpdateLinhVucDto.glossary?`, `CreateLinhVucDto.glossary?`.

- [ ] **Step 1: Entity thêm cột**

Trong `linh-vuc.entity.ts`, thêm import + cột (Glossary export từ nganh.entity):
```ts
import { Glossary } from '../nganh/nganh.entity';
```
Trong class `LinhVuc`, sau `menuKeys`:
```ts
  @Column({ type: 'json', default: {} })
  glossary: Glossary;
```

- [ ] **Step 2: DTO thêm `glossary?`**

`create-linh-vuc.dto.ts` và `update-linh-vuc.dto.ts`, thêm (cuối class):
```ts
  @IsOptional()
  glossary?: Record<string, { label?: string; surfaces?: Record<string, string> }>;
```
(`IsOptional` đã import sẵn ở cả 2 file.)

- [ ] **Step 3: Test cập nhật glossary (viết trước)**

Thêm vào `linh-vuc.service.spec.ts` (theo style hiện có — mock repo). Nếu file chưa có khung mock, thêm test tối thiểu sau (đặt trong `describe` phù hợp):
```ts
it('update ghi glossary vào linh_vuc', async () => {
  const lv: any = { _id: 'L1', code: 'XAY_DUNG', name: 'Xây dựng', menuKeys: [], glossary: {} };
  // findOne trả lv; save trả lv đã gán
  jest.spyOn(service, 'findOne').mockResolvedValue(lv);
  const repoSave = jest.spyOn((service as any).linhVucRepository, 'save').mockImplementation(async (e: any) => e);
  const g = { chuDauTu: { label: 'Chủ đầu tư' } };
  const res = await service.update('L1', { glossary: g } as any);
  expect(res.glossary).toEqual(g);
  expect(repoSave).toHaveBeenCalled();
});
```
> Nếu cấu trúc spec hiện tại khác (không expose `service`/repo như trên), điều chỉnh để khớp khung mock đang dùng trong file — giữ đúng ý: `update` với `{glossary}` → entity lưu có `glossary`. `service.update` đã `Object.assign(linhVuc, sanitizeUpdateDto(dto))` nên chỉ cần DTO chứa `glossary`.

- [ ] **Step 4: Chạy test** — `cd be && npx jest apps/master-data-service/src/linh-vuc/linh-vuc.service.spec.ts` → PASS.

- [ ] **Step 5: Commit**
```bash
git add be/libs/entities/src/linh-vuc/linh-vuc.entity.ts be/libs/dto/src/linh-vuc/*.ts be/apps/master-data-service/src/linh-vuc/linh-vuc.service.spec.ts
git commit -m "feat(linh-vuc): thêm field glossary (entity+dto+update)"
```

---

### Task 2: BE — ngừng clone glossary từ Nganh khi tạo/đổi tenant

**Files:**
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.ts`
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.spec.ts`

**Interfaces:** Tenant tạo/đổi ngành **không** clone glossary (giữ `{}`); nhãn đọc live từ LinhVuc.

- [ ] **Step 1: Sửa spec (test trước)**

Trong `tenant.service.spec.ts`: test tạo tenant với nganh kỳ vọng `tenant.glossary` là `{}` (không clone). Sửa assert quanh `cloneGlossaryFromNganh`/glossary cho create + update-nganh thành `{}`.

- [ ] **Step 2: Chạy → FAIL** — `cd be && npx jest apps/master-data-service/src/tenant/tenant.service.spec.ts`.

- [ ] **Step 3: Bỏ clone**

Trong `tenant.service.ts`:
- Tại `create` (dòng ~241): đổi `const glossary = await this.cloneGlossaryFromNganh(createDto.nganh);` → `const glossary = {} as Glossary;`
- Tại `update` (dòng ~409-410): xoá nhánh:
```ts
    if (updateDto.nganh && updateDto.nganh !== tenant.nganh) {
      tenant.glossary = await this.cloneGlossaryFromNganh(updateDto.nganh);
    }
```
Giữ `cloneGlossaryFromNganh` (không gọi nữa) hoặc xoá nếu không còn ai dùng (kiểm tra references; nếu còn spec gọi thì giữ).

- [ ] **Step 4: Chạy → PASS** — `cd be && npx jest apps/master-data-service/src/tenant/tenant.service.spec.ts`.

- [ ] **Step 5: Commit**
```bash
git add be/apps/master-data-service/src/tenant/tenant.service.ts be/apps/master-data-service/src/tenant/tenant.service.spec.ts
git commit -m "feat(tenant): ngừng clone glossary từ Nganh (đọc live từ LinhVuc)"
```

---

### Task 3: FE — linhVucService thêm `glossary`

**Files:**
- Modify: `fe/src/services/linhVucService.ts`

**Interfaces:**
- Produces: `LinhVuc.glossary: import('@/types/tenant').Glossary`; `UpdateLinhVucDto.glossary?`; `transform` map glossary.

- [ ] **Step 1: Sửa types + transform**

Trong `linhVucService.ts`:
- Thêm import: `import type { Glossary } from '@/types/tenant';`
- `interface LinhVuc`: thêm `glossary: Glossary;`
- `interface UpdateLinhVucDto` và `CreateLinhVucDto`: thêm `glossary?: Glossary;`
- `transform`: thêm `glossary: (x.glossary as Glossary) ?? {},`

- [ ] **Step 2: Biên dịch** — `cd fe && npx tsc --noEmit` → 0 lỗi.

- [ ] **Step 3: Commit**
```bash
git add fe/src/services/linhVucService.ts
git commit -m "feat(linh-vuc): FE type glossary cho LinhVuc"
```

---

### Task 4: FE — đổi nguồn nhãn Nganh→LinhVuc (AuthContext + consumers)

**Files:**
- Modify: `fe/src/contexts/AuthContext.tsx`
- Modify: `fe/src/contexts/TermContext.tsx`
- Modify: `fe/src/components/glossary/useTableTitleConfig.tsx`
- Modify: `fe/src/components/glossary/useFieldLabels.tsx`
- Modify: `fe/src/components/glossary/TableTitleSettings.tsx`

**Interfaces:**
- Produces trên `useAuth()`: `currentLinhVuc: LinhVuc | null`, `applyLinhVucGlossary(glossary: Glossary): void`.
- Gỡ: `currentNganh`, `refreshNganh`, `applyNganhGlossary`, `nganhList`, import `nganhService`.

- [ ] **Step 1: AuthContext — thêm currentLinhVuc + applyLinhVucGlossary, gỡ nganh**

Trong `AuthContext.tsx`:
- Gỡ: dòng `import { nganhService, type Nganh } ...`; state `nganhList`; `refreshNganh`; `currentNganh`; `applyNganhGlossary`; mọi lời gọi `await refreshNganh();` (3 chỗ ~143/202/269) và `refreshNganh` trong dependency arrays (~221/274); 3 dòng trong `interface AuthContextType` (currentNganh/refreshNganh/applyNganhGlossary); 3 dòng trong object `value`.
- Thêm dẫn xuất (cạnh `availableModules`):
```ts
const LINH_VUC_DEFAULT = 'KE_TOAN';
const currentLinhVucCode = currentTenant?.modules?.[0] ?? LINH_VUC_DEFAULT;
const currentLinhVuc = allModules.find((m) => m.code === currentLinhVucCode) ?? null;
```
- Thêm callback (cạnh `applyGlossary`):
```ts
const applyLinhVucGlossary = useCallback(
  (glossary: import('@/types/tenant').Glossary) => {
    setAllModules((prev) =>
      prev.map((m) => (m.code === currentLinhVucCode ? { ...m, glossary } : m)),
    );
  },
  [currentLinhVucCode],
);
```
- `interface AuthContextType` thêm:
```ts
  currentLinhVuc: LinhVuc | null;
  applyLinhVucGlossary: (glossary: import('@/types/tenant').Glossary) => void;
```
- Object `value` thêm: `currentLinhVuc, applyLinhVucGlossary,`.
(`LinhVuc` type đã import sẵn từ linhVucService ở đầu file.)

- [ ] **Step 2: TermContext — dùng currentLinhVuc**
```tsx
export const TermProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant, currentLinhVuc } = useAuth();
  const tenantGlossary = currentTenant?.glossary;
  const linhVucGlossary = currentLinhVuc?.glossary;
  const t = useCallback(
    (key: string, surface?: string) =>
      resolveTerm(tenantGlossary, linhVucGlossary, TERM_REGISTRY, key, surface),
    [tenantGlossary, linhVucGlossary],
  );
  return <TermContext.Provider value={{ t }}>{children}</TermContext.Provider>;
};
```

- [ ] **Step 3: useTableTitleConfig — đọc currentLinhVuc**

Trong `useTableTitleConfig.tsx`: đổi `const { currentTenant, currentNganh } = useAuth();` → `const { currentTenant, currentLinhVuc } = useAuth();` và `const nganhG = currentNganh?.glossary;` → `const nganhG = currentLinhVuc?.glossary;` (giữ tên biến `nganhG` hoặc đổi `linhVucG` — chỉ là biến cục bộ truyền vào `lookupOverride`).

- [ ] **Step 4: useFieldLabels — đọc currentLinhVuc**

Trong `useFieldLabels.tsx`: đổi `const { currentTenant, currentNganh } = useAuth();` → `... currentLinhVuc ...`; `const nganhG = currentNganh?.glossary;` → `const nganhG = currentLinhVuc?.glossary;`.

- [ ] **Step 5: TableTitleSettings — lưu vào LinhVuc**

Trong `TableTitleSettings.tsx`:
- Đổi import service: `import { nganhService } from '@/services/nganhService';` → `import { linhVucService } from '@/services/linhVucService';`
- `useAuth()` lấy: `user, currentTenant, currentLinhVuc, applyGlossary, applyLinhVucGlossary`.
- `const canNganh = !!user?.isSuperAdmin && !!currentNganh;` → `const canLinhVuc = !!user?.isSuperAdmin && !!currentLinhVuc;` (đổi mọi `canNganh`→`canLinhVuc`).
- Nhãn radio "Cả lĩnh vực": dùng `currentLinhVuc?.name`. `target='nganh'` đổi tên thành `'linhVuc'` (hoặc giữ `'nganh'` như string nội bộ — miễn nhánh save đúng).
- `lookupOverride` seed: đổi `currentNganh?.glossary` → `currentLinhVuc?.glossary`.
- Nhánh save target lĩnh vực:
```ts
if (target === 'linhVuc' && currentLinhVuc) {
  const next = buildTitleGlossary(currentLinhVuc.glossary, terms, values, defaultsMap);
  const res = await linhVucService.update(currentLinhVuc.id, { glossary: next });
  applyLinhVucGlossary(res.glossary);
} else { /* tenant như cũ */ }
```
> `buildSaveOptions`/`saveTarget` đã bị xoá ở đợt trước (drawer dùng radio nội bộ nganh/tenant). Giữ logic radio hiện có của TableTitleSettings, chỉ đổi nhãn/đích.

- [ ] **Step 6: Biên dịch + test + lint hooks**

Run:
```bash
cd fe && npx tsc --noEmit && npx vitest run && \
  npx eslint "src/**/*.tsx" --rule '{"react-hooks/rules-of-hooks":"error"}' --quiet
```
Expected: 0 lỗi TS; test PASS; 0 lỗi hook. (Không còn import `nganhService`/`currentNganh` ở đâu: `grep -rn "currentNganh\|nganhService\|applyNganhGlossary" fe/src` → rỗng.)

- [ ] **Step 7: Commit**
```bash
git add fe/src/contexts/AuthContext.tsx fe/src/contexts/TermContext.tsx fe/src/components/glossary/useTableTitleConfig.tsx fe/src/components/glossary/useFieldLabels.tsx fe/src/components/glossary/TableTitleSettings.tsx
git commit -m "feat(term): đọc/ghi nhãn từ Lĩnh vực (LinhVuc) thay cho Ngành"
```

---

### Task 5: FE — trang Công ty: chọn 1 lĩnh vực, bỏ ô "Ngành"

**Files:**
- Modify: `fe/src/pages/cau-hinh/tenant/TenantPage.tsx`

**Interfaces:** Form tenant lưu `modules: [code]` (đơn) từ ô chọn lĩnh vực; bỏ field `nganh`.

- [ ] **Step 1: Sửa form**

Trong `TenantPage.tsx`:
- Bỏ ô `Form.Item name="nganh"` (Select ngành, ~dòng 408-415) và `nganhList`/`nganhService.getAll()` (dòng 28/62) + `nganh` trong giá trị submit (dòng 90/124).
- Ô **Lĩnh vực** = chọn 1 (single) trong `allModules` (từ `useAuth().allModules`), lưu `modules: [value]`. Nếu form đang có Select `modules` multiple → đổi `mode` bỏ `multiple`, value là 1 code, submit `modules: [formValues.linhVuc]`. (Đọc file để khớp tên field hiện tại; giữ nhãn "Lĩnh vực".)

- [ ] **Step 2: Biên dịch + lint hooks** — `cd fe && npx tsc --noEmit && npx eslint src/pages/cau-hinh/tenant/TenantPage.tsx --rule '{"react-hooks/rules-of-hooks":"error"}' --quiet` → 0 lỗi.

- [ ] **Step 3: Commit**
```bash
git add fe/src/pages/cau-hinh/tenant/TenantPage.tsx
git commit -m "feat(tenant): chọn 1 lĩnh vực (quyết định menu+nhãn), bỏ ô Ngành"
```

---

### Migration (chạy khi deploy, 1 lần — không phải task code)

Sau khi deploy BE (đã có cột `glossary`), copy glossary Ngành→LinhVuc theo code (idempotent):
```bash
ssh kt "docker exec mongo mongosh 'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet --eval '
db.nganh.find({}).forEach(function(n){
  var lv = db.linh_vuc.findOne({code: n.code});
  if (lv && (!lv.glossary || Object.keys(lv.glossary).length===0) && n.glossary && Object.keys(n.glossary).length>0) {
    db.linh_vuc.updateOne({_id: lv._id}, {\$set: {glossary: n.glossary}});
    print(\"migrated \"+n.code);
  }
});
print(\"done\");'"
```
Đảm bảo các `linh_vuc` khác có `glossary` mặc định `{}` (TypeORM default khi đọc/save; nếu doc cũ thiếu field, set `{}`):
```bash
ssh kt "docker exec mongo mongosh '...' --quiet --eval 'db.linh_vuc.updateMany({glossary:{\$exists:false}},{\$set:{glossary:{}}}); print(\"backfill done\")'"
```

---

## Self-Review
- LinhVuc.glossary (entity/dto/service) → T1. ✓
- Ngừng clone từ Nganh → T2. ✓
- FE service glossary → T3. ✓
- Đổi nguồn đọc/ghi nhãn Nganh→LinhVuc (AuthContext + TermContext + 3 consumer) → T4. ✓
- Công ty chọn 1 lĩnh vực, bỏ Ngành → T5. ✓
- Di trú glossary Nganh→LinhVuc → mục Migration. ✓
- Menu không đổi; resolve order giữ; PUT /linh-vuc SuperAdmin → Global Constraints. ✓
- Type consistency: `currentLinhVuc`/`applyLinhVucGlossary` (T4) khớp consumer; `LinhVuc.glossary` (T3) khớp T4; BE glossary (T1) khớp PUT trong T4. ✓
- Placeholder: T1 Step 3 & T5 Step 1 nêu "đọc file để khớp khung hiện có" vì spec/form có biến thể — kèm tiêu chí rõ ràng, không phải TODO mơ hồ.
