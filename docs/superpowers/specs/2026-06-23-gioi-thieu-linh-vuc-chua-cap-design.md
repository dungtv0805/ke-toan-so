# Giới thiệu lĩnh vực chưa cấp (disabled) — Design

**Mục tiêu:** Mọi công ty đều **nhìn thấy** tất cả lĩnh vực đang active; lĩnh vực công ty chưa được cấp hiển thị **disabled** (xám, tag "Chưa kích hoạt" + tooltip) để giới thiệu sản phẩm mới. Không mở menu/nội dung của lĩnh vực chưa cấp — thuần trưng bày.

**Bối cảnh:** Lĩnh vực động đã có (collection `linh_vuc`, AuthContext nạp `allModules`). `ModuleSwitchModal` đã render tất cả lĩnh vực active + disable lĩnh vực chưa cấp. `ModuleSelector` (màn login) hiện chỉ render lĩnh vực được cấp. Lối vào đổi lĩnh vực bị giới hạn ở công ty có >1 lĩnh vực được cấp.

## Phạm vi (Cách A — tận dụng component sẵn có)

### 1. `ModuleSelector` (màn chọn lúc đăng nhập) — `fe/src/components/auth/ModuleSelector.tsx`
- Render **tất cả lĩnh vực active** (`allModules.filter(isActive)`), sắp xếp: lĩnh vực được cấp trước (theo `order`), lĩnh vực chưa cấp sau.
- Được cấp → bấm chọn được. Chưa cấp → `disabled`, xám mờ, tag "Chưa kích hoạt", tooltip "Liên hệ để kích hoạt lĩnh vực này". Bấm không làm gì.
- Dùng `getModule`/`iconByName`/`color` như hiện tại.

### 2. `ModuleSwitchModal` — `fe/src/components/auth/ModuleSwitchModal.tsx`
- Giữ nguyên (đã đúng: full active + disable non-owned + tooltip).

### 3. Lối vào "Đổi lĩnh vực" — `fe/src/components/layout/MainLayout.tsx`
- Điều kiện hiện nút (gear) đổi từ `availableModules.length > 1` → **`allModules.filter(isActive).length > 1`** (có ≥2 lĩnh vực active trong hệ thống) để công ty 1 lĩnh vực vẫn mở modal xem lĩnh vực khác.

### 4. Trigger màn chọn — `fe/src/contexts/AuthContext.tsx`
- Định nghĩa `hasModuleChoice = availableModules.length > 1 || activeCodes.length > availableModules.length` (có nhiều lựa chọn HOẶC có lĩnh vực chưa cấp để giới thiệu).
- `needsModuleSelection = !!currentTenant && !selectedModule && hasModuleChoice`.
- Effect chọn mặc định: chỉ **auto-chọn** khi `availableModules.length === 1 && activeCodes.length === 1` (chỉ 1 lĩnh vực toàn hệ thống, không có gì để giới thiệu); ngược lại để `null` → hiện màn chọn.
- **Quên lựa chọn khi đăng nhập mới:** trong `login` (khi có `response.tenant`) và `selectTenant` thành công → `setStoredModule(tenantId, null)`. KHÔNG xóa trong `initAuth` (khôi phục phiên/F5) để reload trong phiên không bị hỏi lại.

## Không đụng tới
- Sidebar: không nhét lĩnh vực chưa cấp vào menu.
- Entitlement: user thường **chỉ dùng được** lĩnh vực được cấp; lĩnh vực disabled không mở nội dung. SuperAdmin vẫn thấy tất cả.
- Backend: không đổi.

## Ngoài phạm vi (tách riêng)
- Việc "Admin công ty tự động toàn quyền quản lý công ty" (thêm user/vai trò/phân quyền) — quyết định Hướng 1 (cấp quyền dữ liệu) / Hướng 2 (sửa code) xử lý riêng.
