# Thiết kế: Import Excel cho Bảng kê thuế mua vào / bán ra

**Ngày:** 2026-07-10
**Trạng thái:** Đã duyệt thiết kế
**Phạm vi:** Trang `/thue/bang-ke-mua-vao` và `/thue/bang-ke-ban-ra` — thêm nút "Import Excel" và "Tải file mẫu", tương tự Nhật ký chung.

## 1. Bối cảnh

Bảng kê mua vào / bán ra hiện chỉ nhập tay từng hóa đơn qua modal (`fe/src/pages/thue/components/BangKePage.tsx`). Kế toán cần nhập hàng loạt hóa đơn đầu vào/đầu ra mỗi kỳ kê khai.

Nhật ký chung đã có sẵn luồng import Excel hoàn chỉnh (`fe/src/pages/chung-tu/nhat-ky-chung/import/`): tải template `.xlsx` sinh bằng `exceljs`, parse → validate → bảng xem trước tô đỏ lỗi → chặn import nếu còn lỗi. Bảng kê đơn giản hơn nhiều vì **không có danh mục nào phải khớp mã**.

## 2. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Nguồn file | **Chỉ template của hệ thống** (không đọc file xuất từ cổng HĐĐT) |
| Tiền thuế | **Không có cột trong file** — BE tự tính `giaTriChuaThue × thueSuat`, giống nhập tay |
| Hóa đơn trùng | **Cảnh báo vàng, vẫn cho import** |
| Kiến trúc FE | **React thuần + hooks**, một modal dùng chung cho cả 2 biến thể qua prop `variant` |
| Xử lý lỗi | **Xem trước + chặn import nếu còn dòng lỗi** (giống NKC) |

## 3. Hiện trạng (tham chiếu code)

- **Entity** `BangKeMuaVao` / `BangKeBanRa` (`be/libs/entities/src/tax/`): mỗi bản ghi là 1 hóa đơn. Khác nhau duy nhất ở cặp trường đối tác: `tenNguoiBan`/`mstNguoiBan` vs `tenNguoiMua`/`mstNguoiMua`.
- **Service** (`be/apps/tax-service/src/bang-ke-*/`): `create()` gọi `applyTotals()` → `tienThue = tinhTienThue(gia, suat)`, `tongThanhToan = gia + tienThue`. `tenantId` được `TenantSubscriber` (`be/libs/database/src/tenant.subscriber.ts`) tự gắn ở `beforeInsert`, nên `repo.save(mảng)` vẫn đúng tenant.
- **Gateway**: proxy theo prefix (`{ pathPrefix: '/tax', service: 'tax', stripPrefix: true }`) — thêm route mới **không cần sửa gateway**.
- **FE service**: `bangKeMuaVaoService` / `bangKeBanRaService` (`fe/src/services/taxService.ts`) extends `ServiceBase`.
- **FE page**: `BangKePage.tsx` nhận `variant: "mua" | "ban"`, `service`, `routeKey`, `title`; quyền qua `usePagePermission(routeKey)`.

## 4. Luồng tổng quan

```
[Trang Bảng kê] → Nút "Import Excel" (cạnh "Thêm hóa đơn", chỉ khi canCreate)
  1. "Tải file mẫu"   → .xlsx đúng biến thể (mua vào / bán ra)
  2. "Chọn file Excel" → FE đọc bằng exceljs
  3. FE validate từng dòng + POST check-duplicates
  4. Bảng XEM TRƯỚC: ô lỗi tô đỏ, dòng trùng tô vàng
     Tổng kết "X hợp lệ / Y lỗi / Z cảnh báo"
  5. Còn lỗi → khóa nút Import.  Sạch → "Import N hóa đơn"
  6. POST /tax/bang-ke-{mua-vao|ban-ra}/import
  7. Đóng modal, reload bảng, thông báo
```

## 5. Cấu trúc file Excel mẫu

Sheet chính (`BangKeMuaVao` / `BangKeBanRa`) + sheet phụ `DM_ThueSuat` để gắn dropdown cho cột Thuế suất.

