# Lĩnh vực & mapping menu động (config DB) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa danh sách lĩnh vực và mapping menu→lĩnh vực từ hardcode trong code vào DB, quản lý qua UI SuperAdmin; FE ẩn/hiện menu theo mapping động.

**Architecture:** Một collection `linh_vuc` ở master-data-service, mỗi document chứa luôn `menuKeys[]` (gán menu nhúng — quan hệ nhiều-nhiều tự nhiên). FE bỏ constant tĩnh trong `modules.ts`, load lĩnh vực từ `GET /master-data/linh-vuc` qua AuthContext, và lọc menu theo `menuKeys` của lĩnh vực đang chọn. Menu tree vẫn ở code; chỉ "nhãn lĩnh vực" của mỗi menu key là động. BE **không** enforce (giữ v1: chỉ ẩn FE).

**Tech Stack:** BE NestJS 11 + TypeORM (MongoDB) + class-validator; FE React 18 + TS + Vite + AntD + ServiceBase (axios).

## Global Constraints

- Spec nguồn: `docs/superpowers/specs/2026-06-23-linh-vuc-menu-config-dong-design.md`.
- `code` của lĩnh vực **bất biến** sau khi tạo (vì `Tenant.modules` tham chiếu theo `code`). Không cho sửa `code`.
- Mapping **chung toàn hệ thống**, **không** per-tenant.
- Quan hệ menu–lĩnh vực **nhiều-nhiều**.
- **Không** enforce ở BE; **không** đưa cây menu (label/path/icon) vào DB; **không** dynamic routing.
- Lĩnh vực mặc định hệ thống là `KE_TOAN`: dùng làm fallback cho menu chưa gán và **không cho xóa**.
- Icon lưu dạng **tên string** (whitelist AntD), không lưu JSX.
- BE service test bằng Jest (`cd be && yarn test`). FE **chưa có test runner**: chu trình kiểm tra của task FE là `cd fe && npm run build` + `npm run lint` + kiểm tra thủ công (mô tả rõ trong từng task).
- Gateway proxy: FE gọi `/master-data/...` → master-data-service (port 3002), stripPrefix.
- BE `autoLoadEntities: true` → entity mới chỉ cần đăng ký trong `forFeatureRaw([...])` của module, không cần khai báo connection.
- Commit thường xuyên; mỗi task kết thúc bằng 1 commit. Branch: `feat/linh-vuc-config-dong`.

---

## Phase A — Backend (master-data-service)

### Task 1: Entity `LinhVuc`

**Files:**
- Create: `be/libs/entities/src/linh-vuc/linh-vuc.entity.ts`
- Create: `be/libs/entities/src/linh-vuc/index.ts`
- Modify: `be/libs/entities/src/index.ts` (thêm re-export)

**Interfaces:**
- Produces: `class LinhVuc` với các field `code: string`, `name: string`, `description?: string`, `icon: string`, `color: string`, `order: number`, `isActive: boolean`, `menuKeys: string[]` (kế thừa `_id, tenantId, createdAt, updatedAt` từ `BaseEntity`).

- [ ] **Step 1: Tạo entity**

```typescript
// be/libs/entities/src/linh-vuc/linh-vuc.entity.ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

// Lĩnh vực (entitlement) — danh mục động, quản lý qua UI SuperAdmin.
// menuKeys: các menu key (= path route) thuộc lĩnh vực này. Nhiều-nhiều:
// 1 key có thể nằm trong menuKeys của nhiều lĩnh vực.
@Entity('linh_vuc')
export class LinhVuc extends BaseEntity {
  @Column({ unique: true })
  code: string; // bất biến sau khi tạo, vd 'KE_TOAN'

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'AppstoreOutlined' })
  icon: string; // tên icon AntD (whitelist FE)

  @Column({ default: '#1B3A6B' })
  color: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', default: [] })
  menuKeys: string[];
}
```

- [ ] **Step 2: Tạo index domain**

```typescript
// be/libs/entities/src/linh-vuc/index.ts
export * from './linh-vuc.entity';
```

- [ ] **Step 3: Re-export ở entities index**

Trong `be/libs/entities/src/index.ts`, thêm dòng sau khối re-export hiện có (sau `export * from './tenant';`):

```typescript
export * from './linh-vuc';
```

- [ ] **Step 4: Build kiểm tra compile**

Run: `cd be && yarn build` (hoặc `npx tsc -p tsconfig.json --noEmit` nếu nhanh hơn)
Expected: compile thành công, không lỗi type liên quan `LinhVuc`.

- [ ] **Step 5: Commit**

```bash
git add be/libs/entities/src/linh-vuc be/libs/entities/src/index.ts
git commit -m "feat(be): thêm entity LinhVuc (linh_vuc collection)"
```

---

### Task 2: DTO Create/Update `LinhVuc`

**Files:**
- Create: `be/libs/dto/src/linh-vuc/create-linh-vuc.dto.ts`
- Create: `be/libs/dto/src/linh-vuc/update-linh-vuc.dto.ts`
- Create: `be/libs/dto/src/linh-vuc/index.ts`
- Modify: `be/libs/dto/src/index.ts`

**Interfaces:**
- Consumes: không.
- Produces: `CreateLinhVucDto { code, name, description?, icon?, color?, order?, isActive?, menuKeys? }`; `UpdateLinhVucDto { name?, description?, icon?, color?, order?, isActive?, menuKeys? }` (KHÔNG có `code`).

- [ ] **Step 1: Create DTO**

```typescript
// be/libs/dto/src/linh-vuc/create-linh-vuc.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsInt, Matches } from 'class-validator';

export class CreateLinhVucDto {
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

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  menuKeys?: string[];
}
```

- [ ] **Step 2: Update DTO (không có `code`)**

```typescript
// be/libs/dto/src/linh-vuc/update-linh-vuc.dto.ts
import { IsString, IsOptional, IsBoolean, IsArray, IsInt } from 'class-validator';

export class UpdateLinhVucDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  menuKeys?: string[];
}
```

- [ ] **Step 3: Domain index + re-export**

```typescript
// be/libs/dto/src/linh-vuc/index.ts
export * from './create-linh-vuc.dto';
export * from './update-linh-vuc.dto';
```

Trong `be/libs/dto/src/index.ts`: thêm `import './linh-vuc';` vào khối import domain, và `export * from './linh-vuc';` vào khối re-export (đặt cạnh dòng `tenant`).

