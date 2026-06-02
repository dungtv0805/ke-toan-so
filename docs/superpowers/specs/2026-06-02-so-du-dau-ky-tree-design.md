# Thiết kế: Số dư đầu kỳ dạng cây (tree cha–con–đối tượng)

**Ngày:** 2026-06-02
**Trạng thái:** Đã chốt thiết kế
**Phạm vi:** master-data-service (BE), Frontend (`fe/`). KHÔNG đụng reporting-service / ServiceClient.getSoDuDauKy.

## Bối cảnh & Vấn đề

Trang Số dư đầu kỳ hiện là **bảng phẳng** (`SoDuDauKyPage.tsx`): bấm "+ Thêm dòng" → chọn TK → (nếu TK có `chiTietTheo`) chọn đối tượng → nhập Nợ/Có. Vấn đề:

1. Không nhìn được quan hệ cha–con giữa các tài khoản, không có tổng cộng dồn theo cấp như bên Báo cáo.
2. Mỗi dòng chỉ ghi được **một** chiều chi tiết (`chiTiet*`). Nghiệp vụ cần ghi **ngân hàng song song** với đối tượng (vd: phải thu khách hàng A sẽ thu qua VCB).

## Mục tiêu

1. Hiển thị Số dư đầu kỳ dưới **dạng cây tài khoản** (cha → con → đối tượng), có **collapse / mở-tất-cả** như Báo cáo tài chính.
2. **Cộng tổng (roll-up)** từ lá lên mọi cấp cha; **chỉ nhập ở phần tử con cùng nhất**, cấp cha read-only.
3. Mỗi dòng lá ghi được **đối tượng** và **ngân hàng** song song (2 cột riêng).

## Quyết định thiết kế (đã chốt)

| Vấn đề | Quyết định |
|--------|-----------|
| Dựng cây | **Add-driven**: bấm "+ Thêm tài khoản", ô chọn **chỉ cho chọn TK con (lá)**. Khi thêm 1 TK con → cây **tự sinh các TK cha** bên trên (gom nhóm + cộng tổng). TK chưa thêm → không hiện. |
| Cấp nhập liệu | Luôn nhập ở **con cùng nhất**. Mọi node có con (cha tự sinh, hoặc TK lá có đối tượng) đều **read-only**, hiển thị tổng cộng dồn. |
| Cấp đối tượng | TK lá có `chiTietTheo` → là node nhóm, có nút **"+ Thêm…"**, đối tượng là cấp lá nhập được. TK lá không cấu hình → **2 cấp**, chính TK con là dòng nhập. |
| Cột Đối tượng | Dropdown KH / NCC / Nhân viên / Nhà thầu — bật khi `chiTietTheo` ∈ 4 loại đó. |
| Cột Ngân hàng | `chiTietTheo = NGAN_HANG_QUY` → **chọn từ danh mục ngân hàng** (lưu vào `chiTiet*`, là yếu tố phân biệt các dòng lá). TK loại khác / không cấu hình → **gõ tay** (free text), có ở **mọi** dòng lá. |
| Lưu trữ | Giữ format phẳng (1 dòng lá = 1 record `SoDuDauKy`). Thêm field `nganHang` (text) cho ngân hàng gõ tay. |
| Reporting | **Không đổi**. `ServiceClient.getSoDuDauKy` vẫn gộp tổng theo `maTaiKhoan`; `nganHang`/`chiTiet*` không ảnh hưởng tổng. |

## Mô hình cây

Lá nhập liệu (`editable`) là một trong hai:
- (a) TK con **không** `chiTietTheo` → chính TK con là lá.
- (b) Cặp **(TK con + đối tượng)** khi TK con có `chiTietTheo`.

