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
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  HomeOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { NhomKhuyenMai } from "@/types";
import {
  NhomKhuyenMaiHandlerProvider,
  useNhomKhuyenMaiHandler,
  useNhomKhuyenMaiState,
} from "./NhomKhuyenMaiHandlerContext";
import "./NhomKhuyenMaiPage.state";

const { Title, Text } = Typography;

function NhomKhuyenMaiPageInner() {
  const handler = useNhomKhuyenMaiHandler();
  const [data] = useNhomKhuyenMaiState("data", []);
  const [loading] = useNhomKhuyenMaiState("loading", false);
  const [pagination] = useNhomKhuyenMaiState("pagination", {
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [stats] = useNhomKhuyenMaiState("stats", { total: 0 });
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NhomKhuyenMai | null>(
    null
  );
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
      pageSize: pag.pageSize || 10,
    });
  };

  const openModal = (record?: NhomKhuyenMai) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(record);
    } else {
      setEditingRecord(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRecord) {
        await handler.executeEvent("update", {
          id: editingRecord.id,
          data: values,
        });
        message.success("Cập nhật thành công");
      } else {
        await handler.executeEvent("create", { data: values });
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

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Tên nhóm khuyến mại",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (text: string) => <Text type="secondary">{text || "-"}</Text>,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center" as const,
      render: (_: any, record: NhomKhuyenMai) => (
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
          { title: "Nhóm khuyến mại" },
        ]}
      />

      {/* <div className="page-header p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <GiftOutlined className="text-2xl" />
            <Title level={3} className="!text-white !mb-0">Danh mục Nhóm khuyến mại</Title>
          </div>
          <Text className="text-white/80">Quản lý danh sách nhóm khuyến mại</Text>
        </div>
      </div> */}

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Card className="stat-card" size="small">
            <Statistic
              title="Tổng số"
              value={stats?.total || 0}
              prefix={<GiftOutlined className="text-orange-500" />}
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
                  placeholder="Tìm kiếm..."
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
          scroll={{ y: "calc(100vh - 285px)" }}
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
          size="middle"
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <GiftOutlined className="text-primary" />
            <span>{editingRecord ? "Sửa" : "Thêm mới"}</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={450}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" className="mt-2" size="small">
          <Form.Item
            name="ma"
            label="Mã"
            rules={[{ required: true, message: "Vui lòng nhập mã" }]}
            className="mb-3"
          >
            <Input placeholder="VD: NKM001" />
          </Form.Item>
          <Form.Item
            name="ten"
            label="Tên"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
            className="mb-3"
          >
            <Input placeholder="VD: Khuyến mại mùa hè" />
          </Form.Item>
          <Form.Item name="moTa" label="Mô tả" className="mb-0">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Mô tả..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function NhomKhuyenMaiPage() {
  return (
    <NhomKhuyenMaiHandlerProvider>
      <NhomKhuyenMaiPageInner />
    </NhomKhuyenMaiHandlerProvider>
  );
}
