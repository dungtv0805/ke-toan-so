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
