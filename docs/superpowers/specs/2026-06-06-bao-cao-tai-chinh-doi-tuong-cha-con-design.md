# Báo cáo tài chính — Chi tiết tài khoản theo đối tượng (cây cha–con)

**Ngày:** 2026-06-06
**Trang:** `/bao-cao/tai-chinh` (`fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`)
**Nhánh:** `feat/bao-cao-tai-chinh-doi-tuong-cha-con`

## 1. Mục tiêu

Trong Báo cáo tài chính, các tài khoản có cấu hình "Chi tiết theo" (đối tượng:
khách hàng / nhà cung cấp / nhân viên / nhà thầu / ngân hàng-quỹ) phải xổ ra
được **từng đối tượng làm dòng con** theo dạng cây cha–con, để xem chi tiết ngay
trong báo cáo.

Áp dụng cho:
- **Tab 1 — Cân đối tài khoản** (bảng cân đối phát sinh): thêm đối tượng cha–con
  **và** giữ scroll trong bảng + dòng "Tổng cộng" cố định (đã có sẵn).
- **Tab 2 — Cân đối kế toán** (balance sheet): thêm đối tượng cha–con, **giữ
  nguyên** bố cục hiện tại (2 card TÀI SẢN / NGUỒN VỐN, không cần tổng cố định).

Tab 3 (Kết quả kinh doanh) và Tab 4 (So sánh lãi lỗ): **không đổi**.

## 2. Nguyên tắc cốt lõi

- **Đối tượng là phân rã, không cộng thêm.** Σ(các đối tượng của 1 TK) = số dư
  của chính TK đó. Số hiển thị ở dòng TK **giữ nguyên**; mở rộng chỉ để xem chi
  tiết. Khác hẳn TK con (theo mã) vốn **cộng dồn** vào TK cha.
- **Chỉ TK có `chiTietTheo`** mới xổ đối tượng. TK không có `chiTietTheo` giữ
  nguyên một dòng như hiện tại.
- **Cây:** TK cha → (TK con theo mã, nếu có) → từng đối tượng (lá). Đối tượng
  nằm dưới đúng TK mà chứng từ hạch toán vào.
- **Khớp tổng:** chứng từ / số dư đầu kỳ thuộc TK có `chiTietTheo` nhưng **thiếu
  đối tượng** → gom vào dòng con **"Chưa xác định đối tượng"**, để Σ các con luôn
  bằng dòng TK cha.

## 3. Dữ liệu nền (đã xác minh có sẵn)

| Dữ liệu | Nguồn |
|---|---|
| TK nào chi tiết theo đối tượng | `TaiKhoan.chiTietTheo` (enum `ChiTietTheo`) — `libs/entities/src/master-data/tai-khoan.entity.ts` |
| Phát sinh theo (TK, đối tượng) | `chung_tu.danhMuc.doiTuong.{ma,ten}` + `taiKhoanNo/taiKhoanCo.ma` — `libs/entities/src/voucher/chung-tu.entity.ts` |
| Số dư đầu kỳ theo đối tượng | `SoDuDauKy.{chiTietType,chiTietMa,chiTietTen}` — `libs/entities/src/master-data/so-du-dau-ky.entity.ts`; lấy qua `serviceClient.getSoDuDauKyRaw()` |

→ Đủ dữ liệu để khớp tổng ở cấp đối tượng (cả đầu kỳ, phát sinh, cuối kỳ).

## 4. Thiết kế Backend

### 4.1 Tab 1 — Cân đối tài khoản (PA1: aggregation đối tượng riêng, không đụng tổng cũ)

**voucher-service** (`apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts`)
- Thêm `aggregateBalanceByDoiTuong(startDate, endDate, tenantId?)`:
  - Pipeline `$facet` tương tự `aggregateBalance` hiện có, nhưng `$group._id` là
    **composite** `{ ma: '$danhMuc.taiKhoanNo.ma', dt: '$danhMuc.doiTuong.ma' }`
    cho nhánh Nợ, và `taiKhoanCo.ma` cho nhánh Có. Tên đối tượng lấy bằng
    `doiTuongTen: { $first: '$danhMuc.doiTuong.ten' }` (KHÔNG đưa tên vào `_id` để
    tránh tách bucket khi tên lệch).
  - Trả về `Array<{ ma, doiTuongMa, doiTuongTen, priorNo, priorCo, periodNo, periodCo }>`,
    merge nhánh Nợ + Có theo `(ma, doiTuongMa)` (giống cách `aggregateBalance`
    merge theo `ma`). Bản ghi `doiTuongMa == null` chính là phần "Chưa xác định đối tượng".