- [ ] **Step 4: Build kiểm tra**

Run: `cd be && yarn build`
Expected: compile thành công.

- [ ] **Step 5: Commit**

```bash
git add be/libs/dto/src/linh-vuc be/libs/dto/src/index.ts
git commit -m "feat(be): DTO create/update LinhVuc"
```

---

### Task 3: `LinhVucService` (CRUD + guard xóa) — TDD

**Files:**
- Create: `be/apps/master-data-service/src/linh-vuc/linh-vuc.service.ts`
- Test: `be/apps/master-data-service/src/linh-vuc/linh-vuc.service.spec.ts`

**Interfaces:**
- Consumes: `LinhVuc`, `Tenant` (từ `@app/entities`); `CreateLinhVucDto`, `UpdateLinhVucDto` (từ `@app/dto`); raw repository qua `RAW_REPOSITORY_TOKEN_PREFIX` (từ `@app/database`); `sanitizeUpdateDto` (từ `@app/core`).
- Produces: `LinhVucService` với:
  - `findAll(): Promise<LinhVuc[]>` (sắp theo `order ASC`)
  - `create(dto: CreateLinhVucDto): Promise<LinhVuc>` (chặn trùng `code` → `ConflictException`)
  - `update(id: string, dto: UpdateLinhVucDto): Promise<LinhVuc>` (bỏ `code` nếu lọt vào)
  - `delete(id: string): Promise<void>` (chặn nếu `code === 'KE_TOAN'` hoặc còn tenant tham chiếu → `ConflictException`)

- [ ] **Step 1: Viết test (fail trước)**

```typescript
// be/apps/master-data-service/src/linh-vuc/linh-vuc.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { LinhVucService } from './linh-vuc.service';

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
  } as any;
}

describe('LinhVucService', () => {
  let service: LinhVucService;
  let linhVucRepo: any;
  let tenantRepo: any;

  beforeEach(async () => {
    linhVucRepo = mockRepo();
    tenantRepo = mockRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        LinhVucService,
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}LinhVuc`, useValue: linhVucRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`, useValue: tenantRepo },
      ],
    }).compile();
    service = moduleRef.get(LinhVucService);
  });

  it('create chặn trùng code', async () => {
    await service.create({ code: 'KHO', name: 'Kho' } as any);
    await expect(service.create({ code: 'KHO', name: 'Kho 2' } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('delete chặn lĩnh vực mặc định KE_TOAN', async () => {
    const saved = await service.create({ code: 'KE_TOAN', name: 'Kế toán' } as any);
    await expect(service.delete(String(saved._id))).rejects.toBeInstanceOf(ConflictException);
  });

  it('delete chặn khi còn tenant tham chiếu', async () => {
    const saved = await service.create({ code: 'KHO', name: 'Kho' } as any);
    tenantRepo.store.push({ _id: 't1', modules: ['KE_TOAN', 'KHO'] });
    await expect(service.delete(String(saved._id))).rejects.toBeInstanceOf(ConflictException);
  });
});
```

> Lưu ý: `create()` phải gán `_id` cho bản ghi (vd dùng chuỗi tạm trong môi trường test repo mock — xem implementation dưới: dùng `new ObjectId()`).

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `cd be && yarn test linh-vuc.service`
Expected: FAIL ("Cannot find module './linh-vuc.service'").

- [ ] **Step 3: Implement service**

