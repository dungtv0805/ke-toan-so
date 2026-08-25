# Thiết kế: Danh mục Tài khoản kết chuyển + Trang Kết chuyển lãi lỗ

Ngày: 2026-08-25

## 1. Mục tiêu

Hiện tại hệ thống ghi nhận doanh thu (TK 5), chi phí (TK 6, 8) và thu nhập khác (TK 7)
trên `chung_tu`, nhưng **không có bút toán kết chuyển cuối kỳ**. Hệ quả:

- TK 5/6/7/8 không bao giờ về 0, số dư treo vô hạn.
- Bảng cân đối kế toán (`/bao-cao/balance-sheet`) chỉ lấy TK đầu 1, 2 (tài sản) và 3, 4
  (nguồn vốn) → phần lãi/lỗ nằm ở nhóm 5–9 bị bỏ ngoài → **tổng tài sản ≠ tổng nguồn vốn**,
  lệch đúng bằng lợi nhuận trong kỳ.

Chức năng này bổ sung mảnh còn thiếu: khai báo cặp tài khoản kết chuyển trong danh mục,
rồi lập chứng từ kết chuyển ghi thẳng vào `chung_tu`. Từ đó Dữ liệu tổng hợp, Sổ cái,
Bảng cân đối kế toán và Báo cáo tài chính tự có số đúng — không cần đường dữ liệu riêng.

## 2. Phạm vi

**Trong phạm vi**

1. Danh mục `Tài khoản kết chuyển` — `/danh-muc/tai-khoan-ket-chuyen` (master-data-service).
2. Engine kết chuyển + 4 API trong voucher-service.
3. Trang `Kết chuyển lãi lỗ` — `/chung-tu/ket-chuyen-lai-lo` (list + form).
4. Bỏ clamp `Math.max(0, …)` cho nhóm nguồn vốn ở `getBalanceSheet` để trường hợp **lỗ**
   hiện số âm và BCĐKT vẫn cân.

**Ngoài phạm vi (đã chốt với người dùng)**

- Sửa `/bao-cao/pnl` và `/bao-cao/pnl-series` — xử lý sau, xem mục 8 (Rủi ro đã biết).
- Kết chuyển chi phí sản xuất (62x → 154) và kết chuyển giảm trừ doanh thu (521x → 511).
  Enum `loai` để sẵn chỗ nhưng chỉ `XAC_DINH_KQKD` hoạt động.
- Tách bút toán kết chuyển theo bộ phận / dự án / khoản mục — mỗi cặp TK gộp 1 dòng.
- Tự động tính thuế TNDN (TK 821). Nếu người dùng đã hạch toán 821 thì kết chuyển bình
  thường, còn hệ thống không tự tính ra số thuế.
- Seed danh mục tự động cho từng công ty. Danh mục mở ra trống, dùng Import Excel.

## 3. Danh mục Tài khoản kết chuyển

### 3.1 Entity

`be/libs/entities/src/master-data/tai-khoan-ket-chuyen.entity.ts`, collection
`tai_khoan_ket_chuyen`, kế thừa `BaseEntity` (đã có `tenantId`, `isActive`, timestamps).

| Field | Kiểu | Ghi chú |
|---|---|---|
| `thuTu` | `number` | Thứ tự kết chuyển, tăng dần. Quyết định trình tự chạy engine. |
| `ma` | `string` | Mã kết chuyển, duy nhất trong tenant. FE gợi ý `{taiKhoanTu}-{taiKhoanDen}`. |
| `taiKhoanTu` | `string` | Mã TK nguồn. |
| `tenTaiKhoanTu` | `string` | Snapshot tên TK nguồn tại thời điểm khai. |
| `taiKhoanDen` | `string` | Mã TK đích. |
| `tenTaiKhoanDen` | `string` | Snapshot tên TK đích. |
| `ben` | `'NO' \| 'CO' \| 'HAI_BEN'` | Bên kết chuyển — xem 3.2. |
| `loai` | `'XAC_DINH_KQKD'` | Loại kết chuyển. Chỉ 1 giá trị ở giai đoạn này. |
| `dienGiai` | `string` | Diễn giải, đổ xuống dòng hạch toán. |
| `isActive` | `boolean` | Đang sử dụng / Ngừng sử dụng. Engine chỉ chạy dòng `true`. |

