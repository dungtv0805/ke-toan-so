# MasterCeo Mô hình chuẩn — P2: Kế toán một-nguồn Implementation Plan

> **For agentic workers:** Task code dùng superpowers:subagent-driven-development. Bước deploy (cuối) chạy TƯƠNG TÁC (production live). Steps dùng `- [ ]`.
> **CẢNH BÁO:** P2 đụng auth toàn hệ (login/getMe/AuthzLoader/guards) + 2 màn quản lý + thêm connection Mongo thứ 2. Làm tuần tự, review từng task, deploy có rollback.

**Goal:** ke-toan-so dùng **một nguồn**: đọc/ghi **User, UserCredential, Tenant(định danh), Membership** từ `masterceo_identity` (connection 2); **role chức năng** → bảng mới `app_user_roles` (digital_book); **config lĩnh vực** (`modules/nganh/glossary/dashboardBlocks`) → bảng mới `tenant_app_config` (digital_book). Bỏ bản copy users/tenants/user_tenants trong digital_book. `phan_quyen` giữ nguyên (digital_book).

**Architecture:** Thêm named TypeORM connection `identity` → `masterceo_identity` cho 4 entity identity (raw, tenant-exempt). Tạo 2 entity digital_book: `AppUserRole`, `TenantAppConfig`. Repoint mọi đọc/ghi identity sang connection 2; role→app_user_roles; config→tenant_app_config. AuthzLoader đọc role từ app_user_roles. Migrate tách dữ liệu. Test mock/unit (libs/auth có vitest? — BE dùng Jest). Deploy live có migrate + rollback.

**Tech Stack:** NestJS 11, TypeORM(mongodb) đa connection, Jest. Bản đồ file:line dùng từ khảo sát (xem mục Tham chiếu).

## Global Constraints
- Repo `/Users/os_anhvt/Documents/Dino/ke-toan-so/be`.
- **Connection 2** `identity` → `masterceo_identity` (env `IDENTITY_MONGODB_DATABASE=masterceo_identity`, cùng URI/creds). Entity trên connection identity: `User, UserCredential, Tenant, UserTenant(membership)`. RAW (không tenant-proxy; chúng tenant-exempt).
- **digital_book (connection mặc định)**: `app_user_roles`(MỚI: tenantId,userId,role), `tenant_app_config`(MỚI: tenantId,modules,nganh,glossary,dashboardBlocks), `phan_quyen`, `vai_tro`, nghiệp vụ.
- **role chức năng** (Admin/Kế toán trưởng/…) = `app_user_roles.role`. **membership.role** ở identity = admin/member (P1) — KHÔNG đụng functional role.
- `Tenant` entity (ke-toan-so) **slim** (chỉ định danh) — khớp identity; accounting fields chuyển `tenant_app_config`.
- Non-breaking khi deploy: migrate data trước; giữ field/collection cũ tới khi verify xong (dọn ở bước cuối/P4).
- superAdmin theo email (như cũ). Token `{sub,email,tenantId}` không đổi.
- Đọc bản đồ file:line ở report khảo sát: `.superpowers/sdd/` (P2 mapping) — đã có trong context plan này (mục Tham chiếu).

## Tham chiếu (bản đồ — file:line chính)
- DatabaseModule: `be/libs/database/src/database.module.ts` (forRoot:164, forFeature:202, forFeatureRaw:231).
- auth-service: `be/apps/auth-service/src/auth-service.service.ts` (login:103+, getMe:452+, select:285+, switch:555+, register:378+, changePassword:687+, buildTenantInfo:68-81 đọc modules/glossary/nganh, loadPermissions:54).
- AuthzLoader: `be/libs/auth/src/services/authz-loader.service.ts` (UserTenant:28-30, PhanQuyen:37-39).
- EntitlementService: `be/libs/auth/src/services/entitlement.service.ts` (getTenantModules:42-49 đọc Tenant.modules).
- Guards: `tenant-active.guard.ts:36-39` (Tenant.isActive), `tenant-admin.guard.ts:44-51` (UserTenant role).
- config-service/nguoi-dung: `be/apps/config-service/src/nguoi-dung/nguoi-dung.service.ts` (CRUD user/membership; role write:236).
- master-data/tenant: `be/apps/master-data-service/src/tenant/tenant.service.ts` (tenant CRUD + member mgmt + config modules/glossary/nganh/dashboardBlocks + ensureAdminRole phan_quyen).

