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
  Tag,
  Descriptions,
  Progress
} from 'antd';
import { 
  ReloadOutlined, 
  ExportOutlined,
  HomeOutlined,
  BankOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { 
  balanceSheetService, 
  BalanceSheetData, 
  BalanceSheetItem,
  BalanceSheetStats 
} from '@/services/balanceSheetService';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

const BangCanDoiPage: React.FC = () => {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [stats, setStats] = useState<BalanceSheetStats | null>(null);
  const [comparison, setComparison] = useState<Array<{
    chiTieu: string;
    dauNam: number;
    cuoiKy: number;
    chenhLech: number;
    tyLe: number;
  }>>([]);
  const [ratios, setRatios] = useState<Array<{
    name: string;
    value: number;
    description: string;
    status: 'good' | 'warning' | 'bad';
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bsData, statsData, compData, ratioData] = await Promise.all([
        balanceSheetService.getData(),
        balanceSheetService.getStats(),
        balanceSheetService.getComparison(),
        balanceSheetService.getFinancialRatios()
      ]);
      setData(bsData);
      setStats(statsData);
      setComparison(compData);
      setRatios(ratioData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (Math.abs(value) >= 1000000000) {
      return `${(value / 1000000000).toFixed(2)} tỷ`;
    }
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(0)} tr`;
    }
    return formatCurrency(value);
  };

  const columns: ColumnsType<BalanceSheetItem> = [
    {
      title: 'Chỉ tiêu',
      dataIndex: 'tenChiTieu',
      key: 'tenChiTieu',
      width: 350,
      render: (text, record) => (
        <span style={{ 
          fontWeight: record.isSection ? 700 : record.isTotal ? 600 : 400,
          paddingLeft: record.level * 16,
          color: record.isSection ? '#1890ff' : 'inherit'
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
      title: 'Thuyết minh',
      dataIndex: 'thuYetMinh',
      key: 'thuYetMinh',
      width: 100,
      align: 'center',
      render: (value) => value || '-',
    },
    {
      title: 'Số đầu năm',
      dataIndex: 'dauNam',
      key: 'dauNam',
      width: 150,
      align: 'right',
      render: (value, record) => (
        <span style={{ 
          fontWeight: record.isSection || record.isTotal ? 600 : 400,
          color: value < 0 ? '#ff4d4f' : 'inherit'
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
      render: (value, record) => (
        <span style={{ 
          fontWeight: record.isSection || record.isTotal ? 600 : 400,
          color: value < 0 ? '#ff4d4f' : 'inherit'
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
      render: (_, record) => {
        if (record.dauNam === 0 && record.cuoiKy === 0) return '-';
        const chenhLech = record.cuoiKy - record.dauNam;
        return (
          <Space>
            <span style={{ color: chenhLech >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {formatCurrencyShort(chenhLech)}
            </span>
            {chenhLech !== 0 && (
              chenhLech > 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />
            )}
          </Space>
        );
      },
    },
  ];

  const comparisonColumns: ColumnsType<typeof comparison[0]> = [
    { 
      title: 'Chỉ tiêu', 
      dataIndex: 'chiTieu', 
      key: 'chiTieu',
      render: (text) => <strong>{text}</strong>
    },
    { 
      title: 'Số đầu năm', 
      dataIndex: 'dauNam', 
      key: 'dauNam', 
      align: 'right',
      render: (value) => formatCurrency(value)
    },
    { 
      title: 'Số cuối kỳ', 
      dataIndex: 'cuoiKy', 
      key: 'cuoiKy', 
      align: 'right',
      render: (value) => <strong>{formatCurrency(value)}</strong>
    },
    { 
      title: 'Chênh lệch', 
      dataIndex: 'chenhLech', 
      key: 'chenhLech', 
      align: 'right',
      render: (value) => (
        <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {formatCurrency(value)}
        </span>
      )
    },
    { 
      title: 'Tỷ lệ (%)', 
      dataIndex: 'tyLe', 
      key: 'tyLe', 
      align: 'right',
      render: (value) => (
        <Space>
          <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {value.toFixed(1)}%
          </span>
          {value !== 0 && (
            value > 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />
          )}
        </Space>
      )
    },
  ];

  // Chart data
  const assetPieData = stats ? [
    { name: 'TS ngắn hạn', value: stats.taiSanNganHan },
    { name: 'TS dài hạn', value: stats.taiSanDaiHan },
  ] : [];

  const liabilityPieData = stats ? [
    { name: 'Nợ phải trả', value: stats.noPhaiTra },
    { name: 'Vốn chủ sở hữu', value: stats.vonChuSoHuu },
  ] : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#52c41a';
      case 'warning': return '#faad14';
      case 'bad': return '#ff4d4f';
      default: return '#1890ff';
    }
  };

  const tabItems = [
    {
      key: '1',
      label: 'Bảng cân đối kế toán',
      children: data && (
        <>
          {/* TÀI SẢN */}
          <Card 
            title={<span style={{ color: '#1890ff', fontWeight: 600 }}>TÀI SẢN</span>} 
            size="small" 
            style={{ marginBottom: 16 }}
          >
            <Table
              columns={columns}
              dataSource={data.taiSan}
              rowKey="ma"
              loading={loading}
              pagination={false}
              size="small"
              scroll={{ x: 1000 }}
            />
            <div style={{ 
              padding: '12px 16px', 
              backgroundColor: '#e6f7ff', 
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>TỔNG CỘNG TÀI SẢN</span>
              <Space size="large">
                <span>{formatCurrency(data.tongTaiSan.dauNam)}</span>
                <span style={{ color: '#1890ff' }}>{formatCurrency(data.tongTaiSan.cuoiKy)}</span>
              </Space>
            </div>
          </Card>

          {/* NGUỒN VỐN */}
          <Card 
            title={<span style={{ color: '#52c41a', fontWeight: 600 }}>NGUỒN VỐN</span>} 
            size="small"
          >
            <Table
              columns={columns}
              dataSource={data.nguonVon}
              rowKey="ma"
              loading={loading}
              pagination={false}
              size="small"
              scroll={{ x: 1000 }}
            />
            <div style={{ 
              padding: '12px 16px', 
              backgroundColor: '#f6ffed', 
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>TỔNG CỘNG NGUỒN VỐN</span>
              <Space size="large">
                <span>{formatCurrency(data.tongNguonVon.dauNam)}</span>
                <span style={{ color: '#52c41a' }}>{formatCurrency(data.tongNguonVon.cuoiKy)}</span>
              </Space>
            </div>
          </Card>

          {/* Cân đối check */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {data.canDoi ? (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 14, padding: '4px 16px' }}>
                ✓ Bảng cân đối kế toán CÂN ĐỐI (Tổng tài sản = Tổng nguồn vốn)
              </Tag>
            ) : (
              <Tag color="error" icon={<WarningOutlined />} style={{ fontSize: 14, padding: '4px 16px' }}>
                ✗ Bảng cân đối kế toán KHÔNG CÂN ĐỐI
              </Tag>
            )}
          </div>
        </>
      ),
    },
    {
      key: '2',
      label: 'So sánh & Biến động',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Table
              columns={comparisonColumns}
              dataSource={comparison}
              rowKey="chiTieu"
              loading={loading}
              pagination={false}
              size="middle"
            />
          </Col>
          <Col xs={24} lg={12}>
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
          <Col xs={24} lg={12}>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index + 2]} />
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
    {
      key: '3',
      label: 'Chỉ số tài chính',
      children: (
        <Row gutter={[16, 16]}>
          {ratios.map((ratio, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card size="small">
                <Statistic
                  title={ratio.name}
                  value={ratio.value}
                  precision={2}
                  valueStyle={{ color: getStatusColor(ratio.status) }}
                  suffix={ratio.name.includes('%') || ratio.name.includes('Tỷ lệ') ? '%' : ''}
                />
                <div style={{ marginTop: 8 }}>
                  <Progress 
                    percent={Math.min(ratio.value * (ratio.name.includes('%') ? 1 : 33), 100)} 
                    showInfo={false}
                    strokeColor={getStatusColor(ratio.status)}
                    size="small"
                  />
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  {ratio.description}
                </div>
                <Tag 
                  color={ratio.status === 'good' ? 'success' : ratio.status === 'warning' ? 'warning' : 'error'}
                  style={{ marginTop: 8 }}
                >
                  {ratio.status === 'good' ? 'Tốt' : ratio.status === 'warning' ? 'Trung bình' : 'Cần cải thiện'}
                </Tag>
              </Card>
            </Col>
          ))}
          
          <Col span={24}>
            <Card title="Biểu đồ so sánh Đầu năm - Cuối kỳ" size="small">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="chiTieu" angle={-15} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(value) => `${(value / 1000000000).toFixed(1)} tỷ`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="dauNam" name="Đầu năm" fill="#1890ff" />
                  <Bar dataKey="cuoiKy" name="Cuối kỳ" fill="#52c41a" />
                </BarChart>
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
        <Breadcrumb.Item>Bảng cân đối kế toán</Breadcrumb.Item>
      </Breadcrumb>

      <Card 
        title={
          <Space>
            <BankOutlined />
            <span>Bảng cân đối kế toán</span>
            <Tag color="blue">Năm 2024</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ExportOutlined />}>Xuất Excel</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
          </Space>
        }
      >
        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="Tổng tài sản"
                value={stats?.tongTaiSan || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="TS ngắn hạn"
                value={stats?.taiSanNganHan || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                suffix={<span style={{ fontSize: 12 }}>({stats?.tyLeTaiSanNganHan.toFixed(0)}%)</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="TS dài hạn"
                value={stats?.taiSanDaiHan || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="Nợ phải trả"
                value={stats?.noPhaiTra || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
              <Statistic
                title="Vốn chủ sở hữu"
                value={stats?.vonChuSoHuu || 0}
                precision={0}
                formatter={(value) => formatCurrencyShort(value as number)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small">
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
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default BangCanDoiPage;
