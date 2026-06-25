# Thiết kế: Tạo nhanh danh mục ngay trong bảng Nhật ký chung

- **Ngày:** 2026-06-25
- **Nhánh:** worktree-task-from-master (tách từ master)
- **Phạm vi:** Frontend (chủ yếu) — không đổi backend

## 1. Vấn đề

Khi nhập liệu ở bảng "Chi tiết hạch toán" của **Nhật ký chung** (`NhatKyChungFormPage` → `ChiTietTable.tsx`),
nếu **nghiệp vụ (quy chuẩn)**, **tài khoản (TK Nợ/Có)** hoặc **đối tượng (nợ/có)** chưa tồn tại,
người dùng phải thoát màn → vào trang danh mục tạo mới → quay lại nhập tiếp. Việc này lặp lại rất nhiều
lần khi nhập dữ liệu cả năm, tốn thời gian.

## 2. Mục tiêu

Thêm nút **"+ Thêm nhanh"** vào dropdown của 5 ô trong bảng: **Nghiệp vụ, TK Nợ, TK Có, Đối tượng nợ,
Đối tượng có**. Người dùng tạo bản ghi mới bằng form rút gọn (chỉ field bắt buộc) ngay tại chỗ,
không rời màn; tạo xong bản ghi được thêm vào danh sách và **tự điền vào ô đang nhập**.

**Ngoài phạm vi lần này:** các ô khác trong bảng (Dự án, Bộ phận, Đội, Nhân viên, Sản phẩm, Dòng tiền,
Khoản mục, Nhóm KM/QL, Hợp đồng); đối tượng ngân hàng/quỹ; màn Phiếu thu/chi. Component được thiết kế
tái sử dụng nên mở rộng sau rẻ.

## 3. Bối cảnh kỹ thuật (đã xác minh trong code)

### 3.1 Màn đích
- Trang: `fe/src/pages/chung-tu/nhat-ky-chung/NhatKyChungFormPage.tsx`
- Bảng: `fe/src/pages/chung-tu/nhat-ky-chung/form-components/chi-tiet-table/ChiTietTable.tsx`
- State/handler: `useNhatKyChungFormState` / `useNhatKyChungFormHandler`
  (handler `NhatKyChungFormHandler`, context `"nhat-ky-chung-form"`).
- Mỗi ô là một antd `<Select>` render trực tiếp trong cột; antd phiên bản **v6** → dùng `popupRender`
  để chèn footer vào dropdown.

### 3.2 Nguồn dữ liệu & cách điền từng ô
- **Nghiệp vụ** (`nghiepVu`): options = `quyChaunList` lọc theo `header.loaiGiaoDich`; value = `qc.nghiepVu`.
  onChange → event `handleNghiepVuChange` (auto-fill `taiKhoanNo`, `taiKhoanCo`, `noiDung` từ quy chuẩn).
  Ô bị `disabled` khi header chưa chọn Loại GD.
- **TK Nợ/Có** (`taiKhoanNo`/`taiKhoanCo`): options = `taiKhoanList` (leaf accounts, `getLeafAccounts()`);
  value = `tk.ma`. onChange → `handleTaiKhoanChange` (clear đối tượng nếu `chiTietTheo` không khớp).
- **Đối tượng nợ/có** (`doiTuongId`/`doiTuong2Id`): options từ `getDoiTuongSelectConfig(chiTietTheo, ...)`:
  - `chiTietTheo` ∈ {KHACH_HANG, NHA_CUNG_CAP, NHAN_VIEN, NHA_THAU} → lọc `doiTuongList` theo loại đó.
  - `chiTietTheo === NGAN_HANG_QUY` → options là danh mục ngân hàng (entity khác — **ngoài phạm vi**).
  - không có `chiTietTheo` → ô bị khoá.
  value = `d.id`. onChange → `handleDoiTuongChange`/`handleDoiTuong2Change` (lưu snapshot).

### 3.3 Service create (FE) & field bắt buộc (DTO BE)
| Danh mục | Service | Field bắt buộc tối thiểu | Field optional |
|---|---|---|---|
| Quy chuẩn | `quyChauanService.create(CreateQuyChaunDto)` | `loaiGiaoDich`, `nghiepVu`, `taiKhoanNo`, `taiKhoanCo` | `moTa` |
| Đối tượng | `doiTuongService.create(Omit<DoiTuong,'id'>)` | `loai[]`, `ma`, `ten` | diaChi, soDienThoai, email, maSoThue, nguoiLienHe |
| Tài khoản | `taiKhoanService.create(Omit<TaiKhoan,'id'>)` | `ma`, `ten`, `capDo`(1-5), `loai`(enum 8), `nhom`(enum 4) | `parentId`, `chiTietTheo`, `moTa`, `fieldRules` |

