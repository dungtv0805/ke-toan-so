/**
 * Bản đồ chỉ tiêu của Báo cáo kết quả kinh doanh — NGUỒN SỰ THẬT DUY NHẤT.
 *
 * Cả báo cáo KQKD thực hiện (reporting-service, đọc `chung_tu`) lẫn báo cáo KQKD
 * kế hoạch (voucher-service, đọc `ke_hoach`) đều gọi vào đây. Sửa prefix ở một chỗ
 * là hai báo cáo cùng đổi, không có chuyện lệch công thức.
 */

export type BenPhatSinh = 'NO' | 'CO';

/** Một bút toán rút gọn — chứng từ hay dòng kế hoạch đều quy về hình này. */
export interface ButToanKqkd {
  soTien: number;
  maTaiKhoanNo?: string;
  maTaiKhoanCo?: string;
}

export const CHI_TIEU_GOC_KQKD = [
  { ma: '01', prefix: '511', ben: 'CO' },
  { ma: '02', prefix: '521', ben: 'NO' },
  { ma: '11', prefix: '632', ben: 'NO' },
  { ma: '21', prefix: '515', ben: 'CO' },
  { ma: '22', prefix: '635', ben: 'NO' },
  { ma: '25', prefix: '641', ben: 'NO' },
  { ma: '26', prefix: '642', ben: 'NO' },
  { ma: '31', prefix: '711', ben: 'CO' },
  { ma: '32', prefix: '811', ben: 'NO' },
  { ma: '51', prefix: '8211', ben: 'NO' },
  { ma: '52', prefix: '8212', ben: 'NO' },
] as const satisfies ReadonlyArray<{
  ma: string;
  prefix: string;
  ben: BenPhatSinh;
}>;

export type MaChiTieuGoc = (typeof CHI_TIEU_GOC_KQKD)[number]['ma'];

export type ChiTieuGocKqkd = Record<MaChiTieuGoc, number>;

export function chiTieuGocRong(): ChiTieuGocKqkd {
  const rong = {} as ChiTieuGocKqkd;
  for (const ct of CHI_TIEU_GOC_KQKD) rong[ct.ma] = 0;
  return rong;
}

/**
 * Cộng một bút toán vào rổ có sẵn. Cộng dồn TẠI CHỖ để bên gom theo tháng chỉ cần
 * giữ 12 rổ, không phải chia dòng ra 12 mảng rồi cộng lại.
 *
 * Một bút toán có thể rơi vào HAI chỉ tiêu (TK Nợ khớp cái này, TK Có khớp cái kia)
 * — ví dụ Nợ 641 / Có 511. Đây là hành vi của `getKqkd` từ trước, giữ nguyên.
 */
export function congButToan(tong: ChiTieuGocKqkd, dong: ButToanKqkd): void {
  const soTien = Number(dong.soTien) || 0;
  if (soTien === 0) return;

  for (const ct of CHI_TIEU_GOC_KQKD) {
    const ma = ct.ben === 'NO' ? dong.maTaiKhoanNo : dong.maTaiKhoanCo;
    if (ma?.startsWith(ct.prefix)) tong[ct.ma] += soTien;
  }
}

export function tinhChiTieuGoc(rows: ButToanKqkd[]): ChiTieuGocKqkd {
  const tong = chiTieuGocRong();
  for (const dong of rows) congButToan(tong, dong);
  return tong;
}

export interface ChiTieuDanXuatKqkd {
  /** Mã 10 — doanh thu thuần. */
  m10: number;
  /** Mã 20 — lợi nhuận gộp. */
  m20: number;
  /** Mã 30 — lợi nhuận thuần từ hoạt động kinh doanh. */
  m30: number;
  /** Mã 40 — lợi nhuận khác. */
  m40: number;
  /** Mã 50 — lợi nhuận trước thuế. */
  m50: number;
  /** Mã 60 — lợi nhuận sau thuế. */
  m60: number;
  /** Mục IX của sheet thiết kế: chi phí tài chính + bán hàng + quản lý. */
  tongChiPhi: number;
}

export function tinhChiTieuDanXuat(g: ChiTieuGocKqkd): ChiTieuDanXuatKqkd {
  const m10 = g['01'] - g['02'];
  const m20 = m10 - g['11'];
  const m30 = m20 + (g['21'] - g['22']) - (g['25'] + g['26']);
  const m40 = g['31'] - g['32'];
  const m50 = m30 + m40;
  const m60 = m50 - g['51'] - g['52'];
  return { m10, m20, m30, m40, m50, m60, tongChiPhi: g['22'] + g['25'] + g['26'] };
}
