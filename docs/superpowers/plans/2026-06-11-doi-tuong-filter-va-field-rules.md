# Filter đối tượng theo chiTietTheo + fieldRules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Dropdown Đối tượng trên form Nhật ký chung filter theo `chiTietTheo` của TK đã chọn (112 → danh sách Ngân hàng & Quỹ); (2) Cấu hình per-tài-khoản mức Bắt buộc/Cảnh báo/Không bắt buộc cho 8 trường phân bổ, enforce ở FE + BE.

**Spec:** `docs/superpowers/specs/2026-06-11-doi-tuong-filter-va-field-rules-design.md`

**Architecture:** FE form Nhật ký chung dùng CHanlder pattern (state + sub-handler). Chứng từ lưu snapshot trong `danhMuc` (doiTuong = đối tượng nợ, doiTuong2 = đối tượng có). Ngân hàng/Quỹ là collection `ngan_hang` riêng — khi chọn làm đối tượng sẽ lưu snapshot vào `danhMuc.doiTuong/doiTuong2` với `loai: 'NGAN_HANG_QUY'`. Reporting đã có hạ tầng xổ chi tiết theo `danhMuc.doiTuong.loai` khớp `chiTietTheo`. fieldRules lưu JSON trên entity TaiKhoan; FE validate cả 2 mức, BE chỉ enforce BẮT BUỘC qua ServiceClient gọi master-data.

**Tech Stack:** React + TS + antd + vitest (fe), NestJS + TypeORM/MongoDB + jest (be).

**Lệnh test:**
- FE: `cd fe && npx vitest run <file>` (toàn bộ: `npm run test`)
- BE: `cd be && yarn test <pattern>`
- Build check FE: `cd fe && npm run build` — BE: `cd be && yarn build` (hoặc `npx tsc -p tsconfig.json --noEmit`)

**Quy ước:** Mỗi task kết thúc bằng commit. Code mới viết comment tiếng Việt ngắn gọn theo style hiện có.

---

## PHẦN 1 — Filter đối tượng theo chiTietTheo

### Task 1: Helper thuần `getDoiTuongSelectConfig` (TDD)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.ts`
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.test.ts`

- [ ] **Step 1.1: Viết test fail**

```typescript
// fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.test.ts
import { describe, it, expect } from "vitest";
import {
  getDoiTuongSelectConfig,
  getSelectedDoiTuongLoai,
} from "./doiTuongConfig";
import { DoiTuong, TaiKhoanNganHang } from "@/types";

const doiTuongList: DoiTuong[] = [
  { id: "kh1", loai: "KHACH_HANG", ma: "KH001", ten: "Cty A" },
  { id: "ncc1", loai: "NHA_CUNG_CAP", ma: "NCC001", ten: "Cty B" },
  { id: "nv1", loai: "NHAN_VIEN", ma: "NV001", ten: "Nguyễn Văn C" },
];

const nganHangList: TaiKhoanNganHang[] = [
  { id: "nh1", ma: "VCB01", ten: "Vietcombank CN1", loai: "NGAN_HANG", soDu: 0 },
  { id: "tm1", ma: "TM01", ten: "Quỹ tiền mặt", loai: "TIEN_MAT", soDu: 0 },
];

