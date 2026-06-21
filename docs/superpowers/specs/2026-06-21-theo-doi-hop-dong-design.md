# Thiết kế: Theo dõi Hợp đồng — Trung tâm dữ liệu (Phần 2/3)

- **Ngày:** 2026-06-21
- **Nguồn:** sheet **"Theo dõi HĐ"** trong `Master CEO_QUẢN LÝ HỢP ĐỒNG .xlsx`
- **Route FE:** `/trung-tam-du-lieu/hop-dong` (đang coming-soon → kích hoạt)

## Quyết định (đã chốt)

- **Nhập tay các đợt, tự cộng** — KHÔNG kéo tự động từ sổ quỹ/sổ bán hàng (chưa có cách nối
  giao dịch ↔ hợp đồng; sẽ làm sau nếu cần).
- Đợt thanh toán / hóa đơn: **mảng linh hoạt** (thêm/xóa tùy ý), không cố định 7.
- Còn lại = **(Quyết toán giá trị nếu có, ngược lại Giá trị HĐ) − Đã thanh toán**.

## Mô hình dữ liệu

Entity mới `theo_doi_hop_dong` (1:1 với hợp đồng), trong `master-data-service`.

```
hopDongId      : string         // ref tới hop_dong, unique/tenant
phuTrachHoSo   : string?        // người phụ trách hồ sơ
trangThaiHoSo  : string?        // trạng thái hồ sơ (tự do hoặc theo enum HĐ)
quyetToan      : { so?: string, ngay?: Date, giaTri?: number }   (json)
baoHanhTheoDoi : { giaTri?: number, soNgay?: number, ngayGiaiToaBL?: Date, trangThai?: string } (json)
giamTru        : number?
dotThanhToan   : { tiLe?: number, soTien?: number }[]   (json, mảng)
dotHoaDon      : { soTien?: number }[]                   (json, mảng)
tinhTrangHoSo  : { hd?: boolean, nt1?: boolean, nt2?: boolean, ntSuDung?: boolean, thanhLy?: boolean, namQuyetToan?: number } (json)
ghiChu         : string?
isActive       : boolean (default true)
```

**Tính toán (FE hiển thị; BE cũng cung cấp trong list để dùng cho báo cáo Phần 3):**
- `daThanhToan` = Σ `dotThanhToan[].soTien`
- `daTraHoaDon` = Σ `dotHoaDon[].soTien`
- `conLai` = (`quyetToan.giaTri` ?? `hopDong.giaTriSauThue` ?? 0) − `daThanhToan`

## Backend (`master-data-service`, module `theo-doi-hop-dong`)

Entity + module/controller/service/dto. Routes (prefix giống các module khác):

| Method | Path | Mô tả |
|---|---|---|
| GET | `/theo-doi-hop-dong` | List: join `hop_dong` (active, tenant) + tracking theo `hopDongId`; mỗi dòng gồm thông tin HĐ (số, tên CT, giá trị, năm, chủ đầu tư) + tracking + `daThanhToan/daTraHoaDon/conLai` đã tính. Filter `nam`, `search`. |
| GET | `/theo-doi-hop-dong/:hopDongId` | Lấy bản tracking 1 HĐ (null nếu chưa có). |
| PUT | `/theo-doi-hop-dong/:hopDongId` | Upsert tracking cho 1 HĐ. |
| GET | `/theo-doi-hop-dong/stats` | (tùy chọn) tổng: Σ giá trị, Σ đã TT, Σ còn lại. |

Guard `JwtGuard, RoleGuard` + `@Roles(...)`; trả `{ success: true, ... }`. DTO `class-validator`
(nested validate cho quyetToan/baoHanhTheoDoi/dotThanhToan/dotHoaDon/tinhTrangHoSo).

Service `list()`: lấy toàn bộ hop_dong (tenant, active) + toàn bộ theo_doi_hop_dong → merge theo
`hopDongId` → tính tổng → trả mảng. (In-memory merge, đồng nhất pattern hiện có.)

## Frontend (`fe/`)

- `src/types/index.ts`: types `TheoDoiHopDong`, `TheoDoiHopDongRow` (row đã join + tính tổng).
- `src/services/theoDoiHopDongService.ts`: `getList(params)`, `getByHopDongId(id)`, `upsert(id, data)`.
- `src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx` (antd, theo pattern `SanPhamPage`):
  - Breadcrumb + FilterBar (search + lọc Năm) + thẻ thống kê (Σ giá trị / Σ đã TT / Σ còn lại).
  - **Bảng**: Số HĐ · Năm · Tên CT · Giá trị · Quyết toán · Đã thanh toán · Đã trả hóa đơn ·
    Còn lại · Trạng thái hồ sơ · Phụ trách → nút **"Theo dõi"**.
  - **Drawer editor** (rộng) cho 1 HĐ:
    - Thông tin HĐ (chỉ đọc, từ danh mục): Số, Tên CT, Giá trị, Chủ đầu tư.
    - Form: Phụ trách hồ sơ, Trạng thái hồ sơ; Quyết toán (số/ngày/giá trị); Bảo hành theo dõi
      (giá trị/số ngày/ngày giải tỏa BL/trạng thái); Giảm trừ.
    - **Bảng Đợt thanh toán** (Tỉ lệ % + Số tiền, thêm/xóa dòng) — antd Form.List/Table editable.
    - **Bảng Đợt hóa đơn** (Số tiền, thêm/xóa dòng).
    - **Tình trạng hồ sơ**: checkbox HĐ / NT1 / NT2 / NT đưa vào sử dụng / Thanh lý + ô Năm QT.
    - Ghi chú.
    - Hiển thị (read-only, tự tính): Đã thanh toán, Đã trả hóa đơn, Còn lại.
    - Lưu → `upsert(hopDongId, data)` → reload list.
- Route trong `App.tsx`: `/trung-tam-du-lieu/hop-dong` → `QuanLyHopDongPage` (ProtectedRoute).
- `MainLayout.tsx`: thêm `/trung-tam-du-lieu/hop-dong` vào `existingRoutes` (mục "Quản lý Hợp đồng"
  đã có sẵn trong menu → thành active).
- `routePermissions.ts`: thêm route.

## Ngoài phạm vi
- Không kéo tự động từ sổ quỹ / sổ bán hàng (nhập tay).
- Không làm Phần 3 (Báo cáo HĐ) — sẽ dùng dữ liệu này để tổng hợp ở phần sau.

## Phụ thuộc
- Dùng `hop_dong` (Phần 1, đã có `nam`, giá trị, chủ đầu tư).
