# Sổ chi tiết tài khoản — Thiết kế (Design Spec)

> Ngày: 2026-06-03
> Mẫu tham chiếu: SỔ CHI TIẾT TÀI KHOẢN (S38-DN), lọc theo Tài khoản + Đối tượng, có cột TK đối ứng.

## 1. Mục tiêu

Tạo báo cáo **Sổ chi tiết tài khoản**: liệt kê toàn bộ phát sinh của **một tài khoản** trong một
khoảng thời gian, có thể lọc thêm theo **một đối tượng** (Khách hàng / Nhà cung cấp / Nhân viên),
hiển thị **tài khoản đối ứng** từng dòng và **số dư lũy kế**.

Báo cáo này là một **trang mới riêng** tại route đã đặt sẵn `/bao-cao/so-chi-tiet-tai-khoan`
(hiện COMING SOON). Tab "Chi tiết tài khoản" trong trang Sổ cái (`/bao-cao/so-cai`) **giữ nguyên**
làm công cụ xem nhanh; hai thứ phục vụ mục đích khác nhau và không gộp.

### Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Vị trí | Trang mới riêng tại `/bao-cao/so-chi-tiet-tai-khoan` |
| Số dư đầu kỳ | = Số dư đầu kỳ **nhập tay** (khớp TK + đối tượng) **+** net phát sinh **trước** ngày bắt đầu kỳ |
| Bộ lọc Đối tượng | **Tùy chọn**. Bắt buộc chọn Tài khoản; để trống Đối tượng = xem toàn bộ |
| Chọn TK cha | **Gộp chung 1 sổ**: dồn toàn bộ phát sinh các TK con vào 1 sổ liên tục, số dư lũy kế chung, header ghi TK cha (xem §3.6) |
| Xuất / In | **Bản đầu: chỉ xem màn hình.** Xuất Excel / In PDF để sau |

## 2. Giao diện (theo ảnh mẫu)

### 2.1 Thanh bộ lọc (đầu trang)
- **Kỳ báo cáo**: `RangePicker` (Từ ngày – Đến ngày). Mặc định: tháng hiện tại.
- **Tài khoản** (bắt buộc): `Select` tìm kiếm theo mã/tên, nguồn từ `taiKhoanService.getAll()`.
- **Đối tượng** (tùy chọn): `Select` tìm kiếm, `allowClear`, nguồn từ `doiTuongService.getAll()`.
- Nút **Xem báo cáo** (hoặc tự load khi đủ điều kiện: có TK + có kỳ).

### 2.2 Khối tiêu đề sổ
- Tiêu đề: **SỔ CHI TIẾT TÀI KHOẢN**
- (1) Tài khoản: `<mã> - <tên>`
- (2) Đối tượng: `<mã> - <tên>` (ẩn/để trống nếu không lọc đối tượng)
- Loại tiền: **VNĐ**

### 2.3 Bảng dữ liệu

| Cột | Nguồn | Ghi chú |
|---|---|---|
| A — Ngày, tháng ghi sổ | `v.ngay` | format `DD/MM/YYYY` |
| B — Chứng từ: Số hiệu | `v.soPhieu` | |
| C — Chứng từ: Ngày tháng | `v.ngay` | (cùng ngày CT) |
| D — Diễn giải | `v.noiDung` | |
| E — (3) TK đối ứng | vế còn lại của cặp Nợ–Có | xem §3.2 |
| 1 — (4) Phát sinh Nợ | `v.soTien` nếu TK lọc ở vế **Nợ** | ngược lại để trống |
| 2 — (4) Phát sinh Có | `v.soTien` nếu TK lọc ở vế **Có** | ngược lại để trống |
| 3 — (5) Số dư Nợ | số dư lũy kế (nếu dương theo loại Nợ) | xem §3.3 |
| 4 — (5) Số dư Có | số dư lũy kế (nếu dương theo loại Có) | xem §3.3 |

**Các dòng đặc biệt** (ô không dùng để trống — tương ứng dấu "x" trên mẫu giấy):
- Dòng đầu: **Số dư đầu kỳ** — chỉ điền cột Số dư Nợ/Có (§3.4).
- Dòng cuối phần phát sinh: **Cộng số phát sinh** — chỉ điền tổng Phát sinh Nợ/Có.
- Dòng cuối: **Số dư cuối kỳ** — chỉ điền cột Số dư Nợ/Có.

