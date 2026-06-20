# Thiết kế: Phân hệ Kho (Danh mục + Phiếu Nhập/Xuất/Chuyển + In)

- **Ngày:** 2026-06-20
- **Phạm vi:** MVP — lập và in phiếu kho. CHƯA làm tồn kho.
- **Trạng thái:** Đã duyệt thiết kế, chờ review spec.

## 1. Mục tiêu

Bổ sung phân hệ Kho gồm:

1. **4 danh mục** mới: Kho, Hàng hóa vật tư, Đơn vị tính, Nhóm vật tư.
2. **3 loại phiếu kho**: Nhập kho, Xuất kho, Chuyển kho — lưu lại và **in theo mẫu** (giống phiếu thu/chi).

**Ngoài phạm vi (làm sau):** tồn kho, thẻ kho, báo cáo Nhập–Xuất–Tồn, giá bình quân cuối kỳ (BQCK), đính kèm file, "gợi ý hồ sơ" AI, tích hợp reporting/dữ liệu tổng hợp.

## 2. Quyết định kiến trúc (đã chốt)

| Vấn đề | Quyết định | Lý do |
|---|---|---|
| Tồn kho | Không làm ở MVP | Chỉ cần lập + in phiếu |
| 4 danh mục | `master-data-service` (3002) | Đồng nhất với các danh mục khác (san-pham...) |
| Phiếu kho | `kho-service` mới, port **3008** | Mỗi nghiệp vụ = 1 service; dễ mở rộng tồn kho/feed reporting sau |
| Kiến trúc FE | Trang antd đơn giản (như `SanPhamPage`) | Nhẹ, nhanh, hợp MVP; không dùng khung CHanlder |
| In phiếu | Tái dùng cơ chế template phiếu thu/chi | Mẫu mặc định 01-VT / 02-VT / 03XKNB3 + cho upload mẫu riêng |
| Sidebar | Nhóm **KHO** mới cho 3 phiếu; 3 danh mục thêm vào nhóm Danh mục | Rõ ràng, dễ mở rộng |

## 3. Phần A — 4 Danh mục (master-data-service + FE)

Mỗi danh mục: 1 entity (`libs/entities/src/master-data/`) + module/controller/service/dto trong
`apps/master-data-service/src/<ten>/` (copy pattern `san-pham`), 1 service FE
(`fe/src/services/`), 1 type (`fe/src/types`), 1 trang antd (`fe/src/pages/danh-muc/<ten>/`).

Tất cả entity kế thừa `BaseEntity` và có `isActive` (default true). Trường có `?` là nullable.

### A1. Kho — collection `kho`, route `/master-data/kho`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| ma | string | Mã kho, bắt buộc, unique theo tenant |
| ten | string | Tên kho, bắt buộc |
| diaChi | string? | Địa chỉ kho |
| thuKho | string? | Tên thủ kho |
| moTa | string? | |

### A2. Đơn vị tính — collection `don_vi_tinh`, route `/master-data/don-vi-tinh`
| Trường | Kiểu |
|---|---|
| ma | string |
| ten | string |
| moTa | string? |

### A3. Nhóm vật tư — collection `nhom_vat_tu`, route `/master-data/nhom-vat-tu`
| Trường | Kiểu |
|---|---|
| ma | string |
| ten | string |
| moTa | string? |

### A4. Hàng hóa vật tư — collection `hang_hoa_vat_tu`, route `/master-data/hang-hoa-vat-tu`
| Trường | Kiểu | Ghi chú |
|---|---|---|
| ma | string | Mã, vd `VT000009` |
| ten | string | Tên/nhãn hiệu/quy cách |
| tinhChat | enum | `TAI_SAN` \| `HANG_HOA` \| `NGUYEN_LIEU` (enum để mở rộng: thành phẩm, công cụ...) |
| donViTinhMa | string? | tham chiếu Đơn vị tính (mã) |
| donViTinhTen | string? | snapshot tên ĐVT |
| nhomVatTuMa | string? | tham chiếu Nhóm vật tư (mã) |
| nhomVatTuTen | string? | snapshot tên nhóm |
| quyCach | string? | Quy cách/phẩm chất |
| tkKho | string? | TK kho mặc định (vd 152, 156) — gợi ý TK Nợ/Có khi lập phiếu |
| donGia | number? | Đơn giá tham chiếu |
| moTa | string? | |

