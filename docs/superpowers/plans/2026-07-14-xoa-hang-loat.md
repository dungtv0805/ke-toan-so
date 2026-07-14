# Checkbox chọn dòng + xóa hàng loạt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 25 bảng xóa mềm có checkbox chọn dòng và nút "Xóa đã chọn (N)", xóa cả lô bằng một request.

**Architecture:** Backend dùng chung `DeleteBatchDto` (`@app/dto`) + helper `softDeleteBatch` (`@app/core`); mỗi tài nguyên chỉ thêm `deleteBatch()` ở service và `POST /delete-batch` ở controller, giữ nguyên guard của hàm xóa đơn. Frontend thêm `deleteBatch()` vào `ServiceBase` (mọi service kế thừa được ngay) và hook `useBulkDelete` cấp sẵn `rowSelection` + nút xóa; mỗi trang chỉ gắn 3 thứ vào.

**Tech Stack:** NestJS + TypeORM MongoRepository + class-validator (BE, Jest); React + antd Table `rowSelection` (FE, Vitest + Testing Library).

**Spec:** `docs/superpowers/specs/2026-07-14-xoa-hang-loat-design.md`

## Global Constraints

- Chỉ áp dụng cho tài nguyên **xóa mềm** (`isActive = false`). KHÔNG đụng: Phiếu thu/chi, Thư viện tài liệu, Hệ thống tài khoản, Công ty (Tenant), Lĩnh vực, Nhật ký chung (đã có sẵn).
- **Guard của xóa đơn phải giữ nguyên cho xóa lô**: Đề xuất mua không xóa được `DA_DUYET`/`DA_NHAN` → tính vào `skipped`, không ném lỗi làm hỏng cả lô.
- Endpoint trả `{ success: true, data: { deleted: number; skipped: number } }`.
- Lựa chọn dòng **chỉ trong trang đang xem**: đổi trang / đổi bộ lọc / tìm kiếm / tải lại đều `clearSelection()`.
- Checkbox và nút xóa chỉ hiện khi người dùng có quyền xóa (`canDelete` từ `usePagePermission`).
- Xác nhận trước khi xóa: *"Xóa N {itemLabel} đã chọn? Thao tác không hoàn tác."*
- `@Roles(...)` của `POST /delete-batch` copy y nguyên từ `DELETE /:id` của chính tài nguyên đó.
- Test BE: `cd be && npx jest <path>`. Test FE: `cd fe && npx vitest run <path>`. Lint FE: `npm run lint`.
- Commit tiếng Việt, kết thúc bằng `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Backend — DTO + helper dùng chung

**Files:**
- Create: `be/libs/dto/src/common/delete-batch.dto.ts`
- Modify: `be/libs/dto/src/common/index.ts`
- Create: `be/libs/core/src/utils/soft-delete-batch.ts`
- Modify: `be/libs/core/src/index.ts`
- Test: `be/libs/core/src/utils/soft-delete-batch.spec.ts`

**Interfaces:**
- Produces:
  - `DeleteBatchDto { ids: string[] }` (export từ `@app/dto`)
  - `interface SoftDeleteBatchResult { deleted: number; skipped: number }`
  - `softDeleteBatch<T>(repo, ids: string[], canDelete?: (e: T) => boolean): Promise<SoftDeleteBatchResult>` (export từ `@app/core`)

- [ ] **Step 1: Viết test thất bại — tạo `be/libs/core/src/utils/soft-delete-batch.spec.ts`**

```ts
import { softDeleteBatch } from './soft-delete-batch';

interface Row {
  _id: unknown;
  isActive?: boolean;
  trangThai?: string;
}

function makeRepo(rows: Row[]) {
  const saved: Row[] = [];
  return {
    repo: {
      find: jest.fn(async () => rows),
      save: jest.fn(async (entities: Row[]) => {
        saved.push(...entities);
        return entities;
      }),
    } as never,
    saved,
  };
}

