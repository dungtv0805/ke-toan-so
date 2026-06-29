import { setAuthToken } from '@/services/base/service-base';

/**
 * SSO handoff từ MasterCeo Portal: nếu URL có ?tenant=<id>, đổi cookie phiên
 * (mc_session, gửi kèm qua credentials) lấy access-token ở identity rồi lưu vào
 * localStorage để luồng khôi phục phiên (AuthContext) chạy như đăng nhập thường.
 * Nuốt mọi lỗi — thất bại thì rơi về màn login của ke-toan-so.
 * Bỏ qua hoàn toàn khi VITE_IDENTITY_URL chưa được cấu hình.
 */
export async function ssoHandoff(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get('tenant');
  if (!tenantId) return;
  const identityUrl = import.meta.env.VITE_IDENTITY_URL as string | undefined;
  try {
    if (identityUrl) {
      const res = await fetch(`${identityUrl}/api/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        const accessToken = body?.data?.accessToken;
        if (accessToken) setAuthToken(accessToken);
      }
    }
  } catch {
    /* bỏ qua — rơi về login */
  } finally {
    // Dọn ?tenant khỏi URL (tránh refresh lại khi reload / lộ trên address bar)
    params.delete('tenant');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }
}
