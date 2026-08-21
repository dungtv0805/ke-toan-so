# Kế hoạch — tab KQKD

Ngày: 2026-08-21
Nguồn yêu cầu: sheet `KQKD` trong `docs/THIẾT KẾ KẾ HOẠCH.xlsx`
Tiếp nối: `2026-08-20-ke-hoach-tabs-design.md` (đợt đó KQKD chỉ là khung "Sắp có")

## 1. Mục tiêu

Thay khung "Sắp có" của tab **KQKD** (`/trung-tam-du-lieu/ke-hoach`) bằng báo cáo kết
quả kinh doanh **kế hoạch**: cùng công thức với báo cáo KQKD ở Báo cáo tài chính,
chỉ khác nguồn — đọc thẳng từ các dòng của tab **Chi tiết** (`ke_hoach`) thay vì từ
Dữ liệu tổng hợp (`chung_tu`).

Bảng chỉ để **xem**, không nhập liệu. Muốn đổi số thì sửa ở tab Chi tiết.

Ngoài phạm vi đợt này: dòng "Doanh thu hòa vốn" cuối sheet (file thiết kế để trống,
không có công thức), xuất Excel, cột so sánh với số thực hiện.

## 2. Công thức dùng chung

Yêu cầu là "công thức y hệt bên BCTC". Để điều đó không phụ thuộc vào việc hai file
được sửa song song, bản đồ chỉ tiêu tách ra một chỗ và **cả hai báo cáo cùng dùng**:

`be/libs/core/src/utils/kqkd-chi-tieu.ts`

```ts
export interface ButToanKqkd {
  soTien: number;
  maTaiKhoanNo?: string;
  maTaiKhoanCo?: string;
}

/** Mã số ↔ prefix tài khoản ↔ bên phát sinh. Nguồn sự thật duy nhất. */
export const CHI_TIEU_GOC_KQKD = [
  { ma: '01', prefix: '511',  ben: 'CO' },
  { ma: '02', prefix: '521',  ben: 'NO' },
  { ma: '11', prefix: '632',  ben: 'NO' },
  { ma: '21', prefix: '515',  ben: 'CO' },
  { ma: '22', prefix: '635',  ben: 'NO' },
  { ma: '25', prefix: '641',  ben: 'NO' },
  { ma: '26', prefix: '642',  ben: 'NO' },
  { ma: '31', prefix: '711',  ben: 'CO' },
  { ma: '32', prefix: '811',  ben: 'NO' },
  { ma: '51', prefix: '8211', ben: 'NO' },
  { ma: '52', prefix: '8212', ben: 'NO' },
] as const;

export type MaChiTieuGoc = (typeof CHI_TIEU_GOC_KQKD)[number]['ma'];

/** Cộng phát sinh theo từng chỉ tiêu gốc. Một bút toán có thể rơi vào 2 chỉ tiêu
 *  (TK Nợ khớp một cái, TK Có khớp cái khác) — đúng như `getKqkd` đang làm. */
export function tinhChiTieuGoc(rows: ButToanKqkd[]): Record<MaChiTieuGoc, number>;

/** Các chỉ tiêu suy ra từ chỉ tiêu gốc. */
export function tinhChiTieuDanXuat(g: Record<MaChiTieuGoc, number>): {
  m10: number;  // 01 − 02              doanh thu thuần
  m20: number;  // 10 − 11              lợi nhuận gộp
  m30: number;  // 20 + (21 − 22) − (25 + 26)
  m40: number;  // 31 − 32              lợi nhuận khác
  m50: number;  // 30 + 40              lợi nhuận trước thuế
  m60: number;  // 50 − 51 − 52         lợi nhuận sau thuế
  tongChiPhi: number; // 22 + 25 + 26
};
```

Xuất qua `be/libs/core/src/index.ts`.

