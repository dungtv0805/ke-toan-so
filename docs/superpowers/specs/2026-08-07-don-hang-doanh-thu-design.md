# Đơn hàng — ghi nhận doanh thu & Báo cáo doanh thu

Ngày: 2026-08-07
Nguồn nghiệp vụ: `docs/ONENESS_BÁN HÀNG.xlsx` (sheet `4.Đơn hàng`, `7.Doanh thu`)

## Bối cảnh

ONENESS gọi là **đơn hàng**; trong hệ thống đó chính là **hợp đồng** (`hop_dong` +
`theo_doi_hop_dong`). Không tạo entity mới.

Trước đây kế toán ghi nhận doanh thu thẳng vào TK 511. Nay thêm TK trung gian
**3387 — doanh thu chưa thực hiện**, cũng theo dõi theo đơn hàng. Khi kế toán bấm
ghi nhận doanh thu, hệ thống sinh bút toán **Nợ 3387 / Có 511** gắn đơn hàng;
tháng của chứng từ là tháng doanh thu lên báo cáo.

Đây là bút toán tự động đầu tiên của hệ thống — mọi bút toán khác vẫn do kế toán
nhập tay.

## 1. Quy tắc nhập chứng từ: thêm trường Hợp đồng

Ô "Quy tắc nhập chứng từ" trên form Tài khoản hiện có 9 trường. Thêm **Hợp đồng**
thành trường thứ 10, hai mức như cũ: `CANH_BAO` / `BAT_BUOC`.

Dòng hạch toán đã có sẵn trường hợp đồng (`hopDongId` ở FE, lưu snapshot vào
`danhMuc.hopDong`) — chỉ thiếu luật kiểm tra.

| Chỗ sửa | Việc |
|---|---|
| `fe/.../danh-muc/tai-khoan/TaiKhoanPage.tsx` | thêm `{ key: "hopDong", label: "Hợp đồng" }` vào `FIELD_RULE_FIELDS` |
| `fe/.../nhat-ky-chung/fieldRulesValidation.ts` | thêm nhãn + map `hopDong → hopDongId` |
| `be/apps/voucher-service/src/shared/field-rules-validation.service.ts` | chặn lưu khi thiếu ở mức `BAT_BUOC` |
| `be/libs/entities/src/voucher/chung-tu.entity.ts` | khai báo `hopDong?` trong `DanhMuc` |

**Lưu ý kỹ thuật:** snapshot hợp đồng KHÔNG có trường `ma` (chỉ có `id`,
`soHopDong`). Validation BE đang kiểm `danhMuc[field]?.ma` cho mọi trường → phải
special-case `hopDong` sang `soHopDong`, nếu không TK bật rule sẽ luôn báo thiếu.

Sau khi deploy, người dùng tự set TK 3387 và 511 = **Bắt buộc**. Đó là thứ giữ cho
báo cáo doanh thu không hụt dòng.

## 2. Nút "Ghi nhận doanh thu" trên đơn hàng

Trong Drawer của **Trung tâm dữ liệu → Quản lý Hợp đồng**, dưới hai khối *Thu tiền*
và *Hóa đơn* đã có, thêm khối thứ ba **Ghi nhận doanh thu**:

- Hai số tổng: **Đã ghi nhận** (tổng Có 511 của đơn) và **Chưa ghi nhận**
  (tổng Có 3387 − tổng Nợ 3387, tức số dư còn treo)
- Bảng các lần đã ghi nhận: Ngày | Số chứng từ | Số tiền | Diễn giải
- Nút **+ Ghi nhận doanh thu** → modal: Ngày ghi nhận (mặc định hôm nay), Số tiền
  (mặc định = số chưa ghi nhận), Diễn giải (mặc định `Ghi nhận doanh thu <số HĐ>`)
- Lưu → `POST /nhat-ky-chung` tạo 1 chứng từ `loai: KHAC`, `danhMuc.taiKhoanNo` =
  3387, `danhMuc.taiKhoanCo` = 511, `danhMuc.hopDong` = snapshot đơn hàng,
  `danhMuc.doiTuong`/`doiTuong2` = khách hàng của đơn hàng

Chứng từ sinh ra là chứng từ Nhật ký chung bình thường: kế toán xem/sửa/xóa được ở
Nhật ký chung; xóa thì khối này tự mất dòng. Không có bảng lưu riêng.

Nút chỉ hiện khi user có quyền sửa trang (`usePagePermission`).

**BE:** thêm filter `hopDong` (khớp `danhMuc.hopDong.soHopDong`) và `taiKhoan`
(khớp TK Nợ **hoặc** TK Có, tiền tố) vào `build-query.helper.ts` + query DTO, để
khối này lấy đúng các dòng 511/3387 của đơn hàng mà không kéo cả sổ về client.

## 3. Báo cáo doanh thu

Trang mới `/bao-cao/doanh-thu`, API `GET /bao-cao/doanh-thu?startDate&endDate` ở
reporting-service (đọc chứng từ qua `ServiceClient.getNhatKyChung` như các báo cáo
khác).

**Cách tính:** mọi dòng có **TK Có bắt đầu bằng `511`** trong kỳ → gom theo hợp
đồng, cộng theo tháng của `ngay` (ngày chứng từ, không phải ngày ghi sổ — thống
nhất với mọi báo cáo khác).

| Cột | Nguồn |
|---|---|
| Mã ĐH | `danhMuc.hopDong.soHopDong` |
| Khách hàng | `danhMuc.doiTuong2` (bên Có) → fallback `danhMuc.doiTuong` |
| Sản phẩm | `danhMuc.sanPham.ten` trên các dòng 511, nhiều thì ghép `, ` |
| Doanh số | `danhMuc.hopDong.giaTriSauThue` |
| Doanh thu | tổng Có 511 trong kỳ |
| T1…T12 | tổng theo tháng, FE chỉ hiện các tháng thuộc kỳ lọc |
| Dòng TỔNG | cộng dọc |

Dòng 511 **không gắn hợp đồng** gom vào một dòng cuối bảng `(Không gắn đơn hàng)`
để tổng báo cáo luôn khớp phát sinh Có 511 trên sổ cái — không âm thầm nuốt tiền.

Chỉ đơn hàng có phát sinh 511 trong kỳ mới có dòng (giống sheet 7 của ONENESS).

**Bộ lọc kỳ:** dùng bộ 20 mục hiện có ở `fe/src/pages/dashboard/period.ts`
(Tháng 1–12, Quý 1–4, 6 tháng đầu/cuối năm, Năm nay, Năm trước), mặc định
**Năm nay**. Chuyển file sang `fe/src/components/shared/period.ts` để dashboard và
báo cáo dùng chung, không copy đôi.

Có nút **Xuất Excel** dùng `exportReportExcel` như các báo cáo khác.

## 4. Menu & quyền

Menu **KẾ TOÁN → Báo cáo → Báo cáo doanh thu**, đặt ngay dưới PnL. Wiring theo
chuẩn dự án: `App.tsx`, `loadable.tsx`, `routePermissions.ts`, `menuCatalog.ts`,
`MainLayout.tsx` (2 chỗ), `tenant.service`. Sau deploy phải grant quyền cho Admin.

## Ngoài phạm vi

- Không thêm trường Sản phẩm vào entity hợp đồng (báo cáo lấy sản phẩm từ dòng
  hạch toán 511)
- Không tự sinh bút toán ghi nhận doanh thu chưa thực hiện (Nợ 111/112 / Có 3387)
  — kế toán vẫn nhập tay ở Nhật ký chung hoặc Thu tiền hợp đồng
- Không đổi cách các báo cáo hiện có tính doanh thu
