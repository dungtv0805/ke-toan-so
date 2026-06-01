# Khai báo Số dư đầu kỳ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép nhập số dư đầu kỳ thủ công theo từng tài khoản (1 mốc bắt đầu chung), rồi cộng vào Bảng cân đối phát sinh và Bảng cân đối kế toán.

**Architecture:** Entity `SoDuDauKy` mới ở master-data-service lưu số dư Nợ/Có theo mã TK + ngày áp dụng. Reporting-service đọc qua ServiceClient và cộng vào "prior bucket" (`priorNo/priorCo`) trước khi tính số dư. FE có trang nhập dạng bảng dưới menu Danh mục.

**Tech Stack:** NestJS 11 + TypeORM (MongoDB) backend, React 18 + TypeScript + Ant Design frontend.

**Spec:** `docs/superpowers/specs/2026-06-01-so-du-dau-ky-design.md`

---

## File Structure

**Backend (create):**
- `be/libs/entities/src/master-data/so-du-dau-ky.entity.ts` — entity
- `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.module.ts`
- `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.controller.ts`
- `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts`
- `be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts`
- `be/apps/master-data-service/src/so-du-dau-ky/dto/index.ts`

**Backend (modify):**
- `be/libs/entities/src/master-data/index.ts` — register entity
- `be/apps/master-data-service/src/master-data-service.module.ts` — add module + forFeature
- `be/libs/service-client/src/service-client.ts` — add `getSoDuDauKy`
- `be/apps/reporting-service/src/so-cai/so-cai.service.ts` — cộng opening vào trial balance
- `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts` — cộng opening vào balance sheet

**Backend (test):**
- `be/apps/reporting-service/src/so-cai/so-cai.helper.spec.ts`
- `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`

**Frontend (create):**
- `fe/src/services/soDuDauKyService.ts`
- `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx`

**Frontend (modify):**
- `fe/src/pages/loadable.tsx` — add loadable export
- `fe/src/App.tsx` — add route + import
- `fe/src/components/layout/MainLayout.tsx` — add menu item + path array entry
- `fe/src/config/routePermissions.ts` — add permission entry

---

## Task 1: Entity SoDuDauKy

**Files:**
- Create: `be/libs/entities/src/master-data/so-du-dau-ky.entity.ts`
- Modify: `be/libs/entities/src/master-data/index.ts`

- [ ] **Step 1: Create entity file**

Create `be/libs/entities/src/master-data/so-du-dau-ky.entity.ts`:

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('so_du_dau_ky')
export class SoDuDauKy extends BaseEntity {
  @Column()
  maTaiKhoan: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  duNo: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  duCo: number;

  @Column({ type: 'timestamp', nullable: true })
  ngayApDung: Date;
}

export interface SoDuDauKyEntities {
  SoDuDauKy: typeof SoDuDauKy;
}

declare module '../entities' {
  interface Entities extends SoDuDauKyEntities {}
}
```

- [ ] **Step 2: Register entity in index**

In `be/libs/entities/src/master-data/index.ts`, add the import line after the existing `import './hop-dong.entity';` line:

```typescript
import './so-du-dau-ky.entity';
```

And add the re-export after the existing `export * from './hop-dong.entity';` line:

```typescript
export * from './so-du-dau-ky.entity';
```

- [ ] **Step 3: Verify it compiles**

Run: `cd be && npx tsc --noEmit -p libs/entities/tsconfig.lib.json 2>&1 | head -20` (if no such tsconfig, run `npx nest build master-data-service 2>&1 | tail -20` after Task 4).
Expected: no errors referencing `so-du-dau-ky.entity.ts`.

- [ ] **Step 4: Commit**

```bash
git add be/libs/entities/src/master-data/so-du-dau-ky.entity.ts be/libs/entities/src/master-data/index.ts
git commit -m "feat(be): thêm entity SoDuDauKy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: DTO cho lưu hàng loạt

**Files:**
- Create: `be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts`
- Create: `be/apps/master-data-service/src/so-du-dau-ky/dto/index.ts`

- [ ] **Step 1: Create the DTO**

Create `be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SoDuDauKyItemDto {
  @IsString()
  maTaiKhoan: string;

  @IsNumber()
  duNo: number;

  @IsNumber()
  duCo: number;
}

export class SaveSoDuDauKyDto {
  @IsDateString()
  ngayApDung: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoDuDauKyItemDto)
  items: SoDuDauKyItemDto[];
}
```

- [ ] **Step 2: Create the dto barrel**

Create `be/apps/master-data-service/src/so-du-dau-ky/dto/index.ts`:

```typescript
export * from './save-so-du-dau-ky.dto';
```

- [ ] **Step 3: Commit**

```bash
git add be/apps/master-data-service/src/so-du-dau-ky/dto/
git commit -m "feat(be): DTO lưu số dư đầu kỳ hàng loạt

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Service SoDuDauKy

**Files:**
- Create: `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts`

- [ ] **Step 1: Create the service**

Create `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts`. Follows the tenant-filter pattern from `ngan-hang.service.ts` (`getTenantFilter` via `TenantContextService`):

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SoDuDauKy } from '@app/entities';
import { TenantContextService } from '@app/core';
import { SaveSoDuDauKyDto } from './dto';

export interface SoDuDauKyResult {
  ngayApDung: Date | null;
  items: Array<{ maTaiKhoan: string; duNo: number; duCo: number }>;
  tongNo: number;
  tongCo: number;
  canDoi: boolean;
}

@Injectable()
export class SoDuDauKyService {
  constructor(
    @InjectRepository(SoDuDauKy)
    private readonly repo: Repository<SoDuDauKy>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async getAll(): Promise<SoDuDauKyResult> {
    const records = await this.repo.find({
      where: this.getTenantFilter() as any,
    });

    const items = records.map((r) => ({
      maTaiKhoan: r.maTaiKhoan,
      duNo: Number(r.duNo) || 0,
      duCo: Number(r.duCo) || 0,
    }));

    const tongNo = items.reduce((s, i) => s + i.duNo, 0);
    const tongCo = items.reduce((s, i) => s + i.duCo, 0);
    const ngayApDung = records.length > 0 ? records[0].ngayApDung : null;

    return { ngayApDung, items, tongNo, tongCo, canDoi: tongNo === tongCo };
  }

  async saveBulk(dto: SaveSoDuDauKyDto): Promise<SoDuDauKyResult> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const tenantFilter = this.getTenantFilter();

    // Xoá toàn bộ bản ghi cũ của tenant
    const existing = await this.repo.find({ where: tenantFilter as any });
    if (existing.length > 0) {
      await this.repo.remove(existing);
    }

    const ngayApDung = new Date(dto.ngayApDung);

    // Chỉ lưu dòng có số dư khác 0
    const toSave = dto.items
      .filter((i) => (Number(i.duNo) || 0) !== 0 || (Number(i.duCo) || 0) !== 0)
      .map((i) =>
        this.repo.create({
          maTaiKhoan: i.maTaiKhoan,
          duNo: Number(i.duNo) || 0,
          duCo: Number(i.duCo) || 0,
          ngayApDung,
          ...(tenantId ? { tenantId } : {}),
        }),
      );

    if (toSave.length > 0) {
      await this.repo.save(toSave);
    }

    return this.getAll();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts
git commit -m "feat(be): service số dư đầu kỳ (get + save bulk, lọc theo tenant)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Controller + Module + đăng ký vào master-data-service

**Files:**
- Create: `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.controller.ts`
- Create: `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.module.ts`
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`

- [ ] **Step 1: Create the controller**

Create `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.controller.ts`. Role list mirrors `ngan-hang.controller.ts` (read = broad, write = ADMIN/KE_TOAN_TRUONG/KE_TOAN_TONG_HOP):

```typescript
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SoDuDauKyService } from './so-du-dau-ky.service';
import { SaveSoDuDauKyDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('so-du-dau-ky')
@UseGuards(JwtGuard, RoleGuard)
export class SoDuDauKyController {
  constructor(private readonly service: SoDuDauKyService) {}

  @Get()
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getAll() {
    const data = await this.service.getAll();
    return { success: true, data };
  }

  @Put()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async saveBulk(@Body() dto: SaveSoDuDauKyDto) {
    const data = await this.service.saveBulk(dto);
    return { success: true, data };
  }
}
```

- [ ] **Step 2: Create the module**

Create `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SoDuDauKy } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { SoDuDauKyService } from './so-du-dau-ky.service';
import { SoDuDauKyController } from './so-du-dau-ky.controller';

@Module({
  imports: [DatabaseModule.forFeature([SoDuDauKy])],
  controllers: [SoDuDauKyController],
  providers: [SoDuDauKyService],
  exports: [SoDuDauKyService],
})
export class SoDuDauKyModule {}
```

- [ ] **Step 3: Register in master-data-service.module.ts**

In `be/apps/master-data-service/src/master-data-service.module.ts`:

(a) Add import near the other module imports (after `HopDongModule`):
```typescript
import { SoDuDauKyModule } from './so-du-dau-ky/so-du-dau-ky.module';
```

(b) Add `SoDuDauKy` to the entities import from `@app/entities` (add to the destructured list alongside `HopDong`):
```typescript
  HopDong,
  SoDuDauKy,
```

(c) Add `SoDuDauKy` to the `DatabaseModule.forFeature([...])` array (after `HopDong,`):
```typescript
      HopDong,
      SoDuDauKy,
```

(d) Add `SoDuDauKyModule` to the `imports` array (after `HopDongModule,`):
```typescript
    HopDongModule,
    SoDuDauKyModule,
```

- [ ] **Step 4: Build the service to verify**

