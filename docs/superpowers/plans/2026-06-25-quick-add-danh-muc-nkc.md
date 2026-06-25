# Tạo nhanh danh mục trong bảng Nhật ký chung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nút "+ Thêm nhanh" vào 5 ô (Nghiệp vụ, TK Nợ, TK Có, Đối tượng nợ, Đối tượng có) trong bảng nhập Nhật ký chung để tạo quy chuẩn/tài khoản/đối tượng ngay tại chỗ và tự điền vào ô đang nhập.

**Architecture:** Toàn bộ logic biến đổi state (append list + cập nhật dòng + auto-fill + snapshot) nằm trong các hàm **reducer thuần** (test đầy đủ). Một component `SelectWithQuickAdd` (bọc antd Select, thêm footer dropdown) tái sử dụng cho cả 5 ô. Ba modal form rút gọn thu thập dữ liệu. Một sub-handler mới (`quick-add`) gọi service create rồi áp reducer và `setState`. `ChiTietTable.tsx` ráp các mảnh lại.

**Tech Stack:** React 18 + TypeScript, antd v6 (`popupRender`), CHanlder pattern (RxJS), vitest + @testing-library/react.

## Global Constraints

- antd **v6** — dùng `popupRender` (KHÔNG dùng `dropdownRender` đã deprecated). Dùng `variant`/`status` props v6.
- CHanlder pattern: sub-handler `@RegisterHandler("nhat-ky-chung-form")` + `@HandlerDecorator("eventName")`, dùng `this.getState(key)` / `this.setState(key, value)`. Event khai báo trong `*.event.ts` qua `declare module "../../nhat-ky-chung-form.handler"`. Auto-load qua glob trong `sub-handler/index.ts` — **không cần** sửa index.
- Test: `cd fe && npx vitest run <path>`. Toàn bộ test suite: `cd fe && npm test`. Lint: `cd fe && npm run lint`.
- KHÔNG sửa backend. KHÔNG sửa `role.guard.ts` (no-op cố ý, global).
- Mọi đường dẫn dưới đây gốc tại worktree `/Users/os_anhvt/Documents/Dino/ke-toan-so/.claude/worktrees/task-from-master`.
- Thư mục component mới: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/`.
- Thư mục sub-handler mới: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/`.

## File Structure

**Tạo mới:**
- `…/form-handler/sub-handler/quick-add/quick-add.reducers.ts` — hàm thuần: `applyNghiepVu`, `toTaiKhoanItem`, 3 reducer.
- `…/form-handler/sub-handler/quick-add/__tests__/quick-add.reducers.test.ts`
- `…/form-handler/sub-handler/quick-add/quick-add.event.ts` — khai báo 3 event.
- `…/form-handler/sub-handler/quick-add/quick-add.handler.ts` — sub-handler gọi service + reducer.
- `…/quick-add/SelectWithQuickAdd.tsx` + `__tests__/SelectWithQuickAdd.test.tsx`
- `…/quick-add/QuickAddQuyChuanModal.tsx` + `__tests__/QuickAddQuyChuanModal.test.tsx`
- `…/quick-add/QuickAddDoiTuongModal.tsx` + `__tests__/QuickAddDoiTuongModal.test.tsx`
- `…/quick-add/QuickAddTaiKhoanModal.tsx` + `__tests__/QuickAddTaiKhoanModal.test.tsx`

**Sửa:**
- `…/form-components/chi-tiet-table/ChiTietTable.tsx` — thay 5 Select bằng `SelectWithQuickAdd`, quản state modal, dispatch event.

**Tham chiếu (đọc, không sửa):**
- `…/form-handler/sub-handler/init/init.state.ts` — `ChungTuChiTiet`, `TaiKhoanItem`, `ChungTuHeader`.
- `…/form-handler/sub-handler/chi-tiet/chi-tiet.handler.ts` — mẫu sub-handler + logic `handleNghiepVuChange`.
- `fe/src/utils/snapshotBuilder.ts` — `buildDoiTuongSnapshot`.
- `fe/src/services/{quyChaunService,doiTuongService,taiKhoanService}.ts` — `.create()`.
- `fe/src/mock-data/tai-khoan.ts` — `loaiTaiKhoan`, `nhomTaiKhoan`. `fe/src/mock-data/doi-tuong.ts` — `loaiDoiTuong`.

---

## Task 1: Reducers thuần (toàn bộ logic biến đổi state)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/quick-add.reducers.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/__tests__/quick-add.reducers.test.ts`

**Interfaces:**
- Consumes: `ChungTuChiTiet`, `TaiKhoanItem` từ `../../init/init.state`; `QuyChuan`, `DoiTuong`, `TaiKhoan` từ `@/types`; `buildDoiTuongSnapshot` từ `@/utils/snapshotBuilder`.
- Produces:
  - `applyNghiepVu(item: ChungTuChiTiet, quyChuan: QuyChuan): ChungTuChiTiet`
  - `toTaiKhoanItem(tk: TaiKhoan): TaiKhoanItem`
  - `quickAddQuyChuanReducer(input: { chiTietList: ChungTuChiTiet[]; quyChaunList: QuyChuan[]; key: string; created: QuyChuan }): { chiTietList: ChungTuChiTiet[]; quyChaunList: QuyChuan[] }`
  - `quickAddDoiTuongReducer(input: { chiTietList: ChungTuChiTiet[]; doiTuongList: DoiTuong[]; key: string; field: "doiTuongId" | "doiTuong2Id"; created: DoiTuong }): { chiTietList: ChungTuChiTiet[]; doiTuongList: DoiTuong[] }`
  - `quickAddTaiKhoanReducer(input: { chiTietList: ChungTuChiTiet[]; taiKhoanList: TaiKhoanItem[]; key: string; field: "taiKhoanNo" | "taiKhoanCo"; created: TaiKhoan }): { chiTietList: ChungTuChiTiet[]; taiKhoanList: TaiKhoanItem[] }`

