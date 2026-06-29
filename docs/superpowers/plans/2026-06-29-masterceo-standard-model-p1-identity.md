# MasterCeo Mô hình chuẩn — P1: Identity nền chuẩn Implementation Plan

> **For agentic workers:** Task code dùng superpowers:subagent-driven-development. Bước deploy (Task 5) chạy TƯƠNG TÁC (production, đã live). Steps dùng `- [ ]`.

**Goal:** Chuẩn hoá identity-service theo mô hình chuẩn: entitlement **`tenant_apps`** (công ty dùng app nào) thay cho `tenant.apps[]`; `user_tenants.role` đổi sang **`admin`/`member`** (cấp quản trị Portal); **bỏ field riêng Kế toán** (`modules/nganh/glossary/dashboardBlocks`) khỏi identity `Tenant` + `TenantInfo`. Identity chỉ giữ định danh + membership + entitlement.

**Architecture:** identity-service (NestJS, TypeORM mongodb, `masterceo_identity`). Thêm entity `TenantApp`. `platform.service` lọc app theo `tenant_apps` (không theo `tenant.apps`). `TenantInfo` thu gọn `{tenantId,tenantName,tenantSlug}`. Test in-memory (mongodb-memory-server). Có migrate prod + redeploy (live).

**Tech Stack:** NestJS 11, TypeORM(mongodb), Jest+Supertest, mongosh (migrate prod).

## Global Constraints
- Repo `/Users/os_anhvt/Documents/Dino/identity-service`. DB `masterceo_identity`.
- **GIỮ tên collection `user_tenants`** (entity `UserTenant`) để tránh rename vật lý trên data live; chỉ đổi **ý nghĩa `role` = `'admin' | 'member'`** (spec gọi là `memberships` — đây là cùng collection). Ghi rõ deviation này.
- **Entitlement** = collection MỚI `tenant_apps` `{ tenantId, appId, isActive }`. `tenant.apps[]` **ngừng dùng** (xoá field khỏi entity; data cũ dọn ở P4).
- Identity `Tenant` entity: **bỏ** `modules, nganh, glossary, dashboardBlocks, apps`. `TenantInfo` (identity) = `{ tenantId, tenantName, tenantSlug }`.
- superAdmin vẫn theo `SUPER_ADMIN_EMAIL='admin@company.com'` (bypass, thấy mọi app/tenant).
- Token vẫn `{sub,email,tenantId}` — không đổi.
- **Non-breaking khi deploy**: migrate data (tạo tenant_apps từ tenant.apps; set role admin/member) TRƯỚC khi redeploy code đọc tenant_apps.
- Test in-memory, không cần Mongo ngoài. Tasks 1–4 qua subagent; Task 5 ops tương tác.

## File Structure
```
src/entities/tenant-app.entity.ts     # MỚI: TenantApp (tenant_apps)
src/entities/tenant.entity.ts         # SỬA: bỏ modules/nganh/glossary/dashboardBlocks/apps
src/entities/user-tenant.entity.ts    # SỬA: role 'admin'|'member' (default 'member')
src/database/database.module.ts       # SỬA: + TenantApp vào ENTITIES
src/platform/platform.service.ts      # SỬA: entitlement qua tenant_apps; TenantInfo gọn
src/platform/platform.module.ts       # SỬA: + TenantApp forFeature
src/auth/auth.service.ts              # SỬA: buildTenantInfo gọn (bỏ modules/glossary/nganh/apps)
src/scripts/migrate-p1.ts            # MỚI: tenant.apps→tenant_apps; user_tenants.role→admin/member
src/scripts/seed-dev.ts              # SỬA: seed tenant_apps + role admin/member
test/auth.e2e-spec.ts, test/platform.e2e-spec.ts  # SỬA theo entitlement + TenantInfo gọn
```

---

## Task 1: Entity TenantApp + dọn Tenant + role admin/member

**Files:** Create `src/entities/tenant-app.entity.ts`; Modify `src/entities/tenant.entity.ts`, `src/entities/user-tenant.entity.ts`, `src/database/database.module.ts`; Test `src/database/database.module.spec.ts` (cập nhật).

**Interfaces:** Produces `TenantApp { _id, tenantId, appId, isActive }` (collection `tenant_apps`); `Tenant` gọn (name, slug, maSoThue, diaChi, dienThoai, email, nguoiDaiDien, isActive); `UserTenant.role: 'admin'|'member'`.

- [ ] **Step 1: `tenant-app.entity.ts`**
```ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('tenant_apps')
@Index('IDX_tenant_app_unique', ['tenantId', 'appId'], { unique: true })
export class TenantApp extends BaseEntity {
  @Column() tenantId: string;
  @Column() appId: string;
  @Column({ default: true }) isActive: boolean;
}
```

