import React from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList, ResponsiveContainer } from 'recharts';
import { balanceSheetService } from '@/services/balanceSheetService';
import { formatCurrency } from './format';

const NAVY = '#1F3864';
const GOLD = '#C9A227';

const BalanceStructureChart: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dash-balance-structure'],
    queryFn: () => balanceSheetService.getStats(),
  });

  const tsNH = data?.taiSanNganHan ?? 0;
  const tsDH = data?.taiSanDaiHan ?? 0;
  const npt = data?.noPhaiTra ?? 0;
  const vcsh = data?.vonChuSoHuu ?? 0;
  const tongTS = tsNH + tsDH;
  const tongNV = npt + vcsh;
  const pct = (v: number, t: number) => (t > 0 ? (v / t) * 100 : 0);
  const hasData = tongTS > 0 || tongNV > 0;

  // 2 cột: Tài sản (ngắn/dài hạn), Nguồn vốn (nợ phải trả/vốn CSH) — chuẩn hóa %
  const chartData = [
    { name: 'Tài sản', a: pct(tsNH, tongTS), b: pct(tsDH, tongTS), aRaw: tsNH, bRaw: tsDH, aName: 'Ngắn hạn', bName: 'Dài hạn' },
    { name: 'Nguồn vốn', a: pct(npt, tongNV), b: pct(vcsh, tongNV), aRaw: npt, bRaw: vcsh, aName: 'Nợ phải trả', bName: 'Vốn CSH' },
  ];

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">CÂN ĐỐI TÀI CHÍNH</span>}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="a" stackId="s" name="Ngắn hạn / Nợ phải trả" fill={NAVY} maxBarSize={70}>
                <LabelList dataKey="a" position="center" formatter={(v: number) => (v ? `${v.toFixed(0)}%` : '')} fill="#fff" style={{ fontSize: 11 }} />
              </Bar>
              <Bar dataKey="b" stackId="s" name="Dài hạn / Vốn CSH" fill={GOLD} maxBarSize={70}>
                <LabelList dataKey="b" position="center" formatter={(v: number) => (v ? `${v.toFixed(0)}%` : '')} fill="#fff" style={{ fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center text-sm mt-1">
            Tổng giá trị: <span className="font-semibold">{formatCurrency(tongTS)}</span>
          </div>
        </>
      )}
    </Card>
  );
};

export default BalanceStructureChart;
