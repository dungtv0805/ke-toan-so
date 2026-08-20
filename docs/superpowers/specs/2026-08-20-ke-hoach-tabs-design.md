# Kế hoạch — trang 7 tab, bảng nhập liệu Bán hàng & Nhân sự

Ngày: 2026-08-20
Nguồn yêu cầu: `docs/THIẾT KẾ KẾ HOẠCH.xlsx`

## 1. Mục tiêu

Biến menu **Kế hoạch** (`/trung-tam-du-lieu/ke-hoach`) thành trang nhiều tab theo đúng
các sheet của file thiết kế, và làm đầy đủ hai bảng nhập liệu **Bán hàng** và **Nhân sự**
theo mô hình hai cấp.

Ngoài phạm vi đợt này: phân quyền riêng cho từng tab, bốn bảng KQKD / Dòng tiền /
Tài sản / Nguồn vốn (chỉ dựng khung "Sắp có"), nhập khẩu Excel, xuất Excel.

## 2. Điều hướng

`/trung-tam-du-lieu/ke-hoach` render `KeHoachTabsPage`. Thanh tab dùng `Segmented`
sticky y như `fe/src/pages/dashboard/Dashboard.tsx`, kèm ô chọn **Năm** bên phải.

| Khoá tab | Nhãn | Nội dung |
|---|---|---|
| `ban-hang` | Bán hàng | `BanHangTab` — bảng nhập liệu đầy đủ |
| `nhan-su` | Nhân sự | `NhanSuTab` — bảng nhập liệu đầy đủ |
| `kqkd` | KQKD | khung "Sắp có" |
| `dong-tien` | Dòng tiền | khung "Sắp có" |
| `tai-san` | Tài sản | khung "Sắp có" |
| `nguon-von` | Nguồn vốn | khung "Sắp có" |
| `chi-tiet` | Chi tiết | `<KeHoachPage loaiKeHoach="KE_HOACH" />` giữ nguyên |

Tab mặc định là `ban-hang`. Tab đang chọn lưu ở `useState` (không cần URL param).

`/trung-tam-du-lieu/du-bao` và `/trung-tam-du-lieu/ke-hoach/tao-moi` **không đổi**.

Khung "Sắp có" là component cục bộ `TabComingSoon` (antd `Result` + `RocketOutlined`),
không dùng `pages/ComingSoon.tsx` vì component đó tra tiêu đề theo `location.pathname`.

## 3. Kỳ kế hoạch

Mỗi năm một bản duy nhất. Ô chọn Năm ở header trang, mặc định năm hiện tại, khoảng
`nămHiệnTại - 3 … nămHiệnTại + 3`. Không có khái niệm phiên bản, không tách
Kế hoạch / Dự báo trong hai bảng mới.

## 4. Tab Bán hàng

Cấp 1 là **nhóm sản phẩm**, cấp 2 là **sản phẩm**. Cả hai cấp chọn từ danh mục
(`/master-data/nhom-san-pham`, `/master-data/san-pham`), không gõ tự do.

### Cột (đúng thứ tự sheet `Bán hàng`)

| Cột | Nguồn |
|---|---|
| Mã | mã sản phẩm, từ danh mục |
| Tên sản phẩm hàng hóa, vật tư | tên sản phẩm, từ danh mục |
| Lượng | **nhập** |
| Giá bình quân | **nhập** |
| Doanh thu | `Lượng × Giá bình quân` |
| % | `Doanh thu dòng ÷ Doanh thu tổng cộng` |
| Q1…Q4 | tổng 3 tháng trong quý |
| T1…T12 | **nhập** |

### Hàng

- **TỔNG CỘNG** — ghim đầu bảng (dòng 2 của sheet), tổng mọi dòng sản phẩm.
- **Hàng nhóm sản phẩm** — tổng các sản phẩm con. Với cột Lượng và Giá bình quân,
  hàng nhóm để trống (cộng lượng khác đơn vị tính là vô nghĩa; cộng giá bình quân
  cũng vậy).
- **Hàng sản phẩm** — dòng dữ liệu thật, sửa được.

Nhóm **không có bản ghi riêng**: nhóm hiện ra vì có sản phẩm thuộc nhóm đó.
Xoá sản phẩm cuối cùng của một nhóm thì nhóm biến mất.

