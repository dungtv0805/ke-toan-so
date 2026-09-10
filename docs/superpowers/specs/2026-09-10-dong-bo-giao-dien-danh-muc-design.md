# Đồng bộ giao diện danh mục — loading, bảng, icon

Ngày: 10/09/2026

## Vấn đề

Ba thứ lệch nhau giữa 26 trang danh mục:

1. **Loading**: mọi trang dùng `loading` mặc định của antd Table — spinner tròn che
   bảng, dữ liệu đang xem mờ đi mỗi lần lọc hay lưu xong.
2. **Bảng rộng không đồng nhất**: `scroll.x` hardcode mỗi trang một số (700, 800,
   900, 1000, 1400, 1550, 1600), `size` thì trang bỏ trống (antd mặc định dòng
   cao nhất), trang khai `middle`, hai trang khai `small`. Cùng một màn hình,
   trang thì cột giãn toác, trang thì phải cuộn ngang, dòng cao thấp khác nhau.
3. **Icon** import/export là icon antd đơn sắc, và icon trên màn "Chọn ứng dụng"
   là icon antd chung chung (`CalculatorOutlined`, `CheckSquareOutlined`).

## Phạm vi

**Trong phạm vi**

- Component bảng dùng chung `BangDuLieu` + áp cho 26 trang `pages/danh-muc/`.
- Icon SVG màu cho nút Import Excel / Xuất Excel.
- Icon SVG riêng cho từng app ở màn chọn ứng dụng, sửa cả `ke-toan-so` và
  `identity-service/portal`.

**Ngoài phạm vi đợt này**

- Bố cục header (logo + tên công ty + nút chọn app) — chờ ảnh phác từ người dùng.
- Đổi icon các nút hành động Thêm / Sửa / Xoá sang bộ khác. Chấp nhận việc nút
  Excel màu sẽ lệch tông với các nút antd đơn sắc cùng hàng.
- Bảng ngoài `pages/danh-muc/` (chứng từ, sổ sách, báo cáo) — giữ nguyên.

## Hạng mục 1 — `BangDuLieu`

File mới: `fe/src/components/table/BangDuLieu.tsx`

Bọc `Table` của antd, đặt sẵn chuẩn dùng chung và đổi cách hiện loading.

### Giao diện

```ts
interface BangDuLieuProps<T> extends TableProps<T> {
  /** Số px trừ khỏi 100vh để ra chiều cao vùng cuộn dọc.
   *  Mặc định 285 — trang danh mục chuẩn (breadcrumb + FilterBar + phân trang).
   *  Trang có thẻ thống kê phía trên truyền số lớn hơn. */
  buTruDoc?: number;
}
```

Mọi prop khác truyền thẳng xuống `Table`, trừ `loading` (xem dưới).

### Hành vi loading

- `loading` KHÔNG truyền xuống `Table` nữa; `Table` luôn nhận `loading={false}`.
- Ngay trên bảng có một dải cao 2px:
  - đang tải → thanh màu `hsl(var(--primary))` chạy qua lại (CSS keyframes
    thuần, không thêm thư viện);
  - không tải → dải vẫn chiếm đúng 2px nhưng trong suốt, để bảng không nhảy.
- Dữ liệu cũ giữ nguyên trong lúc tải, kể cả lần tải đầu (quyết định của người
  dùng: không làm nhánh skeleton).
- Lần tải đầu chưa có dòng nào, antd sẽ hiện "Không có dữ liệu" trong khoảnh
  khắc chờ — sai nghĩa. Nên khi `loading && dataSource rỗng`, truyền
  `locale={{ emptyText: ' ' }}` để vùng trống im lặng thay vì báo không có dữ liệu.

### Chuẩn bảng

| Prop | Giá trị chuẩn | Ghi chú |
|---|---|---|
| `size` | `"small"` | Dòng nhỏ, đồng nhất mọi trang |
| `scroll.x` | `"max-content"` | Bỏ hết số hardcode |
| `scroll.y` | `` `calc(100vh - ${buTruDoc}px)` `` | Mặc định 285 |

Trang truyền prop trùng tên thì giá trị của trang thắng (`BangDuLieu` trải
`...props` sau giá trị mặc định) — để bảng đặc biệt không bị ép. Ở đợt này chỉ
`scroll` và `pagination` được ghi đè; **không trang nào ghi đè `size`**, vì
đồng nhất dòng nhỏ chính là mục tiêu.

### Bù trừ dọc theo trang

Chiều cao vùng cuộn không gom về một số được: trang có thẻ thống kê phía trên
thì bảng phải thấp hơn. Giữ nguyên số đang dùng, chỉ đổi cách khai:

| `buTruDoc` | Trang |
|---|---|
| 285 (mặc định, không cần khai) | 20 trang còn lại |
| 250 | `QuyChaunTable` (cả hai bảng) |
| 300 | `NhomDongTienPage`, `TaiKhoanKetChuyenPage` |
| 350 | `NhomKhoanMucPage` |
| 400 | `HopDongPage`, `SoDuDauKyPage` |

Gom về một công thức duy nhất (bảng co giãn theo flex thay vì trừ `100vh`) là
việc đáng làm nhưng đụng bố cục từng trang — để đợt sau, không làm ở đây.

### Trường hợp phải xử lý riêng

- `TaiKhoanPage`, `SoDuDauKyPage`: có cột ghim. antd 6 dùng lớp `-fix-start`
  (không phải `-fix-left`), và cột ghim chỉ có tác dụng khi bảng cuộn ngang
  được. `max-content` giữ được điều kiện này, nhưng phải nghiệm thu bằng mắt.
