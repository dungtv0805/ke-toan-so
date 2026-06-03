# Import Nhật ký chung từ Excel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép kế toán tải file Excel để tạo hàng loạt chứng từ Nhật ký chung (mỗi dòng = 1 chứng từ), với bước xem trước + chặn nếu có lỗi, dùng lại pipeline dữ liệu của form nhập tay.

**Architecture:** Hướng A — Frontend đọc Excel bằng `xlsx` (SheetJS), khớp mã với master data đã load (giống form), validate + dựng `danhMuc` (snapshot đầy đủ) ngay trên FE, hiện bảng xem trước; chỉ khi sạch lỗi mới gửi danh sách item đã dựng sẵn lên endpoint BE mới `POST /nhat-ky-chung/import`. BE chỉ làm việc ghi: sinh số phiếu riêng cho từng item rồi tạo `ChungTu`.

**Tech Stack:** React + TypeScript + Vite + Ant Design + CHanlder pattern + `xlsx` (FE); NestJS + TypeORM (MongoDB) (BE). Test: vitest (FE), jest + reflect-metadata (BE).

**Spec:** `docs/superpowers/specs/2026-06-03-nhat-ky-chung-import-excel-design.md`

**Branch:** `feat/nhat-ky-chung-import-excel`

---

## File Structure

**Backend (mới/sửa):**
- Modify: `be/apps/voucher-service/src/shared/voucher-number.service.ts` — thêm `generateVoucherNumbers(loai, count)`
- Create: `be/apps/voucher-service/src/shared/voucher-number.service.spec.ts` — test phương thức mới
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts` — thêm `importEntries(items, userId)`
- Create: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung-import.service.spec.ts` — test importEntries
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts` — thêm route `POST import`

**Frontend (mới/sửa):**
- Create lib (pure logic, có test):
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/columns.ts`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/normalize.ts`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/parseRows.ts`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/buildDanhMucFromRow.ts`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/validate.ts`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts`
  - Tests: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/*.test.ts`
- Create handler (CHanlder pattern):
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/import.handler.ts`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/ImportHandlerContext.tsx`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/sub-handler/index.ts`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/sub-handler/load-master-data/{load-master-data.handler.ts,load-master-data.event.ts}`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/sub-handler/parse/{parse.handler.ts,parse.event.ts}`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/sub-handler/submit/{submit.handler.ts,submit.event.ts}`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/import.state.ts`
- Create UI:
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/ImportExcelModal.tsx`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/components/UploadStep.tsx`
  - `fe/src/pages/chung-tu/nhat-ky-chung/import/components/PreviewTable.tsx`
- Modify service:
  - `fe/src/services/nhatKyChungService.ts` — thêm `importEntries(items)`
- Wire button:
  - `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx` — nút "Import Excel" + render modal

---

## Task 1: BE — `generateVoucherNumbers(loai, count)`

Sinh nhiều số phiếu liên tiếp trong 1 lần update sequence (đặt trước cả dải).

**Files:**
- Modify: `be/apps/voucher-service/src/shared/voucher-number.service.ts`
- Test: `be/apps/voucher-service/src/shared/voucher-number.service.spec.ts`

- [ ] **Step 1: Viết test thất bại**

Create `be/apps/voucher-service/src/shared/voucher-number.service.spec.ts`:

```typescript
import 'reflect-metadata';
import { VoucherNumberService } from './voucher-number.service';

function makeRepoMock(initial?: { loai: string; year: number; lastSequence: number }) {
  let record = initial ? { ...initial } : null;
  return {
    findOne: jest.fn(async () => (record ? { ...record } : null)),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (entity: any) => {
      record = { ...entity };
      return record;
    }),
    _get: () => record,
  };
}

