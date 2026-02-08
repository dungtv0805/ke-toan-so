# Phase 6: Integration - Nhật ký chung Form

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tích hợp HopDong vào form tạo mới dữ liệu tổng hợp (Nhật ký chung)

---

## Task 1: Thêm HopDong vào Init State

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/init/init.state.ts`

**Step 1: Thêm hopDongList state**

Tìm interface declaration và thêm:

```typescript
import { HopDong } from "@/types";

// Trong declare module, thêm vào NhatKyChungStates:
hopDongList: HopDong[];
```

**Step 2: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/init/init.state.ts
git commit -m "feat(fe): add hopDongList to NhatKyChung state"
```

---

## Task 2: Fetch HopDong trong Master Data Handler

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data/master-data.handler.ts`

**Step 1: Thêm API call để fetch hopDongList**

Tìm hàm fetch master data và thêm:

```typescript
// Thêm vào Promise.all:
api.get("/master-data/hop-dong/all"),

// Sau khi nhận response, thêm:
handler.setState(
  "hopDongList",
  (hopDongRes.data.data || []).map((item: any) => ({
    ...item,
    id: item._id || item.id,
  }))
);
```

**Step 2: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data/master-data.handler.ts
git commit -m "feat(fe): fetch hopDongList in NhatKyChung master data"
```

---

## Task 3: Thêm HopDong Select vào AllocationFields

**Files:**
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/components/entry-form-modal/AllocationFields.tsx`

**Step 1: Import HopDong type**

Thêm vào imports:

```typescript
import { HopDong } from "@/types";
```

**Step 2: Thêm state và handler**

Trong component, thêm:

```typescript
const [hopDongList] = useNhatKyChungState("hopDongList", []);

const handleHopDongChange = (value: string | undefined) => {
  handler.executeEvent("clearFieldChange", { field: "hopDong" });
  if (!value) {
    form.setFieldsValue({ hopDongSnapshot: undefined });
    return;
  }
  const hopDong = hopDongList?.find((hd: HopDong) => hd.id === value);
  if (hopDong) {
    form.setFieldsValue({
      hopDongSnapshot: {
        ma: hopDong.soHopDong,
        ten: hopDong.tenCongTrinh,
        soHopDong: hopDong.soHopDong,
        tenCongTrinh: hopDong.tenCongTrinh,
      },
    });
  }
};
```

**Step 3: Thêm Form.Item cho HopDong**

Tìm vị trí phù hợp trong form (sau Nhóm quản lý) và thêm:

```typescript
<Col span={8}>
  <Form.Item
    name="hopDongId"
    label={renderLabel("Hợp đồng", "hopDong")}
    className={`mb-0 ${getFieldClassName(masterDataChanges, "hopDong")}`}
  >
    <Select
      showSearch
      allowClear
      placeholder="Chọn hợp đồng"
      optionFilterProp="label"
      onChange={handleHopDongChange}
      options={hopDongList?.map((hd: HopDong) => ({
        value: hd.id,
        label: `${hd.soHopDong} - ${hd.tenCongTrinh}`,
      }))}
    />
  </Form.Item>
</Col>
```

**Step 4: Thêm hidden field cho snapshot**

```typescript
<Form.Item name="hopDongSnapshot" hidden>
  <Input />
</Form.Item>
```

**Step 5: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/entry-form-modal/AllocationFields.tsx
git commit -m "feat(fe): add HopDong select to AllocationFields"
```

---

## Task 4: Thêm HopDong vào Types (DanhMuc interface)

**Files:**
- Verify: `fe/src/types/index.ts`

**Step 1: Verify DanhMucHopDong đã được thêm**

Đảm bảo interface `DanhMuc` đã có:

```typescript
hopDong?: DanhMucHopDong;
```

(Đã thêm trong Phase 3, Task 1)

**Step 2: Commit nếu cần**

```bash
git add fe/src/types/index.ts
git commit -m "feat(fe): verify DanhMucHopDong in types"
```

---

## Task 5: Thêm Snapshot Builder (Optional)

**Files:**
- Modify: `fe/src/utils/snapshotBuilder.ts` (nếu tồn tại)

