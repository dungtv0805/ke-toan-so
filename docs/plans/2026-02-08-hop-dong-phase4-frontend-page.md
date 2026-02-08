# Phase 4: Frontend - Page & Components

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tạo HopDong Page với form đầy đủ các trường

---

## Task 1: Tạo Page State

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/HopDongPage.state.ts`

**Step 1: Tạo file state**

```typescript
import { HopDongStates } from "./handler/hop-dong.handler";

declare module "./handler/hop-dong.handler" {
  interface HopDongStates {
    modalVisible: boolean;
    editingRecord: any | null;
  }
}
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/HopDongPage.state.ts
git commit -m "feat(fe): add HopDongPage state types"
```

---

## Task 2: Tạo HopDong Page (Part 1 - Imports & Constants)

**Files:**
- Create: `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx`

**Step 1: Tạo file page với imports và constants**

```typescript
import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Row,
  Col,
  Breadcrumb,
  Statistic,
  Select,
  DatePicker,
  InputNumber,
  Tabs,
  Divider,
  Tag,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  HomeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  FileDoneOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { HopDong, DoiTuong, TrangThaiHopDong } from "@/types";
import {
  HopDongHandlerProvider,
  useHopDongHandler,
  useHopDongState,
} from "./HopDongHandlerContext";
import "./HopDongPage.state";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TRANG_THAI_OPTIONS = [
  { value: TrangThaiHopDong.CHUA_CO_HD, label: "Chưa có HĐ", color: "default" },
  { value: TrangThaiHopDong.HD_CHUA_KY, label: "HĐ chưa ký", color: "warning" },
  { value: TrangThaiHopDong.HD_PHOTO_SCAN, label: "HĐ photo/scan", color: "processing" },
  { value: TrangThaiHopDong.HD_GOC, label: "HĐ gốc", color: "success" },
];

