# Fix Hệ Thống Phân Quyền - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sửa toàn bộ lỗi hệ thống phân quyền: FE không hiển thị đúng quyền user, BE không load permissions vào JWT, và đồng bộ permission mapping giữa FE/BE.

**Architecture:** Hiện tại hệ thống có 2 nguồn permission tách rời: FE hardcode `quyenHanTheoVaiTro` trong `AuthContext.tsx` (dùng cho `hasPermission()`), và BE có entity `PhanQuyen` + service nhưng KHÔNG BAO GIỜ load permissions vào JWT token (luôn trả `permissions: []`). Ngoài ra, trang quản lý phân quyền hiển thị quyền từ mock-data (`quyenHanTheoVaiTro` trong `mock-data/nguoi-dung.ts`) — đây là danh sách mô tả tiếng Việt, KHÔNG phải permission keys thực tế. Cột "Quyền hạn" trong table dùng `record.vaiTro` nhưng NguoiDung type KHÔNG có field `vaiTro` — BE trả `tenantRole` và FE `transformUser` không map field này.

**Tech Stack:** NestJS (BE), React + TypeScript + CHanlder pattern (FE), MongoDB, JWT

---

## Tổng quan các lỗi phát hiện

### Lỗi nghiêm trọng (Critical)

1. **JWT permissions luôn rỗng** — `auth-service.service.ts` lines 224, 332, 581 đều set `permissions: []` với TODO comment. `PermissionGuard` sẽ LUÔN block nếu được dùng.

2. **FE NguoiDung type thiếu field `vaiTro`** — Type `NguoiDung` (`fe/src/types/index.ts:576`) không có field `vaiTro`, nhưng columns table (`columns.tsx:57,73,97`) dùng `record.vaiTro`. BE trả `tenantRole` nhưng `transformUser` (`nguoiDungService.ts:29`) không map field này → cột "Vai trò" và "Quyền hạn" hiển thị `undefined`.

3. **2 bộ permission data không liên quan nhau:**
   - `AuthContext.tsx` line 7-42: `quyenHanTheoVaiTro` = permission keys kỹ thuật (`xem_so_cai`, `tao_phieu_thu`...)
   - `mock-data/nguoi-dung.ts` line 72-125: `quyenHanTheoVaiTro` = mô tả tiếng Việt (`Quản lý người dùng`, `Tạo phiếu thu/chi`...)
   - Cùng tên export nhưng khác nội dung hoàn toàn → gây nhầm lẫn

### Lỗi trung bình (Medium)

4. **`PermissionGuard` không được dùng ở bất kỳ controller nào** — Tất cả controllers chỉ dùng `@UseGuards(JwtGuard, RoleGuard)` + `@Roles()`. `@Permissions()` decorator tồn tại nhưng không ai dùng.

5. **FE permission check chỉ dựa trên hardcode** — `hasPermission()` trong `AuthContext.tsx:236` lookup từ hardcoded map, không từ BE. Nếu admin thay đổi quyền trong DB, FE không biết.

6. **Route permissions dùng role-based, không permission-based** — `routePermissions.ts` map route → VaiTro[], không dùng permission keys.

### Lỗi nhẹ (Low)

7. **Super admin hardcode email** — `SUPER_ADMIN_EMAIL` constant, không flexible.

8. **Permission thay đổi chỉ có hiệu lực sau re-login** — Không có cơ chế refresh token khi role/permission thay đổi.

---

## Phase 1: Fix Critical — FE hiển thị đúng quyền user

### Task 1: Fix NguoiDung type và transformUser mapping

**Files:**
- Modify: `fe/src/types/index.ts:576-584`
- Modify: `fe/src/services/nguoiDungService.ts:29-37`

**Step 1: Thêm field `vaiTro` vào NguoiDung type**

```typescript
// fe/src/types/index.ts:576
export interface NguoiDung {
  id: string;
  hoTen: string;
  email: string;
  vaiTro: VaiTro;              // <-- THÊM: role trong tenant hiện tại
  isSuperAdmin?: boolean;
  tenants: import('./tenant').UserTenant[];
  trangThai: 'HOAT_DONG' | 'KHOA';
  isActive: boolean;
}
```

