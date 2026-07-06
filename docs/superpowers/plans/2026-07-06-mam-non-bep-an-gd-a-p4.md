# Module Bếp ăn (Mầm non) — GĐ A Phần 4: Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dựng lĩnh vực "Mầm non" + 5 trang FE (Định mức tiền ăn, Công thức định lượng, Điểm danh ăn, Đề xuất mua thực phẩm, Bảng kiểm soát chi phí) cho toàn bộ BE GĐ A đã xây; wiring đầy đủ để menu "Bếp ăn" hiện dưới lĩnh vực Mầm non.

**Architecture:** React 18 + Vite + antd + Tailwind. Trang danh mục theo **Pattern A single-file** (copy `DonViTinhPage.tsx`). Trang có dòng chi tiết (Công thức, Đề xuất) dùng pattern **state mảng ở cha + `ChiTietTable`** (copy `fe/src/pages/kho/_shared/ChiTietTable.tsx`). Bảng kiểm soát là trang **report** (date range → GET → cards + table). Service kế thừa `ServiceBase`. Menu gate qua lĩnh vực (DB `linh_vuc.menuKeys`).

**Tech Stack:** React 18, TypeScript, Vite, antd, zod, TanStack Query (không bắt buộc), ServiceBase (axios).

## Global Constraints

- Backend GĐ A đã xong (branch `feat/mam-non-bep-an`). Endpoint qua gateway prefix **`/mam-non`**:
  - `/mam-non/dinh-muc-tien-an`, `/mam-non/cong-thuc-dinh-luong`, `/mam-non/diem-danh-an`, `/mam-non/de-xuat-mua`, `/mam-non/kiem-soat`.
- **Danh mục Mầm non dùng khóa `code` (KHÔNG phải `ma`)** → service dùng `checkCodeExists`/endpoint `/check-code`; KHÔNG có endpoint `/total` hay `/search` (BE không expose) — chỉ dùng `getPaginated`/`getAll`/`getStats`/`checkCodeExists`/`create`/`update`/`remove`/`getById`.
- Route FE của 5 trang đặt dưới prefix **`/bep-an/*`**; menu group **"Bếp ăn"** trong `keToAnMenuItems`.
- **10 điểm wiring/trang** (checklist ở cuối). Đặc biệt: (a) `MainLayout.existingRoutes` (thiếu → badge "Sắp ra mắt"); (b) `permissionModules.ts` **và** BE `tenant.service.ts` `PERMISSION_MODULES` phải cùng có key mới (lệch → quyền bị xoá khi lưu).
- **Lĩnh vực "Mầm non" (record `linh_vuc` MAM_NON + menuKeys) tạo ở DB/runtime**, KHÔNG phải code — ghi rõ ở bước hậu-deploy. Menu group vẫn phải khai trong code.
- Verify (không cần backend chạy): `cd fe && npm run build` (tsc + vite) PASS + `npm run lint` không lỗi mới. Đây là tiêu chí ràng buộc.
- Copy nguyên mẫu, KHÔNG tự sáng tạo pattern: `fe/src/pages/danh-muc/don-vi-tinh/DonViTinhPage.tsx`, `fe/src/services/donViTinhService.ts`, `fe/src/pages/kho/_shared/ChiTietTable.tsx`.

---

## Task 1: Nền tảng — types + 5 services + wiring (không component trang)

**Files:**
- Modify: `fe/src/types/index.ts`
- Create: `fe/src/services/{dinhMucTienAn,congThucDinhLuong,diemDanhAn,deXuatMua,kiemSoat}Service.ts`
- Modify: `fe/src/config/menuCatalog.ts`, `fe/src/config/routePermissions.ts`
- Modify: `fe/src/components/layout/MainLayout.tsx` (existingRoutes + group "Bếp ăn")
- Modify: `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.ts` (PERMISSION_MODULES)

**Interfaces:**
- Produces: 5 type interfaces; 5 service singletons (`dinhMucTienAnService` … `kiemSoatService`); menu group "Bếp ăn" (paths `/bep-an/*`) + permission keys — consumed by Tasks 2–6.

