# Siết quyền cấu hình Mẫu in (admin/superAdmin)

**Ngày:** 2026-06-25
**Branch:** `feat/siet-quyen-mau-in`

## Bối cảnh

Tính năng "Mẫu in" (cấu hình template HTML cho phiếu) hiện **không có bất kỳ
kiểm soát quyền nào**:

- **FE:** nút "Mẫu in" hiển thị cho mọi user xem được trang (chứng từ Phiếu
  thu/chi và Kho nhập/xuất/chuyển).
- **BE:** controller `phieu-template` có khai báo `@Roles(...)` nhưng
  `RoleGuard` là stub no-op (`canActivate() { return true }`), nên chỉ còn
  `JwtGuard` → bất kỳ user đăng nhập nào cũng GET/PUT/DELETE được mẫu in.

## Mục tiêu

Chỉ **admin** (`vaiTro === 'ADMIN'`) và **superAdmin** (`isSuperAdmin` /
`vaiTro === 'SUPER_ADMIN'`) được **cấu hình** mẫu in (xem trước/sửa/lưu/xoá).
Việc **tải mẫu để in** vẫn mở cho mọi user xem được trang.

## Nguyên tắc thiết kế

- **GET giữ mở:** `init.handler.ts` gọi `getByLoai()` mỗi lần vào trang để nạp
  mẫu đã lưu cho việc IN. Nếu khoá GET, user thường sẽ mất mẫu tuỳ chỉnh khi in.
  → chỉ siết PUT/DELETE.
- **Kiểm tra bằng `vaiTro`, không dùng mảng `permissions`:** có login path ký
  JWT với `permissions: []` (xem `auth-service.service.ts`), nên mảng quyền
  trong token không đáng tin. `vaiTro` luôn có trong JWT.
- **Không sửa `RoleGuard` no-op toàn cục:** nó được share; biến nó thành thật
  sẽ kích hoạt `@Roles` trên mọi controller đã khai báo → rủi ro hồi quy.
  Thay vào đó tạo guard chuyên biệt, áp riêng cho endpoint cần.
- **Chốt chặn thật ở BE:** FE chỉ ẩn UI; AdminGuard mới là lớp bảo vệ thật.

## Mô hình nhận diện admin

| Vai trò    | JWT `vaiTro`  | FE          |
|------------|---------------|-------------|
| superAdmin | `SUPER_ADMIN` | `isSuperAdmin === true` |
| admin tenant | `ADMIN`     | `vaiTro === 'ADMIN'` |

- **BE check:** `user.vaiTro ∈ {'ADMIN','SUPER_ADMIN'}`
- **FE check:** `user?.isSuperAdmin === true || user?.vaiTro === 'ADMIN'`

## Thay đổi Backend

1. **Guard mới** `be/libs/auth/src/guards/admin.guard.ts` (`AdminGuard`):
   theo khuôn `super-admin.guard.ts`; cho qua nếu `vaiTro ∈ {ADMIN,SUPER_ADMIN}`,
   ngược lại ném `ForbiddenException`; không có user → `ForbiddenException`.
   Export trong `be/libs/auth/src/guards/index.ts`.
2. **`phieu-template.controller.ts`:**
   - `GET :loai` — bỏ `@Roles` (dead), giữ mở qua `JwtGuard`.
   - `PUT :loai` & `DELETE :loai` — `@UseGuards(JwtGuard, AdminGuard)`, bỏ `@Roles`.
   - Dọn import `RoleGuard`, `Roles` nếu không còn dùng.
3. **Test** `admin.guard.spec.ts`: admin pass, superAdmin pass, role khác →
   Forbidden, no user → Forbidden.

Một thay đổi BE này phủ cả phiếu chứng từ lẫn kho (Kho dùng chung endpoint
`/config/phieu-template/:loai` với `loai = KHO_NHAP|KHO_XUAT|KHO_CHUYEN`).

## Thay đổi Frontend

1. **Hook mới** `fe/src/hooks/useIsAdmin.ts`:
   `return user?.isSuperAdmin === true || user?.vaiTro === 'ADMIN'`.
2. **`fe/src/pages/chung-tu/phieu/components/filter/FilterBar.tsx`:** bọc nút
   "Mẫu in" trong `{isAdmin && (...)}`.
3. **`fe/src/pages/kho/_shared/PhieuKhoListPage.tsx`:** bọc nút "Mẫu in" trong
   `{isAdmin && (...)}`.

## Kiểm thử / nghiệm thu

- BE: `admin.guard.spec.ts` xanh; `yarn build` config-service & auth lib OK.
- FE: `npm run build` + `npm run lint` OK.
- Thủ công: user thường không thấy nút "Mẫu in"; gọi PUT/DELETE trực tiếp → 403;
  admin/superAdmin cấu hình bình thường; user thường vẫn in được với mẫu đã lưu.
