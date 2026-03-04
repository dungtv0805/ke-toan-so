import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Row,
  Col,
  Breadcrumb,
  Statistic,
  InputNumber,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  HomeOutlined,
  ShoppingOutlined,
  DollarOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { SanPham } from "@/types";
import { sanPhamService, SanPhamStats } from "@/services/sanPhamService";
import { donViOptions } from "@/mock-data/san-pham";
import { z } from "zod";

const { Title, Text } = Typography;
const { TextArea } = Input;

// Validation schema
const sanPhamSchema = z.object({
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
  donVi: z.string().optional().nullable(),
  giaBan: z.number().min(0, "Giá bán không được âm").optional().nullable(),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
});

const SanPhamPage: React.FC = () => {
  const [data, setData] = useState<SanPham[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SanPham | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<SanPhamStats>({
    tongSanPham: 0,
    coGiaBan: 0,
    chuaCoGia: 0,
  });
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
        sanPhamService.getPaginated({
          page,
          limit: pageSize,
          search: search || undefined,
        }),
        sanPhamService.getStats(),
      ]);

      // Nếu trang hiện tại lớn hơn tổng số trang và có dữ liệu, chuyển về trang cuối
      if (result.data.length === 0 && page > 1 && result.meta.totalPages >= 1) {
        const newPage = Math.max(1, result.meta.totalPages);
        const newResult = await sanPhamService.getPaginated({
          page: newPage,
          limit: pageSize,
          search: search || undefined,
        });
        setData(newResult.data);
        setPagination({
          current: newResult.meta.page,
          pageSize: newResult.meta.limit,
          total: newResult.meta.total,
        });
      } else {
        setData(result.data);
        setPagination({
          current: result.meta.page,
          pageSize: result.meta.limit,
          total: result.meta.total,
        });
      }
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1, pagination.pageSize, searchText);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

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

  const handleSearch = async (value: string) => {
    setSearchText(value);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: SanPham) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate with zod
      const validated = sanPhamSchema.parse(values);

      // Check if ma already exists
      const maExists = await sanPhamService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã sản phẩm đã tồn tại");
        return;
      }

      if (editingRecord) {
        await sanPhamService.update(editingRecord.id, validated);
        message.success("Cập nhật sản phẩm thành công");
      } else {
        await sanPhamService.create(validated as Omit<SanPham, "id">);
        message.success("Thêm sản phẩm thành công");
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
      await sanPhamService.remove(id);
      message.success("Xóa sản phẩm thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      message.error("Không thể xóa sản phẩm");
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const columns = [
    {
      title: "Mã SP",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      sorter: (a: SanPham, b: SanPham) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: SanPham, b: SanPham) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Đơn vị",
      dataIndex: "donVi",
      key: "donVi",
      width: 100,
      render: (text: string) => text || "-",
    },
    {
      title: "Giá bán",
      dataIndex: "giaBan",
      key: "giaBan",
      width: 150,
      align: "right" as const,
      sorter: (a: SanPham, b: SanPham) => (a.giaBan || 0) - (b.giaBan || 0),
      render: (value: number) => (
        <Text
          className={
            value ? "text-green-600 font-medium" : "text-muted-foreground"
          }
        >
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      width: 250,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text type="secondary" className="text-sm">
            {text || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: SanPham) => (
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
            description="Bạn có chắc chắn muốn xóa sản phẩm này?"
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
          { title: "Sản phẩm" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={3} className="!mb-1 flex items-center gap-2">
            <AppstoreOutlined className="text-primary" />
            Quản lý sản phẩm
          </Title>
          <Text type="secondary">
            Quản lý danh sách sản phẩm, dịch vụ và vật tư
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
            Thêm sản phẩm
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng sản phẩm"
              value={pagination.total}
              prefix={<ShoppingOutlined className="text-primary" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div className="mb-4">
          <Input
            placeholder="Tìm kiếm theo mã hoặc tên sản phẩm..."
            prefix={<SearchOutlined className="text-muted-foreground" />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} sản phẩm`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="ma"
                label="Mã sản phẩm"
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã sản phẩm" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: SP001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label="Tên sản phẩm"
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên sản phẩm" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên sản phẩm" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="donVi" label="Đơn vị tính" className="mb-3">
                <Select
                  placeholder="Chọn đơn vị"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={donViOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="giaBan"
                label="Giá bán (VNĐ)"
                className="mb-3"
                rules={[
                  { type: "number", min: 0, message: "Giá bán không được âm" },
                ]}
              >
                <InputNumber<number>
                  style={{ width: "100%" }}
                  placeholder="Nhập giá bán"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => {
                    const parsed = value?.replace(/\$\s?|(,*)/g, "");
                    return (parsed ? Number(parsed) : 0) as number;
                  }}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="moTa"
            label="Mô tả"
            className="mb-0"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập mô tả sản phẩm..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SanPhamPage;