- [ ] **Step 1: Types** — thêm vào cuối `fe/src/types/index.ts`:
```ts
// ===== MẦM NON / BẾP ĂN =====
export type PhamViDinhMuc = 'LOP' | 'DO_TUOI' | 'GOI_AN' | 'CHUNG';
export interface DinhMucTienAn {
  id: string; code: string; ten: string; phamVi?: PhamViDinhMuc; doiTuongMa?: string;
  mucTien: number; hieuLucTu?: string; hieuLucDen?: string; isActive?: boolean;
}
export type CachXuatCongThuc = 'DINH_LUONG' | 'THEO_SUAT';
export interface ChiTietCongThuc {
  hangHoaMa: string; hangHoaTen: string; dinhLuong: number; donViTinh?: string; cachXuat: CachXuatCongThuc;
}
export interface CongThucDinhLuong {
  id: string; code: string; ten: string; ganTheo?: string; doiTuongMa?: string;
  chiTiet: ChiTietCongThuc[]; isActive?: boolean;
}
export interface DiemDanhAn {
  id: string; ngay: string; lopMa: string; lopTen: string; goiAnMa?: string;
  soTreDangKy: number; soTreAnThucTe: number; congThucCode?: string; ghiChu?: string; isActive?: boolean;
}
export type TrangThaiDeXuat = 'NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_NHAN';
export interface ChiTietDeXuat {
  stt: number; hangHoaMa: string; hangHoaTen: string; donViTinh?: string; soLuong: number; donGia: number; thanhTien: number;
}
export interface DeXuatMua {
  id: string; soPhieu: string; ngayDeXuat: string; nguoiDeXuat?: string; doiTuongMa?: string; doiTuongTen?: string;
  chiTiet: ChiTietDeXuat[]; tongTien: number; trangThai: TrangThaiDeXuat;
  nguoiDuyet?: string; ngayDuyet?: string; lyDoTuChoi?: string; chungTuId?: string; soPhieuNhapKho?: string; isActive?: boolean;
}
export interface TieuHaoDong { hangHoaMa: string; hangHoaTen: string; donViTinh?: string; soLuong: number; }
export interface KiemSoatChiPhi {
  nganSach: number; chiPhiThuc: number; chenhLech: number; haoPhiPct: number; vuot: boolean;
  tieuHao: TieuHaoDong[]; canhBaoDinhGiaThieu?: boolean; canhBaoTruncateNhap?: boolean;
}
```

- [ ] **Step 2: Service danh mục code-keyed** — mẫu chung cho định mức/công thức/điểm danh. Tạo `fe/src/services/dinhMucTienAnService.ts` (copy cấu trúc `donViTinhService.ts`, đổi `endpoint`, `ma`→`code`, bỏ `getTotal`/`search`):
```ts
import { DinhMucTienAn } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface Resp extends Omit<DinhMucTienAn, 'id'> { _id?: string; id?: string; }

class DinhMucTienAnService extends ServiceBase {
  constructor() { super({ endpoint: '/mam-non/dinh-muc-tien-an' }); }
  private map(i: Resp): DinhMucTienAn { return { ...i, id: i._id || i.id || '' } as DinhMucTienAn; }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<DinhMucTienAn>> {
    const r = await this.get<{ data: Resp[]; meta: PaginatedResponse<DinhMucTienAn>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return { data: r.data.map((x) => this.map(x)), meta: r.meta };
  }
  async getAll(): Promise<DinhMucTienAn[]> { return (await this.get<Resp[]>({ endpoint: '/all' })).map((x) => this.map(x)); }
  async getById(id: string): Promise<DinhMucTienAn> { return this.map(await this.get<Resp>({ endpoint: `/${id}` })); }
  async create(data: Omit<DinhMucTienAn, 'id'>): Promise<DinhMucTienAn> { return this.map(await this.post<Resp>(data)); }
  async update(id: string, data: Partial<DinhMucTienAn>): Promise<DinhMucTienAn> { return this.map(await this.put<Resp>(data, { endpoint: `/${id}` })); }
  async remove(id: string): Promise<void> { return super.delete({ endpoint: `/${id}` }); }
  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const r = await this.get<{ exists: boolean }>({ endpoint: '/check-code', params: { code, excludeId } });
    return r.exists;
  }
  async getStats(): Promise<{ tong: number }> { return this.get<{ tong: number }>({ endpoint: '/stats' }); }
}
export const dinhMucTienAnService = new DinhMucTienAnService();
```

