# ke-toan-so FE — SSO hook (nhận token từ Portal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps dùng `- [ ]`.

**Goal:** Khi vào Kế toán FE từ Portal (URL có `?tenant=<id>`), tự gọi identity `/api/refresh` (cookie phiên) lấy access-token, lưu vào `auth_token`, rồi để luồng khôi phục phiên hiện có chạy → **không phải đăng nhập lại**.

**Architecture:** Thêm `ssoHandoff()` chạy ĐẦU TIÊN trong `AuthContext.initAuth`. Additive/non-breaking: không có `?tenant` hoặc refresh lỗi → rơi về luồng login cũ. Chỉ lưu access-token; `getMe()` của ke-toan-so tự nạp tenant/quyền (token Identity đã được BE chấp nhận — SP2).

**Tech Stack:** React + Vite + TS; test Vitest (đã có).

## Global Constraints
- Repo `ke-toan-so/fe`. Token key `auth_token` (`API_CONFIG.AUTH_TOKEN_KEY`), lưu qua `setAuthToken` (service-base).
- Identity URL từ `import.meta.env.VITE_IDENTITY_URL` (dev `http://localhost:3020`; prod set lúc deploy, vd `https://id.masterceo.com.vn`). Gọi `${VITE_IDENTITY_URL}/api/refresh` với `credentials:'include'`, body `{tenantId}`.
- Response identity: `{ success, data: { accessToken, tenant, user } }` → chỉ lấy `accessToken`.
- KHÔNG đổi hành vi khi không có `?tenant`. Refresh lỗi → KHÔNG lưu token, dọn URL, rơi về login.
- Sau xử lý: xoá `?tenant` khỏi URL bằng `history.replaceState` (tránh refresh lại khi reload / lộ trên thanh địa chỉ).
- Non-breaking: nếu `VITE_IDENTITY_URL` trống → bỏ qua handoff (không gọi).

## Files
- Create: `fe/src/services/ssoHandoff.ts`
- Test: `fe/src/services/ssoHandoff.test.ts`
- Modify: `fe/src/contexts/AuthContext.tsx` (gọi ssoHandoff đầu initAuth)
- Modify: `fe/.env.development` (+ VITE_IDENTITY_URL), `fe/.env.production` (+ VITE_IDENTITY_URL trống/placeholder)

---

## Task 1: ssoHandoff service + wire vào AuthContext

**Interfaces:**
- Produces: `ssoHandoff(): Promise<void>` — nếu URL có `?tenant`: gọi identity refresh, thành công thì `setAuthToken(accessToken)`; luôn dọn `?tenant` khỏi URL. Không ném lỗi ra ngoài (nuốt lỗi để initAuth tiếp tục).

- [ ] **Step 1: Test thất bại** — `fe/src/services/ssoHandoff.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// mock service-base setAuthToken
vi.mock('@/services/base/service-base', () => ({ setAuthToken: vi.fn() }));
import { setAuthToken } from '@/services/base/service-base';
import { ssoHandoff } from './ssoHandoff';

function setUrl(search: string) {
  window.history.replaceState({}, '', `/dashboard${search}`);
}
beforeEach(() => { vi.restoreAllMocks(); (setAuthToken as any).mockClear?.(); });
afterEach(() => setUrl(''));

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
    setUrl('?tenant=t1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    await ssoHandoff();
    expect(setAuthToken).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });
});
```

- [ ] **Step 2: Chạy → FAIL.** `cd fe && npm test -- ssoHandoff` → FAIL (module chưa có).

- [ ] **Step 3: `fe/src/services/ssoHandoff.ts`**
```ts
import { setAuthToken } from '@/services/base/service-base';

const IDENTITY_URL = import.meta.env.VITE_IDENTITY_URL as string | undefined;

/**
 * SSO handoff từ MasterCeo Portal: nếu URL có ?tenant=<id>, đổi cookie phiên
 * (mc_session, gửi kèm qua credentials) lấy access-token ở identity rồi lưu vào
 * localStorage để luồng khôi phục phiên (AuthContext) chạy như đăng nhập thường.
 * Nuốt mọi lỗi — thất bại thì rơi về màn login của ke-toan-so.
 */
export async function ssoHandoff(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get('tenant');
  if (!tenantId) return;

  try {
    if (IDENTITY_URL) {
      const res = await fetch(`${IDENTITY_URL}/api/refresh`, {
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
```

- [ ] **Step 4: Chạy → PASS.** `cd fe && npm test -- ssoHandoff` → PASS (3 test).

- [ ] **Step 5: Wire vào `AuthContext.tsx`** — thêm import + gọi đầu `initAuth`:
```ts
import { ssoHandoff } from '@/services/ssoHandoff';
```
Trong `initAuth` (đầu hàm, TRƯỚC `const token = getAuthToken();`):
```ts
    const initAuth = async () => {
      await ssoHandoff(); // SSO từ Portal: nếu có ?tenant, nạp token trước
      const token = getAuthToken();
      ...
```

- [ ] **Step 6: Env** — `fe/.env.development` thêm dòng:
```
VITE_IDENTITY_URL=http://localhost:3020
```
`fe/.env.production` thêm (placeholder, set lúc deploy):
```
VITE_IDENTITY_URL=
```

- [ ] **Step 7: Build + full test.** `cd fe && npm run build` → OK; `npm test` → tất cả PASS (không regression).

- [ ] **Step 8: Commit.**
```bash
cd /Users/os_anhvt/Documents/Dino/ke-toan-so
git add fe/src/services/ssoHandoff.ts fe/src/services/ssoHandoff.test.ts fe/src/contexts/AuthContext.tsx fe/.env.development fe/.env.production
git commit -m "feat(fe): SSO handoff — nhận token từ Portal qua ?tenant + /api/refresh (cookie)"
```

---

## Smoke (cần Mongo + migrate để e2e thật)
Sau migrate (user có ở cả masterceo_identity & digital_book cùng _id): login Portal → chọn Kế toán + công ty → redirect `…:8080?tenant=<id>` → ke-toan-so FE tự lấy token → vào thẳng, không login lại. Trước migrate: unit test xác nhận logic; e2e thật để cut-over.

## Self-Review
- Spec: nhận ?tenant + /api/refresh cookie → lưu token → luồng cũ chạy (Task 1). Non-breaking: no ?tenant → no-op; lỗi → login cũ. Dọn URL. Env identity.
- Placeholder: không. Type: `ssoHandoff(): Promise<void>` khớp gọi trong initAuth.
- Lưu ý: chỉ lưu accessToken (không set tenant từ identity — getMe ke-toan-so tự nạp, tránh thiếu role).

## Execution
subagent-driven-development. 1 task (TDD).
