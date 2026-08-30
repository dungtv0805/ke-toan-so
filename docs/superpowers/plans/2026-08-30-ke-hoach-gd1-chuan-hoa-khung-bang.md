# GĐ1 — Chuẩn hoá khung bảng Kế hoạch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa hai bảng kế hoạch đang chạy (Bán hàng, Nhân sự) về đúng khung cột, cảnh báo và màu sắc mà tài liệu yêu cầu, đồng thời cho trang Dự báo dùng chung bộ tab của Kế hoạch.

**Architecture:** Toàn bộ phần dùng chung nằm ở `fe/src/pages/ke-hoach/tabs/lib/` — `tongHop.ts` (thuần, tính cây và chênh lệch), `cotChung.tsx` (định nghĩa cột dùng chung), `CanhBaoLechMucTieu.tsx` (banner). Hai bảng chỉ lắp các mảnh đó vào. Phía BE thêm trường `loaiKeHoach` vào hai collection để `KE_HOACH` và `DU_BAO` dùng chung code mà không lẫn dữ liệu.

**Tech Stack:** React 18 + TypeScript + antd 5 + Vitest (FE); NestJS 11 + TypeORM MongoDB + Jest (BE); mongosh script cho backfill.

**Spec:** `docs/superpowers/specs/2026-08-30-ke-hoach-tai-chinh-kinh-doanh-design.md` (mục 4 và mục 5)

## Global Constraints

- Ngôn ngữ định danh trong code: **tiếng Việt không dấu**, đúng thói quen của module (`namKhaiBao`, `chenhLech`, `dungCayBang`). Chuỗi hiển thị: **tiếng Việt có dấu**.
- Thứ tự cột bắt buộc: `Mã | <Cấp cha> | <Tên> | Diễn giải | ... | Thành tiền | % | CẢ NĂM | CHÊNH LỆCH | Q1..Q4 | T1..T12 | (thao tác)`.
- `CẢ NĂM` = tổng 12 tháng. `Q_n` = tổng 3 tháng. `CHÊNH LỆCH` = `CẢ NĂM − Thành tiền`. **Không** cho nhập trực tiếp Quý và Cả năm.
- Ngưỡng so khớp tiền: lệch dưới **1 đồng** coi như bằng nhau (`LECH_TOI_THIEU`).
- Quy chuẩn màu: **cùng cấp thông tin = cùng màu**. Bốn cấp: thông tin chính · CẢ NĂM/CHÊNH LỆCH · Q1–Q4 (một màu) · T1–T12 (một màu). Không nhạt dần theo từng cột riêng lẻ.
- Cảnh báo lệch **không chặn lưu** — giữ nguyên hành vi hiện tại.
- Cột DIỄN GIẢI đọc/ghi trường `ghiChu` đã có sẵn trong entity. **Không migrate dữ liệu cho việc này.**
- Baseline của repo đang đỏ: BE `yarn test` fail sẵn 13 suite, `tsc` lỗi sẵn ở cả BE lẫn FE, `vite build` không typecheck. **Chạy test hẹp theo file**, không lấy toàn bộ suite làm thước đo.
- Lệnh test FE: `npx vitest run <đường dẫn file>` (chạy trong `fe/`). Lệnh test BE: `npx jest <đường dẫn>` (chạy trong `be/`).

---

### Task 1: Chênh lệch và diễn giải trong `tongHop.ts`

**Files:**
- Modify: `fe/src/pages/ke-hoach/tabs/lib/tongHop.ts`
- Test: `fe/src/pages/ke-hoach/tabs/lib/tongHop.test.ts` (tạo mới)

**Interfaces:**
- Consumes: không có (task đầu tiên).
- Produces:
  - `MoTaHang` thêm `ghiChu?: string`
  - `HangBang<T>` thêm `ghiChu?: string` và `chenhLech: number`
  - `export const LECH_TOI_THIEU = 1`
  - `export interface TongLech { thieu: number; vuot: number; soDongLech: number }`
  - `export function tongLech<T>(rows: HangBang<T>[]): TongLech`

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/pages/ke-hoach/tabs/lib/tongHop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  dungCayBang,
  tongLech,
  type HangBang,
  type MoTaHang,
} from './tongHop';

interface DongTho {
  key: string;
  nhomKey: string;
  thang: number[];
  namKhaiBao: number;
  ghiChu?: string;
}

const doc = (d: DongTho): MoTaHang => ({
  key: d.key,
  nhomKey: d.nhomKey,
  nhomNhan: `Nhóm ${d.nhomKey}`,
  nhan: d.key,
  thang: d.thang,
  namKhaiBao: d.namKhaiBao,
  ghiChu: d.ghiChu,
});

/** Mảng 12 tháng, mỗi tháng `v`. Tổng năm = v × 12. */
const deu = (v: number): number[] => Array(12).fill(v);

const chiTiet = (rows: HangBang<DongTho>[]) =>
  rows.filter((r) => r.loai === 'chiTiet');

describe('dungCayBang — chênh lệch', () => {
  it('chênh lệch bằng 0 khi 12 tháng khớp mục tiêu năm', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 120 }],
      doc,
    );
    expect(chiTiet(rows)[0].chenhLech).toBe(0);
    expect(chiTiet(rows)[0].lech).toBe(false);
  });

  it('chênh lệch dương khi phân bổ vượt mục tiêu', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 100 }],
      doc,
    );
    expect(chiTiet(rows)[0].chenhLech).toBe(20);
    expect(chiTiet(rows)[0].lech).toBe(true);
  });

  it('chênh lệch âm khi còn thiếu', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 200 }],
      doc,
    );
    expect(chiTiet(rows)[0].chenhLech).toBe(-80);
  });

  it('hàng nhóm và hàng tổng cũng có chênh lệch', () => {
    const rows = dungCayBang(
      [
        { key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 100 },
        { key: 'b', nhomKey: 'N1', thang: deu(10), namKhaiBao: 150 },
      ],
      doc,
    );
    const tong = rows.find((r) => r.loai === 'tong')!;
    const nhom = rows.find((r) => r.loai === 'nhom')!;
    // 240 phân bổ so với 250 mục tiêu.
    expect(tong.chenhLech).toBe(-10);
    expect(nhom.chenhLech).toBe(-10);
  });

  it('chuyển diễn giải xuống hàng chi tiết', () => {
    const rows = dungCayBang(
      [
        {
          key: 'a',
          nhomKey: 'N1',
          thang: deu(10),
          namKhaiBao: 120,
          ghiChu: 'Đơn hàng dự kiến Khách hàng A',
        },
      ],
      doc,
    );
    expect(chiTiet(rows)[0].ghiChu).toBe('Đơn hàng dự kiến Khách hàng A');
  });
});