- [ ] **Step 2: `tenant.entity.ts`** — bỏ field Kế toán + apps:
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column() name: string;
  @Column({ unique: true }) slug: string;
  @Column({ unique: true, nullable: true }) maSoThue: string;
  @Column({ nullable: true }) diaChi: string;
  @Column({ nullable: true }) dienThoai: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) nguoiDaiDien: string;
  @Column({ default: true }) isActive: boolean;
}
```
(Bỏ `modules`, `nganh`, `glossary`, `dashboardBlocks`, `apps`. Data cũ trên doc giữ nguyên, dọn ở P4.)

- [ ] **Step 3: `user-tenant.entity.ts`** — role admin/member:
```ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

// "memberships" trong spec = collection user_tenants này (giữ tên vật lý để khỏi migrate rename).
@Entity('user_tenants')
@Index('IDX_user_tenant_unique', ['userId', 'tenantId'], { unique: true })
export class UserTenant extends BaseEntity {
  @Column() userId: string;
  @Column() declare tenantId: string;
  // Cấp quản trị Portal (KHÔNG phải role chức năng của app).
  @Column({ default: 'member' }) role: 'admin' | 'member';
  @Column({ default: true }) isActive: boolean;
}
```

- [ ] **Step 4: `database.module.ts`** — thêm `TenantApp` vào `ENTITIES` (import + mảng forRoot/forFeature).

- [ ] **Step 5: Cập nhật `database.module.spec.ts`** — inject thêm repo `TenantApp` để chắc đăng ký:
```ts
import { TenantApp } from '../entities/tenant-app.entity';
// trong test, thêm:
const taRepo = moduleRef.get<Repository<TenantApp>>(getRepositoryToken(TenantApp));
expect(taRepo).toBeDefined();
```
(Giữ phần startMemoryMongo/stopMemoryMongo sẵn có.)

- [ ] **Step 6: Build + test.** `cd /Users/os_anhvt/Documents/Dino/identity-service && npm run build && npm test -- database.module.spec` → PASS.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "feat(identity): entity TenantApp (entitlement) + Tenant gọn + role admin/member"`

---

## Task 2: platform.service — entitlement qua tenant_apps

**Files:** Modify `src/platform/platform.service.ts`, `src/platform/platform.module.ts`; Modify `test/platform.e2e-spec.ts`.

**Interfaces:**
- Consumes `TenantApp` (Task 1).
- Produces: `listApps(userId)` = app mà user vào được = app active ∈ (union các `tenant_apps` của các công ty user thuộc); super admin → mọi app active. `tenantsForApp(userId, appId)` = công ty user thuộc **và** có `tenant_apps(tenantId,appId,isActive)`; trả `{tenantId,tenantName,tenantSlug}` (gọn).

- [ ] **Step 1: `platform.module.ts`** — thêm `TenantApp` vào `TypeOrmModule.forFeature([...])`.

- [ ] **Step 2: `platform.service.ts`** — viết lại dùng tenant_apps:
```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { User, SUPER_ADMIN_EMAIL } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { App } from '../entities/app.entity';
import { TenantApp } from '../entities/tenant-app.entity';

export interface AppInfo { appId: string; name: string; description?: string; iconUrl?: string; feUrl: string; }
export interface PortalTenantInfo { tenantId: string; tenantName: string; tenantSlug: string; }

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserTenant) private readonly utRepo: Repository<UserTenant>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(App) private readonly appRepo: Repository<App>,
    @InjectRepository(TenantApp) private readonly tenantAppRepo: Repository<TenantApp>,
  ) {}

  private async tenantIdsOf(user: User): Promise<string[]> {
    if (user.email === SUPER_ADMIN_EMAIL) {
      const all = await this.tenantRepo.find({ where: { isActive: true } });
      return all.map((t) => t._id.toString());
    }
    const ms = await this.utRepo.find({ where: { userId: user._id.toString(), isActive: true } });
    return ms.map((m) => m.tenantId);
  }

  /** appId mà user được dùng (entitlement) = các tenant_apps active của các công ty user thuộc. */
  private async enabledAppIds(tenantIds: string[]): Promise<Set<string>> {
    if (!tenantIds.length) return new Set();
    const links = await this.tenantAppRepo.find({ where: { tenantId: { $in: tenantIds } as any, isActive: true } });
    return new Set(links.map((l) => l.appId));
  }

  async listApps(userId: string): Promise<AppInfo[]> {
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(userId) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    const allApps = await this.appRepo.find({ where: { isActive: true } });
    const map = (a: App): AppInfo => ({ appId: a.appId, name: a.name, description: a.description, iconUrl: a.iconUrl, feUrl: a.feUrl });
    if (user.email === SUPER_ADMIN_EMAIL) return allApps.map(map);
    const enabled = await this.enabledAppIds(await this.tenantIdsOf(user));
    return allApps.filter((a) => enabled.has(a.appId)).map(map);
  }

  async tenantsForApp(userId: string, appId: string): Promise<PortalTenantInfo[]> {
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(userId) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    const tenantIds = await this.tenantIdsOf(user);
    if (!tenantIds.length) return [];
    // super admin: mọi tenant; user thường: tenant thuộc. Lọc theo entitlement appId.
    const links = await this.tenantAppRepo.find({ where: { tenantId: { $in: tenantIds } as any, appId, isActive: true } });
    const okIds = new Set(links.map((l) => l.tenantId));
    if (!okIds.size) return [];
    const tenants = await this.tenantRepo.find({ where: { _id: { $in: [...okIds].map((id) => new ObjectId(id)) } as any, isActive: true } });
    return tenants.map((t) => ({ tenantId: t._id.toString(), tenantName: t.name, tenantSlug: t.slug }));
  }
}
```

