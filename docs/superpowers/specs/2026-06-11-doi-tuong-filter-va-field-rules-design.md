# Design: Filter đối tượng theo chiTietTheo & Cấu hình trường bắt buộc/cảnh báo theo tài khoản

**Ngày:** 2026-06-11
**Công ty áp dụng:** ONENESS WORLD (tính năng dùng chung toàn hệ thống)
**Trạng thái:** Đã duyệt thiết kế, chờ implementation plan

## Bối cảnh

Hai vấn đề trên form Nhật ký chung (dữ liệu tổng hợp):

1. TK 112 khai báo `chiTietTheo = NGAN_HANG_QUY` nhưng dropdown "Đối tượng" không có ngân hàng/quỹ để chọn (vì ngân hàng/quỹ nằm ở collection `ngan_hang` riêng, không thuộc `doi_tuong`). Đồng thời dropdown đang mở tất cả đối tượng bất kể `chiTietTheo` của TK — sai nghiệp vụ kế toán.
2. Chưa có cơ chế cấu hình trường nào trên dòng hạch toán là bắt buộc / cảnh báo / không bắt buộc theo từng tài khoản.

## Phần 1 — Đối tượng theo `chiTietTheo` của tài khoản

### Hành vi

Ô "Đối tượng nợ" phụ thuộc TK Nợ của dòng; "Đối tượng có" phụ thuộc TK Có:

| `chiTietTheo` của TK | Dropdown đối tượng |
|---|---|
| KHACH_HANG / NHA_CUNG_CAP / NHA_THAU / NHAN_VIEN | Chỉ đối tượng đúng loại đó (từ `doi_tuong`) |
| NGAN_HANG_QUY | Danh sách Ngân hàng & Quỹ (từ `ngan_hang`) |
| Không khai báo | Ô đối tượng disable |

Khi đổi TK làm đối tượng đang chọn sai loại → tự clear giá trị đối tượng.

### Thay đổi

**FE:**
- `master-data.handler.ts` (form nhật ký chung): load thêm danh sách ngân hàng/quỹ (`nganHangService`), đưa vào state (vd `nganHangList`).
- `ChiTietTable.tsx` + `AllocationFields.tsx` (EntryFormModal): cột/field Đối tượng nợ/có đổi từ filter cứng (loại trừ NHAN_VIEN) sang filter động theo `chiTietTheo` của TK tương ứng trên dòng. Nguồn options: `doiTuongList` filter theo loai, hoặc `nganHangList` khi NGAN_HANG_QUY.
- Snapshot: khi chọn ngân hàng/quỹ, lưu vào `danhMuc.doiTuong` (hoặc `doiTuong2` cho bên có) dạng `{ ma, ten, loai: 'NGAN_HANG_QUY' }` — đúng cấu trúc reporting đang đọc.

**BE (reporting-service):**
- `so-cai.service.ts`: thêm `'NGAN_HANG_QUY'` vào `DOI_TUONG_CHI_TIET_TYPES` để Sổ cái / Cân đối TK / Cân đối kế toán xổ chi tiết TK 112/111 theo từng ngân hàng/quỹ. Hạ tầng `buildDoiTuongRows` + aggregation theo `danhMuc.doiTuong.loai` đã có sẵn (commits e278b31, dd20b58, 9f421f4); chứng từ cũ thiếu đối tượng sẽ rơi vào dòng "Chưa xác định đối tượng" — chấp nhận, dữ liệu sạch dần.

## Phần 2 — Cấu hình trường bắt buộc / cảnh báo / không bắt buộc theo tài khoản

### Lưu trữ

Thêm field vào entity `TaiKhoan` (`be/libs/entities/src/master-data/tai-khoan.entity.ts`):

```typescript
export type FieldRuleLevel = 'BAT_BUOC' | 'CANH_BAO'; // không khai = không bắt buộc

@Column({ type: 'simple-json', nullable: true })
fieldRules?: Partial<Record<FieldRuleKey, FieldRuleLevel>>;

// FieldRuleKey: 'doiTuong' | 'duAn' | 'boPhan' | 'doi' | 'nhanVien'
//             | 'sanPham' | 'dongTien' | 'khoanMuc'
```

