import React, { useMemo } from 'react';
import { Card, Skeleton, Empty, Popover } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import {
  dashboardService,
  type CashAccountSeries,
  type CashMoneyLine,
} from '@/services/dashboardService';
import { sliceToRange } from '@/components/shared/period';
import { formatCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }
const TEAL = DASH_COLORS.revenue;
const GRAY = 'hsl(var(--muted-foreground) / 0.35)';
const ORANGE = '#F2994A';

const kpiTrieu = (v: number) => Math.round((v || 0) / 1e6).toLocaleString('vi-VN');
const labelTrieu = (v: number) => (v ? Math.round(v / 1e6).toLocaleString('vi-VN') : '');
const labelTrieuAbs = (v: number) => (v ? Math.round(Math.abs(v) / 1e6).toLocaleString('vi-VN') : '');

const Kpi: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="min-w-0">
    <div className="text-lg sm:text-2xl font-bold truncate" style={{ color }}>{kpiTrieu(value)}</div>
    <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide truncate">{label}</div>
  </div>
);

export interface DongChiTiet {
  ma: string;
  ten: string;
  /**
   * Dòng quỹ/ngân hàng nằm dưới một TK tiền. Phải là cờ tường minh, KHÔNG đoán từ
   * hình dạng mã: mã ngân hàng là trường tự do, khách đặt mã `1121A` là dòng con
   * bị tính như dòng cha và cộng trùng tiền ở dòng Tổng cộng.
   */
  laCon: boolean;
  thu: number;
  chi: number;
  ton: number;
}

const congThu = (ps: { thu: number }[]) => ps.reduce((s, p) => s + (p.thu || 0), 0);
const congChi = (ps: { chi: number }[]) => ps.reduce((s, p) => s + (p.chi || 0), 0);

/**
 * Thu/chi cắt đúng khoảng đang hiển thị, còn TỒN phải luỹ kế từ ĐẦU NĂM tới bucket
 * cuối (tồn đầu kỳ + mọi phát sinh trước đó) — giống hệt cách đường "Tồn" của biểu
 * đồ được dựng. Cắt tồn theo khoảng thì tổng dòng chi tiết sẽ lệch với thẻ TỒN.
 */
export function tinhChiTiet(
  taiKhoan: CashAccountSeries[],
  isWeekly: boolean,
  startMonth: number,
  endMonth: number,
): DongChiTiet[] {
  const gop = (line: CashMoneyLine, laCon: boolean): DongChiTiet => {
    const trongKhoang = isWeekly ? line.points : sliceToRange(line.points, startMonth, endMonth);
    const denHetKy = isWeekly ? line.points : line.points.filter((p) => p.thang <= endMonth);
    return {
      ma: line.ma,
      ten: line.ten,
      laCon,
      thu: congThu(trongKhoang),
      chi: congChi(trongKhoang),
      ton: denHetKy.reduce((s, p) => s + (p.thu || 0) - (p.chi || 0), line.soDuDauKy),
    };
  };
  const coSo = (r: DongChiTiet) => !!(r.thu || r.chi || r.ton);
  const theoTon = (a: DongChiTiet, b: DongChiTiet) => b.ton - a.ton || a.ma.localeCompare(b.ma);

  return taiKhoan
    .map((tk) => ({ cha: gop(tk, false), con: tk.chiTiet.map((c) => gop(c, true)) }))
    .filter((n) => coSo(n.cha))
    .sort((a, b) => theoTon(a.cha, b.cha))
    .flatMap((n) => [n.cha, ...n.con.filter(coSo).sort(theoTon)]);
}

