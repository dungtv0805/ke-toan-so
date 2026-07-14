# Lọc cột số ở header bảng

Mở rộng bộ lọc theo cột đã làm ở `2026-07-13-loc-theo-cot-o-header-bang-design.md`: cột chữ đã lọc được, nay thêm cột số với các toán tử so sánh kiểu Excel.

## Phạm vi

Nhóm báo cáo tài chính — 11 bảng/tab:

| Bảng / tab | Cột số bật lọc |
|---|---|
| Sổ cái – Tổng hợp theo TK | `soDuDauKyNo`, `soDuDauKyCo`, `phatSinhNo`, `phatSinhCo`, `soDuCuoiKyNo`, `soDuCuoiKyCo` |
| Sổ cái – Chi tiết TK | `phatSinhNo`, `phatSinhCo`, `soDuNo`, `soDuCo` |
| Sổ cái – Cân đối phát sinh | 6 cột dưới 3 header gộp (đầu kỳ / phát sinh / cuối kỳ × Nợ/Có) |
| Bảng cân đối kế toán | `dauNam`, `cuoiKy`, `chenhLech` (cột tính) |
| Sổ chi tiết tài khoản | `phatSinhNo`, `phatSinhCo`, `soDuNo`, `soDuCo` |
| Bảng tổng hợp công nợ | `dk-pt`, `dk-ptr`, `ps-pt`, `ps-ptr`, `ck-pt`, `ck-ptr` |
| Báo cáo hợp đồng | `soLuong`, `giaTri`, `quyetToan`, `thuTien`, `chuaCoHD`, `hdChuaKy`, `hdPhotoScan`, `hdGoc`, `giaTriBinhQuan` |
| Công nợ phải thu/trả – Chi tiết | `soTienGoc`, `daThu`, `conLai` (mỗi bảng) |
| Công nợ phải thu/trả – Tổng hợp | `soHoaDon`, `tongNo`, `daThu`/`daTra`, `conLai`, `quaHan`, `tyLeThu`/`tyLeTra` (cột tính) |

Ngoài phạm vi: các bảng còn lại trong 30 bảng đã có lọc chữ (mở rộng sau), cột ngày (chưa làm), bảng phân trang từ server.

## Mô hình dữ liệu

`ColumnFilter` thành union phân biệt bằng `kind`:

```ts
type TextOp   = 'contains' | 'notContains' | 'equals' | 'startsWith';
type NumberOp = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'blank' | 'notBlank';

type ColumnFilter =
  | { kind: 'text';   op: TextOp;   value: string }
  | { kind: 'number'; op: NumberOp; value: string };
```

`value` luôn là chuỗi thô người dùng gõ; parse sang số lúc so khớp.

`getValue(row, key)` nới kiểu trả về: `string | number | null | undefined`. `matchAllFilters` dispatch theo `kind` → `matchText` (giữ nguyên) hoặc `matchNumber` (mới). Các trang không đổi cách gọi, chỉ trả thêm số cho key cột số.

`isActiveFilter` đổi: filter số với op `blank`/`notBlank` là **đang bật** dù `value` rỗng; op so sánh chỉ bật khi `value` parse ra số hợp lệ.

## Quy tắc so khớp số

- **(Trống)** = ô không có số (`null`/`undefined`/không parse được) **hoặc bằng 0**. **(Không trống)** = có số khác 0. Lý do: trong kế toán ô 0 hiển thị trắng và mang nghĩa "không phát sinh".
- 6 toán tử so sánh (`=`, `≠`, `<`, `≤`, `>`, `≥`): ô không có số **không khớp** (như Excel). Ô bằng `0` là số 0 thật, so sánh bình thường (`0 < 100` → khớp).
- `eq`/`ne` so với sai số `EPS = 0.005` để không lệch vì cộng dồn số thực; `lte`/`gte` nới biên thêm `EPS`.

## Parse giá trị nhập

