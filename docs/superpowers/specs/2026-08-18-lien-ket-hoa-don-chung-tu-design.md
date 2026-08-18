# Liên kết hóa đơn ↔ chứng từ (bảng kê thuế ↔ Dữ liệu tổng hợp)

Ngày: 2026-08-18
Trạng thái: đã chốt hướng với khách, chờ lên plan

## 1. Vấn đề

Khách phản ánh: một hóa đơn (mua vào hoặc bán ra) đã được nhập ở Dữ liệu tổng hợp thì
bảng kê mua vào/bán ra phải dùng được luôn, kế toán không phải nhập lại lần thứ hai.
Khách dẫn chiếu MISA: hai bên có một mục liên kết với nhau.

Rà lại code (2026-08-18), hiện trạng:

- `ChungTu` (`be/libs/entities/src/voucher/chung-tu.entity.ts`) **không có trường hóa đơn nào**:
  không số HĐ, ký hiệu, MST, thuế suất, tiền thuế.
- Bảng kê đã có thật — `tax-service` (3009), hai module `bang-ke-mua-vao` / `bang-ke-ban-ra`,
  hai trang FE dùng chung `fe/src/pages/thue/components/BangKePage.tsx` — nhưng **nhập tay
  hoàn toàn**, không nút nào lấy từ chứng từ.
- Hai entity bảng kê **đã khai sẵn `chungTuId` và `soChungTu`** kèm chú thích
  "liên kết chứng từ (phase sau)". Hai cột này hiện chỉ tồn tại trong DTO, không nơi nào ghi
  và không nơi nào đọc.

Số liệu production tại thời điểm chốt thiết kế:

| Collection | Số bản ghi |
|---|---|
| `bang_ke_mua_vao` | 1.025 |
| `bang_ke_ban_ra` | 164 |
| `chung_tu` | 2.655 |

1.189 hóa đơn đã nhập thật. Mọi phương án xóa bảng kê để biến nó thành báo cáo thuần đọc
từ chứng từ đều làm mất số này, nên bị loại từ đầu.

## 2. Các quyết định đã chốt

| # | Câu hỏi | Chốt |
|---|---|---|
| 1 | Chiều nhập chính | Nhập/gán ở Dữ liệu tổng hợp → bảng kê có dòng. Chiều ngược lại là **gắn tay** từ bảng kê, không tự sinh bút toán |
| 2 | Một chứng từ gắn mấy hóa đơn | **1 chứng từ ↔ n hóa đơn** |
| 3 | 1.189 dòng cũ | Để nguyên, đánh dấu "Chưa liên kết", nối tay khi cần. Không dò khớp tự động |
| 4 | Bên chứng từ nhập gì | **Chỉ gán số hóa đơn**. Toàn bộ chi tiết hóa đơn chỉ nhập và chỉ hiển thị ở bảng kê |
| 5 | Mức gán | **Cấp chứng từ**, không phải cấp dòng hàng — gắn theo hàng thì dài dòng |
| 6 | Gán số HĐ chưa có bên bảng kê | **Tự tạo dòng nháp** ở bảng kê, đánh dấu "Chưa đủ thông tin" |

## 3. Nguyên tắc cốt lõi: không nhân bản dữ liệu

Hóa đơn **chỉ lưu ở một chỗ duy nhất**: `bang_ke_mua_vao` / `bang_ke_ban_ra`.
Chứng từ **không giữ bản sao** nào của thông tin hóa đơn — quan hệ nằm ở cột `chungTuId`
phía bảng kê.

Lý do: `voucher-service` (3003) và `tax-service` (3009) là hai service, hai kết nối Mongo,
không có transaction chung. Nếu mỗi bên giữ một bản thì mọi lần sửa đều là bài toán đồng bộ
hai chiều, và `ServiceClient` trong repo này **nuốt lỗi** (trả `{ success: false }` thay vì
ném) — hỏng một nhịp là số thuế lệch âm thầm, không ai biết cho tới kỳ quyết toán.
Không nhân bản thì bài toán đó không tồn tại.