Snapshot tên TK theo đúng thói quen của repo (`DanhMucTaiKhoan` trong `chung_tu`): tên
đổi về sau không làm sai chứng từ đã lập. Số tiền kết chuyển luôn tra theo **mã**, không
theo tên (xem memory `gom-nhom-theo-ma-khong-theo-ten`).

### 3.2 Ngữ nghĩa `ben`

`ben` nói về **số dư của TK nguồn** được đem đi kết chuyển:

| `ben` | Điều kiện | Bút toán sinh ra | Dùng cho |
|---|---|---|---|
| `NO` | TK nguồn dư Nợ | Nợ `taiKhoanDen` / Có `taiKhoanTu` | Chi phí: 632, 635, 641, 642, 811, 821 → 911 |
| `CO` | TK nguồn dư Có | Nợ `taiKhoanTu` / Có `taiKhoanDen` | Doanh thu: 511, 515, 711 → 911 |
| `HAI_BEN` | Dư bên nào xử bên đó | Dư Có ⇒ như `CO`; dư Nợ ⇒ như `NO` | `911 → 4212`: lãi ghi Nợ 911/Có 4212, lỗ ghi Nợ 4212/Có 911 |

Dư ngược chiều với `ben` đã khai ⇒ **bỏ qua dòng đó**, không sinh bút toán âm.

### 3.3 API

`master-data-service`, controller `@Controller('tai-khoan-ket-chuyen')`, sao khuôn
`nhom-dong-tien.controller.ts`: `GET /`, `GET /all`, `GET /stats`, `GET /check-ma`,
`GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /delete-batch`.
Gateway đã proxy `/master-data` theo prefix nên không cần khai route mới.

### 3.4 Trang danh mục

`/danh-muc/tai-khoan-ket-chuyen`, khuôn `NhomDongTienPage.tsx`. Cột theo đúng ảnh tham
chiếu: Thứ tự kết chuyển · Mã kết chuyển · Kết chuyển từ · Kết chuyển đến · Bên kết chuyển
· Loại kết chuyển · Diễn giải · Trạng thái · Chức năng.

- Ô tìm theo mã kết chuyển.
- Nút Thêm, Export, Import Excel (dùng `components/import-danh-muc` + config mới).
- Menu ⌄ mỗi dòng: **Nhân bản** (copy toàn bộ field, `ma` để trống chờ nhập),
  **Xóa**, **Ngừng sử dụng** / **Sử dụng lại** (toggle `isActive`).
- Form Thêm/Sửa: `taiKhoanTu` và `taiKhoanDen` là combobox chọn từ danh mục Tài khoản
  (không nhập tay), snapshot tên khi lưu.
- Validate: `ma` không trùng trong tenant; `taiKhoanTu` ≠ `taiKhoanDen`.

## 4. Engine kết chuyển

Module mới `be/apps/voucher-service/src/ket-chuyen/`.

### 4.1 API

| Method | Path | Vai trò |
|---|---|---|
| `POST` | `/voucher/ket-chuyen/preview` | Body `{ denNgay }` → trả `{ dong[], canhBao[], tongTien, laiLo }`. Không ghi gì. |
| `POST` | `/voucher/ket-chuyen` | Body `{ denNgay, ngayHachToan, ngayChungTu, dienGiai, dong[] }` → ghi lô `chung_tu`, trả `{ soPhieu, soDong }`. |
| `GET` | `/voucher/ket-chuyen` | Danh sách các lần kết chuyển (gom theo `soPhieu`). |
| `DELETE` | `/voucher/ket-chuyen/:soPhieu` | Xóa toàn bộ dòng của lô đó. |

