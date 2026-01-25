import { useMemo } from "react";
import { Table, Tag, Button, Space, Tooltip } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { NhatKyChung } from "@/types";
import { useTableColumnResize } from "@/hooks/useTableColumnResize";
import {
  getNkcDoiTuongMa,
  getNkcDoiTuongTen,
  getNkcDoiTuong2Ma,
  getNkcDoiTuong2Ten,
  getNkcDuAnMa,
  getNkcDuAnTen,
  getNkcChuDauTuMa,
  getNkcChuDauTuTen,
  getNkcBoPhanMa,
  getNkcBoPhanTen,
  getNkcDoiMa,
  getNkcDoiTen,
  getNkcNhanVienMa,
  getNkcNhanVienTen,
  getNkcSanPhamMa,
  getNkcSanPhamTen,
  getNkcDongTienMa,
  getNkcDongTienTen,
  getNkcKhoanMucMa,
  getNkcKhoanMucTen,
} from "@/utils/snapshotDisplay";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import { FilterDrawer } from "../filter-drawer/FilterDrawer";
import { EntryActions } from "../entry-actions/EntryActions";
import { DetailPopover } from "./DetailPopover";
import dayjs from "dayjs";
import type { TablePaginationConfig } from "antd/es/table";
import type { ColumnType } from "antd/es/table";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN").format(value);
};

// Render text với ellipsis và tooltip - compact style
const renderEllipsisText = (text: string | undefined | null) => {
  if (!text) return <span className="text-gray-400">-</span>;
  return (
    <Tooltip title={text} placement="topLeft">
      <span className="excel-cell-text">{text}</span>
    </Tooltip>
  );
};

// Default column widths
const DEFAULT_WIDTHS: Record<string, number> = {
  ngay: 85,
  soPhieu: 90,
  loaiChungTu: 70,
  loaiGiaoDich: 90,
  dienGiai: 150,
  taiKhoanNo: 55,
  taiKhoanCo: 55,
  soTien: 100,
  doiTuongMa: 65,
  doiTuong: 110,
  doiTuong2Ma: 65,
  doiTuong2: 110,
  chuDauTuMa: 65,
  chuDauTu: 110,
  duAnMa: 65,
  duAn: 110,
  sanPhamMa: 65,
  sanPham: 110,
  boPhanMa: 55,
  boPhan: 90,
  doiMa: 55,
  doi: 90,
  nhanVienMa: 55,
  nhanVien: 90,
  dongTienMa: 55,
  dongTien: 100,
  khoanMucMa: 55,
  khoanMuc: 100,
  nguoiGiaoDich: 100,
  diaChi: 120,
  ghiChu: 120,
  action: 70,
};

