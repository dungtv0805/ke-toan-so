# Bảng kê thuế — sửa được tiền thuế / tổng thanh toán — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tiền thuế và tổng thanh toán của bảng kê thuế mặc định vẫn tính theo công thức, nhưng người dùng sửa được — cả khi nhập tay lẫn khi import Excel.

**Architecture:** Backend `applyTotals` thôi ghi đè vô điều kiện, chuyển sang ưu tiên giá trị gửi lên (`dto.tienThue ?? tinhTienThue(...)`); DTO thêm 2 field tùy chọn. Frontend giữ quy tắc liên động và cảnh báo lệch. Parser import đổi từ khớp cột theo vị trí sang khớp theo tên tiêu đề, nhờ đó file mẫu cũ 9 cột vẫn chạy song song file mới 11 cột.

**Tech Stack:** NestJS + TypeORM + class-validator (BE, test bằng Jest); React + antd + SheetJS/ExcelJS (FE, test bằng Vitest).

**Spec:** `docs/superpowers/specs/2026-07-14-bang-ke-thue-sua-tien-thue-design.md`

## Global Constraints

- Công thức mặc định giữ nguyên: `tienThue = round(giaTriChuaThue × rate(thueSuat))`, `tongThanhToan = giaTriChuaThue + tienThue`. Thuế suất: `0/5/8/10/KCT/KKKT`, KCT & KKKT = 0%.
- Quy tắc liên động (FE giữ): đổi **Giá trị chưa thuế** hoặc **Thuế suất** → tính lại cả tiền thuế và tổng (ghi đè số tay); sửa **Tiền thuế** → tổng = giá + tiền thuế; sửa **Tổng** → chỉ mình nó đổi.
- Ngưỡng cảnh báo lệch: **1.000 đ**. Cảnh báo không chặn lưu / không chặn import.
- BE bật `forbidNonWhitelisted: true` (`be/apps/tax-service/src/main.ts`) — field không khai trong DTO sẽ bị 400, nên phải khai `tienThue`/`tongThanhToan`.
- Mọi thay đổi làm cho **cả 2 biến thể**: bảng kê **mua vào** và **bán ra** (code đối xứng).
- File mẫu cũ 9 cột phải import được như cũ.
- Test BE: `cd be && npx jest <path>`. Test FE: `cd fe && npx vitest run <path>`.
- Commit tiếng Việt, kết thúc bằng `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Backend nhận tiền thuế / tổng thanh toán từ input

**Files:**
- Modify: `be/apps/tax-service/src/bang-ke-mua-vao/dto/create-bang-ke-mua-vao.dto.ts`
- Modify: `be/apps/tax-service/src/bang-ke-ban-ra/dto/create-bang-ke-ban-ra.dto.ts`
- Modify: `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.service.ts:33-44` (`applyTotals`)
- Modify: `be/apps/tax-service/src/bang-ke-ban-ra/bang-ke-ban-ra.service.ts:33-43` (`applyTotals`)
- Test: `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.import.spec.ts` (thêm describe)
- Test: `be/apps/tax-service/src/bang-ke-ban-ra/bang-ke-ban-ra.import.spec.ts` (thêm describe)

**Interfaces:**
- Produces: `CreateBangKeMuaVaoDto` / `CreateBangKeBanRaDto` thêm `tienThue?: number`, `tongThanhToan?: number` (đều `@IsOptional() @IsNumber() @Min(0)`). `UpdateDto` (PartialType) và `ImportDto` (bọc CreateDto) tự có theo.

- [ ] **Step 1: Viết test thất bại — thêm vào cuối `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.import.spec.ts`**

Dùng lại `makeService()` và `dto()` đã có sẵn ở đầu file.

```ts
describe('BangKeMuaVaoService — tiền thuế nhập tay', () => {
  it('create: không gửi tienThue → tính theo công thức', async () => {
    const { service } = makeService();
    const saved = await service.create(dto({ giaTriChuaThue: 1_000_000, thueSuat: '10' }));
    expect(saved.tienThue).toBe(100_000);
    expect(saved.tongThanhToan).toBe(1_100_000);
  });

  it('create: gửi tienThue → giữ nguyên số nhập, không tính lại', async () => {
    const { service } = makeService();
    const saved = await service.create(
      dto({ giaTriChuaThue: 1_000_000, thueSuat: '10', tienThue: 99_998 }),
    );
    expect(saved.tienThue).toBe(99_998);
    // tổng suy ra từ tiền thuế nhập tay
    expect(saved.tongThanhToan).toBe(1_099_998);
  });

  it('create: gửi cả tongThanhToan → giữ nguyên số nhập', async () => {
    const { service } = makeService();
    const saved = await service.create(
      dto({ giaTriChuaThue: 1_000_000, thueSuat: '10', tienThue: 99_998, tongThanhToan: 1_099_990 }),
    );
    expect(saved.tienThue).toBe(99_998);
    expect(saved.tongThanhToan).toBe(1_099_990);
  });

  it('create: tienThue = 0 vẫn được tôn trọng (không bị coi là "chưa nhập")', async () => {
    const { service } = makeService();
    const saved = await service.create(
      dto({ giaTriChuaThue: 1_000_000, thueSuat: '10', tienThue: 0 }),
    );
    expect(saved.tienThue).toBe(0);
    expect(saved.tongThanhToan).toBe(1_000_000);
  });

  it('importMany: mỗi dòng giữ tiền thuế của chính nó, dòng bỏ trống thì tính công thức', async () => {
    const { service, repo } = makeService();
    await service.importMany([
      dto({ soHoaDon: 'A1', giaTriChuaThue: 1_000_000, thueSuat: '10', tienThue: 99_998 }),
      dto({ soHoaDon: 'A2', giaTriChuaThue: 2_000_000, thueSuat: '8' }),
    ]);
    const entities = repo.save.mock.calls[0][0] as Array<{
      soHoaDon: string;
      tienThue: number;
      tongThanhToan: number;
    }>;
    expect(entities[0].tienThue).toBe(99_998);
    expect(entities[1].tienThue).toBe(160_000);
    expect(entities[1].tongThanhToan).toBe(2_160_000);
  });

  it('DTO: tienThue âm bị chặn', async () => {
    const instance = plainToInstance(CreateBangKeMuaVaoDto, {
      ...dto(),
      tienThue: -1,
    });
    const errors = await validate(instance);
    expect(errors.some((e) => e.property === 'tienThue')).toBe(true);
  });

  it('DTO: tienThue / tongThanhToan hợp lệ thì qua được validation', async () => {
    const instance = plainToInstance(CreateBangKeMuaVaoDto, {
      ...dto(),
      tienThue: 99_998,
      tongThanhToan: 1_099_998,
    });
    const errors = await validate(instance);
    expect(errors).toHaveLength(0);
  });
});
```

Thêm test `update` (giữ nguyên hành vi liên động do FE gửi số mới):

```ts
describe('BangKeMuaVaoService.update — tiền thuế nhập tay', () => {
  it('update gửi kèm tienThue mới → lưu số mới', async () => {
    const { service } = makeService();
    const existing = {
      id: 'x1',
      giaTriChuaThue: 1_000_000,
      thueSuat: '10',
      tienThue: 100_000,
      tongThanhToan: 1_100_000,
      isActive: true,
    };
    jest.spyOn(service, 'findOne').mockResolvedValue(existing as never);

    const saved = await service.update('x1', {
      giaTriChuaThue: 2_000_000,
      tienThue: 199_997,
      tongThanhToan: 2_199_997,
    } as never);

    expect(saved.tienThue).toBe(199_997);
    expect(saved.tongThanhToan).toBe(2_199_997);
  });

  it('update chỉ đổi giaTriChuaThue (không gửi tienThue) → tính lại theo công thức', async () => {
    const { service } = makeService();
    const existing = {
      id: 'x1',
      giaTriChuaThue: 1_000_000,
      thueSuat: '10',
      tienThue: 99_998,
      tongThanhToan: 1_099_998,
      isActive: true,
    };
    jest.spyOn(service, 'findOne').mockResolvedValue(existing as never);

    const saved = await service.update('x1', { giaTriChuaThue: 2_000_000 } as never);

    expect(saved.tienThue).toBe(200_000);
    expect(saved.tongThanhToan).toBe(2_200_000);
  });
});
```

Bản cho **bán ra**: copy y hệt sang `bang-ke-ban-ra.import.spec.ts`, đổi `BangKeMuaVaoService` → `BangKeBanRaService`, `CreateBangKeMuaVaoDto` → `CreateBangKeBanRaDto`, và các field đối tác (`tenNguoiBan`/`mstNguoiBan` → `tenNguoiMua`/`mstNguoiMua`) theo đúng helper `dto()` sẵn có trong file đó.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd be && npx jest apps/tax-service/src/bang-ke-mua-vao`
Expected: FAIL — `tienThue` bị ghi đè thành 100.000 (test "giữ nguyên số nhập" fail); TypeScript báo `tienThue` không có trong `CreateBangKeMuaVaoDto`.

