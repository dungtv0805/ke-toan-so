# Thiết kế: Sổ chi tiết mở phiếu, quy tắc số TK ngân hàng, trạng thái "Chưa hợp lệ", nhiều lý do

Ngày: 2026-07-01

## Bối cảnh

Gộp 4 yêu cầu chỉnh sửa từ người dùng (kế toán) trên hệ thống Digital Books (FE React/CHanlder + BE NestJS microservices).

## Yêu cầu & Thiết kế

### 1. Sổ chi tiết tài khoản — kích vào phiếu để mở sửa (tab mới)

**Hiện trạng:** Trang `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/`. Mỗi dòng phát sinh (`kind: 'entry'`) chỉ có `soPhieu`, không có id phiếu. Đã có route sửa sẵn `/chung-tu/nhat-ky-chung/:soPhieu/sua` (App.tsx) và `nhatKyChungService.getBySoPhieu(soPhieu)`.

**Thiết kế:**
- Cột "Số hiệu" (`soPhieu`) của các dòng `kind: 'entry'` render thành link.
- Bấm → mở **tab mới** (`<a target="_blank">` hoặc `window.open`) tới `/chung-tu/nhat-ky-chung/{encodeURIComponent(soPhieu)}/sua`. Báo cáo giữ nguyên.
- Dòng số dư đầu/cuối kỳ, dòng cộng: không có link.
- File: `columnRegistry.ts` (render cột số hiệu), có thể chạm `AccountReportBlock.tsx`.

**Rủi ro cần kiểm khi làm:** Xác nhận trang sửa nhật ký chung mở được cho mọi loại phiếu (thu/chi/kế toán) qua `getBySoPhieu`. Nếu loại nào chưa mở được, báo lại người dùng.

### 2. Quy tắc "Số tài khoản ngân hàng" bắt buộc cho TK 1121

**Hiện trạng:** Cơ chế quy tắc nhập chứng từ dựa trên `fieldRules` (JSON `Partial<Record<FieldRuleKey, 'BAT_BUOC'|'CANH_BAO'>>`) trên từng tài khoản. Keys hiện có: `doiTuong, duAn, boPhan, doi, nhanVien, sanPham, dongTien, khoanMuc` (`be/libs/entities/src/master-data/tai-khoan.entity.ts`, `FIELD_RULE_KEYS`). Validate: FE `fieldRulesValidation.ts` + `submit.handler.ts`, BE `field-rules-validation.service.ts`. Khi TK có `chiTietTheo = NGAN_HANG_QUY`, ô "Đối tượng" đổ dropdown = danh mục ngân hàng/quỹ; chọn 1 bản ghi ngân hàng lưu snapshot có `soTaiKhoan`.

**Thiết kế:**
- Thêm rule key mới `soTaiKhoanNganHang` vào `FIELD_RULE_KEYS` (2 mức BAT_BUOC/CANH_BAO như các key khác).
- Ý nghĩa khi BAT_BUOC trên 1 tài khoản (vd 1121): dòng bút toán dùng tài khoản đó phải có **đối tượng là ngân hàng và snapshot có `soTaiKhoan` khác rỗng**. Thiếu → chặn (BAT_BUOC) hoặc hỏi xác nhận (CANH_BAO).
- Validate đọc snapshot đối tượng theo từng bên: TK Nợ dùng `doiTuong`/snapshot Nợ, TK Có dùng `doiTuong2`/snapshot Có (giống cách `doiTuong` hiện xử lý).
- File: BE `tai-khoan.entity.ts` (thêm key + nhãn), `field-rules-validation.service.ts`; FE `TaiKhoanPage.tsx` (UI bật/tắt rule), `fieldRulesValidation.ts`, `submit.handler.ts`.

**Cần kiểm khi làm:** cấu trúc snapshot ngân hàng trên dòng (`buildNganHangSnapshot`) để biết `soTaiKhoan` nằm ở đâu, xác định cách validate đọc field.

### 3. Trạng thái kiểm soát "Chưa hợp lệ"

**Hiện trạng:** `KiemSoatTrangThai = 'HOP_LE' | 'KHONG_DUOC_TRU'` (`chung-tu.entity.ts`). FE `types/index.ts` + `KiemSoatCell.tsx`. Tổng hợp chi phí không được trừ lọc `kiemSoat.trangThai === 'KHONG_DUOC_TRU'` (`nhat-ky-chung.service.ts`).

**Thiết kế:**
- Thêm giá trị thứ 3: `CHUA_HOP_LE` ("Chưa hợp lệ"). 3 loại: Hợp lệ / Chưa hợp lệ / Không hợp lệ (KHONG_DUOC_TRU).
- "Chưa hợp lệ" = hồ sơ còn thiếu, hoàn thiện được ở Dữ liệu tổng hợp. **KHÔNG** cộng vào chi phí không được trừ (không ảnh hưởng thuế) → aggregation lọc `KHONG_DUOC_TRU` giữ nguyên.
- UI: `KiemSoatCell.tsx` thêm lựa chọn trạng thái + màu tag riêng (vd vàng/cam). Khi "Chưa hợp lệ" chỉ cần chọn lý do (mục 4), không cần nhập số tiền/nhóm chi phí.
- File: BE `chung-tu.entity.ts`; FE `types/index.ts`, `KiemSoatCell.tsx`.

### 4. Chọn nhiều lý do cho "Chưa hợp lệ" & "Không hợp lệ"

**Hiện trạng:** `kiemSoat.lyDo` là string đơn (chỉ ở FE type; BE interface chưa có field). `KiemSoatCell.tsx` dùng `<Select>` đơn, options từ `lyDoKhongHopLeService.getAll()` map `{ value: ten, label: ten }`.

**Thiết kế:**
- `lyDo` đổi từ `string` → `string[]` (danh sách). Áp dụng cho cả `CHUA_HOP_LE` và `KHONG_DUOC_TRU`.
- `<Select mode="multiple">` trong `KiemSoatCell.tsx`.
- **Tương thích ngược:** dữ liệu cũ `lyDo` là string → khi đọc, chuẩn hoá `Array.isArray(x) ? x : (x ? [x] : [])`. Khi lưu luôn ghi mảng.
- BE: bổ sung `lyDo?: string[]` vào interface `KiemSoatChungTu` (`chung-tu.entity.ts`) cho đúng type; lưu qua `simple-json`.
- File: BE `chung-tu.entity.ts`, FE `types/index.ts`, `KiemSoatCell.tsx`.

## Phạm vi ngoài (out of scope)
- Không thêm filter lọc theo trạng thái hợp lệ ở trang Dữ liệu tổng hợp (chưa yêu cầu).
- Không đổi cơ chế "Biên tập hồ sơ" hiện có.
- Không migrate dữ liệu cũ (dùng tương thích ngược đọc lúc render).

## Kiểm thử
- Unit test FE: `fieldRulesValidation.test.ts` bổ sung case `soTaiKhoanNganHang` (thiếu/đủ số TK, bên Nợ vs Có).
- Unit test BE: `field-rules-validation.service.spec.ts` bổ sung case tương ứng.
- Kiểm thủ công: mở phiếu từ sổ chi tiết; nhập 1121 thiếu số TK bị chặn; chọn trạng thái Chưa hợp lệ; chọn nhiều lý do; dữ liệu cũ 1 lý do vẫn hiển thị.
