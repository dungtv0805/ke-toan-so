import { ServiceBase } from './base/service-base';

/** Thông báo trong ứng dụng — mục 13 tài liệu Phê duyệt nghiệp vụ. */

export type LoaiThongBao =
  | 'DEN_LUOT_DUYET'
  | 'BI_TRA_LAI'
  | 'BI_TU_CHOI'
  | 'HOAN_THANH';

export interface ThongBao {
  id: string;
  loai: LoaiThongBao;
  tieuDe: string;
  noiDung?: string;
  duongDan?: string;
  quyTrinhId?: string;
  daDoc: boolean;
  createdAt: string;
}

class ThongBaoService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/thong-bao' });
  }

  async danhSach(): Promise<ThongBao[]> {
    return this.get({});
  }

  async demChuaDoc(): Promise<{ soLuong: number }> {
    return this.get({ endpoint: '/chua-doc' });
  }

  async danhDauDaDoc(id: string): Promise<void> {
    return this.post({}, { endpoint: `/${id}/da-doc` });
  }

  async danhDauTatCa(): Promise<void> {
    return this.post({}, { endpoint: '/da-doc-tat-ca' });
  }
}

export const thongBaoService = new ThongBaoService();
