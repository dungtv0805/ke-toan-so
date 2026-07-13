import { describe, it, expect } from 'vitest';
import type { SoCaiByAccount, SoCaiEntry, TrialBalance } from '@/services/soCaiService';
import { filterSoCaiChiTiet, filterSoCaiSummary, filterTrialBalance } from './soCaiFilter';

const entry = (soPhieu: string, loaiChungTu: string, dienGiai: string, n: number): SoCaiEntry => ({
  ngay: '01/01/2026',
  soPhieu,
  loaiChungTu,
  dienGiai,
  phatSinhNo: n,
  phatSinhCo: n * 2,
  soDuNo: n * 3,
  soDuCo: 0,
});

const account = (taiKhoan: string, tenTaiKhoan: string): SoCaiByAccount => ({
  taiKhoan,
  tenTaiKhoan,
  soDuDauKyNo: 1000,
  soDuDauKyCo: 0,
  phatSinhNo: 999, // số gốc từ BE — cố tình lệch để thấy khi nào tính lại
  phatSinhCo: 999,
  soDuCuoiKyNo: 2000,
  soDuCuoiKyCo: 0,
  chiTiet: [],
});

const summary: SoCaiByAccount[] = [
  account('111', 'Tiền mặt'),
  account('131', 'Phải thu khách hàng'),
  account('331', 'Phải trả người bán'),
];

const tb = (taiKhoan: string, tenTaiKhoan: string): TrialBalance => ({
  taiKhoan,
  tenTaiKhoan,
  soDuDauKyNo: 1000,
  soDuDauKyCo: 0,
  phatSinhNo: 100,
  phatSinhCo: 100,
  soDuCuoiKyNo: 1000,
  soDuCuoiKyCo: 0,
});

const trial: TrialBalance[] = [tb('111', 'Tiền mặt'), tb('511', 'Doanh thu bán hàng')];

const chiTietAcc: SoCaiByAccount = {
  ...account('111', 'Tiền mặt'),
  chiTiet: [
    entry('PT001', 'Phiếu thu', 'Thu tiền CÔNG TY G-LIFE', 100),
    entry('PC002', 'Phiếu chi', 'Chi mua văn phòng phẩm', 10),
  ],
};

describe('filterSoCaiSummary', () => {
  it('không lọc → giữ nguyên mảng gốc', () => {
    const out = filterSoCaiSummary(summary, { tenTaiKhoan: { op: 'contains', value: '' } });
    expect(out).toBe(summary);
  });

  it('lọc còn 1 tài khoản (bỏ dấu tiếng Việt)', () => {
    const out = filterSoCaiSummary(summary, { tenTaiKhoan: { op: 'contains', value: 'phai thu' } });
    expect(out.map((r) => r.taiKhoan)).toEqual(['131']);
  });

  it('lọc theo mã, toán tử "Bắt đầu bằng"', () => {
    const out = filterSoCaiSummary(summary, { taiKhoan: { op: 'startsWith', value: '3' } });
    expect(out.map((r) => r.taiKhoan)).toEqual(['331']);
  });

  it('lọc không khớp gì → rỗng', () => {
    const out = filterSoCaiSummary(summary, { taiKhoan: { op: 'contains', value: '999' } });
    expect(out).toEqual([]);
  });
});

describe('filterTrialBalance', () => {
  it('không lọc → giữ nguyên mảng gốc', () => {
    const out = filterTrialBalance(trial, { taiKhoan: { op: 'contains', value: '' } });
    expect(out).toBe(trial);
  });

  it('lọc theo tên tài khoản', () => {
    const out = filterTrialBalance(trial, { tenTaiKhoan: { op: 'contains', value: 'doanh thu' } });
    expect(out.map((r) => r.taiKhoan)).toEqual(['511']);
  });

  it('lọc không khớp gì → rỗng', () => {
    const out = filterTrialBalance(trial, { tenTaiKhoan: { op: 'equals', value: 'abc' } });
    expect(out).toEqual([]);
  });
});

describe('filterSoCaiChiTiet', () => {
  it('không lọc → giữ nguyên số gốc của backend', () => {
    const out = filterSoCaiChiTiet(chiTietAcc, { dienGiai: { op: 'contains', value: '' } });
    expect(out).toBe(chiTietAcc);
  });

  it('lọc còn 1 bút toán: phát sinh Nợ/Có bằng đúng bút toán đó, số dư giữ nguyên', () => {
    const out = filterSoCaiChiTiet(chiTietAcc, { dienGiai: { op: 'contains', value: 'g-life' } })!;

    expect(out.chiTiet.map((e) => e.soPhieu)).toEqual(['PT001']);
    expect(out.phatSinhNo).toBe(100);
    expect(out.phatSinhCo).toBe(200);
    expect(out.soDuDauKyNo).toBe(1000);
    expect(out.soDuCuoiKyNo).toBe(2000);
  });

  it('lọc theo loại chứng từ', () => {
    const out = filterSoCaiChiTiet(chiTietAcc, {
      loaiChungTu: { op: 'equals', value: 'Phiếu chi' },
    })!;
    expect(out.chiTiet.map((e) => e.soPhieu)).toEqual(['PC002']);
    expect(out.phatSinhNo).toBe(10);
  });

  it('nhiều bộ lọc cùng lúc: phải khớp tất cả', () => {
    const out = filterSoCaiChiTiet(chiTietAcc, {
      loaiChungTu: { op: 'equals', value: 'Phiếu thu' },
      dienGiai: { op: 'contains', value: 'văn phòng' },
    })!;
    expect(out.chiTiet).toEqual([]);
  });

  it('lọc không khớp gì → không còn bút toán nào, phát sinh về 0', () => {
    const out = filterSoCaiChiTiet(chiTietAcc, {
      soPhieu: { op: 'contains', value: 'không tồn tại' },
    })!;
    expect(out.chiTiet).toEqual([]);
    expect(out.phatSinhNo).toBe(0);
    expect(out.phatSinhCo).toBe(0);
  });

  it('chưa chọn tài khoản → null', () => {
    expect(filterSoCaiChiTiet(null, { dienGiai: { op: 'contains', value: 'a' } })).toBeNull();
  });
});