- `QuyChaunTable`: hai bảng + một bảng cây lồng bên trong, `scroll.x` một chỗ là
  biến `scrollX` tính động.
- `SoDuDauKyPage`: `pagination={false}`, bảng cây.
- `HopDongPage`: hai bảng, bù trừ dọc 400 vì có hàng thẻ thống kê.
- `NhomKhoanMucPage`: bù trừ dọc 350.
- Trang dùng `useCotCoGian` (bề rộng cột nằm trong state React): kiểm rằng
  `max-content` không đá nhau với bề rộng người dùng đã kéo và lưu.

### Cách triển khai

Đổi **một trang mẫu trước** (`DonViTinhPage` — bảng phẳng, ít cột, không ghim
cột), cho người dùng xem, được duyệt mới nhân ra 25 trang còn lại. Nhóm các
trang đặc biệt ở trên làm sau cùng, mỗi trang nghiệm thu riêng.

### Điểm chưa xác nhận

`scroll.x = "max-content"` khi bảng ít cột: chưa xác nhận antd 6 có kéo bảng đầy
khung chứa hay để thừa khoảng trắng bên phải. Phải dựng thật rồi nhìn, không suy
từ tài liệu. Nếu để thừa trắng, phương án dự phòng là đặt `min-width: 100%` cho
phần tử `table` bằng CSS trong `BangDuLieu`.

## Hạng mục 2 — Icon Excel màu

File mới: `fe/src/components/icons/ExcelIcons.tsx` — hai component SVG:

- `IconNhapExcel`: tờ tài liệu, ô bảng tính xanh lá, mũi tên chỉ **vào**.
- `IconXuatExcel`: cùng thân, mũi tên chỉ **ra**.

Vẽ tay, `viewBox="0 0 24 24"`, màu đặt cứng trong SVG (xanh Excel) trừ nét thân
tài liệu dùng `currentColor` để còn theo được chế độ tối.

Sửa đúng hai chỗ, mọi trang danh mục ăn theo:

- `components/import-danh-muc/ImportDanhMucButton.tsx` — thay `FileExcelOutlined`.
- `components/export-danh-muc/ExportDanhMucButton.tsx` — thay `ExportOutlined`.

Nút Xuất Excel có trạng thái `loading` của antd Button (thay icon bằng spinner);
giữ nguyên hành vi đó.

## Hạng mục 3 — Icon app ở màn chọn ứng dụng

Hai SVG mới, một cho **Tài chính**, một cho **Giao việc**, thay
`CalculatorOutlined` / `CheckSquareOutlined`. Nền tile giữ nguyên màu hiện có
(`#1f7769` cho Tài chính, `#2f6fed` cho Giao việc), icon vẽ nét trắng để nổi trên
nền màu.

Phải sửa **cả hai repo**, nếu không hai nơi hiện icon khác nhau:

- `ke-toan-so/fe/src/components/layout/AppSwitcher.tsx` — hằng `APP_STYLE`.
- `identity-service/portal/src/screens/AppPicker.tsx`.

Mỗi bên có một file icon riêng với nội dung giống hệt (hai repo không dùng chung
package). Đầu mỗi file ghi comment chỉ chéo sang đường dẫn file bên kia, để lần
sau ai sửa một bên biết phải sửa bên kia — đúng kiểu comment "KHỚP portal
Identity (AppPicker)" đã có sẵn trong `AppSwitcher.tsx`.

`identity-service/portal/src/screens/AppPicker.test.tsx` đã có sẵn; phải chạy và
giữ xanh sau khi đổi.

## Kiểm thử và nghiệm thu

**Test tự động**

- `BangDuLieu`: test dựng component — đang tải thì có dải chạy và bảng vẫn giữ
  dòng cũ; không tải thì dải trong suốt; `loading` không rò xuống `Table`;
  `dataSource` rỗng khi đang tải thì không hiện chữ "Không có dữ liệu".
- Chạy `AppPicker.test.tsx` bên `identity-service/portal`.
- Baseline: BE `yarn test` vốn đã đỏ sẵn 13 suite và `tsc` lỗi sẵn cả hai phía —
  đợt này chỉ chạm FE, so sánh với baseline chứ không lấy "test xanh hết" làm
  mốc.

**Nghiệm thu bằng mắt** (jsdom không bắt được bố cục)

- Bảng ít cột và bảng nhiều cột trên cùng một màn hình rộng.
- Hai trang có cột ghim: kéo cuộn ngang, kiểm hàng tiêu đề không trườn lệch khỏi
  thân bảng.
- Chế độ tối: dải loading và icon Excel còn đọc được.

## Rủi ro

| Rủi ro | Xử lý |
|---|---|
| `max-content` làm bảng ít cột thừa trắng bên phải | Dựng trang mẫu cho người dùng duyệt trước khi nhân ra 25 trang |
| Cột ghim vỡ hàng tiêu đề khi đổi `scroll.x` | Nghiệm thu tay hai trang có ghim, dùng harness đã có |
| Icon Excel màu lệch tông với nút antd cùng hàng | Người dùng đã chấp nhận; để lại ghi chú, muốn đồng bộ thì làm đợt sau |
| Hai repo lệch icon app nếu chỉ sửa một bên | Sửa cùng đợt, comment chỉ chéo ở cả hai file |
| Sửa 26 file dễ sót một trang | Mọi bảng trong `pages/danh-muc/` đều đi qua `BangDuLieu`, kể cả bảng lồng và bảng đặc biệt (truyền prop riêng). Xong đợt, `grep -rn "<Table" fe/src/pages/danh-muc/` phải không còn kết quả nào |
