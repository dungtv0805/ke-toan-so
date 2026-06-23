# Spec: Quản lý lĩnh vực & mapping menu động (config DB)

**Ngày:** 2026-06-23
**Branch:** `feat/linh-vuc-config-dong`
**Trạng thái:** Design approved — chờ viết plan

## 1. Bối cảnh & vấn đề

Hệ thống đã chia chức năng theo **lĩnh vực** (entitlement): hiện có `KE_TOAN` (Kế toán) và `KHO` (Kho). Mỗi công ty (tenant) được cấp một số lĩnh vực qua `Tenant.modules` (đã có sẵn trong DB). FE ẩn/hiện menu sidebar theo lĩnh vực đang chọn + role.

Hiện trạng **tĩnh**, hardcode ở 2 chỗ trong `fe/src/config/modules.ts`:
- Danh sách lĩnh vực: `MODULES` (mảng constant).
- Mapping menu → lĩnh vực: `KHO_MENU_KEYS`, `COMMON_MENU_KEYS`, `moduleOfMenuKey()`.

Muốn thêm lĩnh vực mới hoặc đổi menu thuộc lĩnh vực nào đều phải sửa code + deploy.

**Mục tiêu:** đưa cả (a) danh sách lĩnh vực và (b) mapping menu → lĩnh vực vào DB, quản lý qua UI SuperAdmin. Đây là phạm vi "Mức 2 + Mức 1" — **không** biến toàn bộ cây menu thành CMS (route + component vẫn ở code).

## 2. Quyết định đã chốt (từ brainstorming)

| # | Quyết định | Chọn |
|---|-----------|------|
| 1 | Phạm vi mapping | **Chung toàn hệ thống** (SuperAdmin quản lý 1 bộ duy nhất). Không per-tenant. |
| 2 | Lĩnh vực động? | **Có** — CRUD lĩnh vực qua UI (gồm cả Mức 1). |
| 3 | Quan hệ menu–lĩnh vực | **Nhiều-nhiều** — 1 menu có thể thuộc nhiều lĩnh vực. |
| 4 | BE enforce? | **Không** — chỉ ẩn menu ở FE như v1. BE enforcement để sau. |

## 3. Phi mục tiêu (out of scope)

- BE **không** enforce lĩnh vực (không chặn API theo `tenant.modules`). Giữ nguyên hành vi v1: chỉ ẩn menu FE.
- **Không** đưa cây menu (label/path/icon/thứ tự/cấp) vào DB. Menu vẫn khai báo trong code; chỉ "nhãn lĩnh vực" của từng menu key là động.
- **Không** làm dynamic routing. Thêm trang mới vẫn cần code route + component.
- Mapping **không** per-tenant.

## 4. Kiến trúc dữ liệu (Hướng A — gán menu nhúng trong lĩnh vực)

Một collection duy nhất cho lĩnh vực; danh sách menu key thuộc lĩnh vực được nhúng vào chính document đó. Quan hệ nhiều-nhiều đạt được tự nhiên: 1 menu key có thể xuất hiện trong `menuKeys` của nhiều lĩnh vực.

### Entity `linh_vuc` (master-data-service, cạnh `tenant`)

```
linh_vuc {
  code: string         // unique, vd 'KE_TOAN', 'KHO' (immutable sau khi tạo)
  name: string         // 'Kế toán'
  description?: string
  icon: string         // tên icon AntD (whitelist), vd 'AccountBookOutlined'
  color: string        // hex, vd '#1B3A6B'
  order: number        // thứ tự hiển thị
  isActive: boolean    // default true
  menuKeys: string[]   // các menu key thuộc lĩnh vực này, vd ['/chung-tu/phieu-nhap', ...]
}
```

- `code` là khóa nghiệp vụ, **bất biến** sau khi tạo (vì `Tenant.modules` tham chiếu theo `code`).
- `menuKeys` chứa các key của menu lá (trùng path route, giống logic hiện tại).
- COMMON **không** lưu ở đây — giữ `COMMON_MENU_KEYS` ở code (xem §6).

### Vì sao Hướng A (so với B/C)

