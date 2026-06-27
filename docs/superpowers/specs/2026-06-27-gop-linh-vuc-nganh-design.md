# Thiết kế: Gộp Ngành (Nganh) vào Lĩnh vực (LinhVuc) — một khái niệm duy nhất

- Ngày: 2026-06-27
- Trạng thái: Đã duyệt mô hình (chờ review spec → writing-plans)
- Phạm vi: digital-books (be/ + fe/) + di trú dữ liệu prod

## 1. Bối cảnh

Hệ thống đang có **2 khái niệm gần trùng**:
- **`LinhVuc`** (trang "Lĩnh vực", có CRUD): `code, name, icon, color, order, isActive, menuKeys[]` → quyết định **MENU**. Thực tế đã được dùng như **ngành nghề**: KE_TOAN="Dịch vụ", KHO="Thương mại", SAN_XUAT="Sản xuất", XAY_DUNG="Xây dựng", GIAODUC="Giáo dục".
- **`Nganh`** (không có UI): `code, name, glossary` → quyết định **TITLE/nhãn**. Chỉ seed 1 bản (XAY_DUNG, glossary `chuDauTu`).

Quan sát dữ liệu prod:
- Mọi tenant chỉ thuộc **đúng 1** lĩnh vực (`modules = ["KE_TOAN"]` hoặc rỗng → mặc định KE_TOAN). Khả năng "nhiều phân hệ" không dùng.
- Không tenant nào có `nganh` (đều undefined) → tính năng nhãn-theo-ngành không chạy được.

**Kết luận:** `LinhVuc` đã chính là "lĩnh vực" mong muốn; chỉ **thiếu `glossary`**. `Nganh` là layer thừa.

## 2. Mục tiêu

Một khái niệm **"Lĩnh vực"** duy nhất (= `LinhVuc`), mỗi công ty thuộc **đúng 1**, quyết định **CẢ menu LẪN nhãn**. Bỏ `Nganh`.

## 3. Mô hình sau gộp

- `LinhVuc` thêm field **`glossary: Glossary`** (mặc định `{}`). Giờ mang cả `menuKeys` (menu) + `glossary` (nhãn).
- **Lĩnh vực của công ty** = `LinhVuc` ứng với module đơn của tenant (`tenant.modules[0]`, mặc định `KE_TOAN`). Đây là nguồn nhãn.
- Chuỗi resolve nhãn (đổi tầng `nganh` → `linhVuc`):
  ```
  tenant.glossary[k].surfaces[s] → tenant.glossary[k].label
  → linhVuc.glossary[k].surfaces[s] → linhVuc.glossary[k].label   ← (trước là nganh)
  → TERM_REGISTRY → key
  ```
- Lưu "Cả lĩnh vực" (SuperAdmin) → `PUT /linh-vuc/:id { glossary }` (thay cho `/nganh`). Lưu "Chỉ công ty này" → `tenant.glossary` (giữ nguyên).
- **Menu giữ nguyên** (đã đọc từ `LinhVuc.menuKeys`). Không công ty nào đổi menu.

## 4. Backend

### 4.1 Entity / DTO / Service
- `LinhVuc` entity: thêm `@Column({ type: 'json', default: {} }) glossary: Glossary`.
- `Create/UpdateLinhVucDto`: thêm `glossary?: Glossary` (optional).
- `linh-vuc.service`: `findAll` trả kèm `glossary`; `update` ghi `glossary`. Controller `PUT/POST /linh-vuc` đã `SuperAdminGuard` — giữ nguyên.

### 4.2 Di trú dữ liệu (one-off)
- Script copy `nganh.glossary` → `linh_vuc.glossary` theo `code` trùng (XAY_DUNG→XAY_DUNG; các code khác giữ `{}`). Chạy trên prod 1 lần.
- (Idempotent: chỉ ghi khi `linh_vuc.glossary` rỗng.)

