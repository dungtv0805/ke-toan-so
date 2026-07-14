# Lọc cột số ở header bảng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cột số trong 11 bảng/tab nhóm báo cáo tài chính lọc được ngay tại header với 8 toán tử kiểu Excel (Bằng, Khác, <, ≤, >, ≥, (Trống), (Không trống)).

**Architecture:** Mở rộng hạ tầng lọc cột đã có (`fe/src/components/table/`): `ColumnFilter` thành union `text | number`, `matchAllFilters` dispatch theo `kind`, `filterable(col, opts)` nhận `{ type: 'number', filterTitle }`. Mỗi trang chỉ cần trả thêm giá trị số trong `getValue` và bọc cột số bằng `filterable`. Cơ chế cộng lại dòng tổng theo dòng còn hiện giữ nguyên như bản lọc chữ.

**Tech Stack:** React 18 + TypeScript + antd Table (`filterDropdown`), Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-14-loc-cot-so-o-header-bang-design.md`

## Global Constraints

- Không dùng `onFilter` của antd. Mỗi trang lọc trên **dữ liệu gốc** rồi cộng lại tổng — lý do đã ghi trong `useTableColumnFilters.tsx`.
- **(Trống)** = ô không có số **hoặc bằng 0**. **(Không trống)** = có số khác 0.
- 6 toán tử so sánh: ô không có số → **không khớp**. Ô bằng `0` là số 0 thật, so sánh bình thường.
- `eq`/`ne`/`lte`/`gte` dùng sai số `EPS = 0.005`.
- Chuỗi nhập hợp lệ: `1230000`, `1.230.000`, `1,230,000`, `1500.5`, `1500,5`, `-500000`. Không hợp lệ → không lọc + chặn nút Lọc.
- Cột trùng tiêu đề bắt buộc truyền `filterTitle`.
- Test: `cd fe && npx vitest run <path>`. Lint: `cd fe && npm run lint`.
- Commit bằng tiếng Việt, kết thúc bằng dòng `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Lõi so khớp số (`columnFilter.ts`)

**Files:**
- Modify: `fe/src/components/table/columnFilter.ts` (viết lại toàn bộ)
- Test: `fe/src/components/table/columnFilter.test.ts` (viết lại toàn bộ)

**Interfaces:**
- Consumes: (không có — task đầu)
- Produces:
  - `type TextOp = 'contains' | 'notContains' | 'equals' | 'startsWith'`
  - `type NumberOp = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'blank' | 'notBlank'`
  - `interface TextFilter { kind: 'text'; op: TextOp; value: string }`
  - `interface NumberFilter { kind: 'number'; op: NumberOp; value: string }`
  - `type ColumnFilter = TextFilter | NumberFilter`
  - `type FilterKind = 'text' | 'number'`
  - `type CellValue = string | number | null | undefined`
  - `type ColumnFilters = Record<string, ColumnFilter | undefined>`
  - `TEXT_OPS`, `NUMBER_OPS`, `DEFAULT_TEXT_OP`, `DEFAULT_NUMBER_OP`
  - `isValuelessOp(op: NumberOp): boolean`
  - `parseFilterNumber(input: string): number | null`
  - `matchText(raw: CellValue, filter: TextFilter): boolean`
  - `matchNumber(raw: CellValue, filter: NumberFilter): boolean`
  - `isActiveFilter(filter: ColumnFilter | undefined): boolean`
  - `hasActiveFilters(filters: ColumnFilters): boolean`
  - `matchAllFilters<T>(row: T, filters: ColumnFilters, getValue: (row: T, key: string) => CellValue): boolean`

**Lưu ý:** `FilterOp` và `FILTER_OPS`, `DEFAULT_OP` cũ bị xoá. Chỗ duy nhất import chúng là `ColumnFilterDropdown.tsx` (sửa ở Task 2) — Task 1 sẽ để repo tạm không typecheck được ở file đó; đừng hoảng, Task 2 vá ngay. Không sửa file nào khác trong Task 1.

- [ ] **Step 1: Viết test thất bại — thay toàn bộ `fe/src/components/table/columnFilter.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  isActiveFilter,
  matchAllFilters,
  matchNumber,
  matchText,
  parseFilterNumber,
  type NumberFilter,
  type NumberOp,
  type TextFilter,
  type TextOp,
} from './columnFilter';

const t = (op: TextOp, value: string): TextFilter => ({ kind: 'text', op, value });
const n = (op: NumberOp, value = ''): NumberFilter => ({ kind: 'number', op, value });

describe('matchText', () => {
  it('Chứa: khớp chuỗi con, không phân biệt hoa thường', () => {
    expect(matchText('CÔNG TY G-LIFE', t('contains', 'g-life'))).toBe(true);
    expect(matchText('CÔNG TY G-LIFE', t('contains', 'vinamilk'))).toBe(false);
  });

  it('Chứa: bỏ dấu tiếng Việt ở cả hai phía', () => {
    expect(matchText('CÔNG TY CỔ PHẦN', t('contains', 'cong ty'))).toBe(true);
    expect(matchText('Cong ty co phan', t('contains', 'cổ phần'))).toBe(true);
    expect(matchText('Nguyễn Văn Đức', t('contains', 'duc'))).toBe(true);
  });

  it('Không chứa: phủ định của Chứa', () => {
    expect(matchText('CÔNG TY G-LIFE', t('notContains', 'vinamilk'))).toBe(true);
    expect(matchText('CÔNG TY G-LIFE', t('notContains', 'g-life'))).toBe(false);
  });

  it('Bằng: khớp toàn bộ chuỗi (đã trim, bỏ dấu, hạ hoa thường)', () => {
    expect(matchText(' KH001 ', t('equals', 'kh001'))).toBe(true);
    expect(matchText('KH0011', t('equals', 'kh001'))).toBe(false);
  });

  it('Bắt đầu bằng', () => {
    expect(matchText('KH001', t('startsWith', 'kh'))).toBe(true);
    expect(matchText('NCC001', t('startsWith', 'kh'))).toBe(false);
  });

  it('giá trị lọc rỗng hoặc chỉ khoảng trắng → không lọc, mọi dòng đều khớp', () => {
    expect(matchText('bất kỳ', t('contains', ''))).toBe(true);
    expect(matchText('bất kỳ', t('equals', '   '))).toBe(true);
  });

  it('ô nguồn rỗng/undefined: chỉ khớp Không chứa', () => {
    expect(matchText(undefined, t('contains', 'a'))).toBe(false);
    expect(matchText('', t('equals', 'a'))).toBe(false);
    expect(matchText(undefined, t('notContains', 'a'))).toBe(true);
  });
});

describe('parseFilterNumber', () => {
  it('số thuần', () => {
    expect(parseFilterNumber('1230000')).toBe(1230000);
    expect(parseFilterNumber(' 0 ')).toBe(0);
  });

  it('dấu chấm ngăn nghìn kiểu VN', () => {
    expect(parseFilterNumber('1.230.000')).toBe(1230000);
    expect(parseFilterNumber('1.500')).toBe(1500);
  });

  it('dấu phẩy ngăn nghìn kiểu EN', () => {
    expect(parseFilterNumber('1,230,000')).toBe(1230000);
  });

  it('số lẻ: dấu chấm hoặc dấu phẩy làm dấu thập phân', () => {
    expect(parseFilterNumber('1500.5')).toBe(1500.5);
    expect(parseFilterNumber('1500,5')).toBe(1500.5);
    expect(parseFilterNumber('1.230.000,75')).toBe(1230000.75);
  });

  it('số âm', () => {
    expect(parseFilterNumber('-500000')).toBe(-500000);
    expect(parseFilterNumber('-1.230.000')).toBe(-1230000);
  });

  it('rỗng hoặc rác → null', () => {
    expect(parseFilterNumber('')).toBeNull();
    expect(parseFilterNumber('  ')).toBeNull();
    expect(parseFilterNumber('abc')).toBeNull();
    expect(parseFilterNumber('12ab')).toBeNull();
    expect(parseFilterNumber('1..2')).toBeNull();
  });
});

describe('matchNumber', () => {
  it('Bằng / Khác (có sai số 0,005)', () => {
    expect(matchNumber(1230000, n('eq', '1.230.000'))).toBe(true);
    expect(matchNumber(1230000.001, n('eq', '1230000'))).toBe(true);
    expect(matchNumber(1230001, n('eq', '1230000'))).toBe(false);
    expect(matchNumber(1230001, n('ne', '1230000'))).toBe(true);
    expect(matchNumber(1230000, n('ne', '1230000'))).toBe(false);
  });

  it('Nhỏ hơn / Nhỏ hơn hoặc bằng', () => {
    expect(matchNumber(99, n('lt', '100'))).toBe(true);
    expect(matchNumber(100, n('lt', '100'))).toBe(false);
    expect(matchNumber(100, n('lte', '100'))).toBe(true);
    expect(matchNumber(101, n('lte', '100'))).toBe(false);
  });

  it('Lớn hơn / Lớn hơn hoặc bằng', () => {
    expect(matchNumber(101, n('gt', '100'))).toBe(true);
    expect(matchNumber(100, n('gt', '100'))).toBe(false);
    expect(matchNumber(100, n('gte', '100'))).toBe(true);
    expect(matchNumber(99, n('gte', '100'))).toBe(false);
  });

  it('ô bằng 0 vẫn là số 0 khi so sánh', () => {
    expect(matchNumber(0, n('lt', '100'))).toBe(true);
    expect(matchNumber(0, n('eq', '0'))).toBe(true);
    expect(matchNumber(0, n('gt', '0'))).toBe(false);
  });

  it('ô không có số: không khớp mọi toán tử so sánh', () => {
    expect(matchNumber(undefined, n('lt', '100'))).toBe(false);
    expect(matchNumber(null, n('gte', '0'))).toBe(false);
    expect(matchNumber('', n('eq', '0'))).toBe(false);
  });

  it('(Trống): ô không có số HOẶC bằng 0', () => {
    expect(matchNumber(0, n('blank'))).toBe(true);
    expect(matchNumber(undefined, n('blank'))).toBe(true);
    expect(matchNumber(null, n('blank'))).toBe(true);
    expect(matchNumber(5, n('blank'))).toBe(false);
  });

  it('(Không trống): có số khác 0', () => {
    expect(matchNumber(5, n('notBlank'))).toBe(true);
    expect(matchNumber(-5, n('notBlank'))).toBe(true);
    expect(matchNumber(0, n('notBlank'))).toBe(false);
    expect(matchNumber(undefined, n('notBlank'))).toBe(false);
  });

  it('giá trị nhập rỗng hoặc không hợp lệ → không lọc', () => {
    expect(matchNumber(5, n('gt', ''))).toBe(true);
    expect(matchNumber(5, n('gt', 'abc'))).toBe(true);
  });

  it('ô là chuỗi số (dữ liệu backend trả chuỗi) vẫn so sánh được', () => {
    expect(matchNumber('1500', n('gt', '1000'))).toBe(true);
  });
});

describe('isActiveFilter', () => {
  it('lọc chữ: chỉ bật khi có giá trị thực', () => {
    expect(isActiveFilter(undefined)).toBe(false);
    expect(isActiveFilter(t('contains', ''))).toBe(false);
    expect(isActiveFilter(t('contains', '  '))).toBe(false);
    expect(isActiveFilter(t('contains', 'a'))).toBe(true);
  });

  it('lọc số: (Trống)/(Không trống) bật dù không có giá trị nhập', () => {
    expect(isActiveFilter(n('blank'))).toBe(true);
    expect(isActiveFilter(n('notBlank'))).toBe(true);
  });

  it('lọc số: toán tử so sánh chỉ bật khi giá trị parse được', () => {
    expect(isActiveFilter(n('gt', ''))).toBe(false);
    expect(isActiveFilter(n('gt', 'abc'))).toBe(false);
    expect(isActiveFilter(n('gt', '1.000'))).toBe(true);
  });
});

describe('matchAllFilters', () => {
  interface Row {
    ten: string;
    no: number;
    co: number;
  }
  const row: Row = { ten: 'CÔNG TY G-LIFE', no: 1230000, co: 0 };
  const getValue = (r: Row, key: string) =>
    key === 'ten' ? r.ten : key === 'no' ? r.no : key === 'co' ? r.co : undefined;

  it('kết hợp lọc chữ và lọc số trên cùng một dòng', () => {
    expect(
      matchAllFilters(row, { ten: t('contains', 'g-life'), no: n('gt', '1.000.000') }, getValue),
    ).toBe(true);
    expect(
      matchAllFilters(row, { ten: t('contains', 'g-life'), no: n('lt', '1.000.000') }, getValue),
    ).toBe(false);
  });

  it('(Trống) trên cột số bằng 0', () => {
    expect(matchAllFilters(row, { co: n('blank') }, getValue)).toBe(true);
    expect(matchAllFilters(row, { co: n('notBlank') }, getValue)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/components/table/columnFilter.test.ts`
