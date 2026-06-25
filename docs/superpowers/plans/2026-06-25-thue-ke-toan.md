# Chức năng Thuế (KE_TOAN) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nhóm menu "Thuế" (KE_TOAN) với 2 bảng kê CRUD (mua vào / bán ra) và 2 báo cáo (Tổng hợp thuế, Báo cáo nhanh TNDN) tự tính + nhập tay điều chỉnh.

**Architecture:** Service mới `tax-service` (port 3009) theo pattern `kho-service`. 3 entity (2 bảng kê + 1 điều chỉnh) extends BaseEntity (đa tenant qua TenantSubscriber). CRUD mirror module `khoan-muc`. Báo cáo dùng pure-function tính toán (TDD) + gọi `reporting-service` lấy số phát sinh TK theo quý. Frontend theo CHanlder pattern, service axios `taxService` trỏ `/tax/*`.

**Tech Stack:** NestJS 11, TypeORM + MongoDB, class-validator, @app/service-client; React 18 + TS + Vite, Antd + shadcn, RxJS (CHanlder); Jest + fast-check.

## Global Constraints

- Entity extends `BaseEntity` (libs/entities/src/base.entity.ts) — `tenantId` tự set bởi TenantSubscriber, KHÔNG tự gán.
- Soft delete: `isActive=false`, không xóa cứng.
- Service lọc theo tenant qua `getTenantFilter()` (mẫu `khoan-muc.service.ts`).
- Gateway strip prefix `/tax` → route nội bộ không có `/tax`.
- ValidationPipe whitelist+forbidNonWhitelisted → DTO phải khai đủ field.
- Tiền: `tienThue` và `tongThanhToan` tính LẠI ở backend khi lưu, không tin client.
- Cảnh báo Vàng/Đỏ KHÔNG làm phase này.

---

## File Structure

**Backend (be/):**
- `libs/entities/src/tax/bang-ke-mua-vao.entity.ts` — entity hóa đơn mua vào
- `libs/entities/src/tax/bang-ke-ban-ra.entity.ts` — entity hóa đơn bán ra
- `libs/entities/src/tax/dieu-chinh-thue.entity.ts` — số nhập tay báo cáo theo năm
- `libs/entities/src/index.ts` — export 3 entity mới
- `apps/tax-service/src/main.ts`, `tax-service.module.ts` — bootstrap service 3009
- `apps/tax-service/src/bang-ke-mua-vao/**` — CRUD module
- `apps/tax-service/src/bang-ke-ban-ra/**` — CRUD module
- `apps/tax-service/src/dieu-chinh-thue/**` — upsert module
- `apps/tax-service/src/bao-cao/tax-calc.ts` — pure functions tính thuế (TDD)
- `apps/tax-service/src/bao-cao/tax-calc.spec.ts` — unit test
- `apps/tax-service/src/bao-cao/bao-cao.service.ts` + `.controller.ts` + `.module.ts` — endpoint báo cáo
- `apps/gateway/src/environments/environment.ts` — thêm route + service `tax`
- `.env-cmdrc`, `be/package.json`, `be/nest-cli.json`, `be/tsconfig*.json` — wiring service mới

**Frontend (fe/):**
- `src/components/layout/MainLayout.tsx` — thêm getItem("Thuế", ...)
- `src/config/menuCatalog.ts` — 4 entry mới
- `src/<router>` — 4 route lazy
- `src/services/taxService.ts` — axios client
- `src/pages/thue/bang-ke-mua-vao/**` — trang CRHandler
- `src/pages/thue/bang-ke-ban-ra/**`
- `src/pages/thue/tong-hop/**`
- `src/pages/thue/bao-cao-tndn/**`

---

## Task 1: Tax entities

**Files:**
- Create: `be/libs/entities/src/tax/bang-ke-mua-vao.entity.ts`
- Create: `be/libs/entities/src/tax/bang-ke-ban-ra.entity.ts`
- Create: `be/libs/entities/src/tax/dieu-chinh-thue.entity.ts`
- Modify: `be/libs/entities/src/index.ts`