Service create đều trả về bản ghi đã map (có `id`).

### 3.4 Quyền — KHÔNG có rủi ro 403 (đã verify)
`be/libs/auth/src/guards/role.guard.ts` → `canActivate()` chỉ `return true`. `@Roles('ADMIN')` trên các
endpoint create là **no-op** (RoleGuard không đọc metadata, không throw). Gateway chỉ proxy. → Người dùng
nhập liệu (không phải ADMIN) **vẫn tạo được** tài khoản/quy chuẩn/đối tượng. Không cần đổi backend.
Lưu ý: KHÔNG sửa RoleGuard "cho chạy" vì nó global → bật lên sẽ kích hoạt `@Roles` ở mọi controller (hồi quy).

## 4. Kiến trúc giải pháp (Hướng A — component tái sử dụng)

### 4.1 Component UI mới — `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/`
- **`SelectWithQuickAdd.tsx`** — bọc antd `Select`, giữ nguyên mọi prop của Select (size, showSearch,
  value, onChange, options, variant, status, popupMatchSelectWidth...). Thêm props:
  - `quickAddLabel: string` — nhãn nút (vd "đối tượng", "nghiệp vụ", "tài khoản").
  - `onQuickAdd: () => void` — mở modal (parent quản lý modal nào).
  - `quickAddDisabled?: boolean` — ẩn/disable nút khi không hợp lệ (vd đối tượng ngân hàng/quỹ).
  - Dùng `popupRender(menu) => <>{menu}<Divider/><Button type="text" icon={<PlusOutlined/>} onMouseDown={preventBlur} onClick={onQuickAdd}>+ Thêm nhanh {quickAddLabel}</Button></>`.
  - Component thuần UI, generic, không biết danh mục cụ thể.
- **`QuickAddQuyChuanModal.tsx`** — form: Loại GD (mặc định = `header.loaiGiaoDich`, hiển thị; có thể đổi),
  Nghiệp vụ (text, bắt buộc), TK Nợ (select từ `taiKhoanList`), TK Có (select từ `taiKhoanList`).
- **`QuickAddDoiTuongModal.tsx`** — form: Loại (multi-select, **pre-fill = [chiTietTheo của TK dòng đó]**),
  Mã (text), Tên (text).
- **`QuickAddTaiKhoanModal.tsx`** — form: Mã, Tên, Loại (enum 8), Nhóm (enum 4), Cấp độ (1-5);
  optional: TK cha (select; nếu chọn thì auto-set capDo = capDo cha + 1), Chi tiết theo.
- Mọi modal **chỉ validate + thu thập values**, gọi `onSubmit(values)` do parent cấp; **không tự gọi API**.
  Props chung: `open`, `onClose`, `onSubmit(values) => Promise<boolean>` (true = đóng modal).
  Reset form mỗi lần mở.

### 4.2 Sub-handler mới — `form-handler/sub-handler/quick-add/`
Theo CHanlder pattern (logic + API trong handler, đăng ký qua `@RegisterHandler("nhat-ky-chung-form")`,
auto-load qua `sub-handler/index.ts`). Mỗi event làm **atomically**: create → append list → set dòng,
để tránh đọc list cũ chưa cập nhật.

- **`quickCreateQuyChuan`** — params `{ key, loaiGiaoDich, nghiepVu, taiKhoanNo, taiKhoanCo, moTa? }`,
  result `{ ok: boolean }`.
  1. `quyChauanService.create(dto)`.
  2. `setState("quyChaunList", [...cũ, created])`.
  3. Cập nhật dòng `key`: `nghiepVu = created.nghiepVu`, auto-fill `taiKhoanNo`/`taiKhoanCo`/`noiDung`
     (tái dùng đúng logic `handleNghiepVuChange`).
- **`quickCreateDoiTuong`** — params `{ key, field: "doiTuongId" | "doiTuong2Id", loai, ma, ten }`,
  result `{ ok }`.
  1. `doiTuongService.create(dto)`.
  2. `setState("doiTuongList", [...cũ, created])`.
  3. Set dòng `key`: `[field] = created.id` + snapshot tương ứng
     (`doiTuongSnapshot`/`doiTuong2Snapshot` qua `buildDoiTuongSnapshot`).
