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
| /kho | kho-service | 3008 |

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

### /linh-vuc (Lĩnh vực / entitlement — collection `linh_vuc`)
Danh mục lĩnh vực động + mapping menu→lĩnh vực (`menuKeys[]` nhúng). Seed mặc định
KE_TOAN/KHO khi collection rỗng (OnModuleInit). FE lọc menu theo `menuKeys`; BE không enforce.
| Method | Path | Description |
|--------|------|-------------|
| GET | /linh-vuc | List (JwtGuard, sort order ASC) — FE render menu |
| POST | /linh-vuc | Create (SuperAdmin) — chặn trùng code |
| PUT | /linh-vuc/:id | Update (SuperAdmin) — `code` bất biến |
| DELETE | /linh-vuc/:id | Delete (SuperAdmin) — chặn KE_TOAN & lĩnh vực còn tenant dùng |

### /kho (Warehouses)
| Method | Path | Description |
|--------|------|-------------|
| GET | /kho | List (paginated) |
| GET | /kho/all | List (all) |
| GET | /kho/search | Search |
| GET | /kho/stats | Statistics |
| GET | /kho/check-ma | Check code exists |
| GET | /kho/total | Count |
| GET | /kho/:id | By ID |
| POST | /kho | Create |
| PUT | /kho/:id | Update |
| DELETE | /kho/:id | Delete |

### /don-vi-tinh (Units of Measure)
| Method | Path | Description |
|--------|------|-------------|
| GET | /don-vi-tinh | List (paginated) |
| GET | /don-vi-tinh/all | List (all) |
| GET | /don-vi-tinh/search | Search |
| GET | /don-vi-tinh/stats | Statistics |
| GET | /don-vi-tinh/check-ma | Check code exists |
| GET | /don-vi-tinh/total | Count |
| GET | /don-vi-tinh/:id | By ID |
| POST | /don-vi-tinh | Create |
| PUT | /don-vi-tinh/:id | Update |
| DELETE | /don-vi-tinh/:id | Delete |

### /nhom-vat-tu (Material Groups)
| Method | Path | Description |
|--------|------|-------------|
| GET | /nhom-vat-tu | List (paginated) |
| GET | /nhom-vat-tu/all | List (all) |
| GET | /nhom-vat-tu/search | Search |
| GET | /nhom-vat-tu/stats | Statistics |
| GET | /nhom-vat-tu/check-ma | Check code exists |
| GET | /nhom-vat-tu/total | Count |
| GET | /nhom-vat-tu/:id | By ID |
| POST | /nhom-vat-tu | Create |
| PUT | /nhom-vat-tu/:id | Update |
| DELETE | /nhom-vat-tu/:id | Delete |

### /hang-hoa-vat-tu (Goods & Materials)
| Method | Path | Description |
|--------|------|-------------|
| GET | /hang-hoa-vat-tu | List (paginated) |
| GET | /hang-hoa-vat-tu/all | List (all) |
| GET | /hang-hoa-vat-tu/search | Search |
| GET | /hang-hoa-vat-tu/stats | Statistics |
| GET | /hang-hoa-vat-tu/check-ma | Check code exists |
| GET | /hang-hoa-vat-tu/total | Count |
| GET | /hang-hoa-vat-tu/:id | By ID |
| POST | /hang-hoa-vat-tu | Create |
| PUT | /hang-hoa-vat-tu/:id | Update |
| DELETE | /hang-hoa-vat-tu/:id | Delete |

### Other Master Data (same CRUD pattern)
- /chu-dau-tu, /dong-tien, /du-an, /hop-dong, /khoan-muc
- /loai-chung-tu, /loai-giao-dich, /ngan-hang
- /nhom-khoan-muc, /nhom-khuyen-mai, /nhom-quan-ly, /san-pham

