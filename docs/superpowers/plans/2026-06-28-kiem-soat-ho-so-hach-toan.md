# Kiểm soát hồ sơ & hạch toán → tự tính chi phí không được trừ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm danh mục Hồ sơ chứng từ, gắn hồ sơ vào quy chuẩn hạch toán và từng giao dịch (cột "Biên tập hồ sơ"), thêm cột "Kiểm soát" (Hợp lệ / Không được trừ + ý kiến phê duyệt), và tự tính chi phí không được trừ trong Báo cáo nhanh thuế TNDN.

**Architecture:** NestJS microservices (master-data 3002, voucher 3003, config 3007, tax 3009) + React/TS frontend (CHanlder pattern). Hồ sơ chứng từ là master-data CRUD mới; quy chuẩn & chứng từ lưu snapshot hồ sơ; báo cáo TNDN gọi voucher-service (qua ServiceClient) để gom chi phí không được trừ rồi cộng với điều chỉnh tay hiện có.

**Tech Stack:** NestJS 11 + TypeORM + MongoDB; React 18 + Ant Design + RxJS (CHanlder); vitest (FE), jest (BE).

## Global Constraints

- Tất cả field mới phải `nullable` / optional — tương thích ngược với dữ liệu cũ.
- Multi-tenant: BE service luôn lọc theo `getTenantFilter()` (`tenantContext.getCurrentTenantId()`); controller dùng `JwtGuard` + `RoleGuard` + `@Roles(...)` theo mẫu hiện có.
- Snapshot hồ sơ chứng từ lưu dạng `{ id, ma, ten }` (không tham chiếu sống), đồng bộ cách `danhMuc` đang làm.
- DTO string optional nhận `""`: dùng `@Transform(({ value }) => (value === '' ? undefined : value))` (xem [[crud-validation-gotchas]]).
- FE zod optional cho field BE có thể trả `null`: dùng `.nullable()`.
- 4 nhóm chi phí không được trừ (khớp Báo cáo TNDN): `1`=DV/hàng hóa mua vào, `2`=TSCĐ/CCDC/CPTT, `3`=nhân công/bảo hiểm, `4`=tài chính/khác.
- Test FE: `cd fe && npx vitest run <file>`. Test BE: `cd be && yarn test <pattern>`.
- Lint/build FE: `cd fe && npm run build`. Không commit nếu build fail.

---

## File Structure

**Backend**
- `be/libs/entities/src/master-data/ho-so-chung-tu.entity.ts` *(create)* — entity DM hồ sơ chứng từ
- `be/apps/master-data-service/src/ho-so-chung-tu/` *(create)* — controller, service, module, dto/
- `be/apps/master-data-service/src/master-data-service.module.ts` *(modify)* — đăng ký entity + module
- `be/scripts/seeds/ho-so-chung-tu.seed.js` *(create)* — seed 4 loại
- `be/libs/entities/src/config/quy-chuan.entity.ts` *(modify)* — thêm `hoSoChungTu`
- `be/apps/config-service/src/quy-chuan/dto/create-quy-chuan.dto.ts` *(modify)* — thêm `hoSoChungTu`
- `be/libs/entities/src/voucher/chung-tu.entity.ts` *(modify)* — thêm `hoSoChungTu`, `kiemSoat` + interfaces
- `be/apps/voucher-service/src/nhat-ky-chung/dto/update-nhat-ky-chung.dto.ts` *(modify)* — thêm 2 field
- `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts` *(modify)* — route gom chi phí không trừ
- `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts` *(modify)* — aggregate non-deductible
- `be/libs/service-client/src/service-client.ts` *(modify)* — `aggregateNonDeductible()`
- `be/apps/tax-service/src/bao-cao/bao-cao.service.ts` *(modify)* — merge auto + tay
- `be/apps/tax-service/src/bao-cao/chi-phi-khong-tru.util.ts` *(create)* — helper merge (testable)

**Frontend**
- `fe/src/services/hoSoChungTuService.ts` *(create)*
- `fe/src/types/index.ts` *(modify)* — `HoSoChungTu`, `HoSoChungTuRef`, `QuyChuan.hoSoChungTu`, `KiemSoatChungTu`
- `fe/src/pages/danh-muc/ho-so-chung-tu/HoSoChungTuPage.tsx` *(create)* — CRUD (simple pattern)
- `fe/src/config/menuCatalog.ts`, `fe/src/App.tsx`, `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts` *(modify)*
- `fe/src/pages/danh-muc/quy-chuan/components/form/QuyChaunForm.tsx` + `.state.ts`, `components/table/QuyChaunTable.tsx`, `sub-handler/init/init.handler.ts` *(modify)*
- `fe/src/pages/chung-tu/nhat-ky-chung/nhomChiPhi.ts` *(create)* — `suggestNhomChiPhi()` + test
- `fe/src/services/nhatKyChungService.ts` *(modify)* — `UpdateEntryDto` + mapping
- `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data/` *(modify)* — load hoSoChungTuList
- `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx` *(modify)* — 2 cột
- `fe/src/pages/chung-tu/nhat-ky-chung/components/` *(create)* — `BienTapHoSoCell.tsx`, `KiemSoatCell.tsx`
- `fe/src/services/taxService.ts` *(modify)* — `TNDNQuyData.cpKhongTruAuto`
- `fe/src/pages/thue/bao-cao-tndn/BaoCaoTNDNPage.tsx` *(modify)* — hiển thị auto + tay

---

## PHASE 1 — Danh mục Hồ sơ chứng từ

### Task 1: BE — entity + DTO + service + controller + module Hồ sơ chứng từ

**Files:**
- Create: `be/libs/entities/src/master-data/ho-so-chung-tu.entity.ts`
- Create: `be/apps/master-data-service/src/ho-so-chung-tu/ho-so-chung-tu.controller.ts`
- Create: `be/apps/master-data-service/src/ho-so-chung-tu/ho-so-chung-tu.service.ts`
- Create: `be/apps/master-data-service/src/ho-so-chung-tu/ho-so-chung-tu.module.ts`
- Create: `be/apps/master-data-service/src/ho-so-chung-tu/dto/create-ho-so-chung-tu.dto.ts`
- Create: `be/apps/master-data-service/src/ho-so-chung-tu/dto/update-ho-so-chung-tu.dto.ts`
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`
- Modify: `be/libs/entities/src/master-data/index.ts` (export entity nếu file index có — kiểm tra trước)
- Test: `be/apps/master-data-service/src/ho-so-chung-tu/ho-so-chung-tu.service.spec.ts`

**Interfaces:**
- Produces: entity `HoSoChungTu { ma, ten, moTa?, isActive }` (table `ho_so_chung_tu`); route prefix `/ho-so-chung-tu` (gateway → `/master-data/ho-so-chung-tu`); service methods `getAll()`, `getPaginated()`, `findOne(id)`, `findByMa(ma)`, `create(dto)`, `update(id,dto)`, `remove(id)`, `checkMaExists(ma, excludeId?)`.

- [ ] **Step 1: Tạo entity.** Đọc `be/libs/entities/src/master-data/loai-chung-tu.entity.ts` làm mẫu, tạo:

```typescript
// be/libs/entities/src/master-data/ho-so-chung-tu.entity.ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('ho_so_chung_tu')
export class HoSoChungTu extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface HoSoChungTuEntities {
  HoSoChungTu: typeof HoSoChungTu;
}

