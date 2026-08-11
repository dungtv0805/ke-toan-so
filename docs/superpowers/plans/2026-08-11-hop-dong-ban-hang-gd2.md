# Trang Bán hàng — GĐ2 (Số liệu kế toán) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bảng Bán hàng hiện 4 cột lấy thẳng từ chứng từ (Đã thu, DT chưa thực hiện, DT đã thực hiện, Chưa xuất HĐ), gom cột theo 3 nhóm Bán hàng – Thu tiền – Chứng từ, và cột Ghi chú bấm được để sinh bút toán đặt sẵn.

**Architecture:** Một endpoint tổng hợp mới ở voucher-service gom chứng từ theo `danhMuc.hopDong.soHopDong`; FE gọi song song với danh sách đơn hàng rồi ghép theo số HĐ. Logic phân loại tài khoản và logic quyết định chip Ghi chú đều là hàm thuần có unit test; component chỉ hiển thị.

**Tech Stack:** NestJS 11 + TypeORM MongoRepository (BE, jest) · React 18 + antd 6 (FE, vitest)

## Global Constraints

- Nhánh: `feat/hop-dong-ban-hang`. Spec gốc: `docs/superpowers/specs/2026-08-11-hop-dong-ban-hang-design.md`. GĐ1 đã xong (commit `05b9c14`).
- **Node không có sẵn trong PATH của shell không tương tác.** Mọi lệnh phải mở đầu bằng:
  `export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"`
- **Baseline đỏ sẵn**: FE `tsc --noEmit -p tsconfig.app.json` có đúng **172 lỗi** không liên quan; BE `yarn test` fail sẵn 13 suite. Chỉ chạy test hẹp theo đường dẫn, và so số lỗi tsc với 172 chứ đừng đòi 0.
- **`vitest` không typecheck** — sau mỗi task FE phải chạy `tsc` mới yên tâm (GĐ1 đã dính một lỗi overload `reduce` mà test vẫn xanh).
- Prefix tài khoản dùng `startsWith`, không so bằng: công ty dùng TK con `1121`, `33871`, `5113`, `1311`.
- Gom nhóm khoá theo **mã**, không theo tên.
- Bốn số luỹ kế (`daThu`, `dtChuaThucHien`, `dtDaThucHien`) **không** cắt theo kỳ lọc — cắt thì "Còn phải thu" sai. Chỉ `dtTheoThang` giới hạn trong năm.
- Bút toán sinh ra là chứng từ Nhật ký chung `loai: 'KHAC'`, sửa/xoá ở Nhật ký chung.

---

## File Structure

**Backend (voucher-service)**
- `be/apps/voucher-service/src/nhat-ky-chung/helpers/tong-hop-don-hang.helper.ts` *(mới)* — hàm thuần gom số
- `.../helpers/tong-hop-don-hang.helper.spec.ts` *(mới)*
- `.../helpers/index.ts` — export thêm
- `.../nhat-ky-chung.service.ts` — method `tongHopDonHang(nam)`
- `.../nhat-ky-chung.controller.ts` — route `GET /nhat-ky-chung/tong-hop-don-hang`

**Frontend — dữ liệu**
- `fe/src/services/nhatKyChungService.ts` — `getTongHopDonHang(nam)`
- `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx` — ghép, cột, nhóm cột

**Frontend — logic thuần + component dùng chung (mới)**
- `fe/src/pages/trung-tam-du-lieu/hop-dong/ghiChuDonHang.ts` + `.test.ts` — quyết định chip
- `fe/src/pages/trung-tam-du-lieu/hop-dong/ButToanDonHangModal.tsx` *(mới)* — modal bút toán dùng chung
- `fe/src/pages/trung-tam-du-lieu/hop-dong/GhiNhanDoanhThuSection.tsx` — dùng lại modal chung
- `fe/src/pages/trung-tam-du-lieu/hop-dong/ThuTienDonHangModal.tsx` — thêm prop `renderTrigger`

---

### Task 6: BE — endpoint tổng hợp theo đơn hàng

**Files:**
- Create: `be/apps/voucher-service/src/nhat-ky-chung/helpers/tong-hop-don-hang.helper.ts`
- Create: `be/apps/voucher-service/src/nhat-ky-chung/helpers/tong-hop-don-hang.helper.spec.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/helpers/index.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts`

**Interfaces:**
- Consumes: `ChungTu` (`soTien`, `ngay`, `danhMuc.taiKhoanNo.ma`, `danhMuc.taiKhoanCo.ma`, `danhMuc.hopDong.soHopDong`, `danhMuc.sanPham.ma/.ten`)
- Produces:
  - `TK_TIEN = ['111', '112']`, `TK_CHUA_THUC_HIEN = '3387'`, `TK_DOANH_THU = '511'`
  - `interface DongHachToan { ngay?: Date | string; soTien?: number; taiKhoanNo?: string; taiKhoanCo?: string; soHopDong?: string; sanPhamMa?: string; sanPhamTen?: string }`
  - `interface TongHopDonHang { soHopDong: string; daThu: number; dtChuaThucHien: number; dtDaThucHien: number; dtTheoThang: number[] }`
  - `interface DoanhThuKhongDon { sanPhamMa: string; sanPhamTen: string; dtTheoThang: number[] }`
  - `gomTongHopDonHang(rows: DongHachToan[], nam: number): { theoDonHang: TongHopDonHang[]; khongCoDonHang: DoanhThuKhongDon[] }`
  - Route `GET /voucher/nhat-ky-chung/tong-hop-don-hang?nam=2026` → `{ success: true, data: { theoDonHang, khongCoDonHang } }`

- [ ] **Step 1: Viết test thất bại**

Tạo `be/apps/voucher-service/src/nhat-ky-chung/helpers/tong-hop-don-hang.helper.spec.ts`:

```ts
import { gomTongHopDonHang, DongHachToan } from './tong-hop-don-hang.helper';

const dong = (d: Partial<DongHachToan>): DongHachToan => ({
  ngay: '2026-03-10',
  soTien: 0,
  ...d,
});

describe('gomTongHopDonHang', () => {
  it('không có dòng nào thì trả 2 mảng rỗng', () => {
    expect(gomTongHopDonHang([], 2026)).toEqual({
      theoDonHang: [],
      khongCoDonHang: [],
    });
  });

  it('cộng đã thu từ Nợ 111 và Nợ 112', () => {
    const r = gomTongHopDonHang(
      [
        dong({ soHopDong: 'HD01', taiKhoanNo: '1111', taiKhoanCo: '3387', soTien: 100 }),
        dong({ soHopDong: 'HD01', taiKhoanNo: '1121', taiKhoanCo: '3387', soTien: 200 }),
      ],
      2026,
    );
    expect(r.theoDonHang[0].daThu).toBe(300);
  });

  it('doanh thu chưa thực hiện = Có 3387 trừ Nợ 3387', () => {
    const r = gomTongHopDonHang(
      [
        dong({ soHopDong: 'HD01', taiKhoanNo: '1121', taiKhoanCo: '33871', soTien: 500 }),
        dong({ soHopDong: 'HD01', taiKhoanNo: '33871', taiKhoanCo: '5113', soTien: 200 }),
      ],
      2026,
    );
    expect(r.theoDonHang[0].dtChuaThucHien).toBe(300);
    expect(r.theoDonHang[0].dtDaThucHien).toBe(200);
  });

  it('3387 bị ghi âm thì chặn về 0, không trả số âm', () => {
    const r = gomTongHopDonHang(
      [dong({ soHopDong: 'HD01', taiKhoanNo: '3387', taiKhoanCo: '511', soTien: 900 })],
      2026,
    );
    expect(r.theoDonHang[0].dtChuaThucHien).toBe(0);
    expect(r.theoDonHang[0].dtDaThucHien).toBe(900);
  });

  it('TK con dài hơn vẫn khớp prefix', () => {
    const r = gomTongHopDonHang(
      [dong({ soHopDong: 'HD01', taiKhoanNo: '11211', taiKhoanCo: '51131', soTien: 50 })],
      2026,
    );
    expect(r.theoDonHang[0].daThu).toBe(50);
    expect(r.theoDonHang[0].dtDaThucHien).toBe(50);
  });

  it('TK 5111 không nhầm với 511 của đơn khác và 3388 không nhầm 3387', () => {
    const r = gomTongHopDonHang(
      [dong({ soHopDong: 'HD01', taiKhoanNo: '1121', taiKhoanCo: '3388', soTien: 700 })],
      2026,
    );
    expect(r.theoDonHang[0].dtChuaThucHien).toBe(0);
    expect(r.theoDonHang[0].dtDaThucHien).toBe(0);
    expect(r.theoDonHang[0].daThu).toBe(700);
  });

  it('tách theo từng đơn hàng', () => {
    const r = gomTongHopDonHang(
      [
        dong({ soHopDong: 'HD01', taiKhoanCo: '511', soTien: 100 }),
        dong({ soHopDong: 'HD02', taiKhoanCo: '511', soTien: 250 }),
      ],
      2026,
    );
    const byId = Object.fromEntries(r.theoDonHang.map((x) => [x.soHopDong, x]));
    expect(byId['HD01'].dtDaThucHien).toBe(100);
    expect(byId['HD02'].dtDaThucHien).toBe(250);
  });

  it('dtTheoThang có 12 phần tử, đặt đúng tháng của ngày chứng từ', () => {
    const r = gomTongHopDonHang(
      [
        dong({ soHopDong: 'HD01', taiKhoanCo: '511', soTien: 10, ngay: '2026-01-05' }),
        dong({ soHopDong: 'HD01', taiKhoanCo: '511', soTien: 20, ngay: '2026-12-31' }),
      ],
      2026,
    );
    const t = r.theoDonHang[0].dtTheoThang;
    expect(t).toHaveLength(12);
    expect(t[0]).toBe(10);
    expect(t[11]).toBe(20);
    expect(t.reduce((s, x) => s + x, 0)).toBe(30);
  });

  it('doanh thu năm khác không vào dtTheoThang nhưng vẫn vào luỹ kế', () => {
    const r = gomTongHopDonHang(
      [dong({ soHopDong: 'HD01', taiKhoanCo: '511', soTien: 80, ngay: '2025-06-01' })],
      2026,
    );
    expect(r.theoDonHang[0].dtDaThucHien).toBe(80);
    expect(r.theoDonHang[0].dtTheoThang.reduce((s, x) => s + x, 0)).toBe(0);
  });

  it('511 không gắn đơn hàng gom theo mã sản phẩm', () => {
    const r = gomTongHopDonHang(
      [
        dong({ taiKhoanCo: '511', soTien: 30, sanPhamMa: 'SP1', sanPhamTen: 'Sản phẩm 1' }),
        dong({ taiKhoanCo: '511', soTien: 40, sanPhamMa: 'SP1', sanPhamTen: 'Sản phẩm 1' }),
      ],
      2026,
    );
    expect(r.theoDonHang).toHaveLength(0);
    expect(r.khongCoDonHang).toHaveLength(1);
    expect(r.khongCoDonHang[0].sanPhamMa).toBe('SP1');
    expect(r.khongCoDonHang[0].dtTheoThang[2]).toBe(70);
  });

  it('hai sản phẩm trùng tên khác mã không bị gộp', () => {
    const r = gomTongHopDonHang(
      [
        dong({ taiKhoanCo: '511', soTien: 30, sanPhamMa: 'SP1', sanPhamTen: 'Trùng tên' }),
        dong({ taiKhoanCo: '511', soTien: 40, sanPhamMa: 'SP2', sanPhamTen: 'Trùng tên' }),
      ],
      2026,
    );
    expect(r.khongCoDonHang).toHaveLength(2);
  });

  it('511 không đơn hàng và không sản phẩm gom vào mã rỗng', () => {
    const r = gomTongHopDonHang([dong({ taiKhoanCo: '511', soTien: 15 })], 2026);
    expect(r.khongCoDonHang[0].sanPhamMa).toBe('');
  });

  it('dòng không đơn hàng và không phải 511 thì bỏ qua', () => {
    const r = gomTongHopDonHang(
      [dong({ taiKhoanNo: '1121', taiKhoanCo: '131', soTien: 999 })],
      2026,
    );
    expect(r.theoDonHang).toHaveLength(0);
    expect(r.khongCoDonHang).toHaveLength(0);
  });

  it('soTien dạng chuỗi vẫn cộng đúng', () => {
    const r = gomTongHopDonHang(
      [
        dong({
          soHopDong: 'HD01',
          taiKhoanCo: '511',
          soTien: '250' as unknown as number,
        }),
      ],
      2026,
    );
    expect(r.theoDonHang[0].dtDaThucHien).toBe(250);
  });

  it('ngay dạng Date vẫn đọc đúng tháng', () => {
    const r = gomTongHopDonHang(
      [
        dong({
          soHopDong: 'HD01',
          taiKhoanCo: '511',
          soTien: 60,
          ngay: new Date(Date.UTC(2026, 6, 15)),
        }),
      ],
      2026,
    );
    expect(r.theoDonHang[0].dtTheoThang[6]).toBe(60);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd be && npx jest apps/voucher-service/src/nhat-ky-chung/helpers/tong-hop-don-hang --silent
```
Expected: FAIL — `Cannot find module './tong-hop-don-hang.helper'`

- [ ] **Step 3: Viết helper**

Tạo `be/apps/voucher-service/src/nhat-ky-chung/helpers/tong-hop-don-hang.helper.ts`:

```ts
/** TK tiền — Nợ vào đây là một lần thu tiền của đơn hàng. */
export const TK_TIEN = ['111', '112'];
/** Doanh thu chưa thực hiện. */
export const TK_CHUA_THUC_HIEN = '3387';
/** Doanh thu đã thực hiện. */
export const TK_DOANH_THU = '511';

const num = (v: unknown): number => Number(v) || 0;
const laTk = (ma: string | undefined, prefix: string) => Boolean(ma?.startsWith(prefix));

/** Một bút toán đã rút gọn về đúng các trường cần cho tổng hợp. */
export interface DongHachToan {
  ngay?: Date | string;
  soTien?: number;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  soHopDong?: string;
  sanPhamMa?: string;
  sanPhamTen?: string;
}

export interface TongHopDonHang {
  soHopDong: string;
  /** Σ Nợ 111* + Nợ 112*, luỹ kế toàn thời gian. */
  daThu: number;
  /** max(0, Σ Có 3387* − Σ Nợ 3387*), luỹ kế. */
  dtChuaThucHien: number;
  /** Σ Có 511*, luỹ kế. */
  dtDaThucHien: number;
  /** Σ Có 511* theo tháng, chỉ các chứng từ trong năm được hỏi. 12 phần tử. */
  dtTheoThang: number[];
}

export interface DoanhThuKhongDon {
  sanPhamMa: string;
  sanPhamTen: string;
  dtTheoThang: number[];
}

const thangCuaNam = (ngay: Date | string | undefined, nam: number): number | null => {
  if (!ngay) return null;
  const d = ngay instanceof Date ? ngay : new Date(ngay);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear() === nam ? d.getUTCMonth() : null;
};

/**
 * Gom bút toán theo đơn hàng: tiền đã thu, doanh thu chưa/đã thực hiện, và doanh thu
 * theo từng tháng của năm được hỏi.
 *
 * Ba số luỹ kế cố ý KHÔNG cắt theo năm — "còn phải thu" của một đơn hàng là số của cả
 * đời đơn hàng đó, cắt theo kỳ thì sai. Chỉ `dtTheoThang` giới hạn trong `nam`.
 *
 * Dòng Có 511 không gắn đơn hàng vẫn được giữ, gom theo mã sản phẩm, để bảng doanh thu
 * theo sản phẩm không bị hụt so với sổ cái 511.
 */
export function gomTongHopDonHang(
  rows: DongHachToan[],
  nam: number,
): { theoDonHang: TongHopDonHang[]; khongCoDonHang: DoanhThuKhongDon[] } {
  const theoDon = new Map<string, TongHopDonHang>();
  const treoNo = new Map<string, number>();
  const khongDon = new Map<string, DoanhThuKhongDon>();

  for (const r of rows) {
    const tien = num(r.soTien);
    const thang = thangCuaNam(r.ngay, nam);
    const laDoanhThu = laTk(r.taiKhoanCo, TK_DOANH_THU);

    if (!r.soHopDong) {
      if (!laDoanhThu) continue;
      const ma = r.sanPhamMa || '';
      const cur: DoanhThuKhongDon = khongDon.get(ma) ?? {
        sanPhamMa: ma,
        sanPhamTen: r.sanPhamTen || '',
        dtTheoThang: Array(12).fill(0) as number[],
      };
      if (thang != null) cur.dtTheoThang[thang] += tien;
      khongDon.set(ma, cur);
      continue;
    }

    const cur: TongHopDonHang = theoDon.get(r.soHopDong) ?? {
      soHopDong: r.soHopDong,
      daThu: 0,
      dtChuaThucHien: 0,
      dtDaThucHien: 0,
      dtTheoThang: Array(12).fill(0) as number[],
    };

    if (TK_TIEN.some((p) => laTk(r.taiKhoanNo, p))) cur.daThu += tien;
    if (laTk(r.taiKhoanCo, TK_CHUA_THUC_HIEN)) cur.dtChuaThucHien += tien;
    if (laTk(r.taiKhoanNo, TK_CHUA_THUC_HIEN)) {
      treoNo.set(r.soHopDong, (treoNo.get(r.soHopDong) || 0) + tien);
    }
    if (laDoanhThu) {
      cur.dtDaThucHien += tien;
      if (thang != null) cur.dtTheoThang[thang] += tien;
    }

    theoDon.set(r.soHopDong, cur);
  }

  for (const [so, don] of theoDon) {
    don.dtChuaThucHien = Math.max(0, don.dtChuaThucHien - (treoNo.get(so) || 0));
  }

  return {
    theoDonHang: [...theoDon.values()],
    khongCoDonHang: [...khongDon.values()],
  };
}
```

