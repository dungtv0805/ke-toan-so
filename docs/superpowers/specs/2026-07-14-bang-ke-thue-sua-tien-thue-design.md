# Bảng kê thuế — sửa được tiền thuế và tổng thanh toán

Hiện `tienThue` và `tongThanhToan` **luôn bị backend tính lại và ghi đè** ở cả 3 đường ghi (tạo, import, sửa) — `applyTotals` trong `bang-ke-mua-vao.service.ts:33` và `bang-ke-ban-ra.service.ts:33`. Hóa đơn nhà cung cấp làm tròn khác công thức (tính thuế trên từng dòng hàng rồi cộng) thì nhập vào bị sai vài đồng, không sửa được.

Mục tiêu: **mặc định vẫn tính theo công thức**, nhưng người dùng sửa được tiền thuế và tổng thanh toán — cả khi nhập tay lẫn khi import Excel.

## Quy tắc liên động (frontend giữ)

- Đổi **Giá trị chưa thuế** hoặc **Thuế suất** → tính lại `tienThue = round(giá × suất)` và `tongThanhToan = giá + tienThue`, **ghi đè** số đã sửa tay.
- Sửa **Tiền thuế** → `tongThanhToan = giá + tienThue`.
- Sửa **Tổng thanh toán** → chỉ mình nó đổi.

Số tay chỉ tồn tại đến khi người dùng sửa thứ "phía trên" nó. Đúng nhu cầu: vá chênh lệch làm tròn, còn khi đổi giá trị hóa đơn thì tính lại từ đầu.

## Backend

`applyTotals` (cả 2 service — mua vào và bán ra) đổi thành ưu tiên giá trị gửi lên:

```ts
const gia  = dto.giaTriChuaThue ?? target.giaTriChuaThue ?? 0;
const suat = dto.thueSuat ?? target.thueSuat ?? '10';
const thue = dto.tienThue ?? tinhTienThue(gia, suat);
target.giaTriChuaThue = gia;
target.thueSuat = suat;
target.tienThue = thue;
target.tongThanhToan = dto.tongThanhToan ?? Number(gia) + thue;
```

`CreateBangKeMuaVaoDto` / `CreateBangKeBanRaDto` thêm 2 field tùy chọn:

```ts
@IsNumber() @IsOptional() @Min(0) tienThue?: number;
@IsNumber() @IsOptional() @Min(0) tongThanhToan?: number;
```

Bắt buộc phải khai báo: `main.ts` bật `forbidNonWhitelisted: true` nên gửi field lạ là 400. `UpdateDto` là `PartialType(CreateDto)` nên tự có; `ImportDto` dùng `CreateDto` nên cũng tự có.

Backend **không tự cảnh báo lệch** — nó chỉ lưu đúng cái nhận được.

## Form nhập tay (`fe/src/pages/thue/components/BangKePage.tsx`)

Hai ô "Tiền thuế (tự tính)" / "Tổng thanh toán (tự tính)" (đang là `Input disabled`) thành `Form.Item name="tienThue"` / `name="tongThanhToan"` với `InputNumber` sửa được, nhãn bỏ chữ "(tự tính)". Liên động theo quy tắc trên, cài trong `onValuesChange` của Form.

Dưới ô Tiền thuế: cảnh báo vàng khi lệch công thức **quá 1.000 đ** — ví dụ "Lệch 2.000.000 đ so với công thức (10%)". Chênh vài đồng do làm tròn thì im lặng. Cảnh báo **không chặn lưu**.

Khi submit, form gửi luôn `tienThue` và `tongThanhToan` hiện có.

## Import Excel

### File mẫu

11 cột (thêm 2 cột **không bắt buộc**, đặt ngay sau "Thuế suất"):

| # | Cột | Bắt buộc |
|---|---|---|
| 1 | Ngày hóa đơn | ✅ |
| 2 | Số hóa đơn | ✅ |
| 3 | Ký hiệu | |
| 4 | Tên người bán / Tên người mua | ✅ |
| 5 | MST người bán / MST người mua | |
| 6 | Tên hàng hóa / dịch vụ | |
| 7 | Giá trị chưa thuế | ✅ |
| 8 | Thuế suất | ✅ |
| 9 | **Tiền thuế** | |
| 10 | **Tổng thanh toán** | |
| 11 | Ghi chú | |

Ô trống ở cột 9/10 → tính theo công thức (FE để trống field, BE tự tính).

### Parser: khớp cột theo TÊN, không theo vị trí

`aoaToRawRows` hiện map cột **theo index** và `headerMatches` so header theo đúng thứ tự (`parseRows.ts:27,36`). Chèn 2 cột mới sẽ làm **file mẫu cũ 9 cột** hỏng.

Đổi sang khớp theo tiêu đề, chuẩn hóa bằng `fold()` (trim + hạ hoa thường + bỏ dấu tiếng Việt):

- `buildHeaderMap(aoa, columns): Map<ImportColumnKey, number>` — tên cột → chỉ số cột thực tế trong file.
- `missingRequiredColumns(aoa, columns): string[]` — tên các cột **bắt buộc** không tìm thấy; rỗng = file hợp lệ. Thay `headerMatches`; thông báo lỗi nêu đúng tên cột thiếu thay vì "sai định dạng file".
- `aoaToRawRows(aoa, columns)` đọc ô theo header map.

Kết quả: file mẫu cũ (9 cột, không có Tiền thuế / Tổng thanh toán) vẫn import bình thường; file mới 11 cột nhận đủ; cột xếp sai thứ tự cũng không sao.

### Validate (`validate.ts`)

- `tienThue`, `tongThanhToan`: parse bằng `normalizeAmount`; không phải số hoặc số âm → **lỗi** (chặn dòng đó). Để trống → không đưa vào payload.
- Cảnh báo (không chặn): có `tienThue` và `|tienThue − round(giá × suất)| > 1.000` → `"Tiền thuế: lệch {số} đ so với công thức ({suất}%)"`.
- `BangKeImportItem` thêm `tienThue?: number; tongThanhToan?: number`.

Cảnh báo hiện ở bảng xem trước như cảnh báo MST sai đang có.

## Kiểm thử

BE (`be/apps/tax-service/src/bang-ke-mua-vao/*.spec.ts` — tạo mới nếu chưa có, và bản đối xứng cho bán ra):
- `create` có `tienThue` → lưu đúng số đó, không tính lại; không có → tính theo công thức.
- `tongThanhToan` gửi lên → giữ; không gửi → `giá + tienThue`.
- `importMany` giữ số của từng dòng.
- `update` đổi `giaTriChuaThue` mà FE gửi kèm `tienThue` mới → lưu số mới.

FE (`fe/src/pages/thue/components/import/lib/__tests__/`):
- `parseRows`: file 9 cột cũ vẫn parse đủ 9 field; file 11 cột đọc đúng Tiền thuế / Tổng thanh toán; cột đảo thứ tự vẫn đúng; thiếu cột bắt buộc → `missingRequiredColumns` nêu tên cột.
- `validate`: tiền thuế trống → item không có field; tiền thuế lệch > 1.000 đ → warning, vẫn `validItems`; tiền thuế âm/không phải số → error.
- `template`: file mẫu có đủ 11 tiêu đề, dropdown thuế suất vẫn đúng cột.
- `roundtrip`: dựng template → parse lại → validate ra item hợp lệ (test sẵn có, cập nhật theo 11 cột).
