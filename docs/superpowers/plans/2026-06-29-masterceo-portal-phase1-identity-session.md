# MasterCeo Portal — Phần 1: Identity session/cookie backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Thêm hạ tầng **session/cookie** vào identity-service để SSO: login đặt cookie phiên httpOnly trên domain gốc; các endpoint chọn app/công ty xác thực bằng cookie; `/auth/refresh` cấp access-token gắn tenant từ cookie; `/auth/logout` xoá phiên.

**Architecture:** Token 2 tầng — *refresh/session token* (cookie `mc_session`, không tenant, ký `JWT_REFRESH_SECRET`, lưu hash ở `user_credentials.refreshToken`) + *access token* (gắn tenant, `JWT_SECRET` chung, như cũ). `SessionGuard` đọc cookie cho `/me/apps`+`/me/tenants` (chọn app/công ty xảy ra trước khi có tenant). Hostname/cookie-domain/CORS đều qua env.

**Tech Stack:** NestJS 11, TypeORM(mongodb), jsonwebtoken, bcrypt, cookie-parser, Jest + Supertest (Mongo in-memory).

## Global Constraints

- Repo: `/Users/os_anhvt/Documents/Dino/identity-service` (đã tồn tại, đã có auth/platform/jwt). KHÔNG `@app/*`.
- **Access token** giữ nguyên: HS256, `JWT_SECRET` (= `your-super-secret-key-change-in-production`, chung ke-toan-so), payload `{sub,email,tenantId}`.
- **Refresh/session token**: payload `{sub,email,type:'refresh'}`, ký `JWT_REFRESH_SECRET` (RIÊNG identity), hết hạn `JWT_REFRESH_EXPIRES_IN` (mặc định `30d`), lưu **hash bcrypt(10)** ở `user_credentials.refreshToken`.
- **Cookie `mc_session`**: `httpOnly`, `sameSite='lax'`, `secure` chỉ khi prod, `domain = process.env.COOKIE_DOMAIN || undefined` (dev để trống → host-only `localhost`, chia sẻ theo host mọi port), `path='/'`, `maxAge` = 30 ngày.
- **CORS**: `credentials: true`; `origin` = `CORS_ORIGINS` (CSV) nếu set, else `true` (reflect — dev). KHÔNG dùng `'*'` khi credentials.
- **Test**: Mongo in-memory (`startMemoryMongo` đã có ở `src/test-utils/mongo-memory.ts`); e2e dùng `request.agent(...)` để giữ cookie.
- Không đụng task-management; không deploy; không migrate.

---

## File Structure (trong identity-service)

```
src/
├── jwt/
│   ├── interfaces.ts            # + DecodedRefreshToken, RefreshPayload
│   ├── jwt.service.ts           # + signRefresh/verifyRefresh
│   └── jwt.service.spec.ts      # + test refresh
├── auth/
│   ├── cookie.util.ts           # MỚI: SESSION_COOKIE, cookieOptions, set/clear
│   ├── session.guard.ts         # MỚI: đọc cookie mc_session
│   ├── session.guard.spec.ts    # MỚI
│   ├── current-user.decorator.ts# SỬA: tenantId optional
│   ├── dto/refresh.dto.ts       # MỚI: RefreshDto{tenantId} + export index
│   ├── auth.service.ts          # + issueRefreshToken, refreshAccessToken, clearSession
│   ├── auth.controller.ts       # SỬA: login set cookie; + refresh; logout clears; (dùng @Res/@Req)
│   └── auth.module.ts           # + SessionGuard provide/export
├── platform/
│   └── platform.controller.ts   # SỬA: @UseGuards(SessionGuard) thay JwtGuard
├── scripts/
│   └── seed-dev.ts              # MỚI: seed dữ liệu giả để dev portal
├── main.ts                      # + cookieParser(); CORS env-driven
└── .env-cmdrc.json              # + JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN, COOKIE_DOMAIN, CORS_ORIGINS
test/
└── session.e2e-spec.ts          # MỚI: e2e cookie flow
package.json                     # + cookie-parser, @types/cookie-parser
```

---

## Task 1: Refresh token trong JwtService

