# Thiết kế: Sổ Thu tiền + HĐ bán ra + Theo dõi HĐ tự cộng (Phần 4)

- **Ngày:** 2026-06-21
- **Nguồn:** sheet **"Thu tiền"** + **"HĐ BÁN RA"** trong file Excel; chú thích Excel ghi rõ
  "Đã thanh toán = Tự động tổng theo sổ quỹ (Thu tiền)", "Đã trả hóa đơn = Tự động tổng theo sổ
  bán hàng (HĐ Bán ra)".
- **Mục tiêu:** làm sát Excel — tách phần nhập tiền ra **sổ riêng** gắn mã HĐ, Theo dõi HĐ tự cộng.

## Mô hình dữ liệu (master-data-service)

### Entity `thu_tien_hop_dong` (sheet "Thu tiền")
```
nam?           : number
hopDongId      : string   // ref hop_dong
soHopDong      : string   // snapshot
doiTuongId?    : string   // khách hàng (đối tượng)
tenKhachHang?  : string   // snapshot
noiDung?       : string
soTien         : number
ngay?          : Date
lan?           : number   // thanh toán lần mấy
ghiChu?        : string
isActive       : boolean
```

### Entity `hoa_don_ban_ra` (sheet "HĐ BÁN RA")
```
soHoaDon?      : string
ngay?          : Date
noiDung?       : string
hopDongId      : string   // ref hop_dong
soHopDong      : string   // snapshot
tenCongTrinh?  : string   // snapshot
doiTuongId?    : string
donViMua?      : string   // snapshot tên đơn vị mua
tienHang?      : number
tienThue?      : number
tong?          : number   // = tienHang + tienThue
lan?           : number   // hóa đơn lần mấy
nam?           : number   // năm HĐ
namHoaDon?     : number
isActive       : boolean
```

## Backend

- Module `thu-tien-hop-dong`: CRUD (`GET /master-data/thu-tien-hop-dong?hopDongId=&nam=&search=`,
  `POST`, `PUT/:id`, `DELETE/:id`). Snapshot soHopDong/tenKhachHang khi tạo.
- Module `hoa-don-ban-ra`: CRUD tương tự (`/master-data/hoa-don-ban-ra`).
- **Sửa `theo-doi-hop-dong.service`** (inject thêm repo ThuTienHopDong + HoaDonBanRa):
  - `daThanhToan(hopDongId)` = Σ `thu_tien.soTien` theo hopDongId.
  - `daTraHoaDon(hopDongId)` = Σ `hoa_don.tong` theo hopDongId.
  - `conLai` = (quyetToan.giaTri ?? giaTriSauThue) − daThanhToan. (giữ công thức)
  - `list()` / `baoCao()` dùng tổng từ 2 sổ này thay vì `tracking.dotThanhToan/dotHoaDon`.
  - Entity `theo_doi_hop_dong` giữ nguyên (dotThanhToan/dotHoaDon không còn dùng để tính tổng;
    không migrate — chỉ ngừng dùng).
- Wire 2 entity + 2 module vào `master-data-service.module.ts`; thêm 2 entity vào
  forFeature của `TheoDoiHopDongModule`.

## Frontend

- types: `ThuTienHopDong`, `HoaDonBanRa`.
- services: `thuTienHopDongService`, `hoaDonBanRaService` (CRUD, endpoint `/master-data/...`).
- **Trang `SoThuTienPage`** (`/trung-tam-du-lieu/thu-tien-hop-dong`): bảng (Năm · Số HĐ · Tên KH ·
  Nội dung · Số tiền · Ngày · Lần) + modal thêm/sửa (chọn HĐ từ danh mục → auto soHopDong + gợi ý
  khách hàng/năm; chọn khách hàng; nhập số tiền/ngày/lần/nội dung). Lọc theo HĐ/năm/search.
- **Trang `SoHoaDonBanRaPage`** (`/trung-tam-du-lieu/hd-ban-ra`): bảng (Số HĐ-hóa đơn · Ngày · HĐ ·
  Tên CT · Đơn vị mua · Tiền hàng · Tiền thuế · Tổng · Lần) + modal (chọn HĐ → snapshot; nhập
  tiền hàng + thuế → tổng auto).
- **Sửa `QuanLyHopDongPage`** (Theo dõi HĐ): **bỏ 2 bảng nhập đợt thanh toán/hóa đơn**; thay bằng
  hiển thị **Đã thanh toán / Đã trả hóa đơn (read-only, tự cộng)** + danh sách read-only các khoản
  thu / hóa đơn của HĐ đó (kéo từ 2 sổ). Giữ nhập tay: Quyết toán, Bảo hành theo dõi, Giảm trừ,
  Tình trạng hồ sơ, Ghi chú, Phụ trách.
- Sidebar (Trung tâm dữ liệu): thêm "Thu tiền HĐ" + "Hóa đơn bán ra"; route + permissions +
  existingRoutes.

## Ngoài phạm vi
- Cụm Kiểm soát chi phí (Dự toán/Thực hiện/Kiểm soát/Chi phí/Vật tư) — làm sau.
- Không kéo từ sổ quỹ/voucher tổng quát; Thu tiền là sổ riêng gắn HĐ (đúng cấu trúc Excel).
