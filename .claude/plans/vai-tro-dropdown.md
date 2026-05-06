# Full: Entity VaiTro + CRUD Backend + Cập nhật cả 2 trang Frontend

## Vấn đề
- Danh sách vai trò hiện hardcode (enum UserRole ở BE, mock data ở FE)
- User muốn vai trò do admin tự tạo/quản lý, lưu trong DB

## Giải pháp
Tạo entity VaiTro riêng trong DB, backend CRUD API, cập nhật cả trang Quản lý Vai Trò và trang Phân quyền.

## Steps

### 1. Backend: Tạo entity VaiTro
- File mới: `be/libs/entities/src/config/vai-tro.entity.ts`
- Fields: `ten` (string, unique), `moTa` (string, nullable), `isActive` (boolean, default true)
- Kế thừa `BaseEntity` (đã có `_id`, `tenantId`, `createdAt`, `updatedAt`)
- Export trong `be/libs/entities/src/config/index.ts`

### 2. Backend: Tạo module VaiTro (controller + service)
- Tạo folder `be/apps/config-service/src/vai-tro/`
- Files:
  - `vai-tro.module.ts` — register entity, controller, service
  - `vai-tro.service.ts` — CRUD: findAll, findOne, create, update, delete (soft)
  - `vai-tro.controller.ts` — routes dưới prefix `vai-tro`:
    - `GET /vai-tro` — danh sách vai trò active
    - `GET /vai-tro/:id` — chi tiết
    - `POST /vai-tro` — tạo mới
    - `PUT /vai-tro/:id` — cập nhật
    - `DELETE /vai-tro/:id` — soft delete
  - Tất cả require `@Roles('ADMIN')`
- Register `VaiTro_Module` trong `config-service.module.ts`

### 3. Backend: Seed vai trò mặc định
- Trong `vai-tro.service.ts` thêm method `seedDefaultRoles()` 
- Gọi khi module init (OnModuleInit) — chỉ seed nếu collection rỗng
- 7 vai trò mặc định: Giám đốc, Kế toán trưởng, Kế toán quỹ, Kế toán công nợ, Kế toán tổng hợp, Quản lý, Kiểm soát

### 4. Backend: Sửa phan-quyen service
- Xóa method `getDanhSachVaiTro()` hardcode từ enum (vừa thêm ở session trước)
- Xóa route `GET /phan-quyen/danh-sach-vai-tro` trong controller
- Xóa import `UserRole` trong service
- Trang Phân quyền sẽ gọi `GET /vai-tro` thay vì `GET /phan-quyen/danh-sach-vai-tro`

### 5. Frontend: Thêm vaiTroService.ts
- File mới: `fe/src/services/vaiTroService.ts`
- Endpoint base: `/config/vai-tro`
- Methods: `getAll()`, `getById(id)`, `create(data)`, `update(id, data)`, `remove(id)`

### 6. Frontend: Cập nhật trang Quản lý Vai Trò
- Sửa `init.handler.ts` — gọi `vaiTroService.getAll()` thay vì mock data
- Sửa `crud.handler.ts` — gọi API create/update/delete thay vì thao tác state
- Xóa mock data

### 7. Frontend: Cập nhật trang Phân quyền
- Sửa `init.handler.ts` — gọi `vaiTroService.getAll()` thay vì `phanQuyenService.getDanhSachVaiTro()`
- Xóa method `getDanhSachVaiTro()` trong `phanQuyenService.ts`

### 8. Build & Verify
- Build backend config-service
- Build frontend
- Type-check cả hai
- Verify trên browser: cả 2 trang hoạt động đúng
