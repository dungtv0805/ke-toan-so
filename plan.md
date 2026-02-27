# Plan: Thêm User vào Tenant (Add User to Tenant)

## Vấn đề hiện tại
Muốn thêm user vào một công ty (tenant) thì phải tạo mới tenant kèm admin, hoặc user tự register với tenantId. Không có cách nào để admin của tenant thêm user đã tồn tại (hoặc tạo user mới) vào tenant của mình.

## Giải pháp
Thêm tính năng "Quản lý thành viên" cho mỗi tenant — cho phép Super Admin và Admin của tenant đó thêm/xóa/sửa role thành viên.

---

## Backend Changes

### 1. Tạo DTO: `AddUserToTenantDto` + `UpdateTenantMemberDto`
**File:** `be/libs/dto/src/tenant/tenant-member.dto.ts`
- AddUserToTenantDto: userId? (chọn user có sẵn), email?, hoTen?, password?, role
- UpdateTenantMemberDto: role, isActive?
- Export từ `be/libs/dto/src/tenant/index.ts`

### 2. Thêm methods vào TenantService
**File:** `be/apps/master-data-service/src/tenant/tenant.service.ts`
- `getTenantMembers(tenantId)` — lấy danh sách thành viên
- `addUserToTenant(tenantId, dto)` — thêm user (có sẵn hoặc tạo mới)
- `updateTenantMember(tenantId, userId, dto)` — cập nhật role
- `removeTenantMember(tenantId, userId)` — xóa thành viên

### 3. Thêm endpoints vào TenantController
**File:** `be/apps/master-data-service/src/tenant/tenant.controller.ts`
- `GET /tenants/:id/members` — danh sách thành viên
- `POST /tenants/:id/members` — thêm thành viên
- `PUT /tenants/:id/members/:userId` — cập nhật role
- `DELETE /tenants/:id/members/:userId` — xóa thành viên
- Guard: Super Admin HOẶC user có role ADMIN trong tenant đó (dùng custom guard `TenantAdminGuard`)

### 4. Tạo TenantAdminGuard
**File:** `be/libs/auth/src/guards/tenant-admin.guard.ts`
- Cho phép Super Admin hoặc user có role ADMIN trong tenant được truyền qua param `:id`
- Export từ guards/index.ts

---

## Frontend Changes

### 5. Thêm API methods + types vào tenantService
**File:** `fe/src/services/tenantService.ts`
- Interfaces: TenantMember, AddMemberDto, UpdateMemberDto
- Methods: getMembers, addMember, updateMember, removeMember

### 6. Tạo Modal quản lý thành viên
**File:** `fe/src/pages/cau-hinh/tenant/TenantMembersModal.tsx`
- Table hiển thị thành viên: email, họ tên, vai trò, trạng thái, thao tác
- Button "Thêm thành viên" → sub-modal chọn user có sẵn hoặc tạo mới + chọn role
- Sửa role, xóa thành viên

### 7. Tích hợp vào TenantPage
**File:** `fe/src/pages/cau-hinh/tenant/TenantPage.tsx`
- Thêm button "Thành viên" vào cột thao tác
- State + handler mở TenantMembersModal

---

## Thứ tự thực hiện
1. Backend DTOs (step 1)
2. TenantAdminGuard (step 4)
3. Backend Service + Controller (step 2-3)
4. Frontend Service (step 5)
5. Frontend UI (step 6-7)
