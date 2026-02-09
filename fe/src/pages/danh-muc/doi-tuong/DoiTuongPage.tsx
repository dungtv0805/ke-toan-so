import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
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
  Tabs,
  Statistic,
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
  UserOutlined,
  ShopOutlined,
  ToolOutlined,
  PhoneOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { DoiTuong } from "@/types";
import { doiTuongService } from "@/services/doiTuongService";
import { loaiDoiTuong } from "@/mock-data/doi-tuong";
import { z } from "zod";

const { Title, Text } = Typography;

// Validation schema
const doiTuongSchema = z.object({
  loai: z.enum(["KHACH_HANG", "NHA_CUNG_CAP", "NHAN_VIEN", "NHA_THAU"]),
  ma: z.string().min(1, "Mã không được để trống").max(20, "Mã tối đa 20 ký tự"),
  ten: z
    .string()
    .min(1, "Tên không được để trống")
    .max(200, "Tên tối đa 200 ký tự"),
  diaChi: z.string().max(500, "Địa chỉ tối đa 500 ký tự").optional().nullable(),
  soDienThoai: z.string().max(20, "SĐT tối đa 20 ký tự").optional().nullable(),
  email: z
    .string()
    .email("Email không hợp lệ")
    .max(100, "Email tối đa 100 ký tự")
    .optional()
    .or(z.literal("")),
  maSoThue: z.string().min(1, "MST không được để trống").max(20, "MST tối đa 20 ký tự"),
  nguoiLienHe: z
    .string()
    .max(100, "Tên người liên hệ tối đa 100 ký tự")
    .optional(),
});

