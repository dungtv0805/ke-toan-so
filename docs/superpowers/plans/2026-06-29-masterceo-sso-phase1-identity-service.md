# MasterCeo SSO — Sub-plan 1: Identity Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng một service Identity/SSO độc lập (`identity-service/`) có DB riêng `masterceo_identity`, phát hành JWT thống nhất, và migrate dữ liệu danh tính của ke-toan-so vào — để đăng nhập chạy được qua Identity, chạy song song không đụng tới ke-toan-so/task-management đang chạy.

**Architecture:** NestJS standalone app (HTTP, TypeORM + MongoDB), tự chứa — KHÔNG phụ thuộc libs `@app/*` của ke-toan-so. Bê logic từ `be/apps/auth-service` nhưng gỡ phần phân quyền (PhanQuyen/permissions) khỏi token; token chỉ mang danh tính `{sub,email,tenantId}`. Bổ sung registry `apps` + endpoint `GET /me/apps`, `GET /me/tenants?app`. Migrate = copy 4 collection danh tính từ `digital_book` sang `masterceo_identity` (cùng server Mongo), idempotent + dry-run + báo cáo.

**Tech Stack:** NestJS 11, TypeScript, TypeORM (driver `mongodb`), `jsonwebtoken`, `bcrypt`, `class-validator`/`class-transformer`, `env-cmd`, Jest + Supertest, driver `mongodb` cho script migrate.

## Global Constraints

- **Service độc lập:** thư mục `/Users/os_anhvt/Documents/Dino/identity-service` (repo riêng). KHÔNG import từ `@app/*` của ke-toan-so — mọi thứ cần dùng phải tự chứa trong service này.
- **DB:** `masterceo_identity` trên cùng server Mongo (`mongodb://dbadmin:abcde12345-@localhost:27017/?authSource=admin`).
- **Port:** `3020` (tránh đụng 3000–3009 của ke-toan-so và 3010 của task-management).
- **Token JWT (HS256):** payload **chỉ danh tính**: `{ sub, email, tenantId, iat, exp }`. Temp token: `{ sub, email, type: 'temp', iat, exp }`. KHÔNG nhúng `vaiTro`/`permissions`.
- **Secret chung:** đọc từ `process.env.JWT_SECRET`. Đây là secret sẽ chia sẻ với ke-toan-so & task-management ở sub-plan 2/3.
- **bcrypt SALT_ROUNDS = 10** (giữ tương thích với cả 2 app — hash cũ verify được).
- **Hằng:** `SUPER_ADMIN_EMAIL = 'admin@company.com'` (giữ y hệt ke-toan-so để super admin cũ vẫn nhận diện).
- **Không đụng** code/đang chạy của ke-toan-so và task-management trong sub-plan này. Identity chạy song song.
- **Migrate phải idempotent + có `--dry-run`**; chạy thật chỉ sau khi backup.
- Collections danh tính là **tenant-exempt** → KHÔNG cần tenant-aware proxy; dùng TypeORM repository thường.

---

## File Structure (toàn bộ nằm trong `/Users/os_anhvt/Documents/Dino/identity-service`)

```
identity-service/
├── package.json                      # deps + scripts (start, build, test, migrate)
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── .env-cmdrc.json                   # env theo môi trường (dev/prod)
├── .gitignore
├── README.md
├── jest.config.js                    # cấu hình unit test
├── test/
│   └── jest-e2e.json                 # cấu hình e2e
├── src/
│   ├── main.ts                       # bootstrap, port 3020, ValidationPipe, CORS
│   ├── app.module.ts                 # root module
│   ├── database/
│   │   └── database.module.ts        # TypeOrmModule.forRoot → masterceo_identity
│   ├── entities/
│   │   ├── base.entity.ts            # _id, createdAt, updatedAt, deletedAt
│   │   ├── user.entity.ts            # users
│   │   ├── user-credential.entity.ts # user_credentials
│   │   ├── user-tenant.entity.ts     # user_tenants (membership + role giữ tạm)
│   │   ├── tenant.entity.ts          # tenants (+ field apps)
│   │   └── app.entity.ts             # apps (registry) — MỚI
│   ├── jwt/
│   │   ├── jwt.service.ts            # sign/verify access + temp token (payload danh tính)
│   │   ├── jwt.service.spec.ts
│   │   └── interfaces.ts             # DecodedToken, UserPayload, Temp*
│   ├── auth/
│   │   ├── auth.controller.ts        # login, select-tenant, switch-tenant, register, verify, me, change-password, logout
│   │   ├── auth.service.ts           # logic (lifted, gỡ PhanQuyen)
│   │   ├── auth.module.ts
│   │   ├── jwt.guard.ts              # Bearer → verify → request.user
│   │   ├── current-user.decorator.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       ├── register.dto.ts
│   │       ├── select-tenant.dto.ts
│   │       ├── switch-tenant.dto.ts
│   │       ├── verify-token.dto.ts
│   │       ├── change-password.dto.ts
│   │       ├── update-profile.dto.ts
│   │       └── index.ts
│   ├── platform/
│   │   ├── platform.controller.ts    # GET /me/apps, GET /me/tenants?app
│   │   ├── platform.service.ts
│   │   └── platform.module.ts
│   └── scripts/
│       ├── migrate-identity.ts       # copy digital_book → masterceo_identity
│       └── migrate-identity.spec.ts  # test logic dedup/idempotent (in-memory/test db)
```

**Nguồn để bê code (chỉ đọc, KHÔNG sửa):**
- `be/apps/auth-service/src/auth-service.service.ts`
- `be/apps/auth-service/src/auth-service.controller.ts`
- `be/libs/auth/src/services/jwt.service.ts`
- `be/libs/auth/src/guards/jwt.guard.ts`
- `be/libs/auth/src/decorators/current-user.decorator.ts`
- `be/apps/auth-service/src/dto/*.ts`
- `be/libs/entities/src/auth/*.entity.ts`, `be/libs/entities/src/tenant/tenant.entity.ts`, `be/libs/entities/src/base.entity.ts`

---

## Task 1: Scaffold standalone NestJS project

**Files:**
- Create: `identity-service/package.json`
- Create: `identity-service/tsconfig.json`, `identity-service/tsconfig.build.json`
- Create: `identity-service/nest-cli.json`
- Create: `identity-service/.env-cmdrc.json`
- Create: `identity-service/.gitignore`
- Create: `identity-service/jest.config.js`
- Create: `identity-service/test/jest-e2e.json`
- Create: `identity-service/src/main.ts`
- Create: `identity-service/src/app.module.ts`

**Interfaces:**
- Produces: một app NestJS boot được trên port `3020`; module gốc `AppModule`.

- [ ] **Step 1: Tạo `package.json`**

