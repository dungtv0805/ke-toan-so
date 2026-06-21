import React, { useState } from 'react';
import { Select, Space, Typography, Segmented } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import KpiCards from './components/KpiCards';
import RevenueTrendChart from './components/RevenueTrendChart';
import CashFlowChart from './components/CashFlowChart';
import CompositionCharts from './components/CompositionCharts';
import RevenueExpenseBreakdownCharts from './components/RevenueExpenseBreakdownCharts';
import AgingCharts from './components/AgingCharts';
import OverdueTables from './components/OverdueTables';
import MockTabDashboard, { MOCK_TABS } from './components/MockTabDashboard';
import { Row, Col } from 'antd';

const { Text } = Typography;

const TAB_OPTIONS = [
  { label: 'Tài chính', value: 'tai-chinh' },
  { label: 'Nhân sự', value: 'nhan-su' },
  { label: 'Kinh doanh', value: 'kinh-doanh' },
  { label: 'Điều hành', value: 'dieu-hanh' },
];

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `Tháng ${i + 1}`,
}));

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const y = CURRENT_YEAR - i;
  return { value: y, label: `Năm ${y}` };
});

const Dashboard: React.FC = () => {
  const [month, setMonth] = useState<number>(CURRENT_MONTH);
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState<string>('tai-chinh');

  return (
    <div className="space-y-3">
      {/* Filter bar — ghim trên cùng khi cuộn */}
      <div
        className="sticky z-20 flex flex-wrap items-center justify-between gap-2"
        style={{
          top: 0,
          marginInline: -12,
          padding: '10px 12px',
          background: 'hsl(var(--background))',
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-primary" />
          <Text strong className="text-sm sm:text-base">Tổng quan báo cáo</Text>
        </div>
        <Segmented
          value={activeTab}
          onChange={(v) => setActiveTab(v as string)}
          options={TAB_OPTIONS}
          size="small"
        />
        <Space wrap>
          <Select
            value={month}
            onChange={setMonth}
            options={MONTH_OPTIONS}
            style={{ width: 120 }}
          />
          <Select
            value={year}
            onChange={setYear}
            options={YEAR_OPTIONS}
            style={{ width: 120 }}
          />
        </Space>
      </div>

      {activeTab === 'tai-chinh' ? (
        <>
          {/* KPI */}
          <KpiCards month={month} year={year} />

          {/* Xu hướng */}
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <RevenueTrendChart year={year} />
            </Col>
            <Col xs={24} lg={12}>
              <CashFlowChart year={year} />
            </Col>
          </Row>

          {/* Tỷ trọng doanh thu / chi phí */}
          <RevenueExpenseBreakdownCharts month={month} year={year} />

          {/* Cơ cấu */}
          <CompositionCharts />

          {/* Tuổi nợ */}
          <AgingCharts />

          {/* Công nợ quá hạn */}
          <OverdueTables />
        </>
      ) : (
        <MockTabDashboard config={MOCK_TABS[activeTab]} />
      )}
    </div>
  );
};

export default Dashboard;
