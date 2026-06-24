# BE Entitlement Lĩnh Vực (v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chặn truy cập API ở BE theo lĩnh vực (entitlement) công ty được cấp, tập trung tại gateway, giữ nguyên tính config-động của v1 (thêm/đổi lĩnh vực không cần sửa code).

**Architecture:** Gateway là choke point duy nhất thấy full path. Một `ModuleGuard` (APP_GUARD ở gateway) decode JWT mềm, ánh xạ `API path → menuKey` qua collection mới `menu_catalog`, rồi `menuKey → lĩnh vực` qua `LinhVuc.menuKeys` (live), so với `tenant.modules` (live). Logic tra cứu + cache tách ra `EntitlementService`.

**Tech Stack:** NestJS 11, TypeORM + MongoDB, `@app/auth` (JwtService, guards), `@app/entities`, `@app/database`, Jest.

**Spec:** `docs/superpowers/specs/2026-06-24-be-entitlement-linh-vuc-design.md`

## Global Constraints

- Guard phải **mềm**: không token / token lỗi / không `tenantId` → ALLOW (downstream guard xử lý auth). ModuleGuard không bao giờ là tầng auth.
- Path không map menu nào → ALLOW (dùng chung). menuKey chưa gán lĩnh vực → mặc định `KE_TOAN`.
- `tenant.modules` đọc **live** mỗi request; `menu_catalog` + `linh_vuc` cache TTL 60s.
- SuperAdmin nhận biết qua **không có `tenantId`** trong token → ALLOW (không cần email).
- Mã lĩnh vực mặc định fallback: `['KE_TOAN']`.
- Đặt code dùng chung trong `@app/auth`; chỉ **wire** tại `apps/gateway`.
- Tài liệu/seed phải đồng bộ với `fe/src/config/menuCatalog.ts` và `super({ endpoint })` của FE services.

---

### Task 1: Entity `MenuCatalog`

**Files:**
- Create: `be/libs/entities/src/menu-catalog/menu-catalog.entity.ts`
- Create: `be/libs/entities/src/menu-catalog/index.ts`
- Modify: `be/libs/entities/src/index.ts` (thêm export)

**Interfaces:**
- Produces: `class MenuCatalog extends BaseEntity { menuKey: string; label: string; parentLabel: string; apiPrefixes: string[] }`, collection `menu_catalog`.

- [ ] **Step 1: Tạo entity**

`be/libs/entities/src/menu-catalog/menu-catalog.entity.ts`:
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

// Tầng FEATURE: ánh xạ menu (route FE) ↔ API path-prefix (sau gateway).
// Keyed theo tính năng, KHÔNG theo lĩnh vực → thêm/đổi lĩnh vực không đụng tới đây.
@Entity('menu_catalog')
export class MenuCatalog extends BaseEntity {
  @Column({ unique: true })
  menuKey: string; // = key route FE, vd '/danh-muc/hang-hoa-vat-tu'

  @Column()
  label: string;

  @Column({ nullable: true })
  parentLabel: string;

