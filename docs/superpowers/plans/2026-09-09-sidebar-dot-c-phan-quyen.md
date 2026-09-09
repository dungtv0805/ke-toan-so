# Đợt C — Phân quyền sinh từ catalog + tách route báo cáo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ma trận phân quyền nhìn giống hệt sidebar (12 phân hệ), sinh ra từ `menuCatalog` thay vì là danh sách chép tay thứ ba — và tách 4 tab của `/bao-cao/tai-chinh` thành route riêng để mỗi mục trong panel đi thẳng đến nơi.

**Architecture:** `permissionModules.ts` và `routePermissions.ts` đổi từ hằng chép tay thành hàm sinh từ `MENU_LEAVES`. Key quyền không đổi một ký tự — test snapshot từ đợt A canh việc đó. Tách route làm bằng `?tab=`, không đụng component.

**Tech Stack:** TypeScript · react-router-dom v6 · vitest

**Spec:** `docs/superpowers/specs/2026-09-09-sidebar-menu-redesign-design.md` §13, §15

**Phụ thuộc:** Đợt A và B đã xong, đã deploy, đã chạy ổn ít nhất vài ngày.

## Global Constraints

- **Không đổi logic nghiệp vụ.** Tách route ở đây chỉ là thêm đường vào cùng một component với `?tab=` khác nhau.
- **Không đổi key quyền.** Test `phân quyền — không cấp lại` (đợt A, Task 2) phải xanh sau mỗi commit. Đỏ là dừng, không nới test.
- **Không xoá route nào.** Mục rơi khỏi menu vẫn giữ `legacy: true` trong catalog.
- Sau khi deploy phải **grant lại quyền cho vai trò Admin** nếu có mục mới xuất hiện trong ma trận (theo memory "Thêm trang mới — wiring").
- Chạy trong `fe/`. Nghiệm thu: `npm test` · `npm run lint` · `npm run build`.

---

## File Structure

**Sửa**
| File | Sửa gì |
|---|---|
| `src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts` | hằng chép tay → hàm sinh từ catalog, nhóm theo 12 phân hệ |
| `src/config/routePermissions.ts` | bổ sung sinh tự động, giữ nguyên các key thủ công không thuộc menu |
| `src/config/menuCatalog.tsx` | cụm BÁO CÁO TÀI CHÍNH: 1 mục → 6 mục |
| `src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx:122` | đọc `?tab=` |
| `src/App.tsx` | route `bao-cao/tai-chinh/luu-chuyen-tien-te` → ComingSoon |

**Tạo**
| File | Trách nhiệm |
|---|---|
| `src/pages/cau-hinh/phan-quyen/constants/permissionModules.test.ts` | ma trận khớp catalog, không mất key |

---

### Task 1: `permissionModules` sinh từ catalog

**Files:**
- Modify: `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`
- Test: `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.test.ts`

**Interfaces:**
- Consumes: `MENU_MODULES`, `MENU_LEAVES`, `permKeyOf` (đợt A Task 1); `DANH_MUC_GROUPS` từ `@/config/danhMucCatalog`
- Produces: `permissionModules: PermissionModule[]` — **giữ nguyên tên export và kiểu**, trang Phân quyền không phải sửa dòng nào

Cấu trúc mới: mỗi phân hệ là một `isSection` cấp 1, mục lá là con. Phân hệ Danh mục lấy 26 trang con từ `DANH_MUC_GROUPS`, giữ nhóm nhỏ của nó.

- [ ] **Step 1: Viết test (đỏ)**

