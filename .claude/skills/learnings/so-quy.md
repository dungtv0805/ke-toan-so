# So Quy (Cash Book) — Page Facts

## Page → API Flow

### /so-quy (Cash Book)
- **FE API:** `GET /api/cash-book/so-quy?startDate=...&endDate=...`
- **Gateway:** strips `/cash-book` → forwards to port 3004
- **Controller:** `SoQuyController` at `cash-book-service/src/so-quy/so-quy.controller.ts`
- **Service:** `SoQuyService`
- **Verified:** NO

### Key Endpoints
| Endpoint | Description |
|----------|-------------|
| GET /so-quy | List entries |
| GET /so-quy/by-date-range | Filter by date range |
| GET /so-quy/by-month | Filter by month |
| GET /so-quy/stats | Statistics |
| GET /so-quy/search | Search |
| GET /so-quy/daily-summary | Daily summary |

## Important Notes

- Cash book service reads from same ChungTu collection as voucher service
- Provides different view (cash flow perspective) of same underlying data
- No write operations — read-only service
