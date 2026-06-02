# Số dư đầu kỳ chi tiết theo đối tượng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho cấu hình "chi tiết theo đối tượng" trên từng tài khoản, và nhập số dư đầu kỳ chi tiết theo từng đối tượng (khách hàng / NCC / nhân viên / nhà thầu / tài khoản ngân hàng); báo cáo vẫn cộng gộp tổng theo mã TK (không đổi).

**Architecture:** BE thêm field `chiTietTheo` cho `TaiKhoan` và 4 field chi tiết cho `SoDuDauKy`; `ServiceClient.getSoDuDauKy` gộp tổng theo mã TK để reporting không đổi. FE thêm select "Chi tiết theo" ở Danh mục Tài khoản và đổi trang Số dư đầu kỳ sang mô hình "+ Thêm dòng".

**Tech Stack:** NestJS + TypeORM(Mongo) (BE), React + TypeScript + Ant Design + vitest (FE).

---

## File Structure

**BE:**
- Modify `be/libs/entities/src/master-data/tai-khoan.entity.ts` — enum `ChiTietTheo` + field.
- Modify `be/libs/entities/src/master-data/so-du-dau-ky.entity.ts` — 4 field chi tiết.
- Modify `be/apps/master-data-service/src/tai-khoan/dto/create-tai-khoan.dto.ts` — field optional.
- Modify `be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts` — field chi tiết.
- Modify `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts` — persist + return chi tiết.
- Create `be/libs/service-client/src/helpers/aggregate-opening.ts` — pure gộp theo mã TK.
- Create `be/libs/service-client/src/helpers/aggregate-opening.spec.ts` — test.
- Modify `be/libs/service-client/src/service-client.ts` — dùng helper trong `getSoDuDauKy`.

**FE:**
- Modify `fe/src/types/index.ts` — `TaiKhoan.chiTietTheo?`.
- Modify `fe/src/services/soDuDauKyService.ts` — type item thêm chi tiết.
- Modify `fe/src/pages/danh-muc/tai-khoan/TaiKhoanPage.tsx` — select "Chi tiết theo".
- Create `fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.ts` — hằng số + helper thuần.
- Create `fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.test.ts` — test helper thuần.
- Modify `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx` — UX "+ Thêm dòng".

---

## Task 1: BE entities — thêm field

**Files:**
- Modify: `be/libs/entities/src/master-data/tai-khoan.entity.ts`
- Modify: `be/libs/entities/src/master-data/so-du-dau-ky.entity.ts`

- [ ] **Step 1: Thêm enum + field vào `tai-khoan.entity.ts`**

Sau enum `NhomTaiKhoan` (kết thúc dòng `}` trước `@Entity('tai_khoan')`), thêm enum mới:

```typescript
export enum ChiTietTheo {
  KHACH_HANG = 'KHACH_HANG',
  NHA_CUNG_CAP = 'NHA_CUNG_CAP',
  NHAN_VIEN = 'NHAN_VIEN',
  NHA_THAU = 'NHA_THAU',
  NGAN_HANG_QUY = 'NGAN_HANG_QUY',
}
```

Trong class `TaiKhoan`, ngay sau field `moTa` (trước `isActive`), thêm:

```typescript
  @Column({ type: 'enum', enum: ChiTietTheo, nullable: true })
  chiTietTheo?: ChiTietTheo;
```

- [ ] **Step 2: Thêm 4 field vào `so-du-dau-ky.entity.ts`**

Trong class `SoDuDauKy`, sau field `ngayApDung`, thêm:

```typescript
  @Column({ nullable: true })
  chiTietType?: string;

  @Column({ nullable: true })
  chiTietId?: string;

  @Column({ nullable: true })
  chiTietMa?: string;

  @Column({ nullable: true })
  chiTietTen?: string;
```

- [ ] **Step 3: Build kiểm tra**

Run: `cd be && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20` (hoặc `npx nest build master-data-service`)
Expected: không có lỗi liên quan 2 entity vừa sửa.

- [ ] **Step 4: Commit**

```bash
git add be/libs/entities/src/master-data/tai-khoan.entity.ts be/libs/entities/src/master-data/so-du-dau-ky.entity.ts
git commit -m "feat(be): them chiTietTheo cho TaiKhoan va field chi tiet cho SoDuDauKy"
```

