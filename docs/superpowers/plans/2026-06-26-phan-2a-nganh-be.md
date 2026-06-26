# Phần 2a — Nền Backend: Ngành + Glossary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm thực thể `Nganh` (ngành) với từ điển nhãn (glossary) + CRUD + seed; gắn `nganh`/`glossary` vào `Tenant` và clone glossary khi gán ngành; trả `glossary` về FE trong login/`/me`.

**Architecture:** `Nganh` mirror nguyên pattern `LinhVuc` (entity toàn cục + service onModuleInit seed + controller SuperAdmin-guarded). `Tenant` nhận 2 cột mới `nganh` (mã) + `glossary` (json). Khi tạo/sửa tenant với `nganh`, clone sâu `Nganh.glossary` vào `Tenant.glossary`. Auth đọc `tenant.glossary` và đính vào `TenantInfo`.

**Tech Stack:** NestJS 11, TypeORM + MongoDB, class-validator, jest.

## Global Constraints

- Backend only (FE đọc glossary ở Phần 2b). Không sửa gateway (route `/master-data/*` đã generic; `/master-data/nganh` tự hoạt động như `/master-data/linh-vuc`).
- `Nganh` mirror `LinhVuc`: entity toàn cục, seed qua `onModuleInit` (chỉ seed khi collection rỗng), controller dùng `@app/auth` `JwtGuard` (đọc) + `SuperAdminGuard` (ghi).
- `code` của Ngành: `^[A-Z0-9_]+$`, **bất biến** khi update.
- Glossary shape (chuẩn, dùng xuyên suốt): `Glossary = Record<string, { label: string; surfaces?: Record<string,string> }>`.
- Seed ngành mặc định: `XAY_DUNG` với `glossary.chuDauTu = { label: "Chủ đầu tư", surfaces: { "nkc.colMa": "Mã CĐT", "nkc.colTen": "CĐT" } }`.
- Clone là **deep copy** (`JSON.parse(JSON.stringify(...))`) — Tenant.glossary KHÔNG dùng chung tham chiếu với Nganh.glossary.
- Cột json mới: dùng `@Column({ type: 'json', default: {} })` (mirror `Tenant.modules`).
- Repo SuperAdmin (không lọc tenant): inject qua `RAW_REPOSITORY_TOKEN_PREFIX` (như LinhVuc/Tenant service).
- BE test: `cd be && yarn jest <path>`. Build service: `cd be && npx nest build master-data-service` và `npx nest build auth-service`.

---

## File Structure

- `be/libs/entities/src/nganh/nganh.entity.ts` (CREATE) — entity `Nganh` + types `GlossaryItem`/`Glossary`.
- `be/libs/entities/src/nganh/index.ts` (CREATE) — barrel.
- `be/libs/entities/src/index.ts` (MODIFY) — export `./nganh`.
- `be/libs/entities/src/tenant/tenant.entity.ts` (MODIFY) — thêm `nganh`, `glossary`.
- `be/libs/dto/src/nganh/{create,update}-nganh.dto.ts` + `index.ts` (CREATE); `be/libs/dto/src/index.ts` (MODIFY).
- `be/libs/dto/src/tenant/{create,update}-tenant.dto.ts` (MODIFY) — thêm `nganh?`.
- `be/libs/dto/src/auth/auth-response.dto.ts` (MODIFY) — `TenantInfo.glossary?`.
- `be/apps/master-data-service/src/nganh/{nganh.service.ts, nganh.controller.ts, nganh.module.ts, nganh.seed.ts, nganh.service.spec.ts}` (CREATE).
- `be/apps/master-data-service/src/master-data-service.module.ts` (MODIFY) — import `NganhModule`.
- `be/apps/master-data-service/src/tenant/tenant.module.ts` (MODIFY) — thêm `Nganh` vào `forFeatureRaw`.
- `be/apps/master-data-service/src/tenant/tenant.service.ts` (MODIFY) — inject Nganh repo + `cloneGlossaryFromNganh` + dùng trong create/update.
- `be/apps/master-data-service/src/tenant/tenant.service.spec.ts` (CREATE hoặc MODIFY) — test clone.
- `be/apps/auth-service/src/auth-service.service.ts` (MODIFY) — đính `glossary` vào TenantInfo.

