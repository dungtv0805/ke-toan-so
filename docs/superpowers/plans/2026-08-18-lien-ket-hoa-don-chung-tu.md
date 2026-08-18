# Liên kết hóa đơn ↔ chứng từ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kế toán gán số hóa đơn ngay khi hạch toán ở Dữ liệu tổng hợp, bảng kê thuế mua vào/bán ra tự có dòng tương ứng — không phải nhập lại lần thứ hai.

**Architecture:** Hóa đơn chỉ lưu một chỗ (`bang_ke_mua_vao` / `bang_ke_ban_ra` của `tax-service`), nối với chứng từ bằng **số phiếu** trong cột `soChungTu` đã có sẵn. Chứng từ không giữ bản sao nào của thông tin hóa đơn, nên không có bài toán đồng bộ hai chiều giữa hai service. Điều phối ghi đặt ở FE (lưu chứng từ xong mới ghi hóa đơn) để lỗi báo thẳng cho người đang nhập thay vì bị `ServiceClient` nuốt.

**Tech Stack:** NestJS 11 + TypeORM/MongoDB (BE), React 18 + antd + CHanlder (FE), jest (BE), vitest (FE).

**Spec:** `docs/superpowers/specs/2026-08-18-lien-ket-hoa-don-chung-tu-design.md`

## Global Constraints

- **`voucher-service` không sửa một dòng nào.** Toàn bộ thay đổi BE nằm trong `be/apps/tax-service`.
- Khóa liên kết là **số phiếu** (`soChungTu`), không phải id. Cột `chungTuId` có sẵn trong entity để nguyên, không dùng.
- Xóa chứng từ **chỉ gỡ link**, không bao giờ xóa dòng bảng kê.
- Dòng `choBoSung = true` **không được cộng vào Tổng hợp thuế**.
- Bảng Dữ liệu tổng hợp **chỉ được thêm đúng một cột "HĐ"** — khách yêu cầu rõ không để bảng này quá nhiều cột.
- Node không có sẵn trong PATH của shell không tương tác. Mỗi lệnh test/build phải mở đầu bằng:
  `export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"`
- Baseline đỏ sẵn: BE `yarn test` fail sẵn 13 suite, FE `tsc` có sẵn ~395 dòng lỗi (chủ yếu `src/mock-data`). **Luôn chạy hẹp theo file**, đừng lấy toàn bộ suite làm thước đo.
- BE test: `cd be && npx jest <đường-dẫn>`. FE test: `cd fe && npx vitest run <đường-dẫn>`.

---

## File Structure

**Backend — `be/`**

| File | Trách nhiệm |
|---|---|
| `libs/entities/src/tax/bang-ke-mua-vao.entity.ts` (sửa) | thêm cột `choBoSung` |
| `libs/entities/src/tax/bang-ke-ban-ra.entity.ts` (sửa) | thêm cột `choBoSung` |
| `apps/tax-service/src/shared/tax-helpers.ts` (sửa) | 4 hàm thuần: lọc theo liên kết, tắt cờ chờ bổ sung, gom theo số chứng từ, tách chuỗi số chứng từ |
| `apps/tax-service/src/shared/tax-helpers.lien-ket.spec.ts` (tạo) | test cho 4 hàm trên |
| `apps/tax-service/src/bang-ke-mua-vao/dto/*.ts` (sửa) | nhận `choBoSung`; query nhận `soChungTu`, `lienKet` |
| `apps/tax-service/src/bang-ke-ban-ra/dto/*.ts` (sửa) | như trên |
| `apps/tax-service/src/bang-ke-*/bang-ke-*.service.ts` (sửa) | lọc theo liên kết, `findBySoChungTu`, tắt cờ khi cập nhật đủ số |
| `apps/tax-service/src/bang-ke-*/bang-ke-*.controller.ts` (sửa) | route `GET theo-chung-tu` |
| `apps/tax-service/src/bang-ke-*/bang-ke-*.lien-ket.spec.ts` (tạo) | test service phần liên kết |
| `apps/tax-service/src/bao-cao/bao-cao.service.ts` (sửa) | bỏ dòng `choBoSung` khỏi tổng hợp, đếm để nhắc |
| `apps/tax-service/src/bao-cao/tax-calc.ts` + `.spec.ts` (sửa) | hàm thuần lọc dòng chưa đủ thông tin |

**Frontend — `fe/`**

| File | Trách nhiệm |
|---|---|
| `src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.ts` (tạo) | hàm thuần: suy loại hóa đơn, dựng dòng nháp, cộng tổng thanh toán |
| `src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.test.ts` (tạo) | test cho file trên |
| `src/services/taxService.ts` (sửa) | tìm hóa đơn chưa liên kết, lấy theo nhiều số chứng từ, gắn/gỡ |
| `src/pages/chung-tu/nhat-ky-chung/form-components/form-header/HoaDonField.tsx` (tạo) | ô "Hóa đơn" — file riêng để `FormHeader.tsx` không phình |
| `src/pages/chung-tu/nhat-ky-chung/form-components/form-header/FormHeader.tsx` (sửa) | nhúng `HoaDonField` |
| `src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/init.state.ts` (sửa) | `ChungTuHeader.hoaDon` |
| `src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/init.handler.ts` (sửa) | nạp hóa đơn đã gắn khi mở chứng từ cũ |
| `src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/submit/submit.handler.ts` (sửa) | ghi liên kết sau khi lưu chứng từ |
| `src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx` (sửa) | cột "HĐ" |
| `src/pages/thue/components/BangKePage.tsx` (sửa) | cột "Chứng từ", nhãn, bộ lọc, nút gắn/gỡ |
| `src/pages/thue/components/GanChungTuModal.tsx` (tạo) | modal tìm & chọn chứng từ để gắn |

---

## Task 1: Cột `choBoSung` + 4 hàm thuần dùng chung (BE)

**Files:**
- Modify: `be/libs/entities/src/tax/bang-ke-mua-vao.entity.ts`
- Modify: `be/libs/entities/src/tax/bang-ke-ban-ra.entity.ts`
- Modify: `be/apps/tax-service/src/shared/tax-helpers.ts`
- Test: `be/apps/tax-service/src/shared/tax-helpers.lien-ket.spec.ts` (tạo)

**Interfaces:**
- Consumes: không có (task đầu tiên)
- Produces:
  - `export type LienKetFilter = 'da' | 'chua' | 'cho-bo-sung'`
  - `export function locTheoLienKet<T extends { soChungTu?: string; choBoSung?: boolean }>(items: T[], loc?: LienKetFilter): T[]`
  - `export function nenTatChoBoSung(v: { giaTriChuaThue?: number; tienThue?: number }): boolean`
  - `export function gomTheoSoChungTu<T extends { soChungTu?: string }>(items: T[]): Record<string, T[]>`
  - `export function tachDanhSachSoChungTu(q?: string): string[]`
  - Entity: `choBoSung?: boolean` trên cả `BangKeMuaVao` và `BangKeBanRa`

- [ ] **Step 1: Viết test đỏ**

Tạo `be/apps/tax-service/src/shared/tax-helpers.lien-ket.spec.ts`:

```ts
import {
  locTheoLienKet,
  nenTatChoBoSung,
  gomTheoSoChungTu,
  tachDanhSachSoChungTu,
} from './tax-helpers';

const hd = (over: Record<string, unknown> = {}) =>
  ({ soChungTu: undefined, choBoSung: false, ...over }) as {
    soChungTu?: string;
    choBoSung?: boolean;
  };

describe('locTheoLienKet', () => {
  const items = [
    hd({ soChungTu: 'PC0001' }),
    hd({}),
    hd({ soChungTu: 'PC0002', choBoSung: true }),
  ];

  it('không truyền bộ lọc thì giữ nguyên cả danh sách', () => {
    expect(locTheoLienKet(items)).toHaveLength(3);
  });

  it('"da" chỉ giữ dòng đã có số chứng từ', () => {
    expect(locTheoLienKet(items, 'da').map((i) => i.soChungTu)).toEqual([
      'PC0001',
      'PC0002',
    ]);
  });

  it('"chua" chỉ giữ dòng chưa liên kết', () => {
    expect(locTheoLienKet(items, 'chua')).toHaveLength(1);
  });

  it('"cho-bo-sung" giữ dòng chờ bổ sung, kể cả khi đã liên kết', () => {
    expect(locTheoLienKet(items, 'cho-bo-sung')).toHaveLength(1);
  });

  it('coi chuỗi rỗng và khoảng trắng là CHƯA liên kết', () => {
    expect(locTheoLienKet([hd({ soChungTu: '   ' })], 'chua')).toHaveLength(1);
    expect(locTheoLienKet([hd({ soChungTu: '   ' })], 'da')).toHaveLength(0);
  });
});

describe('nenTatChoBoSung', () => {
  it('có giá trị chưa thuế thì hết chờ bổ sung', () => {
    expect(nenTatChoBoSung({ giaTriChuaThue: 1_000_000 })).toBe(true);
  });

  it('chỉ có tiền thuế cũng đủ (hóa đơn điều chỉnh chỉ ghi thuế)', () => {
    expect(nenTatChoBoSung({ giaTriChuaThue: 0, tienThue: 50_000 })).toBe(true);
  });

  it('cả hai bằng 0 thì vẫn là chờ bổ sung', () => {
    expect(nenTatChoBoSung({ giaTriChuaThue: 0, tienThue: 0 })).toBe(false);
    expect(nenTatChoBoSung({})).toBe(false);
  });
});

describe('gomTheoSoChungTu', () => {
  it('gom các hóa đơn cùng số chứng từ về một khóa', () => {
    const map = gomTheoSoChungTu([
      hd({ soChungTu: 'PC0001' }),
      hd({ soChungTu: 'PC0001' }),
      hd({ soChungTu: 'PC0002' }),
    ]);
    expect(map['PC0001']).toHaveLength(2);
    expect(map['PC0002']).toHaveLength(1);
  });

  it('bỏ qua dòng chưa liên kết — không tạo khóa rỗng', () => {
    expect(gomTheoSoChungTu([hd({}), hd({ soChungTu: '' })])).toEqual({});
  });
});

describe('tachDanhSachSoChungTu', () => {
  it('tách theo dấu phẩy, bỏ khoảng trắng và phần tử rỗng', () => {
    expect(tachDanhSachSoChungTu(' PC0001, PC0002 ,,PC0003 ')).toEqual([
      'PC0001',
      'PC0002',
      'PC0003',
    ]);
  });

  it('không truyền gì thì ra mảng rỗng', () => {
    expect(tachDanhSachSoChungTu()).toEqual([]);
    expect(tachDanhSachSoChungTu('')).toEqual([]);
  });

  it('bỏ trùng lặp — 20 dòng cùng một số phiếu chỉ hỏi một lần', () => {
    expect(tachDanhSachSoChungTu('PC0001,PC0001')).toEqual(['PC0001']);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx jest apps/tax-service/src/shared/tax-helpers.lien-ket.spec.ts
```

Kỳ vọng: FAIL — `locTheoLienKet is not a function`.

- [ ] **Step 3: Thêm 4 hàm vào `tax-helpers.ts`**

Nối vào cuối `be/apps/tax-service/src/shared/tax-helpers.ts`:

```ts
/** Bộ lọc trạng thái liên kết của một dòng bảng kê. */
export type LienKetFilter = 'da' | 'chua' | 'cho-bo-sung';

const daLienKet = (soChungTu?: string): boolean => Boolean(soChungTu?.trim());

/** Lọc bảng kê theo trạng thái liên kết chứng từ. Không truyền → giữ nguyên. */
export function locTheoLienKet<
  T extends { soChungTu?: string; choBoSung?: boolean },
>(items: T[], loc?: LienKetFilter): T[] {
  if (!loc) return items;
  if (loc === 'da') return items.filter((i) => daLienKet(i.soChungTu));
  if (loc === 'chua') return items.filter((i) => !daLienKet(i.soChungTu));
  return items.filter((i) => i.choBoSung === true);
}

/**
 * Dòng nháp sinh từ màn chứng từ mang số tiền 0. Khi kế toán thuế điền số vào
 * thì cờ chờ bổ sung phải tự tắt — bắt họ bấm thêm một nút nữa thì sẽ có dòng
 * đủ số nhưng vẫn nằm ngoài báo cáo.
 */
export function nenTatChoBoSung(v: {
  giaTriChuaThue?: number;
  tienThue?: number;
}): boolean {
  return (Number(v.giaTriChuaThue) || 0) > 0 || (Number(v.tienThue) || 0) > 0;
}

/** Gom hóa đơn theo số chứng từ. Dòng chưa liên kết bị bỏ qua. */
export function gomTheoSoChungTu<T extends { soChungTu?: string }>(
  items: T[],
): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.soChungTu?.trim();
    if (!key) continue;
    (map[key] ??= []).push(item);
  }
  return map;
}

/** "PC0001, PC0002" → ['PC0001','PC0002']. Bỏ trùng và phần tử rỗng. */
export function tachDanhSachSoChungTu(q?: string): string[] {
  if (!q) return [];
  return [...new Set(q.split(',').map((s) => s.trim()).filter(Boolean))];
}
```

- [ ] **Step 4: Thêm cột `choBoSung` vào 2 entity**

Trong `be/libs/entities/src/tax/bang-ke-mua-vao.entity.ts` và `bang-ke-ban-ra.entity.ts`,
thêm ngay dưới dòng `soChungTu`:

```ts
  // Dòng nháp sinh từ màn chứng từ: mới có số hóa đơn, chưa có số tiền.
  // KHÔNG được cộng vào Tổng hợp thuế cho tới khi kế toán thuế điền đủ.
  @Column({ default: false }) choBoSung?: boolean;
```

Đồng thời sửa chú thích cột `chungTuId` thành `// không dùng — liên kết đi theo soChungTu (số phiếu)`.

- [ ] **Step 5: Chạy test, xác nhận xanh**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx jest apps/tax-service/src/shared/tax-helpers.lien-ket.spec.ts
```

Kỳ vọng: PASS, 12 test.

- [ ] **Step 6: Commit**

```bash
git add be/libs/entities/src/tax be/apps/tax-service/src/shared
git commit -m "feat(thue): cột choBoSung + hàm thuần lọc/gom theo liên kết chứng từ"
```

---

## Task 2: DTO nhận `choBoSung`, query nhận `soChungTu` + `lienKet` (BE)

**Files:**
- Modify: `be/apps/tax-service/src/bang-ke-mua-vao/dto/create-bang-ke-mua-vao.dto.ts`
- Modify: `be/apps/tax-service/src/bang-ke-mua-vao/dto/bang-ke-mua-vao-query.dto.ts`
- Modify: `be/apps/tax-service/src/bang-ke-ban-ra/dto/create-bang-ke-ban-ra.dto.ts`
- Modify: `be/apps/tax-service/src/bang-ke-ban-ra/dto/bang-ke-ban-ra-query.dto.ts`
- Test: `be/apps/tax-service/src/bang-ke-mua-vao/dto/lien-ket.dto.spec.ts` (tạo)

**Interfaces:**
- Consumes: `LienKetFilter` (Task 1)
- Produces: `CreateBangKeMuaVaoDto.choBoSung?: boolean`, `BangKeMuaVaoQueryDto.soChungTu?: string`, `BangKeMuaVaoQueryDto.lienKet?: LienKetFilter` (và bộ tương ứng bên bán ra)

- [ ] **Step 1: Viết test đỏ**

Tạo `be/apps/tax-service/src/bang-ke-mua-vao/dto/lien-ket.dto.spec.ts`:

```ts
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBangKeMuaVaoDto, BangKeMuaVaoQueryDto } from './index';

const base = {
  ngayHoaDon: '2026-06-01',
  soHoaDon: '0000123',
  tenNguoiBan: 'Cty A',
  giaTriChuaThue: 0,
  thueSuat: '10',
};

