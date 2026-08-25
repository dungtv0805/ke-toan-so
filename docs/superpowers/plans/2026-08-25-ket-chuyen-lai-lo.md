# Kết chuyển lãi lỗ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép khai báo cặp tài khoản kết chuyển trong danh mục rồi lập chứng từ kết chuyển lãi lỗ ghi thẳng vào `chung_tu`, để Bảng cân đối kế toán cân và Báo cáo tài chính có số đúng.

**Architecture:** Danh mục `tai_khoan_ket_chuyen` nằm ở master-data-service theo đúng khuôn `nhom-dong-tien`. Engine kết chuyển là **hàm thuần** trong voucher-service (`ket-chuyen.engine.ts`) — nhận danh mục + bảng số dư, trả về danh sách dòng hạch toán; mọi I/O (đọc số dư, đọc danh mục, ghi chứng từ) nằm ở service bọc ngoài. Chứng từ sinh ra là các bản ghi `chung_tu` bình thường (`loai='KHAC'`) gắn thêm tag `nguon='KET_CHUYEN'` + `maKetChuyen`, nên mọi báo cáo đọc `chung_tu` tự có số ngay.

**Tech Stack:** NestJS 11 + TypeORM/MongoDB (BE, test bằng Jest), React 18 + TypeScript + Vite + antd (FE, test bằng Vitest).

**Spec:** `docs/superpowers/specs/2026-08-25-ket-chuyen-lai-lo-design.md`

## Global Constraints

- Toàn bộ tên biến, comment, nhãn UI, thông báo lỗi viết bằng **tiếng Việt** như phần còn lại của repo.
- Danh mục **không seed tự động**. Công ty mới mở ra thấy danh mục trống, nhập qua Thêm hoặc Import Excel.
- Chỉ hỗ trợ `loai = 'XAC_DINH_KQKD'`. Không làm kết chuyển chi phí sản xuất (62x → 154) và giảm trừ doanh thu (521x → 511).
- Bút toán kết chuyển **gộp 1 dòng cho mỗi cặp TK**, không tách theo bộ phận / dự án / khoản mục.
- Số tiền luôn tra theo **mã tài khoản**, không theo tên.
- **Không** sửa `getPnL` và `getPnlSeries` trong lần này (người dùng đã quyết). Hệ quả đã ghi ở mục 8 của spec.
- BE `yarn test` toàn bộ đang **đỏ sẵn 13 suite**. Chỉ chạy test theo đường dẫn file cụ thể như các lệnh ghi trong plan; không kết luận từ lần chạy toàn bộ.
- `vite build` không typecheck; muốn chắc thì chạy `npx tsc --noEmit` và so với baseline (cũng đang có lỗi sẵn).
- Mọi repository trong BE đã tự lọc/gắn `tenantId` qua proxy ở `be/libs/database/src/database.module.ts` cho `find*`, `save/insert/create`, `update/delete`. Không tự thêm `tenantId` vào `where` khi dùng các method đó.

---

### Task 1: BE — Danh mục Tài khoản kết chuyển

**Files:**
- Create: `be/libs/entities/src/master-data/tai-khoan-ket-chuyen.entity.ts`
- Modify: `be/libs/entities/src/master-data/index.ts`
- Create: `be/apps/master-data-service/src/tai-khoan-ket-chuyen/dto/create-tai-khoan-ket-chuyen.dto.ts`
- Create: `be/apps/master-data-service/src/tai-khoan-ket-chuyen/dto/update-tai-khoan-ket-chuyen.dto.ts`
- Create: `be/apps/master-data-service/src/tai-khoan-ket-chuyen/dto/index.ts`
- Create: `be/apps/master-data-service/src/tai-khoan-ket-chuyen/tai-khoan-ket-chuyen.service.ts`
- Create: `be/apps/master-data-service/src/tai-khoan-ket-chuyen/tai-khoan-ket-chuyen.controller.ts`
- Create: `be/apps/master-data-service/src/tai-khoan-ket-chuyen/tai-khoan-ket-chuyen.module.ts`
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`
- Modify: `be/libs/core/src/permissions/all-permissions.ts`
- Test: `be/apps/master-data-service/src/tai-khoan-ket-chuyen/tai-khoan-ket-chuyen.service.spec.ts`

**Interfaces:**
- Consumes: `BaseEntity` (`@app/entities`), `TenantContextService`/`sanitizeUpdateDto`/`softDeleteBatch` (`@app/core`), `PaginationQueryDto`/`PaginatedResult`/`DeleteBatchDto` (`@app/dto`).
- Produces:
  - `TaiKhoanKetChuyen` entity với các field `thuTu: number`, `ma: string`, `taiKhoanTu: string`, `tenTaiKhoanTu: string`, `taiKhoanDen: string`, `tenTaiKhoanDen: string`, `ben: 'NO' | 'CO' | 'HAI_BEN'`, `loai: 'XAC_DINH_KQKD'`, `dienGiai: string`, `isActive: boolean`.
  - `TaiKhoanKetChuyenService` với `findAllPaginated(query)`, `findAll()`, `findOne(id)`, `findByMa(ma)`, `create(dto)`, `update(id, dto)`, `delete(id)`, `deleteBatch(ids)`, `getStats()`, `checkMaExists(ma, excludeId?)`.
  - `CreateTaiKhoanKetChuyenDto` — dùng lại ở Task 2.
  - REST: `GET/POST /master-data/tai-khoan-ket-chuyen`, `GET /all`, `GET /stats`, `GET /check-ma`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /delete-batch`.

- [ ] **Step 1: Viết entity**

Tạo `be/libs/entities/src/master-data/tai-khoan-ket-chuyen.entity.ts`:

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Bên số dư của TK nguồn được đem đi kết chuyển. */
export type BenKetChuyen = 'NO' | 'CO' | 'HAI_BEN';

/** Loại kết chuyển. Hiện chỉ chạy XAC_DINH_KQKD; để enum cho lần mở rộng sau. */
export type LoaiKetChuyen = 'XAC_DINH_KQKD';

/**
 * Một dòng khai báo "kết chuyển từ TK nào sang TK nào".
 *
 * Tên tài khoản được snapshot tại thời điểm khai để đổi tên trong danh mục Tài khoản
 * không làm sai chứng từ đã lập; mọi phép tính số tiền vẫn tra theo MÃ.
 */
@Entity('tai_khoan_ket_chuyen')
export class TaiKhoanKetChuyen extends BaseEntity {
  /** Thứ tự chạy. Nhỏ chạy trước — dòng 911 phải có thứ tự lớn nhất. */
  @Column()
  thuTu: number;

  @Column()
  ma: string;

  @Column()
  taiKhoanTu: string;

  @Column({ nullable: true })
  tenTaiKhoanTu: string;

  @Column()
  taiKhoanDen: string;

  @Column({ nullable: true })
  tenTaiKhoanDen: string;

  @Column()
  ben: BenKetChuyen;

  @Column({ default: 'XAC_DINH_KQKD' })
  loai: LoaiKetChuyen;

  @Column({ nullable: true })
  dienGiai: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface TaiKhoanKetChuyenEntities {
  TaiKhoanKetChuyen: typeof TaiKhoanKetChuyen;
}

declare module '../entities' {
  interface Entities extends TaiKhoanKetChuyenEntities {}
}
```

Trong `be/libs/entities/src/master-data/index.ts`, thêm **hai** dòng (file có 2 khối riêng — khối `import './…'` ở trên và khối `export * from './…'` ở dưới), đặt cạnh dòng `nhom-dong-tien` tương ứng:

```typescript
import './tai-khoan-ket-chuyen.entity';
```

```typescript
export * from './tai-khoan-ket-chuyen.entity';
```

- [ ] **Step 2: Viết DTO**

`dto/create-tai-khoan-ket-chuyen.dto.ts`:

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BenKetChuyen, LoaiKetChuyen } from '@app/entities';

export class CreateTaiKhoanKetChuyenDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  thuTu: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ma: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  taiKhoanTu: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  tenTaiKhoanTu?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  taiKhoanDen: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  tenTaiKhoanDen?: string;

  @IsIn(['NO', 'CO', 'HAI_BEN'])
  ben: BenKetChuyen;

  @IsOptional()
  @IsIn(['XAC_DINH_KQKD'])
  loai?: LoaiKetChuyen;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  dienGiai?: string;
}
```

`dto/update-tai-khoan-ket-chuyen.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateTaiKhoanKetChuyenDto } from './create-tai-khoan-ket-chuyen.dto';

export class UpdateTaiKhoanKetChuyenDto extends PartialType(CreateTaiKhoanKetChuyenDto) {}
```

`dto/index.ts`:

```typescript
export * from './create-tai-khoan-ket-chuyen.dto';
export * from './update-tai-khoan-ket-chuyen.dto';
```

- [ ] **Step 3: Viết test thất bại cho service**

Tạo `be/apps/master-data-service/src/tai-khoan-ket-chuyen/tai-khoan-ket-chuyen.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { TenantContextService } from '@app/core';
import { TaiKhoanKetChuyen } from '@app/entities';
import { TaiKhoanKetChuyenService } from './tai-khoan-ket-chuyen.service';

describe('TaiKhoanKetChuyenService', () => {
  let service: TaiKhoanKetChuyenService;
  let mockRepository: any;

  const taoBanGhi = (ma: string, thuTu: number): TaiKhoanKetChuyen => {
    const e = new TaiKhoanKetChuyen();
    e._id = new ObjectId();
    e.ma = ma;
    e.thuTu = thuTu;
    e.taiKhoanTu = '511';
    e.taiKhoanDen = '911';
    e.ben = 'CO';
    e.loai = 'XAC_DINH_KQKD';
    e.isActive = true;
    return e;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((d: any) => d),
      save: jest.fn((d: any) => d),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaiKhoanKetChuyenService,
        { provide: getRepositoryToken(TaiKhoanKetChuyen), useValue: mockRepository },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => 'tenant-1' } },
      ],
    }).compile();

    service = module.get<TaiKhoanKetChuyenService>(TaiKhoanKetChuyenService);
  });

  it('từ chối tạo khi mã kết chuyển đã tồn tại', async () => {
    mockRepository.findOne.mockResolvedValue(taoBanGhi('511-911', 10));

    await expect(
      service.create({
        thuTu: 10,
        ma: '511-911',
        taiKhoanTu: '511',
        taiKhoanDen: '911',
        ben: 'CO',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('từ chối tạo khi kết chuyển từ và đến trùng nhau', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        thuTu: 10,
        ma: '511-511',
        taiKhoanTu: '511',
        taiKhoanDen: '511',
        ben: 'CO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sắp xếp theo thứ tự kết chuyển tăng dần, mã dùng làm tie-break', async () => {
    mockRepository.findAndCount.mockResolvedValue([
      [taoBanGhi('911-4212', 99), taoBanGhi('642-911', 20), taoBanGhi('511-911', 20)],
      3,
    ]);

    const ketQua = await service.findAllPaginated({ page: 1, limit: 10 } as any);

    expect(ketQua.data.map((d) => d.ma)).toEqual(['511-911', '642-911', '911-4212']);
  });

  it('mặc định loai là XAC_DINH_KQKD khi không truyền', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    const ketQua = await service.create({
      thuTu: 10,
      ma: '511-911',
      taiKhoanTu: '511',
      taiKhoanDen: '911',
      ben: 'CO',
    });

    expect(ketQua.loai).toBe('XAC_DINH_KQKD');
  });
});
```

- [ ] **Step 4: Chạy test để chắc chắn nó đỏ**

Run: `cd be && npx jest apps/master-data-service/src/tai-khoan-ket-chuyen --runInBand`
Expected: FAIL — `Cannot find module './tai-khoan-ket-chuyen.service'`.

- [ ] **Step 5: Viết service**

`tai-khoan-ket-chuyen.service.ts` — sao khuôn `nhom-dong-tien.service.ts`, khác ở 3 chỗ: sắp xếp theo `thuTu`, chặn `taiKhoanTu === taiKhoanDen`, mặc định `loai`:

```typescript
import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { PaginatedResult, PaginationQueryDto } from '@app/dto';
import { TaiKhoanKetChuyen } from '@app/entities';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import {
  CreateTaiKhoanKetChuyenDto,
  UpdateTaiKhoanKetChuyenDto,
} from './dto';

/** Thứ tự chạy quyết định số đúng — dòng 911 phải sau. Mã dùng làm tie-break cho ổn định. */
const theoThuTu = (a: TaiKhoanKetChuyen, b: TaiKhoanKetChuyen) =>
  (a.thuTu ?? 0) - (b.thuTu ?? 0) || a.ma.localeCompare(b.ma);

@Injectable()
export class TaiKhoanKetChuyenService {
  constructor(
    @InjectRepository(TaiKhoanKetChuyen)
    private readonly repository: Repository<TaiKhoanKetChuyen>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<TaiKhoanKetChuyen>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { search } = query;
    const skip = (page - 1) * limit;

    const baseWhere: any = { isActive: true, ...this.getTenantFilter() };
    const where = search
      ? {
          ...baseWhere,
          $or: [
            { ma: { $regex: new RegExp(search, 'i') } },
            { taiKhoanTu: { $regex: new RegExp(search, 'i') } },
            { taiKhoanDen: { $regex: new RegExp(search, 'i') } },
          ],
        }
      : baseWhere;

    const [data, total] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
    });

    data.sort(theoThuTu);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAll(): Promise<TaiKhoanKetChuyen[]> {
    const data = await this.repository.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
    return data.sort(theoThuTu);
  }

  async findOne(id: string): Promise<TaiKhoanKetChuyen> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy tài khoản kết chuyển với ID ${id}`);
    }
    return item;
  }

  async findByMa(ma: string): Promise<TaiKhoanKetChuyen | null> {
    return this.repository.findOne({
      where: { ma, isActive: true, ...this.getTenantFilter() },
    });
  }

  private kiemTraCapTaiKhoan(tu?: string, den?: string) {
    if (tu && den && tu === den) {
      throw new BadRequestException(
        'Kết chuyển từ và Kết chuyển đến không được trùng nhau',
      );
    }
  }

  async create(
    createDto: CreateTaiKhoanKetChuyenDto,
  ): Promise<TaiKhoanKetChuyen> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã kết chuyển ${createDto.ma} đã tồn tại`);
    }
    this.kiemTraCapTaiKhoan(createDto.taiKhoanTu, createDto.taiKhoanDen);

    const item = this.repository.create({
      ...createDto,
      loai: createDto.loai ?? 'XAC_DINH_KQKD',
      isActive: true,
    });
    return this.repository.save(item);
  }

  async update(
    id: string,
    updateDto: UpdateTaiKhoanKetChuyenDto,
  ): Promise<TaiKhoanKetChuyen> {
    const item = await this.findOne(id);
    if (updateDto.ma && updateDto.ma !== item.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã kết chuyển ${updateDto.ma} đã tồn tại`);
      }
    }
    this.kiemTraCapTaiKhoan(
      updateDto.taiKhoanTu ?? item.taiKhoanTu,
      updateDto.taiKhoanDen ?? item.taiKhoanDen,
    );

    Object.assign(item, sanitizeUpdateDto(updateDto));
    return this.repository.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repository.save(item);
  }

  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repository as unknown as MongoRepository<TaiKhoanKetChuyen>,
      ids,
    );
  }

  async getStats(): Promise<{ tongTaiKhoanKetChuyen: number }> {
    const all = await this.repository.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
    return { tongTaiKhoanKetChuyen: all.length };
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing.id === excludeId) return false;
    return true;
  }
}
```

- [ ] **Step 6: Chạy test để chắc chắn nó xanh**

Run: `cd be && npx jest apps/master-data-service/src/tai-khoan-ket-chuyen --runInBand`
Expected: PASS — 4 test.

- [ ] **Step 7: Viết controller + module**

`tai-khoan-ket-chuyen.controller.ts` — sao y `nhom-dong-tien.controller.ts`, chỉ đổi tên class/service và `@Controller('tai-khoan-ket-chuyen')`:

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaiKhoanKetChuyenService } from './tai-khoan-ket-chuyen.service';
import {
  CreateTaiKhoanKetChuyenDto,
  UpdateTaiKhoanKetChuyenDto,
} from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';

const VAI_TRO_DOC = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_QUY',
  'KE_TOAN_CONG_NO',
  'KE_TOAN_TONG_HOP',
  'MANAGER',
  'KIEM_SOAT',
] as const;

@Controller('tai-khoan-ket-chuyen')
@UseGuards(JwtGuard, RoleGuard)
export class TaiKhoanKetChuyenController {
  constructor(private readonly service: TaiKhoanKetChuyenService) {}

  @Get()
  @Roles(...VAI_TRO_DOC)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all')
  @Roles(...VAI_TRO_DOC)
  async getAll() {
    const data = await this.service.findAll();
    return { success: true, data };
  }

  @Get('stats')
  @Roles(...VAI_TRO_DOC)
  async getStats() {
    const data = await this.service.getStats();
    return { success: true, data };
  }

  @Get('check-ma')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async checkMa(@Query('ma') ma: string, @Query('excludeId') excludeId?: string) {
    const exists = await this.service.checkMaExists(ma, excludeId);
    return { success: true, data: { exists } };
  }

  @Get(':id')
  @Roles(...VAI_TRO_DOC)
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async create(@Body() createDto: CreateTaiKhoanKetChuyenDto) {
    const data = await this.service.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaiKhoanKetChuyenDto,
  ) {
    const data = await this.service.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.service.deleteBatch(dto.ids);
    return { success: true, data };
  }
}
```