### 4.3 Gỡ Nganh khỏi luồng
- `tenant.service`: bỏ `cloneGlossaryFromNganh` khi tạo/đổi tenant (không clone nữa — nhãn đọc live từ LinhVuc). `tenant.nganh` ngừng dùng (để cột lại, không xoá DB — tránh rủi ro).
- `auth-service` `/me`/login `TenantInfo`: không cần `nganh` nữa (FE suy ra lĩnh vực từ `modules`). Có thể giữ field để tương thích, FE bỏ dùng.
- Endpoint `/nganh` + entity Nganh: **giữ nguyên trong code** (không xoá vội) nhưng FE ngừng gọi. (Dọn hẳn ở đợt sau nếu muốn.)

## 5. Frontend

### 5.1 Service & type
- `linhVucService` (`LinhVuc` type): thêm `glossary: Glossary`; `update(id, { glossary?, ... })` nhận glossary; `getAll` map glossary.

### 5.2 AuthContext
- Thêm dẫn xuất **`currentLinhVuc`** = `allModules.find(m => m.code === currentTenant?.modules?.[0])` (mặc định `KE_TOAN`).
- Thêm **`applyLinhVucGlossary(glossary)`** cập nhật `glossary` của LinhVuc tương ứng trong `allModules` state (như `applyNganhGlossary` cũ).
- Bỏ `currentNganh`/`refreshNganh`/`applyNganhGlossary` + nạp danh sách nganh.

### 5.3 Resolve & nguồn đọc nhãn (đổi nguồn Nganh→LinhVuc)
- `TermContext`: truyền `currentLinhVuc?.glossary` vào `resolveTerm` (tham số giữa, tên đổi thành `linhVucGlossary`).
- `tableTitleConfig.lookupOverride`, `useTableTitleConfig`, `useFieldLabels`: đọc `currentLinhVuc?.glossary` (thay `currentNganh`).
- `TableTitleSettings`:
  - `canLinhVuc = isSuperAdmin && !!currentLinhVuc`; nhãn nút "Cả lĩnh vực ({currentLinhVuc.name})".
  - Lưu target 'linhVuc' → `linhVucService.update(currentLinhVuc.id, { glossary })` → `applyLinhVucGlossary`.

### 5.4 Trang Công ty (Tenant)
- Bỏ ô **"Ngành"** (set `tenant.nganh`). Lĩnh vực = ô chọn module — chuyển thành **chọn 1** (single) thay vì nhiều; lưu `modules=[code]`. (Hiện thực tế đã 1 giá trị.)

### 5.5 Trang "Lĩnh vực" (LinhVucPage)
- Giữ là nơi quản lý duy nhất (tên + menuKeys). Sửa nhãn vẫn qua ⚙️ trên các bảng (ghi vào `LinhVuc.glossary`). (Không cần thêm editor glossary trong trang này đợt đầu.)

## 6. Ngoài phạm vi
- Xoá hẳn entity/endpoint `Nganh` khỏi code (đợt dọn sau).
- Cho phép công ty nhiều lĩnh vực (bỏ — chốt 1).
- Thêm UI sửa glossary trong LinhVucPage (sửa qua ⚙️ là đủ).

## 7. Rủi ro / lưu ý
- **Tenant `modules` rỗng** → mặc định `KE_TOAN` ("Dịch vụ"); đảm bảo `currentLinhVuc` luôn có (fallback KE_TOAN).
- **Di trú glossary**: chỉ XAY_DUNG có dữ liệu; chạy 1 lần, idempotent.
- **Override cũ ở tenant** (VIBIZ `tbl:danhMuc.taiKhoan:ten`) vẫn ở tenant-level → không ảnh hưởng, vẫn hiển thị cho công ty đó.
- **Không đổi menu** bất kỳ công ty nào (chỉ thêm glossary + đổi nguồn đọc nhãn) → rủi ro thấp.
- Sau gộp: SuperAdmin muốn sửa nhãn "cả lĩnh vực" phải đang ở công ty thuộc lĩnh vực đó (currentLinhVuc theo tenant đang chọn).
