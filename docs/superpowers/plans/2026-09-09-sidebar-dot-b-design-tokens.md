# Đợt B — Đồng bộ giao diện toàn dự án

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa cả 257 trang về đúng ngôn ngữ hình ảnh của `docs/design/screens/07-design-system.png` — bo góc mềm, nền sáng, mật độ cao — bằng cách đổi token dùng chung thay vì sửa từng trang.

**Architecture:** Ba tầng theo thứ tự. Tầng 1 đổi biến CSS + `ConfigProvider` (2 file, cả app đổi theo). Tầng 2 sửa các mẫu trang dùng chung. Tầng 3 quét những trang tự đặt màu/bo góc cứng và quy về token. Tầng sau chỉ dọn phần tầng trước không với tới.

**Tech Stack:** Tailwind (biến HSL trong `index.css`) · antd 5 `ConfigProvider` · vitest

**Spec:** `docs/superpowers/specs/2026-09-09-sidebar-menu-redesign-design.md` §12

**Phụ thuộc:** Đợt A đã xong và xanh.

## Global Constraints

- **Không đổi logic nghiệp vụ.** Chỉ màu, bo góc, cỡ chữ, khoảng cách. Không đụng cột bảng, filter, phân trang, gọi API, công thức.
- `--primary` **giữ nguyên** `170 59% 29%` — trùng `#1F7769` của thiết kế, đổi là hỏng nhận diện.
- Đợt này **được phép** làm thay đổi diện mạo mọi trang. Đó là mục đích. Nhưng không được làm **mất chữ, mất cột, mất nút** ở bất kỳ trang nào.
- Tất cả giá trị lấy từ bảng token spec §12.1. Không tự chế màu mới.
- Chạy trong `fe/`. Nghiệm thu: `npm test` · `npm run lint` · `npm run build`.

---

## File Structure

**Sửa**
| File | Sửa gì |
|---|---|
| `src/index.css` | khối `:root` và `.dark`: bo góc, nền, viền, sidebar sáng, thêm token ink/blue/green/red/amber/chart |
| `src/App.tsx:104-127` | `ConfigProvider.theme.token`: borderRadius, fontSize |
| `src/components/layout/SectionNav.tsx` | bo 7px, cao 24px, chữ 11px |
| `src/components/layout/sidebar/*.tsx` | đổi `--sidebar-background` cũ sang token rail/panel mới |
| `src/config/tableTitleConfig.ts` | cỡ chữ tiêu đề bảng theo thang mới |
| `src/pages/**` | chỉ những file có màu/bo góc cứng — danh sách đo ở Task 1 |

**Tạo**
| File | Trách nhiệm |
|---|---|
| `src/index.css` (khối mới) | biến token — không tạo file riêng, giữ một nguồn |
| `docs/superpowers/plans/kiem-ke-mau-cung.md` | kết quả đo Task 1, dùng làm danh sách việc cho Task 6 |

---

### Task 1: Đo hiện trạng — kiểm kê màu cứng

**Files:**
- Create: `docs/superpowers/plans/kiem-ke-mau-cung.md`

**Interfaces:**
- Produces: danh sách file + số lần vi phạm, là đầu vào bắt buộc của Task 6

Không có test — đây là bước đo, kết quả là một tài liệu.

- [ ] **Step 1: Đếm**

```bash
cd fe
{
  echo "# Kiểm kê màu / bo góc cứng — đo trước đợt B"
  echo
  echo "Ngày đo: $(date +%F) · commit: $(git rev-parse --short HEAD)"
  echo
  echo '## Mã màu hex viết thẳng trong src/pages'
  grep -rn --include=*.tsx --include=*.ts -E "#[0-9a-fA-F]{3,8}\b" src/pages | wc -l
  echo
  echo '### Theo file (20 file nhiều nhất)'
  grep -rln --include=*.tsx --include=*.ts -E "#[0-9a-fA-F]{3,8}\b" src/pages \
    | while read f; do echo "$(grep -cE '#[0-9a-fA-F]{3,8}\b' "$f") $f"; done \
    | sort -rn | head -20
  echo
  echo '## borderRadius đặt cứng'
  grep -rn --include=*.tsx --include=*.ts "borderRadius" src/pages | wc -l
  echo
  echo '## class Tailwind màu tuỳ ý (bg-[# / text-[#)'
  grep -rn --include=*.tsx -E "(bg|text|border)-\[#" src/pages | wc -l
} > ../docs/superpowers/plans/kiem-ke-mau-cung.md
cat ../docs/superpowers/plans/kiem-ke-mau-cung.md
```

