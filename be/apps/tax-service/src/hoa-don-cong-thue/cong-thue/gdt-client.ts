/**
 * Client gọi API cổng hóa đơn điện tử Tổng cục Thuế.
 *
 * Đây là lớp DUY NHẤT biết về giao thức của cổng. Mọi phần khác chỉ nói chuyện
 * qua các hàm ở đây, nên khi cổng đổi API thì chỉ sửa file này và config.ts.
 */
import { ENDPOINTS, listUrl, detailUrl, exportXmlUrl } from './config';
import { request, GdtError } from './http';

export interface HoaDonTho {
  nbmst?: string;
  nbten?: string;
  nmmst?: string;
  nmten?: string;
  khmshdon?: string | number;
  khhdon?: string;
  shdon?: string | number;
  tdlap?: string;
  tgtcthue?: number | string;
  tgtthue?: number | string;
  tgtttbso?: number | string;
  tthai?: string | number;
  ttxly?: string | number;
  [key: string]: unknown;
}

/**
 * Dựng chuỗi filter theo cú pháp của cổng, ví dụ:
 *   tdlap=ge=01/01/2026;tdlap=le=31/01/2026
 * @param params ngày dạng dd/MM/yyyy
 */
export function buildSearch({
  from,
  to,
  extra = {},
}: {
  from: string;
  to: string;
  extra?: Record<string, string>;
}): string {
  const clauses = [`tdlap=ge=${from}`, `tdlap=le=${to}`];
  for (const [field, value] of Object.entries(extra)) clauses.push(`${field}==${value}`);
  return clauses.join(';');
}

/** Chuyển Date hoặc 'yyyy-MM-dd' sang 'dd/MM/yyyy' mà cổng yêu cầu. */
export function toPortalDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Ngày không hợp lệ: ${String(value)}`);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Lấy captcha mới. `content` là chuỗi SVG. */
export async function getCaptcha(): Promise<{ key: string; content: string }> {
  const data = await request(ENDPOINTS.captcha);
  if (!data?.key || !data?.content) throw new GdtError('Cổng Thuế trả về captcha không hợp lệ');
  return { key: data.key, content: data.content };
}

/** Đăng nhập bằng MST + mật khẩu + captcha. @returns JWT token dùng cho các request sau. */
export async function authenticate({
  username,
  password,
  captchaKey,
  captchaValue,
}: {
  username: string;
  password: string;
  captchaKey: string;
  captchaValue: string;
}): Promise<string> {
  let data: any;
  try {
    data = await request(ENDPOINTS.authenticate, {
      method: 'POST',
      body: { username, password, ckey: captchaKey, cvalue: captchaValue },
    });
  } catch (err) {
    // Cổng trả 401 cho cả "sai mật khẩu" lẫn "sai captcha". Lớp http dịch mọi
    // 401 thành "token hết hạn", nhưng lúc đăng nhập thì chưa hề có token -
    // giữ nguyên thông báo đó sẽ khiến người dùng đi sửa nhầm chỗ.
    if (err instanceof GdtError && err.status === 401) {
      throw new GdtError('Đăng nhập thất bại: sai tài khoản, mật khẩu hoặc mã captcha', {
        status: 401,
        code: 'LOGIN_FAILED',
      });
    }
    throw err;
  }

  if (!data?.token) {
    throw new GdtError(data?.message || 'Đăng nhập thất bại: cổng không trả về token', {
      code: 'LOGIN_FAILED',
      body: data,
    });
  }
  return data.token;
}

/**
 * Lấy MỘT trang hóa đơn.
 * Cổng phân trang bằng con trỏ `state`, không phải số trang.
 */
export async function listInvoicesPage({
  token,
  namespace,
  type,
  search,
  size = 50,
  state = null,
}: {
  token: string;
  namespace: string;
  type: string;
  search: string;
  size?: number;
  state?: string | null;
}): Promise<{ items: HoaDonTho[]; total: number; state: string | null }> {
  const data = await request(listUrl(namespace, type, { size, state, search }), { token });
  return {
    items: data?.datas ?? [],
    total: data?.total ?? 0,
    state: data?.state ?? null,
  };
}

/** Lấy TOÀN BỘ hóa đơn của một khoảng ngày, tự lật hết các trang. */
export async function listAllInvoices({
  token,
  namespace,
  type,
  search,
  size = 50,
  maxPages = 500,
  onPage,
}: {
  token: string;
  namespace: string;
  type: string;
  search: string;
  size?: number;
  maxPages?: number;
  onPage?: (info: { fetched: number; total: number }) => void;
}): Promise<{ items: HoaDonTho[]; total: number }> {
  const all: HoaDonTho[] = [];
  let state: string | null = null;
  let total = 0;

  for (let page = 0; page < maxPages; page++) {
    const result = await listInvoicesPage({ token, namespace, type, search, size, state });
    total = result.total || total;
    all.push(...result.items);
    onPage?.({ fetched: all.length, total });

    // Hết dữ liệu khi cổng không trả thêm state hoặc trang rỗng.
    if (!result.state || result.items.length === 0) break;
    state = result.state;
  }

  return { items: all, total };
}

/** Chi tiết một hóa đơn, gồm danh sách hàng hóa dịch vụ. */
export async function getInvoiceDetail({
  token,
  namespace,
  query,
}: {
  token: string;
  namespace: string;
  query: Record<string, string>;
}): Promise<any> {
  return request(detailUrl(namespace, query), { token });
}

/**
 * Tải file gốc của hóa đơn.
 *
 * Cổng trả về gói ZIP chứa XML có chữ ký số — đây là BẢN GỐC theo Nghị định
 * 123/2020. Cổng không có endpoint PDF nào.
 */
export async function downloadXml({
  token,
  namespace,
  query,
}: {
  token: string;
  namespace: string;
  query: Record<string, string>;
}): Promise<Buffer> {
  return request(exportXmlUrl(namespace, query), { token, raw: true });
}

/** Tham số định danh một hóa đơn, dùng cho detail và export-xml. */
export function invoiceKey(invoice: HoaDonTho): Record<string, string> {
  return {
    nbmst: String(invoice.nbmst ?? ''),
    khhdon: String(invoice.khhdon ?? ''),
    shdon: String(invoice.shdon ?? ''),
    khmshdon: String(invoice.khmshdon ?? ''),
  };
}
