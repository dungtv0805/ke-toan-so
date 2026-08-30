import React, { useMemo } from "react";
import { Empty, Select, Space, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTableBodyHeight } from "@/hooks/useTableBodyHeight";
import { capCot, CAP_CHINH, CAP_NAM, tien } from "../lib/cotChung";
import {
  ghep3Lop,
  KY_OPTIONS,
  type Hang3Lop,
  type Ky,
} from "./lib/pnl3LopRows";
import { usePnl3LopHandler, usePnl3LopState } from "./Pnl3LopHandlerContext";

const { Text } = Typography;

const phanTramText = (v: number | null) =>
  v === null ? "—" : `${(v * 100).toFixed(1)}%`;

/** Dòng cấp 0 là mục La Mã — in đậm để tách khỏi nhóm và khoản mục bên dưới. */
const oSo = (row: Hang3Lop, giaTri: number) => (
  <span className={row.cap === 0 ? "font-semibold" : undefined}>
    {tien(giaTri)}
  </span>
);

export const Pnl3LopTable: React.FC = () => {
  const handler = usePnl3LopHandler();
  const [baoCao] = usePnl3LopState("baoCao", null);
  const [loading] = usePnl3LopState("loading", false);
  const [ky] = usePnl3LopState("ky", "NAM");
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();

  const rows = useMemo<Hang3Lop[]>(
    () => (baoCao ? ghep3Lop(baoCao, ky as Ky) : []),
    [baoCao, ky],
  );

  const columns: ColumnsType<Hang3Lop> = [
    {
      title: "Chỉ tiêu",
      dataIndex: "nhan",
      key: "nhan",
      width: 380,
      ...capCot(CAP_CHINH),
      render: (v: string, row: Hang3Lop) => (
        <span className={row.cap === 0 ? "font-semibold" : undefined}>{v}</span>
      ),
    },
    {
      title: "Kế hoạch",
      key: "keHoach",
      width: 160,
      align: "right",
      ...capCot(CAP_NAM),
      render: (_: unknown, row: Hang3Lop) => oSo(row, row.keHoach),
    },
    {
      title: "Dự báo",
      key: "duBao",
      width: 160,
      align: "right",
      ...capCot(CAP_NAM),
      render: (_: unknown, row: Hang3Lop) => oSo(row, row.duBao),
    },
    {
      title: "Thực hiện",
      key: "thucHien",
      width: 160,
      align: "right",
      ...capCot(CAP_NAM),
      render: (_: unknown, row: Hang3Lop) => oSo(row, row.thucHien),
    },
    {
      title: "Chênh lệch",
      key: "chenhLech",
      width: 160,
      align: "right",
      render: (_: unknown, row: Hang3Lop) => {
        if (row.chenhLech === 0) return null;
        const duong = row.chenhLech > 0;
        return (
          <Tooltip
            title={
              duong
                ? "Thực hiện cao hơn kế hoạch"
                : "Thực hiện thấp hơn kế hoạch"
            }
          >
            <span
              className={
                duong
                  ? "text-green-600 font-semibold"
                  : "text-red-500 font-semibold"
              }
            >
              {duong ? "+" : "−"}
              {tien(Math.abs(row.chenhLech))}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "% đạt",
      key: "phanTramDat",
      width: 100,
      align: "right",
      render: (_: unknown, row: Hang3Lop) => (
        <Tooltip
          title={
            row.phanTramDat === null
              ? "Chưa lập kế hoạch cho chỉ tiêu này nên không tính được tỷ lệ"
              : undefined
          }
        >
          <span>{phanTramText(row.phanTramDat)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="excel-container">
      <div className="excel-toolbar">
        <Space size={8}>
          <Text type="secondary" className="text-xs">
            Kỳ xem
          </Text>
          <Select
            size="small"
            style={{ width: 140 }}
            value={ky}
            options={KY_OPTIONS}
            onChange={(v) => handler.executeEvent("doiKy", { ky: v as Ky })}
          />
        </Space>
        <span className="text-xs text-gray-500">
          Chênh lệch và % đạt so Thực hiện với Kế hoạch
        </span>
      </div>

      <div ref={tableWrapRef} className="flex flex-col flex-1 min-h-0">
        <Table<Hang3Lop>
          rowKey="key"
          size="small"
          bordered
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          className="excel-table kh-bang"
          scroll={{ x: "max-content", y: tableBodyHeight }}
          locale={{ emptyText: <Empty description="Chưa có số liệu" /> }}
        />
      </div>
    </div>
  );
};
