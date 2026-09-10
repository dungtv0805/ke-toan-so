# Đồng bộ giao diện — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gom loading và bề rộng bảng của 26 trang danh mục về một chuẩn, đổi icon import/export sang SVG màu, và dựng bộ nhận diện app dùng chung cho `ke-toan-so` lẫn portal Identity.

**Architecture:** Hai component dùng chung gánh gần hết việc. `BangDuLieu` bọc `Table` của antd — nuốt prop `loading` để thay spinner bằng dải chạy 2px, đồng thời đặt sẵn `size="small"` và `scroll.x="max-content"`; 26 trang chỉ đổi tên thẻ. `OIconApp` dựng ô icon app từ `appId` + `size`, tự áp quy cách (bo góc 27% cạnh, glyph 55%, gradient 305°, nhánh riêng dưới 24px); mọi chỗ hiện icon app đều gọi nó. Glyph SVG nằm ở `design/icons/` làm nguồn, được chép tay thành component React trong từng repo.

**Tech Stack:** React 18 + TypeScript + Vite, antd 6, vitest 4 + @testing-library/react (jsdom khai theo từng file bằng `// @vitest-environment jsdom`), Tailwind + biến CSS trong `fe/src/index.css`.

**Spec:** `docs/superpowers/specs/2026-09-10-dong-bo-giao-dien-design.md`

## Global Constraints

- **Baseline FE xanh**: `cd fe && npx vitest run` hiện là **169 file / 1303 test, pass hết**. Mọi task phải giữ con số này không giảm. BE không đụng tới trong đợt này.
- **`tsc` vốn đã lỗi sẵn** ở cả FE lẫn BE, và `vite build` không typecheck — đừng lấy `tsc` sạch làm điều kiện hoàn thành, chỉ cần không thêm lỗi mới ở file mình sửa.
- **Ngôn ngữ**: mọi chú thích code, tên biến nghiệp vụ và message người dùng viết bằng tiếng Việt, theo đúng lối đang có trong repo (`gomTheoNhom`, `useCotCoGian`, `buTruDoc`).
- **`appId` là khoá SSO**, không được đổi: `ke-toan`, `giao-viec`, `nhan-su`.
- **Bo góc ô icon = 27% cạnh; glyph = 55% cạnh.** Làm tròn `Math.round`.
- **Gradient nền 305°**, hai hue lệch nhau 30–45°. Glyph trắng đặc, không viền, không đổ bóng.
- **Bóng ô** `0 5px 14px`, màu cuối của app ở 40% (hậu tố hex `66`).
- **Lớp sáng** radial trắng 40% ở góc trên-trái.
- **Dưới 24px**: bỏ gradient và lớp sáng, dùng màu đầu đặc.
- **Nền tối**: giữ nguyên màu app, KHÔNG đảo.
- **Cấm**: đặt glyph app này lên màu app khác — `appId` lạ phải rơi vào bộ màu trung tính riêng.
- **Bảng màu app** (đổi so với màu đơn sắc đang dùng):

  | appId | Màu đầu | Màu cuối | Nền thẻ |
  |---|---|---|---|
  | `ke-toan` | `#1FD1A3` | `#0E7490` | `#E9FBF5` |
  | `giao-viec` | `#4F8CFF` | `#7C3AED` | `#F0F3FF` |
  | `nhan-su` | `#FFA63D` | `#F2536D` | `#FFF3EC` |
  | (lạ) | `#8E8E93` | `#48484A` | `#F2F2F7` |

- **Cỡ ô icon**: 88 (trang chọn app), 64 (thẻ trong modal), 40 (đầu sidebar), 28 (thanh trên), 20 (danh sách), 16 (favicon).

## Bản đồ file

**Tạo mới — `ke-toan-so/fe`**

| File | Trách nhiệm |
|---|---|
| `src/components/table/BangDuLieu.tsx` | Bọc `Table`: dải loading, chuẩn `size`/`scroll` |
| `src/components/table/chuanBang.ts` | `tinhScroll()` — hàm thuần, test ở môi trường node |
| `src/components/table/__tests__/chuanBang.test.ts` | Test `tinhScroll` |
| `src/components/table/__tests__/BangDuLieu.render.test.tsx` | Test dựng component |
| `src/components/icons/ExcelIcons.tsx` | `IconNhapExcel`, `IconXuatExcel` |
| `src/components/icons/AppGlyphs.tsx` | 3 glyph app dạng component React |
| `src/components/icons/OIconApp.tsx` | Ô icon app theo quy cách |
| `src/components/icons/oIconApp.ts` | `quyCachO()` — hàm thuần tính bo góc/glyph/nền/bóng |
| `src/components/icons/__tests__/oIconApp.test.ts` | Test quy cách |
| `src/components/icons/IconLuoiApp.tsx` | Lưới 9 chấm |

**Sửa — `ke-toan-so/fe`**

| File | Việc |
|---|---|
| `src/index.css` | Thêm `.bdl-thanh` + keyframes ở cuối file |
| `src/components/import-danh-muc/ImportDanhMucButton.tsx` | Đổi icon |
| `src/components/export-danh-muc/ExportDanhMucButton.tsx` | Đổi icon |
| `src/components/layout/AppSwitcher.tsx` | Lưới 9 chấm + modal vẽ lại |
| `src/components/layout/MainLayout.tsx:204-294` | Header trái |
| 26 file trong `src/pages/danh-muc/` | `<Table` → `<BangDuLieu` |

**Sửa — `identity-service/portal`**

| File | Việc |
|---|---|
| `src/components/OIconApp.tsx` (mới) | Bản sao của `OIconApp` |
| `src/components/AppGlyphs.tsx` (mới) | Bản sao 3 glyph |
| `src/screens/AppPicker.tsx` | `APP_META` sang gradient, thẻ app 88px, header dấu M |

---

### Task 1: `tinhScroll` — hàm thuần chuẩn hoá `scroll`

> Tên file là `chuanBang.ts`, KHÔNG phải `bangDuLieu.ts`: hệ tệp macOS không
> phân biệt hoa thường, nên `bangDuLieu.ts` và `BangDuLieu.tsx` trỏ lẫn vào nhau
> và import ra `undefined`.

**Files:**
- Create: `fe/src/components/table/chuanBang.ts`
- Test: `fe/src/components/table/__tests__/chuanBang.test.ts`

**Interfaces:**
- Produces: `tinhScroll(buTruDoc: number, scroll?: TableProps<any>["scroll"]): { x: number | string; y: number | string }`

- [ ] **Step 1: Viết test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import { tinhScroll } from '../chuanBang';

