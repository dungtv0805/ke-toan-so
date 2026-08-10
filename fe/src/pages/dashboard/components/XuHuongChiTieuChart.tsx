import React, { useState } from 'react';
import { Card, Segmented } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

type ChiTieu = 'doanhThu' | 'chiPhi' | 'loiNhuan';

const OPTIONS: { label: string; value: ChiTieu }[] = [
  { label: 'Doanh thu', value: 'doanhThu' },
  { label: 'Chi phí', value: 'chiPhi' },
  { label: 'Lợi nhuận', value: 'loiNhuan' },
];

const MAU: Record<ChiTieu, string> = {
  doanhThu: DASH_COLORS.revenue,
  chiPhi: DASH_COLORS.expense,
  loiNhuan: DASH_COLORS.balance,
};

interface Props {
  year: number;
  startMonth: number;
  endMonth: number;
}

const XuHuongChiTieuChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const [chiTieu, setChiTieu] = useState<ChiTieu>('doanhThu');
  const { data = [] } = useQuery({
    queryKey: ['dash-pnl-series', year],
    queryFn: () => dashboardService.getPnlSeries(year),
  });

  const rows = data
    .filter((p) => p.thang >= startMonth && p.thang <= endMonth)
    .map((p) => ({ thang: `T${p.thang}`, value: p[chiTieu] }));

  return (
    <Card
      title={<span className="text-sm sm:text-base"><LineChartOutlined className="text-primary mr-2" />Xu hướng theo tháng</span>}
      extra={<Segmented size="small" value={chiTieu} options={OPTIONS} onChange={(v) => setChiTieu(v as ChiTieu)} />}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="thang" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatShortCurrency} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Line type="monotone" dataKey="value" name={OPTIONS.find((o) => o.value === chiTieu)?.label} stroke={MAU[chiTieu]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default XuHuongChiTieuChart;
