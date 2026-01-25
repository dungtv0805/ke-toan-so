import { Table, Tag, Typography, Button, Row, Col, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, PlusOutlined } from "@ant-design/icons";
import { NhatKyChung } from "@/types";
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
import { FilterToolbar } from "../filter-toolbar/FilterToolbar";
import { EntryActions } from "../entry-actions/EntryActions";
import { DetailPopover } from "./DetailPopover";
import dayjs from "dayjs";
import type { TablePaginationConfig } from "antd/es/table";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

// Style cho text ellipsis 1 dòng
const ellipsisStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
};

// Render text với ellipsis và tooltip
const renderEllipsisText = (text: string | undefined | null, maxWidth?: number) => {
  if (!text) return <Text type="secondary">-</Text>;
  return (
    <Tooltip title={text} placement="topLeft">
      <div style={{ ...ellipsisStyle, maxWidth: maxWidth || "100%" }}>{text}</div>
    </Tooltip>
  );
};

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

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    const { current = 1, pageSize = 50 } = paginationConfig;
    handler.executeEvent("loadPage", { page: current, limit: pageSize });
  };

  const columns = [
    {
      title: "Ngày",
      dataIndex: "ngay",
      key: "ngay",
      width: 90,
      sorter: (a: NhatKyChung, b: NhatKyChung) =>
        new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Số CT",
      dataIndex: "soPhieu",
      key: "soPhieu",
      width: 100,
      render: (text: string, record: NhatKyChung) => (
        <Text
          strong
          className={
            record.loaiChungTu === "Phiếu thu"
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {text}
        </Text>
      ),
    },
    {
      title: "Thu/Chi",
      dataIndex: "loaiChungTu",
      key: "loaiChungTu",
      width: 85,
      filters: [
        { text: "Phiếu thu", value: "Phiếu thu" },
        { text: "Phiếu chi", value: "Phiếu chi" },
      ],
      onFilter: (value: unknown, record: NhatKyChung) =>
        record.loaiChungTu === value,
      render: (loai: string) => (
        <Tag color={loai === "Phiếu thu" ? "success" : "error"} style={{ margin: 0 }}>
          {loai === "Phiếu thu" ? <ArrowDownOutlined /> : <ArrowUpOutlined />}{" "}
          {loai === "Phiếu thu" ? "Thu" : "Chi"}
        </Tag>
      ),
    },
    {
      title: "Nghiệp vụ",
      key: "loaiGiaoDich",
      width: 110,
      render: (_: unknown, record: NhatKyChung) => {
        const loaiGD = record.danhMuc?.loaiGiaoDich?.ten;
        return loaiGD ? (
          <Tooltip title={loaiGD}>
            <Tag color="geekblue" style={{ ...ellipsisStyle, margin: 0 }}>
              {loaiGD}
            </Tag>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
    {
      title: "Diễn giải",
      dataIndex: "dienGiai",
      key: "dienGiai",
      width: 140,
      render: (text: string) => renderEllipsisText(text),
    },
    {
      title: "TK Nợ",
      dataIndex: "taiKhoanNo",
      key: "taiKhoanNo",
      width: 60,
      align: "center" as const,
      render: (text: string, record: NhatKyChung) => {
        const data = record.danhMuc?.taiKhoanNo;
        return data ? (
          <DetailPopover type="taiKhoan" data={data}>
            <Tag color="volcano" className="cursor-pointer" style={{ margin: 0 }}>{text}</Tag>
          </DetailPopover>
        ) : <Tag color="volcano" style={{ margin: 0 }}>{text}</Tag>;
      },
    },
    {
      title: "TK Có",
      dataIndex: "taiKhoanCo",
      key: "taiKhoanCo",
      width: 60,
      align: "center" as const,
      render: (text: string, record: NhatKyChung) => {
        const data = record.danhMuc?.taiKhoanCo;
        return data ? (
          <DetailPopover type="taiKhoan" data={data}>
            <Tag color="green" className="cursor-pointer" style={{ margin: 0 }}>{text}</Tag>
          </DetailPopover>
        ) : <Tag color="green" style={{ margin: 0 }}>{text}</Tag>;
      },
    },
    {
      title: "Số tiền",
      dataIndex: "soTien",
      key: "soTien",
      width: 110,
      align: "right" as const,
      sorter: (a: NhatKyChung, b: NhatKyChung) => a.soTien - b.soTien,
      render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
    },
    {
      title: "Mã ĐT nợ",
      key: "doiTuongMa",
      width: 70,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcDoiTuongMa(record);
        const data = record.danhMuc?.doiTuong;
        return ma ? (
          <DetailPopover type="doiTuong" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "ĐT nợ",
      key: "doiTuong",
      width: 100,
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
      width: 70,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcDoiTuong2Ma(record);
        const data = record.danhMuc?.doiTuong2;
        return ma ? (
          <DetailPopover type="doiTuong" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "ĐT có",
      key: "doiTuong2",
      width: 100,
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
      width: 70,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcChuDauTuMa(record);
        const data = record.danhMuc?.duAn ? {
          ma: record.danhMuc.duAn.chuDauTuMa,
          ten: record.danhMuc.duAn.chuDauTuTen,
        } : null;
        return ma ? (
          <DetailPopover type="doiTuong" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "CĐT",
      key: "chuDauTu",
      width: 100,
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
      width: 70,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcDuAnMa(record);
        const data = record.danhMuc?.duAn;
        return ma ? (
          <DetailPopover type="duAn" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Dự án",
      key: "duAn",
      width: 100,
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
      width: 70,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcSanPhamMa(record);
        const data = record.danhMuc?.sanPham;
        return ma ? (
          <DetailPopover type="sanPham" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "SP",
      key: "sanPham",
      width: 100,
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
      width: 60,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcBoPhanMa(record);
        const data = record.danhMuc?.boPhan;
        return ma ? (
          <DetailPopover type="boPhan" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "BP",
      key: "boPhan",
      width: 90,
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
      width: 60,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcDoiMa(record);
        const data = record.danhMuc?.doi;
        return ma ? (
          <DetailPopover type="boPhan" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Đội",
      key: "doi",
      width: 90,
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
      width: 60,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcNhanVienMa(record);
        const data = record.danhMuc?.nhanVien;
        return ma ? (
          <DetailPopover type="nhanVien" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "NV",
      key: "nhanVien",
      width: 90,
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
      width: 60,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcDongTienMa(record);
        const data = record.danhMuc?.dongTien;
        return ma ? (
          <DetailPopover type="dongTien" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Dòng tiền",
      key: "dongTien",
      width: 100,
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
      width: 60,
      render: (_: unknown, record: NhatKyChung) => {
        const ma = getNkcKhoanMucMa(record);
        const data = record.danhMuc?.khoanMuc;
        return ma ? (
          <DetailPopover type="khoanMuc" data={data}>
            <Text code>{ma}</Text>
          </DetailPopover>
        ) : <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Khoản mục",
      key: "khoanMuc",
      width: 100,
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
      width: 100,
      render: (text: string) => renderEllipsisText(text),
    },
    {
      title: "Địa chỉ",
      dataIndex: "diaChi",
      key: "diaChi",
      width: 120,
      render: (text: string) => renderEllipsisText(text),
    },
    {
      title: "Ghi chú",
      dataIndex: "ghiChu",
      key: "ghiChu",
      width: 120,
      render: (text: string) => renderEllipsisText(text),
    },
    {
      title: "",
      key: "action",
      width: 80,
      align: "center" as const,
      fixed: "right" as const,
      render: (_: unknown, record: NhatKyChung) => (
        <EntryActions entry={record} />
      ),
    },
  ];

  const handleCreateEntry = () => {
    handler.executeEvent("openCreateModal", {});
  };

  return (
    <>
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <FilterToolbar />
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateEntry}
          >
            Tạo bút toán
          </Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={data || []}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination?.page || 1,
          pageSize: pagination?.limit || 50,
          total: pagination?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / ${total} bút toán`,
        }}
        onChange={handleTableChange}
        size="small"
        scroll={{ 
          x: 3200, 
          y: "calc(100vh - 270px)"
        }}
      />
    </>
  );
}
