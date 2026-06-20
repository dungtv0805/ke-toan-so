import { Table, Tag, Space, Typography } from "antd";
import { ProjectOutlined } from "@ant-design/icons";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import { ProjectSummary } from "../../handler/sub-handler/init/init.state";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export function ProjectTab() {
  const [summaryByProject] = useNhatKyChungState("summaryByProject", []);
  const [loading] = useNhatKyChungState("loading", false);

  const columns = [
    {
      title: "Dự án",
      dataIndex: "duAn",
      key: "duAn",
      width: 250,
      render: (text: string) => (
        <Space>
          <ProjectOutlined className="text-blue-500" />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Số bút toán",
      dataIndex: "soButToan",
      key: "soButToan",
      width: 120,
      align: "center" as const,
      render: (value: number) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Tổng thu",
      dataIndex: "tongThu",
      key: "tongThu",
      align: "right" as const,
      render: (value: number) => (
        <Text strong className="text-green-600">
          {value > 0 ? formatCurrency(value) : "-"}
        </Text>
      ),
    },
    {
      title: "Tổng chi",
      dataIndex: "tongChi",
      key: "tongChi",
      align: "right" as const,
      render: (value: number) => (
        <Text strong className="text-red-600">
          {value > 0 ? formatCurrency(value) : "-"}
        </Text>
      ),
    },
    {
      title: "Lãi/Lỗ",
      key: "laiLo",
      align: "right" as const,
      render: (_: unknown, record: { tongThu: number; tongChi: number }) => {
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
        <Text type="secondary">Tổng hợp thu chi theo từng dự án</Text>
      </div>
      <Table<ProjectSummary>
        className="excel-table"
        columns={columns}
        dataSource={summaryByProject || []}
        rowKey="duAn"
        loading={loading}
        pagination={false}
        size="small"
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