declare module '../entities' {
  interface Entities extends HoSoChungTuEntities {}
}
```

- [ ] **Step 2: Export entity.** Mở `be/libs/entities/src/master-data/index.ts` (hoặc nơi `loai-chung-tu.entity` được re-export — `grep -rn "loai-chung-tu.entity" be/libs/entities/src`) và thêm dòng `export * from './ho-so-chung-tu.entity';` đúng cùng kiểu các export khác.

- [ ] **Step 3: Tạo DTO create + update.**

```typescript
// dto/create-ho-so-chung-tu.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateHoSoChungTuDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  moTa?: string;
}
```

```typescript
// dto/update-ho-so-chung-tu.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateHoSoChungTuDto } from './create-ho-so-chung-tu.dto';

export class UpdateHoSoChungTuDto extends PartialType(CreateHoSoChungTuDto) {}
```

- [ ] **Step 4: Viết test service (fail trước).** Mô phỏng mẫu test service hiện có (nếu chưa có mẫu, `grep -rln "describe(" be/apps/master-data-service/src` để copy bố cục). Test create báo lỗi trùng mã:

```typescript
// ho-so-chung-tu.service.spec.ts
import { ConflictException } from '@nestjs/common';
import { HoSoChungTuService } from './ho-so-chung-tu.service';

