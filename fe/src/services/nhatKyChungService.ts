import { NhatKyChung, ChungTuResponse, LoaiChungTu, LoaiChungTuLuu, DanhMuc, HoSoChungTuItem, KiemSoatChungTu } from '@/types';
import { ServiceBase, PaginatedResponse } from './base/service-base';

export interface NhatKyChungStats {
  tongSo: number;
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  /** Tổng giá trị (cộng soTien) của các bút toán khớp bộ lọc. */
  tongGiaTri: number;
}

export interface TongHopDonHang {
  soHopDong: string;
  daThu: number;
  dtChuaThucHien: number;
  dtDaThucHien: number;
  /** 12 phần tử — doanh thu 511 theo tháng của năm được hỏi. */
  dtTheoThang: number[];
}

export interface DoanhThuKhongDon {
  sanPhamMa: string;
  sanPhamTen: string;
  dtTheoThang: number[];
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
  doiTuong?: string;
  duAn?: string;
  boPhan?: string;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  /** Số hợp đồng (đơn hàng) — khớp danhMuc.hopDong.soHopDong */
  hopDong?: string;
  /** Tài khoản gộp — khớp bên Nợ HOẶC bên Có */
  taiKhoan?: string;
  nghiepVu?: string;
  khoanMuc?: string;
  nhanVien?: string;
  sanPham?: string;
  doi?: string;
  nhomKhuyenMai?: string;
  nguoiGiaoDich?: string;
  /** HOP_LE | CHUA_HOP_LE | KHONG_DUOC_TRU | CHUA_KIEM_SOAT */
  kiemSoat?: string;
}

/** Các tiêu chí lọc gửi lên BE (không gồm phân trang). */
const FILTER_KEYS = [
  'search',
  'startDate',
  'endDate',
  'loai',
  'doiTuong',
  'duAn',
  'boPhan',
  'taiKhoanNo',
  'taiKhoanCo',
  'hopDong',
  'taiKhoan',
  'nghiepVu',
  'khoanMuc',
  'nhanVien',
  'sanPham',
  'doi',
  'nhomKhuyenMai',
  'nguoiGiaoDich',
  'kiemSoat',
] as const satisfies readonly (keyof GetEntriesParams)[];

function toQueryParams(params: GetEntriesParams): Record<string, string> {
  const query: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = params[key];
    if (value) query[key] = String(value);
  }
  return query;
}

export interface CreateEntryDto {
  loai: LoaiChungTuLuu;
  ngay: string;
  ngayGhiSo?: string;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  nhomGop?: string;
  danhMuc?: DanhMuc;
}

export interface BatchItemDto {
  id?: string; // undefined = create new, string = update existing
  loai: LoaiChungTu;
  ngay: string;
  ngayGhiSo?: string;
  soTien: number;
  noiDung: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  danhMuc?: DanhMuc;
}

export interface UpdateEntryDto {
  ngay?: string;
  ngayGhiSo?: string;
  soTien?: number;
  noiDung?: string;
  nguoiGiaoDich?: string;
  diaChi?: string;
  ghiChu?: string;
  danhMuc?: DanhMuc;
  hoSoChungTu?: HoSoChungTuItem[];
  kiemSoat?: KiemSoatChungTu;
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
    const loaiChungTu =
      item.loai === 'PHIEU_THU'
        ? 'Phiếu thu'
        : item.loai === 'PHIEU_CHI'
          ? 'Phiếu chi'
          : 'Chứng từ khác';
    const danhMuc = item.danhMuc;

    const ngayStr =
      typeof item.ngay === 'string' ? item.ngay : (item.ngay as Date).toISOString();
    const ngayGhiSoStr = item.ngayGhiSo
      ? typeof item.ngayGhiSo === 'string'
        ? item.ngayGhiSo
        : (item.ngayGhiSo as Date).toISOString()
      : ngayStr; // dữ liệu cũ chưa có ngayGhiSo → hiển thị theo ngày phát sinh

