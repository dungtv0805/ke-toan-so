# Sổ chi tiết tài khoản — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang báo cáo "Sổ chi tiết tài khoản" tại `/bao-cao/so-chi-tiet-tai-khoan`: liệt kê phát sinh 1 tài khoản (gộp con khi chọn TK cha), lọc thêm theo 1 đối tượng, hiển thị TK đối ứng + số dư lũy kế, với số dư đầu kỳ = nhập tay + phát sinh trước kỳ.

**Architecture:** BE thêm module `reporting-service/src/so-chi-tiet` với 1 hàm thuần `buildSoChiTiet` (TDD) + `computeRelevantCodes`; service gọi `ServiceClient` (vouchers, accounts, đối tượng, số dư đầu kỳ raw) rồi gọi helper; controller expose `GET /so-chi-tiet-tai-khoan`. FE thêm service + trang Antd, bật route từ COMING SOON → ACTIVE.

**Tech Stack:** NestJS + ServiceClient (BE), Jest (test); React + Antd + ServiceBase (FE).

**Spec:** `docs/superpowers/specs/2026-06-03-so-chi-tiet-tai-khoan-design.md`

---

## File Structure

**Backend**
- Modify: `be/libs/service-client/src/services/master-data/so-du-dau-ky.service.ts` *(hoặc service-client.ts)* — thêm `getSoDuDauKyRaw` (giữ field `chiTietMa`, không gộp).
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts` — hàm thuần `computeRelevantCodes`, `buildSoChiTiet`.
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts` — unit test.
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.service.ts` — fetch + lắp ráp.
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.controller.ts` — route.
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.module.ts` — module.
- Create: `be/apps/reporting-service/src/so-chi-tiet/index.ts` — re-export.
- Modify: `be/apps/reporting-service/src/reporting-service.module.ts` — import `SoChiTietModule`.

**Frontend**
- Create: `fe/src/services/soChiTietTaiKhoanService.ts` — API + types.
- Create: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx` — trang.
- Modify: `fe/src/pages/loadable.tsx` — export `SoChiTietTaiKhoanPage` lazy.
- Modify: `fe/src/App.tsx` — đổi route từ `ComingSoonPage` sang trang thật.
- Modify: `fe/src/config/routePermissions.ts` — thêm mapping quyền.
- Modify: `fe/src/components/layout/MainLayout.tsx` — thêm route vào Set active.
- Modify: `.claude/context/active-pages.md` — đổi trạng thái COMING SOON → ACTIVE.

---

## Task 1: BE — `getSoDuDauKyRaw` trong service-client (giữ `chiTietMa`)

**Lý do:** `getSoDuDauKy` hiện gộp theo tài khoản (`aggregateOpeningByAccount`) nên mất chiều đối tượng. Cần bản raw để lọc số dư đầu kỳ theo đối tượng.

**Files:**
- Modify: `be/libs/service-client/src/services/master-data/so-du-dau-ky.service.ts`

- [ ] **Step 1: Đọc file hiện tại để nắm cách `getSoDuDauKy` được khai báo/prototype**

Run: `sed -n '1,60p' be/libs/service-client/src/services/master-data/so-du-dau-ky.service.ts`
Expected: thấy interface mở rộng `ServiceClient` + `ServiceClient.prototype.getSoDuDauKy = ...`.

- [ ] **Step 2: Thêm khai báo type + prototype `getSoDuDauKyRaw`**

Thêm vào interface mở rộng (cạnh `getSoDuDauKy`):

```ts
  getSoDuDauKyRaw(
    authToken?: string,
    tenantId?: string,
  ): Promise<
    ServiceResponse<{
      ngayApDung: string | null;
      items: Array<{
        maTaiKhoan: string;
        duNo: number;
        duCo: number;
        chiTietType?: string;
        chiTietMa?: string;
        chiTietTen?: string;
        nganHang?: string;
      }>;
    }>
  >;
```

Thêm implementation (cùng pattern `getSoDuDauKy`, KHÔNG gọi `aggregateOpeningByAccount`):

```ts
ServiceClient.prototype.getSoDuDauKyRaw = async function (
  authToken?: string,
  tenantId?: string,
) {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = authToken;
  if (tenantId) headers['x-tenant-id'] = tenantId;

  return this.get('master-data', '/so-du-dau-ky', {
    headers: Object.keys(headers).length ? headers : undefined,
  });
};
```

> Nếu file dùng kiểu khai báo khác (method trực tiếp trong class `service-client.ts`), đặt `getSoDuDauKyRaw` ngay dưới `getSoDuDauKy` trong `be/libs/service-client/src/service-client.ts` theo đúng cùng style của method kế bên (xem `getSoDuDauKy` ở `service-client.ts:136`). Giữ nguyên hành vi: trả raw, không aggregate.

- [ ] **Step 3: Build kiểm tra**

