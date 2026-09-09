# Kiểm kê màu cứng — `fe/src/pages`

File này là ĐẦU VÀO lẫn ĐẦU RA của Task 6 (đợt B — design token). Ai sửa màu trong
`fe/src/pages` thì đo lại bằng đúng các lệnh dưới và cập nhật bảng.

- **Ngày đo:** 09/09/2026
- **Nhánh:** `feat/dot-b-design-tokens`
- **Commit đo "SAU":** `2b46c21` — test(ui): ba ca test luôn xanh bất kể code
- **Commit đo "TRƯỚC":** `6361c33` — merge: đợt A (điểm rẽ nhánh của đợt B)

## Lệnh đo

Chạy từ `fe/`:

```bash
# 1. Số dòng có mã hex
grep -rn --include='*.ts' --include='*.tsx' -E '#[0-9a-fA-F]{3,8}' src/pages | wc -l

# 2. Như trên nhưng BỎ dòng chú thích (con số "thật sự là màu")
grep -rn --include='*.ts' --include='*.tsx' -E '#[0-9a-fA-F]{3,8}' src/pages \
  | grep -vE ':[0-9]+: *(//|\*|/\*)' | wc -l

# 3. borderRadius bằng số cứng
grep -rn --include='*.ts' --include='*.tsx' -E 'borderRadius: *[0-9]' src/pages | wc -l

# 4. Class Tailwind màu tuỳ ý
grep -rn --include='*.tsx' -E '(text|bg|border)-\[#' src/pages | wc -l

# 5. Màu preset của antd (KHÔNG nằm trong con số hex — xem cảnh báo cuối file)
grep -rn --include='*.tsx' -E 'color=(\{[^}]*\}|"[a-z-]+")' src/pages | wc -l
```

Đo trên một commit bất kỳ mà không cần checkout:

```bash
git grep -n -E '#[0-9a-fA-F]{3,8}' <commit> -- fe/src/pages | grep -E '\.(ts|tsx):' | wc -l
```

> Cạm bẫy: `\b` KHÔNG chạy trong `git grep -E` (thư viện regex khác GNU grep). Thêm `\b`
> vào biểu thức thì `git grep` trả về 6 thay vì 232 mà không báo lỗi gì. Bỏ `\b` đi.

## Con số

| Phép đo | TRƯỚC (`6361c33`) | SAU (`2b46c21`) |
|---|---|---|
| Dòng có mã hex trong `src/pages` | **232** | **96** |
| … không kể dòng chú thích | 232 | **89** |
| `borderRadius` bằng số cứng | **5** | **4** |
| Class Tailwind màu tuỳ ý (`text-[#…]`) | **1** | **1** |

Diễn biến của con số hex (không kể chú thích) qua các mốc:

| Mốc | Hex | Ghi chú |
|---|---|---|
| `6361c33` trước đợt B | 232 | |
| `5caa3c0` hết Task 6 | 58 | −174 (−75%) |
| `2b46c21` sau đợt sửa review | 89 | **+31**, xem mục dưới |

### Vì sao con số tăng lại 58 → 89

Không phải quy hồi. Review phát hiện một lỗi CRITICAL: `hsl(var(--token))` **không giải
được trong thuộc tính trình bày của SVG**. `var()` chỉ được thay ở computed-value time cho
khai báo CSS; trong presentation attribute (`<path stroke="…">` mà recharts sinh ra từ
`stroke=` / `fill=`) trình duyệt coi giá trị là không hợp lệ và bỏ qua — đường, cột và lát
cắt donut KHÔNG vẽ ra. Nhãn số đi qua `style={{ fill }}` vẫn chạy nên biểu đồ méo một nửa.

31 mã hex được trả lại là các hằng số màu đi vào thuộc tính SVG (13 file biểu đồ), mỗi mã
kèm chú thích ghi rõ nó tương đương token nào và vì sao bắt buộc là hex. Token trong
`style={{}}` và trong `className` giữ nguyên — ở đó `var()` chạy bình thường.

## Các nhóm màu CỐ Ý GIỮ hex

| # | Nhóm | File | Lý do |
|---|---|---|---|
| 1 | **Thuộc tính trình bày của SVG** | `format.ts`, `CashFlowChart.tsx`, `RevenueTrendChart.tsx`, `DashboardSettingsModal.tsx`, `AgingCharts.tsx`, `DongTienTab.tsx`, `RevenueExpenseBreakdownCharts.tsx`, `ExecutionStatusCharts.tsx` | `var()` không giải được trong `stroke=` / `fill=` của SVG. Đây là ràng buộc KỸ THUẬT, không phải lựa chọn thẩm mỹ — dùng token ở đây là biểu đồ mất nét. |
| 2 | **Template HTML in độc lập** | `congNoPrint.ts`, `nkcListPrint.ts`, `printTemplates.ts` (chung-tu/phieu), `khoPrintTemplates.ts` | Mỗi file dựng một chuỗi `<!DOCTYPE html>…` mở trong cửa sổ in riêng. Biến CSS khai ở `:root` của `src/index.css` không tồn tại trong DOM đó → dùng token thì chữ/nền in ra mất màu. |
| 3 | **Thang mức độ nghiêm trọng nhiều bậc** | `CongNoPhaiThuPage.tsx`, `CongNoPhaiTraPage.tsx` (6 bậc tuổi nợ), `AgingCharts.tsx` (5 bậc) | Bộ token chỉ có **một** `--amber` và **một** `--red`, không đủ diễn tả thang tăng dần. **Ngoại lệ:** bậc đầu ("Chưa đến hạn") đã đổi sang `hsl(var(--green))` — nó chính là mã `#52c41a` đã được quy về `--green` ở 6 chỗ khác trong cùng file, để nguyên thì một màn hình có hai sắc xanh cho cùng nghĩa "tốt". |
| 4 | **Biểu đồ phân biệt nhiều chuỗi dữ liệu** | `BalanceStructureChart.tsx` (7 màu mảng + 4 màu chữ tương phản nền), `DashboardSettingsModal.tsx` (mini-preview 7 loại biểu đồ), `BangCanDoiPage.tsx` (`COLORS` cho 2 biểu đồ tròn) | Cần N màu phân biệt nhau, không map được vào thang "tốt / xấu" của bộ token. |
| 5 | **Màu phân loại nghiệp vụ không có token** | `DongTienPage.tsx` (Kinh doanh / Đầu tư / **Tài chính** = tím), `QuanLyHopDongPage.tsx` ("Tiền thuế" = tím) | Bộ token không có sắc tím. |
| 6 | **Màu thương hiệu nhận diện loại file** | `DocumentLibraryPage.tsx` | Icon YouTube đỏ, PDF đỏ, Excel xanh lá, PowerPoint cam, Ảnh xanh ngọc — người dùng nhận ra loại file bằng chính màu thương hiệu. |
| 7 | **Không phải màu style** | `LoaiGiaoDichPage.tsx`, `nkcListPrint.test.ts` | `#1890ff` nằm trong text placeholder ví dụ nhập liệu; mã trong file test là dữ liệu kiểm chứng, không áp cho phần tử nào. |

Mọi chỗ giữ đều có chú thích tại chỗ nêu lý do (trừ nhóm 2 — bối cảnh "tài liệu HTML độc
lập" đã tự nói lên).

## ⚠️ Cảnh báo: phép đo này chỉ đếm mã hex

Con số 89 / 96 ở trên **không** phản ánh toàn bộ màu cứng của `src/pages`.

Còn khoảng **119 chỗ** dùng bảng màu **preset của antd** — `<Tag color="blue">`,
`color="green"`, `color="orange"`, `color="red"`, `color="gold"`, `color="purple"`,
`color="processing"`, `color="success"`… (113/119 là `<Tag>`; 6 chỗ còn lại
truyền màu qua biến nên lệnh đếm bắt cả vào). Phân bố trong `src/pages`:

| blue | green | orange | red | warning | success | processing | còn lại |
|---|---|---|---|---|---|---|---|
| 24 | 13 | 11 | 8 | 5 | 5 | 4 | 20 |

Chúng **không phải token của dự án** — antd tra bảng màu riêng của nó, nên `<Tag
color="green">` và `hsl(var(--green))` cho ra hai sắc xanh khác nhau đứng cạnh nhau, và
không đổi theo `.dark` của mình. Chúng KHÔNG nằm trong con số 232 / 89 vì grep chỉ bắt mã
hex. Nếu sau này muốn đồng bộ nốt lớp này thì đó là một đợt riêng: hoặc ánh xạ preset của
antd sang token qua `ConfigProvider`, hoặc thay `<Tag>` bằng `StatusPill`.

Ba chỗ khác cũng ngoài tầm đo:

- `src/components/` và `src/App.tsx` — phép đo chỉ quét `src/pages`.
- `src/components/layout/sidebar/` — có lưới an toàn riêng, không đụng tới.
- Màu antd khai trong `App.tsx` (`colorText`, `colorTextSecondary`, `colorTextTertiary`) —
  phải trùng thủ công với `--ink` / `--ink-2` / `--ink-3` trong `index.css`; hiện chưa có
  test canh việc này.
