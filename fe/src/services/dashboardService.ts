import { soQuyService } from './soQuyService';
import { balanceSheetService } from './balanceSheetService';
import { baoCaoReportService } from './baoCaoReportService';
import { congNoPhaiThuService } from './congNoPhaiThuService';
import { congNoPhaiTraService } from './congNoPhaiTraService';

// ============ Types ============

export interface KpiMetric {
  value: number;
  /** % change vs previous period; null when previous period is 0/unknown */
  delta: number | null;
}

export interface DashboardKpi {
  soDuQuy: KpiMetric;
  doanhThu: KpiMetric;
  chiPhi: KpiMetric;
  loiNhuan: KpiMetric;
}

export interface PnlSeriesPoint {
  thang: number;
  doanhThu: number;
  chiPhi: number;
  loiNhuan: number;
}

export interface CashSeriesPoint {
  thang: number;
  thu: number;
  chi: number;
  soDu: number;
}

export interface CompositionSlice {
  ma: string;
  ten: string;
  soTien: number;
}

export interface BreakdownSlice {
  ten: string;
  soTien: number;
}

export interface PnlBreakdown {
  doanhThu: BreakdownSlice[];
  chiPhi: BreakdownSlice[];
}

export interface AgingBuckets {
  chuaDenHan: number;
  quaHan1_30: number;
  quaHan31_60: number;
  quaHan61_90: number;
  quaHanTren90: number;
}

export interface TopPartner {
  doiTuongId: string;
  doiTuongTen: string;
  conLai: number;
}

export interface OverdueRow {
  id: string;
  doiTuongTen: string;
  conLai: number;
  soNgayQuaHan: number;
  hanThanhToan?: string;
}

// ============ Helpers ============

