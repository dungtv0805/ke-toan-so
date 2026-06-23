# Loki Log Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tập trung log Digital Books vào Loki (trên server kamax), xem qua Grafana, đẩy từ kt bằng Promtail — không sửa code app.

**Architecture:** Promtail (container trên kt) đọc file JSON `logs/*.log` → push HTTPS+basic-auth tới Loki. Loki + Grafana chạy Docker trên kamax, bind `127.0.0.1`, LiteSpeed (sẵn có, giữ 80/443) reverse-proxy + TLS cho `loki.<domain>` và `grafana.<domain>`.

**Tech Stack:** Grafana Loki 3.x (monolithic, filesystem), Promtail 3.x, Grafana 11.x, Docker Compose v2, LiteSpeed (reverse proxy + AutoSSL).

## Global Constraints

- Server B = `kamax` (ssh config `kamax`, hostname vpspla, IP `160.30.113.115`). RAM khả dụng ~1.5G → `mem_limit` mọi container.
- Server app = `kt` (ssh config `kt`), logs ở host `/root/chimseo/digital-book-be/logs` (JSON, đã tự xoá 14 ngày).
- Loki & Grafana **chỉ bind `127.0.0.1`** trên kamax — không expose public; vào qua LiteSpeed.
- Push qua internet → **bắt buộc TLS + basic-auth**.
- Retention Loki = **720h (30 ngày)**.
- Labels Loki: `app=digital-book`, `host=kt`, `service`, `level`. KHÔNG đưa `requestId` thành label.
- Loại trừ file `*-error-*.log` khi tail (tránh trùng).
- KHÔNG log body; KHÔNG commit secret (chỉ commit `.env.example`).
- Image pin phiên bản cụ thể (không `latest`).

**Inputs cần có trước khi deploy (Task 4+):** `<domain>` + 2 subdomain `loki.<domain>`/`grafana.<domain>` đã trỏ DNS về 160.30.113.115; cách quản lý LiteSpeed (OpenLiteSpeed web admin / cPanel / file config).

---

## File Structure

```
deploy/loki/
├── server-b/
│   ├── docker-compose.yml                     # loki + grafana, bind 127.0.0.1
│   ├── loki-config.yaml                        # monolithic, filesystem, retention 30d
│   ├── grafana/provisioning/datasources/loki.yaml
│   └── .env.example                            # GF_ADMIN_PASSWORD, GRAFANA_DOMAIN
├── kt/
│   ├── docker-compose.promtail.yml             # promtail
│   ├── promtail-config.yaml                     # tail JSON, push HTTPS+auth
│   └── .env.example                            # LOKI_DOMAIN, LOKI_USER, LOKI_PASSWORD
├── litespeed/
│   ├── grafana.vhost.conf.example              # proxy → 127.0.0.1:3000
│   └── loki.vhost.conf.example                 # proxy → 127.0.0.1:3100 + basic auth
└── README.md                                   # runbook deploy + verify
```

`.gitignore`: thêm `deploy/loki/**/.env` (chỉ commit `.env.example`).

---

### Task 1: Server B stack files (Loki + Grafana)

**Files:**
- Create: `deploy/loki/server-b/loki-config.yaml`
- Create: `deploy/loki/server-b/docker-compose.yml`
- Create: `deploy/loki/server-b/grafana/provisioning/datasources/loki.yaml`
- Create: `deploy/loki/server-b/.env.example`

**Interfaces:**
- Produces: Loki HTTP API tại container `loki:3100` (mạng docker `loki-net`); host `127.0.0.1:3100`. Grafana tại host `127.0.0.1:3000`. Datasource Grafana trỏ `http://loki:3100`.

- [ ] **Step 1: Viết `loki-config.yaml`**

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: warn

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-04-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 720h
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 8
  ingestion_burst_size_mb: 16

compactor:
  working_directory: /loki/compactor
  retention_enabled: true
  delete_request_store: filesystem

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 50
```

- [ ] **Step 2: Viết `docker-compose.yml`**

```yaml
services:
  loki:
    image: grafana/loki:3.4.2
    container_name: loki
    restart: unless-stopped
    command: -config.file=/etc/loki/loki-config.yaml
    volumes:
      - ./loki-config.yaml:/etc/loki/loki-config.yaml:ro
      - loki-data:/loki
    ports:
      - "127.0.0.1:3100:3100"
    networks: [loki-net]
    mem_limit: 384m

  grafana:
    image: grafana/grafana:11.4.0
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GF_ADMIN_PASSWORD:?set in .env}
      - GF_SERVER_ROOT_URL=https://${GRAFANA_DOMAIN:?set in .env}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_ANALYTICS_REPORTING_ENABLED=false
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - grafana-data:/var/lib/grafana
    ports:
      - "127.0.0.1:3000:3000"
    networks: [loki-net]
    depends_on: [loki]
    mem_limit: 320m