- [ ] **Step 3: Thêm 2 field vào `create-bang-ke-mua-vao.dto.ts`**

Thêm `Min` vào import từ `class-validator`, và 2 field ngay sau `thueSuat`:

```ts
  @IsNumber()
  @IsOptional()
  @Min(0)
  tienThue?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  tongThanhToan?: number;
```

Làm y hệt cho `be/apps/tax-service/src/bang-ke-ban-ra/dto/create-bang-ke-ban-ra.dto.ts`.

- [ ] **Step 4: Sửa `applyTotals` ở cả 2 service**

`be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.service.ts` (thay dòng 33-44):

```ts
  /**
   * Chốt tiền thuế + tổng thanh toán.
   * Mặc định tính theo công thức, NHƯNG tôn trọng số người dùng nhập tay (hóa đơn nhà cung cấp
   * làm tròn trên từng dòng hàng nên hay lệch vài đồng so với tính trên tổng).
   * FE giữ quy tắc liên động: đổi giá trị / thuế suất thì FE gửi lên tiền thuế đã tính lại.
   */
  private applyTotals<T extends {
    giaTriChuaThue?: number;
    thueSuat?: string;
    tienThue?: number;
    tongThanhToan?: number;
  }>(target: BangKeMuaVao, dto: T): void {
    const gia = dto.giaTriChuaThue ?? target.giaTriChuaThue ?? 0;
    const suat = dto.thueSuat ?? target.thueSuat ?? '10';
    const tienThue = dto.tienThue ?? tinhTienThue(gia, suat);
    target.giaTriChuaThue = gia;
    target.thueSuat = suat;
    target.tienThue = tienThue;
    target.tongThanhToan = dto.tongThanhToan ?? Number(gia) + tienThue;
  }
```