| # | Cột | Key | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| 1 | Ngày hóa đơn | `ngayHoaDon` | ✳ | `DD/MM/YYYY` |
| 2 | Số hóa đơn | `soHoaDon` | ✳ | |
| 3 | Ký hiệu | `kyHieuHoaDon` | | VD `1C25TAA` |
| 4 | Tên người bán / Tên người mua | `tenNguoiBan` / `tenNguoiMua` | ✳ | tiêu đề + key đổi theo `variant` |
| 5 | MST người bán / MST người mua | `mstNguoiBan` / `mstNguoiMua` | | |
| 6 | Tên hàng hóa / dịch vụ | `tenHangHoa` | | |
| 7 | Giá trị chưa thuế | `giaTriChuaThue` | ✳ | số ≥ 0, chấp nhận `10,000,000` |
| 8 | Thuế suất | `thueSuat` | ✳ | dropdown |
| 9 | Ghi chú | `ghiChu` | | |

Sheet `DM_ThueSuat`, cột A dạng `"Mã - Tên"` (khớp `extractCode` của NKC):

```
0 - 0%
5 - 5%
8 - 8%
10 - 10%
KCT - Không chịu thuế
KKKT - Không kê khai/khấu trừ
```

Dropdown áp cho cột Thuế suất, hàng 2 → 501 (`MAX_DATA_ROWS = 500`), `allowBlank: true` — giống `template.ts` của NKC.

Template có 1 dòng ví dụ minh họa.

**Không có** cột Tiền thuế / Tổng thanh toán — BE tính.

## 6. Frontend

```
fe/src/utils/excel-import/           # MỚI — tách từ NKC, dùng chung
├── normalize.ts                     # parse số (dấu phẩy), parse ngày (DD/MM/YYYY + serial Excel)
├── extractCode.ts                   # "10 - 10%" → "10"
└── index.ts

fe/src/pages/thue/components/import/ # MỚI
├── ImportBangKeModal.tsx            # modal, props: { open, onClose, onImported, variant, service }
├── components/
│   ├── UploadStep.tsx               # nút tải mẫu + chọn file
│   └── PreviewTable.tsx             # bảng xem trước, tô đỏ lỗi / vàng cảnh báo
└── lib/
    ├── columns.ts                   # buildColumns(variant) → ImportColumn[]
    ├── parseRows.ts                 # File → rows thô
    ├── validate.ts                  # rows → { items, errors, warnings }
    ├── template.ts                  # buildTemplateWorkbook(variant) + downloadTemplate(variant)
    └── duplicates.ts                # khóa trùng + phát hiện trùng trong file
```

### Refactor kèm theo

`normalize.ts` và `extractCode.ts` hiện nằm trong `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/`, là code thuần không dính domain. Chuyển lên `fe/src/utils/excel-import/`, cập nhật import của NKC (kể cả các file test hiện có). Không copy code.

### State của modal (useState, không CHanlder)

`fileName`, `parsing`, `submitting`, `rows`, `errors`, `warnings`, `validItems`, `duplicateKeys`.

Nút Import bật khi: `parsed && errors.length === 0 && validItems.length > 0`.

### Wiring vào trang

`BangKePage.tsx` thêm state `importOpen` + nút trong `FilterBar.actions` (bọc `canCreate`), render `<ImportBangKeModal variant={variant} service={service} onImported={() => fetchData(...)} />`.

## 7. Quy tắc validate (FE)

| Kiểm tra | Kết quả |
|---|---|
| Cột 1, 2, 4, 7, 8 trống | 🔴 Lỗi |
| Ngày không parse được (`DD/MM/YYYY` hoặc serial Excel) | 🔴 Lỗi |
| Giá trị chưa thuế không phải số, hoặc < 0 | 🔴 Lỗi |
| Thuế suất không thuộc `0/5/8/10/KCT/KKKT` | 🔴 Lỗi |
| MST có điền nhưng không phải 10 hoặc 13 chữ số | 🟡 Cảnh báo |
| Hóa đơn đã tồn tại trên hệ thống | 🟡 Cảnh báo |
| Hóa đơn trùng với dòng khác trong cùng file | 🟡 Cảnh báo |
| Dòng trống hoàn toàn | Bỏ qua, không tính lỗi |
| File > 1000 dòng | 🟡 Cảnh báo mềm |

Mỗi lỗi hiển thị **số dòng Excel + tên cột + lý do**. MST chuẩn hóa: bỏ dấu `-` và khoảng trắng trước khi đếm chữ số (chấp nhận `0101243150-001`).

### Khóa trùng

```
key = [soHoaDon, kyHieuHoaDon ?? "", mst ?? ""]
        .map(s => s.trim().toUpperCase()).join("|")
```
`mst` = `mstNguoiBan` (mua) hoặc `mstNguoiMua` (bán). Trùng trong file phát hiện ở FE, trùng với DB qua API.

