import React from 'react';
import { Card, Row, Col, Skeleton, Empty } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService, type BreakdownSlice } from '@/services/dashboardService';
import { formatCurrency } from './format';

const PALETTE = ['#1F3864', '#C9A227', '#2F5597', '#E0C158', '#8497B0', '#BFA15F'];

const TOP_N = 6;

/** Sort desc by |soTien|, keep top N, group the rest into "Khác". */
function groupTopN(data: BreakdownSlice[]): BreakdownSlice[] {
  const cleaned = data.filter((d) => Math.abs(d.soTien) > 0);
  if (cleaned.length <= TOP_N) {
    return [...cleaned].sort((a, b) => Math.abs(b.soTien) - Math.abs(a.soTien));
  }
  const sorted = [...cleaned].sort((a, b) => Math.abs(b.soTien) - Math.abs(a.soTien));
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  const otherTotal = rest.reduce((s, d) => s + d.soTien, 0);
  return [...top, { ten: 'Khác', soTien: otherTotal }];
}

const Donut: React.FC<{ data: BreakdownSlice[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + Math.abs(d.soTien), 0);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="soTien"
          nameKey="ten"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          label={(entry) => {
            const pct = total > 0 ? ((Math.abs(entry.soTien) / total) * 100).toFixed(0) : '0';
            return `${pct}%`;
          }}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

interface Props { year: number; startMonth: number; endMonth: number; }

const RevenueExpenseBreakdownCharts: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['pnl-breakdown', year, startMonth, endMonth],
    queryFn: () => dashboardService.getPnlBreakdownByRange(year, startMonth, endMonth),
  });

  const renderBody = (slices: BreakdownSlice[] | undefined) => {
    if (isLoading) return <Skeleton active paragraph={{ rows: 5 }} />;
    const grouped = groupTopN(slices ?? []);
    if (grouped.length === 0) {
      return <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />;
    }
    return <Donut data={grouped} />;
  };

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={12}>
        <Card title={<span className="text-sm sm:text-base"><PieChartOutlined className="text-primary mr-2" />Tỷ trọng doanh thu</span>}>
          {renderBody(data?.doanhThu)}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title={<span className="text-sm sm:text-base"><PieChartOutlined className="text-primary mr-2" />Tỷ trọng chi phí</span>}>
          {renderBody(data?.chiPhi)}
        </Card>
      </Col>
    </Row>
  );
};

export default RevenueExpenseBreakdownCharts;
