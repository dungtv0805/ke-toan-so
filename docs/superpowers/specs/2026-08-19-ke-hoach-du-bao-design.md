# Kế hoạch & Dự báo — thiết kế

Ngày: 2026-08-19

## Mục tiêu

Mở hai trang đang "coming soon" (`/trung-tam-du-lieu/ke-hoach`, `/trung-tam-du-lieu/du-bao`)
thành một module nhập liệu kế hoạch có cấu trúc **giống hệt "Dữ liệu tổng hợp"**
(`/chung-tu/nhat-ky-chung`), rồi chạy báo cáo tổng hợp trên số kế hoạch và **so sánh với
thực hiện**. Đích cuối: 3 gauge "Tình hình thực hiện doanh thu / chi phí / lợi nhuận" ở
Tổng quan có số thật (hiện đang hard-code 0).

## 17 cột của bảng nhập liệu

| # | Cột | Nguồn dữ liệu |
|---|-----|----------------|
| 1 | Ngày phát sinh | `ngay` |
| 2 | Nghiệp vụ | `danhMuc.nghiepVu` |
| 3 | Diễn giải | `noiDung` |
| 4 | TK Nợ | `danhMuc.taiKhoanNo` |
| 5 | TK Có | `danhMuc.taiKhoanCo` |
| 6 | Số tiền | `soTien` |
| 7 | ĐT Nợ | `danhMuc.doiTuong` |
| 8 | ĐT Có | `danhMuc.doiTuong2` |
| 9 | Chủ đầu tư | `danhMuc.chuDauTu` |
| 10 | Dự án | `danhMuc.duAn` |
| 11 | Sản phẩm | `danhMuc.sanPham` |
| 12 | Bộ phận | `danhMuc.boPhan` |
| 13 | Đội | `danhMuc.doi` |
| 14 | Nhân viên | `danhMuc.nhanVien` |
| 15 | Dòng tiền | `danhMuc.dongTien` |
| 16 | Nhóm khoản mục | `danhMuc.khoanMuc.nhom` — **suy từ Khoản mục, chỉ hiển thị** |
| 17 | Nhóm quản lý | `danhMuc.nhomQuanLy` |

Cột **Khoản mục** được thêm vào lưới (ẩn/hiện được) vì cột 16 phụ thuộc nó; nếu không
chọn Khoản mục thì cột 16 trống. Quyết định này ghi lại để sau muốn nhập Nhóm khoản mục
độc lập thì chỉ cần thêm `danhMuc.nhomKhoanMuc` chứ không phải sửa cấu trúc.

## Mô hình dữ liệu

Collection mới `ke_hoach` trong **voucher-service** (không dùng chung `chung_tu` để mọi
query/báo cáo hiện có không phải thêm filter, tránh lẫn số kế hoạch vào số thực tế).

`be/libs/entities/src/voucher/ke-hoach.entity.ts` — `KeHoachDong extends BaseEntity`:

- `loaiKeHoach: 'KE_HOACH' | 'DU_BAO'` — hai route dùng chung code, khác giá trị này
- `phienBan: string` — nhiều bản cho cùng kỳ ("KH 2026 gốc", "KH điều chỉnh Q3"); mặc định `"Mặc định"`
- `ngay: Date`, `noiDung: string`, `soTien: number`, `ghiChu?: string`
- `danhMuc: DanhMuc` — **dùng lại nguyên interface của `ChungTu`**
- `nguoiTaoId: string`; `tenantId` do `TenantSubscriber` tự gắn

Không mang sang: `soPhieu`, `hoSoChungTu`, `kiemSoat`, hóa đơn — vô nghĩa với kế hoạch.

## API (voucher-service; gateway proxy theo prefix `/voucher`, không cần khai báo thêm)

CRUD: `GET /voucher/ke-hoach`, `POST`, `POST batch`, `POST import`, `PATCH :id`,
`PATCH batch`, `DELETE :id`, `POST delete-batch` — tham số lọc bám `NhatKyChungQueryDto`,
thêm `loaiKeHoach` và `phienBan`.