describe("getDoiTuongSelectConfig", () => {
  it("TK không khai chiTietTheo → disabled, không có options", () => {
    const cfg = getDoiTuongSelectConfig(undefined, doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(true);
    expect(cfg.options).toEqual([]);
  });

  it("chiTietTheo=KHACH_HANG → chỉ đối tượng loại KHACH_HANG", () => {
    const cfg = getDoiTuongSelectConfig("KHACH_HANG", doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(false);
    expect(cfg.options).toEqual([{ value: "kh1", label: "KH001 - Cty A" }]);
  });

  it("chiTietTheo=NGAN_HANG_QUY → danh sách ngân hàng & quỹ", () => {
    const cfg = getDoiTuongSelectConfig("NGAN_HANG_QUY", doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(false);
    expect(cfg.options).toEqual([
      { value: "nh1", label: "VCB01 - Vietcombank CN1" },
      { value: "tm1", label: "TM01 - Quỹ tiền mặt" },
    ]);
  });

  it("chiTietTheo=NHAN_VIEN → chỉ nhân viên", () => {
    const cfg = getDoiTuongSelectConfig("NHAN_VIEN", doiTuongList, nganHangList);
    expect(cfg.options).toEqual([{ value: "nv1", label: "NV001 - Nguyễn Văn C" }]);
  });
});

describe("getSelectedDoiTuongLoai", () => {
  it("id thuộc doiTuongList → trả về loai của đối tượng", () => {
    expect(getSelectedDoiTuongLoai("ncc1", doiTuongList, nganHangList)).toBe("NHA_CUNG_CAP");
  });

  it("id thuộc nganHangList → trả về NGAN_HANG_QUY", () => {
    expect(getSelectedDoiTuongLoai("nh1", doiTuongList, nganHangList)).toBe("NGAN_HANG_QUY");
  });

  it("id không tồn tại → undefined", () => {
    expect(getSelectedDoiTuongLoai("xxx", doiTuongList, nganHangList)).toBeUndefined();
  });
});
```

- [ ] **Step 1.2: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.test.ts`
Expected: FAIL — "Cannot find module './doiTuongConfig'" (hoặc tương đương)

- [ ] **Step 1.3: Viết implementation**

```typescript
// fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.ts
import { DoiTuong, TaiKhoanNganHang } from "@/types";

export interface DoiTuongSelectConfig {
  disabled: boolean;
  options: Array<{ value: string; label: string }>;
}

/**
 * Nguồn dropdown Đối tượng theo chiTietTheo của TK:
 * - NGAN_HANG_QUY → danh mục ngân hàng & quỹ
 * - 4 loại còn lại → đối tượng đúng loại đó
 * - TK không khai chiTietTheo → khoá ô (không cần nhập đối tượng)
 */
export function getDoiTuongSelectConfig(
  chiTietTheo: string | undefined,
  doiTuongList: DoiTuong[],
  nganHangList: TaiKhoanNganHang[],
): DoiTuongSelectConfig {
  if (!chiTietTheo) {
    return { disabled: true, options: [] };
  }
  if (chiTietTheo === "NGAN_HANG_QUY") {
    return {
      disabled: false,
      options: nganHangList.map((nh) => ({
        value: nh.id,
        label: `${nh.ma} - ${nh.ten}`,
      })),
    };
  }
  return {
    disabled: false,
    options: doiTuongList
      .filter((d) => d.loai === chiTietTheo)
      .map((d) => ({ value: d.id, label: `${d.ma} - ${d.ten}` })),
  };
}

/** Loại của đối tượng đang chọn; ngân hàng/quỹ quy về NGAN_HANG_QUY. */
export function getSelectedDoiTuongLoai(
  id: string | undefined,
  doiTuongList: DoiTuong[],
  nganHangList: TaiKhoanNganHang[],
): string | undefined {
  if (!id) return undefined;
  const dt = doiTuongList.find((d) => d.id === id);
  if (dt) return dt.loai;
  if (nganHangList.some((nh) => nh.id === id)) return "NGAN_HANG_QUY";
  return undefined;
}
```

- [ ] **Step 1.4: Chạy test, xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 1.5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.ts fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.test.ts
git commit -m "feat(fe): helper chọn nguồn đối tượng theo chiTietTheo của tài khoản"
```

---

### Task 2: Snapshot ngân hàng + mở rộng type

**Files:**
- Modify: `fe/src/types/index.ts` (interface `DoiTuongSnapshot` — tìm `export interface DoiTuongSnapshot`)
- Modify: `fe/src/utils/snapshotBuilder.ts`

- [ ] **Step 2.1: Mở rộng `DoiTuongSnapshot.loai`**

Trong `fe/src/types/index.ts`, sửa interface `DoiTuongSnapshot`:

```typescript
// TRƯỚC:
  loai: 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU';
// SAU:
  loai: 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU' | 'NGAN_HANG_QUY';
```

- [ ] **Step 2.2: Thêm `buildNganHangSnapshot` vào snapshotBuilder.ts**

Thêm import `TaiKhoanNganHang` vào block import từ `@/types` (sau `HopDong,`), và thêm cuối file:

```typescript
/**
 * Build DoiTuongSnapshot từ danh mục Ngân hàng & Quỹ
 * (TK chiTietTheo = NGAN_HANG_QUY chọn đối tượng từ danh mục này)
 */
export const buildNganHangSnapshot = (nganHang: TaiKhoanNganHang): DoiTuongSnapshot => ({
  id: nganHang.id,
  ma: nganHang.ma,
  ten: nganHang.ten,
  loai: 'NGAN_HANG_QUY',
});
```

- [ ] **Step 2.3: Build check + commit**

Run: `cd fe && npx tsc -b --noEmit 2>&1 | head -20` (hoặc `npm run build`)
Expected: không có lỗi type mới.

```bash
git add fe/src/types/index.ts fe/src/utils/snapshotBuilder.ts
git commit -m "feat(fe): snapshot đối tượng cho ngân hàng & quỹ (loai NGAN_HANG_QUY)"
```

---

### Task 3: Form Nhật ký chung load nganHangList + chiTietTheo vào TaiKhoanItem

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/init.state.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/init.handler.ts`

- [ ] **Step 3.1: init.state.ts — thêm chiTietTheo + nganHangList**

```typescript
// Import: thêm TaiKhoanNganHang vào import từ "@/types"
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien, QuyChuan, NhomKhuyenMai, NhomQuanLy, LoaiGiaoDich, HopDong, TaiKhoanNganHang } from "@/types";

// TaiKhoanItem: thêm field
export interface TaiKhoanItem {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
  chiTietTheo?: string;
}

// InitFormStates: thêm sau hopDongList:
  nganHangList: TaiKhoanNganHang[];
```

- [ ] **Step 3.2: init.handler.ts — load ngân hàng + map chiTietTheo**

Thêm import: `import { nganHangService } from "@/services/nganHangService";`

Trong `loadMasterData`, thêm vào destructuring + `Promise.all` (sau `hopDong` / `hopDongService.getAll()`):

```typescript
        hopDong,
        nganHangRes,
      ] = await Promise.all([
        // ... giữ nguyên các service hiện có ...
        hopDongService.getAll(),
        nganHangService.getPaginated({ limit: 500 }),
      ]);
```

Sửa mapping `taiKhoanList` (thêm `chiTietTheo`):

```typescript
      this.setState(
        "taiKhoanList",
        taiKhoanLeaf.map((tk) => ({
          ma: tk.ma,
          ten: tk.ten,
          loai: tk.loai,
          nhom: tk.nhom,
          chiTietTheo: tk.chiTietTheo,
        }))
      );
```

Thêm sau `this.setState("hopDongList", hopDong);`:

```typescript
      this.setState("nganHangList", nganHangRes.data);
```

Trong `initializeDefaultStates()` thêm:

```typescript
    this.setState("nganHangList", []);
```

- [ ] **Step 3.3: Build check + commit**

Run: `cd fe && npx tsc -b --noEmit 2>&1 | head -20`
Expected: pass.

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/
git commit -m "feat(fe): form NKC load danh mục ngân hàng & chiTietTheo của tài khoản"
```

---

### Task 4: ChiTietTable — filter động, disable, clear khi đổi TK

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-components/chi-tiet-table/ChiTietTable.tsx`

- [ ] **Step 4.1: Thêm imports + state**

```typescript
// Thêm vào import từ "@/types": TaiKhoanNganHang
// Thêm vào import từ "@/utils/snapshotBuilder": buildNganHangSnapshot
// Thêm import mới:
import { getDoiTuongSelectConfig, getSelectedDoiTuongLoai } from "../../doiTuongConfig";

// Trong component, sau dòng [doiTuongList]:
const [nganHangList] = useNhatKyChungFormState("nganHangList", []);
```

- [ ] **Step 4.2: Sửa `handleDoiTuongChange` và `handleDoiTuong2Change` tìm ở cả 2 danh mục**

Thay toàn bộ body 2 hàm (giữ nguyên tên/chữ ký). Mẫu cho `handleDoiTuongChange` — `handleDoiTuong2Change` giống hệt nhưng dùng `"doiTuong2Id"` / `"doiTuong2Snapshot"`:

```typescript
  const handleDoiTuongChange = (key: string, doiTuongId: string | undefined) => {
    handleUpdateField(key, "doiTuongId", doiTuongId);
    if (!doiTuongId) {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "doiTuongSnapshot",
        snapshot: {},
      });
      return;
    }
    // Đối tượng thường hoặc ngân hàng/quỹ (TK chiTietTheo = NGAN_HANG_QUY)
    const doiTuong = (doiTuongList as DoiTuong[]).find((d) => d.id === doiTuongId);
    const nganHang = (nganHangList as TaiKhoanNganHang[]).find((nh) => nh.id === doiTuongId);
    const snapshot = doiTuong
      ? buildDoiTuongSnapshot(doiTuong)
      : nganHang
        ? buildNganHangSnapshot(nganHang)
        : undefined;
    if (snapshot) {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "doiTuongSnapshot",
        snapshot,
      });
    }
  };
```

- [ ] **Step 4.3: Thêm `handleTaiKhoanChange` (clear đối tượng sai loại khi đổi TK)**

Thêm sau `handleDoiTuong2Change`:

```typescript
  // Đổi TK → nếu đối tượng đang chọn không khớp chiTietTheo mới thì clear
  const handleTaiKhoanChange = (
    record: ChungTuChiTiet,
    field: "taiKhoanNo" | "taiKhoanCo",
    ma: string | undefined
  ) => {
    handleUpdateField(record.key, field, ma || "");
    const doiTuongField = field === "taiKhoanNo" ? "doiTuongId" : "doiTuong2Id";
    const snapshotField = field === "taiKhoanNo" ? "doiTuongSnapshot" : "doiTuong2Snapshot";
    const currentId = field === "taiKhoanNo" ? record.doiTuongId : record.doiTuong2Id;
    if (!currentId) return;
    const tk = (taiKhoanList as TaiKhoanItem[]).find((t) => t.ma === ma);
    const currentLoai = getSelectedDoiTuongLoai(
      currentId,
      doiTuongList as DoiTuong[],
      nganHangList as TaiKhoanNganHang[]
    );
    if (currentLoai !== tk?.chiTietTheo) {
      handleUpdateField(record.key, doiTuongField, undefined);
      handler.executeEvent("updateChiTietSnapshot", {
        key: record.key,
        snapshotField,
        snapshot: {},
      });
    }
  };
```

- [ ] **Step 4.4: Cột TK Nợ / TK Có dùng handler mới**

Trong cột "TK Nợ", thay `onChange={(v) => handleUpdateField(record.key, "taiKhoanNo", v || "")}` bằng `onChange={(v) => handleTaiKhoanChange(record, "taiKhoanNo", v)}`. Tương tự cột "TK Có" với `"taiKhoanCo"`.

- [ ] **Step 4.5: Cột Đối tượng nợ / Đối tượng có filter theo chiTietTheo**

Thay render cột "Đối tượng nợ":

```typescript
    {
      title: "Đối tượng nợ",
      dataIndex: "doiTuongId",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => {
        const tkNo = (taiKhoanList as TaiKhoanItem[]).find((t) => t.ma === record.taiKhoanNo);
        const cfg = getDoiTuongSelectConfig(
          tkNo?.chiTietTheo,
          doiTuongList as DoiTuong[],
          nganHangList as TaiKhoanNganHang[]
        );
        return (
          <Select
            size="small"
            showSearch
            allowClear
            placeholder={cfg.disabled ? "—" : "Chọn"}
            optionFilterProp="label"
            value={value || undefined}
            onChange={(v) => handleDoiTuongChange(record.key, v)}
            onFocus={() => { activeRowRef.current = index; }}
            options={cfg.options}
            disabled={cfg.disabled}
            className="w-full excel-cell-input"
            variant="borderless"
            popupMatchSelectWidth={280}
          />
        );
      },
    },
```

Cột "Đối tượng có" tương tự với `record.taiKhoanCo`, `handleDoiTuong2Change`, `dataIndex: "doiTuong2Id"`.

- [ ] **Step 4.6: Build + verify thủ công**

Run: `cd fe && npx tsc -b --noEmit 2>&1 | head -20` → pass.
Manual (nếu chạy được dev server với BE): TK Nợ = 112 → dropdown Đối tượng nợ chỉ hiện ngân hàng/quỹ; TK = 131 → chỉ khách hàng; TK 511 (không khai) → ô disable; đổi 112 → 131 thì đối tượng ngân hàng đã chọn bị clear.

- [ ] **Step 4.7: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/form-components/chi-tiet-table/ChiTietTable.tsx
git commit -m "feat(fe): bảng hạch toán filter đối tượng theo chiTietTheo, hỗ trợ ngân hàng & quỹ"
```

---

### Task 5: Load chứng từ cũ để sửa — map id ngân hàng

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/load-data/load-data.handler.ts`

- [ ] **Step 5.1: Sửa `mapItemToChiTiet`**

Thêm `TaiKhoanNganHang` vào import từ `@/types`. Trong `mapItemToChiTiet`, sau dòng lấy `hopDongList`, thêm:

```typescript
    const nganHangList = (this.getState("nganHangList") as TaiKhoanNganHang[]) || [];
```

Thay 2 dòng lookup `doiTuong` / `doiTuong2`:

```typescript
    // Đối tượng có thể là ngân hàng/quỹ (loai NGAN_HANG_QUY) → tìm ở danh mục tương ứng
    const findDoiTuongId = (snap?: { ma?: string; loai?: string }): string | undefined => {
      if (!snap?.ma) return undefined;
      if (snap.loai === "NGAN_HANG_QUY") {
        return nganHangList.find((nh) => nh.ma === snap.ma)?.id;
      }
      return doiTuongList.find((d) => d.ma === snap.ma)?.id;
    };
    const doiTuongId = findDoiTuongId(danhMuc?.doiTuong);
    const doiTuong2Id = findDoiTuongId(danhMuc?.doiTuong2);
```

(Xoá 2 const `doiTuong` / `doiTuong2` cũ.) Trong object return, thay:

```typescript
      doiTuongId: doiTuongId,
      doiTuong2Id: doiTuong2Id,
```

- [ ] **Step 5.2: Build + commit**

Run: `cd fe && npx tsc -b --noEmit 2>&1 | head -20` → pass.

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/load-data/load-data.handler.ts
git commit -m "fix(fe): sửa chứng từ cũ map đúng id đối tượng ngân hàng & quỹ"
```

---

### Task 6: Modal sửa nhanh (EntryFormModal/AllocationFields) cùng logic filter

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data/master-data.state.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data/master-data.handler.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/init/init.handler.ts` (list page — map `chiTietTheo` trong `loadTaiKhoanList`)
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/entry-form-modal/AllocationFields.tsx`

- [ ] **Step 6.1: List handler load nganHangList**

`master-data.state.ts`: thêm `nganHangList: TaiKhoanNganHang[];` vào interface states (import `TaiKhoanNganHang` từ `@/types` — xem cấu trúc file hiện có, cùng pattern module augmentation như các list khác).

`master-data.handler.ts`: thêm import `import { nganHangService } from "@/services/nganHangService";`, thêm `nganHangService.getPaginated({ limit: 500 })` vào `Promise.all` (destructure thành `nganHangRes`), và `this.setState("nganHangList", nganHangRes.data);` cạnh các setState khác.

- [ ] **Step 6.2: List page `loadTaiKhoanList` map chiTietTheo**

Trong `handler/sub-handler/init/init.handler.ts` (list page), hàm `loadTaiKhoanList`, thêm `chiTietTheo: tk.chiTietTheo,` vào object map:

```typescript
        leafAccounts.map((tk) => ({
          ma: tk.ma,
          ten: tk.ten,
          loai: tk.loai,
          nhom: tk.nhom,
          chiTietTheo: tk.chiTietTheo,
        }))
```

- [ ] **Step 6.3: AllocationFields filter theo TK của form**

Trong `AllocationFields.tsx`:

```typescript
// Thêm import:
import { getDoiTuongSelectConfig } from "../../doiTuongConfig";
import { buildNganHangSnapshot } from "@/utils/snapshotBuilder"; // thêm vào block import sẵn có
import { TaiKhoanNganHang } from "@/types"; // thêm vào block import sẵn có

// Trong component, thêm state + watch:
const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);
const [nganHangList] = useNhatKyChungState("nganHangList", []);
const taiKhoanNo = Form.useWatch("taiKhoanNo", form);
const taiKhoanCo = Form.useWatch("taiKhoanCo", form);

const tkNoInfo = taiKhoanList?.find((t: { ma: string; chiTietTheo?: string }) => t.ma === taiKhoanNo);
const tkCoInfo = taiKhoanList?.find((t: { ma: string; chiTietTheo?: string }) => t.ma === taiKhoanCo);
const doiTuongNoCfg = getDoiTuongSelectConfig(tkNoInfo?.chiTietTheo, doiTuongList ?? [], nganHangList ?? []);
const doiTuongCoCfg = getDoiTuongSelectConfig(tkCoInfo?.chiTietTheo, doiTuongList ?? [], nganHangList ?? []);
```

Sửa `handleDoiTuongChange` (và tương tự `handleDoiTuong2Change`) tìm cả ngân hàng:

```typescript
  const handleDoiTuongChange = (value: string | undefined) => {
    handler.executeEvent("clearFieldChange", { field: "doiTuong" });
    if (!value) {
      form.setFieldsValue({ doiTuongSnapshot: undefined });
      return;
    }
    const doiTuong = doiTuongList?.find((d: DoiTuong) => d.id === value);
    if (doiTuong) {
      form.setFieldsValue({ doiTuongSnapshot: buildDoiTuongSnapshot(doiTuong) });
      return;
    }
    const nganHang = nganHangList?.find((nh: TaiKhoanNganHang) => nh.id === value);
    if (nganHang) {
      form.setFieldsValue({ doiTuongSnapshot: buildNganHangSnapshot(nganHang) });
    }
  };
```

Sửa 2 Form.Item Select "Đối tượng nợ"/"Đối tượng có": thay `options={doiTuongList?.map(...)}` bằng `options={doiTuongNoCfg.options}` + `disabled={doiTuongNoCfg.disabled}` (tương ứng `doiTuongCoCfg` cho bên có).

- [ ] **Step 6.4: Build + commit**

Run: `cd fe && npx tsc -b --noEmit 2>&1 | head -20` → pass.

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/
git commit -m "feat(fe): modal sửa nhanh NKC filter đối tượng theo chiTietTheo"
```

---

### Task 7: BE voucher — bên Có ưu tiên doiTuong2 trong aggregation

**Files:**
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts` (hàm `aggregateBalanceByDoiTuong`, facet `coEntries`)

- [ ] **Step 7.1: Sửa facet coEntries**

Hiện tại cả 2 facet group theo `$danhMuc.doiTuong`. Bên Có phải ưu tiên `doiTuong2` (FE lưu "Đối tượng có" vào đó), fallback `doiTuong` cho dữ liệu cũ. Thay pipeline `coEntries`:

```typescript
          coEntries: [
            { $match: { 'danhMuc.taiKhoanCo.ma': { $exists: true, $ne: null } } },
            // "Đối tượng có" nằm ở doiTuong2; dữ liệu cũ chỉ có doiTuong → fallback
            { $addFields: { _dtCo: { $ifNull: ['$danhMuc.doiTuong2', '$danhMuc.doiTuong'] } } },
            {
              $group: {
                _id: { ma: '$danhMuc.taiKhoanCo.ma', dt: '$_dtCo.ma' },
                doiTuongTen: { $first: '$_dtCo.ten' },
                doiTuongLoai: { $first: '$_dtCo.loai' },
                priorCo: {
                  $sum: { $cond: [{ $lt: ['$ngay', startDate] }, '$soTien', 0] },
                },
                periodCo: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$ngay', startDate] }, { $lte: ['$ngay', endDate] }] },
                      '$soTien',
                      0,
                    ],
                  },
                },
              },
            },
          ],
