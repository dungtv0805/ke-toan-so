import React, { useMemo } from 'react';
import { Card, Row, Col, Skeleton } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { keHoachService } from '@/services/keHoachService';
import { sliceToRange } from '@/components/shared/period';
import { tinhTinhHinhThucHien, type MucSoSanh } from './tinhHinhThucHien';

interface Props {
  year: number;
  startMonth: number;
  endMonth: number;
}

type MucKey = 'doanhThu' | 'chiPhi' | 'loiNhuan';

const ITEMS: { key: MucKey; title: string; color: string; vuotLaXau?: boolean }[] = [
  { key: 'doanhThu', title: 'Tình hình thực hiện doanh thu', color: 'hsl(var(--success))' },
  { key: 'chiPhi', title: 'Tình hình thực hiện chi phí', color: 'hsl(var(--destructive))', vuotLaXau: true },
  { key: 'loiNhuan', title: 'Tình hình thực hiện lợi nhuận', color: 'hsl(var(--primary))' },
];

const soTien = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v));

/** Gauge nửa vòng 0%→150%. percent=0 khi chưa có dữ liệu kế hoạch. */
const Gauge: React.FC<{ percent: number; color: string }> = ({ percent, color }) => (
  <div className="relative" style={{ height: 150 }}>
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        innerRadius="80%" outerRadius="100%" startAngle={180} endAngle={0}
        data={[{ value: Math.max(0, Math.min(percent, 150)) }]} barSize={16}
      >
        <PolarAngleAxis type="number" domain={[0, 150]} angleAxisId={0} tick={false} />
        <RadialBar dataKey="value" angleAxisId={0} background fill={color} cornerRadius={8} />
      </RadialBarChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex items-end justify-center pb-2">
      <span className="text-lg font-semibold text-muted-foreground">{percent.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
    </div>
    <div className="flex justify-between px-6 text-[10px] text-muted-foreground -mt-1">
      <span>0%</span><span>150%</span>
    </div>
  </div>
);

const Legend: React.FC<{ color: string; muc: MucSoSanh }> = ({ color, muc }) => (
  <div className="space-y-1 text-xs">
    {([
      ['Thực hiện', color, muc.thucHien],
      ['Kế hoạch', 'hsl(var(--muted-foreground))', muc.keHoach],
      ['Chênh lệch', color, muc.chenhLech],
    ] as [string, string, number][]).map(([label, c, value]) => (
      <div key={label} className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: c }} />{label}</span>
        <span className="font-medium">{soTien(value)}</span>
      </div>
    ))}
    {muc.chuaCoKeHoach && (
      <div className="text-[10px] text-muted-foreground pt-1">Chưa nhập kế hoạch cho kỳ này</div>
    )}
  </div>
);

/**
 * Ba gauge so kế hoạch với thực hiện. "Thực hiện" lấy từ `pnl-series` — đúng nguồn
 * mà KPI "Kết quả kinh doanh" trên cùng trang đang dùng, nên hai khối không lệch số.
 * "Kế hoạch" lấy từ module Kế hoạch (`/voucher/ke-hoach/series`).
 */
const ExecutionStatusCharts: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const isWeekly = startMonth === endMonth;
  const month = isWeekly ? startMonth : undefined;

  const { data: thucHienFull, isLoading: dangTaiTH } = useQuery({
    queryKey: ['dash-pnl-series', year, month ?? 0],
    queryFn: () => dashboardService.getPnlSeries(year, month),
  });
  const { data: keHoachFull, isLoading: dangTaiKH } = useQuery({
    queryKey: ['dash-ke-hoach-series', year, month ?? 0],
    queryFn: () => keHoachService.getSeries(year, month).catch(() => []),
  });

  const ketQua = useMemo(() => {
    const cat = <T extends { thang: number }>(rows: T[] | undefined) =>
      isWeekly ? rows ?? [] : sliceToRange(rows ?? [], startMonth, endMonth);
    return tinhTinhHinhThucHien(cat(keHoachFull), cat(thucHienFull));
  }, [keHoachFull, thucHienFull, isWeekly, startMonth, endMonth]);

  const dangTai = dangTaiTH || dangTaiKH;

  return (
    <Row gutter={[12, 12]}>
      {ITEMS.map((it) => {
        const muc = ketQua[it.key];
        // Chi phí vượt kế hoạch là dấu hiệu xấu → chuyển sang màu cảnh báo.
        const color = it.vuotLaXau && muc.tyLeDat > 100 ? 'hsl(var(--destructive))' : it.color;
        return (
          <Col xs={24} lg={8} key={it.key}>
            <Card title={<span className="text-sm sm:text-base">{it.title}</span>}
                  extra={<span className="text-[10px] text-muted-foreground">Đvt: đồng</span>}>
              {dangTai ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : (
                <Row align="middle" gutter={8}>
                  <Col span={14}><Gauge percent={muc.tyLeDat} color={color} /></Col>
                  <Col span={10}><Legend color={color} muc={muc} /></Col>
                </Row>
              )}
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default ExecutionStatusCharts;
