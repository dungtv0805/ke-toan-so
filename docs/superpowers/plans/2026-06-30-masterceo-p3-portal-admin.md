# MasterCeo P3 — Portal Admin UI Implementation Plan

> Subagent-driven. Code ở 2 repo: **identity-service** (`feature/p3-portal-admin`) BE+FE, **ke-toan-so** (`feature/p3-lazy-provisioning`) lazy provisioning. Deploy tương tác cuối.

**Goal:** Quản trị dùng chung (Công ty/User/Membership/Entitlement) trong Portal (identity là nguồn); Kế toán tự provision config riêng (lazy). Spec: `docs/superpowers/specs/2026-06-30-masterceo-p3-portal-admin-design.md`.

**Stack:** identity-service NestJS11 + TypeORM(mongo) + mongodb-memory-server e2e; portal Vite+React19+antd6 (thêm react-router-dom); ke-toan-so auth-service.

## Global Constraints
- Admin endpoints dùng **SessionGuard (cookie)**; `req.user={id,email}`. Authz theo ma trận §3 spec: superAdmin=email `admin@company.com`; companyAdmin=`user_tenants{userId,tenantId,role:'admin',isActive}`. Toàn-công-ty (tạo/xoá tenant, entitlement)=superAdmin; trong-công-ty (user/membership/reset-pw)=superAdmin HOẶC companyAdmin của tenant đó. companyAdmin KHÔNG đụng công ty khác.
- identity KHÔNG có phan_quyen/vai_tro/lĩnh vực. Membership role chỉ `admin|member`. Mật khẩu mặc định `123456`, bcrypt(10).
- Response `{success, data}` đồng bộ AuthController. DTO + ValidationPipe whitelist.
- Global prefix `/api`. e2e dùng mongodb-memory-server (mẫu platform.e2e/auth.e2e sẵn có).
- KHÔNG phá flow SSO/ServeStatic hiện tại của portal.

---

## Task A1: AdminModule scaffold + AdminAuthz + GET /api/me/identity
**Repo:** identity-service. **Files:** `src/admin/admin.module.ts`, `src/admin/admin-authz.service.ts`, `src/admin/admin.controller.ts` (chỉ me/identity ở task này), `src/app.module.ts` (import AdminModule), e2e `test/admin.e2e-spec.ts`.

**Interfaces:**
- `AdminAuthzService`: `getCaller(userId): Promise<{user:User,isSuperAdmin:boolean}>`; `assertSuperAdmin(userId)`; `assertCanManageTenant(userId, tenantId)` (super HOẶC membership admin của tenant → else ForbiddenException); `isCompanyAdmin(userId, tenantId): Promise<boolean>`; `adminTenantIds(userId): Promise<string[]>` (các tenant user là admin).
- `GET /api/me/identity` (SessionGuard) → `{success,data:{userId,email,isSuperAdmin,adminTenantIds:string[]}}`.

- [ ] **Step 1: AdminModule** import `TypeOrmModule.forFeature([User,UserCredential,UserTenant,Tenant,App,TenantApp])` + AuthModule; providers AdminAuthzService; controller AdminController. Import vào AppModule.
- [ ] **Step 2: AdminAuthzService** như interface (nạp User theo id; isSuperAdmin=email===SUPER_ADMIN_EMAIL; companyAdmin/adminTenantIds query UserTenant role:'admin' isActive). throw ForbiddenException khi không đủ quyền.
- [ ] **Step 3: AdminController** `@Controller()` route `me/identity` (SessionGuard) trả payload. (Các route admin khác ở task sau, cùng controller hoặc tách — dùng `@Controller('admin')` cho nhóm admin + me/identity để ở AuthController? Đặt me/identity trong AdminController path `me/identity`.)
- [ ] **Step 4: e2e** `admin.e2e-spec.ts` (mongodb-memory-server, seed 1 superAdmin + 1 companyAdmin + 1 member + 2 tenant): GET /api/me/identity với cookie từng loại → isSuperAdmin + adminTenantIds đúng; không cookie → 401.
- [ ] **Step 5:** `yarn build` + `yarn test:e2e admin` PASS. Commit.

---

## Task A2: Tenants admin endpoints + Entitlement + Apps catalog
**Repo:** identity-service. **Files:** `src/admin/admin.controller.ts` (+ tenants/entitlement/apps routes), `src/admin/admin.service.ts`, DTOs `src/admin/dto/*`, mở rộng e2e.

**Endpoints (SessionGuard + authz):**
- `GET /api/admin/tenants` (super=all / companyAdmin=cty mình) → list tenant + admins(membership role admin) .
- `POST /api/admin/tenants` (super) → tạo Tenant(định danh) + admin user (existing theo email/id hoặc new+password) + membership role:'admin' + entitlement: bật các appId chọn (tenant_apps). Trả tenant.
- `PUT /api/admin/tenants/:id` (super / companyAdmin :id) → sửa field định danh (name/slug/maSoThue/diaChi/dienThoai/email/nguoiDaiDien/isActive).
- `DELETE /api/admin/tenants/:id` (super) → soft-delete tenant + memberships.
- `GET /api/admin/tenants/:id/apps` (super / companyAdmin :id) → tenant_apps trạng thái.
- `PUT /api/admin/tenants/:id/apps` (super) → body `{appId,isActive}` upsert tenant_apps.
- `GET /api/admin/apps` (session) → list App active.