- **B (collection mapping riêng):** 2 collection + 2 CRUD, lợi ích query-by-menu không cần thiết ở quy mô ~70 key.
- **C (1 doc config tổng):** dễ ghi đè khi sửa đồng thời, kém sạch.
- **A:** 1 collection, gộp "quản lý lĩnh vực" + "gán menu" vào cùng 1 màn sửa lĩnh vực, nhiều-nhiều miễn phí, FE consume gọn.

## 5. Backend (master-data-service)

Đặt module `linh-vuc` song song với `tenant` trong `master-data-service`.

- **Entity** `linh_vuc` như §4.
- **DTO:** `CreateLinhVucDto`, `UpdateLinhVucDto` (validate `code` unique khi tạo, `menuKeys` là mảng string).
- **Service + Controller:** CRUD.
  - `GET /linh-vuc` — danh sách (dùng cho cả admin và FE runtime).
  - `POST /linh-vuc` — tạo (SuperAdmin).
  - `PUT /linh-vuc/:id` — sửa (không cho đổi `code`).
  - `DELETE /linh-vuc/:id` — xóa, **chặn nếu còn tenant nào tham chiếu `code` này trong `Tenant.modules`** (trả lỗi rõ ràng kèm danh sách/đếm tenant).
- **Phân quyền:** ghi (POST/PUT/DELETE) chỉ SuperAdmin. Đọc (`GET`) cho user đã đăng nhập (FE cần để render menu).
- **Seed/migration:** tạo sẵn 2 bản ghi khớp hardcode hiện tại để không vỡ dữ liệu cũ:
  - `KE_TOAN`: name 'Kế toán', icon 'AccountBookOutlined', color '#1B3A6B', `menuKeys` = tất cả menu key **không** thuộc KHO và không thuộc COMMON (tức phần mặc định KE_TOAN hiện nay).
  - `KHO`: name 'Kho', icon 'InboxOutlined', color '#C9A227', `menuKeys` = đúng `KHO_MENU_KEYS` hiện tại.

## 6. Frontend

### 6.1 Tách menu catalog ra file dùng chung

- Tạo `fe/src/config/menuCatalog.ts`: danh sách phẳng tất cả menu key kèm nhãn để màn admin liệt kê: `{ key, label, parentLabel }[]`.
- Nguồn: trích từ phần khai báo menu đang hardcode trong `MainLayout.tsx` (`dieuHanhMenuItems`, `keToAnMenuItems`, `thuVienMenuItems`). `MainLayout` tiếp tục dùng để render; admin dùng để hiển thị cây/danh sách cho SuperAdmin tick.
- Giữ `COMMON_MENU_KEYS` trong code (Trang chủ `/`, Quy trình, Chính sách, Biểu mẫu, Hướng dẫn — luôn hiện bất kể lĩnh vực).

### 6.2 Thay nguồn lĩnh vực: code → API

- Bỏ `MODULES`, `KHO_MENU_KEYS`, `moduleOfMenuKey()` cứng trong `modules.ts`.
- Load danh sách lĩnh vực từ `GET /linh-vuc` (React Query; nạp sau đăng nhập, cache trong session). Cung cấp qua AuthContext hoặc 1 hook dùng chung.
- Giữ kiểu `ModuleCode` ở dạng `string` (không còn union cứng `'KE_TOAN' | 'KHO'`) vì lĩnh vực giờ động.

### 6.3 Lọc menu theo lĩnh vực (MainLayout)

- `filterByModule(items, selectedModule)` đổi logic: **hiện item nếu** `key ∈ selectedModule.menuKeys` **hoặc** `key ∈ COMMON_MENU_KEYS` (prefix-match như hiện tại: `key === k || key.startsWith(k + '/')`).
- Tầng lọc permission (`filterMenuItems`) giữ nguyên, chạy sau tầng lọc lĩnh vực.
- `selectedModule` giờ là object lĩnh vực (có `menuKeys`) lấy từ API, thay vì chỉ là code.

### 6.4 AuthContext

- `availableModules` = giao của `tenant.modules` (code công ty được cấp) với danh sách lĩnh vực từ API (chỉ `isActive`). SuperAdmin = toàn bộ lĩnh vực `isActive`.
- Logic `needsModuleSelection`, nhớ lựa chọn theo tenant trong localStorage: giữ nguyên, chỉ đổi nguồn dữ liệu.
- Tên/icon/màu hiển thị (ModuleSelector, ModuleSwitchModal, section title) lấy từ object lĩnh vực API thay vì `getModuleDef` constant.

