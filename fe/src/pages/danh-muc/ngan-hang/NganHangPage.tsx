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
  Statistic,
  Tabs,
  InputNumber,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  BankOutlined,
  HomeOutlined,
  WalletOutlined,
  DollarOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { TaiKhoanNganHang } from "@/types";
import { nganHangService, TaiKhoanNHStats } from "@/services/nganHangService";
import { loaiTaiKhoanOptions, danhSachNganHang } from "@/mock-data/ngan-hang";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";

const { Title, Text } = Typography;

// Validation schema
const taiKhoanNHSchema = z.object({
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
  loai: z.enum(["TIEN_MAT", "NGAN_HANG"]),
  soDu: z.number().min(0, "Số dư không được âm"),
  nganHang: z.string().optional().nullable(),
  soTaiKhoan: z.string().max(30, "Số tài khoản tối đa 30 ký tự").optional().nullable(),
});

const NganHangPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/ngan-hang");
  const [data, setData] = useState<TaiKhoanNganHang[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaiKhoanNganHang | null>(
    null
  );
  const [form] = Form.useForm();
  const [stats, setStats] = useState<TaiKhoanNHStats>({
    tongTaiKhoan: 0,
    tienMat: 0,
    nganHang: 0,
    tongSoDuTienMat: 0,
    tongSoDuNganHang: 0,
    tongSoDu: 0,
  });
  const [selectedLoai, setSelectedLoai] =
    useState<TaiKhoanNganHang["loai"]>("TIEN_MAT");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText,
    loai?: TaiKhoanNganHang["loai"]
  ) => {
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        nganHangService.getPaginated({
          page,
          limit: pageSize,
          search: search || undefined,
          loai,
        }),
        nganHangService.getStats(),
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
    fetchData(
      1,
      pagination.pageSize,
      "",
      activeTab === "all" ? undefined : (activeTab as TaiKhoanNganHang["loai"])
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
      key === "all" ? undefined : (key as TaiKhoanNganHang["loai"])
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
      activeTab === "all" ? undefined : (activeTab as TaiKhoanNganHang["loai"])
    );
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ loai: "TIEN_MAT", soDu: 0 });
    setSelectedLoai("TIEN_MAT");
    setModalVisible(true);
  };

  const handleEdit = (record: TaiKhoanNganHang) => {
    setEditingRecord(record);
    setSelectedLoai(record.loai);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleLoaiChange = (loai: TaiKhoanNganHang["loai"]) => {
    setSelectedLoai(loai);
    if (loai === "TIEN_MAT") {
      form.setFieldsValue({ nganHang: undefined, soTaiKhoan: undefined });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate with zod
      const validated = taiKhoanNHSchema.parse(values);

      // Check if ma already exists
      const maExists = await nganHangService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã tài khoản đã tồn tại");
        return;
      }

      if (editingRecord) {
        await nganHangService.update(editingRecord.id, validated);
        message.success("Cập nhật tài khoản thành công");
      } else {
        await nganHangService.create(validated as Omit<TaiKhoanNganHang, "id">);
        message.success("Thêm tài khoản thành công");
      }

      setModalVisible(false);
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all"
          ? undefined
          : (activeTab as TaiKhoanNganHang["loai"])
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => message.error(err.message));
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await nganHangService.remove(id);
      message.success("Xóa tài khoản thành công");
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all"
          ? undefined
          : (activeTab as TaiKhoanNganHang["loai"])
      );
    } catch (error) {
      message.error("Không thể xóa tài khoản");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const getLoaiTag = (loai: TaiKhoanNganHang["loai"]) => {
    const option = loaiTaiKhoanOptions.find((o) => o.value === loai);
    const icon = loai === "TIEN_MAT" ? <WalletOutlined /> : <BankOutlined />;
    return (
      <Tag color={option?.color} icon={icon}>
        {option?.label}
      </Tag>
    );
  };

  const columns = [
    {
      title: "Mã TK",
      dataIndex: "ma",
      key: "ma",
      width: 100,
      sorter: (a: TaiKhoanNganHang, b: TaiKhoanNganHang) =>
        a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên tài khoản",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: TaiKhoanNganHang, b: TaiKhoanNganHang) =>
        a.ten.localeCompare(b.ten),
    },
    {
      title: "Loại",
      dataIndex: "loai",
      key: "loai",
      width: 120,
      render: (loai: TaiKhoanNganHang["loai"]) => getLoaiTag(loai),
    },
    {
      title: "Ngân hàng",
      dataIndex: "nganHang",
      key: "nganHang",
      width: 140,
      render: (text: string, record: TaiKhoanNganHang) =>
        record.loai === "NGAN_HANG" ? (
          <Space>
            <CreditCardOutlined className="text-muted-foreground" />
            <Text>{text || "-"}</Text>
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Số tài khoản",
      dataIndex: "soTaiKhoan",
      key: "soTaiKhoan",
      width: 160,
      render: (text: string, record: TaiKhoanNganHang) =>
        record.loai === "NGAN_HANG" ? (
          <Text code>{text || "-"}</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Số dư",
      dataIndex: "soDu",
      key: "soDu",
      width: 180,
      align: "right" as const,
      sorter: (a: TaiKhoanNganHang, b: TaiKhoanNganHang) => a.soDu - b.soDu,
      render: (value: number) => (
        <Text
          strong
          className={value > 0 ? "text-green-600" : "text-muted-foreground"}
        >
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: TaiKhoanNganHang) => (
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
            description="Bạn có chắc chắn muốn xóa tài khoản này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>)}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "all",
      label: (
        <span>
          Tất cả <Tag className="ml-1">{stats.tongTaiKhoan}</Tag>
        </span>
      ),
    },
    {
      key: "TIEN_MAT",
      label: (
        <span>
          <WalletOutlined className="mr-1" />
          Tiền mặt{" "}
          <Tag color="orange" className="ml-1">
            {stats.tienMat}
          </Tag>
        </span>
      ),
    },
    {
      key: "NGAN_HANG",
      label: (
        <span>
          <BankOutlined className="mr-1" />
          Ngân hàng{" "}
          <Tag color="blue" className="ml-1">
            {stats.nganHang}
          </Tag>
        </span>
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
          { title: "Ngân hàng & Quỹ" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={3} className="!mb-1 flex items-center gap-2">
            <BankOutlined className="text-primary" />
            Quản lý Ngân hàng & Quỹ
          </Title>
          <Text type="secondary">
            Quản lý danh sách tài khoản ngân hàng và quỹ tiền mặt
          </Text>
        </div>
        <Space>
          {canExport && <Button icon={<ExportOutlined />}>Xuất Excel</Button>}
          <Button
            icon={<ReloadOutlined />}
            onClick={() =>
              fetchData(
                1,
                pagination.pageSize,
                "",
                activeTab === "all"
                  ? undefined
                  : (activeTab as TaiKhoanNganHang["loai"])
              )
            }
          >
            Làm mới
          </Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm tài khoản
          </Button>
          )}
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <Statistic
              title="Tổng số dư"
              value={stats.tongSoDu}
              prefix={<DollarOutlined className="text-primary" />}
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: "#1890ff", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tiền mặt"
              value={stats.tongSoDuTienMat}
              prefix={<WalletOutlined className="text-orange-500" />}
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: "#f97316" }}
            />
            <Text type="secondary" className="text-xs">
              {stats.tienMat} tài khoản
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ngân hàng"
              value={stats.tongSoDuNganHang}
              prefix={<BankOutlined className="text-blue-500" />}
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: "#3b82f6" }}
            />
            <Text type="secondary" className="text-xs">
              {stats.nganHang} tài khoản
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Table with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          className="mb-4"
        />

        <div className="mb-4">
          <Input
            placeholder="Tìm kiếm theo mã, tên, ngân hàng hoặc số tài khoản..."
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
                  : (activeTab as TaiKhoanNganHang["loai"])
              )
            }
            allowClear
            style={{ maxWidth: 450 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} tài khoản`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa tài khoản" : "Thêm tài khoản mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item
                name="ma"
                label="Mã tài khoản"
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: NH001" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                name="loai"
                label="Loại tài khoản"
                className="mb-3"
                rules={[{ required: true, message: "Vui lòng chọn loại" }]}
              >
                <Select
                  placeholder="Chọn loại"
                  onChange={handleLoaiChange}
                  options={loaiTaiKhoanOptions.map((o) => ({
                    value: o.value,
                    label: (
                      <Tag color={o.color}>
                        {o.value === "TIEN_MAT" ? (
                          <WalletOutlined />
                        ) : (
                          <BankOutlined />
                        )}{" "}
                        {o.label}
                      </Tag>
                    ),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="ten"
            label="Tên tài khoản"
            className="mb-3"
            rules={[
              { required: true, message: "Vui lòng nhập tên tài khoản" },
              { max: 200, message: "Tên tối đa 200 ký tự" },
            ]}
          >
            <Input placeholder="Nhập tên tài khoản" />
          </Form.Item>

          {selectedLoai === "NGAN_HANG" && (
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="nganHang" label="Ngân hàng" className="mb-3">
                  <Select
                    placeholder="Chọn ngân hàng"
                    showSearch
                    optionFilterProp="label"
                    options={danhSachNganHang}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="soTaiKhoan"
                  label="Số tài khoản"
                  className="mb-3"
                  rules={[{ max: 30, message: "Số TK tối đa 30 ký tự" }]}
                >
                  <Input placeholder="Nhập số tài khoản" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="soDu"
            label="Số dư ban đầu (VNĐ)"
            className="mb-0"
            rules={[
              { required: true, message: "Vui lòng nhập số dư" },
              { type: "number", min: 0, message: "Số dư không được âm" },
            ]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              placeholder="Nhập số dư"
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
        </Form>
      </Modal>
    </div>
  );
};

export default NganHangPage;
