# Sổ chi tiết — chọn kỳ bằng PeriodFilter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang Sổ chi tiết tài khoản chọn kỳ bằng đúng bộ chọn của Báo cáo tài chính (`PeriodFilter`), mặc định tháng hiện tại, và hiển thị đúng kỳ khi mở từ link drill-down.

**Architecture:** `PeriodFilter` được mở rộng 2 prop tùy chọn (`defaultPeriod`, `defaultCustomRange`) + export 2 helper thuần (`currentMonthPeriod`, `paramsOfPeriod`); không truyền prop mới thì hành vi cũ y nguyên nên Báo cáo tài chính không phải sửa. Trang Sổ chi tiết bỏ `RangePicker`, tính kỳ khởi tạo đồng bộ từ query param bằng hàm thuần `initialPeriod` trong `reportParams.ts`.

**Tech Stack:** React 18 + TypeScript + antd (Select, DatePicker), dayjs, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-14-so-chi-tiet-chon-ky-design.md`

## Global Constraints

- `PeriodFilter` KHÔNG được đổi hành vi mặc định: không truyền `defaultPeriod` → vẫn khởi tạo `'namNay'` (Báo cáo tài chính dựa vào điều này).
- Sổ chi tiết: `PeriodFilter` chạy `autoApply` → không vẽ nút "Xem báo cáo"; `onFilter` chỉ `setRange`, **không gọi API**. Nút "Xem" sẵn có của trang là chỗ duy nhất gọi API.
- Kỳ mặc định của Sổ chi tiết = tháng hiện tại.
- Test: `cd fe && npx vitest run <path>`. Lint: `cd fe && npm run lint`.
- Commit tiếng Việt, kết thúc bằng `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `PeriodFilter` nhận kỳ khởi tạo từ ngoài

**Files:**
- Modify: `fe/src/components/shared/PeriodFilter.tsx`
- Test: `fe/src/components/shared/PeriodFilter.test.tsx` (tạo mới)

**Interfaces:**
- Produces:
  - `export function currentMonthPeriod(): string` — `'thang<tháng hiện tại 1-12>'`
  - `export function paramsOfPeriod(period: string): PeriodFilterParams` — khoảng ngày của một kỳ (đổi tên từ `buildPreset` private, giữ nguyên logic)
  - `PeriodFilterProps` thêm `defaultPeriod?: string` và `defaultCustomRange?: [Dayjs, Dayjs]`
  - (giữ nguyên) `PeriodFilterParams { periodType: PeriodType; startDate: string; endDate: string }`, `defaultYearParams()`

- [ ] **Step 1: Viết test thất bại — tạo `fe/src/components/shared/PeriodFilter.test.tsx`**

