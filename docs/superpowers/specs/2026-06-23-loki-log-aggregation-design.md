# Loki log aggregation cho Digital Books

- Ngày: 2026-06-23
- Trạng thái: Đã duyệt thiết kế

## Mục tiêu

Tập trung log của Digital Books vào Loki để xem/tra cứu qua Grafana (lọc theo
service/level/requestId), thay cho việc đọc file thủ công bằng `logs.sh`.

## Quyết định chính (đã chốt)

- **Loki + Grafana đặt ở SERVER B = `kamax`** (ssh config `kamax`, hostname vpspla, IP 160.30.113.115), không phải server app `kt`, vì kt chật RAM.
- **Phạm vi**: chỉ log Digital Books (8 service trong container `digital-book-app`).
- **Collector trên kt**: **Promtail** (đọc file JSON sẵn có → đẩy lên Loki).
- **Đường mạng**: internet công khai → **bắt buộc TLS + basic-auth**.
- **TLS/Reverse-proxy**: **dùng LiteSpeed sẵn có trên kamax** (đang giữ 80/443 + AutoSSL) — KHÔNG Caddy. Loki/Grafana bind `127.0.0.1`, LiteSpeed proxy vào.
- **Giữ nguyên ghi log file trên kt** (Winston, đã tự xoá sau 14 ngày) làm nguồn + đệm.
- **Không log request/response body** (giữ logging hiện tại: access-log + metadata). Không sửa code app.

## Kiến trúc

Server B = `kamax` (hostname vpspla). Cổng 80/443 do **LiteSpeed sẵn có** giữ → LiteSpeed
đóng vai reverse proxy + TLS (AutoSSL). KHÔNG dùng Caddy.

```
Server kt (app)                              Server B = kamax (log stack)
 /root/chimseo/digital-book-be/logs/*.log     ┌──────────────────────────────────┐
   │ Promtail (container, chimseo net)        │ LiteSpeed (sẵn có, :443, AutoSSL) │
   │  - tail /logs/*.log, parse JSON          │   ├─ loki.<domain>   → 127.0.0.1:3100│
   │  - label: service, level, app, host      │   │     (basic-auth ở LiteSpeed)  │
   └── HTTPS push (basic-auth) ──────────────►│   └─ grafana.<domain>→127.0.0.1:3000 │
        /loki/api/v1/push                     │ loki    (docker, bind 127.0.0.1)  │
                                              │ grafana (docker, bind 127.0.0.1)  │
                                              └──────────────────────────────────┘
```

## Thành phần — Server B = kamax (docker-compose + LiteSpeed)

Một `docker-compose.yml` cho 2 container (loki, grafana), **bind vào `127.0.0.1`** (không ra
public). LiteSpeed sẵn có làm proxy + TLS. RAM kamax cũng chật (~1.5G khả dụng) → đặt limit.

1. **loki** (`grafana/loki`)
   - Chế độ monolithic, lưu **filesystem** (TSDB schema), `auth_enabled: false` (auth làm ở LiteSpeed).
   - **Compactor bật retention** `retention_period: 720h` (30 ngày).
   - Bind `127.0.0.1:3100:3100` (chỉ LiteSpeed/localhost gọi được). Giới hạn RAM ~256MB. Volume `loki-data`.
   - Lưu ý: container `color` đã expose 3100/tcp nhưng KHÔNG publish ra host → không xung đột khi ta publish `127.0.0.1:3100`.
2. **grafana** (`grafana/grafana`)
   - Provision sẵn datasource Loki (`http://loki:3100` qua mạng docker nội bộ).
   - Admin login (đổi mật khẩu mặc định), `GF_SERVER_ROOT_URL=https://grafana.<domain>`.
   - Bind `127.0.0.1:3000:3000`. Volume `grafana-data`. RAM ~256MB.
3. **LiteSpeed (sẵn có) — reverse proxy + TLS**
   - Vhost `grafana.<domain>` → proxy `http://127.0.0.1:3000`.
   - Vhost `loki.<domain>` → proxy `http://127.0.0.1:3100`, **bật basic-auth** (user/pass cho Promtail) — tối thiểu cho route `/loki/api/v1/push`.
   - TLS qua AutoSSL/Let's Encrypt của LiteSpeed cho 2 subdomain.

## Thành phần — Server kt (Promtail)

