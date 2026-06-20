# Phiếu thu/chi: Đồng nhất UI + Xuất PDF/In + Quản lý mẫu in + Fix báo cáo

**Ngày:** 2026-06-20
**Nhánh:** `feat/phieu-pdf-print-ui`

## Bối cảnh

Trang Phiếu thu / Phiếu chi (`fe/src/pages/chung-tu/phieu/`) dùng chung 1 bộ code
(`PhieuListPage` + `phieuConfig`), backend là voucher-service (collection `chung_tu`).
Có một số vấn đề và yêu cầu mới:

1. **Bug:** Sau khi thêm/sửa/xoá/import phiếu, bảng **Tổng hợp** không tự cập nhật
   (phải F5). Nguyên nhân: `refresh` chỉ reload danh sách + stats, không reload summary;
   và `SummaryTabs` cache mỗi tab bằng `loadedRef` nên không nạp lại.
2. **UI chưa đồng nhất:** Bảng Danh sách vs Tổng hợp, FilterBar/input/nút, Tabs, StatsCards
   chưa thống nhất về độ dày/độ cao/khoảng cách.
3. **Thiếu xuất PDF / in phiếu** theo mẫu 01-TT (thu) / 02-TT (chi).
4. **Cần quản lý mẫu in** (upload template để thay đổi theo từng giai đoạn).
5. **Bug báo cáo:** Dòng "Tổng cộng" bị tràn/khuất ở góc dưới khi nhiều dữ liệu
   (do tính chiều cao bằng magic-number thay vì summary sticky).

## Phạm vi & thứ tự ưu tiên

