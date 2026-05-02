# Thiết kế Hệ thống Phân quyền Ma trận

**Ngày:** 2026-05-02
**Scope:** FE trang phân quyền ma trận + trang quản lý vai trò + BE bypass guard

---

## 1. Tổng quan

Xây dựng hệ thống phân quyền mới với bảng ma trận module x action, cho phép Admin tenant tạo vai trò tùy chỉnh và gán quyền chi tiết (Xem, Thêm, Sửa, Xoá, Xuất) cho từng module/trang trong hệ thống.

### Flow phân cấp
```
Super Admin → tạo Admin cho tenant
Admin tenant → tạo vai trò → gán quyền cho vai trò → gán vai trò cho user
```

### 3 thành phần
1. **Trang Quản lý Vai trò** (`/cau-hinh/vai-tro`) — CRUD vai trò
2. **Trang Phân quyền** (`/cau-hinh/phan-quyen`) — Bảng ma trận module x action
3. **BE bypass** — RoleGuard + PermissionGuard mặc định return true

### Giai đoạn hiện tại
- FE: Chỉ làm UI, chưa thao tác được (mock data)
- BE: Bypass toàn bộ permission check

---

## 2. Trang Quản lý Vai trò (`/cau-hinh/vai-tro`)

### 2.1 UI Layout

**Header:**
- Tiêu đề: "Quản lý Vai trò"
- Nút "Thêm vai trò" (primary button)

**Bảng danh sách:**

| Cột | Mô tả |
|-----|-------|
| Tên vai trò | Tên hiển thị của vai trò |
| Mô tả | Mô tả ngắn về vai trò |
| Số người dùng | Số user đang được gán vai trò này (mock: random 0-10) |
| Trạng thái | Tag: Hoạt động (xanh) / Khoá (đỏ) |
| Hành động | Nút Sửa, Xoá |

**Modal Thêm/Sửa vai trò:**
- Tên vai trò (required, text input)
- Mô tả (optional, textarea)
- Trạng thái (switch: Hoạt động/Khoá)

### 2.2 Mock Data

```typescript
const mockRoles = [
  { id: '1', ten: 'Giám đốc', moTa: 'Quản lý toàn bộ hệ thống', soNguoiDung: 2, trangThai: 'HOAT_DONG' },
  { id: '2', ten: 'Kế toán trưởng', moTa: 'Quản lý kế toán', soNguoiDung: 3, trangThai: 'HOAT_DONG' },
  { id: '3', ten: 'Kế toán quỹ', moTa: 'Quản lý thu chi', soNguoiDung: 5, trangThai: 'HOAT_DONG' },
  { id: '4', ten: 'Kế toán công nợ', moTa: 'Quản lý công nợ', soNguoiDung: 4, trangThai: 'HOAT_DONG' },
  { id: '5', ten: 'Kế toán tổng hợp', moTa: 'Tổng hợp báo cáo', soNguoiDung: 2, trangThai: 'HOAT_DONG' },
  { id: '6', ten: 'Quản lý', moTa: 'Quản lý phòng ban', soNguoiDung: 3, trangThai: 'HOAT_DONG' },
  { id: '7', ten: 'Kiểm soát', moTa: 'Kiểm soát nội bộ', soNguoiDung: 1, trangThai: 'HOAT_DONG' },
];
```

### 2.3 CHanlder Pattern

```
src/pages/cau-hinh/vai-tro/
├── VaiTroPage.tsx                    # Main component, wraps Provider
├── VaiTroHandlerContext.tsx           # Context + Provider + Hooks
├── vaiTroHandler.ts                  # Handler class
├── components/
│   ├── header/
│   │   ├── VaiTroHeader.tsx          # Header với nút Thêm
│   │   └── VaiTroHeader.state.ts
│   ├── table/
│   │   ├── VaiTroTable.tsx           # Bảng danh sách
│   │   └── VaiTroTable.state.ts
│   └── modal/
│       ├── VaiTroModal.tsx           # Modal thêm/sửa
│       └── VaiTroModal.state.ts
└── sub-handler/
    ├── index.ts
    ├── init/
    │   ├── init.handler.ts
    │   └── init.event.ts
    └── crud/
        ├── crud.handler.ts           # Thêm/Sửa/Xoá (mock)
        └── crud.event.ts
```

---

## 3. Trang Phân quyền (`/cau-hinh/phan-quyen`)

### 3.1 UI Layout

**Header:**
- Tiêu đề: "Thiết lập Phân quyền"
- Dropdown chọn vai trò (lấy từ danh sách vai trò)

