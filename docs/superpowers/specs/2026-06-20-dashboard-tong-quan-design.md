# Tổng quan báo cáo (Dashboard) — dữ liệu thật + biểu đồ

**Ngày:** 2026-06-20
**Nhánh:** `feat/dashboard-tong-quan`

## Bối cảnh
- Trang Tổng quan `/` (`fe/src/pages/dashboard/Dashboard.tsx`) đang dùng **mock** (`mock-data/dashboard.ts`).
- Các API báo cáo đã có thật: `bao-cao/pnl` (có kỳ trước), `bao-cao/balance-sheet`, `so-quy/stats|by-month|daily-summary`, `phai-thu|phai-tra/stats|aging-report|summary-by-customer|summary-by-supplier|qua-han`.
- Thư viện biểu đồ: **Recharts** (đã dùng ở Dashboard + Bảng cân đối).

## Quyết định đã chốt
- **Thay trang `/`** bằng dashboard dữ liệu thật (bỏ mock).
- **Thêm 1 endpoint tổng hợp** `pnl-series` cho biểu đồ 12 tháng (1 request).
- **Phạm vi biểu đồ:** ① KPI + ② Xu hướng + ③ Cơ cấu & Tuổi nợ + ④ Xếp hạng + ⑤ Cảnh báo. **KHÔNG** làm ⑥ chỉ số tài chính (gauge) đợt này.
- Bộ lọc đầu trang: chọn **Tháng/Năm** (mặc định tháng hiện tại). KPI theo tháng chọn (so tháng trước); Xu hướng = 12 tháng của năm chọn; Cơ cấu/Tuổi nợ/Xếp hạng/Quá hạn = thời điểm hiện tại.

---

## Phần A — Backend: endpoint chuỗi P&L theo tháng
- **`GET /reporting/bao-cao/pnl-series?year=YYYY`** (qua gateway `/reporting`, JWT). Trả 12 phần tử:
  ```ts
  { thang: number; doanhThu: number; chiPhi: number; loiNhuan: number }[]
  ```
- Cài trong `apps/reporting-service/src/bao-cao/bao-cao.service.ts` + controller `bao-cao.controller.ts`: lặp 12 tháng của `year`, tái dùng logic tính P&L hiện có (tổng doanh thu/chi phí từ journal entries theo khoảng tháng), trả mảng. Tenant-aware như các endpoint khác.
- Không phá vỡ endpoint `pnl` hiện có.

## Phần B — Frontend: service tổng hợp dashboard
- Sửa `fe/src/services/dashboardService.ts`: bỏ mock, gọi API thật. Cung cấp các hàm nhỏ (mỗi widget gọi riêng để lỗi/loading độc lập):
  - `getKpi(month, year)` → từ `so-quy/stats` (số dư) + `bao-cao/pnl` (kỳ = tháng chọn, có kỳ trước) → `{ soDuQuy, doanhThu, chiPhi, loiNhuan, deltaDoanhThu%, deltaChiPhi%, deltaLoiNhuan% }`.
  - `getPnlSeries(year)` → `bao-cao/pnl-series`.
  - `getCashSeries(year)` → `so-quy/by-month` (map → `{ thang, thu, chi, soDu }`).
  - `getAssetComposition()` / `getSourceComposition()` → `balance-sheet` (nhóm cấp 1 taiSan / nguonVon).
  - `getArAging()` / `getApAging()` → `phai-thu|phai-tra/aging-report`.
  - `getTopReceivables()` / `getTopPayables()` → `summary-by-customer|supplier` (top 5 theo `conLai`).
  - `getOverdueAr()` / `getOverdueAp()` → `phai-thu|phai-tra/qua-han`.
- Dùng React Query (đã có) cho cache/loading.

## Phần C — Frontend: cấu trúc trang & component
`fe/src/pages/dashboard/` — tách nhỏ, mỗi widget 1 file:
- `Dashboard.tsx` — bố cục + bộ lọc Tháng/Năm; compose các widget; padding/space theo chuẩn (space-y-3).
- `components/KpiCards.tsx` — 4 thẻ `stat-card`: Số dư quỹ, Doanh thu, Chi phí, Lợi nhuận; mỗi thẻ có ▲▼ % so kỳ trước (xanh/đỏ).
- `components/RevenueTrendChart.tsx` — Recharts ComposedChart: cột Doanh thu + cột Chi phí + line Lợi nhuận, trục X = 12 tháng (pnl-series).
- `components/CashFlowChart.tsx` — Recharts: area Thu + area Chi + line Số dư theo tháng (cash series).
- `components/CompositionCharts.tsx` — 2 donut: Cơ cấu Tài sản, Cơ cấu Nguồn vốn (balance-sheet).
- `components/AgingCharts.tsx` — 2 donut: Tuổi nợ phải thu, Tuổi nợ phải trả (5 nhóm).
- `components/TopPartnersCharts.tsx` — 2 bar ngang: Top 5 khách còn phải thu, Top 5 NCC còn phải trả.
- `components/OverdueTables.tsx` — 2 bảng `excel-table size="small"`: công nợ phải thu/phải trả quá hạn (đối tượng, số tiền còn lại, số ngày quá hạn), giới hạn ~5–10 dòng + link sang trang công nợ.
- **Màu:** dùng tông thương hiệu — doanh thu/thu = success (xanh), chi phí/chi = đỏ, số dư/lợi nhuận = navy `--primary`, accent gold cho điểm nhấn; donut dùng palette nhất quán.
- **Trạng thái:** mỗi widget có loading (Skeleton/Spin) + empty + error riêng, không để 1 lỗi làm sập cả trang.
- Bố cục responsive: KPI 4 cột → 2 → 1; charts 2 cột (Row/Col), mobile xuống 1 cột.

## Kiểm thử
- BE: unit test `pnl-series` (12 phần tử, đúng tháng); `nest build reporting-service` OK.
- FE: `tsc --noEmit` 0 lỗi; `vitest run` pass; `npm run build` OK; render test Dashboard mount (mock service) không lỗi.
- Kiểm thị giác: KPI khớp số liệu kỳ; biểu đồ vẽ đúng; đổi Tháng/Năm cập nhật; bỏ hẳn mock.

## Ngoài phạm vi (YAGNI)
- ⑥ Chỉ số tài chính (current ratio, debt/equity) — để sau.
- "Chứng từ gần đây" (cần endpoint nhật ký chung riêng).
- Realtime/auto-refresh; xuất PDF dashboard.

## Triển khai (gợi ý phân pha)
1. BE: endpoint `pnl-series` + test.
2. FE: dashboardService thật + KPI + 2 chart xu hướng.
3. FE: cơ cấu + tuổi nợ + xếp hạng + bảng quá hạn.
4. Kiểm thử + deploy (reporting-service + FE).
