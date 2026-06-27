import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart,
  Area,
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
import { cashSeriesToQuarters } from '../period';

interface Props {
  year: number;
  granularity: 'month' | 'quarter';
}

const CashFlowChart: React.FC<Props> = ({ year, granularity }) => {
  const isQuarter = granularity === 'quarter';

  const { data: monthly, isLoading } = useQuery({
    queryKey: ['dash-cash-series', year],
    queryFn: () => dashboardService.getCashSeries(year),
  });

  const data = useMemo(() => {
    if (!monthly) return monthly;
    return isQuarter ? cashSeriesToQuarters(monthly) : monthly;
  }, [monthly, isQuarter]);

  const hasData = !!data && data.some((d) => d.thu || d.chi || d.soDu);

  return (
    <Card
      title={
        <span className="text-sm sm:text-base">
          <WalletOutlined className="text-primary mr-2" />
          Dòng tiền ({year})
        </span>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 300 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ left: -10, right: 8 }}>
            <defs>
              <linearGradient id="cf-thu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cf-chi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `${isQuarter ? 'Q' : 'T'}${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatShortCurrency(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={55} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => `${isQuarter ? 'Quý' : 'Tháng'} ${label}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="thu" name="Thu" stroke={DASH_COLORS.revenue} fill="url(#cf-thu)" strokeWidth={2} />
            <Area type="monotone" dataKey="chi" name="Chi" stroke={DASH_COLORS.expense} fill="url(#cf-chi)" strokeWidth={2} />
            <Line type="monotone" dataKey="soDu" name="Số dư" stroke={DASH_COLORS.balance} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default CashFlowChart;
