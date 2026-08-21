# Kế hoạch — tab KQKD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay khung "Sắp có" của tab KQKD trong trang Kế hoạch bằng báo cáo kết quả kinh doanh đọc thẳng từ các dòng kế hoạch, dùng đúng công thức của báo cáo KQKD bên Báo cáo tài chính.

**Architecture:** Bản đồ "mã chỉ tiêu ↔ prefix tài khoản ↔ bên Nợ/Có" tách ra `@app/core` để hai báo cáo (BCTC và kế hoạch) không thể lệch công thức. voucher-service gom `ke_hoach` theo 12 tháng bằng một hàm thuần, tra nhóm sản phẩm / nhóm khoản mục qua master-data, trả về cây 3 cấp chỉ chứa 12 số tháng. FE cộng ra năm / 6 tháng / quý / % lúc dựng bảng.

**Tech Stack:** NestJS 11 + TypeORM/MongoDB (BE, jest), React 18 + antd + CHanlder (FE, vitest).

**Spec:** `docs/superpowers/specs/2026-08-21-ke-hoach-kqkd-design.md`

## Global Constraints

- Toàn bộ định danh, comment và chuỗi hiển thị viết **tiếng Việt**, bám lối đặt tên sẵn có (`layTheoNam`, `theoTenant`, `chuanHoaThang`).
- `thang` **luôn đúng 12 phần tử**, chỉ số 0 là T1.
- Tháng đọc từ `ngay` theo **UTC** (`getUTCMonth`, `$month` mặc định UTC). Đọc theo giờ VN thì dòng ngày 01/03 rơi về tháng 2.
- Mọi truy vấn `ke_hoach` đi qua `KeHoachService.theoTenant`.
- Gọi master-data **phải** truyền cả `Authorization` lẫn `x-tenant-id`, và gọi vào route `/all` (route gốc phân trang).
- Không lưu giá trị suy ra: năm, 6 tháng, quý, % đều tính lúc hiển thị.
- BE `yarn test` đỏ sẵn 13 suite từ trước — **chạy hẹp theo file**, đừng chạy cả bộ rồi kết luận mình làm hỏng.
- `tsc` lỗi sẵn ở cả BE lẫn FE; `vite build` không typecheck. Dùng test làm thước đo.

---

### Task 1: Bản đồ chỉ tiêu KQKD dùng chung

**Files:**
- Create: `be/libs/core/src/utils/kqkd-chi-tieu.ts`
- Create: `be/libs/core/src/utils/kqkd-chi-tieu.spec.ts`
- Modify: `be/libs/core/src/index.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `ButToanKqkd { soTien: number; maTaiKhoanNo?: string; maTaiKhoanCo?: string }`
  - `MaChiTieuGoc = '01'|'02'|'11'|'21'|'22'|'25'|'26'|'31'|'32'|'51'|'52'`
  - `ChiTieuGocKqkd = Record<MaChiTieuGoc, number>`
  - `CHI_TIEU_GOC_KQKD: ReadonlyArray<{ ma: MaChiTieuGoc; prefix: string; ben: 'NO'|'CO' }>`
  - `chiTieuGocRong(): ChiTieuGocKqkd`
  - `congButToan(tong: ChiTieuGocKqkd, dong: ButToanKqkd): void`
  - `tinhChiTieuGoc(rows: ButToanKqkd[]): ChiTieuGocKqkd`
  - `tinhChiTieuDanXuat(g: ChiTieuGocKqkd): { m10; m20; m30; m40; m50; m60; tongChiPhi }`

- [ ] **Step 1: Viết test thất bại**

Tạo `be/libs/core/src/utils/kqkd-chi-tieu.spec.ts`:

```ts
import {
  chiTieuGocRong,
  congButToan,
  tinhChiTieuDanXuat,
  tinhChiTieuGoc,
} from './kqkd-chi-tieu';

describe('tinhChiTieuGoc', () => {
  it('cộng doanh thu theo phát sinh CÓ của 511', () => {
    const g = tinhChiTieuGoc([
      { soTien: 100, maTaiKhoanNo: '131', maTaiKhoanCo: '511' },
    ]);
    expect(g['01']).toBe(100);
  });

  it('không tính 511 khi nó nằm bên NỢ', () => {
    const g = tinhChiTieuGoc([
      { soTien: 100, maTaiKhoanNo: '511', maTaiKhoanCo: '911' },
    ]);
    expect(g['01']).toBe(0);
  });

  it('tài khoản con tính vào tài khoản cha', () => {
    const g = tinhChiTieuGoc([
      { soTien: 300, maTaiKhoanNo: '131', maTaiKhoanCo: '5111' },
      { soTien: 200, maTaiKhoanNo: '6321', maTaiKhoanCo: '156' },
    ]);
    expect(g['01']).toBe(300);
    expect(g['11']).toBe(200);
  });

  it('cộng giảm trừ doanh thu theo phát sinh NỢ của 521', () => {
    const g = tinhChiTieuGoc([
      { soTien: 50, maTaiKhoanNo: '5211', maTaiKhoanCo: '131' },
    ]);
    expect(g['02']).toBe(50);
  });

  it('8211 và 8212 không lẫn vào nhau', () => {
    const g = tinhChiTieuGoc([
      { soTien: 10, maTaiKhoanNo: '8211', maTaiKhoanCo: '3334' },
      { soTien: 7, maTaiKhoanNo: '8212', maTaiKhoanCo: '347' },
    ]);
    expect(g['51']).toBe(10);
    expect(g['52']).toBe(7);
  });

  it('một bút toán khớp cả hai bên rơi vào cả hai chỉ tiêu', () => {
    const g = tinhChiTieuGoc([
      { soTien: 80, maTaiKhoanNo: '641', maTaiKhoanCo: '511' },
    ]);
    expect(g['25']).toBe(80);
    expect(g['01']).toBe(80);
  });

  it('thiếu mã tài khoản thì bỏ qua, không văng lỗi', () => {
    expect(() => tinhChiTieuGoc([{ soTien: 5 }])).not.toThrow();
    expect(tinhChiTieuGoc([{ soTien: 5 }])['01']).toBe(0);
  });

  it('phủ đủ các chỉ tiêu gốc còn lại', () => {
    const g = tinhChiTieuGoc([
      { soTien: 1, maTaiKhoanNo: '112', maTaiKhoanCo: '515' },
      { soTien: 2, maTaiKhoanNo: '635', maTaiKhoanCo: '112' },
      { soTien: 3, maTaiKhoanNo: '642', maTaiKhoanCo: '331' },
      { soTien: 4, maTaiKhoanNo: '112', maTaiKhoanCo: '711' },
      { soTien: 5, maTaiKhoanNo: '811', maTaiKhoanCo: '112' },
    ]);
    expect(g).toMatchObject({ '21': 1, '22': 2, '26': 3, '31': 4, '32': 5 });
  });
});

describe('congButToan', () => {
  it('cộng dồn tại chỗ vào rổ có sẵn', () => {
    const rong = chiTieuGocRong();
    congButToan(rong, { soTien: 10, maTaiKhoanCo: '511' });
    congButToan(rong, { soTien: 15, maTaiKhoanCo: '511' });
    expect(rong['01']).toBe(25);
  });

  it('chiTieuGocRong trả rổ mới, không dùng chung tham chiếu', () => {
    const a = chiTieuGocRong();
    congButToan(a, { soTien: 10, maTaiKhoanCo: '511' });
    expect(chiTieuGocRong()['01']).toBe(0);
  });
});

