import type { TaiKhoan } from '@/types';

/** Mức nhập liệu khai ở danh mục Tài khoản (`fieldRules`). Không khai = tùy chọn. */
export type MucNhapLieu = 'BAT_BUOC' | 'CANH_BAO';

/** Bốn trường phân bổ được khai trên một quy chuẩn hạch toán. */
export const TRUONG_QUY_CHUAN = ['nhomKhoanMuc', 'khoanMuc', 'dongTien', 'loaiChiPhi'] as const;
export type TruongQuyChuan = (typeof TRUONG_QUY_CHUAN)[number];

export const NHAN_TRUONG_QUY_CHUAN: Record<TruongQuyChuan, string> = {
  nhomKhoanMuc: 'Nhóm khoản mục',
  khoanMuc: 'Khoản mục',
  dongTien: 'Dòng tiền',
  loaiChiPhi: 'Loại chi phí',
};

export type RangBuoc = Partial<Record<TruongQuyChuan, MucNhapLieu>>;
export type GiaTriPhanBo = Partial<Record<TruongQuyChuan, string | undefined | null>>;

const nangHon = (a?: MucNhapLieu, b?: MucNhapLieu): MucNhapLieu | undefined =>
  a === 'BAT_BUOC' || b === 'BAT_BUOC' ? 'BAT_BUOC' : (a ?? b);

/**
 * Ràng buộc của một quy chuẩn = mức NẶNG NHẤT giữa TK Nợ và TK Có.
 * Cùng cách gộp với dòng bút toán ở Nhật ký chung
 * (`fe/src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.ts`) — hai chỗ hiểu khác
 * nhau thì quy chuẩn lưu được nhưng bút toán sinh ra từ nó lại bị chặn.
 */
export function rangBuocQuyChuan(
  tkNo?: TaiKhoan | null,
  tkCo?: TaiKhoan | null,
): RangBuoc {
  const rb: RangBuoc = {};
  for (const truong of TRUONG_QUY_CHUAN) {
    const muc = nangHon(
      tkNo?.fieldRules?.[truong] as MucNhapLieu | undefined,
      tkCo?.fieldRules?.[truong] as MucNhapLieu | undefined,
    );
    if (muc) rb[truong] = muc;
  }
  return rb;
}

const trong = (v?: string | null): boolean => !v || !v.trim();

/** Các trường đang bị ràng buộc ở `muc` mà giá trị còn trống. */
export function truongThieu(
  rangBuoc: RangBuoc,
  giaTri: GiaTriPhanBo,
  muc: MucNhapLieu,
): TruongQuyChuan[] {
  return TRUONG_QUY_CHUAN.filter((t) => rangBuoc[t] === muc && trong(giaTri[t]));
}