describe('HoSoChungTuService', () => {
  it('create() ném ConflictException khi trùng mã', async () => {
    const repo: any = {
      findOne: jest.fn().mockResolvedValue({ ma: 'PHIEU_CHI' }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const tenant: any = { getCurrentTenantId: () => 't1' };
    const svc = new HoSoChungTuService(repo, tenant);
    await expect(svc.create({ ma: 'PHIEU_CHI', ten: 'Phiếu chi' })).rejects.toBeInstanceOf(ConflictException);
  });
});
```

> Lưu ý: signature constructor `(repo, tenantContext)` phải khớp service viết ở Step 5. Nếu service inject khác (vd dùng `@InjectRepository`), điều chỉnh test cho khớp constructor thực tế của `LoaiChungTuService` — mở `loai-chung-tu.service.ts` để copy đúng kiểu inject.

- [ ] **Step 5: Run test → FAIL.**

Run: `cd be && yarn test ho-so-chung-tu.service`
Expected: FAIL (chưa có `HoSoChungTuService`).

- [ ] **Step 6: Tạo service.** Copy `loai-chung-tu.service.ts`, đổi tên class/entity, bỏ field `phanLoai`. Giữ nguyên `getTenantFilter()`, `findByMa`, `create` (dup-check), `update` (dùng `sanitizeUpdateDto`), `remove` (soft delete `isActive=false`), `getAll`, `getPaginated`, `findOne`, `checkMaExists`. Đảm bảo create:

```typescript
async create(createDto: CreateHoSoChungTuDto): Promise<HoSoChungTu> {
  const existing = await this.findByMa(createDto.ma);
  if (existing) {
    throw new ConflictException(`Mã ${createDto.ma} đã tồn tại`);
  }
  const item = this.hoSoChungTuRepository.create({ ...createDto, isActive: true });
  return this.hoSoChungTuRepository.save(item);
}
```

- [ ] **Step 7: Run test → PASS.**

Run: `cd be && yarn test ho-so-chung-tu.service`
Expected: PASS.

- [ ] **Step 8: Tạo controller.** Copy `loai-chung-tu.controller.ts`, đổi route prefix `'ho-so-chung-tu'`, inject `HoSoChungTuService`, dùng đúng các `@Roles(...)` như loai-chung-tu (READ: ADMIN, KE_TOAN_TRUONG, KE_TOAN_TONG_HOP, KE_TOAN_QUY, KE_TOAN_CONG_NO, MANAGER, KIEM_SOAT; CREATE/UPDATE: ADMIN, KE_TOAN_TRUONG, KE_TOAN_TONG_HOP; DELETE: ADMIN). Routes: `GET /`, `GET /all`, `GET /search`, `GET /check-ma`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` (giữ đúng tập route loai-chung-tu có, bỏ route không liên quan như `/total` nếu không cần).

- [ ] **Step 9: Tạo module.**

```typescript
// ho-so-chung-tu.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { HoSoChungTu } from '@app/entities';
import { HoSoChungTuController } from './ho-so-chung-tu.controller';
import { HoSoChungTuService } from './ho-so-chung-tu.service';

@Module({
  imports: [DatabaseModule.forFeature([HoSoChungTu])],
  controllers: [HoSoChungTuController],
  providers: [HoSoChungTuService],
  exports: [HoSoChungTuService],
})
export class HoSoChungTuModule {}
```

- [ ] **Step 10: Đăng ký vào master-data-service.module.ts.** Thêm `HoSoChungTu` vào mảng `DatabaseModule.forFeature([...])` (cạnh `LoaiChungTuMaster`) và `HoSoChungTuModule` vào mảng `imports`. Thêm import statements tương ứng.

- [ ] **Step 11: Build BE service.**

Run: `cd be && npx tsc -p apps/master-data-service/tsconfig.app.json --noEmit`
Expected: không lỗi type. (Nếu lệnh tsconfig khác, dùng `yarn build master-data-service`.)

- [ ] **Step 12: Commit.**

```bash
git add be/libs/entities/src/master-data be/apps/master-data-service/src/ho-so-chung-tu be/apps/master-data-service/src/master-data-service.module.ts
git commit -m "feat(be): danh mục hồ sơ chứng từ (master-data CRUD)"
```

---

### Task 2: BE — seed 4 hồ sơ chứng từ

**Files:**
- Create: `be/scripts/seeds/ho-so-chung-tu.seed.js`
- Modify: file index/registry seed (tìm: `grep -rln "loai-chung-tu.seed" be/scripts`)

**Interfaces:**
- Produces: 4 bản ghi collection `ho_so_chung_tu`: PHIEU_CHI/Phiếu chi, BANG_LUONG/Bảng lương, PHIEU_NHAP/Phiếu nhập, BIEN_BAN_NGHIEM_THU/Biên bản nghiệm thu.

- [ ] **Step 1: Đọc mẫu seed.** Đọc `be/scripts/seeds/loai-chung-tu.seed.js` để copy đúng cấu trúc (export, hàm seed, cách lấy collection, `clearBefore`, `dryRun`).

- [ ] **Step 2: Tạo seed file.** Copy cấu trúc trên, đổi collection name `ho_so_chung_tu`, data:

```javascript
const data = [
  { ma: 'PHIEU_CHI', ten: 'Phiếu chi', isActive: true },
  { ma: 'BANG_LUONG', ten: 'Bảng lương', isActive: true },
  { ma: 'PHIEU_NHAP', ten: 'Phiếu nhập', isActive: true },
  { ma: 'BIEN_BAN_NGHIEM_THU', ten: 'Biên bản nghiệm thu', isActive: true },
];
```

> Giữ đúng các field hệ thống mà seed mẫu thêm (vd `tenantId`, `createdAt`, `_id`) theo cách `loai-chung-tu.seed.js` làm.

- [ ] **Step 3: Đăng ký seed.** Thêm seed mới vào registry seed như `loai-chung-tu.seed` được khai báo.

- [ ] **Step 4: Dry-run kiểm tra.**

Run: `cd be && yarn seed:dry-run`
Expected: log thấy 4 bản ghi `ho_so_chung_tu` sẽ được chèn, không lỗi.

- [ ] **Step 5: Commit.**

```bash
git add be/scripts/seeds
git commit -m "feat(be): seed 4 hồ sơ chứng từ mặc định"
```

---

### Task 3: FE — service + type Hồ sơ chứng từ

**Files:**
- Create: `fe/src/services/hoSoChungTuService.ts`
- Modify: `fe/src/types/index.ts`

**Interfaces:**
- Produces: type `HoSoChungTu { id, ma, ten, moTa? }`; `hoSoChungTuService` với `getAll()`, `getPaginated(params)`, `getById(id)`, `create(data)`, `update(id, data)`, `remove(id)`, `checkMaExists(ma, excludeId?)`.

- [ ] **Step 1: Thêm type.** Trong `fe/src/types/index.ts`, thêm:

```typescript
export interface HoSoChungTu {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
}
```

- [ ] **Step 2: Tạo service.** Copy `fe/src/services/loaiChungTuService.ts`, bỏ `phanLoai`, đổi endpoint `'/master-data/ho-so-chung-tu'`, đổi tên class/type:

```typescript
import { ServiceBase } from './serviceBase';
import { PaginationParams, PaginatedResponse } from '...'; // copy đúng import từ loaiChungTuService
import { HoSoChungTu } from '@/types';

interface HoSoChungTuResponse { _id?: string; id?: string; ma: string; ten: string; moTa?: string; }

class HoSoChungTuService extends ServiceBase {
  constructor() { super({ endpoint: '/master-data/ho-so-chung-tu' }); }
  private mapItem(item: HoSoChungTuResponse): HoSoChungTu {
    return { ...item, id: item._id || item.id || '' } as HoSoChungTu;
  }
  // copy y nguyên getPaginated/getAll/getById/create/update/remove/checkMaExists từ loaiChungTuService, đổi kiểu trả về
}

export const hoSoChungTuService = new HoSoChungTuService();
```

> Copy chính xác chữ ký các method từ `loaiChungTuService.ts` (cùng `ServiceBase`, cùng kiểu `PaginatedResponse`).

- [ ] **Step 3: Build FE.**

Run: `cd fe && npm run build`
Expected: build pass.

- [ ] **Step 4: Commit.**

```bash
git add fe/src/services/hoSoChungTuService.ts fe/src/types/index.ts
git commit -m "feat(fe): service + type hồ sơ chứng từ"
```

---

### Task 4: FE — trang CRUD Hồ sơ chứng từ + menu + route + quyền

**Files:**
- Create: `fe/src/pages/danh-muc/ho-so-chung-tu/HoSoChungTuPage.tsx`
- Modify: `fe/src/config/menuCatalog.ts`
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`
- Modify: `fe/src/pages/loadable.tsx` (nếu trang được lazy-load tại đây — kiểm tra cách `LoaiChungTuPage` được import)

**Interfaces:**
- Consumes: `hoSoChungTuService` (Task 3).
- Produces: route `/danh-muc/ho-so-chung-tu`, quyền key `/danh-muc/ho-so-chung-tu`.

- [ ] **Step 1: Tạo trang CRUD.** Copy `fe/src/pages/danh-muc/loai-chung-tu/LoaiChungTuPage.tsx` làm khung (simple pattern: useState + service + Table + Modal + zod). Bỏ cột/field `phanLoai`. Field còn lại: `ma`, `ten`, `moTa`. Dùng `usePagePermission("/danh-muc/ho-so-chung-tu")`. Đổi tiêu đề "Hồ sơ chứng từ", gọi `hoSoChungTuService`.

- [ ] **Step 2: Đăng ký lazy import.** Mở `fe/src/pages/loadable.tsx`, tìm dòng `LoaiChungTuPage` (`grep -n "LoaiChungTuPage" fe/src/pages/loadable.tsx`) và thêm dòng tương tự cho `HoSoChungTuPage`. Nếu `LoaiChungTuPage` import trực tiếp trong `App.tsx` thì làm tương tự ở đó.

- [ ] **Step 3: Thêm route.** Trong `fe/src/App.tsx`, trong nhóm `<Route path="danh-muc">`, thêm cạnh route `quy-chuan`:

```tsx
<Route path="ho-so-chung-tu" element={
  <ProtectedRoute requiredPermission="/danh-muc/ho-so-chung-tu:xem">
    <HoSoChungTuPage />
  </ProtectedRoute>
} />
```

- [ ] **Step 4: Thêm menu.** Trong `fe/src/config/menuCatalog.ts`, cạnh dòng `quy-chuan`:

```typescript
{ key: '/danh-muc/ho-so-chung-tu', label: 'Hồ sơ chứng từ', parentLabel: 'Danh mục › Khác' },
```

- [ ] **Step 5: Thêm quyền.** Trong `permissionModules.ts`, cạnh dòng quy-chuan:

```typescript
{ key: '/danh-muc/ho-so-chung-tu', label: 'Hồ sơ chứng từ' },
```

- [ ] **Step 6: Build FE.**

Run: `cd fe && npm run build`
Expected: pass.

- [ ] **Step 7: Verify thủ công.** `cd fe && npm run dev`, đăng nhập admin, vào `/danh-muc/ho-so-chung-tu`: thấy 4 bản ghi seed, thêm/sửa/xoá hoạt động.

- [ ] **Step 8: Commit.**

```bash
git add fe/src/pages/danh-muc/ho-so-chung-tu fe/src/App.tsx fe/src/config/menuCatalog.ts fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts fe/src/pages/loadable.tsx
git commit -m "feat(fe): trang CRUD hồ sơ chứng từ + menu/route/quyền"
```

---

## PHASE 2 — Quy chuẩn hạch toán: cột "Biên tập hồ sơ"

### Task 5: BE — thêm `hoSoChungTu` vào QuyChuan

**Files:**
- Modify: `be/libs/entities/src/config/quy-chuan.entity.ts`
- Modify: `be/apps/config-service/src/quy-chuan/dto/create-quy-chuan.dto.ts`

**Interfaces:**
- Produces: `QuyChuan.hoSoChungTu?: { id: string; ma: string; ten: string }[]` (lưu/đọc qua create & update; service đã dùng `Object.assign(item, data)` nên tự nhận field mới).

- [ ] **Step 1: Thêm field entity.** Trong `quy-chuan.entity.ts`, thêm sau `moTa`:

```typescript
@Column({ type: 'simple-json', nullable: true })
hoSoChungTu?: { id: string; ma: string; ten: string }[];
```

- [ ] **Step 2: Thêm field DTO.** Trong `create-quy-chuan.dto.ts`, thêm:

```typescript
@IsArray()
@IsOptional()
hoSoChungTu?: { id: string; ma: string; ten: string }[];
```

Thêm `IsArray` vào import từ `class-validator` nếu chưa có. (Update DTO là `PartialType` của create nên tự kế thừa.)

- [ ] **Step 3: Build config-service.**

Run: `cd be && npx tsc -p apps/config-service/tsconfig.app.json --noEmit`
Expected: không lỗi.

- [ ] **Step 4: Commit.**

```bash
git add be/libs/entities/src/config/quy-chuan.entity.ts be/apps/config-service/src/quy-chuan/dto
git commit -m "feat(be): quy chuẩn — thêm trường hoSoChungTu (snapshot)"
```

---

### Task 6: FE — cột + form multi-select "Biên tập hồ sơ" ở Quy chuẩn

**Files:**
- Modify: `fe/src/types/index.ts` (QuyChuan + `HoSoChungTuRef`)
- Modify: `fe/src/pages/danh-muc/quy-chuan/sub-handler/init/init.handler.ts`
- Modify: `fe/src/pages/danh-muc/quy-chuan/components/form/QuyChaunForm.state.ts`
- Modify: `fe/src/pages/danh-muc/quy-chuan/components/form/QuyChaunForm.tsx`
- Modify: `fe/src/pages/danh-muc/quy-chuan/components/table/QuyChaunTable.tsx`

**Interfaces:**
- Consumes: `hoSoChungTuService.getAll()`, `QuyChuan.hoSoChungTu` (Task 5).
- Produces: form lưu `hoSoChungTu: { id, ma, ten }[]`; bảng hiển thị tag tên hồ sơ.

- [ ] **Step 1: Type.** Trong `types/index.ts`:

```typescript
export interface HoSoChungTuRef { id: string; ma: string; ten: string; }
```

Và thêm vào `QuyChuan`: `hoSoChungTu?: HoSoChungTuRef[];`

- [ ] **Step 2: Load danh mục trong init.** Trong `quy-chuan/sub-handler/init/init.handler.ts`, thêm `hoSoChungTuService.getAll()` vào `Promise.all` và `this.setState("hoSoChungTuList", hoSoList)`. Thêm import service.

- [ ] **Step 3: Khai báo state.** Trong `QuyChaunForm.state.ts`, thêm `hoSoChungTuList: HoSoChungTuRef[];` vào interface (import `HoSoChungTuRef` từ `@/types`).

- [ ] **Step 4: Form field.** Trong `QuyChaunForm.tsx`, lấy `const [hoSoChungTuList] = useQuyChaunState("hoSoChungTuList", []);`, thêm `Form.Item` sau `moTa`:

```tsx
<Form.Item name="hoSoChungTu" label="Biên tập hồ sơ">
  <Select
    mode="multiple"
    showSearch
    placeholder="Chọn hồ sơ chứng từ..."
    options={hoSoChungTuList.map((h) => ({ value: h.ma, label: h.ten }))}
    optionFilterProp="label"
  />
</Form.Item>
```

Khi mở form sửa: set giá trị field = `record.hoSoChungTu?.map(h => h.ma)`. Khi submit: map ngược ma→ref:

```typescript
const hoSoRefs = (values.hoSoChungTu || []).map((ma: string) => {
  const h = hoSoChungTuList.find((x) => x.ma === ma);
  return { id: h?.id ?? '', ma, ten: h?.ten ?? ma };
});
// gửi { ...payload, hoSoChungTu: hoSoRefs }
```

- [ ] **Step 5: Cột bảng.** Trong `QuyChaunTable.tsx`, thêm cột trước cột action:

```tsx
{
  title: "Biên tập hồ sơ",
  dataIndex: "hoSoChungTu",
  key: "hoSoChungTu",
  width: 220,
  render: (refs?: HoSoChungTuRef[]) =>
    refs?.length ? <Space wrap>{refs.map((r) => <Tag key={r.id || r.ma}>{r.ten}</Tag>)}</Space> : "-",
}
```

Import `Tag`, `Space` từ `antd`, `HoSoChungTuRef` từ `@/types`.

- [ ] **Step 6: Build FE.**

Run: `cd fe && npm run build`
Expected: pass.

- [ ] **Step 7: Verify thủ công.** Vào `/danh-muc/quy-chuan`, sửa 1 quy chuẩn, chọn vài hồ sơ chứng từ, lưu → cột hiển thị tag; reload vẫn còn.

- [ ] **Step 8: Commit.**

```bash
git add fe/src/types/index.ts fe/src/pages/danh-muc/quy-chuan
git commit -m "feat(fe): quy chuẩn — cột & form Biên tập hồ sơ (multi-select)"
```

---

## PHASE 3 — Dữ liệu tổng hợp (Nhật ký chung): 2 cột mới

### Task 7: BE — field `hoSoChungTu` + `kiemSoat` trên ChungTu + DTO update

**Files:**
- Modify: `be/libs/entities/src/voucher/chung-tu.entity.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/dto/update-nhat-ky-chung.dto.ts`

**Interfaces:**
- Produces:
  - `HoSoChungTuChungTu = { id: string; ma: string; ten: string; daCo: boolean }`
  - `KiemSoatChungTu = { trangThai: 'HOP_LE' | 'KHONG_DUOC_TRU'; nhomChiPhi?: 1|2|3|4; soTienKhongTru?: number; yKien?: string; nguoiKiemSoat?: string; ngayKiemSoat?: string }`
  - `ChungTu.hoSoChungTu?: HoSoChungTuChungTu[]`, `ChungTu.kiemSoat?: KiemSoatChungTu`
  - `UpdateNhatKyChungDto` nhận 2 field này.

- [ ] **Step 1: Thêm interface + cột entity.** Trong `chung-tu.entity.ts`, thêm gần `DanhMuc`:

```typescript
export interface HoSoChungTuChungTu { id: string; ma: string; ten: string; daCo: boolean; }
export type KiemSoatTrangThai = 'HOP_LE' | 'KHONG_DUOC_TRU';
export interface KiemSoatChungTu {
  trangThai: KiemSoatTrangThai;
  nhomChiPhi?: 1 | 2 | 3 | 4;
  soTienKhongTru?: number;
  yKien?: string;
  nguoiKiemSoat?: string;
  ngayKiemSoat?: string;
}
```

Trong class `ChungTu`, sau `danhMuc`:

```typescript
@Column({ type: 'simple-json', nullable: true })
hoSoChungTu?: HoSoChungTuChungTu[];

@Column({ type: 'simple-json', nullable: true })
kiemSoat?: KiemSoatChungTu;
```

- [ ] **Step 2: Thêm field DTO update.** Trong `update-nhat-ky-chung.dto.ts`:

```typescript
@IsOptional()
@IsArray()
hoSoChungTu?: HoSoChungTuChungTu[];

@IsOptional()
@IsObject()
kiemSoat?: KiemSoatChungTu;
```

Import `IsArray` (nếu thiếu) và import 2 type từ `@app/entities`.

- [ ] **Step 3: Stamp người/ngày kiểm soát ở service update.** Mở `nhat-ky-chung.service.ts` method `update(id, dto)`. Trước khi save, nếu `dto.kiemSoat` có và thiếu `nguoiKiemSoat`/`ngayKiemSoat`, set từ context:

```typescript
if (dto.kiemSoat) {
  dto.kiemSoat.nguoiKiemSoat = dto.kiemSoat.nguoiKiemSoat || this.getCurrentUserName();
  dto.kiemSoat.ngayKiemSoat = dto.kiemSoat.ngayKiemSoat || new Date().toISOString();
}
```

> Kiểm tra cách service hiện lấy user (grep `getCurrentUser`/`userContext`/`nguoiTaoId` trong service). Nếu không có nguồn tên user trong service, để FE gửi `nguoiKiemSoat` (lấy từ AuthContext) và BE chỉ stamp `ngayKiemSoat`. Chọn cách khả thi theo code thực tế; đừng bịa API context không tồn tại.

- [ ] **Step 4: Build voucher-service.**

Run: `cd be && npx tsc -p apps/voucher-service/tsconfig.app.json --noEmit`
Expected: không lỗi.

- [ ] **Step 5: Commit.**

```bash
git add be/libs/entities/src/voucher/chung-tu.entity.ts be/apps/voucher-service/src/nhat-ky-chung
git commit -m "feat(be): chứng từ — thêm hoSoChungTu & kiemSoat + stamp người/ngày kiểm soát"
```

---

### Task 8: FE — type + mapping + helper gợi ý nhóm chi phí

**Files:**
- Modify: `fe/src/types/index.ts` (hoặc nơi định nghĩa `NhatKyChung`)
- Modify: `fe/src/services/nhatKyChungService.ts`
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/nhomChiPhi.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/nhomChiPhi.test.ts`

**Interfaces:**
- Produces:
  - Type `KiemSoatChungTu`, `HoSoChungTuItem = { id; ma; ten; daCo }` ở FE.
  - `NhatKyChung.hoSoChungTu?`, `NhatKyChung.kiemSoat?`.
  - `UpdateEntryDto` thêm `hoSoChungTu?`, `kiemSoat?`.
  - `suggestNhomChiPhi(taiKhoanNo?: string): 1 | 2 | 3 | 4`.

- [ ] **Step 1: Viết test helper (fail trước).**

```typescript
// nhomChiPhi.test.ts
import { describe, it, expect } from "vitest";
import { suggestNhomChiPhi } from "./nhomChiPhi";

describe("suggestNhomChiPhi", () => {
  it("632/154/156 → nhóm 1", () => {
    expect(suggestNhomChiPhi("632")).toBe(1);
    expect(suggestNhomChiPhi("1561")).toBe(1);
  });
  it("211/242/153 → nhóm 2", () => {
    expect(suggestNhomChiPhi("2111")).toBe(2);
    expect(suggestNhomChiPhi("242")).toBe(2);
  });
  it("334/3383/622 → nhóm 3", () => {
    expect(suggestNhomChiPhi("3341")).toBe(3);
    expect(suggestNhomChiPhi("3383")).toBe(3);
  });
  it("635/811/641/642 → nhóm 4", () => {
    expect(suggestNhomChiPhi("6428")).toBe(4);
    expect(suggestNhomChiPhi("811")).toBe(4);
  });
  it("không khớp → mặc định nhóm 4", () => {
    expect(suggestNhomChiPhi("131")).toBe(4);
    expect(suggestNhomChiPhi(undefined)).toBe(4);
  });
});
```

- [ ] **Step 2: Run test → FAIL.**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/nhomChiPhi.test.ts`
Expected: FAIL (module chưa tồn tại).

- [ ] **Step 3: Viết helper.**

```typescript
// nhomChiPhi.ts
export type NhomChiPhi = 1 | 2 | 3 | 4;

// Ưu tiên khớp tiền tố dài nhất; không khớp → nhóm 4.
const PREFIX_RULES: { prefix: string; nhom: NhomChiPhi }[] = [
  { prefix: "632", nhom: 1 }, { prefix: "154", nhom: 1 }, { prefix: "156", nhom: 1 },
  { prefix: "152", nhom: 1 }, { prefix: "611", nhom: 1 },
  { prefix: "211", nhom: 2 }, { prefix: "213", nhom: 2 }, { prefix: "214", nhom: 2 },
  { prefix: "242", nhom: 2 }, { prefix: "153", nhom: 2 },
  { prefix: "3341", nhom: 3 }, { prefix: "3383", nhom: 3 }, { prefix: "3384", nhom: 3 },
  { prefix: "3386", nhom: 3 }, { prefix: "334", nhom: 3 }, { prefix: "338", nhom: 3 },
  { prefix: "622", nhom: 3 },
  { prefix: "635", nhom: 4 }, { prefix: "811", nhom: 4 }, { prefix: "641", nhom: 4 },
  { prefix: "642", nhom: 4 },
];

export function suggestNhomChiPhi(taiKhoanNo?: string): NhomChiPhi {
  if (!taiKhoanNo) return 4;
  const tk = taiKhoanNo.trim();
  const matches = PREFIX_RULES.filter((r) => tk.startsWith(r.prefix));
  if (!matches.length) return 4;
  matches.sort((a, b) => b.prefix.length - a.prefix.length);
  return matches[0].nhom;
}
```

- [ ] **Step 4: Run test → PASS.**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/nhomChiPhi.test.ts`
Expected: PASS.

- [ ] **Step 5: Thêm FE types.** Trong `types/index.ts`:

```typescript
export type KiemSoatTrangThai = 'HOP_LE' | 'KHONG_DUOC_TRU';
export interface HoSoChungTuItem { id: string; ma: string; ten: string; daCo: boolean; }
export interface KiemSoatChungTu {
  trangThai: KiemSoatTrangThai;
  nhomChiPhi?: 1 | 2 | 3 | 4;
  soTienKhongTru?: number;
  yKien?: string;
  nguoiKiemSoat?: string;
  ngayKiemSoat?: string;
}
```

Thêm vào interface `NhatKyChung`: `hoSoChungTu?: HoSoChungTuItem[];` và `kiemSoat?: KiemSoatChungTu;`.

- [ ] **Step 6: Cập nhật service.** Trong `nhatKyChungService.ts`: thêm 2 field vào `UpdateEntryDto`; trong hàm map `mapChungTuToNhatKyChung` thêm copy `hoSoChungTu` và `kiemSoat` từ response sang object trả về.

- [ ] **Step 7: Build FE.**

Run: `cd fe && npm run build`
Expected: pass.

- [ ] **Step 8: Commit.**

```bash
git add fe/src/types/index.ts fe/src/services/nhatKyChungService.ts fe/src/pages/chung-tu/nhat-ky-chung/nhomChiPhi.ts fe/src/pages/chung-tu/nhat-ky-chung/nhomChiPhi.test.ts
git commit -m "feat(fe): type kiểm soát/hồ sơ chứng từ + helper gợi ý nhóm chi phí (test)"
```

---

### Task 9: FE — load danh mục hồ sơ chứng từ vào handler nhật ký chung

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data/master-data.handler.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data/master-data.state.ts`

**Interfaces:**
- Consumes: `hoSoChungTuService.getAll()`.
- Produces: state `hoSoChungTuList: HoSoChungTu[]` (dùng ở Task 10).

- [ ] **Step 1: State.** Trong `master-data.state.ts`, thêm `hoSoChungTuList: HoSoChungTu[];` vào `MasterDataStates` (import `HoSoChungTu` từ `@/types`).

- [ ] **Step 2: Load.** Trong `master-data.handler.ts`, thêm `hoSoChungTuService.getAll()` vào `Promise.all`, nhận kết quả và `this.setState("hoSoChungTuList", hoSo)`. Thêm import service.

- [ ] **Step 3: Build FE.**

Run: `cd fe && npm run build`
Expected: pass.

- [ ] **Step 4: Commit.**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data
git commit -m "feat(fe): nhật ký chung — load danh mục hồ sơ chứng từ"
```

---

### Task 10: FE — cột "Biên tập hồ sơ" ở bảng nhật ký chung

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/components/BienTapHoSoCell.tsx`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`

**Interfaces:**
- Consumes: `NhatKyChung.hoSoChungTu`, `quyChaunList`, `hoSoChungTuList`, `nhatKyChungService.update`.
- Produces: cột hiển thị `daCo/total` + popover checklist; lưu `entry.hoSoChungTu`.

- [ ] **Step 1: Tạo `BienTapHoSoCell`.** Component nhận `entry: NhatKyChung`, `quyChaunList`, `hoSoChungTuList`, `onSaved`. Logic:
  - Danh sách hiện tại = `entry.hoSoChungTu`. Nếu rỗng → khởi tạo default từ quy chuẩn khớp: tìm `qc` trong `quyChaunList` theo `entry.danhMuc?.nghiepVu?.ten === qc.nghiepVu` (và nếu có `loaiGiaoDich` thì khớp luôn); lấy `qc.hoSoChungTu` map sang `{ id, ma, ten, daCo: false }`.
  - Hiển thị nút/badge `Đã có X/Y`.
  - Popover (antd `Popover`) chứa: list checkbox (tick `daCo`) cho từng item; nút thêm item từ `hoSoChungTuList` (Select), nút xoá item.
  - Khi đổi → gọi `nhatKyChungService.update(entry.id, { hoSoChungTu: items })` rồi `onSaved()` (refresh).

```tsx
// Khớp default từ quy chuẩn
const defaultFromQuyChuan = (): HoSoChungTuItem[] => {
  const nv = entry.danhMuc?.nghiepVu?.ten;
  const qc = quyChaunList.find((q) => q.nghiepVu === nv);
  return (qc?.hoSoChungTu || []).map((h) => ({ id: h.id, ma: h.ma, ten: h.ten, daCo: false }));
};
const items = entry.hoSoChungTu?.length ? entry.hoSoChungTu : defaultFromQuyChuan();
```

- [ ] **Step 2: Thêm cột vào EntryListTab.** Trong `getColumnDefinitions()`, thêm cột trước cột `action`:

```tsx
{
  title: "Biên tập hồ sơ",
  key: "hoSoChungTu",
  render: (_: unknown, record: NhatKyChung) => (
    <BienTapHoSoCell
      entry={record}
      quyChaunList={quyChaunList}
      hoSoChungTuList={hoSoChungTuList}
      onSaved={onRefresh}
    />
  ),
}
```

Thêm `"hoSoChungTu"` vào `DEFAULT_WIDTHS` (vd `160`). Lấy `quyChaunList`, `hoSoChungTuList` qua state hook của nhật ký chung trong `EntryListTab`; truyền hàm refresh hiện có (xem cách `EntryActions`/inline-edit refresh — dùng cùng cơ chế `refreshData`/event).

> Kiểm tra `getColumnDefinitions` đang nhận tham số gì (hiện `taiKhoanOptions`); mở rộng signature để truyền thêm `quyChaunList`, `hoSoChungTuList`, `onRefresh`, hoặc đọc state trực tiếp trong component con. Chọn cách ít sửa nhất, nhất quán với cột khác.

- [ ] **Step 3: Build FE.**

Run: `cd fe && npm run build`
Expected: pass.

- [ ] **Step 4: Verify thủ công.** Mở `/chung-tu/nhat-ky-chung`: cột "Biên tập hồ sơ" hiện; với giao dịch có quy chuẩn đã cấu hình hồ sơ → popover hiện sẵn danh sách; tick/thêm/bớt và lưu được; reload còn nguyên.

- [ ] **Step 5: Commit.**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/BienTapHoSoCell.tsx fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx
git commit -m "feat(fe): nhật ký chung — cột Biên tập hồ sơ (default theo quy chuẩn, tick/thêm/bớt)"
```

---

### Task 11: FE — cột "Kiểm soát" (Hợp lệ / Không được trừ + ý kiến)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/components/KiemSoatCell.tsx`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`

**Interfaces:**
- Consumes: `NhatKyChung.kiemSoat`, `suggestNhomChiPhi`, `nhatKyChungService.update`, AuthContext (tên user cho `nguoiKiemSoat`).
- Produces: cột dropdown trạng thái + popover chi tiết; lưu `entry.kiemSoat`.

- [ ] **Step 1: Tạo `KiemSoatCell`.** Nhận `entry`, `onSaved`. UI:
  - Cell hiển thị Tag: Hợp lệ (xanh) / Không được trừ (đỏ) / "-" nếu chưa đặt.
  - Click → Popover: Select trạng thái (HOP_LE / KHONG_DUOC_TRU). Khi `KHONG_DUOC_TRU` hiện thêm:
    - Select nhóm chi phí 1–4, mặc định `suggestNhomChiPhi(entry.taiKhoanNo || entry.danhMuc?.taiKhoanNo?.ma)`.
    - `InputNumber` số tiền không trừ, mặc định `entry.soTien`.
    - `Input.TextArea` ý kiến phê duyệt.
  - Nút Lưu → `nhatKyChungService.update(entry.id, { kiemSoat: { trangThai, nhomChiPhi, soTienKhongTru, yKien, nguoiKiemSoat: currentUserName } })` → `onSaved()`.
  - Hiển thị dòng nhỏ "Kiểm soát bởi {nguoiKiemSoat} · {ngayKiemSoat}" khi đã có.

```tsx
const tkNo = entry.taiKhoanNo || entry.danhMuc?.taiKhoanNo?.ma;
const [nhom, setNhom] = useState<NhomChiPhi>(entry.kiemSoat?.nhomChiPhi ?? suggestNhomChiPhi(tkNo));
const [soTien, setSoTien] = useState<number>(entry.kiemSoat?.soTienKhongTru ?? entry.soTien ?? 0);
```

> Lấy tên user hiện tại từ AuthContext (`grep -rn "useAuth\|currentUser\|user.hoTen" fe/src/contexts`). Truyền vào `nguoiKiemSoat`.

- [ ] **Step 2: Thêm cột vào EntryListTab** trước cột `action`:

```tsx
{
  title: "Kiểm soát",
  key: "kiemSoat",
  render: (_: unknown, record: NhatKyChung) => (
    <KiemSoatCell entry={record} onSaved={onRefresh} />
  ),
}
```

Thêm `"kiemSoat"` vào `DEFAULT_WIDTHS` (vd `150`).

- [ ] **Step 3: Build FE.**

Run: `cd fe && npm run build`
Expected: pass.

- [ ] **Step 4: Verify thủ công.** Đặt 1 giao dịch chi phí = "Không được trừ", chọn nhóm, số tiền, ý kiến → lưu; reload thấy Tag đỏ + người/ngày kiểm soát.

- [ ] **Step 5: Commit.**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/KiemSoatCell.tsx fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx
git commit -m "feat(fe): nhật ký chung — cột Kiểm soát (hợp lệ/không được trừ + ý kiến phê duyệt)"
```

---

## PHASE 4 — Báo cáo nhanh thuế TNDN: tự tính chi phí không được trừ

### Task 12: BE — voucher endpoint gom chi phí không được trừ theo quý + nhóm

**Files:**
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts`

**Interfaces:**
- Produces: `GET /nhat-ky-chung/chi-phi-khong-duoc-tru?nam=YYYY` → `{ success: true, data: { quy: number; nhom: number; soTien: number }[] }`. Service method `aggregateNonDeductible(nam: number, tenantId?: string)`.

- [ ] **Step 1: Service method.** Thêm vào `nhat-ky-chung.service.ts` (theo mẫu `aggregateBalance`):

```typescript
async aggregateNonDeductible(
  nam: number,
  tenantId?: string,
): Promise<{ success: boolean; data: { quy: number; nhom: number; soTien: number }[] }> {
  const start = new Date(Date.UTC(nam, 0, 1));
  const end = new Date(Date.UTC(nam, 11, 31, 23, 59, 59, 999));
  const pipeline: object[] = [
    {
      $match: {
        ...(tenantId ? { tenantId } : {}),
        'kiemSoat.trangThai': 'KHONG_DUOC_TRU',
        ngay: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          quy: { $ceil: { $divide: [{ $month: '$ngay' }, 3] } },
          nhom: { $ifNull: ['$kiemSoat.nhomChiPhi', 4] },
        },
        soTien: {
          $sum: { $ifNull: ['$kiemSoat.soTienKhongTru', '$soTien'] },
        },
      },
    },
  ];
  const rows = await this.chungTuRepository.aggregate(pipeline).toArray();
  const data = rows.map((r: any) => ({
    quy: r._id.quy,
    nhom: r._id.nhom,
    soTien: r.soTien || 0,
  }));
  return { success: true, data };
}
```

> Dùng đúng repository/aggregate API như `aggregateBalance` đang dùng (`this.chungTuRepository.aggregate(...).toArray()`). Nếu `aggregateBalance` lấy tenantId từ tham số, controller dưới đây truyền tương tự.

- [ ] **Step 2: Controller route.** Thêm (đặt TRƯỚC route `@Get(':id')` để không bị nuốt path), theo mẫu route `aggregate-balance`:

```typescript
@Get('chi-phi-khong-duoc-tru')
@Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KIEM_SOAT', 'MANAGER')
async chiPhiKhongDuocTru(
  @Query('nam', ParseIntPipe) nam: number,
  @Headers('x-tenant-id') tenantId?: string,
) {
  return this.nhatKyChungService.aggregateNonDeductible(nam, tenantId);
}
```

> Khớp cách route `aggregate-balance` nhận tenantId (header vs context). Mở controller để copy đúng decorator/tham số.

- [ ] **Step 3: Build voucher-service.**

Run: `cd be && npx tsc -p apps/voucher-service/tsconfig.app.json --noEmit`
Expected: không lỗi.

- [ ] **Step 4: Smoke test thủ công.** Chạy voucher-service, gọi `GET /voucher/nhat-ky-chung/chi-phi-khong-duoc-tru?nam=2026` (kèm token) → trả mảng (có thể rỗng nếu chưa đánh dấu).

- [ ] **Step 5: Commit.**

```bash
git add be/apps/voucher-service/src/nhat-ky-chung
git commit -m "feat(be): voucher — endpoint gom chi phí không được trừ theo quý/nhóm"
```

---

### Task 13: BE — ServiceClient.aggregateNonDeductible

**Files:**
- Modify: `be/libs/service-client/src/service-client.ts`

**Interfaces:**
- Produces: `aggregateNonDeductible(nam: number, authToken?: string, tenantId?: string): Promise<ServiceResponse<{ quy: number; nhom: number; soTien: number }[]>>`.

- [ ] **Step 1: Thêm method** (theo mẫu `aggregateBalance`):

```typescript
async aggregateNonDeductible(
  nam: number,
  authToken?: string,
  tenantId?: string,
): Promise<ServiceResponse<Array<{ quy: number; nhom: number; soTien: number }>>> {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = authToken;
  if (tenantId) headers['x-tenant-id'] = tenantId;
  return this.get('voucher', '/nhat-ky-chung/chi-phi-khong-duoc-tru', {
    headers: Object.keys(headers).length ? headers : undefined,
    query: { nam },
  });
}
```

- [ ] **Step 2: Build.**

Run: `cd be && npx tsc -p libs/service-client/tsconfig.lib.json --noEmit` (hoặc build lib tương ứng)
Expected: không lỗi.

- [ ] **Step 3: Commit.**

```bash
git add be/libs/service-client/src/service-client.ts
git commit -m "feat(be): ServiceClient.aggregateNonDeductible"
```

---

### Task 14: BE — tax-service gộp auto + điều chỉnh tay

**Files:**
- Create: `be/apps/tax-service/src/bao-cao/chi-phi-khong-tru.util.ts`
- Test: `be/apps/tax-service/src/bao-cao/chi-phi-khong-tru.util.spec.ts`
- Modify: `be/apps/tax-service/src/bao-cao/bao-cao.service.ts`

**Interfaces:**
- Consumes: `serviceClient.aggregateNonDeductible`, `DieuChinhThue` (cpkdtDichVuHangHoa/TscdCcdc/NhanCong/TaiChinhKhac arrays[4]).
- Produces: helper `buildCpKhongTru(autoRows, dieuChinh)` → `{ perQuy: number[4][4]; tongPerQuy: number[4] }` (perQuy[quyIndex][nhomIndex]); `TNDNQuyData.cpKhongTruAuto: number[]` (4 nhóm) thêm vào payload.

- [ ] **Step 1: Viết test helper (fail trước).**

```typescript
// chi-phi-khong-tru.util.spec.ts
import { buildCpKhongTru } from './chi-phi-khong-tru.util';

describe('buildCpKhongTru', () => {
  it('cộng auto (theo quý+nhóm) với điều chỉnh tay', () => {
    const auto = [
      { quy: 1, nhom: 1, soTien: 100 },
      { quy: 1, nhom: 3, soTien: 50 },
      { quy: 2, nhom: 4, soTien: 20 },
    ];
    const dieuChinh = {
      cpkdtDichVuHangHoa: [10, 0, 0, 0],
      cpkdtTscdCcdc: [0, 0, 0, 0],
      cpkdtNhanCong: [0, 0, 0, 0],
      cpkdtTaiChinhKhac: [0, 0, 0, 0],
    };
    const r = buildCpKhongTru(auto, dieuChinh as any);
    // Quý1: nhóm1 auto100+tay10=110, nhóm3 auto50 → tổng 160
    expect(r.perQuy[0][0]).toBe(110);
    expect(r.perQuy[0][2]).toBe(50);
    expect(r.tongPerQuy[0]).toBe(160);
    // Quý2: nhóm4 auto20 → tổng 20
    expect(r.tongPerQuy[1]).toBe(20);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

Run: `cd be && yarn test chi-phi-khong-tru.util`
Expected: FAIL.

- [ ] **Step 3: Viết helper.**

```typescript
// chi-phi-khong-tru.util.ts
export interface AutoRow { quy: number; nhom: number; soTien: number; }
export interface CpKhongTruResult { perQuy: number[][]; tongPerQuy: number[]; }

const FIELD_BY_NHOM = [
  'cpkdtDichVuHangHoa', // nhóm 1
  'cpkdtTscdCcdc',      // nhóm 2
  'cpkdtNhanCong',      // nhóm 3
  'cpkdtTaiChinhKhac',  // nhóm 4
];

export function buildCpKhongTru(
  autoRows: AutoRow[],
  dieuChinh: Record<string, number[]>,
): CpKhongTruResult {
  // perQuy[q][n] với q,n = 0..3
  const perQuy = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
  for (const row of autoRows || []) {
    const q = (row.quy || 1) - 1;
    const n = (row.nhom || 4) - 1;
    if (q < 0 || q > 3 || n < 0 || n > 3) continue;
    perQuy[q][n] += row.soTien || 0;
  }
  // cộng điều chỉnh tay
  FIELD_BY_NHOM.forEach((field, n) => {
    const arr = dieuChinh?.[field] || [0, 0, 0, 0];
    for (let q = 0; q < 4; q++) perQuy[q][n] += Number(arr[q]) || 0;
  });
  const tongPerQuy = perQuy.map((nhomArr) => nhomArr.reduce((a, b) => a + b, 0));
  return { perQuy, tongPerQuy };
}
```

- [ ] **Step 4: Run → PASS.**

Run: `cd be && yarn test chi-phi-khong-tru.util`
Expected: PASS.

- [ ] **Step 5: Tích hợp vào baoCaoTNDN.** Trong `bao-cao.service.ts`:
  - Thêm `this.serviceClient.aggregateNonDeductible(nam, authToken)` vào `Promise.all` cạnh `aggByQuy`/`getOrDefault`.
  - Tính `const cp = buildCpKhongTru(autoRes?.data || [], dieuChinh as any);`
  - Thay công thức `chiPhiKhongTru` mỗi quý: dùng `cp.tongPerQuy[i]` THAY cho tổng 4 field tay cũ.
  - Thêm vào mỗi `TNDNQuyData`: `cpKhongTruAuto: cp.perQuy[i]` (mảng 4 nhóm = auto+tay đã gộp). (Để FE hiển thị tách dòng.)
  - Luỹ kế: `cpKhongTruAuto` = cộng theo nhóm qua 4 quý.

```typescript
const quy: TNDNQuyData[] = aggQuarters.map((rows, i) => {
  // ... dt511..cp811 như cũ ...
  const chiPhiKhongTru = cp.tongPerQuy[i];
  // ... tính thuế dùng chiPhiKhongTru như cũ ...
  return { /* ...các field cũ..., */ chiPhiKhongTru, cpKhongTruAuto: cp.perQuy[i] };
});
```

- [ ] **Step 6: Build tax-service.**

Run: `cd be && npx tsc -p apps/tax-service/tsconfig.app.json --noEmit`
Expected: không lỗi.

- [ ] **Step 7: Commit.**

```bash
git add be/apps/tax-service/src/bao-cao
git commit -m "feat(be): báo cáo TNDN — tự tính chi phí không được trừ (auto + điều chỉnh tay)"
```

---

### Task 15: FE — báo cáo TNDN hiển thị auto + nhập tay điều chỉnh

**Files:**
- Modify: `fe/src/services/taxService.ts`
- Modify: `fe/src/pages/thue/bao-cao-tndn/BaoCaoTNDNPage.tsx`

**Interfaces:**
- Consumes: `BaoCaoTNDN.quy[i].cpKhongTruAuto: number[]` (4 nhóm, đã gồm auto+tay).
- Produces: 4 dòng chi phí không được trừ hiển thị giá trị tổng (auto+tay) + ô nhập tay điều chỉnh giữ nguyên `DieuChinhThue`.

- [ ] **Step 1: Cập nhật type.** Trong `taxService.ts`, thêm `cpKhongTruAuto?: number[];` vào `TNDNQuyData`.

- [ ] **Step 2: Hiển thị tổng theo nhóm.** Trong `BaoCaoTNDNPage.tsx`, cho 4 dòng `i1..i4`: hiển thị **giá trị tổng** từ `bao.quy[qi].cpKhongTruAuto[nhomIndex]` (chỉ đọc) BÊN CẠNH ô `InputNumber` nhập tay (giữ `dc[inputKey]`). Cách trình bày: cột hiển thị `fmt(auto)` nhỏ + input điều chỉnh; hoặc input như cũ và thêm dòng phụ "(gồm tự tính: X)". Map `inputKey → nhomIndex`:

```typescript
const NHOM_INDEX: Record<string, number> = {
  cpkdtDichVuHangHoa: 0,
  cpkdtTscdCcdc: 1,
  cpkdtNhanCong: 2,
  cpkdtTaiChinhKhac: 3,
};
```

Trong `renderQuarter` cho `row.kind === "input"`, lấy `const auto = bao?.quy?.[qi]?.cpKhongTruAuto?.[NHOM_INDEX[row.inputKey]] ?? 0;` và hiển thị kèm input.

> Lưu ý: `cpKhongTruAuto` từ BE đã = auto + tay. Ô input tay vẫn sửa `DieuChinhThue` và khi lưu BE tính lại; nên dòng "tổng" lấy thẳng `cpKhongTruAuto`, KHÔNG cộng thêm input ở FE (tránh đếm 2 lần). Ghi rõ nhãn: ô input = "điều chỉnh tay", số hiển thị = "tổng (gồm tự động từ chứng từ)".

- [ ] **Step 3: Build FE.**

Run: `cd fe && npm run build`
Expected: pass.

- [ ] **Step 4: Verify thủ công (end-to-end).** Ở nhật ký chung đánh dấu vài chi phí "Không được trừ" với nhóm khác nhau → vào `/thue/bao-cao-tndn` chọn đúng năm: 4 dòng chi phí không được trừ phản ánh số tự tính theo nhóm; nhập điều chỉnh tay → lưu → tổng tăng đúng; thuế TNDN tính lại đúng.

- [ ] **Step 5: Commit.**

```bash
git add fe/src/services/taxService.ts fe/src/pages/thue/bao-cao-tndn/BaoCaoTNDNPage.tsx
git commit -m "feat(fe): báo cáo TNDN — hiển thị chi phí không được trừ tự tính + điều chỉnh tay"
```

---

## Self-Review

**Spec coverage:**
- ✅ DM hồ sơ chứng từ (CRUD + seed): Task 1–4.
- ✅ Quy chuẩn cột "Biên tập hồ sơ": Task 5–6.
- ✅ Nhật ký chung cột "Biên tập hồ sơ" (default theo quy chuẩn, thêm/bớt linh hoạt): Task 7–10.
- ✅ Cột "Kiểm soát" (Hợp lệ / Không được trừ + nhóm tự suy theo TK + ý kiến/người/ngày): Task 7, 8, 11.
- ✅ Báo cáo TNDN tự tính + điều chỉnh tay: Task 12–15.
- ✅ Ngoài phạm vi (cảnh báo vàng/đỏ) — không có task, đúng chủ ý.

**Placeholder scan:** Các điểm "kiểm tra code thực tế" đều kèm lệnh `grep`/mẫu file cụ thể, không phải TODO mơ hồ. Không còn "TBD".

**Type consistency:**
- `KiemSoatChungTu` (BE entity Task 7) ↔ `KiemSoatChungTu` (FE Task 8): cùng field, `nhomChiPhi: 1|2|3|4`, `trangThai: 'HOP_LE'|'KHONG_DUOC_TRU'`. ✅
- Hồ sơ snapshot: quy chuẩn dùng `{id,ma,ten}` (Task 5/6); chứng từ dùng `{id,ma,ten,daCo}` (Task 7/8) — khác nhau có chủ đích (`daCo` chỉ ở chứng từ). ✅
- `aggregateNonDeductible` trả `{quy,nhom,soTien}` ở cả Task 12/13/14. ✅
- `cpKhongTruAuto: number[]` (4 nhóm) nhất quán Task 14 (produce) ↔ Task 15 (consume), index theo `NHOM_INDEX`/`FIELD_BY_NHOM` cùng thứ tự (DV/hàng hóa, TSCĐ/CCDC, nhân công, tài chính/khác). ✅
- Helper `suggestNhomChiPhi` (Task 8) trả `1|2|3|4`, dùng ở Task 11. ✅

**Lưu ý rủi ro để người thực thi tự xác minh tại chỗ (không bịa API):**
- Cách `aggregateBalance`/route `aggregate-balance` nhận tenantId (header vs context) — copy đúng mẫu hiện có.
- Nguồn tên user cho `nguoiKiemSoat` (BE context hay FE AuthContext) — chọn cách khả thi theo code thực tế.
- `getColumnDefinitions` signature ở EntryListTab — mở rộng tối thiểu, nhất quán cột khác.
