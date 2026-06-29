# MasterCeo — Migrate + Deploy (Cut-over) Design

- **Ngày:** 2026-06-29
- **Trạng thái:** Đã duyệt thiết kế, chờ writing-plans (runbook)
- **Loại:** Vận hành/triển khai production (server kt) + 1 artifact code (Dockerfile identity).

## 1. Mục tiêu
Đưa nền MasterCeo lên chạy THẬT trên server kt: migrate dữ liệu danh tính, deploy identity-service (Portal + API) làm cổng ở **root `masterceo.com.vn`**, chuyển Kế toán sang **`ketoan.masterceo.com.vn`**, để luồng "đăng nhập cổng → chọn app → chọn công ty → vào Kế toán không login lại" chạy end-to-end.

## 2. Quyết định đã chốt
- **Domain:** Portal/Identity = **root `masterceo.com.vn`**; Kế toán = **`ketoan.masterceo.com.vn`** (DNS đã trỏ); Giao việc giữ `task.masterceo.com.vn` (tích hợp Sub-plan 3 sau).
- **identity-service:** chạy **Docker container** (cổng host 3020), serve `portal/dist` + API `/api`.
- **Secret:** sinh **JWT_SECRET + JWT_REFRESH_SECRET mạnh mới**; `JWT_SECRET` set GIỐNG NHAU ở identity + ke-toan-so (`env/jwt.env`). → token Kế toán cũ hết hiệu lực → user re-login 1 lần (chấp nhận).
- **DNS:** user tự thêm; deploy giờ thường (redeploy ke-toan-so là additive/non-breaking).