- [ ] **Step 1: Viết test thất bại**

Tạo `…/quick-add/__tests__/quick-add.reducers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  applyNghiepVu,
  toTaiKhoanItem,
  quickAddQuyChuanReducer,
  quickAddDoiTuongReducer,
  quickAddTaiKhoanReducer,
} from "../quick-add.reducers";
import { ChungTuChiTiet, TaiKhoanItem } from "../../init/init.state";
import { QuyChuan, DoiTuong, TaiKhoan } from "@/types";

const row = (over: Partial<ChungTuChiTiet> = {}): ChungTuChiTiet => ({
  key: "r1",
  taiKhoanNo: "",
  taiKhoanCo: "",
  soTien: 0,
  noiDung: "",
  ...over,
});

const qc: QuyChuan = {
  id: "qc1",
  loaiGiaoDich: "MUA_HANG",
  nghiepVu: "Mua vật tư",
  taiKhoanNo: "152",
  taiKhoanCo: "331",
  moTa: "Mua vật tư nhập kho",
};

describe("applyNghiepVu", () => {
  it("điền nghiệp vụ + auto-fill TK Nợ/Có/nội dung từ quy chuẩn", () => {
    const out = applyNghiepVu(row(), qc);
    expect(out.nghiepVu).toBe("Mua vật tư");
    expect(out.nghiepVuTen).toBe("Mua vật tư");
    expect(out.taiKhoanNo).toBe("152");
    expect(out.taiKhoanCo).toBe("331");
    expect(out.noiDung).toBe("Mua vật tư nhập kho");
  });

  it("giữ TK cũ nếu quy chuẩn không có TK", () => {
    const out = applyNghiepVu(row({ taiKhoanNo: "111" }), { ...qc, taiKhoanNo: "", taiKhoanCo: "" });
    expect(out.taiKhoanNo).toBe("111");
  });
});

describe("toTaiKhoanItem", () => {
  it("map TaiKhoan -> TaiKhoanItem đúng shape dùng trong bảng", () => {
    const tk = {
      id: "t1", ma: "1531", ten: "Công cụ", capDo: 2,
      loai: "TAI_SAN", nhom: "NO", chiTietTheo: undefined, fieldRules: null,
    } as unknown as TaiKhoan;
    const item: TaiKhoanItem = toTaiKhoanItem(tk);
    expect(item).toEqual({ ma: "1531", ten: "Công cụ", loai: "TAI_SAN", nhom: "NO", chiTietTheo: undefined, fieldRules: null });
  });
});

describe("quickAddQuyChuanReducer", () => {
  it("append quyChaunList và áp nghiệp vụ vào đúng dòng", () => {
    const out = quickAddQuyChuanReducer({
      chiTietList: [row({ key: "a" }), row({ key: "b" })],
      quyChaunList: [],
      key: "b",
      created: qc,
    });
    expect(out.quyChaunList).toHaveLength(1);
    expect(out.chiTietList[0].nghiepVu).toBeUndefined();
    expect(out.chiTietList[1].nghiepVu).toBe("Mua vật tư");
    expect(out.chiTietList[1].taiKhoanNo).toBe("152");
  });
});

describe("quickAddDoiTuongReducer", () => {
  const dt = { id: "d1", loai: ["KHACH_HANG"], ma: "KH001", ten: "Cty A", maSoThue: "" } as unknown as DoiTuong;
  it("append doiTuongList và set doiTuongId + snapshot khi field = doiTuongId", () => {
    const out = quickAddDoiTuongReducer({
      chiTietList: [row({ key: "a" })],
      doiTuongList: [],
      key: "a",
      field: "doiTuongId",
      created: dt,
    });
    expect(out.doiTuongList).toHaveLength(1);
    expect(out.chiTietList[0].doiTuongId).toBe("d1");
    expect((out.chiTietList[0].doiTuongSnapshot as { ma: string }).ma).toBe("KH001");
  });
  it("set doiTuong2Id + doiTuong2Snapshot khi field = doiTuong2Id", () => {
    const out = quickAddDoiTuongReducer({
      chiTietList: [row({ key: "a" })], doiTuongList: [], key: "a", field: "doiTuong2Id", created: dt,
    });
    expect(out.chiTietList[0].doiTuong2Id).toBe("d1");
    expect(out.chiTietList[0].doiTuong2Snapshot).toBeDefined();
  });
});

describe("quickAddTaiKhoanReducer", () => {
  const tk = { id: "t1", ma: "1388", ten: "Phải thu khác", capDo: 1, loai: "TAI_SAN", nhom: "NO" } as unknown as TaiKhoan;
  it("append taiKhoanList (dạng item) và set taiKhoanNo = ma", () => {
    const out = quickAddTaiKhoanReducer({
      chiTietList: [row({ key: "a" })], taiKhoanList: [], key: "a", field: "taiKhoanNo", created: tk,
    });
    expect(out.taiKhoanList[0].ma).toBe("1388");
    expect(out.chiTietList[0].taiKhoanNo).toBe("1388");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/__tests__/quick-add.reducers.test.ts`
