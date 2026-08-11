# Trang Bán hàng — GĐ1 (Nền tảng) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đơn hàng có trường Sản phẩm; trang `/trung-tam-du-lieu/hop-dong` chuyển cột "Năm" thành "Ngày HĐ", có 4 bộ lọc (Khách hàng / Sản phẩm / Đơn hàng / Thời gian) và 8 thẻ báo cáo nhanh tính theo đúng tập dòng đang lọc.

**Architecture:** Thêm `HopDong.sanPhamId` ở master-data-service. FE tải trọn danh sách đơn hàng một lần rồi lọc client-side; toàn bộ logic lọc và tổng hợp nằm trong hàm thuần có unit test, `QuanLyHopDongPage.tsx` chỉ gọi và hiển thị.

**Tech Stack:** NestJS 11 + TypeORM/MongoDB (BE, jest) · React 18 + antd 6 + TypeScript (FE, vitest)

## Global Constraints

- Nhánh làm việc: `feat/hop-dong-ban-hang`. Spec gốc: `docs/superpowers/specs/2026-08-11-hop-dong-ban-hang-design.md`.
- **Baseline test đỏ sẵn**: `cd be && yarn test` fail sẵn 13 suite; `tsc` lỗi sẵn ở cả BE lẫn FE; `vite build` không typecheck. **Chỉ chạy test hẹp theo đường dẫn**, không chạy toàn bộ suite rồi kết luận là mình làm hỏng.
- BE DTO: `@IsOptional()` **không** bỏ qua chuỗi rỗng — mọi field optional phải có `@Transform(emptyToUndefined)` đứng trước.
- Gom nhóm luôn khoá theo **mã/id**, không theo tên (có thể trùng tên khác mã).
- Doanh số = `giaTriSauThue` (sau thuế). Mốc doanh thu = `giaTriTruocThue`, thiếu thì `giaTriSauThue − tienThue`.
- Trường `nam` của `HopDong` **giữ nguyên trong DB**, không migration, không xoá — chỉ thôi hiển thị trên trang Bán hàng.
- Tiền tệ dùng `Intl.NumberFormat('vi-VN')` như code sẵn có; không đổi định dạng.

---

## File Structure

**Backend (master-data-service)**
- `be/libs/entities/src/master-data/hop-dong.entity.ts` — thêm cột `sanPhamId`
- `be/apps/master-data-service/src/hop-dong/dto/create-hop-dong.dto.ts` — thêm field `sanPhamId`
- `be/apps/master-data-service/src/theo-doi-hop-dong/theo-doi-hop-dong.util.ts` *(mới)* — hàm thuần `tienHoaDon`
- `be/apps/master-data-service/src/theo-doi-hop-dong/theo-doi-hop-dong.util.spec.ts` *(mới)*
- `be/apps/master-data-service/src/theo-doi-hop-dong/theo-doi-hop-dong.service.ts` — dùng `tienHoaDon`, trả thêm `sanPhamId` + `giaTriTruocThue`

**Frontend — nhập liệu Sản phẩm**
- `fe/src/types/index.ts` — `HopDong.sanPhamId`, `TheoDoiHopDongRow.sanPhamId` + `.giaTriTruocThue`
- `fe/src/pages/danh-muc/hop-dong/HopDongPage.state.ts` — state `sanPhamList`
- `fe/src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.handler.ts` — nạp danh mục sản phẩm
- `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx` — ô chọn Sản phẩm + cột bảng
- `fe/src/pages/trung-tam-du-lieu/hop-dong/TaoNhanhHopDongModal.tsx` — ô chọn Sản phẩm
- `fe/src/components/import-danh-muc/configs/hopDong.config.ts` — cột import "Mã sản phẩm"

**Frontend — logic thuần (mới, mỗi file một trách nhiệm)**
- `fe/src/pages/trung-tam-du-lieu/hop-dong/boLocThoiGian.ts` + `.test.ts` — kỳ lọc và phép kiểm một dòng có thuộc kỳ không
- `fe/src/pages/trung-tam-du-lieu/hop-dong/baoCaoNhanh.ts` + `.test.ts` — cộng 8 chỉ tiêu

**Frontend — ráp trang**
- `fe/src/services/theoDoiHopDongService.ts` — `getList()` bỏ tham số
- `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx` — cột, bộ lọc, thẻ

---

### Task 1: BE — `sanPhamId` trên đơn hàng, `daTraHoaDon` theo tiền hàng + tiền thuế

**Files:**
- Create: `be/apps/master-data-service/src/theo-doi-hop-dong/theo-doi-hop-dong.util.ts`
- Create: `be/apps/master-data-service/src/theo-doi-hop-dong/theo-doi-hop-dong.util.spec.ts`
- Modify: `be/libs/entities/src/master-data/hop-dong.entity.ts`
- Modify: `be/apps/master-data-service/src/hop-dong/dto/create-hop-dong.dto.ts`
- Modify: `be/apps/master-data-service/src/theo-doi-hop-dong/theo-doi-hop-dong.service.ts`

**Interfaces:**
- Consumes: (không có — task đầu tiên)
- Produces:
  - `tienHoaDon(h: { tienHang?: number; tienThue?: number; tong?: number }): number`
  - `HopDong.sanPhamId?: string` (entity + DTO)
  - `TheoDoiHopDongRow` có thêm `sanPhamId?: string` và `giaTriTruocThue?: number`

- [ ] **Step 1: Viết test thất bại cho `tienHoaDon`**

Tạo `be/apps/master-data-service/src/theo-doi-hop-dong/theo-doi-hop-dong.util.spec.ts`:

```ts
import { tienHoaDon } from './theo-doi-hop-dong.util';

describe('tienHoaDon', () => {
  it('cộng tiền hàng và tiền thuế', () => {
    expect(tienHoaDon({ tienHang: 100, tienThue: 10, tong: 999 })).toBe(110);
  });

  it('chỉ có tiền hàng thì lấy tiền hàng', () => {
    expect(tienHoaDon({ tienHang: 100, tong: 999 })).toBe(100);
  });

  it('thiếu cả tiền hàng lẫn tiền thuế thì rơi về tổng (dữ liệu nhập cũ)', () => {
    expect(tienHoaDon({ tong: 250 })).toBe(250);
  });

  it('không có số nào thì trả 0', () => {
    expect(tienHoaDon({})).toBe(0);
  });

  it('chuỗi số từ MongoDB decimal vẫn cộng đúng', () => {
    expect(
      tienHoaDon({ tienHang: '100' as unknown as number, tienThue: '10' as unknown as number }),
    ).toBe(110);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd be && npx jest apps/master-data-service/src/theo-doi-hop-dong --silent`
Expected: FAIL — `Cannot find module './theo-doi-hop-dong.util'`

- [ ] **Step 3: Viết `theo-doi-hop-dong.util.ts`**

```ts
const num = (v: unknown): number => Number(v) || 0;

/**
 * Giá trị một hóa đơn bán ra = tiền hàng + tiền thuế.
 * Bản ghi cũ nhập bằng Excel nhiều khi chỉ có `tong` — thiếu cả hai thành phần thì
 * rơi về `tong` để không mất số.
 */
export function tienHoaDon(h: {
  tienHang?: number;
  tienThue?: number;
  tong?: number;
}): number {
  if (h.tienHang == null && h.tienThue == null) return num(h.tong);
  return num(h.tienHang) + num(h.tienThue);
}
```

- [ ] **Step 4: Chạy lại test**

Run: `cd be && npx jest apps/master-data-service/src/theo-doi-hop-dong --silent`
Expected: PASS — 5 test

- [ ] **Step 5: Thêm cột `sanPhamId` vào entity**

Trong `be/libs/entities/src/master-data/hop-dong.entity.ts`, ngay dưới `doiTuongId`:

```ts
  @Column({ nullable: true })
  doiTuongId?: string;

  /** Sản phẩm của đơn hàng — id danh mục Sản phẩm; dùng để gom doanh số/doanh thu. */
  @Column({ nullable: true })
  sanPhamId?: string;
```

- [ ] **Step 6: Thêm `sanPhamId` vào CreateHopDongDto**

Trong `be/apps/master-data-service/src/hop-dong/dto/create-hop-dong.dto.ts`, ngay dưới field `doiTuongId`:

```ts
  @IsOptional()
  @IsMongoId()
  doiTuongId?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsMongoId()
  sanPhamId?: string;
```

`UpdateHopDongDto` là `PartialType(CreateHopDongDto)` nên tự có, không sửa gì.

- [ ] **Step 7: Cập nhật `theo-doi-hop-dong.service.ts`**

Thêm import ở đầu file:

```ts
import { tienHoaDon } from './theo-doi-hop-dong.util';
```

Trong `buildSumMaps`, đổi dòng cộng hóa đơn:

```ts
    const hoaDonByHd = new Map<string, number>();
    for (const h of hoaDons) {
      if (h.isActive === false) continue;
      hoaDonByHd.set(h.hopDongId, (hoaDonByHd.get(h.hopDongId) || 0) + tienHoaDon(h));
    }
```

Trong `interface TheoDoiHopDongRow`, thêm 2 field dưới `giaTriSauThue`:

```ts
  giaTriTruocThue?: number;
  giaTriSauThue?: number;
  ngayKy?: Date;
  doiTuongId?: string;
  sanPhamId?: string;
```

Trong `toRow`, thêm 2 dòng tương ứng:

```ts
      giaTriTruocThue: hd.giaTriTruocThue,
      giaTriSauThue: hd.giaTriSauThue,
      ngayKy: hd.ngayKy,
      doiTuongId: hd.doiTuongId,
      sanPhamId: hd.sanPhamId,
```

- [ ] **Step 8: Kiểm tra biên dịch service**

Run: `cd be && npx nest build master-data-service`
Expected: build thành công, không lỗi mới.

- [ ] **Step 9: Chạy lại test hẹp**

Run: `cd be && npx jest apps/master-data-service/src/theo-doi-hop-dong --silent`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add be/libs/entities/src/master-data/hop-dong.entity.ts \
        be/apps/master-data-service/src/hop-dong/dto/create-hop-dong.dto.ts \
        be/apps/master-data-service/src/theo-doi-hop-dong/
git commit -m "feat(hop-dong): thêm sanPhamId cho đơn hàng, đã xuất HĐ tính theo tiền hàng + thuế"
```

---

### Task 2: FE — ô chọn Sản phẩm ở 3 nơi nhập liệu

**Files:**
- Modify: `fe/src/types/index.ts:155-177` (HopDong), `fe/src/types/index.ts:273-288` (TheoDoiHopDongRow)
- Modify: `fe/src/pages/danh-muc/hop-dong/HopDongPage.state.ts`
- Modify: `fe/src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.handler.ts`
- Modify: `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx`
- Modify: `fe/src/pages/trung-tam-du-lieu/hop-dong/TaoNhanhHopDongModal.tsx`
- Modify: `fe/src/components/import-danh-muc/configs/hopDong.config.ts`

**Interfaces:**
- Consumes: `HopDong.sanPhamId`, `TheoDoiHopDongRow.sanPhamId`, `TheoDoiHopDongRow.giaTriTruocThue` (Task 1)
- Produces: `sanPhamService.getAll(): Promise<SanPham[]>` được dùng ở Task 5; `SanPham` có `{ id, ma, ten }`

Không có test tự động — đây là ráp UI. Kiểm chứng bằng lint + chạy app.

- [ ] **Step 1: Thêm `sanPhamId` vào type FE**

`fe/src/types/index.ts`, trong `interface HopDong` ngay dưới `doiTuongId?: string;`:

```ts
  doiTuongId?: string;
  /** Sản phẩm của đơn hàng — id danh mục Sản phẩm. */
  sanPhamId?: string;
