import { TheoDoiHopDong, TheoDoiHopDongRow, BaoCaoHopDongRow } from '@/types';
import { ServiceBase } from './base/service-base';

export interface TheoDoiHopDongStats {
  tongGiaTri: number;
  tongDaThanhToan: number;
  tongConLai: number;
}

/** Theo dõi hợp đồng — /master-data/theo-doi-hop-dong (BE bọc { success, data }). */
class TheoDoiHopDongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/theo-doi-hop-dong' });
  }

  /**
   * Danh sách HĐ (join danh mục + tracking + tổng đã tính) — trả toàn bộ, không lọc
   * ở server. Trang Bán hàng lọc client-side vì báo cáo theo sản phẩm/tháng cần cả
   * đơn ngoài kỳ đang xem.
   */
  async getList(): Promise<TheoDoiHopDongRow[]> {
    return this.get<TheoDoiHopDongRow[]>({});
  }

  /** Bản tracking của 1 HĐ (null nếu chưa có). */
  async getByHopDongId(hopDongId: string): Promise<TheoDoiHopDong | null> {
    return this.get<TheoDoiHopDong | null>({ endpoint: `/${hopDongId}` });
  }

  /** Lưu (upsert) tracking cho 1 HĐ. */
  async upsert(
    hopDongId: string,
    data: Partial<TheoDoiHopDong>,
  ): Promise<TheoDoiHopDong> {
    return this.put<TheoDoiHopDong>(data, { endpoint: `/${hopDongId}` });
  }

  async getStats(): Promise<TheoDoiHopDongStats> {
    return this.get<TheoDoiHopDongStats>({ endpoint: '/stats' });
  }

  /** Báo cáo nhanh theo năm. */
  async getBaoCao(): Promise<{ rows: BaoCaoHopDongRow[]; tong: BaoCaoHopDongRow }> {
    return this.get<{ rows: BaoCaoHopDongRow[]; tong: BaoCaoHopDongRow }>({
      endpoint: '/bao-cao',
    });
  }
}

export const theoDoiHopDongService = new TheoDoiHopDongService();