**`bao-cao.service.ts` `getKqkd` sửa để gọi hai hàm này** thay cho 22 lời gọi
`sumByAccountPrefix` đang viết tay. Đây là thay đổi thuần cơ học, số không đổi.
`sumByAccountPrefix` vẫn giữ nguyên (còn dùng ở chỗ khác) nhưng `getKqkd` không gọi
nó nữa; `khauHao` (Có `214`, phục vụ EBITDA) **không** thuộc bản đồ dùng chung vì
không phải chỉ tiêu KQKD — `getKqkd` tự tính như hiện tại.

Hiện `getKqkd` **chưa có test nào**. `kqkd-chi-tieu.spec.ts` phải viết TRƯỚC khi động
vào `bao-cao.service.ts`, phủ: đúng prefix, đúng bên Nợ/Có, tài khoản con (`5111`,
`6321`) tính vào tài khoản cha, `8211`/`8212` không lẫn nhau, và cả 7 công thức
dẫn xuất.

## 3. Ánh xạ mục La Mã của sheet sang mã số BCTC

Sheet đánh số La Mã và **thiếu mục II**. Mục II được thêm lại để bậc thang khớp BCTC
và số giảm trừ không biến mất khỏi báo cáo.

| Mục | Mã BCTC | Công thức | Dòng con |
|---|---|---|---|
| I. DOANH THU | 01 | Có `511` | nhóm sản phẩm |
| II. CÁC KHOẢN GIẢM TRỪ DOANH THU | 02 | Nợ `521` | nhóm sản phẩm |
| III. GIÁ VỐN BÁN HÀNG | 11 | Nợ `632` | nhóm sản phẩm |
| IV. LỢI NHUẬN GỘP | 20 | I − II − III | nhóm sản phẩm |
| V. DOANH THU TÀI CHÍNH | 21 | Có `515` | — |
| VI. CHI PHÍ TÀI CHÍNH | 22 | Nợ `635` | — |
| VII. CHI PHÍ BÁN HÀNG | 25 | Nợ `641` | nhóm khoản mục → khoản mục |
| VIII. CHI PHÍ QUẢN LÝ DOANH NGHIỆP | 26 | Nợ `642` | nhóm khoản mục → khoản mục |
| IX. TOTAL CHI PHÍ | — | VI + VII + VIII | — |
| X. LỢI NHUẬN THUẦN TỪ HĐSXKD | 30 | IV + (V − VI) − (VII + VIII) | — |
| THU NHẬP KHÁC | 31 | Có `711` | — |
| CHI PHÍ KHÁC | 32 | Nợ `811` | — |
| LỢI NHUẬN KHÁC | 40 | 31 − 32 | — |
| XI. LỢI NHUẬN TRƯỚC THUẾ | 50 | X + LN khác | — |
| XII. CHI PHÍ THUẾ TNDN | 51 + 52 | Nợ `8211` + Nợ `8212` | — |
| XIII. LỢI NHUẬN SAU THUẾ | 60 | XI − XII | — |

Ba dòng THU NHẬP KHÁC / CHI PHÍ KHÁC / LỢI NHUẬN KHÁC không có số La Mã — đúng như
sheet (dòng 55–57).

Lợi nhuận gộp **của một nhóm sản phẩm** = doanh thu nhóm − giảm trừ nhóm − giá vốn nhóm.

## 4. Gom theo nhóm

### Nhóm sản phẩm

`ke_hoach.danhMuc.sanPham` chỉ lưu `{ ma, ten, donVi?, giaBan? }` — **không có nhóm**.
Phải tra ngược qua master-data: `san_pham.nhom` lưu **mã** của nhóm (xem
`SanPhamPage.tsx:503` — ô chọn dùng `value: n.ma`), rồi lấy tên ở `nhom_san_pham`.

### Nhóm khoản mục

`danhMuc.khoanMuc.nhom` đã nằm sẵn trên dòng kế hoạch. Giá trị có thể là **mã hoặc
id** — tra tên bằng cách khớp cả hai, đúng như `nhomKhoanMucCua` ở FE
(`fe/src/pages/ke-hoach/lib/keHoachRow.ts`).

