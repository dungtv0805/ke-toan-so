# Đồng bộ giao diện — loading, bảng danh mục, bộ nhận diện app

Ngày: 10/09/2026

## Vấn đề

Bốn thứ đang lệch:

1. **Loading**: mọi trang dùng `loading` mặc định của antd Table — spinner tròn che
   bảng, dữ liệu đang xem mờ đi mỗi lần lọc hay lưu xong.
2. **Bảng rộng không đồng nhất**: `scroll.x` hardcode mỗi trang một số (700, 800,
   900, 1000, 1400, 1550, 1600), `size` thì trang bỏ trống (antd mặc định dòng
   cao nhất), trang khai `middle`, hai trang khai `small`. Cùng một màn hình,
   trang thì cột giãn toác, trang thì phải cuộn ngang, dòng cao thấp khác nhau.
3. **Icon import/export** là icon antd đơn sắc, không nhận ra ngay là Excel.
4. **Nhận diện app**: icon trên màn "Chọn ứng dụng" là icon antd chung chung
   (`CalculatorOutlined`, `CheckSquareOutlined`, `TeamOutlined`), mỗi app một màu
   đơn sắc, không có quy cách chung; header app con chỉ có một icon lưới trơ trọi,
   không cho biết đang ở app nào.

## Phạm vi

**Trong phạm vi**

- Component bảng dùng chung `BangDuLieu` + áp cho 26 trang `pages/danh-muc/`.
- Icon SVG màu cho nút Import Excel / Xuất Excel.
- Bộ nhận diện app: glyph 3 app + component ô icon theo quy cách, modal "Chọn
  ứng dụng" vẽ lại, header trái. Sửa cả `ke-toan-so` và `identity-service/portal`
  trong cùng một đợt.

**Ngoài phạm vi đợt này**

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

## Hạng mục 3 — Bộ nhận diện app

Thay cho "đổi hai icon" ban đầu. Bản vẽ Pencil ngày 10/09/2026 đã chốt quy cách;
phần này chỉ ghi lại để code bám theo.

### Nguồn icon

`design/icons/` trong repo `ke-toan-so` là **nguồn duy nhất**. Từ đây sinh
component React cho cả hai repo; sửa icon thì sửa file gốc trước.

| File | Trạng thái |
|---|---|
| `ke-toan.svg` | Đã bóc từ bản vẽ, đã dựng thử ra đúng hình |
| `giao-viec.svg` | Đã bóc từ bản vẽ, đã dựng thử ra đúng hình |
| `nhan-su.svg` | Đã bóc từ bản vẽ, đã dựng thử ra đúng hình |
| `masterceo-mark.svg` | **CÒN THIẾU** — chờ người dùng cấp, chỉ dấu M, không kèm chữ |

Ba app khớp đúng ba `appId` đang có bên Identity: `ke-toan`, `giao-viec`,
`nhan-su`. `appId` là khoá SSO, không đổi.

### Quy cách ô icon

| Mục | Quy tắc |
|---|---|
| Bo góc | 27% cạnh ô |
| Glyph | 55% cạnh ô, trắng đặc, không viền, không đổ bóng |
| Nền | gradient 305°, hai hue lệch nhau 30–45° |
| Bóng ô | `0 5 14`, màu cuối của app ở 40% |
| Lớp sáng | radial trắng 40% ở góc trên-trái |
| Dưới 24px | bỏ gradient và lớp sáng, dùng màu đầu đặc |
| Nền tối | giữ nguyên, KHÔNG đảo màu |
| Một màu (in, dấu mộc) | glyph đặc màu app trên nền trắng |
| Cấm | đặt glyph app này lên màu app khác |

Cỡ dùng: 88 (trang chọn app), 64 (thẻ trong modal), 40 (đầu sidebar),
28 (thanh trên), 20 (danh sách), 16 (favicon).

Gradient theo app — **đổi so với màu đơn đang dùng**:

| App | Gradient | Nền thẻ | Bóng |
|---|---|---|---|
| Tài chính | `#1FD1A3` → `#0E7490` | `#E9FBF5` | `#0E749059` |
| Giao việc | `#4F8CFF` → `#7C3AED` | `#F0F3FF` | `#7C3AED59` |
| Nhân sự | `#FFA63D` → `#F2536D` | `#FFF3EC` | `#F2536D59` |

Dựng bằng một component `OIconApp` nhận `appId` + `size`, tự áp đủ quy tắc trên
theo cỡ (kể cả nhánh dưới 24px). Không rải màu và bo góc rải rác trong từng chỗ
gọi — mỗi lần rải là một lần lệch.

### Modal "Chọn ứng dụng"

