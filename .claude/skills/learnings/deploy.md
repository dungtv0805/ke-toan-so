# Deploy — Facts & Issues

## [2026-05-11] rsync failure workaround
- **Issue:** `rsync -az` to server kt fails with "unexpected end of file" (exit code 11)
- **Workaround:** Use `scp` instead of rsync for BE deploys
- **Verified:** YES

## [2026-05-11] Correct server paths
- BE dist: `kt:/root/chimseo/digital-book-be/dist/apps/{service-name}/main.js`
- FE build: `kt:/root/chimseo/nginx/build4/`
- NOT `/root/chimseo/be/dist/` (wrong path)
- **Verified:** YES

## [2026-05-12] Docker container architecture
- **BE container:** `digital-book-app` — runs all 8 services via PM2
  - Volume: host `/root/chimseo/digital-book-be/dist` → container `/app/dist`
  - Restart: `docker restart digital-book-app`
- **FE container:** `digital-book-nginx` — serves static FE files
  - Volume: host `/root/chimseo/nginx/build4` → container `/usr/share/nginx/html/build4`
  - Reload: `docker exec digital-book-nginx nginx -s reload`
  - Nginx config: proxies `/api/` to `http://digital-book-app:3000/api/`
- **Verified:** YES (2026-05-12, confirmed via docker inspect)

## BE Deploy Checklist
1. Build locally: `npx nest build {service-name}`
2. Upload: `scp dist/apps/{service-name}/main.js kt:/root/chimseo/digital-book-be/dist/apps/{service-name}/main.js`
3. Restart: `ssh kt "docker restart digital-book-app"`
4. Verify: `ssh kt "docker logs digital-book-app --tail 30"`
5. Test: navigate to relevant page on masterceo.com.vn

## FE Deploy Checklist
1. Build: `cd fe && npm run build`
2. Upload: `scp -r dist/* kt:/root/chimseo/nginx/build4/`
3. Reload nginx: `ssh kt "docker exec digital-book-nginx nginx -s reload"`
4. Test: navigate to masterceo.com.vn