Expected: FAIL — `Cannot find module '../quick-add.reducers'`.

- [ ] **Step 3: Viết implementation**

Tạo `…/quick-add/quick-add.reducers.ts`:

```ts
import { ChungTuChiTiet, TaiKhoanItem } from "../../init/init.state";
import { QuyChuan, DoiTuong, TaiKhoan } from "@/types";
import { buildDoiTuongSnapshot } from "@/utils/snapshotBuilder";

/** Điền nghiệp vụ vào 1 dòng + auto-fill TK Nợ/Có/nội dung từ quy chuẩn (đồng nhất handleNghiepVuChange). */
export function applyNghiepVu(item: ChungTuChiTiet, quyChuan: QuyChuan): ChungTuChiTiet {
  return {
    ...item,
    nghiepVu: quyChuan.nghiepVu,
    nghiepVuTen: quyChuan.nghiepVu,
    taiKhoanNo: quyChuan.taiKhoanNo || item.taiKhoanNo,
    taiKhoanCo: quyChuan.taiKhoanCo || item.taiKhoanCo,
    noiDung: quyChuan.moTa || item.noiDung,
  };
}

/** Map tài khoản vừa tạo về đúng shape TaiKhoanItem dùng trong dropdown của bảng. */
export function toTaiKhoanItem(tk: TaiKhoan): TaiKhoanItem {
  return {
    ma: tk.ma,
    ten: tk.ten,
    loai: tk.loai,
    nhom: tk.nhom,
    chiTietTheo: tk.chiTietTheo ?? undefined,
    fieldRules: (tk.fieldRules ?? null) as TaiKhoanItem["fieldRules"],
  };
}

export function quickAddQuyChuanReducer(input: {
  chiTietList: ChungTuChiTiet[];
  quyChaunList: QuyChuan[];
  key: string;
  created: QuyChuan;
}): { chiTietList: ChungTuChiTiet[]; quyChaunList: QuyChuan[] } {
  const quyChaunList = [...input.quyChaunList, input.created];
  const chiTietList = input.chiTietList.map((item) =>
    item.key === input.key ? applyNghiepVu(item, input.created) : item
  );
  return { chiTietList, quyChaunList };
}

export function quickAddDoiTuongReducer(input: {
  chiTietList: ChungTuChiTiet[];
  doiTuongList: DoiTuong[];
  key: string;
  field: "doiTuongId" | "doiTuong2Id";
  created: DoiTuong;
}): { chiTietList: ChungTuChiTiet[]; doiTuongList: DoiTuong[] } {
  const doiTuongList = [...input.doiTuongList, input.created];
  const snapshotField = input.field === "doiTuongId" ? "doiTuongSnapshot" : "doiTuong2Snapshot";
  const chiTietList = input.chiTietList.map((item) =>
    item.key === input.key
      ? { ...item, [input.field]: input.created.id, [snapshotField]: buildDoiTuongSnapshot(input.created) }
      : item
  );
  return { chiTietList, doiTuongList };
}

export function quickAddTaiKhoanReducer(input: {
  chiTietList: ChungTuChiTiet[];
  taiKhoanList: TaiKhoanItem[];
  key: string;
  field: "taiKhoanNo" | "taiKhoanCo";
  created: TaiKhoan;
}): { chiTietList: ChungTuChiTiet[]; taiKhoanList: TaiKhoanItem[] } {
  const taiKhoanList = [...input.taiKhoanList, toTaiKhoanItem(input.created)];
  const chiTietList = input.chiTietList.map((item) =>
    item.key === input.key ? { ...item, [input.field]: input.created.ma } : item
  );
  return { chiTietList, taiKhoanList };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/__tests__/quick-add.reducers.test.ts`
Expected: PASS (tất cả test).

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/quick-add.reducers.ts fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/__tests__/quick-add.reducers.test.ts
git commit -m "feat(nkc): reducer thuần cho tạo nhanh danh mục (TDD)"
```

---

## Task 2: Component `SelectWithQuickAdd`

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/SelectWithQuickAdd.tsx`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/SelectWithQuickAdd.test.tsx`

**Interfaces:**
- Consumes: antd `Select`, `Divider`, `Button`; `PlusOutlined`.
- Produces: `SelectWithQuickAdd` — nhận mọi prop của antd `Select` cộng `quickAddLabel: string`, `onQuickAdd: () => void`, `quickAddDisabled?: boolean`. Render Select bình thường; trong dropdown chèn footer nút "+ Thêm nhanh {quickAddLabel}". Khi `quickAddDisabled` → không render nút.

- [ ] **Step 1: Viết test thất bại**

Tạo `…/quick-add/__tests__/SelectWithQuickAdd.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectWithQuickAdd } from "../SelectWithQuickAdd";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

const options = [{ value: "a", label: "A" }];

