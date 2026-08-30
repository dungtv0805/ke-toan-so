import { ServiceBase, PaginatedResponse } from './base/service-base';
import type { DanhMuc } from '@/types';

export type LoaiKeHoach = 'KE_HOACH' | 'DU_BAO';

/** Chiều phân tích của báo cáo tổng hợp / so sánh (khớp BE `KeHoachDimension`). */
export type KeHoachDimension =
  | 'account'
  | 'doi-tuong'
  | 'khoan-muc'
  | 'nhom-khoan-muc'
  | 'project'
  | 'investor'
  | 'product'
  | 'department'
  | 'team'
  | 'employee'
  | 'cash-flow'
  | 'management-group'
  | 'promotion-group';

export type ChiTieu = 'doanhThu' | 'chiPhi' | 'loiNhuan' | 'tong';

export interface KeHoachDong {
  id: string;
  loaiKeHoach: LoaiKeHoach;
  phienBan: string;
  ngay: string;
  soTien: number;
  noiDung: string;
  ghiChu?: string;
  /**
   * Bảng chi tiết đã sinh ra dòng này. Không có = người dùng tự nhập ở tab
   * Chi tiết. Dòng có nguồn thì CHỈ ĐỌC: lần lưu bảng nguồn kế tiếp sẽ ghi đè.
   */
  nguonLoai?: 'BAN_HANG' | 'NHAN_SU' | 'DONG_TIEN' | 'TAI_SAN' | 'NGUON_VON';
  nguonId?: string;
  danhMuc?: DanhMuc;
}

/** Nhãn hiển thị của bảng đã sinh ra một dòng hạch toán kế hoạch. */
export const NHAN_BANG_NGUON: Record<string, string> = {
  BAN_HANG: 'Bán hàng',
  NHAN_SU: 'Nhân sự',
  DONG_TIEN: 'Dòng tiền',
  TAI_SAN: 'Tài sản',
  NGUON_VON: 'Nguồn vốn',
};

interface KeHoachResponse extends Omit<KeHoachDong, 'id' | 'ngay'> {
  _id?: string;
  id?: string;
  ngay: string | Date;
}

export interface KeHoachFilters {
  loaiKeHoach?: LoaiKeHoach;
  phienBan?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  nghiepVu?: string;
  taiKhoan?: string;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  doiTuong?: string;
  chuDauTu?: string;
  duAn?: string;
  sanPham?: string;
  boPhan?: string;
  doi?: string;
  nhanVien?: string;
  dongTien?: string;
  khoanMuc?: string;
  nhomQuanLy?: string;
  nhomKhuyenMai?: string;
  page?: number;
  limit?: number;
}

export interface KeHoachPayload {
  loaiKeHoach: LoaiKeHoach;
  phienBan?: string;
  ngay: string;
  soTien: number;
  noiDung: string;
  ghiChu?: string;
  danhMuc?: DanhMuc;
}

export interface DimensionRow {
  key: string;
  ten?: string;
  doanhThu: number;
  chiPhi: number;
  tong: number;
  soLuong: number;
}

export interface SoSanhRow {
  key: string;
  ten?: string;
  keHoach: number;
  thucHien: number;
  chenhLech: number;
  /** null khi kế hoạch = 0 — hiển thị "—" thay vì chia cho 0. */
  tyLeDat: number | null;
}

export interface SoSanhKetQua {
  rows: SoSanhRow[];
  tong: Omit<SoSanhRow, 'key' | 'ten'>;
}

export interface SeriesRow {
  thang: number;
  doanhThu: number;
  chiPhi: number;
  loiNhuan: number;
}

const toParams = (filters: KeHoachFilters): Record<string, string> => {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = String(value);
    }
  }
  return params;
};

class KeHoachService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach' });
  }

  private map(item: KeHoachResponse): KeHoachDong {
    return {
      ...item,
      id: item.id ?? item._id ?? '',
      ngay:
        typeof item.ngay === 'string' ? item.ngay : item.ngay.toISOString(),
    } as KeHoachDong;
  }

  async getEntries(
    filters: KeHoachFilters = {},
  ): Promise<{ data: KeHoachDong[]; meta: PaginatedResponse<KeHoachDong>['meta'] }> {
    const res = await this.get<PaginatedResponse<KeHoachResponse>>({
      params: toParams(filters),
    });
    return { data: res.data.map((item) => this.map(item)), meta: res.meta };
  }

  async getPhienBanOptions(loaiKeHoach?: LoaiKeHoach): Promise<string[]> {
    return this.get<string[]>({
      endpoint: '/phien-ban',
      params: loaiKeHoach ? { loaiKeHoach } : {},
    });
  }

  async getSummary(
    type: KeHoachDimension,
    filters: KeHoachFilters = {},
  ): Promise<DimensionRow[]> {
    return this.get<DimensionRow[]>({
      endpoint: `/summary/${type}`,
      params: toParams(filters),
    });
  }

  async getSoSanh(
    type: KeHoachDimension,
    chiTieu: ChiTieu,
    filters: KeHoachFilters = {},
  ): Promise<SoSanhKetQua> {
    return this.get<SoSanhKetQua>({
      endpoint: '/so-sanh',
      params: { ...toParams(filters), type, chiTieu },
    });
  }

  /** Chuỗi kế hoạch theo tháng (hoặc theo tuần khi truyền `month`). */
  async getSeries(
    year: number,
    month?: number,
    loaiKeHoach: LoaiKeHoach = 'KE_HOACH',
    phienBan?: string,
  ): Promise<SeriesRow[]> {
    return this.get<SeriesRow[]>({
      endpoint: '/series',
      params: {
        year: String(year),
        loaiKeHoach,
        ...(month ? { month: String(month) } : {}),
        ...(phienBan ? { phienBan } : {}),
      },
    });
  }

  async create(payload: KeHoachPayload): Promise<KeHoachDong> {
    return this.map(await this.post<KeHoachResponse>(payload));
  }

  async createBatch(items: KeHoachPayload[]): Promise<KeHoachDong[]> {
    const res = await this.post<KeHoachResponse[]>(items, { endpoint: '/batch' });
    return res.map((item) => this.map(item));
  }

  async importEntries(items: KeHoachPayload[]): Promise<KeHoachDong[]> {
    const res = await this.post<KeHoachResponse[]>(items, { endpoint: '/import' });
    return res.map((item) => this.map(item));
  }

  async update(id: string, payload: Partial<KeHoachPayload>): Promise<KeHoachDong> {
    return this.map(
      await this.patch<KeHoachResponse>(payload, { endpoint: `/${id}` }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }

  async removeBatch(ids: string[]): Promise<{ deleted: number }> {
    return this.post<{ deleted: number }>({ ids }, { endpoint: '/delete-batch' });
  }
}

export const keHoachService = new KeHoachService();
