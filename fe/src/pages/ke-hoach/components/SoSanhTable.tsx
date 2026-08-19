import React from "react";
import { Table, Empty, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SoSanhKetQua, SoSanhRow } from "@/services/keHoachService";
import { useKeHoachState } from "../KeHoachHandlerContext";
import { KE_HOACH_VIEWS } from "./keHoachViews";

const tien = (v: number) => new Intl.NumberFormat("vi-VN").format(Math.round(v));

/** % đạt: xanh khi ≥ 100%, cam khi ≥ 80%, đỏ khi thấp hơn; kế hoạch = 0 thì "—". */
const TyLe: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) return <span className="text-gray-400">—</span>;
  const color = value >= 100 ? "green" : value >= 80 ? "orange" : "red";
  return <Tag color={color}>{value.toFixed(2)}%</Tag>;
};

export const SoSanhTable: React.FC = () => {
  const [soSanh] = useKeHoachState("soSanh", null);
  const [loading] = useKeHoachState("soSanhLoading", false);
  const [view] = useKeHoachState("view", "list");

  const ketQua = soSanh as SoSanhKetQua | null;
  const tieuDe =
    KE_HOACH_VIEWS.find((v) => v.value === view)?.label ?? "So sánh kế hoạch";

  const columns: ColumnsType<SoSanhRow> = [
    { title: "Mã", dataIndex: "key", width: 140, fixed: "left" },
    {
      title: "Tên",
      dataIndex: "ten",
      width: 260,
      render: (v: string) => v || <span className="text-gray-400">-</span>,
    },
    {
      title: "Kế hoạch",
      dataIndex: "keHoach",
      align: "right",
      width: 160,
      render: (v: number) => tien(v),
    },
    {
      title: "Thực hiện",
      dataIndex: "thucHien",
      align: "right",
      width: 160,
      render: (v: number) => tien(v),
    },
    {
      title: "Chênh lệch",
      dataIndex: "chenhLech",
      align: "right",
      width: 160,
      render: (v: number) => (
        <span className={v < 0 ? "text-red-600" : "text-green-700"}>{tien(v)}</span>
      ),
    },
    {
      title: "% đạt",
      dataIndex: "tyLeDat",
      align: "center",
      width: 110,
      render: (v: number | null) => <TyLe value={v} />,
    },
  ];

  if (!loading && (!ketQua || ketQua.rows.length === 0)) {
    return (
      <div className="excel-tab-content">
        <Empty
          className="py-16"
          description={`Chưa có số liệu cho "${tieuDe}" trong kỳ đang lọc`}
        />
      </div>
    );
  }

  return (
    <div className="excel-tab-content">
    <Table<SoSanhRow>
      rowKey="key"
      size="small"
      bordered
      className="excel-table"
      loading={loading as boolean}
      columns={columns}
      dataSource={ketQua?.rows ?? []}
      pagination={false}
      scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
      summary={() =>
        ketQua ? (
          <Table.Summary fixed>
            <Table.Summary.Row className="font-semibold bg-gray-50">
              <Table.Summary.Cell index={0} colSpan={2}>
                Tổng cộng
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                {tien(ketQua.tong.keHoach)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                {tien(ketQua.tong.thucHien)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                {tien(ketQua.tong.chenhLech)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center">
                <TyLe value={ketQua.tong.tyLeDat} />
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        ) : null
      }
    />
    </div>
  );
};