const ChiTietTaiKhoan: React.FC<{ rows: DongChiTiet[] }> = ({ rows }) => {
  // Chỉ cộng dòng cha để không đếm hai lần.
  const tong = (k: 'thu' | 'chi' | 'ton') =>
    rows.reduce((s, r) => (r.laCon ? s : s + r[k]), 0);
  const o = 'px-2 py-1 text-right tabular-nums whitespace-nowrap';
  return (
    <div className="max-h-[320px] overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b">
            <th className="px-2 py-1 text-left font-medium">Tài khoản / ngân hàng</th>
            <th className="px-2 py-1 text-right font-medium">Thu</th>
            <th className="px-2 py-1 text-right font-medium">Chi</th>
            <th className="px-2 py-1 text-right font-medium">Tồn</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            // Phần "chưa xác định đối tượng" phát ra với ma rỗng, hai TK cùng có
            // phần đó sẽ trùng key nếu chỉ lấy mã.
            <tr key={`${i}-${r.ma}`} className="border-b border-border/50">
              <td
                className={`px-2 py-1 whitespace-nowrap ${r.laCon ? 'text-muted-foreground' : 'font-medium'}`}
                style={{ paddingLeft: r.laCon ? 20 : undefined }}
              >
                {r.ma ? (
                  <>
                    <span className="font-medium">{r.ma}</span>
                    {r.ten && <span className="text-muted-foreground"> — {r.ten}</span>}
                  </>
                ) : (
                  <span className="italic">Chưa gán quỹ/ngân hàng</span>
                )}
              </td>
              <td className={o} style={{ color: TEAL }}>{formatCurrency(r.thu)}</td>
              <td className={o}>{formatCurrency(r.chi)}</td>
              <td className={o} style={{ color: ORANGE }}>{formatCurrency(r.ton)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="px-2 py-1">Tổng cộng</td>
            <td className={o} style={{ color: TEAL }}>{formatCurrency(tong('thu'))}</td>
            <td className={o}>{formatCurrency(tong('chi'))}</td>
            <td className={o} style={{ color: ORANGE }}>{formatCurrency(tong('ton'))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const CashFlowChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const isWeekly = startMonth === endMonth;
  const month = isWeekly ? startMonth : undefined;
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-cash-series', year, month ?? 0],
    queryFn: () => dashboardService.getCashSeries(year, month),
  });
  // chi vẽ âm (dưới trục 0)
  const data = useMemo(() => {
    const points = full?.points ?? [];
    return (isWeekly ? points : sliceToRange(points, startMonth, endMonth)).map((d) => ({
      ...d,
      chiNeg: -(d.chi || 0),
    }));
  }, [full, isWeekly, startMonth, endMonth]);
  const chiTiet = useMemo(
    () => tinhChiTiet(full?.taiKhoan ?? [], isWeekly, startMonth, endMonth),
    [full, isWeekly, startMonth, endMonth],
  );
  const sum = (k: 'thu' | 'chi') => data.reduce((s, d) => s + (d[k] || 0), 0);
  const ton = data.length ? data[data.length - 1].soDu : 0;
  const hasData = data.some((d) => d.thu || d.chi || d.soDu);

  const kpiRow = (
    <div className="grid grid-cols-3 gap-3">
      <Kpi label="Tổng thu" value={sum('thu')} color={TEAL} />
      <Kpi label="Tổng chi" value={sum('chi')} color="hsl(var(--muted-foreground))" />
      <Kpi label="Tồn" value={ton} color={ORANGE} />
    </div>
  );

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">DÒNG TIỀN</span>}>
      <div className="flex items-start justify-between gap-3 mb-2">
        {chiTiet.length ? (
          <Popover
            placement="bottomLeft"
            title={<span className="text-xs font-semibold">Chi tiết theo tài khoản / ngân hàng — Đvt: đồng</span>}
            content={<ChiTietTaiKhoan rows={chiTiet} />}
            overlayStyle={{ maxWidth: 560 }}
          >
            <div className="flex-1 cursor-help">{kpiRow}</div>
          </Popover>
        ) : (
          <div className="flex-1">{kpiRow}</div>
        )}
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Đvt: triệu</span>
      </div>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ left: -10, right: 8, top: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `${isWeekly ? 'Tuần' : 'Th'} ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => labelTrieu(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={42} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(Math.abs(value)), name]}
              labelFormatter={(l) => `${isWeekly ? 'Tuần' : 'Tháng'} ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="thu" name="Thu" fill={TEAL} maxBarSize={22}>
              <LabelList dataKey="thu" position="top" formatter={labelTrieu} style={{ fontSize: 10, fill: TEAL }} />
            </Bar>
            <Bar dataKey="chiNeg" name="Chi" fill={GRAY} maxBarSize={22}>
              <LabelList dataKey="chiNeg" position="bottom" formatter={labelTrieuAbs} style={{ fontSize: 10, fill: DASH_COLORS.muted }} />
            </Bar>
            <Line type="monotone" dataKey="soDu" name="Tồn" stroke={ORANGE} strokeWidth={2} dot={{ r: 3, fill: ORANGE }}>
              <LabelList dataKey="soDu" position="top" formatter={labelTrieu} style={{ fontSize: 10, fill: ORANGE }} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default CashFlowChart;
