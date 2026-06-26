# Phần 1 — Gộp menu nhiều phân hệ (bỏ "Đổi lĩnh vực") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Công ty có nhiều phân hệ → sidebar hiển thị GỘP tất cả menu, nhóm theo phân hệ, bỏ hẳn bước chọn/đổi lĩnh vực.

**Architecture:** Thay 1 `selectedModule` (lưu localStorage) bằng việc lấy **hợp (union)** menuKeys của mọi phân hệ công ty được cấp; khu nghiệp vụ render 1 section/phân hệ. Gỡ `ModuleSelector` (màn bắt chọn) và `ModuleSwitchModal` ("Đổi lĩnh vực") cùng state liên quan trong `AuthContext`.

**Tech Stack:** React 18 + TypeScript + Vite, Ant Design, vitest (test FE), Tailwind.

## Global Constraints

- FE-only; **không sửa BE** (`ModuleGuard` đã kiểm tra `tenant.modules` đa giá trị).
- Giữ nguyên trang `/cau-hinh/linh-vuc` (cấu hình phân hệ ↔ menu).
- Giữ nguyên lọc menu **theo vai trò** (`filterMenuItems`/`canAccessRoute`) đè lên trên lọc phân hệ; SuperAdmin bỏ qua lọc vai trò.
- Menu COMMON (`isCommonKey`) luôn hiển thị.
- Menu chưa gán cho phân hệ nào → coi như thuộc `KE_TOAN` (giữ hành vi hiện tại).
- Sidebar khu nghiệp vụ: **mỗi phân hệ 1 nhóm header riêng** (tên phân hệ in hoa). ĐIỀU HÀNH và THƯ VIỆN giữ là 1 section, lọc theo union.
- Test FE chạy bằng `cd fe && npx vitest run <path>`; build kiểm tra type bằng `cd fe && npm run build`; lint bằng `cd fe && npm run lint`.

---

## File Structure

- `fe/src/config/modules.ts` — thêm helper thuần `unionMenuKeys`; (Task 3) gỡ `getStoredModule/setStoredModule/STORAGE_PREFIX`.
- `fe/src/config/modules.test.ts` — thêm test cho `unionMenuKeys`.
- `fe/src/components/layout/MainLayout.tsx` — đổi sang union + render section/phân hệ; gỡ gate `ModuleSelector`, item "Đổi lĩnh vực", `ModuleSwitchModal`, state `moduleModalOpen`.
- `fe/src/contexts/AuthContext.tsx` — (Task 3) gỡ `selectedModule`, `needsModuleSelection`, `setSelectedModule`, effect tự chọn, mọi gọi storage.
- `fe/src/components/auth/ModuleSelector.tsx`, `ModuleSwitchModal.tsx` — (Task 4) xoá.
- `fe/src/components/auth/index.ts` — (Task 4) gỡ 2 export.

Thứ tự task giữ **build luôn xanh** ở mỗi bước: helper → MainLayout (vẫn còn context cũ, chỉ thôi dùng) → dọn AuthContext/modules → xoá component thừa.

---

### Task 1: Helper thuần `unionMenuKeys`

**Files:**
- Modify: `fe/src/config/modules.ts`
- Test: `fe/src/config/modules.test.ts`

**Interfaces:**
- Produces: `unionMenuKeys(modules: { menuKeys: string[] }[]): string[]` — trả về danh sách menuKeys hợp nhất, **loại trùng**, giữ thứ tự xuất hiện đầu tiên.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `fe/src/config/modules.test.ts`:

```ts
import { unionMenuKeys } from './modules';

describe('unionMenuKeys', () => {
  it('gộp menuKeys nhiều phân hệ, loại trùng', () => {
    const result = unionMenuKeys([
      { menuKeys: ['/kho', '/chung-tu/phieu-nhap'] },
      { menuKeys: ['/chung-tu/phieu-nhap', '/bao-cao/ton-kho'] },
    ]);
    expect(result).toEqual(['/kho', '/chung-tu/phieu-nhap', '/bao-cao/ton-kho']);
  });

  it('danh sách rỗng → []', () => {
    expect(unionMenuKeys([])).toEqual([]);
  });

  it('phân hệ có menuKeys rỗng (vd KE_TOAN) → []', () => {
    expect(unionMenuKeys([{ menuKeys: [] }])).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/config/modules.test.ts`
Expected: FAIL — `unionMenuKeys is not a function` / không export.

- [ ] **Step 3: Cài đặt tối thiểu**

Thêm vào `fe/src/config/modules.ts` (sau `getAvailableModuleCodes`, trước phần STORAGE):

