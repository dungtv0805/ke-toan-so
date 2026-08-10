/**
 * EBITDA = Lợi nhuận trước thuế + chi phí lãi vay + khấu hao.
 *
 * Khấu hao lấy từ phát sinh Có TK 214. Công ty chưa hạch toán TK 214 thì khấu hao
 * bằng 0 và EBITDA rút về LNTT + lãi vay — đúng như dữ liệu đang có, không phải lỗi.
 */
export function tinhEbitda(
  loiNhuanTruocThue: number,
  chiPhiLaiVay: number,
  khauHao: number,
): number {
  return loiNhuanTruocThue + chiPhiLaiVay + khauHao;
}

/**
 * Chiều phân tích → tên trường trong `danhMuc` của bút toán.
 * Dùng chung cho báo cáo lợi nhuận theo chiều và doanh số theo chiều.
 */
export const DIMENSION_FIELD_MAP: Record<string, string> = {
  'doi-tuong': 'doiTuong',
  'du-an': 'duAn',
  doi: 'doi',
  'san-pham': 'sanPham',
  'bo-phan': 'boPhan',
  'nhan-vien': 'nhanVien',
  'hop-dong': 'hopDong',
};

/** Một giá trị chiều lấy từ `danhMuc` của bút toán. */
export interface GiaTriChieu {
  ma?: string;
  ten?: string;
  soHopDong?: string;
}

/**
 * Mã định danh của một giá trị chiều — dùng làm KHOÁ gom nhóm.
 * Không bao giờ lấy `ten`: hai đối tượng khác nhau có thể trùng tên, và một đối tượng
 * có thể bị ghi tên lệch giữa các kỳ. Snapshot hợp đồng không có `ma`, mã định danh
 * của nó là `soHopDong`.
 * Trả `null` khi không có mã nào — phía gọi bỏ qua bản ghi đó.
 */
export function maChieu(dim: GiaTriChieu | undefined): string | null {
  return dim?.ma || dim?.soHopDong || null;
}

/**
 * Nhãn HIỂN THỊ của một giá trị chiều. Chỉ để hiện ra màn hình, không được dùng
 * làm khoá gom nhóm — xem `maChieu`.
 */
export function nhanChieu(dim: GiaTriChieu | undefined): string {
  return dim?.ten || dim?.ma || dim?.soHopDong || 'Không xác định';
}
