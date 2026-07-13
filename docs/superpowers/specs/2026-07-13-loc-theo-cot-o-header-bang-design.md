# Lọc theo cột ở header bảng + cố định cột

Ngày: 2026-07-13

## Mục tiêu

Người dùng lọc dữ liệu ngay tại header từng cột (popover: cố định cột, chọn điều kiện,
nhập giá trị, Lọc / Bỏ lọc) — thay vì phải dùng thanh lọc riêng phía trên bảng.

Làm dùng chung để gắn được vào nhiều bảng; áp dụng đầu tiên cho **Bảng tổng hợp công nợ**
(`/bao-cao/bang-tong-hop`), sau đó nhân rộng dần.

## Phạm vi

- Cột **chữ** lọc được với 4 toán tử: Chứa, Không chứa, Bằng, Bắt đầu bằng.
  So khớp không phân biệt hoa thường và **bỏ dấu tiếng Việt** (`cong ty` khớp `CÔNG TY`).
- Cột **số tiền**: không gắn lọc (YAGNI — thực tế không ai lọc số dư theo khoảng).
- **Cố định cột** (ghim trái) nằm trong cùng popover.
- Ghi nhớ: chỉ cột ghim được lưu localStorage; bộ lọc reset khi rời trang.

Không làm: lọc phía server, lọc cột số, lọc nhiều điều kiện trên cùng một cột.

## Kiến trúc

Toàn bộ app dùng antd Table. Mượn `filterDropdown` + `filterIcon` của antd để vẽ popover ở
header, và `fixed: 'left'` cho cột ghim. **Không** dùng cơ chế `onFilter` của antd: nó lọc trên
từng dòng đã dàn phẳng, nên không tính lại được số tổng của dòng nhóm. Việc lọc dữ liệu do
trang tự làm trên dữ liệu gốc.

### Phần dùng chung — `fe/src/components/table/`

| File | Vai trò |
|---|---|
| `columnFilter.ts` | Logic thuần: kiểu `ColumnFilter { op, value }`, `matchText(raw, filter)`, `isActiveFilter`. Bỏ dấu + hạ hoa thường trước khi so khớp. Giá trị rỗng = không lọc. |
| `tableStorage.ts` | Tách từ `columnVisibility.ts`: khóa localStorage tách theo công ty (`{prefix}:{tenantId}:{pageKey}`). Dùng chung cho cột ẩn/hiện và cột ghim. |
| `columnPin.ts` | Đọc/ghi cột ghim (`tblpin:`), trả `string[]`. |
| `ColumnFilterDropdown.tsx` | Popover: "Cố định cột này" / "Bỏ cố định cột", Select toán tử, Input giá trị, nút Bỏ lọc + Lọc. |
| `useTableColumnFilters.tsx` | Hook: nhận `pageKey`, giữ state bộ lọc + cột ghim; trả `filters`, `decorate(col)` (gắn `filterDropdown`, `filterIcon` tô xanh khi đang lọc, `fixed` theo ghim). |

### Áp vào Bảng tổng hợp công nợ

Dữ liệu: `data.accounts[].doiTuongs[]` + `data.totals`.

1. Lọc chạy trên dữ liệu gốc, **trước** khi dàn phẳng thành `FlatRow[]`.
2. Trong mỗi tài khoản, giữ đối tượng khớp toàn bộ bộ lọc đang bật (Mã ĐT, Tên đối tượng).
3. Tài khoản không còn đối tượng nào → bỏ khỏi bảng.
4. Số của dòng tài khoản và dòng TỔNG CỘNG được **cộng lại** từ các đối tượng còn lại
   (giống AutoFilter + SUBTOTAL của Excel).
5. Khi không có bộ lọc nào đang bật → giữ nguyên số backend trả về (tránh lệch do làm tròn).
6. Lọc mà không còn dòng nào → bảng rỗng (ẩn luôn dòng TỔNG CỘNG toàn số 0).
7. **Xuất Excel** dùng dữ liệu đã lọc, để file tải về khớp với cái đang xem.
8. Cột ghim → `fixed: 'left'`; cần `scroll.x` để cột ghim có tác dụng khi cuộn ngang.

## Kiểm thử (vitest)

- `columnFilter.test.ts`: 4 toán tử; bỏ dấu + không phân biệt hoa thường; giá trị rỗng =
  không lọc; giá trị nguồn rỗng/undefined.
- `columnPin.test.ts`: lưu/đọc theo công ty, dữ liệu hỏng → mảng rỗng.
- `congNoFilter.test.ts` (trang): lọc còn 1 đối tượng → dòng TK và TỔNG CỘNG bằng đúng đối
  tượng đó; không lọc → giữ số gốc; lọc không khớp gì → mảng rỗng.
