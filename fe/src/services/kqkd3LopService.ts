import { ServiceBase } from './base/service-base';
import { chuanHoaThang } from './keHoachBanHangService';
import type {
  KqkdKeHoachDong,
  KqkdKeHoachReport,
} from './kqkdKeHoachService';

export type { KqkdKeHoachDong, KqkdKeHoachReport };

/** Ba báo cáo CÙNG cấu trúc cây — ghép theo `key` ở phía hiển thị. */
export interface Kqkd3LopReport {
  nam: number;
  keHoach: KqkdKeHoachReport;
  duBao: KqkdKeHoachReport;
  thucHien: KqkdKeHoachReport;
}

const chuanHoaDong = (d: KqkdKeHoachDong): KqkdKeHoachDong => ({
  ...d,
  thang: chuanHoaThang(d.thang),
  ...(d.con ? { con: d.con.map(chuanHoaDong) } : {}),
});

const chuanHoaBaoCao = (
  bc: KqkdKeHoachReport | undefined,
  nam: number,
): KqkdKeHoachReport => ({
  nam: bc?.nam ?? nam,
  doanhThuThuanNam: bc?.doanhThuThuanNam ?? 0,
  doanhThuThuanThang: chuanHoaThang(bc?.doanhThuThuanThang),
  dinhPhiThang: chuanHoaThang(bc?.dinhPhiThang),
  bienPhiThang: chuanHoaThang(bc?.bienPhiThang),
  dong: (bc?.dong ?? []).map(chuanHoaDong),
});

class Kqkd3LopService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach/kqkd-3-lop' });
  }

  async layBaoCao(nam: number, phienBan?: string): Promise<Kqkd3LopReport> {
    const res = await this.get<Kqkd3LopReport>({
      params: { nam, ...(phienBan ? { phienBan } : {}) },
    });
    return {
      nam: res?.nam ?? nam,
      keHoach: chuanHoaBaoCao(res?.keHoach, nam),
      duBao: chuanHoaBaoCao(res?.duBao, nam),
      thucHien: chuanHoaBaoCao(res?.thucHien, nam),
    };
  }
}

export const kqkd3LopService = new Kqkd3LopService();