describe('tinhChiTieuDanXuat', () => {
  it('tính đúng bảy chỉ tiêu suy ra', () => {
    const g = chiTieuGocRong();
    Object.assign(g, {
      '01': 1000, '02': 100, '11': 400, '21': 30, '22': 20,
      '25': 50, '26': 60, '31': 15, '32': 5, '51': 12, '52': 3,
    });
    expect(tinhChiTieuDanXuat(g)).toEqual({
      m10: 900,          // 1000 − 100
      m20: 500,          // 900 − 400
      m30: 400,          // 500 + (30 − 20) − (50 + 60)
      m40: 10,           // 15 − 5
      m50: 410,          // 400 + 10
      m60: 395,          // 410 − 12 − 3
      tongChiPhi: 130,   // 20 + 50 + 60
    });
  });

  it('rổ rỗng cho ra toàn số 0', () => {
    expect(tinhChiTieuDanXuat(chiTieuGocRong())).toEqual({
      m10: 0, m20: 0, m30: 0, m40: 0, m50: 0, m60: 0, tongChiPhi: 0,
    });
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là nó đỏ**

Run: `cd be && npx jest libs/core/src/utils/kqkd-chi-tieu.spec.ts`
Expected: FAIL — `Cannot find module './kqkd-chi-tieu'`

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `be/libs/core/src/utils/kqkd-chi-tieu.ts`:

```ts
/**
 * Bản đồ chỉ tiêu của Báo cáo kết quả kinh doanh — NGUỒN SỰ THẬT DUY NHẤT.
 *
 * Cả báo cáo KQKD thực hiện (reporting-service, đọc `chung_tu`) lẫn báo cáo KQKD
 * kế hoạch (voucher-service, đọc `ke_hoach`) đều gọi vào đây. Sửa prefix ở một chỗ
 * là hai báo cáo cùng đổi, không có chuyện lệch công thức.
 */

export type BenPhatSinh = 'NO' | 'CO';

/** Một bút toán rút gọn — chứng từ hay dòng kế hoạch đều quy về hình này. */
export interface ButToanKqkd {
  soTien: number;
  maTaiKhoanNo?: string;
  maTaiKhoanCo?: string;
}

export const CHI_TIEU_GOC_KQKD = [
  { ma: '01', prefix: '511', ben: 'CO' },
  { ma: '02', prefix: '521', ben: 'NO' },
  { ma: '11', prefix: '632', ben: 'NO' },
  { ma: '21', prefix: '515', ben: 'CO' },
  { ma: '22', prefix: '635', ben: 'NO' },
  { ma: '25', prefix: '641', ben: 'NO' },
  { ma: '26', prefix: '642', ben: 'NO' },
  { ma: '31', prefix: '711', ben: 'CO' },
  { ma: '32', prefix: '811', ben: 'NO' },
  { ma: '51', prefix: '8211', ben: 'NO' },
  { ma: '52', prefix: '8212', ben: 'NO' },
] as const satisfies ReadonlyArray<{
  ma: string;
  prefix: string;
  ben: BenPhatSinh;
}>;

export type MaChiTieuGoc = (typeof CHI_TIEU_GOC_KQKD)[number]['ma'];

export type ChiTieuGocKqkd = Record<MaChiTieuGoc, number>;

export function chiTieuGocRong(): ChiTieuGocKqkd {
  const rong = {} as ChiTieuGocKqkd;
  for (const ct of CHI_TIEU_GOC_KQKD) rong[ct.ma] = 0;
  return rong;
}

/**
 * Cộng một bút toán vào rổ có sẵn. Cộng dồn TẠI CHỖ để bên gom theo tháng chỉ cần
 * giữ 12 rổ, không phải chia dòng ra 12 mảng rồi cộng lại.
 *
 * Một bút toán có thể rơi vào HAI chỉ tiêu (TK Nợ khớp cái này, TK Có khớp cái kia)
 * — ví dụ Nợ 641 / Có 511. Đây là hành vi của `getKqkd` từ trước, giữ nguyên.
 */
export function congButToan(tong: ChiTieuGocKqkd, dong: ButToanKqkd): void {
  const soTien = Number(dong.soTien) || 0;
  if (soTien === 0) return;

  for (const ct of CHI_TIEU_GOC_KQKD) {
    const ma = ct.ben === 'NO' ? dong.maTaiKhoanNo : dong.maTaiKhoanCo;
    if (ma?.startsWith(ct.prefix)) tong[ct.ma] += soTien;
  }
}

export function tinhChiTieuGoc(rows: ButToanKqkd[]): ChiTieuGocKqkd {
  const tong = chiTieuGocRong();
  for (const dong of rows) congButToan(tong, dong);
  return tong;
}

export interface ChiTieuDanXuatKqkd {
  /** Mã 10 — doanh thu thuần. */
  m10: number;
  /** Mã 20 — lợi nhuận gộp. */
  m20: number;
  /** Mã 30 — lợi nhuận thuần từ hoạt động kinh doanh. */
  m30: number;
  /** Mã 40 — lợi nhuận khác. */
  m40: number;
  /** Mã 50 — lợi nhuận trước thuế. */
  m50: number;
  /** Mã 60 — lợi nhuận sau thuế. */
  m60: number;
  /** Mục IX của sheet thiết kế: chi phí tài chính + bán hàng + quản lý. */
  tongChiPhi: number;
}

export function tinhChiTieuDanXuat(g: ChiTieuGocKqkd): ChiTieuDanXuatKqkd {
  const m10 = g['01'] - g['02'];
  const m20 = m10 - g['11'];
  const m30 = m20 + (g['21'] - g['22']) - (g['25'] + g['26']);
  const m40 = g['31'] - g['32'];
  const m50 = m30 + m40;
  const m60 = m50 - g['51'] - g['52'];
  return { m10, m20, m30, m40, m50, m60, tongChiPhi: g['22'] + g['25'] + g['26'] };
}
```

- [ ] **Step 4: Xuất ra khỏi lib**

Thêm vào cuối `be/libs/core/src/index.ts`:

```ts
export * from './utils/kqkd-chi-tieu';
```

- [ ] **Step 5: Chạy test cho chắc là nó xanh**

Run: `cd be && npx jest libs/core/src/utils/kqkd-chi-tieu.spec.ts`
Expected: PASS, 12 test

- [ ] **Step 6: Commit**

```bash
git add be/libs/core/src/utils/kqkd-chi-tieu.ts be/libs/core/src/utils/kqkd-chi-tieu.spec.ts be/libs/core/src/index.ts
git commit -m "feat(core): bản đồ chỉ tiêu KQKD dùng chung"
```

---

### Task 2: `getKqkd` bên BCTC dùng bản đồ chung

**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts:687-780`

**Interfaces:**
- Consumes: `tinhChiTieuGoc`, `tinhChiTieuDanXuat` từ `@app/core` (Task 1)
- Produces: — (không đổi API, chỉ đổi ruột)

Thay đổi thuần cơ học: 22 lời gọi `sumByAccountPrefix` viết tay đổi thành hai lời gọi helper. **Số phải không đổi.** `khauHao` (Có `214`) không phải chỉ tiêu KQKD nên vẫn tính bằng `sumByAccountPrefix` như cũ, `sumByAccountPrefix` giữ nguyên trong file.

- [ ] **Step 1: Ghi lại số hiện tại làm mốc so sánh**

Trước khi sửa, chạy Task 1 test cho chắc bản đồ đúng — đó là lưới an toàn duy nhất, vì `getKqkd` không có test riêng.

Run: `cd be && npx jest libs/core/src/utils/kqkd-chi-tieu.spec.ts`
Expected: PASS

- [ ] **Step 2: Thêm import**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`, thêm vào khối import từ `@app/core` (nếu chưa có khối này thì thêm dòng import mới):

```ts
import {
  ButToanKqkd,
  tinhChiTieuDanXuat,
  tinhChiTieuGoc,
} from '@app/core';
```

- [ ] **Step 3: Thay hai khối tính chỉ tiêu**

Thay toàn bộ đoạn từ `// Current period indicators` đến hết dòng `const tongCP_kt = ...` bằng:

```ts
    // Chuyển bút toán về hình mà bản đồ chỉ tiêu dùng chung hiểu được.
    const toButToan = (v: NhatKyChungEntry): ButToanKqkd => ({
      soTien: v.soTien,
      maTaiKhoanNo: v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo,
      maTaiKhoanCo: v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo,
    });

    const goc_ht = tinhChiTieuGoc(vouchersHT.map(toButToan));
    const goc_kt = tinhChiTieuGoc(vouchersKT.map(toButToan));
    const dan_ht = tinhChiTieuDanXuat(goc_ht);
    const dan_kt = tinhChiTieuDanXuat(goc_kt);

    const m01_ht = goc_ht['01'];
    const m02_ht = goc_ht['02'];
    const m10_ht = dan_ht.m10;
    const m11_ht = goc_ht['11'];
    const m20_ht = dan_ht.m20;
    const m21_ht = goc_ht['21'];
    const m22_ht = goc_ht['22'];
    const m25_ht = goc_ht['25'];
    const m26_ht = goc_ht['26'];
    const m30_ht = dan_ht.m30;
    const m31_ht = goc_ht['31'];
    const m32_ht = goc_ht['32'];
    const m40_ht = dan_ht.m40;
    const m50_ht = dan_ht.m50;
    const m51_ht = goc_ht['51'];
    const m52_ht = goc_ht['52'];
    const m60_ht = dan_ht.m60;
    // Khấu hao phục vụ EBITDA, không phải chỉ tiêu KQKD nên không nằm trong bản đồ.
    const khauHao_ht = this.sumByAccountPrefix(vouchersHT, '214', 'CO');

    const m01_kt = goc_kt['01'];
    const m02_kt = goc_kt['02'];
    const m10_kt = dan_kt.m10;
    const m11_kt = goc_kt['11'];
    const m20_kt = dan_kt.m20;
    const m21_kt = goc_kt['21'];
    const m22_kt = goc_kt['22'];
    const m25_kt = goc_kt['25'];
    const m26_kt = goc_kt['26'];
    const m30_kt = dan_kt.m30;
    const m31_kt = goc_kt['31'];
    const m32_kt = goc_kt['32'];
    const m40_kt = dan_kt.m40;
    const m50_kt = dan_kt.m50;
    const m51_kt = goc_kt['51'];
    const m52_kt = goc_kt['52'];
    const m60_kt = dan_kt.m60;
    const khauHao_kt = this.sumByAccountPrefix(vouchersKT, '214', 'CO');

    // Derived column helpers
    const dtThuan_ht = m10_ht;
    const dtThuan_kt = m10_kt;
    const tongCP_ht = dan_ht.tongChiPhi;
    const tongCP_kt = dan_kt.tongChiPhi;
```

Phần còn lại của `getKqkd` (từ `const pctDT = ...` trở xuống) **không đụng vào**.

- [ ] **Step 4: Kiểm tra file vẫn biên dịch được**

Run: `cd be && npx tsc --noEmit -p apps/reporting-service/tsconfig.app.json 2>&1 | grep -i "bao-cao.service" || echo "không có lỗi mới ở bao-cao.service"`
Expected: `không có lỗi mới ở bao-cao.service` (BE có lỗi tsc sẵn ở file khác — chỉ soi đúng file này)

- [ ] **Step 5: Chạy các test còn lại của reporting-service**

Run: `cd be && npx jest apps/reporting-service`
Expected: PASS đúng như trước khi sửa (`bao-cao.helper`, `doanh-so.helper`, `doanh-thu.helper`)

- [ ] **Step 6: Commit**

```bash
git add be/apps/reporting-service/src/bao-cao/bao-cao.service.ts
git commit -m "refactor(bao-cao): getKqkd dùng bản đồ chỉ tiêu chung"
```

---

### Task 3: ServiceClient — ba phương thức danh mục

**Files:**
- Modify: `be/libs/service-client/src/service-client.ts` (thêm sau `getKhoanMuc`, quanh dòng 178)

**Interfaces:**
- Consumes: —
- Produces:
  - `SanPhamRefResponse { id?: string; ma: string; ten: string; nhom?: string }`
  - `NhomRefResponse { id?: string; ma: string; ten: string }`
  - `getSanPham(authToken?: string, tenantId?: string): Promise<ServiceResponse<SanPhamRefResponse[]>>`
  - `getNhomSanPham(authToken?: string, tenantId?: string): Promise<ServiceResponse<NhomRefResponse[]>>`
  - `getNhomKhoanMuc(authToken?: string, tenantId?: string): Promise<ServiceResponse<NhomRefResponse[]>>`

Không có test riêng — đây là ba hàm gọi HTTP thuần, được phủ gián tiếp qua Task 5. Việc kiểm chứng nằm ở chỗ route `/all` có thật (đã xác nhận: `san-pham.controller.ts:37`, `nhom-san-pham.controller.ts:37`, `nhom-khoan-muc.controller.ts:38`).

- [ ] **Step 1: Thêm ba phương thức**

Chèn vào `be/libs/service-client/src/service-client.ts`, ngay sau `getKhoanMuc`:

```ts
  /**
   * Ba phương thức dưới đây gọi vào route `/all` chứ không phải route gốc: route gốc
   * phân trang, lấy nhầm thì chỉ nhận trang đầu và báo cáo âm thầm gom sai. Cả ba
   * đều truyền `x-tenant-id` — thiếu nó là lấy danh mục của tenant khác.
   */
  private headerDanhMuc(
    authToken?: string,
    tenantId?: string,
  ): Record<string, string> | undefined {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return Object.keys(headers).length ? headers : undefined;
  }

  async getSanPham(
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<SanPhamRefResponse[]>> {
    return this.get<SanPhamRefResponse[]>('master-data', '/san-pham/all', {
      headers: this.headerDanhMuc(authToken, tenantId),
    });
  }

  async getNhomSanPham(
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<NhomRefResponse[]>> {
    return this.get<NhomRefResponse[]>('master-data', '/nhom-san-pham/all', {
      headers: this.headerDanhMuc(authToken, tenantId),
    });
  }

  async getNhomKhoanMuc(
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<NhomRefResponse[]>> {
    return this.get<NhomRefResponse[]>('master-data', '/nhom-khoan-muc/all', {
      headers: this.headerDanhMuc(authToken, tenantId),
    });
  }
```

- [ ] **Step 2: Khai báo hai kiểu trả về**

Thêm vào cuối `be/libs/service-client/src/service-client.ts` (hoặc cạnh các `*Response` khác nếu file có khối riêng cho chúng):

```ts
/** Sản phẩm rút gọn — `nhom` lưu MÃ của nhóm sản phẩm, không phải id. */
export interface SanPhamRefResponse {
  id?: string;
  ma: string;
  ten: string;
  nhom?: string;
}

/** Nhóm sản phẩm / nhóm khoản mục rút gọn. */
export interface NhomRefResponse {
  id?: string;
  ma: string;
  ten: string;
}
```

- [ ] **Step 3: Kiểm tra biên dịch**

Run: `cd be && npx tsc --noEmit -p apps/voucher-service/tsconfig.app.json 2>&1 | grep -i "service-client" || echo "không có lỗi mới ở service-client"`
Expected: `không có lỗi mới ở service-client`

- [ ] **Step 4: Commit**

```bash
git add be/libs/service-client/src/service-client.ts
git commit -m "feat(service-client): lấy sản phẩm, nhóm sản phẩm, nhóm khoản mục"
```

---

### Task 4: Helper thuần dựng cây KQKD kế hoạch

Đây là task nặng nhất. Helper không chạm DB, không chạm HTTP — nhận dòng + danh mục, trả cây.

**Files:**
- Create: `be/libs/dto/src/voucher/kqkd-ke-hoach.dto.ts`
- Modify: `be/libs/dto/src/voucher/index.ts`
- Create: `be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.ts`
- Create: `be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.spec.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach/helpers/index.ts`

**Interfaces:**
- Consumes: `chiTieuGocRong`, `congButToan`, `tinhChiTieuDanXuat`, `ChiTieuGocKqkd`, `ButToanKqkd` từ `@app/core` (Task 1)
- Produces:
  - `KqkdKeHoachDong { key; ma?; soLaMa?; ten; cap: 0|1|2; thang: number[]; con?: KqkdKeHoachDong[] }`
  - `KqkdKeHoachReport { nam: number; dong: KqkdKeHoachDong[]; doanhThuThuanNam: number }`
  - `DongKeHoachKqkd` — hình dạng dòng thô đọc từ Mongo
  - `DanhMucTraCuuKqkd { sanPham; nhomSanPham; nhomKhoanMuc }`
  - `buildKqkdKeHoach(rows: DongKeHoachKqkd[], danhMuc: DanhMucTraCuuKqkd, nam: number): KqkdKeHoachReport`

- [ ] **Step 1: Khai báo kiểu trả về ở `@app/dto`**

Tạo `be/libs/dto/src/voucher/kqkd-ke-hoach.dto.ts`:

```ts
/**
 * Báo cáo KQKD của số KẾ HOẠCH. Chỉ mang 12 số tháng — năm, 6 tháng đầu/cuối, quý
 * và % đều là tổng của 12 số đó, phía hiển thị tự cộng.
 */
export interface KqkdKeHoachDong {
  /** Duy nhất trong cả cây: '01' | '01:N1' | '25:N2:KM01'. */
  key: string;
  /** Mã số BCTC — chỉ dòng cấp 0 mới có. */
  ma?: string;
  /** 'I' … 'XIII' — ba dòng thu nhập khác / chi phí khác / lợi nhuận khác không có. */
  soLaMa?: string;
  ten: string;
  /** 0 = mục, 1 = nhóm, 2 = khoản mục. */
  cap: 0 | 1 | 2;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  con?: KqkdKeHoachDong[];
}

export interface KqkdKeHoachReport {
  nam: number;
  dong: KqkdKeHoachDong[];
  /** Mẫu số của cột % — doanh thu thuần (mã 10) cả năm. */
  doanhThuThuanNam: number;
}
```

Thêm vào `be/libs/dto/src/voucher/index.ts`:

```ts
export * from './kqkd-ke-hoach.dto';
```

- [ ] **Step 2: Viết test thất bại**

Tạo `be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.spec.ts`:

```ts
import { KqkdKeHoachReport } from '@app/dto';
import { buildKqkdKeHoach, DanhMucTraCuuKqkd, DongKeHoachKqkd } from './kqkd.helper';

const danhMucRong: DanhMucTraCuuKqkd = {
  sanPham: [],
  nhomSanPham: [],
  nhomKhoanMuc: [],
};

const danhMuc: DanhMucTraCuuKqkd = {
  sanPham: [
    { id: 'sp1', ma: 'SP01', ten: 'Bàn', nhom: 'NOI_THAT' },
    { id: 'sp2', ma: 'SP02', ten: 'Ghế', nhom: 'NOI_THAT' },
    { id: 'sp3', ma: 'SP03', ten: 'Đèn', nhom: 'DIEN' },
    { id: 'sp4', ma: 'SP04', ten: 'Lẻ' },
  ],
  nhomSanPham: [
    { id: 'n1', ma: 'NOI_THAT', ten: 'Nội thất' },
    { id: 'n2', ma: 'DIEN', ten: 'Điện' },
  ],
  nhomKhoanMuc: [
    { id: 'nk1', ma: 'NKM01', ten: 'Chi phí nhân sự' },
  ],
};

const dong = (p: Partial<DongKeHoachKqkd>): DongKeHoachKqkd => ({
  ngay: '2026-01-15T00:00:00.000Z',
  soTien: 0,
  ...p,
});

type Dong = KqkdKeHoachReport['dong'][number];

const timDong = (report: KqkdKeHoachReport, key: string): Dong | undefined => {
  const duyet = (ds: Dong[]): Dong | undefined => {
    for (const d of ds) {
      if (d.key === key) return d;
      const trong = d.con ? duyet(d.con) : undefined;
      if (trong) return trong;
    }
    return undefined;
  };
  return duyet(report.dong);
};

describe('buildKqkdKeHoach — gom theo tháng', () => {
  it('gom vào đúng tháng theo UTC', () => {
    const r = buildKqkdKeHoach(
      [
        dong({ ngay: '2026-03-01T00:00:00.000Z', soTien: 100, danhMuc: { taiKhoanCo: { ma: '511' } } }),
        dong({ ngay: '2026-12-31T00:00:00.000Z', soTien: 50, danhMuc: { taiKhoanCo: { ma: '511' } } }),
      ],
      danhMucRong,
      2026,
    );
    const i = timDong(r, '01')!;
    expect(i.thang[2]).toBe(100);  // T3, không phải T2
    expect(i.thang[11]).toBe(50);
    expect(i.thang).toHaveLength(12);
  });

  it('mọi dòng đều có đúng 12 số tháng kể cả khi không có dữ liệu', () => {
    const r = buildKqkdKeHoach([], danhMucRong, 2026);
    for (const d of r.dong) expect(d.thang).toHaveLength(12);
  });
});

describe('buildKqkdKeHoach — bậc thang chỉ tiêu', () => {
  const rows = [
    dong({ soTien: 1000, danhMuc: { taiKhoanNo: { ma: '131' }, taiKhoanCo: { ma: '511' } } }),
    dong({ soTien: 100, danhMuc: { taiKhoanNo: { ma: '521' }, taiKhoanCo: { ma: '131' } } }),
    dong({ soTien: 400, danhMuc: { taiKhoanNo: { ma: '632' }, taiKhoanCo: { ma: '156' } } }),
    dong({ soTien: 50, danhMuc: { taiKhoanNo: { ma: '641' }, taiKhoanCo: { ma: '331' } } }),
    dong({ soTien: 60, danhMuc: { taiKhoanNo: { ma: '642' }, taiKhoanCo: { ma: '331' } } }),
    dong({ soTien: 20, danhMuc: { taiKhoanNo: { ma: '635' }, taiKhoanCo: { ma: '112' } } }),
  ];

  it('dựng đủ 16 dòng cấp 0 theo đúng thứ tự của sheet', () => {
    const r = buildKqkdKeHoach(rows, danhMucRong, 2026);
    expect(r.dong.map((d) => d.key)).toEqual([
      '01', '02', '11', '20', '21', '22', '25', '26',
      'IX', '30', '31', '32', '40', '50', 'XII', '60',
    ]);
    expect(r.dong.every((d) => d.cap === 0)).toBe(true);
  });

  it('gắn số La Mã đúng chỗ, ba dòng khác để trống', () => {
    const r = buildKqkdKeHoach(rows, danhMucRong, 2026);
    expect(timDong(r, '01')!.soLaMa).toBe('I');
    expect(timDong(r, '20')!.soLaMa).toBe('IV');
    expect(timDong(r, 'IX')!.soLaMa).toBe('IX');
    expect(timDong(r, '60')!.soLaMa).toBe('XIII');
    expect(timDong(r, '31')!.soLaMa).toBeUndefined();
    expect(timDong(r, '32')!.soLaMa).toBeUndefined();
    expect(timDong(r, '40')!.soLaMa).toBeUndefined();
  });

  it('tính đúng lợi nhuận gộp, tổng chi phí và lợi nhuận thuần', () => {
    const r = buildKqkdKeHoach(rows, danhMucRong, 2026);
    expect(timDong(r, '20')!.thang[0]).toBe(500);   // 1000 − 100 − 400
    expect(timDong(r, 'IX')!.thang[0]).toBe(130);   // 20 + 50 + 60
    expect(timDong(r, '30')!.thang[0]).toBe(370);   // 500 + (0 − 20) − (50 + 60)
    expect(timDong(r, '50')!.thang[0]).toBe(370);
    expect(timDong(r, '60')!.thang[0]).toBe(370);
  });

  it('doanhThuThuanNam là tổng 12 tháng của mã 10', () => {
    const r = buildKqkdKeHoach(rows, danhMucRong, 2026);
    expect(r.doanhThuThuanNam).toBe(900);
  });
});

describe('buildKqkdKeHoach — cây nhóm sản phẩm', () => {
  const rows = [
    dong({ soTien: 1000, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } }),
    dong({ soTien: 300, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP03', ten: 'Đèn' } } }),
    dong({ soTien: 400, danhMuc: { taiKhoanNo: { ma: '632' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } }),
    dong({ soTien: 100, danhMuc: { taiKhoanNo: { ma: '521' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } }),
  ];

  it('bung doanh thu theo nhóm sản phẩm, lấy tên nhóm từ danh mục', () => {
    const r = buildKqkdKeHoach(rows, danhMuc, 2026);
    const con = timDong(r, '01')!.con!;
    expect(con.map((c) => [c.ten, c.thang[0]])).toEqual([
      ['Điện', 300],
      ['Nội thất', 1000],
    ]);
    expect(con.every((c) => c.cap === 1)).toBe(true);
  });

  it('lợi nhuận gộp của một nhóm = doanh thu − giảm trừ − giá vốn', () => {
    const r = buildKqkdKeHoach(rows, danhMuc, 2026);
    const noiThat = timDong(r, '20:NOI_THAT')!;
    expect(noiThat.thang[0]).toBe(500);  // 1000 − 100 − 400
  });

  it('sản phẩm không gắn nhóm vào "Chưa phân nhóm", dòng không có sản phẩm vào "Không phân bổ sản phẩm", cả hai xếp cuối', () => {
    const r = buildKqkdKeHoach(
      [
        ...rows,
        dong({ soTien: 7, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP04', ten: 'Lẻ' } } }),
        dong({ soTien: 9, danhMuc: { taiKhoanCo: { ma: '511' } } }),
      ],
      danhMuc,
      2026,
    );
    expect(timDong(r, '01')!.con!.map((c) => c.ten)).toEqual([
      'Điện', 'Nội thất', 'Chưa phân nhóm', 'Không phân bổ sản phẩm',
    ]);
  });

  it('sản phẩm không có trong danh mục coi như chưa phân nhóm, không rơi mất số', () => {
    const r = buildKqkdKeHoach(
      [dong({ soTien: 55, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP_LA', ten: 'Lạ' } } })],
      danhMuc,
      2026,
    );
    expect(timDong(r, '01')!.thang[0]).toBe(55);
    expect(timDong(r, '01')!.con!.find((c) => c.ten === 'Chưa phân nhóm')!.thang[0]).toBe(55);
  });

  it('hai sản phẩm TRÙNG TÊN khác MÃ ở hai nhóm khác nhau không bị gộp', () => {
    const dm: DanhMucTraCuuKqkd = {
      sanPham: [
        { ma: 'A1', ten: 'Combo', nhom: 'G1' },
        { ma: 'A2', ten: 'Combo', nhom: 'G2' },
      ],
      nhomSanPham: [
        { ma: 'G1', ten: 'Nhóm 1' },
        { ma: 'G2', ten: 'Nhóm 2' },
      ],
      nhomKhoanMuc: [],
    };
    const r = buildKqkdKeHoach(
      [
        dong({ soTien: 10, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'A1', ten: 'Combo' } } }),
        dong({ soTien: 20, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'A2', ten: 'Combo' } } }),
      ],
      dm,
      2026,
    );
    expect(timDong(r, '01')!.con!.map((c) => [c.ten, c.thang[0]])).toEqual([
      ['Nhóm 1', 10],
      ['Nhóm 2', 20],
    ]);
  });
});

describe('buildKqkdKeHoach — cây khoản mục', () => {
  it('bung chi phí bán hàng thành nhóm khoản mục rồi tới khoản mục', () => {
    const r = buildKqkdKeHoach(
      [
        dong({ soTien: 30, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'NKM01' } } }),
        dong({ soTien: 20, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM02', ten: 'Thưởng', nhom: 'NKM01' } } }),
      ],
      danhMuc,
      2026,
    );
    const nhom = timDong(r, '25:NKM01')!;
    expect(nhom.ten).toBe('Chi phí nhân sự');
    expect(nhom.cap).toBe(1);
    expect(nhom.thang[0]).toBe(50);
    expect(nhom.con!.map((c) => [c.key, c.ten, c.cap, c.thang[0]])).toEqual([
      ['25:NKM01:KM01', 'Lương', 2, 30],
      ['25:NKM01:KM02', 'Thưởng', 2, 20],
    ]);
  });

  it('chi phí bán hàng và chi phí quản lý không lẫn cây của nhau', () => {
    const r = buildKqkdKeHoach(
      [
        dong({ soTien: 30, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'NKM01' } } }),
        dong({ soTien: 8, danhMuc: { taiKhoanNo: { ma: '642' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'NKM01' } } }),
      ],
      danhMuc,
      2026,
    );
    expect(timDong(r, '25:NKM01')!.thang[0]).toBe(30);
    expect(timDong(r, '26:NKM01')!.thang[0]).toBe(8);
  });

  it('khớp nhóm khoản mục cả khi giá trị lưu là id thay vì mã', () => {
    const r = buildKqkdKeHoach(
      [dong({ soTien: 12, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'nk1' } } })],
      danhMuc,
      2026,
    );
    expect(timDong(r, '25')!.con![0].ten).toBe('Chi phí nhân sự');
  });

  it('dòng không chọn khoản mục vào rổ riêng, không có cấp 2', () => {
    const r = buildKqkdKeHoach(
      [dong({ soTien: 5, danhMuc: { taiKhoanNo: { ma: '641' } } })],
      danhMuc,
      2026,
    );
    const con = timDong(r, '25')!.con!;
    expect(con).toHaveLength(1);
    expect(con[0].ten).toBe('Không phân bổ khoản mục');
    expect(con[0].con).toBeUndefined();
  });
});

describe('buildKqkdKeHoach — danh mục hỏng', () => {
  it('danh mục rỗng vẫn cho số đúng ở dòng cấp 0', () => {
    const r = buildKqkdKeHoach(
      [dong({ soTien: 1000, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } })],
      danhMucRong,
      2026,
    );
    expect(timDong(r, '01')!.thang[0]).toBe(1000);
    expect(timDong(r, '01')!.con![0].ten).toBe('Chưa phân nhóm');
  });
});
```

- [ ] **Step 3: Chạy test cho chắc là nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.spec.ts`
Expected: FAIL — `Cannot find module './kqkd.helper'`

- [ ] **Step 4: Viết cài đặt**

Tạo `be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.ts`:

```ts
import {
  ChiTieuGocKqkd,
  chiTieuGocRong,
  congButToan,
  MaChiTieuGoc,
  tinhChiTieuDanXuat,
} from '@app/core';
import { KqkdKeHoachDong, KqkdKeHoachReport } from '@app/dto';

const SO_THANG = 12;

export const NHAN_CHUA_PHAN_NHOM = 'Chưa phân nhóm';
export const NHAN_KHONG_CO_SAN_PHAM = 'Không phân bổ sản phẩm';
export const NHAN_KHONG_CO_KHOAN_MUC = 'Không phân bổ khoản mục';

/** Hai rổ vét luôn xếp CUỐI, sau mọi nhóm có thật. */
const KEY_CHUA_PHAN_NHOM = '~1';
const KEY_KHONG_PHAN_BO = '~2';

/** Dòng kế hoạch thô đọc từ Mongo — chỉ những trường báo cáo cần. */
export interface DongKeHoachKqkd {
  ngay: Date | string;
  soTien: number;
  danhMuc?: {
    taiKhoanNo?: { ma?: string };
    taiKhoanCo?: { ma?: string };
    sanPham?: { ma?: string; ten?: string };
    khoanMuc?: { ma?: string; ten?: string; nhom?: string };
  };
}

export interface MucTraCuu {
  id?: string;
  ma: string;
  ten: string;
  nhom?: string;
}

export interface DanhMucTraCuuKqkd {
  sanPham: MucTraCuu[];
  nhomSanPham: MucTraCuu[];
  nhomKhoanMuc: MucTraCuu[];
}

const mangThang = (): number[] => new Array<number>(SO_THANG).fill(0);

/**
 * Tháng đọc theo UTC. Dòng kế hoạch luôn lưu 00:00:00.000Z của đúng ngày
 * (`ngayLuu` bên FE), nên đọc theo giờ VN sẽ đẩy 01/03 về tháng 2.
 */
function chiSoThang(ngay: Date | string): number | null {
  const d = ngay instanceof Date ? ngay : new Date(ngay);
  const thang = d.getUTCMonth();
  return Number.isNaN(thang) ? null : thang;
}

/** Một rổ 12 tháng của một nhánh trong cây. */
interface RoThang {
  ten: string;
  thang: number[];
  con?: Map<string, RoThang>;
}

const layRo = (
  bang: Map<string, RoThang>,
  key: string,
  ten: string,
): RoThang => {
  let ro = bang.get(key);
  if (!ro) {
    ro = { ten, thang: mangThang() };
    bang.set(key, ro);
  }
  return ro;
};

/** Xếp theo khoá; hai rổ vét (`~1`, `~2`) tự rơi xuống cuối vì `~` lớn hơn chữ. */
const theoKhoa = (a: [string, RoThang], b: [string, RoThang]) =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;

export function buildKqkdKeHoach(
  rows: DongKeHoachKqkd[],
  danhMuc: DanhMucTraCuuKqkd,
  nam: number,
): KqkdKeHoachReport {
  // Tra cứu sản phẩm theo MÃ — hai sản phẩm khác mã có thể trùng tên.
  const sanPhamTheoMa = new Map(danhMuc.sanPham.map((sp) => [sp.ma, sp]));
  // `khoanMuc.nhom` lưu khi là mã, khi là id — nhận cả hai, đúng như FE đang làm.
  const nhomSanPhamTheoKhoa = new Map<string, MucTraCuu>();
  for (const n of danhMuc.nhomSanPham) {
    nhomSanPhamTheoKhoa.set(n.ma, n);
    if (n.id) nhomSanPhamTheoKhoa.set(n.id, n);
  }
  const nhomKhoanMucTheoKhoa = new Map<string, MucTraCuu>();
  for (const n of danhMuc.nhomKhoanMuc) {
    nhomKhoanMucTheoKhoa.set(n.ma, n);
    if (n.id) nhomKhoanMucTheoKhoa.set(n.id, n);
  }

  const tongThang: ChiTieuGocKqkd[] = Array.from(
    { length: SO_THANG },
    chiTieuGocRong,
  );
  // Cây nhóm sản phẩm, riêng cho từng chỉ tiêu gốc 01 / 02 / 11.
  const cayNhomSanPham = new Map<MaChiTieuGoc, Map<string, RoThang>>([
    ['01', new Map()],
    ['02', new Map()],
    ['11', new Map()],
  ]);
  // Cây nhóm khoản mục → khoản mục, riêng cho 25 và 26.
  const cayKhoanMuc = new Map<MaChiTieuGoc, Map<string, RoThang>>([
    ['25', new Map()],
    ['26', new Map()],
  ]);

  for (const row of rows) {
    const i = chiSoThang(row.ngay);
    if (i === null) continue;
    const soTien = Number(row.soTien) || 0;
    if (soTien === 0) continue;

    // Cộng vào chỉ tiêu gốc — rồi soi lại rổ để biết chỉ tiêu nào vừa nhận.
    const truoc = { ...tongThang[i] };
    congButToan(tongThang[i], {
      soTien,
      maTaiKhoanNo: row.danhMuc?.taiKhoanNo?.ma,
      maTaiKhoanCo: row.danhMuc?.taiKhoanCo?.ma,
    });

    for (const [ma, bang] of cayNhomSanPham) {
      if (tongThang[i][ma] === truoc[ma]) continue;
      const { key, ten } = khoaNhomSanPham(
        row,
        sanPhamTheoMa,
        nhomSanPhamTheoKhoa,
      );
      layRo(bang, key, ten).thang[i] += soTien;
    }

    for (const [ma, bang] of cayKhoanMuc) {
      if (tongThang[i][ma] === truoc[ma]) continue;
      const km = row.danhMuc?.khoanMuc;
      if (!km?.ma) {
        layRo(bang, KEY_KHONG_PHAN_BO, NHAN_KHONG_CO_KHOAN_MUC).thang[i] += soTien;
        continue;
      }
      const nhom = km.nhom ? nhomKhoanMucTheoKhoa.get(km.nhom) : undefined;
      const roNhom = layRo(
        bang,
        nhom?.ma ?? (km.nhom ? `${km.nhom}` : KEY_CHUA_PHAN_NHOM),
        nhom?.ten ?? NHAN_CHUA_PHAN_NHOM,
      );
      roNhom.thang[i] += soTien;
      if (!roNhom.con) roNhom.con = new Map();
      layRo(roNhom.con, km.ma, km.ten ?? km.ma).thang[i] += soTien;
    }
  }

  return {
    nam,
    doanhThuThuanNam: tongThang.reduce(
      (t, g) => t + tinhChiTieuDanXuat(g).m10,
      0,
    ),
    dong: dungCayDong(tongThang, cayNhomSanPham, cayKhoanMuc),
  };
}

function khoaNhomSanPham(
  row: DongKeHoachKqkd,
  sanPhamTheoMa: Map<string, MucTraCuu>,
  nhomTheoKhoa: Map<string, MucTraCuu>,
): { key: string; ten: string } {
  const maSp = row.danhMuc?.sanPham?.ma;
  if (!maSp) return { key: KEY_KHONG_PHAN_BO, ten: NHAN_KHONG_CO_SAN_PHAM };

  const maNhom = sanPhamTheoMa.get(maSp)?.nhom;
  const nhom = maNhom ? nhomTheoKhoa.get(maNhom) : undefined;
  if (nhom) return { key: nhom.ma, ten: nhom.ten };
  // Sản phẩm bị xoá khỏi danh mục, hoặc chưa gắn nhóm — vẫn phải hiện ra.
  if (maNhom) return { key: maNhom, ten: maNhom };
  return { key: KEY_CHUA_PHAN_NHOM, ten: NHAN_CHUA_PHAN_NHOM };
}

/** Cộng 12 tháng của một chỉ tiêu gốc trên toàn bộ các rổ tháng. */
const thangCua = (
  tongThang: ChiTieuGocKqkd[],
  chon: (g: ChiTieuGocKqkd) => number,
): number[] => tongThang.map(chon);

function dungCayDong(
  tongThang: ChiTieuGocKqkd[],
  cayNhomSanPham: Map<MaChiTieuGoc, Map<string, RoThang>>,
  cayKhoanMuc: Map<MaChiTieuGoc, Map<string, RoThang>>,
): KqkdKeHoachDong[] {
  const conSanPham = (ma: MaChiTieuGoc): KqkdKeHoachDong[] =>
    [...cayNhomSanPham.get(ma)!.entries()].sort(theoKhoa).map(([key, ro]) => ({
      key: `${ma}:${key}`,
      ten: ro.ten,
      cap: 1 as const,
      thang: ro.thang,
    }));

  const conKhoanMuc = (ma: MaChiTieuGoc): KqkdKeHoachDong[] =>
    [...cayKhoanMuc.get(ma)!.entries()].sort(theoKhoa).map(([key, ro]) => ({
      key: `${ma}:${key}`,
      ten: ro.ten,
      cap: 1 as const,
      thang: ro.thang,
      ...(ro.con
        ? {
            con: [...ro.con.entries()].sort(theoKhoa).map(([kmKey, km]) => ({
              key: `${ma}:${key}:${kmKey}`,
              ten: km.ten,
              cap: 2 as const,
              thang: km.thang,
            })),
          }
        : {}),
    }));

  /** Lợi nhuận gộp của một nhóm = doanh thu − giảm trừ − giá vốn của chính nhóm đó. */
  const conLoiNhuanGop = (): KqkdKeHoachDong[] => {
    const khoa = new Map<string, string>();
    for (const ma of ['01', '02', '11'] as const) {
      for (const [key, ro] of cayNhomSanPham.get(ma)!) {
        if (!khoa.has(key)) khoa.set(key, ro.ten);
      }
    }
    const sapXep = (a: [string, string], b: [string, string]) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    return [...khoa.entries()].sort(sapXep).map(([key, ten]) => {
      const lay = (ma: MaChiTieuGoc, i: number) =>
        cayNhomSanPham.get(ma)!.get(key)?.thang[i] ?? 0;
      return {
        key: `20:${key}`,
        ten,
        cap: 1 as const,
        thang: Array.from(
          { length: SO_THANG },
          (_, i) => lay('01', i) - lay('02', i) - lay('11', i),
        ),
      };
    });
  };

  const goc = (ma: MaChiTieuGoc) => thangCua(tongThang, (g) => g[ma]);
  const danXuat = (chon: (d: ReturnType<typeof tinhChiTieuDanXuat>) => number) =>
    thangCua(tongThang, (g) => chon(tinhChiTieuDanXuat(g)));

  return [
    { key: '01', ma: '01', soLaMa: 'I', ten: 'DOANH THU', cap: 0, thang: goc('01'), con: conSanPham('01') },
    { key: '02', ma: '02', soLaMa: 'II', ten: 'CÁC KHOẢN GIẢM TRỪ DOANH THU', cap: 0, thang: goc('02'), con: conSanPham('02') },
    { key: '11', ma: '11', soLaMa: 'III', ten: 'GIÁ VỐN BÁN HÀNG', cap: 0, thang: goc('11'), con: conSanPham('11') },
    { key: '20', ma: '20', soLaMa: 'IV', ten: 'LỢI NHUẬN GỘP', cap: 0, thang: danXuat((d) => d.m20), con: conLoiNhuanGop() },
    { key: '21', ma: '21', soLaMa: 'V', ten: 'DOANH THU TÀI CHÍNH', cap: 0, thang: goc('21') },
    { key: '22', ma: '22', soLaMa: 'VI', ten: 'CHI PHÍ TÀI CHÍNH', cap: 0, thang: goc('22') },
    { key: '25', ma: '25', soLaMa: 'VII', ten: 'CHI PHÍ BÁN HÀNG', cap: 0, thang: goc('25'), con: conKhoanMuc('25') },
    { key: '26', ma: '26', soLaMa: 'VIII', ten: 'CHI PHÍ QUẢN LÝ DOANH NGHIỆP', cap: 0, thang: goc('26'), con: conKhoanMuc('26') },
    { key: 'IX', soLaMa: 'IX', ten: 'TOTAL CHI PHÍ', cap: 0, thang: danXuat((d) => d.tongChiPhi) },
    { key: '30', ma: '30', soLaMa: 'X', ten: 'LỢI NHUẬN THUẦN TỪ HĐSXKD', cap: 0, thang: danXuat((d) => d.m30) },
    { key: '31', ma: '31', ten: 'THU NHẬP KHÁC', cap: 0, thang: goc('31') },
    { key: '32', ma: '32', ten: 'CHI PHÍ KHÁC', cap: 0, thang: goc('32') },
    { key: '40', ma: '40', ten: 'LỢI NHUẬN KHÁC', cap: 0, thang: danXuat((d) => d.m40) },
    { key: '50', ma: '50', soLaMa: 'XI', ten: 'LỢI NHUẬN TRƯỚC THUẾ', cap: 0, thang: danXuat((d) => d.m50) },
    { key: 'XII', soLaMa: 'XII', ten: 'CHI PHÍ THUẾ THU NHẬP DOANH NGHIỆP', cap: 0, thang: thangCua(tongThang, (g) => g['51'] + g['52']) },
    { key: '60', ma: '60', soLaMa: 'XIII', ten: 'LỢI NHUẬN SAU THUẾ', cap: 0, thang: danXuat((d) => d.m60) },
  ];
}
```

Thêm vào `be/apps/voucher-service/src/ke-hoach/helpers/index.ts`:

```ts
export * from './kqkd.helper';
```

- [ ] **Step 5: Chạy test cho chắc là nó xanh**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.spec.ts`
Expected: PASS, 16 test

Nếu test "xếp cuối" đỏ vì thứ tự nhóm: kiểm `theoKhoa` — khoá `~1` / `~2` phải lớn hơn mọi mã nhóm thật. Mã nhóm bắt đầu bằng `~` là chuyện không có thật trong danh mục.

- [ ] **Step 6: Commit**

```bash
git add be/libs/dto/src/voucher/kqkd-ke-hoach.dto.ts be/libs/dto/src/voucher/index.ts be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.ts be/apps/voucher-service/src/ke-hoach/helpers/kqkd.helper.spec.ts be/apps/voucher-service/src/ke-hoach/helpers/index.ts
git commit -m "feat(ke-hoach): helper dựng cây KQKD kế hoạch"
```

---

### Task 5: Endpoint `GET /voucher/ke-hoach/kqkd`

**Files:**
- Create: `be/apps/voucher-service/src/ke-hoach/dto/kqkd-query.dto.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach/dto/index.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach/ke-hoach.service.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach/ke-hoach.controller.ts`
- Modify: `be/apps/voucher-service/src/ke-hoach/ke-hoach.service.spec.ts`

**Interfaces:**
- Consumes: `buildKqkdKeHoach`, `DanhMucTraCuuKqkd`, `DongKeHoachKqkd` (Task 4); `getSanPham`, `getNhomSanPham`, `getNhomKhoanMuc` (Task 3)
- Produces: `KeHoachService.getKqkd(nam, loaiKeHoach, phienBan?, authToken?): Promise<{ success: true; data: KqkdKeHoachReport }>`

⚠️ `KeHoachService` sẽ có **tham số constructor thứ tư** (`ServiceClient`). Hàm `dungService` trong `ke-hoach.service.spec.ts` phải cập nhật, nếu không mọi test cũ trong file đó đỏ.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `be/apps/voucher-service/src/ke-hoach/ke-hoach.service.spec.ts`:

```ts
describe('KeHoachService.getKqkd', () => {
  const serviceClientRong = () => ({
    getSanPham: jest.fn(() => Promise.resolve({ success: true, data: [] })),
    getNhomSanPham: jest.fn(() => Promise.resolve({ success: true, data: [] })),
    getNhomKhoanMuc: jest.fn(() => Promise.resolve({ success: true, data: [] })),
  });

  it('lọc đúng năm, loại kế hoạch, phiên bản và tenant', async () => {
    const keHoach = repo();
    const sc = serviceClientRong();
    await dungService(keHoach, repo(), 't9', sc).getKqkd(2026, 'KE_HOACH', 'KH gốc');

    const match = matchDauTien(keHoach);
    expect(match).toMatchObject({
      loaiKeHoach: 'KE_HOACH',
      phienBan: 'KH gốc',
      tenantId: 't9',
    });
    const ngay = match.ngay as { $gte: Date; $lte: Date };
    expect(ngay.$gte.getUTCFullYear()).toBe(2026);
    expect(ngay.$gte.getUTCMonth()).toBe(0);
    expect(ngay.$lte.getUTCFullYear()).toBe(2026);
    expect(ngay.$lte.getUTCMonth()).toBe(11);
  });

  it('bỏ trống phiên bản thì không ràng buộc trường đó', async () => {
    const keHoach = repo();
    await dungService(keHoach, repo(), 't9', serviceClientRong()).getKqkd(2026, 'KE_HOACH');
    expect(matchDauTien(keHoach)).not.toHaveProperty('phienBan');
  });

  it('trả cây báo cáo dựng từ dòng đọc được', async () => {
    const keHoach = repo([
      {
        ngay: new Date('2026-02-10T00:00:00.000Z'),
        soTien: 500,
        danhMuc: { taiKhoanCo: { ma: '511' } },
      },
    ]);
    const res = await dungService(keHoach, repo(), 't9', serviceClientRong()).getKqkd(
      2026,
      'KE_HOACH',
    );

    expect(res.success).toBe(true);
    expect(res.data.nam).toBe(2026);
    expect(res.data.doanhThuThuanNam).toBe(500);
    expect(res.data.dong.find((d) => d.key === '01')!.thang[1]).toBe(500);
  });

  it('master-data hỏng thì báo cáo vẫn ra, không ném lỗi', async () => {
    const keHoach = repo([
      {
        ngay: new Date('2026-02-10T00:00:00.000Z'),
        soTien: 500,
        danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP01', ten: 'Bàn' } },
      },
    ]);
    const sc = {
      getSanPham: jest.fn(() => Promise.reject(new Error('master-data chết'))),
      getNhomSanPham: jest.fn(() => Promise.reject(new Error('master-data chết'))),
      getNhomKhoanMuc: jest.fn(() => Promise.reject(new Error('master-data chết'))),
    };

    const res = await dungService(keHoach, repo(), 't9', sc).getKqkd(2026, 'KE_HOACH');
    expect(res.data.dong.find((d) => d.key === '01')!.thang[1]).toBe(500);
    expect(res.data.dong.find((d) => d.key === '01')!.con![0].ten).toBe('Chưa phân nhóm');
  });
});
```

Sửa `dungService` ở đầu file để nhận thêm ServiceClient (giá trị mặc định giữ mọi test cũ chạy nguyên):

```ts
const dungService = (
  keHoach: Repo,
  chungTu: Repo,
  tenantId = 't1',
  serviceClient: unknown = {
    getSanPham: jest.fn(() => Promise.resolve({ success: true, data: [] })),
    getNhomSanPham: jest.fn(() => Promise.resolve({ success: true, data: [] })),
    getNhomKhoanMuc: jest.fn(() => Promise.resolve({ success: true, data: [] })),
  },
) =>
  new KeHoachService(
    keHoach as never,
    chungTu as never,
    { getCurrentTenantId: () => tenantId } as never,
    serviceClient as never,
  );
```

- [ ] **Step 2: Chạy test cho chắc là nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach/ke-hoach.service.spec.ts`
Expected: FAIL — `keHoachService.getKqkd is not a function`

- [ ] **Step 3: Viết DTO truy vấn**

Tạo `be/apps/voucher-service/src/ke-hoach/dto/kqkd-query.dto.ts`:

```ts
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { LoaiKeHoach } from '@app/entities';

export class KqkdQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2999)
  nam: number;

  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  /** Bỏ trống = gộp mọi phiên bản. */
  @IsOptional()
  @IsString()
  phienBan?: string;
}
```

Thêm vào `be/apps/voucher-service/src/ke-hoach/dto/index.ts`:

```ts
export * from './kqkd-query.dto';
```

- [ ] **Step 4: Thêm `getKqkd` vào service**

Trong `be/apps/voucher-service/src/ke-hoach/ke-hoach.service.ts`:

Thêm import:

```ts
import { ServiceClient } from '@app/service-client';
import { KqkdKeHoachReport } from '@app/dto';
import { buildKqkdKeHoach, DanhMucTraCuuKqkd, DongKeHoachKqkd } from './helpers';
```

Thêm tham số constructor thứ tư:

```ts
    private readonly serviceClient: ServiceClient,
```

Thêm phương thức (đặt cạnh `getSeries`):

```ts
  /**
   * Báo cáo KQKD của số KẾ HOẠCH — cùng bản đồ chỉ tiêu với báo cáo KQKD bên
   * Báo cáo tài chính, chỉ khác nguồn: đọc `ke_hoach` thay vì `chung_tu`.
   *
   * Trả về 12 số tháng cho mỗi dòng; năm, 6 tháng, quý và % do phía hiển thị cộng.
   */
  async getKqkd(
    nam: number,
    loaiKeHoach: string,
    phienBan?: string,
    authToken?: string,
  ): Promise<{ success: boolean; data: KqkdKeHoachReport }> {
    const match = this.theoTenant({
      loaiKeHoach,
      ...(phienBan ? { phienBan } : {}),
      ngay: {
        $gte: new Date(Date.UTC(nam, 0, 1)),
        $lte: new Date(Date.UTC(nam, 11, 31, 23, 59, 59, 999)),
      },
    });

    const tenantId = this.tenantContext.getCurrentTenantId();

    const [rows, danhMuc] = await Promise.all([
      this.keHoachRepository
        .aggregate([
          { $match: match },
          {
            $project: {
              ngay: 1,
              soTien: 1,
              'danhMuc.taiKhoanNo.ma': 1,
              'danhMuc.taiKhoanCo.ma': 1,
              'danhMuc.sanPham.ma': 1,
              'danhMuc.sanPham.ten': 1,
              'danhMuc.khoanMuc.ma': 1,
              'danhMuc.khoanMuc.ten': 1,
              'danhMuc.khoanMuc.nhom': 1,
            },
          },
        ])
        .toArray() as Promise<unknown[]>,
      this.napDanhMucKqkd(authToken, tenantId),
    ]);

    return {
      success: true,
      data: buildKqkdKeHoach(rows as DongKeHoachKqkd[], danhMuc, nam),
    };
  }

  /**
   * Master-data chết thì báo cáo vẫn phải ra: số ở các mục La Mã không phụ thuộc
   * danh mục, chỉ có dòng con dồn hết vào "Chưa phân nhóm".
   */
  private async napDanhMucKqkd(
    authToken?: string,
    tenantId?: string,
  ): Promise<DanhMucTraCuuKqkd> {
    const lay = async <T>(
      goi: () => Promise<{ success: boolean; data?: T[] }>,
    ): Promise<T[]> => {
      try {
        const res = await goi();
        return res.success ? res.data ?? [] : [];
      } catch {
        return [];
      }
    };

    const [sanPham, nhomSanPham, nhomKhoanMuc] = await Promise.all([
      lay(() => this.serviceClient.getSanPham(authToken, tenantId)),
      lay(() => this.serviceClient.getNhomSanPham(authToken, tenantId)),
      lay(() => this.serviceClient.getNhomKhoanMuc(authToken, tenantId)),
    ]);

    return { sanPham, nhomSanPham, nhomKhoanMuc };
  }
```

- [ ] **Step 5: Chạy test cho chắc là nó xanh**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach/ke-hoach.service.spec.ts`
Expected: PASS — cả 4 test mới lẫn toàn bộ test cũ trong file

- [ ] **Step 6: Thêm route vào controller**

Trong `be/apps/voucher-service/src/ke-hoach/ke-hoach.controller.ts`, thêm `KqkdQueryDto` vào khối import từ `./dto`, thêm `Headers` vào khối import `@nestjs/common`, rồi chèn route **trước `@Get(':id')`** (đặt ngay sau `@Get('so-sanh')`):

```ts
  @Get('kqkd')
  @Roles(...XEM)
  async getKqkd(
    @Query() query: KqkdQueryDto,
    @Headers('authorization') authToken?: string,
  ) {
    return this.keHoachService.getKqkd(
      query.nam,
      query.loaiKeHoach || 'KE_HOACH',
      query.phienBan,
      authToken,
    );
  }
```

`@Headers('authorization')` là lối chuyển token đang dùng khắp repo (xem
`nhat-ky-chung.controller.ts:66`) — đừng dùng `@Req()`.

- [ ] **Step 7: Kiểm tra biên dịch và chạy lại cả thư mục ke-hoach**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach`
Expected: PASS toàn bộ

Run: `cd be && npx tsc --noEmit -p apps/voucher-service/tsconfig.app.json 2>&1 | grep -i "ke-hoach" || echo "không có lỗi mới ở ke-hoach"`
Expected: `không có lỗi mới ở ke-hoach`

- [ ] **Step 8: Commit**

```bash
git add be/apps/voucher-service/src/ke-hoach
git commit -m "feat(ke-hoach): endpoint báo cáo KQKD kế hoạch"
```

---

### Task 6: FE — service và hàm dựng hàng

**Files:**
- Create: `fe/src/services/kqkdKeHoachService.ts`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/lib/kqkdKeHoachRows.ts`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/lib/kqkdKeHoachRows.test.ts`

**Interfaces:**
- Consumes: `GET /voucher/ke-hoach/kqkd` (Task 5)
- Produces:
  - `KqkdKeHoachDong`, `KqkdKeHoachReport` (bản FE của DTO Task 4)
  - `kqkdKeHoachService.layBaoCao(nam, phienBan?): Promise<KqkdKeHoachReport>`
  - `HangKqkd { key; nhan; cap; thang; quy; sauThangDau; sauThangCuoi; nam; phanTram; children? }`
  - `dungBangKqkd(report: KqkdKeHoachReport): HangKqkd[]`

- [ ] **Step 1: Viết service**

Tạo `fe/src/services/kqkdKeHoachService.ts`:

```ts
import { ServiceBase } from './base/service-base';
import { chuanHoaThang } from './keHoachBanHangService';

export interface KqkdKeHoachDong {
  key: string;
  ma?: string;
  soLaMa?: string;
  ten: string;
  cap: 0 | 1 | 2;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  con?: KqkdKeHoachDong[];
}

export interface KqkdKeHoachReport {
  nam: number;
  dong: KqkdKeHoachDong[];
  doanhThuThuanNam: number;
}

/** BE có thể trả dòng thiếu tháng — chuẩn hoá về 12 số ngay ở cửa vào. */
const chuanHoaDong = (d: KqkdKeHoachDong): KqkdKeHoachDong => ({
  ...d,
  thang: chuanHoaThang(d.thang),
  ...(d.con ? { con: d.con.map(chuanHoaDong) } : {}),
});

class KqkdKeHoachService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach/kqkd' });
  }

  async layBaoCao(nam: number, phienBan?: string): Promise<KqkdKeHoachReport> {
    const res = await this.get<KqkdKeHoachReport>({
      params: { nam, loaiKeHoach: 'KE_HOACH', ...(phienBan ? { phienBan } : {}) },
    });
    return {
      nam: res?.nam ?? nam,
      doanhThuThuanNam: res?.doanhThuThuanNam ?? 0,
      dong: (res?.dong ?? []).map(chuanHoaDong),
    };
  }
}

