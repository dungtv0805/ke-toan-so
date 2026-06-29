# MasterCeo Portal — Phần 2: Portal FE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dựng app FE độc lập **MasterCeo Portal**: đăng nhập 1 lần (qua identity, cookie phiên) → lưới **chọn App** (`/me/apps`) → **chọn Công ty** (`/me/tenants?app`) → **redirect** sang FE app kèm `?tenant=<id>`.

**Architecture:** Vite + React 18 + TypeScript, Ant Design (theme teal `#1f7769`) — không Tailwind/shadcn (portal chỉ 3 màn, giữ gọn). Không React Router — một state machine `step` ('login'|'apps'|'tenants'). Mọi gọi identity dùng `fetch(..., { credentials: 'include' })` để cookie `mc_session` đi kèm. Redirect tách ra hàm tiêm được để test. Test: Vitest + Testing Library (mock `fetch`).

**Tech Stack:** Vite 5, React 18, TypeScript 5, antd 5, Vitest, @testing-library/react, jsdom.

## Global Constraints

- Repo MỚI: `/Users/os_anhvt/Documents/Dino/masterceo-portal` (repo git riêng, như identity-service). Dev port **5174** (tránh 8080 của ke-toan-so, 3020 identity).
- Backend = identity-service; base URL từ `import.meta.env.VITE_IDENTITY_URL` (dev `http://localhost:3020`). MỌI fetch `credentials: 'include'`.
- Endpoints identity dùng: `POST /login {email,password}`, `GET /me/apps`, `GET /me/tenants?app=<appId>`, `POST /logout`. Response bọc `{ success, data }`.
  - `/me/apps` data: `AppInfo[] = { appId, name, description?, iconUrl?, feUrl }`.
  - `/me/tenants` data: `TenantInfo[] = { tenantId, tenantName, tenantSlug, modules, glossary, nganh, apps }`.
- Luồng: chọn app → chọn công ty → `redirect` tới `<app.feUrl>?tenant=<tenantId>`.
- 401 từ `/me/apps` → hiển thị màn Login. Có nút Đăng xuất (`POST /logout`).
- UI theme: Ant Design `ConfigProvider` token `colorPrimary: '#1f7769'`, `borderRadius: 0` (đồng bộ ke-toan-so).
- KHÔNG hardcode app URL — luôn từ `app.feUrl` trả về.
- Redirect phải tách thành hàm riêng (`src/lib/redirect.ts`) để test spy được (không điều hướng thật trong test).

## File Structure (trong masterceo-portal)

```
masterceo-portal/
├── package.json, tsconfig*.json, vite.config.ts, index.html, .gitignore, README.md
├── .env.development            # VITE_IDENTITY_URL=http://localhost:3020
├── vitest.config.ts, src/test/setup.ts
├── src/
│   ├── main.tsx                # ReactDOM + ConfigProvider theme
│   ├── App.tsx                 # state machine step + điều phối màn
│   ├── lib/
│   │   ├── api.ts              # fetch wrapper credentials + login/getApps/getTenants/logout
│   │   ├── api.test.ts
│   │   └── redirect.ts         # redirectToApp(feUrl, tenantId)
│   ├── types.ts                # AppInfo, TenantInfo
│   └── screens/
│       ├── LoginScreen.tsx + LoginScreen.test.tsx
│       ├── AppPicker.tsx + AppPicker.test.tsx
│       └── TenantPicker.tsx + TenantPicker.test.tsx
```

---

## Task 1: Scaffold portal (Vite + React + TS + AntD + Vitest)

**Files:** tạo toàn bộ khung dưới `/Users/os_anhvt/Documents/Dino/masterceo-portal`.

**Interfaces:** Produces: app Vite boot port 5174; `npm run build` PASS; `npm test` chạy (0 test ban đầu OK); `ConfigProvider` theme teal ở `main.tsx`.

- [ ] **Step 1: Scaffold non-interactive**
```bash
cd /Users/os_anhvt/Documents/Dino && npm create vite@latest masterceo-portal -- --template react-ts
cd masterceo-portal && npm install && npm install antd && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

- [ ] **Step 2: `vite.config.ts`** — set port 5174:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, host: true },
});
```

