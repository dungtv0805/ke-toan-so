# Báo cáo tài chính — Chi tiết TK theo đối tượng (cây cha–con) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trong trang Báo cáo tài chính, các tài khoản có `chiTietTheo` được xổ ra từng đối tượng làm dòng con (cây cha–con) ở Tab 1 (Cân đối tài khoản) và Tab 2 (Cân đối kế toán); đối tượng là **phân rã** của số dư TK (Σ con = số dư TK), kèm dòng "Chưa xác định đối tượng" để khớp tổng.

**Architecture:** BE thêm aggregation/phân rã theo (TK, đối tượng) — Tab 1 dùng aggregation Mongo riêng trong voucher-service (không đụng tổng cũ), Tab 2 phân rã in-memory từ chứng từ thô đã tải. FE dựng cây TK như cũ rồi gắn node con là đối tượng (không cộng vào rollup). Logic thuần được tách ra helper để test (TDD).

**Tech Stack:** NestJS + MongoDB aggregation (BE, jest), React + Ant Design Table tree + vitest (FE). Spec: `docs/superpowers/specs/2026-06-06-bao-cao-tai-chinh-doi-tuong-cha-con-design.md`.

**Branch:** `feat/bao-cao-tai-chinh-doi-tuong-cha-con` (đã tạo).

---

## File Structure

**Backend**
- `be/libs/dto/src/master-data/tai-khoan.dto.ts` — thêm `chiTietTheo?` vào `TaiKhoanResponse` (master-data đã trả raw entity, chỉ cần khai báo type).
- `be/apps/voucher-service/src/nhat-ky-chung/helpers/doi-tuong-aggregation.helper.ts` (+ `.spec.ts`) — hàm thuần `mergeDoiTuongBuckets`.
- `be/apps/voucher-service/src/nhat-ky-chung/helpers/index.ts` — export helper mới.
- `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts` — method `aggregateBalanceByDoiTuong` (pipeline Mongo).
- `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts` — route `GET aggregate-balance-by-doi-tuong` (đặt **trước** `@Get(':id')`).
- `be/libs/service-client/src/service-client.ts` — method client `aggregateBalanceByDoiTuong`.
- `be/apps/reporting-service/src/so-cai/so-cai.service.ts` — `TrialBalanceEntry.doiTuongChiTiet?`, hàm thuần `buildDoiTuongRows`, wire vào `getTrialBalance`.
- `be/apps/reporting-service/src/so-cai/so-cai.helper.spec.ts` — test `buildDoiTuongRows`.
- `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts` — `BalanceSheetEntry.doiTuongChiTiet?`, hàm thuần `buildDoiTuongSoTien`, wire vào `getBalanceSheet`.
- `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts` — test `buildDoiTuongSoTien`.

**Frontend**
- `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts` — `TreeNode.__isDoiTuong?`, hàm `attachDoiTuongChildren`.
- `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts` — test `attachDoiTuongChildren`.
- `fe/src/services/soCaiService.ts` — carry `doiTuongChiTiet` qua type + map.
- `fe/src/services/balanceSheetService.ts` — carry `doiTuongChiTiet` qua type + map.
- `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx` — gắn đối tượng vào `trialBalanceTree` (Tab 1) và `buildBsTree` (Tab 2).

**Commands**
- BE test: `cd be && yarn test <pattern>` (jest). BE build: `cd be && yarn build`.
- FE test: `cd fe && npx vitest run <pattern>`. FE lint/build: `cd fe && npm run lint` / `npm run build`.

---

## Task 1: BE — `chiTietTheo` trong TaiKhoanResponse + đối tượng aggregation (voucher-service)

**Files:**
- Modify: `be/libs/dto/src/master-data/tai-khoan.dto.ts`
- Create: `be/apps/voucher-service/src/nhat-ky-chung/helpers/doi-tuong-aggregation.helper.ts`
- Create: `be/apps/voucher-service/src/nhat-ky-chung/helpers/doi-tuong-aggregation.helper.spec.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/helpers/index.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts`
- Modify: `be/libs/service-client/src/service-client.ts`

- [ ] **Step 1: Thêm `chiTietTheo` vào DTO**

Trong `be/libs/dto/src/master-data/tai-khoan.dto.ts`, sửa interface `TaiKhoanResponse`:

```typescript
export interface TaiKhoanResponse {
  _id: string;
  ma: string;
  ten: string;
  capDo: number;
  loai: 'NO' | 'CO';
  nhom: string;
  parentId?: string;
  moTa?: string;
  chiTietTheo?: string;
  isActive: boolean;
}
```

(Master-data `/tai-khoan` trả raw entity `TaiKhoan` — đã có cột `chiTietTheo`; chỉ cần khai báo type. Không sửa master-data.)

- [ ] **Step 2: Viết test cho `mergeDoiTuongBuckets`**

Tạo `be/apps/voucher-service/src/nhat-ky-chung/helpers/doi-tuong-aggregation.helper.spec.ts`:

```typescript
import { mergeDoiTuongBuckets } from './doi-tuong-aggregation.helper';

describe('mergeDoiTuongBuckets', () => {
  it('gộp nhánh Nợ và Có theo (ma, doiTuongMa)', () => {
    const no = [
      { _id: { ma: '131', dt: 'KH01' }, doiTuongTen: 'Khách A', priorNo: 100, periodNo: 50 },
    ];
    const co = [
      { _id: { ma: '131', dt: 'KH01' }, doiTuongTen: 'Khách A', priorCo: 10, periodCo: 5 },
    ];
    const result = mergeDoiTuongBuckets(no, co);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ma: '131', doiTuongMa: 'KH01', doiTuongTen: 'Khách A',
      priorNo: 100, priorCo: 10, periodNo: 50, periodCo: 5,
    });
  });

  it('đối tượng khác nhau → bucket riêng', () => {
    const no = [
      { _id: { ma: '131', dt: 'KH01' }, doiTuongTen: 'A', priorNo: 100, periodNo: 0 },
      { _id: { ma: '131', dt: 'KH02' }, doiTuongTen: 'B', priorNo: 200, periodNo: 0 },
    ];
    const result = mergeDoiTuongBuckets(no, []);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.doiTuongMa).sort()).toEqual(['KH01', 'KH02']);
  });

  it('thiếu đối tượng (dt = null) → giữ bucket null, lấy tên từ nhánh Có khi Nợ trống', () => {
    const co = [
      { _id: { ma: '331', dt: null }, doiTuongTen: null, priorCo: 70, periodCo: 30 },
    ];
    const result = mergeDoiTuongBuckets([], co);
    expect(result).toHaveLength(1);
    expect(result[0].doiTuongMa).toBeNull();
    expect(result[0].priorCo).toBe(70);
    expect(result[0].periodCo).toBe(30);
    expect(result[0].priorNo).toBe(0);
  });
});
```

