# Tổng quan báo cáo (Dashboard) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Steps dùng checkbox.

**Goal:** Thay Dashboard `/` mock bằng dữ liệu thật + biểu đồ (KPI, xu hướng, cơ cấu, tuổi nợ, xếp hạng, quá hạn).

**Architecture:** Thêm 1 endpoint BE `pnl-series` (12 tháng). FE: `dashboardService` gọi API thật; Dashboard tách thành các widget độc lập (React Query), vẽ bằng Recharts. Bộ lọc Tháng/Năm.

**Tech Stack:** NestJS (reporting-service) + React + Recharts + React Query + AntD.

## Global Constraints
- BE endpoint: `GET /reporting/bao-cao/pnl-series?year=YYYY` → `{ thang:1..12, doanhThu, chiPhi, loiNhuan }[]`, tenant-aware, JWT (như các route reporting khác).
- FE thay `/` (Dashboard.tsx), bỏ `mock-data/dashboard.ts` khỏi runtime.
- Bộ lọc Tháng/Năm (mặc định tháng/năm hiện tại): KPI theo tháng (so tháng trước); xu hướng = 12 tháng năm chọn; cơ cấu/tuổi nợ/xếp hạng/quá hạn = hiện tại.
- Top khách/NCC = **5**. Màu: thu/lãi xanh(`--success`), chi đỏ(`--destructive`), số dư/lợi nhuận navy(`--primary`), accent gold(`--brand-gold`).
- Mỗi widget loading/empty/error riêng. UI chuẩn: stat-card, excel-table size=small, space-y-3.
- Verify BE `cd be && npx nest build reporting-service`; FE `cd fe && npx tsc --noEmit && npx vitest run && npm run build`.

---

### Task 1: BE endpoint `pnl-series`
**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts` (thêm `getPnlSeries`)
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.controller.ts` (thêm route)
- Test: `be/apps/reporting-service/src/bao-cao/bao-cao.service.spec.ts` (nếu chưa có, tạo test riêng cho range tháng)

**Interfaces:** Produces `getPnlSeries(year: number, ...tenant ctx như getPnL): Promise<{ thang:number; doanhThu:number; chiPhi:number; loiNhuan:number }[]>`.

- [ ] **Step 1:** Trong service, thêm method lặp 12 tháng, tái dùng cùng cơ chế tính tổng doanh thu/chi phí theo khoảng ngày mà `getPnL` đang dùng (xem `getPnL` quanh dòng 141–195 — nó tính `tongDoanhThu`/`tongChiPhi` từ entries trong [startDate,endDate]). Với mỗi tháng `m` (0..11) của `year`: `start = new Date(year, m, 1)`, `end = new Date(year, m+1, 0, 23,59,59,999)`, tính tổng → push `{ thang:m+1, doanhThu, chiPhi, loiNhuan: doanhThu-chiPhi }`.
```ts
async getPnlSeries(year: number /* + cùng tham số tenant như getPnL nếu có */) {
  const out: { thang: number; doanhThu: number; chiPhi: number; loiNhuan: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
    const pnl = await this.getPnL(start, end, 'thang' /* + tenant ctx */);
    const dt = pnl.loiNhuan ? pnl.loiNhuan.tongDoanhThu : pnl.tongDoanhThu;
    const cp = pnl.loiNhuan ? pnl.loiNhuan.tongChiPhi : pnl.tongChiPhi;
    out.push({ thang: m + 1, doanhThu: dt ?? 0, chiPhi: cp ?? 0, loiNhuan: (dt ?? 0) - (cp ?? 0) });
  }
  return out;
}
```
> Đọc `getPnL` để dùng đúng tên field tổng (kiểm tra `pnl.loiNhuan.tongDoanhThu` vs `pnl.tongDoanhThu`). Có thể tối ưu sau; đúng số liệu trước.
- [ ] **Step 2:** Controller thêm:
```ts
@Get('pnl-series')
async pnlSeries(@Query('year') year: string) {
  const y = parseInt(year, 10) || new Date().getFullYear();
  const data = await this.service.getPnlSeries(y);
  return { success: true, data };
}
```
- [ ] **Step 3:** Test: 12 phần tử, `thang` từ 1..12, số là number. `cd be && npx jest bao-cao` (hoặc yarn test) → PASS.
- [ ] **Step 4:** `cd be && npx nest build reporting-service` → OK.
- [ ] **Step 5: Commit** `feat(be): endpoint pnl-series cho dashboard`

