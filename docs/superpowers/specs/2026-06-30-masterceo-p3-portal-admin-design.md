# MasterCeo P3 — Portal Admin UI (Design)

- **Ngày:** 2026-06-30
- **Trạng thái:** Đã chốt hướng (chờ user review spec → writing-plans)
- **Phụ thuộc cứng:** P1 (identity entitlement/membership) + P2 (Kế toán một-nguồn) — đã deploy live.
- **Repo chính:** `/Users/os_anhvt/Documents/Dino/identity-service` (BE `AdminModule` + `portal/` FE). Một phần nhỏ ở `ke-toan-so` (lazy provisioning).
- **Spec gốc:** `docs/superpowers/specs/2026-06-29-masterceo-standard-model-design.md` (§5 ma trận quyền, §9 P3).

## 1. Mục tiêu
Đưa quản trị **dùng chung** (Công ty, User, Membership admin/member, Entitlement app) vào **Portal** (identity là nguồn), thay vì làm trong Kế toán. Cái riêng của Kế toán (lĩnh vực/menu/phan_quyen/vai trò chức năng) **vẫn ở Kế toán**. Giao diện antd dựng lại theo bố cục quản lý của Kế toán cho đồng nhất.

## 2. Quyết định đã chốt
- **Phạm vi đợt đầu:** đủ 4 mảng trong 1 spec — Company CRUD, User CRUD, Membership (admin/member), Entitlement (bật/tắt app cho công ty).
- **UI:** dựng lại bằng **antd** (portal đang antd 6) theo bố cục TenantPage/TenantMembersModal/ThanhVienPage của Kế toán. KHÔNG port shadcn/Tailwind.
- **Provisioning Kế toán = lazy:** Portal chỉ tạo **định danh** (Tenant + admin membership + entitlement). Kế toán **tự đảm bảo** `tenant_app_config`(mặc định KE_TOAN) + `phan_quyen` role 'Admin' + `app_user_roles` cho admin **idempotent** khi admin công ty vào Kế toán lần đầu. Không ghi chéo DB từ Portal.

## 3. Phân quyền (ma trận §5 — nhắc lại)
| Hành động | superAdmin | Admin công ty (membership.role==='admin') | member |
|---|:--:|:--:|:--:|
| Tạo/xoá công ty bất kỳ | ✅ | ❌ | ❌ |
| Sửa thông tin công ty của mình | ✅ | ✅ (cty mình) | ❌ |
| Tạo user + gán vào công ty mình | ✅ | ✅ (cty mình) | ❌ |
| Quản lý user công ty khác | ✅ | ❌ | ❌ |
| Đặt admin/member cho công ty mình | ✅ | ✅ (cty mình) | ❌ |
| Bật/tắt app cho công ty (entitlement) | ✅ | ❌ | ❌ |
| Reset mật khẩu user trong cty mình | ✅ | ✅ | ❌ |

- **superAdmin** = email `SUPER_ADMIN_EMAIL` (`admin@company.com`).
- **Admin công ty** = `user_tenants.role==='admin'` (identity) cho tenant đó.
- "Tạo user bởi Admin công ty" = tạo-mới-hoặc-gắn user toàn cục (theo email) vào công ty mình; KHÔNG đụng membership user ở công ty khác.

## 4. Backend — identity-service `AdminModule` (mới)
- Module mới `src/admin/` (controller + service), import `TypeOrmModule.forFeature([User, UserCredential, UserTenant, Tenant, App, TenantApp])` + AuthModule.
- **Xác thực = SessionGuard (cookie)** — Portal chạy bằng cookie session (pre-app-selection). `req.user = {id, email}`. tenantId lấy từ route param, verify lại bằng membership.
- **Authz helper/guard** (`AdminAuthz`): nạp `User` theo `req.user.id`; `isSuperAdmin = user.email===SUPER_ADMIN_EMAIL`; `isCompanyAdmin(tenantId) = UserTenant{userId,tenantId,role:'admin',isActive}` tồn tại. Mỗi endpoint kiểm theo ma trận §3. Thao tác toàn-công-ty (tạo/xoá tenant, entitlement) → superAdmin only; thao tác trong-công-ty (user/membership/reset-pw) → superAdmin HOẶC companyAdmin của tenant đó.
- **Endpoints** (global prefix `/api`):

