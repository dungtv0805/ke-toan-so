# Phân hệ Kho — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm phân hệ Kho gồm 4 danh mục (Kho, Đơn vị tính, Nhóm vật tư, Hàng hóa vật tư) và 3 loại phiếu (Nhập/Xuất/Chuyển kho) có thể lưu và in theo mẫu (01-VT / 02-VT / 03XKNB3).

**Architecture:** 4 danh mục theo pattern CRUD hiện có trong `master-data-service` (3002). Phiếu kho ở microservice mới `kho-service` (3008), 1 collection `phieu_kho` chung cho 3 loại, số phiếu tự sinh qua sequence. FE: trang antd đơn giản (như `SanPhamPage`) cho danh mục; trang list + editor inline-grid cho phiếu. In tái dùng cơ chế token `{{...}}` của phiếu thu/chi.

**Tech Stack:** NestJS 11 + TypeORM/MongoDB (BE), React 18 + antd + Vite + zod (FE), env-cmd (env), gateway proxy theo prefix path.

## Global Constraints

- BE entity kế thừa `BaseEntity` (`@app/entities`), có `isActive` default true, filter theo tenant qua `TenantContextService.getCurrentTenantId()`.
- Controller bảo vệ bằng `@UseGuards(JwtGuard, RoleGuard)` + `@Roles(...)`; trả `{ success: true, ... }`.
- DTO dùng `class-validator`; `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`.
- FE service kế thừa `ServiceBase`, map `_id`→`id`. Quyền trang qua `usePagePermission(<route>)` + `ProtectedRoute requiredPermission="<route>:xem"`.
- Tất cả tiền tệ/format/đọc số tiền bằng chữ tái dùng `fe/src/pages/chung-tu/phieu/lib/{format,docTienBangChu}`.
- Port mới: kho-service = **3008**. Gateway prefix `/kho` → kho-service.
- Snapshot danh mục trong phiếu: lưu cả mã + tên.
- Commit sau mỗi task. Nhánh: `feat/phan-he-kho`.

---

## PHASE 1 — Backend Danh mục (master-data-service)

### Task 1: 4 entity danh mục + đăng ký

**Files:**
- Create: `be/libs/entities/src/master-data/kho.entity.ts`
- Create: `be/libs/entities/src/master-data/don-vi-tinh.entity.ts`
- Create: `be/libs/entities/src/master-data/nhom-vat-tu.entity.ts`
- Create: `be/libs/entities/src/master-data/hang-hoa-vat-tu.entity.ts`
- Modify: `be/libs/entities/src/master-data/index.ts` (thêm import + re-export 4 file)

**Interfaces:**
- Produces: entity classes `Kho`, `DonViTinh`, `NhomVatTu`, `HangHoaVatTu` (export từ `@app/entities`).

- [ ] **Step 1: Tạo `kho.entity.ts`** (mẫu theo `san-pham.entity.ts`)

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('kho')
export class Kho extends BaseEntity {
  @Column() ma: string;
  @Column() ten: string;
  @Column({ nullable: true }) diaChi: string;
  @Column({ nullable: true }) thuKho: string;
  @Column({ nullable: true }) moTa: string;
  @Column({ default: true }) isActive: boolean;
}

export interface KhoEntities { Kho: typeof Kho; }
declare module '../entities' { interface Entities extends KhoEntities {} }
```

- [ ] **Step 2: Tạo `don-vi-tinh.entity.ts`** (`@Entity('don_vi_tinh')`, class `DonViTinh`): cột `ma`, `ten`, `moTa?`, `isActive`. Khối `declare module` tương tự với `DonViTinhEntities { DonViTinh: typeof DonViTinh }`.

- [ ] **Step 3: Tạo `nhom-vat-tu.entity.ts`** (`@Entity('nhom_vat_tu')`, class `NhomVatTu`): cột `ma`, `ten`, `moTa?`, `isActive`. `declare module` với `NhomVatTuEntities`.

- [ ] **Step 4: Tạo `hang-hoa-vat-tu.entity.ts`** (`@Entity('hang_hoa_vat_tu')`, class `HangHoaVatTu`)

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type TinhChatVatTu = 'TAI_SAN' | 'HANG_HOA' | 'NGUYEN_LIEU';

@Entity('hang_hoa_vat_tu')
export class HangHoaVatTu extends BaseEntity {
  @Column() ma: string;
  @Column() ten: string;
  @Column({ nullable: true }) tinhChat: TinhChatVatTu;
  @Column({ nullable: true }) donViTinhMa: string;
  @Column({ nullable: true }) donViTinhTen: string;
  @Column({ nullable: true }) nhomVatTuMa: string;
  @Column({ nullable: true }) nhomVatTuTen: string;
  @Column({ nullable: true }) quyCach: string;
  @Column({ nullable: true }) tkKho: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true }) donGia: number;
  @Column({ nullable: true }) moTa: string;
  @Column({ default: true }) isActive: boolean;
}

export interface HangHoaVatTuEntities { HangHoaVatTu: typeof HangHoaVatTu; }
declare module '../entities' { interface Entities extends HangHoaVatTuEntities {} }
```

- [ ] **Step 5: Cập nhật `index.ts`** — thêm vào cả khối import (đầu file) và khối re-export:

```typescript
import './kho.entity';
import './don-vi-tinh.entity';
import './nhom-vat-tu.entity';
import './hang-hoa-vat-tu.entity';
// ... và:
export * from './kho.entity';
export * from './don-vi-tinh.entity';
export * from './nhom-vat-tu.entity';
export * from './hang-hoa-vat-tu.entity';
```

- [ ] **Step 6: Build check**

Run: `cd be && yarn tsc -p apps/master-data-service/tsconfig.app.json --noEmit`
Expected: PASS (không lỗi type).

- [ ] **Step 7: Commit**

```bash
git add be/libs/entities/src/master-data
git commit -m "feat(kho): 4 entity danh mục kho/đvt/nhóm vật tư/hàng hóa vật tư"
```

---

### Task 2: 4 module CRUD + wire vào MasterDataServiceModule

