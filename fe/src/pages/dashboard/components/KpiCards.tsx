import React from 'react';
import { Card, Row, Col, Skeleton, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, WalletOutlined, RiseOutlined, FallOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dashboardService, type KpiMetric } from '@/services/dashboardService';
import { formatShortCurrency } from './format';

const { Text } = Typography;

interface KpiCardsProps {
  month: number;
  year: number;
}

interface CardConfig {
  key: string;
  label: string;
  metric: KpiMetric;
  icon: React.ReactNode;
  valueClass: string;
  iconBg: string;
  /** when true, a positive delta is "bad" (red), e.g. chi phí */
  inverse?: boolean;
}

const DeltaTag: React.FC<{ delta: number | null; inverse?: boolean }> = ({ delta, inverse }) => {
  if (delta === null || delta === undefined) {
    return <Text className="text-muted-foreground text-[10px] sm:text-xs">— so kỳ trước</Text>;
  }
  const up = delta >= 0;
  // For inverse metrics (chi phí), going up is bad.
  const good = inverse ? !up : up;
  const color = good ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  return (
    <span className="text-[10px] sm:text-xs font-medium" style={{ color }}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(delta).toFixed(1)}% so kỳ trước
    </span>
  );
};

const KpiCards: React.FC<KpiCardsProps> = ({ month, year }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['dash-kpi', month, year],
    queryFn: () => dashboardService.getKpi(month, year),
  });

  if (isLoading || !data) {
    return (
      <Row gutter={[12, 12]}>
        {[0, 1, 2, 3].map((i) => (
          <Col xs={12} lg={6} key={i}>
            <Card className="stat-card h-full">
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  const cards: CardConfig[] = [
    {
      key: 'soDuQuy',
      label: 'Số dư quỹ',
      metric: data.soDuQuy,
      icon: <WalletOutlined />,
      valueClass: 'text-primary',
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      key: 'doanhThu',
      label: 'Doanh thu',
      metric: data.doanhThu,
      icon: <RiseOutlined />,
      valueClass: 'text-success',
      iconBg: 'bg-success/10 text-success',
    },
    {
      key: 'chiPhi',
      label: 'Chi phí',
      metric: data.chiPhi,
      icon: <FallOutlined />,
      valueClass: 'text-destructive',
      iconBg: 'bg-destructive/10 text-destructive',
      inverse: true,
    },
    {
      key: 'loiNhuan',
      label: 'Lợi nhuận',
      metric: data.loiNhuan,
      icon: <FileTextOutlined />,
      valueClass: 'text-primary',
      iconBg: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <Row gutter={[12, 12]}>
      {cards.map((c) => (
        <Col xs={12} lg={6} key={c.key}>
          <Card className="stat-card h-full">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Text className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide font-medium block truncate">
                  {c.label}
                </Text>
                <div className={`mt-1 sm:mt-2 text-lg sm:text-2xl font-bold truncate ${c.valueClass}`}>
                  {formatShortCurrency(c.metric.value)}
                </div>
                <div className="mt-1 sm:mt-2">
                  <DeltaTag delta={c.metric.delta} inverse={c.inverse} />
                </div>
              </div>
              <div className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 text-base sm:text-xl ${c.iconBg}`}>
                {c.icon}
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default KpiCards;