describe('softDeleteBatch', () => {
  it('mảng rỗng → không gọi DB, trả 0/0', async () => {
    const { repo } = makeRepo([]);
    const result = await softDeleteBatch(repo, []);
    expect(result).toEqual({ deleted: 0, skipped: 0 });
    expect((repo as never as { find: jest.Mock }).find).not.toHaveBeenCalled();
  });

  it('xóa mềm tất cả bản ghi tìm thấy', async () => {
    const rows: Row[] = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
    const { repo, saved } = makeRepo(rows);

    const result = await softDeleteBatch(
      repo,
      ['64b000000000000000000001', '64b000000000000000000002', '64b000000000000000000003'],
    );

    expect(result).toEqual({ deleted: 3, skipped: 0 });
    expect(saved).toHaveLength(3);
    expect(saved.every((r) => r.isActive === false)).toBe(true);
  });

  it('canDelete chặn dòng nào thì dòng đó vào skipped, phần còn lại vẫn xóa', async () => {
    const rows: Row[] = [
      { _id: 1, trangThai: 'NHAP' },
      { _id: 2, trangThai: 'DA_DUYET' },
      { _id: 3, trangThai: 'NHAP' },
    ];
    const { repo, saved } = makeRepo(rows);

    const result = await softDeleteBatch(
      repo,
      ['64b000000000000000000001', '64b000000000000000000002', '64b000000000000000000003'],
      (e) => e.trangThai !== 'DA_DUYET',
    );

    expect(result).toEqual({ deleted: 2, skipped: 1 });
    expect(saved.map((r) => r._id)).toEqual([1, 3]);
  });

  it('id không tồn tại (repo không trả về) → không tính vào deleted lẫn skipped', async () => {
    const { repo } = makeRepo([{ _id: 1 }]);
    const result = await softDeleteBatch(repo, [
      '64b000000000000000000001',
      '64b000000000000000000099',
    ]);
    expect(result).toEqual({ deleted: 1, skipped: 0 });
  });

  it('bỏ qua id sai định dạng ObjectId thay vì ném lỗi', async () => {
    const { repo } = makeRepo([{ _id: 1 }]);
    const result = await softDeleteBatch(repo, ['64b000000000000000000001', 'khong-phai-objectid']);
    expect(result).toEqual({ deleted: 1, skipped: 0 });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd be && npx jest libs/core/src/utils/soft-delete-batch.spec.ts`
Expected: FAIL — không tìm thấy module `./soft-delete-batch`.

- [ ] **Step 3: Tạo `be/libs/core/src/utils/soft-delete-batch.ts`**

```ts
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';

export interface SoftDeleteBatchResult {
  deleted: number;
  skipped: number;
}

/**
 * Xóa mềm hàng loạt (isActive = false).
 *
 * - Repository đã tự lọc theo tenant (TenantSubscriber) nên chỉ đụng được dữ liệu của tenant hiện tại.
 * - `canDelete` giữ đúng guard của hàm xóa đơn (vd không xóa đề xuất đã duyệt): dòng bị chặn rơi
 *   vào `skipped`, KHÔNG ném lỗi làm hỏng cả lô.
 * - Id sai định dạng hoặc không tồn tại: bỏ qua, không tính vào deleted lẫn skipped.
 */
export async function softDeleteBatch<T extends { isActive?: boolean }>(
  repo: MongoRepository<T>,
  ids: string[],
  canDelete?: (entity: T) => boolean,
): Promise<SoftDeleteBatchResult> {
  if (!ids || ids.length === 0) return { deleted: 0, skipped: 0 };

  const objectIds = ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (objectIds.length === 0) return { deleted: 0, skipped: 0 };

  const found = await repo.find({
    where: { _id: { $in: objectIds } } as never,
  });

  const deletable = canDelete ? found.filter((e) => canDelete(e)) : found;
  const skipped = found.length - deletable.length;

  if (deletable.length > 0) {
    for (const entity of deletable) entity.isActive = false;
    await repo.save(deletable as never);
  }

  return { deleted: deletable.length, skipped };
}
```

- [ ] **Step 4: Export helper — thêm vào cuối `be/libs/core/src/index.ts`**

```ts
export * from './utils/soft-delete-batch';
```

- [ ] **Step 5: Tạo `be/libs/dto/src/common/delete-batch.dto.ts`**

```ts
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

/** Body của endpoint xóa hàng loạt: POST /<tài-nguyên>/delete-batch */
export class DeleteBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
```

Thêm vào `be/libs/dto/src/common/index.ts`:

```ts
export * from './delete-batch.dto';
```

- [ ] **Step 6: Chạy test — phải PASS**

Run: `cd be && npx jest libs/core`
Expected: PASS (5 test của `softDeleteBatch`).

- [ ] **Step 7: Commit**

```bash
git add be/libs/core/src/utils/soft-delete-batch.ts be/libs/core/src/utils/soft-delete-batch.spec.ts be/libs/core/src/index.ts be/libs/dto/src/common/
git commit -m "$(cat <<'EOF'
feat(core): softDeleteBatch + DeleteBatchDto dùng chung cho xóa hàng loạt

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Backend master-data — 22 tài nguyên

**Files:** với mỗi tài nguyên `<res>` trong bảng dưới, sửa 2 file:
- `be/apps/master-data-service/src/<res>/<res>.service.ts`
- `be/apps/master-data-service/src/<res>/<res>.controller.ts`
- Test: `be/apps/master-data-service/src/bo-phan/bo-phan.delete-batch.spec.ts` (tạo mới, test đại diện)

Danh sách `<res>` (thư mục = tên tài nguyên):

`bo-phan`, `chu-dau-tu`, `doi-tuong`, `don-vi-tinh`, `dong-tien`, `du-an`, `hang-hoa-vat-tu`, `ho-so-chung-tu`, `hop-dong`, `kho`, `khoan-muc`, `loai-chung-tu`, `loai-giao-dich`, `ly-do-khong-hop-le`, `ngan-hang`, `nhom-khoan-muc`, `nhom-khuyen-mai`, `nhom-quan-ly`, `nhom-vat-tu`, `san-pham`, `hoa-don-ban-ra`, `thu-tien-hop-dong`

**Interfaces:**
- Consumes: Task 1 — `softDeleteBatch(repo, ids, canDelete?)`, `DeleteBatchDto`, `SoftDeleteBatchResult`.
- Produces: mỗi service có `deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult>`; mỗi controller có `POST /<res>/delete-batch`.

- [ ] **Step 1: Viết test thất bại — tạo `be/apps/master-data-service/src/bo-phan/bo-phan.delete-batch.spec.ts`**

```ts
import { BoPhanService } from './bo-phan.service';

function makeService(rows: { _id: unknown; isActive?: boolean }[]) {
  const saved: { _id: unknown; isActive?: boolean }[] = [];
  const repo = {
    find: jest.fn(async () => rows),
    save: jest.fn(async (entities: { _id: unknown; isActive?: boolean }[]) => {
      saved.push(...entities);
      return entities;
    }),
  };
  const service = new BoPhanService(repo as never);
  return { service, repo, saved };
}

describe('BoPhanService.deleteBatch', () => {
  it('xóa mềm tất cả id gửi lên', async () => {
    const { service, saved } = makeService([{ _id: 1 }, { _id: 2 }]);

    const result = await service.deleteBatch([
      '64b000000000000000000001',
      '64b000000000000000000002',
    ]);

    expect(result).toEqual({ deleted: 2, skipped: 0 });
    expect(saved.every((r) => r.isActive === false)).toBe(true);
  });

  it('danh sách rỗng → 0/0, không đụng DB', async () => {
    const { service, repo } = makeService([]);
    expect(await service.deleteBatch([])).toEqual({ deleted: 0, skipped: 0 });
    expect(repo.find).not.toHaveBeenCalled();
  });
});
```

**Trước khi viết:** mở `bo-phan.service.ts` xem constructor nhận repository tên gì (`boPhanRepository`) và có tham số nào khác không (vd `TenantContextService`); dựng `new BoPhanService(...)` cho khớp.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd be && npx jest apps/master-data-service/src/bo-phan`
Expected: FAIL — `service.deleteBatch is not a function`.

- [ ] **Step 3: Thêm `deleteBatch` vào service — mẫu cho `bo-phan.service.ts`**

Thêm import và method ngay dưới hàm `delete(id)` hiện có:

```ts
import { softDeleteBatch, type SoftDeleteBatchResult } from '@app/core';
```

```ts
  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(this.boPhanRepository, ids);
  }
```

Làm y hệt cho 21 tài nguyên còn lại, đổi `this.boPhanRepository` thành đúng tên repository của service đó (mở file, xem tên biến trong constructor). **Không** tài nguyên nào trong nhóm này có guard trạng thái ở hàm `delete(id)` → không truyền `canDelete`. (Kiểm tra lại từng hàm `delete(id)`: nếu file nào có `throw` trước khi set `isActive = false`, dừng lại và báo — nó cần `canDelete` riêng.)

- [ ] **Step 4: Thêm endpoint vào controller — mẫu cho `bo-phan.controller.ts`**

Thêm import `DeleteBatchDto` vào dòng import từ `@app/dto`, rồi thêm route **ngay trên** `@Delete(':id')` (thứ tự không quan trọng vì path khác nhau, nhưng để cạnh nhau cho dễ đọc). `@Roles(...)` copy **y nguyên** từ `@Delete(':id')` của chính file đó:

```ts
  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')   // ⚠️ thay bằng đúng bộ role của @Delete(':id') trong file này
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.boPhanService.deleteBatch(dto.ids);
    return { success: true, data };
  }
```

Làm y hệt cho 21 controller còn lại (đổi tên service inject cho khớp).

- [ ] **Step 5: Chạy test + build service**

Run: `cd be && npx jest apps/master-data-service && npx nest build master-data-service`
Expected: test PASS, build thành công.

- [ ] **Step 6: Commit**

```bash
git add be/apps/master-data-service/
git commit -m "$(cat <<'EOF'
feat(master-data): endpoint xóa hàng loạt cho 22 tài nguyên danh mục

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Backend config / tax / kho / mam-non

**Files:**
- `be/apps/config-service/src/quy-chuan/quy-chuan.service.ts` + `.controller.ts`
- `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.service.ts` + `.controller.ts`
- `be/apps/tax-service/src/bang-ke-ban-ra/bang-ke-ban-ra.service.ts` + `.controller.ts`
- `be/apps/kho-service/src/phieu-kho/phieu-kho.service.ts` + `.controller.ts`
- `be/apps/mam-non-service/src/dinh-muc-tien-an/…`, `cong-thuc-dinh-luong/…`, `diem-danh-an/…`, `de-xuat-mua/…` (service + controller mỗi cái)
- Test: `be/apps/mam-non-service/src/de-xuat-mua/de-xuat-mua.delete-batch.spec.ts` (tạo mới)

**Interfaces:**
- Consumes: Task 1 — `softDeleteBatch`, `DeleteBatchDto`, `SoftDeleteBatchResult`.
- Produces: `deleteBatch(ids)` ở 8 service; `POST /delete-batch` ở 8 controller.

- [ ] **Step 1: Viết test thất bại — tạo `be/apps/mam-non-service/src/de-xuat-mua/de-xuat-mua.delete-batch.spec.ts`**

Đây là tài nguyên DUY NHẤT trong phạm vi có guard trạng thái (`de-xuat-mua.service.ts:94`: không xóa `DA_DUYET` / `DA_NHAN`).

```ts
import { DeXuatMuaService } from './de-xuat-mua.service';

function makeService(rows: { _id: unknown; trangThai: string; isActive?: boolean }[]) {
  const saved: { _id: unknown; trangThai: string; isActive?: boolean }[] = [];
  const repo = {
    find: jest.fn(async () => rows),
    save: jest.fn(async (entities: typeof rows) => {
      saved.push(...entities);
      return entities;
    }),
  };
  // Xem constructor thật của DeXuatMuaService để truyền đủ tham số (repo + service phụ nếu có).
  const service = new DeXuatMuaService(repo as never);
  return { service, saved };
}

describe('DeXuatMuaService.deleteBatch', () => {
  it('giữ nguyên guard của xóa đơn: đề xuất đã duyệt / đã nhận rơi vào skipped', async () => {
    const { service, saved } = makeService([
      { _id: 1, trangThai: 'NHAP' },
      { _id: 2, trangThai: 'DA_DUYET' },
      { _id: 3, trangThai: 'DA_NHAN' },
      { _id: 4, trangThai: 'CHO_DUYET' },
    ]);

    const result = await service.deleteBatch([
      '64b000000000000000000001',
      '64b000000000000000000002',
      '64b000000000000000000003',
      '64b000000000000000000004',
    ]);

    expect(result).toEqual({ deleted: 2, skipped: 2 });
    expect(saved.map((r) => r._id)).toEqual([1, 4]);
    expect(saved.every((r) => r.isActive === false)).toBe(true);
  });

  it('không ném lỗi khi cả lô đều bị chặn', async () => {
    const { service } = makeService([{ _id: 1, trangThai: 'DA_DUYET' }]);
    expect(await service.deleteBatch(['64b000000000000000000001'])).toEqual({
      deleted: 0,
      skipped: 1,
    });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd be && npx jest apps/mam-non-service/src/de-xuat-mua`
Expected: FAIL — `service.deleteBatch is not a function`.

- [ ] **Step 3: Thêm `deleteBatch` vào 8 service**

Với 7 tài nguyên **không có guard** (quy-chuan, bang-ke-mua-vao, bang-ke-ban-ra, phieu-kho, dinh-muc-tien-an, cong-thuc-dinh-luong, diem-danh-an) — thêm import và method dưới hàm `delete(id)`:

```ts
import { softDeleteBatch, type SoftDeleteBatchResult } from '@app/core';
```

```ts
  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(this.repo, ids);
  }
```

(đổi `this.repo` thành đúng tên repository của service đó — mở constructor để xem.)

Với **de-xuat-mua** (`de-xuat-mua.service.ts`) — giữ nguyên guard của `delete(id)`:

```ts
  /**
   * Xóa mềm hàng loạt. Giữ đúng guard của xóa đơn: đề xuất đã duyệt / đã nhận hàng không xóa được
   * → rơi vào `skipped` thay vì làm hỏng cả lô.
   */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repo,
      ids,
      (e) => e.trangThai !== 'DA_DUYET' && e.trangThai !== 'DA_NHAN',
    );
  }
```

**Trước khi sửa mỗi service, đọc hàm `delete(id)` của nó.** Nếu có `throw` nào khác trước khi set `isActive = false` (ràng buộc chưa biết), dừng lại và báo — cần `canDelete` riêng cho nó.

- [ ] **Step 4: Thêm `POST /delete-batch` vào 8 controller**

Mẫu (đổi tên service inject; `@Roles(...)` copy y nguyên từ `@Delete(':id')` của chính file đó; nhớ import `Post`, `Body` từ `@nestjs/common` và `DeleteBatchDto` từ `@app/dto`):

```ts
  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')   // ⚠️ thay bằng đúng bộ role của @Delete(':id') trong file này
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.service.deleteBatch(dto.ids);
    return { success: true, data };
  }
```

⚠️ **kho-service**: controller là `@Controller('phieu')` (gateway strip prefix `/kho`), nên route thật là `POST /kho/phieu/delete-batch`. Không đổi tên controller.

- [ ] **Step 5: Chạy test + build 4 service**

Run: `cd be && npx jest apps/mam-non-service apps/tax-service && npx nest build config-service && npx nest build tax-service && npx nest build kho-service && npx nest build mam-non-service`
Expected: test PASS, cả 4 build thành công.

- [ ] **Step 6: Commit**

```bash
git add be/apps/config-service/ be/apps/tax-service/ be/apps/kho-service/ be/apps/mam-non-service/
git commit -m "$(cat <<'EOF'
feat(be): endpoint xóa hàng loạt cho quy chuẩn, bảng kê thuế, phiếu kho, bếp ăn

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Frontend — `ServiceBase.deleteBatch` + hook `useBulkDelete`

**Files:**
- Modify: `fe/src/services/base/service-base.ts` (thêm method sau `delete`, quanh dòng 283)
- Create: `fe/src/components/table/useBulkDelete.tsx`
- Test: `fe/src/components/table/__tests__/useBulkDelete.test.tsx`

**Interfaces:**
- Produces:
  - `ServiceBase.deleteBatch(ids: string[]): Promise<{ deleted: number; skipped: number }>` — POST `<endpoint>/delete-batch`.
  - ```ts
    interface UseBulkDeleteOptions {
      onDeleteBatch: (ids: string[]) => Promise<{ deleted: number; skipped: number }>;
      onDone: () => void;
      enabled: boolean;      // canDelete
      itemLabel: string;     // vd "bộ phận"
    }
    function useBulkDelete<T extends { id: string }>(opts: UseBulkDeleteOptions): {
      rowSelection: { selectedRowKeys: React.Key[]; onChange: (keys: React.Key[]) => void; columnWidth: number } | undefined;
      bulkDeleteButton: React.ReactNode;   // null khi chưa chọn gì hoặc không có quyền
      clearSelection: () => void;
      selectedCount: number;
    }
    ```

- [ ] **Step 1: Viết test thất bại — tạo `fe/src/components/table/__tests__/useBulkDelete.test.tsx`**

```tsx
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useBulkDelete } from '../useBulkDelete';

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

interface Row {
  id: string;
  ten: string;
}
const DATA: Row[] = [
  { id: 'a1', ten: 'Phòng Kế toán' },
  { id: 'a2', ten: 'Phòng Nhân sự' },
];

const Demo: React.FC<{
  onDeleteBatch: (ids: string[]) => Promise<{ deleted: number; skipped: number }>;
  onDone?: () => void;
  enabled?: boolean;
}> = ({ onDeleteBatch, onDone = () => {}, enabled = true }) => {
  const { rowSelection, bulkDeleteButton } = useBulkDelete<Row>({
    onDeleteBatch,
    onDone,
    enabled,
    itemLabel: 'bộ phận',
  });
  const columns: ColumnsType<Row> = [{ title: 'Tên', dataIndex: 'ten', key: 'ten' }];
  return (
    <>
      {bulkDeleteButton}
      <Table rowKey="id" columns={columns} dataSource={DATA} pagination={false} rowSelection={rowSelection} />
    </>
  );
};

const tickRow = (index: number) => {
  const boxes = document.querySelectorAll('tbody .ant-checkbox-input');
  fireEvent.click(boxes[index] as HTMLElement);
};

const confirmModal = async () => {
  const ok = await screen.findByRole('button', { name: /Xóa/ });
  fireEvent.click(ok);
};

describe('useBulkDelete', () => {
  it('không có quyền xóa → không có checkbox, không có nút', () => {
    render(<Demo onDeleteBatch={vi.fn()} enabled={false} />);
    expect(document.querySelectorAll('tbody .ant-checkbox-input')).toHaveLength(0);
    expect(screen.queryByText(/Xóa đã chọn/)).toBeNull();
  });

  it('chưa chọn dòng nào → chưa hiện nút', () => {
    render(<Demo onDeleteBatch={vi.fn()} />);
    expect(screen.queryByText(/Xóa đã chọn/)).toBeNull();
  });

  it('chọn 2 dòng → nút hiện đúng số lượng', () => {
    render(<Demo onDeleteBatch={vi.fn()} />);
    tickRow(0);
    tickRow(1);
    expect(screen.getByText('Xóa đã chọn (2)')).toBeTruthy();
  });

  it('xác nhận → gọi API đúng danh sách id, chạy onDone, bỏ chọn hết', async () => {
    const onDeleteBatch = vi.fn(async () => ({ deleted: 2, skipped: 0 }));
    const onDone = vi.fn();
    render(<Demo onDeleteBatch={onDeleteBatch} onDone={onDone} />);

    tickRow(0);
    tickRow(1);
    fireEvent.click(screen.getByText('Xóa đã chọn (2)'));
    await confirmModal();

    await waitFor(() => expect(onDeleteBatch).toHaveBeenCalledWith(['a1', 'a2']));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/Xóa đã chọn/)).toBeNull());
  });

  it('có dòng bị bỏ qua → API vẫn được gọi, nút biến mất sau khi xong', async () => {
    const onDeleteBatch = vi.fn(async () => ({ deleted: 1, skipped: 1 }));
    render(<Demo onDeleteBatch={onDeleteBatch} />);

    tickRow(0);
    tickRow(1);
    fireEvent.click(screen.getByText('Xóa đã chọn (2)'));
    await confirmModal();

    await waitFor(() => expect(onDeleteBatch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/Xóa đã chọn/)).toBeNull());
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/components/table/__tests__/useBulkDelete.test.tsx`
Expected: FAIL — không tìm thấy module `../useBulkDelete`.

- [ ] **Step 3: Tạo `fe/src/components/table/useBulkDelete.tsx`**

```tsx
import React, { useCallback, useState } from 'react';
import { Button, Modal, message } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

export interface BulkDeleteResult {
  deleted: number;
  skipped: number;
}

export interface UseBulkDeleteOptions {
  /** Gọi API xóa lô. */
  onDeleteBatch: (ids: string[]) => Promise<BulkDeleteResult>;
  /** Chạy sau khi xóa xong — thường là tải lại danh sách. */
  onDone: () => void;
  /** Không có quyền xóa → không hiện checkbox lẫn nút. */
  enabled: boolean;
  /** Nhãn trong câu xác nhận, vd "bộ phận". */
  itemLabel: string;
}

/**
 * Checkbox chọn dòng + nút "Xóa đã chọn (N)" cho bảng antd.
 *
 * Lựa chọn CHỈ có hiệu lực trong trang đang xem: trang phải gọi `clearSelection()` khi đổi trang,
 * đổi bộ lọc / tìm kiếm hoặc tải lại — để cái bị xóa đúng là cái người dùng đang nhìn thấy.
 */
export function useBulkDelete<T extends { id: string }>({
  onDeleteBatch,
  onDone,
  enabled,
  itemLabel,
}: UseBulkDeleteOptions) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const doDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const { deleted, skipped } = await onDeleteBatch(selectedIds);
      if (skipped > 0) {
        message.warning(`Đã xóa ${deleted} mục, bỏ qua ${skipped} mục không xóa được`);
      } else {
        message.success(`Đã xóa ${deleted} mục`);
      }
      setSelectedIds([]);
      onDone();
    } catch {
      message.error('Xóa hàng loạt thất bại');
    } finally {
      setDeleting(false);
    }
  }, [onDeleteBatch, onDone, selectedIds]);

  const confirmDelete = useCallback(() => {
    Modal.confirm({
      title: `Xóa ${selectedIds.length} ${itemLabel} đã chọn?`,
      icon: <ExclamationCircleOutlined />,
      content: 'Thao tác không hoàn tác.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: doDelete,
    });
  }, [doDelete, itemLabel, selectedIds.length]);

  const rowSelection = enabled
    ? {
        selectedRowKeys: selectedIds as React.Key[],
        onChange: (keys: React.Key[]) => setSelectedIds(keys.map(String)),
        columnWidth: 32,
      }
    : undefined;

  const bulkDeleteButton =
    enabled && selectedIds.length > 0 ? (
      <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={confirmDelete}>
        Xóa đã chọn ({selectedIds.length})
      </Button>
    ) : null;

  return {
    rowSelection,
    bulkDeleteButton,
    clearSelection,
    selectedCount: selectedIds.length,
  };
}
```

- [ ] **Step 4: Thêm `deleteBatch` vào `fe/src/services/base/service-base.ts`**

Thêm ngay sau method `delete` (quanh dòng 283):

```ts
  /**
   * Xóa hàng loạt: POST <endpoint>/delete-batch với { ids }.
   * BE trả { success, data: { deleted, skipped } } — ServiceBase đã bóc `data`.
   */
  async deleteBatch(ids: string[]): Promise<{ deleted: number; skipped: number }> {
    return this.post<{ deleted: number; skipped: number }>(
      { ids },
      { endpoint: '/delete-batch' },
    );
  }
