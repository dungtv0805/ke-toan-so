# Sao chép danh mục cross-tenant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho SuperAdmin sao chép toàn bộ 7 danh mục master data từ công ty (tenant) nguồn sang công ty đích qua UI, giữ nguyên nội dung, sinh `_id` mới, idempotent.

**Architecture:** Module SuperAdmin mới `clone-master-data` trong master-data-service, đăng ký 7 entity qua `DatabaseModule.forFeatureRaw` (bypass tenant proxy) để đọc tenant nguồn + ghi tenant đích bằng `tenantId` tường minh. Một registry khai báo danh mục + hàm dedup/remap. FE thêm 1 trang dưới `/cau-hinh` chỉ hiện với SuperAdmin, luồng 2 bước (preview → execute).

**Tech Stack:** NestJS 11, TypeORM (MongoRepository), MongoDB; React 18 + TypeScript + Antd; Jest (unit BE).

## Global Constraints

- Chỉ SuperAdmin (`@UseGuards(JwtGuard, SuperAdminGuard)` từ `@app/auth`; email `admin@company.com`).
- Đọc/ghi cross-tenant BẮT BUỘC dùng raw repo (`DatabaseModule.forFeatureRaw` + token `` `${RAW_REPOSITORY_TOKEN_PREFIX}${EntityName}` `` từ `@app/database`). KHÔNG dùng `forFeature` (sẽ bị proxy lọc theo JWT tenant).
- Chính sách trùng: **bỏ qua** (skip) theo `dedupKey`; không ghi đè. Idempotent.
- Mọi service chung 1 Mongo DB `digital_book`; `Tenant` ở connection `'identity'`.
- BE response bọc `{ success: true, data }`. FE `ServiceBase.get/post` trả thẳng `data`.
- 7 danh mục & khóa dedup (thứ tự xử lý quan trọng — `ho-so-chung-tu` trước `quy-chuan`):
  `tai-khoan`(ma), `ho-so-chung-tu`(ma), `khoan-muc`(ma), `nhom-khoan-muc`(ma),
  `loai-chung-tu`(ma), `loai-giao-dich`(ma), `quy-chuan`(loaiGiaoDich|nghiepVu|taiKhoanNo|taiKhoanCo).
- Remap id: `tai-khoan.parentId` (idMap tai-khoan); `quy-chuan.hoSoChungTu[].id` (idMap ho-so-chung-tu).

---

## File Structure

**Backend** (`be/apps/master-data-service/src/clone-master-data/`)
- `clone-master-data.registry.ts` — Registry thuần (mảng danh mục + dedupKey + remap). Core testable.
- `clone-master-data.registry.spec.ts` — Unit test registry (dedupKey, remap).
- `clone-master-data.service.ts` — `preview()`, `execute()`.
- `clone-master-data.service.spec.ts` — Unit test service (mock raw repos).
- `clone-master-data.controller.ts` — 3 endpoint, guard SuperAdmin.
- `clone-master-data.module.ts` — `forFeatureRaw([...7 entity])` + `forFeatureIdentity([Tenant])`.
- Modify `be/apps/master-data-service/src/master-data-service.module.ts` — thêm `CloneMasterDataModule` vào `imports`.

**Frontend**
- `fe/src/services/cloneMasterDataService.ts` — gọi `/master-data/clone/*` + types.
- `fe/src/pages/cau-hinh/sao-chep-danh-muc/SaoChepDanhMucPage.tsx` — trang 2 bước.
- Modify `fe/src/pages/loadable.tsx` — export `SaoChepDanhMucPage`.
- Modify `fe/src/App.tsx` — import + route `cau-hinh/sao-chep-danh-muc`.
- Modify `fe/src/components/layout/MainLayout.tsx` — menu item gated `isSuperAdmin`.

**Docs**
- Modify `.claude/context/be-api-map.md` — thêm nhóm `/clone`.

---

## Task 1: Registry danh mục (core thuần) + unit test

**Files:**
- Create: `be/apps/master-data-service/src/clone-master-data/clone-master-data.registry.ts`
- Test: `be/apps/master-data-service/src/clone-master-data/clone-master-data.registry.spec.ts`

**Interfaces:**
- Produces: `interface CloneCategory { key:string; label:string; entityName:string; dedupKey:(doc:any)=>string; remap?:(doc:any, idMaps:Record<string,Map<string,string>>)=>void }`
- Produces: `const CLONE_CATEGORIES: CloneCategory[]` (7 entry, đúng thứ tự ở Global Constraints).

- [ ] **Step 1: Viết test thất bại**