```json
{
  "name": "identity-service",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "env-cmd -e dev nest start",
    "start:dev": "env-cmd -e dev nest start --watch",
    "start:prod": "env-cmd -e prod node dist/main",
    "test": "jest",
    "test:e2e": "env-cmd -e test jest --config ./test/jest-e2e.json",
    "migrate": "env-cmd -e dev ts-node src/scripts/migrate-identity.ts"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/typeorm": "^11.0.0",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "jsonwebtoken": "^9.0.2",
    "mongodb": "^6.3.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.1",
    "typeorm": "^0.3.20"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/bcrypt": "^5.0.2",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.11.0",
    "@types/supertest": "^6.0.2",
    "env-cmd": "^10.1.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Tạo `tsconfig.json` và `tsconfig.build.json`**

`identity-service/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true
  }
}
```

`identity-service/tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 3: Tạo `nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 4: Tạo `.env-cmdrc.json`**

```json
{
  "dev": {
    "NODE_ENV": "development",
    "PORT": "3020",
    "MONGODB_URI": "mongodb://dbadmin:abcde12345-@localhost:27017/?authSource=admin",
    "MONGODB_DATABASE": "masterceo_identity",
    "JWT_SECRET": "masterceo-shared-secret-change-in-production",
    "JWT_EXPIRES_IN": "24h",
    "JWT_TEMP_EXPIRES_IN": "5m",
    "SOURCE_MONGODB_DATABASE": "digital_book"
  },
  "test": {
    "NODE_ENV": "test",
    "PORT": "3021",
    "MONGODB_URI": "mongodb://dbadmin:abcde12345-@localhost:27017/?authSource=admin",
    "MONGODB_DATABASE": "masterceo_identity_test",
    "JWT_SECRET": "test-secret",
    "JWT_EXPIRES_IN": "24h",
    "JWT_TEMP_EXPIRES_IN": "5m",
    "SOURCE_MONGODB_DATABASE": "digital_book_test"
  },
  "prod": {
    "NODE_ENV": "production"
  }
}
```

- [ ] **Step 5: Tạo `.gitignore`, `jest.config.js`, `test/jest-e2e.json`**

`.gitignore`:
```
node_modules
dist
*.log
.env
```

`jest.config.js`:
```js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

`test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

- [ ] **Step 6: Tạo `src/app.module.ts` (rỗng tạm) và `src/main.ts`**

`src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';

@Module({})
export class AppModule {}
```

`src/main.ts`:
```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({ origin: true, credentials: true });
  const port = process.env.PORT || 3020;
  await app.listen(port);
  Logger.log(`Identity Service running on port ${port}`, 'Bootstrap');
}
void bootstrap();
```

- [ ] **Step 7: Cài deps và verify boot**

Run:
```bash
cd /Users/os_anhvt/Documents/Dino/identity-service && npm install && npm run build
```
Expected: build PASS, không lỗi TypeScript.

- [ ] **Step 8: Commit**

```bash
cd /Users/os_anhvt/Documents/Dino/identity-service && git init -q && git add -A && \
git commit -m "chore(identity): scaffold standalone NestJS identity-service (port 3020)"
```

---

## Task 2: Entities + kết nối DB `masterceo_identity`

**Files:**
- Create: `identity-service/src/entities/base.entity.ts`
- Create: `identity-service/src/entities/user.entity.ts`
- Create: `identity-service/src/entities/user-credential.entity.ts`
- Create: `identity-service/src/entities/user-tenant.entity.ts`
- Create: `identity-service/src/entities/tenant.entity.ts`
- Create: `identity-service/src/entities/app.entity.ts`
- Create: `identity-service/src/database/database.module.ts`
- Modify: `identity-service/src/app.module.ts`
- Test: `identity-service/src/database/database.module.spec.ts`

**Interfaces:**
- Produces: entity classes `User`, `UserCredential`, `UserTenant`, `Tenant`, `App`; `DatabaseModule` export `TypeOrmModule` đã `forRoot` + `forFeature` 5 entity. Field shapes:
  - `User`: `_id: ObjectId`, `email: string`, `hoTen: string`, `trangThai: 'HOAT_DONG'|'KHOA'`, `isActive: boolean`.
  - `UserCredential`: `userId: string`, `password: string`, `refreshToken?: string`, `lastLoginAt?: Date`, `isActive: boolean`.
  - `UserTenant`: `userId: string`, `tenantId: string`, `role: string`, `isActive: boolean`.
  - `Tenant`: `name, slug, maSoThue?, diaChi?, dienThoai?, email?, nguoiDaiDien?, isActive, modules: string[], nganh?, glossary: object, dashboardBlocks?, apps: string[]`.
  - `App`: `appId: string`, `name: string`, `description?: string`, `iconUrl?: string`, `feUrl: string`, `isActive: boolean`.

- [ ] **Step 1: Tạo `base.entity.ts`**

(Sao theo `be/libs/entities/src/base.entity.ts` — đọc file đó trước; bản tối thiểu cho MongoDB:)
```ts
import { ObjectIdColumn, ObjectId, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ default: null })
  tenantId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
```
> Đọc `be/libs/entities/src/base.entity.ts` và khớp chính xác các cột (tên/loại) để dữ liệu copy sang đọc đúng.

- [ ] **Step 2: Tạo 4 entity danh tính**

`user.entity.ts`:
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export const SUPER_ADMIN_EMAIL = 'admin@company.com';

export enum UserStatus {
  HOAT_DONG = 'HOAT_DONG',
  KHOA = 'KHOA',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  hoTen: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.HOAT_DONG })
  trangThai: UserStatus;

  @Column({ default: true })
  isActive: boolean;
}
```

`user-credential.entity.ts`:
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('user_credentials')
export class UserCredential extends BaseEntity {
  @Column() userId: string;
  @Column() password: string;
  @Column({ nullable: true }) refreshToken?: string;
  @Column({ nullable: true }) lastLoginAt?: Date;
  @Column({ default: true }) isActive: boolean;
}
```

`user-tenant.entity.ts`:
```ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('user_tenants')
@Index('IDX_user_tenant_unique', ['userId', 'tenantId'], { unique: true })
export class UserTenant extends BaseEntity {
  @Column() userId: string;
  @Column() declare tenantId: string;
  // role giữ tạm để KHÔNG mất dữ liệu; Identity KHÔNG đưa role vào token.
  // Sub-plan 2 sẽ chuyển role kế toán về phía app.
  @Column({ default: 'KIEM_SOAT' }) role: string;
  @Column({ default: true }) isActive: boolean;
}
```

`tenant.entity.ts`:
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
  @Column({ type: 'json', default: ['KE_TOAN'] }) modules: string[];
  @Column({ nullable: true }) nganh?: string | null;
  @Column({ type: 'json', default: {} }) glossary: Record<string, unknown>;
  @Column({ type: 'json', nullable: true }) dashboardBlocks?: string[] | null;
  // MỚI: app công ty này được dùng, vd ['ke-toan','giao-viec'].
  @Column({ type: 'json', default: [] }) apps: string[];
}
```

- [ ] **Step 3: Tạo `app.entity.ts` (registry)**

```ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('apps')
export class App extends BaseEntity {
  @Index({ unique: true })
  @Column() appId: string;        // 'ke-toan', 'giao-viec'
  @Column() name: string;
  @Column({ nullable: true }) description?: string;
  @Column({ nullable: true }) iconUrl?: string;
  @Column() feUrl: string;        // nơi redirect FE khi chọn app
  @Column({ default: true }) isActive: boolean;
}
```

- [ ] **Step 4: Tạo `database/database.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserCredential } from '../entities/user-credential.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { App } from '../entities/app.entity';

const ENTITIES = [User, UserCredential, UserTenant, Tenant, App];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: process.env.MONGODB_URI,
      database: process.env.MONGODB_DATABASE,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      entities: ENTITIES,
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```
> Khác ke-toan-so: KHÔNG dùng tenant-aware proxy (các collection này tenant-exempt), dùng repository TypeORM thường.

- [ ] **Step 5: Wire vào `app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';

@Module({ imports: [DatabaseModule] })
export class AppModule {}
```

- [ ] **Step 6: Viết test kết nối (e2e nhẹ)**

