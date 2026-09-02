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
  Select,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  nhomDongTienService,
  CHIEU_NHOM_OPTIONS,
  NhomDongTien,
  type ChieuNhomDongTien,
} from "@/services/nhomDongTienService";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import { useFieldLabels } from "@/components/glossary/useFieldLabels";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { ImportDanhMucButton } from "@/components/import-danh-muc";
import { nhomDongTienImportConfig } from "@/components/import-danh-muc/configs";
import { ExportDanhMucButton, ExportDanhMucConfig } from "@/components/export-danh-muc";

const { Text } = Typography;

/** Nhãn tiếng Việt của chiều tiền; nhóm chưa khai thì trả chuỗi rỗng cho file Excel. */
const nhanChieu = (chieu?: ChieuNhomDongTien | null): string =>
  CHIEU_NHOM_OPTIONS.find((o) => o.value === chieu)?.label ?? "";

const nhomDongTienSchema = z.object({
  ma: z.string().trim().min(1, "Mã không được để trống").max(20, "Mã tối đa 20 ký tự"),
  ten: z.string().trim().min(1, "Tên không được để trống").max(200, "Tên tối đa 200 ký tự"),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
  // `.nullable()` bắt buộc: BE trả `null` cho nhóm chưa khai chiều, chỉ
  // `.optional()` là zod đánh trượt và form không mở lên được.
  chieu: z.enum(["THU", "CHI"]).optional().nullable(),
});

const NhomDongTienPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/nhom-dong-tien");
  const [data, setData] = useState<NhomDongTien[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NhomDongTien | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<NhomDongTien>({
    enabled: canDelete,
    itemLabel: "nhóm dòng tiền",
    onDeleteBatch: (ids) => nhomDongTienService.deleteBatch(ids),
    onDone: () => fetchData(),
  });

  const exportConfig: ExportDanhMucConfig = useMemo(() => ({
    fileName: "danh-muc-nhom-dong-tien",
    sheetName: "Nhóm dòng tiền",
    title: "DANH MỤC NHÓM DÒNG TIỀN",
    columns: [
      { header: "Mã", dataKey: "ma", width: 15 },
      { header: "Tên nhóm", dataKey: "ten", width: 35 },
      { header: "Thu/Chi", dataKey: "chieu", width: 12 },
      { header: "Mô tả", dataKey: "moTa", width: 40 },
    ],
    fetchData: async () => {
      const result = await nhomDongTienService.getPaginated({ limit: 10000 });
      return result.data.map((item) => ({
        ma: item.ma,
        ten: item.ten,
        chieu: nhanChieu(item.chieu),
        moTa: item.moTa || "",
      }));
    },
  }), []);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText
  ) => {
    // Lựa chọn chỉ có hiệu lực trong trang đang xem: đổi trang / tìm kiếm / tải lại đều bỏ chọn.
    clearSelection();
    setLoading(true);
    try {
      const result = await nhomDongTienService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });
      setData(result.data);
      setPagination({
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
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

  const handleImported = () => {
    // Giống nút "Làm mới": xóa bộ lọc tìm kiếm để các dòng vừa import không bị
    // ẩn sau một từ khóa không còn khớp.
    setSearchText("");
    fetchData(1, pagination.pageSize, "");
  };

  const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
    fetchData(paginationConfig.current || 1, paginationConfig.pageSize || 50, searchText);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: NhomDongTien) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validated = nhomDongTienSchema.parse(values);

      const maExists = await nhomDongTienService.checkMaExists(validated.ma, editingRecord?.id);
      if (maExists) {
        message.error("Mã nhóm dòng tiền đã tồn tại");
        return;
      }

      if (editingRecord) {
        await nhomDongTienService.update(editingRecord.id, validated);
        message.success("Cập nhật nhóm dòng tiền thành công");
      } else {
        await nhomDongTienService.create(validated as Omit<NhomDongTien, "id" | "isActive">);
        message.success("Thêm nhóm dòng tiền thành công");
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
      await nhomDongTienService.remove(id);
      message.success("Xóa nhóm dòng tiền thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      message.error("Không thể xóa nhóm dòng tiền");
    }
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      sorter: (a: NhomDongTien, b: NhomDongTien) => a.ma.localeCompare(b.ma),
      render: (text: string) => <Text strong className="text-primary">{text}</Text>,
    },
    {
      title: "Tên nhóm dòng tiền",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: NhomDongTien, b: NhomDongTien) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Thu/Chi",
      dataIndex: "chieu",
      key: "chieu",
      width: 110,
      // Nhóm chưa khai chiều hiện thẻ CẢNH BÁO chứ không phải dấu gạch: Kế hoạch
      // dòng tiền dựa vào trường này, bỏ trống là dòng của nhóm đó không vào được
      // THU hay CHI TRONG KỲ — phải thấy ngay mà đi khai.
      render: (chieu?: ChieuNhomDongTien | null) =>
        chieu ? (
          <Tag color={chieu === "THU" ? "green" : "volcano"}>{nhanChieu(chieu)}</Tag>
        ) : (
          <Tag color="warning">Chưa khai</Tag>
        ),
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (moTa: string) => <Text type="secondary">{moTa || "-"}</Text>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: NhomDongTien) => (
        <Space size="small">
          {canEdit && (<Tooltip title="Sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} className="text-primary" />
          </Tooltip>)}
          {canDelete && (<Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa nhóm dòng tiền này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.nhomDongTien', columns);
  const fl = useFieldLabels('danhMuc.nhomDongTien');

  return (
    <div className="space-y-3">
      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () => fetchData(1, pagination.pageSize, searchText),
            placeholder: "Tìm kiếm theo mã hoặc tên...",
            width: 300,
          }}
          onReset={() => {
            setSearchText("");
            fetchData(1, pagination.pageSize, "");
          }}
          actions={
            <>
              {settingsButton}
              <ImportDanhMucButton
                config={nhomDongTienImportConfig}
                canCreate={canCreate}
                onImported={handleImported}
              />
              <ExportDanhMucButton config={exportConfig} canExport={canExport} />
              {bulkDeleteButton}
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Thêm nhóm
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
          scroll={{ x: 800, y: "calc(100vh - 300px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhóm dòng tiền`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) => handleTableChange({ current: pag.current, pageSize: pag.pageSize })}
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa nhóm dòng tiền" : "Thêm nhóm dòng tiền mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Form.Item
            name="ma"
            label={fl('ma', 'Mã nhóm')}
            className="mb-3"
            rules={[{ required: true, message: "Vui lòng nhập mã" }, { max: 20, message: "Mã tối đa 20 ký tự" }]}
          >
            <Input placeholder="VD: NDT01" />
          </Form.Item>
          <Form.Item
            name="ten"
            label={fl('ten', 'Tên nhóm dòng tiền')}
            className="mb-3"
            rules={[{ required: true, message: "Vui lòng nhập tên" }, { max: 200, message: "Tên tối đa 200 ký tự" }]}
          >
            <Input placeholder="Nhập tên nhóm dòng tiền" />
          </Form.Item>
          <Form.Item
            name="chieu"
            label={fl('chieu', 'Thu/Chi')}
            tooltip="Kế hoạch dòng tiền dùng chiều này để cộng dòng vào THU hay CHI TRONG KỲ"
          >
            <Select
              allowClear
              placeholder="Chọn chiều tiền của nhóm"
              options={CHIEU_NHOM_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name="moTa"
            label={fl('moTa', 'Mô tả')}
            className="mb-0"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
          >
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NhomDongTienPage;
