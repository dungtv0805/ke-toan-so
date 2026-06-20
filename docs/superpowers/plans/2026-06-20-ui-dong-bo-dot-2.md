# Đồng bộ giao diện Đợt 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đồng bộ chiều cao control (28px), padding container (12px ở 1 nguồn), phủ FilterBar cho các trang còn lại, và tạo nút Mở/Thu gọn dùng chung — trên toàn frontend.

**Architecture:** Thay đổi theo lớp: (1) token theme toàn cục + (2) padding ở layout → tự động phủ mọi trang; sau đó (3) component dùng chung + (4) migrate từng nhóm trang sang FilterBar và dọn padding/size lẻ tẻ. Mỗi task tự kiểm chứng bằng `tsc` + `vitest` + `build` và kiểm thị giác.

**Tech Stack:** React 18 + TypeScript + Vite, Ant Design 5 (ConfigProvider theme tokens), Tailwind, Vitest.

## Global Constraints

- **controlHeight = 28**, controlHeightSM = 24, controlHeightLG = 36 (token theme, App.tsx). KHÔNG đổi `colorPrimary` (#1890ff), radius (đã = 0), fontSize, màu.
- **Padding container = 12px** đặt DUY NHẤT ở `MainLayout` Content. Mọi page root KHÔNG tự set padding.
- **Nhịp dọc page root = `space-y-3`** (12px) — thay mọi `space-y-6`/`space-y-4`/`space-y-2` ở root.
- **`size="small"`** chỉ giữ cho: nút icon inline trong dòng bảng (sửa/xóa) + `ExpandCollapseButtons`. Bỏ ở nút hành động/filter (để mặc định = 28px).
- **Trang tree KHÔNG migrate FilterBar:** `BangCanDoiPage`, `BangTongHopCongNoPage` (chỉ áp padding + size).
- **Trang cấu hình** (tenant, vai-tro, thanh-vien, phan-quyen): chỉ áp padding + size, không thêm FilterBar.
- Lệnh kiểm chứng (chạy trong `fe/`): typecheck `npx tsc --noEmit`; test `npx vitest run`; build `npm run build`.
- Commit thường xuyên, mỗi task ≥ 1 commit. Co-Authored-By footer theo chuẩn repo.

---

### Task 1: Token theme — chiều cao control 28px

**Files:**
- Modify: `fe/src/App.tsx:62-71` (theme token block)

**Interfaces:**
- Produces: theme toàn cục với `controlHeight:28` — mọi Button/Input/Select/DatePicker mặc định cao 28px; `size="small"`=24px, `size="large"`=36px.

- [ ] **Step 1: Sửa token block**

Thay block `token: {...}` trong `fe/src/App.tsx` thành:

```tsx
        token: {
          colorPrimary: '#1890ff',
          // Đồng bộ toàn dự án: bo góc = 0 (giữ tròn cho avatar/chấm/spinner riêng).
          borderRadius: 0,
          borderRadiusLG: 0,
          borderRadiusSM: 0,
          borderRadiusXS: 0,
          // Đợt 2: chiều cao control đồng nhất (compact).
          controlHeight: 28,
          controlHeightSM: 24,
          controlHeightLG: 36,
        },
```

- [ ] **Step 2: Typecheck**

Run (trong `fe/`): `npx tsc --noEmit`
Expected: 0 lỗi.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add fe/src/App.tsx
git commit -m "feat(ui): controlHeight 28 đồng nhất chiều cao control (đợt 2)"
```

---

### Task 2: Padding container 1 nguồn (12px) ở layout

**Files:**
- Modify: `fe/src/components/layout/MainLayout.tsx:751-758` (Content)

**Interfaces:**
- Consumes: không.
- Produces: Content padding cố định 12px. Mọi trang sẽ dựa vào lề này; các task sau gỡ padding tự thêm.

- [ ] **Step 1: Sửa Content**

Trong `fe/src/components/layout/MainLayout.tsx`, đổi:

```tsx
        <Content
          className="p-2 sm:p-3"
          style={{
            background: "hsl(var(--background))",
            height: "calc(100vh - 48px)",
            overflow: "auto",
          }}
        >
```

thành (bỏ class padding, set padding 12 inline):

```tsx
        <Content
          style={{
            background: "hsl(var(--background))",
            height: "calc(100vh - 48px)",
            overflow: "auto",
            padding: 12,
          }}
        >
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 lỗi, build OK.

- [ ] **Step 3: Kiểm thị giác**

Chạy `npm run dev`, mở vài trang danh mục — xác nhận lề ngoài đều 12px. (Trang tự thêm padding sẽ còn dư đến khi Task 4–8 dọn.)

- [ ] **Step 4: Commit**

```bash
git add fe/src/components/layout/MainLayout.tsx
git commit -m "feat(ui): padding container 12px 1 nguồn ở MainLayout (đợt 2)"
```

---

### Task 3: Component `ExpandCollapseButtons` dùng chung

**Files:**
- Create: `fe/src/components/common/ExpandCollapseButtons.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface ExpandCollapseButtonsProps {
    onExpandAll: () => void;
    onCollapseAll: () => void;
    size?: 'small' | 'middle'; // mặc định 'small'
    className?: string;
  }
  export function ExpandCollapseButtons(props: ExpandCollapseButtonsProps): JSX.Element
  ```

- [ ] **Step 1: Tạo component**

Tạo `fe/src/components/common/ExpandCollapseButtons.tsx`:

```tsx
import { Button, Tooltip } from "antd";
import { PlusSquareOutlined, MinusSquareOutlined } from "@ant-design/icons";

export interface ExpandCollapseButtonsProps {
  /** Mở tất cả node có con. */
  onExpandAll: () => void;
  /** Thu gọn toàn bộ. */
  onCollapseAll: () => void;
  size?: "small" | "middle";
  className?: string;
}

/**
 * Cặp nút Mở tất cả / Thu gọn dùng chung cho mọi bảng cây.
 * 2 nút icon + tooltip, canh phải.
 */
export function ExpandCollapseButtons({
  onExpandAll,
  onCollapseAll,
  size = "small",
  className,
}: ExpandCollapseButtonsProps) {
  return (
    <Button.Group className={className}>
      <Tooltip title="Mở tất cả">
        <Button size={size} icon={<PlusSquareOutlined />} onClick={onExpandAll} />
      </Tooltip>
      <Tooltip title="Thu gọn">
        <Button size={size} icon={<MinusSquareOutlined />} onClick={onCollapseAll} />
      </Tooltip>
    </Button.Group>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 lỗi (component chưa dùng vẫn compile vì là export — nếu tsc báo unused, sẽ hết sau Task 4/8 khi import).

- [ ] **Step 3: Commit**

```bash
git add fe/src/components/common/ExpandCollapseButtons.tsx
git commit -m "feat(ui): component ExpandCollapseButtons dùng chung (đợt 2)"
```

---

### Task 4: Báo cáo tài chính — PeriodFilter gọn + FilterBar + ExpandCollapse + dọn padding/size

**Files:**
- Modify: `fe/src/components/shared/PeriodFilter.tsx` (bỏ label rời, không wrap)
- Modify: `fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx` (root padding, FilterBar, 3 chỗ ExpandCollapse, bỏ size="small" nút Xuất/Làm mới)

**Interfaces:**
- Consumes: `ExpandCollapseButtons` (Task 3), `FilterBar` (`@/components/common/FilterBar`), `collectParentKeys`, state `tbExpanded/bsTaiSanExpanded/bsNguonVonExpanded`.
- Produces: trang tài chính dùng FilterBar + ExpandCollapseButtons.

- [ ] **Step 1: Dọn PeriodFilter**

Trong `PeriodFilter.tsx`, sửa hàm render (`return <Space wrap ...>`):
- Bỏ `wrap` ở `<Space>` ngoài cùng (đổi `<Space wrap align="center" size="middle">` → `<Space align="center" size="small">`).
- Thêm icon lịch đầu hàng: import `CalendarOutlined` từ `@ant-design/icons`, đặt `<CalendarOutlined style={{ color: '#1890ff' }} />` ngay sau `<Space ...>` mở.
- Bỏ 4 cụm `<Typography.Text type="secondary">Ngày/Tháng/Quý/Năm</Typography.Text>` — chuyển nhãn vào `placeholder` của Select tương ứng (Ngày: placeholder "Ngày"; Tháng giữ options "Tháng N"; Quý placeholder "Quý"; Năm giữ value). Mỗi Select bỏ lớp `<Space size={4} align="center">` bọc, để Select đứng trực tiếp trong Space ngoài.
- Bỏ `size="middle"` ở các Select (để mặc định 28px). Giữ logic handlers nguyên vẹn.
- Đổi nút "Xem báo cáo" bỏ `size="middle"` (mặc định 28px).

Kết quả 1 hàng: `📅 [Ngày▾][Tháng▾][Quý▾][Năm▾] · Tùy chọn [Xem báo cáo]`.

- [ ] **Step 2: Dọn root + header BaoCaoTaiChinhPage**

Trong `BaoCaoTaiChinhPage.tsx`:
- Root div (dòng ~533): đổi `style={{ padding: '8px 16px', height: 'calc(100vh - 48px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}` → `style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}` (bỏ padding, đổi height về 100%).
- Header nút (dòng ~545-548): bỏ `size="small"` ở `<Button ... >Xuất Excel</Button>` và `<Button ... >Làm mới</Button>`.

- [ ] **Step 3: Bọc PeriodFilter trong FilterBar**

Import `FilterBar` từ `@/components/common/FilterBar`. Đổi block (dòng ~552-554):

```tsx
        <div style={{ marginBottom: 4 }}>
          <PeriodFilter onFilter={handleFilter} loading={loading} />
        </div>
```

thành — đặt các control kỳ của PeriodFilter làm `filters`. Vì PeriodFilter tự chứa cả nút "Xem báo cáo", giữ nguyên PeriodFilter làm `filters` và không dùng `actions`:

```tsx
        <FilterBar
          className="mb-1"
          filters={<PeriodFilter onFilter={handleFilter} loading={loading} />}
        />
```

- [ ] **Step 4: Thay 3 chỗ Mở/Thu gọn bằng ExpandCollapseButtons**

Import `ExpandCollapseButtons`. Thay 3 block `<Space ...><Button>Mở tất cả</Button><Button>Thu gọn</Button></Space>`:

Tab "Cân đối tài khoản" (dòng ~602-609):
```tsx
                <div style={{ marginBottom: 8, textAlign: 'right' }}>
                  <ExpandCollapseButtons
                    onExpandAll={() => setTbExpanded(collectParentKeys(trialBalanceTree))}
                    onCollapseAll={() => setTbExpanded([])}
                  />
                </div>
```

Card "TÀI SẢN" (dòng ~663-668):
```tsx
                  <div style={{ marginBottom: 8, textAlign: 'right' }}>
                    <ExpandCollapseButtons
                      onExpandAll={() => setBsTaiSanExpanded(collectParentKeys(taiSanTree))}
                      onCollapseAll={() => setBsTaiSanExpanded([])}
                    />
                  </div>
```

Card "NGUỒN VỐN" (dòng ~682-687):
```tsx
                  <div style={{ marginBottom: 8, textAlign: 'right' }}>
                    <ExpandCollapseButtons
                      onExpandAll={() => setBsNguonVonExpanded(collectParentKeys(nguonVonTree))}
                      onCollapseAll={() => setBsNguonVonExpanded([])}
                    />
                  </div>
```

- [ ] **Step 5: Typecheck + test + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 0 lỗi tsc; test pass (gồm `buildAccountTree.test.ts`); build OK.

- [ ] **Step 6: Kiểm thị giác**

`npm run dev` → trang Báo cáo tài chính: filter 1 hàng gọn trong khung FilterBar; nút Mở/Thu gọn là 2 icon có tooltip canh phải; lề ngoài 12px; không scroll dư.

- [ ] **Step 7: Commit**

```bash
git add fe/src/components/shared/PeriodFilter.tsx fe/src/pages/bao-cao/tai-chinh/BaoCaoTaiChinhPage.tsx
git commit -m "feat(ui): báo cáo tài chính dùng FilterBar + ExpandCollapseButtons, dọn padding (đợt 2)"
```

---

### Task 5: Sổ Dư Đầu Kỳ — ExpandCollapseButtons

**Files:**
- Modify: `fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx:356-359` (2 nút Mở/Thu gọn)

**Interfaces:**
- Consumes: `ExpandCollapseButtons` (Task 3), `collectExpandKeys`, state `expandedKeys`/`setExpandedKeys`.

- [ ] **Step 1: Thay 2 nút**

Import `ExpandCollapseButtons` từ `@/components/common/ExpandCollapseButtons`. Thay 2 dòng:

```tsx
<Button size="small" onClick={() => setExpandedKeys(collectExpandKeys(tree))}>
  Mở tất cả
</Button>
<Button size="small" onClick={() => setExpandedKeys([])}>Thu gọn</Button>
```

bằng:

```tsx
<ExpandCollapseButtons
  onExpandAll={() => setExpandedKeys(collectExpandKeys(tree))}
  onCollapseAll={() => setExpandedKeys([])}
/>
```

(Nếu `Button` không còn dùng ở file, xóa khỏi import antd để tránh cảnh báo unused.)

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 lỗi, build OK.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/danh-muc/so-du-dau-ky/SoDuDauKyPage.tsx
git commit -m "feat(ui): so-du-dau-ky dùng ExpandCollapseButtons (đợt 2)"
```

---

### Task 6: Công nợ (phải trả + phải thu) — FilterBar + dọn padding

**Files:**
- Modify: `fe/src/pages/cong-no/phai-tra/CongNoPhaiTraPage.tsx` (root padding, search Card.extra → FilterBar)
- Modify: `fe/src/pages/cong-no/phai-thu/CongNoPhaiThuPage.tsx` (tương tự)

**Interfaces:**
- Consumes: `FilterBar` (`@/components/common/FilterBar`); state hiện có `searchText/setSearchText/handleSearch`.

- [ ] **Step 1: phai-tra — root + FilterBar**

Đọc file. Sửa:
- Root div: bỏ `style={{ padding: '24px' }}` → `<div>` hoặc `<div className="space-y-3">` (giữ class khác nếu có).
- Khối filter trong `Card.extra` (`<Space><Input prefix={SearchOutlined}.../><Button>Xuất Excel</Button><Button>Làm mới</Button></Space>`, dòng ~517-531): thay bằng `<FilterBar>`:

```tsx
<FilterBar
  search={{
    value: searchText,
    onChange: setSearchText,
    onSearch: handleSearch,
    placeholder: "Tìm theo tên, mã NCC...",
  }}
  actions={
    <>
      <Button icon={<ExportOutlined />}>Xuất Excel</Button>
      <Button type="primary" icon={<ReloadOutlined />} onClick={/* handler làm mới hiện có */}>Làm mới</Button>
    </>
  }
/>
```

Nếu FilterBar nằm trong Card.extra không hợp (FilterBar là 1 cục riêng), chuyển nó ra ngoài Card — đặt trên Card bảng. Bỏ `size="small"` ở các nút.
- Import `FilterBar`; bỏ import `Input`/`SearchOutlined` nếu không còn dùng.

- [ ] **Step 2: phai-thu — lặp lại y hệt**

Áp dụng đúng các sửa của Step 1 cho `CongNoPhaiThuPage.tsx` (cùng cấu trúc; placeholder đổi "Tìm theo tên, mã KH..." nếu phù hợp ngữ cảnh phải thu).

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 lỗi, build OK.

- [ ] **Step 4: Kiểm thị giác**

`npm run dev` → 2 trang công nợ: filter là 1 cục FilterBar (search trái, nút phải), lề 12px, nút cùng cao 28px.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/cong-no/phai-tra/CongNoPhaiTraPage.tsx fe/src/pages/cong-no/phai-thu/CongNoPhaiThuPage.tsx
git commit -m "feat(ui): công nợ phải trả/thu dùng FilterBar, dọn padding (đợt 2)"
```

---

### Task 7: Sổ quỹ — FilterBar + dọn padding

**Files:**
- Modify: `fe/src/pages/so-quy/SoQuyPage.tsx` (root, Card.extra search+RangePicker → FilterBar)

**Interfaces:**
- Consumes: `FilterBar`; state `searchText`, RangePicker value/handler hiện có.

- [ ] **Step 1: Sửa**

Đọc file. Sửa:
- Root: giữ `<div className="flex flex-col gap-6">` → đổi `gap-6` → `gap-3` cho nhịp 12px (không thêm padding).
- Khối `Card.extra` (`<Space><Input prefix={SearchOutlined}/><RangePicker/><Button>Xuất Excel</Button><Button>Làm mới</Button></Space>`, dòng ~45-119) → `<FilterBar>`:

```tsx
<FilterBar
  search={{ value: searchText, onChange: setSearchText, placeholder: "Tìm kiếm..." }}
  filters={<RangePicker /* props value/onChange hiện có */ />}
  actions={
    <>
      <Button icon={<ExportOutlined />}>Xuất Excel</Button>
      <Button type="primary" icon={<ReloadOutlined />} onClick={/* handler hiện có */}>Làm mới</Button>
    </>
  }
/>
```

Đặt FilterBar ngoài Card (trên bảng). Bỏ `size="small"` ở nút. Import `FilterBar`; dọn import thừa.

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 lỗi, build OK.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/so-quy/SoQuyPage.tsx
git commit -m "feat(ui): sổ quỹ dùng FilterBar, nhịp 12px (đợt 2)"
```

---

### Task 8: Sổ cái + Sổ chi tiết TK + P&L — FilterBar + dọn padding

**Files:**
- Modify: `fe/src/pages/bao-cao/so-cai/SoCaiPage.tsx` (root padding `24px`, Select tài khoản → FilterBar filters)
- Modify: `fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx` (control kỳ/TK → FilterBar)
- Modify: `fe/src/pages/bao-cao/pnl/PnLPage.tsx` (root padding `24`, bộ lọc → FilterBar)

**Interfaces:**
- Consumes: `FilterBar`; các state filter hiện có của từng trang.

- [ ] **Step 1: SoCaiPage**

Đọc file. Root: bỏ `style={{ padding: '24px' }}`. Khối `<Space style={{ marginBottom: 16 }}><span>Chọn tài khoản:</span><Select.../></Space>` (dòng ~375-389) → `<FilterBar filters={<Select ... />} actions={<Button icon={<ExportOutlined/>}>Xuất Excel</Button>} />` (giữ các nút Xuất/Làm mới hiện có vào actions, bỏ `size="small"`). Bỏ `size="small"` nút "Xem" inline trong bảng CHỈ nếu nó là nút hành động dòng — giữ small cho nút trong cell.

- [ ] **Step 2: SoChiTietTaiKhoanPage**

Đọc file. Root: bỏ padding nếu có. Gom các control kỳ/tài khoản hiện có vào `<FilterBar filters={...} actions={...}>`. Giữ logic. (ColumnChooser giữ nguyên — nút "Chọn tất cả/Đặt lại" trong đó là nội bộ.)

- [ ] **Step 3: PnLPage**

Đọc file. Root: bỏ `style={{ padding: 24 }}`. Bộ lọc kỳ → `<FilterBar>` (filters = control kỳ, actions = nút xem/xuất). Bỏ `size="small"` nút hành động; giữ small cho nút Mở/Thu gọn nếu có (nếu PnL có tree expand, dùng `ExpandCollapseButtons` từ Task 3).

- [ ] **Step 4: Typecheck + test + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 0 lỗi, test pass, build OK.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/bao-cao/so-cai/SoCaiPage.tsx fe/src/pages/bao-cao/so-chi-tiet-tai-khoan/SoChiTietTaiKhoanPage.tsx fe/src/pages/bao-cao/pnl/PnLPage.tsx
git commit -m "feat(ui): so-cai/so-chi-tiet/pnl dùng FilterBar, dọn padding (đợt 2)"
```

---

### Task 9: Sweep — gỡ padding tự thêm + chuẩn `space-y-3` + bỏ size="small" lẻ

**Files (root page, gỡ padding + chuẩn nhịp dọc):**
- `fe/src/pages/cau-hinh/tenant/TenantPage.tsx` — bỏ `className="p-6"` → `space-y-3`
- `fe/src/pages/cau-hinh/vai-tro/VaiTroPage.tsx` — bỏ `p-6` → `space-y-3`
- `fe/src/pages/cau-hinh/thanh-vien/ThanhVienPage.tsx` — bỏ `p-6` → `space-y-3`
- `fe/src/pages/cau-hinh/phan-quyen/PhanQuyenPage.tsx` — bỏ `padding: "12px 24px"` khỏi inline style; đổi `height: "calc(100vh - 48px - 24px)"` → `height: "100%"`
- `fe/src/pages/danh-muc/quy-chuan/QuyChaunPage.tsx` — bỏ `style={{ padding: '24px' }}`
- `fe/src/pages/bao-cao/bang-can-doi/BangCanDoiPage.tsx` — bỏ `style={{ padding: 24 }}`
- `fe/src/pages/bao-cao/kqkd/KqkdPage.tsx` — bỏ `p-4` khỏi `className="kqkd-page space-y-4 p-4"` → `kqkd-page space-y-3`
- Mọi page root đang dùng `space-y-6` (≈17 trang danh mục) → đổi `space-y-6` → `space-y-3`. Mọi `space-y-4`/`space-y-2` ở **root page** → `space-y-3`.

**Interfaces:** không (thuần style).

- [ ] **Step 1: Liệt kê chính xác các chỗ cần sửa**

Run (trong `fe/`):
```bash
grep -rn "padding: '24px'\|padding: 24\|padding: \"12px 24px\"\|padding: '8px 16px'\|className=\"p-6\"\|className=\"p-4\"\| p-6\"\| p-4\"\| p-2\"" src/pages
grep -rln "space-y-6\|space-y-4\|space-y-2" src/pages
```
Lập danh sách file + dòng từ kết quả.

- [ ] **Step 2: Gỡ padding tự thêm**

Với mỗi file ở danh sách trên: xóa khai báo padding inline (giữ các thuộc tính style khác) hoặc bỏ class `p-6/p-4/p-2` ở **root** page. KHÔNG đụng padding bên trong Card/bodyStyle (đó là padding nội dung, hợp lệ).

- [ ] **Step 3: Chuẩn nhịp dọc**

Với mỗi root page, đổi `space-y-6`/`space-y-4`/`space-y-2` (CHỈ ở thẻ div root) → `space-y-3`. Không đổi `space-y-*` ở các component con sâu bên trong.

- [ ] **Step 4: Bỏ size="small" lẻ tẻ ở nút hành động**

Run: `grep -rn 'size="small"' src/pages`
Với mỗi kết quả: nếu là nút **hành động** (Thêm/Xuất/Làm mới/Lưu/toggle filter) hoặc nút trong toolbar → **bỏ** `size="small"`. GIỮ `size="small"` nếu là nút icon **inline trong cột bảng** (render trong `columns`/cell sửa-xóa) hoặc trong `ExpandCollapseButtons`. Khi nghi ngờ, giữ nguyên và ghi chú để review.

- [ ] **Step 5: Typecheck + test + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 0 lỗi, test pass, build OK.

- [ ] **Step 6: Kiểm thị giác đại diện**

`npm run dev` → mở: 1 trang danh mục, 1 trang cấu hình, 1 trang báo cáo tree (bang-can-doi), kqkd. Xác nhận: lề 12px đều; nhịp dọc đều; nút cùng cao 28px; không trang nào double padding.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): gỡ padding tự thêm, chuẩn space-y-3, bỏ size=small lẻ tẻ (đợt 2)"
```

---

### Task 10: Rà soát cuối + cập nhật context

**Files:**
- Modify (nếu cần): `fe/src/index.css` (rà override height nút)
- Đọc: `.claude/context/active-pages.md` (đối chiếu danh sách trang)

- [ ] **Step 1: Rà CSS override xung đột**

Run: `grep -n "height:" fe/src/index.css | grep -i "btn\|control"`
Kiểm tra `.excel-table .ant-btn-sm { height: 24px }` còn khớp controlHeightSM=24 (giữ). Nếu có override `height` cứng cho `.ant-btn` thường khác 28px → cân nhắc bỏ để theo token. Nếu không có → bỏ qua.

- [ ] **Step 2: Quét sót**

Run:
```bash
grep -rn 'size="small"' fe/src/pages | grep -iv "columns\|render\|cell\|ExpandCollapse"
grep -rn "padding: '24px'\|padding: 24\|className=\"p-6\"\|className=\"p-4\"" fe/src/pages
grep -rln "space-y-6" fe/src/pages
```
Expected: không còn nút hành động `size="small"`, không còn padding tự thêm/`space-y-6` ở root. Nếu còn sót hợp lệ (cố ý) → ghi chú.

- [ ] **Step 3: Build cuối**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tất cả pass.

- [ ] **Step 4: Commit (nếu có thay đổi)**

```bash
git add -A
git commit -m "chore(ui): rà soát cuối đồng bộ giao diện đợt 2"
```

---

### Task 11: Chuẩn tiêu đề trang — gỡ Title lớn ở 9 trang danh mục (chỉ giữ Breadcrumb)

**Files (gỡ khối header `Title level={3}` + subtitle, giữ Breadcrumb):**
- `fe/src/pages/danh-muc/ngan-hang/NganHangPage.tsx` (title@~296, có 2 nút → kiểm tra)
- `fe/src/pages/danh-muc/loai-chung-tu/LoaiChungTuPage.tsx` (title@~239, không nút)
- `fe/src/pages/danh-muc/loai-giao-dich/LoaiGiaoDichPage.tsx` (title@~272, không nút)
- `fe/src/pages/danh-muc/dong-tien/DongTienPage.tsx` (title@~286, **có nút inline**)
- `fe/src/pages/danh-muc/khoan-muc/KhoanMucPage.tsx` (title@~370, không nút)
- `fe/src/pages/danh-muc/san-pham/SanPhamPage.tsx` (title@~322, **có nút**)
- `fe/src/pages/danh-muc/du-an/DuAnPage.tsx` (title@~469, **có nút**)
- `fe/src/pages/danh-muc/nhom-khoan-muc/NhomKhoanMucPage.tsx` (title@~229)
- `fe/src/pages/danh-muc/bo-phan/BoPhanPage.tsx` (title@~250, **có nút**)

**Interfaces:** Consumes `FilterBar` (cả 9 trang đã import & dùng sẵn).

- [ ] **Step 1: Với mỗi trang — xác định khối header**

Đọc file, tìm khối:
```tsx
{/* Header */}
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
  <div>
    <Title level={3} className="!mb-1 flex items-center gap-2">
      <SomeIcon className="text-primary" />
      ...tiêu đề...
    </Title>
    <Text type="secondary">...subtitle...</Text>
  </div>
  {/* (có thể có) <Space>...nút...</Space> */}
</div>
```

- [ ] **Step 2: Gỡ khối header, bảo toàn nút**

- Nếu khối KHÔNG có nút (loai-chung-tu, loai-giao-dich, khoan-muc, nhom-khoan-muc): **xóa toàn bộ khối** `<div className="flex ...">...</div>`. Giữ Breadcrumb phía trên.
- Nếu khối CÓ `<Space>` nút bên phải (ngan-hang, dong-tien, san-pham, du-an, bo-phan): xóa khối header NHƯNG đưa các nút đó vào `actions` của `<FilterBar>` đang có trong file. Nếu FilterBar đã có `actions` → gộp thêm (không trùng lặp nút). Bỏ `size="small"` nếu có (theo Global Constraints).
- Sau khi xóa, nếu `Title`/`Text` không còn dùng trong file → bỏ khỏi import `Typography`/antd để tránh unused.

- [ ] **Step 3: Typecheck + build**

Run (trong `fe/`): `npx tsc --noEmit && npm run build`
Expected: 0 lỗi, build OK.

- [ ] **Step 4: Kiểm thị giác**

`npm run dev` → mở 9 trang: chỉ còn Breadcrumb (giống báo cáo/công nợ); nút hành động vẫn còn (trong FilterBar); Stats Cards (nếu có) giữ nguyên.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/danh-muc
git commit -m "feat(ui): gỡ title lớn 9 trang danh mục, chuẩn breadcrumb-only (đợt 2)"
```

---

## Self-Review (đã thực hiện khi viết plan)

- **Spec coverage:** Phần 1 (controlHeight)→Task 1; Phần 2 (padding/space-y/full-height)→Task 2 + Task 4(root) + Task 9; Phần 3 (FilterBar: công nợ→T6, sổ quỹ→T7, so-cai/so-chi-tiet/pnl→T8, tài chính+PeriodFilter→T4; tree pages loại trừ)→ đủ; Phần 4 (ExpandCollapseButtons + 4 chỗ)→Task 3 + Task 4 (3 chỗ) + Task 5 (1 chỗ); Phần 5 (chuẩn title breadcrumb-only)→Task 11. ✅
- **Placeholder scan:** Các bước sweep (Task 9) dùng grep + quy tắc rõ ràng thay vì liệt kê cứng từng dòng (mã sẽ đổi theo thời điểm chạy) — kèm lệnh cụ thể và tiêu chí quyết định. Không có "TODO/sau này".
- **Type consistency:** `ExpandCollapseButtons` props (`onExpandAll/onCollapseAll/size`) khớp ở Task 3/4/5. `FilterBar` props (`search/filters/actions/className`) khớp component thật.
