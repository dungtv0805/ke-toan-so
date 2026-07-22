# Import Excel cho toàn bộ Danh mục — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nút "Import Excel" + modal import cho 22 trang Danh mục, dùng chung một module import duy nhất được điều khiển bằng config.

**Architecture:** FE có một module `components/import-danh-muc/` viết theo pattern CHanlder (giống `pages/chung-tu/nhat-ky-chung/import/`), nhận một `ImportDanhMucConfig` mô tả cột Excel / kiểu dữ liệu / cột tham chiếu. Toàn bộ validate chạy ở FE lúc parse. BE thêm một controller import dùng chung ở master-data-service (và một bản tương ứng ở config-service cho Quy chuẩn), gọi lại `service.create()` sẵn có của từng danh mục nên tái dùng nguyên logic check trùng + tenant scoping.

**Tech Stack:** React 18 + TypeScript + Ant Design + Vite; `xlsx` để đọc file, `exceljs` để sinh file mẫu; Vitest cho test FE. NestJS 11 + class-validator + Jest cho BE.

## Global Constraints

- Spec nguồn: `docs/superpowers/specs/2026-07-22-import-danh-muc-design.md`.
- 22 danh mục trong phạm vi. **Số dư đầu kỳ nằm ngoài phạm vi** — không đụng tới.
- Dòng trùng mã: **báo lỗi ở bảng preview, không import**. Không ghi đè, không skip im lặng.
- Nút Import gate bằng `canCreate` (`usePagePermission(...).canCreate`). **Không thêm permission key mới.**
- Không sửa nút "Xuất Excel" hiện có (đang là nút chết) — ngoài phạm vi.
- **Gateway không cần sửa**: `be/apps/gateway/src/environments/environment.ts:64,69` route theo prefix `/master-data` và `/config` với `stripPrefix: true`, nên endpoint mới tự động đi qua.
- Mọi chuỗi hiển thị cho người dùng viết bằng tiếng Việt có dấu.
- Toàn bộ code mới đặt trong `fe/src/components/import-danh-muc/` (FE) và `be/apps/master-data-service/src/import-danh-muc/` + `be/apps/config-service/src/import-danh-muc/` (BE). **Không sửa 21 controller danh mục hiện có.**
- Lệnh test FE: `cd fe && npx vitest run <path>`. Lệnh test BE: `cd be && npx jest <path>`.

## File Structure

**FE — module dùng chung (mới):**

| File | Trách nhiệm |
|---|---|
| `fe/src/components/import-danh-muc/types.ts` | `ImportDanhMucConfig`, `ImportColumn`, `RefSpec`, `RowValidationResult` |
| `fe/src/components/import-danh-muc/lib/parseRows.ts` | array-of-arrays từ sheet → `RawImportRow[]`, map theo **tên header** |
| `fe/src/components/import-danh-muc/lib/validate.ts` | 4 nhóm kiểm tra + dựng payload gửi BE |
| `fe/src/components/import-danh-muc/lib/template.ts` | sinh file mẫu `.xlsx` từ config (exceljs) |
| `fe/src/components/import-danh-muc/import.handler.ts` | `ImportDanhMucHandler` |
| `fe/src/components/import-danh-muc/import.state.ts` | `ImportDanhMucStates` |
| `fe/src/components/import-danh-muc/ImportHandlerContext.tsx` | Provider + hooks |
| `fe/src/components/import-danh-muc/sub-handler/load-refs/` | nạp dữ liệu hiện có + danh mục tham chiếu |
| `fe/src/components/import-danh-muc/sub-handler/parse/` | đọc file → validate → đổ vào state |
| `fe/src/components/import-danh-muc/sub-handler/submit/` | gọi API import, xử lý `failed` |
| `fe/src/components/import-danh-muc/components/UploadStep.tsx` | tải file mẫu + chọn file |
| `fe/src/components/import-danh-muc/components/PreviewTable.tsx` | bảng preview + tô đỏ dòng lỗi |
| `fe/src/components/import-danh-muc/ImportDanhMucModal.tsx` | modal, nhận prop `config` |
| `fe/src/components/import-danh-muc/configs/*.config.ts` | 22 file config |
| `fe/src/services/importDanhMucService.ts` | gọi `POST {apiPrefix}/import/{resource}` |

**BE (mới):**

| File | Trách nhiệm |
|---|---|
| `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.ts` | map `resource` → `{ service, dtoClass, label }` |
| `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.service.ts` | chạy vòng lặp validate + create, gom kết quả |
| `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.controller.ts` | `POST /import/:resource` |
| `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.module.ts` | wiring |
| `be/apps/config-service/src/import-danh-muc/*` | bản tương ứng, chỉ đăng ký `quy-chuan` |

**Sửa:** `be/apps/master-data-service/src/master-data-service.module.ts` (thêm 1 import), `be/apps/config-service/src/config-service.module.ts` (thêm 1 import), và 22 file `*Page.tsx` trong `fe/src/pages/danh-muc/` (mỗi file ~8 dòng).

---

### Task 1: BE — service chạy import dùng chung (master-data)

**Files:**
- Create: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.types.ts`
- Create: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.service.ts`
- Test: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.service.spec.ts`

**Interfaces:**
- Consumes: không có (task đầu tiên).
- Produces: `ImportDanhMucService.importItems(entry: ImportEntry, items: Record<string, unknown>[]): Promise<ImportResult>` với
  `ImportEntry = { service: { create(dto: any): Promise<unknown> }; dtoClass: new () => object; label: string }`
  và `ImportResult = { created: number; failed: ImportFailure[] }`,
  `ImportFailure = { row: number; message: string }`.

- [ ] **Step 1: Viết file kiểu dữ liệu**

Tạo `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.types.ts`:

```typescript
export interface ImportEntry {
  /** Service danh mục tương ứng — dùng lại logic create() sẵn có (check trùng, tenant scoping). */
  service: { create(dto: any): Promise<unknown> };
  /** Class DTO tạo mới của danh mục đó, dùng để validate từng dòng. */
  dtoClass: new () => object;
  /** Tên tiếng Việt, dùng trong thông báo lỗi. */
  label: string;
}

export interface ImportFailure {
  /** Số dòng trong file Excel (1-based, đã gồm dòng header). */
  row: number;
  message: string;
}

export interface ImportResult {
  created: number;
  failed: ImportFailure[];
}
```

- [ ] **Step 2: Viết test thất bại**

Tạo `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.service.spec.ts`:

```typescript
import { IsNotEmpty, IsString } from 'class-validator';
import { ConflictException } from '@nestjs/common';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportEntry } from './import-danh-muc.types';

class FakeDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;
}

function makeEntry(create: jest.Mock): ImportEntry {
  return { service: { create }, dtoClass: FakeDto, label: 'Đơn vị tính' };
}

