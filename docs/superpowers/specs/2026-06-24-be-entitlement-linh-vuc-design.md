# BE Entitlement Lĩnh Vực (v2) — Chặn truy cập API theo lĩnh vực

**Ngày:** 2026-06-24
**Trạng thái:** Design — chờ review
**Liên quan (v1):**
- `2026-06-23-module-linh-vuc-cong-ty-design.md` — `tenant.modules` (entitlement)
- `2026-06-23-linh-vuc-menu-config-dong-design.md` — catalog lĩnh vực động + `menuKeys`
- `2026-06-23-gioi-thieu-linh-vuc-chua-cap-design.md` — FE hiển thị lĩnh vực chưa cấp

---

## 1. Bối cảnh & vấn đề

v1 đã làm phân lĩnh vực **chỉ ở tầng FE**:

- `Tenant.modules: string[]` — lĩnh vực công ty được cấp, vd `['KE_TOAN','KHO']` (`tenant.entity.ts:32`).
- `LinhVuc.menuKeys: string[]` — mỗi lĩnh vực gắn danh sách **route path của FE** (`linh-vuc.entity.ts:31`). Quan hệ **many-to-many**: 1 menuKey có thể thuộc nhiều lĩnh vực.
- FE `AuthContext` nạp `tenant.modules` + catalog lĩnh vực → chỉ render menu/trang thuộc lĩnh vực được cấp; cái khác disable.

→ Đây hoàn toàn là **gate UX**. JWT payload chỉ có `tenantId, vaiTro, permissions` — **không** có `modules` (`decoded-token.interface.ts`). Không guard nào kiểm tra entitlement lĩnh vực.

**Lỗ hổng:** user của tenant chỉ mua `KE_TOAN` vẫn có thể gọi thẳng API của `KHO` (vd `POST /kho/phieu`) bằng curl/Postman với JWT hợp lệ → BE vẫn phục vụ.

**Mục tiêu v2:** chặn ở BE, nhưng **không phá tính config-động** của v1 — thêm/đổi lĩnh vực và gán menu vẫn phải là thao tác config (0 dòng code BE).

---

## 2. Ràng buộc thiết kế (rút ra từ codebase)

1. **menuKey ≠ API path.** menuKey là route điều hướng FE; API nằm ở ngôn ngữ service:

   | menuKey (FE route) | API path thật |
   |--------------------|---------------|
   | `/danh-muc/hang-hoa-vat-tu` | `/master-data/hang-hoa-vat-tu` |
   | `/danh-muc/kho` | `/master-data/kho` |
   | `/kho/nhap-kho` | `/kho/phieu` |

   → Không thể prefix-match API path trực tiếp với `menuKeys`.

2. **`MENU_CATALOG` hiện chỉ ở FE** (`fe/src/config/menuCatalog.ts`), BE không biết. Không có collection menu nào trong DB.

3. **Decorator `@RequireModule('KHO')` không khả thi** vì many-to-many: khi gán lại menu sang lĩnh vực mới qua UI, decorator gắn cứng sẽ chặn nhầm → buộc sửa code mỗi lần đổi config. Loại bỏ.

4. **Gateway hiện không có DB access** (`gateway.module.ts` chỉ import `CoreModule`, `TenantModule` — proxy thuần qua `http.request`). Gateway route theo path bằng `getServiceForPath()` và **strip prefix service** khi forward (vd `/master-data/x` → service nhận `/x`).

5. **Mỗi trang FE map tới 1 API base prefix** cố định (khai báo ở `super({ endpoint: '...' })` trong `fe/src/services/*`). Đây là quan hệ "tính năng → API", chỉ đổi khi dựng trang mới.

---

## 3. Kiến trúc — 3 tầng tách bạch

```
API path
  │  [Tầng FEATURE: map api→menuKey]   ← đổi khi BUILD trang/endpoint mới
  ▼
menuKey
  │  [Tầng CONFIG: LinhVuc.menuKeys]   ← đổi qua UI SuperAdmin (DB, live)
  ▼
lĩnh vực (code)
  │  [Tầng ENTITLEMENT: tenant.modules] ← cấp/thu cho công ty (DB, live)
  ▼
ALLOW / 403
```

**Nguyên tắc quyết định:** tầng FEATURE keyed theo *tính năng*, **không** theo lĩnh vực. Vì vậy thêm/đổi/gán lĩnh vực **không bao giờ** chạm tầng này → 0 code. Chỉ khi có tính năng mới thật sự (trang + API mới) mới thêm 1 record vào tầng FEATURE — mà lúc đó vốn đã phải viết code endpoint.