Run: `cd be && npx nest build master-data-service 2>&1 | tail -20`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add be/apps/master-data-service/src/so-du-dau-ky/ be/apps/master-data-service/src/master-data-service.module.ts
git commit -m "feat(be): controller + module số dư đầu kỳ, đăng ký vào master-data-service

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: ServiceClient.getSoDuDauKy

**Files:**
- Modify: `be/libs/service-client/src/service-client.ts`

- [ ] **Step 1: Add the method**

In `be/libs/service-client/src/service-client.ts`, add this method inside the `ServiceClient` class, right after the `getKhoanMuc` method (end of the "Master Data Service Methods" section, before `// ============ Voucher Service Methods ============`):

```typescript
  async getSoDuDauKy(
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<{
    ngayApDung: string | null;
    items: Array<{ maTaiKhoan: string; duNo: number; duCo: number }>;
  }>> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    return this.get('master-data', '/so-du-dau-ky', {
      headers: Object.keys(headers).length ? headers : undefined,
    });
  }
```

- [ ] **Step 2: Build to verify**

Run: `cd be && npx nest build reporting-service 2>&1 | tail -20`
Expected: build succeeds (reporting-service depends on this lib).

- [ ] **Step 3: Commit**

```bash
git add be/libs/service-client/src/service-client.ts
git commit -m "feat(be): ServiceClient.getSoDuDauKy gọi master-data

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cộng số dư đầu kỳ vào Bảng cân đối phát sinh (so-cai)

**Files:**
- Modify: `be/apps/reporting-service/src/so-cai/so-cai.service.ts`
- Test: `be/apps/reporting-service/src/so-cai/so-cai.helper.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `be/apps/reporting-service/src/so-cai/so-cai.helper.spec.ts`:

```typescript
import { computeTrialRow } from './so-cai.service';

describe('computeTrialRow', () => {
  const zeroAgg = { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 };
  const zeroOpening = { duNo: 0, duCo: 0 };

  it('TK loại NO: số dư đầu kỳ thủ công cộng vào đầu kỳ và cuối kỳ', () => {
    // Opening duNo 1,000,000; phát sinh Nợ 500,000 trong kỳ
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 500000, periodCo: 0 },
      { duNo: 1000000, duCo: 0 },
      'NO',
    );
    expect(row.noDauKy).toBe(1000000);
    expect(row.coDauKy).toBe(0);
    expect(row.noPhatSinh).toBe(500000);
    expect(row.noCuoiKy).toBe(1500000);
    expect(row.coCuoiKy).toBe(0);
  });

  it('TK loại CO: opening duCo cộng vào đầu kỳ Có', () => {
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 200000 },
      { duNo: 0, duCo: 800000 },
      'CO',
    );
    expect(row.coDauKy).toBe(800000);
    expect(row.noDauKy).toBe(0);
    expect(row.coCuoiKy).toBe(1000000);
  });

  it('opening cộng dồn với prior từ chứng từ (loại NO)', () => {
    const row = computeTrialRow(
      { priorNo: 300000, priorCo: 100000, periodNo: 0, periodCo: 0 },
      { duNo: 500000, duCo: 0 },
      'NO',
    );
    // đầu kỳ = (300000+500000) - (100000+0) = 700000 dư Nợ
    expect(row.noDauKy).toBe(700000);
    expect(row.coDauKy).toBe(0);
  });

  it('opening = 0 cho kết quả như cũ', () => {
    const row = computeTrialRow(
      { priorNo: 0, priorCo: 0, periodNo: 100000, periodCo: 0 },
      zeroOpening,
      'NO',
    );
    expect(row.noDauKy).toBe(0);
    expect(row.noCuoiKy).toBe(100000);
  });

  it('agg = 0 + opening = 0 → tất cả 0', () => {
    const row = computeTrialRow(zeroAgg, zeroOpening, 'NO');
    expect(row).toEqual({
      noDauKy: 0,
      coDauKy: 0,
      noPhatSinh: 0,
      coPhatSinh: 0,
      noCuoiKy: 0,
      coCuoiKy: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && npx jest apps/reporting-service/src/so-cai/so-cai.helper.spec.ts 2>&1 | tail -20`
Expected: FAIL — `computeTrialRow` is not exported / not defined.

- [ ] **Step 3: Add the exported pure helper**

In `be/apps/reporting-service/src/so-cai/so-cai.service.ts`, add these exported types and the helper function at the top level (after the existing `TrialBalanceEntry` interface, before the `getTaiKhoanNo` helper):

