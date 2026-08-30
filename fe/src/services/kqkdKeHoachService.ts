import { ServiceBase } from './base/service-base';
import { chuanHoaThang } from './keHoachBanHangService';
import type { LoaiKeHoach } from './keHoachService';

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
  /**
   * Ba dãy 12 tháng dùng cho dòng "DOANH THU HÒA VỐN". Hòa vốn là tỷ số nên
   * không cộng dồn được — mỗi cột phải tính lại từ ba số của chính kỳ đó.
   */
  doanhThuThuanThang: number[];
  /** Định phí: chi phí tài chính + CPBH/CPQLDN khoản mục loại Cố định. */
  dinhPhiThang: number[];
  /** Biến phí: giá vốn + CPBH/CPQLDN khoản mục loại Biến đổi. */
  bienPhiThang: number[];
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

  async layBaoCao(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
    phienBan?: string,
  ): Promise<KqkdKeHoachReport> {
    const res = await this.get<KqkdKeHoachReport>({
      params: { nam, loaiKeHoach, ...(phienBan ? { phienBan } : {}) },
    });
    return {
      nam: res?.nam ?? nam,
      doanhThuThuanNam: res?.doanhThuThuanNam ?? 0,
      doanhThuThuanThang: chuanHoaThang(res?.doanhThuThuanThang),
      dinhPhiThang: chuanHoaThang(res?.dinhPhiThang),
      bienPhiThang: chuanHoaThang(res?.bienPhiThang),
      dong: (res?.dong ?? []).map(chuanHoaDong),
    };
  }
}

export const kqkdKeHoachService = new KqkdKeHoachService();
