# MasterCeo Platform — GĐ 1: Nền danh tính SSO

- **Ngày:** 2026-06-29
- **Trạng thái:** Đã duyệt thiết kế, chờ viết implementation plan
- **Repo liên quan:** `ke-toan-so` (Kế toán), `task-management` (Giao việc), + service Identity mới
- **Giai đoạn:** 1/N của nền tảng ERP "MasterCeo"

## 1. Bối cảnh & Mục tiêu

Hiện có hai sản phẩm chạy độc lập:

- **ke-toan-so** ("Kế toán") — NestJS microservices (gateway 3000 + 7 service) + React 18/Vite (CHanlder), MongoDB DB `digital_book`.
- **task-management** ("Giao việc") — NestJS monolith (port 3000, prod 3010) + React 19/Vite (Zustand), MikroORM, MongoDB DB `task-management`.

Cả hai dùng **chung một server MongoDB** (`dbadmin@...:27017`), đều **JWT + bcrypt(10)**, đều có **multi-tenant với luồng temp-token → chọn tenant** gần như giống hệt.

**Tầm nhìn dài hạn:** một nền tảng ERP "MasterCeo" gồm nhiều app **dùng chung tài khoản** và **giao tiếp dữ liệu với nhau** (ví dụ: chức năng "kiểm soát" bên Kế toán → bên Giao việc ra báo cáo "nhân sự nào kiểm soát bao nhiêu giao dịch/tháng").

**Mục tiêu GĐ 1 (phạm vi spec này):** Đăng nhập một lần ở cổng MasterCeo → chọn ứng dụng → chọn công ty → vào app, **không phải đăng nhập lại** khi chuyển app. Tài khoản và công ty (tenant) **dùng chung** giữa các app.

> Giao tiếp liên-app (outbox/event, báo cáo chéo) là **GĐ 2** — sẽ có spec riêng. GĐ 1 chỉ dựng nền danh tính + cổng, nhưng thiết kế ID toàn cục để GĐ 2 join dữ liệu dễ dàng.

## 2. Nguyên tắc xương sống

1. **Một danh tính duy nhất.** Một Identity/SSO service độc lập sở hữu `users`, `user_credentials`, `user_tenants`, `tenants`. Mọi app là *client*. `userId` và `tenantId` là **ID toàn cục**, dùng y hệt ở mọi app.
2. **Danh tính chung, phân quyền riêng.** *Bạn là ai + thuộc công ty nào* do Identity quản. *Làm được gì trong từng app* do từng app tự quản (key theo `userId`+`tenantId`). Đây là chìa khoá cho báo cáo chéo ở GĐ 2.
3. **Tách vật lý ngay (Mức 2).** Auth tách thành service độc lập (repo/deploy riêng) vì sắp có thêm app và muốn kiến trúc sạch từ đầu. Token + endpoint là contract rõ ràng.

## 3. Quyết định thiết kế đã chốt

| # | Quyết định | Chọn |
|---|-----------|------|
| 1 | Mức tách auth | **Mức 2** — service Identity độc lập (repo/deploy riêng) |
| 2 | App chủ tài khoản (IdP) | **ke-toan-so** là nguồn — Identity dựng từ code auth-service ke-toan-so |
| 3 | Kho danh tính | **DB riêng `masterceo_identity`** (tách khỏi `digital_book`) |
| 4 | Portal FE | **FE portal riêng** (`portal/`); Kế toán & Giao việc bỏ màn login riêng |
| 5 | Luồng sau login | **Chọn App → chọn Công ty** |
| 6 | Domain prod | **Cùng domain gốc** (vd `*.masterceo.vn`) |
| 7 | Mô hình role | **Mỗi app tự quản role**; Identity chỉ giữ membership |
| 8 | Tenant | **Dùng chung** giữa các app |

## 4. Kiến trúc đích (nền tảng) & phạm vi GĐ1

