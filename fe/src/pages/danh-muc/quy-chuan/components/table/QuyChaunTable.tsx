import React, { useMemo, useCallback, useEffect, useState } from "react";
import { Table, Tag, Space, Button, Popconfirm, Tabs, Tooltip, Segmented } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  ApartmentOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig, TableProps } from "antd/es/table";
import { QuyChuan, LoaiGiaoDich, HoSoChungTuRef } from "@/types";
import {
  gomTheoNhom,
  laDongNhom,
  laKhoaNhom,
  dungCotCay,
  type HangCay,
} from "@/components/table/bang-cay";
import {
  useQuyChaunHandler,
  useQuyChaunState,
} from "../../QuyChaunHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import "./QuyChaunTable.state";
// Hàng thẻ thống kê đã gỡ, nhưng state `stats` vẫn nuôi số đếm trên tab Danh
// sách — khai báo kiểu phải được nạp từ đây, không thì mất theo component cũ.
import "../stats/QuyChaunStats.state";
import { PaginationMeta } from "./QuyChaunTable.state";
import type { CheDoXem } from "@/components/table/bang-cay";

interface QuyChaunTableProps {
  onSettingsButton?: (btn: React.ReactNode) => void;
  /**
   * Checkbox chọn dòng — state do trang cha giữ (useBulkDelete).
   * Ở chế độ cây trang cha KHÔNG truyền: cột checkbox làm dòng nhóm lệch hẳn
   * một ô, cây mất luôn cái đẹp vốn là lý do dùng nó.
   */
  rowSelection?: TableProps<QuyChuan>["rowSelection"];
  cheDo: CheDoXem;
  onDoiCheDo: (v: CheDoXem) => void;
}

const NHAN_LOAI_CHI_PHI: Record<NonNullable<QuyChuan["loaiChiPhi"]>, string> = {
  CO_DINH: "Chi phí cố định",
  BIEN_DOI: "Chi phí biến đổi",
};

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

