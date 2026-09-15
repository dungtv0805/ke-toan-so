/**
 * Cấu hình và hằng số của cổng hóa đơn điện tử Tổng cục Thuế.
 *
 * Toàn bộ endpoint dưới đây xác minh trực tiếp từ bundle JavaScript của cổng
 * (hoadondientu.gdt.gov.vn). Khi cổng đổi API, đây là file DUY NHẤT cần sửa.
 *
 * Cổng KHÔNG có endpoint tải PDF — đã kiểm chứng bằng cách tìm hết 24 file
 * bundle công khai: chỉ có export-xml và export-excel. Bản PDF trên giao diện
 * cổng là do trình duyệt tự dựng HTML rồi gọi window.print().
 */
export const BASE_URL = 'https://hoadondientu.gdt.gov.vn/api';

export const ENDPOINTS = {
  captcha: `${BASE_URL}/captcha`,
  authenticate: `${BASE_URL}/security-taxpayer/authenticate`,
};

/**
 * Cổng chia hóa đơn thành 2 nhóm, mỗi nhóm một namespace API riêng:
 *  - query     : hóa đơn điện tử thông thường
 *  - sco-query : hóa đơn khởi tạo từ máy tính tiền
 * Muốn lấy đủ hóa đơn của một kỳ thì phải quét CẢ HAI.
 */
export const NAMESPACES = ['query', 'sco-query'] as const;
export const INVOICE_TYPES = ['purchase', 'sold'] as const;

export type Namespace = (typeof NAMESPACES)[number];
export type InvoiceType = (typeof INVOICE_TYPES)[number];

/** Nhóm hóa đơn theo cách gọi trong hệ thống này. */
export const NHOM_THEO_NAMESPACE: Record<Namespace, string> = {
  query: 'thuong',
  'sco-query': 'may-tinh-tien',
};

export const CHIEU_THEO_TYPE: Record<InvoiceType, string> = {
  purchase: 'mua-vao',
  sold: 'ban-ra',
};

export function listUrl(
  namespace: string,
  type: string,
  { size = 50, state = null, search = '' }: { size?: number; state?: string | null; search?: string },
): string {
  const params = [`sort=tdlap:desc`, `size=${size}`];
  if (state) params.push(`state=${encodeURIComponent(state)}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  return `${BASE_URL}/${namespace}/invoices/${type}?${params.join('&')}`;
}

export function detailUrl(namespace: string, query: Record<string, string>): string {
  return `${BASE_URL}/${namespace}/invoices/detail?${new URLSearchParams(query).toString()}`;
}

export function exportXmlUrl(namespace: string, query: Record<string, string>): string {
  return `${BASE_URL}/${namespace}/invoices/export-xml?${new URLSearchParams(query).toString()}`;
}

/** Token của cổng sống khoảng một giờ; làm mới sớm hơn để tránh hết hạn giữa chừng. */
export const TOKEN_TTL_MS = 50 * 60 * 1000;

/** Captcha chỉ dùng được trong thời gian ngắn sau khi lấy về. */
export const CAPTCHA_TTL_MS = 5 * 60 * 1000;
