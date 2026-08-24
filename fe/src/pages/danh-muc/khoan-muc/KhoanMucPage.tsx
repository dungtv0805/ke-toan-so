import React, { useState, useEffect, useMemo } from "react";
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
  Tabs,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  FallOutlined,
  RiseOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { FilterBar } from "@/components/common/FilterBar";
import { KhoanMuc } from "@/types";
import { khoanMucService, KhoanMucStats } from "@/services/khoanMucService";
import { nhomKhoanMucService, NhomKhoanMuc } from "@/services/nhomKhoanMucService";
import { loaiKhoanMucOptions } from "@/mock-data/khoan-muc";
import { useBangCay } from "@/components/table/bang-cay";
import type { LoaiChiPhi } from "@/types";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { ImportDanhMucButton } from "@/components/import-danh-muc";
import { khoanMucImportConfig } from "@/components/import-danh-muc/configs";
import { ExportDanhMucButton, ExportDanhMucConfig } from "@/components/export-danh-muc";

const { Text } = Typography;

// Validation schema
const khoanMucSchema = z.object({
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
  loai: z.enum(["CHI_PHI", "DOANH_THU"]),
  nhom: z.string().min(1, "Vui lòng chọn nhóm khoản mục"),
  loaiChiPhi: z.enum(["CO_DINH", "BIEN_DOI"]).optional().nullable(),
});

// Nhãn không lặp lại chữ "Chi phí" — ô và cột đã tên "Loại chi phí" ngay trên.
// (Giống Quy chuẩn hạch toán; mẫu Excel import vẫn nhận nhãn cũ, xem khoanMuc.config.ts.)
const NHAN_LOAI_CHI_PHI: Record<LoaiChiPhi, string> = {
  CO_DINH: "Cố định",
  BIEN_DOI: "Biến đổi",
};

const LOAI_CHI_PHI_OPTIONS = [
  { value: "CO_DINH", label: "Cố định" },
  { value: "BIEN_DOI", label: "Biến đổi" },
];

const KhoanMucPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/khoan-muc");
  const [data, setData] = useState<KhoanMuc[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KhoanMuc | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<KhoanMucStats>({
    tongKhoanMuc: 0,
    chiPhi: 0,
    doanhThu: 0,
  });
  const [selectedLoai, setSelectedLoai] = useState<
    KhoanMuc["loai"] | undefined
  >();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [nhomKhoanMucList, setNhomKhoanMucList] = useState<NhomKhoanMuc[]>([]);

  const fetchNhomKhoanMuc = async () => {
    try {
      const nhomList = await nhomKhoanMucService.getAll();
      setNhomKhoanMucList(nhomList);
    } catch (error) {
      console.error("Failed to load nhom khoan muc:", error);
    }
  };

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<KhoanMuc>({
    enabled: canDelete,
    itemLabel: "khoản mục",
    onDeleteBatch: (ids) => khoanMucService.deleteBatch(ids),
    onDone: () => fetchData(),
  });

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText,
    loai?: KhoanMuc["loai"]
  ) => {
    // Lựa chọn chỉ có hiệu lực trong trang đang xem: đổi trang / tìm kiếm / lọc / tải lại đều bỏ chọn.
    clearSelection();
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        khoanMucService.getPaginated({
          page,
          limit: pageSize,
          search: search || undefined,
          loai,
        }),
        khoanMucService.getStats(),
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
    fetchNhomKhoanMuc();
    fetchData(
      1,
      pagination.pageSize,
      "",
      activeTab === "all" ? undefined : (activeTab as KhoanMuc["loai"])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImported = () => {
    // Giống nút "Làm mới" (nút đặt lại bộ lọc): xóa bộ lọc tìm kiếm và đưa tab
    // về "Tất cả" để các dòng vừa import không bị ẩn sau một từ khóa hoặc tab loại không còn khớp.
    setSearchText("");
    setActiveTab("all");
    fetchData(1, pagination.pageSize, "", undefined);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchText("");
    fetchData(
      1,
      pagination.pageSize,
      "",
      key === "all" ? undefined : (key as KhoanMuc["loai"])
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
      activeTab === "all" ? undefined : (activeTab as KhoanMuc["loai"])
    );
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ loai: "CHI_PHI" });
    setSelectedLoai("CHI_PHI");
    setModalVisible(true);
  };

  const handleEdit = (record: KhoanMuc) => {
    setEditingRecord(record);
    setSelectedLoai(record.loai);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleLoaiChange = (loai: KhoanMuc["loai"]) => {
    setSelectedLoai(loai);
    form.setFieldsValue({ nhom: undefined });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate with zod
      const validated = khoanMucSchema.parse(values);

      // Check if ma already exists
      const maExists = await khoanMucService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã khoản mục đã tồn tại");
        return;
      }

      if (editingRecord) {
        await khoanMucService.update(editingRecord.id, validated);
        message.success("Cập nhật khoản mục thành công");
      } else {
        await khoanMucService.create(validated as Omit<KhoanMuc, "id">);
        message.success("Thêm khoản mục thành công");
      }

      setModalVisible(false);
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all" ? undefined : (activeTab as KhoanMuc["loai"])
      );
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
      await khoanMucService.remove(id);
      message.success("Xóa khoản mục thành công");
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all" ? undefined : (activeTab as KhoanMuc["loai"])
      );
    } catch (error) {
      message.error("Không thể xóa khoản mục");
    }
  };

  const getLoaiTag = (loai: KhoanMuc["loai"]) => {
    const option = loaiKhoanMucOptions.find((o) => o.value === loai);
    const icon = loai === "CHI_PHI" ? <FallOutlined /> : <RiseOutlined />;
    return (
      <Tag color={option?.color} icon={icon}>
        {option?.label}
      </Tag>
    );
  };

  const getNhomLabel = (nhom: string) => {
    const option = nhomKhoanMucList.find((o) => o.ma === nhom || o.id === nhom);
    return option?.ten || nhom;
  };

  const filteredNhomOptions = nhomKhoanMucList.filter(
    (o) => o.loai === selectedLoai
  );

  const columns = [
    {
      title: "Mã KM",
      dataIndex: "ma",
      key: "ma",
      width: 100,
      sorter: (a: KhoanMuc, b: KhoanMuc) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên khoản mục",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: KhoanMuc, b: KhoanMuc) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Loại",
      dataIndex: "loai",
      key: "loai",
      width: 130,
      render: (loai: KhoanMuc["loai"]) => getLoaiTag(loai),
    },
    {
      title: "Nhóm",
      dataIndex: "nhom",
      key: "nhom",
      width: 220,
      render: (nhom: string) => (
        <Space>
          <TagOutlined className="text-muted-foreground" />
          <Text type="secondary">{getNhomLabel(nhom)}</Text>
        </Space>
      ),
    },
    {
      title: "Loại chi phí",
      dataIndex: "loaiChiPhi",
      key: "loaiChiPhi",
      width: 140,
      render: (v?: LoaiChiPhi) => (v ? NHAN_LOAI_CHI_PHI[v] : "-"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: KhoanMuc) => (
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
            description="Bạn có chắc chắn muốn xóa khoản mục này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.khoanMuc', columns);

  // Cây 2 cấp: Nhóm khoản mục → khoản mục. Nhóm lấy tên từ danh mục Nhóm khoản
  // mục; bản ghi gắn nhóm không còn trong danh mục vẫn hiện, không bị nuốt.
  const { laCay, chuyenCheDo, duLieuCay, cotCay, rowClassName, expandable } = useBangCay<KhoanMuc>({
    khoaLuu: "khoanMuc.cheDoXem",
    danhSach: data,
    danhMuc: nhomKhoanMucList,
    layMa: (km) => km.nhom,
    cot: cfgColumns as never,
    donVi: "khoản mục",
    cotChoXuongDong: ["ten"],
    nhanTrong: "(Chưa gán nhóm)",
    onDoiCheDo: () => clearSelection(),
  });

  // Xuất Excel bám theo đúng chế độ đang xem: đang ở dạng cây thì file cũng gom
  // nhóm (dùng chung `gomTheoNhom` nên thứ tự nhóm y hệt trên màn hình).
  const exportConfig: ExportDanhMucConfig = useMemo(() => ({
    fileName: "danh-muc-khoan-muc",
    sheetName: "Khoản mục",
    title: "DANH MỤC KHOẢN MỤC",
    columns: [
      { header: "Mã", dataKey: "ma", width: 15 },
      { header: "Tên khoản mục", dataKey: "ten", width: 35 },
      { header: "Loại", dataKey: "loai", width: 15 },
      { header: "Nhóm khoản mục", dataKey: "nhom", width: 25 },
      { header: "Loại chi phí", dataKey: "loaiChiPhi", width: 18 },
    ],
    fetchData: async () => {
      const result = await khoanMucService.getPaginated({ limit: 10000 });
      return result.data.map((item) => ({
        ma: item.ma,
        ten: item.ten,
        loai: item.loai === "CHI_PHI" ? "Chi phí" : item.loai === "DOANH_THU" ? "Doanh thu" : item.loai,
        nhom: item.nhom || "",
        loaiChiPhi: item.loaiChiPhi ? NHAN_LOAI_CHI_PHI[item.loaiChiPhi] : "",
      }));
    },
    group: laCay
      ? {
          layMa: (row) => row.nhom as string,
          danhMuc: nhomKhoanMucList,
          donVi: "khoản mục",
          nhanTrong: "(Chưa gán nhóm)",
          // Nhóm đã nằm trên dòng tiêu đề — cột này chỉ lặp lại, mà lặp bằng MÃ.
          boCot: ["nhom"],
        }
      : undefined,
  }), [laCay, nhomKhoanMucList]);
  const fl = useFieldLabels('danhMuc.khoanMuc');

  const tabItems = [
    {
      key: "all",
      label: (
        <span>
          Tất cả <Tag className="ml-1">{stats.tongKhoanMuc}</Tag>
        </span>
      ),
    },
    {
      key: "CHI_PHI",
      label: (
        <span>
          <FallOutlined className="mr-1" />
          Chi phí{" "}
          <Tag color="red" className="ml-1">
            {stats.chiPhi}
          </Tag>
        </span>
      ),
    },
    {
      key: "DOANH_THU",
      label: (
        <span>
          <RiseOutlined className="mr-1" />
          Doanh thu{" "}
          <Tag color="green" className="ml-1">
            {stats.doanhThu}
          </Tag>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Table with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          className="mb-4"
          tabBarExtraContent={chuyenCheDo}
        />

        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () =>
              fetchData(
                1,
                pagination.pageSize,
                searchText,
                activeTab === "all"
                  ? undefined
                  : (activeTab as KhoanMuc["loai"])
              ),
            placeholder: "Tìm kiếm theo mã hoặc tên khoản mục...",
            width: 400,
          }}
          onReset={() => {
            setSearchText("");
            fetchData(
              1,
              pagination.pageSize,
              "",
              activeTab === "all"
                ? undefined
                : (activeTab as KhoanMuc["loai"])
            );
          }}
          actions={
            <>
              {settingsButton}
              <ImportDanhMucButton
                config={khoanMucImportConfig}
                canCreate={canCreate}
                onImported={handleImported}
              />
              <ExportDanhMucButton config={exportConfig} canExport={canExport} />
              {bulkDeleteButton}
              {canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  Thêm khoản mục
                </Button>
              )}
            </>
          }
        />

        <Table
          columns={(laCay ? cotCay : cfgColumns) as never}
          dataSource={(laCay ? duLieuCay : data) as never}
          rowKey="id"
          expandable={laCay ? expandable : undefined}
          rowClassName={laCay ? rowClassName : undefined}
          rowSelection={laCay ? undefined : rowSelection}
          loading={loading}
          scroll={{ x: 800, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} khoản mục`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa khoản mục" : "Thêm khoản mục mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={450}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item
                name="ma"
                label={fl('ma', 'Mã khoản mục')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: CP001" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                name="loai"
                label={fl('loai', 'Loại khoản mục')}
                className="mb-3"
                rules={[{ required: true, message: "Vui lòng chọn loại" }]}
              >
                <Select
                  placeholder="Chọn loại"
                  onChange={handleLoaiChange}
                  options={loaiKhoanMucOptions.map((o) => ({
                    value: o.value,
                    label: (
                      <Tag color={o.color}>
                        {o.value === "CHI_PHI" ? (
                          <FallOutlined />
                        ) : (
                          <RiseOutlined />
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
            label={fl('ten', 'Tên khoản mục')}
            className="mb-3"
            rules={[
              { required: true, message: "Vui lòng nhập tên khoản mục" },
              { max: 200, message: "Tên tối đa 200 ký tự" },
            ]}
          >
            <Input placeholder="Nhập tên khoản mục" />
          </Form.Item>

          <Form.Item
            name="nhom"
            label={fl('nhom', 'Nhóm khoản mục')}
            className="mb-0"
            rules={[{ required: true, message: "Vui lòng chọn nhóm" }]}
          >
            <Select
              placeholder="Chọn nhóm khoản mục"
              disabled={!selectedLoai}
              options={filteredNhomOptions.map((o) => ({
                value: o.ma,
                label: o.ten,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="loaiChiPhi"
            label={fl('loaiChiPhi', 'Loại chi phí')}
            className="mb-0 mt-3"
          >
            <Select
              placeholder="Chọn loại chi phí"
              allowClear
              options={LOAI_CHI_PHI_OPTIONS}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KhoanMucPage;
