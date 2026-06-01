# Collapse cây tài khoản ở Báo cáo tài chính — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị Bảng cân đối phát sinh và Bảng cân đối kế toán dạng cây tài khoản đa cấp (mặc định thu gọn, mở ra hiện con như Excel), không đổi backend.

**Architecture:** Một util thuần `buildAccountTree` dựng cây theo prefix mã trên toàn bộ danh mục tài khoản (lấy từ `getHierarchy`), gắn số liệu báo cáo và roll-up lên cha. Trang `BaoCaoTaiChinhPage` render 2 bảng bằng antd Table dạng cây, mặc định đóng. Tổng cộng giữ nguyên (cây chỉ để hiển thị).

**Tech Stack:** React 18 + TypeScript, Ant Design Table (tree), Vitest (unit test).

**Spec:** `docs/superpowers/specs/2026-06-01-bao-cao-tai-chinh-collapse-design.md`

---

## File Structure

**Create:**
- `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts` — util dựng cây (thuần, tái dùng cho cả 2 bảng)
- `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts` — unit test (vitest)

**Modify:**
- `fe/package.json` — thêm script `test`
- `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx` — dùng cây cho 2 bảng

---

## Task 1: Util buildAccountTree + test

**Files:**
- Create: `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts`
- Create: `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts`
- Modify: `fe/package.json`

- [ ] **Step 1: Add test script to package.json**

In `fe/package.json`, inside `"scripts"`, add a `test` entry (place after the existing `"lint"` or `"build"` line):

```json
    "test": "vitest run",
```

- [ ] **Step 2: Write the failing test**

Create `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildAccountTree, collectParentKeys } from './buildAccountTree';

interface Row {
  ma: string;
  ten: string;
  val: number;
}

const chart = [
  { ma: '112', ten: 'Tiền gửi NH' },
  { ma: '1121', ten: 'VND' },
  { ma: '11211', ten: 'VCB' },
  { ma: '113', ten: 'Tiền đang chuyển' },
  { ma: '131', ten: 'Phải thu KH' },
];

const make = (ma: string, ten: string): Row => ({ ma, ten, val: 0 });

describe('buildAccountTree', () => {
  it('lồng đa cấp theo prefix và roll-up tổng con cháu', () => {
    const rows: Row[] = [
      { ma: '112', ten: 'Tiền gửi NH', val: 50 },
      { ma: '11211', ten: 'VCB', val: 200 },
    ];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);

    // root duy nhất là 112 (113/131 không có dữ liệu → bị cắt)
    expect(tree).toHaveLength(1);
    const n112 = tree[0];
    expect(n112.__ma).toBe('112');
    expect(n112.__isParent).toBe(true);
    expect(n112.val).toBe(50);          // giá trị riêng của 112
    expect(n112.__rollup.val).toBe(200); // tổng con cháu (11211)

    // 112 → 1121 (synthesized, không có report row) → 11211
    expect(n112.children).toHaveLength(1);
    const n1121 = n112.children![0];
    expect(n1121.__ma).toBe('1121');
    expect(n1121.val).toBe(0);           // synthesized → 0
    expect(n1121.__rollup.val).toBe(200);
    expect(n1121.children![0].__ma).toBe('11211');
    expect(n1121.children![0].__isParent).toBe(false);
    expect(n1121.children![0].val).toBe(200);
  });

  it('cắt nhánh không có dữ liệu', () => {
    const rows: Row[] = [{ ma: '131', ten: 'Phải thu KH', val: 10 }];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    expect(tree.map((n) => n.__ma)).toEqual(['131']);
    expect(tree[0].__isParent).toBe(false);
  });

  it('mã lạ không có trong chart → node gốc đơn lẻ', () => {
    const rows: Row[] = [{ ma: '999', ten: 'Lạ', val: 7 }];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    expect(tree).toHaveLength(1);
    expect(tree[0].__ma).toBe('999');
    expect(tree[0].__isParent).toBe(false);
  });

  it('report rỗng → []', () => {
    expect(buildAccountTree([], chart, (r: Row) => r.ma, ['val'], make)).toEqual([]);
  });

  it('collectParentKeys gom đúng các mã node cha', () => {
    const rows: Row[] = [
      { ma: '112', ten: 'x', val: 1 },
      { ma: '11211', ten: 'y', val: 2 },
    ];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    expect(collectParentKeys(tree).sort()).toEqual(['1121', '112']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd fe && npx vitest run src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts 2>&1 | tail -20`
