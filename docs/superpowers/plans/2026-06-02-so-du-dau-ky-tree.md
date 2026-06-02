# Số dư đầu kỳ dạng cây — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị trang Số dư đầu kỳ dưới dạng cây tài khoản (cha tự sinh → con → đối tượng), cộng tổng cộng dồn, chỉ nhập ở phần tử con cùng nhất; mỗi dòng lá ghi đối tượng + ngân hàng song song.

**Architecture:** Giữ format lưu phẳng (1 dòng lá = 1 record `SoDuDauKy`); BE chỉ thêm field `nganHang` (text gõ tay). FE thêm helper thuần `buildSoDuTree` dựng cây + roll-up từ danh sách phẳng + chart, và viết lại `SoDuDauKyPage` dùng `Table` expandable. Reporting không đổi (`ServiceClient.getSoDuDauKy` vẫn gộp theo mã TK).

**Tech Stack:** NestJS + TypeORM (BE), React + TypeScript + Ant Design + vitest (FE).

---

## File Structure

**BE:**
- Modify `be/libs/entities/src/master-data/so-du-dau-ky.entity.ts` — field `nganHang`.
- Modify `be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts` — field `nganHang`.
- Modify `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts` — persist + return `nganHang`.

**FE:**
- Modify `fe/src/services/soDuDauKyService.ts` — `SoDuDauKyItem.nganHang?`.
- Modify `fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.ts` — `SoDuRow.nganHang?` + `validateRows` khoá trùng mới.
- Modify `fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.test.ts` — test khoá trùng mới.
- Create `fe/src/pages/danh-muc/so-du-dau-ky/buildSoDuTree.ts` — helper thuần dựng cây + roll-up.
- Create `fe/src/pages/danh-muc/so-du-dau-ky/buildSoDuTree.test.ts` — test helper.
- Modify `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx` — viết lại UI cây.

---

## Task 1: BE entity + DTO — thêm field `nganHang`

**Files:**
- Modify: `be/libs/entities/src/master-data/so-du-dau-ky.entity.ts`
- Modify: `be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts`

- [ ] **Step 1: Thêm cột `nganHang` vào entity**

Trong `so-du-dau-ky.entity.ts`, thêm ngay sau khối `chiTietTen`:

```typescript
  @Column({ nullable: true })
  chiTietTen?: string;

  @Column({ nullable: true })
  nganHang?: string;
}
```

- [ ] **Step 2: Thêm `nganHang` vào `SoDuDauKyItemDto`**

Trong `save-so-du-dau-ky.dto.ts`, thêm ngay sau field `chiTietTen` trong class `SoDuDauKyItemDto`:

```typescript
  @IsString()
  @IsOptional()
  chiTietTen?: string;

  @IsString()
  @IsOptional()
  nganHang?: string;
}
```

- [ ] **Step 3: Build kiểm tra**

Run: `cd be && yarn build:master-data`
Expected: build thành công, không lỗi TS.

- [ ] **Step 4: Commit**

```bash
git add be/libs/entities/src/master-data/so-du-dau-ky.entity.ts be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts
git commit -m "feat(be): them field nganHang cho SoDuDauKy"
```

---

## Task 2: BE service — lưu & trả `nganHang`

**Files:**
- Modify: `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts`

- [ ] **Step 1: Thêm `nganHang` vào type kết quả + map `getAll`**

Trong interface `SoDuDauKyResult`, thêm `nganHang?: string;` vào type item:

```typescript
  items: Array<{
    maTaiKhoan: string;
    duNo: number;
    duCo: number;
    chiTietType?: string;
    chiTietId?: string;
    chiTietMa?: string;
    chiTietTen?: string;
    nganHang?: string;
  }>;
```

Trong `getAll()`, thêm `nganHang` vào object map:

```typescript
    const items = records.map((r) => ({
      maTaiKhoan: r.maTaiKhoan,
      duNo: Number(r.duNo) || 0,
      duCo: Number(r.duCo) || 0,
      chiTietType: r.chiTietType,
      chiTietId: r.chiTietId,
      chiTietMa: r.chiTietMa,
      chiTietTen: r.chiTietTen,
      nganHang: r.nganHang,
    }));
```

- [ ] **Step 2: Lưu `nganHang` trong `saveBulk` + giữ dòng có đối tượng**

