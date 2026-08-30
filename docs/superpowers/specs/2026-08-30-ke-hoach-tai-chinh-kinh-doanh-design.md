# Nâng cấp Kế hoạch Tài chính – Kinh doanh

Ngày: 2026-08-30
Nguồn yêu cầu: `docs/Yeu_cau_nang_cap_Ke_hoach_Tai_chinh_Kinh_doanh_MASTER_CEO_Hoan_chinh.docx`

## 1. Mục tiêu

Đưa phân hệ Kế hoạch từ "hai bảng chi tiết rời rạc" thành một bộ kế hoạch năm hoàn chỉnh:
năm bảng chi tiết cùng một khuôn, ba nhóm dữ liệu ngang hàng, và P&L truy được xuống dữ liệu
cấu thành.

Tài liệu yêu cầu có 13 mục. Chúng được chia thành năm giai đoạn, mỗi giai đoạn có plan thực thi
riêng. Giai đoạn 5 độc lập hoàn toàn với bốn giai đoạn kia.

## 2. Hiện trạng

| Đã có | Nơi |
|---|---|
| Trang Kế hoạch 7 tab, lọc theo Năm + Phiên bản | `fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx` |
| Bảng Bán hàng (nhóm SP → SP) | `ke_hoach_ban_hang`, `/voucher/ke-hoach-ban-hang` |
| Bảng Nhân sự (bộ phận → chức vụ, 6 cột chi phí) | `ke_hoach_nhan_su`, `/voucher/ke-hoach-nhan-su` |
| Chi tiết hạch toán kế hoạch — bút toán soi gương `ChungTu` | `ke_hoach`, `be/libs/entities/src/voucher/ke-hoach.entity.ts` |
| P&L kế hoạch có drill-down 3 cấp | `be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.ts` |
| Bản đồ chỉ tiêu KQKD dùng chung KH và TH | `be/libs/core/src/utils/kqkd-chi-tieu.ts` |
| So sánh Kế hoạch vs Thực hiện 13 chiều | `/voucher/ke-hoach/so-sanh` |
| Cây 3 cấp + cộng quý dùng chung cho các bảng | `fe/src/pages/ke-hoach/tabs/lib/tongHop.ts`, `cotChung.tsx` |

Chưa có: ba bảng Dòng tiền / Tài sản / Nguồn vốn; cột Diễn giải trên UI; cột CẢ NĂM và CHÊNH LỆCH;
cảnh báo hai cấp; quy chuẩn màu; tab cho trang Dự báo; liên kết bảng chi tiết ↔ chi tiết hạch toán;
P&L ba lớp; P&L không khấu hao.

Điểm bất đối xứng cần biết: `/trung-tam-du-lieu/du-bao` render thẳng `KeHoachPage` (lưới bút toán),
không phải `KeHoachTabsPage` — nên Dự báo hiện không có bảng chi tiết nào.

## 3. Quyết định thiết kế

**Không gộp collection.** `ke_hoach_ban_hang` và `ke_hoach_nhan_su` đang chứa dữ liệu thật của
công ty đang chạy. Ba bảng mới dùng cùng hình dạng (`nam`, cấp cha snapshot, cấp con, `thang: number[12]`,
`ghiChu`, `nguoiTaoId`) nhưng là collection riêng. Code dùng chung được chia sẻ qua một lớp base ở BE
và một khuôn bảng ở FE, không qua việc nhồi năm nghiệp vụ vào một schema.

**Cột DIỄN GIẢI dùng lại trường `ghiChu` sẵn có.** Hai entity hiện tại đã có `ghiChu` nhưng FE
không hiển thị. Đổi nhãn hiển thị thành "Diễn giải" và đưa ra đúng vị trí sau cột Tên; ba entity mới
cũng đặt tên trường là `ghiChu` cho nhất quán. Không migrate dữ liệu.

**P&L ba lớp tính hết ở `voucher-service`.** `chung_tu` (Thực hiện) nằm cùng database với `ke_hoach`
trong voucher-service — `KeHoachService.soSanh()` đã đọc thẳng `chung_tu` theo cách này. Vì vậy
`buildKqkdKeHoach()` được nâng thành hàm dùng chung chạy trên cả hai nguồn, và ba lớp KH / DB / TH
ra cùng một cấu trúc cây, cùng một công thức. Không phải đụng `reporting-service`, và không thể lệch
cách tính giữa ba lớp.