- [ ] **Step 3: `vitest.config.ts` + `src/test/setup.ts`**
`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
});
```
`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
```
Thêm vào `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: `.env.development`**
```
VITE_IDENTITY_URL=http://localhost:3020
```

- [ ] **Step 5: `src/main.tsx`** — ConfigProvider theme + render App:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import 'antd/dist/reset.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: '#1f7769', borderRadius: 0 } }}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 6: `src/App.tsx`** (tạm để build) :
```tsx
export default function App() {
  return <div>MasterCeo Portal</div>;
}
```
Xoá file mẫu thừa (`src/App.css`, `src/index.css` import trong main mẫu) nếu gây lỗi — đảm bảo `main.tsx` không import file không tồn tại.

- [ ] **Step 7: Build + test khung**
```bash
cd /Users/os_anhvt/Documents/Dino/masterceo-portal && npm run build && npm test
```
Expected: build PASS; `npm test` chạy (no tests = exit 0).

- [ ] **Step 8: git init + commit**
```bash
cd /Users/os_anhvt/Documents/Dino/masterceo-portal && git init -q && printf "node_modules\ndist\n*.log\n.env\n" > .gitignore && git add -A && git commit -m "chore(portal): scaffold Vite+React+TS+AntD+Vitest (port 5174)"
```

---

## Task 2: Types + API client (fetch credentials)

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/api.ts`
- Create: `src/lib/redirect.ts`
- Test: `src/lib/api.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `AppInfo { appId, name, description?, iconUrl?, feUrl }`; `TenantInfo { tenantId, tenantName, tenantSlug, modules: string[], nganh: string|null, apps: string[] }`.
  - `api.ts`: `login(email,password): Promise<void>` (throws on fail), `getApps(): Promise<AppInfo[]>`, `getTenants(appId): Promise<TenantInfo[]>`, `logout(): Promise<void>`; tất cả `credentials:'include'`; ném `ApiError{status}` khi !ok.
  - `redirect.ts`: `redirectToApp(feUrl, tenantId): void` (mặc định set `window.location.href`).

- [ ] **Step 1: `types.ts`**
```ts
export interface AppInfo { appId: string; name: string; description?: string; iconUrl?: string; feUrl: string; }
export interface TenantInfo { tenantId: string; tenantName: string; tenantSlug: string; modules: string[]; nganh: string | null; apps: string[]; }
```

- [ ] **Step 2: Viết test thất bại** — `src/lib/api.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, getApps, getTenants, ApiError } from './api';

const BASE = 'http://localhost:3020';
beforeEach(() => { vi.restoreAllMocks(); (import.meta as any).env = { VITE_IDENTITY_URL: BASE }; });

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('api', () => {
  it('login gọi POST /login credentials include', async () => {
    const f = mockFetch(200, { success: true, data: { user: { id: 'u1' } } });
    vi.stubGlobal('fetch', f);
    await login('a@b.com', '123456');
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe(`${BASE}/login`);
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('include');
  });

  it('login sai → ApiError với status', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { success: false }));
    await expect(login('a@b.com', 'x')).rejects.toMatchObject({ status: 401 });
  });

  it('getApps trả data, credentials include', async () => {
    const f = mockFetch(200, { success: true, data: [{ appId: 'ke-toan', name: 'Kế toán', feUrl: 'http://localhost:8080' }] });
    vi.stubGlobal('fetch', f);
    const apps = await getApps();
    expect(apps[0].appId).toBe('ke-toan');
    expect(f.mock.calls[0][1].credentials).toBe('include');
  });

  it('getTenants?app=... truyền query', async () => {
    const f = mockFetch(200, { success: true, data: [] });
    vi.stubGlobal('fetch', f);
    await getTenants('ke-toan');
    expect(f.mock.calls[0][0]).toBe(`${BASE}/me/tenants?app=ke-toan`);
  });
});
```

- [ ] **Step 3: Chạy → FAIL.** `cd /Users/os_anhvt/Documents/Dino/masterceo-portal && npm test -- api.test` → FAIL (module chưa có).

- [ ] **Step 4: `src/lib/api.ts`**
```ts
import type { AppInfo, TenantInfo } from '../types';

const BASE = () => (import.meta as any).env.VITE_IDENTITY_URL as string;

export class ApiError extends Error { constructor(public status: number, msg?: string) { super(msg); } }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (body as any)?.message);
  return (body as any).data as T;
}