- `GET /voucher/ke-hoach/phien-ban` — danh sách phiên bản đã dùng
- `GET /voucher/ke-hoach/summary/:type` — tổng hợp kế hoạch theo 9 chiều, dùng lại
  `buildSummaryAggregation`
- `GET /voucher/ke-hoach/so-sanh?type=&startDate=&endDate=&loaiKeHoach=&phienBan=` —
  `[{ key, ten, keHoach, thucHien, chenhLech, tyLeDat }]`, gom `ke_hoach` và `chung_tu`
  bằng **cùng một hàm gom** rồi merge theo **mã** (không theo tên)
- `GET /voucher/ke-hoach/series?year=&month=&loaiKeHoach=&phienBan=` —
  `[{ thang, doanhThu, chiPhi, loiNhuan }]`, **đúng shape `pnl-series`** của
  reporting-service. Quy tắc: doanh thu = phát sinh Có TK `5*`, chi phí = phát sinh Nợ
  TK `6*` (khớp `bao-cao.service.ts`).

## Frontend

`fe/src/pages/ke-hoach/` theo pattern CHanlder, một component cho cả 2 route (prop `loai`).

- Lưới 17 cột, sửa tại chỗ. `EditableCell` của NKC gắn chặt vào handler-context và kiểu
  `NhatKyChung` của trang đó nên KHÔNG tái sử dụng được; lưới kế hoạch tự render ô nhập
  ngay trong cột (chỉ một dòng ở chế độ sửa tại một thời điểm). Gộp chung về sau vẫn mở.
- Thanh lọc: khoảng ngày, Phiên bản, và các chiều như NKC
- Thêm dòng / nhân bản / xóa hàng loạt / Import Excel (đọc cột theo VỊ TRÍ như file mẫu,
  các chiều nhập theo mã danh mục, xem trước lỗi từng dòng rồi mới ghi)
- Ngày phát sinh luôn lưu 00:00 UTC của đúng ngày (`ngayLuu`) — lưu nửa đêm giờ VN sẽ
  đẩy dòng ngày 01 sang tháng trước khi BE gom series
- Dropdown view: *Dòng kế hoạch* → *So sánh theo TK / Khoản mục / Dự án / Đội / Nhân viên /
  Sản phẩm / Chủ đầu tư / Dòng tiền / Nhóm quản lý*, mỗi view 4 cột
  **Kế hoạch – Thực hiện – Chênh lệch – % đạt**

### 3 gauge ở Tổng quan

`ExecutionStatusCharts.tsx` nhận `year/startMonth/endMonth`:
- Thực hiện ← `pnl-series` (cùng nguồn với KPI "Kết quả kinh doanh" trên cùng trang)
- Kế hoạch ← `/voucher/ke-hoach/series?loaiKeHoach=KE_HOACH`
- Chênh lệch = TH − KH; % đạt = TH/KH×100; KH = 0 → 0% và ghi "chưa có kế hoạch"
- Gauge chi phí: vượt kế hoạch là xấu → đổi màu khi > 100%

## Wiring bắt buộc

`fe/src/App.tsx` (2 route), `fe/src/pages/loadable.tsx`, `fe/src/config/routePermissions.ts`,
`fe/src/components/layout/MainLayout.tsx` (`existingRoutes`).
`menuCatalog.ts` và cây quyền `permissionModules.ts` **đã có sẵn** 2 key này.
Sau deploy: `$addToSet` quyền mới cho role Admin của từng tenant.

## Kiểm thử

- voucher-service: unit test cho hàm gom so sánh (khớp mã, mã có ở KH mà không có ở TH và
  ngược lại, trùng tên khác mã, chia 0) và hàm dựng series theo tháng
- FE: map dòng ↔ danh mục (`keHoachRow`), đọc sheet import (`parseKeHoachSheet`),
  và map dữ liệu gauge (% đạt, chênh lệch, KH = 0)
- Repo có test đỏ sẵn từ trước → chạy hẹp theo đường dẫn `ke-hoach`

## Không làm ở giai đoạn này

Rải kế hoạch năm → tháng tự động; quy trình duyệt/khóa kế hoạch; so sánh cùng kỳ năm trước.
