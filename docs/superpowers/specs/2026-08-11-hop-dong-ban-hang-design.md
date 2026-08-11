# Nâng cấp trang Bán hàng (`/trung-tam-du-lieu/hop-dong`)

Ngày: 2026-08-11 · Nhánh: `feat/hop-dong-ban-hang`

## Mục tiêu

Biến trang theo dõi hợp đồng thành màn hình điều hành bán hàng: nhìn một dòng biết đơn
hàng đã thu bao nhiêu, đã ghi nhận doanh thu bao nhiêu, còn thiếu gì, và bấm thẳng vào
đó để sinh bút toán — thay vì phải mở Drawer rồi tự đối chiếu.

## Hiện trạng

- `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx` — bảng 12 cột phẳng,
  3 thẻ Statistic lấy từ `/theo-doi-hop-dong/stats`, lọc theo `nam` (trường nhập tay).
- Đã có sẵn và sẽ tái dùng: `ThuTienDonHangModal` (Nợ 112 / Có 3387),
  `GhiNhanDoanhThuSection` (Nợ 3387 / Có 511), `donHangChungTu.ts`
  (`loadDonHangSnapshots`, `taiKhoanSnapshot`, `defaultTaiKhoan`),
  `ghiNhanDoanhThu.ts` (`tinhDoanhThuHopDong`).
- `HopDong` **chưa có trường sản phẩm**.
- `chung_tu` là bút toán kép đơn giản: `soTien` + `danhMuc.taiKhoanNo/taiKhoanCo`,
  `danhMuc.hopDong`, `danhMuc.sanPham`.
- `hoa_don_ban_ra` có `hopDongId`, `tienHang`, `tienThue`, `tong`.
  `bang_ke_ban_ra` (Thuế) **không** có liên kết đơn hàng → không dùng.

## Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Nguồn sản phẩm | Thêm **1 sản phẩm cho mỗi đơn hàng** (`HopDong.sanPhamId`) |
| Nguồn "Đã xuất hóa đơn" | **Sổ HĐ bán ra** (`hoa_don_ban_ra`), = Σ(`tienHang` + `tienThue`) |
| Gốc tính | Doanh số = **sau thuế**; mốc so doanh thu = **trước thuế** |
| Bút toán ghi nhận doanh thu | **Nợ 131 / Có 3387** |
| Nguồn "Đã thu" | **Chứng từ**: Σ Nợ `111*` + Nợ `112*` theo đơn hàng |
| 511 không gắn đơn / đơn chưa có SP | Dồn vào dòng **"Chưa phân loại"** trong bảng pivot |
| Đơn thiếu `ngayKy` | Rơi về trường `nam` cũ để lọc theo năm; pivot vào cột "Không rõ tháng" |
| Cả 2 điều kiện Ghi chú cùng đúng | Hiện **cả hai** chip |
| Vị trí bảng pivot | Collapse thu gọn được, 2 tab, ngay trên FilterBar |
| Triển khai | **3 giai đoạn**, deploy dần |

## Kiến trúc

### Vì sao ghép ở FE, không gọi chéo service

Ba cột mới nằm ở `chung_tu` (voucher-service :3003), đơn hàng nằm ở master-data-service
(:3002). Master-data hiện **không** có `ServiceClient` nào; dựng mới thì phải deploy 2
service và chịu rủi ro `ServiceClient` nuốt lỗi âm thầm. Trang này vốn đã ghép 4 service
ở FE (`theoDoiHopDong`, `hoaDonBanRa`, `doiTuong`, `nhatKyChung`), nên thêm một lời gọi
song song rồi ghép theo `soHopDong` là rẻ nhất.

### Endpoint mới (voucher-service)

`GET /voucher/nhat-ky-chung/tong-hop-don-hang?nam=2026`

```ts
interface TongHopDonHangResponse {
  theoDonHang: Array<{
    soHopDong: string;
    daThu: number;            // Σ Nợ 111* + Nợ 112*, luỹ kế toàn thời gian
    dtChuaThucHien: number;   // max(0, Σ Có 3387* − Σ Nợ 3387*), luỹ kế
    dtDaThucHien: number;     // Σ Có 511*, luỹ kế
    dtTheoThang: number[];    // 12 phần tử, Σ Có 511* theo tháng của `ngay`, chỉ trong `nam`
  }>;
  khongCoDonHang: Array<{
    sanPhamMa: string;        // '' nếu chứng từ cũng không có sản phẩm
    sanPhamTen: string;
    dtTheoThang: number[];
  }>;
}
```

