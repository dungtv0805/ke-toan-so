# Multi-Tenant Implementation Plan - Digital Books

## Tổng quan

Triển khai kiến trúc multi-tenant cho hệ thống Digital Books (kế toán/tài chính) sử dụng phương pháp **Tenant ID Column** - thêm `tenantId` vào tất cả entities và tự động filter theo tenant.

## Yêu cầu

1. Mỗi công ty (tenant) có dữ liệu độc lập
2. User có thể thuộc nhiều tenant với role khác nhau
3. Login flow: Đăng nhập → Chọn tenant (nếu có nhiều) → Vào hệ thống
4. Tự động filter query theo tenant hiện tại
5. JWT chứa tenantId để xác định context

## Kiến trúc hiện tại

### Backend (NestJS Microservices + MongoDB/TypeORM)
- 8 microservices: gateway, auth, master-data, voucher, cash-book, payable, reporting, config
- Shared libs: @app/auth, @app/core, @app/database, @app/dto, @app/entities

### Entities cần thêm tenantId (22 entities)
**Auth:**
- User (đặc biệt: có mảng tenants[])
- UserCredential

**Master Data:**
- TaiKhoan, DoiTuong, SanPham, HopDong, DuAn
- BoPhan, NganHang, DongTien, ChuDauTu
- KhoanMuc, NhomKhoanMuc, NhomQuanLy, NhomKhuyenMai
- LoaiChungTu, LoaiGiaoDich

**Voucher:**
- ChungTu, VoucherSequence

**Payable:**
- CongNo

**Config:**
- QuyChuan, PhanQuyen

### Frontend (React + TypeScript)
- AuthContext quản lý authentication
- Services gọi API qua axios

---

## Phase 1: Backend Core (Tasks 1-5)

### Task 1: Tạo Tenant Entity & Module
**Files:**
- `be/libs/entities/src/tenant/tenant.entity.ts`
- `be/libs/entities/src/tenant/index.ts`
- `be/apps/master-data-service/src/tenant/tenant.module.ts`
- `be/apps/master-data-service/src/tenant/tenant.service.ts`
- `be/apps/master-data-service/src/tenant/tenant.controller.ts`
- `be/libs/dto/src/tenant/tenant.dto.ts`

**Schema Tenant:**
```typescript
@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: true })
  isActive: boolean;
}
```

### Task 2: Cập nhật User Entity với Tenant Relationship
**Files:**
- `be/libs/entities/src/auth/user.entity.ts`
- `be/libs/dto/src/auth/user.dto.ts`

**Thay đổi:**
```typescript
// Thêm embedded document cho tenant membership
export class UserTenant {
  @Column()
  tenantId: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;
}

@Entity('users')
export class User extends BaseEntity {
  // ... existing fields
  
  @Column(() => UserTenant)
  tenants: UserTenant[];
}
```

### Task 3: Tạo Tenant Context Service
**Files:**
- `be/libs/core/src/tenant/tenant-context.service.ts`
- `be/libs/core/src/tenant/tenant.middleware.ts`
- `be/libs/core/src/tenant/index.ts`

**Chức năng:**
- Sử dụng AsyncLocalStorage để lưu tenant context per-request
- Middleware extract tenantId từ JWT và set vào context
- Export `getCurrentTenantId()` helper

### Task 4: Tạo TypeORM Subscriber cho Auto-Filter
**Files:**
- `be/libs/database/src/tenant.subscriber.ts`
- `be/libs/database/src/database.module.ts` (update)

**Chức năng:**
- TypeORM EntitySubscriber để tự động:
  - Thêm tenantId khi insert
  - Filter theo tenantId khi query (beforeFind)

### Task 5: Cập nhật Base Entity & Tất cả Entities
**Files:**
- `be/libs/entities/src/base.entity.ts` (thêm tenantId)
- Tất cả 22 entities trong `be/libs/entities/src/`