export const kqkdKeHoachService = new KqkdKeHoachService();
```

- [ ] **Step 2: Viết test thất bại cho hàm dựng hàng**

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/lib/kqkdKeHoachRows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dungBangKqkd } from "./kqkdKeHoachRows";
import type { KqkdKeHoachReport } from "@/services/kqkdKeHoachService";

const thang = (...v: number[]) =>
  Array.from({ length: 12 }, (_, i) => v[i] ?? 0);

const baoCao = (
  dong: KqkdKeHoachReport["dong"],
  doanhThuThuanNam = 0,
): KqkdKeHoachReport => ({ nam: 2026, dong, doanhThuThuanNam });

describe("dungBangKqkd", () => {
  it("quý là tổng đúng ba tháng của quý đó", () => {
    const [hang] = dungBangKqkd(
      baoCao([
        { key: "01", ten: "DOANH THU", cap: 0, thang: thang(1, 2, 3, 10, 0, 0, 0, 0, 0, 0, 0, 100) },
      ]),
    );
    expect(hang.quy).toEqual([6, 10, 0, 100]);
  });

  it("sáu tháng đầu là T1–T6, sáu tháng cuối là T7–T12", () => {
    const [hang] = dungBangKqkd(
      baoCao([
        { key: "01", ten: "DOANH THU", cap: 0, thang: thang(1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2) },
      ]),
    );
    expect(hang.sauThangDau).toBe(6);
    expect(hang.sauThangCuoi).toBe(12);
    expect(hang.nam).toBe(18);
  });

  it("phần trăm chia cho doanh thu thuần cả năm", () => {
    const [hang] = dungBangKqkd(
      baoCao(
        [{ key: "20", ten: "LỢI NHUẬN GỘP", cap: 0, thang: thang(250) }],
        1000,
      ),
    );
    expect(hang.phanTram).toBeCloseTo(0.25);
  });

  it("doanh thu thuần bằng 0 thì phần trăm là null, không chia cho 0", () => {
    const [hang] = dungBangKqkd(
      baoCao([{ key: "20", ten: "LỢI NHUẬN GỘP", cap: 0, thang: thang(250) }], 0),
    );
    expect(hang.phanTram).toBeNull();
  });

  it("nhãn dòng cấp 0 ghép số La Mã, dòng con giữ nguyên tên", () => {
    const [hang] = dungBangKqkd(
      baoCao([
        {
          key: "01",
          soLaMa: "I",
          ten: "DOANH THU",
          cap: 0,
          thang: thang(10),
          con: [{ key: "01:N1", ten: "Nội thất", cap: 1, thang: thang(10) }],
        },
      ]),
    );
    expect(hang.nhan).toBe("I. DOANH THU");
    expect(hang.children![0].nhan).toBe("Nội thất");
  });

  it("dòng không có số La Mã chỉ hiện tên", () => {
    const [hang] = dungBangKqkd(
      baoCao([{ key: "31", ten: "THU NHẬP KHÁC", cap: 0, thang: thang(5) }]),
    );
    expect(hang.nhan).toBe("THU NHẬP KHÁC");
  });

  it("dòng có mảng tháng ngắn hơn 12 coi như 0, không văng lỗi", () => {
    const [hang] = dungBangKqkd(
      baoCao([{ key: "01", ten: "DOANH THU", cap: 0, thang: [5, 5] }]),
    );
    expect(hang.nam).toBe(10);
    expect(hang.quy).toEqual([10, 0, 0, 0]);
  });

  it("dòng con rỗng thì không gắn children — antd sẽ không vẽ nút mở", () => {
    const [hang] = dungBangKqkd(
      baoCao([{ key: "21", ten: "DOANH THU TÀI CHÍNH", cap: 0, thang: thang(1), con: [] }]),
    );
    expect(hang.children).toBeUndefined();
  });
});
```