---

### Task 1: Entity `Nganh` + types Glossary

**Files:**
- Create: `be/libs/entities/src/nganh/nganh.entity.ts`
- Create: `be/libs/entities/src/nganh/index.ts`
- Modify: `be/libs/entities/src/index.ts`

**Interfaces:**
- Produces: `class Nganh` (fields `code,name,description,isActive,glossary`); `interface GlossaryItem { label: string; surfaces?: Record<string,string> }`; `type Glossary = Record<string, GlossaryItem>`.

- [ ] **Step 1: Tạo entity** `be/libs/entities/src/nganh/nganh.entity.ts`:

```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Một nhãn trong từ điển ngành: nhãn gốc + override theo vị trí. */
export interface GlossaryItem {
  label: string;
  surfaces?: Record<string, string>;
}

/** Từ điển thuật ngữ: key khái niệm (vd 'chuDauTu') → nhãn. */
export type Glossary = Record<string, GlossaryItem>;

/** Ngành (vd Xây dựng, Mầm non) — quyết định nhãn hiển thị + là template clone. */
@Entity('nganh')
export class Nganh extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', default: {} })
  glossary: Glossary;
}
```

- [ ] **Step 2: Tạo barrel** `be/libs/entities/src/nganh/index.ts`:

```ts
export * from './nganh.entity';
```

- [ ] **Step 3: Export từ barrel gốc** — thêm vào `be/libs/entities/src/index.ts` (sau dòng `export * from './linh-vuc';`):

```ts
export * from './nganh';
```

- [ ] **Step 4: Build kiểm tra type**

Run: `cd be && npx nest build master-data-service`
Expected: build PASS (entity hợp lệ).

- [ ] **Step 5: Commit**

```bash
git add be/libs/entities/src/nganh be/libs/entities/src/index.ts
git commit -m "feat(nganh): entity Nganh + types Glossary"
```

---

### Task 2: DTO Nganh (create/update)

**Files:**
- Create: `be/libs/dto/src/nganh/create-nganh.dto.ts`, `update-nganh.dto.ts`, `index.ts`
- Modify: `be/libs/dto/src/index.ts`

**Interfaces:**
- Consumes: `Glossary` từ `@app/entities` (Task 1).
- Produces: `CreateNganhDto` (`code,name,description?,isActive?,glossary?`), `UpdateNganhDto` (như create nhưng bỏ `code`, tất cả optional).

- [ ] **Step 1: Tạo** `be/libs/dto/src/nganh/create-nganh.dto.ts`:

```ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, Matches } from 'class-validator';
import type { Glossary } from '@app/entities';

export class CreateNganhDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code chỉ gồm chữ HOA, số và gạch dưới' })
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  glossary?: Glossary;
}
```

- [ ] **Step 2: Tạo** `be/libs/dto/src/nganh/update-nganh.dto.ts`:

```ts
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import type { Glossary } from '@app/entities';

export class UpdateNganhDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  glossary?: Glossary;
}
```

- [ ] **Step 3: Tạo barrel** `be/libs/dto/src/nganh/index.ts`:

```ts
export * from './create-nganh.dto';
export * from './update-nganh.dto';
```

- [ ] **Step 4: Wire vào** `be/libs/dto/src/index.ts` — thêm cạnh các dòng linh-vuc:
  - thêm `import './nganh';` (cạnh `import './linh-vuc';`)
  - thêm `export * from './nganh';` (cạnh `export * from './linh-vuc';`)

- [ ] **Step 5: Build**

Run: `cd be && npx nest build master-data-service`
Expected: build PASS.

- [ ] **Step 6: Commit**

```bash
git add be/libs/dto/src/nganh be/libs/dto/src/index.ts
git commit -m "feat(nganh): DTO create/update Nganh"
```

---

### Task 3: NganhService + Controller + Module + Seed (TDD)

