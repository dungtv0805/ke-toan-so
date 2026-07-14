# Checkbox chọn dòng + xóa hàng loạt

Hiện chỉ **Nhật ký chung** có checkbox chọn dòng và nút "Xóa đã chọn" (endpoint `POST /voucher/nhat-ky-chung/delete-batch`, `nhat-ky-chung.service.ts:457`). 25 bảng khác chỉ xóa được từng dòng một.

Mục tiêu: thêm checkbox chọn dòng + xóa hàng loạt cho 25 bảng **xóa mềm** (`isActive = false`).

## Phạm vi

**Áp dụng (25 bảng):**

| Module | Bảng |
|---|---|
| Danh mục (master-data) | Bộ phận, Chủ đầu tư, Đối tượng, Đơn vị tính, Dòng tiền, Dự án, Hàng hóa vật tư, Hồ sơ chứng từ, Hợp đồng, Kho, Khoản mục, Loại chứng từ, Loại giao dịch, Lý do không hợp lệ, Ngân hàng, Nhóm khoản mục, Nhóm khuyến mãi, Nhóm quản lý, Nhóm vật tư, Sản phẩm (20) |
| Trung tâm dữ liệu (master-data) | Sổ hóa đơn bán ra, Sổ thu tiền hợp đồng |
| Cấu hình (config) | Quy chuẩn (định khoản mẫu) |
| Thuế (tax) | Bảng kê mua vào, Bảng kê bán ra |
| Kho (kho) | Phiếu kho (nhập / xuất / chuyển — dùng chung 1 trang) |
| Bếp ăn (mam-non) | Định mức tiền ăn, Công thức định lượng, Điểm danh ăn, Đề xuất mua thực phẩm |

**KHÔNG áp dụng** (thao tác quá rủi ro, cần chốt an toàn riêng nếu sau này muốn):

- **Phiếu thu / Phiếu chi** — BE xóa **hẳn** (`chung-tu.service.ts:295`), không guard trạng thái, ảnh hưởng sổ quỹ / sổ cái / BCTC.
- **Thư viện tài liệu** — xóa hẳn kèm xóa file khỏi storage (`tai-lieu.service.ts:109`), không hoàn tác.
- **Hệ thống tài khoản** — cây cha/con, bị mọi bút toán và báo cáo tham chiếu.
- **Công ty (Tenant)** — cascade sang identity-service + AppUserRole.
- **Lĩnh vực** — xóa hẳn, dữ liệu hệ thống, có ràng buộc tenant đang dùng.
- **Nhật ký chung** — đã có sẵn, giữ nguyên.

## Backend

### Dùng chung

`DeleteBatchDto` trong `@app/dto`:

```ts
export class DeleteBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
```

Helper `softDeleteBatch` trong `@app/core`:

```ts
export interface SoftDeleteBatchResult {
  deleted: number;
  skipped: number;
}

/**
 * Xóa mềm hàng loạt: nạp bản ghi theo id (repository đã tự lọc theo tenant), bỏ qua bản ghi
 * `canDelete` trả false, set isActive = false cho phần còn lại.
 * Bản ghi không tồn tại / khác tenant: không tính vào `deleted` lẫn `skipped`.
 */
export async function softDeleteBatch<T extends { isActive?: boolean }>(
  repo: MongoRepository<T>,
  ids: string[],
  canDelete?: (entity: T) => boolean,
): Promise<SoftDeleteBatchResult>
```

### Mỗi tài nguyên

Controller thêm:

```ts
@Post('delete-batch')
@Roles(...)  // giữ đúng bộ role của endpoint DELETE /:id hiện có
async deleteBatch(@Body() dto: DeleteBatchDto) {
  const data = await this.service.deleteBatch(dto.ids);
  return { success: true, data };
}
```

Service thêm `deleteBatch(ids: string[])` gọi `softDeleteBatch(repo, ids, canDelete?)`.