- [ ] **Step 3: Chạy test cho chắc là nó đỏ**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/kqkd/lib/kqkdKeHoachRows.test.ts`
Expected: FAIL — không tìm thấy `./kqkdKeHoachRows`

- [ ] **Step 4: Viết cài đặt**

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/lib/kqkdKeHoachRows.ts`:

```ts
import type {
  KqkdKeHoachDong,
  KqkdKeHoachReport,
} from "@/services/kqkdKeHoachService";

/** Một hàng của bảng KQKD kế hoạch. BE chỉ trả 12 tháng, phần còn lại tính ở đây. */
export interface HangKqkd {
  key: string;
  /** Chuỗi hiện ở cột Chỉ tiêu — cấp 0 ghép số La Mã, cấp dưới giữ nguyên tên. */
  nhan: string;
  cap: 0 | 1 | 2;
  thang: number[];
  /** Bốn quý, mỗi quý là tổng ba tháng. */
  quy: number[];
  sauThangDau: number;
  sauThangCuoi: number;
  nam: number;
  /** Tỷ lệ trên doanh thu thuần cả năm; `null` khi mẫu số bằng 0. */
  phanTram: number | null;
  children?: HangKqkd[];
}

const so = (v?: number) => Number(v) || 0;

const cong = (thang: number[], tu: number, den: number) => {
  let tong = 0;
  for (let i = tu; i < den; i++) tong += so(thang[i]);
  return tong;
};

function dungHang(dong: KqkdKeHoachDong, mauSo: number): HangKqkd {
  const thang = Array.from({ length: 12 }, (_, i) => so(dong.thang?.[i]));
  const nam = cong(thang, 0, 12);
  const con = (dong.con ?? []).map((c) => dungHang(c, mauSo));

  return {
    key: dong.key,
    nhan: dong.soLaMa ? `${dong.soLaMa}. ${dong.ten}` : dong.ten,
    cap: dong.cap,
    thang,
    quy: [0, 1, 2, 3].map((q) => cong(thang, q * 3, q * 3 + 3)),
    sauThangDau: cong(thang, 0, 6),
    sauThangCuoi: cong(thang, 6, 12),
    nam,
    // Cùng một mẫu số cho cả bảng: doanh thu thuần cả năm, đúng cột "% DT thuần"
    // của trang Báo cáo KQKD.
    phanTram: mauSo === 0 ? null : nam / mauSo,
    // Mảng rỗng vẫn làm antd vẽ nút mở/đóng — bỏ hẳn trường đi.
    ...(con.length > 0 ? { children: con } : {}),
  };
}

export function dungBangKqkd(report: KqkdKeHoachReport): HangKqkd[] {
  const mauSo = so(report.doanhThuThuanNam);
  return report.dong.map((d) => dungHang(d, mauSo));
}
```

