# Trang Bán hàng — GĐ3 (Bảng tổng hợp theo sản phẩm) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hai bảng tổng hợp DOANH SỐ và DOANH THU theo sản phẩm × tháng, đặt trong panel thu gọn ngay trên thanh công cụ, ghim cột Sản phẩm + Cả năm và ghim hàng tiêu đề + hàng TỔNG.

**Architecture:** Một hàm thuần `pivotTheoThang` nhận danh sách "đóng góp" `{key, ten, thang, soTien}` và trả về các hàng đã gom + hàng tổng; hai bảng chỉ khác ở chỗ chuẩn bị danh sách đóng góp. Component bảng tách riêng để `QuanLyHopDongPage.tsx` không phình thêm.

**Tech Stack:** React 18 + antd 6 + TypeScript (FE, vitest). Không đụng backend.

## Global Constraints

- Nhánh: `feat/hop-dong-ban-hang`. Spec gốc: `docs/superpowers/specs/2026-08-11-hop-dong-ban-hang-design.md`. GĐ1 + GĐ2 đã xong (commit `95006d5`).
- **Node không có trong PATH của shell không tương tác** — mọi lệnh mở đầu bằng
  `export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"`, và **phải `cd` vào `fe/`**
  trước khi chạy `vitest`/`tsc`/`eslint` (chạy từ thư mục gốc thì alias `@/` không resolve).
- **Baseline**: FE `tsc --noEmit -p tsconfig.app.json` có đúng **172 lỗi** không liên quan.
  `vitest` hiện **52 test / 5 file** đều xanh.
- **`vitest` không typecheck** — luôn chạy `tsc` sau mỗi task.
- Gom nhóm khoá theo **id/mã**, không theo tên (hai sản phẩm có thể trùng tên khác mã).
- Bảng pivot chịu 3 bộ lọc Khách hàng / Sản phẩm / Đơn hàng, **không** chịu dropdown Kỳ
  (bảng vốn đã tách sẵn quý/tháng). Dropdown **Năm** thì có.

---

## File Structure

- `fe/src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.ts` *(mới)* — hàm thuần gom pivot
- `fe/src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.test.ts` *(mới)*
- `fe/src/pages/trung-tam-du-lieu/hop-dong/BangTongHopSanPham.tsx` *(mới)* — panel 2 tab + 2 bảng
- `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx` — giữ `khongCoDonHang`, chuẩn bị đóng góp, gắn panel

---

### Task 12: FE — hàm pivot (thuần)

**Files:**
- Create: `fe/src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.ts`
- Test: `fe/src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.test.ts`

**Interfaces:**
- Consumes: không phụ thuộc module nào khác
- Produces:
  - `interface DongGopPivot { key: string; ten: string; thang: number | null; soTien: number }`
  - `interface HangPivot { key: string; ten: string; thang: number[]; caNam: number; hk1: number; hk2: number; quy: number[] }`
  - `interface KetQuaPivot { hang: HangPivot[]; tong: HangPivot }`
  - `const KEY_CHUA_PHAN_LOAI = '__CHUA_PHAN_LOAI__'`
  - `const KEY_KHONG_RO_THANG = '__KHONG_RO_THANG__'`
  - `function pivotTheoThang(items: DongGopPivot[]): KetQuaPivot`

`thang` là chỉ số 0–11, hoặc `null` khi không biết tháng (đơn cũ thiếu ngày ký) — phần
đó dồn vào một hàng riêng "Không rõ tháng", chỉ có ở cột Cả năm.

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  pivotTheoThang,
  KEY_CHUA_PHAN_LOAI,
  KEY_KHONG_RO_THANG,
  type DongGopPivot,
} from './pivotSanPham';

const gop = (d: Partial<DongGopPivot>): DongGopPivot => ({
  key: 'SP1',
  ten: 'Sản phẩm 1',
  thang: 0,
  soTien: 0,
  ...d,
});

