import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RiseOutlined, ShoppingOutlined, LineChartOutlined, FallOutlined,
  ThunderboltOutlined, FileTextOutlined, PercentageOutlined, DollarOutlined,
} from '@ant-design/icons';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import XuHuongChiTieuChart from '../components/XuHuongChiTieuChart';
import LoiNhuanTheoChieuChart from '../components/LoiNhuanTheoChieuChart';
import RevenueExpenseBreakdownCharts from '../components/RevenueExpenseBreakdownCharts';
import { dashboardService } from '@/services/dashboardService';
import type { TabProps } from './TabProps';

const KqkdTab: React.FC<TabProps> = ({ year, startMonth, endMonth }) => {
  const { data: ct = {}, isLoading } = useQuery({
    queryKey: ['dash-kqkd-chi-tieu', year, startMonth, endMonth],
    queryFn: () => dashboardService.getKqkdChiTieu(year, startMonth, endMonth),
  });

  const doanhThuThuan = ct['10'] ?? 0;
  const loiNhuanSauThue = ct['60'] ?? 0;
  const tySuat = doanhThuThuan !== 0 ? (loiNhuanSauThue / doanhThuThuan) * 100 : 0;
  const tongChiPhi = (ct['22'] ?? 0) + (ct['25'] ?? 0) + (ct['26'] ?? 0);

  const kpis: KpiItem[] = [
    // "Doanh thu bán hàng" (chỉ tiêu 01 = Có 511), phân biệt với "Doanh thu 5xx"
    // của biểu đồ xu hướng ngay dưới — hai công thức khác nhau.
    { key: 'doanhThu', label: 'Doanh thu bán hàng', value: ct['01'] ?? 0, icon: <RiseOutlined /> },
    { key: 'giaVon', label: 'Giá vốn', value: ct['11'] ?? 0, icon: <ShoppingOutlined /> },
    { key: 'lnGop', label: 'Lợi nhuận gộp', value: ct['20'] ?? 0, icon: <LineChartOutlined /> },
    { key: 'chiPhi', label: 'Chi phí', value: tongChiPhi, icon: <FallOutlined /> },
    {
      key: 'ebitda',
      label: 'EBITDA',
      // `null` khi BE chưa trả trường này → thẻ hiện "—" thay vì 0 ₫.
      value: ct.ebitda ?? null,
      tooltip: 'EBITDA = Lợi nhuận trước thuế + chi phí lãi vay (TK 635) + khấu hao (Có TK 214)',
      icon: <ThunderboltOutlined />,
    },
    { key: 'lntt', label: 'LN trước thuế', value: ct['50'] ?? 0, icon: <FileTextOutlined /> },
    { key: 'lnst', label: 'LN sau thuế', value: loiNhuanSauThue, icon: <DollarOutlined /> },
    { key: 'tySuat', label: 'Tỷ suất LN ròng', value: tySuat, format: 'phanTram', icon: <PercentageOutlined /> },
  ];

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={isLoading} />
      <XuHuongChiTieuChart year={year} startMonth={startMonth} endMonth={endMonth} />
      <RevenueExpenseBreakdownCharts year={year} startMonth={startMonth} endMonth={endMonth} />
      <LoiNhuanTheoChieuChart year={year} startMonth={startMonth} endMonth={endMonth} />
    </div>
  );
};

export default KqkdTab;
