# Thiết kế: Import Nhật ký chung từ file Excel

- **Ngày:** 2026-06-03
- **Trạng thái:** Đã duyệt design, chờ viết plan
- **Phạm vi:** Thêm chức năng import chứng từ Nhật ký chung từ file Excel, song song với nhập tay hiện có.

## 1. Mục đích

Hiện tại chứng từ Nhật ký chung chỉ thêm được **bằng tay** qua form (header + từng dòng hạch toán). Khi cần nhập số lượng lớn (dữ liệu đầu kỳ, chuyển từ phần mềm cũ, sao kê ngân hàng...), nhập tay rất tốn thời gian.

Chức năng này cho phép kế toán tải lên một file Excel để tạo hàng loạt chứng từ, dùng lại đúng pipeline dữ liệu của form nhập tay.

## 2. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Phạm vi cột | **Đầy đủ tất cả chiều phân bổ** (TK Nợ/Có + mọi danh mục) |
| Gom chứng từ | **Mỗi dòng Excel = 1 chứng từ độc lập**, hệ thống tự sinh số phiếu riêng |
| Xử lý lỗi | **Xem trước + chặn nếu có lỗi** (không import khi còn dòng sai) |
| File mẫu | **Nút "Tải file mẫu" .xlsx chuẩn** |
| Khớp danh mục | Theo **mã** |
| Kiến trúc | **Hướng A — đọc & khớp danh mục ở Frontend**, BE chỉ thêm endpoint ghi |
| TK Nợ = TK Có | **Cảnh báo, vẫn cho import** |
| Số phiếu theo năm | Giữ nguyên hành vi hiện tại (dùng năm hiện tại, không theo năm chứng từ) |

## 3. Hiện trạng (tham chiếu code)

- **Entity** `ChungTu` (`be/libs/entities/src/voucher/chung-tu.entity.ts`): mỗi bản ghi là **một dòng** với `soPhieu`, `loai` (PHIEU_THU/PHIEU_CHI), `ngay`, `soTien`, `noiDung`, `nguoiGiaoDich`, `diaChi`, `ghiChu`, `nguoiTaoId`, và `danhMuc` (simple-json chứa snapshot mọi danh mục: taiKhoanNo, taiKhoanCo, loaiGiaoDich, nghiepVu, doiTuong, duAn, boPhan, ...).
- **Submit nhập tay** (`fe/.../nhat-ky-chung/form-handler/sub-handler/submit/submit.handler.ts`):
  - `validateForm` yêu cầu: `ngay`, `loaiGiaoDich`, ≥1 dòng; mỗi dòng cần `nghiepVu`, `taiKhoanNo`, `taiKhoanCo`, `soTien > 0`.
  - `buildDanhMuc` dựng `danhMuc` từ master data + snapshot (dùng `@/utils/snapshotBuilder`).
  - `loai` suy ra từ `loaiGiaoDich`: `PHIEU_CHI`/`BAO_NO` → `PHIEU_CHI`, còn lại → `PHIEU_THU`.
- **Backend** (`be/apps/voucher-service/src/nhat-ky-chung/`):
  - `createBatch` tạo nhiều dòng nhưng **dùng CHUNG 1 số phiếu** → không phù hợp import (cần số phiếu riêng từng dòng).
  - `VoucherNumberService.generateVoucherNumber(loai)` sinh `PT001/2024` / `PC001/2024`, tăng sequence trong DB (findOne + save), lấy **năm hiện tại**.
- **FE** đã có sẵn dependency `xlsx` (`^0.18.5`).

## 4. Luồng tổng quan

```
[Trang Nhật ký chung] → Nút "Import Excel" → Modal Import
  1. Tải file mẫu (.xlsx)                 (nút trong modal)
  2. Chọn file Excel                      → FE đọc bằng xlsx (SheetJS)
  3. FE khớp mã danh mục + validate từng dòng
       (dùng lại master data & snapshotBuilder của form)
  4. Bảng XEM TRƯỚC: tô đỏ ô/dòng lỗi + lý do; tổng kết X hợp lệ / Y lỗi
  5. Còn lỗi → khóa nút Import (sửa file, tải lại)
     Sạch    → bấm "Import N chứng từ"
  6. FE gửi danh sách item (đã dựng danhMuc đầy đủ) → POST /nhat-ky-chung/import
  7. BE: mỗi item → sinh số phiếu riêng + tạo ChungTu
  8. Thành công → đóng modal, reload danh sách + thông báo
```

## 5. Cấu trúc file Excel mẫu

Một hàng = một chứng từ (một dòng hạch toán). Cột bắt buộc đánh dấu (*).

| # | Cột | Bắt buộc | Ghi chú |
|---|---|---|---|
| 1 | Ngày chứng từ | * | định dạng `DD/MM/YYYY` |
| 2 | Loại giao dịch | * | điền **mã** (PHIEU_THU / PHIEU_CHI / ...) |
| 3 | Nghiệp vụ | * | mã nghiệp vụ, phải thuộc loại giao dịch ở cột 2 |
| 4 | TK Nợ | * | mã tài khoản (vd 156) |
| 5 | TK Có | * | mã tài khoản (vd 331) |
| 6 | Số tiền | * | số > 0 |
| 7 | Diễn giải | | nội dung dòng |
| 8 | Người giao dịch | | |
| 9 | Địa chỉ | | |
| 10 | Ghi chú | | |
| 11 | Mã đối tượng | | |
| 12 | Mã đối tượng 2 | | |
| 13 | Mã dự án | | |
| 14 | Mã bộ phận | | |
| 15 | Mã đội | | |
| 16 | Mã nhân viên | | |
| 17 | Mã sản phẩm | | |
| 18 | Mã dòng tiền | | |
| 19 | Mã khoản mục | | |
| 20 | Mã hợp đồng | | |
| 21 | Mã nhóm khuyến mãi | | |
| 22 | Mã nhóm quản lý | | |

