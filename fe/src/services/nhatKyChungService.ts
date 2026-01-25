import { NhatKyChung, ChungTuResponse, LoaiChungTu, DanhMuc } from '@/types';
import { ServiceBase, PaginatedResponse } from './base/service-base';

export interface NhatKyChungStats {
  tongSo: number;
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
}

export interface SummaryItem {
  key: string;
  ten?: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soLuong: number;
}

export type SummaryType =
  | 'account'
  | 'team'
  | 'employee'
  | 'project'
  | 'investor'
  | 'product'
  | 'cash-flow'
  | 'management-group'
  | 'promotion-group';

export interface GetEntriesParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  loai?: LoaiChungTu;
}

export interface CreateEntryDto {
  loai: LoaiChungTu;
  ngay: string;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  danhMuc?: DanhMuc;
}

export interface UpdateEntryDto {
  ngay?: string;
  soTien?: number;
  noiDung?: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  danhMuc?: DanhMuc;
}

export interface NhatKyChungPaginatedResponse {
  data: NhatKyChung[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class NhatKyChungService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/nhat-ky-chung' });
  }

  /**
   * Map ChungTuResponse from backend to NhatKyChung for frontend display
   */
  private mapChungTuToNhatKyChung(item: ChungTuResponse): NhatKyChung {
    const loaiChungTu = item.loai === 'PHIEU_THU' ? 'Phiếu thu' : 'Phiếu chi';
    const danhMuc = item.danhMuc;

    return {
      id: item._id,
      ngay: typeof item.ngay === 'string' ? item.ngay : (item.ngay as Date).toISOString(),
      soPhieu: item.soPhieu,
      loaiChungTu,
      dienGiai: item.noiDung,
      taiKhoanNo: danhMuc?.taiKhoanNo?.ma ?? '',
      taiKhoanCo: danhMuc?.taiKhoanCo?.ma ?? '',
      soTien: item.soTien,
      nguoiGiaoDich: item.nguoiGiaoDich,
      diaChi: item.diaChi,
      ghiChu: item.ghiChu,
      doiTuong: danhMuc?.doiTuong?.ten,
      duAn: danhMuc?.duAn?.ten,
      chuDauTu: danhMuc?.duAn?.chuDauTuTen,
      boPhan: danhMuc?.boPhan?.ten,
      doi: danhMuc?.doi?.ten,
      nhanVien: danhMuc?.nhanVien?.ten,
      sanPham: danhMuc?.sanPham?.ten,
      dongTien: danhMuc?.dongTien?.ten,
      danhMuc,
    };
  }

  /**
   * Get paginated journal entries with filters
   */
  async getEntries(params: GetEntriesParams = {}): Promise<NhatKyChungPaginatedResponse> {
    const queryParams: Record<string, string> = {};
    
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.search) queryParams.search = params.search;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.loai) queryParams.loai = params.loai;

    const response = await this.get<PaginatedResponse<ChungTuResponse>>({ params: queryParams });
    
    return {
      data: response.data.map((item) => this.mapChungTuToNhatKyChung(item)),
      meta: response.meta,
    };
  }

  /**
   * @deprecated Use getEntries instead
   */
  async getAll(startDate?: Date, endDate?: Date): Promise<NhatKyChung[]> {
    const params: GetEntriesParams = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    params.limit = 1000; // Get all items
    
    const response = await this.getEntries(params);
    return response.data;
  }

  /**
   * @deprecated Use getEntries with search param instead
   */
  async search(keyword: string): Promise<NhatKyChung[]> {
    const response = await this.getEntries({ search: keyword, limit: 1000 });
    return response.data;
  }

  /**
   * @deprecated Use getEntries with date params instead
   */
  async getByDateRange(startDate: string, endDate: string): Promise<NhatKyChung[]> {
    const response = await this.getEntries({ startDate, endDate, limit: 1000 });
    return response.data;
  }

  /**
   * @deprecated Filter by account should be done via getEntries with search param
   * This method is kept for backward compatibility
   */
  async getByAccount(taiKhoan: string): Promise<NhatKyChung[]> {
    // Use search to find by account code
    const response = await this.getEntries({ search: taiKhoan, limit: 1000 });
    // Filter to ensure exact match on taiKhoanNo or taiKhoanCo
    return response.data.filter(
      (item) => item.taiKhoanNo === taiKhoan || item.taiKhoanCo === taiKhoan
    );
  }

  async getStats(params: GetEntriesParams = {}): Promise<NhatKyChungStats> {
    const queryParams: Record<string, string> = {};
    
    if (params.search) queryParams.search = params.search;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.loai) queryParams.loai = params.loai;

    return this.get<NhatKyChungStats>({ 
      endpoint: '/stats',
      params: queryParams 
    });
  }

  async getSummaryByAccount(): Promise<SummaryItem[]> {
    return this.get<SummaryItem[]>({ endpoint: '/summary-by-account' });
  }

  async getSummaryByTeam(): Promise<SummaryItem[]> {
    return this.get<SummaryItem[]>({ endpoint: '/summary-by-team' });
  }

  async getSummaryByEmployee(): Promise<SummaryItem[]> {
    return this.get<SummaryItem[]>({ endpoint: '/summary-by-employee' });
  }

  async getSummaryByProject(): Promise<SummaryItem[]> {
    return this.get<SummaryItem[]>({ endpoint: '/summary-by-project' });
  }

  async getSummaryByChuDauTu(): Promise<SummaryItem[]> {
    return this.get<SummaryItem[]>({ endpoint: '/summary-by-chu-dau-tu' });
  }

  async getSummaryBySanPham(): Promise<SummaryItem[]> {
    return this.get<SummaryItem[]>({ endpoint: '/summary-by-san-pham' });
  }

  async getSummaryByDongTien(): Promise<SummaryItem[]> {
    return this.get<SummaryItem[]>({ endpoint: '/summary-by-dong-tien' });
  }

  /**
   * Get summary data by type
   */
  async getSummary(type: SummaryType, params: GetEntriesParams = {}): Promise<SummaryItem[]> {
    const queryParams: Record<string, string> = {};
    
    if (params.search) queryParams.search = params.search;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;

    // parseResponse in service-base already extracts data from { success, data } format
    return this.get<SummaryItem[]>({ 
      endpoint: `/summary/${type}`,
      params: queryParams 
    });
  }

  /**
   * Get a single entry by ID
   */
  async getById(id: string): Promise<NhatKyChung> {
    const response = await this.get<ChungTuResponse>({ endpoint: `/${id}` });
    return this.mapChungTuToNhatKyChung(response);
  }

  /**
   * Create a new entry
   */
  async create(data: CreateEntryDto): Promise<NhatKyChung> {
    const response = await this.post<ChungTuResponse>(data);
    return this.mapChungTuToNhatKyChung(response);
  }

  /**
   * Update an existing entry
   */
  async update(id: string, data: UpdateEntryDto): Promise<NhatKyChung> {
    const response = await this.patch<ChungTuResponse>(data, { endpoint: `/${id}` });
    return this.mapChungTuToNhatKyChung(response);
  }

  /**
   * Delete an entry
   */
  async remove(id: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>({ endpoint: `/${id}` });
  }
}

export const nhatKyChungService = new NhatKyChungService();