```typescript
export interface AggBucket {
  priorNo: number;
  priorCo: number;
  periodNo: number;
  periodCo: number;
}

export interface OpeningBucket {
  duNo: number;
  duCo: number;
}

/**
 * Tính 1 dòng bảng cân đối phát sinh, cộng số dư đầu kỳ thủ công (opening)
 * vào prior bucket trước khi phân loại dư Nợ/Có theo loại tài khoản.
 */
export function computeTrialRow(
  agg: AggBucket,
  opening: OpeningBucket,
  loai: string,
): {
  noDauKy: number;
  coDauKy: number;
  noPhatSinh: number;
  coPhatSinh: number;
  noCuoiKy: number;
  coCuoiKy: number;
} {
  const calcBalance = (
    no: number,
    co: number,
    l: string,
  ): { duNo: number; duCo: number } => {
    if (l === 'NO') {
      const net = no - co;
      return net >= 0 ? { duNo: net, duCo: 0 } : { duNo: 0, duCo: -net };
    } else {
      const net = co - no;
      return net >= 0 ? { duNo: 0, duCo: net } : { duNo: -net, duCo: 0 };
    }
  };

  const priorNo = agg.priorNo + opening.duNo;
  const priorCo = agg.priorCo + opening.duCo;

  const dauKy = calcBalance(priorNo, priorCo, loai);
  const cuoiKy = calcBalance(
    priorNo + agg.periodNo,
    priorCo + agg.periodCo,
    loai,
  );

  return {
    noDauKy: dauKy.duNo,
    coDauKy: dauKy.duCo,
    noPhatSinh: agg.periodNo,
    coPhatSinh: agg.periodCo,
    noCuoiKy: cuoiKy.duNo,
    coCuoiKy: cuoiKy.duCo,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd be && npx jest apps/reporting-service/src/so-cai/so-cai.helper.spec.ts 2>&1 | tail -20`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire the helper into getTrialBalance**

In `be/apps/reporting-service/src/so-cai/so-cai.service.ts`, replace the body of `getTrialBalance` (from the `const [aggRes, accountsRes] = await Promise.all([...])` block through the end of the `for (const [ma, agg] of aggMap) {...}` loop) so it: (1) also fetches opening balances, (2) iterates over the UNION of accounts that have agg data and accounts that have opening balances, (3) uses `computeTrialRow`.

Replace the existing parallel fetch:

```typescript
    const [aggRes, accountsRes] = await Promise.all([
      this.serviceClient.aggregateBalance(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
    ]);

    const aggData = aggRes.success ? aggRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    // Build account lookup map
    const accountMap = new Map(accounts.map((a) => [a.ma, a]));
    const aggMap = new Map(aggData.map((a) => [a.ma, a]));

    // Helper: tính dư Nợ/Có từ tổng Nợ - Có, dựa vào loại TK
    const calcBalance = (no: number, co: number, loai: string): { duNo: number; duCo: number } => {
      if (loai === 'NO') {
        const net = no - co;
        return net >= 0 ? { duNo: net, duCo: 0 } : { duNo: 0, duCo: -net };
      } else {
        const net = co - no;
        return net >= 0 ? { duNo: 0, duCo: net } : { duNo: -net, duCo: 0 };
      }
    };

    const entries: TrialBalanceEntry[] = [];
    let totalNoDauKy = 0, totalCoDauKy = 0;
    let totalNoPhatSinh = 0, totalCoPhatSinh = 0;
    let totalNoCuoiKy = 0, totalCoCuoiKy = 0;

    // Process all accounts that have aggregation data
    const processedMas = new Set<string>();

    for (const [ma, agg] of aggMap) {
      processedMas.add(ma);
      const account = accountMap.get(ma);
      if (!account) continue;

      const dauKy = calcBalance(agg.priorNo, agg.priorCo, account.loai);
      const cuoiKy = calcBalance(
        agg.priorNo + agg.periodNo,
        agg.priorCo + agg.periodCo,
        account.loai,
      );

      entries.push({
        ma,
        ten: account.ten,
        noDauKy: dauKy.duNo,
        coDauKy: dauKy.duCo,
        noPhatSinh: agg.periodNo,
        coPhatSinh: agg.periodCo,
        noCuoiKy: cuoiKy.duNo,
        coCuoiKy: cuoiKy.duCo,
      });

      totalNoDauKy += dauKy.duNo;
      totalCoDauKy += dauKy.duCo;
      totalNoPhatSinh += agg.periodNo;
      totalCoPhatSinh += agg.periodCo;
      totalNoCuoiKy += cuoiKy.duNo;
      totalCoCuoiKy += cuoiKy.duCo;
    }
```

with:

```typescript
    const [aggRes, accountsRes, openingRes] = await Promise.all([
      this.serviceClient.aggregateBalance(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
      this.serviceClient.getSoDuDauKy(authToken),
    ]);

    const aggData = aggRes.success ? aggRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const openingItems =
      openingRes.success && openingRes.data ? openingRes.data.items || [] : [];

    // Build account lookup map
    const accountMap = new Map(accounts.map((a) => [a.ma, a]));
    const aggMap = new Map(aggData.map((a) => [a.ma, a]));
    const openingMap = new Map<string, OpeningBucket>(
      openingItems.map((o) => [
        o.maTaiKhoan,
        { duNo: Number(o.duNo) || 0, duCo: Number(o.duCo) || 0 },
      ]),
    );

    const entries: TrialBalanceEntry[] = [];
    let totalNoDauKy = 0, totalCoDauKy = 0;
    let totalNoPhatSinh = 0, totalCoPhatSinh = 0;
    let totalNoCuoiKy = 0, totalCoCuoiKy = 0;

    // Union: tài khoản có phát sinh HOẶC có số dư đầu kỳ
    const allMas = new Set<string>([...aggMap.keys(), ...openingMap.keys()]);

    for (const ma of allMas) {
      const account = accountMap.get(ma);
      if (!account) continue;

      const agg =
        aggMap.get(ma) ?? { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 };
      const opening = openingMap.get(ma) ?? { duNo: 0, duCo: 0 };

      const row = computeTrialRow(
        {
          priorNo: agg.priorNo,
          priorCo: agg.priorCo,
          periodNo: agg.periodNo,
          periodCo: agg.periodCo,
        },
        opening,
        account.loai,
      );

      entries.push({ ma, ten: account.ten, ...row });

      totalNoDauKy += row.noDauKy;
      totalCoDauKy += row.coDauKy;
      totalNoPhatSinh += row.noPhatSinh;
      totalCoPhatSinh += row.coPhatSinh;
      totalNoCuoiKy += row.noCuoiKy;
      totalCoCuoiKy += row.coCuoiKy;
    }
```

(The `entries.sort(...)` and `return { entries, totals: {...} }` block below stays unchanged.)

- [ ] **Step 6: Build to verify the wiring compiles**

Run: `cd be && npx nest build reporting-service 2>&1 | tail -20`
Expected: build succeeds. (`processedMas` and the inline `calcBalance` are now removed — confirm no leftover references.)

- [ ] **Step 7: Commit**

```bash
git add be/apps/reporting-service/src/so-cai/so-cai.service.ts be/apps/reporting-service/src/so-cai/so-cai.helper.spec.ts
git commit -m "feat(be): cộng số dư đầu kỳ vào bảng cân đối phát sinh

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Cộng số dư đầu kỳ vào Bảng cân đối kế toán (bao-cao)

**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`
- Test: `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`:

```typescript
import { openingNetForSide } from './bao-cao.service';

describe('openingNetForSide', () => {
  it('undefined opening → 0', () => {
    expect(openingNetForSide(undefined, 'NO')).toBe(0);
    expect(openingNetForSide(undefined, 'CO')).toBe(0);
  });

  it('phía NO (tài sản): net = duNo - duCo', () => {
    expect(openingNetForSide({ duNo: 1000000, duCo: 0 }, 'NO')).toBe(1000000);
    expect(openingNetForSide({ duNo: 1000000, duCo: 200000 }, 'NO')).toBe(800000);
  });

  it('phía CO (nguồn vốn): net = duCo - duNo', () => {
    expect(openingNetForSide({ duNo: 0, duCo: 500000 }, 'CO')).toBe(500000);
    expect(openingNetForSide({ duNo: 100000, duCo: 500000 }, 'CO')).toBe(400000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && npx jest apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts 2>&1 | tail -20`
Expected: FAIL — `openingNetForSide` not exported.

- [ ] **Step 3: Add the exported helper + openingNet param**

In `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`:

(a) Add the exported helper at top level (after the `BalanceSheetReport` interface, before `@Injectable()`):

```typescript
/**
 * Tính phần đóng góp của số dư đầu kỳ thủ công vào số dư 1 phía (Nợ/Có).
 * Phía NO (tài sản): duNo - duCo. Phía CO (nguồn vốn): duCo - duNo.
 */
export function openingNetForSide(
  opening: { duNo: number; duCo: number } | undefined,
  side: 'NO' | 'CO',
): number {
  if (!opening) return 0;
  return side === 'NO'
    ? opening.duNo - opening.duCo
    : opening.duCo - opening.duNo;
}
```

(b) Add an `openingNet` parameter to `calculateAccountBalance` (default 0) so it seeds the running balance. Replace the method signature and the `let balance = 0;` line:

```typescript
  private calculateAccountBalance(
    vouchers: NhatKyChungEntry[],
    maTaiKhoan: string,
    type: 'NO' | 'CO',
    openingNet = 0,
  ): number {
    let balance = openingNet;
```

(The rest of `calculateAccountBalance` — the loop and `return Math.max(0, balance);` — stays unchanged. `getPnL` calls it without the 4th arg, so PnL behavior is unchanged.)

- [ ] **Step 4: Fetch opening balances in getBalanceSheet and pass openingNet**

In `getBalanceSheet`, replace the parallel fetch block:

```typescript
    const [vouchersRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        '2000-01-01',
        asOfDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
    ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
```

with:

```typescript
    const [vouchersRes, accountsRes, openingRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        '2000-01-01',
        asOfDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
      this.serviceClient.getSoDuDauKy(authToken, tenantId),
    ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const openingItems =
      openingRes.success && openingRes.data ? openingRes.data.items || [] : [];
    const openingMap = new Map<string, { duNo: number; duCo: number }>(
      openingItems.map((o) => [
        o.maTaiKhoan,
        { duNo: Number(o.duNo) || 0, duCo: Number(o.duCo) || 0 },
      ]),
    );
```

Then update the two `calculateAccountBalance` calls to pass `openingNet`:

Replace (assets loop):
```typescript
      const amount = this.calculateAccountBalance(vouchers, account.ma, 'NO');
```
with:
```typescript
      const amount = this.calculateAccountBalance(
        vouchers,
        account.ma,
        'NO',
        openingNetForSide(openingMap.get(account.ma), 'NO'),
      );
```

Replace (liabilities/equity loop):
```typescript
      const amount = this.calculateAccountBalance(vouchers, account.ma, 'CO');
```
with:
```typescript
      const amount = this.calculateAccountBalance(
        vouchers,
        account.ma,
        'CO',
        openingNetForSide(openingMap.get(account.ma), 'CO'),
      );
```

- [ ] **Step 5: Run test + build**

Run: `cd be && npx jest apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts 2>&1 | tail -20`
Expected: PASS (3 tests).

Run: `cd be && npx nest build reporting-service 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add be/apps/reporting-service/src/bao-cao/bao-cao.service.ts be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts
git commit -m "feat(be): cộng số dư đầu kỳ vào bảng cân đối kế toán

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: FE service soDuDauKyService

**Files:**
- Create: `fe/src/services/soDuDauKyService.ts`

- [ ] **Step 1: Create the service**

Create `fe/src/services/soDuDauKyService.ts`. Follows `ServiceBase` pattern (see `taiKhoanService.ts`):

```typescript
import { ServiceBase } from './base/service-base';

export interface SoDuDauKyItem {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
}

export interface SoDuDauKyData {
  ngayApDung: string | null;
  items: SoDuDauKyItem[];
  tongNo: number;
  tongCo: number;
  canDoi: boolean;
}

export interface SaveSoDuDauKyPayload {
  ngayApDung: string;
  items: SoDuDauKyItem[];
}

class SoDuDauKyService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/so-du-dau-ky' });
  }

  async getAll(): Promise<SoDuDauKyData> {
    return this.get<SoDuDauKyData>();
  }

  async saveBulk(payload: SaveSoDuDauKyPayload): Promise<SoDuDauKyData> {
    return this.put<SoDuDauKyData>(payload);
  }
}

export const soDuDauKyService = new SoDuDauKyService();
```

- [ ] **Step 2: Verify the ServiceBase signatures match**

Confirm `ServiceBase` exposes `get<T>(opts?)` and `put<T>(body, opts?)` returning the unwrapped `data`. Read `fe/src/services/base/service-base.ts` and check the `get`/`put` method signatures. If `put` requires a body as first arg and options as second (as in `taiKhoanService.update`: `this.put<...>(data, { endpoint })`), the call `this.put<SoDuDauKyData>(payload)` is correct (no endpoint override needed since the base endpoint already is `/master-data/so-du-dau-ky`).

- [ ] **Step 3: Commit**

```bash
git add fe/src/services/soDuDauKyService.ts
git commit -m "feat(fe): service số dư đầu kỳ

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: FE trang Số dư đầu kỳ

**Files:**
- Create: `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx`

- [ ] **Step 1: Create the page**