- [ ] **Step 3: Service công thức** `fe/src/services/congThucDinhLuongService.ts` — y hệt Step 2 với `CongThucDinhLuong`, `endpoint: '/mam-non/cong-thuc-dinh-luong'`.

- [ ] **Step 4: Service điểm danh** `fe/src/services/diemDanhAnService.ts` — y hệt Step 2 với `DiemDanhAn`, `endpoint: '/mam-non/diem-danh-an'`, NHƯNG bỏ `checkCodeExists` (điểm danh không có code duy nhất).

- [ ] **Step 5: Service đề xuất mua** `fe/src/services/deXuatMuaService.ts` — CRUD (như Step 2, `DeXuatMua`, `endpoint: '/mam-non/de-xuat-mua'`, bỏ checkCodeExists/stats) + hành động trạng thái:
```ts
  async submit(id: string): Promise<DeXuatMua> { return this.map(await this.post<Resp>({}, { endpoint: `/${id}/submit` })); }
  async approve(id: string): Promise<DeXuatMua> { return this.map(await this.post<Resp>({}, { endpoint: `/${id}/approve` })); }
  async reject(id: string, lyDoTuChoi: string): Promise<DeXuatMua> { return this.map(await this.post<Resp>({ lyDoTuChoi }, { endpoint: `/${id}/reject` })); }
  async nhanHang(id: string): Promise<DeXuatMua> { return this.map(await this.post<Resp>({}, { endpoint: `/${id}/nhan-hang` })); }
```

- [ ] **Step 6: Service kiểm soát** `fe/src/services/kiemSoatService.ts`:
```ts
import { KiemSoatChiPhi } from '@/types';
import { ServiceBase } from './base/service-base';

class KiemSoatService extends ServiceBase {
  constructor() { super({ endpoint: '/mam-non/kiem-soat' }); }
  async getChiPhi(params: { tuNgay?: string; denNgay?: string; nguongPct?: number }): Promise<KiemSoatChiPhi> {
    return this.get<KiemSoatChiPhi>({ endpoint: '/chi-phi', params });
  }
  async chotTieuHao(params: { tuNgay?: string; denNgay?: string }): Promise<{ chiPhiThuc: number; soPhieuXuat?: string; chungTuId?: string }> {
    return this.post({}, { endpoint: '/chot-tieu-hao', params });
  }
}
export const kiemSoatService = new KiemSoatService();
```

- [ ] **Step 7: menuCatalog** — thêm vào `MENU_CATALOG` (`fe/src/config/menuCatalog.ts`):
```ts
{ key: '/bep-an/dinh-muc-tien-an', label: 'Định mức tiền ăn', parentLabel: 'Bếp ăn' },
{ key: '/bep-an/cong-thuc-dinh-luong', label: 'Công thức định lượng', parentLabel: 'Bếp ăn' },
{ key: '/bep-an/diem-danh-an', label: 'Điểm danh ăn', parentLabel: 'Bếp ăn' },
{ key: '/bep-an/de-xuat-mua', label: 'Đề xuất mua thực phẩm', parentLabel: 'Bếp ăn' },
{ key: '/bep-an/kiem-soat-chi-phi', label: 'Bảng kiểm soát chi phí', parentLabel: 'Bếp ăn' },
```

