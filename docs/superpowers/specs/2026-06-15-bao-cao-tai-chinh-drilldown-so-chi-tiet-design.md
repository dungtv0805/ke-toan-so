# Báo cáo tài chính → Sổ chi tiết drill-down

**Date:** 2026-06-15
**Status:** Approved design
**Area:** `fe/src/pages/bao-cao/tai-chinh` + `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan` (FE only)

## Problem

In the Báo cáo tài chính screen, the "Cân đối tài khoản" tab shows a tree of
accounts (parent → leaf → đối tượng rows). Users currently cannot jump from a
row to its underlying detail; they must navigate to Sổ chi tiết tài khoản
separately and re-select the account/đối tượng and period by hand.

## Goal

In the "Cân đối tài khoản" tab, make each account's code/name a clickable link
that opens **Sổ chi tiết tài khoản in a new browser tab**, pre-filtered to:
- a parent/leaf account row → that account;
- an đối tượng row → that đối tượng under its parent account;
carrying the báo cáo's current date range.

## Non-goals (YAGNI)

- Drill-down from tabs 2/3/4 (Cân đối kế toán, KQKD, So sánh lãi lỗ) — only
  Tab 1 ("Cân đối tài khoản") is in scope.
- Same-tab navigation — we open a new browser tab.
- Whole-row click — the affordance is a link on the code/name cell only.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Which tab is clickable | Only Tab 1 "Cân đối tài khoản" |
| Click affordance | Link on the account code / name cell |
| Where it opens | New browser tab (`window.open(url, '_blank')`) |
| Period | Carry the báo cáo's current `startDate`/`endDate` |

## Data shapes (existing)

In `BaoCaoTaiChinhPage.tsx`, the Tab 1 tree (`trialBalanceTree`) is built from
`TreeNode<TrialBalance>`:
- **Account rows** carry `taiKhoan` = account code (e.g. `111`, `1111`);
  `__isParent` may be true for parents. `__isDoiTuong` is falsy.
- **Đối tượng rows** are created with `taiKhoan: ''` (display blank),
  `__isDoiTuong: true`, and `__ma = "{parentTK}::{doiTuongMa}"` where
  `doiTuongMa` is the object code, or the literal `__none__` when the đối tượng
  has no code.

Routing: `BrowserRouter` at root, **no basename**. Both pages live under
`/bao-cao/...`, so the target path is `/bao-cao/so-chi-tiet-tai-khoan`.

The Sổ chi tiết service `getReport(maTaiKhoans: string[] | 'all', startDate,
endDate, maDoiTuong?)` already exists from the prior feature.

## Part A — Sổ chi tiết page accepts URL params & auto-loads

File: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx`
New helper: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.ts` (+ test)

### `reportParams.ts`

Pure helper, unit-testable (no React, no router):

```ts
export interface ParsedReportParams {
  maTaiKhoan?: string;
  maDoiTuong?: string;
  startDate?: string; // ISO
  endDate?: string;   // ISO
}
export function parseReportParams(
  get: (key: string) => string | null,
): ParsedReportParams
```

- Reads `maTaiKhoan`, `maDoiTuong`, `startDate`, `endDate`.
- Returns only the keys that are present and non-empty.
- `get` is a plain getter so the test passes a fake; in the page we pass
  `searchParams.get`.

### Page wiring

- Use `useSearchParams()` from `react-router-dom`.
- On mount (once), call `parseReportParams(searchParams.get.bind(searchParams))`.
  If `maTaiKhoan` present:
  - `setMaTaiKhoans([maTaiKhoan])`;
  - if `maDoiTuong` present → `setMaDoiTuong(maDoiTuong)`;
  - if both `startDate` and `endDate` valid → `setRange([dayjs(startDate),
    dayjs(endDate)])`;
  - then auto-run the report load **once** for those values.
- Because `loadReport` reads component state that updates asynchronously, the
  mount effect builds the request from the parsed params directly (not from
  state) to avoid a stale-state race: it calls
  `soChiTietTaiKhoanService.getReport([maTaiKhoan], start, end, maDoiTuong)` and
  sets `reports`, mirroring `loadReport`'s try/catch/loading handling.