```

Trong `interface TheoDoiHopDongRow`, ngay dưới `giaTriSauThue?: number;` và `doiTuongId?: string;`:

```ts
  tienThue?: number;
  giaTriTruocThue?: number;
  giaTriSauThue?: number;
  ngayKy?: string;
  doiTuongId?: string;
  sanPhamId?: string;
```

- [ ] **Step 2: Thêm state `sanPhamList` cho trang danh mục**

`fe/src/pages/danh-muc/hop-dong/HopDongPage.state.ts` — sửa import và interface:

```ts
import { HopDong, DoiTuong, SanPham } from "@/types";
```

```ts
  doiTuongList: DoiTuong[];
  sanPhamList: SanPham[];
```

- [ ] **Step 3: Nạp danh mục sản phẩm trong init handler**

`fe/src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.handler.ts` — thêm import:

```ts
import { sanPhamService } from "@/services/sanPhamService";
```

Sửa khối `Promise.all` trong `init()`:

```ts
      const [hopDongResult, doiTuongList, stats, sanPhamList] = await Promise.all([
        hopDongService.getPaginated({ page: 1, limit: 50 }),
        doiTuongService.getByLoai("KHACH_HANG"),
        hopDongService.getStats(),
        sanPhamService.getAll(),
      ]);
```

và thêm sau `this.setState("doiTuongList", doiTuongList);`:

```ts
      this.setState("sanPhamList", sanPhamList);
```

- [ ] **Step 4: Thêm ô chọn Sản phẩm vào form danh mục Hợp đồng**

`fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx`:

a) import type `SanPham` cùng chỗ đang import `DoiTuong` từ `@/types`.

b) đọc state, ngay dưới dòng `const [doiTuongList] = useHopDongState("doiTuongList", []);`:

```tsx
  const [sanPhamList] = useHopDongState("sanPhamList", []);
```

c) trong `interface FormValues`, dưới `doiTuongId?: string;`:

```ts
  sanPhamId?: string;
```

d) trong `transformToFormValues`, dưới `doiTuongId: record.doiTuongId,`:

```ts
      sanPhamId: record.sanPhamId,
```

e) trong `transformToSubmitData`, dưới `doiTuongId: values.doiTuongId,`:

```ts
      sanPhamId: values.sanPhamId,
```

f) trong tab "Chủ đầu tư" (key "3"), ngay sau `</Form.Item>` của `doiTuongId` (dòng ~671):

```tsx
          <Form.Item name="sanPhamId" label={fl('sanPhamId', 'Sản phẩm')}>
            <Select
              placeholder="Chọn sản phẩm"
              allowClear
              showSearch
              optionFilterProp="label"
              options={sanPhamList.map((sp: SanPham) => ({
                value: sp.id,
                label: `${sp.ma} - ${sp.ten}`,
              }))}
            />
          </Form.Item>
```

g) thêm cột vào `columns`, ngay sau cột "Chủ đầu tư":

```tsx
    {
      title: "Sản phẩm",
      dataIndex: "sanPhamId",
      key: "sanPhamId",
      width: 160,
      ellipsis: true,
      render: (value: string) =>
        sanPhamList.find((sp: SanPham) => sp.id === value)?.ten || "-",
    },
```

- [ ] **Step 5: Thêm ô chọn Sản phẩm vào `TaoNhanhHopDongModal`**

`fe/src/pages/trung-tam-du-lieu/hop-dong/TaoNhanhHopDongModal.tsx`:

a) import:

```ts
import { TrangThaiHopDong, type DoiTuong, type SanPham } from '@/types';
import { sanPhamService } from '@/services/sanPhamService';
```

b) state + nạp danh mục:

```tsx
  const [sanPhamList, setSanPhamList] = useState<SanPham[]>([]);
```

```tsx
  useEffect(() => {
    doiTuongService.getAll().then(setDoiTuongList).catch(() => setDoiTuongList([]));
    sanPhamService.getAll().then(setSanPhamList).catch(() => setSanPhamList([]));
  }, []);
```

c) `interface FormValues` thêm `sanPhamId?: string;` dưới `doiTuongId?: string;`

d) trong `hopDongService.create({...})`, dưới `doiTuongId: v.doiTuongId,`:

```ts
        sanPhamId: v.sanPhamId,