Chú ý dùng `??` (không dùng `||`) để `tienThue: 0` không bị coi là "chưa nhập".

Làm y hệt cho `be/apps/tax-service/src/bang-ke-ban-ra/bang-ke-ban-ra.service.ts` (đổi kiểu `target` thành `BangKeBanRa`).

**Cạm bẫy ở `update`:** `update()` gọi `Object.assign(item, clean)` TRƯỚC `applyTotals(item, updateDto)`. Nếu DTO update không gửi `tienThue`, `clean` không có field đó nên `item.tienThue` vẫn là số cũ trong DB — nhưng `applyTotals` đọc `dto.tienThue` (undefined) → tính lại theo công thức. Đó ĐÚNG như test "update chỉ đổi giaTriChuaThue → tính lại". Không được đọc `target.tienThue` làm fallback, nếu không số tay cũ sẽ dính lại khi đổi giá trị.

- [ ] **Step 5: Chạy test — phải PASS**

Run: `cd be && npx jest apps/tax-service`
Expected: PASS toàn bộ (gồm cả test import cũ).

- [ ] **Step 6: Commit**

```bash
git add be/apps/tax-service/src/bang-ke-mua-vao/ be/apps/tax-service/src/bang-ke-ban-ra/
git commit -m "$(cat <<'EOF'
feat(tax): nhận tiền thuế / tổng thanh toán nhập tay, không ghi đè bằng công thức

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Parser import khớp cột theo TÊN tiêu đề

**Files:**
- Modify: `fe/src/pages/thue/components/import/lib/columns.ts`
- Modify: `fe/src/pages/thue/components/import/lib/parseRows.ts`
- Modify: `fe/src/pages/thue/components/import/ImportBangKeModal.tsx:76-83`
- Test: `fe/src/pages/thue/components/import/lib/__tests__/parseRows.test.ts`

**Interfaces:**
- Produces (từ `parseRows.ts`):
  - `buildHeaderMap(aoa: unknown[][], columns: ImportColumn[]): Map<ImportColumnKey, number>`
  - `missingRequiredColumns(aoa: unknown[][], columns: ImportColumn[]): string[]` — tên các cột **bắt buộc** không thấy trong header; rỗng = file hợp lệ. **Thay** `headerMatches`.
  - `aoaToRawRows(aoa: unknown[][], columns: ImportColumn[]): RawImportRow[]` — giữ nguyên chữ ký, đổi ruột sang đọc theo header map.
- Produces (từ `columns.ts`): `ImportColumnKey` thêm `'tienThue' | 'tongThanhToan'`; `buildColumns` thêm 2 cột không bắt buộc; `BangKeImportItem` thêm `tienThue?: number; tongThanhToan?: number`.

- [ ] **Step 1: Viết test thất bại — thêm vào `fe/src/pages/thue/components/import/lib/__tests__/parseRows.test.ts`**

Đọc file test hiện có trước để dùng lại đúng helper/khuôn dựng `aoa` của nó. Thêm:

```ts
describe('khớp cột theo tên tiêu đề', () => {
  const columns = buildColumns('mua');

  const HEADER_11 = [
    'Ngày hóa đơn',
    'Số hóa đơn',
    'Ký hiệu',
    'Tên người bán',
    'MST người bán',
    'Tên hàng hóa / dịch vụ',
    'Giá trị chưa thuế',
    'Thuế suất',
    'Tiền thuế',
    'Tổng thanh toán',
    'Ghi chú',
  ];

  const HEADER_9_CU = [
    'Ngày hóa đơn',
    'Số hóa đơn',
    'Ký hiệu',
    'Tên người bán',
    'MST người bán',
    'Tên hàng hóa / dịch vụ',
    'Giá trị chưa thuế',
    'Thuế suất',
    'Ghi chú',
  ];

  it('file mẫu mới 11 cột: đọc được tiền thuế và tổng thanh toán', () => {
    const aoa = [
      HEADER_11,
      ['01/06/2026', '0000123', '1C25TAA', 'Cty A', '0101243150', 'VPP', 1_000_000, '10 - 10%', 99_998, 1_099_998, 'ghi chú'],
    ];
    expect(missingRequiredColumns(aoa, columns)).toEqual([]);

    const rows = aoaToRawRows(aoa, columns);
    expect(rows).toHaveLength(1);
    expect(rows[0].tienThue).toBe(99_998);
    expect(rows[0].tongThanhToan).toBe(1_099_998);
    expect(rows[0].ghiChu).toBe('ghi chú');
  });

  it('file mẫu CŨ 9 cột vẫn import được: 2 cột mới rỗng', () => {
    const aoa = [
      HEADER_9_CU,
      ['01/06/2026', '0000123', '1C25TAA', 'Cty A', '0101243150', 'VPP', 1_000_000, '10 - 10%', 'ghi chú'],
    ];
    expect(missingRequiredColumns(aoa, columns)).toEqual([]);

    const rows = aoaToRawRows(aoa, columns);
    expect(rows[0].giaTriChuaThue).toBe(1_000_000);
    expect(rows[0].ghiChu).toBe('ghi chú'); // đọc theo TÊN nên không lệch cột
    expect(rows[0].tienThue).toBe('');
    expect(rows[0].tongThanhToan).toBe('');
  });

  it('cột xếp sai thứ tự vẫn đọc đúng', () => {
    const aoa = [
      ['Số hóa đơn', 'Ngày hóa đơn', 'Thuế suất', 'Giá trị chưa thuế', 'Tên người bán'],
      ['0000123', '01/06/2026', '10 - 10%', 1_000_000, 'Cty A'],
    ];
    expect(missingRequiredColumns(aoa, columns)).toEqual([]);

    const rows = aoaToRawRows(aoa, columns);
    expect(rows[0].soHoaDon).toBe('0000123');
    expect(rows[0].giaTriChuaThue).toBe(1_000_000);
    expect(rows[0].ten).toBe('Cty A');
  });

  it('tiêu đề khác hoa thường / khác dấu vẫn nhận', () => {
    const aoa = [
      ['NGAY HOA DON', 'so hoa don', 'Tên người bán', 'Giá trị chưa thuế', 'thue suat'],
      ['01/06/2026', '0000123', 'Cty A', 1_000_000, '10'],
    ];
    expect(missingRequiredColumns(aoa, columns)).toEqual([]);
    expect(aoaToRawRows(aoa, columns)[0].soHoaDon).toBe('0000123');
  });

  it('thiếu cột bắt buộc → nêu đúng tên cột thiếu', () => {
    const aoa = [['Ngày hóa đơn', 'Số hóa đơn', 'Ghi chú'], ['01/06/2026', '0000123', 'x']];
    expect(missingRequiredColumns(aoa, columns)).toEqual([
      'Tên người bán',
      'Giá trị chưa thuế',
      'Thuế suất',
    ]);
  });
});
```

Nhớ cập nhật import ở đầu file test: `import { aoaToRawRows, missingRequiredColumns } from '../parseRows'` (bỏ `headerMatches` nếu file test cũ có dùng — sửa các test cũ đó sang `missingRequiredColumns(...).toEqual([])`).

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/thue/components/import/lib/__tests__/parseRows.test.ts`
Expected: FAIL — `missingRequiredColumns` không tồn tại; `rows[0].tienThue` undefined.

