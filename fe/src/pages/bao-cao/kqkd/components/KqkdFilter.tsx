import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { KqkdPeriodType } from '@/services/kqkdService';

export interface KqkdFilterParams {
  periodType: KqkdPeriodType;
  startDate: string;
  endDate: string;
}

interface KqkdFilterProps {
  onFilter: (params: KqkdFilterParams) => void;
  loading?: boolean;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

const QUARTERS = [
  { value: '1', label: 'Quý 1 (T1-T3)' },
  { value: '2', label: 'Quý 2 (T4-T6)' },
  { value: '3', label: 'Quý 3 (T7-T9)' },
  { value: '4', label: 'Quý 4 (T10-T12)' },
];

function getYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: String(y) };
  });
}

function buildDateRange(
  periodType: KqkdPeriodType,
  month: number,
  quarter: number,
  year: number,
  customFrom: string,
  customTo: string,
): { startDate: string; endDate: string } {
  switch (periodType) {
    case 'thang': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'quy': {
      const qStart = (quarter - 1) * 3;
      const start = new Date(year, qStart, 1);
      const end = new Date(year, qStart + 3, 0);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'nam': {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'tuyChon':
      return {
        startDate: new Date(customFrom).toISOString(),
        endDate: new Date(customTo).toISOString(),
      };
  }
}

export function KqkdFilter({ onFilter, loading }: KqkdFilterProps) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<KqkdPeriodType>('thang');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [customFrom, setCustomFrom] = useState(
    now.toISOString().slice(0, 10),
  );
  const [customTo, setCustomTo] = useState(now.toISOString().slice(0, 10));

  const yearOptions = useMemo(() => getYearOptions(), []);

  const handleSubmit = () => {
    const range = buildDateRange(
      periodType,
      month,
      quarter,
      year,
      customFrom,
      customTo,
    );
    onFilter({ periodType, ...range });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Period type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Kỳ báo cáo
        </label>
        <Select
          value={periodType}
          onValueChange={(v) => setPeriodType(v as KqkdPeriodType)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thang">Tháng</SelectItem>
            <SelectItem value="quy">Quý</SelectItem>
            <SelectItem value="nam">Năm</SelectItem>
            <SelectItem value="tuyChon">Tùy chọn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Month picker */}
      {periodType === 'thang' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tháng
            </label>
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Năm
            </label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y.value} value={y.value}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Quarter picker */}
      {periodType === 'quy' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Quý
            </label>
            <Select
              value={String(quarter)}
              onValueChange={(v) => setQuarter(Number(v))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTERS.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Năm
            </label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y.value} value={y.value}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Year picker */}
      {periodType === 'nam' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Năm
          </label>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom date range */}
      {periodType === 'tuyChon' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Từ ngày
            </label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Đến ngày
            </label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </>
      )}

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Đang tải...' : 'Xem báo cáo'}
      </Button>
    </div>
  );
}
