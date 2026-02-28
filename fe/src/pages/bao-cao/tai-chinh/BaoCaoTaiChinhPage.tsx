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
import {
  pnlService,
  PnLSummary,
  PnLGroupedData,
  PnLItem,
} from '@/services/pnlService';

// ============ TYPES ============

interface TrialBalanceState {
  trialBalance: TrialBalance[];
  soCaiStats: SoCaiStats | null;
}

interface BalanceSheetState {
  data: BalanceSheetData | null;
  stats: BalanceSheetStats | null;
}

interface PnLState {
  groupedData: PnLGroupedData[];
  summary: PnLSummary | null;
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

// ============ MAIN COMPONENT ============

const BaoCaoTaiChinhPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);

  const [tbState, setTbState] = useState<TrialBalanceState>({
    trialBalance: [],
    soCaiStats: null,
  });

  const [bsState, setBsState] = useState<BalanceSheetState>({
    data: null,
    stats: null,
  });

  const [pnlState, setPnlState] = useState<PnLState>({
    groupedData: [],
    summary: null,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [trial, stats, bsData, bsStats, grouped, summary] = await Promise.all([
        soCaiService.getTrialBalance(),
        soCaiService.getStats(),
        balanceSheetService.getData(),
        balanceSheetService.getStats(),
        pnlService.getGroupedPnLData(),
        pnlService.getSummary('thangNay'),
      ]);
      setTbState({ trialBalance: trial, soCaiStats: stats });
      setBsState({ data: bsData, stats: bsStats });
      setPnlState({ groupedData: grouped, summary });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // ============ TAB 3: KẾT QUẢ KINH DOANH ============

  type PnLRow = { key: string; khoanMuc: string; soTien: number; isCategory?: boolean; isSummary?: boolean };

  const buildPnLTableData = (): PnLRow[] => {
    const rows: PnLRow[] = [];

    pnlState.groupedData.forEach((group, gIndex) => {
      rows.push({ key: `cat-${gIndex}`, khoanMuc: group.category.name, soTien: group.subtotal, isCategory: true });
      group.items.forEach((item: PnLItem, iIndex: number) => {
        rows.push({ key: `item-${gIndex}-${iIndex}`, khoanMuc: `   ${item.ma} - ${item.ten}`, soTien: item.soTien });
      });
    });

    const loiNhuanTruocThue = pnlState.summary?.loiNhuanTruocThue ?? 0;
    const thue = pnlState.summary?.thue ?? 0;
    const loiNhuanSauThue = pnlState.summary?.loiNhuanSauThue ?? 0;

    rows.push({ key: 'profit-before-tax', khoanMuc: 'LỢI NHUẬN TRƯỚC THUẾ', soTien: loiNhuanTruocThue, isSummary: true });
    rows.push({ key: 'tax', khoanMuc: '   Thuế TNDN (20%)', soTien: -thue });
    rows.push({ key: 'net-profit', khoanMuc: 'LỢI NHUẬN SAU THUẾ', soTien: loiNhuanSauThue, isSummary: true });

    return rows;
  };

  const pnlColumns: ColumnsType<PnLRow> = [
    {
      title: 'Khoản mục', dataIndex: 'khoanMuc', key: 'khoanMuc', width: 400,
      render: (text: string, record: PnLRow) => (
        <span style={{ fontWeight: record.isCategory || record.isSummary ? 600 : 400, color: record.isSummary ? '#1890ff' : 'inherit' }}>{text}</span>
      ),
    },
    {
      title: 'Số tiền', dataIndex: 'soTien', key: 'soTien', width: 200, align: 'right',
      render: (value: number, record: PnLRow) => <CurrencyCell value={value} bold={record.isCategory || record.isSummary} />,
    },
  ];

  // ============ RENDER ============

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> Trang chủ</> },
          { title: 'Báo cáo' },
          { title: 'Báo cáo tài chính' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Card
        title={
          <Space>
            <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Báo cáo tài chính</span>
            <Tag color="blue">Năm {currentYear}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ExportOutlined />}>Xuất Excel</Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Tổng tài sản" value={bsState.stats?.tongTaiSan ?? 0} formatter={(val) => formatCurrencyShort(val as number)} prefix={<BankOutlined style={{ color: '#1890ff' }} />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Doanh thu" value={pnlState.summary?.tongDoanhThu ?? 0} formatter={(val) => formatCurrencyShort(val as number)} prefix={<DollarOutlined style={{ color: '#52c41a' }} />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Lợi nhuận sau thuế"
                value={pnlState.summary?.loiNhuanSauThue ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                valueStyle={{ color: (pnlState.summary?.loiNhuanSauThue ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
                prefix={(pnlState.summary?.loiNhuanSauThue ?? 0) >= 0 ? <RiseOutlined /> : <FallOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Cân đối phát sinh"
                value={tbState.soCaiStats?.canDoi ? 'Cân đối' : 'Lệch'}
                valueStyle={{ color: tbState.soCaiStats?.canDoi ? '#52c41a' : '#ff4d4f' }}
                prefix={tbState.soCaiStats?.canDoi ? <CheckCircleOutlined /> : <WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>

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
                  columns={trialBalanceColumns}
                  dataSource={tbState.trialBalance}
                  rowKey="taiKhoan"
                  loading={loading}
                  bordered
                  size="small"
                  scroll={{ x: 1200 }}
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
              <>
                {!bsState.data.canDoi && (
                  <Alert message="Cảnh báo: Tổng tài sản và Tổng nguồn vốn không cân đối!" type="warning" showIcon style={{ marginBottom: 16 }} />
                )}
                <Card title="TÀI SẢN" size="small" style={{ marginBottom: 16 }}>
                  <Table columns={balanceSheetColumns} dataSource={bsState.data.taiSan} rowKey="ma" loading={loading} bordered size="small" pagination={false} />
                </Card>
                <Card title="NGUỒN VỐN" size="small">
                  <Table columns={balanceSheetColumns} dataSource={bsState.data.nguonVon} rowKey="ma" loading={loading} bordered size="small" pagination={false} />
                </Card>
              </>
            ) : null,
          },
          {
            key: '3',
            label: 'Kết quả kinh doanh',
            children: (
              <Table
                columns={pnlColumns}
                dataSource={buildPnLTableData()}
                rowKey="key"
                loading={loading}
                bordered
                size="small"
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