```tsx
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';
import { PeriodFilter, currentMonthPeriod, paramsOfPeriod } from './PeriodFilter';

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

const YEAR = new Date().getFullYear();

describe('paramsOfPeriod', () => {
  it('tháng: đúng ngày đầu và ngày cuối tháng của năm nay', () => {
    const p = paramsOfPeriod('thang7');
    expect(p.periodType).toBe('thang');
    expect(dayjs(p.startDate).format('DD/MM/YYYY')).toBe(`01/07/${YEAR}`);
    expect(dayjs(p.endDate).format('DD/MM/YYYY')).toBe(`31/07/${YEAR}`);
  });

  it('tháng 2: ngày cuối theo đúng số ngày của tháng', () => {
    const p = paramsOfPeriod('thang2');
    const lastDay = dayjs(new Date(YEAR, 2, 0)).format('DD/MM/YYYY');
    expect(dayjs(p.endDate).format('DD/MM/YYYY')).toBe(lastDay);
  });

  it('năm trước: trọn năm ngoái', () => {
    const p = paramsOfPeriod('namTruoc');
    expect(p.periodType).toBe('nam');
    expect(dayjs(p.startDate).format('DD/MM/YYYY')).toBe(`01/01/${YEAR - 1}`);
    expect(dayjs(p.endDate).format('DD/MM/YYYY')).toBe(`31/12/${YEAR - 1}`);
  });
});

describe('currentMonthPeriod', () => {
  it('trả về key kỳ của tháng hiện tại', () => {
    expect(currentMonthPeriod()).toBe(`thang${new Date().getMonth() + 1}`);
    // key này phải parse được bằng paramsOfPeriod
    const p = paramsOfPeriod(currentMonthPeriod());
    expect(dayjs(p.startDate).format('MM/YYYY')).toBe(dayjs().format('MM/YYYY'));
  });
});

describe('PeriodFilter', () => {
  it('không truyền defaultPeriod → vẫn hiện "Năm nay" (giữ hành vi cho Báo cáo tài chính)', () => {
    render(<PeriodFilter onFilter={vi.fn()} autoApply />);
    expect(screen.getByTitle('Năm nay')).toBeTruthy();
  });

  it('defaultPeriod → hiện đúng kỳ đó lúc mở', () => {
    render(<PeriodFilter onFilter={vi.fn()} autoApply defaultPeriod="thang6" />);
    expect(screen.getByTitle('Tháng 6')).toBeTruthy();
  });

  it('autoApply: đổi kỳ → onFilter nhận đúng khoảng ngày', async () => {
    const onFilter = vi.fn();
    render(<PeriodFilter onFilter={onFilter} autoApply defaultPeriod="thang7" />);

    fireEvent.mouseDown(document.querySelector('.ant-select') as HTMLElement);
    fireEvent.click(await screen.findByTitle('Tháng 6'));

    expect(onFilter).toHaveBeenCalledTimes(1);
    const p = onFilter.mock.calls[0][0];
    expect(dayjs(p.startDate).format('DD/MM/YYYY')).toBe(`01/06/${YEAR}`);
    expect(dayjs(p.endDate).format('DD/MM/YYYY')).toBe(`30/06/${YEAR}`);
  });

  it('defaultPeriod="tuyChon" + defaultCustomRange → hiện 2 ô ngày đã điền sẵn', () => {
    render(
      <PeriodFilter
        onFilter={vi.fn()}
        autoApply
        defaultPeriod="tuyChon"
        defaultCustomRange={[dayjs('2024-03-01'), dayjs('2024-03-31')]}
      />,
    );
    expect((screen.getByPlaceholderText('Từ ngày') as HTMLInputElement).value).toBe('01/03/2024');
    expect((screen.getByPlaceholderText('Đến ngày') as HTMLInputElement).value).toBe('31/03/2024');
  });
});
```

Chú ý: antd bản này render `.ant-select` (KHÔNG có `.ant-select-selector`) và option có thuộc tính `title` — mở dropdown bằng `fireEvent.mouseDown(document.querySelector('.ant-select'))`, chọn bằng `findByTitle('Tháng 6')`. Giá trị đang chọn của `Select` cũng có `title` nên `getByTitle('Năm nay')` khớp.

DatePicker hiện chưa set `format` → mặc định `DD/MM/YYYY` theo cấu hình antd của dự án. Nếu test format lỗi, thêm `format="DD/MM/YYYY"` vào 2 `DatePicker` trong `PeriodFilter` ở Step 3 (đây là sửa hợp lệ, không đổi hành vi).

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/components/shared/PeriodFilter.test.tsx`
Expected: FAIL — không export `currentMonthPeriod` / `paramsOfPeriod`; `defaultPeriod` chưa tồn tại.

- [ ] **Step 3: Sửa `fe/src/components/shared/PeriodFilter.tsx`**

Đổi `buildPreset` thành export `paramsOfPeriod` (giữ nguyên thân hàm), thêm `currentMonthPeriod`, thêm 2 prop:

```tsx
interface PeriodFilterProps {
  onFilter: (params: PeriodFilterParams) => void;
  loading?: boolean;
  /** Bật: đổi kiểu xem / ngày là query ngay và ẩn nút "Xem báo cáo". */
  autoApply?: boolean;
  /** Kỳ chọn sẵn lúc mở trang (vd 'thang7', 'tuyChon'). Mặc định 'namNay'. */
  defaultPeriod?: string;
  /** Khoảng ngày điền sẵn khi defaultPeriod = 'tuyChon'. */
  defaultCustomRange?: [Dayjs, Dayjs];
}