Đã cân nhắc phương án collection cấu hình riêng ở config-service (linh hoạt theo loại chứng từ) nhưng chọn JSON trên TaiKhoan vì: cấu hình ngay trong modal sửa TK, không cần API/collection mới, FE đã load sẵn `taiKhoanList` nên validate không tốn thêm request. (YAGNI)

### UI Setting

`TaiKhoanPage.tsx` — modal thêm/sửa tài khoản, thêm section **"Quy tắc nhập chứng từ"**: bảng 8 trường (Đối tượng, Dự án, Bộ phận, Đội thi công, Nhân viên, Sản phẩm, Dòng tiền, Khoản mục), mỗi trường chọn 1 trong 3 mức: Không bắt buộc (mặc định) / Cảnh báo / Bắt buộc. Cập nhật zod schema + DTO BE (`create/update tai-khoan dto`) nhận `fieldRules`.

### Validate khi lưu chứng từ

**Phạm vi:** rule của một TK áp cho mọi dòng có TK đó ở bên Nợ hoặc bên Có. Riêng rule `doiTuong`: TK Nợ kiểm "Đối tượng nợ", TK Có kiểm "Đối tượng có". Các trường còn lại là cấp dòng — mức nghiêm trọng của mỗi trường = max(rule TK Nợ, rule TK Có) (BAT_BUOC > CANH_BAO).

**FE (form nhật ký chung, khi bấm Lưu):**
1. Gom vi phạm theo dòng: `{ dòng, trường, mức, tài khoản nguồn rule }`.
2. Có vi phạm BAT_BUOC → chặn lưu, highlight ô thiếu, thông báo dạng "Dòng 2: TK 112 yêu cầu bắt buộc chọn Dự án".
3. Chỉ có CANH_BAO → dialog xác nhận liệt kê cảnh báo, nút "Vẫn lưu" / "Quay lại". Vẫn lưu → submit.

**BE (voucher-service, create + update):**
- Lấy `fieldRules` của các TK xuất hiện trong `danhMuc` (gọi master-data-service qua ServiceClient theo pattern hiện có).
- Enforce **chỉ mức BAT_BUOC** → thiếu thì trả 400 kèm danh sách `{ truong, taiKhoan }`. CANH_BAO không chặn ở BE (user đã xác nhận ở FE).
- Áp dụng cho cả update: chứng từ cũ mở ra sửa phải bổ sung đủ trường bắt buộc mới lưu được (xem/báo cáo chứng từ cũ không bị ảnh hưởng).

## Ngoài phạm vi (đợt này không làm)

- Rule theo loại chứng từ / loại giao dịch (chỉ theo tài khoản).
- Migrate/bổ sung đối tượng cho chứng từ cũ (dữ liệu cũ rơi vào "Chưa xác định đối tượng" trên báo cáo).
- Gộp danh mục ngân hàng vào danh mục đối tượng.

## Thứ tự triển khai

1. **Phần 1** (độc lập, nhỏ): FE load ngân hàng + filter đối tượng + snapshot → reporting thêm NGAN_HANG_QUY.
2. **Phần 2**: BE entity/DTO `fieldRules` → UI setting TaiKhoanPage → FE validate khi lưu → BE validate create/update.

## Kiểm thử

- Unit test BE: validate `fieldRules` trong voucher-service (thiếu trường BAT_BUOC → 400; CANH_BAO → pass; max(Nợ, Có)).
- Test FE thủ công: 112 chỉ hiện ngân hàng/quỹ; 131 chỉ hiện khách hàng; TK không khai chiTietTheo → ô disable; đổi TK clear đối tượng sai loại; dialog cảnh báo cho lưu; lỗi bắt buộc chặn lưu; sổ cái 112 xổ chi tiết theo ngân hàng với chứng từ mới.
