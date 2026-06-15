# Bảng tổng hợp công nợ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Báo cáo Bảng tổng hợp công nợ tại `/bao-cao/bang-tong-hop`: theo TK công nợ liệt kê đối tượng với Phải thu/Phải trả đầu kỳ–phát sinh–cuối kỳ, drill-down sang Sổ chi tiết tài khoản.

**Architecture:** reporting-service thêm module `cong-no-tong-hop` tái dụng helper thuần đã test của `SoCaiService` (`buildDoiTuongRows`, `DoiTuongAgg`, `DoiTuongOpening`). FE thêm page plain-React theo pattern các báo cáo khác. Logic kế toán nằm hoàn toàn ở BE.

**Tech Stack:** NestJS + ServiceClient (BE), React + AntD + Axios service (FE).

Spec: `docs/superpowers/specs/2026-06-15-bang-tong-hop-cong-no-design.md`

---

## File Structure

**BE (reporting-service):**
- Create `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.types.ts` — response & input types
- Create `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.helper.ts` — hàm thuần `buildCongNoReport`
- Create `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.helper.spec.ts` — unit test
- Create `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.service.ts` — orchestration (ServiceClient)
- Create `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.controller.ts` — `@Controller('bao-cao')` route `bang-tong-hop-cong-no`
- Create `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.module.ts`
- Modify `be/apps/reporting-service/src/reporting-service.module.ts` — đăng ký module

**FE:**
- Create `fe/src/services/congNoTongHopService.ts` — gọi API + types
- Create `fe/src/pages/bao-cao/bang-tong-hop/BangTongHopCongNoPage.tsx` — page
- Modify `fe/src/App.tsx` — route `bang-tong-hop` → page mới

---

## Task 1: BE — types + helper thuần (TDD)

**Files:**
- Create: `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.types.ts`
- Create: `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.helper.ts`
- Test: `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.helper.spec.ts`

- [ ] **Step 1: types**

```ts
// cong-no-tong-hop.types.ts
export interface CongNoCell { phaiThu: number; phaiTra: number }
export interface CongNoRowVal { dauKy: CongNoCell; phatSinh: CongNoCell; cuoiKy: CongNoCell }
export interface CongNoDoiTuongRow extends CongNoRowVal { ma: string; ten: string }
export interface CongNoAccount extends CongNoRowVal {
  ma: string; ten: string; doiTuongs: CongNoDoiTuongRow[];
}
export interface BangTongHopCongNo { accounts: CongNoAccount[]; totals: CongNoRowVal }

// Loại "chi tiết theo" được coi là công nợ (loại trừ NGAN_HANG_QUY)
export const CONG_NO_CHI_TIET_TYPES = new Set([
  'KHACH_HANG', 'NHA_CUNG_CAP', 'NHA_THAU', 'NHAN_VIEN',
]);

export interface AccountInfo { ma: string; ten: string; loai: string; chiTietTheo?: string }
export interface DtAggInput {
  ma: string; doiTuongMa: string | null; doiTuongTen: string | null;
  doiTuongLoai: string | null; priorNo: number; priorCo: number; periodNo: number; periodCo: number;
}
export interface DtOpeningInput {
  maTaiKhoan: string; chiTietMa: string | null; chiTietTen: string | null;
  chiTietType: string | null; duNo: number; duCo: number;
}
export interface CongNoFilters { maTaiKhoan?: string; maDoiTuong?: string }
```

- [ ] **Step 2: Write failing test**