- [ ] **Step 1:** DTOs (CreateTenantDto, UpdateTenantDto, ToggleAppDto) + AdminService methods.
- [ ] **Step 2:** controller routes + authz (assertSuperAdmin / assertCanManageTenant).
- [ ] **Step 3: e2e** matrix: super tạo/xoá OK; companyAdmin sửa cty mình OK + cty khác 403 + tạo/xoá 403 + entitlement 403; member 403. list scoping đúng.
- [ ] **Step 4:** build + e2e PASS. Commit.

---

## Task A3: Users admin endpoints
**Repo:** identity-service. **Files:** admin.controller/service (+ users routes), DTOs, e2e.

**Endpoints:**
- `GET /api/admin/users` (super=all / companyAdmin=user thuộc cty mình; search) .
- `POST /api/admin/users` (super / companyAdmin+tenantId cty mình) → User+UserCredential(123456); companyAdmin bắt buộc gán membership cty mình (role member mặc định).
- `PUT /api/admin/users/:id` (super / companyAdmin chung cty) → hoTen/email/trangThai.
- `POST /api/admin/users/:id/reset-password` (super / companyAdmin chung cty) → 123456.
- `PATCH /api/admin/users/:id/toggle-status` (super / companyAdmin chung cty).

- [ ] **Step 1:** DTOs + service (companyAdmin "chung cty" = user có ≥1 membership trong các adminTenantIds của caller).
- [ ] **Step 2:** controller + authz.
- [ ] **Step 3: e2e** super CRUD; companyAdmin tạo user gán cty mình OK + sửa user cty khác 403; member 403.
- [ ] **Step 4:** build + e2e PASS. Commit.

---

## Task A4: Membership admin endpoints
**Repo:** identity-service. **Files:** admin.controller/service (+ members routes), DTOs, e2e.

**Endpoints (super / companyAdmin :id):**
- `GET /api/admin/tenants/:id/members` → list (hoTen,email,role,isActive).
- `POST /api/admin/tenants/:id/members` → add user existing(email/id) hoặc new(+password); role admin|member.
- `PUT /api/admin/tenants/:id/members/:userId` → role(admin|member)/isActive.
- `DELETE /api/admin/tenants/:id/members/:userId` → soft-delete membership.

- [ ] **Step 1:** DTOs + service (reactivate nếu membership cũ isActive=false).
- [ ] **Step 2:** controller + authz (assertCanManageTenant).
- [ ] **Step 3: e2e** super + companyAdmin :id OK; companyAdmin tenant khác 403; member 403; add existing + new; set admin/member.
- [ ] **Step 4:** build + e2e PASS. Commit.

---

## Task B1: Portal — react-router + admin shell + gating
**Repo:** identity-service `portal/`. **Files:** `portal/package.json` (+react-router-dom), `portal/src/App.tsx` (router), `portal/src/lib/api.ts` (+getMeIdentity), `portal/src/types.ts` (+MeIdentity), `portal/src/screens/AppPicker.tsx` (nút Quản trị), `portal/src/admin/AdminShell.tsx`.

- [ ] **Step 1:** thêm `react-router-dom`. Bọc app: route `/` = flow SSO hiện tại (giữ nguyên state machine trong 1 component Home), `/admin/*` = AdminShell. ServeStatic SPA fallback đã có (index.html).
- [ ] **Step 2:** `api.ts` thêm `getMeIdentity()` → `/api/me/identity`. `types.ts` MeIdentity `{userId,email,isSuperAdmin,adminTenantIds}`.
- [ ] **Step 3:** AppPicker: load getMeIdentity; nếu `isSuperAdmin||adminTenantIds.length` hiện nút "Quản trị" → navigate `/admin`. AdminShell: layout antd (Sider menu: Công ty [super], Người dùng) + Outlet; nút quay lại Portal.
- [ ] **Step 4:** Vitest: AppPicker hiện nút khi isSuperAdmin; AdminShell render. `npm run build` + `npm test` PASS. Commit.

---

## Task B2: Portal — api client admin + types
**Repo:** identity-service `portal/`. **Files:** `portal/src/lib/adminApi.ts`, `portal/src/types.ts`.

- [ ] **Step 1:** adminApi: tenants(list/create/update/delete), tenantApps(get/toggle), apps(list), users(list/create/update/resetPw/toggle), members(list/add/update/remove) — fetch `/api/admin/...` credentials include, ApiError. types AdminTenant/AdminUser/Member/AppEntitlement.
- [ ] **Step 2:** Vitest mock fetch cho vài call (credentials, path, error). build + test. Commit.

---

## Task B3: Portal — CompanyList + create/edit/delete + EntitlementModal
**Repo:** identity-service `portal/`. **Files:** `portal/src/admin/CompanyList.tsx`, `CompanyFormModal.tsx`, `EntitlementModal.tsx`, route trong AdminShell.

