# Dashboard 5 tab — việc còn tồn sau khi làm xong

Ngày: 2026-08-10
Liên quan: `2026-08-10-dashboard-5-tab-bao-cao-design.md`, `../plans/2026-08-10-dashboard-5-tab-bao-cao.md`

Danh sách này gom các phát hiện đã được ghi nhận trong quá trình làm nhưng **cố ý để lại**.
Không cái nào chặn merge. Ghi ra đây để lần sau đụng vào khu vực này thì biết.

## Cần chạy thử trước khi tin hoàn toàn

**Chưa ai mở trang này trên trình duyệt với dữ liệu thật.** Toàn bộ nghiệm thu tới giờ là
test tự động + đọc code. Trước khi coi là xong, chạy `yarn start:all:dev` (be) và
`npm run dev` (fe), mở `/`, bấm qua cả 5 tab, đổi bộ lọc kỳ, và:

- Xem trục thời gian của biểu đồ tab Bán hàng có tăng dần trái → phải không
- Đối chiếu KPI "Số dư cuối kỳ" tab Dòng tiền với dòng "Tổng cộng" của bảng ngay dưới
- Bấm thẻ "Cảnh báo" ở tab Tổng quan, kiểm các link trong modal
- Xuất Excel bảng đối chiếu công nợ, mở file kiểm cột "Mã đối tượng"

## Rủi ro phụ thuộc dữ liệu thật

- **Mã quỹ/ngân hàng bắt đầu bằng chữ số.** Lỗi cộng trùng tiền do đoán dòng cha/con bằng
  regex đã được sửa (giờ dùng cờ `laCon`), nhưng nếu có báo cáo cũ nào khác trong hệ thống
  còn dùng cách đoán tương tự thì vẫn rủi ro. Đáng chạy một truy vấn kiểm `ngan_hang.ma`
  trên các tenant thật.
- **`payable.findAll()` không lọc tenant tường minh** (`be/apps/payable-service/src/cong-no/cong-no.service.ts`).
  Đây là chuyện có sẵn từ trước, dùng chung với các trang Công nợ hiện hành — nhưng giờ
  khối "Lịch thu/trả nợ" và thẻ "Đến hạn trong 30 ngày" cũng phụ thuộc vào nó.

## Nhất quán số liệu giữa các tab

- **"Dòng tiền thuần" tính hai kiểu.** Tab Dòng tiền lấy `Σ phatSinhNo − Σ phatSinhCo` từ
  bảng cân đối (để KPI khớp bảng ngay dưới nó), tab Tổng quan vẫn lấy `Σ thu − Σ chi` từ
  chuỗi cash-flow. Cùng nhãn, hai nguồn. Hệ quả phụ: "Tổng thu"/"Tổng chi" trên tab Dòng tiền
  giờ là phát sinh gộp, nên một lần chuyển tiền nội bộ 111↔112 làm phồng cả hai vế (triệt
  tiêu ở "thuần" nhưng không ở hai thẻ gộp).
- **`dash-pnl-series` có hai hình dạng khoá** — `XuHuongChiTieuChart` dùng `[key, year]`,
  `RevenueTrendChart` dùng `[key, year, month ?? 0]`. Cùng dữ liệu, gọi trùng một lần.
- **`dash-qh-thu`/`dash-qh-tra` trùng nội dung với `dash-overdue-ar`/`dash-overdue-ap`** —
  cùng `queryFn`, cùng mount trên tab Công nợ. Gọi đôi mỗi lần vào tab, và sau một lần
  refetch cục bộ thì thẻ KPI "Quá hạn" với bảng bên dưới có thể lệch thời điểm.

## Xử lý lỗi

**`dashboardService.ts` nuốt mọi lỗi và trả về 0** (hành vi có sẵn từ trước, đã ghi chú
trong file). Khi reporting-service sập, tab Tổng quan hiện 8 thẻ KPI toàn `0 ₫` và
"0 cảnh báo" — một dashboard xanh, tự tin, và sai. Trong khi tab Bán hàng cách một cú bấm
lại hiện lỗi đỏ đàng hoàng vì `doanhSoService` cố ý ném lỗi.

Sửa cho nhất quán nghĩa là đụng 18 khối `catch {}` và 6 component mà đợt này không mở
(`AgingCharts`, `TopPartnersCharts`, `OverdueTables`, `CongNoChart`, `BalanceStructureChart`,
`NghiaVuChinhSachTable`) — tất cả đều giả định luôn có giá trị, không bao giờ có lỗi.
Đáng làm thành một việc riêng.

## Hiệu năng

`GET /bao-cao/doanh-so-theo` quét toàn bộ nhật ký của kỳ hiện tại **và** kỳ năm trước;
`ServiceClient.getNhatKyChung` phân trang `limit=100`. Khoá React Query gồm cả `groupBy`
lẫn `dimension`, nên đổi bất kỳ dropdown nào cũng chạy lại cả hai lần quét — dù `theoChieu`
không phụ thuộc `groupBy` và `theoThoiGian` không phụ thuộc `dimension`. Tenant có ~20k
bút toán/năm thì mỗi cú bấm là ~400 vòng gọi nội bộ.

## Nợ kỹ thuật nhỏ

- Test `nhanKy` toàn dùng ngày `T00:00:00Z` trong khi máy chạy ở `+07:00`, nên một hồi quy
  từ `getUTCFullYear` sang `getFullYear` vẫn PASS. Code hiện tại đúng, chỉ là test yếu.
- `CongNoTab.tsx` dày (7 `useQuery` + 4 `useMemo` + dựng mảng KPI). Thêm khối nữa thì nên
  tách `useCongNoKpis`.
- Code chết: `DoanhSoGroupBy` trong `be/libs/dto/src/reporting/doanh-so.dto.ts` không ai dùng
  (service dùng `GroupBy` từ helper); `getKqkdTongHop` trả `ebitda` mà không caller nào đọc.
- Ô icon của `KpiRow` luôn màu primary, không phản ánh trạng thái tốt/xấu như màu con số.
- Nhãn KPI tab Bán hàng ("Số đối tượng có doanh số", "Doanh số bình quân") đổi ý nghĩa theo
  dropdown chiều của biểu đồ bên dưới, mà trên thẻ không có gì nói vậy. Nhóm "Không xác định"
  cũng được đếm là một đối tượng, làm loãng số bình quân.

## Ngoài phạm vi từ đầu (nhắc lại)

Module nhập kế hoạch / ngân sách / dự báo; danh mục Khu vực-Điểm và Nguồn khách hàng;
luồng ký xác nhận biên bản đối chiếu công nợ. Xem phần "Ngoài phạm vi" của spec.
