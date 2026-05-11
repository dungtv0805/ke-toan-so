# Cau Hinh (Configuration) — Page Facts

## Page → API Flow

### /cau-hinh/phan-quyen (Permissions)
- **FE API:** `GET /api/config/phan-quyen/vai-tro/:vaiTro/permissions`
- **Gateway:** strips `/config` → forwards to port 3007
- **Controller:** `PhanQuyenController` at `config-service/src/phan-quyen/phan-quyen.controller.ts`
- **Service:** `PhanQuyenService`
- **Verified:** NO

### /cau-hinh/vai-tro (Roles)
- **FE API:** `GET /api/config/vai-tro`
- **Controller:** `VaiTroController` at `config-service/src/vai-tro/vai-tro.controller.ts`
- **Service:** `VaiTroService`
- **Verified:** NO

### /cau-hinh/thanh-vien (Members/Users)
- **FE API:** `GET /api/config/nguoi-dung`
- **Controller:** `NguoiDungController` at `config-service/src/nguoi-dung/nguoi-dung.controller.ts`
- **Service:** `NguoiDungService`
- **Key endpoints:** /stats, /available-users, /add-existing, /:id/toggle-status
- **Verified:** NO

### /cau-hinh/tenant (Tenant Management)
- **NOTE:** This is on master-data-service (3002), NOT config-service!
- **FE API:** `GET /api/master-data/tenants`
- **Controller:** `TenantController` at `master-data-service/src/tenant/tenant.controller.ts`
- **Service:** `TenantService`
- **Key endpoints:** /users, /:id/members
- **Verified:** NO

## Permission System Architecture

### [2026-05-12] Phân quyền cũ vs mới (VERIFIED)

#### Phân quyền cũ (RoleGuard) — DEAD CODE
- **File:** `be/libs/auth/src/guards/role.guard.ts`
- **Behavior:** `canActivate()` luôn return `true` — không enforce gì cả
- **Decorator:** `@Roles('ADMIN', 'KE_TOAN_TRUONG', ...)` tồn tại ở controllers nhưng vô nghĩa
- **Status:** Dead code, chỉ còn mang tính documentation

#### Phân quyền mới (PermissionGuard) — CHỈ CÓ Ý NGHĨA Ở FE
- **File:** `be/libs/auth/src/guards/permission.guard.ts`
- **Behavior:** Checks `user.permissions` từ JWT against `@Permissions()` decorator
- **NHƯNG:** `@Permissions()` decorator **KHÔNG được sử dụng ở bất kỳ controller nào**
- **NHƯNG:** `PermissionGuard` **KHÔNG được inject vào bất kỳ module nào**
- **Kết luận:** BE permission enforcement = 0%. Tất cả access control chỉ ở FE

#### FE Permission Flow
1. Login → auth-service loads permissions từ `PhanQuyen` entity theo role
2. Permissions embedded vào JWT token
3. FE extract permissions từ JWT → store trong `AuthContext.userPermissions`
4. `hasPermission(key)` check: super admin → `*` wildcard → specific permission
5. `usePagePermission(moduleKey)` returns `{ canView, canCreate, canEdit, canDelete, canExport }`
6. Permission format: `/{module}:{action}` (e.g., `/danh-muc/tai-khoan:xem`)

#### FE Enforcement Points
- **Sidebar:** `MainLayout.tsx` — ẩn menu items nếu không có quyền `xem`
- **Route:** `ProtectedRoute.tsx` + `routePermissions.ts` — redirect nếu không có quyền
- **Page actions:** `usePagePermission()` hook — disable/hide buttons CRUD

#### Quản lý phân quyền
- **Page:** `/cau-hinh/phan-quyen`
- **API:** `PUT /api/config/phan-quyen/vai-tro/:vaiTro/permissions`
- **Effect:** Thay đổi permissions → user cần re-login để JWT mới có permissions mới

#### Key Commit
- `cfdc513` (2026-04-23) — "fix hệ thống phân quyền: load permissions từ DB, fix hiển thị quyền user"
- Seeded default permissions cho 8 roles: `be/scripts/seeds/phan-quyen.seed.js`

### Security Implication
- **Bất kỳ ai có valid JWT đều có thể gọi mọi API endpoint** — BE không chặn theo permission
- FE chỉ ẩn UI, không ngăn được direct API calls
- Nếu cần enforce BE: thêm `@Permissions()` decorator + register `PermissionGuard` vào module
- **Tuy nhiên:** Tenant isolation vẫn được enforce ở BE (xem `learnings/system.md` → Tenant Isolation)

## Important Notes

- Permission page manages per-role permissions for the current tenant
- Vai tro (Roles) are tenant-scoped
- Thanh vien (Members) shows users in current tenant
- Tenant page requires SuperAdmin role for most operations
- /cau-hinh/thanh-vien uses config-service but /cau-hinh/tenant uses master-data-service