```ts
// clone-master-data.registry.spec.ts
import { CLONE_CATEGORIES } from './clone-master-data.registry';

const byKey = (k: string) => CLONE_CATEGORIES.find((c) => c.key === k)!;

describe('CLONE_CATEGORIES', () => {
  it('có đủ 7 danh mục đúng thứ tự, ho-so-chung-tu trước quy-chuan', () => {
    expect(CLONE_CATEGORIES.map((c) => c.key)).toEqual([
      'tai-khoan', 'ho-so-chung-tu', 'khoan-muc', 'nhom-khoan-muc',
      'loai-chung-tu', 'loai-giao-dich', 'quy-chuan',
    ]);
  });

  it('dedupKey tai-khoan theo ma', () => {
    expect(byKey('tai-khoan').dedupKey({ ma: '112' })).toBe('112');
  });

  it('dedupKey quy-chuan ghép 4 trường', () => {
    const k = byKey('quy-chuan').dedupKey({
      loaiGiaoDich: 'PHIEU_THU', nghiepVu: 'A', taiKhoanNo: '111', taiKhoanCo: '511',
    });
    expect(k).toBe('PHIEU_THU|A|111|511');
  });

  it('remap tai-khoan đổi parentId theo idMap', () => {
    const doc: any = { ma: '1121', parentId: 'OLD' };
    const idMaps = { 'tai-khoan': new Map([['OLD', 'NEW']]) };
    byKey('tai-khoan').remap!(doc, idMaps);
    expect(doc.parentId).toBe('NEW');
  });

  it('remap quy-chuan đổi hoSoChungTu[].id theo idMap, giữ ma/ten', () => {
    const doc: any = { hoSoChungTu: [{ id: 'H1', ma: '02', ten: 'Phiếu chi' }] };
    const idMaps = { 'ho-so-chung-tu': new Map([['H1', 'H1new']]) };
    byKey('quy-chuan').remap!(doc, idMaps);
    expect(doc.hoSoChungTu).toEqual([{ id: 'H1new', ma: '02', ten: 'Phiếu chi' }]);
  });
});
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd be && yarn jest clone-master-data.registry --silent`
Expected: FAIL — `Cannot find module './clone-master-data.registry'`.

- [ ] **Step 3: Viết registry**

```ts
// clone-master-data.registry.ts
export interface CloneCategory {
  key: string;
  label: string;
  /** Tên class entity, dùng dựng token raw repo `RAW_<entityName>`. */
  entityName: string;
  /** Khóa chống trùng ở tenant đích. */
  dedupKey: (doc: any) => string;
  /** Sửa tham chiếu id trên doc đã clone trước khi insert (tùy chọn). */
  remap?: (doc: any, idMaps: Record<string, Map<string, string>>) => void;
}

export const CLONE_CATEGORIES: CloneCategory[] = [
  {
    key: 'tai-khoan', label: 'Tài khoản', entityName: 'TaiKhoan',
    dedupKey: (d) => d.ma,
    remap: (doc, idMaps) => {
      const m = idMaps['tai-khoan'];
      if (doc.parentId && m?.has(doc.parentId)) doc.parentId = m.get(doc.parentId);
    },
  },
  { key: 'ho-so-chung-tu', label: 'Biên tập hồ sơ', entityName: 'HoSoChungTu', dedupKey: (d) => d.ma },
  { key: 'khoan-muc', label: 'Khoản mục chi phí', entityName: 'KhoanMuc', dedupKey: (d) => d.ma },
  { key: 'nhom-khoan-muc', label: 'Nhóm khoản mục', entityName: 'NhomKhoanMuc', dedupKey: (d) => d.ma },
  { key: 'loai-chung-tu', label: 'Loại chứng từ', entityName: 'LoaiChungTuMaster', dedupKey: (d) => d.ma },
  { key: 'loai-giao-dich', label: 'Loại giao dịch', entityName: 'LoaiGiaoDich', dedupKey: (d) => d.ma },
  {
    key: 'quy-chuan', label: 'Quy chuẩn hạch toán', entityName: 'QuyChuan',
    dedupKey: (d) => `${d.loaiGiaoDich}|${d.nghiepVu}|${d.taiKhoanNo}|${d.taiKhoanCo}`,
    remap: (doc, idMaps) => {
      const m = idMaps['ho-so-chung-tu'];
      if (Array.isArray(doc.hoSoChungTu) && m) {
        doc.hoSoChungTu = doc.hoSoChungTu.map((el: any) => ({ ...el, id: m.get(el.id) ?? el.id }));
      }
    },
  },
];
```

- [ ] **Step 4: Chạy test để pass**

