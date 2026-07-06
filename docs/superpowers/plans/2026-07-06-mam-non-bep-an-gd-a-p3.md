# Module Bếp ăn (Mầm non) — GĐ A Phần 3: Engine tính chi phí + Bảng kiểm soát — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tính **chi phí ăn thực theo tiêu hao** (số suất × công thức, định giá theo đơn giá nhập kho), so với **ngân sách** (số trẻ × định mức) ra **hao phí**; expose **bảng kiểm soát**; và ghi sổ giá vốn **Nợ 632/Có 152** khi chốt tiêu hao.

**Architecture:** Logic tính toán tách thành **module hàm thuần** (`bep-an-engine`) — TDD fast-check, không phụ thuộc DB/service. Endpoint bảng kiểm soát orchestrate: đọc điểm danh/định mức/công thức (repo mam-non) + phiếu nhập kho (kho-service qua ServiceClient) → chạy engine → trả report. "Chốt tiêu hao" tạo phiếu xuất kho (kho) + bút toán 632/152 (voucher), retry-safe như nhận hàng.

**Tech Stack:** NestJS 11, TypeORM (Mongo), `@app/service-client`, Jest + fast-check.

## Global Constraints

- Tiếp nối Phần 1+2 (branch `feat/mam-non-bep-an`, `mam-non-service` port 3010). Entity đã có: `diem_danh_an`, `dinh_muc_tien_an`, `cong_thuc_dinh_luong`, `de_xuat_mua_thuc_pham`.
- **Cột decimal đọc từ Mongo là STRING** → mọi phép toán tiền phải qua `toNumber(v)=Number(v)||0`. (Bài học Critical Phần 2.)
- **Định giá tiêu hao lấy từ phiếu NHẬP kho** (kho-service GET `/phieu?loaiPhieu=NHAP`), KHÔNG từ Nhật ký chung (NKC chỉ có tổng `soTien`, không có đơn giá item). Đơn giá bình quân hàng hóa X = Σ`thanhTien`(nhập X) / Σ`soLuong`(nhập X).
- **Ghi sổ giá vốn** khi chốt tiêu hao: `serviceClient.post('voucher','/nhat-ky-chung', …)` Nợ **632** "Giá vốn hàng bán"/Có **152**; + `serviceClient.post('kho','/phieu', …)` `loaiPhieu:'XUAT'`. Tài khoản hardcode MVP (cùng chỗ với 152/331 Phần 2).
- `ServiceClient` nuốt lỗi → luôn check `res.success`. Forward JWT qua `@Headers('authorization')`.
- Verify (không có Mongo/service): **build pass** + **fast-check** cho mọi hàm engine. Orchestration/ghi-sổ build-verify.
- Route tĩnh trước `@Get(':id')`. Tenant tự động.

---

## Task 1: Module engine hàm thuần (`bep-an-engine`) — TDD

**Files:**
- Create: `be/apps/mam-non-service/src/engine/bep-an-engine.ts`
- Create: `be/apps/mam-non-service/src/engine/bep-an-engine.spec.ts`

**Interfaces:**
- Produces (tất cả hàm THUẦN, không side-effect):
  - `toNumber(v: unknown): number`
  - `tinhTieuHao(rows: DiemDanhLite[], congThucByCode: Record<string, CongThucLite>): TieuHaoItem[]`
  - `tinhNganSach(rows: DiemDanhLite[], dinhMucList: DinhMucLite[]): number`
  - `tinhDonGiaBinhQuan(nhapChiTiet: NhapChiTietLite[]): Record<string, number>`
  - `tinhChiPhiThuc(tieuHao: TieuHaoItem[], donGiaBq: Record<string, number>): number`
  - `tinhHaoPhi(nganSach: number, chiPhiThuc: number, nguongPct?: number): { chenhLech: number; haoPhiPct: number; vuot: boolean }`
- Types (khai trong file engine):
  - `DiemDanhLite = { lopMa?: string; goiAnMa?: string; soTreAnThucTe: number | string; congThucCode?: string }`
  - `CongThucLite = { chiTiet: { hangHoaMa: string; hangHoaTen: string; donViTinh?: string; dinhLuong: number | string }[] }`
  - `TieuHaoItem = { hangHoaMa: string; hangHoaTen: string; donViTinh?: string; soLuong: number }`
  - `DinhMucLite = { phamVi?: string; doiTuongMa?: string; mucTien: number | string }`
  - `NhapChiTietLite = { hangHoaMa: string; soLuong: number | string; thanhTien: number | string }`