- [ ] **Step 4: Chạy lại test**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd be && npx jest apps/voucher-service/src/nhat-ky-chung/helpers/tong-hop-don-hang --silent
```
Expected: PASS — 15 test

- [ ] **Step 5: Export helper**

`be/apps/voucher-service/src/nhat-ky-chung/helpers/index.ts` — thêm dòng cuối:

```ts
export * from './tong-hop-don-hang.helper';
```

- [ ] **Step 6: Thêm method vào service**

`be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts` — sửa dòng import helpers thành:

```ts
import {
  buildMongoQuery,
  buildSummaryAggregation,
  mergeDoiTuongBuckets,
  DoiTuongBucket,
  gomTongHopDonHang,
  DongHachToan,
  TongHopDonHang,
  DoanhThuKhongDon,
} from './helpers';
```

Thêm method ngay trước `async findById(`:

```ts
  /**
   * Tổng hợp theo đơn hàng cho trang Bán hàng: tiền đã thu, doanh thu chưa/đã thực
   * hiện, và doanh thu 511 theo tháng của `nam`.
   *
   * Chỉ nạp các chứng từ có gắn đơn hàng hoặc có Có 511 — không quét cả sổ. Việc gom
   * làm ở JS (không phải pipeline Mongo) vì phải khớp prefix tài khoản: công ty dùng
   * TK con 1121 / 33871 / 5113.
   */
  async tongHopDonHang(nam: number): Promise<{
    success: boolean;
    data: { theoDonHang: TongHopDonHang[]; khongCoDonHang: DoanhThuKhongDon[] };
  }> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const docs = await this.chungTuRepository
      .aggregate([
        {
          $match: {
            ...(tenantId ? { tenantId } : {}),
            $or: [
              { 'danhMuc.hopDong.soHopDong': { $nin: [null, ''] } },
              { 'danhMuc.taiKhoanCo.ma': { $regex: '^511' } },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            ngay: 1,
            soTien: 1,
            taiKhoanNo: '$danhMuc.taiKhoanNo.ma',
            taiKhoanCo: '$danhMuc.taiKhoanCo.ma',
            soHopDong: '$danhMuc.hopDong.soHopDong',
            sanPhamMa: '$danhMuc.sanPham.ma',
            sanPhamTen: '$danhMuc.sanPham.ten',
          },
        },
      ])
      .toArray();

    return { success: true, data: gomTongHopDonHang(docs as DongHachToan[], nam) };
  }
```

- [ ] **Step 7: Thêm route vào controller**

`be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts` — chèn **ngay sau** method `chiPhiKhongDuocTru` và **trước** `@Get(':id')`:

```ts
  @Get('tong-hop-don-hang')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async tongHopDonHang(@Query('nam', ParseIntPipe) nam: number) {
    return this.nhatKyChungService.tongHopDonHang(nam);
  }
```

**Thứ tự route là bắt buộc**: `@Get(':id')` đứng trước sẽ nuốt `/tong-hop-don-hang` và trả lỗi không tìm thấy bút toán.

- [ ] **Step 8: Build + chạy lại test**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd be && npx nest build voucher-service
cd be && npx jest apps/voucher-service/src/nhat-ky-chung --silent
```
Expected: build thành công; các suite `nhat-ky-chung` pass (so với baseline, không thêm suite đỏ).

- [ ] **Step 9: Commit**

```bash
git add be/apps/voucher-service/src/nhat-ky-chung/
git commit -m "feat(hop-dong): endpoint tổng hợp chứng từ theo đơn hàng"
```

---

### Task 7: FE — gọi endpoint và ghép vào bảng

**Files:**
- Modify: `fe/src/services/nhatKyChungService.ts`
- Modify: `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx`

**Interfaces:**
- Consumes: route `GET /voucher/nhat-ky-chung/tong-hop-don-hang?nam=` (Task 6)
- Produces:
  - `interface TongHopDonHang { soHopDong: string; daThu: number; dtChuaThucHien: number; dtDaThucHien: number; dtTheoThang: number[] }` (export từ `nhatKyChungService.ts`)
  - `interface DoanhThuKhongDon { sanPhamMa: string; sanPhamTen: string; dtTheoThang: number[] }`
  - `nhatKyChungService.getTongHopDonHang(nam: number): Promise<{ theoDonHang: TongHopDonHang[]; khongCoDonHang: DoanhThuKhongDon[] }>`
  - Trong page: `type DongBang = TheoDoiHopDongRow & { daThu: number; dtChuaThucHien: number; dtDaThucHien: number; daXuatHoaDon: number; chuaXuatHoaDon: number; conPhaiThu: number; mocDoanhThu: number }` — GĐ2 Task 9/11 dùng lại type này

- [ ] **Step 1: Thêm method vào service**

`fe/src/services/nhatKyChungService.ts` — thêm export interface cạnh `NhatKyChungStats` ở đầu file:

```ts
export interface TongHopDonHang {
  soHopDong: string;
  daThu: number;
  dtChuaThucHien: number;
  dtDaThucHien: number;
  /** 12 phần tử — doanh thu 511 theo tháng của năm được hỏi. */
  dtTheoThang: number[];
}

export interface DoanhThuKhongDon {
  sanPhamMa: string;
  sanPhamTen: string;
  dtTheoThang: number[];
}
```

và thêm method vào class, ngay sau `getByHopDong`:

```ts
  /**
   * Tổng hợp chứng từ theo đơn hàng (tiền đã thu, doanh thu chưa/đã thực hiện).
   * Ba số đầu là luỹ kế toàn thời gian; `dtTheoThang` chỉ trong `nam`.
   */
  async getTongHopDonHang(nam: number): Promise<{
    theoDonHang: TongHopDonHang[];
    khongCoDonHang: DoanhThuKhongDon[];
  }> {
    return this.get({ endpoint: '/tong-hop-don-hang', params: { nam } });
  }
```

- [ ] **Step 2: Nạp dữ liệu tổng hợp trong page**

`QuanLyHopDongPage.tsx` — thêm import:

```tsx
import {
  nhatKyChungService,
  type TongHopDonHang,
} from '@/services/nhatKyChungService';
```

Thêm state cạnh `sanPhamList`:

```tsx
  const [tongHop, setTongHop] = useState<Record<string, TongHopDonHang>>({});
```

Thêm hàm nạp và effect, ngay sau `loadList`:

```tsx
  // Số kế toán phụ thuộc năm đang lọc (cột theo tháng), nên nạp lại khi đổi năm.
  const loadTongHop = useCallback(async (nam: number) => {
    try {
      const res = await nhatKyChungService.getTongHopDonHang(nam);
      const m: Record<string, TongHopDonHang> = {};
      res.theoDonHang.forEach((t) => {
        m[t.soHopDong] = t;
      });
      setTongHop(m);
    } catch {
      message.error('Không tải được số liệu chứng từ theo đơn hàng');
    }
  }, []);

  useEffect(() => {
    loadTongHop(loc.nam);
  }, [loc.nam, loadTongHop]);
```

Thêm `useCallback` vào import `react` ở dòng đầu file.

- [ ] **Step 3: Ghép số vào từng dòng**

Thêm type và bước làm giàu ngay **trước** `viewRows`:

```tsx
  /** Dòng bảng = đơn hàng + số kế toán đã ghép + các số suy ra. */
  type DongBang = TheoDoiHopDongRow & {
    daThu: number;
    dtChuaThucHien: number;
    dtDaThucHien: number;
    daXuatHoaDon: number;
    chuaXuatHoaDon: number;
    conPhaiThu: number;
    /** Mốc so sánh doanh thu — giá trị trước thuế của đơn hàng. */
    mocDoanhThu: number;
  };

  const fullRows = useMemo<DongBang[]>(
    () =>
      rows.map((r) => {
        const t = tongHop[r.soHopDong];
        const doanhSo = Number(r.giaTriSauThue) || 0;
        const daXuatHoaDon = Number(r.daTraHoaDon) || 0;
        return {
          ...r,
          daThu: t?.daThu ?? 0,
          dtChuaThucHien: t?.dtChuaThucHien ?? 0,
          dtDaThucHien: t?.dtDaThucHien ?? 0,
          daXuatHoaDon,
          chuaXuatHoaDon: doanhSo - daXuatHoaDon,
          conPhaiThu: doanhSo - (t?.daThu ?? 0),
          mocDoanhThu:
            Number(r.giaTriTruocThue) || doanhSo - (Number(r.tienThue) || 0),
        };
      }),
    [rows, tongHop],
  );
```

Đổi `viewRows` để lọc trên `fullRows` thay vì `rows` — sửa hai chỗ:

```tsx
  const viewRows = useMemo(() => {
    const getValue = cellValue(doiTuongMap, sanPhamMap);
    const tuKhoa = search.trim().toLowerCase();
    return fullRows.filter((r) => {
```

và mảng phụ thuộc:

```tsx
  }, [fullRows, matches, doiTuongMap, sanPhamMap, loc, khachHang, sanPham, donHang, search]);
```

Đổi `baoCao` để dùng số thật thay vì `daThanhToan`:

```tsx
  const baoCao = useMemo(() => tongHopBaoCaoNhanh(viewRows), [viewRows]);
```

`DongBang` đã có đúng tên trường `daThu` / `dtChuaThucHien` / `dtDaThucHien` / `daTraHoaDon` mà `DongBaoCao` cần, nên không phải map lại.

Đổi kiểu của bảng và các generic từ `TheoDoiHopDongRow` sang `DongBang`:
- `const columns: ColumnsType<DongBang> = [`
- mọi `filterable<TheoDoiHopDongRow>({...})` → `filterable<DongBang>({...})`
- `<Table<DongBang>` và `useTableTitleConfig('trungTamDuLieu.hopDong', columns)` giữ nguyên
- `cellValue` đổi tham số `r: TheoDoiHopDongRow` → `r: DongBang`

`openEditor(row)` nhận `DongBang` (là siêu tập của `TheoDoiHopDongRow`) nên không phải sửa; `current` giữ kiểu `TheoDoiHopDongRow | null`.

- [ ] **Step 4: Thêm 4 cột mới**

Trong `columns`, thay cụm cột tiền hiện tại. Bỏ cột "Thuế suất" (vẫn xem được trong Drawer) và cột "Còn lại" cũ (đã thay bằng "Còn phải thu"):

```tsx
    { title: 'Doanh số', dataIndex: 'giaTriSauThue', key: 'giaTriSauThue', width: 140, align: 'right', render: (v) => fmtCur(v) },
    { title: 'Tiền thuế', dataIndex: 'tienThue', key: 'tienThue', width: 120, align: 'right', render: (v) => fmtCur(v) },
    {
      title: 'DT chưa TH',
      dataIndex: 'dtChuaThucHien',
      key: 'dtChuaThucHien',
      width: 130,
      align: 'right',
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{fmtCur(v)}</Text>,
    },
    {
      title: 'DT đã TH',
      dataIndex: 'dtDaThucHien',
      key: 'dtDaThucHien',
      width: 130,
      align: 'right',
      render: (v: number) => <Text type="success">{fmtCur(v)}</Text>,
    },
    {
      title: 'Đã thu',
      dataIndex: 'daThu',
      key: 'daThu',
      width: 130,
      align: 'right',
      render: (v: number) => <Text type="success">{fmtCur(v)}</Text>,
    },
    {
      title: 'Còn phải thu',
      dataIndex: 'conPhaiThu',
      key: 'conPhaiThu',
      width: 140,
      align: 'right',
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{fmtCur(v)}</Text>,
    },
    { title: 'Đã xuất HĐ', dataIndex: 'daXuatHoaDon', key: 'daXuatHoaDon', width: 140, align: 'right', render: (v) => fmtCur(v) },
    {
      title: 'Chưa xuất HĐ',
      dataIndex: 'chuaXuatHoaDon',
      key: 'chuaXuatHoaDon',
      width: 140,
      align: 'right',
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{fmtCur(v)}</Text>,
    },
    {
      title: 'Quyết toán',
      key: 'quyetToan',
      width: 140,
      align: 'right',
      render: (_, r) => fmtCur(r.tracking?.quyetToan?.giaTri),
    },
```

Xoá các định nghĩa cũ của "Tiền thuế", "Giá trị", "Quyết toán", "Đã thanh toán", "Đã trả hóa đơn", "Còn lại", "Thuế suất" để không bị trùng.

- [ ] **Step 5: Typecheck, lint, test**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"
cd fe && npx eslint src/pages/trung-tam-du-lieu/hop-dong src/services/nhatKyChungService.ts
cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong
```
Expected: tsc **172** (bằng baseline); eslint không output; vitest 41 pass.

- [ ] **Step 6: Commit**

```bash
git add fe/src/services/nhatKyChungService.ts fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx
git commit -m "feat(hop-dong): 4 cột doanh thu và thu tiền lấy từ chứng từ"
```

---

### Task 8: FE — gom cột theo 3 nhóm

**Files:**
- Modify: `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx`

**Interfaces:**
- Consumes: `columns` phẳng (Task 7)
- Produces: `columns` dạng 2 tầng — Task 11 chèn cột Ghi chú vào nhóm ghim phải

antd nhóm cột bằng `children`. `useTableTitleConfig` và `useTableColumnFilters` làm việc trên từng cột con, nên phải gom **sau khi** đã chạy `useTableTitleConfig`, nếu không nút "Chọn cột" sẽ chỉ thấy 3 mục cha.

- [ ] **Step 1: Khai báo bảng nhóm ở mức module**

Thêm ngay dưới hằng `NAM_OPTIONS` ở đầu file (ngoài component, để không phải khai báo lại mỗi lần render và không lọt vào mảng phụ thuộc của `useMemo`):

```tsx
/**
 * Cột nào thuộc nhóm nào ở header tầng trên. Cột không có tên ở đây (Số HĐ, Ngày HĐ,
 * Khách hàng, Sản phẩm, Tên công trình, Phụ trách, Ghi chú, nút Theo dõi) đứng một
 * mình, không nằm trong nhóm nào.
 *
 * "Phụ trách" cố ý đứng ngoài: cột đó không có `key` (thêm key sẽ đưa nó vào "Chọn
 * cột" và người dùng từng lưu lựa chọn sẽ mất cột này cho tới khi tự tick lại).
 */
const NHOM_COT: Record<string, string[]> = {
  'BÁN HÀNG': ['giaTriSauThue', 'tienThue', 'dtChuaThucHien', 'dtDaThucHien'],
  'THU TIỀN': ['daThu', 'conPhaiThu'],
  'CHỨNG TỪ': ['daXuatHoaDon', 'chuaXuatHoaDon', 'quyetToan'],
};
```

- [ ] **Step 2: Gom nhóm sau khi cấu hình tiêu đề**

Thêm ngay **sau** dòng:

```tsx
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('trungTamDuLieu.hopDong', columns);
```

khối:

```tsx
  /**
   * Gom cột thành header 2 tầng. Phải chạy SAU useTableTitleConfig: hook đó đổi tiêu đề
   * và ẩn/hiện từng cột con, gom trước thì nó chỉ thấy 3 cột cha.
   */
  const groupedColumns = useMemo(() => {
    const key = (c: (typeof cfgColumns)[number]) =>
      String((c as { key?: React.Key; dataIndex?: React.Key }).key ??
        (c as { dataIndex?: React.Key }).dataIndex ?? '');
    const thuocNhom = new Map<string, string>();
    Object.entries(NHOM_COT).forEach(([nhom, keys]) =>
      keys.forEach((k) => thuocNhom.set(k, nhom)),
    );

    const out: typeof cfgColumns = [];
    const moc = new Map<string, number>();
    for (const c of cfgColumns) {
      const nhom = thuocNhom.get(key(c));
      if (!nhom) {
        out.push(c);
        continue;
      }
      let idx = moc.get(nhom);
      if (idx == null) {
        idx = out.length;
        moc.set(nhom, idx);
        out.push({ title: nhom, align: 'center', children: [] } as (typeof cfgColumns)[number]);
      }
      (out[idx] as { children: unknown[] }).children.push(c);
    }
    // Nhóm rỗng (người dùng ẩn hết cột con) thì bỏ đi cho khỏi trơ tiêu đề.
    return out.filter(
      (c) => !('children' in c) || (c as { children: unknown[] }).children.length > 0,
    );
  }, [cfgColumns]);
```

- [ ] **Step 3: Dùng `groupedColumns` cho Table**

```tsx
        <Table<DongBang>
          columns={groupedColumns}
```

- [ ] **Step 4: Typecheck, lint, test**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"
cd fe && npx eslint src/pages/trung-tam-du-lieu/hop-dong
cd fe && npm run build
```
Expected: tsc 172; eslint sạch; build OK.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx
git commit -m "feat(hop-dong): gom cột theo 3 nhóm Bán hàng - Thu tiền - Chứng từ"
```

---

### Task 9: FE — logic cột Ghi chú (hàm thuần)

**Files:**
- Create: `fe/src/pages/trung-tam-du-lieu/hop-dong/ghiChuDonHang.ts`
- Test: `fe/src/pages/trung-tam-du-lieu/hop-dong/ghiChuDonHang.test.ts`

**Interfaces:**
- Consumes: `DongBang` (Task 7) — chỉ cần 4 trường số
- Produces:
  - `type HanhDongDonHang = 'GHI_NHAN_DOANH_THU' | 'KET_CHUYEN_DOANH_THU' | 'THU_TIEN'`
  - `interface ChipGhiChu { hanhDong: HanhDongDonHang; nhan: string; soTien: number }`
  - `interface KetQuaGhiChu { chips: ChipGhiChu[]; nhanTinh: string[] }`
  - `function tinhGhiChuDonHang(r: { dtChuaThucHien: number; dtDaThucHien: number; mocDoanhThu: number; conPhaiThu: number }): KetQuaGhiChu`

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/pages/trung-tam-du-lieu/hop-dong/ghiChuDonHang.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tinhGhiChuDonHang } from './ghiChuDonHang';

const hanhDong = (r: Parameters<typeof tinhGhiChuDonHang>[0]) =>
  tinhGhiChuDonHang(r).chips.map((c) => c.hanhDong);

describe('tinhGhiChuDonHang', () => {
  it('chưa ghi nhận gì thì gợi ý ghi nhận doanh thu và thu tiền', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 0,
      dtDaThucHien: 0,
      mocDoanhThu: 1_000,
      conPhaiThu: 1_100,
    });
    expect(r.chips.map((c) => c.hanhDong)).toEqual([
      'GHI_NHAN_DOANH_THU',
      'THU_TIEN',
    ]);
    expect(r.chips[0].soTien).toBe(1_000);
    expect(r.chips[1].soTien).toBe(1_100);
  });

  it('còn 3387 treo thì gợi ý kết chuyển', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 400,
        dtDaThucHien: 600,
        mocDoanhThu: 1_000,
        conPhaiThu: 0,
      }),
    ).toEqual(['KET_CHUYEN_DOANH_THU']);
  });

  it('thỏa cả hai điều kiện doanh thu thì hiện cả hai chip', () => {
    const r = hanhDong({
      dtChuaThucHien: 300,
      dtDaThucHien: 200,
      mocDoanhThu: 1_000,
      conPhaiThu: 0,
    });
    expect(r).toEqual(['GHI_NHAN_DOANH_THU', 'KET_CHUYEN_DOANH_THU']);
  });

  it('số tiền ghi nhận = mốc trừ phần đã có', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 300,
      dtDaThucHien: 200,
      mocDoanhThu: 1_000,
      conPhaiThu: 0,
    });
    expect(r.chips[0].soTien).toBe(500);
  });

  it('số tiền kết chuyển = doanh thu chưa thực hiện', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 300,
      dtDaThucHien: 200,
      mocDoanhThu: 500,
      conPhaiThu: 0,
    });
    expect(r.chips[0].hanhDong).toBe('KET_CHUYEN_DOANH_THU');
    expect(r.chips[0].soTien).toBe(300);
  });

  it('ghi nhận đủ và thu đủ thì chỉ còn nhãn tĩnh', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 0,
      dtDaThucHien: 1_000,
      mocDoanhThu: 1_000,
      conPhaiThu: 0,
    });
    expect(r.chips).toEqual([]);
    expect(r.nhanTinh).toEqual(['Đã ghi nhận doanh thu', 'Đã thu tiền']);
  });

  it('lệch dưới 1 đồng coi như đủ (tránh chip ma do làm tròn)', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 0,
      dtDaThucHien: 999.5,
      mocDoanhThu: 1_000,
      conPhaiThu: 0.4,
    });
    expect(r.chips).toEqual([]);
  });

  it('thu vượt (còn phải thu âm) không gợi ý thu tiền', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 0,
        dtDaThucHien: 1_000,
        mocDoanhThu: 1_000,
        conPhaiThu: -50,
      }),
    ).toEqual([]);
  });

  it('mốc doanh thu bằng 0 thì không gợi ý ghi nhận', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 0,
        dtDaThucHien: 0,
        mocDoanhThu: 0,
        conPhaiThu: 0,
      }),
    ).toEqual([]);
  });

  it('ghi nhận vượt mốc cũng không gợi ý thêm', () => {
    expect(
      hanhDong({
        dtChuaThucHien: 0,
        dtDaThucHien: 2_000,
        mocDoanhThu: 1_000,
        conPhaiThu: 0,
      }),
    ).toEqual([]);
  });

  it('nhãn hiển thị đúng chữ', () => {
    const r = tinhGhiChuDonHang({
      dtChuaThucHien: 100,
      dtDaThucHien: 0,
      mocDoanhThu: 1_000,
      conPhaiThu: 500,
    });
    expect(r.chips.map((c) => c.nhan)).toEqual([
      'Ghi nhận doanh thu',
      'Kết chuyển doanh thu',
      'Thu tiền',
    ]);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong/ghiChuDonHang.test.ts
```
Expected: FAIL — không resolve được `./ghiChuDonHang`

- [ ] **Step 3: Viết `ghiChuDonHang.ts`**

```ts
/** Dung sai 1 đồng — số tiền lưu dạng decimal, so bằng tuyệt đối sẽ sinh chip ma. */
const DUNG_SAI = 1;

export type HanhDongDonHang =
  | 'GHI_NHAN_DOANH_THU'
  | 'KET_CHUYEN_DOANH_THU'
  | 'THU_TIEN';

export interface ChipGhiChu {
  hanhDong: HanhDongDonHang;
  nhan: string;
  /** Số tiền điền sẵn khi mở modal. */
  soTien: number;
}

export interface KetQuaGhiChu {
  /** Việc còn phải làm — mỗi chip bấm được, mở một modal đặt sẵn. */
  chips: ChipGhiChu[];
  /** Nhãn chỉ để đọc, hiện khi phần việc tương ứng đã xong. */
  nhanTinh: string[];
}

export interface SoLieuGhiChu {
  dtChuaThucHien: number;
  dtDaThucHien: number;
  /** Giá trị trước thuế của đơn hàng — mốc doanh thu phải ghi nhận. */
  mocDoanhThu: number;
  conPhaiThu: number;
}

/**
 * Cột Ghi chú của một đơn hàng: còn thiếu doanh thu thì gợi ý ghi nhận, còn 3387 treo
 * thì gợi ý kết chuyển, còn nợ thì gợi ý thu tiền. Hai điều kiện doanh thu có thể cùng
 * đúng — hiện cả hai để kế toán tự chọn việc cần làm trước.
 */
export function tinhGhiChuDonHang(r: SoLieuGhiChu): KetQuaGhiChu {
  const chips: ChipGhiChu[] = [];
  const nhanTinh: string[] = [];

  const thieuDoanhThu = r.mocDoanhThu - (r.dtChuaThucHien + r.dtDaThucHien);
  if (thieuDoanhThu > DUNG_SAI) {
    chips.push({
      hanhDong: 'GHI_NHAN_DOANH_THU',
      nhan: 'Ghi nhận doanh thu',
      soTien: thieuDoanhThu,
    });
  }

  if (r.dtChuaThucHien > DUNG_SAI) {
    chips.push({
      hanhDong: 'KET_CHUYEN_DOANH_THU',
      nhan: 'Kết chuyển doanh thu',
      soTien: r.dtChuaThucHien,
    });
  }

  if (thieuDoanhThu <= DUNG_SAI && r.dtChuaThucHien <= DUNG_SAI) {
    nhanTinh.push('Đã ghi nhận doanh thu');
  }

  if (r.conPhaiThu > DUNG_SAI) {
    chips.push({ hanhDong: 'THU_TIEN', nhan: 'Thu tiền', soTien: r.conPhaiThu });
  } else {
    nhanTinh.push('Đã thu tiền');
  }

  return { chips, nhanTinh };
}
```

- [ ] **Step 4: Chạy lại test**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong/ghiChuDonHang.test.ts
```
Expected: PASS — 11 test

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/trung-tam-du-lieu/hop-dong/ghiChuDonHang.ts fe/src/pages/trung-tam-du-lieu/hop-dong/ghiChuDonHang.test.ts
git commit -m "feat(hop-dong): logic gợi ý hành động cho cột Ghi chú"
```

---

### Task 10: FE — modal bút toán dùng chung

**Files:**
- Create: `fe/src/pages/trung-tam-du-lieu/hop-dong/ButToanDonHangModal.tsx`
- Modify: `fe/src/pages/trung-tam-du-lieu/hop-dong/GhiNhanDoanhThuSection.tsx`
- Modify: `fe/src/pages/trung-tam-du-lieu/hop-dong/ThuTienDonHangModal.tsx`

**Interfaces:**
- Consumes: `loadDonHangSnapshots`, `taiKhoanSnapshot`, `defaultTaiKhoan` (`donHangChungTu.ts`); `buildSanPhamSnapshot` (`@/utils/snapshotBuilder`)
- Produces:
  - `ButToanDonHangModal` props: `{ hopDong: TheoDoiHopDongRow; tkNoPrefix: string; tkCoPrefix: string; tieuDe: string; soTienMacDinh?: number; dienGiaiMacDinh: string; renderTrigger: (open: () => void) => React.ReactNode; onCreated: () => void }`
  - `ThuTienDonHangModal` thêm prop tuỳ chọn `renderTrigger?: (open: () => void) => React.ReactNode`

Cả hai modal bút toán (Nợ 131/Có 3387 và Nợ 3387/Có 511) khác nhau đúng ở cặp tài khoản và chữ hiển thị — tách một component dùng chung thay vì chép hai lần, và `GhiNhanDoanhThuSection` cũng dùng lại nó.

- [ ] **Step 1: Tạo `ButToanDonHangModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import {
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { SanPham, TaiKhoan, TheoDoiHopDongRow } from '@/types';
import { nhatKyChungService } from '@/services/nhatKyChungService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { sanPhamService } from '@/services/sanPhamService';
import { buildSanPhamSnapshot } from '@/utils/snapshotBuilder';
import { defaultTaiKhoan, loadDonHangSnapshots, taiKhoanSnapshot } from './donHangChungTu';

const { Text } = Typography;

interface FormValues {
  ngay: Dayjs;
  soTien: number;
  taiKhoanNo: string;
  taiKhoanCo: string;
  noiDung: string;
}

interface Props {
  hopDong: TheoDoiHopDongRow;
  /** Mã chuẩn của TK Nợ; khớp chính xác trước, không có thì lấy TK con đầu tiên. */
  tkNoPrefix: string;
  tkCoPrefix: string;
  tieuDe: string;
  soTienMacDinh?: number;
  dienGiaiMacDinh: string;
  /** Nút mở modal do nơi gọi vẽ — bảng dùng chip, Drawer dùng nút. */
  renderTrigger: (open: () => void) => React.ReactNode;
  onCreated: () => void;
}

/**
 * Modal sinh một bút toán Nhật ký chung gắn sẵn đơn hàng, khách hàng và sản phẩm.
 * Dùng chung cho "Ghi nhận doanh thu" (Nợ 131 / Có 3387) và "Kết chuyển doanh thu"
 * (Nợ 3387 / Có 511) — hai việc chỉ khác cặp tài khoản và chữ hiển thị.
 */
export default function ButToanDonHangModal({
  hopDong,
  tkNoPrefix,
  tkCoPrefix,
  tieuDe,
  soTienMacDinh,
  dienGiaiMacDinh,
  renderTrigger,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taiKhoanList, setTaiKhoanList] = useState<TaiKhoan[]>([]);
  const [sanPhamList, setSanPhamList] = useState<SanPham[]>([]);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    taiKhoanService.getLeafAccounts().then(setTaiKhoanList).catch(() => setTaiKhoanList([]));
    sanPhamService.getAll().then(setSanPhamList).catch(() => setSanPhamList([]));
  }, []);

  const openModal = () => {
    form.setFieldsValue({
      ngay: dayjs(),
      soTien: soTienMacDinh && soTienMacDinh > 0 ? Math.round(soTienMacDinh) : undefined,
      taiKhoanNo: defaultTaiKhoan(taiKhoanList, tkNoPrefix),
      taiKhoanCo: defaultTaiKhoan(taiKhoanList, tkCoPrefix),
      noiDung: dienGiaiMacDinh,
    } as FormValues);
    setOpen(true);
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const snap = await loadDonHangSnapshots(hopDong.hopDongId, hopDong.doiTuongId);
      const sp = sanPhamList.find((s) => s.id === hopDong.sanPhamId);

      await nhatKyChungService.create({
        loai: 'KHAC',
        ngay: v.ngay.format('YYYY-MM-DD'),
        ngayGhiSo: v.ngay.format('YYYY-MM-DD'),
        soTien: v.soTien,
        noiDung: v.noiDung,
        danhMuc: {
          taiKhoanNo: taiKhoanSnapshot(taiKhoanList, v.taiKhoanNo),
          taiKhoanCo: taiKhoanSnapshot(taiKhoanList, v.taiKhoanCo),
          hopDong: snap.hopDong,
          ...(sp ? { sanPham: buildSanPhamSnapshot(sp) } : {}),
          ...(snap.khachHang
            ? { doiTuong: snap.khachHang, doiTuong2: snap.khachHang }
            : {}),
        },
      });
      message.success(`${tieuDe} thành công`);
      setOpen(false);
      onCreated();
    } catch (e) {
      const err = e as { errorFields?: unknown; message?: string };
      if (!err.errorFields) message.error(err.message || `${tieuDe} thất bại`);
    } finally {
      setSaving(false);
    }
  };

  const taiKhoanOptions = taiKhoanList.map((tk) => ({
    value: tk.ma,
    label: `${tk.ma} - ${tk.ten}`,
  }));

  return (
    <>
      {renderTrigger(openModal)}

      <Modal
        title={`${tieuDe} — ${hopDong.soHopDong}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Lưu bút toán"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-3">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item
                name="ngay"
                label="Ngày"
                rules={[{ required: true, message: 'Chọn ngày' }]}
                tooltip="Doanh thu lên báo cáo theo tháng của ngày này"
              >
                <DatePicker format="DD/MM/YYYY" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                name="soTien"
                label="Số tiền"
                rules={[{ required: true, message: 'Nhập số tiền' }]}
              >
                <InputNumber<number>
                  className="w-full"
                  min={1}
                  controls={false}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => Number(`${v}`.replace(/,/g, ''))}
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="taiKhoanNo"
                label="TK Nợ"
                rules={[{ required: true, message: 'Chọn TK Nợ' }]}
              >
                <Select showSearch optionFilterProp="label" options={taiKhoanOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="taiKhoanCo"
                label="TK Có"
                rules={[{ required: true, message: 'Chọn TK Có' }]}
              >
                <Select showSearch optionFilterProp="label" options={taiKhoanOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="noiDung"
            label="Diễn giải"
            rules={[{ required: true, message: 'Nhập diễn giải' }]}
          >
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
          </Form.Item>
          <Text type="secondary" className="text-xs">
            Hệ thống tạo một chứng từ Nhật ký chung gắn sẵn đơn hàng, khách hàng và sản
            phẩm. Sửa hoặc xóa tại Chứng từ → Nhật ký chung.
          </Text>
        </Form>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: `GhiNhanDoanhThuSection` dùng lại modal chung**

Trong `GhiNhanDoanhThuSection.tsx`:

a) bỏ các import chỉ phục vụ modal cũ: `DatePicker`, `Form`, `Input`, `InputNumber`, `Modal`, `Row`, `Col`, `Select`, `dayjs`, `taiKhoanService`, `TaiKhoan`, `defaultTaiKhoan`, `loadDonHangSnapshots`, `taiKhoanSnapshot`. Giữ `Button`, `Table`, `Typography`, `message`, `PlusOutlined`, `dayjs` (cột "Ngày" vẫn dùng).

b) thêm:

```tsx
import ButToanDonHangModal from './ButToanDonHangModal';
```

c) xoá state `open`, `saving`, `taiKhoanList`, `form`, hàm `openModal`, `handleSubmit`, biến `taiKhoanOptions`, và toàn bộ khối `<Modal>…</Modal>`, cùng `useEffect` nạp `taiKhoanService`.

d) thay nút trong hàng tiêu đề:

```tsx
        {canEdit && (
          <Col>
            <ButToanDonHangModal
              hopDong={hopDong}
              tkNoPrefix={TK_CHUA_THUC_HIEN}
              tkCoPrefix={TK_DOANH_THU}
              tieuDe="Kết chuyển doanh thu"
              soTienMacDinh={tinhMacDinhGhiNhan(daThanhToan, daGhiNhan)}
              dienGiaiMacDinh={`Kết chuyển doanh thu ${hopDong.soHopDong}`}
              onCreated={load}
              renderTrigger={(open) => (
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={open}>
                  Ghi nhận doanh thu
                </Button>
              )}
            />
          </Col>
        )}
```

- [ ] **Step 3: `ThuTienDonHangModal` nhận `renderTrigger`**

Thêm vào `interface Props`:

```tsx
  /** Nút mở modal; mặc định là nút "+ Thu tiền". */
  renderTrigger?: (open: () => void) => React.ReactNode;
```