- [ ] **Step 8: routePermissions** — thêm 5 dòng vào `routePermissions` (`fe/src/config/routePermissions.ts`):
```ts
'/bep-an/dinh-muc-tien-an': '/bep-an/dinh-muc-tien-an:xem',
'/bep-an/cong-thuc-dinh-luong': '/bep-an/cong-thuc-dinh-luong:xem',
'/bep-an/diem-danh-an': '/bep-an/diem-danh-an:xem',
'/bep-an/de-xuat-mua': '/bep-an/de-xuat-mua:xem',
'/bep-an/kiem-soat-chi-phi': '/bep-an/kiem-soat-chi-phi:xem',
```

- [ ] **Step 9: MainLayout** (`fe/src/components/layout/MainLayout.tsx`):
  (a) Thêm 5 path vào `existingRoutes` Set:
```ts
"/bep-an/dinh-muc-tien-an", "/bep-an/cong-thuc-dinh-luong", "/bep-an/diem-danh-an",
"/bep-an/de-xuat-mua", "/bep-an/kiem-soat-chi-phi",
```
  (b) Thêm group "Bếp ăn" vào `keToAnMenuItems` (cạnh group "Kho"), import icon nếu cần (dùng icon có sẵn, vd `CoffeeOutlined`, `ShoppingCartOutlined`, `CalculatorOutlined`, `TeamOutlined`, `FileTextOutlined`):
```tsx
getItem("Bếp ăn", "/bep-an", <CoffeeOutlined />, [
  getMenuItem("Định mức tiền ăn", "/bep-an/dinh-muc-tien-an", <ProfileOutlined />),
  getMenuItem("Công thức định lượng", "/bep-an/cong-thuc-dinh-luong", <ExperimentOutlined />),
  getMenuItem("Điểm danh ăn", "/bep-an/diem-danh-an", <TeamOutlined />),
  getMenuItem("Đề xuất mua thực phẩm", "/bep-an/de-xuat-mua", <ShoppingCartOutlined />),
  getMenuItem("Bảng kiểm soát chi phí", "/bep-an/kiem-soat-chi-phi", <BarChartOutlined />),
]),
```
(Kiểm tra các icon đã import ở đầu file; thêm import nào còn thiếu từ `@ant-design/icons`.)

- [ ] **Step 10: permissionModules FE** — thêm section "BẾP ĂN" vào `permissionModules` (`fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`):
```ts
{
  key: 'bep-an', label: 'BẾP ĂN', isSection: true,
  children: [
    { key: '/bep-an/dinh-muc-tien-an', label: 'Định mức tiền ăn' },
    { key: '/bep-an/cong-thuc-dinh-luong', label: 'Công thức định lượng' },
    { key: '/bep-an/diem-danh-an', label: 'Điểm danh ăn' },
    { key: '/bep-an/de-xuat-mua', label: 'Đề xuất mua thực phẩm' },
    { key: '/bep-an/kiem-soat-chi-phi', label: 'Bảng kiểm soát chi phí' },
  ],
},
```

- [ ] **Step 11: PERMISSION_MODULES BE** — mở `be/apps/master-data-service/src/tenant/tenant.service.ts`, tìm hằng `PERMISSION_MODULES` (danh sách route key hợp lệ), thêm 5 key `/bep-an/*` theo đúng format hiện có (nếu là mảng string thì thêm 5 string; nếu là cây thì thêm nhánh tương ứng permissionModules FE). Đây là bước chống mất quyền khi lưu. Nếu không tìm thấy hằng này, tìm chuỗi `dinh-muc/don-vi-tinh` trong `be/apps/master-data-service/src` để định vị danh sách và thêm cùng chỗ.

- [ ] **Step 12: Build FE + BE**
Run: `cd fe && npm run build` → PASS (types + services compile). `cd be && npx nest build master-data-service` → PASS.

- [ ] **Step 13: Commit**
```bash
git add fe/src/types/index.ts fe/src/services fe/src/config/menuCatalog.ts fe/src/config/routePermissions.ts fe/src/components/layout/MainLayout.tsx fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts be/apps/master-data-service/src/tenant/tenant.service.ts
git commit -m "feat(mam-non-fe): nền tảng Bếp ăn — types + 5 service + wiring menu/quyền lĩnh vực Mầm non"
```

