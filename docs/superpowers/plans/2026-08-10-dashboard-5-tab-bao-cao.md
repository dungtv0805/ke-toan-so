# Dashboard 5 tab báo cáo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm lại trang Tổng quan (`/`) thành 5 tab báo cáo — Tổng quan · Dòng tiền · Kết quả kinh doanh · Công nợ · Bán hàng — chạy trên dữ liệu thật, bỏ hai tab UI mẫu.

**Architecture:** `Dashboard.tsx` rút gọn thành khung: thanh lọc kỳ + chuyển tab, mỗi tab là một file trong `tabs/` nhận `{ year, startMonth, endMonth }`. Logic tính toán tách khỏi component thành các module thuần có unit test. Phần lớn dữ liệu lấy từ endpoint đã có (`so-cai/trial-balance`, `payable/*`, `bao-cao/*`); backend chỉ thêm EBITDA, mở rộng chiều cho `loi-nhuan-theo`, và một endpoint `doanh-so-theo`.

**Tech Stack:** React 18 + TypeScript + Vite, Ant Design 5, Recharts, TanStack React Query, vitest (FE) · NestJS 11, jest (BE)

**Spec:** `docs/superpowers/specs/2026-08-10-dashboard-5-tab-bao-cao-design.md`

## Global Constraints

- Ngôn ngữ UI: **tiếng Việt**, có dấu. Tên biến/hàm tiếng Việt không dấu theo lệ sẵn có của repo (`soDuDauKy`, `phatSinhNo`, `tinhCanhBao`).
- Tiền tệ định dạng qua `formatCurrency` / `formatShortCurrency` trong `fe/src/pages/dashboard/components/format.ts`. Không tự viết `Intl.NumberFormat` mới.
- Màu biểu đồ lấy từ `DASH_COLORS` trong cùng file đó. Không hardcode mã hex mới ngoài bảng màu đã có trong từng component.
- Endpoint BE mới phải có `@Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')` và lấy tenant từ `@CurrentUser() user: UserPayload` → `user.tenantId`, khớp các route `bao-cao` hiện có.
- Test FE: `vitest`, file `*.test.ts` đặt **cạnh** file được test. Test BE: `jest`, file `*.spec.ts` đặt cạnh, chỉ test helper thuần (không dựng Nest module).
- Không thêm thư viện mới vào `package.json` ở cả FE lẫn BE.
- Commit message tiếng Việt, prefix `feat(dashboard):` / `fix(dashboard):` / `refactor(dashboard):` theo lệ repo.
- **Môi trường:** node cài qua nvm và KHÔNG có sẵn trong PATH của shell không tương tác.
  Mọi lệnh `npm` / `npx` / `yarn` phải chạy sau:
  `export PATH="$HOME/.nvm/versions/node/v22.0.0/bin:$PATH"`
- **Baseline BE có lỗi sẵn, không phải do bạn:** `yarn test` toàn bộ đang fail 13 suite
  / 34 test ở `auth`, `gateway`, `master-data`, `voucher`, `cash-book`; `npx tsc --noEmit`
  cũng có lỗi sẵn ở `voucher-service` và `libs/auth`. Chỉ chạy `yarn test reporting-service`
  (baseline 9 suite / 84 test PASS) và chỉ quan tâm lỗi type thuộc `reporting-service`
  hoặc `libs/dto`. **Không sửa** các test fail sẵn — ngoài phạm vi.
- Baseline FE sạch: `npm run test` = 710 test / 99 file PASS. Sau thay đổi phải vẫn PASS
  toàn bộ, cộng thêm các test mới của task.
- **Ngoài phạm vi tuyệt đối:** module kế hoạch/ngân sách/dự báo; danh mục Khu vực-Điểm và Nguồn khách hàng; luồng ký biên bản đối chiếu.

## File Structure

**Tạo mới — FE**

| File | Trách nhiệm |
|---|---|
| `fe/src/pages/dashboard/tabs/TongQuanTab.tsx` | Layout tab Tổng quan: hàng KPI + các chart cũ |
| `fe/src/pages/dashboard/tabs/DongTienTab.tsx` | Layout tab Dòng tiền |
| `fe/src/pages/dashboard/tabs/KqkdTab.tsx` | Layout tab Kết quả kinh doanh |
| `fe/src/pages/dashboard/tabs/CongNoTab.tsx` | Layout tab Công nợ |
| `fe/src/pages/dashboard/tabs/BanHangTab.tsx` | Layout tab Bán hàng |
| `fe/src/pages/dashboard/components/KpiRow.tsx` | Hàng thẻ KPI dùng chung cho cả 5 tab |
| `fe/src/pages/dashboard/components/CanhBaoModal.tsx` | Modal liệt kê cảnh báo |
| `fe/src/pages/dashboard/components/TienTheoTaiKhoanTable.tsx` | Bảng số dư TK/quỹ |
| `fe/src/pages/dashboard/components/LichThanhToanTables.tsx` | Hai bảng lịch thu/trả nợ |
| `fe/src/pages/dashboard/components/DoiChieuCongNoTable.tsx` | Bảng đối chiếu công nợ + nút xuất Excel |
| `fe/src/pages/dashboard/components/XuHuongChiTieuChart.tsx` | Chart xu hướng từng chỉ tiêu KQKD |
| `fe/src/pages/dashboard/components/LoiNhuanTheoChieuChart.tsx` | Chart lợi nhuận theo chiều |
| `fe/src/pages/dashboard/components/DoanhSoTheoThoiGianChart.tsx` | Chart doanh số theo ngày/tháng/quý/năm |
| `fe/src/pages/dashboard/components/DoanhSoTheoChieuChart.tsx` | Chart doanh số theo chiều |
| `fe/src/pages/dashboard/trialBalanceDerive.ts` | Hàm thuần dẫn xuất số liệu từ trial balance |
| `fe/src/pages/dashboard/canhBao.ts` | Hàm thuần tính danh sách cảnh báo |
| `fe/src/pages/dashboard/lichThanhToan.ts` | Hàm thuần gom công nợ theo mốc đến hạn |
| `fe/src/pages/dashboard/soSanhCungKy.ts` | Hàm thuần tính % so cùng kỳ |
| `fe/src/pages/dashboard/doiChieuExport.ts` | Dựng sheet Excel cho bảng đối chiếu |
| `fe/src/services/doanhSoService.ts` | Gọi endpoint `bao-cao/doanh-so-theo` |

Mỗi file `.ts` thuần ở trên có file `.test.ts` cùng tên đi kèm.

**Sửa — FE**

| File | Việc |
|---|---|
| `fe/src/pages/dashboard/Dashboard.tsx` | Rút gọn thành khung 5 tab |
| `fe/src/pages/dashboard/components/DashboardSettingsModal.tsx` | Gỡ khối `tinhHinhThucHien` |
| `fe/src/services/dashboardService.ts` | Thêm hàm lấy trial balance và công nợ thô |
| `fe/src/services/kqkdService.ts` | Thêm trường `ebitda` vào type |

**Xoá — FE**

- `fe/src/pages/dashboard/components/MockTabDashboard.tsx`
- `fe/src/pages/dashboard/components/ExecutionStatusCharts.tsx`

**Tạo mới — BE**

- `be/apps/reporting-service/src/bao-cao/doanh-so.helper.ts` + `doanh-so.helper.spec.ts`
- `be/libs/dto/src/reporting/doanh-so.dto.ts`

**Sửa — BE**

- `be/apps/reporting-service/src/bao-cao/bao-cao.helper.ts` — thêm `DIMENSION_FIELD_MAP`, `nhanChieu`, `tinhEbitda`
- `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts` — test cho ba hàm trên
- `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts` — EBITDA, mở rộng `getLoiNhuanByDimension`, thêm `getDoanhSoTheo`
- `be/apps/reporting-service/src/bao-cao/bao-cao.controller.ts` — route `doanh-so-theo`
- `be/libs/dto/src/reporting/kqkd.dto.ts` — thêm `ebitda` vào `KqkdReport`

---

### Task 1: Khung 5 tab

Dựng lại `Dashboard.tsx` thành khung điều hướng, chuyển layout tab Tài chính hiện tại sang `TongQuanTab.tsx` nguyên vẹn, bốn tab còn lại là placeholder rỗng. Xoá hai component mẫu.

**Files:**
- Modify: `fe/src/pages/dashboard/Dashboard.tsx`
- Modify: `fe/src/pages/dashboard/components/DashboardSettingsModal.tsx:21-29`
- Create: `fe/src/pages/dashboard/tabs/TongQuanTab.tsx`
- Create: `fe/src/pages/dashboard/tabs/DongTienTab.tsx`
- Create: `fe/src/pages/dashboard/tabs/KqkdTab.tsx`
- Create: `fe/src/pages/dashboard/tabs/CongNoTab.tsx`
- Create: `fe/src/pages/dashboard/tabs/BanHangTab.tsx`
- Delete: `fe/src/pages/dashboard/components/MockTabDashboard.tsx`
- Delete: `fe/src/pages/dashboard/components/ExecutionStatusCharts.tsx`

**Interfaces:**
- Produces: `TabProps` — mọi tab về sau đều nhận đúng interface này.

```ts
export interface TabProps {
  year: number;
  startMonth: number;
  endMonth: number;
}
```

- [ ] **Step 1: Tạo file type dùng chung cho tab**

Tạo `fe/src/pages/dashboard/tabs/TabProps.ts`:

```ts
/** Props chung của mọi tab dashboard — nhận từ thanh lọc kỳ ở Dashboard.tsx. */
export interface TabProps {
  year: number;
  startMonth: number;
  endMonth: number;
}
```

- [ ] **Step 2: Tạo TongQuanTab bằng cách bê nguyên layout tab Tài chính**

Tạo `fe/src/pages/dashboard/tabs/TongQuanTab.tsx`. Nội dung là phần JSX đang nằm trong nhánh `activeTab === 'tai-chinh'` của `Dashboard.tsx:120-146`, **bỏ khối `ExecutionStatusCharts`**:

```tsx
import React from 'react';
import { Row, Col } from 'antd';
import RevenueTrendChart from '../components/RevenueTrendChart';
import CashFlowChart from '../components/CashFlowChart';
import RevenueExpenseBreakdownCharts from '../components/RevenueExpenseBreakdownCharts';
import CongNoChart from '../components/CongNoChart';
import BalanceStructureChart from '../components/BalanceStructureChart';
import NghiaVuChinhSachTable from '../components/NghiaVuChinhSachTable';
import type { TabProps } from './TabProps';

interface Props extends TabProps {
  /** Key các khối được bật trong cấu hình của tenant. */
  visibleKeys: string[];
}

const TongQuanTab: React.FC<Props> = ({ year, startMonth, endMonth, visibleKeys }) => {
  const show = (key: string) => visibleKeys.includes(key);

  return (
    <div className="space-y-3">
      {(show('kqkd') || show('dongTien')) && (
        <Row gutter={[12, 12]}>
          {show('kqkd') && (
            <Col xs={24} lg={12}>
              <RevenueTrendChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
          {show('dongTien') && (
            <Col xs={24} lg={12}>
              <CashFlowChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
        </Row>
      )}

      {show('tyTrong') && (
        <RevenueExpenseBreakdownCharts year={year} startMonth={startMonth} endMonth={endMonth} />
      )}

      {(show('congNo') || show('canDoi')) && (
        <Row gutter={[12, 12]}>
          {show('congNo') && (
            <Col xs={24} lg={12}>
              <CongNoChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
          {show('canDoi') && (
            <Col xs={24} lg={12}>
              <BalanceStructureChart />
            </Col>
          )}
        </Row>
      )}

      {show('nghiaVuChinhSach') && <NghiaVuChinhSachTable year={year} />}
    </div>
  );
};

export default TongQuanTab;
```

- [ ] **Step 3: Tạo bốn tab placeholder**

Tạo bốn file với cùng khuôn. `fe/src/pages/dashboard/tabs/DongTienTab.tsx`:

```tsx
import React from 'react';
import { Empty } from 'antd';
import type { TabProps } from './TabProps';

const DongTienTab: React.FC<TabProps> = () => (
  <Empty description="Đang xây dựng" />
);

export default DongTienTab;
```

Lặp lại y hệt cho `KqkdTab.tsx` (`const KqkdTab`), `CongNoTab.tsx` (`const CongNoTab`), `BanHangTab.tsx` (`const BanHangTab`), đổi tên biến và tên export mặc định tương ứng.

- [ ] **Step 4: Viết lại Dashboard.tsx thành khung**

Thay toàn bộ nội dung `fe/src/pages/dashboard/Dashboard.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { Select, Space, Typography, Segmented, ConfigProvider, Button, Tooltip, message } from 'antd';
import { CheckCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import TongQuanTab from './tabs/TongQuanTab';
import DongTienTab from './tabs/DongTienTab';
import KqkdTab from './tabs/KqkdTab';
import CongNoTab from './tabs/CongNoTab';
import BanHangTab from './tabs/BanHangTab';
import DashboardSettingsModal, { ALL_BLOCK_KEYS } from './components/DashboardSettingsModal';
import { PERIOD_OPTIONS, resolvePeriod, type DashboardPeriod } from '@/components/shared/period';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { tenantService } from '@/services/tenantService';

const { Text } = Typography;

const TAB_OPTIONS = [
  { label: 'Tổng quan', value: 'tong-quan' },
  { label: 'Dòng tiền', value: 'dong-tien' },
  { label: 'Kết quả kinh doanh', value: 'kqkd' },
  { label: 'Công nợ', value: 'cong-no' },
  { label: 'Bán hàng', value: 'ban-hang' },
];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<DashboardPeriod>('namNay');
  const { year, startMonth, endMonth } = resolvePeriod(period, CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState<string>('tong-quan');
  const isAdmin = useIsAdmin();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ['dash-config'],
    queryFn: () => tenantService.getDashboardConfig(),
  });

  // config null/undefined = chưa cấu hình → hiện tất cả khối.
  // Lọc bỏ key lạ để cấu hình cũ còn 'tinhHinhThucHien' không gây lỗi.
  const visibleKeys = useMemo(
    () => (Array.isArray(config) ? config.filter((k) => ALL_BLOCK_KEYS.includes(k)) : ALL_BLOCK_KEYS),
    [config],
  );

  const handleSaveConfig = async (blocks: string[]) => {
    setSaving(true);
    try {
      await tenantService.updateDashboardConfig(blocks);
      await refetchConfig();
      message.success('Đã lưu cấu hình báo cáo');
      setSettingsOpen(false);
    } catch {
      message.error('Lưu cấu hình thất bại');
    } finally {
      setSaving(false);
    }
  };

  const tabProps = { year, startMonth, endMonth };

  return (
    <div className="space-y-3">
      <div
        className="sticky z-20 flex flex-wrap items-center justify-between gap-2"
        style={{
          top: 0,
          marginInline: -12,
          padding: '10px 12px',
          background: 'hsl(var(--background))',
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-primary" />
          <Text strong className="text-sm sm:text-base">Tổng quan báo cáo</Text>
        </div>
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemSelectedBg: 'hsl(var(--primary))',
                itemSelectedColor: '#fff',
                itemColor: 'hsl(var(--primary))',
                itemHoverColor: 'hsl(var(--primary))',
                trackBg: 'hsl(var(--primary) / 0.08)',
                fontSize: 15,
              },
            },
          }}
        >
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v as string)}
            options={TAB_OPTIONS}
            size="large"
            className="font-semibold"
          />
        </ConfigProvider>
        <Space wrap>
          <Select
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS}
            style={{ width: 180 }}
            showSearch
            optionFilterProp="label"
          />
          {isAdmin && activeTab === 'tong-quan' && (
            <Tooltip title="Chọn báo cáo hiển thị">
              <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} />
            </Tooltip>
          )}
        </Space>
      </div>

      {activeTab === 'tong-quan' && <TongQuanTab {...tabProps} visibleKeys={visibleKeys} />}
      {activeTab === 'dong-tien' && <DongTienTab {...tabProps} />}
      {activeTab === 'kqkd' && <KqkdTab {...tabProps} />}
      {activeTab === 'cong-no' && <CongNoTab {...tabProps} />}
      {activeTab === 'ban-hang' && <BanHangTab {...tabProps} />}

      <DashboardSettingsModal
        open={settingsOpen}
        value={visibleKeys}
        saving={saving}
        onSave={handleSaveConfig}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
```

