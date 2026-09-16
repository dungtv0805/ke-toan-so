/**
 * Chặn số liệu chưa duyệt khỏi báo cáo chính thức — mục 12.
 *
 * Mọi báo cáo tài chính của hệ thống (P&L, cân đối, sổ cái, sổ chi tiết, sổ
 * quỹ, công nợ) đều lấy dữ liệu qua các pipeline aggregate trong
 * `nhat-ky-chung.service.ts`. Đây là chỗ hẹp duy nhất, nên lọc đặt ở đây là đủ
 * cho toàn bộ hệ thống — không phải sửa từng báo cáo.
 */

/**
 * `null` nằm trong danh sách là CỐ Ý: chứng từ tạo trước khi có tính năng phê
 * duyệt không mang trường `trangThaiPheDuyet`, và `$in` kèm null khớp cả
 * document thiếu hẳn field. Bỏ nó ra thì ngày bật tính năng là mọi báo cáo về
 * 0 cho tới khi chạy xong `scripts/backfill-trang-thai-phe-duyet.js`.
 */
export const DIEU_KIEN_CHINH_THUC = {
  $in: ['CHINH_THUC', null] as (string | null)[],
};

/** Chứng từ chưa từng gửi duyệt — bộ lọc riêng của màn nhập liệu. */
const DIEU_KIEN_CHUA_GUI = { $in: [null, 'NHAP'] as (string | null)[] };

export interface TuyChonLoc {
  /**
   * Cho phép nhìn thấy cả chứng từ chưa duyệt. CHỈ màn nhập liệu (Dữ liệu tổng
   * hợp, Phiếu thu, Phiếu chi) được bật — người lập phải thấy phiếu nháp của
   * mình. Không báo cáo nào được truyền cờ này.
   */
  baoGomChuaDuyet?: boolean;
  /** Lọc theo một trạng thái cụ thể. Chỉ có tác dụng khi đã bật cờ trên. */
  trangThaiPheDuyet?: string;
}

export function apDungLocPheDuyet(
  match: Record<string, unknown>,
  tuyChon: TuyChonLoc = {},
): Record<string, unknown> {
  const ra = { ...match };

  if (!tuyChon.baoGomChuaDuyet) {
    // Ghi đè bất cứ thứ gì gọi đến truyền vào: một tham số query không được
    // phép mở cửa hậu đưa số chưa duyệt vào báo cáo chính thức.
    ra.trangThaiPheDuyet = DIEU_KIEN_CHINH_THUC;
    return ra;
  }

  if (tuyChon.trangThaiPheDuyet === 'CHUA_GUI') {
    ra.trangThaiPheDuyet = DIEU_KIEN_CHUA_GUI;
  } else if (tuyChon.trangThaiPheDuyet) {
    ra.trangThaiPheDuyet = tuyChon.trangThaiPheDuyet;
  }

  return ra;
}