### 2.4 Phạm vi bản đầu
- Chỉ hiển thị trên màn hình (Antd Table). **Chưa** có nút Xuất Excel / In PDF.
- Chân sổ ký tên ("Người ghi sổ / Kế toán trưởng / Người đại diện…", "Sổ này có … trang…")
  **không** làm ở bản này (thuộc bản in PDF sau).

## 3. Logic tính toán (Backend)

### 3.1 Tập tài khoản liên quan (cha → con)
Xác định **tập mã TK liên quan** `relevantCodes` từ TK đã chọn và danh sách tài khoản:
- Nếu TK chọn là **leaf** (không có TK con): `relevantCodes = { maTaiKhoan }`.
- Nếu TK chọn là **cha**: `relevantCodes =` tập các TK có mã `startsWith(maTaiKhoan)` **và** có mặt
  trong danh mục tài khoản (đồng nhất quy tắc tiền tố của `buildSoDuTree`). Vì chứng từ chỉ ghi ở
  leaf, thực chất là toàn bộ TK con cháu phát sinh.

Một TK `code` coi là "thuộc cây" khi `code === maTaiKhoan || code.startsWith(maTaiKhoan)` và `code`
là một tài khoản thật trong danh mục.

### 3.1b Lọc chứng từ
Từ `getNhatKyChung(...)` lấy `NhatKyChungEntry`. Một **vế** của chứng từ liên quan nếu:
- mã TK của vế đó thuộc `relevantCodes`, **và**
- nếu có `maDoiTuong`: `v.danhMuc?.doiTuong?.ma === maDoiTuong`.

Lưu ý: khi gộp TK cha, **một chứng từ có thể sinh tối đa 2 dòng** (cả vế Nợ lẫn vế Có đều thuộc cây
con) — xem §3.6. Helper `getTaiKhoanNo/Co` tái dùng cùng cách `so-cai.service.ts` (hỗ trợ cả field
legacy lẫn `danhMuc.taiKhoanNo/Co.ma`).

### 3.2 TK đối ứng + bên phát sinh
Duyệt **từng vế** của chứng từ trong kỳ (không phải từng chứng từ), emit 1 dòng cho mỗi vế thuộc cây:
- Nếu `taiKhoanNo(v)` ∈ `relevantCodes`: dòng `phatSinhNo = v.soTien`, `phatSinhCo = 0`,
  `tkDoiUng = taiKhoanCo(v)`.
- Nếu `taiKhoanCo(v)` ∈ `relevantCodes`: dòng `phatSinhCo = v.soTien`, `phatSinhNo = 0`,
  `tkDoiUng = taiKhoanNo(v)`.
- Khi chọn **leaf**: tối đa 1 vế khớp → 1 dòng/chứng từ.
- Khi chọn **cha** và cả hai vế cùng thuộc cây con (vd Nợ 1311 / Có 1312 dưới cha 131): emit **2 dòng**
  đối ứng lẫn nhau; số dư lũy kế tự triệt tiêu (xem §3.6).

### 3.3 Số dư lũy kế
Khởi tạo `soDu` (có dấu) = số dư đầu kỳ có dấu (§3.4). Duyệt chứng từ trong kỳ theo `ngay` tăng dần:
- `loai === 'NO'`: `soDu += phatSinhNo - phatSinhCo`
- `loai === 'CO'`: `soDu += phatSinhCo - phatSinhNo`

Khi hiển thị tách Nợ/Có theo `calcBalance` (tái dùng ý tưởng từ `computeTrialRow`):
- `loai === 'NO'`: `soDu >= 0` → Số dư Nợ = `soDu`; ngược lại Số dư Có = `-soDu`.
- `loai === 'CO'`: `soDu >= 0` → Số dư Có = `soDu`; ngược lại Số dư Nợ = `-soDu`.

### 3.4 Số dư đầu kỳ (có dấu)
`soDuDauKy_signed = manual_signed + prior_signed`

