import { Table, Tag, Typography } from "antd";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export function DongTienTab() {
  const [summaryByDongTien] = useNhatKyChungState("summaryByDongTien", []);
  const [loading] = useNhatKyChungState("loading", false);

  const columns = [
    {
      title: "Loại dòng tiền",
      dataIndex: "dongTien",
      key: "dongTien",
      render: (t: string) => <Tag color="cyan">{t}</Tag>,
    },
    {
      title: "Số bút toán",
      dataIndex: "soButToan",
      key: "soButToan",
      align: "center" as const,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Tổng thu",
      dataIndex: "tongThu",
      key: "tongThu",
      align: "right" as const,
      render: (v: number) => (
        <Text className="text-green-600">
          {v > 0 ? formatCurrency(v) : "-"}
        </Text>
      ),
    },
    {
      title: "Tổng chi",
      dataIndex: "tongChi",
      key: "tongChi",
      align: "right" as const,
      render: (v: number) => (
        <Text className="text-red-600">
          {v > 0 ? formatCurrency(v) : "-"}
        </Text>
      ),
    },
  ];

  return (
    <Table
      className="excel-table"
      columns={columns}
      dataSource={summaryByDongTien || []}
      rowKey="dongTien"
      loading={loading}
      pagination={false}
      size="small"
    />
  );
}
