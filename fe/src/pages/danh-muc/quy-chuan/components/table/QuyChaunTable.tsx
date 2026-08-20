import React, { useMemo, useCallback, useEffect, useState } from "react";
import { Table, Tag, Space, Button, Popconfirm, Tabs, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, SwapOutlined } from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig, TableProps } from "antd/es/table";
import { QuyChuan, LoaiGiaoDich, HoSoChungTuRef } from "@/types";
import {
  gomTheoLoaiGiaoDich,
  laDongNhom,
  laKhoaNhom,
  type QuyChuanRow,
} from "../../lib/gomNhom";
import {
  useQuyChaunHandler,
  useQuyChaunState,
} from "../../QuyChaunHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import "./QuyChaunTable.state";
import { PaginationMeta } from "./QuyChaunTable.state";

interface QuyChaunTableProps {
  onSettingsButton?: (btn: React.ReactNode) => void;
  /** Checkbox chọn dòng — state do trang cha giữ (useBulkDelete). */
  rowSelection?: TableProps<QuyChuan>["rowSelection"];
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

export const QuyChaunTable: React.FC<QuyChaunTableProps> = ({ onSettingsButton, rowSelection }) => {
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
      width: 220,
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
    () => gomTheoLoaiGiaoDich(quyChaunList, loaiGiaoDichList),
    [quyChaunList, loaiGiaoDichList],
  );

  const nhomKeys = useMemo(() => treeData.map((r) => r.id), [treeData]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  // Mở sẵn mọi nhóm sau mỗi lần đổi trang/lọc — mặc định đóng thì người dùng
  // mở bảng ra chỉ thấy 4 dòng tiêu đề, tưởng mất dữ liệu.
  useEffect(() => {
    setExpandedKeys(nhomKeys);
  }, [nhomKeys]);

  // Dòng nhóm chỉ hiện nhãn ở cột đầu, các cột còn lại để trống.
  const treeColumns = useMemo(
    () =>
      columnsWithoutLoai.map((col, i) => ({
        ...col,
        render: (value: unknown, record: QuyChuanRow, index: number) => {
          if (laDongNhom(record)) {
            if (i > 0) return null;
            return (
              <Space>
                <Tag color={record.color}>{record.ten}</Tag>
                <span className="text-xs text-muted-foreground">
                  {record.soLuong} quy chuẩn
                </span>
              </Space>
            );
          }
          const goc = col.render as
            | ((v: unknown, r: QuyChuan, i: number) => React.ReactNode)
            | undefined;
          return goc ? goc(value, record as QuyChuan, index) : (value as React.ReactNode);
        },
      })) as ColumnsType<QuyChuanRow>,
    [columnsWithoutLoai],
  );

  // Khoá dòng nhóm KHÔNG được lọt vào danh sách xóa lô — nó không phải bản ghi.
  const treeRowSelection = useMemo<TableProps<QuyChuanRow>["rowSelection"]>(() => {
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
          (rows as QuyChuanRow[]).filter((r) => !laDongNhom(r)) as QuyChuan[],
          info,
        ),
    } as TableProps<QuyChuanRow>["rowSelection"];
  }, [rowSelection]);

  // Calculate counts for tabs from stats (stats is updated with search keyword)
  const [stats] = useQuyChaunState("stats", null);

  const tabCounts = useMemo(() => {
    if (!stats) {
      return {
        all: pagination.total,
        PHIEU_THU: 0,
        PHIEU_CHI: 0,
        BAO_CO: 0,
        BAO_NO: 0,
      };
    }

    // Stats is already filtered by keyword from API
    // When filtering by tab, show pagination.total for active tab
    if (activeTab !== "all") {
      return {
        all: stats.tongQuyChuan,
        PHIEU_THU:
          activeTab === "PHIEU_THU" ? pagination.total : stats.phieuThu,
        PHIEU_CHI:
          activeTab === "PHIEU_CHI" ? pagination.total : stats.phieuChi,
        BAO_CO: activeTab === "BAO_CO" ? pagination.total : stats.baoCo,
        BAO_NO: activeTab === "BAO_NO" ? pagination.total : stats.baoNo,
      };
    }

    // Default: show stats counts (already filtered by keyword)
    return {
      all: stats.tongQuyChuan,
      PHIEU_THU: stats.phieuThu,
      PHIEU_CHI: stats.phieuChi,
      BAO_CO: stats.baoCo,
      BAO_NO: stats.baoNo,
    };
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
      children: (
        <Table<QuyChuanRow>
          columns={treeColumns}
          dataSource={treeData}
          rowKey="id"
          loading={loading}
          rowSelection={treeRowSelection}
          expandable={{ expandedRowKeys: expandedKeys, onExpandedRowsChange: (k) => setExpandedKeys([...k]) }}
          pagination={paginationConfig}
          onChange={handleTableChange}
          size="middle"
          scroll={{ x: 1550, y: "calc(100vh - 250px)" }}
        />
      ),
    },
    ...loaiGiaoDichOptions.map((option) => ({
      key: option.value,
      label: (
        <Space>
          <Tag color={option.color}>
            {tabCounts[option.value as keyof typeof tabCounts] || 0}
          </Tag>
          {option.label}
        </Space>
      ),
      children: (
        <Table<QuyChuanRow>
          columns={treeColumns}
          dataSource={treeData}
          rowKey="id"
          loading={loading}
          rowSelection={treeRowSelection}
          expandable={{ expandedRowKeys: expandedKeys, onExpandedRowsChange: (k) => setExpandedKeys([...k]) }}
          pagination={paginationConfig}
          onChange={handleTableChange}
          size="middle"
          scroll={{ x: 1550, y: "calc(100vh - 285px)" }}
        />
      ),
    })),
  ];

  return (
    <Tabs items={tabItems} activeKey={activeTab} onChange={handleTabChange} />
  );
};
