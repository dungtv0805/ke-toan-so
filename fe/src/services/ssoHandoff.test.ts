// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// mock service-base setAuthToken
vi.mock('@/services/base/service-base', () => ({ setAuthToken: vi.fn() }));
import { setAuthToken } from '@/services/base/service-base';
import { ssoHandoff } from './ssoHandoff';

function setUrl(search: string) {
  window.history.replaceState({}, '', `/dashboard${search}`);
}
beforeEach(() => { vi.restoreAllMocks(); (setAuthToken as any).mockClear?.(); });
afterEach(() => { setUrl(''); vi.unstubAllEnvs(); });

describe('ssoHandoff', () => {
  it('không có ?tenant → không gọi fetch, không lưu token', async () => {
    setUrl('');
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await ssoHandoff();
    expect(f).not.toHaveBeenCalled();
    expect(setAuthToken).not.toHaveBeenCalled();
  });

  it('có ?tenant + refresh 200 → lưu token, gọi /api/refresh credentials, dọn URL', async () => {
    vi.stubEnv('VITE_IDENTITY_URL', 'http://localhost:3020');
    setUrl('?tenant=t1');
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { accessToken: 'AT' } }) });
    vi.stubGlobal('fetch', f);
    await ssoHandoff();
    const [url, opts] = f.mock.calls[0];
    expect(String(url)).toContain('/api/refresh');
    expect(opts.credentials).toBe('include');
    expect(JSON.parse(opts.body)).toEqual({ tenantId: 't1' });
    expect(setAuthToken).toHaveBeenCalledWith('AT');
    expect(window.location.search).toBe(''); // đã dọn ?tenant
  });

  it('có ?tenant + refresh lỗi → KHÔNG lưu token, vẫn dọn URL', async () => {
    vi.stubEnv('VITE_IDENTITY_URL', 'http://localhost:3020');
    setUrl('?tenant=t1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    await ssoHandoff();
    expect(setAuthToken).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('có ?tenant nhưng VITE_IDENTITY_URL chưa cấu hình → không gọi fetch, không lưu token, dọn URL', async () => {
    setUrl('?tenant=t1');
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await ssoHandoff();
    expect(f).not.toHaveBeenCalled();
    expect(setAuthToken).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });
});