**manual_signed** — từ `getSoDuDauKy(...)`, lọc các dòng có `maTaiKhoan ∈ relevantCodes` (gộp con
khi chọn cha) và:
- nếu có `maDoiTuong`: chỉ dòng `chiTietMa === maDoiTuong`;
- nếu không: cộng tất cả dòng của các TK trong cây.

Mỗi dòng quy về dấu theo loại TK **cha đã chọn** (`account.loai`): `loai NO` → `duNo - duCo`;
`loai CO` → `duCo - duNo`. Cộng dồn. (Các TK con cùng `loai` với cha theo chuẩn VAS.)

**prior_signed** — net phát sinh các vế **trước `startDate`** (cùng bộ lọc cây TK + đối tượng):
- `loai NO`: `Σ phatSinhNo_before − Σ phatSinhCo_before`
- `loai CO`: `Σ phatSinhCo_before − Σ phatSinhNo_before`

> Ghi chú không cộng trùng: số dư nhập tay thể hiện trạng thái tại `ngayApDung`; chứng từ sau đó đi
> theo luồng thường. Bản đầu chấp nhận giả định người dùng nhập số dư đầu kỳ nhất quán với ngày bắt
> đầu sử dụng hệ thống (theo §4.1 của tài liệu Số dư đầu kỳ đã thống nhất).

### 3.5 Tổng & số dư cuối kỳ
- `tongPhatSinhNo = Σ phatSinhNo` (trong kỳ); `tongPhatSinhCo = Σ phatSinhCo` (trong kỳ).
- `soDuCuoiKy_signed = soDuDauKy_signed + (net phát sinh trong kỳ)`; hiển thị tách Nợ/Có như §3.3.

### 3.6 Gộp tài khoản cha
- Khi `maTaiKhoan` là TK cha, mọi bước (§3.1b lọc, §3.2 dòng phát sinh, §3.4 số dư đầu kỳ, §3.5 tổng)
  dùng `relevantCodes` thay cho một mã đơn.
- Header sổ ghi TK cha (`account.ma - account.ten`). Cột TK đối ứng vẫn hiển thị mã TK con đối ứng
  thực tế của từng dòng — **không** rút gọn về cha.
- Số dư lũy kế tính theo `account.loai` của TK cha; vì các con cùng loại nên nhất quán.
- Chứng từ nội bộ giữa hai con cùng cây → 2 dòng đối ứng nhau, số dư triệt tiêu; tổng phát sinh
  Nợ/Có **đều tăng** đúng bản chất (không khử ở dòng tổng — đây là hành vi chuẩn của sổ chi tiết
  TK cha). Có thể ghi chú/đánh dấu sau nếu cần báo cáo "thuần".

## 4. Kiến trúc & tệp

### 4.1 Backend — `be/apps/reporting-service/src/so-chi-tiet/`
```
so-chi-tiet.module.ts
so-chi-tiet.controller.ts      # GET /  -> getSoChiTiet(query)
so-chi-tiet.service.ts         # gọi ServiceClient, build kết quả
so-chi-tiet.helper.ts          # buildSoChiTiet(...) hàm thuần (testable)
so-chi-tiet.helper.spec.ts     # unit test TDD cho helper
index.ts
```
- Đăng ký module trong `reporting-service` app module.
- Route công khai qua gateway: `/api/so-chi-tiet-tai-khoan` (theo cách `so-cai` được expose).
  Xác nhận tiền tố route khi implement (đối chiếu controller `so-cai` + gateway mapping).

**Hàm thuần** (lõi test):
```ts
buildSoChiTiet(
  vouchers: NhatKyChungEntry[],
  account: { ma: string; ten: string; loai: string },   // TK đã chọn (cha hoặc leaf)
  relevantCodes: Set<string>,                            // §3.1 — gồm cha + mọi con cháu
  soDuDauKyRows: SoDuDauKyLike[],
  maDoiTuong: string | undefined,
  startDate: Date,
  endDate: Date,
): SoChiTietReport
```
> `relevantCodes` được service tính sẵn từ danh mục tài khoản rồi truyền vào helper (giữ helper thuần,
> không cần biết toàn bộ cây).