### Ràng buộc

Nếu `tổng T1…T12 ≠ Doanh thu`, ô Doanh thu tô đỏ kèm tooltip nêu số lệch.
Đây là cảnh báo hiển thị, **không chặn lưu**.

Không cho hai dòng trùng `(năm, sản phẩm)` — BE trả 400.

## 5. Tab Nhân sự

Cấp 1 là **bộ phận** (chọn từ danh mục `/master-data/bo-phan`), cấp 2 là **chức vụ**
(gõ tự do).

### Cột (đúng thứ tự sheet `Nhân sự`)

| Cột | Nguồn |
|---|---|
| Mã vị trí | **nhập**, tự do (`GD`, `PGD`, `TROLY`…) |
| Tên chức vụ | **nhập**, tự do — thêm ngoài sheet cho dễ đọc |
| CỘNG | tổng 6 cột chi phí |
| % | `CỘNG dòng ÷ CỘNG tổng cộng` |
| Lương chính | **nhập** (`LCHINH`) |
| Lương KPI | **nhập** (`LUONGKPI`) |
| Thưởng doanh số | **nhập** (`THUONGDS`) |
| Bảo hiểm | **nhập** (`BAOHIEM`) |
| Đào tạo | **nhập** (`DAOTAO`) |
| Thưởng công nhân | **nhập** (`THUONGCN`) |
| Q1…Q4 | tổng 3 tháng trong quý |
| T1…T12 | **nhập** |

Sáu cột chi phí là **cố định**, không cho thêm bớt.

### Hàng

- **TỔNG CỘNG** — ghim đầu bảng, tổng mọi dòng chức vụ.
- **Hàng bộ phận** — tổng các chức vụ con, mọi cột số đều cộng được.
- **Hàng chức vụ** — dòng dữ liệu thật, sửa được.

Bộ phận không có bản ghi riêng, suy ra từ dòng con như bên Bán hàng.

### Ràng buộc

Nếu `tổng T1…T12 ≠ CỘNG`, ô CỘNG tô đỏ kèm tooltip. Cảnh báo, không chặn lưu.

Không cho hai dòng trùng `(năm, bộ phận, mã vị trí)` — BE trả 400.

## 6. Backend

Service: **voucher-service** (cổng 3003), gateway đã proxy `/voucher/*` với
`stripPrefix: true`.

### Entity

`libs/entities/src/voucher/ke-hoach-ban-hang.entity.ts`

```
@Entity('ke_hoach_ban_hang')
class KeHoachBanHang extends BaseEntity {
  nam: number;
  nhomSanPham: { id: string; ma: string; ten: string };
  sanPham:     { id: string; ma: string; ten: string };
  luong: number;
  giaBinhQuan: number;
  thang: number[];      // đúng 12 phần tử, T1…T12
  ghiChu?: string;
  nguoiTaoId: string;
}
```

`libs/entities/src/voucher/ke-hoach-nhan-su.entity.ts`

```
@Entity('ke_hoach_nhan_su')
class KeHoachNhanSu extends BaseEntity {
  nam: number;
  boPhan: { id: string; ma: string; ten: string };
  maViTri: string;
  tenChucVu?: string;
  chiPhi: {
    luongChinh: number; luongKpi: number; thuongDoanhSo: number;
    baoHiem: number; daoTao: number; thuongCongNhan: number;
  };
  thang: number[];      // đúng 12 phần tử
  ghiChu?: string;
  nguoiTaoId: string;
}
```

Cả hai đăng ký qua `libs/entities/src/voucher/index.ts` theo đúng lối `declare module`
đang dùng.

**Không lưu giá trị suy ra** — Doanh thu, CỘNG, quý, %, hàng nhóm, hàng tổng đều tính
lúc đọc. Nguồn sự thật là các ô nhập.

### Module

`apps/voucher-service/src/ke-hoach-bang/` gồm:

```
ke-hoach-bang.module.ts
ban-hang/  ban-hang.controller.ts  ban-hang.service.ts  dto/
nhan-su/   nhan-su.controller.ts   nhan-su.service.ts   dto/
```

Đăng ký vào `VoucherServiceModule`.

### API

