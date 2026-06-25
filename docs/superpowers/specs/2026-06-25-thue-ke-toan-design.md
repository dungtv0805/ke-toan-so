# Thiết kế chức năng Thuế (Lĩnh vực KE_TOAN)

Ngày: 2026-06-25
Nhánh: `feat/thue-ke-toan`
Nguồn yêu cầu: file `docs/templates/THIẾT KẾ_KẾ TOÁN.xlsx` — các sheet `Bảng kê mua vào`, `Bảng kê bán ra`, `Tổng hợp thuế`, `Báo cáo nhanh thuế TNDN`.

> Ghi chú nguồn: trong file Excel, chỉ sheet **Báo cáo nhanh thuế TNDN** có nội dung đầy đủ (đã trích dưới đây). Ba sheet còn lại trống → thiết kế dựa trên thực tế tờ khai thuế GTGT của VN (PL01-1/PL01-2) + pattern code hiện có.

## 1. Mục tiêu & phạm vi

Thêm nhóm menu **"Thuế"** trong lĩnh vực KE_TOAN, ngang cấp "Báo cáo", gồm 4 chức năng:

| Menu con | Route | Loại |
|---|---|---|
| Bảng kê mua vào | `/thue/bang-ke-mua-vao` | CRUD (thêm/sửa/xóa) |
| Bảng kê bán ra | `/thue/bang-ke-ban-ra` | CRUD (thêm/sửa/xóa) |
| Tổng hợp thuế | `/thue/tong-hop` | Báo cáo (tự tính + nhập tay điều chỉnh) |
| Báo cáo nhanh thuế TNDN | `/thue/bao-cao-tndn` | Báo cáo (tự tính + nhập tay điều chỉnh) |

### Quyết định thiết kế (đã chốt với người dùng)
- **Nguồn dữ liệu bảng kê:** giai đoạn này là bảng **độc lập, nhập tay (CRUD)**. Bản ghi được thiết kế theo dạng hóa đơn để **giai đoạn sau** lúc tạo chứng từ có thể chọn/lấy từ bảng thay vì nhập tay.
- **Hai báo cáo:** **tự động tính** từ bảng kê + số phát sinh sổ cái, **đồng thời cho nhập tay** các ô điều chỉnh (chi phí không được trừ, thu nhập miễn thuế, lỗ chuyển, TNCN, BHXH).
- **Hệ thống cảnh báo tự động (Vàng/Đỏ):** **để phase sau** (không làm ở phase này).

### Ngoài phạm vi (phase sau)
- Liên kết bảng kê ↔ chứng từ (chọn hóa đơn từ bảng khi tạo chứng từ; tự sinh bảng kê từ NKC).
- Hệ thống cảnh báo Vàng/Đỏ theo 5 điều kiện trong sheet TNDN.

## 2. Kiến trúc tổng thể

- **Backend:** tạo service mới **`tax-service`** (port **3009**), theo đúng pattern "1 lĩnh vực = 1 service" (giống `kho-service` 3008).
  - Gateway thêm route `{ pathPrefix: '/tax', service: 'tax', stripPrefix: true }` và cấu hình `services.tax` (host/port) trong `apps/gateway/src/environments/environment.ts`.
  - Env: thêm `SERVICE_TAX_HOST` / `SERVICE_TAX_PORT=3009` vào `.env-cmdrc` + script `start:tax:dev`.
  - Báo cáo gọi sang `reporting-service` (qua `@app/service-client`) để lấy số phát sinh TK theo quý.
- **Đa tenant:** entity extends `BaseEntity` → tự có `tenantId` (TenantSubscriber set khi insert), service lọc bằng `getTenantFilter()`. Soft delete (`isActive=false`), không xóa cứng.
- **Frontend:** theo CHanlder pattern + shadcn/Antd như các trang hiện có. Service axios `taxService` trỏ `/tax/*`.

## 3. Backend — chi tiết

### 3.1. Entity (libs/@app/entities)

