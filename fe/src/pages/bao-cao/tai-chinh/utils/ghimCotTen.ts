import type { ManHinh } from '@/config/manHinh';
import { RONG_COT_GHIM_DIEN_THOAI } from '@/components/table/ghimTheoManHinh';

type CotTen = { fixed?: unknown; width?: unknown };

/**
 * Bảng báo cáo có cột TÊN chỉ tiêu đứng đầu nhưng không ghim (vd "Chỉ tiêu"
 * 350px của Cân đối kế toán, "Khoản mục" của So sánh lãi lỗ).
 *
 * Máy tính / máy tính bảng: trả lại chính mảng đầu vào.
 * Điện thoại: cột đầu ghim trái và thu về `RONG_COT_GHIM_DIEN_THOAI` — 350px ở
 * màn 390px là cả màn chỉ thấy tên, vuốt sang thì mất tên. KHÔNG cắt "…" như
 * `ghimTheoManHinh`: tên chỉ tiêu dài ("Tiền và các khoản tương đương tiền")
 * cắt đi là mất nghĩa, để xuống dòng.
 *
 * Bảng phải có `scroll.x` thì cột ghim mới có tác dụng.
 */
export function ghimCotTen<C extends CotTen>(columns: C[], manHinh: ManHinh): C[] {
  if (manHinh !== 'mobile' || columns.length === 0) return columns;
  const [dau, ...conLai] = columns;
  return [{ ...dau, fixed: 'left', width: RONG_COT_GHIM_DIEN_THOAI } as C, ...conLai];
}
