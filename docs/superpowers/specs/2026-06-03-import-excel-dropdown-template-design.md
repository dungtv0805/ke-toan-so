# Thiết kế: File mẫu import Nhật ký chung có dropdown (chọn thay vì nhớ mã)

- **Ngày:** 2026-06-03
- **Trạng thái:** Đã duyệt design, chờ viết plan
- **Phạm vi:** Nâng cấp UX cho tính năng import Nhật ký chung từ Excel — file mẫu có dropdown chọn danh mục, không bắt người dùng nhớ/gõ mã.
- **Liên quan:** mở rộng tính năng ở `docs/superpowers/specs/2026-06-03-nhat-ky-chung-import-excel-design.md`.

## 1. Vấn đề

File mẫu import hiện tại (`import/lib/template.ts`) chỉ có header + 1 dòng ví dụ; người dùng phải **tự gõ mã** cho mọi cột danh mục (loại GD, nghiệp vụ, tài khoản, đối tượng...). Phải nhớ mã → dễ sai, UX kém.

## 2. Mục tiêu

File mẫu khi tải về có **dropdown (data validation)** ở mọi cột danh mục để người dùng **chọn** thay vì gõ; khi import hệ thống tự **map giá trị đã chọn về mã**.

## 3. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Thư viện tạo template | Thêm **`exceljs`** (FE). `xlsx@0.18.5` community **không ghi được data validation**. Phần đọc import vẫn dùng `xlsx`. |
| Giá trị mỗi ô dropdown | Dạng **`"Mã - Tên"`** (vd `111 - Tiền mặt`). Hiển thị dễ nhận biết, map về mã đáng tin cậy (mã duy nhất). |
| Scope dropdown | **Cả 16 cột danh mục.** |
| Nghiệp vụ | **Liệt kê tất cả** (kèm loại GD trong tên), validate cặp loại GD↔nghiệp vụ khi import. **Không** cascading. |
| Tương thích ngược | File cũ (gõ mã thuần) vẫn import được nhờ bước tách mã. |

## 4. Kiến trúc & thư viện

- Thêm dependency `exceljs` (chỉ dùng FE, cho việc ghi template).
- Viết lại `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts`:
  - Bỏ `buildTemplateAoa` (dựa trên xlsx).
  - Thêm `buildTemplateWorkbook(masterData: ImportMasterData): ExcelJS.Workbook` (thuần, test được) và `downloadTemplate(masterData: ImportMasterData): Promise<void>` (ghi file + tải về).
- Phần đọc file `parse.handler.ts` **giữ nguyên** (`xlsx`).

## 5. Cấu trúc file mẫu

### Sheet chính `NhatKyChung`
- Hàng 1: header 22 cột (theo `IMPORT_COLUMNS`).
- Hàng 2: 1 dòng ví dụ; giá trị code-backed ở dạng "Mã - Tên".
- Data validation `type: 'list'` áp cho **16 cột danh mục**, vùng hàng 2→1000, `formulae` trỏ tới cột "Mã - Tên" của sheet danh mục tương ứng.
- Cột Ngày / Số tiền / Diễn giải / Người GD / Địa chỉ / Ghi chú: không validation.

### 16 sheet danh mục (tên ASCII)
Mỗi sheet: cột A chứa các chuỗi `"Mã - Tên"`.

| Cột sheet chính | Sheet danh mục | Nội dung "Mã - Tên" |
|---|---|---|
| Loại giao dịch | `DM_LoaiGiaoDich` | `ma - ten` |
| Nghiệp vụ | `DM_NghiepVu` | `nghiepVu - <mô tả> (loaiGiaoDich)` |
| TK Nợ, TK Có | `DM_TaiKhoan` (chung) | `ma - ten` |
| Đối tượng, Đối tượng 2, Nhân viên | `DM_DoiTuong` (chung) | `ma - ten` |
| Dự án | `DM_DuAn` | `ma - ten` |
| Bộ phận, Đội | `DM_BoPhan` (chung) | `ma - ten` |
| Sản phẩm | `DM_SanPham` | `ma - ten` |
| Dòng tiền | `DM_DongTien` | `ma - ten` |
| Khoản mục | `DM_KhoanMuc` | `ma - ten` |
| Hợp đồng | `DM_HopDong` | `soHopDong - tenCongTrinh` |
| Nhóm khuyến mãi | `DM_NhomKhuyenMai` | `ma - ten` |
| Nhóm quản lý | `DM_NhomQuanLy` | `ma - ten` |