```
                    ┌──────────── MasterCeo Portal (FE riêng) ──┐
                    │  Login 1 lần → chọn App → chọn Công ty     │
                    └───────────────────┬───────────────────────┘
                                        │  JWT thống nhất (secret chung)
   ┌────────────────┬───────────────────┼────────────────────┬─────────────────┐
   ▼                ▼                                          ▼                 ▼
┌────────┐   ┌──────────────┐                          ┌──────────────┐   (app #3,#4…)
│ Kế toán│   │  Giao việc   │   …                       │  Identity/SSO │◄── nguồn sự thật
│  (FE)  │   │   (FE)       │                          │   SERVICE    │    tài khoản+tenant
└───┬────┘   └──────┬───────┘                          │ users/tenants│
    │ verify JWT    │ verify JWT                        └──────┬───────┘
┌───▼─── be ke-toan-so ───┐  ┌── be task-management ──┐        │ owns
│ gateway + services      │  │ monolith                │   masterceo_identity
│ (role/quyền KT riêng)   │  │ (role task riêng)       │   (users, user_credentials,
└─────────────────────────┘  └─────────────────────────┘    user_tenants, tenants, apps)

MongoDB (1 server):
  masterceo_identity : users, user_credentials, user_tenants, tenants, apps   ← Identity sở hữu
  digital_book       : dữ liệu kế toán (KHÔNG còn sở hữu users/tenants)
  task-management    : work_items, assignments, departments, …  (+ membership/role phía task)
```

GĐ 2 (ngoài phạm vi): INTEGRATION BACKBONE (outbox → publisher → read-model, API nội bộ service-to-service).

## 5. Identity/SSO Service (mới)

### 5.1 Hình thức
- NestJS **standalone**, repo/deploy riêng. Dựng bằng cách **bê code auth-service của ke-toan-so** (đã có login, select-tenant, switch-tenant, register, change-password, JWT service multi-tenant) và **gỡ phụ thuộc `@app/*`** — copy phần tối thiểu cần dùng (entities danh tính + jwt service), không kéo theo toàn bộ libs kế toán.
- Sở hữu DB **`masterceo_identity`**.

### 5.2 Data model (collections)

`users` (giữ shape ke-toan-so):
- `_id`, `email` (unique), `hoTen`, `trangThai` ('HOAT_DONG'|'KHOA'), `isActive`, `createdAt/updatedAt/deletedAt`.

`user_credentials`:
- `_id`, `userId`, `password` (bcrypt-10), `refreshToken`|null, `lastLoginAt`|null, `isActive`.

`user_tenants` (**membership thuần — KHÔNG chứa role app**):
- `_id`, `userId`, `tenantId`, `isActive`.
- *Khác hiện tại:* trường `role` cũ trong `user_tenants` của ke-toan-so được **gỡ khỏi Identity**; role được chuyển về phía từng app (mục 7, 8).

`tenants` (giữ shape ke-toan-so + bổ sung):
- Các field hiện có (`name`, `slug`, `maSoThue`, `diaChi`, …, `modules`, `nganh`, `glossary`, …).
- **Bổ sung** `apps: string[]` — danh sách `appId` mà công ty này được dùng (entitlement theo app, mở rộng khái niệm `modules`).

`apps` (registry mới):
- `_id`/`appId` (vd `ke-toan`, `giao-viec`), `name`, `description`, `iconUrl`, `feUrl` (nơi redirect FE), `isActive`.

### 5.3 Token contract (JWT thống nhất)
HS256, **secret chung** cho mọi app. Payload **chỉ danh tính**:
```json
{ "sub": "<userId>", "email": "...", "tenantId": "<tenantId>", "iat": 0, "exp": 0 }
```
- **Không** nhúng role/permissions (mỗi app tự nạp theo `userId`+`tenantId`).
- Temp token (multi-tenant/chọn app): `{ "sub", "email", "type": "temp", "iat", "exp" }` (giữ như ke-toan-so).
- Refresh token: dùng cho phiên SSO (mục 6).