**Interfaces:**
- Produces: classes `BangKeMuaVao`, `BangKeBanRa`, `DieuChinhThue` (collections `bang_ke_mua_vao`, `bang_ke_ban_ra`, `dieu_chinh_thue`).

- [ ] **Step 1: Read base.entity.ts + an existing entity (khoan-muc.entity.ts) to copy decorator style** (`@Entity`, `@Column`, `extends BaseEntity`, MongoDB ObjectId import). Match imports exactly.

- [ ] **Step 2: Write `bang-ke-mua-vao.entity.ts`**

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity({ name: 'bang_ke_mua_vao' })
export class BangKeMuaVao extends BaseEntity {
  @Column({ type: 'date' }) ngayHoaDon: Date;
  @Column() soHoaDon: string;
  @Column({ nullable: true }) kyHieuHoaDon?: string;
  @Column() tenNguoiBan: string;
  @Column({ nullable: true }) mstNguoiBan?: string;
  @Column({ nullable: true }) tenHangHoa?: string;
  @Column({ default: 0 }) giaTriChuaThue: number;
  @Column({ default: '10' }) thueSuat: string; // '0'|'5'|'8'|'10'|'KCT'|'KKKT'
  @Column({ default: 0 }) tienThue: number;
  @Column({ default: 0 }) tongThanhToan: number;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ nullable: true }) chungTuId?: string;
  @Column({ nullable: true }) soChungTu?: string;
}
```

- [ ] **Step 3: Write `bang-ke-ban-ra.entity.ts`** — identical fields but replace `tenNguoiBan`/`mstNguoiBan` with `tenNguoiMua`/`mstNguoiMua`, collection `bang_ke_ban_ra`, class `BangKeBanRa`.

- [ ] **Step 4: Write `dieu-chinh-thue.entity.ts`**

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

// Mỗi field là mảng 4 phần tử (Q1..Q4)
@Entity({ name: 'dieu_chinh_thue' })
export class DieuChinhThue extends BaseEntity {
  @Column() nam: number;
  @Column('simple-json', { default: '[0,0,0,0]' }) cpkdtDichVuHangHoa: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) cpkdtTscdCcdc: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) cpkdtNhanCong: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) cpkdtTaiChinhKhac: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) thuNhapMienThue: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) loDuocChuyen: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) thueTNCN: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) bhxh3383: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) bhyt3384: number[];
  @Column('simple-json', { default: '[0,0,0,0]' }) bhtn3386: number[];
}
```

> Nếu các entity khác dùng `@Column({ type: 'json' })` thay vì `'simple-json'` cho mảng/object, dùng đúng kiểu đó (kiểm tra 1 entity có field mảng trong libs/entities trước khi viết).

- [ ] **Step 5: Export trong `index.ts`** — thêm 3 dòng `export * from './tax/bang-ke-mua-vao.entity';` v.v. theo đúng style file index hiện có.

- [ ] **Step 6: Verify compile** — Run: `cd be && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i tax` → Expected: no errors liên quan tax.

- [ ] **Step 7: Commit**

```bash
git add be/libs/entities/src/tax be/libs/entities/src/index.ts
git commit -m "feat(thue): thêm entity bảng kê mua vào/bán ra + điều chỉnh thuế"
```

---

## Task 2: Pure functions tính thuế (TDD)

**Files:**
- Create: `be/apps/tax-service/src/bao-cao/tax-calc.ts`
- Test: `be/apps/tax-service/src/bao-cao/tax-calc.spec.ts`

**Interfaces:**
- Produces:
  - `tinhThueSuatTNDN(doanhThuLuyKe: number): number` → trả hệ số 0 | 0.15 | 0.17 | 0.20
  - `tongVatTheoKy(items: {tienThue:number}[]): number`
  - `tinhTNDNQuy(input: TNDNQuyInput): TNDNQuyResult` (xem types trong file)

- [ ] **Step 1: Write failing test `tax-calc.spec.ts`**