| Nhóm | Method Path | Quyền | Ghi chú |
|---|---|---|---|
| Identity-of-caller | GET `/api/me/identity` | session | trả `{userId,email,isSuperAdmin,adminTenantIds:string[]}` để FE ẩn/hiện khu quản trị + scope |
| Users | GET `/api/admin/users` | superAdmin (all) / companyAdmin (member của cty mình) | list + search; companyAdmin chỉ thấy user thuộc cty mình |
| | POST `/api/admin/users` | superAdmin / companyAdmin(+tenantId cty mình) | tạo User+UserCredential (mật khẩu mặc định `123456`); nếu companyAdmin → bắt buộc gán vào cty mình (membership) |
| | PUT `/api/admin/users/:id` | superAdmin / companyAdmin(cty chung) | sửa hoTen/email/trangThai |
| | POST `/api/admin/users/:id/reset-password` | superAdmin / companyAdmin(cty chung) | reset về `123456` |
| | PATCH `/api/admin/users/:id/toggle-status` | superAdmin / companyAdmin(cty chung) | khoá/mở |
| Tenants | GET `/api/admin/tenants` | superAdmin (all) / companyAdmin (cty mình) | list + admins (membership role admin) |
| | POST `/api/admin/tenants` | superAdmin | tạo Tenant(định danh) + admin user/membership('admin') + entitlement(apps chọn). KHÔNG đụng Kế toán config |
| | PUT `/api/admin/tenants/:id` | superAdmin / companyAdmin(cty mình) | sửa field định danh |
| | DELETE `/api/admin/tenants/:id` | superAdmin | soft-delete tenant + memberships |
| Membership | GET `/api/admin/tenants/:id/members` | superAdmin / companyAdmin(:id) | list thành viên + role(admin/member) |
| | POST `/api/admin/tenants/:id/members` | superAdmin / companyAdmin(:id) | thêm user có sẵn (theo email/id) hoặc tạo mới; set role admin/member |
| | PUT `/api/admin/tenants/:id/members/:userId` | superAdmin / companyAdmin(:id) | đổi role(admin/member) / isActive |
| | DELETE `/api/admin/tenants/:id/members/:userId` | superAdmin / companyAdmin(:id) | gỡ membership (soft) |
| Entitlement | GET `/api/admin/tenants/:id/apps` | superAdmin / companyAdmin(:id) (read) | tenant_apps + trạng thái |
| | PUT `/api/admin/tenants/:id/apps` | superAdmin | bật/tắt app cho cty (upsert tenant_apps) |
| Apps catalog | GET `/api/admin/apps` | session | list App (cho picker entitlement) |

- **Lưu ý:** identity KHÔNG có phan_quyen/vai_tro/lĩnh vực → Portal KHÔNG quản các thứ đó. Membership role chỉ `admin|member`. Vai trò chức năng Kế toán vẫn quản trong Kế toán.
- DTO + ValidationPipe (whitelist/forbidNonWhitelisted) như hiện có. Trả `{success,data}` đồng bộ với auth controller.

## 5. Frontend — portal (antd, bố cục Kế toán)
- **Định tuyến:** thêm **react-router** (gọn) cho khu admin, hoặc mở rộng state-machine `Step` thêm `'admin'`. Khuyến nghị react-router-dom: `/` (flow login/app/tenant hiện tại) + `/admin/*` (CompanyList, UserList). Giữ flow SSO hiện tại nguyên vẹn.
- **Vào khu quản trị:** AppPicker thêm nút "Quản trị" hiển thị nếu `/api/me/identity` → `isSuperAdmin || adminTenantIds.length>0`. (Gọi `/me/identity` lúc load app.)
- **Màn (antd, theo §3.1–3.3 map Kế toán):**
  - **CompanyList** (superAdmin): bảng (name, maSoThue, diaChi, slug, admins tags, apps/entitlement tags, isActive) + create (form định danh + section "Tài khoản Admin" existing/new + chọn apps entitlement) + edit + delete(Popconfirm) + nút mở Members modal + nút Entitlement modal.
  - **MembersModal** (per company): bảng (hoTen, email, role admin/member tag, isActive) + thêm (existing/new, set role admin/member) + đổi role + remove. companyAdmin cũng dùng màn này cho cty mình.
  - **UserList**: bảng (hoTen, email, trạng thái) + create/edit/reset-password/toggle. superAdmin thấy all; companyAdmin thấy user cty mình.
  - **EntitlementModal** (superAdmin): list apps + switch bật/tắt cho công ty.
