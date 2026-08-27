import { ServiceBase } from './base/service-base';
import type {
  CanhBaoKetChuyen,
  DongHachToan,
} from '@/pages/chung-tu/ket-chuyen-lai-lo/ketChuyenTinhToan';

export interface KetQuaPreview {
  dong: DongHachToan[];
  canhBao: CanhBaoKetChuyen[];
  tongTien: number;
  /** Dương = lãi, âm = lỗ. */
  laiLo: number;
}

export interface LoKetChuyen {
  soPhieu: string;
  ngay: string;
  dienGiai: string;
  tongTien: number;
  soDong: number;
  laiLo: number;
  nguoiTaoId?: string;
}

export interface TaoKetChuyenPayload {
  denNgay: string;
  ngayHachToan: string;
  ngayChungTu: string;
  dienGiai: string;
  /** Mã Loại giao dịch của lô — quyết định tiền tố số phiếu và snapshot trên chứng từ. */
  loaiGiaoDichMa?: string;
  dong: DongHachToan[];
}

export interface CauHinhKetChuyen {
  /** Loại giao dịch đã dùng lần gần nhất; rỗng khi công ty chưa từng kết chuyển. */
  loaiGiaoDichMa?: string;
}

class KetChuyenService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ket-chuyen' });
  }

  async preview(denNgay: string): Promise<KetQuaPreview> {
    return this.post<KetQuaPreview>({ denNgay }, { endpoint: '/preview' });
  }

  async getCauHinh(): Promise<CauHinhKetChuyen> {
    return this.get<CauHinhKetChuyen>({ endpoint: '/cau-hinh' });
  }

  async list(): Promise<LoKetChuyen[]> {
    return this.get<LoKetChuyen[]>({});
  }

  async create(payload: TaoKetChuyenPayload): Promise<{ soPhieu: string; soDong: number }> {
    return this.post<{ soPhieu: string; soDong: number }>(payload);
  }

  /**
   * API xóa dùng POST /xoa thay vì DELETE /:soPhieu vì số chứng từ luôn chứa dấu
   * "/" (dạng NVK202608/001); gateway giải mã %2F thành dấu phân cách nên route
   * DELETE theo path param luôn 404.
   */
  async remove(soPhieu: string): Promise<void> {
    await this.post<void>({ soPhieu }, { endpoint: '/xoa' });
  }
}

export const ketChuyenService = new KetChuyenService();