- [ ] **Step 2: Phân loại tay**

Mở file vừa tạo, thêm một cột đánh dấu cho 20 file đầu:
- `GIỮ` — màu có nghĩa nghiệp vụ mà token không diễn tả được (ví dụ màu riêng của từng đường trên biểu đồ).
- `ĐỔI` — màu trang trí, phải quy về token.

Chỉ file `ĐỔI` mới vào việc ở Task 6.

- [ ] **Step 3: Commit**

```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git add docs/superpowers/plans/kiem-ke-mau-cung.md
git commit -m "docs: kiểm kê màu cứng trước khi đổi token"
```

---

### Task 2: Đổi token trong `index.css`

**Files:**
- Modify: `fe/src/index.css` (khối `@layer base { :root { ... } }` và `.dark`)
- Test: `fe/src/index.css.test.ts`

**Interfaces:**
- Produces: các biến `--radius`, `--radius-card`, `--radius-modal`, `--ink`, `--ink-2`, `--ink-3`, `--blue`, `--blue-soft`, `--green`, `--red`, `--amber`, `--chart-orange`, `--chart-navy`, `--chart-gold`, `--sidebar-panel`

- [ ] **Step 1: Viết test (đỏ)**

Token là hợp đồng dùng chung, đáng có test giữ — đổi nhầm một dòng là lệch cả app mà không ai báo.

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(__dirname, './index.css'), 'utf8');
const goc = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));

const bien = (ten: string): string | undefined =>
  goc.match(new RegExp(`--${ten}:\\s*([^;]+);`))?.[1].trim();

