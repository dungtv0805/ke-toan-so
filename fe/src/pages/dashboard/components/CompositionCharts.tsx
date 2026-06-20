import React from 'react';
import { Card, Row, Col, Skeleton, Empty } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService, type CompositionSlice } from '@/services/dashboardService';
import { formatCurrency } from './format';

const PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--brand-gold))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

const Donut: React.FC<{ data: CompositionSlice[] }> = ({ data }) => {
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

const CompositionCharts: React.FC = () => {
  const assetQ = useQuery({ queryKey: ['dash-asset-comp'], queryFn: () => dashboardService.getAssetComposition() });
  const sourceQ = useQuery({ queryKey: ['dash-source-comp'], queryFn: () => dashboardService.getSourceComposition() });

  const renderBody = (loading: boolean, data: CompositionSlice[] | undefined) => {
    if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;
    if (!data || data.length === 0) {
      return <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />;
    }
    return <Donut data={data} />;
  };

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={12}>
        <Card title={<span className="text-sm sm:text-base"><PieChartOutlined className="text-primary mr-2" />Cơ cấu tài sản</span>}>
          {renderBody(assetQ.isLoading, assetQ.data)}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title={<span className="text-sm sm:text-base"><PieChartOutlined className="text-primary mr-2" />Cơ cấu nguồn vốn</span>}>
          {renderBody(sourceQ.isLoading, sourceQ.data)}
        </Card>
      </Col>
    </Row>
  );
};

export default CompositionCharts;