export const QuyChaunTable: React.FC<QuyChaunTableProps> = ({
  onSettingsButton,
  rowSelection,
  cheDo,
  onDoiCheDo,
}) => {
  const handler = useQuyChaunHandler();
  const { canEdit, canDelete } = usePagePermission("/danh-muc/quy-chuan");
  const [quyChaunList] = useQuyChaunState("quyChaunList", []);
  const [loading] = useQuyChaunState("loading", false);
  const [pagination] = useQuyChaunState("pagination", DEFAULT_PAGINATION);
  const [activeTab] = useQuyChaunState("activeTab", "all");
  const [searchText] = useQuyChaunState("searchText", "");
  const [loaiGiaoDichList] = useQuyChaunState("loaiGiaoDichList", [] as LoaiGiaoDich[]);

  // Convert loaiGiaoDichList to options format with color
  const loaiGiaoDichOptions = useMemo(() =>
    loaiGiaoDichList.map((lgd: LoaiGiaoDich) => ({
      value: lgd.ma,
      label: lgd.ten,
      color: lgd.color || 'default',
    })), [loaiGiaoDichList]);

  const handleEdit = (record: QuyChuan) => {
    handler.executeEvent("openModal", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("deleteQuyChuan", { id });
  };

  const handleTableChange = useCallback(
    (paginationConfig: TablePaginationConfig) => {
      const page = paginationConfig.current || 1;
      const pageSize = paginationConfig.pageSize || 10;

      handler.executeEvent("changePage", { page, pageSize });
    },
    [handler]
  );

  const handleTabChange = useCallback(
    (key: string) => {
      handler.setState("activeTab", key);

      // Fetch data with new filter
      handler.executeEvent("searchPaginated", {
        page: 1,
        limit: pagination.limit,
        keyword: searchText,
        loaiGiaoDich: key === "all" ? undefined : key,
      });
    },
    [handler, pagination.limit, searchText]
  );

  const getLoaiTag = (loai: string) => {
    const option = loaiGiaoDichOptions.find((o) => o.value === loai);
    return (
      <Tag color={option?.color || "default"}>{option?.label || loai}</Tag>
    );
  };

  const columns: ColumnsType<QuyChuan> = [
    {
      title: "Loại giao dịch",
      dataIndex: "loaiGiaoDich",
      key: "loaiGiaoDich",
      width: 150,
      render: (loai) => getLoaiTag(loai),
    },
    {
      title: "Nghiệp vụ",
      dataIndex: "nghiepVu",
      key: "nghiepVu",
      width: 280,
      // Dòng nhóm không có nghiệp vụ — so sánh thẳng là nổ khi bấm sắp xếp.
      sorter: (a, b) => (a.nghiepVu || "").localeCompare(b.nghiepVu || ""),
    },
    {
      title: "TK Nợ",
      dataIndex: "taiKhoanNo",
      key: "taiKhoanNo",
      width: 100,
      align: "center",
      render: (tk) => <Tag color="blue">{tk}</Tag>,
    },
    {
      title: "TK Có",
      dataIndex: "taiKhoanCo",
      key: "taiKhoanCo",
      width: 100,
      align: "center",
      render: (tk) => <Tag color="green">{tk}</Tag>,
    },
    {
      title: "Định khoản",
      key: "dinhKhoan",
      width: 150,
      render: (_, record) => (
        <Space>
          <Tag color="blue">Nợ {record.taiKhoanNo}</Tag>
          <SwapOutlined />
          <Tag color="green">Có {record.taiKhoanCo}</Tag>
        </Space>
      ),
    },
    {
      title: "Nhóm khoản mục",
      dataIndex: "nhomKhoanMuc",
      key: "nhomKhoanMuc",
      width: 150,
      render: (v) => v || "-",
    },
    {
      title: "Khoản mục",
      dataIndex: "khoanMuc",
      key: "khoanMuc",
      width: 130,
      render: (v) => v || "-",
    },
    {
      title: "Dòng tiền",
      dataIndex: "dongTien",
      key: "dongTien",
      width: 120,
      render: (v) => v || "-",
    },
    {
      title: "Loại chi phí",
      dataIndex: "loaiChiPhi",
      key: "loaiChiPhi",
      width: 130,
      render: (v?: QuyChuan["loaiChiPhi"]) => (v ? NHAN_LOAI_CHI_PHI[v] : "-"),
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (text) => text || "-",
    },
    {
      title: "Biên tập hồ sơ",
      dataIndex: "hoSoChungTu",
      key: "hoSoChungTu",
      width: 220,
      render: (refs?: HoSoChungTuRef[]) =>
        refs?.length ? <Space wrap>{refs.map((r) => <Tag key={r.id || r.ma}>{r.ten}</Tag>)}</Space> : "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Tooltip title="Sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Xác nhận xóa quy chuẩn này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig(
    "danhMuc.quyChuan",
    columns,
  );
  // Cột "Loại giao dịch" bỏ hẳn: nó đã là dòng nhóm cấp 1, để lại là lặp mỗi dòng.
  const columnsWithoutLoai = cfgColumns.filter((c) => c.key !== "loaiGiaoDich");

  useEffect(() => {
    onSettingsButton?.(settingsButton);
  }, [settingsButton, onSettingsButton]);

  // ===== Cây 2 cấp: loại giao dịch → quy chuẩn =====
  // Chỉ gom trong phạm vi trang đang xem (bảng vẫn phân trang phía server).
  const treeData = useMemo(
    () =>
      gomTheoNhom(quyChaunList as QuyChuan[], {
        layMa: (qc) => qc.loaiGiaoDich,
        danhMuc: loaiGiaoDichList,
        nhanTrong: "(Chưa gán loại giao dịch)",
      }),
    [quyChaunList, loaiGiaoDichList],
  );

  const nhomKeys = useMemo(() => treeData.map((r) => r.id), [treeData]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  // Mở sẵn mọi nhóm sau mỗi lần đổi trang/lọc — mặc định đóng thì người dùng
  // mở bảng ra chỉ thấy 4 dòng tiêu đề, tưởng mất dữ liệu.
  useEffect(() => {
    setExpandedKeys(nhomKeys);
  }, [nhomKeys]);

  const treeColumns = useMemo(
    () => dungCotCay(columnsWithoutLoai, { donVi: "quy chuẩn", cotChoXuongDong: ["nghiepVu"] }),
    [columnsWithoutLoai],
  );

  /**
   * Chế độ cây không có checkbox (trang cha không truyền rowSelection). Vẫn giữ
   * lớp lọc khoá dòng nhóm phòng khi bật lại: khoá `lgd:` không phải bản ghi,
   * lọt vào là xóa lô gọi API với id không tồn tại.
   */
  const treeRowSelection = useMemo<TableProps<HangCay<QuyChuan>>["rowSelection"]>(() => {
    if (!rowSelection) return undefined;
    const { onChange, ...rest } = rowSelection as NonNullable<
      TableProps<QuyChuan>["rowSelection"]
    >;
    return {
      ...rest,
      checkStrictly: false,
      onChange: (keys, rows, info) =>
        onChange?.(
          keys.filter((k) => !laKhoaNhom(k)),
          (rows as HangCay<QuyChuan>[]).filter((r) => !laDongNhom(r)) as QuyChuan[],
          info,
        ),
    } as TableProps<HangCay<QuyChuan>>["rowSelection"];
  }, [rowSelection]);

  /**
   * Dòng nhóm dùng đúng lớp của cây Sản phẩm / Khoản mục: nền xanh nhạt + chữ
   * đậm. `bg-muted/40` cũ tô lên <tr>, mà nền của antd nằm ở <td> nên bị ô che
   * gần hết — dòng nhóm trông y hệt dòng con, không thấy chỗ nào bấm thu/mở.
   */
  const hangCayClassName = useCallback(
    (r: HangCay<QuyChuan>) => (laDongNhom(r) ? "hang-nhom-cay" : ""),
    [],
  );

  const laCay = cheDo === "cay";

  const chuyenCheDo = (
    <Segmented
      size="small"
      value={cheDo}
      onChange={(v) => {
        // Sang cây mà còn kẹt bộ lọc của tab cũ thì cây chỉ có đúng một nhóm,
        // trông như mất dữ liệu — mà tab để bỏ lọc thì vừa bị ẩn đi.
        if (v === "cay" && activeTab !== "all") handleTabChange("all");
        onDoiCheDo(v as CheDoXem);
      }}
      options={[
        { value: "cay", label: "Cây", icon: <ApartmentOutlined /> },
        { value: "danhSach", label: "Danh sách", icon: <UnorderedListOutlined /> },
      ]}
    />
  );

  /** Một bảng cho cả hai chế độ — khác nhau đúng ở cột, dữ liệu và checkbox. */
  const renderBang = (columnsDanhSach: ColumnsType<QuyChuan>, scrollX: number) =>
    laCay ? (
      <Table<HangCay<QuyChuan>>
        columns={treeColumns}
        dataSource={treeData}
        rowKey="id"
        loading={loading}
        rowSelection={treeRowSelection}
        expandable={{
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (k) => setExpandedKeys([...k]),
        }}
        rowClassName={hangCayClassName}
        pagination={paginationConfig}
        onChange={handleTableChange}
        size="middle"
        scroll={{ x: 1550, y: "calc(100vh - 250px)" }}
      />
    ) : (
      <Table<QuyChuan>
        columns={columnsDanhSach}
        dataSource={quyChaunList}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        pagination={paginationConfig}
        onChange={handleTableChange}
        size="middle"
        scroll={{ x: scrollX, y: "calc(100vh - 250px)" }}
      />
    );

  // Calculate counts for tabs from stats (stats is updated with search keyword)
  const [stats] = useQuyChaunState("stats", null);

  /**
   * Số trên từng tab lấy theo mã loại giao dịch THẬT (stats.theoLoai). Bản cũ
   * đọc bốn ô cứng phieuThu/phieuChi/baoCo/baoNo nên công ty đặt loại giao dịch
   * riêng thì mọi tab đứng trơ số 0.
   *
   * Khi đang lọc một tab, API chỉ trả về đúng nhóm đó — số của tab đang mở lấy
   * từ pagination.total cho khớp bảng bên dưới.
   */
  const tabCounts = useMemo(() => {
    const theoLoai = { ...(stats?.theoLoai ?? {}) };
    if (activeTab !== "all") theoLoai[activeTab] = pagination.total;
    return { all: stats?.tongQuyChuan ?? pagination.total, theoLoai };
  }, [stats, pagination.total, activeTab]);

  const paginationConfig: TablePaginationConfig = {
    current: pagination.page,
    pageSize: pagination.limit,
    total: pagination.total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} mục`,
    pageSizeOptions: ["10", "20", "50", "100"],
  };

  const tabItems = [
    {
      key: "all",
      label: `Tất cả (${tabCounts.all})`,
      children: renderBang(cfgColumns, 1650),
    },
    ...loaiGiaoDichOptions.map((option) => ({
      key: option.value,
      label: (
        <Space>
          <Tag color={option.color}>{tabCounts.theoLoai[option.value] || 0}</Tag>
          {option.label}
        </Space>
      ),
      children: renderBang(columnsWithoutLoai, 1550),
    })),
  ];

  // Dạng cây đã gom sẵn theo loại giao dịch → hơn mười tab lọc vừa thừa vừa
  // chật, đẩy nút chuyển chế độ ra khỏi màn. Chỉ Danh sách mới cần tab.
  if (laCay) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">{chuyenCheDo}</div>
        {renderBang(columnsWithoutLoai, 1550)}
      </div>
    );
  }

  return (
    <Tabs
      items={tabItems}
      activeKey={activeTab}
      onChange={handleTabChange}
      tabBarExtraContent={chuyenCheDo}
    />
  );
};