Expected: FAIL — cannot resolve `./buildAccountTree` / `buildAccountTree is not a function`.

- [ ] **Step 4: Implement the util**

Create `fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts`:

```typescript
export type TreeNode<T> = T & {
  __ma: string;
  __isParent: boolean;
  __rollup: Record<string, number>;
  children?: TreeNode<T>[];
};

export interface ChartAccount {
  ma: string;
  ten: string;
}

/**
 * Dựng cây tài khoản đa cấp theo prefix mã.
 *
 * @param reportRows  Dòng báo cáo (mỗi dòng ứng 1 mã TK)
 * @param allAccounts Danh mục TK đầy đủ (để biết TK cha trung gian)
 * @param getCode     Lấy mã TK từ 1 report row
 * @param sumFields   Các field số để roll-up tổng con cháu
 * @param makeSynthetic Tạo row cho node cha không có dữ liệu báo cáo (đặt tên, field số = 0)
 */
export function buildAccountTree<T>(
  reportRows: T[],
  allAccounts: ChartAccount[],
  getCode: (row: T) => string,
  sumFields: (keyof T & string)[],
  makeSynthetic: (account: ChartAccount) => T,
): TreeNode<T>[] {
  const reportByCode = new Map<string, T>();
  for (const r of reportRows) reportByCode.set(getCode(r), r);

  const accountByCode = new Map<string, ChartAccount>();
  for (const a of allAccounts) accountByCode.set(a.ma, a);

  // Tập mã = chart ∪ report
  const codeSet = new Set<string>();
  for (const a of allAccounts) codeSet.add(a.ma);
  for (const c of reportByCode.keys()) codeSet.add(c);
  const codes = Array.from(codeSet).sort((a, b) => a.localeCompare(b));

  // Cha = mã là tiền tố đúng dài nhất
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

  // Giữ node nếu chính nó hoặc con cháu có dữ liệu báo cáo
  const keepCache = new Map<string, boolean>();
  const shouldKeep = (code: string): boolean => {
    const cached = keepCache.get(code);
    if (cached !== undefined) return cached;
    let keep = reportByCode.has(code);
    for (const k of childrenOf.get(code) ?? []) {
      if (shouldKeep(k)) keep = true;
    }
    keepCache.set(code, keep);
    return keep;
  };

  const buildNode = (code: string): TreeNode<T> => {
    const keptKids = (childrenOf.get(code) ?? [])
      .filter(shouldKeep)
      .sort((a, b) => a.localeCompare(b));
    const childNodes = keptKids.map(buildNode);

    const ownRow = reportByCode.get(code);
    const base: T = ownRow
      ? { ...ownRow }
      : makeSynthetic(accountByCode.get(code) ?? { ma: code, ten: '' });

    // Roll-up = tổng field số của TẤT CẢ con cháu có dữ liệu (không gồm chính node)
    const rollup: Record<string, number> = {};
    for (const f of sumFields) rollup[f] = 0;
    const addDesc = (c: string) => {
      const row = reportByCode.get(c);
      if (row) {
        for (const f of sumFields) {
          rollup[f] += Number((row as Record<string, unknown>)[f]) || 0;
        }
      }
      for (const k of childrenOf.get(c) ?? []) addDesc(k);
    };
    for (const k of keptKids) addDesc(k);

    return {
      ...(base as object),
      __ma: code,
      __isParent: childNodes.length > 0,
      __rollup: rollup,
      ...(childNodes.length > 0 ? { children: childNodes } : {}),
    } as TreeNode<T>;
  };

  // Gốc = node được giữ mà không có cha được giữ
  return codes
    .filter((c) => {
      if (!shouldKeep(c)) return false;
      const p = parentOf.get(c) ?? null;
      return p === null || !shouldKeep(p);
    })
    .map(buildNode);
}

/** Gom mã (__ma) của tất cả node có con — dùng cho nút "Mở tất cả". */
export function collectParentKeys<T>(nodes: TreeNode<T>[]): string[] {
  const keys: string[] = [];
  const walk = (ns: TreeNode<T>[]) => {
    for (const n of ns) {
      if (n.children && n.children.length > 0) {
        keys.push(n.__ma);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return keys;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe && npx vitest run src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts 2>&1 | tail -20`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts fe/src/pages/bao-cao/tai-chinh/utils/buildAccountTree.test.ts fe/package.json