```typescript
import { tinhThueSuatTNDN, tongVatTheoKy } from './tax-calc';

describe('tinhThueSuatTNDN — bậc thang theo doanh thu lũy kế', () => {
  it('doanh thu < 1 tỷ → 0', () => expect(tinhThueSuatTNDN(900_000_000)).toBe(0));
  it('1 tỷ ≤ DT < 3 tỷ → 15%', () => expect(tinhThueSuatTNDN(2_000_000_000)).toBe(0.15));
  it('3 tỷ ≤ DT < 50 tỷ → 17%', () => expect(tinhThueSuatTNDN(10_000_000_000)).toBe(0.17));
  it('DT ≥ 50 tỷ → 20%', () => expect(tinhThueSuatTNDN(60_000_000_000)).toBe(0.20));
  it('biên 1 tỷ → 15%', () => expect(tinhThueSuatTNDN(1_000_000_000)).toBe(0.15));
});

describe('tongVatTheoKy', () => {
  it('cộng tiền thuế', () => expect(tongVatTheoKy([{tienThue:100},{tienThue:50}])).toBe(150));
  it('mảng rỗng → 0', () => expect(tongVatTheoKy([])).toBe(0));
});
```

- [ ] **Step 2: Run test → FAIL** — Run: `cd be && npx jest tax-calc -- --testPathPattern tax-calc` → Expected: FAIL "Cannot find module './tax-calc'".

- [ ] **Step 3: Implement `tax-calc.ts`**

```typescript
export function tinhThueSuatTNDN(doanhThuLuyKe: number): number {
  if (doanhThuLuyKe < 1_000_000_000) return 0;
  if (doanhThuLuyKe < 3_000_000_000) return 0.15;
  if (doanhThuLuyKe < 50_000_000_000) return 0.17;
  return 0.2;
}

export function tongVatTheoKy(items: { tienThue: number }[]): number {
  return items.reduce((s, i) => s + (i.tienThue || 0), 0);
}
```

- [ ] **Step 4: Run test → PASS** — Run: `cd be && npx jest --testPathPattern tax-calc` → Expected: PASS.

- [ ] **Step 5: Add TNDN quarter test** (append to spec)

```typescript
import { tinhTNDNQuy } from './tax-calc';

describe('tinhTNDNQuy', () => {
  it('LN trước thuế = (511+515+711) − (632+641+642+811)', () => {
    const r = tinhTNDNQuy({
      dt511: 1000, dt515: 0, dt711: 0,
      cp632: 400, cp641: 100, cp642: 100, cp811: 0,
      chiPhiKhongTru: 0, thuNhapMien: 0, loChuyen: 0,
      thueSuat: 0.2,
    });
    expect(r.lnTruocThue).toBe(400);
    expect(r.thuNhapTinhThue).toBe(400);
    expect(r.thueTNDN).toBe(80);
    expect(r.lnSauThue).toBe(320);
  });
  it('chi phí không được trừ làm tăng thu nhập tính thuế', () => {
    const r = tinhTNDNQuy({ dt511:1000,dt515:0,dt711:0,cp632:400,cp641:0,cp642:0,cp811:0,
      chiPhiKhongTru:200, thuNhapMien:0, loChuyen:0, thueSuat:0.2 });
    expect(r.thuNhapTinhThue).toBe(800); // 600 + 200
    expect(r.thueTNDN).toBe(160);
  });
});
```

- [ ] **Step 6: Run → FAIL, then implement `tinhTNDNQuy`**

```typescript
export interface TNDNQuyInput {
  dt511: number; dt515: number; dt711: number;
  cp632: number; cp641: number; cp642: number; cp811: number;
  chiPhiKhongTru: number; thuNhapMien: number; loChuyen: number;
  thueSuat: number;
}
export interface TNDNQuyResult {
  tongChiPhi: number; lnTruocThue: number; thuNhapTinhThue: number;
  thueTNDN: number; lnSauThue: number;
}
export function tinhTNDNQuy(i: TNDNQuyInput): TNDNQuyResult {
  const tongChiPhi = i.cp632 + i.cp641 + i.cp642 + i.cp811;
  const lnTruocThue = i.dt511 + i.dt515 + i.dt711 - tongChiPhi;
  const thuNhapTinhThue = lnTruocThue + i.chiPhiKhongTru - i.thuNhapMien - i.loChuyen;
  const thueTNDN = Math.max(0, thuNhapTinhThue) * i.thueSuat;
  const lnSauThue = lnTruocThue - thueTNDN;
  return { tongChiPhi, lnTruocThue, thuNhapTinhThue, thueTNDN, lnSauThue };
}
```

