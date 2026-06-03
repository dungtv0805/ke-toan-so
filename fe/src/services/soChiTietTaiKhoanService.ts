import { ServiceBase } from './base/service-base';

export interface SoChiTietRow {
  ngay: string;
  soPhieu: string;
  ngayChungTu: string;
  noiDung: string;
  tkDoiUng: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
}

export interface SoChiTietReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  doiTuong?: { ma: string; ten: string };
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  rows: SoChiTietRow[];
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
}

class SoChiTietTaiKhoanService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/so-chi-tiet-tai-khoan' });
  }

  async getReport(
    maTaiKhoan: string,
    startDate: Date,
    endDate: Date,
    maDoiTuong?: string,
  ): Promise<SoChiTietReport | null> {
    const params: Record<string, string> = {
      maTaiKhoan,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    if (maDoiTuong) params.maDoiTuong = maDoiTuong;

    const data = await this.get<SoChiTietReport>({ params });
    if (!data || !data.taiKhoan) return null;
    return data;
  }
}

export const soChiTietTaiKhoanService = new SoChiTietTaiKhoanService();
