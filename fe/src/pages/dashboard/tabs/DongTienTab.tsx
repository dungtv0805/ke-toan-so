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
import LichThanhToanTables from '../components/LichThanhToanTables';
import { dashboardService } from '@/services/dashboardService';
import { tienTheoTaiKhoan } from '../trialBalanceDerive';
import { tinhLichThanhToan } from '../lichThanhToan';
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
  const { data: thu = [] } = useQuery({
    queryKey: ['dash-comp-thu', year, startMonth, endMonth],
    queryFn: () => dashboardService.getCashCompositionByRange('thu', year, startMonth, endMonth),
  });
  const { data: chi = [] } = useQuery({
    queryKey: ['dash-comp-chi', year, startMonth, endMonth],
    queryFn: () => dashboardService.getCashCompositionByRange('chi', year, startMonth, endMonth),
  });
  const { data: khoanThu = [], isLoading: loadingLich } = useQuery({
    queryKey: ['dash-khoan-thu'],
    queryFn: () => dashboardService.getKhoanPhaiThanhToan('thu'),
  });
  const { data: khoanTra = [] } = useQuery({
    queryKey: ['dash-khoan-tra'],
    queryFn: () => dashboardService.getKhoanPhaiThanhToan('tra'),
  });

  const rows = useMemo(() => tienTheoTaiKhoan(tb), [tb]);
  const homNay = useMemo(() => new Date(), []);
  const lichThu = useMemo(() => tinhLichThanhToan(khoanThu, homNay), [khoanThu, homNay]);
  const lichChi = useMemo(() => tinhLichThanhToan(khoanTra, homNay), [khoanTra, homNay]);

  // Cả năm thẻ KPI đều dựng từ CHÍNH các dòng cha mà bảng ngay dưới đang render,
  // không từ chuỗi cash-flow (đường dữ liệu độc lập: quét regex ^11[12] trên
  // chứng từ, cửa sổ ngày dựng khác). Nhờ đó Σ duCuoiKy = Σ duDauKy + Σ phatSinhNo
  // − Σ phatSinhCo đúng theo cấu trúc và KPI khớp dòng "Tổng cộng" của bảng.
  const cha = useMemo(() => rows.filter((r) => !r.laCon), [rows]);
  const cong = (f: 'duDauKy' | 'phatSinhNo' | 'phatSinhCo' | 'duCuoiKy') =>
    cha.reduce((s, r) => s + r[f], 0);
  const soDuDau = cong('duDauKy');
  const tongThu = cong('phatSinhNo');
  const tongChi = cong('phatSinhCo');

  const kpis: KpiItem[] = [
    { key: 'dau', label: 'Số dư đầu kỳ', value: soDuDau, icon: <WalletOutlined /> },
    { key: 'thu', label: 'Tổng thu', value: tongThu, icon: <ArrowDownOutlined /> },
    { key: 'chi', label: 'Tổng chi', value: tongChi, icon: <ArrowUpOutlined /> },
    { key: 'thuan', label: 'Dòng tiền thuần', value: tongThu - tongChi, icon: <SwapOutlined /> },
    // Lấy thẳng Σ duCuoiKy để khớp từng đồng với dòng "Tổng cộng" của bảng.
    { key: 'cuoi', label: 'Số dư cuối kỳ', value: cong('duCuoiKy'), icon: <BankOutlined /> },
  ];

  // Cổng skeleton phải phủ MỌI query cấp dữ liệu cho hàng KPI — thiếu một cái là
  // thẻ đó nháy số 0 như thể là số thật trước khi nhảy sang số đúng.
  const loadingKpi = loadingTb;

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={loadingKpi} span={5} />
      <CashFlowChart year={year} startMonth={startMonth} endMonth={endMonth} />
      <TienTheoTaiKhoanTable rows={rows} loading={loadingTb} />
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}><Donut title="Tỷ trọng tiền thu theo nhóm" data={thu} /></Col>
        <Col xs={24} lg={12}><Donut title="Tỷ trọng tiền chi theo nhóm" data={chi} /></Col>
      </Row>
      <LichThanhToanTables
        thu={lichThu}
        tra={lichChi}
        loading={loadingLich}
        tieuDeThu="Khoản thu sắp đến hạn"
        tieuDeTra="Khoản chi sắp đến hạn"
      />
    </div>
  );
};

export default DongTienTab;