**Thay đổi BaseEntity:**
```typescript
export abstract class BaseEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ nullable: true })
  tenantId: string;  // NEW

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## Phase 2: Backend Auth Flow (Tasks 6-8)

### Task 6: Cập nhật Auth Service - 2-Step Login
**Files:**
- `be/apps/auth-service/src/auth-service.service.ts`
- `be/apps/auth-service/src/auth-service.controller.ts`
- `be/libs/dto/src/auth/auth.dto.ts`

**Flow:**
1. `POST /auth/login` - Xác thực email/password
   - Nếu user có 1 tenant → Trả về accessToken với tenantId
   - Nếu user có nhiều tenant → Trả về tempToken + danh sách tenants
2. `POST /auth/select-tenant` - Chọn tenant (với tempToken)
   - Trả về accessToken với tenantId đã chọn

### Task 7: Cập nhật JWT Strategy & Guards
**Files:**
- `be/libs/auth/src/guards/jwt.guard.ts`
- `be/libs/auth/src/interfaces/decoded-token.interface.ts`
- `be/libs/auth/src/services/jwt.service.ts`

**Thay đổi:**
- DecodedToken thêm `tenantId`
- JwtGuard reject tempToken (không có tenantId)
- JwtService sign token với tenantId

### Task 8: Cập nhật Gateway để Forward Tenant Header
**Files:**
- `be/apps/gateway/src/gateway.module.ts`
- `be/apps/gateway/src/gateway.controller.ts` (nếu có)

**Chức năng:**
- Extract tenantId từ JWT
- Forward `x-tenant-id` header đến microservices

---

## Phase 3: Frontend (Tasks 9-12)

### Task 9: Cập nhật Auth Service & Types
**Files:**
- `fe/src/services/authService.ts`
- `fe/src/types/index.ts` (hoặc tạo tenant types)

**Thay đổi:**
- Thêm `selectTenant()` API call
- Thêm Tenant type
- Cập nhật LoginResponse type

### Task 10: Cập nhật AuthContext - 2-Step Login
**Files:**
- `fe/src/contexts/AuthContext.tsx`

**Thay đổi:**
- State: `tempToken`, `availableTenants`, `currentTenant`
- Methods: `selectTenant()`, `switchTenant()`
- Login flow xử lý 2 trường hợp (1 tenant vs nhiều tenant)

### Task 11: Tạo TenantSelector Component
**Files:**
- `fe/src/components/auth/TenantSelector.tsx`

**Chức năng:**
- Hiển thị danh sách tenants sau khi login
- Cho phép user chọn tenant để tiếp tục

### Task 12: Tạo TenantSwitcher trong Header
**Files:**
- `fe/src/components/layout/TenantSwitcher.tsx`
- `fe/src/components/layout/Header.tsx` (update)

**Chức năng:**
- Dropdown hiển thị tenant hiện tại
- Cho phép switch sang tenant khác (re-login flow)

---

## Phase 4: Integration & Migration (Tasks 13-14)

### Task 13: Tạo Migration Script
**Files:**
- `be/scripts/migrations/add-default-tenant.ts`

**Chức năng:**
- Tạo default tenant
- Migrate existing users để có tenant membership
- Migrate existing data để có tenantId

### Task 14: Cập nhật tất cả Microservices
**Files:**
- Tất cả `*.module.ts` trong `be/apps/*/src/`

**Chức năng:**
- Import TenantMiddleware
- Register TenantSubscriber
- Đảm bảo tenant context được propagate

---

## Checklist Verification

### Backend
- [ ] Tenant entity & CRUD hoạt động
- [ ] User có thể thuộc nhiều tenants
- [ ] 2-step login flow hoạt động
- [ ] JWT chứa tenantId
- [ ] Auto-filter theo tenant hoạt động
- [ ] Tất cả entities có tenantId

### Frontend
- [ ] Login → Chọn tenant flow hoạt động
- [ ] TenantSelector hiển thị đúng
- [ ] TenantSwitcher trong header hoạt động
- [ ] API calls gửi đúng tenant context

### Data
- [ ] Migration script chạy thành công
- [ ] Existing data có tenantId
- [ ] Existing users có tenant membership

---

## Tech Stack Reference

- **Backend**: NestJS 11, TypeORM, MongoDB
- **Frontend**: React 18, TypeScript, Vite
- **Auth**: JWT với Passport.js
- **State**: React Context (AuthContext)

## Notes

- Project sử dụng TypeORM với MongoDB (không phải Mongoose như CYT)
- Cần dùng EntitySubscriber thay vì Mongoose plugin
- Microservices architecture cần propagate tenant context qua headers