// Column definitions without width (static)
const getColumnDefinitions = (): Omit<ColumnType<NhatKyChung>, 'width'>[] => [
  {
    title: "Ngày",
    dataIndex: "ngay",
    key: "ngay",
    sorter: (a: NhatKyChung, b: NhatKyChung) =>
      new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
    render: (date: string) => dayjs(date).format("DD/MM/YY"),
  },
  {
    title: "Số CT",
    dataIndex: "soPhieu",
    key: "soPhieu",
    render: (text: string, record: NhatKyChung) => (
      <span
        className={`font-semibold ${
          record.loaiChungTu === "Phiếu thu"
            ? "text-green-600"
            : "text-red-600"
        }`}
      >
        {text}
      </span>
    ),
  },
  {
    title: "Loại",
    dataIndex: "loaiChungTu",
    key: "loaiChungTu",
    filters: [
      { text: "Thu", value: "Phiếu thu" },
      { text: "Chi", value: "Phiếu chi" },
    ],
    onFilter: (value: unknown, record: NhatKyChung) =>
      record.loaiChungTu === value,
    render: (loai: string) => (
      <Tag color={loai === "Phiếu thu" ? "success" : "error"} className="excel-tag">
        {loai === "Phiếu thu" ? "Thu" : "Chi"}
      </Tag>
    ),
  },
  {
    title: "Nghiệp vụ",
    key: "loaiGiaoDich",
    render: (_: unknown, record: NhatKyChung) => {
      const loaiGD = record.danhMuc?.loaiGiaoDich?.ten;
      return loaiGD ? (
        <Tooltip title={loaiGD}>
          <span className="excel-cell-text">{loaiGD}</span>
        </Tooltip>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    title: "Diễn giải",
    dataIndex: "dienGiai",
    key: "dienGiai",
    render: (text: string) => renderEllipsisText(text),
  },
  {
    title: "TK Nợ",
    dataIndex: "taiKhoanNo",
    key: "taiKhoanNo",
    align: "center" as const,
    render: (text: string, record: NhatKyChung) => {
      const data = record.danhMuc?.taiKhoanNo;
      return data ? (
        <DetailPopover type="taiKhoan" data={data}>
          <span className="cursor-pointer text-orange-600 font-medium">{text}</span>
        </DetailPopover>
      ) : <span className="text-orange-600">{text}</span>;
    },
  },
  {
    title: "TK Có",
    dataIndex: "taiKhoanCo",
    key: "taiKhoanCo",
    align: "center" as const,
    render: (text: string, record: NhatKyChung) => {
      const data = record.danhMuc?.taiKhoanCo;
      return data ? (
        <DetailPopover type="taiKhoan" data={data}>
          <span className="cursor-pointer text-green-600 font-medium">{text}</span>
        </DetailPopover>
      ) : <span className="text-green-600">{text}</span>;
    },
  },
  {
    title: "Số tiền",
    dataIndex: "soTien",
    key: "soTien",
    align: "right" as const,
    sorter: (a: NhatKyChung, b: NhatKyChung) => a.soTien - b.soTien,
    render: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
  },
  {
    title: "Mã ĐT nợ",
    key: "doiTuongMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDoiTuongMa(record);
      const data = record.danhMuc?.doiTuong;
      return ma ? (
        <DetailPopover type="doiTuong" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "ĐT nợ",
    key: "doiTuong",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDoiTuongTen(record);
      const data = record.danhMuc?.doiTuong;
      return data ? (
        <DetailPopover type="doiTuong" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã ĐT có",
    key: "doiTuong2Ma",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDoiTuong2Ma(record);
      const data = record.danhMuc?.doiTuong2;
      return ma ? (
        <DetailPopover type="doiTuong" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "ĐT có",
    key: "doiTuong2",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDoiTuong2Ten(record);
      const data = record.danhMuc?.doiTuong2;
      return data ? (
        <DetailPopover type="doiTuong" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã CĐT",
    key: "chuDauTuMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcChuDauTuMa(record);
      const data = record.danhMuc?.duAn ? {
        ma: record.danhMuc.duAn.chuDauTuMa,
        ten: record.danhMuc.duAn.chuDauTuTen,
      } : null;
      return ma ? (
        <DetailPopover type="doiTuong" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "CĐT",
    key: "chuDauTu",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcChuDauTuTen(record);
      const data = record.danhMuc?.duAn ? {
        ma: record.danhMuc.duAn.chuDauTuMa,
        ten: record.danhMuc.duAn.chuDauTuTen,
      } : null;
      return data ? (
        <DetailPopover type="doiTuong" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã DA",
    key: "duAnMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDuAnMa(record);
      const data = record.danhMuc?.duAn;
      return ma ? (
        <DetailPopover type="duAn" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "Dự án",
    key: "duAn",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDuAnTen(record);
      const data = record.danhMuc?.duAn;
      return data ? (
        <DetailPopover type="duAn" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã SP",
    key: "sanPhamMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcSanPhamMa(record);
      const data = record.danhMuc?.sanPham;
      return ma ? (
        <DetailPopover type="sanPham" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "SP",
    key: "sanPham",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcSanPhamTen(record);
      const data = record.danhMuc?.sanPham;
      return data ? (
        <DetailPopover type="sanPham" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã BP",
    key: "boPhanMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcBoPhanMa(record);
      const data = record.danhMuc?.boPhan;
      return ma ? (
        <DetailPopover type="boPhan" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "BP",
    key: "boPhan",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcBoPhanTen(record);
      const data = record.danhMuc?.boPhan;
      return data ? (
        <DetailPopover type="boPhan" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã Đội",
    key: "doiMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDoiMa(record);
      const data = record.danhMuc?.doi;
      return ma ? (
        <DetailPopover type="boPhan" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "Đội",
    key: "doi",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDoiTen(record);
      const data = record.danhMuc?.doi;
      return data ? (
        <DetailPopover type="boPhan" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã NV",
    key: "nhanVienMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcNhanVienMa(record);
      const data = record.danhMuc?.nhanVien;
      return ma ? (
        <DetailPopover type="nhanVien" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "NV",
    key: "nhanVien",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcNhanVienTen(record);
      const data = record.danhMuc?.nhanVien;
      return data ? (
        <DetailPopover type="nhanVien" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã DT",
    key: "dongTienMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcDongTienMa(record);
      const data = record.danhMuc?.dongTien;
      return ma ? (
        <DetailPopover type="dongTien" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "Dòng tiền",
    key: "dongTien",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcDongTienTen(record);
      const data = record.danhMuc?.dongTien;
      return data ? (
        <DetailPopover type="dongTien" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Mã KM",
    key: "khoanMucMa",
    render: (_: unknown, record: NhatKyChung) => {
      const ma = getNkcKhoanMucMa(record);
      const data = record.danhMuc?.khoanMuc;
      return ma ? (
        <DetailPopover type="khoanMuc" data={data}>
          <span className="cursor-pointer text-blue-600">{ma}</span>
        </DetailPopover>
      ) : <span className="text-gray-400">-</span>;
    },
  },
  {
    title: "Khoản mục",
    key: "khoanMuc",
    render: (_: unknown, record: NhatKyChung) => {
      const ten = getNkcKhoanMucTen(record);
      const data = record.danhMuc?.khoanMuc;
      return data ? (
        <DetailPopover type="khoanMuc" data={data}>
          {renderEllipsisText(ten)}
        </DetailPopover>
      ) : renderEllipsisText(ten);
    },
  },
  {
    title: "Người GD",
    dataIndex: "nguoiGiaoDich",
    key: "nguoiGiaoDich",
    render: (text: string) => renderEllipsisText(text),
  },
  {
    title: "Địa chỉ",
    dataIndex: "diaChi",
    key: "diaChi",
    render: (text: string) => renderEllipsisText(text),
  },
  {
    title: "Ghi chú",
    dataIndex: "ghiChu",
    key: "ghiChu",
    render: (text: string) => renderEllipsisText(text),
  },
  {
    title: "",
    key: "action",
    align: "center" as const,
    fixed: "right" as const,
    render: (_: unknown, record: NhatKyChung) => (
      <EntryActions entry={record} />
    ),
  },
];

// Static column definitions (created once)
const COLUMN_DEFINITIONS = getColumnDefinitions();

// Calculate total width
const TOTAL_WIDTH = Object.values(DEFAULT_WIDTHS).reduce((sum, w) => sum + w, 0);

export function EntryListTab() {
  const handler = useNhatKyChungHandler();
  const [data] = useNhatKyChungState("data", []);
  const [loading] = useNhatKyChungState("loading", false);
  const [pagination] = useNhatKyChungState("pagination", {
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });

  // Enable column resize via DOM manipulation (no React re-renders)
  useTableColumnResize("resizable-table");

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    const { current = 1, pageSize = 50 } = paginationConfig;
    handler.executeEvent("loadPage", { page: current, limit: pageSize });
  };

  // Memoize columns with widths
  const columns = useMemo(() =>
    COLUMN_DEFINITIONS.map((col) => ({
      ...col,
      width: DEFAULT_WIDTHS[col.key as string] || 100,
    })),
    []
  );

  const handleCreateEntry = () => {
    handler.executeEvent("openCreateModal", {});
  };

  const handleRefresh = () => {
    handler.executeEvent("loadPage", { page: pagination?.page || 1, limit: pagination?.limit || 50 });
  };

  return (
    <div className="excel-tab-content">
      {/* Toolbar */}
      <div className="excel-toolbar">
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleCreateEntry}
        >
          Thêm mới
        </Button>
        <Space size="small">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          />
          <FilterDrawer />
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data || []}
        rowKey="id"
        loading={loading}
        className="excel-table resizable-table"
        pagination={{
          current: pagination?.page || 1,
          pageSize: pagination?.limit || 50,
          total: pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200", "500"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / ${total}`,
          size: "small",
        }}
        onChange={handleTableChange}
        size="small"
        bordered
        scroll={{
          x: TOTAL_WIDTH,
          y: "calc(100vh - 230px)",
        }}
      />
    </div>
  );
}