Vẽ lại theo bản Pencil: sheet 560px bo 14, tiêu đề 18px đậm + phụ đề "Dùng chung
một tài khoản MasterCEO", nút đóng tròn 24px, hàng thẻ app chia đều. App đang
dùng có viền 2px màu app + huy hiệu "Đang dùng" nền gradient; app khác viền mảnh
+ chữ "Mở" màu app. App chưa bật cho công ty giữ nguyên trạng thái mờ + không bấm
được như hiện tại.

Chân modal: nền `#FBFBFD`, viền trên, bên trái là icon toà nhà + tên công ty
đang dùng, bên phải là "Đổi công ty" màu `#007AFF`.

`TenantSwitcher` ở góc phải header **vẫn giữ nguyên** — hai lối vào cùng một việc,
theo quyết định của người dùng.

### Header

`ke-toan-so` (và các app con khác về sau):

`[lưới 9 chấm] [ô icon app 28px] [tên app]`

- Lưới 9 chấm thay `AppstoreOutlined`, giữ nguyên hành vi mở modal chọn ứng dụng.
- Ô 28px là icon của **chính app đang mở** (Tài chính → gradient teal).
- Chữ là tên app ("Tài chính"), không phải tên công ty, không phải "Master CEO".

Portal Identity giữ bố cục header sẵn có nhưng thay `logo.jpg` bằng
`masterceo-mark.svg`: `[lưới] [dấu M] [Master CEO]`.

### Hai repo, cùng một đợt

| Repo | Chỗ sửa |
|---|---|
| `ke-toan-so/fe` | `components/layout/AppSwitcher.tsx` (icon lưới + modal), `components/layout/MainLayout.tsx` (header trái), component `OIconApp` mới |
| `identity-service/portal` | `src/screens/AppPicker.tsx` (`APP_META`, header, thẻ app 88px), component `OIconApp` bản sao |

Hai repo không dùng chung package, nên `OIconApp` tồn tại hai bản giống hệt. Đầu
mỗi file ghi comment chỉ chéo sang đường dẫn bên kia — theo đúng kiểu comment
"KHỚP portal Identity (AppPicker)" đã có sẵn trong `AppSwitcher.tsx`.

## Kiểm thử và nghiệm thu

**Test tự động**

- `BangDuLieu`: test dựng component — đang tải thì có dải chạy và bảng vẫn giữ
  dòng cũ; không tải thì dải trong suốt; `loading` không rò xuống `Table`;
  `dataSource` rỗng khi đang tải thì không hiện chữ "Không có dữ liệu".
- `OIconApp`: test theo cỡ — dưới 24px thì không có gradient và không có lớp
  sáng; từ 24px trở lên thì có; bo góc đúng 27% cạnh; `appId` lạ không rơi vào
  màu của app khác.
- Chạy `AppPicker.test.tsx` bên `identity-service/portal` — test này có sẵn và
  phải giữ xanh.
- Baseline: BE `yarn test` vốn đã đỏ sẵn 13 suite và `tsc` lỗi sẵn cả hai phía —
  đợt này chỉ chạm FE, so sánh với baseline chứ không lấy "test xanh hết" làm
  mốc.

**Nghiệm thu bằng mắt** (jsdom không bắt được bố cục)

- Bảng ít cột và bảng nhiều cột trên cùng một màn hình rộng.
- Hai trang có cột ghim: kéo cuộn ngang, kiểm hàng tiêu đề không trườn lệch khỏi
  thân bảng.
- Chế độ tối: dải loading và icon Excel còn đọc được; ô icon app giữ nguyên
  màu, không bị đảo.
- Bộ icon ở cả 6 cỡ, đặt cạnh nhau, xem có nhất quán không.

## Rủi ro

| Rủi ro | Xử lý |
|---|---|
| `max-content` làm bảng ít cột thừa trắng bên phải | Dựng trang mẫu cho người dùng duyệt trước khi nhân ra 25 trang |
| Cột ghim vỡ hàng tiêu đề khi đổi `scroll.x` | Nghiệm thu tay hai trang có ghim, dùng harness đã có |
| Icon Excel màu lệch tông với nút antd cùng hàng | Người dùng đã chấp nhận; để lại ghi chú, muốn đồng bộ thì làm đợt sau |
| Hai repo lệch icon app nếu chỉ sửa một bên | Sửa cùng đợt, comment chỉ chéo ở cả hai file |
| Thiếu `masterceo-mark.svg` chặn phần header portal | Ba hạng mục kia không phụ thuộc file này; làm trước, ghép dấu M sau khi có |
| Đổi màu app từ đơn sắc sang gradient đụng chỗ khác đang dùng màu cũ | Rà `#1f7769` / `#2f6fed` / `#b6954e` ở cả hai repo trước khi đổi |
| Sửa 26 file dễ sót một trang | Mọi bảng trong `pages/danh-muc/` đều đi qua `BangDuLieu`, kể cả bảng lồng và bảng đặc biệt (truyền prop riêng). Xong đợt, `grep -rn "<Table" fe/src/pages/danh-muc/` phải không còn kết quả nào |
