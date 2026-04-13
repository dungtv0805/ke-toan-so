# Nâng cấp Báo cáo Tài chính — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Nâng cấp trang `/bao-cao/tai-chinh` — thêm filter theo kỳ, nâng cấp Tab 3 KQKD chuẩn TT200 với so sánh 2 kỳ, thêm Tab 4 P&L tổng hợp, dashboard stats thay đổi theo filter.

**Architecture:** Rewrite `BaoCaoTaiChinhPage.tsx` (monolithic 387-line component) to accept a shared period filter. Reuse existing `KqkdFilter` component (from standalone KQKD page at `fe/src/pages/bao-cao/kqkd/components/KqkdFilter.tsx`). Tab 3 switches from simple PnL to KQKD API (BE already returns full 17-line TT200 data with 2-period comparison). Tab 4 is new — uses upgraded PnL API with 2-period comparison. BE needs minor PnL API upgrade to support `periodType`.

**Tech Stack:** React 18, TypeScript, Ant Design (tabs/table/stats), shadcn/ui (filter), NestJS

**Key existing files:**
- FE page: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx` (387 lines)
- FE services: `fe/src/services/{soCaiService,balanceSheetService,pnlService,kqkdService}.ts`
- FE filter (reusable): `fe/src/pages/bao-cao/kqkd/components/KqkdFilter.tsx` (275 lines)
- FE KQKD table (reusable): `fe/src/pages/bao-cao/kqkd/components/KqkdTable.tsx` (160 lines)
- BE controller: `be/apps/reporting-service/src/bao-cao/bao-cao.controller.ts`
- BE service: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`

---

## Task 1: BE — Upgrade PnL API to support 2-period comparison

**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.controller.ts`
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`

**Step 1: Update PnL controller to accept periodType**

In `bao-cao.controller.ts`, update the `getPnL` method (lines 10-25). Add `@Query('periodType') periodType` param with validation, same pattern as `getKqkd` method (lines 42-66). Pass `periodType` to service.

```typescript
@Get('pnl')
@Roles('ADMIN', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
async getPnL(
  @Query('startDate') startDate: string,
  @Query('endDate') endDate: string,
  @Query('periodType') periodType: string = 'thang',
  @Headers('authorization') authToken: string,
  @CurrentUser() user: UserPayload,
) {
  const validPeriodTypes = ['thang', 'quy', 'nam', 'tuyChon'];
  if (!validPeriodTypes.includes(periodType)) {
    throw new BadRequestException(`periodType phải là: ${validPeriodTypes.join(', ')}`);
  }
  const data = await this.baoCaoService.getPnL(
    new Date(startDate), new Date(endDate),
    periodType as 'thang' | 'quy' | 'nam' | 'tuyChon',
    authToken, user.tenantId,
  );
  return { success: true, data };
}
```

**Step 2: Update PnL service to return 2-period data**

In `bao-cao.service.ts`, update `getPnL` method (lines 43-96):
1. Add `periodType` parameter
2. Call existing `getPreviousPeriod()` (line 316) to get previous period dates
3. Fetch vouchers+accounts for both periods in parallel
4. Calculate revenue/expense for both periods
5. Return extended response with `kyTruoc`, `kyHienTai`, `kyTruocPeriod` fields

New return shape (backwards compatible — existing fields unchanged, new fields added):
```typescript
{
  doanhThu, chiPhi, tongDoanhThu, tongChiPhi, loiNhuan,  // existing
  kyTruoc: { doanhThu, chiPhi, tongDoanhThu, tongChiPhi, loiNhuan },  // NEW
  kyHienTai: { startDate, endDate },   // NEW
  kyTruocPeriod: { startDate, endDate } // NEW
}
```

**Step 3: Commit**
```bash
git add be/apps/reporting-service/src/bao-cao/
git commit -m "[bao-cao] upgrade PnL API with periodType and 2-period comparison"
```

---

## Task 2: FE — Update services to accept date params from filter

**Files:**
- Modify: `fe/src/services/soCaiService.ts` (lines 168-189)
- Modify: `fe/src/services/balanceSheetService.ts` (lines 94-155)
- Modify: `fe/src/services/pnlService.ts` (lines 83-139)

**Step 1: Update soCaiService.getTrialBalance()**