describe('ImportDanhMucService', () => {
  let service: ImportDanhMucService;

  beforeEach(() => {
    service = new ImportDanhMucService();
  });

  it('tạo hết các dòng hợp lệ và đếm đúng', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'x' });
    const result = await service.importItems(makeEntry(create), [
      { ma: 'DVT01', ten: 'Cái' },
      { ma: 'DVT02', ten: 'Hộp' },
    ]);

    expect(create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ created: 2, failed: [] });
  });

  it('dòng sai DTO bị đẩy vào failed, không gọi create', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'x' });
    const result = await service.importItems(makeEntry(create), [
      { ma: '', ten: 'Cái' },
    ]);

    expect(create).not.toHaveBeenCalled();
    expect(result.created).toBe(0);
    expect(result.failed).toHaveLength(1);
    // dòng 1 của items = dòng 2 của file Excel (dòng 1 là header)
    expect(result.failed[0].row).toBe(2);
    expect(result.failed[0].message).toContain('ma');
  });

  it('dòng lỗi không chặn dòng sau, message lấy từ exception', async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce(new ConflictException('Mã đơn vị tính DVT01 đã tồn tại'))
      .mockResolvedValueOnce({ id: 'y' });

    const result = await service.importItems(makeEntry(create), [
      { ma: 'DVT01', ten: 'Cái' },
      { ma: 'DVT02', ten: 'Hộp' },
    ]);

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.created).toBe(1);
    expect(result.failed).toEqual([
      { row: 2, message: 'Mã đơn vị tính DVT01 đã tồn tại' },
    ]);
  });

  it('danh sách rỗng trả về created 0', async () => {
    const create = jest.fn();
    const result = await service.importItems(makeEntry(create), []);
    expect(result).toEqual({ created: 0, failed: [] });
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `cd be && npx jest apps/master-data-service/src/import-danh-muc/import-danh-muc.service.spec.ts`
Expected: FAIL — `Cannot find module './import-danh-muc.service'`

- [ ] **Step 4: Viết implementation**

Tạo `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ImportEntry,
  ImportFailure,
  ImportResult,
} from './import-danh-muc.types';

@Injectable()
export class ImportDanhMucService {
  private readonly logger = new Logger(ImportDanhMucService.name);

  /**
   * Chạy tuần tự từng dòng: validate theo DTO của danh mục rồi gọi service.create().
   * Tuần tự (không Promise.all) để check trùng mã trong cùng một lần import vẫn đúng —
   * create() của mỗi service tự query DB trước khi ghi.
   * Một dòng lỗi không chặn các dòng sau.
   */
  async importItems(
    entry: ImportEntry,
    items: Record<string, unknown>[],
  ): Promise<ImportResult> {
    const failed: ImportFailure[] = [];
    let created = 0;

    for (let i = 0; i < items.length; i++) {
      // items[0] là dòng 2 của file Excel vì dòng 1 là header
      const row = i + 2;
      const dto = plainToInstance(entry.dtoClass, items[i]);
      const errors = await validate(dto as object, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        failed.push({ row, message: this.formatValidationErrors(errors) });
        continue;
      }

      try {
        await entry.service.create(dto);
        created++;
      } catch (e) {
        const message =
          (e as { message?: string })?.message ??
          `Không tạo được ${entry.label}`;
        this.logger.warn(`Import ${entry.label} dòng ${row} lỗi: ${message}`);
        failed.push({ row, message });
      }
    }

    return { created, failed };
  }

  private formatValidationErrors(
    errors: { property: string; constraints?: Record<string, string> }[],
  ): string {
    return errors
      .map((e) => {
        const detail = e.constraints
          ? Object.values(e.constraints).join(', ')
          : 'không hợp lệ';
        return `${e.property}: ${detail}`;
      })
      .join('; ');
  }
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `cd be && npx jest apps/master-data-service/src/import-danh-muc/import-danh-muc.service.spec.ts`
Expected: PASS — 4 passed

- [ ] **Step 6: Commit**

```bash
git add be/apps/master-data-service/src/import-danh-muc/
git commit -m "feat(import-danh-muc): service chạy import dùng chung cho master-data"
```

---

### Task 2: BE — registry + controller import (master-data)

**Files:**
- Create: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.ts`
- Create: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.controller.ts`
- Test: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.spec.ts`
- Create: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.module.ts`
- Create: `be/apps/master-data-service/src/import-danh-muc/dto/import-items.dto.ts`
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`
- Test: `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.controller.spec.ts`

**Interfaces:**
- Consumes: `ImportDanhMucService.importItems(entry, items)` từ Task 1.
- Produces: `POST /import/:resource` (qua gateway là `POST /api/master-data/import/:resource`), body `{ items: Record<string, unknown>[] }`, trả `{ success: true, data: { created: number, failed: [{ row, message }] } }`. Resource không đăng ký → `404`.

- [ ] **Step 1: Viết DTO body**

Tạo `be/apps/master-data-service/src/import-danh-muc/dto/import-items.dto.ts`:

```typescript
import { IsArray, ArrayMaxSize } from 'class-validator';

export class ImportItemsDto {
  @IsArray()
  @ArrayMaxSize(2000, { message: 'Mỗi lần import tối đa 2000 dòng' })
  items: Record<string, unknown>[];
}
```

- [ ] **Step 2: Viết test thất bại cho controller**

Tạo `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.controller.spec.ts`:

```typescript
import { NotFoundException } from '@nestjs/common';
import { ImportDanhMucController } from './import-danh-muc.controller';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportDanhMucRegistry } from './import-danh-muc.registry';
import { ImportEntry } from './import-danh-muc.types';

describe('ImportDanhMucController', () => {
  const entry = {
    service: { create: jest.fn() },
    dtoClass: class {},
    label: 'Đơn vị tính',
  } as unknown as ImportEntry;

  function makeController(importItems: jest.Mock) {
    const importService = { importItems } as unknown as ImportDanhMucService;
    const registry = {
      get: (resource: string) => (resource === 'don-vi-tinh' ? entry : undefined),
      resources: () => ['don-vi-tinh'],
    } as unknown as ImportDanhMucRegistry;
    return new ImportDanhMucController(importService, registry);
  }

  it('resource hợp lệ thì gọi importItems và bọc kết quả', async () => {
    const importItems = jest
      .fn()
      .mockResolvedValue({ created: 2, failed: [] });
    const controller = makeController(importItems);

    const res = await controller.importDanhMuc('don-vi-tinh', {
      items: [{ ma: 'DVT01', ten: 'Cái' }],
    });

    expect(importItems).toHaveBeenCalledWith(entry, [
      { ma: 'DVT01', ten: 'Cái' },
    ]);
    expect(res).toEqual({ success: true, data: { created: 2, failed: [] } });
  });

  it('resource lạ thì ném NotFoundException', async () => {
    const controller = makeController(jest.fn());

    await expect(
      controller.importDanhMuc('khong-ton-tai', { items: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('items rỗng vẫn trả created 0', async () => {
    const importItems = jest
      .fn()
      .mockResolvedValue({ created: 0, failed: [] });
    const controller = makeController(importItems);

    const res = await controller.importDanhMuc('don-vi-tinh', { items: [] });
    expect(res).toEqual({ success: true, data: { created: 0, failed: [] } });
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `cd be && npx jest apps/master-data-service/src/import-danh-muc/import-danh-muc.controller.spec.ts`
Expected: FAIL — `Cannot find module './import-danh-muc.controller'`

- [ ] **Step 4: Viết registry**

Registry là một provider riêng, gom toàn bộ 21 service danh mục. Tách khỏi controller để
controller chỉ nhận đúng 2 dependency — dễ test, và chỗ khai báo resource nằm gọn một chỗ.

Tạo `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ImportEntry } from './import-danh-muc.types';

import { TaiKhoanService } from '../tai-khoan/tai-khoan.service';
import { DoiTuongService } from '../doi-tuong/doi-tuong.service';
import { DuAnService } from '../du-an/du-an.service';
import { SanPhamService } from '../san-pham/san-pham.service';
import { HopDongService } from '../hop-dong/hop-dong.service';
import { BoPhanService } from '../bo-phan/bo-phan.service';
import { KhoanMucService } from '../khoan-muc/khoan-muc.service';
import { KhoService } from '../kho/kho.service';
import { HangHoaVatTuService } from '../hang-hoa-vat-tu/hang-hoa-vat-tu.service';
import { DonViTinhService } from '../don-vi-tinh/don-vi-tinh.service';
import { LyDoKhongHopLeService } from '../ly-do-khong-hop-le/ly-do-khong-hop-le.service';
import { NhomVatTuService } from '../nhom-vat-tu/nhom-vat-tu.service';
import { ChuDauTuService } from '../chu-dau-tu/chu-dau-tu.service';
import { NhomKhoanMucService } from '../nhom-khoan-muc/nhom-khoan-muc.service';
import { NganHangService } from '../ngan-hang/ngan-hang.service';
import { DongTienService } from '../dong-tien/dong-tien.service';
import { NhomKhuyenMaiService } from '../nhom-khuyen-mai/nhom-khuyen-mai.service';
import { NhomQuanLyService } from '../nhom-quan-ly/nhom-quan-ly.service';
import { LoaiChungTuService } from '../loai-chung-tu/loai-chung-tu.service';
import { LoaiGiaoDichService } from '../loai-giao-dich/loai-giao-dich.service';
import { HoSoChungTuService } from '../ho-so-chung-tu/ho-so-chung-tu.service';

import { CreateTaiKhoanDto } from '../tai-khoan/dto';
import { CreateDoiTuongDto } from '../doi-tuong/dto';
import { CreateDuAnDto } from '../du-an/dto';
import { CreateSanPhamDto } from '../san-pham/dto';
import { CreateHopDongDto } from '../hop-dong/dto';
import { CreateBoPhanDto } from '../bo-phan/dto';
import { CreateKhoanMucDto } from '../khoan-muc/dto';
import { CreateKhoDto } from '../kho/dto';
import { CreateHangHoaVatTuDto } from '../hang-hoa-vat-tu/dto';
import { CreateDonViTinhDto } from '../don-vi-tinh/dto';
import { CreateLyDoKhongHopLeDto } from '../ly-do-khong-hop-le/dto';
import { CreateNhomVatTuDto } from '../nhom-vat-tu/dto';
import { CreateChuDauTuDto } from '../chu-dau-tu/dto';
import { CreateNhomKhoanMucDto } from '../nhom-khoan-muc/dto';
import { CreateNganHangDto } from '../ngan-hang/dto';
import { CreateDongTienDto } from '../dong-tien/dto';
import { CreateNhomKhuyenMaiDto } from '../nhom-khuyen-mai/dto';
import { CreateNhomQuanLyDto } from '../nhom-quan-ly/dto';
import { CreateLoaiChungTuDto } from '../loai-chung-tu/dto';
import { CreateLoaiGiaoDichDto } from '../loai-giao-dich/dto';
import { CreateHoSoChungTuDto } from '../ho-so-chung-tu/dto';

@Injectable()
export class ImportDanhMucRegistry {
  private readonly entries: Map<string, ImportEntry>;

  constructor(
    taiKhoan: TaiKhoanService,
    doiTuong: DoiTuongService,
    duAn: DuAnService,
    sanPham: SanPhamService,
    hopDong: HopDongService,
    boPhan: BoPhanService,
    khoanMuc: KhoanMucService,
    kho: KhoService,
    hangHoaVatTu: HangHoaVatTuService,
    donViTinh: DonViTinhService,
    lyDoKhongHopLe: LyDoKhongHopLeService,
    nhomVatTu: NhomVatTuService,
    chuDauTu: ChuDauTuService,
    nhomKhoanMuc: NhomKhoanMucService,
    nganHang: NganHangService,
    dongTien: DongTienService,
    nhomKhuyenMai: NhomKhuyenMaiService,
    nhomQuanLy: NhomQuanLyService,
    loaiChungTu: LoaiChungTuService,
    loaiGiaoDich: LoaiGiaoDichService,
    hoSoChungTu: HoSoChungTuService,
  ) {
    this.entries = new Map<string, ImportEntry>([
      ['tai-khoan', { service: taiKhoan, dtoClass: CreateTaiKhoanDto, label: 'Tài khoản' }],
      ['doi-tuong', { service: doiTuong, dtoClass: CreateDoiTuongDto, label: 'Đối tượng' }],
      ['du-an', { service: duAn, dtoClass: CreateDuAnDto, label: 'Dự án' }],
      ['san-pham', { service: sanPham, dtoClass: CreateSanPhamDto, label: 'Sản phẩm' }],
      ['hop-dong', { service: hopDong, dtoClass: CreateHopDongDto, label: 'Hợp đồng' }],
      ['bo-phan', { service: boPhan, dtoClass: CreateBoPhanDto, label: 'Bộ phận' }],
      ['khoan-muc', { service: khoanMuc, dtoClass: CreateKhoanMucDto, label: 'Khoản mục' }],
      ['kho', { service: kho, dtoClass: CreateKhoDto, label: 'Kho' }],
      ['hang-hoa-vat-tu', { service: hangHoaVatTu, dtoClass: CreateHangHoaVatTuDto, label: 'Hàng hóa vật tư' }],
      ['don-vi-tinh', { service: donViTinh, dtoClass: CreateDonViTinhDto, label: 'Đơn vị tính' }],
      ['ly-do-khong-hop-le', { service: lyDoKhongHopLe, dtoClass: CreateLyDoKhongHopLeDto, label: 'Lý do không hợp lệ' }],
      ['nhom-vat-tu', { service: nhomVatTu, dtoClass: CreateNhomVatTuDto, label: 'Nhóm vật tư' }],
      ['chu-dau-tu', { service: chuDauTu, dtoClass: CreateChuDauTuDto, label: 'Chủ đầu tư' }],
      ['nhom-khoan-muc', { service: nhomKhoanMuc, dtoClass: CreateNhomKhoanMucDto, label: 'Nhóm khoản mục' }],
      ['ngan-hang', { service: nganHang, dtoClass: CreateNganHangDto, label: 'Ngân hàng & Quỹ' }],
      ['dong-tien', { service: dongTien, dtoClass: CreateDongTienDto, label: 'Dòng tiền' }],
      ['nhom-khuyen-mai', { service: nhomKhuyenMai, dtoClass: CreateNhomKhuyenMaiDto, label: 'Nhóm khuyến mại' }],
      ['nhom-quan-ly', { service: nhomQuanLy, dtoClass: CreateNhomQuanLyDto, label: 'Nhóm quản lý' }],
      ['loai-chung-tu', { service: loaiChungTu, dtoClass: CreateLoaiChungTuDto, label: 'Loại chứng từ' }],
      ['loai-giao-dich', { service: loaiGiaoDich, dtoClass: CreateLoaiGiaoDichDto, label: 'Loại giao dịch' }],
      ['ho-so-chung-tu', { service: hoSoChungTu, dtoClass: CreateHoSoChungTuDto, label: 'Hồ sơ chứng từ' }],
    ]);
  }

  /** Trả về entry của resource, hoặc undefined nếu resource không được hỗ trợ. */
  get(resource: string): ImportEntry | undefined {
    return this.entries.get(resource);
  }

  /** Danh sách resource đang hỗ trợ — dùng cho test và thông báo lỗi. */
  resources(): string[] {
    return [...this.entries.keys()];
  }
}
```

**Lưu ý:** nếu import DTO từ `'../<module>/dto'` báo không tìm thấy, mở `dto/index.ts` của module
đó xem tên export thật rồi sửa cho khớp.

- [ ] **Step 4b: Viết test cho registry**

Tạo `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.spec.ts`:

```typescript
import { ImportDanhMucRegistry } from './import-danh-muc.registry';

describe('ImportDanhMucRegistry', () => {
  /** 21 service giả, chỉ cần có create() vì registry không gọi gì khác. */
  const fakes = Array.from({ length: 21 }, () => ({ create: jest.fn() }));
  const registry = new ImportDanhMucRegistry(
    ...(fakes as unknown as ConstructorParameters<typeof ImportDanhMucRegistry>),
  );

  it('đăng ký đủ 21 danh mục', () => {
    expect(registry.resources()).toHaveLength(21);
  });

  it('mỗi entry có đủ service, dtoClass và label', () => {
    for (const resource of registry.resources()) {
      const entry = registry.get(resource)!;
      expect(entry.service).toBeDefined();
      expect(typeof entry.dtoClass).toBe('function');
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('resource không đăng ký trả về undefined', () => {
    expect(registry.get('khong-ton-tai')).toBeUndefined();
  });

  it('ghép đúng service theo thứ tự tham số constructor', () => {
    // tham số đầu tiên là TaiKhoanService, cuối cùng là HoSoChungTuService
    expect(registry.get('tai-khoan')!.service).toBe(fakes[0]);
    expect(registry.get('ho-so-chung-tu')!.service).toBe(fakes[20]);
  });
});
```

Run: `cd be && npx jest apps/master-data-service/src/import-danh-muc/import-danh-muc.registry.spec.ts`
Expected: PASS — 4 passed.

- [ ] **Step 5: Viết controller**

Tạo `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.controller.ts`:

```typescript
import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportDanhMucRegistry } from './import-danh-muc.registry';
import { ImportItemsDto } from './dto/import-items.dto';

@Controller('import')
@UseGuards(JwtGuard, RoleGuard)
export class ImportDanhMucController {
  constructor(
    private readonly importService: ImportDanhMucService,
    private readonly registry: ImportDanhMucRegistry,
  ) {}

  @Post(':resource')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async importDanhMuc(
    @Param('resource') resource: string,
    @Body() dto: ImportItemsDto,
  ) {
    const entry = this.registry.get(resource);
    if (!entry) {
      throw new NotFoundException(`Không hỗ trợ import danh mục "${resource}"`);
    }
    const data = await this.importService.importItems(entry, dto.items ?? []);
    return { success: true, data };
  }
}
```

- [ ] **Step 6: Viết module**

Tạo `be/apps/master-data-service/src/import-danh-muc/import-danh-muc.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ImportDanhMucController } from './import-danh-muc.controller';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportDanhMucRegistry } from './import-danh-muc.registry';

import { TaiKhoanModule } from '../tai-khoan/tai-khoan.module';
import { DoiTuongModule } from '../doi-tuong/doi-tuong.module';
import { DuAnModule } from '../du-an/du-an.module';
import { SanPhamModule } from '../san-pham/san-pham.module';
import { HopDongModule } from '../hop-dong/hop-dong.module';
import { BoPhanModule } from '../bo-phan/bo-phan.module';
import { KhoanMucModule } from '../khoan-muc/khoan-muc.module';
import { KhoModule } from '../kho/kho.module';
import { HangHoaVatTuModule } from '../hang-hoa-vat-tu/hang-hoa-vat-tu.module';
import { DonViTinhModule } from '../don-vi-tinh/don-vi-tinh.module';
import { LyDoKhongHopLeModule } from '../ly-do-khong-hop-le/ly-do-khong-hop-le.module';
import { NhomVatTuModule } from '../nhom-vat-tu/nhom-vat-tu.module';
import { ChuDauTuModule } from '../chu-dau-tu/chu-dau-tu.module';
import { NhomKhoanMucModule } from '../nhom-khoan-muc/nhom-khoan-muc.module';
import { NganHangModule } from '../ngan-hang/ngan-hang.module';
import { DongTienModule } from '../dong-tien/dong-tien.module';
import { NhomKhuyenMaiModule } from '../nhom-khuyen-mai/nhom-khuyen-mai.module';
import { NhomQuanLyModule } from '../nhom-quan-ly/nhom-quan-ly.module';
import { LoaiChungTuModule } from '../loai-chung-tu/loai-chung-tu.module';
import { LoaiGiaoDichModule } from '../loai-giao-dich/loai-giao-dich.module';
import { HoSoChungTuModule } from '../ho-so-chung-tu/ho-so-chung-tu.module';

@Module({
  imports: [
    TaiKhoanModule,
    DoiTuongModule,
    DuAnModule,
    SanPhamModule,
    HopDongModule,
    BoPhanModule,
    KhoanMucModule,
    KhoModule,
    HangHoaVatTuModule,
    DonViTinhModule,
    LyDoKhongHopLeModule,
    NhomVatTuModule,
    ChuDauTuModule,
    NhomKhoanMucModule,
    NganHangModule,
    DongTienModule,
    NhomKhuyenMaiModule,
    NhomQuanLyModule,
    LoaiChungTuModule,
    LoaiGiaoDichModule,
    HoSoChungTuModule,
  ],
  controllers: [ImportDanhMucController],
  providers: [ImportDanhMucService, ImportDanhMucRegistry],
})
export class ImportDanhMucModule {}
```

- [ ] **Step 7: Kiểm tra mọi module đều export service**

Run: `cd be && grep -L "exports:" apps/master-data-service/src/{tai-khoan,doi-tuong,du-an,san-pham,hop-dong,bo-phan,khoan-muc,kho,hang-hoa-vat-tu,don-vi-tinh,ly-do-khong-hop-le,nhom-vat-tu,chu-dau-tu,nhom-khoan-muc,ngan-hang,dong-tien,nhom-khuyen-mai,nhom-quan-ly,loai-chung-tu,loai-giao-dich,ho-so-chung-tu}/*.module.ts`
Expected: không in ra file nào. File nào bị in ra thì mở file đó, thêm `exports: [XxxService],` vào decorator `@Module`.

- [ ] **Step 8: Đăng ký module vào root module**

Trong `be/apps/master-data-service/src/master-data-service.module.ts`, thêm dòng import cạnh các import module khác:

```typescript
import { ImportDanhMucModule } from './import-danh-muc/import-danh-muc.module';
```

và thêm `ImportDanhMucModule,` vào cuối mảng `imports` của `@Module`.

- [ ] **Step 9: Chạy test để xác nhận PASS**

Run: `cd be && npx jest apps/master-data-service/src/import-danh-muc/`
Expected: PASS — 11 passed (4 service + 4 registry + 3 controller)

- [ ] **Step 10: Build BE để chắc chắn không lỗi type**

Run: `cd be && npx nest build master-data-service`
Expected: build thành công, không có lỗi TypeScript.

- [ ] **Step 11: Commit**

```bash
git add be/apps/master-data-service/src/import-danh-muc/ be/apps/master-data-service/src/master-data-service.module.ts
git commit -m "feat(import-danh-muc): endpoint POST /import/:resource ở master-data-service"
```

---

### Task 3: BE — endpoint import cho Quy chuẩn hạch toán (config-service)

**Files:**
- Create: `be/apps/config-service/src/import-danh-muc/import-danh-muc.types.ts`
- Create: `be/apps/config-service/src/import-danh-muc/import-danh-muc.service.ts`
- Create: `be/apps/config-service/src/import-danh-muc/import-danh-muc.controller.ts`
- Create: `be/apps/config-service/src/import-danh-muc/import-danh-muc.module.ts`
- Create: `be/apps/config-service/src/import-danh-muc/dto/import-items.dto.ts`
- Modify: `be/apps/config-service/src/config-service.module.ts`

**Interfaces:**
- Consumes: cùng hình dạng `ImportEntry` / `ImportResult` như Task 1 (copy sang config-service — hai app build độc lập, không chia sẻ code app-level).
- Produces: `POST /import/quy-chuan` (qua gateway: `POST /api/config/import/quy-chuan`), body và response giống hệt Task 2.

- [ ] **Step 1: Copy 3 file nền từ master-data sang**

Run:
```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
mkdir -p be/apps/config-service/src/import-danh-muc/dto
cp be/apps/master-data-service/src/import-danh-muc/import-danh-muc.types.ts be/apps/config-service/src/import-danh-muc/
cp be/apps/master-data-service/src/import-danh-muc/import-danh-muc.service.ts be/apps/config-service/src/import-danh-muc/
cp be/apps/master-data-service/src/import-danh-muc/dto/import-items.dto.ts be/apps/config-service/src/import-danh-muc/dto/
```

Ba file này không tham chiếu gì riêng của master-data nên copy nguyên là chạy được.

- [ ] **Step 2: Xác nhận tên export của service và DTO Quy chuẩn**

Run: `cd be && grep -n "export class" apps/config-service/src/quy-chuan/quy-chuan.service.ts apps/config-service/src/quy-chuan/dto/create-quy-chuan.dto.ts && grep -n "exports:" apps/config-service/src/quy-chuan/quy-chuan.module.ts`
Expected: thấy `export class QuyChuanService` (hoặc tên tương đương) và `export class CreateQuyChuan_Dto`. Nếu `quy-chuan.module.ts` không có dòng `exports:`, thêm `exports: [QuyChuanService],` vào `@Module`.

- [ ] **Step 3: Viết controller**

Tạo `be/apps/config-service/src/import-danh-muc/import-danh-muc.controller.ts` — dùng đúng tên class lấy được ở Step 2:

```typescript
import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportEntry } from './import-danh-muc.types';
import { ImportItemsDto } from './dto/import-items.dto';
import { QuyChuanService } from '../quy-chuan/quy-chuan.service';
import { CreateQuyChuan_Dto } from '../quy-chuan/dto';

@Controller('import')
@UseGuards(JwtGuard, RoleGuard)
export class ImportDanhMucController {
  private registry: Map<string, ImportEntry>;

  constructor(
    private readonly importService: ImportDanhMucService,
    quyChuan?: QuyChuanService,
  ) {
    this.registry = new Map<string, ImportEntry>([
      [
        'quy-chuan',
        {
          service: quyChuan,
          dtoClass: CreateQuyChuan_Dto,
          label: 'Quy chuẩn hạch toán',
        },
      ],
    ] as [string, ImportEntry][]);
  }

  @Post(':resource')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async importDanhMuc(
    @Param('resource') resource: string,
    @Body() dto: ImportItemsDto,
  ) {
    const entry = this.registry.get(resource);
    if (!entry) {
      throw new NotFoundException(`Không hỗ trợ import danh mục "${resource}"`);
    }
    const data = await this.importService.importItems(entry, dto.items ?? []);
    return { success: true, data };
  }
}
```

- [ ] **Step 4: Viết module và đăng ký**

Tạo `be/apps/config-service/src/import-danh-muc/import-danh-muc.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ImportDanhMucController } from './import-danh-muc.controller';
import { ImportDanhMucService } from './import-danh-muc.service';
import { QuyChuanModule } from '../quy-chuan/quy-chuan.module';

@Module({
  imports: [QuyChuanModule],
  controllers: [ImportDanhMucController],
  providers: [ImportDanhMucService],
})
export class ImportDanhMucModule {}
```

Trong `be/apps/config-service/src/config-service.module.ts`, thêm:

```typescript
import { ImportDanhMucModule } from './import-danh-muc/import-danh-muc.module';
```

và thêm `ImportDanhMucModule,` vào mảng `imports`.

- [ ] **Step 5: Build config-service**

Run: `cd be && npx nest build config-service`
Expected: build thành công, không lỗi TypeScript.

- [ ] **Step 6: Commit**

```bash
git add be/apps/config-service/src/import-danh-muc/ be/apps/config-service/src/config-service.module.ts
git commit -m "feat(import-danh-muc): endpoint import cho Quy chuẩn hạch toán ở config-service"
```

---

### Task 4: FE — kiểu dữ liệu config

**Files:**
- Create: `fe/src/components/import-danh-muc/types.ts`

**Interfaces:**
- Consumes: không có.
- Produces: `ImportDanhMucConfig`, `ImportColumn`, `RefSpec`, `RawImportRow`, `RowValidationResult`, `ValidateOutcome` — mọi task FE sau đều import từ đây.

- [ ] **Step 1: Viết file kiểu dữ liệu**

Tạo `fe/src/components/import-danh-muc/types.ts`:

```typescript
/** Một bản ghi danh mục tham chiếu (kết quả getAll của service khác). */
export interface RefItem {
  id?: string;
  [key: string]: unknown;
}

export interface RefSpec {
  /** Service của danh mục được tham chiếu. */
  service: { getAll(): Promise<RefItem[]> };
  /** Trường dùng để dò khớp với giá trị trong ô Excel, thường là "ma". */
  matchBy: string;
  /** Tên hiển thị trong thông báo lỗi, ví dụ "Chủ đầu tư". */
  label: string;
  /** Trường hiển thị kèm mã trong danh sách thả xuống của file mẫu. */
  displayField?: string;
  /** Cho phép nhiều giá trị ngăn cách bằng dấu phẩy. */
  multi?: boolean;
  /**
   * Ánh xạ bản ghi dò được → các trường của DTO gửi lên BE.
   * Với `multi: true`, tham số là mảng các bản ghi dò được.
   */
  assign: (found: RefItem | RefItem[]) => Record<string, unknown>;
}

export type ImportColumnType =
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'enumList';

export interface ImportColumn {
  /** Định danh cột. Nếu không có `ref`, đây cũng là tên trường trong DTO. */
  key: string;
  /** Tiêu đề cột trong file Excel — dùng để dò header, phải khớp chính xác. */
  header: string;
  required?: boolean;
  type?: ImportColumnType;
  /** Bắt buộc khi type là 'enum' hoặc 'enumList'. Excel nhận cả label lẫn value. */
  enumValues?: { label: string; value: string }[];
  ref?: RefSpec;
  /** Giá trị mẫu ghi vào dòng ví dụ của file template. */
  example?: string;
}

export interface ImportDanhMucConfig {
  /** Tên danh mục, dùng cho tiêu đề modal và tên file mẫu. */
  title: string;
  /** Đoạn cuối URL import, khớp với registry phía BE. */
  resource: string;
  /** Mặc định '/master-data'. Quy chuẩn hạch toán dùng '/config'. */
  apiPrefix?: string;
  /** Service của chính danh mục này — dùng để lấy dữ liệu hiện có mà dò trùng. */
  service: { getAll(): Promise<RefItem[]> };
  /** Các key tạo nên khóa trùng. Hầu hết là ['ma']; Quy chuẩn là ['loaiGiaoDich','nghiepVu']. */
  uniqueBy: string[];
  columns: ImportColumn[];
}

/** Một dòng đọc từ sheet, giá trị đã trim về chuỗi (trừ ô ngày dạng serial). */
export interface RawImportRow {
  /** Số dòng theo Excel (1-based, dòng 1 là header). */
  rowNumber: number;
  values: Record<string, string | number>;
}

export interface RowValidationResult {
  rowNumber: number;
  /** Giá trị hiển thị lại trên bảng preview (2 cột đầu của config). */
  display: string;
  errors: string[];
  /** Payload gửi lên BE; null nếu dòng có lỗi. */
  payload: Record<string, unknown> | null;
}

export interface ValidateOutcome {
  results: RowValidationResult[];
  validItems: Record<string, unknown>[];
  hasErrors: boolean;
}
```

- [ ] **Step 2: Kiểm tra type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json`
Expected: không có lỗi liên quan tới `types.ts` (các lỗi sẵn có ở file khác, nếu có, thì bỏ qua — ghi lại để so sánh ở các task sau).

- [ ] **Step 3: Commit**

```bash
git add fe/src/components/import-danh-muc/types.ts
git commit -m "feat(import-danh-muc): kiểu dữ liệu config cho module import dùng chung"
```

---

### Task 5: FE — đọc sheet thành dòng dữ liệu

**Files:**
- Create: `fe/src/components/import-danh-muc/lib/parseRows.ts`
- Test: `fe/src/components/import-danh-muc/lib/__tests__/parseRows.test.ts`

**Interfaces:**
- Consumes: `ImportColumn`, `RawImportRow` từ `../types`.
- Produces:
  - `findMissingHeaders(aoa: unknown[][], columns: ImportColumn[]): string[]`
  - `aoaToRawRows(aoa: unknown[][], columns: ImportColumn[]): RawImportRow[]`

Khác với import Nhật ký chung (map theo vị trí cột), ở đây map theo **tên header** để người dùng đổi thứ tự cột hoặc thêm cột ghi chú riêng vẫn import được.

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/components/import-danh-muc/lib/__tests__/parseRows.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { aoaToRawRows, findMissingHeaders } from "../parseRows";
import type { ImportColumn } from "../../types";

const columns: ImportColumn[] = [
  { key: "ma", header: "Mã đơn vị tính", required: true },
  { key: "ten", header: "Tên đơn vị tính", required: true },
  { key: "moTa", header: "Mô tả" },
];

describe("findMissingHeaders", () => {
  it("trả về rỗng khi file có đủ cột bắt buộc", () => {
    const aoa = [["Mã đơn vị tính", "Tên đơn vị tính", "Mô tả"]];
    expect(findMissingHeaders(aoa, columns)).toEqual([]);
  });

  it("chỉ báo thiếu cột bắt buộc, không báo cột tùy chọn", () => {
    const aoa = [["Tên đơn vị tính"]];
    expect(findMissingHeaders(aoa, columns)).toEqual(["Mã đơn vị tính"]);
  });

  it("bỏ qua khác biệt hoa thường và khoảng trắng thừa ở header", () => {
    const aoa = [["  mã đơn vị TÍNH ", "Tên đơn vị tính"]];
    expect(findMissingHeaders(aoa, columns)).toEqual([]);
  });

  it("file rỗng thì báo thiếu hết cột bắt buộc", () => {
    expect(findMissingHeaders([], columns)).toEqual([
      "Mã đơn vị tính",
      "Tên đơn vị tính",
    ]);
  });
});

describe("aoaToRawRows", () => {
  it("map theo tên header chứ không theo vị trí", () => {
    const aoa = [
      ["Mô tả", "Tên đơn vị tính", "Mã đơn vị tính"],
      ["ghi chú", "Cái", "DVT01"],
    ];
    const rows = aoaToRawRows(aoa, columns);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      rowNumber: 2,
      values: { ma: "DVT01", ten: "Cái", moTa: "ghi chú" },
    });
  });

  it("bỏ dòng trống hoàn toàn và giữ đúng rowNumber của các dòng còn lại", () => {
    const aoa = [
      ["Mã đơn vị tính", "Tên đơn vị tính", "Mô tả"],
      ["", "", ""],
      ["DVT02", "Hộp", ""],
    ];
    const rows = aoaToRawRows(aoa, columns);
    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
    expect(rows[0].values.ma).toBe("DVT02");
  });

  it("trim giá trị và ép về chuỗi", () => {
    const aoa = [
      ["Mã đơn vị tính", "Tên đơn vị tính"],
      ["  DVT03  ", 123],
    ];
    const rows = aoaToRawRows(aoa, columns);
    expect(rows[0].values.ma).toBe("DVT03");
    expect(rows[0].values.ten).toBe("123");
  });

  it("giữ nguyên số serial ở cột kiểu ngày", () => {
    const dateColumns: ImportColumn[] = [
      { key: "ma", header: "Mã dự án", required: true },
      { key: "ngayBatDau", header: "Ngày bắt đầu", type: "date" },
    ];
    const aoa = [
      ["Mã dự án", "Ngày bắt đầu"],
      ["DA01", 45870],
    ];
    const rows = aoaToRawRows(aoa, dateColumns);
    expect(rows[0].values.ngayBatDau).toBe(45870);
  });

  it("cột khai báo trong config nhưng không có trong file thì để chuỗi rỗng", () => {
    const aoa = [
      ["Mã đơn vị tính", "Tên đơn vị tính"],
      ["DVT04", "Kg"],
    ];
    const rows = aoaToRawRows(aoa, columns);
    expect(rows[0].values.moTa).toBe("");
  });

  it("file chỉ có header thì trả mảng rỗng", () => {
    expect(aoaToRawRows([["Mã đơn vị tính"]], columns)).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/components/import-danh-muc/lib/__tests__/parseRows.test.ts`
Expected: FAIL — không resolve được `../parseRows`

- [ ] **Step 3: Viết implementation**

Tạo `fe/src/components/import-danh-muc/lib/parseRows.ts`:

```typescript
import type { ImportColumn, RawImportRow } from "../types";

/** Chuẩn hoá header để so khớp: bỏ khoảng trắng thừa, không phân biệt hoa thường. */
const normalizeHeader = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Dò vị trí cột theo tên header. Cột không tìm thấy có index -1. */
function buildHeaderIndex(
  aoa: unknown[][],
  columns: ImportColumn[],
): Record<string, number> {
  const headerRow = (aoa[0] ?? []).map(normalizeHeader);
  const index: Record<string, number> = {};
  for (const col of columns) {
    index[col.key] = headerRow.indexOf(normalizeHeader(col.header));
  }
  return index;
}

/** Danh sách header bắt buộc mà file đang thiếu. Rỗng nghĩa là file hợp lệ để parse. */
export function findMissingHeaders(
  aoa: unknown[][],
  columns: ImportColumn[],
): string[] {
  const index = buildHeaderIndex(aoa ?? [], columns);
  return columns
    .filter((col) => col.required && index[col.key] === -1)
    .map((col) => col.header);
}

/**
 * Chuyển array-of-arrays đọc từ sheet → RawImportRow[].
 * Dòng 0 là header. Map theo TÊN header nên đổi thứ tự cột vẫn chạy đúng.
 * Ô của cột kiểu 'date' giữ nguyên số serial để bước validate tự quy đổi.
 * Dòng trống hoàn toàn bị bỏ qua nhưng rowNumber vẫn theo đúng vị trí trong file.
 */
export function aoaToRawRows(
  aoa: unknown[][],
  columns: ImportColumn[],
): RawImportRow[] {
  if (!aoa || aoa.length <= 1) return [];

  const index = buildHeaderIndex(aoa, columns);
  const rows: RawImportRow[] = [];

  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    const isEmpty = cells.every(
      (c) => c === undefined || c === null || String(c).trim() === "",
    );
    if (isEmpty) continue;

    const values: Record<string, string | number> = {};
    for (const col of columns) {
      const at = index[col.key];
      const cell = at === -1 ? "" : cells[at];
      if (col.type === "date" && typeof cell === "number") {
        values[col.key] = cell;
      } else {
        values[col.key] =
          cell === undefined || cell === null ? "" : String(cell).trim();
      }
    }
    rows.push({ rowNumber: r + 1, values });
  }

  return rows;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/components/import-danh-muc/lib/__tests__/parseRows.test.ts`
Expected: PASS — 11 passed

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/import-danh-muc/lib/parseRows.ts fe/src/components/import-danh-muc/lib/__tests__/parseRows.test.ts
git commit -m "feat(import-danh-muc): đọc sheet Excel thành dòng dữ liệu theo tên header"
```

---

### Task 6: FE — validate và dựng payload

**Files:**
- Create: `fe/src/components/import-danh-muc/lib/validate.ts`
- Test: `fe/src/components/import-danh-muc/lib/__tests__/validate.test.ts`

**Interfaces:**
- Consumes: `ImportDanhMucConfig`, `ImportColumn`, `RawImportRow`, `RefItem`, `RowValidationResult`, `ValidateOutcome` từ `../types`.
- Produces:
  - `type RefData = Record<string, RefItem[]>` — khóa là `column.key`
  - `validateAndBuild(rows: RawImportRow[], config: ImportDanhMucConfig, existing: RefItem[], refData: RefData): ValidateOutcome`
  - `excelSerialToISO(serial: number): string` (export để test riêng)

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/components/import-danh-muc/lib/__tests__/validate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateAndBuild, excelSerialToISO } from "../validate";
import type { ImportDanhMucConfig, RawImportRow, RefItem } from "../../types";

const noopService = { getAll: async (): Promise<RefItem[]> => [] };

const simpleConfig: ImportDanhMucConfig = {
  title: "Đơn vị tính",
  resource: "don-vi-tinh",
  service: noopService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã đơn vị tính", required: true },
    { key: "ten", header: "Tên đơn vị tính", required: true },
    { key: "moTa", header: "Mô tả" },
  ],
};

const row = (rowNumber: number, values: Record<string, string | number>): RawImportRow => ({
  rowNumber,
  values,
});

describe("validateAndBuild — trường bắt buộc", () => {
  it("dòng đủ trường thì hợp lệ và dựng payload đúng", () => {
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái", moTa: "ghi chú" })],
      simpleConfig,
      [],
      {},
    );
    expect(out.hasErrors).toBe(false);
    expect(out.validItems).toEqual([{ ma: "DVT01", ten: "Cái", moTa: "ghi chú" }]);
  });

  it("thiếu trường bắt buộc thì báo lỗi và không có payload", () => {
    const out = validateAndBuild(
      [row(2, { ma: "", ten: "Cái", moTa: "" })],
      simpleConfig,
      [],
      {},
    );
    expect(out.hasErrors).toBe(true);
    expect(out.results[0].errors).toContain("Thiếu Mã đơn vị tính");
    expect(out.results[0].payload).toBeNull();
    expect(out.validItems).toEqual([]);
  });

  it("bỏ trường tùy chọn rỗng ra khỏi payload", () => {
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái", moTa: "" })],
      simpleConfig,
      [],
      {},
    );
    expect(out.validItems[0]).toEqual({ ma: "DVT01", ten: "Cái" });
  });
});

