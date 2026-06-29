# MasterCeo SSO — Sub-plan 2: ke-toan-so chấp nhận token Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho backend ke-toan-so **chấp nhận JWT do Identity service phát** (payload chỉ `{sub,email,tenantId}`, không có `vaiTro`/`permissions`) bằng cách **nạp role + quyền từ DB `digital_book` theo `userId`+`tenantId` ngay trong `JwtGuard`. **Additive, không phá vỡ:** token cũ của ke-toan-so (có `vaiTro`) vẫn chạy; login cũ vẫn hoạt động. Chưa đụng FE, chưa gỡ auth cũ, chưa migrate.

**Architecture:** Thêm `AuthzLoaderService` vào `libs/auth` (mirror `EntitlementService`: inject `DataSource`, cache ~30s) để tra `vaiTro` từ `user_tenants` và `permissions` từ `phan_quyen`. `JwtGuard` trở thành async: sau khi verify token, set `id/email/tenantId`, rồi điền `vaiTro`/`permissions` — ưu tiên giá trị có sẵn trong token (token cũ), thiếu thì nạp từ DB (token Identity). Super admin (theo email) → `vaiTro='SUPER_ADMIN'`, `permissions=['*']`. Vì `JwtGuard` chạy ở MỌI service, đăng ký metadata `UserTenant`/`PhanQuyen` toàn cục qua `AuthModule` (@Global).

**Tech Stack:** NestJS 11, TypeORM (mongodb), Jest. Test bằng **mock `DataSource`** (không cần Mongo thật).

## Global Constraints

- **Additive / non-breaking:** KHÔNG đổi hành vi với token cũ (token có `vaiTro`). KHÔNG gỡ/đổi auth-service login hiện tại. KHÔNG đụng FE. KHÔNG migrate dữ liệu.
- **Nguồn role/quyền:** đọc từ `digital_book` (nơi `user_tenants` + `phan_quyen` đang nằm) theo `userId`+`tenantId`. KHÔNG gọi HTTP sang Identity ở sub-plan này.
- **Token Identity contract:** `{ sub, email, tenantId, iat, exp }` (HS256). Không `vaiTro`/`permissions`.
- **JWT_SECRET phải GIỐNG NHAU** giữa ke-toan-so và identity-service thì token mới verify được. Giá trị thống nhất ở sub-plan này: **`your-super-secret-key-change-in-production`** (giá trị ke-toan-so đang dùng trong `.env-cmdrc` → giữ nguyên ke-toan-so, chỉnh identity cho khớp).
- **Super admin:** `SUPER_ADMIN_EMAIL = 'admin@company.com'` → `vaiTro='SUPER_ADMIN'`, `permissions=['*']` (giữ đúng hành vi hiện tại của AdminGuard/loadPermissions).
- **Tra DB không lọc tenant ngầm:** `AuthzLoaderService` dùng `dataSource.getRepository(...)` (RAW, không qua tenant-aware proxy) và truyền `tenantId` tường minh — giống cách `EntitlementService` và auth-service (RAW repo) làm.
- **Mọi service phải có metadata `UserTenant`/`PhanQuyen`:** đăng ký qua `AuthModule` (@Global) để `dataSource.getRepository` không lỗi "No metadata" ở các service ngoài auth-service.
- **Test không cần Mongo:** unit test mock `DataSource`/repository, theo style spec hiện có trong `libs/auth`.

---

## File Structure