---

### Task 2: FE `dashboardService` gọi API thật
**Files:** Modify `fe/src/services/dashboardService.ts` (bỏ import mock)

**Interfaces:** Produces các hàm: `getKpi(month,year)`, `getPnlSeries(year)`, `getCashSeries(year)`, `getAssetComposition()`, `getSourceComposition()`, `getArAging()`, `getApAging()`, `getTopReceivables()`, `getTopPayables()`, `getOverdueAr()`, `getOverdueAp()`.

- [ ] **Step 1:** Viết lại service dùng các service sẵn có (`balanceSheetService`, `kqkd`/PnL qua axios, `soQuyService`, `congNoPhaiThuService`/`congNoPhaiTraService`). Mỗi hàm trả dữ liệu đã map gọn cho widget. Ví dụ:
```ts
// KPI: gọi so-quy/stats + bao-cao/pnl (kỳ = tháng chọn)
async getKpi(month: number, year: number) {
  const start = new Date(year, month-1, 1).toISOString();
  const end = new Date(year, month, 0, 23,59,59,999).toISOString();
  const [stats, pnl] = await Promise.all([
    soQuyService.getStats(),
    baoCaoApi.get(`/reporting/bao-cao/pnl`, { params: { startDate: start, endDate: end, periodType: 'thang' }}),
  ]);
  // map -> { soDuQuy, doanhThu, chiPhi, loiNhuan, deltas... }
}
```
Dùng `ServiceBase` hoặc axios instance hiện có; tận dụng service đã viết để khỏi lặp. `pnl-series`/`pnl` gọi qua 1 service nhỏ (tạo `baoCaoReportService` nếu chưa có, endpoint `/reporting/bao-cao`).
- [ ] **Step 2:** `cd fe && npx tsc --noEmit` → 0 lỗi.
- [ ] **Step 3: Commit** `feat(fe): dashboardService gọi API thật`

---

### Task 3: FE KPI + 2 biểu đồ xu hướng
**Files:** Create `fe/src/pages/dashboard/components/KpiCards.tsx`, `RevenueTrendChart.tsx`, `CashFlowChart.tsx`.

- [ ] **Step 1: KpiCards** — nhận `{month,year}`; `useQuery(['dash-kpi',m,y], ()=>dashboardService.getKpi(m,y))`; render 4 `<Card className="stat-card ...">` với `Statistic` + dòng % ▲▼ (xanh/đỏ) so kỳ trước. Loading → Skeleton.
- [ ] **Step 2: RevenueTrendChart** — `useQuery(['pnl-series',y])`; Recharts `ComposedChart` data 12 tháng: `<Bar dataKey="doanhThu" fill="green"/> <Bar dataKey="chiPhi" fill="red"/> <Line dataKey="loiNhuan" stroke="navy"/>`, `<XAxis dataKey="thang"/>`, Tooltip format tiền, ResponsiveContainer height 300. Empty/loading.
- [ ] **Step 3: CashFlowChart** — `useQuery(['cash-series',y])` từ `getCashSeries`; Recharts area Thu/Chi + line Số dư theo tháng. ResponsiveContainer.
- [ ] **Step 4:** `cd fe && npx tsc --noEmit` → 0 lỗi.
- [ ] **Step 5: Commit** `feat(fe): KPI + biểu đồ xu hướng dashboard`

---

### Task 4: FE cơ cấu + tuổi nợ + xếp hạng + bảng quá hạn
**Files:** Create `CompositionCharts.tsx`, `AgingCharts.tsx`, `TopPartnersCharts.tsx`, `OverdueTables.tsx` trong `fe/src/pages/dashboard/components/`.

