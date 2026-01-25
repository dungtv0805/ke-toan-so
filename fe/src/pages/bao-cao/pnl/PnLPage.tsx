import React, { useState, useEffect } from 'react';
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
  Select,
  Tag
} from 'antd';
import { 
  ReloadOutlined, 
  ExportOutlined,
  HomeOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  DollarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line
} from 'recharts';
import { BaoCaoPnL } from '@/types';
import { pnlService, PnLSummary, PnLGroupedData } from '@/services/pnlService';
import { MonthlyPnL } from '@/mock-data/bao-cao';

const PnLPage: React.FC = () => {
  const [groupedData, setGroupedData] = useState<PnLGroupedData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPnL[]>([]);
  const [summary, setSummary] = useState<PnLSummary | null>(null);
  const [ytdSummary, setYtdSummary] = useState<{ tongDoanhThu: number; tongChiPhi: number; loiNhuan: number; soThang: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedPeriod, setSelectedPeriod] = useState<'thangNay' | 'thangTruoc' | 'luyKe'>('thangNay');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [grouped, monthly, summaryData, ytd] = await Promise.all([
        pnlService.getGroupedPnLData(),
        pnlService.getMonthlyPnL(),
        pnlService.getSummary(selectedPeriod),
        pnlService.getYTDSummary()
      ]);
      setGroupedData(grouped);
      setMonthlyData(monthly);
      setSummary(summaryData);
      setYtdSummary(ytd);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData, selectedPeriod]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (Math.abs(value) >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)} tỷ`;
    }
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(0)} tr`;
    }
    return formatCurrency(value);
  };

  // Build table data for detailed P&L
  const buildTableData = () => {
    const rows: Array<{
      key: string;
      khoanMuc: string;
      thangTruoc: number;
      thangNay: number;
      luyKe: number;
      keHoach: number;
      chenhLech: number;
      isCategory?: boolean;
      isSubtotal?: boolean;
      isSummary?: boolean;
    }> = [];

    const runningGrossProfit = { thangTruoc: 0, thangNay: 0, luyKe: 0, keHoach: 0, chenhLech: 0 };
    let runningOperatingProfit = { thangTruoc: 0, thangNay: 0, luyKe: 0, keHoach: 0, chenhLech: 0 };

    groupedData.forEach((group, gIndex) => {
      // Category header
      rows.push({
        key: `cat-${gIndex}`,
        khoanMuc: group.category.name,
        thangTruoc: group.subtotal.thangTruoc,
        thangNay: group.subtotal.thangNay,
        luyKe: group.subtotal.luyKe,
        keHoach: group.subtotal.keHoach,
        chenhLech: group.subtotal.chenhLech,
        isCategory: true,
      });

      // Items
      group.items.forEach((item, iIndex) => {
        rows.push({
          key: `item-${gIndex}-${iIndex}`,
          khoanMuc: `   ${item.khoanMuc}`,
          thangTruoc: item.thangTruoc,
          thangNay: item.thangNay,
          luyKe: item.luyKe,
          keHoach: item.keHoach,
          chenhLech: item.chenhLech,
        });
      });

      // Calculate running totals
      if (group.category.type === 'revenue') {
        runningGrossProfit.thangTruoc += group.subtotal.thangTruoc;
        runningGrossProfit.thangNay += group.subtotal.thangNay;
        runningGrossProfit.luyKe += group.subtotal.luyKe;
        runningGrossProfit.keHoach += group.subtotal.keHoach;
        runningGrossProfit.chenhLech += group.subtotal.chenhLech;
      } else if (group.category.key === 'gia_von') {
        runningGrossProfit.thangTruoc += group.subtotal.thangTruoc;
        runningGrossProfit.thangNay += group.subtotal.thangNay;
        runningGrossProfit.luyKe += group.subtotal.luyKe;
        runningGrossProfit.keHoach += group.subtotal.keHoach;
        runningGrossProfit.chenhLech += group.subtotal.chenhLech;

        // Add Gross Profit row after COGS
        rows.push({
          key: 'gross-profit',
          khoanMuc: 'LỢI NHUẬN GỘP',
          ...runningGrossProfit,
          isSummary: true,
        });
        runningOperatingProfit = { ...runningGrossProfit };
      } else {
        runningOperatingProfit.thangTruoc += group.subtotal.thangTruoc;
        runningOperatingProfit.thangNay += group.subtotal.thangNay;
        runningOperatingProfit.luyKe += group.subtotal.luyKe;
        runningOperatingProfit.keHoach += group.subtotal.keHoach;
        runningOperatingProfit.chenhLech += group.subtotal.chenhLech;
      }
    });

    // Add final profit rows
    rows.push({
      key: 'operating-profit',
      khoanMuc: 'LỢI NHUẬN TRƯỚC THUẾ',
      ...runningOperatingProfit,
      isSummary: true,
    });

    const thue = {
      thangTruoc: runningOperatingProfit.thangTruoc > 0 ? runningOperatingProfit.thangTruoc * 0.2 : 0,
      thangNay: runningOperatingProfit.thangNay > 0 ? runningOperatingProfit.thangNay * 0.2 : 0,
      luyKe: runningOperatingProfit.luyKe > 0 ? runningOperatingProfit.luyKe * 0.2 : 0,
      keHoach: runningOperatingProfit.keHoach > 0 ? runningOperatingProfit.keHoach * 0.2 : 0,
      chenhLech: 0,
    };

    rows.push({
      key: 'tax',
      khoanMuc: '   Thuế TNDN (20%)',
      thangTruoc: -thue.thangTruoc,
      thangNay: -thue.thangNay,
      luyKe: -thue.luyKe,
      keHoach: -thue.keHoach,
      chenhLech: thue.chenhLech,
    });

    rows.push({
      key: 'net-profit',
      khoanMuc: 'LỢI NHUẬN SAU THUẾ',
      thangTruoc: runningOperatingProfit.thangTruoc - thue.thangTruoc,
      thangNay: runningOperatingProfit.thangNay - thue.thangNay,
      luyKe: runningOperatingProfit.luyKe - thue.luyKe,
      keHoach: runningOperatingProfit.keHoach - thue.keHoach,
      chenhLech: (runningOperatingProfit.chenhLech - thue.chenhLech),
      isSummary: true,
    });

    return rows;
  };

  const columns: ColumnsType<ReturnType<typeof buildTableData>[0]> = [
    {
      title: 'Khoản mục',
      dataIndex: 'khoanMuc',
      key: 'khoanMuc',
      width: 280,
      fixed: 'left',
      render: (text, record) => (
        <span style={{ 
          fontWeight: record.isCategory || record.isSummary ? 600 : 400,
          color: record.isSummary ? '#1890ff' : 'inherit'
        }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Tháng trước',
      dataIndex: 'thangTruoc',
      key: 'thangTruoc',
      width: 150,
      align: 'right',
      render: (value, record) => (
        <span style={{ 
          color: value < 0 ? '#ff4d4f' : value > 0 ? '#52c41a' : 'inherit',
          fontWeight: record.isCategory || record.isSummary ? 600 : 400
        }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: 'Tháng này',
      dataIndex: 'thangNay',
      key: 'thangNay',
      width: 150,
      align: 'right',
      render: (value, record) => (
        <span style={{ 
          color: value < 0 ? '#ff4d4f' : value > 0 ? '#52c41a' : 'inherit',
          fontWeight: record.isCategory || record.isSummary ? 600 : 400
        }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: 'Lũy kế năm',
      dataIndex: 'luyKe',
      key: 'luyKe',
      width: 160,
      align: 'right',
      render: (value, record) => (
        <span style={{ 
          color: value < 0 ? '#ff4d4f' : value > 0 ? '#52c41a' : 'inherit',
          fontWeight: record.isCategory || record.isSummary ? 600 : 400
        }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: 'Kế hoạch',
      dataIndex: 'keHoach',
      key: 'keHoach',
      width: 150,
      align: 'right',
      render: (value, record) => (
        <span style={{ fontWeight: record.isCategory || record.isSummary ? 600 : 400 }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: 'Chênh lệch',
      dataIndex: 'chenhLech',
      key: 'chenhLech',
      width: 140,
      align: 'right',
      render: (value, record) => {
        const isPositive = value > 0;
        return (
          <Space>
            <span style={{ 
              color: isPositive ? '#52c41a' : value < 0 ? '#ff4d4f' : 'inherit',
              fontWeight: record.isCategory || record.isSummary ? 600 : 400
            }}>
              {formatCurrency(value)}
            </span>
            {value !== 0 && !record.isCategory && (
              isPositive ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />
            )}
          </Space>
        );
      },
    },
  ];

  const monthlyColumns: ColumnsType<MonthlyPnL> = [
    { title: 'Tháng', dataIndex: 'thang', key: 'thang', width: 100, fixed: 'left' },
    { title: 'Doanh thu', dataIndex: 'doanhThu', key: 'doanhThu', width: 140, align: 'right', render: v => formatCurrency(v) },
    { title: 'Giá vốn', dataIndex: 'giaVon', key: 'giaVon', width: 140, align: 'right', render: v => <span style={{ color: '#ff4d4f' }}>{formatCurrency(-v)}</span> },
    { title: 'Lợi nhuận gộp', dataIndex: 'loiNhuanGop', key: 'loiNhuanGop', width: 140, align: 'right', render: v => <span style={{ color: '#52c41a' }}>{formatCurrency(v)}</span> },
    { title: 'CP Bán hàng', dataIndex: 'chiPhiBanHang', key: 'chiPhiBanHang', width: 130, align: 'right', render: v => <span style={{ color: '#ff4d4f' }}>{formatCurrency(-v)}</span> },
    { title: 'CP Quản lý', dataIndex: 'chiPhiQuanLy', key: 'chiPhiQuanLy', width: 130, align: 'right', render: v => <span style={{ color: '#ff4d4f' }}>{formatCurrency(-v)}</span> },
    { title: 'CP Tài chính', dataIndex: 'chiPhiTaiChinh', key: 'chiPhiTaiChinh', width: 120, align: 'right', render: v => <span style={{ color: '#ff4d4f' }}>{formatCurrency(-v)}</span> },
    { title: 'LN trước thuế', dataIndex: 'loiNhuanTruocThue', key: 'loiNhuanTruocThue', width: 140, align: 'right', render: v => <span style={{ color: v >= 0 ? '#1890ff' : '#ff4d4f', fontWeight: 600 }}>{formatCurrency(v)}</span> },
    { title: 'Thuế TNDN', dataIndex: 'thue', key: 'thue', width: 120, align: 'right', render: v => <span style={{ color: '#ff4d4f' }}>{formatCurrency(-v)}</span> },
    { title: 'LN sau thuế', dataIndex: 'loiNhuanSauThue', key: 'loiNhuanSauThue', width: 140, align: 'right', render: v => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>{formatCurrency(v)}</span> },
  ];

  const chartData = monthlyData.map(m => ({
    thang: m.thang,
    'Doanh thu': m.doanhThu / 1000000,
    'Chi phí': (m.giaVon + m.chiPhiBanHang + m.chiPhiQuanLy + m.chiPhiTaiChinh) / 1000000,
    'Lợi nhuận': m.loiNhuanSauThue / 1000000,
  }));

  const tabItems = [
    {
      key: '1',
      label: 'Báo cáo chi tiết',
      children: (
        <Table
          columns={columns}
          dataSource={buildTableData()}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: 1100 }}
          rowClassName={(record) => 
            record.isSummary ? 'bg-blue-50' : record.isCategory ? 'bg-gray-50' : ''
          }
        />
      ),
    },
    {
      key: '2',
      label: 'Theo tháng',
      children: (
        <>
          <Table
            columns={monthlyColumns}
            dataSource={monthlyData}
            rowKey="thang"
            loading={loading}
            pagination={false}
            size="middle"
            scroll={{ x: 1400 }}
            summary={(pageData) => {
              const totals = pageData.reduce((acc, item) => ({
                doanhThu: acc.doanhThu + item.doanhThu,
                giaVon: acc.giaVon + item.giaVon,
                loiNhuanGop: acc.loiNhuanGop + item.loiNhuanGop,
                chiPhiBanHang: acc.chiPhiBanHang + item.chiPhiBanHang,
                chiPhiQuanLy: acc.chiPhiQuanLy + item.chiPhiQuanLy,
                chiPhiTaiChinh: acc.chiPhiTaiChinh + item.chiPhiTaiChinh,
                loiNhuanTruocThue: acc.loiNhuanTruocThue + item.loiNhuanTruocThue,
                thue: acc.thue + item.thue,
                loiNhuanSauThue: acc.loiNhuanSauThue + item.loiNhuanSauThue,
              }), { doanhThu: 0, giaVon: 0, loiNhuanGop: 0, chiPhiBanHang: 0, chiPhiQuanLy: 0, chiPhiTaiChinh: 0, loiNhuanTruocThue: 0, thue: 0, loiNhuanSauThue: 0 });
              
              return (
                <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                  <Table.Summary.Cell index={0}>Tổng cộng</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">{formatCurrency(totals.doanhThu)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><span style={{ color: '#ff4d4f' }}>{formatCurrency(-totals.giaVon)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><span style={{ color: '#52c41a' }}>{formatCurrency(totals.loiNhuanGop)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right"><span style={{ color: '#ff4d4f' }}>{formatCurrency(-totals.chiPhiBanHang)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right"><span style={{ color: '#ff4d4f' }}>{formatCurrency(-totals.chiPhiQuanLy)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right"><span style={{ color: '#ff4d4f' }}>{formatCurrency(-totals.chiPhiTaiChinh)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right"><span style={{ color: '#1890ff' }}>{formatCurrency(totals.loiNhuanTruocThue)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right"><span style={{ color: '#ff4d4f' }}>{formatCurrency(-totals.thue)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right"><span style={{ color: '#52c41a' }}>{formatCurrency(totals.loiNhuanSauThue)}</span></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </>
      ),
    },
    {
      key: '3',
      label: 'Biểu đồ xu hướng',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Doanh thu - Chi phí - Lợi nhuận theo tháng (triệu VND)" size="small">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="thang" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toFixed(0)} triệu`} />
                  <Legend />
                  <Bar dataKey="Doanh thu" fill="#1890ff" />
                  <Bar dataKey="Chi phí" fill="#ff4d4f" />
                  <Line type="monotone" dataKey="Lợi nhuận" stroke="#52c41a" strokeWidth={3} dot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Xu hướng doanh thu (triệu VND)" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="thang" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toFixed(0)} triệu`} />
                  <Area type="monotone" dataKey="Doanh thu" fill="#1890ff" stroke="#1890ff" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Xu hướng lợi nhuận (triệu VND)" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="thang" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toFixed(0)} triệu`} />
                  <Area type="monotone" dataKey="Lợi nhuận" fill="#52c41a" stroke="#52c41a" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>Báo cáo</Breadcrumb.Item>
        <Breadcrumb.Item>Lãi lỗ (P&L)</Breadcrumb.Item>
      </Breadcrumb>

      <Card 
        title={
          <Space>
            <LineChartOutlined />
            <span>Báo cáo Lãi lỗ (P&L)</span>
            <Tag color="blue">Năm 2024</Tag>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              style={{ width: 150 }}
              options={[
                { value: 'thangNay', label: 'Tháng này' },
                { value: 'thangTruoc', label: 'Tháng trước' },
                { value: 'luyKe', label: 'Lũy kế năm' },
              ]}
            />
            <Button icon={<ExportOutlined />}>Xuất Excel</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
          </Space>
        }
      >
        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="Doanh thu"
                value={summary?.tongDoanhThu || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: '#1890ff' }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="Giá vốn"
                value={summary?.tongGiaVon || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="Lợi nhuận gộp"
                value={summary?.loiNhuanGop || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: '#52c41a' }}
                suffix={<span style={{ fontSize: 12 }}>({summary?.tyLeLoiNhuanGop.toFixed(1)}%)</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="Tổng chi phí"
                value={(summary?.tongChiPhiBanHang || 0) + (summary?.tongChiPhiQuanLy || 0) + (summary?.tongChiPhiTaiChinh || 0)}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="LN trước thuế"
                value={summary?.loiNhuanTruocThue || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: (summary?.loiNhuanTruocThue || 0) >= 0 ? '#1890ff' : '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="LN sau thuế"
                value={summary?.loiNhuanSauThue || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: (summary?.loiNhuanSauThue || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
                prefix={(summary?.loiNhuanSauThue || 0) >= 0 ? <RiseOutlined /> : <FallOutlined />}
                suffix={<span style={{ fontSize: 12 }}>({summary?.tyLeLoiNhuanRong.toFixed(1)}%)</span>}
              />
            </Card>
          </Col>
        </Row>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default PnLPage;
