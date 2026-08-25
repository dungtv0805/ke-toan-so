export type BenKetChuyen = 'NO' | 'CO' | 'HAI_BEN';
export type LoaiKetChuyen = 'XAC_DINH_KQKD';

/** Nhãn cột "Bên kết chuyển" — bên số dư của TK nguồn được đem đi kết chuyển. */
export const NHAN_BEN: Record<BenKetChuyen, string> = {
  NO: 'Nợ',
  CO: 'Có',
  HAI_BEN: 'Hai bên',
};

export const NHAN_LOAI: Record<LoaiKetChuyen, string> = {
  XAC_DINH_KQKD: 'Kết chuyển xác định kết quả kinh doanh',
};

/** Mã kết chuyển gợi ý khi người dùng chọn xong cặp tài khoản. */
export function goiYMaKetChuyen(tu?: string, den?: string): string {
  const a = (tu ?? '').trim();
  const b = (den ?? '').trim();
  if (!a || !b) return '';
  return `${a}-${b}`;
}