## 8. Backend (`tax-service`)

Áp dụng đối xứng cho **cả hai** module `bang-ke-mua-vao` và `bang-ke-ban-ra`.

### DTO mới (`dto/import-bang-ke-*.dto.ts`)

```ts
export class ImportBangKeMuaVaoDto {
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true })
  @Type(() => CreateBangKeMuaVaoDto)
  items: CreateBangKeMuaVaoDto[];
}

export class DuplicateKeyDto {
  @IsString() @IsNotEmpty() soHoaDon: string;
  @IsString() @IsOptional() kyHieuHoaDon?: string;
  @IsString() @IsOptional() mst?: string;
}

export class CheckDuplicatesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => DuplicateKeyDto)
  keys: DuplicateKeyDto[];
}
```

### Route mới

| Method | Path | Quyền |
|---|---|---|
| `POST` | `/bang-ke-mua-vao/import` | `ADMIN`, `KE_TOAN_TRUONG`, `KE_TOAN_TONG_HOP`, `KE_TOAN_QUY` (= quyền tạo) |
| `POST` | `/bang-ke-mua-vao/check-duplicates` | `KE_TOAN_ROLES` (= quyền đọc) |

Tương tự cho `/bang-ke-ban-ra`. Gateway không đổi.

### Service

```ts
async importMany(items: CreateBangKeMuaVaoDto[]): Promise<{ created: number }> {
  const entities = items.map((dto) => {
    const e = this.repo.create({ ...dto, ngayHoaDon: new Date(dto.ngayHoaDon), isActive: true });
    this.applyTotals(e, dto);   // đúng hàm CRUD dùng → tiền thuế y hệt nhập tay
    return e;
  });
  const saved = await this.repo.save(entities);   // TenantSubscriber gắn tenantId từng entity
  return { created: saved.length };
}

async checkDuplicates(keys: DuplicateKeyDto[]): Promise<string[]> // trả về mảng key đã tồn tại
```

`checkDuplicates` lấy các bản ghi `isActive !== false` trong tenant, dựng cùng công thức khóa như FE (mục 7), trả về các khóa giao nhau.

Response controller theo chuẩn hiện có: `{ success: true, data: ... }`.

## 9. Biên & lỗi

- File rỗng / chỉ có header → thông báo "File không có dòng dữ liệu".
- Header không khớp template → báo lỗi rõ ràng, không import.
- Ô số tiền có dấu phẩy ngăn cách nghìn → chuẩn hóa khi parse.
- Ngày dạng serial number của Excel → `normalize.ts` xử lý.
- `giaTriChuaThue = 0` là hợp lệ (hóa đơn giá trị 0), chỉ số âm mới lỗi.
- Thuế suất `KCT` / `KKKT` → `tienThue = 0` (đã đúng theo `tinhTienThue`).
- File > 1000 dòng → cảnh báo mềm, vẫn cho import.

## 10. Testing

**BE (unit, `*.spec.ts` cạnh service):**
- `importMany` lưu đủ N bản ghi, mỗi bản ghi có `tienThue` / `tongThanhToan` tính đúng theo thuế suất riêng của nó (gồm cả `KCT`).
- `importMany` set `isActive: true` và `ngayHoaDon` là `Date`.
- `checkDuplicates` khớp không phân biệt hoa/thường và khoảng trắng thừa; bỏ qua bản ghi `isActive === false`; chỉ trong phạm vi tenant.

**FE (TDD, vitest):**
- `validate`: phủ hết bảng mục 7 (lỗi vs cảnh báo tách bạch).
- `parseRows`: số có dấu phẩy, ngày serial Excel, bỏ dòng trống, header sai.
- `template`: `buildTemplateWorkbook("mua"|"ban")` có đúng 9 header đúng biến thể, sheet `DM_ThueSuat` 6 dòng, dropdown gắn đúng cột.
- `duplicates`: dựng khóa và phát hiện trùng trong file.
- `normalize` / `extractCode`: test hiện có của NKC chạy nguyên vẹn sau khi chuyển thư mục.

## 11. Ngoài phạm vi (YAGNI)

- Đọc file xuất từ cổng hóa đơn điện tử (hoadondientu.gdt.gov.vn).
- Ghi đè / cập nhật hóa đơn trùng khi import.
- Import bất đồng bộ, job nền cho file cực lớn.
- Cột `chungTuId` / `soChungTu` (liên kết chứng từ) trong template.
