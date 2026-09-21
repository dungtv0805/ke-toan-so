# Thiết kế tính năng Khóa sổ

## Tổng quan

Tính năng Khóa sổ cho phép:
1. **Khóa sổ tự động** theo kỳ (ngày/tuần/tháng/quý/năm) vào giờ cố định
2. **Khóa sổ thủ công** theo loại chứng từ cụ thể

Khi đã khóa, người dùng không được sửa/xóa chứng từ có ngày phát sinh trước ngày khóa, trừ khi có quyền bypass.

## Quy tắc nghiệp vụ

### Khóa sổ tự động
- **Kỳ khóa**: NGAY, TUAN, THANG, QUY, NAM
- **Logic**: Khóa kỳ TRƯỚC thời điểm chạy
  - Daily 18:00 ngày 20/09 → khóa chứng từ có ngày ≤ 19/09
  - Weekly 18:00 Chủ nhật 22/09 → khóa ≤ 15/09 (tuần trước)
  - Monthly 18:00 ngày 01/10 → khóa ≤ 30/09 (tháng trước)
  - Quarterly 18:00 ngày 01/10 → khóa ≤ 30/06 (quý trước)
  - Yearly 18:00 ngày 01/01/2027 → khóa ≤ 31/12/2026

### Khóa sổ thủ công
- Chọn **Loại chứng từ** (từ danh mục LoaiChungTuMaster) hoặc TẤT CẢ
- Chọn **Chi nhánh** hoặc TẤT CẢ
- Chọn **Ngày khóa sổ** — khóa chứng từ có ngày ≤ ngày này
- **Người dùng bị khóa**: 
  - "Áp dụng tất cả" = tất cả bị khóa
  - "Chỉ người được chọn" = chỉ những người trong danh sách bị khóa
- **Diễn giải**: Ghi chú lý do khóa
- **Có xử lý chứng từ chưa ghi sổ**: Checkbox tùy chọn

### Kiểm tra khóa khi sửa/xóa chứng từ
1. Tìm tất cả bản ghi `KhoaSo` có:
   - `loaiChungTuMa` = mã loại chứng từ của bản ghi HOẶC null (tất cả)
   - `chiNhanhId` = chi nhánh của bản ghi HOẶC null (tất cả)
   - `ngayKhoaSo` >= ngày của chứng từ
2. Nếu tìm thấy → kiểm tra người dùng hiện tại:
   - Nếu `nguoiDungBiKhoa` = null → tất cả bị khóa
   - Nếu `nguoiDungBiKhoa` chứa userId hiện tại → bị khóa
   - Ngược lại → không bị khóa
3. Nếu bị khóa → kiểm tra quyền `khoa-so:bypass`:
   - Có quyền → cho phép sửa/xóa
   - Không có quyền → ForbiddenException

## Data Model

### Entity: KhoaSoCauHinh

```typescript
// libs/entities/src/khoa-so/khoa-so-cau-hinh.entity.ts
export type KyKhoaSo = 'NGAY' | 'TUAN' | 'THANG' | 'QUY' | 'NAM';

@Entity('khoa_so_cau_hinh')
export class KhoaSoCauHinh extends BaseEntity {
  @Column({ nullable: true })
  chiNhanhId?: string;  // null = tất cả chi nhánh

  @Column()
  kyKhoaSo: KyKhoaSo;

  @Column()
  gioThucHien: string;  // "18:00"

  @Column({ default: false })
  isActive: boolean;
}
```

### Entity: KhoaSo

```typescript
// libs/entities/src/khoa-so/khoa-so.entity.ts
export type NguonKhoaSo = 'TU_DONG' | 'THU_CONG';

@Entity('khoa_so')
export class KhoaSo extends BaseEntity {
  @Column({ nullable: true })
  loaiChungTuMa?: string;  // null = tất cả loại

  @Column({ nullable: true })
  chiNhanhId?: string;  // null = tất cả chi nhánh

  @Column()
  ngayKhoaSo: Date;  // Khóa chứng từ có ngày <= ngày này

  @Column({ type: 'simple-json', nullable: true })
  nguoiDungBiKhoa?: string[];  // null = tất cả, mảng userId = chỉ những người này

  @Column({ nullable: true })
  dienGiai?: string;

  @Column({ default: false })
  coXuLyChuaGhiSo: boolean;

  @Column()
  nguon: NguonKhoaSo;

  @Column()
  nguoiTaoId: string;
}
```

## API Design (config-service)

### Cấu hình tự động

```
GET  /khoa-so/cau-hinh
     → KhoaSoCauHinh | null

PUT  /khoa-so/cau-hinh
     Body: { chiNhanhId?, kyKhoaSo, gioThucHien, isActive }
     → KhoaSoCauHinh
```

### Bản ghi khóa sổ

```
GET  /khoa-so
     Query: { page, limit, loaiChungTuMa?, chiNhanhId? }
     → PaginatedResult<KhoaSo>

POST /khoa-so
     Body: { loaiChungTuMa?, chiNhanhId?, ngayKhoaSo, nguoiDungBiKhoa?, dienGiai?, coXuLyChuaGhiSo }
     → KhoaSo

DELETE /khoa-so/:id
     → { success: true }
```

### Kiểm tra khóa (internal - cho voucher-service gọi)

```
POST /khoa-so/kiem-tra
     Body: { loaiChungTuMa, chiNhanhId?, ngayChungTu, userId }
     → { biKhoa: boolean, lyDo?: string, khoaSoId?: string }
```

## Permission Keys

Thêm vào `libs/entities/src/config/permission-modules.ts`:

```typescript
{
  key: 'khoa-so',
  ten: 'Khóa sổ',
  quyen: [
    { key: 'khoa-so:xem', ten: 'Xem danh sách khóa sổ' },
    { key: 'khoa-so:them', ten: 'Tạo/cấu hình khóa sổ' },
    { key: 'khoa-so:xoa', ten: 'Bỏ khóa' },
    { key: 'khoa-so:bypass', ten: 'Sửa chứng từ đã khóa' },
  ],
}
```

## Tích hợp voucher-service

### File: `voucher-service/src/nhat-ky-chung/helpers/kiem-tra-khoa-so.helper.ts`

```typescript
export interface KetQuaKiemTraKhoaSo {
  choPhep: boolean;
  lyDo?: string;
}

export async function kiemTraKhoaSo(
  serviceClient: ServiceClientService,
  params: {
    loaiChungTuMa?: string;
    chiNhanhId?: string;
    ngayChungTu: Date;
    userId: string;
    userPermissions: string[];
  }
): Promise<KetQuaKiemTraKhoaSo> {
  // 1. Có quyền bypass → cho phép
  if (params.userPermissions.includes('khoa-so:bypass')) {
    return { choPhep: true };
  }
  
  // 2. Gọi config-service kiểm tra
  const result = await serviceClient.post('/khoa-so/kiem-tra', params);
  
  if (result.biKhoa) {
    return { 
      choPhep: false, 
      lyDo: `Chứng từ đã bị khóa sổ. ${result.lyDo || ''}` 
    };
  }
  
  return { choPhep: true };
}
```

### Cập nhật `nhat-ky-chung.service.ts`

Thêm gọi `kiemTraKhoaSo()` trong method `update()` và `delete()`, ngay sau `kiemTraQuyenSua()` / `kiemTraQuyenXoa()`.

## Cron Job

### File: `config-service/src/khoa-so/khoa-so.cron.ts`

- Chạy mỗi phút, kiểm tra có cấu hình nào đến giờ chưa
- Tính ngày khóa theo kỳ (kỳ trước)
- Tạo bản ghi `KhoaSo` với `nguon: 'TU_DONG'`

## Frontend

### Route: `/tong-hop/khoa-so`

### Components
1. **KhoaSoPage** — Trang chính với bảng danh sách
2. **ThietLapTuDongDialog** — Dialog cấu hình khóa tự động
3. **KhoaSoTheoLoaiDialog** — Dialog khóa thủ công theo loại chứng từ

### Handler Pattern
Theo HANDLER_GUIDE.md với CHanlder pattern.

### UI Elements (từ ảnh)

**Dialog "Thiết lập khóa sổ tự động":**
- Switch "Thực hiện khóa sổ tự động"
- Dropdown "Chi nhánh"
- Dropdown "Kỳ khóa sổ": Hàng ngày, Hàng tuần, Hàng tháng, Hàng quý, Hàng năm
- Dropdown "Thời gian thực hiện khóa sổ": Hàng ngày/tuần/...
- Dropdown "Lúc": Giờ (00:00 - 23:00)
- Buttons: Hủy, Đồng ý

**Dialog "Khóa sổ/Bỏ khóa sổ theo Loại chứng từ":**
- Dropdown "Loại chứng từ" (required)
- Dropdown "Chi nhánh" (required)
- DatePicker "Ngày khóa sổ" (required)
- Radio "Người dùng": Áp dụng tất cả / Chỉ người dùng được chọn
- (Khi chọn "Chỉ người dùng") MultiSelect người dùng
- Textarea "Diễn giải"
- Checkbox "Có xử lý chứng từ chưa ghi sổ"
- Switch "Thực hiện khóa sổ tự động" (hiển thị khi có cấu hình)
- Buttons: Hủy, Cất

## Files cần tạo/sửa

### Backend (BE)

**Mới:**
1. `libs/entities/src/khoa-so/khoa-so.entity.ts`
2. `libs/entities/src/khoa-so/khoa-so-cau-hinh.entity.ts`
3. `libs/entities/src/khoa-so/index.ts`
4. `libs/dto/src/khoa-so/khoa-so.dto.ts`
5. `apps/config-service/src/khoa-so/khoa-so.module.ts`
6. `apps/config-service/src/khoa-so/khoa-so.controller.ts`
7. `apps/config-service/src/khoa-so/khoa-so.service.ts`
8. `apps/config-service/src/khoa-so/khoa-so.cron.ts`
9. `apps/voucher-service/src/nhat-ky-chung/helpers/kiem-tra-khoa-so.helper.ts`

**Sửa:**
10. `libs/entities/src/index.ts` — export khoa-so
11. `libs/entities/src/config/permission-modules.ts` — thêm permission
12. `apps/config-service/src/config-service.module.ts` — import KhoaSoModule
13. `apps/config-service/src/main.ts` — đăng ký route gateway
14. `apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts` — gọi kiemTraKhoaSo

### Frontend (FE)

**Mới:**
15. `src/services/khoaSoService.ts`
16. `src/pages/tong-hop/khoa-so/` — full handler pattern
17. `src/pages/tong-hop/khoa-so/KhoaSoPage.tsx`
18. `src/pages/tong-hop/khoa-so/khoaSoHandler.ts`
19. `src/pages/tong-hop/khoa-so/KhoaSoHandlerContext.tsx`
20. `src/pages/tong-hop/khoa-so/components/`
21. `src/pages/tong-hop/khoa-so/sub-handler/`

**Sửa:**
22. `src/config/menuCatalog.tsx` — status: 'active'
23. `src/pages/loadable.tsx` — lazy load
24. `src/App.tsx` — route

## Testing

- Unit test cho helper `kiemTraKhoaSo`
- Unit test cho cron logic tính ngày khóa
- Integration test cho API endpoints
