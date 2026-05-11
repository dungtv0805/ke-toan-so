---
name: db-be
description: Use when working on backend services, APIs, controllers, or service-to-service communication in digital-books be/ directory
---

# Digital Books — Backend Skill

## Mandatory First Actions

1. Read `.claude/context/service-communication.md` — inter-service HTTP, deployment
2. Read `.claude/context/be-api-map.md` — full API endpoint map
3. Read `.claude/skills/learnings/system.md` — system-wide facts

## Architecture

- NestJS 11 monorepo with 8 microservices
- MongoDB with TypeORM
- Single Docker container running all services via PM2
- Gateway (port 3000) routes to services by path prefix

## Service Map

| Service | Port | Prefix | Purpose |
|---------|------|--------|---------|
| gateway | 3000 | /api/* | Route to services |
| auth | 3001 | /auth | JWT authentication |
| master-data | 3002 | /master-data | Accounts, counterparties |
| voucher | 3003 | /voucher | Vouchers, journal entries |
| cash-book | 3004 | /cash-book | Cash flow |
| payable | 3005 | /payable | Receivables/payables |
| reporting | 3006 | /reporting | Financial reports |
| config | 3007 | /config | Permissions, roles, users |

## Inter-Service Communication

Reporting service calls other services via `ServiceClient` (HTTP):
- `reporting → voucher`: aggregateBalance, getNhatKyChung
- `reporting → master-data`: getTaiKhoan

ServiceClient resolves URLs from env vars:
1. `{PREFIX}_SERVICE_URL` (production format)
2. `SERVICE_{PREFIX}_HOST` + `SERVICE_{PREFIX}_PORT`
3. Fallback: `localhost:3000`

## Key Patterns

### Controller Pattern
```typescript
@Controller('resource-name')
@UseGuards(JwtGuard, RoleGuard)
export class ResourceController {
  @Get()
  @Roles(Role.ADMIN, Role.KE_TOAN_TRUONG)
  async getAll(@Query() query: QueryDto) { ... }
}
```

### Tenant Context
- JWT contains tenantId
- AsyncLocalStorage propagates tenant context
- MongoDB queries auto-filtered by tenantId via TenantProxy

## Common Mistakes

- ServiceClient swallows errors silently — always check `res.success`
- Gateway strips prefix before forwarding — internal service paths don't include prefix
- Env var format mismatch: production uses `_URL`, dev uses `_HOST`/`_PORT`
- Multiple services have similar endpoint names (e.g., /stats, /search)
