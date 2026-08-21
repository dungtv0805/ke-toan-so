import { ServiceBase } from './base/service-base';
import { chuanHoaThang } from './keHoachBanHangService';

export interface KqkdKeHoachDong {
  key: string;
  ma?: string;
  soLaMa?: string;
  ten: string;
  cap: 0 | 1 | 2;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  con?: KqkdKeHoachDong[];
}

export interface KqkdKeHoachReport {
  nam: number;
  dong: KqkdKeHoachDong[];
  doanhThuThuanNam: number;
}

/** BE có thể trả dòng thiếu tháng — chuẩn hoá về 12 số ngay ở cửa vào. */
const chuanHoaDong = (d: KqkdKeHoachDong): KqkdKeHoachDong => ({
  ...d,
  thang: chuanHoaThang(d.thang),
  ...(d.con ? { con: d.con.map(chuanHoaDong) } : {}),
});

class KqkdKeHoachService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach/kqkd' });
  }

  async layBaoCao(nam: number, phienBan?: string): Promise<KqkdKeHoachReport> {
    const res = await this.get<KqkdKeHoachReport>({
      params: { nam, loaiKeHoach: 'KE_HOACH', ...(phienBan ? { phienBan } : {}) },
    });
    return {
      nam: res?.nam ?? nam,
      doanhThuThuanNam: res?.doanhThuThuanNam ?? 0,
      dong: (res?.dong ?? []).map(chuanHoaDong),
    };
  }
}

export const kqkdKeHoachService = new KqkdKeHoachService();