```typescript
// be/apps/master-data-service/src/linh-vuc/linh-vuc.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { LinhVuc, Tenant } from '@app/entities';
import { CreateLinhVucDto, UpdateLinhVucDto } from '@app/dto';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { sanitizeUpdateDto } from '@app/core';

const DEFAULT_LINH_VUC_CODE = 'KE_TOAN';

@Injectable()
export class LinhVucService {
  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}LinhVuc`)
    private readonly linhVucRepository: Repository<LinhVuc>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async findAll(): Promise<LinhVuc[]> {
    return this.linhVucRepository.find({ order: { order: 'ASC' } });
  }

  async findOne(id: string): Promise<LinhVuc> {
    const { ObjectId } = await import('mongodb');
    const found = await this.linhVucRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!found) throw new NotFoundException(`Không tìm thấy lĩnh vực ${id}`);
    return found;
  }

  async create(dto: CreateLinhVucDto): Promise<LinhVuc> {
    const existing = await this.linhVucRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Lĩnh vực với code ${dto.code} đã tồn tại`);

    const { ObjectId } = await import('mongodb');
    const entity = this.linhVucRepository.create({
      _id: new ObjectId() as any,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      icon: dto.icon ?? 'AppstoreOutlined',
      color: dto.color ?? '#1B3A6B',
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
      menuKeys: dto.menuKeys ?? [],
    });
    return this.linhVucRepository.save(entity);
  }

  async update(id: string, dto: UpdateLinhVucDto): Promise<LinhVuc> {
    const linhVuc = await this.findOne(id);
    // code bất biến: sanitizeUpdateDto loại undefined; ta loại thêm 'code' nếu lọt vào.
    const clean = sanitizeUpdateDto(dto as any);
    delete (clean as any).code;
    Object.assign(linhVuc, clean);
    return this.linhVucRepository.save(linhVuc);
  }

  async delete(id: string): Promise<void> {
    const linhVuc = await this.findOne(id);

    if (linhVuc.code === DEFAULT_LINH_VUC_CODE) {
      throw new ConflictException(
        'Không thể xóa lĩnh vực mặc định hệ thống (Kế toán)',
      );
    }

    const tenants = await this.tenantRepository.find();
    const inUse = tenants.filter((t) => (t.modules ?? []).includes(linhVuc.code));
    if (inUse.length > 0) {
      throw new ConflictException(
        `Không thể xóa: còn ${inUse.length} công ty đang dùng lĩnh vực này`,
      );
    }

    await this.linhVucRepository.remove(linhVuc);
  }
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `cd be && yarn test linh-vuc.service`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add be/apps/master-data-service/src/linh-vuc
git commit -m "feat(be): LinhVucService CRUD + guard xóa (test)"
```

---

### Task 4: Controller + Module + đăng ký

**Files:**
- Create: `be/apps/master-data-service/src/linh-vuc/linh-vuc.controller.ts`
- Create: `be/apps/master-data-service/src/linh-vuc/linh-vuc.module.ts`
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`

**Interfaces:**
- Consumes: `LinhVucService` (Task 3); guards `JwtGuard`, `SuperAdminGuard` (từ `@app/auth`); entities `LinhVuc`, `Tenant`.
- Produces: routes dưới prefix `linh-vuc`:
  - `GET /linh-vuc` — JwtGuard (mọi user đăng nhập, để FE render menu)
  - `POST /linh-vuc` — JwtGuard + SuperAdminGuard
  - `PUT /linh-vuc/:id` — JwtGuard + SuperAdminGuard
  - `DELETE /linh-vuc/:id` — JwtGuard + SuperAdminGuard
  - Mọi response dạng `{ success: true, data }` (đồng nhất với TenantController).

- [ ] **Step 1: Controller**

```typescript
// be/apps/master-data-service/src/linh-vuc/linh-vuc.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { LinhVucService } from './linh-vuc.service';
import { CreateLinhVucDto, UpdateLinhVucDto } from '@app/dto';
import { JwtGuard, SuperAdminGuard } from '@app/auth';

@Controller('linh-vuc')
export class LinhVucController {
  constructor(private readonly linhVucService: LinhVucService) {}

  @Get()
  @UseGuards(JwtGuard)
  async findAll() {
    const data = await this.linhVucService.findAll();
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtGuard, SuperAdminGuard)
  async create(@Body() dto: CreateLinhVucDto) {
    const data = await this.linhVucService.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateLinhVucDto) {
    const data = await this.linhVucService.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async delete(@Param('id') id: string) {
    await this.linhVucService.delete(id);
    return { success: true, message: 'Xóa lĩnh vực thành công' };
  }
}
```

- [ ] **Step 2: Module** (dùng `forFeatureRaw` như TenantModule, đăng ký `LinhVuc` + `Tenant`)

```typescript
// be/apps/master-data-service/src/linh-vuc/linh-vuc.module.ts
import { Module } from '@nestjs/common';
import { LinhVuc, Tenant } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { LinhVucService } from './linh-vuc.service';
import { LinhVucController } from './linh-vuc.controller';

@Module({
  imports: [DatabaseModule.forFeatureRaw([LinhVuc, Tenant])],
  controllers: [LinhVucController],
  providers: [LinhVucService],
  exports: [LinhVucService],
})
export class LinhVucModule {}
```

- [ ] **Step 3: Đăng ký vào app module**

Trong `be/apps/master-data-service/src/master-data-service.module.ts`: thêm `import { LinhVucModule } from './linh-vuc/linh-vuc.module';` (cạnh import `TenantModule`) và thêm `LinhVucModule` vào mảng `imports` (cạnh `TenantModule`).

- [ ] **Step 4: Build + smoke test endpoint**

Run: `cd be && yarn build`
Expected: compile OK.

Khởi động service (nếu môi trường cho phép): `cd be && yarn start:master-data:dev`, rồi gọi `GET http://localhost:3002/linh-vuc` kèm JWT hợp lệ → trả `{ success: true, data: [...] }`. Nếu không chạy được local, xác nhận bằng build + review route.

- [ ] **Step 5: Commit**

```bash
git add be/apps/master-data-service/src/linh-vuc/linh-vuc.controller.ts be/apps/master-data-service/src/linh-vuc/linh-vuc.module.ts be/apps/master-data-service/src/master-data-service.module.ts
git commit -m "feat(be): LinhVuc controller + module, đăng ký master-data"
```

---

### Task 5: Seed 2 lĩnh vực mặc định (KE_TOAN, KHO)

**Files:**
- Create: `be/apps/master-data-service/src/linh-vuc/linh-vuc.seed.ts`
- Modify: `be/apps/master-data-service/src/linh-vuc/linh-vuc.module.ts` (gọi seed khi khởi động) **hoặc** thêm phương thức `seedDefaults()` vào service và gọi trong `OnModuleInit`.

**Interfaces:**
- Consumes: `LinhVucService` (thêm `seedDefaults()`), repository `LinhVuc`.
- Produces: khi service khởi động, nếu collection `linh_vuc` rỗng → tạo 2 bản ghi khớp hardcode cũ:
  - `KE_TOAN`: name 'Kế toán', icon 'AccountBookOutlined', color '#1B3A6B', order 0, `menuKeys` = `KE_TOAN_MENU_KEYS` (xem dưới).
  - `KHO`: name 'Kho', icon 'InboxOutlined', color '#C9A227', order 1, `menuKeys` = `KHO_MENU_KEYS` (đúng danh sách hiện tại trong `fe/src/config/modules.ts:73-84`).

> `KE_TOAN_MENU_KEYS` = tất cả menu key (toàn bộ key trong `menuCatalog`, Task 7) trừ `KHO_MENU_KEYS` và `COMMON_MENU_KEYS`. Vì BE không có catalog menu, seed dùng cách đơn giản: gán `KHO_MENU_KEYS` cho KHO, và để KE_TOAN `menuKeys = []` **nhưng** KE_TOAN là lĩnh vực mặc định → menu chưa gán mặc định hiển thị ở KE_TOAN (xử lý ở FE, Task 10). Cách này giữ hành vi giống hệt hiện tại (mọi thứ không thuộc KHO/COMMON → KE_TOAN).

- [ ] **Step 1: Hằng số seed**

```typescript
// be/apps/master-data-service/src/linh-vuc/linh-vuc.seed.ts
// Khớp fe/src/config/modules.ts (KHO_MENU_KEYS hiện tại).
export const KHO_MENU_KEYS: string[] = [
  '/kho',
  '/phan-tich/ton-kho',
  '/chung-tu/phieu-nhap',
  '/chung-tu/phieu-xuat',
  '/danh-muc/kho',
  '/danh-muc/hang-hoa-vat-tu',
  '/danh-muc/don-vi-tinh',
  '/danh-muc/nhom-vat-tu',
  '/trung-tam-du-lieu/hang-hoa',
  '/trung-tam-du-lieu/nguyen-lieu',
];

export const DEFAULT_LINH_VUC_SEED = [
  {
    code: 'KE_TOAN',
    name: 'Kế toán',
    description: 'Báo cáo, chứng từ, sổ sách, công nợ',
    icon: 'AccountBookOutlined',
    color: '#1B3A6B',
    order: 0,
    menuKeys: [] as string[], // mặc định: menu chưa gán → hiển thị ở KE_TOAN (FE)
  },
  {
    code: 'KHO',
    name: 'Kho',
    description: 'Nhập, xuất, chuyển kho và hàng hóa vật tư',
    icon: 'InboxOutlined',
    color: '#C9A227',
    order: 1,
    menuKeys: KHO_MENU_KEYS,
  },
];
```

- [ ] **Step 2: Thêm `seedDefaults()` + `OnModuleInit` vào service**

Trong `linh-vuc.service.ts`: implement `OnModuleInit`, thêm:

```typescript
// thêm import
import { Injectable, NotFoundException, ConflictException, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { DEFAULT_LINH_VUC_SEED } from './linh-vuc.seed';

// trong class, thêm:
private readonly logger = new Logger(LinhVucService.name);

async onModuleInit(): Promise<void> {
  await this.seedDefaults();
}

async seedDefaults(): Promise<void> {
  const count = await this.linhVucRepository.count();
  if (count > 0) return;
  const { ObjectId } = await import('mongodb');
  for (const item of DEFAULT_LINH_VUC_SEED) {
    const entity = this.linhVucRepository.create({ _id: new ObjectId() as any, isActive: true, ...item });
    await this.linhVucRepository.save(entity);
  }
  this.logger.log(`Seeded ${DEFAULT_LINH_VUC_SEED.length} lĩnh vực mặc định`);
}
```

Và đổi khai báo class: `export class LinhVucService implements OnModuleInit {`.

- [ ] **Step 3: Cập nhật test cho `count`**

Trong `mockRepo` (spec Task 3) thêm: `count: jest.fn(async () => store.length),`. Chạy lại để đảm bảo không hồi quy.

Run: `cd be && yarn test linh-vuc.service`
Expected: PASS.

- [ ] **Step 4: Build**

Run: `cd be && yarn build`
Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add be/apps/master-data-service/src/linh-vuc
git commit -m "feat(be): seed lĩnh vực mặc định KE_TOAN/KHO khi rỗng"
```

---

## Phase B — Frontend data layer

### Task 6: FE `linhVucService` + types

**Files:**
- Create: `fe/src/services/linhVucService.ts`

**Interfaces:**
- Consumes: `ServiceBase` (từ `./base/service-base`), endpoint `/master-data/linh-vuc`.
- Produces:
  - `interface LinhVuc { id: string; code: string; name: string; description?: string; icon: string; color: string; order: number; isActive: boolean; menuKeys: string[]; }`
  - `interface CreateLinhVucDto { code; name; description?; icon?; color?; order?; isActive?; menuKeys?; }`
  - `interface UpdateLinhVucDto { name?; description?; icon?; color?; order?; isActive?; menuKeys?; }`
  - `linhVucService.getAll(): Promise<LinhVuc[]>`, `.create(dto)`, `.update(id, dto)`, `.deleteLinhVuc(id)`.

- [ ] **Step 1: Tạo service** (theo mẫu `tenantService.ts`)

```typescript
// fe/src/services/linhVucService.ts
import { ServiceBase } from './base/service-base';

export interface LinhVuc {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  order: number;
  isActive: boolean;
  menuKeys: string[];
}

export interface CreateLinhVucDto {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
  menuKeys?: string[];
}

export interface UpdateLinhVucDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
  menuKeys?: string[];
}

class LinhVucService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/linh-vuc' });
  }

  async getAll(): Promise<LinhVuc[]> {
    const res = await this.get<Array<Record<string, unknown>>>({});
    return res.map(this.transform);
  }

  async create(data: CreateLinhVucDto): Promise<LinhVuc> {
    const res = await this.post<Record<string, unknown>>(data, {});
    return this.transform(res);
  }

  async update(id: string, data: UpdateLinhVucDto): Promise<LinhVuc> {
    const res = await this.put<Record<string, unknown>>(data, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async deleteLinhVuc(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  private transform(x: Record<string, unknown>): LinhVuc {
    return {
      id: (x._id as string) || (x.id as string),
      code: x.code as string,
      name: x.name as string,
      description: x.description as string | undefined,
      icon: (x.icon as string) || 'AppstoreOutlined',
      color: (x.color as string) || '#1B3A6B',
      order: (x.order as number) ?? 0,
      isActive: x.isActive as boolean,
      menuKeys: (x.menuKeys as string[]) ?? [],
    };
  }
}

export const linhVucService = new LinhVucService();
```

> Kiểm tra mẫu `transform` của `tenantService.ts:177` để chắc cấu trúc response (`get` đã unwrap `data` chưa). Nếu `ServiceBase.get` trả thẳng mảng `data`, giữ như trên; nếu trả `{ data }`, điều chỉnh theo `tenantService`.

- [ ] **Step 2: Build + lint**

Run: `cd fe && npm run build`
Expected: build OK, không lỗi type.

- [ ] **Step 3: Commit**

```bash
git add fe/src/services/linhVucService.ts
git commit -m "feat(fe): linhVucService gọi /master-data/linh-vuc"
```

---

### Task 7: `menuCatalog.ts` — danh sách phẳng menu key + nhãn

**Files:**
- Create: `fe/src/config/menuCatalog.ts`

**Interfaces:**
- Produces:
  - `interface MenuCatalogEntry { key: string; label: string; parentLabel?: string; }`
  - `MENU_CATALOG: MenuCatalogEntry[]` — toàn bộ menu lá (key = path) trong sidebar, lấy từ 3 mảng `dieuHanhMenuItems`, `keToAnMenuItems`, `thuVienMenuItems` ở `MainLayout.tsx:198-306`.
  - `flattenMenuKeys(items): MenuCatalogEntry[]` helper (để Task 10 tái dùng nếu cần).

- [ ] **Step 1: Tạo catalog**

Mở `fe/src/components/layout/MainLayout.tsx`, xem 3 mảng menu (`dieuHanhMenuItems` ~198, `keToAnMenuItems` ~212, `thuVienMenuItems` ~259). Trích **mọi mục lá** (mục có `key` là path, kể cả mục con và cháu) thành danh sách phẳng. Ví dụ cấu trúc (điền đầy đủ theo file thực tế):

```typescript
// fe/src/config/menuCatalog.ts
export interface MenuCatalogEntry {
  key: string;       // = path route, vd '/danh-muc/tai-khoan'
  label: string;     // 'Tài khoản'
  parentLabel?: string; // 'Danh mục' (nhóm cha), undefined nếu là mục gốc
}

// Nguồn: MainLayout.tsx (dieuHanhMenuItems, keToAnMenuItems, thuVienMenuItems).
// Cập nhật danh sách này khi thêm menu mới ở MainLayout.
export const MENU_CATALOG: MenuCatalogEntry[] = [
  // ĐIỀU HÀNH
  { key: '/', label: 'Tổng quan' },
  { key: '/phan-tich/bao-cao-tai-chinh', label: 'Báo cáo tài chính', parentLabel: 'Phân tích' },
  // ... (điền đủ toàn bộ key từ 3 mảng) ...
  // KẾ TOÁN
  { key: '/chung-tu/phieu-nhap', label: 'Phiếu nhập', parentLabel: 'Chứng từ' },
  // ... THƯ VIỆN ...
  { key: '/quy-trinh', label: 'Quy trình' },
];
```

> Để khỏi sót, có thể tạm thêm 1 helper `flattenMenuItems(items)` ngay trong file dùng lại các mảng, nhưng các mảng đó định nghĩa trong MainLayout. Cách an toàn nhất: liệt kê thủ công đối chiếu với `PERMISSION_MODULES` ở `tenant.service.ts:25-88` (danh sách path đầy đủ) và 3 mảng menu. Mọi key trong `MENU_CATALOG` phải là **menu lá** (có route thật), không thêm key nhóm cha (vd '/danh-muc' nếu nhóm không điều hướng).

- [ ] **Step 2: Build + lint**

Run: `cd fe && npm run build`
Expected: OK.

- [ ] **Step 3: Đối chiếu thủ công**

Mở MainLayout, đếm số mục lá trong 3 mảng; xác nhận `MENU_CATALOG.length` khớp. Ghi chú nếu lệch.

- [ ] **Step 4: Commit**

```bash
git add fe/src/config/menuCatalog.ts
git commit -m "feat(fe): menuCatalog phẳng cho màn gán lĩnh vực"
```

---

### Task 8: Refactor `modules.ts` — bỏ static, giữ COMMON + helper

**Files:**
- Modify: `fe/src/config/modules.ts`

**Interfaces:**
- Consumes: `LinhVuc` (từ `linhVucService`, Task 6).
- Produces (sau refactor):
  - `type ModuleCode = string` (không còn union cứng).
  - `COMMON_MENU_KEYS: Set<string>` — giữ nguyên.
  - `getStoredModule`, `setStoredModule` — giữ nguyên.
  - `iconByName(name: string): React.ReactNode` — map tên icon → component AntD (whitelist), fallback `AppstoreOutlined`.
  - `getAvailableModuleCodes(tenantModules, isSuperAdmin, allCodes): string[]` — phiên bản mới nhận danh sách code động.
  - `isCommonKey(key: string): boolean` — helper prefix-match COMMON.
  - **Xóa:** `MODULES`, `ModuleDef`(giữ nếu còn dùng? — thay bằng `LinhVuc`), `MODULE_CODES`, `KHO_MENU_KEYS`, `moduleOfMenuKey`, `getModuleDef`, `getAvailableModules` (bản cũ).

- [ ] **Step 1: Viết lại file**

```typescript
// fe/src/config/modules.ts
import React from 'react';
import {
  AccountBookOutlined,
  InboxOutlined,
  AppstoreOutlined,
  ShopOutlined,
  BankOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

export type ModuleCode = string;

// Whitelist icon AntD cho lĩnh vực (DB lưu tên string).
const ICON_MAP: Record<string, React.ComponentType> = {
  AccountBookOutlined,
  InboxOutlined,
  AppstoreOutlined,
  ShopOutlined,
  BankOutlined,
  FileTextOutlined,
};

export const ICON_WHITELIST = Object.keys(ICON_MAP);

export const iconByName = (name: string): React.ReactNode =>
  React.createElement(ICON_MAP[name] ?? AppstoreOutlined);

// Menu luôn hiển thị bất kể lĩnh vực.
export const COMMON_MENU_KEYS = new Set<string>([
  '/',
  '/quy-trinh',
  '/chinh-sach',
  '/bieu-mau',
  '/huong-dan',
]);

export const isCommonKey = (key: string): boolean => {
  for (const k of COMMON_MENU_KEYS) {
    if (key === k || key.startsWith(k + '/')) return true;
  }
  return false;
};

/**
 * Code lĩnh vực khả dụng: SuperAdmin = mọi code active; user thường = giao
 * tenantModules ∩ code active. Fallback ['KE_TOAN'] nếu rỗng.
 */
export function getAvailableModuleCodes(
  tenantModules: string[] | undefined,
  isSuperAdmin: boolean,
  allActiveCodes: string[],
): string[] {
  if (isSuperAdmin) return allActiveCodes;
  const codes = (tenantModules ?? ['KE_TOAN']).filter((c) => allActiveCodes.includes(c));
  if (codes.length) return codes;
  return allActiveCodes.includes('KE_TOAN') ? ['KE_TOAN'] : allActiveCodes.slice(0, 1);
}

const STORAGE_PREFIX = 'selectedModule:';
export const getStoredModule = (tenantId: string): string | null =>
  localStorage.getItem(STORAGE_PREFIX + tenantId);
export const setStoredModule = (tenantId: string, code: string | null): void => {
  if (code) localStorage.setItem(STORAGE_PREFIX + tenantId, code);
  else localStorage.removeItem(STORAGE_PREFIX + tenantId);
};
```

> Thêm vào `ICON_MAP` đủ icon mà 2 lĩnh vực seed dùng (`AccountBookOutlined`, `InboxOutlined`) + vài lựa chọn phổ biến. Đây là whitelist cho dropdown chọn icon (Task 11).

- [ ] **Step 2: Build — xác định mọi nơi import bị vỡ**

Run: `cd fe && npm run build`
Expected: FAIL với danh sách lỗi ở: `AuthContext.tsx`, `MainLayout.tsx`, `TenantPage.tsx`, `ModuleSelector.tsx`, `ModuleSwitchModal.tsx` (import `MODULES`/`getModuleDef`/`moduleOfMenuKey`/`getAvailableModules`). **Đây là kỳ vọng** — các Task 9–13 sẽ sửa từng nơi. Ghi lại danh sách lỗi.

- [ ] **Step 3: Commit (WIP có chủ đích)**

```bash
git add fe/src/config/modules.ts
git commit -m "refactor(fe): modules.ts bỏ static, thêm iconByName + helper động (build sẽ đỏ tới khi sửa consumer)"
```

---

### Task 9: AuthContext load lĩnh vực động từ API

**Files:**
- Modify: `fe/src/contexts/AuthContext.tsx`

**Interfaces:**
- Consumes: `linhVucService.getAll()` (Task 6); `getAvailableModuleCodes`, `getStoredModule`, `setStoredModule` (Task 8); `LinhVuc` type.
- Produces (mở rộng `AuthContextType`):
  - `allModules: LinhVuc[]` — toàn bộ lĩnh vực từ API (gồm inactive, để admin thấy hết; lọc active khi tính available).
  - `availableModules: string[]` — danh sách code (giữ tên field cũ nhưng kiểu `string[]`).
  - `selectedModule: ModuleCode | null` — giữ.
  - `getModule(code): LinhVuc | undefined` — tra cứu doc lĩnh vực theo code.
  - `refreshModules(): Promise<void>` — nạp lại sau khi admin sửa.

- [ ] **Step 1: Thêm state + fetch**

Thay import dòng 6 bằng:

```typescript
import { getAvailableModuleCodes, getStoredModule, setStoredModule, type ModuleCode } from '@/config/modules';
import { linhVucService, type LinhVuc } from '@/services/linhVucService';
```

Thêm state + load (sau dòng 51):

```typescript
const [allModules, setAllModules] = useState<LinhVuc[]>([]);

const refreshModules = useCallback(async () => {
  try {
    const list = await linhVucService.getAll();
    setAllModules(list);
    // cache lần thành công gần nhất để fallback khi lỗi
    localStorage.setItem('linhVucCache', JSON.stringify(list));
  } catch {
    const cached = localStorage.getItem('linhVucCache');
    if (cached) {
      try { setAllModules(JSON.parse(cached)); } catch { /* ignore */ }
    }
  }
}, []);
```

Gọi `refreshModules()` khi đã có token: trong `initAuth` (sau khi `getMe` thành công, sau dòng 92) thêm `await refreshModules();`. Và sau `login`/`selectTenant` thành công cũng gọi `refreshModules()`.

- [ ] **Step 2: Tính availableModules + getModule từ allModules**

Thay block dòng 53–56:

```typescript
const activeCodes = allModules.filter((m) => m.isActive).map((m) => m.code);
const availableModules = currentTenant
  ? getAvailableModuleCodes(currentTenant.modules, user?.isSuperAdmin || false, activeCodes)
  : [];

const getModule = useCallback(
  (code: string) => allModules.find((m) => m.code === code),
  [allModules],
);
```

Thay block effect dòng 60–75 để dùng `getAvailableModuleCodes(... activeCodes)` thay `getAvailableModules`. Thêm `allModules` vào dependency array của effect. Logic auto-chọn/nhớ localStorage giữ nguyên.

- [ ] **Step 3: Cập nhật type + value provider**

Trong `AuthContextType`: đổi `availableModules: ModuleCode[]` → `availableModules: string[]`; thêm `allModules: LinhVuc[]`, `getModule: (code: string) => LinhVuc | undefined`, `refreshModules: () => Promise<void>`. Thêm các field tương ứng vào object `value` (dòng 297–315).

- [ ] **Step 4: Build (AuthContext phải hết lỗi; MainLayout/TenantPage/Selector vẫn còn lỗi)**

Run: `cd fe && npm run build`
Expected: lỗi còn lại chỉ ở `MainLayout.tsx`, `TenantPage.tsx`, `ModuleSelector.tsx`, `ModuleSwitchModal.tsx`. AuthContext sạch.

- [ ] **Step 5: Commit**

```bash
git add fe/src/contexts/AuthContext.tsx
git commit -m "feat(fe): AuthContext nạp lĩnh vực động từ API + cache fallback"
```

---

## Phase C — Frontend UI

### Task 10: MainLayout lọc menu theo mapping động

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `selectedModule`, `getModule`, `availableModules` (Task 9); `isCommonKey` (Task 8).
- Produces: menu sidebar lọc theo `menuKeys` của lĩnh vực đang chọn (+ COMMON), giữ tầng lọc permission.

- [ ] **Step 1: Đổi import** (dòng 72–73)

```typescript
import { ModuleSelector, ModuleSwitchModal } from "@/components/auth";
import { isCommonKey } from "@/config/modules";
```

(Bỏ `getModuleDef, moduleOfMenuKey, type ModuleCode`.)

- [ ] **Step 2: Viết lại `filterByModule`** (dòng 81–95) — nhận tập `menuKeys`

```typescript
// Hiện item nếu key thuộc COMMON hoặc nằm trong menuKeys của lĩnh vực đang chọn.
function keyMatches(key: string, moduleKeys: string[]): boolean {
  if (isCommonKey(key)) return true;
  return moduleKeys.some((k) => key === k || key.startsWith(k + '/'));
}

function filterByModule(items: MenuItem[], moduleKeys: string[]): MenuItem[] {
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const mi = item as { key?: string; children?: MenuItem[] };
      if (mi.children && mi.children.length > 0) {
        const fc = filterByModule(mi.children, moduleKeys);
        if (fc.length === 0) return null;
        return { ...mi, children: fc } as MenuItem;
      }
      return keyMatches(mi.key as string, moduleKeys) ? item : null;
    })
    .filter(Boolean) as MenuItem[];
}
```

- [ ] **Step 3: Lấy menuKeys của lĩnh vực đang chọn**

Trong component, cạnh chỗ destructure `useAuth()` (dòng ~329): lấy thêm `getModule`. Tính:

```typescript
const selectedModuleDef = selectedModule ? getModule(selectedModule) : undefined;
// menu chưa gán mặc định thuộc KE_TOAN → nếu lĩnh vực chọn là KE_TOAN, bổ sung các key không gán cho lĩnh vực nào.
const selectedMenuKeys = selectedModuleDef?.menuKeys ?? [];
```

> Xử lý "menu chưa gán → KE_TOAN" (edge case spec §7): nếu `selectedModule === 'KE_TOAN'`, một menu key không nằm trong `menuKeys` của **bất kỳ** lĩnh vực nào vẫn phải hiện. Thực hiện: gom `assignedKeys = new Set(allModules.flatMap(m => m.menuKeys))`; với KE_TOAN, `keyMatches` trả true nếu key thuộc menuKeys của KE_TOAN **hoặc** key không thuộc `assignedKeys`. Bổ sung biến này vào lời gọi (truyền thêm tham số hoặc tính `effectiveKeys` = `selectedMenuKeys` ∪ (KE_TOAN ? unassigned : ∅)).

Cập nhật `applyFilters` (dòng 380–382):

```typescript
const applyFilters = (items: MenuItem[]): MenuItem[] => {
  const byModule = selectedModule ? filterByModule(items, effectiveKeys) : items;
  return isSuperAdmin ? byModule : filterMenuItems(byModule);
};
```

với `effectiveKeys` tính như mô tả (cần `allModules` từ `useAuth`).

- [ ] **Step 4: Section title động** (dòng 389–392)

```typescript
const moduleSectionTitle = (selectedModuleDef?.name ?? "Kế toán").toUpperCase();
```

- [ ] **Step 5: Build + lint + kiểm tra thủ công**

Run: `cd fe && npm run build && npm run lint`
Expected: MainLayout hết lỗi.

Manual: chạy `npm run dev`, đăng nhập tenant có cả KE_TOAN+KHO → đổi lĩnh vực, xác nhận menu Kho chỉ hiện ở lĩnh vực Kho, các menu kế toán hiện ở Kế toán, COMMON luôn hiện. So sánh với hành vi cũ → phải giống.

- [ ] **Step 6: Commit**

```bash
git add fe/src/components/layout/MainLayout.tsx
git commit -m "feat(fe): MainLayout lọc menu theo mapping lĩnh vực động"
```

---

### Task 11: Trang admin `cau-hinh/linh-vuc`

**Files:**
- Create: `fe/src/pages/cau-hinh/linh-vuc/LinhVucPage.tsx`
- Modify: `fe/src/App.tsx` (thêm route `/cau-hinh/linh-vuc`)
- Modify: file menu trong `MainLayout.tsx` (thêm mục menu vào nhóm Cấu hình) **và** `fe/src/config/menuCatalog.ts` (thêm entry mới).
- (Nếu có) Modify: `fe/src/config/routePermissions.ts` (thêm permission cho route).

**Interfaces:**
- Consumes: `linhVucService` (Task 6); `MENU_CATALOG` (Task 7); `ICON_WHITELIST`, `iconByName` (Task 8); `useAuth().refreshModules`.
- Produces: trang CRUD lĩnh vực cho SuperAdmin.

- [ ] **Step 1: Trang danh sách + form** (mẫu UI theo `TenantPage.tsx`)

Tạo `LinhVucPage.tsx` gồm:
- Bảng: cột Tên (kèm icon `iconByName(record.icon)` + màu), Code, Số menu (`menuKeys.length`), Trạng thái (`isActive`), Hành động (Sửa/Xóa).
- Nút "Thêm lĩnh vực" mở Modal form (AntD `Form`):
  - `code` (Input, **disable khi sửa**), `name`, `description`, `icon` (Select từ `ICON_WHITELIST`, option render `iconByName(name)`), `color` (Input/ColorPicker), `order` (InputNumber), `isActive` (Switch).
  - `menuKeys`: AntD `Tree` checkable build từ `MENU_CATALOG` (nhóm theo `parentLabel`), giá trị = mảng key đã tick. Hiển thị cảnh báo cho key **chưa gán lĩnh vực nào** (so với gom `menuKeys` toàn bộ lĩnh vực) — tô nhãn "chưa gán".
- Submit: `create`/`update` → gọi `refreshModules()` → đóng modal + reload bảng.
- Xóa: `Popconfirm` → `deleteLinhVuc(id)`; bắt lỗi `ConflictException` từ BE (message hiển thị qua `message.error`).

> Code đầy đủ: dựng theo cấu trúc `TenantPage.tsx` (Form.Item + Modal + Table). Khóa trọng yếu cần đúng: field `menuKeys` dùng `Tree` checkable, value là `string[]`.

- [ ] **Step 2: Route + menu + permission**

- `App.tsx`: thêm trong nhánh `cau-hinh`:
  ```tsx
  <Route path="linh-vuc" element={<ProtectedRoute requiredPermission="/cau-hinh/linh-vuc:xem"><LinhVucPage /></ProtectedRoute>} />
  ```
- `MainLayout.tsx`: thêm mục `getMenuItem('Lĩnh vực', '/cau-hinh/linh-vuc', <AppstoreOutlined />)` vào nhóm Cấu hình (chỉ SuperAdmin thấy — nhóm cấu hình hiện đã gắn permission).
- `menuCatalog.ts`: thêm `{ key: '/cau-hinh/linh-vuc', label: 'Lĩnh vực', parentLabel: 'Cấu hình' }`.
- Nếu permission được seed từ `PERMISSION_MODULES` (`tenant.service.ts:25`), thêm `'/cau-hinh/linh-vuc'` vào danh sách đó để Admin role có quyền (tùy chọn — SuperAdmin luôn truy cập được).

- [ ] **Step 3: Build + lint + manual**

Run: `cd fe && npm run build && npm run lint`
Manual: đăng nhập SuperAdmin → `/cau-hinh/linh-vuc`: tạo lĩnh vực mới, tick vài menu, lưu; sửa lĩnh vực KHO đổi menuKeys; thử xóa KE_TOAN (phải bị chặn), xóa lĩnh vực đang dùng (bị chặn). Sau khi sửa, sidebar cập nhật sau `refreshModules`/reload.

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/cau-hinh/linh-vuc fe/src/App.tsx fe/src/components/layout/MainLayout.tsx fe/src/config/menuCatalog.ts
git commit -m "feat(fe): trang admin quản lý lĩnh vực + gán menu"
```

---

### Task 12: TenantPage lấy options lĩnh vực từ API

**Files:**
- Modify: `fe/src/pages/cau-hinh/tenant/TenantPage.tsx`

**Interfaces:**
- Consumes: `useAuth().allModules` (hoặc `linhVucService.getAll()` cục bộ) thay cho `MODULES`; `getModule`/`allModules` để render tên ở cột "Lĩnh vực".

- [ ] **Step 1: Thay nguồn options**

- Bỏ `import { MODULES, getModuleDef } from '@/config/modules'`.
- Lấy danh sách lĩnh vực active: `const { allModules } = useAuth();` rồi `const moduleOptions = allModules.filter(m => m.isActive).map(m => ({ value: m.code, label: m.name }));`
- Form.Item `modules` (dòng ~379–390): `options={moduleOptions}`.
- Cột "Lĩnh vực" (dòng ~224–239): tra tên bằng `allModules.find(m => m.code === code)?.name ?? code`.

- [ ] **Step 2: Build + lint + manual**

Run: `cd fe && npm run build && npm run lint`
Manual: mở trang Công ty (SuperAdmin), form "Lĩnh vực sử dụng" hiển thị đúng danh sách động; cột Lĩnh vực hiển thị tên đúng.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/cau-hinh/tenant/TenantPage.tsx
git commit -m "feat(fe): TenantPage lấy options lĩnh vực từ API động"
```

---

### Task 13: ModuleSelector & ModuleSwitchModal dùng dữ liệu động

**Files:**
- Modify: `fe/src/components/auth/ModuleSelector.tsx`
- Modify: `fe/src/components/auth/ModuleSwitchModal.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `availableModules` (string[]), `allModules`/`getModule`, `selectedModule`, `setSelectedModule`; `iconByName` (Task 8).
- Produces: hiển thị tên/icon/màu/mô tả lĩnh vực từ `LinhVuc` API thay vì `getModuleDef`/`MODULES`.

- [ ] **Step 1: ModuleSelector**

Thay mọi `getModuleDef(code)` → `getModule(code)` (từ `useAuth`); icon dùng `iconByName(def.icon)`; màu `def.color`; mô tả `def.description`. Danh sách render từ `availableModules.map(code => getModule(code))` (lọc bỏ undefined). Disable/ẩn lĩnh vực không khả dụng giữ logic cũ.

- [ ] **Step 2: ModuleSwitchModal**

Tương tự: render từ `allModules.filter(m => m.isActive)`; lĩnh vực thuộc `availableModules` → click được; ngoài `availableModules` → disable + tooltip "Chưa kích hoạt". Icon/màu từ `iconByName`/`def.color`.

- [ ] **Step 3: Build + lint + manual (toàn FE phải xanh)**

Run: `cd fe && npm run build && npm run lint`
Expected: **build sạch toàn bộ** (không còn lỗi import từ Task 8).

Manual: tenant nhiều lĩnh vực → màn ModuleSelector hiện đúng; modal đổi lĩnh vực ở header hoạt động; lĩnh vực chưa cấp bị disable.

- [ ] **Step 4: Commit**

```bash
git add fe/src/components/auth/ModuleSelector.tsx fe/src/components/auth/ModuleSwitchModal.tsx
git commit -m "feat(fe): ModuleSelector/Modal dùng lĩnh vực động + iconByName"
```

---

## Phase D — Tích hợp & nghiệm thu

### Task 14: Nghiệm thu end-to-end + dọn dẹp

**Files:** không tạo mới; có thể sửa nhỏ nếu phát hiện hồi quy.

- [ ] **Step 1: BE test toàn bộ**

Run: `cd be && yarn test`
Expected: PASS (gồm `linh-vuc.service.spec.ts`).

- [ ] **Step 2: FE build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: không lỗi.

- [ ] **Step 3: Kịch bản nghiệm thu thủ công** (chạy BE + FE local)

1. DB rỗng `linh_vuc` → khởi động master-data → tự seed KE_TOAN, KHO.
2. Đăng nhập user tenant chỉ KE_TOAN → menu giống hệt trước (không có menu Kho), không hiện màn chọn lĩnh vực.
3. Tenant có KE_TOAN+KHO → hiện ModuleSelector; chọn Kho → chỉ menu Kho+COMMON; đổi sang Kế toán → menu kế toán.
4. SuperAdmin tạo lĩnh vực mới "BAN_HANG", gán vài menu; cấp cho 1 tenant qua TenantPage → user tenant đó thấy lĩnh vực mới với đúng menu (sau reload).
5. Xóa KE_TOAN → bị chặn; xóa lĩnh vực đang được tenant dùng → bị chặn.
6. Tắt mạng/giả lập lỗi `GET /linh-vuc` sau khi đã load 1 lần → FE vẫn render từ cache.

- [ ] **Step 4: Cập nhật context docs** (nếu dự án yêu cầu)

Cân nhắc chạy skill `db-update-knowledge` để ghi nhận: collection `linh_vuc`, endpoint `/master-data/linh-vuc`, mapping menu động. Cập nhật `.claude/context/be-api-map.md` và `active-pages.md` nếu cần.

- [ ] **Step 5: Commit cuối + hoàn tất nhánh**

```bash
git add -A
git commit -m "chore: nghiệm thu lĩnh vực động + cập nhật context docs"
```

Sau đó dùng skill `superpowers:finishing-a-development-branch` để chọn merge/PR.

---

## Self-review notes (đã kiểm tra với spec)

- Spec §4 (Hướng A 1 collection + menuKeys nhúng) → Task 1.
- Spec §5 (entity, DTO, CRUD, guard xóa, phân quyền GET/ghi, seed) → Task 1–5.
- Spec §6.1 menuCatalog → Task 7; §6.2 modules.ts→API → Task 8; §6.3 filterByModule → Task 10; §6.4 AuthContext → Task 9; §6.5 admin page → Task 11; §6.6 TenantPage → Task 12; §6.7 icon whitelist → Task 8 (`iconByName`) + dùng ở Task 11/13.
- Spec §7 edge cases: menu chưa gán→KE_TOAN (Task 10 Step 3); xóa lĩnh vực đang dùng + xóa KE_TOAN (Task 3); isActive=false loại khỏi available (Task 9); code không tồn tại bị bỏ qua (Task 8 `getAvailableModuleCodes` lọc theo activeCodes); code immutable (Task 2 DTO + Task 3 update xóa code); API lỗi→cache (Task 9 Step 1, Task 14 Step 3 case 6).
- Type nhất quán: `availableModules: string[]`, `selectedModule: ModuleCode|null` (ModuleCode=string), service `LinhVuc` field khớp entity. `filterByModule(items, moduleKeys: string[])` đồng nhất giữa định nghĩa (Task 10 Step 2) và lời gọi (Step 3).
- Không enforce BE (ngoài phạm vi) — không có task nào thêm guard theo modules; đúng chủ ý.
