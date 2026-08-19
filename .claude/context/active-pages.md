# Active Pages — Sidebar → Route → API Map

## Thanh ngang trong trang (SectionNav) — KHÔNG nằm trong sidebar

Một số mục đã được gỡ khỏi dropdown sidebar và chuyển lên thanh ngang đầu trang
(`fe/src/components/layout/SectionNav.tsx`, cấu hình ở `fe/src/config/sectionNavs.tsx`):

| Thanh | Mục | Hiện trên trang |
|-------|-----|-----------------|
| `CHUNG_TU_NAV` | Phiếu thu, Phiếu chi, Phiếu kế toán (soon) | Dữ liệu tổng hợp + các trang phiếu |
| `KHO_NAV` | Nhập kho, Xuất kho, Chuyển kho, Kiểm kê kho (soon) | Trang phiếu kho + 4 nhóm hàng trong Kho |
| `BAN_HANG_NAV` | Bán hàng, Báo cáo | Quản lý hợp đồng + Báo cáo hợp đồng |

> Menu "Kho" trong sidebar giờ là 4 nhóm hàng (Hàng hóa / Nguyên vật liệu / Dụng cụ /
> Văn phòng phẩm) dùng route `/trung-tam-du-lieu/*` — giữ key cũ để không phải cấp lại quyền.
> Menu "Danh mục" là 1 mục lá dẫn tới trang toàn màn hình `/danh-muc`
> (nội dung ở `fe/src/config/danhMucCatalog.ts`).

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
| Bao cao doanh thu | `/bao-cao/doanh-thu` | ACTIVE | reporting:3006 |
| Tong hop cong no | `/bao-cao/bang-tong-hop` | ACTIVE | reporting:3006 |
| Bao cao hop dong | `/bao-cao/hop-dong` | ACTIVE (thanh ngang Bán hàng) | reporting:3006 |

### KE TOAN — Trung Tam Du Lieu (Data Center)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Ke hoach | `/trung-tam-du-lieu/ke-hoach` | ACTIVE | voucher:3003 (`/voucher/ke-hoach`) |
| Du bao | `/trung-tam-du-lieu/du-bao` | ACTIVE | voucher:3003 (cung page, `loaiKeHoach=DU_BAO`) |
| Cac muc con lai | `/trung-tam-du-lieu/*` | COMING SOON | — |

> Kế hoạch & Dự báo dùng chung `fe/src/pages/ke-hoach/KeHoachPage.tsx` (prop `loaiKeHoach`).
> Lưới 17 cột giống "Dữ liệu tổng hợp"; dropdown view chuyển sang báo cáo so sánh
> Kế hoạch vs Thực hiện theo 12 chiều. 3 gauge "Tình hình thực hiện" ở Tổng quan lấy
> Kế hoạch từ `/voucher/ke-hoach/series`, Thực hiện từ `pnl-series` của reporting.

### KE TOAN — Chung Tu (Documents)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Nhat ky chung ("Dữ liệu tổng hợp") | `/chung-tu/nhat-ky-chung` | ACTIVE | voucher:3003 |
| Phieu thu | `/chung-tu/phieu-thu` | ACTIVE (thanh ngang, không ở sidebar) | voucher:3003 |
| Phieu chi | `/chung-tu/phieu-chi` | ACTIVE (thanh ngang, không ở sidebar) | voucher:3003 |
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

> Sidebar chỉ còn 1 mục "Danh mục" → `/danh-muc` (trang toàn màn hình liệt kê các link dưới đây).

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
| Ho so chung tu | `/danh-muc/ho-so-chung-tu` | ACTIVE | master-data:3002 |
| Ly do khong hop le | `/danh-muc/ly-do-khong-hop-le` | ACTIVE | master-data:3002 |
| So du dau ky | `/danh-muc/so-du-dau-ky` | ACTIVE | master-data:3002 |

> Tất cả 22 trang danh mục (trừ Số dư đầu kỳ) đều có nút "Import Excel" dùng chung
> `fe/src/components/import-danh-muc/`, config từng danh mục ở `configs/*.config.ts`.
> Nút gọi `POST /master-data/import/:resource` (21 danh mục) hoặc `POST /config/import/quy-chuan`
> (Quy chuẩn hạch toán). Trang Quy chuẩn hạch toán gắn nút ở component con
> `QuyChaunHeader.tsx` vì trang này không có toolbar riêng ở page — vẫn tính là đã wire.

### KHO (Warehouse)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Nhap kho | `/kho/nhap-kho` | ACTIVE (thanh ngang) | kho:3008 |
| Xuat kho | `/kho/xuat-kho` | ACTIVE (thanh ngang) | kho:3008 |
| Chuyen kho | `/kho/chuyen-kho` | ACTIVE (thanh ngang) | kho:3008 |
| Kiem ke kho | `/kho/kiem-ke` | COMING SOON | — |
| Hang hoa / NVL / Dung cu / VPP | `/trung-tam-du-lieu/{hang-hoa,nguyen-lieu,dung-cu,van-phong-pham}` | COMING SOON (sidebar Kho) | — |

### CAU HINH (Configuration)
| Menu Item | Route | Status | API |
|-----------|-------|--------|-----|
| Phan quyen | `/cau-hinh/phan-quyen` | ACTIVE | config:3007 |
| Vai tro | `/cau-hinh/vai-tro` | ACTIVE | config:3007 |
| Thanh vien | `/cau-hinh/thanh-vien` | ACTIVE | config:3007 |
| Tenant | `/cau-hinh/tenant` | ACTIVE | master-data:3002 |
| Linh vuc | `/cau-hinh/linh-vuc` | ACTIVE (SuperAdmin) | master-data:3002 |

## Summary

- **Total sidebar items:** ~80+
- **Active (implemented):** ~35
- **Coming Soon:** ~45+
- **Services used by active pages:** auth(3001), master-data(3002), voucher(3003), cash-book(3004), payable(3005), reporting(3006), config(3007), kho(3008)