```ts
import { describe, it, expect } from 'vitest';
import { permissionModules } from './permissionModules';
import { MENU_MODULES, MENU_LEAVES, permKeyOf } from '@/config/menuCatalog';
import { DANH_MUC_ROUTES } from '@/config/danhMucCatalog';

const moiKey = (ds = permissionModules): string[] =>
  ds.flatMap((m) => (m.children ? moiKey(m.children) : [m.key]));

describe('permissionModules sinh từ catalog', () => {
  it('cấp 1 là 12 phân hệ, đúng thứ tự của rail', () => {
    expect(permissionModules.map((m) => m.label)).toEqual(
      MENU_MODULES.map((m) => m.label),
    );
    expect(permissionModules.every((m) => m.isSection)).toBe(true);
  });

  it('mọi mục ok trên sidebar đều cấp quyền được', () => {
    const trongMaTran = new Set(moiKey());
    const thieu = MENU_LEAVES
      .filter((l) => l.status === 'ok' && !l.legacy && l.module !== 'danh-muc')
      .filter((l) => !trongMaTran.has(permKeyOf(l)));
    expect(thieu.map((l) => l.key)).toEqual([]);
  });

  it('mục soon KHÔNG có trong ma trận — chưa có gì để cấp', () => {
    const trongMaTran = new Set(moiKey());
    const thua = MENU_LEAVES
      .filter((l) => l.status === 'soon')
      .filter((l) => trongMaTran.has(permKeyOf(l)));
    expect(thua.map((l) => l.key)).toEqual([]);
  });

  it('mục legacy vẫn cấp quyền được — trang còn sống', () => {
    const trongMaTran = new Set(moiKey());
    expect(trongMaTran.has('/bep-an/kiem-soat-chi-phi')).toBe(true);
    expect(trongMaTran.has('/bao-cao/so-cai')).toBe(true);
  });

  it('phân hệ Danh mục liệt kê đủ 26 trang con', () => {
    const dm = permissionModules.find((m) => m.label === 'Danh mục')!;
    const keys = moiKey(dm.children ?? []);
    expect(new Set(keys)).toEqual(new Set(DANH_MUC_ROUTES));
  });

  it('không key nào trùng nhau trong toàn ma trận', () => {
    const keys = moiKey();
    expect(keys.length).toBe(new Set(keys).size);
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/pages/cau-hinh/phan-quyen/constants/permissionModules.test.ts`
Expected: FAIL ở test 1 — ma trận đang là 3 nhóm ĐIỀU HÀNH / KẾ TOÁN / THƯ VIỆN.

- [ ] **Step 3: Viết lại `permissionModules.ts`**

Giữ nguyên đầu file (`PermissionModule`, `PermissionAction`, `PERMISSION_ACTIONS`). Thay hằng `permissionModules` bằng:

```ts
import { MENU_MODULES, MENU_LEAVES, permKeyOf } from '@/config/menuCatalog';
import { DANH_MUC_GROUPS } from '@/config/danhMucCatalog';

/**
 * Ma trận phân quyền sinh từ menuCatalog — KHÔNG chép tay nữa.
 * Thêm trang mới thì thêm vào menuCatalog, ma trận tự có.
 *
 * Quy tắc:
 * - Cấp 1 = 12 phân hệ, đúng thứ tự rail.
 * - Mục `soon` không vào (chưa có gì để cấp).
 * - Mục `legacy` VẪN vào (trang còn sống, quyền còn hiệu lực) — không được bỏ.
 * - Phân hệ Danh mục dùng 26 trang con của danhMucCatalog, giữ nhóm nhỏ.
 */
function conCuaPhanHe(moduleId: string): PermissionModule[] {
  if (moduleId === 'danh-muc') {
    return DANH_MUC_GROUPS.map((g) => ({
      key: `danh-muc/${g.title}`,
      label: g.title,
      children: g.links.map((l) => ({ key: l.path, label: l.label })),
    }));
  }

  const daCo = new Set<string>();
  const con: PermissionModule[] = [];
  for (const leaf of MENU_LEAVES) {
    if (leaf.module !== moduleId) continue;
    if (leaf.status === 'soon') continue;
    const key = permKeyOf(leaf);
    if (daCo.has(key)) continue;   // nhiều mục dùng chung một route (?tab=)
    daCo.add(key);
    con.push({ key, label: leaf.label });
  }
  return con;
}

export const permissionModules: PermissionModule[] = MENU_MODULES.map((m) => ({
  key: m.id,
  label: m.label,
  isSection: true,
  children: conCuaPhanHe(m.id),
})).filter((m) => (m.children?.length ?? 0) > 0);
```

Lưu ý về nhãn: mục dùng chung route (`Kế hoạch bán hàng` và `Kế hoạch tiền lương` cùng trỏ `/trung-tam-du-lieu/ke-hoach`) chỉ vào ma trận **một lần**, lấy nhãn của mục xuất hiện trước. Đó là đúng — quyền là quyền của trang, không phải của lối vào.

- [ ] **Step 4: Chạy test**

Run: `cd fe && npx vitest run src/pages/cau-hinh/phan-quyen/constants/permissionModules.test.ts`
Expected: PASS, 6 test.

