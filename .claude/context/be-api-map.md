# Backend API Map — Complete Endpoint Reference

## Gateway Routing

All requests: `https://masterceo.com.vn/api/{prefix}/...` → Gateway (3000) → strip prefix → forward to service

| Prefix | Service | Port |
|--------|---------|------|
| /auth | auth-service | 3001 |
| /master-data | master-data-service | 3002 |
| /voucher | voucher-service | 3003 |
| /cash-book | cash-book-service | 3004 |
| /payable | payable-service | 3005 |
| /reporting | reporting-service | 3006 |
| /config | config-service | 3007 |

## Auth Service (3001)

| Method | Path | Description |
|--------|------|-------------|
| POST | /login | Login (returns tempToken + tenants or accessToken) |
| POST | /select-tenant | Select tenant after login |
| POST | /switch-tenant | Switch tenant (requires JWT) |
| POST | /register | Register new user |
| POST | /verify | Verify JWT token |
| GET | /me | Get current user profile |
| PUT | /me | Update profile |
| POST | /change-password | Change password |
| POST | /logout | Logout |

## Master Data Service (3002)

### /tai-khoan (Accounts)
| Method | Path | Description |
|--------|------|-------------|
| GET | /tai-khoan | List (paginated) |
| GET | /tai-khoan/hierarchy | Account tree |
| GET | /tai-khoan/search | Search |
| GET | /tai-khoan/total | Count |
| GET | /tai-khoan/parents | Parent accounts |
| GET | /tai-khoan/leaf | Leaf accounts |
| GET | /tai-khoan/nhom/:nhom | By group |
| GET | /tai-khoan/by-ma/:ma | By code |
| GET | /tai-khoan/:id | By ID |
| POST | /tai-khoan | Create |
| PUT | /tai-khoan/:id | Update |
| DELETE | /tai-khoan/:id | Delete |

### /doi-tuong (Counterparties)
| Method | Path | Description |
|--------|------|-------------|
| GET | /doi-tuong | List (paginated) |
| GET | /doi-tuong/all | List (all) |
| GET | /doi-tuong/search | Search |
| GET | /doi-tuong/total | Count |
| GET | /doi-tuong/stats | Statistics |
| GET | /doi-tuong/check-ma | Check code exists |
| GET | /doi-tuong/:id | By ID |
| POST | /doi-tuong | Create |
| PUT | /doi-tuong/:id | Update |
| DELETE | /doi-tuong/:id | Delete |

### /bo-phan (Departments)
Same CRUD pattern as /doi-tuong

### /tenants
| Method | Path | Description |
|--------|------|-------------|
| GET | /tenants | List all (SuperAdmin) |
| GET | /tenants/users | All users across tenants |
| GET | /tenants/:id | By ID |
| GET | /tenants/:id/members | Tenant members |
| POST | /tenants | Create |
| POST | /tenants/:id/members | Add member |
| PUT | /tenants/:id | Update |
| PUT | /tenants/:id/members/:userId | Update member |
| DELETE | /tenants/:id | Delete |
| DELETE | /tenants/:id/members/:userId | Remove member |

### Other Master Data (same CRUD pattern)
- /chu-dau-tu, /dong-tien, /du-an, /hop-dong, /khoan-muc
- /loai-chung-tu, /loai-giao-dich, /ngan-hang
- /nhom-khoan-muc, /nhom-khuyen-mai, /nhom-quan-ly, /san-pham

## Voucher Service (3003)

### /nhat-ky-chung (Journal Entries)
| Method | Path | Description |
|--------|------|-------------|
| GET | /nhat-ky-chung | List entries |
| GET | /nhat-ky-chung/stats | Statistics |
| GET | /nhat-ky-chung/aggregate-balance | Aggregate balance (for reporting) |
| GET | /nhat-ky-chung/summary/:type | Summary by type |
| GET | /nhat-ky-chung/:id | By ID |
| POST | /nhat-ky-chung | Create |
| POST | /nhat-ky-chung/batch | Batch create |
| PATCH | /nhat-ky-chung/:id | Update |
| PATCH | /nhat-ky-chung/batch | Batch update |
| DELETE | /nhat-ky-chung/:id | Delete |

### /phieu-thu, /phieu-chi (Vouchers)
| Method | Path | Description |
|--------|------|-------------|
| GET | /phieu-thu | List receipts |
| GET | /phieu-thu/search | Search receipts |
| GET | /phieu-thu/stats | Phieu thu statistics (tongSo, tongTien) |
| GET | /phieu-thu/summary/:type | Phieu thu summary by type (account/team/employee/project/investor/product/cash-flow/management-group/promotion-group) |
| GET | /phieu-chi | List payments |
| GET | /phieu-chi/search | Search payments |
| GET | /phieu-chi/stats | Phieu chi statistics (tongSo, tongTien) |
| GET | /phieu-chi/summary/:type | Phieu chi summary by type (account/team/employee/project/investor/product/cash-flow/management-group/promotion-group) |
| GET | /chung-tu | List all vouchers |
| GET | /chung-tu/:id | By ID |
| POST | /phieu-thu | Create receipt |
| POST | /phieu-thu/import | Import phieu thu (bulk) |
| POST | /phieu-chi | Create payment |
| POST | /phieu-chi/import | Import phieu chi (bulk) |
| PUT | /chung-tu/:id | Update |
| DELETE | /chung-tu/:id | Delete |

