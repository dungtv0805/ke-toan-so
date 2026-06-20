# Active Pages — Sidebar → Route → API Map

## Sidebar Structure

### DIEU HANH (Management)
| Menu Item | Route | Status |
|-----------|-------|--------|
| Tong quan | `/` | ACTIVE |
| Phan tich (7 sub-items) | `/phan-tich/*` | COMING SOON |

### KE TOAN — Bao Cao (Reports)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Tai chinh | `/bao-cao/tai-chinh` | ACTIVE | reporting:3006 |
| So cai | `/bao-cao/so-cai` | ACTIVE | reporting:3006 |
| PnL | `/bao-cao/pnl` | ACTIVE | reporting:3006 |
| So chi tiet TK | `/bao-cao/so-chi-tiet-tai-khoan` | ACTIVE | reporting:3006 |
| Bang tong hop | `/bao-cao/bang-tong-hop` | COMING SOON | — |

### KE TOAN — Trung Tam Du Lieu (Data Center)
| Menu Item | Route | Status |
|-----------|-------|--------|
| All 9 items | `/trung-tam-du-lieu/*` | COMING SOON |

### KE TOAN — Chung Tu (Documents)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Nhat ky chung | `/chung-tu/nhat-ky-chung` | ACTIVE | voucher:3003 |
| Phieu thu | `/chung-tu/phieu-thu` | ACTIVE | voucher:3003 |
| Phieu chi | `/chung-tu/phieu-chi` | ACTIVE | voucher:3003 |
| 8 other items | `/chung-tu/*` | COMING SOON | — |

### KE TOAN — So Quy (Cash Book)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| So quy | `/so-quy` | ACTIVE | cash-book:3004 |

### KE TOAN — Cong No (Payables)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Phai thu | `/cong-no/phai-thu` | ACTIVE | payable:3005 |
| Phai tra | `/cong-no/phai-tra` | ACTIVE | payable:3005 |

### THU VIEN — Danh Muc (Catalog)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Tai khoan | `/danh-muc/tai-khoan` | ACTIVE | master-data:3002 |
| Doi tuong | `/danh-muc/doi-tuong` | ACTIVE | master-data:3002 |
| Du an | `/danh-muc/du-an` | ACTIVE | master-data:3002 |
| San pham | `/danh-muc/san-pham` | ACTIVE | master-data:3002 |
| Bo phan | `/danh-muc/bo-phan` | ACTIVE | master-data:3002 |
| Khoan muc | `/danh-muc/khoan-muc` | ACTIVE | master-data:3002 |
| Ngan hang | `/danh-muc/ngan-hang` | ACTIVE | master-data:3002 |
| Dong tien | `/danh-muc/dong-tien` | ACTIVE | master-data:3002 |
| Chu dau tu | `/danh-muc/chu-dau-tu` | ACTIVE | master-data:3002 |
| Nhom khuyen mai | `/danh-muc/nhom-khuyen-mai` | ACTIVE | master-data:3002 |
| Nhom quan ly | `/danh-muc/nhom-quan-ly` | ACTIVE | master-data:3002 |
| Loai chung tu | `/danh-muc/loai-chung-tu` | ACTIVE | master-data:3002 |
| Nhom khoan muc | `/danh-muc/nhom-khoan-muc` | ACTIVE | master-data:3002 |
| Loai giao dich | `/danh-muc/loai-giao-dich` | ACTIVE | master-data:3002 |
| Hop dong | `/danh-muc/hop-dong` | ACTIVE | master-data:3002 |
| Quy chuan | `/danh-muc/quy-chuan` | ACTIVE | config:3007 |
| Kho | `/danh-muc/kho` | ACTIVE | master-data:3002 |
| Hang hoa vat tu | `/danh-muc/hang-hoa-vat-tu` | ACTIVE | master-data:3002 |
| Don vi tinh | `/danh-muc/don-vi-tinh` | ACTIVE | master-data:3002 |
| Nhom vat tu | `/danh-muc/nhom-vat-tu` | ACTIVE | master-data:3002 |

### KHO (Warehouse)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Nhap kho | `/kho/nhap-kho` | ACTIVE | kho:3008 |
| Xuat kho | `/kho/xuat-kho` | ACTIVE | kho:3008 |
| Chuyen kho | `/kho/chuyen-kho` | ACTIVE | kho:3008 |

### CAU HINH (Configuration)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Phan quyen | `/cau-hinh/phan-quyen` | ACTIVE | config:3007 |
| Vai tro | `/cau-hinh/vai-tro` | ACTIVE | config:3007 |
| Thanh vien | `/cau-hinh/thanh-vien` | ACTIVE | config:3007 |
| Tenant | `/cau-hinh/tenant` | ACTIVE | master-data:3002 |

## Summary

- **Total sidebar items:** ~80+
- **Active (implemented):** ~35
- **Coming Soon:** ~45+
- **Services used by active pages:** auth(3001), master-data(3002), voucher(3003), cash-book(3004), payable(3005), reporting(3006), config(3007), kho(3008)
