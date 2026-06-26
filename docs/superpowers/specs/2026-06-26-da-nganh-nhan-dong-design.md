# Thiết kế: Đa phân hệ + Nhãn hiển thị theo Ngành (multi-vertical)

- Ngày: 2026-06-26
- Trạng thái: Đã duyệt thiết kế (chờ review spec → writing-plans)
- Phạm vi: digital-books (fe/ + be/)

## 1. Bối cảnh & mục tiêu

Sản phẩm bán cho nhiều công ty thuộc **nhiều ngành khác nhau** (xây dựng, mầm non, …).
Cùng một nghiệp vụ/khối tính toán nhưng **tên hiển thị khác nhau** theo ngành: ví dụ
"Chủ đầu tư" đúng với công ty xây dựng nhưng vô lý với trường mầm non.

Hiện trạng (đã khảo sát code):

- `LinhVuc` (toàn cục): `code, name, menuKeys[]` — quyết định **menu nào hiển thị**.
- `Tenant.modules: string[]` — công ty đã có thể được cấp **nhiều** lĩnh vực, nhưng FE chỉ
  cho chọn **1 lĩnh vực active** (lưu `selectedModule:{tenantId}` trong localStorage), phải
  bấm "Đổi lĩnh vực" mới chuyển.
- Nhãn ("Chủ đầu tư", "CĐT", …) **hardcode** khắp nơi (menuCatalog FE, tiêu đề trang,
  header cột bảng, form) → không config được.
- Phân quyền **theo vai trò** (`PhanQuyen.permissions` = `route:action`, per-tenant), **không**
  theo lĩnh vực. "Theo lĩnh vực" hiện chỉ là **lọc menu hiển thị**.
- `ModuleGuard` (BE) đã chặn API theo `tenant.modules` (đa giá trị) — chuẩn cho đa phân hệ.
- Chưa có cơ chế template/clone cấu hình.

**Mục tiêu:**

1. Công ty có nhiều phân hệ → **gộp hết menu vào 1 sidebar**, bỏ bước chọn/đổi lĩnh vực.
2. **Tên hiển thị (menu, bảng, form) cấu hình được theo Ngành**; logic tính toán giữ nguyên.
3. Ngành là **template** cấu hình nhãn: clone sang công ty mới cùng ngành; chỉnh nhãn riêng
   cho công ty rồi **lưu ngược thành chuẩn ngành**.

**Ngoài phạm vi (xử lý sau):** khác biệt **nghiệp vụ/logic** theo ngành; clone phân hệ mặc
định / mẫu phân quyền / seed danh mục theo ngành (chỉ clone **nhãn** ở đợt này).

## 2. Khái niệm & mô hình dữ liệu

Tách bạch **hai** khái niệm (Mô hình A đã chốt):

| | Loại trừ nhau | Một công ty có | Quyết định |
|---|---|---|---|
| **Phân hệ** (Module) | Không | Nhiều (cộng dồn) | Menu nào hiển thị |
| **Ngành** (Nganh) | Có | Một | Tên hiển thị + là template nhãn |

### 2.1 Phân hệ — giữ nguyên `LinhVuc`

Không đổi cấu trúc. Chỉ đổi cách FE dùng `tenant.modules` (xem Phần 1).

### 2.2 Ngành — thực thể MỚI (danh mục toàn cục)

```
Nganh {
  code: string            // 'XAY_DUNG', 'MAM_NON' (immutable)
  name: string
  description?: string
  isActive: boolean
  glossary: Glossary      // từ điển nhãn CHUẨN của ngành (template)
}

type Glossary = {
  [termKey: string]: {
    label: string                       // nhãn gốc của khái niệm
    surfaces?: { [viTri: string]: string } // override theo vị trí cụ thể
  }
}
```

### 2.3 Gắn vào `Tenant` — thêm 2 trường