describe('VoucherNumberService.generateVoucherNumbers', () => {
  const year = new Date().getFullYear();

  it('trả về dải số liên tiếp khi chưa có sequence', async () => {
    const repo = makeRepoMock();
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_THU', 3);

    expect(result).toEqual([
      `PT001/${year}`,
      `PT002/${year}`,
      `PT003/${year}`,
    ]);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo._get().lastSequence).toBe(3);
  });

  it('tiếp tục từ lastSequence hiện có', async () => {
    const repo = makeRepoMock({ loai: 'PHIEU_CHI', year, lastSequence: 5 });
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_CHI', 2);

    expect(result).toEqual([`PC006/${year}`, `PC007/${year}`]);
    expect(repo._get().lastSequence).toBe(7);
  });

  it('count = 0 trả về mảng rỗng, không ghi DB', async () => {
    const repo = makeRepoMock();
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_THU', 0);

    expect(result).toEqual([]);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd be && yarn test --testPathPattern=voucher-number.service.spec`
Expected: FAIL — `service.generateVoucherNumbers is not a function`

- [ ] **Step 3: Cài đặt phương thức**

Trong `voucher-number.service.ts`, thêm method vào class `VoucherNumberService` (ngay sau `generateVoucherNumber`):

```typescript
  /**
   * Generate `count` consecutive voucher numbers in ONE sequence update.
   * Dùng cho import: mỗi item 1 số phiếu riêng nhưng chỉ ghi sequence 1 lần.
   */
  async generateVoucherNumbers(
    loai: LoaiChungTu,
    count: number,
  ): Promise<string[]> {
    if (count <= 0) return [];

    const year = new Date().getFullYear();
    const prefix = loai === 'PHIEU_THU' ? 'PT' : 'PC';

    let sequence = await this.sequenceRepository.findOne({
      where: { loai, year },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        loai,
        year,
        lastSequence: 0,
      });
    }

    const start = sequence.lastSequence + 1;
    sequence.lastSequence += count;
    await this.sequenceRepository.save(sequence);

    const numbers: string[] = [];
    for (let i = 0; i < count; i++) {
      const seqStr = (start + i).toString().padStart(3, '0');
      numbers.push(`${prefix}${seqStr}/${year}`);
    }
    return numbers;
  }
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd be && yarn test --testPathPattern=voucher-number.service.spec`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add be/apps/voucher-service/src/shared/voucher-number.service.ts be/apps/voucher-service/src/shared/voucher-number.service.spec.ts
git commit -m "feat(be): generateVoucherNumbers - sinh dải số phiếu liên tiếp"
```

---

## Task 2: BE — `importEntries(items, userId)`

Mỗi item 1 số phiếu riêng; gom theo `loai`, đặt trước dải số mỗi loại, lưu 1 lần.

**Files:**
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts`
- Test: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung-import.service.spec.ts`

- [ ] **Step 1: Viết test thất bại**

Create `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung-import.service.spec.ts`:

```typescript
import 'reflect-metadata';
import { NhatKyChungService } from './nhat-ky-chung.service';

describe('NhatKyChungService.importEntries', () => {
  function setup() {
    const created: any[] = [];
    const chungTuRepo = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (list: any[]) => {
        created.push(...list);
        return list.map((x, i) => ({ ...x, _id: `id-${i}` }));
      }),
    };
    // voucherNumberService mock: sinh số theo prefix + count
    const voucherNumberService = {
      generateVoucherNumbers: jest.fn(async (loai: string, count: number) => {
        const prefix = loai === 'PHIEU_THU' ? 'PT' : 'PC';
        return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
      }),
    };
    const tenantContext = { getCurrentTenantId: () => undefined };
    const service = new NhatKyChungService(
      chungTuRepo as any,
      voucherNumberService as any,
      tenantContext as any,
    );
    return { service, chungTuRepo, voucherNumberService, created };
  }

  it('mỗi item nhận 1 số phiếu riêng', async () => {
    const { service, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 100, noiDung: 'a' },
      { loai: 'PHIEU_THU', ngay: '2026-01-02', soTien: 200, noiDung: 'b' },
    ] as any;

    const res = await service.importEntries(items, 'user-1');

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    const saved = chungTuRepo.save.mock.calls[0][0];
    const soPhieus = saved.map((x: any) => x.soPhieu);
    expect(new Set(soPhieus).size).toBe(2); // khác nhau
    expect(saved[0].nguoiTaoId).toBe('user-1');
  });

  it('gom theo loai và đặt dải số riêng từng loại', async () => {
    const { service, voucherNumberService, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 1, noiDung: 'a' },
      { loai: 'PHIEU_CHI', ngay: '2026-01-01', soTien: 2, noiDung: 'b' },
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 3, noiDung: 'c' },
    ] as any;

    await service.importEntries(items, 'u');

    expect(voucherNumberService.generateVoucherNumbers).toHaveBeenCalledWith('PHIEU_THU', 2);
    expect(voucherNumberService.generateVoucherNumbers).toHaveBeenCalledWith('PHIEU_CHI', 1);
    const saved = chungTuRepo.save.mock.calls[0][0];
    // item index 0 và 2 là PHIEU_THU → PT1, PT2; index 1 là PHIEU_CHI → PC1
    expect(saved[0].soPhieu).toBe('PT1');
    expect(saved[1].soPhieu).toBe('PC1');
    expect(saved[2].soPhieu).toBe('PT2');
  });

  it('mảng rỗng → trả về data rỗng, không lưu', async () => {
    const { service, chungTuRepo } = setup();
    const res = await service.importEntries([] as any, 'u');
    expect(res.data).toEqual([]);
    expect(chungTuRepo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd be && yarn test --testPathPattern=nhat-ky-chung-import.service.spec`
Expected: FAIL — `service.importEntries is not a function`

- [ ] **Step 3: Cài đặt phương thức**

Trong `nhat-ky-chung.service.ts`, thêm method vào class `NhatKyChungService` (đặt ngay sau `createBatch`). Lưu ý `LoaiChungTu` đã được import gián tiếp qua `ChungTu`; thêm import type nếu cần ở đầu file: `import { ChungTu, LoaiChungTu } from '@app/entities';` (sửa dòng import `ChungTu` hiện có thành dạng này).

```typescript
  /**
   * Import: mỗi item là 1 chứng từ độc lập (số phiếu riêng).
   * Gom theo loai, đặt trước dải số mỗi loại, lưu 1 lần.
   */
  async importEntries(
    items: CreateNhatKyChungDto[],
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: ChungTu[] }> {
    if (items.length === 0) {
      return { success: true, data: [] };
    }

    // Gom index theo loai
    const indicesByLoai = new Map<LoaiChungTu, number[]>();
    items.forEach((item, idx) => {
      const list = indicesByLoai.get(item.loai) ?? [];
      list.push(idx);
      indicesByLoai.set(item.loai, list);
    });

    // Đặt trước dải số phiếu cho từng loai, gán theo đúng index gốc
    const soPhieuByIndex: string[] = new Array(items.length);
    for (const [loai, indices] of indicesByLoai) {
      const numbers = await this.voucherNumberService.generateVoucherNumbers(
        loai,
        indices.length,
      );
      indices.forEach((origIdx, i) => {
        soPhieuByIndex[origIdx] = numbers[i];
      });
    }

    const chungTuList = items.map((item, idx) =>
      this.chungTuRepository.create({
        loai: item.loai,
        soTien: item.soTien,
        noiDung: item.noiDung,
        danhMuc: item.danhMuc,
        ghiChu: item.ghiChu,
        nguoiGiaoDich: item.nguoiGiaoDich,
        diaChi: item.diaChi,
        ngay: new Date(item.ngay),
        soPhieu: soPhieuByIndex[idx],
        nguoiTaoId,
      }),
    );

    const saved = await this.chungTuRepository.save(chungTuList);
    return { success: true, data: saved };
  }
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd be && yarn test --testPathPattern=nhat-ky-chung-import.service.spec`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung-import.service.spec.ts
git commit -m "feat(be): importEntries - mỗi item 1 số phiếu riêng"
```

---

## Task 3: BE — route `POST /nhat-ky-chung/import`

**Files:**
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts`

- [ ] **Step 1: Thêm route**

Trong `nhat-ky-chung.controller.ts`, thêm ngay sau handler `createBatch` (`@Post('batch')`):

```typescript
  @Post('import')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async importEntries(
    @Body() items: CreateNhatKyChungDto[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.nhatKyChungService.importEntries(items, user.id);
  }
```

(`CreateNhatKyChungDto`, `Post`, `Body`, `CurrentUser`, `UserPayload` đều đã được import sẵn trong file.)

- [ ] **Step 2: Build BE để xác nhận không lỗi type**

Run: `cd be && yarn build voucher-service`
Expected: build thành công, không lỗi TypeScript.

- [ ] **Step 3: Commit**

```bash
git add be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts
git commit -m "feat(be): route POST /nhat-ky-chung/import"
```

---

## Task 4: FE — định nghĩa cột & kiểu dữ liệu import

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/columns.ts`

- [ ] **Step 1: Tạo file định nghĩa cột + types**

Create `columns.ts`:

```typescript
import { CreateEntryDto } from "@/services/nhatKyChungService";

/** Khóa logic của từng cột, theo đúng thứ tự trong file Excel mẫu. */
export type ImportColumnKey =
  | "ngay"
  | "loaiGiaoDich"
  | "nghiepVu"
  | "taiKhoanNo"
  | "taiKhoanCo"
  | "soTien"
  | "dienGiai"
  | "nguoiGiaoDich"
  | "diaChi"
  | "ghiChu"
  | "doiTuong"
  | "doiTuong2"
  | "duAn"
  | "boPhan"
  | "doi"
  | "nhanVien"
  | "sanPham"
  | "dongTien"
  | "khoanMuc"
  | "hopDong"
  | "nhomKhuyenMai"
  | "nhomQuanLy";

export interface ImportColumn {
  key: ImportColumnKey;
  header: string;
  required: boolean;
}

/** Thứ tự cột = thứ tự trong mảng này (index 0..21). */
export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "ngay", header: "Ngày chứng từ", required: true },
  { key: "loaiGiaoDich", header: "Loại giao dịch", required: true },
  { key: "nghiepVu", header: "Nghiệp vụ", required: true },
  { key: "taiKhoanNo", header: "TK Nợ", required: true },
  { key: "taiKhoanCo", header: "TK Có", required: true },
  { key: "soTien", header: "Số tiền", required: true },
  { key: "dienGiai", header: "Diễn giải", required: false },
  { key: "nguoiGiaoDich", header: "Người giao dịch", required: false },
  { key: "diaChi", header: "Địa chỉ", required: false },
  { key: "ghiChu", header: "Ghi chú", required: false },
  { key: "doiTuong", header: "Mã đối tượng", required: false },
  { key: "doiTuong2", header: "Mã đối tượng 2", required: false },
  { key: "duAn", header: "Mã dự án", required: false },
  { key: "boPhan", header: "Mã bộ phận", required: false },
  { key: "doi", header: "Mã đội", required: false },
  { key: "nhanVien", header: "Mã nhân viên", required: false },
  { key: "sanPham", header: "Mã sản phẩm", required: false },
  { key: "dongTien", header: "Mã dòng tiền", required: false },
  { key: "khoanMuc", header: "Mã khoản mục", required: false },
  { key: "hopDong", header: "Số hợp đồng", required: false },
  { key: "nhomKhuyenMai", header: "Mã nhóm khuyến mãi", required: false },
  { key: "nhomQuanLy", header: "Mã nhóm quản lý", required: false },
];

/** Một dòng Excel sau khi parse thành string thô theo key. */
export type RawImportRow = {
  rowNumber: number; // số dòng trong Excel (tính cả header)
} & Partial<Record<ImportColumnKey, string>>;

export interface RowError {
  field: string;
  message: string;
}

export interface RowValidationResult {
  rowNumber: number;
  errors: RowError[]; // chặn import
  warnings: RowError[]; // vẫn cho import
  item: CreateEntryDto | null; // payload đã dựng nếu không có errors
}

export interface ValidateResult {
  results: RowValidationResult[];
  validItems: CreateEntryDto[];
  hasErrors: boolean;
}
```

- [ ] **Step 2: Build FE type-check nhanh**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`
Expected: không lỗi liên quan tới `columns.ts` (lỗi sẵn có của repo khác, nếu có, bỏ qua).

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/lib/columns.ts
git commit -m "feat(fe): định nghĩa cột & types cho import Nhật ký chung"
```

---

## Task 5: FE — chuẩn hóa số tiền & ngày (`normalize.ts`)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/normalize.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/normalize.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `__tests__/normalize.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { normalizeAmount, normalizeDate } from "../normalize";

