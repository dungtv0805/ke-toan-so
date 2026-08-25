import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  taiKhoanKetChuyenService,
  TaiKhoanKetChuyen,
  BenKetChuyen,
  LoaiKetChuyen,
} from "@/services/taiKhoanKetChuyenService";
import { taiKhoanService } from "@/services/taiKhoanService";
import { NHAN_BEN, NHAN_LOAI, goiYMaKetChuyen } from "./ketChuyenLabels";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import { useFieldLabels } from "@/components/glossary/useFieldLabels";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { ImportDanhMucButton } from "@/components/import-danh-muc";
import { taiKhoanKetChuyenImportConfig } from "@/components/import-danh-muc/configs";
import { ExportDanhMucButton, ExportDanhMucConfig } from "@/components/export-danh-muc";

const { Text } = Typography;

const taiKhoanKetChuyenSchema = z.object({
  thuTu: z.coerce.number().int().min(0, "Thứ tự phải là số không âm"),
  ma: z.string().trim().min(1, "Mã kết chuyển không được để trống").max(50),
  taiKhoanTu: z.string().trim().min(1, "Chọn tài khoản kết chuyển từ"),
  tenTaiKhoanTu: z.string().optional().nullable(),
  taiKhoanDen: z.string().trim().min(1, "Chọn tài khoản kết chuyển đến"),
  tenTaiKhoanDen: z.string().optional().nullable(),
  ben: z.enum(["NO", "CO", "HAI_BEN"]),
  dienGiai: z.string().max(500).optional().nullable(),
}).refine((v) => v.taiKhoanTu !== v.taiKhoanDen, {
  message: "Kết chuyển từ và Kết chuyển đến không được trùng nhau",
  path: ["taiKhoanDen"],
});

const TaiKhoanKetChuyenPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/tai-khoan-ket-chuyen");
  const [data, setData] = useState<TaiKhoanKetChuyen[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaiKhoanKetChuyen | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [taiKhoanOptions, setTaiKhoanOptions] = useState<{ value: string; label: string; ten: string }[]>([]);

  useEffect(() => {
    taiKhoanService
      .getPaginated({ limit: 10000 })
      .then((res) =>
        setTaiKhoanOptions(
          res.data.map((tk) => ({ value: tk.ma, label: `${tk.ma} - ${tk.ten}`, ten: tk.ten })),
        ),
      )
      .catch(() => message.error("Không tải được danh mục tài khoản"));
  }, []);

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<TaiKhoanKetChuyen>({
    enabled: canDelete,
    itemLabel: "tài khoản kết chuyển",
    onDeleteBatch: (ids) => taiKhoanKetChuyenService.deleteBatch(ids),
    onDone: () => fetchData(),
  });

  const exportConfig: ExportDanhMucConfig = useMemo(() => ({
    fileName: "danh-muc-tai-khoan-ket-chuyen",
    sheetName: "Tài khoản kết chuyển",
    title: "DANH MỤC TÀI KHOẢN KẾT CHUYỂN",
    columns: [
      { header: "Thứ tự kết chuyển", dataKey: "thuTu", width: 15 },
      { header: "Mã kết chuyển", dataKey: "ma", width: 15 },
      { header: "Kết chuyển từ", dataKey: "taiKhoanTu", width: 15 },
      { header: "Kết chuyển đến", dataKey: "taiKhoanDen", width: 15 },
      { header: "Bên kết chuyển", dataKey: "ben", width: 15 },
      { header: "Loại kết chuyển", dataKey: "loai", width: 35 },
      { header: "Diễn giải", dataKey: "dienGiai", width: 40 },
    ],
    fetchData: async () => {
      const result = await taiKhoanKetChuyenService.getPaginated({ limit: 10000 });
      return result.data.map((item) => ({
        thuTu: item.thuTu,
        ma: item.ma,
        taiKhoanTu: item.taiKhoanTu,
        taiKhoanDen: item.taiKhoanDen,
        ben: NHAN_BEN[item.ben] ?? item.ben,
        loai: NHAN_LOAI[item.loai] ?? item.loai,
        dienGiai: item.dienGiai || "",
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
      const result = await taiKhoanKetChuyenService.getPaginated({
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

  const handleEdit = (record: TaiKhoanKetChuyen) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleValuesChange = (changed: any, all: any) => {
    if (!("taiKhoanTu" in changed) && !("taiKhoanDen" in changed)) return;
    if (form.getFieldValue("ma")) return;
    const goiY = goiYMaKetChuyen(all.taiKhoanTu, all.taiKhoanDen);
    if (goiY) form.setFieldsValue({ ma: goiY });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validated = taiKhoanKetChuyenSchema.parse(values);

      const maExists = await taiKhoanKetChuyenService.checkMaExists(validated.ma, editingRecord?.id);
      if (maExists) {
        message.error("Mã kết chuyển đã tồn tại");
        return;
      }

      const tenTu = taiKhoanOptions.find((o) => o.value === validated.taiKhoanTu)?.ten ?? "";
      const tenDen = taiKhoanOptions.find((o) => o.value === validated.taiKhoanDen)?.ten ?? "";
      const payload = { ...validated, tenTaiKhoanTu: tenTu, tenTaiKhoanDen: tenDen, loai: "XAC_DINH_KQKD" as const };

      if (editingRecord) {
        await taiKhoanKetChuyenService.update(editingRecord.id, payload);
        message.success("Cập nhật tài khoản kết chuyển thành công");
      } else {
        await taiKhoanKetChuyenService.create(payload as Omit<TaiKhoanKetChuyen, "id" | "isActive">);
        message.success("Thêm tài khoản kết chuyển thành công");
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
      await taiKhoanKetChuyenService.remove(id);
      message.success("Xóa tài khoản kết chuyển thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      message.error("Không thể xóa tài khoản kết chuyển");
    }
  };

  const columns = [
    { title: "Thứ tự kết chuyển", dataIndex: "thuTu", key: "thuTu", width: 140 },
    {
      title: "Mã kết chuyển",
      dataIndex: "ma",
      key: "ma",
      width: 140,
      render: (text: string) => <Text strong className="text-primary">{text}</Text>,
    },
    { title: "Kết chuyển từ", dataIndex: "taiKhoanTu", key: "taiKhoanTu", width: 130 },
    { title: "Kết chuyển đến", dataIndex: "taiKhoanDen", key: "taiKhoanDen", width: 140 },
    {
      title: "Bên kết chuyển",
      dataIndex: "ben",
      key: "ben",
      width: 130,
      render: (ben: BenKetChuyen) => NHAN_BEN[ben] ?? ben,
    },
    {
      title: "Loại kết chuyển",
      dataIndex: "loai",
      key: "loai",
      width: 240,
      render: (loai: LoaiKetChuyen) => NHAN_LOAI[loai] ?? loai,
    },
    { title: "Diễn giải", dataIndex: "dienGiai", key: "dienGiai", ellipsis: true },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: TaiKhoanKetChuyen) => (
        <Space size="small">
          {canEdit && (<Tooltip title="Sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} className="text-primary" />
          </Tooltip>)}
          {canDelete && (<Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa tài khoản kết chuyển này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.taiKhoanKetChuyen', columns);
  const fl = useFieldLabels('danhMuc.taiKhoanKetChuyen');

  return (
    <div className="space-y-3">
      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () => fetchData(1, pagination.pageSize, searchText),
            placeholder: "Tìm theo mã kết chuyển...",
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
                config={taiKhoanKetChuyenImportConfig}
                canCreate={canCreate}
                onImported={handleImported}
              />
              <ExportDanhMucButton config={exportConfig} canExport={canExport} />
              {bulkDeleteButton}
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Thêm
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
          scroll={{ x: 1200, y: "calc(100vh - 300px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} tài khoản kết chuyển`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) => handleTableChange({ current: pag.current, pageSize: pag.pageSize })}
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa tài khoản kết chuyển" : "Thêm tài khoản kết chuyển mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2" onValuesChange={handleValuesChange}>
          <Form.Item
            name="thuTu"
            label={fl('thuTu', 'Thứ tự kết chuyển')}
            className="mb-3"
            rules={[{ required: true, message: "Vui lòng nhập thứ tự" }]}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item
            name="ma"
            label={fl('ma', 'Mã kết chuyển')}
            className="mb-3"
            rules={[{ required: true, message: "Vui lòng nhập mã" }, { max: 50, message: "Mã tối đa 50 ký tự" }]}
          >
            <Input placeholder="VD: 511-911" />
          </Form.Item>
          <Form.Item
            name="taiKhoanTu"
            label={fl('taiKhoanTu', 'Kết chuyển từ')}
            className="mb-3"
            rules={[{ required: true, message: "Vui lòng chọn tài khoản kết chuyển từ" }]}
          >
            <Select showSearch optionFilterProp="label" options={taiKhoanOptions} placeholder="Chọn tài khoản" />
          </Form.Item>
          <Form.Item
            name="taiKhoanDen"
            label={fl('taiKhoanDen', 'Kết chuyển đến')}
            className="mb-3"
            rules={[{ required: true, message: "Vui lòng chọn tài khoản kết chuyển đến" }]}
          >
            <Select showSearch optionFilterProp="label" options={taiKhoanOptions} placeholder="Chọn tài khoản" />
          </Form.Item>
          <Form.Item
            name="ben"
            label={fl('ben', 'Bên kết chuyển')}
            className="mb-3"
            rules={[{ required: true, message: "Vui lòng chọn bên kết chuyển" }]}
          >
            <Select
              options={[
                { value: 'NO', label: 'Nợ' },
                { value: 'CO', label: 'Có' },
                { value: 'HAI_BEN', label: 'Hai bên' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="dienGiai"
            label={fl('dienGiai', 'Diễn giải')}
            className="mb-0"
            rules={[{ max: 500, message: "Diễn giải tối đa 500 ký tự" }]}
          >
            <Input.TextArea rows={3} placeholder="Diễn giải (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaiKhoanKetChuyenPage;
