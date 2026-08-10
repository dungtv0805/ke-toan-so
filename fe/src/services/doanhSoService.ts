import { ServiceBase } from './base/service-base';

export interface DoanhSoThoiGianPoint {
  ky: string;
  kyNay: number;
  cungKy: number;
}

export interface DoanhSoChieuRow {
  ten: string;
  soTien: number;
}

export interface DoanhSoTheoResult {
  theoThoiGian: DoanhSoThoiGianPoint[];
  theoChieu: DoanhSoChieuRow[];
  tong: number;
  tongCungKy: number;
}

export interface GetDoanhSoParams {
  year: number;
  startMonth: number;
  endMonth: number;
  groupBy: 'ngay' | 'thang' | 'quy' | 'nam';
  dimension: string;
}

const RONG: DoanhSoTheoResult = { theoThoiGian: [], theoChieu: [], tong: 0, tongCungKy: 0 };

class DoanhSoService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/bao-cao' });
  }

  async getDoanhSoTheo(p: GetDoanhSoParams): Promise<DoanhSoTheoResult> {
    try {
      const startDate = new Date(p.year, p.startMonth - 1, 1).toISOString();
      const endDate = new Date(p.year, p.endMonth, 0, 23, 59, 59, 999).toISOString();
      const res = await this.get<DoanhSoTheoResult>({
        endpoint: '/doanh-so-theo',
        params: { startDate, endDate, groupBy: p.groupBy, dimension: p.dimension },
      });
      return {
        theoThoiGian: Array.isArray(res.theoThoiGian) ? res.theoThoiGian : [],
        theoChieu: Array.isArray(res.theoChieu) ? res.theoChieu : [],
        tong: res.tong ?? 0,
        tongCungKy: res.tongCungKy ?? 0,
      };
    } catch {
      return RONG;
    }
  }
}

export const doanhSoService = new DoanhSoService();