Hệ quả có chủ ý: chứng từ không biết số tiền hóa đơn. Muốn biết thì đọc sang bảng kê.

## 4. Mô hình dữ liệu

Không thêm collection, không đổi schema chứng từ.

`BangKeMuaVao` / `BangKeBanRa` — dùng lại 2 cột đã có, bỏ chú thích "phase sau":

```
chungTuId?: string   // id chứng từ đang gắn; rỗng = chưa liên kết
soChungTu?: string   // số phiếu, lưu để hiển thị mà không phải gọi chéo service
```

Thêm một cột duy nhất:

```
choBoSung?: boolean  // dòng nháp sinh ra từ màn chứng từ, chưa đủ thông tin kê khai
```

`soChungTu` là **ảnh chụp tại thời điểm gắn**, chấp nhận cũ nếu chứng từ đổi số phiếu.
Đổi số phiếu là việc hiếm, còn gọi chéo service chỉ để hiển thị một chuỗi thì đắt hơn nhiều.
Số phiếu hiển thị ở bảng kê vì vậy là *tham chiếu*, còn nguồn sự thật để mở chứng từ là
`chungTuId`.

Một dòng bảng kê thuộc **tối đa một** chứng từ. Một chứng từ có **0..n** dòng bảng kê,
thuộc cả hai bảng (một phiếu vừa gắn hóa đơn mua vào vừa bán ra là hợp lệ, không chặn).

## 5. Luồng nghiệp vụ

### 5.1 Gán hóa đơn đã có sẵn

1. Kế toán mở form chứng từ, ô **"Hóa đơn"** (ở khối header, cạnh Diễn giải chung).
2. Gõ số HĐ → ô gợi ý các dòng bảng kê **chưa liên kết**, ưu tiên dòng có MST trùng đối
   tượng của chứng từ. Mỗi gợi ý hiện: số HĐ — ngày — tên người bán/mua — tổng thanh toán.
3. Chọn → chip hiện số HĐ. Chọn được nhiều.
4. Lưu chứng từ → các dòng được set `chungTuId` + `soChungTu`.

### 5.2 Gán số HĐ chưa có bên bảng kê (dòng nháp)

1. Gõ số HĐ không khớp gợi ý nào → hiện lựa chọn *"Tạo hóa đơn mới: HD0001234"*.
2. Chọn loại **Mua vào / Bán ra** — mặc định suy theo loại chứng từ (phiếu chi → mua vào,
   phiếu thu → bán ra), đổi được.
3. Lưu chứng từ → tạo dòng bảng kê mới với:
   - `soHoaDon` = số vừa gõ
   - `ngayHoaDon` = ngày chứng từ
   - `tenNguoiBan`/`tenNguoiMua`, `mstNguoiBan`/`mstNguoiMua` = từ `danhMuc.doiTuong` của
     chứng từ (`maSoThue` đã có sẵn trong snapshot đối tượng)
   - `giaTriChuaThue` = 0, `tienThue` = 0, `tongThanhToan` = 0
   - `choBoSung` = true, `chungTuId`, `soChungTu`
4. Kế toán thuế vào bảng kê, lọc **"Chưa đủ thông tin"**, bổ sung ký hiệu / giá trị / thuế suất,
   lưu → `choBoSung` tự về false.

Dòng `choBoSung` **không được tính vào báo cáo thuế** (Tổng hợp thuế): tiền thuế đang là 0,
cộng vào là sai số. Xem 6.3.

### 5.3 Gắn từ phía bảng kê

Nút **"Gắn với chứng từ"** trên từng dòng chưa liên kết → modal tìm chứng từ theo số phiếu /
khoảng ngày / số tiền → chọn → set `chungTuId` + `soChungTu`.

### 5.4 Gỡ liên kết