Run: `cd be && yarn jest clone-master-data.registry --silent`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add be/apps/master-data-service/src/clone-master-data/clone-master-data.registry.ts be/apps/master-data-service/src/clone-master-data/clone-master-data.registry.spec.ts
git commit -m "feat(clone): registry 7 danh mục + dedup/remap"
```

---

## Task 2: CloneMasterDataService (preview + execute) + unit test

**Files:**
- Create: `be/apps/master-data-service/src/clone-master-data/clone-master-data.service.ts`
- Test: `be/apps/master-data-service/src/clone-master-data/clone-master-data.service.spec.ts`

**Interfaces:**
- Consumes: `CLONE_CATEGORIES`, `CloneCategory` (Task 1).
- Produces:
  - `type CategoryRepoMap = Record<string, any>` (entityName → MongoRepository-like).
  - `interface PreviewRow { key:string; label:string; total:number; willInsert:number; willSkip:number }`
  - `interface ResultRow { key:string; label:string; inserted:number; skipped:number; error?:string }`
  - `class CloneMasterDataService` với:
    - `getCategories(): { key:string; label:string }[]`
    - `preview(src:string, dst:string, keys:string[]): Promise<PreviewRow[]>`
    - `execute(src:string, dst:string, keys:string[]): Promise<ResultRow[]>`
  - Constructor (cho test) nhận `(repos: CategoryRepoMap, tenantRepo: { findOneBy:Function })`.
- Lưu ý test: KHÔNG dùng NestТesting; new trực tiếp với mock (theo mẫu `ho-so-chung-tu.service.spec.ts`).

- [ ] **Step 1: Viết test thất bại**

```ts
// clone-master-data.service.spec.ts
import { CloneMasterDataService } from './clone-master-data.service';

// Repo giả lưu mảng docs theo tenantId, hỗ trợ find/save như MongoRepository.
function fakeRepo(initial: any[] = []) {
  const store = [...initial];
  return {
    store,
    find: jest.fn(async ({ where }: any) => store.filter((d) => d.tenantId === where.tenantId)),
    save: jest.fn(async (doc: any) => { store.push(doc); return doc; }),
  };
}
const tenantRepo = { findOneBy: jest.fn(async () => ({})) }; // luôn tồn tại
// validate() dựng new ObjectId(src/dst) → BẮT BUỘC dùng chuỗi 24-hex hợp lệ.
const SRC = '698d593acb5ad81be4c27711';
const DST = '69a2bfcfb324c4058b45ed62';

function svcWith(repos: Record<string, any>) {
  return new CloneMasterDataService(repos as any, tenantRepo as any);
}

describe('CloneMasterDataService', () => {
  it('execute: insert bản mới, skip bản trùng ma, set tenantId đích', async () => {
    const repos = {
      KhoanMuc: fakeRepo([
        { _id: 's1', ma: 'A', ten: 'KM A', tenantId: SRC },
        { _id: 's2', ma: 'B', ten: 'KM B', tenantId: SRC },
        { _id: 'd1', ma: 'A', ten: 'KM A cũ', tenantId: DST }, // trùng ma A
      ]),
    };
    const res = await svcWith(repos).execute(SRC, DST, ['khoan-muc']);
    expect(res[0]).toMatchObject({ key: 'khoan-muc', inserted: 1, skipped: 1 });
    const inserted = repos.KhoanMuc.store.filter((d) => d.tenantId === DST);
    expect(inserted).toHaveLength(2); // d1 cũ + B mới
    expect(inserted.some((d) => d.ma === 'B')).toBe(true);
    expect(repos.KhoanMuc.store.find((d) => d.ma === 'B' && d.tenantId === DST)._id).not.toBe('s2');
  });

  it('execute: remap tai-khoan.parentId sang _id mới', async () => {
    const repos = {
      TaiKhoan: fakeRepo([
        { _id: 'p', ma: '112', ten: 'Cha', parentId: null, tenantId: SRC },
        { _id: 'c', ma: '1121', ten: 'Con', parentId: 'p', tenantId: SRC },
      ]),
    };
    await svcWith(repos).execute(SRC, DST, ['tai-khoan']);
    const dst = repos.TaiKhoan.store.filter((d) => d.tenantId === DST);
    const cha = dst.find((d) => d.ma === '112');
    const con = dst.find((d) => d.ma === '1121');
    expect(con.parentId).toBe(String(cha._id));
    expect(con.parentId).not.toBe('p');
  });

  it('execute: quy-chuan.hoSoChungTu[].id remap theo ho-so-chung-tu (xử lý trước)', async () => {
    const repos = {
      HoSoChungTu: fakeRepo([{ _id: 'h1', ma: '02', ten: 'Phiếu chi', tenantId: SRC }]),
      QuyChuan: fakeRepo([{
        _id: 'q1', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'X', taiKhoanNo: '111', taiKhoanCo: '112',
        hoSoChungTu: [{ id: 'h1', ma: '02', ten: 'Phiếu chi' }], tenantId: SRC,
      }]),
    };
    await svcWith(repos).execute(SRC, DST, ['ho-so-chung-tu', 'quy-chuan']);
    const newHs = repos.HoSoChungTu.store.find((d) => d.tenantId === DST);
    const newQc = repos.QuyChuan.store.find((d) => d.tenantId === DST);
    expect(newQc.hoSoChungTu[0].id).toBe(String(newHs._id));
    expect(newQc.hoSoChungTu[0].ma).toBe('02');
  });

  it('preview: đếm willInsert/willSkip, không ghi', async () => {
    const repos = {
      KhoanMuc: fakeRepo([
        { _id: 's1', ma: 'A', tenantId: SRC },
        { _id: 'd1', ma: 'A', tenantId: DST },
        { _id: 's2', ma: 'B', tenantId: SRC },
      ]),
    };
    const before = repos.KhoanMuc.store.length;
    const rows = await svcWith(repos).preview(SRC, DST, ['khoan-muc']);
    expect(rows[0]).toMatchObject({ total: 2, willInsert: 1, willSkip: 1 });
    expect(repos.KhoanMuc.store.length).toBe(before); // không ghi
  });
});
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd be && yarn jest clone-master-data.service --silent`
Expected: FAIL — `Cannot find module './clone-master-data.service'`.

- [ ] **Step 3: Viết service**

```ts
// clone-master-data.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { Repository } from 'typeorm';
import { CLONE_CATEGORIES, CloneCategory } from './clone-master-data.registry';

