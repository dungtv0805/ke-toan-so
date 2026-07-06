# Module Bếp ăn (Mầm non) — GĐ A Phần 1: Nền tảng BE + 2 danh mục cấu hình — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng microservice `mam-non-service` bootable + route qua gateway, thêm trường `cachXuat` cho hàng hóa vật tư, và 2 danh mục cấu hình đầu tiên (Định mức tiền ăn, Công thức định lượng) với CRUD đầy đủ.

**Architecture:** Nhân bản `kho-service` thành `mam-non-service` (NestJS app trong monorepo, port 3010). Các entity mới đặt trong `libs/entities/src/mam-non/`. CRUD danh mục theo đúng khuôn mẫu `master-data-service/don-vi-tinh` (tenant tự động qua proxy repository + `TenantContextService`). Gateway route `/mam-non/*` qua config `environment.ts`.

**Tech Stack:** NestJS 11, TypeORM (MongoDB), class-validator, env-cmd, Jest + fast-check (property test cho logic thuần).

## Global Constraints

- **Port `mam-non-service` = 3010.** KHÔNG dùng 3009 (đã bị `tax-service` chiếm).
- DB mặc định: `digital_book` (connection default, KHÔNG phải connection `identity`).
- Mọi entity mới kế thừa `BaseEntity` (`libs/entities/src/base.entity.ts`) — đã có sẵn `_id`, `tenantId`, `createdAt`, `updatedAt`, getter `id`.
- Path alias: `@app/entities`, `@app/database`, `@app/auth`, `@app/core`, `@app/dto`.
- Danh mục KHÔNG tự xử lý tenant/guard — kế thừa hạ tầng: `@UseGuards(JwtGuard, RoleGuard)` + `DatabaseModule.forFeature([...])` (proxy tự chèn `tenantId`) + inject `TenantContextService`.
- Route tĩnh (`all`, `search`, `total`, `check-ma`, `stats`) phải khai báo TRƯỚC `@Get(':id')`.
- `RoleGuard` hiện là no-op; `@Roles(...)` chỉ là metadata (giữ cho nhất quán, không enforce).
- Không có server MongoDB trong môi trường agent → verify = **build pass + boot pass + (nếu có Mongo) curl**. Nếu không boot được do thiếu Mongo, coi **build pass** là tiêu chí tối thiểu và ghi rõ.

---

## Roadmap GĐ A (bối cảnh — chỉ Phần 1 chi tiết trong file này)

- **Phần 1 (file này):** Nền BE `mam-non-service` + `cachXuat` + 2 danh mục cấu hình (Định mức tiền ăn, Công thức định lượng).
- **Phần 2:** Nghiệp vụ — Điểm danh ăn (CRUD), Đề xuất mua thực phẩm (CRUD + sequence số phiếu + trạng thái duyệt), nhận hàng → gọi kho-service (nhập) + payable-service (công nợ) qua ServiceClient.
- **Phần 3:** Engine tính chi phí (hàm thuần, TDD fast-check: ngân sách/tiêu hao/hao phí) + endpoint bảng kiểm soát + xuất kho theo tiêu hao.
- **Phần 4:** FE — record `linh_vuc` MAM_NON + 5 trang (theo pattern single-file `DonViTinhPage`) + wiring 10 điểm.

Spec: `docs/superpowers/specs/2026-07-06-mam-non-bep-an-design.md`.

---

## Templates (dùng lại nguyên văn ở các task — thay tham số in đậm)

### T-DTO-Create (`create-<route>.dto.ts`)
Thay **Class**, **các field**. Ví dụ khung:
```ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class Create<Class>Dto {
  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  ten: string;

  // ...field nghiệp vụ (xem từng task)...
}
```

### T-DTO-Update (`update-<route>.dto.ts`)
```ts
import { PartialType } from '@nestjs/mapped-types';
import { Create<Class>Dto } from './create-<route>.dto';

export class Update<Class>Dto extends PartialType(Create<Class>Dto) {}
```

