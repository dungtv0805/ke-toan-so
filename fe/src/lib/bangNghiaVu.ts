/**
 * Quy cách trình bày bảng "Tình hình thực hiện nghĩa vụ chính sách".
 *
 * Bảng này hiện ở hai nơi — khối Tổng quan (`NghiaVuChinhSachTable`) và trang
 * Thuế → Tạm tính Thuế TNDN (`BaoCaoTNDNPage`, có thêm ô nhập điều chỉnh). Nó là
 * MỘT báo cáo, nên cách trình bày phải giống hệt nhau; để mỗi trang tự đặt màu
 * và định dạng số là y như rằng lệch. Gom về đây để sửa một chỗ.
 */

import type { CSSProperties } from 'react';

const nf = new Intl.NumberFormat('vi-VN');

/** Số 0 để TRỐNG chứ không in "0" — bảng đầy số 0 là không đọc được. */
export const dinhDangSoNghiaVu = (v?: number): string =>
  v ? nf.format(v) : '';

/** Dòng tổng/dẫn xuất — in đậm. */
const DONG_DAM = new Set([
  'Tổng CP phát sinh',
  'Lợi nhuận trước thuế',
  'Thu nhập tính thuế',
  'Lợi nhuận sau thuế',
  'Chi phí không được trừ',
]);

/** Dòng chữ đỏ: các khoản "… phải nộp" và "Chi phí không được trừ". */
export const laDongDo = (chiTieu: string): boolean =>
  chiTieu.includes('phải nộp') || chiTieu === 'Chi phí không được trừ';

export const laDongDam = (chiTieu: string): boolean =>
  laDongDo(chiTieu) || DONG_DAM.has(chiTieu);

/** Style của cả dòng theo tên chỉ tiêu; `undefined` nghĩa là dòng thường. */
export function kieuDongNghiaVu(
  chiTieu: string,
): CSSProperties | undefined {
  const do_ = laDongDo(chiTieu);
  const dam = laDongDam(chiTieu);
  if (!dam && !do_) return undefined;
  return {
    ...(dam ? { fontWeight: 600 } : {}),
    ...(do_ ? { color: 'hsl(var(--red))' } : {}),
  };
}

/** Ô của dòng tiêu đề phân hệ (THUẾ TNDN, THUẾ GTGT…): nền xám, chữ căn giữa. */
export const KIEU_O_TIEU_DE_NHOM: CSSProperties = {
  background: 'hsl(var(--muted) / 0.5)',
  textAlign: 'center',
};