/** Key kỳ của tháng hiện tại — dùng cho trang muốn mặc định "tháng này". */
export function currentMonthPeriod(): string {
  return `thang${new Date().getMonth() + 1}`;
}

/** Khoảng ngày của một kỳ trong danh sách. Trang dùng để tính state khởi tạo. */
export function paramsOfPeriod(period: string): PeriodFilterParams {
  // ... giữ nguyên thân hàm buildPreset hiện tại ...
}

export function PeriodFilter({
  onFilter,
  loading,
  autoApply,
  defaultPeriod,
  defaultCustomRange,
}: PeriodFilterProps) {
  const [period, setPeriod] = useState(defaultPeriod ?? 'namNay');
  const [customFrom, setCustomFrom] = useState<Dayjs | null>(
    defaultCustomRange?.[0] ?? dayjs().startOf('month'),
  );
  const [customTo, setCustomTo] = useState<Dayjs | null>(defaultCustomRange?.[1] ?? dayjs());
  // ... phần còn lại giữ nguyên ...
}
```

Trong phần render, 2 `DatePicker` thêm `format="DD/MM/YYYY"`:

```tsx
          <DatePicker value={customFrom} onChange={handleFromChange} placeholder="Từ ngày" format="DD/MM/YYYY" style={{ width: 140 }} />
          <DatePicker value={customTo} onChange={handleToChange} placeholder="Đến ngày" format="DD/MM/YYYY" style={{ width: 140 }} />
```

Mọi lời gọi `buildPreset(...)` bên trong component đổi thành `paramsOfPeriod(...)`.

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/components/shared/PeriodFilter.test.tsx`
Expected: PASS (8 test).

- [ ] **Step 5: Chắc chắn Báo cáo tài chính không vỡ**

Run: `cd fe && npx vitest run src/pages/bao-cao/tai-chinh/ && npx eslint src/components/shared/PeriodFilter.tsx`
Expected: test PASS, lint sạch. `BaoCaoTaiChinhPage.tsx` KHÔNG sửa gì.

- [ ] **Step 6: Commit**