```

**Kiểm tra trước:** đọc `post()` để chắc chắn nó bóc `response.data.data` (như các service khác đang dựa vào). Nếu nó trả nguyên body, đổi kiểu trả về cho khớp và bóc `.data` tại đây.

- [ ] **Step 5: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/components/table/ && npx eslint src/components/table/ src/services/base/`
Expected: test PASS (5 test mới + các test bảng cũ), lint sạch.

- [ ] **Step 6: Commit**

```bash
git add fe/src/components/table/useBulkDelete.tsx fe/src/components/table/__tests__/useBulkDelete.test.tsx fe/src/services/base/service-base.ts
git commit -m "$(cat <<'EOF'
feat(table): hook useBulkDelete + ServiceBase.deleteBatch

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Frontend — 20 trang Danh mục + 2 trang Trung tâm dữ liệu

**Files:** mỗi trang sửa 1 file:

`fe/src/pages/danh-muc/` → `bo-phan/BoPhanPage.tsx`, `chu-dau-tu/ChuDauTuPage.tsx`, `doi-tuong/DoiTuongPage.tsx`, `don-vi-tinh/DonViTinhPage.tsx`, `dong-tien/DongTienPage.tsx`, `du-an/DuAnPage.tsx`, `hang-hoa-vat-tu/HangHoaVatTuPage.tsx`, `ho-so-chung-tu/HoSoChungTuPage.tsx`, `hop-dong/HopDongPage.tsx`, `kho/KhoPage.tsx`, `khoan-muc/KhoanMucPage.tsx`, `loai-chung-tu/LoaiChungTuPage.tsx`, `loai-giao-dich/LoaiGiaoDichPage.tsx`, `ly-do-khong-hop-le/LyDoKhongHopLePage.tsx`, `ngan-hang/NganHangPage.tsx`, `nhom-khoan-muc/NhomKhoanMucPage.tsx`, `nhom-khuyen-mai/NhomKhuyenMaiPage.tsx`, `nhom-quan-ly/NhomQuanLyPage.tsx`, `nhom-vat-tu/NhomVatTuPage.tsx`, `san-pham/SanPhamPage.tsx`

`fe/src/pages/trung-tam-du-lieu/` → `hd-ban-ra/SoHoaDonBanRaPage.tsx`, `thu-tien/SoThuTienPage.tsx`

**Interfaces:**
- Consumes: Task 4 — `useBulkDelete({ onDeleteBatch, onDone, enabled, itemLabel })`; service FE có `deleteBatch(ids)` thừa kế từ `ServiceBase`.

- [ ] **Step 1: Sửa trang đầu tiên (`BoPhanPage.tsx`) làm mẫu**

Trang này đã có: `const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/bo-phan");` (dòng 55), hàm tải dữ liệu, `handleTableChange` (dòng 103), `<Table>` và thanh công cụ có nút "Thêm mới".