- [ ] **Step 7: Run → PASS, Commit**

```bash
git add be/apps/tax-service/src/bao-cao/tax-calc.ts be/apps/tax-service/src/bao-cao/tax-calc.spec.ts
git commit -m "feat(thue): pure functions tính VAT + TNDN bậc thang (TDD)"
```

---

## Task 3: Scaffold tax-service (bootstrap + wiring)

**Files:**
- Create: `be/apps/tax-service/src/main.ts`
- Create: `be/apps/tax-service/src/tax-service.module.ts`
- Modify: `be/nest-cli.json`, `be/package.json` (script `start:tax:dev`, thêm vào `start:all:dev`), `be/tsconfig.app.json` hoặc per-app tsconfig
- Modify: `be/apps/gateway/src/environments/environment.ts`
- Modify: `.env-cmdrc`

**Interfaces:**
- Produces: service chạy port 3009; gateway forward `/tax/*` → 3009.

- [ ] **Step 1: Read `apps/kho-service/src/kho-service.module.ts` + `nest-cli.json` (project `kho-service` block) + `package.json` (`start:kho:dev`, `start:all:dev`) để copy y hệt wiring.**

- [ ] **Step 2: Write `main.ts`** — copy từ `kho-service/src/main.ts`, đổi `KhoServiceModule`→`TaxServiceModule`, logger `'tax'`, port `process.env.TAX_SERVICE_PORT || 3009`, log "Tax Service".

- [ ] **Step 3: Write `tax-service.module.ts`** — theo mẫu kho-service.module:

```typescript
import { Module } from '@nestjs/common';
import { CoreTenantModule } from '@app/core';
import { AuthModule } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { BangKeMuaVao, BangKeBanRa, DieuChinhThue } from '@app/entities';
// (các feature module import ở Task 4-6)

@Module({
  imports: [
    CoreTenantModule,
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forFeature([BangKeMuaVao, BangKeBanRa, DieuChinhThue]),
    // BangKeMuaVaoModule, BangKeBanRaModule, DieuChinhThueModule, BaoCaoModule
  ],
})
export class TaxServiceModule {}
```

> Kiểm tra tên export thực tế của CoreTenantModule/AuthModule/DatabaseModule trong kho-service.module.ts và copy đúng.

- [ ] **Step 4: nest-cli.json** — thêm block project `tax-service` (copy block `kho-service`, đổi tên/đường dẫn/entryFile).

- [ ] **Step 5: package.json** — thêm `"start:tax:dev": "env-cmd -e tax nest start tax-service --watch"` (copy mẫu `start:kho:dev`, đổi env name + service). Thêm `tax` vào `start:all:dev` concurrently list.

- [ ] **Step 6: .env-cmdrc** — thêm block `"tax"` (copy block `kho`), set `TAX_SERVICE_PORT=3009`, các biến DB/JWT giống service khác. Thêm `SERVICE_TAX_HOST`/`SERVICE_TAX_PORT=3009` vào block `gateway`.

- [ ] **Step 7: gateway environment.ts** — thêm vào `routes`: `{ pathPrefix: '/tax', service: 'tax', stripPrefix: true }`; thêm vào `services`: `tax: { host: process.env.SERVICE_TAX_HOST || 'localhost', port: parseInt(process.env.SERVICE_TAX_PORT || '3009', 10) }`.

- [ ] **Step 8: Build check** — Run: `cd be && npx nest build tax-service` → Expected: build success (module rỗng vẫn build).

- [ ] **Step 9: Commit**

```bash
git add be/apps/tax-service be/nest-cli.json be/package.json be/.env-cmdrc be/apps/gateway/src/environments/environment.ts
git commit -m "feat(thue): scaffold tax-service (3009) + gateway route /tax"
```

---