A → C → B → D → E (ưu tiên có kết quả dùng được sớm nhất; C = xuất PDF có dữ liệu là ưu tiên #1).

---

## Part A — Fix bảng Tổng hợp không refresh

**Mục tiêu:** Thêm/sửa/xoá/import phiếu → thẻ thống kê, danh sách, và bảng tổng hợp
(các tab đã mở) đều cập nhật ngay, không cần F5.

**Thiết kế:**
- Đưa danh sách "tab tổng hợp đã từng mở" lên handler state: `summaryLoadedTypes: PhieuSummaryType[]`.
- `loadSummary` thêm `type` vào `summaryLoadedTypes` khi nạp.
- `refresh` (init.handler) reload song song: danh sách + `loadStats` + `loadSummary` cho **mọi type trong `summaryLoadedTypes`**.
- `SummaryTabs`: bỏ `loadedRef` cục bộ; quyết định lazy-load tab dựa trên `summaryLoadedTypes`
  trong state. Tab chưa mở vẫn không nạp (giữ hiệu năng); tab đã mở được refresh đồng bộ.

**File ảnh hưởng:**
`handler/sub-handler/init/init.handler.ts`, `init.state.ts`,
`handler/sub-handler/load-summary/load-summary.handler.ts`,
`components/summary/SummaryTabs.tsx`.

---

## Part C — Xuất PDF + In phiếu (ưu tiên #1)

**Mục tiêu:** Từ mỗi phiếu, bấm "In / Xuất PDF" → ra phiếu thu/chi đúng mẫu, có dữ liệu thật;
trình duyệt cho In trực tiếp hoặc Lưu thành PDF. Không thêm thư viện nặng.

**Thiết kế:**
- **Print service** (`lib/printPhieu.ts`): nhận `ChungTu` + chuỗi HTML template →
  thay placeholder → mở `iframe` ẩn (hoặc cửa sổ in), nạp HTML + CSS in
  (`@page { size: A5 portrait; margin: ... }`) → gọi `print()`.
- **Template mặc định dựng sẵn** dưới dạng hằng HTML khớp Mẫu 01-TT (thu) / 02-TT (chi):
  `lib/defaultTemplates/phieuThu.html.ts`, `phieuChi.html.ts`. Dùng ngay cả khi chưa upload
  template → thoả "xuất PDF có dữ liệu" trước.
- **Số tiền bằng chữ:** util `lib/docTienBangChu.ts` (đọc số tiếng Việt, đuôi "đồng").
- **Khổ giấy mặc định:** A5 dọc (mẫu phiếu thu/chi chuẩn). Có thể chỉnh trong template.
- **Nút "In / Xuất PDF":** thêm vào hàng thao tác trong `PhieuTable` và trong `PhieuViewModal`.

**Placeholder hỗ trợ:**
`{{soPhieu}} {{ngay}} {{thang}} {{nam}} {{nguoiGiaoDich}} {{diaChi}} {{noiDung}}`
`{{soTien}} {{soTienBangChu}} {{taiKhoanNo}} {{taiKhoanCo}} {{ghiChu}}`
`{{tenCongTy}} {{diaChiCongTy}}`

Mapping dữ liệu (ChungTu → placeholder):
- `nguoiGiaoDich` → Họ tên người nộp/nhận tiền
- `diaChi` → Địa chỉ
- `noiDung` → Lý do nộp/chi
- `soTien` → Số tiền (số), `docTienBangChu(soTien)` → Số tiền bằng chữ
- `danhMuc.taiKhoanNo.ma` / `danhMuc.taiKhoanCo.ma` → Nợ / Có
- `ngay` → tách ngày/tháng/năm
- `ghiChu` → Kèm theo
- Tên/địa chỉ công ty: từ config (Part D) hoặc hằng tạm thời.

**File ảnh hưởng/mới:**
`lib/printPhieu.ts`, `lib/docTienBangChu.ts`, `lib/defaultTemplates/*`,
`components/table/PhieuTable.tsx`, `components/view-modal/PhieuViewModal.tsx`.

---

## Part B — Đồng nhất giao diện (chuẩn theo bảng Tổng hợp)

**Mục tiêu:** Thống nhất toàn bộ trang phiếu về một hệ style (4 chỗ người dùng nêu).

**Thiết kế:**
- **Bảng:** một chuẩn chung — wrapper `rounded-md border`, header cùng nền & chiều cao
  (`h-9`), padding cell thống nhất (`py-2`), cùng cỡ chữ. Áp cho cả `PhieuTable` và
  `SummaryTabs` (có thể tách 1 helper className dùng chung).
- **Tabs:** thống nhất style 2 lớp tabs (ngoài: Danh sách/Tổng hợp; trong: tab con của tổng hợp)
  — cùng kích thước, khoảng cách, trạng thái active.
- **FilterBar:** chuẩn hoá chiều cao input/select/nút về `h-9`, đồng bộ khoảng cách & icon.
- **StatsCards:** căn lại padding/spacing cho liền mạch với phần còn lại.

**Nguyên tắc:** chỉ chỉnh style/độ dày/khoảng cách, không đổi logic. Không refactor ngoài phạm vi.

**File ảnh hưởng:**
`PhieuListPage.tsx`, `components/table/PhieuTable.tsx`, `components/summary/SummaryTabs.tsx`,
`components/filter/FilterBar.tsx`, `components/stats/StatsCards.tsx`.

---

## Part D — Quản lý / upload mẫu in

**Mục tiêu:** Admin có thể xem/sửa/upload template HTML cho từng loại phiếu, đổi theo giai đoạn;
print service ưu tiên template đã upload, không có thì dùng default.

**Backend (config-service):**
- Module mới `phieu-template`, collection `phieu_template`.
- Entity: `{ tenantId, loai: 'PHIEU_THU'|'PHIEU_CHI', html: string, updatedAt }` (1 bản/tenant/loai).
- Endpoints (qua gateway prefix `/config`):
  - `GET /phieu-template/:loai` → template active (404/empty → FE dùng default).
  - `PUT /phieu-template/:loai` → upsert (upload/sửa).
  - `DELETE /phieu-template/:loai` → xoá (về default).
- Auto-filter theo tenant như các module config khác.

**Frontend:**
- Service `phieuTemplateService` gọi 3 endpoint trên.
- Print service: trước khi in, fetch template theo `loai`; rỗng → dùng default dựng sẵn.
- UI quản lý mẫu (modal hoặc trang con): textarea HTML + bảng tham chiếu placeholder +
  **xem trước (preview)** render với dữ liệu mẫu + nút Lưu / Khôi phục mặc định.
  Vào từ trang phiếu (nút "Mẫu in").

**File ảnh hưởng/mới:**
BE: `apps/config-service/src/phieu-template/*`, `libs/entities/.../phieu-template.entity.ts`,
đăng ký module + gateway route, cập nhật `be-api-map.md`.
FE: `services/phieuTemplateService.ts`, component quản lý mẫu, cập nhật `lib/printPhieu.ts`.

---

## Part E — Fix dòng "Tổng cộng" bị tràn ở báo cáo

**Mục tiêu:** Dòng tổng luôn nhìn thấy (ghim đáy) kể cả khi nhiều dữ liệu.

**Nguyên nhân:** Các trang báo cáo (Ant Design) tính chiều cao vùng cuộn bằng magic-number
(`BaoCaoTaiChinhPage.tsx:147` — `avail - 96`) và summary không sticky, nên dòng "Tổng cộng"
bị đẩy khuất dưới đáy.

**Thiết kế:**
- Dùng Ant Design summary sticky: `<Table.Summary fixed>` + `sticky` trên `Table`, để dòng tổng
  ghim đáy vùng cuộn body.
- Thay layout chiều-cao-magic-number bằng flex container (table body tự cuộn, dòng tổng cố định).
- Áp cho trang bị lỗi chính (`BaoCaoTaiChinhPage` — tab Trial Balance / Tổng hợp theo TK) và
  rà các trang cùng mẫu (`SoCaiPage`, `BangCanDoiPage`, ...), sửa nếu cùng triệu chứng.

**File ảnh hưởng:**
`bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx` (chính), rà thêm `bao-cao/so-cai/SoCaiPage.tsx`,
`bao-cao/bang-can-doi/BangCanDoiPage.tsx`.

---

## Kiểm thử

- **A:** Unit/integration FE — sau `submitPhieu`/`deletePhieu`, summary của tab đã mở được gọi lại.
- **C:** Test `docTienBangChu` (các mốc số: 0, lẻ, hàng nghìn/triệu/tỷ). Kiểm thử thủ công in/PDF.
- **B:** Kiểm thử thị giác (so với bảng Tổng hợp) — không có test tự động cho thẩm mỹ.
- **D:** BE unit test cho CRUD template; FE preview render đúng placeholder.
- **E:** Kiểm thử thủ công với bộ dữ liệu lớn ở nhiều độ phân giải (1280×720, 1920×1080).

## Ngoài phạm vi (YAGNI)

- Không chuyển báo cáo từ Ant Design sang shadcn (chỉ fix bug tổng).
- Không hỗ trợ upload .doc/.docx và convert (chỉ template HTML, khớp lựa chọn HTML+print).
- Không ghi phiếu sang nhật-ký-chung / sổ quỹ (ngoài phạm vi yêu cầu này).
