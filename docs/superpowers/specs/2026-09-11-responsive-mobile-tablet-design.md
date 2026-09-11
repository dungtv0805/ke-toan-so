# Responsive toàn ứng dụng — điện thoại & máy tính bảng

Ngày: 11/09/2026 · Nhánh: `feat/responsive-mobile-tablet`

## Mục tiêu và giới hạn

- **Điện thoại (< 768px): để XEM** — báo cáo, tra cứu, duyệt. Nhập liệu vẫn mở được,
  chỉ cần không vỡ bố cục.
- **Máy tính bảng (768–1279px): để NHẬP** — form chứng từ, lưới Kế hoạch dùng được bằng tay.
- **Máy tính (≥ 1280px): GIỮ NGUYÊN.** Mọi thay đổi phải nằm sau điều kiện màn hình
  (`max-width` hoặc `useManHinh()`); màn ≥ 1280px không đổi một pixel.
- Bảng trên điện thoại **cuộn ngang** (không đổi sang dạng thẻ).
- Nghiệm thu: test tự động + harness cục bộ (dữ liệu giả, `src/dev/`); người dùng tự kiểm
  trên thiết bị thật sau deploy. Không chụp app thật.
- Bỏ qua các trang `legacy` ẩn khỏi menu (Bếp ăn, Sổ cái, Bảng cân đối, Doanh thu…).

## Điểm ngắt — một nguồn

`fe/src/config/manHinh.ts`: `MOBILE_MAX = 767`, `TABLET_MAX = 1279` — trùng Tailwind `md`
(768) và `xl` (1280) nên CSS/Tailwind dùng `max-md:` / `max-xl:` hoặc
`@media (max-width: 767.98px)` / `(max-width: 1279.98px)`.
Hook `useManHinh(): 'mobile' | 'tablet' | 'desktop'` đọc đồng bộ ngay lần render đầu
(`useSyncExternalStore` + `matchMedia`) — hết nháy sidebar desktop trên điện thoại.
`useIsMobile` dựa trên nó. KHÔNG đổi thang breakpoint của antd (`Col xs/sm/md…`) — đổi là
lệch bố cục ở các trang đang dùng.

## Đợt 1 — Nền tảng (sửa một chỗ, mọi trang hưởng)

1. **Khung app.**
   - Máy tính bảng: sidebar chỉ chiếm rail 62px; bấm icon phân hệ thì panel mở **đè lên**
     nội dung (có lớp nền mờ, bấm ra ngoài / chọn mục thì đóng), không đẩy nội dung.
     Trạng thái này không lưu, không đụng lựa chọn thu gọn đã lưu của máy tính.
   - Điện thoại: giữ drawer 2 lớp sẵn có.
   - `100vh` → `100dvh` ở khung (Content, sidebar); chừa `safe-area-inset` khi chạy PWA.
2. **Cỡ chữ & nút theo màn.** `ConfigProvider` đổi token theo màn:
   điện thoại `fontSize 13 / controlHeight 36`; màn cảm ứng (`pointer: coarse`) cỡ tablet
   `fontSize 12 / controlHeight 32`; máy tính giữ `11 / 28`. Ô nhập trên điện thoại cỡ chữ
   16px để iPhone không tự phóng to trang.
3. **Quy tắc toàn cục trên điện thoại** (`fe/src/styles/responsive.css`):
   - Cả trang cuộn dọc, bảng chỉ cuộn ngang: bỏ `max-height` thân bảng
     (`.ant-table-body`), trang cao-một-màn (`.nkc-page`, `.nkc-form-page`…) về `height:auto`.
   - Cột ghim: chỉ giữ cột ghim trái ĐẦU TIÊN (sau cột chọn nếu có); cột ghim phải và các
     cột ghim trái còn lại thành cột thường. Khai cả tên lớp antd 6 (`-fix-start/-end`) lẫn
     antd 5 (`-fix-left/-right`).
   - Popup (Modal, trừ hộp xác nhận) toàn màn hình.
4. **Form popup chia cột.** Codemod `<Col span={N}>` (chỉ số, không có prop breakpoint khác)
   → `<Col xs={24} sm={max(N,12)} md={N}>`: từ 768px trở lên y hệt cũ, dưới đó xuống 1–2 cột.
5. **Thanh lọc chung** (`components/common/FilterBar`): ô tìm kiếm co giãn full-width trên
   điện thoại.

## Đợt 2 — Báo cáo quản trị
Bảng điều hành (làm nốt biểu đồ, modal cài đặt), BCTC, P&L / P&L không khấu hao / So sánh,
Sổ chi tiết TK, Tổng hợp công nợ, Công nợ phải thu/trả, Sổ quỹ, Báo cáo hợp đồng, Thuế TNDN,
Tổng hợp thuế. Hàng lọc bề rộng cố định → co giãn/xuống dòng; thẻ số liệu xếp chồng; cột ghim
tên chỉ tiêu hẹp lại dưới 768px.

## Đợt 3 — Danh sách tra cứu
Thực hiện (NKC), Phiếu thu/chi, Nhập/Xuất/Chuyển kho, Bán hàng (hợp đồng), Bảng kê mua
vào/bán ra, Kết chuyển lãi lỗ. Nút lệnh chỉ còn icon (có tooltip/aria-label) dưới 768px,
hàng lọc gọn, thẻ số liệu không chiếm hết màn.

## Đợt 4 — Thư viện, Cấu hình, Danh mục
`DocumentLibraryPage` (22 route), Vai trò, Phân quyền, Thành viên, Công ty, Lĩnh vực,
26 trang danh mục (`BangDuLieu`).

## Đợt 5 — Nhập liệu trên máy tính bảng
Form chứng từ NKC (`FormHeader`, `ChiTietTable`), form Kế hoạch, form Kết chuyển, popup
phiếu kho 1100px, popup phiếu thu/chi. Ô header không `minWidth` cứng, bảng chi tiết cao
theo màn, nút lưu luôn trong tầm tay.

## Cách làm từng trang (quy tắc cho mọi đợt)

- Ưu tiên Tailwind `max-md:` / `max-xl:` hoặc `@media` trong file CSS riêng của đợt;
  `useManHinh()` khi phải đổi cấu trúc (số cột, ẩn nhãn).
- KHÔNG sửa DOM của bảng bằng tay (xem memory ghim-cot-phai-dung-state-react).
- KHÔNG đổi logic nghiệp vụ, API, quyền.
- Test hiện có của trang phải xanh; thêm test cho hook/quy tắc mới khi có logic.

## Rủi ro đã biết

- Không có ảnh chụp app thật → lỗi bố cục riêng từng trang có thể lọt; người dùng kiểm
  sau deploy.
- `.ant-table-body` hết `max-height` trên điện thoại → mất header dính khi cuộn danh sách dài.
- Popup toàn màn hình áp cho mọi Modal (trừ confirm) — popup nhỏ cũng phủ kín màn.