a) Thêm import:

```tsx
import { useBulkDelete } from '@/components/table/useBulkDelete';
```

b) Khai báo hook sau `usePagePermission` (thay `boPhanService`, `"bộ phận"` và hàm tải lại cho khớp từng trang):

```tsx
  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<BoPhan>({
    enabled: canDelete,
    itemLabel: 'bộ phận',
    onDeleteBatch: (ids) => boPhanService.deleteBatch(ids),
    onDone: () => fetchData(),   // ⚠️ đổi thành đúng tên hàm tải lại của trang
  });
```

c) Gắn vào bảng — thêm prop vào `<Table ...>` (bảng phải có `rowKey="id"`; nếu đang dùng `rowKey={(r) => r.id}` thì giữ nguyên):

```tsx
        rowSelection={rowSelection}
```

d) Đặt nút vào thanh công cụ, cạnh nút "Thêm mới":

```tsx
        {bulkDeleteButton}
```

e) **Bỏ chọn khi rời khỏi tập dòng đang xem** — gọi `clearSelection()` ở: `handleTableChange` (đổi trang / sắp xếp), hàm tìm kiếm, và hàm tải lại dữ liệu. Ví dụ trong `handleTableChange`:

```tsx
  const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
    clearSelection();
    // ... phần còn lại giữ nguyên
  };
```