**Bảng ma trận:**

| Module | Tất cả | Xem | Thêm | Sửa | Xoá | Xuất |
|--------|--------|-----|------|-----|-----|------|
| **ĐIỀU HÀNH** | | | | | | |
| Tổng quan | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| **Phân tích** | | | | | | |
| └ Kế toán | ☑ | ☑ | ☐ | ☐ | ☐ | ☑ |
| └ Bán hàng | ☑ | ☑ | ☐ | ☐ | ☐ | ☑ |
| ... | | | | | | |
| **KẾ TOÁN** | | | | | | |
| **Báo cáo** | | | | | | |
| └ Báo cáo tài chính | ☑ | ☑ | ☐ | ☐ | ☐ | ☑ |
| ... | | | | | | |

**Hành vi checkbox:**
- **Leaf module** (không có children): "Tất cả" checkbox toggle 5 action (Xem, Thêm, Sửa, Xoá, Xuất) của module đó. Khi tất cả 5 đều checked → "Tất cả" auto-checked. Khi bất kỳ unchecked → "Tất cả" auto-unchecked.
- **Module cha** (có children, ví dụ: Phân tích, Báo cáo, Danh mục): có checkbox "Tất cả" ở cột "Tất cả" — toggle toàn bộ action của tất cả children. Các cột action riêng (Xem, Thêm...) của module cha toggle cột đó cho tất cả children. Trạng thái indeterminate khi một số children checked, một số không.
- **Section header** (Điều hành, Kế toán, Thư viện): không có checkbox, chỉ là label nhóm với background khác biệt.

**Nút "Lưu"** ở cuối trang (hiện chỉ show toast "Đã lưu", chưa gọi API).

### 3.2 Danh sách Module (lấy từ sidebar)

