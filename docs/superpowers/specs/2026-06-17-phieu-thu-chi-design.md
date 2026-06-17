# Spec: Phiếu thu & Phiếu chi (chuẩn CHanlder + shadcn)

- **Ngày:** 2026-06-17
- **Nhánh:** `feat/phieu-thu-chi`
- **Trạng thái:** Đã duyệt thiết kế, chờ viết plan

## 1. Mục tiêu

Viết lại 2 trang **Phiếu thu** (`/chung-tu/phieu-thu`) và **Phiếu chi**
(`/chung-tu/phieu-chi`) theo kiến trúc hiện đại của dự án (CHanlder pattern +
shadcn/ui), thay thế hoàn toàn bản Ant Design cũ. Phạm vi đầy đủ: CRUD + Import
Excel + Thống kê/Summary. **Không** làm workflow duyệt (không có trạng thái).

## 2. Bối cảnh hiện trạng

- Hai trang đã tồn tại và đang được route trong `App.tsx`, nhưng dùng kiến trúc
  cũ: `PhieuThuPage.tsx` / `PhieuChiPage.tsx` là file monolith Ant Design
  (~75KB), import `@/mock-data/chung-tu`, gọi `phieuThuService` / `phieuChiService`.
- Khác hẳn chuẩn hiện tại: `nhat-ky-chung` dùng CHanlder + shadcn, tách module
  (list / form / import / summary), có test đầy đủ → dùng làm tham chiếu.
- `active-pages.md` đang ghi sai trạng thái 2 trang này là COMING SOON.

### Mô hình dữ liệu (đã xác nhận)

- Entity `ChungTu` (`be/libs/entities/src/voucher/chung-tu.entity.ts`):
  `soPhieu`, `loai` (`'PHIEU_THU' | 'PHIEU_CHI'`), `ngay`, `soTien`, `noiDung`,
  `nguoiGiaoDich?`, `diaChi?`, `ghiChu?`, `nguoiTaoId`, `danhMuc` (JSON embedded:
  doiTuong, taiKhoanNo, taiKhoanCo, duAn, boPhan, sanPham, dongTien, …).
- **Không có** field `trangThai` → khớp quyết định "không workflow".
- `chung_tu` là collection dùng chung: `nhat-ky-chung` là view tổng hợp toàn bộ
  phiếu (cả 2 loại); phiếu thu = lọc `loai=PHIEU_THU`, phiếu chi = `loai=PHIEU_CHI`.
- **1 bản ghi = 1 phiếu** (form đơn), khác với form đa dòng của nhat-ky-chung.

### Lưu ý kỹ thuật quan trọng

- Trong nhat-ky-chung, query param `loai` map sang `danhMuc.loaiGiaoDich.ma`
  (loại giao dịch), **không phải** `loai` cấp entity. Vì vậy các endpoint
  stats/summary của nhat-ky-chung **không** lọc theo loại phiếu — phải thêm
  endpoint/filter riêng lọc theo `loai` cấp entity cho phiếu thu/chi.

## 3. Chiến lược kiến trúc (Approach A — đã chốt)

Một **module `phieu` dùng chung**, tham số hoá theo `loai`. Hai page wrapper mỏng
truyền `loai` + nhãn vào module. Tránh nhân đôi maintenance giữa thu và chi.

## 4. Cấu trúc thư mục FE