`tai-khoan-ket-chuyen.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TaiKhoanKetChuyen } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TaiKhoanKetChuyenController } from './tai-khoan-ket-chuyen.controller';
import { TaiKhoanKetChuyenService } from './tai-khoan-ket-chuyen.service';

@Module({
  imports: [DatabaseModule.forFeature([TaiKhoanKetChuyen])],
  controllers: [TaiKhoanKetChuyenController],
  providers: [TaiKhoanKetChuyenService],
  exports: [TaiKhoanKetChuyenService],
})
export class TaiKhoanKetChuyenModule {}
```

Trong `be/apps/master-data-service/src/master-data-service.module.ts`: thêm `import { TaiKhoanKetChuyenModule } from './tai-khoan-ket-chuyen/tai-khoan-ket-chuyen.module';` và thêm `TaiKhoanKetChuyenModule` vào mảng `imports`.

- [ ] **Step 8: Đăng ký quyền**

Trong `be/libs/core/src/permissions/all-permissions.ts`, thêm 2 key vào mảng (đặt `/danh-muc/tai-khoan-ket-chuyen` cạnh các key `/danh-muc/...`, `/chung-tu/ket-chuyen-lai-lo` cạnh các key `/chung-tu/...`):

```typescript
  '/danh-muc/tai-khoan-ket-chuyen',
  '/chung-tu/ket-chuyen-lai-lo',
```

- [ ] **Step 9: Chạy lại test + build service**

Run: `cd be && npx jest apps/master-data-service/src/tai-khoan-ket-chuyen --runInBand`
Expected: PASS

Run: `cd be && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "tai-khoan-ket-chuyen" | head`
Expected: không có dòng nào (repo có lỗi tsc sẵn ở chỗ khác — chỉ quan tâm file mới).

- [ ] **Step 10: Commit**

```bash
git add be/libs/entities/src/master-data be/apps/master-data-service/src/tai-khoan-ket-chuyen be/apps/master-data-service/src/master-data-service.module.ts be/libs/core/src/permissions/all-permissions.ts
git commit -m "feat(danh-muc): thêm danh mục Tài khoản kết chuyển (BE)"
```

---

### Task 2: BE — Import Excel cho danh mục Tài khoản kết chuyển

**Files:**
- Modify: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.ts`
- Modify: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.module.ts`
- Test: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.spec.ts` (bổ sung case)

**Interfaces:**
- Consumes: `TaiKhoanKetChuyenService`, `CreateTaiKhoanKetChuyenDto` (Task 1).
- Produces: resource `'tai-khoan-ket-chuyen'` cho `POST /master-data/import/tai-khoan-ket-chuyen`.

- [ ] **Step 1: Đọc spec hiện có để bám đúng khuôn**

Run: `cd be && sed -n 1,100p apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.spec.ts`
Mục đích: xem cách file này dựng registry (danh sách service giả truyền theo thứ tự tham số constructor) trước khi sửa.

- [ ] **Step 2: Viết test thất bại**

Thêm vào `import-danh-muc.registry.spec.ts` một case mới trong `describe` sẵn có, đặt ngay sau case `'nhom-dong-tien'`:

```typescript
  it('có entry cho danh mục Tài khoản kết chuyển', () => {
    const entry = registry.get('tai-khoan-ket-chuyen');

    expect(entry).toBeDefined();
    expect(entry?.dtoClass).toBe(CreateTaiKhoanKetChuyenDto);
    expect(entry?.label).toBe('Tài khoản kết chuyển');
  });
```

Thêm import ở đầu file spec:

```typescript
import { CreateTaiKhoanKetChuyenDto } from '../tai-khoan-ket-chuyen/dto';
```

Nếu spec dựng registry bằng cách `new ImportDanhMucRegistry(serviceA, serviceB, …)` thì bổ sung một service giả `{} as any` vào **đúng vị trí** tham số mới thêm ở Step 4 (thêm vào cuối danh sách tham số constructor để không xô lệch các tham số cũ).

- [ ] **Step 3: Chạy test để chắc chắn nó đỏ**

Run: `cd be && npx jest apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.spec.ts --runInBand`
Expected: FAIL — `entry` là `undefined`.

- [ ] **Step 4: Đăng ký resource**

Trong `import-danh-muc.registry.ts`:
1. Thêm import service + DTO cạnh các import cùng loại:

```typescript
import { TaiKhoanKetChuyenService } from '../tai-khoan-ket-chuyen/tai-khoan-ket-chuyen.service';
```

```typescript
import { CreateTaiKhoanKetChuyenDto } from '../tai-khoan-ket-chuyen/dto';
```

2. Thêm tham số **cuối cùng** của constructor (sau `hoSoChungTu: HoSoChungTuService,`):

```typescript
    taiKhoanKetChuyen: TaiKhoanKetChuyenService,
```

3. Thêm entry vào `this.entries`, đặt sau entry `'nhom-dong-tien'`:

```typescript
      [
        'tai-khoan-ket-chuyen',
        {
          service: taiKhoanKetChuyen,
          dtoClass: CreateTaiKhoanKetChuyenDto,
          label: 'Tài khoản kết chuyển',
        },
      ],
```

Trong `import-danh-muc.module.ts`: thêm `import { TaiKhoanKetChuyenModule } from '../tai-khoan-ket-chuyen/tai-khoan-ket-chuyen.module';` và `TaiKhoanKetChuyenModule` vào mảng `imports`.

- [ ] **Step 5: Chạy test để chắc chắn nó xanh**

Run: `cd be && npx jest apps/master-data-service/src/import-danh-muc --runInBand`
Expected: PASS — toàn bộ suite import-danh-muc.

- [ ] **Step 6: Commit**

```bash
git add be/apps/master-data-service/src/import-danh-muc
git commit -m "feat(danh-muc): cho phép import Excel danh mục Tài khoản kết chuyển"
```

---

### Task 3: BE — Engine kết chuyển (hàm thuần)

**Files:**
- Create: `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.engine.ts`
- Test: `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.engine.spec.ts`

**Interfaces:**
- Consumes: không phụ thuộc Nest, TypeORM hay bất cứ I/O nào — chỉ nhận dữ liệu qua tham số.
- Produces:
  - `type BangSoDu = Record<string, number>` — dương = dư Nợ, âm = dư Có.
  - `interface DongDanhMucKetChuyen { ma: string; thuTu: number; taiKhoanTu: string; taiKhoanDen: string; ben: 'NO' | 'CO' | 'HAI_BEN'; dienGiai?: string }`
  - `interface DongHachToan { maKetChuyen: string; dienGiai: string; taiKhoanNo: string; taiKhoanCo: string; soTien: number }`
  - `interface CanhBaoTonDu { ma: string; soTien: number; ben: 'NO' | 'CO' }`
  - `interface KetQuaKetChuyen { dong: DongHachToan[]; canhBao: CanhBaoTonDu[]; laiLo: number }`
  - `function dungBangSoDu(phatSinh, soDuDauKy, apDungSoDuDauKy): BangSoDu`
  - `function chayKetChuyen(danhMuc, soDuBanDau, taiKhoanXacDinhKqkd?): KetQuaKetChuyen`

- [ ] **Step 1: Viết test thất bại**

Tạo `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.engine.spec.ts`:

```typescript
import {
  chayKetChuyen,
  dungBangSoDu,
  type DongDanhMucKetChuyen,
} from './ket-chuyen.engine';

const DANH_MUC: DongDanhMucKetChuyen[] = [
  { ma: '911-4212', thuTu: 99, taiKhoanTu: '911', taiKhoanDen: '4212', ben: 'HAI_BEN', dienGiai: 'Kết chuyển lãi lỗ' },
  { ma: '642-911', thuTu: 20, taiKhoanTu: '642', taiKhoanDen: '911', ben: 'NO', dienGiai: 'Kết chuyển chi phí QLDN' },
  { ma: '511-911', thuTu: 10, taiKhoanTu: '511', taiKhoanDen: '911', ben: 'CO', dienGiai: 'Kết chuyển doanh thu' },
];

describe('dungBangSoDu', () => {
  it('quy phát sinh về số dư: dương là dư Nợ, âm là dư Có', () => {
    const bang = dungBangSoDu(
      [
        { ma: '511', periodNo: 0, periodCo: 100 },
        { ma: '642', periodNo: 30, periodCo: 0 },
      ],
      [],
      false,
    );

    expect(bang['511']).toBe(-100);
    expect(bang['642']).toBe(30);
  });

  it('cộng số dư đầu kỳ khi được phép áp dụng', () => {
    const bang = dungBangSoDu(
      [{ ma: '511', periodNo: 0, periodCo: 100 }],
      [{ maTaiKhoan: '511', duNo: 0, duCo: 20 }],
      true,
    );

    expect(bang['511']).toBe(-120);
  });

  it('bỏ qua số dư đầu kỳ khi ngoài kỳ kết chuyển', () => {
    const bang = dungBangSoDu(
      [{ ma: '511', periodNo: 0, periodCo: 100 }],
      [{ maTaiKhoan: '511', duNo: 0, duCo: 20 }],
      false,
    );

    expect(bang['511']).toBe(-100);
  });
});

