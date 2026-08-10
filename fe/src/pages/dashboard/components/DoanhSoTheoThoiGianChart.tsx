import React from 'react';
import { Card, Segmented, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';
import type { DoanhSoThoiGianPoint } from '@/services/doanhSoService';

export type GroupBy = 'ngay' | 'thang' | 'quy' | 'nam';

const OPTIONS: { label: string; value: GroupBy }[] = [
  { label: 'Ngày', value: 'ngay' },
  { label: 'Tháng', value: 'thang' },
  { label: 'Quý', value: 'quy' },
  { label: 'Năm', value: 'nam' },
];

interface Props {
  data: DoanhSoThoiGianPoint[];
  groupBy: GroupBy;
  onGroupByChange: (v: GroupBy) => void;
  loading?: boolean;
}

const DoanhSoTheoThoiGianChart: React.FC<Props> = ({ data, groupBy, onGroupByChange, loading }) => (
  <Card
    title={<span className="text-sm sm:text-base"><BarChartOutlined className="text-primary mr-2" />Doanh số theo thời gian</span>}
    extra={<Segmented size="small" value={groupBy} options={OPTIONS} onChange={(v) => onGroupByChange(v as GroupBy)} />}
    loading={loading}
  >
    {data.length === 0 ? (
      <Empty description="Chưa có dữ liệu" />
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="ky" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatShortCurrency} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="kyNay" name="Kỳ này" fill={DASH_COLORS.balance} radius={[3, 3, 0, 0]} barSize={18} />
          <Line type="monotone" dataKey="cungKy" name="Cùng kỳ năm trước" stroke={DASH_COLORS.accent} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    )}
  </Card>
);

export default DoanhSoTheoThoiGianChart;
