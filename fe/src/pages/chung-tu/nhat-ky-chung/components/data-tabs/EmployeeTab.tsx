import { Table, Tag, Space, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";

const { Text } = Typography;

interface EmployeeSummary {
  nhanVien: string;
  doi: string;
  soButToan: number;
  tongChi: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export function EmployeeTab() {
  const [summaryByEmployee] = useNhatKyChungState("summaryByEmployee", []);
  const [loading] = useNhatKyChungState("loading", false);

  const totalChi = summaryByEmployee?.reduce((sum, e) => sum + e.tongChi, 0) || 0;

  const columns = [
    {
      title: "Nhân viên",
      dataIndex: "nhanVien",
      key: "nhanVien",
      width: 180,
      render: (text: string) => (
        <Space>
          <UserOutlined className="text-blue-500" />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Đội",
      dataIndex: "doi",
      key: "doi",
      width: 160,
      render: (text: string) => <Tag color="purple">{text}</Tag>,
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
      title: "Tổng chi phí",
      dataIndex: "tongChi",
      key: "tongChi",
      align: "right" as const,
      render: (value: number) => (
        <Text strong className="text-red-600">
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Tỷ lệ",
      key: "tyLe",
      width: 120,
      align: "right" as const,
      render: (_: unknown, record: EmployeeSummary) => {
        const percent = totalChi > 0 ? ((record.tongChi / totalChi) * 100).toFixed(1) : "0";
        return <Tag color="orange">{percent}%</Tag>;
      },
    },
  ];

  return (
    <>
      <div className="mb-4">
        <Text type="secondary">
          Tổng hợp chi phí theo từng nhân viên chịu trách nhiệm
        </Text>
      </div>
      <Table
        columns={columns}
        dataSource={summaryByEmployee || []}
        rowKey="nhanVien"
        loading={loading}
        pagination={false}
        size="middle"
        summary={(pageData) => {
          const totalChiSum = pageData.reduce((sum, r) => sum + r.tongChi, 0);
          const totalButToan = pageData.reduce((sum, r) => sum + r.soButToan, 0);
          return (
            <Table.Summary fixed>
              <Table.Summary.Row className="bg-muted/50">
                <Table.Summary.Cell index={0}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} align="center">
                  <Text strong>{totalButToan}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong className="text-red-600">
                    {formatCurrency(totalChiSum)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Tag color="orange">100%</Tag>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </>
  );
}
