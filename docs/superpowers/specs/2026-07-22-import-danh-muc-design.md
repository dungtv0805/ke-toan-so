# Import Excel cho toàn bộ Danh mục

Ngày: 2026-07-22

## Mục tiêu

Thêm chức năng import Excel cho **22 trang Danh mục** (gồm cả nhóm "Khác" trong sidebar),
với trải nghiệm giống hệt import Nhật ký chung đang có: bấm "Import Excel" → modal Upload
file → bảng preview highlight dòng lỗi → nút "Import N bản ghi".

Không dùng 22 bản sao code. Viết **một** module import dùng chung, mỗi danh mục chỉ khai
báo một file config nhỏ.

## Phạm vi

### Trong phạm vi — 22 danh mục

Nhóm chính (12):

| Danh mục | Route | Service | Resource | Trường tham chiếu |
|---|---|---|---|---|
| Tài khoản | `/danh-muc/tai-khoan` | `taiKhoanService` | `tai-khoan` | TK cha (tự tham chiếu, theo `ma`) |
| Đối tượng | `/danh-muc/doi-tuong` | `doiTuongService` | `doi-tuong` | — |
| Dự án | `/danh-muc/du-an` | `duAnService` | `du-an` | Chủ đầu tư |
| Sản phẩm | `/danh-muc/san-pham` | `sanPhamService` | `san-pham` | — |
| Hợp đồng | `/danh-muc/hop-dong` | `hopDongService` | `hop-dong` | Đối tượng |
| Bộ phận | `/danh-muc/bo-phan` | `boPhanService` | `bo-phan` | — |
| Khoản mục | `/danh-muc/khoan-muc` | `khoanMucService` | `khoan-muc` | Nhóm khoản mục |
| Kho | `/danh-muc/kho` | `khoService` | `kho` | — |
| Hàng hóa vật tư | `/danh-muc/hang-hoa-vat-tu` | `hangHoaVatTuService` | `hang-hoa-vat-tu` | Đơn vị tính, Nhóm vật tư |
| Đơn vị tính | `/danh-muc/don-vi-tinh` | `donViTinhService` | `don-vi-tinh` | — |
| Lý do không hợp lệ | `/danh-muc/ly-do-khong-hop-le` | `lyDoKhongHopLeService` | `ly-do-khong-hop-le` | — |
| Nhóm vật tư | `/danh-muc/nhom-vat-tu` | `nhomVatTuService` | `nhom-vat-tu` | — |

Nhóm "Khác" (10):

| Danh mục | Route | Service | Resource | Trường tham chiếu |
|---|---|---|---|---|
| Chủ đầu tư | `/danh-muc/chu-dau-tu` | `chuDauTuService` | `chu-dau-tu` | — |
| Nhóm khoản mục | `/danh-muc/nhom-khoan-muc` | `nhomKhoanMucService` | `nhom-khoan-muc` | — |
| Ngân hàng & Quỹ | `/danh-muc/ngan-hang` | `nganHangService` | `ngan-hang` | — |
| Dòng tiền | `/danh-muc/dong-tien` | `dongTienService` | `dong-tien` | — |
| Nhóm khuyến mại | `/danh-muc/nhom-khuyen-mai` | `nhomKhuyenMaiService` | `nhom-khuyen-mai` | — |
| Nhóm quản lý | `/danh-muc/nhom-quan-ly` | `nhomQuanLyService` | `nhom-quan-ly` | — |
| Loại chứng từ | `/danh-muc/loai-chung-tu` | `loaiChungTuService` | `loai-chung-tu` | — |
| Loại giao dịch | `/danh-muc/loai-giao-dich` | `loaiGiaoDichService` | `loai-giao-dich` | Loại chứng từ |
| Hồ sơ chứng từ | `/danh-muc/ho-so-chung-tu` | `hoSoChungTuService` | `ho-so-chung-tu` | — |
| Quy chuẩn hạch toán | `/danh-muc/quy-chuan` | `quyChaunService` | `quy-chuan` (config-service) | Tài khoản, Loại chứng từ, Loại giao dịch, Hồ sơ chứng từ |