  // API path-prefix (gồm prefix service) mà menu này gọi tới.
  // Rỗng = menu chưa có API (ComingSoon) → không enforce.
  @Column({ type: 'json', default: [] })
  apiPrefixes: string[]; // vd ['/master-data/hang-hoa-vat-tu']
}
```

- [ ] **Step 2: Barrel export**

`be/libs/entities/src/menu-catalog/index.ts`:
```ts
export * from './menu-catalog.entity';
```

- [ ] **Step 3: Thêm vào index tổng**

Trong `be/libs/entities/src/index.ts`, thêm dòng (cạnh `export * from './linh-vuc';`):
```ts
export * from './menu-catalog';
```

- [ ] **Step 4: Verify build**

Run: `cd be && npx tsc -p tsconfig.json --noEmit`
Expected: không lỗi liên quan `MenuCatalog`.

- [ ] **Step 5: Commit**

```bash
git add be/libs/entities/src/menu-catalog be/libs/entities/src/index.ts
git commit -m "feat(be): entity menu_catalog (map menu↔api prefix)"
```

---

### Task 2: `EntitlementService` (tra cứu + cache)

**Files:**
- Create: `be/libs/auth/src/services/entitlement.service.ts`
- Create: `be/libs/auth/src/services/entitlement.service.spec.ts`
- Modify: `be/libs/auth/src/services/index.ts` (thêm export)

**Interfaces:**
- Consumes: `MenuCatalog`, `LinhVuc`, `Tenant` từ `@app/entities`; `DataSource` (TypeORM, global).
- Produces:
  - `resolveOwningCodes(fullPath: string): Promise<string[] | null>` — `null` = path không map menu nào (ALLOW). Mảng = các `code` lĩnh vực sở hữu (luôn ≥1 phần tử; menu chưa gán → `['KE_TOAN']`).
  - `getTenantModules(tenantId: string): Promise<string[]>` — `tenant.modules` hoặc fallback `['KE_TOAN']`.

- [ ] **Step 1: Viết test thất bại**

`be/libs/auth/src/services/entitlement.service.spec.ts`:
```ts
import { EntitlementService } from './entitlement.service';

function makeDataSource(opts: {
  menuCatalog?: any[];
  linhVuc?: any[];
  tenant?: any;
}) {
  const repos: Record<string, any> = {
    MenuCatalog: { find: jest.fn().mockResolvedValue(opts.menuCatalog ?? []) },
    LinhVuc: { find: jest.fn().mockResolvedValue(opts.linhVuc ?? []) },
    Tenant: { findOne: jest.fn().mockResolvedValue(opts.tenant ?? null) },
  };
  return {
    getRepository: (entity: { name: string }) => repos[entity.name],
  } as any;
}