```ts
/** Hợp nhất menuKeys của nhiều phân hệ, loại trùng, giữ thứ tự xuất hiện đầu. */
export function unionMenuKeys(modules: { menuKeys: string[] }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of modules) {
    for (const k of m.menuKeys ?? []) {
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/config/modules.test.ts`
Expected: PASS (toàn bộ describe trong file).

- [ ] **Step 5: Commit**

```bash
git add fe/src/config/modules.ts fe/src/config/modules.test.ts
git commit -m "feat(menu): helper unionMenuKeys gộp menuKeys nhiều phân hệ"
```

---

### Task 2: MainLayout — lọc union + render section theo phân hệ + gỡ chọn/đổi lĩnh vực

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `unionMenuKeys` (Task 1); `filterByModule`, `filterMenuItems`, `isCommonKey`, `MENU_CATALOG`, `keToAnMenuItems`, `dieuHanhMenuItems`, `thuVienMenuItems` (đã có trong file); `availableModules`, `allModules`, `getModule` từ `useAuth()` (vẫn còn).
- Produces: sidebar gộp, không còn UI chọn/đổi lĩnh vực.

- [ ] **Step 1: Thêm import helper + type LinhVuc**

Sửa import `unionMenuKeys` vào dòng import từ `@/config/modules` (dòng có `isCommonKey`). Hiện tại MainLayout dùng `isCommonKey`/`MENU_CATALOG` — đảm bảo dòng import modules có thêm `unionMenuKeys`. Thêm import type:

```tsx
import type { LinhVuc } from "@/services/linhVucService";
```

- [ ] **Step 2: Thay khối tính filter (dòng ~399–427) bằng union + sections**

Thay nguyên khối từ `const selectedModuleDef = ...` đến `const moduleSectionTitle = ...` (gồm `selectedMenuKeys`, `isAssigned`, `unassignedKeys`, `effectiveKeys`, `applyFilters`, `filteredDieuHanhMenu`, `filteredKeToAnMenu`, `filteredThuVienMenu`, `moduleSectionTitle`) bằng:

```tsx
  // Phân hệ khả dụng (đã sắp theo order) — hiển thị GỘP, không cần chọn.
  const availableModuleDefs: LinhVuc[] = availableModules
    .map((code) => getModule(code))
    .filter((m): m is LinhVuc => !!m)
    .sort((a, b) => a.order - b.order);

  // Menu chưa gán cho phân hệ nào → coi như thuộc KE_TOAN.
  const isAssigned = (key: string): boolean =>
    allModules.some((m) =>
      m.menuKeys.some((k) => key === k || key.startsWith(k + "/")),
    );
  const unassignedKeys = availableModules.includes("KE_TOAN")
    ? MENU_CATALOG.map((e) => e.key).filter(
        (key) => !isCommonKey(key) && !isAssigned(key),
      )
    : [];

  // Union menuKeys mọi phân hệ + phần chưa gán → dùng cho ĐIỀU HÀNH & THƯ VIỆN.
  const allEffectiveKeys = [
    ...unionMenuKeys(availableModuleDefs),
    ...unassignedKeys,
  ];

  // Lọc theo vai trò (SuperAdmin bỏ qua).
  const byRole = (items: MenuItem[]): MenuItem[] =>
    isSuperAdmin ? items : filterMenuItems(items);

  const filteredDieuHanhMenu = byRole(
    filterByModule(dieuHanhMenuItems, allEffectiveKeys),
  );
  const filteredThuVienMenu = byRole(
    filterByModule(thuVienMenuItems, allEffectiveKeys),
  );

  // Khu nghiệp vụ: 1 section / phân hệ, tiêu đề = tên phân hệ.
  const moduleSections = availableModuleDefs
    .map((def) => {
      const keys =
        def.code === "KE_TOAN"
          ? [...def.menuKeys, ...unassignedKeys]
          : def.menuKeys;
      const items = byRole(filterByModule(keToAnMenuItems, keys));
      return { code: def.code, title: def.name.toUpperCase(), items };
    })
    .filter((s) => s.items.length > 0);
```

- [ ] **Step 3: Gỡ gate `needsModuleSelection` + import `ModuleSelector`/`ModuleSwitchModal` không dùng**

Xoá khối (dòng ~647–650):

```tsx
  // Tenant có >1 lĩnh vực mà chưa chọn → hiển thị màn Chọn lĩnh vực.
  if (needsModuleSelection) {
    return <ModuleSelector />;
  }
```

Trong destructure `useAuth()` (dòng ~342–353) bỏ `selectedModule`, `needsModuleSelection`, `setSelectedModule` (giữ `availableModules`, `allModules`, `getModule`). Sửa import dòng 72:

```tsx
// XÓA dòng: import { ModuleSelector, ModuleSwitchModal } from "@/components/auth";
```

- [ ] **Step 4: Gỡ item "Đổi lĩnh vực" + state `moduleModalOpen` + `ModuleSwitchModal`**

Trong `settingsMenuItems` (dòng ~512–518) xoá phần tử spread:

```tsx
    ...(allModules.filter((m) => m.isActive).length > 1 ? [{
      key: "doi-linh-vuc",
      icon: <AppstoreOutlined />,
      label: "Đổi lĩnh vực",
      onClick: () => setModuleModalOpen(true),
    }] : []),
```

Xoá state (dòng ~335): `const [moduleModalOpen, setModuleModalOpen] = useState(false);`

Xoá block `<ModuleSwitchModal ... />` (dòng ~880–892).

- [ ] **Step 5: Render section theo phân hệ (Mobile Drawer)**

Thay block "KẾ TOÁN Section" trong MobileDrawer (dòng ~613–627) bằng:

```tsx
      {/* Nghiệp vụ — 1 section / phân hệ */}
      {moduleSections.map((sec) => (
        <div className="sidebar-section" key={sec.code}>
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">{sec.title}</span>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={getOpenKeys()}
            items={sec.items}
            onClick={handleMenuClick}
            className="!bg-transparent border-r-0 sidebar-menu"
          />
        </div>
      ))}
```

- [ ] **Step 6: Render section theo phân hệ (Desktop Sider)**

Thay block "KẾ TOÁN Section" desktop (dòng ~730–746) bằng:

```tsx
            {/* Nghiệp vụ — 1 section / phân hệ */}
            {moduleSections.map((sec) => (
              <div className="sidebar-section" key={sec.code}>
                {!collapsed && (
                  <div className="sidebar-section-header">
                    <span className="sidebar-section-title">{sec.title}</span>
                  </div>
                )}
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={getSelectedKeys()}
                  defaultOpenKeys={collapsed ? [] : getOpenKeys()}
                  items={sec.items}
                  onClick={handleMenuClick}
                  className="!bg-transparent border-r-0 sidebar-menu"
                />
              </div>
            ))}
```

- [ ] **Step 7: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: build PASS (không lỗi type — đặc biệt không còn tham chiếu `selectedModule`, `needsModuleSelection`, `setSelectedModule`, `moduleModalOpen`, `ModuleSelector`, `ModuleSwitchModal`, `applyFilters`, `filteredKeToAnMenu`, `moduleSectionTitle`, `effectiveKeys`, `selectedMenuKeys`, `selectedModuleDef`). lint không lỗi mới.

Nếu lint báo `AppstoreOutlined` không dùng (do gỡ item Đổi lĩnh vực): kiểm tra còn chỗ khác dùng không; nếu không, xoá khỏi import icon.

- [ ] **Step 8: Kiểm thử tay nhanh**

Run: `cd fe && npm run dev` rồi mở app:
- Công ty nhiều phân hệ (vd modules = `['KE_TOAN','KHO']`): sidebar hiện đồng thời nhóm **KẾ TOÁN** và **KHO**, KHÔNG có màn bắt chọn lĩnh vực, gear KHÔNG còn "Đổi lĩnh vực".
- Công ty 1 phân hệ: hiện đúng 1 nhóm, chạy bình thường.
Expected: đúng như trên.

- [ ] **Step 9: Commit**

```bash
git add fe/src/components/layout/MainLayout.tsx
git commit -m "feat(menu): gộp menu mọi phân hệ, nhóm theo phân hệ, bỏ chọn/đổi lĩnh vực"
```

---

### Task 3: Dọn AuthContext + modules (gỡ machinery selectedModule)

**Files:**
- Modify: `fe/src/contexts/AuthContext.tsx`
- Modify: `fe/src/config/modules.ts`

**Interfaces:**
- Produces: `AuthContextType` không còn `selectedModule`, `needsModuleSelection`, `setSelectedModule` (giữ `availableModules`, `allModules`, `getModule`, `refreshModules`).

- [ ] **Step 1: Gỡ khỏi `AuthContextType` (dòng ~27–35)**

Xoá 4 dòng khai báo: `selectedModule`, `needsModuleSelection`, `setSelectedModule`, và comment liên quan. Giữ `allModules`, `availableModules`, `getModule`, `refreshModules`.

- [ ] **Step 2: Gỡ state + effect tự chọn + setter**