### Dòng không có danh mục

Không dòng nào được rơi mất khỏi báo cáo:

| Trường hợp | Gom vào |
|---|---|
| Sản phẩm không gắn nhóm | `Chưa phân nhóm` |
| Dòng không chọn sản phẩm | `Không phân bổ sản phẩm` |
| Khoản mục không gắn nhóm | `Chưa phân nhóm` |
| Dòng không chọn khoản mục | `Không phân bổ khoản mục` |

Các rổ này luôn xếp **cuối** danh sách con, sau các nhóm có thật (sắp theo mã).

## 5. Backend

Service: **voucher-service** (cổng 3003) — `ke_hoach` nằm ngay đó nên gom bằng
aggregate của Mongo, không phải kéo hàng nghìn dòng qua HTTP.

### Endpoint

```
GET /voucher/ke-hoach/kqkd?nam=2026&loaiKeHoach=KE_HOACH&phienBan=...
```

`nam` bắt buộc. `loaiKeHoach` mặc định `KE_HOACH`. `phienBan` bỏ trống = mọi phiên bản.

Route `@Get('kqkd')` phải đặt **trước** `@Get(':id')` trong `ke-hoach.controller.ts` —
file đã có sẵn ghi chú này cho `phien-ban` / `series` / `so-sanh`.

Phân quyền: dùng lại danh sách vai trò xem của `ke-hoach.controller.ts`
(`ADMIN, KE_TOAN_TRUONG, KE_TOAN_QUY, KE_TOAN_TONG_HOP, MANAGER, KIEM_SOAT`).

Lọc tenant qua `KeHoachService.theoTenant` như mọi truy vấn khác trong service.

### Kiểu trả về

`be/libs/dto/src/voucher/kqkd-ke-hoach.dto.ts`, xuất qua `voucher/index.ts`:

```ts
export interface KqkdKeHoachDong {
  key: string;          // '01' | '01:NHOM1' | '25:NHOM_KM:KM01' — duy nhất trong cây
  ma?: string;          // mã số BCTC, chỉ có ở dòng mục
  soLaMa?: string;      // 'I' … 'XIII', chỉ có ở dòng mục
  ten: string;
  cap: 0 | 1 | 2;       // 0 = mục, 1 = nhóm, 2 = khoản mục
  thang: number[];      // đúng 12 phần tử, T1…T12
  con?: KqkdKeHoachDong[];
}

export interface KqkdKeHoachReport {
  nam: number;
  dong: KqkdKeHoachDong[];
  doanhThuThuanNam: number;   // mẫu số của cột %
}
```

**Chỉ trả 12 số tháng.** Năm, 6 tháng đầu/cuối, quý và % đều là tổng của 12 số đó —
tính ở FE lúc dựng bảng, không lưu, không truyền thừa.

### Luồng tính

1. `$match` theo tenant + `loaiKeHoach` + `phienBan` + `ngay` trong năm.
2. `$project` chỉ những trường cần: `ngay`, `soTien`, `danhMuc.taiKhoanNo.ma`,
   `danhMuc.taiKhoanCo.ma`, `danhMuc.sanPham.ma`, `danhMuc.khoanMuc.ma`,
   `danhMuc.khoanMuc.ten`, `danhMuc.khoanMuc.nhom`.
3. Song song: `getSanPham`, `getNhomSanPham`, `getNhomKhoanMuc` từ master-data.
4. `buildKqkdKeHoach(rows, danhMuc)` — hàm **thuần**, không chạm DB.

Tháng lấy từ `ngay` theo **UTC**. Dòng kế hoạch luôn lưu `00:00:00.000Z` của đúng ngày
(`ngayLuu` trong `keHoachRow.ts`), nên đọc theo UTC không lệch biên tháng; đọc theo
giờ VN thì 01/03 rơi về tháng 2.

### ServiceClient

