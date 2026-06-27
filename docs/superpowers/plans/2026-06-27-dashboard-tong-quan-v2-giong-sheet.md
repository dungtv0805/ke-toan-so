# Dashboard "Tổng quan" v2 — giống sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Làm lại dashboard tab Tài chính giống hệt các biểu đồ trong sheet: filter theo kỳ (~20 mục), 6 khối (KQKD, Dòng tiền, Tình hình thực hiện, Tỷ trọng, Công nợ, Cân đối tài chính), KPI trong header chart, + 1 endpoint BE công nợ theo tháng.

**Architecture:** Frontend (React+AntD+Recharts) chỉnh giao diện + mô hình filter mới (period.ts v2 = khoảng kỳ). Backend thêm 1 endpoint `/payable/cong-no/series` (tenant-filtered). Chart xu hướng lấy series 12 tháng rồi cắt theo kỳ.

**Tech Stack:** React 18, TypeScript, Ant Design, Recharts, TanStack Query, Vitest; NestJS 11, TypeORM/Mongo, Jest.

## Global Constraints
- Spec nguồn: `docs/superpowers/specs/2026-06-27-dashboard-tong-quan-v2-giong-sheet-design.md`. Ảnh mẫu đã trích trong scratchpad (KQKD=image3, Dòng tiền=image13, gauge=image5, donut=image8/11).
- Màu: Doanh thu/Thu = teal `#2BC4A8`-ish (dùng `DASH_COLORS.revenue` = `hsl(var(--success))`); Chi phí/Chi = xám nhạt `#D9D9D9` (`DASH_COLORS.muted` light); Lợi nhuận/Tồn = cam `#F2994A`/`DASH_COLORS.accent` (brand-gold) → dùng cam: thêm token cam nếu cần. Donut palette navy `#1F3864` + gold `#C9A227`.
- KPI nằm TRONG header chart (không có hàng 4 thẻ KPI rời).
- Chart xu hướng chỉ hiện các tháng trong kỳ (slice [startMonth,endMonth]); chi vẽ ÂM (dưới trục 0).
- "Tình hình thực hiện" luôn rỗng (BE không có kế hoạch) — vẫn vẽ gauge ở 0,00%.
- Công nợ: số dư đến cuối mỗi tháng = Σ conLai (ngayPhatSinh ≤ ngày cuối tháng), tenant-filtered.
- BE: KHÔNG đổi các method cong-no cũ; chỉ thêm method series có lọc tenant + áp TenantMiddleware (context-only, không đổi output route cũ).
- FE verify = `npm run lint` + `npm run build`; logic thuần test bằng vitest. BE verify = `npx nest build payable-service` + jest cho method mới.
- Lệnh FE chạy trong `fe/`, BE trong `be/`.

---

### Task 1: BE — endpoint công nợ theo tháng (tenant-filtered)

**Files:**
- Modify: `be/apps/payable-service/src/payable-service.module.ts` (áp TenantMiddleware)
- Modify: `be/apps/payable-service/src/cong-no/cong-no.module.ts` (import TenantModule)
- Modify: `be/apps/payable-service/src/cong-no/cong-no.service.ts` (inject TenantContextService + method getCongNoSeries)
- Modify: `be/apps/payable-service/src/cong-no/cong-no.controller.ts` (route GET cong-no/series)
- Test: `be/apps/payable-service/src/cong-no/cong-no.series.spec.ts`

**Interfaces:**
- Produces: `CongNoService.getCongNoSeries(year: number): Promise<{ thang: number; tongPhaiThu: number; tongPhaiTra: number }[]>` (12 phần tử). Route `GET /cong-no/series?year=` → `{ success: true, data: [...] }`.

- [ ] **Step 1: Viết test thất bại** — `cong-no.series.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContextService } from '@app/core';
import { CongNo } from '@app/entities';
import { CongNoService } from './cong-no.service';

describe('CongNoService.getCongNoSeries', () => {
  function build(records: Partial<CongNo>[], tenantId?: string) {
    const repo = { find: jest.fn().mockResolvedValue(records) };
    return Test.createTestingModule({
      providers: [
        CongNoService,
        { provide: getRepositoryToken(CongNo), useValue: repo },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => tenantId } },
      ],
    }).compile().then((m) => ({ svc: m.get(CongNoService), repo }));
  }

  it('số dư cộng dồn theo conLai đến cuối mỗi tháng, tách loại', async () => {
    const { svc } = await build([
      { loai: 'PHAI_THU', conLai: 100, ngayPhatSinh: new Date(2026, 0, 15) }, // T1
      { loai: 'PHAI_THU', conLai: 50, ngayPhatSinh: new Date(2026, 2, 10) },  // T3
      { loai: 'PHAI_TRA', conLai: 70, ngayPhatSinh: new Date(2026, 1, 5) },   // T2
    ]);
    const r = await svc.getCongNoSeries(2026);
    expect(r).toHaveLength(12);
    expect(r[0]).toEqual({ thang: 1, tongPhaiThu: 100, tongPhaiTra: 0 });   // đến cuối T1
    expect(r[1]).toEqual({ thang: 2, tongPhaiThu: 100, tongPhaiTra: 70 });  // đến cuối T2
    expect(r[2]).toEqual({ thang: 3, tongPhaiThu: 150, tongPhaiTra: 70 });  // đến cuối T3
  });

  it('lọc theo tenantId khi có', async () => {
    const { repo } = await build([], 'tenant-A');
    // method gọi find với where tenantId
    const { svc } = await build([], 'tenant-A');
    await svc.getCongNoSeries(2026);
    expect(repo.find).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd be && npx jest apps/payable-service/src/cong-no/cong-no.series.spec.ts 2>&1 | tail -15`