**Định khoản là cấu hình theo công ty.** Tài liệu không quy định dòng kế hoạch sinh ra cặp Nợ/Có nào.
Thay vì hard-code, bảng ánh xạ được lưu theo tenant với bộ mặc định seed sẵn để hệ thống chạy được ngay,
nghiệp vụ chỉnh sau mà không phải sửa code. Xem mục 10 — Điểm treo.

## 4. Nguyên tắc chung cho năm bảng

Hai biến thể cột:

| Biến thể | Bảng | Cột giá trị |
|---|---|---|
| A — có định lượng | Bán hàng, Nhân sự, Tài sản | `Số lượng` × `Giá bình quân` = `Thành tiền` |
| B — chỉ giá trị | Dòng tiền, Nguồn vốn | `Giá trị/Mục tiêu` |

Thứ tự cột chung, đúng tài liệu mục 4:

```
Mã | <Cấp cha> | <Tên cấp con> | Diễn giải | [SL | Giá BQ | Thành tiền] hoặc [Giá trị/Mục tiêu]
   | CẢ NĂM | CHÊNH LỆCH | Q1 Q2 Q3 Q4 | T1 … T12
```

Quy tắc tính, đúng tài liệu mục 5:

- `Q_n` = tổng ba tháng của quý đó — tự tính, không nhập
- `CẢ NĂM` = tổng 12 tháng — tự tính, không nhập
- `CHÊNH LỆCH` = `CẢ NĂM − Thành tiền` (biến thể A) hoặc `CẢ NĂM − Giá trị/Mục tiêu` (biến thể B)
- Chỉ ô `T1…T12` ở hàng chi tiết là ô nhập

`quyTuThang()` và `dungCayBang()` trong `tongHop.ts` đã làm đúng phần cộng dồn này; `HangBang` đã có
`namTheoThang` (= CẢ NĂM) và `namKhaiBao` (= Thành tiền). Việc còn lại là đưa chúng ra thành cột.

## 5. Giai đoạn 1 — Chuẩn hoá khung bảng

Áp cho hai bảng đang chạy (Bán hàng, Nhân sự); ba bảng mới ở GĐ2 sinh ra đã đúng khuôn này.

### 5.1. Cột

- Thêm cột `Diễn giải` ngay sau cột Tên, đọc/ghi `ghiChu`. Ô nhập text ở hàng chi tiết.
- Đổi nhãn cột số năm: "Doanh thu" (Bán hàng) và "CỘNG" (Nhân sự) → **`Thành tiền`**.
- Thêm cột `CẢ NĂM` (= `row.namTheoThang`) đặt **trước** nhóm Quý.
- Thêm cột `CHÊNH LỆCH` (= `namTheoThang − namKhaiBao`) ngay sau `CẢ NĂM`.
- Giữ nguyên cột `%`.

### 5.2. Cảnh báo cấp dòng — thay thế `oSoNam()`

Hiện `oSoNam()` tô đỏ ô số năm khi lệch, không phân biệt thiếu/vượt. Thay bằng cách hiển thị ở cột
`CHÊNH LỆCH`:

| Điều kiện | Hiển thị |
|---|---|
| `\|chênh lệch\| < 1` | ô trống, không cảnh báo |
| `> 0` | chữ **xanh**, `+N` kèm tooltip "Phân bổ vượt mục tiêu N₫" |
| `< 0` | chữ **đỏ**, `−N` kèm tooltip "Còn thiếu N₫" |

Ngưỡng 1 đồng dùng lại `bangNhau()` đã có trong `tongHop.ts`.

### 5.3. Cảnh báo cấp bảng

Component mới `CanhBaoLechMucTieu` đặt phía trên bảng, chỉ hiện khi có ít nhất một hàng chi tiết lệch:

> Kế hoạch chi tiết chưa khớp với mục tiêu năm. Vui lòng kiểm tra các dòng được cảnh báo bên dưới.
> Còn cần phân bổ: **N₫** · Phân bổ vượt: **M₫**