## 3. Hạ tầng kt (đã khảo sát)
- Host nginx (TLS Let's Encrypt, webroot `/var/www/certbot`) route `<domain>` → `proxy_pass localhost:<port>`. Mẫu: `masterceo.com.vn`→:8070 (digital-book-nginx serve Kế toán FE build4); `task.masterceo.com.vn`→:8090.
- Container: `digital-book-app` (PM2 mọi service KT, gateway :3000), `digital-book-nginx` (:8070), `mongo` (:27017, creds dbadmin/abcde12345-), `rabbitmq`, `redis`, task-management (:3010/:8090).
- Migration tooling SẴN trong identity-service: `src/scripts/migrate-identity.ts` (copy 4 collection, giữ `_id`, idempotent, dry-run), `src/scripts/seed-apps.ts` (upsert app ke-toan/giao-viec).
- identity-service **chưa có Dockerfile** → cần viết.

## 4. Bố trí domain đích
| Domain | proxy_pass | Nội dung |
|---|---|---|
| `masterceo.com.vn` (đổi :8070→:3020) | localhost:3020 | identity: Portal static + `/api` |
| `ketoan.masterceo.com.vn` (mới) | localhost:8070 | Kế toán FE (digital-book-nginx) |
| `task.masterceo.com.vn` (giữ) | localhost:8090 | Giao việc |

Cookie `mc_session` domain `.masterceo.com.vn` (phủ root + subdomain). ke-toan-so FE (ketoan.*) gọi identity (masterceo.com.vn) `/api/refresh` cross-origin → `CORS_ORIGINS` phải gồm `https://ketoan.masterceo.com.vn`.

## 5. Artifact code: Dockerfile identity-service
Multi-stage:
1. Build portal: `cd portal && npm ci && npm run build` → `portal/dist`.
2. Build BE: `npm ci && npm run build` → `dist`.
3. Runtime: node, copy `dist` + `node_modules` (prod) + `portal/dist`, `CMD node dist/main`. Port 3000 (container) → host 3020. `NODE_ENV=production` (→ `synchronize=false`, fail-fast nếu thiếu JWT_SECRET).
- `.dockerignore` (node_modules, portal/node_modules, dist, portal/dist, .git).
- Chạy: docker container nối tới mongo (mongodb://dbadmin:abcde12345-@host:27017/?authSource=admin qua extra_hosts host.docker.internal:host-gateway, như task-management; hoặc cùng docker network mongo). `MONGODB_DATABASE=masterceo_identity`.

## 6. env identity (prod, qua container env/compose)
`NODE_ENV=production`, `PORT=3000`, `MONGODB_URI=mongodb://dbadmin:abcde12345-@host.docker.internal:27017/?authSource=admin`, `MONGODB_DATABASE=masterceo_identity`, `JWT_SECRET=<strong>`, `JWT_REFRESH_SECRET=<strong>`, `JWT_EXPIRES_IN=24h`, `JWT_REFRESH_EXPIRES_IN=30d`, `COOKIE_DOMAIN=.masterceo.com.vn`, `CORS_ORIGINS=https://masterceo.com.vn,https://ketoan.masterceo.com.vn`, `SOURCE_MONGODB_DATABASE=digital_book` (cho migrate). Cân nhắc `trust proxy` (đứng sau nginx) — set ở main.ts nếu cần cho secure cookie/X-Forwarded.

## 7. Migration (chạy 1 lần, trên server)
- Nguồn `digital_book` (chỉ ĐỌC), đích `masterceo_identity` (DB mới). An toàn.
- (Tuỳ chọn) backup: `docker exec mongo mongodump --db digital_book ...`.
- `migrate-identity.ts` (dry-run trước → thật): copy `users, user_credentials, user_tenants, tenants` giữ `_id`.
- `seed-apps.ts`: upsert app `ke-toan` (feUrl `https://ketoan.masterceo.com.vn`) + `giao-viec` (feUrl `https://task.masterceo.com.vn`).
- Set entitlement: `db.tenants.updateMany({}, {$set:{apps:['ke-toan']}})` trên `masterceo_identity` (mọi tenant KT hiện có → dùng app ke-toan).
- *Không lo unique-index maSoThue* vì prod `synchronize=false`.
- task-management identity CHƯA migrate (Sub-plan 3).

## 8. Thay đổi ke-toan-so khi deploy
- **BE**: SP2 đổi `libs/auth` (JwtGuard async + AuthzLoaderService + AuthModule forFeature) → libs đổi → **build + đẩy main.js TẤT CẢ service** + restart `digital-book-app`. Không thêm npm dep runtime mới. `env/jwt.env` đặt `JWT_SECRET=<strong>` (=identity).
- **FE**: thêm `VITE_IDENTITY_URL=https://masterceo.com.vn` (.env.production) + hook ssoHandoff (đã merge) → `npm run build:prod` → scp `dist` → `build4` (phục vụ ở ketoan.*) → reload nginx container.

## 9. Thứ tự cut-over (runbook) + verify mỗi bước
1. **Migrate** data (dry-run → thật) → verify count `masterceo_identity` khớp `digital_book` + tenants.apps set + apps registry.
2. **Build + run container identity** (3020) → `curl localhost:3020/api/...` (login bằng user thật đã migrate → 200; /me/apps cookie) + `curl localhost:3020/` ra portal html.
3. **nginx**: thêm site `ketoan.masterceo.com.vn`→:8070 + `certbot --webroot` cấp cert → `nginx -t && reload` → verify https://ketoan.masterceo.com.vn ra Kế toán (FE hiện tại).
4. **Secret + redeploy ke-toan-so BE**: set `JWT_SECRET=<strong>` ở `env/jwt.env` (= identity) → build+đẩy all service main.js → restart → verify login Kế toán (secret mới) ở ketoan.*.
5. **Deploy ke-toan-so FE** (identity URL + hook) → build4 → reload → verify ketoan.* load.
6. **nginx**: đổi site root `masterceo.com.vn` proxy :8070→:3020 → `nginx -t && reload` → verify masterceo.com.vn ra Portal.
7. **E2E verify**: masterceo.com.vn → login user thật → lưới app (ke-toan) → chọn công ty → redirect ketoan.com.vn?tenant → vào thẳng Kế toán (không login lại).
8. **Grant quyền** (nếu cần): role Admin có quyền các route — đã có sẵn ở digital_book (migrate giữ phan_quyen? phan_quyen KHÔNG migrate sang masterceo_identity — nó là cấu hình quyền của ke-toan-so, ở lại digital_book; ke-toan-so BE đọc từ digital_book — đúng, không cần migrate phan_quyen).

## 10. Rollback
- Bước 6 lỗi (Portal) → đổi nginx root về :8070 (Kế toán lại ở root), reload. ketoan.* vẫn chạy.
- Bước 4/5 lỗi (ke-toan-so) → revert main.js/dist trước đó + restart; trả `env/jwt.env` về secret cũ.
- Migrate không phá nguồn → không cần rollback data; có thể `db.dropDatabase()` masterceo_identity để làm lại.

## 11. Ngoài phạm vi
- Sub-plan 3 (task-management vào Portal): thêm app giao-viec hiện cho user task, migrate user task, đổi JWT_SECRET task-management.
- Hardening: RS256/JWKS; SessionGuard DB hash-check; revoke; rate-limit.

## 12. Rủi ro
- Đổi `JWT_SECRET` → re-login 1 lần toàn bộ user Kế toán (đã chấp nhận; trùng dịp đổi URL).
- Redeploy ke-toan-so BE (SP2) — additive/non-breaking, token cũ vẫn verify tới khi đổi secret; rủi ro thấp.
- Cookie `secure` + sau proxy: TLS kết thúc ở nginx; cân nhắc `trust proxy`. Test kỹ cookie set/gửi ở bước 7.
- CORS: thiếu `ketoan.masterceo.com.vn` trong `CORS_ORIGINS` → hook /api/refresh 401. Verify ở bước 7.