- [ ] **Step 3: Thêm 2 cột vào `fe/src/pages/thue/components/import/lib/columns.ts`**

`ImportColumnKey` thêm 2 key; `buildColumns` thêm 2 cột **sau `thueSuat`, trước `ghiChu`**; `BangKeImportItem` thêm 2 field:

```ts
export type ImportColumnKey =
  | "ngayHoaDon"
  | "soHoaDon"
  | "kyHieuHoaDon"
  | "ten"
  | "mst"
  | "tenHangHoa"
  | "giaTriChuaThue"
  | "thueSuat"
  | "tienThue"
  | "tongThanhToan"
  | "ghiChu";
```

```ts
    { key: "giaTriChuaThue", header: "Giá trị chưa thuế", required: true },
    { key: "thueSuat", header: "Thuế suất", required: true },
    // Để trống → BE tính theo công thức. Nhập số → tôn trọng số trên hóa đơn (chênh lệch làm tròn).
    { key: "tienThue", header: "Tiền thuế", required: false },
    { key: "tongThanhToan", header: "Tổng thanh toán", required: false },
    { key: "ghiChu", header: "Ghi chú", required: false },
```

```ts
export interface BangKeImportItem {
  // ... các field cũ giữ nguyên ...
  giaTriChuaThue: number;
  thueSuat: ThueSuat;
  tienThue?: number;
  tongThanhToan?: number;
  ghiChu?: string;
}
```