```
[+ Thêm tài khoản]   (ô chọn: CHỈ TK con — 1111, 1121, 1311…)

Sau khi thêm 1121 (config=Ngân hàng) và 131 (config=Khách hàng):

                          Đối tượng        Ngân hàng         Dư Nợ  Dư Có
▼ 1    (cha tự sinh)                                          [Σ]    [Σ]
  ▼ 112  (cha tự sinh)                                        [Σ]    [Σ]
    ▼ 1121 (con, config=Ngân hàng)                            [Σ]    [Σ]
        • —              [chọn NH: VCB ▾]    100    0    ← lá: NH chọn từ danh mục
        • —              [chọn NH: ACB ▾]     50    0
        [+ Thêm ngân hàng]
▼ 131  (con, config=Khách hàng)                               [Σ]    [Σ]
      • [chọn KH: A ▾]   [gõ tay: "VCB"]     200    0    ← lá: đối tượng + NH gõ tay
      [+ Thêm khách hàng]

(TK chưa thêm → không hiện)
```

- Cấp cha (`1`, `112`) là node **tự sinh** từ prefix mã TK, lấy tên từ chart đầy đủ. Read-only, Nợ/Có = tổng cộng dồn con cháu.
- `1121` có `chiTietTheo` → node nhóm read-only, có "+ Thêm ngân hàng"; các ngân hàng là lá.
- `131` có `chiTietTheo` → node nhóm read-only, có "+ Thêm khách hàng"; mỗi khách hàng là lá, kèm ô ngân hàng gõ tay.
- TK con không cấu hình (vd `1111`) → là lá nhập trực tiếp + ô ngân hàng gõ tay (không có cấp con).

## Kiến trúc

### 1. BE — Entity `SoDuDauKy` (master-data) thêm 1 field

```
nganHang?: string   // tên ngân hàng gõ tay; null nếu TK loại Ngân hàng (đã ở chiTiet*) hoặc không nhập
```

Khoá luận lý dòng lá: `(tenantId, maTaiKhoan, chiTietId, nganHang)`.

### 2. BE — DTO `SoDuDauKyItemDto` (master-data-service)

Thêm `nganHang?: string` (`@IsString() @IsOptional()`). `saveBulk` lưu kèm; `getAll` trả lại `nganHang` trên mỗi item. Semantics "xoá hết + ghi lại" giữ nguyên.

### 3. BE — KHÔNG đổi reporting

`ServiceClient.getSoDuDauKy` đã gộp tổng theo `maTaiKhoan`; thêm `nganHang` không ảnh hưởng (vẫn cộng `duNo`/`duCo` theo mã TK). Reporting-service không sửa.

### 4. FE — load dữ liệu

`SoDuDauKyPage` load song song:
- `taiKhoanService.getLeafAccounts()` — TK con chọn được trong "+ Thêm tài khoản" + `chiTietTheo` mỗi TK.
- `taiKhoanService.getAll()` (hoặc `getHierarchy()`) — chart đầy đủ để lấy **tên TK cha tự sinh**.
- `soDuDauKyService.getAll()` — các dòng đã lưu → khởi tạo danh sách lá.
- Đối tượng (`DoiTuong.getByLoai`) và `nganHangService` load lazy khi mở Select (giữ cơ chế `optCache` hiện có).

### 5. FE — helper thuần `buildSoDuTree` (viết TDD)

File mới `fe/src/pages/danh-muc/so-du-dau-ky/buildSoDuTree.ts` + test.

- **Input:** danh sách lá `SoDuRow[]` + chart `{ ma, ten }[]`.
- **Output:** cây `TreeNode[]`:
  - Node TK theo prefix mã (cha tự sinh, tên từ chart), `__isParent`, `__rollup { duNo, duCo }` cộng dồn TẤT CẢ lá con cháu.
  - Dưới TK lá có `chiTietTheo`: gắn các lá đối tượng làm `children`.
  - Mỗi node có `__key` duy nhất (mã TK cho node TK; `mã::chiTietId::nganHang` cho lá đối tượng) để làm `rowKey` + `expandedRowKeys`.
- **`collectExpandKeys(nodes)`**: gom `__key` mọi node có con (cho "Mở tất cả").
- Dùng helper riêng (không tái dùng `buildAccountTree` của báo cáo) vì ở đây **nhiều lá chung một mã TK** (đối tượng), còn `buildAccountTree` giả định 1 dòng/1 mã.

### 6. FE — `chiTietConfig.ts`

- `SoDuRow` thêm `nganHang?: string`.
- `validateRows`: khoá trùng đổi sang `mã TK + chiTietId + nganHang`; giữ check "TK có `chiTietTheo` thì bắt buộc chọn đối tượng".

