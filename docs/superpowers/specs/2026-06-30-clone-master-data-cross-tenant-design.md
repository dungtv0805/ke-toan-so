# Thiết kế: Sao chép danh mục giữa công ty (Clone master data cross-tenant)

**Ngày:** 2026-06-30
**Trạng thái:** Đã duyệt thiết kế, chờ viết plan
**Phạm vi:** Hướng A — copy trực tiếp tenant → tenant, dành cho SuperAdmin

## 1. Bối cảnh & mục tiêu

Các công ty (tenant) cùng lĩnh vực thường dùng chung bộ danh mục. Hiện việc sao chép
danh mục giữa 2 công ty chỉ làm được bằng script mongosh chạy tay trên server
(`be/scripts/clone-master-data.js`) — cần quyền vào server, dễ sai, không scale.

Mục tiêu: cung cấp chức năng UI cho SuperAdmin sao chép **toàn bộ một danh mục** từ
công ty nguồn sang công ty đích, giữ nguyên nội dung, sinh `_id` mới, idempotent
(chạy lại an toàn).

## 2. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Phạm vi danh mục | Khung **registry mở rộng được**; khởi đầu **7 danh mục** |
| Chính sách trùng | **Bỏ qua nếu trùng** (theo khóa dedup); không ghi đè |
| Mức chọn | Theo **cả danh mục** (không chọn từng dòng) |
| Luồng | **2 bước**: Xem trước → Sao chép |
| Phân quyền | **Chỉ SuperAdmin** (`SuperAdminGuard`, email `admin@company.com`) |

## 3. Danh mục trong registry (7 entry khởi đầu)

| key | Nhãn | Collection | Khóa dedup | Remap |
|---|---|---|---|---|
| `tai-khoan` | Tài khoản | `tai_khoan` | `ma` | `parentId` → `_id` mới (cây tài khoản) |
| `ho-so-chung-tu` | Biên tập hồ sơ (Hồ sơ chứng từ) | `ho_so_chung_tu` | `ma` | — (sinh idMap cho `quy-chuan`) |
| `khoan-muc` | Khoản mục chi phí | `khoan_muc` | `ma` | — (`nhom` là mã, copy nguyên) |
| `nhom-khoan-muc` | Nhóm khoản mục | `nhom_khoan_muc` | `ma` | — |
| `loai-chung-tu` | Loại chứng từ | `loai_chung_tu` | `ma` | — |
| `loai-giao-dich` | Loại giao dịch | `loai_giao_dich` | `ma` | — (`loaiChungTuMa` là mã, copy nguyên) |
| `quy-chuan` | Quy chuẩn hạch toán | `quy_chuan` | `loaiGiaoDich+nghiepVu+taiKhoanNo+taiKhoanCo` | `hoSoChungTu[].id` → `_id` `ho_so_chung_tu` mới |

### Toàn vẹn tham chiếu
- **Code-based (an toàn copy nguyên):** `khoan_muc.nhom`→nhóm.ma,
  `loai_giao_dich.loaiChungTuMa`→loại CT.ma, `quy_chuan.taiKhoanNo/Co`→tài khoản.ma,
  `quy_chuan.loaiGiaoDich/nghiepVu` (mã/chuỗi).
- **ID-based (phải remap):**
  - `tai_khoan.parentId` trỏ `_id` cha trong cùng tenant → remap bằng idMap của chính `tai-khoan`.
  - `quy_chuan.hoSoChungTu[].id` trỏ `_id` của `ho_so_chung_tu` → remap bằng idMap của
    `ho-so-chung-tu` (giữ `ma`/`ten`).
- **Thứ tự xử lý:** `ho-so-chung-tu` PHẢI clone trước `quy-chuan` (để có idMap). Registry
  khai báo theo thứ tự phụ thuộc; các danh mục còn lại độc lập.
- **Ghi chú robustness:** FE Quy chuẩn match hồ sơ theo `ma` và tự gán lại `id` của tenant
  đích khi user mở+lưu (`QuyChaunForm.tsx`), nên kể cả thiếu remap thì hiển thị vẫn đúng
  và tự lành khi sửa. Remap để đúng-ngay-từ-đầu, không phải để tránh lỗi hiển thị. Thực tế
  data hiện tại `hoSoChungTu` đang rỗng nên remap chủ yếu phục vụ tương lai + test.

## 4. Registry — interface

```ts
interface CloneableCategory {
  key: string;                 // 'tai-khoan'
  label: string;               // 'Tài khoản'
  entity: EntityClassOrSchema; // TaiKhoan (để forFeatureRaw)
  dedupKey: (doc) => string;   // chuỗi khóa chống trùng ở đích
  // remap tùy chọn: sửa tham chiếu id trên doc đã clone (trước khi insert).
  // Nhận idMaps của tất cả danh mục đã xử lý trong cùng lần execute.
  remap?: (doc, idMaps: Record<string, Map<string,string>>) => void;
}
```

- `idMaps[categoryKey]`: Map `oldIdStr → targetIdStr` (id đích nếu đã tồn tại theo
  dedup, ngược lại id mới sinh ra). Mọi danh mục đều build idMap của mình (để danh mục
  sau dùng), kể cả khi không tự remap.