Bố cục theo Kế toán TenantPage: bảng (name, maSoThue, diaChi, slug code, admins tags, apps tags, isActive tag, thao tác: members/entitlement/edit/delete Popconfirm). Create modal: form định danh + section "Tài khoản Admin" (Radio existing/new: existing chọn user từ users list; new: adminHoTen/adminEmail/adminPassword=123456) + chọn apps (checkbox/select từ apps catalog) cho entitlement. Edit: form định danh. EntitlementModal: list apps + Switch bật/tắt (gọi PUT tenants/:id/apps).

- [ ] **Step 1:** CompanyList + CompanyFormModal (create/edit) + delete.
- [ ] **Step 2:** EntitlementModal.
- [ ] **Step 3:** Vitest render CompanyList (mock adminApi). build + test. Commit.

---

## Task B4: Portal — MembersModal + UserList
**Repo:** identity-service `portal/`. **Files:** `portal/src/admin/MembersModal.tsx`, `UserList.tsx`, routes.

MembersModal (mở từ CompanyList per company): bảng (hoTen,email,role admin/member tag,isActive) + add(existing/new + role admin|member) + edit role + remove Popconfirm. UserList: bảng (hoTen,email,trạng thái tag) + create/edit/reset-pw/toggle (theo Kế toán ThanhVienPage). companyAdmin: CompanyList ẩn (chỉ super), nhưng vẫn vào được MembersModal/UserList cho cty mình → AdminShell menu theo quyền.

- [ ] **Step 1:** MembersModal.
- [ ] **Step 2:** UserList + wire AdminShell menu theo isSuperAdmin/adminTenantIds.
- [ ] **Step 3:** Vitest render. build + test. Commit.

---

## Task C1: ke-toan-so — lazy provisioning Kế toán
**Repo:** ke-toan-so `feature/p3-lazy-provisioning`. **Files:** `be/apps/auth-service/src/auth-service.service.ts` (helper `ensureKeToanProvisioned`), gọi trong selectTenant/switchTenant; (cần repo TenantAppConfig/AppUserRole/PhanQuyen/VaiTro — auth-service đã có TenantAppConfig+AppUserRole; thêm VaiTro/PhanQuyen nếu cần tạo Admin role). Test mock.

Logic `ensureKeToanProvisioned(tenantId, userId, isCompanyAdmin)` idempotent:
- nếu `tenant_app_config(tenantId)` thiếu → tạo `{modules:['KE_TOAN'],glossary:{},nganh:null}`.
- nếu isCompanyAdmin (membership identity role admin) và thiếu `app_user_roles(userId,tenantId)` → tạo role 'Admin'; và đảm bảo `phan_quyen` vaiTro 'Admin' tenant đó tồn tại (full permissions — tái dùng generateAllPermissions; cân nhắc import từ master-data hoặc copy helper) + `vai_tro` 'Admin'.
- chỉ chạy findOne nhẹ; thực thi khi thiếu.

- [ ] **Step 1:** helper + gọi sau khi xác định membership trong selectTenant/switchTenant (biết isCompanyAdmin từ identity UserTenant.role==='admin'). Cần generateAllPermissions: import/copy danh sách PERMISSION_MODULES từ master-data tenant.service (hoặc helper chung). Giữ gọn.
- [ ] **Step 2:** test mock: thiếu config→tạo; đã có→skip; member thường→không tạo Admin role.
- [ ] **Step 3:** build auth-service + jest. Commit.

---

## Task D: DEPLOY P3 (tương tác)
- [ ] **D1 identity-service:** build portal (`npm run build` trong portal/) → `npm run build` BE → đẩy source tar+ssh tới `/root/chimseo/identity-service` (rsync) → rebuild image `docker compose build` hoặc `docker commit` flow → `docker compose up -d masterceo-identity` (recreate). Verify /api/me/identity + admin endpoints (curl cookie) + Portal /admin load.
- [ ] **D2 ke-toan-so:** build auth-service → scp main.js → `docker compose up -d` (hoặc restart) → verify lazy provisioning (admin công ty mới vào Kế toán có menu).
- [ ] **D3 Smoke:** superAdmin tạo công ty mới ở Portal → bật Kế toán → login admin công ty đó → vào Kế toán có menu (lazy provision). companyAdmin thêm user. Entitlement tắt app → app ẩn ở Portal.

## Self-Review
- Spec §4 endpoints → A1-A4; §5 FE → B1-B4; §6 lazy → C1; deploy → D. Ma trận §3 authz test ở mỗi e2e. antd theo §5. Lazy idempotent §6.
- Rủi ro: companyAdmin cross-tenant (test kỹ mỗi task); react-router không phá ServeStatic; lazy provisioning nhẹ/idempotent; deploy identity qua tar+ssh (repo private) như cut-over.

## Execution
A1→A4 (identity BE) → B1→B4 (portal FE) → C1 (ke-toan-so) → D (deploy). Subagent mỗi task + review. D tương tác.
