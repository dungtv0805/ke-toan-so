import { ServiceBase } from './base/service-base';

/**
 * Tải hóa đơn điện tử từ cổng Thuế (hoadondientu.gdt.gov.vn).
 *
 * Đăng nhập cổng Thuế là HAI BƯỚC vì cổng bắt nhập captcha:
 *   dangNhap()   -> { trangThai: 'can_captcha', sessionId, captchaSvg }
 *   guiCaptcha() -> { trangThai: 'da_dang_nhap' }
 *
 * `captchaSvg` do máy chủ NGOÀI sinh ra nên phải hiển thị qua
 * <img src="data:image/svg+xml;base64,..."> chứ không nhúng thẳng vào DOM.
 */

export interface CongTyCongThue {
  id: string | null;
  mst: string;
  tenCongTy: string;
  tenDangNhap: string;
  kyKeKhai: 'thang' | 'quy';
  coLuuMatKhau: boolean;
  tuDongTai: boolean;
  gioChay: string;
  soNgayKeoLai: number;
  lanChayCuoi: string | null;
}

export interface TrangThaiPhien {
  mst: string;
  tenCongTy: string;
  daDangNhap: boolean;
  coLuuMatKhau: boolean;
}

export interface HoaDonTho {
  _id?: string;
  mst: string;
  chieu: 'mua-vao' | 'ban-ra';
  nhom: 'thuong' | 'may-tinh-tien';
  mstNguoiBan?: string;
  tenNguoiBan?: string;
  kyHieu?: string;
  soHoaDon?: string;
  ngayLap?: string;
  giaTriChuaThue: number;
  tienThue: number;
  tongThanhToan: number;
  trangThai?: string;
}

export type TrangThaiMuc = 'cho' | 'dang_chay' | 'xong' | 'can_captcha' | 'bo_qua' | 'loi';

export interface MucChay {
  mst: string;
  tenCongTy: string;
  trangThai: TrangThaiMuc;
  timThay: number;
  themMoi: number;
  thieu: number;
  soLanThu: number;
  ghiChu: string | null;
}

export interface LuotChay {
  id: number;
  nguon: 'tay' | 'lich';
  tuNgay: string;
  denNgay: string;
  trangThai: 'dang_chay' | 'xong';
  batDauLuc: string;
  ketThucLuc: string | null;
  muc: MucChay[];
}

export interface KetQuaDongBo {
  mst: string;
  timThay: number;
  themMoi: number;
  capNhat: number;
  thieu: number;
  loi: Array<{ chieu: string; nhom: string; message: string }>;
}

/** Controller trả về { success, data }; ServiceBase đã bóc lớp ngoài. */
class HoaDonCongThueService extends ServiceBase {
  constructor() {
    super({ endpoint: '/tax/hoa-don-cong-thue' });
  }

  // ------------------------------------------------------------ Công ty

  danhSachCongTy(): Promise<CongTyCongThue[]> {
    return this.get<CongTyCongThue[]>({ endpoint: '/cong-ty' });
  }

  luuCongTy(dto: {
    mst: string;
    tenCongTy?: string;
    tenDangNhap?: string;
    matKhau?: string | null;
    kyKeKhai?: string;
  }): Promise<CongTyCongThue> {
    return this.post<CongTyCongThue>(dto, { endpoint: '/cong-ty' });
  }

  quenMatKhau(mst: string): Promise<CongTyCongThue> {
    return this.put<CongTyCongThue>({}, { endpoint: `/cong-ty/${mst}/quen-mat-khau` });
  }

  datLich(
    mst: string,
    dto: { tuDongTai?: boolean; gioChay?: string; soNgayKeoLai?: number },
  ): Promise<CongTyCongThue> {
    return this.put<CongTyCongThue>(dto, { endpoint: `/cong-ty/${mst}/lich` });
  }

  // --------------------------------------------------------- Đăng nhập

  trangThaiPhien(): Promise<TrangThaiPhien[]> {
    return this.get<TrangThaiPhien[]>({ endpoint: '/phien' });
  }

  dangNhap(
    mst: string,
    matKhau?: string,
  ): Promise<{ trangThai: string; sessionId?: string; captchaSvg?: string }> {
    return this.post({ matKhau }, { endpoint: `/cong-ty/${mst}/dang-nhap` });
  }

  guiCaptcha(sessionId: string, giaTri: string, matKhau?: string): Promise<{ trangThai: string }> {
    return this.post({ giaTri, matKhau }, { endpoint: `/captcha/${sessionId}` });
  }

  // ---------------------------------------------------- Tải hóa đơn

  dongBo(mst: string, tuNgay: string, denNgay: string): Promise<KetQuaDongBo> {
    return this.post({ tuNgay, denNgay }, { endpoint: `/cong-ty/${mst}/dong-bo` });
  }

  hoaDon(
    mst: string,
    params: { chieu?: string; tuNgay?: string; denNgay?: string; limit?: number },
  ): Promise<HoaDonTho[]> {
    return this.get<HoaDonTho[]>({ endpoint: `/cong-ty/${mst}/hoa-don`, params });
  }

  taiHangLoat(dto: { dsMst?: string[]; tuNgay: string; denNgay: string }): Promise<LuotChay> {
    return this.post<LuotChay>(dto, { endpoint: '/tai-hang-loat' });
  }

  luotGanNhat(): Promise<LuotChay | null> {
    return this.get<LuotChay | null>({ endpoint: '/tai-hang-loat/gan-nhat' });
  }

  luotChay(id: number): Promise<LuotChay | null> {
    return this.get<LuotChay | null>({ endpoint: `/tai-hang-loat/${id}` });
  }

  chayTiep(id: number, gom?: TrangThaiMuc[]): Promise<{ daChay: number; hetLuot: number }> {
    return this.post({ gom }, { endpoint: `/tai-hang-loat/${id}/chay-tiep` });
  }
}

export const hoaDonCongThueService = new HoaDonCongThueService();

/** Nhãn tiếng Việt cho trạng thái từng mã số thuế trong phiếu chạy. */
export const NHAN_TRANG_THAI: Record<TrangThaiMuc, string> = {
  cho: 'Chờ',
  dang_chay: 'Đang tải',
  xong: 'Xong',
  can_captcha: 'Cần xác thực',
  bo_qua: 'Bỏ qua',
  loi: 'Lỗi',
};
