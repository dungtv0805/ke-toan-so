import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { sliceToRange } from '../period';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }

const TEAL = DASH_COLORS.revenue;
const GRAY = 'hsl(var(--muted-foreground) / 0.35)';
const ORANGE = '#F2994A';

const Kpi: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="min-w-0">
    <div className="text-lg sm:text-2xl font-bold truncate" style={{ color }}>{formatShortCurrency(value)}</div>
    <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide truncate">{label}</div>
  </div>
);

const RevenueTrendChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-pnl-series', year],
    queryFn: () => dashboardService.getPnlSeries(year),
  });
  const data = useMemo(() => sliceToRange(full ?? [], startMonth, endMonth), [full, startMonth, endMonth]);
  const sum = (k: 'doanhThu' | 'chiPhi' | 'loiNhuan') => data.reduce((s, d) => s + (d[k] || 0), 0);
  const hasData = data.some((d) => d.doanhThu || d.chiPhi || d.loiNhuan);

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">KẾT QUẢ KINH DOANH</span>}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Kpi label="Doanh thu" value={sum('doanhThu')} color={TEAL} />
          <Kpi label="Chi phí" value={sum('chiPhi')} color="hsl(var(--muted-foreground))" />
          <Kpi label="Lợi nhuận" value={sum('loiNhuan')} color={ORANGE} />
        </div>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Đvt: đồng</span>
      </div>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ left: -10, right: 8, top: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `Th ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={55} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(l) => `Tháng ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="doanhThu" name="Doanh thu" fill={TEAL} maxBarSize={26}>
              <LabelList dataKey="doanhThu" position="top" formatter={(v: number) => (v ? formatShortCurrency(v) : '')} style={{ fontSize: 10, fill: DASH_COLORS.muted }} />
            </Bar>
            <Bar dataKey="chiPhi" name="Chi phí" fill={GRAY} maxBarSize={26} />
            <Line type="monotone" dataKey="loiNhuan" name="Lợi nhuận" stroke={ORANGE} strokeWidth={2} dot={{ r: 3, fill: ORANGE }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default RevenueTrendChart;