export async function login(email: string, password: string): Promise<void> {
  await call('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export function getApps(): Promise<AppInfo[]> { return call<AppInfo[]>('/me/apps'); }
export function getTenants(appId: string): Promise<TenantInfo[]> {
  return call<TenantInfo[]>(`/me/tenants?app=${encodeURIComponent(appId)}`);
}
export async function logout(): Promise<void> { await call('/logout', { method: 'POST' }); }
```

- [ ] **Step 5: `src/lib/redirect.ts`**
```ts
export function redirectToApp(feUrl: string, tenantId: string): void {
  const sep = feUrl.includes('?') ? '&' : '?';
  window.location.href = `${feUrl}${sep}tenant=${encodeURIComponent(tenantId)}`;
}
```

- [ ] **Step 6: Chạy → PASS.** `npm test -- api.test` → PASS (4 test).

- [ ] **Step 7: Commit.** `git add -A && git commit -m "feat(portal): types + API client (fetch credentials) + redirect helper"`

---

## Task 3: Auth shell + LoginScreen

**Files:**
- Create: `src/screens/LoginScreen.tsx`
- Test: `src/screens/LoginScreen.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `login`, `getApps` (Task 2).
- Produces:
  - `LoginScreen` props `{ onLoggedIn: () => void }` — form email/pw, gọi `login()` → `onLoggedIn()`; hiện lỗi khi sai.
  - `App` state machine: mount → thử `getApps()`; 200 → step `'apps'`; lỗi 401 → step `'login'`. (AppPicker/TenantPicker nối ở Task 4 — tạm render placeholder cho 'apps'.)

- [ ] **Step 1: Test LoginScreen thất bại** — `src/screens/LoginScreen.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from './LoginScreen';
import * as api from '../lib/api';

describe('LoginScreen', () => {
  it('submit gọi login rồi onLoggedIn', async () => {
    vi.spyOn(api, 'login').mockResolvedValue();
    const onLoggedIn = vi.fn();
    render(<LoginScreen onLoggedIn={onLoggedIn} />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/mật khẩu/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));
    expect(api.login).toHaveBeenCalledWith('a@b.com', '123456');
    await vi.waitFor(() => expect(onLoggedIn).toHaveBeenCalled());
  });

  it('login lỗi → hiện thông báo, không onLoggedIn', async () => {
    vi.spyOn(api, 'login').mockRejectedValue(new api.ApiError(401));
    const onLoggedIn = vi.fn();
    render(<LoginScreen onLoggedIn={onLoggedIn} />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/mật khẩu/i), 'x');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));
    await vi.waitFor(() => expect(screen.getByText(/đăng nhập không thành công/i)).toBeInTheDocument());
    expect(onLoggedIn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy → FAIL.** `npm test -- LoginScreen` → FAIL.

- [ ] **Step 3: `src/screens/LoginScreen.tsx`**
```tsx
import { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography } from 'antd';
import { login } from '../lib/api';

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true); setError(null);
    try { await login(values.email, values.password); onLoggedIn(); }
    catch { setError('Đăng nhập không thành công. Kiểm tra email/mật khẩu.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', color: '#1f7769' }}>MasterCeo</Typography.Title>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>Đăng nhập</Button>
        </Form>
      </Card>
    </div>
  );
}
```
> AntD `Form.Item label="Email"` liên kết label với input → `getByLabelText(/email/i)` hoạt động.

- [ ] **Step 4: `src/App.tsx`** — state machine (placeholder cho 'apps' tới Task 4):
```tsx
import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import LoginScreen from './screens/LoginScreen';
import { getApps } from './lib/api';

type Step = 'loading' | 'login' | 'apps';

export default function App() {
  const [step, setStep] = useState<Step>('loading');

  async function probe() {
    try { await getApps(); setStep('apps'); }
    catch { setStep('login'); }
  }
  useEffect(() => { probe(); }, []);

  if (step === 'loading') return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  if (step === 'login') return <LoginScreen onLoggedIn={() => setStep('apps')} />;
  return <div>TODO apps</div>;
}
```

- [ ] **Step 5: Chạy → PASS.** `npm test -- LoginScreen` → PASS. `npm run build` → no TS errors.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(portal): App state machine + LoginScreen (probe /me/apps → login/apps)"`

---

