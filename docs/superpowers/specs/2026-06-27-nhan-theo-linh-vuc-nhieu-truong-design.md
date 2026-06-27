# Thiết kế: Sửa nhãn (title) theo Lĩnh vực — nhiều trường, mọi trang, đọc live

- Ngày: 2026-06-27
- Trạng thái: Đã duyệt thiết kế (chờ review spec → writing-plans)
- Phạm vi: digital-books (fe/ chủ yếu; BE/DB **không đổi**)
- Tiếp nối: `2026-06-26-da-nganh-nhan-dong-design.md` (spec cha — đã dựng cơ chế + pilot `chuDauTu`)

## 1. Bối cảnh & vấn đề

Spec cha đã dựng hạ tầng nhãn động và pilot **đúng 1 term `chuDauTu`** (2 cột Mã CĐT/CĐT
ở trang Nhật ký chung). Người dùng phản hồi:

1. **Chỉ mỗi trường Chủ đầu tư sửa được** — cần áp cho **nhiều trường, mọi trang** ("làm
   common cho tất cả các trang").
2. Lẫn lộn thuật ngữ: trong code **`LinhVuc`** = phân hệ (menu), **`Nganh`** = nhóm ngành
   nghề (glossary/title). Người dùng hình dung **"Lĩnh vực" = loại hình doanh nghiệp** quyết
   định title. → Thống nhất: **UI gọi "Lĩnh vực", dữ liệu vẫn là `Nganh`** (không đổi schema).
3. Muốn: sửa title ở từng trang → **lưu vào config Lĩnh vực** → **mọi công ty cùng lĩnh vực
   ăn theo NGAY LẬP TỨC**.

### Khoảng trống kỹ thuật của hiện trạng

- `TERM_REGISTRY` chỉ có 1 term `chuDauTu` (`fe/src/config/termRegistry.ts`).
- `resolveTerm(glossary, registry, key, surface)` chỉ đọc **`tenant.glossary`** → registry.
  **Không** đọc `nganh.glossary` → công ty không "ăn theo lĩnh vực live".
- `tenant.glossary` là **bản copy đông cứng** lúc tạo công ty ⇒ sửa lĩnh vực, công ty cũ
  không thấy.
- `EditableTerm` (`fe/src/components/glossary/EditableTerm.tsx`) chỉ lưu vào **tenant** qua
  `tenantService.updateGlossary` — chưa có lựa chọn "Cả lĩnh vực".

## 2. Quyết định đã chốt (qua brainstorming)

1. **Một công ty thuộc đúng 1 Lĩnh vực** (= `tenant.nganh`); lĩnh vực quyết định title.
2. **Không đổi schema DB**, không đổi field. Tái dùng `nganh.glossary` (đã có) làm "config
   title của lĩnh vực". Menu (`LinhVuc.menuKeys` + `tenant.modules`) **giữ nguyên, ngoài
   phạm vi đợt này**.
3. Đọc nhãn lĩnh vực **LIVE** qua API `GET /nganh` (đã có) — không cần đổi BE.
4. Lưu vào lĩnh vực → `PUT /nganh/:id` (đã có, **SuperAdminGuard giữ nguyên**). ⇒ **chỉ
   SuperAdmin** mới thấy lựa chọn "Cả lĩnh vực". Admin công ty chỉ sửa cho riêng công ty.
5. "Gộp Nganh & LinhVuc làm 1" → **chỉ hợp nhất ở mức trình bày + tập trung TITLE**; KHÔNG
   gộp dữ liệu, KHÔNG đụng menu trong đợt này.

## 3. Mô hình nhãn (chuỗi resolve mới)

Thêm tầng **lĩnh vực (nganh) đọc live** vào giữa tenant và registry:

```
1. tenant.glossary[key].surfaces[surface]   (override riêng cột của công ty)
2. tenant.glossary[key].label               (override chung của công ty)
3. nganh.glossary[key].surfaces[surface]    (config lĩnh vực — LIVE)   ← MỚI
4. nganh.glossary[key].label                (config lĩnh vực — LIVE)   ← MỚI
5. TERM_REGISTRY[key].surfaces[surface]     (default hệ thống)
6. TERM_REGISTRY[key].label
7. key                                       (fallback cuối)
```

**Vì sao "live inherit" chạy:** với các term MỚI thêm vào `nganh.glossary` từ nay, công ty
**không có** key đó trong `tenant.glossary` (không re-clone) → rơi xuống tầng 3/4 = đọc thẳng
lĩnh vực live. SuperAdmin sửa lĩnh vực → mọi công ty cùng lĩnh vực thấy ngay.

**Lưu ý dữ liệu cũ (không phải schema):** term `chuDauTu` có thể đã bị clone vào
`tenant.glossary` của công ty cũ ⇒ với riêng key này, công ty thấy bản clone (tầng 1/2) thay
vì live. Đây là khác biệt nhỏ, chấp nhận được. **Tùy chọn dọn dẹp** (data-only, không schema):
xóa các key trùng-default khỏi `tenant.glossary` để chúng rơi về live — để **ngoài phạm vi**,
ghi nhận ở Mục 7.

→ Hệ quả thiết kế: **ngừng clone `nganh.glossary` → `tenant.glossary` khi tạo công ty** (nếu
còn). Đây là sửa logic, **không** đổi schema. Cần kiểm tra `tenant.service` xem còn clone không;
nếu còn thì bỏ bước clone để term mới luôn live. (Xác nhận khi viết plan.)

## 4. Thiết kế Frontend

### 4.1 Nạp glossary lĩnh vực live — `AuthContext`
- `AuthContext` đã nạp `allModules` (LinhVuc). Bổ sung nạp **danh sách Nganh** qua
  `nganhService.getAll()` (đã có) → expose `currentNganh = nganhList.find(n => n.code ===
  currentTenant?.nganh)`.
- Refetch/cập nhật `currentNganh` sau khi lưu glossary lĩnh vực (để áp tức thì cho người sửa).

### 4.2 `resolveTerm` + `TermContext`
- `resolveTerm(...)` thêm tham số `nganhGlossary?: Glossary`, chèn tầng 3/4 (Mục 3).
  File: `fe/src/config/termRegistry.ts`.
- `TermContext` truyền cả `currentTenant?.glossary` và `currentNganh?.glossary` vào
  `resolveTerm`. File: `fe/src/contexts/TermContext.tsx`.

### 4.3 `EditableTerm` — thêm phạm vi "Cả lĩnh vực"
File: `fe/src/components/glossary/EditableTerm.tsx`, `fe/src/config/glossaryEdit.ts`.

- Mở rộng `EditScope` → `'all' | 'surface' | 'nganh'` (hoặc tách "đích lưu" = tenant|nganh
  riêng với scope all|surface; chốt cách mô hình hoá khi viết plan — giữ `applyGlossaryEdit`
  tái dùng được cho cả 2 glossary).
- Radio trong popover (chỉ hiện **"Cả lĩnh vực [tên]"** khi `user.isSuperAdmin === true`):
  - **"Cả lĩnh vực [Xây dựng]"** (mặc định cho SuperAdmin) → `applyGlossaryEdit` trên
    `currentNganh.glossary` → `nganhService.update(currentNganh.id, { glossary })` → cập nhật
    `currentNganh` trong context.
  - **"Chỉ công ty này"** → đường cũ: `applyGlossaryEdit` trên `tenant.glossary` →
    `tenantService.updateGlossary` → `applyGlossary(res.glossary)`.
  - **"Chỉ ở cột này"** (`surface`) → áp cho đích đang chọn (tenant hoặc nganh).
- `applyGlossaryEdit` đã thuần (nhận glossary bất kỳ, deep-copy) → tái dùng cho `nganh.glossary`.

### 4.4 Mở rộng nhiều trường — `TERM_REGISTRY` + rollout
- Khai báo thêm term trong `TERM_REGISTRY` (mỗi term: `label`, `surfaces` mặc định theo cột/
  trang). Đây là "danh bạ khái niệm đổi-tên-được".
- **Helper cột bảng** `termCol({ tk, surface, ...col })` → tự đặt `title: <EditableTerm tk
  surface/>` để giảm boilerplate khi nhân ra nhiều cột/nhiều trang. (Giữ `<EditableTerm>` làm
  component hiển thị-nhãn-tổng-quát cho cả label form/section.)
- **Rollout theo trang** (cơ học, lặp theo mẫu): chuyển chữ cứng → `EditableTerm`/`termCol`,
  đăng ký term vào `TERM_REGISTRY`.

### 4.5 Trang ưu tiên rollout đợt đầu (đề xuất)
1. Nhật ký chung — `pages/chung-tu/nhat-ky-chung/.../EntryListTab.tsx` (mở từ 2 cột → các cột
   đổi-tên-được còn lại).
2. Các trang chứng từ chính kế tiếp (phiếu thu/chi, …) — chọn cụ thể khi viết plan.

Các trang còn lại: cùng mẫu, làm dần — không đổi kiến trúc.

## 5. Backend / DB
**Không thay đổi.** Tái dùng:
- `GET /master-data/nganh` (đọc live glossary lĩnh vực).
- `PUT /master-data/nganh/:id` (lưu glossary lĩnh vực) — `SuperAdminGuard` giữ nguyên.
- `Nganh.glossary`, `Tenant.glossary`, `Tenant.nganh` — giữ nguyên.

(Cần xác nhận khi viết plan: có bước clone `nganh→tenant.glossary` lúc tạo/đổi ngành trong
`tenant.service` không; nếu có thì **bỏ** để term mới luôn live — sửa logic, không schema.)

## 6. Phạm vi ngoài (đợt này không làm)
- Gộp menu/phân hệ (`LinhVuc`) vào lĩnh vực; đổi cách menu hoạt động.
- Đổi schema/field DB; nới guard BE.
- Admin công ty lưu vào lĩnh vực (chỉ SuperAdmin).
- Dọn dữ liệu clone cũ trong `tenant.glossary`.

## 7. Rủi ro / lưu ý
- **Stale clone:** key đã clone vào `tenant.glossary` (vd `chuDauTu`) sẽ che tầng live của
  lĩnh vực với riêng công ty đó. Chấp nhận; dọn sau nếu cần (data-only).
- **Phình rollout:** nhiều điểm hardcode rải rác — bám mẫu `termCol`/`EditableTerm` + đăng ký
  `TERM_REGISTRY`, làm theo trang để kiểm soát.
- **Tải Nganh ở FE:** thêm 1 lần gọi `GET /nganh` lúc vào app (nhỏ); cân nhắc cache như
  `allModules`.
- **Quyền:** ẩn lựa chọn "Cả lĩnh vực" với non-SuperAdmin để tránh gọi `PUT /nganh` bị 403.
