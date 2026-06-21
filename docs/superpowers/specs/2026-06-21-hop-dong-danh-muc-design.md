# Thiết kế: Danh mục Hợp đồng khớp sheet "Hợp đồng" (Phần 1/3)

- **Ngày:** 2026-06-21
- **Nguồn:** `docs/templates/Master CEO_QUẢN LÝ HỢP ĐỒNG .xlsx`, sheet **"Hợp đồng"**
- **Phạm vi:** Phần 1 của loạt 3 phần (1. Danh mục HĐ — 2. Theo dõi HĐ — 3. Báo cáo HĐ).

## Bối cảnh

Entity/trang `hop_dong` đã tồn tại và khớp ~90% sheet. Phần 1 chỉ tinh chỉnh cho khớp:
- Bảng danh sách đã có sẵn các cột Số HĐ, Tên công trình, Giá trị sau thuế, Ngày ký,
  Chủ đầu tư, Trạng thái, SL lưu → **chỉ thiếu cột Năm**.
- Form đã có đủ nhóm (giá trị/phụ lục/chủ đầu tư/điều khoản TT/bảo hành/tiến độ/trạng thái).

## Quyết định (đã chốt với người dùng)

1. **Thêm trường `Năm`** — nhập tay, tự gợi ý = năm của *Ngày ký* khi Năm còn trống (vẫn sửa được).
2. **Điều khoản thanh toán** (`tamUng` / `thanhToanGiaiDoan` / `quyetToan`) đổi từ **chuỗi → số tiền (number)**.

## Thay đổi

### Backend (`master-data-service`)
- `be/libs/entities/src/master-data/hop-dong.entity.ts`:
  - Thêm `@Column({ nullable: true }) nam?: number;`
  - `interface DieuKhoanThanhToan`: `tamUng?` / `thanhToanGiaiDoan?` / `quyetToan?` đổi `string` → `number`.
- `be/apps/master-data-service/src/hop-dong/dto/create-hop-dong.dto.ts`:
  - Thêm `nam?` (`@IsOptional @IsInt @Min(1900)`).
  - `DieuKhoanThanhToanDto`: 3 field đổi `@IsString` → `@IsNumber`.

### Frontend (`fe/`)
- `src/types/index.ts`:
  - `HopDong` thêm `nam?: number`.
  - `DieuKhoanThanhToan`: 3 field đổi `string` → `number`.
- `src/pages/danh-muc/hop-dong/HopDongPage.tsx`:
  - `FormValues`: thêm `nam?: number`; `dieuKhoanThanhToan` 3 field đổi sang `number`.
  - `transformToFormValues` / `transformToSubmitData`: thêm `nam`.
  - Tab "Thông tin chính": thêm ô **Năm** (`InputNumber`); `DatePicker` Ngày ký thêm `onChange`
    để tự set `nam` = `value.year()` khi ô Năm đang trống.
  - Tab "Thanh toán & Bảo hành": 3 ô điều khoản TT đổi `Input.TextArea` → **`InputNumber`** (định
    dạng tiền tệ, `addonAfter="VNĐ"`, giống ô Giá trị sau thuế).
  - Bảng: thêm cột **Năm** (sau "Số HĐ", `width 80`, align center).

## Dữ liệu cũ
Điều khoản TT cũ (nếu lưu dạng chữ) sẽ hiển thị trống ở 3 ô số tiền sau khi đổi kiểu — người
dùng nhập lại. Danh mục dùng nhẹ nên ảnh hưởng tối thiểu; không làm migration ở phần này.

## Ngoài phạm vi
Không đụng logic khác của trang; không làm Phần 2 (Theo dõi HĐ) / Phần 3 (Báo cáo HĐ).