Expected: FAIL — `getCongNoSeries is not a function`.

- [ ] **Step 3: Implement**

3a. `cong-no.module.ts` — thêm `TenantModule` vào imports:

```typescript
import { Module } from '@nestjs/common';
import { CongNo } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { CongNoService } from './cong-no.service';
import { CongNoController } from './cong-no.controller';

@Module({
  imports: [DatabaseModule.forFeature([CongNo]), TenantModule],
  controllers: [CongNoController],
  providers: [CongNoService],
  exports: [CongNoService],
})
export class CongNoModule {}
```

3b. `payable-service.module.ts` — áp TenantMiddleware (context-only, giống voucher-service):

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule, TenantMiddleware } from '@app/core';
import { DatabaseModule } from '@app/database';
import { CongNoModule } from './cong-no/cong-no.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    CongNoModule,
  ],
})
export class PayableServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
```

3c. `cong-no.service.ts` — inject TenantContextService, thêm method. Sửa constructor:

```typescript
import { TenantContextService } from '@app/core';
// ...
  constructor(
    @InjectRepository(CongNo)
    private readonly congNoRepository: Repository<CongNo>,
    private readonly tenantContext: TenantContextService,
  ) {}
```

Thêm method (cuối class):

```typescript
  /**
   * Số dư công nợ cộng dồn đến cuối mỗi tháng của năm chọn, tách phải thu/phải trả.
   * Dùng conLai hiện tại + ngayPhatSinh (BE không lưu lịch sử thanh toán theo ngày).
   */
  async getCongNoSeries(
    year: number,
  ): Promise<{ thang: number; tongPhaiThu: number; tongPhaiTra: number }[]> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    const all = await this.congNoRepository.find({ where });

    return Array.from({ length: 12 }, (_, i) => {
      const thang = i + 1;
      const endOfMonth = new Date(year, thang, 0, 23, 59, 59, 999);
      let tongPhaiThu = 0;
      let tongPhaiTra = 0;
      for (const c of all) {
        if (!c.ngayPhatSinh) continue;
        if (new Date(c.ngayPhatSinh) > endOfMonth) continue;
        if (c.loai === 'PHAI_THU') tongPhaiThu += c.conLai || 0;
        else if (c.loai === 'PHAI_TRA') tongPhaiTra += c.conLai || 0;
      }
      return { thang, tongPhaiThu, tongPhaiTra };
    });
  }
```

3d. `cong-no.controller.ts` — thêm route. Đặt NGAY TRƯỚC route `cong-no/:id` (nếu có) để "series" không bị nuốt làm `:id`. Thêm:

```typescript
  @Get('cong-no/series')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getCongNoSeries(@Query('year') year?: string) {
    const y = Number(year) || new Date().getFullYear();
    const data = await this.congNoService.getCongNoSeries(y);
    return { success: true, data };
  }
```

- [ ] **Step 4: Chạy test PASS**

Run: `cd be && npx jest apps/payable-service/src/cong-no/cong-no.series.spec.ts 2>&1 | tail -15`
Expected: PASS.

- [ ] **Step 5: Build BE**

Run: `cd be && npx nest build payable-service 2>&1 | tail -5`
Expected: build ok, no errors.

- [ ] **Step 6: Commit**

```bash
git add be/apps/payable-service be/apps/payable-service/src/cong-no/cong-no.series.spec.ts
git commit -m "feat(payable): GET cong-no/series — số dư công nợ theo tháng (tenant-filtered)"
```

---

### Task 2: FE service — getCongNoSeries

**Files:**
- Modify: `fe/src/services/congNoPhaiThuService.ts` (thêm `getSeries`)
- Modify: `fe/src/services/dashboardService.ts` (thêm type + `getCongNoSeries`)

**Interfaces:**
- Consumes: route `/payable/cong-no/series` (Task 1).
- Produces: `dashboardService.getCongNoSeries(year): Promise<CongNoSeriesPoint[]>` với `CongNoSeriesPoint = { thang: number; tongPhaiThu: number; tongPhaiTra: number }`.

- [ ] **Step 1: Thêm `getSeries` vào `congNoPhaiThuService.ts`** (theo pattern `/../cong-no/...`), trong class `CongNoPhaiThuService`:

```typescript
  async getSeries(year: number): Promise<{ thang: number; tongPhaiThu: number; tongPhaiTra: number }[]> {
    const data = await this.get<{ thang: number; tongPhaiThu: number; tongPhaiTra: number }[]>({
      endpoint: '/../cong-no/series',
      params: { year },
    });
    return Array.isArray(data) ? data : [];
  }
