# MasterCeo Cut-over (Migrate + Deploy) — Runbook

> **Loại:** 1 artifact code (Dockerfile identity) + RUNBOOK vận hành production (server kt). Runbook chạy **tương tác** (xác nhận + verify từng bước), KHÔNG auto qua subagent. Mỗi bước có lệnh + kỳ vọng + rollback.

**Goal:** Đưa MasterCeo lên kt: migrate danh tính → deploy identity (Portal+API) ở root `masterceo.com.vn`, Kế toán sang `ketoan.masterceo.com.vn`, end-to-end SSO chạy thật.

**Architecture:** identity-service container (host 3020) serve `portal/dist` + `/api`; host nginx route domain→port; migrate `digital_book`→`masterceo_identity` bằng mongosh trên container mongo; redeploy ke-toan-so BE (SP2) + FE (hook) với secret mới.

## Global Constraints
- Server SSH `kt`. Paths: ke-toan-so BE `/root/chimseo/digital-book-be` (dist/apps/<svc>/main.js, env/jwt.env, pm2/ecosystem.config.js); FE build4 `/root/chimseo/nginx/build4` (container `digital-book-nginx` :8070); container `mongo` (creds dbadmin/abcde12345-); host nginx `/etc/nginx/sites-available|enabled`, certbot webroot `/var/www/certbot`.
- Local repos: ke-toan-so `/Users/os_anhvt/Documents/Dino/ke-toan-so`, identity `/Users/os_anhvt/Documents/Dino/identity-service` (GitHub `Theanhvu1501/identity-service`).
- Domain đích: root `masterceo.com.vn`→Portal(:3020); `ketoan.masterceo.com.vn`→Kế toán(:8070, DNS đã trỏ).
- Secret mới mạnh: `JWT_SECRET` GIỐNG NHAU identity + ke-toan-so (`env/jwt.env`); `JWT_REFRESH_SECRET` riêng identity.
- identity prod `NODE_ENV=production` → `synchronize=false` (không tự tạo index → không lỗi maSoThue).
- KT services (libs/auth đổi → build TẤT CẢ): gateway, auth-service, master-data-service, voucher-service, cash-book-service, payable-service, reporting-service, config-service, kho-service, tax-service.
- **Mỗi bước verify trước khi sang bước sau.** Nguồn `digital_book` chỉ ĐỌC.

---

## Task 1 (CODE): Dockerfile cho identity-service

**Files:** Create `identity-service/Dockerfile`, `identity-service/.dockerignore`.

**Interfaces:** Produces image build portal + BE, runtime serve `portal/dist` + API trên container port 3000.

- [ ] **Step 1: `identity-service/.dockerignore`**
```
node_modules
dist
portal/node_modules
portal/dist
.git
*.log
```

- [ ] **Step 2: `identity-service/Dockerfile`** (multi-stage)
```dockerfile
# ---- build portal (FE) ----
FROM node:20-alpine AS portal
WORKDIR /app/portal
COPY portal/package*.json ./
RUN npm ci
COPY portal/ ./
RUN npm run build

# ---- build BE ----
FROM node:20-alpine AS be
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=be /app/dist ./dist
COPY --from=portal /app/portal/dist ./portal/dist
EXPOSE 3000
CMD ["node", "dist/main"]
```
> `ServeStaticModule` trỏ `join(__dirname,'..','portal','dist')` = `/app/portal/dist` ✓. `bcrypt` native trên alpine: nếu lỗi build, đổi base `node:20` (debian). `npm ci --omit=dev` bỏ devDeps (mongodb-memory-server...).

- [ ] **Step 3: Commit + push (identity-service)**
```bash
cd /Users/os_anhvt/Documents/Dino/identity-service
git add Dockerfile .dockerignore && git commit -m "chore(identity): Dockerfile multi-stage (build portal + BE, serve static + /api)" && git push
```
> Build thực sự verify ở Runbook Phase 2 (build trên server). Local docker daemon đang tắt nên không build local.

---

## RUNBOOK (chạy tương tác trên kt; verify từng bước)