- With no `maTaiKhoan` param, the effect does nothing — the page behaves exactly
  as today (manual selection).
- The auto-load effect runs only once (empty dep array) so user edits afterward
  are not overridden.

## Part B — Báo cáo tài chính Tab 1 clickable links

File: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx`
New helper: `fe/src/pages/bao-cao/tai-chinh/utils/soChiTietLink.ts` (+ test)

### `soChiTietLink.ts`

```ts
export interface SoChiTietLinkArgs {
  maTaiKhoan: string;
  maDoiTuong?: string;
  startDate?: string; // ISO
  endDate?: string;   // ISO
}
export function buildSoChiTietUrl(args: SoChiTietLinkArgs): string
```

- Returns `"/bao-cao/so-chi-tiet-tai-khoan?" + URLSearchParams` containing
  `maTaiKhoan` always, plus `maDoiTuong`, `startDate`, `endDate` only when set.
- Pure and unit-testable (no `window`).

### Column renders

In `trialBalanceColumns`, update the `taiKhoan` and `tenTaiKhoan` columns to
render a link via a shared inner helper `openSoChiTiet(record)`:

```ts
const openSoChiTiet = (record: TreeNode<TrialBalance>) => {
  let maTaiKhoan = record.taiKhoan;
  let maDoiTuong: string | undefined;
  if (record.__isDoiTuong) {
    const [parentTK, dt] = (record.__ma ?? '').split('::');
    maTaiKhoan = parentTK;
    maDoiTuong = dt && dt !== '__none__' ? dt : undefined;
  }
  if (!maTaiKhoan) return;
  const url = buildSoChiTietUrl({
    maTaiKhoan, maDoiTuong,
    startDate: filterParams.startDate,
    endDate: filterParams.endDate,
  });
  window.open(url, '_blank', 'noopener');
};
```

- `taiKhoan` column: when the cell has a non-empty code (account rows), render
  it as `<Typography.Link onClick={() => openSoChiTiet(record)}>{code}</Typography.Link>`;
  empty cells (đối tượng rows) render nothing as before.
- `tenTaiKhoan` column: render the name as a `Typography.Link` calling
  `openSoChiTiet(record)` for **both** account rows and đối tượng rows (so đối
  tượng rows, whose code cell is blank, are still clickable via the name).
- Links use AntD default link styling (blue); the click target is the text, so
  it does not interfere with the tree expand/collapse icon.

Tabs 2/3/4 are untouched.

## Data flow

```
Tab 1 row link click
  → openSoChiTiet(record): resolve maTaiKhoan (+ maDoiTuong for đối tượng rows)
  → buildSoChiTietUrl(... + filterParams date range)
  → window.open('/bao-cao/so-chi-tiet-tai-khoan?...', '_blank', 'noopener')
  → new tab mounts SoChiTietTaiKhoanPage
  → parseReportParams(searchParams) → auto getReport([maTaiKhoan], start, end, maDoiTuong)
  → renders the account/đối tượng detail over the same period
```

## Error handling

- Missing/invalid params on the Sổ chi tiết side → no auto-load; manual page.
- Unknown account → service returns empty `reports[]` → "Không có dữ liệu" Empty.
- `__none__` đối tượng row → links to the parent TK only (no đối tượng filter).
- `window.open` uses `'noopener'` to avoid the new tab gaining `window.opener`.

## Testing

- `soChiTietLink.test.ts`: `buildSoChiTietUrl` composes the path + query; omits
  `maDoiTuong`/dates when absent; includes them when present.
- `reportParams.test.ts`: `parseReportParams` extracts present keys, drops empty
  ones, returns `{}` when nothing supplied.
- The `window.open` / column wiring is verified manually in the dev server.

## Files touched

- `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx` (modify)
- `fe/src/pages/bao-cao/tai-chinh/utils/soChiTietLink.ts` (new)
- `fe/src/pages/bao-cao/tai-chinh/utils/soChiTietLink.test.ts` (new)
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx` (modify)
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.ts` (new)
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.test.ts` (new)
