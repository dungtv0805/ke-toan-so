/**
 * CHÍNH SÁCH LỖI CỦA FILE NÀY: **để lỗi ném ra**, không bọc `try/catch`. Nhờ
 * vậy React Query đưa tab Bán hàng vào trạng thái `isError` và màn hình báo
 * lỗi thật thay vì hiện 0.
 *
 * Khác `dashboardService.ts` — file đó nuốt lỗi và trả 0/`[]` (hành vi có sẵn
 * từ trước, được giữ lại có chủ đích). Chênh lệch này là cố ý, không phải một
 * trong hai file viết sai; xem chú thích đầu `dashboardService.ts`.
 */
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

class DoanhSoService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/bao-cao' });
  }

  async getDoanhSoTheo(p: GetDoanhSoParams): Promise<DoanhSoTheoResult> {
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
  }
}

export const doanhSoService = new DoanhSoService();
