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
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  TeamOutlined,
  HomeOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { BoPhan } from "@/types";
import { boPhanService, BoPhanStats } from "@/services/boPhanService";
import { z } from "zod";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Validation schema
const boPhanSchema = z.object({
  ma: z
    .string()
    .trim()
    .min(1, "Mã không được để trống")
    .max(20, "Mã tối đa 20 ký tự"),
  ten: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(200, "Tên tối đa 200 ký tự"),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional(),
});

const BoPhanPage: React.FC = () => {
  const [data, setData] = useState<BoPhan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BoPhan | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<BoPhanStats>({ tongBoPhan: 0 });
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
        boPhanService.getPaginated({
          page,
          limit: pageSize,
          search: search || undefined,
        }),
        boPhanService.getStats(),
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

  const handleEdit = (record: BoPhan) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate with zod
      const validated = boPhanSchema.parse(values);

      // Check if ma already exists
      const maExists = await boPhanService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã bộ phận đã tồn tại");
        return;
      }

      if (editingRecord) {
        await boPhanService.update(editingRecord.id, validated);
        message.success("Cập nhật bộ phận thành công");
      } else {
        await boPhanService.create(validated as Omit<BoPhan, "id">);
        message.success("Thêm bộ phận thành công");
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
      await boPhanService.remove(id);
      message.success("Xóa bộ phận thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      message.error("Không thể xóa bộ phận");
    }
  };

  const columns = [
    {
      title: "Mã BP",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      sorter: (a: BoPhan, b: BoPhan) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên bộ phận",
      dataIndex: "ten",
      key: "ten",
      sorter: (a: BoPhan, b: BoPhan) => a.ten.localeCompare(b.ten),
      render: (text: string) => (
        <Space>
          <ApartmentOutlined className="text-muted-foreground" />
          <Text strong>{text}</Text>
        </Space>
      ),
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
      render: (_: unknown, record: BoPhan) => (
        <Space size="small">
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              className="text-primary"
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa bộ phận này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
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
          { title: "Bộ phận" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={3} className="!mb-1 flex items-center gap-2">
            <TeamOutlined className="text-primary" />
            Quản lý bộ phận
          </Title>
          <Text type="secondary">
            Quản lý danh sách các phòng ban, bộ phận trong công ty
          </Text>
        </div>
        <Space>
          <Button icon={<ExportOutlined />}>Xuất Excel</Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchData(1, pagination.pageSize, "")}
          >
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm bộ phận
          </Button>
        </Space>
      </div>

      {/* Stats Card */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng số bộ phận"
              value={pagination.total}
              prefix={<TeamOutlined className="text-primary" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div className="mb-4">
          <Input
            placeholder="Tìm kiếm theo mã hoặc tên bộ phận..."
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
              `${range[0]}-${range[1]} của ${total} bộ phận`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có bộ phận nào"
              />
            ),
          }}
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa bộ phận" : "Thêm bộ phận mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={450}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-2" size="small">
          <Form.Item
            name="ma"
            label="Mã bộ phận"
            rules={[
              { required: true, message: "Vui lòng nhập mã bộ phận" },
              { max: 20, message: "Mã tối đa 20 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="VD: BP001" />
          </Form.Item>

          <Form.Item
            name="ten"
            label="Tên bộ phận"
            rules={[
              { required: true, message: "Vui lòng nhập tên bộ phận" },
              { max: 200, message: "Tên tối đa 200 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="Nhập tên bộ phận" />
          </Form.Item>

          <Form.Item
            name="moTa"
            label="Mô tả"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
            className="mb-0"
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập mô tả chức năng, nhiệm vụ của bộ phận..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BoPhanPage;