```
fe/src/pages/chung-tu/phieu/
├── PhieuHandlerContext.tsx        # Provider + hook; nhận config {loai, labels}
├── phieuConfig.ts                 # map loai → tiêu đề, màu, nhãn
├── PhieuListPage.tsx              # trang chính: stats + filter + table + modal
├── components/
│   ├── stats/StatsCards.tsx
│   ├── filter/FilterBar.tsx       # tìm kiếm, lọc ngày/đối tượng
│   ├── table/PhieuTable.tsx       # danh sách + phân trang + xóa
│   ├── form-modal/PhieuFormModal.tsx   # form tạo/sửa (đơn) + Zod
│   ├── view-modal/PhieuViewModal.tsx
│   └── summary/SummaryTabs.tsx
├── import/                        # mô phỏng module import của nhat-ky-chung
│   └── (UploadStep, PreviewTable, lib/*, sub-handler/*)
└── handler/sub-handler/
    ├── index.ts
    ├── init/                      # load list + stats + master-data
    ├── submit/                    # create / update
    ├── delete/
    ├── filter/
    └── load-summary/

fe/src/pages/chung-tu/phieu-thu/PhieuThuPage.tsx  # <PhieuListPage loai="PHIEU_THU"/>
fe/src/pages/chung-tu/phieu-chi/PhieuChiPage.tsx  # <PhieuListPage loai="PHIEU_CHI"/>
```

Tái sử dụng: `@/utils/snapshotBuilder`, `@/utils/snapshotDisplay`, các service
danh mục (doiTuong, taiKhoan, duAn, sanPham, dongTien, boPhan), pattern import
của nhat-ky-chung.

## 5. Form phiếu (đơn)

Trường (khớp entity `ChungTu`):

- Bắt buộc: `ngay`, `soTien` (≥ 0), `noiDung`.
- Tùy chọn: `nguoiGiaoDich`, `diaChi`, `ghiChu`.
- `danhMuc` (snapshot): đối tượng, tài khoản Nợ, tài khoản Có, dự án, bộ phận,
  sản phẩm, dòng tiền.
- `soPhieu` do BE tự sinh (`VoucherNumberService`).
- Validate bằng Zod.

## 6. Backend — bổ sung (voucher-service, module `chung-tu`)

Endpoint mới, **lọc theo `loai` cấp entity** (PHIEU_THU/PHIEU_CHI), tái dùng
`summary-aggregation.helper` của nhat-ky-chung:

- `GET /phieu-thu/stats`, `GET /phieu-chi/stats` — tổng số, tổng tiền.
- `GET /phieu-thu/summary/:type`, `GET /phieu-chi/summary/:type` — tổng hợp theo
  account / team / employee / project / investor / product / cash-flow / …
- `POST /phieu-thu/import`, `POST /phieu-chi/import` — import hàng loạt.
- Cải thiện list `GET /phieu-thu|/phieu-chi`: thay vì load toàn bộ rồi filter
  in-memory, dùng query Mongo + thêm filter ngày/đối tượng (theo mẫu
  `buildMongoQuery`, nhưng filter `loai` cấp entity).
- Dọn các TODO không còn dùng; bỏ phần workflow (submit/approve/reject) khỏi TODO.

## 7. Service FE

Mở rộng `phieuThuService` / `phieuChiService` (đang gọi `/voucher/phieu-thu`):
thêm `getStats`, `getSummary(type)`, `import`; đảm bảo `getById` / `update` /
`delete` dùng `/voucher/chung-tu/:id`. Chuẩn hoá theo `ServiceBase`.

## 8. Dọn dẹp & route

- Thay nội dung `PhieuThuPage.tsx` / `PhieuChiPage.tsx` (antd) bằng wrapper mới.
- **Gỡ phụ thuộc `@/mock-data/chung-tu`** ở 2 trang.
- `App.tsx`: giữ nguyên path; `loadable.tsx` trỏ tới page mới.
- Cập nhật `active-pages.md` (đánh dấu 2 trang ACTIVE đúng thực tế).

## 9. Testing

Mirror nhat-ky-chung:

- BE: unit test summary-aggregation (lọc `loai` cấp entity), service create/list.
- FE: validation Zod của form, lib import (parse / validate / normalize),
  snapshot builder.
- Chạy `yarn test` (BE), `npm run lint` + test (FE).

## 10. Ngoài phạm vi (YAGNI)

- Workflow duyệt / trạng thái phiếu (nháp → chờ duyệt → đã duyệt → từ chối).
- Đổi mô hình dữ liệu sang đa dòng cho phiếu thu/chi.
- In phiếu / xuất PDF (có thể làm sau).