- Bỏ chip ở form chứng từ → dòng bảng kê về `chungTuId` rỗng, **dòng vẫn còn**.
- Nút "Gỡ liên kết" ở bảng kê → tương tự.
- Dòng `choBoSung` bị gỡ link vẫn giữ nhãn "Chưa đủ thông tin" — nó vẫn là hóa đơn cần khai.

### 5.5 Xóa chứng từ

**Chỉ gỡ link, KHÔNG xóa dòng bảng kê.** Hóa đơn đã kê khai thuế mà tự biến mất theo chứng từ
là mất số của kỳ đã nộp. FE gọi gỡ link sau khi xóa chứng từ thành công; nếu bước gỡ hỏng thì
dòng bảng kê trỏ tới chứng từ không còn — xem 7.2.

## 6. Thay đổi cần làm

### 6.1 Backend — chỉ `tax-service`

`voucher-service` **không sửa gì**.

| Việc | Chi tiết |
|---|---|
| Lọc theo liên kết | `BangKeMuaVaoQueryDto` / `BangKeBanRaQueryDto` thêm `chungTuId?: string` và `lienKet?: 'da' \| 'chua' \| 'cho-bo-sung'` |
| Lấy theo nhiều chứng từ | `GET /tax/bang-ke/theo-chung-tu?ids=a,b,c` → `{ [chungTuId]: { muaVao: BangKe[], banRa: BangKe[] } }`. Cần cho cột "HĐ" ở bảng Dữ liệu tổng hợp — gọi từng dòng thì 20 dòng là 20 request |
| Gắn / gỡ | Dùng `PUT /tax/bang-ke-*/:id` sẵn có (DTO đã nhận `chungTuId`, `soChungTu`); thêm `choBoSung` vào DTO |
| Cờ chờ bổ sung | Service tự đặt `choBoSung = false` khi bản ghi được cập nhật có đủ `giaTriChuaThue > 0` hoặc `tienThue > 0` |
| Tạo dòng nháp | Dùng `POST` sẵn có; DTO nới `giaTriChuaThue` cho phép 0 và `choBoSung` |

### 6.2 Frontend

| Màn | Việc |
|---|---|
| Form chứng từ (`form-components/form-header/FormHeader.tsx`) | Ô "Hóa đơn" — Select nhiều, tìm theo số HĐ, cho tạo mới; hiện tổng thanh toán của các HĐ đã gắn để đối chiếu bằng mắt với số tiền chứng từ |
| Ghi hóa đơn khi lưu chứng từ | `form-handler/sub-handler/submit/submit.handler.ts` — sau khi lưu chứng từ thành công mới gọi tax-service (xem 7.1) |
| Bảng Dữ liệu tổng hợp (`components/data-tabs/EntryListTab.tsx`) | **Một cột nhỏ "HĐ"** hiện số lượng hóa đơn đã gắn, hover xem danh sách số HĐ. Không thêm cột nào khác — khách yêu cầu rõ không để bảng TH quá nhiều cột |
| Bảng kê (`pages/thue/components/BangKePage.tsx`) | Cột "Chứng từ" (số phiếu, bấm mở chứng từ / "Nhập tay"); nhãn "Chưa đủ thông tin"; bộ lọc **Tất cả / Đã liên kết / Chưa liên kết / Chưa đủ thông tin**; nút "Gắn với chứng từ" + "Gỡ liên kết" |
| `services/taxService.ts` | Hàm tìm hóa đơn chưa liên kết, lấy theo nhiều `chungTuId`, gắn/gỡ |

### 6.3 Báo cáo thuế

`tax-service/src/bao-cao` đang cộng từ bảng kê. Bổ sung: **bỏ qua dòng `choBoSung = true`**
khi tính Tổng hợp thuế, và hiện một dòng nhắc "Còn N hóa đơn chưa đủ thông tin trong kỳ" —
không nhắc thì số thuế thiếu mà báo cáo trông vẫn bình thường.