describe('design token', () => {
  it('bo góc theo thiết kế mới', () => {
    expect(bien('radius')).toBe('0.4375rem');
    expect(bien('radius-card')).toBe('9px');
    expect(bien('radius-modal')).toBe('14px');
  });

  it('màu thương hiệu KHÔNG đổi', () => {
    expect(bien('primary')).toBe('170 59% 29%');
  });

  it('sidebar chuyển sang tông sáng', () => {
    expect(bien('sidebar-background')).toBe('240 5% 94%');
    expect(bien('sidebar-panel')).toBe('0 0% 98%');
  });

  it('có đủ thang chữ ink', () => {
    expect(bien('ink')).toBeDefined();
    expect(bien('ink-2')).toBeDefined();
    expect(bien('ink-3')).toBeDefined();
  });

  it('có màu tăng / giảm / cảnh báo', () => {
    expect(bien('green')).toBeDefined();
    expect(bien('red')).toBeDefined();
    expect(bien('amber')).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/index.css.test.ts`
Expected: FAIL — `--radius` đang là `0px`

- [ ] **Step 3: Sửa `:root`**

Đổi các dòng có sẵn:

```css
    /* Nền trang #F5F5F7 */
    --background: 240 6% 96%;
    /* Viền #E5E5EA */
    --border: 240 9% 91%;
    --input: 240 9% 91%;

    /* Bo góc: nút & ô nhập 7px · thẻ & bảng 9px · modal 14px */
    --radius: 0.4375rem;
    --radius-card: 9px;
    --radius-modal: 14px;

    /* Sidebar sáng — rail #EFEFF2, panel #FAFAFA */
    --sidebar-background: 240 5% 94%;
    --sidebar-panel: 0 0% 98%;
    --sidebar-foreground: 240 3% 12%;
    --sidebar-primary: 170 59% 29%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 6% 90%;
    --sidebar-accent-foreground: 240 3% 12%;
    --sidebar-border: 240 9% 91%;
    --sidebar-ring: 170 59% 29%;
```

Thêm khối mới ngay dưới, trước dấu `}` đóng `:root`:

```css
    /* Thang chữ — #1D1D1F / #6E6E73 / #98989D */
    --ink: 240 4% 12%;
    --ink-2: 240 2% 44%;
    --ink-3: 240 2% 60%;

    /* Link, mã chứng từ — #007AFF / #E8F2FF */
    --blue: 211 100% 50%;
    --blue-soft: 213 100% 95%;

    /* Tăng / giảm / cảnh báo — #1F9254 / #D93025 / #B26A00 */
    --green: 148 65% 35%;
    --red: 4 71% 50%;
    --amber: 36 100% 35%;

    /* Biểu đồ — #F2994A / #1F3864 / #C9A227 */
    --chart-orange: 28 87% 62%;
    --chart-navy: 220 51% 26%;
    --chart-gold: 45 71% 47%;
```

- [ ] **Step 4: Sửa `.dark` cho khớp**

Trong khối `.dark`, thay khối `--sidebar-*` cũ bằng bản tối tương ứng và thêm cùng bộ token mới với giá trị hợp tông tối:

```css
    --sidebar-background: 240 5% 12%;
    --sidebar-panel: 240 5% 14%;
    --sidebar-foreground: 0 0% 92%;
    --sidebar-accent: 240 5% 20%;
    --sidebar-border: 240 5% 22%;

    --ink: 0 0% 96%;
    --ink-2: 240 3% 70%;
    --ink-3: 240 3% 52%;
    --blue: 211 100% 62%;
    --blue-soft: 213 40% 22%;
    --green: 148 50% 48%;
    --red: 4 71% 62%;
    --amber: 36 80% 55%;
    --chart-orange: 28 87% 62%;
    --chart-navy: 220 45% 55%;
    --chart-gold: 45 71% 55%;
```

`--radius*` khai một lần ở `:root`, `.dark` không cần lặp.

- [ ] **Step 5: Chạy test**

Run: `cd fe && npx vitest run src/index.css.test.ts`
Expected: PASS, 5 test.

- [ ] **Step 6: Commit**

```bash
cd fe
git add src/index.css src/index.css.test.ts
git commit -m "feat(ui): đổi design token — bo góc mềm, sidebar sáng, thang màu mới"
```

---

### Task 3: Đổi `ConfigProvider` của antd

**Files:**
- Modify: `fe/src/App.tsx:104-127`

**Interfaces:**
- Consumes: token ở Task 2
- Produces: mọi component antd (Button, Input, Select, Table, Modal, Card…) nhận bo góc và cỡ chữ mới

- [ ] **Step 1: Sửa `theme.token`**

```tsx
theme={{
  token: {
    // Màu thương hiệu MasterCEO — giữ nguyên.
    colorPrimary: '#1f7769',
    // Bo góc theo 07-design-system: nút/ô nhập 7 · thẻ/bảng 9 · nhỏ 6.
    borderRadius: 7,
    borderRadiusLG: 9,
    borderRadiusSM: 6,
    borderRadiusXS: 4,
    // Mật độ cao: nội dung bảng 11px.
    fontSize: 11,
    // Chiều cao control giữ như đợt trước.
    controlHeight: 28,
    controlHeightSM: 24,
    controlHeightLG: 36,
    colorBorder: '#E5E5EA',
    colorText: '#1D1D1F',
    colorTextSecondary: '#6E6E73',
    colorTextTertiary: '#98989D',
    colorBgLayout: '#F5F5F7',
  },
  components: {
    Card: { headerPadding: 12, bodyPadding: 12, borderRadiusLG: 9 },
    Modal: { borderRadiusLG: 14 },
    Table: { borderRadius: 9, headerBorderRadius: 9, cellPaddingBlockSM: 3 },
  },
}}
```

- [ ] **Step 2: Chạy build và xem bằng mắt**

```bash
cd fe && npm run build && npm run dev
```

Mở 4 trang đại diện và đối chiếu với `docs/design/screens/`:
- `/` (dashboard) → `01-dashboard-tong-quan.png`
- `/cong-no/phai-thu` → `02-cong-no-phai-thu.png`
- `/chung-tu/phieu-thu`, mở modal thêm → `03-modal-phieu-thu.png`
- `/danh-muc`

Kiểm: nút bo tròn nhẹ chứ không vuông · bảng có góc bo · modal bo rõ hơn nút · chữ bảng nhỏ lại nhưng vẫn đọc được · **không mất cột, không mất nút**.

- [ ] **Step 3: Commit**

```bash
cd fe
git add src/App.tsx
git commit -m "feat(ui): ConfigProvider theo bo góc và mật độ chữ mới"
```

---

### Task 4: Mẫu trang — `SectionNav` và tiêu đề trang

**Files:**
- Modify: `fe/src/components/layout/SectionNav.tsx:44-66`
- Test: `fe/src/components/layout/SectionNav.test.tsx`

**Interfaces:**
- Consumes: token Task 2
- Produces: thanh ngang thống nhất ở 3 nhóm trang (Chứng từ, Kho, Thuế, Bán hàng)

- [ ] **Step 1: Viết test giữ hành vi lọc quyền**

Đợt này chỉ đổi lớp CSS, nên test phải chốt rằng **hành vi không đổi**:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SectionNav } from './SectionNav';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { isSuperAdmin: false },
    hasPermission: (p: string) => p === '/kho/nhap-kho:xem',
  }),
}));

describe('SectionNav', () => {
  const items = [
    { label: 'Nhập kho', path: '/kho/nhap-kho' },
    { label: 'Xuất kho', path: '/kho/xuat-kho' },
  ];

  it('ẩn mục không có quyền', () => {
    render(<MemoryRouter><SectionNav items={items} /></MemoryRouter>);
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.queryByText('Xuất kho')).toBeNull();
  });

  it('đánh dấu mục đang mở', () => {
    render(
      <MemoryRouter initialEntries={['/kho/nhap-kho']}>
        <SectionNav items={items} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nhập kho').closest('button')!.className)
      .toContain('bg-[hsl(var(--primary))]');
  });
});
```

- [ ] **Step 2: Chạy — test phải ĐỎ ở assertion thứ hai**

Run: `cd fe && npx vitest run src/components/layout/SectionNav.test.tsx`
Expected: test 1 PASS (hành vi sẵn có), test 2 FAIL vì class hiện tại là `bg-primary`.

- [ ] **Step 3: Đổi lớp CSS trong `SectionNav.tsx`**

Thay `className` của `<button>`:

```tsx
className={`flex h-[24px] shrink-0 items-center gap-[6px] rounded-[7px] px-[10px] text-[11px] font-medium transition-colors ${
  active
    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
    : "text-[hsl(var(--ink-2))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--ink))]"
}`}
```

và của thẻ bọc:

```tsx
className={`flex items-center gap-[6px] overflow-x-auto border-b border-[hsl(var(--border))] pb-[6px] ${className ?? ""}`}
```

**Không** đụng mảng `visible`, `getRoutePermission`, hay điều kiện `active`.

- [ ] **Step 4: Chạy test**

Run: `cd fe && npx vitest run src/components/layout/SectionNav.test.tsx`
Expected: PASS, 2 test.

- [ ] **Step 5: Commit**

```bash
cd fe
git add src/components/layout/SectionNav.tsx src/components/layout/SectionNav.test.tsx
git commit -m "style(ui): SectionNav theo mật độ và bo góc mới"
```

---

### Task 5: Mẫu trang — badge trạng thái và hàng nút hành động

**Files:**
- Create: `fe/src/components/ui/StatusPill.tsx`
- Create: `fe/src/components/ui/StatusPill.test.tsx`
- Modify: `fe/src/index.css` (thêm lớp `.action-icon-btn`)

**Interfaces:**
- Produces:
  - `<StatusPill tone="ok" | "cho" | "tu-choi" | "nhap" | "dang" | "trung-tinh">{children}</StatusPill>`
  - lớp `.action-icon-btn` dùng cho hàng nút thêm/sửa/xoá/xuất/làm mới

Sáu tông lấy từ `07-design-system.png`: Đã duyệt (xanh lá) · Chờ duyệt (cam) · Từ chối (đỏ) · Nháp (xám) · Đang xử lý (xanh dương) · trung tính.

- [ ] **Step 1: Viết test (đỏ)**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('vẽ nội dung được truyền vào', () => {
    render(<StatusPill tone="ok">Đã duyệt</StatusPill>);
    expect(screen.getByText('Đã duyệt')).toBeTruthy();
  });

  it('mỗi tông một bộ màu riêng', () => {
    const { container: a } = render(<StatusPill tone="ok">A</StatusPill>);
    const { container: b } = render(<StatusPill tone="tu-choi">B</StatusPill>);
    expect(a.firstElementChild!.className).not.toBe(b.firstElementChild!.className);
  });

  it('tông lạ rơi về trung tính thay vì vỡ', () => {
    // @ts-expect-error kiểm tra phòng thủ khi dữ liệu từ API lệch
    render(<StatusPill tone="khong-co">C</StatusPill>);
    expect(screen.getByText('C')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/components/ui/StatusPill.test.tsx`
Expected: FAIL — không resolve được `./StatusPill`

- [ ] **Step 3: Viết component**

```tsx
import React from 'react';

export type PillTone = 'ok' | 'cho' | 'tu-choi' | 'nhap' | 'dang' | 'trung-tinh';

const TONE: Record<PillTone, string> = {
  ok: 'bg-[hsl(var(--green)/0.12)] text-[hsl(var(--green))]',
  cho: 'bg-[hsl(var(--amber)/0.12)] text-[hsl(var(--amber))]',
  'tu-choi': 'bg-[hsl(var(--red)/0.12)] text-[hsl(var(--red))]',
  nhap: 'bg-[hsl(var(--muted))] text-[hsl(var(--ink-2))]',
  dang: 'bg-[hsl(var(--blue-soft))] text-[hsl(var(--blue))]',
  'trung-tinh': 'bg-[hsl(var(--muted))] text-[hsl(var(--ink-2))]',
};

/** Nhãn trạng thái dạng viên thuốc — một kiểu duy nhất cho cả dự án. */
export const StatusPill: React.FC<{
  tone: PillTone;
  children: React.ReactNode;
}> = ({ tone, children }) => (
  <span
    className={`inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-medium leading-none ${
      TONE[tone] ?? TONE['trung-tinh']
    }`}
  >
    {children}
  </span>
);

export default StatusPill;
```

- [ ] **Step 4: Thêm lớp nút hành động vào `index.css`**

```css
/* Hàng nút biểu tượng ở đầu bảng — thêm / sửa / xoá / xuất / làm mới. */
.action-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  color: hsl(var(--ink-2));
  transition: background-color 0.15s, color 0.15s;
}
.action-icon-btn:hover {
  background: hsl(var(--muted));
  color: hsl(var(--ink));
}
.action-icon-btn--danger:hover {
  color: hsl(var(--red));
}
```

- [ ] **Step 5: Chạy test**

Run: `cd fe && npx vitest run src/components/ui/StatusPill.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 6: Commit**

```bash
cd fe
git add src/components/ui/StatusPill.tsx src/components/ui/StatusPill.test.tsx src/index.css
git commit -m "feat(ui): StatusPill và lớp nút hành động dùng chung"
```

---

### Task 6: Quét màu cứng trong `src/pages`

**Files:**
- Modify: các file đánh dấu `ĐỔI` trong `docs/superpowers/plans/kiem-ke-mau-cung.md` (Task 1)

**Interfaces:**
- Consumes: token Task 2, `StatusPill` Task 5
- Produces: giảm số lần vi phạm; con số cuối ghi lại vào file kiểm kê

Làm **từng file một, commit từng file**. Không gộp — sửa màu hàng loạt bằng `sed` rất dễ đổi nhầm màu có nghĩa nghiệp vụ.

- [ ] **Step 1: Bảng quy đổi**

| Màu cứng | Thay bằng |
|---|---|
| `#1f7769`, `#1F7769` | `hsl(var(--primary))` |
| `#52c41a`, `#389e0d`, `green` | `hsl(var(--green))` |
| `#ff4d4f`, `#f5222d`, `red` | `hsl(var(--red))` |
| `#faad14`, `#fa8c16`, `orange` | `hsl(var(--amber))` |
| `#1890ff`, `#096dd9` | `hsl(var(--blue))` |
| `#000`, `#000000`, `#333` | `hsl(var(--ink))` |
| `#666`, `#8c8c8c` | `hsl(var(--ink-2))` |
| `#bfbfbf`, `#d9d9d9` | `hsl(var(--ink-3))` hoặc `hsl(var(--border))` |
| `#f0f0f0`, `#fafafa` (nền) | `hsl(var(--muted))` |
| `borderRadius: 0` / `4` / `6` | bỏ hẳn, để `ConfigProvider` quyết |

Màu **biểu đồ** giữ nguyên nếu đang phân biệt các đường; nếu chỉ là màu trang trí thì đổi sang `--chart-orange` / `--chart-navy` / `--chart-gold`.

- [ ] **Step 2: Với mỗi file `ĐỔI`, làm đủ vòng này**

```bash
cd fe
F=src/pages/<đường-dẫn-file>
grep -nE "#[0-9a-fA-F]{3,8}\b|borderRadius" "$F"     # xem từng chỗ
# sửa tay theo bảng quy đổi
npx vitest run --related "$F"                          # test liên quan (nếu có)
npm run lint -- "$F"
git add "$F" && git commit -m "style(ui): $F dùng token thay màu cứng"
```

- [ ] **Step 3: Đo lại và ghi vào kiểm kê**

```bash
cd fe
echo "## Sau đợt B — $(date +%F)" >> ../docs/superpowers/plans/kiem-ke-mau-cung.md
grep -rn --include=*.tsx --include=*.ts -E "#[0-9a-fA-F]{3,8}\b" src/pages | wc -l \
  >> ../docs/superpowers/plans/kiem-ke-mau-cung.md
```

Ghi thêm một dòng giải thích những chỗ **cố ý giữ** màu cứng và vì sao.

- [ ] **Step 4: Commit**

```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git add docs/superpowers/plans/kiem-ke-mau-cung.md
git commit -m "docs: số liệu màu cứng sau đợt B"
```

---

### Task 7: Nghiệm thu cả đợt B

**Files:** không sửa gì — chỉ kiểm.

- [ ] **Step 1: Kiểm tự động**

```bash
cd fe
npm test && npm run lint && npm run build
npx tsc --noEmit 2>&1 | wc -l
```

Expected: xanh cả ba; số lỗi `tsc` ≤ baseline.

- [ ] **Step 2: Kiểm bằng mắt — 10 trang đại diện**

`npm run dev`, mở lần lượt và so với ảnh trong `docs/design/screens/`:

1. `/` — dashboard 5 tab
2. `/cong-no/phai-thu` — trang bảng nặng
3. `/chung-tu/phieu-thu` + modal thêm
4. `/danh-muc` — trang gộp
5. `/danh-muc/tai-khoan` — bảng cây
6. `/bao-cao/tai-chinh` — 4 tab
7. `/kho/nhap-kho` — có SectionNav
8. `/thue/tong-hop`
9. `/trung-tam-du-lieu/ke-hoach?tab=ban-hang`
10. Một trang `soon` bất kỳ

Mỗi trang kiểm: không mất cột · không mất nút · chữ không tràn · nền/viền/bo góc thống nhất · sidebar sáng ăn nhập với nội dung.

- [ ] **Step 3: Kiểm "không đụng logic"**

```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git diff --stat <commit-truoc-dot-B>..HEAD -- fe/src/services fe/src/hooks
```

Expected: rỗng, hoặc chỉ có file do đợt A tạo. Có file service đổi là dấu hiệu đã trượt ra ngoài phạm vi — xem lại.

- [ ] **Step 4: Deploy**

Deploy **cả đợt A và B cùng lúc** — người dùng chỉ thấy giao diện đổi một lần.
Theo memory "Deploy FE nguyên tử": build local → scp vào thư mục stage → `mv` → `index.html` sau cùng.
Verify tại `ketoan.masterceo.com.vn` (KHÔNG phải `masterceo.com.vn` — đó là Portal).
Sau deploy, mở bằng cửa sổ ẩn danh để chắc chắn không dính service worker cũ.
