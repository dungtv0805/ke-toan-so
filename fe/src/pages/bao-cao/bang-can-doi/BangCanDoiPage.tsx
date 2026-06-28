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
} from 'antd';
import {
  ReloadOutlined,
  ExportOutlined,
  HomeOutlined,
  BankOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  balanceSheetService,
  BalanceSheetData,
  BalanceSheetItem,
  BalanceSheetStats,
} from '@/services/balanceSheetService';
import { usePagePermission } from "@/hooks/usePagePermission";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
  return formatCurrency(value);
};

const BangCanDoiPage: React.FC = () => {
  const { canExport } = usePagePermission("/bao-cao/bang-can-doi");
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [stats, setStats] = useState<BalanceSheetStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bsData, statsData] = await Promise.all([
        balanceSheetService.getData(),
        balanceSheetService.getStats(),
      ]);
      setData(bsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: ColumnsType<BalanceSheetItem> = [
    {
      title: 'Chỉ tiêu',
      dataIndex: 'tenChiTieu',
      key: 'tenChiTieu',
      width: 350,
      render: (text: string, record: BalanceSheetItem) => (
        <span style={{
          fontWeight: record.isSection ? 700 : record.isTotal ? 600 : 400,
          paddingLeft: record.level * 16,
          color: record.isSection ? '#1890ff' : 'inherit',
        }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Mã số',
      dataIndex: 'ma',
      key: 'ma',
      width: 80,
      align: 'center',
    },
    {
      title: 'Số đầu năm',
      dataIndex: 'dauNam',
      key: 'dauNam',
      width: 150,
      align: 'right',
      render: (value: number, record: BalanceSheetItem) => (
        <span style={{
          fontWeight: record.isSection || record.isTotal ? 600 : 400,
          color: value < 0 ? '#ff4d4f' : 'inherit',
        }}>
          {value !== 0 ? formatCurrency(value) : '-'}
        </span>
      ),
    },
    {
      title: 'Số cuối kỳ',
      dataIndex: 'cuoiKy',
      key: 'cuoiKy',
      width: 150,
      align: 'right',
      render: (value: number, record: BalanceSheetItem) => (
        <span style={{
          fontWeight: record.isSection || record.isTotal ? 600 : 400,
          color: value < 0 ? '#ff4d4f' : 'inherit',
        }}>
          {value !== 0 ? formatCurrency(value) : '-'}
        </span>
      ),
    },
    {
      title: 'Chênh lệch',
      key: 'chenhLech',
      width: 130,
      align: 'right',
      render: (_: unknown, record: BalanceSheetItem) => {
        if (record.dauNam === 0 && record.cuoiKy === 0) return '-';
        const diff = record.cuoiKy - record.dauNam;
        return (
          <Space>
            <span style={{ color: diff >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {formatCurrencyShort(diff)}
            </span>
            {diff !== 0 && (
              diff > 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />
            )}
          </Space>
        );
      },
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig(
    'baoCao.bangCanDoi',
    columns,
  );

  // Chart data
  const assetPieData = stats ? [
    { name: 'TS ngắn hạn', value: stats.taiSanNganHan },
    { name: 'TS dài hạn', value: stats.taiSanDaiHan },
  ].filter(d => d.value > 0) : [];

  const liabilityPieData = stats ? [
    { name: 'Nợ phải trả', value: stats.noPhaiTra },
    { name: 'Vốn chủ sở hữu', value: stats.vonChuSoHuu },
  ].filter(d => d.value > 0) : [];

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> Trang chủ</> },
          { title: 'Báo cáo' },
          { title: 'Bảng cân đối kế toán' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Card
        title={
          <Space>
            <BankOutlined />
            <span>Bảng cân đối kế toán</span>
            <Tag color="blue">Năm {currentYear}</Tag>
          </Space>
        }
        extra={
          <Space>
            {settingsButton}
            {canExport && <Button icon={<ExportOutlined />}>Xuất Excel</Button>}
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
          </Space>
        }
      >
        {/* Stats Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card size="small" className="stat-card">
              <Statistic
                title="Tổng tài sản"
                value={stats?.tongTaiSan ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="stat-card">
              <Statistic
                title="TS ngắn hạn"
                value={stats?.taiSanNganHan ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                suffix={<span style={{ fontSize: 12 }}>({(stats?.tyLeTaiSanNganHan ?? 0).toFixed(0)}%)</span>}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="stat-card">
              <Statistic
                title="TS dài hạn"
                value={stats?.taiSanDaiHan ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="stat-card stat-card-destructive">
              <Statistic
                title="Nợ phải trả"
                value={stats?.noPhaiTra ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="stat-card stat-card-success">
              <Statistic
                title="Vốn chủ sở hữu"
                value={stats?.vonChuSoHuu ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="stat-card">
              <Statistic
                title="Trạng thái"
                value={stats?.canDoi ? 'Cân đối' : 'Chưa cân đối'}
                valueStyle={{ color: stats?.canDoi ? '#52c41a' : '#ff4d4f' }}
                prefix={stats?.canDoi ? <CheckCircleOutlined /> : <WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: '1',
              label: 'Bảng cân đối kế toán',
              children: data && (
                <>
                  <Card
                    title={<span style={{ color: '#1890ff', fontWeight: 600 }}>TÀI SẢN</span>}
                    size="small"
                    style={{ marginBottom: 16 }}
                  >
                    <Table
                      columns={cfgColumns}
                      dataSource={data.taiSan}
                      rowKey="ma"
                      loading={loading}
                      pagination={false}
                      size="small"
                      bordered
                    />
                    <div style={{ padding: '12px 16px', backgroundColor: '#e6f7ff', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>TỔNG CỘNG TÀI SẢN</span>
                      <span style={{ color: '#1890ff' }}>{formatCurrency(data.tongTaiSan.cuoiKy)}</span>
                    </div>
                  </Card>

                  <Card
                    title={<span style={{ color: '#52c41a', fontWeight: 600 }}>NGUỒN VỐN</span>}
                    size="small"
                  >
                    <Table
                      columns={cfgColumns}
                      dataSource={data.nguonVon}
                      rowKey="ma"
                      loading={loading}
                      pagination={false}
                      size="small"
                      bordered
                    />
                    <div style={{ padding: '12px 16px', backgroundColor: '#f6ffed', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>TỔNG CỘNG NGUỒN VỐN</span>
                      <span style={{ color: '#52c41a' }}>{formatCurrency(data.tongNguonVon.cuoiKy)}</span>
                    </div>
                  </Card>

                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    {data.canDoi ? (
                      <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 14, padding: '4px 16px' }}>
                        Bảng cân đối kế toán CÂN ĐỐI (Tổng tài sản = Tổng nguồn vốn)
                      </Tag>
                    ) : (
                      <Tag color="error" icon={<WarningOutlined />} style={{ fontSize: 14, padding: '4px 16px' }}>
                        Bảng cân đối kế toán KHÔNG CÂN ĐỐI
                      </Tag>
                    )}
                  </div>
                </>
              ),
            },
            {
              key: '2',
              label: 'Cơ cấu tài sản & vốn',
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="Cơ cấu Tài sản" size="small">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={assetPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          >
                            {assetPieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Cơ cấu Nguồn vốn" size="small">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={liabilityPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          >
                            {liabilityPieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default BangCanDoiPage;