Currently hardcodes dates (line 169-171). Add optional `startDate`/`endDate` params:
```typescript
async getTrialBalance(startDate?: string, endDate?: string): Promise<TrialBalance[]> {
  const now = new Date();
  const sd = startDate || new Date(now.getFullYear(), 0, 1).toISOString();
  const ed = endDate || now.toISOString();
  // ... rest same, use sd/ed instead of hardcoded dates
}
```
Similarly update `getStats(startDate?, endDate?)` (line 164).

**Step 2: Update balanceSheetService.getData() and getStats()**

Currently hardcodes `new Date().toISOString()` (lines 95, 126). Add optional `asOfDate`:
```typescript
async getData(asOfDate?: string): Promise<BalanceSheetData> { /* use param or default */ }
async getStats(asOfDate?: string): Promise<BalanceSheetStats> { /* same */ }
```

**Step 3: Add pnlService.getComparison() method**

Add new method to `pnlService.ts` for 2-period P&L:
```typescript
export interface PnLComparisonData {
  doanhThu: PnLItem[]; chiPhi: PnLItem[];
  tongDoanhThu: number; tongChiPhi: number; loiNhuan: number;
  kyTruoc: { doanhThu: PnLItem[]; chiPhi: PnLItem[]; tongDoanhThu: number; tongChiPhi: number; loiNhuan: number; };
  kyHienTai: { startDate: string; endDate: string };
  kyTruocPeriod: { startDate: string; endDate: string };
}

async getComparison(startDate: string, endDate: string, periodType: string): Promise<PnLComparisonData> {
  return this.get<PnLComparisonData>({ endpoint: '/pnl', params: { startDate, endDate, periodType } });
}
```

Also update existing `getSummary` to accept startDate/endDate instead of period enum.

**Step 4: Commit**
```bash
git add fe/src/services/
git commit -m "[bao-cao] update FE services to accept date params from filter"
```

---

## Task 3: FE — Move KqkdFilter to shared components and adapt for Ant Design

**Files:**
- Create: `fe/src/components/shared/PeriodFilter.tsx`
- Reference: `fe/src/pages/bao-cao/kqkd/components/KqkdFilter.tsx` (275 lines, uses shadcn/ui)

**Step 1: Create PeriodFilter component using Ant Design**

The existing `KqkdFilter` uses shadcn/ui (Select, Input, Button). The `BaoCaoTaiChinhPage` uses Ant Design. Create a new `PeriodFilter` component using Ant Design components (Select, DatePicker, Button) that:

1. Accepts `onFilter(params: { periodType, startDate, endDate })` callback
2. Has period type selector: Tháng / Quý / Năm / Tùy chọn
3. Shows appropriate sub-selectors based on period type (same logic as KqkdFilter)
4. Has "Xem báo cáo" button
5. Default: current month

Reuse the `buildDateRange()` logic from `KqkdFilter.tsx` (lines 44-75).

Export types:
```typescript
export type PeriodType = 'thang' | 'quy' | 'nam' | 'tuyChon';
export interface PeriodFilterParams {
  periodType: PeriodType;
  startDate: string;
  endDate: string;
}
```

**Step 2: Commit**
```bash
git add fe/src/components/shared/PeriodFilter.tsx
git commit -m "[bao-cao] add shared PeriodFilter component (Ant Design)"
```

---

## Task 4: FE — Rewrite BaoCaoTaiChinhPage with filter + 4 tabs

**Files:**
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx` (387 lines → rewrite)

This is the main task. Rewrite the page to:

**Step 1: Add filter state and PeriodFilter component**

Add imports and state:
```typescript
import { PeriodFilter, PeriodFilterParams } from '@/components/shared/PeriodFilter';
import { kqkdService, KqkdReport } from '@/services/kqkdService';

// Add filter state
const [filterParams, setFilterParams] = useState<PeriodFilterParams>(() => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  return { periodType: 'thang' as const, startDate, endDate };
});