- [ ] **Step 2: Kiểm tra trang mẫu chạy đúng**

Run: `cd fe && npx eslint src/pages/danh-muc/bo-phan/ && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "bo-phan" || echo "không lỗi TS ở bo-phan"`
Expected: lint sạch, không lỗi TS.

- [ ] **Step 3: Làm y hệt cho 19 trang Danh mục còn lại + 2 trang Trung tâm dữ liệu**

Với mỗi trang: đổi `itemLabel` cho đúng ngữ nghĩa (`'chủ đầu tư'`, `'đối tượng'`, `'đơn vị tính'`, `'dòng tiền'`, `'dự án'`, `'hàng hóa vật tư'`, `'hồ sơ chứng từ'`, `'hợp đồng'`, `'kho'`, `'khoản mục'`, `'loại chứng từ'`, `'loại giao dịch'`, `'lý do không hợp lệ'`, `'ngân hàng'`, `'nhóm khoản mục'`, `'nhóm khuyến mãi'`, `'nhóm quản lý'`, `'nhóm vật tư'`, `'sản phẩm'`, `'hóa đơn'`, `'phiếu thu tiền'`), đổi service và hàm tải lại cho khớp.

**Hai trang Trung tâm dữ liệu load hết về client** (không phân trang server) → vẫn phải `clearSelection()` khi đổi bộ lọc / tải lại; không có `handleTableChange` thì bỏ qua bước đó.