và thay phần render nút:

```tsx
      {renderTrigger ? (
        renderTrigger(openModal)
      ) : (
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openModal}>
          Thu tiền
        </Button>
      )}
```

- [ ] **Step 4: Typecheck, lint, test**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"
cd fe && npx eslint src/pages/trung-tam-du-lieu/hop-dong
cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong
```
Expected: tsc 172; eslint sạch; vitest 52 pass.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/trung-tam-du-lieu/hop-dong/
git commit -m "refactor(hop-dong): tách modal bút toán đơn hàng dùng chung"
```

---

### Task 11: FE — cột Ghi chú trong bảng

**Files:**
- Modify: `fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx`

**Interfaces:**
- Consumes: `tinhGhiChuDonHang` (Task 9); `ButToanDonHangModal`, `ThuTienDonHangModal` với `renderTrigger` (Task 10); `DongBang` (Task 7)
- Produces: (kết thúc GĐ2)

- [ ] **Step 1: Thêm import**

```tsx
import { tinhGhiChuDonHang } from './ghiChuDonHang';
import ButToanDonHangModal from './ButToanDonHangModal';
import { TK_CHUA_THUC_HIEN, TK_DOANH_THU } from './ghiNhanDoanhThu';
```

`TK_PHAI_THU` chưa có — thêm hằng ngay dưới phần import của page:

```tsx
/** Phải thu khách hàng — TK Nợ khi ghi nhận doanh thu chưa thực hiện. */
const TK_PHAI_THU = '131';
```

- [ ] **Step 2: Hàm tải lại sau khi tạo bút toán**

Sau khi lưu bút toán, chỉ cần nạp lại số tổng hợp (danh sách đơn hàng không đổi):

```tsx
  const refreshTongHop = useCallback(() => {
    loadTongHop(loc.nam);
  }, [loadTongHop, loc.nam]);
```

Chip "Thu tiền" ghi cả Sổ thu tiền lẫn phiếu thu → phải nạp lại cả hai:

```tsx
  const refreshSauThuTien = useCallback(() => {
    loadList();
    loadTongHop(loc.nam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTongHop, loc.nam]);
```

- [ ] **Step 3: Thêm cột Ghi chú**

Chèn ngay **trước** cột `action` (nút Theo dõi), để nó nằm trong phần ghim phải:

```tsx
    {
      title: 'Ghi chú',
      key: 'ghiChu',
      width: 210,
      fixed: 'right',
      render: (_, r) => {
        const { chips, nhanTinh } = tinhGhiChuDonHang(r);
        if (!canEdit) {
          return <Text type="secondary" className="text-xs">{nhanTinh.join(' · ') || '-'}</Text>;
        }
        return (
          <div className="flex flex-col items-start gap-1">
            {chips.map((c) => {
              const chip = (open: () => void) => (
                <Button key={c.hanhDong} type="link" size="small" className="!px-0 !h-auto" onClick={open}>
                  {c.nhan}
                </Button>
              );
              if (c.hanhDong === 'THU_TIEN') {
                return (
                  <ThuTienDonHangModal
                    key={c.hanhDong}
                    hopDong={r}
                    soLanDaThu={0}
                    onCreated={refreshSauThuTien}
                    renderTrigger={chip}
                  />
                );
              }
              const ketChuyen = c.hanhDong === 'KET_CHUYEN_DOANH_THU';
              return (
                <ButToanDonHangModal
                  key={c.hanhDong}
                  hopDong={r}
                  tkNoPrefix={ketChuyen ? TK_CHUA_THUC_HIEN : TK_PHAI_THU}
                  tkCoPrefix={ketChuyen ? TK_DOANH_THU : TK_CHUA_THUC_HIEN}
                  tieuDe={c.nhan}
                  soTienMacDinh={c.soTien}
                  dienGiaiMacDinh={`${c.nhan} ${r.soHopDong}`}
                  onCreated={refreshTongHop}
                  renderTrigger={chip}
                />
              );
            })}
            {nhanTinh.map((n) => (
              <Text key={n} type="secondary" className="text-xs">{n}</Text>
            ))}
          </div>
        );
      },
    },
```