`N` = tổng trị tuyệt đối các chênh lệch âm, `M` = tổng các chênh lệch dương, tính trên hàng `chiTiet`.
Không chặn lưu — giữ nguyên hành vi hiện tại.

### 5.4. Quy chuẩn màu theo cấp thông tin

Nguyên tắc bắt buộc: **cùng cấp thông tin = cùng màu**, không nhạt dần theo từng cột.

| Cụm | Class | Vai trò |
|---|---|---|
| Mã, Tên, Diễn giải, SL, Giá BQ, Thành tiền | `kh-cot-chinh` | thông tin chính / mục tiêu — đậm nhất |
| CẢ NĂM, CHÊNH LỆCH | `kh-cot-nam` | tổng hợp cấp năm — nổi bật hơn Quý và Tháng |
| Q1–Q4 | `kh-cot-quy` | tất cả quý **một màu** |
| T1–T12 | `kh-cot-thang` | tất cả tháng **một màu**, nhạt hơn Quý |

Đặt qua `className` trên định nghĩa cột (áp cả header lẫn cell), CSS gom về một file
`fe/src/pages/ke-hoach/tabs/lib/bang-ke-hoach.css`. Hàng cha và hàng con giữ nền khác nhau —
`rowClassName()` đã có `kh-hang-tong` / `kh-hang-nhom`, chỉ cần định nghĩa màu nền phân biệt rõ.

Cấu trúc cha → con không lặp tên nhóm đã đúng: `dungCayBang()` sinh hàng nhóm riêng và
`onCellNhan`/`onCellNhanPhu` gộp ô nhãn ở hàng gộp.

### 5.5. Dự báo dùng chung bộ tab

- `KeHoachTabsPage` nhận prop `loaiKeHoach: LoaiKeHoach`, truyền xuống mọi tab con.
- Bỏ hard-code `"KE_HOACH"` tại `KeHoachTabsPage.tsx` (tab Chi tiết, `getPhienBanOptions`) và
  `fe/src/services/kqkdKeHoachService.ts`.
- `App.tsx`: route `/trung-tam-du-lieu/du-bao` đổi từ `KeHoachPage` sang `KeHoachTabsPage loaiKeHoach="DU_BAO"`.
- **BE**: thêm cột `loaiKeHoach: LoaiKeHoach` vào `KeHoachBanHang` và `KeHoachNhanSu`, mặc định `'KE_HOACH'`;
  `GET`/`POST`/`PATCH` nhận và lọc theo tham số. Backfill dữ liệu cũ bằng script một lần
  (`be/scripts/backfill-loai-ke-hoach.js`) — mọi bản ghi hiện có là `KE_HOACH`.
- Khoá chống trùng trong `trung-khoa.helper.ts` phải cộng thêm `loaiKeHoach` vào khoá.

### 5.6. Đổi tên nhóm dữ liệu

"Dữ liệu tổng hợp" → **"Thực hiện"** tại hai chỗ:
`fe/src/components/layout/MainLayout.tsx:293` và `fe/src/config/menuCatalog.ts:41`.

Route và quyền giữ nguyên (`/chung-tu/nhat-ky-chung`) — chỉ đổi nhãn hiển thị. Sau khi đổi, kiểm tra
lại cây phân quyền vì `menuCatalog` là nguồn của nhãn node.

## 6. Giai đoạn 2 — Ba bảng mới

### 6.1. Kế hoạch dòng tiền — `ke_hoach_dong_tien`

> **Sửa so với bản đầu (phát hiện lúc thực thi):** bản đầu viết `chieu` được
> "chụp từ `dong_tien.loai` lúc lưu". SAI. `DongTien.loai` là
> `KINH_DOANH | DAU_TU | TAI_CHINH` (phục vụ báo cáo lưu chuyển tiền tệ), không
> phải Thu/Chi. Danh mục không có chỗ nào mang chiều tiền, nên **người lập kế
> hoạch chọn Thu/Chi trên từng dòng**, qua một cột riêng.

```ts
@Entity('ke_hoach_dong_tien')
export class KeHoachDongTien extends BaseEntity {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  nhomDongTien: MucDanhMucKeHoach;   // từ danh mục nhom_dong_tien
  dongTien: MucDanhMucKeHoach;       // từ danh mục dong_tien
  chieu: 'THU' | 'CHI';              // chụp từ dong_tien.loai lúc lưu
  giaTriMucTieu: number;             // cột "Giá trị/Mục tiêu"
  thang: number[];                   // 12 phần tử, chỉ số 0 = T1
  ghiChu?: string;                   // cột DIỄN GIẢI
  nguoiTaoId: string;
}
```