- [ ] **Step 4: Viết lại `fe/src/pages/thue/components/import/lib/parseRows.ts`**

```ts
import { ImportColumn, ImportColumnKey, RawImportRow } from "./columns";

/** Chuẩn hóa tiêu đề để so khớp: bỏ khoảng trắng thừa, hạ hoa thường, bỏ dấu tiếng Việt. */
function fold(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

/**
 * Khớp cột theo TÊN tiêu đề (không theo vị trí) → file mẫu cũ 9 cột và file mẫu mới 11 cột
 * dùng chung một parser, cột xếp sai thứ tự cũng đọc đúng.
 */
export function buildHeaderMap(
  aoa: unknown[][],
  columns: ImportColumn[],
): Map<ImportColumnKey, number> {
  const header = (aoa?.[0] ?? []).map(fold);
  const map = new Map<ImportColumnKey, number>();
  for (const col of columns) {
    const idx = header.indexOf(fold(col.header));
    if (idx >= 0) map.set(col.key, idx);
  }
  return map;
}

/** Tên các cột BẮT BUỘC không tìm thấy trong header. Rỗng = file dùng được. */
export function missingRequiredColumns(
  aoa: unknown[][],
  columns: ImportColumn[],
): string[] {
  const map = buildHeaderMap(aoa, columns);
  return columns.filter((c) => c.required && !map.has(c.key)).map((c) => c.header);
}

/**
 * Chuyển array-of-arrays (đọc từ sheet) → RawImportRow[].
 * Dòng 0 là header (bỏ). Ô số giữ nguyên kiểu number (serial ngày, số tiền); còn lại ép về
 * chuỗi đã trim. Cột không có trong file → chuỗi rỗng. Bỏ qua dòng trống hoàn toàn.
 * rowNumber tính theo Excel (1-based, gồm header).
 */
export function aoaToRawRows(
  aoa: unknown[][],
  columns: ImportColumn[],
): RawImportRow[] {
  if (!aoa || aoa.length <= 1) return [];

  const headerMap = buildHeaderMap(aoa, columns);
  const rows: RawImportRow[] = [];

  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    const values = cells.map((c) => {
      if (typeof c === "number") return c;
      return c === undefined || c === null ? "" : String(c).trim();
    });

    const isEmpty = values.every((v) => v === "");
    if (isEmpty) continue;

    const row: RawImportRow = { rowNumber: r + 1 };
    for (const col of columns) {
      const idx = headerMap.get(col.key);
      row[col.key] = idx === undefined ? "" : (values[idx] ?? "");
    }
    rows.push(row);
  }
  return rows;
}
```

- [ ] **Step 5: Sửa `fe/src/pages/thue/components/import/ImportBangKeModal.tsx`**

Đổi import ở dòng 14 và khối kiểm tra header ở dòng 76:

```tsx
import { aoaToRawRows, missingRequiredColumns } from "./lib/parseRows";
```

```tsx
      const columns = buildColumns(variant);
      const missing = missingRequiredColumns(aoa, columns);
      if (missing.length > 0) {
        message.error(`File thiếu cột bắt buộc: ${missing.join(", ")}. Vui lòng tải lại file mẫu.`);
        return;
      }
```