| Method | Đường dẫn | Việc |
|---|---|---|
| GET | `/voucher/ke-hoach-ban-hang?nam=2026` | toàn bộ dòng của năm, không phân trang |
| POST | `/voucher/ke-hoach-ban-hang` | thêm dòng |
| PATCH | `/voucher/ke-hoach-ban-hang/:id` | sửa dòng |
| DELETE | `/voucher/ke-hoach-ban-hang/:id` | xoá dòng |

Bốn route tương ứng cho `/voucher/ke-hoach-nhan-su`.

Trả `{ success: true, data: [...] }` cho GET danh sách, `{ success: true, data: {...} }`
cho POST/PATCH, `{ success: true }` cho DELETE — khớp lối `KeHoachService` hiện có.

Số dòng mỗi năm cỡ vài chục nên GET trả hết, không phân trang; FE tính tổng tại chỗ.

### Phân quyền

Chưa làm phân quyền riêng. Dùng lại danh sách vai trò của `ke-hoach.controller.ts`:

- Xem: `ADMIN, KE_TOAN_TRUONG, KE_TOAN_QUY, KE_TOAN_TONG_HOP, MANAGER, KIEM_SOAT`
- Sửa: `ADMIN, KE_TOAN_TRUONG, KE_TOAN_QUY, KE_TOAN_TONG_HOP`

Route FE giữ quyền `/trung-tam-du-lieu/ke-hoach:xem` sẵn có.

### Lọc theo tenant

Mọi truy vấn đi qua `TenantContextService` như `KeHoachService.theoTenant`.

## 7. Frontend

```
fe/src/pages/ke-hoach/tabs/
├── KeHoachTabsPage.tsx        # Segmented + chọn năm + điều phối tab
├── TabComingSoon.tsx
├── ban-hang/
│   ├── BanHangTab.tsx
│   ├── BanHangHandlerContext.tsx
│   ├── handler/ban-hang.handler.ts
│   └── handler/sub-handler/{index.ts,init,row-edit}
├── nhan-su/
│   └── (đối xứng)
└── lib/
    ├── tongHop.ts             # gộp dòng thành cây nhóm + hàng tổng, tính quý/%
    ├── banHangRow.ts
    └── nhanSuRow.ts
```

Theo đúng khuôn CHanlder của `fe/HANDLER_GUIDE.md`: page chỉ ghép sub-component và
gọi sự kiện `init`, mọi logic nằm ở sub-handler đăng ký bằng `@RegisterHandler`.

Service FE: `fe/src/services/keHoachBanHangService.ts` và `keHoachNhanSuService.ts`,
kế thừa `ServiceBase` như các service khác.

### Bảng

antd `Table`, sửa **inline theo dòng** giống Dữ liệu tổng hợp: bấm Sửa trên một dòng
thì các ô nhập của dòng đó thành input, bấm Lưu thì gọi PATCH.

Hàng nhóm và hàng TỔNG CỘNG không có nút thao tác, in đậm, nền nhạt.

**Không ghim cột.** Commit `db51ad9` đã revert đúng việc ghim hai cột đầu ở Dữ liệu
tổng hợp vì vỡ tiêu đề bảng. Bảng cuộn ngang bình thường.

Cột nhóm theo `Table.ColumnGroup`: nhóm "Quý" bọc Q1…Q4, nhóm "Tháng" bọc T1…T12 —
cho dễ đọc khi cuộn ngang.

## 8. Kiểm thử

Logic tổng hợp nằm trong file thuần, không phụ thuộc React:

`fe/src/pages/ke-hoach/tabs/lib/tongHop.test.ts`
- quý = tổng đúng 3 tháng của quý đó
- hàng nhóm = tổng các dòng con
- hàng TỔNG CỘNG = tổng các nhóm
- % tính theo tổng cộng, tổng cộng bằng 0 thì % bằng 0 (không chia cho 0)
- phát hiện lệch giữa tổng 12 tháng và Doanh thu / CỘNG
- dòng thiếu tháng (mảng ngắn hơn 12) coi như 0, không văng lỗi

Backend `ban-hang.service.spec.ts`, `nhan-su.service.spec.ts`:
- GET lọc đúng theo `nam` và `tenantId`
- POST chặn trùng khoá
- PATCH dòng không tồn tại trả 404
- `thang` không đủ 12 phần tử bị DTO chặn

Viết kiểm thử trước phần cài đặt tương ứng.
