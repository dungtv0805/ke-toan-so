import { ServiceBase, getAuthToken } from './base/service-base';
import { API_CONFIG } from '@/config/api';

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
  /** Đã tải được bản gốc (ZIP chứa XML ký số) về máy chủ chưa. */
  coFileGoc?: boolean;
  /** Đã dựng bản thể hiện PDF chưa. */
  coPdf?: boolean;
  kichThuocFileGoc?: number;
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

export type TrangThaiMucFile = 'cho' | 'xong' | 'bo_qua' | 'loi';

export interface MucTaiFile {
  soHoaDon: string;
  kyHieu: string;
  mstNguoiBan: string;
  ngayLap: string | null;
  trangThai: TrangThaiMucFile;
  bytes: number;
  ghiChu: string | null;
}

export interface LuotTaiFile {
  id: number;
  mst: string;
  tuNgay: string;
  denNgay: string;
  trangThai: 'dang_chay' | 'xong';
  tong: number;
  /** Đã xử lý bao nhiêu trong lô lần này — để vẽ thanh tiến độ. */
  daXuLy: number;
  loNay: number;
  daTai: number;
  boQua: number;
  bytes: number;
  conLai: number;
  loi: Array<{ soHoaDon: string; message: string }>;
  /** Trạng thái từng hóa đơn — biết đúng file nào hỏng. */
  muc: MucTaiFile[];
}

export interface MucTaoPdf {
  soHoaDon: string;
  kyHieu: string;
  mstNguoiBan: string;
  ngayLap: string | null;
  trangThai: TrangThaiMucFile;
  ghiChu: string | null;
}

export interface LuotTaoPdf {
  id: number;
  mst: string;
  tuNgay: string;
  denNgay: string;
  trangThai: 'dang_chay' | 'xong';
  tong: number;
  daXuLy: number;
  daTao: number;
  boQua: number;
  loi: Array<{ soHoaDon: string; message: string }>;
  muc: MucTaoPdf[];
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

  /** Cổng Thuế có đang chặn không — để giao diện nói rõ thay vì để người dùng đoán. */
  tinhTrangCongThue(): Promise<{
    dangBiChan: boolean;
    lanChanCuoi: string | null;
    soPhutTruoc: number | null;
  }> {
    return this.get({ endpoint: '/cong-thue/tinh-trang' });
  }

  trangThaiPhien(): Promise<TrangThaiPhien[]> {
    return this.get<TrangThaiPhien[]>({ endpoint: '/phien' });
  }

  dangNhap(
    mst: string,
    matKhau?: string,
  ): Promise<{ trangThai: string; sessionId?: string; captchaSvg?: string }> {
    return this.post({ matKhau }, { endpoint: `/cong-ty/${mst}/dang-nhap` });
  }