- `tai-khoan.remap`: `doc.parentId = idMaps['tai-khoan'].get(doc.parentId) ?? doc.parentId`.
- `quy-chuan.remap`: với mỗi phần tử `hoSoChungTu`,
  `el.id = idMaps['ho-so-chung-tu'].get(el.id) ?? el.id` (giữ `ma`/`ten`).
- Các danh mục còn lại không cần `remap` (tham chiếu bằng mã code hoặc độc lập).

## 5. Backend

### Module mới: `clone-master-data` (trong master-data-service)
- Đăng ký 7 entity qua **`DatabaseModule.forFeatureRaw([...])`** → repo KHÔNG bị tenant
  proxy lọc, cho phép đọc tenant nguồn & ghi tenant đích bằng cách set `tenantId` tường minh.
  (Đúng pattern `tenant.service.ensureAdminRole`.) Tất cả service chung 1 Mongo DB
  `digital_book` nên module này ghi được cả `quy_chuan` (entity vốn dùng ở config-service).
- Tenant entity (connection `identity`) inject để validate tồn tại 2 tenant.

### Service: `CloneMasterDataService`
- `getCategories()` → `[{key,label}]` từ registry.
- `preview(src, dst, keys[])` → mỗi category `{key, label, total, willInsert, willSkip}`.
  Đọc docs nguồn, đếm theo `dedupKey` so với đích. KHÔNG ghi.
- `execute(src, dst, keys[])` → xử lý theo thứ tự registry (lọc theo keys đã chọn,
  giữ phụ thuộc). Mỗi category:
  1. Đọc docs nguồn.
  2. Build idMap (old→target): nếu dedup trùng ở đích thì map sang `_id` đích đang có;
     ngược lại sinh `new ObjectId()`.
  3. Với doc chưa trùng: gán `_id` mới, `tenantId=dst`, gọi `remap(doc, idMaps)`, insert.
  4. Trả `{key, label, inserted, skipped}`.
  - Best-effort: lỗi 1 category được bắt & gom, không chặn category khác.

### Controller: `CloneMasterDataController` — `@UseGuards(JwtGuard, SuperAdminGuard)`
| Method | Path | Body | Trả |
|---|---|---|---|
| GET | `/master-data/clone/categories` | — | `[{key,label}]` |
| POST | `/master-data/clone/preview` | `{sourceTenantId, targetTenantId, categories[]}` | per-category preview |
| POST | `/master-data/clone/execute` | (như trên) | per-category result |

- Validate (cả preview & execute): `source !== target`; 2 tenant tồn tại;
  `categories ⊆ registry`. Sai → `400`. Không phải SuperAdmin → `403`.

## 6. Frontend

### Trang mới `/cau-hinh/sao-chep-danh-muc` (chỉ SuperAdmin)
- Đặt cạnh `TenantPage` trong nhóm `cau-hinh` (`fe/src/App.tsx`); KHÔNG bọc
  `ProtectedRoute` (giống route `tenant`) — gate bằng `SuperAdminGuard` ở BE.
- Menu item chỉ hiện khi `isSuperAdmin` (giống cách ẩn/hiện trang Tenant).
- Service FE mới `cloneMasterDataService` (`ServiceBase`, endpoint `/master-data/clone`).

### UX 2 bước (1 trang)
1. Chọn **Công ty nguồn** + **Công ty đích** (dropdown từ `tenantService.getAll()`).
   Tick danh mục (mặc định tick hết). Chặn nguồn ≡ đích.
2. **Xem trước** → bảng: danh mục | tổng nguồn | sẽ thêm | bỏ qua (trùng).
3. **Sao chép** → bảng kết quả: danh mục | đã thêm | bỏ qua. Toast tổng kết.

## 7. Lỗi & biên

- Idempotent: chạy lại chỉ thêm bản ghi mới, không nhân đôi.
- Chọn `quy-chuan` mà bỏ tick `ho-so-chung-tu`: `hoSoChungTu[].id` không remap được
  (idMap rỗng) → giữ id nguồn. Vẫn vô hại (hiển thị theo `ma`/`ten`, tự lành khi user
  sửa). UI nhắc nên tick kèm `ho-so-chung-tu`. Không ép buộc.
- Tenant đích đã có data riêng: được giữ nguyên (chỉ skip theo dedup).

## 8. Test

- **Unit (`CloneMasterDataService`):** mock raw repos.
  - dedup: bản ghi trùng `ma` ở đích → skip; mới → insert với `tenantId` đích.
  - `tai-khoan.parentId` remap đúng theo idMap; không dangling.
  - `quy-chuan` dedup theo tổ hợp `loaiGiaoDich+nghiepVu+taiKhoanNo+taiKhoanCo`.
  - `quy-chuan.hoSoChungTu[].id` remap theo idMap `ho-so-chung-tu`.
  - thứ tự phụ thuộc: `ho-so-chung-tu` chạy trước `quy-chuan`.
  - preview không ghi; số liệu khớp execute.
- **Registry** tách thành unit thuần (mảng khai báo + hàm dedup/remap) test độc lập.
- Validate controller: source≡target → 400; non-superadmin → 403.

## 9. Ngoài phạm vi (YAGNI)

- Chọn từng bản ghi; ghi đè bản trùng; template theo lĩnh vực (Hướng B);
  copy các danh mục khác (đơn vị tính, đối tượng, hàng hoá…) — thêm sau bằng cách khai
  báo entry registry; lịch sử/audit log thao tác copy.