### T-DTO-Index (`dto/index.ts`)
```ts
export * from './create-<route>.dto';
export * from './update-<route>.dto';
```

### T-Service (`<route>.service.ts`)
Sao chép nguyên từ `apps/master-data-service/src/don-vi-tinh/don-vi-tinh.service.ts`, thay `DonViTinh`→**Class**, `donViTinhRepository`→**camelRepo**, thông báo lỗi mã tương ứng. Giữ nguyên cấu trúc: `getTenantFilter()`, `findAllPaginated`, `findAll`, `findOne`, `findByMa`→**findByCode**, `create`, `update`, `delete` (soft), `search`, `checkMaExists`→**checkCodeExists**, `getStats`. Danh mục Mầm non dùng khóa `code` (không phải `ma`):

```ts
import { sanitizeUpdateDto, TenantContextService } from '@app/core';
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { <Class> } from '@app/entities';
import { Create<Class>Dto, Update<Class>Dto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class <Class>Service {
  constructor(
    @InjectRepository(<Class>)
    private readonly repo: Repository<<Class>>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<<Class>>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const allItems = await this.repo.find({ where: this.getTenantFilter() as any });
    let items = allItems.filter((i) => i.isActive !== false);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((i) => i.code.toLowerCase().includes(s) || i.ten.toLowerCase().includes(s));
    }
    const total = items.length;
    return { data: items.slice(skip, skip + limit), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findAll(): Promise<<Class>[]> {
    return this.repo.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<<Class>> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!item) throw new NotFoundException(`Không tìm thấy <Class> với ID ${id}`);
    return item;
  }

  async findByCode(code: string): Promise<<Class> | null> {
    return this.repo.findOne({ where: { code, isActive: true, ...this.getTenantFilter() } });
  }

  async create(dto: Create<Class>Dto): Promise<<Class>> {
    if (await this.findByCode(dto.code)) throw new ConflictException(`Mã ${dto.code} đã tồn tại`);
    const item = this.repo.create({ ...dto, isActive: true } as any);
    return this.repo.save(item) as any;
  }

  async update(id: string, dto: Update<Class>Dto): Promise<<Class>> {
    const item = await this.findOne(id);
    if (dto.code && dto.code !== item.code && (await this.findByCode(dto.code)))
      throw new ConflictException(`Mã ${dto.code} đã tồn tại`);
    Object.assign(item, sanitizeUpdateDto(dto));
    return this.repo.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByCode(code);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  async getStats(): Promise<{ tong: number }> {
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    return { tong: all.filter((i) => i.isActive !== false).length };
  }
}
```

### T-Controller (`<route>.controller.ts`)
```ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { <Class>Service } from './<route>.service';
import { Create<Class>Dto, Update<Class>Dto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { PaginationQueryDto } from '@app/dto';

const READ = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'];
const WRITE = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP'];

@Controller('<route>')
@UseGuards(JwtGuard, RoleGuard)
export class <Class>Controller {
  constructor(private readonly service: <Class>Service) {}

  @Get() @Roles(...READ)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all') @Roles(...READ)
  async getAll() { return { success: true, data: await this.service.findAll() }; }

  @Get('stats') @Roles(...READ)
  async getStats() { return { success: true, data: await this.service.getStats() }; }

  @Get('check-code') @Roles(...READ)
  async checkCode(@Query('code') code: string, @Query('excludeId') excludeId?: string) {
    return { success: true, data: { exists: await this.service.checkCodeExists(code, excludeId) } };
  }

  @Get(':id') @Roles(...READ)
  async findOne(@Param('id') id: string) { return { success: true, data: await this.service.findOne(id) }; }

  @Post() @Roles(...WRITE)
  async create(@Body() dto: Create<Class>Dto) { return { success: true, data: await this.service.create(dto) }; }

  @Put(':id') @Roles(...WRITE)
  async update(@Param('id') id: string, @Body() dto: Update<Class>Dto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Delete(':id') @Roles('ADMIN')
  async delete(@Param('id') id: string) { await this.service.delete(id); return { success: true, message: 'Xóa thành công' }; }
}
```

### T-Module (`<route>.module.ts`)
```ts
import { Module } from '@nestjs/common';
import { <Class> } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { <Class>Service } from './<route>.service';
import { <Class>Controller } from './<route>.controller';

@Module({
  imports: [DatabaseModule.forFeature([<Class>])],
  controllers: [<Class>Controller],
  providers: [<Class>Service],
  exports: [<Class>Service],
})
export class <Class>Module {}
```

---

## Task 1: Scaffold `mam-non-service` (bootable, chưa có nghiệp vụ)

**Files:**
- Create: `be/apps/mam-non-service/tsconfig.app.json`
- Create: `be/apps/mam-non-service/src/main.ts`
- Create: `be/apps/mam-non-service/src/mam-non-service.module.ts`
- Modify: `be/nest-cli.json` (thêm project)
- Modify: `be/package.json` (scripts)
- Modify: `be/.env-cmdrc` (block `mam-non` + `services.SERVICE_MAM_NON_*`)
- Modify: `be/apps/gateway/src/environments/environment.ts` (services.mamNon + route)

**Interfaces:**
- Produces: class `MamNonServiceModule`; service listen `process.env.MAM_NON_SERVICE_PORT || 3010`; gateway route `/mam-non` (stripPrefix) → service `mamNon`.

- [ ] **Step 1: Tạo `tsconfig.app.json`**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/mam-non-service"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 2: Tạo `src/main.ts`**
```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MamNonServiceModule } from './mam-non-service.module';
import { createAppLogger, LoggingInterceptor, GlobalExceptionFilter } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(MamNonServiceModule, { logger: createAppLogger('mam-non') });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors();
  const port = process.env.MAM_NON_SERVICE_PORT || 3010;
  await app.listen(port);
  console.log(`Mam Non Service is running on port ${port}`);
}
bootstrap();
```

- [ ] **Step 3: Tạo `src/mam-non-service.module.ts`** (chưa có module con)
```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
  ],
})
export class MamNonServiceModule {}
```

- [ ] **Step 4: Đăng ký project trong `be/nest-cli.json`** — thêm vào object `"projects"` (sau `kho-service`), nhớ dấu phẩy hợp lệ:
```json
    "mam-non-service": {
      "type": "application",
      "root": "apps/mam-non-service",
      "entryFile": "main",
      "sourceRoot": "apps/mam-non-service/src",
      "compilerOptions": {
        "tsConfigPath": "apps/mam-non-service/tsconfig.app.json"
      }
    }
```

- [ ] **Step 5: Thêm scripts vào `be/package.json`** — cạnh `start:kho`:
```json
    "start:mam-non": "env-cmd -e mam-non,db,jwt,services -- nest start mam-non-service",
    "start:mam-non:dev": "env-cmd -e mam-non,db,jwt,services -- nest start mam-non-service --watch",
```
Và chèn `\"yarn start:mam-non:dev\"` vào cuối chuỗi `start:all` và `start:all:dev` (trước dấu `"` đóng).

- [ ] **Step 6: Sửa `be/.env-cmdrc`** — trong block `services` thêm 2 dòng (sau `SERVICE_TAX_PORT`):
```json
    "SERVICE_MAM_NON_HOST": "localhost",
    "SERVICE_MAM_NON_PORT": "3010",
```
Và thêm block mới (cạnh `tax`):
```json
  "mam-non": {
    "MAM_NON_SERVICE_PORT": 3010,
    "NODE_ENV": "development"
  }
```

- [ ] **Step 7: Sửa gateway `be/apps/gateway/src/environments/environment.ts`** — trong `services:` thêm (sau `tax`):
```ts
    mamNon: {
      host: process.env.SERVICE_MAM_NON_HOST || 'localhost',
      port: parseInt(process.env.SERVICE_MAM_NON_PORT || '3010', 10),
    },
```
Trong mảng `routes:` thêm (cạnh dòng `/kho`):
```ts
    { pathPrefix: '/mam-non', service: 'mamNon', stripPrefix: true },
```