### Bảng "đụng code hay không"

| Thao tác | Cần sửa code BE? |
|----------|------------------|
| Tạo lĩnh vực mới, gán menu có sẵn | ❌ |
| Gán lại menu sang lĩnh vực khác (many-to-many) | ❌ |
| Đổi tên / bật-tắt / đổi tập menu của lĩnh vực | ❌ |
| Cấp/thu lĩnh vực cho công ty (`tenant.modules`) | ❌ |
| Dựng trang + endpoint **hoàn toàn mới** | ⚠️ Viết endpoint (bất khả tránh) + thêm 1 record `menu_catalog` (DATA) |

---

## 4. Thành phần

### 4.1. Collection mới: `menu_catalog` (tầng FEATURE)

Entity `MenuCatalog` (`@app/entities`):

```ts
@Entity('menu_catalog')
export class MenuCatalog extends BaseEntity {
  @Column({ unique: true })
  menuKey: string;          // = key route FE, vd '/danh-muc/hang-hoa-vat-tu'

  @Column()
  label: string;            // 'Hàng hóa vật tư' (đồng bộ MENU_CATALOG FE)

  @Column({ nullable: true })
  parentLabel: string;

  // API path-prefix mà menu này gọi tới (sau gateway, gồm prefix service).
  // Rỗng = menu chưa có API (ComingSoon) → không enforce.
  @Column({ type: 'json', default: [] })
  apiPrefixes: string[];    // vd ['/master-data/hang-hoa-vat-tu']
}
```

- **Seed** từ `fe/src/config/menuCatalog.ts` + map `super({ endpoint })` của từng FE service. Seed script `menu-catalog.seed.ts` trong master-data-service.
- Tầng này thay thế dần `MENU_CATALOG` của FE (FE có thể nạp từ API sau — **ngoài phạm vi v2**).

### 4.2. `ModuleGuard` tập trung tại Gateway

Đặt enforcement ở **gateway** vì gateway là choke point duy nhất thấy **full path** (`/master-data/...` chưa bị strip).

Bổ sung cho gateway (mục 4.3): quyền đọc DB read-only.

Luồng `canActivate` (chạy sau xác thực JWT, trước khi forward):

1. Lấy `user` từ JWT (đã decode ở passport guard gateway). Chưa auth → để guard auth xử lý (skip).
2. **SuperAdmin** (`user.email === SUPER_ADMIN_EMAIL`) → bypass.
3. Lấy `fullPath` của request (giống `GatewayController.forward`).
4. Tra `menu_catalog` (cache): tìm các record có `apiPrefixes` nào là prefix của `fullPath`.
   - **Không match record nào** → path dùng chung (vd `/auth`, `/config`, danh mục chung) → **ALLOW**.
   - Match → thu tập `menuKeys` liên quan.
5. Tra `linh_vuc` (cache): tìm tất cả `LinhVuc.code` có `menuKeys` giao với tập ở bước 4 → `owningCodes`.
   - `owningCodes` rỗng (menu chưa gán lĩnh vực nào) → mặc định `KE_TOAN` (ai cũng có) → **ALLOW**. Khớp hành vi FE (menu chưa gán hiển thị ở KE_TOAN).
6. Lấy `tenant.modules` của `user.tenantId` từ DB (**live**, không cache theo tenant — ưu tiên đúng/tươi cho lớp bảo mật).
7. `tenant.modules ∩ owningCodes ≠ ∅` → **ALLOW**; rỗng → **403** `"Lĩnh vực chưa được kích hoạt cho công ty"`.

**Cache:** `menu_catalog` và `linh_vuc` là config ít đổi → cache in-memory TTL ngắn (vd 60s) hoặc invalidate khi SuperAdmin sửa. `tenant.modules` đọc DB mỗi request (1 query nhẹ theo `_id`).

### 4.3. Gateway lấy DB access

Gateway hiện không có DB. Bổ sung tối thiểu:
- Import `DatabaseModule` (TypeOrm) vào `GatewayModule`.
- Inject `DataSource`, dùng repository `Tenant`, `LinhVuc`, `MenuCatalog` (read-only).
- Không thêm controller/CRUD — chỉ phục vụ guard.

**Cân nhắc đã loại:** đặt guard global trong mỗi service. Loại vì (a) gateway đã strip prefix → service mất `/master-data` nên không match `apiPrefixes` được; (b) lặp data-loading + cache ở nhiều service. Gateway thắng nhờ full path + 1 choke point.

---