    return {
      id: item._id,
      ngay: ngayStr,
      ngayGhiSo: ngayGhiSoStr,
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
      hoSoChungTu: item.hoSoChungTu,
      kiemSoat: item.kiemSoat,
    };
  }

  /**
   * Get paginated journal entries with filters
   */
  async getEntries(params: GetEntriesParams = {}): Promise<NhatKyChungPaginatedResponse> {
    const queryParams = toQueryParams(params);

    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);

    const response = await this.get<PaginatedResponse<ChungTuResponse>>({ params: queryParams });
    
    return {
      data: response.data.map((item) => this.mapChungTuToNhatKyChung(item)),
      meta: response.meta,
    };
  }

  /**
   * Toàn bộ dòng hạch toán gắn một hợp đồng (đơn hàng). Lặp hết trang vì API mặc
   * định chỉ trả 15 bản ghi và tối đa 100/trang.
   */
  async getByHopDong(soHopDong: string): Promise<NhatKyChung[]> {
    const all: NhatKyChung[] = [];
    let page = 1;
    for (;;) {
      const res = await this.getEntries({ hopDong: soHopDong, page, limit: 100 });
      all.push(...res.data);
      if (page >= (res.meta?.totalPages ?? 1) || res.data.length === 0) break;
      page += 1;
    }
    return all;
  }

  /**
   * Tổng hợp chứng từ theo đơn hàng (tiền đã thu, doanh thu chưa/đã thực hiện).
   * Ba số đầu là luỹ kế toàn thời gian; `dtTheoThang` chỉ trong `nam`.
   */
  async getTongHopDonHang(nam: number): Promise<{
    theoDonHang: TongHopDonHang[];
    khongCoDonHang: DoanhThuKhongDon[];
  }> {
    return this.get({ endpoint: '/tong-hop-don-hang', params: { nam } });
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
    return this.get<NhatKyChungStats>({
      endpoint: '/stats',
      params: toQueryParams(params)
    });
  }

  /** Danh sách "Người giao dịch" đã dùng — nguồn options cho bộ lọc thả xuống. */
  async getNguoiGiaoDichOptions(): Promise<string[]> {
    return this.get<string[]>({ endpoint: '/nguoi-giao-dich' });
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
    // parseResponse in service-base already extracts data from { success, data } format
    return this.get<SummaryItem[]>({
      endpoint: `/summary/${type}`,
      params: toQueryParams(params)
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

  /**
   * Xóa hàng loạt theo danh sách id.
   * Trả về số đã xóa và số bị bỏ qua (bút toán đã duyệt).
   */
  async removeBatch(
    ids: string[]
  ): Promise<{ deleted: number; skipped: number }> {
    return this.post<{ deleted: number; skipped: number }>(
      { ids },
      { endpoint: '/delete-batch' }
    );
  }

  /**
   * Get all entries by soPhieu (voucher number)
   */
  async getBySoPhieu(soPhieu: string): Promise<NhatKyChung[]> {
    const response = await this.getEntries({ search: soPhieu, limit: 100 });
    // Filter to ensure exact match on soPhieu
    return response.data.filter((item) => item.soPhieu === soPhieu);
  }

  /**
   * Create multiple entries with the same soPhieu (batch create)
   */
  async createBatch(items: CreateEntryDto[]): Promise<NhatKyChung[]> {
    const response = await this.post<ChungTuResponse[]>(items, { endpoint: '/batch' });
    return response.map((item) => this.mapChungTuToNhatKyChung(item));
  }

  /**
   * Import nhiều chứng từ: mỗi item là 1 chứng từ độc lập (số phiếu riêng).
   */
  async importEntries(items: CreateEntryDto[]): Promise<NhatKyChung[]> {
    const response = await this.post<ChungTuResponse[]>(items, { endpoint: '/import' });
    return response.map((item) => this.mapChungTuToNhatKyChung(item));
  }

  /**
   * Update all entries of a soPhieu (batch update)
   * - Items with id: UPDATE existing
   * - Items without id: CREATE new with same soPhieu
   * - Items in DB but not in request: DELETE
   */
  async updateBatch(soPhieu: string, items: BatchItemDto[]): Promise<NhatKyChung[]> {
    const response = await this.patch<ChungTuResponse[]>(
      { soPhieu, items },
      { endpoint: '/batch' }
    );
    return response.map((item) => this.mapChungTuToNhatKyChung(item));
  }
}

export const nhatKyChungService = new NhatKyChungService();