- [ ] **Step 8: Build kiểm tra**
Run: `cd be && npx nest build mam-non-service`
Expected: build thành công, tạo `dist/apps/mam-non-service/main.js`.

- [ ] **Step 9: Boot thử (nếu có Mongo)**
Run: `cd be && yarn start:mam-non 2>&1 | head -20`
Expected: `Mam Non Service is running on port 3010`. Nếu lỗi kết nối Mongo (môi trường agent không có DB) → chấp nhận, miễn build ở Step 8 pass và log cho thấy tới bước connect. Ctrl-C dừng.

- [ ] **Step 10: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git add be/apps/mam-non-service be/nest-cli.json be/package.json be/.env-cmdrc be/apps/gateway/src/environments/environment.ts
git commit -m "feat(mam-non): scaffold mam-non-service (port 3010) + gateway route /mam-non"
```

---

## Task 2: Trường `cachXuat` cho Hàng hóa vật tư

**Files:**
- Modify: `be/libs/entities/src/master-data/hang-hoa-vat-tu.entity.ts`
- Modify: `be/apps/master-data-service/src/hang-hoa-vat-tu/dto/create-hang-hoa-vat-tu.dto.ts` (nếu path khác, tìm trong thư mục `hang-hoa-vat-tu`)
- Modify (FE, tùy chọn trong task này): bỏ qua — FE làm ở Phần 4.
- Test: `be/apps/master-data-service/src/hang-hoa-vat-tu/cach-xuat.util.spec.ts`

**Interfaces:**
- Produces: type `CachXuat = 'DINH_LUONG' | 'THEO_SUAT' | 'DON_VI'`; field `cachXuat` trên entity `HangHoaVatTu` (default `'DON_VI'`).

- [ ] **Step 1: Viết test thất bại** — hàm phân loại thuần (logic dùng lại ở engine Phần 3)
Create `be/apps/master-data-service/src/hang-hoa-vat-tu/cach-xuat.util.spec.ts`:
```ts
import * as fc from 'fast-check';
import { CACH_XUAT_VALUES, isTieuHaoTheoCongThuc } from './cach-xuat.util';

describe('cachXuat classification', () => {
  it('chỉ DINH_LUONG và THEO_SUAT là tiêu hao theo công thức', () => {
    expect(isTieuHaoTheoCongThuc('DINH_LUONG')).toBe(true);
    expect(isTieuHaoTheoCongThuc('THEO_SUAT')).toBe(true);
    expect(isTieuHaoTheoCongThuc('DON_VI')).toBe(false);
  });

  it('mọi giá trị hợp lệ phân loại xác định (không throw)', () => {
    fc.assert(fc.property(fc.constantFrom(...CACH_XUAT_VALUES), (v) => {
      const r = isTieuHaoTheoCongThuc(v);
      return typeof r === 'boolean';
    }), { numRuns: 50 });
  });
});
```

- [ ] **Step 2: Chạy test — phải fail**
Run: `cd be && npx jest cach-xuat.util.spec --silent`
Expected: FAIL — không tìm thấy module `./cach-xuat.util`.

- [ ] **Step 3: Viết util tối thiểu**
Create `be/apps/master-data-service/src/hang-hoa-vat-tu/cach-xuat.util.ts`:
```ts
export const CACH_XUAT_VALUES = ['DINH_LUONG', 'THEO_SUAT', 'DON_VI'] as const;
export type CachXuat = (typeof CACH_XUAT_VALUES)[number];

/** DINH_LUONG (khối lượng/suất) và THEO_SUAT (đơn vị/trẻ) đều xuất theo công thức; DON_VI thì không. */
export function isTieuHaoTheoCongThuc(v: CachXuat): boolean {
  return v === 'DINH_LUONG' || v === 'THEO_SUAT';
}
```

- [ ] **Step 4: Chạy test — phải pass**
Run: `cd be && npx jest cach-xuat.util.spec --silent`
Expected: PASS.

- [ ] **Step 5: Thêm field vào entity** — `be/libs/entities/src/master-data/hang-hoa-vat-tu.entity.ts`, thêm trong class (theo pattern `@Column`):
```ts
  @Column({ default: 'DON_VI' })
  cachXuat: 'DINH_LUONG' | 'THEO_SUAT' | 'DON_VI';
