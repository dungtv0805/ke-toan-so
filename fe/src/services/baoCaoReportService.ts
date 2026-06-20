import { ServiceBase } from './base/service-base';

// ============ Types ============

export interface PnlPeriodResult {
  tongDoanhThu: number;
  tongChiPhi: number;
  loiNhuan: number;
}

export interface PnlResult extends PnlPeriodResult {
  kyTruoc?: PnlPeriodResult;
}

export interface PnlSeriesPoint {
  thang: number;
  doanhThu: number;
  chiPhi: number;
  loiNhuan: number;
}

export interface GetPnlParams {
  startDate: string;
  endDate: string;
  periodType?: 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon';
}

// ============ Service ============

class BaoCaoReportService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/bao-cao' });
  }

  async getPnl({ startDate, endDate, periodType = 'thang' }: GetPnlParams): Promise<PnlResult> {
    const res = await this.get<PnlResult & Record<string, unknown>>({
      endpoint: '/pnl',
      params: { startDate, endDate, periodType },
    });
    return {
      tongDoanhThu: res.tongDoanhThu ?? 0,
      tongChiPhi: res.tongChiPhi ?? 0,
      loiNhuan: res.loiNhuan ?? 0,
      kyTruoc: res.kyTruoc
        ? {
            tongDoanhThu: res.kyTruoc.tongDoanhThu ?? 0,
            tongChiPhi: res.kyTruoc.tongChiPhi ?? 0,
            loiNhuan: res.kyTruoc.loiNhuan ?? 0,
          }
        : undefined,
    };
  }

  async getPnlSeries(year: number): Promise<PnlSeriesPoint[]> {
    const data = await this.get<PnlSeriesPoint[]>({
      endpoint: '/pnl-series',
      params: { year: year.toString() },
    });
    return Array.isArray(data) ? data : [];
  }
}

export const baoCaoReportService = new BaoCaoReportService();