## Task 4: CRUD module Bảng kê mua vào

**Files:**
- Create: `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.module.ts`
- Create: `.../bang-ke-mua-vao.service.ts`
- Create: `.../bang-ke-mua-vao.controller.ts`
- Create: `.../dto/create-bang-ke-mua-vao.dto.ts`, `update-...dto.ts`, `bang-ke-mua-vao-query.dto.ts`
- Modify: `be/apps/tax-service/src/tax-service.module.ts` (import module)

**Interfaces:**
- Consumes: entity `BangKeMuaVao` (Task 1).
- Produces: routes `GET/POST/PUT/DELETE /bang-ke-mua-vao` (sau strip `/tax`). Service method `recalcTotals(dto)` đặt `tienThue`/`tongThanhToan`.

- [ ] **Step 1: Read `master-data-service/src/khoan-muc/**` toàn bộ (module/service/controller/dto) làm khuôn.**

- [ ] **Step 2: Write DTOs** — `create` DTO khai đủ field entity (trừ tienThue/tongThanhToan = optional, BE tự tính): `@IsDateString ngayHoaDon`, `@IsString soHoaDon`, `@IsOptional kyHieuHoaDon/mstNguoiBan/tenHangHoa/ghiChu/chungTuId/soChungTu`, `@IsString tenNguoiBan`, `@IsNumber giaTriChuaThue`, `@IsIn(['0','5','8','10','KCT','KKKT']) thueSuat`. `update` DTO = `PartialType(create)`. Query DTO: `page,limit,keyword,tuNgay,denNgay,quy,nam` (đều optional), copy `PaginationQueryDto` style.

- [ ] **Step 3: Write service** — copy `khoan-muc.service.ts` (inject repo + tenantContext, `getTenantFilter`, `findAllPaginated`, `findOne`, `create`, `update`, soft-delete). Thêm helper:

```typescript
private recalcTotals<T extends { giaTriChuaThue?: number; thueSuat?: string }>(dto: T) {
  const rate: Record<string, number> = { '0':0,'5':0.05,'8':0.08,'10':0.10,'KCT':0,'KKKT':0 };
  const gia = dto.giaTriChuaThue || 0;
  const tienThue = Math.round(gia * (rate[dto.thueSuat ?? '10'] ?? 0));
  return { tienThue, tongThanhToan: gia + tienThue };
}
```
Gọi `recalcTotals` trong `create`/`update`, gán vào entity. Trong `findAllPaginated` áp filter ngày: nếu có `quy`+`nam` → khoảng [đầu quý, cuối quý]; nếu `tuNgay/denNgay` → `Between`; cộng `getTenantFilter()`.

- [ ] **Step 4: Write controller** — copy `khoan-muc.controller.ts` route style, base path `'bang-ke-mua-vao'`, dùng các DTO trên. Giữ guard/auth decorators y như khoan-muc.

- [ ] **Step 5: Write module + import vào `tax-service.module.ts`** (thêm vào `imports`).

- [ ] **Step 6: Build** — Run: `cd be && npx nest build tax-service` → Expected: success.

- [ ] **Step 7: Smoke test** (cần Mongo chạy) — Run service + `curl -X POST localhost:3009/bang-ke-mua-vao` với body mẫu (có JWT header như service khác) → trả về bản ghi có `tienThue`/`tongThanhToan` đúng. Nếu môi trường chưa sẵn Mongo, bỏ qua và ghi rõ trong commit là chưa chạy.

- [ ] **Step 8: Commit**

```bash
git add be/apps/tax-service/src/bang-ke-mua-vao be/apps/tax-service/src/tax-service.module.ts
git commit -m "feat(thue): CRUD bảng kê mua vào"
```

---

## Task 5: CRUD module Bảng kê bán ra

**Files:** `be/apps/tax-service/src/bang-ke-ban-ra/**` (module/service/controller/dto), modify `tax-service.module.ts`.

**Interfaces:** Consumes `BangKeBanRa`. Produces routes `/bang-ke-ban-ra`. Identical to Task 4 nhưng field người mua.

