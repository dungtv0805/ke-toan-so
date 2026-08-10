import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { sliceToRange } from '@/components/shared/period';
import { formatCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }

const TEAL = DASH_COLORS.revenue;
const GRAY = 'hsl(var(--muted-foreground) / 0.35)';
const ORANGE = '#F2994A';

/** Số tiền → triệu (làm tròn), KPI luôn có số; nhãn trên cây bỏ qua giá trị 0. */
const kpiTrieu = (v: number) => Math.round((v || 0) / 1e6).toLocaleString('vi-VN');
const labelTrieu = (v: number) => (v ? Math.round(v / 1e6).toLocaleString('vi-VN') : '');

const Kpi: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="min-w-0">
    <div className="text-lg sm:text-2xl font-bold truncate" style={{ color }}>{kpiTrieu(value)}</div>
    <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide truncate">{label}</div>
  </div>
);

const RevenueTrendChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const isWeekly = startMonth === endMonth;
  const month = isWeekly ? startMonth : undefined;
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-pnl-series', year, month ?? 0],
    queryFn: () => dashboardService.getPnlSeries(year, month),
  });
  const data = useMemo(
    () => (isWeekly ? full ?? [] : sliceToRange(full ?? [], startMonth, endMonth)),
    [full, isWeekly, startMonth, endMonth],
  );
  const sum = (k: 'doanhThu' | 'chiPhi' | 'loiNhuan') => data.reduce((s, d) => s + (d[k] || 0), 0);
  const hasData = data.some((d) => d.doanhThu || d.chiPhi || d.loiNhuan);

  // Nguồn là `pnl-series`: doanh thu = tổng mọi TK 5xx, lợi nhuận = 5xx − 6xx
  // (TRƯỚC thuế). Khác thẻ KPI cùng màn hình (chỉ tiêu KQKD 01 và 60) → nhãn
  // phải nói rõ công thức, đừng để hai con số "Doanh thu" đứng cạnh nhau.
  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">KẾT QUẢ KINH DOANH (theo TK 5xx/6xx)</span>}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Kpi label="Doanh thu 5xx" value={sum('doanhThu')} color={TEAL} />
          <Kpi label="Chi phí 6xx" value={sum('chiPhi')} color="hsl(var(--muted-foreground))" />
          <Kpi label="LN trước thuế" value={sum('loiNhuan')} color={ORANGE} />
        </div>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Đvt: triệu</span>
      </div>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ left: -10, right: 8, top: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `${isWeekly ? 'Tuần' : 'Th'} ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => labelTrieu(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={42} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(l) => `${isWeekly ? 'Tuần' : 'Tháng'} ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="doanhThu" name="Doanh thu 5xx" fill={TEAL} maxBarSize={26}>
              <LabelList dataKey="doanhThu" position="top" formatter={labelTrieu} style={{ fontSize: 10, fill: TEAL }} />
            </Bar>
            <Bar dataKey="chiPhi" name="Chi phí 6xx" fill={GRAY} maxBarSize={26}>
              <LabelList dataKey="chiPhi" position="top" formatter={labelTrieu} style={{ fontSize: 10, fill: DASH_COLORS.muted }} />
            </Bar>
            <Line type="monotone" dataKey="loiNhuan" name="Lợi nhuận trước thuế" stroke={ORANGE} strokeWidth={2} dot={{ r: 3, fill: ORANGE }}>
              <LabelList dataKey="loiNhuan" position="top" formatter={labelTrieu} style={{ fontSize: 10, fill: ORANGE }} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default RevenueTrendChart;