- [ ] **Step 3: Chạy test — xác nhận FAIL**

Run: `cd be && yarn test doi-tuong-aggregation.helper`
Expected: FAIL — `Cannot find module './doi-tuong-aggregation.helper'`.

- [ ] **Step 4: Viết helper thuần**

Tạo `be/apps/voucher-service/src/nhat-ky-chung/helpers/doi-tuong-aggregation.helper.ts`:

```typescript
export interface DoiTuongBucket {
  ma: string;
  doiTuongMa: string | null;
  doiTuongTen: string | null;
  priorNo: number;
  priorCo: number;
  periodNo: number;
  periodCo: number;
}

export interface RawNoGroup {
  _id: { ma: string; dt: string | null };
  doiTuongTen: string | null;
  priorNo: number;
  periodNo: number;
}

export interface RawCoGroup {
  _id: { ma: string; dt: string | null };
  doiTuongTen: string | null;
  priorCo: number;
  periodCo: number;
}

/** Gộp kết quả $facet (Nợ + Có) theo khóa (mã TK, mã đối tượng). */
export function mergeDoiTuongBuckets(
  noEntries: RawNoGroup[],
  coEntries: RawCoGroup[],
): DoiTuongBucket[] {
  const keyOf = (ma: string, dt: string | null) => `${ma}|${dt ?? ''}`;
  const map = new Map<string, DoiTuongBucket>();

  for (const e of noEntries) {
    const ma = e._id.ma;
    const dt = e._id.dt ?? null;
    map.set(keyOf(ma, dt), {
      ma,
      doiTuongMa: dt,
      doiTuongTen: e.doiTuongTen ?? null,
      priorNo: e.priorNo,
      priorCo: 0,
      periodNo: e.periodNo,
      periodCo: 0,
    });
  }

  for (const e of coEntries) {
    const ma = e._id.ma;
    const dt = e._id.dt ?? null;
    const k = keyOf(ma, dt);
    const existing: DoiTuongBucket = map.get(k) ?? {
      ma,
      doiTuongMa: dt,
      doiTuongTen: e.doiTuongTen ?? null,
      priorNo: 0,
      priorCo: 0,
      periodNo: 0,
      periodCo: 0,
    };
    existing.priorCo = e.priorCo;
    existing.periodCo = e.periodCo;
    if (!existing.doiTuongTen) existing.doiTuongTen = e.doiTuongTen ?? null;
    map.set(k, existing);
  }

  return Array.from(map.values());
}
```

- [ ] **Step 5: Chạy test — xác nhận PASS**

Run: `cd be && yarn test doi-tuong-aggregation.helper`
Expected: PASS (3 test).

- [ ] **Step 6: Export helper**

Trong `be/apps/voucher-service/src/nhat-ky-chung/helpers/index.ts`, thêm dòng:

```typescript
export * from './doi-tuong-aggregation.helper';
```

- [ ] **Step 7: Thêm method `aggregateBalanceByDoiTuong` vào service**

Trong `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts`, đảm bảo import helper ở đầu file (cùng nhóm import helpers hiện có), ví dụ:

```typescript
import { mergeDoiTuongBuckets, DoiTuongBucket } from './helpers';
```

Thêm method ngay sau method `aggregateBalance` (sau dòng `}` kết thúc nó, khoảng dòng 214):

```typescript
  /**
   * Gom số dư theo (tài khoản, đối tượng) — phục vụ xổ cây đối tượng ở báo cáo.
   * Bucket doiTuongMa = null là phần chứng từ không gắn đối tượng.
   */
  async aggregateBalanceByDoiTuong(
    startDate: Date,
    endDate: Date,
    tenantId?: string,
  ): Promise<{ success: boolean; data: DoiTuongBucket[] }> {
    const pipeline: object[] = [
      {
        $match: {
          ...(tenantId ? { tenantId } : {}),
          ngay: { $lte: endDate },
        },
      },
      {
        $facet: {
          noEntries: [
            { $match: { 'danhMuc.taiKhoanNo.ma': { $exists: true, $ne: null } } },
            {
              $group: {
                _id: { ma: '$danhMuc.taiKhoanNo.ma', dt: '$danhMuc.doiTuong.ma' },
                doiTuongTen: { $first: '$danhMuc.doiTuong.ten' },
                priorNo: {
                  $sum: { $cond: [{ $lt: ['$ngay', startDate] }, '$soTien', 0] },
                },
                periodNo: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$ngay', startDate] }, { $lte: ['$ngay', endDate] }] },
                      '$soTien',
                      0,
                    ],
                  },
                },
              },
            },
          ],
          coEntries: [
            { $match: { 'danhMuc.taiKhoanCo.ma': { $exists: true, $ne: null } } },
            {
              $group: {
                _id: { ma: '$danhMuc.taiKhoanCo.ma', dt: '$danhMuc.doiTuong.ma' },
                doiTuongTen: { $first: '$danhMuc.doiTuong.ten' },
                priorCo: {
                  $sum: { $cond: [{ $lt: ['$ngay', startDate] }, '$soTien', 0] },
                },
                periodCo: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$ngay', startDate] }, { $lte: ['$ngay', endDate] }] },
                      '$soTien',
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ];

    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    const facet = result[0] || { noEntries: [], coEntries: [] };
    const data = mergeDoiTuongBuckets(facet.noEntries, facet.coEntries);
    data.sort((a, b) =>
      a.ma.localeCompare(b.ma) || (a.doiTuongMa ?? '').localeCompare(b.doiTuongMa ?? ''),
    );
    return { success: true, data };
  }
```