### 5.4 Endpoints (contract IdP)
- `POST /auth/login` — single membership → `accessToken`; nhiều → `tempToken` + danh sách tenant (kèm app khả dụng mỗi tenant).
- `POST /auth/select-tenant` — đổi `tempToken` lấy `accessToken` gắn `tenantId`.
- `POST /auth/switch-tenant`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/change-password`.
- `GET /me` — hồ sơ user hiện tại.
- `GET /me/apps` — danh sách app user vào được (gộp theo các tenant user thuộc + entitlement `tenants.apps`). Phục vụ luồng **Chọn App trước**.
- `GET /me/tenants?app=<appId>` — các công ty user thuộc **và** có app đó.
- `GET /tenants/:id`, `GET /users/:id` — cho app khác lấy chi tiết; bảo vệ bằng **xác thực service-to-service** (API key/JWT nội bộ).
- (tuỳ chọn) `POST /introspect` — verify token tập trung (dự phòng; mặc định app verify cục bộ bằng secret chung).

## 6. Portal FE & luồng SSO

### 6.1 Portal FE (`portal/`)
App FE nhỏ, độc lập. Màn hình:
1. **Login** (email/mật khẩu).
2. **Lưới chọn App** — từ `GET /me/apps`.
3. **Chọn Công ty** — từ `GET /me/tenants?app=<appId>`.
4. **Vào app** — `POST /auth/select-tenant` → nhận access-token (gắn app+tenant) → điều hướng sang FE app tương ứng (`apps.feUrl`).

Kế toán & Giao việc **bỏ màn login riêng**; nếu vào trực tiếp mà chưa có phiên → redirect về portal.

### 6.2 Cơ chế SSO (login 1 lần, không nhập lại mật khẩu)
- Khi login, Identity đặt **cookie phiên (refresh/session) httpOnly trên domain gốc `.masterceo.vn`**.
- Vào bất kỳ app nào: app/portal dùng cookie phiên để **lấy access-token âm thầm** (qua `refresh`/`select-tenant`) — **không phải đăng nhập lại**, chỉ cần chọn công ty nếu chưa chọn.
- Access-token (ngắn hạn, gắn app+tenant) lưu **localStorage riêng từng app** và gửi qua header `Authorization: Bearer`.
- Đăng xuất: xoá cookie phiên ở Identity → mọi app mất phiên.

> SSO ở đây = **single authentication** (đăng nhập một lần). Mỗi app vẫn có access-token riêng gắn tenant/app, nhưng người dùng không nhập lại mật khẩu.

### 6.3 Local dev
Không có domain gốc thật → dùng cookie trên `localhost` + cấu hình CORS/credentials; hoặc handoff token qua redirect `?token=` ngắn hạn. Thiết kế cookie-domain qua biến môi trường để đổi giữa dev/prod.

## 7. Thay đổi ở ke-toan-so

- **JwtGuard** (`libs/auth/src/guards/jwt.guard.ts`): verify JWT do Identity phát (đã HS256 — chỉ cần **khớp secret chung** + đọc `sub`/`email`/`tenantId`). Gateway vẫn forward header như cũ.
- **Bỏ sở hữu `users`/`tenants`** trong `digital_book`. Nơi cần chi tiết user/công ty (tên, danh sách) → gọi **API Identity** (`GET /users/:id`, `GET /tenants/:id`) qua một client mỏng **có cache ngắn**. `TenantSubscriber` vẫn lọc theo `tenantId` lấy từ token (không đổi).
- **Role/quyền kế toán** chuyển về phía kế toán quản: vai trò của user trong tenant cho app Kế toán lưu phía kế toán (key `userId`+`tenantId`); bảng `phan_quyen` giữ nguyên cách nạp quyền theo vai trò + tenant.
- **auth-service** của ke-toan-so: các luồng login/select-tenant **chuyển sang Identity**; phần còn lại (nếu có) thu gọn thành bootstrap nhận token Identity.

## 8. Thay đổi ở task-management

- **`jwt.strategy`** (`libs/core/src/auth/jwt.strategy.ts`): verify JWT Identity (**secret chung**), map `{sub,email,tenantId}` → `RequestUser`. `role`/`departmentId` **nạp từ membership phía task** (collection mới phía task, key `userId`+`tenantId`).
- **Bỏ `users`/`tenants`** làm nguồn auth; chỉ giữ dữ liệu nghiệp vụ + membership/role phía task.
- Lấy chi tiết user/công ty khi cần → API Identity (như ke-toan-so).

## 9. Migration dữ liệu (cả 2 app đều có dữ liệu thật)

Script **dry-run trước + idempotent + xuất báo cáo đối soát**:

1. **Seed `masterceo_identity`** từ ke-toan-so: copy thẳng `users`, `user_credentials`, `user_tenants` (gỡ field `role` → đưa role kế toán về phía kế toán), `tenants` (cùng shape).
2. **Nhập user task-management:** khớp theo **email**.
   - Trùng email → dùng lại user Identity hiện có.
   - Mới → tạo `users` + `user_credentials` **mang theo hash bcrypt cũ** (cả 2 đều bcrypt-10 → mật khẩu cũ vẫn dùng được).
3. **Map công ty trùng** (theo tên/MST) → cùng `tenantId` Identity; sinh bảng ánh xạ `tenantId(task) → tenantId(identity)`.
4. **Tạo membership** `user_tenants` cho các cặp user×tenant từ task.
5. **Role phía task:** tạo collection membership/role phía task từ `user.role` cũ + `tenantId`.
6. **Viết lại `tenantId`** trong dữ liệu nghiệp vụ task (`work_items`, `assignments`, …) theo bảng ánh xạ.
7. **Entitlement:** set `tenants.apps` cho mỗi công ty (Kế toán và/hoặc Giao việc) dựa trên dữ liệu hiện có.

**Quy tắc xung đột:**
- Cùng email = cùng người.
- Mật khẩu **ke-toan-so ưu tiên**; user chỉ-có-ở-task mang hash riêng.
- Không thể tự dò "cùng mật khẩu" (bcrypt) → xuất **báo cáo xung đột** (email tồn tại ở cả 2) để soát tay; user có thể đặt lại mật khẩu nếu cần.

## 10. Thứ tự thực thi GĐ 1

1. **Dựng Identity service + DB `masterceo_identity`**; migrate danh tính ke-toan-so vào (bước 9.1). Verify login qua Identity (Postman/e2e).
2. **ke-toan-so trỏ sang Identity** (verify token, đọc chi tiết qua API, chuyển role kế toán về phía kế toán). Verify app Kế toán chạy end-to-end.
3. **Migrate task-management** (bước 9.2–9.6) + **task-management trỏ sang Identity**. Verify app Giao việc end-to-end.
4. **Dựng portal FE** + luồng Chọn App → Công ty + cookie phiên SSO.
5. **Cắt sang:** cả 2 app login qua portal; gỡ màn login cũ.

Mỗi bước có cổng kiểm thử trước khi sang bước sau (giảm rủi ro vì dữ liệu thật).

## 11. Rủi ro & lưu ý

- **Hai ORM đọc chung collection:** Identity (TypeORM, kế thừa ke-toan-so) là nơi **ghi** danh tính; các app **đọc qua API** (không cho 2 ORM cùng map-ghi 1 collection). Nếu dev cần đọc trực tiếp DB cho nhanh thì chỉ **read-only**.
- **Bảo mật secret:** secret JWT chung phải đồng bộ qua biến môi trường ở cả 3 nơi; cân nhắc chuyển HS256 → RS256 (Identity ký bằng private key, app verify bằng public key) ở GĐ sau để app không cần giữ secret ký — *ngoài phạm vi GĐ1, ghi nhận hướng*.
- **Phụ thuộc Identity:** ở Mức 2, mọi app phụ thuộc Identity để đăng nhập. Cần Identity ổn định/HA khi lên prod.
- **Migration không thuận nghịch dễ dàng:** chạy dry-run + backup DB trước khi chạy thật; script idempotent để chạy lại an toàn.
- **Cookie domain dev vs prod:** cấu hình qua env; test SSO trên domain thật trước khi go-live.

## 12. Ngoài phạm vi (để GĐ sau)

- GĐ 2: outbox/event, API nội bộ service-to-service, read-model báo cáo chéo (use case "kiểm soát → báo cáo nhân sự").
- Message broker (RabbitMQ/Kafka) — chỉ khi tải lớn.
- RS256/JWKS, đăng nhập SSO bên thứ ba (Google…), onboarding app thứ 3.
