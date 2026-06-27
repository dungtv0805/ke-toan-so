# Dashboard "Tổng quan" — Lọc kỳ & Tình hình thực hiện — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi bộ lọc tab Tài chính của trang `/` sang 1 dropdown kỳ (12 tháng / 4 quý / Năm nay / Năm trước), thêm khối "Tình hình thực hiện" (empty state) và chuẩn hóa "chưa có dữ liệu → để trống".

**Architecture:** Frontend-only. Một module thuần `period.ts` chứa logic resolve kỳ + gộp series theo quý (có unit test vitest). Các chart component nhận thêm `granularity` và tự gộp quý client-side. `dashboardService` thêm 2 hàm year-range cho KPI và tỷ trọng. `Dashboard.tsx` thay 2 select tháng/năm bằng 1 dropdown kỳ. Không đụng backend.

**Tech Stack:** React 18 + TypeScript, Ant Design, Recharts, TanStack React Query, Vitest.

## Global Constraints

- Frontend-only. KHÔNG sửa backend (`be/`). Dùng API hiện có.
- Component test = `npm run build` + `npm run lint` pass (dự án không test React component). Hàm thuần dùng vitest.
- Giữ pattern hiện có: antd `Card`/`Empty`/`Skeleton`, Recharts, `useQuery`, helpers trong `components/format.ts` (`formatCurrency`, `formatShortCurrency`, `DASH_COLORS`).
- Path alias FE: `@/*` → `fe/src/*`.
- Tất cả lệnh chạy trong thư mục `fe/`.
- "Tình hình thực hiện" luôn empty (backend không có module kế hoạch) — không gọi API kế hoạch.

---

### Task 1: Module `period.ts` — resolve kỳ + gộp series theo quý (TDD)

**Files:**
- Create: `fe/src/pages/dashboard/period.ts`
- Test: `fe/src/pages/dashboard/period.test.ts`

**Interfaces:**
- Consumes: type `PnlSeriesPoint`, `CashSeriesPoint` từ `@/services/dashboardService`.
- Produces:
  - `type DashboardPeriod = 'thang12' | 'quy4' | 'namNay' | 'namTruoc'`
  - `type Granularity = 'month' | 'quarter'`
  - `resolvePeriod(period: DashboardPeriod, currentYear: number): { year: number; granularity: Granularity }`
  - `pnlSeriesToQuarters(points: PnlSeriesPoint[]): PnlSeriesPoint[]` (trả 4 điểm, field `thang` = số quý 1..4, các giá trị cộng dồn)
  - `cashSeriesToQuarters(points: CashSeriesPoint[]): CashSeriesPoint[]` (4 điểm, `thu`/`chi` cộng dồn, `soDu` = tháng cuối của quý)

- [ ] **Step 1: Viết test thất bại**

Create `fe/src/pages/dashboard/period.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolvePeriod, pnlSeriesToQuarters, cashSeriesToQuarters } from './period';
import type { PnlSeriesPoint, CashSeriesPoint } from '@/services/dashboardService';

describe('resolvePeriod', () => {
  it('12 tháng → năm nay, month', () => {
    expect(resolvePeriod('thang12', 2026)).toEqual({ year: 2026, granularity: 'month' });
  });
  it('4 quý → năm nay, quarter', () => {
    expect(resolvePeriod('quy4', 2026)).toEqual({ year: 2026, granularity: 'quarter' });
  });
  it('Năm nay → năm nay, month', () => {
    expect(resolvePeriod('namNay', 2026)).toEqual({ year: 2026, granularity: 'month' });
  });
  it('Năm trước → năm trước, month', () => {
    expect(resolvePeriod('namTruoc', 2026)).toEqual({ year: 2025, granularity: 'month' });
  });
});

const pnl12: PnlSeriesPoint[] = Array.from({ length: 12 }, (_, i) => ({
  thang: i + 1,
  doanhThu: i + 1,      // T1=1 ... T12=12
  chiPhi: 1,
  loiNhuan: i,
}));

describe('pnlSeriesToQuarters', () => {
  it('gộp 12 tháng thành 4 quý, cộng dồn', () => {
    const q = pnlSeriesToQuarters(pnl12);
    expect(q).toHaveLength(4);
    expect(q[0]).toEqual({ thang: 1, doanhThu: 6, chiPhi: 3, loiNhuan: 3 });   // T1+T2+T3 = 1+2+3
    expect(q[3]).toEqual({ thang: 4, doanhThu: 33, chiPhi: 3, loiNhuan: 30 }); // T10+T11+T12 = 10+11+12
  });
});

const cash12: CashSeriesPoint[] = Array.from({ length: 12 }, (_, i) => ({
  thang: i + 1,
  thu: 1,
  chi: 1,
  soDu: (i + 1) * 10,   // T1=10 ... T12=120
}));

describe('cashSeriesToQuarters', () => {
  it('thu/chi cộng dồn, soDu lấy tháng cuối quý', () => {
    const q = cashSeriesToQuarters(cash12);
    expect(q).toHaveLength(4);
    expect(q[0]).toEqual({ thang: 1, thu: 3, chi: 3, soDu: 30 });   // soDu của T3
    expect(q[3]).toEqual({ thang: 4, thu: 3, chi: 3, soDu: 120 });  // soDu của T12
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/dashboard/period.test.ts`
Expected: FAIL — "Failed to resolve import './period'" / function not defined.