Cột chính xác của từng config lấy từ form Thêm/Sửa hiện có của chính trang đó — không
tự nghĩ ra trường mới.

### Ngoài phạm vi

- **Số dư đầu kỳ** (`/danh-muc/so-du-dau-ky`): không phải danh mục phẳng mà là cây Tài
  khoản → chi tiết Đối tượng/Ngân hàng với Dư Nợ / Dư Có. Người dùng đã chốt là không cần
  import.
- **Nút "Xuất Excel"** hiện đang là nút chết (không có `onClick`) trên các trang danh mục.
  Không sửa trong đợt này.
- Không thêm quyền mới. Nút Import gate bằng `canCreate` (`<route>:them`), giống nút
  "Import Excel" của Nhật ký chung (`EntryListTab.tsx:948`). Không phải deploy config-service
  vì lý do phân quyền, cũng không phải grant quyền lại sau deploy.

## Kiến trúc Frontend

Module dùng chung đặt ở `fe/src/components/import-danh-muc/`, viết đúng pattern CHanlder
như `fe/src/pages/chung-tu/nhat-ky-chung/import/`:

```
fe/src/components/import-danh-muc/
├── ImportDanhMucModal.tsx        # Modal: UploadStep + PreviewTable + footer
├── ImportHandlerContext.tsx      # Provider + hooks
├── import.handler.ts             # ImportEvents
├── import.state.ts               # ImportStates
├── types.ts                      # ImportDanhMucConfig, ImportColumn, RefSpec
├── components/
│   ├── UploadStep.tsx            # chọn file + link "Tải file mẫu"
│   └── PreviewTable.tsx          # bảng preview, tô đỏ dòng lỗi, cột "Lỗi"
├── lib/
│   ├── parseRows.ts              # đọc sheet → mảng object theo config.columns
│   ├── resolveRefs.ts            # map mã → id cho các cột có `ref`
│   ├── validate.ts               # 4 bước kiểm tra (xem dưới)
│   └── template.ts               # sinh file mẫu .xlsx từ config
├── sub-handler/
│   ├── index.ts
│   ├── load-refs/                # nạp dữ liệu tham chiếu + danh sách hiện có
│   ├── parse/                    # đọc file → validate → đổ vào state
│   └── submit/                   # gọi API import, báo kết quả
└── configs/
    ├── index.ts                  # map resource → config
    ├── donViTinh.config.ts
    └── ... (22 file)
```

### Kiểu config

```ts
// types.ts
export interface RefSpec {
  service: { getAll(): Promise<any[]> };
  matchBy: string;          // trường dùng để dò, thường là "ma"
  label: string;            // tên hiển thị trong thông báo lỗi
}

export interface ImportColumn {
  key: string;              // tên trường trong DTO gửi lên BE
  header: string;           // tiêu đề cột trong file Excel
  required?: boolean;
  unique?: boolean;         // dùng cho kiểm tra trùng
  type?: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  enumValues?: { label: string; value: string }[];
  ref?: RefSpec;            // cột tham chiếu danh mục khác
  example?: string;         // giá trị mẫu trong file template
}

export interface ImportDanhMucConfig {
  title: string;            // "Đơn vị tính" — dùng cho tiêu đề modal & tên file mẫu
  resource: string;         // "don-vi-tinh" — đoạn cuối của URL import
  apiPrefix?: string;       // mặc định "/master-data"; quy-chuan dùng "/config"
  service: { getAll(): Promise<any[]> };
  columns: ImportColumn[];
}
```

Ví dụ config đầy đủ:

```ts
// configs/donViTinh.config.ts
export const donViTinhImportConfig: ImportDanhMucConfig = {
  title: 'Đơn vị tính',
  resource: 'don-vi-tinh',
  service: donViTinhService,
  columns: [
    { key: 'ma',     header: 'Mã đơn vị tính',  required: true, unique: true, example: 'DVT01' },
    { key: 'ten',    header: 'Tên đơn vị tính', required: true, example: 'Cái' },
    { key: 'ghiChu', header: 'Ghi chú' },
  ],
};

// configs/duAn.config.ts — có cột tham chiếu
export const duAnImportConfig: ImportDanhMucConfig = {
  title: 'Dự án',
  resource: 'du-an',
  service: duAnService,
  columns: [
    { key: 'ma',  header: 'Mã dự án',  required: true, unique: true, example: 'DA01' },
    { key: 'ten', header: 'Tên dự án', required: true, example: 'Dự án A' },
    {
      key: 'chuDauTuId', header: 'Mã chủ đầu tư', example: 'CDT01',
      ref: { service: chuDauTuService, matchBy: 'ma', label: 'Chủ đầu tư' },
    },
  ],
};
```

### Luồng trong modal

1. Modal mở → sự kiện `loadRefs`: gọi song song `config.service.getAll()` (lấy danh sách
   hiện có để dò trùng) và `getAll()` của từng `ref.service` (dò mã tham chiếu). Kết quả
   giữ trong state của handler.
2. Người dùng chọn file → sự kiện `parseFile`: đọc sheet đầu tiên bằng `xlsx`, map header
   → `column.key` theo `config.columns`, rồi chạy validate.
3. `PreviewTable` hiển thị **mọi** dòng. Dòng lỗi tô đỏ, cột cuối "Lỗi" liệt kê lý do.
4. Còn dòng lỗi → nút Import disable, kèm chữ "Còn N dòng lỗi, vui lòng sửa file".
5. Không lỗi → bấm Import → sự kiện `submitImport` gọi API bulk, hiện `message.success`,
   đóng modal, gọi `onImported` để trang cha refresh bảng.

### Quy tắc validate

Chạy toàn bộ ở FE lúc parse, gom tất cả lỗi của một dòng vào một mảng string:

1. **Thiếu trường bắt buộc** — cột có `required: true` mà ô rỗng → `"Thiếu <header>"`.
2. **Sai kiểu** — `number` không parse được, `date` không đúng `dd/MM/yyyy`, `enum` không
   nằm trong `enumValues` → `"<header> không hợp lệ"`.
3. **Mã tham chiếu không tồn tại** — cột có `ref`, ô có giá trị nhưng không dò ra bản ghi
   nào → `"<label> \"<giá trị>\" không tồn tại"`. Ô rỗng ở cột không `required` thì bỏ qua,
   không báo lỗi.
4. **Trùng mã** — hai chiều:
   - trùng với dòng khác trong chính file → `"Mã bị trùng trong file (dòng N)"`
   - trùng với dữ liệu đã có (so với kết quả `config.service.getAll()`, so sánh
     case-insensitive sau khi trim) → `"Mã đã tồn tại trong hệ thống"`

Người dùng đã chốt: dòng trùng **báo lỗi, không import** — không ghi đè, không skip im lặng.

### Tải file mẫu

`lib/template.ts` sinh file `.xlsx` từ `config` bằng `exceljs` (đúng thư viện Nhật ký chung
đang dùng cho template; bước parse thì dùng `xlsx`): hàng 1 là `column.header` đúng thứ tự
khai báo, hàng 2 là dòng ví dụ ghép từ `column.example`. Tên file
`Mau-import-<title>.xlsx`. Link đặt trong `UploadStep`, cạnh vùng chọn file — giống cách
Nhật ký chung đang làm.

### Gắn vào từng trang

Mỗi trang danh mục sửa ~8 dòng:

```tsx
const [importOpen, setImportOpen] = useState(false);

// trong FilterBar actions, đặt ngay trước nút "Xuất Excel":
{canCreate && (
  <Button icon={<FileExcelOutlined />} onClick={() => setImportOpen(true)}>
    Import Excel
  </Button>
)}

// cuối JSX:
<ImportDanhMucModal
  open={importOpen}
  config={donViTinhImportConfig}
  onClose={() => setImportOpen(false)}
  onImported={() => fetchData(1, pagination.pageSize, searchText)}
/>
```

Bốn trang dùng CHanlder riêng (Chủ đầu tư, Hợp đồng, Nhóm khuyến mại, Nhóm quản lý) khác
duy nhất ở chỗ `onImported` gọi `handler.executeEvent(...)` để nạp lại thay vì `fetchData`.