**Files:**
- Create: `be/apps/master-data-service/src/nganh/nganh.seed.ts`
- Create: `be/apps/master-data-service/src/nganh/nganh.service.ts`
- Create: `be/apps/master-data-service/src/nganh/nganh.service.spec.ts`
- Create: `be/apps/master-data-service/src/nganh/nganh.controller.ts`
- Create: `be/apps/master-data-service/src/nganh/nganh.module.ts`
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`

**Interfaces:**
- Consumes: `Nganh` (Task 1), `CreateNganhDto/UpdateNganhDto` (Task 2), `RAW_REPOSITORY_TOKEN_PREFIX` từ `@app/database`, `sanitizeUpdateDto` từ `@app/core`, `JwtGuard/SuperAdminGuard` từ `@app/auth`.
- Produces: `NganhService` (`seedDefaults, findAll, findOne(id), create(dto), update(id,dto), delete(id)`), `NganhController` (`@Controller('nganh')`), `NganhModule`.

- [ ] **Step 1: Seed** `be/apps/master-data-service/src/nganh/nganh.seed.ts`:

```ts
export const DEFAULT_NGANH_SEED = [
  {
    code: 'XAY_DUNG',
    name: 'Xây dựng',
    description: 'Ngành xây dựng — chủ đầu tư, dự án',
    isActive: true,
    glossary: {
      chuDauTu: {
        label: 'Chủ đầu tư',
        surfaces: { 'nkc.colMa': 'Mã CĐT', 'nkc.colTen': 'CĐT' },
      },
    },
  },
];
```

- [ ] **Step 2: Viết test thất bại** `be/apps/master-data-service/src/nganh/nganh.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { NganhService } from './nganh.service';

function mockRepo(initial: any[] = []) {
  const store = [...initial];
  return {
    store,
    find: jest.fn(async () => store),
    findOne: jest.fn(async ({ where }: any) => {
      if (where.code) return store.find((x) => x.code === where.code) ?? null;
      if (where._id) return store.find((x) => String(x._id) === String(where._id)) ?? null;
      return null;
    }),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => { store.push(x); return x; }),
    remove: jest.fn(async (x: any) => { const i = store.indexOf(x); if (i >= 0) store.splice(i, 1); }),
    count: jest.fn(async () => store.length),
  } as any;
}

