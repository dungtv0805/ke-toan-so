import { Card, Col, Row, Statistic } from "antd";
import {
  LockOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { usePhanQuyenState } from "../../PhanQuyenHandlerContext";
import { vaiTroOptions } from "@/mock-data/nguoi-dung";
import "./PhanQuyenStats.state";

export function PhanQuyenStats() {
  const [stats] = usePhanQuyenState("stats", null);

  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Tổng người dùng"
            value={stats?.tongNguoiDung || 0}
            prefix={<TeamOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Đang hoạt động"
            value={stats?.dangHoatDong || 0}
            prefix={<UnlockOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Đã khóa"
            value={stats?.daKhoa || 0}
            prefix={<LockOutlined />}
            valueStyle={{ color: "#8c8c8c" }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="Vai trò"
            value={vaiTroOptions.length}
            prefix={<SafetyCertificateOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Card>
      </Col>
    </Row>
  );
}