`parseFilterNumber(input): number | null` — bỏ khoảng trắng rồi thử lần lượt:

1. `-?\d{1,3}(\.\d{3})+(,\d+)?` — kiểu VN: `1.230.000`, `1.230,5`
2. `-?\d{1,3}(,\d{3})+(\.\d+)?` — kiểu EN: `1,230,000`
3. `-?\d+(,\d+)?` — `,` là dấu thập phân: `1500,5`
4. `-?\d+(\.\d+)?` — số thuần: `1230000`, `1500.5`
5. Không khớp → `null` (không hợp lệ)

Cho phép số âm và số lẻ. Không tự chèn dấu phân cách khi gõ.

## Giao diện

`filterable(col, opts?)` thêm tham số thứ hai:

```ts
filterable(col, { type: 'number', filterTitle: 'Phát sinh Nợ' })
```

- `type: 'number'` → popover hiện 8 toán tử số, mặc định **Bằng**.
- `filterTitle` ghi đè nhãn "Lọc …". Bắt buộc cho các cột **trùng tiêu đề**: Sổ chi tiết TK có 4 cột tên "Nợ"/"Có" dưới 2 header gộp; Bảng tổng hợp công nợ có 3 cặp "Phải thu"/"Phải trả"; Sổ cái – Cân đối PS có 3 cặp "Nợ"/"Có".

`ColumnFilterDropdown`:
- Chọn (Trống)/(Không trống) → ẩn ô nhập.
- Gõ giá trị không parse được → viền đỏ + "Giá trị không hợp lệ", nút **Lọc** vô hiệu.
- Phần "Cố định cột này" giữ nguyên.

## Sửa kèm ở trang

- **Báo cáo hợp đồng**: 8 cột số thiếu `key` → thêm `key` (bắt buộc để bọc `filterable`).
- **Bảng tổng hợp công nợ**: cột số không có `dataIndex`, giá trị lồng trong `val.{dauKy|phatSinh|cuoiKy}.{phaiThu|phaiTra}` → `getValue` trong `congNoFilter.ts` map key → giá trị lồng.
- **Bảng cân đối KT**: `chenhLech` là cột tính → `getValue` trả `cuoiKy - dauNam`.
- **Công nợ phải thu/trả – Tổng hợp**: `tyLeThu`/`tyLeTra` là cột tính (Progress) → `getValue` trả số phần trăm đang hiển thị (gõ `80` = 80%).
- **Công nợ phải thu/trả**: chưa có file `*Filter.ts`, getter viết inline trong page → bổ sung key số vào `getChiTietValue` / `getTongHopValue` tại chỗ.

## Dòng tổng, dòng nhóm

Không đổi cơ chế hôm qua: mỗi trang lọc trên dữ liệu gốc rồi cộng lại tổng theo dòng còn hiện (`filterSoCaiChiTiet`, `filterBangCanDoi`, `sumRows`, `sumHopDong`, `recalc`, hoặc `Table.Summary` cộng từ `pageData`). Lọc số chỉ thay đổi tập dòng đầu vào nên tổng tự khớp. Xuất Excel vẫn xuất theo dữ liệu đã lọc.

## Kiểm thử

- `columnFilter.test.ts`: `parseFilterNumber` (4 định dạng + chuỗi rác + số âm/lẻ), `matchNumber` (6 toán tử, biên 0 và ô rỗng, sai số EPS), `isActiveFilter` với `blank`/`notBlank`.
- Bổ sung case lọc số vào test lọc sẵn có của từng trang: `soCaiFilter.test.ts`, `bangCanDoiFilter.test.ts`, `congNoFilter.test.ts`, `hopDongFilter.test.ts`, `soChiTietFilter.test.ts` — trọng tâm: tổng được cộng lại đúng theo dòng còn hiện.
- `columnFilterDropdown.render.test.tsx`: cột số hiện 8 toán tử; chọn (Trống) thì ẩn ô nhập; gõ chữ thì nút Lọc vô hiệu.