Khoá gom là `danhMuc.hopDong.soHopDong`. Bốn số luỹ kế **không** cắt theo bộ lọc thời
gian — cắt thì "Còn phải thu" sai. Chỉ `dtTheoThang` bị giới hạn trong `nam`.

### Tải dữ liệu ở FE

`theoDoiHopDongService.getList()` bỏ tham số `nam` (BE giữ tham số để tương thích, FE
không truyền nữa). FE tải trọn danh sách đơn hàng + 1 lần gọi tổng hợp, mọi bộ lọc chạy
client-side. Lý do: đơn ký 2024 nhưng ghi nhận doanh thu 2025 vẫn phải lên bảng DOANH THU
tháng của 2025 — nếu BE cắt theo năm ký thì mất dòng đó. Đổi bộ lọc cũng không gọi lại API.

Chỉ gọi lại endpoint tổng hợp khi **đổi năm** (vì `dtTheoThang` phụ thuộc `nam`).

## Thay đổi model

### `HopDong` (be/libs/entities/src/master-data/hop-dong.entity.ts)

```ts
@Column({ nullable: true })
sanPhamId?: string;
```

Theo đúng lối `doiTuongId` đang dùng — chỉ lưu id, FE map ra tên qua `sanPhamService`.
Trường `nam` **giữ nguyên trong DB** (không migration, không xoá) nhưng thôi hiển thị.

Nơi cần thêm ô chọn Sản phẩm:
- `fe/src/pages/danh-muc/hop-dong/` — form thêm/sửa
- `fe/src/pages/trung-tam-du-lieu/hop-dong/TaoNhanhHopDongModal.tsx`
- `fe/src/components/import-danh-muc/configs/hopDong.config.ts` — cột import Excel
- DTO create/update của hop-dong ở master-data-service

## Bảng chính

### Nhóm cột (header 2 tầng)

```
│ ghim trái (định danh)                              │           BÁN HÀNG            │      THU TIỀN       │              CHỨNG TỪ               │ ghim phải │
│ Số HĐ │ Ngày HĐ │ Khách hàng │ SP │ Tên công trình │ Doanh số │ Tiền thuế │ DT chưa TH │ DT đã TH │ Đã thu │ Còn phải thu │ Đã xuất HĐ │ Chưa xuất HĐ │ Quyết toán │ Phụ trách │ Ghi chú │ Theo dõi │
```

Ghim trái chỉ **Số HĐ** (như hiện tại) để bảng không bị hẹp; các cột định danh còn lại
cuộn bình thường. Ba cột đang dùng được giữ nguyên chức năng: "Tên công trình" ở nhóm
định danh, "Quyết toán" và "Phụ trách" ở nhóm CHỨNG TỪ. Cột "Thuế suất" bỏ khỏi bảng
(vẫn xem được trong Drawer) để nhường chỗ cho các cột mới.

### Công thức

| Cột | Công thức |
|---|---|
| Ngày HĐ | `ngayKy` (DD/MM/YYYY); trống → `-` |
| Doanh số | `giaTriSauThue` |
| Tiền thuế | `tienThue` |
| DT chưa TH | `dtChuaThucHien` từ endpoint tổng hợp |
| DT đã TH | `dtDaThucHien` từ endpoint tổng hợp |
| Đã thu | `daThu` từ endpoint tổng hợp |
| Còn phải thu | `Doanh số − Đã thu` |
| Đã xuất HĐ | Σ(`tienHang` + `tienThue`) của `hoa_don_ban_ra` theo `hopDongId` |
| Chưa xuất HĐ | `Doanh số − Đã xuất HĐ` |

**Mốc doanh thu** (không hiện thành cột, chỉ dùng để tính Ghi chú):
`giaTriTruocThue`, thiếu thì `giaTriSauThue − tienThue`.

