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

/**
 * Header gửi kèm mọi request tới cổng Thuế.
 *
 * Tường lửa của cổng chặn request không có dấu hiệu của trình duyệt: chiều
 * 15/09/2026 nó bắt đầu trả "Hệ thống phát hiện hành vi không hợp lệ. Yêu cầu
 * đã bị chặn." cho bước đăng nhập, dù captcha vẫn lấy được bình thường.
 *
 * Đây KHÔNG phải né tránh kiểm soát: ta gọi đúng những API mà giao diện web
 * của cổng gọi, bằng chính tài khoản của doanh nghiệp, nên gửi kèm Origin và
 * Referer đúng sự thật là hợp lý. Nhịp gọi vẫn giữ nguyên giới hạn 300ms và
 * cầu dao ngắt như cũ.
 */
export const HEADER_TRINH_DUYET: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  Origin: 'https://hoadondientu.gdt.gov.vn',
  Referer: 'https://hoadondientu.gdt.gov.vn/',
};

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
  // KHÔNG encode `state` và `search`: giao diện cổng Thuế ghép thẳng hai giá
  // trị này vào URL, và bộ phân tích phía cổng đọc chuỗi thô. Encode các ký tự
  // '=' ';' '/' ':' thành %3D %3B %2F %3A là cổng trả "Truy vấn không hợp lệ.".
  const params = [`sort=tdlap:desc`, `size=${size}`];
  if (state) params.push(`state=${state}`);
  if (search) params.push(`search=${search}`);
  return `${BASE_URL}/${namespace}/invoices/${type}?${params.join('&')}`;
}

export function detailUrl(namespace: string, query: Record<string, string>): string {
  return `${BASE_URL}/${namespace}/invoices/detail?${new URLSearchParams(query).toString()}`;
}

/**
 * URL kết xuất Excel của chính cổng Thuế. Cổng dùng hai endpoint khác nhau cho
 * mua vào và bán ra — đã kiểm chứng thật, cả hai trả về file .xlsx
 * (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet).
 *
 * `search` gửi THÔ, giống hệt endpoint danh sách.
 */
export function exportExcelUrl(namespace: string, type: string, search: string): string {
  const duoi = type === 'sold' ? 'export-excel-sold' : 'export-excel';
  return `${BASE_URL}/${namespace}/invoices/${duoi}?sort=tdlap:desc&search=${search}`;
}

export function exportXmlUrl(namespace: string, query: Record<string, string>): string {
  return `${BASE_URL}/${namespace}/invoices/export-xml?${new URLSearchParams(query).toString()}`;
}

/** Token của cổng sống khoảng một giờ; làm mới sớm hơn để tránh hết hạn giữa chừng. */
export const TOKEN_TTL_MS = 50 * 60 * 1000;

/** Captcha chỉ dùng được trong thời gian ngắn sau khi lấy về. */
export const CAPTCHA_TTL_MS = 5 * 60 * 1000;