```

- [ ] **Step 7.2: Build + test hiện có**

Run: `cd be && yarn build 2>&1 | tail -5` → pass.
Run: `cd be && yarn test doi-tuong-aggregation` → PASS (helper merge không đổi).

- [ ] **Step 7.3: Commit**

```bash
git add be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts
git commit -m "fix(voucher): aggregation theo đối tượng bên Có ưu tiên doiTuong2"
```

---

### Task 8: BE reporting — xổ chi tiết NGAN_HANG_QUY (TDD)

**Files:**
- Modify: `be/apps/reporting-service/src/so-cai/so-cai.service.ts` (Set `DOI_TUONG_CHI_TIET_TYPES` ~line 123 + comment)
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts` (Set ~line 70 + `buildDoiTuongSoTien` ~line 105)
- Test: `be/apps/reporting-service/src/so-cai/so-cai.service.spec.ts`, `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`

- [ ] **Step 8.1: Viết test fail — buildDoiTuongRows với NGAN_HANG_QUY**

Thêm vào `so-cai.service.spec.ts` (theo style các test hiện có trong file — dùng `buildDoiTuongRows` đã export):

```typescript
  describe('buildDoiTuongRows với NGAN_HANG_QUY', () => {
    it('xổ chi tiết TK 112 theo từng ngân hàng', () => {
      const rows = buildDoiTuongRows(
        'TAI_SAN',
        [
          {
            doiTuongMa: 'VCB01', doiTuongTen: 'Vietcombank', doiTuongLoai: 'NGAN_HANG_QUY',
            priorNo: 0, priorCo: 0, periodNo: 500, periodCo: 200,
          },
          // đối tượng sai loại → gộp "Chưa xác định đối tượng"
          {
            doiTuongMa: 'KH001', doiTuongTen: 'Cty A', doiTuongLoai: 'KHACH_HANG',
            priorNo: 0, priorCo: 0, periodNo: 100, periodCo: 0,
          },
        ],
        [
          { doiTuongMa: 'VCB01', doiTuongTen: 'Vietcombank', chiTietType: 'NGAN_HANG_QUY', duNo: 1000, duCo: 0 },
        ],
        'NGAN_HANG_QUY',
      );
      const vcb = rows.find((r) => r.ma === 'VCB01');
      expect(vcb).toBeDefined();
      expect(vcb!.noDauKy).toBe(1000);
      expect(vcb!.noPhatSinh).toBe(500);
      expect(vcb!.coPhatSinh).toBe(200);
      const chuaXacDinh = rows.find((r) => r.ma === '');
      expect(chuaXacDinh).toBeDefined();
      expect(chuaXacDinh!.noPhatSinh).toBe(100);
    });
  });
```