Run: `cd be && yarn build 2>&1 | tail -20` *(hoặc `npx tsc -p apps/reporting-service/tsconfig.app.json --noEmit` nếu build full chậm)*
Expected: không lỗi TypeScript liên quan `getSoDuDauKyRaw`.

- [ ] **Step 4: Commit**

```bash
git add be/libs/service-client/src
git commit -m "feat(be): them getSoDuDauKyRaw giu chiTietMa cho so chi tiet TK"
```

---

## Task 2: BE — helper `computeRelevantCodes` (TDD)

**Files:**
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts`
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts`

- [ ] **Step 1: Viết test thất bại**

Tạo `so-chi-tiet.helper.spec.ts`:

```ts
import { computeRelevantCodes } from './so-chi-tiet.helper';

describe('computeRelevantCodes', () => {
  const accounts = [
    { ma: '131' },
    { ma: '1311' },
    { ma: '1312' },
    { ma: '111' },
    { ma: '1111' },
  ];

  it('TK leaf chỉ trả về chính nó', () => {
    const set = computeRelevantCodes(accounts, '1311');
    expect([...set].sort()).toEqual(['1311']);
  });

  it('TK cha gồm chính nó và mọi con cháu theo tiền tố', () => {
    const set = computeRelevantCodes(accounts, '131');
    expect([...set].sort()).toEqual(['131', '1311', '1312']);
  });

  it('không gộp nhầm tài khoản khác nhánh', () => {
    const set = computeRelevantCodes(accounts, '131');
    expect(set.has('111')).toBe(false);
    expect(set.has('1111')).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd be && yarn test so-chi-tiet.helper 2>&1 | tail -20`
Expected: FAIL — "Cannot find module './so-chi-tiet.helper'" hoặc `computeRelevantCodes is not a function`.

- [ ] **Step 3: Viết implementation tối thiểu**

Tạo `so-chi-tiet.helper.ts`:

```ts
import type { NhatKyChungEntry } from '@app/dto';

/**
 * Tập mã TK liên quan: chính nó + mọi TK con cháu (theo tiền tố mã).
 * Đồng nhất quy tắc với buildSoDuTree của FE.
 */
export function computeRelevantCodes(
  accounts: Array<{ ma: string }>,
  maTaiKhoan: string,
): Set<string> {
  const set = new Set<string>();
  for (const a of accounts) {
    if (a.ma === maTaiKhoan || a.ma.startsWith(maTaiKhoan)) {
      set.add(a.ma);
    }
  }
  // Luôn gồm chính nó kể cả khi không có trong danh mục (an toàn).
  set.add(maTaiKhoan);
  return set;
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cd be && yarn test so-chi-tiet.helper 2>&1 | tail -20`
Expected: PASS 3 test.

- [ ] **Step 5: Commit**

```bash
git add be/apps/reporting-service/src/so-chi-tiet
git commit -m "feat(be): helper computeRelevantCodes cho so chi tiet TK + test"
```

---

## Task 3: BE — helper `buildSoChiTiet` (TDD)

**Files:**
- Modify: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts`
- Modify: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts`

- [ ] **Step 1: Thêm test thất bại cho `buildSoChiTiet`**

Thêm vào đầu file spec (sau import cũ) import mở rộng:

```ts
import { computeRelevantCodes, buildSoChiTiet } from './so-chi-tiet.helper';
```

Thêm block test (helper tạo voucher gọn):