const formatCurrency = (value?: number) => {
  if (!value) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return dayjs(value).format("DD/MM/YYYY");
};
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx
git commit -m "feat(fe): add HopDongPage imports and constants"
```

---

## Task 3: Tạo HopDong Page (Part 2 - Inner Component)

**Files:**
- Modify: `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx`

**Step 1: Thêm HopDongPageInner component**

Append sau constants:

```typescript
function HopDongPageInner() {
  const handler = useHopDongHandler();
  const [data] = useHopDongState("data", []);
  const [loading] = useHopDongState("loading", false);
  const [pagination] = useHopDongState("pagination", {
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [stats] = useHopDongState("stats", { total: 0, byTrangThai: {} });
  const [doiTuongList] = useHopDongState("doiTuongList", []);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HopDong | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    handler.executeEvent("search", { keyword: value });
  };

  const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
    handler.executeEvent("changePage", {
      page: pag.current || 1,
      pageSize: pag.pageSize || 50,
    });
  };

  const openModal = (record?: HopDong) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue({
        ...record,
        ngayKy: record.ngayKy ? dayjs(record.ngayKy) : undefined,
        phuLuc1: record.phuLuc1
          ? {
              ...record.phuLuc1,
              ngayKy: record.phuLuc1.ngayKy ? dayjs(record.phuLuc1.ngayKy) : undefined,
            }
          : undefined,
        phuLuc2: record.phuLuc2
          ? {
              ...record.phuLuc2,
              ngayKy: record.phuLuc2.ngayKy ? dayjs(record.phuLuc2.ngayKy) : undefined,
            }
          : undefined,
        tienDoThiCong: record.tienDoThiCong
          ? {
              ...record.tienDoThiCong,
              tuNgay: record.tienDoThiCong.tuNgay
                ? dayjs(record.tienDoThiCong.tuNgay)
                : undefined,
              denNgay: record.tienDoThiCong.denNgay
                ? dayjs(record.tienDoThiCong.denNgay)
                : undefined,
            }
          : undefined,
      });
    } else {
      setEditingRecord(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // Transform dates
      const payload = {
        ...values,
        ngayKy: values.ngayKy?.format("YYYY-MM-DD"),
        phuLuc1: values.phuLuc1
          ? {
              ...values.phuLuc1,
              ngayKy: values.phuLuc1.ngayKy?.format("YYYY-MM-DD"),
            }
          : undefined,
        phuLuc2: values.phuLuc2
          ? {
              ...values.phuLuc2,
              ngayKy: values.phuLuc2.ngayKy?.format("YYYY-MM-DD"),
            }
          : undefined,
        tienDoThiCong: values.tienDoThiCong
          ? {
              ...values.tienDoThiCong,
              tuNgay: values.tienDoThiCong.tuNgay?.format("YYYY-MM-DD"),
              denNgay: values.tienDoThiCong.denNgay?.format("YYYY-MM-DD"),
            }
          : undefined,
      };

      if (editingRecord) {
        await handler.executeEvent("update", {
          id: editingRecord.id,
          data: payload,
        });
        message.success("Cập nhật thành công");
      } else {
        await handler.executeEvent("create", { data: payload });
        message.success("Thêm mới thành công");
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await handler.executeEvent("remove", { id });
      message.success("Xóa thành công");
    } catch (error: any) {
      message.error(error.message || "Không thể xóa");
    }
  };
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx
git commit -m "feat(fe): add HopDongPageInner component logic"
```

---

## Task 4: Tạo HopDong Page (Part 3 - Table Columns)

**Files:**
- Modify: `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx`

**Step 1: Thêm columns definition**

Append trong HopDongPageInner, sau handleDelete:

```typescript
  const columns = [
    {
      title: "Số HĐ",
      dataIndex: "soHopDong",
      key: "soHopDong",
      width: 120,
      fixed: "left" as const,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Tên công trình",
      dataIndex: "tenCongTrinh",
      key: "tenCongTrinh",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Giá trị sau thuế",
      dataIndex: "giaTriSauThue",
      key: "giaTriSauThue",
      width: 150,
      align: "right" as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Ngày ký",
      dataIndex: "ngayKy",
      key: "ngayKy",
      width: 100,
      render: (value: string) => formatDate(value),
    },
    {
      title: "Chủ đầu tư",
      key: "chuDauTu",
      width: 150,
      ellipsis: true,
      render: (_: any, record: HopDong) => {
        const doiTuong = doiTuongList.find(
          (d: DoiTuong) => d.id === record.doiTuongId
        );
        return doiTuong ? `${doiTuong.ma} - ${doiTuong.ten}` : "-";
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 120,
      render: (value: TrangThaiHopDong) => {
        const option = TRANG_THAI_OPTIONS.find((o) => o.value === value);
        return option ? (
          <Tag color={option.color}>{option.label}</Tag>
        ) : (
          <Tag>Chưa xác định</Tag>
        );
      },
    },
    {
      title: "Số lượng lưu",
      dataIndex: "soLuongLuu",
      key: "soLuongLuu",
      width: 100,
      align: "center" as const,
      render: (value: number) => value || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      fixed: "right" as const,
      align: "center" as const,
      render: (_: any, record: HopDong) => (
        <Space size="small">
          <Tooltip title="Sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx
git commit -m "feat(fe): add HopDongPage table columns"
```

---

## Task 5: Tạo HopDong Page (Part 4 - JSX Return)

**Files:**
- Modify: `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx`

**Step 1: Thêm JSX return**

Append trong HopDongPageInner, sau columns:

```typescript
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          {
            href: "/",
            title: (
              <>
                <HomeOutlined /> Trang chủ
              </>
            ),
          },
          { title: "Danh mục" },
          { title: "Hợp đồng" },
        ]}
      />

      <Row gutter={16}>
        <Col xs={24} sm={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="Tổng số"
              value={stats.total}
              prefix={<FileTextOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="HĐ gốc"
              value={stats.byTrangThai?.HD_GOC || 0}
              prefix={<FileDoneOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="HĐ photo/scan"
              value={stats.byTrangThai?.HD_PHOTO_SCAN || 0}
              prefix={<FileSearchOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="Chưa có HĐ"
              value={stats.byTrangThai?.CHUA_CO_HD || 0}
              prefix={<ClockCircleOutlined className="text-orange-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <div className="mb-4">
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} md={12}>
              <Space wrap>
                <Input
                  placeholder="Tìm kiếm theo số HĐ, tên công trình..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onPressEnter={() => handleSearch(searchText)}
                  style={{ width: 300 }}
                  allowClear
                />
                <Tooltip title="Làm mới">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setSearchText("");
                      handler.executeEvent("refresh", {});
                    }}
                  />
                </Tooltip>
              </Space>
            </Col>
            <Col xs={24} md={12} className="text-right">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openModal()}
              >
                Thêm mới
              </Button>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} bản ghi`,
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
          scroll={{ x: 1200, y: "calc(100vh - 400px)" }}
          size="middle"
        />
      </Card>
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx
git commit -m "feat(fe): add HopDongPage main JSX structure"
```

---

## Task 6: Tạo HopDong Page (Part 5 - Modal Form)

**Files:**
- Modify: `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx`

**Step 1: Thêm Modal Form**

Append trong return, sau Card:

```typescript
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileTextOutlined className="text-primary" />
            <span>
              {editingRecord ? "Sửa hợp đồng" : "Thêm hợp đồng mới"}
            </span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={900}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" className="mt-4" size="small">
          <Tabs defaultActiveKey="1">
            <TabPane tab="Thông tin chính" key="1">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="soHopDong"
                    label="Số hợp đồng"
                    rules={[{ required: true, message: "Vui lòng nhập số HĐ" }]}
                  >
                    <Input placeholder="VD: HD001" />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    name="tenCongTrinh"
                    label="Tên công trình"
                    rules={[{ required: true, message: "Vui lòng nhập tên" }]}
                  >
                    <Input placeholder="Tên công trình" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="giaTriSauThue" label="Giá trị sau thuế">
                    <InputNumber
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                      placeholder="0"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="ngayKy" label="Ngày ký">
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="trangThai" label="Trạng thái">
                    <Select
                      placeholder="Chọn trạng thái"
                      options={TRANG_THAI_OPTIONS}
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="soLuongLuu" label="Số lượng lưu">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      placeholder="0"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Phụ lục" key="2">
              <Divider orientation="left">Phụ lục 1</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={["phuLuc1", "giaTri"]} label="Giá trị">
                    <InputNumber
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                      placeholder="0"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={["phuLuc1", "ngayKy"]} label="Ngày ký">
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider orientation="left">Phụ lục 2</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={["phuLuc2", "giaTri"]} label="Giá trị">
                    <InputNumber
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                      placeholder="0"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={["phuLuc2", "ngayKy"]} label="Ngày ký">
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Chủ đầu tư" key="3">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="doiTuongId" label="Tên đơn vị (Khách hàng)">
                    <Select
                      showSearch
                      allowClear
                      placeholder="Chọn khách hàng"
                      optionFilterProp="label"
                      options={doiTuongList.map((d: DoiTuong) => ({
                        value: d.id,
                        label: `${d.ma} - ${d.ten}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="nguoiKy" label="Người ký">
                    <Input placeholder="Người ký hợp đồng" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="chucVu" label="Chức vụ">
                    <Input placeholder="Chức vụ" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="nguoiGiaoDich" label="Người giao dịch">
                    <Input placeholder="Người giao dịch" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Thanh toán & Bảo hành" key="4">
              <Divider orientation="left">Điều khoản thanh toán</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={["dieuKhoanThanhToan", "tamUng"]}
                    label="Tạm ứng"
                  >
                    <Input placeholder="VD: 30%" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={["dieuKhoanThanhToan", "thanhToanGiaiDoan"]}
                    label="Thanh toán giai đoạn"
                  >
                    <Input placeholder="VD: 50%" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={["dieuKhoanThanhToan", "quyetToan"]}
                    label="Quyết toán"
                  >
                    <Input placeholder="VD: 20%" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider orientation="left">Bảo hành</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name={["baoHanh", "giaTri"]} label="Giá trị">
                    <InputNumber
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                      placeholder="0"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={["baoHanh", "thoiGian"]} label="Thời gian">
                    <Input placeholder="VD: 12 tháng" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={["baoHanh", "hinhThuc"]} label="Hình thức">
                    <Input placeholder="VD: Bảo lãnh ngân hàng" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Tiến độ" key="5">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={["tienDoThiCong", "soNgay"]}
                    label="Số ngày"
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      placeholder="0"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={["tienDoThiCong", "tuNgay"]}
                    label="Từ ngày"
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={["tienDoThiCong", "denNgay"]}
                    label="Đến ngày"
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx
git commit -m "feat(fe): add HopDongPage modal form with tabs"
```

---

## Task 7: Tạo HopDong Page (Part 6 - Export)

**Files:**
- Modify: `fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx`

**Step 1: Thêm export default**

Append cuối file:

```typescript
export default function HopDongPage() {
  return (
    <HopDongHandlerProvider>
      <HopDongPageInner />
    </HopDongHandlerProvider>
  );
}
```

**Step 2: Commit**

```bash
git add fe/src/pages/danh-muc/hop-dong/HopDongPage.tsx
git commit -m "feat(fe): complete HopDongPage component"
```

---

## Phase 4 Complete Checklist

- [ ] HopDongPage.state.ts created
- [ ] HopDongPage.tsx with imports and constants
- [ ] HopDongPageInner component with state and handlers
- [ ] Table columns definition
- [ ] Main JSX with stats cards and table
- [ ] Modal form with 5 tabs (Thông tin chính, Phụ lục, Chủ đầu tư, Thanh toán & Bảo hành, Tiến độ)
- [ ] Export default component