### 7. FE — `SoDuDauKyPage.tsx` (viết lại)

- State: danh sách lá (như `SoDuRow[]` mở rộng `nganHang`) + `expandedKeys`.
- `dataSource` = `buildSoDuTree(rows, chart)`; `Table` `rowKey="__key"`, `expandable={{ expandedRowKeys, onExpandedRowsChange }}`.
- Cột:
  1. **Tài khoản / Đối tượng** — node TK: `mã – tên` (in đậm nếu cha); lá đối tượng: Select đối tượng (chỉ ở lá của TK loại KH/NCC/NV/Nhà thầu), TK loại Ngân hàng/không cấu hình thì "—".
  2. **Ngân hàng** — TK loại Ngân hàng: Select danh mục `nganHangService`; loại khác / không cấu hình: `Input` gõ tay; node cha: trống.
  3. **Dư Nợ** — lá: `InputNumber`; node cha & node nhóm: `__rollup.duNo` (read-only, đậm).
  4. **Dư Có** — tương tự.
  5. **Thao tác** — node nhóm (TK có `chiTietTheo`): nút **"+ Thêm [label loại]"** thêm 1 lá đối tượng; lá: nút xoá; TK con thường: nút xoá.
- Trên bảng: **"+ Thêm tài khoản"** (Select search **chỉ TK con/lá**) + **"Mở tất cả" / "Thu gọn"**.
- Giữ: 1 ô **Ngày áp dụng** chung; dòng tổng **Tổng Nợ / Tổng Có** + cảnh báo lệch cân đối; nút **Lưu**.
- **Lưu**: phẳng-hoá các lá từ state → `saveBulk` (PUT ghi đè). Chỉ gửi lá có `duNo≠0` hoặc `duCo≠0` hoặc có `chiTietId`. Bỏ qua node nhóm chưa có lá.

### 8. FE — `soDuDauKyService.ts`

`SoDuDauKyItem` thêm `nganHang?: string`. `SaveSoDuDauKyPayload.items` dùng cùng type.

## Edge cases

- TK con không cấu hình → 2 cấp, lá nhập trực tiếp; `chiTietId = null`, `nganHang` có thể gõ tay.
- TK loại Ngân hàng → ngân hàng lưu ở `chiTiet*` (chọn danh mục); `nganHang` (text) để trống.
- TK loại KH/NCC/… → đối tượng ở `chiTiet*`, ngân hàng gõ tay ở `nganHang` (song song).
- TK lá có `chiTietTheo` nhưng chưa thêm lá nào → hiện node nhóm trống + "+ Thêm…", không nhập trực tiếp, bỏ qua khi lưu.
- Trùng `(mã TK, chiTietId, nganHang)` → chặn lưu, báo lỗi.
- Dữ liệu cũ (không có `nganHang`) → đọc bình thường, `nganHang = null`.
- Cha tự sinh không có trong chart (mã lạ) → fallback tên rỗng, vẫn dựng node.

## Phạm vi KHÔNG làm (YAGNI)

- KHÔNG đụng reporting-service, Sổ cái, Sổ chi tiết công nợ.
- KHÔNG chuẩn hoá ngân hàng gõ tay thành danh mục (chỉ free text).
- KHÔNG cho chọn TK cha trong "+ Thêm tài khoản".
- KHÔNG khoá kỳ / lịch sử / nhiều năm.

## Kiểm thử

- **Unit (BE):** `saveBulk` lưu kèm `nganHang`; `getAll` trả lại đúng.
- **Unit (FE):** `buildSoDuTree` — dựng cha tự sinh, roll-up Nợ/Có đúng, gắn lá đối tượng, `__key` duy nhất, `collectExpandKeys`. `validateRows` — trùng theo `mã+chiTietId+nganHang`, thiếu đối tượng.
- **Thủ công:** thêm 1121 (chọn 2 ngân hàng), 131 (chọn KH + gõ ngân hàng), 1111 (nhập trực tiếp) → cây hiện cha tự sinh, tổng cộng dồn đúng, collapse/mở-tất-cả chạy; Lưu & tải lại đúng; Bảng cân đối phát sinh / cân đối kế toán tổng theo TK không đổi.
</content>
</invoke>