Backend `toRow` bổ sung `giaTriTruocThue` vào `TheoDoiHopDongRow` và đổi `daTraHoaDon`
sang `tienHang + tienThue` (thay vì `tong`) cho đúng yêu cầu; hai số này bằng nhau với dữ
liệu nhập đúng nhưng công thức tường minh thì không lệ thuộc vào `tong` được nhập tay.

### Cột Ghi chú

Dung sai so sánh: 1 đồng (`Math.abs(x) < 1` coi là 0) — tránh chip ma do làm tròn decimal.

| Điều kiện | Chip | Bấm → modal đặt sẵn |
|---|---|---|
| `dtChuaTH + dtDaTH < mốc doanh thu` | **Ghi nhận doanh thu** | Nợ `131` / Có `3387`, số tiền = `mốc − (dtChuaTH + dtDaTH)` |
| `dtChuaTH > 0` | **Kết chuyển doanh thu** | Nợ `3387` / Có `511`, số tiền = `dtChuaTH` |
| `Còn phải thu > 0` | **Thu tiền** | `ThuTienDonHangModal` sẵn có (Nợ `112` / Có `3387`) |

Không thoả điều kiện doanh thu → nhãn tĩnh "Đã ghi nhận doanh thu".
Không thoả điều kiện thu tiền → nhãn tĩnh "Đã thu tiền".

Mọi modal điền sẵn: đơn hàng, khách hàng, **sản phẩm**, ngày (hôm nay), số tiền, diễn
giải. Dùng lại `loadDonHangSnapshots` + `taiKhoanSnapshot` + `defaultTaiKhoan` (khớp mã
chuẩn trước, không có thì lấy TK con đầu tiên — công ty dùng `1311`/`33871`/`5113` vẫn
đúng). Chứng từ sinh ra là chứng từ Nhật ký chung `loai: 'KHAC'`; sửa/xoá ở Nhật ký chung.

Sau khi lưu bút toán: gọi lại endpoint tổng hợp để bảng cập nhật (không reload cả trang).

## Thanh công cụ

Bốn bộ lọc, tất cả chạy client-side:

1. **Khách hàng** — Select theo `doiTuongId`, `showSearch`
2. **Sản phẩm** — Select theo `sanPhamId`, `showSearch`, có mục "Chưa chọn sản phẩm"
3. **Đơn hàng** — Select theo `soHopDong`, `showSearch`
4. **Thời gian** — 2 dropdown:
   - Năm: 2022…2037 (như `NAM_OPTIONS` hiện tại)
   - Kỳ: Cả năm / 6 tháng đầu / 6 tháng cuối / Q1–Q4 / T1–T12 / Tuỳ chọn
   - Chọn "Tuỳ chọn" → hiện `RangePicker`

Mặc định: **Năm hiện tại – Cả năm**.

Đơn có `ngayKy` → lọc theo `ngayKy`. Đơn thiếu `ngayKy` → chỉ so `nam` với năm đang
chọn, và **chỉ lọt khi kỳ = "Cả năm"** (không đoán tháng).

## Báo cáo nhanh (8 thẻ)

Doanh số · Doanh thu chưa thực hiện · Doanh thu đã thực hiện · Tiền thuế · Tiền đã thu ·
Còn phải thu · Đã xuất hóa đơn · Chưa xuất hóa đơn.

Tính bằng cách cộng đúng tập dòng **sau khi lọc** (cả 4 bộ lọc, không riêng thời gian).
Xoá 3 thẻ cũ và bỏ gọi `/theo-doi-hop-dong/stats`; endpoint `/stats` để lại ở BE (có thể
nơi khác dùng) nhưng FE không gọi nữa.

Layout: 2 hàng × 4 thẻ, `Col xs={12} sm={6}`.

## Hai bảng pivot

Đặt trong `Collapse` (mặc định đóng) ngay **trên** FilterBar, 2 tab: DOANH SỐ / DOANH THU.

Cột (20): `Sản phẩm | Cả năm | 6T đầu | 6T cuối | Q1 | Q2 | Q3 | Q4 | T1 … T12`
- Ghim trái: **Sản phẩm** và **Cả năm**
- Ghim trên: hàng tiêu đề (`sticky`) và hàng **TỔNG** (`Table.Summary fixed="top"`)
- `scroll={{ x: 'max-content', y: 420 }}`