```typescript
interface PermissionModule {
  key: string;           // route path, dùng làm ID
  label: string;         // tên hiển thị
  isSection?: boolean;   // true = section header (Điều hành, Kế toán, Thư viện), không có checkbox
  children?: PermissionModule[];
}

const permissionModules: PermissionModule[] = [
  {
    key: 'dieu-hanh',
    label: 'ĐIỀU HÀNH',
    isSection: true,
    children: [
      { key: '/', label: 'Tổng quan' },
      {
        key: '/phan-tich',
        label: 'Phân tích',
        children: [
          { key: '/phan-tich/bao-cao-tai-chinh', label: 'Kế toán' },
          { key: '/phan-tich/ban-hang', label: 'Bán hàng' },
          { key: '/phan-tich/mua-hang', label: 'Mua hàng' },
          { key: '/phan-tich/cong-no', label: 'Công nợ' },
          { key: '/phan-tich/dong-tien', label: 'Dòng tiền' },
          { key: '/phan-tich/ton-kho', label: 'Tồn kho' },
          { key: '/phan-tich/thanh-khoan', label: 'Khả năng thanh khoản' },
        ],
      },
    ],
  },
  {
    key: 'ke-toan',
    label: 'KẾ TOÁN',
    isSection: true,
    children: [
      {
        key: '/bao-cao',
        label: 'Báo cáo',
        children: [
          { key: '/bao-cao/tai-chinh', label: 'Báo cáo tài chính' },
          { key: '/bao-cao/so-chi-tiet-tai-khoan', label: 'Sổ chi tiết tài khoản' },
          { key: '/bao-cao/so-chi-tiet-cong-no', label: 'Sổ chi tiết công nợ' },
          { key: '/bao-cao/so-chi-tiet-phat-sinh', label: 'Sổ chi tiết phát sinh' },
          { key: '/bao-cao/bang-tong-hop', label: 'Bảng tổng hợp' },
        ],
      },
      {
        key: '/trung-tam-du-lieu',
        label: 'Trung tâm dữ liệu',
        children: [
          { key: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch' },
          { key: '/trung-tam-du-lieu/du-bao', label: 'Dự báo' },
          { key: '/chung-tu/nhat-ky-chung', label: 'Dữ liệu tổng hợp' },
          { key: '/trung-tam-du-lieu/tai-san', label: 'Quản lý Tài sản' },
          { key: '/trung-tam-du-lieu/hang-hoa', label: 'Quản lý Hàng hóa' },
          { key: '/trung-tam-du-lieu/nguyen-lieu', label: 'Quản lý Nguyên liệu' },
          { key: '/trung-tam-du-lieu/dung-cu', label: 'Quản lý Dụng cụ' },
          { key: '/trung-tam-du-lieu/hop-dong', label: 'Quản lý Hợp đồng' },
          { key: '/trung-tam-du-lieu/nhan-su', label: 'Quản lý nhân sự' },
          { key: '/trung-tam-du-lieu/luong-bhxh', label: 'Lương & BHXH' },
        ],
      },
      {
        key: '/chung-tu',
        label: 'Chứng từ',
        children: [
          { key: '/chung-tu/phieu-thu', label: 'Phiếu thu' },
          { key: '/chung-tu/phieu-chi', label: 'Phiếu chi' },
          { key: '/chung-tu/phieu-nhap', label: 'Phiếu nhập' },
          { key: '/chung-tu/phieu-xuat', label: 'Phiếu xuất' },
          { key: '/chung-tu/phieu-luong', label: 'Phiếu lương' },
          { key: '/chung-tu/bang-tinh-luong', label: 'Bảng tính lương' },
          { key: '/chung-tu/bang-cham-cong', label: 'Bảng chấm công' },
          { key: '/chung-tu/cham-cong-lam-them', label: 'Bảng chấm công làm thêm giờ' },
          { key: '/chung-tu/phan-bo-khau-hao', label: 'Bảng phân bổ khấu hao TSCĐ' },
          { key: '/chung-tu/phieu-ke-toan', label: 'Phiếu kế toán' },
          { key: '/chung-tu/de-nghi-thanh-toan', label: 'Đề nghị thanh toán' },
        ],
      },
    ],
  },
  {
    key: 'thu-vien',
    label: 'THƯ VIỆN',
    isSection: true,
    children: [
      {
        key: '/danh-muc',
        label: 'Danh mục',
        children: [
          { key: '/danh-muc/tai-khoan', label: 'Tài khoản' },
          { key: '/danh-muc/doi-tuong', label: 'Đối tượng' },
          { key: '/danh-muc/du-an', label: 'Dự án' },
          { key: '/danh-muc/san-pham', label: 'Sản phẩm' },
          { key: '/danh-muc/hop-dong', label: 'Hợp đồng' },
          { key: '/danh-muc/bo-phan', label: 'Bộ phận' },
          { key: '/danh-muc/khoan-muc', label: 'Khoản mục' },
          { key: '/danh-muc/kho', label: 'Kho' },
          { key: '/danh-muc/chu-dau-tu', label: 'Chủ đầu tư' },
          { key: '/danh-muc/nhom-khoan-muc', label: 'Nhóm khoản mục' },
          { key: '/danh-muc/ngan-hang', label: 'Ngân hàng & Quỹ' },
          { key: '/danh-muc/dong-tien', label: 'Dòng tiền' },
          { key: '/danh-muc/nhom-khuyen-mai', label: 'Nhóm khuyến mại' },
          { key: '/danh-muc/nhom-quan-ly', label: 'Nhóm quản lý' },
          { key: '/danh-muc/loai-chung-tu', label: 'Loại chứng từ' },
          { key: '/danh-muc/loai-giao-dich', label: 'Loại giao dịch' },
          { key: '/danh-muc/quy-chuan', label: 'Quy chuẩn hạch toán' },
        ],
      },
      { key: '/so-quy', label: 'Sổ quỹ' },
      { key: '/cong-no/phai-thu', label: 'Phải thu' },
      { key: '/cong-no/phai-tra', label: 'Phải trả' },
      { key: '/quy-trinh', label: 'Quy trình' },
      { key: '/chinh-sach', label: 'Chính sách' },
      { key: '/bieu-mau', label: 'Biểu mẫu' },
      { key: '/huong-dan', label: 'Hướng dẫn' },
    ],
  },
];
```

### 3.3 Data Model (FE)

```typescript
type PermissionAction = 'xem' | 'them' | 'sua' | 'xoa' | 'xuat';

interface ModulePermission {
  moduleKey: string;          // route path
  actions: Record<PermissionAction, boolean>;
}

interface RolePermissionData {
  roleId: string;
  permissions: ModulePermission[];
}
```

### 3.4 CHanlder Pattern