- [ ] **Step 1: Viết test thất bại** — `be/apps/mam-non-service/src/engine/bep-an-engine.spec.ts`
```ts
import * as fc from 'fast-check';
import {
  toNumber, tinhTieuHao, tinhNganSach, tinhDonGiaBinhQuan, tinhChiPhiThuc, tinhHaoPhi,
} from './bep-an-engine';

describe('toNumber', () => {
  it('ép chuỗi decimal Mongo về số; rác → 0', () => {
    expect(toNumber('15.00')).toBe(15);
    expect(toNumber(3)).toBe(3);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('abc')).toBe(0);
  });
});

describe('tinhTieuHao', () => {
  const congThuc = { CT1: { chiTiet: [
    { hangHoaMa: 'G01', hangHoaTen: 'Gạo', donViTinh: 'kg', dinhLuong: 0.1 },
    { hangHoaMa: 'T01', hangHoaTen: 'Thịt', donViTinh: 'kg', dinhLuong: 0.05 },
  ] } };
  it('tiêu hao = Σ số suất × định lượng theo hàng hóa', () => {
    const rows = [
      { soTreAnThucTe: 90, congThucCode: 'CT1' },
      { soTreAnThucTe: 10, congThucCode: 'CT1' },
    ];
    const out = tinhTieuHao(rows, congThuc);
    const gao = out.find((x) => x.hangHoaMa === 'G01')!;
    expect(gao.soLuong).toBeCloseTo(100 * 0.1); // 10
  });
  it('bỏ qua dòng không có công thức khớp', () => {
    expect(tinhTieuHao([{ soTreAnThucTe: 50, congThucCode: 'X' }], congThuc)).toEqual([]);
  });
  it('property: tổng tiêu hao 1 hàng hóa = (Σ số suất) × định lượng khi cùng công thức', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 0, max: 500 }), { minLength: 0, maxLength: 30 }),
      (sizes) => {
        const rows = sizes.map((s) => ({ soTreAnThucTe: s, congThucCode: 'CT1' }));
        const out = tinhTieuHao(rows, congThuc);
        const tongSuat = sizes.reduce((a, b) => a + b, 0);
        const gao = out.find((x) => x.hangHoaMa === 'G01');
        const expected = tongSuat * 0.1;
        return tongSuat === 0 ? (gao === undefined || Math.abs(gao.soLuong) < 1e-9)
                              : Math.abs((gao?.soLuong ?? 0) - expected) < 1e-6;
      },
    ), { numRuns: 100 });
  });
});

describe('tinhNganSach', () => {
  it('Σ số trẻ × mức định mức khớp lớp; fallback CHUNG', () => {
    const dm = [
      { phamVi: 'LOP', doiTuongMa: 'L1', mucTien: 35000 },
      { phamVi: 'CHUNG', mucTien: 30000 },
    ];
    const rows = [
      { lopMa: 'L1', soTreAnThucTe: 10 },   // 10 × 35000
      { lopMa: 'L2', soTreAnThucTe: 5 },    // fallback CHUNG 5 × 30000
    ];
    expect(tinhNganSach(rows, dm)).toBe(10 * 35000 + 5 * 30000);
  });
  it('không có định mức khớp và không CHUNG → 0 cho dòng đó', () => {
    expect(tinhNganSach([{ lopMa: 'L9', soTreAnThucTe: 10 }], [{ phamVi: 'LOP', doiTuongMa: 'L1', mucTien: 1 }])).toBe(0);
  });
});

describe('tinhDonGiaBinhQuan', () => {
  it('đơn giá bq = Σ thành tiền / Σ số lượng theo hàng hóa', () => {
    const rows = [
      { hangHoaMa: 'G01', soLuong: 10, thanhTien: 100 }, // 10đ/kg
      { hangHoaMa: 'G01', soLuong: 10, thanhTien: 300 }, // 30đ/kg → bq (400/20)=20
    ];
    expect(tinhDonGiaBinhQuan(rows)['G01']).toBe(20);
  });
  it('số lượng 0 → đơn giá 0 (không chia 0)', () => {
    expect(tinhDonGiaBinhQuan([{ hangHoaMa: 'X', soLuong: 0, thanhTien: 50 }])['X']).toBe(0);
  });
});

describe('tinhChiPhiThuc', () => {
  it('= Σ tiêu hao × đơn giá bq', () => {
    const tieuHao = [
      { hangHoaMa: 'G01', hangHoaTen: 'Gạo', soLuong: 10 },
      { hangHoaMa: 'T01', hangHoaTen: 'Thịt', soLuong: 5 },
    ];
    expect(tinhChiPhiThuc(tieuHao, { G01: 20, T01: 100 })).toBe(10 * 20 + 5 * 100);
  });
});

describe('tinhHaoPhi', () => {
  it('chênh lệch, %, cờ vượt', () => {
    expect(tinhHaoPhi(1000, 1200)).toEqual({ chenhLech: 200, haoPhiPct: 20, vuot: true });
    expect(tinhHaoPhi(1000, 900)).toEqual({ chenhLech: -100, haoPhiPct: -10, vuot: false });
    expect(tinhHaoPhi(0, 500).vuot).toBe(true);       // ngân sách 0, có chi → vượt
    expect(tinhHaoPhi(0, 0)).toEqual({ chenhLech: 0, haoPhiPct: 0, vuot: false });
  });
  it('ngưỡng cảnh báo: chỉ vượt khi > ngân sách × (1+ngưỡng)', () => {
    expect(tinhHaoPhi(1000, 1050, 10).vuot).toBe(false); // +5% < ngưỡng 10%
    expect(tinhHaoPhi(1000, 1150, 10).vuot).toBe(true);  // +15% > 10%
  });
});
```