## Kiến trúc Backend

### master-data-service — một controller dùng chung

Thêm module `be/apps/master-data-service/src/import-danh-muc/`, **không sửa 22 controller
hiện có**:

```
POST /master-data/import/:resource
body: { items: Array<Record<string, unknown>> }
→ 200 { created: number, failed: Array<{ row: number; ma?: string; message: string }> }
```

`ImportDanhMucController` giữ một bảng đăng ký `resource → { service, dtoClass }`, inject
sẵn các service danh mục (các module tương ứng phải `exports` service của mình — thêm chỗ
nào còn thiếu). Với mỗi phần tử `items`:

1. `plainToInstance(dtoClass, item)` + `validate()` bằng class-validator — dùng đúng
   `CreateXxxDto` sẵn có của danh mục đó.
2. Gọi `service.create(dto)` trong `try/catch`.
3. Lỗi (kể cả `ConflictException` trùng mã) → đẩy vào `failed` kèm chỉ số dòng, các dòng
   sau vẫn chạy tiếp.

Cách này tái sử dụng nguyên logic check trùng, tenant scoping (`TenantContextService`) và
validate DTO đang chạy — không viết lại lần hai. Resource không có trong bảng đăng ký →
`404 Not Found`.

### config-service — endpoint tương ứng cho Quy chuẩn hạch toán

```
POST /config/import/quy-chuan
```

Cùng hình dạng request/response, chỉ đăng ký một resource. Viết theo đúng khuôn của
controller bên master-data.

### Gateway

Thêm route proxy cho `POST /master-data/import/:resource` và `POST /config/import/:resource`
theo đúng cách các route master-data / config hiện có đang khai báo.

### Phía FE gọi API

Thêm `importDanhMucService` mỏng: `import(config, items)` → POST tới
`${config.apiPrefix ?? '/master-data'}/import/${config.resource}`. Không nhét hàm import
vào 22 service riêng lẻ.

## Xử lý lỗi

- **Lỗi mức dòng** bắt hết ở FE trước khi gửi. BE vẫn kiểm tra lại (nguồn sự thật là DB) và
  trả `failed` — trường hợp này xảy ra khi có người khác vừa tạo trùng mã trong lúc người
  dùng đang mở modal.
- **Response có `failed` không rỗng** → modal không đóng, hiện `message.warning` dạng
  `"Đã import X/Y bản ghi, Z dòng lỗi"` và đổ lý do lỗi từ BE vào cột "Lỗi" của đúng dòng
  đó trong bảng preview.
- **Lỗi mạng / 5xx** → `message.error` với message thật từ backend, modal giữ nguyên dữ
  liệu đã parse để người dùng thử lại.
- **File sai định dạng / thiếu cột bắt buộc trong header** → báo ngay ở bước upload:
  `"File thiếu cột: <danh sách>"`, không sang bước preview.

## Test

- **Unit test cho `lib/` dùng chung** (`fe/src/components/import-danh-muc/lib/__tests__/`),
  theo mẫu test sẵn có ở `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/`:
  - `parseRows`: map header → key, bỏ dòng rỗng, trim giá trị
  - `resolveRefs`: dò ra id đúng, không dò ra thì báo lỗi, ô rỗng không bắt buộc thì bỏ qua
  - `validate`: đủ 4 nhóm lỗi ở trên, gồm cả trùng trong file lẫn trùng với dữ liệu có sẵn
  - `template`: sinh đúng header theo thứ tự config
- **Unit test cho `ImportDanhMucController`** phía BE: resource hợp lệ / không hợp lệ, dòng
  lỗi không chặn dòng sau, đếm `created` và `failed` đúng.
- Không viết test riêng cho 22 file config — chúng chỉ là dữ liệu khai báo.

## Deploy

Đợt này đụng cả FE lẫn BE:

- FE: build + deploy như thường lệ (verify ở `ketoan.masterceo.com.vn`).
- BE: deploy lại **master-data-service**, **config-service** và **gateway**.

Không cần grant quyền lại sau deploy vì không thêm permission key mới.
