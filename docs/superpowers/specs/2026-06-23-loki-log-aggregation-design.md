# Loki log aggregation cho Digital Books

- Ngày: 2026-06-23
- Trạng thái: Đã duyệt thiết kế

## Mục tiêu

Tập trung log của Digital Books vào Loki để xem/tra cứu qua Grafana (lọc theo
service/level/requestId), thay cho việc đọc file thủ công bằng `logs.sh`.

## Quyết định chính (đã chốt)

- **Loki + Grafana đặt ở SERVER B** (không phải server app `kt`), vì kt chật RAM (~2.1Gi khả dụng, share ~12 container).
- **Phạm vi**: chỉ log Digital Books (8 service trong container `digital-book-app`).
- **Collector trên kt**: **Promtail** (đọc file JSON sẵn có → đẩy lên Loki).
- **Đường mạng**: internet công khai → **bắt buộc TLS + basic-auth**.
- **Server B có domain** → Caddy + Let's Encrypt lo TLS tự động.
- **Giữ nguyên ghi log file trên kt** (Winston, đã tự xoá sau 14 ngày) làm nguồn + đệm.
- **Không log request/response body** (giữ logging hiện tại: access-log + metadata). Không sửa code app.

## Kiến trúc

```
Server kt (app)                              Server B (log stack, có domain)
 /root/chimseo/digital-book-be/logs/*.log     ┌─────────────────────────────────┐
   │ Promtail (container, chimseo net)        │ Caddy (TLS Let's Encrypt, :80/443)│
   │  - tail /logs/*.log, parse JSON          │   ├─ loki.<domain>   → loki:3100  │
   │  - label: service, level, app, host      │   │     (basic-auth ở proxy)      │
   └── HTTPS push (basic-auth) ──────────────►│   └─ grafana.<domain>→ grafana:3000│
        /loki/api/v1/push                     │ loki     (filesystem, retention)  │
                                              │ grafana  (datasource Loki, login) │
                                              └─────────────────────────────────┘
```

## Thành phần — Server B (docker-compose)

Một `docker-compose.yml` riêng cho log stack, mạng docker nội bộ; chỉ Caddy expose 80/443.

1. **loki** (`grafana/loki`)
   - Chế độ monolithic, lưu **filesystem** (TSDB schema), `auth_enabled: false` (auth làm ở Caddy).
   - **Compactor bật retention** `retention_period: 720h` (30 ngày).
   - Chỉ lắng nghe trong mạng docker (KHÔNG map cổng ra host).
   - Giới hạn RAM ~256MB. Volume `loki-data`.
2. **grafana** (`grafana/grafana`)
   - Provision sẵn datasource Loki (`http://loki:3100`).
   - Admin login (đổi mật khẩu mặc định), `GF_SERVER_ROOT_URL=https://grafana.<domain>`.
   - Đứng sau Caddy. Volume `grafana-data`. RAM ~256MB.
3. **caddy** (`caddy:2`)
   - `loki.<domain>` → `reverse_proxy loki:3100`, kèm `basicauth` cho route `/loki/api/v1/push` (user/pass cho Promtail).
   - `grafana.<domain>` → `reverse_proxy grafana:3000`.
   - TLS tự động (Let's Encrypt). Volumes `caddy-data`, `caddy-config`.

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

- TLS toàn tuyến (Caddy + Let's Encrypt) cho cả push lẫn Grafana.
- Endpoint push Loki có basic-auth; Loki không expose cổng ra ngoài (chỉ Caddy gọi nội bộ).
- Grafana có login riêng, đổi mật khẩu admin mặc định.
- Firewall server B: chỉ mở 80/443.
- Không log body / không log secret (mật khẩu, token) → giảm rủi ro rò rỉ khi log rời máy.

## Lưu trữ & retention

- Log nhỏ (file/ngày cỡ chục–trăm KB toàn hệ). 30 ngày trong Loki ≈ vài trăm MB — không đáng kể với disk server B.
- File trên kt vẫn tự xoá sau 14 ngày (Winston `maxFiles: '14d'`).

## Triển khai (thứ tự)

1. **DNS**: trỏ `loki.<domain>` + `grafana.<domain>` → IP server B.
2. **Server B**: tạo compose (loki+grafana+caddy) + config + bí mật (basic-auth Loki, mật khẩu Grafana) → `docker compose up -d`. Verify: Caddy ra cert, `https://loki.<domain>/ready` (qua auth) OK, đăng nhập Grafana OK.
3. **kt**: thêm Promtail + config + credential → `docker compose up -d`. Verify Promtail `/targets` healthy, không lỗi push.
4. **Grafana → Explore**: `{app="digital-book"}` ra log; thử lọc `service`, `level`, và `| json | requestId="..."` xuyên service.
5. (tuỳ chọn) Dashboard: số lỗi theo service; thời gian xử lý request (rút từ message "... - <ms>ms").

## Kiểm thử / nghiệm thu

- Loki `/ready` = ready; Grafana đăng nhập được qua HTTPS.
- Promtail không báo lỗi; positions tiến.
- End-to-end: tạo 1 request trên app → trong vài giây thấy ở Grafana; lọc đúng theo `requestId` ra đủ các dòng xuyên service.
- Thử tắt Promtail vài phút rồi bật lại → log khoảng tắt vẫn được bù từ file (đệm).

## Cần bạn cung cấp lúc triển khai

- Tên SSH (ssh config) của **server B**.
- **Domain** + 2 subdomain (mặc định đề xuất: `loki.<domain>`, `grafana.<domain>`).
- Xác nhận **retention 30 ngày** (đổi được).
- Cho phép tạo user/mật khẩu basic-auth Loki + mật khẩu admin Grafana (tôi sinh ngẫu nhiên, đưa bạn lưu).

## Ngoài phạm vi (lần này)

- Thu log các container khác trên server (task-management, nginx…).
- Log request/response body (đã quyết KHÔNG bật).
- Alerting (Grafana alerts) — có thể thêm sau.
- Metrics/tracing (Prometheus/Tempo) — ngoài phạm vi.
