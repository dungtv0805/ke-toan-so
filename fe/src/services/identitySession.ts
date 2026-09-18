const IDENTITY_URL = import.meta.env.VITE_IDENTITY_URL as string | undefined;

/**
 * Đổi cookie phiên identity (mc_session, gửi kèm credentials) lấy access token
 * TƯƠI cho tenant. Đây là nguồn chân lý của phiên — KHÔNG tin token cache trong
 * localStorage.
 *
 * Trả về:
 * - accessToken mới nếu phiên identity còn sống.
 * - null nếu phiên đã kết thúc (đã logout ở portal → cookie/refresh chết → 401),
 *   identity chưa cấu hình, hoặc lỗi mạng. Caller coi null = "đã đăng xuất".
 */
export async function refreshFromIdentity(tenantId: string): Promise<string | null> {
  if (!IDENTITY_URL || !tenantId) return null;
  try {
    const res = await fetch(`${IDENTITY_URL}/api/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    });
    if (!res.ok) return null; // 401 = phiên identity đã kết thúc
    const body = await res.json().catch(() => null);
    return body?.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

/** Lấy tenantId từ claim của access token (khi chưa có tenant lưu sẵn). */
export function decodeTenantId(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.tenantId ?? null;
  } catch {
    return null;
  }
}

/**
 * Trang chọn ứng dụng của Master CEO. Portal `/` vào thẳng màn đó khi phiên còn
 * sống, nên không cần đường dẫn riêng.
 *
 * '' nếu chưa cấu hình identity — chỗ gọi tự quyết định ẩn lối vào.
 * `tenantId` = công ty đang làm việc, portal sẽ ghi nhớ làm công ty gần nhất.
 */
export function urlManChonUngDung(tenantId?: string | null): string {
  if (!IDENTITY_URL) return '';
  const goc = `${IDENTITY_URL.replace(/\/+$/, '')}/`;
  // Báo portal công ty đang làm việc: đổi công ty trong app này portal không hay
  // biết, thiếu `?tenant=` thì ra portal lại bị chọn sẵn công ty cũ.
  return tenantId ? `${goc}?tenant=${encodeURIComponent(tenantId)}` : goc;
}

/** identity SSO có được cấu hình không (dev để trống → fallback login cục bộ). */
export function isIdentityConfigured(): boolean {
  return !!IDENTITY_URL;
}

// Phải khớp appId đã đăng ký ở Identity portal (app "Tài chính").
const APP_ID = 'ke-toan';

/** appId của app hiện tại (Tài chính) — chuỗi 'ke-toan' là khoá SSO, KHÔNG đổi. */
export const CURRENT_APP_ID = APP_ID;
