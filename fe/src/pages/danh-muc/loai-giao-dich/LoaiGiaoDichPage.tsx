import React, { useState, useEffect } from "react";
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
  Empty,
  Tag,
  ColorPicker,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  HomeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { LoaiGiaoDich } from "@/types";
import { loaiGiaoDichService, LoaiGiaoDichStats } from "@/services/loaiGiaoDichService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";

const { Title, Text } = Typography;
const { TextArea } = Input;

// Validation schema
const loaiGiaoDichSchema = z.object({
  ma: z
    .string()
    .trim()
    .min(1, "Mã không được để trống")
    .max(50, "Mã tối đa 50 ký tự"),
  ten: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(200, "Tên tối đa 200 ký tự"),
  color: z.string().max(50, "Màu sắc tối đa 50 ký tự").optional().nullable(),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
});

const LoaiGiaoDichPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("danh-muc/loai-giao-dich");
  const [data, setData] = useState<LoaiGiaoDich[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LoaiGiaoDich | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<LoaiGiaoDichStats>({ tongLoaiGiaoDich: 0 });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText
  ) => {
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        loaiGiaoDichService.getPaginated({
          page,
          limit: pageSize,
          search: search || undefined,
        }),
        loaiGiaoDichService.getStats(),
      ]);
      setData(result.data);
      setPagination({
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
      setStats(statsData);
    } catch (error) {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (paginationConfig: {
    current?: number;
    pageSize?: number;
  }) => {
    fetchData(
      paginationConfig.current || 1,
      paginationConfig.pageSize || 50,
      searchText
    );
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: LoaiGiaoDich) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Convert color object to string if needed
      if (values.color && typeof values.color === 'object') {
        values.color = values.color.toHexString?.() || values.color;
      }

      // Validate with zod
      const validated = loaiGiaoDichSchema.parse(values);

      // Check if ma already exists
      const maExists = await loaiGiaoDichService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã loại giao dịch đã tồn tại");
        return;
      }

      if (editingRecord) {
        await loaiGiaoDichService.update(editingRecord.id, validated);
        message.success("Cập nhật loại giao dịch thành công");
      } else {
        await loaiGiaoDichService.create(validated as Omit<LoaiGiaoDich, "id">);
        message.success("Thêm loại giao dịch thành công");
      }

      setModalVisible(false);
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => message.error(err.message));
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await loaiGiaoDichService.remove(id);
      message.success("Xóa loại giao dịch thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      message.error("Không thể xóa loại giao dịch");
    }
  };

  const getColorTag = (color?: string) => {
    if (!color) return <Text type="secondary">-</Text>;
    return (
      <Tag color={color} style={{ minWidth: 80, textAlign: 'center' }}>
        {color}
      </Tag>
    );
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 150,
      sorter: (a: LoaiGiaoDich, b: LoaiGiaoDich) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên loại giao dịch",
      dataIndex: "ten",
      key: "ten",
      sorter: (a: LoaiGiaoDich, b: LoaiGiaoDich) => a.ten.localeCompare(b.ten),
      render: (text: string) => (
        <Space>
          <SwapOutlined className="text-muted-foreground" />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Màu sắc",
      dataIndex: "color",
      key: "color",
      width: 120,
      render: (color: string) => getColorTag(color),
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text type="secondary">{text || "-"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: LoaiGiaoDich) => (
        <Space size="small">
          {canEdit && (<Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              className="text-primary"
            />
          </Tooltip>)}
          {canDelete && (<Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa loại giao dịch này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>)}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Danh mục" },
          { title: "Loại giao dịch" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={3} className="!mb-1 flex items-center gap-2">
            <SwapOutlined className="text-primary" />
            Quản lý loại giao dịch
          </Title>
          <Text type="secondary">
            Quản lý danh sách các loại giao dịch: Phiếu thu, Phiếu chi, Báo có, Báo nợ...
          </Text>
        </div>
        <Space>
          {canExport && <Button icon={<ExportOutlined />}>Xuất Excel</Button>}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchData(1, pagination.pageSize, "")}
          >
            Làm mới
          </Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm loại giao dịch
          </Button>
          )}
        </Space>
      </div>

      {/* Stats Card */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng số loại giao dịch"
              value={pagination.total}
              prefix={<SwapOutlined className="text-primary" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div className="mb-4">
          <Input
            placeholder="Tìm kiếm theo mã hoặc tên loại giao dịch..."
            prefix={<SearchOutlined className="text-muted-foreground" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => fetchData(1, pagination.pageSize, searchText)}
            allowClear
            style={{ maxWidth: 400 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{
            y: "calc(100vh - 285px)",
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} loại giao dịch`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có loại giao dịch nào"
              />
            ),
          }}
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa loại giao dịch" : "Thêm loại giao dịch mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-2" size="small">
          <Form.Item
            name="ma"
            label="Mã loại giao dịch"
            rules={[
              { required: true, message: "Vui lòng nhập mã loại giao dịch" },
              { max: 50, message: "Mã tối đa 50 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="VD: PHIEU_THU, PHIEU_CHI, BAO_CO, BAO_NO" />
          </Form.Item>

          <Form.Item
            name="ten"
            label="Tên loại giao dịch"
            rules={[
              { required: true, message: "Vui lòng nhập tên loại giao dịch" },
              { max: 200, message: "Tên tối đa 200 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="VD: Phiếu thu, Phiếu chi, Báo có ngân hàng..." />
          </Form.Item>

          <Form.Item
            name="color"
            label="Màu sắc"
            rules={[{ max: 50, message: "Màu sắc tối đa 50 ký tự" }]}
            className="mb-3"
          >
            <Input placeholder="VD: green, red, blue, orange, #1890ff" />
          </Form.Item>

          <Form.Item
            name="moTa"
            label="Mô tả"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
            className="mb-0"
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập mô tả cho loại giao dịch..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoaiGiaoDichPage;
