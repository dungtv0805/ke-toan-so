import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Tabs,
  Breadcrumb,
  Tag,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  ExportOutlined,
  HomeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  BankOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  soCaiService,
  TrialBalance,
  SoCaiStats,
} from '@/services/soCaiService';
import {
  balanceSheetService,
  BalanceSheetData,
  BalanceSheetItem,
  BalanceSheetStats,
} from '@/services/balanceSheetService';
import { pnlService, PnLComparisonData } from '@/services/pnlService';
import { PeriodFilter, PeriodFilterParams } from '@/components/shared/PeriodFilter';
import { kqkdService, KqkdReport } from '@/services/kqkdService';
import { KqkdTable } from '@/pages/bao-cao/kqkd/components/KqkdTable';
import { usePagePermission } from "@/hooks/usePagePermission";

// ============ TYPES ============

interface TrialBalanceState {
  trialBalance: TrialBalance[];
  soCaiStats: SoCaiStats | null;
}

interface BalanceSheetState {
  data: BalanceSheetData | null;
  stats: BalanceSheetStats | null;
}

// ============ HELPERS ============

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
  return formatCurrency(value);
};

const CurrencyCell: React.FC<{ value: number; bold?: boolean }> = ({ value, bold }) => (
  <span
    style={{
      color: value < 0 ? '#ff4d4f' : value > 0 ? '#52c41a' : 'inherit',
      fontWeight: bold ? 600 : 400,
    }}
  >
    {value !== 0 ? formatCurrency(value) : '-'}
  </span>
);

const getPeriodLabel = (params: PeriodFilterParams): string => {
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  switch (params.periodType) {
    case 'thang':
      return `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`;
    case 'quy': {
      const q = Math.floor(start.getMonth() / 3) + 1;
      return `Quý ${q}/${start.getFullYear()}`;
    }
    case 'nam':
      return `Năm ${start.getFullYear()}`;
    case 'tuyChon':
      return `${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`;
  }
};

// ============ MAIN COMPONENT ============

