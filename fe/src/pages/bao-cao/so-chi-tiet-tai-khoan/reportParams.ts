export interface ParsedReportParams {
  maTaiKhoan?: string;
  maDoiTuong?: string;
  startDate?: string; // ISO
  endDate?: string; // ISO
}

/**
 * Trích tham số mở sổ chi tiết từ query string.
 * `get` là getter thuần (vd searchParams.get) để dễ test.
 * Chỉ trả về các key có giá trị (không rỗng).
 */
export function parseReportParams(
  get: (key: string) => string | null,
): ParsedReportParams {
  const result: ParsedReportParams = {};
  const maTaiKhoan = get('maTaiKhoan');
  const maDoiTuong = get('maDoiTuong');
  const startDate = get('startDate');
  const endDate = get('endDate');
  if (maTaiKhoan) result.maTaiKhoan = maTaiKhoan;
  if (maDoiTuong) result.maDoiTuong = maDoiTuong;
  if (startDate) result.startDate = startDate;
  if (endDate) result.endDate = endDate;
  return result;
}
