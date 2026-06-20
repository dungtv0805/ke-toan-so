import { useState, useMemo } from 'react';
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

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}`,
}));

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `Tháng ${i + 1}`,
}));

const QUARTER_OPTIONS = [
  { value: 'q1', label: 'Quý 1' },
  { value: 'q2', label: 'Quý 2' },
  { value: 'q3', label: 'Quý 3' },
  { value: 'q4', label: 'Quý 4' },
  { value: 'h1', label: '6T đầu' },
  { value: 'h2', label: '6T cuối' },
];

function getYearOptions(): { value: number; label: string }[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i;
    return { value: y, label: String(y) };
  });
}

function buildDateRange(
  day: number | null,
  month: number | null,
  quarterOrHalf: string | null,
  year: number,
  customFrom: Dayjs | null,
  customTo: Dayjs | null,
): PeriodFilterParams {
  // Tùy chọn: từ ngày đến ngày
  if (customFrom && customTo) {
    return {
      periodType: 'tuyChon',
      startDate: customFrom.startOf('day').toISOString(),
      endDate: customTo.endOf('day').toISOString(),
    };
  }

  // Ngày cụ thể: day + month + year
  if (day !== null && month !== null) {
    const date = new Date(year, month - 1, day);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    return {
      periodType: 'ngay',
      startDate: date.toISOString(),
      endDate: endOfDay.toISOString(),
    };
  }

  // Quý hoặc bán niên
  if (quarterOrHalf !== null) {
    let startMonth: number;
    let endMonth: number;
    switch (quarterOrHalf) {
      case 'q1': startMonth = 0; endMonth = 3; break;
      case 'q2': startMonth = 3; endMonth = 6; break;
      case 'q3': startMonth = 6; endMonth = 9; break;
      case 'q4': startMonth = 9; endMonth = 12; break;
      case 'h1': startMonth = 0; endMonth = 6; break;
      case 'h2': startMonth = 6; endMonth = 12; break;
      default: startMonth = 0; endMonth = 3;
    }
    return {
      periodType: 'quy',
      startDate: new Date(year, startMonth, 1).toISOString(),
      endDate: new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString(),
    };
  }

  // Tháng
  if (month !== null) {
    return {
      periodType: 'thang',
      startDate: new Date(year, month - 1, 1).toISOString(),
      endDate: new Date(year, month, 0, 23, 59, 59, 999).toISOString(),
    };
  }

  // Năm
  return {
    periodType: 'nam',
    startDate: new Date(year, 0, 1).toISOString(),
    endDate: new Date(year, 11, 31, 23, 59, 59, 999).toISOString(),
  };
}

export function PeriodFilter({ onFilter, loading }: PeriodFilterProps) {
  const now = new Date();
  const [day, setDay] = useState<number | null>(1);
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1);
  const [quarterOrHalf, setQuarterOrHalf] = useState<string | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [customFrom, setCustomFrom] = useState<Dayjs | null>(null);
  const [customTo, setCustomTo] = useState<Dayjs | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const yearOptions = useMemo(() => getYearOptions(), []);

  const handleSubmit = () => {
    if (isCustomMode) {
      const range = buildDateRange(null, null, null, year, customFrom, customTo);
      onFilter(range);
    } else {
      const range = buildDateRange(day, month, quarterOrHalf, year, null, null);
      onFilter(range);
    }
  };

  const handleDayChange = (v: number | null) => {
    setDay(v);
    setIsCustomMode(false);
    // Chọn ngày thì cần có tháng
    if (v !== null && month === null) setMonth(now.getMonth() + 1);
  };

  const handleMonthChange = (v: number | null) => {
    setMonth(v);
    setIsCustomMode(false);
    // Clear day nếu bỏ chọn tháng
    if (v === null) setDay(null);
  };

  const handleQuarterChange = (v: string | null) => {
    setQuarterOrHalf(v);
    setIsCustomMode(false);
    // Chọn quý thì clear ngày + tháng
    if (v !== null) { setDay(null); setMonth(null); }
  };

  const toggleCustomMode = () => {
    const next = !isCustomMode;
    setIsCustomMode(next);
    if (next) {
      setDay(null);
      setMonth(null);
      setQuarterOrHalf(null);
      if (!customFrom) setCustomFrom(dayjs().startOf('month'));
      if (!customTo) setCustomTo(dayjs());
    } else {
      setCustomFrom(null);
      setCustomTo(null);
    }
  };

  return (
    <Space align="center" size="small">
      <CalendarOutlined style={{ color: '#1890ff' }} />
      {!isCustomMode ? (
        <>
          <Select
            value={day}
            onChange={handleDayChange}
            options={DAYS}
            allowClear
            placeholder="Ngày"
            style={{ width: 80 }}
          />

          <Select
            value={month}
            onChange={handleMonthChange}
            options={MONTHS}
            allowClear
            placeholder="Tháng"
            style={{ width: 110 }}
          />

          <Select
            value={quarterOrHalf}
            onChange={handleQuarterChange}
            options={QUARTER_OPTIONS}
            allowClear
            placeholder="Quý"
            style={{ width: 110 }}
          />

          <Select
            value={year}
            onChange={setYear}
            options={yearOptions}
            placeholder="Năm"
            style={{ width: 90 }}
          />
        </>
      ) : (
        <>
          <DatePicker
            value={customFrom}
            onChange={setCustomFrom}
            placeholder="Từ ngày"
            style={{ width: 140 }}
          />
          <DatePicker
            value={customTo}
            onChange={setCustomTo}
            placeholder="Đến ngày"
            style={{ width: 140 }}
          />
        </>
      )}

      <Button size="small" type="link" onClick={toggleCustomMode}>
        {isCustomMode ? 'Theo kỳ' : 'Tùy chọn'}
      </Button>

      <Button type="primary" icon={<SearchOutlined />} onClick={handleSubmit} loading={loading}>
        Xem báo cáo
      </Button>
    </Space>
  );
}