- `src/lib/api.ts`: thêm các call admin (cookie credentials, base `/api`). `src/types.ts`: thêm type AdminUser/AdminTenant/Member/Entitlement/MeIdentity.
- antd theme teal hiện có; borderRadius 0 (đồng nhất). Validation messages tiếng Việt như Kế toán.

## 6. Lazy provisioning phía Kế toán (ke-toan-so)
- Khi admin công ty (identity membership.role==='admin') vào Kế toán cho tenant T mà T **chưa** có cấu hình Kế toán:
  - đảm bảo `tenant_app_config(T)` tồn tại (mặc định `modules:['KE_TOAN']`, glossary {}, nganh null);
  - đảm bảo `phan_quyen` role 'Admin' cho T (full permissions — dùng lại `generateAllPermissions`/`ensureAdminRole` của master-data);
  - đảm bảo `app_user_roles(adminUserId, T, 'Admin')`.
- **Hook ở đâu:** auth-service `selectTenant`/`switchTenant` (hoặc 1 helper `ensureKeToanProvisioned(tenantId, userId, isCompanyAdmin)`), idempotent, chỉ chạy khi thiếu. Member thường không tạo Admin role (chỉ tạo khi user là admin của tenant). Không làm chậm đáng kể (chỉ findOne khi đã có).
- **Ngoài phạm vi:** lĩnh vực ngoài KE_TOAN do superAdmin set trong màn lĩnh vực của Kế toán (đã có).

## 7. Các luồng
- **superAdmin tạo công ty (Portal):** POST /admin/tenants → identity Tenant + admin membership('admin') + entitlement(apps). Admin đăng nhập Portal → chọn Kế toán → Kế toán lazy-provision config+phan_quyen+app_user_role → có menu.
- **companyAdmin thêm user (Portal):** POST /admin/users (+ membership cty mình) hoặc POST /admin/tenants/:id/members. User mới mật khẩu 123456.
- **Bật thêm app cho công ty:** superAdmin PUT /admin/tenants/:id/apps → công ty thấy app mới ở Portal.

## 8. Test
- BE: e2e in-memory (mongodb-memory-server như P1) cho authz matrix (superAdmin vs companyAdmin vs member vs cross-tenant) + CRUD + entitlement. Unit cho AdminAuthz.
- FE: Vitest mock fetch cho api client + render màn chính (như portal phase 2).
- Lazy provisioning: unit/e2e Kế toán (ensureKeToanProvisioned idempotent, chỉ admin).

## 9. Ngoài phạm vi (sau)
- P4: entitlement enforcement (app con chặn nếu tenant_apps tắt) + dọn field/collection thừa (slim Tenant entity, xoá copy digital_book).
- Audit log quản trị; RS256; superAdmin theo cờ DB thay email.
- Giao việc onboard.

## 10. Rủi ro
- SessionGuard hiện chỉ verify chữ ký (chưa DB hash-check) → admin endpoint dựa cookie hợp lệ; chấp nhận như hiện trạng (hardening sau). Thao tác ghi vẫn kiểm authz theo DB mỗi request.
- companyAdmin scope: phải chặn chặt cross-tenant (test kỹ) — companyAdmin KHÔNG được đụng user/membership công ty khác.
- Lazy provisioning chạy trong luồng login Kế toán → phải idempotent + nhẹ (chỉ findOne khi đã provisioned) để không chậm/đua.
- react-router thêm vào portal phải giữ nguyên flow SSO + ServeStatic (SPA fallback) hiện tại.