**Step 1: Thêm buildHopDongSnapshot function**

```typescript
export function buildHopDongSnapshot(hopDong: HopDong): DanhMucHopDong {
  return {
    ma: hopDong.soHopDong,
    ten: hopDong.tenCongTrinh,
    soHopDong: hopDong.soHopDong,
    tenCongTrinh: hopDong.tenCongTrinh,
  };
}
```

**Step 2: Commit**

```bash
git add fe/src/utils/snapshotBuilder.ts
git commit -m "feat(fe): add buildHopDongSnapshot utility"
```

---

## Task 6: Thêm HopDong Tab vào DataTabs (Optional - Tổng hợp theo Hợp đồng)

**Files:**
- Create: `fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/HopDongTab.tsx`

**Step 1: Tạo HopDongTab component**

```typescript
import { Table, Tag, Space, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

interface HopDongSummary {
  hopDong: string;
  soButToan: number;
  tongThu: number;
  tongChi: number;
}

export function HopDongTab() {
  const [summaryByHopDong] = useNhatKyChungState("summaryByHopDong", []);
  const [loading] = useNhatKyChungState("loading", false);

  const columns = [
    {
      title: "Hợp đồng",
      dataIndex: "hopDong",
      key: "hopDong",
      width: 250,
      render: (text: string) => (
        <Space>
          <FileTextOutlined className="text-blue-500" />
          <Text strong>{text || "Chưa phân bổ"}</Text>
        </Space>
      ),
    },
    {
      title: "Số bút toán",
      dataIndex: "soButToan",
      key: "soButToan",
      width: 120,
      align: "center" as const,
      render: (value: number) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Tổng thu",
      dataIndex: "tongThu",
      key: "tongThu",
      align: "right" as const,
      render: (value: number) => (
        <Text strong className="text-green-600">
          {value > 0 ? formatCurrency(value) : "-"}
        </Text>
      ),
    },
    {
      title: "Tổng chi",
      dataIndex: "tongChi",
      key: "tongChi",
      align: "right" as const,
      render: (value: number) => (
        <Text strong className="text-red-600">
          {value > 0 ? formatCurrency(value) : "-"}
        </Text>
      ),
    },
    {
      title: "Lãi/Lỗ",
      key: "laiLo",
      align: "right" as const,
      render: (_: unknown, record: HopDongSummary) => {
        const diff = record.tongThu - record.tongChi;
        return (
          <Text
            strong
            className={diff >= 0 ? "text-green-600" : "text-red-600"}
          >
            {formatCurrency(Math.abs(diff))} {diff >= 0 ? "(Lãi)" : "(Lỗ)"}
          </Text>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4">
        <Text type="secondary">Tổng hợp thu chi theo từng hợp đồng</Text>
      </div>
      <Table<HopDongSummary>
        columns={columns}
        dataSource={summaryByHopDong || []}
        rowKey="hopDong"
        loading={loading}
        pagination={false}
        size="middle"
      />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add fe/src/pages/chung-tu/nhat-ky-chung/components/data-tabs/HopDongTab.tsx
git commit -m "feat(fe): add HopDongTab for summary by contract"
```

---

## Phase 6 Complete Checklist

- [ ] hopDongList added to NhatKyChung state
- [ ] HopDong fetched in master data handler
- [ ] HopDong Select added to AllocationFields
- [ ] DanhMucHopDong verified in types
- [ ] buildHopDongSnapshot utility added (optional)
- [ ] HopDongTab created for summary view (optional)

---

## Final Verification

After completing all phases, verify:

1. **Backend:**
   ```bash
   cd be && yarn start:master-data:dev
   # Test endpoints:
   # GET /master-data/hop-dong
   # POST /master-data/hop-dong
   # GET /master-data/hop-dong/:id
   # PUT /master-data/hop-dong/:id
   # DELETE /master-data/hop-dong/:id
   ```

2. **Frontend:**
   ```bash
   cd fe && npm run dev
   # Navigate to /danh-muc/hop-dong
   # Test CRUD operations
   # Navigate to /chung-tu/nhat-ky-chung/tao-moi
   # Verify HopDong select in Phân bổ section
   ```