Nếu test 2 đỏ vì một mục `ok` nằm ở phân hệ `danh-muc` mà không có trong `DANH_MUC_ROUTES` → sửa `menuCatalog`, không sửa test.

- [ ] **Step 5: Chạy cả bộ test để chắc không vỡ chỗ khác**

Run: `cd fe && npm test`
Expected: xanh, đặc biệt là `menuCatalog.test.ts` (test "không cấp lại quyền").

- [ ] **Step 6: Xem trang Phân quyền bằng mắt**

`npm run dev` → `/cau-hinh/phan-quyen`. Kiểm: 12 nhóm cấp 1 đúng thứ tự rail · tick/bỏ tick vẫn lưu được · không mục nào mất so với ảnh chụp trước khi sửa.

- [ ] **Step 7: Commit**

```bash
cd fe
git add src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts src/pages/cau-hinh/phan-quyen/constants/permissionModules.test.ts
git commit -m "refactor(phan-quyen): ma trận sinh từ menuCatalog, nhóm theo 12 phân hệ"
```

---

### Task 2: `routePermissions` sinh từ catalog

**Files:**
- Modify: `fe/src/config/routePermissions.ts`
- Test: `fe/src/config/menuCatalog.test.ts` (test snapshot có sẵn từ đợt A)

**Interfaces:**
- Consumes: `MENU_LEAVES`, `permKeyOf`, `DANH_MUC_ROUTES`
- Produces: `routePermissions` **cùng tên, cùng kiểu** `Record<string, string>`; `getRoutePermission` giữ nguyên

- [ ] **Step 1: Viết lại phần khai báo**

```ts
import { MENU_LEAVES, permKeyOf } from './menuCatalog';
import { DANH_MUC_ROUTES } from './danhMucCatalog';

/**
 * Quyền của trang cấu hình — không nằm trong menu chính (vào từ nút bánh răng),
 * nên phải khai tay.
 */
const QUYEN_CAU_HINH: Record<string, string> = {
  '/cau-hinh/phan-quyen': '/cau-hinh/phan-quyen:xem',
  '/cau-hinh/vai-tro': '/cau-hinh/vai-tro:xem',
  '/cau-hinh/thanh-vien': '/cau-hinh/thanh-vien:xem',
  '/cau-hinh/linh-vuc': '/cau-hinh/linh-vuc:xem',
};

/** Vài route con không có mục menu riêng nhưng đã cấp quyền từ trước. */
const QUYEN_KE_THUA: Record<string, string> = {
  '/': '/tong-quan:xem',
  '/trung-tam-du-lieu/thu-tien-hop-dong': '/trung-tam-du-lieu/thu-tien-hop-dong:xem',
  '/trung-tam-du-lieu/hd-ban-ra': '/trung-tam-du-lieu/hd-ban-ra:xem',
  '/bao-cao/pnl': '/bao-cao/pnl:xem',
  '/bao-cao/so-cai': '/bao-cao/so-cai:xem',
  '/bao-cao/bang-can-doi': '/bao-cao/bang-can-doi:xem',
};

function sinhTuCatalog(): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const leaf of MENU_LEAVES) {
    if (leaf.status === 'soon') continue;   // chưa có trang → chưa có quyền
    const key = permKeyOf(leaf);
    ra[key] = `${key}:xem`;
  }
  for (const path of DANH_MUC_ROUTES) {
    ra[path] = `${path}:xem`;
  }
  return ra;
}

export const routePermissions: Record<string, string> = {
  ...sinhTuCatalog(),
  ...QUYEN_KE_THUA,
  ...QUYEN_CAU_HINH,
};
```

Giữ nguyên `getRoutePermission` ở cuối file, không sửa một dòng.

- [ ] **Step 2: Chạy test snapshot**

Run: `cd fe && npx vitest run src/config/menuCatalog.test.ts`
Expected: PASS. Test `key quyền sinh ra là tập con của key quyền cũ` là chốt chặn — đỏ nghĩa là đang tạo key mới, tức là sẽ có người mất quyền. **Dừng lại, không nới test.**

- [ ] **Step 3: Đối chiếu thủ công một lần nữa**

```bash
cd fe
node -e "
const cu = require('./src/config/__snapshots__/permission-keys-truoc-doi.json');
" 2>/dev/null || true
npx vitest run src/config/menuCatalog.test.ts -t 'không cấp lại'
```

Expected: 2 test PASS.

- [ ] **Step 4: Chạy cả bộ**