- [ ] **Step 2: Chạy test — RED** — `cd be && npx jest bep-an-engine.spec --silent` → FAIL (module chưa có).

- [ ] **Step 3: Viết engine** — `be/apps/mam-non-service/src/engine/bep-an-engine.ts`
```ts
export function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface DiemDanhLite { lopMa?: string; goiAnMa?: string; soTreAnThucTe: number | string; congThucCode?: string; }
export interface CongThucLite { chiTiet: { hangHoaMa: string; hangHoaTen: string; donViTinh?: string; dinhLuong: number | string }[]; }
export interface TieuHaoItem { hangHoaMa: string; hangHoaTen: string; donViTinh?: string; soLuong: number; }
export interface DinhMucLite { phamVi?: string; doiTuongMa?: string; mucTien: number | string; }
export interface NhapChiTietLite { hangHoaMa: string; soLuong: number | string; thanhTien: number | string; }

export function tinhTieuHao(rows: DiemDanhLite[], congThucByCode: Record<string, CongThucLite>): TieuHaoItem[] {
  const acc = new Map<string, TieuHaoItem>();
  for (const row of rows ?? []) {
    const ct = row.congThucCode ? congThucByCode[row.congThucCode] : undefined;
    if (!ct) continue;
    const soSuat = toNumber(row.soTreAnThucTe);
    for (const line of ct.chiTiet ?? []) {
      const cur = acc.get(line.hangHoaMa) ?? {
        hangHoaMa: line.hangHoaMa, hangHoaTen: line.hangHoaTen, donViTinh: line.donViTinh, soLuong: 0,
      };
      cur.soLuong += soSuat * toNumber(line.dinhLuong);
      acc.set(line.hangHoaMa, cur);
    }
  }
  return [...acc.values()];
}

function matchMucTien(row: DiemDanhLite, dinhMucList: DinhMucLite[]): number {
  const key = row.lopMa ?? row.goiAnMa;
  const specific = (dinhMucList ?? []).find((d) => d.phamVi !== 'CHUNG' && d.doiTuongMa && d.doiTuongMa === key);
  if (specific) return toNumber(specific.mucTien);
  const chung = (dinhMucList ?? []).find((d) => d.phamVi === 'CHUNG');
  return chung ? toNumber(chung.mucTien) : 0;
}

export function tinhNganSach(rows: DiemDanhLite[], dinhMucList: DinhMucLite[]): number {
  return (rows ?? []).reduce((sum, row) => sum + toNumber(row.soTreAnThucTe) * matchMucTien(row, dinhMucList), 0);
}

export function tinhDonGiaBinhQuan(nhapChiTiet: NhapChiTietLite[]): Record<string, number> {
  const agg = new Map<string, { sl: number; tt: number }>();
  for (const r of nhapChiTiet ?? []) {
    const cur = agg.get(r.hangHoaMa) ?? { sl: 0, tt: 0 };
    cur.sl += toNumber(r.soLuong);
    cur.tt += toNumber(r.thanhTien);
    agg.set(r.hangHoaMa, cur);
  }
  const out: Record<string, number> = {};
  for (const [ma, { sl, tt }] of agg) out[ma] = sl > 0 ? tt / sl : 0;
  return out;
}

export function tinhChiPhiThuc(tieuHao: TieuHaoItem[], donGiaBq: Record<string, number>): number {
  return (tieuHao ?? []).reduce((sum, t) => sum + t.soLuong * (donGiaBq[t.hangHoaMa] ?? 0), 0);
}

export function tinhHaoPhi(nganSach: number, chiPhiThuc: number, nguongPct = 0): { chenhLech: number; haoPhiPct: number; vuot: boolean } {
  const chenhLech = chiPhiThuc - nganSach;
  const haoPhiPct = nganSach > 0 ? (chenhLech / nganSach) * 100 : 0;
  const nguong = nganSach > 0 ? nganSach * (1 + nguongPct / 100) : 0;
  const vuot = nganSach > 0 ? chiPhiThuc > nguong : chiPhiThuc > 0;
  return { chenhLech, haoPhiPct, vuot };
}
```