function computeDelta(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function monthRange(month: number, year: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ============ Service ============

export const dashboardService = {
  /** KPI cho tháng/năm chọn (so với kỳ trước qua pnl comparison + so-quy stats). */
  async getKpi(month: number, year: number): Promise<DashboardKpi> {
    const { start, end } = monthRange(month, year);
    const [statsRes, pnlRes] = await Promise.allSettled([
      soQuyService.getStats(),
      baoCaoReportService.getPnl({ startDate: start, endDate: end, periodType: 'thang' }),
    ]);

    const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
    const pnl = pnlRes.status === 'fulfilled' ? pnlRes.value : null;

    const soDuQuy = stats?.tonCuoiKy ?? 0;
    const doanhThu = pnl?.tongDoanhThu ?? 0;
    const chiPhi = pnl?.tongChiPhi ?? 0;
    const loiNhuan = pnl?.loiNhuan ?? doanhThu - chiPhi;

    const prev = pnl?.kyTruoc;

    return {
      soDuQuy: { value: soDuQuy, delta: null },
      doanhThu: { value: doanhThu, delta: prev ? computeDelta(doanhThu, prev.tongDoanhThu) : null },
      chiPhi: { value: chiPhi, delta: prev ? computeDelta(chiPhi, prev.tongChiPhi) : null },
      loiNhuan: { value: loiNhuan, delta: prev ? computeDelta(loiNhuan, prev.loiNhuan) : null },
    };
  },

  /** 12 tháng doanh thu/chi phí/lợi nhuận của năm chọn. */
  async getPnlSeries(year: number): Promise<PnlSeriesPoint[]> {
    try {
      const data = await baoCaoReportService.getPnlSeries(year);
      return data.map((p) => ({
        thang: p.thang,
        doanhThu: p.doanhThu ?? 0,
        chiPhi: p.chiPhi ?? 0,
        loiNhuan: p.loiNhuan ?? 0,
      }));
    } catch {
      return [];
    }
  },

  /** Tỷ trọng doanh thu/chi phí theo tài khoản trong tháng/năm chọn. */
  async getPnlBreakdown(month: number, year: number): Promise<PnlBreakdown> {
    try {
      const { start, end } = monthRange(month, year);
      const pnl = await baoCaoReportService.getPnl({
        startDate: start,
        endDate: end,
        periodType: 'thang',
      });
      return {
        doanhThu: (pnl.doanhThu ?? []).map((e) => ({ ten: e.ten, soTien: e.soTien })),
        chiPhi: (pnl.chiPhi ?? []).map((e) => ({ ten: e.ten, soTien: e.soTien })),
      };
    } catch {
      return { doanhThu: [], chiPhi: [] };
    }
  },

  /** Dòng tiền 12 tháng (thu/chi/số dư cuối kỳ) từ sổ quỹ. */
  async getCashSeries(year: number): Promise<CashSeriesPoint[]> {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const results = await Promise.allSettled(
      months.map((m) => soQuyService.getByMonth(m, year)),
    );
    return months.map((thang, idx) => {
      const r = results[idx];
      if (r.status !== 'fulfilled' || !r.value) {
        return { thang, thu: 0, chi: 0, soDu: 0 };
      }
      const v = r.value;
      return {
        thang,
        thu: v.tongThu || 0,
        chi: v.tongChi || 0,
        soDu: v.soDuCuoiKy || 0,
      };
    });
  },

  /** Cơ cấu tài sản (top-level groups của balance sheet). */
  async getAssetComposition(): Promise<CompositionSlice[]> {
    try {
      const stats = await balanceSheetService.getStats();
      return [
        { ma: 'NH', ten: 'Tài sản ngắn hạn', soTien: stats.taiSanNganHan },
        { ma: 'DH', ten: 'Tài sản dài hạn', soTien: stats.taiSanDaiHan },
      ].filter((s) => s.soTien !== 0);
    } catch {
      return [];
    }
  },

  /** Cơ cấu nguồn vốn. */
  async getSourceComposition(): Promise<CompositionSlice[]> {
    try {
      const stats = await balanceSheetService.getStats();
      return [
        { ma: 'NPT', ten: 'Nợ phải trả', soTien: stats.noPhaiTra },
        { ma: 'VCSH', ten: 'Vốn chủ sở hữu', soTien: stats.vonChuSoHuu },
      ].filter((s) => s.soTien !== 0);
    } catch {
      return [];
    }
  },

  /** Tuổi nợ phải thu (5 nhóm). */
  async getArAging(): Promise<AgingBuckets> {
    try {
      return await congNoPhaiThuService.getAgingReport();
    } catch {
      return { chuaDenHan: 0, quaHan1_30: 0, quaHan31_60: 0, quaHan61_90: 0, quaHanTren90: 0 };
    }
  },

  /** Tuổi nợ phải trả (5 nhóm). */
  async getApAging(): Promise<AgingBuckets> {
    try {
      return await congNoPhaiTraService.getAgingReport();
    } catch {
      return { chuaDenHan: 0, quaHan1_30: 0, quaHan31_60: 0, quaHan61_90: 0, quaHanTren90: 0 };
    }
  },

  /** Top 5 khách hàng còn phải thu. */
  async getTopReceivables(): Promise<TopPartner[]> {
    try {
      const data = await congNoPhaiThuService.getSummaryByCustomer();
      return data
        .map((d) => ({
          doiTuongId: d.doiTuongId,
          doiTuongTen: d.doiTuongTen || d.doiTuongId,
          conLai: d.conLai || 0,
        }))
        .sort((a, b) => b.conLai - a.conLai)
        .slice(0, 5);
    } catch {
      return [];
    }
  },

  /** Top 5 NCC còn phải trả. */
  async getTopPayables(): Promise<TopPartner[]> {
    try {
      const data = await congNoPhaiTraService.getSummaryBySupplier();
      return data
        .map((d) => ({
          doiTuongId: d.doiTuongId,
          doiTuongTen: d.doiTuongTen || d.doiTuongId,
          conLai: d.conLai || 0,
        }))
        .sort((a, b) => b.conLai - a.conLai)
        .slice(0, 5);
    } catch {
      return [];
    }
  },

  /** Công nợ phải thu quá hạn. */
  async getOverdueAr(): Promise<OverdueRow[]> {
    try {
      const data = await congNoPhaiThuService.getQuaHan();
      return data
        .map((d) => ({
          id: d.id || d._id || '',
          doiTuongTen: d.doiTuongTen || d.doiTuongId || '',
          conLai: d.conLai || 0,
          soNgayQuaHan: d.soNgayQuaHan || 0,
          hanThanhToan: d.hanThanhToan,
        }))
        .sort((a, b) => b.soNgayQuaHan - a.soNgayQuaHan);
    } catch {
      return [];
    }
  },

  /** Công nợ phải trả quá hạn. */
  async getOverdueAp(): Promise<OverdueRow[]> {
    try {
      const data = await congNoPhaiTraService.getQuaHan();
      return data
        .map((d) => ({
          id: d.id || d._id || '',
          doiTuongTen: d.doiTuongTen || d.doiTuongId || '',
          conLai: d.conLai || 0,
          soNgayQuaHan: d.soNgayQuaHan || 0,
          hanThanhToan: d.hanThanhToan,
        }))
        .sort((a, b) => b.soNgayQuaHan - a.soNgayQuaHan);
    } catch {
      return [];
    }
  },
};