describe("validateAndBuild — trùng mã", () => {
  it("trùng với dữ liệu đã có trong hệ thống", () => {
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái" })],
      simpleConfig,
      [{ id: "1", ma: "dvt01", ten: "Cái cũ" }],
      {},
    );
    expect(out.results[0].errors).toContain("Mã đã tồn tại trong hệ thống");
  });

  it("trùng giữa hai dòng trong cùng file, báo ở dòng sau", () => {
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái" }), row(3, { ma: "DVT01", ten: "Hộp" })],
      simpleConfig,
      [],
      {},
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.results[1].errors).toContain("Mã bị trùng với dòng 2 trong file");
  });

  it("khóa trùng gồm nhiều cột thì phải trùng cả cụm mới báo lỗi", () => {
    const config: ImportDanhMucConfig = {
      ...simpleConfig,
      uniqueBy: ["loaiGiaoDich", "nghiepVu"],
      columns: [
        { key: "loaiGiaoDich", header: "Loại giao dịch", required: true },
        { key: "nghiepVu", header: "Nghiệp vụ", required: true },
      ],
    };
    const out = validateAndBuild(
      [
        row(2, { loaiGiaoDich: "THU", nghiepVu: "NV01" }),
        row(3, { loaiGiaoDich: "CHI", nghiepVu: "NV01" }),
      ],
      config,
      [],
      {},
    );
    expect(out.hasErrors).toBe(false);
  });
});

describe("validateAndBuild — kiểu dữ liệu", () => {
  const config: ImportDanhMucConfig = {
    ...simpleConfig,
    columns: [
      { key: "ma", header: "Mã", required: true },
      { key: "giaBan", header: "Giá bán", type: "number" },
      { key: "ngayBatDau", header: "Ngày bắt đầu", type: "date" },
      { key: "trangThai", header: "Trạng thái", type: "boolean" },
      {
        key: "loai",
        header: "Loại",
        type: "enum",
        enumValues: [
          { label: "Chi phí", value: "CHI_PHI" },
          { label: "Doanh thu", value: "DOANH_THU" },
        ],
      },
    ],
  };

  it("số hợp lệ được ép về number, bỏ dấu phân cách nghìn", () => {
    const out = validateAndBuild([row(2, { ma: "A", giaBan: "1.000.000" })], config, [], {});
    expect(out.validItems[0].giaBan).toBe(1000000);
  });

  it("số sai định dạng thì báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "A", giaBan: "abc" })], config, [], {});
    expect(out.results[0].errors).toContain("Giá bán phải là số");
  });

  it("ngày dạng dd/MM/yyyy được đổi sang ISO", () => {
    const out = validateAndBuild([row(2, { ma: "A", ngayBatDau: "01/06/2026" })], config, [], {});
    expect(out.validItems[0].ngayBatDau).toBe("2026-06-01");
  });

  it("ngày dạng serial của Excel được đổi sang ISO", () => {
    const out = validateAndBuild([row(2, { ma: "A", ngayBatDau: 46174 })], config, [], {});
    expect(out.validItems[0].ngayBatDau).toBe("2026-06-01");
  });

  it("ngày sai định dạng thì báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "A", ngayBatDau: "31/02/2026" })], config, [], {});
    expect(out.results[0].errors).toContain("Ngày bắt đầu không đúng định dạng ngày/tháng/năm");
  });

  it("enum nhận cả nhãn tiếng Việt lẫn giá trị", () => {
    const a = validateAndBuild([row(2, { ma: "A", loai: "Chi phí" })], config, [], {});
    const b = validateAndBuild([row(2, { ma: "A", loai: "DOANH_THU" })], config, [], {});
    expect(a.validItems[0].loai).toBe("CHI_PHI");
    expect(b.validItems[0].loai).toBe("DOANH_THU");
  });

  it("enum sai giá trị thì báo lỗi kèm danh sách cho phép", () => {
    const out = validateAndBuild([row(2, { ma: "A", loai: "XYZ" })], config, [], {});
    expect(out.results[0].errors[0]).toContain("Loại chỉ nhận:");
    expect(out.results[0].errors[0]).toContain("Chi phí");
  });

  it("boolean nhận Có/Không", () => {
    const out = validateAndBuild([row(2, { ma: "A", trangThai: "Có" })], config, [], {});
    expect(out.validItems[0].trangThai).toBe(true);
  });
});

