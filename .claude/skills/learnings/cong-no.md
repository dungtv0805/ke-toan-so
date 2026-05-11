# Cong No (Payables/Receivables) — Page Facts

## Page → API Flow

### /cong-no/phai-thu (Receivables)
- **FE API:** `GET /api/payable/phai-thu?page=1&limit=15`
- **Gateway:** strips `/payable` → forwards to port 3005
- **Controller:** `CongNoController` at `payable-service/src/cong-no/cong-no.controller.ts`
- **Service:** `CongNoService`
- **Verified:** NO

### /cong-no/phai-tra (Payables)
- **FE API:** `GET /api/payable/phai-tra?page=1&limit=15`
- **Same controller/service as phai-thu** — different query filter
- **Verified:** NO

### Key Endpoints
| Endpoint | Description |
|----------|-------------|
| GET /phai-thu | List receivables |
| GET /phai-thu/search | Search |
| GET /phai-thu/qua-han | Overdue items |
| GET /phai-thu/aging-report | Aging report |
| GET /phai-thu/summary-by-customer | By customer |
| GET /phai-thu/grouped | Grouped view |
| GET /phai-thu/stats | Statistics |
| GET /phai-tra | List payables |
| GET /phai-tra/summary-by-supplier | By supplier |
| GET /cong-no/:id | By ID |
| GET /cong-no/doi-tuong/:doiTuongId | By counterparty |
| PUT /cong-no/:id/payment | Update payment |

## Important Notes

- Payable service derives data from voucher entries (ChungTu)
- Receivables: entries where taiKhoanNo is a receivable account (131)
- Payables: entries where taiKhoanCo is a payable account (331)
- Only one write endpoint: PUT /cong-no/:id/payment
