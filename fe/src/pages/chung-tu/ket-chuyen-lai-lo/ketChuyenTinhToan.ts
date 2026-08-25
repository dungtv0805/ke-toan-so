import dayjs from 'dayjs';

export interface DongHachToan {
  maKetChuyen: string;
  dienGiai: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  soTien: number;
}

export interface CanhBaoKetChuyen {
  ma: string;
  ten: string;
  soTien: number;
  ben: 'NO' | 'CO';
}

export const dinhDangTien = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

export function tongSoTien(dong: DongHachToan[]): number {
  return dong.reduce((t, d) => t + (Number(d.soTien) || 0), 0);
}

export function dienGiaiMacDinh(denNgay: string): string {
  return `Kết chuyển lãi lỗ đến ngày ${dayjs(denNgay).format('DD/MM/YYYY')}`;
}

export function moTaCanhBao(c: CanhBaoKetChuyen): string {
  const ben = c.ben === 'NO' ? 'Nợ' : 'Có';
  return `TK ${c.ma} — ${c.ten} còn dư ${ben} ${dinhDangTien(c.soTien)} chưa được kết chuyển (chưa khai trong danh mục)`;
}