git commit -m "feat(fe): util buildAccountTree dựng cây TK đa cấp + test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Bảng cân đối phát sinh dạng cây

**Files:**
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`

- [ ] **Step 1: Thêm import + state danh mục TK**

Ở đầu file, thêm import (cạnh các import service hiện có như `soCaiService`):

```typescript
import { taiKhoanService } from '@/services/taiKhoanService';
import { buildAccountTree, collectParentKeys, type TreeNode } from './utils/buildAccountTree';
```

Cạnh các `useState` khác (sau `bsState`), thêm:

```typescript
  const [accounts, setAccounts] = useState<{ ma: string; ten: string }[]>([]);
  const [tbExpanded, setTbExpanded] = useState<React.Key[]>([]);
```

- [ ] **Step 2: Lấy danh mục TK trong fetchData**

Trong `fetchData`, thêm `taiKhoanService.getHierarchy()` vào `Promise.all` và nhận kết quả. Thay block:

```typescript
      const [trial, stats, bsData, bsStats, kqkd, pnlComp] = await Promise.all([
        soCaiService.getTrialBalance(startDate, endDate),
        soCaiService.getStats(startDate, endDate),
        balanceSheetService.getData(endDate),
        balanceSheetService.getStats(endDate),
        kqkdService.getData({ startDate, endDate, periodType }),
        pnlService.getComparison(startDate, endDate, periodType),
      ]);
      setTbState({ trialBalance: trial, soCaiStats: stats });
      setBsState({ data: bsData, stats: bsStats });
      setKqkdData(kqkd);
      setPnlComparison(pnlComp);
```

bằng:

```typescript
      const [trial, stats, bsData, bsStats, kqkd, pnlComp, accs] = await Promise.all([
        soCaiService.getTrialBalance(startDate, endDate),
        soCaiService.getStats(startDate, endDate),
        balanceSheetService.getData(endDate),
        balanceSheetService.getStats(endDate),
        kqkdService.getData({ startDate, endDate, periodType }),
        pnlService.getComparison(startDate, endDate, periodType),
        taiKhoanService.getHierarchy().catch(() => [] as { ma: string; ten: string }[]),
      ]);
      setTbState({ trialBalance: trial, soCaiStats: stats });
      setBsState({ data: bsData, stats: bsStats });
      setKqkdData(kqkd);
      setPnlComparison(pnlComp);
      setAccounts(accs.map((a) => ({ ma: a.ma, ten: a.ten })));
```

(`.catch(() => [])` đảm bảo lỗi tải danh mục không làm vỡ trang — khi đó cây sẽ phẳng theo fallback ở Step 4.)

- [ ] **Step 3: Xoá parentChildrenMap, dựng cây trial balance**

Xoá toàn bộ block `parentChildrenMap` (từ `// Compute children sums...` đến hết `}, [tbState.trialBalance]);`).

Thay bằng:

```typescript
  const trialBalanceTree = useMemo(
    () =>
      buildAccountTree(
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
      ),
    [tbState.trialBalance, accounts],
  );
```

- [ ] **Step 4: Cập nhật renderTrialAmount cho TreeNode**

Thay hàm `renderTrialAmount` hiện tại bằng:

```typescript
  const renderTrialAmount = (record: TreeNode<TrialBalance>, field: TrialBalanceAmountField) => {
    const ownVal = Number(record[field]) || 0;
    if (record.__isParent) {
      const childrenVal = record.__rollup[field] ?? 0;
      if (childrenVal > 0 && ownVal > 0) {
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            <span style={{ color: '#52c41a' }}>{formatCurrency(childrenVal)}</span>
            <span style={{ color: '#fa8c16', marginLeft: 4 }}>+{formatCurrency(ownVal)}</span>
          </span>
        );
      }
      if (childrenVal > 0) {
        return <span style={{ color: '#52c41a' }}>{formatCurrency(childrenVal)}</span>;
      }
    }
    return <CurrencyCell value={ownVal} />;
  };
```

- [ ] **Step 5: Cập nhật columns + Table cho trial balance**

Đổi kiểu cột sang `TreeNode<TrialBalance>` và đổi mỗi `render` để truyền record. Thay khai báo `const trialBalanceColumns: ColumnsType<TrialBalance> = [` thành `const trialBalanceColumns: ColumnsType<TreeNode<TrialBalance>> = [`, và đổi 6 render từ dạng `render: (v: number, r: TrialBalance) => renderTrialAmount(v, r, 'soDuDauKyNo')` sang dạng:

```typescript
render: (_: number, r: TreeNode<TrialBalance>) => renderTrialAmount(r, 'soDuDauKyNo')
```

(làm tương tự cho cả 6 field: `soDuDauKyNo`, `soDuDauKyCo`, `phatSinhNo`, `phatSinhCo`, `soDuCuoiKyNo`, `soDuCuoiKyCo`).

Tại JSX `<Table>` của trial balance (đang có `columns={trialBalanceColumns}` `dataSource={tbState.trialBalance}` `rowKey="taiKhoan"`), đổi thành:

```tsx
                <Table<TreeNode<TrialBalance>>
                  columns={trialBalanceColumns}
                  dataSource={trialBalanceTree}
                  rowKey="__ma"
                  expandable={{
                    expandedRowKeys: tbExpanded,
                    onExpandedRowsChange: (keys) => setTbExpanded([...keys]),
                  }}
```

(giữ nguyên các prop khác: `loading`, `bordered`, `size`, `scroll`, `pagination={false}`, `summary`). **Lưu ý:** giữ nguyên hàm `summary` đang tính từ `tbState.trialBalance` — KHÔNG đổi sang cây (tổng cộng phải tính trên mảng phẳng gốc).

- [ ] **Step 6: Thêm nút Mở tất cả / Thu gọn cho trial balance**

Ngay phía trên `<Table>` của trial balance (trong cùng container), thêm:

```tsx
                <Space style={{ marginBottom: 8 }}>
                  <Button size="small" onClick={() => setTbExpanded(collectParentKeys(trialBalanceTree))}>
                    Mở tất cả
                  </Button>
                  <Button size="small" onClick={() => setTbExpanded([])}>
                    Thu gọn
                  </Button>
                </Space>
```

Đảm bảo `Space` và `Button` đã được import từ `antd` (nếu chưa, thêm vào import antd hiện có).

- [ ] **Step 7: Build verify**

Run: `cd fe && npm run build 2>&1 | tail -15`
Expected: build thành công, không lỗi TS liên quan trial balance/`TreeNode`.

- [ ] **Step 8: Commit**

```bash
git add fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx
git commit -m "feat(fe): bảng cân đối phát sinh dạng cây collapse (mặc định đóng)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Bảng cân đối kế toán dạng cây

**Files:**
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`