```ts
// cong-no-tong-hop.helper.spec.ts
import { buildCongNoReport } from './cong-no-tong-hop.helper';
import { AccountInfo, DtAggInput, DtOpeningInput } from './cong-no-tong-hop.types';

const ACC: AccountInfo[] = [
  { ma: '1311', ten: 'Phải thu KH', loai: 'NO', chiTietTheo: 'KHACH_HANG' },
  { ma: '331', ten: 'Phải trả NCC', loai: 'CO', chiTietTheo: 'NHA_CUNG_CAP' },
  { ma: '1121', ten: 'Tiền gửi NH', loai: 'NO', chiTietTheo: 'NGAN_HANG_QUY' },
];
const agg = (ma: string, dt: string, loai: string, p: Partial<DtAggInput> = {}): DtAggInput => ({
  ma, doiTuongMa: dt, doiTuongTen: dt, doiTuongLoai: loai,
  priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0, ...p,
});

describe('buildCongNoReport', () => {
  it('map Nợ→Phải thu, Có→Phải trả cho TK loại NO (131)', () => {
    const dt = [agg('1311', 'KH01', 'KHACH_HANG', { priorNo: 100, periodNo: 50 })];
    const r = buildCongNoReport(ACC, dt, [], {});
    const acc = r.accounts.find((a) => a.ma === '1311')!;
    const row = acc.doiTuongs[0];
    expect(row.dauKy).toEqual({ phaiThu: 100, phaiTra: 0 });
    expect(row.phatSinh).toEqual({ phaiThu: 50, phaiTra: 0 });
    expect(row.cuoiKy).toEqual({ phaiThu: 150, phaiTra: 0 });
  });

  it('KHÔNG bù trừ giữa đối tượng: 1 TK có cả Phải thu và Phải trả', () => {
    const dt = [
      agg('1311', 'KH01', 'KHACH_HANG', { periodNo: 200 }), // KH01 nợ mình → phải thu
      agg('1311', 'KH02', 'KHACH_HANG', { periodCo: 80 }),  // mình nợ KH02 → phải trả
    ];
    const r = buildCongNoReport(ACC, dt, [], {});
    const acc = r.accounts.find((a) => a.ma === '1311')!;
    expect(acc.cuoiKy.phaiThu).toBe(200);
    expect(acc.cuoiKy.phaiTra).toBe(80);
  });

  it('totals = Σ accounts; subtotal = Σ doiTuongs', () => {
    const dt = [
      agg('1311', 'KH01', 'KHACH_HANG', { periodNo: 200 }),
      agg('331', 'NCC1', 'NHA_CUNG_CAP', { periodCo: 300 }),
    ];
    const r = buildCongNoReport(ACC, dt, [], {});
    expect(r.totals.phatSinh.phaiThu).toBe(200);
    expect(r.totals.phatSinh.phaiTra).toBe(300);
  });

  it('bỏ TK không phải công nợ (NGAN_HANG_QUY)', () => {
    const dt = [agg('1121', 'VCB', 'NGAN_HANG_QUY', { periodNo: 999 })];
    const r = buildCongNoReport(ACC, dt, [], {});
    expect(r.accounts.find((a) => a.ma === '1121')).toBeUndefined();
  });

  it('lọc maTaiKhoan và maDoiTuong', () => {
    const dt = [
      agg('1311', 'KH01', 'KHACH_HANG', { periodNo: 200 }),
      agg('1311', 'KH02', 'KHACH_HANG', { periodNo: 50 }),
      agg('331', 'NCC1', 'NHA_CUNG_CAP', { periodCo: 300 }),
    ];
    const byAcc = buildCongNoReport(ACC, dt, [], { maTaiKhoan: '1311' });
    expect(byAcc.accounts.map((a) => a.ma)).toEqual(['1311']);
    const byDt = buildCongNoReport(ACC, dt, [], { maTaiKhoan: '1311', maDoiTuong: 'KH01' });
    expect(byDt.accounts[0].doiTuongs.map((d) => d.ma)).toEqual(['KH01']);
  });
});
```

- [ ] **Step 3: Run test → FAIL** (`yarn jest cong-no-tong-hop.helper` → "buildCongNoReport is not a function")

- [ ] **Step 4: Implement helper**

