import { describe, it, expect } from 'vitest';
import { resolvePeriod, pnlSeriesToQuarters, cashSeriesToQuarters } from './period';
import type { PnlSeriesPoint, CashSeriesPoint } from '@/services/dashboardService';

describe('resolvePeriod', () => {
  it('12 tháng → năm nay, month', () => {
    expect(resolvePeriod('thang12', 2026)).toEqual({ year: 2026, granularity: 'month' });
  });
  it('4 quý → năm nay, quarter', () => {
    expect(resolvePeriod('quy4', 2026)).toEqual({ year: 2026, granularity: 'quarter' });
  });
  it('Năm nay → năm nay, month', () => {
    expect(resolvePeriod('namNay', 2026)).toEqual({ year: 2026, granularity: 'month' });
  });
  it('Năm trước → năm trước, month', () => {
    expect(resolvePeriod('namTruoc', 2026)).toEqual({ year: 2025, granularity: 'month' });
  });
});

const pnl12: PnlSeriesPoint[] = Array.from({ length: 12 }, (_, i) => ({
  thang: i + 1,
  doanhThu: i + 1,      // T1=1 ... T12=12
  chiPhi: 1,
  loiNhuan: i,
}));

describe('pnlSeriesToQuarters', () => {
  it('gộp 12 tháng thành 4 quý, cộng dồn', () => {
    const q = pnlSeriesToQuarters(pnl12);
    expect(q).toHaveLength(4);
    expect(q[0]).toEqual({ thang: 1, doanhThu: 6, chiPhi: 3, loiNhuan: 3 });   // T1+T2+T3 = 1+2+3
    expect(q[3]).toEqual({ thang: 4, doanhThu: 33, chiPhi: 3, loiNhuan: 30 }); // T10+T11+T12 = 10+11+12
  });
});

const cash12: CashSeriesPoint[] = Array.from({ length: 12 }, (_, i) => ({
  thang: i + 1,
  thu: 1,
  chi: 1,
  soDu: (i + 1) * 10,   // T1=10 ... T12=120
}));

describe('cashSeriesToQuarters', () => {
  it('thu/chi cộng dồn, soDu lấy tháng cuối quý', () => {
    const q = cashSeriesToQuarters(cash12);
    expect(q).toHaveLength(4);
    expect(q[0]).toEqual({ thang: 1, thu: 3, chi: 3, soDu: 30 });   // soDu của T3
    expect(q[3]).toEqual({ thang: 4, thu: 3, chi: 3, soDu: 120 });  // soDu của T12
  });
});