- [ ] **Step 4: Chạy test — GREEN** — `cd be && npx jest bep-an-engine.spec --silent` → PASS.

- [ ] **Step 5: Commit**
```bash
git add be/apps/mam-non-service/src/engine
git commit -m "feat(mam-non): engine tính chi phí ăn (tiêu hao/ngân sách/đơn giá bq/hao phí) — hàm thuần TDD"
```

---

## Task 2: Endpoint Bảng kiểm soát chi phí ăn

**Files:**
- Create: `be/apps/mam-non-service/src/kiem-soat/{kiem-soat.controller,kiem-soat.service,kiem-soat.module}.ts`
- Modify: `be/apps/mam-non-service/src/mam-non-service.module.ts`

**Interfaces:**
- Consumes: engine (Task 1); repo `DiemDanhAn`, `DinhMucTienAn`, `CongThucDinhLuong` (đọc trực tiếp qua `@InjectRepository`); `ServiceClient` (đọc phiếu nhập kho).
- Produces: `GET /mam-non/kiem-soat/chi-phi?tuNgay=&denNgay=&nguongPct=` → `{ nganSach, chiPhiThuc, chenhLech, haoPhiPct, vuot, tieuHao: TieuHaoItem[] }`.

- [ ] **Step 1: Service** `kiem-soat.service.ts` — orchestrate đọc dữ liệu + gọi engine.
```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DiemDanhAn, DinhMucTienAn, CongThucDinhLuong } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { tinhTieuHao, tinhNganSach, tinhDonGiaBinhQuan, tinhChiPhiThuc, tinhHaoPhi } from '../engine/bep-an-engine';

@Injectable()
export class KiemSoatService {
  constructor(
    @InjectRepository(DiemDanhAn) private readonly diemDanhRepo: Repository<DiemDanhAn>,
    @InjectRepository(DinhMucTienAn) private readonly dinhMucRepo: Repository<DinhMucTienAn>,
    @InjectRepository(CongThucDinhLuong) private readonly congThucRepo: Repository<CongThucDinhLuong>,
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private tf() { const t = this.tenantContext.getCurrentTenantId(); return t ? { tenantId: t } : {}; }

  async chiPhi(tuNgay?: string, denNgay?: string, nguongPct?: number, authToken?: string) {
    // 1) Điểm danh trong kỳ (lọc theo ngày ở JS cho đơn giản)
    const allDiemDanh = await this.diemDanhRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const from = tuNgay ? new Date(tuNgay) : null;
    const to = denNgay ? new Date(denNgay) : null;
    const rows = allDiemDanh.filter((d) => {
      const n = new Date(d.ngay).getTime();
      return (!from || n >= from.getTime()) && (!to || n <= to.getTime());
    });

    // 2) Định mức + công thức
    const dinhMucList = await this.dinhMucRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const congThucList = await this.congThucRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const congThucByCode: Record<string, any> = {};
    for (const c of congThucList) congThucByCode[c.code] = { chiTiet: c.chiTiet };

    // 3) Phiếu nhập kho (để định giá)
    const nhapRes = await this.serviceClient.get<any>('kho', '/phieu', {
      headers: authToken ? { Authorization: authToken } : undefined,
      query: { loaiPhieu: 'NHAP', limit: 1000 },
    });
    const nhapPhieu: any[] = nhapRes.success ? (nhapRes.data?.data ?? nhapRes.data ?? []) : [];
    const nhapChiTiet = nhapPhieu.flatMap((p) => (p.chiTiet ?? []).map((ct: any) => ({
      hangHoaMa: ct.hangHoaMa, soLuong: ct.soLuong, thanhTien: ct.thanhTien,
    })));

    // 4) Engine
    const tieuHao = tinhTieuHao(rows as any, congThucByCode);
    const donGiaBq = tinhDonGiaBinhQuan(nhapChiTiet);
    const chiPhiThuc = tinhChiPhiThuc(tieuHao, donGiaBq);
    const nganSach = tinhNganSach(rows as any, dinhMucList as any);
    const haoPhi = tinhHaoPhi(nganSach, chiPhiThuc, nguongPct ?? 0);

    return { nganSach, chiPhiThuc, ...haoPhi, tieuHao, canhBaoDinhGiaThieu: !nhapRes.success };
  }
}
```