- [ ] **Step 1: Copy toàn bộ thư mục `bang-ke-mua-vao` → `bang-ke-ban-ra`**, đổi tên class/file/route, và đổi `tenNguoiBan/mstNguoiBan` → `tenNguoiMua/mstNguoiMua` trong DTO (entity đã đúng từ Task 1). Helper `recalcTotals` giữ nguyên.

- [ ] **Step 2: Import module vào `tax-service.module.ts`.**

- [ ] **Step 3: Build** — Run: `cd be && npx nest build tax-service` → Expected: success.

- [ ] **Step 4: Commit**

```bash
git add be/apps/tax-service/src/bang-ke-ban-ra be/apps/tax-service/src/tax-service.module.ts
git commit -m "feat(thue): CRUD bảng kê bán ra"
```

---

## Task 6: Module Điều chỉnh thuế (upsert theo năm)

**Files:** `be/apps/tax-service/src/dieu-chinh-thue/**`, modify `tax-service.module.ts`.

**Interfaces:**
- Produces: `GET /dieu-chinh-thue?nam=` (trả bản ghi hoặc default 0), `PUT /dieu-chinh-thue?nam=` (upsert). Service method `getOrDefault(nam)`, `upsert(nam, dto)`.

- [ ] **Step 1: DTO** — `UpdateDieuChinhThueDto`: 10 field `@IsArray @IsNumber({},{each:true})` đúng tên entity (cpkdtDichVuHangHoa,... bhtn3386), tất cả optional. Query: `@IsNumberString nam`.

- [ ] **Step 2: Service** — inject repo + tenantContext. `getOrDefault(nam)`: tìm `{nam, ...tenantFilter}`; nếu không có trả object với tất cả mảng `[0,0,0,0]` (không lưu). `upsert(nam, dto)`: tìm; nếu có → merge + save; nếu chưa → tạo mới với `nam` + field từ dto (thiếu thì `[0,0,0,0]`).

- [ ] **Step 3: Controller** — `GET` gọi getOrDefault, `PUT` gọi upsert. Base path `'dieu-chinh-thue'`.

- [ ] **Step 4: Module + import vào tax-service.module.ts.**

- [ ] **Step 5: Build → success. Commit**

```bash
git add be/apps/tax-service/src/dieu-chinh-thue be/apps/tax-service/src/tax-service.module.ts
git commit -m "feat(thue): module điều chỉnh thuế (upsert theo năm)"
```

---

## Task 7: Báo cáo service + controller (Tổng hợp thuế + TNDN)

**Files:**
- Create: `be/apps/tax-service/src/bao-cao/bao-cao.service.ts`, `bao-cao.controller.ts`, `bao-cao.module.ts`
- Modify: `tax-service.module.ts`
- Uses: `tax-calc.ts` (Task 2), `@app/service-client` để gọi reporting-service.

**Interfaces:**
- Consumes: `tinhTNDNQuy`, `tinhThueSuatTNDN`, `tongVatTheoKy`; repos BangKeMuaVao/BangKeBanRa/DieuChinhThue; reporting trial-balance.
- Produces:
  - `GET /tong-hop?nam=&quy=` → `{ vatDauVao, vatDauRa, vatPhaiNop, vatConKhauTru, nghiaVuNganSach }`
  - `GET /bao-cao-tndn?nam=` → `{ rows: TNDNRow[], quy: TNDNQuyResult[4], luyKe }`

- [ ] **Step 1: Read `@app/service-client` usage trong 1 service đã gọi reporting (grep `ServiceClient` / `reporting` trong apps) để copy cách gọi + truyền authToken.**

- [ ] **Step 2: Implement `bao-cao.service.ts`:**
  - `tongHop(nam, quy?)`: query bảng kê mua/bán theo kỳ (dùng cùng filter ngày như Task 4), `vatDauVao=tongVatTheoKy(muaVao)`, `vatDauRa=tongVatTheoKy(banRa)`, `vatPhaiNop=max(0, vatDauRa-vatDauVao)`, `vatConKhauTru=max(0, vatDauVao-vatDauRa)`. Lấy `dieuChinh` để điền nghĩa vụ ngân sách (TNCN, BHXH).
  - `baoCaoTNDN(nam)`: với mỗi quý gọi reporting trial-balance lấy phát sinh Có 511/515/711 và Nợ 632/641/642/811; lấy `dieuChinh` cho chi phí không trừ (cộng 4 dòng), thu nhập miễn, lỗ chuyển; tính doanh thu lũy kế = Σ(511+515+711) tới quý đó → `tinhThueSuatTNDN` → `tinhTNDNQuy` cho từng quý; tổng hợp lũy kế.

