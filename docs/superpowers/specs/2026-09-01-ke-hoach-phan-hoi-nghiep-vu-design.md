# Kế hoạch / Dự báo — phản hồi nghiệp vụ đợt 01/09/2026

Nguồn: 4 ảnh chụp màn hình kèm ghi chú của chị kế toán (Master CEO).

## Phạm vi

Bảy việc, chia bốn nhóm. Việc thứ tám trong ảnh là câu hỏi nghiệp vụ, đã có sẵn
tính năng — không sửa code.

| # | Yêu cầu | Nhóm |
|---|---|---|
| 1 | Cột tự co giãn + ghim đến hết cột CẢ NĂM | A |
| 3 | Bảng rộng quá | A |
| 2 | Khối cảnh báo lệch mục tiêu gọn còn 1 dòng | B |
| 4 | "P&L 3 lớp" chuyển sang menu Báo cáo, bỏ khỏi Kế hoạch/Dự báo | C |
| 5 | Trang Dự báo phải hiện tab "P&L Dự báo", không phải "P&L Kế hoạch" | C |
| 6 | Dòng tiền: ô "Chọn nhóm" trống, không chọn được | D |
| 7 | In sổ Nhật ký chung phải in được cả các cột phía sau | D |
| 8 | Đi thẳng từ bảng chi tiết sang P&L, bỏ bước hạch toán? | — |

## Nhóm A — Co giãn cột và ghim cột

### Vấn đề

`useTableColumnResize` (dùng ở Nhật ký chung và tab Chi tiết) sửa **trực tiếp
DOM** theo *chỉ số cột*. `fixed: "left"` của antd lại tính `left: Npx` **lúc
render React**. Kéo giãn một cột ghim bằng DOM thì antd không biết để tính lại
offset, nên hàng tiêu đề trườn lệch khỏi thân bảng.

Đây chính là nguyên nhân hai lần thử ghim cột ở Nhật ký chung đều phải gỡ —
xem ghi chú tại `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`
(khối bình luận ngay trên `const columns = useMemo(...)`).

### Cách làm

Hook mới `useCotCoGian` tại `fe/src/pages/ke-hoach/hooks/`, resize **theo state
React** thay vì theo DOM:

- state `Record<colKey, number>`, khoá theo **key cột** (không theo chỉ số);
- ghi/đọc `localStorage`;
- ô tiêu đề bọc `ResizableTitle` dựng trên `react-resizable` (đã có sẵn trong
  `package.json`, chưa dùng ở đâu).

Kéo giãn → `setState` → antd render lại → tự tính lại `left` của các cột sticky.
Nhờ vậy ghim và co giãn sống chung được.

Khoá theo key cột còn chữa được bệnh phải bump phiên bản khoá lưu (`v6` ở Nhật
ký chung, `v3` ở bộ chọn cột) mỗi lần thêm/bớt cột.

Áp cho cả năm bảng: Bán hàng, Nhân sự, Dòng tiền, Tài sản, Nguồn vốn.

### Ghim

`fixed: "left"` cho các cột từ đầu đến hết **CẢ NĂM**. Cột CHÊNH LỆCH, nhóm Quý
và nhóm Tháng cuộn ngang.

### Bề rộng mặc định

Ghim tám cột theo bề rộng hiện tại chiếm khoảng 1140px — máy 1366px chỉ còn
~220px để cuộn, không dùng được. Thu gọn mặc định:

| Cột | Trước | Sau |
|---|---|---|
| Mã | 200 | 130 |
| Tên sản phẩm / Tên dòng tiền | 240 | 190 |
| Diễn giải | 260 | 170 |

Còn khoảng 940px ghim. Người dùng kéo rộng lại được và hệ thống nhớ.

### Rủi ro

Hai cột ghim đầu có `colSpan: 2` ở hàng TỔNG và hàng nhóm (`onCellNhan` /
`onCellNhanPhu`). Sticky kèm colSpan là chỗ antd hay vỡ, và **jsdom không tái
hiện được** (không có `position: sticky`, không có thanh cuộn). Phải nghiệm thu
bằng trình duyệt thật, không tin test.

## Nhóm B — Cảnh báo một dòng

`CanhBaoLechMucTieu` đang dựng `Alert` có cả `message` lẫn `description` → khối
cao hai dòng, chiếm chỗ. Gộp thành một dòng, dùng `banner`:

> Kế hoạch chưa khớp mục tiêu năm — còn cần phân bổ **4.345.510.010 ₫** · 6 dòng lệch

## Nhóm C — Tách P&L 3 lớp ra Báo cáo