```
Tenant.nganh?: string      // mã ngành công ty thuộc về
Tenant.glossary: Glossary  // BẢN SAO glossary, công ty chỉnh riêng được
```

### 2.4 Term registry (FE) — danh bạ thuật ngữ gốc

File hằng ở FE khai báo các *khái niệm đổi-tên-được*, nhãn mặc định hệ thống, và các vị trí
xuất hiện (để màn config liệt kê + làm fallback cuối):

```
chuDauTu: {
  default: "Chủ đầu tư",
  short:   "CĐT",
  surfaces: ["menu", "pageTitle", "nkc.colMa", "nkc.colTen", "form"]
}
```

Bắt đầu với `chuDauTu`; mở rộng (duAn, sanPham, doiTuong, …) **không đổi kiến trúc**.

### 2.5 Chuỗi fallback khi render một nhãn

`Tenant.glossary[key].surfaces[viTri]`
→ `Tenant.glossary[key].label`
→ `termRegistry[key].default` (hoặc `.short` cho vị trí dạng viết tắt).

## 3. Phần 1 — Gộp menu nhiều phân hệ (bỏ "Đổi lĩnh vực")

Chủ yếu FE; BE không đổi.

1. **Bỏ chọn-1:** tính **union** `menuKeys` của tất cả phân hệ công ty được cấp
   (`tenant.modules` ∩ lĩnh vực `isActive`) + các key COMMON. Sidebar lọc theo tập này.
2. **Bỏ** bước bắt chọn lĩnh vực khi vào app (`needsModuleSelection`, `ModuleSelector`) và
   **bỏ** nút "Đổi lĩnh vực" (`ModuleSwitchModal`). Không còn `selectedModule` trong localStorage.
3. **Tiêu đề nhóm sidebar:** mỗi phân hệ là 1 nhóm header riêng (KẾ TOÁN, KHO, …) — đã chốt.
4. **Giữ nguyên** trang `/cau-hinh/linh-vuc` (gán phân hệ ↔ menu).
5. **Phân quyền vai trò** vẫn lọc đè như hiện tại.
6. **BE:** `ModuleGuard` đã đa giá trị theo `tenant.modules` → không sửa.

Biên: công ty 1 phân hệ → union = chính nó, chạy bình thường, không còn màn chọn thừa.

### File FE dự kiến đụng (Phần 1)
- `fe/src/components/layout/MainLayout.tsx` (filter union, nhóm header, bỏ switch)
- `fe/src/contexts/AuthContext.tsx` (bỏ `selectedModule`/`needsModuleSelection`)
- `fe/src/config/modules.ts` (helper union, bỏ getStoredModule/selection)
- Xoá/ngừng dùng `ModuleSelector`, `ModuleSwitchModal`

## 4. Phần 2 — Ngành + Nhãn động + Clone

### 4.1 Backend
- `Nganh` entity + CRUD (master-data-service, SuperAdminGuard) + seed `XAY_DUNG`
  (`glossary.chuDauTu = { label: "Chủ đầu tư", surfaces: { "nkc.colMa": "Mã CĐT",
  "nkc.colTen": "CĐT" } }`).
- `Tenant`: thêm `nganh`, `glossary`.
  - Chọn/đổi ngành cho tenant → **clone** `Nganh.glossary` vào `Tenant.glossary`.
  - Endpoint cập nhật `Tenant.glossary` (sửa nhãn công ty).
  - Endpoint **"Lưu thành chuẩn ngành"** → đẩy `Tenant.glossary` lên `Nganh.glossary`.
- `login` và `/me`: trả kèm `glossary` trong `TenantInfo` để FE có sẵn khi vào app.

### 4.2 Frontend render động
- `TermContext` + hook **`t(key, surface?)`** đọc glossary công ty, resolve theo fallback (2.5).
- Thay chuỗi hardcode bằng `t(...)`. **Pilot = `chuDauTu`**:
  menu, tiêu đề trang/breadcrumb, header cột NKC (Mã CĐT/CĐT), trang & form `danh-muc/chu-dau-tu`.
