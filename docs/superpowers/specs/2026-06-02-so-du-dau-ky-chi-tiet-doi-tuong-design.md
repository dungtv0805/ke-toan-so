# Thiết kế: Số dư đầu kỳ chi tiết theo đối tượng

**Ngày:** 2026-06-02
**Trạng thái:** Đã chốt thiết kế
**Phạm vi:** master-data-service (BE), service-client (BE), Frontend (`fe/`). KHÔNG sửa reporting-service logic.

## Bối cảnh & Vấn đề

Tính năng Số dư đầu kỳ hiện lưu **1 dòng / 1 tài khoản** (`SoDuDauKy { maTaiKhoan, duNo, duCo, ngayApDung }`). Nhiều TK công nợ/tiền cần số dư đầu kỳ **chi tiết theo đối tượng con** đúng nghiệp vụ kế toán:

| TK | Chi tiết theo | Danh mục |
|----|---------------|----------|
| 131 – Phải thu khách hàng | Khách hàng | `DoiTuong` loại `KHACH_HANG` |
| 331 – Phải trả người bán | Nhà cung cấp | `DoiTuong` loại `NHA_CUNG_CAP` |
| 141 – Tạm ứng | Nhân viên | `DoiTuong` loại `NHAN_VIEN` |
| 334 – Phải trả người LĐ | Nhân viên | `DoiTuong` loại `NHAN_VIEN` |
| 1121 – Tiền gửi ngân hàng | Tài khoản ngân hàng/quỹ | `NganHang` |

Trang Số dư đầu kỳ hiện liệt kê sẵn toàn bộ TK lá để nhập — không cho nhập chi tiết theo từng đối tượng.

## Mục tiêu

1. Cho cấu hình mỗi tài khoản "theo dõi chi tiết theo loại đối tượng nào".
2. Trang Số dư đầu kỳ đổi sang mô hình **"+ Thêm dòng"**: chọn TK → nếu TK có cấu hình chi tiết thì chọn đối tượng cụ thể → nhập Nợ/Có. TK không cấu hình thì nhập 1 dòng như cũ.
3. **Báo cáo không đổi**: Bảng cân đối phát sinh / cân đối kế toán vẫn nhận **tổng gộp theo mã TK** như hiện tại. KHÔNG đụng Sổ chi tiết công nợ / Sổ cái.

## Quyết định thiết kế (đã chốt)

| Vấn đề | Quyết định |
|--------|-----------|
| Mục đích | Nhập liệu chính xác + lưu trữ chi tiết. Báo cáo vẫn cộng gộp tổng theo TK (Option 2) |
| Cấu hình "chi tiết theo" | Thêm field `chiTietTheo` trong Danh mục Tài khoản, user tự chọn (không hardcode theo mã) |
| Các loại chi tiết | Khách hàng, Nhà cung cấp, Nhân viên, Nhà thầu (→ `DoiTuong`); Ngân hàng & Quỹ (→ `NganHang`) |
| Mô hình lưu | `SoDuDauKy` cho nhiều dòng/TK; mỗi dòng tham chiếu 1 đối tượng chi tiết (hoặc null) |
| Tích hợp reporting | Gộp tổng theo `maTaiKhoan` ngay trong `ServiceClient.getSoDuDauKy` → reporting-service KHÔNG đổi |
| Dữ liệu cũ | Dòng cũ `chiTietId = null` vẫn hợp lệ, không cần migrate |

## Kiến trúc

### 1. Entity `TaiKhoan` (master-data) — thêm 1 field

```
chiTietTheo?: 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU' | 'NGAN_HANG_QUY' | null
```

- `null`/không có = không chi tiết (giữ hành vi cũ).
- 4 giá trị đầu = lọc danh mục `DoiTuong` theo `loai` tương ứng.
- `NGAN_HANG_QUY` = chọn từ danh mục `NganHang` (cả TIEN_MAT lẫn NGAN_HANG).

DTO create/update của tai-khoan (master-data-service) thêm `chiTietTheo` optional. FE type `TaiKhoan` + zod schema + form thêm field tương ứng.

### 2. Entity `SoDuDauKy` (master-data) — thêm trường chi tiết

```
maTaiKhoan : string
duNo       : number
duCo       : number
ngayApDung : Date
chiTietType?: string   // copy 'chiTietTheo' của TK tại thời điểm nhập (KHACH_HANG.../NGAN_HANG_QUY), null nếu không chi tiết
chiTietId? : string    // _id của DoiTuong hoặc NganHang, null nếu không chi tiết
chiTietMa? : string    // mã đối tượng (denormalize để hiển thị)
chiTietTen?: string    // tên đối tượng (denormalize để hiển thị)
```

Khoá luận lý: `(tenantId, maTaiKhoan, chiTietId)` — một TK + một đối tượng tối đa 1 dòng. FE chặn trùng trước khi lưu.

### 3. API (master-data-service `/so-du-dau-ky`)

**GET** — trả thêm các field chi tiết trên mỗi item:
```
{ ngayApDung, items: [{ maTaiKhoan, duNo, duCo, chiTietType, chiTietId, chiTietMa, chiTietTen }], tongNo, tongCo, canDoi }
```

**PUT** — body `items` thêm các field chi tiết (đều optional). `saveBulk` giữ nguyên semantics "xoá hết + ghi lại", chỉ lưu dòng có duNo≠0 hoặc duCo≠0, và lưu kèm các field chi tiết.