---

## Task 2: Trang Định mức tiền ăn

**Files:** Create `fe/src/pages/bep-an/dinh-muc-tien-an/DinhMucTienAnPage.tsx`; Modify `fe/src/pages/loadable.tsx`, `fe/src/App.tsx`.

- [ ] **Step 1: Page** — copy `fe/src/pages/danh-muc/don-vi-tinh/DonViTinhPage.tsx` → `DinhMucTienAnPage.tsx`, đổi:
  - import `DinhMucTienAn` từ `@/types`, `dinhMucTienAnService`.
  - `usePagePermission("/bep-an/dinh-muc-tien-an")`; breadcrumb "Bếp ăn / Định mức tiền ăn".
  - zod schema: `code` (min1,max20), `ten` (min1,max200), `phamVi` optional, `doiTuongMa` optional nullable, `mucTien` number ≥0 (`z.number()` hoặc `z.coerce.number()`), `hieuLucTu/Den` optional.
  - `handleSubmit`: dùng `dinhMucTienAnService.checkCodeExists(validated.code, editingRecord?.id)` (đổi từ checkMaExists).
  - Columns: Mã (`code`), Tên (`ten`), Phạm vi (`phamVi`), Đối tượng (`doiTuongMa`), Mức tiền (`mucTien`, render `formatCurrency`), Hiệu lực từ (`hieuLucTu`), Thao tác.
  - Form fields: `code` (Input), `ten` (Input), `phamVi` (`Select` options LOP/DO_TUOI/GOI_AN/CHUNG), `doiTuongMa` (Input), `mucTien` (`InputNumber` min 0, formatter phân cách nghìn), `hieuLucTu`/`hieuLucDen` (`DatePicker`, gửi ISO string).
  - `useTableTitleConfig('bepAn.dinhMucTienAn', columns)`, `useFieldLabels('bepAn.dinhMucTienAn')`.
  - Bỏ mọi lời gọi `getTotal`/`search` (không tồn tại).

- [ ] **Step 2: loadable** — thêm vào `fe/src/pages/loadable.tsx`:
```tsx
export const DinhMucTienAnPage = loadable(() => import('./bep-an/dinh-muc-tien-an/DinhMucTienAnPage'), { fallback: <PageLoader /> });
```

- [ ] **Step 3: App route** — trong `fe/src/App.tsx`: thêm `DinhMucTienAnPage` vào import destructure từ `./pages/loadable`; thêm block route `<Route path="bep-an">` (nếu chưa có) cạnh block `kho`, với:
```tsx
<Route path="bep-an">
  <Route path="dinh-muc-tien-an" element={
    <ProtectedRoute requiredPermission="/bep-an/dinh-muc-tien-an:xem"><DinhMucTienAnPage /></ProtectedRoute>
  } />
</Route>
```
(Các task sau thêm `<Route>` con vào block `bep-an` này.)

- [ ] **Step 4: Build** — `cd fe && npm run build` → PASS.

- [ ] **Step 5: Commit** — `git add fe/src/pages/bep-an/dinh-muc-tien-an fe/src/pages/loadable.tsx fe/src/App.tsx && git commit -m "feat(mam-non-fe): trang Định mức tiền ăn"`

---

## Task 3: Trang Công thức định lượng (có chiTiet)

**Files:** Create `fe/src/pages/bep-an/cong-thuc-dinh-luong/CongThucDinhLuongPage.tsx` (+ có thể tách `CongThucChiTietTable.tsx`); Modify `loadable.tsx`, `App.tsx`.