describe("validateAndBuild — cột tham chiếu", () => {
  const config: ImportDanhMucConfig = {
    ...simpleConfig,
    columns: [
      { key: "ma", header: "Mã dự án", required: true },
      {
        key: "chuDauTu",
        header: "Mã chủ đầu tư",
        ref: {
          service: noopService,
          matchBy: "ma",
          label: "Chủ đầu tư",
          assign: (found) => ({ chuDauTuId: (found as RefItem).id }),
        },
      },
    ],
  };

  const refData = { chuDauTu: [{ id: "cdt-1", ma: "CDT01", ten: "Công ty A" }] };

  it("dò được mã thì gán id vào payload", () => {
    const out = validateAndBuild([row(2, { ma: "DA01", chuDauTu: "CDT01" })], config, [], refData);
    expect(out.validItems[0]).toEqual({ ma: "DA01", chuDauTuId: "cdt-1" });
  });

  it("dò không ra thì báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "DA01", chuDauTu: "XXX" })], config, [], refData);
    expect(out.results[0].errors).toContain('Chủ đầu tư "XXX" không tồn tại');
  });

  it("ô rỗng ở cột tham chiếu không bắt buộc thì bỏ qua, không báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "DA01", chuDauTu: "" })], config, [], refData);
    expect(out.hasErrors).toBe(false);
    expect(out.validItems[0]).toEqual({ ma: "DA01" });
  });

  it('nhận giá trị dạng "MÃ - Tên" do người dùng chọn từ danh sách thả xuống', () => {
    const out = validateAndBuild(
      [row(2, { ma: "DA01", chuDauTu: "CDT01 - Công ty A" })],
      config,
      [],
      refData,
    );
    expect(out.validItems[0].chuDauTuId).toBe("cdt-1");
  });

  it("cột tham chiếu nhiều giá trị tách theo dấu phẩy", () => {
    const multiConfig: ImportDanhMucConfig = {
      ...simpleConfig,
      columns: [
        { key: "ma", header: "Mã", required: true },
        {
          key: "hoSo",
          header: "Hồ sơ chứng từ",
          ref: {
            service: noopService,
            matchBy: "ma",
            label: "Hồ sơ chứng từ",
            multi: true,
            assign: (found) => ({
              hoSoChungTu: (found as RefItem[]).map((f) => ({
                id: f.id,
                ma: f.ma,
                ten: f.ten,
              })),
            }),
          },
        },
      ],
    };
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01, HS02" })],
      multiConfig,
      [],
      {
        hoSo: [
          { id: "1", ma: "HS01", ten: "Hóa đơn" },
          { id: "2", ma: "HS02", ten: "Phiếu nhập" },
        ],
      },
    );
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "1", ma: "HS01", ten: "Hóa đơn" },
      { id: "2", ma: "HS02", ten: "Phiếu nhập" },
    ]);
  });
});