volumes:
  loki-data:
  grafana-data:

networks:
  loki-net:
```

- [ ] **Step 3: Viết `grafana/provisioning/datasources/loki.yaml`**

```yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    jsonData:
      maxLines: 1000
```

- [ ] **Step 4: Viết `.env.example`**

```bash
# Copy thành .env trên kamax rồi điền giá trị thật (KHÔNG commit .env)
GF_ADMIN_PASSWORD=change-me-strong
GRAFANA_DOMAIN=grafana.example.com
```

- [ ] **Step 5: Kiểm chứng cú pháp compose**

Run: `cd deploy/loki/server-b && GF_ADMIN_PASSWORD=x GRAFANA_DOMAIN=x docker compose config -q && echo OK`
Expected: in `OK`, không lỗi YAML/compose.

- [ ] **Step 6: Commit**

```bash
git add deploy/loki/server-b
git commit -m "feat(loki): server-b stack (loki+grafana) configs"
```

---

### Task 2: Promtail files (trên kt)

**Files:**
- Create: `deploy/loki/kt/promtail-config.yaml`
- Create: `deploy/loki/kt/docker-compose.promtail.yml`
- Create: `deploy/loki/kt/.env.example`
- Modify: `.gitignore` (thêm dòng ignore `.env`)

**Interfaces:**
- Consumes: Loki push endpoint `https://${LOKI_DOMAIN}/loki/api/v1/push` + basic-auth (Task 5 tạo user/pass ở LiteSpeed).
- Consumes: host log dir `/root/chimseo/digital-book-be/logs` (read-only).
- Produces: streams gắn label `app=digital-book, host=kt, service, level` vào Loki.

- [ ] **Step 1: Viết `promtail-config.yaml`**

```yaml
server:
  http_listen_port: 9080
  log_level: warn

positions:
  filename: /promtail/positions.yaml

clients:
  - url: https://${LOKI_DOMAIN}/loki/api/v1/push
    basic_auth:
      username: ${LOKI_USER}
      password: ${LOKI_PASSWORD}
    backoff_config:
      min_period: 1s
      max_period: 5m
      max_retries: 20

scrape_configs:
  - job_name: digital-book
    static_configs:
      - targets: [localhost]
        labels:
          app: digital-book
          host: kt
          __path__: /logs/*.log
          __path_exclude__: /logs/*-error-*.log
    pipeline_stages:
      - json:
          expressions:
            service: service
            level: level
            ts: timestamp
      - labels:
          service:
          level:
      - timestamp:
          source: ts
          format: RFC3339Nano
```

Ghi chú: `requestId` KHÔNG khai trong `labels:` → vẫn nằm trong nội dung JSON, lọc bằng LogQL `| json | requestId="..."`.

- [ ] **Step 2: Viết `docker-compose.promtail.yml`**

```yaml
services:
  promtail:
    image: grafana/promtail:3.4.2
    container_name: promtail
    restart: unless-stopped
    command: -config.file=/etc/promtail/promtail-config.yaml -config.expand-env=true
    environment:
      - LOKI_DOMAIN=${LOKI_DOMAIN:?set in .env}
      - LOKI_USER=${LOKI_USER:?set in .env}
      - LOKI_PASSWORD=${LOKI_PASSWORD:?set in .env}
    volumes:
      - /root/chimseo/digital-book-be/logs:/logs:ro
      - promtail-positions:/promtail
    mem_limit: 128m

volumes:
  promtail-positions:
```

- [ ] **Step 3: Viết `.env.example`**

```bash
# Copy thành .env trên kt rồi điền (KHÔNG commit). LOKI_USER/PASSWORD = basic-auth tạo ở Task 5.
LOKI_DOMAIN=loki.example.com
LOKI_USER=promtail
LOKI_PASSWORD=change-me-strong
```

- [ ] **Step 4: Cập nhật `.gitignore`**

Thêm dòng:
```
deploy/loki/**/.env
```

- [ ] **Step 5: Kiểm chứng cú pháp compose**

Run: `cd deploy/loki/kt && LOKI_DOMAIN=x LOKI_USER=x LOKI_PASSWORD=x docker compose -f docker-compose.promtail.yml config -q && echo OK`
Expected: in `OK`.

- [ ] **Step 6: Commit**

```bash
git add deploy/loki/kt .gitignore
git commit -m "feat(loki): promtail config + compose for kt"
```

