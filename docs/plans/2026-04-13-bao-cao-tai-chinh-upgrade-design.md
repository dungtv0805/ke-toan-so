# Design: Nâng cấp trang Báo cáo Tài chính

**Ngày:** 2026-04-13
**Trang:** `/bao-cao/tai-chinh`

## Tổng quan

Nâng cấp trang Báo cáo Tài chính từ 3 tabs lên 4 tabs, thêm filter theo kỳ (tháng/quý/năm/tùy chọn), và cải thiện Tab 3 KQKD theo chuẩn TT200.

## So sánh Excel vs FE hiện tại

### Tab 1 - CDPS (Cân đối phát sinh)
- **Hiện tại:** Đủ cột (Mã TK, Tên TK, Dư đầu kỳ Nợ/Có, Phát sinh Nợ/Có, Dư cuối kỳ Nợ/Có)
- **Thiếu:** Không có filter theo kỳ
- **Cần làm:** Thêm filter, data thay đổi theo startDate/endDate

### Tab 2 - CDKT (Cân đối kế toán)
- **Hiện tại:** Chỉ tiêu, Mã số, Đầu năm, Cuối kỳ, Chênh lệch
- **Thiếu:** % Tổng TS/NV, filter theo kỳ
- **Cần làm:** Thêm cột %, thêm filter, asOfDate = endDate từ filter

### Tab 3 - KQKD (thay thế hoàn toàn)
- **Hiện tại:** Bảng P&L đơn giản (doanh thu/chi phí/lợi nhuận), không so sánh 2 kỳ
- **Excel:** 17 chỉ tiêu TT200, so sánh 2 kỳ, % DT thuần, tỷ trọng CP, biến động
- **Cần làm:** Thay thế bằng bảng KQKD chuẩn, dùng API `/bao-cao/kqkd` đã có

### Tab 4 - P&L tổng hợp (mới)
- **Mục đích:** Tổng hợp doanh thu/chi phí/lợi nhuận, so sánh 2 kỳ
- **Thiết kế web-friendly:** Gọn, color coding, không dài như Excel

## Thiết kế chi tiết

### Filter bar (chung cho tất cả tabs)
- Loại kỳ: Tháng | Quý | Năm | Tùy chọn
- Tháng → dropdown tháng + năm → startDate = ngày 1, endDate = ngày cuối tháng
- Quý → dropdown quý + năm → startDate = ngày 1 tháng đầu quý, endDate = ngày cuối quý
- Năm → dropdown năm → startDate = 01/01, endDate = 31/12
- Tùy chọn → date range picker
- Nút "Xem báo cáo" để apply

### Tab 3 - KQKD chuẩn TT200
Cột: Chỉ tiêu | Mã số | Kỳ hiện tại | % DT thuần | Tỷ trọng CP | Kỳ trước | % DT thuần | Tỷ trọng CP | Biến động | % Biến động

17 chỉ tiêu:
1. Doanh thu bán hàng và CCDV (mã 01)
2. Các khoản giảm trừ DT (mã 02)
3. DT thuần (mã 10) = (01) - (02)
4. Giá vốn hàng bán (mã 11)
5. Lợi nhuận gộp (mã 20) = (10) - (11)
6. DT hoạt động tài chính (mã 21)
7. CP tài chính (mã 22)
8. CP bán hàng (mã 25)
9. CP quản lý DN (mã 26)
10. LN từ HĐKD (mã 30)
11. Thu nhập khác (mã 31)
12. CP khác (mã 32)
13. LN khác (mã 40)
14. Tổng LN trước thuế (mã 50)
15. CP thuế TNDN hiện hành (mã 51)
16. CP thuế TNDN hoãn lại (mã 52)
17. LN sau thuế (mã 60)

### Tab 4 - P&L tổng hợp
Cột: Khoản mục | Kỳ hiện tại | Kỳ trước | Biến động | % Biến động

Cấu trúc:
- I. DOANH THU (nhóm theo TK 511, 515, 711)
- II. CHI PHÍ (nhóm theo TK 632, 635, 641, 642, 811)
- III. LỢI NHUẬN (trước thuế, thuế 20%, sau thuế)

## Data Flow

### Filter → API mapping
| Tab | API | Params |
|-----|-----|--------|
| CDPS | `/reporting/so-cai/trial-balance` | startDate, endDate |
| CDKT | `/reporting/bao-cao/balance-sheet` | asOfDate = endDate |
| KQKD | `/reporting/bao-cao/kqkd` | startDate, endDate, periodType |
| P&L | `/reporting/bao-cao/pnl` | startDate, endDate (+ thêm so sánh kỳ trước) |

### BE changes
- API PnL: thêm periodType param, trả về data so sánh 2 kỳ

### FE changes
- Thêm PeriodFilter component
- Tab 3: thay thế hoàn toàn bằng KQKD chuẩn
- Tab 4: tạo mới P&L tổng hợp
- Dashboard stats: re-fetch theo filter