- [ ] **Step 3: Sửa `test/platform.e2e-spec.ts`** — seed `tenant_apps` thay vì `tenant.apps`:
  - Bỏ `apps: [...]` khi tạo tenant; thay bằng tạo bản ghi `TenantApp`:
```ts
import { TenantApp } from '../src/entities/tenant-app.entity';
// ... get repo:
const tenantApps: Repository<TenantApp> = moduleRef.get(getRepositoryToken(TenantApp));
// sau khi tạo tenant t (apps ke-toan):
await tenantApps.save(tenantApps.create({ tenantId: t._id.toString(), appId: 'ke-toan', isActive: true }));
```
  - Giữ assert: `/me/apps` chứa `ke-toan`, KHÔNG `giao-viec`; `/me/tenants?app=ke-toan` trả tenant đó. (Nay từ entitlement.)
  - Login để lấy cookie vẫn như cũ.

- [ ] **Step 4: Build + e2e.** `npm run build && npm run test:e2e -- platform.e2e-spec` → PASS.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat(identity): platform lọc app theo tenant_apps (entitlement); TenantInfo gọn"`

---

## Task 3: auth.service — TenantInfo gọn

**Files:** Modify `src/auth/auth.service.ts`; Modify `test/auth.e2e-spec.ts`.

**Interfaces:** `TenantInfo` (auth) = `{ tenantId, tenantName, tenantSlug }`. `login`/`selectTenant`/`switchTenant`/`getMe` trả tenant gọn (bỏ modules/glossary/nganh/apps).

- [ ] **Step 1: `auth.service.ts`** — sửa interface + buildTenantInfo:
```ts
export interface TenantInfo { tenantId: string; tenantName: string; tenantSlug: string; }
// ...
private buildTenantInfo(tenant: Tenant): TenantInfo {
  return { tenantId: tenant._id.toString(), tenantName: tenant.name, tenantSlug: tenant.slug };
}
```
(Các nơi gọi buildTenantInfo giữ nguyên; resolveTenants/issueForTenant không đổi logic membership.)

- [ ] **Step 2: Sửa `test/auth.e2e-spec.ts`** — tạo tenant bỏ `apps/modules`; assert tenant gọn:
  - Khi tạo tenant: chỉ `{ name, slug, maSoThue, isActive }` (bỏ modules/apps).
  - Test "login 1 tenant": assert `res.body.data.tenant.tenantId` đúng, `tenant.tenantName` có; (bỏ assert modules/role nếu có).
  - Single-tenant: user chỉ 1 membership → cần membership tồn tại (login dựa membership). Giữ seed user + user_tenants (role 'member').

- [ ] **Step 3: Build + e2e + unit.** `npm run build && npm run test:e2e && npm test` → tất cả PASS.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat(identity): TenantInfo gọn (chỉ định danh) ở auth.service"`

---

## Task 4: Migration script P1 + seed-dev

**Files:** Create `src/scripts/migrate-p1.ts`; Test `src/scripts/migrate-p1.spec.ts`; Modify `src/scripts/seed-dev.ts`.

**Interfaces:** `migrateP1({uri, db, dryRun}): Promise<{tenantAppsCreated, rolesUpdated}>` — với mỗi tenant: mỗi `appId` trong `apps[]` cũ → upsert `tenant_apps`; mỗi `user_tenants`: `role = (cũ ≈ 'Admin' không phân biệt hoa thường ? 'admin' : 'member')`. Idempotent.