---

## Task 2: BE DTO TaiKhoan — nhận `chiTietTheo`

**Files:**
- Modify: `be/apps/master-data-service/src/tai-khoan/dto/create-tai-khoan.dto.ts`

- [ ] **Step 1: Thêm field optional vào `CreateTaiKhoanDto`**

Sửa import dòng đầu để thêm `ChiTietTheo`:

```typescript
import { LoaiTaiKhoan, NhomTaiKhoan, ChiTietTheo } from '@app/entities';
```

Sau field `moTa?` (cuối class), thêm:

```typescript
  @IsEnum(ChiTietTheo)
  @IsOptional()
  chiTietTheo?: ChiTietTheo;
```

`UpdateTaiKhoanDto` kế thừa qua `PartialType` → không cần sửa.

- [ ] **Step 2: Build kiểm tra**

Run: `cd be && npx nest build master-data-service 2>&1 | tail -5`
Expected: build thành công.

- [ ] **Step 3: Commit**

```bash
git add be/apps/master-data-service/src/tai-khoan/dto/create-tai-khoan.dto.ts
git commit -m "feat(be): DTO tai-khoan nhan chiTietTheo"
```

---

## Task 3: BE SoDuDauKy DTO + service — lưu & trả chi tiết

**Files:**
- Modify: `be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts`
- Modify: `be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts`

- [ ] **Step 1: Thêm field chi tiết vào `SoDuDauKyItemDto`**

Trong `save-so-du-dau-ky.dto.ts`, thêm `IsOptional` vào import class-validator (đã có `IsString`):

```typescript
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
```

Trong class `SoDuDauKyItemDto`, sau field `duCo`, thêm:

```typescript
  @IsString()
  @IsOptional()
  chiTietType?: string;

  @IsString()
  @IsOptional()
  chiTietId?: string;

  @IsString()
  @IsOptional()
  chiTietMa?: string;

  @IsString()
  @IsOptional()
  chiTietTen?: string;
```

- [ ] **Step 2: Cập nhật `SoDuDauKyResult` + `getAll` + `saveBulk` trong service**

Trong `so-du-dau-ky.service.ts`, đổi interface `SoDuDauKyResult.items` thành:

```typescript
  items: Array<{
    maTaiKhoan: string;
    duNo: number;
    duCo: number;
    chiTietType?: string;
    chiTietId?: string;
    chiTietMa?: string;
    chiTietTen?: string;
  }>;
```

Trong `getAll`, sửa `const items = records.map(...)` thành:

```typescript
    const items = records.map((r) => ({
      maTaiKhoan: r.maTaiKhoan,
      duNo: Number(r.duNo) || 0,
      duCo: Number(r.duCo) || 0,
      chiTietType: r.chiTietType,
      chiTietId: r.chiTietId,
      chiTietMa: r.chiTietMa,
      chiTietTen: r.chiTietTen,
    }));
```

Trong `saveBulk`, sửa `.map((i) => this.repo.create({...}))` để lưu kèm chi tiết:

```typescript
      .map((i) =>
        this.repo.create({
          maTaiKhoan: i.maTaiKhoan,
          duNo: Number(i.duNo) || 0,
          duCo: Number(i.duCo) || 0,
          chiTietType: i.chiTietType,
          chiTietId: i.chiTietId,
          chiTietMa: i.chiTietMa,
          chiTietTen: i.chiTietTen,
          ngayApDung,
          ...(tenantId ? { tenantId } : {}),
        }),
      );
```

- [ ] **Step 3: Build kiểm tra**

Run: `cd be && npx nest build master-data-service 2>&1 | tail -5`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add be/apps/master-data-service/src/so-du-dau-ky/dto/save-so-du-dau-ky.dto.ts be/apps/master-data-service/src/so-du-dau-ky/so-du-dau-ky.service.ts
git commit -m "feat(be): so-du-dau-ky luu va tra ve chi tiet doi tuong"
```

---

## Task 4: BE ServiceClient — gộp tổng theo mã TK (TDD)

**Files:**
- Create: `be/libs/service-client/src/helpers/aggregate-opening.ts`
- Create: `be/libs/service-client/src/helpers/aggregate-opening.spec.ts`
- Modify: `be/libs/service-client/src/service-client.ts`

- [ ] **Step 1: Viết test thất bại**

Create `be/libs/service-client/src/helpers/aggregate-opening.spec.ts`:

```typescript
import { aggregateOpeningByAccount } from './aggregate-opening';