describe('tinhScroll', () => {
  it('mặc định: cuộn ngang theo nội dung, cao theo bù trừ', () => {
    expect(tinhScroll(285)).toEqual({ x: 'max-content', y: 'calc(100vh - 285px)' });
  });

  it('bù trừ khác thì chỉ đổi chiều cao', () => {
    expect(tinhScroll(400)).toEqual({ x: 'max-content', y: 'calc(100vh - 400px)' });
  });

  it('trang ghi đè x thì giữ y mặc định — không phải khai lại cả cụm', () => {
    expect(tinhScroll(285, { x: 1600 })).toEqual({ x: 1600, y: 'calc(100vh - 285px)' });
  });

  it('trang ghi đè y thì giữ x mặc định', () => {
    expect(tinhScroll(285, { y: 300 })).toEqual({ x: 'max-content', y: 300 });
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn nó đỏ**

Run: `cd fe && npx vitest run src/components/table/__tests__/chuanBang.test.ts`
Expected: FAIL — `Failed to resolve import "../chuanBang"`

- [ ] **Step 3: Viết bản cài đặt tối thiểu**

```ts
import type { TableProps } from 'antd';

/** Bù trừ dọc mặc định — trang danh mục chuẩn: breadcrumb + FilterBar + phân trang. */
export const BU_TRU_DOC_MAC_DINH = 285;

/**
 * Chuẩn cuộn dùng chung cho bảng danh mục.
 *
 * `x: 'max-content'` thay cho các số 700/800/900/1400/1600 rải rác trước đây:
 * bảng ít cột không bị giãn toác, bảng nhiều cột vẫn cuộn ngang được — điều kiện
 * bắt buộc để cột ghim của antd hoạt động.
 *
 * Giá trị trang truyền vào luôn thắng, và thắng theo TỪNG khoá, nên trang chỉ
 * muốn đổi `x` thì không phải khai lại `y`.
 */
export function tinhScroll(
  buTruDoc: number,
  scroll?: TableProps<Record<string, unknown>>['scroll'],
) {
  return { x: 'max-content', y: `calc(100vh - ${buTruDoc}px)`, ...scroll };
}
```

- [ ] **Step 4: Chạy lại cho xanh**

Run: `cd fe && npx vitest run src/components/table/__tests__/chuanBang.test.ts`
Expected: PASS — 4 test

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/table/bangDuLieu.ts fe/src/components/table/__tests__/chuanBang.test.ts
git commit -m "feat(bang): tinhScroll — chuẩn cuộn dùng chung cho bảng danh mục"
```

---

### Task 2: `BangDuLieu` — dải loading thay spinner

**Files:**
- Create: `fe/src/components/table/BangDuLieu.tsx`
- Create: `fe/src/components/table/__tests__/BangDuLieu.render.test.tsx`
- Modify: `fe/src/index.css` (thêm vào **cuối file**)

**Interfaces:**
- Consumes: `tinhScroll`, `BU_TRU_DOC_MAC_DINH` từ Task 1
- Produces: `BangDuLieu<T>(props: BangDuLieuProps<T>)` với `BangDuLieuProps<T> = Omit<TableProps<T>, 'loading'> & { loading?: boolean; buTruDoc?: number }`

- [ ] **Step 1: Thêm CSS dải chạy vào cuối `fe/src/index.css`**

```css
/* ── Dải loading của BangDuLieu ───────────────────────────────────────────
   Thay cho spinner che bảng của antd: dữ liệu cũ ở nguyên chỗ, chỉ có dải
   mảnh chạy trên đầu. Khi rảnh dải vẫn chiếm đúng 2px (trong suốt) để bảng
   không nhảy lên xuống mỗi lần tải. */
.bdl-thanh {
  height: 2px;
  overflow: hidden;
  background: transparent;
}

.bdl-thanh[data-dang-tai='1']::after {
  content: '';
  display: block;
  height: 100%;
  width: 40%;
  background: hsl(var(--primary));
  animation: bdl-chay 1.1s ease-in-out infinite;
}

@keyframes bdl-chay {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(250%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bdl-thanh[data-dang-tai='1']::after {
    width: 100%;
    animation: none;
    opacity: 0.55;
  }
}
```

- [ ] **Step 2: Viết test đỏ**

```tsx
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ColumnsType } from 'antd/es/table';
import { BangDuLieu } from '../BangDuLieu';

// antd 6 gọi matchMedia lúc dựng; jsdom không có sẵn.
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
});

interface Dong {
  id: string;
  ten: string;
}

const COT: ColumnsType<Dong> = [{ title: 'Tên', dataIndex: 'ten', key: 'ten' }];
const DU_LIEU: Dong[] = [{ id: '1', ten: 'Cái' }];

const thanh = (c: HTMLElement) => c.querySelector('.bdl-thanh') as HTMLElement;

describe('BangDuLieu', () => {
  it('đang tải thì dải bật, và dữ liệu cũ VẪN nằm nguyên trên bảng', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} rowKey="id" loading />,
    );
    expect(thanh(container).dataset.dangTai).toBe('1');
    expect(screen.getByText('Cái')).toBeTruthy();
  });

  it('không tải thì dải tắt nhưng vẫn chiếm chỗ — bảng không nhảy', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} rowKey="id" />,
    );
    expect(thanh(container).dataset.dangTai).toBe('0');
    expect(thanh(container)).toBeTruthy();
  });

  it('KHÔNG rò `loading` xuống antd — không được có spinner che bảng', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} rowKey="id" loading />,
    );
    expect(container.querySelector('.ant-spin')).toBeNull();
  });

  it('lần tải đầu chưa có dòng nào thì không báo "không có dữ liệu"', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={[]} rowKey="id" loading />,
    );
    expect(container.textContent).not.toMatch(/No data|Không có dữ liệu/i);
  });

  it('tải xong mà thật sự rỗng thì vẫn phải báo cho người dùng biết', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={[]} rowKey="id" />,
    );
    expect(container.textContent).toMatch(/No data|Không có dữ liệu/i);
  });

  it('mọi bảng dùng dòng nhỏ', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} rowKey="id" />,
    );
    expect(container.querySelector('.ant-table-small')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Chạy để chắc chắn nó đỏ**

Run: `cd fe && npx vitest run src/components/table/__tests__/BangDuLieu.render.test.tsx`
Expected: FAIL — `Failed to resolve import "../BangDuLieu"`

- [ ] **Step 4: Viết bản cài đặt**

```tsx
import { Table } from 'antd';
import type { TableProps } from 'antd';
import { BU_TRU_DOC_MAC_DINH, tinhScroll } from './chuanBang';

export type BangDuLieuProps<T> = Omit<TableProps<T>, 'loading'> & {
  /** Đang nạp dữ liệu. KHÔNG truyền xuống antd — xem chú thích dưới. */
  loading?: boolean;
  /** Số px trừ khỏi 100vh để ra chiều cao vùng cuộn. Trang có thẻ thống kê
   *  phía trên thì truyền số lớn hơn. */
  buTruDoc?: number;
};

/**
 * Bảng dùng chung của các trang danh mục.
 *
 * Khác antd ở hai chỗ:
 *
 * 1. `loading` KHÔNG đi xuống `Table`. Spinner của antd che bảng và làm mờ dữ
 *    liệu đang xem; ở đây dữ liệu cũ nằm nguyên, chỉ có dải 2px chạy trên đầu.
 *    Kể cả lần tải đầu cũng vậy — không có nhánh skeleton.
 * 2. Đặt sẵn `size="small"` và chuẩn `scroll`, để 26 trang danh mục trông
 *    giống nhau thay vì mỗi trang một kiểu.
 *
 * Trang vẫn ghi đè được mọi prop (đổ `...props` sau), nhưng đừng ghi đè `size` —
 * đồng nhất dòng nhỏ chính là mục tiêu.
 */
export function BangDuLieu<T extends object>({
  loading = false,
  buTruDoc = BU_TRU_DOC_MAC_DINH,
  scroll,
  locale,
  ...props
}: BangDuLieuProps<T>) {
  const chuaCoDong = !props.dataSource || props.dataSource.length === 0;

  // Lần tải đầu bảng còn rỗng: để antd báo "không có dữ liệu" lúc này là nói sai,
  // vì chưa biết có hay không. Im lặng cho tới khi dữ liệu về.
  const localeHieuLuc = loading && chuaCoDong ? { ...locale, emptyText: ' ' } : locale;

  return (
    <div aria-busy={loading || undefined}>
      <div className="bdl-thanh" data-dang-tai={loading ? '1' : '0'} />
      <Table<T>
        size="small"
        scroll={tinhScroll(buTruDoc, scroll)}
        locale={localeHieuLuc}
        {...props}
      />
    </div>
  );
}

export default BangDuLieu;
```

- [ ] **Step 5: Chạy lại cho xanh**

Run: `cd fe && npx vitest run src/components/table/__tests__/BangDuLieu.render.test.tsx`
Expected: PASS — 6 test

- [ ] **Step 6: Chắc chắn không phá test canh design token**

Run: `cd fe && npx vitest run src/index.css.test.ts`
Expected: PASS — file test này cắt lát `:root` và `.dark`, CSS mới nằm cuối file nên không đụng.

- [ ] **Step 7: Commit**

```bash
git add fe/src/components/table/BangDuLieu.tsx fe/src/components/table/__tests__/BangDuLieu.render.test.tsx fe/src/index.css
git commit -m "feat(bang): BangDuLieu — dải loading mảnh thay spinner, chuẩn dòng nhỏ"
```

---

### Task 3: Trang mẫu `DonViTinhPage` — DỪNG LẠI CHỜ DUYỆT

Đây là chốt kiểm bằng mắt trước khi nhân ra 25 trang. `scroll.x = "max-content"`
khi bảng ít cột chưa được xác nhận là kéo đầy khung hay để thừa trắng bên phải —
phải nhìn thật, không suy từ tài liệu.

**Files:**
- Modify: `fe/src/pages/danh-muc/don-vi-tinh/DonViTinhPage.tsx:337-343`

**Interfaces:**
- Consumes: `BangDuLieu` từ Task 2

- [ ] **Step 1: Đổi import**

Bỏ `Table` khỏi cụm import antd ở đầu file (giữ nguyên các thứ khác), thêm:

```tsx
import { BangDuLieu } from '@/components/table/BangDuLieu';
```

- [ ] **Step 2: Đổi thẻ bảng**

Thay:

```tsx
        <Table
          columns={cfgColumns}
          dataSource={data}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          scroll={{ x: 700, y: "calc(100vh - 285px)" }}
```

bằng:

```tsx
        <BangDuLieu
          columns={cfgColumns}
          dataSource={data}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
```

Thẻ đóng `</Table>` (nếu có) đổi thành `</BangDuLieu>`. Giữ nguyên toàn bộ
`pagination` phía dưới.

- [ ] **Step 3: Chạy test toàn FE**

Run: `cd fe && npx vitest run`
Expected: PASS — 169 file / 1303 test, không giảm

- [ ] **Step 4: Dựng thật và nhìn**

Run: `cd fe && npm run dev`
Mở `http://localhost:5173`, vào Danh mục → Đơn vị tính. Kiểm bằng mắt:
- Bảng ít cột: có kéo đầy khung không, hay thừa trắng bên phải?
- Bấm lọc / lưu: dữ liệu cũ có nằm nguyên và dải 2px có chạy không?
- Dòng có nhỏ hơn trước không?

- [ ] **Step 5: DỪNG — báo cáo cho người dùng**

Chụp hoặc mô tả kết quả bước 4 và hỏi có duyệt để nhân ra 25 trang còn lại
không. **Không làm tiếp Task 4 khi chưa có trả lời.**

Nếu bảng thừa trắng bên phải và người dùng không thích, phương án dự phòng là
thêm vào `fe/src/index.css`:

```css
/* antd đặt bề rộng bảng theo scroll.x; ép sàn để bảng ít cột vẫn kín khung. */
.bdl-thanh + .ant-table-wrapper .ant-table-content > table,
.bdl-thanh + .ant-table-wrapper .ant-table-header > table,
.bdl-thanh + .ant-table-wrapper .ant-table-body > table {
  min-width: 100%;
}
```

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/danh-muc/don-vi-tinh/DonViTinhPage.tsx
git commit -m "refactor(danh-muc): Đơn vị tính dùng BangDuLieu — trang mẫu"
```

---

### Task 4: Nhân ra 19 trang danh mục phẳng còn lại

Chỉ làm sau khi Task 3 được duyệt.

**Files (19 file, đều `Modify`):**

`fe/src/pages/danh-muc/` — `bo-phan/BoPhanPage.tsx`, `chu-dau-tu/ChuDauTuPage.tsx`,
`doi-tuong/DoiTuongPage.tsx`, `dong-tien/DongTienPage.tsx`, `du-an/DuAnPage.tsx`,
`hang-hoa-vat-tu/HangHoaVatTuPage.tsx`, `ho-so-chung-tu/HoSoChungTuPage.tsx`,
`kho/KhoPage.tsx`, `khoan-muc/KhoanMucPage.tsx`, `loai-chung-tu/LoaiChungTuPage.tsx`,
`loai-giao-dich/LoaiGiaoDichPage.tsx`, `ly-do-khong-hop-le/LyDoKhongHopLePage.tsx`,
`ngan-hang/NganHangPage.tsx`, `nhom-khuyen-mai/NhomKhuyenMaiPage.tsx`,
`nhom-quan-ly/NhomQuanLyPage.tsx`, `nhom-san-pham/NhomSanPhamPage.tsx`,
`nhom-vat-tu/NhomVatTuPage.tsx`, `san-pham/SanPhamPage.tsx`,
`tai-khoan/TaiKhoanPage.tsx`

**Interfaces:**
- Consumes: `BangDuLieu` từ Task 2

- [ ] **Step 1: Sửa từng file theo đúng ba việc**

Với mỗi file:

1. Bỏ `Table` khỏi cụm import antd; thêm `import { BangDuLieu } from '@/components/table/BangDuLieu';`
2. `<Table` → `<BangDuLieu`, `</Table>` → `</BangDuLieu>` (nếu có).
3. **Xoá hẳn dòng `scroll={{ ... }}`** và dòng `size="middle"` nếu có. Cả hai đã có mặc định.

Riêng hai trang có ngoại lệ, giữ lại `scroll`:

- `tai-khoan/TaiKhoanPage.tsx`: có cột ghim, giữ nguyên biểu thức đang có —
  `scroll={{ x: hasPinned ? "max-content" : 900 }}` (bỏ khoá `y`, để mặc định lo).
- `loai-giao-dich/LoaiGiaoDichPage.tsx` và `bo-phan/BoPhanPage.tsx`: `scroll` viết
  nhiều dòng, đọc kỹ rồi xoá cả cụm; nếu trong đó có `x` là biểu thức tính động
  thì giữ lại mỗi `x`.

- [ ] **Step 2: Chạy test toàn FE**

Run: `cd fe && npx vitest run`
Expected: PASS — 169 file / 1303 test

- [ ] **Step 3: Rà không sót trang nào**

Run: `cd fe && grep -rn "<Table" src/pages/danh-muc/ | grep -v quy-chuan | grep -v hop-dong | grep -v so-du-dau-ky | grep -v nhom-dong-tien | grep -v tai-khoan-ket-chuyen | grep -v nhom-khoan-muc`
Expected: không có dòng nào (6 trang được lọc ra là phần của Task 5)

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/danh-muc/
git commit -m "refactor(danh-muc): 19 trang phẳng dùng BangDuLieu"
```

---

### Task 5: 6 trang danh mục đặc biệt

**Files:**
- Modify: `fe/src/pages/danh-muc/quy-chuan/components/table/QuyChaunTable.tsx:333-356` (hai bảng, `buTruDoc={250}`)
- Modify: `fe/src/pages/danh-muc/nhom-dong-tien/NhomDongTienPage.tsx:293-294` (`buTruDoc={300}`)
- Modify: `fe/src/pages/danh-muc/tai-khoan-ket-chuyen/TaiKhoanKetChuyenPage.tsx:340-341` (`buTruDoc={300}`)
- Modify: `fe/src/pages/danh-muc/nhom-khoan-muc/NhomKhoanMucPage.tsx:310-311` (`buTruDoc={350}`)
- Modify: `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx:1019` (`buTruDoc={400}`)
- Modify: `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx:389` (`buTruDoc={400}`)

**Interfaces:**
- Consumes: `BangDuLieu` từ Task 2

- [ ] **Step 1: Sửa từng file**

Cùng ba việc như Task 4, thêm `buTruDoc` theo bảng trên. Ví dụ `NhomDongTienPage`:

```tsx
        <BangDuLieu
          columns={cfgColumns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          buTruDoc={300}
```

Ngoại lệ phải giữ:

- `QuyChaunTable.tsx`: bảng thứ hai có `scroll={{ x: scrollX, ... }}` với `scrollX`
  tính động — giữ `scroll={{ x: scrollX }}`, thêm `buTruDoc={250}`. Bảng cây lồng
  bên trong (dòng ~311, đang `size="small"`) giữ nguyên là `Table`, KHÔNG đổi:
  nó nằm trong ô mở rộng, không phải bảng chính của trang.
- `SoDuDauKyPage.tsx`: có cột ghim và `pagination={false}` — giữ
  `scroll={{ x: hasPinned ? 'max-content' : undefined }}` và `pagination={false}`,
  bỏ `size="small"` (đã mặc định), thêm `buTruDoc={400}`.
- `HopDongPage.tsx`: có hai bảng. Chỉ đổi bảng chính ở dòng ~1019. Bảng thứ hai ở
  dòng ~1046 (`size="small"`, trong modal file hợp đồng) giữ nguyên là `Table`.

- [ ] **Step 2: Chạy test toàn FE**

Run: `cd fe && npx vitest run`
Expected: PASS — 169 file / 1303 test

- [ ] **Step 3: Nghiệm thu tay hai trang có cột ghim**

Run: `cd fe && npm run dev`
Vào Danh mục → Tài khoản và Danh mục → Số dư đầu kỳ. Ghim một cột, cuộn ngang.
Kiểm hàng tiêu đề KHÔNG trườn lệch khỏi thân bảng. antd 6 dùng lớp `-fix-start`
(không phải `-fix-left`) — nếu cần soi CSS thì nhớ tên đúng.

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/danh-muc/
git commit -m "refactor(danh-muc): 6 trang đặc biệt dùng BangDuLieu với buTruDoc riêng"
```

---

### Task 6: Icon Excel màu

**Files:**
- Create: `fe/src/components/icons/ExcelIcons.tsx`
- Modify: `fe/src/components/import-danh-muc/ImportDanhMucButton.tsx`
- Modify: `fe/src/components/export-danh-muc/ExportDanhMucButton.tsx`

**Interfaces:**
- Produces: `IconNhapExcel`, `IconXuatExcel` — `(props: { size?: number }) => ReactElement`

- [ ] **Step 1: Tạo `fe/src/components/icons/ExcelIcons.tsx`**

```tsx
/**
 * Icon Excel màu cho nút Import / Xuất.
 *
 * Thân tờ tài liệu dùng `currentColor` để còn theo được màu chữ của nút và chế
 * độ tối; riêng ô bảng tính giữ xanh Excel để nhận ra ngay đây là file Excel.
 */
const XANH_EXCEL = '#1D7044';
const XANH_EXCEL_NHAT = '#21A366';

interface IconProps {
  size?: number;
}

/** Tờ tài liệu + ô bảng tính. Dùng chung cho cả hai icon. */
function ThanTaiLieu() {
  return (
    <>
      <path
        d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 2v5a2 2 0 0 0 2 2h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="7" y="12" width="10" height="7" rx="1" fill={XANH_EXCEL} />
      <path d="M7 15.5h10M12 12v7" stroke="#FFFFFF" strokeWidth="1.1" />
    </>
  );
}

export function IconNhapExcel({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <ThanTaiLieu />
      {/* Mũi tên chỉ VÀO tờ tài liệu. */}
      <path
        d="M2 7h6M5.4 4.2 8.2 7l-2.8 2.8"
        fill="none"
        stroke={XANH_EXCEL_NHAT}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconXuatExcel({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <ThanTaiLieu />
      {/* Mũi tên chỉ RA khỏi tờ tài liệu. */}
      <path
        d="M8 7H2M5.4 4.2 2.6 7l2.8 2.8"
        fill="none"
        stroke={XANH_EXCEL_NHAT}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Gắn vào nút Import**

Trong `ImportDanhMucButton.tsx`: bỏ dòng `import { FileExcelOutlined } from "@ant-design/icons";`, thêm `import { IconNhapExcel } from "@/components/icons/ExcelIcons";`, và đổi:

```tsx
      <Button icon={<IconNhapExcel />} onClick={() => setOpen(true)}>
```

- [ ] **Step 3: Gắn vào nút Xuất**

Trong `ExportDanhMucButton.tsx`: bỏ dòng `import { ExportOutlined } from "@ant-design/icons";`, thêm `import { IconXuatExcel } from "@/components/icons/ExcelIcons";`, và đổi:

```tsx
    <Button icon={<IconXuatExcel />} loading={loading} onClick={handleExport}>
```

Prop `loading` của antd Button tự thay icon bằng spinner lúc đang xuất — giữ nguyên hành vi đó.

- [ ] **Step 4: Chạy test toàn FE**

Run: `cd fe && npx vitest run`
Expected: PASS — 169 file / 1303 test

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/icons/ExcelIcons.tsx fe/src/components/import-danh-muc/ImportDanhMucButton.tsx fe/src/components/export-danh-muc/ExportDanhMucButton.tsx
git commit -m "feat(icon): nút Import/Xuất Excel dùng SVG màu vẽ riêng"
```

---

### Task 7: `quyCachO` — hàm thuần dựng ô icon app

**Files:**
- Create: `fe/src/components/icons/oIconApp.ts`
- Test: `fe/src/components/icons/__tests__/oIconApp.test.ts`

**Interfaces:**
- Produces:
  - `MAU_APP: Record<string, { dau: string; cuoi: string; nen: string }>`
  - `MAU_LA: { dau: string; cuoi: string; nen: string }`
  - `layMauApp(appId: string)` → bộ màu, rơi về `MAU_LA` nếu `appId` không biết
  - `quyCachO(appId: string, size: number)` → `{ boGoc: number; glyph: number; nen: string; bong: string }`

- [ ] **Step 1: Viết test đỏ**

```ts
import { describe, it, expect } from 'vitest';
import { layMauApp, quyCachO, MAU_APP } from '../oIconApp';

describe('quyCachO', () => {
  it('bo góc 27% cạnh, glyph 55% cạnh', () => {
    expect(quyCachO('ke-toan', 88).boGoc).toBe(24); // 88 * 0.27 = 23.76
    expect(quyCachO('ke-toan', 88).glyph).toBe(48); // 88 * 0.55 = 48.4
    expect(quyCachO('ke-toan', 64).boGoc).toBe(17); // 64 * 0.27 = 17.28
    expect(quyCachO('ke-toan', 28).glyph).toBe(15); // 28 * 0.55 = 15.4
  });

  it('từ 24px trở lên: gradient 305° + lớp sáng radial', () => {
    const { nen } = quyCachO('ke-toan', 24);
    expect(nen).toContain('linear-gradient(305deg');
    expect(nen).toContain('radial-gradient');
    expect(nen).toContain('#1FD1A3');
    expect(nen).toContain('#0E7490');
  });

  it('dưới 24px: bỏ gradient và lớp sáng, dùng màu đầu đặc', () => {
    const { nen } = quyCachO('ke-toan', 20);
    expect(nen).toBe('#1FD1A3');
    expect(nen).not.toContain('gradient');
  });

  it('bóng ô: 0 5 14, màu cuối ở 40%', () => {
    expect(quyCachO('giao-viec', 64).bong).toBe('0 5px 14px #7C3AED66');
  });

  it('appId lạ KHÔNG được mượn màu của app khác', () => {
    const la = layMauApp('khong-ton-tai');
    const mauCuaApp = Object.values(MAU_APP).flatMap((m) => [m.dau, m.cuoi]);
    expect(mauCuaApp).not.toContain(la.dau);
    expect(mauCuaApp).not.toContain(la.cuoi);
  });

  it('ba app đang có đều tra ra đúng màu của mình', () => {
    expect(layMauApp('ke-toan').dau).toBe('#1FD1A3');
    expect(layMauApp('giao-viec').dau).toBe('#4F8CFF');
    expect(layMauApp('nhan-su').dau).toBe('#FFA63D');
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn nó đỏ**

Run: `cd fe && npx vitest run src/components/icons/__tests__/oIconApp.test.ts`
Expected: FAIL — `Failed to resolve import "../oIconApp"`

- [ ] **Step 3: Viết bản cài đặt**

```ts
/**
 * Quy cách ô icon app — bản vẽ Pencil 10/09/2026.
 *
 * BẢN SAO Ở: identity-service/portal/src/components/oIconApp.ts
 * Hai repo không dùng chung package; sửa một bên thì phải sửa bên kia, nếu
 * không hai nơi hiện icon khác nhau.
 *
 * Nguồn glyph: ke-toan-so/design/icons/<appId>.svg
 */

export interface MauApp {
  /** Màu đầu gradient — cũng là màu đặc dùng cho cỡ dưới 24px. */
  dau: string;
  /** Màu cuối gradient — cũng là màu bóng ô. */
  cuoi: string;
  /** Nền thẻ app trong modal chọn ứng dụng. */
  nen: string;
}

export const MAU_APP: Record<string, MauApp> = {
  'ke-toan': { dau: '#1FD1A3', cuoi: '#0E7490', nen: '#E9FBF5' },
  'giao-viec': { dau: '#4F8CFF', cuoi: '#7C3AED', nen: '#F0F3FF' },
  'nhan-su': { dau: '#FFA63D', cuoi: '#F2536D', nen: '#FFF3EC' },
};

/**
 * App chưa có trong bảng màu. Phải là tông trung tính riêng: quy cách cấm đặt
 * glyph app này lên màu app khác, nên tuyệt đối không rơi về màu của một app.
 */
export const MAU_LA: MauApp = { dau: '#8E8E93', cuoi: '#48484A', nen: '#F2F2F7' };

export function layMauApp(appId: string): MauApp {
  return MAU_APP[appId] ?? MAU_LA;
}

/** Dưới cỡ này thì gradient và lớp sáng thành nhiễu, không còn đọc ra hình. */
const NGUONG_GRADIENT = 24;

export interface QuyCachO {
  boGoc: number;
  glyph: number;
  nen: string;
  bong: string;
}

export function quyCachO(appId: string, size: number): QuyCachO {
  const mau = layMauApp(appId);
  const dacThoi = size < NGUONG_GRADIENT;

  return {
    boGoc: Math.round(size * 0.27),
    glyph: Math.round(size * 0.55),
    nen: dacThoi
      ? mau.dau
      : `radial-gradient(ellipse 67.5% 67.5% at 28% 12%, #FFFFFF66 0%, #FFFFFF00 100%), linear-gradient(305deg, ${mau.dau} 14%, ${mau.cuoi} 86%)`,
    bong: `0 5px 14px ${mau.cuoi}66`,
  };
}
```

- [ ] **Step 4: Chạy lại cho xanh**

Run: `cd fe && npx vitest run src/components/icons/__tests__/oIconApp.test.ts`
Expected: PASS — 6 test

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/icons/oIconApp.ts fe/src/components/icons/__tests__/oIconApp.test.ts
git commit -m "feat(icon): quyCachO — quy cách ô icon app theo bản vẽ"
```

---

### Task 8: `AppGlyphs` + `OIconApp` + `IconLuoiApp`

**Files:**
- Create: `fe/src/components/icons/AppGlyphs.tsx`
- Create: `fe/src/components/icons/OIconApp.tsx`
- Create: `fe/src/components/icons/IconLuoiApp.tsx`

**Interfaces:**
- Consumes: `quyCachO`, `layMauApp` từ Task 7
- Produces:
  - `GLYPH_APP: Record<string, (p: { size: number }) => ReactElement>`
  - `layGlyphApp(appId: string)` → component glyph, rơi về `GlyphMacDinh` nếu lạ
  - `OIconApp(props: { appId: string; size: number; className?: string })`
  - `IconLuoiApp(props: { size?: number })`

- [ ] **Step 1: Tạo `AppGlyphs.tsx`**

Nội dung path bóc nguyên từ `design/icons/*.svg` (đã có sẵn trong repo, đã dựng
thử ra đúng hình). Chép y nguyên, đừng vẽ lại.

```tsx
/**
 * Glyph của từng app — trắng đặc, không viền, không đổ bóng.
 *
 * NGUỒN: ke-toan-so/design/icons/<appId>.svg. Sửa icon thì sửa file SVG trước
 * rồi chép lại path vào đây; đừng sửa thẳng ở file này.
 *
 * BẢN SAO Ở: identity-service/portal/src/components/AppGlyphs.tsx
 */

import type { ReactElement } from 'react';

interface GlyphProps {
  size: number;
}

function GlyphKeToan({ size }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <g transform="translate(0.376 0.855)">
        <path
          fill="#FFFFFF"
          d="M21.70435 1.75421c-0.2087-0.16696-0.41739-0.29217-0.70957-0.29218l-2.75478 0c-0.54261 0-1.04348 0.41739-1.04348 1.00174l0 18.4487-3.21391 0 0-13.48174c0-0.54261-0.45913-1.00174-1.00174-1.00174l-2.83826 0c-0.50087 0-0.96 0.41739-0.96 0.96l0 13.52348-2.75479 0 0-10.30956c0-0.45913-0.45913-1.00174-1.00173-1.00174l-2.96348 0c-0.45913 0-1.00174 0.45913-1.00174 1.00174l0 10.30956-1.46087 0 0 1.37739 23.2487 0 0-1.37739-1.50261 0 0-18.32348c0-0.20869 0.04174-0.58435-0.04174-0.83478z m-10.10087-1.75304c-1.33565 0-2.46261 1.00174-2.46261 2.25391 0 1.25217 0.96 2.71304 2.46261 2.71304 1.21044 0 2.33739-1.00174 2.37913-2.46261 0.04174-1.46087-1.1687-2.54609-2.37913-2.50434z"
        />
      </g>
    </svg>
  );
}

function GlyphGiaoViec({ size }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 35 35" aria-hidden focusable="false">
      <g fill="#FFFFFF">
        <g transform="translate(2.19 8.95) scale(1.2382)">
          <path d="M10.53793 0l-7.83448 0c-1.43448 0-2.70345 1.04827-2.70345 2.70345l0 8.11035c0 1.43449 1.04828 2.97931 2.70345 2.97931l7.94482 0c1.54483 0 2.75862-1.10346 2.75862-2.97931l0-7.94483c0-1.76553-1.21379-2.86897-2.86896-2.86897z m1.65517 10.92414c0 0.88276-0.55172 1.48965-1.65517 1.48966l-7.83448 0c-0.93793 0-1.48965-0.60689-1.48966-1.48966l0-7.94482c0-0.93793 0.49655-1.71035 1.6-1.71035l7.77931 0c0.93793 0 1.6 0.6069 1.6 1.54483l0 8.11034 0 0z" />
        </g>
        <g transform="translate(6.01 13.99) scale(1.239)">
          <path d="M6.56876 0.1306l-3.91724 3.91724-1.54484-1.54483c-0.49654-0.44138-1.15862 0.05517-1.10345 0.6069 0 0.27586 1.71035 1.82069 2.09655 2.31724 0.2207 0.22069 0.71725 0.49654 1.15863 0l4.30344-4.30345c0.49656-0.44138-0.1655-1.48965-0.99309-0.9931z" />
        </g>
        <g transform="translate(21.94 13.81) scale(1.2387 1.2358)">
          <path d="M8.11034 0l-7.50344 0c-0.33104 0-0.6069 0.27586-0.6069 0.6069 0 0.33103 0.27586 0.60689 0.6069 0.60689l7.55862 0c0.82759 0 0.77242-1.21379-0.05518-1.21379z" />
        </g>
        <g transform="translate(21.94 19.75) scale(1.2381)">
          <path d="M8.11034 0l-7.50344 0c-0.38622 0-0.6069 0.27586-0.6069 0.66207 0 0.38621 0.27586 0.66207 0.6069 0.66207l7.55862 0c0.82759-0.05518 0.82759-1.32414-0.05518-1.32414z" />
        </g>
      </g>
    </svg>
  );
}

function GlyphNhanSu({ size }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 35 35" aria-hidden focusable="false">
      <g fill="#FFFFFF">
        <g transform="translate(18.7 2.55) scale(0.7588 0.7591)">
          <path d="M4.30939 0c-1.42542 0-2.85083 0.36464-4.30939 1.22652 1.52486 1.62431 2.55248 3.94475 2.61879 6.72928-0.03315 2.18784-0.62984 4.20995-1.95581 6.0663 1.02762 0.62983 2.45304 1.06077 3.64641 1.06077 4.07735 0 7.59116-2.91713 7.59117-7.52486-0.23205-4.07735-3.51381-7.55801-7.59117-7.55801z" />
        </g>
        <g transform="translate(2.19 16.37) scale(0.7592 0.759)">
          <path d="M14.05525 0c-4.20995 0-13.42541 1.25967-13.98895 13.19337l-0.0663 6.59668c2.25414 0.66298 7.22652 1.72376 14.0884 1.72376 6.19889 0 10.74033-0.59668 14.25415-1.55801 0.96132-0.29834 1.35911-0.59668 1.35911-2.0221 0-6.59668-1.42542-14.55248-10.70719-17.33701-1.69061-0.43094-3.31491-0.59669-4.93922-0.59669z" />
        </g>
        <g transform="translate(18.27 15.31) scale(0.7594 0.7592)">
          <path d="M0.23204 0.66298c6.26519 2.22099 10.40884 7.55801 10.40884 18.46409 2.1547-0.16574 5.80111-0.66298 7.42542-1.32597 0.89503-0.33149 1.09392-0.66298 1.09392-1.6906 0-5.53591-1.29282-16.1105-14.0884-16.1105-1.52486 0-3.04972 0.09945-5.07182 0.66298l0.03315 0 0 0 0.19889 0z" />
        </g>
        <g transform="translate(6.44 2.3) scale(0.7592 0.7587)">
          <path d="M16.60774 8.25414c-0.03315-3.9779-3.34807-8.25414-8.25415-8.25414-3.01657 0-7.72376 2.45304-8.35359 7.62431l0 0.62983c0 4.40884 3.38122 8.38674 8.45304 8.38674 4.47514 0 8.1547-3.34807 8.1547-8.38674z" />
        </g>
      </g>
    </svg>
  );
}

/** App chưa có glyph riêng: ô vuông tròn góc, đủ để không vỡ bố cục. */
function GlyphMacDinh({ size }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" fill="#FFFFFF" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" fill="#FFFFFF" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" fill="#FFFFFF" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" fill="#FFFFFF" />
    </svg>
  );
}

export const GLYPH_APP: Record<string, (p: GlyphProps) => ReactElement> = {
  'ke-toan': GlyphKeToan,
  'giao-viec': GlyphGiaoViec,
  'nhan-su': GlyphNhanSu,
};

export function layGlyphApp(appId: string) {
  return GLYPH_APP[appId] ?? GlyphMacDinh;
}
```

- [ ] **Step 2: Tạo `OIconApp.tsx`**

```tsx
import { quyCachO } from './oIconApp';
import { layGlyphApp } from './AppGlyphs';

/**
 * Ô icon của một app, dựng theo quy cách trong `oIconApp.ts`.
 *
 * Mọi chỗ hiện icon app đều phải đi qua đây — rải màu và bo góc thẳng vào chỗ
 * gọi thì mỗi lần thêm một chỗ là một lần lệch.
 *
 * BẢN SAO Ở: identity-service/portal/src/components/OIconApp.tsx
 */
export function OIconApp({
  appId,
  size,
  className,
}: {
  appId: string;
  size: number;
  className?: string;
}) {
  const { boGoc, glyph, nen, bong } = quyCachO(appId, size);
  const Glyph = layGlyphApp(appId);

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: boGoc,
        background: nen,
        boxShadow: bong,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Glyph size={glyph} />
    </span>
  );
}

export default OIconApp;
```

- [ ] **Step 3: Tạo `IconLuoiApp.tsx`**

```tsx
/** Lưới 9 chấm — nút mở màn chọn ứng dụng. */
export function IconLuoiApp({ size = 18 }: { size?: number }) {
  const toaDo = [4, 10, 16];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden focusable="false">
      {toaDo.map((y) =>
        toaDo.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="currentColor" />),
      )}
    </svg>
  );
}

export default IconLuoiApp;
```

- [ ] **Step 4: Chạy test toàn FE**

Run: `cd fe && npx vitest run`
Expected: PASS — 169 file / 1303 test

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/icons/
git commit -m "feat(icon): OIconApp, glyph 3 app và lưới 9 chấm"
```

---

### Task 9: `AppSwitcher` — lưới 9 chấm và modal vẽ lại

**Files:**
- Modify: `fe/src/components/layout/AppSwitcher.tsx` (thay gần như toàn bộ phần render)

**Interfaces:**
- Consumes: `OIconApp` (Task 8), `IconLuoiApp` (Task 8), `layMauApp` (Task 7)
- Produces: `AppSwitcher` giữ nguyên tên export và chữ ký (không nhận prop)

- [ ] **Step 1: Đổi cụm import ở đầu file**

Bỏ `CalculatorOutlined`, `CheckSquareOutlined`, `CheckCircleFilled` và hằng
`APP_STYLE`, `PALETTE`. Giữ `AppstoreOutlined` **chỉ khi** còn chỗ dùng; nếu
không thì bỏ luôn. Thêm:

```tsx
import { CheckOutlined, CloseOutlined, BankOutlined } from '@ant-design/icons';
import { OIconApp } from '@/components/icons/OIconApp';
import { IconLuoiApp } from '@/components/icons/IconLuoiApp';
import { layMauApp } from '@/components/icons/oIconApp';
```

- [ ] **Step 2: Đổi nút mở modal**

Thay `<AppstoreOutlined style={{ fontSize: 16 }} />` bằng `<IconLuoiApp size={18} />`.
Giữ nguyên `aria-label`, `title` và `onClick` — hành vi không đổi.

- [ ] **Step 3: Vẽ lại phần trong `<Modal>`**

Thay toàn bộ khối **dòng 78–180** (từ `<div className="pt-2 pb-1 text-center">`
tới ngay trước `</Modal>` ở dòng 181) bằng:

```tsx
        <div className="flex items-start justify-between px-1 pt-1 pb-3">
          <div>
            <Typography.Title level={4} style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 18 }}>
              Chọn ứng dụng
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Dùng chung một tài khoản MasterCEO
            </Typography.Text>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng"
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              border: 'none',
              background: '#7676801F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseOutlined style={{ fontSize: 12, color: '#6E6E73' }} />
          </button>
        </div>

        <div className="flex gap-[10px] pb-3">
          {list.map((a) => {
            const isCurrent = a.appId === CURRENT_APP_ID;
            const enabled = isEnabled(a.appId);
            const mau = layMauApp(a.appId);
            return (
              <div
                key={a.appId}
                onClick={() => switchTo(a)}
                title={!enabled ? 'Ứng dụng chưa được bật cho công ty này' : undefined}
                style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 9,
                  padding: '14px 10px 12px',
                  borderRadius: 9,
                  background: mau.nen,
                  border: isCurrent ? `2px solid ${mau.cuoi}` : '1px solid #00000014',
                  cursor: isCurrent ? 'default' : enabled ? 'pointer' : 'not-allowed',
                  opacity: enabled ? 1 : 0.4,
                  filter: enabled ? 'none' : 'grayscale(1)',
                }}
              >
                <OIconApp appId={a.appId} size={64} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1D1D1F' }}>{a.name}</span>
                {isCurrent ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: `linear-gradient(82deg, ${mau.dau} 9%, ${mau.cuoi} 91%)`,
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    <CheckOutlined style={{ fontSize: 10 }} />
                    Đang dùng
                  </span>
                ) : enabled ? (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: mau.cuoi }}>Mở</span>
                ) : (
                  <span style={{ fontSize: 10.5, color: '#8E8E93' }}>Chưa bật</span>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between"
          style={{
            margin: '0 -24px -20px',
            padding: '10px 16px',
            background: '#FBFBFD',
            borderTop: '1px solid #F0F0F3',
          }}
        >
          <span className="flex items-center gap-[7px]" style={{ fontSize: 11.5, color: '#6E6E73' }}>
            <BankOutlined style={{ color: '#98989D' }} />
            {currentTenant?.tenantName ?? '—'}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#007AFF' }}>Đổi công ty</span>
        </div>
```

Ghi chú: `margin: '0 -24px -20px'` để chân modal chạm mép — antd 6 để đệm mặc
định 24px ngang, 20px dưới cho `Modal`.

- [ ] **Step 4: Bỏ hiệu ứng chuột thừa**

Hai trình xử lý `onMouseEnter` / `onMouseLeave` sửa thẳng DOM ở bản cũ đã bị bỏ
theo bước 3. Kiểm lại chắc chắn không còn tham chiếu nào tới chúng trong file.

- [ ] **Step 5: Chạy test toàn FE**

Run: `cd fe && npx vitest run`
Expected: PASS — 169 file / 1303 test

- [ ] **Step 6: Nghiệm thu tay**

Run: `cd fe && npm run dev`
Bấm nút lưới 9 chấm ở góc trái header. Kiểm:
- Ba thẻ app đúng màu gradient, app đang dùng có viền đậm + huy hiệu "Đang dùng".
- App chưa bật cho công ty: mờ, xám, không bấm được.
- Chân modal hiện đúng tên công ty đang chọn.

- [ ] **Step 7: Commit**

```bash
git add fe/src/components/layout/AppSwitcher.tsx
git commit -m "feat(app-switcher): lưới 9 chấm và modal chọn ứng dụng theo bản vẽ"
```

---

### Task 10: Header trái của `MainLayout`

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx:215-236`

**Interfaces:**
- Consumes: `OIconApp` (Task 8), `AppSwitcher` (Task 9)

- [ ] **Step 1: Thêm import**

```tsx
import { OIconApp } from '@/components/icons/OIconApp';
import { CURRENT_APP_ID } from '@/services/identitySession';
```

- [ ] **Step 2: Đổi khối bên trái header**

Thay:

```tsx
            {/* Mobile Logo */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">
                    KT
                  </span>
                </div>
              </div>
            )}
            {/* App Switcher — chuyển sang Giao việc / app khác (giữ nguyên công ty) */}
            <AppSwitcher />
```

bằng:

```tsx
            {/* App Switcher — lưới 9 chấm, mở màn chọn ứng dụng */}
            <AppSwitcher />

            {/* Nhận diện app đang mở: ô icon + tên app. Tên CÔNG TY nằm bên
                phải header (TenantSwitcher), đừng nhầm hai thứ. */}
            <div className="flex items-center gap-2">
              <OIconApp appId={CURRENT_APP_ID} size={28} />
              <span className="hidden sm:inline text-sm font-bold text-foreground">
                Tài chính
              </span>
            </div>
```

Ô 28px thay luôn cho khối "KT" cũ trên mobile, nên khối đó bỏ hẳn.

- [ ] **Step 3: Chạy test toàn FE**

Run: `cd fe && npx vitest run`
Expected: PASS — 169 file / 1303 test

- [ ] **Step 4: Nghiệm thu tay ở cả hai bề rộng**

Run: `cd fe && npm run dev`
- Màn rộng: `[lưới] [ô teal 28px] [Tài chính]` bên trái, tên công ty vẫn bên phải.
- Thu hẹp xuống ~400px: chữ "Tài chính" ẩn đi, ô icon vẫn còn, header không tràn.

- [ ] **Step 5: Commit**

```bash
git add fe/src/components/layout/MainLayout.tsx
git commit -m "feat(header): lưới 9 chấm + ô icon app + tên app ở góc trái"
```

---

### Task 11: Portal Identity — chép `OIconApp` và đổi `AppPicker`

**Files:**
- Create: `identity-service/portal/src/components/oIconApp.ts`
- Create: `identity-service/portal/src/components/AppGlyphs.tsx`
- Create: `identity-service/portal/src/components/OIconApp.tsx`
- Modify: `identity-service/portal/src/screens/AppPicker.tsx`

**Interfaces:**
- Consumes: bản sao y nguyên của Task 7 và Task 8
- Produces: `OIconApp` bên portal, cùng chữ ký

- [ ] **Step 1: Chép ba file sang portal**

Chép nguyên nội dung `oIconApp.ts`, `AppGlyphs.tsx`, `OIconApp.tsx` từ
`ke-toan-so/fe/src/components/icons/` sang
`identity-service/portal/src/components/`. Sửa đường dẫn trong comment chỉ chéo
cho trỏ ngược lại:

```
 * BẢN SAO Ở: ke-toan-so/fe/src/components/icons/OIconApp.tsx
```

Sửa import trong `OIconApp.tsx` portal cho khớp cấu trúc phẳng:

```tsx
import { quyCachO } from './oIconApp';
import { layGlyphApp } from './AppGlyphs';
```

- [ ] **Step 2: Bỏ icon antd trong `APP_META`**

Trong `AppPicker.tsx`, `APP_META` giữ lại `desc` (mô tả vẫn dùng), bỏ `bg` và
`icon` — màu giờ lấy từ `layMauApp`, icon từ `OIconApp`:

```tsx
// Mô tả mặc định theo từng app. `description` từ API (nếu có) luôn thắng — map
// này chỉ để màn hình không trống khi bản ghi trong DB chưa có mô tả.
// Màu và icon KHÔNG còn ở đây: xem components/oIconApp.ts (bản sao của
// ke-toan-so/fe/src/components/icons/oIconApp.ts).
const APP_META: Record<string, { desc: string }> = {
  'ke-toan': { desc: 'Sổ sách, hoá đơn và báo cáo tài chính của doanh nghiệp.' },
  'giao-viec': { desc: 'Giao việc, theo dõi tiến độ và kết quả của từng đầu việc.' },
  'nhan-su': { desc: 'Hồ sơ nhân viên, chấm công, hợp đồng và bảng lương.' },
};
```

Bỏ luôn hằng `TEAL` và `PALETTE` nếu sau bước này không còn chỗ dùng. Bỏ
`CalculatorOutlined`, `CheckSquareOutlined`, `TeamOutlined` khỏi cụm import antd.

- [ ] **Step 3: Đổi ô icon trong thẻ app**

Thẻ app bên portal KHÔNG giống thẻ trong modal: nó là thẻ nằm ngang (icon trái,
tên + mô tả phải), ô icon là hình **tròn 52px** (`.picker__card-icon` trong
`src/index.css:331`), không phải ô vuông 88px như bản vẽ. Đợt này chỉ thay ô
icon cho đúng bộ nhận diện, GIỮ NGUYÊN bố cục thẻ — xem ghi chú cuối task.

Thay khối **dòng 103–121** bằng:

```tsx
            {apps.map((a) => {
              const meta = APP_META[a.appId] ?? { desc: 'Mở ứng dụng để bắt đầu làm việc.' };
              return (
                <button type="button" key={a.appId} className="picker__card" onClick={() => onPick(a)}>
                  <OIconApp appId={a.appId} size={52} />
                  <span className="picker__card-text">
                    <span className="picker__card-name">{a.name}</span>
                    <span className="picker__card-desc">{a.description || meta.desc}</span>
                  </span>
                </button>
              );
            })}
```

Bỏ hẳn `<span className="picker__card-icon">`: lớp đó ép `border-radius: 50%` và
nền riêng, sẽ đè lên bo góc 27% mà `OIconApp` tự đặt. Cũng vì thế mà `a.iconUrl`
không còn được dùng ở đây — glyph giờ lấy từ bộ icon chung, đúng quy cách.

Sau khi bỏ, xoá luôn khối `.picker__card-icon` và `.picker__card-icon img` trong
`src/index.css:331-347` (không còn chỗ nào dùng), và bỏ `AppstoreOutlined` khỏi
cụm import nếu header chưa đổi ở Task 12.

**Ghi chú cần hỏi người dùng:** bản vẽ ghi cỡ 88px cho "trang chọn app", nhưng
bố cục thẻ dọc 88px chưa được vẽ và sẽ phải bỏ phần mô tả app. Task này giữ thẻ
ngang hiện có; muốn đổi sang thẻ dọc 88px thì cần một bản vẽ riêng cho trang
portal.

- [ ] **Step 4: Chạy test portal**

Run: `cd identity-service/portal && npx vitest run`
Expected: PASS — `AppPicker.test.tsx` phải xanh. Test này tìm app theo TÊN
(`Tài chính`), không theo icon, nên đổi icon không được làm nó đỏ. Nếu đỏ thì
đọc kỹ lỗi trước khi sửa test — nhiều khả năng là bố cục bị vỡ thật.

- [ ] **Step 5: Commit**

```bash
cd identity-service && git add portal/src/components portal/src/screens/AppPicker.tsx
git commit -m "feat(app-picker): dùng OIconApp theo quy cách chung với ke-toan-so"
```

---

### Task 12: Dấu M MasterCeo ở header portal — CHẶN TỚI KHI CÓ FILE

Task này phụ thuộc `design/icons/masterceo-mark.svg`, người dùng chưa cấp. Mọi
task khác chạy được mà không cần nó. **Không tự vẽ thay** — dấu M là nhận diện
thương hiệu, vẽ đoán sẽ sai.

**Files:**
- Create: `identity-service/portal/src/components/MasterCeoMark.tsx`
- Modify: `identity-service/portal/src/screens/AppPicker.tsx` (khối `picker__brand`)

- [ ] **Step 1: Kiểm file đã có chưa**

Run: `ls ke-toan-so/design/icons/masterceo-mark.svg`
Nếu không có: dừng, báo người dùng, làm task khác trước.

- [ ] **Step 2: Bọc SVG thành component**

```tsx
/**
 * Dấu M của MasterCeo — CHỈ hình, không kèm chữ "MASTERCEO".
 * Chữ đã có riêng bằng text bên cạnh; để trong ảnh nữa là lặp, và ở 28px thì nhoè.
 *
 * NGUỒN: ke-toan-so/design/icons/masterceo-mark.svg
 */
export function MasterCeoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="{{lấy từ file SVG}}" aria-hidden focusable="false">
      {/* chép path từ masterceo-mark.svg vào đây, giữ nguyên màu teal + vàng */}
    </svg>
  );
}
```

- [ ] **Step 3: Thay `logo.jpg` ở header portal**

Trong `AppPicker.tsx`, đổi:

```tsx
<img src="/logo.jpg" alt="" className="picker__logo" />
```

thành:

```tsx
<MasterCeoMark size={28} />
```

Và đổi icon lưới `AppstoreOutlined` thành `IconLuoiApp` (chép sang portal cùng
lúc, y như Task 8 bước 3). Chữ "Master CEO" bên cạnh giữ nguyên.

- [ ] **Step 4: Chạy test portal**

Run: `cd identity-service/portal && npx vitest run`
Expected: PASS

- [ ] **Step 5: Nghiệm thu tay**

Dựng portal, xem dấu M ở 28px có sắc nét và đọc được không.

- [ ] **Step 6: Commit**

```bash
cd identity-service && git add portal/src
git commit -m "feat(portal): header dùng dấu M MasterCeo dạng SVG thay logo.jpg"
```

---

### Task 13: Nghiệm thu bộ icon — 6 cỡ và nền tối

Spec yêu cầu kiểm hai thứ mà jsdom không bắt được. Làm sau khi Task 8–11 xong.

**Files:**
- Create: `fe/src/dev/BoIconHarness.tsx` (trang tạm, xoá sau khi duyệt)

- [ ] **Step 1: Dựng trang so 6 cỡ**

```tsx
import { OIconApp } from '@/components/icons/OIconApp';

const CO = [88, 64, 40, 28, 20, 16];
const APP = ['ke-toan', 'giao-viec', 'nhan-su', 'app-la'];

/** Trang tạm để nhìn cả bộ icon một lượt. Xoá sau khi duyệt xong. */
export default function BoIconHarness() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {APP.map((appId) => (
        <div key={appId} style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          {CO.map((size) => (
            <div key={size} style={{ textAlign: 'center' }}>
              <OIconApp appId={appId} size={size} />
              <div style={{ fontSize: 10, marginTop: 6 }}>{size}px</div>
            </div>
          ))}
          <span style={{ fontSize: 12 }}>{appId}</span>
        </div>
      ))}
    </div>
  );
}
```

Gắn tạm vào một route dev để mở được, ví dụ thêm vào `App.tsx`:

```tsx
<Route path="/dev/bo-icon" element={<BoIconHarness />} />
```

- [ ] **Step 2: Nhìn ở nền sáng**

Run: `cd fe && npm run dev` rồi mở `http://localhost:5173/dev/bo-icon`
Kiểm:
- Ba cỡ lớn (88/64/40) có gradient và lớp sáng góc trên-trái.
- Hai cỡ nhỏ (20/16) là màu đặc, KHÔNG gradient, glyph vẫn đọc ra hình.
- Cỡ 28 và 24 là ranh giới — 24 phải có gradient, 20 thì không.
- Hàng `app-la` phải là xám trung tính, không mượn màu của ba app kia.

- [ ] **Step 3: Nhìn ở nền tối**

Bật chế độ tối của ứng dụng. Ô icon phải **giữ nguyên màu**, không bị đảo hay
nhạt đi. Kiểm luôn dải loading của `BangDuLieu` và icon Excel trên nút còn đọc
được ở nền tối.

- [ ] **Step 4: Xoá trang tạm**

Gỡ route và xoá `fe/src/dev/BoIconHarness.tsx`. Trang này chỉ để duyệt bằng mắt,
không thuộc sản phẩm.

- [ ] **Step 5: Commit**

```bash
git add -A fe/src
git commit -m "chore(icon): nghiệm thu bộ icon 6 cỡ và nền tối"
```

---

### Task 14: Rà màu cũ còn sót

Đổi màu app từ đơn sắc sang gradient có thể để lại màu cũ ở chỗ khác, gây lệch
tông mà không ai để ý.

- [ ] **Step 1: Rà cả hai repo**

```bash
grep -rn "1f7769\|2f6fed\|b6954e" \
  --include="*.tsx" --include="*.ts" --include="*.css" \
  ke-toan-so/fe/src identity-service/portal/src
```

- [ ] **Step 2: Phân loại từng kết quả**

- `#1f7769` trùng màu thương hiệu `--primary` (`170 59% 29%`) — chỗ nào là màu
  thương hiệu chung thì **GIỮ NGUYÊN**, đừng đổi sang gradient app.
- Chỗ nào đang dùng màu đó để đại diện cho **một app** thì đổi sang `layMauApp`.

- [ ] **Step 3: Chạy test cả hai repo**

Run: `cd fe && npx vitest run` — Expected: 169 file / 1303 test PASS
Run: `cd identity-service/portal && npx vitest run` — Expected: PASS

- [ ] **Step 4: Commit nếu có sửa**

```bash
git commit -am "fix(icon): dọn màu app đơn sắc còn sót sau khi chuyển gradient"
```