describe('tongLech', () => {
  it('gom riêng phần thiếu và phần vượt', () => {
    const rows = dungCayBang(
      [
        // vượt 20
        { key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 100 },
        // thiếu 80
        { key: 'b', nhomKey: 'N2', thang: deu(10), namKhaiBao: 200 },
      ],
      doc,
    );
    expect(tongLech(rows)).toEqual({ thieu: 80, vuot: 20, soDongLech: 2 });
  });

  it('chỉ đếm hàng chi tiết, không cộng trùng hàng nhóm và hàng tổng', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 100 }],
      doc,
    );
    // Nếu cộng cả hàng nhóm và hàng tổng thì vượt sẽ là 60, không phải 20.
    expect(tongLech(rows).vuot).toBe(20);
    expect(tongLech(rows).soDongLech).toBe(1);
  });

  it('lệch dưới 1 đồng coi như khớp', () => {
    const rows = dungCayBang(
      [{ key: 'a', nhomKey: 'N1', thang: deu(10), namKhaiBao: 120.4 }],
      doc,
    );
    expect(tongLech(rows)).toEqual({ thieu: 0, vuot: 0, soDongLech: 0 });
  });

  it('bảng rỗng không có gì để cảnh báo', () => {
    expect(tongLech([])).toEqual({ thieu: 0, vuot: 0, soDongLech: 0 });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/tongHop.test.ts`
Expected: FAIL — `tongLech is not a function`, và các assert `chenhLech` nhận `undefined`.

- [ ] **Step 3: Sửa `tongHop.ts`**

Trong `fe/src/pages/ke-hoach/tabs/lib/tongHop.ts`:

3a. Thêm `ghiChu` vào `MoTaHang`, ngay sau `nhan`:

```ts
  nhan: string;
  /** Cột DIỄN GIẢI — cơ sở hình thành dòng kế hoạch. */
  ghiChu?: string;
  thang: number[];
```

3b. Thêm `ghiChu` và `chenhLech` vào `HangBang<T>`, đặt `chenhLech` ngay sau `namKhaiBao`:

```ts
  namTheoThang: number;
  namKhaiBao: number;
  /**
   * CẢ NĂM − Thành tiền. Dương = phân bổ vượt mục tiêu, âm = còn thiếu.
   * Có ở cả ba cấp hàng, vì hàng nhóm và hàng tổng cũng phải cảnh báo được.
   */
  chenhLech: number;
  phanTram: number;
```

và thêm `ghiChu?: string;` ngay sau `nhan: string;` của `HangBang<T>`.

3c. Thay hằng số ngưỡng — đổi hàm `bangNhau` hiện có thành:

```ts
/** So khớp tiền: lệch dưới 1 đồng coi như bằng nhau. */
export const LECH_TOI_THIEU = 1;

const bangNhau = (a: number, b: number): boolean =>
  Math.abs(a - b) < LECH_TOI_THIEU;
```

3d. Trong `dungCayBang`, mỗi lần tạo hàng đều thêm `chenhLech`. Hàng TỔNG CỘNG:

```ts
      namTheoThang: cong(tongThang),
      namKhaiBao: tongKhaiBao,
      chenhLech: cong(tongThang) - tongKhaiBao,
      phanTram: tyLe(tongKhaiBao),
      lech: !bangNhau(cong(tongThang), tongKhaiBao),
```

Hàng nhóm:

```ts
      namTheoThang: cong(thangNhom),
      namKhaiBao: khaiBaoNhom,
      chenhLech: cong(thangNhom) - khaiBaoNhom,
      phanTram: tyLe(khaiBaoNhom),
      lech: !bangNhau(cong(thangNhom), khaiBaoNhom),
```

Hàng chi tiết — thêm cả `ghiChu`:

```ts
      rows.push({
        key: m.key,
        loai: 'chiTiet',
        nhan: m.nhan,
        ghiChu: m.ghiChu,
        nhomKey,
        thang: t,
        quy: quyTuThang(t),
        namTheoThang: cong(t),
        namKhaiBao: m.namKhaiBao,
        chenhLech: cong(t) - m.namKhaiBao,
        phanTram: tyLe(m.namKhaiBao),
        lech: !bangNhau(cong(t), m.namKhaiBao),
        dong: item,
      });
```

3e. Thêm `tongLech` ở cuối file:

```ts
export interface TongLech {
  /** Tổng phần CÒN THIẾU, luôn là số dương. */
  thieu: number;
  /** Tổng phần PHÂN BỔ VƯỢT, luôn là số dương. */
  vuot: number;
  /** Số hàng chi tiết đang lệch. */
  soDongLech: number;
}

/**
 * Tổng lệch của cả bảng, dùng cho banner cảnh báo cấp bảng.
 *
 * Chỉ cộng hàng CHI TIẾT: hàng nhóm và hàng tổng là số cộng dồn của chính các
 * hàng đó, cộng thêm vào sẽ đếm mỗi khoản lệch ba lần.
 */
export function tongLech<T>(rows: HangBang<T>[]): TongLech {
  let thieu = 0;
  let vuot = 0;
  let soDongLech = 0;

  for (const row of rows) {
    if (row.loai !== 'chiTiet') continue;
    if (Math.abs(row.chenhLech) < LECH_TOI_THIEU) continue;
    soDongLech += 1;
    if (row.chenhLech > 0) vuot += row.chenhLech;
    else thieu += -row.chenhLech;
  }

  return { thieu, vuot, soDongLech };
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/tongHop.test.ts`
Expected: PASS — 9 test.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/ke-hoach/tabs/lib/tongHop.ts fe/src/pages/ke-hoach/tabs/lib/tongHop.test.ts
git commit -m "feat(ke-hoach): tongHop tính chênh lệch và mang diễn giải xuống hàng chi tiết"
```

---

### Task 2: Cột CẢ NĂM, CHÊNH LỆCH và quy chuẩn màu trong `cotChung.tsx`

**Files:**
- Modify: `fe/src/pages/ke-hoach/tabs/lib/cotChung.tsx`
- Modify: `fe/src/index.css` (thêm vào cuối khối "Bảng kế hoạch hai cấp", sau `.kh-hang-nhap`)
- Test: `fe/src/pages/ke-hoach/tabs/lib/cotChung.test.ts` (tạo mới)

**Interfaces:**
- Consumes: `HangBang`, `LECH_TOI_THIEU` từ `./tongHop` (Task 1).
- Produces:
  - `export interface NhanChenhLech { text: string; tooltip: string; lop: string }`
  - `export function nhanChenhLech(chenhLech: number): NhanChenhLech | null`
  - `export const capCot: (lop: string) => { className: string; onHeaderCell: () => { className: string } }`
  - `export function cotCaNamVaChenhLech<T extends HangBang<unknown>>(): ColumnsType<T>` — trả đúng 2 cột, theo thứ tự CẢ NĂM rồi CHÊNH LỆCH
  - `export const CAP_CHINH = 'kh-cot-chinh'`
  - `oSoNam` **giữ nguyên** ở task này (Task 4 và Task 5 mới thôi dùng, Task 5 xoá).

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/pages/ke-hoach/tabs/lib/cotChung.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { capCot, nhanChenhLech } from './cotChung';

describe('nhanChenhLech', () => {
  it('khớp mục tiêu thì không cảnh báo', () => {
    expect(nhanChenhLech(0)).toBeNull();
  });

  it('lệch dưới 1 đồng thì không cảnh báo', () => {
    expect(nhanChenhLech(0.4)).toBeNull();
    expect(nhanChenhLech(-0.9)).toBeNull();
  });

  it('phân bổ vượt thì chữ xanh, có dấu cộng', () => {
    const kq = nhanChenhLech(20000000)!;
    expect(kq.text).toBe('+20.000.000');
    expect(kq.lop).toContain('text-green');
    expect(kq.tooltip).toBe('Phân bổ vượt mục tiêu 20.000.000 ₫');
  });

  it('còn thiếu thì chữ đỏ, có dấu trừ và số dương', () => {
    const kq = nhanChenhLech(-5000000)!;
    expect(kq.text).toBe('−5.000.000');
    expect(kq.lop).toContain('text-red');
    expect(kq.tooltip).toBe('Còn thiếu 5.000.000 ₫');
  });
});

describe('capCot', () => {
  it('gắn cùng một lớp cho cả ô tiêu đề lẫn ô dữ liệu', () => {
    const kq = capCot('kh-cot-quy');
    expect(kq.className).toBe('kh-cot-quy');
    expect(kq.onHeaderCell()).toEqual({ className: 'kh-cot-quy' });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/cotChung.test.ts`
Expected: FAIL — `nhanChenhLech is not a function`.

`vitest.config.ts` đặt `environment: 'node'`. Hai hàm được test là hàm thuần, nhưng
file `cotChung.tsx` có import antd ở đầu. Nếu lần chạy này đổ vì thiếu DOM, thêm
dòng đầu file test: `// @vitest-environment jsdom`.

- [ ] **Step 3: Sửa `cotChung.tsx`**

3a. Đổi dòng import đầu file để lấy thêm `LECH_TOI_THIEU`:

```tsx
import type { HangBang, LoaiHang } from "./tongHop";
import { LECH_TOI_THIEU } from "./tongHop";
```

3b. Thêm khối lớp màu và `capCot`, đặt ngay sau `phanTramText`:

```tsx
/**
 * Bốn cấp thông tin của bảng kế hoạch. Nguyên tắc bắt buộc: CÙNG CẤP = CÙNG MÀU
 * — không nhạt dần theo từng cột riêng lẻ, vì như vậy người đọc không nhận ra
 * đâu là ranh giới giữa hai cấp.
 */
export const CAP_CHINH = "kh-cot-chinh";
export const CAP_NAM = "kh-cot-nam";
export const CAP_QUY = "kh-cot-quy";
export const CAP_THANG = "kh-cot-thang";

/** Gắn cùng một lớp cho ô tiêu đề và ô dữ liệu của một cột. */
export const capCot = (lop: string) => ({
  className: lop,
  onHeaderCell: () => ({ className: lop }),
});
```

3c. Thêm `nhanChenhLech` ngay sau `capCot`:

```tsx
export interface NhanChenhLech {
  text: string;
  tooltip: string;
  lop: string;
}

/**
 * Nhãn của cột CHÊNH LỆCH. Trả `null` khi đã khớp — ô để trống, không tô gì.
 *
 * Dấu trừ dùng ký tự minus thật (−, U+2212) chứ không phải gạch nối: ở cỡ chữ
 * bảng, gạch nối dễ đọc nhầm thành dấu ngăn cách.
 */
export function nhanChenhLech(chenhLech: number): NhanChenhLech | null {
  if (Math.abs(chenhLech) < LECH_TOI_THIEU) return null;
  const vuot = chenhLech > 0;
  const so = tien(Math.abs(chenhLech));
  return {
    text: `${vuot ? "+" : "−"}${so}`,
    tooltip: vuot
      ? `Phân bổ vượt mục tiêu ${so} ₫`
      : `Còn thiếu ${so} ₫`,
    lop: vuot ? "text-green-600 font-semibold" : "text-red-500 font-semibold",
  };
}
```

3d. Thêm `cotCaNamVaChenhLech` ngay trước `cotQuyVaThang`:

```tsx
/**
 * Hai cột tổng hợp cấp năm, luôn đứng TRƯỚC nhóm Quý (thứ tự tài liệu:
 * CẢ NĂM → Q1..Q4 → T1..T12). Cả hai đều tự tính, không nhập được.
 */
export function cotCaNamVaChenhLech<
  T extends HangBang<unknown>,
>(): ColumnsType<T> {
  return [
    {
      title: "CẢ NĂM",
      key: "caNam",
      width: 150,
      align: "right",
      ...capCot(CAP_NAM),
      render: (_: unknown, row: T) => soCell(row.loai, tien(row.namTheoThang)),
    },
    {
      title: "CHÊNH LỆCH",
      key: "chenhLech",
      width: 150,
      align: "right",
      ...capCot(CAP_NAM),
      render: (_: unknown, row: T) => {
        const nhan = nhanChenhLech(row.chenhLech);
        if (!nhan) return null;
        return (
          <Tooltip title={nhan.tooltip}>
            <span className={nhan.lop}>{nhan.text}</span>
          </Tooltip>
        );
      },
    },
  ];
}
```

3e. Gắn màu cho nhóm Quý và nhóm Tháng trong `cotQuyVaThang` — thêm `...capCot(...)` vào từng cột con và vào hai cột cha:

```tsx
  const cotQuy = [0, 1, 2, 3].map((i) => ({
    title: `Q${i + 1}`,
    key: `q${i + 1}`,
    width: 110,
    align: "right" as const,
    ...capCot(CAP_QUY),
    render: (_: unknown, row: T) => soCell(row.loai, tien(row.quy[i])),
  }));

  const cotThang = Array.from({ length: 12 }, (_, i) => ({
    title: `T${i + 1}`,
    key: `t${i + 1}`,
    width: 110,
    align: "right" as const,
    ...capCot(CAP_THANG),
    render: (_: unknown, row: T) =>
      opts.suaDuoc(row) ? (
        <InputNumber
          {...numberInputProps}
          value={row.thang[i] ?? 0}
          onChange={(v) => opts.doiThang(row, i, Number(v) || 0)}
        />
      ) : (
        soCell(row.loai, tien(row.thang[i]))
      ),
  }));

  return [
    { title: "Quý", key: "quy", ...capCot(CAP_QUY), children: cotQuy },
    { title: "Tháng", key: "thang", ...capCot(CAP_THANG), children: cotThang },
  ];
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/cotChung.test.ts`
Expected: PASS — 6 test.

- [ ] **Step 5: Thêm màu bốn cấp vào `fe/src/index.css`**

Chèn ngay sau khối `.excel-table .kh-hang-nhap:hover > td { ... }` (khoảng dòng 2680):

```css
/* --- Quy chuẩn màu theo CẤP THÔNG TIN của bảng kế hoạch ---
   Nguyên tắc bắt buộc: cùng cấp = cùng màu. Không nhạt dần theo từng cột riêng
   lẻ — người đọc phải nhận ra ranh giới giữa Năm / Quý / Tháng bằng thị giác,
   chứ không phải bằng cách đọc tiêu đề từng cột.

   Hàng TỔNG CỘNG / hàng nhóm / hàng đang gõ dở đặt !important nên vẫn thắng
   được nền cấp cột ở phần thân bảng — đúng ý: cấp HÀNG quan trọng hơn cấp CỘT. */
.kh-bang th.kh-cot-chinh {
  background: hsl(var(--primary) / 0.14) !important;
}

.kh-bang th.kh-cot-nam {
  background: hsl(var(--primary) / 0.22) !important;
}

.kh-bang th.kh-cot-quy {
  background: hsl(var(--primary) / 0.1) !important;
}

.kh-bang th.kh-cot-thang {
  background: hsl(var(--primary) / 0.04) !important;
}

/* Thân bảng: chỉ hai cột cấp năm được nhấn, để mắt bám được cột quan trọng nhất
   khi kéo ngang qua 16 cột số. */
.kh-bang td.kh-cot-nam {
  background: hsl(var(--primary) / 0.06);
  font-variant-numeric: tabular-nums;
}

.kh-bang td.kh-cot-quy,
.kh-bang td.kh-cot-thang {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 6: Kiểm tra lint và commit**

Run: `cd fe && npx eslint src/pages/ke-hoach/tabs/lib/cotChung.tsx src/pages/ke-hoach/tabs/lib/cotChung.test.ts`
Expected: không có lỗi.

```bash
git add fe/src/pages/ke-hoach/tabs/lib/cotChung.tsx fe/src/pages/ke-hoach/tabs/lib/cotChung.test.ts fe/src/index.css
git commit -m "feat(ke-hoach): cột CẢ NĂM + CHÊNH LỆCH và quy chuẩn màu theo cấp thông tin"
```

---

### Task 3: Banner cảnh báo cấp bảng

**Files:**
- Create: `fe/src/pages/ke-hoach/tabs/lib/CanhBaoLechMucTieu.tsx`

**Interfaces:**
- Consumes: `tongLech`, `TongLech`, `HangBang` từ `./tongHop` (Task 1); `tien` từ `./cotChung` (Task 2).
- Produces: `export const CanhBaoLechMucTieu: React.FC<{ rows: HangBang<unknown>[] }>` — tự ẩn khi không có dòng nào lệch.

- [ ] **Step 1: Tạo component**

Tạo `fe/src/pages/ke-hoach/tabs/lib/CanhBaoLechMucTieu.tsx`:

```tsx
import React, { useMemo } from "react";
import { Alert } from "antd";
import { tongLech, type HangBang } from "./tongHop";
import { tien } from "./cotChung";

/**
 * Cảnh báo cấp bảng — đặt phía trên bảng, chỗ dễ nhìn nhất.
 *
 * Chỉ cảnh báo, KHÔNG chặn lưu: kế hoạch được lập dần trong nhiều buổi, chặn
 * lưu khi chưa phân bổ đủ sẽ làm mất công gõ dở.
 *
 * Phần lệch của từng dòng nằm ở cột CHÊNH LỆCH; ở đây chỉ nói tổng, để người
 * dùng biết còn bao nhiêu phải chia trước khi cuộn xuống tìm dòng đỏ.
 */
export const CanhBaoLechMucTieu: React.FC<{
  rows: HangBang<unknown>[];
}> = ({ rows }) => {
  const lech = useMemo(() => tongLech(rows), [rows]);

  if (lech.soDongLech === 0) return null;

  return (
    <Alert
      type="error"
      showIcon
      className="mb-2"
      message="Kế hoạch chi tiết chưa khớp với mục tiêu năm. Vui lòng kiểm tra các dòng được cảnh báo bên dưới."
      description={
        <span className="text-xs">
          {lech.thieu > 0 && (
            <>
              Còn cần phân bổ:{" "}
              <b className="text-red-600">{tien(lech.thieu)} ₫</b>
            </>
          )}
          {lech.thieu > 0 && lech.vuot > 0 && " · "}
          {lech.vuot > 0 && (
            <>
              Phân bổ vượt:{" "}
              <b className="text-green-600">{tien(lech.vuot)} ₫</b>
            </>
          )}
          {" · "}
          {lech.soDongLech} dòng lệch
        </span>
      }
    />
  );
};
```

- [ ] **Step 2: Kiểm tra lint**

Run: `cd fe && npx eslint src/pages/ke-hoach/tabs/lib/CanhBaoLechMucTieu.tsx`
Expected: không có lỗi.

- [ ] **Step 3: Chạy lại test của Task 1 để chắc chắn không vỡ gì**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/`
Expected: PASS — 15 test (9 của tongHop + 6 của cotChung).

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/ke-hoach/tabs/lib/CanhBaoLechMucTieu.tsx
git commit -m "feat(ke-hoach): banner cảnh báo lệch mục tiêu ở cấp bảng"
```

---

### Task 4: Bảng Bán hàng — cột Diễn giải, khung cột mới, banner

**Files:**
- Modify: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/init/init.state.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/row-edit/row-edit.handler.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/ban-hang/BanHangTable.tsx`

**Interfaces:**
- Consumes: `cotCaNamVaChenhLech`, `capCot`, `CAP_CHINH` từ `../lib/cotChung` (Task 2); `CanhBaoLechMucTieu` từ `../lib/CanhBaoLechMucTieu` (Task 3); `MoTaHang.ghiChu` (Task 1).
- Produces: `BanHangVal` thêm `ghiChu: string`. Bảng Nhân sự ở Task 5 làm y hệt khuôn này.

BE đã nhận `ghiChu` sẵn: `CreateKeHoachBanHangDto.ghiChu` là `@IsOptional() @IsString()`, và `KeHoachBanHangPatch` phía FE là `Partial<Omit<payload,'nam'|'sanPham'>>` nên đã cho phép `ghiChu`. Không phải sửa gì bên BE cho task này.

- [ ] **Step 1: Thêm `ghiChu` vào giá trị gõ được**

Trong `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/init/init.state.ts`:

```ts
export interface BanHangVal {
  /** Mã nhóm sản phẩm — `SanPham.nhom` lưu mã chứ không lưu id. */
  nhomMa: string;
  sanPhamId: string;
  /** Cột DIỄN GIẢI — lưu vào trường `ghiChu` của bản ghi. */
  ghiChu: string;
  luong: number;
  giaBinhQuan: number;
  thang: number[];
}

export const valTuDong = (d: KeHoachBanHangDong): BanHangVal => ({
  nhomMa: d.nhomSanPham.ma,
  sanPhamId: d.sanPham.id,
  ghiChu: d.ghiChu ?? "",
  luong: d.luong,
  giaBinhQuan: d.giaBinhQuan,
  thang: [...d.thang],
});
```

- [ ] **Step 2: Cho handler gửi `ghiChu` lên server**

Trong `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/row-edit/row-edit.handler.ts`, sửa ba chỗ:

2a. `valRong`:

```ts
const valRong = (nhomMa = ""): BanHangVal => ({
  nhomMa,
  sanPhamId: "",
  ghiChu: "",
  luong: 0,
  giaBinhQuan: 0,
  thang: Array(SO_THANG).fill(0),
});
```

2b. `dungPayload` — thêm `ghiChu` vào object trả về:

```ts
    return {
      nhomSanPham: nhom
        ? { id: nhom.id, ma: nhom.ma, ten: nhom.ten }
        : undefined,
      sanPham: sp ? { id: sp.id, ma: sp.ma, ten: sp.ten } : undefined,
      ghiChu: val.ghiChu,
      luong: val.luong,
      giaBinhQuan: val.giaBinhQuan,
      thang: val.thang,
    };
```

2c. `luuTatCa` — phần `sua` phải gửi kèm `ghiChu`, nếu không sửa diễn giải sẽ không lưu được:

```ts
        sua: sua.map(({ id, nhomSanPham, ghiChu, luong, giaBinhQuan, thang }) => ({
          id,
          nhomSanPham: nhomSanPham!,
          ghiChu,
          luong,
          giaBinhQuan,
          thang,
        })),
```

- [ ] **Step 3: Sửa `BanHangTable.tsx`**

3a. Bổ sung import — thêm `Input` vào khối `antd`, và đổi khối import từ `../lib/cotChung`, thêm import banner:

```tsx
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
} from "antd";
```

```tsx
import {
  CAP_CHINH,
  capCot,
  cotCaNamVaChenhLech,
  cotQuyVaThang,
  laHangGop,
  numberInputProps,
  onCellNhan,
  onCellNhanPhu,
  phanTramText,
  rowClassName,
  tien,
} from "../lib/cotChung";
import { CanhBaoLechMucTieu } from "../lib/CanhBaoLechMucTieu";
```

(`oSoNam` bị bỏ khỏi danh sách import — cột Thành tiền không còn tô đỏ, việc cảnh báo chuyển hết sang cột CHÊNH LỆCH.)

3b. Trong `rows`, cho `doc` mang theo diễn giải:

```tsx
    const doc = (d: Dong): MoTaHang => ({
      key: d.id,
      nhomKey: d.val.nhomMa || CHUA_CHON,
      nhomNhan:
        tenNhom.get(d.val.nhomMa) ??
        (d.val.nhomMa || "(Chưa chọn nhóm)"),
      nhan: tenSanPham.get(d.val.sanPhamId)?.ten ?? "",
      ghiChu: d.val.ghiChu,
      thang: d.val.thang,
      // Thành tiền = Lượng × Giá bình quân — mục tiêu năm của dòng.
      namKhaiBao: d.val.luong * d.val.giaBinhQuan,
    });
```

3c. Gắn `capCot(CAP_CHINH)` cho hai cột `Mã` và `Tên sản phẩm hàng hóa, vật tư` — thêm `...capCot(CAP_CHINH),` ngay sau dòng `onCell: ...` của mỗi cột.

3d. Chèn cột **Diễn giải** ngay sau cột `Tên sản phẩm hàng hóa, vật tư`, trước cột `Lượng`:

```tsx
    {
      title: "Diễn giải",
      key: "ghiChu",
      width: 260,
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        return (
          <Input
            size="small"
            variant="borderless"
            className="excel-cell-input"
            placeholder="Cơ sở hình thành dòng kế hoạch"
            value={row.dong!.val.ghiChu}
            onChange={(e) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { ghiChu: e.target.value },
              })
            }
          />
        );
      },
    },
```

3e. Gắn `...capCot(CAP_CHINH),` cho hai cột `Lượng` và `Giá bình quân` (thêm ngay sau `align: "right",`).

3f. Đổi cột `Doanh thu` thành `Thành tiền`, bỏ `oSoNam`:

```tsx
    {
      title: "Thành tiền",
      key: "thanhTien",
      width: 160,
      align: "right",
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => (
        <span className={laHangGop(row.loai) ? "font-semibold" : undefined}>
          {tien(row.namKhaiBao)}
        </span>
      ),
    },
```

3g. Gắn `...capCot(CAP_CHINH),` cho cột `%`, rồi chèn hai cột cấp năm ngay sau nó, TRƯỚC `cotQuyVaThang`:

```tsx
    ...cotCaNamVaChenhLech<Hang>(),
    ...cotQuyVaThang<Hang>({
```

3h. Đặt banner ngay trên bảng — sửa khối `return` cuối, chèn giữa `excel-toolbar` và `div ref={tableWrapRef}`:

```tsx
      <CanhBaoLechMucTieu rows={rows} />

      <div ref={tableWrapRef} className="flex flex-col flex-1 min-h-0">
```

- [ ] **Step 4: Kiểm tra**

Run: `cd fe && npx eslint src/pages/ke-hoach/tabs/ban-hang/`
Expected: không có lỗi.

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/`
Expected: PASS — 15 test (không có test nào vỡ).

- [ ] **Step 5: Kiểm tra bằng mắt**

Chạy `cd fe && npm run dev`, mở `/trung-tam-du-lieu/ke-hoach`, tab Bán hàng. Xác nhận:
- Thứ tự cột: `Mã | Tên sản phẩm | Diễn giải | Lượng | Giá bình quân | Thành tiền | % | CẢ NĂM | CHÊNH LỆCH | Q1..Q4 | T1..T12`
- Gõ vào một ô tháng cho tổng 12 tháng **nhỏ hơn** Thành tiền → cột CHÊNH LỆCH hiện chữ **đỏ** có dấu `−`, banner đỏ hiện phía trên.
- Gõ cho tổng **lớn hơn** → chữ **xanh** có dấu `+`.
- Gõ cho khớp → ô CHÊNH LỆCH trống, banner biến mất.
- Bốn nhóm màu tiêu đề phân biệt được, tất cả Q cùng một màu, tất cả T cùng một màu.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/ke-hoach/tabs/ban-hang/
git commit -m "feat(ke-hoach): bảng Bán hàng có cột Diễn giải, CẢ NĂM, CHÊNH LỆCH và cảnh báo hai cấp"
```

---

### Task 5: Bảng Nhân sự — cùng khung cột, và dọn `oSoNam`

**Files:**
- Modify: `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/init/init.state.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/row-edit/row-edit.handler.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/nhan-su/NhanSuTable.tsx`
- Modify: `fe/src/pages/ke-hoach/tabs/lib/cotChung.tsx` (xoá `oSoNam`)

**Interfaces:**
- Consumes: y hệt Task 4.
- Produces: `NhanSuVal` thêm `ghiChu: string`. Sau task này `oSoNam` không còn tồn tại — không code mới nào được dùng nó.

Khác bảng Bán hàng ở hai điểm: cột số năm tên **CỘNG** (tổng 6 loại chi phí), và giữa `%` với nhóm Quý còn sáu cột chi phí.

- [ ] **Step 1: Thêm `ghiChu` vào `NhanSuVal`**

Trong `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/init/init.state.ts`:

```ts
export interface NhanSuVal {
  boPhanId: string;
  maViTri: string;
  tenChucVu: string;
  /** Cột DIỄN GIẢI — lưu vào trường `ghiChu` của bản ghi. */
  ghiChu: string;
  chiPhi: ChiPhiNhanSu;
  thang: number[];
}

export const valTuDong = (d: KeHoachNhanSuDong): NhanSuVal => ({
  boPhanId: d.boPhan.id,
  maViTri: d.maViTri,
  tenChucVu: d.tenChucVu ?? "",
  ghiChu: d.ghiChu ?? "",
  chiPhi: { ...d.chiPhi },
  thang: [...d.thang],
});
```

- [ ] **Step 2: Cho handler nhân sự gửi `ghiChu`**

Mở `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/row-edit/row-edit.handler.ts` và:
- thêm `ghiChu: ""` vào hàm dựng giá trị rỗng (tương đương `valRong` của bảng Bán hàng),
- thêm `ghiChu: val.ghiChu` vào object payload dựng cho `them` và `sua`.

Bảng Nhân sự cho sửa cả bộ phận lẫn mã vị trí (`UpdateKeHoachNhanSuDto` chỉ khoá `nam`), nên `sua` gửi nguyên payload — chỉ cần chắc `ghiChu` nằm trong payload đó.

- [ ] **Step 3: Sửa `NhanSuTable.tsx`**

3a. Đổi khối import từ `../lib/cotChung` — bỏ `oSoNam`, thêm `CAP_CHINH`, `capCot`, `cotCaNamVaChenhLech`; thêm import banner:

```tsx
import {
  CAP_CHINH,
  capCot,
  cotCaNamVaChenhLech,
  cotQuyVaThang,
  laHangGop,
  numberInputProps,
  onCellNhan,
  onCellNhanPhu,
  phanTramText,
  rowClassName,
  tien,
} from "../lib/cotChung";
import { CanhBaoLechMucTieu } from "../lib/CanhBaoLechMucTieu";
```

3b. Trong `rows`, cho `doc` mang diễn giải:

```tsx
    const doc = (d: Dong): MoTaHang => ({
      key: d.id,
      nhomKey: d.val.boPhanId || CHUA_CHON,
      nhomNhan: tenBoPhan.get(d.val.boPhanId) ?? "(Chưa chọn bộ phận)",
      nhan: d.val.maViTri,
      ghiChu: d.val.ghiChu,
      thang: d.val.thang,
      // CỘNG của một dòng = tổng 6 loại chi phí.
      namKhaiBao: tongChiPhi(d.val.chiPhi),
    });
```

3c. Gắn `...capCot(CAP_CHINH),` cho cột `Mã vị trí` và cột `Tên chức vụ` (ngay sau dòng `onCell: ...`).

3d. Chèn cột **Diễn giải** ngay sau cột `Tên chức vụ`, trước cột `CỘNG`:

```tsx
    {
      title: "Diễn giải",
      key: "ghiChu",
      width: 260,
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        return (
          <Input
            size="small"
            variant="borderless"
            className="excel-cell-input"
            placeholder="Cơ sở hình thành dòng kế hoạch"
            value={row.dong!.val.ghiChu}
            onChange={(e) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { ghiChu: e.target.value },
              })
            }
          />
        );
      },
    },
```

3e. Đổi cột `CỘNG` — bỏ `oSoNam`, đổi nhãn sang `Thành tiền` cho khớp tài liệu, giữ nguyên ý nghĩa (tổng 6 loại chi phí):

```tsx
    {
      title: "Thành tiền",
      key: "thanhTien",
      width: 160,
      align: "right",
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => (
        <span className={laHangGop(row.loai) ? "font-semibold" : undefined}>
          {tien(row.namKhaiBao)}
        </span>
      ),
    },
```

3f. Gắn `...capCot(CAP_CHINH),` cho cột `%`, và cho từng cột trong `cotChiPhi` (thêm vào object trả về của `CHI_PHI_NHAN_SU_COLS.map`, ngay sau `align: "right" as const,`).

3g. Chèn hai cột cấp năm ngay trước `cotQuyVaThang`, tức là **sau** sáu cột chi phí:

```tsx
    ...cotChiPhi,
    ...cotCaNamVaChenhLech<Hang>(),
    ...cotQuyVaThang<Hang>({
```

3h. Đặt banner giữa `excel-toolbar` và `div ref={tableWrapRef}`:

```tsx
      <CanhBaoLechMucTieu rows={rows} />
```

- [ ] **Step 4: Xoá `oSoNam` khỏi `cotChung.tsx`**

Xoá nguyên hàm `oSoNam` (khối `export function oSoNam<T extends HangBang<unknown>>(row: T, tenChiTieu: string) { ... }` cùng comment của nó). Sau Task 4 và Task 5 không còn nơi nào gọi.

Run: `cd fe && grep -rn "oSoNam" src`
Expected: không ra kết quả nào.

- [ ] **Step 5: Kiểm tra**

Run: `cd fe && npx eslint src/pages/ke-hoach/tabs/`
Expected: không có lỗi.

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/`
Expected: PASS — 15 test.

- [ ] **Step 6: Kiểm tra bằng mắt**

`/trung-tam-du-lieu/ke-hoach`, tab Nhân sự. Xác nhận thứ tự cột `Mã vị trí | Tên chức vụ | Diễn giải | Thành tiền | % | 6 cột chi phí | CẢ NĂM | CHÊNH LỆCH | Q1..Q4 | T1..T12`, và banner hiện/ẩn đúng như tab Bán hàng.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/ke-hoach/tabs/
git commit -m "feat(ke-hoach): bảng Nhân sự dùng chung khung cột mới, bỏ oSoNam"
```

---

### Task 6: Điều kiện lọc theo loại kế hoạch (BE)

**Files:**
- Create: `be/apps/voucher-service/src/ke-hoach-bang/helpers/loai-ke-hoach.helper.ts`
- Test: `be/apps/voucher-service/src/ke-hoach-bang/helpers/loai-ke-hoach.helper.spec.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/helpers/index.ts`

**Interfaces:**
- Consumes: `LoaiKeHoach` từ `@app/entities`.
- Produces: `export function dieuKienLoaiKeHoach(loaiKeHoach: LoaiKeHoach): Record<string, unknown>` — trả mảnh điều kiện Mongo để trộn vào `where`. Task 7 dùng ở cả hai service.

- [ ] **Step 1: Xác nhận `LoaiKeHoach` xuất được từ `@app/entities`**

Run: `cd be && grep -rn "LoaiKeHoach" libs/entities/src/ | head`
Expected: thấy `export type LoaiKeHoach` trong `libs/entities/src/voucher/ke-hoach.entity.ts`, và file này được re-export qua barrel của `libs/entities/src`. Nếu barrel chưa export, thêm vào barrel trước khi làm tiếp.

- [ ] **Step 2: Viết test thất bại**

Tạo `be/apps/voucher-service/src/ke-hoach-bang/helpers/loai-ke-hoach.helper.spec.ts`:

```ts
import { dieuKienLoaiKeHoach } from './loai-ke-hoach.helper';

describe('dieuKienLoaiKeHoach', () => {
  it('KE_HOACH nhận cả bản ghi chưa có trường loaiKeHoach', () => {
    expect(dieuKienLoaiKeHoach('KE_HOACH')).toEqual({
      $or: [{ loaiKeHoach: 'KE_HOACH' }, { loaiKeHoach: { $exists: false } }],
    });
  });

  it('DU_BAO chỉ nhận đúng bản ghi dự báo', () => {
    expect(dieuKienLoaiKeHoach('DU_BAO')).toEqual({ loaiKeHoach: 'DU_BAO' });
  });

  it('không nhận nhầm bản ghi thiếu trường khi lọc DU_BAO', () => {
    // Nếu nhánh $exists áp cho cả hai loại thì dữ liệu cũ sẽ hiện ở trang Dự báo.
    expect(JSON.stringify(dieuKienLoaiKeHoach('DU_BAO'))).not.toContain(
      '$exists',
    );
  });
});
```

- [ ] **Step 3: Chạy test để chắc chắn nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach-bang/helpers/loai-ke-hoach.helper.spec.ts`
Expected: FAIL — `Cannot find module './loai-ke-hoach.helper'`.

- [ ] **Step 4: Viết helper**

Tạo `be/apps/voucher-service/src/ke-hoach-bang/helpers/loai-ke-hoach.helper.ts`:

```ts
import type { LoaiKeHoach } from '@app/entities';

/**
 * Mảnh điều kiện Mongo lọc theo loại kế hoạch, trộn vào `where` của bảng.
 *
 * Bản ghi tạo TRƯỚC khi hai bảng có trường `loaiKeHoach` không mang trường này.
 * Chúng đều là số KẾ HOẠCH, nên nhánh KE_HOACH phải nhận cả dòng thiếu trường —
 * nếu không, toàn bộ kế hoạch công ty đang dùng sẽ biến mất khỏi bảng ngay khi
 * deploy, trước lúc script backfill kịp chạy.
 *
 * Nhánh DU_BAO thì tuyệt đối KHÔNG được nới: dữ liệu cũ không phải dự báo.
 *
 * Bỏ nhánh $exists sau khi `backfill-loai-ke-hoach-bang.js` đã chạy trên mọi tenant.
 */
export function dieuKienLoaiKeHoach(
  loaiKeHoach: LoaiKeHoach,
): Record<string, unknown> {
  if (loaiKeHoach === 'KE_HOACH') {
    return {
      $or: [{ loaiKeHoach: 'KE_HOACH' }, { loaiKeHoach: { $exists: false } }],
    };
  }
  return { loaiKeHoach };
}
```

Thêm vào `be/apps/voucher-service/src/ke-hoach-bang/helpers/index.ts`:

```ts
export * from './loai-ke-hoach.helper';
```

- [ ] **Step 5: Chạy test để chắc chắn nó xanh**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach-bang/helpers/`
Expected: PASS — 3 test mới, cộng các test sẵn có của `trung-khoa.helper.spec.ts`.

- [ ] **Step 6: Commit**

```bash
git add be/apps/voucher-service/src/ke-hoach-bang/helpers/
git commit -m "feat(ke-hoach): điều kiện lọc theo loại kế hoạch, dung thứ dữ liệu chưa backfill"
```

---

### Task 7: Trường `loaiKeHoach` cho hai bảng kế hoạch (BE)

**Files:**
- Modify: `be/libs/entities/src/voucher/ke-hoach-ban-hang.entity.ts`
- Modify: `be/libs/entities/src/voucher/ke-hoach-nhan-su.entity.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/dto/ban-hang-query.dto.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/dto/create-ban-hang.dto.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/dto/batch-ban-hang.dto.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/ban-hang.service.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/ban-hang.controller.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/dto/nhan-su-query.dto.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/dto/create-nhan-su.dto.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/dto/batch-nhan-su.dto.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/nhan-su.service.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/nhan-su.controller.ts`
- Test: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/ban-hang.service.spec.ts` (bổ sung)
- Test: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/nhan-su.service.spec.ts` (bổ sung)

**Interfaces:**
- Consumes: `dieuKienLoaiKeHoach` từ `../helpers` (Task 6).
- Produces:
  - `KeHoachBanHang.loaiKeHoach: LoaiKeHoach`, `KeHoachNhanSu.loaiKeHoach: LoaiKeHoach`
  - `KeHoachBanHangService.layTheoNam(nam: number, loaiKeHoach: LoaiKeHoach)` — **đổi chữ ký, thêm tham số bắt buộc**
  - `KeHoachNhanSuService.layTheoNam(nam: number, loaiKeHoach: LoaiKeHoach)` — như trên
  - Query/Create/Batch DTO của cả hai bảng có `loaiKeHoach: LoaiKeHoach` với mặc định `'KE_HOACH'`
  - Task 9 (FE) gửi `loaiKeHoach` qua query string cho GET và trong body cho POST/batch.

- [ ] **Step 1: Viết test thất bại cho bảng Bán hàng**

Thêm vào cuối `describe('KeHoachBanHangService', ...)` trong `ban-hang.service.spec.ts`:

```ts
  describe('loaiKeHoach', () => {
    it('Kế hoạch nhận cả dòng cũ chưa có trường loaiKeHoach', async () => {
      repo.find.mockResolvedValue([]);
      await service.layTheoNam(2026, 'KE_HOACH');
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nam: 2026,
            tenantId: 't1',
            $or: [
              { loaiKeHoach: 'KE_HOACH' },
              { loaiKeHoach: { $exists: false } },
            ],
          }),
        }),
      );
    });

    it('Dự báo chỉ lấy đúng dòng dự báo', async () => {
      repo.find.mockResolvedValue([]);
      await service.layTheoNam(2026, 'DU_BAO');
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nam: 2026, tenantId: 't1', loaiKeHoach: 'DU_BAO' },
        }),
      );
    });

    it('dòng thêm mới mang đúng loại của lô', async () => {
      repo.countDocuments.mockResolvedValue(0);
      const dong = await service.taoMoi(
        { ...dtoMau, loaiKeHoach: 'DU_BAO' },
        'u1',
      );
      expect(dong).toEqual(
        expect.objectContaining({ loaiKeHoach: 'DU_BAO' }),
      );
    });

    it('cùng sản phẩm ở hai loại khác nhau không coi là trùng', async () => {
      // Trùng phải soi trong PHẠM VI loại: sản phẩm SP1 có ở Kế hoạch không cản
      // việc thêm SP1 vào Dự báo.
      repo.countDocuments.mockResolvedValue(0);
      await service.taoMoi({ ...dtoMau, loaiKeHoach: 'DU_BAO' }, 'u1');
      expect(repo.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ loaiKeHoach: 'DU_BAO' }),
      );
    });
  });
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach-bang/ban-hang/`
Expected: FAIL — `layTheoNam` chưa nhận tham số thứ hai, `where` không có `$or`.

- [ ] **Step 3: Thêm trường vào hai entity**

`be/libs/entities/src/voucher/ke-hoach-ban-hang.entity.ts` — thêm import và cột, ngay trên `nam`:

```ts
import type { LoaiKeHoach } from './ke-hoach.entity';
```

```ts
  /**
   * KE_HOACH hay DU_BAO. Hai trang dùng chung bảng này; thiếu trường thì số kế
   * hoạch và số dự báo trộn vào nhau.
   *
   * Bản ghi tạo trước khi có trường này không mang nó — đều là KE_HOACH,
   * xem `dieuKienLoaiKeHoach` phía service.
   */
  @Column({ default: 'KE_HOACH' })
  loaiKeHoach: LoaiKeHoach;

  @Column()
  nam: number;
```

Làm y hệt trong `ke-hoach-nhan-su.entity.ts` (file này đã import từ `./ke-hoach-ban-hang.entity`, thêm import `LoaiKeHoach` từ `./ke-hoach.entity`).

- [ ] **Step 4: Thêm `loaiKeHoach` vào DTO của cả hai bảng**

`ban-hang/dto/ban-hang-query.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import type { LoaiKeHoach } from '@app/entities';

export class KeHoachBanHangQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  nam: number;

  // Không truyền = Kế hoạch: giữ nguyên hành vi cho bản FE cũ chưa gửi tham số.
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach: LoaiKeHoach = 'KE_HOACH';
}
```

`ban-hang/dto/create-ban-hang.dto.ts` — thêm vào đầu class `CreateKeHoachBanHangDto`, cùng import `IsIn` và `LoaiKeHoach`:

```ts
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach: LoaiKeHoach = 'KE_HOACH';

  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;
```

`ban-hang/dto/batch-ban-hang.dto.ts` — `loaiKeHoach` lấy ở cấp lô như `nam`, nên bỏ khỏi từng dòng:

```ts
export class ThemKeHoachBanHangItemDto extends OmitType(
  CreateKeHoachBanHangDto,
  ['nam', 'loaiKeHoach'] as const,
) {}
```

và thêm vào `BatchKeHoachBanHangDto`, ngay sau `nam` (nhớ import `IsIn`, `IsOptional` đã có sẵn, và `LoaiKeHoach`):

```ts
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach: LoaiKeHoach = 'KE_HOACH';
```

Lặp lại y hệt cho ba file DTO tương ứng bên `nhan-su/dto/`.

- [ ] **Step 5: Sửa hai service**

`ban-hang.service.ts` — thêm import `dieuKienLoaiKeHoach` vào dòng `import { kiemTraTrungKhoa } from '../helpers';`:

```ts
import { dieuKienLoaiKeHoach, kiemTraTrungKhoa } from '../helpers';
import type { LoaiKeHoach } from '@app/entities';
```

Sửa ba chỗ:

```ts
  /** Vài chục dòng mỗi năm nên trả hết, không phân trang. */
  async layTheoNam(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<KeHoachBanHang[]> {
    return this.repo.find({
      where: this.theoTenant({ nam, ...dieuKienLoaiKeHoach(loaiKeHoach) }),
      order: { 'nhomSanPham.ma': 'ASC', 'sanPham.ma': 'ASC' } as never,
    });
  }
```

```ts
    const trung = await this.repo.countDocuments(
      this.theoTenant({
        nam: dto.nam,
        loaiKeHoach: dto.loaiKeHoach,
        'sanPham.id': dto.sanPham.id,
      }),
    );
```

(Ở đây dùng `loaiKeHoach: dto.loaiKeHoach` trực tiếp chứ không qua helper: `taoMoi` chỉ chặn trùng cho dòng mới, mà dòng mới luôn có trường này. Dùng `$or` ở đây sẽ khiến một sản phẩm đã có trong Kế hoạch chặn mất việc thêm nó vào Dự báo.)

Trong `luuHangLoat`, `hienCo` phải lọc theo loại — nếu không, lô Dự báo sẽ soi trùng với dòng Kế hoạch:

```ts
    const hienCo = await this.repo.find({
      where: this.theoTenant({
        nam: dto.nam,
        ...dieuKienLoaiKeHoach(dto.loaiKeHoach),
      }),
    });
```

và dòng thêm mới mang loại của lô:

```ts
    const dongThem = them.map((t) =>
      this.repo.create({
        ...t,
        nam: dto.nam,
        loaiKeHoach: dto.loaiKeHoach,
        nguoiTaoId,
        tenantId,
      }),
    );
```

Làm y hệt trong `nhan-su.service.ts`: `layTheoNam` nhận thêm tham số, `taoMoi` thêm `loaiKeHoach: dto.loaiKeHoach` vào điều kiện `countDocuments`, `luuHangLoat` lọc `hienCo` và gán `loaiKeHoach` cho `dongThem`.

- [ ] **Step 6: Sửa hai controller**

`ban-hang.controller.ts`:

```ts
  @Get()
  @Roles(...XEM)
  async layTheoNam(@Query() query: KeHoachBanHangQueryDto) {
    return {
      success: true,
      data: await this.service.layTheoNam(query.nam, query.loaiKeHoach),
    };
  }
```

Y hệt cho `nhan-su.controller.ts`.

- [ ] **Step 7: Bổ sung test cho bảng Nhân sự**

Thêm vào `nhan-su.service.spec.ts` một `describe('loaiKeHoach', ...)` gồm hai test đầu của Step 1 (đổi `service.layTheoNam(2026, ...)` cho service nhân sự, và `order` khác nên dùng `expect.objectContaining` cho `where` như trên).

- [ ] **Step 8: Chạy test để chắc chắn nó xanh**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach-bang/`
Expected: PASS toàn bộ — gồm 4 test mới của Bán hàng, 2 test mới của Nhân sự, và các test sẵn có.

- [ ] **Step 9: Commit**

```bash
git add be/libs/entities/src/voucher/ be/apps/voucher-service/src/ke-hoach-bang/
git commit -m "feat(ke-hoach): hai bảng chi tiết tách số Kế hoạch và số Dự báo"
```

---

### Task 8: Script backfill `loaiKeHoach`

**Files:**
- Create: `be/scripts/backfill-loai-ke-hoach-bang.js`

**Interfaces:**
- Consumes: trường `loaiKeHoach` từ Task 7.
- Produces: không có mã nào phụ thuộc; chạy một lần trên production sau khi deploy.

- [ ] **Step 1: Viết script**

Tạo `be/scripts/backfill-loai-ke-hoach-bang.js`:

```js
/**
 * Gắn `loaiKeHoach: "KE_HOACH"` cho các dòng của hai bảng kế hoạch chi tiết đã
 * lập trước khi hai bảng tách số Kế hoạch và số Dự báo.
 *
 * Mọi dòng cũ đều là số KẾ HOẠCH: trang Dự báo trước đây không có hai bảng này.
 *
 * - Idempotent: chỉ đụng dòng CHƯA có trường → chạy lại an toàn.
 * - Không truyền TENANT thì chạy cho mọi tenant.
 * - Service đã dung thứ dòng thiếu trường (xem `dieuKienLoaiKeHoach`), nên
 *   script này là dọn dẹp, không phải điều kiện để deploy.
 *
 * TOÀN BỘ thân script nằm trong một IIFE: khi pipe qua stdin, mongosh chạy ở chế độ
 * REPL và đánh giá TỪNG DÒNG — một biểu thức trải trên nhiều dòng sẽ bị cắt và gán
 * sai giá trị mà không báo lỗi. Bọc hàm thì cả khối vào một lượt.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY (từ máy local, qua SSH tới server prod):
 *
 *   cat be/scripts/backfill-loai-ke-hoach-bang.js | \
 *     ssh kt "DRY=1 docker exec -i -e TENANT -e DRY mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * DRY=1 chỉ in ra dự định, không ghi. Bỏ DRY (hoặc DRY=0) để ghi thật.
 * Thêm TENANT=<tenantId> để giới hạn một công ty.
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  var TENANT = (typeof process !== "undefined" && process.env.TENANT) || "";
  var DRY = (typeof process !== "undefined" && process.env.DRY) === "1";

  var COLLECTIONS = ["ke_hoach_ban_hang", "ke_hoach_nhan_su"];

  var filter = { loaiKeHoach: { $exists: false } };
  if (TENANT) filter.tenantId = TENANT;

  print("Tenant : " + (TENANT || "(tất cả)"));
  print("Chế độ : " + (DRY ? "DRY — chỉ in, không ghi" : "GHI THẬT"));

  var tong = 0;
  for (var i = 0; i < COLLECTIONS.length; i++) {
    var ten = COLLECTIONS[i];
    var can = db.getCollection(ten).countDocuments(filter);
    tong += can;
    print(ten + ": " + can + " dòng thiếu loaiKeHoach");
  }

  if (tong === 0) {
    print("Không có dòng nào cần bổ sung — dừng.");
    return;
  }

  if (DRY) {
    print("DRY=1 — chưa ghi gì. Bỏ DRY để chạy thật.");
    return;
  }

  for (var j = 0; j < COLLECTIONS.length; j++) {
    var col = COLLECTIONS[j];
    var kq = db
      .getCollection(col)
      .updateMany(filter, { $set: { loaiKeHoach: "KE_HOACH" } });
    print(col + ": đã cập nhật " + kq.modifiedCount + " dòng");
  }
})();
```

- [ ] **Step 2: Chạy thử ở chế độ DRY trên production**

Run:
```bash
cat be/scripts/backfill-loai-ke-hoach-bang.js | \
  ssh kt "DRY=1 docker exec -i -e DRY mongo mongosh \
    'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
```
Expected: in ra số dòng của hai collection, kết thúc bằng dòng `DRY=1 — chưa ghi gì.`
Ghi lại con số này — sau khi chạy thật, `modifiedCount` phải khớp.

- [ ] **Step 3: Commit**

```bash
git add be/scripts/backfill-loai-ke-hoach-bang.js
git commit -m "chore(ke-hoach): script backfill loaiKeHoach cho hai bảng chi tiết"
```

> Chạy thật (bỏ `DRY=1`) **sau khi** deploy xong BE của Task 7. Chưa chạy vẫn không sao — service đã dung thứ dòng thiếu trường.

---

### Task 9: FE gửi `loaiKeHoach` xuống hai bảng

**Files:**
- Modify: `fe/src/services/keHoachBanHangService.ts`
- Modify: `fe/src/services/keHoachNhanSuService.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/init/init.state.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/init/init.event.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/init/init.handler.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/row-edit/row-edit.handler.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/ban-hang/BanHangTab.tsx`
- Modify: bốn file tương ứng bên `fe/src/pages/ke-hoach/tabs/nhan-su/`

**Interfaces:**
- Consumes: endpoint nhận `loaiKeHoach` từ Task 7.
- Produces:
  - `keHoachBanHangService.layTheoNam(nam: number, loaiKeHoach: LoaiKeHoach)`
  - `KeHoachBanHangBatch` thêm `loaiKeHoach: LoaiKeHoach`
  - `BanHangTab` / `NhanSuTab` nhận prop `{ nam: number; loaiKeHoach: LoaiKeHoach }`
  - Sự kiện `init` nhận `{ nam: number; loaiKeHoach: LoaiKeHoach }`
  - State `loaiKeHoach: LoaiKeHoach` trong cả hai namespace handler
- Task 10 truyền prop `loaiKeHoach` xuống hai tab này.

- [ ] **Step 1: Sửa hai service FE**

Trong `fe/src/services/keHoachBanHangService.ts`:

```ts
import { ServiceBase } from './base/service-base';
import type { LoaiKeHoach } from './keHoachService';
```

Thêm `loaiKeHoach` vào `KeHoachBanHangDong`, ngay trên `nam`:

```ts
export interface KeHoachBanHangDong {
  id: string;
  loaiKeHoach: LoaiKeHoach;
  nam: number;
```

`KeHoachBanHangPatch` phải bỏ luôn `loaiKeHoach` — đổi loại là chuyển sang bảng khác, phải thêm dòng mới:

```ts
export type KeHoachBanHangPatch = Partial<
  Omit<KeHoachBanHangPayload, 'nam' | 'loaiKeHoach' | 'sanPham'>
>;
```

`KeHoachBanHangBatch` mang `loaiKeHoach` ở cấp lô, dòng thêm mới bỏ cả hai trường cấp lô:

```ts
export interface KeHoachBanHangBatch {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  them: Omit<KeHoachBanHangPayload, 'nam' | 'loaiKeHoach'>[];
  sua: (KeHoachBanHangPatch & { id: string })[];
}
```

và `layTheoNam` gửi tham số:

```ts
  async layTheoNam(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<KeHoachBanHangDong[]> {
    const res = await this.get<DongResponse[]>({
      params: { nam, loaiKeHoach },
    });
    return (res ?? []).map((d) => this.map(d));
  }
```

Làm y hệt trong `fe/src/services/keHoachNhanSuService.ts` (ở đó `KeHoachNhanSuPatch` là `Partial<Omit<KeHoachNhanSuPayload, 'nam'>>` → đổi thành `Omit<..., 'nam' | 'loaiKeHoach'>`).

- [ ] **Step 2: Thêm `loaiKeHoach` vào state và sự kiện `init`**

`ban-hang/handler/sub-handler/init/init.state.ts` — thêm vào `BanHangInitStates`, ngay trên `nam`:

```ts
export interface BanHangInitStates extends BaseStates {
  loaiKeHoach: LoaiKeHoach;
  nam: number;
```

(kèm `import type { LoaiKeHoach } from "@/services/keHoachService";`)

`ban-hang/handler/sub-handler/init/init.event.ts` — sự kiện `init` đổi `params` thành `{ nam: number; loaiKeHoach: LoaiKeHoach }`.

- [ ] **Step 3: Sửa handler `init`**

`ban-hang/handler/sub-handler/init/init.handler.ts`:

```ts
  @HandlerDecorator("init")
  async init(params: { nam: number; loaiKeHoach: LoaiKeHoach }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState("nam", params.nam);
    this.setState("loaiKeHoach", params.loaiKeHoach);
    // Đổi năm hoặc đổi loại là đổi hẳn bản kế hoạch — bỏ mọi thứ đang gõ dở.
    this.setState("nhap", {});
    this.setState("dongMoi", []);
    await Promise.all([
      this.napDong(params.nam, params.loaiKeHoach),
      this.napDanhMuc(),
    ]);
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    await this.napDong(
      this.getState("nam") as number,
      this.getState("loaiKeHoach") as LoaiKeHoach,
    );
  }

  private async napDong(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<void> {
    this.setState("loading", true);
    try {
      this.setState(
        "data",
        await keHoachBanHangService.layTheoNam(nam, loaiKeHoach),
      );
    } catch (error) {
      console.error("Lỗi nạp kế hoạch bán hàng:", error);
    } finally {
      this.setState("loading", false);
    }
  }
```

Thêm `["loaiKeHoach", "KE_HOACH"]` vào mảng `mac` trong `khoiTaoMacDinh()`.

- [ ] **Step 4: Sửa `luuTatCa` gửi kèm `loaiKeHoach`**

`ban-hang/handler/sub-handler/row-edit/row-edit.handler.ts`:

```ts
      const kq = await keHoachBanHangService.luuHangLoat({
        nam: this.getState("nam") as number,
        loaiKeHoach: this.getState("loaiKeHoach") as LoaiKeHoach,
        them: them as never,
```

- [ ] **Step 5: Sửa tab nhận prop**

`ban-hang/BanHangTab.tsx`:

```tsx
import React, { useEffect } from "react";
import type { LoaiKeHoach } from "@/services/keHoachService";
import {
  BanHangHandlerProvider,
  useBanHangHandler,
} from "./BanHangHandlerContext";
import { BanHangTable } from "./BanHangTable";

interface Props {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
}

const BanHangTabInner: React.FC<Props> = ({ nam, loaiKeHoach }) => {
  const handler = useBanHangHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, loaiKeHoach });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, loaiKeHoach]);

  return <BanHangTable />;
};

export const BanHangTab: React.FC<Props> = (props) => (
  <BanHangHandlerProvider>
    <BanHangTabInner {...props} />
  </BanHangHandlerProvider>
);
```

- [ ] **Step 6: Lặp lại Step 2–5 cho bảng Nhân sự**

Đúng bốn file này, dùng `keHoachNhanSuService`, namespace `ke-hoach-nhan-su`, component `NhanSuTab`:
- `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/init/init.state.ts`
- `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/init/init.event.ts`
- `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/init/init.handler.ts`
- `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/row-edit/row-edit.handler.ts`
- `fe/src/pages/ke-hoach/tabs/nhan-su/NhanSuTab.tsx`

- [ ] **Step 7: Kiểm tra**

Run: `cd fe && npx eslint src/services/keHoachBanHangService.ts src/services/keHoachNhanSuService.ts src/pages/ke-hoach/tabs/`
Expected: không có lỗi.

Run: `cd fe && grep -rn "layTheoNam(" src/pages/ke-hoach/`
Expected: mọi lời gọi đều có hai tham số.

- [ ] **Step 8: Commit**

```bash
git add fe/src/services/keHoachBanHangService.ts fe/src/services/keHoachNhanSuService.ts fe/src/pages/ke-hoach/tabs/
git commit -m "feat(ke-hoach): hai bảng chi tiết nhận loaiKeHoach từ trang cha"
```

---

### Task 10: Trang Dự báo dùng chung bộ tab

**Files:**
- Modify: `fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx`
- Modify: `fe/src/pages/ke-hoach/tabs/kqkd/KqkdTab.tsx`
- Modify: `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/init/init.handler.ts`
- Modify: `fe/src/services/kqkdKeHoachService.ts`
- Modify: `fe/src/App.tsx:615-622`

**Interfaces:**
- Consumes: `BanHangTab` / `NhanSuTab` nhận prop `loaiKeHoach` (Task 9).
- Produces: `KeHoachTabsPage` nhận prop `{ loaiKeHoach: LoaiKeHoach }`; `kqkdKeHoachService.layBaoCao(nam, loaiKeHoach, phienBan?)` — **đổi chữ ký, chèn tham số thứ hai**.

- [ ] **Step 1: Tham số hoá `kqkdKeHoachService`**

`fe/src/services/kqkdKeHoachService.ts`:

```ts
  async layBaoCao(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
    phienBan?: string,
  ): Promise<KqkdKeHoachReport> {
    const res = await this.get<KqkdKeHoachReport>({
      params: { nam, loaiKeHoach, ...(phienBan ? { phienBan } : {}) },
    });
```

kèm `import type { LoaiKeHoach } from './keHoachService';`

- [ ] **Step 2: Cho tab KQKD nhận `loaiKeHoach`**

`kqkd/KqkdTab.tsx` — thêm `loaiKeHoach` vào props và vào `executeEvent("init", ...)`, đúng khuôn `BanHangTab` ở Task 9 Step 5.

`kqkd/handler/sub-handler/init/init.handler.ts` — `init` nhận thêm `loaiKeHoach`, lưu vào state, và truyền vào `kqkdKeHoachService.layBaoCao(nam, loaiKeHoach, phienBan)`. Thêm `loaiKeHoach` vào kiểu state của namespace `ke-hoach-kqkd` và vào `init.event.ts`.

- [ ] **Step 3: `KeHoachTabsPage` nhận prop**

```tsx
import type { LoaiKeHoach } from "@/services/keHoachService";

const KeHoachTabsPage: React.FC<{ loaiKeHoach: LoaiKeHoach }> = ({
  loaiKeHoach,
}) => {
  const [activeTab, setActiveTab] = useState("ban-hang");
  ...
```

Sửa bốn chỗ hard-code:

```tsx
  useEffect(() => {
    keHoachService
      .getPhienBanOptions(loaiKeHoach)
      .then(setPhienBanList)
      .catch(() => setPhienBanList([]));
  }, [loaiKeHoach]);
```

Tiêu đề trang đổi theo loại:

```tsx
          <Text strong className="text-sm sm:text-base">
            {loaiKeHoach === "DU_BAO" ? "Dự báo" : "Kế hoạch"}
          </Text>
```

Khối render tab:

```tsx
        {activeTab === "ban-hang" && (
          <BanHangTab nam={nam} loaiKeHoach={loaiKeHoach} />
        )}
        {activeTab === "nhan-su" && (
          <NhanSuTab nam={nam} loaiKeHoach={loaiKeHoach} />
        )}
        {activeTab === "kqkd" && (
          <KqkdTab
            nam={nam}
            loaiKeHoach={loaiKeHoach}
            phienBan={phienBan || undefined}
          />
        )}
        {activeTab === "dong-tien" && (
          <TabComingSoon tieuDe="Kế hoạch dòng tiền" />
        )}
        {activeTab === "tai-san" && <TabComingSoon tieuDe="Kế hoạch tài sản" />}
        {activeTab === "nguon-von" && (
          <TabComingSoon tieuDe="Kế hoạch nguồn vốn" />
        )}
        {activeTab === "chi-tiet" && <KeHoachPage loaiKeHoach={loaiKeHoach} />}
```

- [ ] **Step 4: Sửa route**

`fe/src/App.tsx` — hai chỗ:

```tsx
                  <Route
                    path="ke-hoach"
                    element={
                      <ProtectedRoute requiredPermission="/trung-tam-du-lieu/ke-hoach:xem">
                        <KeHoachTabsPage loaiKeHoach="KE_HOACH" />
                      </ProtectedRoute>
                    }
                  />
```

```tsx
                  <Route
                    path="du-bao"
                    element={
                      <ProtectedRoute requiredPermission="/trung-tam-du-lieu/du-bao:xem">
                        <KeHoachTabsPage loaiKeHoach="DU_BAO" />
                      </ProtectedRoute>
                    }
                  />
```

- [ ] **Step 5: Kiểm tra**

Run: `cd fe && npx eslint src/pages/ke-hoach/ src/App.tsx src/services/kqkdKeHoachService.ts`
Expected: không có lỗi.

Run: `cd fe && grep -rn "'KE_HOACH'\|\"KE_HOACH\"" src/pages/ke-hoach/ src/services/kqkdKeHoachService.ts`
Expected: chỉ còn giá trị mặc định của state, không còn chỗ nào hard-code trong đường đi của dữ liệu.

- [ ] **Step 6: Kiểm tra bằng mắt**

Mở `/trung-tam-du-lieu/du-bao`. Xác nhận: có đủ 7 tab, tiêu đề ghi "Dự báo", tab Bán hàng **rỗng** (chưa có dòng dự báo nào) trong khi `/trung-tam-du-lieu/ke-hoach` vẫn giữ nguyên dữ liệu cũ. Thêm một dòng ở Dự báo rồi quay lại Kế hoạch — dòng đó **không** được xuất hiện bên Kế hoạch.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/ke-hoach/ fe/src/App.tsx fe/src/services/kqkdKeHoachService.ts
git commit -m "feat(du-bao): trang Dự báo dùng chung bộ tab của Kế hoạch"
```

---

### Task 11: Đổi tên "Dữ liệu tổng hợp" thành "Thực hiện"

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx:293`
- Modify: `fe/src/config/menuCatalog.ts:41`

**Interfaces:**
- Consumes: không.
- Produces: không có mã nào phụ thuộc. Route và chuỗi quyền giữ nguyên `/chung-tu/nhat-ky-chung`.

Tài liệu mục 3: ba nhóm KẾ HOẠCH – DỰ BÁO – THỰC HIỆN là ba nhóm ngang hàng, không có nhóm thứ tư tên "Tổng hợp".

- [ ] **Step 1: Đổi nhãn menu**

`fe/src/components/layout/MainLayout.tsx` dòng 293:

```tsx
  getMenuItem("Thực hiện", "/chung-tu/nhat-ky-chung", <AuditOutlined />),
```

`fe/src/config/menuCatalog.ts` dòng 41:

```ts
  { key: '/chung-tu/nhat-ky-chung', label: 'Thực hiện' },
```

- [ ] **Step 2: Soát các chỗ hiển thị còn lại**

Run: `cd fe && grep -rn "Dữ liệu tổng hợp" src`
Expected: chỉ còn trong **comment** (`KeHoachTabsPage.tsx`, `FilterBar.tsx` mô tả bố cục đi mượn), không còn trong chuỗi hiển thị nào. Nếu còn chuỗi hiển thị, đổi nốt.

- [ ] **Step 3: Kiểm tra bằng mắt**

Mở ứng dụng: sidebar hiện "Thực hiện" thay cho "Dữ liệu tổng hợp", bấm vào vẫn ra đúng trang Nhật ký chung. Vào trang phân quyền — node trong cây quyền cũng đổi nhãn theo, và quyền đã cấp trước đó **không mất** (khoá là `key`, không phải `label`).

- [ ] **Step 4: Commit**

```bash
git add fe/src/components/layout/MainLayout.tsx fe/src/config/menuCatalog.ts
git commit -m "refactor(menu): Dữ liệu tổng hợp đổi tên thành Thực hiện"
```

---

## Sau khi xong GĐ1

1. Deploy BE `voucher-service` trước, rồi FE.
2. Chạy `be/scripts/backfill-loai-ke-hoach-bang.js` ở chế độ thật (bỏ `DRY=1`), đối chiếu `modifiedCount` với con số đã ghi ở Task 8 Step 2.
3. Cập nhật `.claude/context/active-pages.md`: tab KQKD không còn là "Sắp có"; trang Dự báo nay có đủ 7 tab; nhãn menu Nhật ký chung là "Thực hiện".
4. Cập nhật `.claude/context/be-api-map.md`: bổ sung `GET /voucher/ke-hoach/kqkd` (đang thiếu) và tham số `loaiKeHoach` của hai endpoint bảng.
5. GĐ2 (ba bảng Dòng tiền / Tài sản / Nguồn vốn) có plan riêng, dựng trên đúng `tabs/lib/` mà GĐ1 vừa chuẩn hoá.
