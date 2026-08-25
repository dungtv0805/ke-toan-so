import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

export type BenKetChuyen = 'NO' | 'CO' | 'HAI_BEN';
export type LoaiKetChuyen = 'XAC_DINH_KQKD';

export interface TaiKhoanKetChuyen {
  id: string;
  thuTu: number;
  ma: string;
  taiKhoanTu: string;
  tenTaiKhoanTu?: string;
  taiKhoanDen: string;
  tenTaiKhoanDen?: string;
  ben: BenKetChuyen;
  loai: LoaiKetChuyen;
  dienGiai?: string;
  isActive: boolean;
}

interface TaiKhoanKetChuyenResponse extends Omit<TaiKhoanKetChuyen, 'id'> {
  _id?: string;
  id?: string;
}

class TaiKhoanKetChuyenService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/tai-khoan-ket-chuyen' });
  }

  private map(item: TaiKhoanKetChuyenResponse): TaiKhoanKetChuyen {
    return { ...item, id: item._id || item.id || '' } as TaiKhoanKetChuyen;
  }

  async getPaginated(
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<TaiKhoanKetChuyen>> {
    const response = await this.get<{
      data: TaiKhoanKetChuyenResponse[];
      meta: PaginatedResponse<TaiKhoanKetChuyen>['meta'];
    }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.map(item)),
      meta: response.meta,
    };
  }

  async getAll(): Promise<TaiKhoanKetChuyen[]> {
    const data = await this.get<TaiKhoanKetChuyenResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.map(item));
  }

  async create(
    data: Omit<TaiKhoanKetChuyen, 'id' | 'isActive'>,
  ): Promise<TaiKhoanKetChuyen> {
    return this.map(await this.post<TaiKhoanKetChuyenResponse>(data));
  }

  async update(
    id: string,
    data: Partial<TaiKhoanKetChuyen>,
  ): Promise<TaiKhoanKetChuyen> {
    return this.map(
      await this.put<TaiKhoanKetChuyenResponse>(data, { endpoint: `/${id}` }),
    );
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: excludeId ? { ma, excludeId } : { ma },
    });
    return result.exists;
  }
}

export const taiKhoanKetChuyenService = new TaiKhoanKetChuyenService();