```ts
describe('buildSoChiTiet', () => {
  const account = { ma: '111', ten: 'Tiền mặt', loai: 'NO' };
  const relevant = new Set(['111']);

  const v = (
    ngay: string,
    soPhieu: string,
    tkNo: string,
    tkCo: string,
    soTien: number,
    doiTuongMa?: string,
  ) =>
    ({
      soPhieu,
      ngay: new Date(ngay) as any,
      soTien,
      noiDung: soPhieu,
      danhMuc: {
        taiKhoanNo: { ma: tkNo, ten: tkNo, loai: 'NO', nhom: '' },
        taiKhoanCo: { ma: tkCo, ten: tkCo, loai: 'CO', nhom: '' },
        ...(doiTuongMa
          ? { doiTuong: { ma: doiTuongMa, ten: doiTuongMa, loai: 'KHACH_HANG' } }
          : {}),
      },
    }) as any;

  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-01-31T23:59:59.999Z');

  it('TK đối ứng + bên phát sinh đúng theo vế (TK ở vế Nợ)', () => {
    const vouchers = [v('2026-01-05', 'PT01', '111', '511', 1000)];
    const r = buildSoChiTiet(account, relevant, vouchers, [], undefined, start, end);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].tkDoiUng).toBe('511');
    expect(r.rows[0].phatSinhNo).toBe(1000);
    expect(r.rows[0].phatSinhCo).toBe(0);
    expect(r.rows[0].soDuNo).toBe(1000);
    expect(r.tongPhatSinhNo).toBe(1000);
    expect(r.soDuCuoiKyNo).toBe(1000);
  });

  it('TK ở vế Có → phát sinh hiển thị bên Có, số dư giảm', () => {
    const vouchers = [
      v('2026-01-05', 'PT01', '111', '511', 1000),
      v('2026-01-06', 'PC01', '642', '111', 400),
    ];
    const r = buildSoChiTiet(account, relevant, vouchers, [], undefined, start, end);
    expect(r.rows[1].tkDoiUng).toBe('642');
    expect(r.rows[1].phatSinhCo).toBe(400);
    expect(r.rows[1].soDuNo).toBe(600);
    expect(r.tongPhatSinhCo).toBe(400);
    expect(r.soDuCuoiKyNo).toBe(600);
  });

  it('số dư đầu kỳ = nhập tay + phát sinh trước kỳ', () => {
    const opening = [{ maTaiKhoan: '111', duNo: 500, duCo: 0 }];
    const vouchers = [
      v('2025-12-20', 'PTprev', '111', '511', 200), // trước kỳ → vào đầu kỳ
      v('2026-01-05', 'PT01', '111', '511', 1000), // trong kỳ
    ];
    const r = buildSoChiTiet(account, relevant, vouchers, opening, undefined, start, end);
    expect(r.soDuDauKyNo).toBe(700); // 500 + 200
    expect(r.rows).toHaveLength(1); // chỉ phát sinh trong kỳ
    expect(r.soDuCuoiKyNo).toBe(1700); // 700 + 1000
  });

  it('lọc theo đối tượng áp dụng cho cả phát sinh lẫn số dư đầu kỳ', () => {
    const account131 = { ma: '131', ten: 'Phải thu', loai: 'NO' };
    const rel = new Set(['131']);
    const opening = [
      { maTaiKhoan: '131', duNo: 100, duCo: 0, chiTietMa: 'KH01' },
      { maTaiKhoan: '131', duNo: 999, duCo: 0, chiTietMa: 'KH02' },
    ];
    const vouchers = [
      v('2026-01-05', 'BH01', '131', '511', 300, 'KH01'),
      v('2026-01-06', 'BH02', '131', '511', 777, 'KH02'),
    ];
    const r = buildSoChiTiet(account131, rel, vouchers, opening, 'KH01', start, end);
    expect(r.soDuDauKyNo).toBe(100);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].soPhieu).toBe('BH01');
    expect(r.soDuCuoiKyNo).toBe(400);
  });

  it('gộp TK cha: chứng từ nội bộ 2 con sinh 2 dòng, số dư triệt tiêu', () => {
    const accountCha = { ma: '131', ten: 'Phải thu', loai: 'NO' };
    const rel = new Set(['131', '1311', '1312']);
    const vouchers = [v('2026-01-10', 'KC01', '1311', '1312', 500)];
    const r = buildSoChiTiet(accountCha, rel, vouchers, [], undefined, start, end);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].phatSinhNo).toBe(500);
    expect(r.rows[0].tkDoiUng).toBe('1312');
    expect(r.rows[1].phatSinhCo).toBe(500);
    expect(r.rows[1].tkDoiUng).toBe('1311');
    expect(r.soDuCuoiKyNo).toBe(0);
    expect(r.soDuCuoiKyCo).toBe(0);
    expect(r.tongPhatSinhNo).toBe(500);
    expect(r.tongPhatSinhCo).toBe(500);
  });

  it('bộ rỗng → 0 dòng, các tổng = 0', () => {
    const r = buildSoChiTiet(account, relevant, [], [], undefined, start, end);
    expect(r.rows).toHaveLength(0);
    expect(r.soDuDauKyNo).toBe(0);
    expect(r.soDuCuoiKyNo).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd be && yarn test so-chi-tiet.helper 2>&1 | tail -25`
Expected: FAIL — `buildSoChiTiet is not a function`.

- [ ] **Step 3: Viết implementation**

Thêm vào `so-chi-tiet.helper.ts`:

```ts
export interface SoChiTietRow {
  ngay: Date;
  soPhieu: string;
  ngayChungTu: Date;
  noiDung: string;
  tkDoiUng: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
}

export interface SoChiTietReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  doiTuong?: { ma: string; ten: string };
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  rows: SoChiTietRow[];
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
}

export interface OpeningRow {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
  chiTietMa?: string;
}

function getTkNo(v: NhatKyChungEntry): string {
  return v.taiKhoanNo || v.danhMuc?.taiKhoanNo?.ma || '';
}
function getTkCo(v: NhatKyChungEntry): string {
  return v.taiKhoanCo || v.danhMuc?.taiKhoanCo?.ma || '';
}

/** Tách số dư có dấu thành cặp Nợ/Có theo loại tài khoản. */
function splitBalance(
  signed: number,
  loai: string,
): { no: number; co: number } {
  if (loai === 'NO') {
    return signed >= 0 ? { no: signed, co: 0 } : { no: 0, co: -signed };
  }
  return signed >= 0 ? { no: 0, co: signed } : { no: -signed, co: 0 };
}

/**
 * Build sổ chi tiết tài khoản.
 * - `account`: TK đã chọn (cha hoặc leaf), quyết định loai để tính số dư.
 * - `relevantCodes`: tập mã TK gộp (computeRelevantCodes).
 * - `opening`: các dòng số dư đầu kỳ nhập tay (đã có chiTietMa).
 * - `maDoiTuong`: lọc theo đối tượng (tùy chọn).
 */
export function buildSoChiTiet(
  account: { ma: string; ten: string; loai: string },
  relevantCodes: Set<string>,
  vouchers: NhatKyChungEntry[],
  opening: OpeningRow[],
  maDoiTuong: string | undefined,
  startDate: Date,
  endDate: Date,
): SoChiTietReport {
  const loai = account.loai;

  // Các "vế" liên quan của 1 chứng từ, sau khi lọc theo cây + đối tượng.
  const legsOf = (
    v: NhatKyChungEntry,
  ): Array<{ no: number; co: number; tkDoiUng: string }> => {
    const objMa = v.danhMuc?.doiTuong?.ma;
    if (maDoiTuong && objMa !== maDoiTuong) return [];
    const tkNo = getTkNo(v);
    const tkCo = getTkCo(v);
    const out: Array<{ no: number; co: number; tkDoiUng: string }> = [];
    if (relevantCodes.has(tkNo)) {
      out.push({ no: v.soTien, co: 0, tkDoiUng: tkCo });
    }
    if (relevantCodes.has(tkCo)) {
      out.push({ no: 0, co: v.soTien, tkDoiUng: tkNo });
    }
    return out;
  };

  const delta = (no: number, co: number) =>
    loai === 'NO' ? no - co : co - no;

  // 1) Số dư đầu kỳ nhập tay
  let manualSigned = 0;
  for (const o of opening) {
    if (!relevantCodes.has(o.maTaiKhoan)) continue;
    if (maDoiTuong && o.chiTietMa !== maDoiTuong) continue;
    manualSigned += delta(Number(o.duNo) || 0, Number(o.duCo) || 0);
  }

  // 2) Phát sinh trước kỳ → cộng vào đầu kỳ
  let priorSigned = 0;
  for (const v of vouchers) {
    if (new Date(v.ngay).getTime() >= startDate.getTime()) continue;
    for (const leg of legsOf(v)) priorSigned += delta(leg.no, leg.co);
  }

  const soDuDauKySigned = manualSigned + priorSigned;

  // 3) Phát sinh trong kỳ
  const periodVouchers = vouchers
    .filter((v) => {
      const t = new Date(v.ngay).getTime();
      return t >= startDate.getTime() && t <= endDate.getTime();
    })
    .sort((a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime());

  let soDu = soDuDauKySigned;
  let tongPhatSinhNo = 0;
  let tongPhatSinhCo = 0;
  const rows: SoChiTietRow[] = [];

  for (const v of periodVouchers) {
    for (const leg of legsOf(v)) {
      soDu += delta(leg.no, leg.co);
      tongPhatSinhNo += leg.no;
      tongPhatSinhCo += leg.co;
      const s = splitBalance(soDu, loai);
      rows.push({
        ngay: new Date(v.ngay),
        soPhieu: v.soPhieu,
        ngayChungTu: new Date(v.ngay),
        noiDung: v.noiDung,
        tkDoiUng: leg.tkDoiUng,
        phatSinhNo: leg.no,
        phatSinhCo: leg.co,
        soDuNo: s.no,
        soDuCo: s.co,
      });
    }
  }

  const dauKy = splitBalance(soDuDauKySigned, loai);
  const cuoiKy = splitBalance(soDu, loai);

  return {
    taiKhoan: { ma: account.ma, ten: account.ten, loai },
    soDuDauKyNo: dauKy.no,
    soDuDauKyCo: dauKy.co,
    rows,
    tongPhatSinhNo,
    tongPhatSinhCo,
    soDuCuoiKyNo: cuoiKy.no,
    soDuCuoiKyCo: cuoiKy.co,
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cd be && yarn test so-chi-tiet.helper 2>&1 | tail -25`
Expected: PASS toàn bộ (3 của Task 2 + 7 của Task 3).

- [ ] **Step 5: Commit**

```bash
git add be/apps/reporting-service/src/so-chi-tiet
git commit -m "feat(be): helper buildSoChiTiet (TK doi ung, gop con, so du dau ky) + test"
```

---

## Task 4: BE — service `so-chi-tiet.service.ts`

**Files:**
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.service.ts`

- [ ] **Step 1: Viết service**

```ts
import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import {
  buildSoChiTiet,
  computeRelevantCodes,
  type SoChiTietReport,
  type OpeningRow,
} from './so-chi-tiet.helper';

