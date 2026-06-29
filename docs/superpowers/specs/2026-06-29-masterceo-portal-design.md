# MasterCeo SSO — GĐ Portal: Cổng đăng nhập + Identity session/cookie (Design)

- **Ngày:** 2026-06-29
- **Trạng thái:** Đã duyệt thiết kế, chờ writing-plans
- **Vị trí:** sau Sub-plan 1 (identity-service), Sub-plan 2 (ke-toan-so chấp nhận token Identity). Tương ứng "Sub-plan 4 — Portal + SSO" trong spec gốc.
- **Repo liên quan:** `identity-service` (thêm backend session/cookie) + repo MỚI `masterceo-portal` (FE). KHÔNG đụng task-management (hoãn).

## 1. Bối cảnh & Mục tiêu

Đã có: identity-service (auth backend, token chỉ danh tính, `/login`, `/select-tenant`, `/switch-tenant`, `/me`, `/me/apps`, `/me/tenants?app`); ke-toan-so BE chấp nhận token Identity (SP2). Còn thiếu **cổng MasterCeo**: đăng nhập 1 lần → chọn ứng dụng → chọn công ty → vào app, **không đăng nhập lại** khi chuyển app.

**Mục tiêu đợt này:** dựng (A) hạ tầng **session/cookie** ở identity cho SSO + (B) **Portal FE** (login → chọn app → chọn công ty → redirect sang app kèm tenant). Hook để app FE tự nhận token từ cookie (vào liền mạch thật) là **đợt sau**.

**Quyết định đã chốt:** cookie phiên trên domain gốc; bố trí **subdomain** (`masterceo.com.vn` portal, `ketoan.masterceo.com.vn`, `task.masterceo.com.vn`); phạm vi = identity cookie/refresh + Portal FE.

## 2. Vì sao cần session/cookie (không chỉ access-token localStorage)

- Subdomain khác nhau → **localStorage không chia sẻ** giữa portal và các app. Cookie scope `.masterceo.com.vn` thì mọi subdomain gửi kèm tự động → nền cho SSO.
- Chọn app + công ty xảy ra **TRƯỚC** khi có tenant → access-token (gắn tenant) không dùng được ở bước này → cần **session-cookie auth** cho `/me/apps`, `/me/tenants`.

## 3. Token model (2 tầng)

| | Session/refresh token | Access token |
|---|---|---|
| Mang | `{ sub, email, type:'refresh' }` (KHÔNG tenant) | `{ sub, email, tenantId }` (như hiện tại) |
| Ký bằng | `JWT_REFRESH_SECRET` (riêng của identity) | `JWT_SECRET` (chung với ke-toan-so) |
| Lưu ở | httpOnly cookie `mc_session` + hash trong `user_credentials.refreshToken` (revoke được) | client (app FE) localStorage, gửi `Authorization: Bearer` |
| Hết hạn | dài (vd 30d) | ngắn (24h như cũ) |

Cookie attrs: `httpOnly`, `sameSite='lax'`, `secure` (prod), `domain` = `process.env.COOKIE_DOMAIN` (prod `.masterceo.com.vn`; **dev để trống** → host-only `localhost`, chia sẻ giữa các port vì cookie không theo port), `path='/'`.

## 4. Bổ sung identity-service (Phần 1)

### 4.1 Endpoints
- `POST /auth/login` (đã có) — verify mật khẩu → **set cookie `mc_session`** (refresh token, lưu hash) → trả `{ user }`. (Không bắt buộc trả access-token cho portal; portal dùng cookie.)
- `GET /me/apps`, `GET /me/tenants?app` — **đổi guard sang `SessionGuard`** (đọc cookie `mc_session`) thay vì JwtGuard, vì gọi trước khi chọn tenant. (Hiện chưa nơi nào ngoài smoke test gọi 2 endpoint này bằng Bearer → đổi an toàn.)
- `POST /auth/refresh` (MỚI) — đọc cookie `mc_session` → verify + đối chiếu hash → body `{ tenantId }` → kiểm tra membership (như `switch-tenant`) → trả **access-token gắn tenant** `{ accessToken, tenant }`. Đây là endpoint app FE gọi lúc load (đợt hook sau), và portal có thể gọi để lấy token nếu cần.
- `POST /auth/logout` (MỚI/đổi) — xoá cookie `mc_session` + clear `user_credentials.refreshToken`.

