# Quản lý thành viên: sửa họ tên/email + reset mật khẩu

**Ngày:** 2026-06-23
**Trang:** Cấu hình → Thành viên (`fe/src/pages/cau-hinh/thanh-vien/ThanhVienPage.tsx`)

## Mục tiêu

Bổ sung cho trang quản lý thành viên 3 khả năng còn thiếu:

1. Sửa **họ tên** của thành viên.
2. Sửa **email** của thành viên.
3. **Reset mật khẩu** thành viên về mặc định (`123456`) — thao tác của admin, không cần nhập mật khẩu mới.

Hiện tại modal "Sửa" chỉ cho đổi vai trò; không có cách đổi tên/email; không có chức năng admin reset mật khẩu (chỉ có người dùng tự đổi qua `/auth/change-password`).

## Phạm vi & quyết định

- **Quyền:** Admin của tenant. Gate ở FE bằng `hasPermission('/cau-hinh/thanh-vien:sua')` (theo đúng pattern các thao tác member hiện có). BE giữ `JwtGuard` như `updateMember`/`removeMember` đang dùng.
  - Lý do không dùng `TenantAdminGuard`: guard này check `role === 'ADMIN'` (viết hoa) trong khi role thực tế là `'Admin'` → lệch tên, không khớp dữ liệu. Không đưa vào phạm vi này.
- **Reset:** chỉ reset về mật khẩu mặc định `123456` (không có ô nhập mật khẩu tùy ý).
- **Vị trí nút Reset:** icon riêng trong cột "Thao tác", có `Popconfirm` xác nhận.

## Hướng triển khai

Làm gọn trong `master-data-service/tenant` — service này đã có sẵn `userRepository` + `credentialRepository`, và trang đang gọi chính các API `master-data/tenants/:id/members`. Không cần gọi chéo sang `auth-service` hay `config-service`.

## Backend — `be/apps/master-data-service/src/tenant/`

### DTO (`be/libs/dto/src/tenant/tenant-member.dto.ts`)
Thêm:
```ts
export class UpdateMemberProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() hoTen?: string;
  @IsOptional() @IsEmail() email?: string;
}
```

### Service (`tenant.service.ts`)
- `updateMemberProfile(tenantId, userId, dto)`:
  1. Tìm membership `{ tenantId, userId, isActive }` — không có → `NotFoundException`.
  2. Load `User` theo `userId` — không có → `NotFoundException`.
  3. Nếu `dto.email`: lowercase; nếu khác email hiện tại, kiểm tra trùng với user khác → `ConflictException('Email đã được sử dụng')`.
  4. Gán `hoTen`/`email` nếu có, `save`.
  5. Trả về `{ id, email, hoTen }`.
- `resetMemberPassword(tenantId, userId)`:
  1. Verify membership như trên.
  2. `bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)`.
  3. Tìm `UserCredential` theo `userId`: có → cập nhật `password`; chưa có → tạo mới (`isActive: true`).
  4. Trả về `{ defaultPassword: DEFAULT_PASSWORD }`.

### Controller (`tenant.controller.ts`) — `JwtGuard`
- `PUT  /tenants/:id/members/:userId/profile` → `updateMemberProfile`.
- `POST /tenants/:id/members/:userId/reset-password` → `resetMemberPassword`.

## Frontend — `fe/src/`

### Service (`services/tenantService.ts`)
- `updateMemberProfile(tenantId, userId, { hoTen?, email? })` → `PUT /${tenantId}/members/${userId}/profile`.
- `resetMemberPassword(tenantId, userId)` → `POST /${tenantId}/members/${userId}/reset-password`, trả `{ defaultPassword }`.

### Trang (`pages/cau-hinh/thanh-vien/ThanhVienPage.tsx`)
- **Modal "Sửa"**: thêm field **Họ tên** + **Email** cạnh **Vai trò**. Khi submit:
  - Gọi `updateMemberProfile` (hoTen, email) và `updateMember` (role) — chỉ gọi profile nếu hoTen/email thay đổi.
  - Form khởi tạo từ `record.hoTen`, `record.email`, `record.role`.
  - Validate: họ tên bắt buộc, email đúng định dạng.
- **Cột Thao tác**: thêm icon Reset mật khẩu (ví dụ `KeyOutlined` / `RedoOutlined`) bọc `Popconfirm`. Xác nhận → gọi `resetMemberPassword` → `message.success('Đã reset mật khẩu về 123456')`.
- Gate icon Sửa + Reset bằng `hasPermission('/cau-hinh/thanh-vien:sua')` (lấy từ `useAuth`).
- Sau khi sửa profile, `fetchMembers()` để refresh danh sách.

## Edge cases
- Đổi email trùng người dùng khác → lỗi rõ ràng từ BE, FE hiện `message.error`.
- Email luôn lưu lowercase.
- User chưa có `UserCredential` → reset sẽ tạo mới.
- Membership không tồn tại trong tenant → 404.

## Ngoài phạm vi
- Đặt mật khẩu tùy ý (chỉ reset mặc định).
- Sửa quyền/permission guard ở BE cho các endpoint member.
- Bulk import/export, reset hàng loạt.