---

### Task 3: LiteSpeed proxy templates + README runbook

**Files:**
- Create: `deploy/loki/litespeed/grafana.vhost.conf.example`
- Create: `deploy/loki/litespeed/loki.vhost.conf.example`
- Create: `deploy/loki/README.md`

**Interfaces:**
- Produces: tài liệu cấu hình LiteSpeed reverse-proxy cho `grafana.<domain>` → `127.0.0.1:3000` và `loki.<domain>` → `127.0.0.1:3100` (+ basic-auth). README là runbook deploy Task 4–6.

- [ ] **Step 1: Viết `grafana.vhost.conf.example` (OpenLiteSpeed vhost)**

```
docRoot                   $VH_ROOT/html/
extprocessor grafana_be {
  type                    proxy
  address                 http://127.0.0.1:3000
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}
context / {
  type                    proxy
  handler                 grafana_be
  addDefaultCharset       off
}
vhssl {
  enableSpdy              15
  # AutoSSL của LiteSpeed sẽ tự cấp cert cho grafana.<domain>
}
```

- [ ] **Step 2: Viết `loki.vhost.conf.example` (OpenLiteSpeed vhost + basic auth)**

```
docRoot                   $VH_ROOT/html/
extprocessor loki_be {
  type                    proxy
  address                 http://127.0.0.1:3100
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}
realm LokiPush {
  userDB  {
    location              conf/vhosts/loki/htpasswd
  }
}
context / {
  type                    proxy
  handler                 loki_be
  addDefaultCharset       off
  realm                   LokiPush
  authName                "Loki"
  required                "valid-user"
}
```

Ghi chú htpasswd: tạo bằng `htpasswd -nbB promtail '<password>'` rồi dán vào `conf/vhosts/loki/htpasswd`.

- [ ] **Step 3: Viết `README.md` runbook**

````markdown
# Loki log stack — Runbook

## Tổng quan
- kt: Promtail đọc `logs/*.log` → push HTTPS sang `loki.<domain>`.
- kamax: Loki+Grafana (Docker, bind 127.0.0.1) sau LiteSpeed (TLS + basic-auth).

## Deploy kamax (Loki+Grafana)
```bash
ssh kamax 'mkdir -p /root/loki-stack'
scp -r deploy/loki/server-b/* kamax:/root/loki-stack/
ssh kamax 'cd /root/loki-stack && cp .env.example .env && nano .env'   # điền GF_ADMIN_PASSWORD, GRAFANA_DOMAIN
ssh kamax 'cd /root/loki-stack && docker compose up -d'
ssh kamax 'curl -s http://127.0.0.1:3100/ready; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login'
```

## LiteSpeed (reverse proxy + AutoSSL)
1. Tạo 2 virtual host `grafana.<domain>`, `loki.<domain>` (dùng template trong thư mục này).
2. Loki vhost: tạo htpasswd `htpasswd -nbB promtail '<pass>'` → `conf/vhosts/loki/htpasswd`.
3. Bật AutoSSL/Let's Encrypt cho 2 subdomain. Reload LiteSpeed.

## Deploy kt (Promtail)
```bash
ssh kt 'mkdir -p /root/chimseo/promtail'
scp -r deploy/loki/kt/* kt:/root/chimseo/promtail/
ssh kt 'cd /root/chimseo/promtail && cp .env.example .env && nano .env'   # LOKI_DOMAIN, LOKI_USER, LOKI_PASSWORD
ssh kt 'cd /root/chimseo/promtail && docker compose -f docker-compose.promtail.yml up -d'
ssh kt 'docker logs promtail --tail 20'
```

## Verify end-to-end
- Grafana `https://grafana.<domain>` → Explore → `{app="digital-book"}`.
- Lọc service: `{app="digital-book", service="voucher"}`.
- Theo requestId: `{app="digital-book"} | json | requestId="<id>"`.
````

- [ ] **Step 4: Commit**

```bash
git add deploy/loki/litespeed deploy/loki/README.md
git commit -m "docs(loki): litespeed proxy templates + deploy runbook"
```

---

### Task 4: Deploy Loki + Grafana lên kamax

**Files:** (không sửa repo; thao tác server)

**Interfaces:**
- Consumes: `deploy/loki/server-b/*`, input `GRAFANA_DOMAIN`, secret `GF_ADMIN_PASSWORD`.
- Produces: Loki ready tại `127.0.0.1:3100`, Grafana tại `127.0.0.1:3000` trên kamax.

- [ ] **Step 1: Tạo DNS** — trỏ `loki.<domain>` và `grafana.<domain>` → `160.30.113.115` (A record). Chờ phân giải:

Run: `dig +short grafana.<domain>`
Expected: `160.30.113.115`

- [ ] **Step 2: Sinh mật khẩu admin Grafana**

Run: `openssl rand -base64 24`
Lưu lại làm `GF_ADMIN_PASSWORD`.

- [ ] **Step 3: Upload + cấu hình + up**

```bash
ssh kamax 'mkdir -p /root/loki-stack'
scp -r deploy/loki/server-b/. kamax:/root/loki-stack/
# tạo .env trên kamax với GF_ADMIN_PASSWORD + GRAFANA_DOMAIN (heredoc, không in ra log)
ssh kamax 'cd /root/loki-stack && docker compose up -d'
```

- [ ] **Step 4: Verify Loki + Grafana lên (localhost)**

Run: `ssh kamax 'curl -s http://127.0.0.1:3100/ready; echo; curl -s -o /dev/null -w "grafana=%{http_code}\n" http://127.0.0.1:3000/login'`
Expected: `ready` và `grafana=200`.

- [ ] **Step 5: Verify mem_limit không OOM**

Run: `ssh kamax 'docker stats --no-stream loki grafana --format "{{.Name}} {{.MemUsage}}"'`
Expected: loki < 384M, grafana < 320M, không restart-loop (`docker ps` thấy `Up`, không `Restarting`).

---

### Task 5: Cấu hình LiteSpeed reverse proxy + AutoSSL

**Files:** (thao tác trên kamax; tham chiếu templates Task 3)

**Interfaces:**
- Consumes: Loki `127.0.0.1:3100`, Grafana `127.0.0.1:3000`; templates `deploy/loki/litespeed/*`.
- Produces: `https://grafana.<domain>` (login), `https://loki.<domain>/loki/api/v1/push` (basic-auth) — user/pass dùng cho Promtail (Task 6).

- [ ] **Step 1: Phát hiện loại LiteSpeed**

Run: `ssh kamax 'ls -d /usr/local/lsws 2>/dev/null && /usr/local/lsws/bin/lshttpd -v 2>/dev/null | head -1; which cpanel 2>/dev/null || echo "no-cpanel"'`
Expected: biết là OpenLiteSpeed/LSWS và có cPanel hay không → chọn cách cấu hình (web admin :7080 / cPanel / file conf).

- [ ] **Step 2: Tạo 2 virtual host proxy** theo template:
- `grafana.<domain>` → proxy `http://127.0.0.1:3000` (dùng `grafana.vhost.conf.example`).
- `loki.<domain>` → proxy `http://127.0.0.1:3100` + basic-auth (dùng `loki.vhost.conf.example`).

(Nếu OpenLiteSpeed: thêm External App type Proxy + Context `/` proxy trong WebAdmin :7080 hoặc sửa `conf/vhosts/<vh>/vhconf.conf`; map listener 443 → vhost theo domain.)

- [ ] **Step 3: Tạo basic-auth cho Loki**

```bash
PW=$(openssl rand -base64 18)
ssh kamax "htpasswd -nbB promtail '$PW'"   # lưu dòng output vào htpasswd của vhost loki; lưu $PW cho Promtail
```

- [ ] **Step 4: Bật AutoSSL + reload**

Bật Let's Encrypt/AutoSSL cho 2 subdomain (WebAdmin/cPanel). Reload LiteSpeed:
Run: `ssh kamax '/usr/local/lsws/bin/lswsctrl reload || systemctl reload lsws'`

- [ ] **Step 5: Verify HTTPS + auth từ máy ngoài**

```bash
curl -s -o /dev/null -w "grafana=%{http_code}\n" https://grafana.<domain>/login          # 200
curl -s -o /dev/null -w "loki_noauth=%{http_code}\n" https://loki.<domain>/ready          # 401
curl -s -u promtail:<pass> -o /dev/null -w "loki_auth=%{http_code}\n" https://loki.<domain>/ready  # 200
```
Expected: `grafana=200`, `loki_noauth=401`, `loki_auth=200`, cert hợp lệ (không `-k`).

---

### Task 6: Deploy Promtail trên kt + verify end-to-end

**Files:** (thao tác trên kt; dùng `deploy/loki/kt/*`)

**Interfaces:**
- Consumes: `LOKI_DOMAIN`, `LOKI_USER=promtail`, `LOKI_PASSWORD` (từ Task 5).
- Produces: log Digital Books chảy vào Loki, xem được ở Grafana.

- [ ] **Step 1: Upload + cấu hình + up**