Quyền: `@Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')` cho ghi/xóa,
thêm `MANAGER`, `KIEM_SOAT` cho đọc.

### 4.2 Thuật toán `preview(denNgay)`

1. **Đọc danh mục**: `serviceClient.getTaiKhoanKetChuyen()` (method mới) →
   lọc `isActive && loai === 'XAC_DINH_KQKD'` → sort theo `thuTu` tăng dần,
   `ma` làm tie-break để kết quả ổn định.
2. **Dựng bảng số dư**:
   - `nhatKyChungService.aggregateBalance(dauNam, denNgay)` với
     `dauNam = 01/01 của năm chứa denNgay` → mỗi TK có `periodNo`, `periodCo`.
     Chỉ lấy phần **trong kỳ** (`periodNo`, `periodCo`), bỏ `priorNo`/`priorCo`:
     TK nhóm 5–9 luôn bắt đầu năm từ 0 sau khi đã kết chuyển năm trước.
   - Cộng thêm **Số dư đầu kỳ nhập tay** (`getSoDuDauKy`) **chỉ khi** `ngayApDung` nằm
     trong `[dauNam, denNgay]` — công ty bắt đầu dùng phần mềm giữa năm có thể đã nhập
     dư 511/642. `ngayApDung` trước `dauNam` ⇒ bỏ qua, vì phần đó thuộc năm cũ.
   - `soDu[ma] = (periodNo + openingNo) - (periodCo + openingCo)`; dương = dư Nợ,
     âm = dư Có.
   - Số dư này **đã trừ các bút toán kết chuyển trước đó** (chúng cũng nằm trong
     `chung_tu`), nên chạy lại chỉ ra phần chênh chưa kết chuyển. Không cần cờ "đã chốt".
3. **Duyệt từng dòng danh mục theo `thuTu`**:
   - Tập TK nguồn = `taiKhoanTu` **và mọi TK con** (mã bắt đầu bằng `taiKhoanTu`) có
     số dư ≠ 0. Kế toán thường hạch toán vào TK chi tiết (6421, 6422) nhưng khai kết
     chuyển ở TK tổng (642); sinh **một dòng cho mỗi TK chi tiết** để sổ chi tiết sạch.
     Nếu chỉ hạch toán ở TK tổng thì đúng 1 dòng.
   - Với mỗi TK nguồn, xác định chiều theo `ben` (bảng 3.2); dư ngược chiều ⇒ bỏ qua.
   - `soTien = |soDu|`. Bằng 0 ⇒ bỏ qua.
   - Sinh dòng `{ dienGiai, taiKhoanNo, taiKhoanCo, soTien, maKetChuyen }`.
   - **Cập nhật lại bảng số dư trong bộ nhớ**: trừ hết số dư TK nguồn, cộng vào TK đích.
     Nhờ vậy khi tới lượt `911 → 4212` thì 911 đã gom đủ doanh thu lẫn chi phí.
4. **Cảnh báo**: sau khi chạy hết, TK nào có mã bắt đầu bằng `5`, `6`, `7`, `8` hoặc `911`
   mà số dư vẫn ≠ 0 ⇒ thêm vào `canhBao[]` (`{ ma, ten, soTien, ben }`).
5. `laiLo` = số dư 911 trước bước kết chuyển 911 (dư Có = lãi, dư Nợ = lỗ).

### 4.3 Ghi chứng từ

Mỗi dòng = **1 bản ghi `chung_tu`** — đúng mô hình hiện có (1 bản ghi = 1 dòng hạch toán):

- `loai = 'KHAC'` → hiện ở Dữ liệu tổng hợp, không lẫn vào Phiếu thu/Phiếu chi.
- `soPhieu`: cả lô dùng chung **một** số, sinh bằng
  `VoucherNumberService.generateVoucherNumber('KHAC', { maLoaiChungTu: 'NVK', date: ngayChungTu })`
  → dạng `NVK202608/001`.