Cấp cha và cấp con đều chọn từ danh mục master-data đã có. `chieu` được chụp lại lúc lưu để bảng vẫn
phân được Thu/Chi kể cả khi danh mục gốc đổi về sau — cùng lý do với `MucDanhMucKeHoach`.

**Năm dòng tổng hợp** — tính khi đọc, in đậm, nền riêng, không nhập tay, đặt đúng thứ tự tài liệu mục 8.3:

| Dòng | Công thức (theo từng tháng) |
|---|---|
| TỒN ĐẦU KỲ | T1 = `tonDauNam` nhập tay; T*n* = TỒN CUỐI KỲ của T*(n−1)* |
| THU TRONG KỲ | tổng các dòng chi tiết có `chieu = 'THU'` |
| CHI TRONG KỲ | tổng các dòng chi tiết có `chieu = 'CHI'` |
| TỒN CUỐI KỲ | TỒN ĐẦU KỲ + THU − CHI |
| THẶNG DƯ/THÂM HỤT | THU − CHI |

TỒN ĐẦU KỲ và TỒN CUỐI KỲ là **số dư**, không cộng dồn được: cột Quý lấy theo tháng đầu/cuối của quý,
cột CẢ NĂM lấy TỒN ĐẦU KỲ của T1 và TỒN CUỐI KỲ của T12. Ba dòng còn lại cộng bình thường.

`tonDauNam` lưu ở collection nhỏ riêng `ke_hoach_ton_dau` `{ nam, loaiKeHoach, soTien }` — một bản ghi
cho mỗi cặp năm × loại. Nhập tay, không đọc từ số dư thực tế (kế hoạch năm sau thường lập trước khi
khoá sổ năm nay).

### 6.2. Kế hoạch tài sản — `ke_hoach_tai_san`

```ts
@Entity('ke_hoach_tai_san')
export class KeHoachTaiSan extends BaseEntity {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  boPhan: MucDanhMucKeHoach;   // cột hiển thị nhãn "NƠI SỬ DỤNG"
  maTaiSan: string;            // gõ tự do
  tenTaiSan?: string;          // gõ tự do
  soLuong: number;
  giaBinhQuan: number;
  thang: number[];
  ghiChu?: string;
  nguoiTaoId: string;
}
```

Master-data **không có** danh mục tài sản. Kế hoạch tài sản chủ yếu là tài sản sẽ mua nên chưa tồn tại
trong bất kỳ danh mục nào — nhập tự do, đúng cách bảng Nhân sự đang làm với `maViTri`/`tenChucVu`.
Cấp cha lấy từ danh mục `bo_phan` có sẵn, chỉ đổi **nhãn cột** thành "Nơi sử dụng" (tài liệu mục 8.4).

### 6.3. Kế hoạch nguồn vốn — `ke_hoach_nguon_von`

```ts
export type NhomNguonVon = 'NO_PHAI_TRA' | 'VON_CHU_SO_HUU';

@Entity('ke_hoach_nguon_von')
export class KeHoachNguonVon extends BaseEntity {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  nhom: NhomNguonVon;
  maChiTieu: string;      // gõ tự do
  tenChiTieu?: string;
  soDuDauNam: number;     // gốc để cộng ra số dư từng kỳ
  giaTriMucTieu: number;
  thang: number[];        // BIẾN ĐỘNG trong tháng, cho phép ÂM
  ghiChu?: string;
  nguoiTaoId: string;
}
```

Ô tháng là **biến động** (âm = giảm), không phải số dư — nhờ vậy quy tắc "Quý = Σ3 tháng, Cả năm = Σ12
tháng" của tài liệu vẫn đúng nguyên. Số dư hiển thị thành một **dòng phụ dưới mỗi hàng chi tiết**:
`số dư cuối T_n = soDuDauNam + Σ(T1…T_n)`. Đây là cách duy nhất thoả đồng thời "theo dõi biến động và
số dư còn lại" (mục 9) và quy tắc cộng dồn (mục 4).