- Controller `nhat-ky-chung.controller.ts`: thêm route `GET /nhat-ky-chung/aggregate-balance-by-doi-tuong`.

**service-client** (`libs/service-client/src/service-client.ts`)
- Thêm `aggregateBalanceByDoiTuong(startDate, endDate, authToken?, tenantId?)`
  gọi route trên.

**reporting-service** (`apps/reporting-service/src/so-cai/so-cai.service.ts`)
- Trong `getTrialBalance`:
  1. Đã có `accounts` → lập map `ma → chiTietTheo`.
  2. Thêm vào `Promise.all`: `aggregateBalanceByDoiTuong(...)` và đổi
     `getSoDuDauKy()` → bổ sung `getSoDuDauKyRaw()` (để có `chiTietMa/chiTietTen`).
  3. Với mỗi entry TK **có `chiTietTheo`**: dựng danh sách đối tượng bằng cùng
     `computeTrialRow(...)` (đã dùng cho cấp TK) cho từng `(ma, doiTuongMa)`, với
     opening lấy từ dòng raw khớp `(maTaiKhoan, chiTietMa)`. Gắn vào entry:
     `doiTuongChiTiet: TrialBalanceEntry[]` (cùng 6 cột số + `ma`=đối-tượng-mã,
     `ten`=đối-tượng-tên). Dòng `doiTuongMa == null` → `ten = "Chưa xác định đối tượng"`.
  4. TK **không** có `chiTietTheo`: `doiTuongChiTiet` để trống/không set.
- Type `TrialBalanceEntry` thêm field optional `doiTuongChiTiet?: TrialBalanceEntry[]`.
- **Tổng cấp TK và `totals` giữ nguyên cách tính cũ** (rủi ro lệch số = 0).

### 4.2 Tab 2 — Cân đối kế toán (PA3: tính tại chỗ từ chứng từ thô)

**reporting-service** (`apps/reporting-service/src/bao-cao/bao-cao.service.ts`, hàm balance-sheet)
- Hàm này đã tải sẵn `vouchers` (raw) + `accounts` + opening. Bổ sung:
  - Lấy opening theo đối tượng: dùng `getSoDuDauKyRaw()` (có `chiTietMa`).
  - Với mỗi account **có `chiTietTheo`** và `amount !== 0`: phân rã `soTien` theo
    đối tượng (lọc voucher theo `danhMuc.doiTuong.ma`, cùng công thức
    `calculateAccountBalance` cho từng đối tượng + opening theo `chiTietMa`).
    Gắn `doiTuongChiTiet: Array<{ ma, ten, soTien }>`; phần thiếu đối tượng →
    "Chưa xác định đối tượng".
- Type `BalanceSheetEntry` (response) thêm `doiTuongChiTiet?: Array<{ ma; ten; soTien }>`.

## 5. Thiết kế Frontend

### 5.1 Tiện ích cây (`fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts`)

- `TreeNode<T>` thêm cờ optional `__isDoiTuong?: boolean`.
- Thêm hàm `attachDoiTuongChildren<T>(tree, doiTuongByCode, makeNode)`:
  - `doiTuongByCode: Map<accountCode, DT[]>`.
  - Duyệt cây, với node TK có đối tượng: gắn `children` là các node đối tượng
    (`__ma = \`${code}::${dtMa}\``, `__isParent=false`, `__isDoiTuong=true`,
    `__rollup={}`), và đặt `__isParent=true` cho node TK đó.
  - **Đối tượng KHÔNG nằm trong tập `codes`** của `buildAccountTree`, nên
    `__rollup` (tổng TK con theo mã) **tự động không tính** đối tượng → đảm bảo
    nguyên tắc "phân rã, không cộng thêm".
- `collectParentKeys` giữ nguyên (đã gom mọi node có `children`, gồm cả TK có
  đối tượng → nút "Mở tất cả" chạy đúng).