Run: `cd fe && npm test && npm run lint && npm run build`
Expected: xanh cả ba.

- [ ] **Step 5: Commit**

```bash
cd fe
git add src/config/routePermissions.ts
git commit -m "refactor(quyen): routePermissions sinh từ catalog, giữ nguyên mọi key cũ"
```

---

### Task 3: Tách `/bao-cao/tai-chinh` thành mục riêng

**Files:**
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx:122`
- Modify: `fe/src/config/menuCatalog.tsx` (cụm BÁO CÁO TÀI CHÍNH)
- Modify: `fe/src/App.tsx` (route `luu-chuyen-tien-te` → ComingSoon)
- Test: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.test.tsx`

**Interfaces:**
- Produces: `tabBanDauBCTC(tab: string | null): string`

**Đính chính spec §3.3:** trang có 4 tab thật là `1` Cân đối tài khoản · `2` Cân đối kế toán · `3` Kết quả kinh doanh · `4` **So sánh lãi lỗ**. **Không có** tab "Lưu chuyển tiền tệ" như spec ghi. Nên cụm này thành **6 mục**: 4 mục trỏ 4 tab thật + Lưu chuyển tiền tệ (`soon`) + Thuyết minh (`soon`). Mục "So sánh lãi lỗ" bắt buộc phải có, nếu không tab 4 mất lối vào.

- [ ] **Step 1: Viết test (đỏ)**

```tsx
import { describe, it, expect } from 'vitest';
import { tabBanDauBCTC } from './BaoCaoTaiChinhPage';

describe('tabBanDauBCTC', () => {
  it('không có ?tab thì mở Cân đối tài khoản như cũ', () => {
    expect(tabBanDauBCTC(null)).toBe('1');
  });

  it('mở đúng tab theo tên đường dẫn', () => {
    expect(tabBanDauBCTC('can-doi-tai-khoan')).toBe('1');
    expect(tabBanDauBCTC('can-doi-ke-toan')).toBe('2');
    expect(tabBanDauBCTC('ket-qua-kinh-doanh')).toBe('3');
    expect(tabBanDauBCTC('so-sanh-lai-lo')).toBe('4');
  });

  it('tab lạ rơi về mặc định, không vỡ trang', () => {
    expect(tabBanDauBCTC('luu-chuyen-tien-te')).toBe('1');
  });
});
```

- [ ] **Step 2: Chạy để xác nhận đỏ**

Run: `cd fe && npx vitest run src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.test.tsx`
Expected: FAIL — `tabBanDauBCTC` chưa được export

- [ ] **Step 3: Sửa `BaoCaoTaiChinhPage.tsx`**

Thêm import `useSearchParams` từ `react-router-dom`, rồi thêm ngay trên component:

```tsx
const TAB_THEO_TEN: Record<string, string> = {
  'can-doi-tai-khoan': '1',
  'can-doi-ke-toan': '2',
  'ket-qua-kinh-doanh': '3',
  'so-sanh-lai-lo': '4',
};

/** Tab mở đầu theo ?tab= trên URL. Tên lạ thì về tab 1 như cũ. */
export const tabBanDauBCTC = (tab: string | null): string =>
  (tab && TAB_THEO_TEN[tab]) || '1';
```

Đổi dòng 122:

```tsx
// trước: const [activeTab, setActiveTab] = useState('1');
const [searchParams] = useSearchParams();
const [activeTab, setActiveTab] = useState(() => tabBanDauBCTC(searchParams.get('tab')));
```

**Không** đụng gì khác — mọi state, effect, cột bảng, hàm xuất Excel giữ nguyên.

- [ ] **Step 4: Đổi cụm BÁO CÁO TÀI CHÍNH trong `menuCatalog.tsx`**

Thay 2 dòng hiện tại của cụm bằng 6 dòng:

```tsx
  { key: '/bao-cao/tai-chinh?tab=can-doi-ke-toan', permKey: '/bao-cao/tai-chinh', label: 'Bảng cân đối kế toán', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/bao-cao/tai-chinh?tab=ket-qua-kinh-doanh', permKey: '/bao-cao/tai-chinh', label: 'Kết quả kinh doanh', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'ok', icon: <BarChartOutlined /> },
  { key: '/bao-cao/tai-chinh?tab=can-doi-tai-khoan', permKey: '/bao-cao/tai-chinh', label: 'Bảng cân đối tài khoản', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'ok', icon: <TableOutlined /> },
  { key: '/bao-cao/tai-chinh?tab=so-sanh-lai-lo', permKey: '/bao-cao/tai-chinh', label: 'So sánh lãi lỗ', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'ok', icon: <PieChartOutlined /> },
  { key: '/bao-cao/tai-chinh/luu-chuyen-tien-te', label: 'Lưu chuyển tiền tệ', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'soon', icon: <SwapOutlined /> },
  { key: '/bao-cao/tai-chinh/thuyet-minh', label: 'Thuyết minh', module: 'tong-hop', cluster: 'BÁO CÁO TÀI CHÍNH', status: 'soon', icon: <FileTextOutlined /> },
```

- [ ] **Step 5: Thêm route ComingSoon còn thiếu**

Trong `App.tsx`, cạnh route `bao-cao/tai-chinh/thuyet-minh` đã thêm ở đợt A:

```tsx
<Route path="bao-cao/tai-chinh/luu-chuyen-tien-te" element={<ComingSoonPage />} />
```

- [ ] **Step 6: Chạy test**

```bash
cd fe
npx vitest run src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.test.tsx
npx vitest run src/config/menuCatalog.test.ts
```

Expected: PASS cả hai. Test `mọi mục soon phải có route` sẽ bắt nếu quên Step 5.

- [ ] **Step 7: Kiểm bằng mắt**

`npm run dev` → panel Tổng hợp phải hiện cụm BÁO CÁO TÀI CHÍNH với 6 dòng; bấm từng dòng phải mở đúng tab tương ứng; 2 dòng cuối mờ + chấm cam, ra trang "đang phát triển".

- [ ] **Step 8: Commit**

```bash
cd fe
git add src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.test.tsx src/config/menuCatalog.tsx src/App.tsx
git commit -m "feat(bao-cao): mỗi báo cáo tài chính một mục sidebar, mở đúng tab"
```

---

### Task 4: Nghiệm thu và deploy

**Files:** không sửa gì.

- [ ] **Step 1: Kiểm tự động**

```bash
cd fe
npm test && npm run lint && npm run build
npx tsc --noEmit 2>&1 | wc -l
```

Expected: xanh cả ba; số lỗi `tsc` ≤ baseline.

- [ ] **Step 2: Chốt chặn quyền — chạy riêng và đọc kỹ**

```bash
cd fe
npx vitest run src/config/menuCatalog.test.ts -t 'không cấp lại'
npx vitest run src/pages/cau-hinh/phan-quyen/constants/permissionModules.test.ts
```

Expected: PASS toàn bộ. Đây là bằng chứng không ai mất quyền sau khi deploy.

- [ ] **Step 3: Kiểm bằng tài khoản quyền hẹp**

Trên môi trường dev, đăng nhập bằng một tài khoản **không phải** Admin, quyền hẹp, rồi kiểm:
- Rail chỉ hiện phân hệ có mục xem được.
- Không vào được trang không có quyền qua URL trực tiếp.
- Mục `soon` vẫn hiện (đúng thiết kế — cho biết tính năng đang làm).

- [ ] **Step 4: Deploy**

Theo memory "Deploy FE nguyên tử": build local → scp vào thư mục stage → `mv` → `index.html` sau cùng.
Verify tại `ketoan.masterceo.com.vn`.

- [ ] **Step 5: Grant quyền sau deploy**

Vào `/cau-hinh/phan-quyen` bằng tài khoản Admin, kiểm 12 nhóm hiện đủ. Nếu có mục mới xuất hiện trong ma trận (do đổi cách nhóm mà lộ ra mục trước đây bị ẩn), **cấp quyền cho vai trò Admin** — theo memory "Thêm trang mới — wiring", đây là bước hay bị quên nhất.

- [ ] **Step 6: Ghi lại tri thức**

Chạy `/db-update-knowledge` để lưu những gì phát hiện trong cả 3 đợt, tối thiểu:
- `menuCatalog` giờ là nguồn duy nhất — thêm trang mới chỉ sửa 1 chỗ thay vì 7.
- 4 tab của `/bao-cao/tai-chinh` là Cân đối tài khoản / Cân đối kế toán / Kết quả kinh doanh / So sánh lãi lỗ — **không** có Lưu chuyển tiền tệ.
- Cả 7 trang `/phan-tich/*` vẫn là ComingSoon, dù mọi tài liệu thiết kế ghi là "đã có".