Create `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx`. A bulk-edit grid: loads all accounts + existing opening balances, lets the user edit Nợ/Có per row, pick `ngayApDung`, shows total Nợ/Có with imbalance warning, saves via `soDuDauKyService.saveBulk`.

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  InputNumber,
  DatePicker,
  Space,
  Typography,
  Breadcrumb,
  message,
  Alert,
  Input,
} from 'antd';
import { HomeOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { TaiKhoan } from '@/types';
import { taiKhoanService } from '@/services/taiKhoanService';
import { soDuDauKyService } from '@/services/soDuDauKyService';
import { usePagePermission } from '@/hooks/usePagePermission';

const { Text } = Typography;

interface RowState {
  ma: string;
  ten: string;
  duNo: number;
  duCo: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

const SoDuDauKyPage: React.FC = () => {
  const { canEdit } = usePagePermission('/danh-muc/so-du-dau-ky');
  const [rows, setRows] = useState<RowState[]>([]);
  const [ngayApDung, setNgayApDung] = useState<Dayjs>(dayjs().startOf('year'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [accounts, opening] = await Promise.all([
        taiKhoanService.getAll(),
        soDuDauKyService.getAll(),
      ]);
      const openingMap = new Map(
        opening.items.map((i) => [i.maTaiKhoan, i]),
      );
      const next: RowState[] = accounts
        .filter((a) => a.isActive !== false)
        .map((a) => {
          const o = openingMap.get(a.ma);
          return {
            ma: a.ma,
            ten: a.ten,
            duNo: o ? Number(o.duNo) || 0 : 0,
            duCo: o ? Number(o.duCo) || 0 : 0,
          };
        })
        .sort((a, b) => a.ma.localeCompare(b.ma));
      setRows(next);
      if (opening.ngayApDung) {
        setNgayApDung(dayjs(opening.ngayApDung));
      }
    } catch (e) {
      message.error('Không tải được dữ liệu số dư đầu kỳ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRow = (ma: string, field: 'duNo' | 'duCo', value: number) => {
    setRows((prev) =>
      prev.map((r) => (r.ma === ma ? { ...r, [field]: value || 0 } : r)),
    );
  };

  const { tongNo, tongCo } = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        tongNo: acc.tongNo + (r.duNo || 0),
        tongCo: acc.tongCo + (r.duCo || 0),
      }),
      { tongNo: 0, tongCo: 0 },
    );
  }, [rows]);

  const canDoi = tongNo === tongCo;

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.ma.toLowerCase().includes(s) || r.ten.toLowerCase().includes(s),
    );
  }, [rows, search]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await soDuDauKyService.saveBulk({
        ngayApDung: ngayApDung.toISOString(),
        items: rows.map((r) => ({
          maTaiKhoan: r.ma,
          duNo: r.duNo || 0,
          duCo: r.duCo || 0,
        })),
      });
      if (!result.canDoi) {
        message.warning('Đã lưu — lưu ý tổng Nợ và tổng Có chưa cân đối');
      } else {
        message.success('Lưu số dư đầu kỳ thành công');
      }
    } catch (e) {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Mã TK', dataIndex: 'ma', width: 120 },
    { title: 'Tên tài khoản', dataIndex: 'ten' },
    {
      title: 'Dư Nợ đầu kỳ',
      dataIndex: 'duNo',
      width: 200,
      render: (_: number, record: RowState) => (
        <InputNumber
          style={{ width: '100%' }}
          value={record.duNo}
          disabled={!canEdit}
          min={0}
          formatter={(v) =>
            `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          }
          parser={(v) => Number((v || '').replace(/,/g, ''))}
          onChange={(v) => updateRow(record.ma, 'duNo', Number(v))}
        />
      ),
    },
    {
      title: 'Dư Có đầu kỳ',
      dataIndex: 'duCo',
      width: 200,
      render: (_: number, record: RowState) => (
        <InputNumber
          style={{ width: '100%' }}
          value={record.duCo}
          disabled={!canEdit}
          min={0}
          formatter={(v) =>
            `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          }
          parser={(v) => Number((v || '').replace(/,/g, ''))}
          onChange={(v) => updateRow(record.ma, 'duCo', Number(v))}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Danh mục' },
          { title: 'Số dư đầu kỳ' },
        ]}
      />
      <Card
        title="Khai báo số dư đầu kỳ"
        extra={
          <Space>
            <Text>Ngày áp dụng:</Text>
            <DatePicker
              value={ngayApDung}
              format="DD/MM/YYYY"
              allowClear={false}
              disabled={!canEdit}
              onChange={(d) => d && setNgayApDung(d)}
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!canEdit}
              onClick={handleSave}
            >
              Lưu
            </Button>
          </Space>
        }
      >
        {!canDoi && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Tổng Nợ (${formatCurrency(tongNo)}) ≠ Tổng Có (${formatCurrency(
              tongCo,
            )}) — số dư đầu kỳ chưa cân đối`}
          />
        )}
        <Input
          allowClear
          placeholder="Tìm theo mã hoặc tên tài khoản"
          prefix={<SearchOutlined />}
          style={{ width: 320, marginBottom: 16 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Table
          rowKey="ma"
          loading={loading}
          dataSource={filteredRows}
          columns={columns}
          pagination={false}
          scroll={{ y: 'calc(100vh - 360px)' }}
          size="small"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong>{formatCurrency(tongNo)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Text strong type={canDoi ? undefined : 'danger'}>
                    {formatCurrency(tongCo)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  );
};

export default SoDuDauKyPage;
```

- [ ] **Step 2: Verify usePagePermission API**

Read `fe/src/hooks/usePagePermission.ts` and confirm it returns a `canEdit` boolean (or equivalent). If the property name differs (e.g. `canSua`, `canModify`), update the destructuring in the page to match. If the hook takes no argument or a different shape, adapt the call. Mirror exactly how `TaiKhoanPage.tsx` uses `usePagePermission`.

- [ ] **Step 3: Lint the new page**

Run: `cd fe && npx eslint src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx 2>&1 | head -30`
Expected: no errors (warnings about `any` acceptable if consistent with the codebase).

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx
git commit -m "feat(fe): trang khai báo số dư đầu kỳ

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Đăng ký route, menu, permission

**Files:**
- Modify: `fe/src/pages/loadable.tsx`
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/components/layout/MainLayout.tsx`
- Modify: `fe/src/config/routePermissions.ts`

- [ ] **Step 1: Add loadable export**

In `fe/src/pages/loadable.tsx`, add after the `KhoanMucPage` export (around line 46-48):

```tsx
export const SoDuDauKyPage = loadable(() => import('./danh-muc/so-du-dau-ky/SoDuDauKyPage'), {
  fallback: <PageLoader />
});
```

- [ ] **Step 2: Add route in App.tsx**

In `fe/src/App.tsx`:

(a) Add `SoDuDauKyPage` to the import block (after `KhoanMucPage,` near line 22):
```tsx
  KhoanMucPage,
  SoDuDauKyPage,
```

(b) Add the route inside the `<Route path="danh-muc">` block, right after the `khoan-muc` route:
```tsx
                  <Route path="so-du-dau-ky" element={
                    <ProtectedRoute requiredPermission="/danh-muc/so-du-dau-ky:xem">
                      <SoDuDauKyPage />
                    </ProtectedRoute>
                  } />
```

- [ ] **Step 3: Add menu item in MainLayout.tsx**

In `fe/src/components/layout/MainLayout.tsx`:

(a) Add the path to the string array (the list at lines ~81-96, after `"/danh-muc/khoan-muc",`):
```tsx
  "/danh-muc/khoan-muc",
  "/danh-muc/so-du-dau-ky",
```

(b) Add the menu entry inside the "Danh mục" `getItem(...)` children array (after the `Khoản mục` line ~220):
```tsx
    getMenuItem("Số dư đầu kỳ", "/danh-muc/so-du-dau-ky", <DollarOutlined />),
```
(`DollarOutlined` is already imported in this file — confirm via the existing `getMenuItem("Khoản mục", ... <DollarOutlined />)` usage. If not, add it to the `@ant-design/icons` import.)

- [ ] **Step 4: Add permission entry in routePermissions.ts**

In `fe/src/config/routePermissions.ts`, add after the `'/danh-muc/khoan-muc'` line (~line 11):
```typescript
  '/danh-muc/so-du-dau-ky': '/danh-muc/so-du-dau-ky:xem',
```

- [ ] **Step 5: Build FE to verify**

Run: `cd fe && npm run build 2>&1 | tail -25`
Expected: build succeeds, no TypeScript errors referencing the new page/route.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/loadable.tsx fe/src/App.tsx fe/src/components/layout/MainLayout.tsx fe/src/config/routePermissions.ts
git commit -m "feat(fe): đăng ký route + menu + quyền cho trang số dư đầu kỳ

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Build verification toàn bộ (BE + FE)

**Files:** none (verification only)

- [ ] **Step 1: Run full BE test suite for reporting**

Run: `cd be && npx jest apps/reporting-service 2>&1 | tail -25`
Expected: all tests pass, including the 2 new helper specs.

- [ ] **Step 2: Build affected BE services**

Run: `cd be && npx nest build master-data-service && npx nest build reporting-service 2>&1 | tail -10`
Expected: both build successfully.

- [ ] **Step 3: Build FE**

Run: `cd fe && npm run build 2>&1 | tail -15`
Expected: success.

- [ ] **Step 4: Manual smoke test plan (record results, do not auto-run)**

Document for the human reviewer to verify on a dev/staging environment:
1. Mở trang Danh mục → Số dư đầu kỳ. Bảng liệt kê tất cả TK active.
2. Nhập dư Nợ cho 1 TK tài sản (vd 112x) và dư Có cho 1 TK nguồn vốn, chọn ngày áp dụng, Lưu.
3. Cố ý nhập lệch Nợ/Có → thấy cảnh báo, vẫn lưu được.
4. F5 lại trang → số dư + ngày áp dụng được nạp lại đúng.
5. Mở Báo cáo → Bảng cân đối phát sinh: cột Số dư đầu kỳ của TK vừa nhập phản ánh đúng (= số nhập + phát sinh trước startDate).
6. Mở Báo cáo → Bảng cân đối kế toán: số dư TK đó tăng đúng phần đầu kỳ.
7. TK không nhập đầu kỳ → giữ nguyên như trước (không đổi).

---

## Notes for Implementer

- **Deploy:** Sau khi review xong, deploy theo `/db-deploy` — build `master-data-service` + `reporting-service`, scp `main.js`, restart `digital-book-app`; FE build + scp vào nginx. KHÔNG deploy tự động trong lúc implement.
- **Tenant:** `master-data-service` đã apply `TenantMiddleware` qua `CoreTenantModule` (TenantModule là `@Global` + `implements NestModule`), nên `TenantContextService.getCurrentTenantId()` hoạt động giống `ngan-hang.service`. Reporting chỉ cần forward `authToken`; master-data tự decode tenantId từ JWT.
- **No double count:** Số dư đầu kỳ chỉ cộng vào prior bucket. Mọi chứng từ phát sinh sau mốc bắt đầu → không trùng. Đã ghi rõ trong spec.
- **MongoDB schemaless:** entity mới không cần migration.
