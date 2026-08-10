import type { OverdueRow } from '@/services/dashboardService';
import type { TienTheoTaiKhoanRow } from './trialBalanceDerive';
import { formatShortCurrency } from './components/format';

export type LoaiCanhBao = 'CONG_NO_QUA_HAN' | 'TIEN_AM' | 'LOI_NHUAN_AM';

export interface CanhBao {
  loai: LoaiCanhBao;
  moTa: string;
  /** Đường dẫn tới trang xem chi tiết. */
  duong: string;
}

export interface CanhBaoInput {
  quaHanThu: OverdueRow[];
  quaHanTra: OverdueRow[];
  taiKhoanTien: TienTheoTaiKhoanRow[];
  loiNhuanSauThue: number;
}

/**
 * Ba loại cảnh báo tài chính, xếp theo mức khẩn: công nợ quá hạn → tiền âm →
 * lợi nhuận âm. Khoản quá hạn 0 ngày chưa tính là quá hạn.
 */
export function tinhCanhBao(input: CanhBaoInput): CanhBao[] {
  const out: CanhBao[] = [];

  const themQuaHan = (rows: OverdueRow[], duong: string, nhan: string) => {
    for (const r of rows) {
      if ((r.soNgayQuaHan || 0) <= 0) continue;
      out.push({
        loai: 'CONG_NO_QUA_HAN',
        moTa: `${nhan} ${r.doiTuongTen}: ${formatShortCurrency(r.conLai)} — quá hạn ${r.soNgayQuaHan} ngày`,
        duong,
      });
    }
  };

  themQuaHan(input.quaHanThu, '/cong-no/phai-thu', 'Phải thu');
  themQuaHan(input.quaHanTra, '/cong-no/phai-tra', 'Phải trả');

  for (const tk of input.taiKhoanTien) {
    if (tk.duCuoiKy >= 0) continue;
    out.push({
      loai: 'TIEN_AM',
      moTa: `Tài khoản ${tk.ma} — ${tk.ten} có số dư âm: ${formatShortCurrency(tk.duCuoiKy)}`,
      duong: '/so-quy',
    });
  }

  if (input.loiNhuanSauThue < 0) {
    out.push({
      loai: 'LOI_NHUAN_AM',
      moTa: `Lợi nhuận sau thuế kỳ này âm: ${formatShortCurrency(input.loiNhuanSauThue)}`,
      duong: '/bao-cao/tai-chinh',
    });
  }

  return out;
}
