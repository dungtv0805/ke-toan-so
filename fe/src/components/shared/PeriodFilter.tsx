import { useState } from 'react';
import { Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

export type PeriodType = 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon';

export interface PeriodFilterParams {
  periodType: PeriodType;
  startDate: string;
  endDate: string;
}

interface PeriodFilterProps {
  onFilter: (params: PeriodFilterParams) => void;
  loading?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

const PERIOD_OPTIONS = [
  ...Array.from({ length: 12 }, (_, i) => ({ value: `thang${i + 1}`, label: `Tháng ${i + 1}` })),
  { value: 'nuaDau', label: '6 tháng đầu năm' },
  { value: 'nuaCuoi', label: '6 tháng cuối năm' },
  { value: 'namNay', label: 'Năm nay' },
  { value: 'namTruoc', label: 'Năm trước' },
  { value: 'tuyChon', label: 'Tùy chọn' },
];

/** Mặc định: Năm nay. Dùng cho khởi tạo state ở trang dùng filter. */
export function defaultYearParams(): PeriodFilterParams {
  return {
    periodType: 'nam',
    startDate: new Date(CURRENT_YEAR, 0, 1).toISOString(),
    endDate: new Date(CURRENT_YEAR, 11, 31, 23, 59, 59, 999).toISOString(),
  };
}

function buildPreset(period: string): PeriodFilterParams {
  if (period.startsWith('thang')) {
    const m = Number(period.slice(5));
    return {
      periodType: 'thang',
      startDate: new Date(CURRENT_YEAR, m - 1, 1).toISOString(),
      endDate: new Date(CURRENT_YEAR, m, 0, 23, 59, 59, 999).toISOString(),
    };
  }
  switch (period) {
    case 'nuaDau':
      return {
        periodType: 'tuyChon',
        startDate: new Date(CURRENT_YEAR, 0, 1).toISOString(),
        endDate: new Date(CURRENT_YEAR, 6, 0, 23, 59, 59, 999).toISOString(),
      };
    case 'nuaCuoi':
      return {
        periodType: 'tuyChon',
        startDate: new Date(CURRENT_YEAR, 6, 1).toISOString(),
        endDate: new Date(CURRENT_YEAR, 12, 0, 23, 59, 59, 999).toISOString(),
      };
    case 'namTruoc':
      return {
        periodType: 'nam',
        startDate: new Date(CURRENT_YEAR - 1, 0, 1).toISOString(),
        endDate: new Date(CURRENT_YEAR - 1, 11, 31, 23, 59, 59, 999).toISOString(),
      };
    case 'namNay':
    default:
      return defaultYearParams();
  }
}

export function PeriodFilter({ onFilter, loading }: PeriodFilterProps) {
  const [period, setPeriod] = useState('namNay');
  const [customFrom, setCustomFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [customTo, setCustomTo] = useState<Dayjs | null>(dayjs());
  const isCustom = period === 'tuyChon';

  const handleSubmit = () => {
    if (isCustom) {
      if (!customFrom || !customTo) return;
      onFilter({
        periodType: 'tuyChon',
        startDate: customFrom.startOf('day').toISOString(),
        endDate: customTo.endOf('day').toISOString(),
      });
    } else {
      onFilter(buildPreset(period));
    }
  };

  return (
    <Space align="center" size="small" wrap>
      <CalendarOutlined style={{ color: '#1890ff' }} />
      <Select
        value={period}
        onChange={setPeriod}
        options={PERIOD_OPTIONS}
        style={{ width: 160 }}
        showSearch
        optionFilterProp="label"
      />
      {isCustom && (
        <>
          <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="Từ ngày" style={{ width: 140 }} />
          <DatePicker value={customTo} onChange={setCustomTo} placeholder="Đến ngày" style={{ width: 140 }} />
        </>
      )}
      <Button type="primary" icon={<SearchOutlined />} onClick={handleSubmit} loading={loading}>
        Xem báo cáo
      </Button>
    </Space>
  );
}
