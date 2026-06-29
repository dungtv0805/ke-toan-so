# MasterCeo — Mô hình chuẩn Identity ↔ App con (Design)

- **Ngày:** 2026-06-29
- **Trạng thái:** Đã duyệt thiết kế, chờ writing-plans (chia phase)
- **Mục đích:** Định nghĩa CHUẨN ai sở hữu/quản lý dữ liệu gì giữa SSO/Identity và các app con (Kế toán, Giao việc…), để dữ liệu **một nguồn**, ranh giới rõ, dễ onboard app mới.

## 1. Bối cảnh & vấn đề
Sau cut-over, `masterceo_identity` đang là **bản copy** của identity từ `digital_book` → 2 bản song song, dễ lệch (tạo user/đổi mật khẩu một bên không đồng bộ). Đồng thời `Tenant` đang lẫn cả field định danh chung lẫn field riêng Kế toán (`modules/nganh/glossary`). Cần chuẩn hoá: identity là **nguồn duy nhất** cho user/công ty/membership/entitlement; app con tự giữ role-chức-năng + config + nghiệp vụ.

## 2. Nguyên tắc
**"Dùng chung → Identity (app chính); riêng từng app → app con."** ID toàn cục (`userId`, `tenantId` = `_id` ở identity) xuyên suốt mọi app. 3 tầng sở hữu:
1. **Identity/SSO** — danh tính + công ty + ai-thuộc-công-ty + công-ty-dùng-app-nào + cấp quản trị (admin/member, superAdmin).
2. **App con — authz + config** — vai trò chức năng + quyền + cấu hình app theo công ty.
3. **App con — domain** — dữ liệu nghiệp vụ.

## 3. Tầng 1 — IDENTITY/SSO (`masterceo_identity`)

| Collection | Trường chính | Ghi chú |
|---|---|---|
| `users` | `_id`, `email` (unique toàn hệ), `hoTen`, `trangThai` (HOAT_DONG/KHOA), `isActive`, `avatarUrl?` | Tài khoản toàn cục |
| `user_credentials` | `userId`, `password` (bcrypt), `refreshToken` (hash), `lastLoginAt`, `isActive` | Xác thực |
| `tenants` | `_id`, `name`, `slug` (unique), `maSoThue`, `diaChi`, `dienThoai`, `email`, `nguoiDaiDien`, `isActive` | **CHỈ field định danh chung**. KHÔNG còn `modules/nganh/glossary/dashboardBlocks` |
| `memberships` (đổi tên từ `user_tenants`) | `userId`, `tenantId`, `isActive`, **`role`: `'admin' \| 'member'`** | Membership + **cấp quản trị identity** (thô). KHÔNG chứa role chức năng của app |
| `apps` | `appId`, `name`, `description?`, `iconUrl?`, `feUrl`, `isActive` | Danh bạ app con |
| `tenant_apps` | `tenantId`, `appId`, `isActive` | **Entitlement**: công ty được dùng app nào (cấp phép) |

- **superAdmin**: theo email cố định `SUPER_ADMIN_EMAIL = 'admin@company.com'` (full quyền, mọi công ty).
- **Identity quản lý (qua Portal)**: tạo/sửa user, tạo/sửa công ty, gán membership (admin/member), bật/tắt app cho công ty.
- Token vẫn **chỉ danh tính** `{sub, email, tenantId}` (app tự nạp role chức năng).

> `memberships.role` (`admin/member`) ≠ role chức năng. Nó chỉ quyết định **quyền quản trị ở Portal**.

## 4. Tầng 2+3 — APP CON (Kế toán = `digital_book`)

**Khuôn chuẩn cho MỌI app con** (key theo `userId`/`tenantId` của identity):