const BaoCaoTaiChinhPage: React.FC = () => {
  const { canExport } = usePagePermission("bao-cao/tai-chinh");
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);

  const [filterParams, setFilterParams] = useState<PeriodFilterParams>(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    return { periodType: 'thang' as const, startDate, endDate };
  });

  const [tbState, setTbState] = useState<TrialBalanceState>({
    trialBalance: [],
    soCaiStats: null,
  });

  const [bsState, setBsState] = useState<BalanceSheetState>({
    data: null,
    stats: null,
  });

  const [kqkdData, setKqkdData] = useState<KqkdReport | null>(null);
  const [pnlComparison, setPnlComparison] = useState<PnLComparisonData | null>(null);

  // Dynamic heights based on actual DOM measurements
  const [tabContentHeight, setTabContentHeight] = useState<number>(500);
  const [antTableScrollY, setAntTableScrollY] = useState<number>(400);

  useEffect(() => {
    const update = () => {
      const pane = document.querySelector('.ant-tabs-tabpane-active') as HTMLElement;
      if (!pane) return;
      const paneTop = pane.getBoundingClientRect().top;
      setTabContentHeight(Math.max(window.innerHeight - paneTop - 8, 200));
      setAntTableScrollY(Math.max(window.innerHeight - paneTop - 73 - 39, 200));
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', update); };
  }, [activeTab, loading]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate, periodType } = filterParams;
      const [trial, stats, bsData, bsStats, kqkd, pnlComp] = await Promise.all([
        soCaiService.getTrialBalance(startDate, endDate),
        soCaiService.getStats(startDate, endDate),
        balanceSheetService.getData(endDate),
        balanceSheetService.getStats(endDate),
        kqkdService.getData({ startDate, endDate, periodType }),
        pnlService.getComparison(startDate, endDate, periodType),
      ]);
      setTbState({ trialBalance: trial, soCaiStats: stats });
      setBsState({ data: bsData, stats: bsStats });
      setKqkdData(kqkd);
      setPnlComparison(pnlComp);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilter = (params: PeriodFilterParams) => {
    setFilterParams(params);
  };

  // ============ DASHBOARD STATS ============

  const doanhThu = kqkdData?.chiTieu.find((c) => c.ma === '10')?.kyHienTai
    ?? pnlComparison?.tongDoanhThu ?? 0;

  const loiNhuanSauThue = kqkdData?.chiTieu.find((c) => c.ma === '60')?.kyHienTai ?? (() => {
    if (!pnlComparison) return 0;
    const lntt = pnlComparison.loiNhuan;
    const thue = lntt > 0 ? lntt * 0.2 : 0;
    return lntt - thue;
  })();

  // ============ TAB 1: CÂN ĐỐI TÀI KHOẢN ============

  const trialBalanceColumns: ColumnsType<TrialBalance> = [
    { title: 'Tài khoản', dataIndex: 'taiKhoan', key: 'taiKhoan', width: 100, fixed: 'left' },
    { title: 'Tên tài khoản', dataIndex: 'tenTaiKhoan', key: 'tenTaiKhoan', width: 250, fixed: 'left' },
    {
      title: 'Số dư đầu kỳ',
      children: [
        { title: 'Nợ', dataIndex: 'soDuDauKyNo', key: 'soDuDauKyNo', width: 140, align: 'right' as const, render: (v: number) => <CurrencyCell value={v} /> },
        { title: 'Có', dataIndex: 'soDuDauKyCo', key: 'soDuDauKyCo', width: 140, align: 'right' as const, render: (v: number) => <CurrencyCell value={v} /> },
      ],
    },
    {
      title: 'Phát sinh trong kỳ',
      children: [
        { title: 'Nợ', dataIndex: 'phatSinhNo', key: 'phatSinhNo', width: 140, align: 'right' as const, render: (v: number) => <CurrencyCell value={v} /> },
        { title: 'Có', dataIndex: 'phatSinhCo', key: 'phatSinhCo', width: 140, align: 'right' as const, render: (v: number) => <CurrencyCell value={v} /> },
      ],
    },
    {
      title: 'Số dư cuối kỳ',
      children: [
        { title: 'Nợ', dataIndex: 'soDuCuoiKyNo', key: 'soDuCuoiKyNo', width: 140, align: 'right' as const, render: (v: number) => <CurrencyCell value={v} /> },
        { title: 'Có', dataIndex: 'soDuCuoiKyCo', key: 'soDuCuoiKyCo', width: 140, align: 'right' as const, render: (v: number) => <CurrencyCell value={v} /> },
      ],
    },
  ];

  // ============ TAB 2: CÂN ĐỐI KẾ TOÁN ============

  const balanceSheetColumns: ColumnsType<BalanceSheetItem> = [
    {
      title: 'Chỉ tiêu', dataIndex: 'tenChiTieu', key: 'tenChiTieu', width: 350,
      render: (text: string, record: BalanceSheetItem) => (
        <span style={{ fontWeight: record.isSection ? 700 : record.isTotal ? 600 : 400, paddingLeft: record.level * 16, color: record.isSection ? '#1890ff' : 'inherit' }}>{text}</span>
      ),
    },
    { title: 'Mã số', dataIndex: 'ma', key: 'ma', width: 80, align: 'center' },
    {
      title: 'Số đầu năm', dataIndex: 'dauNam', key: 'dauNam', width: 150, align: 'right',
      render: (value: number, record: BalanceSheetItem) => <CurrencyCell value={value} bold={record.isSection || record.isTotal} />,
    },
    {
      title: 'Số cuối kỳ', dataIndex: 'cuoiKy', key: 'cuoiKy', width: 150, align: 'right',
      render: (value: number, record: BalanceSheetItem) => <CurrencyCell value={value} bold={record.isSection || record.isTotal} />,
    },
    {
      title: 'Chênh lệch', key: 'chenhLech', width: 130, align: 'right',
      render: (_: unknown, record: BalanceSheetItem) => {
        if (record.dauNam === 0 && record.cuoiKy === 0) return '-';
        const diff = record.cuoiKy - record.dauNam;
        return (
          <Space>
            <span style={{ color: diff >= 0 ? '#52c41a' : '#ff4d4f' }}>{formatCurrencyShort(diff)}</span>
            {diff !== 0 && (diff > 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />)}
          </Space>
        );
      },
    },
  ];

  // ============ TAB 4: SO SÁNH LÃI LỖ ============

  type PnLCompRow = {
    key: string;
    khoanMuc: string;
    kyHienTai: number;
    kyTruoc: number;
    bienDong: number;
    phanTramBienDong: number | null;
    isCategory?: boolean;
    isSummary?: boolean;
  };

  const buildPnLComparisonData = (): PnLCompRow[] => {
    if (!pnlComparison) return [];
    const rows: PnLCompRow[] = [];
    const prev = pnlComparison.kyTruoc;

    const makeRow = (key: string, name: string, cur: number, pre: number, opts?: { isCategory?: boolean; isSummary?: boolean }): PnLCompRow => {
      const diff = cur - pre;
      const pct = pre !== 0 ? (diff / Math.abs(pre)) * 100 : (cur !== 0 ? 100 : null);
      return { key, khoanMuc: name, kyHienTai: cur, kyTruoc: pre, bienDong: diff, phanTramBienDong: pct, ...opts };
    };

    // Doanh thu
    rows.push(makeRow('cat-dt', 'DOANH THU', pnlComparison.tongDoanhThu, prev.tongDoanhThu, { isCategory: true }));
    pnlComparison.doanhThu.forEach((item, i) => {
      const prevItem = prev.doanhThu.find((p) => p.ma === item.ma);
      rows.push(makeRow(`dt-${i}`, `   ${item.ma} - ${item.ten}`, item.soTien, prevItem?.soTien ?? 0));
    });

    // Chi phí
    rows.push(makeRow('cat-cp', 'CHI PHÍ', pnlComparison.tongChiPhi, prev.tongChiPhi, { isCategory: true }));
    pnlComparison.chiPhi.forEach((item, i) => {
      const prevItem = prev.chiPhi.find((p) => p.ma === item.ma);
      rows.push(makeRow(`cp-${i}`, `   ${item.ma} - ${item.ten}`, item.soTien, prevItem?.soTien ?? 0));
    });

    // Lợi nhuận
    const lnttCur = pnlComparison.loiNhuan;
    const lnttPrev = prev.loiNhuan;
    rows.push(makeRow('lntt', 'LỢI NHUẬN TRƯỚC THUẾ', lnttCur, lnttPrev, { isSummary: true }));

    const thueCur = lnttCur > 0 ? lnttCur * 0.2 : 0;
    const thuePrev = lnttPrev > 0 ? lnttPrev * 0.2 : 0;
    rows.push(makeRow('thue', '   Thuế TNDN (20%)', -thueCur, -thuePrev));

    rows.push(makeRow('lnst', 'LỢI NHUẬN SAU THUẾ', lnttCur - thueCur, lnttPrev - thuePrev, { isSummary: true }));

    return rows;
  };

  const pnlCompColumns: ColumnsType<PnLCompRow> = [
    {
      title: 'Khoản mục', dataIndex: 'khoanMuc', key: 'khoanMuc', width: 350,
      render: (text: string, record: PnLCompRow) => (
        <span style={{ fontWeight: record.isCategory || record.isSummary ? 600 : 400, color: record.isSummary ? '#1890ff' : 'inherit' }}>{text}</span>
      ),
    },
    {
      title: 'Kỳ hiện tại', dataIndex: 'kyHienTai', key: 'kyHienTai', width: 160, align: 'right',
      render: (v: number, r: PnLCompRow) => <CurrencyCell value={v} bold={r.isCategory || r.isSummary} />,
    },
    {
      title: 'Kỳ trước', dataIndex: 'kyTruoc', key: 'kyTruoc', width: 160, align: 'right',
      render: (v: number, r: PnLCompRow) => <CurrencyCell value={v} bold={r.isCategory || r.isSummary} />,
    },
    {
      title: 'Biến động', dataIndex: 'bienDong', key: 'bienDong', width: 150, align: 'right',
      render: (v: number) => (
        <Space>
          <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{formatCurrencyShort(v)}</span>
          {v !== 0 && (v > 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />)}
        </Space>
      ),
    },
    {
      title: '% Biến động', dataIndex: 'phanTramBienDong', key: 'phanTramBienDong', width: 120, align: 'right',
      render: (v: number | null) => {
        if (v === null) return '-';
        return <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{v >= 0 ? '+' : ''}{v.toFixed(1)}%</span>;
      },
    },
  ];

  // ============ RENDER ============

  return (
    <div style={{ padding: '8px 16px', height: 'calc(100vh - 48px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> Trang chủ</> },
              { title: 'Báo cáo' },
              { title: 'Báo cáo tài chính' },
            ]}
          />
          <Space>
            <Tag color="blue">{getPeriodLabel(filterParams)}</Tag>
            <Button size="small" icon={<ExportOutlined />}>Xuất Excel</Button>
            <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 4 }}>
          <PeriodFilter onFilter={handleFilter} loading={loading} />
        </div>

        <Row gutter={8} style={{ marginBottom: 4 }}>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '4px 12px' }}>
            <Statistic title="Tổng tài sản" value={bsState.stats?.tongTaiSan ?? 0} formatter={(val) => formatCurrencyShort(val as number)} prefix={<BankOutlined style={{ color: '#1890ff' }} />} valueStyle={{ fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '4px 12px' }}>
            <Statistic title="Doanh thu" value={doanhThu} formatter={(val) => formatCurrencyShort(val as number)} prefix={<DollarOutlined style={{ color: '#52c41a' }} />} valueStyle={{ fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '4px 12px' }}>
            <Statistic
              title="Lợi nhuận sau thuế"
              value={loiNhuanSauThue}
              formatter={(val) => formatCurrencyShort(val as number)}
              valueStyle={{ color: loiNhuanSauThue >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 16 }}
              prefix={loiNhuanSauThue >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: '4px 12px' }}>
            <Statistic
              title="Cân đối phát sinh"
              value={tbState.soCaiStats?.canDoi ? 'Cân đối' : 'Lệch'}
              valueStyle={{ color: tbState.soCaiStats?.canDoi ? '#52c41a' : '#ff4d4f', fontSize: 16 }}
              prefix={tbState.soCaiStats?.canDoi ? <CheckCircleOutlined /> : <WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>
      </div>

      <Card size="small" bodyStyle={{ padding: '0 8px 8px' }} style={{ flex: 1, overflow: 'hidden' }}>

        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" items={[
          {
            key: '1',
            label: 'Cân đối tài khoản',
            children: (
              <>
                {tbState.soCaiStats && !tbState.soCaiStats.canDoi && (
                  <Alert message="Cảnh báo: Tổng phát sinh Nợ và Có không cân đối!" type="warning" showIcon style={{ marginBottom: 16 }} />
                )}
                <Table
                  className="excel-table"
                  columns={trialBalanceColumns}
                  dataSource={tbState.trialBalance}
                  rowKey="taiKhoan"
                  loading={loading}
                  bordered
                  size="small"
                  scroll={{ x: 1200, y: antTableScrollY }}
                  pagination={false}
                  summary={() => {
                    const totals = tbState.trialBalance.reduce(
                      (acc, row) => ({
                        soDuDauKyNo: acc.soDuDauKyNo + row.soDuDauKyNo,
                        soDuDauKyCo: acc.soDuDauKyCo + row.soDuDauKyCo,
                        phatSinhNo: acc.phatSinhNo + row.phatSinhNo,
                        phatSinhCo: acc.phatSinhCo + row.phatSinhCo,
                        soDuCuoiKyNo: acc.soDuCuoiKyNo + row.soDuCuoiKyNo,
                        soDuCuoiKyCo: acc.soDuCuoiKyCo + row.soDuCuoiKyCo,
                      }),
                      { soDuDauKyNo: 0, soDuDauKyCo: 0, phatSinhNo: 0, phatSinhCo: 0, soDuCuoiKyNo: 0, soDuCuoiKyCo: 0 },
                    );
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row style={{ fontWeight: 700, background: '#fafafa' }}>
                          <Table.Summary.Cell index={0} colSpan={2}>Tổng cộng</Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">{formatCurrency(totals.soDuDauKyNo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">{formatCurrency(totals.soDuDauKyCo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">{formatCurrency(totals.phatSinhNo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">{formatCurrency(totals.phatSinhCo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">{formatCurrency(totals.soDuCuoiKyNo)}</Table.Summary.Cell>
                          <Table.Summary.Cell index={7} align="right">{formatCurrency(totals.soDuCuoiKyCo)}</Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
              </>
            ),
          },
          {
            key: '2',
            label: 'Cân đối kế toán',
            children: bsState.data ? (
              <div style={{ maxHeight: tabContentHeight, overflow: 'auto' }}>
                {!bsState.data.canDoi && (
                  <Alert message="Cảnh báo: Tổng tài sản và Tổng nguồn vốn không cân đối!" type="warning" showIcon style={{ marginBottom: 16 }} />
                )}
                <Card title="TÀI SẢN" size="small" style={{ marginBottom: 16 }}>
                  <Table className="excel-table" columns={balanceSheetColumns} dataSource={bsState.data.taiSan} rowKey="ma" loading={loading} bordered size="small" pagination={false} />
                </Card>
                <Card title="NGUỒN VỐN" size="small">
                  <Table className="excel-table" columns={balanceSheetColumns} dataSource={bsState.data.nguonVon} rowKey="ma" loading={loading} bordered size="small" pagination={false} />
                </Card>
              </div>
            ) : null,
          },
          {
            key: '3',
            label: 'Kết quả kinh doanh',
            children: (
              <div style={{ maxHeight: tabContentHeight, overflow: 'auto' }}>
                <KqkdTable data={kqkdData?.chiTieu ?? []} loading={loading} />
              </div>
            ),
          },
          {
            key: '4',
            label: 'So sánh lãi lỗ',
            children: (
              <Table
                className="excel-table"
                columns={pnlCompColumns}
                dataSource={buildPnLComparisonData()}
                rowKey="key"
                loading={loading}
                bordered
                size="small"
                scroll={{ y: antTableScrollY }}
                pagination={false}
                rowClassName={(record) => record.isSummary ? 'ant-table-row-summary' : record.isCategory ? 'ant-table-row-category' : ''}
              />
            ),
          },
        ]} />
      </Card>
    </div>
  );
};

export default BaoCaoTaiChinhPage;