### 6.5 Trang admin mới: `cau-hinh/linh-vuc`

- Danh sách lĩnh vực (bảng: tên, code, icon, màu, số menu, trạng thái).
- Form thêm/sửa: tên, mô tả, **icon (chọn từ whitelist AntD)**, màu, thứ tự, isActive, và **cây/danh sách menu để tick `menuKeys`** (nguồn từ `menuCatalog.ts`).
- Highlight các menu key **chưa được gán lĩnh vực nào** để tránh vô tình ẩn trang.
- Xóa: chặn nếu còn tenant tham chiếu (hiển thị lỗi từ BE).

### 6.6 TenantPage

- Dropdown "Lĩnh vực sử dụng" (multiple) lấy options từ `GET /linh-vuc` (`isActive`) thay vì constant `MODULES`.
- Cột "Lĩnh vực" trong bảng tra tên theo danh sách API.

### 6.7 Icon động

- Lưu icon dạng **tên string** trong DB. FE map sang component AntD qua **whitelist** (object `iconName → Component`). Không lưu JSX/React element. Icon ngoài whitelist → fallback icon mặc định.

## 7. Xử lý mép (edge cases)

| Tình huống | Xử lý |
|-----------|-------|
| Menu key mới trong code chưa gán lĩnh vực nào | Mặc định coi như thuộc **lĩnh vực mặc định hệ thống** (`KE_TOAN`) khi render — fallback an toàn để không ẩn trang mới; màn admin **highlight "chưa gán"** để SuperAdmin gán đúng. |
| Xóa lĩnh vực đang được tenant dùng | BE **chặn xóa**, trả lỗi kèm số tenant tham chiếu. |
| Xóa lĩnh vực mặc định hệ thống (`KE_TOAN`) | **Không cho xóa** — đây là lĩnh vực mặc định dùng làm fallback cho menu chưa gán. |
| Lĩnh vực `isActive=false` | Không xuất hiện trong `availableModules`; tenant đang chọn nó → fallback về lĩnh vực khả dụng đầu tiên. |
| Tenant có `modules` chứa code không còn tồn tại | Bỏ qua code đó khi tính `availableModules` (không crash). |
| Đổi `code` lĩnh vực | Không cho phép (immutable) vì `Tenant.modules` tham chiếu theo code. |
| API `/linh-vuc` lỗi/chưa load | FE cache response thành công gần nhất (localStorage) và dùng lại khi refetch lỗi. Nếu chưa từng load được lần nào: chỉ hiện COMMON menu + nút thử lại. |

## 8. Ảnh hưởng & tương thích

- `Tenant.modules` (entity, DTO, auth `buildTenantInfo`, `TenantInfo`) **giữ nguyên** — vẫn là mảng `code`. Không đổi login flow.
- Sau seed, hành vi hiển thị menu **giống hệt** hiện tại (mapping seed = hardcode cũ) → không regression.
- Rủi ro chính: refactor `modules.ts` (đang được import nhiều nơi) từ đồng bộ (constant) sang bất đồng bộ (API). Cần đảm bảo các nơi consume xử lý trạng thái loading.

## 9. Tiêu chí hoàn thành

- SuperAdmin tạo/sửa/xóa lĩnh vực qua UI; gán menu cho lĩnh vực; thay đổi phản ánh ngay trên sidebar (sau reload/refetch).
- Thêm 1 lĩnh vực mới + gán vài menu sẵn có → công ty được cấp lĩnh vực đó thấy đúng menu, không cần deploy code.
- Sau seed, người dùng hiện tại thấy menu **không đổi** so với trước.
- Xóa lĩnh vực đang dùng bị chặn với thông báo rõ ràng.
- BE vẫn không enforce (ngoài phạm vi) — đã ghi nhận là nợ kỹ thuật cho v2.

## 10. Việc tương lai (không làm lần này)

- BE enforce lĩnh vực (guard theo `tenant.modules` + map route BE → lĩnh vực).
- Mapping/menu per-tenant nếu phát sinh nhu cầu.
- Quản lý cây menu động (CMS menu) — chỉ đáng làm khi route/trang cũng động.
