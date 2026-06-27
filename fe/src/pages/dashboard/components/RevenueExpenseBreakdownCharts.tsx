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
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="soTien"
          nameKey="ten"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={88}
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
  const pnl = useQuery({
    queryKey: ['pnl-breakdown', year, startMonth, endMonth],
    queryFn: () => dashboardService.getPnlBreakdownByRange(year, startMonth, endMonth),
  });
  const tienThu = useQuery({
    queryKey: ['tien-thu-breakdown', year, startMonth, endMonth],
    queryFn: () => dashboardService.getCashCompositionByRange('thu', year, startMonth, endMonth),
  });
  const tienChi = useQuery({
    queryKey: ['tien-chi-breakdown', year, startMonth, endMonth],
    queryFn: () => dashboardService.getCashCompositionByRange('chi', year, startMonth, endMonth),
  });

  const renderBody = (slices: BreakdownSlice[] | undefined, loading: boolean) => {
    if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;
    const grouped = groupTopN(slices ?? []);
    if (grouped.length === 0) {
      return <Empty description="Chưa có dữ liệu" style={{ height: 260 }} className="flex flex-col items-center justify-center" />;
    }
    return <Donut data={grouped} />;
  };

  const cards: { title: string; slices?: BreakdownSlice[]; loading: boolean }[] = [
    { title: 'Tỷ trọng doanh thu', slices: pnl.data?.doanhThu, loading: pnl.isLoading },
    { title: 'Tỷ trọng chi phí', slices: pnl.data?.chiPhi, loading: pnl.isLoading },
    // Lợi nhuận theo sản phẩm: chưa có endpoint → để trống
    { title: 'Tỷ trọng lợi nhuận', slices: [], loading: false },
    { title: 'Tỷ trọng tiền thu', slices: tienThu.data, loading: tienThu.isLoading },
    { title: 'Tỷ trọng tiền chi', slices: tienChi.data, loading: tienChi.isLoading },
  ];

  return (
    <Row gutter={[12, 12]}>
      {cards.map((c) => (
        <Col xs={24} md={12} xl={8} key={c.title}>
          <Card title={<span className="text-sm sm:text-base"><PieChartOutlined className="text-primary mr-2" />{c.title}</span>}>
            {renderBody(c.slices, c.loading)}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default RevenueExpenseBreakdownCharts;