`src/database/database.module.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DatabaseModule } from './database.module';
import { App } from '../entities/app.entity';
import { Repository } from 'typeorm';

describe('DatabaseModule', () => {
  it('kết nối DB và inject được repository App', async () => {
    process.env.MONGODB_URI = 'mongodb://dbadmin:abcde12345-@localhost:27017/?authSource=admin';
    process.env.MONGODB_DATABASE = 'masterceo_identity_test';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] }).compile();
    const repo = moduleRef.get<Repository<App>>(getRepositoryToken(App));
    expect(repo).toBeDefined();
    await moduleRef.close();
  });
});
```

- [ ] **Step 7: Chạy test**

Run: `cd /Users/os_anhvt/Documents/Dino/identity-service && npm test -- database.module.spec`
Expected: PASS (yêu cầu Mongo local đang chạy).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(identity): entities (users/credentials/tenants/user_tenants/apps) + DB module masterceo_identity"
```

---

## Task 3: JwtService (payload danh tính) + test

**Files:**
- Create: `identity-service/src/jwt/interfaces.ts`
- Create: `identity-service/src/jwt/jwt.service.ts`
- Test: `identity-service/src/jwt/jwt.service.spec.ts`

**Interfaces:**
- Produces:
  - `interface UserPayload { id: string; email: string; tenantId: string }`
  - `interface DecodedToken { sub: string; email: string; tenantId: string; iat: number; exp: number }`
  - `interface TempTokenPayload { id: string; email: string }`
  - `interface DecodedTempToken { sub: string; email: string; type: 'temp'; iat: number; exp: number }`
  - `class JwtService` với `sign(payload: UserPayload, expiresIn?): string`, `verify(token): DecodedToken`, `verifyToken(token): DecodedToken`, `signTempToken(payload: TempTokenPayload): string`, `verifyTempToken(token): DecodedTempToken`, `decode(token): DecodedToken | null`.

- [ ] **Step 1: Viết test thất bại trước**

`src/jwt/jwt.service.spec.ts`:
```ts
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  const svc = new JwtService();

  it('sign tạo token chỉ chứa danh tính (sub,email,tenantId), KHÔNG có vaiTro/permissions', () => {
    const token = svc.sign({ id: 'u1', email: 'a@b.com', tenantId: 't1' });
    const decoded = svc.verify(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.tenantId).toBe('t1');
    expect((decoded as any).vaiTro).toBeUndefined();
    expect((decoded as any).permissions).toBeUndefined();
  });

  it('verifyTempToken chấp nhận temp token và từ chối token thường', () => {
    const temp = svc.signTempToken({ id: 'u1', email: 'a@b.com' });
    const d = svc.verifyTempToken(temp);
    expect(d.type).toBe('temp');
    const access = svc.sign({ id: 'u1', email: 'a@b.com', tenantId: 't1' });
    expect(() => svc.verifyTempToken(access)).toThrow();
  });

  it('verify ném lỗi với token sai', () => {
    expect(() => svc.verify('rác')).toThrow();
  });
});
```

- [ ] **Step 2: Chạy để xác nhận fail**

Run: `npm test -- jwt.service.spec`
Expected: FAIL ("Cannot find module './jwt.service'").

- [ ] **Step 3: Tạo `interfaces.ts`**

```ts
export interface UserPayload { id: string; email: string; tenantId: string; }
export interface DecodedToken { sub: string; email: string; tenantId: string; iat: number; exp: number; }
export interface TempTokenPayload { id: string; email: string; }
export interface DecodedTempToken { sub: string; email: string; type: 'temp'; iat: number; exp: number; }
```

- [ ] **Step 4: Tạo `jwt.service.ts`** (bê từ `be/libs/auth/src/services/jwt.service.ts`, GỠ vaiTro/permissions khỏi `sign`)

```ts
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DecodedToken, UserPayload, TempTokenPayload, DecodedTempToken } from './interfaces';

@Injectable()
export class JwtService {
  private readonly secret = process.env.JWT_SECRET || 'masterceo-shared-secret-change-in-production';
  private readonly expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  private readonly tempTokenExpiresIn = process.env.JWT_TEMP_EXPIRES_IN || '5m';

  verify(token: string): DecodedToken {
    try {
      return jwt.verify(token, this.secret) as DecodedToken;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) throw new Error('Token đã hết hạn');
      if (error instanceof jwt.JsonWebTokenError) throw new Error('Token không hợp lệ');
      throw new Error(`Xác thực token thất bại: ${(error as Error).message}`);
    }
  }

  verifyToken(token: string): DecodedToken { return this.verify(token); }

  sign(payload: UserPayload, expiresIn?: string): string {
    const tokenPayload = { sub: payload.id, email: payload.email, tenantId: payload.tenantId };
    return jwt.sign(tokenPayload, this.secret, { expiresIn: (expiresIn || this.expiresIn) as any });
  }

  signTempToken(payload: TempTokenPayload): string {
    const tokenPayload = { sub: payload.id, email: payload.email, type: 'temp' };
    return jwt.sign(tokenPayload, this.secret, { expiresIn: this.tempTokenExpiresIn as any });
  }

  verifyTempToken(token: string): DecodedTempToken {
    try {
      const decoded = jwt.verify(token, this.secret) as DecodedTempToken;
      if (decoded.type !== 'temp') throw new Error('Loại token không hợp lệ');
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) throw new Error('Token tạm thời đã hết hạn');
      if (error instanceof jwt.JsonWebTokenError) throw new Error('Token tạm thời không hợp lệ');
      throw new Error(`Xác thực token tạm thời thất bại: ${(error as Error).message}`);
    }
  }

  decode(token: string): DecodedToken | null {
    try { return jwt.decode(token) as DecodedToken; } catch { return null; }
  }
}
```

- [ ] **Step 5: Chạy test → PASS**

Run: `npm test -- jwt.service.spec`
Expected: PASS (3 test).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(identity): JwtService phát token chỉ danh tính (sub,email,tenantId)"
```

---

## Task 4: JwtGuard + CurrentUser + DTOs

**Files:**
- Create: `identity-service/src/auth/jwt.guard.ts`
- Create: `identity-service/src/auth/current-user.decorator.ts`
- Create: `identity-service/src/auth/dto/*.ts` + `index.ts`
- Test: `identity-service/src/auth/jwt.guard.spec.ts`

**Interfaces:**
- Produces:
  - `JwtGuard` (canActivate): đọc `Authorization: Bearer <token>`, verify, từ chối temp token, gán `request.user = { id, email, tenantId }`.
  - `@CurrentUser()` trả `request.user` kiểu `{ id: string; email: string; tenantId: string }`.
  - DTO: `LoginDto{email,password}`, `RegisterDto{email,password,hoTen,tenantId?,role?}`, `SelectTenantDto{tempToken,tenantId}`, `SwitchTenantDto{tenantId}`, `VerifyTokenDto{token}`, `ChangePasswordDto{currentPassword,newPassword}`, `UpdateProfileDto{hoTen?}`.

- [ ] **Step 1: Viết test guard thất bại**

