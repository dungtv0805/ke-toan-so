# Sổ chi tiết — Multi-account & Column Chooser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users view several (or all) accounts' sổ chi tiết at once, each as its own stacked block, with a column chooser that surfaces every voucher `danhMuc` field and remembers the choice across visits.

**Architecture:** Backend builds many reports from a single data fetch (loop `buildSoChiTiet` per account code in memory, skip empties). Each voucher's `danhMuc` fields are surfaced per row. Frontend gets a multi-select account filter, renders one block per report, and a localStorage-backed column chooser controls which columns every block displays.

**Tech Stack:** NestJS + Jest (BE), React + Ant Design + Vite + Vitest (FE), TypeScript throughout.

---

## File Structure

**Backend**
- `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts` — add danhMuc fields to `SoChiTietRow`, populate them in `buildSoChiTiet`, add pure `buildSoChiTietMulti`.
- `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts` — extend tests.
- `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.service.ts` — parse codes/`all`, call `buildSoChiTietMulti`, return `{ reports }`.
- `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.controller.ts` — accept comma list / `all`.

**Frontend**
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.ts` (new) — `DisplayRow` type, column registry, `buildAntdColumns`, `buildDisplayRows`, `loadVisibleKeys`/`saveVisibleKeys`/`defaultVisibleKeys`.
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.test.ts` (new) — unit tests.
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/ColumnChooser.tsx` (new) — checkbox dropdown.
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/AccountReportBlock.tsx` (new) — renders one report.
- `fe/src/services/soChiTietTaiKhoanService.ts` — row fields + multi-account `getReport`.
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx` — multi-select + chooser + block list.

---

## Task 1: Surface danhMuc fields on each row (BE)

**Files:**
- Modify: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts`
- Test: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts`

- [ ] **Step 1: Write the failing test**

Add inside the `describe('buildSoChiTiet', ...)` block in `so-chi-tiet.helper.spec.ts`:

```ts
  it('điền các trường danhMuc lên dòng phát sinh', () => {
    const voucher = {
      soPhieu: 'PT01',
      ngay: new Date('2026-01-05') as any,
      soTien: 1000,
      noiDung: 'PT01',
      danhMuc: {
        taiKhoanNo: { ma: '111', ten: '111', loai: 'NO', nhom: '' },
        taiKhoanCo: { ma: '511', ten: '511', loai: 'CO', nhom: '' },
        doiTuong: { ma: 'KH01', ten: 'Khách 01', loai: 'KHACH_HANG' },
        khoanMuc: { ma: 'KM1', ten: 'Khoản mục 1', loai: 'CP', nhom: '' },
        duAn: { ma: 'DA1', ten: 'Dự án 1', trangThai: 'ACTIVE' },
        boPhan: { ma: 'BP1', ten: 'Bộ phận 1' },
        nhanVien: { ma: 'NV1', ten: 'Nhân viên 1' },
      },
    } as any;
    const r = buildSoChiTiet(account, relevant, [voucher], [], undefined, start, end);
    expect(r.rows[0].maDoiTuong).toBe('KH01');
    expect(r.rows[0].tenDoiTuong).toBe('Khách 01');
    expect(r.rows[0].maKhoanMuc).toBe('KM1');
    expect(r.rows[0].maDuAn).toBe('DA1');
    expect(r.rows[0].maBoPhan).toBe('BP1');
    expect(r.rows[0].maNhanVien).toBe('NV1');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && yarn test so-chi-tiet.helper`
Expected: FAIL — `maDoiTuong` is `undefined` (property not produced yet).

- [ ] **Step 3: Extend `SoChiTietRow` interface**

In `so-chi-tiet.helper.ts`, replace the `SoChiTietRow` interface (lines ~21-31) with:

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
  // Trường danhMuc (tùy chọn) phục vụ chọn cột hiển thị
  maDoiTuong?: string;
  tenDoiTuong?: string;
  maDoiTuong2?: string;
  tenDoiTuong2?: string;
  maKhoanMuc?: string;
  tenKhoanMuc?: string;
  maDuAn?: string;
  tenDuAn?: string;
  maBoPhan?: string;
  tenBoPhan?: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  maDoi?: string;
  tenDoi?: string;
  maSanPham?: string;
  tenSanPham?: string;
  maDongTien?: string;
  tenDongTien?: string;
  maLoaiGiaoDich?: string;
  tenLoaiGiaoDich?: string;
  maNghiepVu?: string;
  tenNghiepVu?: string;
}
```

- [ ] **Step 4: Populate the fields in `buildSoChiTiet`**

In `so-chi-tiet.helper.ts`, inside the `for (const v of periodVouchers)` loop, replace the `rows.push({ ... })` call (lines ~144-154) with:

```ts
      const dm = v.danhMuc;
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
        maDoiTuong: dm?.doiTuong?.ma,
        tenDoiTuong: dm?.doiTuong?.ten,
        maDoiTuong2: dm?.doiTuong2?.ma,
        tenDoiTuong2: dm?.doiTuong2?.ten,
        maKhoanMuc: dm?.khoanMuc?.ma,
        tenKhoanMuc: dm?.khoanMuc?.ten,
        maDuAn: dm?.duAn?.ma,
        tenDuAn: dm?.duAn?.ten,
        maBoPhan: dm?.boPhan?.ma,
        tenBoPhan: dm?.boPhan?.ten,
        maNhanVien: dm?.nhanVien?.ma,
        tenNhanVien: dm?.nhanVien?.ten,
        maDoi: dm?.doi?.ma,
        tenDoi: dm?.doi?.ten,
        maSanPham: dm?.sanPham?.ma,
        tenSanPham: dm?.sanPham?.ten,
        maDongTien: dm?.dongTien?.ma,
        tenDongTien: dm?.dongTien?.ten,
        maLoaiGiaoDich: dm?.loaiGiaoDich?.ma,
        tenLoaiGiaoDich: dm?.loaiGiaoDich?.ten,
        maNghiepVu: dm?.nghiepVu?.ma,
        tenNghiepVu: dm?.nghiepVu?.ten,
      });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd be && yarn test so-chi-tiet.helper`
Expected: PASS — all existing tests plus the new danhMuc test.

- [ ] **Step 6: Commit**

```bash
git add be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts
git commit -m "feat(so-chi-tiet): surface danhMuc fields on report rows"
```

---

## Task 2: Pure multi-account builder (BE)

**Files:**
- Modify: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts`
- Test: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts`

- [ ] **Step 1: Write the failing test**

Add a new top-level `describe` block at the end of `so-chi-tiet.helper.spec.ts`. It reuses the `v` voucher factory is local to the other describe, so define a fresh inline voucher here:

```ts
describe('buildSoChiTietMulti', () => {
  const accounts = [
    { ma: '111', ten: 'Tiền mặt', loai: 'NO' },
    { ma: '511', ten: 'Doanh thu', loai: 'CO' },
    { ma: '642', ten: 'Chi phí QLDN', loai: 'NO' },
  ];
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-01-31T23:59:59.999Z');
  const voucher = {
    soPhieu: 'PT01',
    ngay: new Date('2026-01-05') as any,
    soTien: 1000,
    noiDung: 'PT01',
    danhMuc: {
      taiKhoanNo: { ma: '111', ten: '111', loai: 'NO', nhom: '' },
      taiKhoanCo: { ma: '511', ten: '511', loai: 'CO', nhom: '' },
    },
  } as any;

  it('trả về một report cho mỗi mã TK có phát sinh', () => {
    const reports = buildSoChiTietMulti(
      ['111', '511'], accounts, [voucher], [], undefined, start, end,
    );
    expect(reports).toHaveLength(2);
    expect(reports.map((r) => r.taiKhoan.ma)).toEqual(['111', '511']);
  });

  it('bỏ qua TK không có số dư đầu kỳ và không phát sinh', () => {
    const reports = buildSoChiTietMulti(
      ['111', '642'], accounts, [voucher], [], undefined, start, end,
    );
    expect(reports.map((r) => r.taiKhoan.ma)).toEqual(['111']);
  });

  it('bỏ qua mã TK không tồn tại trong danh mục', () => {
    const reports = buildSoChiTietMulti(
      ['111', '999'], accounts, [voucher], [], undefined, start, end,
    );
    expect(reports.map((r) => r.taiKhoan.ma)).toEqual(['111']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd be && yarn test so-chi-tiet.helper`
Expected: FAIL — `buildSoChiTietMulti is not a function`.

- [ ] **Step 3: Implement `buildSoChiTietMulti`**

Append to `so-chi-tiet.helper.ts`:

```ts
/**
 * Build sổ chi tiết cho nhiều tài khoản từ một lần fetch dữ liệu.
 * - codes: danh sách mã TK cần dựng (đã resolve từ 'all' hoặc list).
 * - Bỏ qua mã không có trong danh mục, và TK rỗng (không số dư đầu kỳ, không phát sinh).
 */
export function buildSoChiTietMulti(
  codes: string[],
  accounts: Array<{ ma: string; ten: string; loai: string }>,
  vouchers: NhatKyChungEntry[],
  opening: OpeningRow[],
  maDoiTuong: string | undefined,
  startDate: Date,
  endDate: Date,
): SoChiTietReport[] {
  const reports: SoChiTietReport[] = [];
  for (const code of codes) {
    const account = accounts.find((a) => a.ma === code);
    if (!account) continue;
    const relevantCodes = computeRelevantCodes(accounts, code);
    const report = buildSoChiTiet(
      { ma: account.ma, ten: account.ten, loai: account.loai },
      relevantCodes,
      vouchers,
      opening,
      maDoiTuong,
      startDate,
      endDate,
    );
    const isEmpty =
      report.rows.length === 0 &&
      report.soDuDauKyNo === 0 &&
      report.soDuDauKyCo === 0;
    if (isEmpty) continue;
    reports.push(report);
  }
  return reports;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd be && yarn test so-chi-tiet.helper`
Expected: PASS — all `buildSoChiTietMulti` tests green.

- [ ] **Step 5: Commit**

```bash
git add be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts
git commit -m "feat(so-chi-tiet): add pure buildSoChiTietMulti builder"
```

---

## Task 3: Wire service + controller for multi-account (BE)

**Files:**
- Modify: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.service.ts`
- Modify: `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.controller.ts`

This task is integration wiring (depends on injected `ServiceClient`); it is verified by the build + a manual curl in Step 4, not a new unit test.

- [ ] **Step 1: Rewrite the service method**

Replace the body of `getSoChiTiet` in `so-chi-tiet.service.ts` (the whole method, lines ~14-73) with the version below. Note the signature changes its first parameter to `maTaiKhoanParam: string` and the return type to `{ reports: SoChiTietReport[] }`. Update the import line at the top to include `buildSoChiTietMulti`:

```ts
import {
  buildSoChiTietMulti,
  type SoChiTietReport,
  type OpeningRow,
} from './so-chi-tiet.helper';
```

```ts
  async getSoChiTiet(
    maTaiKhoanParam: string,
    maDoiTuong: string | undefined,
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<{ reports: SoChiTietReport[] }> {
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

    // Resolve mã TK cần dựng: 'all' = mọi TK; ngược lại tách theo dấu phẩy.
    const codes =
      maTaiKhoanParam === 'all'
        ? accounts.map((a) => a.ma)
        : maTaiKhoanParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    // Chuẩn hoá endDate về cuối ngày để bao trùm trọn ngày kết thúc.
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const reports = buildSoChiTietMulti(
      codes,
      accounts,
      vouchers,
      opening,
      maDoiTuong,
      startDate,
      end,
    );

    // Gắn thông tin đối tượng khi có lọc theo đối tượng.
    if (maDoiTuong) {
      const dt = doiTuongs.find((d) => d.ma === maDoiTuong);
      if (dt) {
        for (const report of reports) {
          report.doiTuong = { ma: dt.ma, ten: dt.ten };
        }
      }
    }

    return { reports };
  }
```

- [ ] **Step 2: Update the controller**

In `so-chi-tiet.controller.ts`, the `maTaiKhoan` query param now carries a comma list or `all`. The method already forwards `maTaiKhoan` to the service — only the return passthrough needs no change (service returns `{ reports }`, controller wraps in `{ success, data }`). Replace the `getSoChiTiet` method body's service call + return (lines ~25-32) with:

```ts
    const data = await this.soChiTietService.getSoChiTiet(
      maTaiKhoan,
      maDoiTuong || undefined,
      start,
      end,
      authToken,
    );
    return { success: true, data };
```

(No structural change is required here beyond confirming `maTaiKhoan` is passed straight through; keep the existing `@Query('maTaiKhoan') maTaiKhoan: string` and date defaulting.)

- [ ] **Step 3: Build the service to verify types**

Run: `cd be && yarn build reporting-service`
Expected: builds with no TypeScript errors.

- [ ] **Step 4: Manual smoke check (optional, if services running)**

Run (replace `$TOKEN`):
```bash
curl -s "http://localhost:3000/api/reporting/so-chi-tiet-tai-khoan?maTaiKhoan=111,511&startDate=2026-01-01&endDate=2026-01-31" \
  -H "authorization: Bearer $TOKEN" | head -c 400
```
Expected: JSON `{"success":true,"data":{"reports":[ ... ]}}` with one entry per account that has activity.

- [ ] **Step 5: Commit**

```bash
git add be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.service.ts be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.controller.ts
git commit -m "feat(so-chi-tiet): multi-account endpoint returns reports[]"
```

---

## Task 4: Column registry + storage helpers (FE)

**Files:**
- Create: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.ts`
- Test: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `columnRegistry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  REGISTRY,
  defaultVisibleKeys,
  loadVisibleKeys,
  saveVisibleKeys,
} from './columnRegistry';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, val: string) => void map.set(k, val),
  };
}

describe('columnRegistry', () => {
  it('default visible = đúng 9 cột gốc', () => {
    expect(defaultVisibleKeys()).toEqual([
      'ngay', 'soPhieu', 'ngayChungTu', 'noiDung', 'tkDoiUng',
      'phatSinhNo', 'phatSinhCo', 'soDuNo', 'soDuCo',
    ]);
  });

  it('mọi key trong registry là duy nhất', () => {
    const keys = REGISTRY.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('lưu rồi đọc lại trả về đúng tập key', () => {
    const store = memoryStorage();
    saveVisibleKeys(['ngay', 'noiDung', 'maDoiTuong'], store);
    expect(loadVisibleKeys(store)).toEqual(['ngay', 'noiDung', 'maDoiTuong']);
  });

  it('không có dữ liệu lưu → trả về default', () => {
    const store = memoryStorage();
    expect(loadVisibleKeys(store)).toEqual(defaultVisibleKeys());
  });

  it('dữ liệu lưu hỏng → trả về default', () => {
    const store = memoryStorage();
    store.setItem('sct-visible-columns', '{not json');
    expect(loadVisibleKeys(store)).toEqual(defaultVisibleKeys());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.test.ts`
Expected: FAIL — cannot resolve `./columnRegistry`.

- [ ] **Step 3: Create `columnRegistry.ts`**

```ts
import React from 'react';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { SoChiTietReport } from '@/services/soChiTietTaiKhoanService';

const STORAGE_KEY = 'sct-visible-columns';

export type Kind = 'opening' | 'entry' | 'cong' | 'cuoi';

export interface DisplayRow {
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
  maDoiTuong?: string;
  tenDoiTuong?: string;
  maDoiTuong2?: string;
  tenDoiTuong2?: string;
  maKhoanMuc?: string;
  tenKhoanMuc?: string;
  maDuAn?: string;
  tenDuAn?: string;
  maBoPhan?: string;
  tenBoPhan?: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  maDoi?: string;
  tenDoi?: string;
  maSanPham?: string;
  tenSanPham?: string;
  maDongTien?: string;
  tenDongTien?: string;
  maLoaiGiaoDich?: string;
  tenLoaiGiaoDich?: string;
  maNghiepVu?: string;
  tenNghiepVu?: string;
}

export type ChooserGroup =
  | 'Cơ bản'
  | 'Chứng từ'
  | 'Số phát sinh'
  | 'Số dư'
  | 'Đối tượng'
  | 'Phân loại'
  | 'Khác';

export interface ColumnDef {
  key: string;
  title: string;
  dataIndex: string;
  group: ChooserGroup; // nhóm trong bộ chọn cột
  parentHeader?: 'Chứng từ' | 'Số phát sinh' | 'Số dư'; // header gộp trên bảng
  width?: number;
  align?: 'left' | 'right' | 'center';
  ellipsis?: boolean;
  render?: (value: unknown, row: DisplayRow) => React.ReactNode;
  defaultVisible: boolean;
}

const fmt = (v?: number) =>
  v && v !== 0
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(v)
    : '';

const amount = (value: unknown) => fmt(value as number | undefined);

export const REGISTRY: ColumnDef[] = [
  { key: 'ngay', title: 'Ngày ghi sổ', dataIndex: 'ngay', group: 'Cơ bản', width: 110, defaultVisible: true },
  { key: 'soPhieu', title: 'Số hiệu', dataIndex: 'soPhieu', group: 'Chứng từ', parentHeader: 'Chứng từ', width: 110, defaultVisible: true },
  { key: 'ngayChungTu', title: 'Ngày tháng', dataIndex: 'ngayChungTu', group: 'Chứng từ', parentHeader: 'Chứng từ', width: 110, defaultVisible: true },
  { key: 'noiDung', title: 'Diễn giải', dataIndex: 'noiDung', group: 'Cơ bản', ellipsis: true, defaultVisible: true },
  { key: 'tkDoiUng', title: 'TK đối ứng', dataIndex: 'tkDoiUng', group: 'Cơ bản', width: 110, align: 'center', defaultVisible: true },

  { key: 'maDoiTuong', title: 'Mã đối tượng', dataIndex: 'maDoiTuong', group: 'Đối tượng', width: 130, defaultVisible: false },
  { key: 'tenDoiTuong', title: 'Tên đối tượng', dataIndex: 'tenDoiTuong', group: 'Đối tượng', width: 180, defaultVisible: false },
  { key: 'maDoiTuong2', title: 'Mã ĐT2', dataIndex: 'maDoiTuong2', group: 'Đối tượng', width: 130, defaultVisible: false },
  { key: 'tenDoiTuong2', title: 'Tên ĐT2', dataIndex: 'tenDoiTuong2', group: 'Đối tượng', width: 180, defaultVisible: false },

  { key: 'maKhoanMuc', title: 'Mã khoản mục', dataIndex: 'maKhoanMuc', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenKhoanMuc', title: 'Tên khoản mục', dataIndex: 'tenKhoanMuc', group: 'Phân loại', width: 180, defaultVisible: false },
  { key: 'maDuAn', title: 'Mã dự án', dataIndex: 'maDuAn', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenDuAn', title: 'Tên dự án', dataIndex: 'tenDuAn', group: 'Phân loại', width: 180, defaultVisible: false },
  { key: 'maBoPhan', title: 'Mã bộ phận', dataIndex: 'maBoPhan', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenBoPhan', title: 'Tên bộ phận', dataIndex: 'tenBoPhan', group: 'Phân loại', width: 180, defaultVisible: false },
  { key: 'maNhanVien', title: 'Mã nhân viên', dataIndex: 'maNhanVien', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenNhanVien', title: 'Tên nhân viên', dataIndex: 'tenNhanVien', group: 'Phân loại', width: 180, defaultVisible: false },
  { key: 'maDoi', title: 'Mã đội', dataIndex: 'maDoi', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenDoi', title: 'Tên đội', dataIndex: 'tenDoi', group: 'Phân loại', width: 180, defaultVisible: false },

  { key: 'maSanPham', title: 'Mã sản phẩm', dataIndex: 'maSanPham', group: 'Khác', width: 130, defaultVisible: false },
  { key: 'tenSanPham', title: 'Tên sản phẩm', dataIndex: 'tenSanPham', group: 'Khác', width: 180, defaultVisible: false },
  { key: 'maDongTien', title: 'Mã dòng tiền', dataIndex: 'maDongTien', group: 'Khác', width: 130, defaultVisible: false },
  { key: 'tenDongTien', title: 'Tên dòng tiền', dataIndex: 'tenDongTien', group: 'Khác', width: 180, defaultVisible: false },
  { key: 'maLoaiGiaoDich', title: 'Mã loại GD', dataIndex: 'maLoaiGiaoDich', group: 'Khác', width: 130, defaultVisible: false },
  { key: 'tenLoaiGiaoDich', title: 'Tên loại GD', dataIndex: 'tenLoaiGiaoDich', group: 'Khác', width: 180, defaultVisible: false },
  { key: 'maNghiepVu', title: 'Mã nghiệp vụ', dataIndex: 'maNghiepVu', group: 'Khác', width: 130, defaultVisible: false },
  { key: 'tenNghiepVu', title: 'Tên nghiệp vụ', dataIndex: 'tenNghiepVu', group: 'Khác', width: 180, defaultVisible: false },

  { key: 'phatSinhNo', title: 'Nợ', dataIndex: 'phatSinhNo', group: 'Số phát sinh', parentHeader: 'Số phát sinh', width: 140, align: 'right', render: amount, defaultVisible: true },
  { key: 'phatSinhCo', title: 'Có', dataIndex: 'phatSinhCo', group: 'Số phát sinh', parentHeader: 'Số phát sinh', width: 140, align: 'right', render: amount, defaultVisible: true },
  { key: 'soDuNo', title: 'Nợ', dataIndex: 'soDuNo', group: 'Số dư', parentHeader: 'Số dư', width: 140, align: 'right', render: amount, defaultVisible: true },
  { key: 'soDuCo', title: 'Có', dataIndex: 'soDuCo', group: 'Số dư', parentHeader: 'Số dư', width: 140, align: 'right', render: amount, defaultVisible: true },
];

export function defaultVisibleKeys(): string[] {
  return REGISTRY.filter((c) => c.defaultVisible).map((c) => c.key);
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const browserStorage = (): StorageLike | undefined =>
  typeof localStorage !== 'undefined' ? localStorage : undefined;

export function loadVisibleKeys(storage: StorageLike | undefined = browserStorage()): string[] {
  if (!storage) return defaultVisibleKeys();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultVisibleKeys();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((k) => typeof k !== 'string')) {
      return defaultVisibleKeys();
    }
    // Chỉ giữ key còn tồn tại trong registry.
    const known = new Set(REGISTRY.map((c) => c.key));
    const filtered = parsed.filter((k: string) => known.has(k));
    return filtered.length ? filtered : defaultVisibleKeys();
  } catch {
    return defaultVisibleKeys();
  }
}

export function saveVisibleKeys(
  keys: string[],
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

function leafColumn(c: ColumnDef): ColumnType<DisplayRow> {
  return {
    title: c.title,
    dataIndex: c.dataIndex,
    width: c.width,
    align: c.align,
    ellipsis: c.ellipsis,
    render: c.render,
  };
}

/**
 * Dựng cột Antd từ tập key đang bật, theo đúng thứ tự REGISTRY.
 * Các cột liền kề cùng parentHeader được gộp dưới một header cha.
 */
export function buildAntdColumns(visibleKeys: string[]): ColumnsType<DisplayRow> {
  const visible = REGISTRY.filter((c) => visibleKeys.includes(c.key));
  const cols: ColumnsType<DisplayRow> = [];
  let i = 0;
  while (i < visible.length) {
    const c = visible[i];
    if (!c.parentHeader) {
      cols.push(leafColumn(c));
      i += 1;
      continue;
    }
    const header = c.parentHeader;
    const children: ColumnsType<DisplayRow> = [];
    while (i < visible.length && visible[i].parentHeader === header) {
      children.push(leafColumn(visible[i]));
      i += 1;
    }
    cols.push({ title: header, children });
  }
  return cols;
}

/** Dựng các dòng hiển thị (đầu kỳ / phát sinh / cộng / cuối kỳ) cho một report. */
export function buildDisplayRows(report: SoChiTietReport): DisplayRow[] {
  const rows: DisplayRow[] = [];
  rows.push({
    key: 'opening', kind: 'opening', noiDung: 'Số dư đầu kỳ',
    soDuNo: report.soDuDauKyNo, soDuCo: report.soDuDauKyCo,
  });
  report.rows.forEach((r, i) => {
    rows.push({
      ...r,
      key: `e${i}`,
      kind: 'entry',
      ngay: dayjs(r.ngay).format('DD/MM/YYYY'),
      ngayChungTu: dayjs(r.ngayChungTu).format('DD/MM/YYYY'),
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
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.ts fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.test.ts
git commit -m "feat(so-chi-tiet): column registry + visible-column storage helpers"
```

---

## Task 5: Update FE service for multi-account (FE)

**Files:**
- Modify: `fe/src/services/soChiTietTaiKhoanService.ts`

This is a typed API-shape change verified by the FE typecheck/build; no new unit test.

- [ ] **Step 1: Add the danhMuc fields to `SoChiTietRow`**

In `soChiTietTaiKhoanService.ts`, replace the `SoChiTietRow` interface (lines 3-13) with:

```ts
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
  maDoiTuong?: string;
  tenDoiTuong?: string;
  maDoiTuong2?: string;
  tenDoiTuong2?: string;
  maKhoanMuc?: string;
  tenKhoanMuc?: string;
  maDuAn?: string;
  tenDuAn?: string;
  maBoPhan?: string;
  tenBoPhan?: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  maDoi?: string;
  tenDoi?: string;
  maSanPham?: string;
  tenSanPham?: string;
  maDongTien?: string;
  tenDongTien?: string;
  maLoaiGiaoDich?: string;
  tenLoaiGiaoDich?: string;
  maNghiepVu?: string;
  tenNghiepVu?: string;
}
```

- [ ] **Step 2: Rewrite `getReport` to accept multiple accounts and return an array**

Replace the `class SoChiTietTaiKhoanService` body (lines 27-49) with:

```ts
class SoChiTietTaiKhoanService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/so-chi-tiet-tai-khoan' });
  }

  async getReport(
    maTaiKhoans: string[] | 'all',
    startDate: Date,
    endDate: Date,
    maDoiTuong?: string,
  ): Promise<SoChiTietReport[]> {
    const params: Record<string, string> = {
      maTaiKhoan: maTaiKhoans === 'all' ? 'all' : maTaiKhoans.join(','),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    if (maDoiTuong) params.maDoiTuong = maDoiTuong;

    const data = await this.get<{ reports: SoChiTietReport[] }>({ params });
    return data?.reports ?? [];
  }
}
```

- [ ] **Step 3: Typecheck the FE**

Run: `cd fe && npx tsc --noEmit`
Expected: errors ONLY in `SoChiTietTaiKhoanPage.tsx` (it still calls the old single-account API — fixed in Task 8). No errors in the service file itself.

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/soChiTietTaiKhoanService.ts
git commit -m "feat(so-chi-tiet): service getReport supports multi-account, returns reports[]"
```

---

## Task 6: ColumnChooser component (FE)

**Files:**
- Create: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/ColumnChooser.tsx`

UI component verified by build + manual check in the final task.

- [ ] **Step 1: Create `ColumnChooser.tsx`**

```tsx
import React, { useMemo } from 'react';
import { Button, Dropdown, Checkbox, Space, Divider } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { REGISTRY, defaultVisibleKeys, type ChooserGroup } from './columnRegistry';

const GROUP_ORDER: ChooserGroup[] = [
  'Cơ bản', 'Chứng từ', 'Số phát sinh', 'Số dư', 'Đối tượng', 'Phân loại', 'Khác',
];

interface Props {
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
}

const ColumnChooser: React.FC<Props> = ({ visibleKeys, onChange }) => {
  const visibleSet = useMemo(() => new Set(visibleKeys), [visibleKeys]);

  const toggle = (key: string, checked: boolean) => {
    // Giữ thứ tự theo REGISTRY để cột luôn hiển thị đúng vị trí.
    const next = REGISTRY.filter((c) =>
      c.key === key ? checked : visibleSet.has(c.key),
    ).map((c) => c.key);
    onChange(next);
  };

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({
        group: g,
        items: REGISTRY.filter((c) => c.group === g),
      })).filter((s) => s.items.length > 0),
    [],
  );

  const panel = (
    <div
      style={{
        background: '#fff', padding: 12, borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxHeight: 420,
        overflowY: 'auto', minWidth: 220,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Button size="small" type="link" onClick={() => onChange(REGISTRY.map((c) => c.key))}>
          Chọn tất cả
        </Button>
        <Button size="small" type="link" onClick={() => onChange(defaultVisibleKeys())}>
          Mặc định
        </Button>
      </div>
      {grouped.map(({ group, items }) => (
        <div key={group}>
          <Divider style={{ margin: '6px 0' }} orientation="left" plain>
            {group}
          </Divider>
          <Space direction="vertical" size={2}>
            {items.map((c) => (
              <Checkbox
                key={c.key}
                checked={visibleSet.has(c.key)}
                onChange={(e) => toggle(c.key, e.target.checked)}
              >
                {c.title}
              </Checkbox>
            ))}
          </Space>
        </div>
      ))}
    </div>
  );

  return (
    <Dropdown trigger={['click']} dropdownRender={() => panel}>
      <Button icon={<SettingOutlined />}>Chọn cột</Button>
    </Dropdown>
  );
};

export default ColumnChooser;
```

- [ ] **Step 2: Typecheck**

Run: `cd fe && npx tsc --noEmit`
Expected: no new errors in `ColumnChooser.tsx` (remaining errors only in `SoChiTietTaiKhoanPage.tsx`).

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/ColumnChooser.tsx
git commit -m "feat(so-chi-tiet): column chooser dropdown"
```

---

## Task 7: AccountReportBlock component (FE)

**Files:**
- Create: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/AccountReportBlock.tsx`

- [ ] **Step 1: Create `AccountReportBlock.tsx`**

```tsx
import React, { useMemo } from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SoChiTietReport } from '@/services/soChiTietTaiKhoanService';
import { buildDisplayRows, type DisplayRow } from './columnRegistry';

const { Text } = Typography;

interface Props {
  report: SoChiTietReport;
  columns: ColumnsType<DisplayRow>;
  scrollX: number;
}

const AccountReportBlock: React.FC<Props> = ({ report, columns, scrollX }) => {
  const dataSource = useMemo(() => buildDisplayRows(report), [report]);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 8 }}>
        <div>
          Tài khoản:{' '}
          <Text strong>
            {report.taiKhoan.ma} - {report.taiKhoan.ten}
          </Text>
        </div>
        {report.doiTuong && (
          <div>
            Đối tượng:{' '}
            <Text strong>
              {report.doiTuong.ma} - {report.doiTuong.ten}
            </Text>
          </div>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: scrollX }}
        rowClassName={(r) => (r.kind === 'entry' ? '' : 'sct-summary-row')}
      />
    </div>
  );
};

export default AccountReportBlock;
```

- [ ] **Step 2: Typecheck**

Run: `cd fe && npx tsc --noEmit`
Expected: no new errors in `AccountReportBlock.tsx`.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/AccountReportBlock.tsx
git commit -m "feat(so-chi-tiet): per-account report block component"
```

---

## Task 8: Rewire the page — multi-select + chooser + block list (FE)

**Files:**
- Modify: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx`

- [ ] **Step 1: Replace the page file**

Replace the entire contents of `SoChiTietTaiKhoanPage.tsx` with:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Button, Space, Select, DatePicker, Breadcrumb, Empty, message,
} from 'antd';
import { ReloadOutlined, HomeOutlined, AccountBookOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  soChiTietTaiKhoanService, SoChiTietReport,
} from '@/services/soChiTietTaiKhoanService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { doiTuongService } from '@/services/doiTuongService';
import {
  buildAntdColumns, loadVisibleKeys, saveVisibleKeys,
} from './columnRegistry';
import ColumnChooser from './ColumnChooser';
import AccountReportBlock from './AccountReportBlock';

const { RangePicker } = DatePicker;

const SoChiTietTaiKhoanPage: React.FC = () => {
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
  const [doiTuongOptions, setDoiTuongOptions] = useState<{ value: string; label: string }[]>([]);
  const [maTaiKhoans, setMaTaiKhoans] = useState<string[]>([]);
  const [maDoiTuong, setMaDoiTuong] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [reports, setReports] = useState<SoChiTietReport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => loadVisibleKeys());

  useEffect(() => {
    (async () => {
      try {
        const [accs, dts] = await Promise.all([
          taiKhoanService.getAll(),
          doiTuongService.getAll(),
        ]);
        setAccountOptions(accs.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })));
        setDoiTuongOptions(dts.map((d) => ({ value: d.ma, label: `${d.ma} - ${d.ten}` })));
      } catch (error) {
        console.error('Error loading danh mục:', error);
        message.error('Không tải được danh mục tài khoản / đối tượng');
      }
    })();
  }, []);

  const onChangeVisible = (keys: string[]) => {
    setVisibleKeys(keys);
    saveVisibleKeys(keys);
  };

  const columns = useMemo(() => buildAntdColumns(visibleKeys), [visibleKeys]);
  const scrollX = useMemo(
    () => Math.max(1100, visibleKeys.length * 130),
    [visibleKeys],
  );

  const allSelected =
    accountOptions.length > 0 && maTaiKhoans.length === accountOptions.length;

  const loadReport = async () => {
    if (maTaiKhoans.length === 0 || !range) return;
    setLoading(true);
    try {
      const data = await soChiTietTaiKhoanService.getReport(
        allSelected ? 'all' : maTaiKhoans,
        range[0].startOf('day').toDate(),
        range[1].endOf('day').toDate(),
        maDoiTuong,
      );
      setReports(data);
    } catch (error) {
      console.error('Error loading sổ chi tiết:', error);
      message.error('Không tải được sổ chi tiết tài khoản');
    } finally {
      setLoading(false);
    }
  };

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
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadReport}
            disabled={maTaiKhoans.length === 0}
          >
            Làm mới
          </Button>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <RangePicker
            value={range}
            format="DD/MM/YYYY"
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
            allowClear={false}
          />
          <Select
            mode="multiple"
            showSearch
            placeholder="Chọn tài khoản (bắt buộc)"
            style={{ minWidth: 320, maxWidth: 520 }}
            options={accountOptions}
            value={maTaiKhoans}
            onChange={setMaTaiKhoans}
            maxTagCount="responsive"
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <Button onClick={() => setMaTaiKhoans(accountOptions.map((o) => o.value))}>
            Chọn tất cả
          </Button>
          <Select
            showSearch allowClear placeholder="Đối tượng (tùy chọn)"
            style={{ width: 280 }} options={doiTuongOptions}
            value={maDoiTuong} onChange={setMaDoiTuong}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <ColumnChooser visibleKeys={visibleKeys} onChange={onChangeVisible} />
          <Button type="primary" onClick={loadReport} disabled={maTaiKhoans.length === 0}>
            Xem
          </Button>
        </Space>

        {reports ? (
          reports.length === 0 ? (
            <Empty description="Không có dữ liệu cho tài khoản và kỳ đã chọn" />
          ) : (
            <>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
                SỔ CHI TIẾT TÀI KHOẢN
              </div>
              {reports.map((rep) => (
                <AccountReportBlock
                  key={rep.taiKhoan.ma}
                  report={rep}
                  columns={loading ? [] : columns}
                  scrollX={scrollX}
                />
              ))}
            </>
          )
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

Note: the `columns={loading ? [] : columns}` keeps the table from rendering stale columns during a fetch; the block-level `Table` has no per-block spinner, so a top-level note is acceptable. If you prefer a spinner, wrap the block list in `<Spin spinning={loading}>` instead — optional, not required.

- [ ] **Step 2: Typecheck the whole FE**

Run: `cd fe && npx tsc --noEmit`
Expected: PASS — no errors anywhere.

- [ ] **Step 3: Lint**

Run: `cd fe && npm run lint`
Expected: no new errors in the touched files.

- [ ] **Step 4: Run the full FE test suite**

Run: `cd fe && npm run test`
Expected: PASS — including `columnRegistry.test.ts`.

- [ ] **Step 5: Manual check (dev server)**

Run: `cd fe && npm run dev`, open the Sổ chi tiết tài khoản page. Verify:
- Multi-select accounts; "Chọn tất cả" selects every account.
- "Xem" renders one block per account with data; empty accounts absent.
- "Chọn cột" toggles columns (e.g. enable Tên đối tượng) — all blocks update; reload the page and the choice persists.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx
git commit -m "feat(so-chi-tiet): multi-account view + column chooser on page"
```

---

## Final verification

- [ ] BE tests: `cd be && yarn test so-chi-tiet`
- [ ] BE build: `cd be && yarn build reporting-service`
- [ ] FE typecheck: `cd fe && npx tsc --noEmit`
- [ ] FE tests: `cd fe && npm run test`
- [ ] FE lint: `cd fe && npm run lint`

All green → feature complete.