Trong `saveBulk()`, đổi `.filter(...)` và `.map(...)`:

```typescript
    // Giữ dòng có số dư khác 0 HOẶC có đối tượng (chiTietId)
    const toSave = dto.items
      .filter(
        (i) =>
          (Number(i.duNo) || 0) !== 0 ||
          (Number(i.duCo) || 0) !== 0 ||
          !!i.chiTietId,
      )
      .map((i) =>
        this.repo.create({
          maTaiKhoan: i.maTaiKhoan,
          duNo: Number(i.duNo) || 0,
          duCo: Number(i.duCo) || 0,
          chiTietType: i.chiTietType,
          chiTietId: i.chiTietId,
          chiTietMa: i.chiTietMa,
          chiTietTen: i.chiTietTen,
          nganHang: i.nganHang,
          ngayApDung,
          ...(tenantId ? { tenantId } : {}),
        }),
      );
```

- [ ] **Step 3: Build kiểm tra**

Run: `cd be && yarn build:master-data`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts
git commit -m "feat(be): so-du-dau-ky luu va tra nganHang"
```

---

## Task 3: FE types — `nganHang` trong service + `SoDuRow` + validate

**Files:**
- Modify: `fe/src/services/soDuDauKyService.ts`
- Modify: `fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.ts`
- Test: `fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.test.ts`

- [ ] **Step 1: Thêm `nganHang` vào `SoDuDauKyItem`**

Trong `soDuDauKyService.ts`, thêm field vào interface `SoDuDauKyItem`:

```typescript
export interface SoDuDauKyItem {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
  chiTietType?: string;
  chiTietId?: string;
  chiTietMa?: string;
  chiTietTen?: string;
  nganHang?: string;
}
```

- [ ] **Step 2: Thêm `nganHang` vào `SoDuRow` + cập nhật khoá trùng**

Trong `chiTietConfig.ts`, thêm `nganHang?: string;` vào interface `SoDuRow` (sau `chiTietTen`):

```typescript
export interface SoDuRow {
  key: string;
  maTaiKhoan: string;
  tenTaiKhoan: string;
  chiTietTheo?: ChiTietLoai;
  chiTietId?: string;
  chiTietMa?: string;
  chiTietTen?: string;
  nganHang?: string;
  duNo: number;
  duCo: number;
}
```

Trong `validateRows`, đổi `dupKey` để gồm cả `nganHang`:

```typescript
    const dupKey = `${r.maTaiKhoan}::${r.chiTietId ?? ''}::${r.nganHang ?? ''}`;
```

- [ ] **Step 3: Viết test khoá trùng mới (failing)**

Thêm vào cuối `chiTietConfig.test.ts` (trước dấu đóng cuối nếu có `describe`, hoặc thêm block mới):

```typescript
import { CHI_TIET_LABEL, validateRows, type SoDuRow } from './chiTietConfig';

describe('validateRows nganHang', () => {
  const row = (p: Partial<SoDuRow>): SoDuRow => ({
    key: Math.random().toString(),
    maTaiKhoan: '1111',
    tenTaiKhoan: 'TM',
    duNo: 0,
    duCo: 0,
    ...p,
  });

  it('cùng mã TK nhưng khác ngân hàng gõ tay → KHÔNG trùng', () => {
    const r = validateRows([
      row({ nganHang: 'VCB' }),
      row({ nganHang: 'ACB' }),
    ]);
    expect(r.ok).toBe(true);
  });

  it('cùng mã TK + cùng ngân hàng gõ tay → trùng', () => {
    const r = validateRows([
      row({ nganHang: 'VCB' }),
      row({ nganHang: 'VCB' }),
    ]);
    expect(r.ok).toBe(false);
  });
});
```

> Lưu ý: nếu file đã có `import { ... } from './chiTietConfig';` ở đầu thì KHÔNG thêm dòng import trùng — chỉ thêm `describe(...)`.

- [ ] **Step 4: Chạy test**

Run: `cd fe && yarn test chiTietConfig`
Expected: PASS (cả test cũ + mới).

- [ ] **Step 5: Commit**

```bash
git add fe/src/services/soDuDauKyService.ts fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.ts fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.test.ts
git commit -m "feat(fe): them nganHang vao SoDuRow + khoa trung gom nganHang"
```

---

## Task 4: FE helper `buildSoDuTree` (TDD)

**Files:**
- Create: `fe/src/pages/danh-muc/so-du-dau-ky/buildSoDuTree.ts`
- Test: `fe/src/pages/danh-muc/so-du-dau-ky/buildSoDuTree.test.ts`

- [ ] **Step 1: Viết test thất bại**

Tạo `buildSoDuTree.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildSoDuTree, collectExpandKeys } from './buildSoDuTree';
import type { SoDuRow } from './chiTietConfig';