(Hàm pure đã hỗ trợ expectedLoai bất kỳ — test này pass sẵn; giá trị của nó là chốt hành vi trước khi mở Set. Nếu pass ngay từ đầu thì vẫn giữ.)

- [ ] **Step 8.2: Thêm NGAN_HANG_QUY vào 2 Set**

`so-cai.service.ts` — thay Set + cập nhật comment:

```typescript
/**
 * Các loại "Chi tiết theo" được xổ chi tiết theo đối tượng.
 * NGAN_HANG_QUY: chứng từ lưu ngân hàng/quỹ vào danhMuc.doiTuong/doiTuong2
 * với loai='NGAN_HANG_QUY' (từ form NKC); số dư đầu kỳ có chiTietType tương ứng.
 * Nguồn chân lý: enum ChiTietTheo trong tai-khoan.entity.ts.
 */
export const DOI_TUONG_CHI_TIET_TYPES = new Set([
  'KHACH_HANG',
  'NHA_CUNG_CAP',
  'NHAN_VIEN',
  'NHA_THAU',
  'NGAN_HANG_QUY',
]);
```

`bao-cao.service.ts` — thay Set tương tự (comment ngắn cùng ý).

- [ ] **Step 8.3: bao-cao `buildDoiTuongSoTien` — bên Có ưu tiên doiTuong2**

Thay vòng `for (const v of vouchers)` (hiện ~line 105-113):

```typescript
  for (const v of vouchers) {
    const maTKNo = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo;
    const maTKCo = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
    if (maTKNo === maTaiKhoan) {
      const dt = v.danhMuc?.doiTuong;
      const dtMa = dt?.ma && dt?.loai === expectedLoai ? dt.ma : '';
      add(dtMa, dtMa ? dt?.ten ?? '' : '', type === 'NO' ? v.soTien : -v.soTien);
    }
    if (maTKCo === maTaiKhoan) {
      // "Đối tượng có" ở doiTuong2; dữ liệu cũ chỉ có doiTuong → fallback
      const dt = v.danhMuc?.doiTuong2 ?? v.danhMuc?.doiTuong;
      const dtMa = dt?.ma && dt?.loai === expectedLoai ? dt.ma : '';
      add(dtMa, dtMa ? dt?.ten ?? '' : '', type === 'CO' ? v.soTien : -v.soTien);
    }
  }
```

Lưu ý: `NhatKyChungEntry` (type dùng trong file) phải có `doiTuong2` trong `danhMuc` — nếu thiếu, thêm `doiTuong2?: { ma?: string; ten?: string; loai?: string };` vào type đó (cùng file hoặc nơi nó được khai báo).

- [ ] **Step 8.4: Test bao-cao — thêm case vào `bao-cao.helper.spec.ts`**

```typescript
  it('buildDoiTuongSoTien: bên Có lấy đối tượng từ doiTuong2, fallback doiTuong', () => {
    const vouchers = [
      // chi tiền: Có 112, ngân hàng nằm ở doiTuong2
      {
        soTien: 300,
        danhMuc: {
          taiKhoanNo: { ma: '331' }, taiKhoanCo: { ma: '112' },
          doiTuong: { ma: 'NCC01', ten: 'NCC', loai: 'NHA_CUNG_CAP' },
          doiTuong2: { ma: 'VCB01', ten: 'Vietcombank', loai: 'NGAN_HANG_QUY' },
        },
      },
      // dữ liệu cũ: chỉ có doiTuong
      {
        soTien: 200,
        danhMuc: {
          taiKhoanNo: { ma: '642' }, taiKhoanCo: { ma: '112' },
          doiTuong: { ma: 'VCB01', ten: 'Vietcombank', loai: 'NGAN_HANG_QUY' },
        },
      },
    ] as never[];
    const rows = buildDoiTuongSoTien(vouchers, '112', 'NO', [], 'NGAN_HANG_QUY');
    const vcb = rows.find((r) => r.ma === 'VCB01');
    expect(vcb).toBeDefined();
    expect(vcb!.soTien).toBe(-500); // tiền ra khỏi 112 (type NO, bên Có → trừ)
  });
```

(Chỉnh import/type-cast theo đúng cấu trúc spec hiện có trong file — đọc file spec trước khi thêm.)

- [ ] **Step 8.5: Chạy test + build**

Run: `cd be && yarn test so-cai && yarn test bao-cao` → PASS.
Run: `cd be && yarn build 2>&1 | tail -3` → pass.

