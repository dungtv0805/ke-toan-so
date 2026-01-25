import { QuyChuan } from '@/types';
import { ServiceBase } from './base/service-base';

export interface QuyChaunStats {
  tongQuyChuan: number;
  phieuThu: number;
  phieuChi: number;
  baoCo: number;
  baoNo: number;
}

export interface CreateQuyChaunDto {
  loaiGiaoDich: string;
  nghiepVu: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  moTa?: string;
}

export interface UpdateQuyChaunDto extends Partial<CreateQuyChaunDto> {}

export interface QuyChaunPaginationParams {
  page?: number;
  limit?: number;
  keyword?: string;
  loaiGiaoDich?: string;
}

export interface QuyChaunPaginatedResponse {
  data: QuyChuan[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const loaiGiaoDichOptions = [
  { value: 'PHIEU_THU', label: 'Phiếu thu', color: 'green' },
  { value: 'PHIEU_CHI', label: 'Phiếu chi', color: 'red' },
  { value: 'BAO_CO', label: 'Báo có ngân hàng', color: 'blue' },
  { value: 'BAO_NO', label: 'Báo nợ ngân hàng', color: 'orange' },
];

class QuyChaunService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/quy-chuan' });
  }

  async getAll(): Promise<QuyChuan[]> {
    return this.get<QuyChuan[]>();
  }

  async getAllPaginated(params: QuyChaunPaginationParams): Promise<QuyChaunPaginatedResponse> {
    const queryParams: Record<string, string> = {};
    
    if (params.page) queryParams.page = params.page.toString();
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.loaiGiaoDich) queryParams.loaiGiaoDich = params.loaiGiaoDich;

    return this.get<QuyChaunPaginatedResponse>({ params: queryParams });
  }

  async getById(id: string): Promise<QuyChuan> {
    return this.get<QuyChuan>({ endpoint: `/${id}` });
  }

  async getByLoaiGiaoDich(loai: string): Promise<QuyChuan[]> {
    return this.get<QuyChuan[]>({ endpoint: `/by-loai/${loai}` });
  }

  async search(keyword: string): Promise<QuyChuan[]> {
    return this.get<QuyChuan[]>({ 
      endpoint: '/search',
      params: { keyword }
    });
  }

  async searchPaginated(params: QuyChaunPaginationParams): Promise<QuyChaunPaginatedResponse> {
    const queryParams: Record<string, string> = {};
    
    if (params.page) queryParams.page = params.page.toString();
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.loaiGiaoDich) queryParams.loaiGiaoDich = params.loaiGiaoDich;

    return this.get<QuyChaunPaginatedResponse>({ 
      endpoint: '/search',
      params: queryParams 
    });
  }

  async getStats(keyword?: string): Promise<QuyChaunStats> {
    const params: Record<string, string> = {};
    if (keyword) params.keyword = keyword;
    
    return this.get<QuyChaunStats>({ endpoint: '/stats', params });
  }

  async getSuggestedAccounts(
    loaiGiaoDich: string, 
    nghiepVu: string
  ): Promise<{ taiKhoanNo: string; taiKhoanCo: string } | null> {
    return this.get<{ taiKhoanNo: string; taiKhoanCo: string } | null>({
      endpoint: '/suggested-accounts',
      params: { loaiGiaoDich, nghiepVu }
    });
  }

  async duplicateCheck(
    loaiGiaoDich: string, 
    nghiepVu: string, 
    excludeId?: string
  ): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/duplicate-check',
      params: { loaiGiaoDich, nghiepVu, excludeId }
    });
    return result.exists;
  }

  async create(data: CreateQuyChaunDto): Promise<QuyChuan> {
    return this.post<QuyChuan>(data);
  }

  async update(id: string, data: UpdateQuyChaunDto): Promise<QuyChuan> {
    return this.put<QuyChuan>(data, { endpoint: `/${id}` });
  }

  async remove(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }

  getLoaiGiaoDichOptions() {
    return loaiGiaoDichOptions;
  }
}

export const quyChauanService = new QuyChaunService();