```

- [ ] **Step 6: Thêm field vào Create DTO** — tìm create DTO của hàng hóa vật tư, thêm:
```ts
  @IsString()
  @IsOptional()
  @IsIn(['DINH_LUONG', 'THEO_SUAT', 'DON_VI'])
  cachXuat?: 'DINH_LUONG' | 'THEO_SUAT' | 'DON_VI';
```
(nhớ import `IsIn` từ `class-validator`). Update DTO kế thừa `PartialType` nên tự có.

- [ ] **Step 7: Build master-data**
Run: `cd be && npx nest build master-data-service`
Expected: build pass.

- [ ] **Step 8: Commit**
```bash
git add be/libs/entities/src/master-data/hang-hoa-vat-tu.entity.ts be/apps/master-data-service/src/hang-hoa-vat-tu
git commit -m "feat(mam-non): thêm cachXuat (DINH_LUONG|THEO_SUAT|DON_VI) cho hàng hóa vật tư"
```

---

## Task 3: Danh mục Định mức tiền ăn (`dinh_muc_tien_an`)

**Files:**
- Create: `be/libs/entities/src/mam-non/dinh-muc-tien-an.entity.ts`
- Create: `be/libs/entities/src/mam-non/index.ts`
- Modify: `be/libs/entities/src/entities.ts` hoặc `index.ts` (đăng ký export — xem Step 2)
- Create: `be/apps/mam-non-service/src/dinh-muc-tien-an/{dinh-muc-tien-an.controller,dinh-muc-tien-an.service,dinh-muc-tien-an.module}.ts` + `dto/{create,update,index}`
- Modify: `be/apps/mam-non-service/src/mam-non-service.module.ts`

**Interfaces:**
- Produces: entity `DinhMucTienAn` (fields: `code, ten, phamVi, doiTuongMa?, mucTien, hieuLucTu, hieuLucDen?, isActive`); route `/mam-non/dinh-muc-tien-an`; class `DinhMucTienAnService`, `DinhMucTienAnModule`.

- [ ] **Step 1: Tạo entity** `be/libs/entities/src/mam-non/dinh-muc-tien-an.entity.ts`
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type PhamViDinhMuc = 'LOP' | 'DO_TUOI' | 'GOI_AN' | 'CHUNG';

@Entity('dinh_muc_tien_an')
export class DinhMucTienAn extends BaseEntity {
  @Column() code: string;
  @Column() ten: string;
  @Column({ default: 'CHUNG' }) phamVi: PhamViDinhMuc;
  @Column({ nullable: true }) doiTuongMa: string;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) mucTien: number;
  @Column({ nullable: true }) hieuLucTu: Date;
  @Column({ nullable: true }) hieuLucDen: Date;
  @Column({ default: true }) isActive: boolean;
}

export interface DinhMucTienAnEntities { DinhMucTienAn: typeof DinhMucTienAn; }
declare module '../entities' { interface Entities extends DinhMucTienAnEntities {} }
```

- [ ] **Step 2: Tạo `be/libs/entities/src/mam-non/index.ts`** và đăng ký ở barrel entities
```ts
export * from './dinh-muc-tien-an.entity';
```
Rồi trong `be/libs/entities/src/index.ts` (hoặc file barrel chính — kiểm tra cách master-data được export, thường có dòng `export * from './master-data';`), thêm:
```ts
export * from './mam-non';
```
> Kiểm tra: `libs/entities/src/index.ts` phải re-export `./mam-non` để `@app/entities` thấy `DinhMucTienAn`. Nếu barrel dùng import-side-effect (`import './master-data/xxx.entity'`) thì làm tương tự cho mam-non.