```

e) đổi ô "Chủ đầu tư" (dòng ~230) thành 2 cột:

```tsx
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="doiTuongId" label="Chủ đầu tư">
                <Select
                  placeholder="Chọn chủ đầu tư"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={doiTuongList.map((dt) => ({ value: dt.id, label: `${dt.ma} - ${dt.ten}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sanPhamId" label="Sản phẩm">
                <Select
                  placeholder="Chọn sản phẩm"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={sanPhamList.map((sp) => ({ value: sp.id, label: `${sp.ma} - ${sp.ten}` }))}
                />
              </Form.Item>
            </Col>
          </Row>
```

- [ ] **Step 6: Thêm cột import Excel "Mã sản phẩm"**

`fe/src/components/import-danh-muc/configs/hopDong.config.ts` — thêm import service và một cột ngay sau cột `doiTuong`:

```ts
import { sanPhamService } from "@/services/sanPhamService";
```

```ts
    {
      key: "sanPham",
      header: "Mã sản phẩm",
      example: "SP01",
      ref: {
        service: sanPhamService,
        matchBy: "ma",
        label: "Sản phẩm",
        displayField: "ten",
        assign: (found) => ({ sanPhamId: found.id }),
      },
    },
```

- [ ] **Step 7: Lint**

Run: `cd fe && npm run lint`
Expected: không có lỗi mới ở các file vừa sửa (so với baseline — repo có lỗi lint sẵn ở nơi khác).

- [ ] **Step 8: Commit**

```bash
git add fe/src/types/index.ts fe/src/pages/danh-muc/hop-dong/ \
        fe/src/pages/trung-tam-du-lieu/hop-dong/TaoNhanhHopDongModal.tsx \
        fe/src/components/import-danh-muc/configs/hopDong.config.ts
git commit -m "feat(hop-dong): chọn sản phẩm khi thêm/sửa/import đơn hàng"
```

---

### Task 3: FE — bộ lọc thời gian (hàm thuần)

**Files:**
- Create: `fe/src/pages/trung-tam-du-lieu/hop-dong/boLocThoiGian.ts`
- Test: `fe/src/pages/trung-tam-du-lieu/hop-dong/boLocThoiGian.test.ts`

**Interfaces:**
- Consumes: `TheoDoiHopDongRow.ngayKy` (chuỗi `YYYY-MM-DD` hoặc ISO), `.nam` (Task 1)
- Produces:
  - `type KyLoc`
  - `interface BoLocThoiGian { nam: number; ky: KyLoc; tuNgay?: string; denNgay?: string }`
  - `const KY_OPTIONS: { value: KyLoc; label: string }[]`
  - `function khoangThang(ky: KyLoc): [number, number] | null`
  - `function trongKy(row: { ngayKy?: string; nam?: number }, loc: BoLocThoiGian): boolean`

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/pages/trung-tam-du-lieu/hop-dong/boLocThoiGian.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { khoangThang, trongKy, KY_OPTIONS } from './boLocThoiGian';

describe('khoangThang', () => {
  it('cả năm là tháng 1 đến 12', () => {
    expect(khoangThang('CA_NAM')).toEqual([1, 12]);
  });

  it('quý và nửa năm đúng biên', () => {
    expect(khoangThang('Q1')).toEqual([1, 3]);
    expect(khoangThang('Q4')).toEqual([10, 12]);
    expect(khoangThang('HK1')).toEqual([1, 6]);
    expect(khoangThang('HK2')).toEqual([7, 12]);
  });

  it('tháng lẻ chỉ gồm chính nó', () => {
    expect(khoangThang('T3')).toEqual([3, 3]);
    expect(khoangThang('T12')).toEqual([12, 12]);
  });

  it('tùy chọn không có khoảng tháng', () => {
    expect(khoangThang('TUY_CHON')).toBeNull();
  });

  it('danh sách lựa chọn đủ 20 mục', () => {
    // Cả năm + 2 nửa năm + 4 quý + 12 tháng + Tùy chọn
    expect(KY_OPTIONS).toHaveLength(20);
  });
});

describe('trongKy — đơn có ngày ký', () => {
  const don = { ngayKy: '2026-03-15', nam: 2026 };

  it('đúng năm, kỳ cả năm', () => {
    expect(trongKy(don, { nam: 2026, ky: 'CA_NAM' })).toBe(true);
  });

  it('sai năm thì loại, dù kỳ là cả năm', () => {
    expect(trongKy(don, { nam: 2025, ky: 'CA_NAM' })).toBe(false);
  });

  it('lọc theo quý', () => {
    expect(trongKy(don, { nam: 2026, ky: 'Q1' })).toBe(true);
    expect(trongKy(don, { nam: 2026, ky: 'Q2' })).toBe(false);
  });

  it('lọc theo tháng', () => {
    expect(trongKy(don, { nam: 2026, ky: 'T3' })).toBe(true);
    expect(trongKy(don, { nam: 2026, ky: 'T4' })).toBe(false);
  });

  it('lọc theo nửa năm, biên tháng 6/7', () => {
    expect(trongKy({ ngayKy: '2026-06-30' }, { nam: 2026, ky: 'HK1' })).toBe(true);
    expect(trongKy({ ngayKy: '2026-07-01' }, { nam: 2026, ky: 'HK1' })).toBe(false);
    expect(trongKy({ ngayKy: '2026-07-01' }, { nam: 2026, ky: 'HK2' })).toBe(true);
  });

  it('ngày ký dạng ISO đầy đủ vẫn đọc đúng tháng', () => {
    expect(trongKy({ ngayKy: '2026-03-15T00:00:00.000Z' }, { nam: 2026, ky: 'Q1' })).toBe(true);
  });
});

describe('trongKy — đơn thiếu ngày ký', () => {
  const donCu = { nam: 2026 };

  it('lọt khi đúng năm và kỳ là cả năm', () => {
    expect(trongKy(donCu, { nam: 2026, ky: 'CA_NAM' })).toBe(true);
  });

  it('bị loại ở kỳ quý/tháng vì không đoán tháng', () => {
    expect(trongKy(donCu, { nam: 2026, ky: 'Q1' })).toBe(false);
    expect(trongKy(donCu, { nam: 2026, ky: 'T1' })).toBe(false);
  });

  it('bị loại khi sai năm', () => {
    expect(trongKy(donCu, { nam: 2025, ky: 'CA_NAM' })).toBe(false);
  });

  it('không có cả ngayKy lẫn nam thì luôn bị loại', () => {
    expect(trongKy({}, { nam: 2026, ky: 'CA_NAM' })).toBe(false);
  });
});

describe('trongKy — kỳ tùy chọn', () => {
  const loc = { nam: 2026, ky: 'TUY_CHON' as const, tuNgay: '2026-03-01', denNgay: '2026-03-31' };

  it('bao gồm cả hai đầu mút', () => {
    expect(trongKy({ ngayKy: '2026-03-01' }, loc)).toBe(true);
    expect(trongKy({ ngayKy: '2026-03-31' }, loc)).toBe(true);
  });

  it('loại ngày ngoài khoảng', () => {
    expect(trongKy({ ngayKy: '2026-02-28' }, loc)).toBe(false);
    expect(trongKy({ ngayKy: '2026-04-01' }, loc)).toBe(false);
  });

  it('khoảng có thể vắt qua năm, không bị chặn bởi nam', () => {
    const vatNam = { nam: 2026, ky: 'TUY_CHON' as const, tuNgay: '2025-12-01', denNgay: '2026-01-31' };
    expect(trongKy({ ngayKy: '2025-12-15' }, vatNam)).toBe(true);
  });

  it('đơn thiếu ngày ký bị loại', () => {
    expect(trongKy({ nam: 2026 }, loc)).toBe(false);
  });

  it('chưa chọn đủ 2 đầu ngày thì rơi về cả năm', () => {
    expect(trongKy({ ngayKy: '2026-08-01' }, { nam: 2026, ky: 'TUY_CHON' })).toBe(true);
    expect(trongKy({ nam: 2026 }, { nam: 2026, ky: 'TUY_CHON' })).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong/boLocThoiGian.test.ts`
Expected: FAIL — không resolve được `./boLocThoiGian`

- [ ] **Step 3: Viết `boLocThoiGian.ts`**

```ts
import dayjs from 'dayjs';

/** Kỳ lọc trong một năm. `TUY_CHON` dùng khoảng ngày do người dùng chọn. */
export type KyLoc =
  | 'CA_NAM'
  | 'HK1'
  | 'HK2'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'
  | 'T7' | 'T8' | 'T9' | 'T10' | 'T11' | 'T12'
  | 'TUY_CHON';

export interface BoLocThoiGian {
  nam: number;
  ky: KyLoc;
  /** Chỉ dùng khi ky === 'TUY_CHON', định dạng YYYY-MM-DD. */
  tuNgay?: string;
  denNgay?: string;
}

export const KY_OPTIONS: { value: KyLoc; label: string }[] = [
  { value: 'CA_NAM', label: 'Cả năm' },
  { value: 'HK1', label: '6 tháng đầu năm' },
  { value: 'HK2', label: '6 tháng cuối năm' },
  { value: 'Q1', label: 'Quý 1' },
  { value: 'Q2', label: 'Quý 2' },
  { value: 'Q3', label: 'Quý 3' },
  { value: 'Q4', label: 'Quý 4' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: `T${i + 1}` as KyLoc,
    label: `Tháng ${i + 1}`,
  })),
  { value: 'TUY_CHON', label: 'Tùy chọn khoảng ngày' },
];

/** Khoảng tháng [đầu, cuối] của kỳ; `null` với kỳ tùy chọn. */
export function khoangThang(ky: KyLoc): [number, number] | null {
  if (ky === 'TUY_CHON') return null;
  if (ky === 'CA_NAM') return [1, 12];
  if (ky === 'HK1') return [1, 6];
  if (ky === 'HK2') return [7, 12];
  if (ky.startsWith('Q')) {
    const q = Number(ky.slice(1));
    return [q * 3 - 2, q * 3];
  }
  const t = Number(ky.slice(1));
  return [t, t];
}

export interface DongLocThoiGian {
  /** Ngày ký hợp đồng (YYYY-MM-DD hoặc ISO). */
  ngayKy?: string;
  /** Năm nhập tay của đơn cũ — chỉ dùng khi thiếu ngayKy. */
  nam?: number;
}

/**
 * Một đơn hàng có thuộc kỳ đang lọc không.
 *
 * Đơn thiếu `ngayKy` chỉ lọt khi kỳ là "Cả năm" và trùng năm — không đoán tháng cho
 * đơn cũ, tránh làm sai bảng quý/tháng. Kỳ tùy chọn chưa chọn đủ hai đầu ngày thì
 * hiểu như "Cả năm".
 */
export function trongKy(row: DongLocThoiGian, loc: BoLocThoiGian): boolean {
  const coDayDuKhoang = loc.ky === 'TUY_CHON' && Boolean(loc.tuNgay && loc.denNgay);

  if (coDayDuKhoang) {
    if (!row.ngayKy) return false;
    const d = dayjs(row.ngayKy);
    return (
      !d.isBefore(dayjs(loc.tuNgay), 'day') && !d.isAfter(dayjs(loc.denNgay), 'day')
    );
  }

  const [dau, cuoi] = khoangThang(loc.ky) ?? [1, 12];

  if (!row.ngayKy) {
    return row.nam === loc.nam && dau === 1 && cuoi === 12;
  }

  const d = dayjs(row.ngayKy);
  const thang = d.month() + 1;
  return d.year() === loc.nam && thang >= dau && thang <= cuoi;
}
```

- [ ] **Step 4: Chạy lại test**

Run: `cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong/boLocThoiGian.test.ts`
Expected: PASS — toàn bộ test xanh

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/trung-tam-du-lieu/hop-dong/boLocThoiGian.ts \
        fe/src/pages/trung-tam-du-lieu/hop-dong/boLocThoiGian.test.ts
git commit -m "feat(hop-dong): bộ lọc thời gian theo năm và kỳ"
```

---

### Task 4: FE — báo cáo nhanh 8 chỉ tiêu (hàm thuần)

**Files:**
- Create: `fe/src/pages/trung-tam-du-lieu/hop-dong/baoCaoNhanh.ts`
- Test: `fe/src/pages/trung-tam-du-lieu/hop-dong/baoCaoNhanh.test.ts`

**Interfaces:**
- Consumes: các số của `TheoDoiHopDongRow` (Task 1)
- Produces:
  - `interface DongBaoCao { giaTriSauThue?: number; tienThue?: number; daThu?: number; dtChuaThucHien?: number; dtDaThucHien?: number; daTraHoaDon?: number }`
  - `interface BaoCaoNhanh { doanhSo; dtChuaThucHien; dtDaThucHien; tienThue; daThu; conPhaiThu; daXuatHoaDon; chuaXuatHoaDon }` (tất cả `number`)
  - `function tongHopBaoCaoNhanh(rows: DongBaoCao[]): BaoCaoNhanh`

Ba trường `daThu` / `dtChuaThucHien` / `dtDaThucHien` chỉ có số thật từ GĐ2; GĐ1 truyền `daThanhToan` vào `daThu` và bỏ trống hai trường doanh thu (hiện 0).

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/pages/trung-tam-du-lieu/hop-dong/baoCaoNhanh.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tongHopBaoCaoNhanh } from './baoCaoNhanh';

describe('tongHopBaoCaoNhanh', () => {
  it('tập rỗng thì mọi chỉ tiêu bằng 0', () => {
    expect(tongHopBaoCaoNhanh([])).toEqual({
      doanhSo: 0,
      dtChuaThucHien: 0,
      dtDaThucHien: 0,
      tienThue: 0,
      daThu: 0,
      conPhaiThu: 0,
      daXuatHoaDon: 0,
      chuaXuatHoaDon: 0,
    });
  });

  it('cộng đủ 8 chỉ tiêu của nhiều dòng', () => {
    const r = tongHopBaoCaoNhanh([
      {
        giaTriSauThue: 1_100,
        tienThue: 100,
        daThu: 400,
        dtChuaThucHien: 300,
        dtDaThucHien: 200,
        daTraHoaDon: 550,
      },
      {
        giaTriSauThue: 2_200,
        tienThue: 200,
        daThu: 1_000,
        dtChuaThucHien: 500,
        dtDaThucHien: 700,
        daTraHoaDon: 0,
      },
    ]);
    expect(r.doanhSo).toBe(3_300);
    expect(r.tienThue).toBe(300);
    expect(r.daThu).toBe(1_400);
    expect(r.dtChuaThucHien).toBe(800);
    expect(r.dtDaThucHien).toBe(900);
    expect(r.daXuatHoaDon).toBe(550);
  });

  it('còn phải thu = doanh số trừ đã thu', () => {
    const r = tongHopBaoCaoNhanh([{ giaTriSauThue: 1_000, daThu: 400 }]);
    expect(r.conPhaiThu).toBe(600);
  });

  it('chưa xuất hóa đơn = doanh số trừ đã xuất, âm khi xuất vượt', () => {
    const r = tongHopBaoCaoNhanh([{ giaTriSauThue: 1_000, daTraHoaDon: 1_200 }]);
    expect(r.chuaXuatHoaDon).toBe(-200);
  });

  it('trường thiếu coi như 0, không ra NaN', () => {
    const r = tongHopBaoCaoNhanh([{}, { giaTriSauThue: 500 }]);
    expect(r.doanhSo).toBe(500);
    expect(r.daThu).toBe(0);
    expect(Number.isNaN(r.conPhaiThu)).toBe(false);
  });

  it('chuỗi số từ backend decimal vẫn cộng đúng', () => {
    const r = tongHopBaoCaoNhanh([
      { giaTriSauThue: '1000' as unknown as number, daThu: '250' as unknown as number },
    ]);
    expect(r.doanhSo).toBe(1_000);
    expect(r.conPhaiThu).toBe(750);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong/baoCaoNhanh.test.ts`
Expected: FAIL — không resolve được `./baoCaoNhanh`

- [ ] **Step 3: Viết `baoCaoNhanh.ts`**

```ts
const num = (v: unknown): number => Number(v) || 0;

/** Các số của một đơn hàng mà báo cáo nhanh cần. Thiếu trường nào coi như 0. */
export interface DongBaoCao {
  giaTriSauThue?: number;
  tienThue?: number;
  /** Tiền đã thu của đơn hàng. */
  daThu?: number;
  /** Số dư Có 3387 còn treo (có từ GĐ2). */
  dtChuaThucHien?: number;
  /** Doanh thu đã ghi nhận, Có 511 (có từ GĐ2). */
  dtDaThucHien?: number;
  /** Tổng tiền hàng + tiền thuế đã xuất hóa đơn. */
  daTraHoaDon?: number;
}

export interface BaoCaoNhanh {
  doanhSo: number;
  dtChuaThucHien: number;
  dtDaThucHien: number;
  tienThue: number;
  daThu: number;
  conPhaiThu: number;
  daXuatHoaDon: number;
  chuaXuatHoaDon: number;
}

/**
 * Tám chỉ tiêu của thanh báo cáo nhanh, cộng trên đúng tập dòng đang hiển thị
 * (sau mọi bộ lọc). Hai chỉ tiêu suy ra chứ không cộng: còn phải thu và chưa xuất
 * hóa đơn — cùng gốc là doanh số sau thuế.
 */
export function tongHopBaoCaoNhanh(rows: DongBaoCao[]): BaoCaoNhanh {
  const t = rows.reduce(
    (acc, r) => {
      acc.doanhSo += num(r.giaTriSauThue);
      acc.tienThue += num(r.tienThue);
      acc.daThu += num(r.daThu);
      acc.dtChuaThucHien += num(r.dtChuaThucHien);
      acc.dtDaThucHien += num(r.dtDaThucHien);
      acc.daXuatHoaDon += num(r.daTraHoaDon);
      return acc;
    },
    {
      doanhSo: 0,
      tienThue: 0,
      daThu: 0,
      dtChuaThucHien: 0,
      dtDaThucHien: 0,
      daXuatHoaDon: 0,
    },
  );

  return {
    ...t,
    conPhaiThu: t.doanhSo - t.daThu,
    chuaXuatHoaDon: t.doanhSo - t.daXuatHoaDon,
  };
}
```

- [ ] **Step 4: Chạy lại test**

Run: `cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong/baoCaoNhanh.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/trung-tam-du-lieu/hop-dong/baoCaoNhanh.ts \
        fe/src/pages/trung-tam-du-lieu/hop-dong/baoCaoNhanh.test.ts
git commit -m "feat(hop-dong): tổng hợp 8 chỉ tiêu báo cáo nhanh"
```

---

### Task 5: FE — ráp trang Bán hàng: cột Ngày HĐ, 4 bộ lọc, 8 thẻ

**Files:**
- Modify: `fe/src/services/theoDoiHopDongService.ts:17-21`
- Modify: `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx`

**Interfaces:**
- Consumes: `trongKy`, `KY_OPTIONS`, `BoLocThoiGian`, `KyLoc` (Task 3); `tongHopBaoCaoNhanh` (Task 4); `TheoDoiHopDongRow.sanPhamId` (Task 1); `sanPhamService.getAll()` (Task 2)
- Produces: (kết thúc GĐ1 — GĐ2 sẽ bổ sung cột vào chính file này)

- [ ] **Step 1: `getList()` bỏ tham số**

`fe/src/services/theoDoiHopDongService.ts` — thay method `getList`:

```ts
  /**
   * Danh sách HĐ (join danh mục + tracking + tổng đã tính) — trả toàn bộ, không lọc
   * ở server. Trang Bán hàng lọc client-side vì báo cáo theo sản phẩm/tháng cần cả
   * đơn ngoài kỳ đang xem.
   */
  async getList(): Promise<TheoDoiHopDongRow[]> {
    return this.get<TheoDoiHopDongRow[]>({});
  }
```

Endpoint `/stats` và `getStats()` để nguyên ở service (chỗ khác có thể dùng), chỉ thôi gọi ở trang.

- [ ] **Step 2: Thay phần state và nạp dữ liệu của `QuanLyHopDongPage.tsx`**

Bỏ import `TheoDoiHopDongStats`, `DollarOutlined`/`FileDoneOutlined`/`WalletOutlined` nếu không còn dùng; thêm import:

```tsx
import type { SanPham } from '@/types';
import { sanPhamService } from '@/services/sanPhamService';
import { KY_OPTIONS, trongKy, type BoLocThoiGian, type KyLoc } from './boLocThoiGian';
import { tongHopBaoCaoNhanh } from './baoCaoNhanh';
```

Xoá hằng `NAM_OPTIONS` cũ và thay bằng:

```tsx
const NAM_HIEN_TAI = dayjs().year();
const NAM_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const y = 2022 + i;
  return { value: y, label: `Năm ${y}` };
});
```

Thay khối state `stats` / `search` / `nam` bằng:

```tsx
  const [doiTuongMap, setDoiTuongMap] = useState<Record<string, string>>({});
  const [sanPhamList, setSanPhamList] = useState<SanPham[]>([]);

  const [search, setSearch] = useState('');
  const [loc, setLoc] = useState<BoLocThoiGian>({ nam: NAM_HIEN_TAI, ky: 'CA_NAM' });
  const [khachHang, setKhachHang] = useState<string | undefined>();
  const [sanPham, setSanPham] = useState<string | undefined>();
  const [donHang, setDonHang] = useState<string | undefined>();
```

Thay `loadList` (bỏ `getStats`, bỏ tham số):

```tsx
  const loadList = async () => {
    setLoading(true);
    try {
      setRows(await theoDoiHopDongService.getList());
    } catch {
      message.error('Không tải được dữ liệu theo dõi');
    } finally {
      setLoading(false);
    }
  };
```

Thay `useEffect` phụ thuộc `[nam]` bằng chạy một lần:

```tsx
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Thêm nạp danh mục sản phẩm cạnh chỗ nạp đối tượng:

```tsx
  useEffect(() => {
    sanPhamService.getAll().then(setSanPhamList).catch(() => setSanPhamList([]));
  }, []);

  const sanPhamMap = useMemo(() => {
    const m: Record<string, string> = {};
    sanPhamList.forEach((sp) => {
      m[sp.id] = sp.ten;
    });
    return m;
  }, [sanPhamList]);
```

- [ ] **Step 3: Lọc client-side và tính báo cáo nhanh**

Thay khối `viewRows` hiện tại:

```tsx
  const { filterable, matches, hasPinned } = useTableColumnFilters('trung-tam-du-lieu-hop-dong');
  const viewRows = useMemo(() => {
    const getValue = cellValue(doiTuongMap, sanPhamMap);
    const tuKhoa = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matches(r, getValue)) return false;
      if (!trongKy(r, loc)) return false;
      if (khachHang && r.doiTuongId !== khachHang) return false;
      if (sanPham && (r.sanPhamId || '') !== (sanPham === 'CHUA_CHON' ? '' : sanPham))
        return false;
      if (donHang && r.soHopDong !== donHang) return false;
      if (
        tuKhoa &&
        !`${r.soHopDong} ${r.tenCongTrinh}`.toLowerCase().includes(tuKhoa)
      )
        return false;
      return true;
    });
  }, [rows, matches, doiTuongMap, sanPhamMap, loc, khachHang, sanPham, donHang, search]);

  const baoCao = useMemo(
    () => tongHopBaoCaoNhanh(viewRows.map((r) => ({ ...r, daThu: r.daThanhToan }))),
    [viewRows],
  );

  // Số HĐ có thể trùng giữa các bản ghi cũ — Select không chịu được option trùng value.
  const donHangOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.soHopDong).filter(Boolean))]
        .sort()
        .map((so) => ({ value: so, label: so })),
    [rows],
  );
```

Cập nhật `cellValue` ở đầu file cho khớp chữ ký mới:

```tsx
const cellValue =
  (doiTuongMap: Record<string, string>, sanPhamMap: Record<string, string>) =>
  (r: TheoDoiHopDongRow, key: string): string | undefined => {
    switch (key) {
      case 'soHopDong':
        return r.soHopDong;
      case 'tenCongTrinh':
        return r.tenCongTrinh;
      case 'doiTuongId':
        return doiTuongMap[r.doiTuongId || ''];
      case 'sanPhamId':
        return sanPhamMap[r.sanPhamId || ''];
      default:
        return undefined;
    }
  };
```

- [ ] **Step 4: Đổi cột "Năm" → "Ngày HĐ" và thêm cột "Sản phẩm"**

Trong mảng `columns`, thay dòng cột Năm:

```tsx
    {
      title: 'Ngày HĐ',
      dataIndex: 'ngayKy',
      key: 'ngayKy',
      width: 110,
      align: 'center',
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
```

và thêm ngay sau cột "Chủ đầu tư":

```tsx
    filterable<TheoDoiHopDongRow>({
      title: 'Sản phẩm',
      dataIndex: 'sanPhamId',
      key: 'sanPhamId',
      width: 150,
      ellipsis: true,
      render: (v: string) => sanPhamMap[v] || '-',
    }),
```

- [ ] **Step 5: Thay 3 thẻ Statistic bằng 8 thẻ**

Thay toàn bộ `<Row gutter={16}>…</Row>` chứa 3 `Card stat-card` bằng:

```tsx
      <Row gutter={[12, 12]}>
        {[
          { title: 'Doanh số', value: baoCao.doanhSo, color: '#1677ff' },
          { title: 'DT chưa thực hiện', value: baoCao.dtChuaThucHien, color: '#fa8c16' },
          { title: 'DT đã thực hiện', value: baoCao.dtDaThucHien, color: '#52c41a' },
          { title: 'Tiền thuế', value: baoCao.tienThue, color: '#722ed1' },
          { title: 'Tiền đã thu', value: baoCao.daThu, color: '#52c41a' },
          { title: 'Còn phải thu', value: baoCao.conPhaiThu, color: '#fa8c16' },
          { title: 'Đã xuất hóa đơn', value: baoCao.daXuatHoaDon, color: '#1677ff' },
          { title: 'Chưa xuất hóa đơn', value: baoCao.chuaXuatHoaDon, color: '#fa8c16' },
        ].map((c) => (
          <Col xs={12} sm={12} md={6} key={c.title}>
            <Card className="stat-card" size="small">
              <Statistic
                title={c.title}
                value={c.value}
                formatter={(v) => fmtCur(Number(v))}
                valueStyle={{ fontSize: 18, color: c.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>
```

- [ ] **Step 6: Thay thanh công cụ bằng 4 bộ lọc**

Thay khối `<FilterBar …>` hiện tại:

```tsx
        <FilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Tìm theo số HĐ, tên công trình...',
            width: 260,
          }}
          onReset={() => {
            setSearch('');
            setLoc({ nam: NAM_HIEN_TAI, ky: 'CA_NAM' });
            setKhachHang(undefined);
            setSanPham(undefined);
            setDonHang(undefined);
          }}
          filters={
            <>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Khách hàng"
                style={{ width: 180 }}
                value={khachHang}
                onChange={setKhachHang}
                options={Object.entries(doiTuongMap).map(([id, ten]) => ({
                  value: id,
                  label: ten,
                }))}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Sản phẩm"
                style={{ width: 170 }}
                value={sanPham}
                onChange={setSanPham}
                options={[
                  { value: 'CHUA_CHON', label: '(Chưa chọn sản phẩm)' },
                  ...sanPhamList.map((sp) => ({ value: sp.id, label: `${sp.ma} - ${sp.ten}` })),
                ]}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Đơn hàng"
                style={{ width: 170 }}
                value={donHang}
                onChange={setDonHang}
                options={donHangOptions}
              />
              <Select
                style={{ width: 120 }}
                value={loc.nam}
                onChange={(v) => setLoc((p) => ({ ...p, nam: v }))}
                options={NAM_OPTIONS}
              />
              <Select
                style={{ width: 180 }}
                value={loc.ky}
                onChange={(v: KyLoc) => setLoc((p) => ({ ...p, ky: v }))}
                options={KY_OPTIONS}
              />
              {loc.ky === 'TUY_CHON' && (
                <DatePicker.RangePicker
                  format="DD/MM/YYYY"
                  onChange={(d) =>
                    setLoc((p) => ({
                      ...p,
                      tuNgay: d?.[0]?.format('YYYY-MM-DD'),
                      denNgay: d?.[1]?.format('YYYY-MM-DD'),
                    }))
                  }
                />
              )}
            </>
          }
          actions={
            <>
              {settingsButton}
              {canCreateHopDong && <TaoNhanhHopDongModal onCreated={loadList} />}
            </>
          }
        />
```

Lưu ý: bộ lọc đi vào prop `filters`, nút vào `actions` — đúng bố cục `FilterBar` (`[tìm kiếm][đặt lại][filters] … [actions]`). Ô tìm kiếm bỏ `onSearch` vì đã lọc client-side theo `search`.

- [ ] **Step 7: Chạy test và lint**

Run: `cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong`
Expected: PASS toàn bộ (gồm cả `ghiNhanDoanhThu.test.ts`, `donHangChungTu.test.ts` đã có sẵn)

Run: `cd fe && npm run lint`
Expected: không lỗi mới ở các file vừa sửa.

- [ ] **Step 8: Chạy thử app**

Run: `cd fe && npm run dev`, mở `/trung-tam-du-lieu/hop-dong`. Kiểm:
1. Mặc định là **Năm hiện tại – Cả năm**; 8 thẻ hiện số.
2. Đổi kỳ sang một quý → bảng và cả 8 thẻ cùng đổi.
3. Chọn "Tùy chọn khoảng ngày" → hiện RangePicker; chọn khoảng → lọc đúng.
4. Lọc theo Khách hàng / Sản phẩm / Đơn hàng → thẻ đổi theo.
5. Bấm nút Đặt lại → về Năm hiện tại – Cả năm, xoá hết bộ lọc.
6. Cột "Ngày HĐ" hiện DD/MM/YYYY; đơn chưa có ngày ký hiện `-` và vẫn thấy được ở kỳ "Cả năm".

- [ ] **Step 9: Commit**

```bash
git add fe/src/services/theoDoiHopDongService.ts \
        fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx
git commit -m "feat(hop-dong): cột ngày HĐ, 4 bộ lọc và 8 thẻ báo cáo nhanh"
```

---

## Sau khi xong GĐ1

Deploy theo skill `db-deploy`: build + đẩy `master-data-service` (BE) và FE (verify ở `ketoan.masterceo.com.vn`, không phải `masterceo.com.vn`).

Rồi lập plan GĐ2 (endpoint `tong-hop-don-hang`, 4 cột kế toán, nhóm cột 3 tầng, cột Ghi chú) từ cùng file spec.