@Injectable()
export class SoChiTietService {
  constructor(private readonly serviceClient: ServiceClient) {}

  async getSoChiTiet(
    maTaiKhoan: string,
    maDoiTuong: string | undefined,
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<SoChiTietReport> {
    // Lấy TẤT CẢ chứng từ (cần cả phát sinh trước kỳ cho số dư đầu kỳ)
    const [vouchersRes, accountsRes, doiTuongRes, openingRes] =
      await Promise.all([
        this.serviceClient.getNhatKyChung(undefined, undefined, authToken),
        this.serviceClient.getTaiKhoan(authToken),
        this.serviceClient.getDoiTuong(authToken),
        this.serviceClient.getSoDuDauKyRaw(authToken),
      ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const doiTuongs = doiTuongRes.success ? doiTuongRes.data || [] : [];
    const opening: OpeningRow[] = openingRes.success
      ? openingRes.data?.items || []
      : [];

    const account = accounts.find((a) => a.ma === maTaiKhoan);
    if (!account) {
      return {
        taiKhoan: { ma: maTaiKhoan, ten: 'Unknown', loai: 'NO' },
        soDuDauKyNo: 0,
        soDuDauKyCo: 0,
        rows: [],
        tongPhatSinhNo: 0,
        tongPhatSinhCo: 0,
        soDuCuoiKyNo: 0,
        soDuCuoiKyCo: 0,
      };
    }

    const relevantCodes = computeRelevantCodes(accounts, maTaiKhoan);

    // Chuẩn hoá endDate về cuối ngày để bao trùm trọn ngày kết thúc.
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const report = buildSoChiTiet(
      { ma: account.ma, ten: account.ten, loai: account.loai },
      relevantCodes,
      vouchers,
      opening,
      maDoiTuong,
      startDate,
      end,
    );

    if (maDoiTuong) {
      const dt = doiTuongs.find((d) => d.ma === maDoiTuong);
      if (dt) report.doiTuong = { ma: dt.ma, ten: dt.ten };
    }

    return report;
  }
}
```

- [ ] **Step 2: Build kiểm tra**

Run: `cd be && npx tsc -p apps/reporting-service/tsconfig.app.json --noEmit 2>&1 | tail -20`
Expected: không lỗi (nếu báo thiếu `getSoDuDauKyRaw` → kiểm tra Task 1 đã build vào dist/types chưa).

- [ ] **Step 3: Commit**

```bash
git add be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.service.ts
git commit -m "feat(be): so-chi-tiet service (fetch + build report)"
```

---

## Task 5: BE — controller + module + đăng ký

**Files:**
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.controller.ts`
- Create: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.module.ts`
- Create: `be/apps/reporting-service/src/so-chi-tiet/index.ts`
- Modify: `be/apps/reporting-service/src/reporting-service.module.ts`

- [ ] **Step 1: Viết controller**

`so-chi-tiet.controller.ts`:

```ts
import { Controller, Get, Query, UseGuards, Headers } from '@nestjs/common';
import { SoChiTietService } from './so-chi-tiet.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('so-chi-tiet-tai-khoan')
@UseGuards(JwtGuard, RoleGuard)
export class SoChiTietController {
  constructor(private readonly soChiTietService: SoChiTietService) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getSoChiTiet(
    @Query('maTaiKhoan') maTaiKhoan: string,
    @Query('maDoiTuong') maDoiTuong: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken: string,
  ) {
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : now;

    const data = await this.soChiTietService.getSoChiTiet(
      maTaiKhoan,
      maDoiTuong || undefined,
      start,
      end,
      authToken,
    );
    return { success: true, data };
  }
}
```

- [ ] **Step 2: Viết module**

`so-chi-tiet.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@app/service-client';
import { SoChiTietController } from './so-chi-tiet.controller';
import { SoChiTietService } from './so-chi-tiet.service';

@Module({
  imports: [ServiceClientModule.forRoot()],
  controllers: [SoChiTietController],
  providers: [SoChiTietService],
})
export class SoChiTietModule {}
```

> Đối chiếu `so-cai.module.ts` xem nó import `ServiceClientModule` thế nào; copy đúng cách import của nó để nhất quán.

- [ ] **Step 3: Viết index.ts**

`index.ts`:

```ts
export * from './so-chi-tiet.module';
export * from './so-chi-tiet.service';
export * from './so-chi-tiet.helper';
```

- [ ] **Step 4: Đăng ký module trong app**

Sửa `reporting-service.module.ts`: thêm import + vào mảng `imports`:

```ts
import { SoChiTietModule } from './so-chi-tiet/so-chi-tiet.module';
```
và thêm `SoChiTietModule,` vào `imports: [...]` (cạnh `SoCaiModule`).

- [ ] **Step 5: Build kiểm tra**

Run: `cd be && npx tsc -p apps/reporting-service/tsconfig.app.json --noEmit 2>&1 | tail -20`
Expected: không lỗi.

- [ ] **Step 6: Commit**

```bash
git add be/apps/reporting-service/src
git commit -m "feat(be): controller + module so-chi-tiet-tai-khoan, dang ky reporting"
```

---

## Task 6: BE — smoke test endpoint (thủ công)

**Files:** (không sửa file)

- [ ] **Step 1: Chạy reporting service**

Run: `cd be && yarn start:reporting:dev` *(và gateway nếu test qua gateway: `yarn start:gateway:dev`)*
Expected: service khởi động, log map route `/so-chi-tiet-tai-khoan`.

- [ ] **Step 2: Gọi thử (cần JWT hợp lệ)**

Run (thay `<TOKEN>`):
```bash
curl -s "http://localhost:3000/api/reporting/so-chi-tiet-tai-khoan?maTaiKhoan=111&startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer <TOKEN>" | head -c 600
```
Expected: JSON `{"success":true,"data":{"taiKhoan":...,"rows":[...]}}`.

- [ ] **Step 3: Ghi chú** — nếu 401/403: dùng tài khoản có role trong `@Roles(...)` hoặc super-admin. Không commit (chỉ kiểm thử).

---

## Task 7: FE — service `soChiTietTaiKhoanService.ts`

**Files:**
- Create: `fe/src/services/soChiTietTaiKhoanService.ts`

- [ ] **Step 1: Viết service**

```ts
import { ServiceBase } from './base/service-base';

export interface SoChiTietRow {
  ngay: string;
  soPhieu: string;
  ngayChungTu: string;
  noiDung: string;
  tkDoiUng: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
}

export interface SoChiTietReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  doiTuong?: { ma: string; ten: string };
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  rows: SoChiTietRow[];
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
}

class SoChiTietTaiKhoanService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/so-chi-tiet-tai-khoan' });
  }

