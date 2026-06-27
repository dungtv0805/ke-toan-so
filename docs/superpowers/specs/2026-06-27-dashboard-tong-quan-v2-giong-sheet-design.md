# Thiết kế v2: Dashboard "Tổng quan" giống hệt sheet — filter theo kỳ + đủ 6 khối

- Ngày: 2026-06-27
- Thay thế/mở rộng: `2026-06-27-dashboard-tong-quan-loc-ky-tinh-hinh-thuc-hien-design.md` (v1 đã deploy). v2 làm lại giao diện cho **giống hệt các biểu đồ trong sheet** `docs/templates/THIẾT KẾ_KẾ TOÁN.xlsx`, đổi mô hình filter, thêm 2 khối (Công nợ, Cân đối tài chính) và 1 endpoint backend.
- Phạm vi: Frontend (`fe/`) + **1 endpoint mới** ở `be/` (payable-service).

## Tham chiếu hình mẫu (ảnh trong sheet, đã trích)
- KQKD (image3): cột teal Doanh thu + cột xám Chi phí + đường cam Lợi nhuận; nhãn số trên cột; KPI (DT/CP/LN) ở đầu khối + "Đvt: Triệu đồng"; legend chấm tròn dưới; trục X "Th 1".."Th 12".
- Dòng tiền (image13): cột teal Thu (dương) + cột xám Chi (ÂM, dưới 0) + đường cam Tồn; KPI (Tổng thu/Tổng chi/Tồn) ở đầu khối.
- Tình hình thực hiện (image5): 3 thẻ gauge nửa vòng (0%→150%, hiện 0,00%) + chú thích Thực hiện/Kế hoạch/Chênh lệch.
- Tỷ trọng (image8, image11): donut navy (#1F3864-ish) + gold; % trên lát; legend dưới.

## 1. Mô hình filter (kỳ = khoảng thời gian)

1 dropdown, các nhóm mục:
- Tháng 1 … Tháng 12
- Quý 1 … Quý 4
- 6 tháng đầu năm · 6 tháng cuối năm
- Năm nay · Năm trước

Mỗi mục resolve ra `{ year, startMonth, endMonth }` (tháng 1-based, inclusive):
- Tháng N → `{ year: nay, startMonth: N, endMonth: N }`
- Quý Q → `{ year: nay, startMonth: 3Q-2, endMonth: 3Q }`
- 6 tháng đầu năm → `{ nay, 1, 6 }`; 6 tháng cuối năm → `{ nay, 7, 12 }`
- Năm nay → `{ nay, 1, 12 }`; Năm trước → `{ nay-1, 1, 12 }`

Từ đó suy ra:
- `dateRange = { start: 00:00 ngày 1 tháng startMonth, end: 23:59:59.999 ngày cuối tháng endMonth }` (cho KPI, tỷ trọng).
- Trục X biểu đồ xu hướng = các tháng từ startMonth..endMonth (mỗi tháng 1 điểm). Vd Quý 2 → Th4, Th5, Th6.

**Mặc định:** Tháng hiện tại (Tháng N của năm nay).

## 2. Các khối (đúng thứ tự sheet, tab Tài chính)

### 2.1 KQKD (combo)
- `ComposedChart`: Bar `doanhThu` (teal), Bar `chiPhi` (xám nhạt), Line `loiNhuan` (cam) + dot; `LabelList` số trên cột (rút gọn triệu).
- Header khối: 3 số KPI = tổng DT / tổng CP / tổng LN trong kỳ + "Đvt: Triệu đồng".
- Trục X: các tháng trong kỳ (`Th {n}`); legend chấm tròn dưới.
- Data: `dashboardService.getPnlSeries(year)` rồi cắt [startMonth, endMonth].

### 2.2 Dòng tiền (combo)
- Bar `thu` (teal, dương) + Bar `chi` (xám, **giá trị âm** để vẽ dưới trục 0) + Line `soDu` (cam).
- Header: Tổng thu / Tổng chi / Tồn (số dư cuối kỳ).
- Data: `getCashSeries(year)` cắt theo kỳ. (Chi vẽ âm: nhân -1 khi render, tooltip hiện trị tuyệt đối.)

### 2.3 Tình hình thực hiện (3 gauge, EMPTY)
- 3 thẻ: Doanh thu / Chi phí / Lợi nhuận. Mỗi thẻ 1 **gauge nửa vòng** thang 0%→150%, kim ở 0, tâm hiện "0,00%"; legend Thực hiện = 0 / Kế hoạch = 0 / Chênh lệch = 0.
- Luôn rỗng (BE không có module kế hoạch). Component nhận data optional để sau này gắn.
- Vẽ gauge bằng Recharts `RadialBarChart` (nửa vòng: startAngle 180, endAngle 0) hoặc SVG arc.

### 2.4 Tỷ trọng (donut)
- Donut navy + gold, nhãn % trên lát, legend dưới. 2 donut có data thật: Tỷ trọng doanh thu, Tỷ trọng chi phí (từ `getPnlBreakdown` theo kỳ).
- Tỷ trọng lợi nhuận theo sản phẩm: **để trống** (không có endpoint).

### 2.5 Công nợ (line) — dùng endpoint BE mới
- `LineChart`: đường `tongPhaiThu` vs `tongPhaiTra`, trục X = các tháng trong kỳ.
- Giá trị mỗi tháng = **số dư công nợ tính đến ngày cuối tháng đó** (Σ `conLai` của bản ghi có `ngayPhatSinh` ≤ ngày cuối tháng), theo từng `loai`.
- Data: `dashboardService.getCongNoSeries(year)` → cắt theo kỳ.

### 2.6 Cân đối tài chính (cột chồng 100%)
- 2 cột dọc, mỗi cột chuẩn hóa 100%:
  - **Tài sản** = Tài sản ngắn hạn % + Tài sản dài hạn % (tổng 100%).
  - **Nguồn vốn** = Nợ phải trả % + Vốn chủ sở hữu % (tổng 100%).
- Hiển thị % trên mỗi đoạn + Tổng giá trị (tổng tài sản) dưới chart.
- Data: `balanceSheetService.getStats()` (taiSanNganHan, taiSanDaiHan, noPhaiTra, vonChuSoHuu). Snapshot tại ngày cuối kỳ nếu API hỗ trợ; nếu không, snapshot hiện tại + ghi chú.

### 2.7 KPI
- Bỏ hàng 4 thẻ KPI rời. KPI nằm **trong header** khối KQKD và Dòng tiền (đúng sheet).

## 3. Backend — endpoint công nợ theo tháng

`GET /payable/cong-no/series?year=YYYY` → `[{ thang: 1..12, tongPhaiThu: number, tongPhaiTra: number }]`

- Service: load công nợ của tenant hiện tại; với mỗi tháng M (1..12), tính:
  - `tongPhaiThu(M)` = Σ `conLai` của bản ghi `loai='PHAI_THU'` có `ngayPhatSinh` ≤ ngày cuối tháng M của `year`.
  - `tongPhaiTra(M)` = tương tự với `loai='PHAI_TRA'`.
- **Lọc tenantId**: dùng `TenantContextService.getCurrentTenantId()` (payable cong-no.service hiện CHƯA lọc tenant — vá trong phạm vi method mới; không đổi method cũ để tránh rủi ro ngoài phạm vi).
- Giới hạn đã biết: không có lịch sử thanh toán theo ngày → dùng `conLai` hiện tại + `ngayPhatSinh` (xấp xỉ số dư cuối kỳ; đường có xu hướng lũy kế). Ghi rõ trong code + trả đúng nghĩa "số dư đến cuối tháng".
- Gateway đã route `/payable` → không cần đổi gateway. Controller phải để route khớp prefix-strip (`@Controller('cong-no')` + `@Get('series')`).

## 4. FE service layer
- `congNoService` (hoặc service phải-thu/phải-tra hiện có): thêm `getSeries(year)` gọi `/payable/cong-no/series`.
- `dashboardService.getCongNoSeries(year)`: trả `[{thang, tongPhaiThu, tongPhaiTra}]`, catch → [].
- `period.ts`: thay model cũ bằng model kỳ-khoảng (mục 1) + helper `sliceToRange(series, startMonth, endMonth)`.

## 5. Ngoài phạm vi (YAGNI)
- Không xây module kế hoạch (gauge để trống).
- Không thêm lịch sử thanh toán cho công nợ (dùng xấp xỉ).
- Không đổi tab Nhân sự / Kinh doanh / Điều hành.
- Không sửa các method công nợ cũ (chỉ thêm method series có lọc tenant).

## 6. Tiêu chí hoàn thành
- Dropdown đủ các mục kỳ; đổi kỳ → mọi khối cập nhật; chart xu hướng chỉ hiện tháng trong kỳ.
- KQKD/Dòng tiền/Tỷ trọng nhìn khớp hình mẫu (màu teal/xám/cam; chi âm; donut navy/gold; KPI ở header).
- Gauge "tình hình thực hiện" hiện 0,00% như sheet.
- Công nợ vẽ 2 đường từ endpoint mới; Cân đối tài chính cột chồng 100%.
- `npm run build` + `npm run lint` (FE) pass; BE `nest build payable-service` pass; deploy FE + payable-service.