### 4.2 SessionGuard
- Đọc cookie `mc_session` (cần `cookie-parser`), verify bằng `JWT_REFRESH_SECRET`, gán `request.user = { id, email }` (không tenant). Từ chối nếu thiếu/không hợp lệ.

### 4.3 CORS credentials
- `main.ts`: `app.enableCors({ origin: <danh sách origin portal+app theo env>, credentials: true })` (KHÔNG dùng `*` khi credentials). Dev: `http://localhost:<portal port>`.

### 4.4 Cookie infra
- `cookie-parser` middleware; helper set/clear cookie đọc `COOKIE_DOMAIN`/`NODE_ENV`.

### 4.5 Test (Phần 1)
- e2e (Mongo in-memory): login set cookie; `/me/apps` & `/me/tenants` chấp nhận cookie (từ chối khi không cookie); `/auth/refresh` cấp access-token đúng tenant + chặn tenant không thuộc; `/auth/logout` xoá. (supertest giữ cookie qua agent.)

## 5. Portal FE (Phần 2)

- Repo MỚI `masterceo-portal` (React 18 + Vite + Ant Design teal `#1f7769` + Tailwind, đồng bộ ke-toan-so). Dev port 5174 (tránh 8080 của ke-toan-so).
- **Màn hình:**
  1. **Login** — email/pw → `POST /auth/login` (`credentials:'include'`) → vào lưới app.
  2. **App picker** — `GET /me/apps` → lưới card (icon, tên). Chọn app → sang chọn công ty.
  3. **Tenant picker** — `GET /me/tenants?app=<appId>` → danh sách công ty (có search như TenantSelector ke-toan-so). Chọn → **redirect** `window.location = <app.feUrl>?tenant=<tenantId>`.
- **API client:** fetch wrapper luôn `credentials:'include'`; `VITE_IDENTITY_URL` (dev `http://localhost:3020`).
- Nếu chưa đăng nhập (gọi `/me/apps` 401) → về màn Login.
- Logout: `POST /auth/logout`.

### 5.1 Test (Phần 2)
- Unit/component test luồng (mock fetch): login→apps→tenants→redirect URL đúng. (Vitest + React Testing Library.)

## 6. Dev / smoke (chưa migrate)
- Seed identity dữ liệu giả (apps `ke-toan`/`giao-viec`, 1-2 tenant có `apps`, user single/multi) — tái dùng cách seed smoke SP1 (script `scripts/seed-dev.ts`).
- Smoke thủ công: chạy identity (3020) + portal (5174), login → chọn app → chọn công ty → xác nhận redirect URL + cookie `mc_session` set trên `localhost`.

## 7. Phân rã thực thi
- **Phần 1 (identity backend):** cookie-parser + cookie helper; refresh token (sign/verify/hash-store); `SessionGuard`; sửa `/auth/login` set cookie; đổi guard `/me/apps`+`/me/tenants`; `POST /auth/refresh`; `POST /auth/logout`; CORS credentials; e2e. → commit/push repo identity-service.
- **Phần 2 (portal FE):** scaffold repo `masterceo-portal`; API client; 3 màn; redirect; component test; seed-dev + smoke. → repo riêng.

## 8. Ngoài phạm vi (đợt sau)
- **Hook ke-toan-so FE:** lúc load đọc `?tenant` + gọi `/auth/refresh` (cookie) lấy access-token → lưu localStorage → chạy. Đây là mảnh làm "vào Kế toán không login lại" thành thật.
- task-management (Sub-plan 3).
- Migrate dữ liệu thật + deploy subdomain + cấu hình `COOKIE_DOMAIN`/CORS prod + cookie `secure`.
- RS256/JWKS.

## 9. Rủi ro / lưu ý
- **CORS + credentials:** sai origin/`credentials` → cookie không set/gửi. Test kỹ dev.
- **Cookie dev trên localhost:** để `COOKIE_DOMAIN` trống ở dev (đặt `.localhost` không chuẩn). Cookie host-only `localhost` chia sẻ theo host (mọi port).
- **`sameSite`:** redirect cross-subdomain là top-level navigation → `lax` đủ cho cookie đi theo; nếu sau này dùng XHR cross-site cần cân nhắc `none`+`secure`.
- **JWT_REFRESH_SECRET** chỉ của identity (không chia sẻ); access-token vẫn `JWT_SECRET` chung.
- Đổi guard `/me/apps`/`/me/tenants` sang cookie: nếu sau này cần gọi bằng Bearer thì làm guard chấp nhận cả hai (hiện chưa cần).
