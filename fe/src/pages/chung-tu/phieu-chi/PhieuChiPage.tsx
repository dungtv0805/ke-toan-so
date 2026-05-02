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
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Row,
  Col,
  Breadcrumb,
  Statistic,
  Divider,
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  EyeOutlined,
  FileTextOutlined,
  WalletOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import {
  ChungTu,
  DoiTuong,
  QuyChuan,
  BoPhan,
  DuAn,
  SanPham,
  DongTien,
} from "@/types";
import {
  buildDoiTuongSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildDoiSnapshot,
  buildNhanVienSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
} from "@/utils/snapshotBuilder";
import {
  getDoiTuongTen,
  getDuAnTen,
  getChuDauTuTen,
  getBoPhanTen,
  getDoiTen,
  getNhanVienTen,
  getSanPhamTen,
  getDongTienTen,
} from "@/utils/snapshotDisplay";
import { phieuChiService } from "@/services/phieuChiService";
import { doiTuongService } from "@/services/doiTuongService";
import { taiKhoanService } from "@/services/taiKhoanService";
import { quyChauanService } from "@/services/quyChaunService";
import { boPhanService } from "@/services/boPhanService";
import { duAnService } from "@/services/duAnService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { trangThaiChungTu } from "@/mock-data/chung-tu";
import { useIntroAnimation } from "@/hooks/useIntroAnimation";
import { usePagePermission } from "@/hooks/usePagePermission";
import { z } from "zod";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const phieuChiSchema = z.object({
  ngay: z.string().min(1, "Vui lòng chọn ngày"),
  soTien: z.number().min(1, "Số tiền phải lớn hơn 0"),
  noiDung: z
    .string()
    .min(1, "Vui lòng nhập nội dung")
    .max(500, "Nội dung tối đa 500 ký tự"),
  taiKhoanNo: z.string().min(1, "Vui lòng chọn TK Nợ"),
  taiKhoanCo: z.string().min(1, "Vui lòng chọn TK Có"),
});

const PhieuChiPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/chung-tu/phieu-chi");
  const [data, setData] = useState<ChungTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ChungTu | null>(null);
  const [viewingRecord, setViewingRecord] = useState<ChungTu | null>(null);
  const [doiTuongList, setDoiTuongList] = useState<DoiTuong[]>([]);
  const [taiKhoanList, setTaiKhoanList] = useState<
    { ma: string; ten: string }[]
  >([]);
  const [quyChaunList, setQuyChaunList] = useState<QuyChuan[]>([]);
  const [boPhanList, setBoPhanList] = useState<BoPhan[]>([]);
  const [duAnList, setDuAnList] = useState<DuAn[]>([]);
  const [sanPhamList, setSanPhamList] = useState<SanPham[]>([]);
  const [dongTienList, setDongTienList] = useState<DongTien[]>([]);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    tongSo: 0,
    nhap: 0,
    choDuyet: 0,
    daDuyet: 0,
    tuChoi: 0,
    tongTien: 0,
  });
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const { showIntro } = useIntroAnimation(1500);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize
  ) => {
    setLoading(true);
    try {
      const [
        phieuList,
        doiTuong,
        taiKhoan,
        statsData,
        quyChuan,
        boPhan,
        duAn,
        sanPham,
        dongTien,
      ] = await Promise.all([
        phieuChiService.getAll({ page, limit: pageSize }),
        doiTuongService.getAll(),
        taiKhoanService.getLeafAccounts(),
        phieuChiService.getStats(),
        quyChauanService.getByLoaiGiaoDich("PHIEU_CHI"),
        boPhanService.getAll(),
        duAnService.getAll(),
        sanPhamService.getAll(),
        dongTienService.getAll(),
      ]);
      setData(phieuList.data);
      setPagination({
        current: phieuList.meta.page,
        pageSize: phieuList.meta.limit,
        total: phieuList.meta.total,
      });
      setDoiTuongList(doiTuong);
      setTaiKhoanList(taiKhoan.map((tk) => ({ ma: tk.ma, ten: tk.ten })));
      setStats(statsData);
      setQuyChaunList(quyChuan);
      setBoPhanList(boPhan);
      setDuAnList(duAn);
      setSanPhamList(sanPham);
      setDongTienList(dongTien);
    } catch (error) {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (value: string) => {
    if (value.trim()) {
      setLoading(true);
      try {
        const result = await phieuChiService.search(value);
        setData(result);
        setPagination({
          current: 1,
          pageSize: pagination.pageSize,
          total: result.length,
        });
      } catch (error) {
        message.error("Lỗi khi tìm kiếm");
      } finally {
        setLoading(false);
      }
    } else {
      fetchData();
    }
  };

  const openModal = (record?: ChungTu) => {
    if (record) {
      if (record.trangThai === "DA_DUYET") {
        message.warning("Không thể sửa phiếu đã duyệt");
        return;
      }
      setEditingRecord(record);
      form.setFieldsValue({
        ...record,
        ngay: dayjs(record.ngay),
      });
    } else {
      setEditingRecord(null);
      form.resetFields();
      // Set default values from first quy chuan if available
      const defaultQuyChuan = quyChaunList.length > 0 ? quyChaunList[0] : null;
      form.setFieldsValue({
        ngay: dayjs(),
        loaiGiaoDich: defaultQuyChuan?.nghiepVu || "",
        taiKhoanNo: defaultQuyChuan?.taiKhoanNo || "331",
        taiKhoanCo: defaultQuyChuan?.taiKhoanCo || "111",
      });
    }
    setModalVisible(true);
  };

  const handleLoaiGiaoDichChange = (value: string) => {
    // Find matching quy chuan from config
    const quyChuan = quyChaunList.find((qc) => qc.nghiepVu === value);
    if (quyChuan) {
      form.setFieldsValue({
        taiKhoanNo: quyChuan.taiKhoanNo,
        taiKhoanCo: quyChuan.taiKhoanCo,
        noiDung: quyChuan.moTa || "",
      });
    }
  };

  const handleDoiTuongChange = (value: string) => {
    const doiTuong = doiTuongList.find((d) => d.id === value);
    if (doiTuong) {
      form.setFieldsValue({
        doiTuongTen: doiTuong.ten,
        doiTuongSnapshot: buildDoiTuongSnapshot(doiTuong),
      });
    } else {
      form.setFieldsValue({
        doiTuongTen: undefined,
        doiTuongSnapshot: undefined,
      });
    }
  };

  const handleBoPhanChange = (value: string) => {
    const boPhan = boPhanList.find((b) => b.id === value);
    if (boPhan) {
      form.setFieldsValue({
        boPhanTen: boPhan.ten,
        boPhanSnapshot: buildBoPhanSnapshot(boPhan),
      });
    } else {
      form.setFieldsValue({ boPhanTen: undefined, boPhanSnapshot: undefined });
    }
  };

  const handleDoiChange = (value: string) => {
    const doi = boPhanList.find((bp) => bp.id === value);
    if (doi) {
      form.setFieldsValue({
        doiTen: doi.ten,
        doiSnapshot: buildDoiSnapshot(doi),
      });
    } else {
      form.setFieldsValue({ doiTen: undefined, doiSnapshot: undefined });
    }
  };

  const handleNhanVienChange = (value: string) => {
    const nhanVien = doiTuongList.find((d) => d.id === value);
    if (nhanVien) {
      form.setFieldsValue({
        nhanVienTen: nhanVien.ten,
        nhanVienSnapshot: buildNhanVienSnapshot(nhanVien),
      });
    } else {
      form.setFieldsValue({
        nhanVienTen: undefined,
        nhanVienSnapshot: undefined,
      });
    }
  };

  const handleDuAnChange = (value: string) => {
    const duAn = duAnList.find((da) => da.id === value);
    if (duAn) {
      form.setFieldsValue({
        duAnTen: duAn.ten,
        chuDauTuTen: duAn.chuDuAn,
        duAnSnapshot: buildDuAnSnapshot(duAn),
      });
    } else {
      form.setFieldsValue({
        duAnTen: undefined,
        chuDauTuTen: undefined,
        duAnSnapshot: undefined,
      });
    }
  };

  const handleSanPhamChange = (value: string) => {
    const sanPham = sanPhamList.find((sp) => sp.id === value);
    if (sanPham) {
      form.setFieldsValue({
        sanPhamTen: sanPham.ten,
        sanPhamSnapshot: buildSanPhamSnapshot(sanPham),
      });
    } else {
      form.setFieldsValue({
        sanPhamTen: undefined,
        sanPhamSnapshot: undefined,
      });
    }
  };

  const handleDongTienChange = (value: string) => {
    const dongTien = dongTienList.find((dt) => dt.id === value);
    if (dongTien) {
      form.setFieldsValue({
        dongTienTen: dongTien.ten,
        dongTienSnapshot: buildDongTienSnapshot(dongTien),
      });
    } else {
      form.setFieldsValue({
        dongTienTen: undefined,
        dongTienSnapshot: undefined,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const submitData = {
        ...values,
        ngay: values.ngay.format("YYYY-MM-DD"),
      };

      const validation = phieuChiSchema.safeParse(submitData);
      if (!validation.success) {
        message.error(validation.error.errors[0].message);
        return;
      }

      setLoading(true);
      if (editingRecord) {
        // Only send allowed fields for update including snapshots
        const updateData = {
          ngay: submitData.ngay,
          soTien: submitData.soTien,
          noiDung: submitData.noiDung,
          doiTuongId: submitData.doiTuongId || undefined,
          duAnId: submitData.duAnId || undefined,
          boPhanId: submitData.boPhanId || undefined,
          doiId: submitData.doiId || undefined,
          nhanVienId: submitData.nhanVienId || undefined,
          sanPhamId: submitData.sanPhamId || undefined,
          dongTienId: submitData.dongTienId || undefined,
          taiKhoanNo: submitData.taiKhoanNo,
          taiKhoanCo: submitData.taiKhoanCo,
          // Include snapshots
          doiTuongSnapshot: submitData.doiTuongSnapshot,
          duAnSnapshot: submitData.duAnSnapshot,
          boPhanSnapshot: submitData.boPhanSnapshot,
          doiSnapshot: submitData.doiSnapshot,
          nhanVienSnapshot: submitData.nhanVienSnapshot,
          sanPhamSnapshot: submitData.sanPhamSnapshot,
          dongTienSnapshot: submitData.dongTienSnapshot,
        };
        await phieuChiService.update(editingRecord.id, updateData);
        message.success("Cập nhật phiếu chi thành công");
      } else {
        await phieuChiService.create(submitData);
        message.success("Tạo phiếu chi thành công");
      }
      setModalVisible(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { errorFields?: unknown; message?: string };
      if (err.errorFields) return;
      message.error(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await phieuChiService.remove(id);
      message.success("Xóa phiếu chi thành công");
      fetchData();
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Không thể xóa phiếu");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setLoading(true);
      await phieuChiService.approve(id);
      message.success("Duyệt phiếu thành công");
      fetchData();
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Không thể duyệt phiếu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      setLoading(true);
      await phieuChiService.submitForApproval(id);
      message.success("Đã gửi phiếu chờ duyệt");
      fetchData();
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Lỗi");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const getTrangThaiInfo = (trangThai: string) => {
    return (
      trangThaiChungTu.find((t) => t.value === trangThai) || {
        label: trangThai,
        color: "default",
      }
    );
  };

  const columns = [
    {
      title: "Số phiếu",
      dataIndex: "soPhieu",
      key: "soPhieu",
      width: 130,
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "ngay",
      key: "ngay",
      width: 110,
      sorter: (a: ChungTu, b: ChungTu) =>
        new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Đối tượng nợ",
      key: "doiTuongTen",
      ellipsis: true,
      render: (_: unknown, record: ChungTu) => {
        const ten = getDoiTuongTen(record);
        return ten || <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Nội dung",
      dataIndex: "noiDung",
      key: "noiDung",
      ellipsis: true,
    },
    {
      title: "Số tiền",
      dataIndex: "soTien",
      key: "soTien",
      width: 140,
      align: "right" as const,
      sorter: (a: ChungTu, b: ChungTu) => a.soTien - b.soTien,
      render: (value: number) => (
        <Text strong className="text-red-600">
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Dự án",
      key: "duAnTen",
      width: 120,
      ellipsis: true,
      render: (_: unknown, record: ChungTu) => {
        const ten = getDuAnTen(record);
        return ten || <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Chủ đầu tư",
      key: "chuDauTuTen",
      width: 120,
      ellipsis: true,
      render: (_: unknown, record: ChungTu) => {
        const ten = getChuDauTuTen(record);
        return ten || <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Sản phẩm",
      key: "sanPhamTen",
      width: 120,
      ellipsis: true,
      render: (_: unknown, record: ChungTu) => {
        const ten = getSanPhamTen(record);
        return ten || <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Dòng tiền",
      key: "dongTienTen",
      width: 120,
      ellipsis: true,
      render: (_: unknown, record: ChungTu) => {
        const ten = getDongTienTen(record);
        return ten || <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Hạch toán",
      key: "hachToan",
      width: 120,
      render: (_: unknown, record: ChungTu) => (
        <Text type="secondary" className="text-xs">
          Nợ {record.taiKhoanNo} / Có {record.taiKhoanCo}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 110,
      filters: trangThaiChungTu.map((t) => ({ text: t.label, value: t.value })),
      onFilter: (value: unknown, record: ChungTu) => record.trangThai === value,
      render: (trangThai: string) => {
        const info = getTrangThaiInfo(trangThai);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      align: "center" as const,
      render: (_: unknown, record: ChungTu) => (
        <Space size="small">
          <Tooltip title="Xem">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setViewingRecord(record);
                setViewModalVisible(true);
              }}
            />
          </Tooltip>

          {record.trangThai === "NHAP" && (
            <>
              {canEdit && (
                <Tooltip title="Sửa">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openModal(record)}
                    className="!text-primary"
                  />
                </Tooltip>
              )}
              <Tooltip title="Gửi duyệt">
                <Button
                  type="text"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => handleSubmitForApproval(record.id)}
                  className="!text-blue-500"
                />
              </Tooltip>
              {canDelete && (
                <Popconfirm
                  title="Xác nhận xóa?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    className="!text-destructive"
                  />
                </Popconfirm>
              )}
            </>
          )}

          {record.trangThai === "CHO_DUYET" && (
            <>
              <Tooltip title="Duyệt">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record.id)}
                  className="!text-green-500"
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseCircleOutlined />}
                  className="!text-destructive"
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
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
          { title: "Chứng từ" },
          { title: "Phiếu chi" },
        ]}
      />

      {/* Page Header - Auto hide after 1.5s */}
      <div
        className={`page-header text-white overflow-hidden transition-all duration-700 ease-out ${
          showIntro ? "max-h-32 p-6 opacity-100" : "max-h-0 p-0 opacity-0 -mt-6"
        }`}
        style={{
          background:
            "linear-gradient(135deg, hsl(0 60% 45%), hsl(20 60% 40%))",
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <WalletOutlined className="text-2xl animate-pulse" />
            <Title level={3} className="!text-white !mb-0">
              Phiếu Chi
            </Title>
          </div>
          <Text className="text-white/80">
            Quản lý phiếu chi tiền mặt và chuyển khoản
          </Text>
        </div>
      </div>

      {/* Collapsible Stats Cards */}
      <Card className="shadow-sm transition-all duration-500" size="small">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setStatsCollapsed(!statsCollapsed)}
        >
          <Text
            strong
            className="text-muted-foreground uppercase text-xs tracking-wider"
          >
            Thống kê tổng quan
          </Text>
          <Button
            type="text"
            size="small"
            icon={statsCollapsed ? <DownOutlined /> : <UpOutlined />}
          >
            {statsCollapsed ? "Mở rộng" : "Thu gọn"}
          </Button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            statsCollapsed
              ? "max-h-0 opacity-0 mt-0"
              : "max-h-96 opacity-100 mt-4"
          }`}
        >
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <Card className="stat-card" size="small">
                <Statistic
                  title="Tổng phiếu"
                  value={stats.tongSo}
                  prefix={<FileTextOutlined className="text-blue-500" />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card stat-card-warning" size="small">
                <Statistic
                  title="Chờ duyệt"
                  value={stats.choDuyet}
                  valueStyle={{ color: "#faad14" }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card stat-card-success" size="small">
                <Statistic
                  title="Đã duyệt"
                  value={stats.daDuyet}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card stat-card-destructive" size="small">
                <Statistic
                  title="Tổng chi"
                  value={stats.tongTien}
                  prefix={<WalletOutlined />}
                  formatter={(value) =>
                    `${(Number(value) / 1000000).toFixed(0)}M`
                  }
                  valueStyle={{ color: "#ef4444" }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </Card>

      {/* Main Card */}
      <Card className="shadow-sm">
        {/* Toolbar */}
        <div className="mb-4">
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} md={12}>
              <Space wrap>
                <Input
                  placeholder="Tìm theo số phiếu, nội dung, đối tượng..."
                  prefix={<SearchOutlined className="text-muted-foreground" />}
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
                      fetchData();
                    }}
                  />
                </Tooltip>
              </Space>
            </Col>
            <Col xs={24} md={12} className="text-right">
              <Space>
                {canExport && (
                  <Button icon={<ExportOutlined />}>Xuất Excel</Button>
                )}
                {canCreate && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openModal()}
                    danger
                  >
                    Tạo phiếu chi
                  </Button>
                )}
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
            showTotal: (total) => `Tổng ${total} phiếu`,
            onChange: (page, pageSize) => {
              fetchData(page, pageSize);
            },
          }}
          size="middle"
          scroll={{ x: 1600 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <WalletOutlined className="text-red-500" />
            <span>{editingRecord ? "Sửa phiếu chi" : "Tạo phiếu chi mới"}</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Tạo phiếu"}
        cancelText="Hủy"
        width={800}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="ngay"
                label="Ngày chứng từ"
                rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
              >
                <DatePicker format="DD/MM/YYYY" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="loaiGiaoDich" label="Loại giao dịch">
                <Select
                  placeholder="Chọn loại giao dịch"
                  onChange={handleLoaiGiaoDichChange}
                  options={quyChaunList.map((q) => ({
                    value: q.nghiepVu,
                    label: q.nghiepVu,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="soTien"
                label="Số tiền"
                rules={[{ required: true, message: "Vui lòng nhập số tiền" }]}
              >
                <InputNumber
                  min={0}
                  className="w-full"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) =>
                    (value
                      ? Number(value.replace(/\$\s?|(,*)/g, ""))
                      : 0) as unknown as 0
                  }
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="doiTuongId" label="Đối tượng nợ">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn đối tượng nợ"
                  optionFilterProp="label"
                  onChange={handleDoiTuongChange}
                  options={doiTuongList.map((d) => ({
                    value: d.id,
                    label: `${d.ma} - ${d.ten}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="doiTuongTen" label="Tên đối tượng" hidden>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Phân bổ chi phí</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="duAnId" label="Dự án">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn dự án"
                  optionFilterProp="label"
                  onChange={handleDuAnChange}
                  options={duAnList.map((da) => ({
                    value: da.id,
                    label: `${da.ma} - ${da.ten}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="duAnTen" hidden>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="chuDauTuTen" label="Chủ đầu tư">
                <Input disabled placeholder="Tự động theo dự án" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="boPhanId" label="Bộ phận">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn bộ phận"
                  optionFilterProp="label"
                  onChange={handleBoPhanChange}
                  options={boPhanList.map((bp) => ({
                    value: bp.id,
                    label: `${bp.ma} - ${bp.ten}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="boPhanTen" hidden>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="doiId" label="Đội thi công">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn đội thi công"
                  optionFilterProp="label"
                  onChange={handleDoiChange}
                  options={boPhanList
                    .filter((bp) => bp.ten.toLowerCase().includes("đội"))
                    .map((bp) => ({
                      value: bp.id,
                      label: `${bp.ma} - ${bp.ten}`,
                    }))}
                />
              </Form.Item>
              <Form.Item name="doiTen" hidden>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nhanVienId" label="Nhân viên phụ trách">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn nhân viên"
                  optionFilterProp="label"
                  onChange={handleNhanVienChange}
                  options={doiTuongList
                    .filter((dt) => dt.loai === "NHAN_VIEN")
                    .map((nv) => ({
                      value: nv.id,
                      label: `${nv.ma} - ${nv.ten}`,
                    }))}
                />
              </Form.Item>
              <Form.Item name="nhanVienTen" hidden>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sanPhamId" label="Sản phẩm/Vật tư">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn sản phẩm"
                  optionFilterProp="label"
                  onChange={handleSanPhamChange}
                  options={sanPhamList.map((sp) => ({
                    value: sp.id,
                    label: `${sp.ma} - ${sp.ten}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="sanPhamTen" hidden>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dongTienId" label="Loại dòng tiền">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn loại dòng tiền"
                  optionFilterProp="label"
                  onChange={handleDongTienChange}
                  options={dongTienList.map((dt) => ({
                    value: dt.id,
                    label: `${dt.ma} - ${dt.ten}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="dongTienTen" hidden>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="noiDung"
            label="Nội dung"
            rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
          >
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Nội dung phiếu chi" />
          </Form.Item>

          <Divider>Định khoản tự động</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="taiKhoanNo"
                label="Tài khoản Nợ"
                rules={[{ required: true, message: "Vui lòng chọn TK Nợ" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={taiKhoanList.map((tk) => ({
                    value: tk.ma,
                    label: `${tk.ma} - ${tk.ten}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="taiKhoanCo"
                label="Tài khoản Có"
                rules={[{ required: true, message: "Vui lòng chọn TK Có" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={taiKhoanList.map((tk) => ({
                    value: tk.ma,
                    label: `${tk.ma} - ${tk.ten}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Ghi chú thêm (nếu có)"
            />
          </Form.Item>

          {/* Hidden snapshot fields */}
          <Form.Item name="doiTuongSnapshot" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="duAnSnapshot" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="boPhanSnapshot" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="doiSnapshot" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="nhanVienSnapshot" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="sanPhamSnapshot" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="dongTienSnapshot" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <WalletOutlined className="text-red-500" />
            <span>Chi tiết phiếu chi</span>
          </div>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={700}
      >
        {viewingRecord && (
          <Descriptions bordered column={2} className="mt-4">
            <Descriptions.Item label="Số phiếu" span={1}>
              <Text strong>{viewingRecord.soPhieu}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày" span={1}>
              {dayjs(viewingRecord.ngay).format("DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Đối tượng nợ" span={2}>
              {getDoiTuongTen(viewingRecord) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Dự án" span={1}>
              {getDuAnTen(viewingRecord) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Chủ đầu tư" span={1}>
              {getChuDauTuTen(viewingRecord) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bộ phận" span={1}>
              {getBoPhanTen(viewingRecord) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Đội" span={1}>
              {getDoiTen(viewingRecord) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Nhân viên" span={1}>
              {getNhanVienTen(viewingRecord) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Sản phẩm" span={1}>
              {getSanPhamTen(viewingRecord) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Dòng tiền" span={2}>
              {getDongTienTen(viewingRecord) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Nội dung" span={2}>
              {viewingRecord.noiDung}
            </Descriptions.Item>
            <Descriptions.Item label="Số tiền" span={2}>
              <Text strong className="text-red-600 text-lg">
                {formatCurrency(viewingRecord.soTien)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="TK Nợ" span={1}>
              {viewingRecord.taiKhoanNo}
            </Descriptions.Item>
            <Descriptions.Item label="TK Có" span={1}>
              {viewingRecord.taiKhoanCo}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái" span={1}>
              <Tag color={getTrangThaiInfo(viewingRecord.trangThai).color}>
                {getTrangThaiInfo(viewingRecord.trangThai).label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Người tạo" span={1}>
              {viewingRecord.nguoiTao}
            </Descriptions.Item>
            {viewingRecord.nguoiDuyet && (
              <>
                <Descriptions.Item label="Người duyệt" span={1}>
                  {viewingRecord.nguoiDuyet}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày duyệt" span={1}>
                  {viewingRecord.ngayDuyet}
                </Descriptions.Item>
              </>
            )}
            {viewingRecord.ghiChu && (
              <Descriptions.Item label="Ghi chú" span={2}>
                {viewingRecord.ghiChu}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PhieuChiPage;
