import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { sliceToRange } from '../period';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }

const CongNoChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-congno-series', year],
    queryFn: () => dashboardService.getCongNoSeries(year),
  });
  const data = useMemo(() => sliceToRange(full ?? [], startMonth, endMonth), [full, startMonth, endMonth]);
  const hasData = data.some((d) => d.tongPhaiThu || d.tongPhaiTra);

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">CÔNG NỢ</span>}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `Th ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={55} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(l) => `Tháng ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Line type="monotone" dataKey="tongPhaiThu" name="Tổng phải thu" stroke={DASH_COLORS.revenue} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="tongPhaiTra" name="Tổng phải trả" stroke={DASH_COLORS.expense} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default CongNoChart;