- [ ] **Step 1: Thêm state expand cho 2 bảng balance sheet**

Cạnh `tbExpanded`, thêm:

```typescript
  const [bsTaiSanExpanded, setBsTaiSanExpanded] = useState<React.Key[]>([]);
  const [bsNguonVonExpanded, setBsNguonVonExpanded] = useState<React.Key[]>([]);
```

- [ ] **Step 2: Dựng cây cho taiSan/nguonVon**

Sau `trialBalanceTree`, thêm helper + 2 useMemo:

```typescript
  const buildBsTree = (items: BalanceSheetItem[]): TreeNode<BalanceSheetItem>[] => {
    const header = items.find((i) => i.isSection);
    const leaves = items.filter((i) => !i.isSection);
    const tree = buildAccountTree(
      leaves,
      accounts,
      (r) => r.ma,
      ['dauNam', 'cuoiKy'],
      (acc) => ({
        ma: acc.ma,
        tenChiTieu: `${acc.ma} - ${acc.ten}`,
        dauNam: 0,
        cuoiKy: 0,
        level: 1,
      }),
    );
    if (!header) return tree;
    const headerNode = {
      ...header,
      __ma: header.ma,
      __isParent: false,
      __rollup: {} as Record<string, number>,
    } as TreeNode<BalanceSheetItem>;
    return [headerNode, ...tree];
  };

  const taiSanTree = useMemo(
    () => (bsState.data ? buildBsTree(bsState.data.taiSan) : []),
    [bsState.data, accounts],
  );
  const nguonVonTree = useMemo(
    () => (bsState.data ? buildBsTree(bsState.data.nguonVon) : []),
    [bsState.data, accounts],
  );
```

- [ ] **Step 3: Cập nhật balanceSheetColumns cho cây**

Đổi kiểu `const balanceSheetColumns: ColumnsType<BalanceSheetItem> = [` thành `const balanceSheetColumns: ColumnsType<TreeNode<BalanceSheetItem>> = [`.

Cột "Chỉ tiêu" — bỏ thụt theo `level` (antd tự thụt theo cấp cây), giữ style section. Thay render:

```tsx
      render: (text: string, record: TreeNode<BalanceSheetItem>) => (
        <span style={{ fontWeight: record.isSection ? 700 : record.isTotal || record.__isParent ? 600 : 400, color: record.isSection ? '#1890ff' : 'inherit' }}>{text}</span>
      ),
```

Cột "Số đầu năm" (`dauNam`) — dùng rollup cho node cha:

```tsx
      render: (value: number, record: TreeNode<BalanceSheetItem>) => (
        <CurrencyCell value={record.__isParent ? (record.__rollup.dauNam ?? 0) : value} bold={record.isSection || record.isTotal || record.__isParent} />
      ),
```

Cột "Số cuối kỳ" (`cuoiKy`):

```tsx
      render: (value: number, record: TreeNode<BalanceSheetItem>) => (
        <CurrencyCell value={record.__isParent ? (record.__rollup.cuoiKy ?? 0) : value} bold={record.isSection || record.isTotal || record.__isParent} />
      ),
```

Cột "Chênh lệch" — tính từ rollup khi là node cha. Thay đầu hàm render:

```tsx
      render: (_: unknown, record: TreeNode<BalanceSheetItem>) => {
        const dauNam = record.__isParent ? (record.__rollup.dauNam ?? 0) : record.dauNam;
        const cuoiKy = record.__isParent ? (record.__rollup.cuoiKy ?? 0) : record.cuoiKy;
        if (dauNam === 0 && cuoiKy === 0) return '-';
        const diff = cuoiKy - dauNam;
```

(giữ phần còn lại của hàm render "Chênh lệch" như cũ, nhưng dùng biến `diff` vừa tính ở trên — bỏ 2 dòng `if (record.dauNam === 0 && record.cuoiKy === 0)...` và `const diff = record.cuoiKy - record.dauNam;` cũ.)