- [ ] **Step 4: Kiểm tra toàn bộ**

Run: `cd fe && npx eslint src/pages/danh-muc/ src/pages/trung-tam-du-lieu/ && npx vitest run && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "danh-muc|trung-tam" || echo "không lỗi TS mới"`
Expected: lint sạch, test PASS, không lỗi TS mới.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/danh-muc/ fe/src/pages/trung-tam-du-lieu/
git commit -m "$(cat <<'EOF'
feat(danh-muc): checkbox chọn dòng + xóa hàng loạt cho 22 bảng

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Frontend — Quy chuẩn, Bảng kê thuế, Phiếu kho, Bếp ăn

**Files:**
- `fe/src/pages/cau-hinh/quy-chuan/` (bảng ở `components/table/QuyChaunTable.tsx`, trang cha giữ state)
- `fe/src/pages/thue/components/BangKePage.tsx` (dùng chung cho mua vào / bán ra)
- `fe/src/pages/kho/_shared/PhieuKhoListPage.tsx` (dùng chung cho nhập / xuất / chuyển)
- `fe/src/pages/bep-an/dinh-muc-tien-an/DinhMucTienAnPage.tsx`
- `fe/src/pages/bep-an/cong-thuc-dinh-luong/CongThucDinhLuongPage.tsx`
- `fe/src/pages/bep-an/diem-danh-an/DiemDanhAnPage.tsx`
- `fe/src/pages/bep-an/de-xuat-mua/DeXuatMuaPage.tsx`