| Nhóm | Kế toán cụ thể | Ghi chú |
|---|---|---|
| **(a) Role chức năng theo công ty** | `app_user_roles` (MỚI): `(userId, tenantId) → vaiTro` (+ field app cần) | **Vai trò RIÊNG từng app**. Là dữ liệu role hiện ở `user_tenants.role`, chuyển sang đây |
| **(b) Định nghĩa vai trò + quyền** | `vai_tro`, `phan_quyen` (role → permissions, theo tenant) | Của riêng app |
| **(c) Config app theo công ty** | `tenant_app_config` (MỚI): `tenantId → { modules, nganh, glossary, dashboardBlocks }` + config menu/lĩnh vực (`linh_vuc`, `menu_catalog`) | **Lĩnh vực + menu là RIÊNG Kế toán** (chuyển từ field trên Tenant) |
| **(d) Dữ liệu nghiệp vụ** | chứng từ, tài khoản, báo cáo… | Domain |

→ Giao việc onboard sau theo đúng 4 nhóm này; identity dùng lại nguyên.

### Nguyên tắc quan trọng: "Sở hữu" ≠ "Ai được quản lý"
- **Ownership (thuộc app nào)** theo DOMAIN của dữ liệu, KHÔNG theo người quản lý.
- **Authorization (ai được sửa)** là rule riêng, có thể là superAdmin ngay cả với dữ liệu của app con.
- VD: **Quản lý lĩnh vực** (định nghĩa `linh_vuc`/menu + gán lĩnh vực cho công ty) **chỉ superAdmin** được sửa, NHƯNG bản chất là chức năng của **Kế toán** → **để Ở KẾ TOÁN**, chỉ là màn đó **gate theo superAdmin** (Kế toán BE check `SUPER_ADMIN_EMAIL` — đã có sẵn). KHÔNG đẩy lên identity chỉ vì superAdmin quản.
- Tóm: cái gì là **khái niệm dùng chung** (user/công ty/membership/entitlement) → identity. Cái gì là **khái niệm của app** (lĩnh vực, menu, vai trò, nghiệp vụ) → app con, dù người sửa là superAdmin.

## 5. Cấp quản trị + ma trận quyền quản lý (Portal)

| Hành động | superAdmin | Admin công ty | Member |
|---|:--:|:--:|:--:|
| Tạo/sửa/xoá công ty bất kỳ | ✅ | ❌ | ❌ |
| Sửa thông tin công ty của mình | ✅ | ✅ | ❌ |
| Tạo user + gán vào công ty mình | ✅ | ✅ (chỉ cty mình) | ❌ |
| Quản lý user công ty khác | ✅ | ❌ | ❌ |
| Đặt admin/member cho công ty mình | ✅ | ✅ (trong cty mình) | ❌ |
| Bật/tắt app cho công ty (entitlement) | ✅ | ❌ | ❌ |
| Reset mật khẩu user trong cty mình | ✅ | ✅ | ❌ |

- "Admin công ty" = `memberships.role === 'admin'` cho tenant đó.
- Tạo user bởi Admin công ty = tạo-mới-hoặc-gắn user toàn cục vào công ty mình (theo email); KHÔNG đụng membership của user ở công ty khác.

## 6. Các luồng chính
- **Login (Portal)**: identity verify mật khẩu → membership (các công ty user thuộc) ⋈ `tenant_apps` → lưới **app mỗi công ty được dùng**. (Công ty chỉ bật Kế toán → chỉ hiện Kế toán; chỉ Giao việc → chỉ Giao việc.)
- **Chọn app → vào app**: `/auth/refresh {tenantId}` → access-token `{sub,email,tenantId}`. App con tra **role chức năng** ở `app_user_roles` → `phan_quyen` → menu/quyền; tra config app theo công ty ở `tenant_app_config`.
- **Entitlement enforcement**: app con kiểm `tenant_apps` (tenant có bật app này) — nếu không → chặn (đề phòng truy cập trực tiếp).
- **Quản trị**: Portal kiểm superAdmin(email) / `memberships.role==='admin'` theo ma trận §5.