- [ ] **Step 2: Controller** `kiem-soat.controller.ts`
```ts
import { Controller, Get, Query, UseGuards, Headers } from '@nestjs/common';
import { KiemSoatService } from './kiem-soat.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('kiem-soat')
@UseGuards(JwtGuard, RoleGuard)
export class KiemSoatController {
  constructor(private readonly service: KiemSoatService) {}

  @Get('chi-phi')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async chiPhi(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('nguongPct') nguongPct?: string,
    @Headers('authorization') authToken?: string,
  ) {
    const data = await this.service.chiPhi(tuNgay, denNgay, nguongPct ? Number(nguongPct) : 0, authToken);
    return { success: true, data };
  }
}
```

- [ ] **Step 3: Module** `kiem-soat.module.ts`
```ts
import { Module } from '@nestjs/common';
import { DiemDanhAn, DinhMucTienAn, CongThucDinhLuong } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { KiemSoatService } from './kiem-soat.service';
import { KiemSoatController } from './kiem-soat.controller';

@Module({
  imports: [DatabaseModule.forFeature([DiemDanhAn, DinhMucTienAn, CongThucDinhLuong])],
  controllers: [KiemSoatController],
  providers: [KiemSoatService],
})
export class KiemSoatModule {}
```
(ServiceClient có sẵn toàn cục từ Phần 2 `ServiceClientModule.forRoot()`.)

- [ ] **Step 4: Đăng ký** `KiemSoatModule` vào `mam-non-service.module.ts` imports[].

- [ ] **Step 5: Build** — `cd be && npx nest build mam-non-service` → pass.

- [ ] **Step 6: Commit**
```bash
git add be/apps/mam-non-service/src/kiem-soat be/apps/mam-non-service/src/mam-non-service.module.ts
git commit -m "feat(mam-non): bảng kiểm soát chi phí ăn (ngân sách vs chi phí thực, hao phí)"
```

---

## Task 3: Chốt tiêu hao → ghi sổ giá vốn (632/152) + phiếu xuất kho

**Files:**
- Create: `be/apps/mam-non-service/src/kiem-soat/ghi-so-tieu-hao.builder.ts` + `.spec.ts`
- Modify: `kiem-soat.service.ts` (thêm `chotTieuHao`), `kiem-soat.controller.ts` (route POST), `nhan-hang.builder.ts` (tách hằng số tài khoản dùng chung — tùy chọn)

**Interfaces:**
- Consumes: engine (Task 1), `tinhTieuHao`/`tinhDonGiaBinhQuan`/`tinhChiPhiThuc`.
- Produces: `buildButToanGiaVon(chiPhiThuc, ngay, dienGiai)` → body `POST voucher /nhat-ky-chung` Nợ 632/Có 152; `buildPhieuXuatKho(tieuHao, donGiaBq, ngay)` → body `POST kho /phieu` `loaiPhieu:'XUAT'`; endpoint `POST /mam-non/kiem-soat/chot-tieu-hao?tuNgay=&denNgay=` tạo phiếu xuất + bút toán 632/152 (forward JWT, check `res.success`).

