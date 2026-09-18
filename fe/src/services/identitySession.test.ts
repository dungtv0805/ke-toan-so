import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('identitySession', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('decodeTenantId', () => {
    it('lấy tenantId từ claim của token', async () => {
      const { decodeTenantId } = await import('./identitySession');
      const payload = btoa(JSON.stringify({ sub: 'u1', tenantId: 't-123' }));
      const token = `h.${payload}.s`;
      expect(decodeTenantId(token)).toBe('t-123');
    });
    it('token null / hỏng → null', async () => {
      const { decodeTenantId } = await import('./identitySession');
      expect(decodeTenantId(null)).toBeNull();
      expect(decodeTenantId('không-phải-jwt')).toBeNull();
    });
  });

  describe('isIdentityConfigured', () => {
    it('true khi VITE_IDENTITY_URL set', async () => {
      vi.stubEnv('VITE_IDENTITY_URL', 'https://id.example.com');
      const { isIdentityConfigured } = await import('./identitySession');
      expect(isIdentityConfigured()).toBe(true);
    });
    it('false khi rỗng', async () => {
      vi.stubEnv('VITE_IDENTITY_URL', '');
      const { isIdentityConfigured } = await import('./identitySession');
      expect(isIdentityConfigured()).toBe(false);
    });
  });

  describe('refreshFromIdentity', () => {
    it('trả accessToken khi phiên còn sống (fetch ok)', async () => {
      vi.stubEnv('VITE_IDENTITY_URL', 'https://id.example.com');
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { accessToken: 'fresh-token' } }),
      });
      vi.stubGlobal('fetch', fetchMock);
      const { refreshFromIdentity } = await import('./identitySession');
      const token = await refreshFromIdentity('t-1');
      expect(token).toBe('fresh-token');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://id.example.com/api/refresh',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });

    it('trả null khi phiên đã kết thúc (401)', async () => {
      vi.stubEnv('VITE_IDENTITY_URL', 'https://id.example.com');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
      const { refreshFromIdentity } = await import('./identitySession');
      expect(await refreshFromIdentity('t-1')).toBeNull();
    });

    it('trả null khi thiếu tenantId hoặc identity chưa cấu hình', async () => {
      vi.stubEnv('VITE_IDENTITY_URL', '');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const { refreshFromIdentity } = await import('./identitySession');
      expect(await refreshFromIdentity('t-1')).toBeNull(); // chưa cấu hình
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('urlManChonUngDung', () => {
    it('kèm ?tenant= công ty đang làm việc', async () => {
      vi.stubEnv('VITE_IDENTITY_URL', 'https://id.example.com/');
      const { urlManChonUngDung } = await import('./identitySession');
      expect(urlManChonUngDung('t 1')).toBe('https://id.example.com/?tenant=t%201');
    });
    it('không có công ty → chỉ trang chủ portal', async () => {
      vi.stubEnv('VITE_IDENTITY_URL', 'https://id.example.com');
      const { urlManChonUngDung } = await import('./identitySession');
      expect(urlManChonUngDung()).toBe('https://id.example.com/');
    });
    it('chưa cấu hình identity → rỗng', async () => {
      vi.stubEnv('VITE_IDENTITY_URL', '');
      const { urlManChonUngDung } = await import('./identitySession');
      expect(urlManChonUngDung('t1')).toBe('');
    });
  });
});