### Phase 0 — Chuẩn bị / tiền kiểm
- [ ] **0.1 Sinh secret mạnh** (lưu lại an toàn):
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"; echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
```
- [ ] **0.2 Xác nhận DNS** `ketoan.masterceo.com.vn` đã trỏ về IP server:
```bash
ssh kt "getent hosts ketoan.masterceo.com.vn || dig +short ketoan.masterceo.com.vn"
```
Expected: ra IP server kt.
- [ ] **0.3 Tiền kiểm nguồn** (read-only):
```bash
ssh kt 'docker exec mongo mongosh "mongodb://dbadmin:abcde12345-@localhost:27017/admin?authSource=admin" --quiet --eval "var s=db.getSiblingDB(\"digital_book\");[\"users\",\"user_credentials\",\"user_tenants\",\"tenants\"].forEach(c=>print(c+\": \"+s.getCollection(c).countDocuments({})))"'
```
Ghi lại số lượng để đối soát.

### Phase 1 — Migrate dữ liệu (an toàn, nguồn read-only)
- [ ] **1.1 (Tuỳ chọn) backup nguồn:**
```bash
ssh kt 'docker exec mongo sh -c "mongodump --uri=\"mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin\" --out=/tmp/dump-digitalbook && tar -C /tmp -czf /tmp/dump-digitalbook.tgz dump-digitalbook"' 
```
- [ ] **1.2 Copy 4 collection (idempotent, giữ _id) qua mongosh:**
```bash
ssh kt 'docker exec mongo mongosh "mongodb://dbadmin:abcde12345-@localhost:27017/admin?authSource=admin" --quiet --eval "
var src=db.getSiblingDB(\"digital_book\"), dst=db.getSiblingDB(\"masterceo_identity\");
[\"users\",\"user_credentials\",\"user_tenants\",\"tenants\"].forEach(function(c){
  var n=0; src.getCollection(c).find({}).forEach(function(d){
    var r=dst.getCollection(c).updateOne({_id:d._id},{\$setOnInsert:d},{upsert:true});
    if(r.upsertedCount) n++;
  });
  print(c+\" upserted=\"+n+\" total=\"+dst.getCollection(c).countDocuments({}));
});
"'
```
Expected: total mỗi collection khớp Phase 0.3.
- [ ] **1.3 Set entitlement apps cho tenant + seed apps registry:**
```bash
ssh kt 'docker exec mongo mongosh "mongodb://dbadmin:abcde12345-@localhost:27017/masterceo_identity?authSource=admin" --quiet --eval "
db.tenants.updateMany({},{\$set:{apps:[\"ke-toan\"]}});
function upApp(id,name,url){ db.apps.updateOne({appId:id},{\$set:{appId:id,name:name,feUrl:url,isActive:true}},{upsert:true}); }
upApp(\"ke-toan\",\"Kế toán\",\"https://ketoan.masterceo.com.vn\");
upApp(\"giao-viec\",\"Giao việc\",\"https://task.masterceo.com.vn\");
print(\"tenants=\"+db.tenants.countDocuments({})+\" apps=\"+db.apps.countDocuments({}));
"'
```
Expected: tenants > 0, apps = 2.
- [ ] **1.4 Verify**: 1 user thật có credential + user_tenant trong masterceo_identity (so _id với digital_book).

### Phase 2 — Build + chạy container identity (chưa đụng nginx)
- [ ] **2.1 Đưa code lên server + build image:**
```bash
ssh kt 'cd /root/chimseo && (git clone https://github.com/Theanhvu1501/identity-service.git || (cd identity-service && git pull)) && cd identity-service && docker build -t masterceo-identity .'
```
Expected: build success (nếu bcrypt lỗi trên alpine → đổi Dockerfile base `node:20`).
- [ ] **2.2 Chạy container (env prod; dùng secret Phase 0.1):**
```bash
ssh kt 'docker rm -f masterceo-identity 2>/dev/null; docker run -d --name masterceo-identity --restart unless-stopped -p 3020:3000 \
  --add-host host.docker.internal:host-gateway \
  -e NODE_ENV=production -e PORT=3000 \
  -e MONGODB_URI="mongodb://dbadmin:abcde12345-@host.docker.internal:27017/?authSource=admin" \
  -e MONGODB_DATABASE=masterceo_identity \
  -e JWT_SECRET="<STRONG_SECRET>" -e JWT_REFRESH_SECRET="<STRONG_REFRESH>" \
  -e JWT_EXPIRES_IN=24h -e JWT_REFRESH_EXPIRES_IN=30d \
  -e COOKIE_DOMAIN=.masterceo.com.vn \
  -e CORS_ORIGINS="https://masterceo.com.vn,https://ketoan.masterceo.com.vn" \
  masterceo-identity'
```
- [ ] **2.3 Verify API + portal (localhost trên server):**
```bash
ssh kt 'sleep 4; docker logs masterceo-identity --tail 20; echo "--- portal ---"; curl -s -o /dev/null -w "%{http_code}\n" localhost:3020/; echo "--- login ---"; curl -s -X POST localhost:3020/api/login -H "Content-Type: application/json" -d "{\"email\":\"<email-thật>\",\"password\":\"<mk-thật>\"}" -o /dev/null -w "%{http_code}\n"'
```
Expected: portal `200` (html); login `200` (user thật đã migrate). Nếu login 401 → kiểm user/credential migrate + secret.
> **Rollback Phase 2:** `docker rm -f masterceo-identity` (chưa ai dùng — vô hại).

### Phase 3 — nginx: thêm ketoan.masterceo.com.vn → :8070
- [ ] **3.1 Tạo site (HTTP trước để certbot):**
```bash
ssh kt 'cat >/etc/nginx/sites-available/ketoan <<"EOF"
server {
    listen 80;
    server_name ketoan.masterceo.com.vn;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
EOF
ln -sf /etc/nginx/sites-available/ketoan /etc/nginx/sites-enabled/ketoan && nginx -t && systemctl reload nginx'
```
- [ ] **3.2 Cấp cert:**
```bash
ssh kt 'certbot certonly --webroot -w /var/www/certbot -d ketoan.masterceo.com.vn --non-interactive --agree-tos -m <email>'
```
- [ ] **3.3 Thêm block 443 (proxy :8070, mẫu giống masterceo):**
```bash
ssh kt 'cat >>/etc/nginx/sites-available/ketoan <<"EOF"
server {
    listen 443 ssl;
    client_max_body_size 30M;
    server_name ketoan.masterceo.com.vn;
    ssl_certificate /etc/letsencrypt/live/ketoan.masterceo.com.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ketoan.masterceo.com.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    location / {
        proxy_pass http://localhost:8070;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
nginx -t && systemctl reload nginx'
```
- [ ] **3.4 Verify:** `curl -sI https://ketoan.masterceo.com.vn` → 200/302; mở trình duyệt → Kế toán (FE hiện tại) login được như cũ (vẫn root secret cũ tới Phase 4).
> **Rollback Phase 3:** `rm /etc/nginx/sites-enabled/ketoan && systemctl reload nginx`.

### Phase 4 — Secret mới + redeploy ke-toan-so BE
- [ ] **4.1 Set secret ở ke-toan-so server env:**
```bash
ssh kt 'sed -i "s/^JWT_SECRET=.*/JWT_SECRET=<STRONG_SECRET>/" /root/chimseo/digital-book-be/env/jwt.env && grep JWT_SECRET /root/chimseo/digital-book-be/env/jwt.env'
```
(Nếu format khác, sửa tay đúng key. `<STRONG_SECRET>` = giống identity.)
- [ ] **4.2 Build tất cả service (libs/auth đổi) local + đẩy:**
```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so/be
for s in gateway auth-service master-data-service voucher-service cash-book-service payable-service reporting-service config-service kho-service tax-service; do npx nest build $s || exit 1; done
for s in gateway auth-service master-data-service voucher-service cash-book-service payable-service reporting-service config-service kho-service tax-service; do scp dist/apps/$s/main.js kt:/root/chimseo/digital-book-be/dist/apps/$s/main.js; done
ssh kt 'docker restart digital-book-app'
```
- [ ] **4.3 Verify:** `ssh kt "docker exec digital-book-app pm2 list"` (mọi service online); login Kế toán ở https://ketoan.masterceo.com.vn (secret mới → re-login OK; token cũ giờ invalid — đúng kỳ vọng).
> **Rollback Phase 4:** trả `env/jwt.env` về secret cũ + scp lại main.js bản trước (giữ backup) + restart.

### Phase 5 — Deploy ke-toan-so FE (identity URL + hook)
- [ ] **5.1 Set env FE:**
```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so/fe
grep -q VITE_IDENTITY_URL .env.production && sed -i '' 's#^VITE_IDENTITY_URL=.*#VITE_IDENTITY_URL=https://masterceo.com.vn#' .env.production || echo 'VITE_IDENTITY_URL=https://masterceo.com.vn' >> .env.production
git add .env.production && git commit -m "chore(fe): VITE_IDENTITY_URL=masterceo.com.vn cho prod" || true
```
- [ ] **5.2 Build + deploy FE:**
```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so/fe && npm run build:prod
scp -r dist/* kt:/root/chimseo/nginx/build4/
ssh kt 'docker exec digital-book-nginx nginx -s reload'
```
- [ ] **5.3 Verify:** https://ketoan.masterceo.com.vn tải bản mới (FE có ssoHandoff). Login thường vẫn chạy.
> **Rollback Phase 5:** scp lại dist bản trước.

### Phase 6 — nginx: đổi root masterceo.com.vn → Portal (:3020)
- [ ] **6.1 Sửa proxy_pass site masterceo:**
```bash
ssh kt 'cp /etc/nginx/sites-available/masterceo /etc/nginx/sites-available/masterceo.bak.cutover && sed -i "s#proxy_pass http://localhost:8070;#proxy_pass http://localhost:3020;#" /etc/nginx/sites-available/masterceo && nginx -t && systemctl reload nginx'
```
- [ ] **6.2 Verify:** `curl -sI https://masterceo.com.vn` → 200; mở trình duyệt → **Portal** (màn login MasterCeo), KHÔNG còn là Kế toán.
> **Rollback Phase 6 (nhanh):** `ssh kt 'cp /etc/nginx/sites-available/masterceo.bak.cutover /etc/nginx/sites-available/masterceo && systemctl reload nginx'` → root về Kế toán.

### Phase 7 — Verify END-TO-END
- [ ] **7.1** Mở `https://masterceo.com.vn` → login user thật (đã migrate) → lưới app hiện **Kế toán** → chọn → chọn công ty → trình duyệt sang `https://ketoan.masterceo.com.vn?tenant=...` → **vào thẳng Kế toán, không login lại**.
- [ ] **7.2** DevTools → Application → Cookies: `mc_session` domain `.masterceo.com.vn`, httpOnly, Secure.
- [ ] **7.3** Network: `ketoan.* → masterceo.com.vn/api/refresh` trả 200 (CORS OK). Nếu 401/CORS → kiểm `CORS_ORIGINS` container identity (phải có `https://ketoan.masterceo.com.vn`) → `docker rm -f masterceo-identity` + chạy lại Phase 2.2 với env đúng.
- [ ] **7.4** Logout ở Kế toán/Portal → cookie xoá → quay lại Portal yêu cầu login.

### Phase 8 — Hậu kiểm / dọn
- [ ] **8.1** Theo dõi log identity + digital-book-app 10–15 phút: `ssh kt 'docker logs masterceo-identity --tail 50; docker logs digital-book-app --tail 50 2>&1 | grep -i error'`.
- [ ] **8.2** Ghi lại secret đã set (nơi an toàn), cập nhật ledger/memory: cut-over DONE, URL mới.
- [ ] **8.3** (Tuỳ chọn) thêm certbot auto-renew check cho ketoan.* (`certbot renew --dry-run`).

---

## Self-Review
- **Spec coverage:** §5 Dockerfile→Task 1; §7 migrate→Phase 1 (mongosh thay vì chạy TS — tương đương, idempotent, giữ _id); §4/§9 domain+nginx→Phase 3,6; §8 ke-toan-so BE/FE→Phase 4,5; §6 env identity→Phase 2.2; §3 secret→Phase 0.1+4.1; §10 rollback→ghi mỗi Phase; §9.7 verify→Phase 7. phan_quyen KHÔNG migrate (ở lại digital_book, ke-toan-so đọc tại chỗ) — đúng.
- **Placeholder:** `<STRONG_SECRET>`/`<email>`/`<email-thật>` là giá trị runtime user cấp lúc chạy (không phải placeholder code) — đánh dấu rõ. Mọi lệnh cụ thể.
- **Nhất quán:** secret giống nhau identity(JWT_SECRET) ↔ ke-toan-so(env/jwt.env). CORS_ORIGINS gồm ketoan.* (khớp Phase 7.3). Cookie domain .masterceo.com.vn.
- **Lưu ý alpine/bcrypt:** nếu `npm ci` build bcrypt lỗi trên node:20-alpine → đổi sang `node:20` (debian) trong cả 3 stage.

## Execution
**KHÔNG dùng subagent cho runbook** (production). Task 1 (Dockerfile) author trực tiếp; Runbook chạy **tương tác**: tôi chạy từng lệnh SSH, verify, hỏi bạn xác nhận ở các mốc rủi ro (Phase 4, 6). Cần bạn cung cấp lúc chạy: secret (hoặc để tôi sinh), email certbot, 1 tài khoản thật để test.
