import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

/** Chiều tiền của nhóm — tiền vào hay tiền ra. */
export type ChieuNhomDongTien = 'THU' | 'CHI';

export const CHIEU_NHOM_OPTIONS: { value: ChieuNhomDongTien; label: string }[] = [
  { value: 'THU', label: 'Thu' },
  { value: 'CHI', label: 'Chi' },
];

export interface NhomDongTien {
  id: string;
  ma: string;
  ten: string;
  moTa?: string;
  /**
   * Bảng Kế hoạch dòng tiền suy Thu/Chi của từng dòng từ đây thay vì bắt gõ lại
   * trên từng dòng. Bỏ trống = nhóm chưa khai chiều.
   */
  chieu?: ChieuNhomDongTien | null;
  isActive: boolean;
}

interface NhomDongTienResponse extends Omit<NhomDongTien, 'id'> {
  _id?: string;
  id?: string;
}

export interface NhomDongTienStats {
  tongNhomDongTien: number;
}

class NhomDongTienService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/nhom-dong-tien' });
  }

  private mapNhomDongTien(item: NhomDongTienResponse): NhomDongTien {
    return {
      ...item,
      id: item._id || item.id || '',
    } as NhomDongTien;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<NhomDongTien>> {
    const response = await this.get<{ data: NhomDongTienResponse[]; meta: PaginatedResponse<NhomDongTien>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapNhomDongTien(item)),
      meta: response.meta,
    };
  }

  async getAll(): Promise<NhomDongTien[]> {
    const data = await this.get<NhomDongTienResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapNhomDongTien(item));
  }

  async getById(id: string): Promise<NhomDongTien> {
    const data = await this.get<NhomDongTienResponse>({ endpoint: `/${id}` });
    return this.mapNhomDongTien(data);
  }

  async create(data: Omit<NhomDongTien, 'id' | 'isActive'>): Promise<NhomDongTien> {
    const result = await this.post<NhomDongTienResponse>(data);
    return this.mapNhomDongTien(result);
  }

  async update(id: string, data: Partial<NhomDongTien>): Promise<NhomDongTien> {
    const result = await this.put<NhomDongTienResponse>(data, { endpoint: `/${id}` });
    return this.mapNhomDongTien(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async getStats(): Promise<NhomDongTienStats> {
    return this.get<NhomDongTienStats>({ endpoint: '/stats' });
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: excludeId ? { ma, excludeId } : { ma },
    });
    return result.exists;
  }
}

export const nhomDongTienService = new NhomDongTienService();