## 7. Kế toán đọc dữ liệu ở đâu (sau chuẩn hoá)
- **Connection 2** tới `masterceo_identity`: `users`, `user_credentials`, `tenants`, `memberships`, `tenant_apps` (đọc; ghi qua flow quản trị nếu cần).
- **Connection 1** `digital_book` (như cũ): `app_user_roles`, `vai_tro`, `phan_quyen`, `tenant_app_config`, nghiệp vụ.
- `AuthzLoaderService`: role từ `digital_book.app_user_roles` (theo userId+tenantId) → `phan_quyen`. (Đổi từ "đọc user_tenants" sang "app_user_roles".)
- auth-service getMe: user/tenant từ identity; role/permissions từ digital_book; module/glossary từ `tenant_app_config`.

## 8. Khác hiện trạng → việc cần làm (tóm tắt)
1. **Identity**: đổi `user_tenants`→`memberships` (role chỉ `admin|member`); bỏ field Kế toán khỏi `tenants`; thêm `tenant_apps`; endpoint + guard quản trị (superAdmin/companyAdmin); endpoint user/tenant CRUD.
2. **Kế toán**: thêm connection identity; tạo `app_user_roles` (chuyển role từ user_tenants cũ) + `tenant_app_config` (chuyển modules/nganh/glossary); `AuthzLoaderService` & getMe đọc đúng nguồn; bỏ đọc users/tenants ở digital_book; màn "set lĩnh vực cho công ty".
3. **Portal**: màn quản lý Công ty + User + Membership(admin/member) + Entitlement, phân quyền theo ma trận.
4. **Data migrate**: từ bản copy hiện tại → tách `app_user_roles`/`tenant_app_config` (digital_book) và `memberships.role=admin/member` (identity, suy từ role cũ: "Admin"→admin, còn lại→member); set `tenant_apps` (mọi tenant hiện có → bật `ke-toan`).
5. Xoá field/bản thừa sau khi chuyển.

## 9. Chia phase (mỗi phase = spec/plan/triển khai riêng, có cổng kiểm thử)
- **P1 — Identity nền chuẩn**: `memberships`(role admin/member) + `tenant_apps` + tách field Kế toán khỏi `tenants` (chỉ ở schema identity) + endpoint đọc (me/apps theo entitlement, me/tenants) cập nhật. Test in-memory.
- **P2 — Kế toán một-nguồn**: connection identity; `app_user_roles` + `tenant_app_config`; AuthzLoader/getMe đọc đúng; migrate role/config; bỏ copy. (Hard dependency P1.)
- **P3 — Portal admin UI**: quản lý công ty/user/membership/entitlement theo ma trận quyền. **Dùng lại giao diện quản lý công ty + quản lý user/thành viên của Kế toán** (layout/component) để đồng nhất. (Lĩnh vực KHÔNG ở đây — vẫn là màn superAdmin-only trong Kế toán.)
- **P4 — Entitlement enforcement + dọn**: app kiểm tenant_apps; xoá field/bản thừa; hoá đơn hồi quy.

## 10. Ngoài phạm vi (sau)
- Giao việc onboard theo khuôn (Sub-plan riêng).
- Role chức năng khác nhau cùng công ty giữa nhiều app (đã hỗ trợ sẵn vì role ở app — chỉ là chưa dùng).
- Hardening: RS256/JWKS, audit log quản trị, rate-limit.

## 11. Rủi ro
- Đụng auth toàn hệ (AuthzLoader ở libs/auth dùng mọi service) → đổi nguồn role phải test kỹ + non-breaking khi deploy.
- 2 connection trong Kế toán: cấu hình + transaction ranh giới (user ở identity, nghiệp vụ ở digital_book — không transaction xuyên DB; chấp nhận eventual).
- Migrate role→(admin/member) + tách config: chạy idempotent + backup, đối soát.
- superAdmin vẫn theo email cố định — cân nhắc chuyển sang cờ DB ở P sau (ngoài phạm vi).
