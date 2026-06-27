import React, { useState } from 'react';
import { Select, Space, Typography, Segmented, ConfigProvider } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import KpiCards from './components/KpiCards';
import RevenueTrendChart from './components/RevenueTrendChart';
import CashFlowChart from './components/CashFlowChart';
import CompositionCharts from './components/CompositionCharts';
import RevenueExpenseBreakdownCharts from './components/RevenueExpenseBreakdownCharts';
import AgingCharts from './components/AgingCharts';
import OverdueTables from './components/OverdueTables';
import ExecutionStatusCharts from './components/ExecutionStatusCharts';
import MockTabDashboard, { MOCK_TABS } from './components/MockTabDashboard';
import { Row, Col } from 'antd';
import { resolvePeriod, type DashboardPeriod } from './period';

const { Text } = Typography;

const TAB_OPTIONS = [
  { label: 'Tài chính', value: 'tai-chinh' },
  { label: 'Nhân sự', value: 'nhan-su' },
  { label: 'Kinh doanh', value: 'kinh-doanh' },
  { label: 'Điều hành', value: 'dieu-hanh' },
];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();

const PERIOD_OPTIONS: { label: string; value: DashboardPeriod }[] = [
  { label: '12 tháng', value: 'thang12' },
  { label: '4 quý', value: 'quy4' },
  { label: 'Năm nay', value: 'namNay' },
  { label: 'Năm trước', value: 'namTruoc' },
];

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<DashboardPeriod>('thang12');
  const { year, granularity } = resolvePeriod(period, CURRENT_YEAR);
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
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemSelectedBg: 'hsl(var(--primary))',
                itemSelectedColor: '#fff',
                itemColor: 'hsl(var(--primary))',
                itemHoverColor: 'hsl(var(--primary))',
                trackBg: 'hsl(var(--primary) / 0.08)',
                fontSize: 15,
              },
            },
          }}
        >
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v as string)}
            options={TAB_OPTIONS}
            size="large"
            className="font-semibold"
          />
        </ConfigProvider>
        <Space wrap>
          <Select
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS}
            style={{ width: 140 }}
          />
        </Space>
      </div>

      {activeTab === 'tai-chinh' ? (
        <>
          {/* KPI */}
          <KpiCards year={year} />

          {/* Xu hướng */}
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <RevenueTrendChart year={year} granularity={granularity} />
            </Col>
            <Col xs={24} lg={12}>
              <CashFlowChart year={year} granularity={granularity} />
            </Col>
          </Row>

          {/* Tình hình thực hiện (Kế hoạch vs Thực hiện) — chưa có dữ liệu */}
          <ExecutionStatusCharts />

          {/* Tỷ trọng doanh thu / chi phí */}
          <RevenueExpenseBreakdownCharts year={year} />

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
