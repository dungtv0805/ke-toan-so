# Đối tượng đa loại (multi-loại) — Design Spec

**Ngày:** 2026-06-24
**Mục tiêu:** Một đối tượng có thể thuộc nhiều loại cùng lúc (vd vừa Khách hàng vừa Nhà cung cấp), thay vì 1 loại như hiện tại.

## Bối cảnh hiện tại
- Entity `doi_tuong` có field `loai: DoiTuongType` (enum đơn: KHACH_HANG, NHA_CUNG_CAP, NHAN_VIEN, NHA_THAU).
- Tài khoản có `chiTietTheo`; khi chọn TK trong chứng từ, dropdown đối tượng lọc theo `d.loai === chiTietTheo` (TK 131 → Khách hàng, TK 331 → NCC). **Tài khoản công nợ KHÔNG suy ra từ loại đối tượng** → đổi sang đa loại không gây nhập nhằng kế toán; một đối tượng 2 loại tự xuất hiện đúng ở cả 2 dropdown.

## Quyết định kiến trúc
Đổi `loai` thành **mảng** `DoiTuongType[]` (1 nguồn sự thật). Đã được user duyệt.

## Thay đổi

### Backend
| File | Thay đổi |
|------|----------|
| `libs/entities/src/master-data/doi-tuong.entity.ts` | `loai: DoiTuongType` → `loai: DoiTuongType[]` (cột mảng) |
| `apps/master-data-service/src/doi-tuong/dto/create-doi-tuong.dto.ts` | `@IsEnum` → `@IsArray @ArrayNotEmpty @IsEnum(..., { each: true })`, `loai: DoiTuongType[]` |
| `apps/master-data-service/src/doi-tuong/doi-tuong.service.ts` | Lọc in-memory: `item.loai === loai` → `item.loai.includes(loai)` (findAllPaginated, getStats). Query DB `{ loai: X }` **giữ nguyên** (MongoDB match mảng-chứa-X). |
| `libs/dto/src/master-data/doi-tuong.dto.ts` | `loai: DoiTuongType` → `DoiTuongType[]` trong các interface |
| Query DTO `?loai=` | **Giữ nguyên** đơn loại (nghĩa "lọc đối tượng có loại X") |

### Frontend
| File | Thay đổi |
|------|----------|
| `types/index.ts` | `DoiTuong.loai` → mảng. `DoiTuongSnapshot.loai` **giữ nguyên** đơn string |
| `pages/danh-muc/doi-tuong/DoiTuongPage.tsx` | Zod schema → `z.array(...).min(1)`; Select `mode="multiple"`; default modal `loai: [...]`; cột "Loại" render nhiều Tag |
| `utils/snapshotBuilder.ts` | `loai: doiTuong.loai` → `loai: doiTuong.loai[0]` (lưu loại chính; snapshot.loai chỉ dùng để phân biệt ca NGAN_HANG_QUY, không phân biệt KH/NCC) |
| `pages/chung-tu/nhat-ky-chung/doiTuongConfig.ts` | `.filter(d => d.loai === chiTietTheo)` → `.includes()`; `getSelectedDoiTuongLoai` trả về `string[]` |
| `.../chi-tiet-table/ChiTietTable.tsx` | `currentLoai !== chiTietTheo` → `!currentLoai?.includes(chiTietTheo)`; filter NHAN_VIEN → includes |
| `.../handler/sub-handler/form/form.handler.ts` | filter `!== / === "NHAN_VIEN"` → `!includes / includes` |
| `.../entry-form-modal/AllocationFields.tsx` | filter NHAN_VIEN → includes |

**Không đổi:** số dư đầu kỳ (lọc server-side qua `getByLoai`), báo cáo công nợ (query BE theo loai), snapshotDisplay/export (chỉ đọc ma/ten).

### Migration (production Mongo)
- Script idempotent: `doi_tuong.loai` string → `[string]`. Bỏ qua nếu đã là mảng. Backup collection trước khi chạy.
- **Snapshot chứng từ cũ** (`danhMuc.doiTuong2.loai`) giữ nguyên string — lịch sử, chỉ hiển thị.

### Test (TDD)
- `doiTuongConfig.test.ts`: mock `doiTuongList` với `loai` mảng; `getSelectedDoiTuongLoai` trả mảng; thêm case đối tượng đa loại xuất hiện ở nhiều dropdown.
- `fieldRulesValidation.test.ts`: cập nhật nếu phụ thuộc loai.

## Rollout
Deploy **FE + BE cùng lúc** + chạy migration. Có vài giây lệch giữa 2 deploy — chấp nhận được (đã xác nhận với user).