Expected: FAIL — TypeScript/import error `parseFilterNumber`, `matchNumber` không tồn tại.

- [ ] **Step 3: Viết lại `fe/src/components/table/columnFilter.ts`**

```ts
/** Toán tử lọc cho cột chữ. */
export type TextOp = 'contains' | 'notContains' | 'equals' | 'startsWith';

/** Toán tử lọc cho cột số (kiểu AutoFilter của Excel). */
export type NumberOp = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'blank' | 'notBlank';

export interface TextFilter {
  kind: 'text';
  op: TextOp;
  value: string;
}

export interface NumberFilter {
  kind: 'number';
  /** Giá trị người dùng gõ, giữ nguyên chuỗi; parse khi so khớp. */
  op: NumberOp;
  value: string;
}

export type ColumnFilter = TextFilter | NumberFilter;
export type FilterKind = ColumnFilter['kind'];

/** Ô đưa vào so khớp: cột chữ trả chuỗi, cột số trả số. */
export type CellValue = string | number | null | undefined;

/** Bộ lọc đang áp trên bảng: key cột → điều kiện. */
export type ColumnFilters = Record<string, ColumnFilter | undefined>;

export const TEXT_OPS: { value: TextOp; label: string }[] = [
  { value: 'contains', label: 'Chứa' },
  { value: 'notContains', label: 'Không chứa' },
  { value: 'equals', label: 'Bằng' },
  { value: 'startsWith', label: 'Bắt đầu bằng' },
];

export const NUMBER_OPS: { value: NumberOp; label: string }[] = [
  { value: 'eq', label: 'Bằng' },
  { value: 'ne', label: 'Khác' },
  { value: 'lt', label: 'Nhỏ hơn' },
  { value: 'lte', label: 'Nhỏ hơn hoặc bằng' },
  { value: 'gt', label: 'Lớn hơn' },
  { value: 'gte', label: 'Lớn hơn hoặc bằng' },
  { value: 'blank', label: '(Trống)' },
  { value: 'notBlank', label: '(Không trống)' },
];

export const DEFAULT_TEXT_OP: TextOp = 'contains';
export const DEFAULT_NUMBER_OP: NumberOp = 'eq';

/** Toán tử số không cần ô nhập giá trị. */
export function isValuelessOp(op: NumberOp): boolean {
  return op === 'blank' || op === 'notBlank';
}

/** Hạ hoa thường + bỏ dấu tiếng Việt để so khớp "cong ty" ↔ "CÔNG TY". */
function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

const VN_GROUPED = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/; // 1.230.000 | 1.230.000,75
const EN_GROUPED = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/; // 1,230,000 | 1,230,000.75
const COMMA_DECIMAL = /^-?\d+(,\d+)?$/; //            1500,5
const DOT_DECIMAL = /^-?\d+(\.\d+)?$/; //             1230000 | 1500.5

/**
 * Đọc số người dùng gõ vào ô lọc. Chấp nhận cả kiểu VN (1.230.000) lẫn kiểu thuần (1230000),
 * số âm và số lẻ. Không đọc được → null (coi như chưa lọc).
 */
export function parseFilterNumber(input: string): number | null {
  const s = input.replace(/\s/g, '');
  if (s === '') return null;

  let normalized: string;
  if (VN_GROUPED.test(s)) normalized = s.replace(/\./g, '').replace(',', '.');
  else if (EN_GROUPED.test(s)) normalized = s.replace(/,/g, '');
  else if (COMMA_DECIMAL.test(s)) normalized = s.replace(',', '.');
  else if (DOT_DECIMAL.test(s)) normalized = s;
  else return null;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Đọc số của ô dữ liệu. Ô rỗng/không phải số → null. */
function cellNumber(raw: CellValue): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Sai số khi so bằng: tránh lệch do cộng dồn số thực (nửa xu). */
const EPS = 0.005;

/** Có phải bộ lọc đang thực sự áp không. */
export function isActiveFilter(filter: ColumnFilter | undefined): boolean {
  if (!filter) return false;
  if (filter.kind === 'number') {
    return isValuelessOp(filter.op) || parseFilterNumber(filter.value) !== null;
  }
  return filter.value.trim() !== '';
}

/**
 * Một ô chữ có khớp điều kiện lọc không. Bộ lọc rỗng → khớp mọi dòng.
 * Ô nguồn rỗng chỉ khớp "Không chứa" (giống Excel: ô trống không chứa gì cả).
 */
export function matchText(raw: CellValue, filter: TextFilter): boolean {
  if (!isActiveFilter(filter)) return true;

  const needle = fold(filter.value);
  const hay = fold(String(raw ?? ''));

  switch (filter.op) {
    case 'contains':
      return hay.includes(needle);
    case 'notContains':
      return !hay.includes(needle);
    case 'equals':
      return hay === needle;
    case 'startsWith':
      return hay.startsWith(needle);
    default:
      return true;
  }
}

/**
 * Một ô số có khớp điều kiện lọc không.
 * - (Trống) = ô không có số HOẶC bằng 0 (trên bảng kế toán, 0 hiện thành ô trắng/dấu "-").
 * - Toán tử so sánh: ô không có số thì không khớp (như Excel); ô bằng 0 vẫn là số 0.
 */
export function matchNumber(raw: CellValue, filter: NumberFilter): boolean {
  const cell = cellNumber(raw);

  if (filter.op === 'blank') return cell === null || cell === 0;
  if (filter.op === 'notBlank') return cell !== null && cell !== 0;

  const target = parseFilterNumber(filter.value);
  if (target === null) return true; // chưa nhập / nhập sai → không lọc
  if (cell === null) return false;

  switch (filter.op) {
    case 'eq':
      return Math.abs(cell - target) <= EPS;
    case 'ne':
      return Math.abs(cell - target) > EPS;
    case 'lt':
      return cell < target - EPS;
    case 'lte':
      return cell <= target + EPS;
    case 'gt':
      return cell > target + EPS;
    case 'gte':
      return cell >= target - EPS;
    default:
      return true;
  }
}

/** Dòng có khớp TẤT CẢ bộ lọc đang bật không. `getValue` lấy ô theo key cột. */
export function matchAllFilters<T>(
  row: T,
  filters: ColumnFilters,
  getValue: (row: T, key: string) => CellValue,
): boolean {
  for (const [key, filter] of Object.entries(filters)) {
    if (!filter || !isActiveFilter(filter)) continue;
    const cell = getValue(row, key);
    const ok = filter.kind === 'number' ? matchNumber(cell, filter) : matchText(cell, filter);
    if (!ok) return false;
  }
  return true;
}

/** Có bộ lọc nào đang bật không. */
export function hasActiveFilters(filters: ColumnFilters): boolean {
  return Object.values(filters).some(isActiveFilter);
}
```

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/components/table/columnFilter.test.ts`
Expected: PASS, toàn bộ describe (`matchText`, `parseFilterNumber`, `matchNumber`, `isActiveFilter`, `matchAllFilters`).

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/table/columnFilter.ts fe/src/components/table/columnFilter.test.ts
git commit -m "$(cat <<'EOF'
feat(table): lõi lọc cột số — 8 toán tử, parse số kiểu VN, (Trống) gồm cả 0

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Popover lọc số + API `filterable(col, opts)`

**Files:**
- Modify: `fe/src/components/table/ColumnFilterDropdown.tsx` (viết lại toàn bộ)
- Modify: `fe/src/components/table/useTableColumnFilters.tsx:53-79` (thêm tham số `opts`)
- Test: `fe/src/components/table/__tests__/columnFilterDropdown.render.test.tsx` (thêm 2 test, giữ 3 test cũ)

**Interfaces:**
- Consumes: từ Task 1 — `NUMBER_OPS`, `TEXT_OPS`, `DEFAULT_NUMBER_OP`, `DEFAULT_TEXT_OP`, `isValuelessOp`, `parseFilterNumber`, `type ColumnFilter`, `type FilterKind`, `type NumberOp`, `type TextOp`, `type CellValue`.
- Produces:
  - `ColumnFilterDropdown` props: `{ title: string; kind: FilterKind; filter: ColumnFilter | undefined; pinned: boolean; onApply: (f: ColumnFilter | undefined) => void; onTogglePin: () => void; onClose: () => void }`
  - `useTableColumnFilters(pageKey)` trả `filterable(col, opts?)` với `interface FilterableOptions { type?: FilterKind; filterTitle?: string }`
  - `matches<T>(row: T, getValue: (row: T, key: string) => CellValue): boolean`

- [ ] **Step 1: Viết test thất bại — thêm vào cuối `describe` trong `fe/src/components/table/__tests__/columnFilterDropdown.render.test.tsx`**

Thêm import và component demo cột số ngay sau `const Demo` hiện có:

```tsx
interface NumRow {
  key: string;
  ten: string;
  no: number;
}

