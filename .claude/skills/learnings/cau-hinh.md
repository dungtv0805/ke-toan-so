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

## Important Notes

- Permission page manages per-role permissions for the current tenant
- Vai tro (Roles) are tenant-scoped
- Thanh vien (Members) shows users in current tenant
- Tenant page requires SuperAdmin role for most operations
- /cau-hinh/thanh-vien uses config-service but /cau-hinh/tenant uses master-data-service