- [ ] **Step 3: Viết implementation tối thiểu**

Create `fe/src/pages/dashboard/period.ts`:

```typescript
import type { PnlSeriesPoint, CashSeriesPoint } from '@/services/dashboardService';

export type DashboardPeriod = 'thang12' | 'quy4' | 'namNay' | 'namTruoc';
export type Granularity = 'month' | 'quarter';

/** Suy ra năm + độ chia trục từ kỳ chọn. */
export function resolvePeriod(
  period: DashboardPeriod,
  currentYear: number,
): { year: number; granularity: Granularity } {
  switch (period) {
    case 'quy4':
      return { year: currentYear, granularity: 'quarter' };
    case 'namTruoc':
      return { year: currentYear - 1, granularity: 'month' };
    case 'thang12':
    case 'namNay':
    default:
      return { year: currentYear, granularity: 'month' };
  }
}

/** Gộp 12 điểm tháng thành 4 điểm quý; tất cả giá trị là dòng (flow) nên cộng dồn. */
export function pnlSeriesToQuarters(points: PnlSeriesPoint[]): PnlSeriesPoint[] {
  return [0, 1, 2, 3].map((qi) => {
    const slice = points.filter((p) => Math.ceil(p.thang / 3) === qi + 1);
    return {
      thang: qi + 1,
      doanhThu: slice.reduce((s, p) => s + p.doanhThu, 0),
      chiPhi: slice.reduce((s, p) => s + p.chiPhi, 0),
      loiNhuan: slice.reduce((s, p) => s + p.loiNhuan, 0),
    };
  });
}

/** Gộp dòng tiền theo quý: thu/chi cộng dồn, soDu = số dư cuối kỳ của tháng cuối quý. */
export function cashSeriesToQuarters(points: CashSeriesPoint[]): CashSeriesPoint[] {
  return [0, 1, 2, 3].map((qi) => {
    const slice = points.filter((p) => Math.ceil(p.thang / 3) === qi + 1);
    const last = slice.length ? slice[slice.length - 1] : undefined;
    return {
      thang: qi + 1,
      thu: slice.reduce((s, p) => s + p.thu, 0),
      chi: slice.reduce((s, p) => s + p.chi, 0),
      soDu: last ? last.soDu : 0,
    };
  });
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/dashboard/period.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/dashboard/period.ts fe/src/pages/dashboard/period.test.ts
git commit -m "feat(dashboard): period resolver + quarterly aggregation helpers"
```

---

### Task 2: `dashboardService` — KPI & tỷ trọng theo cả năm

**Files:**
- Modify: `fe/src/services/dashboardService.ts` (thêm helper `yearRange` + 2 method)

**Interfaces:**
- Consumes: `soQuyService.getStats`, `baoCaoReportService.getPnl` (đã có).
- Produces:
  - `dashboardService.getKpiByYear(year: number): Promise<DashboardKpi>`
  - `dashboardService.getPnlBreakdownByYear(year: number): Promise<PnlBreakdown>`

- [ ] **Step 1: Thêm helper `yearRange`**

Trong `fe/src/services/dashboardService.ts`, ngay dưới hàm `monthRange` (kết thúc ở dòng ~85), thêm:

```typescript
function yearRange(year: number): { start: string; end: string } {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}
```

- [ ] **Step 2: Thêm `getKpiByYear` và `getPnlBreakdownByYear`**