**Files:**
- Modify: `src/jwt/interfaces.ts`
- Modify: `src/jwt/jwt.service.ts`
- Modify: `src/jwt/jwt.service.spec.ts`
- Modify: `.env-cmdrc.json`

**Interfaces:**
- Produces: `JwtService.signRefresh({id,email}): string`, `JwtService.verifyRefresh(token): DecodedRefreshToken`; `DecodedRefreshToken { sub; email; type:'refresh'; iat; exp }`.

- [ ] **Step 1: Thêm test thất bại** vào `src/jwt/jwt.service.spec.ts`:
```ts
describe('JwtService refresh', () => {
  const svc = new JwtService();
  it('signRefresh tạo token type=refresh, verifyRefresh đọc được', () => {
    const t = svc.signRefresh({ id: 'u1', email: 'a@b.com' });
    const d = svc.verifyRefresh(t);
    expect(d.sub).toBe('u1'); expect(d.email).toBe('a@b.com'); expect(d.type).toBe('refresh');
  });
  it('verifyRefresh từ chối access token (không type refresh)', () => {
    const access = svc.sign({ id: 'u1', email: 'a@b.com', tenantId: 't1' });
    expect(() => svc.verifyRefresh(access)).toThrow();
  });
  it('verify (access) từ chối refresh token (khác secret)', () => {
    const r = svc.signRefresh({ id: 'u1', email: 'a@b.com' });
    expect(() => svc.verify(r)).toThrow();
  });
});
```

- [ ] **Step 2: Chạy → FAIL.** `cd /Users/os_anhvt/Documents/Dino/identity-service && npm test -- jwt.service.spec` → FAIL (signRefresh chưa có).

- [ ] **Step 3: `interfaces.ts`** thêm:
```ts
export interface RefreshPayload { id: string; email: string; }
export interface DecodedRefreshToken { sub: string; email: string; type: 'refresh'; iat: number; exp: number; }
```

- [ ] **Step 4: `jwt.service.ts`** — thêm field + 2 method (giữ phần cũ nguyên):
```ts
// thêm import:
import { DecodedToken, UserPayload, TempTokenPayload, DecodedTempToken, RefreshPayload, DecodedRefreshToken } from './interfaces';
// thêm trong class, cạnh các field:
private readonly refreshSecret = process.env.JWT_REFRESH_SECRET || 'masterceo-refresh-secret-change-in-production';
private readonly refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
// thêm method:
signRefresh(payload: RefreshPayload): string {
  return jwt.sign({ sub: payload.id, email: payload.email, type: 'refresh' }, this.refreshSecret, { expiresIn: this.refreshExpiresIn as any });
}
verifyRefresh(token: string): DecodedRefreshToken {
  let decoded: DecodedRefreshToken;
  try { decoded = jwt.verify(token, this.refreshSecret) as DecodedRefreshToken; }
  catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new Error('Phiên đã hết hạn');
    if (error instanceof jwt.JsonWebTokenError) throw new Error('Phiên không hợp lệ');
    throw error;
  }
  if (decoded.type !== 'refresh') throw new Error('Loại token không hợp lệ');
  return decoded;
}
```

- [ ] **Step 5: `.env-cmdrc.json`** — thêm vào block `dev` và `test` (giữ các key cũ):
```
"JWT_REFRESH_SECRET": "masterceo-refresh-secret-dev",
"JWT_REFRESH_EXPIRES_IN": "30d",
"COOKIE_DOMAIN": "",
"CORS_ORIGINS": ""
```
(prod để trống — set lúc deploy.)