- [ ] **Step 5: Gỡ khối "Tình hình thực hiện" khỏi modal cấu hình**

Trong `fe/src/pages/dashboard/components/DashboardSettingsModal.tsx`, xoá dòng
`{ key: 'tinhHinhThucHien', label: 'Tình hình thực hiện' },` khỏi mảng
`DASHBOARD_BLOCKS`. Mảng còn 6 phần tử.

Trong cùng file, tìm phần render preview theo `key` và xoá nhánh ứng với
`tinhHinhThucHien` (khối `RadialBarChart` / `RadialBar` / `PolarAngleAxis`). Nếu sau
khi xoá không còn chỗ nào dùng ba import đó, xoá luôn chúng khỏi dòng `import { ... } from 'recharts'`.

- [ ] **Step 6: Xoá hai component mẫu**

```bash
rm fe/src/pages/dashboard/components/MockTabDashboard.tsx
rm fe/src/pages/dashboard/components/ExecutionStatusCharts.tsx
```

- [ ] **Step 7: Kiểm tra build sạch**

```bash
cd fe && npm run lint && npm run build
```

Kỳ vọng: PASS, không còn tham chiếu tới `MockTabDashboard` hay `ExecutionStatusCharts`.
Nếu lint báo import thừa trong `DashboardSettingsModal.tsx`, xoá import đó rồi chạy lại.

- [ ] **Step 8: Commit**

```bash
git add fe/src/pages/dashboard fe/src/pages/dashboard/tabs
git commit -m "refactor(dashboard): tách trang Tổng quan thành khung 5 tab"
```

---

### Task 2: Thẻ KPI dùng chung

Component `KpiRow` hiển thị hàng thẻ số liệu, dùng lại cho cả 5 tab.

**Files:**
- Create: `fe/src/pages/dashboard/components/KpiRow.tsx`

**Interfaces:**
- Consumes: `formatCurrency`, `formatShortCurrency` từ `./format` (Task 0 — đã có sẵn trong repo).
- Produces:

```ts
export interface KpiItem {
  key: string;
  label: string;
  value: number;
  format?: 'tien' | 'phanTram' | 'soLuong';   // mặc định 'tien'
  inverse?: boolean;                            // true = giá trị dương là xấu (tô đỏ)
  tooltip?: string;                             // giải thích công thức, hiện khi rê chuột lên nhãn
  icon: React.ReactNode;
  onClick?: () => void;
}
```

- [ ] **Step 1: Viết KpiRow**

Tạo `fe/src/pages/dashboard/components/KpiRow.tsx`:

```tsx
import React from 'react';
import { Card, Row, Col, Skeleton, Typography, Tooltip } from 'antd';
import { formatShortCurrency } from './format';

const { Text } = Typography;

export interface KpiItem {
  key: string;
  label: string;
  value: number;
  /** Kiểu hiển thị. Mặc định 'tien'. */
  format?: 'tien' | 'phanTram' | 'soLuong';
  /** true = giá trị dương là tín hiệu xấu (ví dụ số cảnh báo). */
  inverse?: boolean;
  /** Giải thích công thức, hiện khi rê chuột lên nhãn. */
  tooltip?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface Props {
  items: KpiItem[];
  loading?: boolean;
  /** Số cột trên màn hình lớn. 4 (mặc định) hoặc 5. */
  span?: 4 | 5;
}

const formatValue = (item: KpiItem): string => {
  const v = item.value || 0;
  switch (item.format) {
    case 'phanTram':
      return `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
    case 'soLuong':
      return v.toLocaleString('vi-VN');
    default:
      return formatShortCurrency(v);
  }
};

/** Xanh khi tốt, đỏ khi xấu. Giá trị 0 luôn trung tính. */
const valueClass = (item: KpiItem): string => {
  const v = item.value || 0;
  if (v === 0) return 'text-muted-foreground';
  const xau = item.inverse ? v > 0 : v < 0;
  return xau ? 'text-destructive' : 'text-primary';
};