```
src/pages/cau-hinh/phan-quyen/   (thay thế trang hiện tại)
├── PhanQuyenPage.tsx                    # Main component
├── PhanQuyenHandlerContext.tsx           # Context + Provider + Hooks
├── phanQuyenHandler.ts                  # Handler class
├── components/
│   ├── header/
│   │   ├── PhanQuyenHeader.tsx          # Header + dropdown chọn vai trò
│   │   └── PhanQuyenHeader.state.ts
│   ├── matrix/
│   │   ├── PermissionMatrix.tsx         # Bảng ma trận chính
│   │   ├── PermissionMatrix.state.ts
│   │   ├── MatrixSectionHeader.tsx      # Header section (Điều hành, Kế toán...)
│   │   ├── MatrixModuleRow.tsx          # Row cho module cha
│   │   └── MatrixLeafRow.tsx            # Row cho module lá (có checkbox)
│   └── footer/
│       └── PhanQuyenFooter.tsx          # Nút Lưu
├── constants/
│   └── permissionModules.ts             # Danh sách module từ sidebar
└── sub-handler/
    ├── index.ts
    ├── init/
    │   ├── init.handler.ts
    │   └── init.event.ts
    ├── select-role/
    │   ├── select-role.handler.ts       # Chọn vai trò → load permissions
    │   └── select-role.event.ts
    ├── toggle-permission/
    │   ├── toggle-permission.handler.ts # Toggle checkbox
    │   └── toggle-permission.event.ts
    └── save/
        ├── save.handler.ts              # Lưu (mock toast)
        └── save.event.ts
```

---

## 4. BE Bypass

### 4.1 RoleGuard

**File:** `be/libs/auth/src/guards/role.guard.ts`

**Thay đổi:** Thêm điều kiện bypass ở đầu `canActivate()`:

```typescript
canActivate(context: ExecutionContext): boolean {
  // TEMPORARY: Bypass all role checks until FE permission system is complete
  return true;
  
  // ... existing logic giữ nguyên bên dưới
}
```

### 4.2 PermissionGuard

**File:** `be/libs/auth/src/guards/permission.guard.ts`

**Thay đổi:** Tương tự:

```typescript
canActivate(context: ExecutionContext): boolean {
  // TEMPORARY: Bypass all permission checks until FE permission system is complete
  return true;
  
  // ... existing logic giữ nguyên bên dưới
}
```

### 4.3 Lưu ý
- Giữ nguyên tất cả `@Roles()` và `@Permissions()` decorator trên controller
- Chỉ guard bỏ qua check, không xoá code cũ
- Comment rõ ràng "TEMPORARY" để dễ tìm và bật lại sau

---

## 5. Routing & Sidebar Integration

### 5.1 Thêm route mới

**File:** `fe/src/App.tsx`

```typescript
// Trong phần cấu hình routes
<Route path="cau-hinh">
  <Route path="phan-quyen" element={<PhanQuyenPage />} />
  <Route path="vai-tro" element={<VaiTroPage />} />  {/* MỚI */}
</Route>
```

### 5.2 Cập nhật sidebar

**File:** `fe/src/components/layout/MainLayout.tsx`

- Thêm `/cau-hinh/vai-tro` vào `existingRoutes` Set
- Thêm menu item "Quản lý Vai trò" vào settings dropdown (cạnh "Phân quyền")

### 5.3 Cập nhật routePermissions

**File:** `fe/src/config/routePermissions.ts`

```typescript
'/cau-hinh/vai-tro': ['ADMIN'],
```

---

## 6. Kế hoạch Subagent

### Subagent 1: Trang Quản lý Vai trò
- Tạo toàn bộ thư mục `src/pages/cau-hinh/vai-tro/`
- CHanlder pattern: handler, context, events
- Components: header, table, modal
- Mock data

### Subagent 2: Trang Phân quyền Ma trận
- Thay thế trang phân quyền hiện tại `src/pages/cau-hinh/phan-quyen/`
- CHanlder pattern: handler, context, events
- Components: header (dropdown vai trò), matrix table, footer
- Constants: permissionModules
- Mock data cho permissions

### Subagent 3: BE Bypass
- Sửa RoleGuard: return true
- Sửa PermissionGuard: return true

### Subagent 4: Routing & Sidebar
- Thêm route `/cau-hinh/vai-tro` vào App.tsx
- Cập nhật MainLayout sidebar
- Cập nhật routePermissions
- Cập nhật existingRoutes

### Review Agent
- Review code tất cả subagent
- Kiểm tra CHanlder pattern đúng convention
- Kiểm tra TypeScript types
- Kiểm tra UI consistency

---

## 7. Ngoài scope (làm sau)

- Gọi API thực tế (CRUD vai trò, lưu permissions)
- Gán vai trò cho user
- Enforce permissions trên FE (ẩn/hiện nút, disable action)
- BE permission check thực tế
- Super Admin management UI
