import React, { useState, useEffect, useMemo } from "react";
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { NhomSanPham } from "@/types";
import { nhomSanPhamService } from "@/services/nhomSanPhamService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import { useFieldLabels } from "@/components/glossary/useFieldLabels";
import { ImportDanhMucButton } from "@/components/import-danh-muc";
import { nhomSanPhamImportConfig } from "@/components/import-danh-muc/configs";
import { ExportDanhMucButton, ExportDanhMucConfig } from "@/components/export-danh-muc";

const { Text } = Typography;
const { TextArea } = Input;

const nhomSanPhamSchema = z.object({
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
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
});

const NhomSanPhamPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/nhom-san-pham");
  const [data, setData] = useState<NhomSanPham[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NhomSanPham | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<NhomSanPham>({
    enabled: canDelete,
    itemLabel: "nhóm sản phẩm",
    onDeleteBatch: (ids) => nhomSanPhamService.deleteBatch(ids),
    onDone: () => fetchData(),
  });

  const exportConfig: ExportDanhMucConfig = useMemo(() => ({
    fileName: "danh-muc-nhom-san-pham",
    sheetName: "Nhóm sản phẩm",
    title: "DANH MỤC NHÓM SẢN PHẨM",
    columns: [
      { header: "Mã", dataKey: "ma", width: 15 },
      { header: "Tên nhóm", dataKey: "ten", width: 35 },
      { header: "Mô tả", dataKey: "moTa", width: 40 },
    ],
    fetchData: async () => {
      const result = await nhomSanPhamService.getPaginated({ limit: 10000 });
      return result.data.map((item) => ({
        ma: item.ma,
        ten: item.ten,
        moTa: item.moTa || "",
      }));
    },
  }), []);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText
  ) => {
    // Lựa chọn chỉ có hiệu lực trong trang đang xem: đổi trang / tìm kiếm / lọc / tải lại đều bỏ chọn.
    clearSelection();
    setLoading(true);
    try {
      const result = await nhomSanPhamService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });

      if (result.data.length === 0 && page > 1 && result.meta.totalPages >= 1) {
        const newPage = Math.max(1, result.meta.totalPages);
        const newResult = await nhomSanPhamService.getPaginated({
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
    } catch {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleImported = () => {
    // Giống nút "Làm mới": xóa bộ lọc tìm kiếm để các dòng vừa import không bị ẩn
    // sau một từ khóa không còn khớp — kể cả ô tìm kiếm cũng phải rỗng theo.
    setSearchText("");
    fetchData(1, pagination.pageSize, "");
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: NhomSanPham) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validated = nhomSanPhamSchema.parse(values);

      const maExists = await nhomSanPhamService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã nhóm sản phẩm đã tồn tại");
        return;
      }

      if (editingRecord) {
        await nhomSanPhamService.update(editingRecord.id, validated);
        message.success("Cập nhật nhóm sản phẩm thành công");
      } else {
        await nhomSanPhamService.create(validated as Omit<NhomSanPham, "id">);
        message.success("Thêm nhóm sản phẩm thành công");
      }

      setModalVisible(false);
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => message.error(err.message));
      } else if (!(error as any)?.errorFields) {
        message.error((error as any)?.message || "Không thể lưu, vui lòng thử lại");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await nhomSanPhamService.remove(id);
      message.success("Xóa nhóm sản phẩm thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch {
      message.error("Không thể xóa nhóm sản phẩm");
    }
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      sorter: (a: NhomSanPham, b: NhomSanPham) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên nhóm sản phẩm",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: NhomSanPham, b: NhomSanPham) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
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
      render: (_: unknown, record: NhomSanPham) => (
        <Space size="small">
          {canEdit && (
            <Tooltip title="Sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                className="text-primary"
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc chắn muốn xóa nhóm sản phẩm này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa">
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.nhomSanPham', columns);
  const fl = useFieldLabels('danhMuc.nhomSanPham');

  return (
    <div className="space-y-3">
      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            placeholder: "Tìm kiếm theo mã hoặc tên nhóm sản phẩm...",
            width: 400,
          }}
          actions={
            <>
              <ImportDanhMucButton
                config={nhomSanPhamImportConfig}
                canCreate={canCreate}
                onImported={handleImported}
              />
              <ExportDanhMucButton config={exportConfig} canExport={canExport} />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchData(1, pagination.pageSize, "")}
              >
                Làm mới
              </Button>
              {settingsButton}
              {bulkDeleteButton}
              {canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  Thêm nhóm sản phẩm
                </Button>
              )}
            </>
          }
        />

        <Table
          columns={cfgColumns}
          dataSource={data}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          scroll={{ x: 700, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} nhóm sản phẩm`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa nhóm sản phẩm" : "Thêm nhóm sản phẩm mới"}
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
            <Col span={8}>
              <Form.Item
                name="ma"
                label={fl('ma', 'Mã')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: NVT001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label={fl('ten', 'Tên nhóm sản phẩm')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên nhóm sản phẩm" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên nhóm sản phẩm" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="moTa"
            label={fl('moTa', 'Mô tả')}
            className="mb-0"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập mô tả..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NhomSanPhamPage;