```ts
// cong-no-tong-hop.helper.ts
import { buildDoiTuongRows, DoiTuongAgg, DoiTuongOpening } from '../so-cai/so-cai.service';
import {
  AccountInfo, DtAggInput, DtOpeningInput, CongNoFilters,
  CongNoDoiTuongRow, CongNoAccount, CongNoRowVal, CongNoCell, BangTongHopCongNo,
  CONG_NO_CHI_TIET_TYPES,
} from './cong-no-tong-hop.types';

const zeroCell = (): CongNoCell => ({ phaiThu: 0, phaiTra: 0 });
const zeroVal = (): CongNoRowVal => ({ dauKy: zeroCell(), phatSinh: zeroCell(), cuoiKy: zeroCell() });

function addInto(target: CongNoRowVal, src: CongNoRowVal): void {
  target.dauKy.phaiThu += src.dauKy.phaiThu; target.dauKy.phaiTra += src.dauKy.phaiTra;
  target.phatSinh.phaiThu += src.phatSinh.phaiThu; target.phatSinh.phaiTra += src.phatSinh.phaiTra;
  target.cuoiKy.phaiThu += src.cuoiKy.phaiThu; target.cuoiKy.phaiTra += src.cuoiKy.phaiTra;
}

export function buildCongNoReport(
  accounts: AccountInfo[],
  dtAgg: DtAggInput[],
  dtOpening: DtOpeningInput[],
  filters: CongNoFilters,
): BangTongHopCongNo {
  // Gom đối tượng-agg theo mã TK
  const aggByAcc = new Map<string, DoiTuongAgg[]>();
  for (const d of dtAgg) {
    const arr = aggByAcc.get(d.ma) ?? [];
    arr.push({
      doiTuongMa: d.doiTuongMa, doiTuongTen: d.doiTuongTen, doiTuongLoai: d.doiTuongLoai,
      priorNo: d.priorNo, priorCo: d.priorCo, periodNo: d.periodNo, periodCo: d.periodCo,
    });
    aggByAcc.set(d.ma, arr);
  }
  // Gom opening theo mã TK
  const openByAcc = new Map<string, DoiTuongOpening[]>();
  for (const o of dtOpening) {
    const arr = openByAcc.get(o.maTaiKhoan) ?? [];
    arr.push({
      doiTuongMa: o.chiTietMa, doiTuongTen: o.chiTietTen, chiTietType: o.chiTietType,
      duNo: Number(o.duNo) || 0, duCo: Number(o.duCo) || 0,
    });
    openByAcc.set(o.maTaiKhoan, arr);
  }

  const congNoAccounts = accounts.filter(
    (a) => a.chiTietTheo && CONG_NO_CHI_TIET_TYPES.has(a.chiTietTheo) &&
      (!filters.maTaiKhoan || a.ma === filters.maTaiKhoan),
  );

  const result: CongNoAccount[] = [];
  const totals = zeroVal();

  for (const acc of congNoAccounts) {
    const rows = buildDoiTuongRows(
      acc.loai, aggByAcc.get(acc.ma) ?? [], openByAcc.get(acc.ma) ?? [], acc.chiTietTheo!,
    );
    let doiTuongs: CongNoDoiTuongRow[] = rows.map((row) => ({
      ma: row.ma, ten: row.ten,
      dauKy: { phaiThu: row.noDauKy, phaiTra: row.coDauKy },
      phatSinh: { phaiThu: row.noPhatSinh, phaiTra: row.coPhatSinh },
      cuoiKy: { phaiThu: row.noCuoiKy, phaiTra: row.coCuoiKy },
    }));
    if (filters.maDoiTuong) doiTuongs = doiTuongs.filter((d) => d.ma === filters.maDoiTuong);
    if (doiTuongs.length === 0) continue;

    const subtotal = zeroVal();
    for (const d of doiTuongs) addInto(subtotal, d);
    result.push({ ma: acc.ma, ten: acc.ten, ...subtotal, doiTuongs });
    addInto(totals, subtotal);
  }

  result.sort((a, b) => a.ma.localeCompare(b.ma));
  return { accounts: result, totals };
}
```

- [ ] **Step 5: Run test → PASS** (`yarn jest cong-no-tong-hop.helper`)

- [ ] **Step 6: Commit** (`feat(bang-tong-hop): helper tính bảng tổng hợp công nợ + test`)

---

## Task 2: BE — service (orchestration)

**Files:**
- Create: `be/apps/reporting-service/src/cong-no-tong-hop/cong-no-tong-hop.service.ts`

- [ ] **Step 1: Implement service** (mirror phần đối tượng của `SoCaiService.getTrialBalance`)

```ts
import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import { buildCongNoReport } from './cong-no-tong-hop.helper';
import { AccountInfo, DtAggInput, DtOpeningInput, CongNoFilters, BangTongHopCongNo } from './cong-no-tong-hop.types';

@Injectable()
export class CongNoTongHopService {
  constructor(private readonly serviceClient: ServiceClient) {}

  async getReport(
    startDate: Date, endDate: Date, filters: CongNoFilters, authToken?: string,
  ): Promise<BangTongHopCongNo> {
    const [dtAggRes, accountsRes, openingRawRes] = await Promise.all([
      this.serviceClient.aggregateBalanceByDoiTuong(startDate.toISOString(), endDate.toISOString(), authToken),
      this.serviceClient.getTaiKhoan(authToken),
      this.serviceClient.getSoDuDauKyRaw(authToken),
    ]);

    const dtAgg: DtAggInput[] = dtAggRes.success ? (dtAggRes.data as DtAggInput[]) || [] : [];
    const accounts: AccountInfo[] = accountsRes.success
      ? ((accountsRes.data || []) as any[]).map((a) => ({ ma: a.ma, ten: a.ten, loai: a.loai, chiTietTheo: a.chiTietTheo }))
      : [];
    const openingRaw: DtOpeningInput[] =
      openingRawRes.success && openingRawRes.data ? (openingRawRes.data.items as DtOpeningInput[]) || [] : [];

    return buildCongNoReport(accounts, dtAgg, openingRaw, filters);
  }
}
```