**Files:**
- Create (mỗi danh mục, 5 file): `be/apps/master-data-service/src/<ten>/<ten>.{controller,service,module}.ts` + `dto/{create-,update-}<ten>.dto.ts` + `dto/index.ts`
  - thư mục: `kho/`, `don-vi-tinh/`, `nhom-vat-tu/`, `hang-hoa-vat-tu/`
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`

**Interfaces:**
- Consumes: entity classes từ Task 1.
- Produces: REST routes `/master-data/{kho,don-vi-tinh,nhom-vat-tu,hang-hoa-vat-tu}` với CRUD + `/all`, `/stats`, `/search`, `/check-ma`, `/total`.

> **Pattern nguồn để sao chép:** `be/apps/master-data-service/src/san-pham/` (service, controller, module, dto). Sao chép nguyên cấu trúc, đổi tên class/entity/route, đổi danh sách cột search và `getStats()`.

- [ ] **Step 1: Tạo module `kho`** — copy 5 file từ `san-pham/`, thay:
  - `SanPham`→`Kho`, `sanPham`→`kho`, route `@Controller('kho')`, FE endpoint `/master-data/kho`.
  - `getStats()` trả `{ tong: number }` (đếm active). Search theo `ma`, `ten`.
  - DTO `CreateKhoDto`: `ma`(req), `ten`(req), `diaChi?`, `thuKho?`, `moTa?` (đều `@IsString`).
  - `module.ts`: `DatabaseModule.forFeature([Kho])`.

- [ ] **Step 2: Tạo module `don-vi-tinh`** — copy tương tự. Class `DonViTinh`, route `@Controller('don-vi-tinh')`. DTO: `ma`(req), `ten`(req), `moTa?`. `getStats()` → `{ tong }`.

- [ ] **Step 3: Tạo module `nhom-vat-tu`** — copy tương tự. Class `NhomVatTu`, route `@Controller('nhom-vat-tu')`. DTO: `ma`(req), `ten`(req), `moTa?`.

- [ ] **Step 4: Tạo module `hang-hoa-vat-tu`** — copy tương tự. Class `HangHoaVatTu`, route `@Controller('hang-hoa-vat-tu')`. DTO `CreateHangHoaVatTuDto`:

```typescript
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateHangHoaVatTuDto {
  @IsString() @IsNotEmpty() ma: string;
  @IsString() @IsNotEmpty() ten: string;
  @IsString() @IsOptional() @IsIn(['TAI_SAN', 'HANG_HOA', 'NGUYEN_LIEU']) tinhChat?: string;
  @IsString() @IsOptional() donViTinhMa?: string;
  @IsString() @IsOptional() donViTinhTen?: string;
  @IsString() @IsOptional() nhomVatTuMa?: string;
  @IsString() @IsOptional() nhomVatTuTen?: string;
  @IsString() @IsOptional() quyCach?: string;
  @IsString() @IsOptional() tkKho?: string;
  @IsNumber() @IsOptional() donGia?: number;
  @IsString() @IsOptional() moTa?: string;
}
```
  `getStats()` → `{ tong, theoTinhChat: Record<string, number> }` (đếm theo `tinhChat`).

- [ ] **Step 5: Wire vào `master-data-service.module.ts`** — thêm 4 import module, thêm 4 entity vào `DatabaseModule.forFeature([...])`, thêm 4 module vào mảng `imports`:

```typescript
import { KhoModule } from './kho/kho.module';
import { DonViTinhModule } from './don-vi-tinh/don-vi-tinh.module';
import { NhomVatTuModule } from './nhom-vat-tu/nhom-vat-tu.module';
import { HangHoaVatTuModule } from './hang-hoa-vat-tu/hang-hoa-vat-tu.module';
import { Kho, DonViTinh, NhomVatTu, HangHoaVatTu } from '@app/entities';
// forFeature: ...thêm Kho, DonViTinh, NhomVatTu, HangHoaVatTu
// imports: ...thêm KhoModule, DonViTinhModule, NhomVatTuModule, HangHoaVatTuModule
```

- [ ] **Step 6: Chạy service kiểm tra khởi động**

Run: `cd be && yarn start:master-data:dev` (chờ log "Master Data ... running", Ctrl-C). Kiểm tra không lỗi route trùng.
Expected: service khởi động, không lỗi.

- [ ] **Step 7: Smoke test API** (service đang chạy + có JWT) — hoặc kiểm tra qua FE ở Task 4.

Run: `curl -s localhost:3002/kho/all -H "authorization: Bearer <token>"` (tùy chọn)
Expected: `[]` hoặc danh sách.

- [ ] **Step 8: Commit**

```bash
git add be/apps/master-data-service/src
git commit -m "feat(kho): 4 module CRUD danh mục + wire master-data module"
```

---

## PHASE 2 — Frontend Danh mục

### Task 3: FE types + 4 service

**Files:**
- Modify: `fe/src/types/index.ts` (thêm 4 interface)
- Create: `fe/src/services/khoService.ts`, `donViTinhService.ts`, `nhomVatTuService.ts`, `hangHoaVatTuService.ts`

**Interfaces:**
- Produces: `khoService`, `donViTinhService`, `nhomVatTuService`, `hangHoaVatTuService` (instance) + types `Kho`, `DonViTinh`, `NhomVatTu`, `HangHoaVatTu`.

- [ ] **Step 1: Thêm types vào `fe/src/types/index.ts`**

```typescript
export type TinhChatVatTu = 'TAI_SAN' | 'HANG_HOA' | 'NGUYEN_LIEU';
export interface Kho { id: string; ma: string; ten: string; diaChi?: string; thuKho?: string; moTa?: string; isActive?: boolean; }
export interface DonViTinh { id: string; ma: string; ten: string; moTa?: string; isActive?: boolean; }
export interface NhomVatTu { id: string; ma: string; ten: string; moTa?: string; isActive?: boolean; }
export interface HangHoaVatTu {
  id: string; ma: string; ten: string; tinhChat?: TinhChatVatTu;
  donViTinhMa?: string; donViTinhTen?: string; nhomVatTuMa?: string; nhomVatTuTen?: string;
  quyCach?: string; tkKho?: string; donGia?: number; moTa?: string; isActive?: boolean;
}
```

- [ ] **Step 2: Tạo `khoService.ts`** — copy `sanPhamService.ts`, đổi `SanPham`→`Kho`, endpoint `/master-data/kho`, `getStats()` trả `{ tong: number }`. Export `khoService` + interface `KhoStats { tong: number }`.

- [ ] **Step 3: Tạo `donViTinhService.ts`, `nhomVatTuService.ts`** — copy tương tự (endpoint `/master-data/don-vi-tinh`, `/master-data/nhom-vat-tu`), stats `{ tong }`.

- [ ] **Step 4: Tạo `hangHoaVatTuService.ts`** — copy tương tự, endpoint `/master-data/hang-hoa-vat-tu`, stats `{ tong: number; theoTinhChat?: Record<string, number> }`.

- [ ] **Step 5: Build check**

Run: `cd fe && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add fe/src/types fe/src/services
git commit -m "feat(kho): FE types + 4 service danh mục kho"
```

---

### Task 4: 4 trang danh mục + routes + sidebar + quyền

**Files:**
- Create: `fe/src/pages/danh-muc/kho/KhoPage.tsx`, `don-vi-tinh/DonViTinhPage.tsx`, `nhom-vat-tu/NhomVatTuPage.tsx`, `hang-hoa-vat-tu/HangHoaVatTuPage.tsx`
- Modify: `fe/src/pages/loadable.tsx` (export 4 trang)
- Modify: `fe/src/App.tsx` (4 route trong `<Route path="danh-muc">`)
- Modify: `fe/src/components/layout/MainLayout.tsx` (`existingRoutes` + menu items)
- Modify: `fe/src/config/routePermissions.ts` (4 route)

**Interfaces:**
- Consumes: service + types Task 3.
- Produces: route FE `/danh-muc/{kho,don-vi-tinh,nhom-vat-tu,hang-hoa-vat-tu}`.

> **Pattern nguồn:** `fe/src/pages/danh-muc/san-pham/SanPhamPage.tsx`. Copy, đổi service/type/cột bảng/field form/zod schema/`usePagePermission("/danh-muc/<route>")`, breadcrumb.

- [ ] **Step 1: `KhoPage.tsx`** — copy SanPhamPage; cột bảng: Mã, Tên, Địa chỉ, Thủ kho. Form: `ma`, `ten`, `diaChi`, `thuKho`, `moTa`. zod: `ma`/`ten` bắt buộc. `usePagePermission("/danh-muc/kho")`.

- [ ] **Step 2: `DonViTinhPage.tsx`, `NhomVatTuPage.tsx`** — copy; cột Mã, Tên, Mô tả; form `ma`, `ten`, `moTa`.

- [ ] **Step 3: `HangHoaVatTuPage.tsx`** — copy; cột Mã, Tên, Tính chất (render nhãn: Tài sản/Hàng hóa/Nguyên liệu), ĐVT, Nhóm, Đơn giá. Form thêm:
  - `tinhChat`: antd `Select` options `[{value:'TAI_SAN',label:'Tài sản'},{value:'HANG_HOA',label:'Hàng hóa'},{value:'NGUYEN_LIEU',label:'Nguyên liệu'}]`.
  - `donViTinh`: `Select` nạp `donViTinhService.getAll()`, onChange set cả `donViTinhMa`+`donViTinhTen`.
  - `nhomVatTu`: `Select` nạp `nhomVatTuService.getAll()`, set `nhomVatTuMa`+`nhomVatTuTen`.
  - `quyCach`, `tkKho`, `donGia` (InputNumber), `moTa`.

- [ ] **Step 4: `loadable.tsx`** — thêm:

```typescript
export const KhoPage = loadable(() => import("./danh-muc/kho/KhoPage"));
export const DonViTinhPage = loadable(() => import("./danh-muc/don-vi-tinh/DonViTinhPage"));
export const NhomVatTuPage = loadable(() => import("./danh-muc/nhom-vat-tu/NhomVatTuPage"));
export const HangHoaVatTuPage = loadable(() => import("./danh-muc/hang-hoa-vat-tu/HangHoaVatTuPage"));
```
(Kiểm tra cú pháp `loadable` hiện có trong file để khớp.)

- [ ] **Step 5: `App.tsx`** — import 4 trang từ `./pages/loadable`, thêm trong `<Route path="danh-muc">`:

```tsx
<Route path="kho" element={<ProtectedRoute requiredPermission="/danh-muc/kho:xem"><KhoPage /></ProtectedRoute>} />
<Route path="don-vi-tinh" element={<ProtectedRoute requiredPermission="/danh-muc/don-vi-tinh:xem"><DonViTinhPage /></ProtectedRoute>} />
<Route path="nhom-vat-tu" element={<ProtectedRoute requiredPermission="/danh-muc/nhom-vat-tu:xem"><NhomVatTuPage /></ProtectedRoute>} />
<Route path="hang-hoa-vat-tu" element={<ProtectedRoute requiredPermission="/danh-muc/hang-hoa-vat-tu:xem"><HangHoaVatTuPage /></ProtectedRoute>} />
```

- [ ] **Step 6: `MainLayout.tsx`** — (a) thêm 4 route vào mảng `existingRoutes` (lines ~81-100): `"/danh-muc/kho"`, `"/danh-muc/don-vi-tinh"`, `"/danh-muc/nhom-vat-tu"`, `"/danh-muc/hang-hoa-vat-tu"`. (b) Trong menu "Danh mục", "Kho" đã có sẵn (line ~231) → giờ thành active. Thêm 3 mục:

```tsx
getMenuItem("Hàng hóa vật tư", "/danh-muc/hang-hoa-vat-tu", <InboxOutlined />),
getMenuItem("Đơn vị tính", "/danh-muc/don-vi-tinh", <TagOutlined />),
getMenuItem("Nhóm vật tư", "/danh-muc/nhom-vat-tu", <AppstoreOutlined />),
```

- [ ] **Step 7: `routePermissions.ts`** — thêm 4 route theo định dạng các route `/danh-muc/*` hiện có (copy nhóm quyền của `/danh-muc/san-pham`).

- [ ] **Step 8: Chạy FE, kiểm tra 4 trang CRUD**

Run: `cd fe && npm run dev` → mở `/danh-muc/kho`, `/danh-muc/hang-hoa-vat-tu`, ... thử Thêm/Sửa/Xóa.
Expected: 4 trang hiển thị, CRUD hoạt động (BE master-data đang chạy).

- [ ] **Step 9: Build + lint**

Run: `cd fe && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add fe/src
git commit -m "feat(kho): 4 trang danh mục FE + routes + sidebar + quyền"
```

---

## PHASE 3 — Backend kho-service (port 3008)

### Task 5: Entity PhieuKho + PhieuKhoSequence

**Files:**
- Create: `be/libs/entities/src/kho/phieu-kho.entity.ts`
- Create: `be/libs/entities/src/kho/phieu-kho-sequence.entity.ts`
- Create: `be/libs/entities/src/kho/index.ts`
- Modify: `be/libs/entities/src/index.ts` (thêm `export * from './kho';`)

**Interfaces:**
- Produces: `PhieuKho`, `PhieuKhoSequence`, interface `ChiTietPhieuKho`, type `LoaiPhieuKho`.

- [ ] **Step 1: `phieu-kho.entity.ts`**

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type LoaiPhieuKho = 'NHAP' | 'XUAT' | 'CHUYEN';

export interface ChiTietPhieuKho {
  stt: number;
  hangHoaMa: string;
  hangHoaTen: string;
  quyCach?: string;
  donViTinh?: string;
  khoMa?: string;
  khoTen?: string;
  tkNo?: string;
  tkCo?: string;
  soLuong: number;
  soLuongChungTu?: number;
  soLuongThucTe?: number;
  donGia: number;
  thanhTien: number;
}

@Entity('phieu_kho')
export class PhieuKho extends BaseEntity {
  @Column() loaiPhieu: LoaiPhieuKho;
  @Column() soPhieu: string;
  @Column({ nullable: true }) loaiNghiepVu: string;
  @Column() ngayHachToan: Date;
  @Column({ nullable: true }) ngayChungTu: Date;
  @Column({ nullable: true }) soChungTuGoc: string;
  @Column({ nullable: true }) thamChieu: string;
  @Column({ nullable: true }) doiTuongMa: string;
  @Column({ nullable: true }) doiTuongTen: string;
  @Column({ nullable: true }) diaChi: string;
  @Column({ nullable: true }) nguoiGiaoNhan: string;
  @Column({ nullable: true }) nhanVien: string;
  @Column({ nullable: true }) dienGiai: string;
  @Column({ nullable: true }) khoMa: string;
  @Column({ nullable: true }) khoTen: string;
  @Column({ nullable: true }) khoXuatMa: string;
  @Column({ nullable: true }) khoXuatTen: string;
  @Column({ nullable: true }) khoNhapMa: string;
  @Column({ nullable: true }) khoNhapTen: string;
  @Column({ nullable: true }) nguoiVanChuyen: string;
  @Column({ nullable: true }) hopDongVC: string;
  @Column({ nullable: true }) phuongTienVC: string;
  @Column({ nullable: true }) lenhDieuDong: string;
  @Column({ nullable: true }) veViec: string;
  @Column({ type: 'json', default: [] }) chiTiet: ChiTietPhieuKho[];
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tongTien: number;
  @Column({ nullable: true }) tongTienBangChu: string;
  @Column({ default: 'DRAFT' }) trangThai: string;
  @Column({ default: true }) isActive: boolean;
}

export interface PhieuKhoEntities { PhieuKho: typeof PhieuKho; }
declare module '../entities' { interface Entities extends PhieuKhoEntities {} }
```

- [ ] **Step 2: `phieu-kho-sequence.entity.ts`** (mẫu theo `voucher/voucher-sequence.entity.ts` — đọc file đó trước để khớp cấu trúc)

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('phieu_kho_sequence')
export class PhieuKhoSequence extends BaseEntity {
  @Column() loaiPhieu: string;   // NHAP | XUAT | CHUYEN
  @Column({ default: 0 }) current: number;
}

export interface PhieuKhoSequenceEntities { PhieuKhoSequence: typeof PhieuKhoSequence; }
declare module '../entities' { interface Entities extends PhieuKhoSequenceEntities {} }
```

- [ ] **Step 3: `kho/index.ts`**

```typescript
import './phieu-kho.entity';
import './phieu-kho-sequence.entity';
export * from './phieu-kho.entity';
export * from './phieu-kho-sequence.entity';
```

- [ ] **Step 4: `entities/index.ts`** — thêm dòng `export * from './kho';` (sau `./voucher`).

- [ ] **Step 5: Build check**

Run: `cd be && yarn tsc -p libs/entities/tsconfig.lib.json --noEmit` (hoặc build cả service ở Task 6)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add be/libs/entities/src/kho be/libs/entities/src/index.ts
git commit -m "feat(kho): entity PhieuKho + PhieuKhoSequence"
```

---

### Task 6: Scaffold kho-service app + hạ tầng (nest-cli, scripts, env)

**Files:**
- Create: `be/apps/kho-service/src/main.ts`
- Create: `be/apps/kho-service/src/kho-service.module.ts`
- Create: `be/apps/kho-service/tsconfig.app.json` (copy từ `apps/cash-book-service/tsconfig.app.json`)
- Modify: `be/nest-cli.json` (thêm project `kho-service`)
- Modify: `be/package.json` (scripts `start:kho`, `start:kho:dev`, thêm vào `start:all` + `start:all:dev`)
- Modify: `be/.env-cmdrc` (block `kho` + thêm port vào `services`)

**Interfaces:**
- Consumes: `PhieuKho`, `PhieuKhoSequence` (Task 5), `PhieuKhoModule` (Task 7 — import sau).
- Produces: app NestJS lắng nghe port 3008.

- [ ] **Step 1: `main.ts`** (copy `cash-book-service/src/main.ts`, đổi tên + port)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { KhoServiceModule } from './kho-service.module';

async function bootstrap() {
  const app = await NestFactory.create(KhoServiceModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.enableCors();
  const port = process.env.KHO_SERVICE_PORT || 3008;
  await app.listen(port);
  console.log(`Kho Service is running on port ${port}`);
}
bootstrap();
```

- [ ] **Step 2: `kho-service.module.ts`** (copy `cash-book-service.module.ts`, import `PhieuKhoModule` từ Task 7)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { TenantModule } from '@app/core';
import { DatabaseModule } from '@app/database';
import { PhieuKhoModule } from './phieu-kho/phieu-kho.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantModule,
    DatabaseModule.forRoot(),
    AuthModule,
    PhieuKhoModule,
  ],
})
export class KhoServiceModule {}
```

- [ ] **Step 3: `tsconfig.app.json`** — copy từ `apps/cash-book-service/tsconfig.app.json`, sửa `outDir` → `../../dist/apps/kho-service`.

- [ ] **Step 4: `nest-cli.json`** — thêm vào `projects` (copy block `cash-book-service`, đổi tên/đường dẫn `apps/kho-service`, `sourceRoot: apps/kho-service/src`, `entryFile: main`).

- [ ] **Step 5: `package.json`** — thêm scripts (env groups copy theo cash-book: `db,jwt,services` + group `kho`):

```json
"start:kho": "env-cmd -e kho,db,jwt,services -- nest start kho-service",
"start:kho:dev": "env-cmd -e kho,db,jwt,services -- nest start kho-service --watch",
```
và thêm `\"yarn start:kho:dev\"` vào `start:all` và `start:all:dev`.

- [ ] **Step 6: `.env-cmdrc`** — thêm block `"kho": { "KHO_SERVICE_PORT": 3008 }` và trong block `services` thêm `"SERVICE_KHO_HOST": "localhost", "SERVICE_KHO_PORT": 3008` (khớp tên biến gateway ở Task 8). Đọc block `cash-book` hiện có để khớp đúng cấu trúc Mongo URI/DB name.

- [ ] **Step 7: Commit** (chưa chạy được tới khi Task 7 xong)

```bash
git add be/apps/kho-service be/nest-cli.json be/package.json be/.env-cmdrc
git commit -m "feat(kho): scaffold kho-service (port 3008) + hạ tầng nest/scripts/env"
```

---

### Task 7: Module PhieuKho (controller + service + sequence + dto)

**Files:**
- Create: `be/apps/kho-service/src/phieu-kho/phieu-kho.module.ts`
- Create: `be/apps/kho-service/src/phieu-kho/phieu-kho.controller.ts`
- Create: `be/apps/kho-service/src/phieu-kho/phieu-kho.service.ts`
- Create: `be/apps/kho-service/src/phieu-kho/phieu-kho-sequence.service.ts`
- Create: `be/apps/kho-service/src/phieu-kho/dto/{create-phieu-kho.dto.ts,update-phieu-kho.dto.ts,chi-tiet-phieu-kho.dto.ts,index.ts}`

**Interfaces:**
- Consumes: `PhieuKho`, `PhieuKhoSequence`, `ChiTietPhieuKho`, `TenantContextService`, `sanitizeUpdateDto` (`@app/core`), `PaginationQueryDto` (`@app/dto`).
- Produces: routes prefix `kho` → `/kho/phieu*` (xem bảng spec §B3).

- [ ] **Step 1: DTO `chi-tiet-phieu-kho.dto.ts`**

```typescript
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ChiTietPhieuKhoDto {
  @IsNumber() stt: number;
  @IsString() hangHoaMa: string;
  @IsString() hangHoaTen: string;
  @IsString() @IsOptional() quyCach?: string;
  @IsString() @IsOptional() donViTinh?: string;
  @IsString() @IsOptional() khoMa?: string;
  @IsString() @IsOptional() khoTen?: string;
  @IsString() @IsOptional() tkNo?: string;
  @IsString() @IsOptional() tkCo?: string;
  @IsNumber() soLuong: number;
  @IsNumber() @IsOptional() soLuongChungTu?: number;
  @IsNumber() @IsOptional() soLuongThucTe?: number;
  @IsNumber() donGia: number;
  @IsNumber() thanhTien: number;
}
```

- [ ] **Step 2: DTO `create-phieu-kho.dto.ts`**

```typescript
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ChiTietPhieuKhoDto } from './chi-tiet-phieu-kho.dto';

export class CreatePhieuKhoDto {
  @IsString() @IsIn(['NHAP', 'XUAT', 'CHUYEN']) loaiPhieu: string;
  @IsString() @IsOptional() soPhieu?: string;          // BE tự sinh nếu rỗng
  @IsString() @IsOptional() loaiNghiepVu?: string;
  @IsDateString() ngayHachToan: string;
  @IsDateString() @IsOptional() ngayChungTu?: string;
  @IsString() @IsOptional() soChungTuGoc?: string;
  @IsString() @IsOptional() thamChieu?: string;
  @IsString() @IsOptional() doiTuongMa?: string;
  @IsString() @IsOptional() doiTuongTen?: string;
  @IsString() @IsOptional() diaChi?: string;
  @IsString() @IsOptional() nguoiGiaoNhan?: string;
  @IsString() @IsOptional() nhanVien?: string;
  @IsString() @IsOptional() dienGiai?: string;
  @IsString() @IsOptional() khoMa?: string;
  @IsString() @IsOptional() khoTen?: string;
  @IsString() @IsOptional() khoXuatMa?: string;
  @IsString() @IsOptional() khoXuatTen?: string;
  @IsString() @IsOptional() khoNhapMa?: string;
  @IsString() @IsOptional() khoNhapTen?: string;
  @IsString() @IsOptional() nguoiVanChuyen?: string;
  @IsString() @IsOptional() hopDongVC?: string;
  @IsString() @IsOptional() phuongTienVC?: string;
  @IsString() @IsOptional() lenhDieuDong?: string;
  @IsString() @IsOptional() veViec?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChiTietPhieuKhoDto) chiTiet: ChiTietPhieuKhoDto[];
  @IsNumber() @IsOptional() tongTien?: number;
  @IsString() @IsOptional() tongTienBangChu?: string;
  @IsString() @IsOptional() trangThai?: string;
}
```

- [ ] **Step 3: DTO `update-phieu-kho.dto.ts`** (`PartialType(CreatePhieuKhoDto)`) + `dto/index.ts` (re-export 3 DTO).

- [ ] **Step 4: `phieu-kho-sequence.service.ts`** — sinh số phiếu theo `(tenant, loaiPhieu)`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhieuKhoSequence } from '@app/entities';
import { TenantContextService } from '@app/core';

const PREFIX: Record<string, string> = { NHAP: 'NK', XUAT: 'XK', CHUYEN: 'CK' };

@Injectable()
export class PhieuKhoSequenceService {
  constructor(
    @InjectRepository(PhieuKhoSequence) private readonly repo: Repository<PhieuKhoSequence>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  format(loaiPhieu: string, n: number): string {
    return `${PREFIX[loaiPhieu] ?? 'PK'}${String(n).padStart(5, '0')}`;
  }

  async peek(loaiPhieu: string): Promise<string> {
    const seq = await this.repo.findOne({ where: { loaiPhieu, ...this.tenantFilter() } as any });
    return this.format(loaiPhieu, (seq?.current ?? 0) + 1);
  }

  async next(loaiPhieu: string): Promise<string> {
    let seq = await this.repo.findOne({ where: { loaiPhieu, ...this.tenantFilter() } as any });
    if (!seq) seq = this.repo.create({ loaiPhieu, current: 0, ...this.tenantFilter() } as any);
    seq.current = (seq.current ?? 0) + 1;
    await this.repo.save(seq);
    return this.format(loaiPhieu, seq.current);
  }
}
```

- [ ] **Step 5: `phieu-kho.service.ts`** — CRUD (mẫu service theo `san-pham.service.ts` cho phần tenant/pagination/findOne ObjectId). `create()`: nếu `soPhieu` rỗng → gọi `sequence.next(loaiPhieu)`; tính `tongTien` = Σ `thanhTien` nếu chưa có. `findAllPaginated(query)`: filter thêm `loaiPhieu`, khoảng ngày (`ngayHachToan`), search theo `soPhieu`/`doiTuongTen`/`dienGiai`. `getStats(loaiPhieu?)`: `{ tongPhieu, tongTien }`. `getNextSo(loaiPhieu)`: `sequence.peek(loaiPhieu)`.

- [ ] **Step 6: `phieu-kho.controller.ts`** — prefix `@Controller('kho')`, guard `JwtGuard, RoleGuard`, `@Roles('ADMIN','KE_TOAN_TRUONG','KE_TOAN_TONG_HOP','KE_TOAN_QUY','MANAGER')`:

```typescript
@Get('phieu')           findAll(@Query() q) -> { success, data, meta }
@Get('phieu/next-so')   nextSo(@Query('loaiPhieu') l) -> { success, soPhieu }
@Get('phieu/stats')     stats(@Query('loaiPhieu') l?) -> { success, ...stats }
@Get('phieu/:id')       findOne(@Param('id') id) -> { success, data }
@Post('phieu')          create(@Body() dto) -> { success, data }
@Put('phieu/:id')       update(@Param('id') id, @Body() dto) -> { success, data }
@Delete('phieu/:id')    remove(@Param('id') id) -> { success }
```
> Thứ tự route: `phieu/next-so` và `phieu/stats` phải khai báo TRƯỚC `phieu/:id`.

- [ ] **Step 7: `phieu-kho.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PhieuKho, PhieuKhoSequence } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { PhieuKhoController } from './phieu-kho.controller';
import { PhieuKhoService } from './phieu-kho.service';
import { PhieuKhoSequenceService } from './phieu-kho-sequence.service';

@Module({
  imports: [DatabaseModule.forFeature([PhieuKho, PhieuKhoSequence])],
  controllers: [PhieuKhoController],
  providers: [PhieuKhoService, PhieuKhoSequenceService],
})
export class PhieuKhoModule {}
```

- [ ] **Step 8: Chạy service**

Run: `cd be && yarn start:kho:dev`
Expected: log "Kho Service is running on port 3008", không lỗi.

- [ ] **Step 9: Smoke test**

Run: `curl -s localhost:3008/kho/phieu/next-so?loaiPhieu=NHAP -H "authorization: Bearer <token>"`
Expected: `{ "success": true, "soPhieu": "NK00001" }`.

- [ ] **Step 10: Commit**

```bash
git add be/apps/kho-service/src/phieu-kho be/apps/kho-service/src/kho-service.module.ts
git commit -m "feat(kho): module PhieuKho (CRUD + sinh số phiếu)"
```

---

### Task 8: Gateway route cho kho-service

**Files:**
- Modify: `be/apps/gateway/src/environments/environment.ts`

**Interfaces:**
- Consumes: kho-service tại `SERVICE_KHO_HOST:SERVICE_KHO_PORT`.
- Produces: proxy `/kho/*` → kho-service.

- [ ] **Step 1: Thêm service `kho` vào `services`**

```typescript
kho: {
  host: process.env.SERVICE_KHO_HOST || 'localhost',
  port: parseInt(process.env.SERVICE_KHO_PORT || '3008', 10),
},
```

- [ ] **Step 2: Thêm route** vào mảng `routes` (trước route catch-all nếu có):

```typescript
{ pathPrefix: '/kho', service: 'kho', stripPrefix: true },
```

- [ ] **Step 3: Chạy gateway + kho-service, test qua gateway**

Run: gateway + kho-service chạy; `curl -s localhost:3000/api/kho/phieu/next-so?loaiPhieu=XUAT -H "authorization: Bearer <token>"` (kiểm tra prefix `/api` thực tế của gateway).
Expected: `{ "success": true, "soPhieu": "XK00001" }`.

- [ ] **Step 4: Commit**

```bash
git add be/apps/gateway/src/environments/environment.ts
git commit -m "feat(kho): gateway route /kho -> kho-service:3008"
```

---

## PHASE 4 — Frontend Phiếu kho

### Task 9: FE types phiếu + service

**Files:**
- Modify: `fe/src/types/index.ts`
- Create: `fe/src/services/phieuKhoService.ts`

**Interfaces:**
- Produces: types `PhieuKho`, `ChiTietPhieuKho`, `LoaiPhieuKho`; instance `phieuKhoService` với `getPaginated`, `getById`, `create`, `update`, `remove`, `getNextSo(loaiPhieu)`, `getStats(loaiPhieu?)`.

- [ ] **Step 1: Types** — thêm vào `fe/src/types/index.ts`

```typescript
export type LoaiPhieuKho = 'NHAP' | 'XUAT' | 'CHUYEN';
export interface ChiTietPhieuKho {
  stt: number; hangHoaMa: string; hangHoaTen: string; quyCach?: string; donViTinh?: string;
  khoMa?: string; khoTen?: string; tkNo?: string; tkCo?: string;
  soLuong: number; soLuongChungTu?: number; soLuongThucTe?: number; donGia: number; thanhTien: number;
}
export interface PhieuKho {
  id: string; loaiPhieu: LoaiPhieuKho; soPhieu?: string; loaiNghiepVu?: string;
  ngayHachToan: string; ngayChungTu?: string; soChungTuGoc?: string; thamChieu?: string;
  doiTuongMa?: string; doiTuongTen?: string; diaChi?: string; nguoiGiaoNhan?: string; nhanVien?: string; dienGiai?: string;
  khoMa?: string; khoTen?: string; khoXuatMa?: string; khoXuatTen?: string; khoNhapMa?: string; khoNhapTen?: string;
  nguoiVanChuyen?: string; hopDongVC?: string; phuongTienVC?: string; lenhDieuDong?: string; veViec?: string;
  chiTiet: ChiTietPhieuKho[]; tongTien?: number; tongTienBangChu?: string; trangThai?: string;
}
```

- [ ] **Step 2: `phieuKhoService.ts`** — copy khung `sanPhamService`, endpoint `/kho/phieu`. Lưu ý BE bọc `{ success, data }`: trong các hàm, đọc `.data`. Thêm:

```typescript
async getNextSo(loaiPhieu: string): Promise<string> {
  const r = await this.get<{ success: boolean; soPhieu: string }>({ endpoint: '/next-so', params: { loaiPhieu } });
  return r.soPhieu;
}
async getStats(loaiPhieu?: string) {
  return this.get<{ tongPhieu: number; tongTien: number }>({ endpoint: '/stats', params: { loaiPhieu } });
}
```
`getPaginated(params)` truyền thêm `loaiPhieu`, `tuNgay`, `denNgay`.

- [ ] **Step 3: Build check**

Run: `cd fe && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add fe/src/types fe/src/services/phieuKhoService.ts
git commit -m "feat(kho): FE types phiếu kho + phieuKhoService"
```

---

### Task 10: Component dùng chung — bảng chi tiết editable + form header

**Files:**
- Create: `fe/src/pages/kho/_shared/ChiTietTable.tsx`
- Create: `fe/src/pages/kho/_shared/usePhieuKhoForm.ts`
- Create: `fe/src/pages/kho/_shared/phieuKhoSchema.ts`

**Interfaces:**
- Consumes: `hangHoaVatTuService`, `khoService` (Task 3), types Task 9, `docTienBangChu`/`formatCurrency`.
- Produces:
  - `<ChiTietTable value={ChiTietPhieuKho[]} onChange={(rows)=>void} loaiPhieu={LoaiPhieuKho} />` — bảng antd editable, có nút Thêm dòng/Xóa dòng, cột Mã hàng (Select hàng hóa → auto-fill Tên/ĐVT/Đơn giá/TK kho), Kho (Select), TK Nợ/Có, SL, Đơn giá, Thành tiền (auto), dòng tổng.
  - `usePhieuKhoForm(loaiPhieu)` → `{ form, chiTiet, setChiTiet, tongTien, tongTienBangChu, buildPayload }`.
  - `phieuKhoSchema` (zod) cho header.

- [ ] **Step 1: `phieuKhoSchema.ts`** — zod: `ngayHachToan` (required), `chiTiet` mảng ≥ 1 dòng có `hangHoaMa`. Với `loaiPhieu==='CHUYEN'`: `khoXuatMa` + `khoNhapMa` required; với NHAP/XUAT: ít nhất 1 dòng có `khoMa` (hoặc header `khoMa`). Dùng `z.object(...).superRefine(...)`.

- [ ] **Step 2: `ChiTietTable.tsx`** — antd `Table` với `components`/editable cells (hoặc render `<Select>/<InputNumber>` trực tiếp trong `columns[].render`). Logic:
  - Mã hàng: `Select showSearch` nạp `hangHoaVatTuService.getAll()`; onSelect set `hangHoaMa, hangHoaTen, donViTinh=donViTinhTen, donGia, tkNo/tkCo gợi ý từ tkKho`.
  - Kho: `Select` nạp `khoService.getAll()` (ẩn cột này khi `loaiPhieu==='CHUYEN'` vì kho ở header).
  - `soLuong`, `donGia`: `InputNumber`; `thanhTien` = soLuong×donGia (readonly).
  - Footer: tổng `thanhTien`. Gọi `onChange` mỗi khi sửa.

- [ ] **Step 3: `usePhieuKhoForm.ts`** — quản lý antd `Form` + state `chiTiet`; tính `tongTien` (Σ thanhTien) + `tongTienBangChu` (`docTienBangChu`); `buildPayload()` gộp form values + chiTiet + tongTien.

- [ ] **Step 4: Build check**

Run: `cd fe && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/kho/_shared
git commit -m "feat(kho): component bảng chi tiết editable + form hook dùng chung"
```

---

### Task 11: 3 trang phiếu (list + editor) + routes + sidebar KHO

**Files:**
- Create: `fe/src/pages/kho/_shared/PhieuKhoListPage.tsx` (component dùng chung nhận `loaiPhieu` + cấu hình)
- Create: `fe/src/pages/kho/nhap-kho/NhapKhoPage.tsx`, `xuat-kho/XuatKhoPage.tsx`, `chuyen-kho/ChuyenKhoPage.tsx`
- Create: `fe/src/pages/kho/_shared/PhieuKhoEditorModal.tsx`
- Modify: `fe/src/pages/loadable.tsx`, `fe/src/App.tsx`, `fe/src/components/layout/MainLayout.tsx`, `fe/src/config/routePermissions.ts`

**Interfaces:**
- Consumes: Task 9 service, Task 10 components, Task 12 print hook (nút In — wire ở Task 12).
- Produces: route `/kho/{nhap-kho,xuat-kho,chuyen-kho}`.

- [ ] **Step 1: `PhieuKhoListPage.tsx`** — props `{ loaiPhieu, tieuDe, route }`. Gồm Breadcrumb + FilterBar (search + range ngày) + `Table` (Số phiếu, Ngày HT, Đối tượng, Diễn giải, Tổng tiền, [Sửa | Xóa | In]) + nút "Lập phiếu" → mở `PhieuKhoEditorModal`. Nạp data `phieuKhoService.getPaginated({ loaiPhieu })`. `usePagePermission(route)`.

- [ ] **Step 2: `PhieuKhoEditorModal.tsx`** — antd `Modal` rộng (width 1100) hoặc `Drawer`. Render form header theo `loaiPhieu`:
  - NHAP: đối tượng/người giao, kho (header `khoMa`), diễn giải, ngày HT/CT, số CT gốc.
  - XUAT: khách/người nhận, lý do xuất, kho.
  - CHUYEN: kho xuất + kho nhập (header), người VC, phương tiện, lệnh điều động, về việc.
  - + `<ChiTietTable loaiPhieu=...>`. Khi mở (tạo mới) gọi `getNextSo(loaiPhieu)` hiển thị số dự kiến. Lưu → `create`/`update` → reload list.

- [ ] **Step 3: 3 trang mỏng** — mỗi file render `<PhieuKhoListPage loaiPhieu="NHAP" tieuDe="Nhập kho" route="/kho/nhap-kho" />` (tương ứng XUAT/CHUYEN).

- [ ] **Step 4: `loadable.tsx`** — export `NhapKhoPage`, `XuatKhoPage`, `ChuyenKhoPage`.

- [ ] **Step 5: `App.tsx`** — thêm khối route mới (ngang cấp `danh-muc`):

```tsx
<Route path="kho">
  <Route path="nhap-kho" element={<ProtectedRoute requiredPermission="/kho/nhap-kho:xem"><NhapKhoPage /></ProtectedRoute>} />
  <Route path="xuat-kho" element={<ProtectedRoute requiredPermission="/kho/xuat-kho:xem"><XuatKhoPage /></ProtectedRoute>} />
  <Route path="chuyen-kho" element={<ProtectedRoute requiredPermission="/kho/chuyen-kho:xem"><ChuyenKhoPage /></ProtectedRoute>} />
</Route>
```

- [ ] **Step 6: `MainLayout.tsx`** — thêm `/kho/nhap-kho`, `/kho/xuat-kho`, `/kho/chuyen-kho` vào `existingRoutes`; thêm nhóm menu mới (sau "Chứng từ"):

```tsx
getItem("Kho", "/kho", <InboxOutlined />, [
  getMenuItem("Nhập kho", "/kho/nhap-kho", <FileAddOutlined />),
  getMenuItem("Xuất kho", "/kho/xuat-kho", <FileDoneOutlined />),
  getMenuItem("Chuyển kho", "/kho/chuyen-kho", <SwapOutlined />),
]),
```

- [ ] **Step 7: `routePermissions.ts`** — thêm 3 route (copy nhóm quyền của `/chung-tu/phieu-thu`).

- [ ] **Step 8: Chạy FE — test tạo phiếu**

Run: `cd fe && npm run dev` → mở `/kho/nhap-kho`, Lập phiếu, thêm dòng hàng hóa, lưu → xuất hiện trong list. Lặp cho xuất/chuyển.
Expected: tạo/sửa/xóa hoạt động; số phiếu NK/XK/CK tự sinh.

- [ ] **Step 9: Build + lint**

Run: `cd fe && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add fe/src
git commit -m "feat(kho): 3 trang phiếu nhập/xuất/chuyển + routes + sidebar nhóm KHO"
```

---

## PHASE 5 — In phiếu kho

### Task 12: Mẫu in 01-VT / 02-VT / 03XKNB3 + nút In

**Files:**
- Create: `fe/src/pages/kho/_shared/print/khoPrintTemplates.ts`
- Create: `fe/src/pages/kho/_shared/print/printKhoPhieu.ts`
- Create: `fe/src/pages/kho/_shared/print/usePrintKhoPhieu.ts`
- Modify: `fe/src/pages/kho/_shared/PhieuKhoListPage.tsx` (wire nút "In")

**Interfaces:**
- Consumes: `formatCurrency`, `docTienBangChu` (từ `@/pages/chung-tu/phieu/lib/...`), `useAuth().currentTenant`, type `PhieuKho`.
- Produces: `printKhoPhieu(phieu, { tenCongTy, diaChiCongTy })`; hook `usePrintKhoPhieu()` → `(phieu)=>void`.

- [ ] **Step 1: `khoPrintTemplates.ts`** — 3 hàm trả HTML string theo `loaiPhieu`, tái dùng `@page A4`, font Times. Mỗi mẫu render:
  - Header công ty (`tenCongTy`/`diaChiCongTy`) + "Mẫu số ..." + Số phiếu.
  - **01-VT (NHAP):** tiêu đề "PHIẾU NHẬP KHO", ngày, "Họ tên người giao", "Nhập tại kho: {khoTen}", Nợ/Có; bảng cột STT | Tên,nhãn hiệu,quy cách | Mã số | ĐVT | SL(theo chứng từ|thực nhập) | Đơn giá | Thành tiền; dòng Cộng; "Tổng số tiền (viết bằng chữ)"; 4 chữ ký: Người lập / Người giao hàng / Thủ kho / Kế toán trưởng.
  - **02-VT (XUAT):** tiêu đề "PHIẾU XUẤT KHO", "Người nhận", "Lý do xuất", "Xuất tại kho: {khoTen}"; bảng tương tự (SL: yêu cầu|thực xuất); chữ ký: Người lập / Người nhận / Thủ kho / Kế toán trưởng.
  - **03XKNB3 (CHUYEN):** tiêu đề "PHIẾU XUẤT KHO KIÊM VẬN CHUYỂN NỘI BỘ", "Liên 01: Lưu", "Căn cứ lệnh điều động số {lenhDieuDong}", "về việc {veViec}", "Họ tên người vận chuyển: {nguoiVanChuyen}", "Hợp đồng số: {hopDongVC}", "Phương tiện vận chuyển: {phuongTienVC}", "Xuất tại kho: {khoXuatTen}", "Nhập tại kho: {khoNhapTen}"; bảng SL: Thực xuất|Thực nhập; chữ ký: Người lập / Thủ kho xuất / Người vận chuyển / Thủ kho nhập.
  - Cung cấp helper `buildChiTietRows(phieu)` sinh `<tr>` từ `phieu.chiTiet` (đánh STT, format số lượng/đơn giá/thành tiền bằng `formatCurrency`).

- [ ] **Step 2: `printKhoPhieu.ts`** — copy cơ chế iframe của `printPhieu.ts`; hàm `printKhoPhieu(phieu, congTy)`: chọn template theo `phieu.loaiPhieu`, ghép HTML, mở iframe in. Tổng tiền bằng chữ = `docTienBangChu(phieu.tongTien)`.

- [ ] **Step 3: `usePrintKhoPhieu.ts`**

```typescript
import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PhieuKho } from "@/types";
import { printKhoPhieu } from "./printKhoPhieu";

export function usePrintKhoPhieu() {
  const { currentTenant } = useAuth();
  return useCallback((phieu: PhieuKho) => {
    printKhoPhieu(phieu, { tenCongTy: currentTenant?.tenantName ?? "", diaChiCongTy: "" });
  }, [currentTenant]);
}
```

- [ ] **Step 4: Wire nút "In"** trong `PhieuKhoListPage.tsx`: cột thao tác thêm icon `PrinterOutlined`, onClick → lấy phiếu đầy đủ (`getById`) → `usePrintKhoPhieu()(phieu)`.

- [ ] **Step 5: Test in**

Run: FE chạy → mở `/kho/nhap-kho`, bấm In 1 phiếu → cửa sổ in hiện đúng layout 01-VT; lặp cho xuất (02-VT), chuyển (03XKNB3).
Expected: bản in đúng mẫu, có dòng hàng hóa, tổng tiền bằng chữ.

- [ ] **Step 6: Build + commit**

```bash
cd fe && npx tsc --noEmit && npm run lint
git add fe/src/pages/kho
git commit -m "feat(kho): in phiếu nhập/xuất/chuyển theo mẫu 01-VT/02-VT/03XKNB3"
```

---

## PHASE 6 — Cập nhật tài liệu

### Task 13: Cập nhật context docs

**Files:**
- Modify: `.claude/context/active-pages.md`
- Modify: `.claude/context/be-api-map.md`
- Modify: `.claude/context/service-communication.md`

- [ ] **Step 1:** `active-pages.md` — đổi "Kho" sang ACTIVE; thêm 3 danh mục mới (master-data:3002) + 3 trang phiếu (kho:3008) vào bảng; cập nhật danh sách service.

- [ ] **Step 2:** `be-api-map.md` — thêm endpoint: master-data `/kho`, `/don-vi-tinh`, `/nhom-vat-tu`, `/hang-hoa-vat-tu`; kho-service `/kho/phieu*` (3008).

- [ ] **Step 3:** `service-communication.md` — ghi nhận kho-service (3008) + gateway route `/kho`; lưu ý deploy thêm container.

- [ ] **Step 4: Commit**

```bash
git add .claude/context
git commit -m "docs(kho): cập nhật context active-pages/be-api-map/service-communication"
```

---

## Self-Review (đã kiểm)

- **Spec coverage:** Danh mục Kho/ĐVT/Nhóm VT/Hàng hóa (Task 1-4) ✓; kho-service + phiếu (Task 5-8) ✓; FE phiếu + editor (Task 9-11) ✓; in 3 mẫu (Task 12) ✓; docs (Task 13) ✓.
- **Placeholder scan:** Không có TBD/TODO; phần "copy theo pattern" đều chỉ rõ file nguồn + danh sách trường/khác biệt cụ thể.
- **Type consistency:** `PhieuKho`/`ChiTietPhieuKho` đồng nhất BE↔FE; route `/kho/phieu*` khớp service↔gateway↔FE; tên biến env `SERVICE_KHO_HOST/PORT`, `KHO_SERVICE_PORT` nhất quán giữa Task 6 & 8.
- **Lưu ý deploy:** kho-service là process mới → cần cấu hình deploy (Task ngoài plan, phối hợp `/db-deploy` khi lên production).