- [ ] **Step 6: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/thue/ && npx eslint src/pages/thue/`
Expected: test PASS (gồm cả `roundtrip.test.ts` cũ), lint sạch.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/thue/components/import/lib/columns.ts fe/src/pages/thue/components/import/lib/parseRows.ts fe/src/pages/thue/components/import/ImportBangKeModal.tsx fe/src/pages/thue/components/import/lib/__tests__/parseRows.test.ts
git commit -m "$(cat <<'EOF'
feat(import-thue): khớp cột theo tên tiêu đề + 2 cột tiền thuế / tổng thanh toán

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Validate + file mẫu 11 cột

**Files:**
- Modify: `fe/src/pages/thue/components/import/lib/validate.ts`
- Modify: `fe/src/pages/thue/components/import/lib/template.ts` (dòng ví dụ)
- Test: `fe/src/pages/thue/components/import/lib/__tests__/validate.test.ts`
- Test: `fe/src/pages/thue/components/import/lib/__tests__/template.test.ts`

**Interfaces:**
- Consumes: Task 2 — `ImportColumnKey` có `'tienThue' | 'tongThanhToan'`, `BangKeImportItem` có 2 field tùy chọn.
- Produces: `validateRows` đọc 2 cột mới; hằng `LECH_WARN_THRESHOLD = 1000` (không export ra ngoài thư mục `lib`).

- [ ] **Step 1: Viết test thất bại — thêm vào `fe/src/pages/thue/components/import/lib/__tests__/validate.test.ts`**

Đọc file test hiện có để dùng lại helper dựng `RawImportRow` của nó (nếu chưa có, tự viết `row(over)` như dưới). Thêm:

```ts
describe('tiền thuế / tổng thanh toán nhập tay', () => {
  const base = {
    rowNumber: 2,
    ngayHoaDon: '01/06/2026',
    soHoaDon: '0000123',
    ten: 'Cty A',
    mst: '0101243150',
    giaTriChuaThue: 1_000_000,
    thueSuat: '10',
  };

  it('bỏ trống → item không mang tienThue/tongThanhToan (BE tính công thức)', () => {
    const { results, validItems } = validateRows([{ ...base }], 'mua');
    expect(results[0].errors).toHaveLength(0);
    expect(validItems[0].tienThue).toBeUndefined();
    expect(validItems[0].tongThanhToan).toBeUndefined();
  });

  it('nhập số → đưa vào item', () => {
    const { validItems } = validateRows(
      [{ ...base, tienThue: 99_998, tongThanhToan: 1_099_998 }],
      'mua',
    );
    expect(validItems[0].tienThue).toBe(99_998);
    expect(validItems[0].tongThanhToan).toBe(1_099_998);
  });

  it('lệch công thức trong 1.000 đ (làm tròn) → KHÔNG cảnh báo', () => {
    const { results } = validateRows([{ ...base, tienThue: 99_998 }], 'mua');
    expect(results[0].warnings).toHaveLength(0);
  });

  it('lệch công thức quá 1.000 đ → cảnh báo nhưng vẫn import được', () => {
    const { results, validItems, hasErrors } = validateRows(
      [{ ...base, tienThue: 10_000 }],
      'mua',
    );
    expect(hasErrors).toBe(false);
    expect(validItems).toHaveLength(1);
    expect(results[0].warnings.some((w) => w.field === 'tienThue')).toBe(true);
    expect(results[0].warnings[0].message).toContain('lệch');
  });

  it('tiền thuế âm → lỗi, chặn dòng đó', () => {
    const { results, hasErrors } = validateRows([{ ...base, tienThue: -1 }], 'mua');
    expect(hasErrors).toBe(true);
    expect(results[0].errors.some((e) => e.field === 'tienThue')).toBe(true);
  });

  it('tiền thuế không phải số → lỗi', () => {
    const { results } = validateRows([{ ...base, tienThue: 'abc' }], 'mua');
    expect(results[0].errors.some((e) => e.field === 'tienThue')).toBe(true);
  });

  it('tổng thanh toán âm → lỗi', () => {
    const { results } = validateRows([{ ...base, tongThanhToan: -5 }], 'mua');
    expect(results[0].errors.some((e) => e.field === 'tongThanhToan')).toBe(true);
  });
});
```

Và thêm vào `template.test.ts`:

```ts
  it('file mẫu có đủ 11 tiêu đề, gồm Tiền thuế và Tổng thanh toán', () => {
    const wb = buildTemplateWorkbook('mua');
    const ws = wb.getWorksheet('BangKeMuaVao')!;
    const header = (ws.getRow(1).values as unknown[]).slice(1).map(String);
    expect(header).toEqual([
      'Ngày hóa đơn',
      'Số hóa đơn',
      'Ký hiệu',
      'Tên người bán',
      'MST người bán',
      'Tên hàng hóa / dịch vụ',
      'Giá trị chưa thuế',
      'Thuế suất',
      'Tiền thuế',
      'Tổng thanh toán',
      'Ghi chú',
    ]);
  });
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/thue/components/import/lib/__tests__/validate.test.ts src/pages/thue/components/import/lib/__tests__/template.test.ts`
Expected: FAIL — `validItems[0].tienThue` undefined khi có nhập; không có warning/error cho 2 cột mới.

- [ ] **Step 3: Sửa `fe/src/pages/thue/components/import/lib/validate.ts`**

Thêm hằng ngưỡng + bảng thuế suất (đặt cạnh `THUE_SUAT_VALUES` hiện có):

```ts
/** Lệch quá mức này so với công thức thì cảnh báo (dưới ngưỡng coi như chênh lệch làm tròn). */
const LECH_WARN_THRESHOLD = 1000;

const THUE_RATE: Record<string, number> = {
  "0": 0,
  "5": 0.05,
  "8": 0.08,
  "10": 0.1,
  KCT: 0,
  KKKT: 0,
};