## Cash Book Service (3004)

### /so-quy
| Method | Path | Description |
|--------|------|-------------|
| GET | /so-quy | List |
| GET | /so-quy/by-date-range | By date range |
| GET | /so-quy/by-month | By month |
| GET | /so-quy/stats | Statistics |
| GET | /so-quy/search | Search |
| GET | /so-quy/daily-summary | Daily summary |

## Payable Service (3005)

### /phai-thu (Receivables)
| Method | Path | Description |
|--------|------|-------------|
| GET | /phai-thu | List |
| GET | /phai-thu/search | Search |
| GET | /phai-thu/qua-han | Overdue |
| GET | /phai-thu/aging-report | Aging report |
| GET | /phai-thu/summary-by-customer | By customer |
| GET | /phai-thu/grouped | Grouped |
| GET | /phai-thu/stats | Statistics |

### /phai-tra (Payables)
Same pattern as /phai-thu (with summary-by-supplier instead)

### /cong-no
| Method | Path | Description |
|--------|------|-------------|
| GET | /cong-no/:id | By ID |
| GET | /cong-no/doi-tuong/:doiTuongId | By counterparty |
| PUT | /cong-no/:id/payment | Update payment |

## Reporting Service (3006)

### /bao-cao (Reports)
| Method | Path | Description |
|--------|------|-------------|
| GET | /bao-cao/pnl | P&L report |
| GET | /bao-cao/balance-sheet | Balance sheet |
| GET | /bao-cao/kqkd | Operational results |

### /so-cai (Ledger)
| Method | Path | Description |
|--------|------|-------------|
| GET | /so-cai | Ledger by account |
| GET | /so-cai/all | All ledger entries |
| GET | /so-cai/summary-by-account | Summary |
| GET | /so-cai/stats | Statistics |
| GET | /so-cai/trial-balance | Trial balance |

## Config Service (3007)

### /phan-quyen (Permissions)
| Method | Path | Description |
|--------|------|-------------|
| GET | /phan-quyen | List all |
| GET | /phan-quyen/:id | By ID |
| GET | /phan-quyen/vai-tro/:vaiTro | By role |
| GET | /phan-quyen/vai-tro/:vaiTro/permissions | Role permissions |
| POST | /phan-quyen | Create |
| PUT | /phan-quyen/:id | Update |
| PUT | /phan-quyen/vai-tro/:vaiTro/permissions | Upsert role permissions |
| DELETE | /phan-quyen/:id | Delete |

### /nguoi-dung (Users)
| Method | Path | Description |
|--------|------|-------------|
| GET | /nguoi-dung | List (paginated) |
| GET | /nguoi-dung/stats | Statistics |
| GET | /nguoi-dung/available-users | Users not in tenant |
| GET | /nguoi-dung/:id | By ID |
| POST | /nguoi-dung | Create |
| POST | /nguoi-dung/add-existing | Add existing user |
| PUT | /nguoi-dung/:id | Update |
| DELETE | /nguoi-dung/:id | Delete |
| PATCH | /nguoi-dung/:id/toggle-status | Toggle status |

### /quy-chuan (Standards)
| Method | Path | Description |
|--------|------|-------------|
| GET | /quy-chuan | List |
| GET | /quy-chuan/stats | Statistics |
| GET | /quy-chuan/search | Search |
| GET | /quy-chuan/by-loai/:loai | By type |
| GET | /quy-chuan/suggested-accounts | Suggested accounts |
| GET | /quy-chuan/duplicate-check | Check duplicates |
| GET | /quy-chuan/:id | By ID |
| POST | /quy-chuan | Create |
| PUT | /quy-chuan/:id | Update |
| DELETE | /quy-chuan/:id | Delete |

### /vai-tro (Roles)
| Method | Path | Description |
|--------|------|-------------|
| GET | /vai-tro | List |
| GET | /vai-tro/:id | By ID |
| POST | /vai-tro | Create |
| PUT | /vai-tro/:id | Update |
| DELETE | /vai-tro/:id | Delete |

### /phieu-template (Mẫu in phiếu thu/chi)
| Method | Path | Description |
|--------|------|-------------|
| GET | /phieu-template/:loai | Lấy mẫu in HTML theo loại (PHIEU_THU/PHIEU_CHI); null nếu chưa cấu hình |
| PUT | /phieu-template/:loai | Upsert (upload) mẫu in `{ html }` |
| DELETE | /phieu-template/:loai | Xoá mẫu (FE về mẫu mặc định) |