**Step 2: Fix transformUser để map `tenantRole` → `vaiTro`**

```typescript
// fe/src/services/nguoiDungService.ts:29
const transformUser = (user: Record<string, unknown>): NguoiDung => ({
  id: (user._id as string) || (user.id as string),
  hoTen: user.hoTen as string,
  email: user.email as string,
  vaiTro: (user.tenantRole as VaiTro) || (user.vaiTro as VaiTro),  // <-- FIX: map tenantRole
  isSuperAdmin: (user.isSuperAdmin as boolean) || false,
  tenants: (user.tenants as NguoiDung['tenants']) || [],
  trangThai: user.trangThai as 'HOAT_DONG' | 'KHOA',
  isActive: user.isActive as boolean,
});
```

**Step 3: Verify — chạy FE dev server, mở trang `/cau-hinh/phan-quyen`**

Kiểm tra:
- Cột "Vai trò" hiển thị tag đúng (ADMIN, KE_TOAN_TRUONG, etc.)
- Cột "Quyền hạn" hiển thị số quyền và tooltip list quyền
- Không còn `undefined` ở bất kỳ cột nào

**Step 4: Commit**

```bash
git add fe/src/types/index.ts fe/src/services/nguoiDungService.ts
git commit -m "[phan-quyen] fix NguoiDung type thiếu vaiTro, map tenantRole từ BE response"
```

---

### Task 2: Thống nhất permission data — xóa duplicate `quyenHanTheoVaiTro`

**Files:**
- Modify: `fe/src/mock-data/nguoi-dung.ts:72-125` — rename export
- Modify: `fe/src/pages/cau-hinh/phan-quyen/components/table/columns.tsx:13,97`
- Modify: `fe/src/pages/cau-hinh/phan-quyen/components/role-reference/RoleReferenceCard.tsx:3,25`
- Modify: `fe/src/services/nguoiDungService.ts:3,131-132`

**Vấn đề:** Có 2 export cùng tên `quyenHanTheoVaiTro`:
- `AuthContext.tsx`: permission keys kỹ thuật → dùng cho `hasPermission()` logic
- `mock-data/nguoi-dung.ts`: mô tả tiếng Việt → dùng cho UI hiển thị

Cả hai đều cần tồn tại nhưng phải có tên khác nhau để tránh nhầm lẫn.

**Step 1: Rename export trong mock-data**

```typescript
// fe/src/mock-data/nguoi-dung.ts:72
// Rename: quyenHanTheoVaiTro → moTaQuyenTheoVaiTro
export const moTaQuyenTheoVaiTro: Record<VaiTro, string[]> = {
  ADMIN: [
    'Quản lý người dùng',
    // ... giữ nguyên nội dung
  ],
  // ...
};
```

**Step 2: Update tất cả imports dùng `quyenHanTheoVaiTro` từ mock-data**

Các file cần update import:
- `columns.tsx:13` → `import { vaiTroOptions, moTaQuyenTheoVaiTro } from "@/mock-data/nguoi-dung";`
- `columns.tsx:97` → `const quyenHan = moTaQuyenTheoVaiTro[record.vaiTro] || [];`
- `RoleReferenceCard.tsx:3` → `import { vaiTroOptions, moTaQuyenTheoVaiTro } from "@/mock-data/nguoi-dung";`
- `RoleReferenceCard.tsx:25` → `dataSource={moTaQuyenTheoVaiTro[vt.value]}`
- `nguoiDungService.ts:3` → `import { vaiTroOptions, moTaQuyenTheoVaiTro } from '@/mock-data/nguoi-dung';`
- `nguoiDungService.ts:132` → `return moTaQuyenTheoVaiTro[vaiTro] || [];`

**Step 3: Verify — build FE, kiểm tra không có import errors**

```bash
cd fe && npm run build
```

**Step 4: Commit**

```bash
git add fe/src/mock-data/nguoi-dung.ts fe/src/pages/cau-hinh/phan-quyen/components/table/columns.tsx fe/src/pages/cau-hinh/phan-quyen/components/role-reference/RoleReferenceCard.tsx fe/src/services/nguoiDungService.ts
git commit -m "[phan-quyen] rename moTaQuyenTheoVaiTro để phân biệt với permission keys trong AuthContext"
```