| | Trước | Sau |
|---|---|---|
| Kế hoạch | `… P&L Kế hoạch │ P&L 3 lớp │ …` | `… P&L Kế hoạch │ …` |
| Dự báo | `… P&L Kế hoạch │ P&L 3 lớp │ …` | `… P&L Dự báo │ …` |
| Báo cáo | — | thêm **P&L so sánh KH-DB-TH** |

`TAB_OPTIONS` trong `KeHoachTabsPage.tsx` đang là hằng số cứng nên trang Dự báo
hiện nhầm nhãn "P&L Kế hoạch". Đổi thành hàm nhận `loaiKeHoach`.

Lý do nghiệp vụ (nguyên văn): *"trong mỗi mục KẾ HOẠCH - DỰ BÁO - THỰC HIỆN đều
có 1 P&L cho dữ liệu đó. chứ trong kế hoạch thì chưa thể có báo cáo của thực
hiện và dự báo đc"*.

Trang mới `/bao-cao/pnl-3-lop` là vỏ mỏng bọc `Pnl3LopTab` sẵn có, kèm thanh
chọn Năm và Phiên bản (hai giá trị này hiện do `KeHoachTabsPage` cấp). Giữ
nguyên vị trí file `pages/ke-hoach/tabs/pnl-3-lop/` để khỏi phải sửa loạt đường
dẫn import nội bộ (`../lib/cotChung`).

Wiring đủ tám chỗ theo checklist trang mới:

1. `fe/src/App.tsx` — route + `ProtectedRoute`
2. `fe/src/pages/loadable.tsx`
3. `fe/src/config/menuCatalog.ts`
4. `fe/src/config/routePermissions.ts`
5. `fe/src/components/layout/MainLayout.tsx` — **hai chỗ**: `getMenuItem` và mảng route đang hoạt động
6. `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`
7. `be/libs/core/src/permissions/all-permissions.ts`

Sau khi deploy còn hai việc ngoài code: `$addToSet` quyền mới cho role "Admin"
đã tồn tại, và thêm key vào `linh_vuc.menuKeys` — thiếu thì trang bị ẩn dù đã
cấp quyền đầy đủ.

## Nhóm D — Chọn nhóm dòng tiền, và in theo cột

### #6 — ô "Chọn nhóm" trống

Ảnh cho thấy ô *Tên dòng tiền* có dữ liệu (`T03 - Thu nợ khách hàng`) nhưng ô
*Chọn nhóm* rỗng → danh mục **Nhóm dòng tiền** của công ty chưa có bản ghi,
trong khi danh mục **Dòng tiền** thì có (và mỗi dòng tiền mang sẵn mã nhóm ở
trường `nhom`).

Sửa ở phía code để không phụ thuộc việc người dùng nhập danh mục:

- danh sách nhóm suy ra thêm từ các mã `nhom` đang có trên danh mục Dòng tiền,
  hợp với danh mục Nhóm dòng tiền và khử trùng theo mã;
- chọn *Tên dòng tiền* thì tự điền nhóm theo `dongTien.nhom` — một thao tác
  thay vì hai.

Làm y hệt cho bảng Bán hàng (`SanPham.nhom`), cùng một mẫu lỗi.

### #7 — in theo cột đang hiện

`nkcListPrint.ts` đang cứng mười cột. Sửa để nhận danh sách cột cần in và in
đúng những cột **đang hiện trên bảng** — dùng lại bộ chọn cột `useColumnVisibility`
sẵn có, không thêm màn hình mới. Nhiều cột thì bản in thu nhỏ cỡ chữ, vẫn để
ngang A4.

## Việc #8 — không sửa code

Câu hỏi: *"nếu chị muốn từ bảng chi tiết này đi thẳng sang P&L mà k cần bảng
hạch toán chi tiết thì khi phân tích so sánh giữa 3 bảng KH - DB - TH có so sánh
đc k và có vẽ đc biểu đồ so sánh k?"*

Đã có sẵn: `DongBoHachToanKeHoachService`
(`be/apps/voucher-service/src/ke-hoach-bang/dong-bo/`) tự sinh bút toán từ năm
bảng chi tiết theo cấu hình **Định khoản**, xoá và chèn lại theo `nguonId` nên
idempotent, và chỉ đụng vào dòng có `nguonId` (dòng người dùng tự nhập ở tab
Chi tiết không bị xoá). Kế toán không phải hạch toán tay.

P&L Dự báo đang trống chỉ vì công ty **chưa nhập số Dự báo**, không phải thiếu
tính năng. So sánh ba lớp KH–DB–TH và vẽ biểu đồ vì thế vẫn chạy được.

## Kiểm thử

Unit test cho: hook chiều rộng cột, hàm dựng danh sách nhóm, hàm dựng HTML in
theo cột. Phần ghim và co giãn phải nghiệm thu bằng trình duyệt thật vì jsdom
không tái hiện được sticky và thanh cuộn.