**Interfaces:**
- Consumes: Task 4 — `useBulkDelete`, `service.deleteBatch(ids)`.

- [ ] **Step 1: Bảng kê thuế (`BangKePage.tsx`)**

Trang này nhận `service` qua props (dùng chung cho mua vào / bán ra) và có `fetchData(...)`, `pagination`, `searchText`. Thêm:

```tsx
import { useBulkDelete } from '@/components/table/useBulkDelete';
```

```tsx
  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<BangKeRecord>({
    enabled: canDelete,
    itemLabel: 'hóa đơn',
    onDeleteBatch: (ids) => service.deleteBatch(ids),
    onDone: () => fetchData(pagination.current, pagination.pageSize, searchText, nam, quy),
  });
```

Gắn `rowSelection={rowSelection}` vào `<Table>`, đặt `{bulkDeleteButton}` cạnh nút "Thêm", và gọi `clearSelection()` khi đổi trang / đổi năm / đổi quý / tìm kiếm / import xong.

⚠️ Trang này lấy quyền từ đâu thì dùng đúng cái đó — mở file xem có `usePagePermission` chưa; nếu chưa, dùng `canDelete` theo cách nút xóa từng dòng hiện đang kiểm tra (nếu nút xóa dòng luôn hiện thì đặt `enabled: true`).

- [ ] **Step 2: Phiếu kho (`PhieuKhoListPage.tsx`)**

```tsx
  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<PhieuKho>({
    enabled: canDelete,
    itemLabel: 'phiếu',
    onDeleteBatch: (ids) => phieuKhoService.deleteBatch(ids),
    onDone: () => fetchData(),   // ⚠️ đổi thành đúng tên hàm tải lại của trang
  });
```

Gắn `rowSelection`, đặt nút, `clearSelection()` khi đổi trang / đổi bộ lọc. Kiểu `PhieuKho` lấy đúng tên type mà trang đang dùng cho `dataSource`.