---

## Phase 2: Fix Critical — BE load permissions vào JWT

### Task 3: Load permissions từ PhanQuyen entity vào JWT token

**Files:**
- Modify: `be/apps/auth-service/src/auth-service.service.ts` — lines 224, 332, 581
- Modify: `be/apps/auth-service/src/auth-service.module.ts` — import PhanQuyen_Service

**Vấn đề:** 3 chỗ tạo JWT payload đều set `permissions: []`. Cần inject `PhanQuyen_Service` từ config-service hoặc tạo local service để query permissions theo vaiTro.

**Lưu ý kiến trúc:** auth-service và config-service là 2 microservices riêng biệt. auth-service KHÔNG thể trực tiếp inject `PhanQuyen_Service` từ config-service. Có 2 cách:
- **Option A:** Dùng `@app/service-client` để gọi HTTP đến config-service API `/phan-quyen/vai-tro/:vaiTro/permissions`
- **Option B:** Import `PhanQuyen` entity trực tiếp trong auth-service và tạo local repository query

**Khuyến nghị: Option B** — đơn giản hơn, không phụ thuộc config-service phải running, và permissions data nhỏ.

**Step 1: Import PhanQuyen entity trong auth-service module**

```typescript
// be/apps/auth-service/src/auth-service.module.ts
// Thêm PhanQuyen vào TypeOrmModule.forFeature([...])
import { PhanQuyen } from '@app/entities';

@Module({
  imports: [
    // ... existing imports
    TypeOrmModule.forFeature([User, UserCredential, UserTenant, Tenant, PhanQuyen]),
  ],
  // ...
})
```

**Step 2: Inject PhanQuyen repository trong auth-service.service.ts**

```typescript
// be/apps/auth-service/src/auth-service.service.ts — constructor
@InjectRepository(PhanQuyen)
private readonly phanQuyenRepo: Repository<PhanQuyen>,
```

**Step 3: Tạo helper method loadPermissions**

```typescript
// be/apps/auth-service/src/auth-service.service.ts
private async loadPermissions(vaiTro: string): Promise<string[]> {
  const phanQuyen = await this.phanQuyenRepo.findOne({ where: { vaiTro, isActive: true } });
  return phanQuyen?.permissions || [];
}
```

**Step 4: Replace `permissions: []` tại 3 chỗ**

```typescript
// Line ~224 (login - single tenant)
permissions: await this.loadPermissions(tenantInfo.role),

// Line ~332 (selectTenant)
permissions: await this.loadPermissions(tenantInfo.role),

// Line ~581 (switchTenant)
permissions: await this.loadPermissions(tenantInfo.role),
```

**Cũng cần fix các chỗ super admin đã hardcode `permissions: ['*']`** — lines 132, 158, 299, 549. Giữ nguyên `['*']` cho super admin là đúng.

**Step 5: Verify — chạy auth-service, login với user thường, decode JWT token**

```bash
cd be && yarn start:auth:dev
# Login và kiểm tra JWT payload có permissions array không rỗng
```

**Step 6: Commit**

```bash
git add be/apps/auth-service/src/auth-service.module.ts be/apps/auth-service/src/auth-service.service.ts
git commit -m "[phan-quyen] load permissions từ PhanQuyen entity vào JWT token thay vì hardcode []"
```

---

### Task 4: Seed default permissions data cho các vai trò

**Files:**
- Kiểm tra: `be/` seed scripts
- Có thể cần tạo: seed data cho collection `phan_quyen`

**Vấn đề:** Nếu collection `phan_quyen` trong MongoDB rỗng, `loadPermissions()` sẽ trả `[]` giống như trước. Cần đảm bảo có data.

**Step 1: Kiểm tra seed hiện tại có seed phan_quyen không**

```bash
grep -rn "phan_quyen\|PhanQuyen" be/seeds/ be/src/seeds/ be/libs/ --include="*.seed.*" --include="*seed*"
```

**Step 2: Tạo seed data nếu chưa có**