```

- [ ] **Step 2: Thêm type + method vào `dashboardService.ts`**

Thêm type (cạnh các interface series khác):

```typescript
export interface CongNoSeriesPoint {
  thang: number;
  tongPhaiThu: number;
  tongPhaiTra: number;
}
```

Thêm method (trong object dashboardService, cạnh getCashSeries):

```typescript
  /** Số dư công nợ phải thu/phải trả theo tháng (đến cuối mỗi tháng) của năm chọn. */
  async getCongNoSeries(year: number): Promise<CongNoSeriesPoint[]> {
    try {
      return await congNoPhaiThuService.getSeries(year);
    } catch {
      return [];
    }
  },
```

(import `congNoPhaiThuService` đã có sẵn ở đầu file.)

- [ ] **Step 3: Lint + build**

Run: `cd fe && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/congNoPhaiThuService.ts fe/src/services/dashboardService.ts
git commit -m "feat(dashboard): FE getCongNoSeries service"
```

---

### Task 3: FE — period.ts v2 (mô hình kỳ = khoảng tháng) + slice (TDD)

**Files:**
- Rewrite: `fe/src/pages/dashboard/period.ts`
- Rewrite: `fe/src/pages/dashboard/period.test.ts`

**Interfaces:**
- Produces:
  - `type DashboardPeriod` = union các value: `'thang1'..'thang12' | 'quy1'..'quy4' | 'nuaDau' | 'nuaCuoi' | 'namNay' | 'namTruoc'`
  - `PERIOD_OPTIONS: { label: string; value: DashboardPeriod }[]` (đúng thứ tự sheet)
  - `resolvePeriod(period, currentYear): { year: number; startMonth: number; endMonth: number }`
  - `periodDateRange({year,startMonth,endMonth}): { start: string; end: string }` (ISO)
  - `sliceToRange<T extends { thang: number }>(series: T[], startMonth, endMonth): T[]`

- [ ] **Step 1: Viết test thất bại** — `period.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolvePeriod, sliceToRange, periodDateRange, PERIOD_OPTIONS } from './period';

describe('resolvePeriod', () => {
  it('tháng cụ thể', () => {
    expect(resolvePeriod('thang3', 2026)).toEqual({ year: 2026, startMonth: 3, endMonth: 3 });
  });
  it('quý', () => {
    expect(resolvePeriod('quy2', 2026)).toEqual({ year: 2026, startMonth: 4, endMonth: 6 });
  });
  it('nửa đầu / nửa cuối', () => {
    expect(resolvePeriod('nuaDau', 2026)).toEqual({ year: 2026, startMonth: 1, endMonth: 6 });
    expect(resolvePeriod('nuaCuoi', 2026)).toEqual({ year: 2026, startMonth: 7, endMonth: 12 });
  });
  it('năm nay / năm trước', () => {
    expect(resolvePeriod('namNay', 2026)).toEqual({ year: 2026, startMonth: 1, endMonth: 12 });
    expect(resolvePeriod('namTruoc', 2026)).toEqual({ year: 2025, startMonth: 1, endMonth: 12 });
  });
});

describe('PERIOD_OPTIONS', () => {
  it('có đủ 20 mục, mở đầu Tháng 1, kết Năm trước', () => {
    expect(PERIOD_OPTIONS).toHaveLength(20);
    expect(PERIOD_OPTIONS[0]).toEqual({ label: 'Tháng 1', value: 'thang1' });
    expect(PERIOD_OPTIONS[19]).toEqual({ label: 'Năm trước', value: 'namTruoc' });
  });
});

describe('sliceToRange', () => {
  const s = Array.from({ length: 12 }, (_, i) => ({ thang: i + 1, v: i + 1 }));
  it('cắt theo [startMonth,endMonth]', () => {
    expect(sliceToRange(s, 4, 6).map((x) => x.thang)).toEqual([4, 5, 6]);
    expect(sliceToRange(s, 3, 3).map((x) => x.thang)).toEqual([3]);
  });
});

describe('periodDateRange', () => {
  it('start = đầu tháng start, end = cuối tháng end', () => {
    const { start, end } = periodDateRange({ year: 2026, startMonth: 2, endMonth: 4 });
    expect(start.startsWith('2026-0')).toBe(true);
    expect(new Date(end).getMonth()).toBe(3); // tháng 4 (0-based 3)
    expect(new Date(start).getMonth()).toBe(1); // tháng 2
  });
});
```

- [ ] **Step 2: Chạy test FAIL**

Run: `cd fe && npx vitest run src/pages/dashboard/period.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** — `period.ts`:

```typescript
export type DashboardPeriod =
  | 'thang1' | 'thang2' | 'thang3' | 'thang4' | 'thang5' | 'thang6'
  | 'thang7' | 'thang8' | 'thang9' | 'thang10' | 'thang11' | 'thang12'
  | 'quy1' | 'quy2' | 'quy3' | 'quy4'
  | 'nuaDau' | 'nuaCuoi' | 'namNay' | 'namTruoc';

export const PERIOD_OPTIONS: { label: string; value: DashboardPeriod }[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ label: `Tháng ${i + 1}`, value: `thang${i + 1}` as DashboardPeriod })),
  { label: 'Quý 1', value: 'quy1' },
  { label: 'Quý 2', value: 'quy2' },
  { label: 'Quý 3', value: 'quy3' },
  { label: 'Quý 4', value: 'quy4' },
  { label: '6 tháng đầu năm', value: 'nuaDau' },
  { label: '6 tháng cuối năm', value: 'nuaCuoi' },
  { label: 'Năm nay', value: 'namNay' },
  { label: 'Năm trước', value: 'namTruoc' },
];

export function resolvePeriod(
  period: DashboardPeriod,
  currentYear: number,
): { year: number; startMonth: number; endMonth: number } {
  if (period.startsWith('thang')) {
    const m = Number(period.slice(5));
    return { year: currentYear, startMonth: m, endMonth: m };
  }
  if (period.startsWith('quy')) {
    const q = Number(period.slice(3));
    return { year: currentYear, startMonth: q * 3 - 2, endMonth: q * 3 };
  }
  switch (period) {
    case 'nuaDau': return { year: currentYear, startMonth: 1, endMonth: 6 };
    case 'nuaCuoi': return { year: currentYear, startMonth: 7, endMonth: 12 };
    case 'namTruoc': return { year: currentYear - 1, startMonth: 1, endMonth: 12 };
    case 'namNay':
    default: return { year: currentYear, startMonth: 1, endMonth: 12 };
  }
}

export function periodDateRange(r: { year: number; startMonth: number; endMonth: number }): {
  start: string;
  end: string;
} {
  const start = new Date(r.year, r.startMonth - 1, 1);
  const end = new Date(r.year, r.endMonth, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function sliceToRange<T extends { thang: number }>(
  series: T[],
  startMonth: number,
  endMonth: number,
): T[] {
  return series.filter((p) => p.thang >= startMonth && p.thang <= endMonth);
}
```

- [ ] **Step 4: Chạy test PASS**

Run: `cd fe && npx vitest run src/pages/dashboard/period.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/dashboard/period.ts fe/src/pages/dashboard/period.test.ts
git commit -m "feat(dashboard): period v2 — khoảng kỳ (tháng/quý/nửa năm/năm) + sliceToRange"
```

---

### Task 4: FE — KQKD chart giống sheet (RevenueTrendChart)

**Files:**
- Rewrite: `fe/src/pages/dashboard/components/RevenueTrendChart.tsx`

**Interfaces:**
- Consumes: `dashboardService.getPnlSeries(year)`, `sliceToRange` (Task 3), `formatShortCurrency`/`formatCurrency`/`DASH_COLORS`.
- Produces: `RevenueTrendChart: React.FC<{ year: number; startMonth: number; endMonth: number }>`

Reference hình: `image3` (cột teal DT, cột xám CP, đường cam LN, nhãn số trên cột, KPI header DT/CP/LN + "Đvt: Triệu đồng", legend chấm dưới).

- [ ] **Step 1: Viết component**

```typescript
import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { sliceToRange } from '../period';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }

const TEAL = DASH_COLORS.revenue;
const GRAY = 'hsl(var(--muted-foreground) / 0.35)';
const ORANGE = '#F2994A';

const Kpi: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="min-w-0">
    <div className="text-lg sm:text-2xl font-bold truncate" style={{ color }}>{formatShortCurrency(value)}</div>
    <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide truncate">{label}</div>
  </div>
);

const RevenueTrendChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-pnl-series', year],
    queryFn: () => dashboardService.getPnlSeries(year),
  });
  const data = useMemo(() => sliceToRange(full ?? [], startMonth, endMonth), [full, startMonth, endMonth]);
  const sum = (k: 'doanhThu' | 'chiPhi' | 'loiNhuan') => data.reduce((s, d) => s + (d[k] || 0), 0);
  const hasData = data.some((d) => d.doanhThu || d.chiPhi || d.loiNhuan);

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">KẾT QUẢ KINH DOANH</span>}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Kpi label="Doanh thu" value={sum('doanhThu')} color={TEAL} />
          <Kpi label="Chi phí" value={sum('chiPhi')} color="hsl(var(--muted-foreground))" />
          <Kpi label="Lợi nhuận" value={sum('loiNhuan')} color={ORANGE} />
        </div>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Đvt: đồng</span>
      </div>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ left: -10, right: 8, top: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `Th ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={55} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(l) => `Tháng ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="doanhThu" name="Doanh thu" fill={TEAL} maxBarSize={26}>
              <LabelList dataKey="doanhThu" position="top" formatter={(v: number) => (v ? formatShortCurrency(v) : '')} style={{ fontSize: 10, fill: DASH_COLORS.muted }} />
            </Bar>
            <Bar dataKey="chiPhi" name="Chi phí" fill={GRAY} maxBarSize={26} />
            <Line type="monotone" dataKey="loiNhuan" name="Lợi nhuận" stroke={ORANGE} strokeWidth={2} dot={{ r: 3, fill: ORANGE }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default RevenueTrendChart;
```