describe('CreateBangKeMuaVaoDto — dòng nháp từ chứng từ', () => {
  it('giá trị 0 + choBoSung true là hợp lệ', async () => {
    const dto = plainToInstance(CreateBangKeMuaVaoDto, {
      ...base,
      choBoSung: true,
      soChungTu: 'PC0001',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('choBoSung sai kiểu thì báo lỗi', async () => {
    const dto = plainToInstance(CreateBangKeMuaVaoDto, {
      ...base,
      choBoSung: 'co',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'choBoSung')).toBe(true);
  });
});

describe('BangKeMuaVaoQueryDto — lọc theo liên kết', () => {
  it('nhận soChungTu và lienKet hợp lệ', async () => {
    const dto = plainToInstance(BangKeMuaVaoQueryDto, {
      soChungTu: 'PC0001',
      lienKet: 'chua',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('lienKet ngoài 3 giá trị cho phép thì báo lỗi', async () => {
    const dto = plainToInstance(BangKeMuaVaoQueryDto, { lienKet: 'linh tinh' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'lienKet')).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx jest apps/tax-service/src/bang-ke-mua-vao/dto/lien-ket.dto.spec.ts
```

Kỳ vọng: FAIL ở test `choBoSung sai kiểu` (chưa có validator nên không báo lỗi) và test `lienKet ngoài 3 giá trị`.

- [ ] **Step 3: Sửa DTO create (cả hai bên)**

Trong `create-bang-ke-mua-vao.dto.ts`: thêm `IsBoolean` vào import từ `class-validator`, rồi thêm cuối class:

```ts
  // Dòng nháp gắn từ màn chứng từ. FE đặt true khi tạo, service tự tắt khi có số.
  @IsBoolean()
  @IsOptional()
  choBoSung?: boolean;
```

Làm y hệt cho `create-bang-ke-ban-ra.dto.ts`.

- [ ] **Step 4: Sửa DTO query (cả hai bên)**

Trong `bang-ke-mua-vao-query.dto.ts`, thêm `IsString`, `IsIn` vào import rồi thêm:

```ts
  @IsOptional()
  @IsString()
  soChungTu?: string;

  @IsOptional()
  @IsIn(['da', 'chua', 'cho-bo-sung'])
  lienKet?: 'da' | 'chua' | 'cho-bo-sung';
```

Làm y hệt cho `bang-ke-ban-ra-query.dto.ts`.

- [ ] **Step 5: Chạy test, xác nhận xanh**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx jest apps/tax-service/src/bang-ke-mua-vao apps/tax-service/src/bang-ke-ban-ra
```

Kỳ vọng: PASS toàn bộ, kể cả 2 file `*.import.spec.ts` đang có sẵn.

- [ ] **Step 6: Commit**

```bash
git add be/apps/tax-service/src/bang-ke-mua-vao/dto be/apps/tax-service/src/bang-ke-ban-ra/dto
git commit -m "feat(thue): DTO bảng kê nhận choBoSung, query lọc theo soChungTu/lienKet"
```

---

## Task 3: Service + route `theo-chung-tu` (BE)

**Files:**
- Modify: `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.service.ts`
- Modify: `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.controller.ts`
- Modify: `be/apps/tax-service/src/bang-ke-ban-ra/bang-ke-ban-ra.service.ts`
- Modify: `be/apps/tax-service/src/bang-ke-ban-ra/bang-ke-ban-ra.controller.ts`
- Test: `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.lien-ket.spec.ts` (tạo)

**Interfaces:**
- Consumes: `locTheoLienKet`, `nenTatChoBoSung`, `gomTheoSoChungTu`, `tachDanhSachSoChungTu` (Task 1); DTO của Task 2
- Produces:
  - `BangKeMuaVaoService.findBySoChungTu(list: string[]): Promise<Record<string, BangKeMuaVao[]>>`
  - `GET /tax/bang-ke-mua-vao/theo-chung-tu?soChungTu=PC0001,PC0002` → `{ success: true, data: Record<string, BangKe[]> }`
  - `GET /tax/bang-ke-ban-ra/theo-chung-tu?...` — y hệt

- [ ] **Step 1: Viết test đỏ**

Tạo `be/apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.lien-ket.spec.ts`:

```ts
import { BangKeMuaVaoService } from './bang-ke-mua-vao.service';

type AnyRepo = { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };

function makeService(existing: unknown[] = []) {
  const repo: AnyRepo = {
    create: jest.fn((o) => ({ ...o })),
    save: jest.fn(async (e) => e),
    find: jest.fn(async () => existing),
    findOne: jest.fn(async () => existing[0]),
  };
  const tenantContext = { getCurrentTenantId: () => 'tenant-1' };
  const service = new BangKeMuaVaoService(repo as never, tenantContext as never);
  return { service, repo };
}

// findOne() dựng `new ObjectId(id)` nên id phải là 24 ký tự hex, không được đặt tùy.
const ID_HEX = '6650a1b2c3d4e5f60718293a';

const row = (over: Record<string, unknown> = {}) => ({
  ngayHoaDon: new Date('2026-06-01'),
  soHoaDon: '001',
  tenNguoiBan: 'Cty A',
  giaTriChuaThue: 1000,
  thueSuat: '10',
  tienThue: 100,
  tongThanhToan: 1100,
  isActive: true,
  ...over,
});

describe('findAllPaginated — lọc theo liên kết', () => {
  it('lienKet="chua" chỉ trả dòng chưa gắn chứng từ', async () => {
    const { service } = makeService([
      row({ soChungTu: 'PC0001' }),
      row({ soHoaDon: '002' }),
    ]);
    const res = await service.findAllPaginated({ lienKet: 'chua' } as never);
    expect(res.data.map((i) => i.soHoaDon)).toEqual(['002']);
  });

  it('soChungTu lọc đúng một chứng từ', async () => {
    const { service } = makeService([
      row({ soChungTu: 'PC0001' }),
      row({ soHoaDon: '002', soChungTu: 'PC0002' }),
    ]);
    const res = await service.findAllPaginated({ soChungTu: 'PC0002' } as never);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].soHoaDon).toBe('002');
  });
});

describe('findBySoChungTu', () => {
  it('gom hóa đơn theo từng số chứng từ được hỏi', async () => {
    const { service } = makeService([
      row({ soChungTu: 'PC0001' }),
      row({ soHoaDon: '002', soChungTu: 'PC0001' }),
      row({ soHoaDon: '003', soChungTu: 'PC0009' }),
    ]);
    const map = await service.findBySoChungTu(['PC0001']);
    expect(Object.keys(map)).toEqual(['PC0001']);
    expect(map['PC0001']).toHaveLength(2);
  });

  it('danh sách rỗng thì không gọi DB', async () => {
    const { service, repo } = makeService([]);
    expect(await service.findBySoChungTu([])).toEqual({});
    expect(repo.find).not.toHaveBeenCalled();
  });
});

describe('update — cờ chờ bổ sung', () => {
  it('điền giá trị vào dòng nháp thì cờ tự tắt', async () => {
    const { service } = makeService([row({ choBoSung: true, giaTriChuaThue: 0, tienThue: 0 })]);
    const saved = await service.update(ID_HEX, { giaTriChuaThue: 5_000_000 } as never);
    expect(saved.choBoSung).toBe(false);
  });

  it('sửa ghi chú mà chưa có số thì vẫn là chờ bổ sung', async () => {
    const { service } = makeService([row({ choBoSung: true, giaTriChuaThue: 0, tienThue: 0 })]);
    const saved = await service.update(ID_HEX, { ghiChu: 'chờ NCC gửi' } as never);
    expect(saved.choBoSung).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx jest apps/tax-service/src/bang-ke-mua-vao/bang-ke-mua-vao.lien-ket.spec.ts
```

Kỳ vọng: FAIL — `service.findBySoChungTu is not a function`.

- [ ] **Step 3: Sửa service (làm cho cả mua vào và bán ra)**

Trong `bang-ke-mua-vao.service.ts`:

Thêm vào import từ `../shared/tax-helpers`: `locTheoLienKet`, `nenTatChoBoSung`, `gomTheoSoChungTu`.

Trong `findAllPaginated`, ngay sau khối lọc `search`:

```ts
    if (query.soChungTu) {
      items = items.filter((i) => i.soChungTu === query.soChungTu);
    }
    items = locTheoLienKet(items, query.lienKet);
```

Thêm method mới:

```ts
  /**
   * Hóa đơn của nhiều chứng từ trong một lần gọi — bảng Dữ liệu tổng hợp cần
   * đếm hóa đơn cho cả trang, hỏi từng dòng thì 20 dòng là 20 request.
   */
  async findBySoChungTu(
    list: string[],
  ): Promise<Record<string, BangKeMuaVao[]>> {
    if (!list?.length) return {};
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    const can = new Set(list);
    const items = all.filter(
      (i) => i.isActive !== false && i.soChungTu && can.has(i.soChungTu),
    );
    return gomTheoSoChungTu(items);
  }
```

Trong `update`, ngay trước `return this.repo.save(item)`:

```ts
    // Dòng nháp đã được điền số thì hết "chờ bổ sung" — xem nenTatChoBoSung.
    if (item.choBoSung && nenTatChoBoSung(item)) item.choBoSung = false;
```

Lặp lại y hệt trong `bang-ke-ban-ra.service.ts` (đổi kiểu trả về thành `BangKeBanRa`).

- [ ] **Step 4: Thêm route vào 2 controller**

Trong `bang-ke-mua-vao.controller.ts`, thêm **NGAY TRƯỚC** `@Get(':id')` — Nest khớp route theo
thứ tự khai báo, đặt sau thì `theo-chung-tu` sẽ bị `:id` nuốt và trả 404/500:

```ts
  @Get('theo-chung-tu')
  @Roles(...KE_TOAN_ROLES)
  async theoChungTu(@Query('soChungTu') soChungTu?: string) {
    const data = await this.service.findBySoChungTu(
      tachDanhSachSoChungTu(soChungTu),
    );
    return { success: true, data };
  }
```

Import `tachDanhSachSoChungTu` từ `../shared/tax-helpers`. Lặp lại cho `bang-ke-ban-ra.controller.ts`.

- [ ] **Step 5: Chạy test, xác nhận xanh**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx jest apps/tax-service
```

Kỳ vọng: PASS toàn bộ tax-service.

- [ ] **Step 6: Build kiểm tra biên dịch**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx nest build tax-service
```

Kỳ vọng: `compiled successfully`.

- [ ] **Step 7: Commit**

```bash
git add be/apps/tax-service
git commit -m "feat(thue): lọc bảng kê theo liên kết + route theo-chung-tu"
```

---

## Task 4: Tổng hợp thuế bỏ dòng chờ bổ sung (BE)

**Files:**
- Modify: `be/apps/tax-service/src/bao-cao/tax-calc.ts`
- Modify: `be/apps/tax-service/src/bao-cao/tax-calc.spec.ts`
- Modify: `be/apps/tax-service/src/bao-cao/bao-cao.service.ts`

**Interfaces:**
- Consumes: cột `choBoSung` (Task 1)
- Produces: `export function boDongChoBoSung<T extends { choBoSung?: boolean }>(items: T[]): T[]`; trường mới trong kết quả `tongHop`: `soHoaDonChoBoSung: number`

- [ ] **Step 1: Viết test đỏ**

Nối vào `be/apps/tax-service/src/bao-cao/tax-calc.spec.ts`:

```ts
import { boDongChoBoSung } from './tax-calc';

describe('boDongChoBoSung', () => {
  it('loại dòng chưa đủ thông tin ra khỏi tính thuế', () => {
    const items = [
      { tienThue: 100, choBoSung: false },
      { tienThue: 0, choBoSung: true },
      { tienThue: 50 },
    ];
    expect(boDongChoBoSung(items)).toHaveLength(2);
  });

  it('danh sách rỗng thì trả rỗng', () => {
    expect(boDongChoBoSung([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx jest apps/tax-service/src/bao-cao/tax-calc.spec.ts
```

Kỳ vọng: FAIL — không export `boDongChoBoSung`.

- [ ] **Step 3: Thêm hàm vào `tax-calc.ts`**

```ts
/**
 * Bỏ dòng bảng kê chưa đủ thông tin (sinh từ màn chứng từ, số tiền còn 0).
 * Cộng vào thì báo cáo thiếu thuế mà nhìn vẫn bình thường.
 */
export function boDongChoBoSung<T extends { choBoSung?: boolean }>(
  items: T[],
): T[] {
  return items.filter((i) => i.choBoSung !== true);
}
```

- [ ] **Step 4: Dùng trong `bao-cao.service.ts`**

Trong `tongHop`, sau khi đã lọc `muaVao` / `banRa` theo kỳ:

```ts
    const muaVaoDayDu = boDongChoBoSung(muaVao);
    const banRaDayDu = boDongChoBoSung(banRa);
    const soHoaDonChoBoSung =
      muaVao.length - muaVaoDayDu.length + (banRa.length - banRaDayDu.length);

    const vatDauVao = tongVatTheoKy(muaVaoDayDu);
    const vatDauRa = tongVatTheoKy(banRaDayDu);
```

(xóa 2 dòng `const vatDauVao/vatDauRa` cũ) và thêm `soHoaDonChoBoSung` vào object trả về,
ngay sau `vatConKhauTru`. Import `boDongChoBoSung` từ `./tax-calc`.

- [ ] **Step 5: Chạy test + build**

```bash
cd be && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx jest apps/tax-service && npx nest build tax-service
```

Kỳ vọng: PASS + `compiled successfully`.

- [ ] **Step 6: Hiện lời nhắc trên trang Tổng hợp thuế**

Trong `fe/src/pages/thue/tong-hop/TongHopThuePage.tsx`, thêm `soHoaDonChoBoSung?: number` vào
kiểu `TongHopThue` (`fe/src/services/taxService.ts`) và render ngay trên khối số liệu:

```tsx
{(data?.soHoaDonChoBoSung ?? 0) > 0 && (
  <Alert
    type="warning"
    showIcon
    className="mb-3"
    message={`Còn ${data.soHoaDonChoBoSung} hóa đơn chưa đủ thông tin trong kỳ — chưa được tính vào số thuế`}
    action={<Link to="/thue/bang-ke-mua-vao">Mở bảng kê</Link>}
  />
)}
```

Không có dòng nhắc này thì số thuế thiếu mà báo cáo nhìn vẫn bình thường — đây là chỗ dễ
gây sai số nhất của cả tính năng.

- [ ] **Step 7: Commit**

```bash
git add be/apps/tax-service/src/bao-cao fe/src/pages/thue/tong-hop fe/src/services/taxService.ts
git commit -m "feat(thue): tổng hợp thuế bỏ hóa đơn chưa đủ thông tin + nhắc trên trang tổng hợp"
```

---

## Task 5: Hàm thuần phía FE + `taxService` (FE)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.ts`
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.test.ts`
- Modify: `fe/src/services/taxService.ts`

**Interfaces:**
- Consumes: route `theo-chung-tu` + query `lienKet` (Task 2, 3)
- Produces:
  - `export type LoaiHoaDon = 'mua' | 'ban'`
  - `export interface HoaDonGan { id?: string; soHoaDon: string; loai: LoaiHoaDon; tongThanhToan?: number }`
  - `export function suyLoaiHoaDon(loaiGiaoDich?: string): LoaiHoaDon`
  - `export function tongThanhToanHoaDon(list: HoaDonGan[]): number`
  - `export function dungDongNhap(args: { soHoaDon: string; loai: LoaiHoaDon; ngayChungTu: string; soChungTu: string; doiTuongTen?: string; doiTuongMst?: string }): Partial<BangKeRecord>` — kiểu trả về phải là `Partial<BangKeRecord>` vì Task 7 truyền thẳng vào `service.create(payload: Partial<BangKeRecord>)`
  - `bangKeMuaVaoService.timChuaLienKet(search: string)`, `.layTheoSoChungTu(list: string[])`, `.ganChungTu(id, soChungTu)`, `.goLienKet(id)` — có trên cả `bangKeBanRaService`

- [ ] **Step 1: Viết test đỏ**

Tạo `fe/src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  suyLoaiHoaDon,
  tongThanhToanHoaDon,
  dungDongNhap,
  type HoaDonGan,
} from './hoaDonLienKet';

describe('suyLoaiHoaDon', () => {
  it('phiếu chi / báo nợ là tiền ra → hóa đơn mua vào', () => {
    expect(suyLoaiHoaDon('PHIEU_CHI')).toBe('mua');
    expect(suyLoaiHoaDon('BAO_NO')).toBe('mua');
  });

  it('phiếu thu / báo có là tiền vào → hóa đơn bán ra', () => {
    expect(suyLoaiHoaDon('PHIEU_THU')).toBe('ban');
    expect(suyLoaiHoaDon('BAO_CO')).toBe('ban');
  });

  it('loại lạ hoặc chưa chọn thì mặc định mua vào — hóa đơn đầu vào nhiều hơn hẳn', () => {
    expect(suyLoaiHoaDon(undefined)).toBe('mua');
    expect(suyLoaiHoaDon('KHAC')).toBe('mua');
  });
});

describe('tongThanhToanHoaDon', () => {
  const hd = (over: Partial<HoaDonGan>): HoaDonGan => ({
    soHoaDon: '001',
    loai: 'mua',
    ...over,
  });

  it('cộng tổng thanh toán của các hóa đơn đã gắn', () => {
    expect(
      tongThanhToanHoaDon([
        hd({ tongThanhToan: 1_100_000 }),
        hd({ tongThanhToan: 2_200_000 }),
      ]),
    ).toBe(3_300_000);
  });

  it('hóa đơn mới gõ (chưa có số tiền) tính là 0, không ra NaN', () => {
    expect(tongThanhToanHoaDon([hd({}), hd({ tongThanhToan: 500 })])).toBe(500);
  });
});

describe('dungDongNhap', () => {
  const args = {
    soHoaDon: 'HD0001234',
    ngayChungTu: '2026-08-18',
    soChungTu: 'PC0001',
    doiTuongTen: 'Cty ABC',
    doiTuongMst: '0101243150',
  };

  it('hóa đơn mua vào điền tên/MST vào cặp trường người bán', () => {
    const row = dungDongNhap({ ...args, loai: 'mua' });
    expect(row).toMatchObject({
      soHoaDon: 'HD0001234',
      ngayHoaDon: '2026-08-18',
      soChungTu: 'PC0001',
      tenNguoiBan: 'Cty ABC',
      mstNguoiBan: '0101243150',
      giaTriChuaThue: 0,
      tienThue: 0,
      tongThanhToan: 0,
      choBoSung: true,
    });
    expect(row.tenNguoiMua).toBeUndefined();
  });

  it('hóa đơn bán ra điền vào cặp trường người mua', () => {
    const row = dungDongNhap({ ...args, loai: 'ban' });
    expect(row).toMatchObject({ tenNguoiMua: 'Cty ABC', mstNguoiMua: '0101243150' });
    expect(row.tenNguoiBan).toBeUndefined();
  });

  it('chứng từ chưa có đối tượng thì để "(Chưa xác định)" — BE bắt buộc trường tên', () => {
    const row = dungDongNhap({ ...args, loai: 'mua', doiTuongTen: undefined, doiTuongMst: undefined });
    expect(row.tenNguoiBan).toBe('(Chưa xác định)');
    expect(row.mstNguoiBan).toBeUndefined();
  });

  it('luôn đặt thuế suất mặc định 10 để BE không rớt @IsIn', () => {
    expect(dungDongNhap({ ...args, loai: 'mua' }).thueSuat).toBe('10');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx vitest run src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.test.ts
```

Kỳ vọng: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết `hoaDonLienKet.ts`**

```ts
import type { BangKeRecord } from '@/services/taxService';

/** Hóa đơn thuộc bảng kê nào. */
export type LoaiHoaDon = 'mua' | 'ban';

/** Một hóa đơn đang gắn vào chứng từ trong form. `id` rỗng = chưa có bên bảng kê. */
export interface HoaDonGan {
  id?: string;
  soHoaDon: string;
  loai: LoaiHoaDon;
  tongThanhToan?: number;
}

/**
 * Gợi ý loại hóa đơn theo loại giao dịch. Tiền ra → mua vào, tiền vào → bán ra.
 * Người dùng đổi được; đây chỉ là giá trị mặc định để bớt một cú bấm.
 */
export function suyLoaiHoaDon(loaiGiaoDich?: string): LoaiHoaDon {
  return loaiGiaoDich === 'PHIEU_THU' || loaiGiaoDich === 'BAO_CO' ? 'ban' : 'mua';
}

export function tongThanhToanHoaDon(list: HoaDonGan[]): number {
  return list.reduce((s, h) => s + (Number(h.tongThanhToan) || 0), 0);
}

/**
 * Dòng bảng kê nháp sinh từ màn chứng từ: mới có số hóa đơn, chưa có số tiền.
 * `tenNguoiBan`/`tenNguoiMua` là trường BẮT BUỘC của DTO nên phải có giá trị —
 * chứng từ chưa chọn đối tượng thì để "(Chưa xác định)", dòng vẫn mang cờ
 * choBoSung nên kế toán thuế buộc phải sửa lại khi bổ sung.
 */
export function dungDongNhap(args: {
  soHoaDon: string;
  loai: LoaiHoaDon;
  ngayChungTu: string;
  soChungTu: string;
  doiTuongTen?: string;
  doiTuongMst?: string;
}): Partial<BangKeRecord> {
  const ten = args.doiTuongTen?.trim() || '(Chưa xác định)';
  const doiTac =
    args.loai === 'mua'
      ? { tenNguoiBan: ten, mstNguoiBan: args.doiTuongMst }
      : { tenNguoiMua: ten, mstNguoiMua: args.doiTuongMst };

  return {
    ngayHoaDon: args.ngayChungTu,
    soHoaDon: args.soHoaDon.trim(),
    ...doiTac,
    giaTriChuaThue: 0,
    thueSuat: '10',
    tienThue: 0,
    tongThanhToan: 0,
    choBoSung: true,
    soChungTu: args.soChungTu,
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx vitest run src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.test.ts
```

Kỳ vọng: PASS, 10 test.

- [ ] **Step 5: Thêm 4 hàm vào `taxService.ts`**

Thêm `soChungTu?: string` và `choBoSung?: boolean` vào `interface BangKeRecord`;
thêm `soChungTu?: string` và `lienKet?: 'da' | 'chua' | 'cho-bo-sung'` vào `interface BangKeQuery`.
Thêm vào `class BangKeService`:

```ts
  /** Hóa đơn chưa gắn chứng từ nào, dùng cho ô gợi ý ở form chứng từ. */
  async timChuaLienKet(search: string, limit = 20): Promise<BangKeRecord[]> {
    const res = await this.getPaginated({ search, lienKet: 'chua', limit });
    return res.data;
  }

  /** Hóa đơn của nhiều chứng từ trong một request — cho cột "HĐ" của bảng TH. */
  async layTheoSoChungTu(list: string[]): Promise<Record<string, BangKeRecord[]>> {
    if (!list.length) return {};
    const res = await this.get<Record<string, BangKeRecord[]>>({
      endpoint: '/theo-chung-tu',
      params: { soChungTu: [...new Set(list)].join(',') },
    });
    return res;
  }

  async ganChungTu(id: string, soChungTu: string): Promise<BangKeRecord> {
    return this.update(id, { soChungTu });
  }

  /** Gỡ liên kết — dòng bảng kê VẪN CÒN, chỉ mất số chứng từ. */
  async goLienKet(id: string): Promise<BangKeRecord> {
    return this.update(id, { soChungTu: '' });
  }
```

- [ ] **Step 6: Kiểm tra biên dịch**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "taxService|hoaDonLienKet"
```

Kỳ vọng: không in ra dòng nào.

- [ ] **Step 7: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.ts fe/src/pages/chung-tu/nhat-ky-chung/hoaDonLienKet.test.ts fe/src/services/taxService.ts
git commit -m "feat(thue): hàm thuần dựng dòng nháp + API liên kết hóa đơn phía FE"
```

---

## Task 6: Ô "Hóa đơn" trong form chứng từ (FE)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/form-components/form-header/HoaDonField.tsx`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-components/form-header/FormHeader.tsx`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/init.state.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/init.handler.ts`

**Interfaces:**
- Consumes: `HoaDonGan`, `suyLoaiHoaDon`, `tongThanhToanHoaDon` (Task 5); `bangKeMuaVaoService.timChuaLienKet`, `bangKeBanRaService.timChuaLienKet`, `layTheoSoChungTu` (Task 5)
- Produces: `ChungTuHeader.hoaDon?: HoaDonGan[]` — Task 7 đọc mảng này khi lưu

- [ ] **Step 1: Thêm trường vào state**

Trong `init.state.ts`, thêm vào `interface ChungTuHeader`:

```ts
  /** Hóa đơn gắn với chứng từ. Chỉ có số HĐ + loại; chi tiết nằm ở bảng kê. */
  hoaDon?: HoaDonGan[];
```

Import `HoaDonGan` từ `../../../hoaDonLienKet`.

- [ ] **Step 2: Viết `HoaDonField.tsx`**

```tsx
import { useState } from "react";
import { Select, Radio, Tag, Typography } from "antd";
import {
  bangKeMuaVaoService,
  bangKeBanRaService,
  type BangKeRecord,
} from "@/services/taxService";
import {
  suyLoaiHoaDon,
  tongThanhToanHoaDon,
  type HoaDonGan,
  type LoaiHoaDon,
} from "../../hoaDonLienKet";

const { Text } = Typography;
const fmt = (n: number) => n.toLocaleString("vi-VN");

interface Props {
  loaiGiaoDich?: string;
  soTienChungTu: number;
  value: HoaDonGan[];
  onChange: (v: HoaDonGan[]) => void;
}

/**
 * Ô gán hóa đơn cho chứng từ. CHỈ gán số hóa đơn — mọi thông tin chi tiết
 * (ký hiệu, MST, giá trị, thuế suất) chỉ nhập và chỉ hiển thị ở bảng kê.
 */
export function HoaDonField({ loaiGiaoDich, soTienChungTu, value, onChange }: Props) {
  const [loai, setLoai] = useState<LoaiHoaDon>(suyLoaiHoaDon(loaiGiaoDich));
  const [goiY, setGoiY] = useState<BangKeRecord[]>([]);
  const [dangTim, setDangTim] = useState(false);

  const service = loai === "mua" ? bangKeMuaVaoService : bangKeBanRaService;

  const handleSearch = async (text: string) => {
    if (!text.trim()) return setGoiY([]);
    setDangTim(true);
    try {
      setGoiY(await service.timChuaLienKet(text.trim()));
    } finally {
      setDangTim(false);
    }
  };

  // Chọn từ gợi ý → gắn hóa đơn có sẵn. Gõ số lạ → hóa đơn mới, lưu chứng từ
  // xong mới tạo dòng nháp bên bảng kê (xem submit.handler).
  const handleChange = (soList: string[]) => {
    const cu = new Map(value.map((h) => [h.soHoaDon, h]));
    onChange(
      soList.map((so) => {
        const daCo = cu.get(so);
        if (daCo) return daCo;
        const tim = goiY.find((g) => g.soHoaDon === so);
        return tim
          ? { id: tim.id, soHoaDon: so, loai, tongThanhToan: tim.tongThanhToan }
          : { soHoaDon: so, loai };
      }),
    );
  };

  const tong = tongThanhToanHoaDon(value);
  const lech = tong > 0 && Math.round(tong) !== Math.round(soTienChungTu);

  return (
    <div className="nkc-field w-full">
      <label className="nkc-label">Hóa đơn</label>
      <div className="flex gap-2 items-start">
        <Radio.Group
          size="small"
          value={loai}
          onChange={(e) => setLoai(e.target.value)}
          options={[
            { label: "Mua vào", value: "mua" },
            { label: "Bán ra", value: "ban" },
          ]}
          optionType="button"
        />
        <Select
          mode="tags"
          className="flex-1"
          size="small"
          placeholder="Gõ số hóa đơn — chọn từ gợi ý hoặc thêm mới"
          value={value.map((h) => h.soHoaDon)}
          onSearch={handleSearch}
          onChange={handleChange}
          loading={dangTim}
          filterOption={false}
          options={goiY.map((g) => ({
            value: g.soHoaDon,
            label: `${g.soHoaDon} — ${g.ngayHoaDon?.slice(0, 10)} — ${
              g.tenNguoiBan || g.tenNguoiMua || ""
            } — ${fmt(g.tongThanhToan || 0)} đ`,
          }))}
        />
      </div>
      {value.length > 0 && (
        <div className="mt-1">
          <Text type="secondary" className="text-xs">
            {value.length} hóa đơn, tổng {fmt(tong)} đ
          </Text>
          {lech && (
            <Tag color="warning" className="ml-2">
              Lệch với số tiền chứng từ ({fmt(soTienChungTu)} đ)
            </Tag>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Nhúng vào `FormHeader.tsx`**

Ngay sau khối "Diễn giải chung", trước thẻ đóng `</div>` cuối cùng:

```tsx
      <HoaDonField
        loaiGiaoDich={header?.loaiGiaoDich}
        soTienChungTu={tongTienChiTiet}
        value={header?.hoaDon || []}
        onChange={(v) => handleFieldChange("hoaDon", v)}
      />
```

Thêm import `HoaDonField` và lấy tổng tiền chi tiết để so lệch:

```tsx
  const [chiTietList] = useNhatKyChungFormState("chiTietList", []);
  const tongTienChiTiet = (chiTietList as { soTien?: number }[]).reduce(
    (s, ct) => s + (Number(ct.soTien) || 0),
    0,
  );
```

- [ ] **Step 4: Nạp hóa đơn đã gắn khi mở chứng từ cũ**

Trong `init.handler.ts`, ở nhánh nạp chứng từ theo `soPhieu`, sau khi đã set `header`:

```ts
      // Hóa đơn đã gắn nằm ở tax-service, không nằm trong chứng từ.
      const [muaVao, banRa] = await Promise.all([
        bangKeMuaVaoService.layTheoSoChungTu([soPhieu]),
        bangKeBanRaService.layTheoSoChungTu([soPhieu]),
      ]);
      const hoaDon: HoaDonGan[] = [
        ...(muaVao[soPhieu] || []).map((i) => ({
          id: i.id,
          soHoaDon: i.soHoaDon,
          loai: "mua" as const,
          tongThanhToan: i.tongThanhToan,
        })),
        ...(banRa[soPhieu] || []).map((i) => ({
          id: i.id,
          soHoaDon: i.soHoaDon,
          loai: "ban" as const,
          tongThanhToan: i.tongThanhToan,
        })),
      ];
      this.setState("header", { ...headerHienTai, hoaDon });
```

- [ ] **Step 5: Kiểm tra biên dịch + build**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "HoaDonField|FormHeader|init.handler|init.state"
```

Kỳ vọng: không in dòng nào.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung
git commit -m "feat(nkc): ô gán hóa đơn ở form chứng từ, nạp lại khi mở chứng từ cũ"
```

---

## Task 7: Ghi liên kết khi lưu chứng từ (FE)

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/submit/submit.handler.ts`

**Interfaces:**
- Consumes: `ChungTuHeader.hoaDon` (Task 6), `dungDongNhap` (Task 5), `bangKeMuaVaoService.ganChungTu/create` (Task 5)
- Produces: không có (điểm cuối luồng)

- [ ] **Step 1: Thêm method ghi hóa đơn vào `SubmitFormHandler`**

```ts
  /**
   * Ghi liên kết hóa đơn SAU KHI chứng từ đã lưu — chứng từ mới chưa có số phiếu
   * trước đó. Hai lần ghi vào hai service khác nhau, không có transaction chung:
   * hỏng bước này thì KHÔNG rollback chứng từ, báo để người nhập bấm lưu lại.
   */
  private async ghiHoaDon(soPhieu: string, header: ChungTuHeader): Promise<void> {
    const hoaDon = header.hoaDon || [];
    if (!hoaDon.length) return;

    const doiTuong = (this.getState("chiTietList") as ChungTuChiTiet[])?.find(
      (ct) => ct.doiTuongTen || ct.doiTuongMa,
    );

    await Promise.all(
      hoaDon.map((hd) => {
        const service = hd.loai === "mua" ? bangKeMuaVaoService : bangKeBanRaService;
        if (hd.id) return service.ganChungTu(hd.id, soPhieu);
        return service.create(
          dungDongNhap({
            soHoaDon: hd.soHoaDon,
            loai: hd.loai,
            ngayChungTu: header.ngay.format("YYYY-MM-DD"),
            soChungTu: soPhieu,
            doiTuongTen: doiTuong?.doiTuongTen,
            doiTuongMst: doiTuong?.doiTuongMst,
          }),
        );
      }),
    );
  }
```

Nếu `ChungTuChiTiet` không có `doiTuongMst`, lấy từ snapshot: `doiTuong?.doiTuongSnapshot?.maSoThue as string | undefined`.

- [ ] **Step 2: Gọi trong `submitForm`**

Nhánh sửa (`isEditing`), thay:

```ts
        await nhatKyChungService.updateBatch(header.soPhieu, items);
        message.success("Cập nhật chứng từ thành công");
```

bằng:

```ts
        await nhatKyChungService.updateBatch(header.soPhieu, items);
        await this.ghiHoaDonAnToan(header.soPhieu, header);
        message.success("Cập nhật chứng từ thành công");
```

Nhánh tạo mới, thay:

```ts
        await nhatKyChungService.createBatch(items);
        message.success("Tạo chứng từ thành công");
```

bằng:

```ts
        const created = await nhatKyChungService.createBatch(items);
        const soPhieuMoi = created[0]?.soPhieu;
        if (soPhieuMoi) await this.ghiHoaDonAnToan(soPhieuMoi, header);
        message.success("Tạo chứng từ thành công");
```

Và thêm lớp bọc báo lỗi, để lỗi hóa đơn không bị `catch` chung nuốt thành "Có lỗi xảy ra":

```ts
  /** Bọc ghiHoaDon: hỏng thì báo rõ chứng từ ĐÃ lưu, không ném tiếp. */
  private async ghiHoaDonAnToan(soPhieu: string, header: ChungTuHeader): Promise<void> {
    try {
      await this.ghiHoaDon(soPhieu, header);
    } catch (e) {
      console.error("gan hoa don that bai", e);
      message.error(
        `Chứng từ ${soPhieu} đã lưu, nhưng chưa gắn được hóa đơn. Mở lại chứng từ và lưu lần nữa.`,
      );
    }
  }
```

- [ ] **Step 3: Kiểm tra biên dịch**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep submit.handler
```

Kỳ vọng: không in dòng nào.

- [ ] **Step 4: Chạy toàn bộ test FE của nhật ký chung**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx vitest run src/pages/chung-tu
```

Kỳ vọng: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/form-handler
git commit -m "feat(nkc): lưu chứng từ xong thì gắn hóa đơn sang bảng kê"
```

---

## Task 8: Cột "HĐ" ở bảng Dữ liệu tổng hợp (FE)

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx`

**Interfaces:**
- Consumes: `layTheoSoChungTu` (Task 5)
- Produces: không có

- [ ] **Step 1: Nạp map hóa đơn cho trang hiện tại**

Trong `EntryListTab`, sau khi có danh sách dòng đang hiển thị (`data`):

```tsx
  const [hoaDonMap, setHoaDonMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const soPhieuList = [...new Set(data.map((d) => d.soPhieu).filter(Boolean))];
    if (!soPhieuList.length) return setHoaDonMap({});
    let huy = false;
    Promise.all([
      bangKeMuaVaoService.layTheoSoChungTu(soPhieuList),
      bangKeBanRaService.layTheoSoChungTu(soPhieuList),
    ])
      .then(([mua, ban]) => {
        if (huy) return;
        const map: Record<string, string[]> = {};
        for (const nguon of [mua, ban]) {
          for (const [soPhieu, list] of Object.entries(nguon)) {
            map[soPhieu] = [...(map[soPhieu] || []), ...list.map((i) => i.soHoaDon)];
          }
        }
        setHoaDonMap(map);
      })
      .catch(() => setHoaDonMap({}));
    return () => {
      huy = true;
    };
  }, [data]);
```

- [ ] **Step 2: Thêm đúng MỘT cột**

Thêm vào mảng `columns`, đặt ngay sau cột "Số CT":

```tsx
  {
    title: "HĐ",
    key: "hoaDon",
    width: 60,
    align: "center" as const,
    render: (_: unknown, record: { soPhieu?: string }) => {
      const list = hoaDonMap[record.soPhieu || ""] || [];
      if (!list.length) return <span className="text-gray-300">—</span>;
      return (
        <Tooltip title={list.join(", ")}>
          <Tag color="blue">{list.length}</Tag>
        </Tooltip>
      );
    },
  },
```

Không thêm cột nào khác vào bảng này.

- [ ] **Step 3: Kiểm tra biên dịch + test**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep EntryListTab && npx vitest run src/pages/chung-tu
```

Kỳ vọng: `tsc` không in dòng nào, test PASS.

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/EntryListTab.tsx
git commit -m "feat(nkc): cột HĐ hiện số hóa đơn đã gắn cho từng chứng từ"
```

---

## Task 9: Bảng kê — cột chứng từ, nhãn, bộ lọc, gắn/gỡ (FE)

**Files:**
- Create: `fe/src/pages/thue/components/GanChungTuModal.tsx`
- Modify: `fe/src/pages/thue/components/BangKePage.tsx`

**Interfaces:**
- Consumes: `ganChungTu`, `goLienKet` (Task 5), query `lienKet` (Task 2)
- Produces: không có

- [ ] **Step 1: Viết `GanChungTuModal.tsx`**

```tsx
import { useState } from "react";
import { Modal, Input, Table, message } from "antd";
import { nhatKyChungService } from "@/services/nhatKyChungService";

interface Props {
  open: boolean;
  onCancel: () => void;
  onChon: (soPhieu: string) => void;
}

/** Tìm chứng từ theo số phiếu / diễn giải để gắn tay vào một dòng bảng kê. */
export function GanChungTuModal({ open, onCancel, onChon }: Props) {
  const [tuKhoa, setTuKhoa] = useState("");
  const [rows, setRows] = useState<{ soPhieu: string; ngay: string; dienGiai: string; soTien: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const timKiem = async (kw: string) => {
    if (!kw.trim()) return setRows([]);
    setLoading(true);
    try {
      const res = await nhatKyChungService.getEntries({ search: kw.trim(), limit: 20 });
      setRows(
        res.data.map((d) => ({
          soPhieu: d.soPhieu,
          ngay: String(d.ngay).slice(0, 10),
          dienGiai: d.dienGiai || "",
          soTien: d.soTien || 0,
        })),
      );
    } catch {
      message.error("Không tìm được chứng từ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onCancel={onCancel} footer={null} title="Gắn với chứng từ" width={720}>
      <Input.Search
        placeholder="Số phiếu hoặc diễn giải"
        value={tuKhoa}
        onChange={(e) => setTuKhoa(e.target.value)}
        onSearch={timKiem}
        allowClear
      />
      <Table
        className="mt-3"
        size="small"
        rowKey={(r) => r.soPhieu + r.dienGiai}
        loading={loading}
        dataSource={rows}
        pagination={false}
        scroll={{ y: 320 }}
        onRow={(r) => ({ onClick: () => onChon(r.soPhieu), style: { cursor: "pointer" } })}
        columns={[
          { title: "Số CT", dataIndex: "soPhieu", width: 120 },
          { title: "Ngày", dataIndex: "ngay", width: 110 },
          { title: "Diễn giải", dataIndex: "dienGiai", ellipsis: true },
          {
            title: "Số tiền",
            dataIndex: "soTien",
            align: "right",
            width: 140,
            render: (v: number) => v.toLocaleString("vi-VN"),
          },
        ]}
      />
    </Modal>
  );
}
```

- [ ] **Step 2: Thêm bộ lọc liên kết vào `BangKePage.tsx`**

```tsx
  const [lienKet, setLienKet] = useState<"" | "da" | "chua" | "cho-bo-sung">("");
```

Truyền vào `service.getPaginated({ ..., lienKet: lienKet || undefined })` trong `fetchData`,
thêm `lienKet` vào mảng dependency của lần gọi lại, và đặt cạnh bộ lọc quý:

```tsx
  <Select
    size="small"
    style={{ width: 190 }}
    value={lienKet}
    onChange={(v) => { setLienKet(v); fetchData(1, pagination.pageSize, searchText, v); }}
    options={[
      { value: "", label: "Tất cả" },
      { value: "da", label: "Đã liên kết" },
      { value: "chua", label: "Chưa liên kết" },
      { value: "cho-bo-sung", label: "Chưa đủ thông tin" },
    ]}
  />
```

- [ ] **Step 3: Thêm cột "Chứng từ" + nhãn + nút**

Thêm vào mảng `columns`, ngay trước cột "Thao tác":

```tsx
    {
      title: "Chứng từ",
      key: "soChungTu",
      width: 150,
      render: (_: unknown, r: BangKeRecord) =>
        r.soChungTu ? (
          <Space size={4}>
            <a onClick={() => window.open(`/chung-tu/nhat-ky-chung?search=${r.soChungTu}`, "_blank")}>
              {r.soChungTu}
            </a>
            <Tooltip title="Gỡ liên kết — dòng hóa đơn vẫn còn">
              <Button type="text" size="small" icon={<DisconnectOutlined />} onClick={() => handleGoLienKet(r)} />
            </Tooltip>
          </Space>
        ) : (
          <Space size={4}>
            <Text type="secondary">Nhập tay</Text>
            {canEdit && (
              <Button type="link" size="small" onClick={() => { setGanRecord(r); setGanVisible(true); }}>
                Gắn
              </Button>
            )}
          </Space>
        ),
    },
```

Và nhãn "Chưa đủ thông tin" gắn vào cột "Số HĐ":

```tsx
    {
      title: "Số HĐ",
      dataIndex: "soHoaDon",
      key: "soHoaDon",
      width: 140,
      render: (v: string, r: BangKeRecord) => (
        <Space size={4}>
          <span>{v}</span>
          {r.choBoSung && <Tag color="orange">Chưa đủ thông tin</Tag>}
        </Space>
      ),
    },
```

(thay cột `{ title: "Số HĐ", dataIndex: "soHoaDon", key: "soHoaDon", width: 110 }` đang có)

- [ ] **Step 4: Hai handler gắn / gỡ**

```tsx
  const [ganVisible, setGanVisible] = useState(false);
  const [ganRecord, setGanRecord] = useState<BangKeRecord | null>(null);

  const handleGan = async (soPhieu: string) => {
    if (!ganRecord) return;
    try {
      await service.ganChungTu(ganRecord.id, soPhieu);
      message.success(`Đã gắn hóa đơn ${ganRecord.soHoaDon} với chứng từ ${soPhieu}`);
      setGanVisible(false);
      setGanRecord(null);
      fetchData(pagination.current, pagination.pageSize, searchText, lienKet);
    } catch {
      message.error("Gắn chứng từ thất bại");
    }
  };

  const handleGoLienKet = async (r: BangKeRecord) => {
    try {
      await service.goLienKet(r.id);
      message.success("Đã gỡ liên kết");
      fetchData(pagination.current, pagination.pageSize, searchText, lienKet);
    } catch {
      message.error("Gỡ liên kết thất bại");
    }
  };
```

Và render modal cuối component:

```tsx
      <GanChungTuModal
        open={ganVisible}
        onCancel={() => { setGanVisible(false); setGanRecord(null); }}
        onChon={handleGan}
      />
```

Thêm `DisconnectOutlined` vào import icon, `GanChungTuModal` vào import.

- [ ] **Step 5: Kiểm tra biên dịch + test**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "BangKePage|GanChungTuModal" && npx vitest run src/pages/thue
```

Kỳ vọng: `tsc` không in dòng nào; test thue PASS (nếu chưa có test nào thì vitest báo no test files — chấp nhận).

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/thue
git commit -m "feat(thue): bảng kê hiện chứng từ liên kết, lọc trạng thái, gắn/gỡ tay"
```

---

## Task 10: Xóa bút toán cuối cùng của chứng từ thì gỡ link (FE)

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/delete/delete.event.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/delete/delete.handler.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/entry-actions/EntryActions.tsx`

**Interfaces:**
- Consumes: `layTheoSoChungTu`, `goLienKet` (Task 5)
- Produces: `deleteEntry` nhận thêm `soPhieu: string`

**Bối cảnh phải đọc trước khi làm:** hệ thống **không có thao tác "xóa chứng từ"** — chỉ xóa
từng bút toán (`deleteEntry({ id })`) hoặc xóa hàng loạt theo id (`deleteBatch({ ids })`).
Một chứng từ là nhóm bút toán chung số phiếu. Vì vậy chỉ được gỡ link khi **bút toán cuối cùng
mang số phiếu đó đã bị xóa**; gỡ ngay khi xóa một dòng sẽ làm hóa đơn rời khỏi chứng từ vẫn còn sống.

Xóa hàng loạt (`deleteBatch`) **cố ý không tự gỡ link** — event chỉ nhận mảng id, không biết số
phiếu, mà tra ngược từng id là thêm N request cho một trường hợp hiếm. Ở đó dựa vào đường thủ
công: bảng kê luôn có nút "Gỡ liên kết", và bấm vào số chứng từ không còn thì báo không tìm thấy.
Ghi rõ giới hạn này vào comment ngay tại `deleteBatch`.

- [ ] **Step 1: Cho event nhận số phiếu**

Trong `delete.event.ts`, sửa params của `deleteEntry` thành:

```ts
export interface DeleteEntryParams {
  id: string;
  /** Số phiếu của bút toán bị xóa — cần để biết chứng từ đã hết dòng hay chưa. */
  soPhieu: string;
}
```

Trong `EntryActions.tsx`, chỗ gọi xóa, truyền thêm `soPhieu: record.soPhieu`.

- [ ] **Step 2: Gỡ link khi chứng từ đã hết dòng**

Trong `delete.handler.ts`, sau `message.success(...)`:

```ts
      // Hóa đơn đã kê khai KHÔNG được biến mất theo chứng từ — chỉ gỡ liên kết,
      // và chỉ khi bút toán cuối cùng của số phiếu này đã bị xóa.
      try {
        const conLai = await nhatKyChungService.getBySoPhieu(params.soPhieu);
        if (conLai.length === 0) {
          const [mua, ban] = await Promise.all([
            bangKeMuaVaoService.layTheoSoChungTu([params.soPhieu]),
            bangKeBanRaService.layTheoSoChungTu([params.soPhieu]),
          ]);
          await Promise.all([
            ...(mua[params.soPhieu] || []).map((i) => bangKeMuaVaoService.goLienKet(i.id)),
            ...(ban[params.soPhieu] || []).map((i) => bangKeBanRaService.goLienKet(i.id)),
          ]);
        }
      } catch (e) {
        console.error("go lien ket hoa don that bai", e);
        message.warning(
          `Đã xóa bút toán nhưng chưa gỡ được liên kết hóa đơn của chứng từ ${params.soPhieu}. Vào Bảng kê gỡ tay.`,
        );
      }
```

- [ ] **Step 3: Ghi chú giới hạn ở `deleteBatch`**

Thêm comment ngay đầu method `deleteBatch` trong `delete-batch.handler.ts`:

```ts
    // Xóa hàng loạt KHÔNG tự gỡ liên kết hóa đơn: event chỉ có mảng id, không có
    // số phiếu. Gỡ tay ở Bảng kê (nút "Gỡ liên kết"). Hóa đơn không bao giờ bị xóa
    // theo chứng từ nên đây là lệch nhãn, không phải mất dữ liệu.
```

- [ ] **Step 4: Kiểm tra biên dịch + test**

```bash
cd fe && export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH" && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "delete.handler|delete.event|EntryActions" ; npx vitest run
```

Kỳ vọng: `tsc` không in dòng nào; toàn bộ test FE PASS (845 test tại thời điểm viết plan).

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung
git commit -m "fix(nkc): xóa hết bút toán của chứng từ thì gỡ liên kết, không xóa hóa đơn"
```

---

## Kiểm tra cuối trước khi giao

Chạy tay trên máy dev (không phải production), theo đúng thứ tự:

1. Tạo chứng từ mới, ô Hóa đơn gõ một số **đã có** bên bảng kê → chọn từ gợi ý. Gõ thêm một số **chưa có** → chọn "thêm mới". Lưu.
2. Sang Bảng kê mua vào: dòng cũ hiện số chứng từ vừa tạo; có thêm một dòng mới mang nhãn **"Chưa đủ thông tin"**.
3. Sửa dòng nháp, điền giá trị + thuế suất, lưu → nhãn biến mất.
4. Vào Thuế › Tổng hợp: số VAT đầu vào đã gồm hóa đơn vừa bổ sung.
5. Mở lại chứng từ → ô Hóa đơn hiện đủ 2 số.
6. Xóa **hết** bút toán của chứng từ đó → 2 dòng bảng kê **vẫn còn**, chuyển sang "Nhập tay".
7. Bảng Dữ liệu tổng hợp: cột "HĐ" hiện số 2 ở các dòng của chứng từ đó (trước khi xóa).

## Deploy

```bash
cd be && npx nest build tax-service
scp dist/apps/tax-service/main.js kt:/root/chimseo/digital-book-be/dist/apps/tax-service/main.js
ssh kt "docker restart digital-book-app"
cd ../fe && npm run build && scp -r dist/* kt:/root/chimseo/nginx/build4/
ssh kt "docker exec digital-book-nginx nginx -s reload"
```

Kiểm sau deploy: `ssh kt "docker exec digital-book-app pm2 list | grep tax"` phải `online`.