- [ ] **Step 6: Chạy → PASS.** `npm test -- jwt.service.spec` → PASS.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "feat(identity): refresh/session token (signRefresh/verifyRefresh, JWT_REFRESH_SECRET)"`

---

## Task 2: Cookie util + SessionGuard + cookie-parser + CORS env

**Files:**
- Create: `src/auth/cookie.util.ts`
- Create: `src/auth/session.guard.ts`
- Create: `src/auth/session.guard.spec.ts`
- Modify: `src/auth/current-user.decorator.ts`
- Modify: `src/main.ts`
- Modify: `package.json` (deps)

**Interfaces:**
- Consumes: `JwtService.verifyRefresh` (Task 1).
- Produces: `SESSION_COOKIE='mc_session'`, `cookieOptions()`, `setSessionCookie(res,token)`, `clearSessionCookie(res)`; `SessionGuard` (đọc cookie → `request.user={id,email}`); `CurrentUserPayload.tenantId?` optional.

- [ ] **Step 1: Cài deps.** `cd /Users/os_anhvt/Documents/Dino/identity-service && npm install cookie-parser && npm install -D @types/cookie-parser`

- [ ] **Step 2: `cookie.util.ts`**:
```ts
import { Response } from 'express';
export const SESSION_COOKIE = 'mc_session';
export function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd,
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}
export function clearSessionCookie(res: Response): void {
  const { maxAge: _ignore, ...opts } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, opts);
}
```

- [ ] **Step 3: Test SessionGuard thất bại** — `src/auth/session.guard.spec.ts`:
```ts
import { UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';
import { JwtService } from '../jwt/jwt.service';
import { SESSION_COOKIE } from './cookie.util';

function ctx(cookieVal?: string) {
  const req: any = { cookies: cookieVal ? { [SESSION_COOKIE]: cookieVal } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}
describe('SessionGuard', () => {
  const jwt = new JwtService();
  const guard = new SessionGuard(jwt);
  it('không cookie → 401', () => { expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException); });
  it('cookie hợp lệ → set request.user {id,email}', () => {
    const t = jwt.signRefresh({ id: 'u1', email: 'a@b.com' });
    const c = ctx(t);
    expect(guard.canActivate(c)).toBe(true);
    expect(c.switchToHttp().getRequest().user).toEqual({ id: 'u1', email: 'a@b.com' });
  });
  it('access token trong cookie → 401 (không phải refresh)', () => {
    const access = jwt.sign({ id: 'u1', email: 'a@b.com', tenantId: 't1' });
    expect(() => guard.canActivate(ctx(access))).toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 4: Chạy → FAIL.** `npm test -- session.guard.spec` → FAIL.

- [ ] **Step 5: `session.guard.ts`**:
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';
import { SESSION_COOKIE } from './cookie.util';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Thiếu phiên đăng nhập');
    let decoded;
    try { decoded = this.jwtService.verifyRefresh(token); }
    catch (e) { throw new UnauthorizedException((e as Error).message); }
    req.user = { id: decoded.sub, email: decoded.email };
    return true;
  }
}
```

- [ ] **Step 6: `current-user.decorator.ts`** — `tenantId` optional (để dùng được cả khi session không có tenant):
```ts
export interface CurrentUserPayload { id: string; email: string; tenantId?: string; }
```

- [ ] **Step 7: `main.ts`** — thêm cookie-parser + CORS env (thay dòng enableCors cũ):
```ts
import cookieParser from 'cookie-parser';
// ... trong bootstrap, trước enableCors:
app.use(cookieParser());
const corsOrigins = process.env.CORS_ORIGINS;
app.enableCors({
  origin: corsOrigins ? corsOrigins.split(',').map((s) => s.trim()) : true,
  credentials: true,
});
```
(Nếu `import cookieParser from 'cookie-parser'` lỗi esModuleInterop, dùng `import * as cookieParser from 'cookie-parser'`.)

- [ ] **Step 8: Chạy → PASS.** `npm test -- session.guard.spec` → PASS. `npm run build` → no TS errors.

- [ ] **Step 9: Commit.** `git add -A && git commit -m "feat(identity): cookie util + SessionGuard + cookie-parser + CORS env-driven"`

---

## Task 3: AuthService session methods

**Files:**
- Modify: `src/auth/auth.service.ts`
- Create: `src/auth/dto/refresh.dto.ts` + cập nhật `src/auth/dto/index.ts`

**Interfaces:**
- Consumes: `JwtService.signRefresh/verifyRefresh`, repos đã inject, `issueForTenant` (private, cùng class).
- Produces:
  - `AuthService.issueRefreshToken(userId: string, email: string): Promise<string>` — mint refresh, lưu hash vào cred, trả raw.
  - `AuthService.refreshAccessToken(refreshRaw: string, tenantId: string): Promise<{accessToken,tenant,user}>` — verify cookie token + đối chiếu hash + issueForTenant.
  - `AuthService.clearSession(userId: string): Promise<{message}>` — xoá refreshToken hash.
  - `RefreshDto { tenantId: string }`.

- [ ] **Step 1: `dto/refresh.dto.ts`**:
```ts
import { IsNotEmpty, IsString } from 'class-validator';
export class RefreshDto { @IsString() @IsNotEmpty() tenantId: string; }
```
Thêm vào `dto/index.ts`: `export * from './refresh.dto';`

- [ ] **Step 2: Thêm 3 method vào `auth.service.ts`** (cuối class, trước `}` đóng class; `bcrypt`, `UnauthorizedException`, `ObjectId`, `UserStatus`, `SALT_ROUNDS` đã import sẵn):
```ts
async issueRefreshToken(userId: string, email: string): Promise<string> {
  const token = this.jwtService.signRefresh({ id: userId, email });
  const cred = await this.credRepo.findOne({ where: { userId, isActive: true } });
  if (cred) {
    cred.refreshToken = await bcrypt.hash(token, SALT_ROUNDS);
    await this.credRepo.save(cred);
  }
  return token;
}

async refreshAccessToken(refreshRaw: string, tenantId: string) {
  let decoded;
  try { decoded = this.jwtService.verifyRefresh(refreshRaw); }
  catch (e) { throw new UnauthorizedException((e as Error).message); }
  const user = await this.userRepo.findOne({ where: { _id: new ObjectId(decoded.sub) as any } });
  if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
  if (user.trangThai !== UserStatus.HOAT_DONG) throw new UnauthorizedException('Tài khoản đã bị khóa');
  const cred = await this.credRepo.findOne({ where: { userId: user._id.toString(), isActive: true } });
  if (!cred?.refreshToken || !(await bcrypt.compare(refreshRaw, cred.refreshToken))) {
    throw new UnauthorizedException('Phiên không hợp lệ');
  }
  return this.issueForTenant(user, tenantId);
}

async clearSession(userId: string) {
  const cred = await this.credRepo.findOne({ where: { userId, isActive: true } });
  if (cred) { cred.refreshToken = undefined; await this.credRepo.save(cred); }
  return { message: 'Đăng xuất thành công' };
}
```

- [ ] **Step 3: Build.** `npm run build` → no TS errors. (Test hành vi ở Task 4 qua e2e.)

- [ ] **Step 4: Commit.** `git add -A && git commit -m "feat(identity): AuthService issueRefreshToken/refreshAccessToken/clearSession + RefreshDto"`

---

## Task 4: Controller wiring + e2e cookie flow

**Files:**
- Modify: `src/auth/auth.controller.ts`
- Modify: `src/auth/auth.module.ts`
- Modify: `src/platform/platform.controller.ts`
- Create: `test/session.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 1-3 + `setSessionCookie/clearSessionCookie/SESSION_COOKIE`, `SessionGuard`.
- Produces (HTTP):
  - `POST /login` → set cookie `mc_session` + body `{success,data}` (như cũ).
  - `GET /me/apps`, `GET /me/tenants?app` → dùng `SessionGuard` (cookie).
  - `POST /auth/refresh` (đọc cookie) body `{tenantId}` → `{success,data:{accessToken,tenant,user}}`.
  - `POST /auth/logout` (SessionGuard) → clear cookie + `{success,data:{message}}`.

- [ ] **Step 1: `auth.controller.ts`** — sửa imports + login + thêm refresh + sửa logout:
```ts
import { Controller, Post, Get, Put, Body, Req, Res, UseGuards, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { SessionGuard } from './session.guard';
import { CurrentUser, CurrentUserPayload } from './current-user.decorator';
import { setSessionCookie, clearSessionCookie, SESSION_COOKIE } from './cookie.util';
import { LoginDto, RegisterDto, SelectTenantDto, SwitchTenantDto, VerifyTokenDto, ChangePasswordDto, UpdateProfileDto, RefreshDto } from './dto';
```
Sửa `login`:
```ts
  @Post('login') @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(dto);
    const refresh = await this.authService.issueRefreshToken(data.user.id, data.user.email);
    setSessionCookie(res, refresh);
    return { success: true, data };
  }
```
Thêm `refresh` (đặt cạnh select-tenant):
```ts
  @Post('refresh') @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Body() dto: RefreshDto) {
    const token = (req as any).cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Thiếu phiên đăng nhập');
    return { success: true, data: await this.authService.refreshAccessToken(token, dto.tenantId) };
  }
```
Thay `logout` (bỏ JwtGuard → SessionGuard + clear cookie):
```ts
  @Post('logout') @UseGuards(SessionGuard) @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: CurrentUserPayload, @Res({ passthrough: true }) res: Response) {
    await this.authService.clearSession(user.id);
    clearSessionCookie(res);
    return { success: true, data: { message: 'Đăng xuất thành công' } };
  }
```
(Các route khác giữ nguyên.)

- [ ] **Step 2: `auth.module.ts`** — provide+export `SessionGuard`:
```ts
import { SessionGuard } from './session.guard';
// providers: [AuthService, JwtService, JwtGuard, SessionGuard],
// exports: [JwtService, JwtGuard, SessionGuard],
```

- [ ] **Step 3: `platform.controller.ts`** — đổi guard sang SessionGuard:
```ts
import { SessionGuard } from '../auth/session.guard';
// @Controller('me')
// @UseGuards(SessionGuard)
```
(Bỏ import JwtGuard. `listApps`/`tenantsForApp` chỉ dùng `user.id` nên session đủ.)

- [ ] **Step 4: e2e thất bại** — `test/session.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User, UserStatus } from '../src/entities/user.entity';
import { UserCredential } from '../src/entities/user-credential.entity';
import { UserTenant } from '../src/entities/user-tenant.entity';
import { Tenant } from '../src/entities/tenant.entity';
import { App } from '../src/entities/app.entity';
import { startMemoryMongo, stopMemoryMongo } from '../src/test-utils/mongo-memory';

describe('Session/cookie (e2e)', () => {
  let app: INestApplication; let tenantId: string;
  beforeAll(async () => {
    await startMemoryMongo('masterceo_identity_test');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    const users: Repository<User> = moduleRef.get(getRepositoryToken(User));
    const creds: Repository<UserCredential> = moduleRef.get(getRepositoryToken(UserCredential));
    const uts: Repository<UserTenant> = moduleRef.get(getRepositoryToken(UserTenant));
    const tenants: Repository<Tenant> = moduleRef.get(getRepositoryToken(Tenant));
    const apps: Repository<App> = moduleRef.get(getRepositoryToken(App));
    await apps.save(apps.create({ appId: 'ke-toan', name: 'Kế toán', feUrl: 'http://localhost:5173', isActive: true }));
    const t = await tenants.save(tenants.create({ name: 'Cty A', slug: 'cty-a', maSoThue: '0100000001', isActive: true, modules: ['KE_TOAN'], apps: ['ke-toan'] }));
    tenantId = t._id.toString();
    const u = await users.save(users.create({ email: 's@test.com', hoTen: 'S', trangThai: UserStatus.HOAT_DONG, isActive: true }));
    await creds.save(creds.create({ userId: u._id.toString(), password: await bcrypt.hash('123456', 10), isActive: true }));
    await uts.save(uts.create({ userId: u._id.toString(), tenantId, role: 'KIEM_SOAT', isActive: true }));
  });
  afterAll(async () => { await app.close(); await stopMemoryMongo(); });

  it('login set cookie mc_session', async () => {
    const res = await request(app.getHttpServer()).post('/login').send({ email: 's@test.com', password: '123456' }).expect(200);
    const setCookie = res.headers['set-cookie'];
    expect(String(setCookie)).toContain('mc_session=');
  });

  it('/me/apps cần cookie: agent giữ cookie → 200; không cookie → 401', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/login').send({ email: 's@test.com', password: '123456' }).expect(200);
    const ok = await agent.get('/me/apps').expect(200);
    expect(ok.body.data.map((a: any) => a.appId)).toContain('ke-toan');
    await request(app.getHttpServer()).get('/me/apps').expect(401);
  });

  it('/auth/refresh đổi cookie lấy access-token gắn tenant', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/login').send({ email: 's@test.com', password: '123456' }).expect(200);
    const r = await agent.post('/auth/refresh').send({ tenantId }).expect(200);
    expect(r.body.data.accessToken).toBeDefined();
    expect(r.body.data.tenant.tenantId).toBe(tenantId);
  });

  it('refresh với tenant không thuộc → 403', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/login').send({ email: 's@test.com', password: '123456' }).expect(200);
    await agent.post('/auth/refresh').send({ tenantId: '6a4218890c2d5e374ab7afff' }).expect(403);
  });

  it('logout xoá cookie → refresh sau đó 401', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/login').send({ email: 's@test.com', password: '123456' }).expect(200);
    await agent.post('/auth/logout').expect(200);
    await agent.post('/auth/refresh').send({ tenantId }).expect(401);
  });
});
```
> Lưu ý route: `/auth/refresh` & `/auth/logout` — controller `@Controller()` (không prefix) nên path là `/refresh`, `/logout`? KHÔNG: hiện AuthController `@Controller()` → `@Post('refresh')` = `/refresh`. Để khớp test ở trên dùng `/auth/refresh`, đặt path decorator là `@Post('auth/refresh')` và `@Post('auth/logout')`, HOẶC sửa test thành `/refresh`,`/logout`. **Chọn: giữ path trần `/refresh`, `/logout`** và sửa test gọi `/refresh`, `/logout` cho khớp các route hiện có (login ở `/login`). Cập nhật test: `agent.post('/refresh')`, `agent.post('/logout')`.

- [ ] **Step 5: Chạy e2e → GREEN.** `npm run test:e2e -- session.e2e-spec` → PASS. Cũng chạy lại `npm run test:e2e -- platform.e2e-spec` — **sẽ FAIL** vì platform e2e cũ dùng Bearer token cho /me/apps (giờ là cookie). **Sửa platform.e2e-spec** dùng `request.agent` + login (set cookie) thay vì `Authorization: Bearer` (đổi phần lấy token thành login bằng agent, gọi /me/apps & /me/tenants qua agent). Chạy lại → PASS.

- [ ] **Step 6: Build + full test.** `npm run build` và `npm test` và `npm run test:e2e` → tất cả PASS.

- [ ] **Step 7: Commit.** `git add -A && git commit -m "feat(identity): login set cookie + /refresh + /logout + /me dùng SessionGuard (cookie SSO)"`

---

## Task 5: Script seed-dev (dữ liệu giả cho dev portal)

**Files:**
- Create: `src/scripts/seed-dev.ts`

**Interfaces:**
- Produces: chạy `env-cmd -e dev ts-node src/scripts/seed-dev.ts` → seed vào `masterceo_identity` (dev): apps `ke-toan`+`giao-viec`; tenant "Cty A"(apps ke-toan)+"Cty B"(apps ke-toan,giao-viec); user `single@test.com`/`multi@test.com` mật khẩu `123456`. Idempotent (xoá tạo lại theo email/slug).

- [ ] **Step 1: `src/scripts/seed-dev.ts`** (dùng DataSource trực tiếp; tham chiếu cách smoke SP1):
```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../entities/user.entity';
import { UserCredential } from '../entities/user-credential.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { App } from '../entities/app.entity';

async function main() {
  const ds = new DataSource({
    type: 'mongodb', url: process.env.MONGODB_URI, database: process.env.MONGODB_DATABASE,
    entities: [User, UserCredential, UserTenant, Tenant, App], synchronize: true,
  });
  await ds.initialize();
  const apps = ds.getMongoRepository(App), tenants = ds.getMongoRepository(Tenant);
  const users = ds.getMongoRepository(User), creds = ds.getMongoRepository(UserCredential), uts = ds.getMongoRepository(UserTenant);

  async function upsertApp(appId: string, name: string, feUrl: string) {
    const e = await apps.findOne({ where: { appId } as any });
    if (e) await apps.update({ _id: e._id }, { name, feUrl, isActive: true } as any);
    else await apps.save(apps.create({ appId, name, feUrl, isActive: true }));
  }
  await upsertApp('ke-toan', 'Kế toán', process.env.FE_KE_TOAN_URL || 'http://localhost:8080');
  await upsertApp('giao-viec', 'Giao việc', process.env.FE_GIAO_VIEC_URL || 'http://localhost:8090');

  async function upsertTenant(slug: string, name: string, maSoThue: string, appsArr: string[]) {
    let t = await tenants.findOne({ where: { slug } as any });
    if (t) { await tenants.update({ _id: t._id }, { name, maSoThue, isActive: true, modules: ['KE_TOAN'], apps: appsArr } as any); t = await tenants.findOne({ where: { slug } as any }); }
    else t = await tenants.save(tenants.create({ name, slug, maSoThue, isActive: true, modules: ['KE_TOAN'], apps: appsArr }));
    return t!._id.toString();
  }
  const ctyA = await upsertTenant('cty-a', 'Công ty A', '0100000001', ['ke-toan']);
  const ctyB = await upsertTenant('cty-b', 'Công ty B', '0100000002', ['ke-toan', 'giao-viec']);

  async function upsertUser(email: string, hoTen: string, memberships: string[]) {
    let u = await users.findOne({ where: { email } as any });
    if (!u) u = await users.save(users.create({ email, hoTen, trangThai: UserStatus.HOAT_DONG, isActive: true }));
    const pw = await bcrypt.hash('123456', 10);
    const c = await creds.findOne({ where: { userId: u._id.toString() } as any });
    if (c) await creds.update({ _id: c._id }, { password: pw, isActive: true } as any);
    else await creds.save(creds.create({ userId: u._id.toString(), password: pw, isActive: true }));
    for (const tid of memberships) {
      const m = await uts.findOne({ where: { userId: u._id.toString(), tenantId: tid } as any });
      if (!m) await uts.save(uts.create({ userId: u._id.toString(), tenantId: tid, role: 'KIEM_SOAT', isActive: true }));
    }
  }
  await upsertUser('single@test.com', 'User Single', [ctyA]);
  await upsertUser('multi@test.com', 'User Multi', [ctyA, ctyB]);

  console.log('SEED_DEV_DONE', JSON.stringify({ ctyA, ctyB }));
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Thêm script package.json** (block scripts): `"seed:dev": "env-cmd -e dev ts-node src/scripts/seed-dev.ts"`.

- [ ] **Step 3: Build kiểm tra cú pháp.** `npm run build` → no TS errors. (Không chạy seed thật vì cần Mongo; chạy lúc smoke portal.)

- [ ] **Step 4: Commit + push.** `git add -A && git commit -m "chore(identity): seed-dev script (apps+tenant+user giả cho dev portal)" && git push`

---

## Self-Review

**Spec coverage (spec §4):** §3 token 2 tầng → Task 1. §4.1 login set cookie + /auth/refresh + /auth/logout → Task 3,4; /me/apps,/me/tenants dùng SessionGuard → Task 4. §4.2 SessionGuard → Task 2. §4.3 CORS credentials → Task 2. §4.4 cookie infra → Task 2. §4.5 e2e → Task 4. §6 seed-dev → Task 5. (Portal FE = Phần 2, plan riêng.)

**Placeholder scan:** không TBD; mọi step có code/lệnh. Lưu ý route path đã giải quyết tường minh ở Task 4 Step 4 (dùng `/refresh`, `/logout`, `/login` trần — khớp AuthController `@Controller()`).

**Type consistency:** `RefreshPayload`/`DecodedRefreshToken` (Task 1) dùng ở JwtService + SessionGuard (Task 2) + refreshAccessToken (Task 3). `CurrentUserPayload.tenantId?` optional (Task 2) cho phép session user {id,email}. `issueRefreshToken(userId,email)`/`refreshAccessToken(raw,tenantId)`/`clearSession(userId)` (Task 3) khớp controller (Task 4). Cookie `mc_session` nhất quán cookie.util ↔ guard ↔ controller.

**Lưu ý kế thừa:** Task 4 Step 5 phải sửa `platform.e2e-spec.ts` cũ (đổi từ Bearer sang cookie-agent) vì đổi guard — đã ghi rõ.

## Execution
superpowers:subagent-driven-development. 5 task tuần tự (1→2→3→4→5; 4 phụ thuộc 1-3).