Trong object `dashboardService`, ngay sau method `getKpi` (sau dòng `},` đóng `getKpi`, trước `getPnlSeries`), thêm:

```typescript
  /** KPI cho cả năm chọn (so với năm trước qua pnl comparison). */
  async getKpiByYear(year: number): Promise<DashboardKpi> {
    const { start, end } = yearRange(year);
    const [statsRes, pnlRes] = await Promise.allSettled([
      soQuyService.getStats(),
      baoCaoReportService.getPnl({ startDate: start, endDate: end, periodType: 'nam' }),
    ]);

    const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
    const pnl = pnlRes.status === 'fulfilled' ? pnlRes.value : null;

    const soDuQuy = stats?.tonCuoiKy ?? 0;
    const doanhThu = pnl?.tongDoanhThu ?? 0;
    const chiPhi = pnl?.tongChiPhi ?? 0;
    const loiNhuan = pnl?.loiNhuan ?? doanhThu - chiPhi;
    const prev = pnl?.kyTruoc;

    return {
      soDuQuy: { value: soDuQuy, delta: null },
      doanhThu: { value: doanhThu, delta: prev ? computeDelta(doanhThu, prev.tongDoanhThu) : null },
      chiPhi: { value: chiPhi, delta: prev ? computeDelta(chiPhi, prev.tongChiPhi) : null },
      loiNhuan: { value: loiNhuan, delta: prev ? computeDelta(loiNhuan, prev.loiNhuan) : null },
    };
  },
```

Và ngay sau method `getPnlBreakdown` (trước `getCashSeries`), thêm:

```typescript
  /** Tỷ trọng doanh thu/chi phí theo tài khoản, tính cho cả năm chọn. */
  async getPnlBreakdownByYear(year: number): Promise<PnlBreakdown> {
    try {
      const { start, end } = yearRange(year);
      const pnl = await baoCaoReportService.getPnl({
        startDate: start,
        endDate: end,
        periodType: 'nam',
      });
      return {
        doanhThu: (pnl.doanhThu ?? []).map((e) => ({ ten: e.ten, soTien: e.soTien })),
        chiPhi: (pnl.chiPhi ?? []).map((e) => ({ ten: e.ten, soTien: e.soTien })),
      };
    } catch {
      return { doanhThu: [], chiPhi: [] };
    }
  },
```

- [ ] **Step 3: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: PASS (không lỗi TS, không eslint error trên file vừa sửa).

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/dashboardService.ts
git commit -m "feat(dashboard): year-range KPI + breakdown service methods"
```

---

### Task 3: Component `ChartEmptyState` dùng chung

**Files:**
- Create: `fe/src/pages/dashboard/components/ChartEmptyState.tsx`

**Interfaces:**
- Produces: `default` export `ChartEmptyState: React.FC<{ description?: string; height?: number }>`

- [ ] **Step 1: Tạo component**

Create `fe/src/pages/dashboard/components/ChartEmptyState.tsx`:

```typescript
import React from 'react';
import { Empty } from 'antd';

interface Props {
  description?: string;
  height?: number;
}

/** Trạng thái "chưa có dữ liệu" dùng chung cho các chart, giữ chiều cao để không vỡ layout. */
const ChartEmptyState: React.FC<Props> = ({ description = 'Chưa có dữ liệu', height = 280 }) => (
  <Empty
    description={description}
    style={{ height }}
    className="flex flex-col items-center justify-center"
  />
);

export default ChartEmptyState;
```

- [ ] **Step 2: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/components/ChartEmptyState.tsx
git commit -m "feat(dashboard): shared ChartEmptyState component"
```

---

### Task 4: Component `ExecutionStatusCharts` (Tình hình thực hiện — empty state)

**Files:**
- Create: `fe/src/pages/dashboard/components/ExecutionStatusCharts.tsx`

**Interfaces:**
- Consumes: `ChartEmptyState` (Task 3).
- Produces: `default` export `ExecutionStatusCharts: React.FC` (không nhận prop — luôn empty cho đến khi có module kế hoạch).

- [ ] **Step 1: Tạo component**

Create `fe/src/pages/dashboard/components/ExecutionStatusCharts.tsx`:

```typescript
import React from 'react';
import { Card, Row, Col } from 'antd';
import { DashboardOutlined } from '@ant-design/icons';
import ChartEmptyState from './ChartEmptyState';

const ITEMS = [
  { key: 'doanhThu', title: 'Tình hình thực hiện doanh thu' },
  { key: 'chiPhi', title: 'Tình hình thực hiện chi phí' },
  { key: 'loiNhuan', title: 'Tình hình thực hiện lợi nhuận' },
];

/**
 * Khối Kế hoạch vs Thực hiện (DT/CP/LN).
 * Backend chưa có module kế hoạch → hiển thị empty state.
 * Khi có API kế hoạch chỉ cần truyền data vào, không phải dựng lại layout.
 */
const ExecutionStatusCharts: React.FC = () => (
  <Row gutter={[12, 12]}>
    {ITEMS.map((it) => (
      <Col xs={24} lg={8} key={it.key}>
        <Card
          title={
            <span className="text-sm sm:text-base">
              <DashboardOutlined className="text-primary mr-2" />
              {it.title}
            </span>
          }
        >
          <ChartEmptyState description="Chưa có dữ liệu kế hoạch" height={220} />
        </Card>
      </Col>
    ))}
  </Row>
);

export default ExecutionStatusCharts;
```