FE form `Hàng hóa vật tư`: `tinhChat` = antd Select (3 lựa chọn), `donViTinh` + `nhomVatTu` =
Select nạp từ danh mục tương ứng (lưu cả mã + tên snapshot).

### A5. FE trang danh mục (cho cả 4)
Mỗi trang theo khuôn `SanPhamPage.tsx`: `Breadcrumb` + `FilterBar` (search) + `Table` phân
trang + nút Thêm/Sửa/Xóa (antd `Modal` + `Form` + validate `zod`) + quyền qua
`usePagePermission(<route>)`. Service FE gọi `/master-data/<route>` (phân trang, `/all`, CRUD,
`/stats` nếu cần) — copy `sanPhamService`.

## 4. Phần B — kho-service (BE mới, port 3008)

### B1. Entity `PhieuKho` — collection `phieu_kho` (`libs/entities/src/kho/phieu-kho.entity.ts`)

Một collection chung cho cả 3 loại; denormalize snapshot danh mục (giống `ChungTu`).

```
loaiPhieu     : 'NHAP' | 'XUAT' | 'CHUYEN'
soPhieu       : string   // NK00019 / XK00022 / CK00001 — tự sinh
loaiNghiepVu  : string?  // nhóm nghiệp vụ con (vd 'Mua', 'Khác', 'Bán hàng'...)
ngayHachToan  : Date
ngayChungTu   : Date
soChungTuGoc  : string?
thamChieu     : string?
// Đối tượng (người giao/nhận hàng, khách/NCC)
doiTuongMa    : string?
doiTuongTen   : string?
diaChi        : string?
nguoiGiaoNhan : string?   // "Người giao hàng" (nhập) / "Người nhận" (xuất)
nhanVien      : string?   // nhân viên bán hàng / người lập
dienGiai      : string?   // lý do nhập/xuất, diễn giải
// Kho — NHAP/XUAT: 1 kho ở header; CHUYEN: kho nguồn + đích ở header
khoMa         : string?   // dùng cho NHAP/XUAT
khoTen        : string?
khoXuatMa     : string?   // dùng cho CHUYEN
khoXuatTen    : string?
khoNhapMa     : string?
khoNhapTen    : string?
// Vận chuyển (chỉ CHUYEN, tối giản)
nguoiVanChuyen: string?
hopDongVC     : string?
phuongTienVC  : string?
lenhDieuDong  : string?
veViec        : string?
// Chi tiết
chiTiet       : ChiTietPhieuKho[]
tongTien      : number
tongTienBangChu: string?
trangThai     : 'DRAFT' | 'POSTED'   // default DRAFT; POSTED khi lưu chính thức
```

`ChiTietPhieuKho` (embedded):
```
stt            : number
hangHoaMa      : string
hangHoaTen     : string
quyCach        : string?
donViTinh      : string?
tkNo           : string?
tkCo           : string?
soLuong        : number    // SL chính
soLuongChungTu : number?   // "theo chứng từ" (NHAP — mẫu 01-VT)
soLuongThucTe  : number?   // "thực nhập"/"thực xuất"
donGia         : number
thanhTien      : number    // soLuong * donGia
```

> Phiếu chuyển kho: kho nguồn/đích ở **header** (`khoXuat*`/`khoNhap*`) — khớp mẫu in 03XKNB3.
> Mỗi dòng chi tiết có `soLuongThucTe` đóng vai trò "thực xuất"/"thực nhập".

### B2. Sinh số phiếu
Entity `PhieuKhoSequence` (collection `phieu_kho_sequence`) giống `voucher-sequence`: khóa theo
`(tenant, loaiPhieu)`, tăng dần. Tiền tố: `NHAP→NK`, `XUAT→XK`, `CHUYEN→CK`, số 5 chữ số
(`NK00019`). API `GET /kho/phieu/next-so?loaiPhieu=NHAP` trả số kế tiếp (preview, chốt khi tạo).

### B3. API (controller `kho.controller.ts`, prefix `kho`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/kho/phieu` | List + filter (`loaiPhieu`, khoảng ngày, search, phân trang) |
| GET | `/kho/phieu/:id` | Chi tiết |
| GET | `/kho/phieu/next-so` | Số phiếu kế tiếp theo loại |
| GET | `/kho/phieu/stats` | Thống kê (tổng SL phiếu, tổng tiền) — phục vụ header trang |
| POST | `/kho/phieu` | Tạo (chốt số phiếu) |
| PUT | `/kho/phieu/:id` | Sửa |
| DELETE | `/kho/phieu/:id` | Xóa |