```
be/libs/auth/src/
├── services/
│   ├── authz-loader.service.ts        # MỚI: nạp vaiTro + permissions từ DB (cache)
│   ├── authz-loader.service.spec.ts   # MỚI: unit test (mock DataSource)
│   └── index.ts                       # export thêm AuthzLoaderService (nếu có barrel)
├── guards/
│   ├── jwt.guard.ts                   # SỬA: async + enrich vaiTro/permissions
│   └── jwt.guard.spec.ts             # SỬA/THÊM: test enrich từ DB khi token thiếu
├── interfaces/
│   └── decoded-token.interface.ts     # SỬA: vaiTro/permissions optional
└── auth.module.ts                     # SỬA: forFeature([UserTenant,PhanQuyen]) + provide AuthzLoaderService

be/.env-cmdrc                          # (không đổi — đã là 'your-super-secret-key-change-in-production')
identity-service/.env-cmdrc.json       # SỬA (repo khác): JWT_SECRET dev = khớp ke-toan-so
```

---

## Task 1: AuthzLoaderService (nạp vaiTro + permissions từ DB)

**Files:**
- Create: `be/libs/auth/src/services/authz-loader.service.ts`
- Test: `be/libs/auth/src/services/authz-loader.service.spec.ts`
- Modify (nếu có barrel): `be/libs/auth/src/services/index.ts`

**Interfaces:**
- Consumes: `DataSource` (TypeORM, có sẵn global), entities `UserTenant`, `PhanQuyen`, hằng `SUPER_ADMIN_EMAIL` từ `@app/entities`.
- Produces:
  - `interface LoadedAuthz { vaiTro: string; permissions: string[] }`
  - `class AuthzLoaderService` với `async load(userId: string, tenantId: string, email: string): Promise<LoadedAuthz>`:
    - email === SUPER_ADMIN_EMAIL → `{ vaiTro: 'SUPER_ADMIN', permissions: ['*'] }`.
    - ngược lại: `vaiTro` = `user_tenants` (theo userId+tenantId, isActive) `.role` (mặc định `'KIEM_SOAT'` nếu không thấy bản ghi); `permissions` = `phan_quyen` (theo vaiTro+tenantId, isActive) `.permissions` (mặc định `[]`).
    - Cache theo key `userId|tenantId` trong ~30s.
    - Lỗi DB / ObjectId không hợp lệ → fallback an toàn `{ vaiTro: '', permissions: [] }` (không ném lỗi để không chặn request — đúng tinh thần guard hiện tại).

- [ ] **Step 1: Viết test thất bại trước**

`be/libs/auth/src/services/authz-loader.service.spec.ts`:
```ts
import { AuthzLoaderService } from './authz-loader.service';

function fakeDataSource(opts: { userTenant?: any; phanQuyen?: any }) {
  return {
    getRepository: (entity: any) => ({
      findOne: async () => {
        const name = entity?.name || entity;
        if (String(name).includes('UserTenant')) return opts.userTenant ?? null;
        if (String(name).includes('PhanQuyen')) return opts.phanQuyen ?? null;
        return null;
      },
    }),
  } as any;
}

describe('AuthzLoaderService', () => {
  it('super admin theo email → SUPER_ADMIN + [*]', async () => {
    const svc = new AuthzLoaderService(fakeDataSource({}));
    const r = await svc.load('u1', 't1', 'admin@company.com');
    expect(r).toEqual({ vaiTro: 'SUPER_ADMIN', permissions: ['*'] });
  });

  it('user thường → vaiTro từ user_tenants, permissions từ phan_quyen', async () => {
    const svc = new AuthzLoaderService(
      fakeDataSource({
        userTenant: { role: 'Admin' },
        phanQuyen: { permissions: ['/chung-tu/phieu-thu:xem', '/chung-tu/phieu-thu:them'] },
      }),
    );
    const r = await svc.load('u1', 't1', 'user@x.com');
    expect(r.vaiTro).toBe('Admin');
    expect(r.permissions).toContain('/chung-tu/phieu-thu:xem');
  });

  it('không có membership → vaiTro mặc định KIEM_SOAT, permissions []', async () => {
    const svc = new AuthzLoaderService(fakeDataSource({}));
    const r = await svc.load('u1', 't1', 'user@x.com');
    expect(r.vaiTro).toBe('KIEM_SOAT');
    expect(r.permissions).toEqual([]);
  });

  it('cache: lần 2 không gọi lại findOne', async () => {
    let calls = 0;
    const ds: any = {
      getRepository: () => ({ findOne: async () => { calls++; return null; } }),
    };
    const svc = new AuthzLoaderService(ds);
    await svc.load('u1', 't1', 'user@x.com');
    const before = calls;
    await svc.load('u1', 't1', 'user@x.com');
    expect(calls).toBe(before); // hit cache
  });
});
```