const fmtVnd = (n: number): string => new Intl.NumberFormat("vi-VN").format(n);
```

Trong `validateRows`, sau khối kiểm tra Thuế suất và trước khối MST, thêm:

```ts
    // Tiền thuế / Tổng thanh toán — nhập tay được, để trống thì BE tính theo công thức.
    const tienThue = normalizeAmount(row.tienThue);
    if (asText(row.tienThue) !== "") {
      if (tienThue === null) err("tienThue", "không phải là số");
      else if (tienThue < 0) err("tienThue", "không được là số âm");
    }

    const tongThanhToan = normalizeAmount(row.tongThanhToan);
    if (asText(row.tongThanhToan) !== "") {
      if (tongThanhToan === null) err("tongThanhToan", "không phải là số");
      else if (tongThanhToan < 0) err("tongThanhToan", "không được là số âm");
    }

    // Cảnh báo lệch công thức (không chặn): bắt lỗi gõ nhầm chữ số, bỏ qua chênh lệch làm tròn.
    if (
      tienThue !== null &&
      tienThue >= 0 &&
      giaTri !== null &&
      THUE_RATE[thueSuat] !== undefined
    ) {
      const theoCongThuc = Math.round(giaTri * THUE_RATE[thueSuat]);
      const lech = Math.abs(tienThue - theoCongThuc);
      if (lech > LECH_WARN_THRESHOLD) {
        warnings.push({
          field: "tienThue",
          message: `${labelOf("tienThue")}: lệch ${fmtVnd(lech)} đ so với công thức (${theoCongThuc === 0 ? "0" : fmtVnd(theoCongThuc)} đ)`,
        });
      }
    }
```

Trong phần dựng `item`, thêm 2 field (chỉ khi có giá trị — dùng `!== null` để giữ được số 0):

```ts
      ...(tienThue !== null ? { tienThue } : {}),
      ...(tongThanhToan !== null ? { tongThanhToan } : {}),
```

- [ ] **Step 4: Thêm giá trị ví dụ cho 2 cột mới trong `fe/src/pages/thue/components/import/lib/template.ts`**

Trong `EXAMPLE_ROW`, cả `mua` và `ban`, thêm sau `thueSuat`:

```ts
    tienThue: "1000000",
    tongThanhToan: "11000000",
```

(Cột tiêu đề tự có từ `buildColumns` — Task 2 đã thêm. Dropdown thuế suất vẫn định vị bằng `columns.findIndex(...)` nên không phải sửa.)

- [ ] **Step 5: Chạy test — phải PASS**

Run: `cd fe && npx vitest run src/pages/thue/ && npx eslint src/pages/thue/`
Expected: PASS toàn bộ (gồm `roundtrip.test.ts`: dựng template → parse → validate ra item hợp lệ), lint sạch.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/thue/components/import/lib/
git commit -m "$(cat <<'EOF'
feat(import-thue): validate tiền thuế/tổng thanh toán + cảnh báo lệch công thức > 1.000 đ

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Form nhập tay sửa được tiền thuế / tổng thanh toán

**Files:**
- Modify: `fe/src/pages/thue/components/BangKePage.tsx` (khối Form quanh dòng 384-450)

**Interfaces:**
- Consumes: Task 1 (BE nhận `tienThue`, `tongThanhToan`).
- Produces: không có API mới.

- [ ] **Step 1: Đọc phần Form hiện tại**

Xem `fe/src/pages/thue/components/BangKePage.tsx` từ dòng 370 đến 455 để nắm: `form` instance, biến `previewThue` / `previewTong` (đang tính để hiển thị), hàm `fmt`, và `onFinish` gửi payload. Ghi lại tên biến thật trước khi sửa.

- [ ] **Step 2: Bỏ 2 ô chỉ-đọc, thay bằng `InputNumber` sửa được + cảnh báo lệch**

Thay khối `Row` chứa "Tiền thuế (tự tính)" / "Tổng thanh toán (tự tính)":

```tsx
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="tienThue"
                label="Tiền thuế"
                className="mb-0"
                extra={
                  lechTienThue > 1000 ? (
                    <span style={{ color: "#faad14" }}>
                      Lệch {fmt(lechTienThue)} đ so với công thức ({fmt(thueTheoCongThuc)} đ)
                    </span>
                  ) : undefined
                }
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => Number((v || "").replace(/,/g, ""))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tongThanhToan" label="Tổng thanh toán" className="mb-0">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => Number((v || "").replace(/,/g, ""))}
                />
              </Form.Item>
            </Col>
          </Row>
```

- [ ] **Step 3: Cài quy tắc liên động bằng `onValuesChange` trên `<Form>`**

Thêm vào thẻ `<Form ...>`:

```tsx
        onValuesChange={(changed, all) => {
          const gia = Number(all.giaTriChuaThue) || 0;
          const suat = String(all.thueSuat ?? "10");

          // Đổi giá trị hoặc thuế suất → tính lại cả hai (ghi đè số nhập tay).
          if ("giaTriChuaThue" in changed || "thueSuat" in changed) {
            const thue = Math.round(gia * (THUE_RATE[suat] ?? 0));
            form.setFieldsValue({ tienThue: thue, tongThanhToan: gia + thue });
            return;
          }
          // Sửa tiền thuế → tổng bám theo.
          if ("tienThue" in changed) {
            const thue = Number(all.tienThue) || 0;
            form.setFieldsValue({ tongThanhToan: gia + thue });
          }
          // Sửa tổng thanh toán → không đụng gì khác.
        }}