- [ ] **Step 8.6: Commit**

```bash
git add be/apps/reporting-service/
git commit -m "feat(reporting): xổ chi tiết TK theo ngân hàng & quỹ (NGAN_HANG_QUY)"
```

---

## PHẦN 2 — fieldRules: Bắt buộc / Cảnh báo / Không bắt buộc

### Task 9: Entity + DTO fieldRules

**Files:**
- Modify: `be/libs/entities/src/master-data/tai-khoan.entity.ts`
- Modify: `be/apps/master-data-service/src/tai-khoan/dto/create-tai-khoan.dto.ts`
- Modify: `be/libs/dto/src/master-data/tai-khoan.dto.ts` (TaiKhoanResponse)
- Modify: `fe/src/types/index.ts` (interface TaiKhoan)

- [ ] **Step 9.1: Entity**

Thêm vào `tai-khoan.entity.ts` (sau enum `ChiTietTheo`):

```typescript
// 8 trường phân bổ trên dòng hạch toán có thể cấu hình mức nhập liệu
export const FIELD_RULE_KEYS = [
  'doiTuong',
  'duAn',
  'boPhan',
  'doi',
  'nhanVien',
  'sanPham',
  'dongTien',
  'khoanMuc',
] as const;
export type FieldRuleKey = (typeof FIELD_RULE_KEYS)[number];
// Không khai báo = không bắt buộc
export type FieldRuleLevel = 'BAT_BUOC' | 'CANH_BAO';
export type FieldRules = Partial<Record<FieldRuleKey, FieldRuleLevel>>;
```

Thêm column vào class `TaiKhoan` (sau `chiTietTheo`):

```typescript
  @Column({ type: 'simple-json', nullable: true })
  fieldRules?: FieldRules | null;
```

- [ ] **Step 9.2: DTO master-data**

`create-tai-khoan.dto.ts`: thêm `IsObject` vào import class-validator, thêm `FieldRules` vào import `@app/entities`, thêm field:

```typescript
  @IsObject()
  @IsOptional()
  fieldRules?: FieldRules | null;
```

(`UpdateTaiKhoanDto` là PartialType → tự có. `sanitizeUpdateDto` pass-through object → không cần sửa.)

`be/libs/dto/src/master-data/tai-khoan.dto.ts`: thêm vào `TaiKhoanResponse`:

```typescript
  fieldRules?: Record<string, 'BAT_BUOC' | 'CANH_BAO'> | null;
```

- [ ] **Step 9.3: FE type**

`fe/src/types/index.ts`, interface `TaiKhoan` thêm:

```typescript
  fieldRules?: Partial<Record<
    'doiTuong' | 'duAn' | 'boPhan' | 'doi' | 'nhanVien' | 'sanPham' | 'dongTien' | 'khoanMuc',
    'BAT_BUOC' | 'CANH_BAO'
  >> | null;
```

- [ ] **Step 9.4: Build + commit**

Run: `cd be && yarn build 2>&1 | tail -3` và `cd fe && npx tsc -b --noEmit 2>&1 | head -10` → pass.

```bash
git add be/libs/entities/src/master-data/tai-khoan.entity.ts be/apps/master-data-service/src/tai-khoan/dto/create-tai-khoan.dto.ts be/libs/dto/src/master-data/tai-khoan.dto.ts fe/src/types/index.ts
git commit -m "feat(be): TaiKhoan.fieldRules — cấu hình mức nhập liệu 8 trường phân bổ"
```

---

### Task 10: UI Setting — section "Quy tắc nhập chứng từ" trong modal tài khoản

**Files:**
- Modify: `fe/src/pages/danh-muc/tai-khoan/TaiKhoanPage.tsx`

- [ ] **Step 10.1: Thêm constants + zod**

Sau `chiTietTheoOptions` thêm:

```typescript
// 8 trường phân bổ cấu hình được mức nhập liệu trên dòng hạch toán
const FIELD_RULE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "doiTuong", label: "Đối tượng" },
  { key: "duAn", label: "Dự án" },
  { key: "boPhan", label: "Bộ phận" },
  { key: "doi", label: "Đội thi công" },
  { key: "nhanVien", label: "Nhân viên" },
  { key: "sanPham", label: "Sản phẩm" },
  { key: "dongTien", label: "Dòng tiền" },
  { key: "khoanMuc", label: "Khoản mục" },
];

const fieldRuleLevelOptions = [
  { value: "CANH_BAO", label: "Cảnh báo" },
  { value: "BAT_BUOC", label: "Bắt buộc" },
];
```

Thêm vào `taiKhoanSchema` (sau `moTa`):

```typescript
  fieldRules: z
    .record(z.string(), z.enum(["BAT_BUOC", "CANH_BAO"]).nullable().optional())
    .nullable()
    .optional(),
```

- [ ] **Step 10.2: Payload — làm sạch fieldRules trước khi gửi**

Trong `handleSubmit`, sửa `payload`:

```typescript
      // Bỏ các trường không chọn mức; rỗng → null để BE xoá cấu hình cũ
      const fieldRulesEntries = Object.entries(validation.data.fieldRules ?? {}).filter(
        ([, v]) => v === "BAT_BUOC" || v === "CANH_BAO"
      );
      const payload = {
        ...validation.data,
        chiTietTheo: validation.data.chiTietTheo ?? null,
        fieldRules: fieldRulesEntries.length ? Object.fromEntries(fieldRulesEntries) : null,
      };
```

Lưu ý `openModal(record)`: `form.setFieldsValue({ ...record, moTa: record.moTa || '' })` đã tự đổ `fieldRules` object vào các Form.Item lồng tên `["fieldRules", key]` — antd hỗ trợ nested path. Với record không có fieldRules, thêm reset rõ ràng: trong `openModal`, nhánh edit sửa thành:

```typescript
      form.setFieldsValue({
        ...record,
        moTa: record.moTa || '',
        fieldRules: record.fieldRules || {},
      });
```

(nhánh thêm mới `form.resetFields()` đã đủ.)

- [ ] **Step 10.3: UI section trong Modal**

Thêm trước Form.Item "Mô tả":

```tsx
          <Form.Item label="Quy tắc nhập chứng từ" className="mb-3"
            tooltip="Bắt buộc: không cho lưu chứng từ nếu thiếu. Cảnh báo: hỏi xác nhận rồi vẫn cho lưu.">
            <Row gutter={[8, 4]}>
              {FIELD_RULE_FIELDS.map((f) => (
                <Col span={12} key={f.key}>
                  <div className="flex items-center justify-between gap-2">
                    <Text className="text-xs">{f.label}</Text>
                    <Form.Item name={["fieldRules", f.key]} noStyle>
                      <Select
                        size="small"
                        allowClear
                        placeholder="Không bắt buộc"
                        style={{ width: 130 }}
                        options={fieldRuleLevelOptions}
                      />
                    </Form.Item>
                  </div>
                </Col>
              ))}
            </Row>
          </Form.Item>
```

- [ ] **Step 10.4: Build + verify + commit**

Run: `cd fe && npx tsc -b --noEmit 2>&1 | head -10` → pass.
Manual: mở modal sửa TK 112, chọn Dự án = Bắt buộc, Đội thi công = Cảnh báo, lưu, mở lại → giá trị giữ nguyên.

```bash
git add fe/src/pages/danh-muc/tai-khoan/TaiKhoanPage.tsx
git commit -m "feat(fe): setting quy tắc nhập chứng từ (bắt buộc/cảnh báo) theo tài khoản"
```

---

### Task 11: FE validate fieldRules — hàm thuần (TDD)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.ts`
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.test.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/init.state.ts` (TaiKhoanItem + fieldRules)
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/init.handler.ts` (map fieldRules)

- [ ] **Step 11.1: Thêm fieldRules vào TaiKhoanItem + mapping**

`init.state.ts`:

```typescript
export interface TaiKhoanItem {
  ma: string;
  ten: string;
  loai: string;
  nhom: string;
  chiTietTheo?: string;
  fieldRules?: Partial<Record<string, "BAT_BUOC" | "CANH_BAO">> | null;
}
```

`init.handler.ts` — mapping taiKhoanList thêm `fieldRules: tk.fieldRules,`.

- [ ] **Step 11.2: Viết test fail**

```typescript
// fe/src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.test.ts
import { describe, it, expect } from "vitest";
import { validateFieldRules, formatViolation } from "./fieldRulesValidation";
import { ChungTuChiTiet, TaiKhoanItem } from "./form-handler/sub-handler/init/init.state";

const taiKhoanList: TaiKhoanItem[] = [
  {
    ma: "112", ten: "Tiền gửi NH", loai: "TAI_SAN", nhom: "NO",
    chiTietTheo: "NGAN_HANG_QUY",
    fieldRules: { duAn: "BAT_BUOC", doi: "CANH_BAO", doiTuong: "BAT_BUOC" },
  },
  { ma: "131", ten: "Phải thu KH", loai: "TAI_SAN", nhom: "LUONG_TINH", fieldRules: { duAn: "CANH_BAO" } },
  { ma: "511", ten: "Doanh thu", loai: "DOANH_THU", nhom: "CO" },
];

const line = (over: Partial<ChungTuChiTiet>): ChungTuChiTiet => ({
  key: "k1", taiKhoanNo: "112", taiKhoanCo: "511", soTien: 100, ...over,
});

describe("validateFieldRules", () => {
  it("thiếu trường BAT_BUOC → violation mức BAT_BUOC", () => {
    const violations = validateFieldRules([line({})], taiKhoanList);
    const duAn = violations.find((v) => v.field === "duAn");
    expect(duAn).toMatchObject({ level: "BAT_BUOC", taiKhoanMa: "112", lineIndex: 0 });
  });

  it("đã nhập đủ → không có violation cho trường đó", () => {
    const violations = validateFieldRules(
      [line({ duAnId: "da1", doiTuongId: "nh1", doiId: "d1" })],
      taiKhoanList,
    );
    expect(violations).toEqual([]);
  });

  it("thiếu trường CANH_BAO → violation mức CANH_BAO, không chặn", () => {
    const violations = validateFieldRules(
      [line({ duAnId: "da1", doiTuongId: "nh1" })],
      taiKhoanList,
    );
    expect(violations).toEqual([
      expect.objectContaining({ field: "doi", level: "CANH_BAO" }),
    ]);
  });

  it("trường chung 2 TK đều có rule → lấy mức nặng hơn (BAT_BUOC)", () => {
    // 112 duAn=BAT_BUOC (nợ), 131 duAn=CANH_BAO (có) → BAT_BUOC
    const violations = validateFieldRules(
      [line({ taiKhoanCo: "131", doiTuongId: "nh1" })],
      taiKhoanList,
    );
    const duAn = violations.filter((v) => v.field === "duAn");
    expect(duAn).toHaveLength(1);
    expect(duAn[0].level).toBe("BAT_BUOC");
  });

  it("rule doiTuong: TK Nợ kiểm doiTuongId, TK Có kiểm doiTuong2Id", () => {
    // TK Có = 112 có doiTuong=BAT_BUOC → thiếu doiTuong2Id phải báo
    const violations = validateFieldRules(
      [line({ taiKhoanNo: "511", taiKhoanCo: "112", duAnId: "da1", doiId: "d1" })],
      taiKhoanList,
    );
    const dt = violations.find((v) => v.field === "doiTuong");
    expect(dt).toMatchObject({ level: "BAT_BUOC", taiKhoanMa: "112" });
  });

  it("TK không có fieldRules → không violation", () => {
    const violations = validateFieldRules(
      [{ key: "k", taiKhoanNo: "511", taiKhoanCo: "511", soTien: 1 }],
      taiKhoanList,
    );
    expect(violations).toEqual([]);
  });
});

describe("formatViolation", () => {
  it("format thông điệp tiếng Việt theo dòng", () => {
    expect(
      formatViolation({ lineIndex: 1, field: "duAn", fieldLabel: "Dự án", level: "BAT_BUOC", taiKhoanMa: "112" }),
    ).toBe("Dòng 2: TK 112 yêu cầu bắt buộc nhập Dự án");
  });
});
```

- [ ] **Step 11.3: Chạy test, xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 11.4: Implementation**

```typescript
// fe/src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.ts
import { ChungTuChiTiet, TaiKhoanItem } from "./form-handler/sub-handler/init/init.state";

export type FieldRuleLevel = "BAT_BUOC" | "CANH_BAO";

export interface FieldRuleViolation {
  lineIndex: number;
  field: string;
  fieldLabel: string;
  level: FieldRuleLevel;
  taiKhoanMa: string;
}

export const FIELD_RULE_LABELS: Record<string, string> = {
  doiTuong: "Đối tượng",
  duAn: "Dự án",
  boPhan: "Bộ phận",
  doi: "Đội thi công",
  nhanVien: "Nhân viên",
  sanPham: "Sản phẩm",
  dongTien: "Dòng tiền",
  khoanMuc: "Khoản mục",
};

// Trường cấp dòng (không phải doiTuong) → field id tương ứng trên ChungTuChiTiet
const FIELD_TO_LINE_KEY: Record<string, keyof ChungTuChiTiet> = {
  duAn: "duAnId",
  boPhan: "boPhanId",
  doi: "doiId",
  nhanVien: "nhanVienId",
  sanPham: "sanPhamId",
  dongTien: "dongTienId",
  khoanMuc: "khoanMucId",
};

const heavier = (a?: FieldRuleLevel, b?: FieldRuleLevel): FieldRuleLevel | undefined =>
  a === "BAT_BUOC" || b === "BAT_BUOC" ? "BAT_BUOC" : a ?? b;

/**
 * Kiểm tra fieldRules của TK Nợ + TK Có trên từng dòng hạch toán.
 * - doiTuong: TK Nợ kiểm doiTuongId, TK Có kiểm doiTuong2Id (rule riêng từng bên).
 * - Trường còn lại là cấp dòng → mức = max(rule TK Nợ, rule TK Có).
 */
export function validateFieldRules(
  chiTietList: ChungTuChiTiet[],
  taiKhoanList: TaiKhoanItem[],
): FieldRuleViolation[] {
  const violations: FieldRuleViolation[] = [];
  const byMa = new Map(taiKhoanList.map((tk) => [tk.ma, tk]));

  chiTietList.forEach((line, lineIndex) => {
    const tkNo = byMa.get(line.taiKhoanNo);
    const tkCo = byMa.get(line.taiKhoanCo);

    // doiTuong theo từng bên
    const checkDoiTuong = (tk: TaiKhoanItem | undefined, filled: boolean) => {
      const level = tk?.fieldRules?.doiTuong;
      if (tk && level && !filled) {
        violations.push({
          lineIndex,
          field: "doiTuong",
          fieldLabel: FIELD_RULE_LABELS.doiTuong,
          level,
          taiKhoanMa: tk.ma,
        });
      }
    };
    checkDoiTuong(tkNo, Boolean(line.doiTuongId));
    checkDoiTuong(tkCo, Boolean(line.doiTuong2Id));

    // Trường cấp dòng: gộp mức 2 TK
    for (const [field, lineKey] of Object.entries(FIELD_TO_LINE_KEY)) {
      const level = heavier(
        tkNo?.fieldRules?.[field] as FieldRuleLevel | undefined,
        tkCo?.fieldRules?.[field] as FieldRuleLevel | undefined,
      );
      if (!level || line[lineKey]) continue;
      const sourceTk =
        (tkNo?.fieldRules?.[field] as FieldRuleLevel | undefined) === level ? tkNo : tkCo;
      violations.push({
        lineIndex,
        field,
        fieldLabel: FIELD_RULE_LABELS[field] ?? field,
        level,
        taiKhoanMa: sourceTk?.ma ?? "",
      });
    }
  });

  return violations;
}

export function formatViolation(v: FieldRuleViolation): string {
  const yeuCau = v.level === "BAT_BUOC" ? "yêu cầu bắt buộc nhập" : "khuyến nghị nhập";
  return `Dòng ${v.lineIndex + 1}: TK ${v.taiKhoanMa} ${yeuCau} ${v.fieldLabel}`;
}
```