### /clone (Sao chép danh mục cross-tenant — SuperAdmin)
| Method | Path | Description |
|--------|------|-------------|
| GET | /clone/categories | Danh sách danh mục copy được |
| POST | /clone/preview | Xem trước {sourceTenantId,targetTenantId,categories[]} → willInsert/willSkip |
| POST | /clone/execute | Thực thi copy (idempotent, skip trùng) |

### /import (Import Excel hàng loạt danh mục — module dùng chung `fe/src/components/import-danh-muc/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | /import/:resource | Import hàng loạt 1 danh mục. `resource` là 1 trong 21 key: tai-khoan, doi-tuong, du-an, san-pham, hop-dong, bo-phan, khoan-muc, kho, hang-hoa-vat-tu, don-vi-tinh, ly-do-khong-hop-le, nhom-vat-tu, chu-dau-tu, nhom-khoan-muc, ngan-hang, dong-tien, nhom-khuyen-mai, nhom-quan-ly, loai-chung-tu, loai-giao-dich, ho-so-chung-tu |

Request: `{ items: Record<string, unknown>[] }` (tối đa 2000 dòng/lần — `@ArrayMaxSize(2000)`). Mỗi phần tử được validate bằng DTO `Create...Dto` của chính danh mục đó rồi gọi lại `service.create()` sẵn có (giữ nguyên check trùng mã, tenant scoping). Chạy tuần tự, không `Promise.all`, để check trùng trong cùng 1 lần import vẫn đúng; 1 dòng lỗi không chặn các dòng sau.

Response: `{ success: true, data: { created: number, failed: [{ index: number, message: string }] } }`
- `index` là vị trí 0-based trong mảng `items` mà FE đã gửi lên — **không phải số dòng Excel**. FE bỏ qua các dòng trống hoàn toàn khi đọc file nên mảng gửi lên không còn khớp 1-1 với dòng Excel gốc; chỉ FE mới biết dòng Excel thật của từng phần tử nó gửi, nên việc quy đổi `index → rowNumber` để hiển thị lỗi làm ở FE.
- `message` tiếng Việt cố định kèm tên trường lỗi (lỗi validate) hoặc message thật từ `service.create()` (vd trùng mã).

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
| GET | /bao-cao/doanh-thu | Doanh thu theo đơn hàng × tháng (pivot Có 511, `startDate`/`endDate`) |

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

### /import/quy-chuan (Import Excel Quy chuẩn hạch toán)
| Method | Path | Description |
|--------|------|-------------|
| POST | /import/quy-chuan | Import hàng loạt Quy chuẩn hạch toán — cùng shape request/response với `/import/:resource` của master-data-service ở trên (`{ items: [] }` → `{ success: true, data: { created, failed: [{ index, message }] } }`) |

Đây là danh mục duy nhất trong 22 trang Import Excel nằm ở config-service (các danh mục còn lại đều ở master-data-service). Route mounted tại `@Controller('import')` riêng của config-service (không dùng chung registry với master-data-service).

## Kho Service (3008)

### /kho/phieu (Phiếu kho — Warehouse Vouchers)
| Method | Path | Description |
|--------|------|-------------|
| GET | /kho/phieu | List phiếu kho (paginated, filter by loaiPhieu) |
| GET | /kho/phieu/next-so?loaiPhieu= | Get next auto-generated phiếu number (NK/XK/CK) |
| GET | /kho/phieu/stats?loaiPhieu= | Statistics (total count, total value) |
| GET | /kho/phieu/:id | By ID |
| POST | /kho/phieu | Create phiếu kho |
| PUT | /kho/phieu/:id | Update phiếu kho |
| DELETE | /kho/phieu/:id | Delete phiếu kho |

**loaiPhieu values:** `NK` (Nhập kho — mẫu 01-VT), `XK` (Xuất kho — mẫu 02-VT), `CK` (Chuyển kho — mẫu 03XKNB3)

**Collections:** `phieu_kho`, `phieu_kho_sequence` (auto-increment so phieu per loaiPhieu)