- `ngay = ngayHachToan`, `noiDung = dienGiai` của dòng, `soTien`,
  `danhMuc.taiKhoanNo` / `danhMuc.taiKhoanCo` snapshot `{ ma, ten, loai, nhom }` tra từ
  danh mục Tài khoản.
- **Hai field mới trên `ChungTu`**: `nguon?: 'KET_CHUYEN'` và `maKetChuyen?: string`
  (mã dòng danh mục đã sinh ra nó). Không có tag này thì không lọc/xóa cả lô được, và
  sau này cũng không loại được khỏi các báo cáo tính net.

Ghi bằng `POST` nội bộ qua `NhatKyChungService.createBatch` để đi chung đường validate
và cùng transaction-ish semantics với import.

Xóa lô: `DELETE /voucher/ket-chuyen/:soPhieu` xóa mọi `chung_tu` có `soPhieu` đó **và**
`nguon === 'KET_CHUYEN'` — điều kiện `nguon` để không lỡ tay xóa chứng từ tay trùng số.

### 4.4 Giới hạn body

`POST /voucher/ket-chuyen` nhận mảng dòng; công ty nhiều TK chi tiết có thể vượt
100kb mặc định của Nest. Kiểm tra và nâng `bodyParser` trong `voucher-service/src/main.ts`
nếu chưa nâng (memory `be-body-limit-100kb`).

## 5. Trang Kết chuyển lãi lỗ

Route `/chung-tu/ket-chuyen-lai-lo`, thêm mục vào `CHUNG_TU_NAV` (thanh ngang, cạnh
Phiếu thu / Phiếu chi), theo CHanlder pattern như các trang chứng từ khác.

### 5.1 Màn danh sách

Bảng các lần kết chuyển: Ngày hạch toán · Số chứng từ · Diễn giải · Tổng tiền kết chuyển ·
Lãi/Lỗ · Người tạo · Chức năng (Xem / Xóa cả lô). Nút **Thêm** mở form.

### 5.2 Màn form

Theo đúng ảnh tham chiếu #2:

- Trái: `Kết chuyển đến ngày` + nút **Lấy dữ liệu**; `Diễn giải` auto
  `"Kết chuyển lãi lỗ đến ngày dd/mm/yyyy"` (sửa được); `Tham chiếu`.
- Phải: `Ngày hạch toán`, `Ngày chứng từ` (mặc định = ngày kết chuyển), `Số chứng từ`
  (đọc trước từ BE, chốt lại khi lưu).
- Bảng **Hạch toán**: `#` · `Diễn giải` · `TK Nợ` · `TK Có` · `Số tiền`, dòng tổng ở cuối.
  Dòng do engine sinh, người dùng sửa được `Diễn giải` và `Số tiền`, xóa được dòng
  (nút *Xóa hết dòng*). Không có *Thêm dòng* thủ công — muốn thêm cặp TK thì khai vào
  danh mục.
- **Banner cảnh báo vàng** khi `canhBao[]` không rỗng:
  `"TK 642 — Chi phí quản lý doanh nghiệp còn 12.000.000 chưa được kết chuyển (chưa khai trong danh mục)"`,
  kèm link sang `/danh-muc/tai-khoan-ket-chuyen`. **Vẫn cho lưu** — giống cách Số dư đầu
  kỳ cảnh báo lệch mà không chặn.
- Trạng thái rỗng "Không có dữ liệu" khi chưa bấm Lấy dữ liệu hoặc không có gì để kết chuyển.

### 5.3 Lưu ý CHanlder

`useChandlerState` chỉ nghe từ lúc `useEffect` đăng ký — không `setState` trước khi
component mount, nếu không UI im lặng hiện 0 (memory `chandler-state-mat-set-truoc-mount`).