| Bảng | Số liệu | Trục tháng |
|---|---|---|
| DOANH SỐ | Σ `giaTriSauThue` theo `sanPhamId` | tháng của **`ngayKy`** |
| DOANH THU | Σ Có `511*` | tháng của **`ngay` chứng từ** |

Phạm vi: **năm đang chọn**, không chịu ảnh hưởng của dropdown Kỳ (bảng vốn đã tách sẵn
quý/tháng). Ba bộ lọc Khách hàng / Sản phẩm / Đơn hàng **có** áp dụng.

Dòng "Chưa phân loại" (DOANH THU): gộp `khongCoDonHang` + các đơn có 511 nhưng
`sanPhamId` trống. Dòng "Không rõ tháng" chỉ xuất hiện ở DOANH SỐ, cho đơn thiếu `ngayKy`
— đặt sau cùng, chỉ cộng vào cột "Cả năm".

## Kiểm thử

Tách hàm thuần ra file riêng để test không cần render, theo lối `ghiNhanDoanhThu.test.ts`
sẵn có:

| Hàm | File | Ca cần phủ |
|---|---|---|
| `apDungBoLocThoiGian(rows, nam, ky, range)` | `boLocThoiGian.ts` | đơn có/không `ngayKy`; kỳ quý, tháng, 6T, tuỳ chọn; biên đầu/cuối kỳ |
| `tinhGhiChuDonHang(row)` | `ghiChuDonHang.ts` | 4 tổ hợp điều kiện; dung sai 1đ; mốc doanh thu thiếu `giaTriTruocThue` |
| `tongHopBaoCaoNhanh(rows)` | `baoCaoNhanh.ts` | tập rỗng; giá trị âm; cộng đủ 8 chỉ tiêu |
| `pivotTheoThang(...)` | `pivotSanPham.ts` | 2 sản phẩm trùng tên khác mã; "Chưa phân loại"; "Không rõ tháng"; cột quý/6T bằng tổng tháng con |

Backend: `tong-hop-don-hang.spec.ts` ở voucher-service — TK con (`1121`, `33871`, `5113`)
phải khớp prefix; 3387 âm bị chặn về 0; chứng từ không có `danhMuc.hopDong` rơi vào
`khongCoDonHang`; `dtTheoThang` chỉ lấy chứng từ trong năm.

Lưu ý baseline: BE `yarn test` đỏ sẵn 13 suite và `tsc` lỗi sẵn ở cả BE lẫn FE → chỉ chạy
test hẹp theo service đang sửa, đối chiếu với baseline trước khi kết luận.

## Ba giai đoạn

### GĐ1 — Nền tảng (BE master-data + FE)
1. `HopDong.sanPhamId` + DTO + form danh mục + `TaoNhanhHopDongModal` + config import
2. `TheoDoiHopDongRow` bổ sung `sanPhamId`, `giaTriTruocThue`; `daTraHoaDon` đổi sang
   `tienHang + tienThue`
3. Cột "Năm" → "Ngày HĐ"
4. Bốn bộ lọc trên thanh công cụ
5. Tám thẻ báo cáo nhanh (bỏ `/stats`)

### GĐ2 — Số liệu kế toán (BE voucher + FE)
6. Endpoint `GET /voucher/nhat-ky-chung/tong-hop-don-hang` + spec
7. Service + type ở FE, ghép vào rows
8. Bốn cột mới (DT chưa TH, DT đã TH, Đã thu, Chưa xuất HĐ) + header nhóm 3 tầng
9. Cột Ghi chú + 3 modal (tái dùng `ThuTienDonHangModal`, thêm 2 modal bút toán)

### GĐ3 — Bảng pivot (FE)
10. `pivotSanPham.ts` + test
11. Collapse 2 tab với cột/hàng ghim

## Ngoài phạm vi

- Không đụng `bang_ke_ban_ra` (Thuế) — không có liên kết đơn hàng.
- Không thêm dòng chi tiết nhiều sản phẩm cho một đơn hàng.
- Không backfill `ngayKy` cho đơn cũ; đơn thiếu ngày vẫn lọc được theo năm.
- Không đổi trang `/bao-cao/hop-dong`.