## Task 4: AppPicker + TenantPicker + redirect + wire flow

**Files:**
- Create: `src/screens/AppPicker.tsx` + `src/screens/AppPicker.test.tsx`
- Create: `src/screens/TenantPicker.tsx` + `src/screens/TenantPicker.test.tsx`
- Modify: `src/App.tsx`
- Create: `README.md`

**Interfaces:**
- Consumes: `getApps`, `getTenants`, `logout` (Task 2), `redirectToApp` (Task 2), `AppInfo`/`TenantInfo`.
- Produces:
  - `AppPicker` props `{ onPick: (app: AppInfo) => void; onLogout: () => void }` — `getApps()` → lưới card; click → `onPick(app)`.
  - `TenantPicker` props `{ app: AppInfo; onBack: () => void }` — `getTenants(app.appId)` → danh sách (search); click → `redirectToApp(app.feUrl, tenant.tenantId)`.
  - `App`: nối step 'apps' → AppPicker; chọn app → step 'tenants' (giữ selectedApp); logout → step 'login'.

- [ ] **Step 1: Test AppPicker + TenantPicker thất bại**
`src/screens/AppPicker.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppPicker from './AppPicker';
import * as api from '../lib/api';

describe('AppPicker', () => {
  it('hiển thị app từ getApps, click → onPick', async () => {
    vi.spyOn(api, 'getApps').mockResolvedValue([{ appId: 'ke-toan', name: 'Kế toán', feUrl: 'http://localhost:8080' }]);
    const onPick = vi.fn();
    render(<AppPicker onPick={onPick} onLogout={() => {}} />);
    const card = await screen.findByText('Kế toán');
    await userEvent.click(card);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ appId: 'ke-toan' }));
  });
});
```
`src/screens/TenantPicker.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TenantPicker from './TenantPicker';
import * as api from '../lib/api';
import * as redir from '../lib/redirect';

const app = { appId: 'ke-toan', name: 'Kế toán', feUrl: 'http://localhost:8080' };

describe('TenantPicker', () => {
  it('chọn công ty → redirectToApp(feUrl, tenantId)', async () => {
    vi.spyOn(api, 'getTenants').mockResolvedValue([
      { tenantId: 't1', tenantName: 'Công ty A', tenantSlug: 'a', modules: [], nganh: null, apps: ['ke-toan'] },
    ]);
    const spy = vi.spyOn(redir, 'redirectToApp').mockImplementation(() => {});
    render(<TenantPicker app={app as any} onBack={() => {}} />);
    const row = await screen.findByText('Công ty A');
    await userEvent.click(row);
    expect(spy).toHaveBeenCalledWith('http://localhost:8080', 't1');
  });
});
```

- [ ] **Step 2: Chạy → FAIL.** `npm test -- AppPicker TenantPicker` → FAIL.

- [ ] **Step 3: `src/screens/AppPicker.tsx`**
```tsx
import { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Spin, Empty, Typography } from 'antd';
import { getApps } from '../lib/api';
import type { AppInfo } from '../types';

export default function AppPicker({ onPick, onLogout }: { onPick: (a: AppInfo) => void; onLogout: () => void }) {
  const [apps, setApps] = useState<AppInfo[] | null>(null);
  useEffect(() => { getApps().then(setApps).catch(() => setApps([])); }, []);
  return (
    <div style={{ maxWidth: 880, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0, color: '#1f7769' }}>Chọn ứng dụng</Typography.Title>
        <Button onClick={onLogout}>Đăng xuất</Button>
      </div>
      {apps === null ? <Spin /> : apps.length === 0 ? <Empty description="Chưa có ứng dụng" /> : (
        <Row gutter={[16, 16]}>
          {apps.map((a) => (
            <Col key={a.appId} xs={24} sm={12} md={8}>
              <Card hoverable onClick={() => onPick(a)}>
                <Card.Meta title={a.name} description={a.description || a.appId} />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `src/screens/TenantPicker.tsx`**
```tsx
import { useEffect, useMemo, useState } from 'react';
import { Card, Input, List, Button, Spin, Typography } from 'antd';
import { getTenants } from '../lib/api';
import { redirectToApp } from '../lib/redirect';
import type { AppInfo, TenantInfo } from '../types';