  async getReport(
    maTaiKhoan: string,
    startDate: Date,
    endDate: Date,
    maDoiTuong?: string,
  ): Promise<SoChiTietReport | null> {
    const params: Record<string, string> = {
      maTaiKhoan,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    if (maDoiTuong) params.maDoiTuong = maDoiTuong;

    const data = await this.get<SoChiTietReport>({ params });
    if (!data || !data.taiKhoan) return null;
    return data;
  }
}

export const soChiTietTaiKhoanService = new SoChiTietTaiKhoanService();
```

> Kiểm tra `ServiceBase.get` có tự bóc envelope `{success,data}` không (xem `soCaiService.getLedger` dùng trực tiếp `data.taiKhoan`). Nếu giống → giữ nguyên như trên.

- [ ] **Step 2: Typecheck**

Run: `cd fe && npx tsc --noEmit 2>&1 | grep soChiTiet | head`
Expected: không lỗi liên quan file này.

- [ ] **Step 3: Commit**

```bash
git add fe/src/services/soChiTietTaiKhoanService.ts
git commit -m "feat(fe): soChiTietTaiKhoanService"
```

---

## Task 8: FE — trang `SoChiTietTaiKhoanPage.tsx`

**Files:**
- Create: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx`

- [ ] **Step 1: Viết trang**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Button, Space, Select, DatePicker, Breadcrumb, Empty, Typography,
} from 'antd';
import { ReloadOutlined, HomeOutlined, AccountBookOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import {
  soChiTietTaiKhoanService, SoChiTietReport,
} from '@/services/soChiTietTaiKhoanService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { doiTuongService } from '@/services/doiTuongService';

const { RangePicker } = DatePicker;
const { Text } = Typography;

type Kind = 'opening' | 'entry' | 'cong' | 'cuoi';
interface DisplayRow {
  key: string;
  kind: Kind;
  ngay?: string;
  soPhieu?: string;
  ngayChungTu?: string;
  noiDung: string;
  tkDoiUng?: string;
  phatSinhNo?: number;
  phatSinhCo?: number;
  soDuNo?: number;
  soDuCo?: number;
}

const fmt = (v?: number) =>
  v && v !== 0
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(v)
    : '';

const SoChiTietTaiKhoanPage: React.FC = () => {
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
  const [doiTuongOptions, setDoiTuongOptions] = useState<{ value: string; label: string }[]>([]);
  const [maTaiKhoan, setMaTaiKhoan] = useState<string>();
  const [maDoiTuong, setMaDoiTuong] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [report, setReport] = useState<SoChiTietReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [accs, dts] = await Promise.all([
        taiKhoanService.getAll(),
        doiTuongService.getAll(),
      ]);
      setAccountOptions(accs.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })));
      setDoiTuongOptions(dts.map((d) => ({ value: d.ma, label: `${d.ma} - ${d.ten}` })));
    })();
  }, []);

  const loadReport = async () => {
    if (!maTaiKhoan || !range) return;
    setLoading(true);
    try {
      const data = await soChiTietTaiKhoanService.getReport(
        maTaiKhoan,
        range[0].startOf('day').toDate(),
        range[1].endOf('day').toDate(),
        maDoiTuong,
      );
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  const dataSource: DisplayRow[] = useMemo(() => {
    if (!report) return [];
    const rows: DisplayRow[] = [];
    rows.push({
      key: 'opening', kind: 'opening', noiDung: 'Số dư đầu kỳ',
      soDuNo: report.soDuDauKyNo, soDuCo: report.soDuDauKyCo,
    });
    report.rows.forEach((r, i) => {
      rows.push({
        key: `e${i}`, kind: 'entry',
        ngay: dayjs(r.ngay).format('DD/MM/YYYY'),
        soPhieu: r.soPhieu,
        ngayChungTu: dayjs(r.ngayChungTu).format('DD/MM/YYYY'),
        noiDung: r.noiDung, tkDoiUng: r.tkDoiUng,
        phatSinhNo: r.phatSinhNo, phatSinhCo: r.phatSinhCo,
        soDuNo: r.soDuNo, soDuCo: r.soDuCo,
      });
    });
    rows.push({
      key: 'cong', kind: 'cong', noiDung: 'Cộng số phát sinh',
      phatSinhNo: report.tongPhatSinhNo, phatSinhCo: report.tongPhatSinhCo,
    });
    rows.push({
      key: 'cuoi', kind: 'cuoi', noiDung: 'Số dư cuối kỳ',
      soDuNo: report.soDuCuoiKyNo, soDuCo: report.soDuCuoiKyCo,
    });
    return rows;
  }, [report]);

  const columns: ColumnsType<DisplayRow> = [
    { title: 'Ngày ghi sổ', dataIndex: 'ngay', width: 110 },
    {
      title: 'Chứng từ',
      children: [
        { title: 'Số hiệu', dataIndex: 'soPhieu', width: 110 },
        { title: 'Ngày tháng', dataIndex: 'ngayChungTu', width: 110 },
      ],
    },
    { title: 'Diễn giải', dataIndex: 'noiDung', ellipsis: true },
    { title: 'TK đối ứng', dataIndex: 'tkDoiUng', width: 110, align: 'center' },
    {
      title: 'Số phát sinh',
      children: [
        { title: 'Nợ', dataIndex: 'phatSinhNo', width: 140, align: 'right', render: fmt },
        { title: 'Có', dataIndex: 'phatSinhCo', width: 140, align: 'right', render: fmt },
      ],
    },
    {
      title: 'Số dư',
      children: [
        { title: 'Nợ', dataIndex: 'soDuNo', width: 140, align: 'right', render: fmt },
        { title: 'Có', dataIndex: 'soDuCo', width: 140, align: 'right', render: fmt },
      ],
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Báo cáo' },
          { title: 'Sổ chi tiết tài khoản' },
        ]}
      />
      <Card
        title={<Space><AccountBookOutlined /><span>Sổ chi tiết tài khoản</span></Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={loadReport}>Xem báo cáo</Button>}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <RangePicker
            value={range}
            format="DD/MM/YYYY"
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
            allowClear={false}
          />
          <Select
            showSearch placeholder="Chọn tài khoản (bắt buộc)"
            style={{ width: 320 }} options={accountOptions}
            value={maTaiKhoan} onChange={setMaTaiKhoan}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <Select
            showSearch allowClear placeholder="Đối tượng (tùy chọn)"
            style={{ width: 320 }} options={doiTuongOptions}
            value={maDoiTuong} onChange={setMaDoiTuong}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <Button type="primary" onClick={loadReport} disabled={!maTaiKhoan}>Xem</Button>
        </Space>

        {report ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 16 }}>
                SỔ CHI TIẾT TÀI KHOẢN
              </div>
              <div>Tài khoản: <Text strong>{report.taiKhoan.ma} - {report.taiKhoan.ten}</Text></div>
              {report.doiTuong && (
                <div>Đối tượng: <Text strong>{report.doiTuong.ma} - {report.doiTuong.ten}</Text></div>
              )}
              <div>Loại tiền: <Text strong>VNĐ</Text></div>
            </div>
            <Table
              columns={columns}
              dataSource={dataSource}
              loading={loading}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 1100 }}
              rowClassName={(r) =>
                r.kind === 'entry' ? '' : 'sct-summary-row'
              }
            />
          </>
        ) : (
          <Empty description="Chọn tài khoản và kỳ rồi bấm Xem" />
        )}
      </Card>
      <style>{`.sct-summary-row { background:#fafafa; font-weight:600; }`}</style>
    </div>
  );
};

