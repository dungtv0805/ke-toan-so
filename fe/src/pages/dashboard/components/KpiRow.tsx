import React from 'react';
import { Card, Row, Col, Skeleton, Typography, Tooltip } from 'antd';
import { formatShortCurrency } from './format';

const { Text } = Typography;

export interface KpiItem {
  key: string;
  label: string;
  value: number;
  /** Kiểu hiển thị. Mặc định 'tien'. */
  format?: 'tien' | 'phanTram' | 'soLuong';
  /** true = giá trị dương là tín hiệu xấu (ví dụ số cảnh báo). */
  inverse?: boolean;
  /** Giải thích công thức, hiện khi rê chuột lên nhãn. */
  tooltip?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface Props {
  items: KpiItem[];
  loading?: boolean;
  /** Số cột trên màn hình lớn. 4 (mặc định) hoặc 5. */
  span?: 4 | 5;
}

const formatValue = (item: KpiItem): string => {
  const v = item.value || 0;
  switch (item.format) {
    case 'phanTram':
      return `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
    case 'soLuong':
      return v.toLocaleString('vi-VN');
    default:
      return formatShortCurrency(v);
  }
};

/** Xanh khi tốt, đỏ khi xấu. Giá trị 0 luôn trung tính. */
const valueClass = (item: KpiItem): string => {
  const v = item.value || 0;
  if (v === 0) return 'text-muted-foreground';
  const xau = item.inverse ? v > 0 : v < 0;
  return xau ? 'text-destructive' : 'text-primary';
};

const KpiRow: React.FC<Props> = ({ items, loading, span = 4 }) => {
  const lg = span === 5 ? 24 / 5 : 6;

  return (
    <Row gutter={[12, 12]}>
      {items.map((item) => (
        <Col xs={12} lg={lg} key={item.key}>
          <Card
            className="stat-card h-full"
            hoverable={!!item.onClick}
            onClick={item.onClick}
            style={item.onClick ? { cursor: 'pointer' } : undefined}
            role={item.onClick ? 'button' : undefined}
            tabIndex={item.onClick ? 0 : undefined}
            onKeyDown={
              item.onClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      item.onClick?.();
                    }
                  }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Tooltip title={item.tooltip}>
                  <Text className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide font-medium block truncate">
                    {item.label}
                  </Text>
                </Tooltip>
                {loading ? (
                  <Skeleton.Input active size="small" style={{ width: '80%', marginTop: 8 }} />
                ) : (
                  <div className={`mt-1 sm:mt-2 text-lg sm:text-2xl font-bold truncate ${valueClass(item)}`}>
                    {formatValue(item)}
                  </div>
                )}
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 text-base sm:text-xl bg-primary/10 text-primary">
                {item.icon}
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default KpiRow;