// Add KQKD state
const [kqkdData, setKqkdData] = useState<KqkdReport | null>(null);
```

**Step 2: Update fetchData to use filter params**

```typescript
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const { startDate, endDate, periodType } = filterParams;
    const [trial, stats, bsData, bsStats, kqkd, pnlComparison] = await Promise.all([
      soCaiService.getTrialBalance(startDate, endDate),
      soCaiService.getStats(startDate, endDate),
      balanceSheetService.getData(endDate),
      balanceSheetService.getStats(endDate),
      kqkdService.getData({ startDate, endDate, periodType }),
      pnlService.getComparison(startDate, endDate, periodType),
    ]);
    setTbState({ trialBalance: trial, soCaiStats: stats });
    setBsState({ data: bsData, stats: bsStats });
    setKqkdData(kqkd);
    setPnlState({ comparison: pnlComparison });
  } catch (error) { console.error(error); }
  finally { setLoading(false); }
}, [filterParams]);
```

**Step 3: Add PeriodFilter to the page header**

Place `<PeriodFilter onFilter={setFilterParams} loading={loading} />` inside the Card header area, below the breadcrumb and above the stats cards. Update the Tag from static "Năm {currentYear}" to show the selected period.

**Step 4: Replace Tab 3 content — KQKD chuẩn TT200**

Remove the old PnL table (lines 196-232). Replace with the `KqkdTable` component from `fe/src/pages/bao-cao/kqkd/components/KqkdTable.tsx`:

```typescript
import { KqkdTable } from '@/pages/bao-cao/kqkd/components/KqkdTable';

// In tab 3:
{
  key: '3',
  label: 'Kết quả kinh doanh',
  children: <KqkdTable data={kqkdData?.chiTieu ?? []} loading={loading} />,
}
```

This gives us the full 17-line TT200 table with 2-period comparison, % DT thuần, tỷ trọng CP, biến động — all from the existing component.

**Step 5: Add Tab 4 — P&L tổng hợp**

Add a new tab with a comparison table showing current vs previous period:

```typescript
{
  key: '4',
  label: 'Lãi lỗ tổng hợp',
  children: <PnLComparisonTab data={pnlState.comparison} loading={loading} />,
}
```

The `PnLComparisonTab` renders a table with columns:
- Khoản mục (400px)
- Kỳ hiện tại (150px, right-aligned)
- Kỳ trước (150px, right-aligned)
- Biến động (130px, right-aligned, color-coded)
- % Biến động (100px, right-aligned)

Rows grouped as:
1. DOANH THU section header + individual revenue items
2. CHI PHÍ section header + individual expense items
3. LỢI NHUẬN TRƯỚC THUẾ (summary)
4. Thuế TNDN (20%)
5. LỢI NHUẬN SAU THUẾ (summary)

This can be defined inline in the same file (it's a simple Ant Design Table).

**Step 6: Update dashboard stats to use KQKD data**

Replace PnL-based stats with KQKD-based stats:
- Doanh thu → from KQKD mã 10 (DT thuần) kyHienTai
- Lợi nhuận sau thuế → from KQKD mã 60 kyHienTai

**Step 7: Commit**
```bash
git add fe/src/pages/bao-cao/tai-chinh/
git commit -m "[bao-cao] rewrite BaoCaoTaiChinhPage with filter + 4 tabs"
```

---

## Task 5: Build, deploy, and test

**Step 1: Build and deploy BE**
```bash
cd be && npx nest build reporting-service
rsync -avz -e "ssh -i ~/.ssh/chimseo1 -p 22" dist/apps/reporting-service/ root@103.162.21.31:/root/chimseo/digital-book-be/dist/apps/reporting-service/
ssh 103 "docker exec digital-book-app pm2 restart reporting-service"
```

**Step 2: Build and deploy FE**
```bash
cd fe && VITE_API_BASE_URL=/api npm run build
rsync -avz --delete -e "ssh -i ~/.ssh/chimseo1 -p 22" dist/ root@103.162.21.31:/root/chimseo/nginx/build4/
```

**Step 3: Test on browser**

Navigate to `http://103.162.21.31:8070/bao-cao/tai-chinh` and verify:

1. Filter bar shows with default "Tháng" + current month
2. Click "Xem báo cáo" → all tabs reload with filtered data
3. Tab 1 (CDPS): Trial balance data changes with filter
4. Tab 2 (CDKT): Balance sheet data changes with filter
5. Tab 3 (KQKD): Shows 17 line items with 2-period comparison
6. Tab 4 (P&L): Shows revenue/expense comparison between periods
7. Dashboard stats update when filter changes
8. Switch period type to Quý, Năm, Tùy chọn — verify each works

**Step 4: Final commit**
```bash
git add -A
git commit -m "[bao-cao] complete: filter + KQKD TT200 + P&L comparison"
```
