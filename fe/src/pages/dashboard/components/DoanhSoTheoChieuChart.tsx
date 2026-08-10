import React from 'react';
import { Card, Select, Empty } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';
import type { DoanhSoChieuRow } from '@/services/doanhSoService';

/** Sáu chiều đặc tả yêu cầu cho tab Bán hàng. */
export const CHIEU_BAN_HANG = [
  { label: 'Nhân viên kinh doanh', value: 'nhan-vien' },
  { label: 'Đội', value: 'doi' },
  { label: 'Bộ phận', value: 'bo-phan' },
  { label: 'Sản phẩm/dịch vụ', value: 'san-pham' },
  { label: 'Khách hàng', value: 'doi-tuong' },
  { label: 'Hợp đồng', value: 'hop-dong' },
];

interface Props {
  data: DoanhSoChieuRow[];
  dimension: string;
  onDimensionChange: (v: string) => void;
  loading?: boolean;
}

const DoanhSoTheoChieuChart: React.FC<Props> = ({ data, dimension, onDimensionChange, loading }) => {
  const rows = data.slice(0, 10);

  return (
    <Card
      title={<span className="text-sm sm:text-base"><TeamOutlined className="text-primary mr-2" />Doanh số theo chiều</span>}
      extra={<Select size="small" value={dimension} onChange={onDimensionChange} options={CHIEU_BAN_HANG} style={{ width: 190 }} />}
      loading={loading}
    >
      {rows.length === 0 ? (
        <Empty description="Chưa có dữ liệu" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatShortCurrency} />
            <YAxis type="category" dataKey="ten" width={150} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="soTien" name="Doanh số" fill={DASH_COLORS.revenue} radius={[0, 3, 3, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default DoanhSoTheoChieuChart;