- Xoá `const [selectedModule, setSelectedModuleState] = useState<ModuleCode | null>(null);` (dòng ~58).
- Xoá khối `hasModuleChoice` (dòng ~94–95).
- Xoá nguyên `useEffect(() => { ... }, [currentTenant, user, allModules]);` tự chọn lĩnh vực (dòng ~100–120).
- Xoá `const needsModuleSelection = ...` (dòng ~122–123).
- Xoá `const setSelectedModule = useCallback(...)` (dòng ~125–128).

- [ ] **Step 3: Gỡ mọi gọi storage lĩnh vực**

- Sửa import (dòng 6): bỏ `getStoredModule, setStoredModule` và `type ModuleCode` nếu không còn dùng → còn `import { getAvailableModuleCodes } from '@/config/modules';`.
- Trong `login` (dòng ~197–198) xoá:
  ```tsx
        // Đăng nhập mới → quên lựa chọn lĩnh vực để hiện lại màn chọn.
        setStoredModule(response.tenant.tenantId, null);
  ```
- Trong `selectTenant` (dòng ~273–274) xoá:
  ```tsx
      // Chọn tenant (đăng nhập mới) → quên lựa chọn lĩnh vực để hiện lại màn chọn.
      setStoredModule(response.tenant.tenantId, null);
  ```

- [ ] **Step 4: Gỡ khỏi `value` của Provider (dòng ~366–370)**

Xoá `selectedModule,`, `needsModuleSelection,`, `setSelectedModule,` trong object truyền vào `AuthContext.Provider`.

- [ ] **Step 5: Gỡ storage helpers thừa trong modules.ts**

Xoá `STORAGE_PREFIX`, `getStoredModule`, `setStoredModule` (dòng ~71–79 trong `fe/src/config/modules.ts`). Giữ `getAvailableModuleCodes`, `unionMenuKeys`, `isCommonKey`, COMMON, icon helpers.

- [ ] **Step 6: Build + lint + test**

Run: `cd fe && npm run build && npm run lint && npx vitest run src/config/modules.test.ts`
Expected: build PASS (không còn tham chiếu `getStoredModule`/`setStoredModule`/`ModuleCode` mồ côi); test modules PASS.

- [ ] **Step 7: Commit**

```bash
git add fe/src/contexts/AuthContext.tsx fe/src/config/modules.ts
git commit -m "refactor(auth): bỏ selectedModule/needsModuleSelection và storage lĩnh vực"
```

---

### Task 4: Xoá component chọn/đổi lĩnh vực không còn dùng

**Files:**
- Delete: `fe/src/components/auth/ModuleSelector.tsx`
- Delete: `fe/src/components/auth/ModuleSwitchModal.tsx`
- Modify: `fe/src/components/auth/index.ts`

- [ ] **Step 1: Xác nhận không còn nơi dùng**

Run: `cd fe && grep -rn "ModuleSelector\|ModuleSwitchModal" src`
Expected: chỉ còn xuất hiện trong 2 file sắp xoá + `index.ts`. Nếu còn nơi khác → dừng, xử lý trước.

- [ ] **Step 2: Xoá file + export**

```bash
cd fe && rm src/components/auth/ModuleSelector.tsx src/components/auth/ModuleSwitchModal.tsx
```

Sửa `fe/src/components/auth/index.ts` còn:

```ts
export { TenantSelector } from './TenantSelector';
```

- [ ] **Step 3: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: PASS, không còn import gãy.

- [ ] **Step 4: Commit**

```bash
git add fe/src/components/auth/index.ts
git commit -m "chore(auth): xoá ModuleSelector & ModuleSwitchModal không còn dùng"
```

---

## Self-Review (đã rà soát)

- **Spec coverage:** Mục 3 (Phần 1) của spec — gộp union (Task 2), bỏ màn chọn + nút đổi (Task 2/3/4), nhóm theo phân hệ (Task 2 step 5–6), giữ trang linh-vuc & lọc vai trò (Global Constraints), BE không đổi (Global Constraints). ✓
- **Placeholder scan:** không có TBD/"xử lý sau"; mọi step có lệnh/đoạn code cụ thể. ✓
- **Type consistency:** `unionMenuKeys(modules: {menuKeys: string[]}[])` định nghĩa ở Task 1, dùng ở Task 2 step 2 đúng chữ ký; `availableModuleDefs: LinhVuc[]` khớp `getModule` trả `LinhVuc | undefined`. ✓
- **Build-green ordering:** Task 2 còn dùng context cũ (chỉ thôi tham chiếu các field bị bỏ ở Task 3); Task 3 mới gỡ field khỏi context sau khi MainLayout hết dùng → mỗi task build xanh. ✓