```bash
git add fe/src/components/shared/PeriodFilter.tsx fe/src/components/shared/PeriodFilter.test.tsx
git commit -m "$(cat <<'EOF'
feat(period-filter): nhận kỳ khởi tạo từ ngoài (defaultPeriod, defaultCustomRange)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Kỳ khởi tạo của Sổ chi tiết từ query param

**Files:**
- Modify: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.ts`
- Test: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.test.ts`

**Interfaces:**
- Consumes: Task 1 — `currentMonthPeriod()`, `paramsOfPeriod(period)`.
- Produces:
  ```ts
  export interface InitialPeriod {
    period: string;                     // 'thang7' | 'tuyChon'
    range: [Dayjs, Dayjs];              // khoảng ngày ban đầu của trang
    customRange?: [Dayjs, Dayjs];       // chỉ có khi period === 'tuyChon'
  }
  export function initialPeriod(get: (key: string) => string | null): InitialPeriod
  ```

- [ ] **Step 1: Viết test thất bại — thêm vào `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.test.ts`**

Thêm import (`initialPeriod` + `dayjs`) và:

```ts
describe('initialPeriod', () => {
  it('không có param → tháng hiện tại, không có customRange', () => {
    const p = initialPeriod(getterFrom({}));
    expect(p.period).toBe(`thang${new Date().getMonth() + 1}`);
    expect(p.range[0].format('DD/MM/YYYY')).toBe(dayjs().startOf('month').format('DD/MM/YYYY'));
    expect(p.range[1].format('DD/MM/YYYY')).toBe(dayjs().endOf('month').format('DD/MM/YYYY'));
    expect(p.customRange).toBeUndefined();
  });

  it('có startDate/endDate (drill-down) → tuyChon + đúng khoảng ngày của link', () => {
    const p = initialPeriod(
      getterFrom({
        maTaiKhoan: '131',
        startDate: '2024-03-01T00:00:00.000Z',
        endDate: '2024-03-31T23:59:59.999Z',
      }),
    );
    expect(p.period).toBe('tuyChon');
    expect(p.range[0].format('DD/MM/YYYY')).toBe('01/03/2024');
    expect(p.range[1].format('DD/MM/YYYY')).toBe('31/03/2024');
    expect(p.customRange![0].format('DD/MM/YYYY')).toBe('01/03/2024');
  });

  it('ngày trên link không hợp lệ → quay về tháng hiện tại', () => {
    const p = initialPeriod(getterFrom({ startDate: 'khong-phai-ngay', endDate: 'xxx' }));
    expect(p.period).toBe(`thang${new Date().getMonth() + 1}`);
    expect(p.customRange).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.test.ts`
Expected: FAIL — `initialPeriod` không tồn tại.

- [ ] **Step 3: Thêm `initialPeriod` vào `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.ts`**

```ts
import dayjs, { type Dayjs } from 'dayjs';
import { currentMonthPeriod, paramsOfPeriod } from '@/components/shared/PeriodFilter';

export interface InitialPeriod {
  /** Kỳ hiện trên dropdown lúc mở trang. */
  period: string;
  /** Khoảng ngày trang dùng để gọi API. */
  range: [Dayjs, Dayjs];
  /** Chỉ có khi mở từ link drill-down (period = 'tuyChon'). */
  customRange?: [Dayjs, Dayjs];
}

/**
 * Kỳ khởi tạo của trang Sổ chi tiết.
 * Mở từ link drill-down (có startDate/endDate hợp lệ) → "Tùy chọn" + đúng khoảng ngày của link,
 * để dropdown khớp với dữ liệu đang xem. Còn lại → tháng hiện tại.
 */
export function initialPeriod(get: (key: string) => string | null): InitialPeriod {
  const { startDate, endDate } = parseReportParams(get);
  const start = startDate ? dayjs(startDate) : null;
  const end = endDate ? dayjs(endDate) : null;

  if (start?.isValid() && end?.isValid()) {
    return { period: 'tuyChon', range: [start, end], customRange: [start, end] };
  }

  const period = currentMonthPeriod();
  const p = paramsOfPeriod(period);
  return { period, range: [dayjs(p.startDate), dayjs(p.endDate)] };
}
```

- [ ] **Step 4: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.test.ts`
Expected: PASS (test cũ của `parseReportParams` + 3 test mới).

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.ts fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/reportParams.test.ts
git commit -m "$(cat <<'EOF'
feat(so-chi-tiet): initialPeriod — kỳ khởi tạo từ query param (drill-down → Tùy chọn)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Thay RangePicker bằng PeriodFilter trên trang Sổ chi tiết

**Files:**
- Modify: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx`

**Interfaces:**
- Consumes: Task 1 (`PeriodFilter`, `PeriodFilterParams`), Task 2 (`initialPeriod`).
- Produces: không có API mới.

- [ ] **Step 1: Đổi phần khởi tạo state**

Bỏ `const { RangePicker } = DatePicker;` và import `DatePicker` nếu không còn dùng chỗ nào khác trong file (grep `DatePicker` trước khi xoá). Thêm import:

```tsx
import { PeriodFilter, type PeriodFilterParams } from '@/components/shared/PeriodFilter';
import { initialPeriod, parseReportParams } from './reportParams';
```

Thay khởi tạo `range` (hiện là `dayjs().startOf('month')` … `endOf('month')`) bằng kỳ tính đồng bộ từ query param — đặt NGAY SAU `const [searchParams] = useSearchParams();`:

```tsx
  // Tính kỳ khởi tạo đồng bộ từ query param để dropdown khớp dữ liệu ngay lần render đầu
  // (mở từ link drill-down → "Tùy chọn" + đúng khoảng ngày của link).
  const [initial] = useState(() => initialPeriod(searchParams.get.bind(searchParams)));
  const [range, setRange] = useState<[Dayjs, Dayjs]>(initial.range);
```

- [ ] **Step 2: Bỏ `setRange` trùng trong effect drill-down**

Trong `useEffect` drill-down (chạy 1 lần lúc mount), xoá dòng `setRange([start, end]);` — `range` đã được khởi tạo đúng ở Step 1. Giữ nguyên `setMaTaiKhoans`, `setMaDoiTuong` và phần gọi API (`soChiTietTaiKhoanService.getReport(...)` vẫn dùng `start`/`end` cục bộ như hiện tại).

- [ ] **Step 3: Thay RangePicker bằng PeriodFilter trong FilterBar**

Trong `filters={...}`, thay khối:

```tsx
            <RangePicker
              value={range}
              format="DD/MM/YYYY"
              onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
              allowClear={false}
            />
```

bằng:

```tsx
            <PeriodFilter
              autoApply
              defaultPeriod={initial.period}
              defaultCustomRange={initial.customRange}
              onFilter={(p: PeriodFilterParams) => setRange([dayjs(p.startDate), dayjs(p.endDate)])}
            />
```

`autoApply` → không hiện nút "Xem báo cáo" của PeriodFilter; nút **Xem** của trang (gọi `loadReport`) giữ nguyên là chỗ duy nhất gọi API.

- [ ] **Step 4: Kiểm tra biên dịch + lint + test**

Run: `cd fe && npx eslint src/pages/bao-cao/so-chi-tiet-tai-khoan/ && npx vitest run src/pages/bao-cao/so-chi-tiet-tai-khoan/ && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "so-chi-tiet" || echo "không lỗi TS ở so-chi-tiet"`
Expected: lint sạch, test PASS, không lỗi TS ở thư mục này. (Repo có sẵn ~169 lỗi tsc ở file khác — chỉ cần không thêm lỗi mới.)

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx
git commit -m "$(cat <<'EOF'
feat(so-chi-tiet): chọn kỳ bằng PeriodFilter như báo cáo tài chính (mặc định tháng này)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Kiểm chứng end-to-end

- [ ] **Step 1: Chạy toàn bộ test + build**

Run: `cd fe && npm test && npm run build`
Expected: toàn bộ test PASS, build thành công.

- [ ] **Step 2: Kiểm tra tay trên dev server**

Run: `cd fe && npm run dev` (cổng 8080).

1. Mở **Báo cáo → Sổ chi tiết tài khoản**: dropdown kỳ hiện **Tháng hiện tại**; chọn tài khoản → bấm **Xem** → có dữ liệu đúng tháng.
2. Đổi kỳ sang "Tháng 6" → bảng KHÔNG tự tải lại (đúng thiết kế); bấm **Xem** mới tải.
3. Chọn **Tùy chọn** → hiện 2 ô Từ ngày / Đến ngày, nhập khoảng ngày bất kỳ (kể cả năm khác) → bấm **Xem** → dữ liệu đúng.
4. Vào **Báo cáo tài chính**, drill-down vào một tài khoản → trang Sổ chi tiết mở ra với dropdown hiện **Tùy chọn** và đúng khoảng ngày của báo cáo, dữ liệu khớp.
5. Trang **Báo cáo tài chính** vẫn hoạt động như cũ (mặc định "Năm nay", đổi kỳ là tải lại ngay).

---

## Self-Review

**Spec coverage:**
- Thay RangePicker bằng PeriodFilter, `autoApply`, nút Xem giữ nguyên → Task 3 ✓
- Kỳ mặc định = tháng hiện tại → Task 1 (`currentMonthPeriod`) + Task 2 + Task 3 ✓
- Drill-down hiện "Tùy chọn" + đúng ngày → Task 2 (`initialPeriod`) + Task 3 ✓
- `PeriodFilter` thêm `defaultPeriod`/`defaultCustomRange`, export `currentMonthPeriod`/`paramsOfPeriod`, không đổi hành vi cũ → Task 1 ✓
- Test PeriodFilter + reportParams → Task 1, Task 2 ✓; Báo cáo tài chính không vỡ → Task 1 Step 5, Task 4 Step 2 ✓

**Type consistency:** `PeriodFilterParams`, `InitialPeriod`, `currentMonthPeriod()`, `paramsOfPeriod()`, `initialPeriod()` dùng thống nhất giữa các task; `range`/`customRange` đều là `[Dayjs, Dayjs]`.