Hai nhóm cố định `NỢ PHẢI TRẢ` và `VỐN CHỦ SỞ HỮU` — tài liệu ghi "tối thiểu gồm", nên khai bằng hằng
số trong code chứ không dựng danh mục.

**Lưu ý kỹ thuật**: `numberInputProps` trong `cotChung.tsx` đang đặt `min: 0` và parser
`replace(/\D/g, '')` — nuốt mất dấu trừ. Bảng Nguồn vốn cần biến thể `numberInputPropsCoAm` riêng.

### 6.4. Phần dùng chung

**BE** — `KeHoachBangBaseService<T>` trong `be/apps/voucher-service/src/ke-hoach-bang/base/`.

> **Thu hẹp so với bản đầu:** base chỉ gom phần thật sự dùng chung — phạm vi
> tenant, lọc theo (năm, loại), `layTheoNam`, `xoa`, `timTheoId`, và móc nối
> engine đồng bộ. `taoMoi` và `luuHangLoat` ở lại từng service: khoá chống trùng
> của mỗi bảng là một quy tắc nghiệp vụ khác nhau (sản phẩm / bộ phận+mã vị trí /
> dòng tiền / bộ phận+mã tài sản / nhóm+mã chỉ tiêu), và một lớp cha cố nhận hết
> các biến thể đó sẽ khó đọc hơn chính đoạn code nó thay thế. Cả năm bảng đều
> dùng base — không có hai đường code song song.

**FE** — mỗi bảng mới: 1 service, 1 handler namespace (`ke-hoach-dong-tien`, `ke-hoach-tai-san`,
`ke-hoach-nguon-von`), 2 sub-handler (`init`, `row-edit`), 1 HandlerContext, 1 Tab, 1 Table. Đúng khuôn
`fe/src/pages/ke-hoach/tabs/ban-hang/`. Phần cột Q/T, cây 3 cấp, ô nhập dùng lại `tabs/lib/`.

### 6.5. API

Ba nhóm endpoint mới, cùng hình dạng với `/voucher/ke-hoach-ban-hang`:

```
GET    /voucher/ke-hoach-dong-tien?nam=&loaiKeHoach=
POST   /voucher/ke-hoach-dong-tien
POST   /voucher/ke-hoach-dong-tien/batch        { nam, loaiKeHoach, them[], sua[] }
PATCH  /voucher/ke-hoach-dong-tien/:id
DELETE /voucher/ke-hoach-dong-tien/:id
GET/PUT /voucher/ke-hoach-dong-tien/ton-dau?nam=&loaiKeHoach=
```

Tương tự cho `/voucher/ke-hoach-tai-san` và `/voucher/ke-hoach-nguon-von`.

Endpoint `batch` nhận mảng lớn — nâng giới hạn body trong `main.ts` của voucher-service nếu chưa nâng
(mặc định Nest là 100kb).

## 7. Giai đoạn 3 — Engine đồng bộ chi tiết hạch toán

Tài liệu mục 2: nhập ở bảng chi tiết → Lưu → tự sinh/cập nhật dòng ở Chi tiết hạch toán → tự tổng hợp
lên báo cáo; sửa/xoá ở bảng nguồn thì dòng phát sinh đồng bộ theo. Yêu cầu kỹ thuật nêu rõ: **mỗi dòng
nguồn phải có ID liên kết duy nhất.**

### 7.1. Liên kết

Thêm vào `KeHoachDong`:

```ts
/** Bảng chi tiết đã sinh ra dòng này. Không có = người dùng tự nhập ở tab Chi tiết. */
nguonLoai?: 'BAN_HANG' | 'NHAN_SU' | 'DONG_TIEN' | 'TAI_SAN' | 'NGUON_VON';
/** Id của dòng trong bảng chi tiết tương ứng. */
nguonId?: string;
```

Index trên `(nguonLoai, nguonId)`.

### 7.2. Quy tắc sinh

Mỗi dòng nguồn sinh tối đa 12 bút toán — một cho mỗi tháng có `thang[i] !== 0`:

| Trường `ke_hoach` | Giá trị |
|---|---|
| `loaiKeHoach` | theo dòng nguồn |
| `phienBan` | `PHIEN_BAN_MAC_DINH` |
| `ngay` | `new Date(Date.UTC(nam, i, 1))` — ngày 01 tháng `i+1`, 00:00:00.000Z |
| `soTien` | `thang[i]` |
| `noiDung` | `ghiChu` của dòng nguồn, rỗng thì lấy tên cấp con |
| `danhMuc.taiKhoanNo` / `taiKhoanCo` | từ cấu hình định khoản (7.4) |
| `danhMuc` các chiều khác | Bán hàng → `sanPham`; Nhân sự / Tài sản → `boPhan`; Dòng tiền → `dongTien` |
| `nguonLoai`, `nguonId` | khoá liên kết |

`ngay` đặt theo UTC vì `kqkd.helper.ts` đọc tháng bằng `getUTCMonth()`.

### 7.3. Đồng bộ

Sau mỗi lần lưu một dòng nguồn: **xoá hết** `ke_hoach` có `nguonId = <id dòng>` rồi **chèn lại**.
Cách này idempotent, chạy lại cho cùng kết quả, và xử lý được cả trường hợp tháng đổi từ có số về 0.
Xoá dòng nguồn → xoá các dòng phát sinh của nó. Cả hai chạy trong cùng lời gọi service với bảng nguồn.

Ranh giới an toàn: engine **chỉ đụng vào dòng có `nguonId`**. Dòng người dùng tự nhập ở tab Chi tiết
không có `nguonId` nên không bao giờ bị xoá.

Trên lưới tab Chi tiết, dòng có `nguonId` hiển thị **chỉ đọc** kèm nhãn nguồn — sửa tay ở đó sẽ bị ghi
đè ở lần lưu bảng nguồn kế tiếp, nên chặn từ đầu thay vì để mất dữ liệu.

### 7.4. Cấu hình định khoản

```ts
@Entity('cau_hinh_dinh_khoan_ke_hoach')
export class CauHinhDinhKhoanKeHoach extends BaseEntity {
  bang: 'BAN_HANG' | 'NHAN_SU' | 'DONG_TIEN' | 'TAI_SAN' | 'NGUON_VON';
  /** Chỉ dùng cho DONG_TIEN và NGUON_VON, nơi Thu/Chi hoặc Nợ/Vốn định khoản khác nhau. */
  phanLoai?: string;
  taiKhoanNo: MucDanhMucKeHoach;
  taiKhoanCo: MucDanhMucKeHoach;
}
```

Mỗi bảng chi tiết cũng nhận hai trường tuỳ chọn `taiKhoanNo?` / `taiKhoanCo?` để ghi đè ở cấp dòng khi
cần. Thứ tự ưu tiên: dòng → cấu hình theo `(bang, phanLoai)` → cấu hình theo `bang`.

Bộ mặc định seed sẵn để hệ thống chạy được ngay. **Bộ này là giả định kỹ thuật, chưa được nghiệp vụ
xác nhận** — xem mục 10 của tài liệu này.

## 8. Giai đoạn 4 — Nâng cấp P&L

### 8.1. Đổi tên

Tab "KQKD" trong trang Kế hoạch → **"P&L Kế hoạch"** (`KeHoachTabsPage.tsx`, danh sách tab).

### 8.2. Mở rộng drill-down

`kqkd.helper.ts` hiện dựng cây con cho: `01`, `02`, `11`, `20` theo **nhóm sản phẩm**; `25`, `26` theo
**nhóm khoản mục → khoản mục**. Tài liệu mục 10 yêu cầu +/− cho cả chi phí tài chính và chi phí/thu
nhập khác. Bổ sung cây `nhóm khoản mục → khoản mục` cho:

- `22` — chi phí tài chính (635)
- `31` — thu nhập khác (711)
- `32` — chi phí khác (811)

Dùng lại nguyên `conKhoanMuc` đang chạy cho `25`/`26`, chỉ mở rộng danh sách mã được dựng cây. Giá vốn
(`11`) đã có cây theo nhóm sản phẩm — tài liệu chấp nhận, không đổi.

### 8.3. P&L ba lớp