- [ ] **Step 4: Cập nhật 2 Table balance sheet**

Tìm 2 `<Table className="excel-table" columns={balanceSheetColumns} dataSource={bsState.data.taiSan} rowKey="ma" .../>` và `dataSource={bsState.data.nguonVon}`. Đổi thành (tài sản):

```tsx
                  <div style={{ marginBottom: 8 }}>
                    <Space>
                      <Button size="small" onClick={() => setBsTaiSanExpanded(collectParentKeys(taiSanTree))}>Mở tất cả</Button>
                      <Button size="small" onClick={() => setBsTaiSanExpanded([])}>Thu gọn</Button>
                    </Space>
                  </div>
                  <Table<TreeNode<BalanceSheetItem>>
                    className="excel-table"
                    columns={balanceSheetColumns}
                    dataSource={taiSanTree}
                    rowKey="__ma"
                    loading={loading}
                    bordered
                    size="small"
                    pagination={false}
                    expandable={{ expandedRowKeys: bsTaiSanExpanded, onExpandedRowsChange: (keys) => setBsTaiSanExpanded([...keys]) }}
                  />
```

Và nguồn vốn tương tự, dùng `nguonVonTree` + `bsNguonVonExpanded` / `setBsNguonVonExpanded`.

- [ ] **Step 5: Build verify**

Run: `cd fe && npm run build 2>&1 | tail -15`
Expected: build thành công, không lỗi TS.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx
git commit -m "feat(fe): bảng cân đối kế toán dạng cây collapse

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Verify toàn bộ

**Files:** none (verification only)

- [ ] **Step 1: Chạy test util**

Run: `cd fe && npm test 2>&1 | tail -20`
Expected: tất cả test pass (buildAccountTree 5 test).

- [ ] **Step 2: Build FE**

Run: `cd fe && npm run build 2>&1 | tail -15`
Expected: thành công.

- [ ] **Step 3: Lint trang đã sửa**

Run: `cd fe && npx eslint src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx src/pages/bao-cao/tai-chinh/utils/buildAccountTree.ts 2>&1 | head -30`
Expected: không lỗi (cảnh báo `any` chấp nhận nếu nhất quán codebase).

- [ ] **Step 4: Checklist kiểm thử thủ công (ghi lại, không tự chạy)**

1. Mở Báo cáo tài chính → tab Bảng cân đối phát sinh: mặc định **chỉ hiện TK gốc** (đóng); bấm mở thấy TK con đúng cấp; dòng cha hiện `tổng con (xanh) + riêng cha (cam)`, TK cha không phát sinh riêng chỉ hiện phần xanh.
2. Dòng **Tổng cộng** không đổi so với trước khi có cây.
3. Nút "Mở tất cả / Thu gọn" hoạt động.
4. Tab Bảng cân đối kế toán: Tài sản/Nguồn vốn hiện section header + nhóm TK cấp cao (đóng); mở ra thấy TK con; node cha hiện tổng gộp in đậm.
5. **Tổng tài sản / Tổng nguồn vốn** (thẻ Statistic) không đổi.
6. Tab KQKD và bảng so sánh PnL không bị ảnh hưởng.

---

## Notes for Implementer

- **Thuần FE** — không đụng backend. Deploy chỉ cần build + đẩy FE (theo `/db-deploy`).
- **Tổng cộng**: tuyệt đối không tính tổng từ cây (node cha gộp sẽ gây cộng trùng). Trial balance giữ summary từ `tbState.trialBalance`; balance sheet giữ `bsState.stats`.
- **Fallback**: nếu `getHierarchy()` lỗi → `accounts = []` → `buildAccountTree` vẫn chạy: mỗi mã report thành node theo prefix giữa chính các mã report (vẫn lồng được phần nào), không vỡ trang.
- **antd tree indent**: bỏ padding theo `level` cũ ở cột Chỉ tiêu để tránh thụt 2 lần.