### 5.2 Trang `BaoCaoTaiChinhPage.tsx`

**Tab 1 (Cân đối tài khoản):**
- Sau `buildAccountTree(...)` cho `trialBalanceTree`, gọi `attachDoiTuongChildren`
  với map dựng từ `TrialBalance.doiTuongChiTiet`.
- `renderTrialAmount` không cần đổi logic cộng dồn: với TK chỉ có đối tượng,
  `__rollup=0` nên nhánh `childrenVal>0` bỏ qua → hiển thị đúng `ownVal`. Dòng
  đối tượng (`__isDoiTuong`, `__isParent=false`) hiển thị giá trị của chính nó.
- Cột "Tài khoản": dòng đối tượng để trống (hoặc mã ĐT). Cột "Tên tài khoản":
  dòng đối tượng hiển thị `"{mã ĐT} - {tên ĐT}"` (thụt lề do antd tree lo).
- Giữ nguyên `scroll={{ x: 1480, y: antTableScrollY }}` + `Table.Summary fixed`
  (dòng Tổng cộng cố định, chỉ scroll trong bảng).

**Tab 2 (Cân đối kế toán):**
- Trong `buildBsTree`, sau khi dựng cây account của mỗi section, gọi
  `attachDoiTuongChildren` với map từ `BalanceSheetItem.doiTuongChiTiet`.
- `balanceSheetColumns`: render `__isParent` đã `own + rollup`; với TK chỉ có đối
  tượng, `rollup=0` → `own`. Dòng đối tượng (`tenChiTieu = "{mã} - {tên}"`) hiển
  thị bình thường (không in đậm).
- **Giữ nguyên** bố cục 2 card + `div maxHeight overflow:auto` hiện tại.

**Service FE:**
- `soCaiService.TrialBalance` thêm `doiTuongChiTiet?` (map từ `TrialBalanceEntry.doiTuongChiTiet`).
- `balanceSheetService.BalanceSheetItem` thêm `doiTuongChiTiet?`; map trong
  `mapEntriesToItems`.

## 6. Mặc định đã chốt

1. Chỉ TK có `chiTietTheo` mới xổ đối tượng; TK khác giữ nguyên.
2. Có dòng **"Chưa xác định đối tượng"** cho phần thiếu đối tượng (khớp tổng).
3. Mặc định **thu gọn**; nút "Mở tất cả" / "Thu gọn" áp dụng cả đối tượng.
4. Dòng đối tượng là **lá** (không xổ tiếp), nhãn `"{mã} - {tên}"`.
5. Tab 1 giữ scroll + Tổng cộng cố định; Tab 2 giữ bố cục.

## 7. Ngoài phạm vi (YAGNI)

- Xuất Excel (nút hiện chưa nối handler — không động tới).
- Ảo hóa dòng (virtualization) — chỉ thêm nếu "Mở tất cả" với rất nhiều đối tượng
  gây chậm thực tế.
- Tab 3, Tab 4.

## 8. Kiểm thử

- `buildAccountTree.test.ts`: thêm ca cho `attachDoiTuongChildren` — (a) số dòng
  TK cha **không đổi** khi gắn đối tượng; (b) Σ con = giá trị cha; (c) dòng "Chưa
  xác định đối tượng" xuất hiện khi có phần mồ côi; (d) TK không `chiTietTheo`
  không có con.
- BE unit test: `aggregateBalanceByDoiTuong` (gộp đúng theo composite key, gồm
  bucket null); `getTrialBalance` gắn `doiTuongChiTiet` & khớp tổng; balance-sheet
  phân rã đối tượng & khớp `soTien`.

## 9. Rủi ro / lưu ý

- **Khớp tổng** là tiêu chí số 1: Σ(đối tượng + "Chưa xác định") phải đúng bằng
  số dư TK ở mọi cột (đầu kỳ / phát sinh / cuối kỳ). Kiểm tra kỹ phần opening theo
  `chiTietMa`.
- TK vừa có TK con (theo mã) vừa có đối tượng (hiếm): TK con = cộng dồn, đối tượng
  = phân rã của phần own — hai loại con cùng tồn tại, không xung đột vì rollup chỉ
  tính theo mã TK.
- `rowKey="__ma"`: khóa đối tượng `"{code}::{dtMa}"` không trùng mã TK.