- [ ] **Step 3: Controller** — 2 GET routes như Interfaces; truyền `nam`/`quy` qua `@Query` (parse number).

- [ ] **Step 4: Module + import vào tax-service.module.ts** (import repos qua DatabaseModule.forFeature đã có).

- [ ] **Step 5: Build → success.** Run: `cd be && npx nest build tax-service`.

- [ ] **Step 6: Smoke (nếu có Mongo + reporting)** — `curl localhost:3009/tong-hop?nam=2026&quy=1` và `/bao-cao-tndn?nam=2026`. Nếu không chạy được môi trường, ghi rõ trong commit.

- [ ] **Step 7: Commit**

```bash
git add be/apps/tax-service/src/bao-cao be/apps/tax-service/src/tax-service.module.ts
git commit -m "feat(thue): báo cáo tổng hợp thuế + báo cáo nhanh TNDN"
```

---

## Task 8: Frontend — menu, routing, service

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx`
- Modify: `fe/src/config/menuCatalog.ts`
- Modify: router file (tìm nơi khai báo `/bao-cao/*` routes)
- Create: `fe/src/services/taxService.ts`

**Interfaces:**
- Produces: 4 route `/thue/*`; `taxService` với methods CRUD + report.

- [ ] **Step 1: MainLayout.tsx** — thêm vào `keToAnMenuItems` ngay sau block "Báo cáo":

```tsx
getItem("Thuế", "/thue", <AuditOutlined />, [
  getMenuItem("Bảng kê mua vào", "/thue/bang-ke-mua-vao", <FileAddOutlined />),
  getMenuItem("Bảng kê bán ra", "/thue/bang-ke-ban-ra", <FileDoneOutlined />),
  getMenuItem("Tổng hợp thuế", "/thue/tong-hop", <TableOutlined />),
  getMenuItem("Báo cáo nhanh thuế TNDN", "/thue/bao-cao-tndn", <BarChartOutlined />),
]),
```
(dùng icon đã import sẵn trong file; nếu thiếu thì import thêm từ @ant-design/icons).

- [ ] **Step 2: menuCatalog.ts** — thêm 4 entry với `parentLabel: 'Thuế'` ngay sau block "Báo cáo".

- [ ] **Step 3: Router** — đọc cách 1 route báo cáo lazy được khai (grep `/bao-cao/tai-chinh` trong fe/src). Thêm 4 route lazy `/thue/*` trỏ tới 4 page component (Task 9-10). Tạm thời trỏ tới component rỗng nếu cần build.

- [ ] **Step 4: taxService.ts** — copy mẫu 1 service axios hiện có (vd `fe/src/services/*Service.ts`), base path `/tax`. Methods: `muaVao.list/get/create/update/remove`, `banRa.*` (giống), `getTongHop(nam,quy)`, `getBaoCaoTNDN(nam)`, `getDieuChinh(nam)`, `putDieuChinh(nam,payload)`.

- [ ] **Step 5: Build** — Run: `cd fe && npm run build` → Expected: success (sau khi page component tồn tại; nếu chưa, tạm placeholder).

- [ ] **Step 6: Commit**

```bash
git add fe/src/components/layout/MainLayout.tsx fe/src/config/menuCatalog.ts fe/src/services/taxService.ts <router-file>
git commit -m "feat(thue): menu Thuế + routing + taxService"
```

---

## Task 9: Frontend — 2 trang CRUD bảng kê (CHanlder)

**Files:** `fe/src/pages/thue/bang-ke-mua-vao/**`, `fe/src/pages/thue/bang-ke-ban-ra/**` theo CHanlder pattern (Handler, Context, Component, components/, sub-handler/) — tham chiếu `fe/HANDLER_GUIDE.md` + 1 trang danh-mục hiện có làm mẫu.

**Interfaces:** Consumes `taxService.muaVao/banRa`. Produces page components `BangKeMuaVaoPage`, `BangKeBanRaPage`.

- [ ] **Step 1: Đọc 1 trang CRUD danh-mục hiện có (vd `fe/src/pages/danh-muc/khoan-muc/**`) làm khuôn đầy đủ CHanlder.**

- [ ] **Step 2: Tạo trang `bang-ke-mua-vao`** — bảng cột: Ngày HĐ, Số HĐ, Ký hiệu, Tên người bán, MST, Hàng hóa, Giá trị chưa thuế, Thuế suất, Tiền thuế, Tổng TT, thao tác (sửa/xóa). Form modal thêm/sửa với các field tương ứng; thuế suất là Select ['0','5','8','10','KCT','KKKT']; Tiền thuế/Tổng TT hiển thị auto-preview (BE là nguồn chân lý). Bộ lọc năm + quý. Phân trang.

- [ ] **Step 3: Tạo trang `bang-ke-ban-ra`** — copy trang mua vào, đổi label "người bán"→"người mua" và service sang `banRa`.

- [ ] **Step 4: Cập nhật router** trỏ 2 route tới 2 page thật.

- [ ] **Step 5: Build** — Run: `cd fe && npm run build` → success. Lint: `npm run lint` (sửa lỗi nếu có).

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/thue/bang-ke-mua-vao fe/src/pages/thue/bang-ke-ban-ra <router-file>
git commit -m "feat(thue): trang CRUD bảng kê mua vào + bán ra"
```

---

## Task 10: Frontend — 2 trang báo cáo

**Files:** `fe/src/pages/thue/tong-hop/**`, `fe/src/pages/thue/bao-cao-tndn/**`.

**Interfaces:** Consumes `taxService.getTongHop/getBaoCaoTNDN/getDieuChinh/putDieuChinh`.

- [ ] **Step 1: Trang Tổng hợp thuế** — chọn năm + quý; gọi `getTongHop`; hiển thị bảng: VAT đầu vào, VAT đầu ra, VAT phải nộp / còn khấu trừ, và bảng nghĩa vụ ngân sách. Read-only.

- [ ] **Step 2: Trang Báo cáo nhanh TNDN** — chọn năm; gọi `getBaoCaoTNDN` + `getDieuChinh`; bảng theo cột Q1..Q4 + Lũy kế, các dòng theo phụ lục §5 spec. Dòng tự tính read-only; 4 dòng chi phí không được trừ + thu nhập miễn/lỗ chuyển + TNCN/BHXH là input; nút "Lưu điều chỉnh" gọi `putDieuChinh` rồi refetch. Cột ghi chú hiện công thức.

- [ ] **Step 3: Router** trỏ 2 route tới page thật.

- [ ] **Step 4: Build + lint** — Run: `cd fe && npm run build && npm run lint` → success.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/thue/tong-hop fe/src/pages/thue/bao-cao-tndn <router-file>
git commit -m "feat(thue): trang Tổng hợp thuế + Báo cáo nhanh TNDN"
```

---

## Self-Review notes

- **Spec coverage:** Menu (Task 8) · Bảng kê mua vào CRUD (Task 1,4,9) · Bảng kê bán ra CRUD (Task 1,5,9) · Tổng hợp thuế (Task 7,10) · TNDN tự tính + nhập tay (Task 1 entity điều chỉnh, 2 calc, 6 upsert, 7 service, 10 UI) · bậc thuế (Task 2) · tax-service+gateway (Task 3). Cảnh báo Vàng/Đỏ: cố ý ngoài phạm vi. ✓
- **Đa tenant / soft delete:** kế thừa pattern khoan-muc — đã nêu ở Global Constraints.
- **Type consistency:** tên field entity dùng nhất quán giữa entity (T1), DTO (T4-6), calc (T2), báo cáo (T7), service FE (T8). `recalcTotals` dùng chung mua/bán.