const chart = [
  { ma: '1', ten: 'Tiền' },
  { ma: '11', ten: 'Tiền mặt' },
  { ma: '111', ten: 'Tiền mặt' },
  { ma: '1111', ten: 'TM VND' },
  { ma: '112', ten: 'Tiền gửi NH' },
  { ma: '1121', ten: 'TGNH VND' },
  { ma: '131', ten: 'Phải thu KH' },
];

const row = (p: Partial<SoDuRow>): SoDuRow => ({
  key: p.key ?? Math.random().toString(),
  maTaiKhoan: p.maTaiKhoan ?? '',
  tenTaiKhoan: '',
  duNo: 0,
  duCo: 0,
  ...p,
});

describe('buildSoDuTree', () => {
  it('TK lá thường → cây sinh cha tự động, lá nhập trực tiếp, roll-up lên cha', () => {
    const rows = [row({ key: 'a', maTaiKhoan: '1111', duNo: 100, duCo: 0 })];
    const tree = buildSoDuTree(rows, chart);

    expect(tree).toHaveLength(1);
    const n1 = tree[0];
    expect(n1.__ma).toBe('1');
    expect(n1.__isParent).toBe(true);
    expect(n1.__rollup.duNo).toBe(100);

    // 1 → 11 → 111 → 1111
    const n11 = n1.children![0];
    const n111 = n11.children![0];
    const n1111 = n111.children![0];
    expect(n1111.__ma).toBe('1111');
    expect(n1111.__isParent).toBe(false);
    expect(n1111.kind).toBe('account');
    expect(n1111.row?.key).toBe('a');
  });

  it('TK lá có đối tượng (ngân hàng) → node nhóm read-only, con là các đối tượng', () => {
    const rows = [
      row({ key: 'b1', maTaiKhoan: '1121', chiTietTheo: 'NGAN_HANG_QUY', chiTietId: 'vcb', duNo: 100 }),
      row({ key: 'b2', maTaiKhoan: '1121', chiTietTheo: 'NGAN_HANG_QUY', chiTietId: 'acb', duNo: 50 }),
    ];
    const tree = buildSoDuTree(rows, chart);

    // 1 → 112 → 1121 (nhóm) → 2 đối tượng
    const n1121 = tree[0].children![0].children![0];
    expect(n1121.__ma).toBe('1121');
    expect(n1121.__isParent).toBe(true);
    expect(n1121.chiTietTheo).toBe('NGAN_HANG_QUY');
    expect(n1121.__rollup.duNo).toBe(150);
    expect(n1121.children).toHaveLength(2);
    expect(n1121.children![0].kind).toBe('object');
    expect(n1121.children![0].__isParent).toBe(false);
  });

  it('nhiều TK con chung cha tự sinh', () => {
    const rows = [
      row({ key: 'c', maTaiKhoan: '1111', duNo: 10 }),
      row({ key: 'd', maTaiKhoan: '1121', chiTietTheo: 'NGAN_HANG_QUY', chiTietId: 'vcb', duNo: 20 }),
    ];
    const tree = buildSoDuTree(rows, chart);
    expect(tree).toHaveLength(1); // chung gốc '1'
    expect(tree[0].__ma).toBe('1');
    expect(tree[0].__rollup.duNo).toBe(30);
  });

  it('collectExpandKeys gom mọi node có con', () => {
    const rows = [row({ key: 'e', maTaiKhoan: '1111', duNo: 10 })];
    const tree = buildSoDuTree(rows, chart);
    const keys = collectExpandKeys(tree);
    // các node cha: 1, 11, 111 (1111 là lá → không có)
    expect(keys).toEqual(['acc:1', 'acc:11', 'acc:111']);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd fe && yarn test buildSoDuTree`
Expected: FAIL "Cannot find module './buildSoDuTree'".

- [ ] **Step 3: Viết implementation**

Tạo `buildSoDuTree.ts`:

```typescript
import type { ChiTietLoai, SoDuRow } from './chiTietConfig';

export interface SoDuTreeNode {
  __key: string;
  __ma: string;
  __isParent: boolean;
  __rollup: { duNo: number; duCo: number };
  ten: string;
  kind: 'account' | 'object';
  chiTietTheo?: ChiTietLoai;
  row?: SoDuRow;
  children?: SoDuTreeNode[];
}

export interface ChartAccount {
  ma: string;
  ten: string;
}

export function buildSoDuTree(
  rows: SoDuRow[],
  chart: ChartAccount[],
): SoDuTreeNode[] {
  const nameByMa = new Map<string, string>();
  for (const a of chart) nameByMa.set(a.ma, a.ten);

  // Nhóm rows theo mã TK
  const rowsByMa = new Map<string, SoDuRow[]>();
  for (const r of rows) {
    const arr = rowsByMa.get(r.maTaiKhoan) ?? [];
    arr.push(r);
    rowsByMa.set(r.maTaiKhoan, arr);
  }

  // Tập mã cần dựng = mã TK đã thêm + mọi tổ tiên (prefix có trong chart)
  const codeSet = new Set<string>();
  for (const code of rowsByMa.keys()) {
    codeSet.add(code);
    for (const a of chart) {
      if (a.ma !== code && code.startsWith(a.ma)) codeSet.add(a.ma);
    }
  }
  const codes = Array.from(codeSet).sort((a, b) => a.localeCompare(b));

  // Cha = prefix đúng dài nhất trong codeSet
  const parentOf = new Map<string, string | null>();
  for (const code of codes) {
    let best: string | null = null;
    for (const cand of codes) {
      if (cand !== code && code.startsWith(cand)) {
        if (best === null || cand.length > best.length) best = cand;
      }
    }
    parentOf.set(code, best);
  }
  const childrenOf = new Map<string, string[]>();
  for (const code of codes) {
    const p = parentOf.get(code) ?? null;
    if (p !== null) {
      const arr = childrenOf.get(p) ?? [];
      arr.push(code);
      childrenOf.set(p, arr);
    }
  }

  const objectLeaf = (r: SoDuRow): SoDuTreeNode => ({
    __key: r.key,
    __ma: r.maTaiKhoan,
    __isParent: false,
    __rollup: { duNo: 0, duCo: 0 },
    ten: '',
    kind: 'object',
    chiTietTheo: r.chiTietTheo,
    row: r,
  });

  const sumLeaves = (node: SoDuTreeNode): { duNo: number; duCo: number } => {
    const acc = { duNo: 0, duCo: 0 };
    const walk = (n: SoDuTreeNode) => {
      if (n.row) {
        acc.duNo += n.row.duNo || 0;
        acc.duCo += n.row.duCo || 0;
      }
      for (const c of n.children ?? []) walk(c);
    };
    for (const c of node.children ?? []) walk(c);
    return acc;
  };

  const buildAccount = (code: string): SoDuTreeNode => {
    const accRows = rowsByMa.get(code) ?? [];
    const hasChildCodes = (childrenOf.get(code) ?? []).length > 0;
    const isLeafAccount = !hasChildCodes && accRows.length > 0;
    const isDetail = isLeafAccount && accRows.some((r) => !!r.chiTietTheo);

    let children: SoDuTreeNode[] = [];
    let row: SoDuRow | undefined;
    let chiTietTheo: ChiTietLoai | undefined;

    if (isDetail) {
      children = accRows.map(objectLeaf);
      chiTietTheo = accRows.find((r) => r.chiTietTheo)?.chiTietTheo;
    } else if (isLeafAccount) {
      row = accRows[0];
    } else {
      children = (childrenOf.get(code) ?? [])
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map(buildAccount);
    }

    const isParent = children.length > 0;
    const node: SoDuTreeNode = {
      __key: `acc:${code}`,
      __ma: code,
      __isParent: isParent,
      __rollup: { duNo: 0, duCo: 0 },
      ten: nameByMa.get(code) ?? '',
      kind: 'account',
      chiTietTheo,
      row,
      children: isParent ? children : undefined,
    };
    node.__rollup = sumLeaves(node);
    return node;
  };

  return codes
    .filter((c) => (parentOf.get(c) ?? null) === null)
    .sort((a, b) => a.localeCompare(b))
    .map(buildAccount);
}

export function collectExpandKeys(nodes: SoDuTreeNode[]): string[] {
  const keys: string[] = [];
  const walk = (ns: SoDuTreeNode[]) => {
    for (const n of ns) {
      if (n.children && n.children.length > 0) {
        keys.push(n.__key);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return keys;
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cd fe && yarn test buildSoDuTree`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/danh-muc/so-du-dau-ky/buildSoDuTree.ts fe/src/pages/danh-muc/so-du-dau-ky/buildSoDuTree.test.ts
git commit -m "feat(fe): helper buildSoDuTree dung cay so du dau ky + test"
```

---

## Task 5: FE — viết lại `SoDuDauKyPage.tsx` dạng cây

**Files:**
- Modify (ghi đè toàn bộ): `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx`

- [ ] **Step 1: Thay toàn bộ nội dung file**

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Table, Button, InputNumber, DatePicker, Select, Input, Space,
  Typography, Breadcrumb, message, Alert, Popconfirm,
} from 'antd';
import { HomeOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { taiKhoanService } from '@/services/taiKhoanService';
import { soDuDauKyService } from '@/services/soDuDauKyService';
import { doiTuongService } from '@/services/doiTuongService';
import { nganHangService } from '@/services/nganHangService';
import { usePagePermission } from '@/hooks/usePagePermission';
import {
  CHI_TIET_LABEL, DOI_TUONG_LOAI, validateRows,
  type ChiTietLoai, type SoDuRow,
} from './chiTietConfig';
import { buildSoDuTree, collectExpandKeys, type SoDuTreeNode } from './buildSoDuTree';

const { Text } = Typography;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

interface DoiTuongOption { value: string; label: string; ma: string; ten: string; }
interface LeafAccount { ma: string; ten: string; chiTietTheo?: ChiTietLoai; }

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}-${Date.now()}`;

const SoDuDauKyPage: React.FC = () => {
  const { canEdit } = usePagePermission('/danh-muc/so-du-dau-ky');
  const [rows, setRows] = useState<SoDuRow[]>([]);
  const [leafAccounts, setLeafAccounts] = useState<LeafAccount[]>([]);
  const [chart, setChart] = useState<{ ma: string; ten: string }[]>([]);
  const [ngayApDung, setNgayApDung] = useState<Dayjs>(dayjs().startOf('year'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optCache, setOptCache] = useState<Record<string, DoiTuongOption[]>>({});
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const leafMap = useMemo(() => {
    const m = new Map<string, LeafAccount>();
    leafAccounts.forEach((a) => m.set(a.ma, a));
    return m;
  }, [leafAccounts]);

  const loadOptions = useCallback(
    async (loai: ChiTietLoai): Promise<DoiTuongOption[]> => {
      if (optCache[loai]) return optCache[loai];
      let opts: DoiTuongOption[] = [];
      if (loai === 'NGAN_HANG_QUY') {
        const list = await nganHangService.getAll();
        opts = list.map((n) => ({
          value: n.id, label: `${n.ma} - ${n.ten}`, ma: n.ma, ten: n.ten,
        }));
      } else {
        const dtLoai = DOI_TUONG_LOAI[loai] as
          'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU';
        const list = await doiTuongService.getByLoai(dtLoai);
        opts = list.map((d) => ({
          value: d.id, label: `${d.ma} - ${d.ten}`, ma: d.ma, ten: d.ten,
        }));
      }
      setOptCache((p) => ({ ...p, [loai]: opts }));
      return opts;
    },
    [optCache],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [leaf, all, opening] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        taiKhoanService.getHierarchy(),
        soDuDauKyService.getAll(),
      ]);
      const leafList: LeafAccount[] = leaf.map((a) => ({
        ma: a.ma, ten: a.ten,
        chiTietTheo: a.chiTietTheo as ChiTietLoai | undefined,
      }));
      const chartList = all.map((a) => ({ ma: a.ma, ten: a.ten }));
      setLeafAccounts(leafList);
      setChart(chartList);

      const leafLookup = new Map(leafList.map((a) => [a.ma, a]));
      const nextRows: SoDuRow[] = opening.items.map((i) => ({
        key: newKey(),
        maTaiKhoan: i.maTaiKhoan,
        tenTaiKhoan: leafLookup.get(i.maTaiKhoan)?.ten ?? '',
        chiTietTheo:
          (i.chiTietType as ChiTietLoai | undefined) ??
          leafLookup.get(i.maTaiKhoan)?.chiTietTheo,
        chiTietId: i.chiTietId,
        chiTietMa: i.chiTietMa,
        chiTietTen: i.chiTietTen,
        nganHang: i.nganHang,
        duNo: Number(i.duNo) || 0,
        duCo: Number(i.duCo) || 0,
      }));
      setRows(nextRows);
      if (opening.ngayApDung) setNgayApDung(dayjs(opening.ngayApDung));
      // Mở hết cây sau khi tải
      setExpandedKeys(collectExpandKeys(buildSoDuTree(nextRows, chartList)));
    } catch {
      message.error('Không tải được dữ liệu số dư đầu kỳ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const tree = useMemo(() => buildSoDuTree(rows, chart), [rows, chart]);

  const patchRow = (key: string, patch: Partial<SoDuRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Thêm 1 TK con từ ô chọn trên cùng
  const addAccount = (ma: string) => {
    const acc = leafMap.get(ma);
    if (!acc) return;
    // TK thường (không cấu hình) đã tồn tại → không thêm trùng
    if (!acc.chiTietTheo && rows.some((r) => r.maTaiKhoan === ma)) {
      message.info(`Tài khoản ${ma} đã có trong danh sách`);
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        key: newKey(), maTaiKhoan: ma, tenTaiKhoan: acc.ten,
        chiTietTheo: acc.chiTietTheo,
        chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined,
        nganHang: undefined, duNo: 0, duCo: 0,
      },
    ]);
    if (acc.chiTietTheo) loadOptions(acc.chiTietTheo);
  };

  // Thêm 1 đối tượng dưới node TK có cấu hình
  const addObjectRow = (ma: string, chiTietTheo: ChiTietLoai) => {
    const acc = leafMap.get(ma);
    setRows((prev) => [
      ...prev,
      {
        key: newKey(), maTaiKhoan: ma, tenTaiKhoan: acc?.ten ?? '',
        chiTietTheo,
        chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined,
        nganHang: undefined, duNo: 0, duCo: 0,
      },
    ]);
    loadOptions(chiTietTheo);
  };

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  const handleSelectDoiTuong = (key: string, loai: ChiTietLoai, id: string) => {
    const opt = (optCache[loai] || []).find((o) => o.value === id);
    patchRow(key, { chiTietId: id, chiTietMa: opt?.ma, chiTietTen: opt?.ten });
  };

  const { tongNo, tongCo } = useMemo(
    () => rows.reduce(
      (a, r) => ({ tongNo: a.tongNo + (r.duNo || 0), tongCo: a.tongCo + (r.duCo || 0) }),
      { tongNo: 0, tongCo: 0 },
    ),
    [rows],
  );
  const canDoi = Math.round(tongNo * 100) === Math.round(tongCo * 100);

  const accountOptions = useMemo(
    () => leafAccounts.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })),
    [leafAccounts],
  );

  const handleSave = async () => {
    const check = validateRows(rows);
    if (!check.ok) { message.error(check.message); return; }
    setSaving(true);
    try {
      const result = await soDuDauKyService.saveBulk({
        ngayApDung: ngayApDung.toISOString(),
        items: rows.map((r) => ({
          maTaiKhoan: r.maTaiKhoan,
          duNo: r.duNo || 0,
          duCo: r.duCo || 0,
          chiTietType: r.chiTietTheo,
          chiTietId: r.chiTietId,
          chiTietMa: r.chiTietMa,
          chiTietTen: r.chiTietTen,
          nganHang: r.nganHang,
        })),
      });
      if (!result.canDoi) message.warning('Đã lưu — lưu ý tổng Nợ và tổng Có chưa cân đối');
      else message.success('Lưu số dư đầu kỳ thành công');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ----- Cell renderers -----
  const doiTuongCell = (node: SoDuTreeNode) => {
    if (node.kind === 'account') {
      return (
        <Text strong={node.__isParent}>{`${node.__ma} - ${node.ten}`}</Text>
      );
    }
    const row = node.row!;
    // Đối tượng = KH/NCC/NV/Nhà thầu (ngân hàng hiển thị ở cột Ngân hàng)
    if (!row.chiTietTheo || row.chiTietTheo === 'NGAN_HANG_QUY') {
      return <Text type="secondary">—</Text>;
    }
    let opts = optCache[row.chiTietTheo] || [];
    if (row.chiTietId && !opts.some((o) => o.value === row.chiTietId)) {
      opts = [{
        value: row.chiTietId,
        label: row.chiTietMa ? `${row.chiTietMa} - ${row.chiTietTen ?? ''}` : row.chiTietTen ?? row.chiTietId,
        ma: row.chiTietMa ?? '', ten: row.chiTietTen ?? '',
      }, ...opts];
    }
    return (
      <Select
        style={{ width: '100%' }} showSearch optionFilterProp="label"
        placeholder={`Chọn ${CHI_TIET_LABEL[row.chiTietTheo]}`}
        disabled={!canEdit} value={row.chiTietId} options={opts}
        onFocus={() => loadOptions(row.chiTietTheo!)}
        onChange={(v) => handleSelectDoiTuong(row.key, row.chiTietTheo!, v)}
      />
    );
  };

  const nganHangCell = (node: SoDuTreeNode) => {
    if (node.__isParent || !node.row) return null;
    const row = node.row;
    if (row.chiTietTheo === 'NGAN_HANG_QUY') {
      let opts = optCache.NGAN_HANG_QUY || [];
      if (row.chiTietId && !opts.some((o) => o.value === row.chiTietId)) {
        opts = [{
          value: row.chiTietId,
          label: row.chiTietMa ? `${row.chiTietMa} - ${row.chiTietTen ?? ''}` : row.chiTietTen ?? row.chiTietId,
          ma: row.chiTietMa ?? '', ten: row.chiTietTen ?? '',
        }, ...opts];
      }
      return (
        <Select
          style={{ width: '100%' }} showSearch optionFilterProp="label"
          placeholder="Chọn ngân hàng" disabled={!canEdit}
          value={row.chiTietId} options={opts}
          onFocus={() => loadOptions('NGAN_HANG_QUY')}
          onChange={(v) => handleSelectDoiTuong(row.key, 'NGAN_HANG_QUY', v)}
        />
      );
    }
    return (
      <Input
        placeholder="Ngân hàng (gõ tay)" disabled={!canEdit}
        value={row.nganHang ?? ''}
        onChange={(e) => patchRow(row.key, { nganHang: e.target.value })}
      />
    );
  };

  const numberCell = (node: SoDuTreeNode, field: 'duNo' | 'duCo') => {
    if (node.__isParent) {
      return <Text strong>{formatCurrency(node.__rollup[field])}</Text>;
    }
    if (!node.row) return null;
    const row = node.row;
    return (
      <InputNumber
        style={{ width: '100%' }} value={row[field]} disabled={!canEdit} min={0}
        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={(v) => Number((v || '').replace(/,/g, ''))}
        onChange={(v) => patchRow(row.key, { [field]: Number(v) || 0 })}
      />
    );
  };

  const actionCell = (node: SoDuTreeNode) => {
    // Node nhóm TK có cấu hình → nút "+ Thêm ..."
    if (node.kind === 'account' && node.__isParent && node.chiTietTheo) {
      return (
        <Button type="link" size="small" icon={<PlusOutlined />} disabled={!canEdit}
          onClick={() => addObjectRow(node.__ma, node.chiTietTheo!)}>
          {`Thêm ${CHI_TIET_LABEL[node.chiTietTheo]}`}
        </Button>
      );
    }
    // Lá nhập → nút xoá
    if (!node.__isParent && node.row) {
      return (
        <Popconfirm title="Xoá dòng này?" disabled={!canEdit}
          onConfirm={() => removeRow(node.row!.key)}>
          <Button type="text" danger icon={<DeleteOutlined />} disabled={!canEdit} />
        </Popconfirm>
      );
    }
    return null;
  };

  const columns = [
    { title: 'Tài khoản / Đối tượng', key: 'tk', width: 360,
      render: (_: unknown, node: SoDuTreeNode) => doiTuongCell(node) },
    { title: 'Ngân hàng', key: 'nh', width: 260,
      render: (_: unknown, node: SoDuTreeNode) => nganHangCell(node) },
    { title: 'Dư Nợ đầu kỳ', key: 'duNo', width: 160, align: 'right' as const,
      render: (_: unknown, node: SoDuTreeNode) => numberCell(node, 'duNo') },
    { title: 'Dư Có đầu kỳ', key: 'duCo', width: 160, align: 'right' as const,
      render: (_: unknown, node: SoDuTreeNode) => numberCell(node, 'duCo') },
    { title: '', key: 'op', width: 140,
      render: (_: unknown, node: SoDuTreeNode) => actionCell(node) },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Danh mục' },
          { title: 'Số dư đầu kỳ' },
        ]} />
      <Card
        title="Khai báo số dư đầu kỳ"
        extra={
          <Space>
            <Text>Ngày áp dụng:</Text>
            <DatePicker value={ngayApDung} format="DD/MM/YYYY" allowClear={false}
              disabled={!canEdit} onChange={(d) => d && setNgayApDung(d)} />
            <Button type="primary" icon={<SaveOutlined />} loading={saving}
              disabled={!canEdit} onClick={handleSave}>Lưu</Button>
          </Space>
        }>
        {!canDoi && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message={`Tổng Nợ (${formatCurrency(tongNo)}) ≠ Tổng Có (${formatCurrency(tongCo)}) — số dư đầu kỳ chưa cân đối`} />
        )}
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            style={{ width: 320 }} showSearch optionFilterProp="label"
            placeholder="+ Thêm tài khoản (chọn TK chi tiết)"
            disabled={!canEdit} value={null} options={accountOptions}
            onChange={(v) => v && addAccount(v)}
          />
          <Button size="small" onClick={() => setExpandedKeys(collectExpandKeys(tree))}>
            Mở tất cả
          </Button>
          <Button size="small" onClick={() => setExpandedKeys([])}>Thu gọn</Button>
        </Space>
        <Table<SoDuTreeNode>
          rowKey="__key" loading={loading} dataSource={tree} columns={columns}
          pagination={false} size="small" scroll={{ y: 'calc(100vh - 400px)' }}
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpandedRowsChange: (keys) => setExpandedKeys([...keys]),
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong>{formatCurrency(tongNo)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong type={canDoi ? undefined : 'danger'}>
                    {formatCurrency(tongCo)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
              </Table.Summary.Row>
            </Table.Summary>
          )} />
      </Card>
    </div>
  );
};

export default SoDuDauKyPage;
```

- [ ] **Step 2: Lint + typecheck**

Run: `cd fe && yarn lint && yarn build`
Expected: không lỗi ESLint, build thành công.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx
git commit -m "feat(fe): trang so du dau ky dang cay cha-con-doi tuong + nganHang"
```

---

## Task 6: Kiểm tra tổng thể

- [ ] **Step 1: BE build**

Run: `cd be && yarn build:master-data`
Expected: build thành công.

- [ ] **Step 2: FE test toàn bộ**

Run: `cd fe && yarn test`
Expected: PASS (gồm `chiTietConfig`, `buildSoDuTree`).

- [ ] **Step 3: FE lint + build**

Run: `cd fe && yarn lint && yarn build`
Expected: sạch, build thành công.

- [ ] **Step 4: Kiểm thử thủ công (checklist)**

1. Vào Danh mục → Số dư đầu kỳ.
2. "+ Thêm tài khoản" chọn 1 TK loại Ngân hàng (vd 1121) → node 1121 + cha tự sinh (112, 1) hiện ra; bấm "+ Thêm Ngân hàng & Quỹ" 2 lần, mỗi dòng chọn 1 ngân hàng + nhập Dư Nợ → 1121/112/1 hiện tổng cộng dồn read-only.
3. "+ Thêm tài khoản" chọn 1 TK loại Khách hàng (vd 131) → chọn khách hàng ở cột Đối tượng + gõ tay ngân hàng ở cột Ngân hàng (song song) + nhập số.
4. "+ Thêm tài khoản" chọn 1 TK thường (vd 1111) → nhập Nợ/Có trực tiếp, cột Ngân hàng gõ tay được.
5. "Thu gọn"/"Mở tất cả" hoạt động.
6. Lưu → tải lại trang → dữ liệu (gồm ngân hàng gõ tay + đối tượng) hiện đúng.
7. Mở Báo cáo → Bảng cân đối phát sinh / cân đối kế toán: số dư đầu kỳ tổng theo mã TK không đổi.
</content>