- [ ] **Step 3: Tạo DTO** trong `be/apps/mam-non-service/src/dinh-muc-tien-an/dto/`
`create-dinh-muc-tien-an.dto.ts`:
```ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';

export class CreateDinhMucTienAnDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() ten: string;
  @IsString() @IsOptional() @IsIn(['LOP', 'DO_TUOI', 'GOI_AN', 'CHUNG']) phamVi?: string;
  @IsString() @IsOptional() doiTuongMa?: string;
  @IsNumber() mucTien: number;
  @IsDateString() @IsOptional() hieuLucTu?: string;
  @IsDateString() @IsOptional() hieuLucDen?: string;
}
```
`update-dinh-muc-tien-an.dto.ts` (T-DTO-Update) + `index.ts` (T-DTO-Index) với Class=`DinhMucTienAn`, route=`dinh-muc-tien-an`.

- [ ] **Step 4: Tạo service** `dinh-muc-tien-an.service.ts` — instantiate **T-Service** với Class=`DinhMucTienAn`, route=`dinh-muc-tien-an`, import entity từ `@app/entities`.

- [ ] **Step 5: Tạo controller** `dinh-muc-tien-an.controller.ts` — instantiate **T-Controller** với Class=`DinhMucTienAn`, `@Controller('dinh-muc-tien-an')`.

- [ ] **Step 6: Tạo module** `dinh-muc-tien-an.module.ts` — instantiate **T-Module** với Class=`DinhMucTienAn`, route=`dinh-muc-tien-an`.

- [ ] **Step 7: Đăng ký module** trong `be/apps/mam-non-service/src/mam-non-service.module.ts` — thêm import + vào `imports[]`:
```ts
import { DinhMucTienAnModule } from './dinh-muc-tien-an/dinh-muc-tien-an.module';
// ...trong imports: [ ... , DinhMucTienAnModule ]
```

- [ ] **Step 8: Build**
Run: `cd be && npx nest build mam-non-service`
Expected: build pass (không lỗi type, `DinhMucTienAn` resolve được từ `@app/entities`).

- [ ] **Step 9: Verify route (nếu có Mongo + boot)**
Run: `cd be && yarn start:mam-non &` rồi `curl -s localhost:3010/dinh-muc-tien-an/all -H "Authorization: Bearer <token-test>"`
Expected: JSON `{ "success": true, "data": [] }` (hoặc 401 nếu không token — vẫn chứng tỏ route sống). Dừng service sau khi xong. Nếu không có Mongo → bỏ qua, dựa vào build.

- [ ] **Step 10: Commit**
```bash
git add be/libs/entities/src/mam-non be/libs/entities/src/index.ts be/apps/mam-non-service/src/dinh-muc-tien-an be/apps/mam-non-service/src/mam-non-service.module.ts
git commit -m "feat(mam-non): danh mục Định mức tiền ăn (dinh_muc_tien_an) + CRUD"
```

---

## Task 4: Danh mục Công thức định lượng (`cong_thuc_dinh_luong`)

**Files:**
- Create: `be/libs/entities/src/mam-non/cong-thuc-dinh-luong.entity.ts`
- Modify: `be/libs/entities/src/mam-non/index.ts`
- Create: `be/apps/mam-non-service/src/cong-thuc-dinh-luong/{controller,service,module}.ts` + `dto/`
- Modify: `be/apps/mam-non-service/src/mam-non-service.module.ts`

**Interfaces:**
- Consumes: type `CachXuat` (Task 2) cho từng dòng chi tiết.
- Produces: entity `CongThucDinhLuong` (fields: `code, ten, ganTheo, doiTuongMa?, chiTiet[], isActive`); `chiTiet` item = `{ hangHoaMa, hangHoaTen, dinhLuong, donViTinh, cachXuat }`; route `/mam-non/cong-thuc-dinh-luong`.

- [ ] **Step 1: Tạo entity** `be/libs/entities/src/mam-non/cong-thuc-dinh-luong.entity.ts`
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type GanTheo = 'SUAT_CHUAN' | 'DO_TUOI' | 'GOI_AN';