### 6.4 Migration

Không có. Mongo, hai cột `chungTuId`/`soChungTu` đã tồn tại; `choBoSung` thiếu thì hiểu là
`false`. 1.189 dòng cũ rơi vào nhóm "Chưa liên kết".

## 7. Trường hợp biên và xử lý lỗi

### 7.1 Lưu chứng từ xong, ghi bảng kê hỏng

Chứng từ mới chưa có id nên hóa đơn phải ghi **sau** khi chứng từ lưu xong. Hai lần ghi vào
hai service, không có transaction chung.

Xử lý: **không rollback chứng từ**, báo rõ *"Chứng từ đã lưu. Chưa gắn được hóa đơn — bấm Thử
lại"*, chứng từ giữ nguyên, ô Hóa đơn giữ nguyên lựa chọn để bấm lại. Sai sót thấy được vẫn
hơn rollback nửa vời.

Điều phối đặt ở **FE**, không để voucher-service gọi chéo tax-service: `ServiceClient` nuốt lỗi
nên hỏng sẽ im lặng, còn FE thì báo thẳng cho người đang nhập.

### 7.2 Dòng bảng kê trỏ tới chứng từ không còn

Cột "Chứng từ" hiện *"Chứng từ đã xóa"* thay vì số phiếu, kèm nút gỡ link. Không tự xóa dòng.

### 7.3 Một hóa đơn bị gắn vào hai chứng từ

Không xảy ra: `chungTuId` là một trường đơn, gắn vào chứng từ B thì mất khỏi chứng từ A.
Ô gợi ý chỉ liệt kê dòng **chưa liên kết**, nên không có đường gắn trùng qua giao diện.

### 7.4 Số hóa đơn trùng nhau

Số hóa đơn chỉ duy nhất trong phạm vi một người bán. Vì vậy liên kết lưu bằng **id**, không
bằng chuỗi số HĐ; ô gợi ý hiện kèm tên người bán + ngày để phân biệt hai hóa đơn trùng số.

### 7.5 Chứng từ đổi loại giao dịch sau khi đã gắn

Không tự đổi mua vào ↔ bán ra của dòng bảng kê đã gắn. Loại đã chọn lúc tạo là loại thật của
hóa đơn; đổi theo chứng từ sẽ chuyển nhầm hóa đơn sang bảng kê bên kia.

## 8. Ngoài phạm vi đợt này

- Chiều "nhập ở bảng kê → tự sinh bút toán" (dùng Quy chuẩn hạch toán để gợi ý TK Nợ/Có).
  Là phần cộng thêm, không phải làm lại.
- Dò khớp tự động 1.189 dòng cũ với chứng từ.
- Liên kết cấp dòng hàng.
- Kho / tài sản / khấu hao / bảng lương — các nhóm còn lại khách nêu, làm sau theo cùng mô hình.

## 9. Kiểm thử

Hàm thuần, test trước:

- Suy loại hóa đơn từ loại chứng từ (phiếu chi → mua vào, phiếu thu → bán ra, KHÁC → không suy).
- Dựng dòng nháp từ chứng từ: lấy đúng ngày, tên, MST từ snapshot đối tượng; số tiền 0;
  `choBoSung = true`.
- Quy tắc tắt `choBoSung` khi bản ghi đã có giá trị.
- Gom kết quả `theo-chung-tu` thành map để bảng TH đếm.
- Lọc dòng `choBoSung` khỏi tổng hợp thuế.

Ở BE: test DTO nhận `chungTuId`/`choBoSung`, test filter `lienKet`.

Kiểm bằng tay trước khi giao khách: tạo chứng từ gắn 2 hóa đơn (1 có sẵn, 1 gõ mới) → bảng kê
có đủ 2 dòng, 1 dòng "Chưa đủ thông tin" → bổ sung → nhãn mất → xóa chứng từ → cả 2 dòng còn
nguyên, chuyển về "Chưa liên kết".