`src/auth/jwt.guard.spec.ts`:
```ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { JwtService } from '../jwt/jwt.service';

function ctxWith(authHeader?: string): ExecutionContext {
  const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('JwtGuard', () => {
  const jwtSvc = new JwtService();
  const guard = new JwtGuard(jwtSvc);

  it('từ chối khi không có token', () => {
    expect(() => guard.canActivate(ctxWith())).toThrow(UnauthorizedException);
  });

  it('cho qua và gán request.user với token hợp lệ', () => {
    const token = jwtSvc.sign({ id: 'u1', email: 'a@b.com', tenantId: 't1' });
    const ctx = ctxWith(`Bearer ${token}`);
    expect(guard.canActivate(ctx)).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.user).toEqual({ id: 'u1', email: 'a@b.com', tenantId: 't1' });
  });

  it('từ chối temp token', () => {
    const temp = jwtSvc.signTempToken({ id: 'u1', email: 'a@b.com' });
    expect(() => guard.canActivate(ctxWith(`Bearer ${temp}`))).toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Chạy → FAIL**

Run: `npm test -- jwt.guard.spec`
Expected: FAIL (chưa có `jwt.guard.ts`).

- [ ] **Step 3: Tạo `jwt.guard.ts`** (bê & rút gọn từ `be/libs/auth/src/guards/jwt.guard.ts`)

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu token xác thực');
    }
    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = this.jwtService.verifyToken(token);
    } catch (e) {
      throw new UnauthorizedException((e as Error).message);
    }
    if ((decoded as any).type === 'temp') {
      throw new UnauthorizedException('Không thể dùng token tạm thời cho thao tác này');
    }
    request.user = { id: decoded.sub, email: decoded.email, tenantId: decoded.tenantId };
    return true;
  }
}
```