describe("SelectWithQuickAdd", () => {
  it("hiện nút '+ Thêm nhanh' trong dropdown và gọi onQuickAdd khi bấm", () => {
    const onQuickAdd = vi.fn();
    render(
      <SelectWithQuickAdd
        open
        options={options}
        quickAddLabel="đối tượng"
        onQuickAdd={onQuickAdd}
      />
    );
    const btn = screen.getByText(/Thêm nhanh đối tượng/i);
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
  });

  it("ẩn nút khi quickAddDisabled", () => {
    render(
      <SelectWithQuickAdd
        open
        options={options}
        quickAddLabel="đối tượng"
        onQuickAdd={() => {}}
        quickAddDisabled
      />
    );
    expect(screen.queryByText(/Thêm nhanh/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/SelectWithQuickAdd.test.tsx`
Expected: FAIL — không tìm thấy module `../SelectWithQuickAdd`.

- [ ] **Step 3: Viết implementation**

Tạo `…/quick-add/SelectWithQuickAdd.tsx`:

```tsx
import { Select, Divider, Button } from "antd";
import type { SelectProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";

export interface SelectWithQuickAddProps extends SelectProps {
  quickAddLabel: string;
  onQuickAdd: () => void;
  quickAddDisabled?: boolean;
}

export function SelectWithQuickAdd({
  quickAddLabel,
  onQuickAdd,
  quickAddDisabled = false,
  ...selectProps
}: SelectWithQuickAddProps) {
  return (
    <Select
      {...selectProps}
      popupRender={(menu) => (
        <>
          {menu}
          {!quickAddDisabled && (
            <>
              <Divider style={{ margin: "4px 0" }} />
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                block
                style={{ textAlign: "left" }}
                // onMouseDown chặn blur Select trước khi click handler chạy
                onMouseDown={(e) => e.preventDefault()}
                onClick={onQuickAdd}
              >
                + Thêm nhanh {quickAddLabel}
              </Button>
            </>
          )}
        </>
      )}
    />
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/SelectWithQuickAdd.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/quick-add/SelectWithQuickAdd.tsx fe/src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/SelectWithQuickAdd.test.tsx
git commit -m "feat(nkc): SelectWithQuickAdd - select có footer thêm nhanh"
```

---

## Task 3: Modal `QuickAddDoiTuongModal`

(Làm đối tượng trước vì chỉ có input text — test type-and-submit chắc chắn nhất.)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddDoiTuongModal.tsx`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddDoiTuongModal.test.tsx`

**Interfaces:**
- Consumes: `loaiDoiTuong` từ `@/mock-data/doi-tuong`.
- Produces: `QuickAddDoiTuongModal` props:
  - `open: boolean`, `onClose: () => void`
  - `defaultLoai?: string[]` — pre-fill loại theo `chiTietTheo` của TK dòng đó.
  - `onSubmit: (values: { loai: string[]; ma: string; ten: string }) => Promise<boolean>` — trả `true` thì modal tự đóng.

- [ ] **Step 1: Viết test thất bại**

Tạo `…/quick-add/__tests__/QuickAddDoiTuongModal.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddDoiTuongModal } from "../QuickAddDoiTuongModal";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

describe("QuickAddDoiTuongModal", () => {
  it("không gọi onSubmit khi thiếu mã/tên", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddDoiTuongModal open onClose={() => {}} defaultLoai={["KHACH_HANG"]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  it("gọi onSubmit với loai pre-fill + ma + ten", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddDoiTuongModal open onClose={() => {}} defaultLoai={["KHACH_HANG"]} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/VD: KH001/i), { target: { value: "KH009" } });
    fireEvent.change(screen.getByPlaceholderText(/Tên đối tượng/i), { target: { value: "Cty Z" } });
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ loai: ["KHACH_HANG"], ma: "KH009", ten: "Cty Z" })
    );
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddDoiTuongModal.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết implementation**

Tạo `…/quick-add/QuickAddDoiTuongModal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Modal, Form, Input, Select } from "antd";
import { loaiDoiTuong } from "@/mock-data/doi-tuong";

interface Values { loai: string[]; ma: string; ten: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  defaultLoai?: string[];
  onSubmit: (values: Values) => Promise<boolean>;
}

export function QuickAddDoiTuongModal({ open, onClose, defaultLoai, onSubmit }: Props) {
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ loai: defaultLoai && defaultLoai.length ? defaultLoai : [] });
    }
  }, [open, defaultLoai, form]);

  const handleOk = async () => {
    let v: Values;
    try { v = await form.validateFields(); } catch { return; }
    setSaving(true);
    const ok = await onSubmit(v);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="Thêm nhanh đối tượng"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Thêm"
      cancelText="Hủy"
      confirmLoading={saving}
      width={460}
      destroyOnClose
    >
      <Form form={form} layout="vertical" size="small" className="mt-2">
        <Form.Item name="loai" label="Loại đối tượng" rules={[{ required: true, message: "Chọn loại" }]}>
          <Select mode="multiple" placeholder="Chọn loại" options={loaiDoiTuong} />
        </Form.Item>
        <Form.Item name="ma" label="Mã đối tượng" rules={[{ required: true, message: "Nhập mã" }, { max: 20, message: "Tối đa 20 ký tự" }]}>
          <Input placeholder="VD: KH001, NCC001" />
        </Form.Item>
        <Form.Item name="ten" label="Tên đối tượng" rules={[{ required: true, message: "Nhập tên" }, { max: 200, message: "Tối đa 200 ký tự" }]}>
          <Input placeholder="Tên đối tượng (VD: Công ty TNHH ABC)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddDoiTuongModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddDoiTuongModal.tsx fe/src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddDoiTuongModal.test.tsx
git commit -m "feat(nkc): modal thêm nhanh đối tượng"
```

---

## Task 4: Modal `QuickAddQuyChuanModal`

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddQuyChuanModal.tsx`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddQuyChuanModal.test.tsx`

**Interfaces:**
- Produces: `QuickAddQuyChuanModal` props:
  - `open: boolean`, `onClose: () => void`
  - `loaiGiaoDichLabel: string` — nhãn Loại GD (từ header), hiển thị read-only.
  - `taiKhoanOptions: { value: string; label: string }[]` — options TK Nợ/Có (từ `taiKhoanList`).
  - `onSubmit: (values: { nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string }) => Promise<boolean>`

- [ ] **Step 1: Viết test thất bại**

Tạo `…/quick-add/__tests__/QuickAddQuyChuanModal.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddQuyChuanModal } from "../QuickAddQuyChuanModal";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

const tkOpts = [{ value: "152", label: "152 - Vật tư" }, { value: "331", label: "331 - Phải trả NCC" }];

describe("QuickAddQuyChuanModal", () => {
  it("hiển thị nhãn Loại GD read-only", () => {
    render(<QuickAddQuyChuanModal open onClose={() => {}} loaiGiaoDichLabel="Mua hàng" taiKhoanOptions={tkOpts} onSubmit={vi.fn()} />);
    expect(screen.getByText("Mua hàng")).toBeTruthy();
  });

  it("không gọi onSubmit khi thiếu trường bắt buộc", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddQuyChuanModal open onClose={() => {}} loaiGiaoDichLabel="Mua hàng" taiKhoanOptions={tkOpts} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddQuyChuanModal.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết implementation**

Tạo `…/quick-add/QuickAddQuyChuanModal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Row, Col } from "antd";

interface Values { nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  loaiGiaoDichLabel: string;
  taiKhoanOptions: { value: string; label: string }[];
  onSubmit: (values: Values) => Promise<boolean>;
}

export function QuickAddQuyChuanModal({ open, onClose, loaiGiaoDichLabel, taiKhoanOptions, onSubmit }: Props) {
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) form.resetFields(); }, [open, form]);

  const handleOk = async () => {
    let v: Values;
    try { v = await form.validateFields(); } catch { return; }
    setSaving(true);
    const ok = await onSubmit(v);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="Thêm nhanh nghiệp vụ (quy chuẩn)"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Thêm"
      cancelText="Hủy"
      confirmLoading={saving}
      width={520}
      destroyOnClose
    >
      <Form form={form} layout="vertical" size="small" className="mt-2">
        <Form.Item label="Loại giao dịch">
          <span className="font-medium">{loaiGiaoDichLabel}</span>
        </Form.Item>
        <Form.Item name="nghiepVu" label="Nghiệp vụ" rules={[{ required: true, message: "Nhập nghiệp vụ" }, { max: 100, message: "Tối đa 100 ký tự" }]}>
          <Input placeholder="VD: Thu tiền bán hàng" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="taiKhoanNo" label="TK Nợ" rules={[{ required: true, message: "Chọn TK Nợ" }]}>
              <Select showSearch optionFilterProp="label" placeholder="Chọn TK Nợ" options={taiKhoanOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="taiKhoanCo" label="TK Có" rules={[{ required: true, message: "Chọn TK Có" }]}>
              <Select showSearch optionFilterProp="label" placeholder="Chọn TK Có" options={taiKhoanOptions} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="moTa" label="Mô tả" rules={[{ max: 255, message: "Tối đa 255 ký tự" }]}>
          <Input.TextArea rows={2} placeholder="Mô tả (sẽ dùng làm diễn giải mặc định)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddQuyChuanModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddQuyChuanModal.tsx fe/src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddQuyChuanModal.test.tsx
git commit -m "feat(nkc): modal thêm nhanh nghiệp vụ (quy chuẩn)"
```

---

## Task 5: Modal `QuickAddTaiKhoanModal`

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddTaiKhoanModal.tsx`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddTaiKhoanModal.test.tsx`

**Interfaces:**
- Consumes: `loaiTaiKhoan`, `nhomTaiKhoan` từ `@/mock-data/tai-khoan`.
- Produces: `QuickAddTaiKhoanModal` props:
  - `open: boolean`, `onClose: () => void`
  - `onSubmit: (values: { ma: string; ten: string; loai: string; nhom: string; capDo: number; chiTietTheo?: string }) => Promise<boolean>`
  - Form tối thiểu, KHÔNG có TK cha (bảng không sẵn dữ liệu cây); `capDo` nhập tay mặc định 1; `chiTietTheo` optional.

- [ ] **Step 1: Viết test thất bại**

Tạo `…/quick-add/__tests__/QuickAddTaiKhoanModal.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddTaiKhoanModal } from "../QuickAddTaiKhoanModal";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

describe("QuickAddTaiKhoanModal", () => {
  it("không gọi onSubmit khi thiếu mã/tên/loại/nhóm", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddTaiKhoanModal open onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  it("mặc định cấp độ = 1", () => {
    render(<QuickAddTaiKhoanModal open onClose={() => {}} onSubmit={vi.fn()} />);
    expect((screen.getByDisplayValue("1") as HTMLInputElement)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddTaiKhoanModal.test.tsx`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết implementation**

Tạo `…/quick-add/QuickAddTaiKhoanModal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, InputNumber, Row, Col } from "antd";
import { loaiTaiKhoan, nhomTaiKhoan } from "@/mock-data/tai-khoan";

const chiTietTheoOptions = [
  { value: "KHACH_HANG", label: "Khách hàng" },
  { value: "NHA_CUNG_CAP", label: "Nhà cung cấp" },
  { value: "NHAN_VIEN", label: "Nhân viên" },
  { value: "NHA_THAU", label: "Nhà thầu" },
  { value: "NGAN_HANG_QUY", label: "Ngân hàng & Quỹ" },
];

interface Values { ma: string; ten: string; loai: string; nhom: string; capDo: number; chiTietTheo?: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Values) => Promise<boolean>;
}

export function QuickAddTaiKhoanModal({ open, onClose, onSubmit }: Props) {
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue({ capDo: 1 }); }
  }, [open, form]);

  const handleOk = async () => {
    let v: Values;
    try { v = await form.validateFields(); } catch { return; }
    setSaving(true);
    const ok = await onSubmit(v);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="Thêm nhanh tài khoản"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Thêm"
      cancelText="Hủy"
      confirmLoading={saving}
      width={520}
      destroyOnClose
    >
      <Form form={form} layout="vertical" size="small" className="mt-2">
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="ma" label="Mã tài khoản" rules={[{ required: true, message: "Nhập mã" }, { max: 20, message: "Tối đa 20 ký tự" }]}>
              <Input placeholder="VD: 1388, 6428" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="capDo" label="Cấp độ" rules={[{ required: true, message: "Nhập cấp độ" }]}>
              <InputNumber min={1} max={5} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="ten" label="Tên tài khoản" rules={[{ required: true, message: "Nhập tên" }, { max: 200, message: "Tối đa 200 ký tự" }]}>
          <Input placeholder="VD: Phải thu khác" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="loai" label="Loại tài khoản" rules={[{ required: true, message: "Chọn loại" }]}>
              <Select placeholder="Chọn loại" options={loaiTaiKhoan} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nhom" label="Nhóm tài khoản" rules={[{ required: true, message: "Chọn nhóm" }]}>
              <Select placeholder="Chọn nhóm" options={nhomTaiKhoan} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="chiTietTheo" label="Chi tiết theo" tooltip="Nếu TK cần theo dõi đối tượng (KH/NCC...) thì chọn ở đây">
          <Select allowClear placeholder="— Không chi tiết —" options={chiTietTheoOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddTaiKhoanModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/quick-add/QuickAddTaiKhoanModal.tsx fe/src/pages/chung-tu/nhat-ky-chung/quick-add/__tests__/QuickAddTaiKhoanModal.test.tsx
git commit -m "feat(nkc): modal thêm nhanh tài khoản"
```

---

## Task 6: Sub-handler `quick-add` (event + handler)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/quick-add.event.ts`
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/quick-add.handler.ts`

**Interfaces:**
- Consumes: reducers từ Task 1; `quyChauanService` (`@/services/quyChaunService`), `doiTuongService` (`@/services/doiTuongService`), `taiKhoanService` (`@/services/taiKhoanService`); `ChungTuChiTiet`, `TaiKhoanItem` từ `../init/init.state`; `QuyChuan`, `DoiTuong`, `TaiKhoan` từ `@/types`.
- Produces (event names + params/result, merge vào `NhatKyChungFormEvents`):
  - `quickCreateQuyChuan: { params: { key: string; loaiGiaoDich: string; nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string }; result: { ok: boolean } }`
  - `quickCreateDoiTuong: { params: { key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[]; ma: string; ten: string }; result: { ok: boolean } }`
  - `quickCreateTaiKhoan: { params: { key: string; field: "taiKhoanNo" | "taiKhoanCo"; ma: string; ten: string; loai: string; nhom: string; capDo: number; chiTietTheo?: string }; result: { ok: boolean } }`

> Lưu ý: handler là lớp glue mỏng (gọi service → reducer → setState). Logic đã được test ở Task 1. Bước verify ở đây là TypeScript compile + lint (không có precedent unit-test cho CSubHanlder trong repo).

- [ ] **Step 1: Tạo file event**

Tạo `…/quick-add/quick-add.event.ts`:

```ts
import { BaseEvents } from "@/common";

export interface QuickAddFormEvent extends BaseEvents {
  quickCreateQuyChuan: {
    params: { key: string; loaiGiaoDich: string; nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string };
    result: { ok: boolean };
  };
  quickCreateDoiTuong: {
    params: { key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[]; ma: string; ten: string };
    result: { ok: boolean };
  };
  quickCreateTaiKhoan: {
    params: { key: string; field: "taiKhoanNo" | "taiKhoanCo"; ma: string; ten: string; loai: string; nhom: string; capDo: number; chiTietTheo?: string };
    result: { ok: boolean };
  };
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormEvents extends QuickAddFormEvent {}
}
```

- [ ] **Step 2: Tạo file handler**

Tạo `…/quick-add/quick-add.handler.ts`:

```ts
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./quick-add.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuChiTiet, TaiKhoanItem } from "../init/init.state";
import { QuyChuan, DoiTuong, TaiKhoan } from "@/types";
import { quyChauanService } from "@/services/quyChaunService";
import { doiTuongService } from "@/services/doiTuongService";
import { taiKhoanService } from "@/services/taiKhoanService";
import {
  quickAddQuyChuanReducer,
  quickAddDoiTuongReducer,
  quickAddTaiKhoanReducer,
} from "./quick-add.reducers";

@RegisterHandler("nhat-ky-chung-form")
export class QuickAddFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("quickCreateQuyChuan")
  async quickCreateQuyChuan(params: {
    key: string; loaiGiaoDich: string; nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string;
  }): Promise<{ ok: boolean }> {
    try {
      const created: QuyChuan = await quyChauanService.create({
        loaiGiaoDich: params.loaiGiaoDich,
        nghiepVu: params.nghiepVu,
        taiKhoanNo: params.taiKhoanNo,
        taiKhoanCo: params.taiKhoanCo,
        moTa: params.moTa,
      });
      const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
      const quyChaunList = (this.getState("quyChaunList") as QuyChuan[]) || [];
      const next = quickAddQuyChuanReducer({ chiTietList, quyChaunList, key: params.key, created });
      this.setState("quyChaunList", next.quyChaunList);
      this.setState("chiTietList", next.chiTietList);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @HandlerDecorator("quickCreateDoiTuong")
  async quickCreateDoiTuong(params: {
    key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[]; ma: string; ten: string;
  }): Promise<{ ok: boolean }> {
    try {
      const created: DoiTuong = await doiTuongService.create({
        loai: params.loai,
        ma: params.ma,
        ten: params.ten,
      } as unknown as Omit<DoiTuong, "id">);
      const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
      const doiTuongList = (this.getState("doiTuongList") as DoiTuong[]) || [];
      const next = quickAddDoiTuongReducer({ chiTietList, doiTuongList, key: params.key, field: params.field, created });
      this.setState("doiTuongList", next.doiTuongList);
      this.setState("chiTietList", next.chiTietList);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @HandlerDecorator("quickCreateTaiKhoan")
  async quickCreateTaiKhoan(params: {
    key: string; field: "taiKhoanNo" | "taiKhoanCo"; ma: string; ten: string; loai: string; nhom: string; capDo: number; chiTietTheo?: string;
  }): Promise<{ ok: boolean }> {
    try {
      const created: TaiKhoan = await taiKhoanService.create({
        ma: params.ma,
        ten: params.ten,
        capDo: params.capDo,
        loai: params.loai,
        nhom: params.nhom,
        chiTietTheo: params.chiTietTheo ?? null,
        moTa: "",
        fieldRules: null,
      } as unknown as Omit<TaiKhoan, "id">);
      const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
      const taiKhoanList = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];
      const next = quickAddTaiKhoanReducer({ chiTietList, taiKhoanList, key: params.key, field: params.field, created });
      this.setState("taiKhoanList", next.taiKhoanList);
      this.setState("chiTietList", next.chiTietList);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
```

- [ ] **Step 3: Verify compile + lint**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: Không lỗi TypeScript/lint liên quan các file mới. (Nếu repo không có `tsconfig.app.json`, dùng `npx tsc --noEmit`.)

- [ ] **Step 4: Verify toàn bộ test vẫn xanh**

Run: `cd fe && npm test`
Expected: PASS toàn bộ (gồm Task 1–5).

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/quick-add.event.ts fe/src/pages/chung-tu/nhat-ky-chung/form-handler/sub-handler/quick-add/quick-add.handler.ts
git commit -m "feat(nkc): sub-handler quick-add gọi service + áp reducer"
```

---

## Task 7: Ráp vào `ChiTietTable.tsx`

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/form-components/chi-tiet-table/ChiTietTable.tsx`

**Interfaces:**
- Consumes: `SelectWithQuickAdd`, 3 modal (Task 2–5); event `quickCreateQuyChuan/DoiTuong/TaiKhoan` (Task 6).
- Produces: bảng với nút "+ Thêm nhanh" hoạt động ở 5 ô.

- [ ] **Step 1: Thêm import + state modal**

Ở đầu `ChiTietTable.tsx`, sau các import hiện có, thêm:

```tsx
import { SelectWithQuickAdd } from "../../quick-add/SelectWithQuickAdd";
import { QuickAddQuyChuanModal } from "../../quick-add/QuickAddQuyChuanModal";
import { QuickAddDoiTuongModal } from "../../quick-add/QuickAddDoiTuongModal";
import { QuickAddTaiKhoanModal } from "../../quick-add/QuickAddTaiKhoanModal";
import { toast } from "sonner";
```

Trong thân `ChiTietTable`, sau các `useState` phân trang hiện có, thêm state điều khiển modal:

```tsx
type QuickAddState =
  | { type: "quyChuan"; key: string }
  | { type: "doiTuong"; key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[] }
  | { type: "taiKhoan"; key: string; field: "taiKhoanNo" | "taiKhoanCo" }
  | null;
const [quickAdd, setQuickAdd] = useState<QuickAddState>(null);

const taiKhoanSelectOptions = (taiKhoanList as TaiKhoanItem[]).map((tk) => ({
  value: tk.ma,
  label: `${tk.ma} - ${tk.ten}`,
}));
```

> `chiTietTheo` của 4 loại đối tượng dùng để pre-fill `loai`. Hợp lệ khi thuộc tập 4 loại (không phải `NGAN_HANG_QUY`, không rỗng).

- [ ] **Step 2: Thay Select ô "Nghiệp vụ" bằng SelectWithQuickAdd**

Trong cột Nghiệp vụ (hiện dùng `<Select ... options={nghiepVuOptions} .../>`), đổi `Select` → `SelectWithQuickAdd` và thêm 3 prop:

```tsx
<SelectWithQuickAdd
  size="small"
  showSearch
  placeholder="Chọn nghiệp vụ"
  optionFilterProp="label"
  value={value || undefined}
  onChange={(v) => handler.executeEvent("handleNghiepVuChange", { key: record.key, nghiepVu: v })}
  onFocus={() => { activeRowRef.current = index; }}
  options={nghiepVuOptions}
  className="w-full excel-cell-input"
  variant="borderless"
  status={!value ? "error" : ""}
  popupMatchSelectWidth={280}
  disabled={!typedHeader?.loaiGiaoDich}
  quickAddLabel="nghiệp vụ"
  quickAddDisabled={!typedHeader?.loaiGiaoDich}
  onQuickAdd={() => setQuickAdd({ type: "quyChuan", key: record.key })}
/>
```

- [ ] **Step 3: Thay 2 Select ô "TK Nợ" và "TK Có"**

Với cột TK Nợ, đổi `Select` → `SelectWithQuickAdd`, giữ nguyên props cũ, thêm:

```tsx
  quickAddLabel="tài khoản"
  onQuickAdd={() => setQuickAdd({ type: "taiKhoan", key: record.key, field: "taiKhoanNo" })}
```

Với cột TK Có tương tự, chỉ khác `field: "taiKhoanCo"`.

- [ ] **Step 4: Thay 2 Select ô "Đối tượng nợ" và "Đối tượng có"**

Trong cột Đối tượng nợ (có sẵn `const cfg = getDoiTuongSelectConfig(tkNo?.chiTietTheo, ...)`), đổi `Select` → `SelectWithQuickAdd` và thêm:

```tsx
  quickAddLabel="đối tượng"
  quickAddDisabled={cfg.disabled || tkNo?.chiTietTheo === "NGAN_HANG_QUY" || !tkNo?.chiTietTheo}
  onQuickAdd={() => setQuickAdd({ type: "doiTuong", key: record.key, field: "doiTuongId", loai: tkNo?.chiTietTheo ? [tkNo.chiTietTheo] : [] })}
```

Với cột Đối tượng có (dùng `tkCo`), tương tự, `field: "doiTuong2Id"` và dùng `tkCo?.chiTietTheo`.

- [ ] **Step 5: Render 3 modal cuối component**

Ngay trước thẻ đóng `</div>` ngoài cùng của `return (...)` (sau `<div className="nkc-table-footer">…</div>`), thêm:

```tsx
      {quickAdd?.type === "quyChuan" && (
        <QuickAddQuyChuanModal
          open
          onClose={() => setQuickAdd(null)}
          loaiGiaoDichLabel={typedHeader?.loaiTen || typedHeader?.loaiGiaoDich || ""}
          taiKhoanOptions={taiKhoanSelectOptions}
          onSubmit={async (v) => {
            const r = await handler.executeEvent("quickCreateQuyChuan", {
              key: quickAdd.key,
              loaiGiaoDich: typedHeader?.loaiGiaoDich || "",
              ...v,
            });
            if (r?.ok) { toast.success("Đã thêm nghiệp vụ"); return true; }
            toast.error("Thêm nghiệp vụ thất bại"); return false;
          }}
        />
      )}
      {quickAdd?.type === "doiTuong" && (
        <QuickAddDoiTuongModal
          open
          onClose={() => setQuickAdd(null)}
          defaultLoai={quickAdd.loai}
          onSubmit={async (v) => {
            const r = await handler.executeEvent("quickCreateDoiTuong", {
              key: quickAdd.key,
              field: quickAdd.field,
              ...v,
            });
            if (r?.ok) { toast.success("Đã thêm đối tượng"); return true; }
            toast.error("Thêm đối tượng thất bại"); return false;
          }}
        />
      )}
      {quickAdd?.type === "taiKhoan" && (
        <QuickAddTaiKhoanModal
          open
          onClose={() => setQuickAdd(null)}
          onSubmit={async (v) => {
            const r = await handler.executeEvent("quickCreateTaiKhoan", {
              key: quickAdd.key,
              field: quickAdd.field,
              ...v,
            });
            if (r?.ok) { toast.success("Đã thêm tài khoản"); return true; }
            toast.error("Thêm tài khoản thất bại"); return false;
          }}
        />
      )}
```

> `ChungTuHeader` có sẵn field `loaiTen` (tên Loại GD) — dùng làm nhãn read-only; fallback về `loaiGiaoDich`.

- [ ] **Step 6: Verify compile + lint**

Run: `cd fe && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: Không lỗi.

- [ ] **Step 7: Verify thủ công trên app**

Run: `cd fe && npm run dev`
Mở Nhật ký chung → tạo chứng từ mới → chọn Loại GD ở header → ở bảng:
1. Mở dropdown ô **Nghiệp vụ** → bấm "+ Thêm nhanh nghiệp vụ" → điền → Thêm → nghiệp vụ mới được chọn, TK Nợ/Có tự điền.
2. Mở dropdown ô **TK Nợ** → "+ Thêm nhanh tài khoản" → điền → Thêm → TK mới được chọn vào ô.
3. Chọn 1 TK có `chiTietTheo` (vd 131/331) → mở **Đối tượng nợ** → "+ Thêm nhanh đối tượng" → loại pre-fill đúng → Thêm → đối tượng mới được chọn.
4. Reload không cần thiết: bản ghi mới còn trong dropdown để dùng cho dòng khác.

Expected: cả 3 luồng hoạt động, không cần rời màn.

- [ ] **Step 8: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/form-components/chi-tiet-table/ChiTietTable.tsx
git commit -m "feat(nkc): nút thêm nhanh nghiệp vụ/tài khoản/đối tượng trong bảng hạch toán"
```

---

## Verification cuối

- [ ] `cd fe && npm test` — toàn bộ test xanh.
- [ ] `cd fe && npm run lint` — sạch.
- [ ] `cd fe && npm run build` — build thành công.
- [ ] Smoke test thủ công 3 luồng (Task 7 Step 7).
- [ ] (Tùy chọn) Verify trên server thật rằng user role kế toán tạo được danh mục — đã phân tích là no-op nên không kỳ vọng 403.