**Quy tắc chặn của xóa đơn được giữ nguyên cho xóa lô.** Cụ thể: **Đề xuất mua** không xóa được phiếu `DA_DUYET` / `DA_NHAN` (`de-xuat-mua.service.ts:94`) → những dòng đó rơi vào `skipped`, không làm hỏng cả lô. Các tài nguyên còn lại trong phạm vi không có guard trạng thái ở hàm xóa đơn → `canDelete` bỏ trống.

Đường dẫn (theo prefix gateway): `POST /master-data/<res>/delete-batch`, `/config/quy-chuan/delete-batch`, `/tax/bang-ke-mua-vao|bang-ke-ban-ra/delete-batch`, `/kho/phieu/delete-batch`, `/mam-non/<res>/delete-batch`.

## Frontend

Hook dùng chung `useBulkDelete` (`fe/src/components/table/useBulkDelete.tsx`):

```ts
interface UseBulkDeleteOptions {
  /** Gọi API xóa lô; trả về số đã xóa / bị bỏ qua. */
  onDeleteBatch: (ids: string[]) => Promise<{ deleted: number; skipped: number }>;
  /** Chạy sau khi xóa xong (thường là tải lại danh sách). */
  onDone: () => void;
  /** Không có quyền xóa → không hiện checkbox lẫn nút. */
  enabled: boolean;
  /** Nhãn trong câu xác nhận, vd "bộ phận". */
  itemLabel: string;
}

// trả về
{
  rowSelection: TableRowSelection<T> | undefined,  // gắn thẳng vào antd Table
  bulkDeleteButton: React.ReactNode,               // nút "Xóa đã chọn (N)", ẩn khi N = 0
  clearSelection: () => void,
  selectedCount: number,
}
```

- `rowSelection` chỉ trả về khi `enabled` (quyền xóa lấy từ `usePagePermission` như các trang đang dùng cho nút xóa từng dòng).
- Nút đặt cạnh nút "Thêm mới" trong thanh công cụ, kiểu `danger`, nhãn **"Xóa đã chọn (N)"**.
- Bấm → `Modal.confirm`: *"Xóa N {itemLabel} đã chọn? Thao tác không hoàn tác."* → gọi API → thông báo:
  - không có dòng bị bỏ qua: *"Đã xóa N mục"*;
  - có: *"Đã xóa X mục, bỏ qua Y mục không xóa được"* (kiểu `warning`).
- Xóa xong → `clearSelection()` + `onDone()`.
- **Lựa chọn chỉ có hiệu lực trong trang đang xem**: trang gọi `clearSelection()` khi đổi trang, đổi bộ lọc / tìm kiếm, hoặc tải lại dữ liệu. Checkbox ở header = chọn tất cả dòng của trang hiện tại (mặc định của antd).

Mỗi trang: thêm `rowSelection` vào `<Table>`, đặt `bulkDeleteButton` vào thanh công cụ, gọi `clearSelection()` ở chỗ đổi trang/lọc/tải lại, và thêm hàm `deleteBatch` vào service FE tương ứng.

## Kiểm thử

**Backend** (Jest):
- `softDeleteBatch`: mảng rỗng → `{deleted: 0, skipped: 0}`; xóa 3 bản ghi → cả 3 `isActive = false`; `canDelete` chặn 1 → `{deleted: 2, skipped: 1}`; id không tồn tại → không tính vào `deleted`.
- Endpoint của 2 service tiêu biểu: **Bộ phận** (không guard) và **Đề xuất mua** (guard `DA_DUYET`/`DA_NHAN` → `skipped`).

**Frontend** (Vitest + Testing Library):
- `useBulkDelete`: `enabled = false` → không có `rowSelection`, không có nút; chọn 2 dòng → nút hiện "Xóa đã chọn (2)"; xác nhận → gọi `onDeleteBatch` đúng danh sách id, gọi `onDone`, xóa sạch lựa chọn; kết quả có `skipped` → thông báo nêu đúng số bị bỏ qua.
- Render thật trên một bảng antd: tick checkbox 2 dòng → bấm nút → API nhận đúng 2 id.

## Deploy

Chạm 5 service backend: **master-data, config, tax, kho, mam-non** — phải build và deploy cả 5, restart container.