Permission keys phải khớp với `quyenHanTheoVaiTro` trong `AuthContext.tsx`:

```typescript
const defaultPermissions = [
  {
    vaiTro: 'ADMIN',
    ten: 'Quản trị viên',
    moTa: 'Toàn quyền quản lý hệ thống',
    permissions: ['*'],
    isActive: true,
  },
  {
    vaiTro: 'GIAM_DOC',
    ten: 'Giám đốc',
    moTa: 'Phê duyệt, xem báo cáo tổng quan',
    permissions: ['*'],
    isActive: true,
  },
  {
    vaiTro: 'KE_TOAN_TRUONG',
    ten: 'Kế toán trưởng',
    moTa: 'Quản lý kế toán, phê duyệt chứng từ',
    permissions: [
      'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
      'quan_ly_tai_khoan', 'quan_ly_danh_muc',
      'xem_phieu_thu', 'xem_phieu_chi',
      'xem_cong_no', 'xem_so_quy', 'duyet_phieu',
    ],
    isActive: true,
  },
  {
    vaiTro: 'KE_TOAN_TONG_HOP',
    ten: 'Kế toán tổng hợp',
    moTa: 'Lập báo cáo, tổng hợp số liệu',
    permissions: [
      'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
      'quan_ly_tai_khoan', 'quan_ly_danh_muc',
      'xem_phieu_thu', 'xem_phieu_chi',
      'xem_cong_no', 'xem_so_quy',
    ],
    isActive: true,
  },
  {
    vaiTro: 'KE_TOAN_QUY',
    ten: 'Kế toán quỹ',
    moTa: 'Quản lý thu chi, sổ quỹ',
    permissions: [
      'xem_so_quy', 'tao_phieu_thu', 'tao_phieu_chi',
      'xem_phieu_thu', 'xem_phieu_chi', 'sua_phieu',
      'xem_danh_muc',
    ],
    isActive: true,
  },
  {
    vaiTro: 'KE_TOAN_CONG_NO',
    ten: 'Kế toán công nợ',
    moTa: 'Quản lý công nợ phải thu/trả',
    permissions: [
      'xem_cong_no', 'quan_ly_cong_no',
      'xem_phai_thu', 'xem_phai_tra',
      'xem_danh_muc', 'xem_doi_tuong',
    ],
    isActive: true,
  },
  {
    vaiTro: 'MANAGER',
    ten: 'Quản lý',
    moTa: 'Phê duyệt chứng từ, xem báo cáo',
    permissions: [
      'duyet_phieu', 'xem_bao_cao', 'xem_tong_quan',
      'xem_phieu_thu', 'xem_phieu_chi',
      'xem_cong_no', 'xem_so_quy', 'xem_so_cai',
    ],
    isActive: true,
  },
  {
    vaiTro: 'KIEM_SOAT',
    ten: 'Kiểm soát',
    moTa: 'Kiểm tra, đối chiếu số liệu',
    permissions: [
      'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
      'xem_phieu_thu', 'xem_phieu_chi',
      'xem_cong_no', 'xem_so_quy', 'xem_danh_muc',
    ],
    isActive: true,
  },
];
```

**Step 3: Chạy seed**

```bash
cd be && yarn seed
```

**Step 4: Commit**

```bash
git add be/
git commit -m "[phan-quyen] seed default permissions data cho tất cả vai trò"
```

---

## Phase 3: Đồng bộ FE permission check với BE

### Task 5: FE hasPermission() fallback — dùng BE permissions nếu có, fallback hardcode

**Files:**
- Modify: `fe/src/contexts/AuthContext.tsx:236-246`
- Modify: `fe/src/services/authService.ts` — thêm API lấy permissions

**Vấn đề:** Hiện tại `hasPermission()` chỉ dùng hardcoded map. Sau khi BE đã load permissions vào JWT, FE nên ưu tiên dùng permissions từ BE (qua `/auth/me` response hoặc decode JWT).

**Step 1: Kiểm tra authService.getMe() response có trả permissions không**

Xem BE `/auth/me` endpoint trả gì. Nếu đã trả `permissions` từ JWT payload → FE có thể dùng.

**Step 2: Lưu permissions vào AuthContext state**