- **`quickCreateTaiKhoan`** — params `{ key, field: "taiKhoanNo" | "taiKhoanCo", ma, ten, loai, nhom, capDo, parentId?, chiTietTheo? }`,
  result `{ ok }`.
  1. `taiKhoanService.create(dto)`.
  2. `setState("taiKhoanList", [...cũ, { ma, ten, loai, nhom, chiTietTheo, fieldRules }])` (đúng shape `TaiKhoanItem`).
  3. Set dòng `key`: `[field] = created.ma`.

Lỗi API → event trả `{ ok: false }`; component giữ modal mở + toast lỗi.

### 4.3 Sửa `ChiTietTable.tsx`
- Thay 5 `<Select>` (nghiệp vụ, TK nợ, TK có, đối tượng nợ, đối tượng có) bằng `SelectWithQuickAdd`,
  giữ nguyên toàn bộ props/handler hiện có.
- Thêm state cục bộ trong component: `quickAdd: { type, key, field } | null` để biết modal nào đang mở
  và set vào dòng/field nào. Render 3 modal ở cuối, điều khiển bằng state này.
- Điều kiện bật nút:
  - Nghiệp vụ: `quickAddDisabled = !header.loaiGiaoDich`.
  - TK Nợ/Có: luôn bật.
  - Đối tượng: `quickAddDisabled = !(chiTietTheo ∈ 4 loại đối tượng)` (ẩn khi disabled/ngân hàng-quỹ).
- `onSubmit` của modal gọi `handler.executeEvent("quickCreateX", { key, field, ...values })`; nếu `ok` →
  đóng modal, toast "Đã thêm".

## 5. Luồng dữ liệu (1 lần tạo nhanh)
1. User mở dropdown ô → bấm "+ Thêm nhanh {danh mục}".
2. `ChiTietTable` set `quickAdd = { type, key, field }` → modal tương ứng mở (pre-fill loaiGiaoDich/loai
   theo ngữ cảnh dòng).
3. User điền field bắt buộc → submit → modal validate → gọi `onSubmit`.
4. `onSubmit` → `executeEvent("quickCreateX", ...)` → handler: create → append list → set dòng/auto-fill.
5. Event trả `ok` → đóng modal, toast. Bản ghi mới đã nằm trong list (dùng lại cho các dòng sau) và ô
   đang nhập đã được điền.

## 6. Testing (TDD)
- **Unit test 3 event** (`quick-add.handler`):
  - `quickCreateQuyChuan`: mock `quyChauanService.create` → assert payload đúng; `quyChaunList` được append;
    dòng `key` có `nghiepVu` + TK Nợ/Có auto-fill đúng từ created.
  - `quickCreateDoiTuong`: mock `doiTuongService.create` → assert append `doiTuongList`; dòng có
    `doiTuongId`/`doiTuong2Id` = id + snapshot.
  - `quickCreateTaiKhoan`: mock `taiKhoanService.create` → assert append `taiKhoanList` đúng shape; dòng có
    `taiKhoanNo`/`taiKhoanCo` = ma.
  - Trường hợp service throw → event trả `{ ok: false }`, không append, không sửa dòng.
- **Render test mỗi modal**: submit khi thiếu field bắt buộc → hiện lỗi, không gọi `onSubmit`.
- Chạy `cd fe && npm run lint` và test trước khi coi là xong.

## 7. Rủi ro & quyết định
- **Tài khoản là dữ liệu cấu trúc** (cây cha/con). Quyết định: vẫn cho tạo nhanh (user yêu cầu) nhưng form
  bắt buộc Loại/Nhóm/Cấp độ để không tạo TK sai bản chất; TK cha optional.
- **Trùng mã**: dựa vào validate phía BE (đã có `check-ma`/`duplicate-check`). Nếu BE trả lỗi trùng →
  toast lỗi, giữ modal. (Không chủ động gọi check trước để giữ luồng đơn giản; có thể bổ sung sau.)
- **Role/403**: đã loại bỏ (mục 3.4).

## 8. Danh sách file
**Tạo mới:**
- `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/SelectWithQuickAdd.tsx`
- `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddQuyChuanModal.tsx`
- `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddDoiTuongModal.tsx`
- `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddTaiKhoanModal.tsx`
- `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/quick-add.handler.ts`
- `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/quick-add.event.ts`
- Test tương ứng (`__tests__/`).

**Sửa:**
- `fe/src/pages/chung-tu/nhat-ky-chung/form-components/chi-tiet-table/ChiTietTable.tsx`