  /** Đặt token lấy từ phiên trình duyệt — dùng khi cổng chặn đăng nhập bằng máy. */
  datToken(mst: string, token: string): Promise<{ mst: string; hetHanLuc: string }> {
    return this.post({ token }, { endpoint: `/cong-ty/${mst}/token` });
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

  // ------------------------------------------------------------ File gốc

  /**
   * Tải gói ZIP chứa XML có chữ ký số — bản gốc hợp pháp theo Nghị định
   * 123/2020. Cổng Thuế không có bản PDF để tải.
   */
  /** Trả về NGAY một lượt chạy nền; hỏi tiến độ bằng luotTaiFile(id). */
  taiFileGoc(mst: string, tuNgay: string, denNgay: string): Promise<LuotTaiFile> {
    return this.post({ tuNgay, denNgay }, { endpoint: `/cong-ty/${mst}/file-goc` });
  }

  luotTaiFile(id: number): Promise<LuotTaiFile | null> {
    return this.get({ endpoint: `/file-goc/${id}` });
  }

  luotTaiFileGanNhat(mst: string): Promise<LuotTaiFile | null> {
    return this.get({ endpoint: `/cong-ty/${mst}/file-goc/gan-nhat` });
  }

  /**
   * Tải về máy toàn bộ file gốc của một kỳ, gói trong một file ZIP.
   *
   * Dùng fetch + objectURL chứ không phải thẻ <a href> thuần: endpoint cần
   * header Authorization, mà thẻ <a> thì không gửi được header.
   */
  async taiVeFileGoc(mst: string, tuNgay: string, denNgay: string): Promise<void> {
    const token = getAuthToken();
    const res = await fetch(
      `${API_CONFIG.BASE_URL}/tax/hoa-don-cong-thue/cong-ty/${mst}/file-goc/tai-ve` +
        `?tuNgay=${tuNgay}&denNgay=${denNgay}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );

    if (!res.ok) {
      // Lỗi ở đây vẫn là JSON của GlobalExceptionFilter, không phải file ZIP.
      const loi = await res.json().catch(() => null);
      throw new Error(loi?.error?.message || 'Không tải được file gốc');
    }

    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoa-don-goc_${mst}_${tuNgay}_${denNgay}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Kết xuất Excel do CỔNG THUẾ sinh ra. Một tháng trả .xlsx, nhiều tháng trả
   * .zip chứa nhiều .xlsx (cổng giới hạn mỗi truy vấn tối đa một tháng).
   */
  async xuatExcel(
    mst: string,
    tuNgay: string,
    denNgay: string,
    chieu: 'mua-vao' | 'ban-ra',
  ): Promise<void> {
    const token = getAuthToken();
    const res = await fetch(
      `${API_CONFIG.BASE_URL}/tax/hoa-don-cong-thue/cong-ty/${mst}/excel` +
        `?tuNgay=${tuNgay}&denNgay=${denNgay}&chieu=${chieu}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );

    if (!res.ok) {
      const loi = await res.json().catch(() => null);
      throw new Error(loi?.error?.message || 'Không kết xuất được Excel');
    }

    const blob = await res.blob();
    const zip = blob.type === 'application/zip';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoa-don_${chieu}_${mst}_${tuNgay}_${denNgay}.${zip ? 'zip' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------- PDF

  /** Dựng bản thể hiện PDF từ file gốc đã tải. Trả về ngay, chạy ở nền. */
  taoPdf(mst: string, tuNgay: string, denNgay: string): Promise<LuotTaoPdf> {
    return this.post({ tuNgay, denNgay }, { endpoint: `/cong-ty/${mst}/pdf` });
  }

  luotTaoPdf(id: number): Promise<LuotTaoPdf | null> {
    return this.get({ endpoint: `/pdf/${id}` });
  }

  async taiVePdf(mst: string, tuNgay: string, denNgay: string): Promise<void> {
    const token = getAuthToken();
    const res = await fetch(
      `${API_CONFIG.BASE_URL}/tax/hoa-don-cong-thue/cong-ty/${mst}/pdf/tai-ve` +
        `?tuNgay=${tuNgay}&denNgay=${denNgay}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) {
      const loi = await res.json().catch(() => null);
      throw new Error(loi?.error?.message || 'Không tải được PDF');
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoa-don-pdf_${mst}_${tuNgay}_${denNgay}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  luotTaoPdfGanNhat(mst: string): Promise<LuotTaoPdf | null> {
    return this.get({ endpoint: `/cong-ty/${mst}/pdf/gan-nhat` });
  }

  /** Tải file của ĐÚNG MỘT hóa đơn: 'zip' là bản gốc ký số, 'pdf' là bản thể hiện. */
  async taiMotHoaDon(
    mst: string,
    khoa: { mstNguoiBan: string; kyHieu: string; soHoaDon: string },
    loai: 'zip' | 'pdf',
  ): Promise<void> {
    const token = getAuthToken();
    const p = new URLSearchParams(khoa).toString();
    const res = await fetch(
      `${API_CONFIG.BASE_URL}/tax/hoa-don-cong-thue/cong-ty/${mst}/hoa-don/` +
        `${loai === 'pdf' ? 'pdf' : 'file-goc'}?${p}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) {
      const loi = await res.json().catch(() => null);
      throw new Error(loi?.error?.message || 'Không tải được hóa đơn này');
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `${khoa.mstNguoiBan}_${khoa.kyHieu}_${khoa.soHoaDon}.${loai}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Lấy PDF về dạng objectURL để xem ngay trong khung bên cạnh.
   * Nhớ gọi URL.revokeObjectURL khi đổi sang hóa đơn khác.
   */
  /** Excel tổng hợp (1 dòng/hóa đơn) hoặc chi tiết (1 dòng/mặt hàng). */
  async taiExcel(
    mst: string,
    tuNgay: string,
    denNgay: string,
    loai: 'tong-hop' | 'chi-tiet',
  ): Promise<void> {
    const token = getAuthToken();
    const res = await fetch(
      `${API_CONFIG.BASE_URL}/tax/hoa-don-cong-thue/cong-ty/${mst}/excel/${loai}` +
        `?tuNgay=${tuNgay}&denNgay=${denNgay}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) {
      const loi = await res.json().catch(() => null);
      throw new Error(loi?.error?.message || 'Không kết xuất được Excel');
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `${loai}_${mst}_${tuNgay}_${denNgay}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async xemPdf(
    mst: string,
    khoa: { mstNguoiBan: string; kyHieu: string; soHoaDon: string },
  ): Promise<string> {
    const token = getAuthToken();
    const p = new URLSearchParams(khoa).toString();
    const res = await fetch(
      `${API_CONFIG.BASE_URL}/tax/hoa-don-cong-thue/cong-ty/${mst}/hoa-don/pdf?${p}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) {
      const loi = await res.json().catch(() => null);
      throw new Error(loi?.error?.message || 'Không xem được hóa đơn này');
    }
    return URL.createObjectURL(await res.blob());
  }

  daTaiFileGoc(mst: string, tuNgay: string, denNgay: string): Promise<{ tong: number; daCoFile: number }> {
    return this.get({ endpoint: `/cong-ty/${mst}/file-goc`, params: { tuNgay, denNgay } });
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
