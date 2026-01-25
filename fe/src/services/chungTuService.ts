import { ChungTu } from '@/types';
import { ServiceBase } from './base/service-base';

type LoaiChungTu = ChungTu['loai'];

class ChungTuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/chung-tu' });
  }

  async getAll(loai?: LoaiChungTu): Promise<ChungTu[]> {
    return this.get<ChungTu[]>({ params: loai ? { loai } : undefined });
  }

  async getById(id: string): Promise<ChungTu> {
    return this.get<ChungTu>({ endpoint: `/${id}` });
  }

  async update(id: string, data: Partial<ChungTu>): Promise<ChungTu> {
    return this.put<ChungTu>(data, { endpoint: `/${id}` });
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async submitForApproval(id: string): Promise<ChungTu> {
    return this.post<ChungTu>({}, { endpoint: `/${id}/submit` });
  }

  async approve(id: string): Promise<ChungTu> {
    return this.post<ChungTu>({}, { endpoint: `/${id}/approve` });
  }

  async reject(id: string, lyDo?: string): Promise<ChungTu> {
    return this.post<ChungTu>({ lyDo }, { endpoint: `/${id}/reject` });
  }
}

export const chungTuService = new ChungTuService();