describe('NganhService', () => {
  let service: NganhService;
  let nganhRepo: any;
  let tenantRepo: any;

  beforeEach(async () => {
    nganhRepo = mockRepo();
    tenantRepo = mockRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NganhService,
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`, useValue: nganhRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`, useValue: tenantRepo },
      ],
    }).compile();
    service = moduleRef.get(NganhService);
  });

  it('create chặn trùng code', async () => {
    await service.create({ code: 'XAY_DUNG', name: 'Xây dựng' } as any);
    await expect(
      service.create({ code: 'XAY_DUNG', name: 'XD 2' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('create gán glossary mặc định {} nếu không truyền', async () => {
    const created = await service.create({ code: 'MAM_NON', name: 'Mầm non' } as any);
    expect(created.glossary).toEqual({});
  });

  it('delete chặn khi còn tenant dùng ngành', async () => {
    const created = await service.create({ code: 'XAY_DUNG', name: 'Xây dựng' } as any);
    tenantRepo.store.push({ nganh: 'XAY_DUNG' });
    await expect(service.delete(String(created._id))).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `cd be && yarn jest apps/master-data-service/src/nganh/nganh.service.spec.ts`
Expected: FAIL — không tìm thấy `./nganh.service` (chưa tạo).

- [ ] **Step 4: Tạo service** `be/apps/master-data-service/src/nganh/nganh.service.ts`:

```ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Nganh } from '@app/entities';
import { CreateNganhDto, UpdateNganhDto } from '@app/dto';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { sanitizeUpdateDto } from '@app/core';
import { DEFAULT_NGANH_SEED } from './nganh.seed';

@Injectable()
export class NganhService implements OnModuleInit {
  private readonly logger = new Logger(NganhService.name);

  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`)
    private readonly nganhRepository: Repository<Nganh>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`)
    private readonly tenantRepository: Repository<{ nganh?: string }>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async seedDefaults(): Promise<void> {
    const count = await this.nganhRepository.count();
    if (count > 0) return;
    const { ObjectId } = await import('mongodb');
    for (const item of DEFAULT_NGANH_SEED) {
      const entity = this.nganhRepository.create({
        _id: new ObjectId() as any,
        ...item,
      });
      await this.nganhRepository.save(entity);
    }
    this.logger.log(`Seeded ${DEFAULT_NGANH_SEED.length} ngành mặc định`);
  }

  async findAll(): Promise<Nganh[]> {
    return this.nganhRepository.find();
  }

  async findOne(id: string): Promise<Nganh> {
    const { ObjectId } = await import('mongodb');
    const found = await this.nganhRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!found) throw new NotFoundException(`Không tìm thấy ngành ${id}`);
    return found;
  }

  async create(dto: CreateNganhDto): Promise<Nganh> {
    const existing = await this.nganhRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Ngành với code ${dto.code} đã tồn tại`);

    const { ObjectId } = await import('mongodb');
    const entity = this.nganhRepository.create({
      _id: new ObjectId() as any,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive ?? true,
      glossary: dto.glossary ?? {},
    });
    return this.nganhRepository.save(entity);
  }

  async update(id: string, dto: UpdateNganhDto): Promise<Nganh> {
    const nganh = await this.findOne(id);
    const clean = sanitizeUpdateDto(dto as any);
    delete (clean as any).code; // code bất biến
    Object.assign(nganh, clean);
    return this.nganhRepository.save(nganh);
  }

  async delete(id: string): Promise<void> {
    const nganh = await this.findOne(id);
    const tenants = await this.tenantRepository.find();
    const inUse = tenants.filter((t) => t.nganh === nganh.code);
    if (inUse.length > 0) {
      throw new ConflictException(
        `Không thể xóa: còn ${inUse.length} công ty đang dùng ngành này`,
      );
    }
    await this.nganhRepository.remove(nganh);
  }
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `cd be && yarn jest apps/master-data-service/src/nganh/nganh.service.spec.ts`
Expected: PASS (3/3).

- [ ] **Step 6: Tạo controller** `be/apps/master-data-service/src/nganh/nganh.controller.ts`:

```ts
import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { NganhService } from './nganh.service';
import { CreateNganhDto, UpdateNganhDto } from '@app/dto';
import { JwtGuard, SuperAdminGuard } from '@app/auth';

@Controller('nganh')
export class NganhController {
  constructor(private readonly nganhService: NganhService) {}

  @Get()
  @UseGuards(JwtGuard)
  async findAll() {
    const data = await this.nganhService.findAll();
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtGuard, SuperAdminGuard)
  async create(@Body() dto: CreateNganhDto) {
    const data = await this.nganhService.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateNganhDto) {
    const data = await this.nganhService.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async delete(@Param('id') id: string) {
    await this.nganhService.delete(id);
    return { success: true, message: 'Xóa ngành thành công' };
  }
}
```

- [ ] **Step 7: Tạo module** `be/apps/master-data-service/src/nganh/nganh.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { Nganh, Tenant } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NganhController } from './nganh.controller';
import { NganhService } from './nganh.service';

@Module({
  imports: [DatabaseModule.forFeatureRaw([Nganh, Tenant])],
  controllers: [NganhController],
  providers: [NganhService],
  exports: [NganhService],
})
export class NganhModule {}
```

- [ ] **Step 8: Wire vào app module** `be/apps/master-data-service/src/master-data-service.module.ts`:
  - thêm import (cạnh `LinhVucModule`): `import { NganhModule } from './nganh/nganh.module';`
  - thêm `NganhModule,` vào mảng `imports` của `@Module` (cạnh `LinhVucModule,` trong danh sách feature modules).

- [ ] **Step 9: Build + chạy lại test**

Run: `cd be && npx nest build master-data-service && yarn jest apps/master-data-service/src/nganh/nganh.service.spec.ts`
Expected: build PASS; test 3/3 PASS.

- [ ] **Step 10: Commit**

```bash
git add be/apps/master-data-service/src/nganh be/apps/master-data-service/src/master-data-service.module.ts
git commit -m "feat(nganh): service + controller + module + seed XAY_DUNG"
```

---

### Task 4: Tenant entity + DTO nhận `nganh`/`glossary`

**Files:**
- Modify: `be/libs/entities/src/tenant/tenant.entity.ts`
- Modify: `be/libs/dto/src/tenant/create-tenant.dto.ts`
- Modify: `be/libs/dto/src/tenant/update-tenant.dto.ts`

**Interfaces:**
- Consumes: `Glossary` từ `@app/entities` (Task 1).
- Produces: `Tenant.nganh?: string | null`, `Tenant.glossary: Glossary`; `CreateTenantDto.nganh?`, `UpdateTenantDto.nganh?`.

- [ ] **Step 1: Thêm cột vào** `be/libs/entities/src/tenant/tenant.entity.ts` — thêm import `Glossary` và 2 cột sau cột `modules`:

```ts
import { Glossary } from '../nganh/nganh.entity';
```

```ts
  // Ngành (vd 'XAY_DUNG') — quyết định nhãn hiển thị.
  @Column({ nullable: true })
  nganh?: string;

  // Từ điển nhãn của công ty (clone từ Nganh khi gán ngành, sửa riêng được).
  @Column({ type: 'json', default: {} })
  glossary: Glossary;
```

- [ ] **Step 2: Thêm `nganh?` vào** `be/libs/dto/src/tenant/create-tenant.dto.ts` — thêm field (cạnh `modules?`):

```ts
  // Ngành công ty thuộc về (vd 'XAY_DUNG'). Clone glossary của ngành vào tenant.
  @IsString()
  @IsOptional()
  nganh?: string;
```

- [ ] **Step 3: Thêm `nganh?` vào** `be/libs/dto/src/tenant/update-tenant.dto.ts` — thêm field (cạnh `modules?`):

```ts
  @IsString()
  @IsOptional()
  nganh?: string;
```

- [ ] **Step 4: Build**

Run: `cd be && npx nest build master-data-service && npx nest build auth-service`
Expected: build PASS cả 2 service (entity dùng chung).

- [ ] **Step 5: Commit**

```bash
git add be/libs/entities/src/tenant/tenant.entity.ts be/libs/dto/src/tenant
git commit -m "feat(tenant): cột nganh + glossary và DTO nganh"
```

---

### Task 5: Clone glossary khi gán ngành cho tenant (TDD)

**Files:**
- Modify: `be/apps/master-data-service/src/tenant/tenant.module.ts`
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.ts`
- Create: `be/apps/master-data-service/src/tenant/tenant.service.spec.ts`

**Interfaces:**
- Consumes: `Nganh`, `Glossary` (Task 1); `RAW_REPOSITORY_TOKEN_PREFIX`.
- Produces: `TenantService.cloneGlossaryFromNganh(nganhCode?: string | null): Promise<Glossary>` — trả deep-copy glossary của ngành theo code, `{}` nếu không có code / không tìm thấy. Create & update dùng nó để set `tenant.nganh` + `tenant.glossary`.

- [ ] **Step 1: Đăng ký Nganh repo cho TenantModule** — `be/apps/master-data-service/src/tenant/tenant.module.ts`: thêm `Nganh` vào import entities và `forFeatureRaw`:

```ts
import { Tenant, User, UserCredential, UserTenant, VaiTro, PhanQuyen, Nganh } from '@app/entities';
```
```ts
    DatabaseModule.forFeatureRaw([Tenant, User, UserCredential, UserTenant, VaiTro, PhanQuyen, Nganh]),
```

- [ ] **Step 2: Viết test thất bại** `be/apps/master-data-service/src/tenant/tenant.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { TenantService } from './tenant.service';

function repoWith(items: any[] = []) {
  const store = [...items];
  return {
    store,
    find: jest.fn(async () => store),
    findOne: jest.fn(async ({ where }: any) =>
      store.find((x) =>
        (where.code && x.code === where.code) ||
        (where._id && String(x._id) === String(where._id)),
      ) ?? null,
    ),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => x),
    count: jest.fn(async () => store.length),
  } as any;
}

describe('TenantService.cloneGlossaryFromNganh', () => {
  let service: TenantService;

  async function build(nganhItems: any[]) {
    const empty = repoWith();
    const nganhRepo = repoWith(nganhItems);
    const moduleRef = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}User`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}UserCredential`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}UserTenant`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`, useValue: empty },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`, useValue: nganhRepo },
      ],
    }).compile();
    return { service: moduleRef.get(TenantService), nganhRepo };
  }

  const XD = { code: 'XAY_DUNG', glossary: { chuDauTu: { label: 'Chủ đầu tư' } } };

  it('trả deep-copy glossary của ngành theo code', async () => {
    const built = await build([XD]);
    const g = await built.service.cloneGlossaryFromNganh('XAY_DUNG');
    expect(g).toEqual({ chuDauTu: { label: 'Chủ đầu tư' } });
    // deep copy: sửa kết quả không ảnh hưởng nguồn
    g.chuDauTu.label = 'X';
    expect(XD.glossary.chuDauTu.label).toBe('Chủ đầu tư');
  });

  it('không có code → {}', async () => {
    const built = await build([XD]);
    expect(await built.service.cloneGlossaryFromNganh(undefined)).toEqual({});
    expect(await built.service.cloneGlossaryFromNganh(null)).toEqual({});
  });

  it('code không tồn tại → {}', async () => {
    const built = await build([XD]);
    expect(await built.service.cloneGlossaryFromNganh('KHONG_CO')).toEqual({});
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `cd be && yarn jest apps/master-data-service/src/tenant/tenant.service.spec.ts`
Expected: FAIL — `cloneGlossaryFromNganh` không tồn tại (hoặc DI thiếu Nganh provider trước khi sửa service).

- [ ] **Step 4: Sửa service** `be/apps/master-data-service/src/tenant/tenant.service.ts`:

(a) Import `Nganh, Glossary` từ `@app/entities` (thêm vào dòng import entities hiện có).

(b) Inject Nganh repo trong constructor (thêm sau các repo hiện có):

```ts
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`)
    private readonly nganhRepository: Repository<Nganh>,
```

(c) Thêm method public:

```ts
  /** Clone (deep) glossary của ngành theo code; {} nếu không có code / không tìm thấy. */
  async cloneGlossaryFromNganh(nganhCode?: string | null): Promise<Glossary> {
    if (!nganhCode) return {};
    const nganh = await this.nganhRepository.findOne({ where: { code: nganhCode } });
    if (!nganh?.glossary) return {};
    return JSON.parse(JSON.stringify(nganh.glossary)) as Glossary;
  }
```

(d) Trong `create()`: trước khi tạo entity tenant, tính glossary; thêm `nganh` + `glossary` vào object `tenantRepository.create({...})`:

```ts
    const glossary = await this.cloneGlossaryFromNganh(createDto.nganh);
```
và trong literal create (cạnh `modules: ...`):
```ts
      nganh: createDto.nganh ?? null,
      glossary,
```

(e) Trong `update()`: sau `const tenant = await this.findOne(id);`, trước `Object.assign(...)`, thêm:

```ts
    if (updateDto.nganh && updateDto.nganh !== tenant.nganh) {
      tenant.glossary = await this.cloneGlossaryFromNganh(updateDto.nganh);
    }
```
(`Object.assign(tenant, sanitizeUpdateDto(updateDto))` ngay sau đó sẽ set `tenant.nganh` từ DTO; glossary đã gán ở trên không bị ghi đè vì `glossary` không nằm trong UpdateTenantDto.)

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `cd be && yarn jest apps/master-data-service/src/tenant/tenant.service.spec.ts`
Expected: PASS (3/3).

- [ ] **Step 6: Build**

Run: `cd be && npx nest build master-data-service`
Expected: build PASS.

- [ ] **Step 7: Commit**

```bash
git add be/apps/master-data-service/src/tenant
git commit -m "feat(tenant): clone glossary từ ngành khi tạo/sửa công ty"
```

---

### Task 6: Auth trả `glossary` trong TenantInfo

**Files:**
- Modify: `be/libs/dto/src/auth/auth-response.dto.ts`
- Modify: `be/apps/auth-service/src/auth-service.service.ts`

**Interfaces:**
- Produces: `TenantInfo.glossary?: Record<string, { label: string; surfaces?: Record<string,string> }>`.
- Consumes: `tenant.glossary` (Task 4).

- [ ] **Step 1: Thêm field vào** `be/libs/dto/src/auth/auth-response.dto.ts` — trong `interface TenantInfo`, sau `modules: string[];`:

```ts
  // Từ điển nhãn của công ty (theo ngành); FE dùng render nhãn động.
  glossary?: Record<string, { label: string; surfaces?: Record<string, string> }>;
```

- [ ] **Step 2: Đính glossary ở `buildTenantInfo`** — `be/apps/auth-service/src/auth-service.service.ts`, trong object trả về của `buildTenantInfo` (sau `modules: ...`):

```ts
    glossary: tenant.glossary ?? {},
```

- [ ] **Step 3: Đính glossary ở các nhánh build inline (SuperAdmin + getMe)** — tại 3 chỗ map `TenantInfo` inline (login SuperAdmin path; getMe SuperAdmin path; getMe regular `availableTenants`), thêm vào mỗi object literal (sau `modules: ...`):

```ts
      glossary: tenant.glossary ?? {},
```
(Ở nhánh dùng biến `t`, viết `glossary: t.glossary ?? {},`.)

> Lưu ý: tìm đủ **tất cả** nơi tạo `TenantInfo` literal trong file (login + getMe, SuperAdmin + regular). Nơi nào gọi `buildTenantInfo(...)` thì đã tự có glossary từ Step 2; chỉ thêm tay ở các literal inline.

- [ ] **Step 4: Build**

Run: `cd be && npx nest build auth-service`
Expected: build PASS.

- [ ] **Step 5: Verify không sót literal** — xác nhận mọi TenantInfo có glossary:

Run: `cd be && grep -n "tenantSlug:" apps/auth-service/src/auth-service.service.ts`
Expected: mỗi vị trí liệt kê đều nằm trong một object đã có dòng `glossary:` (kiểm tra thủ công từng vị trí), HOẶC là tham số gọi `buildTenantInfo`.

- [ ] **Step 6: Commit**

```bash
git add be/libs/dto/src/auth/auth-response.dto.ts be/apps/auth-service/src/auth-service.service.ts
git commit -m "feat(auth): trả glossary của công ty trong TenantInfo (login + /me)"
```

---

## Self-Review (đã rà soát)

- **Spec coverage (Phần 2a):** entity Nganh + CRUD + seed XAY_DUNG (Task 1,2,3); Tenant.nganh + glossary (Task 4); clone-khi-chọn-ngành (Task 5); "lưu chuẩn ngành" = PUT /nganh/:id với glossary (Task 2/3 — UpdateNganhDto.glossary); login//me trả glossary (Task 6). ✓ ("Save as standard" không cần endpoint riêng: FE gọi PUT /nganh/:id {glossary} — đã hỗ trợ.)
- **Out-of-scope (đúng phân rã):** endpoint cho Admin công ty tự sửa glossary của tenant mình (edit-in-place) thuộc **2c**; FE term registry/TermContext thuộc **2b**.
- **Placeholder scan:** không có TBD; mọi step có code/lệnh cụ thể.
- **Type consistency:** `Glossary`/`GlossaryItem` định nghĩa ở Task 1, dùng nhất quán ở DTO (Task 2), Tenant (Task 4), service clone trả `Glossary` (Task 5); TenantInfo.glossary cùng shape (inline, Task 6). `cloneGlossaryFromNganh` chữ ký khớp giữa định nghĩa (Task 5 Step 4) và test (Step 2).
- **Build-green:** Task 1→2 build trước khi service dùng; Task 3 tạo service sau khi entity/dto sẵn; Task 4 thêm cột trước khi Task 5 clone; Task 6 độc lập (chỉ đọc tenant.glossary đã có ở Task 4). Mỗi task build/test xanh.
- **Deploy (sau khi code xong, ngoài plan):** redeploy `master-data-service` + `auth-service`; seed `XAY_DUNG` chạy onModuleInit khi `nganh` rỗng.