- [ ] **Step 2: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/components/ExecutionStatusCharts.tsx
git commit -m "feat(dashboard): ExecutionStatusCharts block (empty state)"
```

---

### Task 5: `RevenueTrendChart` + `CashFlowChart` nhận `granularity`

**Files:**
- Modify: `fe/src/pages/dashboard/components/RevenueTrendChart.tsx`
- Modify: `fe/src/pages/dashboard/components/CashFlowChart.tsx`

**Interfaces:**
- Consumes: `pnlSeriesToQuarters`, `cashSeriesToQuarters` từ `../period` (Task 1); `dashboardService.getPnlSeries`/`getCashSeries` (đã có).
- Produces:
  - `RevenueTrendChart` props: `{ year: number; granularity: 'month' | 'quarter' }`
  - `CashFlowChart` props: `{ year: number; granularity: 'month' | 'quarter' }`

- [ ] **Step 1: Sửa `RevenueTrendChart.tsx`**

Thay phần `import React` đầu file:

```typescript
import React, { useState, useMemo } from 'react';
```

Thêm import (sau dòng import `format`):

```typescript
import { pnlSeriesToQuarters } from '../period';
```

Thay block `interface Props { year: number; }` thành:

```typescript
interface Props {
  year: number;
  granularity: 'month' | 'quarter';
}
```

Thay chữ ký component + query + tính `hasData` (dòng `const RevenueTrendChart...` tới `const hasData = ...`):

```typescript
const RevenueTrendChart: React.FC<Props> = ({ year, granularity }) => {
  const [metric, setMetric] = useState<Metric>('all');
  const isQuarter = granularity === 'quarter';

  const { data: monthly, isLoading } = useQuery({
    queryKey: ['dash-pnl-series', year],
    queryFn: () => dashboardService.getPnlSeries(year),
  });

  const data = useMemo(() => {
    if (!monthly) return monthly;
    return isQuarter ? pnlSeriesToQuarters(monthly) : monthly;
  }, [monthly, isQuarter]);

  const hasData = !!data && data.some((d) => d.doanhThu || d.chiPhi || d.loiNhuan);
```

Đổi tiêu đề Card (dòng "Doanh thu – Chi phí – Lợi nhuận theo tháng"):

```typescript
          Doanh thu – Chi phí – Lợi nhuận theo {isQuarter ? 'quý' : 'tháng'}
```

Đổi `XAxis` tickFormatter và `Tooltip` labelFormatter:

```typescript
            <XAxis dataKey="thang" tickFormatter={(v) => `${isQuarter ? 'Q' : 'T'}${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
```

```typescript
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `${isQuarter ? 'Quý' : 'Tháng'} ${label}`}
            />
```

- [ ] **Step 2: Sửa `CashFlowChart.tsx`**

Thay `import React from 'react';`:

```typescript
import React, { useMemo } from 'react';
```

Thêm import (sau dòng import `format`):

```typescript
import { cashSeriesToQuarters } from '../period';
```

Thay `interface Props { year: number; }`:

```typescript
interface Props {
  year: number;
  granularity: 'month' | 'quarter';
}
```

Thay chữ ký + query + hasData:

```typescript
const CashFlowChart: React.FC<Props> = ({ year, granularity }) => {
  const isQuarter = granularity === 'quarter';

  const { data: monthly, isLoading } = useQuery({
    queryKey: ['dash-cash-series', year],
    queryFn: () => dashboardService.getCashSeries(year),
  });

  const data = useMemo(() => {
    if (!monthly) return monthly;
    return isQuarter ? cashSeriesToQuarters(monthly) : monthly;
  }, [monthly, isQuarter]);

  const hasData = !!data && data.some((d) => d.thu || d.chi || d.soDu);
```

Đổi `XAxis` và `Tooltip`:

```typescript
            <XAxis dataKey="thang" tickFormatter={(v) => `${isQuarter ? 'Q' : 'T'}${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
```

```typescript
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => `${isQuarter ? 'Quý' : 'Tháng'} ${label}`} />
```

- [ ] **Step 3: Build + lint**

Run: `cd fe && npm run lint && npm run build`
Expected: PASS. (Lưu ý: build sẽ báo lỗi type tại `Dashboard.tsx` vì chưa truyền `granularity` — sẽ sửa ở Task 7. Nếu muốn build sạch từng bước, làm Task 7 ngay sau Task 6 rồi build tổng. Tạm thời chấp nhận lỗi type ở `Dashboard.tsx` đến hết Task 7.)

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/dashboard/components/RevenueTrendChart.tsx fe/src/pages/dashboard/components/CashFlowChart.tsx
git commit -m "feat(dashboard): trend & cashflow charts support quarter granularity"
```

---

### Task 6: `KpiCards` + `RevenueExpenseBreakdownCharts` chuyển sang cả năm

**Files:**
- Modify: `fe/src/pages/dashboard/components/KpiCards.tsx`
- Modify: `fe/src/pages/dashboard/components/RevenueExpenseBreakdownCharts.tsx`

**Interfaces:**
- Consumes: `dashboardService.getKpiByYear`, `dashboardService.getPnlBreakdownByYear` (Task 2).
- Produces:
  - `KpiCards` props: `{ year: number }`
  - `RevenueExpenseBreakdownCharts` props: `{ year: number }`

- [ ] **Step 1: Sửa `KpiCards.tsx`**

Thay `interface KpiCardsProps { month: number; year: number; }`:

```typescript
interface KpiCardsProps {
  year: number;
}
```

Thay chữ ký + query (dòng `const KpiCards...` và block `useQuery`):

```typescript
const KpiCards: React.FC<KpiCardsProps> = ({ year }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['dash-kpi', year],
    queryFn: () => dashboardService.getKpiByYear(year),
  });
```

- [ ] **Step 2: Sửa `RevenueExpenseBreakdownCharts.tsx`**

Thay `interface Props { month: number; year: number; }`:

```typescript
interface Props {
  year: number;
}
```

Thay chữ ký + query:

```typescript
const RevenueExpenseBreakdownCharts: React.FC<Props> = ({ year }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['pnl-breakdown', year],
    queryFn: () => dashboardService.getPnlBreakdownByYear(year),
  });
```

- [ ] **Step 3: Build + lint** (vẫn còn lỗi type ở `Dashboard.tsx` — bình thường, sửa ở Task 7)

Run: `cd fe && npm run lint`
Expected: lint PASS trên 2 file vừa sửa.

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/dashboard/components/KpiCards.tsx fe/src/pages/dashboard/components/RevenueExpenseBreakdownCharts.tsx
git commit -m "feat(dashboard): KPI & breakdown charts use full-year range"
```

---

### Task 7: `Dashboard.tsx` — dropdown kỳ + nối các khối

**Files:**
- Modify: `fe/src/pages/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: `resolvePeriod`, type `DashboardPeriod` từ `./period`; tất cả component đã sửa ở Task 4–6 + `ExecutionStatusCharts` (Task 4).

- [ ] **Step 1: Cập nhật imports**

Thêm vào nhóm import component (sau `import AgingCharts ...`):

```typescript
import ExecutionStatusCharts from './components/ExecutionStatusCharts';
```

Thêm import period (sau import component cuối, trước `import { Row, Col }` hoặc bất kỳ vị trí import nào):

```typescript
import { resolvePeriod, type DashboardPeriod } from './period';
```

- [ ] **Step 2: Thay hằng option + state filter**

Xóa block `MONTH_OPTIONS` và `YEAR_OPTIONS` (dòng 27–35). Thêm:

```typescript
const PERIOD_OPTIONS: { label: string; value: DashboardPeriod }[] = [
  { label: '12 tháng', value: 'thang12' },
  { label: '4 quý', value: 'quy4' },
  { label: 'Năm nay', value: 'namNay' },
  { label: 'Năm trước', value: 'namTruoc' },
];
```

Thay 2 dòng state (`const [month, setMonth]...` và `const [year, setYear]...`):

```typescript
  const [period, setPeriod] = useState<DashboardPeriod>('thang12');
  const { year, granularity } = resolvePeriod(period, CURRENT_YEAR);
```

(`CURRENT_MONTH` không còn dùng — xóa dòng `const CURRENT_MONTH = now.getMonth() + 1;` để tránh lint unused.)

- [ ] **Step 3: Thay UI bộ lọc (2 Select → 1 Select kỳ)**

Thay nguyên block `<Space wrap> ... </Space>` (2 thẻ `Select` tháng/năm) bằng:

```typescript
        <Space wrap>
          <Select
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS}
            style={{ width: 140 }}
          />
        </Space>
```

- [ ] **Step 4: Cập nhật props các khối + chèn ExecutionStatusCharts**

Thay block JSX trong nhánh `activeTab === 'tai-chinh'` (từ `<KpiCards ...` đến `<OverdueTables />`):

```typescript
          {/* KPI */}
          <KpiCards year={year} />

          {/* Xu hướng */}
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <RevenueTrendChart year={year} granularity={granularity} />
            </Col>
            <Col xs={24} lg={12}>
              <CashFlowChart year={year} granularity={granularity} />
            </Col>
          </Row>

          {/* Tình hình thực hiện (Kế hoạch vs Thực hiện) — chưa có dữ liệu */}
          <ExecutionStatusCharts />

          {/* Tỷ trọng doanh thu / chi phí */}
          <RevenueExpenseBreakdownCharts year={year} />

          {/* Cơ cấu */}
          <CompositionCharts />

          {/* Tuổi nợ */}
          <AgingCharts />

          {/* Công nợ quá hạn */}
          <OverdueTables />
```

- [ ] **Step 5: Build + lint toàn bộ (giờ phải sạch)**

Run: `cd fe && npm run lint && npm run build`
Expected: PASS — không lỗi TS, không eslint error. (Nếu báo `month`/`CURRENT_MONTH` unused → đã xóa ở Step 2.)

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): kỳ dropdown (12 tháng/4 quý/năm nay/năm trước) + Tình hình thực hiện block"
```

---

### Task 8: Kiểm thử thủ công (smoke test)

**Files:** không thay đổi code.

- [ ] **Step 1: Chạy dev server**

Run: `cd fe && npm run dev`
Mở `http://localhost:5173/`, đăng nhập, vào trang Tổng quan (route `/`), tab Tài chính.

- [ ] **Step 2: Kiểm tra checklist**

- [ ] Dropdown kỳ có 4 mục: 12 tháng / 4 quý / Năm nay / Năm trước.
- [ ] Chọn "4 quý": biểu đồ KQKD và Dòng tiền đổi trục X sang Q1..Q4, tooltip ghi "Quý N".
- [ ] Chọn "Năm trước": dữ liệu đổi sang năm `CURRENT_YEAR - 1` (trục 12 tháng).
- [ ] Khối "Tình hình thực hiện" hiển thị 3 ô với "Chưa có dữ liệu kế hoạch", không vỡ layout.
- [ ] Các chart không có dữ liệu hiển thị "Chưa có dữ liệu" thay vì khung trắng.
- [ ] Các tab Nhân sự / Kinh doanh / Điều hành vẫn render bình thường (`MockTabDashboard`).

- [ ] **Step 3: Dừng dev server** (Ctrl+C). Không commit (không đổi code).

---

## Ghi chú cho người thực thi

- Thứ tự bắt buộc: Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Build hoàn toàn sạch chỉ đạt được sau Task 7 (vì Task 5–6 đổi prop mà Dashboard chưa cập nhật). Có thể gộp chạy build cuối ở Task 7.
- Không tạo endpoint/biến đổi backend ở bất kỳ task nào.
- Nếu `npm run build` báo lỗi do file khác (không liên quan dashboard) đang lỗi sẵn trên nhánh, ghi nhận và chỉ đảm bảo các file trong plan không thêm lỗi mới.
