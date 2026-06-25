---
name: db-fe
description: Use when working on frontend pages, components, handlers, or UI features in the digital-books fe/ directory
---

# Digital Books — Frontend Skill

## Mandatory First Actions

1. Read `.claude/context/active-pages.md` — sidebar pages and their status
2. Read `.claude/skills/learnings/system.md` — system-wide facts
3. Read relevant per-page learnings if exists (e.g., `learnings/bao-cao.md`)

## Architecture

- React 18 + TypeScript + Vite
- CHanlder pattern for state management (see `fe/HANDLER_GUIDE.md`)
- shadcn/ui + Radix UI + Tailwind CSS
- TanStack React Query for data fetching
- Path alias: `@/*` → `./src/*`

## Page → API Flow Verification

Before modifying any page, verify the complete flow:

1. **Sidebar entry exists** — check `MainLayout.tsx` sidebar config
2. **Route exists** — check `App.tsx` route definition
3. **Page component exists** — check `src/pages/` directory
4. **API calls identified** — check services used in handler/component
5. **Backend endpoint confirmed** — cross-reference with `.claude/context/be-api-map.md`

## Key Patterns

### CHanlder Pattern
```
src/pages/{feature}/
├── {feature}Handler.ts          # Handler class
├── {Feature}HandlerContext.tsx   # Context + Provider
├── {Feature}Component.tsx        # Main component
├── components/                   # Sub-components
└── sub-handler/                  # Event handlers
```

### API Service Pattern
```typescript
// src/services/{feature}.service.ts
import { apiClient } from '@/config/api';
export const featureService = {
  getAll: (params) => apiClient.get('/endpoint', { params }),
  create: (data) => apiClient.post('/endpoint', data),
};
```

## ⚠️ Thêm MENU/PAGE mới — PHẢI khai báo PHÂN QUYỀN (rất dễ quên!)

Nếu chỉ thêm menu + route mà KHÔNG khai báo quyền, trang sẽ **bị ẩn trong sidebar và chặn bởi `ProtectedRoute`** với mọi role trừ superAdmin (`admin@company.com`). Quyền dạng `"<route>:<action>"` (action: `xem|them|sua|xoa|xuat`); role công ty (vd "Admin") lấy quyền từ collection `phan_quyen` → nạp vào JWT lúc login.

**Checklist mỗi khi thêm 1 trang mới (đã verify khi thêm menu Thuế 2026-06-25):**

1. **Menu + route**
   - `fe/src/components/layout/MainLayout.tsx` — thêm `getMenuItem`/`getItem`; thêm route vào `existingRoutes` (Set) để KHÔNG bị nhãn "coming soon".
   - `fe/src/config/menuCatalog.ts` — thêm `{ key, label, parentLabel }`.
   - `fe/src/App.tsx` — thêm `<Route>` bọc `<ProtectedRoute requiredPermission="<route>:xem">`; import page từ `fe/src/pages/loadable.tsx`.

2. **Khai báo quyền — 3 file (BẮT BUỘC, thiếu → trang không hiện trong ma trận Phân quyền + bị chặn):**
   - `fe/src/config/routePermissions.ts` — map `'<route>': '<route>:xem'`.
   - `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts` — thêm node vào cây quyền (PHẢI KHỚP với BE bên dưới, nếu không lần lưu Phân quyền sẽ xoá mất quyền).
   - `be/apps/master-data-service/src/tenant/tenant.service.ts` → mảng `PERMISSION_MODULES` (để tenant MỚI + `generateAllPermissions` có đủ).

3. **Cấp quyền cho role ĐÃ TỒN TẠI** — `generateAllPermissions` chỉ chạy lúc tạo tenant; role "Admin" cũ KHÔNG tự có quyền mới. Sau deploy phải $addToSet vào `phan_quyen` (xem lệnh Mongo trong skill `db-deploy`), rồi **đăng xuất/đăng nhập lại** để JWT nạp quyền mới.

> Backend gating: `RoleGuard`/`@Roles` hiện là no-op, `JwtGuard` chỉ check đăng nhập → BE KHÔNG chặn theo quyền. Việc gating quyền hiện hoàn toàn ở FE (ẩn menu + `ProtectedRoute`).

## Common Mistakes

- **Quên khai báo phân quyền khi thêm menu mới** (xem mục ⚠️ ở trên) — trang bị ẩn/chặn với role không phải superAdmin.
- Forgetting to check if page is "Coming Soon" before implementing
- Not following CHanlder pattern for new features
- Calling wrong API endpoint (many similar names exist)
- Not verifying sidebar → route → page → API chain
