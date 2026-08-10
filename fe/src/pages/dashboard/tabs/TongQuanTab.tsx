import React, { useMemo, useState } from 'react';
import { Row, Col } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  WalletOutlined, RiseOutlined, LineChartOutlined, SwapOutlined,
  ArrowDownOutlined, ArrowUpOutlined, InboxOutlined, AlertOutlined,
} from '@ant-design/icons';
import RevenueTrendChart from '../components/RevenueTrendChart';
import CashFlowChart from '../components/CashFlowChart';
import RevenueExpenseBreakdownCharts from '../components/RevenueExpenseBreakdownCharts';
import CongNoChart from '../components/CongNoChart';
import BalanceStructureChart from '../components/BalanceStructureChart';
import NghiaVuChinhSachTable from '../components/NghiaVuChinhSachTable';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import CanhBaoModal from '../components/CanhBaoModal';
import { dashboardService } from '@/services/dashboardService';
import { congNoPhaiThuService } from '@/services/congNoPhaiThuService';
import { congNoPhaiTraService } from '@/services/congNoPhaiTraService';
import { tongTien, giaTriTonKho, tienTheoTaiKhoan } from '../trialBalanceDerive';
import { tinhCanhBao } from '../canhBao';
import type { TabProps } from './TabProps';

interface Props extends TabProps {
  /** Key các khối được bật trong cấu hình của tenant. */
  visibleKeys: string[];
}

const KHONG_THEO_KY = 'Số dư công nợ tính đến hôm nay, không đổi theo bộ lọc kỳ.';

const TongQuanTab: React.FC<Props> = ({ year, startMonth, endMonth, visibleKeys }) => {
  const show = (key: string) => visibleKeys.includes(key);

  const [canhBaoOpen, setCanhBaoOpen] = useState(false);

  const { data: tb = [], isLoading: loadingTb } = useQuery({
    queryKey: ['dash-tb', year, startMonth, endMonth],
    queryFn: () => dashboardService.getTrialBalance(year, startMonth, endMonth),
  });
  const { data: kqkd, isLoading: loadingKqkd } = useQuery({
    queryKey: ['dash-kqkd-tong', year, startMonth, endMonth],
    queryFn: () => dashboardService.getKqkdTongHop(year, startMonth, endMonth),
  });
  const { data: cash = [], isLoading: loadingCash } = useQuery({
    queryKey: ['dash-cash', year],
    queryFn: () => dashboardService.getCashSeries(year),
  });
  const { data: statsThu, isLoading: loadingStatsThu } = useQuery({
    queryKey: ['dash-stats-thu'],
    queryFn: () => congNoPhaiThuService.getStats(),
  });
  const { data: statsTra, isLoading: loadingStatsTra } = useQuery({
    queryKey: ['dash-stats-tra'],
    queryFn: () => congNoPhaiTraService.getStats(),
  });
  const { data: quaHanThu = [], isLoading: loadingQhThu } = useQuery({
    queryKey: ['dash-qh-thu'],
    queryFn: () => dashboardService.getOverdueAr(),
  });
  const { data: quaHanTra = [], isLoading: loadingQhTra } = useQuery({
    queryKey: ['dash-qh-tra'],
    queryFn: () => dashboardService.getOverdueAp(),
  });

  const loadingKpi =
    loadingTb || loadingKqkd || loadingCash || loadingStatsThu ||
    loadingStatsTra || loadingQhThu || loadingQhTra;

  const dongTienThuan = useMemo(
    () =>
      cash
        .filter((p) => p.thang >= startMonth && p.thang <= endMonth)
        .reduce((s, p) => s + p.thu - p.chi, 0),
    [cash, startMonth, endMonth],
  );

  const canhBao = useMemo(
    () =>
      tinhCanhBao({
        quaHanThu,
        quaHanTra,
        taiKhoanTien: tienTheoTaiKhoan(tb),
        loiNhuanSauThue: kqkd?.loiNhuanSauThue ?? 0,
      }),
    [quaHanThu, quaHanTra, tb, kqkd],
  );

  const kpis: KpiItem[] = [
    { key: 'tongTien', label: 'Tổng tiền', value: tongTien(tb), icon: <WalletOutlined /> },
    // Nhãn nói rõ công thức: biểu đồ ngay dưới lấy từ `pnl-series` (doanh thu =
    // mọi TK 5x, lợi nhuận = 5x − 6x, tức TRƯỚC thuế), còn hai thẻ này lấy chỉ
    // tiêu KQKD 01 (Có 511) và 60 (LN SAU thuế). Công ty có TK 515/521 hoặc
    // thuế TNDN khác 0 sẽ thấy hai con số khác nhau trong cùng một khung nhìn.
    { key: 'doanhThu', label: 'Doanh thu bán hàng', value: kqkd?.doanhThu ?? 0, icon: <RiseOutlined /> },
    { key: 'loiNhuan', label: 'Lợi nhuận sau thuế', value: kqkd?.loiNhuanSauThue ?? 0, icon: <LineChartOutlined /> },
    { key: 'dongTien', label: 'Dòng tiền thuần', value: dongTienThuan, icon: <SwapOutlined /> },
    // `getStats()` không nhận tham số ngày → hai thẻ này tính đến hôm nay,
    // không đổi theo bộ lọc kỳ. Nhãn nói rõ (giữ nguồn dùng chung với tab Công
    // nợ theo spec, để hai tab không lệch số).
    { key: 'phaiThu', label: 'Phải thu đến hôm nay', value: statsThu?.conLai ?? 0, tooltip: KHONG_THEO_KY, icon: <ArrowDownOutlined /> },
    { key: 'phaiTra', label: 'Phải trả đến hôm nay', value: statsTra?.conLai ?? 0, tooltip: KHONG_THEO_KY, icon: <ArrowUpOutlined /> },
    { key: 'tonKho', label: 'Giá trị tồn kho', value: giaTriTonKho(tb), icon: <InboxOutlined /> },
    {
      key: 'canhBao',
      label: 'Cảnh báo',
      value: canhBao.length,
      format: 'soLuong',
      inverse: true,
      icon: <AlertOutlined />,
      onClick: () => setCanhBaoOpen(true),
    },
  ];

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={loadingKpi} />

      {(show('kqkd') || show('dongTien')) && (
        <Row gutter={[12, 12]}>
          {show('kqkd') && (
            <Col xs={24} lg={12}>
              <RevenueTrendChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
          {show('dongTien') && (
            <Col xs={24} lg={12}>
              <CashFlowChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
        </Row>
      )}

      {show('tyTrong') && (
        <RevenueExpenseBreakdownCharts year={year} startMonth={startMonth} endMonth={endMonth} />
      )}

      {(show('congNo') || show('canDoi')) && (
        <Row gutter={[12, 12]}>
          {show('congNo') && (
            <Col xs={24} lg={12}>
              <CongNoChart year={year} startMonth={startMonth} endMonth={endMonth} />
            </Col>
          )}
          {show('canDoi') && (
            <Col xs={24} lg={12}>
              <BalanceStructureChart />
            </Col>
          )}
        </Row>
      )}

      {show('nghiaVuChinhSach') && <NghiaVuChinhSachTable year={year} />}

      <CanhBaoModal open={canhBaoOpen} items={canhBao} onClose={() => setCanhBaoOpen(false)} />
    </div>
  );
};

export default TongQuanTab;