- [ ] **Step 8: Thêm route controller (TRƯỚC `@Get(':id')`)**

Trong `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts`, thêm ngay sau block route `aggregate-balance` (kết thúc khoảng dòng 68), **trước** route `summary/:type` và `:id`:

```typescript
  @Get('aggregate-balance-by-doi-tuong')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async aggregateBalanceByDoiTuong(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken?: string,
  ) {
    let tenantId: string | undefined;
    if (authToken?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.decode(authToken.substring(7)) as { tenantId?: string } | null;
        tenantId = decoded?.tenantId;
      } catch {}
    }
    return this.nhatKyChungService.aggregateBalanceByDoiTuong(
      new Date(startDate),
      new Date(endDate),
      tenantId,
    );
  }
```

- [ ] **Step 9: Thêm method client**

Trong `be/libs/service-client/src/service-client.ts`, thêm ngay sau method `aggregateBalance` (trước dấu `}` đóng class, khoảng dòng 286):

```typescript
  async aggregateBalanceByDoiTuong(
    startDate: string,
    endDate: string,
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<Array<{
    ma: string;
    doiTuongMa: string | null;
    doiTuongTen: string | null;
    priorNo: number;
    priorCo: number;
    periodNo: number;
    periodCo: number;
  }>>> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    return this.get('voucher', '/nhat-ky-chung/aggregate-balance-by-doi-tuong', {
      headers: Object.keys(headers).length ? headers : undefined,
      query: { startDate, endDate },
    });
  }
```

- [ ] **Step 10: Build BE — xác nhận biên dịch OK**

Run: `cd be && yarn build`
Expected: build thành công, không lỗi TypeScript.

- [ ] **Step 11: Commit**

```bash
git add be/libs/dto/src/master-data/tai-khoan.dto.ts \
  be/apps/voucher-service/src/nhat-ky-chung/helpers/doi-tuong-aggregation.helper.ts \
  be/apps/voucher-service/src/nhat-ky-chung/helpers/doi-tuong-aggregation.helper.spec.ts \
  be/apps/voucher-service/src/nhat-ky-chung/helpers/index.ts \
  be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts \
  be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts \
  be/libs/service-client/src/service-client.ts
git commit -m "feat(voucher): aggregate-balance theo (TK, đối tượng) + chiTietTheo trong TaiKhoanResponse

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: BE — Cân đối tài khoản gắn chi tiết đối tượng (reporting/so-cai)

**Files:**
- Modify: `be/apps/reporting-service/src/so-cai/so-cai.service.ts`
- Modify: `be/apps/reporting-service/src/so-cai/so-cai.helper.spec.ts`

- [ ] **Step 1: Thêm field `doiTuongChiTiet` vào `TrialBalanceEntry`**

Trong `be/apps/reporting-service/src/so-cai/so-cai.service.ts`, sửa interface `TrialBalanceEntry` (khoảng dòng 23):

```typescript
export interface TrialBalanceEntry {
  ma: string;
  ten: string;
  noDauKy: number;
  coDauKy: number;
  noPhatSinh: number;
  coPhatSinh: number;
  noCuoiKy: number;
  coCuoiKy: number;
  doiTuongChiTiet?: TrialBalanceEntry[];
}
```

- [ ] **Step 2: Viết test cho `buildDoiTuongRows`**

Trong `be/apps/reporting-service/src/so-cai/so-cai.helper.spec.ts`, thêm import và describe block mới ở cuối file:

```typescript
import { buildDoiTuongRows } from './so-cai.service';