```typescript
// fe/src/contexts/AuthContext.tsx
const [userPermissions, setUserPermissions] = useState<string[]>([]);

// Trong initAuth và login success:
// Nếu response có permissions → setUserPermissions(response.permissions)
```

**Step 3: Update hasPermission() — ưu tiên BE permissions**

```typescript
const hasPermission = useCallback((permission: string) => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (!currentTenant) return false;

  // Ưu tiên permissions từ BE (loaded from JWT/API)
  if (userPermissions.length > 0) {
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(permission);
  }

  // Fallback: hardcoded map (backward compatibility)
  const role = currentTenant.role as VaiTro;
  const permissions = quyenHanTheoVaiTro[role] || [];
  if (permissions.includes('*')) return true;
  return permissions.includes(permission);
}, [user, currentTenant, userPermissions]);
```

**Step 4: Verify — login với KE_TOAN_QUY, kiểm tra chỉ thấy menu/route được phép**

**Step 5: Commit**

```bash
git add fe/src/contexts/AuthContext.tsx fe/src/services/authService.ts
git commit -m "[phan-quyen] FE hasPermission() ưu tiên permissions từ BE, fallback hardcode"
```

---

### Task 6: Trang phân quyền hiển thị permissions thực tế từ BE

**Files:**
- Modify: `fe/src/pages/cau-hinh/phan-quyen/components/table/columns.tsx:93-116`
- Có thể cần: tạo FE service gọi BE `/phan-quyen/vai-tro/:vaiTro/permissions`

**Vấn đề:** Cột "Quyền hạn" hiện dùng `moTaQuyenTheoVaiTro` (mô tả tiếng Việt từ mock-data). Nên hiển thị cả mô tả tiếng Việt VÀ permission keys thực tế để admin biết chính xác user có quyền gì.

**Step 1: Giữ nguyên hiển thị mô tả tiếng Việt trong tooltip** (user-friendly)

**Step 2: Thêm badge hiển thị số permission keys thực tế**

Dùng `quyenHanTheoVaiTro` từ `AuthContext.tsx` (permission keys) để hiển thị số lượng quyền kỹ thuật bên cạnh mô tả.

**Step 3: Verify — mở trang phân quyền, kiểm tra tooltip hiển thị đúng**

**Step 4: Commit**

```bash
git add fe/src/pages/cau-hinh/phan-quyen/
git commit -m "[phan-quyen] hiển thị permissions thực tế trong trang quản lý phân quyền"
```

---

## Phase 4: Cleanup & Hardening

### Task 7: Xóa hardcoded permission map khỏi FE (optional — sau khi BE ổn định)

**Quyết định:** Giữ `quyenHanTheoVaiTro` trong `AuthContext.tsx` làm fallback cho đến khi BE permission system được verify hoàn toàn trên production. Đánh dấu `// DEPRECATED: Remove after BE permissions verified in production` để cleanup sau.

### Task 8: Thêm API endpoint cho FE lấy permissions theo role hiện tại

**Files:**
- Modify: `be/apps/auth-service/src/auth-service.controller.ts` — thêm GET `/auth/my-permissions`
- Modify: `fe/src/services/authService.ts` — thêm `getMyPermissions()`

**Mục đích:** Cho phép FE refresh permissions mà không cần re-login. Hữu ích khi admin thay đổi quyền cho user đang online.

---

## Tóm tắt thứ tự thực hiện

| Phase | Task | Mức độ | Ước lượng |
|-------|------|--------|-----------|
| 1 | Task 1: Fix NguoiDung type + transformUser | Critical | 10 phút |
| 1 | Task 2: Rename duplicate quyenHanTheoVaiTro | Critical | 15 phút |
| 2 | Task 3: BE load permissions vào JWT | Critical | 20 phút |
| 2 | Task 4: Seed default permissions | Critical | 15 phút |
| 3 | Task 5: FE hasPermission() dùng BE data | Medium | 20 phút |
| 3 | Task 6: Trang phân quyền hiển thị đúng | Medium | 15 phút |
| 4 | Task 7-8: Cleanup & API mới | Low | 30 phút |

**Tổng ước lượng: ~2 giờ**