Validate: cân đối tổng Nợ/Có giữ nguyên (cảnh báo, không chặn).

### 4. ServiceClient.getSoDuDauKy — GỘP tổng theo mã TK

Hiện trả nguyên `data` từ GET. Sau thay đổi, GET trả nhiều dòng/TK. Vì 2 consumer reporting (`so-cai.service.ts`, `bao-cao.service.ts`) đều build `Map(maTaiKhoan → {duNo,duCo})` (sẽ mất dữ liệu nếu trùng mã), **`getSoDuDauKy` phải gộp**: cộng `duNo`/`duCo` theo `maTaiKhoan`, trả về danh sách `items` 1 dòng/TK (bỏ field chi tiết). Reporting-service giữ nguyên, không sửa.

Kiểu trả về của `getSoDuDauKy` giữ nguyên signature `{ ngayApDung, items: [{maTaiKhoan,duNo,duCo}] }` → backward compatible.

### 5. Frontend — Danh mục Tài khoản

- `fe/src/types/index.ts`: `TaiKhoan` thêm `chiTietTheo?`.
- `TaiKhoanPage.tsx`: zod schema thêm `chiTietTheo` optional; form thêm `Form.Item` Select "Chi tiết theo" (options: Không / Khách hàng / Nhà cung cấp / Nhân viên / Nhà thầu / Ngân hàng & Quỹ). `openModal` set field từ record khi sửa.

### 6. Frontend — Trang Số dư đầu kỳ (đổi UX)

`SoDuDauKyPage.tsx` đổi từ "liệt kê sẵn toàn bộ TK" sang **bảng động + nút "+ Thêm dòng"**:

- State `rows`: mỗi dòng `{ key, maTaiKhoan, tenTaiKhoan, chiTietTheo, chiTietId, chiTietMa, chiTietTen, duNo, duCo }`.
- Load đầu trang: `taiKhoanService.getLeafAccounts()` (để biết `chiTietTheo` mỗi TK) + `soDuDauKyService.getAll()` (map về rows). Đối tượng (DoiTuong theo loại) và NganHang load lazy khi cần.
- Mỗi dòng:
  - Cột **TK**: Select search chọn mã TK. Khi chọn, set `chiTietTheo` theo TK.
  - Cột **Đối tượng**: nếu `chiTietTheo` null → hiện "—" (disabled). Nếu có → Select đối tượng, options nạp theo loại (`DoiTuong.getByLoai(...)` cho 4 loại đối tượng, `nganHangService` cho NGAN_HANG_QUY). Bắt buộc chọn khi TK có chi tiết.
  - Cột **Dư Nợ / Dư Có**: InputNumber như cũ.
  - Nút xoá dòng.
- Nút "+ Thêm dòng" thêm 1 dòng trống.
- Chặn trùng `(maTaiKhoan, chiTietId)` khi lưu; cảnh báo nếu TK có chi tiết mà chưa chọn đối tượng (chặn lưu dòng đó hoặc báo lỗi).
- Giữ: 1 ô Ngày áp dụng chung; dòng tổng Nợ/Có + cảnh báo lệch; nút Lưu (PUT ghi đè toàn bộ).
- `handleSave`: gửi `items` gồm cả field chi tiết.

### 7. soDuDauKyService (FE) — mở rộng type

`SoDuDauKyItem` thêm `chiTietType?, chiTietId?, chiTietMa?, chiTietTen?` (optional). `SaveSoDuDauKyPayload.items` dùng cùng type.

## Edge cases

- TK không cấu hình chi tiết → 1 dòng, `chiTietId = null`, hành xử như hiện tại.
- TK có cấu hình chi tiết nhưng user chưa chọn đối tượng → FE chặn lưu dòng đó, báo lỗi rõ.
- Cùng 1 TK nhiều đối tượng → nhiều dòng; reporting gộp tổng đúng.
- Đối tượng bị xoá khỏi danh mục sau khi đã nhập → vẫn giữ `chiTietMa/chiTietTen` đã denormalize để hiển thị.
- Dữ liệu số dư đầu kỳ cũ (không có field chi tiết) → đọc bình thường, `chiTietId = null`.
- Reporting: nhiều dòng/TK được `getSoDuDauKy` gộp thành 1 → tổng cân đối phát sinh / cân đối kế toán không đổi so với trước (với cùng tổng số dư).

## Phạm vi KHÔNG làm (YAGNI)

- KHÔNG đụng Sổ chi tiết công nợ, Sổ cái, reporting logic.
- KHÔNG ép chọn đối tượng ở màn chứng từ (chỉ áp dụng trang Số dư đầu kỳ).
- KHÔNG khoá kỳ / lịch sử chỉnh sửa.
- KHÔNG hỗ trợ nhiều kỳ/năm.

## Kiểm thử

- Unit (BE): `saveBulk` lưu kèm field chi tiết; `getAll` trả lại đúng. `ServiceClient.getSoDuDauKy` gộp đúng tổng khi 1 TK nhiều dòng chi tiết.
- Unit (FE): logic gộp dòng/validate trùng + validate thiếu đối tượng (nếu tách được hàm thuần).
- Thủ công: cấu hình `chiTietTheo` cho 131/331/141/334/1121; nhập số dư đầu kỳ chi tiết từng đối tượng; lưu & tải lại đúng; Bảng cân đối phát sinh + cân đối kế toán hiển thị tổng gộp đúng theo TK.