export interface PreviewRow { key: string; label: string; total: number; willInsert: number; willSkip: number; }
export interface ResultRow { key: string; label: string; inserted: number; skipped: number; error?: string; }

@Injectable()
export class CloneMasterDataService {
  private readonly logger = new Logger(CloneMasterDataService.name);

  constructor(
    // Map entityName -> raw repo. Inject 7 token rồi gom lại.
    private readonly repos: Record<string, Repository<any>>,
    private readonly tenantRepo: { findOneBy: (w: any) => Promise<any> },
  ) {}

  getCategories() {
    return CLONE_CATEGORIES.map((c) => ({ key: c.key, label: c.label }));
  }

  private selected(keys: string[]): CloneCategory[] {
    const set = new Set(keys);
    const cats = CLONE_CATEGORIES.filter((c) => set.has(c.key));
    const unknown = keys.filter((k) => !CLONE_CATEGORIES.some((c) => c.key === k));
    if (unknown.length) throw new BadRequestException(`Danh mục không hợp lệ: ${unknown.join(', ')}`);
    return cats; // giữ thứ tự registry (đảm bảo ho-so-chung-tu trước quy-chuan)
  }

  private async validate(src: string, dst: string) {
    if (!src || !dst) throw new BadRequestException('Thiếu công ty nguồn/đích');
    if (src === dst) throw new BadRequestException('Công ty nguồn và đích phải khác nhau');
    const [s, d] = await Promise.all([
      this.tenantRepo.findOneBy({ _id: new ObjectId(src) }),
      this.tenantRepo.findOneBy({ _id: new ObjectId(dst) }),
    ]);
    if (!s) throw new BadRequestException('Không tìm thấy công ty nguồn');
    if (!d) throw new BadRequestException('Không tìm thấy công ty đích');
  }

  async preview(src: string, dst: string, keys: string[]): Promise<PreviewRow[]> {
    await this.validate(src, dst);
    const rows: PreviewRow[] = [];
    for (const cat of this.selected(keys)) {
      const repo = this.repos[cat.entityName];
      const [srcDocs, dstDocs] = await Promise.all([
        repo.find({ where: { tenantId: src } }),
        repo.find({ where: { tenantId: dst } }),
      ]);
      const dstKeys = new Set(dstDocs.map((d) => cat.dedupKey(d)));
      const willSkip = srcDocs.filter((d) => dstKeys.has(cat.dedupKey(d))).length;
      rows.push({ key: cat.key, label: cat.label, total: srcDocs.length, willInsert: srcDocs.length - willSkip, willSkip });
    }
    return rows;
  }

