import { Card, Col, List, Row, Space, Tag } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { vaiTroOptions, quyenHanTheoVaiTro } from "@/mock-data/nguoi-dung";
import { getVaiTroIcon } from "../table/columns";

export function RoleReferenceCard() {
  return (
    <Card title="Bảng phân quyền theo vai trò" className="mt-6">
      <Row gutter={[16, 16]}>
        {vaiTroOptions.map((vt) => (
          <Col xs={24} sm={12} lg={8} key={vt.value}>
            <Card
              size="small"
              title={
                <Space>
                  {getVaiTroIcon(vt.value)}
                  <span>{vt.label}</span>
                </Space>
              }
              extra={<Tag color={vt.color}>{vt.value}</Tag>}
            >
              <p className="text-muted-foreground text-sm mb-2">{vt.description}</p>
              <List
                size="small"
                dataSource={quyenHanTheoVaiTro[vt.value]}
                renderItem={(item) => (
                  <List.Item style={{ padding: "4px 0", border: "none" }}>
                    <Space>
                      <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      <span className="text-sm">{item}</span>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