- [ ] **Step 4: Tạo `current-user.decorator.ts`**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload { id: string; email: string; tenantId: string; }

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
```

- [ ] **Step 5: Tạo DTOs** (bê từ `be/apps/auth-service/src/dto/*` — đọc rồi sao y với class-validator)

`src/auth/dto/login.dto.ts`:
```ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
export class LoginDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
}
```

`src/auth/dto/register.dto.ts`:
```ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() @IsNotEmpty() hoTen: string;
  @IsOptional() @IsString() tenantId?: string;
  @IsOptional() @IsString() role?: string;
}
```

`src/auth/dto/select-tenant.dto.ts`:
```ts
import { IsNotEmpty, IsString } from 'class-validator';
export class SelectTenantDto {
  @IsString() @IsNotEmpty() tempToken: string;
  @IsString() @IsNotEmpty() tenantId: string;
}
```

`src/auth/dto/switch-tenant.dto.ts`:
```ts
import { IsNotEmpty, IsString } from 'class-validator';
export class SwitchTenantDto { @IsString() @IsNotEmpty() tenantId: string; }
```

`src/auth/dto/verify-token.dto.ts`:
```ts
import { IsNotEmpty, IsString } from 'class-validator';
export class VerifyTokenDto { @IsString() @IsNotEmpty() token: string; }
```

`src/auth/dto/change-password.dto.ts`:
```ts
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString() @MinLength(6) newPassword: string;
}
```

`src/auth/dto/update-profile.dto.ts`:
```ts
import { IsOptional, IsString } from 'class-validator';
export class UpdateProfileDto { @IsOptional() @IsString() hoTen?: string; }
```

`src/auth/dto/index.ts`:
```ts
export * from './login.dto';
export * from './register.dto';
export * from './select-tenant.dto';
export * from './switch-tenant.dto';
export * from './verify-token.dto';
export * from './change-password.dto';
export * from './update-profile.dto';
```

- [ ] **Step 6: Chạy → PASS**

Run: `npm test -- jwt.guard.spec`
Expected: PASS (3 test).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(identity): JwtGuard + CurrentUser + DTOs auth"
```

---

## Task 5: AuthService + AuthController (lifted, gỡ phân quyền)

**Files:**
- Create: `identity-service/src/auth/auth.service.ts`
- Create: `identity-service/src/auth/auth.controller.ts`
- Create: `identity-service/src/auth/auth.module.ts`
- Modify: `identity-service/src/app.module.ts`
- Test: `identity-service/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `JwtService` (Task 3), `JwtGuard`/`CurrentUser` (Task 4), entities + repos (Task 2).
- Produces — HTTP endpoints (đều bọc `{ success: true, data }`):
  - `POST /login` → `{ accessToken, tenant?, user, availableTenants? }` HOẶC `{ tempToken, tenants[], user }`.
  - `POST /select-tenant` → `{ accessToken, tenant, user }`.
  - `POST /switch-tenant` (JwtGuard) → `{ accessToken, tenant, user }`.
  - `POST /register` → `{ id?, email, hoTen }`.
  - `POST /verify` → `{ sub, email, tenantId }`.
  - `GET /me` (JwtGuard) → `{ user, tenant?, availableTenants }`.
  - `PUT /me` (JwtGuard), `POST /change-password` (JwtGuard), `POST /logout` (JwtGuard).
  - `TenantInfo = { tenantId, tenantName, tenantSlug, modules, glossary, nganh, apps }` (KHÔNG còn `role`).
  - `AuthUserResponse = { id, email, hoTen, isSuperAdmin }`.

- [ ] **Step 1: Viết e2e test thất bại (login flow)**

`test/auth.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User, UserStatus } from '../src/entities/user.entity';
import { UserCredential } from '../src/entities/user-credential.entity';
import { UserTenant } from '../src/entities/user-tenant.entity';
import { Tenant } from '../src/entities/tenant.entity';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let users: Repository<User>;
  let creds: Repository<UserCredential>;
  let uts: Repository<UserTenant>;
  let tenants: Repository<Tenant>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    users = moduleRef.get(getRepositoryToken(User));
    creds = moduleRef.get(getRepositoryToken(UserCredential));
    uts = moduleRef.get(getRepositoryToken(UserTenant));
    tenants = moduleRef.get(getRepositoryToken(Tenant));
    // cleanup
    await users.deleteMany({}); await creds.deleteMany({});
    await uts.deleteMany({}); await tenants.deleteMany({});
  });

  afterAll(async () => { await app.close(); });

  it('login user 1 tenant → trả accessToken danh tính', async () => {
    const t = await tenants.save(tenants.create({ name: 'Cty A', slug: 'cty-a', isActive: true, modules: ['KE_TOAN'], apps: ['ke-toan'] }));
    const u = await users.save(users.create({ email: 'u1@test.com', hoTen: 'U1', trangThai: UserStatus.HOAT_DONG, isActive: true }));
    await creds.save(creds.create({ userId: u._id.toString(), password: await bcrypt.hash('pass123', 10), isActive: true }));
    await uts.save(uts.create({ userId: u._id.toString(), tenantId: t._id.toString(), role: 'KIEM_SOAT', isActive: true }));

    const res = await request(app.getHttpServer())
      .post('/login').send({ email: 'u1@test.com', password: 'pass123' }).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.tenant.tenantId).toBe(t._id.toString());
    expect(res.body.data.tenant.role).toBeUndefined(); // role KHÔNG còn trong tenant info
  });

  it('login sai mật khẩu → 401', async () => {
    await request(app.getHttpServer())
      .post('/login').send({ email: 'u1@test.com', password: 'sai' }).expect(401);
  });
});
```

- [ ] **Step 2: Chạy → FAIL**

Run: `npm run test:e2e -- auth.e2e-spec`
Expected: FAIL (chưa có controller/route).

- [ ] **Step 3: Tạo `auth.service.ts`**

> Bê từ `be/apps/auth-service/src/auth-service.service.ts` với các THAY ĐỔI BẮT BUỘC:
> 1. Bỏ import/inject `PhanQuyen` và hàm `loadPermissions` — Identity KHÔNG nạp permission.
> 2. `buildTenantInfo` bỏ field `role`; THÊM `apps: tenant.apps ?? []`.
> 3. Mọi chỗ tạo `payload`/gọi `jwtService.sign`: dùng `UserPayload = { id, email, tenantId }` (bỏ `vaiTro`, `permissions`).
> 4. Mọi response bỏ trường `permissions`.
> 5. Super admin vẫn nhận diện qua `SUPER_ADMIN_EMAIL`, nhưng token cũng chỉ `{id,email,tenantId}`.
> 6. Import entity/JwtService từ đường dẫn nội bộ (`../entities/...`, `../jwt/jwt.service`), KHÔNG từ `@app/*`.

```ts
import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, SUPER_ADMIN_EMAIL } from '../entities/user.entity';
import { UserCredential } from '../entities/user-credential.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { JwtService, UserPayload } from '../jwt/jwt.service';
import { LoginDto, RegisterDto, SelectTenantDto, ChangePasswordDto, UpdateProfileDto, VerifyTokenDto } from './dto';

const SALT_ROUNDS = 10;

export interface TenantInfo {
  tenantId: string; tenantName: string; tenantSlug: string;
  modules: string[]; glossary: Record<string, unknown>; nganh: string | null; apps: string[];
}
export interface AuthUserResponse { id: string; email: string; hoTen: string; isSuperAdmin: boolean; }

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserCredential) private readonly credRepo: Repository<UserCredential>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(UserTenant) private readonly utRepo: Repository<UserTenant>,
    private readonly jwtService: JwtService,
  ) {}

  private isSuperAdmin(u: User) { return u.email === SUPER_ADMIN_EMAIL; }

  private buildTenantInfo(tenant: Tenant): TenantInfo {
    return {
      tenantId: tenant._id.toString(), tenantName: tenant.name, tenantSlug: tenant.slug,
      modules: tenant.modules?.length ? tenant.modules : ['KE_TOAN'],
      glossary: tenant.glossary ?? {}, nganh: tenant.nganh ?? null, apps: tenant.apps ?? [],
    };
  }

  private buildUserResponse(u: User): AuthUserResponse {
    return { id: u._id.toString(), email: u.email, hoTen: u.hoTen, isSuperAdmin: this.isSuperAdmin(u) };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    if (user.trangThai !== UserStatus.HOAT_DONG) throw new UnauthorizedException('Tài khoản đã bị khóa');
    const cred = await this.credRepo.findOne({ where: { userId: user._id.toString(), isActive: true } });
    if (!cred) throw new InternalServerErrorException('Không tìm thấy thông tin xác thực');
    if (!(await bcrypt.compare(dto.password, cred.password))) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    cred.lastLoginAt = new Date();
    await this.credRepo.save(cred);

    const userResponse = this.buildUserResponse(user);

    const tenantsForUser = await this.resolveTenants(user);
    if (tenantsForUser.length === 0) throw new ForbiddenException('Người dùng chưa được gán công ty');

    if (tenantsForUser.length === 1) {
      const tenant = tenantsForUser[0];
      const accessToken = this.jwtService.sign({ id: user._id.toString(), email: user.email, tenantId: tenant.tenantId });
      return { accessToken, tenant, user: userResponse };
    }
    const tempToken = this.jwtService.signTempToken({ id: user._id.toString(), email: user.email });
    return { tempToken, tenants: tenantsForUser, user: userResponse };
  }

  private async resolveTenants(user: User): Promise<TenantInfo[]> {
    if (this.isSuperAdmin(user)) {
      const all = await this.tenantRepo.find({ where: { isActive: true } });
      return all.map((t) => this.buildTenantInfo(t));
    }
    const memberships = await this.utRepo.find({ where: { userId: user._id.toString(), isActive: true } });
    if (memberships.length === 0) return [];
    const ids = memberships.map((m) => new ObjectId(m.tenantId));
    const ts = await this.tenantRepo.find({ where: { _id: { $in: ids } as any, isActive: true } });
    return ts.map((t) => this.buildTenantInfo(t));
  }

  async selectTenant(dto: SelectTenantDto) {
    let decoded;
    try { decoded = this.jwtService.verifyTempToken(dto.tempToken); }
    catch (e) { throw new UnauthorizedException((e as Error).message); }
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(decoded.sub) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    if (user.trangThai !== UserStatus.HOAT_DONG) throw new UnauthorizedException('Tài khoản đã bị khóa');
    return this.issueForTenant(user, dto.tenantId);
  }

  async switchTenant(userId: string, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(userId) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    if (user.trangThai !== UserStatus.HOAT_DONG) throw new UnauthorizedException('Tài khoản đã bị khóa');
    return this.issueForTenant(user, tenantId);
  }

  private async issueForTenant(user: User, tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { _id: new ObjectId(tenantId) as any, isActive: true } });
    if (!tenant) throw new ForbiddenException('Không tìm thấy công ty hoặc công ty đã ngừng hoạt động');
    if (!this.isSuperAdmin(user)) {
      const ut = await this.utRepo.findOne({ where: { userId: user._id.toString(), tenantId, isActive: true } });
      if (!ut) throw new ForbiddenException('Người dùng không thuộc công ty này');
    }
    const tenantInfo = this.buildTenantInfo(tenant);
    const accessToken = this.jwtService.sign({ id: user._id.toString(), email: user.email, tenantId });
    return { accessToken, tenant: tenantInfo, user: this.buildUserResponse(user) };
  }

  async getMe(userId: string, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(userId) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    const availableTenants = await this.resolveTenants(user);
    const tenant = availableTenants.find((t) => t.tenantId === tenantId);
    return { user: this.buildUserResponse(user), tenant, availableTenants };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.userRepo.save(this.userRepo.create({ email: dto.email, hoTen: dto.hoTen, trangThai: UserStatus.HOAT_DONG, isActive: true }));
    await this.credRepo.save(this.credRepo.create({ userId: user._id.toString(), password: hashed, isActive: true }));
    if (dto.tenantId) {
      await this.utRepo.save(this.utRepo.create({ userId: user._id.toString(), tenantId: dto.tenantId, role: dto.role || 'KIEM_SOAT', isActive: true }));
    }
    return { id: user._id.toString(), email: user.email, hoTen: user.hoTen };
  }

  verify(dto: VerifyTokenDto) {
    try {
      const d = this.jwtService.verify(dto.token);
      return { sub: d.sub, email: d.email, tenantId: d.tenantId };
    } catch (e) { throw new UnauthorizedException((e as Error).message); }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(userId) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    if (dto.hoTen) user.hoTen = dto.hoTen;
    const saved = await this.userRepo.save(user);
    return { id: saved._id.toString(), email: saved.email, hoTen: saved.hoTen };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(userId) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    const cred = await this.credRepo.findOne({ where: { userId: user._id.toString(), isActive: true } });
    if (!cred) throw new InternalServerErrorException('Không tìm thấy thông tin xác thực');
    if (!(await bcrypt.compare(dto.currentPassword, cred.password))) throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    cred.password = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.credRepo.save(cred);
    return { message: 'Đổi mật khẩu thành công' };
  }

  logout() { return { message: 'Đăng xuất thành công' }; }
}
```

- [ ] **Step 4: Tạo `auth.controller.ts`** (bê từ controller gốc, đổi tên service, bỏ route nào không còn — giữ y endpoints)

```ts
import { Controller, Post, Get, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { CurrentUser, CurrentUserPayload } from './current-user.decorator';
import { LoginDto, RegisterDto, SelectTenantDto, SwitchTenantDto, VerifyTokenDto, ChangePasswordDto, UpdateProfileDto } from './dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login') @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) { return { success: true, data: await this.authService.login(dto) }; }

  @Post('select-tenant') @HttpCode(HttpStatus.OK)
  async selectTenant(@Body() dto: SelectTenantDto) { return { success: true, data: await this.authService.selectTenant(dto) }; }

  @Post('switch-tenant') @UseGuards(JwtGuard) @HttpCode(HttpStatus.OK)
  async switchTenant(@CurrentUser() user: CurrentUserPayload, @Body() dto: SwitchTenantDto) {
    return { success: true, data: await this.authService.switchTenant(user.id, dto.tenantId) };
  }

  @Post('register') @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) { return { success: true, data: await this.authService.register(dto) }; }

  @Post('verify') @HttpCode(HttpStatus.OK)
  verify(@Body() dto: VerifyTokenDto) { return { success: true, data: this.authService.verify(dto) }; }

  @Get('me') @UseGuards(JwtGuard)
  async getMe(@CurrentUser() user: CurrentUserPayload) { return { success: true, data: await this.authService.getMe(user.id, user.tenantId) }; }

  @Put('me') @UseGuards(JwtGuard)
  async updateProfile(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateProfileDto) {
    return { success: true, data: await this.authService.updateProfile(user.id, dto) };
  }

  @Post('change-password') @UseGuards(JwtGuard) @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePasswordDto) {
    return { success: true, data: await this.authService.changePassword(user.id, dto) };
  }

  @Post('logout') @UseGuards(JwtGuard) @HttpCode(HttpStatus.OK)
  logout() { return { success: true, data: this.authService.logout() }; }
}
```

- [ ] **Step 5: Tạo `auth.module.ts` + wire vào `app.module.ts`**

`src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '../jwt/jwt.service';
import { JwtGuard } from './jwt.guard';
import { User } from '../entities/user.entity';
import { UserCredential } from '../entities/user-credential.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCredential, UserTenant, Tenant])],
  controllers: [AuthController],
  providers: [AuthService, JwtService, JwtGuard],
  exports: [JwtService, JwtGuard],
})
export class AuthModule {}
```

`src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';

@Module({ imports: [DatabaseModule, AuthModule] })
export class AppModule {}
```

- [ ] **Step 6: Chạy e2e → PASS**

Run: `npm run test:e2e -- auth.e2e-spec`
Expected: PASS (2 test).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(identity): auth service+controller (login/select-tenant/switch/register/verify/me), token danh tính"
```

---

## Task 6: Platform endpoints (apps registry + /me/apps + /me/tenants?app)

**Files:**
- Create: `identity-service/src/platform/platform.service.ts`
- Create: `identity-service/src/platform/platform.controller.ts`
- Create: `identity-service/src/platform/platform.module.ts`
- Modify: `identity-service/src/app.module.ts`
- Create: `identity-service/src/scripts/seed-apps.ts`
- Test: `identity-service/test/platform.e2e-spec.ts`

**Interfaces:**
- Consumes: `JwtGuard`, `CurrentUser`, repos `App`, `UserTenant`, `Tenant`, `User`.
- Produces:
  - `GET /me/apps` (JwtGuard) → `{ success, data: AppInfo[] }`, `AppInfo = { appId, name, description?, iconUrl?, feUrl }` — các app mà user vào được (qua các tenant user thuộc và có app đó trong `tenant.apps`); super admin → tất cả app active.
  - `GET /me/tenants?app=<appId>` (JwtGuard) → `{ success, data: TenantInfo[] }` — công ty user thuộc và có app đó.
  - `seed-apps.ts`: upsert 2 app `ke-toan` (feUrl env `FE_KE_TOAN_URL`) và `giao-viec` (feUrl env `FE_GIAO_VIEC_URL`).

- [ ] **Step 1: Viết e2e test thất bại**

`test/platform.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User, UserStatus } from '../src/entities/user.entity';
import { UserCredential } from '../src/entities/user-credential.entity';
import { UserTenant } from '../src/entities/user-tenant.entity';
import { Tenant } from '../src/entities/tenant.entity';
import { App } from '../src/entities/app.entity';

describe('Platform (e2e)', () => {
  let app: INestApplication; let token: string; let moduleRef: any;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    const users: Repository<User> = moduleRef.get(getRepositoryToken(User));
    const creds: Repository<UserCredential> = moduleRef.get(getRepositoryToken(UserCredential));
    const uts: Repository<UserTenant> = moduleRef.get(getRepositoryToken(UserTenant));
    const tenants: Repository<Tenant> = moduleRef.get(getRepositoryToken(Tenant));
    const apps: Repository<App> = moduleRef.get(getRepositoryToken(App));
    await users.deleteMany({}); await creds.deleteMany({}); await uts.deleteMany({}); await tenants.deleteMany({}); await apps.deleteMany({});
    await apps.save(apps.create({ appId: 'ke-toan', name: 'Kế toán', feUrl: 'http://localhost:5173', isActive: true }));
    await apps.save(apps.create({ appId: 'giao-viec', name: 'Giao việc', feUrl: 'http://localhost:5174', isActive: true }));
    const t = await tenants.save(tenants.create({ name: 'Cty A', slug: 'cty-a', isActive: true, modules: ['KE_TOAN'], apps: ['ke-toan'] }));
    const u = await users.save(users.create({ email: 'p1@test.com', hoTen: 'P1', trangThai: UserStatus.HOAT_DONG, isActive: true }));
    await creds.save(creds.create({ userId: u._id.toString(), password: await bcrypt.hash('pass123', 10), isActive: true }));
    await uts.save(uts.create({ userId: u._id.toString(), tenantId: t._id.toString(), role: 'KIEM_SOAT', isActive: true }));
    const login = await request(app.getHttpServer()).post('/login').send({ email: 'p1@test.com', password: 'pass123' });
    token = login.body.data.accessToken;
  });
  afterAll(async () => { await app.close(); });

  it('GET /me/apps chỉ trả app mà công ty của user có (ke-toan)', async () => {
    const res = await request(app.getHttpServer()).get('/me/apps').set('Authorization', `Bearer ${token}`).expect(200);
    const ids = res.body.data.map((a: any) => a.appId);
    expect(ids).toContain('ke-toan');
    expect(ids).not.toContain('giao-viec');
  });

  it('GET /me/tenants?app=ke-toan trả công ty có app đó', async () => {
    const res = await request(app.getHttpServer()).get('/me/tenants?app=ke-toan').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].apps).toContain('ke-toan');
  });
});
```

- [ ] **Step 2: Chạy → FAIL**

Run: `npm run test:e2e -- platform.e2e-spec`
Expected: FAIL (route chưa tồn tại).

- [ ] **Step 3: Tạo `platform.service.ts`**

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { User, SUPER_ADMIN_EMAIL } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { App } from '../entities/app.entity';

export interface AppInfo { appId: string; name: string; description?: string; iconUrl?: string; feUrl: string; }

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserTenant) private readonly utRepo: Repository<UserTenant>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(App) private readonly appRepo: Repository<App>,
  ) {}

  private async tenantsOf(user: User): Promise<Tenant[]> {
    if (user.email === SUPER_ADMIN_EMAIL) return this.tenantRepo.find({ where: { isActive: true } });
    const ms = await this.utRepo.find({ where: { userId: user._id.toString(), isActive: true } });
    if (!ms.length) return [];
    const ids = ms.map((m) => new ObjectId(m.tenantId));
    return this.tenantRepo.find({ where: { _id: { $in: ids } as any, isActive: true } });
  }

  async listApps(userId: string): Promise<AppInfo[]> {
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(userId) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    const allApps = await this.appRepo.find({ where: { isActive: true } });
    if (user.email === SUPER_ADMIN_EMAIL) {
      return allApps.map((a) => ({ appId: a.appId, name: a.name, description: a.description, iconUrl: a.iconUrl, feUrl: a.feUrl }));
    }
    const tenants = await this.tenantsOf(user);
    const enabled = new Set<string>();
    tenants.forEach((t) => (t.apps ?? []).forEach((id) => enabled.add(id)));
    return allApps.filter((a) => enabled.has(a.appId))
      .map((a) => ({ appId: a.appId, name: a.name, description: a.description, iconUrl: a.iconUrl, feUrl: a.feUrl }));
  }

  async tenantsForApp(userId: string, appId: string) {
    const user = await this.userRepo.findOne({ where: { _id: new ObjectId(userId) as any } });
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');
    const tenants = await this.tenantsOf(user);
    return tenants.filter((t) => (t.apps ?? []).includes(appId)).map((t) => ({
      tenantId: t._id.toString(), tenantName: t.name, tenantSlug: t.slug,
      modules: t.modules ?? ['KE_TOAN'], glossary: t.glossary ?? {}, nganh: t.nganh ?? null, apps: t.apps ?? [],
    }));
  }
}
```

- [ ] **Step 4: Tạo `platform.controller.ts` + module + wire**

`src/platform/platform.controller.ts`:
```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('me')
@UseGuards(JwtGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('apps')
  async apps(@CurrentUser() user: CurrentUserPayload) {
    return { success: true, data: await this.platform.listApps(user.id) };
  }

  @Get('tenants')
  async tenants(@CurrentUser() user: CurrentUserPayload, @Query('app') app: string) {
    return { success: true, data: await this.platform.tenantsForApp(user.id, app) };
  }
}
```

`src/platform/platform.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { Tenant } from '../entities/tenant.entity';
import { App } from '../entities/app.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserTenant, Tenant, App]), AuthModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
```
> Lưu ý thứ tự route: `GET /me/apps` và `GET /me/tenants` (PlatformController) vs `GET /me` (AuthController) — khác path con nên không xung đột.

`src/app.module.ts` (thêm `PlatformModule`):
```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PlatformModule } from './platform/platform.module';

@Module({ imports: [DatabaseModule, AuthModule, PlatformModule] })
export class AppModule {}
```

- [ ] **Step 5: Tạo `scripts/seed-apps.ts`**

```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { App } from '../entities/app.entity';

async function main() {
  const ds = new DataSource({
    type: 'mongodb', url: process.env.MONGODB_URI, database: process.env.MONGODB_DATABASE,
    entities: [App], synchronize: false,
  });
  await ds.initialize();
  const repo = ds.getMongoRepository(App);
  const defs = [
    { appId: 'ke-toan', name: 'Kế toán', feUrl: process.env.FE_KE_TOAN_URL || 'http://localhost:5173', isActive: true },
    { appId: 'giao-viec', name: 'Giao việc', feUrl: process.env.FE_GIAO_VIEC_URL || 'http://localhost:5174', isActive: true },
  ];
  for (const d of defs) {
    const existing = await repo.findOne({ where: { appId: d.appId } });
    if (existing) { await repo.update({ _id: existing._id }, d as any); }
    else { await repo.save(repo.create(d as any)); }
    console.log(`upserted app ${d.appId}`);
  }
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 6: Chạy e2e → PASS**

Run: `npm run test:e2e -- platform.e2e-spec`
Expected: PASS (2 test).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(identity): apps registry + GET /me/apps + GET /me/tenants?app + seed-apps"
```

---

## Task 7: Script migrate danh tính ke-toan-so → masterceo_identity

**Files:**
- Create: `identity-service/src/scripts/migrate-identity.ts`
- Test: `identity-service/src/scripts/migrate-identity.spec.ts`

**Interfaces:**
- Consumes: driver `mongodb` thuần (KHÔNG qua TypeORM — thao tác copy collection).
- Produces:
  - Hàm `migrateIdentity(opts: { sourceDb: string; targetDb: string; uri: string; dryRun: boolean }): Promise<MigrationReport>`.
  - `MigrationReport = { copied: Record<string, number>; skipped: Record<string, number>; conflicts: string[] }`.
  - Copy 4 collection: `users`, `user_credentials`, `user_tenants`, `tenants` từ `sourceDb` → `targetDb`.
  - **Idempotent:** upsert theo `_id` (đã có thì bỏ qua, đếm vào `skipped`); chạy lại an toàn.
  - `--dry-run`: chỉ đếm, không ghi.
  - CLI: `env-cmd -e dev ts-node src/scripts/migrate-identity.ts [--dry-run]` dùng `SOURCE_MONGODB_DATABASE` → `MONGODB_DATABASE`.

- [ ] **Step 1: Viết test thất bại (idempotent + dry-run)**

`src/scripts/migrate-identity.spec.ts`:
```ts
import { MongoClient } from 'mongodb';
import { migrateIdentity } from './migrate-identity';

const URI = 'mongodb://dbadmin:abcde12345-@localhost:27017/?authSource=admin';
const SRC = 'mig_src_test';
const DST = 'mig_dst_test';

describe('migrateIdentity', () => {
  let client: MongoClient;
  beforeAll(async () => {
    client = await MongoClient.connect(URI);
    await client.db(SRC).dropDatabase();
    await client.db(DST).dropDatabase();
    await client.db(SRC).collection('users').insertOne({ email: 'a@b.com', hoTen: 'A' });
    await client.db(SRC).collection('tenants').insertOne({ name: 'Cty', slug: 'cty' });
  });
  afterAll(async () => {
    await client.db(SRC).dropDatabase(); await client.db(DST).dropDatabase(); await client.close();
  });

  it('dry-run KHÔNG ghi gì', async () => {
    const report = await migrateIdentity({ uri: URI, sourceDb: SRC, targetDb: DST, dryRun: true });
    expect(report.copied.users).toBe(1);
    const count = await client.db(DST).collection('users').countDocuments();
    expect(count).toBe(0);
  });

  it('chạy thật copy dữ liệu', async () => {
    await migrateIdentity({ uri: URI, sourceDb: SRC, targetDb: DST, dryRun: false });
    expect(await client.db(DST).collection('users').countDocuments()).toBe(1);
    expect(await client.db(DST).collection('tenants').countDocuments()).toBe(1);
  });

  it('chạy lại idempotent — không nhân đôi', async () => {
    const report = await migrateIdentity({ uri: URI, sourceDb: SRC, targetDb: DST, dryRun: false });
    expect(report.skipped.users).toBe(1);
    expect(await client.db(DST).collection('users').countDocuments()).toBe(1);
  });
});
```

- [ ] **Step 2: Chạy → FAIL**

Run: `npm test -- migrate-identity.spec`
Expected: FAIL (chưa có module).

- [ ] **Step 3: Tạo `migrate-identity.ts`**

```ts
import 'reflect-metadata';
import { MongoClient } from 'mongodb';

const COLLECTIONS = ['users', 'user_credentials', 'user_tenants', 'tenants'];

export interface MigrationReport {
  copied: Record<string, number>;
  skipped: Record<string, number>;
  conflicts: string[];
}

export async function migrateIdentity(opts: { uri: string; sourceDb: string; targetDb: string; dryRun: boolean }): Promise<MigrationReport> {
  const client = await MongoClient.connect(opts.uri);
  const report: MigrationReport = { copied: {}, skipped: {}, conflicts: [] };
  try {
    const src = client.db(opts.sourceDb);
    const dst = client.db(opts.targetDb);
    for (const name of COLLECTIONS) {
      const docs = await src.collection(name).find({}).toArray();
      let copied = 0, skipped = 0;
      for (const doc of docs) {
        const exists = await dst.collection(name).findOne({ _id: doc._id });
        if (exists) { skipped++; continue; }
        if (!opts.dryRun) await dst.collection(name).insertOne(doc);
        copied++;
      }
      report.copied[name] = copied;
      report.skipped[name] = skipped;
    }
    return report;
  } finally {
    await client.close();
  }
}

// CLI entrypoint
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  migrateIdentity({
    uri: process.env.MONGODB_URI!,
    sourceDb: process.env.SOURCE_MONGODB_DATABASE!,
    targetDb: process.env.MONGODB_DATABASE!,
    dryRun,
  })
    .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
```
> Lưu ý: idempotent theo `_id` giữ nguyên `_id` gốc → `userId`/`tenantId` (chuỗi của `_id`) trong các collection vẫn khớp sau copy. Đây là điều kiện để login chạy đúng sau migrate.

- [ ] **Step 4: Chạy test → PASS**

Run: `npm test -- migrate-identity.spec`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(identity): script migrate danh tính digital_book → masterceo_identity (idempotent, dry-run)"
```

---

## Task 8: Tích hợp cuối — chạy migrate thật + smoke test login end-to-end + README

**Files:**
- Create: `identity-service/README.md`
- (Không tạo code mới — đây là task vận hành + kiểm thử thủ công có ghi lại)

**Interfaces:**
- Consumes: toàn bộ Task 1–7.
- Produces: DB `masterceo_identity` đã có dữ liệu thật của ke-toan-so; Identity service chạy port 3020; login bằng tài khoản thật trả accessToken.

- [ ] **Step 1: Backup DB nguồn trước khi migrate thật**

Run:
```bash
mongodump --uri="mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin" --out=/tmp/backup-digital_book-$(date +%Y%m%d)
```
Expected: thư mục dump tạo thành công.

- [ ] **Step 2: Chạy migrate dry-run, kiểm tra báo cáo**

Run: `cd /Users/os_anhvt/Documents/Dino/identity-service && npm run migrate -- --dry-run`
Expected: in ra `copied` cho `users/user_credentials/user_tenants/tenants` đúng số lượng kỳ vọng; `masterceo_identity` vẫn rỗng.

- [ ] **Step 3: Chạy migrate thật**

Run: `npm run migrate`
Expected: `copied` > 0; chạy lại lần 2 → toàn bộ vào `skipped` (idempotent).

- [ ] **Step 4: Seed apps + set entitlement cho các tenant**

Run:
```bash
env-cmd -e dev ts-node src/scripts/seed-apps.ts
```
Sau đó gán `apps` cho các tenant hiện có (các công ty đang dùng kế toán) bằng mongosh:
```bash
mongosh "mongodb://dbadmin:abcde12345-@localhost:27017/masterceo_identity?authSource=admin" \
  --eval 'db.tenants.updateMany({}, { $set: { apps: ["ke-toan"] } })'
```
Expected: 2 app được upsert; mọi tenant có `apps: ["ke-toan"]`.

- [ ] **Step 5: Khởi động Identity service**

Run: `npm run start:dev`
Expected: log `Identity Service running on port 3020`.

- [ ] **Step 6: Smoke test login bằng tài khoản thật**

Run (thay email/password bằng một tài khoản thật đã migrate):
```bash
curl -s -X POST http://localhost:3020/login -H 'Content-Type: application/json' \
  -d '{"email":"<email-that>","password":"<mat-khau-that>"}' | head -40
```
Expected: trả `{ success: true, data: { accessToken | tempToken, ... } }`. Nếu nhiều tenant → có `tempToken` + `tenants[]`; gọi tiếp `/select-tenant`. Sau khi có accessToken, gọi:
```bash
curl -s http://localhost:3020/me/apps -H "Authorization: Bearer <accessToken>"
```
Expected: trả app `ke-toan`.

- [ ] **Step 7: Viết `README.md`** (cách chạy, env, migrate, port, contract token) và commit

```bash
git add -A && git commit -m "docs(identity): README + hoàn tất migrate thật & smoke test login Sub-plan 1"
```

---

## Self-Review

**Spec coverage (so với spec mục 5, 9):**
- §5.1 service standalone → Task 1, 5. §5.2 data model (5 collection + `apps` field + `apps` registry) → Task 2. §5.3 token danh tính → Task 3. §5.4 endpoints login/select/switch/register/verify/me/change-password/logout → Task 5; `/me/apps`, `/me/tenants?app` → Task 6. (`GET /tenants/:id`, `/users/:id`, `/introspect`, refresh/cookie phiên → thuộc Sub-plan 2/4, ghi rõ ngoài phạm vi sub-plan 1.)
- §9 migrate (copy 4 collection, idempotent, dry-run, báo cáo, giữ `_id`) → Task 7, 8. Dedup theo email & import user task-management → **Sub-plan 3** (task-management chưa đụng ở đây). Set `tenants.apps` → Task 8 step 4.
- **Gap có chủ đích:** Sub-plan 1 KHÔNG sửa ke-toan-so/task-management (đúng Global Constraint "chạy song song"). Phần ke-toan-so trỏ sang Identity, refresh-token/cookie SSO, portal FE, và import dữ liệu task-management nằm ở Sub-plan 2–5.

**Placeholder scan:** không còn TBD/“xử lý lỗi phù hợp”; mọi step có code/lệnh cụ thể. Các chỗ "đọc file nguồn rồi sao y" đều chỉ đường dẫn chính xác + liệt kê thay đổi cụ thể.

**Type consistency:** `UserPayload {id,email,tenantId}` dùng nhất quán ở JwtService (Task 3), JwtGuard gán `request.user={id,email,tenantId}` (Task 4), `CurrentUserPayload` (Task 4) khớp; `TenantInfo` bỏ `role` + thêm `apps` nhất quán giữa AuthService (Task 5) và PlatformService (Task 6); `AppInfo` định nghĩa ở Task 6 và test khớp.

---

## Các Sub-plan tiếp theo (viết sau khi Sub-plan 1 xong)

- **Sub-plan 2 — ke-toan-so trỏ sang Identity:** align `JWT_SECRET`, JwtGuard đọc token danh tính, chuyển role/permission kế toán về phía kế toán (key `userId`+`tenantId`), lấy chi tiết user/tenant qua API Identity (`GET /users/:id`, `GET /tenants/:id` — thêm vào Identity ở sub-plan này), bỏ login cũ.
- **Sub-plan 3 — task-management trỏ sang Identity + migrate dữ liệu task:** dedup user theo email, map tenant trùng, viết lại `tenantId` nghiệp vụ, membership/role phía task; `jwt.strategy` verify token Identity.
- **Sub-plan 4 — Portal FE + SSO cookie phiên:** refresh token + cookie `.<domain>`, luồng Chọn App → Công ty, handoff token sang FE từng app.
- **Sub-plan 5 — Cắt sang & dọn dẹp:** cả 2 app login qua portal, gỡ màn login cũ, kiểm thử hồi quy.

## Execution Handoff (chọn sau khi duyệt plan)
1. **Subagent-Driven (khuyến nghị)** — mỗi task một subagent mới, review giữa các task.
2. **Inline Execution** — chạy trong session này theo lô + checkpoint.
