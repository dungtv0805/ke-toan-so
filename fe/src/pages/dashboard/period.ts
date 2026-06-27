import type { PnlSeriesPoint, CashSeriesPoint } from '@/services/dashboardService';

export type DashboardPeriod = 'thang12' | 'quy4' | 'namNay' | 'namTruoc';
export type Granularity = 'month' | 'quarter';

/** Suy ra năm + độ chia trục từ kỳ chọn. */
export function resolvePeriod(
  period: DashboardPeriod,
  currentYear: number,
): { year: number; granularity: Granularity } {
  switch (period) {
    case 'quy4':
      return { year: currentYear, granularity: 'quarter' };
    case 'namTruoc':
      return { year: currentYear - 1, granularity: 'month' };
    case 'thang12':
    case 'namNay':
    default:
      return { year: currentYear, granularity: 'month' };
  }
}

/** Gộp 12 điểm tháng thành 4 điểm quý; tất cả giá trị là dòng (flow) nên cộng dồn. */
export function pnlSeriesToQuarters(points: PnlSeriesPoint[]): PnlSeriesPoint[] {
  return [0, 1, 2, 3].map((qi) => {
    const slice = points.filter((p) => Math.ceil(p.thang / 3) === qi + 1);
    return {
      thang: qi + 1,
      doanhThu: slice.reduce((s, p) => s + p.doanhThu, 0),
      chiPhi: slice.reduce((s, p) => s + p.chiPhi, 0),
      loiNhuan: slice.reduce((s, p) => s + p.loiNhuan, 0),
    };
  });
}

/** Gộp dòng tiền theo quý: thu/chi cộng dồn, soDu = số dư cuối kỳ của tháng cuối quý. */
export function cashSeriesToQuarters(points: CashSeriesPoint[]): CashSeriesPoint[] {
  return [0, 1, 2, 3].map((qi) => {
    const slice = points.filter((p) => Math.ceil(p.thang / 3) === qi + 1);
    const last = slice.length ? slice[slice.length - 1] : undefined;
    return {
      thang: qi + 1,
      thu: slice.reduce((s, p) => s + p.thu, 0),
      chi: slice.reduce((s, p) => s + p.chi, 0),
      soDu: last ? last.soDu : 0,
    };
  });
}