describe("excelSerialToISO", () => {
  it("đổi serial 46174 thành 2026-06-01", () => {
    expect(excelSerialToISO(46174)).toBe("2026-06-01");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/components/import-danh-muc/lib/__tests__/validate.test.ts`
Expected: FAIL — không resolve được `../validate`

- [ ] **Step 3: Viết implementation**

Tạo `fe/src/components/import-danh-muc/lib/validate.ts`:

```typescript
import type {
  ImportColumn,
  ImportDanhMucConfig,
  RawImportRow,
  RefItem,
  RowValidationResult,
  ValidateOutcome,
} from "../types";

/** Dữ liệu danh mục tham chiếu, khóa là ImportColumn.key. */
export type RefData = Record<string, RefItem[]>;

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();

/**
 * Excel lưu ngày là số ngày kể từ 1899-12-30 (đã tính cả lỗi năm nhuận 1900 của Excel).
 * Quy đổi trực tiếp qua UTC để không lệch múi giờ.
 */
export function excelSerialToISO(serial: number): string {
  const ms = Math.round(serial) * 86400000;
  const base = Date.UTC(1899, 11, 30);
  return new Date(base + ms).toISOString().slice(0, 10);
}

/** Nhận "01/06/2026" hoặc "2026-06-01" → "2026-06-01". Không hợp lệ trả null. */
function parseDate(raw: string | number): string | null {
  if (typeof raw === "number") return excelSerialToISO(raw);

  const text = String(raw).trim();
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const ymd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  let y: number, m: number, d: number;
  if (dmy) {
    d = Number(dmy[1]);
    m = Number(dmy[2]);
    y = Number(dmy[3]);
  } else if (ymd) {
    y = Number(ymd[1]);
    m = Number(ymd[2]);
    d = Number(ymd[3]);
  } else {
    return null;
  }

  const dt = new Date(Date.UTC(y, m - 1, d));
  // chặn ngày không tồn tại như 31/02
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

/** "1.000.000" hoặc "1,000,000" hoặc "1000000" → 1000000. Không hợp lệ trả null. */
function parseNumber(raw: string | number): number | null {
  if (typeof raw === "number") return raw;
  const cleaned = String(raw).replace(/[.,\s]/g, "");
  if (cleaned === "" || !/^-?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Nhận Có/Không, true/false, 1/0, x. Không hợp lệ trả null. */
function parseBoolean(raw: string | number): boolean | null {
  const t = norm(raw);
  if (["có", "co", "true", "1", "x"].includes(t)) return true;
  if (["không", "khong", "false", "0"].includes(t)) return false;
  return null;
}

/** Ô có thể là "CDT01" hoặc "CDT01 - Công ty A" (do dropdown file mẫu). Lấy phần mã. */
function refKeyOf(raw: string): string {
  const idx = raw.indexOf(" - ");
  return (idx === -1 ? raw : raw.slice(0, idx)).trim();
}

function resolveEnum(col: ImportColumn, raw: string): string | null {
  const list = col.enumValues ?? [];
  const hit = list.find(
    (o) => norm(o.value) === norm(raw) || norm(o.label) === norm(raw),
  );
  return hit ? hit.value : null;
}

function enumHint(col: ImportColumn): string {
  const list = (col.enumValues ?? []).map((o) => o.label).join(", ");
  return `${col.header} chỉ nhận: ${list}`;
}

/**
 * Chạy 4 nhóm kiểm tra trên từng dòng và dựng payload gửi BE.
 * - `existing`: dữ liệu hiện có của chính danh mục (kết quả config.service.getAll())
 * - `refData`: dữ liệu các danh mục tham chiếu, khóa theo ImportColumn.key
 */
export function validateAndBuild(
  rows: RawImportRow[],
  config: ImportDanhMucConfig,
  existing: RefItem[],
  refData: RefData,
): ValidateOutcome {
  // khóa trùng của dữ liệu đã có trong hệ thống
  const existingKeys = new Set(
    existing.map((item) => config.uniqueBy.map((k) => norm(item[k])).join("|")),
  );
  // khóa trùng đã gặp trong chính file, ghi lại dòng đầu tiên
  const seenInFile = new Map<string, number>();

  const results: RowValidationResult[] = [];
  const validItems: Record<string, unknown>[] = [];

  for (const row of rows) {
    const errors: string[] = [];
    const payload: Record<string, unknown> = {};

    for (const col of config.columns) {
      const raw = row.values[col.key];
      const isBlank = raw === undefined || raw === null || String(raw).trim() === "";

      if (isBlank) {
        if (col.required) errors.push(`Thiếu ${col.header}`);
        continue;
      }

      if (col.ref) {
        const pool = refData[col.key] ?? [];
        const rawText = String(raw);
        if (col.ref.multi) {
          const keys = rawText.split(",").map((s) => refKeyOf(s)).filter(Boolean);
          const found: RefItem[] = [];
          for (const k of keys) {
            const hit = pool.find((p) => norm(p[col.ref!.matchBy]) === norm(k));
            if (!hit) errors.push(`${col.ref.label} "${k}" không tồn tại`);
            else found.push(hit);
          }
          if (found.length === keys.length && found.length > 0) {
            Object.assign(payload, col.ref.assign(found));
          }
        } else {
          const k = refKeyOf(rawText);
          const hit = pool.find((p) => norm(p[col.ref!.matchBy]) === norm(k));
          if (!hit) errors.push(`${col.ref.label} "${k}" không tồn tại`);
          else Object.assign(payload, col.ref.assign(hit));
        }
        continue;
      }

      switch (col.type) {
        case "number": {
          const n = parseNumber(raw);
          if (n === null) errors.push(`${col.header} phải là số`);
          else payload[col.key] = n;
          break;
        }
        case "date": {
          const d = parseDate(raw);
          if (d === null)
            errors.push(`${col.header} không đúng định dạng ngày/tháng/năm`);
          else payload[col.key] = d;
          break;
        }
        case "boolean": {
          const b = parseBoolean(raw);
          if (b === null) errors.push(`${col.header} chỉ nhận Có hoặc Không`);
          else payload[col.key] = b;
          break;
        }
        case "enum": {
          const v = resolveEnum(col, String(raw));
          if (v === null) errors.push(enumHint(col));
          else payload[col.key] = v;
          break;
        }
        case "enumList": {
          const parts = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
          const mapped: string[] = [];
          let bad = false;
          for (const p of parts) {
            const v = resolveEnum(col, p);
            if (v === null) bad = true;
            else mapped.push(v);
          }
          if (bad || mapped.length === 0) errors.push(enumHint(col));
          else payload[col.key] = mapped;
          break;
        }
        default:
          payload[col.key] = String(raw).trim();
      }
    }

    // kiểm tra trùng chỉ khi đã có đủ giá trị của các cột tạo khóa
    const keyParts = config.uniqueBy.map((k) => norm(row.values[k]));
    if (keyParts.every((p) => p !== "")) {
      const key = keyParts.join("|");
      if (existingKeys.has(key)) {
        errors.push("Mã đã tồn tại trong hệ thống");
      }
      const firstAt = seenInFile.get(key);
      if (firstAt !== undefined) {
        errors.push(`Mã bị trùng với dòng ${firstAt} trong file`);
      } else {
        seenInFile.set(key, row.rowNumber);
      }
    }

    const display = config.columns
      .slice(0, 2)
      .map((c) => String(row.values[c.key] ?? ""))
      .filter(Boolean)
      .join(" — ");

    results.push({
      rowNumber: row.rowNumber,
      display,
      errors,
      payload: errors.length === 0 ? payload : null,
    });
    if (errors.length === 0) validItems.push(payload);
  }

  return {
    results,
    validItems,
    hasErrors: results.some((r) => r.errors.length > 0),
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/components/import-danh-muc/lib/__tests__/validate.test.ts`
Expected: PASS — 20 passed

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/import-danh-muc/lib/validate.ts fe/src/components/import-danh-muc/lib/__tests__/validate.test.ts
git commit -m "feat(import-danh-muc): validate dòng Excel và dựng payload theo config"
```

---

### Task 7: FE — sinh file mẫu

**Files:**
- Create: `fe/src/components/import-danh-muc/lib/template.ts`
- Test: `fe/src/components/import-danh-muc/lib/__tests__/template.test.ts`

**Interfaces:**
- Consumes: `ImportDanhMucConfig`, `RefItem` từ `../types`; `RefData` từ `./validate`.
- Produces:
  - `buildTemplateWorkbook(config: ImportDanhMucConfig, refData: RefData): ExcelJS.Workbook`
  - `downloadTemplate(config: ImportDanhMucConfig, refData: RefData): Promise<void>`

File mẫu gồm sheet chính (header + 1 dòng ví dụ) và các sheet danh mục phụ để gắn dropdown, giống cách `pages/chung-tu/nhat-ky-chung/import/lib/template.ts` đang làm.

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/components/import-danh-muc/lib/__tests__/template.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildTemplateWorkbook } from "../template";
import type { ImportDanhMucConfig, RefItem } from "../../types";

const noopService = { getAll: async (): Promise<RefItem[]> => [] };

const config: ImportDanhMucConfig = {
  title: "Dự án",
  resource: "du-an",
  service: noopService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã dự án", required: true, example: "DA01" },
    { key: "ten", header: "Tên dự án", required: true, example: "Dự án A" },
    {
      key: "trangThai",
      header: "Trạng thái",
      type: "enum",
      enumValues: [
        { label: "Đang thực hiện", value: "DANG_THUC_HIEN" },
        { label: "Hoàn thành", value: "HOAN_THANH" },
      ],
      example: "Đang thực hiện",
    },
    {
      key: "chuDauTu",
      header: "Mã chủ đầu tư",
      example: "CDT01",
      ref: {
        service: noopService,
        matchBy: "ma",
        label: "Chủ đầu tư",
        displayField: "ten",
        assign: (f) => ({ chuDauTuId: (f as RefItem).id }),
      },
    },
  ],
};

const refData = { chuDauTu: [{ id: "1", ma: "CDT01", ten: "Công ty A" }] };

describe("buildTemplateWorkbook", () => {
  it("sheet đầu tiên có header đúng thứ tự config", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];
    const headers = (main.getRow(1).values as unknown[]).slice(1);
    expect(headers).toEqual([
      "Mã dự án",
      "Tên dự án",
      "Trạng thái",
      "Mã chủ đầu tư",
    ]);
  });

  it("có đúng một dòng ví dụ lấy từ example", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];
    const values = (main.getRow(2).values as unknown[]).slice(1);
    expect(values).toEqual(["DA01", "Dự án A", "Đang thực hiện", "CDT01"]);
    expect(main.rowCount).toBe(2);
  });

  it("tạo sheet danh sách cho cột enum và cột tham chiếu", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toContain("DS_trangThai");
    expect(names).toContain("DS_chuDauTu");
  });

  it('sheet tham chiếu ghi dạng "MÃ - Tên"', () => {
    const wb = buildTemplateWorkbook(config, refData);
    const ws = wb.getWorksheet("DS_chuDauTu")!;
    expect(ws.getCell("A1").value).toBe("CDT01 - Công ty A");
  });

  it("sheet enum ghi nhãn tiếng Việt", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const ws = wb.getWorksheet("DS_trangThai")!;
    expect(ws.getCell("A1").value).toBe("Đang thực hiện");
    expect(ws.getCell("A2").value).toBe("Hoàn thành");
  });

  it("gắn data validation cho cột enum ở dòng dữ liệu", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];
    expect(main.getCell(2, 3).dataValidation?.type).toBe("list");
  });

  it("config không có cột enum/ref thì chỉ có 1 sheet", () => {
    const plain: ImportDanhMucConfig = {
      title: "Đơn vị tính",
      resource: "don-vi-tinh",
      service: noopService,
      uniqueBy: ["ma"],
      columns: [
        { key: "ma", header: "Mã", required: true, example: "DVT01" },
        { key: "ten", header: "Tên", required: true, example: "Cái" },
      ],
    };
    const wb = buildTemplateWorkbook(plain, {});
    expect(wb.worksheets).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/components/import-danh-muc/lib/__tests__/template.test.ts`
Expected: FAIL — không resolve được `../template`

- [ ] **Step 3: Viết implementation**

Tạo `fe/src/components/import-danh-muc/lib/template.ts`:

```typescript
import * as ExcelJS from "exceljs";
import type { ImportColumn, ImportDanhMucConfig } from "../types";
import type { RefData } from "./validate";

/** Số dòng dữ liệu được gắn dropdown ở sheet chính (hàng 2 → MAX_DATA_ROWS+1). */
const MAX_DATA_ROWS = 500;

/** Tên sheet danh sách của một cột. Tên sheet Excel không được chứa dấu/khoảng trắng lạ. */
const listSheetName = (col: ImportColumn): string => `DS_${col.key}`;

/** Các giá trị đưa vào sheet danh sách của một cột. Rỗng nghĩa là cột không cần dropdown. */
function listValuesOf(col: ImportColumn, refData: RefData): string[] {
  if (col.enumValues && (col.type === "enum" || col.type === "enumList")) {
    return col.enumValues.map((o) => o.label);
  }
  if (col.ref) {
    const items = refData[col.key] ?? [];
    const display = col.ref.displayField;
    return items.map((it) => {
      const ma = String(it[col.ref!.matchBy] ?? "");
      const ten = display ? String(it[display] ?? "") : "";
      return ten ? `${ma} - ${ten}` : ma;
    });
  }
  return [];
}

/** Dựng workbook file mẫu (đồng bộ để test được). */
export function buildTemplateWorkbook(
  config: ImportDanhMucConfig,
  refData: RefData,
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  const main = wb.addWorksheet("DuLieu");
  main.addRow(config.columns.map((c) => c.header));
  main.addRow(config.columns.map((c) => c.example ?? ""));
  main.getRow(1).font = { bold: true };
  config.columns.forEach((c, i) => {
    main.getColumn(i + 1).width = Math.max(14, c.header.length + 4);
  });

  config.columns.forEach((col, idx) => {
    const values = listValuesOf(col, refData);
    if (values.length === 0) return;

    const sheetName = listSheetName(col);
    const ws = wb.addWorksheet(sheetName);
    for (const v of values) ws.addRow([v]);

    const formula = `'${sheetName}'!$A$1:$A$${values.length}`;
    for (let r = 2; r <= MAX_DATA_ROWS + 1; r++) {
      main.getCell(r, idx + 1).dataValidation = {
        type: "list",
        allowBlank: !col.required,
        formulae: [formula],
      };
    }
  });

  return wb;
}

/** Tạo và tải file mẫu .xlsx cho một danh mục. */
export async function downloadTemplate(
  config: ImportDanhMucConfig,
  refData: RefData,
): Promise<void> {
  const wb = buildTemplateWorkbook(config, refData);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Mau-import-${config.title}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/components/import-danh-muc/lib/__tests__/template.test.ts`
Expected: PASS — 7 passed

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/import-danh-muc/lib/template.ts fe/src/components/import-danh-muc/lib/__tests__/template.test.ts
git commit -m "feat(import-danh-muc): sinh file Excel mẫu kèm dropdown từ config"
```

---

### Task 8: FE — service gọi API import

**Files:**
- Create: `fe/src/services/importDanhMucService.ts`

**Interfaces:**
- Consumes: `ServiceBase` từ `./base/service-base`; `ImportDanhMucConfig` từ `@/components/import-danh-muc/types`.
- Produces: `importDanhMucService.importItems(config, items): Promise<ImportApiResult>` với
  `ImportApiResult = { created: number; failed: { row: number; message: string }[] }`.

- [ ] **Step 1: Xem lại chữ ký `post` của ServiceBase**

Run: `cd fe && sed -n '240,275p' src/services/base/service-base.ts`
Expected: thấy `async post<T>(postData: unknown, options?: RequestOptions): Promise<T>` và cách `options.endpoint` được nối vào `this.options.endpoint`. Nếu chữ ký khác, chỉnh Step 2 cho khớp.

- [ ] **Step 2: Viết service**

Tạo `fe/src/services/importDanhMucService.ts`:

```typescript
import { ServiceBase } from './base/service-base';
import type { ImportDanhMucConfig } from '@/components/import-danh-muc/types';

export interface ImportFailure {
  /** Số dòng trong file Excel. */
  row: number;
  message: string;
}

export interface ImportApiResult {
  created: number;
  failed: ImportFailure[];
}

/**
 * Gọi endpoint import dùng chung. Endpoint đầy đủ là
 * `{apiPrefix}/import/{resource}` — apiPrefix mặc định '/master-data',
 * riêng Quy chuẩn hạch toán là '/config'.
 */
class ImportDanhMucService extends ServiceBase {
  constructor() {
    super({ endpoint: '' });
  }

  async importItems(
    config: ImportDanhMucConfig,
    items: Record<string, unknown>[],
  ): Promise<ImportApiResult> {
    const prefix = config.apiPrefix ?? '/master-data';
    return this.post<ImportApiResult>(
      { items },
      { endpoint: `${prefix}/import/${config.resource}` },
    );
  }
}

export const importDanhMucService = new ImportDanhMucService();
```

- [ ] **Step 3: Kiểm tra type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json`
Expected: không có lỗi mới ở `importDanhMucService.ts`.

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/importDanhMucService.ts
git commit -m "feat(import-danh-muc): service FE gọi endpoint import dùng chung"
```

---

### Task 9: FE — handler, state, context và các sub-handler

**Files:**
- Create: `fe/src/components/import-danh-muc/import.state.ts`
- Create: `fe/src/components/import-danh-muc/import.handler.ts`
- Create: `fe/src/components/import-danh-muc/ImportHandlerContext.tsx`
- Create: `fe/src/components/import-danh-muc/sub-handler/index.ts`
- Create: `fe/src/components/import-danh-muc/sub-handler/load-refs/load-refs.event.ts`
- Create: `fe/src/components/import-danh-muc/sub-handler/load-refs/load-refs.handler.ts`
- Create: `fe/src/components/import-danh-muc/sub-handler/parse/parse.event.ts`
- Create: `fe/src/components/import-danh-muc/sub-handler/parse/parse.handler.ts`
- Create: `fe/src/components/import-danh-muc/sub-handler/submit/submit.event.ts`
- Create: `fe/src/components/import-danh-muc/sub-handler/submit/submit.handler.ts`

**Interfaces:**
- Consumes: `validateAndBuild`, `RefData` (Task 6); `aoaToRawRows`, `findMissingHeaders` (Task 5); `importDanhMucService` (Task 8); types (Task 4).
- Produces: các sự kiện `loadRefs`, `parseFile`, `resetImport`, `submitImport`; hooks `useImportHandler`, `useImportState`; tên context là `"import-danh-muc"`.

- [ ] **Step 1: Viết state**

Tạo `fe/src/components/import-danh-muc/import.state.ts`:

```typescript
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type {
  ImportDanhMucConfig,
  RefItem,
  RowValidationResult,
} from "./types";
import type { RefData } from "./lib/validate";

export interface ImportDanhMucStates extends BaseStates {
  /** Config của danh mục đang import — modal set vào state khi mở. */
  config: ImportDanhMucConfig | null;
  loadingRefs: boolean;
  refsLoaded: boolean;
  /** Dữ liệu hiện có của chính danh mục, dùng để dò trùng. */
  existing: RefItem[];
  /** Dữ liệu các danh mục tham chiếu, khóa theo ImportColumn.key. */
  refData: RefData;
  parsing: boolean;
  submitting: boolean;
  fileName: string;
  results: RowValidationResult[];
  validItems: Record<string, unknown>[];
  hasErrors: boolean;
  /** Đã có kết quả xem trước chưa. */
  parsed: boolean;
}
```

- [ ] **Step 2: Viết handler và context**

Tạo `fe/src/components/import-danh-muc/import.handler.ts`:

```typescript
import { BaseEvents, CHanlder } from "@/common";
import "./sub-handler";
import { ImportDanhMucStates } from "./import.state";

export interface ImportDanhMucEvents extends BaseEvents {}

export class ImportDanhMucHandler extends CHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  constructor() {
    super("import-danh-muc");
  }
}
```

Tạo `fe/src/components/import-danh-muc/ImportHandlerContext.tsx`:

```tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { ImportDanhMucHandler } from "./import.handler";
import { ImportDanhMucStates } from "./import.state";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const Ctx = createContext<ImportDanhMucHandler | null>(null);

export function ImportHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new ImportDanhMucHandler());
  return <Ctx.Provider value={handler}>{children}</Ctx.Provider>;
}

export function useImportHandler(): ImportDanhMucHandler {
  const handler = useContext(Ctx);
  if (!handler) {
    throw new Error("useImportHandler phải nằm trong ImportHandlerProvider");
  }
  return handler;
}

export function useImportState<K extends StateKey<ImportDanhMucStates>>(
  key: K,
  initialValue?: StateValue<ImportDanhMucStates, K>,
) {
  const handler = useImportHandler();
  return useChandlerState<ImportDanhMucStates, K>(key, handler, initialValue);
}
```

- [ ] **Step 3: Viết sub-handler nạp dữ liệu tham chiếu**

Tạo `fe/src/components/import-danh-muc/sub-handler/load-refs/load-refs.event.ts`:

```typescript
import { BaseEvents } from "@/common";
import type { ImportDanhMucConfig } from "../../types";

export interface LoadRefsEvent extends BaseEvents {
  loadRefs: { params: { config: ImportDanhMucConfig }; result: void };
}

declare module "../../import.handler" {
  interface ImportDanhMucEvents extends LoadRefsEvent {}
}
```

Tạo `fe/src/components/import-danh-muc/sub-handler/load-refs/load-refs.handler.ts`:

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import "./load-refs.event";
import { ImportDanhMucEvents } from "../../import.handler";
import { ImportDanhMucStates } from "../../import.state";
import type { ImportDanhMucConfig, RefItem } from "../../types";
import type { RefData } from "../../lib/validate";

@RegisterHandler("import-danh-muc")
export class LoadRefsHandler extends CSubHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  @HandlerDecorator("loadRefs")
  async loadRefs(params: { config: ImportDanhMucConfig }): Promise<void> {
    const { config } = params;
    this.setState("config", config);
    this.setState("loadingRefs", true);
    try {
      const refColumns = config.columns.filter((c) => c.ref);
      const [existing, ...refLists] = await Promise.all([
        config.service.getAll(),
        ...refColumns.map((c) => c.ref!.service.getAll()),
      ]);

      const refData: RefData = {};
      refColumns.forEach((c, i) => {
        refData[c.key] = (refLists[i] ?? []) as RefItem[];
      });

      this.setState("existing", existing ?? []);
      this.setState("refData", refData);
      this.setState("refsLoaded", true);
    } catch (e) {
      const err = e as { message?: string };
      message.error(err.message || "Không tải được dữ liệu danh mục");
    } finally {
      this.setState("loadingRefs", false);
    }
  }
}
```

- [ ] **Step 4: Viết sub-handler đọc file**

Tạo `fe/src/components/import-danh-muc/sub-handler/parse/parse.event.ts`:

```typescript
import { BaseEvents } from "@/common";

export interface ParseEvent extends BaseEvents {
  parseFile: { params: { file: File }; result: void };
  resetImport: { params: Record<string, never>; result: void };
}

declare module "../../import.handler" {
  interface ImportDanhMucEvents extends ParseEvent {}
}
```

Tạo `fe/src/components/import-danh-muc/sub-handler/parse/parse.handler.ts`:

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import * as XLSX from "xlsx";
import { message } from "antd";
import "./parse.event";
import { ImportDanhMucEvents } from "../../import.handler";
import { ImportDanhMucStates } from "../../import.state";
import { aoaToRawRows, findMissingHeaders } from "../../lib/parseRows";
import { validateAndBuild, RefData } from "../../lib/validate";
import type { ImportDanhMucConfig, RefItem } from "../../types";

@RegisterHandler("import-danh-muc")
export class ParseHandler extends CSubHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  @HandlerDecorator("parseFile")
  async parseFile(params: { file: File }): Promise<void> {
    const config = this.getState("config") as ImportDanhMucConfig | null;
    if (!config) {
      message.error("Chưa sẵn sàng, vui lòng đóng và mở lại cửa sổ import");
      return;
    }

    this.setState("parsing", true);
    try {
      const buffer = await params.file.arrayBuffer();
      // Không dùng cellDates: ô ngày về dạng serial để validate tự quy đổi.
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: true,
        defval: "",
      }) as unknown[][];

      const missing = findMissingHeaders(aoa, config.columns);
      if (missing.length > 0) {
        message.error(`File thiếu cột: ${missing.join(", ")}`);
        return;
      }

      const rows = aoaToRawRows(aoa, config.columns);
      if (rows.length === 0) {
        message.warning("File không có dòng dữ liệu");
      }

      const existing = (this.getState("existing") as RefItem[]) ?? [];
      const refData = (this.getState("refData") as RefData) ?? {};
      const { results, validItems, hasErrors } = validateAndBuild(
        rows,
        config,
        existing,
        refData,
      );

      this.setState("fileName", params.file.name);
      this.setState("results", results);
      this.setState("validItems", validItems);
      this.setState("hasErrors", hasErrors);
      this.setState("parsed", true);
    } catch (e) {
      console.error("Lỗi đọc file Excel:", e);
      message.error("Không đọc được file Excel. Kiểm tra lại định dạng.");
    } finally {
      this.setState("parsing", false);
    }
  }

  @HandlerDecorator("resetImport")
  async resetImport(): Promise<void> {
    this.setState("fileName", "");
    this.setState("results", []);
    this.setState("validItems", []);
    this.setState("hasErrors", false);
    this.setState("parsed", false);
  }
}
```

- [ ] **Step 5: Viết sub-handler gửi dữ liệu**

Tạo `fe/src/components/import-danh-muc/sub-handler/submit/submit.event.ts`:

```typescript
import { BaseEvents } from "@/common";

export interface SubmitImportEvent extends BaseEvents {
  submitImport: { params: { onSuccess?: () => void }; result: void };
}

declare module "../../import.handler" {
  interface ImportDanhMucEvents extends SubmitImportEvent {}
}
```

Tạo `fe/src/components/import-danh-muc/sub-handler/submit/submit.handler.ts`:

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import "./submit.event";
import { ImportDanhMucEvents } from "../../import.handler";
import { ImportDanhMucStates } from "../../import.state";
import { importDanhMucService } from "@/services/importDanhMucService";
import type { ImportDanhMucConfig, RowValidationResult } from "../../types";

@RegisterHandler("import-danh-muc")
export class SubmitImportHandler extends CSubHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  @HandlerDecorator("submitImport")
  async submitImport(params: { onSuccess?: () => void }): Promise<void> {
    const config = this.getState("config") as ImportDanhMucConfig | null;
    const hasErrors = this.getState("hasErrors") as boolean;
    const items =
      (this.getState("validItems") as Record<string, unknown>[]) || [];
    const results =
      (this.getState("results") as RowValidationResult[]) || [];

    if (!config) return;
    if (hasErrors) {
      message.error("Còn dòng lỗi, vui lòng sửa file trước khi import");
      return;
    }
    if (items.length === 0) {
      message.warning("Không có dòng hợp lệ để import");
      return;
    }

    this.setState("submitting", true);
    try {
      const res = await importDanhMucService.importItems(config, items);

      if (res.failed.length > 0) {
        // Đổ lỗi từ BE vào đúng dòng trong bảng preview, giữ modal để người dùng xem.
        const byRow = new Map(res.failed.map((f) => [f.row, f.message]));
        this.setState(
          "results",
          results.map((r) =>
            byRow.has(r.rowNumber)
              ? { ...r, errors: [byRow.get(r.rowNumber) as string] }
              : r,
          ),
        );
        this.setState("hasErrors", true);
        message.warning(
          `Đã import ${res.created}/${items.length} bản ghi, ${res.failed.length} dòng lỗi`,
        );
        params.onSuccess?.();
        return;
      }

      message.success(`Đã import ${res.created} ${config.title.toLowerCase()}`);
      this.setState("parsed", false);
      this.setState("results", []);
      this.setState("validItems", []);
      this.setState("fileName", "");
      params.onSuccess?.();
    } catch (e) {
      const err = e as { message?: string };
      message.error(err.message || "Import thất bại");
    } finally {
      this.setState("submitting", false);
    }
  }
}
```

- [ ] **Step 6: Viết file đăng ký sub-handler**

Tạo `fe/src/components/import-danh-muc/sub-handler/index.ts`:

```typescript
import "./load-refs/load-refs.handler";
import "./parse/parse.handler";
import "./submit/submit.handler";
```

- [ ] **Step 7: Kiểm tra type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json`
Expected: không có lỗi mới trong thư mục `import-danh-muc`. Nếu đường dẫn `@/common/c-handler/core/sub-handler.ts/sub-handler` báo sai, đối chiếu với `fe/src/pages/chung-tu/nhat-ky-chung/import/sub-handler/parse/parse.handler.ts:2` và dùng đúng đường dẫn ở đó.

- [ ] **Step 8: Commit**

```bash
git add fe/src/components/import-danh-muc/
git commit -m "feat(import-danh-muc): handler, state và sub-handler cho modal import"
```

---

### Task 10: FE — giao diện modal

**Files:**
- Create: `fe/src/components/import-danh-muc/components/UploadStep.tsx`
- Create: `fe/src/components/import-danh-muc/components/PreviewTable.tsx`
- Create: `fe/src/components/import-danh-muc/ImportDanhMucModal.tsx`
- Create: `fe/src/components/import-danh-muc/index.ts`

**Interfaces:**
- Consumes: hooks + sự kiện từ Task 9; `downloadTemplate` từ Task 7.
- Produces: `<ImportDanhMucModal open config onClose onImported />` export từ `@/components/import-danh-muc`.

- [ ] **Step 1: Viết UploadStep**

Tạo `fe/src/components/import-danh-muc/components/UploadStep.tsx`:

```tsx
import { Button, Upload, Space, Typography, message } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useImportHandler, useImportState } from "../ImportHandlerContext";
import { downloadTemplate } from "../lib/template";
import type { ImportDanhMucConfig } from "../types";
import type { RefData } from "../lib/validate";

const { Text } = Typography;

export function UploadStep() {
  const handler = useImportHandler();
  const [config] = useImportState("config", null);
  const [parsing] = useImportState("parsing", false);
  const [loadingRefs] = useImportState("loadingRefs", false);
  const [refsLoaded] = useImportState("refsLoaded", false);
  const [refData] = useImportState("refData", {} as RefData);
  const [fileName] = useImportState("fileName", "");

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: (file) => {
      handler.executeEvent("parseFile", { file });
      return false; // chặn upload tự động
    },
  };

  const handleDownload = () => {
    if (!config) return;
    downloadTemplate(
      config as ImportDanhMucConfig,
      (refData as RefData) ?? {},
    ).catch(() => {
      message.error("Không tạo được file mẫu");
    });
  };

  const requiredHeaders = config
    ? (config as ImportDanhMucConfig).columns
        .filter((c) => c.required)
        .map((c) => c.header)
        .join(", ")
    : "";

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Space>
        <Button
          icon={<DownloadOutlined />}
          loading={loadingRefs}
          disabled={!refsLoaded || !config}
          onClick={handleDownload}
        >
          Tải file mẫu
        </Button>
        <Upload {...uploadProps}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={parsing || loadingRefs}
            disabled={loadingRefs || !refsLoaded}
          >
            Chọn file Excel
          </Button>
        </Upload>
        {fileName && <Text type="secondary">{fileName}</Text>}
      </Space>
      <Text type="secondary">
        {`Mỗi dòng là 1 bản ghi. Cột bắt buộc: ${requiredHeaders}. Dòng có mã đã tồn tại sẽ báo lỗi và không được import. File còn lỗi thì không import được.`}
      </Text>
    </Space>
  );
}
```

- [ ] **Step 2: Viết PreviewTable**

Tạo `fe/src/components/import-danh-muc/components/PreviewTable.tsx`:

```tsx
import { Table, Tag, Alert } from "antd";
import { useImportState } from "../ImportHandlerContext";
import type { RowValidationResult } from "../types";

export function PreviewTable() {
  const [results] = useImportState("results", [] as RowValidationResult[]);
  const [parsed] = useImportState("parsed", false);

  if (!parsed) return null;

  const rows = results ?? [];
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const okCount = rows.length - errorCount;

  const columns = [
    { title: "Dòng", dataIndex: "rowNumber", key: "rowNumber", width: 70 },
    {
      title: "Trạng thái",
      key: "status",
      width: 110,
      render: (_: unknown, r: RowValidationResult) =>
        r.errors.length > 0 ? (
          <Tag color="red">Lỗi</Tag>
        ) : (
          <Tag color="green">Hợp lệ</Tag>
        ),
    },
    { title: "Dữ liệu", dataIndex: "display", key: "display", width: 260 },
    {
      title: "Lỗi",
      key: "errors",
      render: (_: unknown, r: RowValidationResult) =>
        r.errors.length === 0 ? (
          <span style={{ color: "#389e0d" }}>OK</span>
        ) : (
          <div>
            {r.errors.map((e, i) => (
              <div key={i} style={{ color: "#cf1322" }}>
                • {e}
              </div>
            ))}
          </div>
        ),
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <Alert
        type={errorCount > 0 ? "error" : "success"}
        showIcon
        message={`Hợp lệ: ${okCount} • Lỗi: ${errorCount}`}
        style={{ marginBottom: 12 }}
      />
      <Table
        size="small"
        rowKey="rowNumber"
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ y: 360 }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Viết modal**

Tạo `fe/src/components/import-danh-muc/ImportDanhMucModal.tsx`:

```tsx
import { useEffect } from "react";
import { Modal, Button } from "antd";
import {
  ImportHandlerProvider,
  useImportHandler,
  useImportState,
} from "./ImportHandlerContext";
import { UploadStep } from "./components/UploadStep";
import { PreviewTable } from "./components/PreviewTable";
import type { ImportDanhMucConfig } from "./types";

interface Props {
  open: boolean;
  config: ImportDanhMucConfig;
  onClose: () => void;
  /** Gọi sau khi import xong (kể cả import một phần) để trang cha nạp lại bảng. */
  onImported?: () => void;
}

function ImportDanhMucModalInner({ open, config, onClose, onImported }: Props) {
  const handler = useImportHandler();
  const [hasErrors] = useImportState("hasErrors", false);
  const [parsed] = useImportState("parsed", false);
  const [submitting] = useImportState("submitting", false);
  const [validItems] = useImportState("validItems", []);

  useEffect(() => {
    if (open) {
      handler.executeEvent("loadRefs", { config });
    }
  }, [open, config, handler]);

  const handleClose = () => {
    handler.executeEvent("resetImport", {});
    onClose();
  };

  const handleImport = () => {
    handler.executeEvent("submitImport", {
      onSuccess: () => {
        onImported?.();
      },
    });
  };

  const count = validItems?.length ?? 0;
  const canImport = parsed && !hasErrors && count > 0;

  return (
    <Modal
      title={`Import ${config.title} từ Excel`}
      open={open}
      onCancel={handleClose}
      width={900}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Đóng
        </Button>,
        <Button
          key="import"
          type="primary"
          disabled={!canImport}
          loading={submitting}
          onClick={handleImport}
        >
          {`Import ${count} bản ghi`}
        </Button>,
      ]}
    >
      <UploadStep />
      <PreviewTable />
    </Modal>
  );
}

