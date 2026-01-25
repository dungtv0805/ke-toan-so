import { Table, Tag, Space, Typography } from "antd";
import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import { TeamSummary } from "../../handler/sub-handler/init/init.state";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export function TeamTab() {
  const [summaryByTeam] = useNhatKyChungState("summaryByTeam", []);
  const [loading] = useNhatKyChungState("loading", false);

  const totalChi = summaryByTeam?.reduce((sum, t) => sum + t.tongChi, 0) || 0;

  const columns = [
    {
      title: "Đội",
      dataIndex: "doi",
      key: "doi",
      width: 200,
      render: (text: string) => (
        <Space>
          <TeamOutlined className="text-purple-500" />
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
      render: (_: any, record: { tongChi: number }) => {
        const percent = totalChi > 0 ? ((record.tongChi / totalChi) * 100).toFixed(1) : "0";
        return <Tag color="orange">{percent}%</Tag>;
      },
    },
  ];

  return (
    <>
      <div className="mb-4">
        <Text type="secondary">
          Tổng hợp chi phí theo đội thi công, hiển thị chi tiết phân bổ cho từng nhân viên
        </Text>
      </div>
      <Table<TeamSummary>
        columns={columns}
        dataSource={summaryByTeam || []}
        rowKey="doi"
        loading={loading}
        pagination={false}
        size="middle"
        expandable={{
          expandedRowRender: (record) => (
            <Table
              columns={[
                {
                  title: "Nhân viên",
                  dataIndex: "nhanVien",
                  key: "nhanVien",
                  render: (text: string) => (
                    <Space>
                      <UserOutlined className="text-gray-400" />
                      <Text>{text}</Text>
                    </Space>
                  ),
                },
                {
                  title: "Số bút toán",
                  dataIndex: "soButToan",
                  key: "soButToan",
                  align: "center" as const,
                  render: (v: number) => <Tag>{v}</Tag>,
                },
                {
                  title: "Số tiền",
                  dataIndex: "soTien",
                  key: "soTien",
                  align: "right" as const,
                  render: (v: number) => (
                    <Text className="text-red-500">{formatCurrency(v)}</Text>
                  ),
                },
                {
                  title: "Tỷ lệ trong đội",
                  key: "tyLeNV",
                  align: "right" as const,
                  render: (_: any, r: { soTien: number }) => {
                    const percent =
                      record.tongChi > 0
                        ? ((r.soTien / record.tongChi) * 100).toFixed(1)
                        : "0";
                    return <Tag color="cyan">{percent}%</Tag>;
                  },
                },
              ]}
              dataSource={record.chiTiet}
              rowKey="nhanVien"
              pagination={false}
              size="small"
            />
          ),
          rowExpandable: (record) => record.chiTiet && record.chiTiet.length > 0,
        }}
        summary={(pageData) => {
          const totalChiSum = pageData.reduce((sum, r) => sum + r.tongChi, 0);
          const totalButToan = pageData.reduce((sum, r) => sum + r.soButToan, 0);
          return (
            <Table.Summary fixed>
              <Table.Summary.Row className="bg-muted/50">
                {/* Empty cell for expand icon column */}
                <Table.Summary.Cell index={0} />
                <Table.Summary.Cell index={1}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
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