- [ ] **Step 5: Chạy test cho chắc là nó xanh**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/kqkd/lib/kqkdKeHoachRows.test.ts`
Expected: PASS, 8 test

- [ ] **Step 6: Commit**

```bash
git add fe/src/services/kqkdKeHoachService.ts fe/src/pages/ke-hoach/tabs/kqkd/lib
git commit -m "feat(ke-hoach): service và hàm dựng hàng KQKD kế hoạch"
```

---

### Task 7: FE — tab KQKD

**Files:**
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/KqkdTab.tsx`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/KqkdHandlerContext.tsx`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/KqkdTable.tsx`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/handler/kqkd.handler.ts`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/index.ts`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/init/init.handler.ts`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/init/init.event.ts`
- Create: `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/init/init.state.ts`
- Modify: `fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx`

**Interfaces:**
- Consumes: `kqkdKeHoachService.layBaoCao`, `dungBangKqkd`, `HangKqkd` (Task 6); `tien` từ `../lib/cotChung` (đã có)
- Produces: `<KqkdTab nam={number} phienBan={string | undefined} />`

- [ ] **Step 1: Dựng handler và context**

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/handler/kqkd.handler.ts`:

```ts
import { BaseEvents, CHanlder } from "@/common";
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import "./sub-handler";

export interface KqkdEvents extends BaseEvents {}