- [ ] **Step 2: Chạy để xác nhận fail**

Run: `cd be && yarn jest libs/auth/src/services/authz-loader.service.spec.ts`
Expected: FAIL ("Cannot find module './authz-loader.service'").

- [ ] **Step 3: Implement `authz-loader.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserTenant, PhanQuyen, SUPER_ADMIN_EMAIL } from '@app/entities';

export interface LoadedAuthz {
  vaiTro: string;
  permissions: string[];
}

const TTL_MS = 30_000;

@Injectable()
export class AuthzLoaderService {
  private cache = new Map<string, { at: number; data: LoadedAuthz }>();

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string, tenantId: string, email: string): Promise<LoadedAuthz> {
    if (email === SUPER_ADMIN_EMAIL) {
      return { vaiTro: 'SUPER_ADMIN', permissions: ['*'] };
    }
    const key = `${userId}|${tenantId}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && now - cached.at < TTL_MS) return cached.data;

    let data: LoadedAuthz = { vaiTro: '', permissions: [] };
    try {
      const ut = await this.dataSource
        .getRepository(UserTenant)
        .findOne({ where: { userId, tenantId, isActive: true } as any });
      const vaiTro = ut?.role || 'KIEM_SOAT';
      const pq = await this.dataSource
        .getRepository(PhanQuyen)
        .findOne({ where: { vaiTro, tenantId, isActive: true } as any });
      data = { vaiTro, permissions: pq?.permissions ?? [] };
    } catch {
      data = { vaiTro: '', permissions: [] }; // fallback an toàn
    }
    this.cache.set(key, { at: now, data });
    return data;
  }
}
```
> Lưu ý: `dataSource.getRepository` = RAW repo (không qua tenant-aware proxy), nên truyền `tenantId` tường minh — giống `EntitlementService`. `default 'KIEM_SOAT'` khớp default của `UserTenant.role`.

- [ ] **Step 4: Export (nếu có barrel `services/index.ts`)**

Đọc `be/libs/auth/src/services/index.ts`; nếu tồn tại, thêm:
```ts
export * from './authz-loader.service';
```
(Nếu không có barrel, bỏ qua step này.)

- [ ] **Step 5: Chạy test → PASS**

Run: `cd be && yarn jest libs/auth/src/services/authz-loader.service.spec.ts`
Expected: PASS (4 test).

- [ ] **Step 6: Commit**

```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git add be/libs/auth/src/services/authz-loader.service.ts be/libs/auth/src/services/authz-loader.service.spec.ts be/libs/auth/src/services/index.ts 2>/dev/null
git commit -m "feat(auth): AuthzLoaderService nạp vaiTro+permissions từ DB theo userId+tenantId (cache 30s)"
```

---

## Task 2: JwtGuard enrich từ DB + wire AuthModule + interface optional

**Files:**
- Modify: `be/libs/auth/src/guards/jwt.guard.ts`
- Modify: `be/libs/auth/src/guards/jwt.guard.spec.ts`
- Modify: `be/libs/auth/src/interfaces/decoded-token.interface.ts`
- Modify: `be/libs/auth/src/auth.module.ts`

**Interfaces:**
- Consumes: `JwtService` (sẵn có), `AuthzLoaderService` (Task 1), entities `UserTenant`/`PhanQuyen`.
- Produces: `JwtGuard.canActivate` trả `Promise<boolean>`; `request.user = { id, email, tenantId, vaiTro, permissions }` với `vaiTro`/`permissions` được điền từ token (nếu có) hoặc DB (nếu thiếu). `DecodedToken.vaiTro`/`.permissions` và `UserPayload.vaiTro`/`.permissions` thành **optional**.

- [ ] **Step 1: Sửa interface cho optional**

`be/libs/auth/src/interfaces/decoded-token.interface.ts` — đổi:
```ts
export interface DecodedToken {
  sub: string;
  email: string;
  tenantId: string;
  vaiTro?: string;        // optional: token Identity không có
  permissions?: string[]; // optional: token Identity không có
  iat: number;
  exp: number;
}

