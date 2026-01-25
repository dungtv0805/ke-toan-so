import { Table, Tag, Typography } from "antd";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import { NhomQuanLySummary } from "../../handler/sub-handler/summary/summary.state";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export function NhomQuanLyTab() {
  const [summaryByNhomQuanLy] = useNhatKyChungState("summaryByNhomQuanLy", []);
  const [summaryLoading] = useNhatKyChungState("summaryLoading", {});
  const loading = summaryLoading?.["management-group"] || false;

  const columns = [
    {
      title: "Nhóm quản lý",
      dataIndex: "nhomQuanLy",
      key: "nhomQuanLy",
      render: (t: string) => <Tag color="orange">{t}</Tag>,
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
    {
      title: "Lãi/Lỗ",
      key: "laiLo",
      align: "right" as const,
      render: (_: unknown, record: NhomQuanLySummary) => {
        const diff = record.tongThu - record.tongChi;
        return (
          <Text
            strong
            className={diff >= 0 ? "text-green-600" : "text-red-600"}
          >
            {formatCurrency(Math.abs(diff))} {diff >= 0 ? "(Lãi)" : "(Lỗ)"}
          </Text>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4">
        <Text type="secondary">Tổng hợp thu chi theo nhóm quản lý</Text>
      </div>
      <Table<NhomQuanLySummary>
        columns={columns}
        dataSource={summaryByNhomQuanLy || []}
        rowKey="nhomQuanLy"
        loading={loading}
        pagination={false}
        size="middle"
        summary={(pageData) => {
          const totalThu = pageData.reduce((sum, r) => sum + r.tongThu, 0);
          const totalChi = pageData.reduce((sum, r) => sum + r.tongChi, 0);
          const totalButToan = pageData.reduce((sum, r) => sum + r.soButToan, 0);
          const diff = totalThu - totalChi;
          return (
            <Table.Summary fixed>
              <Table.Summary.Row className="bg-muted/50">
                <Table.Summary.Cell index={0}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">
                  <Text strong>{totalButToan}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong className="text-green-600">
                    {formatCurrency(totalThu)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong className="text-red-600">
                    {formatCurrency(totalChi)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text
                    strong
                    className={diff >= 0 ? "text-green-600" : "text-red-600"}
                  >
                    {formatCurrency(Math.abs(diff))} {diff >= 0 ? "(Lãi)" : "(Lỗ)"}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </>
  );
}