- Dropdown trỏ tới **range** (không phải list inline) → không dính giới hạn 255 ký tự; danh sách dài vẫn chạy tốt.
- Lưu ý: TK Nợ/Có chung 1 sheet; Đối tượng/Đối tượng 2/Nhân viên chung 1 sheet; Bộ phận/Đội chung 1 sheet — đúng nguồn dữ liệu trong `validate.ts` hiện tại (nhân viên & đối tượng cùng `doiTuongList`, đội & bộ phận cùng `boPhanList`).

## 6. Map "Mã - Tên" về mã khi import

- Thêm helper `extractCode(value: string): string` (trong `import/lib`): lấy phần **trước " - " đầu tiên**, trim; nếu không có " - " → trả nguyên chuỗi.
  - `"111 - Tiền mặt"` → `"111"`; `"NV01 - Bán hàng (PHIEU_THU)"` → `"NV01"`; `"111"` → `"111"`; `""` → `""`.
  - Mã không chứa " - " nên tách an toàn; tên có dấu "-" thường (không có khoảng trắng hai bên) không bị ảnh hưởng.
- Trong `validate.ts`: với **16 cột danh mục**, chạy `extractCode` trên giá trị thô **trước khi** khớp (`loaiGiaoDich`, `nghiepVu`, `taiKhoanNo`, `taiKhoanCo`, và tất cả chiều phân bổ). Logic khớp/validate còn lại **giữ nguyên** (so theo mã; hợp đồng vẫn theo `soHopDong`).
- Cột không phải danh mục: không đổi.

→ File tạo từ template mới (dropdown ra "Mã - Tên") **và** file cũ (gõ mã thuần) đều import được.

## 7. Chi tiết UX

- Nút **"Tải file mẫu"** trong modal: `disabled` + trạng thái loading cho tới khi `masterDataLoaded = true`, rồi gọi `downloadTemplate(masterData)`.
- Dòng hướng dẫn modal cập nhật: chọn giá trị từ danh sách thả xuống trong từng cột; có thể gõ tay mã nếu muốn.

## 8. Testing

- **Unit (vitest):**
  - `extractCode`: "Mã - Tên", mã thuần, chuỗi rỗng, tên chứa "-" thường.
  - `validate.ts`: thêm case input dạng "Mã - Tên" cho vài cột (loaiGiaoDich, taiKhoan, đối tượng) → map đúng về mã; toàn bộ test cũ vẫn pass.
- **Template (exceljs):** test `buildTemplateWorkbook(masterData)`:
  - Có sheet chính + **12 sheet danh mục vật lý** (16 cột dropdown nhưng dùng chung sheet ở vài chỗ): LoaiGiaoDich, NghiepVu, TaiKhoan, DoiTuong, DuAn, BoPhan, SanPham, DongTien, KhoanMuc, HopDong, NhomKhuyenMai, NhomQuanLy.
  - Sheet chính có data validation ở đúng các cột danh mục.
  - Nội dung sheet danh mục đúng dạng "Mã - Tên".
- Phần đọc/`parse` không đổi → test cũ vẫn áp dụng.

> Ghi chú: 16 **cột** dropdown nhưng dùng chung sheet ở vài chỗ → **12 sheet danh mục vật lý** (LoaiGiaoDich, NghiepVu, TaiKhoan, DoiTuong, DuAn, BoPhan, SanPham, DongTien, KhoanMuc, HopDong, NhomKhuyenMai, NhomQuanLy).

## 9. Ngoài phạm vi (YAGNI)

- Cascading dropdown (nghiệp vụ lọc theo loại GD).
- Đổi phần đọc import sang exceljs.
- Tự sinh danh mục khi mã không tồn tại (giữ nguyên: báo lỗi).
