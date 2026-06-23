# Thiết kế: Phân lĩnh vực theo công ty (Module Entitlement)

**Ngày:** 2026-06-23
**Trạng thái:** Đã duyệt thiết kế, đang triển khai
**Branch:** `feat/module-linh-vuc-cong-ty`

## Bối cảnh & Mục tiêu

Hệ thống hiện chia quyền theo **vai trò** (role permission, `hasPermission(path:xem)`),
nhưng chưa có khái niệm **công ty đã mua chức năng gì**. Cần thêm một tầng
**entitlement (lĩnh vực / module)** để:

- Mỗi công ty (tenant) được cấp 1 hoặc nhiều lĩnh vực: Kế toán, Kho, … (mở rộng sau).
- Khi vào công ty, nếu có nhiều lĩnh vực thì người dùng **chọn lĩnh vực** để vào; mỗi
  lĩnh vực chỉ hiển thị menu của nó.
- Phục vụ bán hàng SaaS sau này (gói theo lĩnh vực).

**Hai tầng độc lập, ghép lại:**

> Menu hiển thị = (menu của module đang chọn ∪ menu common) ∩ (role cho phép)

- **Module/Lĩnh vực** = gating thô: công ty đã mua gì.
- **Role/Phân quyền** = gating tinh: user làm gì trong đó (giữ nguyên hệ thống hiện có).

## Phạm vi (đợt này)

- ✅ Mô hình hoá module, gán module cho công ty (SuperAdmin gán tay).
- ✅ Lọc menu theo module ở FE + màn chọn lĩnh vực + nút đổi lĩnh vực.
- ❌ KHÔNG làm thanh toán/billing tự động.
- ❌ KHÔNG chặn API ở backend (v1 chỉ ẩn menu ở FE). API vẫn map sẵn để bổ sung guard sau.

## Quyết định thiết kế (đã chốt với user)

1. Danh sách lĩnh vực **code-defined** (hardcode FE), không quản lý DB.
2. Enforcement **FE-only** cho v1.
3. UX: **màn chọn lĩnh vực** sau khi chọn công ty (>1 lĩnh vực) + **nút đổi** ở sidebar;
   1 lĩnh vực → vào thẳng.
4. Có **menu common** (luôn hiện) + phần riêng theo lĩnh vực.
5. `modules` gán ở **cấp công ty** (tenant), không theo từng user.

## Mô hình dữ liệu

### Module catalog (code-defined, FE)
`fe/src/config/modules.ts`:
```ts
export type ModuleCode = 'KE_TOAN' | 'KHO';
export interface ModuleDef { code: ModuleCode; name: string; icon: ...; color: string; }
export const MODULES: ModuleDef[] = [
  { code: 'KE_TOAN', name: 'Kế toán', ... },
  { code: 'KHO',     name: 'Kho',     ... },
];
```

### Tenant entity (BE)
Thêm field:
```ts
@Column({ type: 'json', default: ['KE_TOAN'] })
modules: string[];   // vd ['KE_TOAN','KHO']
```
- Backfill tenant cũ = `['KE_TOAN']` (không vỡ dữ liệu hiện tại).

## Backend (tối thiểu)

1. **Tenant entity** + DTO (`CreateTenantDto`/`UpdateTenantDto`) + response: thêm `modules`.
2. **master-data /tenants** create/update: nhận & lưu `modules`. SuperAdmin gán trên trang Quản lý Công ty.
3. **auth-service**: trả thêm `modules` trong payload tenant của `login` / `select-tenant` /
   `switch-tenant` (đọc từ tenant entity), và nhúng vào JWT tenant payload.
4. Không thêm guard chặn API ở v1.

## Frontend

1. **`TenantInfo`** (`fe/src/types/tenant.ts`) thêm `modules: string[]`.
2. **Module catalog** `fe/src/config/modules.ts` (như trên).
3. **Gắn nhãn module cho menu** trong `MainLayout.tsx`: mỗi nhóm/mục menu gắn
   `module: ModuleCode | 'COMMON'`. Hàm lọc menu mới = lọc theo module đang chọn
   (giữ `COMMON`) **rồi** lọc theo role (`filterMenuItems` hiện có).
4. **Màn "Chọn lĩnh vực"** `fe/src/pages/chon-linh-vuc/` (route `/chon-linh-vuc`):
   - `modules.length > 1` → hiển thị thẻ chọn (chỉ các module công ty có).
   - `=== 1` → tự chọn, redirect vào app.
   - `=== 0` → "Chưa được cấp lĩnh vực nào, liên hệ admin".
5. **Lưu lĩnh vực đang chọn**: AuthContext state + `localStorage` key theo tenant
   (`selectedModule:<tenantId>`). Refresh giữ nguyên.
6. **Sidebar header**: nút/badge lĩnh vực hiện tại → bấm để đổi (về màn chọn hoặc dropdown).
7. **Đổi công ty** (`switchTenant`): reset lĩnh vực đang chọn → chạy lại logic chọn.
8. **Guard route**: chưa chọn module (khi tenant có >1) → đẩy về `/chon-linh-vuc`.
   v1 không chặn cứng route ngoài module (chỉ ẩn menu).

### Phân nhóm menu Common / KE_TOAN / KHO (đề xuất ban đầu, có thể chỉnh)

| Nhóm / mục hiện tại | Gán module |
|---|---|
| Tổng quan (`/`) | COMMON |
| Cấu hình: Phân quyền, Vai trò, Thành viên | COMMON |
| Quản lý Công ty (SuperAdmin) | COMMON |
| Báo cáo (tài chính, sổ chi tiết, bảng tổng hợp…) | KE_TOAN |
| Trung tâm dữ liệu | KE_TOAN |
| Chứng từ: phiếu thu, phiếu chi, phiếu kế toán… | KE_TOAN |
| Phân tích: kế toán, công nợ, dòng tiền | KE_TOAN |
| Danh mục kế toán: tài khoản, đối tượng, khoản mục, ngân hàng, dòng tiền… | KE_TOAN |
| Kho: Nhập/Xuất/Chuyển kho (tách khu vực riêng) | KHO |
| Phân tích: tồn kho | KHO |
| Chứng từ: phiếu nhập, phiếu xuất | KHO |
| Danh mục kho: kho, hàng hóa vật tư, đơn vị tính, nhóm vật tư | KHO |

> SuperAdmin thấy tất cả module.

## Trường hợp đặc biệt

- **SuperAdmin**: bỏ qua lọc module (thấy hết), màn chọn hiện tất cả module.
- **Tenant 0 module**: màn báo liên hệ admin.
- **Đổi công ty**: reset module đang chọn.

## Kiểm thử

- Logic lọc menu theo (module + role): unit test cho hàm `filterByModule`.
- BE: auth trả đúng `modules`; tenants lưu/đọc `modules`.
- Thủ công: công ty 1 module → vào thẳng; 2 module → màn chọn; đổi lĩnh vực ở sidebar.

## Ngoài phạm vi (sau này)

- Thanh toán online, tự kích hoạt module.
- Thời hạn/expiry mỗi module, trang quản lý gói.
- Guard chặn API theo module ở backend.