**Kiểu trả về**:
```ts
interface SoChiTietRow {
  ngay: Date; soPhieu: string; ngayChungTu: Date; noiDung: string;
  tkDoiUng: string; phatSinhNo: number; phatSinhCo: number;
  soDuNo: number; soDuCo: number;
}
interface SoChiTietReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  doiTuong?: { ma: string; ten: string };
  soDuDauKyNo: number; soDuDauKyCo: number;
  rows: SoChiTietRow[];
  tongPhatSinhNo: number; tongPhatSinhCo: number;
  soDuCuoiKyNo: number; soDuCuoiKyCo: number;
}
```

### 4.2 Frontend
```
fe/src/services/soChiTietTaiKhoanService.ts        # gọi API, types khớp BE
fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/
  SoChiTietTaiKhoanPage.tsx                         # trang chính
```
- Thêm route + loadable, gỡ COMING SOON cho `/bao-cao/so-chi-tiet-tai-khoan`
  (cập nhật `App.tsx`, `pages/loadable.tsx`, `routePermissions.ts`, `MainLayout.tsx`/sidebar,
  và `.claude/context/active-pages.md`).
- Dùng Antd `Table` với 2 cấp header (Chứng từ → Số hiệu/Ngày tháng; Số phát sinh → Nợ/Có;
  Số dư → Nợ/Có), `Table.Summary` cho dòng Số dư đầu kỳ / Cộng phát sinh / Số dư cuối kỳ
  (hoặc chèn các dòng đặc biệt vào dataSource và tô đậm).
- `formatCurrency` theo VND như các trang báo cáo khác.

## 5. Phân rã đơn vị (isolation)
- **`so-chi-tiet.helper.ts`** — thuần, không phụ thuộc Nest/HTTP; nhận dữ liệu đã fetch, trả report.
  Test được độc lập (TDD).
- **`so-chi-tiet.service.ts`** — chỉ lo fetch (ServiceClient) + tìm account/đối tượng + gọi helper.
- **`so-chi-tiet.controller.ts`** — chỉ parse query + uỷ quyền service.
- **`soChiTietTaiKhoanService.ts` (FE)** — chỉ gọi API + map kiểu.
- **`SoChiTietTaiKhoanPage.tsx`** — chỉ hiển thị + quản lý filter state.

## 6. Edge cases
- TK không tồn tại → trả report rỗng (giống `so-cai.getLedger`).
- Không có phát sinh & không có số dư đầu kỳ → bảng chỉ có 3 dòng tổng = 0.
- Đối tượng chọn nhưng TK không có phát sinh với đối tượng đó → rỗng + số dư đầu kỳ theo bộ lọc.
- Chứng từ có cùng `ngay` → giữ thứ tự ổn định (sort theo ngay; tie-break theo thứ tự gốc).
- Số tiền âm/0 → cột tương ứng để trống ("-").
- **TK cha không có con leaf phát sinh** → `relevantCodes` vẫn gồm cha; sổ rỗng nếu không TK con nào
  có chứng từ.
- **Chứng từ nội bộ giữa 2 con cùng cây** (chọn cha) → 2 dòng đối ứng nhau, số dư triệt tiêu (§3.6).

## 7. Kiểm thử
- **Unit (helper)**: số dư đầu kỳ (manual + prior), TK đối ứng đúng theo vế, bên phát sinh đúng,
  số dư lũy kế đổi dấu, tổng phát sinh, số dư cuối kỳ, lọc theo đối tượng, bộ rỗng.
- **Unit gộp cha**: chọn TK cha → gộp đủ con; chứng từ nội bộ 2 con sinh 2 dòng & số dư triệt tiêu;
  số dư đầu kỳ gộp con; TK đối ứng giữ mã con thực tế.
- **Thủ công**: chọn TK 111 không lọc đối tượng → đối chiếu Sổ cái; chọn TK 131 (cha) → tổng khớp các
  con 1311/1312…; chọn TK 131 + 1 khách hàng → đối chiếu công nợ; đổi kỳ để kiểm số dư đầu/cuối kỳ.

## 8. Ngoài phạm vi (bản đầu)
- Xuất Excel, In PDF mẫu sổ có chân ký + đánh số trang.
- Đa loại tiền (chỉ VNĐ).
- Lọc đồng thời nhiều đối tượng.