export interface UserPayload {
  id: string;
  email: string;
  tenantId: string;
  vaiTro?: string;
  permissions?: string[];
}
```
(Giữ nguyên `TempTokenPayload`/`DecodedTempToken`.)

- [ ] **Step 2: Viết/sửa test JwtGuard (enrich) trước**

`be/libs/auth/src/guards/jwt.guard.spec.ts` — thêm các case (giữ case cũ nếu còn hợp lệ):
```ts
import { JwtGuard } from './jwt.guard';
import { UnauthorizedException } from '@nestjs/common';

function ctx(authHeader?: string) {
  const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('JwtGuard (enrich)', () => {
  const jwtService: any = {
    verifyToken: (t: string) => JSON.parse(Buffer.from(t, 'base64').toString()),
    isTempToken: (d: any) => d?.type === 'temp',
  };

  it('token Identity (thiếu vaiTro/permissions) → enrich từ DB', async () => {
    const authz: any = { load: jest.fn(async () => ({ vaiTro: 'Admin', permissions: ['/x:xem'] })) };
    const guard = new JwtGuard(jwtService, authz);
    const token = Buffer.from(JSON.stringify({ sub: 'u1', email: 'a@b.com', tenantId: 't1' })).toString('base64');
    const c = ctx(`Bearer ${token}`);
    expect(await guard.canActivate(c)).toBe(true);
    const user = c.switchToHttp().getRequest().user;
    expect(authz.load).toHaveBeenCalledWith('u1', 't1', 'a@b.com');
    expect(user).toEqual({ id: 'u1', email: 'a@b.com', tenantId: 't1', vaiTro: 'Admin', permissions: ['/x:xem'] });
  });

  it('token cũ (có vaiTro) → KHÔNG enrich, giữ giá trị token', async () => {
    const authz: any = { load: jest.fn() };
    const guard = new JwtGuard(jwtService, authz);
    const token = Buffer.from(JSON.stringify({ sub: 'u1', email: 'a@b.com', tenantId: 't1', vaiTro: 'KIEM_SOAT', permissions: ['/y:xem'] })).toString('base64');
    const c = ctx(`Bearer ${token}`);
    expect(await guard.canActivate(c)).toBe(true);
    expect(authz.load).not.toHaveBeenCalled();
    expect(c.switchToHttp().getRequest().user.vaiTro).toBe('KIEM_SOAT');
  });

  it('không token → 401', async () => {
    const guard = new JwtGuard(jwtService, { load: jest.fn() } as any);
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```
> Quy ước "token cũ" = có `vaiTro` (string). Token Identity không có `vaiTro` → enrich.

- [ ] **Step 3: Chạy → FAIL**

Run: `cd be && yarn jest libs/auth/src/guards/jwt.guard.spec.ts`
Expected: FAIL (constructor JwtGuard chưa nhận AuthzLoaderService / canActivate chưa async-enrich).

- [ ] **Step 4: Sửa `jwt.guard.ts`**

```ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';
import { AuthzLoaderService } from '../services/authz-loader.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authzLoader: AuthzLoaderService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Yêu cầu token xác thực');
    }

    try {
      const decoded = this.jwtService.verifyToken(token);

      if (this.jwtService.isTempToken(decoded)) {
        throw new UnauthorizedException(
          'Access token required. Temp token is not allowed for this endpoint.',
        );
      }

      let vaiTro = decoded.vaiTro;
      let permissions = decoded.permissions;

      // Token Identity không mang vaiTro → nạp role/quyền từ DB theo userId+tenantId
      if (vaiTro === undefined || vaiTro === null) {
        const authz = await this.authzLoader.load(
          decoded.sub,
          decoded.tenantId,
          decoded.email,
        );
        vaiTro = authz.vaiTro;
        permissions = authz.permissions;
      }

      (request as Request & { user: unknown }).user = {
        id: decoded.sub,
        email: decoded.email,
        tenantId: decoded.tenantId,
        vaiTro,
        permissions: permissions ?? [],
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException((error as Error).message);
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }
}
```

- [ ] **Step 5: Wire `auth.module.ts`** (đăng ký entity metadata toàn cục + provide AuthzLoaderService)

```ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTenant, PhanQuyen } from '@app/entities';
import { JwtService } from './services/jwt.service';
import { AuthzLoaderService } from './services/authz-loader.service';
import { JwtGuard } from './guards/jwt.guard';
import { RoleGuard } from './guards/role.guard';
import { PermissionGuard } from './guards/permission.guard';
import { TenantActiveGuard } from './guards/tenant-active.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserTenant, PhanQuyen])],
  providers: [JwtService, AuthzLoaderService, JwtGuard, RoleGuard, PermissionGuard, TenantActiveGuard],
  exports: [JwtService, AuthzLoaderService, JwtGuard, RoleGuard, PermissionGuard, TenantActiveGuard],
})
export class AuthModule {}
```
> `TypeOrmModule.forFeature([UserTenant, PhanQuyen])` đăng ký metadata 2 entity ở MỌI service (AuthModule @Global) → `dataSource.getRepository` trong AuthzLoaderService không lỗi "No metadata". `autoLoadEntities: true` (DatabaseModule.forRoot) sẽ nạp chúng vào connection.

- [ ] **Step 6: Chạy test guard → PASS**

Run: `cd be && yarn jest libs/auth/src/guards/jwt.guard.spec.ts`
Expected: PASS.

- [ ] **Step 7: Build toàn bộ BE để chắc không vỡ chỗ khác**

Run: `cd be && yarn jest libs/auth` (chạy hết test libs/auth) rồi `npx nest build auth-service && npx nest build voucher` (đại diện 1 service ngoài auth) — đảm bảo AuthModule wiring không vỡ build service không khai báo UserTenant/PhanQuyen.
Expected: build PASS cả hai (xác nhận metadata toàn cục hoạt động).

- [ ] **Step 8: Commit**

```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git add be/libs/auth/src/guards/jwt.guard.ts be/libs/auth/src/guards/jwt.guard.spec.ts be/libs/auth/src/interfaces/decoded-token.interface.ts be/libs/auth/src/auth.module.ts
git commit -m "feat(auth): JwtGuard enrich vaiTro+permissions từ DB khi token Identity thiếu (additive, non-breaking)"
```

---

## Task 3: Đồng bộ JWT_SECRET giữa ke-toan-so và identity-service

**Files:**
- Modify (repo identity-service): `/Users/os_anhvt/Documents/Dino/identity-service/.env-cmdrc.json`
- Doc: ghi chú trong plan này (server env) — KHÔNG sửa server ở task này.

**Interfaces:**
- Produces: identity-service phát token ký bằng **cùng secret** với ke-toan-so → token Identity verify được ở ke-toan-so.

- [ ] **Step 1: Đổi secret dev của identity cho khớp ke-toan-so**

Trong `/Users/os_anhvt/Documents/Dino/identity-service/.env-cmdrc.json`, block `dev`, đổi:
```json
"JWT_SECRET": "your-super-secret-key-change-in-production"
```
(Giá trị này = ke-toan-so `.env-cmdrc` jwt.JWT_SECRET. ke-toan-so KHÔNG đổi.)

- [ ] **Step 2: Verify khớp**

Run:
```bash
grep -A1 '"jwt"' /Users/os_anhvt/Documents/Dino/ke-toan-so/be/.env-cmdrc | grep JWT_SECRET
grep '"JWT_SECRET"' /Users/os_anhvt/Documents/Dino/identity-service/.env-cmdrc.json
```
Expected: cả hai cùng giá trị `your-super-secret-key-change-in-production` (identity còn dòng test/prod riêng — prod để trống, set qua env thật).

- [ ] **Step 3: Commit (repo identity-service)**

```bash
cd /Users/os_anhvt/Documents/Dino/identity-service
git add .env-cmdrc.json
git commit -m "chore(identity): JWT_SECRET dev khớp ke-toan-so để token verify chéo (sub-plan 2)"
git push
```

> **Ghi chú server (làm lúc cut-over, KHÔNG ở task này):** trên server kt, `env/jwt.env` của ke-toan-so và biến `JWT_SECRET` của identity-service phải set CÙNG một giá trị bí mật mạnh (không dùng default). Nếu lệch → token Identity bị 401 ở ke-toan-so.

---

## Self-Review

**Spec coverage (spec §7 "ke-toan-so chỉnh"):**
- "JwtGuard verify JWT Identity (khớp secret)" → Task 3 (secret) + Task 2 (guard verify, đã HS256 sẵn).
- "đọc vaiTro/permissions từ DB theo userId+tenantId thay vì token" → Task 1 (AuthzLoaderService) + Task 2 (guard enrich).
- "phan_quyen giữ nguyên cách nạp" → Task 1 dùng đúng query `{vaiTro,tenantId,isActive}` như `loadPermissions`/`DocPermService`.
- **Ngoài phạm vi sub-plan này (đúng quyết định additive):** bỏ login cũ, FE, gỡ `vaiTro/permissions` khỏi token auth-service cũ, thêm `GET /users/:id`/`/tenants/:id` ở Identity, migrate. Để sub-plan 3–5.

**Placeholder scan:** không có TBD; mọi step có code/lệnh cụ thể.

**Type consistency:** `LoadedAuthz {vaiTro, permissions}` (Task 1) khớp cách JwtGuard dùng (Task 2). `request.user` giữ đúng 5 field `{id,email,tenantId,vaiTro,permissions}` như hiện tại (AdminGuard/PermissionGuard/DocPermService đọc không đổi). `DecodedToken`/`UserPayload` optional khớp việc guard có thể nhận token thiếu vaiTro.

**Non-breaking check:** token cũ (có `vaiTro`) → guard giữ nguyên giá trị token, KHÔNG gọi DB (Task 2 Step 2 test "token cũ"); login cũ + các guard khác (AdminGuard dùng vaiTro, SuperAdminGuard dùng email, ModuleGuard/TenantActiveGuard dùng tenantId — đều còn nguyên trên request.user). PermissionGuard đọc `permissions` — với token Identity giờ được nạp THẬT từ phan_quyen (tốt hơn token cũ vốn `[]`).

---

## Cách verify thủ công (sau khi code xong, tuỳ chọn — cần Mongo)

Vì additive + test mock, có thể smoke nhanh khi có Mongo dev: ký 1 token `{sub,email,tenantId}` bằng secret chung, gọi 1 endpoint ke-toan-so có `@UseGuards(JwtGuard)` + `@Permissions([...])`; xác nhận request qua được và quyền nạp đúng từ `phan_quyen`. End-to-end thật (Identity phát token cho user thật → ke-toan-so chấp nhận) cần migrate → để cut-over.

## Execution
Dùng superpowers:subagent-driven-development. 3 task tuần tự (Task 1 → 2 → 3); Task 2 phụ thuộc Task 1.
