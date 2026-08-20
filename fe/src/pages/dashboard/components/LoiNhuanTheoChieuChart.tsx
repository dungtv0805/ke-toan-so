import React, { useState } from 'react';
import { Card, Select, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, DASH_COLORS, nhanTrieu } from './format';

export const CHIEU_OPTIONS = [
  { label: 'Đối tượng', value: 'doi-tuong' },
  { label: 'Dự án', value: 'du-an' },
  { label: 'Đội', value: 'doi' },
  { label: 'Sản phẩm', value: 'san-pham' },
  { label: 'Bộ phận', value: 'bo-phan' },
  { label: 'Nhân viên', value: 'nhan-vien' },
  { label: 'Hợp đồng', value: 'hop-dong' },
];

interface Props {
  year: number;
  startMonth: number;
  endMonth: number;
}

const LoiNhuanTheoChieuChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const [chieu, setChieu] = useState('san-pham');
  const { data = [], isLoading } = useQuery({
    queryKey: ['dash-ln-chieu', year, startMonth, endMonth, chieu],
    queryFn: () => dashboardService.getLoiNhuanBreakdown(year, startMonth, endMonth, chieu),
  });

  const rows = [...data].sort((a, b) => b.soTien - a.soTien).slice(0, 10);

  return (
    <Card
      title={<span className="text-sm sm:text-base"><BarChartOutlined className="text-primary mr-2" />Lợi nhuận theo chiều</span>}
      extra={<Select size="small" value={chieu} onChange={setChieu} options={CHIEU_OPTIONS} style={{ width: 150 }} />}
      loading={isLoading}
    >
      {rows.length === 0 ? (
        <Empty description="Chưa có dữ liệu" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={nhanTrieu} />
            <YAxis type="category" dataKey="ten" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="soTien" name="Lợi nhuận" fill={DASH_COLORS.balance} radius={[0, 3, 3, 0]} barSize={14}>
              <LabelList dataKey="soTien" position="right" formatter={nhanTrieu} style={{ fontSize: 10, fill: DASH_COLORS.muted }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default LoiNhuanTheoChieuChart;