- [ ] **Step 1: Test (in-memory) trước** — `src/scripts/migrate-p1.spec.ts`:
```ts
import { MongoClient } from 'mongodb';
import { migrateP1 } from './migrate-p1';
import { startMemoryMongo, stopMemoryMongo } from '../test-utils/mongo-memory';

const DB = 'mp1_test';
describe('migrateP1', () => {
  let client: MongoClient; let uri: string;
  beforeAll(async () => {
    uri = await startMemoryMongo();
    client = await MongoClient.connect(uri);
    const d = client.db(DB);
    await d.collection('tenants').insertOne({ name: 'A', slug: 'a', apps: ['ke-toan', 'giao-viec'] });
    const t2 = await d.collection('tenants').insertOne({ name: 'B', slug: 'b', apps: ['ke-toan'] });
    await d.collection('user_tenants').insertMany([
      { userId: 'u1', tenantId: t2.insertedId.toString(), role: 'Admin', isActive: true },
      { userId: 'u2', tenantId: t2.insertedId.toString(), role: 'KIEM_SOAT', isActive: true },
    ]);
  });
  afterAll(async () => { await client.close(); await stopMemoryMongo(); });

  it('tạo tenant_apps từ apps[] + đổi role admin/member', async () => {
    const r = await migrateP1({ uri, db: DB, dryRun: false });
    const ta = await client.db(DB).collection('tenant_apps').find({}).toArray();
    expect(ta.length).toBe(3); // A:2 + B:1
    const uts = await client.db(DB).collection('user_tenants').find({}).toArray();
    const roles = uts.map((u: any) => u.role).sort();
    expect(roles).toEqual(['admin', 'member']); // Admin→admin, KIEM_SOAT→member
  });

  it('idempotent — chạy lại không nhân đôi tenant_apps', async () => {
    await migrateP1({ uri, db: DB, dryRun: false });
    const ta = await client.db(DB).collection('tenant_apps').countDocuments();
    expect(ta).toBe(3);
  });
});
```

- [ ] **Step 2: Chạy → FAIL.** `npm test -- migrate-p1.spec` → FAIL.