---

## Task 1: DatabaseModule — connection `identity` thứ 2

**Files:** Modify `be/libs/database/src/database.module.ts`; env `be/.env-cmdrc` (+ `IDENTITY_MONGODB_DATABASE`).

**Interfaces:** Produces `DatabaseModule.forRootIdentity()` (tạo named connection 'identity' tới masterceo_identity, autoLoadEntities) + `DatabaseModule.forFeatureIdentity(entities)` (TypeOrmModule.forFeature(entities,'identity'), raw repo trên connection 'identity'). Inject: `@InjectRepository(User, 'identity')`.

- [ ] **Step 1: env** — `be/.env-cmdrc` block `db`: thêm `"IDENTITY_MONGODB_DATABASE": "masterceo_identity"`.

- [ ] **Step 2: `database.module.ts`** — thêm forRootIdentity + forFeatureIdentity:
```ts
// trong class DatabaseModule:
static forRootIdentity(): DynamicModule {
  const uri = process.env.MONGODB_URI;
  const database = process.env.IDENTITY_MONGODB_DATABASE || 'masterceo_identity';
  const user = process.env.MONGODB_USER;
  const pwd = process.env.MONGODB_PWD;
  const options: TypeOrmModuleOptions = {
    name: 'identity',
    type: 'mongodb',
    url: `${uri}`,
    database,
    username: user,
    password: pwd,
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    autoLoadEntities: true,
  };
  return { module: DatabaseModule, global: true, imports: [TypeOrmModule.forRoot(options)], exports: [TypeOrmModule] };
}

static forFeatureIdentity(entities: any[]): DynamicModule {
  return {
    module: TenantRepositoryModule,
    imports: [TypeOrmModule.forFeature(entities, 'identity')],
    exports: [TypeOrmModule],
  };
}
```
> identity entities là RAW trên connection 'identity' (không tenant-proxy). Repo inject bằng `@InjectRepository(Entity, 'identity')`.

- [ ] **Step 3: Gọi `forRootIdentity()` ở mỗi app module** dùng identity entities: gateway? KHÔNG — chỉ service nào đọc/ghi identity. Thêm `DatabaseModule.forRootIdentity()` vào imports của: auth-service module, config-service module, master-data-service module, và **AuthModule (libs/auth)** nếu AuthzLoader/guards cần (xem Task 4/5). (forRootIdentity là @Global nên 1 lần là đủ cho cả process mỗi service — thêm vào root module mỗi service đó.)

- [ ] **Step 4: Build kiểm tra** `cd be && npx nest build auth-service` → OK (chưa dùng repo identity, chỉ wiring). Commit.
```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so && git add be/libs/database be/.env-cmdrc && git commit -m "feat(db): connection identity thứ 2 (masterceo_identity) + forFeatureIdentity"
```
> Verify thực sự ở Task cuối (cần Mongo). Nếu có unit test cho database.module thì chạy.

---

## Task 2: Entity mới `AppUserRole` + `TenantAppConfig` (digital_book) + Tenant slim

**Files:** Create `be/libs/entities/src/auth/app-user-role.entity.ts`, `be/libs/entities/src/tenant/tenant-app-config.entity.ts`; Modify `be/libs/entities/src/tenant/tenant.entity.ts` (bỏ accounting fields); export ở entities index.

