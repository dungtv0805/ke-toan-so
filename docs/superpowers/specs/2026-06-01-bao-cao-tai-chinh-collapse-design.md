# Thiết kế: Collapse/Expand cây tài khoản ở Báo cáo tài chính

**Ngày:** 2026-06-01
**Trạng thái:** Đã chốt thiết kế, chờ review
**Phạm vi:** Thuần frontend (`fe/`), không đổi backend.

## Bối cảnh & Vấn đề

Trang `BaoCaoTaiChinhPage` hiển thị **Bảng cân đối phát sinh** và **Bảng cân đối kế toán** dạng bảng **phẳng**, sắp theo mã tài khoản. Người dùng muốn xem dạng **cây thu gọn như Excel**: mặc định chỉ hiện tài khoản cha (đóng), bấm mở mới hiện tài khoản con — đa cấp.

Hiện trạng:
- Bảng cân đối phát sinh (`tbState.trialBalance`): mảng phẳng `TrialBalance { taiKhoan, tenTaiKhoan, soDuDauKyNo/Co, phatSinhNo/Co, soDuCuoiKyNo/Co }`. Quan hệ cha-con đang nhận diện bằng prefix (`startsWith`) trong `parentChildrenMap`; cell TK cha hiển thị `tổng_con(xanh) + riêng_cha(cam)` qua `renderTrialAmount`. Tổng cộng = cộng tất cả dòng (mỗi dòng là giá trị riêng của TK).
- Bảng cân đối kế toán (`bsState.data.taiSan` / `nguonVon`): mảng `BalanceSheetItem { ma, ten, soTien, ... }`. **BE chỉ trả TK có số dư ≠ 0** → TK cha không có phát sinh trực tiếp thường **không xuất hiện**. Tổng lấy từ `bsState.stats` (BE tính).

## Mục tiêu

Chuyển cả 2 bảng sang dạng cây đa cấp, mặc định đóng, mở ra hiện con — giữ nguyên ý nghĩa số liệu và tổng cộng.

## Quyết định thiết kế (đã chốt)

| Vấn đề | Quyết định |
|---|---|
| Số cấp lồng | Đa cấp (như Excel), mặc định chỉ hiện TK gốc cấp cao nhất |
| Phạm vi | Cả Bảng cân đối phát sinh + Bảng cân đối kế toán |
| Dòng cha (cân đối phát sinh) | Giữ kiểu **xanh (tổng con) + cam (riêng cha)**; TK cha không có phát sinh riêng → chỉ hiện phần xanh (tổng con) thay vì hiện 0 |
| Dòng cha (cân đối kế toán) | Hiện **tổng gộp** nhóm, in đậm (không có khái niệm "riêng cha") |
| Nguồn cây | Dựng theo **prefix mã** trên **toàn bộ danh mục TK** (`getHierarchy`), KHÔNG dùng `parentId` (BE để parentId không nhất quán ObjectId/mã) |
| Nút tiện ích | Có nút **"Mở tất cả / Thu gọn"** |
| Backend | Không đổi |

## Kiến trúc

### 1. Util dựng cây (thuần, có test)

File: `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts`

Hàm generic dựng cây từ danh sách báo cáo phẳng + danh mục TK đầy đủ:

```
buildAccountTree<T>(
  reportRows: T[],            // dòng báo cáo (có mã TK)
  allAccounts: { ma: string; ten: string }[],  // chart đầy đủ từ getHierarchy
  getCode: (row: T) => string,                 // lấy mã từ report row
  sumFields: (keyof T)[],                      // các field số để roll-up
): TreeNode<T>[]
```

Thuật toán:
1. **Lồng theo prefix mã**: với tập mã của toàn chart, cha của mã `X` = mã `Y` trong chart sao cho `Y` là tiền tố đúng (`X.startsWith(Y) && X !== Y`) và `Y` dài nhất. Xây map `parentCode -> children[]`.
2. **Gắn dữ liệu**: map report row vào node theo `ma`.
3. **Cắt tỉa**: chỉ giữ node là TK có dữ liệu báo cáo, hoặc là tổ tiên của một TK có dữ liệu. Bỏ nhánh không có dữ liệu.
4. **Roll-up**: với mỗi node cha, tính tổng các `sumFields` của **toàn bộ con cháu có dữ liệu** (đệ quy), lưu vào `node.rollup`. Giá trị riêng của node giữ ở `node.own` (= report row của chính nó, hoặc 0 nếu cha không có report row).
5. Trả về mảng node gốc (cấp cao nhất), mỗi node có `children?: TreeNode<T>[]`.