Bảo vệ bằng `JwtGuard` + `RoleGuard` + `@Roles(...)` như các controller hiện có. Trả
`{ success: true, ... }`. DTO `class-validator` cho header + chi tiết (validate mảng lồng nhau).

### B4. Hạ tầng service mới
- App NestJS mới: `apps/kho-service/` (copy cấu trúc 1 service nhỏ, vd `cash-book-service`):
  `main.ts`, `app.module.ts`, `environments/`, đăng ký TypeORM/Mongo + entity `PhieuKho`.
- `nest-cli.json`: thêm project `kho-service`.
- `package.json`: thêm script `start:kho:dev` (port 3008) + thêm vào `start:all:dev`.
- `.env-cmdrc`: thêm block env cho `kho-service` (Mongo URI, port 3008, JWT secret) cho các
  môi trường dev/prod.
- Gateway `apps/gateway/src/environments/environment.ts`: thêm service `kho`
  (`SERVICE_KHO_HOST`/`SERVICE_KHO_PORT`, default 3008) + route `{ pathPrefix: '/kho', service: 'kho', stripPrefix: true }`.

## 5. Phần C — FE phân hệ Kho (`fe/src/pages/kho/`)

3 trang: `nhap-kho/NhapKhoPage.tsx`, `xuat-kho/XuatKhoPage.tsx`, `chuyen-kho/ChuyenKhoPage.tsx`.
Dùng chung component/service trong `fe/src/pages/kho/_shared/` để tránh trùng lặp.