Thêm vào `@app/service-client` ba phương thức, lấy `getNganHang` làm khuôn (nó truyền
cả `Authorization` lẫn `x-tenant-id`, còn `getKhoanMuc` chỉ truyền `Authorization`):

```ts
getSanPham(authToken?, tenantId?)      // /master-data/san-pham/all
getNhomSanPham(authToken?, tenantId?)  // /master-data/nhom-san-pham/all
getNhomKhoanMuc(authToken?, tenantId?) // /master-data/nhom-khoan-muc/all
```

Gọi vào route **`/all`** chứ không phải route gốc: route gốc phân trang
(`PaginationQueryDto`), lấy nhầm thì chỉ nhận trang đầu và báo cáo âm thầm gom sản
phẩm ngoài trang đầu vào "Chưa phân nhóm". Cả ba `/all` đều đã có sẵn.

Cả ba **phải truyền `x-tenant-id`**, nếu không danh mục trả về là của tenant khác —
`findAll` bên master-data lọc tenant bằng header này.

Gọi thất bại (service chết, timeout) → coi như danh mục rỗng: báo cáo vẫn ra, số tổng
ở các mục La Mã vẫn đúng, chỉ là mọi dòng con rơi vào "Chưa phân nhóm". Không ném lỗi
làm hỏng cả trang.

### File mới / sửa

```
be/libs/core/src/utils/kqkd-chi-tieu.ts            (mới)
be/libs/core/src/utils/kqkd-chi-tieu.spec.ts       (mới)
be/libs/core/src/index.ts                          (sửa — export)
be/libs/dto/src/voucher/kqkd-ke-hoach.dto.ts       (mới)
be/libs/dto/src/voucher/index.ts                   (sửa — export)
be/libs/service-client/src/service-client.ts       (sửa — 3 phương thức)
be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.ts       (mới)
be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.spec.ts  (mới)
be/apps/voucher-service/src/ke-hoach/helpers/index.ts             (sửa)
be/apps/voucher-service/src/ke-hoach/ke-hoach.service.ts          (sửa — getKqkd)
be/apps/voucher-service/src/ke-hoach/ke-hoach.controller.ts       (sửa — route)
be/apps/voucher-service/src/ke-hoach/dto/kqkd-query.dto.ts        (mới)
be/apps/reporting-service/src/bao-cao/bao-cao.service.ts          (sửa — dùng chung)
```

## 6. Frontend

```
fe/src/pages/ke-hoach/tabs/kqkd/
├── KqkdTab.tsx
├── KqkdHandlerContext.tsx
├── handler/kqkd.handler.ts
├── handler/sub-handler/{index.ts, init/init.handler.ts, init/init.event.ts}
└── lib/
    ├── kqkdKeHoachRows.ts        # 12 tháng → năm / 6T / quý / %
    └── kqkdKeHoachRows.test.ts
```

Đúng khuôn CHanlder của `fe/HANDLER_GUIDE.md` như tab Bán hàng và Nhân sự: `KqkdTab`
chỉ ghép sub-component và gọi `init`, mọi logic nằm ở sub-handler
`@RegisterHandler`.

Service FE: `fe/src/services/kqkdKeHoachService.ts`, kế thừa `ServiceBase`.

### Cột

```
Chỉ tiêu | Năm | % | 6T đầu | 6T cuối | Q1 Q2 Q3 Q4 | T1 … T12
```

- Quý = tổng đúng 3 tháng của quý đó; 6T đầu = T1–T6; 6T cuối = T7–T12;
  Năm = T1–T12.
- **`%` = giá trị cả năm ÷ `doanhThuThuanNam`** — đúng cột "% DT thuần" của trang
  BCTC. Mẫu số bằng 0 thì hiện `-`, không chia cho 0. Dòng con cũng chia cho cùng
  mẫu số đó (một quy tắc cho cả bảng).

  Ghi chú: cột `%` trong file thiết kế không nhất quán — dòng 20 chia cho doanh thu,
  dòng 53–60 chia cho lợi nhuận gộp, dòng 31 và 43 để 0. Ta chọn một quy tắc duy nhất
  và lấy quy tắc của BCTC.
