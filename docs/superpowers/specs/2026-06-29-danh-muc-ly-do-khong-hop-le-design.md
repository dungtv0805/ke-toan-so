# Danh mục "Lý do không hợp lệ" + chọn lý do khi kiểm soát đánh giá

Ngày: 2026-06-29

## Mục tiêu
1. Thêm danh mục **"Lý do không hợp lệ"** (CRUD phẳng: mã, tên, mô tả, active) — nhân bản theo
   danh mục mẫu "Đơn vị tính".
2. Trong popover **Kiểm soát hạch toán** (KiemSoatCell, Nhật ký chung), khi trạng thái
   "Không được trừ" → cho **chọn Lý do** từ danh mục này (Select), lưu vào `kiemSoat.lyDo`.

## Phần A — Danh mục Lý do không hợp lệ (nhân bản don-vi-tinh)

Route: `/danh-muc/ly-do-khong-hop-le`. Tên hiển thị: "Lý do không hợp lệ".

### BE master-data-service
- Entity `be/libs/entities/src/master-data/ly-do-khong-hop-le.entity.ts` (`@Entity('ly_do_khong_hop_le')`,
  extends BaseEntity, fields: `ma`, `ten`, `moTa?`, `isActive=true`). Đăng ký import+export ở
  `be/libs/entities/src/master-data/index.ts`.
- Module/Controller/Service `be/apps/master-data-service/src/ly-do-khong-hop-le/`:
  - controller prefix `'ly-do-khong-hop-le'` (gateway strip /master-data); routes như don-vi-tinh
    (GET `/`, `/all`, `/search`, `/check-ma`, GET `/:id`, POST, PUT `/:id`, DELETE `/:id`).
  - service: tenant filter, check trùng mã, soft delete (isActive=false), `findAll()` trả active.
  - DTO create/update (PartialType) như don-vi-tinh.
- Đăng ký module + entity vào `master-data-service.module.ts` (4 chỗ giống don-vi-tinh:
  import module, import entity, DatabaseModule.forFeature, @Module imports).

### Gateway: KHÔNG đổi (đã có prefix /master-data).

### FE
- Service `fe/src/services/lyDoKhongHopLeService.ts` (extends ServiceBase, endpoint
  `/master-data/ly-do-khong-hop-le`): getPaginated/getAll/getById/create/update/remove/search/checkMaExists.
  Export `lyDoKhongHopLeService`. Type `LyDoKhongHopLe { id; ma; ten; moTa?; isActive }`.
- Trang CRUD `fe/src/pages/danh-muc/ly-do-khong-hop-le/LyDoKhongHopLePage.tsx` — nhân bản
  DonViTinhPage (Table + Modal + Form + zod), `usePagePermission("/danh-muc/ly-do-khong-hop-le")`.

### Wiring 7 chỗ (BẮT BUỘC, theo learnings)
- `fe/src/pages/loadable.tsx`: export `LyDoKhongHopLePage = loadable(()=>import('./danh-muc/ly-do-khong-hop-le/LyDoKhongHopLePage'))`.
- `fe/src/App.tsx`: import + `<Route path="ly-do-khong-hop-le" element={<ProtectedRoute requiredPermission="/danh-muc/ly-do-khong-hop-le:xem"><LyDoKhongHopLePage/></ProtectedRoute>} />`.
- `fe/src/components/layout/MainLayout.tsx`: thêm `"/danh-muc/ly-do-khong-hop-le"` vào `existingRoutes`
  + `getMenuItem("Lý do không hợp lệ", "/danh-muc/ly-do-khong-hop-le", <icon/>)` trong nhóm Danh mục.
- `fe/src/config/menuCatalog.ts`: `{ key:'/danh-muc/ly-do-khong-hop-le', label:'Lý do không hợp lệ', parentLabel:'Danh mục' }`.
- `fe/src/config/routePermissions.ts`: `'/danh-muc/ly-do-khong-hop-le': '/danh-muc/ly-do-khong-hop-le:xem'`.
- `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`: thêm node `{ key:'/danh-muc/ly-do-khong-hop-le', label:'Lý do không hợp lệ' }` vào children "Danh mục".
- `be/apps/master-data-service/src/tenant/tenant.service.ts` `PERMISSION_MODULES`: thêm `'/danh-muc/ly-do-khong-hop-le'`.

> Sau deploy phải cấp quyền cho role "Admin" đã tồn tại ($addToSet vào phan_quyen) + đăng nhập lại
> (theo skill db-deploy). Ghi nhớ ở bước deploy, KHÔNG làm trong code.

## Phần B — Chọn lý do khi kiểm soát

- FE type `fe/src/types/index.ts` `KiemSoatChungTu`: thêm `lyDo?: string`.
- `fe/src/pages/chung-tu/nhat-ky-chung/components/KiemSoatCell.tsx`:
  - State `lyDo`, load options 1 lần qua `lyDoKhongHopLeService.getAll()` (chỉ load khi mở popover,
    cache trong component để tránh gọi lặp).
  - Khi `trangThai === 'KHONG_DUOC_TRU'`: hiển thị Select "Lý do không hợp lệ" (allowClear,
    showSearch, options từ danh mục, **value = ten**), đặt trên ô "Ý kiến phê duyệt".
  - Lưu `kiemSoat.lyDo = lyDo` khi save (chỉ set khi KHONG_DUOC_TRU). Sync lại từ entry khi mở.
- BE: kiểm tra entity/DTO chứa `kiemSoat` của Nhật ký chung (voucher-service, NhatKyChung). Nếu
  `kiemSoat` lưu dạng sub-document có schema/validator → thêm field `lyDo?: string`; nếu lưu JSON
  tự do (không validate) → không cần đổi BE. PHẢI verify, đừng đoán.

## Quyết định
- `lyDo` lưu **tên lý do** (string) như snapshot đánh giá (giống `yKien`), không tham chiếu id —
  đơn giản, hiển thị thẳng, không vỡ nếu danh mục đổi sau này.
- Không đổi logic tổng hợp chi phí không được trừ (lyDo chỉ là thông tin, không ảnh hưởng số tiền).

## Kiểm thử / hoàn tất
- BE: `npx nest build master-data-service` (+ voucher-service nếu có sửa) sạch.
- FE: `npm run build` + `npm run lint` sạch.
- Deploy: master-data-service (+ voucher-service nếu sửa) + FE; cấp quyền Admin cho route mới + đăng nhập lại.
- Smoke: tạo vài lý do trong danh mục; ở Nhật ký chung mở Kiểm soát → "Không được trừ" → chọn được lý do, lưu, mở lại thấy đúng.
