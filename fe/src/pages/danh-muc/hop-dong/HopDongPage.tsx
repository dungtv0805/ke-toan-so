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
  ScanOutlined,
  ClockCircleOutlined,
  FileUnknownOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { HopDong, DoiTuong, TrangThaiHopDong } from "@/types";
import {
  HopDongHandlerProvider,
  useHopDongHandler,
  useHopDongState,
} from "./HopDongHandlerContext";
import "./HopDongPage.state";
import { usePagePermission } from "@/hooks/usePagePermission";

const { Title, Text } = Typography;

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

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return dayjs(dateString).format("DD/MM/YYYY");
};

const getTrangThaiTag = (trangThai?: TrangThaiHopDong) => {
  const option = TRANG_THAI_OPTIONS.find((opt) => opt.value === trangThai);
  if (!option) return <Tag>-</Tag>;
  return <Tag color={option.color}>{option.label}</Tag>;
};

interface FormValues {
  soHopDong: string;
  tenCongTrinh: string;
  giaTriSauThue?: number;
  ngayKy?: Dayjs;
  trangThai?: TrangThaiHopDong;
  soLuongLuu?: number;
  phuLuc1?: {
    giaTri?: number;
    ngayKy?: Dayjs;
  };
  phuLuc2?: {
    giaTri?: number;
    ngayKy?: Dayjs;
  };
  doiTuongId?: string;
  nguoiKy?: string;
  chucVu?: string;
  nguoiGiaoDich?: string;
  dieuKhoanThanhToan?: {
    tamUng?: string;
    thanhToanGiaiDoan?: string;
    quyetToan?: string;
  };
  baoHanh?: {
    giaTri?: number;
    thoiGian?: string;
    hinhThuc?: string;
  };
  tienDoThiCong?: {
    soNgay?: number;
    tuNgay?: Dayjs;
    denNgay?: Dayjs;
  };
}

