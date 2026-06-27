# Thiết kế: Hoàn thiện Dashboard "Tổng quan" theo wireframe — lọc kỳ & khối "Tình hình thực hiện"

- Ngày: 2026-06-27
- Phạm vi: Frontend (`fe/`), tab **Tài chính** của trang `/` (`fe/src/pages/dashboard/Dashboard.tsx`). **Không đụng backend.**
- Bối cảnh: Sheet "Tổng quan" trong `docs/templates/THIẾT KẾ_KẾ TOÁN.xlsx` là **wireframe** (ghép từ 8 ảnh PNG tĩnh, không phải chart sống). 3 đồng hồ "Tình hình thực hiện DT/CP/LN" là cùng 1 ảnh rỗng dán 3 lần → mục tiêu: dựng báo cáo thật khớp wireframe, dữ liệu chưa có thì để trống.

## Mục tiêu

1. Đổi bộ lọc của tab Tài chính từ `Tháng + Năm` sang **1 dropdown kỳ** với 4 mục: **12 tháng / 4 quý / Năm nay / Năm trước**.
2. Bổ sung khối **"Tình hình thực hiện"** (Kế hoạch vs Thực hiện — DT/CP/LN) ở dạng **empty state** (backend không có module kế hoạch).
3. Chuẩn hóa quy tắc **"chưa có dữ liệu → để trống"** cho mọi chart.
4. Giữ nguyên các khối đã hoạt động; chỉ thêm/sửa phần delta.

## Bộ lọc kỳ (`period`)

Thay 2 `Select` (`MONTH_OPTIONS`, `YEAR_OPTIONS`) trong `Dashboard.tsx` bằng 1 `Select`/`Segmented` với 4 mục. State mới: `period: 'thang12' | 'quy4' | 'namNay' | 'namTruoc'` (mặc định `thang12`).

Hàm map `period → { year, granularity }`:

| period | year | granularity | Trục X xu hướng | KPI / tỷ trọng |
|---|---|---|---|---|
| `thang12` (12 tháng) | năm nay | `month` | 12 điểm T1..T12 | cả năm nay |
| `quy4` (4 quý) | năm nay | `quarter` | 4 điểm Q1..Q4 | cả năm nay |
| `namNay` (Năm nay) | năm nay | `month` | 12 điểm | cả năm nay |
| `namTruoc` (Năm trước) | năm trước | `month` | 12 điểm | cả năm trước |

- `year`: `namTruoc` → `CURRENT_YEAR - 1`; còn lại → `CURRENT_YEAR`.
- `granularity`: `quy4` → `quarter`; còn lại → `month`.
- Ghi chú: `thang12` và `namNay` cho kết quả giống nhau (đúng yêu cầu giữ đủ 4 mục). Có thể gộp còn 3 sau này bằng cách bỏ 1 option.
- KPI/tỷ trọng theo "cả năm": khoảng ngày = `01/01/year` → `31/12/year` thay vì theo tháng đơn lẻ như hiện tại.

## Bố cục tab Tài chính (theo wireframe)

Thứ tự khối từ trên xuống:

1. **KPI** — `KpiCards`: Doanh thu · Chi phí · Lợi nhuận · Tồn quỹ (+ % so kỳ trước). Nhận `{ year }` cho cả năm.
2. **Xu hướng** (2 cột): `RevenueTrendChart` (DT/CP/LN) | `CashFlowChart` (Thu/Chi/Tồn). Nhận thêm prop `granularity`. *Có dữ liệu thật.*
3. **🆕 Tình hình thực hiện** (`ExecutionStatusCharts`): 3 ô DT/CP/LN, Kế hoạch vs Thực hiện vs Chênh lệch. **Empty state** ("Chưa có dữ liệu kế hoạch").
4. **Tỷ trọng DT / CP** — `RevenueExpenseBreakdownCharts`. Nhận khoảng kỳ theo `period`. *Có dữ liệu thật.*
5. **Cơ cấu Tài sản / Nguồn vốn** — `CompositionCharts`. *Có dữ liệu thật (snapshot).*
6. **Tuổi nợ phải thu / phải trả** — `AgingCharts`. *Có dữ liệu thật.* (Đường công nợ theo thời gian trong wireframe → **để trống**, BE chưa có chuỗi theo tháng.)
7. **Công nợ quá hạn** — `OverdueTables`.

