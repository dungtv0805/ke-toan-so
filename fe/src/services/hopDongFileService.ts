import { ServiceBase, getAuthToken } from './base/service-base';
import { API_CONFIG } from '@/config/api';

export interface HopDongFile {
  _id: string;
  hopDongId: string;
  tenFile: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

class HopDongFileService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/hop-dong-file' });
  }

  async list(hopDongId: string): Promise<HopDongFile[]> {
    return this.get<HopDongFile[]>({ params: { hopDongId } });
  }

  /** Số file của từng hợp đồng, để bảng danh mục hiện badge mà không tải cả danh sách. */
  async dem(hopDongIds: string[]): Promise<Record<string, number>> {
    if (!hopDongIds.length) return {};
    return this.get<Record<string, number>>({
      endpoint: '/dem',
      params: { ids: hopDongIds.join(',') },
    });
  }

  async upload(hopDongId: string, file: File): Promise<HopDongFile> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('hopDongId', hopDongId);
    return this.post<HopDongFile>(fd);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  /**
   * Tải file dạng blob — thẻ <a>/iframe không gửi được header JWT nên phải fetch tay.
   * Nhớ gọi URL.revokeObjectURL khi dùng xong.
   */
  async fetchFileObjectUrl(id: string): Promise<string> {
    const token = getAuthToken();
    const res = await fetch(
      `${API_CONFIG.BASE_URL}/master-data/hop-dong-file/${id}/tai-ve`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error('Không tải được file');
    return URL.createObjectURL(await res.blob());
  }
}

export const hopDongFileService = new HopDongFileService();