const NUM_DATA: NumRow[] = [
  { key: '1', ten: 'Tiền mặt', no: 1230000 },
  { key: '2', ten: 'Tiền gửi', no: 0 },
];

const NumDemo: React.FC = () => {
  const { filterable, matches } = useTableColumnFilters('demo-num');
  const columns: ColumnsType<NumRow> = [
    { title: 'Tên', dataIndex: 'ten', key: 'ten', width: 160 },
    filterable(
      { title: 'Nợ', dataIndex: 'no', key: 'no', width: 140 },
      { type: 'number', filterTitle: 'Phát sinh Nợ' },
    ),
  ];
  const rows = NUM_DATA.filter((r) => matches(r, (row, key) => (key === 'no' ? row.no : undefined)));
  return <Table columns={columns} dataSource={rows} pagination={false} />;
};
```

Và 2 test mới trong `describe`:

```tsx
  it('cột số: chọn "Lớn hơn" + nhập số → chỉ còn dòng khớp', async () => {
    render(<NumDemo />);
    expect(screen.getByText('Tiền gửi')).toBeTruthy();

    openDropdown();
    // Nhãn dùng filterTitle, không phải title cột
    expect(await screen.findByText('Lọc Phát sinh Nợ')).toBeTruthy();

    fireEvent.mouseDown(document.querySelector('.ant-select-selector') as HTMLElement);
    fireEvent.click(await screen.findByTitle('Lớn hơn'));
    fireEvent.change(screen.getByPlaceholderText('Nhập số'), { target: { value: '1.000.000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lọc' }));

    await waitFor(() => expect(screen.queryByText('Tiền gửi')).toBeNull());
    expect(screen.getByText('Tiền mặt')).toBeTruthy();
  });

  it('cột số: gõ chữ → báo lỗi và không cho bấm Lọc', async () => {
    render(<NumDemo />);

    openDropdown();
    fireEvent.change(await screen.findByPlaceholderText('Nhập số'), { target: { value: 'abc' } });

    expect(screen.getByText('Giá trị không hợp lệ')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lọc' }).closest('button')!.disabled).toBe(true);
  });
```

Chú ý: `openDropdown()` hiện lấy `.ant-dropdown-trigger` **đầu tiên** trong DOM — trong `NumDemo` chỉ có cột `no` là filterable nên vẫn đúng.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/components/table/__tests__/columnFilterDropdown.render.test.tsx`
Expected: FAIL — `filterable` chưa nhận tham số thứ 2; không tìm thấy placeholder `Nhập số`.

- [ ] **Step 3: Viết lại `fe/src/components/table/ColumnFilterDropdown.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { Button, Divider, Input, Select, Space } from 'antd';
import { PushpinOutlined } from '@ant-design/icons';
import {
  DEFAULT_NUMBER_OP,
  DEFAULT_TEXT_OP,
  NUMBER_OPS,
  TEXT_OPS,
  isValuelessOp,
  parseFilterNumber,
  type ColumnFilter,
  type FilterKind,
  type NumberOp,
  type TextOp,
} from './columnFilter';

interface Props {
  /** Nhãn cột, hiện ở dòng "Lọc {title}". */
  title: string;
  /** Cột chữ hay cột số — quyết định danh sách toán tử và cách nhập giá trị. */
  kind: FilterKind;
  filter: ColumnFilter | undefined;
  pinned: boolean;
  onApply: (filter: ColumnFilter | undefined) => void;
  onTogglePin: () => void;
  /** antd cấp sẵn: đóng popover. */
  onClose: () => void;
}

const defaultOpOf = (kind: FilterKind): TextOp | NumberOp =>
  kind === 'number' ? DEFAULT_NUMBER_OP : DEFAULT_TEXT_OP;

/**
 * Popover lọc ở header cột: cố định cột + chọn toán tử + nhập giá trị.
 * Giá trị gõ dở chỉ nằm trong state cục bộ — bảng chỉ lọc lại khi bấm "Lọc" (hoặc Enter).
 */
const ColumnFilterDropdown: React.FC<Props> = ({
  title,
  kind,
  filter,
  pinned,
  onApply,
  onTogglePin,
  onClose,
}) => {
  const current = filter && filter.kind === kind ? filter : undefined;
  const [op, setOp] = useState<TextOp | NumberOp>(current?.op ?? defaultOpOf(kind));
  const [value, setValue] = useState(current?.value ?? '');

  // Mở lại popover sau khi bộ lọc đổi từ ngoài (vd bấm "Bỏ lọc") → hiện đúng trạng thái.
  useEffect(() => {
    const f = filter && filter.kind === kind ? filter : undefined;
    setOp(f?.op ?? defaultOpOf(kind));
    setValue(f?.value ?? '');
  }, [filter, kind]);

  const isNumber = kind === 'number';
  const valueless = isNumber && isValuelessOp(op as NumberOp);
  const invalid = isNumber && !valueless && value.trim() !== '' && parseFilterNumber(value) === null;

  const apply = () => {
    if (invalid) return;
    if (valueless) {
      onApply({ kind: 'number', op: op as NumberOp, value: '' });
      onClose();
      return;
    }
    if (value.trim() === '') {
      onApply(undefined);
      onClose();
      return;
    }
    onApply(
      isNumber
        ? { kind: 'number', op: op as NumberOp, value }
        : { kind: 'text', op: op as TextOp, value },
    );
    onClose();
  };

  const clear = () => {
    setOp(defaultOpOf(kind));
    setValue('');
    onApply(undefined);
    onClose();
  };

  return (
    <div
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minWidth: 260,
      }}
      // Chặn click lọt xuống header (antd dùng click header để sort/resize).
      onClick={(e) => e.stopPropagation()}
    >
      <Button type="text" size="small" icon={<PushpinOutlined />} onClick={onTogglePin}>
        {pinned ? 'Bỏ cố định cột' : 'Cố định cột này'}
      </Button>

      <Divider style={{ margin: '8px 0' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 500 }}>Lọc {title}</span>
        <Select
          size="small"
          variant="borderless"
          value={op}
          options={isNumber ? NUMBER_OPS : TEXT_OPS}
          onChange={(next) => setOp(next)}
          style={{ minWidth: 150 }}
        />
      </div>

      {!valueless && (
        <>
          <Input
            autoFocus
            size="small"
            status={invalid ? 'error' : undefined}
            placeholder={isNumber ? 'Nhập số' : 'Nhập giá trị lọc'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPressEnter={apply}
            style={{ marginBottom: invalid ? 4 : 12 }}
          />
          {invalid && (
            <div style={{ color: '#ff4d4f', fontSize: 12, marginBottom: 8 }}>
              Giá trị không hợp lệ
            </div>
          )}
        </>
      )}

      <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button size="small" onClick={clear}>
          Bỏ lọc
        </Button>
        <Button size="small" type="primary" disabled={invalid} onClick={apply}>
          Lọc
        </Button>
      </Space>
    </div>
  );
};

export default ColumnFilterDropdown;
```

- [ ] **Step 4: Sửa `fe/src/components/table/useTableColumnFilters.tsx`**

Đổi import ở đầu file thành:

```tsx
import {
  hasActiveFilters,
  isActiveFilter,
  matchAllFilters,
  type CellValue,
  type ColumnFilter,
  type ColumnFilters,
  type FilterKind,
} from './columnFilter';
```

Thêm interface trên hàm `useTableColumnFilters`:

```tsx
export interface FilterableOptions {
  /** 'number' → popover dùng toán tử số. Mặc định 'text'. */
  type?: FilterKind;
  /** Nhãn "Lọc …" khi tiêu đề cột trùng nhau (vd 4 cột "Nợ"/"Có"). Mặc định lấy `col.title`. */
  filterTitle?: string;
}
```

Thay `filterable` và `matches` bằng:

```tsx
  /**
   * Gắn popover lọc + cố định vào một cột. `title` phải là chuỗi (dùng làm nhãn "Lọc ...").
   * Cột số truyền `{ type: 'number' }`; cột trùng tiêu đề truyền thêm `filterTitle`.
   */
  const filterable = useCallback(
    <T,>(
      col: ColumnType<T> & { key: string; title: string },
      opts?: FilterableOptions,
    ): ColumnType<T> => {
      const kind: FilterKind = opts?.type ?? 'text';
      const active = isActiveFilter(filters[col.key]);
      return {
        ...col,
        fixed: pinnedSet.has(col.key) ? 'left' : col.fixed,
        filterIcon: (
          <CaretDownOutlined style={{ color: active ? '#1890ff' : undefined }} />
        ),
        filtered: active,
        filterDropdown: ({ close }: { close: () => void }) => (
          <ColumnFilterDropdown
            title={opts?.filterTitle ?? col.title}
            kind={kind}
            filter={filters[col.key]}
            pinned={pinnedSet.has(col.key)}
            onApply={(f) => setFilter(col.key, f)}
            onTogglePin={() => {
              togglePin(col.key);
              close();
            }}
            onClose={close}
          />
        ),
      };
    },
    [filters, pinnedSet, setFilter, togglePin],
  );

  /** Dòng có khớp toàn bộ bộ lọc đang bật không. `getValue(row, key)` lấy ô theo key cột. */
  const matches = useCallback(
    <T,>(row: T, getValue: (row: T, key: string) => CellValue) =>
      matchAllFilters(row, filters, getValue),
    [filters],
  );
```

- [ ] **Step 5: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/components/table/`
Expected: PASS — 5 test render (3 cũ + 2 mới) và toàn bộ test lõi.

- [ ] **Step 6: Commit**

```bash
git add fe/src/components/table/
git commit -m "$(cat <<'EOF'
feat(table): popover lọc số ở header + filterable(col, { type, filterTitle })

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Sổ cái (3 tab)

**Files:**
- Modify: `fe/src/pages/bao-cao/so-cai/soCaiFilter.ts:1-19` (getValue)
- Modify: `fe/src/pages/bao-cao/so-cai/SoCaiPage.tsx:147-373` (bọc cột số)
- Test: `fe/src/pages/bao-cao/so-cai/soCaiFilter.test.ts` (thêm test lọc số)

**Interfaces:**
- Consumes: Task 1 (`type CellValue`, `type ColumnFilters`), Task 2 (`filterable(col, opts)`).
- Produces: không có API mới (chỉ mở rộng getValue nội bộ).

- [ ] **Step 1: Viết test thất bại — thêm vào cuối `fe/src/pages/bao-cao/so-cai/soCaiFilter.test.ts`**

```ts
describe('lọc cột số', () => {
  it('Tổng hợp theo TK: lọc "Phát sinh Nợ > 0" chỉ giữ TK có phát sinh', () => {
    const rows = [
      makeAccount({ taiKhoan: '111', phatSinhNo: 5_000_000 }),
      makeAccount({ taiKhoan: '112', phatSinhNo: 0 }),
    ];
    const out = filterSoCaiSummary(rows, {
      phatSinhNo: { kind: 'number', op: 'gt', value: '0' },
    });
    expect(out.map((r) => r.taiKhoan)).toEqual(['111']);
  });

  it('Tổng hợp theo TK: (Không trống) trên cột Phát sinh Có bỏ dòng bằng 0', () => {
    const rows = [
      makeAccount({ taiKhoan: '111', phatSinhCo: 0 }),
      makeAccount({ taiKhoan: '511', phatSinhCo: 2_000_000 }),
    ];
    const out = filterSoCaiSummary(rows, {
      phatSinhCo: { kind: 'number', op: 'notBlank', value: '' },
    });
    expect(out.map((r) => r.taiKhoan)).toEqual(['511']);
  });

  it('Chi tiết TK: lọc số cộng lại phát sinh theo các bút toán còn hiện', () => {
    const acc = makeAccount({
      taiKhoan: '111',
      phatSinhNo: 3_000_000,
      phatSinhCo: 0,
      chiTiet: [
        makeEntry({ soPhieu: 'PT001', phatSinhNo: 1_000_000 }),
        makeEntry({ soPhieu: 'PT002', phatSinhNo: 2_000_000 }),
      ],
    });
    const out = filterSoCaiChiTiet(acc, {
      phatSinhNo: { kind: 'number', op: 'gte', value: '2.000.000' },
    });
    expect(out!.chiTiet.map((e) => e.soPhieu)).toEqual(['PT002']);
    expect(out!.phatSinhNo).toBe(2_000_000);
  });
});
```

**Trước khi viết:** mở file test hiện có, dùng lại đúng các helper dựng dữ liệu đã có ở đó (tên có thể là `makeAccount` / `makeEntry` hoặc khác). Nếu file chưa có helper, tự viết helper tối thiểu ngay trong test, ví dụ:

```ts
const makeAccount = (over: Partial<SoCaiByAccount>): SoCaiByAccount => ({
  taiKhoan: '111',
  tenTaiKhoan: 'Tiền mặt',
  soDuDauKyNo: 0,
  soDuDauKyCo: 0,
  phatSinhNo: 0,
  phatSinhCo: 0,
  soDuCuoiKyNo: 0,
  soDuCuoiKyCo: 0,
  chiTiet: [],
  ...over,
});

const makeEntry = (over: Partial<SoCaiEntry>): SoCaiEntry => ({
  ngay: '01/01/2026',
  soPhieu: 'PT001',
  loaiChungTu: 'Phiếu thu',
  dienGiai: '',
  phatSinhNo: 0,
  phatSinhCo: 0,
  soDuNo: 0,
  soDuCo: 0,
  ...over,
});
```

Kiểm tra `SoCaiByAccount` / `SoCaiEntry` trong `fe/src/services/soCaiService.ts` để helper khớp đúng field bắt buộc.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-cai/soCaiFilter.test.ts`
Expected: FAIL — lọc số bị bỏ qua nên `filterSoCaiSummary` trả cả 2 dòng.

- [ ] **Step 3: Sửa `getValue` trong `fe/src/pages/bao-cao/so-cai/soCaiFilter.ts` (thay dòng 1-19)**

```ts
import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { SoCaiByAccount, SoCaiEntry, TrialBalance } from '@/services/soCaiService';

/** Cột số của bảng tài khoản (tab Tổng hợp theo TK và tab Cân đối phát sinh). */
const ACCOUNT_NUM_KEYS = new Set([
  'soDuDauKyNo',
  'soDuDauKyCo',
  'phatSinhNo',
  'phatSinhCo',
  'soDuCuoiKyNo',
  'soDuCuoiKyCo',
]);

/** Key cột lọc được của bảng tài khoản. */
const accountValue = (r: SoCaiByAccount | TrialBalance, key: string): CellValue => {
  if (key === 'taiKhoan') return r.taiKhoan;
  if (key === 'tenTaiKhoan') return r.tenTaiKhoan;
  if (ACCOUNT_NUM_KEYS.has(key)) return (r as unknown as Record<string, number>)[key];
  return undefined;
};

/** Cột số của bảng bút toán (tab Chi tiết tài khoản). */
const ENTRY_NUM_KEYS = new Set(['phatSinhNo', 'phatSinhCo', 'soDuNo', 'soDuCo']);

/** Key cột lọc được của bảng bút toán (tab Chi tiết tài khoản). */
const entryValue = (e: SoCaiEntry, key: string): CellValue => {
  if (key === 'soPhieu') return e.soPhieu;
  if (key === 'loaiChungTu') return e.loaiChungTu;
  if (key === 'dienGiai') return e.dienGiai;
  if (ENTRY_NUM_KEYS.has(key)) return (e as unknown as Record<string, number>)[key];
  return undefined;
};
```

Giữ nguyên phần còn lại của file (`filterSoCaiSummary`, `filterTrialBalance`, `filterSoCaiChiTiet`).

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-cai/soCaiFilter.test.ts`
Expected: PASS.

- [ ] **Step 5: Bọc cột số trong `fe/src/pages/bao-cao/so-cai/SoCaiPage.tsx`**

`detailColumns` (dòng 175-206) — 4 cột số, bọc bằng `detailFilters.filterable<SoCaiEntry>(col, { type: 'number' })`, giữ nguyên `render`/`width`/`align`:

```tsx
    detailFilters.filterable<SoCaiEntry>(
      {
        title: 'Phát sinh Nợ',
        dataIndex: 'phatSinhNo',
        key: 'phatSinhNo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? formatCurrency(value) : '-',
      },
      { type: 'number' },
    ),
    detailFilters.filterable<SoCaiEntry>(
      {
        title: 'Phát sinh Có',
        dataIndex: 'phatSinhCo',
        key: 'phatSinhCo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? formatCurrency(value) : '-',
      },
      { type: 'number' },
    ),
    detailFilters.filterable<SoCaiEntry>(
      {
        title: 'Số dư Nợ',
        dataIndex: 'soDuNo',
        key: 'soDuNo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? <span style={{ color: '#1890ff' }}>{formatCurrency(value)}</span> : '-',
      },
      { type: 'number' },
    ),
    detailFilters.filterable<SoCaiEntry>(
      {
        title: 'Số dư Có',
        dataIndex: 'soDuCo',
        key: 'soDuCo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? <span style={{ color: '#52c41a' }}>{formatCurrency(value)}</span> : '-',
      },
      { type: 'number' },
    ),
```

`summaryColumns` (dòng 224-273) — bọc 6 cột `soDuDauKyNo`, `soDuDauKyCo`, `phatSinhNo`, `phatSinhCo`, `soDuCuoiKyNo`, `soDuCuoiKyCo` bằng `summaryFilters.filterable<SoCaiByAccount>(col, { type: 'number' })`, **giữ nguyên `sorter` của `phatSinhNo`/`phatSinhCo`**. Tiêu đề 6 cột này đã khác nhau nên không cần `filterTitle`. Cột `action` giữ nguyên.

`trialBalanceColumns` (dòng 310-372) — 6 cột con dưới 3 header gộp, tiêu đề chỉ là "Nợ"/"Có" nên **bắt buộc có `filterTitle`**:

```tsx
    {
      title: 'Số dư đầu kỳ',
      children: [
        trialFilters.filterable<TrialBalance>(
          {
            title: 'Nợ',
            dataIndex: 'soDuDauKyNo',
            key: 'soDuDauKyNo',
            width: 120,
            align: 'right',
            render: (value) => value > 0 ? formatCurrency(value) : '-',
          },
          { type: 'number', filterTitle: 'Đầu kỳ Nợ' },
        ),
        trialFilters.filterable<TrialBalance>(
          {
            title: 'Có',
            dataIndex: 'soDuDauKyCo',
            key: 'soDuDauKyCo',
            width: 120,
            align: 'right',
            render: (value) => value > 0 ? formatCurrency(value) : '-',
          },
          { type: 'number', filterTitle: 'Đầu kỳ Có' },
        ),
      ],
    },
```

Làm tương tự cho 2 header gộp còn lại với `filterTitle`: `phatSinhNo` → "Phát sinh Nợ", `phatSinhCo` → "Phát sinh Có", `soDuCuoiKyNo` → "Cuối kỳ Nợ", `soDuCuoiKyCo` → "Cuối kỳ Có". Giữ nguyên `width`/`align`/`render` của từng cột.

- [ ] **Step 6: Kiểm tra biên dịch + lint**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không lỗi TypeScript ở `SoCaiPage.tsx` / `soCaiFilter.ts`. (Nếu `tsconfig.app.json` không tồn tại, dùng `npx tsc --noEmit`.)

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/so-cai/
git commit -m "$(cat <<'EOF'
feat(so-cai): lọc cột số ở 3 tab (tổng hợp, chi tiết, cân đối phát sinh)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Bảng cân đối kế toán

**Files:**
- Modify: `fe/src/pages/bao-cao/bang-can-doi/bangCanDoiFilter.ts:1-6` (getValue)
- Modify: `fe/src/pages/bao-cao/bang-can-doi/BangCanDoiPage.tsx:137-187` (bọc 3 cột số)
- Test: `fe/src/pages/bao-cao/bang-can-doi/bangCanDoiFilter.test.ts` (thêm test lọc số)

**Interfaces:**
- Consumes: Task 1 (`type CellValue`), Task 2 (`filterable(col, opts)`).
- Produces: cột tính `chenhLech` lọc được với giá trị `cuoiKy - dauNam`.

- [ ] **Step 1: Viết test thất bại — thêm vào `fe/src/pages/bao-cao/bang-can-doi/bangCanDoiFilter.test.ts`**

Dùng lại helper dựng `BalanceSheetData` đã có trong file (kiểm tra tên trước khi viết). Nội dung test:

```ts
describe('lọc cột số', () => {
  it('lọc "Số cuối kỳ > 0" bỏ chỉ tiêu bằng 0 và cộng lại số của dòng nhóm', () => {
    const data: BalanceSheetData = {
      taiSan: [
        { ma: 'A', tenChiTieu: 'A. TÀI SẢN NGẮN HẠN', level: 0, isSection: true, dauNam: 0, cuoiKy: 0 },
        { ma: '110', tenChiTieu: 'Tiền', level: 1, dauNam: 100, cuoiKy: 300 },
        { ma: '120', tenChiTieu: 'Đầu tư', level: 1, dauNam: 50, cuoiKy: 0 },
      ],
      nguonVon: [],
      tongTaiSan: { dauNam: 150, cuoiKy: 300 },
      tongNguonVon: { dauNam: 0, cuoiKy: 0 },
      canDoi: false,
    } as BalanceSheetData;

    const out = filterBangCanDoi(data, { cuoiKy: { kind: 'number', op: 'gt', value: '0' } })!;

    expect(out.taiSan.map((i) => i.ma)).toEqual(['A', '110']);
    // dòng nhóm A cộng lại từ đúng các con còn hiện
    expect(out.taiSan[0].cuoiKy).toBe(300);
    expect(out.taiSan[0].dauNam).toBe(100);
    expect(out.tongTaiSan.cuoiKy).toBe(300);
  });

  it('lọc theo cột tính "Chênh lệch" (cuối kỳ - đầu năm)', () => {
    const data: BalanceSheetData = {
      taiSan: [
        { ma: 'A', tenChiTieu: 'A. TÀI SẢN NGẮN HẠN', level: 0, isSection: true, dauNam: 0, cuoiKy: 0 },
        { ma: '110', tenChiTieu: 'Tiền', level: 1, dauNam: 100, cuoiKy: 300 }, // +200
        { ma: '120', tenChiTieu: 'Đầu tư', level: 1, dauNam: 500, cuoiKy: 400 }, // -100
      ],
      nguonVon: [],
      tongTaiSan: { dauNam: 600, cuoiKy: 700 },
      tongNguonVon: { dauNam: 0, cuoiKy: 0 },
      canDoi: false,
    } as BalanceSheetData;

    const out = filterBangCanDoi(data, { chenhLech: { kind: 'number', op: 'lt', value: '0' } })!;
    expect(out.taiSan.map((i) => i.ma)).toEqual(['A', '120']);
  });
});
```

Nếu `BalanceSheetItem` có field bắt buộc khác (xem `fe/src/services/balanceSheetService.ts`), bổ sung cho đủ.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/bao-cao/bang-can-doi/bangCanDoiFilter.test.ts`
Expected: FAIL — chưa lọc theo cột số, `out.taiSan` còn cả 3 dòng.

- [ ] **Step 3: Sửa `getValue` trong `fe/src/pages/bao-cao/bang-can-doi/bangCanDoiFilter.ts` (thay dòng 1-6)**

```ts
import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { BalanceSheetData, BalanceSheetItem } from '@/services/balanceSheetService';

/**
 * Key cột lọc được của bảng — trùng `key` trong định nghĩa cột antd.
 * `chenhLech` là cột tính (không có field trong dữ liệu) → tính đúng công thức đang hiển thị.
 */
const getValue = (it: BalanceSheetItem, key: string): CellValue => {
  switch (key) {
    case 'tenChiTieu':
      return it.tenChiTieu;
    case 'ma':
      return it.ma;
    case 'dauNam':
      return it.dauNam;
    case 'cuoiKy':
      return it.cuoiKy;
    case 'chenhLech':
      return it.cuoiKy - it.dauNam;
    default:
      return undefined;
  }
};
```

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/bao-cao/bang-can-doi/bangCanDoiFilter.test.ts`
Expected: PASS.

- [ ] **Step 5: Bọc 3 cột số trong `fe/src/pages/bao-cao/bang-can-doi/BangCanDoiPage.tsx` (dòng 137-186)**

Bọc `{ title: 'Số đầu năm', ... }`, `{ title: 'Số cuối kỳ', ... }`, `{ title: 'Chênh lệch', key: 'chenhLech', ... }` bằng `filterable<BalanceSheetItem>(col, { type: 'number' })`, giữ nguyên `render`/`width`/`align`. Ví dụ cột đầu:

```tsx
    filterable<BalanceSheetItem>(
      {
        title: 'Số đầu năm',
        dataIndex: 'dauNam',
        key: 'dauNam',
        width: 150,
        align: 'right',
        render: (value: number, record: BalanceSheetItem) => (
          <span style={{
            fontWeight: record.isSection || record.isTotal ? 600 : 400,
            color: value < 0 ? '#ff4d4f' : 'inherit',
          }}>
            {value !== 0 ? formatCurrency(value) : '-'}
          </span>
        ),
      },
      { type: 'number' },
    ),
```

Không đổi `useTableTitleConfig('baoCao.bangCanDoi', columns)` ở dòng 189 — nó chạy sau, trên mảng cột đã bọc.

- [ ] **Step 6: Kiểm tra biên dịch + lint**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không lỗi.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/bang-can-doi/
git commit -m "$(cat <<'EOF'
feat(bang-can-doi): lọc cột số (đầu năm, cuối kỳ, chênh lệch)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Sổ chi tiết tài khoản

**Files:**
- Modify: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietFilter.ts:10-56`
- Test: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietFilter.test.ts` (thêm test lọc số)

**Interfaces:**
- Consumes: Task 1 (`type CellValue`), Task 2 (`FilterableOptions`).
- Produces: `isFilterableKey(key)` nay trả `true` cho cả 4 cột số (chỉ 2 cột ngày là `false`); `withColumnFilters` tự truyền `{ type: 'number', filterTitle }` cho cột số.

- [ ] **Step 1: Viết test thất bại — thêm vào `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietFilter.test.ts`**

Dùng lại helper dựng `SoChiTietReport` đã có trong file. Nội dung:

```ts
describe('lọc cột số', () => {
  it('lọc "Phát sinh Nợ ≥ 2.000.000" và cộng lại tổng phát sinh + số dư cuối kỳ', () => {
    const report = makeReport({
      soDuDauKyNo: 1_000_000,
      soDuDauKyCo: 0,
      rows: [
        makeRow({ soPhieu: 'PC001', phatSinhNo: 1_000_000 }),
        makeRow({ soPhieu: 'PC002', phatSinhNo: 3_000_000 }),
      ],
    });

    const out = filterSoChiTietReports([report], {
      phatSinhNo: { kind: 'number', op: 'gte', value: '2.000.000' },
    })!;

    expect(out).toHaveLength(1);
    expect(out[0].rows.map((r) => r.soPhieu)).toEqual(['PC002']);
    expect(out[0].tongPhatSinhNo).toBe(3_000_000);
    expect(out[0].soDuCuoiKyNo).toBe(4_000_000); // 1tr đầu kỳ + 3tr còn hiện
  });

  it('(Trống) trên cột Phát sinh Có giữ dòng có Có = 0', () => {
    const report = makeReport({
      rows: [
        makeRow({ soPhieu: 'PC001', phatSinhCo: 0 }),
        makeRow({ soPhieu: 'PT001', phatSinhCo: 500_000 }),
      ],
    });

    const out = filterSoChiTietReports([report], {
      phatSinhCo: { kind: 'number', op: 'blank', value: '' },
    })!;
    expect(out[0].rows.map((r) => r.soPhieu)).toEqual(['PC001']);
  });
});

describe('isFilterableKey', () => {
  it('cột ngày không lọc; cột số lọc được', () => {
    expect(isFilterableKey('ngay')).toBe(false);
    expect(isFilterableKey('ngayChungTu')).toBe(false);
    expect(isFilterableKey('phatSinhNo')).toBe(true);
    expect(isFilterableKey('soDuCo')).toBe(true);
    expect(isFilterableKey('noiDung')).toBe(true);
  });
});
```

Nhớ thêm `isFilterableKey` vào import của file test.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietFilter.test.ts`
Expected: FAIL — `isFilterableKey('phatSinhNo')` đang là `false`, lọc số bị bỏ qua.

- [ ] **Step 3: Sửa `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/soChiTietFilter.ts` (thay dòng 1-56)**

```ts
import type { ColumnsType, ColumnType } from 'antd/es/table';
import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { FilterableOptions } from '@/components/table/useTableColumnFilters';
import type { SoChiTietReport, SoChiTietRow } from '@/services/soChiTietTaiKhoanService';
import { REGISTRY, type DisplayRow } from './columnRegistry';

/** Cột ngày: chưa hỗ trợ lọc. */
const DATE_KEYS = new Set(['ngay', 'ngayChungTu']);

/** Cột số: lọc bằng toán tử số. Tiêu đề cột chỉ là "Nợ"/"Có" nên cần nhãn riêng cho popover. */
const NUMBER_TITLES: Record<string, string> = {
  phatSinhNo: 'Phát sinh Nợ',
  phatSinhCo: 'Phát sinh Có',
  soDuNo: 'Số dư Nợ',
  soDuCo: 'Số dư Có',
};

const isNumberKey = (key: string): boolean => key in NUMBER_TITLES;

/** Cột có gắn popover lọc ở header (mọi cột trừ cột ngày). */
export function isFilterableKey(key: string): boolean {
  return !DATE_KEYS.has(key);
}

const DATA_INDEX = new Map(REGISTRY.map((c) => [c.key, c.dataIndex]));
const DEF_BY_DATA_INDEX = new Map(REGISTRY.map((c) => [c.dataIndex, c]));

type Filterable = <T>(
  col: ColumnType<T> & { key: string; title: string },
  opts?: FilterableOptions,
) => ColumnType<T>;

/**
 * Gắn popover lọc + cố định cột vào các cột của bảng antd (đi xuống cả cột con của header gộp
 * như "Chứng từ", "Số phát sinh"). Cột được nhận diện qua `dataIndex` vì `buildAntdColumns`
 * không đặt `key`.
 */
export function withColumnFilters(
  columns: ColumnsType<DisplayRow>,
  filterable: Filterable,
): ColumnsType<DisplayRow> {
  return columns.map((col) => {
    if ('children' in col && col.children) {
      return { ...col, children: withColumnFilters(col.children, filterable) };
    }
    const leaf = col as ColumnType<DisplayRow>;
    const def = DEF_BY_DATA_INDEX.get(String(leaf.dataIndex));
    if (!def || !isFilterableKey(def.key)) return col;
    return filterable<DisplayRow>(
      { ...leaf, key: def.key, title: def.title },
      isNumberKey(def.key)
        ? { type: 'number', filterTitle: NUMBER_TITLES[def.key] }
        : undefined,
    );
  });
}

/** Lấy ô của dòng phát sinh theo key cột (key trùng dataIndex trong REGISTRY). */
function getValue(row: SoChiTietRow, key: string): CellValue {
  const dataIndex = DATA_INDEX.get(key);
  if (!dataIndex) return undefined;
  const v = (row as unknown as Record<string, unknown>)[dataIndex];
  if (isNumberKey(key)) return typeof v === 'number' ? v : undefined;
  return typeof v === 'string' ? v : undefined;
}
```

Giữ nguyên `recalc` và `filterSoChiTietReports` phía dưới.

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/`
Expected: PASS (cả test cũ về lọc chữ).

- [ ] **Step 5: Kiểm tra biên dịch + lint**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không lỗi. `SoChiTietTaiKhoanPage.tsx` không phải sửa — nó truyền thẳng `filterable` vào `withColumnFilters`.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/
git commit -m "$(cat <<'EOF'
feat(so-chi-tiet): lọc cột số (phát sinh Nợ/Có, số dư Nợ/Có)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Bảng tổng hợp công nợ

**Files:**
- Modify: `fe/src/pages/bao-cao/bang-tong-hop/congNoFilter.ts:9-11` (getValue)
- Modify: `fe/src/pages/bao-cao/bang-tong-hop/BangTongHopCongNoPage.tsx:156-222` (helper `numCol`)
- Test: `fe/src/pages/bao-cao/bang-tong-hop/congNoFilter.test.ts` (thêm test lọc số)

**Interfaces:**
- Consumes: Task 1 (`type CellValue`), Task 2 (`filterable(col, opts)`).
- Produces: 6 key cột số `dk-pt`, `dk-ptr`, `ps-pt`, `ps-ptr`, `ck-pt`, `ck-ptr` lấy giá trị lồng trong `val`.

- [ ] **Step 1: Viết test thất bại — thêm vào `fe/src/pages/bao-cao/bang-tong-hop/congNoFilter.test.ts`**

Dùng lại helper dựng `BangTongHopCongNo` đã có trong file. Nội dung:

```ts
describe('lọc cột số', () => {
  it('lọc "Cuối kỳ Phải thu > 0" và cộng lại dòng TK + TỔNG CỘNG', () => {
    const data: BangTongHopCongNo = {
      accounts: [
        {
          ma: '131',
          ten: 'Phải thu khách hàng',
          dauKy: { phaiThu: 300, phaiTra: 0 },
          phatSinh: { phaiThu: 0, phaiTra: 0 },
          cuoiKy: { phaiThu: 300, phaiTra: 0 },
          doiTuongs: [
            {
              ma: 'KH01',
              ten: 'Khách 1',
              dauKy: { phaiThu: 300, phaiTra: 0 },
              phatSinh: { phaiThu: 0, phaiTra: 0 },
              cuoiKy: { phaiThu: 300, phaiTra: 0 },
            },
            {
              ma: 'KH02',
              ten: 'Khách 2',
              dauKy: { phaiThu: 0, phaiTra: 0 },
              phatSinh: { phaiThu: 0, phaiTra: 0 },
              cuoiKy: { phaiThu: 0, phaiTra: 0 },
            },
          ],
        },
      ],
      totals: {
        dauKy: { phaiThu: 300, phaiTra: 0 },
        phatSinh: { phaiThu: 0, phaiTra: 0 },
        cuoiKy: { phaiThu: 300, phaiTra: 0 },
      },
    } as BangTongHopCongNo;

    const out = filterCongNo(data, { 'ck-pt': { kind: 'number', op: 'gt', value: '0' } })!;

    expect(out.accounts[0].doiTuongs.map((d) => d.ma)).toEqual(['KH01']);
    expect(out.accounts[0].cuoiKy.phaiThu).toBe(300);
    expect(out.totals.cuoiKy.phaiThu).toBe(300);
  });
});
```

Nếu `CongNoAccount` / `CongNoDoiTuongRow` có field bắt buộc khác (xem `fe/src/services/congNoTongHopService.ts`), bổ sung cho đủ.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/bao-cao/bang-tong-hop/congNoFilter.test.ts`
Expected: FAIL — cả KH01 và KH02 đều còn.

- [ ] **Step 3: Sửa `getValue` trong `fe/src/pages/bao-cao/bang-tong-hop/congNoFilter.ts` (thay dòng 1-11)**

```ts
import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type {
  BangTongHopCongNo,
  CongNoAccount,
  CongNoDoiTuongRow,
  CongNoRowVal,
} from '@/services/congNoTongHopService';

/** Cột số: giá trị lồng trong val — key trùng `key` trong định nghĩa cột antd. */
const NUM_PICKERS: Record<string, (v: CongNoRowVal) => number> = {
  'dk-pt': (v) => v.dauKy.phaiThu,
  'dk-ptr': (v) => v.dauKy.phaiTra,
  'ps-pt': (v) => v.phatSinh.phaiThu,
  'ps-ptr': (v) => v.phatSinh.phaiTra,
  'ck-pt': (v) => v.cuoiKy.phaiThu,
  'ck-ptr': (v) => v.cuoiKy.phaiTra,
};

/** Key cột lọc được của bảng — trùng `key` trong định nghĩa cột antd. */
const getValue = (dt: CongNoDoiTuongRow, key: string): CellValue => {
  if (key === 'ma') return dt.ma;
  if (key === 'ten') return dt.ten;
  const pick = NUM_PICKERS[key];
  return pick ? pick(dt) : undefined;
};
```

Giữ nguyên `ZERO`, `sumRows`, `filterCongNo`.

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/bao-cao/bang-tong-hop/congNoFilter.test.ts`
Expected: PASS.

- [ ] **Step 5: Bọc cột số trong `fe/src/pages/bao-cao/bang-tong-hop/BangTongHopCongNoPage.tsx`**

Thay helper `numCol` (dòng 156-170) — thêm tham số `filterTitle` và bọc `filterable`:

```tsx
  const numCol = (
    key: string,
    title: string,
    filterTitle: string,
    pick: (v: CongNoRowVal) => number,
  ) =>
    filterable<FlatRow>(
      {
        title,
        key,
        align: "right" as const,
        width: 120,
        render: (_: unknown, r: FlatRow) => (
          <span style={{ fontWeight: r.isAccount || r.isTotal ? 700 : 400 }}>
            {fmt(pick(r.val))}
          </span>
        ),
      },
      { type: "number", filterTitle },
    );
```

Và cập nhật 6 lời gọi (dòng 204-219):

```tsx
    {
      title: "Số dư đầu kỳ",
      children: [
        numCol("dk-pt", "Phải thu", "Đầu kỳ - Phải thu", (v) => v.dauKy.phaiThu),
        numCol("dk-ptr", "Phải trả", "Đầu kỳ - Phải trả", (v) => v.dauKy.phaiTra),
      ],
    },
    {
      title: "Số phát sinh",
      children: [
        numCol("ps-pt", "Phải thu", "Phát sinh - Phải thu", (v) => v.phatSinh.phaiThu),
        numCol("ps-ptr", "Phải trả", "Phát sinh - Phải trả", (v) => v.phatSinh.phaiTra),
      ],
    },
    {
      title: "Số dư cuối kỳ",
      children: [
        numCol("ck-pt", "Phải thu", "Cuối kỳ - Phải thu", (v) => v.cuoiKy.phaiThu),
        numCol("ck-ptr", "Phải trả", "Cuối kỳ - Phải trả", (v) => v.cuoiKy.phaiTra),
      ],
    },
```

- [ ] **Step 6: Kiểm tra biên dịch + lint**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không lỗi.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/bang-tong-hop/
git commit -m "$(cat <<'EOF'
feat(tong-hop-cong-no): lọc 6 cột số phải thu/phải trả

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Báo cáo hợp đồng

**Files:**
- Modify: `fe/src/pages/bao-cao/hop-dong/hopDongFilter.ts:13-14` (getValue)
- Modify: `fe/src/pages/bao-cao/hop-dong/BaoCaoHopDongPage.tsx:66-91` (thêm `key` + bọc 9 cột số)
- Test: `fe/src/pages/bao-cao/hop-dong/hopDongFilter.test.ts` (thêm test lọc số)

**Interfaces:**
- Consumes: Task 1 (`type CellValue`), Task 2 (`filterable(col, opts)`).
- Produces: 9 key cột số `soLuong`, `giaTri`, `quyetToan`, `thuTien`, `chuaCoHD`, `hdChuaKy`, `hdPhotoScan`, `hdGoc`, `giaTriBinhQuan`.

- [ ] **Step 1: Viết test thất bại — thêm vào `fe/src/pages/bao-cao/hop-dong/hopDongFilter.test.ts`**

Dùng lại helper dựng `BaoCaoHopDongRow` đã có trong file. Nội dung:

```ts
describe('lọc cột số', () => {
  it('lọc "Số tiền ≥ 1 tỷ" và cộng lại dòng Tổng theo các năm còn hiện', () => {
    const rows = [
      makeRow({ nam: 2024, soLuong: 2, giaTri: 2_000_000_000 }),
      makeRow({ nam: 2025, soLuong: 1, giaTri: 500_000_000 }),
    ];
    const tong = makeRow({ nam: null, soLuong: 3, giaTri: 2_500_000_000 });

    const view = filterHopDong(rows, tong, {
      giaTri: { kind: 'number', op: 'gte', value: '1.000.000.000' },
    });

    expect(view.rows.map((r) => r.nam)).toEqual([2024]);
    expect(view.tong!.giaTri).toBe(2_000_000_000);
    expect(view.tong!.soLuong).toBe(2);
    expect(view.tong!.giaTriBinhQuan).toBe(1_000_000_000);
  });

  it('(Không trống) trên cột HĐ gốc bỏ năm có HĐ gốc = 0', () => {
    const rows = [makeRow({ nam: 2024, hdGoc: 0 }), makeRow({ nam: 2025, hdGoc: 3 })];
    const view = filterHopDong(rows, null, {
      hdGoc: { kind: 'number', op: 'notBlank', value: '' },
    });
    expect(view.rows.map((r) => r.nam)).toEqual([2025]);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/bao-cao/hop-dong/hopDongFilter.test.ts`
Expected: FAIL — không lọc, `view.rows` còn cả 2 dòng.

- [ ] **Step 3: Sửa `getValue` trong `fe/src/pages/bao-cao/hop-dong/hopDongFilter.ts` (thay dòng 1-14)**

```ts
import {
  hasActiveFilters,
  matchAllFilters,
  type CellValue,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { BaoCaoHopDongRow } from '@/types';

/** Cột số của bảng — key trùng `key` trong định nghĩa cột antd. */
const NUM_KEYS = new Set([
  'soLuong',
  'giaTri',
  'quyetToan',
  'thuTien',
  'chuaCoHD',
  'hdChuaKy',
  'hdPhotoScan',
  'hdGoc',
  'giaTriBinhQuan',
]);

/**
 * Key cột lọc được — trùng `key` trong định nghĩa cột antd.
 * Năm rỗng hiển thị "Chưa rõ" → lọc theo đúng chữ đang thấy trên bảng.
 */
const getValue = (r: BaoCaoHopDongRow, key: string): CellValue => {
  if (key === 'nam') return r.nam == null ? 'Chưa rõ' : String(r.nam);
  if (NUM_KEYS.has(key)) return (r as unknown as Record<string, number>)[key];
  return undefined;
};
```

Giữ nguyên `SUM_KEYS`, `sumHopDong`, `HopDongView`, `filterHopDong`.

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/bao-cao/hop-dong/hopDongFilter.test.ts`
Expected: PASS.

- [ ] **Step 5: Thêm `key` + bọc 9 cột số trong `fe/src/pages/bao-cao/hop-dong/BaoCaoHopDongPage.tsx` (thay dòng 66-91)**

```tsx
    {
      title: 'Giá trị Hợp đồng + phụ lục',
      children: [
        filterable(
          { title: 'Số lượng', dataIndex: 'soLuong', key: 'soLuong', width: 90, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
        filterable(
          { title: 'Số tiền', dataIndex: 'giaTri', key: 'giaTri', width: 160, align: 'right', render: (v) => fmtCur(v) },
          { type: 'number', filterTitle: 'Giá trị hợp đồng' },
        ),
      ],
    },
    filterable(
      { title: 'Quyết toán', dataIndex: 'quyetToan', key: 'quyetToan', width: 150, align: 'right', render: (v) => fmtCur(v) },
      { type: 'number' },
    ),
    filterable(
      {
        title: 'Thu tiền',
        dataIndex: 'thuTien',
        key: 'thuTien',
        width: 150,
        align: 'right',
        render: (v) => <Text type="success">{fmtCur(v)}</Text>,
      },
      { type: 'number' },
    ),
    {
      title: 'Tình trạng Hợp đồng',
      children: [
        filterable(
          { title: 'Chưa có HĐ', dataIndex: 'chuaCoHD', key: 'chuaCoHD', width: 90, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
        filterable(
          { title: 'HĐ chưa ký', dataIndex: 'hdChuaKy', key: 'hdChuaKy', width: 90, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
        filterable(
          { title: 'HĐ photo/scan', dataIndex: 'hdPhotoScan', key: 'hdPhotoScan', width: 100, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
        filterable(
          { title: 'HĐ gốc', dataIndex: 'hdGoc', key: 'hdGoc', width: 80, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
      ],
    },
    filterable(
      { title: 'Giá trị HĐ bình quân', dataIndex: 'giaTriBinhQuan', key: 'giaTriBinhQuan', width: 160, align: 'right', render: (v) => fmtCur(v) },
      { type: 'number' },
    ),
```

Cột "Số tiền" nằm dưới header gộp "Giá trị Hợp đồng + phụ lục" nên đặt `filterTitle: 'Giá trị hợp đồng'` cho rõ nghĩa. Giữ nguyên cột "Năm" ở dòng 57-65.

- [ ] **Step 6: Kiểm tra biên dịch + lint**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: không lỗi.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/bao-cao/hop-dong/
git commit -m "$(cat <<'EOF'
feat(bao-cao-hop-dong): lọc 9 cột số (thêm key cho cột số)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Công nợ phải thu / phải trả

**Files:**
- Create: `fe/src/pages/cong-no/congNoCellValue.ts`
- Create: `fe/src/pages/cong-no/congNoCellValue.test.ts`
- Modify: `fe/src/pages/cong-no/phai-thu/CongNoPhaiThuPage.tsx:39-44` (bỏ getter inline, import), `:192-218` + `:263-306` (bọc cột số)
- Modify: `fe/src/pages/cong-no/phai-tra/CongNoPhaiTraPage.tsx:40-45` + các cột số tương ứng

**Interfaces:**
- Consumes: Task 1 (`type CellValue`), Task 2 (`filterable(col, opts)`).
- Produces (từ `congNoCellValue.ts`):
  - `chiTietValue(r: ChiTietRow, key: string): CellValue` — dùng chung cho bảng Chi tiết của cả 2 trang (cả 2 đều có field `daThu`).
  - `tongHopThuValue(r: TongHopThuRow, key: string): CellValue`
  - `tongHopTraValue(r: TongHopTraRow, key: string): CellValue`

- [ ] **Step 1: Viết test thất bại — tạo `fe/src/pages/cong-no/congNoCellValue.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { chiTietValue, tongHopThuValue, tongHopTraValue } from './congNoCellValue';

describe('chiTietValue', () => {
  const row = {
    doiTuongId: 'KH01',
    doiTuongTen: 'Khách 1',
    soTienGoc: 1_000_000,
    daThu: 400_000,
    conLai: 600_000,
  };

  it('trả chuỗi cho cột chữ, số cho cột số', () => {
    expect(chiTietValue(row, 'doiTuongId')).toBe('KH01');
    expect(chiTietValue(row, 'doiTuongTen')).toBe('Khách 1');
    expect(chiTietValue(row, 'soTienGoc')).toBe(1_000_000);
    expect(chiTietValue(row, 'daThu')).toBe(400_000);
    expect(chiTietValue(row, 'conLai')).toBe(600_000);
  });

  it('key lạ → undefined', () => {
    expect(chiTietValue(row, 'khongCo')).toBeUndefined();
  });
});

describe('tongHopThuValue', () => {
  const row = {
    doiTuongId: 'KH01',
    doiTuongTen: 'Khách 1',
    soHoaDon: 3,
    tongNo: 1_000_000,
    daThu: 800_000,
    conLai: 200_000,
    quaHan: 0,
  };

  it('cột số và cột tính "Tỷ lệ thu" (%)', () => {
    expect(tongHopThuValue(row, 'soHoaDon')).toBe(3);
    expect(tongHopThuValue(row, 'tongNo')).toBe(1_000_000);
    expect(tongHopThuValue(row, 'daThu')).toBe(800_000);
    expect(tongHopThuValue(row, 'quaHan')).toBe(0);
    expect(tongHopThuValue(row, 'tyLeThu')).toBe(80);
  });

  it('tổng nợ = 0 → tỷ lệ thu = 0', () => {
    expect(tongHopThuValue({ ...row, tongNo: 0, daThu: 0 }, 'tyLeThu')).toBe(0);
  });
});

describe('tongHopTraValue', () => {
  const row = {
    doiTuongId: 'NCC01',
    doiTuongTen: 'NCC 1',
    soHoaDon: 2,
    tongNo: 500_000,
    daTra: 250_000,
    conLai: 250_000,
    quaHan: 100_000,
  };

  it('cột số và cột tính "Tỷ lệ trả" (%)', () => {
    expect(tongHopTraValue(row, 'daTra')).toBe(250_000);
    expect(tongHopTraValue(row, 'quaHan')).toBe(100_000);
    expect(tongHopTraValue(row, 'tyLeTra')).toBe(50);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/cong-no/congNoCellValue.test.ts`
Expected: FAIL — không tìm thấy module `./congNoCellValue`.

- [ ] **Step 3: Tạo `fe/src/pages/cong-no/congNoCellValue.ts`**

```ts
import type { CellValue } from '@/components/table/columnFilter';

/**
 * Ô theo key cột cho bộ lọc ở header của 2 trang công nợ (phải thu / phải trả).
 * Kiểu khai báo theo cấu trúc (structural) để dùng chung cho cả `CongNoWithOverdue`,
 * `CongNoSummaryByCustomer` và `CongNoSummaryBySupplier`.
 */

export interface ChiTietRow {
  doiTuongId: string;
  doiTuongTen: string;
  soTienGoc: number;
  /** Bảng phải trả cũng dùng field `daThu` (chỉ đổi nhãn cột thành "Đã trả"). */
  daThu: number;
  conLai: number;
}

interface TongHopBase {
  doiTuongId: string;
  doiTuongTen: string;
  soHoaDon?: number;
  tongNo: number;
  conLai: number;
  quaHan?: number;
}

export type TongHopThuRow = TongHopBase & { daThu: number };
export type TongHopTraRow = TongHopBase & { daTra: number };

/** % đã thu/trả — đúng con số đang hiển thị trên thanh Progress. */
const percent = (paid: number, tongNo: number): number =>
  tongNo > 0 ? Math.round((paid / tongNo) * 100) : 0;

export const chiTietValue = (r: ChiTietRow, key: string): CellValue => {
  switch (key) {
    case 'doiTuongId':
      return r.doiTuongId;
    case 'doiTuongTen':
      return r.doiTuongTen;
    case 'soTienGoc':
      return r.soTienGoc;
    case 'daThu':
      return r.daThu;
    case 'conLai':
      return r.conLai;
    default:
      return undefined;
  }
};

const tongHopBaseValue = (r: TongHopBase, key: string): CellValue => {
  switch (key) {
    case 'doiTuongId':
      return r.doiTuongId;
    case 'doiTuongTen':
      return r.doiTuongTen;
    case 'soHoaDon':
      return r.soHoaDon;
    case 'tongNo':
      return r.tongNo;
    case 'conLai':
      return r.conLai;
    case 'quaHan':
      return r.quaHan;
    default:
      return undefined;
  }
};

export const tongHopThuValue = (r: TongHopThuRow, key: string): CellValue => {
  if (key === 'daThu') return r.daThu;
  if (key === 'tyLeThu') return percent(r.daThu, r.tongNo);
  return tongHopBaseValue(r, key);
};

export const tongHopTraValue = (r: TongHopTraRow, key: string): CellValue => {
  if (key === 'daTra') return r.daTra;
  if (key === 'tyLeTra') return percent(r.daTra, r.tongNo);
  return tongHopBaseValue(r, key);
};
```

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/cong-no/congNoCellValue.test.ts`
Expected: PASS.

- [ ] **Step 5: Sửa `fe/src/pages/cong-no/phai-thu/CongNoPhaiThuPage.tsx`**

Bỏ 2 getter inline (dòng 39-44), thay bằng import cạnh các import khác:

```tsx
import { chiTietValue, tongHopThuValue } from '../congNoCellValue';
```

Đổi 2 chỗ dùng:
- dòng 146: `if (!matches(item, getChiTietValue)) return false;` → `if (!matches(item, chiTietValue)) return false;`
- dòng 155: `summaryData.filter(item => matchesTH(item, getTongHopValue))` → `summaryData.filter(item => matchesTH(item, tongHopThuValue))`

Bọc 3 cột số bảng Chi tiết (dòng 192-218) bằng `filterable<CongNoWithOverdue>(col, { type: 'number' })`, giữ nguyên `render`/`sorter`/`width`/`align`. Ví dụ:

```tsx
    filterable<CongNoWithOverdue>(
      {
        title: 'Số tiền gốc',
        dataIndex: 'soTienGoc',
        key: 'soTienGoc',
        width: 140,
        align: 'right',
        render: (value) => formatCurrency(value),
        sorter: (a, b) => a.soTienGoc - b.soTienGoc,
      },
      { type: 'number' },
    ),
```

Làm tương tự cho `daThu` ("Đã thu") và `conLai` ("Còn phải thu").

Bọc 5 cột số bảng Tổng hợp (dòng 263-306) bằng `filterableTH<CongNoSummaryByCustomer>(col, { type: 'number' })`: `soHoaDon`, `tongNo`, `daThu`, `conLai`, `quaHan`. Và cột tính "Tỷ lệ thu" (dòng 307+, `key: 'tyLeThu'`) cũng bọc `{ type: 'number', filterTitle: 'Tỷ lệ thu (%)' }`, giữ nguyên `render` Progress.

- [ ] **Step 6: Sửa `fe/src/pages/cong-no/phai-tra/CongNoPhaiTraPage.tsx` — đối xứng**

Bỏ 2 getter inline (dòng 40-45), import:

```tsx
import { chiTietValue, tongHopTraValue } from '../congNoCellValue';
```

Đổi chỗ dùng: `matches(item, getChiTietValue)` → `matches(item, chiTietValue)`; `matchesTH(item, getTongHopValue)` → `matchesTH(item, tongHopTraValue)`.

Bọc 3 cột số bảng Chi tiết (`soTienGoc`, `daThu` nhãn "Đã trả", `conLai` nhãn "Còn phải trả") bằng `filterable<CongNoWithOverdue>(col, { type: 'number' })`.

Bọc 5 cột số bảng Tổng hợp (`soHoaDon`, `tongNo`, `daTra`, `conLai`, `quaHan`) bằng `filterableTH<CongNoSummaryBySupplier>(col, { type: 'number' })`, và cột tính "Tỷ lệ trả" (`key: 'tyLeTra'`) với `{ type: 'number', filterTitle: 'Tỷ lệ trả (%)' }`.

- [ ] **Step 7: Kiểm tra biên dịch + lint + chạy toàn bộ test**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint && npm test`
Expected: TypeScript sạch, lint sạch, toàn bộ test PASS.

- [ ] **Step 8: Commit**

```bash
git add fe/src/pages/cong-no/
git commit -m "$(cat <<'EOF'
feat(cong-no): lọc cột số ở 4 bảng phải thu/phải trả (gồm cột tỷ lệ thu/trả)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Kiểm chứng end-to-end trên app thật

**Files:** không sửa code (trừ khi phát hiện lỗi).

- [ ] **Step 1: Build production để chắc không vỡ**

Run: `cd fe && npm run build`
Expected: build thành công.

- [ ] **Step 2: Chạy dev server và kiểm tra tay**

Run: `cd fe && npm run dev` → mở `http://localhost:5173`.

Kiểm tra tối thiểu 4 điểm:
1. **Sổ cái → Cân đối phát sinh**: mở popover cột "Nợ" dưới "Phát sinh trong kỳ" → nhãn hiện "Lọc Phát sinh Nợ"; chọn "Lớn hơn", gõ `1.000.000` → bảng chỉ còn TK có phát sinh Nợ > 1 triệu, dòng "Tổng cộng" cộng lại đúng theo các dòng còn hiện.
2. **Sổ cái → Cân đối phát sinh**: chọn "(Không trống)" trên cột "Nợ" phát sinh → ô nhập biến mất, bảng bỏ các TK phát sinh Nợ = 0.
3. **Công nợ phải thu → Tổng hợp theo khách hàng**: lọc "Tỷ lệ thu" `<` `100` → chỉ còn khách chưa thu đủ.
4. **Báo cáo hợp đồng**: lọc "Số tiền" `≥` `1000000000`, bấm Xuất Excel → file tải về khớp với bảng đang xem.

Gõ chữ vào ô lọc số → hiện "Giá trị không hợp lệ" và nút Lọc bị mờ.

- [ ] **Step 3: Nếu mọi thứ đúng, kết thúc**

Không có gì để commit thêm. Nếu phát hiện lỗi, sửa và commit riêng.

---

## Self-Review

**Spec coverage:**
- Mô hình dữ liệu + `kind` union → Task 1 ✓
- Quy tắc so khớp số, (Trống) gồm 0, EPS → Task 1 ✓
- `parseFilterNumber` 4 định dạng → Task 1 ✓
- `filterable(col, opts)` + `filterTitle` + popover 8 toán tử, ẩn ô nhập, báo lỗi → Task 2 ✓
- 11 bảng/tab: Sổ cái (T3), Bảng cân đối (T4), Sổ chi tiết TK (T5), Tổng hợp công nợ (T6), Báo cáo hợp đồng (T7), Phải thu/trả (T8) ✓
- Sửa kèm: `key` cho cột hợp đồng (T7), giá trị lồng `val` (T6), cột tính `chenhLech` (T4), `tyLeThu`/`tyLeTra` (T8), getter inline công nợ (T8) ✓
- Dòng tổng cộng lại theo dòng còn hiện: test ở T3, T4, T5, T6, T7 ✓
- Xuất Excel theo dữ liệu đã lọc: không đổi code, kiểm tay ở T9 ✓

**Type consistency:** `CellValue`, `ColumnFilter`, `FilterKind`, `FilterableOptions` dùng thống nhất; `filterable(col, opts?)` cùng chữ ký ở mọi task; `withColumnFilters` nhận `Filterable` có `opts`.
