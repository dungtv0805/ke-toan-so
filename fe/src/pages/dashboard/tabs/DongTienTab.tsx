import React, { useMemo } from 'react';
import { Row, Col, Card } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  WalletOutlined, ArrowDownOutlined, ArrowUpOutlined, SwapOutlined, BankOutlined, PieChartOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import CashFlowChart from '../components/CashFlowChart';
import TienTheoTaiKhoanTable from '../components/TienTheoTaiKhoanTable';
import { dashboardService } from '@/services/dashboardService';
import { tienTheoTaiKhoan } from '../trialBalanceDerive';
import { formatCurrency } from '../components/format';
import type { TabProps } from './TabProps';

const PIE_PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--brand-gold))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

const Donut: React.FC<{ title: string; data: { ten: string; soTien: number }[] }> = ({ title, data }) => (
  <Card title={<span className="text-sm sm:text-base"><PieChartOutlined className="text-primary mr-2" />{title}</span>}>
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="soTien" nameKey="ten" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatCurrency(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  </Card>
);

const DongTienTab: React.FC<TabProps> = ({ year, startMonth, endMonth }) => {
  const { data: tb = [], isLoading: loadingTb } = useQuery({
    queryKey: ['dash-tb', year, startMonth, endMonth],
    queryFn: () => dashboardService.getTrialBalance(year, startMonth, endMonth),
  });
  const { data: cash = [], isLoading: loadingCash } = useQuery({
    queryKey: ['dash-cash', year],
    queryFn: () => dashboardService.getCashSeries(year),
  });
  const { data: thu = [] } = useQuery({
    queryKey: ['dash-comp-thu', year, startMonth, endMonth],
    queryFn: () => dashboardService.getCashCompositionByRange('thu', year, startMonth, endMonth),
  });
  const { data: chi = [] } = useQuery({
    queryKey: ['dash-comp-chi', year, startMonth, endMonth],
    queryFn: () => dashboardService.getCashCompositionByRange('chi', year, startMonth, endMonth),
  });

  const rows = useMemo(() => tienTheoTaiKhoan(tb), [tb]);

  const trongKy = useMemo(
    () => cash.filter((p) => p.thang >= startMonth && p.thang <= endMonth),
    [cash, startMonth, endMonth],
  );
  const tongThu = trongKy.reduce((s, p) => s + p.thu, 0);
  const tongChi = trongKy.reduce((s, p) => s + p.chi, 0);
  // Số dư đầu kỳ lấy từ TK tiền (đã gồm tồn mang sang), không suy ra từ chuỗi thu-chi.
  const soDuDau = rows.filter((r) => /^\d/.test(r.ma)).reduce((s, r) => s + r.duDauKy, 0);

  const kpis: KpiItem[] = [
    { key: 'dau', label: 'Số dư đầu kỳ', value: soDuDau, icon: <WalletOutlined /> },
    { key: 'thu', label: 'Tổng thu', value: tongThu, icon: <ArrowDownOutlined /> },
    { key: 'chi', label: 'Tổng chi', value: tongChi, icon: <ArrowUpOutlined /> },
    { key: 'thuan', label: 'Dòng tiền thuần', value: tongThu - tongChi, icon: <SwapOutlined /> },
    { key: 'cuoi', label: 'Số dư cuối kỳ', value: soDuDau + tongThu - tongChi, icon: <BankOutlined /> },
  ];

  // Cổng skeleton phải phủ MỌI query cấp dữ liệu cho hàng KPI — thiếu một cái là
  // thẻ đó nháy số 0 như thể là số thật trước khi nhảy sang số đúng.
  const loadingKpi = loadingTb || loadingCash;

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={loadingKpi} span={5} />
      <CashFlowChart year={year} startMonth={startMonth} endMonth={endMonth} />
      <TienTheoTaiKhoanTable rows={rows} loading={loadingTb} />
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}><Donut title="Tỷ trọng tiền thu theo nhóm" data={thu} /></Col>
        <Col xs={24} lg={12}><Donut title="Tỷ trọng tiền chi theo nhóm" data={chi} /></Col>
      </Row>
    </div>
  );
};

export default DongTienTab;
