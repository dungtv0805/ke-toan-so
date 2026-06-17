# Phiếu thu & Phiếu chi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Viết lại 2 trang Phiếu thu (`/chung-tu/phieu-thu`) và Phiếu chi (`/chung-tu/phieu-chi`) theo chuẩn CHanlder + shadcn, đầy đủ CRUD + Import Excel + Thống kê/Summary, thay thế bản Ant Design cũ. Không có workflow duyệt.

**Architecture:** Một module FE dùng chung `fe/src/pages/chung-tu/phieu/` tham số hoá theo `loai` (PHIEU_THU/PHIEU_CHI); 2 page wrapper mỏng. Backend bổ sung endpoint stats/summary/import lọc theo `loai` cấp entity, tái dùng `buildSummaryAggregation` của nhat-ky-chung. Dữ liệu nằm trên collection chung `chung_tu`; mỗi phiếu là 1 bản ghi (form đơn).

**Tech Stack:** BE NestJS + MongoDB (TypeORM MongoRepository, aggregation). FE React + TypeScript + CHanlder (RxJS) + shadcn/ui + Zod + dayjs.

**Spec:** `docs/superpowers/specs/2026-06-17-phieu-thu-chi-design.md`

**Reference (đọc để bắt chước pattern):**
- BE: `be/apps/voucher-service/src/nhat-ky-chung/` (service, controller, helpers, dto)
- BE: `be/apps/voucher-service/src/chung-tu/` (module hiện có cho phiếu)
- FE: `fe/src/pages/chung-tu/nhat-ky-chung/` (handler, sub-handler, components, import)
- FE: `fe/src/services/nhatKyChungService.ts`

**Quan trọng (đã xác nhận khi khảo sát):**
- Entity `ChungTu` KHÔNG có `trangThai` → không làm workflow.
- Query param `loai` của nhat-ky-chung map sang `danhMuc.loaiGiaoDich.ma`, KHÁC `loai` cấp entity. Phiếu thu/chi phải lọc theo `loai` cấp entity → cần helper riêng `buildChungTuMongoQuery`.
- Route `phieu-thu`/`phieu-chi` trong `App.tsx` hiện render `<ComingSoonPage/>` (bản antd là code chết, không mount).
- `chung-tu.service.ts` hiện dùng `Repository` (không aggregate được) → đổi sang `MongoRepository` + inject `TenantContextService` (giống nhat-ky-chung).

---

## PHASE A — Backend (voucher-service, module `chung-tu`)

### Task A1: Query DTO + Mongo query helper cho chung-tu

**Files:**
- Create: `be/apps/voucher-service/src/chung-tu/dto/chung-tu-query.dto.ts`
- Create: `be/apps/voucher-service/src/chung-tu/helpers/build-chung-tu-query.helper.ts`
- Create: `be/apps/voucher-service/src/chung-tu/helpers/index.ts`
- Test: `be/apps/voucher-service/src/chung-tu/helpers/build-chung-tu-query.helper.spec.ts`

- [ ] **Step 1: Write the failing test**

`build-chung-tu-query.helper.spec.ts`:

```typescript
import { buildChungTuMongoQuery } from './build-chung-tu-query.helper';

describe('buildChungTuMongoQuery', () => {
  it('always filters by entity-level loai', () => {
    const q = buildChungTuMongoQuery('PHIEU_THU', {});
    expect(q.loai).toBe('PHIEU_THU');
  });

  it('builds date range on ngay with day boundaries', () => {
    const q = buildChungTuMongoQuery('PHIEU_CHI', {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    }) as { ngay: { $gte: Date; $lte: Date } };
    expect(q.ngay.$gte.getHours()).toBe(0);
    expect(q.ngay.$lte.getHours()).toBe(23);
  });

  it('maps danhMuc filters and search $or', () => {
    const q = buildChungTuMongoQuery('PHIEU_THU', {
      doiTuong: 'KH01',
      duAn: 'DA1',
      search: 'tien',
    }) as Record<string, unknown>;
    expect(q['danhMuc.doiTuong.ma']).toBe('KH01');
    expect(q['danhMuc.duAn.ma']).toBe('DA1');
    expect(Array.isArray(q.$or)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && yarn test build-chung-tu-query`
Expected: FAIL — "Cannot find module './build-chung-tu-query.helper'"

- [ ] **Step 3: Create the DTO**

`chung-tu-query.dto.ts`:

```typescript
import { IsOptional, IsInt, Min, Max, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ChungTuQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 15;

  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() doiTuong?: string;
  @IsOptional() @IsString() duAn?: string;
  @IsOptional() @IsString() boPhan?: string;
  @IsOptional() @IsString() taiKhoanNo?: string;
  @IsOptional() @IsString() taiKhoanCo?: string;
}
```

- [ ] **Step 4: Create the helper**

`build-chung-tu-query.helper.ts`:

```typescript
import type { LoaiChungTu } from '@app/entities';
import { ChungTuQueryDto } from '../dto/chung-tu-query.dto';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildChungTuMongoQuery(
  loai: LoaiChungTu,
  query: ChungTuQueryDto,
): Record<string, unknown> {
  const { search, startDate, endDate, doiTuong, duAn, boPhan, taiKhoanNo, taiKhoanCo } = query;
  const q: Record<string, unknown> = { loai };

  if (startDate || endDate) {
    const ngay: Record<string, Date> = {};
    if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); ngay.$gte = s; }
    if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); ngay.$lte = e; }
    q.ngay = ngay;
  }
  if (search) {
    const esc = escapeRegex(search);
    q.$or = [
      { noiDung: { $regex: esc, $options: 'i' } },
      { soPhieu: { $regex: esc, $options: 'i' } },
      { 'danhMuc.doiTuong.ten': { $regex: esc, $options: 'i' } },
    ];
  }
  if (doiTuong) q['danhMuc.doiTuong.ma'] = doiTuong;
  if (duAn) q['danhMuc.duAn.ma'] = duAn;
  if (boPhan) q['danhMuc.boPhan.ma'] = boPhan;
  if (taiKhoanNo) q['danhMuc.taiKhoanNo.ma'] = taiKhoanNo;
  if (taiKhoanCo) q['danhMuc.taiKhoanCo.ma'] = taiKhoanCo;
  return q;
}
```

`helpers/index.ts`:

```typescript
export * from './build-chung-tu-query.helper';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd be && yarn test build-chung-tu-query`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add be/apps/voucher-service/src/chung-tu/dto/chung-tu-query.dto.ts be/apps/voucher-service/src/chung-tu/helpers/
git commit -m "feat(phieu): chung-tu query dto + mongo query helper (filter by entity loai)"
```

---

### Task A2: ChungTuService → MongoRepository + getStats

**Files:**
- Modify: `be/apps/voucher-service/src/chung-tu/chung-tu.service.ts`
- Modify: `be/apps/voucher-service/src/chung-tu/chung-tu.module.ts`
- Test: `be/apps/voucher-service/src/chung-tu/chung-tu.stats.spec.ts`

- [ ] **Step 1: Write the failing test**

`chung-tu.stats.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService } from '../shared';