  async execute(src: string, dst: string, keys: string[]): Promise<ResultRow[]> {
    await this.validate(src, dst);
    const idMaps: Record<string, Map<string, string>> = {};
    const results: ResultRow[] = [];
    for (const cat of this.selected(keys)) {
      try {
        const repo = this.repos[cat.entityName];
        const [srcDocs, dstDocs] = await Promise.all([
          repo.find({ where: { tenantId: src } }),
          repo.find({ where: { tenantId: dst } }),
        ]);
        const dstByKey = new Map(dstDocs.map((d) => [cat.dedupKey(d), d]));
        // Pass 1: build idMap old _id -> target _id (đích đang có hoặc id mới)
        const idMap = new Map<string, string>();
        for (const doc of srcDocs) {
          const existing = dstByKey.get(cat.dedupKey(doc));
          idMap.set(String(doc._id), existing ? String(existing._id) : String(new ObjectId()));
        }
        idMaps[cat.key] = idMap;
        // Pass 2: insert bản chưa trùng
        let inserted = 0, skipped = 0;
        for (const doc of srcDocs) {
          if (dstByKey.has(cat.dedupKey(doc))) { skipped++; continue; }
          const clone: any = { ...doc, _id: new ObjectId(idMap.get(String(doc._id))), tenantId: dst };
          if (cat.remap) cat.remap(clone, idMaps);
          await repo.save(clone);
          inserted++;
        }
        results.push({ key: cat.key, label: cat.label, inserted, skipped });
      } catch (e: any) {
        this.logger.error(`Clone ${cat.key} lỗi: ${e.message}`);
        results.push({ key: cat.key, label: cat.label, inserted: 0, skipped: 0, error: e.message });
      }
    }
    return results;
  }
}
```

Note (cho người triển khai): `repos` & `tenantRepo` được wire ở module/Task 3 bằng provider factory gom 7 raw repo thành map. Trong unit test ta new trực tiếp với mock — constructor giữ nguyên 2 tham số.

- [ ] **Step 4: Chạy test để pass**

Run: `cd be && yarn jest clone-master-data.service --silent`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add be/apps/master-data-service/src/clone-master-data/clone-master-data.service.ts be/apps/master-data-service/src/clone-master-data/clone-master-data.service.spec.ts
git commit -m "feat(clone): service preview/execute + remap parentId & hoSoChungTu"
```

---

## Task 3: Controller + Module + đăng ký vào master-data-service

**Files:**
- Create: `be/apps/master-data-service/src/clone-master-data/clone-master-data.controller.ts`
- Create: `be/apps/master-data-service/src/clone-master-data/clone-master-data.module.ts`
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`

**Interfaces:**
- Consumes: `CloneMasterDataService` (Task 2), `CLONE_CATEGORIES` (entityName list cho `forFeatureRaw`).
- Produces (HTTP, prefix `/master-data` do gateway strip):
  - `GET /clone/categories` → `{ success, data: {key,label}[] }`
  - `POST /clone/preview` body `{ sourceTenantId, targetTenantId, categories: string[] }` → `{ success, data: PreviewRow[] }`
  - `POST /clone/execute` (cùng body) → `{ success, data: ResultRow[] }`

- [ ] **Step 1: Viết controller**

```ts
// clone-master-data.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard, SuperAdminGuard } from '@app/auth';
import { CloneMasterDataService } from './clone-master-data.service';

interface CloneBody { sourceTenantId: string; targetTenantId: string; categories: string[]; }

@Controller('clone')
@UseGuards(JwtGuard, SuperAdminGuard)
export class CloneMasterDataController {
  constructor(private readonly service: CloneMasterDataService) {}

  @Get('categories')
  getCategories() {
    return { success: true, data: this.service.getCategories() };
  }

  @Post('preview')
  async preview(@Body() body: CloneBody) {
    const data = await this.service.preview(body.sourceTenantId, body.targetTenantId, body.categories ?? []);
    return { success: true, data };
  }

