# MasterCeo Portal — Phần 2: Portal FE (GỘP vào identity-service) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **REVISED:** Portal FE sống trong `identity-service/portal/` (KHÔNG repo riêng); identity-service **serve static** portal/dist và đặt **global prefix `/api`** cho API → Portal cùng origin với identity → **không cần CORS cho Portal**. Dev: Vite proxy `/api` → identity:3020.

**Goal:** Portal MasterCeo: login 1 lần (cookie phiên) → lưới **chọn App** → **chọn Công ty** → **redirect** sang FE app kèm `?tenant=<id>`. Portal nằm trong identity-service, dùng path API tương đối `/api/*`.

**Architecture:** Vite + React + TS + Ant Design (theme teal `#1f7769`) tại `identity-service/portal/`. State machine `step` ('login'|'apps'|'tenants'), không React Router. fetch `credentials:'include'`, base **tương đối `/api`**. Dev: Vite proxy `/api`→`http://localhost:3020`. Prod: identity `ServeStaticModule` phục vụ `portal/dist`, API dưới `/api`. Test: Vitest + Testing Library (mock fetch).

**Tech Stack:** identity-service NestJS (+ @nestjs/serve-static); portal: Vite + React 19 + antd 6 + Vitest (đã scaffold).

## Global Constraints

- Portal ở `/Users/os_anhvt/Documents/Dino/identity-service/portal/` (đã scaffold, port dev 5174). API identity chuyển sang **global prefix `/api`**.
- Portal gọi API bằng **đường dẫn tương đối `/api/...`** (KHÔNG dùng host tuyệt đối) → cùng origin (prod identity serve; dev Vite proxy). MỌI fetch `credentials:'include'`.
- Endpoints (sau prefix): `POST /api/login`, `GET /api/me/apps`, `GET /api/me/tenants?app=`, `POST /api/logout`. Response `{success,data}`.
- identity `ServeStaticModule` phục vụ `portal/dist`, **exclude `/api{*path}`** (API không bị static che).
- Redirect tách hàm `src/lib/redirect.ts` (test spy được).
- CORS giữ nguyên cho app khác (ke-toan-so subdomain gọi `/api/refresh`) — Portal thì khỏi cần vì cùng origin.
- Theme AntD teal `#1f7769`, borderRadius 0.

## File Structure
```
identity-service/
├── src/main.ts                 # + setGlobalPrefix('api')
├── src/app.module.ts           # + ServeStaticModule(portal/dist, exclude /api*)
├── test/*.e2e-spec.ts          # SỬA: mọi path → /api/...
├── package.json                # + build:portal script; dep @nestjs/serve-static
└── portal/                     # (đã scaffold, đã dời)
    ├── vite.config.ts          # + server.proxy /api → :3020
    ├── src/types.ts            # AppInfo, TenantInfo
    ├── src/lib/{api.ts,api.test.ts,redirect.ts}
    ├── src/App.tsx             # state machine
    └── src/screens/{LoginScreen,AppPicker,TenantPicker}{.tsx,.test.tsx}
```

---

## Task 1: (ĐÃ XONG) Scaffold + dời vào identity-service/portal
Scaffold Vite+React+antd+Vitest (port 5174) đã tạo và **đã dời** vào `identity-service/portal/`, build OK (commit identity `bacdd11`). Không cần làm lại. (Ghi để đủ mạch.)

---

## Task 2: Identity — global prefix /api + serve portal static

**Files (identity-service):**
- Modify: `src/main.ts`
- Modify: `src/app.module.ts`
- Modify: `test/auth.e2e-spec.ts`, `test/session.e2e-spec.ts`, `test/platform.e2e-spec.ts`
- Modify: `package.json`

**Interfaces:** Produces: API phục vụ dưới `/api/*`; identity phục vụ `portal/dist` ở `/` (trừ `/api*`). e2e cập nhật path.

- [ ] **Step 1: Cài dep.** `cd /Users/os_anhvt/Documents/Dino/identity-service && npm install @nestjs/serve-static`

- [ ] **Step 2: `main.ts`** — thêm prefix TRƯỚC `await app.listen` (sau ValidationPipe/cors/cookieParser):
```ts
app.setGlobalPrefix('api');
```

