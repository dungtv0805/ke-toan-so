import React, { useState } from 'react';
import { Card, Segmented, Space } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { LineChart, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, DASH_COLORS, nhanTrieu } from './format';

type ChiTieu = 'doanhThu' | 'chiPhi' | 'loiNhuan';

// Nguồn là `pnl-series`: doanh thu = tổng mọi TK 5xx, lợi nhuận = 5xx − 6xx
// (TRƯỚC thuế). Hàng KPI ngay trên dùng chỉ tiêu KQKD 01/60 (Có 511, LN SAU
// thuế) — nhãn phải nói rõ công thức để hai con số khác nhau không đọc như một.
const OPTIONS: { label: string; value: ChiTieu }[] = [
  { label: 'Doanh thu 5xx', value: 'doanhThu' },
  { label: 'Chi phí 6xx', value: 'chiPhi' },
  { label: 'LN trước thuế', value: 'loiNhuan' },
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
      title={<span className="text-sm sm:text-base"><LineChartOutlined className="text-primary mr-2" />Xu hướng theo tháng (theo TK 5xx/6xx)</span>}
      extra={
        <Space>
          <Segmented size="small" value={chiTieu} options={OPTIONS} onChange={(v) => setChiTieu(v as ChiTieu)} />
          <Link to="/bao-cao/tai-chinh" className="text-xs">Xem chi tiết</Link>
        </Space>
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="thang" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={nhanTrieu} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Line type="monotone" dataKey="value" name={OPTIONS.find((o) => o.value === chiTieu)?.label} stroke={MAU[chiTieu]} strokeWidth={2} dot={{ r: 2 }}>
            <LabelList dataKey="value" position="top" formatter={nhanTrieu} style={{ fontSize: 10, fill: MAU[chiTieu] }} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default XuHuongChiTieuChart;