- [ ] **Step 3: `src/scripts/migrate-p1.ts`**
```ts
import 'reflect-metadata';
import { MongoClient } from 'mongodb';

export async function migrateP1(opts: { uri: string; db: string; dryRun: boolean }) {
  const client = await MongoClient.connect(opts.uri);
  let tenantAppsCreated = 0, rolesUpdated = 0;
  try {
    const db = client.db(opts.db);
    const tenants = await db.collection('tenants').find({}).toArray();
    for (const t of tenants) {
      for (const appId of (t.apps || [])) {
        const exists = await db.collection('tenant_apps').findOne({ tenantId: t._id.toString(), appId });
        if (!exists) { if (!opts.dryRun) await db.collection('tenant_apps').insertOne({ tenantId: t._id.toString(), appId, isActive: true, createdAt: new Date(), updatedAt: new Date() }); tenantAppsCreated++; }
      }
    }
    const uts = await db.collection('user_tenants').find({}).toArray();
    for (const ut of uts) {
      const role = String(ut.role || '').trim().toLowerCase() === 'admin' ? 'admin' : 'member';
      if (ut.role !== role) { if (!opts.dryRun) await db.collection('user_tenants').updateOne({ _id: ut._id }, { $set: { role } }); rolesUpdated++; }
    }
    return { tenantAppsCreated, rolesUpdated };
  } finally { await client.close(); }
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  migrateP1({ uri: process.env.MONGODB_URI!, db: process.env.MONGODB_DATABASE!, dryRun })
    .then((r) => { console.log(JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Chạy → PASS.** `npm test -- migrate-p1.spec` → PASS.

- [ ] **Step 5: `seed-dev.ts`** — seed `tenant_apps` thay `tenant.apps`, role 'member'/'admin':
  - Bỏ `apps:[...]` khi upsert tenant; sau khi có tenantId → upsert `tenant_apps` (ctyA→ke-toan; ctyB→ke-toan,giao-viec).
  - user single: membership role 'member'; thêm 1 user admin demo role 'admin' (tuỳ chọn).

- [ ] **Step 6: Build + full test + commit.** `npm run build && npm test` → PASS. `git add -A && git commit -m "feat(identity): migrate-p1 (tenant_apps + role admin/member) + seed-dev cập nhật" && git push`

---

## Task 5: DEPLOY P1 (production, tương tác — KHÔNG subagent)

**Mục tiêu:** áp chuẩn mới lên `masterceo_identity` live + redeploy identity, không gãy Portal.

- [ ] **Step 1: Backup nhẹ identity DB** (collection liên quan):
```bash
ssh kt 'docker exec mongo sh -c "mongodump --uri=\"mongodb://dbadmin:abcde12345-@localhost:27017/masterceo_identity?authSource=admin\" --out=/tmp/mid-p1-backup && tar -C /tmp -czf /tmp/mid-p1-backup.tgz mid-p1-backup"'
```
- [ ] **Step 2: Migrate data (mongosh, idempotent)** — tạo tenant_apps từ tenant.apps + đổi role admin/member (chạy trên container mongo):
```bash
ssh kt 'docker exec -i mongo mongosh "mongodb://dbadmin:abcde12345-@localhost:27017/masterceo_identity?authSource=admin" --quiet' <<'JS'
var taCreated=0, roleUpd=0;
db.tenants.find({}).forEach(function(t){
  (t.apps||[]).forEach(function(appId){
    if(!db.tenant_apps.findOne({tenantId:t._id.toString(),appId:appId})){
      db.tenant_apps.insertOne({tenantId:t._id.toString(),appId:appId,isActive:true,createdAt:new Date(),updatedAt:new Date()}); taCreated++;
    }
  });
});
db.user_tenants.find({}).forEach(function(ut){
  var role = (String(ut.role||"").trim().toLowerCase()==="admin") ? "admin":"member";
  if(ut.role!==role){ db.user_tenants.updateOne({_id:ut._id},{$set:{role:role}}); roleUpd++; }
});
print("tenant_apps created="+taCreated+" roles updated="+roleUpd);
print("tenant_apps total="+db.tenant_apps.countDocuments({}));
JS
```
Expected: tenant_apps total ≥ số tenant (mỗi tenant ≥1 app); roles thành admin/member.
- [ ] **Step 3: Redeploy identity** (code đọc tenant_apps): đẩy source + `redeploy.sh`:
```bash
cd /Users/os_anhvt/Documents/Dino/identity-service
tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=portal/node_modules --exclude=portal/dist -czf - . | ssh kt 'tar -xzf - -C /root/chimseo/identity-service'
ssh kt 'cd /root/chimseo/identity-service && ./redeploy.sh'
```
- [ ] **Step 4: Verify (HTTPS)** — login + /me/apps + /me/tenants vẫn đúng theo entitlement:
```bash
cd /tmp; rm -f cjp1
curl -s -c cjp1 -X POST https://masterceo.com.vn/api/login -H 'Content-Type: application/json' -d '{"email":"admin@company.com","password":"123456"}' -o /dev/null -w "login=%{http_code}\n"
curl -s -b cjp1 https://masterceo.com.vn/api/me/apps | head -c 200; echo
```
Expected: login 200; /me/apps trả app (super admin = mọi app). Thử 1 user thường (mint token hoặc login) → chỉ app công ty họ được entitlement.
- [ ] **Step 5: Hậu kiểm** log identity không lỗi; Portal vào bình thường. Ghi ledger/memory: P1 done.
> **Rollback:** redeploy lại image trước (git checkout commit trước + redeploy); data: tenant_apps là thêm mới (xoá nếu cần), role có backup.

---

## Self-Review
- **Spec coverage (§3,§9 P1):** tenant_apps entitlement → Task1,2; role admin/member → Task1,4; bỏ field Kế toán khỏi identity Tenant/TenantInfo → Task1,2,3; /me/apps theo entitlement → Task2; migrate → Task4,5. (Tách app_user_roles/tenant_app_config + Kế toán đọc identity = **P2**, không thuộc P1.)
- **Placeholder:** không. **Naming deviation** (giữ collection `user_tenants` thay vì rename `memberships`) đã nêu rõ ở Global Constraints.
- **Type consistency:** `TenantApp{tenantId,appId,isActive}` dùng nhất quán entity/service/migrate/test; `TenantInfo`/`PortalTenantInfo` gọn nhất quán platform↔auth; `UserTenant.role:'admin'|'member'` default 'member'.
- **Non-breaking:** Portal hiện đọc /me/apps,/me/tenants — sau Task2 vẫn cùng contract (chỉ nguồn entitlement đổi). Task5 migrate data trước redeploy. Kế toán KHÔNG đụng (đọc digital_book) → P1 an toàn với Kế toán.

## Execution
Task 1–4: superpowers:subagent-driven-development (TDD, in-memory). Task 5: ops tương tác (tôi chạy + verify, có backup + rollback).