  @Post('execute')
  async execute(@Body() body: CloneBody) {
    const data = await this.service.execute(body.sourceTenantId, body.targetTenantId, body.categories ?? []);
    return { success: true, data };
  }
}
```

- [ ] **Step 2: Viết module (gom 7 raw repo thành map provider)**

```ts
// clone-master-data.module.ts
import { Module } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  TaiKhoan, HoSoChungTu, KhoanMuc, NhomKhoanMuc,
  LoaiChungTuMaster, LoaiGiaoDich, QuyChuan, Tenant,
} from '@app/entities';
import { DatabaseModule, RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { CloneMasterDataController } from './clone-master-data.controller';
import { CloneMasterDataService } from './clone-master-data.service';

const RAW_ENTITIES = [TaiKhoan, HoSoChungTu, KhoanMuc, NhomKhoanMuc, LoaiChungTuMaster, LoaiGiaoDich, QuyChuan];
const rawTokens = RAW_ENTITIES.map((e) => `${RAW_REPOSITORY_TOKEN_PREFIX}${e.name}`);

@Module({
  imports: [
    DatabaseModule.forFeatureRaw(RAW_ENTITIES),
    DatabaseModule.forFeatureIdentity([Tenant]),
  ],
  controllers: [CloneMasterDataController],
  providers: [
    {
      provide: CloneMasterDataService,
      useFactory: (tenantRepo: Repository<Tenant>, ...rawRepos: Repository<any>[]) => {
        const repos: Record<string, Repository<any>> = {};
        RAW_ENTITIES.forEach((e, i) => { repos[e.name] = rawRepos[i]; });
        return new CloneMasterDataService(repos, tenantRepo as any);
      },
      inject: [getRepositoryToken(Tenant, 'identity'), ...rawTokens],
    },
  ],
})
export class CloneMasterDataModule {}
```

Lưu ý wiring: thứ tự `inject` `[tenantToken, ...rawTokens]` PHẢI khớp tham số factory `(tenantRepo, ...rawRepos)`. `rawTokens` đúng thứ tự `RAW_ENTITIES` để map `entityName → repo` chính xác.

- [ ] **Step 3: Đăng ký module**

Trong `be/apps/master-data-service/src/master-data-service.module.ts`, thêm import ở đầu file:
```ts
import { CloneMasterDataModule } from './clone-master-data/clone-master-data.module';
```
và thêm `CloneMasterDataModule,` vào mảng `imports` của `@Module` (cạnh `TenantModule,`).

- [ ] **Step 4: Build kiểm tra biên dịch**

Run: `cd be && npx nest build master-data-service`
Expected: build thành công, không lỗi TS.

- [ ] **Step 5: Chạy lại toàn bộ test clone**

Run: `cd be && yarn jest clone-master-data --silent`
Expected: PASS (9 test của Task 1+2).

- [ ] **Step 6: Commit**

```bash
git add be/apps/master-data-service/src/clone-master-data/clone-master-data.controller.ts be/apps/master-data-service/src/clone-master-data/clone-master-data.module.ts be/apps/master-data-service/src/master-data-service.module.ts
git commit -m "feat(clone): controller + module SuperAdmin, wire vào master-data-service"
```

---

## Task 4: FE service `cloneMasterDataService`

**Files:**
- Create: `fe/src/services/cloneMasterDataService.ts`

**Interfaces:**
- Consumes: `ServiceBase` (`@/services/base/service-base`).
- Produces (singleton `cloneMasterDataService`):
  - `getCategories(): Promise<{key:string;label:string}[]>`
  - `preview(body): Promise<PreviewRow[]>`, `execute(body): Promise<ResultRow[]>`
  - types `CloneCategoryOption`, `CloneBody`, `PreviewRow`, `ResultRow`.

- [ ] **Step 1: Viết service**

```ts
// fe/src/services/cloneMasterDataService.ts
import { ServiceBase } from './base/service-base';

export interface CloneCategoryOption { key: string; label: string; }
export interface CloneBody { sourceTenantId: string; targetTenantId: string; categories: string[]; }
export interface PreviewRow { key: string; label: string; total: number; willInsert: number; willSkip: number; }
export interface ResultRow { key: string; label: string; inserted: number; skipped: number; error?: string; }

class CloneMasterDataService extends ServiceBase {
  constructor() { super({ endpoint: '/master-data/clone' }); }

  getCategories(): Promise<CloneCategoryOption[]> {
    return this.get<CloneCategoryOption[]>({ endpoint: '/categories' });
  }
  preview(body: CloneBody): Promise<PreviewRow[]> {
    return this.post<PreviewRow[]>(body, { endpoint: '/preview' });
  }
  execute(body: CloneBody): Promise<ResultRow[]> {
    return this.post<ResultRow[]>(body, { endpoint: '/execute' });
  }
}

export const cloneMasterDataService = new CloneMasterDataService();
```

- [ ] **Step 2: Kiểm tra typecheck/lint**

Run: `cd fe && npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi liên quan file mới.

- [ ] **Step 3: Commit**

```bash
git add fe/src/services/cloneMasterDataService.ts
git commit -m "feat(clone): FE service gọi /master-data/clone"
```

---

## Task 5: FE trang `SaoChepDanhMucPage` (2 bước)

**Files:**
- Create: `fe/src/pages/cau-hinh/sao-chep-danh-muc/SaoChepDanhMucPage.tsx`

**Interfaces:**
- Consumes: `cloneMasterDataService` (Task 4), `tenantService.getAll()` (`@/services/tenantService`), `useAuth` (`@/contexts/AuthContext`) cho `user.isSuperAdmin`.
- Produces: `export default SaoChepDanhMucPage`.

- [ ] **Step 1: Viết trang**

```tsx
// SaoChepDanhMucPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Card, Select, Checkbox, Button, Table, Alert, Space, Typography, message } from 'antd';
import { tenantService, type Tenant } from '@/services/tenantService';
import {
  cloneMasterDataService, type CloneCategoryOption, type PreviewRow, type ResultRow,
} from '@/services/cloneMasterDataService';

const { Title, Text } = Typography;

export default function SaoChepDanhMucPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [cats, setCats] = useState<CloneCategoryOption[]>([]);
  const [source, setSource] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [checked, setChecked] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [result, setResult] = useState<ResultRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tenantService.getAll().then(setTenants).catch(() => message.error('Không tải được danh sách công ty'));
    cloneMasterDataService.getCategories().then((c) => { setCats(c); setChecked(c.map((x) => x.key)); })
      .catch(() => message.error('Không tải được danh mục'));
  }, []);

  const sameTenant = !!source && source === target;
  const quyChuanWithoutHoSo = checked.includes('quy-chuan') && !checked.includes('ho-so-chung-tu');
  const canPreview = !!source && !!target && !sameTenant && checked.length > 0;

  const body = useMemo(() => ({ sourceTenantId: source!, targetTenantId: target!, categories: checked }),
    [source, target, checked]);

  const doPreview = async () => {
    setLoading(true); setResult(null);
    try { setPreview(await cloneMasterDataService.preview(body)); }
    catch (e: any) { message.error(e?.message || 'Lỗi xem trước'); }
    finally { setLoading(false); }
  };
  const doExecute = async () => {
    setLoading(true);
    try {
      const res = await cloneMasterDataService.execute(body);
      setResult(res); setPreview(null);
      message.success('Đã sao chép xong');
    } catch (e: any) { message.error(e?.message || 'Lỗi sao chép'); }
    finally { setLoading(false); }
  };

  const tenantOpts = tenants.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Sao chép danh mục giữa công ty</Title>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <div>
              <Text>Công ty nguồn</Text><br />
              <Select style={{ width: 360 }} placeholder="Chọn công ty nguồn" options={tenantOpts}
                value={source} onChange={(v) => { setSource(v); setPreview(null); setResult(null); }} showSearch optionFilterProp="label" />
            </div>
            <div>
              <Text>Công ty đích</Text><br />
              <Select style={{ width: 360 }} placeholder="Chọn công ty đích" options={tenantOpts}
                value={target} onChange={(v) => { setTarget(v); setPreview(null); setResult(null); }} showSearch optionFilterProp="label" />
            </div>
          </Space>
          {sameTenant && <Alert type="error" message="Công ty nguồn và đích phải khác nhau" showIcon />}
          <div>
            <Text strong>Danh mục cần sao chép</Text>
            <Checkbox.Group style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}
              options={cats.map((c) => ({ label: c.label, value: c.key }))}
              value={checked} onChange={(v) => { setChecked(v as string[]); setPreview(null); setResult(null); }} />
          </div>
          {quyChuanWithoutHoSo && (
            <Alert type="warning" showIcon
              message="Bạn chọn Quy chuẩn nhưng bỏ Biên tập hồ sơ — nên tick kèm để liên kết hồ sơ chính xác." />
          )}
          <Space>
            <Button type="default" loading={loading} disabled={!canPreview} onClick={doPreview}>Xem trước</Button>
            <Button type="primary" loading={loading} disabled={!preview} onClick={doExecute}>Sao chép</Button>
          </Space>
        </Space>
      </Card>

      {preview && (
        <Card title="Xem trước" style={{ marginTop: 16 }}>
          <Table rowKey="key" pagination={false} dataSource={preview}
            columns={[
              { title: 'Danh mục', dataIndex: 'label' },
              { title: 'Tổng nguồn', dataIndex: 'total' },
              { title: 'Sẽ thêm', dataIndex: 'willInsert' },
              { title: 'Bỏ qua (trùng)', dataIndex: 'willSkip' },
            ]} />
        </Card>
      )}
      {result && (
        <Card title="Kết quả" style={{ marginTop: 16 }}>
          <Table rowKey="key" pagination={false} dataSource={result}
            columns={[
              { title: 'Danh mục', dataIndex: 'label' },
              { title: 'Đã thêm', dataIndex: 'inserted' },
              { title: 'Bỏ qua', dataIndex: 'skipped' },
              { title: 'Lỗi', dataIndex: 'error', render: (e: string) => e || '—' },
            ]} />
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd fe && npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi ở file mới. (Nếu `Tenant` không export type, kiểm tra `@/services/tenantService` đã `export interface Tenant`.)

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/cau-hinh/sao-chep-danh-muc/SaoChepDanhMucPage.tsx
git commit -m "feat(clone): trang Sao chép danh mục (2 bước preview/execute)"
```

---

## Task 6: Wire route + menu (chỉ SuperAdmin)

**Files:**
- Modify: `fe/src/pages/loadable.tsx`
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `SaoChepDanhMucPage` (Task 5).
- Produces: route `/cau-hinh/sao-chep-danh-muc`; menu item gated `user.isSuperAdmin`.

- [ ] **Step 1: Export loadable**

Trong `fe/src/pages/loadable.tsx`, cạnh dòng `export const LinhVucPage = loadable(...)` (~dòng 217), thêm:
```ts
export const SaoChepDanhMucPage = loadable(() => import('./cau-hinh/sao-chep-danh-muc/SaoChepDanhMucPage'), {
  fallback: <PageLoader />
});
```

- [ ] **Step 2: Import + route trong App.tsx**

Thêm `SaoChepDanhMucPage,` vào khối import từ `"./pages/loadable"` (cạnh `LinhVucPage,`).
Trong nhóm `<Route path="cau-hinh">`, sau route `linh-vuc`, thêm:
```tsx
<Route
  path="sao-chep-danh-muc"
  element={<SaoChepDanhMucPage />}
/>
```
(Không bọc `ProtectedRoute` — đồng nhất với route `tenant`; BE đã chặn bằng `SuperAdminGuard`.)

- [ ] **Step 3: Menu item trong MainLayout.tsx**

Sau block menu `linh-vuc` (kết thúc `}] : []),` ~dòng 607), thêm:
```tsx
...(user?.isSuperAdmin ? [{
  key: "sao-chep-danh-muc",
  icon: <CopyOutlined />,
  label: "Sao chép danh mục",
  onClick: () => navigate("/cau-hinh/sao-chep-danh-muc"),
}] : []),
```
Đảm bảo `CopyOutlined` được import từ `@ant-design/icons` ở đầu file (thêm vào danh sách import nếu chưa có).

- [ ] **Step 4: Build FE kiểm tra**

Run: `cd fe && npm run build`
Expected: build thành công.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/loadable.tsx fe/src/App.tsx fe/src/components/layout/MainLayout.tsx
git commit -m "feat(clone): route + menu Sao chép danh mục (SuperAdmin)"
```

---

## Task 7: Cập nhật tài liệu API + manual verify

**Files:**
- Modify: `.claude/context/be-api-map.md`

- [ ] **Step 1: Thêm nhóm endpoint vào be-api-map.md**

Dưới phần Master Data Service (3002), thêm mục:
```markdown
### /clone (Sao chép danh mục cross-tenant — SuperAdmin)
| Method | Path | Description |
|--------|------|-------------|
| GET | /clone/categories | Danh sách danh mục copy được |
| POST | /clone/preview | Xem trước {sourceTenantId,targetTenantId,categories[]} → willInsert/willSkip |
| POST | /clone/execute | Thực thi copy (idempotent, skip trùng) |
```

- [ ] **Step 2: Manual verify trên môi trường chạy (sau deploy/dev)**

Checklist (đăng nhập SuperAdmin `admin@company.com`):
1. Mở `/cau-hinh/sao-chep-danh-muc` — menu chỉ hiện khi là SuperAdmin.
2. Chọn nguồn = 1 công ty có data, đích = công ty trống, tick cả 7 → **Xem trước**: số "Sẽ thêm" khớp số bản ghi nguồn, "Bỏ qua" = 0.
3. **Sao chép** → bảng kết quả `inserted` khớp. Vào trang Tài khoản của công ty đích kiểm tra cây (parent/child) đúng.
4. Bấm **Xem trước** lại lần 2 → toàn bộ "Bỏ qua" = tổng (idempotent), "Sẽ thêm" = 0.
5. Chọn nguồn ≡ đích → nút Xem trước disabled + cảnh báo.

- [ ] **Step 3: Commit**

```bash
git add .claude/context/be-api-map.md
git commit -m "docs(clone): thêm nhóm /clone vào be-api-map"
```

---

## Self-Review Notes

- **Spec coverage:** registry 7 mục (T1) ✓; preview/execute + dedup skip + remap parentId & hoSoChungTu + thứ tự phụ thuộc (T2) ✓; SuperAdminGuard + forFeatureRaw + validate source≠target/tồn tại (T2/T3) ✓; FE 2 bước + dropdown tenant + cảnh báo quy-chuan-thiếu-hoso (T5) ✓; route/menu chỉ SuperAdmin (T6) ✓; idempotent (T2 test + T7 manual) ✓.
- **Deploy:** sau khi merge, build + đẩy `master-data-service` (restart) + FE (nginx) theo skill `db-deploy`. Không cần đổi gateway (route `/master-data/*` đã cover). Không thêm dependency npm mới.
- **Caveat chấp nhận:** nếu user bỏ tick `ho-so-chung-tu` mà copy `quy-chuan`, id nhúng giữ id nguồn (vô hại — FE match theo `ma`, tự lành khi sửa). UI đã cảnh báo.
