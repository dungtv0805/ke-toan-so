# Danh Muc (Master Data Catalog) — Page Facts

## Page → API Flow

All danh-muc pages follow the same pattern:
- **FE API:** `GET /api/master-data/{resource}?page=1&limit=15`
- **Gateway:** strips `/master-data` → forwards to port 3002
- **Service:** master-data-service (3002)

### /danh-muc/tai-khoan (Accounts)
- **FE API:** `GET /api/master-data/tai-khoan`
- **Controller:** `TaiKhoanController` at `master-data-service/src/tai-khoan/tai-khoan.controller.ts`
- **Service:** `TaiKhoanService` at `master-data-service/src/tai-khoan/tai-khoan.service.ts`
- **Key endpoints:** /hierarchy, /search, /leaf, /parents, /nhom/:nhom
- **Verified:** NO

### /danh-muc/doi-tuong (Counterparties)
- **FE API:** `GET /api/master-data/doi-tuong`
- **Controller:** `DoiTuongController` at `master-data-service/src/doi-tuong/doi-tuong.controller.ts`
- **Service:** `DoiTuongService`
- **Key endpoints:** /all, /search, /stats, /check-ma
- **Verified:** NO

### /danh-muc/quy-chuan (Standards)
- **NOTE:** This is on config-service (3007), NOT master-data-service!
- **FE API:** `GET /api/config/quy-chuan`
- **Controller:** `QuyChaunController` at `config-service/src/quy-chuan/quy-chuan.controller.ts`
- **Verified:** NO

### Other Catalog Pages (all on master-data-service 3002)
| Page | Resource | Controller |
|------|----------|-----------|
| /danh-muc/du-an | /du-an | DuAnController |
| /danh-muc/san-pham | /san-pham | SanPhamController |
| /danh-muc/bo-phan | /bo-phan | BoPhanController |
| /danh-muc/khoan-muc | /khoan-muc | KhoanMucController |
| /danh-muc/ngan-hang | /ngan-hang | NganHangController |
| /danh-muc/dong-tien | /dong-tien | DongTienController |
| /danh-muc/chu-dau-tu | /chu-dau-tu | ChuDauTuController |
| /danh-muc/nhom-khuyen-mai | /nhom-khuyen-mai | NhomKhuyenMaiController |
| /danh-muc/nhom-quan-ly | /nhom-quan-ly | NhomQuanLyController |
| /danh-muc/loai-chung-tu | /loai-chung-tu | LoaiChungTuController |
| /danh-muc/nhom-khoan-muc | /nhom-khoan-muc | NhomKhoanMucController |
| /danh-muc/loai-giao-dich | /loai-giao-dich | LoaiGiaoDichController |
| /danh-muc/hop-dong | /hop-dong | HopDongController |

## Important Notes

- All catalog pages use standard CRUD pattern
- Pagination: `?page=1&limit=15` (default)
- Search: `GET /{resource}/search?keyword=...`
- Most require JwtGuard + RoleGuard
- Create/Update/Delete restricted to ADMIN role (some allow KE_TOAN_TRUONG, KE_TOAN_TONG_HOP)