describe('ChungTuService.getStats', () => {
  const aggregate = jest.fn();
  const repo = { aggregate: () => ({ toArray: aggregate }) };
  let service: ChungTuService;

  beforeEach(async () => {
    aggregate.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: {} },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => undefined } },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  it('returns tongSo + tongTien for the loai', async () => {
    aggregate.mockResolvedValue([{ tongSo: 3, tongTien: 900 }]);
    const res = await service.getStats('PHIEU_THU', {});
    expect(res.data).toEqual({ tongSo: 3, tongTien: 900 });
  });

  it('returns zeros when empty', async () => {
    aggregate.mockResolvedValue([]);
    const res = await service.getStats('PHIEU_CHI', {});
    expect(res.data).toEqual({ tongSo: 0, tongTien: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && yarn test chung-tu.stats`
Expected: FAIL — `service.getStats is not a function`

- [ ] **Step 3: Modify the service**

In `chung-tu.service.ts`: change repository type and inject tenant context. Replace the imports/constructor:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Between } from 'typeorm';
import { ChungTu, LoaiChungTu } from '@app/entities';
import { CreateChungTuDto, UpdateChungTuDto } from '../dto';
import { ChungTuQueryDto } from './dto/chung-tu-query.dto';
import { VoucherNumberService } from '../shared';
import { TenantContextService } from '@app/core';
import { buildChungTuMongoQuery } from './helpers';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';
```

Constructor:

```typescript
  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: MongoRepository<ChungTu>,
    private readonly voucherNumberService: VoucherNumberService,
    private readonly tenantContext: TenantContextService,
  ) {}
```

Add method (place after `findAllPaginated`):

```typescript
  async getStats(
    loai: LoaiChungTu,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: { tongSo: number; tongTien: number } }> {
    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline: object[] = [
      { $match: mongoQuery },
      { $group: { _id: null, tongSo: { $sum: 1 }, tongTien: { $sum: '$soTien' } } },
    ];
    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    const s = (result[0] as { tongSo: number; tongTien: number }) || { tongSo: 0, tongTien: 0 };
    return { success: true, data: { tongSo: s.tongSo, tongTien: s.tongTien } };
  }
```

- [ ] **Step 4: Update the module**

In `chung-tu.module.ts` add `TenantModule`:

```typescript
import { TenantModule } from '@app/core';
// ...
@Module({
  imports: [ConfigModule, DatabaseModule.forFeature([ChungTu, VoucherSequence]), TenantModule],
  controllers: [ChungTuController],
  providers: [ChungTuService, VoucherNumberService, AccountValidationService],
  exports: [ChungTuService],
})
export class ChungTuModule {}
```

- [ ] **Step 5: Run tests**

Run: `cd be && yarn test chung-tu`
Expected: PASS (new stats spec + existing chung-tu specs still green)

- [ ] **Step 6: Commit**

```bash
git add be/apps/voucher-service/src/chung-tu/chung-tu.service.ts be/apps/voucher-service/src/chung-tu/chung-tu.module.ts be/apps/voucher-service/src/chung-tu/chung-tu.stats.spec.ts
git commit -m "feat(phieu): ChungTuService dùng MongoRepository + getStats theo loai"
```

---

### Task A3: getSummary (tổng hợp theo type)

**Files:**
- Modify: `be/apps/voucher-service/src/chung-tu/chung-tu.service.ts`
- Test: `be/apps/voucher-service/src/chung-tu/chung-tu.summary.spec.ts`

- [ ] **Step 1: Write the failing test**

`chung-tu.summary.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService } from '../shared';

describe('ChungTuService.getSummary', () => {
  const aggregate = jest.fn();
  const repo = { aggregate: () => ({ toArray: aggregate }) };
  let service: ChungTuService;

  beforeEach(async () => {
    aggregate.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: {} },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => undefined } },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  it('returns aggregated summary rows', async () => {
    aggregate.mockResolvedValue([{ key: 'DA1', ten: 'Dự án 1', phatSinhNo: 100, phatSinhCo: 0, soLuong: 2 }]);
    const res = await service.getSummary('PHIEU_THU', 'project', {});
    expect(res.success).toBe(true);
    expect(res.data[0].key).toBe('DA1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && yarn test chung-tu.summary`
Expected: FAIL — `service.getSummary is not a function`

- [ ] **Step 3: Implement**

Add imports to `chung-tu.service.ts`:

```typescript
import { buildSummaryAggregation } from '../nhat-ky-chung/helpers';
import { SummaryType, SummaryItem } from '../nhat-ky-chung/dto';
```

Add method:

```typescript
  async getSummary(
    loai: LoaiChungTu,
    type: SummaryType,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: SummaryItem[] }> {
    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline = buildSummaryAggregation(type, mongoQuery);
    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    return { success: true, data: result as SummaryItem[] };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd be && yarn test chung-tu.summary`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add be/apps/voucher-service/src/chung-tu/chung-tu.service.ts be/apps/voucher-service/src/chung-tu/chung-tu.summary.spec.ts
git commit -m "feat(phieu): ChungTuService.getSummary tái dùng buildSummaryAggregation"
```

---

### Task A4: importPhieu (import hàng loạt, mỗi item 1 số phiếu)

**Files:**
- Modify: `be/apps/voucher-service/src/chung-tu/chung-tu.service.ts`
- Test: `be/apps/voucher-service/src/chung-tu/chung-tu.import.spec.ts`

- [ ] **Step 1: Write the failing test**

`chung-tu.import.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService } from '../shared';

describe('ChungTuService.importPhieu', () => {
  const create = jest.fn((x) => x);
  const save = jest.fn((x) => Promise.resolve(x));
  const repo = { create, save };
  const generateVoucherNumbers = jest.fn();
  let service: ChungTuService;

  beforeEach(async () => {
    create.mockClear(); save.mockClear(); generateVoucherNumbers.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: { generateVoucherNumbers } },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => undefined } },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  it('assigns one soPhieu per item and forces loai', async () => {
    generateVoucherNumbers.mockResolvedValue(['PT001/2026', 'PT002/2026']);
    const items = [
      { ngay: '2026-01-01', soTien: 100, noiDung: 'a' },
      { ngay: '2026-01-02', soTien: 200, noiDung: 'b' },
    ];
    const res = await service.importPhieu('PHIEU_THU', items, 'user1');
    expect(generateVoucherNumbers).toHaveBeenCalledWith('PHIEU_THU', 2);
    expect(res.data).toHaveLength(2);
    expect(res.data[0].soPhieu).toBe('PT001/2026');
    expect(res.data[0].loai).toBe('PHIEU_THU');
  });

  it('returns empty for empty input', async () => {
    const res = await service.importPhieu('PHIEU_CHI', [], 'user1');
    expect(res.data).toEqual([]);
    expect(generateVoucherNumbers).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && yarn test chung-tu.import`
Expected: FAIL — `service.importPhieu is not a function`

- [ ] **Step 3: Implement**

Add method to `chung-tu.service.ts`:

```typescript
  async importPhieu(
    loai: LoaiChungTu,
    items: Omit<CreateChungTuDto, 'loai'>[],
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: ChungTu[] }> {
    if (items.length === 0) return { success: true, data: [] };

    const soPhieuList = await this.voucherNumberService.generateVoucherNumbers(
      loai,
      items.length,
    );

    const chungTuList = items.map((item, idx) =>
      this.chungTuRepository.create({
        loai,
        soTien: item.soTien,
        noiDung: item.noiDung,
        danhMuc: item.danhMuc,
        ghiChu: item.ghiChu,
        nguoiGiaoDich: item.nguoiGiaoDich,
        diaChi: item.diaChi,
        ngay: new Date(item.ngay),
        soPhieu: soPhieuList[idx],
        nguoiTaoId,
      }),
    );

    const saved = await this.chungTuRepository.save(chungTuList);
    return { success: true, data: saved };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd be && yarn test chung-tu.import`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add be/apps/voucher-service/src/chung-tu/chung-tu.service.ts be/apps/voucher-service/src/chung-tu/chung-tu.import.spec.ts
git commit -m "feat(phieu): ChungTuService.importPhieu (mỗi item 1 số phiếu)"
```

---

### Task A5: Controller endpoints (stats / summary / import) cho phiếu thu & chi

**Files:**
- Modify: `be/apps/voucher-service/src/chung-tu/chung-tu.controller.ts`

- [ ] **Step 1: Add endpoints**

Add imports at top of `chung-tu.controller.ts`:

```typescript
import { ChungTuQueryDto } from './dto/chung-tu-query.dto';
import { SUMMARY_TYPES, SummaryType } from '../nhat-ky-chung/dto';
import { BadRequestException } from '@nestjs/common';
```

Add these handlers inside the class (place the `:type` summary routes BEFORE any generic `:id` route to avoid route shadowing — there is no `phieu-thu/:id`, so safe; keep stats/summary above `chung-tu/:id`):

```typescript
  @Get('phieu-thu/stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async statsPhieuThu(@Query() query: ChungTuQueryDto) {
    return this.chungTuService.getStats('PHIEU_THU', query);
  }

  @Get('phieu-chi/stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async statsPhieuChi(@Query() query: ChungTuQueryDto) {
    return this.chungTuService.getStats('PHIEU_CHI', query);
  }

  @Get('phieu-thu/summary/:type')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async summaryPhieuThu(@Param('type') type: string, @Query() query: ChungTuQueryDto) {
    if (!SUMMARY_TYPES.includes(type as SummaryType)) {
      throw new BadRequestException(`Invalid summary type. Valid: ${SUMMARY_TYPES.join(', ')}`);
    }
    return this.chungTuService.getSummary('PHIEU_THU', type as SummaryType, query);
  }

  @Get('phieu-chi/summary/:type')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async summaryPhieuChi(@Param('type') type: string, @Query() query: ChungTuQueryDto) {
    if (!SUMMARY_TYPES.includes(type as SummaryType)) {
      throw new BadRequestException(`Invalid summary type. Valid: ${SUMMARY_TYPES.join(', ')}`);
    }
    return this.chungTuService.getSummary('PHIEU_CHI', type as SummaryType, query);
  }

  @Post('phieu-thu/import')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async importPhieuThu(
    @Body() items: Omit<CreateChungTuDto, 'loai'>[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.chungTuService.importPhieu('PHIEU_THU', items, user.id);
  }

  @Post('phieu-chi/import')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async importPhieuChi(
    @Body() items: Omit<CreateChungTuDto, 'loai'>[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.chungTuService.importPhieu('PHIEU_CHI', items, user.id);
  }
```

Also update the `findAllPhieuThu`/`findAllPhieuChi` signatures to accept `ChungTuQueryDto` instead of `PaginationQueryDto` (so date/doiTuong filters reach the list — implemented in Task A6). Leave for A6.

- [ ] **Step 2: Build to verify routes compile**

Run: `cd be && yarn build voucher-service` (or `npx nest build voucher-service`)
Expected: Build succeeds, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add be/apps/voucher-service/src/chung-tu/chung-tu.controller.ts
git commit -m "feat(phieu): endpoint stats/summary/import cho phiếu thu & chi"
```

---

### Task A6: List filter qua Mongo query (thay in-memory)

**Files:**
- Modify: `be/apps/voucher-service/src/chung-tu/chung-tu.service.ts` (`findAllPaginated`)
- Modify: `be/apps/voucher-service/src/chung-tu/chung-tu.controller.ts` (`findAllPhieuThu`/`findAllPhieuChi` dùng `ChungTuQueryDto`)
- Test: `be/apps/voucher-service/src/chung-tu/chung-tu.list.spec.ts`

- [ ] **Step 1: Write the failing test**

`chung-tu.list.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService } from '../shared';

describe('ChungTuService.findAllPaginated', () => {
  const aggregate = jest.fn();
  const repo = { aggregate: () => ({ toArray: aggregate }) };
  let service: ChungTuService;

  beforeEach(async () => {
    aggregate.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: {} },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => undefined } },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  it('returns paginated data with meta from facet', async () => {
    aggregate.mockResolvedValue([{ data: [{ soPhieu: 'PT001/2026' }], totalArr: [{ count: 1 }] }]);
    const res = await service.findAllPaginated('PHIEU_THU', { page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.meta.total).toBe(1);
    expect(res.meta.totalPages).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && yarn test chung-tu.list`
Expected: FAIL — current `findAllPaginated` uses `.find`, not aggregate; meta shape mismatch.

- [ ] **Step 3: Rewrite `findAllPaginated`**

Replace the existing `findAllPaginated` method body:

```typescript
  async findAllPaginated(
    loai: LoaiChungTu,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: ChungTu[]; meta: PaginatedResult<ChungTu>['meta'] }> {
    const { page = 1, limit = 15 } = query;
    const skip = (page - 1) * limit;

    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline: object[] = [
      { $match: mongoQuery },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalArr: [{ $count: 'count' }],
        },
      },
    ];
    const agg = await this.chungTuRepository.aggregate(pipeline).toArray();
    const facet = (agg[0] as { data: ChungTu[]; totalArr: { count: number }[] }) || { data: [], totalArr: [] };
    const total = facet.totalArr[0]?.count ?? 0;

    return {
      success: true,
      data: facet.data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
```

Update the controller signatures:

```typescript
  @Get('phieu-thu')
  @Roles(/* unchanged */)
  async findAllPhieuThu(@Query() query: ChungTuQueryDto) {
    return this.chungTuService.findAllPaginated('PHIEU_THU', query);
  }

  @Get('phieu-chi')
  @Roles(/* unchanged */)
  async findAllPhieuChi(@Query() query: ChungTuQueryDto) {
    return this.chungTuService.findAllPaginated('PHIEU_CHI', query);
  }
```

Remove the now-unused `PaginationQueryDto` import from the controller if no longer referenced.

- [ ] **Step 4: Run tests**

Run: `cd be && yarn test chung-tu`
Expected: PASS (all chung-tu specs)

- [ ] **Step 5: Commit**

```bash
git add be/apps/voucher-service/src/chung-tu/
git commit -m "feat(phieu): list phiếu lọc bằng Mongo query + facet pagination"
```

---

## PHASE B — Frontend service & types

### Task B1: Shared `phieuService` factory

**Files:**
- Create: `fe/src/services/phieuService.ts`
- Delete: `fe/src/services/phieuThuService.ts`, `fe/src/services/phieuChiService.ts`

- [ ] **Step 1: Create `phieuService.ts`**

```typescript
import { ChungTu, LoaiChungTu, DanhMuc } from '@/types';
import { ServiceBase } from './base/service-base';

export interface PhieuStats {
  tongSo: number;
  tongTien: number;
}

export type PhieuSummaryType =
  | 'account' | 'team' | 'employee' | 'project' | 'investor'
  | 'product' | 'cash-flow' | 'management-group' | 'promotion-group';

export interface PhieuSummaryItem {
  key: string;
  ten?: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soLuong: number;
}

export interface PhieuQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  doiTuong?: string;
  duAn?: string;
  boPhan?: string;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
}

export interface CreatePhieuDto {
  ngay: string;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  danhMuc?: DanhMuc;
}

export interface PaginatedPhieuResponse {
  data: ChungTu[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ChungTuResponse extends Omit<ChungTu, 'id'> {
  _id?: string;
  id?: string;
}

const mapChungTu = (item: ChungTuResponse): ChungTu =>
  ({ ...item, id: item._id || item.id || '' } as ChungTu);

export class PhieuService extends ServiceBase {
  constructor(
    public readonly loai: LoaiChungTu,
    endpoint: string,
  ) {
    super({ endpoint });
  }

  async getAll(params?: PhieuQueryParams): Promise<PaginatedPhieuResponse> {
    const response = await this.get<{ data: ChungTuResponse[]; meta: PaginatedPhieuResponse['meta'] }>({ params });
    return { data: response.data.map(mapChungTu), meta: response.meta };
  }

  async getById(id: string): Promise<ChungTu> {
    const data = await this.get<ChungTuResponse>({ endpoint: `/../chung-tu/${id}` });
    return mapChungTu(data);
  }

  async create(dto: CreatePhieuDto): Promise<ChungTu> {
    const result = await this.post<ChungTuResponse>(dto);
    return mapChungTu(result);
  }

  async update(id: string, dto: Partial<CreatePhieuDto>): Promise<ChungTu> {
    const result = await this.put<ChungTuResponse>(dto, { endpoint: `/../chung-tu/${id}` });
    return mapChungTu(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/../chung-tu/${id}` });
  }

  async search(keyword: string): Promise<ChungTu[]> {
    const data = await this.get<ChungTuResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map(mapChungTu);
  }

  async getStats(params?: PhieuQueryParams): Promise<PhieuStats> {
    return this.get<PhieuStats>({ endpoint: '/stats', params });
  }

  async getSummary(type: PhieuSummaryType, params?: PhieuQueryParams): Promise<PhieuSummaryItem[]> {
    return this.get<PhieuSummaryItem[]>({ endpoint: `/summary/${type}`, params });
  }

  async import(items: CreatePhieuDto[]): Promise<ChungTu[]> {
    const result = await this.post<ChungTuResponse[]>(items, { endpoint: '/import' });
    return result.map(mapChungTu);
  }
}

export const phieuThuService = new PhieuService('PHIEU_THU', '/voucher/phieu-thu');
export const phieuChiService = new PhieuService('PHIEU_CHI', '/voucher/phieu-chi');
```

- [ ] **Step 2: Delete the old service files**

```bash
git rm fe/src/services/phieuThuService.ts fe/src/services/phieuChiService.ts
```

- [ ] **Step 3: Verify no other module imports old service paths**

Run: `cd fe && grep -rn "phieuThuService\|phieuChiService" src --include=*.ts --include=*.tsx | grep -v "phieuService"`
Expected: only the antd pages (`PhieuThuPage.tsx`/`PhieuChiPage.tsx`) — those are replaced in Phase D. Note any other hits and fix imports to `@/services/phieuService`.

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/phieuService.ts
git commit -m "feat(phieu): shared phieuService factory (thu/chi), bỏ workflow methods"
```

---

## PHASE C — Frontend module `phieu`

> Tham chiếu cấu trúc: `fe/src/pages/chung-tu/nhat-ky-chung/`. Mọi component trình bày dùng shadcn/ui như các trang khác (KHÔNG dùng antd). Handler dùng `@RegisterHandler("phieu")` + `@HandlerDecorator`, đăng ký tự động qua `sub-handler/index.ts`.

### Task C1: Config + Handler + Context scaffold

**Files:**
- Create: `fe/src/pages/chung-tu/phieu/phieuConfig.ts`
- Create: `fe/src/pages/chung-tu/phieu/phieu.handler.ts`
- Create: `fe/src/pages/chung-tu/phieu/PhieuHandlerContext.tsx`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/index.ts`

- [ ] **Step 1: Create `phieuConfig.ts`**

```typescript
import { LoaiChungTu } from "@/types";
import { phieuThuService, phieuChiService, PhieuService } from "@/services/phieuService";

export interface PhieuConfig {
  loai: LoaiChungTu;
  title: string;
  soPhieuPrefix: string;
  service: PhieuService;
  accentClass: string; // tailwind accent for stats/badge
}

export const PHIEU_CONFIG: Record<LoaiChungTu, PhieuConfig> = {
  PHIEU_THU: {
    loai: "PHIEU_THU",
    title: "Phiếu thu",
    soPhieuPrefix: "PT",
    service: phieuThuService,
    accentClass: "text-emerald-600",
  },
  PHIEU_CHI: {
    loai: "PHIEU_CHI",
    title: "Phiếu chi",
    soPhieuPrefix: "PC",
    service: phieuChiService,
    accentClass: "text-rose-600",
  },
};
```

- [ ] **Step 2: Create `phieu.handler.ts`**

```typescript
import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./handler/sub-handler";

export interface PhieuEvents extends BaseEvents {}
export interface PhieuStates extends BaseStates {}

export class PhieuHandler extends CHanlder<PhieuEvents, PhieuStates> {
  constructor() {
    super("phieu");
  }
}
```

- [ ] **Step 3: Create `PhieuHandlerContext.tsx`**

```tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { PhieuHandler, PhieuStates } from "./phieu.handler";
import { PhieuConfig } from "./phieuConfig";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const PhieuHandlerContext = createContext<PhieuHandler | null>(null);
const PhieuConfigContext = createContext<PhieuConfig | null>(null);

export function PhieuHandlerProvider({ config, children }: { config: PhieuConfig; children: ReactNode }) {
  const [handler] = useState(() => new PhieuHandler());
  return (
    <PhieuConfigContext.Provider value={config}>
      <PhieuHandlerContext.Provider value={handler}>{children}</PhieuHandlerContext.Provider>
    </PhieuConfigContext.Provider>
  );
}

export function usePhieuHandler() {
  const handler = useContext(PhieuHandlerContext);
  if (!handler) throw new Error("usePhieuHandler must be used within PhieuHandlerProvider");
  return handler;
}

export function usePhieuConfig() {
  const config = useContext(PhieuConfigContext);
  if (!config) throw new Error("usePhieuConfig must be used within PhieuHandlerProvider");
  return config;
}

export function usePhieuState<K extends StateKey<PhieuStates>>(
  key: K,
  initialValue?: StateValue<PhieuStates, K>,
) {
  const handler = usePhieuHandler();
  return useChandlerState<PhieuStates, K>(key, handler, initialValue);
}
```

- [ ] **Step 4: Create `handler/sub-handler/index.ts`**

```typescript
import { loadModule } from "@/common";

loadModule(import.meta.glob("./**/*.handler.ts", { eager: true }));
```

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/phieu/
git commit -m "feat(phieu): config + handler + context scaffold"
```

---

### Task C2: Config — chú ý `loai` vào handler

The handler needs to know which `loai` it operates on so sub-handlers call the right service. Store the config on handler state during init.

**Files:**
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/init/init.event.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/init/init.state.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/init/init.handler.ts`

- [ ] **Step 1: Create `init.event.ts`**

```typescript
import { BaseEvents } from "@/common";
import { PhieuConfig } from "../../../phieuConfig";

export interface InitEvent extends BaseEvents {
  init: { params: { config: PhieuConfig }; result: void };
  refresh: { params: {}; result: void };
  loadPage: { params: { page: number; limit?: number }; result: void };
  loadStats: { params: {}; result: void };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends InitEvent {}
}
```

- [ ] **Step 2: Create `init.state.ts`**

```typescript
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { ChungTu } from "@/types";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStats } from "@/services/phieuService";

export interface TaiKhoanItem { ma: string; ten: string; loai: string; nhom: string; chiTietTheo?: string; }
export interface PaginationMeta { total: number; page: number; limit: number; totalPages: number; }

export interface InitStates extends BaseStates {
  config: PhieuConfig | null;
  data: ChungTu[];
  loading: boolean;
  taiKhoanList: TaiKhoanItem[];
  stats: PhieuStats;
  pagination: PaginationMeta;
  // filters
  searchText: string;
  dateRange: [{ format: (f: string) => string }, { format: (f: string) => string }] | null;
  filterDoiTuong: string | undefined;
  filterDuAn: string | undefined;
  filterBoPhan: string | undefined;
  filterTaiKhoanNo: string | undefined;
  filterTaiKhoanCo: string | undefined;
  // ui
  activeTab: string;
  statsCollapsed: boolean;
}

declare module "../../../phieu.handler" {
  interface PhieuStates extends InitStates {}
}
```

- [ ] **Step 3: Create `init.handler.ts`**

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { taiKhoanService } from "@/services/taiKhoanService";
import { PhieuQueryParams } from "@/services/phieuService";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { InitEvent } from "./init.event";
import "./init.event";
import "./init.state";

const DEFAULT_PAGE_SIZE = 50;

@RegisterHandler("phieu")
export class InitHandler extends CSubHanlder<InitEvent, PhieuStates> {
  @HandlerDecorator("init")
  async init(params: { config: PhieuConfig }): Promise<void> {
    this.setState("config", params.config);
    this.initializeDefaultStates();
    await Promise.all([
      this.loadEntries({ page: 1, limit: DEFAULT_PAGE_SIZE }),
      this.loadTaiKhoanList(),
      this.executeEvent("loadMasterData", {}),
    ]);
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    const pagination = this.getState("pagination") as { page: number; limit: number } | undefined;
    await Promise.all([
      this.loadEntries({ ...this.buildQueryParams(), page: pagination?.page || 1, limit: pagination?.limit || DEFAULT_PAGE_SIZE }),
      this.loadStats(),
    ]);
  }

  @HandlerDecorator("loadPage")
  async loadPage(params: { page: number; limit?: number }): Promise<void> {
    await this.loadEntries({ ...this.buildQueryParams(), page: params.page, limit: params.limit ?? DEFAULT_PAGE_SIZE });
  }

  @HandlerDecorator("loadStats")
  async loadStats(): Promise<void> {
    const config = this.getState("config") as PhieuConfig;
    try {
      const stats = await config.service.getStats(this.buildQueryParams());
      this.setState("stats", stats);
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  }

  buildQueryParams(): PhieuQueryParams {
    const searchText = (this.getState("searchText") as string) || "";
    const dateRange = this.getState("dateRange") as
      | [{ format: (f: string) => string }, { format: (f: string) => string }] | null;
    const filterDoiTuong = this.getState("filterDoiTuong") as string | undefined;
    const filterDuAn = this.getState("filterDuAn") as string | undefined;
    const filterBoPhan = this.getState("filterBoPhan") as string | undefined;
    const filterTaiKhoanNo = this.getState("filterTaiKhoanNo") as string | undefined;
    const filterTaiKhoanCo = this.getState("filterTaiKhoanCo") as string | undefined;

    const params: PhieuQueryParams = {};
    if (searchText) params.search = searchText;
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.startDate = dateRange[0].format("YYYY-MM-DD");
      params.endDate = dateRange[1].format("YYYY-MM-DD");
    }
    if (filterDoiTuong) params.doiTuong = filterDoiTuong;
    if (filterDuAn) params.duAn = filterDuAn;
    if (filterBoPhan) params.boPhan = filterBoPhan;
    if (filterTaiKhoanNo) params.taiKhoanNo = filterTaiKhoanNo;
    if (filterTaiKhoanCo) params.taiKhoanCo = filterTaiKhoanCo;
    return params;
  }

  async loadEntries(params: PhieuQueryParams): Promise<void> {
    const config = this.getState("config") as PhieuConfig;
    this.setState("loading", true);
    try {
      const response = await config.service.getAll(params);
      this.setState("data", response.data);
      this.setState("pagination", response.meta);
    } catch (e) {
      console.error("Error loading entries:", e);
    } finally {
      this.setState("loading", false);
    }
  }

  private async loadTaiKhoanList(): Promise<void> {
    try {
      const leaf = await taiKhoanService.getLeafAccounts();
      this.setState("taiKhoanList", leaf.map((tk) => ({ ma: tk.ma, ten: tk.ten, loai: tk.loai, nhom: tk.nhom, chiTietTheo: tk.chiTietTheo })));
    } catch (e) {
      console.error("Error loading tai khoan list:", e);
    }
  }

  private initializeDefaultStates(): void {
    const defaults: Array<[string, unknown]> = [
      ["data", []], ["loading", false], ["taiKhoanList", []],
      ["stats", { tongSo: 0, tongTien: 0 }],
      ["pagination", { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 0 }],
      ["searchText", ""], ["dateRange", null],
      ["filterDoiTuong", undefined], ["filterDuAn", undefined], ["filterBoPhan", undefined],
      ["filterTaiKhoanNo", undefined], ["filterTaiKhoanCo", undefined],
      ["activeTab", "list"], ["statsCollapsed", false],
    ];
    for (const [k, v] of defaults) {
      if (!this.hasState(k)) this.setState(k, v);
    }
  }
}
```

- [ ] **Step 4: Build to check types**

Run: `cd fe && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "phieu/" || echo "no phieu type errors"`
Expected: "no phieu type errors" (note: `loadMasterData` event is defined in Task C5 — if tsc complains about it now, proceed to C5 then re-check; acceptable to defer this check to C5).

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/phieu/handler/sub-handler/init/
git commit -m "feat(phieu): init sub-handler (load list/stats/tài khoản)"
```

---

### Task C3: Form validation (Zod) — TDD

**Files:**
- Create: `fe/src/pages/chung-tu/phieu/phieuFormSchema.ts`
- Test: `fe/src/pages/chung-tu/phieu/phieuFormSchema.test.ts`

- [ ] **Step 1: Write the failing test**

`phieuFormSchema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { phieuFormSchema } from "./phieuFormSchema";

const valid = { ngay: "2026-06-17", soTien: 1000, noiDung: "Thu tiền KH" };

describe("phieuFormSchema", () => {
  it("accepts a valid phieu", () => {
    expect(phieuFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty noiDung", () => {
    expect(phieuFormSchema.safeParse({ ...valid, noiDung: "" }).success).toBe(false);
  });

  it("rejects soTien <= 0", () => {
    expect(phieuFormSchema.safeParse({ ...valid, soTien: 0 }).success).toBe(false);
  });

  it("rejects missing ngay", () => {
    expect(phieuFormSchema.safeParse({ ...valid, ngay: "" }).success).toBe(false);
  });

  it("allows optional fields", () => {
    const r = phieuFormSchema.safeParse({ ...valid, nguoiGiaoDich: "A", diaChi: "HN", ghiChu: "x" });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/chung-tu/phieu/phieuFormSchema.test.ts`
Expected: FAIL — cannot find module `./phieuFormSchema`

- [ ] **Step 3: Implement schema**

`phieuFormSchema.ts`:

```typescript
import { z } from "zod";

export const phieuFormSchema = z.object({
  ngay: z.string().min(1, "Vui lòng chọn ngày"),
  soTien: z.number().positive("Số tiền phải lớn hơn 0"),
  noiDung: z.string().min(1, "Vui lòng nhập nội dung"),
  nguoiGiaoDich: z.string().max(200).optional(),
  diaChi: z.string().max(500).optional(),
  ghiChu: z.string().max(1000).optional(),
});

export type PhieuFormValues = z.infer<typeof phieuFormSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/chung-tu/phieu/phieuFormSchema.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/phieu/phieuFormSchema.ts fe/src/pages/chung-tu/phieu/phieuFormSchema.test.ts
git commit -m "feat(phieu): Zod schema validate form phiếu + tests"
```

---

### Task C4: submit / delete sub-handlers

**Files:**
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/submit/submit.event.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/submit/submit.handler.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/delete/delete.event.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/delete/delete.handler.ts`

- [ ] **Step 1: Create `submit.event.ts`**

```typescript
import { BaseEvents } from "@/common";
import { CreatePhieuDto } from "@/services/phieuService";

export interface SubmitEvent extends BaseEvents {
  submitPhieu: { params: { id?: string; dto: CreatePhieuDto }; result: boolean };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends SubmitEvent {}
}
```

- [ ] **Step 2: Create `submit.handler.ts`**

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { CreatePhieuDto } from "@/services/phieuService";
import { SubmitEvent } from "./submit.event";
import "./submit.event";

@RegisterHandler("phieu")
export class SubmitHandler extends CSubHanlder<SubmitEvent, PhieuStates> {
  @HandlerDecorator("submitPhieu")
  async submitPhieu(params: { id?: string; dto: CreatePhieuDto }): Promise<boolean> {
    const config = this.getState("config") as PhieuConfig;
    try {
      if (params.id) {
        await config.service.update(params.id, params.dto);
      } else {
        await config.service.create(params.dto);
      }
      await this.executeEvent("refresh", {});
      return true;
    } catch (e) {
      console.error("Error submitting phieu:", e);
      return false;
    }
  }
}
```

- [ ] **Step 3: Create `delete.event.ts`**

```typescript
import { BaseEvents } from "@/common";

export interface DeleteEvent extends BaseEvents {
  deletePhieu: { params: { id: string }; result: boolean };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends DeleteEvent {}
}
```

- [ ] **Step 4: Create `delete.handler.ts`**

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { DeleteEvent } from "./delete.event";
import "./delete.event";

@RegisterHandler("phieu")
export class DeleteHandler extends CSubHanlder<DeleteEvent, PhieuStates> {
  @HandlerDecorator("deletePhieu")
  async deletePhieu(params: { id: string }): Promise<boolean> {
    const config = this.getState("config") as PhieuConfig;
    try {
      await config.service.remove(params.id);
      await this.executeEvent("refresh", {});
      return true;
    } catch (e) {
      console.error("Error deleting phieu:", e);
      return false;
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/phieu/handler/sub-handler/submit/ fe/src/pages/chung-tu/phieu/handler/sub-handler/delete/
git commit -m "feat(phieu): submit (create/update) + delete sub-handlers"
```

---

### Task C5: load-master-data + filter + load-summary sub-handlers

> Mirror `fe/src/pages/chung-tu/nhat-ky-chung/` equivalents. Master-data loads đối tượng/dự án/bộ phận/sản phẩm/dòng tiền lists into state for form selectors and filter dropdowns.

**Files:**
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/load-master-data/load-master-data.event.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/load-master-data/load-master-data.handler.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/filter/filter.event.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/filter/filter.handler.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/load-summary/load-summary.event.ts`
- Create: `fe/src/pages/chung-tu/phieu/handler/sub-handler/load-summary/load-summary.handler.ts`

- [ ] **Step 1: load-master-data event**

```typescript
import { BaseEvents } from "@/common";

export interface LoadMasterDataEvent extends BaseEvents {
  loadMasterData: { params: {}; result: void };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends LoadMasterDataEvent {}
}
```

- [ ] **Step 2: load-master-data handler**

Read `fe/src/pages/chung-tu/nhat-ky-chung/` master-data loading (the `loadMasterData` handler / data-tabs services) and mirror it. Load into state keys: `doiTuongList`, `duAnList`, `boPhanList`, `sanPhamList`, `dongTienList`. Add these keys to `init.state.ts` `InitStates` as `unknown[]` (or precise item types) and default them to `[]`. Use the existing services `doiTuongService`, `duAnService`, `boPhanService`, `sanPhamService`, `dongTienService` (same imports the antd `PhieuThuPage.tsx` used — see its import block for exact names, e.g. `quyChauanService`). Wrap each load in try/catch + `console.error`.

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { doiTuongService } from "@/services/doiTuongService";
import { duAnService } from "@/services/duAnService";
import { boPhanService } from "@/services/boPhanService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { PhieuStates } from "../../../phieu.handler";
import { LoadMasterDataEvent } from "./load-master-data.event";
import "./load-master-data.event";

@RegisterHandler("phieu")
export class LoadMasterDataHandler extends CSubHanlder<LoadMasterDataEvent, PhieuStates> {
  @HandlerDecorator("loadMasterData")
  async loadMasterData(): Promise<void> {
    const results = await Promise.allSettled([
      doiTuongService.getAll(),
      duAnService.getAll(),
      boPhanService.getAll(),
      sanPhamService.getAll(),
      dongTienService.getAll(),
    ]);
    const [dt, da, bp, sp, dts] = results;
    if (dt.status === "fulfilled") this.setState("doiTuongList", dt.value);
    if (da.status === "fulfilled") this.setState("duAnList", da.value);
    if (bp.status === "fulfilled") this.setState("boPhanList", bp.value);
    if (sp.status === "fulfilled") this.setState("sanPhamList", sp.value);
    if (dts.status === "fulfilled") this.setState("dongTienList", dts.value);
  }
}
```

NOTE: verify exact method names of each service (`getAll` vs `getPaginated`) by reading the service file; adjust call + the `.value` shape (some return `{data}`). Add the 5 list state keys to `init.state.ts` and initialize to `[]`.

- [ ] **Step 3: filter event + handler**

`filter.event.ts`:

```typescript
import { BaseEvents } from "@/common";

export interface FilterEvent extends BaseEvents {
  setFilter: { params: { key: string; value: unknown }; result: void };
  applyFilters: { params: {}; result: void };
  resetFilters: { params: {}; result: void };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends FilterEvent {}
}
```

`filter.handler.ts`:

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuStates } from "../../../phieu.handler";
import { FilterEvent } from "./filter.event";
import "./filter.event";

@RegisterHandler("phieu")
export class FilterHandler extends CSubHanlder<FilterEvent, PhieuStates> {
  @HandlerDecorator("setFilter")
  async setFilter(params: { key: string; value: unknown }): Promise<void> {
    this.setState(params.key, params.value);
  }

  @HandlerDecorator("applyFilters")
  async applyFilters(): Promise<void> {
    await this.executeEvent("loadPage", { page: 1 });
  }

  @HandlerDecorator("resetFilters")
  async resetFilters(): Promise<void> {
    this.setState("searchText", "");
    this.setState("dateRange", null);
    this.setState("filterDoiTuong", undefined);
    this.setState("filterDuAn", undefined);
    this.setState("filterBoPhan", undefined);
    this.setState("filterTaiKhoanNo", undefined);
    this.setState("filterTaiKhoanCo", undefined);
    await this.executeEvent("loadPage", { page: 1 });
  }
}
```

- [ ] **Step 4: load-summary event + handler**

`load-summary.event.ts`:

```typescript
import { BaseEvents } from "@/common";
import { PhieuSummaryType } from "@/services/phieuService";

export interface LoadSummaryEvent extends BaseEvents {
  loadSummary: { params: { type: PhieuSummaryType }; result: void };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends LoadSummaryEvent {}
}
```

`load-summary.handler.ts`:

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { PhieuSummaryType } from "@/services/phieuService";
import { LoadSummaryEvent } from "./load-summary.event";
import "./load-summary.event";
import { InitHandler } from "../init/init.handler";

@RegisterHandler("phieu")
export class LoadSummaryHandler extends CSubHanlder<LoadSummaryEvent, PhieuStates> {
  @HandlerDecorator("loadSummary")
  async loadSummary(params: { type: PhieuSummaryType }): Promise<void> {
    const config = this.getState("config") as PhieuConfig;
    const queryParams = (this as unknown as InitHandler).buildQueryParams();
    const loadingMap = (this.getState("summaryLoading") as Record<string, boolean>) || {};
    this.setState("summaryLoading", { ...loadingMap, [params.type]: true });
    try {
      const rows = await config.service.getSummary(params.type, queryParams);
      const map = (this.getState("summaryData") as Record<string, unknown>) || {};
      this.setState("summaryData", { ...map, [params.type]: rows });
    } catch (e) {
      console.error("Error loading summary:", e);
    } finally {
      const m = (this.getState("summaryLoading") as Record<string, boolean>) || {};
      this.setState("summaryLoading", { ...m, [params.type]: false });
    }
  }
}
```

Add state keys `summaryData: Record<string, PhieuSummaryItem[]>` and `summaryLoading: Record<string, boolean>` to `init.state.ts` and init to `{}`. NOTE: `buildQueryParams` is a public method on `InitHandler`; since sub-handlers share the same handler state but are different instances, re-declare a small local copy of `buildQueryParams` in this handler instead of the cross-instance cast if the cast doesn't resolve at runtime — both read the same state via `this.getState`, so copying the method body is safe and simplest. Prefer copying the method body.

- [ ] **Step 5: Type-check**

Run: `cd fe && npx tsc --noEmit 2>&1 | grep -i "phieu/" || echo "no phieu type errors"`
Expected: "no phieu type errors"

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/chung-tu/phieu/handler/sub-handler/
git commit -m "feat(phieu): load-master-data + filter + load-summary sub-handlers"
```

---

### Task C6: Presentational components

> All components use shadcn/ui (Button, Input, Table, Dialog, Select, Tabs, Card, Badge) + `lucide-react` icons + `dayjs`. Mirror the equivalent nhat-ky-chung components for layout/behavior but adapt to the single-record phiếu form. Each component reads state via `usePhieuState(...)` and triggers events via `usePhieuHandler().executeEvent(...)`. Money formatting: reuse existing util (search `formatCurrency`/`formatMoney` in `fe/src/utils`).

**Files:**
- Create: `fe/src/pages/chung-tu/phieu/components/stats/StatsCards.tsx`
- Create: `fe/src/pages/chung-tu/phieu/components/filter/FilterBar.tsx`
- Create: `fe/src/pages/chung-tu/phieu/components/table/PhieuTable.tsx`
- Create: `fe/src/pages/chung-tu/phieu/components/form-modal/PhieuFormModal.tsx`
- Create: `fe/src/pages/chung-tu/phieu/components/view-modal/PhieuViewModal.tsx`
- Create: `fe/src/pages/chung-tu/phieu/components/summary/SummaryTabs.tsx`

- [ ] **Step 1: StatsCards.tsx**

Reads `usePhieuState("stats")` + `usePhieuState("statsCollapsed")` + `usePhieuConfig()`. Renders 2 cards: "Tổng số phiếu" (`stats.tongSo`), "Tổng tiền" (`stats.tongTien`, formatted), tinted with `config.accentClass`. Collapsible via a toggle button that flips `statsCollapsed` (call `executeEvent("loadStats", {})` when expanding).

- [ ] **Step 2: FilterBar.tsx**

Inputs bound to filter state via `setFilter` event: search text (Input + debounce), date range (two DatePicker or shadcn date inputs → store as `[dayjs, dayjs]`), Select for đối tượng / dự án / bộ phận / tài khoản nợ / tài khoản có (options from `doiTuongList`, `duAnList`, `boPhanList`, `taiKhoanList`). Buttons: "Lọc" → `applyFilters`, "Đặt lại" → `resetFilters`. Button "Thêm phiếu" opens form modal (set a `formModalOpen` ui-state = true, `editingId` = undefined). Button "Import" opens import modal (Task C7).

- [ ] **Step 3: PhieuTable.tsx**

Reads `data`, `loading`, `pagination`, `config`. Columns: Số phiếu, Ngày (`dayjs(ngay).format("DD/MM/YYYY")`), Nội dung, Đối tượng (`danhMuc?.doiTuong?.ten`), TK Nợ/Có, Số tiền (formatted), Thao tác (Xem / Sửa / Xóa). Row actions: Xem → open view modal with row; Sửa → open form modal with `editingId=row.id`; Xóa → confirm dialog → `executeEvent("deletePhieu", { id })`. Pagination controls call `executeEvent("loadPage", { page })`. Show skeleton/loader when `loading`.

- [ ] **Step 4: PhieuFormModal.tsx**

Controlled by ui-state `formModalOpen` + `editingId`. Uses React Hook Form + `zodResolver(phieuFormSchema)`. Fields: ngày (date), số tiền (number), nội dung (textarea), người giao dịch, địa chỉ, ghi chú; danh mục selectors: đối tượng, tài khoản nợ, tài khoản có, dự án, bộ phận, sản phẩm, dòng tiền (each a Select; on change, build the snapshot using `@/utils/snapshotBuilder` helpers — see usage in antd `PhieuThuPage.tsx` and nhat-ky-chung form). On submit: assemble `CreatePhieuDto` with `danhMuc` snapshot object, call `executeEvent("submitPhieu", { id: editingId, dto })`; on success toast + close modal. When `editingId` set, prefill by `config.service.getById(editingId)` (or pass the row through ui-state). Title = `config.title` + (Thêm/Sửa).

- [ ] **Step 5: PhieuViewModal.tsx**

Read-only Dialog showing all fields of the selected phiếu (controlled by ui-state `viewModalPhieu`). Use a description list. Reuse `@/utils/snapshotDisplay` getters for danh mục names.

- [ ] **Step 6: SummaryTabs.tsx**

shadcn Tabs, one tab per `PhieuSummaryType` (Tài khoản, Đội, Nhân viên, Dự án, Chủ đầu tư, Sản phẩm, Dòng tiền, Nhóm QL, Nhóm KM). On tab change, `executeEvent("loadSummary", { type })`. Each tab renders a table of `summaryData[type]` (cột: Tên/Mã, Phát sinh Nợ, Phát sinh Có, Số lượng), with loading from `summaryLoading[type]`.

- [ ] **Step 7: Add ui-state keys**

Add to `init.state.ts` `InitStates`: `formModalOpen: boolean`, `editingId: string | undefined`, `viewModalPhieu: ChungTu | null`, `importModalOpen: boolean`; default `false/undefined/null/false`. Add `doiTuongList`, `duAnList`, `boPhanList`, `sanPhamList`, `dongTienList` if not added in C5.

- [ ] **Step 8: Lint + type-check**

Run: `cd fe && npx tsc --noEmit 2>&1 | grep -i "phieu/" || echo "ok"` then `npm run lint`
Expected: no phieu errors; lint clean for new files.

- [ ] **Step 9: Commit**

```bash
git add fe/src/pages/chung-tu/phieu/components/ fe/src/pages/chung-tu/phieu/handler/sub-handler/init/init.state.ts
git commit -m "feat(phieu): presentational components (stats/filter/table/form/view/summary)"
```

---

### Task C7: Import Excel module (mirror nhat-ky-chung)

**Files:**
- Create: `fe/src/pages/chung-tu/phieu/import/` (mirror `fe/src/pages/chung-tu/nhat-ky-chung/import/`)

- [ ] **Step 1: Copy the import module structure**

Copy `fe/src/pages/chung-tu/nhat-ky-chung/import/` into `fe/src/pages/chung-tu/phieu/import/`. Keep the same sub-structure: `ImportExcelModal.tsx`, `ImportHandlerContext.tsx`, `import.handler.ts`, `import.state.ts`, `sub-handler/` (parse, submit, load-master-data), `lib/` (template, columns, validate, extractCode, normalize, buildDanhMucFromRow, parseRows) + their `__tests__`.

- [ ] **Step 2: Adapt to fixed `loai`**

Changes vs nhat-ky-chung import:
- The phiếu has no `loai` column in the sheet — set `loai` from `usePhieuConfig().loai` for every row (remove the loai column from `lib/columns.ts` and `lib/template.ts`).
- Submit calls `config.service.import(items)` instead of `nhatKyChungService.importEntries`.
- Update import paths (`../../phieu.handler` etc.).
- Keep the danh-mục resolution and validation logic intact.

- [ ] **Step 3: Update copied tests**

Adjust the copied `lib/__tests__/*` to the phiếu column set (no `loai` column). Run them.

Run: `cd fe && npx vitest run src/pages/chung-tu/phieu/import`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/chung-tu/phieu/import/
git commit -m "feat(phieu): import Excel module (loai cố định theo trang)"
```

---

### Task C8: PhieuListPage compose

**Files:**
- Create: `fe/src/pages/chung-tu/phieu/PhieuListPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { useEffect } from "react";
import { PhieuHandlerProvider, usePhieuHandler, usePhieuConfig } from "./PhieuHandlerContext";
import { PhieuConfig } from "./phieuConfig";
import { StatsCards } from "./components/stats/StatsCards";
import { FilterBar } from "./components/filter/FilterBar";
import { PhieuTable } from "./components/table/PhieuTable";
import { PhieuFormModal } from "./components/form-modal/PhieuFormModal";
import { PhieuViewModal } from "./components/view-modal/PhieuViewModal";
import { SummaryTabs } from "./components/summary/SummaryTabs";
import { ImportExcelModal } from "./import/ImportExcelModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function PhieuListPageInner() {
  const handler = usePhieuHandler();
  const config = usePhieuConfig();

  useEffect(() => {
    handler.executeEvent("init", { config });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{config.title}</h1>
      <StatsCards />
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Danh sách</TabsTrigger>
          <TabsTrigger value="summary">Tổng hợp</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-3">
          <FilterBar />
          <PhieuTable />
        </TabsContent>
        <TabsContent value="summary">
          <SummaryTabs />
        </TabsContent>
      </Tabs>
      <PhieuFormModal />
      <PhieuViewModal />
      <ImportExcelModal />
    </div>
  );
}

export function PhieuListPage({ config }: { config: PhieuConfig }) {
  return (
    <PhieuHandlerProvider config={config}>
      <PhieuListPageInner />
    </PhieuHandlerProvider>
  );
}
```

Adjust `ImportExcelModal` props/usage to match its actual export (it may need its own provider — see how nhat-ky-chung mounts it).

- [ ] **Step 2: Commit**

```bash
git add fe/src/pages/chung-tu/phieu/PhieuListPage.tsx
git commit -m "feat(phieu): PhieuListPage compose stats/filter/table/summary/modals"
```

---

## PHASE D — Wiring & cleanup

### Task D1: Page wrappers + loadable + route

**Files:**
- Modify: `fe/src/pages/chung-tu/phieu-thu/PhieuThuPage.tsx` (replace antd content)
- Modify: `fe/src/pages/chung-tu/phieu-chi/PhieuChiPage.tsx` (replace antd content)
- Modify: `fe/src/pages/loadable.tsx`
- Modify: `fe/src/App.tsx`

- [ ] **Step 1: Replace `PhieuThuPage.tsx`**

```tsx
import { PhieuListPage } from "../phieu/PhieuListPage";
import { PHIEU_CONFIG } from "../phieu/phieuConfig";

export default function PhieuThuPage() {
  return <PhieuListPage config={PHIEU_CONFIG.PHIEU_THU} />;
}
```

- [ ] **Step 2: Replace `PhieuChiPage.tsx`**

```tsx
import { PhieuListPage } from "../phieu/PhieuListPage";
import { PHIEU_CONFIG } from "../phieu/phieuConfig";

export default function PhieuChiPage() {
  return <PhieuListPage config={PHIEU_CONFIG.PHIEU_CHI} />;
}
```

- [ ] **Step 3: Verify loadable exports**

`fe/src/pages/loadable.tsx` already exports `PhieuThuPage`/`PhieuChiPage` (lines ~91, ~95). Confirm they still point to `./chung-tu/phieu-thu/PhieuThuPage` and `./chung-tu/phieu-chi/PhieuChiPage`. No change needed unless paths differ.

- [ ] **Step 4: Wire routes in `App.tsx`**

Replace the two `<ComingSoonPage/>` elements for `phieu-thu`/`phieu-chi` with the real pages wrapped in `ProtectedRoute` (mirror the `nhat-ky-chung` route just below them):

```tsx
                  <Route
                    path="phieu-thu"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/phieu-thu:xem">
                        <PhieuThuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="phieu-chi"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/phieu-chi:xem">
                        <PhieuChiPage />
                      </ProtectedRoute>
                    }
                  />
```

Confirm `PhieuThuPage`/`PhieuChiPage` are imported from `loadable` at top of `App.tsx` (they already are). Verify the permission keys exist in `fe/src/config/routePermissions.ts` / `permissionModules.ts`; if not, add `/chung-tu/phieu-thu:xem` and `/chung-tu/phieu-chi:xem` following the nhat-ky-chung entries.

- [ ] **Step 5: Build**

Run: `cd fe && npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/chung-tu/phieu-thu/PhieuThuPage.tsx fe/src/pages/chung-tu/phieu-chi/PhieuChiPage.tsx fe/src/App.tsx fe/src/config/routePermissions.ts fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts
git commit -m "feat(phieu): wire trang phiếu thu/chi mới vào route (thay ComingSoon)"
```

---

### Task D2: Remove dead antd code & mock-data dependency

**Files:**
- Inspect/clean: old antd imports, `@/mock-data/chung-tu`

- [ ] **Step 1: Confirm no remaining references to removed symbols**

Run:
```bash
cd fe && grep -rn "mock-data/chung-tu" src --include=*.ts --include=*.tsx
cd fe && grep -rn "submitForApproval\|getByTrangThai\|\.approve(\|\.reject(" src --include=*.ts --include=*.tsx
```
Expected: no hits (the antd pages that used them were replaced in D1). Fix any stragglers.

- [ ] **Step 2: Remove now-unused mock-data file if nothing imports it**

Run: `cd fe && grep -rn "mock-data/chung-tu\|trangThaiChungTu" src` — if zero hits, `git rm fe/src/mock-data/chung-tu.ts` (verify exact path first).

- [ ] **Step 3: Build + lint**

Run: `cd fe && npm run build && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(phieu): gỡ code antd chết + phụ thuộc mock-data"
```

---

### Task D3: Update docs/context + full verification

**Files:**
- Modify: `.claude/context/active-pages.md`
- Modify: `.claude/context/be-api-map.md`

- [ ] **Step 1: Update `active-pages.md`**

Change phiếu thu/chi rows: `/chung-tu/phieu-thu` and `/chung-tu/phieu-chi` → Status ACTIVE, API `voucher:3003`.

- [ ] **Step 2: Update `be-api-map.md`**

Under Voucher Service add: `GET /phieu-thu/stats`, `GET /phieu-chi/stats`, `GET /phieu-thu/summary/:type`, `GET /phieu-chi/summary/:type`, `POST /phieu-thu/import`, `POST /phieu-chi/import`.

- [ ] **Step 3: Full backend test run**

Run: `cd be && yarn test`
Expected: all green.

- [ ] **Step 4: Full frontend test + build**

Run: `cd fe && npx vitest run src/pages/chung-tu/phieu && npm run build`
Expected: phiếu tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add .claude/context/active-pages.md .claude/context/be-api-map.md
git commit -m "docs(phieu): cập nhật active-pages + be-api-map cho phiếu thu/chi"
```

---

## Verification Checklist (cuối cùng)

- [ ] BE: `yarn test` (voucher-service) xanh — stats/summary/import/list specs pass.
- [ ] BE: `npx nest build voucher-service` thành công.
- [ ] FE: `npm run build` + `npm run lint` sạch.
- [ ] FE: `npx vitest run src/pages/chung-tu/phieu` pass (schema + import lib).
- [ ] Thủ công (sau deploy dev): mở `/chung-tu/phieu-thu` và `/chung-tu/phieu-chi` — list load, tạo phiếu (số phiếu PT/PC tự sinh), sửa, xóa, lọc theo ngày/đối tượng, tab Tổng hợp, Import Excel.
- [ ] Không còn import `@/mock-data/chung-tu` hay method workflow (`approve/reject/submitForApproval`).
</content>