describe("normalizeAmount", () => {
  it("số nguyên thường", () => {
    expect(normalizeAmount("1000")).toBe(1000);
    expect(normalizeAmount(1000)).toBe(1000);
  });
  it("dấu phẩy ngăn cách nghìn", () => {
    expect(normalizeAmount("10,000,000")).toBe(10000000);
  });
  it("dấu chấm ngăn cách nghìn", () => {
    expect(normalizeAmount("10.000.000")).toBe(10000000);
  });
  it("thập phân dùng phẩy", () => {
    expect(normalizeAmount("1000,5")).toBe(1000.5);
  });
  it("hỗn hợp: chấm nghìn + phẩy thập phân", () => {
    expect(normalizeAmount("1.000.000,5")).toBe(1000000.5);
  });
  it("rỗng / không hợp lệ → null", () => {
    expect(normalizeAmount("")).toBeNull();
    expect(normalizeAmount("abc")).toBeNull();
    expect(normalizeAmount(undefined as unknown as string)).toBeNull();
  });
});

describe("normalizeDate", () => {
  it("DD/MM/YYYY → ISO yyyy-mm-dd", () => {
    expect(normalizeDate("01/06/2026")).toBe("2026-06-01");
    expect(normalizeDate("1/6/2026")).toBe("2026-06-01");
  });
  it("nhận Date object (cellDates)", () => {
    expect(normalizeDate(new Date(2026, 5, 1))).toBe("2026-06-01");
  });
  it("sai định dạng → null", () => {
    expect(normalizeDate("2026/06/01")).toBeNull();
    expect(normalizeDate("không phải ngày")).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/normalize.test.ts`
Expected: FAIL — không tìm thấy module `../normalize`.

- [ ] **Step 3: Cài đặt**

Create `normalize.ts`:

```typescript
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/** Chuẩn hóa số tiền từ chuỗi/ số Excel về number, hoặc null nếu không hợp lệ. */
export function normalizeAmount(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  let s = String(raw).trim();
  if (s === "") return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (s === "" || s === "-") return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    // Dấu xuất hiện sau cùng là thập phân, dấu còn lại là ngăn cách nghìn
    const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
    const decPart = s.slice(lastSep + 1).replace(/[.,]/g, "");
    s = `${intPart}.${decPart}`;
  } else if (hasComma) {
    const parts = s.split(",");
    // Nhiều phẩy, hoặc nhóm cuối đúng 3 chữ số → ngăn cách nghìn
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Chuẩn hóa ngày về 'YYYY-MM-DD', nhận DD/MM/YYYY hoặc Date; null nếu sai. */
export function normalizeDate(raw: string | Date | undefined | null): string | null {
  if (raw === undefined || raw === null) return null;

  if (raw instanceof Date) {
    const d = dayjs(raw);
    return d.isValid() ? d.format("YYYY-MM-DD") : null;
  }

  const s = String(raw).trim();
  if (s === "") return null;

  const d = dayjs(s, ["DD/MM/YYYY", "D/M/YYYY", "D/MM/YYYY", "DD/M/YYYY"], true);
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/normalize.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/lib/normalize.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/normalize.test.ts
git commit -m "feat(fe): normalizeAmount/normalizeDate cho import"
```

---

## Task 6: FE — chuyển AOA Excel → RawImportRow (`parseRows.ts`)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/parseRows.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/parseRows.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `__tests__/parseRows.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { aoaToRawRows } from "../parseRows";

describe("aoaToRawRows", () => {
  const header = [
    "Ngày chứng từ", "Loại giao dịch", "Nghiệp vụ", "TK Nợ", "TK Có", "Số tiền",
  ];

  it("bỏ dòng header, map theo vị trí cột, rowNumber bắt đầu từ 2", () => {
    const aoa = [
      header,
      ["01/06/2026", "PHIEU_THU", "NV01", "111", "511", "1000"],
    ];
    const rows = aoaToRawRows(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      ngay: "01/06/2026",
      loaiGiaoDich: "PHIEU_THU",
      nghiepVu: "NV01",
      taiKhoanNo: "111",
      taiKhoanCo: "511",
      soTien: "1000",
    });
  });

  it("bỏ qua dòng trống hoàn toàn", () => {
    const aoa = [header, ["", "", "", "", "", ""], ["01/06/2026", "PHIEU_THU", "NV01", "111", "511", "1000"]];
    const rows = aoaToRawRows(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
  });

  it("aoa rỗng hoặc chỉ có header → mảng rỗng", () => {
    expect(aoaToRawRows([])).toEqual([]);
    expect(aoaToRawRows([header])).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/parseRows.test.ts`
Expected: FAIL — module `../parseRows` không tồn tại.

- [ ] **Step 3: Cài đặt**

Create `parseRows.ts`:

```typescript
import { IMPORT_COLUMNS, RawImportRow } from "./columns";

/**
 * Chuyển array-of-arrays (đọc từ sheet) → RawImportRow[].
 * Dòng 0 là header (bỏ). Map theo VỊ TRÍ cột (index), không theo tên.
 * Bỏ qua dòng trống hoàn toàn. rowNumber tính theo Excel (1-based, gồm header).
 */
export function aoaToRawRows(aoa: unknown[][]): RawImportRow[] {
  if (!aoa || aoa.length <= 1) return [];

  const rows: RawImportRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const cells = aoa[r] ?? [];
    const values = cells.map((c) =>
      c === undefined || c === null ? "" : String(c).trim(),
    );

    const isEmpty = values.every((v) => v === "");
    if (isEmpty) continue;

    const row: RawImportRow = { rowNumber: r + 1 };
    IMPORT_COLUMNS.forEach((col, i) => {
      row[col.key] = values[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/parseRows.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/lib/parseRows.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/parseRows.test.ts
git commit -m "feat(fe): aoaToRawRows - parse AOA Excel thành RawImportRow"
```

---

## Task 7: FE — dựng `danhMuc` từ một dòng đã khớp (`buildDanhMucFromRow.ts`)

Tách riêng để tái dùng các snapshot builder; nhận các bản ghi master data đã tìm được (không tự tìm).

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/buildDanhMucFromRow.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/buildDanhMucFromRow.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `__tests__/buildDanhMucFromRow.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildDanhMucFromResolved } from "../buildDanhMucFromRow";

describe("buildDanhMucFromResolved", () => {
  it("dựng danhMuc với TK Nợ/Có, loại GD, nghiệp vụ", () => {
    const danhMuc = buildDanhMucFromResolved({
      taiKhoanNo: { ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" },
      taiKhoanCo: { ma: "511", ten: "Doanh thu", loai: "DT", nhom: "B" },
      loaiGiaoDich: { ma: "PHIEU_THU", ten: "Phiếu thu" },
      nghiepVu: "NV01",
    });

    expect(danhMuc.taiKhoanNo).toEqual({ ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" });
    expect(danhMuc.taiKhoanCo?.ma).toBe("511");
    expect(danhMuc.loaiGiaoDich).toEqual({ ma: "PHIEU_THU", ten: "Phiếu thu" });
    expect(danhMuc.nghiepVu).toEqual({ ma: "NV01", ten: "NV01" });
  });

  it("bỏ qua chiều phân bổ không truyền vào", () => {
    const danhMuc = buildDanhMucFromResolved({
      taiKhoanNo: { ma: "111", ten: "", loai: "", nhom: "" },
      taiKhoanCo: { ma: "511", ten: "", loai: "", nhom: "" },
      loaiGiaoDich: { ma: "PHIEU_THU", ten: "Phiếu thu" },
      nghiepVu: "NV01",
    });
    expect(danhMuc.doiTuong).toBeUndefined();
    expect(danhMuc.duAn).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/buildDanhMucFromRow.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Cài đặt**

Create `buildDanhMucFromRow.ts`:

```typescript
import { DanhMuc, DoiTuong, DuAn, BoPhan, SanPham, DongTien, NhomKhuyenMai, NhomQuanLy, KhoanMuc, HopDong } from "@/types";
import {
  buildDoiTuongSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildDoiSnapshot,
  buildNhanVienSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
  buildKhoanMucSnapshot,
  buildNhomKhuyenMaiSnapshot,
  buildNhomQuanLySnapshot,
  buildHopDongSnapshot,
} from "@/utils/snapshotBuilder";

export interface TaiKhoanLite {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

/** Các bản ghi master data đã khớp xong cho 1 dòng. */
export interface ResolvedRow {
  taiKhoanNo: TaiKhoanLite;
  taiKhoanCo: TaiKhoanLite;
  loaiGiaoDich: { ma: string; ten: string };
  nghiepVu: string;
  nghiepVuTen?: string;
  doiTuong?: DoiTuong;
  doiTuong2?: DoiTuong;
  duAn?: DuAn;
  boPhan?: BoPhan;
  doi?: BoPhan;
  nhanVien?: DoiTuong;
  sanPham?: SanPham;
  dongTien?: DongTien;
  khoanMuc?: KhoanMuc;
  hopDong?: HopDong;
  nhomKhuyenMai?: NhomKhuyenMai;
  nhomQuanLy?: NhomQuanLy;
}

export function buildDanhMucFromResolved(r: ResolvedRow): DanhMuc {
  const danhMuc: DanhMuc = {};

  danhMuc.taiKhoanNo = { ...r.taiKhoanNo };
  danhMuc.taiKhoanCo = { ...r.taiKhoanCo };
  danhMuc.loaiGiaoDich = { ...r.loaiGiaoDich };
  danhMuc.nghiepVu = { ma: r.nghiepVu, ten: r.nghiepVuTen || r.nghiepVu };

  if (r.doiTuong) danhMuc.doiTuong = buildDoiTuongSnapshot(r.doiTuong) as DanhMuc["doiTuong"];
  if (r.doiTuong2) danhMuc.doiTuong2 = buildDoiTuongSnapshot(r.doiTuong2) as DanhMuc["doiTuong2"];
  if (r.duAn) danhMuc.duAn = buildDuAnSnapshot(r.duAn) as DanhMuc["duAn"];
  if (r.boPhan) danhMuc.boPhan = buildBoPhanSnapshot(r.boPhan) as DanhMuc["boPhan"];
  if (r.doi) danhMuc.doi = buildDoiSnapshot(r.doi) as DanhMuc["doi"];
  if (r.nhanVien) danhMuc.nhanVien = buildNhanVienSnapshot(r.nhanVien) as DanhMuc["nhanVien"];
  if (r.sanPham) danhMuc.sanPham = buildSanPhamSnapshot(r.sanPham) as DanhMuc["sanPham"];
  if (r.dongTien) danhMuc.dongTien = buildDongTienSnapshot(r.dongTien) as DanhMuc["dongTien"];
  if (r.khoanMuc) danhMuc.khoanMuc = buildKhoanMucSnapshot(r.khoanMuc) as DanhMuc["khoanMuc"];
  if (r.hopDong) danhMuc.hopDong = buildHopDongSnapshot(r.hopDong) as DanhMuc["hopDong"];
  if (r.nhomKhuyenMai) danhMuc.nhomKhuyenMai = buildNhomKhuyenMaiSnapshot(r.nhomKhuyenMai) as DanhMuc["nhomKhuyenMai"];
  if (r.nhomQuanLy) danhMuc.nhomQuanLy = buildNhomQuanLySnapshot(r.nhomQuanLy) as DanhMuc["nhomQuanLy"];

  return danhMuc;
}
```

> NOTE: `DanhMuc` không có field `hopDong` trong entity gốc nhưng FE `@/types` có (submit handler dùng `danhMuc.hopDong`). Nếu `tsc` báo thiếu field, kiểm tra `fe/src/types` — submit.handler hiện đã gán `danhMuc.hopDong` nên type FE đã hỗ trợ.

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/buildDanhMucFromRow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/lib/buildDanhMucFromRow.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/buildDanhMucFromRow.test.ts
git commit -m "feat(fe): buildDanhMucFromResolved - dựng danhMuc từ bản ghi đã khớp"
```

---

## Task 8: FE — validate & dựng item (`validate.ts`) — phần lõi

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/validate.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `__tests__/validate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateAndBuild, ImportMasterData } from "../validate";
import { RawImportRow } from "../columns";

const masterData: ImportMasterData = {
  taiKhoanList: [
    { ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" },
    { ma: "511", ten: "Doanh thu", loai: "DT", nhom: "B" },
  ],
  loaiGiaoDichList: [{ id: "1", ma: "PHIEU_THU", ten: "Phiếu thu" }] as ImportMasterData["loaiGiaoDichList"],
  quyChuanList: [{ id: "q1", loaiGiaoDich: "PHIEU_THU", nghiepVu: "NV01", taiKhoanNo: "111", taiKhoanCo: "511" }] as ImportMasterData["quyChuanList"],
  doiTuongList: [{ id: "dt1", ma: "KH001", ten: "KH A" }] as ImportMasterData["doiTuongList"],
  duAnList: [],
  boPhanList: [],
  sanPhamList: [],
  dongTienList: [],
  khoanMucList: [],
  hopDongList: [],
  nhomKhuyenMaiList: [],
  nhomQuanLyList: [],
};

function row(over: Partial<RawImportRow> = {}): RawImportRow {
  return {
    rowNumber: 2,
    ngay: "01/06/2026",
    loaiGiaoDich: "PHIEU_THU",
    nghiepVu: "NV01",
    taiKhoanNo: "111",
    taiKhoanCo: "511",
    soTien: "1000",
    ...over,
  };
}

describe("validateAndBuild", () => {
  it("dòng hợp lệ → item dựng đủ, không lỗi", () => {
    const res = validateAndBuild([row()], masterData);
    expect(res.hasErrors).toBe(false);
    expect(res.validItems).toHaveLength(1);
    const item = res.validItems[0];
    expect(item.loai).toBe("PHIEU_THU");
    expect(item.ngay).toBe("2026-06-01");
    expect(item.soTien).toBe(1000);
    expect(item.danhMuc?.taiKhoanNo?.ma).toBe("111");
    expect(item.danhMuc?.nghiepVu?.ma).toBe("NV01");
  });

  it("thiếu trường bắt buộc → lỗi, không tạo item", () => {
    const res = validateAndBuild([row({ taiKhoanNo: "" })], masterData);
    expect(res.hasErrors).toBe(true);
    expect(res.results[0].errors.some((e) => e.field === "taiKhoanNo")).toBe(true);
    expect(res.results[0].item).toBeNull();
    expect(res.validItems).toHaveLength(0);
  });

  it("ngày sai định dạng → lỗi", () => {
    const res = validateAndBuild([row({ ngay: "2026-06-01" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "ngay")).toBe(true);
  });

  it("số tiền <= 0 → lỗi", () => {
    const res = validateAndBuild([row({ soTien: "0" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "soTien")).toBe(true);
  });

  it("mã tài khoản không tồn tại → lỗi", () => {
    const res = validateAndBuild([row({ taiKhoanNo: "999" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "taiKhoanNo")).toBe(true);
  });

  it("loại giao dịch không tồn tại → lỗi", () => {
    const res = validateAndBuild([row({ loaiGiaoDich: "XXX" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "loaiGiaoDich")).toBe(true);
  });

  it("nghiệp vụ không thuộc loại giao dịch → lỗi", () => {
    const md2 = { ...masterData, loaiGiaoDichList: [...masterData.loaiGiaoDichList, { id: "2", ma: "PHIEU_CHI", ten: "Phiếu chi" }] as ImportMasterData["loaiGiaoDichList"] };
    const res = validateAndBuild([row({ loaiGiaoDich: "PHIEU_CHI" })], md2);
    expect(res.results[0].errors.some((e) => e.field === "nghiepVu")).toBe(true);
  });

  it("TK Nợ = TK Có → cảnh báo, vẫn tạo item", () => {
    const res = validateAndBuild([row({ taiKhoanCo: "111" })], masterData);
    expect(res.results[0].warnings.some((w) => w.field === "taiKhoanCo")).toBe(true);
    expect(res.results[0].errors).toHaveLength(0);
    expect(res.validItems).toHaveLength(1);
  });

  it("chiều phân bổ có mã nhưng không tồn tại → lỗi", () => {
    const res = validateAndBuild([row({ doiTuong: "KHONG_CO" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "doiTuong")).toBe(true);
  });

  it("chiều phân bổ khớp mã → vào danhMuc", () => {
    const res = validateAndBuild([row({ doiTuong: "KH001" })], masterData);
    expect(res.hasErrors).toBe(false);
    expect(res.validItems[0].danhMuc?.doiTuong?.ma).toBe("KH001");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`
Expected: FAIL — module `../validate` không tồn tại.

- [ ] **Step 3: Cài đặt**

Create `validate.ts`:

```typescript
import {
  DoiTuong, DuAn, BoPhan, SanPham, DongTien, NhomKhuyenMai, NhomQuanLy, HopDong, LoaiGiaoDich, QuyChuan,
} from "@/types";
import { CreateEntryDto, LoaiChungTu } from "@/services/nhatKyChungService";
import { RawImportRow, RowError, RowValidationResult, ValidateResult, IMPORT_COLUMNS } from "./columns";
import { normalizeAmount, normalizeDate } from "./normalize";
import { buildDanhMucFromResolved, TaiKhoanLite, ResolvedRow } from "./buildDanhMucFromRow";

export interface KhoanMucLite {
  id: string;
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
}

export interface ImportMasterData {
  taiKhoanList: TaiKhoanLite[];
  loaiGiaoDichList: LoaiGiaoDich[];
  quyChuanList: QuyChuan[];
  doiTuongList: DoiTuong[];
  duAnList: DuAn[];
  boPhanList: BoPhan[];
  sanPhamList: SanPham[];
  dongTienList: DongTien[];
  khoanMucList: KhoanMucLite[];
  hopDongList: HopDong[];
  nhomKhuyenMaiList: NhomKhuyenMai[];
  nhomQuanLyList: NhomQuanLy[];
}

/** Suy loai PHIEU_THU/PHIEU_CHI từ mã loại giao dịch (giống submit.handler). */
function deriveLoai(loaiGiaoDich: string): LoaiChungTu {
  return loaiGiaoDich === "PHIEU_CHI" || loaiGiaoDich === "BAO_NO" ? "PHIEU_CHI" : "PHIEU_THU";
}

const labelOf = (key: string) => IMPORT_COLUMNS.find((c) => c.key === key)?.header ?? key;

export function validateAndBuild(
  rows: RawImportRow[],
  md: ImportMasterData,
): ValidateResult {
  const results: RowValidationResult[] = rows.map((row) => validateRow(row, md));
  const validItems = results.map((r) => r.item).filter((i): i is CreateEntryDto => i !== null);
  const hasErrors = results.some((r) => r.errors.length > 0);
  return { results, validItems, hasErrors };
}

function validateRow(row: RawImportRow, md: ImportMasterData): RowValidationResult {
  const errors: RowError[] = [];
  const warnings: RowError[] = [];

  // 1. Bắt buộc
  IMPORT_COLUMNS.filter((c) => c.required).forEach((c) => {
    if (!row[c.key] || String(row[c.key]).trim() === "") {
      errors.push({ field: c.key, message: `${c.header} không được trống` });
    }
  });

  // 2. Ngày
  const ngay = normalizeDate(row.ngay);
  if (row.ngay && !ngay) {
    errors.push({ field: "ngay", message: "Ngày sai định dạng (DD/MM/YYYY)" });
  }

  // 3. Số tiền
  const soTien = normalizeAmount(row.soTien);
  if (row.soTien && (soTien === null || soTien <= 0)) {
    errors.push({ field: "soTien", message: "Số tiền phải là số > 0" });
  }

  // 4. Loại giao dịch
  const lgd = md.loaiGiaoDichList.find((x) => x.ma === row.loaiGiaoDich);
  if (row.loaiGiaoDich && !lgd) {
    errors.push({ field: "loaiGiaoDich", message: `Loại giao dịch '${row.loaiGiaoDich}' không tồn tại` });
  }

  // 5. Nghiệp vụ (phải thuộc loại giao dịch)
  let quyChuan: QuyChuan | undefined;
  if (row.nghiepVu) {
    quyChuan = md.quyChuanList.find(
      (q) => q.nghiepVu === row.nghiepVu && q.loaiGiaoDich === row.loaiGiaoDich,
    );
    if (!quyChuan) {
      errors.push({
        field: "nghiepVu",
        message: `Nghiệp vụ '${row.nghiepVu}' không tồn tại hoặc không thuộc loại giao dịch '${row.loaiGiaoDich}'`,
      });
    }
  }

  // 6. TK Nợ / Có
  const tkNo = md.taiKhoanList.find((t) => t.ma === row.taiKhoanNo);
  if (row.taiKhoanNo && !tkNo) {
    errors.push({ field: "taiKhoanNo", message: `TK Nợ '${row.taiKhoanNo}' không tồn tại` });
  }
  const tkCo = md.taiKhoanList.find((t) => t.ma === row.taiKhoanCo);
  if (row.taiKhoanCo && !tkCo) {
    errors.push({ field: "taiKhoanCo", message: `TK Có '${row.taiKhoanCo}' không tồn tại` });
  }
  if (tkNo && tkCo && row.taiKhoanNo === row.taiKhoanCo) {
    warnings.push({ field: "taiKhoanCo", message: "TK Nợ và TK Có giống nhau" });
  }

  // 7. Các chiều phân bổ (chỉ kiểm khi có điền)
  const doiTuong = resolveOptional(row.doiTuong, md.doiTuongList, "ma", errors, "doiTuong");
  const doiTuong2 = resolveOptional(row.doiTuong2, md.doiTuongList, "ma", errors, "doiTuong2");
  const duAn = resolveOptional(row.duAn, md.duAnList, "ma", errors, "duAn");
  const boPhan = resolveOptional(row.boPhan, md.boPhanList, "ma", errors, "boPhan");
  const doi = resolveOptional(row.doi, md.boPhanList, "ma", errors, "doi");
  const nhanVien = resolveOptional(row.nhanVien, md.doiTuongList, "ma", errors, "nhanVien");
  const sanPham = resolveOptional(row.sanPham, md.sanPhamList, "ma", errors, "sanPham");
  const dongTien = resolveOptional(row.dongTien, md.dongTienList, "ma", errors, "dongTien");
  const khoanMuc = resolveOptional(row.khoanMuc, md.khoanMucList, "ma", errors, "khoanMuc");
  const hopDong = resolveOptional(row.hopDong, md.hopDongList, "soHopDong", errors, "hopDong");
  const nhomKhuyenMai = resolveOptional(row.nhomKhuyenMai, md.nhomKhuyenMaiList, "ma", errors, "nhomKhuyenMai");
  const nhomQuanLy = resolveOptional(row.nhomQuanLy, md.nhomQuanLyList, "ma", errors, "nhomQuanLy");

  if (errors.length > 0) {
    return { rowNumber: row.rowNumber, errors, warnings, item: null };
  }

  // Dựng item (đã chắc chắn các trường bắt buộc hợp lệ)
  const resolved: ResolvedRow = {
    taiKhoanNo: tkNo as TaiKhoanLite,
    taiKhoanCo: tkCo as TaiKhoanLite,
    loaiGiaoDich: { ma: lgd!.ma, ten: lgd!.ten },
    nghiepVu: row.nghiepVu as string,
    nghiepVuTen: row.nghiepVu,
    doiTuong, doiTuong2, duAn, boPhan, doi, nhanVien, sanPham, dongTien,
    khoanMuc: khoanMuc as ResolvedRow["khoanMuc"], hopDong, nhomKhuyenMai, nhomQuanLy,
  };

  const item: CreateEntryDto = {
    loai: deriveLoai(row.loaiGiaoDich as string),
    ngay: ngay as string,
    soTien: soTien as number,
    noiDung: row.dienGiai || "",
    nguoiGiaoDich: row.nguoiGiaoDich,
    diaChi: row.diaChi,
    ghiChu: row.ghiChu,
    danhMuc: buildDanhMucFromResolved(resolved),
  };

  return { rowNumber: row.rowNumber, errors, warnings, item };
}

/** Tìm bản ghi theo field khóa; nếu có điền mã mà không tìm thấy thì push lỗi. */
function resolveOptional<T>(
  code: string | undefined,
  list: T[],
  keyField: keyof T,
  errors: RowError[],
  fieldName: string,
): T | undefined {
  if (!code || code.trim() === "") return undefined;
  const found = list.find((x) => String(x[keyField]) === code);
  if (!found) {
    errors.push({ field: fieldName, message: `${labelOf(fieldName)} '${code}' không tồn tại` });
    return undefined;
  }
  return found;
}
```

> NOTE về types: nếu `LoaiGiaoDich` / `DoiTuong` / ... ở `@/types` thiếu field dùng trong test (vd `ten`, `ma`), kiểm tra type thật trong `fe/src/types/index.ts` và điều chỉnh mock test cho khớp (KHÔNG nới lỏng type sản phẩm). `QuyChuan` đã có `{ id, loaiGiaoDich, nghiepVu, taiKhoanNo, taiKhoanCo, moTa? }` (xem `fe/src/types/index.ts:539`).

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/lib/validate.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts
git commit -m "feat(fe): validateAndBuild - validate dòng import + dựng item"
```

---

## Task 9: FE — file mẫu (`template.ts`) + service `importEntries`

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts`
- Modify: `fe/src/services/nhatKyChungService.ts`

- [ ] **Step 1: Viết test thất bại cho template**

Create `__tests__/template.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildTemplateAoa } from "../template";
import { IMPORT_COLUMNS } from "../columns";

describe("buildTemplateAoa", () => {
  it("dòng đầu là header đúng thứ tự cột", () => {
    const aoa = buildTemplateAoa();
    expect(aoa[0]).toEqual(IMPORT_COLUMNS.map((c) => c.header));
  });
  it("có ít nhất 1 dòng ví dụ mẫu", () => {
    const aoa = buildTemplateAoa();
    expect(aoa.length).toBeGreaterThanOrEqual(2);
    expect(aoa[1].length).toBe(IMPORT_COLUMNS.length);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Cài đặt template + hàm tải**

Create `template.ts`:

```typescript
import * as XLSX from "xlsx";
import { IMPORT_COLUMNS } from "./columns";

/** Tạo array-of-arrays cho file mẫu: header + 1 dòng ví dụ. */
export function buildTemplateAoa(): string[][] {
  const header = IMPORT_COLUMNS.map((c) => c.header);
  const example: Record<string, string> = {
    ngay: "01/06/2026",
    loaiGiaoDich: "PHIEU_THU",
    nghiepVu: "NV01",
    taiKhoanNo: "111",
    taiKhoanCo: "511",
    soTien: "1000000",
    dienGiai: "Ví dụ: thu tiền bán hàng",
  };
  const exampleRow = IMPORT_COLUMNS.map((c) => example[c.key] ?? "");
  return [header, exampleRow];
}

/** Xuất file mẫu .xlsx và tải về. */
export function downloadTemplate(fileName = "mau-import-nhat-ky-chung"): void {
  const aoa = buildTemplateAoa();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NhatKyChung");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
```

- [ ] **Step 4: Chạy test template, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts`
Expected: PASS

- [ ] **Step 5: Thêm method service `importEntries`**

Trong `fe/src/services/nhatKyChungService.ts`, thêm vào class `NhatKyChungService` (sau `createBatch`):

```typescript
  /**
   * Import nhiều chứng từ: mỗi item là 1 chứng từ độc lập (số phiếu riêng).
   */
  async importEntries(items: CreateEntryDto[]): Promise<NhatKyChung[]> {
    const response = await this.post<ChungTuResponse[]>(items, { endpoint: '/import' });
    return response.map((item) => this.mapChungTuToNhatKyChung(item));
  }
```

- [ ] **Step 6: Type-check FE**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i "import/lib\|nhatKyChungService" | head`
Expected: không có lỗi ở các file vừa sửa.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts fe/src/services/nhatKyChungService.ts
git commit -m "feat(fe): file mẫu import + service importEntries"
```

---

## Task 10: FE — Import handler (CHanlder pattern)

State + handler chính + 3 sub-handler (load master data, parse, submit). Tham chiếu mẫu: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/` và `init.handler.ts` (load master data).

**Files:**
- Create: `import/import.state.ts`, `import/import.handler.ts`, `import/ImportHandlerContext.tsx`, `import/sub-handler/index.ts`, `import/sub-handler/load-master-data/*`, `import/sub-handler/parse/*`, `import/sub-handler/submit/*`

- [ ] **Step 1: State**

Create `import/import.state.ts`:

```typescript
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { ImportMasterData } from "./lib/validate";
import { RowValidationResult } from "./lib/columns";
import { CreateEntryDto } from "@/services/nhatKyChungService";

export interface ImportStates extends BaseStates {
  open: boolean;
  masterDataLoaded: boolean;
  loadingMasterData: boolean;
  parsing: boolean;
  submitting: boolean;
  fileName: string;
  masterData: ImportMasterData | null;
  results: RowValidationResult[];
  validItems: CreateEntryDto[];
  hasErrors: boolean;
  parsed: boolean; // đã có kết quả xem trước chưa
}
```

- [ ] **Step 2: Handler chính + events**

Create `import/import.handler.ts`:

```typescript
import { CHanlder } from "@/common";
import "./sub-handler";
import { ImportStates } from "./import.state";

export interface ImportEvents {}

export class ImportHandler extends CHanlder<ImportEvents, ImportStates> {
  constructor() {
    super("nhat-ky-chung-import");
  }
}
```

- [ ] **Step 3: Context + Provider + hooks**

Create `import/ImportHandlerContext.tsx` (theo mẫu `NhatKyChungFormHandlerContext.tsx`):

```tsx
import { createContext, useContext, useRef, ReactNode } from "react";
import { ImportHandler } from "./import.handler";
import { useHanlderState } from "@/common";

const ImportHandlerContext = createContext<ImportHandler | null>(null);

export function ImportHandlerProvider({ children }: { children: ReactNode }) {
  const ref = useRef<ImportHandler | null>(null);
  if (!ref.current) ref.current = new ImportHandler();
  return (
    <ImportHandlerContext.Provider value={ref.current}>
      {children}
    </ImportHandlerContext.Provider>
  );
}

export function useImportHandler(): ImportHandler {
  const ctx = useContext(ImportHandlerContext);
  if (!ctx) throw new Error("useImportHandler must be used within ImportHandlerProvider");
  return ctx;
}

export function useImportState<K extends keyof import("./import.state").ImportStates>(
  key: K,
  defaultValue: import("./import.state").ImportStates[K],
) {
  const handler = useImportHandler();
  return useHanlderState(handler, key, defaultValue);
}
```

> NOTE: kiểm tra cách `NhatKyChungFormHandlerContext.tsx` import hook state (tên export `useHanlderState` hoặc tương đương trong `@/common`) và bắt chước CHÍNH XÁC; nếu khác tên, dùng đúng tên đó.

- [ ] **Step 4: sub-handler/index.ts**

Create `import/sub-handler/index.ts`:

```typescript
import "./load-master-data/load-master-data.handler";
import "./parse/parse.handler";
import "./submit/submit.handler";
```

- [ ] **Step 5: load-master-data**

Create `import/sub-handler/load-master-data/load-master-data.event.ts`:

```typescript
import { BaseEvents } from "@/common";

export interface LoadMasterDataEvent extends BaseEvents {
  loadMasterData: { params: Record<string, never>; result: void };
}

declare module "../../import.handler" {
  interface ImportEvents extends LoadMasterDataEvent {}
}
```

Create `import/sub-handler/load-master-data/load-master-data.handler.ts` (gọi đúng các service như `init.handler.ts`):

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { taiKhoanService } from "@/services/taiKhoanService";
import { khoanMucService } from "@/services/khoanMucService";
import { doiTuongService } from "@/services/doiTuongService";
import { duAnService } from "@/services/duAnService";
import { boPhanService } from "@/services/boPhanService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { quyChauanService } from "@/services/quyChaunService";
import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { hopDongService } from "@/services/hopDongService";
import "./load-master-data.event";
import { ImportEvents } from "../../import.handler";
import { ImportStates } from "../../import.state";
import { ImportMasterData } from "../../lib/validate";

@RegisterHandler("nhat-ky-chung-import")
export class LoadMasterDataHandler extends CSubHanlder<ImportEvents, ImportStates> {
  @HandlerDecorator("loadMasterData")
  async loadMasterData(): Promise<void> {
    if (this.getState("masterDataLoaded")) return;
    this.setState("loadingMasterData", true);
    try {
      const [
        taiKhoanLeaf, khoanMucRes, doiTuong, duAn, boPhan, sanPham, dongTien,
        quyChuan, nhomKhuyenMai, nhomQuanLy, loaiGiaoDich, hopDong,
      ] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        khoanMucService.getPaginated({ limit: 500 }),
        doiTuongService.getAll(),
        duAnService.getAll(),
        boPhanService.getAll(),
        sanPhamService.getAll(),
        dongTienService.getAll(),
        quyChauanService.getAll(),
        nhomKhuyenMaiService.getAll(),
        nhomQuanLyService.getAll(),
        loaiGiaoDichService.getAll(),
        hopDongService.getAll(),
      ]);

      const masterData: ImportMasterData = {
        taiKhoanList: taiKhoanLeaf.map((tk) => ({ ma: tk.ma, ten: tk.ten, loai: tk.loai, nhom: tk.nhom })),
        khoanMucList: khoanMucRes.data.map((km) => ({ id: km.id, ma: km.ma, ten: km.ten, loai: km.loai, nhom: km.nhom })),
        doiTuongList: doiTuong,
        duAnList: duAn,
        boPhanList: boPhan,
        sanPhamList: sanPham,
        dongTienList: dongTien,
        quyChuanList: quyChuan,
        nhomKhuyenMaiList: nhomKhuyenMai,
        nhomQuanLyList: nhomQuanLy,
        loaiGiaoDichList: loaiGiaoDich,
        hopDongList: hopDong,
      };
      this.setState("masterData", masterData);
      this.setState("masterDataLoaded", true);
    } catch (e) {
      console.error("Lỗi load master data import:", e);
    } finally {
      this.setState("loadingMasterData", false);
    }
  }
}
```

- [ ] **Step 6: parse**

Create `import/sub-handler/parse/parse.event.ts`:

```typescript
import { BaseEvents } from "@/common";

export interface ParseEvent extends BaseEvents {
  parseFile: { params: { file: File }; result: void };
  resetImport: { params: Record<string, never>; result: void };
}

declare module "../../import.handler" {
  interface ImportEvents extends ParseEvent {}
}
```

Create `import/sub-handler/parse/parse.handler.ts`:

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import * as XLSX from "xlsx";
import { message } from "antd";
import "./parse.event";
import { ImportEvents } from "../../import.handler";
import { ImportStates } from "../../import.state";
import { aoaToRawRows } from "../../lib/parseRows";
import { validateAndBuild, ImportMasterData } from "../../lib/validate";

@RegisterHandler("nhat-ky-chung-import")
export class ParseHandler extends CSubHanlder<ImportEvents, ImportStates> {
  @HandlerDecorator("parseFile")
  async parseFile(params: { file: File }): Promise<void> {
    const md = this.getState("masterData") as ImportMasterData | null;
    if (!md) {
      message.error("Chưa tải xong danh mục, vui lòng thử lại");
      return;
    }
    this.setState("parsing", true);
    try {
      const buffer = await params.file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });

      const rows = aoaToRawRows(aoa as unknown[][]);
      if (rows.length === 0) {
        message.warning("File không có dòng dữ liệu");
      }
      const { results, validItems, hasErrors } = validateAndBuild(rows, md);

      this.setState("fileName", params.file.name);
      this.setState("results", results);
      this.setState("validItems", validItems);
      this.setState("hasErrors", hasErrors);
      this.setState("parsed", true);
    } catch (e) {
      console.error("Lỗi đọc file Excel:", e);
      message.error("Không đọc được file Excel. Kiểm tra lại định dạng.");
    } finally {
      this.setState("parsing", false);
    }
  }

  @HandlerDecorator("resetImport")
  async resetImport(): Promise<void> {
    this.setState("fileName", "");
    this.setState("results", []);
    this.setState("validItems", []);
    this.setState("hasErrors", false);
    this.setState("parsed", false);
  }
}
```

- [ ] **Step 7: submit**

Create `import/sub-handler/submit/submit.event.ts`:

```typescript
import { BaseEvents } from "@/common";

export interface SubmitImportEvent extends BaseEvents {
  submitImport: { params: { onSuccess?: () => void }; result: void };
}

declare module "../../import.handler" {
  interface ImportEvents extends SubmitImportEvent {}
}
```

Create `import/sub-handler/submit/submit.handler.ts`:

```typescript
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import "./submit.event";
import { ImportEvents } from "../../import.handler";
import { ImportStates } from "../../import.state";
import { nhatKyChungService, CreateEntryDto } from "@/services/nhatKyChungService";

@RegisterHandler("nhat-ky-chung-import")
export class SubmitImportHandler extends CSubHanlder<ImportEvents, ImportStates> {
  @HandlerDecorator("submitImport")
  async submitImport(params: { onSuccess?: () => void }): Promise<void> {
    const hasErrors = this.getState("hasErrors") as boolean;
    const items = (this.getState("validItems") as CreateEntryDto[]) || [];
    if (hasErrors) {
      message.error("Còn dòng lỗi, vui lòng sửa file trước khi import");
      return;
    }
    if (items.length === 0) {
      message.warning("Không có dòng hợp lệ để import");
      return;
    }
    this.setState("submitting", true);
    try {
      const saved = await nhatKyChungService.importEntries(items);
      message.success(`Đã import ${saved.length} chứng từ`);
      this.setState("open", false);
      this.setState("parsed", false);
      this.setState("results", []);
      this.setState("validItems", []);
      this.setState("fileName", "");
      params.onSuccess?.();
    } catch (e) {
      const err = e as { message?: string };
      message.error(err.message || "Import thất bại");
    } finally {
      this.setState("submitting", false);
    }
  }
}
```

- [ ] **Step 8: Type-check FE**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i "import/" | head -30`
Expected: không có lỗi trong thư mục `import/`. Sửa import path / tên hook cho khớp `@/common` nếu cần (đối chiếu file form-handler).

- [ ] **Step 9: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/import.state.ts fe/src/pages/chung-tu/nhat-ky-chung/import/import.handler.ts fe/src/pages/chung-tu/nhat-ky-chung/import/ImportHandlerContext.tsx fe/src/pages/chung-tu/nhat-ky-chung/import/sub-handler
git commit -m "feat(fe): import handler + sub-handlers (load/parse/submit)"
```

---

## Task 11: FE — UI modal (upload + preview)

**Files:**
- Create: `import/components/UploadStep.tsx`, `import/components/PreviewTable.tsx`, `import/ImportExcelModal.tsx`

- [ ] **Step 1: UploadStep**

Create `import/components/UploadStep.tsx`:

```tsx
import { Button, Upload, Space, Typography } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useImportHandler, useImportState } from "../ImportHandlerContext";
import { downloadTemplate } from "../lib/template";

const { Text } = Typography;

export function UploadStep() {
  const handler = useImportHandler();
  const [parsing] = useImportState("parsing", false);
  const [loadingMasterData] = useImportState("loadingMasterData", false);
  const [fileName] = useImportState("fileName", "");

  const uploadProps: UploadProps = {
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: (file) => {
      handler.executeEvent("parseFile", { file });
      return false; // chặn upload tự động
    },
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Space>
        <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate()}>
          Tải file mẫu
        </Button>
        <Upload {...uploadProps}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={parsing || loadingMasterData}
            disabled={loadingMasterData}
          >
            Chọn file Excel
          </Button>
        </Upload>
        {fileName && <Text type="secondary">{fileName}</Text>}
      </Space>
      <Text type="secondary">
        Mỗi dòng = 1 chứng từ. Cột 1–6 bắt buộc. Khớp danh mục theo mã. File còn lỗi sẽ không import được.
      </Text>
    </Space>
  );
}
```

- [ ] **Step 2: PreviewTable**

Create `import/components/PreviewTable.tsx`:

```tsx
import { Table, Tag, Alert, Tooltip } from "antd";
import { useImportState } from "../ImportHandlerContext";
import { RowValidationResult } from "../lib/columns";

export function PreviewTable() {
  const [results] = useImportState("results", [] as RowValidationResult[]);
  const [parsed] = useImportState("parsed", false);

  if (!parsed) return null;

  const errorCount = results.filter((r) => r.errors.length > 0).length;
  const okCount = results.length - errorCount;
  const warnCount = results.filter((r) => r.warnings.length > 0).length;

  const columns = [
    { title: "Dòng", dataIndex: "rowNumber", key: "rowNumber", width: 70 },
    {
      title: "Trạng thái",
      key: "status",
      width: 110,
      render: (_: unknown, r: RowValidationResult) =>
        r.errors.length > 0 ? <Tag color="red">Lỗi</Tag> : <Tag color="green">Hợp lệ</Tag>,
    },
    {
      title: "Chi tiết",
      key: "detail",
      render: (_: unknown, r: RowValidationResult) => (
        <div>
          {r.errors.map((e, i) => (
            <div key={`e${i}`} style={{ color: "#cf1322" }}>• {e.message}</div>
          ))}
          {r.warnings.map((w, i) => (
            <div key={`w${i}`} style={{ color: "#d46b08" }}>⚠ {w.message}</div>
          ))}
          {r.errors.length === 0 && r.warnings.length === 0 && (
            <span style={{ color: "#389e0d" }}>OK</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <Alert
        type={errorCount > 0 ? "error" : "success"}
        showIcon
        message={
          <Tooltip title={`${warnCount} dòng có cảnh báo`}>
            {`Hợp lệ: ${okCount} • Lỗi: ${errorCount} • Cảnh báo: ${warnCount}`}
          </Tooltip>
        }
        style={{ marginBottom: 12 }}
      />
      <Table
        size="small"
        rowKey="rowNumber"
        dataSource={results}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ y: 360 }}
        rowClassName={(r) => (r.errors.length > 0 ? "import-row-error" : "")}
      />
    </div>
  );
}
```

- [ ] **Step 3: Modal**

Create `import/ImportExcelModal.tsx`:

```tsx
import { useEffect } from "react";
import { Modal, Button } from "antd";
import { ImportHandlerProvider, useImportHandler, useImportState } from "./ImportHandlerContext";
import { UploadStep } from "./components/UploadStep";
import { PreviewTable } from "./components/PreviewTable";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

function ImportExcelModalInner({ open, onClose, onImported }: Props) {
  const handler = useImportHandler();
  const [hasErrors] = useImportState("hasErrors", false);
  const [parsed] = useImportState("parsed", false);
  const [submitting] = useImportState("submitting", false);
  const [validItems] = useImportState("validItems", []);

  useEffect(() => {
    if (open) {
      handler.setState("open", true);
      handler.executeEvent("loadMasterData", {});
    }
  }, [open, handler]);

  const handleClose = () => {
    handler.executeEvent("resetImport", {});
    onClose();
  };

  const handleImport = () => {
    handler.executeEvent("submitImport", {
      onSuccess: () => {
        onImported?.();
        onClose();
      },
    });
  };

  const canImport = parsed && !hasErrors && validItems.length > 0;

  return (
    <Modal
      title="Import Nhật ký chung từ Excel"
      open={open}
      onCancel={handleClose}
      width={840}
      footer={[
        <Button key="cancel" onClick={handleClose}>Đóng</Button>,
        <Button
          key="import"
          type="primary"
          disabled={!canImport}
          loading={submitting}
          onClick={handleImport}
        >
          {`Import ${validItems.length} chứng từ`}
        </Button>,
      ]}
    >
      <UploadStep />
      <PreviewTable />
    </Modal>
  );
}

export function ImportExcelModal(props: Props) {
  return (
    <ImportHandlerProvider>
      <ImportExcelModalInner {...props} />
    </ImportHandlerProvider>
  );
}
```

- [ ] **Step 4: CSS tô đỏ dòng lỗi (tùy chọn, dùng class có sẵn nếu repo có)**

Thêm vào file CSS của trang (tìm file `.css` mà `EntryListTab`/page import; nếu không rõ, thêm inline style đã có ở PreviewTable là đủ — bước này có thể bỏ qua). Nếu thêm, dùng:

```css
.import-row-error > td { background-color: #fff1f0; }
```

- [ ] **Step 5: Type-check FE**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i "import/" | head -30`
Expected: không lỗi ở thư mục `import/`.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/import/ImportExcelModal.tsx fe/src/pages/chung-tu/nhat-ky-chung/import/components
git commit -m "feat(fe): UI modal import (upload + preview)"
```

---

## Task 12: FE — gắn nút "Import Excel" vào danh sách + verify thủ công

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`

- [ ] **Step 1: Thêm state mở modal + import component**

Đầu file `EntryListTab.tsx`, thêm import:

```typescript
import { ImportExcelModal } from "../../import/ImportExcelModal";
```

Trong component (gần các `useState` khác của `EntryListTab`), thêm:

```typescript
const [importOpen, setImportOpen] = useState(false);
```

(Nếu `useState` chưa được import thì thêm vào dòng import React.)

- [ ] **Step 2: Thêm nút vào toolbar**

Trong khối `<div className="excel-toolbar">`, ngay sau nút "Thêm mới" (khối `{canCreate && (...)}`), thêm:

```tsx
        {canCreate && (
          <Button
            size="small"
            icon={<FileExcelOutlined />}
            onClick={() => setImportOpen(true)}
          >
            Import Excel
          </Button>
        )}
```

(`FileExcelOutlined` đã được import sẵn — dùng cho nút "Xuất Excel".)

- [ ] **Step 3: Render modal**

Ngay trước thẻ đóng `</div>` cuối của `return` (sau `<Table ... />`), thêm:

```tsx
      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() =>
          handler.executeEvent("loadPage", {
            page: pagination?.page || 1,
            limit: pagination?.limit || 50,
          })
        }
      />
```

- [ ] **Step 4: Build FE**

Run: `cd fe && npm run build 2>&1 | tail -20`
Expected: build thành công.

- [ ] **Step 5: Chạy toàn bộ test lib import**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import`
Expected: tất cả PASS.

- [ ] **Step 6: Verify thủ công**

Chạy `cd fe && npm run dev` và `cd be && yarn start:all:dev` (hoặc môi trường dev hiện có). Đăng nhập tài khoản role `KE_TOAN_QUY`/`KE_TOAN_TRUONG`/`ADMIN`. Mở **Chứng từ → Nhật ký chung**:
  - Bấm **Import Excel** → modal mở.
  - Bấm **Tải file mẫu** → tải được `mau-import-nhat-ky-chung.xlsx`, header đúng 22 cột.
  - Điền 2–3 dòng hợp lệ (dùng mã TK/nghiệp vụ/loại GD thật trong hệ thống) + 1 dòng sai mã → chọn file.
  - Bảng xem trước hiện đúng: dòng sai tô đỏ + lý do; nút Import bị disable.
  - Sửa file cho sạch → chọn lại → nút Import bật → bấm Import → thông báo "Đã import N chứng từ", danh sách reload và thấy chứng từ mới (mỗi dòng 1 số phiếu khác nhau).

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx
git commit -m "feat(fe): nút Import Excel + modal vào trang Nhật ký chung"
```

---

## Self-Review Checklist (đã rà)

- **Spec coverage:** Đầy đủ cột (Task 4) ✓; mỗi dòng = 1 chứng từ + số phiếu riêng (Task 1, 2) ✓; xem trước + chặn lỗi (Task 8, 11) ✓; nút tải file mẫu (Task 9, 11) ✓; khớp theo mã (Task 8) ✓; Hướng A FE-parse (Task 4–11) ✓; TK Nợ=Có cảnh báo (Task 8) ✓; số phiếu theo năm hiện tại giữ nguyên (Task 1) ✓.
- **Type consistency:** `CreateEntryDto`, `ImportMasterData`, `RawImportRow`, `RowValidationResult`, `ResolvedRow`, `validateAndBuild`, `buildDanhMucFromResolved`, `importEntries` dùng nhất quán giữa các task.
- **Điểm cần chú ý khi thực thi:** (1) tên hook state trong `@/common` — bắt chước `NhatKyChungFormHandlerContext.tsx`; (2) field types thật trong `fe/src/types` (DoiTuong/DuAn/...) — chỉnh mock test cho khớp, không nới type sản phẩm; (3) `hopDong` khớp theo `soHopDong` (không phải `ma`).
- **Ngoài phạm vi (YAGNI):** không gom theo cột số phiếu, không tự tạo danh mục, không import nền/bất đồng bộ.
