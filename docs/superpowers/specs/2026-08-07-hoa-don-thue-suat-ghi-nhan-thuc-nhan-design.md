# Hóa đơn bán ra có thuế suất & Ghi nhận doanh thu theo số thực nhận

Ngày: 2026-08-07
Tiếp nối: `2026-08-07-don-hang-doanh-thu-design.md`

## Bối cảnh

Hai chỗ vướng khi kế toán dùng thật:

1. Form **Hóa đơn bán ra** chỉ có *Tiền hàng* và *Tiền thuế* gõ tay — không có thuế
   suất, nên vừa mất công nhân nhẩm vừa không thống kê được theo mức thuế.
2. Modal **Ghi nhận doanh thu** mặc định điền số dư 3387 còn treo. Số này chỉ khác 0
   khi tiền về được hạch toán qua nút "+ Thu tiền"; kế toán nhập phiếu thu tay thì ô
   số tiền trống, phải tự tra lại đã thu bao nhiêu.

## 1. Thuế suất trên hóa đơn bán ra

Ô **Thuế suất** đặt cạnh *Tiền hàng*, dùng chung `THUE_SUAT_OPTIONS` với Bảng kê thuế:
`0% · 5% · 8% · 10% · Không chịu thuế (KCT) · Không kê khai/khấu trừ (KKKT)`.

**Quy tắc tính:** đổi *Tiền hàng* hoặc *Thuế suất* → *Tiền thuế* tính lại
`= làm tròn(tiền hàng × hệ số)`, ghi đè giá trị đang có. Sửa tay *Tiền thuế* sau đó thì
giữ nguyên số sửa tay cho tới lần đụng lại một trong hai ô kia. KCT/KKKT → hệ số 0.
*Tổng* giữ nguyên công thức `tiền hàng + tiền thuế`.

| Chỗ sửa | Việc |
|---|---|
| `fe/src/services/taxService.ts` | export `THUE_RATE` + `tinhTienThue(tienHang, thueSuat)` |
| `fe/src/pages/thue/components/BangKePage.tsx` | bỏ `RATE` cục bộ, dùng `THUE_RATE` chung |
| `fe/src/types/index.ts` | `HoaDonBanRa.thueSuat?: string` |
| `fe/src/pages/trung-tam-du-lieu/hd-ban-ra/SoHoaDonBanRaPage.tsx` | ô Select + tự tính + cột "Thuế suất" |
| `be/libs/entities/src/master-data/hoa-don-ban-ra.entity.ts` | `@Column({ nullable: true }) thueSuat?: string` |
| `be/apps/master-data-service/src/hoa-don-ban-ra/dto/index.ts` | thêm `thueSuat?` vào 2 DTO |

Hệ số thuế đang khai báo cục bộ trong `BangKePage.tsx` — chuyển lên `taxService` để hóa
đơn và bảng kê dùng chung một bảng, tránh lệch về sau.

Cột **Thuế suất** hiện dưới dạng Tag, đặt trước cột *Tiền thuế*, nằm trong cấu hình
ẩn/hiện cột. Hóa đơn cũ để trống thuế suất — không migrate dữ liệu.

## 2. Ghi nhận doanh thu mặc định = số thực nhận

Mặc định số tiền trong modal = **`đã thu − đã ghi nhận doanh thu`**, trong đó *đã thu* là
tổng Sổ thu tiền của đơn hàng (đúng ô *Đã thanh toán* mà Drawer đang hiển thị). Cách này
chạy đúng cả khi phiếu thu nhập tay không qua nút "+ Thu tiền". Ra ≤ 0 thì để trống ô,
không điền số vô nghĩa. Kế toán vẫn sửa được trước khi lưu.

`GhiNhanDoanhThuSection` nhận thêm prop `daThanhToan` — trang cha đã tính sẵn từ
`receipts` nên không phát sinh lời gọi API.

Khối tổng hiển thị thêm **"Thực nhận: X"** cạnh *Đã ghi nhận* / *Chưa ghi nhận*; modal
chú thích "Mặc định = tiền đã thu − đã ghi nhận doanh thu".

Bút toán sinh ra không đổi: **Nợ 3387 / Có 511** gắn đơn hàng, nằm ở Nhật ký chung.

## Kiểm thử

Hai hàm thuần + unit test (vitest):

- `tinhTienThue(tienHang, thueSuat)` — các mức 0/5/8/10, KCT/KKKT → 0, làm tròn, đầu vào rỗng
- `tinhMacDinhGhiNhan(daThanhToan, daGhiNhan)` — còn lại dương, bằng 0, âm → `undefined`

Phần còn lại là wiring form, không viết test.

## Deploy

FE (nginx build4) + `master-data-service` (đổi entity/DTO hóa đơn).