```

Thêm bảng thuế suất cạnh các hằng đầu file (nếu chưa có):

```tsx
const THUE_RATE: Record<string, number> = {
  "0": 0,
  "5": 0.05,
  "8": 0.08,
  "10": 0.1,
  KCT: 0,
  KKKT: 0,
};
```

Và giá trị cảnh báo (dùng `Form.useWatch` để đọc field đang gõ):

```tsx
  const wGia = Form.useWatch("giaTriChuaThue", form);
  const wSuat = Form.useWatch("thueSuat", form);
  const wThue = Form.useWatch("tienThue", form);
  const thueTheoCongThuc = Math.round((Number(wGia) || 0) * (THUE_RATE[String(wSuat ?? "10")] ?? 0));
  const lechTienThue = Math.abs((Number(wThue) || 0) - thueTheoCongThuc);
```

Xoá `previewThue` / `previewTong` nếu sau khi sửa không còn chỗ nào dùng (grep trước khi xoá).

- [ ] **Step 4: Mở form sửa → điền sẵn 2 field**

Tìm chỗ `form.setFieldsValue(...)` khi bấm Sửa một dòng (hàm mở modal edit) và bổ sung `tienThue: record.tienThue, tongThanhToan: record.tongThanhToan` để form hiện đúng số đang lưu. Khi thêm mới, để trống — người dùng gõ Giá trị + Thuế suất là 2 ô tự điền theo công thức.

- [ ] **Step 5: Kiểm tra lint + test + typecheck**

Run: `cd fe && npx eslint src/pages/thue/ && npx vitest run src/pages/thue/ && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "pages/thue" || echo "không lỗi TS ở pages/thue"`
Expected: lint sạch, test PASS, không lỗi TS mới ở `pages/thue`.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/thue/components/BangKePage.tsx
git commit -m "$(cat <<'EOF'
feat(bang-ke-thue): sửa được tiền thuế / tổng thanh toán trên form, cảnh báo lệch công thức

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Kiểm chứng end-to-end

- [ ] **Step 1: Chạy toàn bộ test + build**

Run: `cd be && npx jest apps/tax-service` rồi `cd fe && npm test && npm run build`
Expected: BE PASS, FE toàn bộ test PASS, build thành công.

- [ ] **Step 2: Kiểm tra tay (sau khi deploy BE tax-service + FE)**

1. **Thuế → Bảng kê mua vào → Thêm**: nhập Giá trị 1.000.000, Thuế suất 10% → Tiền thuế tự điền 100.000, Tổng 1.100.000. Sửa Tiền thuế thành 99.998 → Tổng thành 1.099.998. Lưu → bảng hiện đúng 99.998 (trước đây bị ghi đè về 100.000).
2. Mở lại chính hóa đơn đó bằng nút Sửa → 2 ô hiện đúng số đã lưu.
3. Sửa Thuế suất sang 8% → Tiền thuế + Tổng tính lại theo công thức (ghi đè số tay) — đúng thiết kế.
4. Gõ Tiền thuế 10.000 khi giá trị 1.000.000/10% → hiện cảnh báo vàng "Lệch 90.000 đ so với công thức"; vẫn lưu được.
5. **Import**: tải file mẫu mới → có cột "Tiền thuế", "Tổng thanh toán"; điền 1 dòng có tiền thuế lệch làm tròn → xem trước không cảnh báo, import xong số giữ nguyên. Một dòng để trống 2 cột → import ra số theo công thức.
6. **File mẫu CŨ 9 cột** (nếu còn giữ) → vẫn import bình thường.

---

## Self-Review

**Spec coverage:**
- BE `applyTotals` ưu tiên input + DTO 2 field → Task 1 ✓
- Quy tắc liên động (FE giữ) → Task 4 ✓
- Form sửa được 2 ô + cảnh báo lệch > 1.000 đ → Task 4 ✓
- File mẫu 11 cột, 2 cột không bắt buộc → Task 2 (cột) + Task 3 (ví dụ) ✓
- Parser khớp theo tên, file cũ 9 cột vẫn chạy → Task 2 ✓
- Validate 2 cột (lỗi khi âm/không phải số) + cảnh báo lệch ở bảng xem trước → Task 3 ✓
- Test BE (create/import/update) → Task 1; test FE (parseRows/validate/template/roundtrip) → Task 2, 3 ✓
- Cả 2 biến thể mua vào / bán ra → Task 1 (2 service, 2 DTO, 2 spec); FE dùng chung code cho cả 2 biến thể ✓

**Type consistency:** `tienThue` / `tongThanhToan` là `number` optional ở mọi tầng (`CreateDto`, `BangKeImportItem`, `RawImportRow` qua `ImportColumnKey`); `missingRequiredColumns` thay `headerMatches` ở cả `parseRows.ts` và `ImportBangKeModal.tsx`.