Cột 11–22 là chiều phân bổ tùy chọn — để trống nếu không dùng.

## 6. Frontend (CHanlder pattern)

Module mới cạnh form hiện tại:

```
src/pages/chung-tu/nhat-ky-chung/import/
├── ImportExcelModal.tsx              # Modal (wraps Provider)
├── ImportHandlerContext.tsx          # Context + Provider + hooks
├── import.handler.ts                 # Handler chính
├── components/
│   ├── upload/UploadStep.tsx         # nút tải mẫu + chọn file
│   └── preview/PreviewTable.tsx      # bảng xem trước, tô đỏ lỗi
└── sub-handler/
    ├── index.ts
    ├── download-template/            # tạo & tải file .xlsx mẫu
    ├── parse/                        # đọc file → rows thô (xlsx)
    ├── validate/                     # khớp mã + validate → dựng danhMuc
    └── submit/                       # gọi API import
```

- **Master data:** modal khi mở load các danh mục giống `load-data.handler` của form (tài khoản, đối tượng, dự án, nghiệp vụ/quyChuan...). Tách phần load-data dùng chung nếu khả thi để tránh trùng lặp.
- **Dựng `danhMuc`:** rút `buildDanhMuc` (hiện nằm trong submit handler) thành hàm dùng chung, tái dùng cho cả nhập tay và import; dùng `@/utils/snapshotBuilder`.
- **Nút "Import Excel"** đặt ở header trang danh sách Nhật ký chung, cạnh nút "Thêm mới".
- **Mỗi dòng Excel** → một item gồm: `loai` (suy từ loại GD), `ngay`, `soTien`, `noiDung`, `nguoiGiaoDich`, `diaChi`, `ghiChu`, `danhMuc` (đầy đủ snapshot).

## 7. Quy tắc validate từng dòng (FE)

| Kiểm tra | Lỗi nếu |
|---|---|
| Trường bắt buộc | Cột 1–6 trống |
| Ngày | Không parse được `DD/MM/YYYY` |
| Số tiền | Không phải số, hoặc ≤ 0 (chuẩn hóa dấu phẩy ngăn cách nghìn trước khi parse) |
| Loại giao dịch | Mã không có trong danh mục loại GD |
| Nghiệp vụ | Mã không tồn tại, hoặc không thuộc loại GD đã chọn |
| TK Nợ / TK Có | Mã không có trong danh mục tài khoản |
| TK Nợ = TK Có | **Cảnh báo, vẫn cho import** |
| Chiều phân bổ (cột 11–22) | Có điền nhưng mã không tồn tại trong danh mục tương ứng |
| Dòng trống hoàn toàn | Bỏ qua, không tính lỗi |

Mỗi lỗi hiển thị kèm **số dòng Excel + tên cột + lý do**.

## 8. Backend

- **DTO mới** `ImportNhatKyChungDto`: mảng item, mỗi item cùng shape với `CreateNhatKyChungDto` (đã có `danhMuc` dựng sẵn từ FE), `ngay` riêng từng item.
- **Route mới** `POST /nhat-ky-chung/import` trong `NhatKyChungController`, role `ADMIN / KE_TOAN_TRUONG / KE_TOAN_QUY`.
- **Service `importEntries(items, userId)`:**
  - Mỗi item → **số phiếu riêng** + tạo `ChungTu` (khác `createBatch` vốn dùng chung số phiếu).
  - **Tối ưu + an toàn (khuyến nghị):** thêm `VoucherNumberService.generateVoucherNumbers(loai, count)` — đặt trước cả dải số trong 1 lần update sequence. Gom item theo `loai`, đặt dải số tương ứng, gán cho từng item, rồi `save()` một lần. Tránh 2×N truy vấn, giảm rủi ro ghi dở dang.
- **Số phiếu theo năm:** giữ nguyên hành vi hiện tại (năm hiện tại, không theo năm chứng từ) — nhất quán với nhập tay.

## 9. Edge cases

- File rỗng / không có dòng dữ liệu.
- Sai số cột so với mẫu.
- Ô số tiền có dấu phẩy ngăn cách nghìn (`10,000,000`) → chuẩn hóa khi parse.
- Ngày ở dạng serial number của Excel → xlsx xử lý / chuẩn hóa.
- File quá lớn → cảnh báo mềm (vd > 1000 dòng).

## 10. Testing

- **BE unit:**
  - `importEntries` sinh số phiếu riêng cho từng item.
  - `generateVoucherNumbers(loai, count)` đặt dải số đúng, liên tục.
  - Gom theo `loai` đúng (PHIEU_THU/PHIEU_CHI tách dải riêng).
- **FE (TDD):**
  - Hàm validate: phủ các case lỗi ở Mục 7.
  - Hàm parse: chuẩn hóa số (dấu phẩy), ngày (DD/MM/YYYY và serial Excel), bỏ dòng trống.

## 11. Ngoài phạm vi (YAGNI)

- Import chứng từ nhiều dòng (gom theo cột số phiếu) — hiện mỗi giao dịch chỉ 1 dòng.
- Tự tạo mới danh mục khi mã không tồn tại — mã sai bị báo lỗi, không tự tạo.
- Import bất đồng bộ / job nền cho file cực lớn.
- Số phiếu sinh theo năm của ngày chứng từ.