## 6. Ảnh hưởng tới báo cáo

Đã kiểm từng công thức:

| Báo cáo | Công thức | Sau kết chuyển |
|---|---|---|
| `/bao-cao/kqkd` | 1 chiều theo prefix (`libs/core/src/utils/kqkd-chi-tieu.ts`) | Đúng. Bút toán KC luôn đặt TK nhóm 5–8 ở **chiều ngược** với chiều mà chỉ tiêu cộng (KC doanh thu ghi Nợ 511, chỉ tiêu 01 cộng bên Có) nên không bị cộng nhầm. |
| `/bao-cao/loi-nhuan-theo`, `/bao-cao/doanh-thu` | 1 chiều theo prefix | Đúng, cùng lý do. |
| `/bao-cao/so-cai`, `/bao-cao/so-chi-tiet-tai-khoan` | Liệt kê bút toán | Đúng — và kế toán **cần** thấy bút toán kết chuyển ở sổ. |
| `/bao-cao/balance-sheet` | net, có `Math.max(0, …)` | Lãi: đúng, 4212 tăng, BCĐKT cân. Lỗ: **sai** nếu giữ clamp — xem 6.1. |
| `/bao-cao/pnl`, `/bao-cao/pnl-series` | **net** (Có − Nợ) | **Sẽ về 0** — ngoài phạm vi lần này, xem mục 8. |

### 6.1 Sửa `getBalanceSheet`

`calculateAccountBalance` (`bao-cao.service.ts:923`) kết thúc bằng `return Math.max(0, balance)`.
Khi công ty **lỗ**, bút toán `Nợ 4212 / Có 911` làm 4212 dư Nợ ⇒ balance âm ⇒ clamp về 0 ⇒
nguồn vốn thiếu đúng phần lỗ ⇒ BCĐKT không cân.

Sửa: thêm tham số `choPhepAm = false`; `getBalanceSheet` truyền `true` khi tính các TK
nhóm nguồn vốn (mã bắt đầu `4`). Các lời gọi khác giữ nguyên hành vi cũ để không đụng
báo cáo đang chạy. Kèm unit test cho cả hai nhánh.

## 7. Wiring

**Backend**
- `libs/entities/src/master-data/tai-khoan-ket-chuyen.entity.ts` + đăng ký ở `index.ts`
  (cả `import './…'` lẫn `export * from './…'`).
- `libs/entities/src/voucher/chung-tu.entity.ts` — thêm `nguon`, `maKetChuyen`.
- `apps/master-data-service/src/tai-khoan-ket-chuyen/` — module, controller, service, dto.
- `master-data-service.module.ts` — import module mới.
- `import-danh-muc/import-danh-muc.registry.ts` + `.module.ts` — đăng ký resource
  `tai-khoan-ket-chuyen`.
- `libs/core/src/permissions/all-permissions.ts` — thêm `/danh-muc/tai-khoan-ket-chuyen`
  và `/chung-tu/ket-chuyen-lai-lo`.
- `libs/service-client/src/service-client.ts` — `getTaiKhoanKetChuyen()` (phân trang hết
  như `getTaiKhoan`, tránh bẫy chỉ trả 100 bản ghi — memory `fe-getall-shim-100-dong`).
- `apps/voucher-service/src/ket-chuyen/` — module, controller, service, dto + đăng ký ở
  `voucher-service.module.ts`.
- `apps/reporting-service/src/bao-cao/bao-cao.service.ts` — sửa clamp (6.1).

