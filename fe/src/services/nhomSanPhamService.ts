import { NhomSanPham } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface NhomSanPhamResponse extends Omit<NhomSanPham, 'id'> {
  _id?: string;
  id?: string;
}

class NhomSanPhamService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/nhom-san-pham' });
  }

  private mapNhomSanPham(item: NhomSanPhamResponse): NhomSanPham {
    return {
      ...item,
      id: item._id || item.id || '',
    } as NhomSanPham;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<NhomSanPham>> {
    const response = await this.get<{ data: NhomSanPhamResponse[]; meta: PaginatedResponse<NhomSanPham>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapNhomSanPham(item)),
      meta: response.meta,
    };
  }

  async getTotal(search?: string): Promise<number> {
    const result = await this.get<{ total: number }>({
      endpoint: '/total',
      params: { search },
    });
    return result.total;
  }

  async getAll(): Promise<NhomSanPham[]> {
    const data = await this.get<NhomSanPhamResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapNhomSanPham(item));
  }

  async getById(id: string): Promise<NhomSanPham> {
    const data = await this.get<NhomSanPhamResponse>({ endpoint: `/${id}` });
    return this.mapNhomSanPham(data);
  }

  async create(data: Omit<NhomSanPham, 'id'>): Promise<NhomSanPham> {
    const result = await this.post<NhomSanPhamResponse>(data);
    return this.mapNhomSanPham(result);
  }

  async update(id: string, data: Partial<NhomSanPham>): Promise<NhomSanPham> {
    const result = await this.put<NhomSanPhamResponse>(data, { endpoint: `/${id}` });
    return this.mapNhomSanPham(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<NhomSanPham[]> {
    const data = await this.get<NhomSanPhamResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapNhomSanPham(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<NhomSanPhamStats> {
    return this.get<NhomSanPhamStats>({ endpoint: '/stats' });
  }
}

export interface NhomSanPhamStats {
  tong: number;
}

export const nhomSanPhamService = new NhomSanPhamService();