- [ ] **Step 11.5: Chạy test PASS + build**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.test.ts` → PASS (7 tests).
Run: `cd fe && npx tsc -b --noEmit 2>&1 | head -10` → pass.

- [ ] **Step 11.6: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.ts fe/src/pages/chung-tu/nhat-ky-chung/fieldRulesValidation.test.ts fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/init/
git commit -m "feat(fe): validate fieldRules trên dòng hạch toán (bắt buộc/cảnh báo)"
```

---

### Task 12: Tích hợp vào submit form NKC

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/submit/submit.handler.ts`

- [ ] **Step 12.1: Chặn BAT_BUOC, confirm CANH_BAO trong `submitForm`**

Thêm imports:

```typescript
import { Modal } from "antd"; // gộp vào import antd sẵn có: { message, Modal }
import { validateFieldRules, formatViolation } from "../../../fieldRulesValidation";
```

Trong `submitForm`, ngay sau block `if (!validation.valid) {...}` và trước `const header = ...`, thêm:

```typescript
    // Kiểm tra quy tắc nhập liệu theo cấu hình tài khoản (fieldRules)
    const chiTietForRules = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
    const taiKhoanForRules = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];
    const ruleViolations = validateFieldRules(chiTietForRules, taiKhoanForRules);
    const blocking = ruleViolations.filter((v) => v.level === "BAT_BUOC");
    if (blocking.length > 0) {
      blocking.forEach((v) => message.error(formatViolation(v)));
      return;
    }
    const warnings = ruleViolations.filter((v) => v.level === "CANH_BAO");
    if (warnings.length > 0) {
      const proceed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: "Cảnh báo thiếu thông tin",
          content: (
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {warnings.map((v, i) => (
                <li key={i}>{formatViolation(v)}</li>
              ))}
            </ul>
          ),
          okText: "Vẫn lưu",
          cancelText: "Quay lại",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!proceed) return;
    }
```

**Lưu ý:** file hiện là `.ts` — JSX trong `content` đòi `.tsx`. Hai lựa chọn: (a) đổi tên file thành `submit.handler.tsx` và cập nhật import trong `form-handler/sub-handler/index.ts`, hoặc (b) dùng chuỗi thuần: `content: warnings.map(formatViolation).join("\n")` kèm `<Modal>` styles mặc định. **Chọn (b)** — đơn giản, không đụng cấu trúc:

```typescript
          content: warnings.map((v) => formatViolation(v)).join("\n"),
```

(antd Modal.confirm render string với line-break bị gộp — chấp nhận được; hoặc dùng `React.createElement` nếu muốn xuống dòng. Giữ (b) với join "; ".)

```typescript
          content: warnings.map((v) => formatViolation(v)).join("; "),
```

- [ ] **Step 12.2: Build + verify thủ công**

Run: `cd fe && npx tsc -b --noEmit 2>&1 | head -10` → pass.
Manual: cấu hình 112 {duAn: BAT_BUOC, doi: CANH_BAO} → tạo chứng từ Nợ 112 thiếu dự án → lưu bị chặn + message lỗi; nhập dự án, thiếu đội → dialog xác nhận, "Vẫn lưu" thì lưu thành công.

- [ ] **Step 12.3: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/submit/submit.handler.ts
git commit -m "feat(fe): chặn lưu khi thiếu trường bắt buộc, xác nhận khi cảnh báo"
```

---

### Task 13: BE enforce BAT_BUOC khi tạo/sửa chứng từ (TDD)

**Files:**
- Create: `be/apps/voucher-service/src/shared/field-rules-validation.service.ts`
- Create: `be/apps/voucher-service/src/shared/field-rules-validation.service.spec.ts`
- Modify: `be/apps/voucher-service/src/shared/index.ts` (export thêm)
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.module.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.controller.ts`

- [ ] **Step 13.1: Viết test fail**

```typescript
// be/apps/voucher-service/src/shared/field-rules-validation.service.spec.ts
import { BadRequestException } from '@nestjs/common';
import { FieldRulesValidationService } from './field-rules-validation.service';
import { ServiceClient } from '@app/service-client';