## 5. Mapping KHO hiện tại (seed `menu_catalog`)

Suy từ `KHO_MENU_KEYS` (`linh-vuc.seed.ts`) + endpoint FE service:

| menuKey | apiPrefixes | Enforce ngay? |
|---------|-------------|---------------|
| `/kho` (và `/kho/nhap-kho`, `/kho/xuat-kho`, `/kho/chuyen-kho`) | `/kho/phieu` | ✅ kho-service |
| `/danh-muc/kho` | `/master-data/kho` | ✅ |
| `/danh-muc/hang-hoa-vat-tu` | `/master-data/hang-hoa-vat-tu` | ✅ |
| `/danh-muc/don-vi-tinh` | `/master-data/don-vi-tinh` | ✅ |
| `/danh-muc/nhom-vat-tu` | `/master-data/nhom-vat-tu` | ✅ |
| `/chung-tu/phieu-nhap` | (ComingSoon — chưa có API) | ⛔ `apiPrefixes: []` |
| `/chung-tu/phieu-xuat` | (ComingSoon — chưa có API) | ⛔ `apiPrefixes: []` |
| `/phan-tich/ton-kho`, `/trung-tam-du-lieu/hang-hoa`, `/trung-tam-du-lieu/nguyen-lieu` | (ComingSoon) | ⛔ `apiPrefixes: []` |

> Lưu ý: `don-vi-tinh`, `nhom-vat-tu`, `hang-hoa-vat-tu`, catalog `kho` hiện thuộc **chỉ** lĩnh vực KHO theo config FE → tenant chỉ có `KE_TOAN` sẽ bị `403` khi gọi các API này. Đây là hành vi đúng theo config hiện tại; nếu sau này muốn dùng chung thì gán thêm menuKey vào lĩnh vực `KE_TOAN` qua UI (0 code).

---

## 6. Edge cases

| Tình huống | Xử lý |
|-----------|-------|
| SuperAdmin | Bypass hoàn toàn |
| Chưa đăng nhập / không tenantId | Skip ModuleGuard, để guard auth xử lý |
| Path không có trong `menu_catalog` | ALLOW (dùng chung) |
| menuKey chưa gán lĩnh vực nào | Mặc định KE_TOAN → ALLOW |
| `apiPrefixes` rỗng (ComingSoon) | Không match → ALLOW (chưa có gì để chặn) |
| Tenant `modules` rỗng/null | Fallback `['KE_TOAN']` (đồng bộ default entity) |
| Nhiều menuKey cùng prefix (lồng nhau) | Lấy match dài nhất hoặc gộp tất cả owningCodes (gộp an toàn hơn — chỉ cần giao 1 lĩnh vực là ALLOW) |

---

## 7. Test

- **Unit `ModuleGuard`** (khuôn `permission.guard.spec.ts`):
  - không match menu_catalog → ALLOW
  - match, tenant có lĩnh vực → ALLOW
  - match, tenant không có lĩnh vực → 403
  - SuperAdmin → ALLOW bất kể
  - menuKey chưa gán lĩnh vực → ALLOW
  - tenant.modules null → fallback KE_TOAN
- **Integration:** gọi `/kho/phieu` với tenant chỉ `KE_TOAN` → 403; với tenant có `KHO` → 200.
- **Seed test:** `menu_catalog` seed đủ các KHO menuKey với apiPrefixes đúng.

---

## 8. Phạm vi & không làm

**Trong phạm vi v2:**
- Entity + seed `menu_catalog`.
- `ModuleGuard` ở gateway + DB access cho gateway + cache config.
- Áp guard cho mọi request đi qua gateway.

**Ngoài phạm vi:**
- FE nạp `MENU_CATALOG` từ API (vẫn giữ constant FE; chỉ đảm bảo BE seed khớp).
- UI quản lý `menu_catalog` cho SuperAdmin (build trang mới vẫn seed/insert tay).
- Thêm `modules` vào JWT (đã loại — ưu tiên đọc DB live).

---

## 9. Rủi ro

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Gateway thêm DB → tăng coupling/độ trễ | Read-only + cache config; chỉ 1 query tenant/req |
| `menu_catalog` lệch với endpoint thật khi refactor path | Seed test + checklist khi đổi `super({ endpoint })` |
| Cache config stale sau khi SuperAdmin sửa | TTL ngắn (60s) hoặc invalidate on write |
| Chặn nhầm danh mục dùng chung (vd don-vi-tinh) | Mapping bám đúng config FE hiện tại; điều chỉnh bằng cách gán menuKey qua UI, không sửa code |