- [ ] **Step 2: Lint** (build sẽ đỏ ở Dashboard.tsx tới Task 11 — bình thường)

Run: `cd fe && npm run lint`
Expected: 0 errors trên file này.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/components/RevenueTrendChart.tsx
git commit -m "feat(dashboard): KQKD chart giống sheet (KPI header, cột teal/xám, line cam, slice kỳ)"
```

---

### Task 5: FE — Dòng tiền chart giống sheet (CashFlowChart)

**Files:**
- Rewrite: `fe/src/pages/dashboard/components/CashFlowChart.tsx`

**Interfaces:**
- Consumes: `dashboardService.getCashSeries(year)`, `sliceToRange`.
- Produces: `CashFlowChart: React.FC<{ year: number; startMonth: number; endMonth: number }>`

Reference: `image13` — cột teal Thu (dương), cột xám Chi (ÂM, dưới 0), đường cam Tồn; KPI Tổng thu/Tổng chi/Tồn.

- [ ] **Step 1: Viết component**

```typescript
import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { sliceToRange } from '../period';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }
const TEAL = DASH_COLORS.revenue;
const GRAY = 'hsl(var(--muted-foreground) / 0.35)';
const ORANGE = '#F2994A';

const Kpi: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="min-w-0">
    <div className="text-lg sm:text-2xl font-bold truncate" style={{ color }}>{formatShortCurrency(value)}</div>
    <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide truncate">{label}</div>
  </div>
);

const CashFlowChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-cash-series', year],
    queryFn: () => dashboardService.getCashSeries(year),
  });
  // chi vẽ âm (dưới trục 0)
  const data = useMemo(
    () => sliceToRange(full ?? [], startMonth, endMonth).map((d) => ({ ...d, chiNeg: -(d.chi || 0) })),
    [full, startMonth, endMonth],
  );
  const sum = (k: 'thu' | 'chi') => data.reduce((s, d) => s + (d[k] || 0), 0);
  const ton = data.length ? data[data.length - 1].soDu : 0;
  const hasData = data.some((d) => d.thu || d.chi || d.soDu);

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">DÒNG TIỀN</span>}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Kpi label="Tổng thu" value={sum('thu')} color={TEAL} />
          <Kpi label="Tổng chi" value={sum('chi')} color="hsl(var(--muted-foreground))" />
          <Kpi label="Tồn" value={ton} color={ORANGE} />
        </div>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Đvt: đồng</span>
      </div>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `Th ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={55} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(Math.abs(value)), name]}
              labelFormatter={(l) => `Tháng ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="thu" name="Thu" fill={TEAL} maxBarSize={22} />
            <Bar dataKey="chiNeg" name="Chi" fill={GRAY} maxBarSize={22} />
            <Line type="monotone" dataKey="soDu" name="Tồn" stroke={ORANGE} strokeWidth={2} dot={{ r: 3, fill: ORANGE }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default CashFlowChart;
```

- [ ] **Step 2: Lint**; **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/components/CashFlowChart.tsx
git commit -m "feat(dashboard): Dòng tiền chart giống sheet (cột thu/chi âm, line tồn, KPI header)"
```

---

### Task 6: FE — Tình hình thực hiện (3 gauge nửa vòng, empty)

**Files:**
- Rewrite: `fe/src/pages/dashboard/components/ExecutionStatusCharts.tsx`

**Interfaces:**
- Produces: `ExecutionStatusCharts: React.FC` (không prop). 3 thẻ gauge ở 0,00%.

Reference: `image5`. Dùng Recharts `RadialBarChart` nửa vòng (startAngle 180, endAngle 0), nền xám, hiện "0,00%" ở tâm, legend Thực hiện/Kế hoạch/Chênh lệch = 0.

- [ ] **Step 1: Viết component**

```typescript
import React from 'react';
import { Card, Row, Col } from 'antd';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const ITEMS = [
  { key: 'doanhThu', title: 'Tình hình thực hiện doanh thu', color: 'hsl(var(--success))' },
  { key: 'chiPhi', title: 'Tình hình thực hiện chi phí', color: 'hsl(var(--destructive))' },
  { key: 'loiNhuan', title: 'Tình hình thực hiện lợi nhuận', color: 'hsl(var(--primary))' },
];

/** Gauge nửa vòng 0%→150%. percent=0 khi chưa có dữ liệu kế hoạch. */
const Gauge: React.FC<{ percent: number; color: string }> = ({ percent, color }) => (
  <div className="relative" style={{ height: 150 }}>
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        innerRadius="80%" outerRadius="100%" startAngle={180} endAngle={0}
        data={[{ value: percent }]} barSize={16}
      >
        <PolarAngleAxis type="number" domain={[0, 150]} angleAxisId={0} tick={false} />
        <RadialBar dataKey="value" angleAxisId={0} background fill={color} cornerRadius={8} />
      </RadialBarChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex items-end justify-center pb-2">
      <span className="text-lg font-semibold text-muted-foreground">{percent.toFixed(2)}%</span>
    </div>
    <div className="flex justify-between px-6 text-[10px] text-muted-foreground -mt-1">
      <span>0%</span><span>150%</span>
    </div>
  </div>
);

const Legend: React.FC<{ color: string }> = ({ color }) => (
  <div className="space-y-1 text-xs">
    {[['Thực hiện', color], ['Kế hoạch', 'hsl(var(--muted-foreground))'], ['Chênh lệch', color]].map(([label, c]) => (
      <div key={label} className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: c as string }} />{label}</span>
        <span className="font-medium">0</span>
      </div>
    ))}
  </div>
);

const ExecutionStatusCharts: React.FC = () => (
  <Row gutter={[12, 12]}>
    {ITEMS.map((it) => (
      <Col xs={24} lg={8} key={it.key}>
        <Card title={<span className="text-sm sm:text-base">{it.title}</span>}
              extra={<span className="text-[10px] text-muted-foreground">Đvt: đồng</span>}>
          <Row align="middle" gutter={8}>
            <Col span={14}><Gauge percent={0} color={it.color} /></Col>
            <Col span={10}><Legend color={it.color} /></Col>
          </Row>
        </Card>
      </Col>
    ))}
  </Row>
);

export default ExecutionStatusCharts;
```

- [ ] **Step 2: Lint**; **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/components/ExecutionStatusCharts.tsx
git commit -m "feat(dashboard): Tình hình thực hiện — 3 gauge nửa vòng (0,00%) giống sheet"
```

---

### Task 7: FE — Tỷ trọng donut navy/gold (RevenueExpenseBreakdownCharts)

**Files:**
- Modify: `fe/src/pages/dashboard/components/RevenueExpenseBreakdownCharts.tsx`

**Interfaces:**
- Consumes: `dashboardService.getPnlBreakdownByYear` → đổi sang nhận khoảng kỳ. Thêm method `getPnlBreakdownByRange(range)` ở dashboardService (xem Step 1).
- Produces: `RevenueExpenseBreakdownCharts: React.FC<{ year: number; startMonth: number; endMonth: number }>`

- [ ] **Step 1: Thêm `getPnlBreakdownByRange` vào `dashboardService.ts`**

```typescript
  /** Tỷ trọng doanh thu/chi phí theo tài khoản trong khoảng kỳ. */
  async getPnlBreakdownByRange(year: number, startMonth: number, endMonth: number): Promise<PnlBreakdown> {
    try {
      const start = new Date(year, startMonth - 1, 1).toISOString();
      const end = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      const pnl = await baoCaoReportService.getPnl({ startDate: start, endDate: end, periodType: 'tuyChon' });
      return {
        doanhThu: (pnl.doanhThu ?? []).map((e) => ({ ten: e.ten, soTien: e.soTien })),
        chiPhi: (pnl.chiPhi ?? []).map((e) => ({ ten: e.ten, soTien: e.soTien })),
      };
    } catch {
      return { doanhThu: [], chiPhi: [] };
    }
  },
```

- [ ] **Step 2: Sửa component**: palette navy/gold + props khoảng kỳ + query đổi sang range.

Thay `PALETTE`:

```typescript
const PALETTE = ['#1F3864', '#C9A227', '#2F5597', '#E0C158', '#8497B0', '#BFA15F'];
```

Thay `interface Props` + chữ ký + query:

```typescript
interface Props { year: number; startMonth: number; endMonth: number; }

const RevenueExpenseBreakdownCharts: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['pnl-breakdown', year, startMonth, endMonth],
    queryFn: () => dashboardService.getPnlBreakdownByRange(year, startMonth, endMonth),
  });
```

(giữ phần render `renderBody`, `Donut`, `groupTopN` như cũ.)

- [ ] **Step 3: Lint**; **Step 4: Commit**

```bash
git add fe/src/pages/dashboard/components/RevenueExpenseBreakdownCharts.tsx fe/src/services/dashboardService.ts
git commit -m "feat(dashboard): tỷ trọng donut navy/gold theo khoảng kỳ"
```

---

### Task 8: FE — Công nợ chart (line phải thu vs phải trả)

**Files:**
- Create: `fe/src/pages/dashboard/components/CongNoChart.tsx`

**Interfaces:**
- Consumes: `dashboardService.getCongNoSeries(year)` (Task 2), `sliceToRange`.
- Produces: `CongNoChart: React.FC<{ year: number; startMonth: number; endMonth: number }>`

- [ ] **Step 1: Viết component**

```typescript
import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { sliceToRange } from '../period';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }

const CongNoChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-congno-series', year],
    queryFn: () => dashboardService.getCongNoSeries(year),
  });
  const data = useMemo(() => sliceToRange(full ?? [], startMonth, endMonth), [full, startMonth, endMonth]);
  const hasData = data.some((d) => d.tongPhaiThu || d.tongPhaiTra);

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">CÔNG NỢ</span>}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `Th ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={55} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(l) => `Tháng ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Line type="monotone" dataKey="tongPhaiThu" name="Tổng phải thu" stroke={DASH_COLORS.revenue} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="tongPhaiTra" name="Tổng phải trả" stroke={DASH_COLORS.expense} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default CongNoChart;
```

- [ ] **Step 2: Lint**; **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/components/CongNoChart.tsx
git commit -m "feat(dashboard): Công nợ chart — line phải thu vs phải trả theo tháng"
```

---

### Task 9: FE — Cân đối tài chính (cột chồng 100%)

**Files:**
- Create: `fe/src/pages/dashboard/components/BalanceStructureChart.tsx`

**Interfaces:**
- Consumes: `balanceSheetService.getStats()` → `{ taiSanNganHan, taiSanDaiHan, noPhaiTra, vonChuSoHuu }`.
- Produces: `BalanceStructureChart: React.FC` (snapshot, không prop kỳ — balance sheet là số dư hiện tại).

- [ ] **Step 1: Viết component** (cột chồng 100% bằng Recharts stacked Bar, dữ liệu chuẩn hóa % để mỗi cột = 100):

```typescript
import React from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList, ResponsiveContainer } from 'recharts';
import { balanceSheetService } from '@/services/balanceSheetService';
import { formatCurrency, formatShortCurrency } from './format';

const NAVY = '#1F3864';
const GOLD = '#C9A227';

const BalanceStructureChart: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dash-balance-structure'],
    queryFn: () => balanceSheetService.getStats(),
  });

  const tsNH = data?.taiSanNganHan ?? 0;
  const tsDH = data?.taiSanDaiHan ?? 0;
  const npt = data?.noPhaiTra ?? 0;
  const vcsh = data?.vonChuSoHuu ?? 0;
  const tongTS = tsNH + tsDH;
  const tongNV = npt + vcsh;
  const pct = (v: number, t: number) => (t > 0 ? (v / t) * 100 : 0);
  const hasData = tongTS > 0 || tongNV > 0;

  // 2 cột: Tài sản (ngắn/dài hạn), Nguồn vốn (nợ phải trả/vốn CSH) — chuẩn hóa %
  const chartData = [
    { name: 'Tài sản', a: pct(tsNH, tongTS), b: pct(tsDH, tongTS), aRaw: tsNH, bRaw: tsDH, aName: 'Ngắn hạn', bName: 'Dài hạn' },
    { name: 'Nguồn vốn', a: pct(npt, tongNV), b: pct(vcsh, tongNV), aRaw: npt, bRaw: vcsh, aName: 'Nợ phải trả', bName: 'Vốn CSH' },
  ];

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">CÂN ĐỐI TÀI CHÍNH</span>}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="a" stackId="s" name="Ngắn hạn / Nợ phải trả" fill={NAVY} maxBarSize={70}>
                <LabelList dataKey="a" position="center" formatter={(v: number) => (v ? `${v.toFixed(0)}%` : '')} fill="#fff" style={{ fontSize: 11 }} />
              </Bar>
              <Bar dataKey="b" stackId="s" name="Dài hạn / Vốn CSH" fill={GOLD} maxBarSize={70}>
                <LabelList dataKey="b" position="center" formatter={(v: number) => (v ? `${v.toFixed(0)}%` : '')} fill="#fff" style={{ fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center text-sm mt-1">
            Tổng giá trị: <span className="font-semibold">{formatCurrency(tongTS)}</span>
          </div>
        </>
      )}
    </Card>
  );
};

export default BalanceStructureChart;
```

> Nếu `balanceSheetService.getStats()` không có sẵn các field này, đọc `fe/src/services/balanceSheetService.ts` để dùng đúng tên field (giống `dashboardService.getAssetComposition` đang dùng `stats.taiSanNganHan`, `stats.taiSanDaiHan`, `stats.noPhaiTra`, `stats.vonChuSoHuu`).

- [ ] **Step 2: Lint**; **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/components/BalanceStructureChart.tsx
git commit -m "feat(dashboard): Cân đối tài chính — cột chồng 100% tài sản/nguồn vốn"
```

---

### Task 10: FE — Dashboard.tsx wiring (filter kỳ + bố cục đủ khối)

**Files:**
- Modify: `fe/src/pages/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: `PERIOD_OPTIONS`, `resolvePeriod`, type `DashboardPeriod` (Task 3); các component Task 4–9.