- Menu: map `menuKey → termKey` cho item đổi-tên-được; item khác giữ nhãn tĩnh.

### 4.3 Sửa nhãn — Tại chỗ (chính) + Trang tổng (phụ)
- **Vào chế độ sửa:** qua **icon settings (bánh răng)** trên thanh top → menu options →
  bật **"Đổi tiêu đề/nhãn"** (giữ giao diện gọn, không thêm nút nổi). Tái dùng icon bánh răng
  hiện có (chỗ trước đây chứa "Đổi lĩnh vực").
- **Tại chỗ (edit-in-place):** khi bật, nhãn đổi-tên-được có affordance (icon bút/click) →
  popover: nhập nhãn + chọn phạm vi:
  - **"Mọi nơi"** (mặc định) → ghi `glossary[key].label`.
  - **"Chỉ chỗ này"** → ghi `glossary[key].surfaces[viTri]`.
  - Lưu → cập nhật `Tenant.glossary`, áp dụng tức thì.
- **Trang tổng (phụ):** xem/sửa toàn bộ glossary dạng bảng + nút "Lưu thành chuẩn ngành";
  SuperAdmin quản lý template Ngành; tạo/sửa công ty chọn Ngành. Chỉ là *view khác* trên cùng
  `Tenant.glossary` → luôn nhất quán với sửa tại chỗ.
- Quyền sửa nhãn: Admin công ty (glossary công ty mình) + SuperAdmin (template ngành).

### 4.4 Triển khai từng bước
Dựng đủ cơ chế, áp `chuDauTu` xuyên suốt (menu → bảng → form) làm mẫu; bổ sung term khác sau
mà không đổi kiến trúc.

### File dự kiến đụng (Phần 2)
- BE: `be/libs/entities/src/nganh/*`, `be/libs/entities/src/tenant/tenant.entity.ts`,
  `be/apps/master-data-service/src/nganh/*`, `tenant.service.ts`,
  `be/apps/auth-service/src/auth-service.service.ts` (login/me trả glossary).
- FE: `fe/src/contexts/TermContext.tsx` (+ hook `t`), `fe/src/config/termRegistry.ts`,
  `fe/src/config/menuCatalog.ts` (map menuKey→termKey), các màn pilot (NKC EntryListTab,
  danh-muc/chu-dau-tu, ChuDauTuPage), trang config Ngành/glossary, dịch vụ API ngành.

## 5. Quyết định đã chốt (tóm tắt)

1. Mô hình A: tách Phân hệ (đa, gộp) và Ngành (một, nhãn + template).
2. Cơ chế nhãn: "Kết hợp" — từ điển thuật ngữ làm nền + override lẻ theo vị trí.
3. Clone khi chọn ngành: **chỉ bộ nhãn/thuật ngữ** (phân hệ/phân quyền/seed danh mục: sau).
4. Thứ tự: 1 spec tổng (file này) → triển khai Phần 1 → Phần 2.
5. Data model Mục 1 chốt; glossary để trên `Tenant`; Admin công ty được chỉnh.
6. Sidebar nhóm theo phân hệ.
7. Sửa nhãn: vào chế độ qua icon settings (bánh răng) → "Đổi tiêu đề/nhãn"; sửa tại chỗ +
   trang tổng; mặc định phạm vi "Mọi nơi".

## 6. Rủi ro / lưu ý

- Số điểm hardcode "CĐT/Chủ đầu tư" nằm rải rác → pilot 1 term để chuẩn hoá đường đi trước
  khi nhân rộng.
- `glossary` trả trong `/me`/login làm payload lớn dần khi nhiều term → cân nhắc endpoint riêng
  nếu phình to (hiện đủ nhỏ).
- Đảm bảo edit-in-place và trang tổng ghi cùng `Tenant.glossary` (một nguồn sự thật).
