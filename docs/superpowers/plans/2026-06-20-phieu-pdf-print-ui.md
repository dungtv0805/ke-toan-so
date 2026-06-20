# Phiếu PDF/In + Đồng nhất UI + Fix Tổng hợp/Báo cáo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bảng tổng hợp tự refresh; xuất PDF/in phiếu thu-chi có dữ liệu; đồng nhất UI trang phiếu; quản lý mẫu in; fix dòng "Tổng cộng" tràn ở báo cáo.

**Architecture:** FE shadcn (trang phiếu) dùng CHanlder pattern; in bằng iframe + `window.print()` với HTML template. BE config-service thêm module `phieu-template`. Báo cáo dùng Ant Design — fix bằng summary sticky.

**Tech Stack:** React + TS + Vite, shadcn/ui, RxJS CHanlder, vitest; NestJS + MongoDB/TypeORM; Ant Design (báo cáo).

## Global Constraints
- FE test: `cd fe && npx vitest run <path>`; lint `npm run lint`.
- Không thêm dependency nặng cho PDF (dùng `window.print`).
- Khổ giấy mặc định phiếu: A5 dọc.
- Tiền: VND, không số lẻ thập phân.
- BE: tenant auto-filter như các module config khác.

---

## Part A — Fix bảng Tổng hợp tự refresh

### Task A1: refresh reload các tab tổng hợp đã mở
**Files:**
- Modify: `fe/src/pages/chung-tu/phieu/handler/sub-handler/init/init.state.ts` (thêm `summaryLoadedTypes`)
- Modify: `fe/src/pages/chung-tu/phieu/handler/sub-handler/load-summary/load-summary.handler.ts`
- Modify: `fe/src/pages/chung-tu/phieu/handler/sub-handler/init/init.handler.ts` (`refresh`, `initializeDefaultStates`)
- Modify: `fe/src/pages/chung-tu/phieu/components/summary/SummaryTabs.tsx`

**Interfaces:**
- Produces: state key `summaryLoadedTypes: PhieuSummaryType[]`.

- [ ] Thêm `summaryLoadedTypes: PhieuSummaryType[]` vào `InitStates` và default `[]`.
- [ ] `loadSummary`: sau khi nạp, thêm `params.type` vào `summaryLoadedTypes` nếu chưa có.
- [ ] `refresh`: ngoài loadEntries + loadStats, lặp `summaryLoadedTypes` gọi `loadSummary` cho từng type.
- [ ] `SummaryTabs`: bỏ `loadedRef`; dùng `summaryLoadedTypes` từ state để quyết định gọi `loadSummary` khi đổi tab / mount (chỉ gọi nếu chưa có trong list).
- [ ] Verify thủ công: thêm phiếu → tab tổng hợp đang mở cập nhật ngay. Commit.

---

## Part C — Xuất PDF + In phiếu (ưu tiên)

### Task C1: util đọc số tiền bằng chữ (TDD)
**Files:**
- Create: `fe/src/pages/chung-tu/phieu/lib/docTienBangChu.ts`
- Test: `fe/src/pages/chung-tu/phieu/lib/__tests__/docTienBangChu.test.ts`

**Interfaces:**
- Produces: `docTienBangChu(n: number): string` — trả về chuỗi hoa chữ đầu, đuôi " đồng".

- [ ] Viết test: `0`→"Không đồng"; `1000`→"Một nghìn đồng"; `1234567`→"Một triệu hai trăm ba mươi tư nghìn năm trăm sáu mươi bảy đồng"; `1000000000`→"Một tỷ đồng".
- [ ] Chạy test → fail.
- [ ] Implement.
- [ ] Chạy test → pass. Commit.

### Task C2: default templates HTML (Mẫu 01-TT / 02-TT)
**Files:**
- Create: `fe/src/pages/chung-tu/phieu/lib/printTemplates.ts` (export `DEFAULT_PHIEU_THU_HTML`, `DEFAULT_PHIEU_CHI_HTML`, danh sách placeholder)

- [ ] Tạo 2 chuỗi HTML khớp mẫu (tiêu đề PHIẾU THU/CHI, Mẫu số 01-TT/02-TT, các dòng họ tên/địa chỉ/lý do/số tiền/bằng chữ/Nợ/Có/chữ ký), dùng token `{{...}}`.
- [ ] Commit.

### Task C3: print service (TDD cho interpolate)
**Files:**
- Create: `fe/src/pages/chung-tu/phieu/lib/printPhieu.ts`
- Test: `fe/src/pages/chung-tu/phieu/lib/__tests__/printPhieu.test.ts`

**Interfaces:**
- Produces:
  - `buildPhieuHtml(phieu: ChungTu, html: string): string` — thay placeholder bằng dữ liệu.
  - `printPhieu(phieu: ChungTu, html: string): void` — render iframe + print.

