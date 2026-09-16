import { ServiceBase } from './base/service-base';

/**
 * Phê duyệt nghiệp vụ — docs/Yeu_cau_chuc_nang_phe_duyet_nghiep_vu_Master_CEO.docx.
 * Engine nằm ở config-service nên mọi endpoint đi qua tiền tố `/config`.
 */

export type TrangThaiPheDuyet =
  | 'NHAP'
  | 'CHO_PHE_DUYET'
  | 'YEU_CAU_BO_SUNG'
  | 'TU_CHOI'
  | 'DA_KIEM_SOAT'
  | 'CHINH_THUC';

export type TrangThaiBuoc =
  | 'CHUA_DEN_LUOT'
  | 'DANG_CHO'
  | 'DA_DUYET'
  | 'TRA_LAI'
  | 'TU_CHOI';

export interface BuocCauHinh {
  thuTu: number;
  viTriTen: string;
  batBuoc: boolean;
}

export interface CauHinhPheDuyet {
  id: string;
  loaiDoiTuong: string;
  loaiNghiepVuMa: string;
  loaiNghiepVuTen?: string;
  buoc: BuocCauHinh[];
}

export interface BuocPheDuyet {
  thuTu: number;
  viTriTen: string;
  batBuoc: boolean;
  trangThai: TrangThaiBuoc;
  batDauCho?: string;
  thoiDiemXuLy?: string;
  nguoiXuLyId?: string;
  nguoiXuLyTen?: string;
  yKien?: string;
  phienBan?: number;
  thoiGianXuLyGiay?: number;
}

export interface HoSoPheDuyet {
  ten: string;
  loai?: string;
  so?: string;
  ngayChungTu?: string;
  nguon: 'TAI_LEN' | 'LIEN_KET_NOI_BO';
  fileUrl?: string;
  fileTen?: string;
  doiTuongIdLienKet?: string;
  nguoiGanId?: string;
  nguoiGanTen?: string;
  thoiDiemGan?: string;
}

export interface QuyTrinhPheDuyet {
  id: string;
  loaiDoiTuong: string;
  doiTuongId: string;
  loaiNghiepVuMa: string;
  loaiNghiepVuTen?: string;
  soPhieu?: string;
  noiDung?: string;
  soTien: number;
  ngayNghiepVu?: string;
  nguoiLapId?: string;
  nguoiLapTen?: string;
  boPhan?: string;
  trangThai: TrangThaiPheDuyet;
  buocHienTai: number;
  phienBan: number;
  ngayGuiDuyet?: string;
  ngayHoanThanh?: string;
  buoc: BuocPheDuyet[];
  hoSo: HoSoPheDuyet[];
  /** Chỉ có ở danh sách "Chờ tôi duyệt". */
  viTriCanDuyet?: string;
  thoiGianChoGiay?: number;
}

export interface LichSuPheDuyet {
  id: string;
  thuTu: number;
  viTriTen?: string;
  nguoiXuLyId?: string;
  nguoiXuLyTen?: string;
  batDauCho?: string;
  thoiDiemXuLy?: string;
  ketQua: 'GUI_DUYET' | 'DUYET' | 'TRA_LAI' | 'TU_CHOI' | 'SUA_TRONG_YEU';
  yKien?: string;
  phienBan: number;
  thoiGianXuLyGiay?: number;
  createdAt: string;
}

export interface GanViTri {
  id: string;
  viTriTen: string;
  userId: string;
  hoTen?: string;
  email?: string;
}

export interface DongTocDo {
  ten: string;
  soLuong: number;
  tongGiay: number;
  trungBinhGiay: number;
  soQuaHan: number;
}

export interface BaoCaoTocDo {
  theoViTri: DongTocDo[];
  theoNguoiDung: DongTocDo[];
  theoLoaiNghiepVu: DongTocDo[];
  diemNghen?: string;
  soDangCho: number;
}

export interface TrangThaiDong {
  trangThai: TrangThaiPheDuyet;
  quyTrinhId: string;
  viTriCanDuyet?: string;
}

class PheDuyetService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/phe-duyet' });
  }

  // ===== Cấu hình — mục 3, 4 =====

  async layCauHinh(): Promise<{ viTri: string[]; cauHinh: CauHinhPheDuyet[] }> {
    return this.get({ endpoint: '/cau-hinh' });
  }

  async luuCauHinh(body: {
    loaiNghiepVuMa: string;
    loaiNghiepVuTen?: string;
    buoc: BuocCauHinh[];
  }): Promise<CauHinhPheDuyet> {
    return this.put(body, { endpoint: '/cau-hinh' });
  }

  async layViTri(): Promise<{ viTri: string[]; gan: GanViTri[] }> {
    return this.get({ endpoint: '/vi-tri' });
  }

  async ganViTri(body: {
    viTriTen: string;
    nguoiDung: { userId: string; hoTen?: string; email?: string }[];
  }): Promise<GanViTri[]> {
    return this.put(body, { endpoint: '/vi-tri' });
  }

  // ===== Luồng — mục 5, 6, 7 =====

  async guiDuyet(body: {
    doiTuongId: string;
    loaiNghiepVuMa: string;
    loaiNghiepVuTen?: string;
    soPhieu?: string;
    noiDung?: string;
    soTien?: number;
    ngayNghiepVu?: string;
    boPhan?: string;
    nguoiLapTen?: string;
  }): Promise<QuyTrinhPheDuyet> {
    return this.post(body, { endpoint: '/gui-duyet' });
  }

  async choToiDuyet(): Promise<QuyTrinhPheDuyet[]> {
    return this.get({ endpoint: '/cho-toi-duyet' });
  }

  async chiTiet(id: string): Promise<{
    quyTrinh: QuyTrinhPheDuyet;
    lichSu: LichSuPheDuyet[];
  }> {
    return this.get({ endpoint: `/${id}` });
  }

  async theoDoiTuong(doiTuongId: string): Promise<QuyTrinhPheDuyet | null> {
    return this.get({ endpoint: `/theo-doi-tuong/${doiTuongId}` });
  }

  async duyet(id: string, yKien?: string): Promise<QuyTrinhPheDuyet> {
    return this.post({ yKien }, { endpoint: `/${id}/duyet` });
  }

  async traLai(id: string, yKien: string): Promise<QuyTrinhPheDuyet> {
    return this.post({ yKien }, { endpoint: `/${id}/tra-lai` });
  }

  async tuChoi(id: string, yKien: string): Promise<QuyTrinhPheDuyet> {
    return this.post({ yKien }, { endpoint: `/${id}/tu-choi` });
  }

  async themHoSo(id: string, hoSo: HoSoPheDuyet): Promise<QuyTrinhPheDuyet> {
    return this.post(hoSo, { endpoint: `/${id}/ho-so` });
  }

  /** Trạng thái của nhiều chứng từ một lượt — lưới gọi một request cho cả trang. */
  async trangThaiHangLoat(
    doiTuongIds: string[],
  ): Promise<Record<string, TrangThaiDong>> {
    if (!doiTuongIds.length) return {};
    return this.post({ doiTuongIds }, { endpoint: '/trang-thai' });
  }

  async baoCaoTocDo(params?: {
    tuNgay?: string;
    denNgay?: string;
  }): Promise<BaoCaoTocDo> {
    return this.get({ endpoint: '/bao-cao-toc-do', params });
  }
}

export const pheDuyetService = new PheDuyetService();