**Interfaces:** `AppUserRole { tenantId, userId, role: string, isActive }` (collection `app_user_roles`, tenant-exempt? KHÔNG — key theo tenantId nhưng tra bằng userId+tenantId; để RAW/exempt như UserTenant). `TenantAppConfig { tenantId, modules: string[], nganh, glossary, dashboardBlocks }` (collection `tenant_app_config`).

- [ ] **Step 1: `app-user-role.entity.ts`**
```ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('app_user_roles')
@Index('IDX_app_user_role_unique', ['userId', 'tenantId'], { unique: true })
export class AppUserRole extends BaseEntity {
  @Column() userId: string;
  @Column() declare tenantId: string;
  @Column({ default: 'KIEM_SOAT' }) role: string;  // vai trò CHỨC NĂNG của Kế toán
  @Column({ default: true }) isActive: boolean;
}
```
(Thêm vào `TENANT_EXEMPT_ENTITIES` nếu cần — tra theo tenantId tường minh, không để tenant-proxy chèn filter; xem cách UserTenant exempt.)

- [ ] **Step 2: `tenant-app-config.entity.ts`**
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { Glossary } from '../nganh/nganh.entity';

@Entity('tenant_app_config')
export class TenantAppConfig extends BaseEntity {
  @Column() declare tenantId: string;
  @Column({ type: 'json', default: ['KE_TOAN'] }) modules: string[];
  @Column({ nullable: true }) nganh?: string | null;
  @Column({ type: 'json', default: {} }) glossary: Glossary;
  @Column({ type: 'json', nullable: true }) dashboardBlocks?: string[] | null;
}
```

- [ ] **Step 3: TENANT_EXEMPT_ENTITIES** (`be/libs/core/src/tenant/index.ts`) — thêm `'AppUserRole'` và `'TenantAppConfig'` (như `UserTenant`/`Tenant`: tra theo userId/tenantId tường minh; KHÔNG để tenant-proxy chèn filter — login pre-tenant chưa có request tenant context).
> **KHÔNG slim Tenant entity ở P2** (dời P4). Giữ `modules/nganh/glossary/dashboardBlocks` trên `Tenant` tới khi MỌI reader repoint xong (Task 5 + Task 7); slim sớm sẽ vỡ build vì tenant.service/auth-service còn đọc field này. `TenantAppConfig` là nguồn mới; field cũ trên Tenant thành vô dụng nhưng vô hại tới P4.

- [ ] **Step 4: export entities** — thêm AppUserRole vào `be/libs/entities/src/auth/index.ts` (import + re-export theo pattern), TenantAppConfig vào `be/libs/entities/src/tenant/index.ts`. Build (`npx nest build master-data-service`).

- [ ] **Step 5: Commit.** `git add be/libs/entities be/libs/core && git commit -m "feat(entities): AppUserRole + TenantAppConfig (tách role/config khỏi identity)"`

---

## Task 3: Migrate (digital_book) — tách app_user_roles + tenant_app_config

**Files:** Create `be/scripts/migrate-p2-split.ts` (hoặc theo cấu trúc seed scripts hiện có) + test.

**Interfaces:** `migrateP2Split({uri, db, dryRun})`: từ `digital_book.user_tenants` → `app_user_roles` (tenantId,userId,role,isActive) (role = role CŨ, là functional role); từ `digital_book.tenants` → `tenant_app_config` (tenantId, modules, nganh, glossary, dashboardBlocks). Idempotent (upsert theo key). KHÔNG xoá nguồn (dọn ở Task cuối).

- [ ] **Step 1: Test (in-memory nếu có, hoặc mongosh-style)** — kiểm: tạo app_user_roles từ user_tenants (giữ role chức năng); tạo tenant_app_config từ tenants (modules/nganh/glossary/dashboardBlocks); idempotent. (Theo mẫu migrate-p1.spec của identity; nếu be không có mongodb-memory-server, viết script + verify thủ công ở deploy — ghi rõ.)

- [ ] **Step 2: Script `migrate-p2-split.ts`** (raw mongodb driver):
```ts
import 'reflect-metadata';
import { MongoClient } from 'mongodb';
export async function migrateP2Split(opts: { uri: string; db: string; dryRun: boolean }) {
  const client = await MongoClient.connect(opts.uri);
  let roles = 0, configs = 0;
  try {
    const db = client.db(opts.db);
    for (const ut of await db.collection('user_tenants').find({}).toArray()) {
      const exists = await db.collection('app_user_roles').findOne({ userId: ut.userId, tenantId: ut.tenantId });
      if (!exists) { if (!opts.dryRun) await db.collection('app_user_roles').insertOne({ userId: ut.userId, tenantId: ut.tenantId, role: ut.role || 'KIEM_SOAT', isActive: ut.isActive !== false, createdAt: new Date(), updatedAt: new Date() }); roles++; }
    }
    for (const t of await db.collection('tenants').find({}).toArray()) {
      const exists = await db.collection('tenant_app_config').findOne({ tenantId: t._id.toString() });
      if (!exists) { if (!opts.dryRun) await db.collection('tenant_app_config').insertOne({ tenantId: t._id.toString(), modules: t.modules || ['KE_TOAN'], nganh: t.nganh ?? null, glossary: t.glossary || {}, dashboardBlocks: t.dashboardBlocks ?? null, createdAt: new Date(), updatedAt: new Date() }); configs++; }
    }
    return { roles, configs };
  } finally { await client.close(); }
}
if (require.main === module) {
  migrateP2Split({ uri: process.env.MONGODB_URI!, db: process.env.MONGODB_DATABASE!, dryRun: process.argv.includes('--dry-run') })
    .then((r) => { console.log(JSON.stringify(r)); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 3: Build + test (nếu có) + commit.** `git add be/scripts/migrate-p2-split.ts && git commit -m "feat(migrate): tách app_user_roles + tenant_app_config từ digital_book"`

---

## Task 4: AuthzLoaderService — role từ app_user_roles

**Files:** Modify `be/libs/auth/src/services/authz-loader.service.ts`; wire AppUserRole vào libs/auth (forFeature digital_book) + AuthModule.

**Interfaces:** `load(userId, tenantId, email)`: role từ `AppUserRole`(userId,tenantId,isActive) thay `UserTenant`; permissions từ `PhanQuyen`(vaiTro,tenantId) như cũ. super-admin email → {vaiTro:'SUPER_ADMIN', permissions:['*']}; không có app_user_role → {vaiTro:'', permissions:[]} (giữ logic non-member của P1 SP2).

- [ ] **Step 1: Sửa AuthzLoader** đọc `AppUserRole` (inject repo AppUserRole — digital_book default connection) thay UserTenant. Giữ cache + super-admin + fallback. (AuthModule `forFeature([UserTenant, PhanQuyen])` đổi thành `forFeature([AppUserRole, PhanQuyen])`.)
- [ ] **Step 2: Cập nhật `authz-loader.service.spec.ts`** (mock DataSource/repo) → tra AppUserRole.
- [ ] **Step 3: Build + `yarn jest libs/auth/src/services/authz-loader.service.spec.ts` → PASS.** Commit.

---

## Task 5a: Cross-cutting — identity connection toàn bộ service + guards + EntitlementService

**Lý do tách:** `TenantActiveGuard` là APP_GUARD toàn cục (chạy ở MỌI service) đọc `Tenant.isActive`. Tenant chuyển sang identity → mọi service cần connection identity (cùng Mongo instance nên không tăng failure domain). Phải đăng ký entity identity **explicit** để metadata có ở mọi process.

**Files:** Modify `be/libs/database/src/database.module.ts` (forRootIdentity), 7 service root modules (gateway/voucher/cash-book/payable/reporting/kho/tax), `be/libs/auth/src/guards/tenant-active.guard.ts`, `be/apps/master-data-service/src/tenant/tenant.module.ts` + `tenant-admin.guard.ts`, `be/libs/auth/src/services/entitlement.service.ts` + spec.

- [ ] **Step 1: forRootIdentity explicit entities** — sửa `forRootIdentity()`: thay `autoLoadEntities: true` bằng `entities: [User, UserCredential, Tenant, UserTenant]` (import từ `@app/entities`). Lý do: TenantActiveGuard chạy ở service không gọi forFeatureIdentity (vd voucher) — autoLoad sẽ rỗng → `getRepository(Tenant)` trên identity throw. Explicit đảm bảo 4 entity luôn có metadata trên connection 'identity' ở mọi service import forRootIdentity. (libs/database import @app/entities: một chiều, không circular.)
- [ ] **Step 2: forRootIdentity() vào 7 service còn lại** — thêm `DatabaseModule.forRootIdentity()` vào imports root module: gateway, voucher, cash-book, payable, reporting, kho, tax (auth/config/master-data đã có từ Task 1). Đặt ngay sau `DatabaseModule.forRoot()`.
- [ ] **Step 3: TenantActiveGuard** — inject `@InjectDataSource('identity') private readonly identityDs: DataSource` thay `DataSource` mặc định; `this.identityDs.getRepository(Tenant).findOne(...)`. Logic còn lại giữ nguyên (super-admin bypass, skip khi chưa auth).
- [ ] **Step 4: TenantAdminGuard** (chỉ master-data) — đọc membership từ identity: `@InjectRepository(UserTenant, 'identity')` (thêm `DatabaseModule.forFeatureIdentity([UserTenant])` vào tenant.module imports, bỏ token RAW UserTenant nếu chỉ guard dùng). Đổi `role: 'Admin'` → `role: 'admin'` (membership identity P1 = admin/member). super-admin bypass giữ nguyên.
- [ ] **Step 5: EntitlementService.getTenantModules** → đọc `TenantAppConfig` (digital_book, default `dataSource`) theo `tenantId` (string, KHÔNG ObjectId — tenant_app_config.tenantId là string): `getRepository(TenantAppConfig).findOne({ where: { tenantId } })`; `cfg?.modules?.length ? cfg.modules : ['KE_TOAN']`. Bỏ import Tenant + ObjectId ở hàm này. Cập nhật `entitlement.service.spec.ts`: mock `TenantAppConfig` thay `Tenant`, field `modules`.
- [ ] **Step 6: Build TẤT CẢ service** (`npx nest build gateway voucher-service cash-book-service payable-service reporting-service kho-service tax-service config-service master-data-service auth-service`) + `npx jest libs/auth/src/services/entitlement.service.spec.ts`. Sửa tenant-admin.guard.spec nếu vỡ. Commit.

---

## Task 5b: auth-service.service repoint (login/getMe/select/switch/register/...)

**Files:** Modify `be/apps/auth-service/src/auth-service.module.ts`, `be/apps/auth-service/src/auth-service.service.ts`.

**Interfaces:** auth-service đọc User/UserCredential/Tenant/UserTenant(membership) từ connection `identity`; functional role từ `AppUserRole`; modules/glossary/nganh từ `TenantAppConfig`. `buildTenantInfo(role: string, tenant: Tenant, cfg: TenantAppConfig|null)`.

- [ ] **Step 1: module** — đổi `DatabaseModule.forFeature([User, UserCredential, Tenant, UserTenant])` → `DatabaseModule.forFeatureIdentity([User, UserCredential, Tenant, UserTenant])`; thêm `DatabaseModule.forFeature([AppUserRole, TenantAppConfig])`; giữ `forFeatureRaw([PhanQuyen])` + `forRootIdentity()` (đã có).
- [ ] **Step 2: service constructor** — 4 identity repo inject thêm tham số connection: `@InjectRepository(User, 'identity')`, `(UserCredential,'identity')`, `(Tenant,'identity')`, `(UserTenant,'identity')`; thêm `@InjectRepository(AppUserRole)` + `@InjectRepository(TenantAppConfig)` (default). Giữ phanQuyenRepo RAW.
- [ ] **Step 3: buildTenantInfo đổi chữ ký** → `(role: string, tenant: Tenant, cfg: TenantAppConfig | null)`: `role` (từ AppUserRole) thay `userTenant.role`; `modules: cfg?.modules?.length ? cfg.modules : ['KE_TOAN']`; `glossary: cfg?.glossary ?? {}`; `nganh: cfg?.nganh ?? null`. Cập nhật mọi caller: trước khi build, đọc `appUserRole` theo (userId, tenantId) → role; đọc `tenantAppConfig` theo tenantId → cfg.
- [ ] **Step 4: loadPermissions / role** — nơi cần role chức năng (login/select/switch/getMe build JWT + TenantInfo): lấy từ `appUserRoleRepo.findOne({where:{userId, tenantId, isActive:true}})` → `role || 'KIEM_SOAT'` (membership tồn tại nhưng chưa có app_user_role) hoặc '' nếu không là thành viên. phanQuyen theo role+tenantId như cũ. (membership/tenant list vẫn từ identity UserTenant.)
- [ ] **Step 5: writes** — register: tạo User/UserCredential vào identity; membership (UserTenant identity) nếu có tenantId; role chức năng → `AppUserRole` (digital_book). changePassword/updateProfile: ghi identity (UserCredential/User). (register hiện super-admin-only — giữ.)
- [ ] **Step 6: Build** `npx nest build auth-service` + chạy auth e2e nếu có (`npx jest apps/auth-service`). Commit.

---

## Task 6: config-service/nguoi-dung repoint (quản lý user)

**Files:** Modify `be/apps/config-service/src/nguoi-dung/nguoi-dung.service.ts` (+ module).

**Interfaces:** CRUD user: User/UserCredential/Membership ghi vào identity (connection 2); role chức năng ghi `app_user_roles` (digital_book). List hiển thị role từ app_user_roles.

- [ ] **Step 1: module** forFeatureIdentity([User,UserCredential,UserTenant]) + forFeature([AppUserRole]).
- [ ] **Step 2: service** — create/update/delete/toggle/addExisting: User/Credential/Membership → identity; role → app_user_roles (create/update); findAll/getStats: role từ app_user_roles. (membership.role ở identity = admin/member; functional role ở app_user_roles.)
- [ ] **Step 3: Build + commit.**

---

## Task 7a: master-data/tenant — CRUD công ty + config + cấp admin

**Files:** Modify `be/apps/master-data-service/src/tenant/tenant.module.ts`, `tenant.service.ts` (constructor + cloneGlossaryFromNganh/findAll/findOne/findBySlug/create/update/updateGlossary/getDashboardBlocks/updateDashboardBlocks/delete/hardDelete/getAllUsers + ensureAdminRole).

**Interfaces:** identity repos (`Tenant/User/UserCredential/UserTenant`) qua connection `'identity'`; `VaiTro/PhanQuyen/Nganh` giữ RAW (digital_book); thêm `AppUserRole` + `TenantAppConfig` (default). Config (`modules/nganh/glossary/dashboardBlocks`) đọc/ghi `TenantAppConfig` (KHÔNG dùng field trên `Tenant` nữa). Cấp admin: membership identity `UserTenant.role='admin'` + functional role `AppUserRole.role='Admin'` + `VaiTro/PhanQuyen` (digital_book) như cũ.

- [ ] **Step 1: module** — `forFeatureIdentity([Tenant, User, UserCredential, UserTenant])` (thay 4 cái khỏi forFeatureRaw); giữ `forFeatureRaw([VaiTro, PhanQuyen, Nganh])`; thêm `forFeature([AppUserRole, TenantAppConfig])`. (Giữ forFeatureIdentity([UserTenant]) cho TenantAdminGuard — gộp vào danh sách identity ở trên.)
- [ ] **Step 2: constructor** — identity repos `@InjectRepository(Tenant,'identity')` v.v.; VaiTro/PhanQuyen/Nganh giữ RAW token; thêm `@InjectRepository(AppUserRole)` + `@InjectRepository(TenantAppConfig)` (default).
- [ ] **Step 3: config → TenantAppConfig** — `findAll`/`findOne` trả `modules/nganh/glossary/dashboardBlocks` đọc từ TenantAppConfig theo `tenant._id.toString()` (không đọc `tenant.modules`...). `create`: tạo Tenant (identity, KHÔNG set modules/glossary/nganh trên Tenant) + tạo 1 row `TenantAppConfig` (modules từ dto || ['KE_TOAN'], nganh, glossary clone từ Nganh). `update`: thông tin định danh → Tenant(identity); modules/nganh → TenantAppConfig (upsert). `updateGlossary`/`getDashboardBlocks`/`updateDashboardBlocks` → TenantAppConfig.
- [ ] **Step 4: cấp admin (create + ensureAdminRole)** — admin user: User/UserCredential/UserTenant(identity), `UserTenant.role='admin'` (membership); functional role → `AppUserRole.role='Admin'` (digital_book); `ensureAdminRole`: VaiTro + PhanQuyen 'Admin' (digital_book, giữ nguyên `generateAllPermissions`). delete/hardDelete: Tenant + memberships(identity) + deactivate AppUserRole + (cleanup TenantAppConfig tuỳ — giữ cũng được).
- [ ] **Step 5: Build** `npx nest build master-data-service` + jest nếu có. Commit.
> `tenant_apps` (entitlement identity) cho công ty mới: để **P3/Portal** xử lý (tối thiểu superAdmin set tay). Không bắt buộc ở 7a.

---

## Task 7b: master-data/tenant — quản lý thành viên

**Files:** Modify `be/apps/master-data-service/src/tenant/tenant.service.ts` (getTenantMembers/addUserToTenant/updateTenantMember/updateMemberProfile/resetMemberPassword/removeTenantMember).

**Interfaces:** User/UserCredential/membership → identity; functional role hiển thị/sửa → `AppUserRole` (digital_book) theo (userId, tenantId). membership identity `UserTenant.role` = admin/member (mặc định 'member' khi thêm; 'admin' nếu set admin công ty).

- [ ] **Step 1:** `getTenantMembers`: membership từ identity; user info từ identity; role hiển thị (`m.role`) → lấy từ AppUserRole theo (userId, tenantId). `addUserToTenant`: User/Cred/membership(identity, role='member'); functional role → AppUserRole (upsert dto.role). `updateTenantMember`: nếu đổi functional role → AppUserRole; nếu đổi admin/member → membership identity. `updateMemberProfile`: User identity. `resetMemberPassword`: UserCredential identity. `removeTenantMember`: soft-delete membership(identity) + deactivate AppUserRole.
- [ ] **Step 2: Build + commit.**

---

## Task 8: DEPLOY P2 (production, tương tác — KHÔNG subagent)

> **Final-review checklist bắt buộc (live DB):**
> - **(I2) Parity _id**: xác nhận `masterceo_identity.users._id == digital_book.users._id` và `…tenants._id` cho cùng thực thể (cut-over đã "giữ _id" — verify lại). Nếu lệch → mọi lookup app_user_roles/tenant_app_config trả null → toàn bộ KIEM_SOAT + modules mặc định.
> - **(8.2) Sau migrate**: COUNT khớp — mọi `user_tenants` → có `app_user_roles`; mọi `tenants` active → có `tenant_app_config` (spot-check modules/nganh/glossary/dashboardBlocks).
> - **(M3) Unique index**: tạo tay index `app_user_roles (userId,tenantId) unique` trên prod (synchronize off): `db.app_user_roles.createIndex({userId:1,tenantId:1},{unique:true})`.
> - **(C1 fix) Smoke**: 1 tenant có module ≠ KE_TOAN (vd KHO) → user vào được endpoint module đó qua gateway (không 403 oan).
> - JWT_SECRET không đổi (token vẫn do ke-toan-so auth-service phát) — chỉ verify env không drift.

- [ ] **8.1 Backup** digital_book + masterceo_identity (mongodump).
- [ ] **8.2 Migrate** (mongosh trên container mongo, idempotent): tạo `app_user_roles` từ `user_tenants` (role chức năng) + `tenant_app_config` từ `tenants` (modules/nganh/glossary/dashboardBlocks) **trong digital_book**. (Identity đã có users/tenants/memberships từ cut-over + P1.) Verify count.
- [ ] **8.3 env** trên server: thêm `IDENTITY_MONGODB_DATABASE=masterceo_identity` vào `env/db.env` ke-toan-so.
- [ ] **8.4 Build + đẩy 10 service** (libs/auth + auth-service + config + master-data đổi → build tất cả) + recreate `digital-book-app` (vì env_file đổi → `docker compose up -d`, KHÔNG chỉ restart — bài học cut-over).
- [ ] **8.5 Verify** (HTTPS): đăng nhập user thường qua Portal → vào Kế toán → menu/quyền đúng (role từ app_user_roles); quản lý user/công ty (tạo/sửa) ghi vào identity + app_user_roles + tenant_app_config; super-admin OK. Kiểm log.
- [ ] **8.6 (sau khi ổn định)** dọn: bỏ field accounting trên `tenants`(identity) đã chuyển; cân nhắc xoá copy `users/user_credentials/user_tenants` thừa trong digital_book (đã chuyển sang app_user_roles + identity là nguồn). → có thể để P4.
> **Rollback:** revert env IDENTITY_MONGODB_DATABASE + redeploy bản BE trước (backup main.js) + `docker compose up -d`. app_user_roles/tenant_app_config là thêm mới (không phá nguồn).

---

## Self-Review
- **Spec coverage (§7,§8,§9 P2):** connection 2 → T1; app_user_roles + tenant_app_config + Tenant slim → T2; migrate → T3,T8; AuthzLoader role từ app_user_roles → T4; auth-service/entitlement/guards repoint → T5; quản lý user → T6; quản lý công ty/thành viên → T7; deploy → T8. phan_quyen giữ digital_book ✓. membership.role(admin/member) ở identity vs functional role(app_user_roles) ✓.
- **Placeholder:** code đầy đủ cho phần mới (connection, entity, AuthzLoader, migrate); phần repoint service dùng bản đồ file:line (Tham chiếu) — implementer sửa theo từng method, đổi nguồn repo + connection. (Refactor diện rộng — chấp nhận mức "repoint theo map" thay vì in lại toàn bộ method.)
- **Non-breaking deploy:** migrate trước; giữ nguồn cũ tới khi verify; recreate container cho env mới (bài học cut-over). ke-toan-so vẫn chạy: identity đã có users/tenants/memberships; app_user_roles/tenant_app_config tạo từ data cũ.
- **Rủi ro:** đa connection + transaction xuyên DB (không có) → eventual; auth toàn hệ → test kỹ libs/auth + verify live user thường; quản lý ghi 2 DB (identity + digital_book role/config) → đảm bảo nhất quán trong từng method.

## Execution
Task 1–7: subagent-driven-development (build/test từng task; nhiều task là repoint theo map — review kỹ tính đúng + non-breaking). Task 8: ops tương tác (backup + migrate + recreate + verify live + rollback).