export default function TenantPicker({ app, onBack }: { app: AppInfo; onBack: () => void }) {
  const [tenants, setTenants] = useState<TenantInfo[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { getTenants(app.appId).then(setTenants).catch(() => setTenants([])); }, [app.appId]);
  const filtered = useMemo(
    () => (tenants || []).filter((t) => t.tenantName.toLowerCase().includes(q.toLowerCase())),
    [tenants, q],
  );
  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0, color: '#1f7769' }}>Chọn công ty — {app.name}</Typography.Title>
        <Button onClick={onBack}>Quay lại</Button>
      </div>
      <Input.Search placeholder="Tìm công ty" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 16 }} />
      {tenants === null ? <Spin /> : (
        <Card>
          <List
            dataSource={filtered}
            renderItem={(t) => (
              <List.Item onClick={() => redirectToApp(app.feUrl, t.tenantId)} style={{ cursor: 'pointer' }}>
                {t.tenantName}
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `src/App.tsx`** — nối đủ flow:
```tsx
import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import LoginScreen from './screens/LoginScreen';
import AppPicker from './screens/AppPicker';
import TenantPicker from './screens/TenantPicker';
import { getApps, logout } from './lib/api';
import type { AppInfo } from './types';

type Step = 'loading' | 'login' | 'apps' | 'tenants';

export default function App() {
  const [step, setStep] = useState<Step>('loading');
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);

  useEffect(() => { getApps().then(() => setStep('apps')).catch(() => setStep('login')); }, []);

  async function onLogout() { try { await logout(); } finally { setSelectedApp(null); setStep('login'); } }

  if (step === 'loading') return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  if (step === 'login') return <LoginScreen onLoggedIn={() => setStep('apps')} />;
  if (step === 'apps') return <AppPicker onPick={(a) => { setSelectedApp(a); setStep('tenants'); }} onLogout={onLogout} />;
  return <TenantPicker app={selectedApp!} onBack={() => setStep('apps')} />;
}
```

- [ ] **Step 6: Chạy test + build.** `npm test` (tất cả) → PASS; `npm run build` → no TS errors.

- [ ] **Step 7: `README.md`** — cách chạy (npm run dev → 5174; cần identity 3020 + seed:dev; luồng login→app→tenant→redirect), env `VITE_IDENTITY_URL`, lưu ý cookie dev localhost.

- [ ] **Step 8: Commit + push**
```bash
cd /Users/os_anhvt/Documents/Dino/masterceo-portal && git add -A && git commit -m "feat(portal): AppPicker + TenantPicker + wire flow login→app→tenant→redirect" 
# tạo repo GitHub + push do user thực hiện (như identity-service)
```

---

## Smoke thủ công (sau khi code xong — cần Mongo)
1. Bật Mongo (Docker/local), chạy `identity-service`: `npm run start:dev` (3020) + `npm run seed:dev`.
2. Chạy portal: `npm run dev` (5174).
3. Mở `http://localhost:5174` → login `single@test.com`/`123456` → thấy app "Kế toán" → chọn → thấy "Công ty A" → chọn → trình duyệt điều hướng tới `http://localhost:8080?tenant=<id>` (Kế toán FE — hiện vẫn màn login riêng, hook nhận token là đợt sau).
4. Kiểm cookie `mc_session` set trên `localhost` (DevTools → Application → Cookies).

## Self-Review
**Spec coverage (spec §5):** §5 màn Login/AppPicker/TenantPicker → Task 3,4; redirect `feUrl?tenant=` → Task 2 redirect + Task 4; `credentials:'include'` + `VITE_IDENTITY_URL` → Task 2; 401 → Login → Task 3 App probe; logout → Task 4; theme teal → Task 1; §5.1 test mock fetch → Task 2,3,4. §6 smoke/seed → mục Smoke (seed:dev đã có ở Phần 1).
**Placeholder scan:** không TBD; mọi step có code/lệnh. Task 1 Step 6 lưu ý xoá import file mẫu thừa.
**Type consistency:** `AppInfo`/`TenantInfo` (Task 2) dùng nhất quán ở api + screens (Task 3,4); `redirectToApp(feUrl,tenantId)` (Task 2) khớp test + TenantPicker; props `onPick/onLogout/onBack/app/onLoggedIn` khớp giữa App và screens.

## Execution
superpowers:subagent-driven-development. 4 task tuần tự (1→2→3→4).