describe('buildDoiTuongRows', () => {
  it('phát sinh cộng đúng theo từng đối tượng (loại NO)', () => {
    const rows = buildDoiTuongRows(
      'NO',
      [
        { doiTuongMa: 'KH01', doiTuongTen: 'A', priorNo: 0, priorCo: 0, periodNo: 300, periodCo: 0 },
        { doiTuongMa: 'KH02', doiTuongTen: 'B', priorNo: 0, priorCo: 0, periodNo: 200, periodCo: 0 },
      ],
      [],
    );
    expect(rows).toHaveLength(2);
    const tongPhatSinhNo = rows.reduce((s, r) => s + r.noPhatSinh, 0);
    expect(tongPhatSinhNo).toBe(500);
    expect(rows[0].ma).toBe('KH01');
    expect(rows[0].ten).toBe('A');
  });

  it('opening theo đối tượng cộng vào đầu kỳ', () => {
    const rows = buildDoiTuongRows(
      'NO',
      [{ doiTuongMa: 'KH01', doiTuongTen: 'A', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 }],
      [{ doiTuongMa: 'KH01', doiTuongTen: 'A', duNo: 1000, duCo: 0 }],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].noDauKy).toBe(1000);
    expect(rows[0].noCuoiKy).toBe(1000);
  });

  it('đối tượng null → dòng "Chưa xác định đối tượng", ma rỗng', () => {
    const rows = buildDoiTuongRows(
      'CO',
      [{ doiTuongMa: null, doiTuongTen: null, priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 70 }],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].ma).toBe('');
    expect(rows[0].ten).toBe('Chưa xác định đối tượng');
    expect(rows[0].coPhatSinh).toBe(70);
  });

  it('bỏ dòng đối tượng toàn 0', () => {
    const rows = buildDoiTuongRows(
      'NO',
      [{ doiTuongMa: 'KH01', doiTuongTen: 'A', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 }],
      [],
    );
    expect(rows).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Chạy test — xác nhận FAIL**

Run: `cd be && yarn test so-cai.helper`
Expected: FAIL — `buildDoiTuongRows` chưa được export / không tồn tại.

- [ ] **Step 4: Viết hàm thuần `buildDoiTuongRows`**

Trong `be/apps/reporting-service/src/so-cai/so-cai.service.ts`, thêm ngay sau hàm `computeTrialRow` (sau dòng `}` đóng nó, khoảng dòng 94):

```typescript
export interface DoiTuongAgg {
  doiTuongMa: string | null;
  doiTuongTen: string | null;
  priorNo: number;
  priorCo: number;
  periodNo: number;
  periodCo: number;
}

export interface DoiTuongOpening {
  doiTuongMa: string | null;
  doiTuongTen: string | null;
  duNo: number;
  duCo: number;
}

const CHUA_XAC_DINH_DOI_TUONG = 'Chưa xác định đối tượng';

/**
 * Dựng các dòng chi tiết theo đối tượng cho 1 tài khoản (cân đối phát sinh).
 * Mỗi đối tượng tính như 1 "tài khoản con" qua computeTrialRow; ma rỗng + tên
 * "Chưa xác định đối tượng" cho phần chứng từ/đầu kỳ không gắn đối tượng.
 * Bỏ các dòng toàn 0. Σ phát sinh các dòng = phát sinh của TK.
 */
export function buildDoiTuongRows(
  loai: string,
  aggs: DoiTuongAgg[],
  openings: DoiTuongOpening[],
): TrialBalanceEntry[] {
  const keyOf = (dt: string | null) => dt ?? '';
  const aggMap = new Map<string, DoiTuongAgg>();
  for (const a of aggs) aggMap.set(keyOf(a.doiTuongMa), a);
  const openMap = new Map<string, DoiTuongOpening>();
  for (const o of openings) openMap.set(keyOf(o.doiTuongMa), o);

  const keys = new Set<string>([...aggMap.keys(), ...openMap.keys()]);
  const rows: TrialBalanceEntry[] = [];

  for (const k of keys) {
    const a = aggMap.get(k);
    const o = openMap.get(k);
    const row = computeTrialRow(
      {
        priorNo: a?.priorNo ?? 0,
        priorCo: a?.priorCo ?? 0,
        periodNo: a?.periodNo ?? 0,
        periodCo: a?.periodCo ?? 0,
      },
      { duNo: o?.duNo ?? 0, duCo: o?.duCo ?? 0 },
      loai,
    );
    const doiTuongMa = a?.doiTuongMa ?? o?.doiTuongMa ?? null;
    const doiTuongTen = a?.doiTuongTen ?? o?.doiTuongTen ?? null;
    rows.push({
      ma: doiTuongMa ?? '',
      ten: doiTuongMa ? doiTuongTen ?? '' : CHUA_XAC_DINH_DOI_TUONG,
      ...row,
    });
  }

  const isZero = (r: TrialBalanceEntry) =>
    !r.noDauKy && !r.coDauKy && !r.noPhatSinh && !r.coPhatSinh && !r.noCuoiKy && !r.coCuoiKy;

  return rows.filter((r) => !isZero(r)).sort((x, y) => x.ma.localeCompare(y.ma));
}
```

- [ ] **Step 5: Chạy test — xác nhận PASS**

Run: `cd be && yarn test so-cai.helper`
Expected: PASS (gồm cả 4 test mới).

- [ ] **Step 6: Wire vào `getTrialBalance`**

Trong `be/apps/reporting-service/src/so-cai/so-cai.service.ts`, sửa `getTrialBalance`. Thay block `Promise.all` (khoảng dòng 318) để thêm 2 nguồn dữ liệu:

```typescript
    const [aggRes, accountsRes, openingRes, dtAggRes, openingRawRes] = await Promise.all([
      this.serviceClient.aggregateBalance(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
      this.serviceClient.getSoDuDauKy(authToken),
      this.serviceClient.aggregateBalanceByDoiTuong(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getSoDuDauKyRaw(authToken),
    ]);

    const aggData = aggRes.success ? aggRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const openingItems =
      openingRes.success && openingRes.data ? openingRes.data.items || [] : [];
    const dtAggData = dtAggRes.success ? dtAggRes.data || [] : [];
    const openingRawItems =
      openingRawRes.success && openingRawRes.data ? openingRawRes.data.items || [] : [];

    // Gom đối tượng theo mã tài khoản
    const dtAggByAccount = new Map<string, DoiTuongAgg[]>();
    for (const d of dtAggData) {
      const arr = dtAggByAccount.get(d.ma) ?? [];
      arr.push({
        doiTuongMa: d.doiTuongMa,
        doiTuongTen: d.doiTuongTen,
        priorNo: d.priorNo,
        priorCo: d.priorCo,
        periodNo: d.periodNo,
        periodCo: d.periodCo,
      });
      dtAggByAccount.set(d.ma, arr);
    }

    // Gom opening đối tượng theo (mã TK, mã đối tượng)
    const dtOpeningByAccount = new Map<string, Map<string, DoiTuongOpening>>();
    for (const o of openingRawItems) {
      const accMap = dtOpeningByAccount.get(o.maTaiKhoan) ?? new Map<string, DoiTuongOpening>();
      const dtKey = o.chiTietMa ?? '';
      const ex = accMap.get(dtKey) ?? {
        doiTuongMa: o.chiTietMa ?? null,
        doiTuongTen: o.chiTietTen ?? null,
        duNo: 0,
        duCo: 0,
      };
      ex.duNo += Number(o.duNo) || 0;
      ex.duCo += Number(o.duCo) || 0;
      accMap.set(dtKey, ex);
      dtOpeningByAccount.set(o.maTaiKhoan, accMap);
    }
```

(Giữ nguyên phần `accountMap`, `aggMap`, `openingMap`, vòng lặp `for (const ma of allMas)` và `totals` bên dưới — **không đổi**.)

Sau dòng `entries.push({ ma, ten: account.ten, ...row });` (khoảng dòng 370), thêm gắn chi tiết đối tượng cho TK có `chiTietTheo`:

```typescript
      if (account.chiTietTheo) {
        const dtRows = buildDoiTuongRows(
          account.loai,
          dtAggByAccount.get(ma) ?? [],
          Array.from((dtOpeningByAccount.get(ma) ?? new Map<string, DoiTuongOpening>()).values()),
        );
        if (dtRows.length > 0) {
          entries[entries.length - 1].doiTuongChiTiet = dtRows;
        }
      }
```

- [ ] **Step 7: Build BE — xác nhận biên dịch OK**

Run: `cd be && yarn build`
Expected: build thành công.

- [ ] **Step 8: Commit**

```bash
git add be/apps/reporting-service/src/so-cai/so-cai.service.ts \
  be/apps/reporting-service/src/so-cai/so-cai.helper.spec.ts
git commit -m "feat(reporting): cân đối tài khoản trả chi tiết theo đối tượng

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: BE — Cân đối kế toán gắn chi tiết đối tượng (reporting/bao-cao)

**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`

- [ ] **Step 1: Thêm field `doiTuongChiTiet` vào `BalanceSheetEntry`**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`, sửa interface `BalanceSheetEntry` (khoảng dòng 25):

```typescript
export interface DoiTuongSoTien {
  ma: string;
  ten: string;
  soTien: number;
}

export interface BalanceSheetEntry {
  ma: string;
  ten: string;
  soTien: number;
  doiTuongChiTiet?: DoiTuongSoTien[];
}
```

- [ ] **Step 2: Viết test cho `buildDoiTuongSoTien`**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`, thêm import và describe block mới ở cuối file:

```typescript
import { buildDoiTuongSoTien } from './bao-cao.service';

describe('buildDoiTuongSoTien', () => {
  const v = (maNo: string, maCo: string, dtMa: string | undefined, soTien: number) => ({
    soPhieu: 'x', loai: 'PHIEU_THU' as const, ngay: new Date(), noiDung: '', soTien,
    danhMuc: {
      taiKhoanNo: { ma: maNo, ten: '', loai: '', nhom: '' },
      taiKhoanCo: { ma: maCo, ten: '', loai: '', nhom: '' },
      ...(dtMa ? { doiTuong: { ma: dtMa, ten: `Tên ${dtMa}`, loai: '' } } : {}),
    },
  });

  it('phân rã số dư TK 131 (phía NO) theo đối tượng, Σ = số dư TK', () => {
    const vouchers = [v('131', '511', 'KH01', 300), v('131', '511', 'KH02', 200)];
    const rows = buildDoiTuongSoTien(vouchers, '131', 'NO', []);
    const tong = rows.reduce((s, r) => s + r.soTien, 0);
    expect(tong).toBe(500);
    expect(rows.map((r) => r.ma).sort()).toEqual(['KH01', 'KH02']);
  });

  it('chứng từ thiếu đối tượng → dòng "Chưa xác định đối tượng" (ma rỗng)', () => {
    const vouchers = [v('131', '511', 'KH01', 300), v('131', '511', undefined, 200)];
    const rows = buildDoiTuongSoTien(vouchers, '131', 'NO', []);
    const orphan = rows.find((r) => r.ma === '');
    expect(orphan?.ten).toBe('Chưa xác định đối tượng');
    expect(orphan?.soTien).toBe(200);
  });

  it('cộng opening theo đối tượng và bỏ dòng 0', () => {
    const rows = buildDoiTuongSoTien([], '131', 'NO', [
      { chiTietMa: 'KH01', chiTietTen: 'A', net: 1000 },
      { chiTietMa: 'KH02', chiTietTen: 'B', net: 0 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ma).toBe('KH01');
    expect(rows[0].soTien).toBe(1000);
  });
});
```

- [ ] **Step 3: Chạy test — xác nhận FAIL**

Run: `cd be && yarn test bao-cao.helper`
Expected: FAIL — `buildDoiTuongSoTien` chưa tồn tại.

- [ ] **Step 4: Viết hàm thuần `buildDoiTuongSoTien`**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`, thêm ngay sau hàm `openingNetForSide` (sau dòng `}` đóng nó, khoảng dòng 54):

```typescript
const CHUA_XAC_DINH_DOI_TUONG = 'Chưa xác định đối tượng';

/**
 * Phân rã số dư 1 tài khoản theo đối tượng cho Cân đối kế toán.
 * Cùng công thức cộng dồn như calculateAccountBalance nhưng tách theo đối tượng.
 * `openings[i].net` = phần đóng góp của số dư đầu kỳ vào phía đang xét (đã qua
 * openingNetForSide). Đối tượng rỗng/thiếu gom vào "Chưa xác định đối tượng".
 * Bỏ dòng ~0; Σ(các dòng) = số dư TK (với TK có số dư dương).
 */
export function buildDoiTuongSoTien(
  vouchers: NhatKyChungEntry[],
  maTaiKhoan: string,
  type: 'NO' | 'CO',
  openings: Array<{ chiTietMa?: string; chiTietTen?: string; net: number }>,
): DoiTuongSoTien[] {
  const map = new Map<string, { ten: string; soTien: number }>();
  const add = (ma: string, ten: string, delta: number) => {
    const ex = map.get(ma) ?? { ten, soTien: 0 };
    ex.soTien += delta;
    if (!ex.ten && ten) ex.ten = ten;
    map.set(ma, ex);
  };

  for (const o of openings) {
    add(o.chiTietMa ?? '', o.chiTietTen ?? '', o.net);
  }

  for (const v of vouchers) {
    const maTKNo = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo;
    const maTKCo = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
    const dtMa = v.danhMuc?.doiTuong?.ma ?? '';
    const dtTen = v.danhMuc?.doiTuong?.ten ?? '';
    if (maTKNo === maTaiKhoan) add(dtMa, dtTen, type === 'NO' ? v.soTien : -v.soTien);
    if (maTKCo === maTaiKhoan) add(dtMa, dtTen, type === 'CO' ? v.soTien : -v.soTien);
  }

  return Array.from(map.entries())
    .map(([ma, val]) => ({ ma, ten: ma ? val.ten : CHUA_XAC_DINH_DOI_TUONG, soTien: val.soTien }))
    .filter((d) => Math.round(d.soTien) !== 0)
    .sort((a, b) => a.ma.localeCompare(b.ma));
}
```

- [ ] **Step 5: Chạy test — xác nhận PASS**

Run: `cd be && yarn test bao-cao.helper`
Expected: PASS (gồm 3 test mới).

- [ ] **Step 6: Wire vào `getBalanceSheet`**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`, sửa `getBalanceSheet`. Thay block `Promise.all` (khoảng dòng 150) để thêm opening raw:

```typescript
    const [vouchersRes, accountsRes, openingRes, openingRawRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        '2000-01-01',
        asOfDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
      this.serviceClient.getSoDuDauKy(authToken, tenantId),
      this.serviceClient.getSoDuDauKyRaw(authToken, tenantId),
    ]);
```

Ngay sau khi đã có `openingMap` (khoảng dòng 165-170), thêm gom opening raw theo tài khoản:

```typescript
    const openingRawItems =
      openingRawRes.success && openingRawRes.data ? openingRawRes.data.items || [] : [];
    const openingRawByAccount = new Map<
      string,
      Array<{ chiTietMa?: string; chiTietTen?: string; duNo: number; duCo: number }>
    >();
    for (const o of openingRawItems) {
      const arr = openingRawByAccount.get(o.maTaiKhoan) ?? [];
      arr.push({
        chiTietMa: o.chiTietMa,
        chiTietTen: o.chiTietTen,
        duNo: Number(o.duNo) || 0,
        duCo: Number(o.duCo) || 0,
      });
      openingRawByAccount.set(o.maTaiKhoan, arr);
    }
```

Trong vòng lặp tài sản (phía 'NO', sau dòng `taiSan.push(...)` khoảng dòng 191), thêm:

```typescript
        if (account.chiTietTheo) {
          const dt = buildDoiTuongSoTien(
            vouchers,
            account.ma,
            'NO',
            (openingRawByAccount.get(account.ma) ?? []).map((o) => ({
              chiTietMa: o.chiTietMa,
              chiTietTen: o.chiTietTen,
              net: openingNetForSide({ duNo: o.duNo, duCo: o.duCo }, 'NO'),
            })),
          );
          if (dt.length > 0) taiSan[taiSan.length - 1].doiTuongChiTiet = dt;
        }
```

Trong vòng lặp nguồn vốn (phía 'CO', sau dòng `nguonVon.push(...)` khoảng dòng 204), thêm:

```typescript
        if (account.chiTietTheo) {
          const dt = buildDoiTuongSoTien(
            vouchers,
            account.ma,
            'CO',
            (openingRawByAccount.get(account.ma) ?? []).map((o) => ({
              chiTietMa: o.chiTietMa,
              chiTietTen: o.chiTietTen,
              net: openingNetForSide({ duNo: o.duNo, duCo: o.duCo }, 'CO'),
            })),
          );
          if (dt.length > 0) nguonVon[nguonVon.length - 1].doiTuongChiTiet = dt;
        }
```

- [ ] **Step 7: Build BE — xác nhận biên dịch OK**

Run: `cd be && yarn build`
Expected: build thành công.

- [ ] **Step 8: Commit**

```bash
git add be/apps/reporting-service/src/bao-cao/bao-cao.service.ts \
  be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts
git commit -m "feat(reporting): cân đối kế toán trả chi tiết theo đối tượng

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: FE — `attachDoiTuongChildren` util + test

**Files:**
- Modify: `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts`
- Modify: `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts`

- [ ] **Step 1: Thêm cờ `__isDoiTuong` vào type `TreeNode`**

Trong `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts`, sửa type `TreeNode` (đầu file):

```typescript
export type TreeNode<T> = T & {
  __ma: string;
  __isParent: boolean;
  __isDoiTuong?: boolean;
  __rollup: Record<string, number>;
  children?: TreeNode<T>[];
};
```

- [ ] **Step 2: Viết test cho `attachDoiTuongChildren`**

Trong `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts`, sửa dòng import đầu file thành:

```typescript
import { buildAccountTree, collectParentKeys, attachDoiTuongChildren, type TreeNode } from './buildAccountTree';
```

Thêm describe block mới ở cuối file:

```typescript
describe('attachDoiTuongChildren', () => {
  const makeDtNode = (code: string, dtMa: string, val: number): TreeNode<Row> => ({
    ma: '', ten: `${dtMa} - Tên`, val,
    __ma: `${code}::${dtMa}`, __isParent: false, __isDoiTuong: true, __rollup: {},
  });

  it('gắn đối tượng làm con, giữ nguyên giá trị TK cha, không cộng vào rollup', () => {
    const rows: Row[] = [{ ma: '131', ten: 'Phải thu KH', val: 500 }];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    const childrenByCode = new Map<string, TreeNode<Row>[]>([
      ['131', [makeDtNode('131', 'KH01', 300), makeDtNode('131', 'KH02', 200)]],
    ]);
    attachDoiTuongChildren(tree, childrenByCode);

    const n131 = tree[0];
    expect(n131.__ma).toBe('131');
    expect(n131.__isParent).toBe(true);
    expect(n131.val).toBe(500);            // giá trị TK cha không đổi
    expect(n131.__rollup.val).toBe(0);     // đối tượng KHÔNG vào rollup
    expect(n131.children).toHaveLength(2);
    expect(n131.children![0].__isDoiTuong).toBe(true);
    // collectParentKeys gom được TK có đối tượng (cho nút "Mở tất cả")
    expect(collectParentKeys(tree)).toContain('131');
  });

  it('node không có trong map → không đổi', () => {
    const rows: Row[] = [{ ma: '131', ten: 'x', val: 10 }];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    attachDoiTuongChildren(tree, new Map());
    expect(tree[0].__isParent).toBe(false);
    expect(tree[0].children).toBeUndefined();
  });
});
```

- [ ] **Step 3: Chạy test — xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts`
Expected: FAIL — `attachDoiTuongChildren` chưa export.

- [ ] **Step 4: Viết `attachDoiTuongChildren`**

Trong `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts`, thêm ở cuối file:

```typescript
/**
 * Gắn các node đối tượng (đã dựng sẵn) làm con của node tài khoản tương ứng.
 * Đối tượng là PHÂN RÃ của số dư TK (không nằm trong __rollup) → chỉ append làm
 * con và đánh dấu node TK là cha. Mutate cây tại chỗ.
 */
export function attachDoiTuongChildren<T>(
  tree: TreeNode<T>[],
  childrenByCode: Map<string, TreeNode<T>[]>,
): void {
  const walk = (nodes: TreeNode<T>[]) => {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) walk(node.children);
      if (node.__isDoiTuong) continue;
      const kids = childrenByCode.get(node.__ma);
      if (kids && kids.length > 0) {
        node.children = [...(node.children ?? []), ...kids];
        node.__isParent = true;
      }
    }
  };
  walk(tree);
}
```

- [ ] **Step 5: Chạy test — xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts`
Expected: PASS (gồm các test cũ + 2 test mới).

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts \
  fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts
git commit -m "feat(fe): attachDoiTuongChildren - gắn đối tượng làm node con cây TK

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: FE — services carry `doiTuongChiTiet`

**Files:**
- Modify: `fe/src/services/soCaiService.ts`
- Modify: `fe/src/services/balanceSheetService.ts`

- [ ] **Step 1: `soCaiService` — thêm field vào types**

Trong `fe/src/services/soCaiService.ts`, sửa interface `TrialBalanceEntry` (response BE, khoảng dòng 49):

```typescript
export interface TrialBalanceEntry {
  ma: string;
  ten: string;
  noDauKy: number;
  coDauKy: number;
  noPhatSinh: number;
  coPhatSinh: number;
  noCuoiKy: number;
  coCuoiKy: number;
  doiTuongChiTiet?: TrialBalanceEntry[];
}
```

Và interface `TrialBalance` (FE display, khoảng dòng 61):

```typescript
export interface TrialBalance {
  taiKhoan: string;
  tenTaiKhoan: string;
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
  doiTuongChiTiet?: TrialBalance[];
}
```

- [ ] **Step 2: `soCaiService.getTrialBalance` — map đối tượng**

Trong `fe/src/services/soCaiService.ts`, thay phần `return data.entries.map(...)` cuối `getTrialBalance` (khoảng dòng 180) bằng:

```typescript
    const mapEntry = (item: TrialBalanceEntry): TrialBalance => ({
      taiKhoan: item.ma,
      tenTaiKhoan: item.ten,
      soDuDauKyNo: item.noDauKy,
      soDuDauKyCo: item.coDauKy,
      phatSinhNo: item.noPhatSinh,
      phatSinhCo: item.coPhatSinh,
      soDuCuoiKyNo: item.noCuoiKy,
      soDuCuoiKyCo: item.coCuoiKy,
    });

    return data.entries.map((item) => ({
      ...mapEntry(item),
      doiTuongChiTiet: item.doiTuongChiTiet?.map(mapEntry),
    }));
```

- [ ] **Step 3: `balanceSheetService` — thêm field vào types**

Trong `fe/src/services/balanceSheetService.ts`, sửa interface `BalanceSheetEntryResponse` (khoảng dòng 5):

```typescript
interface DoiTuongSoTienResponse {
  ma: string;
  ten: string;
  soTien: number;
}

interface BalanceSheetEntryResponse {
  ma: string;
  ten: string;
  soTien: number;
  doiTuongChiTiet?: DoiTuongSoTienResponse[];
}
```

Và interface `BalanceSheetItem` (khoảng dòng 24):

```typescript
export interface BalanceSheetItem {
  ma: string;
  tenChiTieu: string;
  dauNam: number;
  cuoiKy: number;
  level: number;
  isSection?: boolean;
  isTotal?: boolean;
  doiTuongChiTiet?: DoiTuongSoTienResponse[];
}
```

- [ ] **Step 4: `mapEntriesToItems` — carry đối tượng**

Trong `fe/src/services/balanceSheetService.ts`, trong hàm `mapEntriesToItems`, sửa block đẩy từng account (khoảng dòng 74) để giữ `doiTuongChiTiet`:

```typescript
  // Individual accounts
  for (const entry of entries) {
    items.push({
      ma: entry.ma,
      tenChiTieu: `${entry.ma} - ${entry.ten}`,
      dauNam: 0, // BE chưa trả dauNam, mặc định 0
      cuoiKy: entry.soTien,
      level: 1,
      doiTuongChiTiet: entry.doiTuongChiTiet,
    });
  }
```

- [ ] **Step 5: Type-check FE — xác nhận build OK**

Run: `cd fe && npx tsc --noEmit`
Expected: exit code 0, không lỗi (baseline đã sạch — bất kỳ lỗi nào đều do thay đổi này).

- [ ] **Step 6: Commit**

```bash
git add fe/src/services/soCaiService.ts fe/src/services/balanceSheetService.ts
git commit -m "feat(fe): service mang doiTuongChiTiet cho cân đối TK + cân đối kế toán

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: FE — Tab 1 (Cân đối tài khoản) gắn đối tượng

**Files:**
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`

- [ ] **Step 1: Cập nhật import util**

Trong `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`, sửa dòng import `buildAccountTree` (dòng 45):

```typescript
import { buildAccountTree, collectParentKeys, attachDoiTuongChildren, type TreeNode } from './utils/buildAccountTree';
```

- [ ] **Step 2: Gắn đối tượng vào `trialBalanceTree`**

Thay `useMemo` `trialBalanceTree` (khoảng dòng 202-221) bằng:

```typescript
  const trialBalanceTree = useMemo(() => {
    const tree = buildAccountTree(
      tbState.trialBalance,
      accounts,
      (r) => r.taiKhoan,
      ['soDuDauKyNo', 'soDuDauKyCo', 'phatSinhNo', 'phatSinhCo', 'soDuCuoiKyNo', 'soDuCuoiKyCo'],
      (acc) => ({
        taiKhoan: acc.ma,
        tenTaiKhoan: acc.ten,
        soDuDauKyNo: 0,
        soDuDauKyCo: 0,
        phatSinhNo: 0,
        phatSinhCo: 0,
        soDuCuoiKyNo: 0,
        soDuCuoiKyCo: 0,
      }),
    );

    const childrenByCode = new Map<string, TreeNode<TrialBalance>[]>();
    for (const row of tbState.trialBalance) {
      if (!row.doiTuongChiTiet?.length) continue;
      const kids = row.doiTuongChiTiet.map((dt): TreeNode<TrialBalance> => ({
        ...dt,
        taiKhoan: '',
        tenTaiKhoan: dt.taiKhoan ? `${dt.taiKhoan} - ${dt.tenTaiKhoan}` : dt.tenTaiKhoan,
        __ma: `${row.taiKhoan}::${dt.taiKhoan || '__none__'}`,
        __isParent: false,
        __isDoiTuong: true,
        __rollup: {},
      }));
      childrenByCode.set(row.taiKhoan, kids);
    }
    attachDoiTuongChildren(tree, childrenByCode);

    return tree;
  }, [tbState.trialBalance, accounts]);
```

(`renderTrialAmount` **không cần đổi**: node TK có đối tượng nhưng không có TK con → `__rollup = 0` → hiển thị đúng giá trị riêng; node đối tượng `__isParent=false` → hiển thị giá trị của chính nó.)

- [ ] **Step 3: Build FE — xác nhận OK**

Run: `cd fe && npx tsc --noEmit && npm run build`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx
git commit -m "feat(fe): Tab Cân đối tài khoản xổ chi tiết theo đối tượng

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: FE — Tab 2 (Cân đối kế toán) gắn đối tượng

**Files:**
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`

- [ ] **Step 1: Gắn đối tượng trong `buildBsTree`**

Trong `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`, trong `buildBsTree` (khoảng dòng 223-269), tại nhánh xử lý leaves của mỗi section: sau khi dựng `const tree = buildAccountTree(leaves, ...)`, **thay** dòng `result.push(...tree);` (nằm trong nhánh `if (item.isSection)`) bằng block sau (block này tự kết thúc bằng `result.push(...tree);` nên chỉ còn đúng 1 lần push):

```typescript
          const bsChildrenByCode = new Map<string, TreeNode<BalanceSheetItem>[]>();
          for (const leaf of leaves) {
            if (!leaf.doiTuongChiTiet?.length) continue;
            const kids = leaf.doiTuongChiTiet.map((dt): TreeNode<BalanceSheetItem> => ({
              ma: '',
              tenChiTieu: dt.ma ? `${dt.ma} - ${dt.ten}` : dt.ten,
              dauNam: 0,
              cuoiKy: dt.soTien,
              level: 2,
              __ma: `${leaf.ma}::${dt.ma || '__none__'}`,
              __isParent: false,
              __isDoiTuong: true,
              __rollup: {},
            }));
            bsChildrenByCode.set(leaf.ma, kids);
          }
          attachDoiTuongChildren(tree, bsChildrenByCode);

          result.push(...tree);
```

- [ ] **Step 2: Build FE — xác nhận OK**

Run: `cd fe && npx tsc --noEmit && npm run build`
Expected: build thành công.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx
git commit -m "feat(fe): Tab Cân đối kế toán xổ chi tiết theo đối tượng

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Kiểm thử tổng thể + xác minh thủ công

**Files:** không sửa code (chỉ chạy lệnh + kiểm tra).

- [ ] **Step 1: Chạy toàn bộ test BE**

Run: `cd be && yarn test`
Expected: PASS toàn bộ (gồm các spec mới ở Task 1-3).

- [ ] **Step 2: Chạy toàn bộ test FE + lint**

Run: `cd fe && npx vitest run && npm run lint`
Expected: test PASS; lint không thêm lỗi mới.

- [ ] **Step 3: Build cả 2 phía**

Run: `cd be && yarn build` rồi `cd ../fe && npm run build`
Expected: cả hai build thành công.

- [ ] **Step 4: Xác minh thủ công (checklist)**

Khởi động BE (`cd be && yarn start:all:dev`) + FE (`cd fe && npm run dev`), mở `/bao-cao/tai-chinh`:

- Tab **Cân đối tài khoản**: TK có cấu hình "Chi tiết theo" (vd 131/331) có icon mở rộng; xổ ra từng đối tượng; Σ các đối tượng (+ "Chưa xác định đối tượng" nếu có) = số dư TK (đối chiếu cột phát sinh Nợ/Có). Nút "Mở tất cả"/"Thu gọn" áp dụng cả đối tượng. Dòng "Tổng cộng" vẫn cố định đáy, scroll trong bảng.
- Tab **Cân đối kế toán**: TK chi tiết (vd 131/331) xổ ra đối tượng; bố cục 2 card giữ nguyên. TK không `chiTietTheo` vẫn 1 dòng.
- TK **không** có `chiTietTheo`: không có icon mở rộng, giữ nguyên như cũ.

- [ ] **Step 5: Cập nhật tri thức dự án (nếu cần)**

Nếu phát hiện hành vi mới đáng lưu (vd cách `chiTietTheo` chảy qua report), cân nhắc dùng skill `db-update-knowledge`. Không bắt buộc.

---

## Notes / Edge cases (đọc trước khi code)

- **Netting đầu/cuối kỳ:** ở Cân đối tài khoản, cột **phát sinh** Nợ/Có cộng đúng (Σ đối tượng = TK). Cột **đầu kỳ / cuối kỳ** dùng `computeTrialRow` (net Nợ–Có) cho từng đối tượng, nên 1 đối tượng có thể nằm phía ngược với TK (vd KH trả thừa → dư Có trong TK 131 dư Nợ). Đây là đúng bản chất công nợ; Σ theo **net** vẫn khớp, Σ tách từng phía có thể lệch — không phải lỗi.
- **`Math.max(0, ...)` ở Cân đối kế toán:** account-level `calculateAccountBalance` clamp ≥ 0; account âm → `amount === 0` → không hiển thị → không gắn đối tượng (không lệch). Với account dương, Σ đối tượng (không clamp) = số dư account.
- **Route order voucher:** `aggregate-balance-by-doi-tuong` PHẢI đứng trước `@Get(':id')` nếu không sẽ bị nuốt bởi route động.
- **rowKey:** node đối tượng dùng `__ma = "{maTK}::{maĐT|__none__}"`, không trùng mã TK.