const DoiTuongPage: React.FC = () => {
  const [data, setData] = useState<DoiTuong[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DoiTuong | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    khachHang: 0,
    nhaCungCap: 0,
    nhanVien: 0,
    nhaThau: 0,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const fetchStats = async () => {
    try {
      const statsData = await doiTuongService.getStats();
      setStats({
        khachHang: statsData.khachHang,
        nhaCungCap: statsData.nhaCungCap,
        nhanVien: statsData.nhanVien,
        nhaThau: statsData.nhaThau,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText,
    loai?: DoiTuong["loai"]
  ) => {
    setLoading(true);
    try {
      const result = await doiTuongService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
        loai,
      });
      setData(result.data);
      setPagination({
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
      await fetchStats();
    } catch (error) {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(
      1,
      pagination.pageSize,
      "",
      activeTab === "all" ? undefined : (activeTab as DoiTuong["loai"])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchText("");
    fetchData(
      1,
      pagination.pageSize,
      "",
      key === "all" ? undefined : (key as DoiTuong["loai"])
    );
  };

  const handleSearch = async (value: string) => {
    setSearchText(value);
    // Debounce search - use pagination API
    fetchData(
      1,
      pagination.pageSize,
      value,
      activeTab === "all" ? undefined : (activeTab as DoiTuong["loai"])
    );
  };

  const handleTableChange = (paginationConfig: {
    current?: number;
    pageSize?: number;
  }) => {
    fetchData(
      paginationConfig.current || 1,
      paginationConfig.pageSize || 10,
      searchText,
      activeTab === "all" ? undefined : (activeTab as DoiTuong["loai"])
    );
  };

  const openModal = (record?: DoiTuong) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(record);
    } else {
      setEditingRecord(null);
      form.resetFields();
      if (activeTab !== "all") {
        form.setFieldsValue({ loai: activeTab });
      } else {
        form.setFieldsValue({ loai: "KHACH_HANG" });
      }
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Clean empty strings
      Object.keys(values).forEach((key) => {
        if (values[key] === "") values[key] = undefined;
      });

      const validation = doiTuongSchema.safeParse(values);
      if (!validation.success) {
        message.error(validation.error.errors[0].message);
        return;
      }

      setLoading(true);
      if (editingRecord) {
        await doiTuongService.update(editingRecord.id, values);
        message.success("Cập nhật thành công");
      } else {
        await doiTuongService.create(values);
        message.success("Thêm mới thành công");
      }
      setModalVisible(false);
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all" ? undefined : (activeTab as DoiTuong["loai"])
      );
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await doiTuongService.remove(id);
      message.success("Xóa thành công");
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all" ? undefined : (activeTab as DoiTuong["loai"])
      );
    } catch (error: any) {
      message.error(error.message || "Không thể xóa");
    } finally {
      setLoading(false);
    }
  };

  const getLoaiInfo = (loai: string) => {
    return (
      loaiDoiTuong.find((l) => l.value === loai) || {
        label: loai,
        color: "default",
      }
    );
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      sorter: (a: DoiTuong, b: DoiTuong) => a.ma.localeCompare(b.ma),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Tên đối tượng",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: DoiTuong, b: DoiTuong) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Loại",
      dataIndex: "loai",
      key: "loai",
      width: 140,
      render: (loai: string) => {
        const info = getLoaiInfo(loai);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "Liên hệ",
      key: "contact",
      width: 200,
      render: (_: any, record: DoiTuong) => (
        <Space direction="vertical" size={0}>
          {record.soDienThoai && (
            <Text type="secondary" className="text-xs">
              <PhoneOutlined className="mr-1" />
              {record.soDienThoai}
            </Text>
          )}
          {record.email && (
            <Text type="secondary" className="text-xs">
              <MailOutlined className="mr-1" />
              {record.email}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Địa chỉ",
      dataIndex: "diaChi",
      key: "diaChi",
      ellipsis: true,
      render: (text: string) => <Text type="secondary">{text || "-"}</Text>,
    },
    {
      title: "MST",
      dataIndex: "maSoThue",
      key: "maSoThue",
      width: 130,
      render: (text: string) => text || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center" as const,
      render: (_: any, record: DoiTuong) => (
        <Space size="small">
          <Tooltip title="Sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
              className="!text-primary hover:!bg-primary/10"
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa đối tượng này?"
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
                className="!text-destructive hover:!bg-destructive/10"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: "all", label: "Tất cả", icon: <TeamOutlined /> },
    {
      key: "KHACH_HANG",
      label: `Khách hàng (${stats.khachHang})`,
      icon: <UserOutlined />,
    },
    {
      key: "NHA_CUNG_CAP",
      label: `Nhà cung cấp (${stats.nhaCungCap})`,
      icon: <ShopOutlined />,
    },
    {
      key: "NHAN_VIEN",
      label: `Nhân viên (${stats.nhanVien})`,
      icon: <UserOutlined />,
    },
    {
      key: "NHA_THAU",
      label: `Nhà thầu (${stats.nhaThau})`,
      icon: <ToolOutlined />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
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
          { title: "Đối tượng" },
        ]}
      />

      {/* Page Header */}
      {/* <div className="page-header p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <TeamOutlined className="text-2xl" />
            <Title level={3} className="!text-white !mb-0">
              Danh mục Đối tượng
            </Title>
          </div>
          <Text className="text-white/80">
            Quản lý khách hàng, nhà cung cấp, nhân viên và nhà thầu
          </Text>
        </div>
      </div> */}

      {/* Stats Cards */}
      <Row gutter={16}>
        <Col xs={12} sm={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="Khách hàng"
              value={stats.khachHang}
              prefix={<UserOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card stat-card-warning" size="small">
            <Statistic
              title="Nhà cung cấp"
              value={stats.nhaCungCap}
              prefix={<ShopOutlined className="text-orange-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card stat-card-success" size="small">
            <Statistic
              title="Nhân viên"
              value={stats.nhanVien}
              prefix={<UserOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            className="stat-card"
            size="small"
            style={{ borderLeftColor: "hsl(270, 60%, 50%)" }}
          >
            <Statistic
              title="Nhà thầu"
              value={stats.nhaThau}
              prefix={<ToolOutlined className="text-purple-500" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Card with Tabs */}
      <Card className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems.map((item) => ({
            key: item.key,
            label: (
              <span>
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </span>
            ),
          }))}
        />

        {/* Toolbar */}
        <div className="mb-4">
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} md={12}>
              <Space wrap>
                <Input
                  placeholder="Tìm kiếm theo mã, tên, SĐT, email..."
                  prefix={<SearchOutlined className="text-muted-foreground" />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onPressEnter={() =>
                    fetchData(
                      1,
                      pagination.pageSize,
                      searchText,
                      activeTab === "all"
                        ? undefined
                        : (activeTab as DoiTuong["loai"])
                    )
                  }
                  style={{ width: 300 }}
                  allowClear
                />
                <Tooltip title="Làm mới">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setSearchText("");
                      fetchData(
                        1,
                        pagination.pageSize,
                        "",
                        activeTab === "all"
                          ? undefined
                          : (activeTab as DoiTuong["loai"])
                      );
                    }}
                  />
                </Tooltip>
              </Space>
            </Col>
            <Col xs={24} md={12} className="text-right">
              <Space>
                <Button icon={<ExportOutlined />}>Xuất Excel</Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openModal()}
                >
                  Thêm đối tượng
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Table */}
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
            showTotal: (total) => `Tổng ${total} đối tượng`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
          size="middle"
          scroll={{ x: 900, y: "calc(100vh - 285px)" }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <TeamOutlined className="text-primary" />
            <span>
              {editingRecord ? "Sửa đối tượng" : "Thêm đối tượng mới"}
            </span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={650}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" className="mt-2" size="small">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="loai"
                label="Loại đối tượng"
                rules={[{ required: true, message: "Vui lòng chọn loại" }]}
                className="mb-3"
              >
                <Select options={loaiDoiTuong} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ma"
                label="Mã đối tượng"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 20, message: "Tối đa 20 ký tự" },
                ]}
                className="mb-3"
              >
                <Input placeholder="VD: KH001, NCC001" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="ten"
            label="Tên đối tượng"
            rules={[
              { required: true, message: "Vui lòng nhập tên" },
              { max: 200, message: "Tối đa 200 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="VD: Công ty TNHH ABC" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="soDienThoai"
                label="Số điện thoại"
                rules={[{ max: 20, message: "Tối đa 20 ký tự" }]}
                className="mb-3"
              >
                <Input placeholder="VD: 028 1234 5678" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { type: "email", message: "Email không hợp lệ" },
                  { max: 100, message: "Tối đa 100 ký tự" },
                ]}
                className="mb-3"
              >
                <Input placeholder="VD: contact@company.vn" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="diaChi"
            label="Địa chỉ"
            rules={[{ max: 500, message: "Tối đa 500 ký tự" }]}
            className="mb-3"
          >
            <Input.TextArea
              rows={1}
              placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM"
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="maSoThue"
                label="Mã số thuế"
                rules={[
                  { required: true, message: "Vui lòng nhập MST" },
                  { max: 20, message: "Tối đa 20 ký tự" },
                ]}
                className="mb-0"
              >
                <Input placeholder="VD: 0301234567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nguoiLienHe"
                label="Người liên hệ"
                rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}
                className="mb-0"
              >
                <Input placeholder="VD: Nguyễn Văn A" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default DoiTuongPage;