describe('chayKetChuyen', () => {
  it('kết chuyển doanh thu và chi phí rồi chốt lãi về TK đích', () => {
    const kq = chayKetChuyen(DANH_MUC, { '511': -100, '642': 30 });

    expect(kq.dong).toEqual([
      { maKetChuyen: '511-911', dienGiai: 'Kết chuyển doanh thu', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
      { maKetChuyen: '642-911', dienGiai: 'Kết chuyển chi phí QLDN', taiKhoanNo: '911', taiKhoanCo: '642', soTien: 30 },
      { maKetChuyen: '911-4212', dienGiai: 'Kết chuyển lãi lỗ', taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 70 },
    ]);
    expect(kq.laiLo).toBe(70);
    expect(kq.canhBao).toEqual([]);
  });

  it('lỗ thì đảo chiều bút toán chốt và trả lãi lỗ âm', () => {
    const kq = chayKetChuyen(DANH_MUC, { '511': -30, '642': 100 });

    expect(kq.dong[2]).toEqual({
      maKetChuyen: '911-4212',
      dienGiai: 'Kết chuyển lãi lỗ',
      taiKhoanNo: '4212',
      taiKhoanCo: '911',
      soTien: 70,
    });
    expect(kq.laiLo).toBe(-70);
  });

  it('khai ở TK tổng nhưng hạch toán ở TK con thì sinh một dòng cho mỗi TK con', () => {
    const kq = chayKetChuyen(DANH_MUC, { '6421': 20, '6422': 10 });

    expect(kq.dong.slice(0, 2)).toEqual([
      { maKetChuyen: '642-911', dienGiai: 'Kết chuyển chi phí QLDN', taiKhoanNo: '911', taiKhoanCo: '6421', soTien: 20 },
      { maKetChuyen: '642-911', dienGiai: 'Kết chuyển chi phí QLDN', taiKhoanNo: '911', taiKhoanCo: '6422', soTien: 10 },
    ]);
  });

  it('bỏ qua tài khoản dư ngược chiều với bên đã khai và cảnh báo phần còn treo', () => {
    const kq = chayKetChuyen(DANH_MUC, { '642': -5 });

    expect(kq.dong).toEqual([]);
    expect(kq.canhBao).toEqual([{ ma: '642', soTien: 5, ben: 'CO' }]);
  });

  it('cảnh báo tài khoản kết quả kinh doanh chưa được khai trong danh mục', () => {
    const kq = chayKetChuyen(DANH_MUC, { '641': 15 });

    expect(kq.canhBao).toEqual([{ ma: '641', soTien: 15, ben: 'NO' }]);
  });

  it('chạy lại khi không còn phát sinh thì không sinh dòng nào', () => {
    const kq = chayKetChuyen(DANH_MUC, { '511': 0, '642': 0, '911': 0 });

    expect(kq.dong).toEqual([]);
    expect(kq.laiLo).toBe(0);
  });

  it('không phụ thuộc thứ tự mảng đầu vào, chỉ theo thuTu', () => {
    const daoNguoc = [...DANH_MUC].reverse();
    const kq = chayKetChuyen(daoNguoc, { '511': -100, '642': 30 });

    expect(kq.dong.map((d) => d.maKetChuyen)).toEqual(['511-911', '642-911', '911-4212']);
  });

  it('bỏ qua dòng danh mục có tài khoản nguồn không phát sinh', () => {
    const kq = chayKetChuyen(DANH_MUC, { '511': -50 });

    expect(kq.dong.map((d) => d.maKetChuyen)).toEqual(['511-911', '911-4212']);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ket-chuyen --runInBand`
Expected: FAIL — `Cannot find module './ket-chuyen.engine'`.

- [ ] **Step 3: Viết engine**

Tạo `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.engine.ts`:

```typescript
/**
 * Engine kết chuyển — hàm THUẦN, không đụng DB, không đụng Nest.
 *
 * Quy ước số dư dùng xuyên suốt file: **dương = dư Nợ, âm = dư Có**. Nhờ quy ước một
 * dấu này, việc chuyển số dư từ TK nguồn sang TK đích luôn là `soDu[den] += soDu[nguon]`
 * bất kể chiều nào, không phải rẽ nhánh.
 */

export type BenKetChuyen = 'NO' | 'CO' | 'HAI_BEN';

/** Dương = dư Nợ, âm = dư Có. */
export type BangSoDu = Record<string, number>;

export interface DongDanhMucKetChuyen {
  ma: string;
  thuTu: number;
  taiKhoanTu: string;
  taiKhoanDen: string;
  ben: BenKetChuyen;
  dienGiai?: string;
}

export interface PhatSinhTaiKhoan {
  ma: string;
  periodNo: number;
  periodCo: number;
}

export interface SoDuDauKyItem {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
}

export interface DongHachToan {
  maKetChuyen: string;
  dienGiai: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
}

export interface CanhBaoTonDu {
  ma: string;
  soTien: number;
  ben: 'NO' | 'CO';
}

export interface KetQuaKetChuyen {
  dong: DongHachToan[];
  canhBao: CanhBaoTonDu[];
  /** Dương = lãi, âm = lỗ. Đo tại thời điểm ngay trước bút toán chốt 911. */
  laiLo: number;
}

/** Tiền tố tài khoản thuộc kết quả kinh doanh — dùng để cảnh báo phần còn treo. */
const TIEN_TO_KQKD = ['5', '6', '7', '8', '9'];

export function dungBangSoDu(
  phatSinh: PhatSinhTaiKhoan[],
  soDuDauKy: SoDuDauKyItem[],
  apDungSoDuDauKy: boolean,
): BangSoDu {
  const bang: BangSoDu = {};

  for (const p of phatSinh) {
    const net = (Number(p.periodNo) || 0) - (Number(p.periodCo) || 0);
    bang[p.ma] = (bang[p.ma] ?? 0) + net;
  }

  if (apDungSoDuDauKy) {
    for (const o of soDuDauKy) {
      const net = (Number(o.duNo) || 0) - (Number(o.duCo) || 0);
      bang[o.maTaiKhoan] = (bang[o.maTaiKhoan] ?? 0) + net;
    }
  }

  return bang;
}

/** TK nguồn của một dòng danh mục = chính nó + mọi TK con đang có số dư. */
function timTaiKhoanNguon(bang: BangSoDu, tienTo: string): string[] {
  return Object.keys(bang)
    .filter((ma) => ma.startsWith(tienTo))
    .sort();
}

function tongSoDuNhom(bang: BangSoDu, tienTo: string): number {
  return timTaiKhoanNguon(bang, tienTo).reduce((t, ma) => t + (bang[ma] ?? 0), 0);
}

export function chayKetChuyen(
  danhMuc: DongDanhMucKetChuyen[],
  soDuBanDau: BangSoDu,
  taiKhoanXacDinhKqkd = '911',
): KetQuaKetChuyen {
  const soDu: BangSoDu = { ...soDuBanDau };
  const dong: DongHachToan[] = [];

  const theoThuTu = [...danhMuc].sort(
    (a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0) || a.ma.localeCompare(b.ma),
  );

  let laiLo = 0;
  let daDoLaiLo = false;

  for (const d of theoThuTu) {
    // Đo lãi/lỗ NGAY TRƯỚC bút toán chốt: lúc này 911 đã gom đủ doanh thu lẫn chi phí.
    if (!daDoLaiLo && d.taiKhoanTu === taiKhoanXacDinhKqkd) {
      laiLo = -tongSoDuNhom(soDu, taiKhoanXacDinhKqkd);
      daDoLaiLo = true;
    }

    for (const maNguon of timTaiKhoanNguon(soDu, d.taiKhoanTu)) {
      const du = soDu[maNguon] ?? 0;
      if (du === 0) continue;

      const chieu: 'NO' | 'CO' = du > 0 ? 'NO' : 'CO';
      if (d.ben !== 'HAI_BEN' && d.ben !== chieu) continue;

      dong.push({
        maKetChuyen: d.ma,
        dienGiai: d.dienGiai ?? '',
        taiKhoanNo: chieu === 'NO' ? d.taiKhoanDen : maNguon,
        taiKhoanCo: chieu === 'NO' ? maNguon : d.taiKhoanDen,
        soTien: Math.abs(du),
      });

      soDu[d.taiKhoanDen] = (soDu[d.taiKhoanDen] ?? 0) + du;
      soDu[maNguon] = 0;
    }
  }

  // Danh mục không khai dòng 911 nào → đo lãi lỗ ở trạng thái cuối.
  if (!daDoLaiLo) {
    laiLo = -tongSoDuNhom(soDu, taiKhoanXacDinhKqkd);
  }

  const canhBao: CanhBaoTonDu[] = Object.keys(soDu)
    .filter((ma) => TIEN_TO_KQKD.some((t) => ma.startsWith(t)))
    .filter((ma) => (soDu[ma] ?? 0) !== 0)
    .sort()
    .map((ma) => ({
      ma,
      soTien: Math.abs(soDu[ma]),
      ben: soDu[ma] > 0 ? ('NO' as const) : ('CO' as const),
    }));

  return { dong, canhBao, laiLo };
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd be && npx jest apps/voucher-service/src/ket-chuyen --runInBand`
Expected: PASS — 11 test.

- [ ] **Step 5: Commit**

```bash
git add be/apps/voucher-service/src/ket-chuyen
git commit -m "feat(ket-chuyen): engine kết chuyển lãi lỗ dạng hàm thuần"
```

---

### Task 4: BE — Module kết chuyển (API + ghi chứng từ)

**Files:**
- Modify: `be/libs/entities/src/voucher/chung-tu.entity.ts`
- Modify: `be/libs/service-client/src/service-client.ts`
- Create: `be/apps/voucher-service/src/ket-chuyen/dto/preview-ket-chuyen.dto.ts`
- Create: `be/apps/voucher-service/src/ket-chuyen/dto/create-ket-chuyen.dto.ts`
- Create: `be/apps/voucher-service/src/ket-chuyen/dto/index.ts`
- Create: `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.helper.ts`
- Create: `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.service.ts`
- Create: `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.controller.ts`
- Create: `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.module.ts`
- Modify: `be/apps/voucher-service/src/voucher-service.module.ts`
- Modify: `be/apps/voucher-service/src/main.ts`
- Test: `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.helper.spec.ts`
- Test: `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.service.spec.ts`

**Interfaces:**
- Consumes: `chayKetChuyen`, `dungBangSoDu`, `DongHachToan` (Task 3); `NhatKyChungService.aggregateBalance(startDate, endDate, tenantId?)` trả `{ success, data: Array<{ ma, priorNo, priorCo, periodNo, periodCo }> }`; `VoucherNumberService.generateVoucherNumber(loai, { maLoaiChungTu, date })`; `ServiceClient.getTaiKhoan(authToken, tenantId)`, `ServiceClient.getSoDuDauKy(authToken, tenantId)`.
- Produces:
  - `ServiceClient.getTaiKhoanKetChuyen(authToken?, tenantId?)` → `ServiceResponse<TaiKhoanKetChuyenResponse[]>`.
  - `ChungTu.nguon?: 'KET_CHUYEN'`, `ChungTu.maKetChuyen?: string`.
  - `gomLoKetChuyen(rows)` → `LoKetChuyen[]`; `tinhLaiLoTuDong(dong)` → `number`.
  - REST: `POST /voucher/ket-chuyen/preview`, `POST /voucher/ket-chuyen`, `GET /voucher/ket-chuyen`, `DELETE /voucher/ket-chuyen/:soPhieu`.

- [ ] **Step 1: Thêm 2 field vào entity ChungTu**

Trong `be/libs/entities/src/voucher/chung-tu.entity.ts`, thêm vào cuối class `ChungTu` (sau `kiemSoat`):

```typescript
  /**
   * Nguồn sinh ra bút toán. `KET_CHUYEN` = do trang Kết chuyển lãi lỗ sinh tự động.
   * Không có tag này thì không lọc/xóa được nguyên lô, và các báo cáo tính net sau này
   * cũng không loại được bút toán kết chuyển ra.
   */
  @Column({ nullable: true })
  nguon?: 'KET_CHUYEN';

  /** Mã dòng danh mục Tài khoản kết chuyển đã sinh ra bút toán này. */
  @Column({ nullable: true })
  maKetChuyen?: string;
```

- [ ] **Step 2: Viết test thất bại cho helper**

Tạo `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.helper.spec.ts`:

```typescript
import { gomLoKetChuyen, tinhLaiLoTuDong } from './ket-chuyen.helper';

describe('tinhLaiLoTuDong', () => {
  it('lãi khi 911 nằm bên Nợ và bên kia không phải tài khoản KQKD', () => {
    const laiLo = tinhLaiLoTuDong([
      { taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
      { taiKhoanNo: '911', taiKhoanCo: '642', soTien: 30 },
      { taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 70 },
    ]);

    expect(laiLo).toBe(70);
  });

  it('lỗ khi 911 nằm bên Có của bút toán chốt', () => {
    const laiLo = tinhLaiLoTuDong([
      { taiKhoanNo: '4212', taiKhoanCo: '911', soTien: 70 },
    ]);

    expect(laiLo).toBe(-70);
  });

  it('trả 0 khi lô không có bút toán chốt', () => {
    expect(tinhLaiLoTuDong([{ taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }])).toBe(0);
  });
});

describe('gomLoKetChuyen', () => {
  it('gom các dòng cùng số phiếu thành một lô và cộng tổng tiền', () => {
    const lo = gomLoKetChuyen([
      {
        soPhieu: 'NVK202608/001',
        ngay: new Date('2026-08-31'),
        noiDung: 'Kết chuyển doanh thu',
        soTien: 100,
        nguoiTaoId: 'u1',
        danhMuc: { taiKhoanNo: { ma: '511' }, taiKhoanCo: { ma: '911' } },
      },
      {
        soPhieu: 'NVK202608/001',
        ngay: new Date('2026-08-31'),
        noiDung: 'Kết chuyển lãi lỗ',
        soTien: 100,
        nguoiTaoId: 'u1',
        danhMuc: { taiKhoanNo: { ma: '911' }, taiKhoanCo: { ma: '4212' } },
      },
    ] as any);

    expect(lo).toHaveLength(1);
    expect(lo[0].soPhieu).toBe('NVK202608/001');
    expect(lo[0].soDong).toBe(2);
    expect(lo[0].tongTien).toBe(200);
    expect(lo[0].laiLo).toBe(100);
  });

  it('sắp xếp lô mới nhất lên đầu', () => {
    const lo = gomLoKetChuyen([
      { soPhieu: 'A', ngay: new Date('2026-06-30'), noiDung: 'x', soTien: 1, danhMuc: {} },
      { soPhieu: 'B', ngay: new Date('2026-08-31'), noiDung: 'y', soTien: 1, danhMuc: {} },
    ] as any);

    expect(lo.map((l) => l.soPhieu)).toEqual(['B', 'A']);
  });
});
```

- [ ] **Step 3: Chạy test để chắc chắn nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ket-chuyen/ket-chuyen.helper.spec.ts --runInBand`
Expected: FAIL — `Cannot find module './ket-chuyen.helper'`.

- [ ] **Step 4: Viết helper**

Tạo `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.helper.ts`:

```typescript
import type { ChungTu } from '@app/entities';

export interface LoKetChuyen {
  soPhieu: string;
  ngay: Date;
  dienGiai: string;
  tongTien: number;
  soDong: number;
  /** Dương = lãi, âm = lỗ. */
  laiLo: number;
  nguoiTaoId?: string;
}

interface DongToiThieu {
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  soTien: number;
}

const LA_TAI_KHOAN_KQKD = (ma?: string) =>
  !!ma && ['5', '6', '7', '8', '9'].some((t) => ma.startsWith(t));

/**
 * Bút toán chốt lãi/lỗ là dòng có 911 ở một bên và bên kia KHÔNG phải tài khoản
 * kết quả kinh doanh (thường là 421x). Nhận diện theo hình dạng bút toán nên không
 * cần lưu thêm cờ vào chứng từ.
 */
export function tinhLaiLoTuDong(dong: DongToiThieu[], taiKhoan911 = '911'): number {
  for (const d of dong) {
    const no = d.taiKhoanNo;
    const co = d.taiKhoanCo;

    if (no?.startsWith(taiKhoan911) && !LA_TAI_KHOAN_KQKD(co)) {
      return d.soTien;
    }
    if (co?.startsWith(taiKhoan911) && !LA_TAI_KHOAN_KQKD(no)) {
      return -d.soTien;
    }
  }
  return 0;
}

export function gomLoKetChuyen(rows: ChungTu[]): LoKetChuyen[] {
  const theoSoPhieu = new Map<string, ChungTu[]>();

  for (const r of rows) {
    const arr = theoSoPhieu.get(r.soPhieu) ?? [];
    arr.push(r);
    theoSoPhieu.set(r.soPhieu, arr);
  }

  const lo: LoKetChuyen[] = [];

  for (const [soPhieu, dong] of theoSoPhieu) {
    const dauTien = dong[0];
    lo.push({
      soPhieu,
      ngay: dauTien.ngay,
      dienGiai: dauTien.ghiChu || dauTien.noiDung,
      tongTien: dong.reduce((t, d) => t + (Number(d.soTien) || 0), 0),
      soDong: dong.length,
      laiLo: tinhLaiLoTuDong(
        dong.map((d) => ({
          taiKhoanNo: d.danhMuc?.taiKhoanNo?.ma,
          taiKhoanCo: d.danhMuc?.taiKhoanCo?.ma,
          soTien: Number(d.soTien) || 0,
        })),
      ),
      nguoiTaoId: dauTien.nguoiTaoId,
    });
  }

  return lo.sort((a, b) => new Date(b.ngay).getTime() - new Date(a.ngay).getTime());
}
```

- [ ] **Step 5: Chạy test để chắc chắn nó xanh**

Run: `cd be && npx jest apps/voucher-service/src/ket-chuyen/ket-chuyen.helper.spec.ts --runInBand`
Expected: PASS — 5 test.

- [ ] **Step 6: Thêm method vào ServiceClient**

Trong `be/libs/service-client/src/service-client.ts`, thêm ngay sau `getTaiKhoanByMa` (khối `// ============ Master Data Service Methods ============`):

```typescript
  /**
   * Danh mục Tài khoản kết chuyển. Lấy qua `/all` để không dính bẫy phân trang
   * mặc định 100 bản ghi của endpoint danh sách.
   */
  async getTaiKhoanKetChuyen(
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<TaiKhoanKetChuyenResponse[]>> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    return this.get<TaiKhoanKetChuyenResponse[]>(
      'master-data',
      '/tai-khoan-ket-chuyen/all',
      { headers: Object.keys(headers).length ? headers : undefined },
    );
  }
```

Khai kiểu `TaiKhoanKetChuyenResponse` trong file interfaces của service-client (đặt cạnh `TaiKhoanResponse` — tìm bằng `grep -rn "interface TaiKhoanResponse" be/libs/service-client/src`) và export lại như các response khác:

```typescript
export interface TaiKhoanKetChuyenResponse {
  id?: string;
  ma: string;
  thuTu: number;
  taiKhoanTu: string;
  tenTaiKhoanTu?: string;
  taiKhoanDen: string;
  tenTaiKhoanDen?: string;
  ben: 'NO' | 'CO' | 'HAI_BEN';
  loai: 'XAC_DINH_KQKD';
  dienGiai?: string;
  isActive: boolean;
}
```

- [ ] **Step 7: Viết DTO**

`dto/preview-ket-chuyen.dto.ts`:

```typescript
import { IsDateString, IsNotEmpty } from 'class-validator';

export class PreviewKetChuyenDto {
  @IsNotEmpty()
  @IsDateString()
  denNgay: string;
}
```

`dto/create-ket-chuyen.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class DongKetChuyenDto {
  @IsString()
  @IsNotEmpty()
  maKetChuyen: string;

  @IsString()
  @IsOptional()
  dienGiai?: string;

  @IsString()
  @IsNotEmpty()
  taiKhoanNo: string;

  @IsString()
  @IsNotEmpty()
  taiKhoanCo: string;

  @IsNumber()
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  soTien: number;
}

export class CreateKetChuyenDto {
  @IsNotEmpty()
  @IsDateString()
  denNgay: string;

  @IsNotEmpty()
  @IsDateString()
  ngayHachToan: string;

  @IsNotEmpty()
  @IsDateString()
  ngayChungTu: string;

  @IsString()
  @IsNotEmpty()
  dienGiai: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DongKetChuyenDto)
  dong: DongKetChuyenDto[];
}
```

`dto/index.ts`:

```typescript
export * from './preview-ket-chuyen.dto';
export * from './create-ket-chuyen.dto';
```

- [ ] **Step 8: Viết test thất bại cho service**

Tạo `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { ChungTu } from '@app/entities';
import { NhatKyChungService } from '../nhat-ky-chung/nhat-ky-chung.service';
import { VoucherNumberService } from '../shared';
import { KetChuyenService } from './ket-chuyen.service';

describe('KetChuyenService', () => {
  let service: KetChuyenService;
  let chungTuRepository: any;
  let serviceClient: any;
  let nhatKyChungService: any;
  let voucherNumberService: any;

  const DANH_MUC = [
    { ma: '511-911', thuTu: 10, taiKhoanTu: '511', taiKhoanDen: '911', ben: 'CO', loai: 'XAC_DINH_KQKD', isActive: true, dienGiai: 'Kết chuyển doanh thu' },
    { ma: '642-911', thuTu: 20, taiKhoanTu: '642', taiKhoanDen: '911', ben: 'NO', loai: 'XAC_DINH_KQKD', isActive: true, dienGiai: 'Kết chuyển chi phí QLDN' },
    { ma: '911-4212', thuTu: 99, taiKhoanTu: '911', taiKhoanDen: '4212', ben: 'HAI_BEN', loai: 'XAC_DINH_KQKD', isActive: true, dienGiai: 'Kết chuyển lãi lỗ' },
  ];

  const TAI_KHOAN = [
    { ma: '511', ten: 'Doanh thu bán hàng', loai: 'DOANH_THU', nhom: 'KHONG_CO_SO_DU' },
    { ma: '642', ten: 'Chi phí quản lý doanh nghiệp', loai: 'CHI_PHI', nhom: 'KHONG_CO_SO_DU' },
    { ma: '911', ten: 'Xác định kết quả kinh doanh', loai: 'XAC_DINH_KQKD', nhom: 'KHONG_CO_SO_DU' },
    { ma: '4212', ten: 'LNST chưa phân phối năm nay', loai: 'VON_CHU_SO_HUU', nhom: 'CO' },
  ];

  beforeEach(async () => {
    chungTuRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((d: any) => d),
      save: jest.fn((d: any) => d),
      delete: jest.fn().mockResolvedValue({ affected: 3 }),
    };
    serviceClient = {
      getTaiKhoanKetChuyen: jest.fn().mockResolvedValue({ success: true, data: DANH_MUC }),
      getTaiKhoan: jest.fn().mockResolvedValue({ success: true, data: TAI_KHOAN }),
      getSoDuDauKy: jest.fn().mockResolvedValue({ success: true, data: { ngayApDung: null, items: [] } }),
    };
    nhatKyChungService = {
      aggregateBalance: jest.fn().mockResolvedValue({
        success: true,
        data: [
          { ma: '511', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 100 },
          { ma: '642', priorNo: 0, priorCo: 0, periodNo: 30, periodCo: 0 },
        ],
      }),
    };
    voucherNumberService = {
      generateVoucherNumber: jest.fn().mockResolvedValue('NVK202608/001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KetChuyenService,
        { provide: getRepositoryToken(ChungTu), useValue: chungTuRepository },
        { provide: NhatKyChungService, useValue: nhatKyChungService },
        { provide: VoucherNumberService, useValue: voucherNumberService },
        { provide: ServiceClient, useValue: serviceClient },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => 'tenant-1' } },
      ],
    }).compile();

    service = module.get<KetChuyenService>(KetChuyenService);
  });

  it('preview trả về đủ dòng kết chuyển và số lãi', async () => {
    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong.map((d) => `${d.taiKhoanNo}/${d.taiKhoanCo}=${d.soTien}`)).toEqual([
      '511/911=100',
      '911/642=30',
      '911/4212=70',
    ]);
    expect(kq.laiLo).toBe(70);
  });

  it('preview lấy số dư từ đầu năm của ngày kết chuyển', async () => {
    await service.preview('2026-08-31', 'Bearer token');

    const [start, end] = nhatKyChungService.aggregateBalance.mock.calls[0];
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2026);
  });

  it('preview gắn tên tài khoản vào cảnh báo', async () => {
    serviceClient.getTaiKhoanKetChuyen.mockResolvedValue({ success: true, data: [] });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.canhBao).toEqual([
      { ma: '511', ten: 'Doanh thu bán hàng', soTien: 100, ben: 'CO' },
      { ma: '642', ten: 'Chi phí quản lý doanh nghiệp', soTien: 30, ben: 'NO' },
    ]);
  });

  it('preview bỏ qua dòng danh mục đã ngừng sử dụng', async () => {
    serviceClient.getTaiKhoanKetChuyen.mockResolvedValue({
      success: true,
      data: DANH_MUC.map((d) => (d.ma === '642-911' ? { ...d, isActive: false } : d)),
    });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong.some((d) => d.taiKhoanCo === '642')).toBe(false);
  });

  it('preview bỏ qua số dư đầu kỳ có ngày áp dụng ngoài năm kết chuyển', async () => {
    serviceClient.getSoDuDauKy.mockResolvedValue({
      success: true,
      data: { ngayApDung: '2025-06-30', items: [{ maTaiKhoan: '511', duNo: 0, duCo: 500 }] },
    });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong[0].soTien).toBe(100);
  });

  it('preview cộng số dư đầu kỳ có ngày áp dụng trong năm kết chuyển', async () => {
    serviceClient.getSoDuDauKy.mockResolvedValue({
      success: true,
      data: { ngayApDung: '2026-06-30', items: [{ maTaiKhoan: '511', duNo: 0, duCo: 500 }] },
    });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong[0].soTien).toBe(600);
  });

  it('create ghi mọi dòng cùng một số phiếu và gắn tag kết chuyển', async () => {
    const kq = await service.create(
      {
        denNgay: '2026-08-31',
        ngayHachToan: '2026-08-31',
        ngayChungTu: '2026-08-31',
        dienGiai: 'Kết chuyển lãi lỗ đến ngày 31/08/2026',
        dong: [
          { maKetChuyen: '511-911', dienGiai: 'Kết chuyển doanh thu', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
          { maKetChuyen: '911-4212', dienGiai: 'Kết chuyển lãi lỗ', taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 100 },
        ],
      },
      'user-1',
      'Bearer token',
    );

    expect(kq.soPhieu).toBe('NVK202608/001');
    expect(kq.soDong).toBe(2);

    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu).toHaveLength(2);
    expect(daLuu.every((r: any) => r.soPhieu === 'NVK202608/001')).toBe(true);
    expect(daLuu.every((r: any) => r.nguon === 'KET_CHUYEN')).toBe(true);
    expect(daLuu.every((r: any) => r.loai === 'KHAC')).toBe(true);
    expect(daLuu[0].danhMuc.taiKhoanNo).toEqual({
      ma: '511',
      ten: 'Doanh thu bán hàng',
      loai: 'DOANH_THU',
      nhom: 'KHONG_CO_SO_DU',
    });
  });

  it('create dùng tiền tố NVK cho số chứng từ', async () => {
    await service.create(
      {
        denNgay: '2026-08-31',
        ngayHachToan: '2026-08-31',
        ngayChungTu: '2026-08-31',
        dienGiai: 'x',
        dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
      },
      'user-1',
      'Bearer token',
    );

    expect(voucherNumberService.generateVoucherNumber).toHaveBeenCalledWith(
      'KHAC',
      expect.objectContaining({ maLoaiChungTu: 'NVK' }),
    );
  });

  it('remove chỉ xóa chứng từ do kết chuyển sinh ra', async () => {
    await service.remove('NVK202608/001');

    expect(chungTuRepository.delete).toHaveBeenCalledWith({
      soPhieu: 'NVK202608/001',
      nguon: 'KET_CHUYEN',
    });
  });
});
```

- [ ] **Step 9: Chạy test để chắc chắn nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ket-chuyen/ket-chuyen.service.spec.ts --runInBand`
Expected: FAIL — `Cannot find module './ket-chuyen.service'`.

- [ ] **Step 10: Viết service**

Tạo `be/apps/voucher-service/src/ket-chuyen/ket-chuyen.service.ts`:

```typescript
import { TenantContextService } from '@app/core';
import { ChungTu, type DanhMucTaiKhoan } from '@app/entities';
import { ServiceClient } from '@app/service-client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NhatKyChungService } from '../nhat-ky-chung/nhat-ky-chung.service';
import { VoucherNumberService } from '../shared';
import { CreateKetChuyenDto } from './dto';
import {
  chayKetChuyen,
  dungBangSoDu,
  type DongDanhMucKetChuyen,
  type DongHachToan,
} from './ket-chuyen.engine';
import { gomLoKetChuyen, type LoKetChuyen } from './ket-chuyen.helper';

/** Tiền tố số chứng từ kết chuyển — Nghiệp vụ khác (NVK). */
const MA_LOAI_CHUNG_TU = 'NVK';

export interface CanhBaoKetChuyen {
  ma: string;
  ten: string;
  soTien: number;
  ben: 'NO' | 'CO';
}

export interface KetQuaPreview {
  dong: DongHachToan[];
  canhBao: CanhBaoKetChuyen[];
  tongTien: number;
  laiLo: number;
}

@Injectable()
export class KetChuyenService {
  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: Repository<ChungTu>,
    private readonly nhatKyChungService: NhatKyChungService,
    private readonly voucherNumberService: VoucherNumberService,
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get tenantId() {
    return this.tenantContext.getCurrentTenantId();
  }

  async preview(denNgay: string, authToken?: string): Promise<KetQuaPreview> {
    const ngayKetThuc = new Date(denNgay);
    const dauNam = new Date(ngayKetThuc.getFullYear(), 0, 1);

    const [danhMucRes, taiKhoanRes, soDuDauKyRes, phatSinhRes] = await Promise.all([
      this.serviceClient.getTaiKhoanKetChuyen(authToken, this.tenantId),
      this.serviceClient.getTaiKhoan(authToken, this.tenantId),
      this.serviceClient.getSoDuDauKy(authToken, this.tenantId),
      this.nhatKyChungService.aggregateBalance(dauNam, ngayKetThuc, this.tenantId),
    ]);

    const danhMuc: DongDanhMucKetChuyen[] = (danhMucRes.success ? danhMucRes.data || [] : [])
      .filter((d) => d.isActive !== false && d.loai === 'XAC_DINH_KQKD')
      .map((d) => ({
        ma: d.ma,
        thuTu: Number(d.thuTu) || 0,
        taiKhoanTu: d.taiKhoanTu,
        taiKhoanDen: d.taiKhoanDen,
        ben: d.ben,
        dienGiai: d.dienGiai,
      }));

    const taiKhoan = taiKhoanRes.success ? taiKhoanRes.data || [] : [];
    const tenTheoMa = new Map(taiKhoan.map((t) => [t.ma, t.ten]));

    // Số dư đầu kỳ nhập tay chỉ tính khi ngày áp dụng rơi vào chính kỳ kết chuyển này;
    // ngày áp dụng thuộc năm cũ nghĩa là phần đó đã được kết chuyển ở năm trước.
    const ngayApDung = soDuDauKyRes.success ? soDuDauKyRes.data?.ngayApDung : null;
    const apDungSoDuDauKy =
      !!ngayApDung &&
      new Date(ngayApDung) >= dauNam &&
      new Date(ngayApDung) <= ngayKetThuc;

    const phatSinh = (phatSinhRes.success ? phatSinhRes.data || [] : []).map((p) => ({
      ma: p.ma,
      periodNo: p.periodNo,
      periodCo: p.periodCo,
    }));

    const bangSoDu = dungBangSoDu(
      phatSinh,
      soDuDauKyRes.success ? soDuDauKyRes.data?.items || [] : [],
      apDungSoDuDauKy,
    );

    const ketQua = chayKetChuyen(danhMuc, bangSoDu);

    return {
      dong: ketQua.dong,
      canhBao: ketQua.canhBao.map((c) => ({
        ...c,
        ten: tenTheoMa.get(c.ma) ?? '',
      })),
      tongTien: ketQua.dong.reduce((t, d) => t + d.soTien, 0),
      laiLo: ketQua.laiLo,
    };
  }

  async create(
    dto: CreateKetChuyenDto,
    nguoiTaoId: string,
    authToken?: string,
  ): Promise<{ soPhieu: string; soDong: number }> {
    const soPhieu = await this.voucherNumberService.generateVoucherNumber('KHAC', {
      maLoaiChungTu: MA_LOAI_CHUNG_TU,
      date: new Date(dto.ngayChungTu),
    });

    const taiKhoanRes = await this.serviceClient.getTaiKhoan(authToken, this.tenantId);
    const taiKhoanTheoMa = new Map(
      (taiKhoanRes.success ? taiKhoanRes.data || [] : []).map((t) => [t.ma, t]),
    );

    const snapshot = (ma: string): DanhMucTaiKhoan => {
      const tk = taiKhoanTheoMa.get(ma);
      return {
        ma,
        ten: tk?.ten ?? '',
        loai: tk?.loai ?? '',
        nhom: tk?.nhom ?? '',
      };
    };

    const rows = dto.dong.map((d) =>
      this.chungTuRepository.create({
        loai: 'KHAC' as const,
        soPhieu,
        ngay: new Date(dto.ngayHachToan),
        ngayGhiSo: new Date(dto.ngayChungTu),
        soTien: d.soTien,
        noiDung: d.dienGiai || dto.dienGiai,
        ghiChu: dto.dienGiai,
        danhMuc: {
          taiKhoanNo: snapshot(d.taiKhoanNo),
          taiKhoanCo: snapshot(d.taiKhoanCo),
        },
        nguon: 'KET_CHUYEN' as const,
        maKetChuyen: d.maKetChuyen,
        nguoiTaoId,
      }),
    );

    await this.chungTuRepository.save(rows);

    return { soPhieu, soDong: rows.length };
  }

  async list(): Promise<LoKetChuyen[]> {
    const rows = await this.chungTuRepository.find({
      where: { nguon: 'KET_CHUYEN' } as any,
    });
    return gomLoKetChuyen(rows);
  }

  async remove(soPhieu: string): Promise<{ deleted: number }> {
    // Điều kiện `nguon` để không lỡ tay xóa chứng từ nhập tay trùng số phiếu.
    const kq = await this.chungTuRepository.delete({
      soPhieu,
      nguon: 'KET_CHUYEN',
    } as any);

    if (!kq.affected) {
      throw new NotFoundException(`Không tìm thấy chứng từ kết chuyển ${soPhieu}`);
    }
    return { deleted: kq.affected };
  }
}
```

- [ ] **Step 11: Chạy test để chắc chắn nó xanh**

Run: `cd be && npx jest apps/voucher-service/src/ket-chuyen --runInBand`
Expected: PASS — engine 11 + helper 5 + service 9 test.

- [ ] **Step 12: Viết controller + module + đăng ký**

`ket-chuyen.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtGuard,
  RoleGuard,
  Roles,
  type UserPayload,
} from '@app/auth';
import { CreateKetChuyenDto, PreviewKetChuyenDto } from './dto';
import { KetChuyenService } from './ket-chuyen.service';

@Controller('ket-chuyen')
@UseGuards(JwtGuard, RoleGuard)
export class KetChuyenController {
  constructor(private readonly ketChuyenService: KetChuyenService) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async list() {
    const data = await this.ketChuyenService.list();
    return { success: true, data };
  }

  @Post('preview')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async preview(
    @Body() dto: PreviewKetChuyenDto,
    @Headers('authorization') authToken?: string,
  ) {
    const data = await this.ketChuyenService.preview(dto.denNgay, authToken);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async create(
    @Body() dto: CreateKetChuyenDto,
    @CurrentUser() user: UserPayload,
    @Headers('authorization') authToken?: string,
  ) {
    const data = await this.ketChuyenService.create(dto, user.userId, authToken);
    return { success: true, data };
  }

  @Delete(':soPhieu')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async remove(@Param('soPhieu') soPhieu: string) {
    const data = await this.ketChuyenService.remove(soPhieu);
    return { success: true, data };
  }
}
```

> Kiểm tên trường id trong `UserPayload` trước khi dùng: `grep -n "interface UserPayload" -A 10 be/libs/auth/src/**/*.ts`. Nếu là `sub` hay `id` thì dùng đúng tên đó thay cho `user.userId`.

`ket-chuyen.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChungTu, VoucherSequence } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { NhatKyChungModule } from '../nhat-ky-chung/nhat-ky-chung.module';
import { VoucherNumberService } from '../shared';
import { KetChuyenController } from './ket-chuyen.controller';
import { KetChuyenService } from './ket-chuyen.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule.forFeature([ChungTu, VoucherSequence]),
    TenantModule,
    NhatKyChungModule,
  ],
  controllers: [KetChuyenController],
  providers: [KetChuyenService, VoucherNumberService],
  exports: [KetChuyenService],
})
export class KetChuyenModule {}
```

Trong `be/apps/voucher-service/src/voucher-service.module.ts`: thêm `import { KetChuyenModule } from './ket-chuyen/ket-chuyen.module';` và `KetChuyenModule` vào mảng `imports`.

- [ ] **Step 13: Nâng giới hạn body**

Mở `be/apps/voucher-service/src/main.ts`. Nếu **chưa** có `bodyParser`/`json({ limit })`, thêm ngay sau khi tạo app:

```typescript
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
```

kèm `import { json, urlencoded } from 'express';`. Nếu đã có và limit ≥ 1mb thì để nguyên.

- [ ] **Step 14: Chạy lại toàn bộ test của module**

Run: `cd be && npx jest apps/voucher-service/src/ket-chuyen --runInBand`
Expected: PASS

Run: `cd be && npx jest apps/voucher-service/src/nhat-ky-chung --runInBand`
Expected: cùng kết quả với trước khi sửa (entity thêm field không được làm hỏng suite này).

- [ ] **Step 15: Commit**

```bash
git add be/libs/entities/src/voucher/chung-tu.entity.ts be/libs/service-client/src be/apps/voucher-service/src/ket-chuyen be/apps/voucher-service/src/voucher-service.module.ts be/apps/voucher-service/src/main.ts
git commit -m "feat(ket-chuyen): API preview/lập/xóa chứng từ kết chuyển lãi lỗ"
```

---

### Task 5: BE — Bảng cân đối kế toán cân khi lỗ

**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts` (hàm `calculateAccountBalance` ~dòng 923, và 2 lời gọi trong `getBalanceSheet` ~dòng 596, 626)
- Test: `be/apps/reporting-service/src/bao-cao/bao-cao.balance-sheet.spec.ts`

**Interfaces:**
- Consumes: `ChungTu` sinh từ Task 4 (bút toán `Nợ 4212 / Có 911` khi lỗ).
- Produces: `calculateAccountBalance(vouchers, maTaiKhoan, type, openingNet?, choPhepAm?)` — tham số thứ 5 mặc định `false` giữ nguyên hành vi cũ cho mọi lời gọi khác.

- [ ] **Step 1: Viết test thất bại**

Tạo `be/apps/reporting-service/src/bao-cao/bao-cao.balance-sheet.spec.ts`:

```typescript
import { BaoCaoService } from './bao-cao.service';

/**
 * Kết chuyển lỗ ghi Nợ 4212 / Có 911 → 4212 dư Nợ → số dư âm. Clamp về 0 sẽ làm
 * nguồn vốn thiếu đúng phần lỗ và Bảng cân đối kế toán không cân.
 */
describe('calculateAccountBalance — cho phép số âm ở nhóm nguồn vốn', () => {
  const goi = (service: any, args: any[]) =>
    (service as any).calculateAccountBalance(...args);

  const service = Object.create(BaoCaoService.prototype);

  const vouchers = [
    {
      soTien: 70,
      danhMuc: { taiKhoanNo: { ma: '4212' }, taiKhoanCo: { ma: '911' } },
    },
  ];

  it('mặc định vẫn clamp về 0 để không đụng các báo cáo đang chạy', () => {
    expect(goi(service, [vouchers, '4212', 'CO', 0])).toBe(0);
  });

  it('trả về số âm khi bật choPhepAm', () => {
    expect(goi(service, [vouchers, '4212', 'CO', 0, true])).toBe(-70);
  });

  it('lãi vẫn ra số dương khi bật choPhepAm', () => {
    const lai = [
      {
        soTien: 70,
        danhMuc: { taiKhoanNo: { ma: '911' }, taiKhoanCo: { ma: '4212' } },
      },
    ];
    expect(goi(service, [lai, '4212', 'CO', 0, true])).toBe(70);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd be && npx jest apps/reporting-service/src/bao-cao/bao-cao.balance-sheet.spec.ts --runInBand`
Expected: FAIL — test thứ 2 nhận `0` thay vì `-70`.

- [ ] **Step 3: Sửa hàm**

Trong `bao-cao.service.ts`, đổi chữ ký và dòng return của `calculateAccountBalance`:

```typescript
  private calculateAccountBalance(
    vouchers: NhatKyChungEntry[],
    maTaiKhoan: string,
    type: 'NO' | 'CO',
    openingNet = 0,
    /**
     * Bảng cân đối kế toán cần số âm ở nhóm nguồn vốn: kết chuyển LỖ làm 4212 dư Nợ,
     * clamp về 0 sẽ khiến tổng nguồn vốn thiếu đúng phần lỗ. Các báo cáo khác giữ
     * hành vi cũ (mặc định false) để không đổi số đang chạy.
     */
    choPhepAm = false,
  ): number {
```

```typescript
    return choPhepAm ? balance : Math.max(0, balance);
```

Trong `getBalanceSheet`, ở vòng lặp **nguồn vốn** (`for (const account of liabilityAccounts)`), truyền thêm tham số cho các tài khoản nhóm 4:

```typescript
      const amount = this.calculateAccountBalance(
        vouchers,
        account.ma,
        'CO',
        openingNetForSide(openingMap.get(account.ma), 'CO'),
        account.ma.startsWith('4'),
      );
```

Giữ nguyên vòng lặp tài sản.

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd be && npx jest apps/reporting-service/src/bao-cao --runInBand`
Expected: PASS — spec mới xanh, các spec `bao-cao.helper.spec.ts` / `doanh-thu.helper.spec.ts` giữ nguyên kết quả cũ.

- [ ] **Step 5: Commit**

```bash
git add be/apps/reporting-service/src/bao-cao
git commit -m "fix(bao-cao): BCĐKT cân khi lỗ — nguồn vốn cho phép số âm"
```

---

### Task 6: FE — Trang danh mục Tài khoản kết chuyển

**Files:**
- Create: `fe/src/services/taiKhoanKetChuyenService.ts`
- Create: `fe/src/pages/danh-muc/tai-khoan-ket-chuyen/ketChuyenLabels.ts`
- Create: `fe/src/pages/danh-muc/tai-khoan-ket-chuyen/ketChuyenLabels.test.ts`
- Create: `fe/src/pages/danh-muc/tai-khoan-ket-chuyen/TaiKhoanKetChuyenPage.tsx`
- Create: `fe/src/components/import-danh-muc/configs/taiKhoanKetChuyen.config.ts`
- Modify: `fe/src/components/import-danh-muc/configs/index.ts`
- Modify: `fe/src/pages/loadable.tsx`
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/config/routePermissions.ts`
- Modify: `fe/src/config/menuCatalog.ts`
- Modify: `fe/src/config/danhMucCatalog.ts`
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `GET/POST/PUT/DELETE /master-data/tai-khoan-ket-chuyen` (Task 1), `POST /master-data/import/tai-khoan-ket-chuyen` (Task 2), `taiKhoanService.getPaginated` (đã có).
- Produces:
  - `taiKhoanKetChuyenService` với `getPaginated`, `getAll`, `create`, `update`, `remove`, `deleteBatch`, `checkMaExists`.
  - `interface TaiKhoanKetChuyen { id, thuTu, ma, taiKhoanTu, tenTaiKhoanTu?, taiKhoanDen, tenTaiKhoanDen?, ben, loai, dienGiai?, isActive }`.
  - `goiYMaKetChuyen(tu, den)`, `NHAN_BEN`, `NHAN_LOAI` — dùng lại ở Task 7.
  - Route `/danh-muc/tai-khoan-ket-chuyen`.

- [ ] **Step 1: Viết test thất bại cho helper nhãn**

Tạo `fe/src/pages/danh-muc/tai-khoan-ket-chuyen/ketChuyenLabels.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { goiYMaKetChuyen, NHAN_BEN, NHAN_LOAI } from './ketChuyenLabels';

describe('goiYMaKetChuyen', () => {
  it('ghép mã theo dạng {từ}-{đến}', () => {
    expect(goiYMaKetChuyen('511', '911')).toBe('511-911');
  });

  it('trả chuỗi rỗng khi thiếu một trong hai tài khoản', () => {
    expect(goiYMaKetChuyen('511', '')).toBe('');
    expect(goiYMaKetChuyen('', '911')).toBe('');
    expect(goiYMaKetChuyen(undefined, undefined)).toBe('');
  });

  it('bỏ khoảng trắng thừa', () => {
    expect(goiYMaKetChuyen(' 511 ', ' 911 ')).toBe('511-911');
  });
});

describe('nhãn hiển thị', () => {
  it('đúng nhãn tiếng Việt cho bên kết chuyển', () => {
    expect(NHAN_BEN.NO).toBe('Nợ');
    expect(NHAN_BEN.CO).toBe('Có');
    expect(NHAN_BEN.HAI_BEN).toBe('Hai bên');
  });

  it('đúng nhãn cho loại kết chuyển', () => {
    expect(NHAN_LOAI.XAC_DINH_KQKD).toBe('Kết chuyển xác định kết quả kinh doanh');
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd fe && npx vitest run src/pages/danh-muc/tai-khoan-ket-chuyen`
Expected: FAIL — không tìm thấy `./ketChuyenLabels`.

- [ ] **Step 3: Viết helper**

Tạo `fe/src/pages/danh-muc/tai-khoan-ket-chuyen/ketChuyenLabels.ts`:

```typescript
export type BenKetChuyen = 'NO' | 'CO' | 'HAI_BEN';
export type LoaiKetChuyen = 'XAC_DINH_KQKD';

/** Nhãn cột "Bên kết chuyển" — bên số dư của TK nguồn được đem đi kết chuyển. */
export const NHAN_BEN: Record<BenKetChuyen, string> = {
  NO: 'Nợ',
  CO: 'Có',
  HAI_BEN: 'Hai bên',
};

export const NHAN_LOAI: Record<LoaiKetChuyen, string> = {
  XAC_DINH_KQKD: 'Kết chuyển xác định kết quả kinh doanh',
};

/** Mã kết chuyển gợi ý khi người dùng chọn xong cặp tài khoản. */
export function goiYMaKetChuyen(tu?: string, den?: string): string {
  const a = (tu ?? '').trim();
  const b = (den ?? '').trim();
  if (!a || !b) return '';
  return `${a}-${b}`;
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd fe && npx vitest run src/pages/danh-muc/tai-khoan-ket-chuyen`
Expected: PASS — 5 test.

- [ ] **Step 5: Viết service**

Tạo `fe/src/services/taiKhoanKetChuyenService.ts` (khuôn `nhomDongTienService.ts`):

```typescript
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

export type BenKetChuyen = 'NO' | 'CO' | 'HAI_BEN';
export type LoaiKetChuyen = 'XAC_DINH_KQKD';

export interface TaiKhoanKetChuyen {
  id: string;
  thuTu: number;
  ma: string;
  taiKhoanTu: string;
  tenTaiKhoanTu?: string;
  taiKhoanDen: string;
  tenTaiKhoanDen?: string;
  ben: BenKetChuyen;
  loai: LoaiKetChuyen;
  dienGiai?: string;
  isActive: boolean;
}

interface TaiKhoanKetChuyenResponse extends Omit<TaiKhoanKetChuyen, 'id'> {
  _id?: string;
  id?: string;
}

class TaiKhoanKetChuyenService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/tai-khoan-ket-chuyen' });
  }

  private map(item: TaiKhoanKetChuyenResponse): TaiKhoanKetChuyen {
    return { ...item, id: item._id || item.id || '' } as TaiKhoanKetChuyen;
  }

  async getPaginated(
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<TaiKhoanKetChuyen>> {
    const response = await this.get<{
      data: TaiKhoanKetChuyenResponse[];
      meta: PaginatedResponse<TaiKhoanKetChuyen>['meta'];
    }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.map(item)),
      meta: response.meta,
    };
  }

  async getAll(): Promise<TaiKhoanKetChuyen[]> {
    const data = await this.get<TaiKhoanKetChuyenResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.map(item));
  }

  async create(
    data: Omit<TaiKhoanKetChuyen, 'id' | 'isActive'>,
  ): Promise<TaiKhoanKetChuyen> {
    return this.map(await this.post<TaiKhoanKetChuyenResponse>(data));
  }

  async update(
    id: string,
    data: Partial<TaiKhoanKetChuyen>,
  ): Promise<TaiKhoanKetChuyen> {
    return this.map(
      await this.put<TaiKhoanKetChuyenResponse>(data, { endpoint: `/${id}` }),
    );
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: excludeId ? { ma, excludeId } : { ma },
    });
    return result.exists;
  }
}

export const taiKhoanKetChuyenService = new TaiKhoanKetChuyenService();
```

> `deleteBatch` do `ServiceBase` cung cấp sẵn (xem `nhomDongTienService` được dùng với `deleteBatch` trong `NhomDongTienPage`). Nếu `ServiceBase` không có, copy y hệt method `deleteBatch` từ một service danh mục khác — kiểm bằng `grep -n "deleteBatch" fe/src/services/base/service-base.ts`.

- [ ] **Step 6: Viết config import Excel**

Tạo `fe/src/components/import-danh-muc/configs/taiKhoanKetChuyen.config.ts`:

```typescript
import { taiKhoanKetChuyenService } from "@/services/taiKhoanKetChuyenService";
import type { ImportDanhMucConfig } from "../types";

export const taiKhoanKetChuyenImportConfig: ImportDanhMucConfig = {
  title: "Tài khoản kết chuyển",
  resource: "tai-khoan-ket-chuyen",
  service: taiKhoanKetChuyenService,
  uniqueBy: ["ma"],
  columns: [
    { key: "thuTu", header: "Thứ tự kết chuyển", required: true, example: "10" },
    { key: "ma", header: "Mã kết chuyển", required: true, example: "511-911" },
    { key: "taiKhoanTu", header: "Kết chuyển từ", required: true, example: "511" },
    { key: "taiKhoanDen", header: "Kết chuyển đến", required: true, example: "911" },
    { key: "ben", header: "Bên kết chuyển (NO/CO/HAI_BEN)", required: true, example: "CO" },
    { key: "dienGiai", header: "Diễn giải", example: "Kết chuyển doanh thu bán hàng và cung cấp dịch vụ" },
  ],
};
```

Trong `fe/src/components/import-danh-muc/configs/index.ts`, thêm:

```typescript
export { taiKhoanKetChuyenImportConfig } from "./taiKhoanKetChuyen.config";
```

- [ ] **Step 7: Viết trang danh mục**

Tạo `fe/src/pages/danh-muc/tai-khoan-ket-chuyen/TaiKhoanKetChuyenPage.tsx` theo **nguyên khuôn** `fe/src/pages/danh-muc/nhom-dong-tien/NhomDongTienPage.tsx` (copy file đó rồi sửa), với các khác biệt sau:

1. Import và dùng `taiKhoanKetChuyenService`, `taiKhoanKetChuyenImportConfig`, `usePagePermission("/danh-muc/tai-khoan-ket-chuyen")`, `useTableTitleConfig('danhMuc.taiKhoanKetChuyen', columns)`, `useFieldLabels('danhMuc.taiKhoanKetChuyen')`.
2. Zod schema:

```typescript
const taiKhoanKetChuyenSchema = z.object({
  thuTu: z.coerce.number().int().min(0, "Thứ tự phải là số không âm"),
  ma: z.string().trim().min(1, "Mã kết chuyển không được để trống").max(50),
  taiKhoanTu: z.string().trim().min(1, "Chọn tài khoản kết chuyển từ"),
  tenTaiKhoanTu: z.string().optional().nullable(),
  taiKhoanDen: z.string().trim().min(1, "Chọn tài khoản kết chuyển đến"),
  tenTaiKhoanDen: z.string().optional().nullable(),
  ben: z.enum(["NO", "CO", "HAI_BEN"]),
  dienGiai: z.string().max(500).optional().nullable(),
}).refine((v) => v.taiKhoanTu !== v.taiKhoanDen, {
  message: "Kết chuyển từ và Kết chuyển đến không được trùng nhau",
  path: ["taiKhoanDen"],
});
```

3. Cột bảng (đúng thứ tự ảnh tham chiếu):

```typescript
  const columns = [
    { title: "Thứ tự kết chuyển", dataIndex: "thuTu", key: "thuTu", width: 140 },
    {
      title: "Mã kết chuyển",
      dataIndex: "ma",
      key: "ma",
      width: 140,
      render: (text: string) => <Text strong className="text-primary">{text}</Text>,
    },
    { title: "Kết chuyển từ", dataIndex: "taiKhoanTu", key: "taiKhoanTu", width: 130 },
    { title: "Kết chuyển đến", dataIndex: "taiKhoanDen", key: "taiKhoanDen", width: 140 },
    {
      title: "Bên kết chuyển",
      dataIndex: "ben",
      key: "ben",
      width: 130,
      render: (ben: BenKetChuyen) => NHAN_BEN[ben] ?? ben,
    },
    {
      title: "Loại kết chuyển",
      dataIndex: "loai",
      key: "loai",
      width: 240,
      render: (loai: LoaiKetChuyen) => NHAN_LOAI[loai] ?? loai,
    },
    { title: "Diễn giải", dataIndex: "dienGiai", key: "dienGiai", ellipsis: true },
    // ... cột "Thao tác" giữ nguyên như NhomDongTienPage
  ];
```

4. Trong Modal Thêm/Sửa: `thuTu` dùng `<InputNumber min={0} className="w-full" />`; `taiKhoanTu` và `taiKhoanDen` dùng `<Select showSearch optionFilterProp="label" options={taiKhoanOptions} />` với options nạp một lần trong `useEffect`:

```typescript
  const [taiKhoanOptions, setTaiKhoanOptions] = useState<{ value: string; label: string; ten: string }[]>([]);

  useEffect(() => {
    taiKhoanService
      .getPaginated({ limit: 10000 })
      .then((res) =>
        setTaiKhoanOptions(
          res.data.map((tk) => ({ value: tk.ma, label: `${tk.ma} - ${tk.ten}`, ten: tk.ten })),
        ),
      )
      .catch(() => message.error("Không tải được danh mục tài khoản"));
  }, []);
```

`ben` dùng `<Select options={[{value:'NO',label:'Nợ'},{value:'CO',label:'Có'},{value:'HAI_BEN',label:'Hai bên'}]} />`.

5. Khi cả hai tài khoản đã chọn mà ô `ma` còn trống thì tự điền mã gợi ý — gắn `onValuesChange` lên `<Form>`:

```typescript
  const handleValuesChange = (changed: any, all: any) => {
    if (!("taiKhoanTu" in changed) && !("taiKhoanDen" in changed)) return;
    if (form.getFieldValue("ma")) return;
    const goiY = goiYMaKetChuyen(all.taiKhoanTu, all.taiKhoanDen);
    if (goiY) form.setFieldsValue({ ma: goiY });
  };
```

6. Khi submit, snapshot tên tài khoản trước khi gọi API:

```typescript
      const tenTu = taiKhoanOptions.find((o) => o.value === validated.taiKhoanTu)?.ten ?? "";
      const tenDen = taiKhoanOptions.find((o) => o.value === validated.taiKhoanDen)?.ten ?? "";
      const payload = { ...validated, tenTaiKhoanTu: tenTu, tenTaiKhoanDen: tenDen, loai: "XAC_DINH_KQKD" as const };
```

7. Ô tìm kiếm đổi placeholder thành `"Tìm theo mã kết chuyển..."`; nút thêm ghi `"Thêm"`; tiêu đề export `"DANH MỤC TÀI KHOẢN KẾT CHUYỂN"`, `fileName: "danh-muc-tai-khoan-ket-chuyen"`, cột export khớp 7 cột bảng.

- [ ] **Step 8: Nối dây FE**

`fe/src/pages/loadable.tsx` — thêm cạnh `NhomDongTienPage`:

```typescript
export const TaiKhoanKetChuyenPage = loadable(() => import('./danh-muc/tai-khoan-ket-chuyen/TaiKhoanKetChuyenPage'), {
  fallback: <PageLoader />
});
```

`fe/src/App.tsx` — thêm `TaiKhoanKetChuyenPage` vào import từ `./pages/loadable`, và thêm route trong khối `<Route path="danh-muc">`, cạnh route `nhom-dong-tien`:

```tsx
                  <Route path="tai-khoan-ket-chuyen" element={
                    <ProtectedRoute requiredPermission="/danh-muc/tai-khoan-ket-chuyen:xem">
                      <TaiKhoanKetChuyenPage />
                    </ProtectedRoute>
                  } />
```

`fe/src/config/routePermissions.ts`:

```typescript
  '/danh-muc/tai-khoan-ket-chuyen': '/danh-muc/tai-khoan-ket-chuyen:xem',
```

`fe/src/config/menuCatalog.ts`:

```typescript
  { key: '/danh-muc/tai-khoan-ket-chuyen', label: 'Tài khoản kết chuyển', parentLabel: 'Danh mục › Khác' },
```

`fe/src/config/danhMucCatalog.ts` — thêm vào nhóm `'Chứng từ'`:

```typescript
      { label: 'Tài khoản kết chuyển', path: '/danh-muc/tai-khoan-ket-chuyen' },
```

`fe/src/components/layout/MainLayout.tsx` — thêm vào `existingRoutes`, cạnh `"/danh-muc/nhom-dong-tien"`:

```typescript
  "/danh-muc/tai-khoan-ket-chuyen",
```

- [ ] **Step 9: Kiểm tra build**

Run: `cd fe && npx vitest run src/pages/danh-muc/tai-khoan-ket-chuyen`
Expected: PASS

Run: `cd fe && npx tsc --noEmit 2>&1 | grep -i "tai-khoan-ket-chuyen"`
Expected: không có dòng nào.

Run: `cd fe && npm run build`
Expected: build thành công.

- [ ] **Step 10: Commit**

```bash
git add fe/src/services/taiKhoanKetChuyenService.ts fe/src/pages/danh-muc/tai-khoan-ket-chuyen fe/src/components/import-danh-muc/configs fe/src/pages/loadable.tsx fe/src/App.tsx fe/src/config fe/src/components/layout/MainLayout.tsx
git commit -m "feat(danh-muc): trang Tài khoản kết chuyển (FE)"
```

---

### Task 7: FE — Trang Kết chuyển lãi lỗ

**Files:**
- Create: `fe/src/services/ketChuyenService.ts`
- Create: `fe/src/pages/chung-tu/ket-chuyen-lai-lo/ketChuyenTinhToan.ts`
- Create: `fe/src/pages/chung-tu/ket-chuyen-lai-lo/ketChuyenTinhToan.test.ts`
- Create: `fe/src/pages/chung-tu/ket-chuyen-lai-lo/KetChuyenLaiLoListPage.tsx`
- Create: `fe/src/pages/chung-tu/ket-chuyen-lai-lo/KetChuyenLaiLoFormPage.tsx`
- Modify: `fe/src/config/sectionNavs.tsx`
- Modify: `fe/src/pages/loadable.tsx`
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/config/routePermissions.ts`
- Modify: `fe/src/config/menuCatalog.ts`
- Modify: `fe/src/components/layout/MainLayout.tsx`

**Interfaces:**
- Consumes: `POST /voucher/ket-chuyen/preview`, `POST /voucher/ket-chuyen`, `GET /voucher/ket-chuyen`, `DELETE /voucher/ket-chuyen/:soPhieu` (Task 4); `NHAN_BEN` từ `ketChuyenLabels.ts` (Task 6); `SectionNav` + `CHUNG_TU_NAV` (đã có).
- Produces: route `/chung-tu/ket-chuyen-lai-lo` (danh sách) và `/chung-tu/ket-chuyen-lai-lo/tao-moi` (form).

- [ ] **Step 1: Viết test thất bại cho helper**

Tạo `fe/src/pages/chung-tu/ket-chuyen-lai-lo/ketChuyenTinhToan.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  dienGiaiMacDinh,
  moTaCanhBao,
  tongSoTien,
} from './ketChuyenTinhToan';

describe('tongSoTien', () => {
  it('cộng dồn số tiền các dòng hạch toán', () => {
    expect(
      tongSoTien([
        { maKetChuyen: '511-911', dienGiai: '', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
        { maKetChuyen: '911-4212', dienGiai: '', taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 70 },
      ]),
    ).toBe(170);
  });

  it('trả 0 khi không có dòng nào', () => {
    expect(tongSoTien([])).toBe(0);
  });
});

describe('dienGiaiMacDinh', () => {
  it('sinh diễn giải theo ngày kết chuyển dạng dd/mm/yyyy', () => {
    expect(dienGiaiMacDinh('2026-08-31')).toBe('Kết chuyển lãi lỗ đến ngày 31/08/2026');
  });
});

describe('moTaCanhBao', () => {
  it('nêu rõ tài khoản, số tiền và lý do', () => {
    expect(
      moTaCanhBao({ ma: '642', ten: 'Chi phí quản lý doanh nghiệp', soTien: 12000000, ben: 'NO' }),
    ).toBe(
      'TK 642 — Chi phí quản lý doanh nghiệp còn dư Nợ 12.000.000 chưa được kết chuyển (chưa khai trong danh mục)',
    );
  });

  it('hiển thị đúng bên Có', () => {
    expect(moTaCanhBao({ ma: '511', ten: 'Doanh thu', soTien: 500, ben: 'CO' })).toContain('dư Có 500');
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd fe && npx vitest run src/pages/chung-tu/ket-chuyen-lai-lo`
Expected: FAIL — không tìm thấy `./ketChuyenTinhToan`.

- [ ] **Step 3: Viết helper**

Tạo `fe/src/pages/chung-tu/ket-chuyen-lai-lo/ketChuyenTinhToan.ts`:

```typescript
import dayjs from 'dayjs';

export interface DongHachToan {
  maKetChuyen: string;
  dienGiai: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
}

export interface CanhBaoKetChuyen {
  ma: string;
  ten: string;
  soTien: number;
  ben: 'NO' | 'CO';
}

export const dinhDangTien = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

export function tongSoTien(dong: DongHachToan[]): number {
  return dong.reduce((t, d) => t + (Number(d.soTien) || 0), 0);
}

export function dienGiaiMacDinh(denNgay: string): string {
  return `Kết chuyển lãi lỗ đến ngày ${dayjs(denNgay).format('DD/MM/YYYY')}`;
}

export function moTaCanhBao(c: CanhBaoKetChuyen): string {
  const ben = c.ben === 'NO' ? 'Nợ' : 'Có';
  return `TK ${c.ma} — ${c.ten} còn dư ${ben} ${dinhDangTien(c.soTien)} chưa được kết chuyển (chưa khai trong danh mục)`;
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd fe && npx vitest run src/pages/chung-tu/ket-chuyen-lai-lo`
Expected: PASS — 5 test.

- [ ] **Step 5: Viết service**

Tạo `fe/src/services/ketChuyenService.ts`:

```typescript
import { ServiceBase } from './base/service-base';
import type {
  CanhBaoKetChuyen,
  DongHachToan,
} from '@/pages/chung-tu/ket-chuyen-lai-lo/ketChuyenTinhToan';

export interface KetQuaPreview {
  dong: DongHachToan[];
  canhBao: CanhBaoKetChuyen[];
  tongTien: number;
  /** Dương = lãi, âm = lỗ. */
  laiLo: number;
}

export interface LoKetChuyen {
  soPhieu: string;
  ngay: string;
  dienGiai: string;
  tongTien: number;
  soDong: number;
  laiLo: number;
  nguoiTaoId?: string;
}

export interface TaoKetChuyenPayload {
  denNgay: string;
  ngayHachToan: string;
  ngayChungTu: string;
  dienGiai: string;
  dong: DongHachToan[];
}

class KetChuyenService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ket-chuyen' });
  }

  async preview(denNgay: string): Promise<KetQuaPreview> {
    return this.post<KetQuaPreview>({ denNgay }, { endpoint: '/preview' });
  }

  async list(): Promise<LoKetChuyen[]> {
    return this.get<LoKetChuyen[]>({});
  }

  async create(payload: TaoKetChuyenPayload): Promise<{ soPhieu: string; soDong: number }> {
    return this.post<{ soPhieu: string; soDong: number }>(payload);
  }

  async remove(soPhieu: string): Promise<void> {
    return super.delete({ endpoint: `/${encodeURIComponent(soPhieu)}` });
  }
}

export const ketChuyenService = new KetChuyenService();
```

> Kiểm chữ ký `post`/`get`/`delete` của `ServiceBase` trước khi viết: `sed -n 1,120p fe/src/services/base/service-base.ts`. Nếu `post` nhận `(data, options)` như `nhomDongTienService` đang dùng thì giữ nguyên như trên.

- [ ] **Step 6: Viết màn danh sách**

Tạo `fe/src/pages/chung-tu/ket-chuyen-lai-lo/KetChuyenLaiLoListPage.tsx` — trang React thuần + antd (cùng lối viết với `SoDuDauKyPage.tsx`), gồm:

- `<SectionNav items={CHUNG_TU_NAV} />` ở đầu (import từ `@/components/layout/SectionNav` và `@/config/sectionNavs` — copy cách dùng ở `fe/src/pages/chung-tu/phieu/PhieuListPage.tsx`).
- `usePagePermission("/chung-tu/ket-chuyen-lai-lo")` lấy `canCreate`, `canDelete`.
- `useEffect` gọi `ketChuyenService.list()` đổ vào state `lo`.
- Bảng cột: `Ngày hạch toán` (`dayjs(ngay).format('DD/MM/YYYY')`) · `Số chứng từ` · `Diễn giải` · `Số dòng` · `Tổng tiền kết chuyển` (`dinhDangTien`, canh phải) · `Lãi/Lỗ` (`laiLo >= 0 ? 'Lãi ' : 'Lỗ '` + `dinhDangTien(Math.abs(laiLo))`, tô xanh khi lãi, đỏ khi lỗ) · `Thao tác` (Popconfirm "Xóa cả lô chứng từ kết chuyển này?" → `ketChuyenService.remove(soPhieu)` → `message.success('Đã xóa chứng từ kết chuyển')` → tải lại danh sách).
- Nút `Thêm` (hiện khi `canCreate`) → `navigate('/chung-tu/ket-chuyen-lai-lo/tao-moi')`.
- Trạng thái rỗng: `<Empty description="Chưa có lần kết chuyển nào" />`.

- [ ] **Step 7: Viết màn form**

Tạo `fe/src/pages/chung-tu/ket-chuyen-lai-lo/KetChuyenLaiLoFormPage.tsx`, bố cục theo ảnh tham chiếu:

- Header: nút quay lại + tiêu đề `Kết chuyển lãi lỗ`.
- Hàng trên chia 2 cột (antd `Row`/`Col`):
  - Trái: `Kết chuyển đến ngày` (`<DatePicker format="DD/MM/YYYY" />`, mặc định hôm nay) + nút **Lấy dữ liệu**; `Diễn giải` (`<Input />`, giá trị mặc định `dienGiaiMacDinh(denNgay)`, tự cập nhật khi đổi ngày **nếu** người dùng chưa sửa tay — giữ cờ `daSuaDienGiai`).
  - Phải: `Ngày hạch toán`, `Ngày chứng từ` (mặc định bằng `denNgay`), `Số chứng từ` (`<Input disabled placeholder="Tự sinh khi lưu" />`).
- Nút **Lấy dữ liệu** gọi `ketChuyenService.preview(denNgay)`; kết quả đổ vào state `dong` và `canhBao`. Lỗi API: `message.error('Không lấy được dữ liệu kết chuyển')`.
- `canhBao.length > 0` → `<Alert type="warning" showIcon message="Còn tài khoản chưa được kết chuyển" description={<ul>{canhBao.map(c => <li key={c.ma}>{moTaCanhBao(c)}</li>)}</ul>} action={<Link to="/danh-muc/tai-khoan-ket-chuyen">Mở danh mục</Link>} />`. **Không chặn lưu.**
- Bảng `Hạch toán`: cột `#` (số thứ tự) · `Diễn giải` (`<Input>` sửa được) · `TK Nợ` · `TK Có` · `Số tiền` (`<InputNumber>` sửa được, canh phải) · nút xóa dòng. Dòng tổng cuối bảng dùng `Table.Summary` hiển thị `tongSoTien(dong)`.
- Nút **Xóa hết dòng** (Popconfirm) đặt dưới bảng. **Không** có nút Thêm dòng — thêm cặp TK thì khai trong danh mục; ghi chú này để nguyên trong comment đầu file.
- Nút **Lưu**: chặn khi `dong.length === 0` (`message.warning('Chưa có dòng hạch toán nào để lưu')`); gọi `ketChuyenService.create({...})`; thành công → `message.success('Đã lập chứng từ kết chuyển ' + soPhieu)` → `navigate('/chung-tu/ket-chuyen-lai-lo')`.
- Trạng thái rỗng của bảng: `<Empty description="Không có dữ liệu" />`.

- [ ] **Step 8: Nối dây FE**

`fe/src/config/sectionNavs.tsx` — thêm mục vào `CHUNG_TU_NAV`, đặt trước mục "Phiếu kế toán":

```tsx
  {
    label: "Kết chuyển lãi lỗ",
    path: "/chung-tu/ket-chuyen-lai-lo",
    icon: <SwapOutlined />,
  },
```

(`SwapOutlined` đã được import sẵn trong file cho `KHO_NAV`; nếu chưa, thêm vào khối import `@ant-design/icons`.)

`fe/src/pages/loadable.tsx`:

```typescript
export const KetChuyenLaiLoListPage = loadable(() => import('./chung-tu/ket-chuyen-lai-lo/KetChuyenLaiLoListPage'), {
  fallback: <PageLoader />
});

export const KetChuyenLaiLoFormPage = loadable(() => import('./chung-tu/ket-chuyen-lai-lo/KetChuyenLaiLoFormPage'), {
  fallback: <PageLoader />
});
```

`fe/src/App.tsx` — thêm 2 tên vào import từ `./pages/loadable`, và 2 route trong khối `<Route path="chung-tu">`, đặt **trước** các route `ComingSoonPage`:

```tsx
                  <Route
                    path="ket-chuyen-lai-lo"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/ket-chuyen-lai-lo:xem">
                        <KetChuyenLaiLoListPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="ket-chuyen-lai-lo/tao-moi"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/ket-chuyen-lai-lo:xem">
                        <KetChuyenLaiLoFormPage />
                      </ProtectedRoute>
                    }
                  />
```

`fe/src/config/routePermissions.ts`:

```typescript
  '/chung-tu/ket-chuyen-lai-lo': '/chung-tu/ket-chuyen-lai-lo:xem',
```

`fe/src/config/menuCatalog.ts` — thêm cạnh các key `/chung-tu/...`:

```typescript
  { key: '/chung-tu/ket-chuyen-lai-lo', label: 'Kết chuyển lãi lỗ' },
```

`fe/src/components/layout/MainLayout.tsx` — thêm vào `existingRoutes`, cạnh `"/chung-tu/nhat-ky-chung"`:

```typescript
  "/chung-tu/ket-chuyen-lai-lo",
```

- [ ] **Step 9: Kiểm tra build**

Run: `cd fe && npx vitest run src/pages/chung-tu/ket-chuyen-lai-lo`
Expected: PASS

Run: `cd fe && npx tsc --noEmit 2>&1 | grep -i "ket-chuyen"`
Expected: không có dòng nào.

Run: `cd fe && npm run build`
Expected: build thành công.

- [ ] **Step 10: Commit**

```bash
git add fe/src/services/ketChuyenService.ts fe/src/pages/chung-tu/ket-chuyen-lai-lo fe/src/config fe/src/pages/loadable.tsx fe/src/App.tsx fe/src/components/layout/MainLayout.tsx
git commit -m "feat(chung-tu): trang Kết chuyển lãi lỗ (danh sách + form)"
```

---

### Task 8: Kiểm chứng toàn luồng

**Files:**
- Không tạo file mới. Chỉ chạy và ghi nhận kết quả.

**Interfaces:**
- Consumes: mọi thứ từ Task 1–7.
- Produces: kết luận đạt/không đạt cho từng mục, kèm output thật.

- [ ] **Step 1: Ghi baseline test trước khi so sánh**

Run: `cd be && git stash list >/dev/null; npx jest apps/master-data-service apps/voucher-service apps/reporting-service --runInBand 2>&1 | tail -30`
Ghi lại số suite pass/fail. So với memory `baseline-test-do-san` (13 suite đỏ sẵn toàn repo). Chỉ cần **không có suite nào mới đỏ vì thay đổi của plan này**.

- [ ] **Step 2: Chạy test của toàn bộ code mới**

Run:
```bash
cd be && npx jest \
  apps/master-data-service/src/tai-khoan-ket-chuyen \
  apps/master-data-service/src/import-danh-muc \
  apps/voucher-service/src/ket-chuyen \
  apps/reporting-service/src/bao-cao \
  --runInBand
```
Expected: PASS toàn bộ.

Run: `cd fe && npx vitest run src/pages/danh-muc/tai-khoan-ket-chuyen src/pages/chung-tu/ket-chuyen-lai-lo`
Expected: PASS — 10 test.

- [ ] **Step 3: Chạy thử thủ công trên máy**

```bash
cd be && yarn start:master-data:dev &
cd be && yarn start:voucher:dev &
cd be && yarn start:reporting:dev &
cd be && yarn start:gateway:dev &
cd fe && npm run dev
```

Kịch bản kiểm tra, làm đúng thứ tự:
1. Vào `/danh-muc/tai-khoan-ket-chuyen` → Thêm 3 dòng: `511-911` (từ 511 đến 911, bên Có, thứ tự 10), `642-911` (từ 642 đến 911, bên Nợ, thứ tự 20), `911-421` (từ 911 đến 421, Hai bên, thứ tự 99).
2. Vào `/chung-tu/ket-chuyen-lai-lo` → Thêm → chọn ngày cuối tháng → **Lấy dữ liệu**. Kỳ vọng: bảng hiện các dòng, dòng cuối là bút toán chốt về 421.
3. Lưu → quay về danh sách, thấy lô mới với số `NVK…`, cột Lãi/Lỗ có số.
4. Mở `/chung-tu/nhat-ky-chung`, lọc theo số phiếu vừa sinh → thấy đủ số dòng.
5. Mở `/bao-cao/tai-chinh` (Bảng cân đối kế toán) đến cùng ngày → **tổng tài sản = tổng nguồn vốn**.
6. Mở `/bao-cao/pnl` → **ghi nhận** doanh thu/chi phí về 0. Đây là hành vi đã biết và đã được người dùng chấp nhận hoãn (mục 8 của spec), không phải lỗi mới.
7. Quay lại danh sách kết chuyển → Xóa lô → kiểm `/chung-tu/nhat-ky-chung` không còn dòng nào của số phiếu đó, và BCĐKT lệch trở lại như trước.
8. Bấm **Lấy dữ liệu** lần 2 ngay sau khi đã lưu lô (chưa xóa) → kỳ vọng bảng trống hoặc chỉ còn phần chênh, KHÔNG lặp lại số cũ.
9. Thử trường hợp lỗ: thêm một chứng từ chi phí lớn hơn doanh thu rồi kết chuyển → bút toán chốt đảo chiều (Nợ 421 / Có 911), BCĐKT vẫn cân.

- [ ] **Step 4: Ghi kết quả**

Viết lại kết quả từng mục ở Step 3 (đạt / không đạt + output thật). Mục nào không đạt thì dừng, mở lại task tương ứng, không đi tiếp.

- [ ] **Step 5: Ghi chú sau deploy**

Sau khi deploy (skill `db-deploy`), phải **cấp quyền** hai key mới cho vai trò Admin của từng công ty, nếu không menu và trang sẽ ẩn:
- `/danh-muc/tai-khoan-ket-chuyen`
- `/chung-tu/ket-chuyen-lai-lo`

Kiểm ở `ketoan.masterceo.com.vn` (không phải `masterceo.com.vn` — đó là Portal). Deploy FE phải theo lối stage-rồi-mv, `index.html` sau cùng (memory `deploy-fe-nguyen-tu-sw-nhiem`).