const KpiRow: React.FC<Props> = ({ items, loading, span = 4 }) => {
  const lg = span === 5 ? 24 / 5 : 6;

  return (
    <Row gutter={[12, 12]}>
      {items.map((item) => (
        <Col xs={12} lg={lg} key={item.key}>
          <Card
            className="stat-card h-full"
            hoverable={!!item.onClick}
            onClick={item.onClick}
            style={item.onClick ? { cursor: 'pointer' } : undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Tooltip title={item.tooltip}>
                  <Text className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide font-medium block truncate">
                    {item.label}
                  </Text>
                </Tooltip>
                {loading ? (
                  <Skeleton.Input active size="small" style={{ width: '80%', marginTop: 8 }} />
                ) : (
                  <div className={`mt-1 sm:mt-2 text-lg sm:text-2xl font-bold truncate ${valueClass(item)}`}>
                    {formatValue(item)}
                  </div>
                )}
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 text-base sm:text-xl bg-primary/10 text-primary">
                {item.icon}
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default KpiRow;
```

- [ ] **Step 2: Kiểm tra build**

```bash
cd fe && npm run lint && npm run build
```

Kỳ vọng: PASS.

- [ ] **Step 3: Commit**

```bash
git add fe/src/pages/dashboard/components/KpiRow.tsx
git commit -m "feat(dashboard): thẻ KPI dùng chung cho các tab"
```

---

### Task 3: Dẫn xuất số liệu từ bảng cân đối phát sinh

Các hàm thuần biến `TrialBalance[]` thành số liệu cho KPI, bảng tiền, và bảng đối chiếu công nợ. Đây là nền cho Task 5, 6, 11 — làm trước và test kỹ.

**Files:**
- Create: `fe/src/pages/dashboard/trialBalanceDerive.ts`
- Test: `fe/src/pages/dashboard/trialBalanceDerive.test.ts`

**Interfaces:**
- Consumes: `TrialBalance` từ `@/services/soCaiService` — các trường: `taiKhoan, tenTaiKhoan, soDuDauKyNo, soDuDauKyCo, phatSinhNo, phatSinhCo, soDuCuoiKyNo, soDuCuoiKyCo, doiTuongChiTiet?, tenTaiKhoanNH?, soTaiKhoan?`.
- Produces:

```ts
export interface TienTheoTaiKhoanRow {
  ma: string;
  ten: string;
  duDauKy: number;
  phatSinhNo: number;
  phatSinhCo: number;
  duCuoiKy: number;
}
export interface DoiChieuRow {
  doiTuong: string;
  duDauKy: number;
  phatSinhTang: number;
  phatSinhGiam: number;
  duCuoiKy: number;
}
export function tongTien(tb: TrialBalance[]): number;
export function giaTriTonKho(tb: TrialBalance[]): number;
export function tienTheoTaiKhoan(tb: TrialBalance[]): TienTheoTaiKhoanRow[];
export function doiChieuCongNo(tb: TrialBalance[], loai: 'thu' | 'tra'): DoiChieuRow[];
```

- [ ] **Step 1: Viết test trước**

Tạo `fe/src/pages/dashboard/trialBalanceDerive.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { TrialBalance } from '@/services/soCaiService';
import { tongTien, giaTriTonKho, tienTheoTaiKhoan, doiChieuCongNo } from './trialBalanceDerive';

const tk = (o: Partial<TrialBalance> & { taiKhoan: string }): TrialBalance => ({
  tenTaiKhoan: o.taiKhoan,
  soDuDauKyNo: 0,
  soDuDauKyCo: 0,
  phatSinhNo: 0,
  phatSinhCo: 0,
  soDuCuoiKyNo: 0,
  soDuCuoiKyCo: 0,
  ...o,
});

describe('tongTien', () => {
  it('cộng dư cuối kỳ của TK 111 và 112, trừ dư Có', () => {
    const tb = [
      tk({ taiKhoan: '1111', soDuCuoiKyNo: 300 }),
      tk({ taiKhoan: '1121', soDuCuoiKyNo: 500, soDuCuoiKyCo: 100 }),
      tk({ taiKhoan: '131', soDuCuoiKyNo: 9999 }),
    ];
    expect(tongTien(tb)).toBe(700);
  });

  it('không tính TK 113 (tiền đang chuyển)', () => {
    expect(tongTien([tk({ taiKhoan: '113', soDuCuoiKyNo: 400 })])).toBe(0);
  });

  it('mảng rỗng → 0', () => {
    expect(tongTien([])).toBe(0);
  });
});

describe('giaTriTonKho', () => {
  it('cộng dư cuối kỳ mọi TK bắt đầu bằng 15', () => {
    const tb = [
      tk({ taiKhoan: '152', soDuCuoiKyNo: 200 }),
      tk({ taiKhoan: '156', soDuCuoiKyNo: 300 }),
      tk({ taiKhoan: '1591', soDuCuoiKyCo: 50 }),
      tk({ taiKhoan: '211', soDuCuoiKyNo: 1000 }),
    ];
    expect(giaTriTonKho(tb)).toBe(450);
  });
});

describe('tienTheoTaiKhoan', () => {
  it('trả TK tiền kèm chi tiết từng quỹ/ngân hàng, TK cha đứng trước con', () => {
    const tb = [
      tk({
        taiKhoan: '1121',
        tenTaiKhoan: 'Tiền gửi ngân hàng',
        soDuDauKyNo: 1000,
        phatSinhNo: 500,
        phatSinhCo: 200,
        soDuCuoiKyNo: 1300,
        doiTuongChiTiet: [
          tk({ taiKhoan: 'VCB', tenTaiKhoan: 'Vietcombank', soDuDauKyNo: 1000, phatSinhNo: 500, phatSinhCo: 200, soDuCuoiKyNo: 1300 }),
        ],
      }),
    ];
    const rows = tienTheoTaiKhoan(tb);
    expect(rows.map((r) => r.ma)).toEqual(['1121', 'VCB']);
    expect(rows[0].duDauKy).toBe(1000);
    expect(rows[0].duCuoiKy).toBe(1300);
    expect(rows[1].ten).toBe('Vietcombank');
  });

  it('bỏ qua TK không phải tiền', () => {
    expect(tienTheoTaiKhoan([tk({ taiKhoan: '331', soDuCuoiKyCo: 100 })])).toEqual([]);
  });
});

describe('doiChieuCongNo', () => {
  it('loại "thu": lấy TK 131/136/138, tăng = phát sinh Nợ', () => {
    const tb = [
      tk({
        taiKhoan: '131',
        doiTuongChiTiet: [
          tk({ taiKhoan: 'KH01', tenTaiKhoan: 'Công ty A', soDuDauKyNo: 100, phatSinhNo: 500, phatSinhCo: 300, soDuCuoiKyNo: 300 }),
        ],
      }),
      tk({ taiKhoan: '331', doiTuongChiTiet: [tk({ taiKhoan: 'NCC01', tenTaiKhoan: 'NCC B', soDuCuoiKyCo: 700 })] }),
    ];
    const rows = doiChieuCongNo(tb, 'thu');
    expect(rows).toEqual([
      { doiTuong: 'Công ty A', duDauKy: 100, phatSinhTang: 500, phatSinhGiam: 300, duCuoiKy: 300 },
    ]);
  });

  it('loại "tra": lấy TK 331/336/338, tăng = phát sinh Có, số dư lấy bên Có', () => {
    const tb = [
      tk({
        taiKhoan: '331',
        doiTuongChiTiet: [
          tk({ taiKhoan: 'NCC01', tenTaiKhoan: 'NCC B', soDuDauKyCo: 200, phatSinhNo: 100, phatSinhCo: 600, soDuCuoiKyCo: 700 }),
        ],
      }),
    ];
    expect(doiChieuCongNo(tb, 'tra')).toEqual([
      { doiTuong: 'NCC B', duDauKy: 200, phatSinhTang: 600, phatSinhGiam: 100, duCuoiKy: 700 },
    ]);
  });

  it('gộp cùng một đối tượng xuất hiện ở nhiều tài khoản', () => {
    const tb = [
      tk({ taiKhoan: '131', doiTuongChiTiet: [tk({ taiKhoan: 'KH01', tenTaiKhoan: 'A', phatSinhNo: 100, soDuCuoiKyNo: 100 })] }),
      tk({ taiKhoan: '138', doiTuongChiTiet: [tk({ taiKhoan: 'KH01', tenTaiKhoan: 'A', phatSinhNo: 50, soDuCuoiKyNo: 50 })] }),
    ];
    const rows = doiChieuCongNo(tb, 'thu');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ doiTuong: 'A', phatSinhTang: 150, duCuoiKy: 150 });
  });

  it('TK công nợ không có doiTuongChiTiet → bỏ qua, không ném lỗi', () => {
    expect(doiChieuCongNo([tk({ taiKhoan: '131', soDuCuoiKyNo: 500 })], 'thu')).toEqual([]);
  });

  it('sắp xếp giảm dần theo số dư cuối kỳ', () => {
    const tb = [
      tk({
        taiKhoan: '131',
        doiTuongChiTiet: [
          tk({ taiKhoan: 'A', tenTaiKhoan: 'A', soDuCuoiKyNo: 100 }),
          tk({ taiKhoan: 'B', tenTaiKhoan: 'B', soDuCuoiKyNo: 900 }),
        ],
      }),
    ];
    expect(doiChieuCongNo(tb, 'thu').map((r) => r.doiTuong)).toEqual(['B', 'A']);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
cd fe && npx vitest run src/pages/dashboard/trialBalanceDerive.test.ts
```

Kỳ vọng: FAIL — không import được `./trialBalanceDerive`.

- [ ] **Step 3: Viết implementation**

Tạo `fe/src/pages/dashboard/trialBalanceDerive.ts`:

```ts
import type { TrialBalance } from '@/services/soCaiService';

/** TK tiền mặt + tiền gửi ngân hàng. Không gồm 113 (tiền đang chuyển). */
const PREFIX_TIEN = ['111', '112'];
const PREFIX_TON_KHO = ['15'];
const PREFIX_PHAI_THU = ['131', '136', '138'];
const PREFIX_PHAI_TRA = ['331', '336', '338'];

export interface TienTheoTaiKhoanRow {
  ma: string;
  ten: string;
  duDauKy: number;
  phatSinhNo: number;
  phatSinhCo: number;
  duCuoiKy: number;
}

export interface DoiChieuRow {
  doiTuong: string;
  duDauKy: number;
  phatSinhTang: number;
  phatSinhGiam: number;
  duCuoiKy: number;
}

const thuocNhom = (ma: string, prefixes: string[]): boolean =>
  prefixes.some((p) => ma.startsWith(p));

const duCuoiNet = (r: TrialBalance): number => (r.soDuCuoiKyNo || 0) - (r.soDuCuoiKyCo || 0);

/** Tổng tiền cuối kỳ = Σ số dư cuối của TK 111/112 (đã gồm tồn đầu kỳ). */
export function tongTien(tb: TrialBalance[]): number {
  return tb
    .filter((r) => thuocNhom(r.taiKhoan, PREFIX_TIEN))
    .reduce((s, r) => s + duCuoiNet(r), 0);
}

/** Giá trị tồn kho = Σ số dư cuối của các TK hàng tồn kho (15x). */
export function giaTriTonKho(tb: TrialBalance[]): number {
  return tb
    .filter((r) => thuocNhom(r.taiKhoan, PREFIX_TON_KHO))
    .reduce((s, r) => s + duCuoiNet(r), 0);
}

/** TK tiền và chi tiết từng quỹ/ngân hàng, TK cha đứng ngay trước các dòng con. */
export function tienTheoTaiKhoan(tb: TrialBalance[]): TienTheoTaiKhoanRow[] {
  const toRow = (r: TrialBalance): TienTheoTaiKhoanRow => ({
    ma: r.taiKhoan,
    ten: r.tenTaiKhoanNH || r.tenTaiKhoan || r.taiKhoan,
    duDauKy: (r.soDuDauKyNo || 0) - (r.soDuDauKyCo || 0),
    phatSinhNo: r.phatSinhNo || 0,
    phatSinhCo: r.phatSinhCo || 0,
    duCuoiKy: duCuoiNet(r),
  });

  const out: TienTheoTaiKhoanRow[] = [];
  for (const r of tb) {
    if (!thuocNhom(r.taiKhoan, PREFIX_TIEN)) continue;
    out.push(toRow(r));
    for (const con of r.doiTuongChiTiet ?? []) out.push(toRow(con));
  }
  return out;
}

/**
 * Bảng đối chiếu công nợ theo đối tượng.
 * - 'thu': TK phải thu, tăng = phát sinh Nợ, số dư lấy bên Nợ
 * - 'tra': TK phải trả, tăng = phát sinh Có, số dư lấy bên Có
 * Một đối tượng nằm ở nhiều tài khoản được gộp thành một dòng.
 */
export function doiChieuCongNo(tb: TrialBalance[], loai: 'thu' | 'tra'): DoiChieuRow[] {
  const prefixes = loai === 'thu' ? PREFIX_PHAI_THU : PREFIX_PHAI_TRA;
  const gop = new Map<string, DoiChieuRow>();

  for (const acc of tb) {
    if (!thuocNhom(acc.taiKhoan, prefixes)) continue;
    for (const dt of acc.doiTuongChiTiet ?? []) {
      const ten = dt.tenTaiKhoan || dt.taiKhoan;
      const row = gop.get(ten) ?? {
        doiTuong: ten,
        duDauKy: 0,
        phatSinhTang: 0,
        phatSinhGiam: 0,
        duCuoiKy: 0,
      };
      if (loai === 'thu') {
        row.duDauKy += dt.soDuDauKyNo || 0;
        row.phatSinhTang += dt.phatSinhNo || 0;
        row.phatSinhGiam += dt.phatSinhCo || 0;
        row.duCuoiKy += dt.soDuCuoiKyNo || 0;
      } else {
        row.duDauKy += dt.soDuDauKyCo || 0;
        row.phatSinhTang += dt.phatSinhCo || 0;
        row.phatSinhGiam += dt.phatSinhNo || 0;
        row.duCuoiKy += dt.soDuCuoiKyCo || 0;
      }
      gop.set(ten, row);
    }
  }

  return Array.from(gop.values()).sort((a, b) => b.duCuoiKy - a.duCuoiKy);
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd fe && npx vitest run src/pages/dashboard/trialBalanceDerive.test.ts
```

Kỳ vọng: PASS, 11 test.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/dashboard/trialBalanceDerive.ts fe/src/pages/dashboard/trialBalanceDerive.test.ts
git commit -m "feat(dashboard): hàm dẫn xuất số liệu từ bảng cân đối phát sinh"
```

---

### Task 4: Tính cảnh báo tài chính

**Files:**
- Create: `fe/src/pages/dashboard/canhBao.ts`
- Test: `fe/src/pages/dashboard/canhBao.test.ts`

**Interfaces:**
- Consumes: `TienTheoTaiKhoanRow` từ `./trialBalanceDerive` (Task 3); `OverdueRow` từ `@/services/dashboardService` — các trường `{ id, doiTuongTen, conLai, soNgayQuaHan, hanThanhToan? }`.
- Produces:

```ts
export type LoaiCanhBao = 'CONG_NO_QUA_HAN' | 'TIEN_AM' | 'LOI_NHUAN_AM';
export interface CanhBao {
  loai: LoaiCanhBao;
  moTa: string;
  duong: string;
}
export function tinhCanhBao(input: CanhBaoInput): CanhBao[];
```

- [ ] **Step 1: Viết test trước**

Tạo `fe/src/pages/dashboard/canhBao.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tinhCanhBao } from './canhBao';

const trong = { quaHanThu: [], quaHanTra: [], taiKhoanTien: [], loiNhuanSauThue: 0 };

const qh = (doiTuongTen: string, conLai: number, soNgayQuaHan: number) => ({
  id: doiTuongTen,
  doiTuongTen,
  conLai,
  soNgayQuaHan,
});

const tkTien = (ma: string, duCuoiKy: number) => ({
  ma,
  ten: ma,
  duDauKy: 0,
  phatSinhNo: 0,
  phatSinhCo: 0,
  duCuoiKy,
});

describe('tinhCanhBao', () => {
  it('không có gì bất thường → mảng rỗng', () => {
    expect(tinhCanhBao(trong)).toEqual([]);
  });

  it('mỗi khoản quá hạn là một cảnh báo, phải thu trỏ về trang phải thu', () => {
    const out = tinhCanhBao({ ...trong, quaHanThu: [qh('Công ty A', 500, 12)] });
    expect(out).toHaveLength(1);
    expect(out[0].loai).toBe('CONG_NO_QUA_HAN');
    expect(out[0].duong).toBe('/cong-no/phai-thu');
    expect(out[0].moTa).toContain('Công ty A');
    expect(out[0].moTa).toContain('12');
  });

  it('phải trả quá hạn trỏ về trang phải trả', () => {
    const out = tinhCanhBao({ ...trong, quaHanTra: [qh('NCC B', 800, 5)] });
    expect(out[0].duong).toBe('/cong-no/phai-tra');
  });

  it('bỏ qua khoản quá hạn 0 ngày (chưa thực sự quá hạn)', () => {
    expect(tinhCanhBao({ ...trong, quaHanThu: [qh('A', 100, 0)] })).toEqual([]);
  });

  it('mỗi TK tiền âm là một cảnh báo', () => {
    const out = tinhCanhBao({
      ...trong,
      taiKhoanTien: [tkTien('1111', -50), tkTien('1121', 900)],
    });
    expect(out).toHaveLength(1);
    expect(out[0].loai).toBe('TIEN_AM');
    expect(out[0].moTa).toContain('1111');
    expect(out[0].duong).toBe('/so-quy');
  });

  it('lợi nhuận sau thuế âm đếm đúng một lần', () => {
    const out = tinhCanhBao({ ...trong, loiNhuanSauThue: -1000 });
    expect(out).toHaveLength(1);
    expect(out[0].loai).toBe('LOI_NHUAN_AM');
    expect(out[0].duong).toBe('/bao-cao/tai-chinh');
  });

  it('lợi nhuận bằng 0 không phải cảnh báo', () => {
    expect(tinhCanhBao({ ...trong, loiNhuanSauThue: 0 })).toEqual([]);
  });

  it('gộp cả ba loại, quá hạn xếp trước', () => {
    const out = tinhCanhBao({
      quaHanThu: [qh('A', 100, 3)],
      quaHanTra: [qh('B', 200, 9)],
      taiKhoanTien: [tkTien('1111', -1)],
      loiNhuanSauThue: -5,
    });
    expect(out).toHaveLength(4);
    expect(out.map((c) => c.loai)).toEqual([
      'CONG_NO_QUA_HAN',
      'CONG_NO_QUA_HAN',
      'TIEN_AM',
      'LOI_NHUAN_AM',
    ]);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
cd fe && npx vitest run src/pages/dashboard/canhBao.test.ts
```

Kỳ vọng: FAIL — không import được `./canhBao`.

- [ ] **Step 3: Viết implementation**

Tạo `fe/src/pages/dashboard/canhBao.ts`:

```ts
import type { OverdueRow } from '@/services/dashboardService';
import type { TienTheoTaiKhoanRow } from './trialBalanceDerive';
import { formatShortCurrency } from './components/format';

export type LoaiCanhBao = 'CONG_NO_QUA_HAN' | 'TIEN_AM' | 'LOI_NHUAN_AM';

export interface CanhBao {
  loai: LoaiCanhBao;
  moTa: string;
  /** Đường dẫn tới trang xem chi tiết. */
  duong: string;
}

export interface CanhBaoInput {
  quaHanThu: OverdueRow[];
  quaHanTra: OverdueRow[];
  taiKhoanTien: TienTheoTaiKhoanRow[];
  loiNhuanSauThue: number;
}

/**
 * Ba loại cảnh báo tài chính, xếp theo mức khẩn: công nợ quá hạn → tiền âm →
 * lợi nhuận âm. Khoản quá hạn 0 ngày chưa tính là quá hạn.
 */
export function tinhCanhBao(input: CanhBaoInput): CanhBao[] {
  const out: CanhBao[] = [];

  const themQuaHan = (rows: OverdueRow[], duong: string, nhan: string) => {
    for (const r of rows) {
      if ((r.soNgayQuaHan || 0) <= 0) continue;
      out.push({
        loai: 'CONG_NO_QUA_HAN',
        moTa: `${nhan} ${r.doiTuongTen}: ${formatShortCurrency(r.conLai)} — quá hạn ${r.soNgayQuaHan} ngày`,
        duong,
      });
    }
  };

  themQuaHan(input.quaHanThu, '/cong-no/phai-thu', 'Phải thu');
  themQuaHan(input.quaHanTra, '/cong-no/phai-tra', 'Phải trả');

  for (const tk of input.taiKhoanTien) {
    if (tk.duCuoiKy >= 0) continue;
    out.push({
      loai: 'TIEN_AM',
      moTa: `Tài khoản ${tk.ma} — ${tk.ten} có số dư âm: ${formatShortCurrency(tk.duCuoiKy)}`,
      duong: '/so-quy',
    });
  }

  if (input.loiNhuanSauThue < 0) {
    out.push({
      loai: 'LOI_NHUAN_AM',
      moTa: `Lợi nhuận sau thuế kỳ này âm: ${formatShortCurrency(input.loiNhuanSauThue)}`,
      duong: '/bao-cao/tai-chinh',
    });
  }

  return out;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd fe && npx vitest run src/pages/dashboard/canhBao.test.ts
```

Kỳ vọng: PASS, 8 test.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/dashboard/canhBao.ts fe/src/pages/dashboard/canhBao.test.ts
git commit -m "feat(dashboard): tính cảnh báo tài chính"
```

---

### Task 5: Tab Tổng quan — hàng KPI thật

**Files:**
- Modify: `fe/src/services/dashboardService.ts`
- Modify: `fe/src/pages/dashboard/tabs/TongQuanTab.tsx`
- Create: `fe/src/pages/dashboard/components/CanhBaoModal.tsx`

**Interfaces:**
- Consumes: `KpiRow`, `KpiItem` (Task 2); `tongTien`, `giaTriTonKho`, `tienTheoTaiKhoan` (Task 3); `tinhCanhBao`, `CanhBao` (Task 4).
- Produces: `dashboardService.getTrialBalance(year, startMonth, endMonth): Promise<TrialBalance[]>` — dùng lại ở Task 6 và Task 11.

- [ ] **Step 1: Thêm hàm lấy trial balance vào dashboardService**

Trong `fe/src/services/dashboardService.ts`, thêm import ở đầu file:

```ts
import { soCaiService, type TrialBalance } from './soCaiService';
import { kqkdService } from './kqkdService';
```

Thêm hai method vào object `dashboardService` (đặt ngay sau `getCashSeries`):

```ts
  /** Bảng cân đối phát sinh của kỳ — nguồn cho KPI tiền/tồn kho và bảng đối chiếu. */
  async getTrialBalance(year: number, startMonth: number, endMonth: number): Promise<TrialBalance[]> {
    try {
      const start = new Date(year, startMonth - 1, 1).toISOString();
      const end = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      return await soCaiService.getTrialBalance(start, end);
    } catch {
      return [];
    }
  },

  /** Doanh thu (mã 01) và lợi nhuận sau thuế (mã 60) của kỳ. */
  async getKqkdTongHop(
    year: number,
    startMonth: number,
    endMonth: number,
  ): Promise<{ doanhThu: number; loiNhuanSauThue: number; ebitda: number }> {
    try {
      const startDate = new Date(year, startMonth - 1, 1).toISOString();
      const endDate = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      const report = await kqkdService.getData({ startDate, endDate, periodType: 'tuyChon' });
      const lay = (ma: string) => report.chiTieu.find((c) => c.ma === ma)?.kyHienTai ?? 0;
      return {
        doanhThu: lay('01'),
        loiNhuanSauThue: lay('60'),
        ebitda: report.ebitda?.kyHienTai ?? 0,
      };
    } catch {
      return { doanhThu: 0, loiNhuanSauThue: 0, ebitda: 0 };
    }
  },
```

> Chữ ký thật đã xác thực: `kqkdService.getData(params: KqkdQueryParams): Promise<KqkdReport>`
> với `KqkdQueryParams = { startDate: string; endDate: string; periodType: 'thang' | 'quy' | 'nam' | 'tuyChon' }`.
> **Không có method tên `getKqkd` ở FE** — chỉ BE mới đặt tên đó. Trường `ebitda` chỉ có
> sau Task 7; tới lúc đó nó là `undefined` và `?? 0` giữ cho code chạy được.

- [ ] **Step 2: Viết CanhBaoModal**

Tạo `fe/src/pages/dashboard/components/CanhBaoModal.tsx`:

```tsx
import React from 'react';
import { Modal, List, Empty, Tag } from 'antd';
import { Link } from 'react-router-dom';
import type { CanhBao, LoaiCanhBao } from '../canhBao';

const NHAN: Record<LoaiCanhBao, { text: string; color: string }> = {
  CONG_NO_QUA_HAN: { text: 'Quá hạn', color: 'red' },
  TIEN_AM: { text: 'Tiền âm', color: 'volcano' },
  LOI_NHUAN_AM: { text: 'Lỗ', color: 'orange' },
};

interface Props {
  open: boolean;
  items: CanhBao[];
  onClose: () => void;
}

const CanhBaoModal: React.FC<Props> = ({ open, items, onClose }) => (
  <Modal open={open} onCancel={onClose} footer={null} title="Cảnh báo tài chính" width={640}>
    {items.length === 0 ? (
      <Empty description="Không có cảnh báo" />
    ) : (
      <List
        size="small"
        dataSource={items}
        renderItem={(c) => (
          <List.Item>
            <div className="flex items-center gap-2 w-full">
              <Tag color={NHAN[c.loai].color}>{NHAN[c.loai].text}</Tag>
              <span className="flex-1">{c.moTa}</span>
              <Link to={c.duong} onClick={onClose}>Xem</Link>
            </div>
          </List.Item>
        )}
      />
    )}
  </Modal>
);

export default CanhBaoModal;
```

- [ ] **Step 3: Thêm hàng KPI vào TongQuanTab**

Sửa `fe/src/pages/dashboard/tabs/TongQuanTab.tsx` — thêm import và khối KPI phía trên các chart. Thêm vào đầu file:

```tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  WalletOutlined, RiseOutlined, LineChartOutlined, SwapOutlined,
  ArrowDownOutlined, ArrowUpOutlined, InboxOutlined, AlertOutlined,
} from '@ant-design/icons';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import CanhBaoModal from '../components/CanhBaoModal';
import { dashboardService } from '@/services/dashboardService';
import { congNoPhaiThuService } from '@/services/congNoPhaiThuService';
import { congNoPhaiTraService } from '@/services/congNoPhaiTraService';
import { tongTien, giaTriTonKho, tienTheoTaiKhoan } from '../trialBalanceDerive';
import { tinhCanhBao } from '../canhBao';
```

Trong thân component, trước `return`:

```tsx
  const [canhBaoOpen, setCanhBaoOpen] = useState(false);

  const { data: tb = [], isLoading: loadingTb } = useQuery({
    queryKey: ['dash-tb', year, startMonth, endMonth],
    queryFn: () => dashboardService.getTrialBalance(year, startMonth, endMonth),
  });
  const { data: kqkd, isLoading: loadingKqkd } = useQuery({
    queryKey: ['dash-kqkd-tong', year, startMonth, endMonth],
    queryFn: () => dashboardService.getKqkdTongHop(year, startMonth, endMonth),
  });
  const { data: cash = [] } = useQuery({
    queryKey: ['dash-cash', year],
    queryFn: () => dashboardService.getCashSeries(year),
  });
  const { data: statsThu } = useQuery({
    queryKey: ['dash-stats-thu'],
    queryFn: () => congNoPhaiThuService.getStats(),
  });
  const { data: statsTra } = useQuery({
    queryKey: ['dash-stats-tra'],
    queryFn: () => congNoPhaiTraService.getStats(),
  });
  const { data: quaHanThu = [] } = useQuery({
    queryKey: ['dash-qh-thu'],
    queryFn: () => dashboardService.getOverdueAr(),
  });
  const { data: quaHanTra = [] } = useQuery({
    queryKey: ['dash-qh-tra'],
    queryFn: () => dashboardService.getOverdueAp(),
  });

  const dongTienThuan = useMemo(
    () =>
      cash
        .filter((p) => p.thang >= startMonth && p.thang <= endMonth)
        .reduce((s, p) => s + p.thu - p.chi, 0),
    [cash, startMonth, endMonth],
  );

  const canhBao = useMemo(
    () =>
      tinhCanhBao({
        quaHanThu,
        quaHanTra,
        taiKhoanTien: tienTheoTaiKhoan(tb),
        loiNhuanSauThue: kqkd?.loiNhuanSauThue ?? 0,
      }),
    [quaHanThu, quaHanTra, tb, kqkd],
  );

  const kpis: KpiItem[] = [
    { key: 'tongTien', label: 'Tổng tiền', value: tongTien(tb), icon: <WalletOutlined /> },
    { key: 'doanhThu', label: 'Doanh thu', value: kqkd?.doanhThu ?? 0, icon: <RiseOutlined /> },
    { key: 'loiNhuan', label: 'Lợi nhuận', value: kqkd?.loiNhuanSauThue ?? 0, icon: <LineChartOutlined /> },
    { key: 'dongTien', label: 'Dòng tiền thuần', value: dongTienThuan, icon: <SwapOutlined /> },
    { key: 'phaiThu', label: 'Phải thu', value: statsThu?.conLai ?? 0, icon: <ArrowDownOutlined /> },
    { key: 'phaiTra', label: 'Phải trả', value: statsTra?.conLai ?? 0, icon: <ArrowUpOutlined /> },
    { key: 'tonKho', label: 'Giá trị tồn kho', value: giaTriTonKho(tb), icon: <InboxOutlined /> },
    {
      key: 'canhBao',
      label: 'Cảnh báo',
      value: canhBao.length,
      format: 'soLuong',
      inverse: true,
      icon: <AlertOutlined />,
      onClick: () => setCanhBaoOpen(true),
    },
  ];
```

Trong JSX, ngay dưới `<div className="space-y-3">` thêm:

```tsx
      <KpiRow items={kpis} loading={loadingTb || loadingKqkd} />
```

và ngay trước thẻ đóng `</div>` cuối cùng:

```tsx
      <CanhBaoModal open={canhBaoOpen} items={canhBao} onClose={() => setCanhBaoOpen(false)} />
```

- [ ] **Step 4: Chạy lint + build**

```bash
cd fe && npm run lint && npm run build
```

Kỳ vọng: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/services/dashboardService.ts fe/src/pages/dashboard
git commit -m "feat(dashboard): hàng KPI và cảnh báo tài chính cho tab Tổng quan"
```

---

### Task 6: Tab Dòng tiền

**Files:**
- Create: `fe/src/pages/dashboard/components/TienTheoTaiKhoanTable.tsx`
- Modify: `fe/src/pages/dashboard/tabs/DongTienTab.tsx`

**Interfaces:**
- Consumes: `tienTheoTaiKhoan`, `TienTheoTaiKhoanRow` (Task 3); `dashboardService.getTrialBalance` (Task 5); `KpiRow` (Task 2); `dashboardService.getCashSeries`, `getCashCompositionByRange` (đã có).

- [ ] **Step 1: Viết bảng số dư theo tài khoản**

Tạo `fe/src/pages/dashboard/components/TienTheoTaiKhoanTable.tsx`:

```tsx
import React from 'react';
import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BankOutlined } from '@ant-design/icons';
import { formatCurrency } from './format';
import type { TienTheoTaiKhoanRow } from '../trialBalanceDerive';

interface Props {
  rows: TienTheoTaiKhoanRow[];
  loading?: boolean;
}

/** Dòng con (quỹ/ngân hàng) có mã không phải số → thụt vào cho dễ đọc. */
const laDongCon = (ma: string) => !/^\d/.test(ma);

const columns: ColumnsType<TienTheoTaiKhoanRow> = [
  {
    title: 'Tài khoản',
    dataIndex: 'ma',
    render: (ma: string, r) => (
      <span style={{ paddingLeft: laDongCon(ma) ? 20 : 0 }}>
        <b>{ma}</b> — {r.ten}
      </span>
    ),
  },
  { title: 'Số dư đầu kỳ', dataIndex: 'duDauKy', align: 'right', render: formatCurrency },
  { title: 'Phát sinh Nợ', dataIndex: 'phatSinhNo', align: 'right', render: formatCurrency },
  { title: 'Phát sinh Có', dataIndex: 'phatSinhCo', align: 'right', render: formatCurrency },
  { title: 'Số dư cuối kỳ', dataIndex: 'duCuoiKy', align: 'right', render: formatCurrency },
];

const TienTheoTaiKhoanTable: React.FC<Props> = ({ rows, loading }) => (
  <Card title={<span className="text-sm sm:text-base"><BankOutlined className="text-primary mr-2" />Số dư theo tài khoản / quỹ</span>}>
    <Table
      size="small"
      rowKey={(r) => r.ma}
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={false}
      scroll={{ x: 'max-content' }}
      summary={(data) => {
        // Chỉ cộng dòng cha để không đếm hai lần.
        const cha = data.filter((r) => !laDongCon(r.ma));
        const tong = (f: keyof TienTheoTaiKhoanRow) =>
          cha.reduce((s, r) => s + (r[f] as number), 0);
        return (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><b>Tổng cộng</b></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><b>{formatCurrency(tong('duDauKy'))}</b></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><b>{formatCurrency(tong('phatSinhNo'))}</b></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right"><b>{formatCurrency(tong('phatSinhCo'))}</b></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right"><b>{formatCurrency(tong('duCuoiKy'))}</b></Table.Summary.Cell>
          </Table.Summary.Row>
        );
      }}
    />
  </Card>
);

export default TienTheoTaiKhoanTable;
```

- [ ] **Step 2: Dựng tab Dòng tiền**

Thay toàn bộ `fe/src/pages/dashboard/tabs/DongTienTab.tsx`:

```tsx
import React, { useMemo } from 'react';
import { Row, Col, Card } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  WalletOutlined, ArrowDownOutlined, ArrowUpOutlined, SwapOutlined, BankOutlined, PieChartOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import CashFlowChart from '../components/CashFlowChart';
import TienTheoTaiKhoanTable from '../components/TienTheoTaiKhoanTable';
import { dashboardService } from '@/services/dashboardService';
import { tienTheoTaiKhoan } from '../trialBalanceDerive';
import { formatCurrency } from '../components/format';
import type { TabProps } from './TabProps';

const PIE_PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--brand-gold))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

const Donut: React.FC<{ title: string; data: { ten: string; soTien: number }[] }> = ({ title, data }) => (
  <Card title={<span className="text-sm sm:text-base"><PieChartOutlined className="text-primary mr-2" />{title}</span>}>
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="soTien" nameKey="ten" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatCurrency(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  </Card>
);

const DongTienTab: React.FC<TabProps> = ({ year, startMonth, endMonth }) => {
  const { data: tb = [], isLoading: loadingTb } = useQuery({
    queryKey: ['dash-tb', year, startMonth, endMonth],
    queryFn: () => dashboardService.getTrialBalance(year, startMonth, endMonth),
  });
  const { data: cash = [] } = useQuery({
    queryKey: ['dash-cash', year],
    queryFn: () => dashboardService.getCashSeries(year),
  });
  const { data: thu = [] } = useQuery({
    queryKey: ['dash-comp-thu', year, startMonth, endMonth],
    queryFn: () => dashboardService.getCashCompositionByRange('thu', year, startMonth, endMonth),
  });
  const { data: chi = [] } = useQuery({
    queryKey: ['dash-comp-chi', year, startMonth, endMonth],
    queryFn: () => dashboardService.getCashCompositionByRange('chi', year, startMonth, endMonth),
  });

  const rows = useMemo(() => tienTheoTaiKhoan(tb), [tb]);

  const trongKy = useMemo(
    () => cash.filter((p) => p.thang >= startMonth && p.thang <= endMonth),
    [cash, startMonth, endMonth],
  );
  const tongThu = trongKy.reduce((s, p) => s + p.thu, 0);
  const tongChi = trongKy.reduce((s, p) => s + p.chi, 0);
  // Số dư đầu kỳ lấy từ TK tiền (đã gồm tồn mang sang), không suy ra từ chuỗi thu-chi.
  const soDuDau = rows.filter((r) => /^\d/.test(r.ma)).reduce((s, r) => s + r.duDauKy, 0);

  const kpis: KpiItem[] = [
    { key: 'dau', label: 'Số dư đầu kỳ', value: soDuDau, icon: <WalletOutlined /> },
    { key: 'thu', label: 'Tổng thu', value: tongThu, icon: <ArrowDownOutlined /> },
    { key: 'chi', label: 'Tổng chi', value: tongChi, icon: <ArrowUpOutlined /> },
    { key: 'thuan', label: 'Dòng tiền thuần', value: tongThu - tongChi, icon: <SwapOutlined /> },
    { key: 'cuoi', label: 'Số dư cuối kỳ', value: soDuDau + tongThu - tongChi, icon: <BankOutlined /> },
  ];

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={loadingTb} span={5} />
      <CashFlowChart year={year} startMonth={startMonth} endMonth={endMonth} />
      <TienTheoTaiKhoanTable rows={rows} loading={loadingTb} />
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}><Donut title="Tỷ trọng tiền thu theo nhóm" data={thu} /></Col>
        <Col xs={24} lg={12}><Donut title="Tỷ trọng tiền chi theo nhóm" data={chi} /></Col>
      </Row>
    </div>
  );
};

export default DongTienTab;
```

- [ ] **Step 3: Chạy lint + build**

```bash
cd fe && npm run lint && npm run build
```

Kỳ vọng: PASS.

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/dashboard
git commit -m "feat(dashboard): tab Dòng tiền"
```

> Khối "Khoản thu/chi sắp đến hạn" của tab này được thêm ở Task 10, sau khi có hàm
> `tinhLichThanhToan`.

---

### Task 7: EBITDA trong báo cáo KQKD (backend)

**Files:**
- Modify: `be/libs/dto/src/reporting/kqkd.dto.ts`
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.helper.ts`
- Test: `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts:622-760`

**Interfaces:**
- Produces:

```ts
// kqkd.dto.ts
export interface KqkdReport {
  chiTieu: KqkdChiTieu[];
  ebitda: { kyHienTai: number; kyTruoc: number };
  kyHienTai: { startDate: string; endDate: string };
  kyTruoc: { startDate: string; endDate: string };
}

// bao-cao.helper.ts
export function tinhEbitda(loiNhuanTruocThue: number, chiPhiLaiVay: number, khauHao: number): number;
```

- [ ] **Step 1: Viết test trước**

Thêm vào cuối `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`:

```ts
import { tinhEbitda } from './bao-cao.helper';

describe('tinhEbitda', () => {
  it('EBITDA = LNTT + lãi vay + khấu hao', () => {
    expect(tinhEbitda(1000, 200, 300)).toBe(1500);
  });

  it('công ty chưa dùng TK 214 → khấu hao 0, EBITDA = LNTT + lãi vay', () => {
    expect(tinhEbitda(1000, 200, 0)).toBe(1200);
  });

  it('lỗ trước thuế vẫn cộng ngược lãi vay và khấu hao', () => {
    expect(tinhEbitda(-500, 100, 400)).toBe(0);
  });

  it('mọi thành phần bằng 0 → 0', () => {
    expect(tinhEbitda(0, 0, 0)).toBe(0);
  });
});
```

Nếu file `bao-cao.helper.spec.ts` đã có import từ `./bao-cao.helper`, gộp
`tinhEbitda` vào import sẵn có thay vì thêm dòng import mới.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
cd be && yarn test bao-cao.helper
```

Kỳ vọng: FAIL — `tinhEbitda is not a function`.

- [ ] **Step 3: Viết hàm helper**

Thêm vào cuối `be/apps/reporting-service/src/bao-cao/bao-cao.helper.ts`:

```ts
/**
 * EBITDA = Lợi nhuận trước thuế + chi phí lãi vay + khấu hao.
 *
 * Khấu hao lấy từ phát sinh Có TK 214. Công ty chưa hạch toán TK 214 thì khấu hao
 * bằng 0 và EBITDA rút về LNTT + lãi vay — đúng như dữ liệu đang có, không phải lỗi.
 */
export function tinhEbitda(
  loiNhuanTruocThue: number,
  chiPhiLaiVay: number,
  khauHao: number,
): number {
  return loiNhuanTruocThue + chiPhiLaiVay + khauHao;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd be && yarn test bao-cao.helper
```

Kỳ vọng: PASS.

- [ ] **Step 5: Thêm trường ebitda vào DTO**

Trong `be/libs/dto/src/reporting/kqkd.dto.ts`, sửa `KqkdReport`:

```ts
export interface KqkdReport {
  chiTieu: KqkdChiTieu[];
  /**
   * EBITDA của kỳ. Để riêng ngoài `chiTieu` vì mảng đó là mẫu B02-DN đang được
   * render nguyên văn ở tab KQKD của /bao-cao/tai-chinh — chèn dòng lạ vào sẽ làm sai báo cáo chính thức.
   */
  ebitda: { kyHienTai: number; kyTruoc: number };
  kyHienTai: { startDate: string; endDate: string };
  kyTruoc: { startDate: string; endDate: string };
}
```

- [ ] **Step 6: Tính EBITDA trong service**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`, hàm `getKqkd`:

Thêm `tinhEbitda` vào import từ `./bao-cao.helper`.

Ngay sau dòng tính `m60_ht` (khoảng dòng 666), thêm:

```ts
    const khauHao_ht = this.sumByAccountPrefix(vouchersHT, '214', 'CO');
```

Ngay sau dòng tính `m60_kt`, thêm:

```ts
    const khauHao_kt = this.sumByAccountPrefix(vouchersKT, '214', 'CO');
```

Trong khối `return` cuối hàm, thêm trường `ebitda` ngay sau `chiTieu`:

```ts
      ebitda: {
        kyHienTai: tinhEbitda(m50_ht, m22_ht, khauHao_ht),
        kyTruoc: tinhEbitda(m50_kt, m22_kt, khauHao_kt),
      },
```

> `m50` là "Tổng lợi nhuận kế toán trước thuế", `m22` là "Chi phí tài chính"
> (phát sinh Nợ TK 635) — đúng hai đầu vào của công thức.

- [ ] **Step 7: Chạy toàn bộ test BE + build**

```bash
cd be && yarn test reporting-service && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "reporting-service|libs/dto" || echo "không có lỗi type mới"
```

Kỳ vọng: PASS. Nếu `tsc` báo lỗi ở nơi khác dựng `KqkdReport` thiếu `ebitda`, bổ sung trường đó tại chỗ.

- [ ] **Step 8: Thêm ebitda vào type ở FE**

Trong `fe/src/services/kqkdService.ts`, thêm vào interface `KqkdReport`
(interface chứa `chiTieu`):

```ts
  /** Có từ bản BE 2026-08; optional để FE cũ vẫn chạy được với BE chưa deploy. */
  ebitda?: { kyHienTai: number; kyTruoc: number };
```

- [ ] **Step 9: Commit**

```bash
git add be/libs/dto/src/reporting/kqkd.dto.ts be/apps/reporting-service/src/bao-cao fe/src/services/kqkdService.ts
git commit -m "feat(bao-cao): thêm EBITDA vào báo cáo kết quả kinh doanh"
```

---

### Task 8: Mở rộng chiều cho báo cáo lợi nhuận (backend)

**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.helper.ts`
- Test: `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts:403-420`

**Interfaces:**
- Produces:

```ts
export const DIMENSION_FIELD_MAP: Record<string, string>;
export function nhanChieu(dim: { ma?: string; ten?: string; soHopDong?: string } | undefined): string;
```

Dùng lại ở Task 12.

- [ ] **Step 1: Viết test trước**

Thêm vào `be/apps/reporting-service/src/bao-cao/bao-cao.helper.spec.ts`:

```ts
import { DIMENSION_FIELD_MAP, nhanChieu } from './bao-cao.helper';

describe('DIMENSION_FIELD_MAP', () => {
  it('phủ đủ 7 chiều', () => {
    expect(Object.keys(DIMENSION_FIELD_MAP).sort()).toEqual(
      ['bo-phan', 'doi', 'doi-tuong', 'du-an', 'hop-dong', 'nhan-vien', 'san-pham'].sort(),
    );
  });

  it('ánh xạ đúng sang tên trường trong danhMuc', () => {
    expect(DIMENSION_FIELD_MAP['bo-phan']).toBe('boPhan');
    expect(DIMENSION_FIELD_MAP['nhan-vien']).toBe('nhanVien');
    expect(DIMENSION_FIELD_MAP['hop-dong']).toBe('hopDong');
  });
});

describe('nhanChieu', () => {
  it('ưu tiên ten', () => {
    expect(nhanChieu({ ma: 'BP01', ten: 'Phòng kinh doanh' })).toBe('Phòng kinh doanh');
  });

  it('không có ten thì lấy ma', () => {
    expect(nhanChieu({ ma: 'BP01' })).toBe('BP01');
  });

  it('hợp đồng không có ma — lấy soHopDong', () => {
    expect(nhanChieu({ soHopDong: 'HD-001' })).toBe('HD-001');
  });

  it('undefined hoặc rỗng → "Không xác định"', () => {
    expect(nhanChieu(undefined)).toBe('Không xác định');
    expect(nhanChieu({})).toBe('Không xác định');
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
cd be && yarn test bao-cao.helper
```

Kỳ vọng: FAIL.

- [ ] **Step 3: Viết helper**

Thêm vào `be/apps/reporting-service/src/bao-cao/bao-cao.helper.ts`:

```ts
/**
 * Chiều phân tích → tên trường trong `danhMuc` của bút toán.
 * Dùng chung cho báo cáo lợi nhuận theo chiều và doanh số theo chiều.
 */
export const DIMENSION_FIELD_MAP: Record<string, string> = {
  'doi-tuong': 'doiTuong',
  'du-an': 'duAn',
  doi: 'doi',
  'san-pham': 'sanPham',
  'bo-phan': 'boPhan',
  'nhan-vien': 'nhanVien',
  'hop-dong': 'hopDong',
};

/**
 * Nhãn hiển thị của một giá trị chiều.
 * Snapshot hợp đồng không có `ma` — chỉ có `soHopDong` — nên phải xét riêng.
 */
export function nhanChieu(
  dim: { ma?: string; ten?: string; soHopDong?: string } | undefined,
): string {
  return dim?.ten || dim?.ma || dim?.soHopDong || 'Không xác định';
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd be && yarn test bao-cao.helper
```

Kỳ vọng: PASS.

- [ ] **Step 5: Dùng helper trong getLoiNhuanByDimension**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`, hàm
`getLoiNhuanByDimension` (từ dòng ~403): thêm `DIMENSION_FIELD_MAP` và `nhanChieu`
vào import từ `./bao-cao.helper`, rồi thay khối `fieldMap` cục bộ:

```ts
    const field = DIMENSION_FIELD_MAP[dimension] || 'doiTuong';
```

Trong vòng lặp gom nhóm, thay chỗ đang lấy tên hiển thị của `dim` bằng
`nhanChieu(dim)`, và dùng chính chuỗi nhãn đó làm khoá của `map` (thay cho `dim.ma`)
— nếu không, mọi hợp đồng sẽ rơi chung một khoá `undefined`.

- [ ] **Step 6: Chạy test BE + kiểm tra type**

```bash
cd be && yarn test reporting-service && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "reporting-service|libs/dto" || echo "không có lỗi type mới"
```

Kỳ vọng: PASS.

- [ ] **Step 7: Commit**

```bash
git add be/apps/reporting-service/src/bao-cao
git commit -m "feat(bao-cao): thêm chiều bộ phận, nhân viên, hợp đồng cho báo cáo lợi nhuận"
```

---

### Task 9: Tab Kết quả kinh doanh

**Files:**
- Create: `fe/src/pages/dashboard/components/XuHuongChiTieuChart.tsx`
- Create: `fe/src/pages/dashboard/components/LoiNhuanTheoChieuChart.tsx`
- Modify: `fe/src/pages/dashboard/tabs/KqkdTab.tsx`
- Modify: `fe/src/services/dashboardService.ts`

**Interfaces:**
- Consumes: `KpiRow` (Task 2); `dashboardService.getKqkdTongHop` (Task 5); `dashboardService.getPnlSeries`, `getLoiNhuanBreakdown` (đã có); chiều mới từ Task 8.
- Produces: `dashboardService.getKqkdChiTieu(year, startMonth, endMonth): Promise<Record<string, number>>` — map mã chỉ tiêu → giá trị kỳ này.

- [ ] **Step 1: Thêm hàm lấy toàn bộ chỉ tiêu KQKD**

Trong `fe/src/services/dashboardService.ts`, thêm method sau `getKqkdTongHop`:

```ts
  /** Toàn bộ chỉ tiêu KQKD của kỳ, tra theo mã ('01', '11', '20', ...). */
  async getKqkdChiTieu(
    year: number,
    startMonth: number,
    endMonth: number,
  ): Promise<Record<string, number>> {
    try {
      const startDate = new Date(year, startMonth - 1, 1).toISOString();
      const endDate = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      const report = await kqkdService.getData({ startDate, endDate, periodType: 'tuyChon' });
      const out: Record<string, number> = {};
      for (const c of report.chiTieu) out[c.ma] = c.kyHienTai;
      out.ebitda = report.ebitda?.kyHienTai ?? 0;
      return out;
    } catch {
      return {};
    }
  },
```

- [ ] **Step 2: Viết chart xu hướng từng chỉ tiêu**

Tạo `fe/src/pages/dashboard/components/XuHuongChiTieuChart.tsx`:

```tsx
import React, { useState } from 'react';
import { Card, Segmented } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

type ChiTieu = 'doanhThu' | 'chiPhi' | 'loiNhuan';

const OPTIONS: { label: string; value: ChiTieu }[] = [
  { label: 'Doanh thu', value: 'doanhThu' },
  { label: 'Chi phí', value: 'chiPhi' },
  { label: 'Lợi nhuận', value: 'loiNhuan' },
];

const MAU: Record<ChiTieu, string> = {
  doanhThu: DASH_COLORS.revenue,
  chiPhi: DASH_COLORS.expense,
  loiNhuan: DASH_COLORS.balance,
};

interface Props {
  year: number;
  startMonth: number;
  endMonth: number;
}

const XuHuongChiTieuChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const [chiTieu, setChiTieu] = useState<ChiTieu>('doanhThu');
  const { data = [] } = useQuery({
    queryKey: ['dash-pnl-series', year],
    queryFn: () => dashboardService.getPnlSeries(year),
  });

  const rows = data
    .filter((p) => p.thang >= startMonth && p.thang <= endMonth)
    .map((p) => ({ thang: `T${p.thang}`, value: p[chiTieu] }));

  return (
    <Card
      title={<span className="text-sm sm:text-base"><LineChartOutlined className="text-primary mr-2" />Xu hướng theo tháng</span>}
      extra={<Segmented size="small" value={chiTieu} options={OPTIONS} onChange={(v) => setChiTieu(v as ChiTieu)} />}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="thang" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatShortCurrency} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Line type="monotone" dataKey="value" name={OPTIONS.find((o) => o.value === chiTieu)?.label} stroke={MAU[chiTieu]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default XuHuongChiTieuChart;
```

- [ ] **Step 3: Viết chart lợi nhuận theo chiều**

Tạo `fe/src/pages/dashboard/components/LoiNhuanTheoChieuChart.tsx`:

```tsx
import React, { useState } from 'react';
import { Card, Select, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

export const CHIEU_OPTIONS = [
  { label: 'Đối tượng', value: 'doi-tuong' },
  { label: 'Dự án', value: 'du-an' },
  { label: 'Đội', value: 'doi' },
  { label: 'Sản phẩm', value: 'san-pham' },
  { label: 'Bộ phận', value: 'bo-phan' },
  { label: 'Nhân viên', value: 'nhan-vien' },
  { label: 'Hợp đồng', value: 'hop-dong' },
];

interface Props {
  year: number;
  startMonth: number;
  endMonth: number;
}

const LoiNhuanTheoChieuChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const [chieu, setChieu] = useState('doi-tuong');
  const { data = [], isLoading } = useQuery({
    queryKey: ['dash-ln-chieu', year, startMonth, endMonth, chieu],
    queryFn: () => dashboardService.getLoiNhuanBreakdown(year, startMonth, endMonth, chieu),
  });

  const rows = [...data].sort((a, b) => b.soTien - a.soTien).slice(0, 10);

  return (
    <Card
      title={<span className="text-sm sm:text-base"><BarChartOutlined className="text-primary mr-2" />Lợi nhuận theo chiều</span>}
      extra={<Select size="small" value={chieu} onChange={setChieu} options={CHIEU_OPTIONS} style={{ width: 150 }} />}
      loading={isLoading}
    >
      {rows.length === 0 ? (
        <Empty description="Chưa có dữ liệu" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatShortCurrency} />
            <YAxis type="category" dataKey="ten" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="soTien" name="Lợi nhuận" fill={DASH_COLORS.balance} radius={[0, 3, 3, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default LoiNhuanTheoChieuChart;
```

- [ ] **Step 4: Dựng tab KQKD**

Thay toàn bộ `fe/src/pages/dashboard/tabs/KqkdTab.tsx`:

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RiseOutlined, ShoppingOutlined, LineChartOutlined, FallOutlined,
  ThunderboltOutlined, FileTextOutlined, PercentageOutlined, DollarOutlined,
} from '@ant-design/icons';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import XuHuongChiTieuChart from '../components/XuHuongChiTieuChart';
import LoiNhuanTheoChieuChart from '../components/LoiNhuanTheoChieuChart';
import RevenueExpenseBreakdownCharts from '../components/RevenueExpenseBreakdownCharts';
import { dashboardService } from '@/services/dashboardService';
import type { TabProps } from './TabProps';

const KqkdTab: React.FC<TabProps> = ({ year, startMonth, endMonth }) => {
  const { data: ct = {}, isLoading } = useQuery({
    queryKey: ['dash-kqkd-chi-tieu', year, startMonth, endMonth],
    queryFn: () => dashboardService.getKqkdChiTieu(year, startMonth, endMonth),
  });

  const doanhThuThuan = ct['10'] ?? 0;
  const loiNhuanSauThue = ct['60'] ?? 0;
  const tySuat = doanhThuThuan !== 0 ? (loiNhuanSauThue / doanhThuThuan) * 100 : 0;
  const tongChiPhi = (ct['22'] ?? 0) + (ct['25'] ?? 0) + (ct['26'] ?? 0);

  const kpis: KpiItem[] = [
    { key: 'doanhThu', label: 'Doanh thu', value: ct['01'] ?? 0, icon: <RiseOutlined /> },
    { key: 'giaVon', label: 'Giá vốn', value: ct['11'] ?? 0, icon: <ShoppingOutlined /> },
    { key: 'lnGop', label: 'Lợi nhuận gộp', value: ct['20'] ?? 0, icon: <LineChartOutlined /> },
    { key: 'chiPhi', label: 'Chi phí', value: tongChiPhi, icon: <FallOutlined /> },
    {
      key: 'ebitda',
      label: 'EBITDA',
      value: ct.ebitda ?? 0,
      tooltip: 'EBITDA = Lợi nhuận trước thuế + chi phí lãi vay (TK 635) + khấu hao (Có TK 214)',
      icon: <ThunderboltOutlined />,
    },
    { key: 'lntt', label: 'LN trước thuế', value: ct['50'] ?? 0, icon: <FileTextOutlined /> },
    { key: 'lnst', label: 'LN sau thuế', value: loiNhuanSauThue, icon: <DollarOutlined /> },
    { key: 'tySuat', label: 'Tỷ suất LN ròng', value: tySuat, format: 'phanTram', icon: <PercentageOutlined /> },
  ];

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={isLoading} />
      <XuHuongChiTieuChart year={year} startMonth={startMonth} endMonth={endMonth} />
      <RevenueExpenseBreakdownCharts year={year} startMonth={startMonth} endMonth={endMonth} />
      <LoiNhuanTheoChieuChart year={year} startMonth={startMonth} endMonth={endMonth} />
    </div>
  );
};

export default KqkdTab;
```

- [ ] **Step 5: Chạy lint + build**

```bash
cd fe && npm run lint && npm run build
```

Kỳ vọng: PASS.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/dashboard fe/src/services/dashboardService.ts
git commit -m "feat(dashboard): tab Kết quả kinh doanh"
```

---

### Task 10: Lịch thanh toán

Hàm thuần gom công nợ theo mốc đến hạn, dùng ở cả tab Dòng tiền và tab Công nợ.

**Files:**
- Create: `fe/src/pages/dashboard/lichThanhToan.ts`
- Test: `fe/src/pages/dashboard/lichThanhToan.test.ts`
- Create: `fe/src/pages/dashboard/components/LichThanhToanTables.tsx`
- Modify: `fe/src/pages/dashboard/tabs/DongTienTab.tsx`
- Modify: `fe/src/services/dashboardService.ts`

**Interfaces:**
- Produces:

```ts
export interface KhoanPhaiThanhToan {
  hanThanhToan?: string;
  conLai?: number;
}
export interface LichThanhToanRow {
  nhan: string;
  soKhoan: number;
  soTien: number;
}
export function tinhLichThanhToan(items: KhoanPhaiThanhToan[], homNay: Date): LichThanhToanRow[];
```

Bốn mốc **không chồng lấn**: `Trong 7 ngày` (1–7), `8–30 ngày`, `31–60 ngày`,
`61–90 ngày`. Khoản đã quá hạn và khoản quá 90 ngày không nằm trong lịch.

- [ ] **Step 1: Viết test trước**

Tạo `fe/src/pages/dashboard/lichThanhToan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tinhLichThanhToan } from './lichThanhToan';

const HOM_NAY = new Date('2026-08-10T00:00:00.000Z');

/** Ngày cách hôm nay `n` ngày, dạng ISO. */
const sau = (n: number): string => {
  const d = new Date(HOM_NAY);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe('tinhLichThanhToan', () => {
  it('luôn trả đủ 4 mốc kể cả khi rỗng', () => {
    const out = tinhLichThanhToan([], HOM_NAY);
    expect(out.map((r) => r.nhan)).toEqual(['Trong 7 ngày', '8–30 ngày', '31–60 ngày', '61–90 ngày']);
    expect(out.every((r) => r.soKhoan === 0 && r.soTien === 0)).toBe(true);
  });

  it('phân đúng khoản vào từng mốc', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(3), conLai: 100 },
        { hanThanhToan: sau(20), conLai: 200 },
        { hanThanhToan: sau(45), conLai: 300 },
        { hanThanhToan: sau(80), conLai: 400 },
      ],
      HOM_NAY,
    );
    expect(out.map((r) => r.soTien)).toEqual([100, 200, 300, 400]);
    expect(out.map((r) => r.soKhoan)).toEqual([1, 1, 1, 1]);
  });

  it('biên ngày 7 thuộc mốc đầu, ngày 8 thuộc mốc hai', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(7), conLai: 10 },
        { hanThanhToan: sau(8), conLai: 20 },
      ],
      HOM_NAY,
    );
    expect(out[0].soTien).toBe(10);
    expect(out[1].soTien).toBe(20);
  });

  it('biên ngày 30 thuộc mốc hai, ngày 31 thuộc mốc ba', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(30), conLai: 10 },
        { hanThanhToan: sau(31), conLai: 20 },
      ],
      HOM_NAY,
    );
    expect(out[1].soTien).toBe(10);
    expect(out[2].soTien).toBe(20);
  });

  it('khoản đã quá hạn không vào lịch tương lai', () => {
    const out = tinhLichThanhToan([{ hanThanhToan: sau(-5), conLai: 999 }], HOM_NAY);
    expect(out.every((r) => r.soTien === 0)).toBe(true);
  });

  it('đến hạn đúng hôm nay tính vào mốc đầu', () => {
    const out = tinhLichThanhToan([{ hanThanhToan: sau(0), conLai: 50 }], HOM_NAY);
    expect(out[0].soTien).toBe(50);
  });

  it('quá 90 ngày bị loại', () => {
    const out = tinhLichThanhToan([{ hanThanhToan: sau(91), conLai: 999 }], HOM_NAY);
    expect(out.every((r) => r.soTien === 0)).toBe(true);
  });

  it('bỏ khoản đã tất toán và khoản thiếu hạn thanh toán', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(3), conLai: 0 },
        { hanThanhToan: undefined, conLai: 500 },
        { hanThanhToan: sau(3), conLai: 70 },
      ],
      HOM_NAY,
    );
    expect(out[0]).toEqual({ nhan: 'Trong 7 ngày', soKhoan: 1, soTien: 70 });
  });

  it('cộng dồn nhiều khoản cùng mốc', () => {
    const out = tinhLichThanhToan(
      [
        { hanThanhToan: sau(2), conLai: 100 },
        { hanThanhToan: sau(5), conLai: 250 },
      ],
      HOM_NAY,
    );
    expect(out[0]).toEqual({ nhan: 'Trong 7 ngày', soKhoan: 2, soTien: 350 });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
cd fe && npx vitest run src/pages/dashboard/lichThanhToan.test.ts
```

Kỳ vọng: FAIL.

- [ ] **Step 3: Viết implementation**

Tạo `fe/src/pages/dashboard/lichThanhToan.ts`:

```ts
export interface KhoanPhaiThanhToan {
  hanThanhToan?: string;
  conLai?: number;
}

export interface LichThanhToanRow {
  nhan: string;
  soKhoan: number;
  soTien: number;
}

/** Bốn mốc không chồng lấn, tính theo số ngày còn lại tới hạn. */
const MOC: { nhan: string; den: number }[] = [
  { nhan: 'Trong 7 ngày', den: 7 },
  { nhan: '8–30 ngày', den: 30 },
  { nhan: '31–60 ngày', den: 60 },
  { nhan: '61–90 ngày', den: 90 },
];

const MOT_NGAY = 24 * 60 * 60 * 1000;

/** Số ngày từ `homNay` tới `han`, cắt về mốc 0 giờ để không lệch vì giờ trong ngày. */
function soNgayConLai(han: Date, homNay: Date): number {
  const a = Date.UTC(han.getUTCFullYear(), han.getUTCMonth(), han.getUTCDate());
  const b = Date.UTC(homNay.getUTCFullYear(), homNay.getUTCMonth(), homNay.getUTCDate());
  return Math.round((a - b) / MOT_NGAY);
}

/**
 * Gom các khoản công nợ còn dư vào bốn mốc đến hạn sắp tới.
 * Khoản đã quá hạn (số ngày âm) và khoản xa hơn 90 ngày không nằm trong lịch —
 * quá hạn đã có bảng riêng, xa hơn 90 ngày chưa cần theo dõi.
 */
export function tinhLichThanhToan(
  items: KhoanPhaiThanhToan[],
  homNay: Date,
): LichThanhToanRow[] {
  const rows: LichThanhToanRow[] = MOC.map((m) => ({ nhan: m.nhan, soKhoan: 0, soTien: 0 }));

  for (const it of items) {
    const conLai = it.conLai || 0;
    if (conLai <= 0 || !it.hanThanhToan) continue;

    const han = new Date(it.hanThanhToan);
    if (Number.isNaN(han.getTime())) continue;

    const ngay = soNgayConLai(han, homNay);
    if (ngay < 0 || ngay > 90) continue;

    const idx = MOC.findIndex((m) => ngay <= m.den);
    rows[idx].soKhoan += 1;
    rows[idx].soTien += conLai;
  }

  return rows;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd fe && npx vitest run src/pages/dashboard/lichThanhToan.test.ts
```

Kỳ vọng: PASS, 9 test.

- [ ] **Step 5: Thêm hàm lấy công nợ thô vào dashboardService**

Trong `fe/src/services/dashboardService.ts`, thêm import:

```ts
import type { KhoanPhaiThanhToan } from '@/pages/dashboard/lichThanhToan';
```

và method:

```ts
  /**
   * Toàn bộ khoản phải thu / phải trả còn dư, kèm hạn thanh toán.
   * `/payable/phai-thu` và `/payable/phai-tra` gọi findAll() nên trả đủ bản ghi,
   * không phân trang.
   */
  async getKhoanPhaiThanhToan(loai: 'thu' | 'tra'): Promise<KhoanPhaiThanhToan[]> {
    try {
      const rows =
        loai === 'thu'
          ? await congNoPhaiThuService.getAll()
          : await congNoPhaiTraService.getAll();
      return rows.map((r) => ({ hanThanhToan: r.hanThanhToan, conLai: r.conLai }));
    } catch {
      return [];
    }
  },
```

- [ ] **Step 6: Viết component hai bảng lịch**

Tạo `fe/src/pages/dashboard/components/LichThanhToanTables.tsx`:

```tsx
import React from 'react';
import { Card, Table, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarOutlined } from '@ant-design/icons';
import { formatCurrency } from './format';
import type { LichThanhToanRow } from '../lichThanhToan';

const columns: ColumnsType<LichThanhToanRow> = [
  { title: 'Mốc đến hạn', dataIndex: 'nhan' },
  { title: 'Số khoản', dataIndex: 'soKhoan', align: 'right' },
  { title: 'Số tiền', dataIndex: 'soTien', align: 'right', render: formatCurrency },
];

const Bang: React.FC<{ title: string; rows: LichThanhToanRow[]; loading?: boolean }> = ({ title, rows, loading }) => (
  <Card title={<span className="text-sm sm:text-base"><CalendarOutlined className="text-primary mr-2" />{title}</span>}>
    <Table
      size="small"
      rowKey="nhan"
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={false}
      summary={(data) => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}><b>Tổng</b></Table.Summary.Cell>
          <Table.Summary.Cell index={1} align="right"><b>{data.reduce((s, r) => s + r.soKhoan, 0)}</b></Table.Summary.Cell>
          <Table.Summary.Cell index={2} align="right"><b>{formatCurrency(data.reduce((s, r) => s + r.soTien, 0))}</b></Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  </Card>
);

interface Props {
  thu: LichThanhToanRow[];
  tra: LichThanhToanRow[];
  loading?: boolean;
  /** Nhãn tiêu đề — tab Dòng tiền dùng "sắp đến hạn", tab Công nợ dùng "lịch thu/trả nợ". */
  tieuDeThu: string;
  tieuDeTra: string;
}

const LichThanhToanTables: React.FC<Props> = ({ thu, tra, loading, tieuDeThu, tieuDeTra }) => (
  <Row gutter={[12, 12]}>
    <Col xs={24} lg={12}><Bang title={tieuDeThu} rows={thu} loading={loading} /></Col>
    <Col xs={24} lg={12}><Bang title={tieuDeTra} rows={tra} loading={loading} /></Col>
  </Row>
);

export default LichThanhToanTables;
```

- [ ] **Step 7: Gắn vào tab Dòng tiền**

Trong `fe/src/pages/dashboard/tabs/DongTienTab.tsx` thêm import:

```tsx
import LichThanhToanTables from '../components/LichThanhToanTables';
import { tinhLichThanhToan } from '../lichThanhToan';
```

Trong thân component:

```tsx
  const { data: khoanThu = [], isLoading: loadingLich } = useQuery({
    queryKey: ['dash-khoan-thu'],
    queryFn: () => dashboardService.getKhoanPhaiThanhToan('thu'),
  });
  const { data: khoanTra = [] } = useQuery({
    queryKey: ['dash-khoan-tra'],
    queryFn: () => dashboardService.getKhoanPhaiThanhToan('tra'),
  });
  const homNay = useMemo(() => new Date(), []);
  const lichThu = useMemo(() => tinhLichThanhToan(khoanThu, homNay), [khoanThu, homNay]);
  const lichChi = useMemo(() => tinhLichThanhToan(khoanTra, homNay), [khoanTra, homNay]);
```

Trong JSX, sau khối hai donut:

```tsx
      <LichThanhToanTables
        thu={lichThu}
        tra={lichChi}
        loading={loadingLich}
        tieuDeThu="Khoản thu sắp đến hạn"
        tieuDeTra="Khoản chi sắp đến hạn"
      />
```

- [ ] **Step 8: Chạy lint + build + test**

```bash
cd fe && npm run lint && npm run build && npm run test
```

Kỳ vọng: PASS.

- [ ] **Step 9: Commit**

```bash
git add fe/src/pages/dashboard fe/src/services/dashboardService.ts
git commit -m "feat(dashboard): lịch thanh toán theo mốc đến hạn"
```

---

### Task 11: Tab Công nợ

**Files:**
- Create: `fe/src/pages/dashboard/doiChieuExport.ts`
- Test: `fe/src/pages/dashboard/doiChieuExport.test.ts`
- Create: `fe/src/pages/dashboard/components/DoiChieuCongNoTable.tsx`
- Modify: `fe/src/pages/dashboard/tabs/CongNoTab.tsx`

**Interfaces:**
- Consumes: `doiChieuCongNo`, `DoiChieuRow` (Task 3); `tinhLichThanhToan` + `LichThanhToanTables` (Task 10); `AgingCharts`, `TopPartnersCharts`, `OverdueTables` (đã có trong repo, không nhận props); `exportReportExcel` từ `@/utils/exportReportExcel`.
- Produces: `buildDoiChieuSheets(rows: DoiChieuRow[], loai: 'thu' | 'tra', kyLabel: string)`

Kiểu dữ liệu của tiện ích xuất Excel (`fe/src/utils/exportReportExcel.ts`) — đã
xác thực, dùng đúng như sau:

```ts
export interface ReportCol {
  key: string;
  header: string;          // KHÔNG phải 'title'
  width?: number;
  align?: 'left' | 'right' | 'center';
  numFmt?: string;         // dùng NUM_FMT cho cột số
}
export interface ReportRow {
  cells?: Record<string, string | number | null | undefined>;  // optional → truy cập bằng ?.
  bold?: boolean;
  indent?: number;
  fill?: 'total' | 'group' | 'category';
}
export interface ReportSheet {
  name: string; title: string; meta?: string[];
  columns: ReportCol[]; rows: ReportRow[];
}
export const NUM_FMT: string;
export async function exportReportExcel(fileName: string, sheets: ReportSheet[]): Promise<void>;
```

- [ ] **Step 1: Viết test cho hàm dựng sheet**

Tạo `fe/src/pages/dashboard/doiChieuExport.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildDoiChieuSheets } from './doiChieuExport';
import type { DoiChieuRow } from './trialBalanceDerive';

const rows: DoiChieuRow[] = [
  { doiTuong: 'Công ty A', duDauKy: 100, phatSinhTang: 500, phatSinhGiam: 300, duCuoiKy: 300 },
  { doiTuong: 'Công ty B', duDauKy: 0, phatSinhTang: 200, phatSinhGiam: 0, duCuoiKy: 200 },
];

describe('buildDoiChieuSheets', () => {
  it('không có dòng nào → không sinh sheet', () => {
    expect(buildDoiChieuSheets([], 'thu', 'Năm 2026')).toEqual([]);
  });

  it('tiêu đề nêu rõ loại công nợ và kỳ', () => {
    const [sheet] = buildDoiChieuSheets(rows, 'thu', 'Năm 2026');
    expect(sheet.title).toContain('PHẢI THU');
    expect(sheet.title).toContain('Năm 2026');
  });

  it('loại "tra" đổi tiêu đề sang phải trả', () => {
    const [sheet] = buildDoiChieuSheets(rows, 'tra', 'Quý 1');
    expect(sheet.title).toContain('PHẢI TRẢ');
  });

  it('mỗi đối tượng một dòng, cuối cùng là dòng tổng', () => {
    const [sheet] = buildDoiChieuSheets(rows, 'thu', 'Năm 2026');
    expect(sheet.rows).toHaveLength(3);
    const tong = sheet.rows[2];
    expect(tong.cells?.doiTuong).toBe('TỔNG CỘNG');
    expect(tong.cells?.duCuoiKy).toBe(500);
    expect(tong.cells?.phatSinhTang).toBe(700);
    expect(tong.bold).toBe(true);
  });

  it('cột số dùng header tiếng Việt và định dạng số', () => {
    const [sheet] = buildDoiChieuSheets(rows, 'thu', 'Năm 2026');
    expect(sheet.columns[0].header).toBe('Đối tượng');
    expect(sheet.columns[4].align).toBe('right');
    expect(sheet.columns[4].numFmt).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
cd fe && npx vitest run src/pages/dashboard/doiChieuExport.test.ts
```

Kỳ vọng: FAIL.

- [ ] **Step 3: Viết implementation**

Tạo `fe/src/pages/dashboard/doiChieuExport.ts`:

```ts
import { NUM_FMT, type ReportCol, type ReportSheet } from '@/utils/exportReportExcel';
import type { DoiChieuRow } from './trialBalanceDerive';

const soCot = (key: string, header: string): ReportCol => ({
  key,
  header,
  width: 18,
  align: 'right',
  numFmt: NUM_FMT,
});

const COLUMNS: ReportCol[] = [
  { key: 'doiTuong', header: 'Đối tượng', width: 36 },
  soCot('duDauKy', 'Số dư đầu kỳ'),
  soCot('phatSinhTang', 'Phát sinh tăng'),
  soCot('phatSinhGiam', 'Phát sinh giảm'),
  soCot('duCuoiKy', 'Số dư cuối kỳ'),
];

/** Một sheet "Đối chiếu công nợ", dòng cuối là tổng cộng. */
export function buildDoiChieuSheets(
  rows: DoiChieuRow[],
  loai: 'thu' | 'tra',
  kyLabel: string,
): ReportSheet[] {
  if (!rows.length) return [];

  const nhan = loai === 'thu' ? 'PHẢI THU' : 'PHẢI TRẢ';
  const cong = (f: keyof DoiChieuRow) =>
    rows.reduce((s, r) => s + (r[f] as number), 0);

  return [
    {
      name: `Đối chiếu ${loai === 'thu' ? 'phải thu' : 'phải trả'}`,
      title: `BẢNG ĐỐI CHIẾU CÔNG NỢ ${nhan} — ${kyLabel}`,
      columns: COLUMNS,
      rows: [
        ...rows.map((r) => ({ cells: { ...r } })),
        {
          bold: true,
          cells: {
            doiTuong: 'TỔNG CỘNG',
            duDauKy: cong('duDauKy'),
            phatSinhTang: cong('phatSinhTang'),
            phatSinhGiam: cong('phatSinhGiam'),
            duCuoiKy: cong('duCuoiKy'),
          },
        },
      ],
    },
  ];
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd fe && npx vitest run src/pages/dashboard/doiChieuExport.test.ts
```

Kỳ vọng: PASS, 5 test.

- [ ] **Step 5: Viết bảng đối chiếu công nợ**

Tạo `fe/src/pages/dashboard/components/DoiChieuCongNoTable.tsx`:

```tsx
import React, { useState } from 'react';
import { Card, Table, Segmented, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReconciliationOutlined, FileExcelOutlined } from '@ant-design/icons';
import { formatCurrency } from './format';
import { exportReportExcel } from '@/utils/exportReportExcel';
import { buildDoiChieuSheets } from '../doiChieuExport';
import type { DoiChieuRow } from '../trialBalanceDerive';

interface Props {
  thu: DoiChieuRow[];
  tra: DoiChieuRow[];
  loading?: boolean;
  kyLabel: string;
}

const columns: ColumnsType<DoiChieuRow> = [
  { title: 'Đối tượng', dataIndex: 'doiTuong' },
  { title: 'Số dư đầu kỳ', dataIndex: 'duDauKy', align: 'right', render: formatCurrency },
  { title: 'Phát sinh tăng', dataIndex: 'phatSinhTang', align: 'right', render: formatCurrency },
  { title: 'Phát sinh giảm', dataIndex: 'phatSinhGiam', align: 'right', render: formatCurrency },
  { title: 'Số dư cuối kỳ', dataIndex: 'duCuoiKy', align: 'right', render: formatCurrency },
];

const DoiChieuCongNoTable: React.FC<Props> = ({ thu, tra, loading, kyLabel }) => {
  const [loai, setLoai] = useState<'thu' | 'tra'>('thu');
  const rows = loai === 'thu' ? thu : tra;

  const handleExport = () => {
    exportReportExcel(
      `doi-chieu-cong-no-${loai}`,
      buildDoiChieuSheets(rows, loai, kyLabel),
    );
  };

  return (
    <Card
      title={<span className="text-sm sm:text-base"><ReconciliationOutlined className="text-primary mr-2" />Đối chiếu công nợ</span>}
      extra={
        <Space>
          <Segmented
            size="small"
            value={loai}
            onChange={(v) => setLoai(v as 'thu' | 'tra')}
            options={[{ label: 'Phải thu', value: 'thu' }, { label: 'Phải trả', value: 'tra' }]}
          />
          <Button size="small" icon={<FileExcelOutlined />} onClick={handleExport} disabled={!rows.length}>
            Xuất Excel
          </Button>
        </Space>
      }
    >
      <Table
        size="small"
        rowKey="doiTuong"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
};

export default DoiChieuCongNoTable;
```

- [ ] **Step 6: Dựng tab Công nợ**

Thay toàn bộ `fe/src/pages/dashboard/tabs/CongNoTab.tsx`:

```tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownOutlined, ArrowUpOutlined, CalendarOutlined, WarningOutlined } from '@ant-design/icons';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import AgingCharts from '../components/AgingCharts';
import TopPartnersCharts from '../components/TopPartnersCharts';
import OverdueTables from '../components/OverdueTables';
import LichThanhToanTables from '../components/LichThanhToanTables';
import DoiChieuCongNoTable from '../components/DoiChieuCongNoTable';
import { dashboardService } from '@/services/dashboardService';
import { congNoPhaiThuService } from '@/services/congNoPhaiThuService';
import { congNoPhaiTraService } from '@/services/congNoPhaiTraService';
import { tinhLichThanhToan } from '../lichThanhToan';
import { doiChieuCongNo } from '../trialBalanceDerive';
import type { TabProps } from './TabProps';

const CongNoTab: React.FC<TabProps> = ({ year, startMonth, endMonth }) => {
  const { data: statsThu } = useQuery({
    queryKey: ['dash-stats-thu'],
    queryFn: () => congNoPhaiThuService.getStats(),
  });
  const { data: statsTra } = useQuery({
    queryKey: ['dash-stats-tra'],
    queryFn: () => congNoPhaiTraService.getStats(),
  });
  const { data: khoanThu = [], isLoading: loadingLich } = useQuery({
    queryKey: ['dash-khoan-thu'],
    queryFn: () => dashboardService.getKhoanPhaiThanhToan('thu'),
  });
  const { data: khoanTra = [] } = useQuery({
    queryKey: ['dash-khoan-tra'],
    queryFn: () => dashboardService.getKhoanPhaiThanhToan('tra'),
  });
  const { data: tb = [], isLoading: loadingTb } = useQuery({
    queryKey: ['dash-tb', year, startMonth, endMonth],
    queryFn: () => dashboardService.getTrialBalance(year, startMonth, endMonth),
  });

  const homNay = useMemo(() => new Date(), []);
  const lichThu = useMemo(() => tinhLichThanhToan(khoanThu, homNay), [khoanThu, homNay]);
  const lichTra = useMemo(() => tinhLichThanhToan(khoanTra, homNay), [khoanTra, homNay]);

  const doiChieuThu = useMemo(() => doiChieuCongNo(tb, 'thu'), [tb]);
  const doiChieuTra = useMemo(() => doiChieuCongNo(tb, 'tra'), [tb]);

  // "Đến hạn" = tổng hai mốc gần nhất (trong 30 ngày) của cả thu lẫn trả.
  const denHan =
    lichThu[0].soTien + lichThu[1].soTien + lichTra[0].soTien + lichTra[1].soTien;
  const quaHan = (statsThu?.tongQuaHan ?? 0) + (statsTra?.tongQuaHan ?? 0);

  const kpis: KpiItem[] = [
    { key: 'phaiThu', label: 'Tổng phải thu', value: statsThu?.conLai ?? 0, icon: <ArrowDownOutlined /> },
    { key: 'phaiTra', label: 'Tổng phải trả', value: statsTra?.conLai ?? 0, icon: <ArrowUpOutlined /> },
    { key: 'denHan', label: 'Đến hạn trong 30 ngày', value: denHan, icon: <CalendarOutlined /> },
    { key: 'quaHan', label: 'Quá hạn', value: quaHan, inverse: true, icon: <WarningOutlined /> },
  ];

  const kyLabel = startMonth === endMonth ? `Tháng ${startMonth}/${year}` : `Tháng ${startMonth}-${endMonth}/${year}`;

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={loadingLich} />
      <AgingCharts />
      <TopPartnersCharts />
      <LichThanhToanTables
        thu={lichThu}
        tra={lichTra}
        loading={loadingLich}
        tieuDeThu="Lịch thu nợ"
        tieuDeTra="Lịch trả nợ"
      />
      <OverdueTables />
      <DoiChieuCongNoTable thu={doiChieuThu} tra={doiChieuTra} loading={loadingTb} kyLabel={kyLabel} />
    </div>
  );
};

export default CongNoTab;
```

> `statsThu.tongQuaHan` là trường optional trong `CongNoStats`. Mở
> `fe/src/services/congNoPhaiThuService.ts` xác nhận BE có trả trường này; nếu
> luôn `undefined`, đổi sang `soKhoanQuaHan` và cho thẻ KPI `format: 'soLuong'`.

- [ ] **Step 7: Chạy lint + build + test**

```bash
cd fe && npm run lint && npm run build && npm run test
```

Kỳ vọng: PASS.

- [ ] **Step 8: Commit**

```bash
git add fe/src/pages/dashboard
git commit -m "feat(dashboard): tab Công nợ với lịch thu-trả nợ và đối chiếu"
```

---

### Task 12: Endpoint doanh số theo chiều và thời gian (backend)

**Files:**
- Create: `be/libs/dto/src/reporting/doanh-so.dto.ts`
- Create: `be/apps/reporting-service/src/bao-cao/doanh-so.helper.ts`
- Test: `be/apps/reporting-service/src/bao-cao/doanh-so.helper.spec.ts`
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.controller.ts`
- Modify: `be/libs/dto/src/reporting/index.ts` (nếu có barrel export)

**Interfaces:**
- Consumes: `DIMENSION_FIELD_MAP`, `nhanChieu` từ `./bao-cao.helper` (Task 8); `NhatKyChungEntry` từ `@app/dto`.
- Produces:

```ts
export type GroupBy = 'ngay' | 'thang' | 'quy' | 'nam';
export interface DoanhSoThoiGianPoint { ky: string; kyNay: number; cungKy: number }
export interface DoanhSoChieuRow { ten: string; soTien: number }
export interface DoanhSoTheoResult {
  theoThoiGian: DoanhSoThoiGianPoint[];
  theoChieu: DoanhSoChieuRow[];
  tong: number;
  tongCungKy: number;
}
export function nhanKy(ngay: Date, groupBy: GroupBy): string;
export function laDoanhThu(v: NhatKyChungEntry): boolean;
export function gomTheoThoiGian(vouchers: NhatKyChungEntry[], groupBy: GroupBy): Map<string, number>;
export function gomTheoChieu(vouchers: NhatKyChungEntry[], field: string): DoanhSoChieuRow[];
```

- [ ] **Step 1: Viết test trước**

Tạo `be/apps/reporting-service/src/bao-cao/doanh-so.helper.spec.ts`:

```ts
import { nhanKy, laDoanhThu, gomTheoThoiGian, gomTheoChieu } from './doanh-so.helper';
import type { NhatKyChungEntry } from '@app/dto';

const v = (
  ngay: string,
  soTien: number,
  maCo = '5111',
  danhMucThem: Record<string, unknown> = {},
): NhatKyChungEntry =>
  ({
    soPhieu: 'PT01',
    ngay: new Date(ngay),
    soTien,
    noiDung: '',
    danhMuc: { taiKhoanCo: { ma: maCo }, ...danhMucThem },
  }) as unknown as NhatKyChungEntry;

describe('nhanKy', () => {
  it('theo ngày: dd/MM/yyyy', () => {
    expect(nhanKy(new Date('2026-03-05T00:00:00Z'), 'ngay')).toBe('05/03/2026');
  });
  it('theo tháng: T<m>/yyyy', () => {
    expect(nhanKy(new Date('2026-03-05T00:00:00Z'), 'thang')).toBe('T3/2026');
  });
  it('theo quý: Q<q>/yyyy — tháng 3 thuộc Q1, tháng 4 thuộc Q2', () => {
    expect(nhanKy(new Date('2026-03-31T00:00:00Z'), 'quy')).toBe('Q1/2026');
    expect(nhanKy(new Date('2026-04-01T00:00:00Z'), 'quy')).toBe('Q2/2026');
  });
  it('theo năm: yyyy', () => {
    expect(nhanKy(new Date('2026-03-05T00:00:00Z'), 'nam')).toBe('2026');
  });
});

describe('laDoanhThu', () => {
  it('bút toán có TK Có bắt đầu 511 là doanh thu', () => {
    expect(laDoanhThu(v('2026-01-01', 100, '5111'))).toBe(true);
  });
  it('TK Có khác 511 thì không', () => {
    expect(laDoanhThu(v('2026-01-01', 100, '515'))).toBe(false);
  });
  it('đọc được cả trường legacy taiKhoanCo ở cấp gốc', () => {
    const legacy = { soPhieu: 'X', ngay: new Date(), soTien: 1, noiDung: '', taiKhoanCo: '5112' };
    expect(laDoanhThu(legacy as unknown as NhatKyChungEntry)).toBe(true);
  });
});

describe('gomTheoThoiGian', () => {
  it('cộng dồn doanh thu cùng kỳ, bỏ bút toán không phải 511', () => {
    const out = gomTheoThoiGian(
      [v('2026-01-10', 100), v('2026-01-20', 50), v('2026-02-01', 30), v('2026-01-25', 999, '331')],
      'thang',
    );
    expect(out.get('T1/2026')).toBe(150);
    expect(out.get('T2/2026')).toBe(30);
    expect(out.size).toBe(2);
  });

  it('danh sách rỗng → map rỗng', () => {
    expect(gomTheoThoiGian([], 'thang').size).toBe(0);
  });
});

describe('gomTheoChieu', () => {
  it('gom theo tên chiều, sắp xếp giảm dần', () => {
    const rows = gomTheoChieu(
      [
        v('2026-01-01', 100, '5111', { nhanVien: { ma: 'NV1', ten: 'An' } }),
        v('2026-01-02', 300, '5111', { nhanVien: { ma: 'NV2', ten: 'Bình' } }),
        v('2026-01-03', 50, '5111', { nhanVien: { ma: 'NV1', ten: 'An' } }),
      ],
      'nhanVien',
    );
    expect(rows).toEqual([
      { ten: 'Bình', soTien: 300 },
      { ten: 'An', soTien: 150 },
    ]);
  });

  it('hợp đồng dùng soHopDong vì snapshot không có ma', () => {
    const rows = gomTheoChieu([v('2026-01-01', 700, '5111', { hopDong: { soHopDong: 'HD-9' } })], 'hopDong');
    expect(rows).toEqual([{ ten: 'HD-9', soTien: 700 }]);
  });

  it('bút toán thiếu chiều gom vào "Không xác định"', () => {
    const rows = gomTheoChieu([v('2026-01-01', 400)], 'nhanVien');
    expect(rows).toEqual([{ ten: 'Không xác định', soTien: 400 }]);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
cd be && yarn test doanh-so.helper
```

Kỳ vọng: FAIL — không tìm thấy module.

- [ ] **Step 3: Viết helper**

Tạo `be/apps/reporting-service/src/bao-cao/doanh-so.helper.ts`:

```ts
import type { NhatKyChungEntry } from '@app/dto';
import { nhanChieu } from './bao-cao.helper';

export type GroupBy = 'ngay' | 'thang' | 'quy' | 'nam';

export interface DoanhSoChieuRow {
  ten: string;
  soTien: number;
}

const hai = (n: number): string => String(n).padStart(2, '0');

/** Nhãn kỳ của một ngày, dùng làm khoá gom nhóm và nhãn trục X. */
export function nhanKy(ngay: Date, groupBy: GroupBy): string {
  const y = ngay.getUTCFullYear();
  const m = ngay.getUTCMonth() + 1;
  switch (groupBy) {
    case 'ngay':
      return `${hai(ngay.getUTCDate())}/${hai(m)}/${y}`;
    case 'quy':
      return `Q${Math.ceil(m / 3)}/${y}`;
    case 'nam':
      return `${y}`;
    default:
      return `T${m}/${y}`;
  }
}

/** Doanh số = phát sinh Có TK 511. Chấp nhận cả trường legacy ở cấp gốc bút toán. */
export function laDoanhThu(v: NhatKyChungEntry): boolean {
  const maTK = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
  return !!maTK?.startsWith('511');
}

export function gomTheoThoiGian(
  vouchers: NhatKyChungEntry[],
  groupBy: GroupBy,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const v of vouchers) {
    if (!laDoanhThu(v)) continue;
    const key = nhanKy(new Date(v.ngay), groupBy);
    out.set(key, (out.get(key) ?? 0) + v.soTien);
  }
  return out;
}

export function gomTheoChieu(
  vouchers: NhatKyChungEntry[],
  field: string,
): DoanhSoChieuRow[] {
  const out = new Map<string, number>();
  for (const v of vouchers) {
    if (!laDoanhThu(v)) continue;
    const dm = v.danhMuc as unknown as Record<
      string,
      { ma?: string; ten?: string; soHopDong?: string } | undefined
    >;
    const ten = nhanChieu(dm?.[field]);
    out.set(ten, (out.get(ten) ?? 0) + v.soTien);
  }
  return Array.from(out.entries())
    .map(([ten, soTien]) => ({ ten, soTien }))
    .sort((a, b) => b.soTien - a.soTien);
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd be && yarn test doanh-so.helper
```

Kỳ vọng: PASS, 12 test.

- [ ] **Step 5: Tạo DTO**

Tạo `be/libs/dto/src/reporting/doanh-so.dto.ts`:

```ts
export type DoanhSoGroupBy = 'ngay' | 'thang' | 'quy' | 'nam';

export interface DoanhSoThoiGianPoint {
  /** Nhãn kỳ, ví dụ 'T3/2026' hoặc 'Q1/2026'. */
  ky: string;
  kyNay: number;
  /** Doanh số cùng kỳ năm trước, khớp theo vị trí thứ tự kỳ. */
  cungKy: number;
}

export interface DoanhSoChieuRow {
  ten: string;
  soTien: number;
}

export interface DoanhSoTheoResult {
  theoThoiGian: DoanhSoThoiGianPoint[];
  theoChieu: DoanhSoChieuRow[];
  tong: number;
  tongCungKy: number;
}
```

Nếu `be/libs/dto/src/reporting/` có file `index.ts` gom export, thêm dòng
`export * from './doanh-so.dto';`. Kiểm tra bằng `ls be/libs/dto/src/reporting/`.

- [ ] **Step 6: Viết method service**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`, thêm import:

```ts
import { gomTheoThoiGian, gomTheoChieu, type GroupBy } from './doanh-so.helper';
import type { DoanhSoTheoResult } from '@app/dto';
```

Thêm method (đặt cạnh `getLoiNhuanByDimension`):

```ts
  /**
   * Doanh số (phát sinh Có 511) theo thời gian và theo chiều.
   * Cùng kỳ = đúng khoảng đó lùi lại một năm; hai chuỗi ghép theo thứ tự kỳ,
   * không theo nhãn — nhãn năm khác nhau nên không khớp trực tiếp được.
   */
  async getDoanhSoTheo(
    startDate: Date,
    endDate: Date,
    groupBy: GroupBy,
    dimension: string,
    authToken?: string,
    tenantId?: string,
  ): Promise<DoanhSoTheoResult> {
    const lui = (d: Date) => {
      const x = new Date(d);
      x.setFullYear(x.getFullYear() - 1);
      return x;
    };

    const [nayRes, truocRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getNhatKyChung(
        lui(startDate).toISOString(),
        lui(endDate).toISOString(),
        authToken,
        tenantId,
      ),
    ]);

    const vNay = nayRes.success ? nayRes.data || [] : [];
    const vTruoc = truocRes.success ? truocRes.data || [] : [];

    const mapNay = gomTheoThoiGian(vNay, groupBy);
    const mapTruoc = gomTheoThoiGian(vTruoc, groupBy);
    const cungKyValues = Array.from(mapTruoc.values());

    const theoThoiGian = Array.from(mapNay.entries()).map(([ky, kyNay], i) => ({
      ky,
      kyNay,
      cungKy: cungKyValues[i] ?? 0,
    }));

    const field = DIMENSION_FIELD_MAP[dimension] || 'doiTuong';

    return {
      theoThoiGian,
      theoChieu: gomTheoChieu(vNay, field),
      tong: Array.from(mapNay.values()).reduce((s, v) => s + v, 0),
      tongCungKy: cungKyValues.reduce((s, v) => s + v, 0),
    };
  }
```

- [ ] **Step 7: Thêm route**

Trong `be/apps/reporting-service/src/bao-cao/bao-cao.controller.ts`, thêm trước dấu `}` đóng class:

```ts
  @Get('doanh-so-theo')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getDoanhSoTheo(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: string = 'thang',
    @Query('dimension') dimension: string = 'doi-tuong',
    @Headers('authorization') authToken: string,
    @CurrentUser() user: UserPayload,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('startDate và endDate phải là ngày hợp lệ');
    }

    const validGroupBy = ['ngay', 'thang', 'quy', 'nam'];
    if (!validGroupBy.includes(groupBy)) {
      throw new BadRequestException(
        `groupBy phải là một trong: ${validGroupBy.join(', ')}`,
      );
    }

    const data = await this.baoCaoService.getDoanhSoTheo(
      start,
      end,
      groupBy as 'ngay' | 'thang' | 'quy' | 'nam',
      dimension,
      authToken,
      user.tenantId,
    );
    return { success: true, data };
  }
```

- [ ] **Step 8: Chạy test BE + kiểm tra type**

```bash
cd be && yarn test reporting-service && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "reporting-service|libs/dto" || echo "không có lỗi type mới"
```

Kỳ vọng: PASS.

- [ ] **Step 9: Commit**

```bash
git add be/apps/reporting-service/src/bao-cao be/libs/dto/src/reporting
git commit -m "feat(bao-cao): endpoint doanh số theo chiều và theo thời gian"
```

---

### Task 13: Tab Bán hàng

**Files:**
- Create: `fe/src/services/doanhSoService.ts`
- Create: `fe/src/pages/dashboard/soSanhCungKy.ts`
- Test: `fe/src/pages/dashboard/soSanhCungKy.test.ts`
- Create: `fe/src/pages/dashboard/components/DoanhSoTheoThoiGianChart.tsx`
- Create: `fe/src/pages/dashboard/components/DoanhSoTheoChieuChart.tsx`
- Modify: `fe/src/pages/dashboard/tabs/BanHangTab.tsx`

**Interfaces:**
- Consumes: endpoint `bao-cao/doanh-so-theo` (Task 12); `KpiRow` (Task 2).
- Produces:

```ts
// soSanhCungKy.ts
export function tyLeSoCungKy(kyNay: number, cungKy: number): number | null;

// doanhSoService.ts
export interface DoanhSoTheoResult {
  theoThoiGian: { ky: string; kyNay: number; cungKy: number }[];
  theoChieu: { ten: string; soTien: number }[];
  tong: number;
  tongCungKy: number;
}
export const doanhSoService: {
  getDoanhSoTheo(params: {
    year: number; startMonth: number; endMonth: number;
    groupBy: 'ngay' | 'thang' | 'quy' | 'nam';
    dimension: string;
  }): Promise<DoanhSoTheoResult>;
};
```

- [ ] **Step 1: Viết test cho so sánh cùng kỳ**

Tạo `fe/src/pages/dashboard/soSanhCungKy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tyLeSoCungKy } from './soSanhCungKy';

describe('tyLeSoCungKy', () => {
  it('tăng 25%', () => {
    expect(tyLeSoCungKy(1250, 1000)).toBe(25);
  });

  it('giảm 50%', () => {
    expect(tyLeSoCungKy(500, 1000)).toBe(-50);
  });

  it('cùng kỳ bằng 0 → null, không chia cho 0', () => {
    expect(tyLeSoCungKy(1000, 0)).toBeNull();
  });

  it('cả hai bằng 0 → null', () => {
    expect(tyLeSoCungKy(0, 0)).toBeNull();
  });

  it('cùng kỳ âm: lấy trị tuyệt đối làm mẫu số', () => {
    expect(tyLeSoCungKy(0, -200)).toBe(100);
  });

  it('không đổi → 0', () => {
    expect(tyLeSoCungKy(800, 800)).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

```bash
cd fe && npx vitest run src/pages/dashboard/soSanhCungKy.test.ts
```

Kỳ vọng: FAIL.

- [ ] **Step 3: Viết implementation**

Tạo `fe/src/pages/dashboard/soSanhCungKy.ts`:

```ts
/**
 * % thay đổi so với cùng kỳ. Trả null khi cùng kỳ bằng 0 — chia cho 0 không có
 * nghĩa và hiển thị "—" rõ hơn là "∞%".
 */
export function tyLeSoCungKy(kyNay: number, cungKy: number): number | null {
  if (!cungKy) return null;
  return ((kyNay - cungKy) / Math.abs(cungKy)) * 100;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd fe && npx vitest run src/pages/dashboard/soSanhCungKy.test.ts
```

Kỳ vọng: PASS, 6 test.

- [ ] **Step 5: Viết service gọi endpoint**

Tạo `fe/src/services/doanhSoService.ts`:

```ts
import { ServiceBase } from './base/service-base';

export interface DoanhSoThoiGianPoint {
  ky: string;
  kyNay: number;
  cungKy: number;
}

export interface DoanhSoChieuRow {
  ten: string;
  soTien: number;
}

export interface DoanhSoTheoResult {
  theoThoiGian: DoanhSoThoiGianPoint[];
  theoChieu: DoanhSoChieuRow[];
  tong: number;
  tongCungKy: number;
}

export interface GetDoanhSoParams {
  year: number;
  startMonth: number;
  endMonth: number;
  groupBy: 'ngay' | 'thang' | 'quy' | 'nam';
  dimension: string;
}

const RONG: DoanhSoTheoResult = { theoThoiGian: [], theoChieu: [], tong: 0, tongCungKy: 0 };

class DoanhSoService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/bao-cao' });
  }

  async getDoanhSoTheo(p: GetDoanhSoParams): Promise<DoanhSoTheoResult> {
    try {
      const startDate = new Date(p.year, p.startMonth - 1, 1).toISOString();
      const endDate = new Date(p.year, p.endMonth, 0, 23, 59, 59, 999).toISOString();
      const res = await this.get<DoanhSoTheoResult>({
        endpoint: '/doanh-so-theo',
        params: { startDate, endDate, groupBy: p.groupBy, dimension: p.dimension },
      });
      return {
        theoThoiGian: Array.isArray(res.theoThoiGian) ? res.theoThoiGian : [],
        theoChieu: Array.isArray(res.theoChieu) ? res.theoChieu : [],
        tong: res.tong ?? 0,
        tongCungKy: res.tongCungKy ?? 0,
      };
    } catch {
      return RONG;
    }
  }
}

export const doanhSoService = new DoanhSoService();
```

- [ ] **Step 6: Viết chart doanh số theo thời gian**

Tạo `fe/src/pages/dashboard/components/DoanhSoTheoThoiGianChart.tsx`:

```tsx
import React from 'react';
import { Card, Segmented, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';
import type { DoanhSoThoiGianPoint } from '@/services/doanhSoService';

export type GroupBy = 'ngay' | 'thang' | 'quy' | 'nam';

const OPTIONS: { label: string; value: GroupBy }[] = [
  { label: 'Ngày', value: 'ngay' },
  { label: 'Tháng', value: 'thang' },
  { label: 'Quý', value: 'quy' },
  { label: 'Năm', value: 'nam' },
];

interface Props {
  data: DoanhSoThoiGianPoint[];
  groupBy: GroupBy;
  onGroupByChange: (v: GroupBy) => void;
  loading?: boolean;
}

const DoanhSoTheoThoiGianChart: React.FC<Props> = ({ data, groupBy, onGroupByChange, loading }) => (
  <Card
    title={<span className="text-sm sm:text-base"><BarChartOutlined className="text-primary mr-2" />Doanh số theo thời gian</span>}
    extra={<Segmented size="small" value={groupBy} options={OPTIONS} onChange={(v) => onGroupByChange(v as GroupBy)} />}
    loading={loading}
  >
    {data.length === 0 ? (
      <Empty description="Chưa có dữ liệu" />
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="ky" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatShortCurrency} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="kyNay" name="Kỳ này" fill={DASH_COLORS.balance} radius={[3, 3, 0, 0]} barSize={18} />
          <Line type="monotone" dataKey="cungKy" name="Cùng kỳ năm trước" stroke={DASH_COLORS.accent} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    )}
  </Card>
);

export default DoanhSoTheoThoiGianChart;
```

- [ ] **Step 7: Viết chart doanh số theo chiều**

Tạo `fe/src/pages/dashboard/components/DoanhSoTheoChieuChart.tsx`:

```tsx
import React from 'react';
import { Card, Select, Empty } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';
import type { DoanhSoChieuRow } from '@/services/doanhSoService';

/** Sáu chiều đặc tả yêu cầu cho tab Bán hàng. */
export const CHIEU_BAN_HANG = [
  { label: 'Nhân viên kinh doanh', value: 'nhan-vien' },
  { label: 'Đội', value: 'doi' },
  { label: 'Bộ phận', value: 'bo-phan' },
  { label: 'Sản phẩm/dịch vụ', value: 'san-pham' },
  { label: 'Khách hàng', value: 'doi-tuong' },
  { label: 'Hợp đồng', value: 'hop-dong' },
];

interface Props {
  data: DoanhSoChieuRow[];
  dimension: string;
  onDimensionChange: (v: string) => void;
  loading?: boolean;
}

const DoanhSoTheoChieuChart: React.FC<Props> = ({ data, dimension, onDimensionChange, loading }) => {
  const rows = data.slice(0, 10);

  return (
    <Card
      title={<span className="text-sm sm:text-base"><TeamOutlined className="text-primary mr-2" />Doanh số theo chiều</span>}
      extra={<Select size="small" value={dimension} onChange={onDimensionChange} options={CHIEU_BAN_HANG} style={{ width: 190 }} />}
      loading={loading}
    >
      {rows.length === 0 ? (
        <Empty description="Chưa có dữ liệu" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatShortCurrency} />
            <YAxis type="category" dataKey="ten" width={150} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="soTien" name="Doanh số" fill={DASH_COLORS.revenue} radius={[0, 3, 3, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default DoanhSoTheoChieuChart;
```

- [ ] **Step 8: Dựng tab Bán hàng**

Thay toàn bộ `fe/src/pages/dashboard/tabs/BanHangTab.tsx`:

```tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiseOutlined, PercentageOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import DoanhSoTheoThoiGianChart, { type GroupBy } from '../components/DoanhSoTheoThoiGianChart';
import DoanhSoTheoChieuChart from '../components/DoanhSoTheoChieuChart';
import { doanhSoService } from '@/services/doanhSoService';
import { tyLeSoCungKy } from '../soSanhCungKy';
import type { TabProps } from './TabProps';

const BanHangTab: React.FC<TabProps> = ({ year, startMonth, endMonth }) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('thang');
  const [dimension, setDimension] = useState('nhan-vien');

  const { data, isLoading } = useQuery({
    queryKey: ['dash-doanh-so', year, startMonth, endMonth, groupBy, dimension],
    queryFn: () => doanhSoService.getDoanhSoTheo({ year, startMonth, endMonth, groupBy, dimension }),
  });

  const tong = data?.tong ?? 0;
  const tongCungKy = data?.tongCungKy ?? 0;
  const soHopDong = data?.theoChieu.length ?? 0;
  const tyLe = tyLeSoCungKy(tong, tongCungKy);

  const kpis: KpiItem[] = [
    { key: 'doanhSo', label: 'Doanh số kỳ này', value: tong, icon: <RiseOutlined /> },
    { key: 'cungKy', label: 'So cùng kỳ', value: tyLe ?? 0, format: 'phanTram', icon: <PercentageOutlined /> },
    { key: 'soDoiTuong', label: 'Số đối tượng có doanh số', value: soHopDong, format: 'soLuong', icon: <FileTextOutlined /> },
    { key: 'binhQuan', label: 'Doanh số bình quân', value: soHopDong ? tong / soHopDong : 0, icon: <DollarOutlined /> },
  ];

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={isLoading} />
      <DoanhSoTheoThoiGianChart
        data={data?.theoThoiGian ?? []}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        loading={isLoading}
      />
      <DoanhSoTheoChieuChart
        data={data?.theoChieu ?? []}
        dimension={dimension}
        onDimensionChange={setDimension}
        loading={isLoading}
      />
    </div>
  );
};

export default BanHangTab;
```

- [ ] **Step 9: Chạy lint + build + test**

```bash
cd fe && npm run lint && npm run build && npm run test
```

Kỳ vọng: PASS.

- [ ] **Step 10: Commit**

```bash
git add fe/src/pages/dashboard fe/src/services/doanhSoService.ts
git commit -m "feat(dashboard): tab Bán hàng"
```

---

### Task 14: Link sang báo cáo chi tiết và kiểm tra tổng thể

**Files:**
- Modify: `fe/src/pages/dashboard/components/TienTheoTaiKhoanTable.tsx`
- Modify: `fe/src/pages/dashboard/components/XuHuongChiTieuChart.tsx`
- Modify: `fe/src/pages/dashboard/components/DoiChieuCongNoTable.tsx`
- Modify: `fe/src/pages/dashboard/components/DoanhSoTheoThoiGianChart.tsx`

- [ ] **Step 1: Thêm link "Xem chi tiết" vào bốn khối**

Với mỗi component trên, thêm import:

```tsx
import { Link } from 'react-router-dom';
```

và thêm vào prop `extra` của `<Card>` một link (nếu `extra` đã có nội dung, bọc chung trong `<Space>` đã import sẵn):

```tsx
<Link to="<đích>" className="text-xs">Xem chi tiết</Link>
```

Đích tương ứng:

| Component | Đích |
|---|---|
| `TienTheoTaiKhoanTable.tsx` | `/so-quy` |
| `XuHuongChiTieuChart.tsx` | `/bao-cao/tai-chinh` |
| `DoiChieuCongNoTable.tsx` | `/bao-cao/bang-tong-hop` |
| `DoanhSoTheoThoiGianChart.tsx` | `/bao-cao/doanh-thu` |

- [ ] **Step 2: Kiểm tra không còn tham chiếu tới component đã xoá**

```bash
grep -rn "MockTabDashboard\|ExecutionStatusCharts\|tinhHinhThucHien" fe/src
```

Kỳ vọng: không có kết quả nào.

- [ ] **Step 3: Chạy toàn bộ kiểm tra FE**

```bash
cd fe && npm run lint && npm run test && npm run build
```

Kỳ vọng: PASS cả ba. Ghi lại số test đã chạy.

- [ ] **Step 4: Chạy toàn bộ kiểm tra BE**

```bash
cd be && yarn test reporting-service && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "reporting-service|libs/dto" || echo "không có lỗi type mới"
```

Kỳ vọng: PASS.

- [ ] **Step 5: Chạy thử trên máy và xem từng tab**

```bash
cd be && yarn start:all:dev
```

Ở terminal khác:

```bash
cd fe && npm run dev
```

Mở `http://localhost:5173/`, lần lượt bấm cả 5 tab và xác nhận:
- Không có lỗi trong console trình duyệt
- Đổi kỳ ở dropdown làm số liệu đổi theo
- Thẻ "Cảnh báo" bấm được và mở modal
- Nút bánh răng chỉ hiện ở tab Tổng quan
- Bảng đối chiếu công nợ xuất được file Excel

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/dashboard
git commit -m "feat(dashboard): link từ khối báo cáo sang trang chi tiết"
```

---

## Ghi chú vận hành

Sau khi merge, deploy **BE trước FE**: tab KQKD và tab Bán hàng gọi endpoint mới.
FE đã có fallback (`ebitda?` optional, `doanhSoService` trả kết quả rỗng khi lỗi) nên
nếu lỡ deploy FE trước, hai tab đó hiện số 0 chứ không vỡ trang.