describe('FieldRulesValidationService', () => {
  const makeService = (accounts: unknown, success = true) => {
    const serviceClient = {
      get: jest.fn().mockResolvedValue({ success, data: accounts }),
    } as unknown as ServiceClient;
    return { service: new FieldRulesValidationService(serviceClient), serviceClient };
  };

  const accounts = [
    { ma: '112', fieldRules: { duAn: 'BAT_BUOC', doi: 'CANH_BAO', doiTuong: 'BAT_BUOC' } },
    { ma: '131', fieldRules: { duAn: 'CANH_BAO' } },
    { ma: '511' },
  ];

  it('thiếu trường BAT_BUOC → BadRequestException', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '112' }, taiKhoanCo: { ma: '511' } } }] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('đủ trường BAT_BUOC → pass (CANH_BAO không chặn)', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '112' },
              taiKhoanCo: { ma: '511' },
              doiTuong: { ma: 'VCB01' },
              duAn: { ma: 'DA01' },
              // doi (CANH_BAO) bỏ trống — không chặn ở BE
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).resolves.toBeUndefined();
  });

  it('rule doiTuong bên Có kiểm doiTuong2', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '511' },
              taiKhoanCo: { ma: '112' }, // 112 bên Có → cần doiTuong2 + duAn
              duAn: { ma: 'DA01' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Đối tượng/);
  });

  it('master-data không phản hồi → bỏ qua, không chặn', async () => {
    const { service } = makeService(null, false);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '112' }, taiKhoanCo: { ma: '511' } } }] as never,
      ),
    ).resolves.toBeUndefined();
  });

  it('item không có danhMuc → bỏ qua item đó', async () => {
    const { service } = makeService(accounts);
    await expect(service.validateItems([{}] as never, 'Bearer x')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 13.2: Chạy test FAIL**

Run: `cd be && yarn test field-rules-validation`
Expected: FAIL — file service chưa tồn tại.

- [ ] **Step 13.3: Implementation**

```typescript
// be/apps/voucher-service/src/shared/field-rules-validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import type { DanhMuc } from '@app/entities';

interface ItemWithDanhMuc {
  danhMuc?: DanhMuc;
}

interface TaiKhoanWithRules {
  ma: string;
  fieldRules?: Record<string, 'BAT_BUOC' | 'CANH_BAO'> | null;
}

const FIELD_LABELS: Record<string, string> = {
  doiTuong: 'Đối tượng',
  duAn: 'Dự án',
  boPhan: 'Bộ phận',
  doi: 'Đội thi công',
  nhanVien: 'Nhân viên',
  sanPham: 'Sản phẩm',
  dongTien: 'Dòng tiền',
  khoanMuc: 'Khoản mục',
};

/**
 * Enforce mức BAT_BUOC của TaiKhoan.fieldRules khi tạo/sửa chứng từ.
 * CANH_BAO chỉ xử lý ở FE (user đã xác nhận trước khi gửi).
 * Master-data không phản hồi → bỏ qua (không chặn nghiệp vụ), cùng quy ước
 * với AccountValidationService.
 */
@Injectable()
export class FieldRulesValidationService {
  constructor(private readonly serviceClient: ServiceClient) {}

  async validateItems(items: ItemWithDanhMuc[], authToken?: string): Promise<void> {
    const hasDanhMuc = items.some((i) => i.danhMuc);
    if (!hasDanhMuc) return;

    // /tai-khoan/leaf trả mảng phẳng các TK hạch toán được (không phân trang)
    const response = await this.serviceClient.get<TaiKhoanWithRules[]>(
      'master-data',
      '/tai-khoan/leaf',
      { headers: authToken ? { Authorization: authToken } : undefined },
    );
    if (!response.success || !Array.isArray(response.data)) return;

    const rulesByMa = new Map(
      response.data.filter((tk) => tk.fieldRules).map((tk) => [tk.ma, tk.fieldRules!]),
    );
    if (rulesByMa.size === 0) return;

    const errors: string[] = [];
    items.forEach((item, idx) => {
      const dm = item.danhMuc;
      if (!dm) return;
      const checkSide = (tkMa: string | undefined, doiTuongFilled: boolean) => {
        if (!tkMa) return;
        const rules = rulesByMa.get(tkMa);
        if (!rules) return;
        for (const [field, level] of Object.entries(rules)) {
          if (level !== 'BAT_BUOC') continue;
          const filled =
            field === 'doiTuong'
              ? doiTuongFilled
              : Boolean((dm as Record<string, { ma?: string } | undefined>)[field]?.ma);
          if (!filled) {
            errors.push(
              `Dòng ${idx + 1}: TK ${tkMa} bắt buộc nhập ${FIELD_LABELS[field] ?? field}`,
            );
          }
        }
      };
      checkSide(dm.taiKhoanNo?.ma, Boolean(dm.doiTuong?.ma));
      checkSide(dm.taiKhoanCo?.ma, Boolean(dm.doiTuong2?.ma));
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }
}
```

Thêm export vào `be/apps/voucher-service/src/shared/index.ts`:

```typescript
export * from './field-rules-validation.service';
```

- [ ] **Step 13.4: Chạy test PASS**

Run: `cd be && yarn test field-rules-validation` → PASS (5 tests).

- [ ] **Step 13.5: Wire vào module + controller**

`nhat-ky-chung.module.ts`:

```typescript
// Thêm import:
import { ServiceClientModule } from '@app/service-client';
import { VoucherNumberService, FieldRulesValidationService } from '../shared';
// (thay dòng import { VoucherNumberService } from '../shared'; hiện có)

@Module({
  imports: [ConfigModule, DatabaseModule.forFeature([ChungTu, VoucherSequence]), TenantModule, ServiceClientModule],
  controllers: [NhatKyChungController],
  providers: [NhatKyChungService, VoucherNumberService, FieldRulesValidationService],
  exports: [NhatKyChungService],
})
```

(Kiểm tra tên module export của lib service-client trong `be/libs/service-client/src/index.ts` — nếu là `ServiceClientModule` thì như trên; reporting-service.module.ts đã import nó, copy đúng cách dùng ở đó, kể cả `.forRoot()` nếu có.)

`nhat-ky-chung.controller.ts` — inject + gọi trước create/batch/update:

```typescript
// constructor:
  constructor(
    private readonly nhatKyChungService: NhatKyChungService,
    private readonly fieldRulesValidation: FieldRulesValidationService,
  ) {}
// import: thêm FieldRulesValidationService từ '../shared'

// POST / :
  async create(
    @Body() createDto: CreateNhatKyChungDto,
    @CurrentUser() user: UserPayload,
    @Headers('authorization') authToken?: string,
  ) {
    await this.fieldRulesValidation.validateItems([createDto], authToken);
    return this.nhatKyChungService.create(createDto, user.id);
  }

// POST /batch :
  async createBatch(
    @Body() items: CreateNhatKyChungDto[],
    @CurrentUser() user: UserPayload,
    @Headers('authorization') authToken?: string,
  ) {
    await this.fieldRulesValidation.validateItems(items, authToken);
    return this.nhatKyChungService.createBatch(items, user.id);
  }

// PATCH /batch :
  async updateBatch(
    @Body() body: { soPhieu: string; items: BatchItemDto[] },
    @CurrentUser() user: UserPayload,
    @Headers('authorization') authToken?: string,
  ) {
    await this.fieldRulesValidation.validateItems(body.items, authToken);
    return this.nhatKyChungService.updateBatch(body.soPhieu, body.items, user.id);
  }

// PATCH /:id :
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNhatKyChungDto,
    @Headers('authorization') authToken?: string,
  ) {
    await this.fieldRulesValidation.validateItems([updateDto], authToken);
    return this.nhatKyChungService.update(id, updateDto);
  }
```

**Ngoài phạm vi:** `POST /import` (import Excel hàng loạt) KHÔNG validate đợt này — tránh chặn import dữ liệu lịch sử; ghi chú trong commit message.

- [ ] **Step 13.6: Build + toàn bộ test voucher**

Run: `cd be && yarn build 2>&1 | tail -3` → pass.
Run: `cd be && yarn test voucher-service 2>&1 | tail -10` → PASS (không vỡ test cũ; nếu controller spec hiện có khởi tạo controller thiếu provider mới → bổ sung mock `FieldRulesValidationService` `{ validateItems: jest.fn() }` vào spec đó).

- [ ] **Step 13.7: Commit**

```bash
git add be/apps/voucher-service/
git commit -m "feat(voucher): enforce fieldRules mức bắt buộc khi tạo/sửa chứng từ (trừ import)"
```

---

### Task 14: Verify tổng & hoàn tất

- [ ] **Step 14.1: Chạy toàn bộ test + build 2 phía**

```bash
cd fe && npm run test && npm run lint && npm run build
cd ../be && yarn test 2>&1 | tail -15 && yarn build 2>&1 | tail -3
```
Expected: tất cả PASS / build OK. Lỗi nào do thay đổi của plan → sửa ngay; lỗi tồn tại từ trước (xác nhận bằng `git stash` thử lại) → ghi nhận, không tự sửa ngoài phạm vi.

- [ ] **Step 14.2: Checklist test thủ công (cần BE + FE chạy local: `cd be && yarn start:all:dev`, `cd fe && npm run dev`)**

1. Danh mục TK: 112 chiTietTheo = "Ngân hàng & Quỹ"; cấu hình Dự án = Bắt buộc, Đội thi công = Cảnh báo.
2. Form NKC: dòng Nợ 112 / Có 131 → "Đối tượng nợ" chỉ hiện ngân hàng/quỹ; "Đối tượng có" chỉ hiện khách hàng; TK 511 → ô đối tượng disable.
3. Đổi TK Nợ 112 → 331: đối tượng ngân hàng đã chọn bị clear.
4. Lưu thiếu Dự án → chặn + báo "Dòng 1: TK 112 yêu cầu bắt buộc nhập Dự án"; nhập Dự án, thiếu Đội → dialog cảnh báo → "Vẫn lưu" → thành công.
5. Gọi thẳng API (bỏ qua FE): POST /nhat-ky-chung/batch thiếu duAn với TK 112 → HTTP 400.
6. Mở lại chứng từ vừa lưu để sửa → đối tượng ngân hàng hiển thị đúng.
7. Báo cáo Cân đối tài khoản / Sổ cái: TK 112 xổ chi tiết theo từng ngân hàng (chứng từ mới + số dư đầu kỳ); chứng từ cũ không gắn ngân hàng nằm ở "Chưa xác định đối tượng".

- [ ] **Step 14.3: Commit dọn dẹp cuối (nếu có) — hoàn tất**

```bash
git status   # xác nhận sạch
git log --oneline -14
```

---

## Ghi chú phạm vi

- `POST /nhat-ky-chung/import` không enforce fieldRules (import dữ liệu lịch sử).
- Không migrate chứng từ cũ; báo cáo gộp phần thiếu đối tượng vào "Chưa xác định đối tượng".
- Trang Số dư đầu kỳ đã có cơ chế chọn ngân hàng theo chiTietTheo riêng (`chiTietConfig.ts`) — không đụng.
- Các form Phiếu thu/Phiếu chi (chung-tu service khác) ngoài phạm vi đợt này.