export interface KqkdStates extends BaseStates {}

export class KqkdHandler extends CHanlder<KqkdEvents, KqkdStates> {
  constructor() {
    super("ke-hoach-kqkd");
  }
}
```

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/index.ts`:

```ts
import { loadModule } from "@/common";

loadModule(import.meta.glob("./**/*.handler.ts", { eager: true }));
```

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/init/init.event.ts`:

```ts
import { BaseEvents } from "@/common";

export interface KqkdInitEvent extends BaseEvents {
  init: { params: { nam: number; phienBan?: string }; result: void };
}

declare module "../../kqkd.handler" {
  interface KqkdEvents extends KqkdInitEvent {}
}
```

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/init/init.state.ts`:

```ts
import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import type { HangKqkd } from "../../../lib/kqkdKeHoachRows";

export interface KqkdInitStates extends BaseStates {
  nam: number;
  hang: HangKqkd[];
  loading: boolean;
}

declare module "../../kqkd.handler" {
  interface KqkdStates extends KqkdInitStates {}
}
```

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/handler/sub-handler/init/init.handler.ts`:

```ts
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { kqkdKeHoachService } from "@/services/kqkdKeHoachService";
import { dungBangKqkd } from "../../../lib/kqkdKeHoachRows";
import type { KqkdEvents, KqkdStates } from "../../kqkd.handler";
import "./init.event";
import "./init.state";