## Khối "Tình hình thực hiện" (mới)

- Component `ExecutionStatusCharts.tsx`: 3 thẻ (Doanh thu / Chi phí / Lợi nhuận), mỗi thẻ có nhãn **Thực hiện / Kế hoạch / Chênh lệch** + thanh tiến độ %.
- Vì không có module kế hoạch ở backend: render **empty state** (khung mờ + "Chưa có dữ liệu kế hoạch"), giá trị Kế hoạch/Chênh lệch để trống. Không gọi API kế hoạch (không tồn tại).
- Thiết kế để sau này khi có API kế hoạch chỉ cần truyền data vào, không phải dựng lại layout.
- Dùng thanh ngang (bullet/progress) thay đồng hồ gauge của wireframe để đọc được cả % lẫn giá trị tuyệt đối.

## Quy tắc "chưa có dữ liệu → để trống"

- Component dùng chung `ChartEmptyState.tsx`: khung biểu đồ mờ + dòng "Chưa có dữ liệu", giữ nguyên kích thước để không vỡ layout.
- Áp cho: Tình hình thực hiện (luôn rỗng), Lợi nhuận theo sản phẩm (không có endpoint), đường công nợ theo thời gian (không có chuỗi).
- Chart có data thật: nếu mảng rỗng (lỗi/0 bản ghi) cũng hiển thị empty state thay vì khung trắng.

## Thay đổi code (delta)

- `Dashboard.tsx`: thay state `month/year` → `period`; thêm map `period → {year, granularity, dateRange}`; truyền xuống các khối.
- `dashboardService.ts`:
  - Thêm `getPnlSeriesByQuarter(year)`: lấy `getPnlSeries(year)` rồi gộp 3 tháng/quý.
  - Cho `getCashSeries(year)` nhận `year` bất kỳ (đã có sẵn tham số year) + biến thể gộp quý.
  - Thêm helper `resolvePeriod(period)` trả `{ year, granularity, start, end }`.
- `RevenueTrendChart.tsx`, `CashFlowChart.tsx`: nhận thêm prop `granularity: 'month' | 'quarter'`; chọn nguồn series theo granularity; nhãn trục X T1..T12 hoặc Q1..Q4.
- `KpiCards.tsx`, `RevenueExpenseBreakdownCharts.tsx`: nhận khoảng kỳ cả năm thay vì 1 tháng.
- **Mới**: `ExecutionStatusCharts.tsx`, `ChartEmptyState.tsx`.

## Ngoài phạm vi (YAGNI)

- Không xây module kế hoạch/ngân sách ở backend (chỉ để trống ở FE).
- Không thêm endpoint chuỗi công nợ theo thời gian.
- Không đổi các tab Nhân sự / Kinh doanh / Điều hành (giữ `MockTabDashboard`).
- Không đổi backend.

## Rủi ro / phụ thuộc

- "4 quý" phụ thuộc gộp ở FE từ series tháng — đúng nếu `getPnlSeries`/`getCashSeries` trả đủ 12 tháng (đã xác nhận).
- KPI "cả năm" đổi khoảng ngày → cần kiểm tra `baoCaoReportService.getPnl` chấp nhận `periodType` phù hợp cho khoảng cả năm (dùng `nam` hoặc `tuyChon`).
- `getCashSeries` gọi `so-quy/by-month` 12 lần/lần load — chấp nhận được; cân nhắc cache theo year.

## Tiêu chí hoàn thành

- Dropdown 4 mục đổi đúng năm + độ chia trục X của KQKD và Dòng tiền.
- Khối "Tình hình thực hiện" hiển thị empty state gọn, không vỡ layout.
- Các chart không có dữ liệu hiển thị "Chưa có dữ liệu" thay vì trắng/vỡ.
- Các chart có dữ liệu (KQKD, Dòng tiền, Tỷ trọng DT/CP, Cơ cấu, Tuổi nợ) hiển thị đúng theo kỳ chọn.
- `npm run build` + `npm run lint` pass.
