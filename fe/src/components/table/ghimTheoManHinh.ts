import type { ManHinh } from '@/config/manHinh';

/** Bề rộng tối đa của cột ghim còn lại trên điện thoại (~40% màn 390px). */
export const RONG_COT_GHIM_DIEN_THOAI = 140;

type CotGhimDuoc = {
  fixed?: unknown;
  width?: unknown;
  ellipsis?: unknown;
};

const laGhimTrai = (f: unknown) => f === 'left' || f === 'start' || f === true;

/**
 * Cột ghim theo loại màn hình.
 *
 * Màn máy tính/máy tính bảng: giữ nguyên (trả lại chính mảng đầu vào).
 * Điện thoại: chỉ giữ cột ghim trái ĐẦU TIÊN — cột định danh (mã, số chứng từ,
 * chỉ tiêu) để vuốt ngang vẫn biết đang xem dòng nào — và thu nó về tối đa
 * `RONG_COT_GHIM_DIEN_THOAI`. Mọi cột ghim khác (kể cả cột thao tác ghim phải)
 * thành cột thường: hai cột ghim 350px ở màn 390px là hết chỗ cho dữ liệu.
 *
 * Làm trên mảng `columns` (state React) chứ không sửa DOM của bảng — sửa DOM là
 * vỡ header (xem memory ghim-cot-phai-dung-state-react).
 */
export function ghimTheoManHinh<C extends CotGhimDuoc>(
  columns: C[] | undefined,
  manHinh: ManHinh,
): C[] | undefined {
  if (!columns || manHinh !== 'mobile') return columns;
  let daGiu = false;
  return columns.map((c) => {
    if (!c.fixed) return c;
    if (!daGiu && laGhimTrai(c.fixed)) {
      daGiu = true;
      if (typeof c.width === 'number' && c.width > RONG_COT_GHIM_DIEN_THOAI) {
        return { ...c, width: RONG_COT_GHIM_DIEN_THOAI, ellipsis: true };
      }
      return c;
    }
    return { ...c, fixed: undefined };
  });
}
