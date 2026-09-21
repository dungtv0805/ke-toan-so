import { ServiceBase } from './base/service-base';

export type KyKhoaSo = 'NGAY' | 'TUAN' | 'THANG' | 'QUY' | 'NAM';
export type NguonKhoaSo = 'TU_DONG' | 'THU_CONG';

export interface KhoaSoCauHinh {
  id: string;
  chiNhanhId?: string;
  kyKhoaSo: KyKhoaSo;
  gioThucHien: string;
  isActive: boolean;
}

export interface KhoaSo {
  id: string;
  loaiChungTuMa?: string;
  chiNhanhId?: string;
  ngayKhoaSo: string;
  nguoiDungBiKhoa?: string[];
  dienGiai?: string;
  coXuLyChuaGhiSo: boolean;
  nguon: NguonKhoaSo;
  nguoiTaoId: string;
  createdAt: string;
}

export interface CreateKhoaSoDto {
  loaiChungTuMa?: string;
  chiNhanhId?: string;
  ngayKhoaSo: string;
  nguoiDungBiKhoa?: string[];
  dienGiai?: string;
  coXuLyChuaGhiSo?: boolean;
}

export interface KhoaSoCauHinhDto {
  chiNhanhId?: string;
  kyKhoaSo: KyKhoaSo;
  gioThucHien: string;
  isActive: boolean;
}

class KhoaSoService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/khoa-so' });
  }

  async getCauHinh() {
    return this.get<KhoaSoCauHinh | null>('/cau-hinh');
  }

  async saveCauHinh(dto: KhoaSoCauHinhDto) {
    return this.put<KhoaSoCauHinh>('/cau-hinh', dto);
  }

  async getList(params?: { page?: number; limit?: number; loaiChungTuMa?: string; chiNhanhId?: string }) {
    return this.get<KhoaSo[]>('', { params });
  }

  async create(dto: CreateKhoaSoDto) {
    return this.post<KhoaSo>('', dto);
  }

  async remove(id: string) {
    return this.del<{ success: boolean }>(`/${id}`);
  }
}

export const khoaSoService = new KhoaSoService();
