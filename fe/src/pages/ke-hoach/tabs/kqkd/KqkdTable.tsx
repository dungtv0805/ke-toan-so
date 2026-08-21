import React from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useKqkdState } from "./KqkdHandlerContext";
// Hai thư mục `lib` khác nhau: `./lib` là của riêng tab KQKD, `../lib` dùng chung
// cho cả ba tab bảng.
import type { HangKqkd } from "./lib/kqkdKeHoachRows";
import { tien } from "../lib/cotChung";

/** Số 0 hiện gạch ngang, số âm trong ngoặc màu đỏ — y như trang Báo cáo KQKD. */
const oSo = (v: number, cap: HangKqkd["cap"]) => {
  if (v === 0) return <span className="text-gray-400">-</span>;
  const chu = v < 0 ? `(${tien(Math.abs(v))})` : tien(v);
  return (
    <span
      className={[
        cap === 0 ? "font-semibold" : "",
        v < 0 ? "text-red-500" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {chu}
    </span>
  );
};

const oPhanTram = (v: number | null) => {
  if (v === null || v === 0) return <span className="text-gray-400">-</span>;
  const chu = `${(Math.abs(v) * 100).toFixed(1)}%`;
  return (
    <span className={v < 0 ? "text-red-500" : undefined}>
      {v < 0 ? `(${chu})` : chu}
    </span>
  );
};

const columns: ColumnsType<HangKqkd> = [
  {
    title: "Chỉ tiêu",
    dataIndex: "nhan",
    key: "nhan",
    width: 320,
    render: (nhan: string, row) => (
      <span className={row.cap === 0 ? "font-semibold" : undefined}>{nhan}</span>
    ),
  },
  {
    title: "Năm",
    key: "nam",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.nam, row.cap),
  },
  {
    title: "%",
    key: "phanTram",
    width: 80,
    align: "right",
    render: (_, row) => oPhanTram(row.phanTram),
  },
  {
    title: "6 tháng đầu",
    key: "sauThangDau",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.sauThangDau, row.cap),
  },
  {
    title: "6 tháng cuối",
    key: "sauThangCuoi",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.sauThangCuoi, row.cap),
  },
  {
    title: "Quý",
    key: "quy",
    children: [0, 1, 2, 3].map((i) => ({
      title: `Q${i + 1}`,
      key: `q${i + 1}`,
      width: 130,
      align: "right" as const,
      render: (_: unknown, row: HangKqkd) => oSo(row.quy[i], row.cap),
    })),
  },
  {
    title: "Tháng",
    key: "thang",
    children: Array.from({ length: 12 }, (_, i) => ({
      title: `T${i + 1}`,
      key: `t${i + 1}`,
      width: 130,
      align: "right" as const,
      render: (_: unknown, row: HangKqkd) => oSo(row.thang[i], row.cap),
    })),
  },
];

export const KqkdTable: React.FC = () => {
  const [hang] = useKqkdState("hang", []);
  const [loading] = useKqkdState("loading", false);

  return (
    <Table<HangKqkd>
      className="excel-table"
      columns={columns}
      dataSource={hang}
      rowKey="key"
      loading={loading}
      size="small"
      bordered
      pagination={false}
      // Mặc định đóng hết: mở trang chỉ thấy các dòng mục.
      expandable={{ defaultExpandedRowKeys: [] }}
      scroll={{ x: "max-content", y: "calc(100vh - 260px)" }}
      rowClassName={(row) => (row.cap === 0 ? "kh-hang-tong" : "")}
      locale={{ emptyText: "Chưa có dòng kế hoạch nào trong năm" }}
    />
  );
};