Điểm mấu chốt: `chung_tu` và `ke_hoach` **cùng database** trong voucher-service, và `DongKeHoachKqkd`
(hình bút toán mà `buildKqkdKeHoach` nhận) khớp đúng hình của `chung_tu` — `ngay`, `soTien`,
`danhMuc.{taiKhoanNo,taiKhoanCo,sanPham,khoanMuc}`. Vì vậy hàm dựng cây chạy được trên cả hai nguồn
mà không phải sửa gì bên trong.

Endpoint mới:

```
GET /voucher/ke-hoach/kqkd-3-lop?nam=&phienBan=
→ { nam, keHoach: KqkdKeHoachReport, duBao: KqkdKeHoachReport, thucHien: KqkdKeHoachReport }
```

Ba cây **cùng cấu trúc khoá** (`'01'`, `'01:N1'`, `'25:N2:KM01'`), nên FE ghép theo `key` là ra bảng so
sánh. Mỗi chỉ tiêu hiển thị Kế hoạch / Dự báo / Thực hiện / Chênh lệch (TH − KH) / % đạt, mở rộng được
theo đúng cây drill-down của 8.2.

`KeHoachModule` đã `forFeature([KeHoachDong, ChungTu])` sẵn cho `soSanh()`, không cần thêm phụ thuộc.
`napDanhMucKqkd()` gọi một lần dùng chung cho cả ba lớp.

Hai điểm phải cẩn thận:
- `chung_tu` có thể nhiều bản ghi hơn `ke_hoach` rất nhiều — `$match` theo năm phải dùng index trên `ngay`.
- `kqkd.helper.ts` đọc tháng theo **UTC**, `build-query.helper.ts` dựng khoảng ngày theo **giờ local**.
  Khoảng lọc năm cho `chung_tu` phải dựng theo cùng quy ước với cách đọc tháng, nếu không tháng 1 và
  tháng 12 sẽ lệch.

## 9. Giai đoạn 5 — P&L không khấu hao

Báo cáo độc lập, chỉ là một góc nhìn: không tạo nguồn dữ liệu mới, không sửa bút toán, không ảnh hưởng BCTC.

**BE** — thêm query param vào endpoint đang chạy:

```
GET /reporting/bao-cao/kqkd?startDate=&endDate=&loaiTruKhauHao=true
```

Loại trừ **ngay ở tầng đọc bút toán**, trước khi tổng hợp — không lấy tổng P&L rồi cộng ngược khấu hao,
đúng tài liệu mục 11. Nhờ vậy drill-down cũng tự động không thấy các dòng bị loại.

Điều kiện loại trừ, đúng chữ tài liệu:

```
(khoản mục là "Khấu hao")  VÀ  (maTaiKhoanNo bắt đầu '214' HOẶC maTaiKhoanCo bắt đầu '214')
```

So khớp tên khoản mục sau khi bỏ dấu và hạ chữ thường (`khau hao`).

**FE** — trang mới `/bao-cao/pnl-khong-khau-hao`, nhãn sidebar "P&L không khấu hao". Dùng lại nguyên
component bảng của trang KQKD hiện có, chỉ truyền thêm cờ. Wiring đủ 7 chỗ theo quy trình thêm trang
mới của dự án (route, `routePermissions`, `MainLayout` 2 chỗ, `menuCatalog`, `loadable`, `tenant.service`),
và grant quyền cho vai trò Admin sau khi deploy.

**Bước bắt buộc trước khi code**: kiểm tra dữ liệu thật xem bút toán khấu hao có thực sự gắn khoản mục
"Khấu hao" không. Nếu không có, điều kiện AND sẽ không loại được gì và báo cáo trùng khít P&L thường —
lúc đó phải chuyển sang lọc theo TK 214 là chính, và đó là thay đổi so với tài liệu nên phải hỏi lại
trước khi làm.

## 10. Điểm treo cần nghiệp vụ chốt

**Cặp tài khoản định khoản mặc định (GĐ3).** Tài liệu không quy định. Bộ dưới đây là giả định kỹ thuật
để hệ thống chạy được, cần nghiệp vụ xác nhận hoặc sửa:

| Bảng | Nợ | Có |
|---|---|---|
| Bán hàng | 131 — Phải thu khách hàng | 511 — Doanh thu bán hàng |
| Nhân sự | 642 — Chi phí quản lý doanh nghiệp | 334 — Phải trả người lao động |
| Tài sản | 211 — Tài sản cố định hữu hình | 331 — Phải trả người bán |
| Dòng tiền (THU) | 112 — Tiền gửi ngân hàng | 131 — Phải thu khách hàng |
| Dòng tiền (CHI) | 331 — Phải trả người bán | 112 — Tiền gửi ngân hàng |
| Nguồn vốn (NO_PHAI_TRA) | 331 — Phải trả người bán | 341 — Vay và nợ thuê tài chính |
| Nguồn vốn (VON_CHU_SO_HUU) | 112 — Tiền gửi ngân hàng | 411 — Vốn đầu tư của chủ sở hữu |

Rủi ro nếu chốt sai: P&L Kế hoạch lệch, vì nó tổng hợp từ chính các bút toán này. Vì vậy màn hình cấu
hình phải làm được trước khi bật engine cho công ty thật.

**Phiên bản kế hoạch cho năm bảng chi tiết.** Collection `ke_hoach` có `phienBan`, năm bảng chi tiết
thì không. Ở GĐ3, dòng sinh ra luôn vào phiên bản `Mặc định`. Nếu công ty cần nhiều phiên bản kế hoạch
ở cấp bảng chi tiết thì phải mở rộng thêm — chưa nằm trong phạm vi này.

## 10b. Trạng thái thực thi

Cả năm giai đoạn đã làm xong (2026-08-30 → 31). Hai sai lệch so với bản thiết kế
đầu đã ghi ngay tại mục tương ứng: chiều Thu/Chi của dòng tiền, và phạm vi của
lớp base.

Điểm treo ở mục 10 vẫn còn nguyên: **bộ định khoản mặc định chưa được nghiệp vụ
xác nhận.** Nay đã có màn hình sửa được (nút "Định khoản" trên trang Kế hoạch),
và màn hình đó tự nói rõ đây là giả định kỹ thuật.

## 11. Ngoài phạm vi

- Xuất Excel cho ba bảng mới (bảng Bán hàng/Nhân sự hiện cũng chưa có).
- Import Excel cho ba bảng mới.
- Phân quyền riêng cho từng tab — vẫn dùng quyền chung của trang Kế hoạch.
- Danh mục Tài sản trong master-data.
- So sánh Tài sản / Nguồn vốn với kế hoạch — tài liệu mục 9 và 12 nói rõ hai bảng này phân tích giữa
  các kỳ và theo xu hướng, **không bắt buộc** so với kế hoạch.
- Báo cáo tổng hợp Kế hoạch tài chính – kinh doanh xuất ra file cuối năm (mục 13) — làm sau khi năm
  bảng chi tiết đã ổn định.

## 12. Kiểm thử

Baseline của repo: `yarn test` bên BE đã đỏ sẵn 13 suite và `tsc` lỗi sẵn ở cả BE lẫn FE; `vite build`
không typecheck. Vì vậy chạy test **hẹp theo service/file**, không lấy toàn bộ suite làm thước đo.

| Phần | Kiểm |
|---|---|
| `tongHop.ts` mở rộng | unit: chênh lệch dương/âm/bằng 0; ngưỡng 1 đồng; tổng cấp bảng |
| Dòng tiền — 5 dòng tổng hợp | unit: tồn đầu cuộn qua 12 tháng; tồn cuối = đầu + thu − chi; Quý/Năm của dòng số dư lấy đầu-cuối chứ không cộng |
| Nguồn vốn — số dư | unit: số dư cuối T*n* = đầu năm + luỹ kế; biến động âm |
| Engine đồng bộ | unit: sinh đúng số bút toán (bỏ tháng = 0); lưu lại hai lần cho cùng kết quả; xoá dòng nguồn xoá đúng các dòng phát sinh; **không** đụng dòng không có `nguonId` |
| `kqkd.helper.ts` mở rộng | có `kqkd.helper.spec.ts` sẵn — thêm case cho cây `22`/`31`/`32` |
| P&L ba lớp | unit: ba cây trả về cùng tập khoá; biên tháng 1 và tháng 12 không lệch múi giờ |
| P&L không khấu hao | unit: bút toán 214 có khoản mục khấu hao bị loại; bút toán 214 **không** có khoản mục khấu hao **không** bị loại; drill-down không còn dòng đã loại |