@RegisterHandler("ke-hoach-kqkd")
export class KqkdInitHandler extends CSubHanlder<KqkdEvents, KqkdStates> {
  @HandlerDecorator("init")
  async init(params: { nam: number; phienBan?: string }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState("nam", params.nam);
    this.setState("loading", true);
    try {
      const baoCao = await kqkdKeHoachService.layBaoCao(
        params.nam,
        params.phienBan,
      );
      this.setState("hang", dungBangKqkd(baoCao));
    } catch (error) {
      console.error("Lỗi nạp KQKD kế hoạch:", error);
      this.setState("hang", []);
    } finally {
      this.setState("loading", false);
    }
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ["hang", []],
      ["loading", false],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
```

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/KqkdHandlerContext.tsx`:

```tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { KqkdHandler, KqkdStates } from "./handler/kqkd.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const KqkdHandlerContext = createContext<KqkdHandler | null>(null);

export function KqkdHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new KqkdHandler());

  return (
    <KqkdHandlerContext.Provider value={handler}>
      {children}
    </KqkdHandlerContext.Provider>
  );
}

export function useKqkdHandler() {
  const handler = useContext(KqkdHandlerContext);
  if (!handler) {
    throw new Error("useKqkdHandler phải dùng bên trong KqkdHandlerProvider");
  }
  return handler;
}

export function useKqkdState<K extends StateKey<KqkdStates>>(
  key: K,
  initialValue?: StateValue<KqkdStates, K>,
) {
  const handler = useKqkdHandler();
  return useChandlerState<KqkdStates, K>(key, handler, initialValue);
}
```

- [ ] **Step 2: Dựng bảng**

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/KqkdTable.tsx`:

```tsx
import React from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useKqkdState } from "./KqkdHandlerContext";
// Hai thư mục `lib` khác nhau: `./lib` là của riêng tab KQKD, `../lib` dùng chung
// cho cả ba tab bảng.
import type { HangKqkd } from "./lib/kqkdKeHoachRows";
import { tien } from "../lib/cotChung";

/** Số 0 hiện gạch ngang, số âm trong ngoặc màu đỏ — y như trang Báo cáo KQKD. */
const oSo = (v: number, cap: HangKqkd["cap"]) => {
  if (v === 0) return <span className="text-gray-400">-</span>;
  const chu = v < 0 ? `(${tien(Math.abs(v))})` : tien(v);
  return (
    <span
      className={[
        cap === 0 ? "font-semibold" : "",
        v < 0 ? "text-red-500" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {chu}
    </span>
  );
};

const oPhanTram = (v: number | null) => {
  if (v === null || v === 0) return <span className="text-gray-400">-</span>;
  const chu = `${(Math.abs(v) * 100).toFixed(1)}%`;
  return (
    <span className={v < 0 ? "text-red-500" : undefined}>
      {v < 0 ? `(${chu})` : chu}
    </span>
  );
};

const columns: ColumnsType<HangKqkd> = [
  {
    title: "Chỉ tiêu",
    dataIndex: "nhan",
    key: "nhan",
    width: 320,
    render: (nhan: string, row) => (
      <span className={row.cap === 0 ? "font-semibold" : undefined}>{nhan}</span>
    ),
  },
  {
    title: "Năm",
    key: "nam",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.nam, row.cap),
  },
  {
    title: "%",
    key: "phanTram",
    width: 80,
    align: "right",
    render: (_, row) => oPhanTram(row.phanTram),
  },
  {
    title: "6 tháng đầu",
    key: "sauThangDau",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.sauThangDau, row.cap),
  },
  {
    title: "6 tháng cuối",
    key: "sauThangCuoi",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.sauThangCuoi, row.cap),
  },
  {
    title: "Quý",
    key: "quy",
    children: [0, 1, 2, 3].map((i) => ({
      title: `Q${i + 1}`,
      key: `q${i + 1}`,
      width: 130,
      align: "right" as const,
      render: (_: unknown, row: HangKqkd) => oSo(row.quy[i], row.cap),
    })),
  },
  {
    title: "Tháng",
    key: "thang",
    children: Array.from({ length: 12 }, (_, i) => ({
      title: `T${i + 1}`,
      key: `t${i + 1}`,
      width: 130,
      align: "right" as const,
      render: (_: unknown, row: HangKqkd) => oSo(row.thang[i], row.cap),
    })),
  },
];

