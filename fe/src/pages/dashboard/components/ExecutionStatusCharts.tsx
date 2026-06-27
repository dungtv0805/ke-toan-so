import React from 'react';
import { Card, Row, Col } from 'antd';
import { DashboardOutlined } from '@ant-design/icons';
import ChartEmptyState from './ChartEmptyState';

const ITEMS = [
  { key: 'doanhThu', title: 'Tình hình thực hiện doanh thu' },
  { key: 'chiPhi', title: 'Tình hình thực hiện chi phí' },
  { key: 'loiNhuan', title: 'Tình hình thực hiện lợi nhuận' },
];

/**
 * Khối Kế hoạch vs Thực hiện (DT/CP/LN).
 * Backend chưa có module kế hoạch → hiển thị empty state.
 * Khi có API kế hoạch chỉ cần truyền data vào, không phải dựng lại layout.
 */
const ExecutionStatusCharts: React.FC = () => (
  <Row gutter={[12, 12]}>
    {ITEMS.map((it) => (
      <Col xs={24} lg={8} key={it.key}>
        <Card
          title={
            <span className="text-sm sm:text-base">
              <DashboardOutlined className="text-primary mr-2" />
              {it.title}
            </span>
          }
        >
          <ChartEmptyState description="Chưa có dữ liệu kế hoạch" height={220} />
        </Card>
      </Col>
    ))}
  </Row>
);

export default ExecutionStatusCharts;