export default SoChiTietTaiKhoanPage;
```

> Kiểm tra `taiKhoanService.getAll()` trả về phần tử có `.ma` và `.ten` (xem cách `SoCaiPage` dùng `tk.ma`, `tk.ten`). Nếu khác → chỉnh map cho khớp.

- [ ] **Step 2: Typecheck**

Run: `cd fe && npx tsc --noEmit 2>&1 | grep -i "so-chi-tiet" | head`
Expected: không lỗi.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan
git commit -m "feat(fe): trang So chi tiet tai khoan (loc TK + doi tuong, TK doi ung)"
```

---

## Task 9: FE — nối route, quyền, sidebar, docs

**Files:**
- Modify: `fe/src/pages/loadable.tsx`
- Modify: `fe/src/App.tsx`
- Modify: `fe/src/config/routePermissions.ts`
- Modify: `fe/src/components/layout/MainLayout.tsx`
- Modify: `.claude/context/active-pages.md`

- [ ] **Step 1: Thêm lazy export vào `loadable.tsx`**

Thêm cạnh `SoCaiPage` (sau dòng `export const SoCaiPage = ...`):

```tsx
export const SoChiTietTaiKhoanPage = loadable(() => import('./bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage'), {
  fallback: <PageLoader />
});
```

- [ ] **Step 2: Import + đổi route trong `App.tsx`**