- [ ] **Step 1: Bảng chi tiết** — tạo `CongThucChiTietTable.tsx` theo pattern `fe/src/pages/kho/_shared/ChiTietTable.tsx` (state ở cha, `value`/`onChange`), cột: Mã hàng (`Select` từ `hangHoaVatTuService.getAll()`, chọn → điền `hangHoaTen`/`donViTinh`), Định lượng/suất (`InputNumber` min 0), ĐVT (text), Cách xuất (`Select` DINH_LUONG/THEO_SUAT). Không có tiền (công thức không có đơn giá). `addRow`/`deleteRow`/`updateRow` như mẫu, KHÔNG cần `stt` (BE `ChiTietCongThuc` không có stt) — dùng index làm rowKey.

- [ ] **Step 2: Page** — copy DonViTinhPage → `CongThucDinhLuongPage.tsx`; adapt như Task 2 (code/ten, `usePagePermission("/bep-an/cong-thuc-dinh-luong")`, `congThucDinhLuongService`, `checkCodeExists`). Trong Modal Form: thêm `ganTheo` (Select SUAT_CHUAN/DO_TUOI/GOI_AN), `doiTuongMa` (Input), và **state `chiTiet` ở component** (`useState<ChiTietCongThuc[]>`), render `<CongThucChiTietTable value={chiTiet} onChange={setChiTiet} />` trong Modal. Khi edit: `setChiTiet(record.chiTiet || [])`. `handleSubmit` gộp `{ ...validated, chiTiet }` vào create/update; validate `chiTiet.length > 0` (message "Cần ít nhất 1 nguyên liệu"). Modal rộng hơn (`width={800}`).

- [ ] **Step 3: loadable + route** — thêm `CongThucDinhLuongPage` vào `loadable.tsx`; thêm `<Route path="cong-thuc-dinh-luong" ... requiredPermission="/bep-an/cong-thuc-dinh-luong:xem">` vào block `bep-an` trong `App.tsx`.

- [ ] **Step 4: Build** — `cd fe && npm run build` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(mam-non-fe): trang Công thức định lượng (chiTiet nguyên liệu)"`

---

## Task 4: Trang Điểm danh ăn

**Files:** Create `fe/src/pages/bep-an/diem-danh-an/DiemDanhAnPage.tsx`; Modify `loadable.tsx`, `App.tsx`.

- [ ] **Step 1: Page** — copy DonViTinhPage → `DiemDanhAnPage.tsx`; adapt: `usePagePermission("/bep-an/diem-danh-an")`, `diemDanhAnService` (KHÔNG có checkCodeExists → bỏ bước check trong handleSubmit). zod: `ngay` (string, required), `lopMa`/`lopTen` (required), `goiAnMa` optional, `soTreDangKy`/`soTreAnThucTe` (number ≥0), `congThucCode` optional. Columns: Ngày (`ngay`, render dd/MM/yyyy), Lớp (`lopTen`), Số trẻ đăng ký, Số trẻ ăn, Công thức, Thao tác. Form: `ngay` (DatePicker→ISO), `lopMa`/`lopTen` (Input), `goiAnMa` (Input), `soTreDangKy`/`soTreAnThucTe` (InputNumber), `congThucCode` (`Select` từ `congThucDinhLuongService.getAll()` map code→ten). Search theo lớp.

- [ ] **Step 2: loadable + route** — thêm `DiemDanhAnPage` + `<Route path="diem-danh-an" ... requiredPermission="/bep-an/diem-danh-an:xem">` vào block `bep-an`.

- [ ] **Step 3: Build** — `cd fe && npm run build` → PASS.

- [ ] **Step 4: Commit** — `git commit -m "feat(mam-non-fe): trang Điểm danh ăn"`

---

## Task 5: Trang Đề xuất mua thực phẩm (chiTiet + trạng thái duyệt)

**Files:** Create `fe/src/pages/bep-an/de-xuat-mua/DeXuatMuaPage.tsx` (+ `DeXuatChiTietTable.tsx`); Modify `loadable.tsx`, `App.tsx`.

- [ ] **Step 1: Bảng chi tiết** `DeXuatChiTietTable.tsx` — theo `ChiTietTable.tsx`: cột STT, Mã hàng (Select hàng hóa → điền tên/ĐVT), Số lượng (InputNumber), Đơn giá (InputNumber), Thành tiền (auto = soLuong×donGia), xóa dòng; `Table.Summary` tổng tiền; nút "Thêm dòng". `updateRow` tự tính `thanhTien`.