**`bang-ke-mua-vao.entity.ts`** (hóa đơn, chứng từ hàng hóa dịch vụ mua vào — mẫu PL01-2/GTGT):
- `ngayHoaDon: Date`
- `soHoaDon: string`
- `kyHieuHoaDon?: string`
- `tenNguoiBan: string`
- `mstNguoiBan?: string`
- `tenHangHoa?: string` (mặt hàng / diễn giải)
- `giaTriChuaThue: number` (giá trị HHDV mua vào chưa thuế)
- `thueSuat: string` (enum giá trị: `'0'|'5'|'8'|'10'|'KCT'|'KKKT'`)
- `tienThue: number` (thuế GTGT đầu vào)
- `tongThanhToan: number` (= giaTriChuaThue + tienThue, tính ở BE khi lưu)
- `ghiChu?: string`
- (phase sau) `chungTuId?: string`, `soChungTu?: string`

**`bang-ke-ban-ra.entity.ts`** (PL01-1/GTGT): giống trên, đổi đối tượng:
- `tenNguoiMua: string`, `mstNguoiMua?: string` (các trường khác như bảng mua vào).

**`dieu-chinh-thue.entity.ts`** (lưu số nhập tay của báo cáo, khóa theo `nam`):
- `nam: number`
- Chi phí không được trừ — 4 dòng theo sheet, mỗi dòng 4 quý:
  `cpkdtDichVuHangHoa: number[4]`, `cpkdtTscdCcdc: number[4]`, `cpkdtNhanCong: number[4]`, `cpkdtTaiChinhKhac: number[4]`
  (mảng 4 phần tử = Q1..Q4; lưu dạng `number[]`).
- `thuNhapMienThue: number[4]`, `loDuocChuyen: number[4]`
- Nghĩa vụ ngân sách nhập tay: `thueTNCN: number[4]`, `bhxh3383: number[4]`, `bhyt3384: number[4]`, `bhtn3386: number[4]`

> Lưu `number[]` (4 phần tử). Một bản ghi duy nhất / (tenantId, nam) — upsert khi PUT.

### 3.2. Module CRUD (mirror `khoan-muc`)
Mỗi bảng kê có thư mục `apps/tax-service/src/<name>/`:
```
<name>.module.ts | <name>.service.ts | <name>.controller.ts
dto/create-<name>.dto.ts | dto/update-<name>.dto.ts | dto/<name>-query.dto.ts
```
Routes (sau khi gateway strip `/tax`):
- `GET /bang-ke-mua-vao?page=&limit=&tuNgay=&denNgay=&quy=&nam=&keyword=` → phân trang + lọc khoảng ngày/quý/năm.
- `GET /bang-ke-mua-vao/:id`
- `POST /bang-ke-mua-vao`
- `PUT /bang-ke-mua-vao/:id`
- `DELETE /bang-ke-mua-vao/:id` (soft delete)
- Tương tự cho `bang-ke-ban-ra`.

DTO validate bằng `class-validator`; `tienThue`/`tongThanhToan` tính lại ở service để tránh sai lệch client.

### 3.3. Báo cáo

**`GET /tax/tong-hop?nam=&quy=`** (read-only, chọn năm + quý hoặc cả năm):
- GTGT **đầu vào** = Σ `tienThue` bảng kê mua vào trong kỳ.
- GTGT **đầu ra** = Σ `tienThue` bảng kê bán ra trong kỳ.
- GTGT **phải nộp / còn khấu trừ** = đầu ra − đầu vào (dương = phải nộp; âm = còn được khấu trừ chuyển kỳ sau).
- Dòng nghĩa vụ ngân sách (TNDN tạm tính, TNCN, BHXH...) lấy từ `dieu-chinh-thue` + kết quả TNDN.

**`GET /tax/bao-cao-tndn?nam=`** — dựng theo đúng các chỉ tiêu sheet (xem §5):
- Doanh thu & chi phí **tự lấy số phát sinh theo quý** từ reporting-service (`getTrialBalance` per quý) cho các TK: 511, 515, 711 (Có) và 632, 641, 642, 811 (Nợ).
- 4 dòng **chi phí không được trừ** + **thu nhập miễn thuế / lỗ chuyển**: lấy từ `dieu-chinh-thue` (nhập tay).
- LN kế toán trước thuế = (511+515+711) − (632+641+642+811).
- Thu nhập tính thuế = LN trước thuế + chi phí không được trừ − thu nhập miễn thuế − lỗ chuyển.
- **Thuế suất TNDN bậc thang theo doanh thu lũy kế năm:** <1 tỷ → 0; 1–3 tỷ → 15%; 3–50 tỷ → 17%; >50 tỷ → 20%.
- Ra: thuế TNDN phải nộp (tạm tính) theo quý + lũy kế, LN sau thuế.
- Phần nghĩa vụ ngân sách: thuế GTGT bán ra (3331), VAT khấu trừ (133), VAT còn phải nộp, TNCN, các khoản BHXH (3383/3384/3386) — lấy từ `dieu-chinh-thue` và/hoặc sổ cái.
- **Cảnh báo Vàng/Đỏ: KHÔNG làm phase này.**