**Frontend**
- `services/taiKhoanKetChuyenService.ts`, `services/ketChuyenService.ts`.
- `pages/danh-muc/tai-khoan-ket-chuyen/TaiKhoanKetChuyenPage.tsx`.
- `pages/chung-tu/ket-chuyen-lai-lo/` — list + form theo CHanlder pattern.
- `components/import-danh-muc/configs/taiKhoanKetChuyen.config.ts` + export ở `configs/index.ts`.
- `pages/loadable.tsx`, `App.tsx` (2 route + `ProtectedRoute`),
  `config/routePermissions.ts`, `config/menuCatalog.ts`, `config/danhMucCatalog.ts`,
  `config/sectionNavs.tsx` (mục mới trong `CHUNG_TU_NAV`),
  `components/layout/MainLayout.tsx` (2 chỗ).

**Sau deploy**: cấp quyền hai key mới cho vai trò Admin của từng công ty (memory
`them-trang-moi-wiring`).

## 8. Rủi ro đã biết

**`/bao-cao/pnl` và `/bao-cao/pnl-series` sẽ về 0 sau khi kết chuyển.** Cả hai dùng
`calculateAccountBalance` tính net (Có − Nợ) trên TK nhóm 5 và 6; bút toán `Nợ 511 / Có 911`
triệt tiêu doanh thu, `Nợ 911 / Có 642` triệt tiêu chi phí. `pnl-series` còn nuôi 3 gauge
"Tình hình thực hiện" ở trang Tổng quan.

Người dùng đã quyết **chưa xử lý trong lần này**. Cách sửa khi làm: lọc bỏ
`nguon === 'KET_CHUYEN'` khỏi mảng vouchers trong `getPnL` và `getPnlSeries` — tag đã có
sẵn từ mục 4.3 nên chỉ là một dòng filter mỗi hàm.

Cho tới khi sửa: **đừng chạy kết chuyển trên công ty đang dùng trang PnL / gauge Tổng quan
làm số liệu điều hành**, hoặc chấp nhận hai chỗ đó hiển thị 0.

**Dòng thêm tay vào chứng từ kết chuyển sống sót qua "Xóa cả lô".** Kết chuyển sinh ra
chứng từ bình thường (`loai: 'KHAC'`), nên ở Dữ liệu tổng hợp kế toán vẫn mở được chứng
từ KC và thêm dòng vào đó. Dòng thêm tay không mang `nguon = 'KET_CHUYEN'`, mà `remove`
lại lọc đúng theo `nguon` để không lỡ tay xóa chứng từ nhập tay trùng số phiếu — nên xóa
lô sẽ để lại dòng thêm tay mồ côi dưới số phiếu cũ.

Đây là hệ quả cố ý của thiết kế "KC là chứng từ bình thường", **không sửa trong lần này**.
Cho tới khi sửa: đừng thêm dòng tay vào chứng từ do kết chuyển sinh ra; muốn có bút toán
riêng thì lập một chứng từ khác.

## 9. Kiểm thử

**Unit (BE)**
- Engine: `ben = NO / CO / HAI_BEN`; dư ngược chiều ⇒ bỏ qua; TK con roll-up sinh nhiều
  dòng; thứ tự `thuTu` bảo đảm 911 chạy sau; lãi và lỗ ra hai chiều bút toán khác nhau;
  chạy lần 2 khi không có phát sinh mới ⇒ 0 dòng; chạy lần 2 sau khi có thêm chứng từ ⇒
  chỉ ra phần chênh; số dư đầu kỳ ngoài năm ⇒ không cộng.
- Cảnh báo: TK còn dư mà không khai ⇒ có trong `canhBao[]`.
- `calculateAccountBalance` với `choPhepAm` bật/tắt.

**Chạy hẹp**: `yarn test` toàn bộ đang đỏ sẵn 13 suite (memory `baseline-test-do-san`) —
chỉ chạy theo file/service liên quan, so với baseline trước khi kết luận.

**Thủ công**: khai vài dòng danh mục → lập kết chuyển → kiểm Dữ liệu tổng hợp thấy lô
`NVK…`, Sổ cái 911 khớp, BCĐKT cân cả trường hợp lãi lẫn lỗ, xóa lô thì mọi thứ trở lại.
