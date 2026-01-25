import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, Typography, Progress } from 'antd';
import {
  WalletOutlined,
  RiseOutlined,
  FallOutlined,
  FileTextOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import type { ThongKeTongQuan, BieuDoThuChi } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

const { Title, Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatShortCurrency = (value: number) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)} tỷ`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)} tr`;
  }
  return formatCurrency(value);
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [thongKe, setThongKe] = useState<ThongKeTongQuan | null>(null);
  const [bieuDo, setBieuDo] = useState<BieuDoThuChi[]>([]);
  const [congNoQuaHan, setCongNoQuaHan] = useState<any[]>([]);
  const [chungTuGanDay, setChungTuGanDay] = useState<any[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tk, bd, cn, ct] = await Promise.all([
          dashboardService.getThongKeTongQuan(),
          dashboardService.getBieuDoThuChi(),
          dashboardService.getCongNoQuaHan(),
          dashboardService.getChungTuGanDay(),
        ]);
        setThongKe(tk);
        setBieuDo(bd);
        setCongNoQuaHan(cn);
        setChungTuGanDay(ct);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  // Mobile-optimized columns for tables
  const congNoColumnsMobile = [
    { title: 'Đối tượng', dataIndex: 'doiTuong', key: 'doiTuong', ellipsis: true },
    { 
      title: 'Số tiền', 
      dataIndex: 'soTien', 
      key: 'soTien', 
      render: (v: number) => <span className="text-xs">{formatShortCurrency(v)}</span>,
      width: 80,
    },
    { 
      title: 'Quá hạn', 
      dataIndex: 'soNgayQuaHan', 
      key: 'soNgayQuaHan', 
      render: (d: number) => <Tag color={d > 15 ? 'error' : 'warning'} className="!text-xs">{d}d</Tag>,
      width: 60,
    },
  ];

  const congNoColumnsDesktop = [
    { title: 'Đối tượng', dataIndex: 'doiTuong', key: 'doiTuong' },
    { title: 'Số tiền', dataIndex: 'soTien', key: 'soTien', render: (v: number) => formatCurrency(v) },
    { title: 'Quá hạn', dataIndex: 'soNgayQuaHan', key: 'soNgayQuaHan', render: (d: number) => <Tag color={d > 15 ? 'error' : 'warning'}>{d} ngày</Tag> },
  ];

  const chungTuColumnsMobile = [
    { 
      title: 'Số phiếu', 
      dataIndex: 'soPhieu', 
      key: 'soPhieu', 
      render: (t: string) => <span className="font-medium text-primary text-xs">{t}</span>,
      ellipsis: true,
    },
    { 
      title: 'Loại', 
      dataIndex: 'loai', 
      key: 'loai', 
      render: (l: string) => <Tag color={l === 'Thu' ? 'success' : 'error'} className="!text-xs">{l}</Tag>,
      width: 50,
    },
    { 
      title: 'Số tiền', 
      dataIndex: 'soTien', 
      key: 'soTien', 
      render: (v: number, r: any) => (
        <span className={`text-xs ${r.loai === 'Thu' ? 'text-success' : 'text-destructive'}`}>
          {formatShortCurrency(v)}
        </span>
      ),
      width: 80,
    },
  ];

  const chungTuColumnsDesktop = [
    { title: 'Số phiếu', dataIndex: 'soPhieu', key: 'soPhieu', render: (t: string) => <span className="font-medium text-primary">{t}</span> },
    { title: 'Loại', dataIndex: 'loai', key: 'loai', render: (l: string) => <Tag color={l === 'Thu' ? 'success' : 'error'}>{l}</Tag> },
    { title: 'Số tiền', dataIndex: 'soTien', key: 'soTien', render: (v: number, r: any) => <span className={r.loai === 'Thu' ? 'text-success' : 'text-destructive'}>{formatCurrency(v)}</span> },
    { title: 'Ngày', dataIndex: 'ngay', key: 'ngay' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="page-header p-4 sm:p-6 lg:p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <CheckCircleOutlined className="text-white/80 text-sm" />
            <Text className="!text-white/80 text-xs sm:text-sm">Bảng điều khiển</Text>
          </div>
          <Title level={isMobile ? 4 : 2} className="!text-white !mb-1 sm:!mb-2">
            Chào buổi sáng!
          </Title>
          <Text className="!text-white/80 text-xs sm:text-sm">
            Bạn có{' '}
            <span className="font-semibold text-white">{thongKe?.soChungTuChoXuLy || 0} chứng từ</span>{' '}
            cần xử lý.
          </Text>
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[12, 12]} className="sm:gutter-[16,16]">
        <Col xs={12} sm={12} lg={6}>
          <Card className="stat-card h-full !p-0" bodyStyle={{ padding: isMobile ? 12 : 24 }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Text className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide font-medium block truncate">
                  Số dư quỹ
                </Text>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold truncate">
                  {formatShortCurrency(thongKe?.soDuQuy || 0)}
                </div>
                <Tag color="success" className="!mt-1 sm:!mt-2 !text-[10px] sm:!text-xs !px-1 sm:!px-2">
                  <ArrowUpOutlined /> +12.5%
                </Tag>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <WalletOutlined className="text-base sm:text-xl text-primary" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="stat-card stat-card-success h-full !p-0" bodyStyle={{ padding: isMobile ? 12 : 24 }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Text className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide font-medium block truncate">
                  Doanh thu
                </Text>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-success truncate">
                  {formatShortCurrency(thongKe?.doanhThuThang || 0)}
                </div>
                <Tag color="success" className="!mt-1 sm:!mt-2 !text-[10px] sm:!text-xs !px-1 sm:!px-2">
                  <ArrowUpOutlined /> +8.2%
                </Tag>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                <RiseOutlined className="text-base sm:text-xl text-success" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="stat-card stat-card-warning h-full !p-0" bodyStyle={{ padding: isMobile ? 12 : 24 }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Text className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide font-medium block truncate">
                  Chi phí
                </Text>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-destructive truncate">
                  {formatShortCurrency(thongKe?.chiPhiThang || 0)}
                </div>
                <Tag color="warning" className="!mt-1 sm:!mt-2 !text-[10px] sm:!text-xs !px-1 sm:!px-2">
                  <ArrowDownOutlined /> -3.1%
                </Tag>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <FallOutlined className="text-base sm:text-xl text-warning" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="stat-card h-full !p-0" bodyStyle={{ padding: isMobile ? 12 : 24 }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Text className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide font-medium block truncate">
                  Lợi nhuận
                </Text>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-primary truncate">
                  {formatShortCurrency(thongKe?.loiNhuanThang || 0)}
                </div>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
                <FileTextOutlined className="text-base sm:text-xl text-info" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Chart */}
      <Card 
        title={
          <span className="text-sm sm:text-base">
            <RiseOutlined className="text-primary mr-2" />
            Biểu đồ Thu - Chi
          </span>
        }
        bodyStyle={{ padding: isMobile ? 12 : 24 }}
      >
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
          <AreaChart data={bieuDo} margin={isMobile ? { left: -20, right: 0 } : undefined}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="thang" 
              stroke="hsl(var(--muted-foreground))" 
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              tickFormatter={(v) => `${(v / 1000000).toFixed(0)}tr`} 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 35 : 60}
            />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
            <Area type="monotone" dataKey="thu" name="Thu" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.2)" />
            <Area type="monotone" dataKey="chi" name="Chi" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.2)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Tables */}
      <Row gutter={[12, 12]} className="sm:gutter-[16,16]">
        <Col xs={24} lg={12}>
          <Card 
            title={
              <span className="text-sm sm:text-base">
                <WarningOutlined className="text-warning mr-2" />
                Công nợ quá hạn
              </span>
            } 
            extra={<a className="text-primary text-xs sm:text-sm">Xem tất cả</a>}
            bodyStyle={{ padding: isMobile ? 8 : 24 }}
          >
            <Table
              dataSource={congNoQuaHan}
              columns={isMobile ? congNoColumnsMobile : congNoColumnsDesktop}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={isMobile ? { x: 'max-content' } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <span className="text-sm sm:text-base">
                <FileTextOutlined className="text-primary mr-2" />
                Chứng từ gần đây
              </span>
            } 
            extra={<a className="text-primary text-xs sm:text-sm">Xem tất cả</a>}
            bodyStyle={{ padding: isMobile ? 8 : 24 }}
          >
            <Table
              dataSource={chungTuGanDay}
              columns={isMobile ? chungTuColumnsMobile : chungTuColumnsDesktop}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={isMobile ? { x: 'max-content' } : undefined}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