- [ ] **Step 1: TDD builders — test trước** `ghi-so-tieu-hao.builder.spec.ts`
```ts
import { buildButToanGiaVon, buildPhieuXuatKho } from './ghi-so-tieu-hao.builder';

describe('buildButToanGiaVon', () => {
  it('Nợ 632 / Có 152, soTien = chi phí thực (number)', () => {
    const b = buildButToanGiaVon(1200, new Date('2026-07-06T00:00:00Z'), 'Xuất ăn 06/07');
    expect(b.danhMuc.taiKhoanNo.ma).toBe('632');
    expect(b.danhMuc.taiKhoanCo.ma).toBe('152');
    expect(b.soTien).toBe(1200);
    expect(typeof b.ngay).toBe('string');
  });
});

describe('buildPhieuXuatKho', () => {
  it('loaiPhieu XUAT, chiTiet = tiêu hao × đơn giá, tkNo 632/tkCo 152', () => {
    const tieuHao = [{ hangHoaMa: 'G01', hangHoaTen: 'Gạo', donViTinh: 'kg', soLuong: 10 }];
    const p = buildPhieuXuatKho(tieuHao, { G01: 20 }, new Date('2026-07-06T00:00:00Z'));
    expect(p.loaiPhieu).toBe('XUAT');
    expect(p.chiTiet[0].soLuong).toBe(10);
    expect(p.chiTiet[0].donGia).toBe(20);
    expect(p.chiTiet[0].thanhTien).toBe(200);
    expect(p.chiTiet[0].tkNo).toBe('632');
    expect(p.chiTiet[0].tkCo).toBe('152');
  });
});
```
Run: `cd be && npx jest ghi-so-tieu-hao.builder.spec --silent` → RED.

- [ ] **Step 2: Builders** `ghi-so-tieu-hao.builder.ts`
```ts
import { TieuHaoItem } from '../engine/bep-an-engine';

const TK_GIA_VON = { ma: '632', ten: 'Giá vốn hàng bán' };
const TK_KHO = { ma: '152', ten: 'Nguyên liệu, vật liệu' };

function toISODate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

export function buildButToanGiaVon(chiPhiThuc: number, ngay: Date | string, dienGiai: string) {
  return {
    loai: 'PHIEU_CHI',
    ngay: toISODate(ngay),
    soTien: Number(chiPhiThuc) || 0,
    noiDung: dienGiai,
    danhMuc: { taiKhoanNo: { ...TK_GIA_VON }, taiKhoanCo: { ...TK_KHO } },
  };
}

export function buildPhieuXuatKho(tieuHao: TieuHaoItem[], donGiaBq: Record<string, number>, ngay: Date | string) {
  const chiTiet = (tieuHao ?? []).map((t, i) => {
    const donGia = donGiaBq[t.hangHoaMa] ?? 0;
    return {
      stt: i + 1, hangHoaMa: t.hangHoaMa, hangHoaTen: t.hangHoaTen, donViTinh: t.donViTinh,
      soLuong: t.soLuong, donGia, thanhTien: t.soLuong * donGia, tkNo: '632', tkCo: '152',
    };
  });
  return {
    loaiPhieu: 'XUAT',
    ngayHachToan: toISODate(ngay),
    dienGiai: 'Xuất kho tiêu hao ăn theo tiêu hao',
    tongTien: chiTiet.reduce((s, c) => s + c.thanhTien, 0),
    chiTiet,
  };
}
```
Run: `cd be && npx jest ghi-so-tieu-hao.builder.spec --silent` → GREEN.