Thêm `SoChiTietTaiKhoanPage` vào danh sách import từ `loadable` (cạnh `SoCaiPage,`).
Thay dòng:
```tsx
<Route path="so-chi-tiet-tai-khoan" element={<ComingSoonPage />} />
```
bằng:
```tsx
<Route
  path="so-chi-tiet-tai-khoan"
  element={
    <ProtectedRoute requiredPermission="/bao-cao/so-chi-tiet-tai-khoan:xem">
      <SoChiTietTaiKhoanPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Thêm mapping quyền `routePermissions.ts`**

Thêm cạnh `'/bao-cao/so-cai'`:
```ts
  '/bao-cao/so-chi-tiet-tai-khoan': '/bao-cao/so-chi-tiet-tai-khoan:xem',
```

- [ ] **Step 4: Bật active trong sidebar `MainLayout.tsx`**

Thêm `"/bao-cao/so-chi-tiet-tai-khoan",` vào Set các route active (cạnh `"/bao-cao/so-cai",` quanh dòng 104). Mục menu đã tồn tại sẵn (dòng ~177) nên chỉ cần bỏ trạng thái "Sắp ra mắt".

- [ ] **Step 5: Cập nhật `.claude/context/active-pages.md`**

Đổi dòng `So chi tiet TK | /bao-cao/so-chi-tiet-tai-khoan | COMING SOON | —` thành:
```
| So chi tiet TK | `/bao-cao/so-chi-tiet-tai-khoan` | ACTIVE | reporting:3006 |
```

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/loadable.tsx fe/src/App.tsx fe/src/config/routePermissions.ts fe/src/components/layout/MainLayout.tsx .claude/context/active-pages.md
git commit -m "feat(fe): bat route So chi tiet tai khoan (ACTIVE) + quyen + sidebar"
```

---

## Task 10: Kiểm tra tổng thể

**Files:** (không sửa file)

- [ ] **Step 1: BE test toàn module**

Run: `cd be && yarn test so-chi-tiet 2>&1 | tail -15`
Expected: PASS toàn bộ.

- [ ] **Step 2: BE build**

Run: `cd be && npx tsc -p apps/reporting-service/tsconfig.app.json --noEmit 2>&1 | tail -10`
Expected: không lỗi.

- [ ] **Step 3: FE lint + build**

Run: `cd fe && npm run lint 2>&1 | tail -15 && npm run build 2>&1 | tail -15`
Expected: lint sạch (file mới), build thành công.

- [ ] **Step 4: Kiểm thử thủ công (checklist)**
  - [ ] Chọn TK leaf `111` + kỳ tháng → đối chiếu số liệu với tab "Chi tiết tài khoản" của Sổ cái.
  - [ ] Chọn TK cha (vd `131`) → tổng phát sinh khớp tổng các TK con; TK đối ứng hiển thị mã con thật.
  - [ ] Chọn TK `131` + 1 khách hàng → chỉ ra dòng của khách hàng đó; số dư đầu kỳ lọc đúng.
  - [ ] Đổi kỳ (tháng trước) → số dư đầu kỳ / cuối kỳ thay đổi hợp lý.
  - [ ] TK không phát sinh → bảng chỉ có 3 dòng tổng = 0.

- [ ] **Step 5: Commit (nếu có chỉnh sửa nhỏ khi kiểm thử)**

```bash
git add -A && git commit -m "chore: hoan thien So chi tiet tai khoan sau kiem thu"
```

---

## Ngoài phạm vi (bản đầu)
- Xuất Excel / In PDF mẫu sổ (header + chân ký + đánh số trang).
- Đa loại tiền (chỉ VNĐ).
- Chế độ "tách nhóm theo TK con" khi chọn TK cha.
- Seed quyền `/bao-cao/so-chi-tiet-tai-khoan:*` cho từng vai trò (test bằng super-admin hoặc role có sẵn trong `@Roles`).