- Nhóm cột theo `Table.ColumnGroup`: "Quý" bọc Q1–Q4, "Tháng" bọc T1–T12 — giống hai
  tab kia.
- **Không ghim cột** (xem lý do ở spec `2026-08-20-ke-hoach-tabs-design.md` §7).
  Bảng cuộn ngang bình thường.

### Bảng

antd `Table` dạng cây (`expandable` + `children`), mặc định **đóng hết**: mở trang chỉ
thấy 13 dòng mục La Mã cộng 3 dòng khác.

Dòng mục La Mã in đậm, nền nhạt. Số âm hiện trong ngoặc, màu đỏ — dùng lại đúng
`formatNumber` / `formatPercent` của `fe/src/pages/bao-cao/kqkd/components/KqkdTable.tsx`.
Số 0 hiện `-`.

### Thanh header

`KeHoachTabsPage.tsx` thêm ô **Phiên bản** bên cạnh ô **Năm**, **chỉ hiện khi tab đang
là `kqkd`**. Mặc định "Tất cả phiên bản". Danh sách lấy từ
`GET /voucher/ke-hoach/phien-ban?loaiKeHoach=KE_HOACH` (đã có sẵn).

Gộp nhiều phiên bản kế hoạch vào một bảng là cộng trùng, nên ô này cần thiết. Mặc định
vẫn để "Tất cả" cho khớp với tab Chi tiết — tab đó cũng mặc định không lọc phiên bản.

Đổi `nam` hoặc `phienBan` thì gọi lại `init`.

## 7. Kiểm thử

Viết kiểm thử trước phần cài đặt tương ứng.

`be/libs/core/src/utils/kqkd-chi-tieu.spec.ts`
- mỗi chỉ tiêu gốc cộng đúng prefix, đúng bên Nợ/Có
- tài khoản con (`5111`, `6321`) tính vào tài khoản cha
- `8211` và `8212` không lẫn nhau
- một bút toán khớp cả hai bên rơi vào cả hai chỉ tiêu
- bảy công thức dẫn xuất (10, 20, 30, 40, 50, 60, tổng chi phí)
- dòng thiếu `maTaiKhoanNo` / `maTaiKhoanCo` không làm văng lỗi

`be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.spec.ts`
- gom đúng vào tháng theo `ngay` UTC; dòng ngày 01/03 nằm ở T3, không phải T2
- cây nhóm sản phẩm dưới I / II / III / IV; LN gộp nhóm = DT − giảm trừ − giá vốn
- cây hai cấp nhóm khoản mục → khoản mục dưới VII / VIII
- sản phẩm không có nhóm → "Chưa phân nhóm"; dòng không có sản phẩm →
  "Không phân bổ sản phẩm"; hai rổ này xếp cuối
- `khoanMuc.nhom` khớp được cả khi giá trị là mã và khi là id
- danh mục rỗng (gọi master-data hỏng) → số ở mục La Mã vẫn đúng
- hai sản phẩm trùng TÊN khác MÃ ở hai nhóm khác nhau không bị gộp làm một

`be/apps/voucher-service/src/ke-hoach/ke-hoach.service.spec.ts` (thêm vào file có sẵn)
- `getKqkd` lọc đúng `nam`, `loaiKeHoach`, `phienBan`, `tenantId`

`fe/src/pages/ke-hoach/tabs/kqkd/lib/kqkdKeHoachRows.test.ts`
- quý = tổng đúng 3 tháng; 6T đầu = T1–T6; năm = T1–T12
- `%` chia cho doanh thu thuần năm; mẫu số 0 thì trả `null`, không `Infinity`
- dòng có `thang` ngắn hơn 12 phần tử coi như 0, không văng lỗi

Kiểm thử chạy hẹp theo service — `yarn test` toàn bộ BE đang đỏ sẵn 13 suite từ trước.
