import { useEffect, useState } from "react";
import { DatePicker, Select } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { DashboardPeriod } from "@/components/shared/period";
import {
  useNhatKyChungHandler,
  useNhatKyChungState,
} from "../../NhatKyChungHandlerContext";
import {
  CUSTOM_PERIOD,
  NKC_PERIOD_OPTIONS,
  periodOfRange,
  rangeOfPeriod,
  type NkcPeriodKey,
} from "../../handler/lib/nkcPeriod";

/**
 * Lọc theo thời gian: một ô chọn kỳ giống trang Tổng quan (Tháng 1–12, Quý 1–4,
 * 6 tháng đầu/cuối, Năm nay, Năm trước). Chọn "Tùy chọn" mới hiện Từ ngày → Đến ngày.
 */
export function PeriodRangeFilter() {
  const handler = useNhatKyChungHandler();
  const [dateRange] = useNhatKyChungState("dateRange", null);
  const [period, setPeriod] = useState<NkcPeriodKey>(() => periodOfRange(dateRange));

  // Khoảng ngày đổi từ ngoài (nạp bộ lọc đã lưu, bấm "Xóa lọc") → nhãn kỳ phải theo.
  // Chỉ giữ nguyên khi đang ở "Tùy chọn" mà khoảng ngày vẫn không khớp kỳ dựng sẵn nào.
  useEffect(() => {
    const derived = periodOfRange(dateRange);
    setPeriod((prev) =>
      prev === CUSTOM_PERIOD && derived === CUSTOM_PERIOD ? prev : derived,
    );
  }, [dateRange]);

  const applyRange = (dates: [Dayjs, Dayjs] | null) =>
    handler.executeEvent("filterByDate", { dates });

  const handlePeriodChange = (next: NkcPeriodKey) => {
    setPeriod(next);
    // "Tùy chọn" chỉ mở hai ô ngày, giữ nguyên khoảng đang lọc cho tới khi người dùng đổi.
    if (next !== CUSTOM_PERIOD) applyRange(rangeOfPeriod(next as DashboardPeriod));
  };

  const from = dateRange?.[0] ?? null;
  const to = dateRange?.[1] ?? null;
  /** Chỉ lọc lại khi có đủ hai đầu — thiếu một đầu thì khoảng ngày vô nghĩa. */
  const emit = (a: Dayjs | null, b: Dayjs | null) => a && b && applyRange([a, b]);

  return (
    <>
      <CalendarOutlined style={{ color: "#1890ff" }} />
      <Select<NkcPeriodKey>
        size="small"
        showSearch
        optionFilterProp="label"
        style={{ width: 150 }}
        value={period}
        options={NKC_PERIOD_OPTIONS}
        onChange={handlePeriodChange}
      />
      {period === CUSTOM_PERIOD && (
        <>
          <DatePicker
            size="small"
            format="DD/MM/YYYY"
            placeholder="Từ ngày"
            style={{ width: 130 }}
            value={from}
            onChange={(d) => emit(d, to)}
          />
          <DatePicker
            size="small"
            format="DD/MM/YYYY"
            placeholder="Đến ngày"
            style={{ width: 130 }}
            value={to}
            onChange={(d) => emit(from, d)}
          />
        </>
      )}
    </>
  );
}