- [ ] **Step 2: Typecheck** (`cd be && npx tsc --noEmit -p apps/reporting-service/tsconfig.app.json`) → no new errors

- [ ] **Step 3: Commit** (`feat(bang-tong-hop): service orchestration công nợ`)

---

## Task 3: BE — controller + module + đăng ký

**Files:**
- Create: `cong-no-tong-hop.controller.ts`, `cong-no-tong-hop.module.ts`
- Modify: `reporting-service.module.ts`

- [ ] **Step 1: Controller** (xem `bao-cao.controller.ts` để khớp guard/param hiện hành; validate ngày như endpoint báo cáo khác)

```ts
import { Controller, Get, Query, Headers, BadRequestException } from '@nestjs/common';
import { CongNoTongHopService } from './cong-no-tong-hop.service';

@Controller('bao-cao')
export class CongNoTongHopController {
  constructor(private readonly service: CongNoTongHopService) {}

  @Get('bang-tong-hop-cong-no')
  async getReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('maTaiKhoan') maTaiKhoan?: string,
    @Query('maDoiTuong') maDoiTuong?: string,
    @Headers('authorization') authToken?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('startDate/endDate không hợp lệ');
    }
    const data = await this.service.getReport(start, end, { maTaiKhoan, maDoiTuong }, authToken);
    return { success: true, data };
  }
}
```

> Lưu ý: kiểm tra `bao-cao.controller.ts` xem có `@UseGuards`/`@Roles` không; nếu có, áp dụng tương tự cho controller này.

- [ ] **Step 2: Module**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CongNoTongHopService } from './cong-no-tong-hop.service';
import { CongNoTongHopController } from './cong-no-tong-hop.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CongNoTongHopController],
  providers: [CongNoTongHopService],
})
export class CongNoTongHopModule {}
```

- [ ] **Step 3: Đăng ký** trong `reporting-service.module.ts` imports: thêm `CongNoTongHopModule`.

- [ ] **Step 4: Build** (`cd be && npx nest build reporting-service`) → success

- [ ] **Step 5: Commit** (`feat(bang-tong-hop): endpoint /bao-cao/bang-tong-hop-cong-no`)

---

## Task 4: FE — service

**Files:**
- Create: `fe/src/services/congNoTongHopService.ts`

- [ ] **Step 1:** (xem 1 service báo cáo có sẵn, vd `balanceSheetService`, để khớp ServiceBase/endpoint)

```ts
import { ServiceBase } from './base/service-base';

export interface CongNoCell { phaiThu: number; phaiTra: number }
export interface CongNoRowVal { dauKy: CongNoCell; phatSinh: CongNoCell; cuoiKy: CongNoCell }
export interface CongNoDoiTuongRow extends CongNoRowVal { ma: string; ten: string }
export interface CongNoAccount extends CongNoRowVal { ma: string; ten: string; doiTuongs: CongNoDoiTuongRow[] }
export interface BangTongHopCongNo { accounts: CongNoAccount[]; totals: CongNoRowVal }

export interface GetCongNoParams {
  startDate: string; endDate: string; maTaiKhoan?: string; maDoiTuong?: string;
}

