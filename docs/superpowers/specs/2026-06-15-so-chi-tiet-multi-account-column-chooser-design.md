# Sổ chi tiết tài khoản — Multi-account & Column chooser

**Date:** 2026-06-15
**Status:** Approved design
**Area:** `reporting-service` (BE) + `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan` (FE)

## Problem

The Sổ chi tiết tài khoản report today forces the user to pick exactly **one**
account (`maTaiKhoan` is mandatory) plus an optional đối tượng, then shows a
fixed 9-column table. Two limitations:

1. **No "view all" option.** Accountants must re-select and re-query for every
   account, one at a time. They want to select several accounts — or all — and
   view them together.
2. **Hidden data.** Each voucher carries a rich `danhMuc` (đối tượng, đối tượng
   2, dự án, bộ phận, đội, nhân viên, khoản mục, sản phẩm, dòng tiền, loại giao
   dịch, nghiệp vụ). None of it is surfaced. Users want all fields available and
   a way to choose which columns the table displays.

## Goals

- Let the user select one, several, or all accounts and view each as its own
  sổ chi tiết block, stacked vertically (proper accounting format with số dư đầu
  kỳ / cộng phát sinh / số dư cuối kỳ per account).
- Surface every `danhMuc` field as an optional table column.
- A column chooser to toggle which columns are visible, with the choice
  persisted across visits (localStorage).

## Non-goals (YAGNI)

- Per-block collapse/expand.
- Excel/PDF export.
- Server-side saved column presets per user.

These can be added later if requested; they are out of scope here.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Layout for multiple accounts | Grouped by account — each TK is its own stacked sổ chi tiết block |
| Account filter | Multi-select (1, several, or all accounts) with a "Chọn tất cả" action |
| Fields in chooser | **All** danhMuc fields available |
| Column persistence | Saved to `localStorage` |
| Architecture | Backend multi-account endpoint (single fetch, loop in memory) |

## Architecture

### The constraint

`SoChiTietService.getSoChiTiet` already fetches **all** vouchers, accounts,
opening balances on every call (`reporting-service/src/so-chi-tiet/so-chi-tiet.service.ts`).
A frontend fan-out (one call per account) would re-fetch the entire voucher set
N times — does not scale. Chosen approach: extend the backend to build many
reports from a single fetch.

## Backend changes

### 1. Surface hidden fields per row

`be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts`

Extend `SoChiTietRow` with optional fields read from `voucher.danhMuc` when each
row is pushed in `buildSoChiTiet`. For each danhMuc entity we surface its `ma`
and `ten`:

- `maDoiTuong`, `tenDoiTuong`
- `maDoiTuong2`, `tenDoiTuong2`
- `maKhoanMuc`, `tenKhoanMuc`
- `maDuAn`, `tenDuAn`
- `maBoPhan`, `tenBoPhan`
- `maNhanVien`, `tenNhanVien`
- `maDoi`, `tenDoi`
- `maSanPham`, `tenSanPham`
- `maDongTien`, `tenDongTien`
- `maLoaiGiaoDich`, `tenLoaiGiaoDich`
- `maNghiepVu`, `tenNghiepVu`

All fields are optional; existing 9 fields are unchanged. The values come from
the same `v` (voucher) already in scope in the row-push loop.

### 2. Multi-account in one fetch

`so-chi-tiet.controller.ts` + `so-chi-tiet.service.ts`

- Controller accepts `maTaiKhoan` as a **comma-separated list** of account codes,
  or the literal string `all`.
- `SoChiTietService` fetches vouchers/accounts/đối tượng/opening **once**, then:
  - Resolves the requested account codes:
    - `all` → every account in the accounts list.
    - comma list → those codes.
    - single code → that code (back-compat).
  - Loops `buildSoChiTiet` per requested code in memory.
  - **Skips empty accounts** — a report with zero opening balance (Nợ & Có both
    0) AND no period rows is omitted, so "all" doesn't yield dozens of blank
    blocks.
  - Returns `{ reports: SoChiTietReport[] }`.
- **Back-compat:** a single-account request returns the same payload shape it
  returns today (the FE service normalizes both shapes — see below).