- 1 container `promtail` (`grafana/promtail`) trên network `chimseo`, thêm vào compose riêng hoặc compose hiện có.
- Mount: `/root/chimseo/digital-book-be/logs:/logs:ro` + volume `promtail-positions` (lưu vị trí đã đọc → không gửi trùng sau restart).
- Config:
  - `scrape_configs`: `__path__: /logs/*.log` nhưng **loại trừ file `*-error-*.log`** (dòng error đã nằm trong file chính → tránh log trùng). Bỏ qua `.gz` (chỉ tail file đang ghi). Cách làm: glob lấy file chính + `relabel`/drop theo `filename` chứa `-error-`.
  - Pipeline: stage `json` rút `service, level, timestamp, requestId`; `labels: service, level`; `timestamp` từ log; static labels `app=digital-book`, `host=kt`.
  - `requestId` KHÔNG làm label (cardinality cao) — lọc bằng LogQL `| json | requestId="..."`.
  - `clients[0].url = https://loki.<domain>/loki/api/v1/push`, `basic_auth{username,password}`.
- Giới hạn RAM ~96MB.

## Bảo mật

- TLS toàn tuyến (LiteSpeed AutoSSL) cho cả push lẫn Grafana.
- Endpoint push Loki có basic-auth (ở LiteSpeed); Loki & Grafana **chỉ bind `127.0.0.1`** → không truy cập trực tiếp từ internet, bắt buộc qua LiteSpeed.
- Grafana có login riêng, đổi mật khẩu admin mặc định.
- 80/443 đã do LiteSpeed quản; không mở thêm cổng public cho log stack.
- Không log body / không log secret (mật khẩu, token) → giảm rủi ro rò rỉ khi log rời máy.

## Lưu trữ & retention

- Log nhỏ (file/ngày cỡ chục–trăm KB toàn hệ). 30 ngày trong Loki ≈ vài trăm MB — không đáng kể với disk server B.
- File trên kt vẫn tự xoá sau 14 ngày (Winston `maxFiles: '14d'`).

## Triển khai (thứ tự)

1. **DNS**: trỏ `loki.<domain>` + `grafana.<domain>` → IP kamax (160.30.113.115).
2. **kamax (Docker)**: tạo compose (loki+grafana) bind `127.0.0.1` + config + mật khẩu Grafana → `docker compose up -d`. Verify `curl 127.0.0.1:3100/ready` = ready, `curl 127.0.0.1:3000` Grafana lên.
3. **kamax (LiteSpeed)**: tạo 2 vhost proxy + AutoSSL + basic-auth cho loki vhost → reload. Verify `https://loki.<domain>/ready` (qua auth) OK, `https://grafana.<domain>` đăng nhập OK.
4. **kt**: thêm Promtail + config + credential → `docker compose up -d`. Verify Promtail `/targets` healthy, không lỗi push.
5. **Grafana → Explore**: `{app="digital-book"}` ra log; thử lọc `service`, `level`, và `| json | requestId="..."` xuyên service.
6. (tuỳ chọn) Dashboard: số lỗi theo service; thời gian xử lý request (rút từ message "... - <ms>ms").

## Kiểm thử / nghiệm thu

- Loki `/ready` = ready; Grafana đăng nhập được qua HTTPS.
- Promtail không báo lỗi; positions tiến.
- End-to-end: tạo 1 request trên app → trong vài giây thấy ở Grafana; lọc đúng theo `requestId` ra đủ các dòng xuyên service.
- Thử tắt Promtail vài phút rồi bật lại → log khoảng tắt vẫn được bù từ file (đệm).

## Cần bạn cung cấp lúc triển khai

- ✅ SSH server B = `kamax`.
- **Domain** + 2 subdomain (mặc định đề xuất: `loki.<domain>`, `grafana.<domain>`) + tạo bản ghi DNS → 160.30.113.115.
- **Cách quản lý LiteSpeed** (cPanel / OpenLiteSpeed web admin / file config) để thêm 2 vhost proxy + AutoSSL — tôi cấu hình nếu truy cập được qua ssh, hoặc hướng dẫn bạn bấm.
- Xác nhận **retention 30 ngày** (đổi được).
- Cho phép tạo user/mật khẩu basic-auth Loki + mật khẩu admin Grafana (tôi sinh ngẫu nhiên, đưa bạn lưu).

## Ngoài phạm vi (lần này)

- Thu log các container khác trên server (task-management, nginx…).
- Log request/response body (đã quyết KHÔNG bật).
- Alerting (Grafana alerts) — có thể thêm sau.
- Metrics/tracing (Prometheus/Tempo) — ngoài phạm vi.
