import React, { useState } from 'react';
import { Card, Skeleton, Empty, Segmented } from 'antd';
import { RiseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

interface Props {
  year: number;
}

type Metric = 'all' | 'doanhThu' | 'chiPhi' | 'loiNhuan';

const METRIC_OPTIONS: { label: string; value: Metric }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Doanh thu', value: 'doanhThu' },
  { label: 'Chi phí', value: 'chiPhi' },
  { label: 'Lợi nhuận', value: 'loiNhuan' },
];

const RevenueTrendChart: React.FC<Props> = ({ year }) => {
  const [metric, setMetric] = useState<Metric>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['dash-pnl-series', year],
    queryFn: () => dashboardService.getPnlSeries(year),
  });

  const hasData = !!data && data.some((d) => d.doanhThu || d.chiPhi || d.loiNhuan);

  return (
    <Card
      title={
        <span className="text-sm sm:text-base">
          <RiseOutlined className="text-primary mr-2" />
          Doanh thu – Chi phí – Lợi nhuận theo tháng
        </span>
      }
      extra={
        <Segmented<Metric>
          size="small"
          value={metric}
          onChange={(v) => setMetric(v)}
          options={METRIC_OPTIONS}
        />
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 300 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `T${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={55} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Tháng ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {metric === 'all' && (
              <>
                <Bar dataKey="doanhThu" name="Doanh thu" fill={DASH_COLORS.revenue} maxBarSize={28} />
                <Bar dataKey="chiPhi" name="Chi phí" fill={DASH_COLORS.expense} maxBarSize={28} />
                <Line type="monotone" dataKey="loiNhuan" name="Lợi nhuận" stroke={DASH_COLORS.balance} strokeWidth={2} dot={{ r: 3 }} />
              </>
            )}
            {metric === 'doanhThu' && (
              <Bar dataKey="doanhThu" name="Doanh thu" fill={DASH_COLORS.revenue} maxBarSize={28} />
            )}
            {metric === 'chiPhi' && (
              <Bar dataKey="chiPhi" name="Chi phí" fill={DASH_COLORS.expense} maxBarSize={28} />
            )}
            {metric === 'loiNhuan' && (
              <Bar dataKey="loiNhuan" name="Lợi nhuận" fill={DASH_COLORS.balance} maxBarSize={28} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default RevenueTrendChart;