function HopDongPageInner() {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/hop-dong");
  const handler = useHopDongHandler();
  const [data] = useHopDongState("data", []);
  const [loading] = useHopDongState("loading", false);
  const [pagination] = useHopDongState("pagination", {
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [stats] = useHopDongState("stats", {
    total: 0,
    hdGoc: 0,
    hdPhotoScan: 0,
    chuaCoHd: 0,
  });
  const [doiTuongList] = useHopDongState("doiTuongList", []);

  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HopDong | null>(null);
  const [activeTab, setActiveTab] = useState("1");
  const [form] = Form.useForm<FormValues>();

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

  const transformToFormValues = (record: HopDong): FormValues => {
    return {
      soHopDong: record.soHopDong,
      tenCongTrinh: record.tenCongTrinh,
      giaTriSauThue: record.giaTriSauThue,
      ngayKy: record.ngayKy ? dayjs(record.ngayKy) : undefined,
      trangThai: record.trangThai,
      soLuongLuu: record.soLuongLuu,
      phuLuc1: record.phuLuc1
        ? {
            giaTri: record.phuLuc1.giaTri,
            ngayKy: record.phuLuc1.ngayKy ? dayjs(record.phuLuc1.ngayKy) : undefined,
          }
        : undefined,
      phuLuc2: record.phuLuc2
        ? {
            giaTri: record.phuLuc2.giaTri,
            ngayKy: record.phuLuc2.ngayKy ? dayjs(record.phuLuc2.ngayKy) : undefined,
          }
        : undefined,
      doiTuongId: record.doiTuongId,
      nguoiKy: record.nguoiKy,
      chucVu: record.chucVu,
      nguoiGiaoDich: record.nguoiGiaoDich,
      dieuKhoanThanhToan: record.dieuKhoanThanhToan,
      baoHanh: record.baoHanh,
      tienDoThiCong: record.tienDoThiCong
        ? {
            soNgay: record.tienDoThiCong.soNgay,
            tuNgay: record.tienDoThiCong.tuNgay
              ? dayjs(record.tienDoThiCong.tuNgay)
              : undefined,
            denNgay: record.tienDoThiCong.denNgay
              ? dayjs(record.tienDoThiCong.denNgay)
              : undefined,
          }
        : undefined,
    };
  };

  const transformToSubmitData = (values: FormValues): Omit<HopDong, "id"> => {
    return {
      soHopDong: values.soHopDong,
      tenCongTrinh: values.tenCongTrinh,
      giaTriSauThue: values.giaTriSauThue,
      ngayKy: values.ngayKy?.format("YYYY-MM-DD"),
      trangThai: values.trangThai,
      soLuongLuu: values.soLuongLuu,
      phuLuc1: values.phuLuc1
        ? {
            giaTri: values.phuLuc1.giaTri,
            ngayKy: values.phuLuc1.ngayKy?.format("YYYY-MM-DD"),
          }
        : undefined,
      phuLuc2: values.phuLuc2
        ? {
            giaTri: values.phuLuc2.giaTri,
            ngayKy: values.phuLuc2.ngayKy?.format("YYYY-MM-DD"),
          }
        : undefined,
      doiTuongId: values.doiTuongId,
      nguoiKy: values.nguoiKy,
      chucVu: values.chucVu,
      nguoiGiaoDich: values.nguoiGiaoDich,
      dieuKhoanThanhToan: values.dieuKhoanThanhToan,
      baoHanh: values.baoHanh,
      tienDoThiCong: values.tienDoThiCong
        ? {
            soNgay: values.tienDoThiCong.soNgay,
            tuNgay: values.tienDoThiCong.tuNgay?.format("YYYY-MM-DD"),
            denNgay: values.tienDoThiCong.denNgay?.format("YYYY-MM-DD"),
          }
        : undefined,
    };
  };

  const openModal = (record?: HopDong) => {
    setActiveTab("1");
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(transformToFormValues(record));
    } else {
      setEditingRecord(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = transformToSubmitData(values);

      if (editingRecord) {
        await handler.executeEvent("update", {
          id: editingRecord.id,
          data: submitData,
        });
        message.success("Cập nhật hợp đồng thành công");
      } else {
        await handler.executeEvent("create", { data: submitData });
        message.success("Thêm hợp đồng mới thành công");
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error: unknown) {
      const err = error as { errorFields?: unknown; message?: string };
      if (err.errorFields) return;
      message.error(err.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await handler.executeEvent("remove", { id });
      message.success("Xóa hợp đồng thành công");
    } catch (error: unknown) {
      const err = error as { message?: string };
      message.error(err.message || "Không thể xóa hợp đồng");
    }
  };

  const getDoiTuongName = (doiTuongId?: string) => {
    if (!doiTuongId) return "-";
    const doiTuong = doiTuongList.find((dt: DoiTuong) => dt.id === doiTuongId);
    return doiTuong?.ten || "-";
  };

  const columns = [
    {
      title: "Số HĐ",
      dataIndex: "soHopDong",
      key: "soHopDong",
      width: 120,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Tên công trình",
      dataIndex: "tenCongTrinh",
      key: "tenCongTrinh",
      ellipsis: true,
      width: 250,
    },
    {
      title: "Giá trị sau thuế",
      dataIndex: "giaTriSauThue",
      key: "giaTriSauThue",
      width: 150,
      align: "right" as const,
      render: (value: number) => (
        <Text type="success">{formatCurrency(value)}</Text>
      ),
    },
    {
      title: "Ngày ký",
      dataIndex: "ngayKy",
      key: "ngayKy",
      width: 110,
      render: (value: string) => formatDate(value),
    },
    {
      title: "Chủ đầu tư",
      dataIndex: "doiTuongId",
      key: "doiTuongId",
      width: 180,
      ellipsis: true,
      render: (value: string) => getDoiTuongName(value),
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 130,
      render: (value: TrangThaiHopDong) => getTrangThaiTag(value),
    },
    {
      title: "SL lưu",
      dataIndex: "soLuongLuu",
      key: "soLuongLuu",
      width: 80,
      align: "center" as const,
      render: (value: number) => value || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center" as const,
      render: (_: unknown, record: HopDong) => (
        <Space size="small">
          {canEdit && (<Tooltip title="Sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>)}
          {canDelete && (<Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa hợp đồng này?"
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
          </Popconfirm>)}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "1",
      label: "Thông tin chính",
      children: (
        <div className="pt-2">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="soHopDong"
                label="Số hợp đồng"
                rules={[
                  { required: true, message: "Vui lòng nhập số hợp đồng" },
                  { max: 50, message: "Tối đa 50 ký tự" },
                ]}
              >
                <Input placeholder="VD: HD-2024-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ngayKy"
                label="Ngày ký"
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày ký"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="tenCongTrinh"
            label="Tên công trình"
            rules={[
              { required: true, message: "Vui lòng nhập tên công trình" },
              { max: 500, message: "Tối đa 500 ký tự" },
            ]}
          >
            <Input.TextArea
              placeholder="Nhập tên công trình..."
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="giaTriSauThue"
                label="Giá trị sau thuế"
              >
                <InputNumber
                  className="w-full"
                  placeholder="0"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as unknown as number}
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="soLuongLuu"
                label="Số lượng lưu"
              >
                <InputNumber
                  className="w-full"
                  placeholder="0"
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="trangThai"
            label="Trạng thái"
          >
            <Select
              placeholder="Chọn trạng thái"
              options={TRANG_THAI_OPTIONS}
              allowClear
            />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "2",
      label: "Phụ lục",
      children: (
        <div className="pt-2">
          <Divider orientation="left">Phụ lục 1</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={["phuLuc1", "giaTri"]}
                label="Giá trị"
              >
                <InputNumber
                  className="w-full"
                  placeholder="0"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as unknown as number}
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={["phuLuc1", "ngayKy"]}
                label="Ngày ký"
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày ký"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Phụ lục 2</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={["phuLuc2", "giaTri"]}
                label="Giá trị"
              >
                <InputNumber
                  className="w-full"
                  placeholder="0"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as unknown as number}
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={["phuLuc2", "ngayKy"]}
                label="Ngày ký"
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày ký"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: "3",
      label: "Chủ đầu tư",
      children: (
        <div className="pt-2">
          <Form.Item
            name="doiTuongId"
            label="Chủ đầu tư"
          >
            <Select
              placeholder="Chọn chủ đầu tư"
              allowClear
              showSearch
              optionFilterProp="label"
              options={doiTuongList.map((dt: DoiTuong) => ({
                value: dt.id,
                label: `${dt.ma} - ${dt.ten}`,
              }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nguoiKy"
                label="Người ký"
              >
                <Input placeholder="Nhập tên người ký" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="chucVu"
                label="Chức vụ"
              >
                <Input placeholder="Nhập chức vụ" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="nguoiGiaoDich"
            label="Người giao dịch"
          >
            <Input placeholder="Nhập tên người giao dịch" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "4",
      label: "Thanh toán & Bảo hành",
      children: (
        <div className="pt-2">
          <Divider orientation="left">Điều khoản thanh toán</Divider>
          <Form.Item
            name={["dieuKhoanThanhToan", "tamUng"]}
            label="Tạm ứng"
          >
            <Input.TextArea
              placeholder="Nhập điều khoản tạm ứng..."
              autoSize={{ minRows: 2, maxRows: 3 }}
            />
          </Form.Item>
          <Form.Item
            name={["dieuKhoanThanhToan", "thanhToanGiaiDoan"]}
            label="Thanh toán giai đoạn"
          >
            <Input.TextArea
              placeholder="Nhập điều khoản thanh toán giai đoạn..."
              autoSize={{ minRows: 2, maxRows: 3 }}
            />
          </Form.Item>
          <Form.Item
            name={["dieuKhoanThanhToan", "quyetToan"]}
            label="Quyết toán"
          >
            <Input.TextArea
              placeholder="Nhập điều khoản quyết toán..."
              autoSize={{ minRows: 2, maxRows: 3 }}
            />
          </Form.Item>

          <Divider orientation="left">Bảo hành</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={["baoHanh", "giaTri"]}
                label="Giá trị bảo hành"
              >
                <InputNumber
                  className="w-full"
                  placeholder="0"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as unknown as number}
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={["baoHanh", "thoiGian"]}
                label="Thời gian"
              >
                <Input placeholder="VD: 12 tháng" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={["baoHanh", "hinhThuc"]}
                label="Hình thức"
              >
                <Input placeholder="VD: Bảo lãnh ngân hàng" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: "5",
      label: "Tiến độ",
      children: (
        <div className="pt-2">
          <Divider orientation="left">Tiến độ thi công</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={["tienDoThiCong", "soNgay"]}
                label="Số ngày"
              >
                <InputNumber
                  className="w-full"
                  placeholder="0"
                  min={0}
                  addonAfter="ngày"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={["tienDoThiCong", "tuNgay"]}
                label="Từ ngày"
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày bắt đầu"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={["tienDoThiCong", "denNgay"]}
                label="Đến ngày"
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày kết thúc"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

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
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="Tổng số"
              value={stats.total}
              prefix={<FileTextOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="HĐ gốc"
              value={stats.hdGoc}
              prefix={<CheckCircleOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="HĐ photo/scan"
              value={stats.hdPhotoScan}
              prefix={<ScanOutlined className="text-orange-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="Chưa có HĐ"
              value={stats.chuaCoHd}
              prefix={<FileUnknownOutlined className="text-gray-500" />}
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
                  style={{ width: 320 }}
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
              {canCreate && (
                <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openModal()}
              >
                Thêm hợp đồng
              </Button>
              )}
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
            showTotal: (total) => `Tổng ${total} hợp đồng`,
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
          scroll={{ x: 1200, y: "calc(100vh - 400px)" }}
          size="middle"
        />
      </Card>

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
        width={800}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-2"
          size="small"
          preserve={false}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
        </Form>
      </Modal>
    </div>
  );
}

export default function HopDongPage() {
  return (
    <HopDongHandlerProvider>
      <HopDongPageInner />
    </HopDongHandlerProvider>
  );
}
