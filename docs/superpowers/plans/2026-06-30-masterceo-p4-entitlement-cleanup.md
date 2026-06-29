# MasterCeo P4 — Entitlement enforcement + Cleanup Plan

> Subagent-driven (code) + ops (deploy/cleanup tương tác). Repo ke-toan-so `feature/p4-entitlement-cleanup`. Spec §9 P4.

**Goal:** (1) ke-toan-so enforce entitlement `tenant_apps` (chặn vào Kế toán nếu công ty chưa bật app `ke-toan`); (2) dọn an toàn: drop collection thừa digital_book (users/user_credentials/user_tenants), bỏ dead gateway Tenant registration.

**Quyết định phạm vi (khuyến nghị):** HOÃN slim cột Tenant entity (modules/glossary/nganh/dashboardBlocks) — vestigial, vô hại, và tenant.service gán các field này lên object tenant để build response (coupling) nên bỏ cột = refactor rủi ro cao / giá trị thấp. Giữ nguyên, dọn sau nếu cần.

## Global Constraints
- App id Kế toán = `'ke-toan'`. Entitlement nguồn: identity `tenant_apps` (connection `'identity'`).
- Non-breaking: enforcement chỉ loại tenant chưa entitled khỏi luồng Kế toán; mọi tenant hiện có đã có tenant_apps('ke-toan') từ migrate P1 → không ảnh hưởng user hiện tại.
- Drop collection digital_book chỉ sau backup + xác nhận không còn reader (P2 đã chuyển hết sang identity; grep xác nhận chỉ gateway còn dead `forFeatureRaw([Tenant])`).

---

## Task P4-1: Entitlement enforcement (ke-toan-so auth-service) + bỏ dead gateway Tenant reg
**Files:** create `be/libs/entities/src/tenant/tenant-app.entity.ts` (collection `tenant_apps`); export ở tenant index; add `TenantApp` vào `forRootIdentity` entities list (`be/libs/database/src/database.module.ts`) + TENANT_EXEMPT_ENTITIES (`be/libs/core/src/tenant/index.ts`); `be/apps/auth-service/src/auth-service.module.ts` (forFeatureIdentity + TenantApp); `auth-service.service.ts` (enforcement); `be/apps/gateway/src/gateway.module.ts` (bỏ Tenant khỏi forFeatureRaw).

**TenantApp entity:** `{ tenantId: string; appId: string; isActive: boolean }` (mirror identity), collection `tenant_apps`, exempt.

**Enforcement (auth-service):**
- helper `isKeToanEnabled(tenantId): Promise<boolean>` → `tenantAppRepo.findOne({where:{tenantId, appId:'ke-toan', isActive:true}})` (identity conn).
- `login`: khi build danh sách tenant của user (cả super-admin all-tenants và regular membership list), LỌC chỉ giữ tenant có ke-toan enabled. (Nếu sau lọc còn 0 → ForbiddenException "Tài khoản chưa được cấp quyền sử dụng Kế toán ở công ty nào".)
- `selectTenant` / `switchTenant`: trước khi phát token, nếu `!isKeToanEnabled(tenantId)` → ForbiddenException "Công ty chưa kích hoạt ứng dụng Kế toán".
- `getMe` availableTenants: lọc tương tự (đồng nhất với login).
- Super-admin: vẫn áp entitlement (super-admin chỉ thấy/vào tenant có ke-toan ở app Kế toán — hợp lý; super-admin quản entitlement ở Portal). [Nếu muốn super-admin bypass, ghi rõ — mặc định áp dụng cho mọi user để nhất quán.]

**Steps:**
- [ ] **1:** TenantApp entity + export + forRootIdentity entities += TenantApp + exempt list.
- [ ] **2:** auth-service.module forFeatureIdentity += TenantApp; constructor inject `@InjectRepository(TenantApp,'identity')`.
- [ ] **3:** helper isKeToanEnabled + áp vào login (filter) / selectTenant (reject) / switchTenant (reject) / getMe (filter). Giữ shape response.
- [ ] **4:** gateway.module: `forFeatureRaw([LinhVuc, MenuCatalog])` (bỏ Tenant — dead, EntitlementService dùng TenantAppConfig).
- [ ] **5:** test mock: isKeToanEnabled true→giữ, false→loại/reject; build auth-service + gateway + (build sweep 10 service vì forRootIdentity entities đổi). Commit.

---

## Task P4-2: DEPLOY + Cleanup (ops, tương tác)
- [ ] **1 Backup:** mongodump digital_book + masterceo_identity (fresh).
- [ ] **2 Deploy code:** build + scp `auth-service` + `gateway` main.js (forRootIdentity entities đổi → cân nhắc build tất cả; thực tế chỉ auth+gateway đổi hành vi, nhưng entity list trong forRootIdentity nằm ở libs/database → mọi service bundle lại; deploy auth+gateway đủ vì chỉ chúng đổi logic, các service khác chỉ thêm metadata TenantApp vô hại — build+scp auth+gateway, restart). → restart digital-book-app.
- [ ] **3 Verify enforcement (live):** tenant có ke-toan → login/select OK; tạo nhanh 1 tenant Portal KHÔNG bật ke-toan → admin login Kế toán phải bị chặn (Forbidden) / không thấy tenant đó. Dọn tenant test.
- [ ] **4 Cleanup collections (sau khi enforcement verified):** xác nhận lần cuối không reader → `db.users.renameCollection('zz_deprecated_users_p4')` (reversible) HOẶC drop; tương tự user_credentials, user_tenants trong digital_book. (Giữ rename 1 thời gian an toàn hơn drop; rename để rollback nhanh.)
- [ ] **5 Verify post-cleanup:** login/select/me + 1 nghiệp vụ (master-data/tai-khoan) vẫn 200; log sạch.
> Rollback: rename lại collection; redeploy bản auth/gateway trước.

## Self-Review
- Spec §9 P4: enforcement → P4-1; dọn (collections + dead reg) → P4-2; slim Tenant entity HOÃN (ghi rõ lý do). Non-breaking: tenant hiện có đều entitled (migrate P1). Rủi ro: enforcement loại nhầm → test; drop collection → rename reversible + backup.