Each report stays independent. Selecting a parent TK still aggregates its
children via the existing `computeRelevantCodes` prefix rule.

## Frontend changes

`fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/`

The current single 209-line `SoChiTietTaiKhoanPage.tsx` will grow (multi-select,
column chooser, grouped rendering). Split into focused units:

### `columnRegistry.ts`

One source of truth for columns:

```ts
interface ColumnDef {
  key: string;
  title: string;
  group: 'Cơ bản' | 'Chứng từ' | 'Đối tượng' | 'Phân loại' | 'Số phát sinh' | 'Số dư';
  dataIndex: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render?: (v: unknown, row: DisplayRow) => React.ReactNode;
  defaultVisible: boolean;
}
```

- `defaultVisible: true` for the original 9 columns (ngày ghi sổ, số hiệu, ngày
  CT, diễn giải, TK đối ứng, PS nợ, PS có, dư nợ, dư có).
- `defaultVisible: false` for all danhMuc-derived columns.

### `ColumnChooser.tsx`

- Antd `Dropdown` containing checkboxes grouped by `ColumnDef.group`.
- Toggles the set of visible column keys.
- Persists the visible-key set to `localStorage` under `sct-visible-columns`.
- On mount, hydrate from localStorage; fall back to the default-visible set when
  absent or unparseable.

### `AccountReportBlock.tsx`

- Renders one account's report: the header (SỔ CHI TIẾT TÀI KHOẢN, TK ma-ten,
  đối tượng if filtered, loại tiền) + the Antd `Table`.
- Receives the report and the shared visible-column set as props.
- Builds the table columns from `columnRegistry` filtered by visible keys.
  Grouped header columns (Chứng từ / Số phát sinh / Số dư) render only when ≥1
  of their children is visible.
- Reuses the existing summary-row styling (`sct-summary-row`).

### `SoChiTietTaiKhoanPage.tsx`

- Filters: `RangePicker`, a `mode="multiple"` account `Select` with a "Chọn tất
  cả" action, the optional đối tượng `Select` (unchanged), the column chooser,
  and the Xem button.
- Fetch: calls the service with the selected account codes (or `all`), receives
  `reports[]`.
- Renders one `AccountReportBlock` per report, stacked.
- Nothing selected → Empty prompt ("Chọn tài khoản và kỳ rồi bấm Xem").

### `services/soChiTietTaiKhoanService.ts`

- `getReport` accepts an array of account codes (or an `all` flag).
- Normalizes both response shapes into `SoChiTietReport[]`:
  - new `{ reports: [...] }` → use as-is.
  - legacy single object → wrap in a one-element array.
- Add the new optional row fields to the `SoChiTietRow` interface to match BE.

## Data flow

```
User selects accounts + range + (optional đối tượng) + Xem
  → FE getReport(codes, range, doiTuong)
  → GET /reporting/so-chi-tiet-tai-khoan?maTaiKhoan=111,131,...&startDate&endDate&maDoiTuong
  → Service: fetch-once → loop buildSoChiTiet per code → skip empties
  → { reports: SoChiTietReport[] }
  → FE renders one AccountReportBlock per report
  → ColumnChooser controls which columns each block shows (shared, localStorage)
```

## Error handling

- No accounts selected → Empty prompt, no request fired.
- Account not found / no data → skipped by BE (no empty block).
- Request failure → existing `message.error` toast pattern retained.
- Corrupted localStorage column set → ignored, falls back to defaults.

## Testing

### Backend
Extend `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts`:
- danhMuc fields populate on rows when the voucher carries them.
- Multi-account build returns one report per requested code.
- Accounts with no opening balance and no period rows are skipped.

### Frontend
- Unit-test the column registry default-visible set.
- Unit-test the localStorage round-trip (save → hydrate → matches).

## Files touched

**Backend**
- `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.ts`
- `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.service.ts`
- `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.controller.ts`
- `be/apps/reporting-service/src/so-chi-tiet/so-chi-tiet.helper.spec.ts`

**Frontend**
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx`
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/columnRegistry.ts` (new)
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/ColumnChooser.tsx` (new)
- `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/AccountReportBlock.tsx` (new)
- `fe/src/services/soChiTietTaiKhoanService.ts`