- [ ] **Step 1: CompositionCharts** — 2 donut (Recharts `PieChart`+`Pie innerRadius`) Tài sản & Nguồn vốn từ `getAssetComposition/getSourceComposition`; legend + % ; palette nhất quán (navy/gold/xanh/đỏ/xám).
- [ ] **Step 2: AgingCharts** — 2 donut 5 nhóm (chưa đến hạn/1-30/31-60/61-90/>90) phải thu & phải trả từ `getArAging/getApAging`; màu nhóm quá hạn đậm dần (vàng→cam→đỏ).
- [ ] **Step 3: TopPartnersCharts** — 2 Recharts `BarChart` layout="vertical" (bar ngang) Top 5 khách phải thu / NCC phải trả từ `getTopReceivables/getTopPayables` (sort theo conLai desc, slice 5).
- [ ] **Step 4: OverdueTables** — 2 `Table className="excel-table" size="small"` công nợ phải thu/phải trả quá hạn (đối tượng, còn lại, số ngày quá hạn) từ `getOverdueAr/getOverdueAp`, top ~8 dòng + link "Xem tất cả" sang `/cong-no/phai-thu` / `/cong-no/phai-tra`.
- [ ] **Step 5:** `cd fe && npx tsc --noEmit` → 0 lỗi.
- [ ] **Step 6: Commit** `feat(fe): cơ cấu + tuổi nợ + xếp hạng + bảng quá hạn dashboard`

---

### Task 5: FE compose Dashboard + bỏ mock + verify + deploy
**Files:** Modify `fe/src/pages/dashboard/Dashboard.tsx`; (không xoá file mock nhưng bỏ import khỏi runtime).

- [ ] **Step 1:** Viết lại `Dashboard.tsx`: state `{month, year}` (mặc định hiện tại) + filter (2 Select Tháng/Năm) trên cùng; layout `space-y-3`: hàng KpiCards → Row[RevenueTrendChart | CashFlowChart] → Row[CompositionCharts] → Row[AgingCharts] → Row[TopPartnersCharts] → Row[OverdueTables]. Truyền month/year xuống widget cần. Bỏ mọi import từ `mock-data/dashboard`.
- [ ] **Step 2:** `cd fe && npx tsc --noEmit && npx vitest run && npm run build` → pass.
- [ ] **Step 3:** Kiểm thị giác `npm run dev`: KPI khớp, biểu đồ vẽ, đổi Tháng/Năm cập nhật.
- [ ] **Step 4: Commit** `feat(fe): dashboard tổng quan dữ liệu thật + biểu đồ`
- [ ] **Step 5: Deploy** (theo db-deploy): BE `nest build reporting-service` → scp `dist/apps/reporting-service/main.js` + restart container; FE build → scp dist → nginx reload. Smoke: `/api/reporting/bao-cao/pnl-series?year=2026` → 401 (no token) = wired; đăng nhập xem dashboard.

---

## Self-Review
- **Coverage:** pnl-series→T1; dashboardService thật→T2; KPI+xu hướng→T3; cơ cấu/tuổi nợ/xếp hạng/quá hạn→T4; bỏ mock+filter+compose+deploy→T5. ✅ (⑥ ratios & chứng từ gần đây ngoài phạm vi — đúng spec.)
- **Rủi ro xác minh khi code:** tên field tổng trong `getPnL` (tongDoanhThu nằm trong `loiNhuan` hay top-level) — đọc service; chữ ký `getPnL` có cần tham số tenant không (đa số tenant-aware tự động qua repo); endpoint reporting đi qua gateway prefix `/reporting` (đã có route gateway); React Query đã cấu hình ở App (QueryClientProvider có sẵn).
- **Placeholder:** code widget chi tiết viết khi thực thi theo mẫu Recharts/excel-table sẵn có; các đoạn then chốt (ComposedChart, donut, bar ngang, query keys) đã nêu.