- [ ] **Step 3: `app.module.ts`** — thêm ServeStaticModule:
```ts
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
// trong imports[]:
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', 'portal', 'dist'),
  exclude: ['/api{*path}'],
}),
```
(Giữ các module hiện có: DatabaseModule, AuthModule, PlatformModule.)

- [ ] **Step 4: Cập nhật e2e** — trong cả 3 file `test/*.e2e-spec.ts`, **mọi** request path thêm tiền tố `/api`: phải gọi `app.setGlobalPrefix('api')` trên app test trước `init()` (để khớp prod), và đổi `'/login'`→`'/api/login'`, `'/me/apps'`→`'/api/me/apps'`, `'/me/tenants?...'`→`'/api/me/tenants?...'`, `'/refresh'`→`'/api/refresh'`, `'/logout'`→`'/api/logout'`, `'/select-tenant'`→`'/api/select-tenant'`, v.v.
  Trong `beforeAll` mỗi e2e, sau `createNestApplication()` thêm: `app.setGlobalPrefix('api');` (trước `app.init()`), giữ `app.use(cookieParser())` (session e2e).

- [ ] **Step 5: `package.json` script** — thêm: `"build:portal": "cd portal && npm install && npm run build"`.

- [ ] **Step 6: Chạy.** `npm run build` (BE) OK; `npm run test:e2e` → tất cả PASS với path `/api/*`; `npm test` (unit) PASS.
  (ServeStaticModule trỏ portal/dist có thể chưa tồn tại lúc test — không crash, chỉ 404 static; API vẫn chạy. Nếu test fail do thiếu dist, chạy `npm run build:portal` trước.)

- [ ] **Step 7: Commit + push.** `git add -A && git commit -m "feat(identity): global prefix /api + serve portal static (ServeStaticModule)" && git push`

---

## Task 3: Portal — Vite proxy + API client + types + redirect

**Files (identity-service/portal):**
- Modify: `vite.config.ts`
- Create: `src/types.ts`, `src/lib/api.ts`, `src/lib/redirect.ts`
- Test: `src/lib/api.test.ts`
- Remove: `src/smoke.test.ts` (thay bằng api.test)

**Interfaces:** Produces: `AppInfo`/`TenantInfo`; `login/getApps/getTenants/logout` (base `/api`, credentials include, unwrap data, `ApiError{status}`); `redirectToApp(feUrl,tenantId)`.

- [ ] **Step 1: `vite.config.ts`** — thêm proxy:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: { '/api': { target: 'http://localhost:3020', changeOrigin: true } },
  },
});
```

- [ ] **Step 2: `src/types.ts`**
```ts
export interface AppInfo { appId: string; name: string; description?: string; iconUrl?: string; feUrl: string; }
export interface TenantInfo { tenantId: string; tenantName: string; tenantSlug: string; modules: string[]; nganh: string | null; apps: string[]; }
```

- [ ] **Step 3: Test thất bại** — `src/lib/api.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, getApps, getTenants, ApiError } from './api';

beforeEach(() => vi.restoreAllMocks());
function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}
describe('api', () => {
  it('login POST /api/login credentials include', async () => {
    const f = mockFetch(200, { success: true, data: {} }); vi.stubGlobal('fetch', f);
    await login('a@b.com', '123456');
    expect(f.mock.calls[0][0]).toBe('/api/login');
    expect(f.mock.calls[0][1].method).toBe('POST');
    expect(f.mock.calls[0][1].credentials).toBe('include');
  });
  it('login lỗi → ApiError status', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { success: false }));
    await expect(login('a@b.com', 'x')).rejects.toMatchObject({ status: 401 });
  });
  it('getApps → /api/me/apps, trả data', async () => {
    const f = mockFetch(200, { success: true, data: [{ appId: 'ke-toan', name: 'Kế toán', feUrl: 'http://localhost:8080' }] });
    vi.stubGlobal('fetch', f);
    const apps = await getApps();
    expect(f.mock.calls[0][0]).toBe('/api/me/apps');
    expect(apps[0].appId).toBe('ke-toan');
  });
  it('getTenants → /api/me/tenants?app=', async () => {
    const f = mockFetch(200, { success: true, data: [] }); vi.stubGlobal('fetch', f);
    await getTenants('ke-toan');
    expect(f.mock.calls[0][0]).toBe('/api/me/tenants?app=ke-toan');
  });
});
```

- [ ] **Step 4: Chạy → FAIL.** `cd /Users/os_anhvt/Documents/Dino/identity-service/portal && npm test -- api.test` → FAIL.

- [ ] **Step 5: `src/lib/api.ts`** (base tương đối `/api`):
```ts
import type { AppInfo, TenantInfo } from '../types';

