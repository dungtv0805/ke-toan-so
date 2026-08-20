import React from 'react';
import { Card, Segmented, Empty, Space } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { ComposedChart, Bar, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { formatCurrency, DASH_COLORS, nhanTrieu } from './format';
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
    extra={
      <Space>
        <Segmented size="small" value={groupBy} options={OPTIONS} onChange={(v) => onGroupByChange(v as GroupBy)} />
        <Link to="/bao-cao/doanh-thu" className="text-xs">Xem chi tiết</Link>
      </Space>
    }
    loading={loading}
  >
    {data.length === 0 ? (
      <Empty description="Chưa có dữ liệu" />
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="ky" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={nhanTrieu} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="kyNay" name="Kỳ này" fill={DASH_COLORS.balance} radius={[3, 3, 0, 0]} barSize={18}>
            <LabelList dataKey="kyNay" position="top" formatter={nhanTrieu} style={{ fontSize: 10, fill: DASH_COLORS.balance }} />
          </Bar>
          <Line type="monotone" dataKey="cungKy" name="Cùng kỳ năm trước" stroke={DASH_COLORS.accent} strokeWidth={2} dot={{ r: 2 }}>
            <LabelList dataKey="cungKy" position="bottom" formatter={nhanTrieu} style={{ fontSize: 10, fill: DASH_COLORS.accent }} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    )}
  </Card>
);

export default DoanhSoTheoThoiGianChart;