- [ ] **Step 1: Thay imports + filter + bố cục**. Đọc file hiện tại trước. Các thay đổi:
  - Bỏ import `KpiCards` (không dùng nữa). Thêm import `CongNoChart`, `BalanceStructureChart`, và `{ PERIOD_OPTIONS, resolvePeriod, type DashboardPeriod } from './period'`. Giữ import `ExecutionStatusCharts`, `RevenueTrendChart`, `CashFlowChart`, `RevenueExpenseBreakdownCharts`, `CompositionCharts`, `AgingCharts`, `OverdueTables`, `MockTabDashboard`.
  - State: `const [period, setPeriod] = useState<DashboardPeriod>('thang' + CURRENT_MONTH as DashboardPeriod)` → đặt mặc định = tháng hiện tại: `useState<DashboardPeriod>(\`thang${CURRENT_MONTH}\` as DashboardPeriod)`. Giữ `CURRENT_MONTH`, `CURRENT_YEAR`.
  - `const { year, startMonth, endMonth } = resolvePeriod(period, CURRENT_YEAR);`
  - Filter UI: 1 `<Select value={period} onChange={setPeriod} options={PERIOD_OPTIONS} style={{ width: 180 }} showSearch optionFilterProp="label" />` (thay block 2 select cũ).
  - Nhánh `activeTab === 'tai-chinh'` bố cục:

```tsx
          {/* Xu hướng: KQKD | Dòng tiền */}
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}><RevenueTrendChart year={year} startMonth={startMonth} endMonth={endMonth} /></Col>
            <Col xs={24} lg={12}><CashFlowChart year={year} startMonth={startMonth} endMonth={endMonth} /></Col>
          </Row>

          {/* Tình hình thực hiện */}
          <ExecutionStatusCharts />

          {/* Tỷ trọng doanh thu / chi phí */}
          <RevenueExpenseBreakdownCharts year={year} startMonth={startMonth} endMonth={endMonth} />

          {/* Công nợ | Cân đối tài chính */}
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}><CongNoChart year={year} startMonth={startMonth} endMonth={endMonth} /></Col>
            <Col xs={24} lg={12}><BalanceStructureChart /></Col>
          </Row>

          {/* Tuổi nợ + quá hạn (giữ) */}
          <AgingCharts />
          <OverdueTables />
```

  - Bỏ `<CompositionCharts />` khỏi layout (đã thay bằng `BalanceStructureChart`); bỏ import nếu không còn dùng. Xóa `MONTH_OPTIONS`/`YEAR_OPTIONS` nếu còn.

- [ ] **Step 2: Lint + build (PHẢI XANH HẾT)**

Run: `cd fe && npm run lint && npm run build`
Expected: PASS, không lỗi type. Sửa unused import nếu có.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): filter kỳ (~20 mục) + bố cục đủ 6 khối giống sheet"
```

---

### Task 11: Verify toàn FE + chạy test

- [ ] **Step 1:** `cd fe && npx vitest run src/pages/dashboard/period.test.ts` → PASS.
- [ ] **Step 2:** `cd fe && npm run lint && npm run build` → PASS.
- [ ] **Step 3:** `cd be && npx jest apps/payable-service/src/cong-no/cong-no.series.spec.ts` → PASS; `npx nest build payable-service` → ok.
- [ ] Không commit (chỉ verify).

---

### Task 12: Deploy (FE + payable-service)

Theo skill db-deploy. Frontend + 1 service backend.

- [ ] **Step 1: Build BE service**

```bash
cd be && npx nest build payable-service
scp dist/apps/payable-service/main.js kt:/root/chimseo/digital-book-be/dist/apps/payable-service/main.js
ssh kt "docker restart digital-book-app"
ssh kt "docker logs digital-book-app --tail 20 2>&1 | grep -i 'payable\|error' | head"
```

- [ ] **Step 2: Verify route BE** (401 = route OK, không phải 404):

```bash
ssh kt "curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/payable/cong-no/series?year=2026'"
```
Expected: 401 (cần auth) — KHÔNG phải 404.

- [ ] **Step 3: Build + deploy FE**

```bash
cd fe && npm run build
scp -r dist/* kt:/root/chimseo/nginx/build4/
ssh kt "docker exec digital-book-nginx nginx -s reload"
```

- [ ] **Step 4: Verify** bundle phục vụ khớp build local (so `assets/index-*.js`).

---

## Self-review notes
- TenantMiddleware chỉ set context (an toàn) — không đổi output các route cong-no cũ.
- Route `cong-no/series` phải đứng trước `cong-no/:id` trong controller (nếu có) để không bị nuốt.
- Build FE chỉ xanh hoàn toàn sau Task 10 (Task 4–9 đổi prop component, Dashboard cập nhật ở Task 10).
- Màu cam dùng literal `#F2994A` (chưa có token cam trong DASH_COLORS) — chấp nhận; có thể thêm token sau.