**`PUT /tax/dieu-chinh-thue?nam=`**: upsert bản ghi điều chỉnh (số nhập tay) cho năm.

## 4. Frontend — chi tiết

- **Menu:** thêm `getItem("Thuế", "/thue", <icon>, [...4 mục])` vào `keToAnMenuItems` (MainLayout.tsx) ngay sau "Báo cáo"; thêm 4 entry vào `menuCatalog.ts` (`parentLabel: 'Thuế'`); thêm route lazy trong router; phân quyền `/thue/*:xem`.
- **2 trang CRUD** (`bang-ke-mua-vao`, `bang-ke-ban-ra`): theo CHanlder pattern — bảng danh sách + form thêm/sửa (modal), nút xóa (xác nhận), bộ lọc theo quý/năm/khoảng ngày, phân trang. Cột hiển thị theo các trường entity; cột "Tổng thanh toán" và "Tiền thuế" auto theo giá trị + thuế suất khi nhập.
- **2 trang báo cáo** (`tong-hop`, `bao-cao-tndn`): bảng theo quý (Q1..Q4 + Lũy kế), bộ chọn năm (và quý cho Tổng hợp). Các dòng điều chỉnh là **ô input** lưu qua `PUT /tax/dieu-chinh-thue`; các dòng tự tính read-only. Hiển thị công thức ở cột ghi chú giống sheet.
- **Service:** `fe/src/services/taxService.ts` (axios) cho toàn bộ endpoint `/tax/*`.

## 5. Phụ lục — Chỉ tiêu Báo cáo nhanh thuế TNDN (trích từ sheet)

| TT | Chỉ tiêu | TK | Công thức |
|---|---|---|---|
| 1 | Doanh thu thuần bán hàng | 511 | Có TK 511 |
| 2 | Doanh thu tài chính, lãi tiền gửi/cho vay | 515 | Có TK 515 |
| 3 | Thu nhập chịu thuế TNDN khác | 711 | Có TK 711 |
| 4 | Giá vốn hàng bán | 632 | Nợ TK 632 |
| 5 | Chi phí bán hàng | 641 | Nợ TK 641 |
| 6 | Chi phí quản lý DN | 642 | Nợ TK 642 |
| 7 | Chi phí khác | 811 | Nợ TK 811 |
| # | Tổng chi phí ghi nhận | | 632+641+642+811 |
| A | LN kế toán trước thuế | | 511+515+711−632−641−642−811 |
| (17) | Chi phí không được trừ (4 dòng) | | nhập tay |
| B | Thu nhập tính thuế TNDN | | A + CP không trừ − TN miễn − lỗ chuyển |
| 16 | Chi phí thuế TNDN hiện hành | | Thu nhập tính thuế × thuế suất bậc thang |
| 17 | Lợi nhuận sau thuế | | A − thuế TNDN |

Nghĩa vụ ngân sách: Thuế TNDN phải nộp; Thuế GTGT bán ra (3331); TNCN; VAT đã khấu trừ (133); VAT tạm nộp (3331); VAT còn phải nộp; BHXH (3383), BHYT (3384), BHTN (3386).

Thuế suất TNDN bậc thang theo doanh thu lũy kế: `<1 tỷ → 0` · `1–3 tỷ → 15%` · `3–50 tỷ → 17%` · `>50 tỷ → 20%`.

(Phase sau) Cảnh báo tự động: CP không trừ >5% DT → Vàng; >10% DT → Đỏ; VAT âm 3 kỳ liên tục → Vàng; chưa nộp TNDN tạm tính → Đỏ; hồ sơ chờ bổ sung quá hạn → Đỏ.
