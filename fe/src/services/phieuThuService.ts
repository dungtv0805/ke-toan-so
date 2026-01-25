import { ChungTu } from '@/types';
import { ServiceBase } from './base/service-base';

export interface PhieuThuStats {
  tongSo: number;
  nhap: number;
  choDuyet: number;
  daDuyet: number;
  tuChoi: number;
  tongTien: number;
}

export interface PhieuThuQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: string;
}

export interface PaginatedPhieuThuResponse {
  data: ChungTu[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ChungTuResponse extends Omit<ChungTu, 'id'> {
  _id?: string;
  id?: string;
}

class PhieuThuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/phieu-thu' });
  }

  private mapChungTu(item: ChungTuResponse): ChungTu {
    return {
      ...item,
      id: item._id || item.id || '',
    } as ChungTu;
  }

  async getAll(params?: PhieuThuQueryParams): Promise<PaginatedPhieuThuResponse> {
    const response = await this.get<{ data: ChungTuResponse[]; meta: PaginatedPhieuThuResponse['meta'] }>({ params });
    return {
      data: response.data.map((item) => this.mapChungTu(item)),
      meta: response.meta,
    };
  }

  async getById(id: string): Promise<ChungTu> {
    const data = await this.get<ChungTuResponse>({ endpoint: `/../chung-tu/${id}` });
    return this.mapChungTu(data);
  }

  async create(data: Omit<ChungTu, 'id' | 'soPhieu' | 'loai' | 'nguoiTao' | 'ngayTao'>): Promise<ChungTu> {
    const result = await this.post<ChungTuResponse>(data);
    return this.mapChungTu(result);
  }

  async update(id: string, data: Partial<ChungTu>): Promise<ChungTu> {
    const result = await this.put<ChungTuResponse>(data, { endpoint: `/../chung-tu/${id}` });
    return this.mapChungTu(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/../chung-tu/${id}` });
  }

  async search(keyword: string): Promise<ChungTu[]> {
    const data = await this.get<ChungTuResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapChungTu(item));
  }

  async getStats(): Promise<PhieuThuStats> {
    return this.get<PhieuThuStats>({ endpoint: '/stats' });
  }

  async submitForApproval(id: string): Promise<ChungTu> {
    const result = await this.post<ChungTuResponse>({}, { endpoint: `/../chung-tu/${id}/submit` });
    return this.mapChungTu(result);
  }

  async approve(id: string): Promise<ChungTu> {
    const result = await this.post<ChungTuResponse>({}, { endpoint: `/../chung-tu/${id}/approve` });
    return this.mapChungTu(result);
  }

  async reject(id: string, lyDo?: string): Promise<ChungTu> {
    const result = await this.post<ChungTuResponse>({ lyDo }, { endpoint: `/../chung-tu/${id}/reject` });
    return this.mapChungTu(result);
  }

  async getByTrangThai(trangThai: ChungTu['trangThai']): Promise<ChungTu[]> {
    const all = await this.getAll();
    return all.data.filter((p: ChungTu) => p.trangThai === trangThai);
  }
}

export const phieuThuService = new PhieuThuService();
