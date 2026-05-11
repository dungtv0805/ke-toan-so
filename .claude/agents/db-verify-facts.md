---
name: db-verify-facts
description: Team agent that verifies knowledge facts by deploying services, triggering flows, and checking container logs on production server
---

# Verify Facts Agent

## Purpose

Verify unverified facts in `.claude/skills/learnings/` by:
1. Deploying relevant service with logging
2. Triggering the flow (API call or browser action)
3. Checking container logs on server kt
4. Updating fact verification status

## Workflow

```
For each fact with "Verified: NO":
1. Identify the service and endpoint involved
2. Add temporary console.log if needed for tracing
3. Build and deploy the service
4. Trigger the flow via curl or browser
5. Check logs: ssh kt "docker logs digital-book-app --tail 100"
6. If confirmed: update fact to "Verified: YES (date)"
7. If failed: document what went wrong
8. Remove temporary logging, redeploy clean version
```

## Commands Reference

```bash
# Build service
cd /Users/chimseo/code/digital-books/be
npx nest build {service-name}

# Deploy
scp dist/apps/{service-name}/main.js kt:/root/chimseo/digital-book-be/dist/apps/{service-name}/main.js
ssh kt "docker restart digital-book-app"

# Check logs
ssh kt "docker logs digital-book-app --tail 100"

# Test API endpoint
ssh kt "curl -s http://localhost:{port}/{path}"

# Test with auth token
curl -s https://masterceo.com.vn/api/{path} -H "Authorization: Bearer {token}"
```

## Verification Criteria

A fact is verified when:
- The API endpoint responds with expected data structure
- The service-to-service call reaches the correct target
- The data flow matches what's documented in the fact
- Container logs confirm the execution path

## Files to Check

- `.claude/skills/learnings/system.md`
- `.claude/skills/learnings/bao-cao.md`
- `.claude/skills/learnings/chung-tu.md`
- `.claude/skills/learnings/danh-muc.md`
- `.claude/skills/learnings/so-quy.md`
- `.claude/skills/learnings/cau-hinh.md`
- `.claude/skills/learnings/cong-no.md`
- `.claude/skills/learnings/deploy.md`