- [ ] **Step 3: Bếp ăn — 4 trang**

Làm y hệt mẫu, `itemLabel` lần lượt: `'định mức'`, `'công thức'`, `'buổi điểm danh'`, `'đề xuất'`. Service: `dinhMucTienAnService`, `congThucDinhLuongService`, `diemDanhAnService`, `deXuatMuaService`.

Riêng **Đề xuất mua**: backend bỏ qua phiếu đã duyệt / đã nhận (rơi vào `skipped`) → hook sẽ tự hiện *"Đã xóa X mục, bỏ qua Y mục không xóa được"*. Không cần lọc gì thêm ở FE.

- [ ] **Step 4: Quy chuẩn**

Bảng nằm trong `components/table/QuyChaunTable.tsx` nhưng state/tải dữ liệu ở trang cha. Đặt `useBulkDelete` ở **trang cha**, truyền `rowSelection` xuống `QuyChaunTable` qua props và đặt `bulkDeleteButton` ở thanh công cụ của trang cha. `itemLabel: 'quy chuẩn'`.

- [ ] **Step 5: Kiểm tra**

Run: `cd fe && npx eslint src/pages/thue/ src/pages/kho/ src/pages/bep-an/ src/pages/cau-hinh/quy-chuan/ && npx vitest run && npm run build`
Expected: lint sạch, toàn bộ test PASS, build thành công.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/thue/ fe/src/pages/kho/ fe/src/pages/bep-an/ fe/src/pages/cau-hinh/quy-chuan/
git commit -m "$(cat <<'EOF'
feat(fe): xóa hàng loạt cho bảng kê thuế, phiếu kho, bếp ăn, quy chuẩn

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Deploy + kiểm chứng

- [ ] **Step 1: Chạy toàn bộ test và build**

Run: `cd be && npx jest && cd ../fe && npm test && npm run build`
Expected: BE + FE test PASS, build thành công.

- [ ] **Step 2: Deploy 5 service backend**

```bash
cd be
npx nest build master-data-service && npx nest build config-service && npx nest build tax-service && npx nest build kho-service && npx nest build mam-non-service
for s in master-data-service config-service tax-service kho-service mam-non-service; do
  scp dist/apps/$s/main.js kt:/root/chimseo/digital-book-be/dist/apps/$s/main.js
done
ssh kt "docker restart digital-book-app"
sleep 15
ssh kt "docker exec digital-book-app pm2 list"
```
Expected: cả 5 service `online`.

- [ ] **Step 3: Deploy frontend**

```bash
cd fe && npm run build
scp -r dist/* kt:/root/chimseo/nginx/build4/
ssh kt "docker exec digital-book-nginx nginx -s reload"
```
Verify: `curl -s https://ketoan.masterceo.com.vn/ | md5` phải khớp `md5 fe/dist/index.html`.

- [ ] **Step 4: Kiểm tra tay**

1. **Danh mục → Bộ phận**: tick 2 dòng → nút "Xóa đã chọn (2)" hiện → bấm → xác nhận → thông báo "Đã xóa 2 mục", bảng tải lại, 2 dòng biến mất.
2. Tick vài dòng rồi **đổi trang** → lựa chọn bị xóa, nút biến mất.
3. **Bếp ăn → Đề xuất mua**: chọn 1 phiếu `NHÁP` + 1 phiếu `ĐÃ DUYỆT` → xóa → thông báo *"Đã xóa 1 mục, bỏ qua 1 mục không xóa được"*; phiếu đã duyệt vẫn còn.
4. Đăng nhập bằng tài khoản **không có quyền xóa** → không thấy checkbox lẫn nút.
5. **Thuế → Bảng kê mua vào**: import nhầm vài dòng → chọn hết → xóa một lần.

---

## Self-Review

**Spec coverage:**
- `DeleteBatchDto` + `softDeleteBatch` dùng chung → Task 1 ✓
- 22 tài nguyên master-data → Task 2; quy chuẩn / tax ×2 / kho / bếp ăn ×4 → Task 3 ✓
- Guard của xóa đơn giữ nguyên (Đề xuất mua → `skipped`) → Task 3, có test ✓
- `ServiceBase.deleteBatch` + hook `useBulkDelete` (rowSelection, nút, clearSelection, thông báo có skipped) → Task 4 ✓
- Quyền xóa mới hiện checkbox/nút → Task 4 (`enabled: canDelete`), Task 5/6 truyền vào ✓
- Chọn chỉ trong trang đang xem → Task 5/6 (`clearSelection()` khi đổi trang/lọc/tải lại), có test ở Task 4 ✓
- 25 bảng FE → Task 5 (22) + Task 6 (Bảng kê ×2 dùng chung 1 file, Phiếu kho ×3 dùng chung 1 file, Bếp ăn ×4, Quy chuẩn) ✓
- Deploy 5 service → Task 7 ✓
- Test BE (helper + 2 service tiêu biểu) → Task 1, 2, 3; test FE hook → Task 4 ✓

**Type consistency:** `{ deleted: number; skipped: number }` dùng thống nhất từ `softDeleteBatch` → controller → `ServiceBase.deleteBatch` → `useBulkDelete.onDeleteBatch`. `SoftDeleteBatchResult` (BE) và `BulkDeleteResult` (FE) cùng hình dạng.