describe('aggregateOpeningByAccount', () => {
  it('gop nhieu dong cung ma TK thanh 1, cong duNo/duCo', () => {
    const out = aggregateOpeningByAccount([
      { maTaiKhoan: '131', duNo: 100, duCo: 0, chiTietId: 'a' },
      { maTaiKhoan: '131', duNo: 50, duCo: 0, chiTietId: 'b' },
      { maTaiKhoan: '331', duNo: 0, duCo: 200, chiTietId: 'c' },
    ]);
    expect(out).toEqual([
      { maTaiKhoan: '131', duNo: 150, duCo: 0 },
      { maTaiKhoan: '331', duNo: 0, duCo: 200 },
    ]);
  });

  it('xu ly chuoi so va gia tri thieu', () => {
    const out = aggregateOpeningByAccount([
      { maTaiKhoan: '111', duNo: '10' as any, duCo: undefined as any },
      { maTaiKhoan: '111', duNo: 5, duCo: 3 },
    ]);
    expect(out).toEqual([{ maTaiKhoan: '111', duNo: 15, duCo: 3 }]);
  });

  it('mang rong tra ve mang rong', () => {
    expect(aggregateOpeningByAccount([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd be && npx jest libs/service-client/src/helpers/aggregate-opening.spec.ts 2>&1 | tail -15`
Expected: FAIL — `Cannot find module './aggregate-opening'`.

- [ ] **Step 3: Viết implementation tối thiểu**

Create `be/libs/service-client/src/helpers/aggregate-opening.ts`:

```typescript
export interface OpeningItemInput {
  maTaiKhoan: string;
  duNo: number | string;
  duCo: number | string;
  [key: string]: unknown;
}

export interface OpeningItemAggregated {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
}

/**
 * Gop cac dong so du dau ky chi tiet ve tong theo ma tai khoan.
 * Reporting chi can tong theo TK nen bo cac field chi tiet.
 */
export function aggregateOpeningByAccount(
  items: OpeningItemInput[],
): OpeningItemAggregated[] {
  const map = new Map<string, OpeningItemAggregated>();
  for (const it of items || []) {
    const ma = it.maTaiKhoan;
    const cur = map.get(ma) ?? { maTaiKhoan: ma, duNo: 0, duCo: 0 };
    cur.duNo += Number(it.duNo) || 0;
    cur.duCo += Number(it.duCo) || 0;
    map.set(ma, cur);
  }
  return Array.from(map.values());
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cd be && npx jest libs/service-client/src/helpers/aggregate-opening.spec.ts 2>&1 | tail -10`
Expected: PASS (3 tests).

- [ ] **Step 5: Dùng helper trong `service-client.ts`**

Trong `be/libs/service-client/src/service-client.ts`, thêm import ở đầu file:

```typescript
import { aggregateOpeningByAccount } from './helpers/aggregate-opening';
```

Sửa thân `getSoDuDauKy` — thay `return this.get('master-data', '/so-du-dau-ky', {...})` bằng lấy response rồi gộp items:

```typescript
    const res = await this.get<{
      ngayApDung: string | null;
      items: Array<{ maTaiKhoan: string; duNo: number; duCo: number }>;
    }>('master-data', '/so-du-dau-ky', {
      headers: Object.keys(headers).length ? headers : undefined,
    });

    if (res.success && res.data) {
      return {
        ...res,
        data: {
          ngayApDung: res.data.ngayApDung,
          items: aggregateOpeningByAccount(res.data.items as any),
        },
      };
    }
    return res;
```

Giữ nguyên kiểu trả về đã khai báo của method (`items: Array<{ maTaiKhoan; duNo; duCo }>`).

- [ ] **Step 6: Build kiểm tra**

Run: `cd be && npx nest build master-data-service && npx nest build reporting-service 2>&1 | tail -5`
Expected: build thành công cả 2 (service-client là lib dùng chung).

- [ ] **Step 7: Commit**

```bash
git add be/libs/service-client/src/helpers/aggregate-opening.ts be/libs/service-client/src/helpers/aggregate-opening.spec.ts be/libs/service-client/src/service-client.ts
git commit -m "feat(be): ServiceClient.getSoDuDauKy gop tong theo ma TK"
```

---

## Task 5: FE types + soDuDauKyService

**Files:**
- Modify: `fe/src/types/index.ts`
- Modify: `fe/src/services/soDuDauKyService.ts`

- [ ] **Step 1: Thêm `chiTietTheo` vào type `TaiKhoan`**

Trong `fe/src/types/index.ts`, interface `TaiKhoan`, sau `moTa?: string;` thêm:

```typescript
  chiTietTheo?: 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU' | 'NGAN_HANG_QUY';
```

- [ ] **Step 2: Mở rộng `SoDuDauKyItem`**

Trong `fe/src/services/soDuDauKyService.ts`, interface `SoDuDauKyItem`, sau `duCo: number;` thêm:

```typescript
  chiTietType?: string;
  chiTietId?: string;
  chiTietMa?: string;
  chiTietTen?: string;
```

- [ ] **Step 3: Lint kiểm tra**

Run: `cd fe && npx tsc --noEmit 2>&1 | grep -E 'types/index|soDuDauKyService' | head`
Expected: không lỗi ở 2 file này.

- [ ] **Step 4: Commit**

```bash
git add fe/src/types/index.ts fe/src/services/soDuDauKyService.ts
git commit -m "feat(fe): type chiTietTheo cho TaiKhoan va chi tiet cho SoDuDauKyItem"
```

---

## Task 6: FE Danh mục Tài khoản — select "Chi tiết theo"

**Files:**
- Modify: `fe/src/pages/danh-muc/tai-khoan/TaiKhoanPage.tsx`

- [ ] **Step 1: Thêm `chiTietTheo` vào zod schema**

Trong `TaiKhoanPage.tsx`, object schema (quanh dòng `nhom: z.enum([...])`), thêm sau dòng `nhom`:

```typescript
  chiTietTheo: z.enum(["KHACH_HANG", "NHA_CUNG_CAP", "NHAN_VIEN", "NHA_THAU", "NGAN_HANG_QUY"]).optional(),
```

- [ ] **Step 2: Thêm hằng options ngay trên component**

Trên định nghĩa component (sau các import / cạnh schema), thêm:

```typescript
const chiTietTheoOptions = [
  { value: "KHACH_HANG", label: "Khách hàng" },
  { value: "NHA_CUNG_CAP", label: "Nhà cung cấp" },
  { value: "NHAN_VIEN", label: "Nhân viên" },
  { value: "NHA_THAU", label: "Nhà thầu" },
  { value: "NGAN_HANG_QUY", label: "Ngân hàng & Quỹ" },
];
```

- [ ] **Step 3: Thêm Form.Item vào modal**

Trong `<Modal>`, ngay trước `Form.Item name="moTa"` (cuối form), thêm:

```typescript
          <Form.Item
            name="chiTietTheo"
            label="Chi tiết theo"
            className="mb-3"
            tooltip="Khi nhập số dư đầu kỳ, TK này sẽ nhập chi tiết theo từng đối tượng"
          >
            <Select
              allowClear
              placeholder="— Không chi tiết —"
              options={chiTietTheoOptions}
            />
          </Form.Item>
```

Không cần sửa `openModal`: nó đã dùng `form.setFieldsValue({ ...record })` (dòng 147–150) nên `chiTietTheo` tự nạp khi sửa.

- [ ] **Step 4: Build + lint**

Run: `cd fe && npx tsc --noEmit 2>&1 | grep -i 'tai-khoan/TaiKhoanPage' | head`
Expected: không lỗi.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/danh-muc/tai-khoan/TaiKhoanPage.tsx
git commit -m "feat(fe): them select Chi tiet theo o Danh muc Tai khoan"
```

---

## Task 7: FE helper thuần cho trang Số dư đầu kỳ (TDD)

**Files:**
- Create: `fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.ts`
- Create: `fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `chiTietConfig.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CHI_TIET_LABEL, validateRows, type SoDuRow } from './chiTietConfig';

const base: SoDuRow = {
  key: '1', maTaiKhoan: '', tenTaiKhoan: '', chiTietTheo: undefined,
  chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined, duNo: 0, duCo: 0,
};

describe('CHI_TIET_LABEL', () => {
  it('co nhan cho tat ca loai', () => {
    expect(CHI_TIET_LABEL.KHACH_HANG).toBe('Khách hàng');
    expect(CHI_TIET_LABEL.NGAN_HANG_QUY).toBe('Ngân hàng & Quỹ');
  });
});

describe('validateRows', () => {
  it('bao loi khi TK trong', () => {
    const r = validateRows([{ ...base, maTaiKhoan: '' }]);
    expect(r.ok).toBe(false);
  });

  it('bao loi khi TK co chiTietTheo nhung chua chon doi tuong', () => {
    const r = validateRows([{ ...base, maTaiKhoan: '131', chiTietTheo: 'KHACH_HANG' }]);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('đối tượng');
  });

  it('bao loi khi trung (TK + doi tuong)', () => {
    const rows: SoDuRow[] = [
      { ...base, key: '1', maTaiKhoan: '131', chiTietTheo: 'KHACH_HANG', chiTietId: 'a' },
      { ...base, key: '2', maTaiKhoan: '131', chiTietTheo: 'KHACH_HANG', chiTietId: 'a' },
    ];
    expect(validateRows(rows).ok).toBe(false);
  });

  it('hop le: TK khong chi tiet + TK chi tiet co doi tuong', () => {
    const rows: SoDuRow[] = [
      { ...base, key: '1', maTaiKhoan: '111', duNo: 100 },
      { ...base, key: '2', maTaiKhoan: '131', chiTietTheo: 'KHACH_HANG', chiTietId: 'a', duNo: 50 },
    ];
    expect(validateRows(rows).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `cd fe && npx vitest run src/pages/danh-muc/so-du-dau-ky/chiTietConfig.test.ts 2>&1 | tail -15`
Expected: FAIL — không tìm thấy module `./chiTietConfig`.

- [ ] **Step 3: Viết implementation**

Create `chiTietConfig.ts`:

```typescript
export type ChiTietLoai =
  | 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU' | 'NGAN_HANG_QUY';

export const CHI_TIET_LABEL: Record<ChiTietLoai, string> = {
  KHACH_HANG: 'Khách hàng',
  NHA_CUNG_CAP: 'Nhà cung cấp',
  NHAN_VIEN: 'Nhân viên',
  NHA_THAU: 'Nhà thầu',
  NGAN_HANG_QUY: 'Ngân hàng & Quỹ',
};

// 4 loai map sang DoiTuong.loai; NGAN_HANG_QUY dung danh muc NganHang
export const DOI_TUONG_LOAI: Record<ChiTietLoai, string | null> = {
  KHACH_HANG: 'KHACH_HANG',
  NHA_CUNG_CAP: 'NHA_CUNG_CAP',
  NHAN_VIEN: 'NHAN_VIEN',
  NHA_THAU: 'NHA_THAU',
  NGAN_HANG_QUY: null,
};

export interface SoDuRow {
  key: string;
  maTaiKhoan: string;
  tenTaiKhoan: string;
  chiTietTheo?: ChiTietLoai;
  chiTietId?: string;
  chiTietMa?: string;
  chiTietTen?: string;
  duNo: number;
  duCo: number;
}

export interface ValidateResult {
  ok: boolean;
  message?: string;
}

export function validateRows(rows: SoDuRow[]): ValidateResult {
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.maTaiKhoan) {
      return { ok: false, message: 'Có dòng chưa chọn tài khoản' };
    }
    if (r.chiTietTheo && !r.chiTietId) {
      return {
        ok: false,
        message: `Tài khoản ${r.maTaiKhoan} cần chọn đối tượng (${CHI_TIET_LABEL[r.chiTietTheo]})`,
      };
    }
    const dupKey = `${r.maTaiKhoan}::${r.chiTietId ?? ''}`;
    if (seen.has(dupKey)) {
      return {
        ok: false,
        message: `Trùng dòng cho tài khoản ${r.maTaiKhoan}${r.chiTietMa ? ' - ' + r.chiTietMa : ''}`,
      };
    }
    seen.add(dupKey);
  }
  return { ok: true };
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `cd fe && npx vitest run src/pages/danh-muc/so-du-dau-ky/chiTietConfig.test.ts 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.ts fe/src/pages/danh-muc/so-du-dau-ky/chiTietConfig.test.ts
git commit -m "feat(fe): helper thuan + test cho so du dau ky chi tiet"
```

---

## Task 8: FE Trang Số dư đầu kỳ — UX "+ Thêm dòng"

**Files:**
- Modify: `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx`

Viết lại trang dùng mô hình dòng động. Dưới đây là implementation đầy đủ thay cho file hiện tại.

- [ ] **Step 1: Thay toàn bộ nội dung `SoDuDauKyPage.tsx`**

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Table, Button, InputNumber, DatePicker, Select, Space,
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

const { Text } = Typography;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

interface DoiTuongOption { value: string; label: string; ma: string; ten: string; }

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}-${Date.now()}`;

const SoDuDauKyPage: React.FC = () => {
  const { canEdit } = usePagePermission('/danh-muc/so-du-dau-ky');
  const [rows, setRows] = useState<SoDuRow[]>([]);
  const [accounts, setAccounts] = useState<
    { ma: string; ten: string; chiTietTheo?: ChiTietLoai }[]
  >([]);
  const [ngayApDung, setNgayApDung] = useState<Dayjs>(dayjs().startOf('year'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // cache options doi tuong theo loai
  const [optCache, setOptCache] = useState<Record<string, DoiTuongOption[]>>({});

  const accountMap = useMemo(() => {
    const m = new Map<string, { ma: string; ten: string; chiTietTheo?: ChiTietLoai }>();
    accounts.forEach((a) => m.set(a.ma, a));
    return m;
  }, [accounts]);

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
      const [accs, opening] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        soDuDauKyService.getAll(),
      ]);
      const accList = accs.map((a) => ({
        ma: a.ma, ten: a.ten,
        chiTietTheo: a.chiTietTheo as ChiTietLoai | undefined,
      }));
      setAccounts(accList);
      const accLookup = new Map(accList.map((a) => [a.ma, a]));
      const nextRows: SoDuRow[] = opening.items.map((i) => ({
        key: newKey(),
        maTaiKhoan: i.maTaiKhoan,
        tenTaiKhoan: accLookup.get(i.maTaiKhoan)?.ten ?? '',
        chiTietTheo:
          (i.chiTietType as ChiTietLoai | undefined) ??
          accLookup.get(i.maTaiKhoan)?.chiTietTheo,
        chiTietId: i.chiTietId,
        chiTietMa: i.chiTietMa,
        chiTietTen: i.chiTietTen,
        duNo: Number(i.duNo) || 0,
        duCo: Number(i.duCo) || 0,
      }));
      setRows(nextRows);
      if (opening.ngayApDung) setNgayApDung(dayjs(opening.ngayApDung));
    } catch (e) {
      message.error('Không tải được dữ liệu số dư đầu kỳ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const patchRow = (key: string, patch: Partial<SoDuRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const handleSelectAccount = (key: string, ma: string) => {
    const acc = accountMap.get(ma);
    patchRow(key, {
      maTaiKhoan: ma,
      tenTaiKhoan: acc?.ten ?? '',
      chiTietTheo: acc?.chiTietTheo,
      chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined,
    });
    if (acc?.chiTietTheo) loadOptions(acc.chiTietTheo);
  };

  const handleSelectDoiTuong = (key: string, loai: ChiTietLoai, id: string) => {
    const opt = (optCache[loai] || []).find((o) => o.value === id);
    patchRow(key, { chiTietId: id, chiTietMa: opt?.ma, chiTietTen: opt?.ten });
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        key: newKey(), maTaiKhoan: '', tenTaiKhoan: '', chiTietTheo: undefined,
        chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined, duNo: 0, duCo: 0,
      },
    ]);

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  const { tongNo, tongCo } = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({ tongNo: acc.tongNo + (r.duNo || 0), tongCo: acc.tongCo + (r.duCo || 0) }),
        { tongNo: 0, tongCo: 0 },
      ),
    [rows],
  );
  const canDoi = Math.round(tongNo * 100) === Math.round(tongCo * 100);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })),
    [accounts],
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
        })),
      });
      if (!result.canDoi) message.warning('Đã lưu — lưu ý tổng Nợ và tổng Có chưa cân đối');
      else message.success('Lưu số dư đầu kỳ thành công');
    } catch (e) {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const numberInput = (record: SoDuRow, field: 'duNo' | 'duCo') => (
    <InputNumber
      style={{ width: '100%' }}
      value={record[field]}
      disabled={!canEdit}
      min={0}
      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      parser={(v) => Number((v || '').replace(/,/g, ''))}
      onChange={(v) => patchRow(record.key, { [field]: Number(v) || 0 })}
    />
  );

  const columns = [
    {
      title: 'Tài khoản', dataIndex: 'maTaiKhoan', width: 280,
      render: (_: string, record: SoDuRow) => (
        <Select
          style={{ width: '100%' }}
          showSearch optionFilterProp="label"
          placeholder="Chọn tài khoản"
          disabled={!canEdit}
          value={record.maTaiKhoan || undefined}
          options={accountOptions}
          onChange={(v) => handleSelectAccount(record.key, v)}
        />
      ),
    },
    {
      title: 'Chi tiết theo đối tượng', dataIndex: 'chiTietId', width: 300,
      render: (_: string, record: SoDuRow) => {
        if (!record.chiTietTheo) return <Text type="secondary">—</Text>;
        const opts = optCache[record.chiTietTheo] || [];
        return (
          <Select
            style={{ width: '100%' }}
            showSearch optionFilterProp="label"
            placeholder={`Chọn ${CHI_TIET_LABEL[record.chiTietTheo]}`}
            disabled={!canEdit}
            value={record.chiTietId}
            options={opts}
            onFocus={() => loadOptions(record.chiTietTheo!)}
            onChange={(v) => handleSelectDoiTuong(record.key, record.chiTietTheo!, v)}
          />
        );
      },
    },
    { title: 'Dư Nợ đầu kỳ', dataIndex: 'duNo', width: 180,
      render: (_: number, r: SoDuRow) => numberInput(r, 'duNo') },
    { title: 'Dư Có đầu kỳ', dataIndex: 'duCo', width: 180,
      render: (_: number, r: SoDuRow) => numberInput(r, 'duCo') },
    {
      title: '', dataIndex: 'op', width: 50,
      render: (_: unknown, record: SoDuRow) => (
        <Popconfirm title="Xoá dòng này?" onConfirm={() => removeRow(record.key)}
          disabled={!canEdit}>
          <Button type="text" danger icon={<DeleteOutlined />} disabled={!canEdit} />
        </Popconfirm>
      ),
    },
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
        <Button icon={<PlusOutlined />} onClick={addRow} disabled={!canEdit}
          style={{ marginBottom: 16 }}>Thêm dòng</Button>
        <Table
          rowKey="key" loading={loading} dataSource={rows} columns={columns}
          pagination={false} scroll={{ y: 'calc(100vh - 380px)' }} size="small"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong>{formatCurrency(tongNo)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Text strong type={canDoi ? undefined : 'danger'}>
                    {formatCurrency(tongCo)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
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

Run: `cd fe && npx tsc --noEmit 2>&1 | grep -i 'so-du-dau-ky/SoDuDauKyPage' | head`
Expected: không lỗi.

Run: `cd fe && npx eslint src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx 2>&1 | tail -10`
Expected: không lỗi (cảnh báo warning chấp nhận được).

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx
git commit -m "feat(fe): trang so du dau ky nhap chi tiet theo doi tuong"
```

---

## Task 9: Kiểm tra tổng thể

- [ ] **Step 1: BE build cả 2 service liên quan**

Run: `cd be && npx nest build master-data-service && npx nest build reporting-service 2>&1 | tail -5`
Expected: thành công.

- [ ] **Step 2: BE test helper**

Run: `cd be && npx jest libs/service-client/src/helpers/aggregate-opening.spec.ts 2>&1 | tail -8`
Expected: PASS.

- [ ] **Step 3: FE test + build**

Run: `cd fe && npx vitest run 2>&1 | tail -12`
Expected: tất cả test PASS.

Run: `cd fe && npm run build 2>&1 | tail -8`
Expected: build thành công.

- [ ] **Step 4: Lint FE**

Run: `cd fe && npm run lint 2>&1 | tail -15`
Expected: không lỗi mới ở các file đã sửa.
