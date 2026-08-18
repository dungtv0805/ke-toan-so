import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownOutlined, ArrowUpOutlined, CalendarOutlined, WarningOutlined } from '@ant-design/icons';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import AgingCharts from '../components/AgingCharts';
import OverdueTables from '../components/OverdueTables';
import LichThanhToanTables from '../components/LichThanhToanTables';
import DoiChieuCongNoTable from '../components/DoiChieuCongNoTable';
import { dashboardService } from '@/services/dashboardService';
import { congNoPhaiThuService } from '@/services/congNoPhaiThuService';
import { congNoPhaiTraService } from '@/services/congNoPhaiTraService';
import { tinhLichThanhToan } from '../lichThanhToan';
import { doiChieuCongNo } from '../trialBalanceDerive';
import type { TabProps } from './TabProps';

const KHONG_THEO_KY = 'Tính đến hôm nay, không đổi theo bộ lọc kỳ (bảng đối chiếu bên dưới thì có).';

const CongNoTab: React.FC<TabProps> = ({ year, startMonth, endMonth }) => {
  const { data: statsThu, isLoading: loadingStatsThu } = useQuery({
    queryKey: ['dash-stats-thu'],
    queryFn: () => congNoPhaiThuService.getStats(),
  });
  const { data: statsTra, isLoading: loadingStatsTra } = useQuery({
    queryKey: ['dash-stats-tra'],
    queryFn: () => congNoPhaiTraService.getStats(),
  });
  const { data: khoanThu = [], isLoading: loadingLich } = useQuery({
    queryKey: ['dash-khoan-thu'],
    queryFn: () => dashboardService.getKhoanPhaiThanhToan('thu'),
  });
  const { data: khoanTra = [], isLoading: loadingLichTra } = useQuery({
    queryKey: ['dash-khoan-tra'],
    queryFn: () => dashboardService.getKhoanPhaiThanhToan('tra'),
  });
  const { data: tb = [], isLoading: loadingTb } = useQuery({
    queryKey: ['dash-tb', year, startMonth, endMonth],
    queryFn: () => dashboardService.getTrialBalance(year, startMonth, endMonth),
  });
  // Cùng queryKey với tab Tổng quan → React Query dùng chung cache, không gọi lại.
  const { data: quaHanThu = [], isLoading: loadingQhThu } = useQuery({
    queryKey: ['dash-qh-thu'],
    queryFn: () => dashboardService.getOverdueAr(),
  });
  const { data: quaHanTra = [], isLoading: loadingQhTra } = useQuery({
    queryKey: ['dash-qh-tra'],
    queryFn: () => dashboardService.getOverdueAp(),
  });

  const homNay = useMemo(() => new Date(), []);
  const lichThu = useMemo(() => tinhLichThanhToan(khoanThu, homNay), [khoanThu, homNay]);
  const lichTra = useMemo(() => tinhLichThanhToan(khoanTra, homNay), [khoanTra, homNay]);

  const doiChieuThu = useMemo(() => doiChieuCongNo(tb, 'thu'), [tb]);
  const doiChieuTra = useMemo(() => doiChieuCongNo(tb, 'tra'), [tb]);

  // "Đến hạn" = tổng hai mốc gần nhất (trong 30 ngày) của cả thu lẫn trả.
  const denHan =
    lichThu[0].soTien + lichThu[1].soTien + lichTra[0].soTien + lichTra[1].soTien;

  // "Quá hạn" là SỐ TIỀN, cộng từ danh sách khoản quá hạn.
  // KHÔNG dùng `stats.tongQuaHan` — backend không bao giờ trả trường đó (chỉ có
  // `soKhoanQuaHan`, là số khoản), nên thẻ sẽ luôn đứng 0.
  const quaHan =
    quaHanThu.reduce((s, r) => s + r.conLai, 0) +
    quaHanTra.reduce((s, r) => s + r.conLai, 0);

  // CẢ BỐN thẻ tính "đến hôm nay", KHÔNG theo bộ lọc kỳ phía trên: `getStats()`
  // không nhận tham số ngày, `tinhLichThanhToan` và danh sách quá hạn mốc từ
  // `new Date()`. Bảng "Đối chiếu công nợ" cùng tab thì CÓ theo kỳ — nhãn phải
  // nói rõ, nếu không đổi Quý 1 → Năm nay mà hàng KPI đứng yên sẽ đọc như lỗi.
  // Dùng chung `getStats()` với tab Tổng quan là quyết định của spec (hai tab
  // không được lệch số), nên sửa bằng nhãn chứ không đổi nguồn dữ liệu.
  const kpis: KpiItem[] = [
    { key: 'phaiThu', label: 'Phải thu đến hôm nay', value: statsThu?.conLai ?? 0, tooltip: KHONG_THEO_KY, icon: <ArrowDownOutlined /> },
    { key: 'phaiTra', label: 'Phải trả đến hôm nay', value: statsTra?.conLai ?? 0, tooltip: KHONG_THEO_KY, icon: <ArrowUpOutlined /> },
    { key: 'denHan', label: 'Đến hạn trong 30 ngày', value: denHan, tooltip: KHONG_THEO_KY, icon: <CalendarOutlined /> },
    { key: 'quaHan', label: 'Quá hạn đến hôm nay', value: quaHan, inverse: true, tooltip: KHONG_THEO_KY, icon: <WarningOutlined /> },
  ];

  const kyLabel = startMonth === endMonth ? `Tháng ${startMonth}/${year}` : `Tháng ${startMonth}-${endMonth}/${year}`;

  // Cổng skeleton phải phủ MỌI query cấp dữ liệu cho hàng KPI — thiếu một cái là
  // thẻ đó nháy số 0 như thể là số thật trước khi nhảy sang số đúng.
  const loadingKpi =
    loadingLich || loadingLichTra || loadingStatsThu || loadingStatsTra ||
    loadingQhThu || loadingQhTra;

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={loadingKpi} />
      <AgingCharts />
      <LichThanhToanTables
        thu={lichThu}
        tra={lichTra}
        loading={loadingLich}
        tieuDeThu="Lịch thu nợ"
        tieuDeTra="Lịch trả nợ"
      />
      <OverdueTables />
      <DoiChieuCongNoTable thu={doiChieuThu} tra={doiChieuTra} loading={loadingTb} kyLabel={kyLabel} />
    </div>
  );
};

export default CongNoTab;