- [ ] **Step 3: `chotTieuHao` trong service** `kiem-soat.service.ts` — tái dùng logic đọc dữ liệu của `chiPhi`, rồi post xuất kho + bút toán.
```ts
// thêm import:
import { BadRequestException } from '@nestjs/common';
import { buildButToanGiaVon, buildPhieuXuatKho } from './ghi-so-tieu-hao.builder';

async chotTieuHao(tuNgay?: string, denNgay?: string, authToken?: string) {
  const r = await this.chiPhi(tuNgay, denNgay, 0, authToken);
  if (!r.tieuHao.length) throw new BadRequestException('Không có tiêu hao trong kỳ để chốt');
  if (!(r.chiPhiThuc > 0)) throw new BadRequestException('Chi phí thực = 0, không thể ghi sổ giá vốn');
  const ngay = denNgay ?? tuNgay ?? new Date().toISOString().slice(0, 10);
  const headers = authToken ? { Authorization: authToken } : undefined;

  // đơn giá bq lại (từ chiPhi không trả ra) — gọi lại đọc nhập; để đơn giản, dựng phiếu xuất bằng tieuHao + tính lại đơn giá qua chi phí/số lượng? -> Tạo lại đơn giá map:
  const nhapRes = await this.serviceClient.get<any>('kho', '/phieu', {
    headers, query: { loaiPhieu: 'NHAP', limit: 1000 },
  });
  const nhapPhieu: any[] = nhapRes.success ? (nhapRes.data?.data ?? nhapRes.data ?? []) : [];
  const nhapChiTiet = nhapPhieu.flatMap((p) => (p.chiTiet ?? []).map((ct: any) => ({
    hangHoaMa: ct.hangHoaMa, soLuong: ct.soLuong, thanhTien: ct.thanhTien,
  })));
  const { tinhDonGiaBinhQuan } = await import('../engine/bep-an-engine');
  const donGiaBq = tinhDonGiaBinhQuan(nhapChiTiet);

  const xuatRes = await this.serviceClient.post<any>('kho', '/phieu', {
    headers, body: buildPhieuXuatKho(r.tieuHao, donGiaBq, ngay),
  });
  if (!xuatRes.success) throw new BadRequestException(`Tạo phiếu xuất kho thất bại: ${xuatRes.error?.message ?? xuatRes.error?.code ?? 'unknown'}`);

  const butRes = await this.serviceClient.post<any>('voucher', '/nhat-ky-chung', {
    headers, body: buildButToanGiaVon(r.chiPhiThuc, ngay, `Giá vốn ăn kỳ ${tuNgay ?? ''}..${denNgay ?? ''}`),
  });
  if (!butRes.success) throw new BadRequestException(`Ghi sổ giá vốn thất bại: ${butRes.error?.message ?? butRes.error?.code ?? 'unknown'}`);

  return { chiPhiThuc: r.chiPhiThuc, soPhieuXuat: xuatRes.data?.soPhieu ?? xuatRes.data?._id, chungTuId: butRes.data?._id ?? butRes.data?.id };
}
```
> Lưu ý idempotency: task này CHƯA chống double-post (chốt 2 lần → 2 phiếu xuất). Đây là hạn chế đã ghi nhận (backlog: idempotency key). MVP: chốt là thao tác có chủ đích của kế toán.

- [ ] **Step 4: Route** `kiem-soat.controller.ts` — thêm:
```ts
import { Post } from '@nestjs/common';
// ...
@Post('chot-tieu-hao') @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
async chotTieuHao(
  @Query('tuNgay') tuNgay?: string,
  @Query('denNgay') denNgay?: string,
  @Headers('authorization') authToken?: string,
) {
  return { success: true, data: await this.service.chotTieuHao(tuNgay, denNgay, authToken) };
}
```

- [ ] **Step 5: Build + test**
Run: `cd be && npx jest bep-an-engine.spec ghi-so-tieu-hao.builder.spec --silent && npx nest build mam-non-service`
Expected: tests PASS + build pass.

- [ ] **Step 6: Commit**
```bash
git add be/apps/mam-non-service/src/kiem-soat
git commit -m "feat(mam-non): chốt tiêu hao → phiếu xuất kho + bút toán giá vốn 632/152 (ServiceClient)"
```

---

## Kết thúc Phần 3

Sau Task 3: có engine tính chi phí (TDD), bảng kiểm soát (ngân sách vs chi phí thực → hao phí/cảnh báo), và ghi sổ giá vốn 632/152 khi chốt tiêu hao. **Vòng lặp kế toán bếp ăn đầy đủ trong "một sổ"**: nhập (152/331) → tiêu hao (632/152) → công nợ & giá vốn tự lên báo cáo.

**Verify tổng Phần 3:**
Run: `cd be && npx jest bep-an-engine.spec ghi-so-tieu-hao.builder.spec --silent && npx nest build mam-non-service`

**Giả định/hạn chế (cho review):** (1) định giá = bình quân toàn bộ phiếu nhập (không theo kỳ/FIFO) — MVP; (2) chốt tiêu hao chưa idempotent (chốt lại → double-post) — backlog; (3) TK 632/152/331 hardcode; (4) `loai:'PHIEU_CHI'` cho bút toán KHAC (lệch getStats — như Phần 2, DTO chỉ cho PHIEU_THU/CHI); (5) đọc nhập kho `limit:1000` — cap, chưa phân trang.

**Còn lại GĐ A:** Phần 4 — FE (lĩnh vực Mầm non + trang danh mục/điểm danh/đề xuất/bảng kiểm soát).