`TreeNode<T>` chứa: `ma`, `ten`, `own: T | null` (số liệu riêng), `rollup: Record<sumField, number>` (tổng con cháu), `children?`.

Đặc tả rõ:
- Node có `children` ⇒ là node cha (hiển thị roll-up + own).
- Node không `children` ⇒ node lá (hiển thị own).
- TK trong báo cáo không khớp chart → thành node gốc, không con.

### 2. Lấy danh mục đầy đủ

- Trong `loadData` của trang, gọi thêm `taiKhoanService.getHierarchy()` song song với các API báo cáo. Lưu vào state `accountsState`.
- `getHierarchy()` trả flat list toàn bộ TK active (đã xác minh: `findAll` không giới hạn số lượng), đủ để biết TK cha trung gian.

### 3. Bảng cân đối phát sinh (tree)

- `dataSource` = `buildAccountTree(trialBalance, accounts, r => r.taiKhoan, [6 field số])`.
- `Table` thêm `expandable={{ defaultExpandAllRows: false }}` (mặc định đóng) + state điều khiển `expandedRowKeys` cho nút "Mở tất cả / Thu gọn". `rowKey = "ma"`.
- `renderTrialAmount(field)` cập nhật để đọc từ `TreeNode`:
  - Node lá: `CurrencyCell(own[field])`.
  - Node cha: nếu `own[field] > 0` và `rollup[field] > 0` → `rollup(xanh) + own(cam)`; nếu chỉ có rollup → chỉ phần xanh `rollup[field]`; (giữ logic màu hiện có).
- `parentChildrenMap` cũ **bị thay thế** bởi roll-up của cây (xoá, tránh trùng logic).
- **Tổng cộng giữ nguyên**: tính từ mảng phẳng gốc `tbState.trialBalance` như hiện tại (không đụng cây).

### 4. Bảng cân đối kế toán (tree)

- 2 bảng `taiSan` / `nguonVon` mỗi cái = `buildAccountTree(items, accounts, r => r.ma, ['soTien'])`.
- `Table` cây, mặc định đóng, `rowKey = "ma"`.
- Cột số tiền: node cha hiện `rollup.soTien` (in đậm); node lá hiện `own.soTien`.
- **Tổng giữ nguyên** từ `bsState.stats` (BE). Node cha gộp chỉ để hiển thị, không cộng vào tổng.
- Giữ các dòng đặc biệt hiện có (section/total) nếu có — không phá vỡ.

### 5. Nút "Mở tất cả / Thu gọn"

- Một state `expandedKeys: string[]` cho mỗi bảng cây. "Mở tất cả" = set tất cả mã node-có-con; "Thu gọn" = `[]`. Mặc định khởi tạo `[]` (đóng).

## Edge cases

- TK cha có dữ liệu riêng + có con → xanh(tổng con) + cam(riêng) [cân đối phát sinh].
- TK cha không có dữ liệu riêng (vắng mặt ở balance sheet, hoặc 0 ở trial balance) → node gộp, hiện tổng con.
- Báo cáo rỗng → cây rỗng, bảng hiển thị trống như cũ.
- Mã TK lạ không có trong chart → node gốc đơn lẻ.
- Danh mục TK load lỗi → fallback hiển thị **phẳng** (không cây) để không vỡ trang; log cảnh báo.

## Phạm vi KHÔNG làm (YAGNI)

- Không đổi backend / API.
- Không thêm cấu hình lưu trạng thái mở/đóng giữa các lần vào trang.
- Không đụng tab KQKD và bảng so sánh PnL.
- Không thay đổi cách tính tổng cộng.

## Kiểm thử

- Unit test `buildAccountTree`: lồng đa cấp đúng (112 → 1121 → 11211); cắt tỉa nhánh không dữ liệu; roll-up tổng con cháu đúng; TK cha vắng mặt vẫn tạo node gộp; mã lạ thành node gốc; report rỗng → [].
- Thủ công: cả 2 tab mặc định đóng chỉ hiện TK gốc; mở ra hiện con đúng cấp; số dòng cha = tổng con (+ riêng cha ở cân đối phát sinh); dòng "Tổng cộng" và "Tổng tài sản/Nguồn vốn" không đổi so với trước; nút Mở tất cả/Thu gọn hoạt động.