class CongNoTongHopService extends ServiceBase {
  constructor() { super({ endpoint: '/bao-cao/bang-tong-hop-cong-no' }); }
  async getReport(params: GetCongNoParams): Promise<BangTongHopCongNo> {
    return this.get<BangTongHopCongNo>({ params });
  }
}
export const congNoTongHopService = new CongNoTongHopService();
```

> Xác nhận cách `ServiceBase.get` nhận query params (xem `balanceSheetService.ts`); chỉnh `{ params }` cho khớp.

- [ ] **Step 2:** typecheck/eslint file → sạch
- [ ] **Step 3:** Commit (`feat(bang-tong-hop): FE service công nợ`)

---

## Task 5: FE — page (filters + bảng nhóm + drill-down)

**Files:**
- Create: `fe/src/pages/bao-cao/bang-tong-hop/BangTongHopCongNoPage.tsx`

- [ ] **Step 1:** Page plain-React (theo `BangCanDoiPage`/`SoChiTietTaiKhoanPage`):
  - State: `data: BangTongHopCongNo | null`, `loading`, `range: [Dayjs, Dayjs]` (mặc định đầu→cuối tháng hiện tại), `maTaiKhoan?`, `maDoiTuong?`.
  - Load options: `taiKhoanService.getAll()` lọc `chiTietTheo` ∈ 4 loại công nợ → Select TK; `doiTuongService.getAll()` → Select đối tượng.
  - `fetchData()` gọi `congNoTongHopService.getReport({ startDate: range[0].format('YYYY-MM-DD'), endDate: range[1].format('YYYY-MM-DD'), maTaiKhoan, maDoiTuong })`.
  - Bảng: gộp `accounts` thành dataSource có dòng tiêu đề TK (subtotal) + các dòng đối tượng (flatten với cờ `isAccount`), thêm dòng "Tổng cộng" (totals) lên đầu. Cột nhóm 2 tầng:
    - "Mã ĐT", "Tên đối tượng"
    - "Số dư đầu kỳ" → children [Phải thu, Phải trả]
    - "Số phát sinh" → children [Phải thu, Phải trả]
    - "Số dư cuối kỳ" → children [Phải thu, Phải trả]
  - Format tiền `vi-VN`, 0 → '-'. Dòng TK & tổng in đậm, nền giống mẫu.
  - Drill-down: `onRow` cho dòng đối tượng (không phải dòng TK, ma khác rỗng) → `onClick` `navigate('/bao-cao/so-chi-tiet-tai-khoan?maTaiKhoan='+accMa+'&maDoiTuong='+dtMa+'&startDate='+start+'&endDate='+end)`. Cần lưu accMa theo từng dòng đối tượng khi flatten.
- [ ] **Step 2:** typecheck/eslint → sạch
- [ ] **Step 3:** Commit (`feat(bang-tong-hop): FE page bảng tổng hợp công nợ`)

---

## Task 6: FE — route wiring

**Files:**
- Modify: `fe/src/App.tsx`

- [ ] **Step 1:** Thêm lazy import `BangTongHopCongNoPage` (theo cách lazy của các page báo cáo) và đổi route `bang-tong-hop` từ `<ComingSoonPage/>` sang `<BangTongHopCongNoPage/>`. (Tìm dòng route `bang-tong-hop`; nếu chưa có route riêng dưới nhóm `bao-cao`, thêm `<Route path="bang-tong-hop" element={...} />`.)
- [ ] **Step 2:** `npm run build` (FE) → success
- [ ] **Step 3:** Commit (`feat(bang-tong-hop): kích hoạt route /bao-cao/bang-tong-hop`)

---

## Task 7: Deploy + verify

- [ ] Build reporting-service + scp `main.js` → restart container; xác nhận route `Mapped {/bao-cao/bang-tong-hop-cong-no, GET}` trong log, service online.
- [ ] FE `npm run build` → scp `dist/*` → reload nginx.
- [ ] Verify thủ công trên masterceo.com.vn: mở `/bao-cao/bang-tong-hop`, chọn kỳ, kiểm tra số liệu + drill-down.

---

## Self-Review

- **Spec coverage:** §2 quy ước (Task 1 tests), §3 kỳ (Task 5 range), §4 BE/FE (Tasks 1–6), drill-down (Task 5), filter TK/đối tượng (Task 1+5), §7 testing (Task 1). ✓
- **Type consistency:** `CongNoCell/RowVal/DoiTuongRow/Account/BangTongHopCongNo` định nghĩa giống nhau BE (Task 1) & FE (Task 4). `buildCongNoReport(accounts, dtAgg, dtOpening, filters)` dùng nhất quán Task 1↔2. ✓
- **Placeholder scan:** không có TODO/TBD; code đầy đủ ở các task lõi. Các bước "xem file X để khớp" là chỉ dẫn xác minh pattern, không phải placeholder code.