export const KqkdTable: React.FC = () => {
  const [hang] = useKqkdState("hang", []);
  const [loading] = useKqkdState("loading", false);

  return (
    <Table<HangKqkd>
      className="excel-table"
      columns={columns}
      dataSource={hang}
      rowKey="key"
      loading={loading}
      size="small"
      bordered
      pagination={false}
      // Mặc định đóng hết: mở trang chỉ thấy các dòng mục.
      expandable={{ defaultExpandedRowKeys: [] }}
      scroll={{ x: "max-content", y: "calc(100vh - 260px)" }}
      rowClassName={(row) => (row.cap === 0 ? "kh-hang-tong" : "")}
      locale={{ emptyText: "Chưa có dòng kế hoạch nào trong năm" }}
    />
  );
};
```

Tạo `fe/src/pages/ke-hoach/tabs/kqkd/KqkdTab.tsx`:

```tsx
import React, { useEffect } from "react";
import { KqkdHandlerProvider, useKqkdHandler } from "./KqkdHandlerContext";
import { KqkdTable } from "./KqkdTable";

interface Props {
  nam: number;
  phienBan?: string;
}

const KqkdTabInner: React.FC<Props> = ({ nam, phienBan }) => {
  const handler = useKqkdHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, phienBan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, phienBan]);

  return <KqkdTable />;
};

export const KqkdTab: React.FC<Props> = (props) => (
  <KqkdHandlerProvider>
    <KqkdTabInner {...props} />
  </KqkdHandlerProvider>
);
```

- [ ] **Step 3: Gắn vào trang tab và thêm ô Phiên bản**

Sửa `fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx`:

Thêm import:

```tsx
import { KqkdTab } from "./kqkd/KqkdTab";
import { keHoachService } from "@/services/keHoachService";
```

Thêm state và nạp danh sách phiên bản (đặt cạnh `const [nam, setNam]`):

```tsx
  // Gộp nhiều phiên bản kế hoạch vào một bảng KQKD là cộng trùng — cho chọn được.
  const [phienBan, setPhienBan] = useState<string | undefined>(undefined);
  const [phienBanList, setPhienBanList] = useState<string[]>([]);

  useEffect(() => {
    keHoachService
      .getPhienBanOptions("KE_HOACH")
      .then(setPhienBanList)
      .catch(() => setPhienBanList([]));
  }, []);
```

Thêm `useEffect` vào khối import React ở đầu file.

Thêm ô chọn vào `<Space wrap>`, **trước** ô chọn Năm:

```tsx
          {activeTab === "kqkd" && (
            <Select
              value={phienBan}
              onChange={setPhienBan}
              style={{ width: 200 }}
              options={[
                { label: "Tất cả phiên bản", value: undefined as unknown as string },
                ...phienBanList.map((p) => ({ label: p, value: p })),
              ]}
            />
          )}
```

Thay dòng khung "Sắp có" của tab KQKD:

```tsx
        {activeTab === "kqkd" && <KqkdTab nam={nam} phienBan={phienBan} />}
```

`keHoachService.getPhienBanOptions(loaiKeHoach?)` đã có sẵn và trả `Promise<string[]>`
(`fe/src/services/keHoachService.ts:140`) — dùng luôn, không thêm phương thức mới.

- [ ] **Step 4: Chạy toàn bộ test FE của trang kế hoạch**

Run: `cd fe && npx vitest run src/pages/ke-hoach`
Expected: PASS — cả test mới lẫn `KeHoachFormPage.render.test.tsx`, `tongHop.test.ts`, `nhapBang.test.ts` sẵn có

- [ ] **Step 5: Dựng bản build cho chắc không lỗi cú pháp**

Run: `cd fe && npm run build`
Expected: build xong, không lỗi

Run: `cd fe && npx eslint src/pages/ke-hoach/tabs/kqkd src/services/kqkdKeHoachService.ts`
Expected: không lỗi

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/ke-hoach/tabs/kqkd fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx
git commit -m "feat(ke-hoach): tab KQKD"
```

---

## Kiểm tra cuối

- [ ] `cd be && npx jest libs/core/src/utils/kqkd-chi-tieu.spec.ts apps/voucher-service/src/ke-hoach apps/reporting-service` — xanh
- [ ] `cd fe && npx vitest run src/pages/ke-hoach` — xanh
- [ ] `cd fe && npm run build` — xong
- [ ] Chạy thật: `cd be && yarn start:voucher:dev` + `cd fe && npm run dev`, mở `/trung-tam-du-lieu/ke-hoach`, sang tab KQKD, chọn năm có dòng kế hoạch — 16 dòng mục hiện ra, bung mục I thấy nhóm sản phẩm, bung mục VII thấy nhóm khoản mục → khoản mục.
- [ ] Đối chiếu: tổng cột Năm của mục I phải bằng tổng phát sinh Có 511 của các dòng ở tab Chi tiết cùng năm.