describe('pivotTheoThang', () => {
  it('không có đóng góp nào thì hàng rỗng và tổng bằng 0', () => {
    const r = pivotTheoThang([]);
    expect(r.hang).toEqual([]);
    expect(r.tong.caNam).toBe(0);
    expect(r.tong.thang).toHaveLength(12);
    expect(r.tong.thang.every((x) => x === 0)).toBe(true);
  });

  it('cộng nhiều đóng góp cùng sản phẩm cùng tháng', () => {
    const r = pivotTheoThang([
      gop({ thang: 2, soTien: 100 }),
      gop({ thang: 2, soTien: 250 }),
    ]);
    expect(r.hang).toHaveLength(1);
    expect(r.hang[0].thang[2]).toBe(350);
    expect(r.hang[0].caNam).toBe(350);
  });

  it('cả năm = tổng 12 tháng', () => {
    const r = pivotTheoThang([
      gop({ thang: 0, soTien: 10 }),
      gop({ thang: 5, soTien: 20 }),
      gop({ thang: 11, soTien: 30 }),
    ]);
    expect(r.hang[0].caNam).toBe(60);
  });

  it('cột quý và nửa năm cộng đúng các tháng con', () => {
    const r = pivotTheoThang([
      gop({ thang: 0, soTien: 1 }),
      gop({ thang: 1, soTien: 2 }),
      gop({ thang: 2, soTien: 4 }),
      gop({ thang: 3, soTien: 8 }),
      gop({ thang: 6, soTien: 16 }),
      gop({ thang: 9, soTien: 32 }),
    ]);
    const h = r.hang[0];
    expect(h.quy).toEqual([7, 8, 16, 32]);
    expect(h.hk1).toBe(15);
    expect(h.hk2).toBe(48);
    expect(h.hk1 + h.hk2).toBe(h.caNam);
  });

  it('tách theo mã, hai sản phẩm trùng tên khác mã không bị gộp', () => {
    const r = pivotTheoThang([
      gop({ key: 'SP1', ten: 'Trùng tên', soTien: 30 }),
      gop({ key: 'SP2', ten: 'Trùng tên', soTien: 40 }),
    ]);
    expect(r.hang).toHaveLength(2);
    expect(r.tong.caNam).toBe(70);
  });

  it('hàng sắp xếp theo tên sản phẩm', () => {
    const r = pivotTheoThang([
      gop({ key: 'B', ten: 'Bê tông', soTien: 1 }),
      gop({ key: 'A', ten: 'Áo mưa', soTien: 1 }),
    ]);
    expect(r.hang.map((h) => h.ten)).toEqual(['Áo mưa', 'Bê tông']);
  });

  it('đóng góp không rõ tháng vào hàng riêng, chỉ có ở cột cả năm', () => {
    const r = pivotTheoThang([
      gop({ thang: 3, soTien: 100 }),
      gop({ thang: null, soTien: 70 }),
    ]);
    const khongRo = r.hang.find((h) => h.key === KEY_KHONG_RO_THANG);
    expect(khongRo?.caNam).toBe(70);
    expect(khongRo?.thang.every((x) => x === 0)).toBe(true);
    expect(khongRo?.ten).toBe('Không rõ tháng');
  });

  it('hàng không rõ tháng luôn đứng cuối', () => {
    const r = pivotTheoThang([
      gop({ key: 'Z', ten: 'Zebra', soTien: 1 }),
      gop({ thang: null, soTien: 1 }),
      gop({ key: 'A', ten: 'Alpha', soTien: 1 }),
    ]);
    expect(r.hang[r.hang.length - 1].key).toBe(KEY_KHONG_RO_THANG);
  });

  it('hàng chưa phân loại đứng cuối, ngay trước hàng không rõ tháng', () => {
    const r = pivotTheoThang([
      gop({ key: 'Z', ten: 'Zebra', soTien: 1 }),
      gop({ key: KEY_CHUA_PHAN_LOAI, ten: 'Chưa phân loại', soTien: 1 }),
      gop({ thang: null, soTien: 1 }),
      gop({ key: 'A', ten: 'Alpha', soTien: 1 }),
    ]);
    expect(r.hang.map((h) => h.key)).toEqual([
      'A',
      'Z',
      KEY_CHUA_PHAN_LOAI,
      KEY_KHONG_RO_THANG,
    ]);
  });

  it('hàng tổng cộng đủ mọi hàng, kể cả không rõ tháng', () => {
    const r = pivotTheoThang([
      gop({ key: 'A', ten: 'A', thang: 1, soTien: 100 }),
      gop({ key: 'B', ten: 'B', thang: 1, soTien: 200 }),
      gop({ thang: null, soTien: 50 }),
    ]);
    expect(r.tong.thang[1]).toBe(300);
    expect(r.tong.caNam).toBe(350);
    expect(r.tong.ten).toBe('TỔNG');
  });

  it('bỏ qua đóng góp bằng 0 để bảng không đầy hàng rỗng', () => {
    const r = pivotTheoThang([
      gop({ key: 'A', ten: 'A', soTien: 0 }),
      gop({ key: 'B', ten: 'B', soTien: 5 }),
    ]);
    expect(r.hang.map((h) => h.key)).toEqual(['B']);
  });

  it('số tiền âm vẫn được cộng (điều chỉnh giảm)', () => {
    const r = pivotTheoThang([
      gop({ thang: 0, soTien: 100 }),
      gop({ thang: 0, soTien: -30 }),
    ]);
    expect(r.hang[0].thang[0]).toBe(70);
  });

  it('tháng ngoài 0..11 bị coi như không rõ tháng', () => {
    const r = pivotTheoThang([gop({ thang: 12, soTien: 40 })]);
    expect(r.hang[0].key).toBe(KEY_KHONG_RO_THANG);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd /Users/os_anhvt/Documents/Dino/ke-toan-so/fe
npx vitest run src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.test.ts
```
Expected: FAIL — không resolve được `./pivotSanPham`

- [ ] **Step 3: Viết `pivotSanPham.ts`**

```ts
/** Khoá hàng gom các đóng góp không xác định được sản phẩm. */
export const KEY_CHUA_PHAN_LOAI = '__CHUA_PHAN_LOAI__';
/** Khoá hàng gom các đóng góp không biết rơi vào tháng nào (đơn cũ thiếu ngày ký). */
export const KEY_KHONG_RO_THANG = '__KHONG_RO_THANG__';

/** Một khoản tiền đóng góp vào ô (sản phẩm × tháng). */
export interface DongGopPivot {
  /** Khoá gom — id/mã sản phẩm; luôn là mã, không phải tên. */
  key: string;
  ten: string;
  /** Chỉ số tháng 0–11; `null` hoặc ngoài khoảng nghĩa là không biết tháng. */
  thang: number | null;
  soTien: number;
}

export interface HangPivot {
  key: string;
  ten: string;
  /** 12 tháng. */
  thang: number[];
  caNam: number;
  hk1: number;
  hk2: number;
  /** 4 quý. */
  quy: number[];
}

export interface KetQuaPivot {
  hang: HangPivot[];
  tong: HangPivot;
}

const hangRong = (key: string, ten: string): HangPivot => ({
  key,
  ten,
  thang: Array(12).fill(0) as number[],
  caNam: 0,
  hk1: 0,
  hk2: 0,
  quy: [0, 0, 0, 0],
});

const cong = (thang: number[], tu: number, den: number) =>
  thang.slice(tu, den + 1).reduce((s, x) => s + x, 0);

/** Hai hàng đặc biệt luôn nằm cuối bảng, phần còn lại xếp theo tên. */
const thuTu = (key: string) =>
  key === KEY_KHONG_RO_THANG ? 2 : key === KEY_CHUA_PHAN_LOAI ? 1 : 0;

/**
 * Gom các khoản tiền thành bảng sản phẩm × tháng, kèm cột cả năm / nửa năm / quý.
 *
 * Đóng góp không biết tháng dồn vào một hàng riêng chỉ có cột "Cả năm" — nhờ vậy với
 * mọi hàng sản phẩm bình thường thì "Cả năm" luôn đúng bằng tổng 12 tháng, đọc bảng
 * không bị hụt hẫng.
 */
export function pivotTheoThang(items: DongGopPivot[]): KetQuaPivot {
  const map = new Map<string, HangPivot>();

  for (const it of items) {
    if (!it.soTien) continue;
    const roThang = it.thang != null && it.thang >= 0 && it.thang <= 11;
    const key = roThang ? it.key : KEY_KHONG_RO_THANG;
    const ten = roThang ? it.ten : 'Không rõ tháng';

    const cur = map.get(key) ?? hangRong(key, ten);
    if (roThang) cur.thang[it.thang as number] += it.soTien;
    else cur.caNam += it.soTien;
    map.set(key, cur);
  }

  const hang = [...map.values()];
  for (const h of hang) {
    if (h.key !== KEY_KHONG_RO_THANG) h.caNam = cong(h.thang, 0, 11);
    h.hk1 = cong(h.thang, 0, 5);
    h.hk2 = cong(h.thang, 6, 11);
    h.quy = [0, 1, 2, 3].map((q) => cong(h.thang, q * 3, q * 3 + 2));
  }

  hang.sort(
    (a, b) => thuTu(a.key) - thuTu(b.key) || a.ten.localeCompare(b.ten, 'vi'),
  );

  const tong = hangRong('__TONG__', 'TỔNG');
  for (const h of hang) {
    h.thang.forEach((v, i) => {
      tong.thang[i] += v;
    });
    tong.caNam += h.caNam;
  }
  tong.hk1 = cong(tong.thang, 0, 5);
  tong.hk2 = cong(tong.thang, 6, 11);
  tong.quy = [0, 1, 2, 3].map((q) => cong(tong.thang, q * 3, q * 3 + 2));

  return { hang, tong };
}
```

- [ ] **Step 4: Chạy lại test**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd /Users/os_anhvt/Documents/Dino/ke-toan-so/fe
npx vitest run src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.test.ts
```
Expected: PASS — 13 test

- [ ] **Step 5: Typecheck**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd /Users/os_anhvt/Documents/Dino/ke-toan-so/fe
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"
```
Expected: 172

- [ ] **Step 6: Commit**

```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git add fe/src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.ts fe/src/pages/trung-tam-du-lieu/hop-dong/pivotSanPham.test.ts
git commit -m "feat(hop-dong): hàm gom bảng sản phẩm theo tháng"
```

---

### Task 13: FE — panel 2 bảng tổng hợp

**Files:**
- Create: `fe/src/pages/trung-tam-du-lieu/hop-dong/BangTongHopSanPham.tsx`
- Modify: `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx`

**Interfaces:**
- Consumes: `pivotTheoThang`, `KetQuaPivot`, `HangPivot`, `KEY_CHUA_PHAN_LOAI` (Task 12); `DongBang`, `TongHopDonHang`, `DoanhThuKhongDon` (GĐ2); `trongKy` (GĐ1)
- Produces: `BangTongHopSanPham` props `{ doanhSo: KetQuaPivot; doanhThu: KetQuaPivot; nam: number }`

- [ ] **Step 1: Tạo `BangTongHopSanPham.tsx`**

```tsx
import { useState } from 'react';
import { Card, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { HangPivot, KetQuaPivot } from './pivotSanPham';

const { Text } = Typography;

const fmt = (v: number) => (v ? new Intl.NumberFormat('vi-VN').format(Math.round(v)) : '-');

const oTien = (v: number) => <Text className="text-xs">{fmt(v)}</Text>;

const columns: ColumnsType<HangPivot> = [
  {
    title: 'Sản phẩm',
    dataIndex: 'ten',
    key: 'ten',
    width: 200,
    fixed: 'left',
    ellipsis: true,
    render: (v: string) => <Text strong className="text-xs">{v}</Text>,
  },
  {
    title: 'Cả năm',
    dataIndex: 'caNam',
    key: 'caNam',
    width: 140,
    fixed: 'left',
    align: 'right',
    render: (v: number) => <Text strong className="text-xs">{fmt(v)}</Text>,
  },
  { title: '6T đầu', dataIndex: 'hk1', key: 'hk1', width: 130, align: 'right', render: oTien },
  { title: '6T cuối', dataIndex: 'hk2', key: 'hk2', width: 130, align: 'right', render: oTien },
  ...[0, 1, 2, 3].map((q) => ({
    title: `Q${q + 1}`,
    key: `q${q}`,
    width: 120,
    align: 'right' as const,
    render: (_: unknown, r: HangPivot) => oTien(r.quy[q]),
  })),
  ...Array.from({ length: 12 }, (_, m) => ({
    title: `T${m + 1}`,
    key: `t${m}`,
    width: 110,
    align: 'right' as const,
    render: (_: unknown, r: HangPivot) => oTien(r.thang[m]),
  })),
];

/** Hàng TỔNG ghim trên đầu — 20 ô, thứ tự phải khớp `columns`. */
const hangTong = (tong: HangPivot) => {
  const o = (i: number, v: number, align: 'left' | 'right' = 'right') => (
    <Table.Summary.Cell key={i} index={i} align={align}>
      <Text strong className="text-xs">{i === 0 ? 'TỔNG' : fmt(v)}</Text>
    </Table.Summary.Cell>
  );
  return (
    <Table.Summary fixed="top">
      <Table.Summary.Row>
        {o(0, 0, 'left')}
        {o(1, tong.caNam)}
        {o(2, tong.hk1)}
        {o(3, tong.hk2)}
        {tong.quy.map((v, i) => o(4 + i, v))}
        {tong.thang.map((v, i) => o(8 + i, v))}
      </Table.Summary.Row>
    </Table.Summary>
  );
};

const bang = (kq: KetQuaPivot) => (
  <Table<HangPivot>
    size="small"
    rowKey="key"
    columns={columns}
    dataSource={kq.hang}
    pagination={false}
    sticky
    scroll={{ x: 'max-content', y: 380 }}
    summary={() => hangTong(kq.tong)}
    locale={{ emptyText: 'Chưa có số liệu' }}
  />
);

interface Props {
  doanhSo: KetQuaPivot;
  doanhThu: KetQuaPivot;
  nam: number;
}

/**
 * Panel thu gọn được, đặt trên thanh công cụ: DOANH SỐ (giá trị hợp đồng theo tháng ký)
 * và DOANH THU (Có 511 theo tháng chứng từ), cùng cắt theo sản phẩm.
 *
 * Mặc định đóng để không đẩy bảng đơn hàng xuống quá sâu.
 */
export default function BangTongHopSanPham({ doanhSo, doanhThu, nam }: Props) {
  const [mo, setMo] = useState(false);
  const [tab, setTab] = useState('doanhSo');

  return (
    <Card
      size="small"
      className="shadow-sm"
      title={<span className="text-sm font-semibold">Tổng hợp theo sản phẩm — năm {nam}</span>}
      extra={<a onClick={() => setMo((v) => !v)}>{mo ? 'Thu gọn' : 'Mở rộng'}</a>}
      // Đóng thì không render bảng luôn, khỏi dựng 20 cột × N hàng cho một panel đang ẩn.
      styles={mo ? undefined : { body: { display: 'none' } }}
    >
      {mo && (
        <Tabs
          activeKey={tab}
          onChange={setTab}
          size="small"
          items={[
            { key: 'doanhSo', label: 'DOANH SỐ', children: bang(doanhSo) },
            { key: 'doanhThu', label: 'DOANH THU', children: bang(doanhThu) },
          ]}
        />
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Giữ `khongCoDonHang` trong page**

`QuanLyHopDongPage.tsx` — đổi import service:

```tsx
import {
  nhatKyChungService,
  type DoanhThuKhongDon,
  type TongHopDonHang,
} from '@/services/nhatKyChungService';
```

Thêm state cạnh `tongHop`:

```tsx
  const [khongCoDonHang, setKhongCoDonHang] = useState<DoanhThuKhongDon[]>([]);
```

và trong `loadTongHop`, sau `setTongHop(m)`:

```tsx
      setTongHop(m);
      setKhongCoDonHang(res.khongCoDonHang);
```

- [ ] **Step 3: Chuẩn bị đóng góp và tính 2 pivot**

Thêm import:

```tsx
import BangTongHopSanPham from './BangTongHopSanPham';
import {
  pivotTheoThang,
  KEY_CHUA_PHAN_LOAI,
  type DongGopPivot,
} from './pivotSanPham';
```

Thêm hàm khoá sản phẩm ở **mức module** (dưới hằng `TK_PHAI_THU`), vì nó không phụ thuộc
gì vào component:

```tsx
const khoaSanPham = (id?: string) => id || KEY_CHUA_PHAN_LOAI;
```

Thêm `locNgoaiThoiGian` ngay **trước** `viewRows`, và sửa `viewRows` gọi lại nó thay vì
lặp 3 điều kiện — bảng chính và bảng pivot phải lọc y hệt nhau:

```tsx
  /** 3 bộ lọc không phải thời gian — bảng chính và bảng pivot dùng chung. */
  const locNgoaiThoiGian = useCallback(
    (r: DongBang) => {
      if (khachHang && r.doiTuongId !== khachHang) return false;
      if (sanPham && (r.sanPhamId || '') !== (sanPham === 'CHUA_CHON' ? '' : sanPham))
        return false;
      if (donHang && r.soHopDong !== donHang) return false;
      return true;
    },
    [khachHang, sanPham, donHang],
  );
```

`viewRows` rút gọn thành:

```tsx
  const viewRows = useMemo(() => {
    const getValue = cellValue(doiTuongMap, sanPhamMap);
    const tuKhoa = search.trim().toLowerCase();
    return fullRows.filter((r) => {
      if (!matches(r, getValue)) return false;
      if (!trongKy(r, loc)) return false;
      if (!locNgoaiThoiGian(r)) return false;
      if (tuKhoa && !`${r.soHopDong} ${r.tenCongTrinh}`.toLowerCase().includes(tuKhoa))
        return false;
      return true;
    });
  }, [fullRows, matches, doiTuongMap, sanPhamMap, loc, locNgoaiThoiGian, search]);
```

Rồi thêm sau `donHangOptions`:

```tsx
  const tenSanPham = useCallback(
    (id?: string) => sanPhamMap[id || ''] || 'Chưa phân loại',
    [sanPhamMap],
  );

  /** DOANH SỐ: giá trị hợp đồng, xếp theo tháng của NGÀY KÝ, trong năm đang chọn. */
  const pivotDoanhSo = useMemo(() => {
    const items: DongGopPivot[] = fullRows
      .filter((r) => locNgoaiThoiGian(r) && trongKy(r, { nam: loc.nam, ky: 'CA_NAM' }))
      .map((r) => ({
        key: khoaSanPham(r.sanPhamId),
        ten: tenSanPham(r.sanPhamId),
        thang: r.ngayKy ? dayjs(r.ngayKy).month() : null,
        soTien: Number(r.giaTriSauThue) || 0,
      }));
    return pivotTheoThang(items);
  }, [fullRows, locNgoaiThoiGian, loc.nam, tenSanPham]);

  /**
   * DOANH THU: Có 511 theo tháng của NGÀY CHỨNG TỪ. Cố ý KHÔNG lọc đơn hàng theo năm ký
   * — đơn ký 2024 mà ghi nhận doanh thu 2026 vẫn phải lên bảng của năm 2026.
   */
  const pivotDoanhThu = useMemo(() => {
    const items: DongGopPivot[] = [];
    fullRows.filter(locNgoaiThoiGian).forEach((r) => {
      const t = tongHop[r.soHopDong];
      if (!t) return;
      t.dtTheoThang.forEach((soTien, thang) => {
        if (soTien) {
          items.push({
            key: khoaSanPham(r.sanPhamId),
            ten: tenSanPham(r.sanPhamId),
            thang,
            soTien,
          });
        }
      });
    });

    // Doanh thu 511 không gắn đơn hàng: khớp lại mã sản phẩm với danh mục, không khớp
    // thì để "Chưa phân loại" — bảng vẫn khớp tổng sổ cái 511.
    const theoMa = new Map(sanPhamList.map((sp) => [sp.ma, sp]));
    khongCoDonHang.forEach((k) => {
      const sp = theoMa.get(k.sanPhamMa);
      k.dtTheoThang.forEach((soTien, thang) => {
        if (soTien) {
          items.push({
            key: sp ? sp.id : KEY_CHUA_PHAN_LOAI,
            ten: sp ? sp.ten : 'Chưa phân loại',
            thang,
            soTien,
          });
        }
      });
    });

    return pivotTheoThang(items);
  }, [fullRows, locNgoaiThoiGian, tongHop, khongCoDonHang, sanPhamList, tenSanPham]);
```

- [ ] **Step 4: Gắn panel lên trên thanh công cụ**

Trong JSX, chèn ngay **trước** `<Card className="shadow-sm">` chứa FilterBar:

```tsx
      <BangTongHopSanPham
        doanhSo={pivotDoanhSo}
        doanhThu={pivotDoanhThu}
        nam={loc.nam}
      />
```

- [ ] **Step 5: Typecheck, lint, test, build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd /Users/os_anhvt/Documents/Dino/ke-toan-so/fe
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"
npx eslint src/pages/trung-tam-du-lieu/hop-dong
npx vitest run src/pages/trung-tam-du-lieu/hop-dong
npm run build
```
Expected: tsc 172; eslint không output; vitest 65 pass / 6 file; build OK.

- [ ] **Step 6: Commit**

```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git add fe/src/pages/trung-tam-du-lieu/hop-dong/
git commit -m "feat(hop-dong): bảng tổng hợp doanh số và doanh thu theo sản phẩm theo tháng"
```

---

## Sau khi xong GĐ3

Toàn bộ 3 giai đoạn đã xong. Deploy theo skill `db-deploy`:
- BE: `master-data-service` (GĐ1) và `voucher-service` (GĐ2)
- FE: build + đẩy, verify ở **`ketoan.masterceo.com.vn`** (không phải `masterceo.com.vn` — đó là Portal)

Sau deploy nhớ kiểm quyền: trang `/trung-tam-du-lieu/hop-dong` không thêm route mới nên
không cần grant quyền, nhưng modal Ghi chú gọi `POST /voucher/nhat-ky-chung` — tài khoản
dùng thử phải có quyền tạo chứng từ.