- [ ] Test `buildPhieuHtml`: template `"{{soPhieu}} {{soTienBangChu}}"` + phiếu → đúng giá trị (số tiền bằng chữ qua `docTienBangChu`).
- [ ] Test: placeholder thiếu dữ liệu → chuỗi rỗng (không để "{{...}}" sót).
- [ ] Chạy test → fail → implement `buildPhieuHtml` (map tất cả token); `printPhieu` dùng iframe ẩn + `@page size:A5`.
- [ ] Chạy test → pass. Commit.

### Task C4: nút In/Xuất PDF ở bảng + view modal
**Files:**
- Modify: `fe/src/pages/chung-tu/phieu/components/table/PhieuTable.tsx`
- Modify: `fe/src/pages/chung-tu/phieu/components/view-modal/PhieuViewModal.tsx`

- [ ] PhieuTable: thêm nút "In" mỗi dòng gọi `printPhieu(row, activeTemplateHtml)` (template lấy từ state, fallback default theo `config.loai`).
- [ ] PhieuViewModal: thêm nút "In / Xuất PDF" ở footer.
- [ ] Verify thủ công: in ra đúng dữ liệu. Commit.

---

## Part B — Đồng nhất UI

### Task B1: chuẩn hoá style trang phiếu
**Files:**
- Create: `fe/src/pages/chung-tu/phieu/lib/tableStyles.ts` (className dùng chung)
- Modify: `PhieuListPage.tsx`, `components/table/PhieuTable.tsx`, `components/summary/SummaryTabs.tsx`, `components/filter/FilterBar.tsx`, `components/stats/StatsCards.tsx`

- [ ] Định nghĩa hằng className chung: wrapper bảng, header (`h-9`), cell (`py-2`), cỡ chữ.
- [ ] Áp cho PhieuTable + SummaryTabs (cùng độ dày/cao/border).
- [ ] FilterBar: input/select/nút về `h-9` đồng bộ.
- [ ] StatsCards + Tabs: căn padding/spacing/style tab nhất quán.
- [ ] `npm run lint` + verify thị giác. Commit.

---

## Part D — Quản lý / upload mẫu in

### Task D1: BE module phieu-template (config-service)
**Files:**
- Create: `be/libs/entities/src/config/phieu-template.entity.ts` (+ export ở index)
- Create: `be/apps/config-service/src/phieu-template/` (controller, service, module, dto)
- Modify: đăng ký module trong config-service; gateway route; `.claude/context/be-api-map.md`
- Test: `phieu-template.service.spec.ts`

**Interfaces:**
- Produces: `GET/PUT/DELETE /phieu-template/:loai` (loai ∈ PHIEU_THU|PHIEU_CHI).

- [ ] Entity `PhieuTemplate { tenantId, loai, html, updatedAt }`.
- [ ] Service: `findByLoai`, `upsert`, `remove` (tenant-scoped). Test upsert/find.
- [ ] Controller + module + gateway route. Build BE (`yarn build` service liên quan) pass.
- [ ] Cập nhật be-api-map.md. Commit.

### Task D2: FE service + UI quản lý mẫu
**Files:**
- Create: `fe/src/services/phieuTemplateService.ts`
- Create: `fe/src/pages/chung-tu/phieu/components/template-modal/TemplateModal.tsx`
- Modify: FilterBar (nút "Mẫu in"), printPhieu (fetch template trước khi in, fallback default)

- [ ] Service gọi 3 endpoint.
- [ ] Modal: textarea HTML + bảng placeholder + preview (render với phiếu mẫu) + Lưu / Khôi phục mặc định.
- [ ] Nút "Mẫu in" mở modal; print ưu tiên template đã lưu.
- [ ] Verify thủ công. Commit.

---

## Part E — Fix dòng "Tổng cộng" tràn ở báo cáo

### Task E1: summary sticky cho báo cáo tài chính
**Files:**
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`
- Rà: `fe/src/pages/bao-cao/so-cai/SoCaiPage.tsx`, `fe/src/pages/bao-cao/bang-can-doi/BangCanDoiPage.tsx`

- [ ] Dùng `sticky` trên `Table` + `<Table.Summary fixed>` cho dòng tổng; bỏ/giảm magic-number `avail - 96`.
- [ ] Đảm bảo body cuộn, dòng tổng ghim đáy, không bị cắt với nhiều dữ liệu.
- [ ] Rà các trang cùng pattern, sửa nếu cùng lỗi.
- [ ] Verify thủ công nhiều dữ liệu ở 1280×720. Commit.

---

## Self-Review
- Spec coverage: A→A1, B→B1, C→C1-C4, D→D1-D2, E→E1. Đủ.
- Placeholder: code chi tiết viết lúc thực thi từng task (TDD), không để TODO trong code.
- Type: `PhieuSummaryType`, `ChungTu`, `docTienBangChu`, `buildPhieuHtml`/`printPhieu` nhất quán giữa các task.