export interface ChiTietCongThuc {
  hangHoaMa: string;
  hangHoaTen: string;
  dinhLuong: number;      // trên 1 suất ăn
  donViTinh?: string;
  cachXuat: 'DINH_LUONG' | 'THEO_SUAT';
}

@Entity('cong_thuc_dinh_luong')
export class CongThucDinhLuong extends BaseEntity {
  @Column() code: string;
  @Column() ten: string;
  @Column({ default: 'SUAT_CHUAN' }) ganTheo: GanTheo;
  @Column({ nullable: true }) doiTuongMa: string;
  @Column({ type: 'json', default: [] }) chiTiet: ChiTietCongThuc[];
  @Column({ default: true }) isActive: boolean;
}

export interface CongThucDinhLuongEntities { CongThucDinhLuong: typeof CongThucDinhLuong; }
declare module '../entities' { interface Entities extends CongThucDinhLuongEntities {} }
```

- [ ] **Step 2: Export entity** — thêm vào `be/libs/entities/src/mam-non/index.ts`:
```ts
export * from './cong-thuc-dinh-luong.entity';
```

- [ ] **Step 3: Tạo DTO** trong `.../cong-thuc-dinh-luong/dto/`
`create-cong-thuc-dinh-luong.dto.ts`:
```ts
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ChiTietCongThucDto {
  @IsString() @IsNotEmpty() hangHoaMa: string;
  @IsString() @IsNotEmpty() hangHoaTen: string;
  @IsNumber() dinhLuong: number;
  @IsString() @IsOptional() donViTinh?: string;
  @IsString() @IsIn(['DINH_LUONG', 'THEO_SUAT']) cachXuat: string;
}

export class CreateCongThucDinhLuongDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() ten: string;
  @IsString() @IsOptional() @IsIn(['SUAT_CHUAN', 'DO_TUOI', 'GOI_AN']) ganTheo?: string;
  @IsString() @IsOptional() doiTuongMa?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChiTietCongThucDto)
  chiTiet: ChiTietCongThucDto[];
}
```
`update-...dto.ts` (T-DTO-Update) + `index.ts` (T-DTO-Index), Class=`CongThucDinhLuong`.

- [ ] **Step 4: Tạo service** — instantiate **T-Service** (Class=`CongThucDinhLuong`, route=`cong-thuc-dinh-luong`). Search chỉ theo `code`/`ten` (giữ nguyên template).

- [ ] **Step 5: Tạo controller** — instantiate **T-Controller** (`@Controller('cong-thuc-dinh-luong')`).

- [ ] **Step 6: Tạo module** — instantiate **T-Module** (Class=`CongThucDinhLuong`).

- [ ] **Step 7: Đăng ký** trong `mam-non-service.module.ts`:
```ts
import { CongThucDinhLuongModule } from './cong-thuc-dinh-luong/cong-thuc-dinh-luong.module';
// imports: [ ... , CongThucDinhLuongModule ]
```

- [ ] **Step 8: Build**
Run: `cd be && npx nest build mam-non-service`
Expected: build pass.

- [ ] **Step 9: Commit**
```bash
git add be/libs/entities/src/mam-non be/apps/mam-non-service/src/cong-thuc-dinh-luong be/apps/mam-non-service/src/mam-non-service.module.ts
git commit -m "feat(mam-non): danh mục Công thức định lượng (cong_thuc_dinh_luong) + CRUD"
```

---

## Kết thúc Phần 1

Sau Task 4: `mam-non-service` boot ở 3010, gateway route `/mam-non/*`, có 2 danh mục cấu hình (Định mức tiền ăn, Công thức định lượng) + trường `cachXuat` trên hàng hóa. Đủ nền để làm **Phần 2** (điểm danh + đề xuất mua + nhận hàng).

**Verify tổng Phần 1:**
Run: `cd be && npx nest build mam-non-service && npx nest build master-data-service && npx nest build gateway`
Expected: cả 3 build pass.