describe('EntitlementService', () => {
  const menuCatalog = [
    { menuKey: '/danh-muc/hang-hoa-vat-tu', apiPrefixes: ['/master-data/hang-hoa-vat-tu'] },
    { menuKey: '/kho/nhap-kho', apiPrefixes: ['/kho/phieu'] },
    { menuKey: '/chung-tu/phieu-nhap', apiPrefixes: [] },
  ];
  const linhVuc = [
    { code: 'KE_TOAN', isActive: true, menuKeys: [] },
    { code: 'KHO', isActive: true, menuKeys: ['/danh-muc/hang-hoa-vat-tu', '/kho/nhap-kho'] },
  ];

  it('trả null khi path không khớp apiPrefix nào', async () => {
    const svc = new EntitlementService(makeDataSource({ menuCatalog, linhVuc }));
    expect(await svc.resolveOwningCodes('/master-data/tai-khoan')).toBeNull();
  });

  it('không nhầm prefix anh em (kho vs khoan-muc)', async () => {
    const svc = new EntitlementService(makeDataSource({
      menuCatalog: [{ menuKey: '/danh-muc/kho', apiPrefixes: ['/master-data/kho'] }],
      linhVuc: [{ code: 'KHO', isActive: true, menuKeys: ['/danh-muc/kho'] }],
    }));
    expect(await svc.resolveOwningCodes('/master-data/khoan-muc')).toBeNull();
  });

  it('khớp prefix + path con → trả code lĩnh vực sở hữu', async () => {
    const svc = new EntitlementService(makeDataSource({ menuCatalog, linhVuc }));
    expect(await svc.resolveOwningCodes('/kho/phieu/123')).toEqual(['KHO']);
  });

  it('menu chưa gán lĩnh vực nào → mặc định KE_TOAN', async () => {
    const svc = new EntitlementService(makeDataSource({
      menuCatalog: [{ menuKey: '/danh-muc/x', apiPrefixes: ['/master-data/x'] }],
      linhVuc,
    }));
    expect(await svc.resolveOwningCodes('/master-data/x')).toEqual(['KE_TOAN']);
  });

  it('apiPrefixes rỗng (ComingSoon) → không enforce (null)', async () => {
    const svc = new EntitlementService(makeDataSource({ menuCatalog, linhVuc }));
    expect(await svc.resolveOwningCodes('/voucher/phieu-nhap')).toBeNull();
  });

  it('getTenantModules trả modules của tenant', async () => {
    const svc = new EntitlementService(makeDataSource({
      tenant: { modules: ['KE_TOAN', 'KHO'] },
    }));
    expect(await svc.getTenantModules('507f1f77bcf86cd799439011')).toEqual(['KE_TOAN', 'KHO']);
  });

  it('getTenantModules fallback KE_TOAN khi rỗng/null', async () => {
    const svc = new EntitlementService(makeDataSource({ tenant: { modules: [] } }));
    expect(await svc.getTenantModules('507f1f77bcf86cd799439011')).toEqual(['KE_TOAN']);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd be && yarn test entitlement.service`
Expected: FAIL — `Cannot find module './entitlement.service'`.

- [ ] **Step 3: Viết implementation tối thiểu**

`be/libs/auth/src/services/entitlement.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MenuCatalog, LinhVuc, Tenant } from '@app/entities';

const CONFIG_TTL_MS = 60_000;

@Injectable()
export class EntitlementService {
  private cache: { at: number; menus: MenuCatalog[]; linhVucs: LinhVuc[] } | null = null;

  constructor(private readonly dataSource: DataSource) {}

  /** null = path không thuộc menu nào (dùng chung). Ngược lại: code lĩnh vực sở hữu (≥1). */
  async resolveOwningCodes(fullPath: string): Promise<string[] | null> {
    const { menus, linhVucs } = await this.loadConfig();

    const matchedKeys = new Set<string>();
    for (const m of menus) {
      const prefixes = m.apiPrefixes ?? [];
      if (prefixes.some((p) => p && this.isPrefix(fullPath, p))) {
        matchedKeys.add(m.menuKey);
      }
    }
    if (matchedKeys.size === 0) return null;

    const codes = new Set<string>();
    for (const lv of linhVucs) {
      if (lv.isActive === false) continue;
      if ((lv.menuKeys ?? []).some((k) => matchedKeys.has(k))) codes.add(lv.code);
    }
    if (codes.size === 0) return ['KE_TOAN'];
    return [...codes];
  }

  async getTenantModules(tenantId: string): Promise<string[]> {
    const { ObjectId } = await import('mongodb');
    const tenant = await this.dataSource
      .getRepository(Tenant)
      .findOne({ where: { _id: new ObjectId(tenantId) as any } });
    const mods = tenant?.modules;
    return mods && mods.length ? mods : ['KE_TOAN'];
  }

  private isPrefix(fullPath: string, prefix: string): boolean {
    return fullPath === prefix || fullPath.startsWith(prefix + '/');
  }

  private async loadConfig(): Promise<{ menus: MenuCatalog[]; linhVucs: LinhVuc[] }> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CONFIG_TTL_MS) {
      return { menus: this.cache.menus, linhVucs: this.cache.linhVucs };
    }
    const menus = await this.dataSource.getRepository(MenuCatalog).find();
    const linhVucs = await this.dataSource.getRepository(LinhVuc).find();
    this.cache = { at: now, menus, linhVucs };
    return { menus, linhVucs };
  }
}
```

- [ ] **Step 4: Thêm export**

Trong `be/libs/auth/src/services/index.ts`, thêm:
```ts
export * from './entitlement.service';
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd be && yarn test entitlement.service`
Expected: PASS (7 test).

- [ ] **Step 6: Commit**

```bash
git add be/libs/auth/src/services/entitlement.service.ts be/libs/auth/src/services/entitlement.service.spec.ts be/libs/auth/src/services/index.ts
git commit -m "feat(be): EntitlementService — map path→lĩnh vực + tenant modules (cache 60s)"
```

---

### Task 3: `ModuleGuard`

**Files:**
- Create: `be/libs/auth/src/guards/module.guard.ts`
- Create: `be/libs/auth/src/guards/module.guard.spec.ts`
- Modify: `be/libs/auth/src/guards/index.ts` (thêm export)

**Interfaces:**
- Consumes: `JwtService.verify(token): DecodedToken` (throw nếu lỗi); `EntitlementService.resolveOwningCodes`, `getTenantModules`.
- Produces: `class ModuleGuard implements CanActivate` — dùng làm `APP_GUARD`.

- [ ] **Step 1: Viết test thất bại**

`be/libs/auth/src/guards/module.guard.spec.ts`:
```ts
import { ForbiddenException } from '@nestjs/common';
import { ModuleGuard } from './module.guard';

function ctx(headers: Record<string, string>, url = '/api/kho/phieu') {
  const req = { headers, originalUrl: url, url };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}

describe('ModuleGuard', () => {
  const entitlement = {
    resolveOwningCodes: jest.fn(),
    getTenantModules: jest.fn(),
  } as any;
  const jwtService = { verify: jest.fn() } as any;
  let guard: ModuleGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new ModuleGuard(jwtService, entitlement);
  });

  it('không token → ALLOW', async () => {
    expect(await guard.canActivate(ctx({}))).toBe(true);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('token lỗi → ALLOW (downstream xử lý)', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
    expect(await guard.canActivate(ctx({ authorization: 'bad' }))).toBe(true);
  });

  it('không tenantId (SuperAdmin/temp) → ALLOW', async () => {
    jwtService.verify.mockReturnValue({ email: 'admin@company.com' });
    expect(await guard.canActivate(ctx({ authorization: 't' }))).toBe(true);
    expect(entitlement.resolveOwningCodes).not.toHaveBeenCalled();
  });

  it('path dùng chung (resolveOwningCodes=null) → ALLOW', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(null);
    expect(await guard.canActivate(ctx({ authorization: 't' }))).toBe(true);
    expect(entitlement.getTenantModules).not.toHaveBeenCalled();
  });

  it('tenant có lĩnh vực sở hữu → ALLOW', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(['KHO']);
    entitlement.getTenantModules.mockResolvedValue(['KE_TOAN', 'KHO']);
    expect(await guard.canActivate(ctx({ authorization: 't' }))).toBe(true);
  });

  it('tenant KHÔNG có lĩnh vực → 403', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(['KHO']);
    entitlement.getTenantModules.mockResolvedValue(['KE_TOAN']);
    await expect(guard.canActivate(ctx({ authorization: 't' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('strip /api prefix khi chuẩn hóa path', async () => {
    jwtService.verify.mockReturnValue({ tenantId: 'tid' });
    entitlement.resolveOwningCodes.mockResolvedValue(null);
    await guard.canActivate(ctx({ authorization: 't' }, '/api/master-data/kho?x=1'));
    expect(entitlement.resolveOwningCodes).toHaveBeenCalledWith('/master-data/kho');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd be && yarn test module.guard`
Expected: FAIL — `Cannot find module './module.guard'`.

- [ ] **Step 3: Viết implementation tối thiểu**

`be/libs/auth/src/guards/module.guard.ts`:
```ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';
import { EntitlementService } from '../services/entitlement.service';
import { DecodedToken } from '../interfaces';

/**
 * Chặn truy cập API theo lĩnh vực (entitlement) công ty được cấp.
 * Đặt làm APP_GUARD tại gateway. Guard MỀM: chỉ enforce khi có token hợp lệ
 * + có tenantId + path thuộc một menu có gán lĩnh vực. Mọi trường hợp khác ALLOW
 * (để guard auth của downstream xử lý).
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly entitlement: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const token = this.extractToken(req);
    if (!token) return true;

    let decoded: DecodedToken;
    try {
      decoded = this.jwtService.verify(token);
    } catch {
      return true; // token lỗi/hết hạn → downstream JwtGuard sẽ trả 401
    }
    if (!decoded?.tenantId) return true; // SuperAdmin/temp token

    const fullPath = this.normalizePath(req);
    const owningCodes = await this.entitlement.resolveOwningCodes(fullPath);
    if (owningCodes === null) return true; // path dùng chung

    const modules = await this.entitlement.getTenantModules(decoded.tenantId);
    if (modules.some((m) => owningCodes.includes(m))) return true;

    throw new ForbiddenException('Lĩnh vực chưa được kích hoạt cho công ty');
  }

  private extractToken(req: Request): string | null {
    const h = req.headers['authorization'];
    if (!h || Array.isArray(h)) return Array.isArray(h) ? h[0] ?? null : null;
    return h.startsWith('Bearer ') ? h.slice(7) : h;
  }

  private normalizePath(req: Request): string {
    const raw = req.originalUrl || req.url || '';
    const path = raw.split('?')[0];
    return path.replace(/^\/api/, '') || '/';
  }
}
```

- [ ] **Step 4: Thêm export**

Trong `be/libs/auth/src/guards/index.ts`, thêm:
```ts
export * from './module.guard';
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd be && yarn test module.guard`
Expected: PASS (7 test).

- [ ] **Step 6: Commit**

```bash
git add be/libs/auth/src/guards/module.guard.ts be/libs/auth/src/guards/module.guard.spec.ts be/libs/auth/src/guards/index.ts
git commit -m "feat(be): ModuleGuard — chặn API theo lĩnh vực (guard mềm tại gateway)"
```

---

### Task 4: Seed `menu_catalog` (mapping KHO)

**Files:**
- Create: `be/apps/master-data-service/src/menu-catalog/menu-catalog.seed.ts`
- Modify: nơi gọi seed của master-data (xem Step 2 — tìm file seed runner hiện có)

**Interfaces:**
- Consumes: `MenuCatalog` entity, `DataSource`.
- Produces: bản ghi `menu_catalog` cho các menuKey thuộc KHO với `apiPrefixes` đúng.

- [ ] **Step 1: Tìm cơ chế seed hiện có của linh_vuc để bắt chước**

Run: `cd be && grep -rln "DEFAULT_LINH_VUC_SEED\|linh-vuc.seed\|\.seed(" apps/master-data-service/src`
Expected: thấy file gọi `DEFAULT_LINH_VUC_SEED` (vd trong `linh-vuc.service.ts` hàm seed onModuleInit). Ghi lại file + cách gọi để Step 3 móc vào cùng chỗ.

- [ ] **Step 2: Tạo dữ liệu seed**

`be/apps/master-data-service/src/menu-catalog/menu-catalog.seed.ts`:
```ts
// Map menuKey → apiPrefixes. Đồng bộ fe/src/config/menuCatalog.ts + super({ endpoint }) FE.
// Chỉ liệt kê menu CÓ API thật (ComingSoon để apiPrefixes: []).
export const MENU_CATALOG_SEED: Array<{
  menuKey: string;
  label: string;
  parentLabel?: string;
  apiPrefixes: string[];
}> = [
  // ===== KHO — kho-service =====
  { menuKey: '/kho/nhap-kho', label: 'Nhập kho', parentLabel: 'Kho', apiPrefixes: ['/kho/phieu'] },
  { menuKey: '/kho/xuat-kho', label: 'Xuất kho', parentLabel: 'Kho', apiPrefixes: ['/kho/phieu'] },
  { menuKey: '/kho/chuyen-kho', label: 'Chuyển kho', parentLabel: 'Kho', apiPrefixes: ['/kho/phieu'] },
  // ===== KHO — danh mục (master-data-service) =====
  { menuKey: '/danh-muc/kho', label: 'Kho', parentLabel: 'Danh mục', apiPrefixes: ['/master-data/kho'] },
  { menuKey: '/danh-muc/hang-hoa-vat-tu', label: 'Hàng hóa vật tư', parentLabel: 'Danh mục', apiPrefixes: ['/master-data/hang-hoa-vat-tu'] },
  { menuKey: '/danh-muc/don-vi-tinh', label: 'Đơn vị tính', parentLabel: 'Danh mục', apiPrefixes: ['/master-data/don-vi-tinh'] },
  { menuKey: '/danh-muc/nhom-vat-tu', label: 'Nhóm vật tư', parentLabel: 'Danh mục', apiPrefixes: ['/master-data/nhom-vat-tu'] },
  // ===== KHO — ComingSoon (chưa có API) =====
  { menuKey: '/chung-tu/phieu-nhap', label: 'Phiếu nhập', parentLabel: 'Chứng từ', apiPrefixes: [] },
  { menuKey: '/chung-tu/phieu-xuat', label: 'Phiếu xuất', parentLabel: 'Chứng từ', apiPrefixes: [] },
];
```

- [ ] **Step 3: Viết hàm seed idempotent (upsert theo menuKey)**

Trong cùng file `menu-catalog.seed.ts`, thêm:
```ts
import { DataSource } from 'typeorm';
import { MenuCatalog } from '@app/entities';

export async function seedMenuCatalog(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(MenuCatalog);
  for (const item of MENU_CATALOG_SEED) {
    const existing = await repo.findOne({ where: { menuKey: item.menuKey } });
    if (existing) {
      existing.label = item.label;
      existing.parentLabel = item.parentLabel ?? null as any;
      existing.apiPrefixes = item.apiPrefixes;
      await repo.save(existing);
    } else {
      await repo.save(repo.create(item));
    }
  }
}
```

- [ ] **Step 4: Móc seed vào runner đã tìm ở Step 1**

Gọi `seedMenuCatalog(this.dataSource)` ngay cạnh chỗ seed `DEFAULT_LINH_VUC_SEED` (cùng module có `DataSource` và đăng ký `MenuCatalog` qua `DatabaseModule.forFeatureRaw`/`forFeature`). Đảm bảo `MenuCatalog` được thêm vào danh sách entity của module seed đó nếu cần.

> Nếu seed linh_vuc nằm trong `LinhVucService` (onModuleInit), import `seedMenuCatalog` và `MenuCatalog`, thêm `MenuCatalog` vào `DatabaseModule.forFeatureRaw([LinhVuc, Tenant, MenuCatalog])` của `linh-vuc.module.ts`, rồi gọi `await seedMenuCatalog(this.dataSource)` sau seed linh_vuc.

- [ ] **Step 5: Chạy seed, kiểm tra dữ liệu**

Run: `cd be && yarn seed` (hoặc khởi động master-data-service nếu seed chạy onModuleInit)
Expected: collection `menu_catalog` có 9 bản ghi; `/danh-muc/hang-hoa-vat-tu` có `apiPrefixes: ['/master-data/hang-hoa-vat-tu']`.

- [ ] **Step 6: Commit**

```bash
git add be/apps/master-data-service/src/menu-catalog be/apps/master-data-service/src/linh-vuc/linh-vuc.module.ts
git commit -m "feat(be): seed menu_catalog mapping lĩnh vực KHO"
```

---

### Task 5: Wire `ModuleGuard` vào Gateway

**Files:**
- Modify: `be/apps/gateway/src/gateway.module.ts`
- Verify env: gateway cần `JWT_SECRET` + cấu hình DB (MongoDB) trong `.env-cmdrc`.

**Interfaces:**
- Consumes: `ModuleGuard`, `EntitlementService` (`@app/auth`); `Tenant`, `LinhVuc`, `MenuCatalog` (`@app/entities`); `DatabaseModule` (`@app/database`); `AuthModule` (`@app/auth`, cung cấp `JwtService` toàn cục).

- [ ] **Step 1: Sửa `gateway.module.ts`**

`be/apps/gateway/src/gateway.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { CoreModule, TenantModule } from '@app/core';
import { AuthModule, EntitlementService, ModuleGuard } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { Tenant, LinhVuc, MenuCatalog } from '@app/entities';
import { controllers } from './controllers';
import { TenantHeaderInterceptor } from './interceptors';

@Module({
  imports: [
    CoreModule,
    TenantModule,
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forFeatureRaw([Tenant, LinhVuc, MenuCatalog]),
  ],
  controllers,
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantHeaderInterceptor },
    EntitlementService,
    { provide: APP_GUARD, useClass: ModuleGuard },
  ],
})
export class GatewayModule {}
```

- [ ] **Step 2: Xác nhận env gateway có DB + JWT_SECRET**

Run: `cd be && grep -n "gateway" .env-cmdrc` rồi kiểm tra block gateway có `JWT_SECRET` và biến kết nối Mongo giống các service khác (so với block `master-data`). Nếu thiếu, thêm các biến DB/JWT giống `master-data`.
Expected: gateway có `JWT_SECRET` + cấu hình Mongo.

- [ ] **Step 3: Build gateway**

Run: `cd be && npx tsc -p apps/gateway/tsconfig.app.json --noEmit` (hoặc `yarn build gateway`)
Expected: không lỗi.

- [ ] **Step 4: Khởi động stack + verify ALLOW (tenant có KHO)**

Run: khởi động `gateway`, `auth`, `master-data`, `kho` (vd `yarn start:gateway:dev` + các service). Đăng nhập tenant **có** KHO, lấy token, gọi:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "authorization: <TOKEN_TENANT_CO_KHO>" http://localhost:3000/api/kho/phieu/stats
```
Expected: `200` (hoặc mã nghiệp vụ bình thường, KHÔNG 403).

- [ ] **Step 5: Verify BLOCK (tenant chỉ KE_TOAN)**

Đăng nhập tenant **chỉ** KE_TOAN, lấy token, gọi cùng endpoint:
```bash
curl -s -w "\n%{http_code}\n" -H "authorization: <TOKEN_TENANT_KE_TOAN>" http://localhost:3000/api/kho/phieu/stats
```
Expected: `403` + message `"Lĩnh vực chưa được kích hoạt cho công ty"`.

- [ ] **Step 6: Verify path dùng chung KHÔNG bị chặn**

Với token tenant chỉ KE_TOAN, gọi 1 API dùng chung:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "authorization: <TOKEN_TENANT_KE_TOAN>" http://localhost:3000/api/master-data/tai-khoan/all
```
Expected: `200` (không nằm trong menu_catalog → ALLOW).

- [ ] **Step 7: Commit**

```bash
git add be/apps/gateway/src/gateway.module.ts be/.env-cmdrc
git commit -m "feat(be): wire ModuleGuard tại gateway — enforce entitlement lĩnh vực"
```

---

## Self-Review (đã rà)

**Spec coverage:**
- §4.1 entity `menu_catalog` → Task 1 ✓
- §4.2 `ModuleGuard` luồng canActivate → Task 3 ✓ (logic tra cứu tách §4.2 bước 4–5 → Task 2 `EntitlementService`)
- §4.3 gateway lấy DB access + cache + đặt guard → Task 5 + Task 2 ✓
- §5 mapping KHO → Task 4 seed ✓
- §6 edge cases (SuperAdmin no-tenantId, path dùng chung, menu chưa gán, ComingSoon rỗng, modules null) → phủ trong test Task 2 + Task 3 ✓
- §7 test → Task 2/3 unit + Task 5 integration (curl) ✓

**Placeholder scan:** không có TBD/“xử lý lỗi phù hợp”; mọi step có code/lệnh cụ thể. Hai chỗ cần engineer xác minh tại chỗ (Task 4 Step 1 tìm seed runner; Task 5 Step 2 env) là *tra cứu codebase*, không phải placeholder logic.

**Type consistency:** `resolveOwningCodes(): Promise<string[] | null>` và `getTenantModules(): Promise<string[]>` dùng nhất quán Task 2 ↔ Task 3. `MenuCatalog.apiPrefixes/menuKey` nhất quán Task 1 ↔ 2 ↔ 4. `DecodedToken.tenantId` khớp `decoded-token.interface.ts`.