- [ ] **Step 2: Page** — copy DonViTinhPage → `DeXuatMuaPage.tsx`; adapt:
  - `usePagePermission("/bep-an/de-xuat-mua")`, `deXuatMuaService`. Không checkCodeExists (soPhieu do BE sinh).
  - state `chiTiet` (`useState<ChiTietDeXuat[]>`); Modal Form header: `ngayDeXuat` (DatePicker), `nguoiDeXuat` (Input), `doiTuongMa`/`doiTuongTen` (NCC — Select từ `doiTuongService.getAll()` lọc loại NCC, hoặc Input), `<DeXuatChiTietTable value={chiTiet} onChange={setChiTiet} />`. Chỉ cho **tạo/sửa khi `trangThai==='NHAP'`** (record đã gửi duyệt thì Modal read-only).
  - Columns: Số phiếu (`soPhieu`), Ngày (`ngayDeXuat`), NCC (`doiTuongTen`), Tổng tiền (`tongTien`, formatCurrency), **Trạng thái** (render antd `Tag` màu theo trạng thái: NHAP=default, CHO_DUYET=processing, DA_DUYET=blue, TU_CHOI=red, DA_NHAN=green), Thao tác.
  - **Cột Thao tác theo trạng thái** (dùng quyền + trạng thái):
    - `NHAP`: Sửa, Xóa, **Gửi duyệt** (`submit` → reload).
    - `CHO_DUYET`: **Duyệt** (`approve`), **Từ chối** (mở Modal nhập `lyDoTuChoi` → `reject`).
    - `DA_DUYET`: **Nhận hàng** (`Popconfirm` "Xác nhận nhận hàng? Sẽ ghi bút toán 152/331 + phiếu nhập kho" → `nhanHang` → reload; hiển thị `message.success` kèm cảnh báo nếu lỗi).
    - `DA_NHAN`/`TU_CHOI`: chỉ Xem.
  - Mỗi hành động bọc try/catch + `message.error(e.message)` (BE trả BadRequestException message rõ).

- [ ] **Step 3: loadable + route** — thêm `DeXuatMuaPage` + `<Route path="de-xuat-mua" ... requiredPermission="/bep-an/de-xuat-mua:xem">`.

- [ ] **Step 4: Build** — `cd fe && npm run build` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(mam-non-fe): trang Đề xuất mua thực phẩm (chiTiet + duyệt + nhận hàng)"`

---

## Task 6: Trang Bảng kiểm soát chi phí (report)

**Files:** Create `fe/src/pages/bep-an/kiem-soat-chi-phi/KiemSoatChiPhiPage.tsx`; Modify `loadable.tsx`, `App.tsx`.

**Interfaces:** Consumes `kiemSoatService.getChiPhi` + `chotTieuHao`; `KiemSoatChiPhi` type.