const BASE = '/api';
export class ApiError extends Error { constructor(public status: number, msg?: string) { super(msg); } }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
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

- [ ] **Step 6: `src/lib/redirect.ts`**
```ts
export function redirectToApp(feUrl: string, tenantId: string): void {
  const sep = feUrl.includes('?') ? '&' : '?';
  window.location.href = `${feUrl}${sep}tenant=${encodeURIComponent(tenantId)}`;
}
```

- [ ] **Step 7: Xoá `src/smoke.test.ts`.** Chạy `npm test -- api.test` → PASS (4). `npm run build` → OK.

- [ ] **Step 8: Commit.** `git -C /Users/os_anhvt/Documents/Dino/identity-service add -A && git -C /Users/os_anhvt/Documents/Dino/identity-service commit -m "feat(portal): API client (relative /api, credentials) + types + redirect + Vite proxy"`

---

## Task 4: Portal — App shell + LoginScreen

**Files (identity-service/portal):** `src/screens/LoginScreen.tsx` + test; `src/App.tsx`.

**Interfaces:** `LoginScreen{onLoggedIn}`; `App` probe `getApps()` → 'apps' | 'login'.

- [ ] **Step 1: Test LoginScreen thất bại** — `src/screens/LoginScreen.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from './LoginScreen';
import * as api from '../lib/api';

describe('LoginScreen', () => {
  it('submit → login rồi onLoggedIn', async () => {
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
    await vi.waitFor(() => expect(screen.getByText(/không thành công/i)).toBeInTheDocument());
    expect(onLoggedIn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy → FAIL.** `npm test -- LoginScreen` → FAIL.

- [ ] **Step 3: `src/screens/LoginScreen.tsx`** (AntD; label liên kết để getByLabelText chạy):
```tsx
import { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography } from 'antd';
import { login } from '../lib/api';

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onFinish(v: { email: string; password: string }) {
    setLoading(true); setError(null);
    try { await login(v.email, v.password); onLoggedIn(); }
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

- [ ] **Step 4: `src/App.tsx`** (probe; placeholder 'apps' tới Task 5):
```tsx
import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import LoginScreen from './screens/LoginScreen';
import { getApps } from './lib/api';

type Step = 'loading' | 'login' | 'apps';
export default function App() {
  const [step, setStep] = useState<Step>('loading');
  useEffect(() => { getApps().then(() => setStep('apps')).catch(() => setStep('login')); }, []);
  if (step === 'loading') return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  if (step === 'login') return <LoginScreen onLoggedIn={() => setStep('apps')} />;
  return <div>TODO apps</div>;
}
```

- [ ] **Step 5: Chạy → PASS + build.** `npm test -- LoginScreen` PASS; `npm run build` OK.

- [ ] **Step 6: Commit.** `git -C /Users/os_anhvt/Documents/Dino/identity-service add -A && git -C /Users/os_anhvt/Documents/Dino/identity-service commit -m "feat(portal): App state machine + LoginScreen"`

---

## Task 5: Portal — AppPicker + TenantPicker + wire + README + push

**Files (identity-service/portal):** `src/screens/AppPicker.tsx`+test; `src/screens/TenantPicker.tsx`+test; `src/App.tsx`; `portal/README.md`.

**Interfaces:** `AppPicker{onPick,onLogout}`; `TenantPicker{app,onBack}`; App nối 'apps'→'tenants'→redirect.

- [ ] **Step 1: Test thất bại** — `AppPicker.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppPicker from './AppPicker';
import * as api from '../lib/api';
describe('AppPicker', () => {
  it('hiển thị app, click → onPick', async () => {
    vi.spyOn(api, 'getApps').mockResolvedValue([{ appId: 'ke-toan', name: 'Kế toán', feUrl: 'http://localhost:8080' }]);
    const onPick = vi.fn();
    render(<AppPicker onPick={onPick} onLogout={() => {}} />);
    await userEvent.click(await screen.findByText('Kế toán'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ appId: 'ke-toan' }));
  });
});
```
`TenantPicker.test.tsx`:
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
    vi.spyOn(api, 'getTenants').mockResolvedValue([{ tenantId: 't1', tenantName: 'Công ty A', tenantSlug: 'a', modules: [], nganh: null, apps: ['ke-toan'] }]);
    const spy = vi.spyOn(redir, 'redirectToApp').mockImplementation(() => {});
    render(<TenantPicker app={app as any} onBack={() => {}} />);
    await userEvent.click(await screen.findByText('Công ty A'));
    expect(spy).toHaveBeenCalledWith('http://localhost:8080', 't1');
  });
});
```

- [ ] **Step 2: Chạy → FAIL.** `npm test -- AppPicker TenantPicker` → FAIL.

- [ ] **Step 3: `AppPicker.tsx`**
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
              <Card hoverable onClick={() => onPick(a)}><Card.Meta title={a.name} description={a.description || a.appId} /></Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `TenantPicker.tsx`**
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
  const filtered = useMemo(() => (tenants || []).filter((t) => t.tenantName.toLowerCase().includes(q.toLowerCase())), [tenants, q]);
  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0, color: '#1f7769' }}>Chọn công ty — {app.name}</Typography.Title>
        <Button onClick={onBack}>Quay lại</Button>
      </div>
      <Input.Search placeholder="Tìm công ty" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 16 }} />
      {tenants === null ? <Spin /> : (
        <Card>
          <List dataSource={filtered} renderItem={(t) => (
            <List.Item onClick={() => redirectToApp(app.feUrl, t.tenantId)} style={{ cursor: 'pointer' }}>{t.tenantName}</List.Item>
          )} />
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `src/App.tsx`** — nối đủ:
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

- [ ] **Step 6: Test all + build.** `npm test` PASS; `npm run build` OK.

- [ ] **Step 7: `portal/README.md`** — cách chạy dev (identity 3020 + seed:dev; portal `npm run dev` 5174, Vite proxy /api→3020; prod: `npm run build:portal` rồi identity serve). Luồng login→app→tenant→redirect; cookie cùng origin.

- [ ] **Step 8: Commit + push.** `git -C /Users/os_anhvt/Documents/Dino/identity-service add -A && git -C /Users/os_anhvt/Documents/Dino/identity-service commit -m "feat(portal): AppPicker + TenantPicker + wire flow + README" && git -C /Users/os_anhvt/Documents/Dino/identity-service push`

---

## Smoke thủ công (cần Mongo)
1. Mongo on; identity: `npm run start:dev` (3020) + `npm run seed:dev`.
2. portal: `cd portal && npm run dev` (5174).
3. `http://localhost:5174` → login `single@test.com`/`123456` → app "Kế toán" → "Công ty A" → redirect `http://localhost:8080?tenant=<id>`. Kiểm cookie `mc_session` (cùng origin, không CORS).

## Self-Review
**Spec coverage:** Portal 3 màn + redirect + credentials + 401→login + logout + theme → Task 3-5; serve static + cùng origin (bỏ CORS portal) qua prefix /api + ServeStaticModule → Task 2; test mock fetch → Task 3-5. Gộp vào identity-service (quyết định mới) → Task 1 (đã dời) + Task 2.
**Placeholder scan:** không TBD; mọi step có code/lệnh.
**Type consistency:** AppInfo/TenantInfo (T3) dùng nhất quán screens (T4,5); redirectToApp(feUrl,tenantId) khớp; props onPick/onLogout/onBack/app/onLoggedIn khớp App↔screens. API base `/api` nhất quán với prefix identity (T2) + proxy dev (T3).
**Lưu ý:** Task 2 sửa e2e Phần 1 thêm /api — cơ học nhưng phải đủ (auth/session/platform). Cookie path '/' vẫn phủ /api/*.

## Execution
subagent-driven-development. Task 2→3→4→5 (Task 1 đã xong). Task 2 (identity) trước để chốt /api; portal tasks sau.