`soLanDaThu={0}` là cố ý: trong bảng chưa nạp danh sách khoản thu của từng đơn, và trường `lan` chỉ để đánh số tham khảo trong Sổ thu tiền — thu từ Drawer vẫn đánh số đúng.

- [ ] **Step 4: Bảng phải cuộn ngang để cột ghim phải có tác dụng**

Đổi `scroll` của Table thành:

```tsx
          scroll={{ x: 'max-content' }}
```

Cột ghim (`fixed: 'right'`) chỉ hoạt động khi bảng cuộn ngang được; bảng giờ có 16 cột nên luôn rộng hơn khung.

- [ ] **Step 5: Typecheck, lint, test, build**

```bash
export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"
cd fe && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"
cd fe && npx eslint src/pages/trung-tam-du-lieu/hop-dong
cd fe && npx vitest run src/pages/trung-tam-du-lieu/hop-dong
cd fe && npm run build
```
Expected: tsc 172; eslint sạch; vitest 52 pass; build OK.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/trung-tam-du-lieu/hop-dong/QuanLyHopDongPage.tsx
git commit -m "feat(hop-dong): cột Ghi chú sinh bút toán đặt sẵn từ bảng"
```

---

## Sau khi xong GĐ2

Chưa deploy vội — GĐ3 (2 bảng pivot) chỉ đụng FE, gộp một lần deploy sẽ gọn hơn. Nếu muốn nghiệm thu sớm thì deploy `voucher-service` + `master-data-service` + FE theo skill `db-deploy`, verify ở `ketoan.masterceo.com.vn`.