export function ImportDanhMucModal(props: Props) {
  return (
    <ImportHandlerProvider>
      <ImportDanhMucModalInner {...props} />
    </ImportHandlerProvider>
  );
}
```

Tạo `fe/src/components/import-danh-muc/index.ts`:

```typescript
export { ImportDanhMucModal } from "./ImportDanhMucModal";
export type { ImportDanhMucConfig, ImportColumn, RefSpec } from "./types";
```

- [ ] **Step 4: Kiểm tra type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json`
Expected: không có lỗi mới trong thư mục `import-danh-muc`.

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/import-danh-muc/
git commit -m "feat(import-danh-muc): modal import với bước upload và bảng xem trước"
```

---

### Task 11: FE — chạy thử một danh mục (Đơn vị tính)

Task này chốt xem toàn bộ đường ống có chạy thật không, trước khi nhân ra 21 danh mục còn lại.

**Files:**
- Create: `fe/src/components/import-danh-muc/configs/donViTinh.config.ts`
- Create: `fe/src/components/import-danh-muc/configs/index.ts`
- Modify: `fe/src/pages/danh-muc/don-vi-tinh/DonViTinhPage.tsx`

**Interfaces:**
- Consumes: `ImportDanhMucConfig` (Task 4), `ImportDanhMucModal` (Task 10), `donViTinhService`.
- Produces: `donViTinhImportConfig`; mẫu wiring mà Task 12–14 lặp lại.

- [ ] **Step 1: Viết config**

Tạo `fe/src/components/import-danh-muc/configs/donViTinh.config.ts`:

```typescript
import { donViTinhService } from "@/services/donViTinhService";
import type { ImportDanhMucConfig } from "../types";

export const donViTinhImportConfig: ImportDanhMucConfig = {
  title: "Đơn vị tính",
  resource: "don-vi-tinh",
  service: donViTinhService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã đơn vị tính", required: true, example: "DVT01" },
    { key: "ten", header: "Tên đơn vị tính", required: true, example: "Cái" },
    { key: "moTa", header: "Mô tả", example: "Đơn vị đếm" },
  ],
};
```

Tạo `fe/src/components/import-danh-muc/configs/index.ts`:

```typescript
export { donViTinhImportConfig } from "./donViTinh.config";
```

- [ ] **Step 2: Gắn nút Import vào trang Đơn vị tính**

Trong `fe/src/pages/danh-muc/don-vi-tinh/DonViTinhPage.tsx`:

Thêm `FileExcelOutlined` vào **câu lệnh import `@ant-design/icons` đã có sẵn** ở đầu file
(đừng viết thêm một dòng `import ... from "@ant-design/icons"` thứ hai — ESLint sẽ báo
`no-duplicate-imports`), rồi thêm 2 dòng import mới:

```typescript
import { ImportDanhMucModal } from "@/components/import-danh-muc";
import { donViTinhImportConfig } from "@/components/import-danh-muc/configs";
```

Thêm state, đặt cạnh các `useState` khác trong component:

```typescript
const [importOpen, setImportOpen] = useState(false);
```

Trong `<FilterBar actions={...}>`, thêm nút ngay **trước** khối `{canExport && (...)}` (hiện ở dòng 291–293):

```tsx
{canCreate && (
  <Button icon={<FileExcelOutlined />} onClick={() => setImportOpen(true)}>
    Import Excel
  </Button>
)}
```

Thêm modal ngay trước thẻ đóng `</div>` cuối cùng của JSX:

```tsx
<ImportDanhMucModal
  open={importOpen}
  config={donViTinhImportConfig}
  onClose={() => setImportOpen(false)}
  onImported={() => fetchData(1, pagination.pageSize, searchText)}
/>
```

- [ ] **Step 3: Kiểm tra lint và type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không có lỗi mới. Nếu lint báo `searchText` hoặc `fetchData` không tồn tại, mở file và dùng đúng tên biến sẵn có của trang (xem `DonViTinhPage.tsx:296` — `fetchData(1, pagination.pageSize, "")`).

- [ ] **Step 4: Chạy thử tay trên môi trường dev**

Khởi động BE và FE:
```bash
cd be && yarn start:gateway:dev &
cd be && yarn start:master-data:dev &
cd fe && npm run dev
```

Mở `http://localhost:5173/danh-muc/don-vi-tinh` rồi kiểm tra đủ 5 điểm:
1. Nút "Import Excel" hiện ra cạnh "Xuất Excel".
2. Bấm nút → modal mở, nút "Tải file mẫu" bật sau khi nạp xong.
3. Tải file mẫu → mở lên thấy đúng 3 cột `Mã đơn vị tính / Tên đơn vị tính / Mô tả` và 1 dòng ví dụ.
4. Điền 2 dòng mới + 1 dòng dùng lại mã đã có trong hệ thống → chọn file → bảng preview báo đúng 1 dòng lỗi "Mã đã tồn tại trong hệ thống", nút Import bị mờ.
5. Xóa dòng trùng, chọn lại file → bấm Import → hiện "Đã import 2 đơn vị tính", modal đóng, bảng ngoài trang có 2 bản ghi mới.

Nếu bước nào sai, sửa rồi chạy lại toàn bộ 5 điểm trước khi sang Step 5.

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/import-danh-muc/configs/ fe/src/pages/danh-muc/don-vi-tinh/DonViTinhPage.tsx
git commit -m "feat(import-danh-muc): import Excel cho danh mục Đơn vị tính"
```

---

### Task 12: FE — 7 danh mục cấu trúc đơn giản

Bảy danh mục chỉ có `ma / ten / moTa`, làm y hệt Đơn vị tính.

**Files:**
- Create: `fe/src/components/import-danh-muc/configs/boPhan.config.ts`, `lyDoKhongHopLe.config.ts`, `nhomVatTu.config.ts`, `chuDauTu.config.ts`, `nhomKhuyenMai.config.ts`, `nhomQuanLy.config.ts`, `hoSoChungTu.config.ts`
- Modify: `fe/src/components/import-danh-muc/configs/index.ts`
- Modify: `fe/src/pages/danh-muc/bo-phan/BoPhanPage.tsx`, `ly-do-khong-hop-le/LyDoKhongHopLePage.tsx`, `nhom-vat-tu/NhomVatTuPage.tsx`, `chu-dau-tu/ChuDauTuPage.tsx`, `nhom-khuyen-mai/NhomKhuyenMaiPage.tsx`, `nhom-quan-ly/NhomQuanLyPage.tsx`, `ho-so-chung-tu/HoSoChungTuPage.tsx`

**Interfaces:**
- Consumes: mẫu config + mẫu wiring từ Task 11.
- Produces: `boPhanImportConfig`, `lyDoKhongHopLeImportConfig`, `nhomVatTuImportConfig`, `chuDauTuImportConfig`, `nhomKhuyenMaiImportConfig`, `nhomQuanLyImportConfig`, `hoSoChungTuImportConfig`.

- [ ] **Step 1: Viết 7 file config**

`configs/boPhan.config.ts`:

```typescript
import { boPhanService } from "@/services/boPhanService";
import type { ImportDanhMucConfig } from "../types";