```bash
ssh kt 'mkdir -p /root/chimseo/promtail'
scp -r deploy/loki/kt/. kt:/root/chimseo/promtail/
# tạo .env trên kt với LOKI_DOMAIN, LOKI_USER, LOKI_PASSWORD (heredoc)
ssh kt 'cd /root/chimseo/promtail && docker compose -f docker-compose.promtail.yml up -d'
```

- [ ] **Step 2: Verify Promtail chạy + không lỗi push**

Run: `ssh kt 'docker logs promtail --tail 30 2>&1 | grep -iE "error|level=error" | head; echo "---"; docker ps --filter name=promtail --format "{{.Status}}"'`
Expected: không có dòng error push (401/connection), trạng thái `Up`.

- [ ] **Step 3: Verify targets healthy**

Run: `ssh kt 'curl -s http://127.0.0.1:9080/targets 2>/dev/null | grep -o "/logs/[^\" ]*" | sort -u | head'`
Expected: liệt kê các file `/logs/<service>-YYYY-MM-DD.log` (không có `-error-`).

- [ ] **Step 4: Verify dữ liệu vào Loki (query qua LiteSpeed)**

```bash
curl -s -u promtail:<pass> -G 'https://loki.<domain>/loki/api/v1/query' \
  --data-urlencode 'query=count_over_time({app="digital-book"}[1h])' | head -c 300
```
Expected: JSON có `"result":[...]` với số liệu > 0.

- [ ] **Step 5: Verify trên Grafana (thủ công)**

Mở `https://grafana.<domain>` → Explore → `{app="digital-book"}` → thấy log. Thử `{app="digital-book", service="voucher"}` và `{app="digital-book"} | json | requestId="<một id thật>"` → ra đủ dòng xuyên service.

- [ ] **Step 6: Verify tính đệm (buffer)**

```bash
ssh kt 'docker stop promtail'      # tắt 2 phút, để app sinh thêm log
# (chờ ~2 phút, tạo vài request trên app)
ssh kt 'docker start promtail'
```
Sau ~1 phút, query lại Loki khoảng thời gian tắt → log vẫn xuất hiện (Promtail bù từ positions/file).
Expected: không thủng log trong khoảng tắt.

---

### Task 7: (Tuỳ chọn) Dashboard + cập nhật tài liệu

**Files:**
- Modify: `.claude/skills/db-deploy/SKILL.md` (mục "Đọc log" — bổ sung Loki/Grafana)
- Create: `deploy/loki/server-b/grafana/provisioning/dashboards/digital-book.json` (nếu làm dashboard)

**Interfaces:**
- Consumes: datasource Loki đã chạy.
- Produces: dashboard "Digital Books — Logs" (lỗi theo service, request theo thời gian); tài liệu cập nhật.

- [ ] **Step 1: (tuỳ chọn) Tạo dashboard provisioning** — panel: `sum by (service) (count_over_time({app="digital-book", level="error"}[5m]))`; bảng log live `{app="digital-book"} | json`. Lưu JSON + provider file `dashboards.yaml`, redeploy Grafana.

- [ ] **Step 2: Cập nhật SKILL.md** — thêm mục: "Xem log tập trung: Grafana `https://grafana.<domain>` (Explore, `{app=\"digital-book\"}`); `logs.sh` vẫn dùng để debug nhanh tại chỗ."

- [ ] **Step 3: Commit**

```bash
git add deploy/loki/server-b/grafana .claude/skills/db-deploy/SKILL.md
git commit -m "docs(loki): grafana dashboard + cập nhật runbook deploy skill"
```

---

## Self-Review

- **Spec coverage:** Kiến trúc (Task 1–2,4–6) ✓; LiteSpeed proxy (Task 3,5) ✓; bảo mật TLS+basic-auth+bind127 (Task 4,5) ✓; retention 30d (Task 1) ✓; loại trừ error files (Task 2) ✓; giữ file/không sửa app/không body (không có task sửa app — đúng) ✓; verify end-to-end + buffer (Task 6) ✓; ngoài phạm vi (alerting/metrics) không có task — đúng.
- **Secrets:** chỉ commit `.env.example`; `.gitignore` chặn `.env` (Task 2). Mật khẩu sinh `openssl rand` lúc deploy.
- **Type/giá trị nhất quán:** cổng 3100/3000, labels `app/host/service/level`, user `promtail`, retention `720h`, image pin `loki:3.4.2`/`grafana:11.4.0`/`promtail:3.4.2` — dùng nhất quán các task.
- **Rủi ro đã nêu:** loại LiteSpeed chưa chắc (Task 5 Step 1 phát hiện trước); RAM kamax chật (mem_limit + Task 4 Step 5 kiểm OOM).