- [ ] **Step 1: Page** — trang report (KHÔNG copy DonViTinhPage; tự viết). Cấu trúc:
```tsx
const KiemSoatChiPhiPage: React.FC = () => {
  const { canView } = usePagePermission("/bep-an/kiem-soat-chi-phi");
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [nguongPct, setNguongPct] = useState<number>(0);
  const [data, setData] = useState<KiemSoatChiPhi | null>(null);
  const [loading, setLoading] = useState(false);
  const [chotting, setChotting] = useState(false);
  const [daChot, setDaChot] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await kiemSoatService.getChiPhi({
        tuNgay: range?.[0]?.format('YYYY-MM-DD'),   // date-only (guard end-of-day BE)
        denNgay: range?.[1]?.format('YYYY-MM-DD'),
        nguongPct,
      });
      setData(res); setDaChot(false);
    } catch (e: any) { message.error(e?.message || 'Không tải được'); }
    finally { setLoading(false); }
  };

  const chot = async () => {
    setChotting(true);
    try {
      const r = await kiemSoatService.chotTieuHao({ tuNgay: range?.[0]?.format('YYYY-MM-DD'), denNgay: range?.[1]?.format('YYYY-MM-DD') });
      message.success(`Đã chốt: giá vốn ${formatCurrency(r.chiPhiThuc)} (phiếu xuất ${r.soPhieuXuat ?? ''})`);
      setDaChot(true);
    } catch (e: any) { message.error(e?.message || 'Chốt thất bại'); }
    finally { setChotting(false); }
  };
  // render: Breadcrumb + Card(filter: RangePicker + InputNumber ngưỡng% + nút "Xem"),
  //   nếu data: 3 thẻ Statistic (Ngân sách, Chi phí thực, Hao phí % — màu đỏ nếu vuot),
  //   Alert cảnh báo nếu data.canhBaoDinhGiaThieu (đọc nhập kho lỗi) / data.canhBaoTruncateNhap (>1000 phiếu nhập → đơn giá có thể sai),
  //   Table tieuHao (Mã hàng, Tên, ĐVT, Số lượng tiêu hao),
  //   nút "Chốt tiêu hao" (Popconfirm cảnh báo "Sẽ ghi phiếu xuất + bút toán 632/152; KHÔNG hoàn tác, tránh chốt trùng kỳ"; disabled khi !data || chotting || daChot).
};
```
Chi tiết yêu cầu bắt buộc:
  - Gửi `tuNgay`/`denNgay` dạng **`YYYY-MM-DD`** (không kèm giờ).
  - Render `canhBaoDinhGiaThieu` và `canhBaoTruncateNhap` bằng antd `Alert type="warning"` **rõ ràng**.
  - Nút "Chốt tiêu hao" phải: `Popconfirm` cảnh báo không hoàn tác + **disable sau khi chốt thành công** (`daChot`) và trong lúc đang chốt (`chotting`) — vì BE chưa idempotent, tránh chốt trùng.
  - Thẻ Hao phí đỏ khi `data.vuot === true`.

- [ ] **Step 2: loadable + route** — thêm `KiemSoatChiPhiPage` + `<Route path="kiem-soat-chi-phi" ... requiredPermission="/bep-an/kiem-soat-chi-phi:xem">` vào block `bep-an`.

- [ ] **Step 3: Build + lint** — `cd fe && npm run build && npm run lint` → PASS (không lỗi mới).

- [ ] **Step 4: Commit** — `git commit -m "feat(mam-non-fe): trang Bảng kiểm soát chi phí ăn (report + chốt tiêu hao)"`

---

## Kết thúc Phần 4 & GĐ A

Sau Task 6: đủ 5 trang thao tác toàn bộ BE. **GĐ A HOÀN TẤT** (BE + FE trong app Kế toán, lĩnh vực Mầm non).

**Verify tổng:** `cd fe && npm run build && npm run lint` PASS.

**Bước hậu-deploy (KHÔNG phải code — làm khi deploy):**
1. Tạo record `linh_vuc` code `MAM_NON`, name "Mầm non", `menuKeys = ['/bep-an/dinh-muc-tien-an','/bep-an/cong-thuc-dinh-luong','/bep-an/diem-danh-an','/bep-an/de-xuat-mua','/bep-an/kiem-soat-chi-phi']` (qua trang `/cau-hinh/linh-vuc` SuperAdmin hoặc seed DB).
2. Gán module `MAM_NON` cho tenant Emillia (`tenantModules`).
3. Grant quyền `/bep-an/*:xem|them|sua|xoa` cho vai trò Admin công ty (xem [[them-trang-moi-wiring]]).
4. Khai TK 152/331/632 + đối tượng NCC + hàng hóa thực phẩm (cachXuat) trong danh mục.

**Nhắc:** backlog blocker BE trước go-live thật vẫn còn (chốt tiêu hao chưa idempotent — đã mitigate FE bằng disable nút; loai PHIEU_CHI lệch getStats; đơn giá bq toàn kỳ; TK hardcode).