export const boPhanImportConfig: ImportDanhMucConfig = {
  title: "Bộ phận",
  resource: "bo-phan",
  service: boPhanService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã bộ phận", required: true, example: "BP01" },
    { key: "ten", header: "Tên bộ phận", required: true, example: "Phòng Kế toán" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/lyDoKhongHopLe.config.ts`:

```typescript
import { lyDoKhongHopLeService } from "@/services/lyDoKhongHopLeService";
import type { ImportDanhMucConfig } from "../types";

export const lyDoKhongHopLeImportConfig: ImportDanhMucConfig = {
  title: "Lý do không hợp lệ",
  resource: "ly-do-khong-hop-le",
  service: lyDoKhongHopLeService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã lý do", required: true, example: "LD01" },
    { key: "ten", header: "Tên lý do", required: true, example: "Thiếu hóa đơn" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/nhomVatTu.config.ts`:

```typescript
import { nhomVatTuService } from "@/services/nhomVatTuService";
import type { ImportDanhMucConfig } from "../types";

export const nhomVatTuImportConfig: ImportDanhMucConfig = {
  title: "Nhóm vật tư",
  resource: "nhom-vat-tu",
  service: nhomVatTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm vật tư", required: true, example: "NVT01" },
    { key: "ten", header: "Tên nhóm vật tư", required: true, example: "Nguyên liệu" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/chuDauTu.config.ts`:

```typescript
import { chuDauTuService } from "@/services/chuDauTuService";
import type { ImportDanhMucConfig } from "../types";

export const chuDauTuImportConfig: ImportDanhMucConfig = {
  title: "Chủ đầu tư",
  resource: "chu-dau-tu",
  service: chuDauTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã chủ đầu tư", required: true, example: "CDT01" },
    { key: "ten", header: "Tên chủ đầu tư", required: true, example: "Công ty A" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/nhomKhuyenMai.config.ts`:

```typescript
import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import type { ImportDanhMucConfig } from "../types";

export const nhomKhuyenMaiImportConfig: ImportDanhMucConfig = {
  title: "Nhóm khuyến mại",
  resource: "nhom-khuyen-mai",
  service: nhomKhuyenMaiService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm khuyến mại", required: true, example: "KM01" },
    { key: "ten", header: "Tên nhóm khuyến mại", required: true, example: "Khuyến mại hè" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/nhomQuanLy.config.ts`:

```typescript
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import type { ImportDanhMucConfig } from "../types";

export const nhomQuanLyImportConfig: ImportDanhMucConfig = {
  title: "Nhóm quản lý",
  resource: "nhom-quan-ly",
  service: nhomQuanLyService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm quản lý", required: true, example: "NQL01" },
    { key: "ten", header: "Tên nhóm quản lý", required: true, example: "Khối văn phòng" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/hoSoChungTu.config.ts`:

```typescript
import { hoSoChungTuService } from "@/services/hoSoChungTuService";
import type { ImportDanhMucConfig } from "../types";

export const hoSoChungTuImportConfig: ImportDanhMucConfig = {
  title: "Hồ sơ chứng từ",
  resource: "ho-so-chung-tu",
  service: hoSoChungTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã hồ sơ", required: true, example: "HS01" },
    { key: "ten", header: "Tên hồ sơ", required: true, example: "Hóa đơn GTGT" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

- [ ] **Step 2: Cập nhật `configs/index.ts`**

```typescript
export { donViTinhImportConfig } from "./donViTinh.config";
export { boPhanImportConfig } from "./boPhan.config";
export { lyDoKhongHopLeImportConfig } from "./lyDoKhongHopLe.config";
export { nhomVatTuImportConfig } from "./nhomVatTu.config";
export { chuDauTuImportConfig } from "./chuDauTu.config";
export { nhomKhuyenMaiImportConfig } from "./nhomKhuyenMai.config";
export { nhomQuanLyImportConfig } from "./nhomQuanLy.config";
export { hoSoChungTuImportConfig } from "./hoSoChungTu.config";
```

- [ ] **Step 3: Gắn nút Import vào 7 trang**

Với mỗi trang, làm đúng 3 sửa đổi như Task 11 Step 2, thay tên config tương ứng:

| Trang | Config |
|---|---|
| `fe/src/pages/danh-muc/bo-phan/BoPhanPage.tsx` | `boPhanImportConfig` |
| `fe/src/pages/danh-muc/ly-do-khong-hop-le/LyDoKhongHopLePage.tsx` | `lyDoKhongHopLeImportConfig` |
| `fe/src/pages/danh-muc/nhom-vat-tu/NhomVatTuPage.tsx` | `nhomVatTuImportConfig` |
| `fe/src/pages/danh-muc/chu-dau-tu/ChuDauTuPage.tsx` | `chuDauTuImportConfig` |
| `fe/src/pages/danh-muc/nhom-khuyen-mai/NhomKhuyenMaiPage.tsx` | `nhomKhuyenMaiImportConfig` |
| `fe/src/pages/danh-muc/nhom-quan-ly/NhomQuanLyPage.tsx` | `nhomQuanLyImportConfig` |
| `fe/src/pages/danh-muc/ho-so-chung-tu/HoSoChungTuPage.tsx` | `hoSoChungTuImportConfig` |

**Lưu ý về 4 trang dùng CHanlder** (Chủ đầu tư, Nhóm khuyến mại, Nhóm quản lý — và Hợp đồng ở Task 14): các trang này không có hàm `fetchData`. Mở file, tìm hàm/sự kiện đang được nút "Làm mới" gọi và dùng đúng cái đó cho `onImported`. Ví dụ nếu nút Làm mới gọi `handler.executeEvent("init", {})` thì viết:

```tsx
onImported={() => handler.executeEvent("init", {})}
```

- [ ] **Step 4: Kiểm tra lint và type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không có lỗi mới.

- [ ] **Step 5: Chạy thử 2 trang bất kỳ**

Với `/danh-muc/bo-phan` và `/danh-muc/chu-dau-tu`: mở modal → tải file mẫu → import 1 dòng mới → xác nhận bảng ngoài trang có bản ghi mới sau khi modal đóng.

- [ ] **Step 6: Commit**

```bash
git add fe/src/components/import-danh-muc/configs/ fe/src/pages/danh-muc/
git commit -m "feat(import-danh-muc): import Excel cho 7 danh mục cấu trúc đơn giản"
```

---

### Task 13: FE — 8 danh mục có enum hoặc trường số

**Files:**
- Create: `fe/src/components/import-danh-muc/configs/khoanMuc.config.ts`, `nhomKhoanMuc.config.ts`, `dongTien.config.ts`, `nganHang.config.ts`, `loaiChungTu.config.ts`, `kho.config.ts`, `sanPham.config.ts`, `doiTuong.config.ts`
- Modify: `fe/src/components/import-danh-muc/configs/index.ts`
- Modify: 8 file `*Page.tsx` tương ứng trong `fe/src/pages/danh-muc/`

**Interfaces:**
- Consumes: mẫu từ Task 11.
- Produces: `khoanMucImportConfig`, `nhomKhoanMucImportConfig`, `dongTienImportConfig`, `nganHangImportConfig`, `loaiChungTuImportConfig`, `khoImportConfig`, `sanPhamImportConfig`, `doiTuongImportConfig`.

Giá trị enum lấy đúng từ entity BE: `KhoanMucLoai` = CHI_PHI | DOANH_THU; `NhomKhoanMucLoai` = CHI_PHI | DOANH_THU; `DongTienLoai` = KINH_DOANH | DAU_TU | TAI_CHINH; `NganHangLoai` = TIEN_MAT | NGAN_HANG; `PhanLoaiChungTu` = THU | CHI | KHAC; `DoiTuongType` = KHACH_HANG | NHA_CUNG_CAP | NHAN_VIEN | NHA_THAU.

- [ ] **Step 1: Viết 8 file config**

`configs/khoanMuc.config.ts`:

```typescript
import { khoanMucService } from "@/services/khoanMucService";
import type { ImportDanhMucConfig } from "../types";

export const khoanMucImportConfig: ImportDanhMucConfig = {
  title: "Khoản mục",
  resource: "khoan-muc",
  service: khoanMucService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã khoản mục", required: true, example: "KM01" },
    { key: "ten", header: "Tên khoản mục", required: true, example: "Chi phí văn phòng" },
    {
      key: "loai",
      header: "Loại",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Chi phí", value: "CHI_PHI" },
        { label: "Doanh thu", value: "DOANH_THU" },
      ],
      example: "Chi phí",
    },
    { key: "nhom", header: "Nhóm", example: "" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/nhomKhoanMuc.config.ts`:

```typescript
import { nhomKhoanMucService } from "@/services/nhomKhoanMucService";
import type { ImportDanhMucConfig } from "../types";

export const nhomKhoanMucImportConfig: ImportDanhMucConfig = {
  title: "Nhóm khoản mục",
  resource: "nhom-khoan-muc",
  service: nhomKhoanMucService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm khoản mục", required: true, example: "NKM01" },
    { key: "ten", header: "Tên nhóm khoản mục", required: true, example: "Chi phí bán hàng" },
    {
      key: "loai",
      header: "Loại",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Chi phí", value: "CHI_PHI" },
        { label: "Doanh thu", value: "DOANH_THU" },
      ],
      example: "Chi phí",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/dongTien.config.ts`:

```typescript
import { dongTienService } from "@/services/dongTienService";
import type { ImportDanhMucConfig } from "../types";

export const dongTienImportConfig: ImportDanhMucConfig = {
  title: "Dòng tiền",
  resource: "dong-tien",
  service: dongTienService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã dòng tiền", required: true, example: "DT01" },
    { key: "ten", header: "Tên dòng tiền", required: true, example: "Thu bán hàng" },
    {
      key: "loai",
      header: "Loại",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Kinh doanh", value: "KINH_DOANH" },
        { label: "Đầu tư", value: "DAU_TU" },
        { label: "Tài chính", value: "TAI_CHINH" },
      ],
      example: "Kinh doanh",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/nganHang.config.ts`:

```typescript
import { nganHangService } from "@/services/nganHangService";
import type { ImportDanhMucConfig } from "../types";

export const nganHangImportConfig: ImportDanhMucConfig = {
  title: "Ngân hàng & Quỹ",
  resource: "ngan-hang",
  service: nganHangService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã", required: true, example: "NH01" },
    { key: "ten", header: "Tên", required: true, example: "Tài khoản Vietcombank" },
    {
      key: "loai",
      header: "Loại",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Tiền mặt", value: "TIEN_MAT" },
        { label: "Ngân hàng", value: "NGAN_HANG" },
      ],
      example: "Ngân hàng",
    },
    { key: "soDu", header: "Số dư", type: "number", example: "0" },
    { key: "nganHang", header: "Tên ngân hàng", example: "Vietcombank" },
    { key: "soTaiKhoan", header: "Số tài khoản", example: "0011001234567" },
    { key: "chiNhanh", header: "Chi nhánh", example: "Hà Nội" },
    { key: "chuTaiKhoan", header: "Chủ tài khoản", example: "Công ty A" },
    { key: "trangThai", header: "Đang hoạt động", type: "boolean", example: "Có" },
  ],
};
```

`configs/loaiChungTu.config.ts`:

```typescript
import { loaiChungTuService } from "@/services/loaiChungTuService";
import type { ImportDanhMucConfig } from "../types";

export const loaiChungTuImportConfig: ImportDanhMucConfig = {
  title: "Loại chứng từ",
  resource: "loai-chung-tu",
  service: loaiChungTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã loại chứng từ", required: true, example: "PT" },
    { key: "ten", header: "Tên loại chứng từ", required: true, example: "Phiếu thu" },
    {
      key: "phanLoai",
      header: "Phân loại",
      type: "enum",
      enumValues: [
        { label: "Thu", value: "THU" },
        { label: "Chi", value: "CHI" },
        { label: "Khác", value: "KHAC" },
      ],
      example: "Thu",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/kho.config.ts`:

```typescript
import { khoService } from "@/services/khoService";
import type { ImportDanhMucConfig } from "../types";

export const khoImportConfig: ImportDanhMucConfig = {
  title: "Kho",
  resource: "kho",
  service: khoService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã kho", required: true, example: "K01" },
    { key: "ten", header: "Tên kho", required: true, example: "Kho tổng" },
    { key: "diaChi", header: "Địa chỉ", example: "Số 1 Trần Duy Hưng" },
    { key: "thuKho", header: "Thủ kho", example: "Nguyễn Văn A" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/sanPham.config.ts`:

```typescript
import { sanPhamService } from "@/services/sanPhamService";
import type { ImportDanhMucConfig } from "../types";

export const sanPhamImportConfig: ImportDanhMucConfig = {
  title: "Sản phẩm",
  resource: "san-pham",
  service: sanPhamService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã sản phẩm", required: true, example: "SP01" },
    { key: "ten", header: "Tên sản phẩm", required: true, example: "Bàn làm việc" },
    { key: "donVi", header: "Đơn vị", example: "Cái" },
    { key: "giaBan", header: "Giá bán", type: "number", example: "1500000" },
    { key: "nhom", header: "Nhóm", example: "Nội thất" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/doiTuong.config.ts`:

```typescript
import { doiTuongService } from "@/services/doiTuongService";
import type { ImportDanhMucConfig } from "../types";

export const doiTuongImportConfig: ImportDanhMucConfig = {
  title: "Đối tượng",
  resource: "doi-tuong",
  service: doiTuongService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã đối tượng", required: true, example: "KH01" },
    { key: "ten", header: "Tên đối tượng", required: true, example: "Công ty TNHH A" },
    {
      key: "loai",
      header: "Loại đối tượng",
      required: true,
      // Một đối tượng có thể thuộc nhiều loại — ngăn cách bằng dấu phẩy.
      type: "enumList",
      enumValues: [
        { label: "Khách hàng", value: "KHACH_HANG" },
        { label: "Nhà cung cấp", value: "NHA_CUNG_CAP" },
        { label: "Nhân viên", value: "NHAN_VIEN" },
        { label: "Nhà thầu", value: "NHA_THAU" },
      ],
      example: "Khách hàng, Nhà cung cấp",
    },
    { key: "diaChi", header: "Địa chỉ", example: "Số 1 Trần Duy Hưng" },
    { key: "soDienThoai", header: "Số điện thoại", example: "0901234567" },
    { key: "email", header: "Email", example: "lienhe@congtya.vn" },
    { key: "maSoThue", header: "Mã số thuế", example: "0101234567" },
    { key: "nguoiLienHe", header: "Người liên hệ", example: "Nguyễn Văn A" },
  ],
};
```

- [ ] **Step 2: Thêm 8 dòng export vào `configs/index.ts`**

```typescript
export { khoanMucImportConfig } from "./khoanMuc.config";
export { nhomKhoanMucImportConfig } from "./nhomKhoanMuc.config";
export { dongTienImportConfig } from "./dongTien.config";
export { nganHangImportConfig } from "./nganHang.config";
export { loaiChungTuImportConfig } from "./loaiChungTu.config";
export { khoImportConfig } from "./kho.config";
export { sanPhamImportConfig } from "./sanPham.config";
export { doiTuongImportConfig } from "./doiTuong.config";
```

- [ ] **Step 3: Gắn nút Import vào 8 trang**

Làm đúng 3 sửa đổi như Task 11 Step 2 cho từng trang:

| Trang | Config |
|---|---|
| `fe/src/pages/danh-muc/khoan-muc/KhoanMucPage.tsx` | `khoanMucImportConfig` |
| `fe/src/pages/danh-muc/nhom-khoan-muc/NhomKhoanMucPage.tsx` | `nhomKhoanMucImportConfig` |
| `fe/src/pages/danh-muc/dong-tien/DongTienPage.tsx` | `dongTienImportConfig` |
| `fe/src/pages/danh-muc/ngan-hang/NganHangPage.tsx` | `nganHangImportConfig` |
| `fe/src/pages/danh-muc/loai-chung-tu/LoaiChungTuPage.tsx` | `loaiChungTuImportConfig` |
| `fe/src/pages/danh-muc/kho/KhoPage.tsx` | `khoImportConfig` |
| `fe/src/pages/danh-muc/san-pham/SanPhamPage.tsx` | `sanPhamImportConfig` |
| `fe/src/pages/danh-muc/doi-tuong/DoiTuongPage.tsx` | `doiTuongImportConfig` |

- [ ] **Step 4: Kiểm tra lint và type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không có lỗi mới.

- [ ] **Step 5: Chạy thử enum và enumList**

Trên `/danh-muc/dong-tien`: tải file mẫu → cột "Loại" phải có dropdown 3 giá trị tiếng Việt → import 1 dòng với "Đầu tư" → bản ghi mới có loại đúng.

Trên `/danh-muc/doi-tuong`: import 1 dòng với cột "Loại đối tượng" = `Khách hàng, Nhà cung cấp` → bản ghi mới hiện đủ 2 loại.

Trên `/danh-muc/ngan-hang`: import 1 dòng nhập "Số dư" = `1.000.000` → bản ghi lưu số 1000000, không phải chuỗi.

- [ ] **Step 6: Commit**

```bash
git add fe/src/components/import-danh-muc/configs/ fe/src/pages/danh-muc/
git commit -m "feat(import-danh-muc): import Excel cho 8 danh mục có enum và trường số"
```

---

### Task 14: FE — 5 danh mục có cột tham chiếu

**Files:**
- Create: `fe/src/components/import-danh-muc/configs/taiKhoan.config.ts`, `duAn.config.ts`, `hangHoaVatTu.config.ts`, `loaiGiaoDich.config.ts`, `hopDong.config.ts`
- Modify: `fe/src/components/import-danh-muc/configs/index.ts`
- Modify: `fe/src/pages/danh-muc/tai-khoan/TaiKhoanPage.tsx`, `du-an/DuAnPage.tsx`, `hang-hoa-vat-tu/HangHoaVatTuPage.tsx`, `loai-giao-dich/LoaiGiaoDichPage.tsx`, `hop-dong/HopDongPage.tsx`

**Interfaces:**
- Consumes: `RefSpec.assign` từ Task 4; mẫu wiring từ Task 11.
- Produces: `taiKhoanImportConfig`, `duAnImportConfig`, `hangHoaVatTuImportConfig`, `loaiGiaoDichImportConfig`, `hopDongImportConfig`.

Ba kiểu `assign` khác nhau, tùy DTO của BE lưu tham chiếu bằng gì:
- Lưu **id**: Dự án (`chuDauTuId`), Hợp đồng (`doiTuongId`), Tài khoản (`parentId`).
- Lưu **mã + tên**: Hàng hóa vật tư (`donViTinhMa`/`donViTinhTen`, `nhomVatTuMa`/`nhomVatTuTen`).
- Lưu **mã**: Loại giao dịch (`loaiChungTuMa`).

- [ ] **Step 1: Xác nhận các service tham chiếu đều có `getAll`**

Run: `cd fe && grep -l "async getAll" src/services/{taiKhoanService,chuDauTuService,donViTinhService,nhomVatTuService,loaiChungTuService,doiTuongService}.ts`
Expected: in ra đủ 6 file. File nào thiếu thì mở ra xem tên hàm lấy toàn bộ dữ liệu là gì và dùng đúng tên đó trong config.

- [ ] **Step 2: Viết 5 file config**

`configs/taiKhoan.config.ts`:

```typescript
import { taiKhoanService } from "@/services/taiKhoanService";
import type { ImportDanhMucConfig, RefItem } from "../types";

export const taiKhoanImportConfig: ImportDanhMucConfig = {
  title: "Tài khoản",
  resource: "tai-khoan",
  service: taiKhoanService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Số tài khoản", required: true, example: "1111" },
    { key: "ten", header: "Tên tài khoản", required: true, example: "Tiền mặt VND" },
    { key: "capDo", header: "Cấp độ", required: true, type: "number", example: "2" },
    {
      key: "loai",
      header: "Loại tài khoản",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Tài sản", value: "TAI_SAN" },
        { label: "Nợ phải trả", value: "NO_PHAI_TRA" },
        { label: "Vốn chủ sở hữu", value: "VON_CHU_SO_HUU" },
        { label: "Doanh thu", value: "DOANH_THU" },
        { label: "Chi phí", value: "CHI_PHI" },
        { label: "Thu nhập khác", value: "THU_NHAP_KHAC" },
        { label: "Chi phí khác", value: "CHI_PHI_KHAC" },
        { label: "Xác định kết quả kinh doanh", value: "XAC_DINH_KQKD" },
      ],
      example: "Tài sản",
    },
    {
      key: "nhom",
      header: "Nhóm",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Nợ", value: "NO" },
        { label: "Có", value: "CO" },
        { label: "Lưỡng tính", value: "LUONG_TINH" },
        { label: "Không có số dư", value: "KHONG_CO_SO_DU" },
      ],
      example: "Nợ",
    },
    {
      key: "taiKhoanCha",
      header: "Số tài khoản cha",
      example: "111",
      ref: {
        service: taiKhoanService,
        matchBy: "ma",
        label: "Tài khoản cha",
        displayField: "ten",
        assign: (found) => ({ parentId: (found as RefItem).id }),
      },
    },
    {
      key: "chiTietTheo",
      header: "Chi tiết theo",
      type: "enum",
      enumValues: [
        { label: "Khách hàng", value: "KHACH_HANG" },
        { label: "Nhà cung cấp", value: "NHA_CUNG_CAP" },
        { label: "Nhân viên", value: "NHAN_VIEN" },
        { label: "Nhà thầu", value: "NHA_THAU" },
        { label: "Ngân hàng & Quỹ", value: "NGAN_HANG_QUY" },
      ],
      example: "",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/duAn.config.ts`:

```typescript
import { duAnService } from "@/services/duAnService";
import { chuDauTuService } from "@/services/chuDauTuService";
import type { ImportDanhMucConfig, RefItem } from "../types";

export const duAnImportConfig: ImportDanhMucConfig = {
  title: "Dự án",
  resource: "du-an",
  service: duAnService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã dự án", required: true, example: "DA01" },
    { key: "ten", header: "Tên dự án", required: true, example: "Dự án Khu A" },
    { key: "ngayBatDau", header: "Ngày bắt đầu", type: "date", example: "01/06/2026" },
    { key: "ngayKetThuc", header: "Ngày kết thúc", type: "date", example: "31/12/2026" },
    {
      key: "chuDauTu",
      header: "Mã chủ đầu tư",
      example: "CDT01",
      ref: {
        service: chuDauTuService,
        matchBy: "ma",
        label: "Chủ đầu tư",
        displayField: "ten",
        assign: (found) => ({ chuDauTuId: (found as RefItem).id }),
      },
    },
    { key: "chuDuAn", header: "Chủ dự án", example: "Nguyễn Văn A" },
    {
      key: "trangThai",
      header: "Trạng thái",
      type: "enum",
      enumValues: [
        { label: "Đang thực hiện", value: "DANG_THUC_HIEN" },
        { label: "Hoàn thành", value: "HOAN_THANH" },
        { label: "Tạm dừng", value: "TAM_DUNG" },
      ],
      example: "Đang thực hiện",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/hangHoaVatTu.config.ts`:

```typescript
import { hangHoaVatTuService } from "@/services/hangHoaVatTuService";
import { donViTinhService } from "@/services/donViTinhService";
import { nhomVatTuService } from "@/services/nhomVatTuService";
import type { ImportDanhMucConfig, RefItem } from "../types";

export const hangHoaVatTuImportConfig: ImportDanhMucConfig = {
  title: "Hàng hóa vật tư",
  resource: "hang-hoa-vat-tu",
  service: hangHoaVatTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã hàng hóa", required: true, example: "HH01" },
    { key: "ten", header: "Tên hàng hóa", required: true, example: "Gạo tẻ" },
    {
      key: "tinhChat",
      header: "Tính chất",
      type: "enum",
      enumValues: [
        { label: "Tài sản", value: "TAI_SAN" },
        { label: "Hàng hóa", value: "HANG_HOA" },
        { label: "Nguyên liệu", value: "NGUYEN_LIEU" },
      ],
      example: "Hàng hóa",
    },
    {
      key: "donViTinh",
      header: "Mã đơn vị tính",
      example: "DVT01",
      ref: {
        service: donViTinhService,
        matchBy: "ma",
        label: "Đơn vị tính",
        displayField: "ten",
        assign: (found) => {
          const item = found as RefItem;
          return {
            donViTinhMa: String(item.ma ?? ""),
            donViTinhTen: String(item.ten ?? ""),
          };
        },
      },
    },
    {
      key: "nhomVatTu",
      header: "Mã nhóm vật tư",
      example: "NVT01",
      ref: {
        service: nhomVatTuService,
        matchBy: "ma",
        label: "Nhóm vật tư",
        displayField: "ten",
        assign: (found) => {
          const item = found as RefItem;
          return {
            nhomVatTuMa: String(item.ma ?? ""),
            nhomVatTuTen: String(item.ten ?? ""),
          };
        },
      },
    },
    { key: "quyCach", header: "Quy cách", example: "Bao 50kg" },
    { key: "tkKho", header: "Tài khoản kho", example: "1561" },
    { key: "donGia", header: "Đơn giá", type: "number", example: "20000" },
    {
      key: "cachXuat",
      header: "Cách xuất",
      type: "enum",
      enumValues: [
        { label: "Định lượng", value: "DINH_LUONG" },
        { label: "Theo suất", value: "THEO_SUAT" },
        { label: "Đơn vị", value: "DON_VI" },
      ],
      example: "",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/loaiGiaoDich.config.ts`:

```typescript
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { loaiChungTuService } from "@/services/loaiChungTuService";
import type { ImportDanhMucConfig, RefItem } from "../types";

export const loaiGiaoDichImportConfig: ImportDanhMucConfig = {
  title: "Loại giao dịch",
  resource: "loai-giao-dich",
  service: loaiGiaoDichService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã loại giao dịch", required: true, example: "LGD01" },
    { key: "ten", header: "Tên loại giao dịch", required: true, example: "Thu tiền bán hàng" },
    {
      key: "loaiChungTu",
      header: "Mã loại chứng từ",
      example: "PT",
      ref: {
        service: loaiChungTuService,
        matchBy: "ma",
        label: "Loại chứng từ",
        displayField: "ten",
        assign: (found) => ({ loaiChungTuMa: String((found as RefItem).ma ?? "") }),
      },
    },
    { key: "color", header: "Màu sắc", example: "#1677ff" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

`configs/hopDong.config.ts` — chỉ import các trường phẳng; phụ lục, điều khoản thanh toán, bảo hành, tiến độ thi công vẫn nhập tay trên form:

```typescript
import { hopDongService } from "@/services/hopDongService";
import { doiTuongService } from "@/services/doiTuongService";
import type { ImportDanhMucConfig, RefItem } from "../types";

export const hopDongImportConfig: ImportDanhMucConfig = {
  title: "Hợp đồng",
  resource: "hop-dong",
  service: hopDongService,
  uniqueBy: ["soHopDong"],
  columns: [
    { key: "soHopDong", header: "Số hợp đồng", required: true, example: "HD-2026-001" },
    { key: "tenCongTrinh", header: "Tên công trình", required: true, example: "Nhà xưởng số 1" },
    { key: "nam", header: "Năm", type: "number", example: "2026" },
    { key: "giaTriSauThue", header: "Giá trị sau thuế", type: "number", example: "1500000000" },
    { key: "ngayKy", header: "Ngày ký", type: "date", example: "01/06/2026" },
    {
      key: "doiTuong",
      header: "Mã đối tượng",
      example: "KH01",
      ref: {
        service: doiTuongService,
        matchBy: "ma",
        label: "Đối tượng",
        displayField: "ten",
        assign: (found) => ({ doiTuongId: (found as RefItem).id }),
      },
    },
    { key: "nguoiKy", header: "Người ký", example: "Nguyễn Văn A" },
    { key: "chucVu", header: "Chức vụ", example: "Giám đốc" },
    { key: "nguoiGiaoDich", header: "Người giao dịch", example: "Trần Thị B" },
    {
      key: "trangThai",
      header: "Trạng thái",
      type: "enum",
      enumValues: [
        { label: "Chưa có HĐ", value: "CHUA_CO_HD" },
        { label: "HĐ chưa ký", value: "HD_CHUA_KY" },
        { label: "HĐ photo/scan", value: "HD_PHOTO_SCAN" },
        { label: "HĐ gốc", value: "HD_GOC" },
      ],
      example: "HĐ gốc",
    },
    { key: "soLuongLuu", header: "Số lượng lưu", type: "number", example: "1" },
  ],
};
```

- [ ] **Step 3: Thêm 5 dòng export vào `configs/index.ts`**

```typescript
export { taiKhoanImportConfig } from "./taiKhoan.config";
export { duAnImportConfig } from "./duAn.config";
export { hangHoaVatTuImportConfig } from "./hangHoaVatTu.config";
export { loaiGiaoDichImportConfig } from "./loaiGiaoDich.config";
export { hopDongImportConfig } from "./hopDong.config";
```

- [ ] **Step 4: Gắn nút Import vào 5 trang**

| Trang | Config |
|---|---|
| `fe/src/pages/danh-muc/tai-khoan/TaiKhoanPage.tsx` | `taiKhoanImportConfig` |
| `fe/src/pages/danh-muc/du-an/DuAnPage.tsx` | `duAnImportConfig` |
| `fe/src/pages/danh-muc/hang-hoa-vat-tu/HangHoaVatTuPage.tsx` | `hangHoaVatTuImportConfig` |
| `fe/src/pages/danh-muc/loai-giao-dich/LoaiGiaoDichPage.tsx` | `loaiGiaoDichImportConfig` |
| `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx` | `hopDongImportConfig` |

Trang Hợp đồng dùng CHanlder — dùng đúng sự kiện nạp lại như hướng dẫn ở Task 12 Step 3.

- [ ] **Step 5: Kiểm tra lint và type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không có lỗi mới.

- [ ] **Step 6: Chạy thử cột tham chiếu**

Trên `/danh-muc/du-an`: tải file mẫu → cột "Mã chủ đầu tư" có dropdown dạng `CDT01 - Công ty A` → import 1 dòng chọn từ dropdown → bản ghi mới hiển thị đúng tên chủ đầu tư ở bảng ngoài trang.

Trên `/danh-muc/du-an`: sửa file, gõ mã chủ đầu tư không tồn tại → preview báo `Chủ đầu tư "XXX" không tồn tại`, nút Import mờ.

Trên `/danh-muc/hang-hoa-vat-tu`: import 1 dòng có mã đơn vị tính hợp lệ → bản ghi mới hiển thị đúng cả mã lẫn tên đơn vị tính.

- [ ] **Step 7: Commit**

```bash
git add fe/src/components/import-danh-muc/configs/ fe/src/pages/danh-muc/
git commit -m "feat(import-danh-muc): import Excel cho 5 danh mục có cột tham chiếu"
```

---

### Task 15: FE — Quy chuẩn hạch toán

**Files:**
- Create: `fe/src/components/import-danh-muc/configs/quyChuan.config.ts`
- Modify: `fe/src/components/import-danh-muc/configs/index.ts`
- Modify: `fe/src/pages/danh-muc/quy-chuan/QuyChaunPage.tsx`

**Interfaces:**
- Consumes: `apiPrefix: '/config'`; endpoint từ Task 3.
- Produces: `quyChuanImportConfig`.

Quy chuẩn không có cột `ma` — khóa trùng là cặp (Loại giao dịch, Nghiệp vụ). Ba cột `loaiGiaoDich`, `taiKhoanNo`, `taiKhoanCo` lưu **mã dạng chuỗi**, còn `hoSoChungTu` lưu mảng object.

- [ ] **Step 1: Kiểm tra `QuyChaunPage.tsx` để biết cách nạp lại dữ liệu**

Run: `cd fe && cat src/pages/danh-muc/quy-chuan/QuyChaunPage.tsx`
Expected: file ngắn (~95 dòng) và bọc trong một Provider — ghi lại tên sự kiện dùng để nạp lại danh sách, sẽ dùng cho `onImported` ở Step 3. Nếu nút Import không đặt vừa trong file này thì đặt trong component con đang render thanh công cụ.

- [ ] **Step 2: Viết config**

Tạo `fe/src/components/import-danh-muc/configs/quyChuan.config.ts`:

```typescript
import { quyChaunService } from "@/services/quyChaunService";
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { taiKhoanService } from "@/services/taiKhoanService";
import { hoSoChungTuService } from "@/services/hoSoChungTuService";
import type { ImportDanhMucConfig, RefItem } from "../types";

export const quyChuanImportConfig: ImportDanhMucConfig = {
  title: "Quy chuẩn hạch toán",
  resource: "quy-chuan",
  apiPrefix: "/config",
  service: quyChaunService,
  // Không có cột mã — một nghiệp vụ là duy nhất trong phạm vi một loại giao dịch.
  uniqueBy: ["loaiGiaoDich", "nghiepVu"],
  columns: [
    {
      key: "loaiGiaoDich",
      header: "Mã loại giao dịch",
      required: true,
      example: "LGD01",
      ref: {
        service: loaiGiaoDichService,
        matchBy: "ma",
        label: "Loại giao dịch",
        displayField: "ten",
        assign: (found) => ({ loaiGiaoDich: String((found as RefItem).ma ?? "") }),
      },
    },
    { key: "nghiepVu", header: "Nghiệp vụ", required: true, example: "Thu tiền khách hàng" },
    {
      key: "taiKhoanNo",
      header: "TK Nợ",
      required: true,
      example: "1111",
      ref: {
        service: taiKhoanService,
        matchBy: "ma",
        label: "Tài khoản Nợ",
        displayField: "ten",
        assign: (found) => ({ taiKhoanNo: String((found as RefItem).ma ?? "") }),
      },
    },
    {
      key: "taiKhoanCo",
      header: "TK Có",
      required: true,
      example: "1311",
      ref: {
        service: taiKhoanService,
        matchBy: "ma",
        label: "Tài khoản Có",
        displayField: "ten",
        assign: (found) => ({ taiKhoanCo: String((found as RefItem).ma ?? "") }),
      },
    },
    {
      key: "hoSo",
      header: "Mã hồ sơ chứng từ",
      example: "HS01, HS02",
      ref: {
        service: hoSoChungTuService,
        matchBy: "ma",
        label: "Hồ sơ chứng từ",
        displayField: "ten",
        multi: true,
        assign: (found) => ({
          hoSoChungTu: (found as RefItem[]).map((f) => ({
            id: String(f.id ?? ""),
            ma: String(f.ma ?? ""),
            ten: String(f.ten ?? ""),
          })),
        }),
      },
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
```

**Lưu ý:** `uniqueBy` dùng `column.key` để đọc giá trị **thô** từ ô Excel, nên `loaiGiaoDich` ở đây vừa là key của cột vừa là tên trường DTO — trùng nhau là đúng và cần thiết.

- [ ] **Step 3: Thêm export và gắn nút**

Thêm vào `configs/index.ts`:

```typescript
export { quyChuanImportConfig } from "./quyChuan.config";
```

Gắn nút Import + modal vào `fe/src/pages/danh-muc/quy-chuan/QuyChaunPage.tsx` (hoặc component con render thanh công cụ) theo đúng mẫu Task 11 Step 2, dùng `quyChuanImportConfig` và sự kiện nạp lại ghi được ở Step 1.

- [ ] **Step 4: Kiểm tra lint và type-check**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không có lỗi mới.

- [ ] **Step 5: Chạy thử với config-service**

Khởi động thêm config-service: `cd be && yarn start:config:dev`

Trên `/danh-muc/quy-chuan`: tải file mẫu → import 1 dòng có cột "Mã hồ sơ chứng từ" điền `HS01, HS02` → bản ghi mới có đủ 2 hồ sơ. Import lại đúng dòng đó lần nữa → preview báo "Mã đã tồn tại trong hệ thống".

- [ ] **Step 6: Commit**

```bash
git add fe/src/components/import-danh-muc/configs/ fe/src/pages/danh-muc/quy-chuan/
git commit -m "feat(import-danh-muc): import Excel cho Quy chuẩn hạch toán"
```

---

### Task 16: Kiểm tra tổng thể và cập nhật tài liệu

**Files:**
- Modify: `.claude/context/be-api-map.md`
- Modify: `.claude/context/active-pages.md`

**Interfaces:**
- Consumes: toàn bộ kết quả Task 1–15.
- Produces: không có code mới.

- [ ] **Step 1: Đếm đủ 22 trang đã gắn nút Import**

Run: `cd fe && grep -rl "ImportDanhMucModal" src/pages/danh-muc | sort`
Expected: đúng 22 file. Đối chiếu với bảng ở spec; thiếu trang nào thì quay lại task tương ứng bổ sung.

Run: `cd fe && ls src/components/import-danh-muc/configs/*.config.ts | wc -l`
Expected: `22`

- [ ] **Step 2: Chạy toàn bộ test FE**

Run: `cd fe && npm test`
Expected: PASS, không có test nào fail. Ghi lại số test.

- [ ] **Step 3: Chạy toàn bộ test BE liên quan**

Run: `cd be && npx jest apps/master-data-service/src/import-danh-muc/`
Expected: PASS — 11 passed.

- [ ] **Step 4: Build cả FE và BE**

Run: `cd fe && npm run build`
Expected: build thành công.

Run: `cd be && npx nest build master-data-service && npx nest build config-service`
Expected: cả hai build thành công.

- [ ] **Step 5: Cập nhật bản đồ API**

Trong `.claude/context/be-api-map.md`, thêm vào phần của master-data-service:

```
POST /master-data/import/:resource  — import hàng loạt danh mục (21 resource), body { items: [] }, trả { created, failed: [{ row, message }] }
```

và vào phần của config-service:

```
POST /config/import/quy-chuan  — import hàng loạt Quy chuẩn hạch toán, cùng hình dạng với endpoint master-data
```

- [ ] **Step 6: Ghi chú vào bản đồ trang**

Trong `.claude/context/active-pages.md`, thêm một dòng ngay dưới bảng "THU VIEN — Danh Muc (Catalog)":

```
> Tất cả 22 trang danh mục (trừ Số dư đầu kỳ) đều có nút "Import Excel" dùng chung
> `fe/src/components/import-danh-muc/`, config từng danh mục ở `configs/*.config.ts`.
```

- [ ] **Step 7: Commit**

```bash
git add .claude/context/be-api-map.md .claude/context/active-pages.md
git commit -m "docs: ghi nhận endpoint import danh mục và module import dùng chung"
```

---

## Ghi chú deploy

Sau khi merge, deploy theo skill `db-deploy`:

- **BE:** deploy lại `master-data-service` và `config-service`. Gateway **không** cần deploy lại (route theo prefix, không khai báo từng endpoint).
- **FE:** build và deploy như thường lệ; verify ở `ketoan.masterceo.com.vn`, không phải `masterceo.com.vn`.
- **Không cần grant quyền lại** sau deploy — không có permission key mới.