Mỗi trang gồm:
- **Danh sách**: `Breadcrumb` + `FilterBar` (search + lọc khoảng ngày) + `Table` (Số phiếu,
  Ngày, Đối tượng, Diễn giải, Tổng tiền, thao tác Sửa/Xóa/**In**) + nút "Lập phiếu".
- **Editor** (antd `Drawer`/`Modal` to hoặc trang con): form header (các field theo ảnh MISA,
  tối giản) + **bảng chi tiết nhiều dòng** chỉnh sửa inline (antd `Table` editable hoặc
  `Form.List`): các cột Mã hàng (Select nạp từ Hàng hóa vật tư, auto-fill Tên/ĐVT/Đơn giá/TK
  kho), Tên hàng, Kho, TK Nợ, TK Có, ĐVT, Số lượng, Đơn giá, Thành tiền (auto = SL×ĐG). Nút
  Thêm dòng / Xóa dòng. Tổng tiền auto. `tongTienBangChu` tính từ `docTienBangChu`.

Khác biệt theo loại:
- **Nhập kho**: 1 ô Kho (header hoặc cột), người giao hàng; cột SL có thể tách "theo chứng từ"/"thực nhập".
- **Xuất kho**: khách hàng/người nhận, lý do xuất; TK Nợ mặc định gợi ý 632.
- **Chuyển kho**: chọn **Kho xuất** + **Kho nhập** ở header; thêm thông tin vận chuyển (người
  VC, phương tiện, hợp đồng, lệnh điều động, về việc); cột SL = Thực xuất/Thực nhập.

Service FE `fe/src/services/phieuKhoService.ts` gọi `/kho/phieu` (list/CRUD/next-so/stats).
Type `PhieuKho`, `ChiTietPhieuKho` trong `fe/src/types`.

## 6. Phần D — In phiếu (tái dùng cơ chế phiếu thu/chi)

Cơ chế hiện có (`fe/src/pages/chung-tu/phieu/lib/`): `printPhieu(phieu, template, ctx)` dựng HTML
từ template có placeholder; `printTemplates.ts` chứa mẫu mặc định theo loại; `TemplateModal`
cho upload mẫu riêng; tiện ích `docTienBangChu`, `format`.

Kế hoạch:
- Tạo `fe/src/pages/kho/_shared/print/`:
  - `khoPrintTemplates.ts` — 3 mẫu mặc định:
    - **01-VT** Phiếu nhập kho (theo ảnh: header công ty + Mẫu số, Nợ/Có, người giao, "nhập tại
      kho", bảng STT/Tên-quy cách/Mã số/ĐVT/SL(theo chứng từ|thực nhập)/Đơn giá/Thành tiền,
      dòng Cộng, tổng bằng chữ, 4 chữ ký: Người lập / Người giao hàng / Thủ kho / Kế toán trưởng).
    - **02-VT** Phiếu xuất kho (tương tự, cột SL: yêu cầu|thực xuất; chữ ký: Người lập / Người
      nhận / Thủ kho / Kế toán trưởng).
    - **03XKNB3/001** Phiếu xuất kho kiêm vận chuyển nội bộ (theo ảnh: "Căn cứ lệnh điều động
      số...", người vận chuyển, phương tiện, Xuất tại kho/Nhập tại kho ở header, bảng SL: Thực
      xuất|Thực nhập, 4 chữ ký: Người lập / Thủ kho xuất / Người vận chuyển / Thủ kho nhập).
  - `printKhoPhieu.ts` — hàm in (tách khỏi context, nhận `phieu`, `template`, `{tenCongTy, diaChiCongTy}`),
    tái dùng `docTienBangChu` + `format` từ module phiếu thu/chi.
  - `usePrintKhoPhieu.ts` — hook lấy template (mặc định theo loại, hoặc mẫu upload) + tenant.
- Cho phép upload mẫu riêng bằng cách tái dùng `TemplateModal` (tùy chọn ở MVP; tối thiểu là mẫu
  mặc định).

> Nếu `docTienBangChu`/`format` chưa export dùng chung được, tách sang `fe/src/lib/` để cả phiếu
> thu/chi và kho cùng import (refactor tối thiểu, không đổi hành vi).

## 7. Phần E — Định tuyến, Sidebar, Phân quyền

### Routes FE (router + `routePermissions.ts`)
- Danh mục: `/danh-muc/kho`, `/danh-muc/hang-hoa-vat-tu`, `/danh-muc/don-vi-tinh`, `/danh-muc/nhom-vat-tu`
- Phiếu kho: `/kho/nhap-kho`, `/kho/xuat-kho`, `/kho/chuyen-kho`

### Sidebar
- Nhóm **Danh mục**: kích hoạt mục "Kho" (đang coming-soon) + thêm "Hàng hóa vật tư", "Đơn vị
  tính", "Nhóm vật tư".
- Nhóm **KHO** mới: "Nhập kho", "Xuất kho", "Chuyển kho".

### Phân quyền
Thêm 7 route mới vào `routePermissions.ts` với nhóm quyền phù hợp (mặc định theo các route danh
mục/chứng từ hiện có: ADMIN, KE_TOAN_TRUONG, KE_TOAN_TONG_HOP, KE_TOAN_QUY...).

## 8. Cập nhật context/tài liệu
- `.claude/context/active-pages.md`: cập nhật trạng thái 7 trang mới (ACTIVE) + service map.
- `.claude/context/be-api-map.md`: thêm endpoint kho-service (3008) + 4 danh mục mới (3002).
- `.claude/context/service-communication.md`: ghi nhận service mới + gateway route nếu cần.

## 9. Thứ tự triển khai đề xuất
1. **BE danh mục** (4 entity + module + dto) trong master-data-service.
2. **FE danh mục** (4 trang + service + type + route + sidebar + quyền).
3. **BE kho-service** (entity + sequence + controller + dto + hạ tầng app/gateway/env).
4. **FE phiếu kho** (3 trang list + editor + service + type + route + sidebar nhóm KHO + quyền).
5. **In** (3 mẫu mặc định + printKhoPhieu + hook + nút In ở danh sách).
6. Cập nhật context docs.

## 10. Rủi ro & lưu ý
- **Service mới = hạ tầng deploy mới**: cần thêm container/PM2 cho kho-service khi deploy (phối
  hợp `/db-deploy`). Gateway phải biết host/port qua env.
- **Bảng chi tiết editable** là phần FE phức tạp nhất; ưu tiên antd `Table` với cell editable +
  auto-tính thành tiền/tổng.
- **Snapshot danh mục** trong phiếu: lưu cả mã + tên để in không phụ thuộc danh mục thay đổi sau.
- Giữ MVP: không chặn nghiệp vụ theo tồn (cho nhập/xuất tự do), không tính giá xuất.
