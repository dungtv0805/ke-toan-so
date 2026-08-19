import React, { useEffect, useState } from "react";
import { DatePicker, Select } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { DashboardPeriod } from "@/components/shared/period";
// Dùng CHUNG bộ kỳ với "Dữ liệu tổng hợp" để hai màn hình không lệch lựa chọn kỳ.
import {
  CUSTOM_PERIOD,
  NKC_PERIOD_OPTIONS,
  periodOfRange,
  rangeOfPeriod,
  type NkcPeriodKey,
} from "@/pages/chung-tu/nhat-ky-chung/handler/lib/nkcPeriod";
import { useKeHoachHandler, useKeHoachState } from "../KeHoachHandlerContext";

/** Lọc theo thời gian — bản sao giao diện của PeriodRangeFilter bên chứng từ. */
export const PeriodRangeFilter: React.FC = () => {
  const handler = useKeHoachHandler();
  const [dateRange] = useKeHoachState("dateRange");
  const range = dateRange as [Dayjs, Dayjs] | null | undefined;
  const [period, setPeriod] = useState<NkcPeriodKey>(() => periodOfRange(range ?? null));

  useEffect(() => {
    const derived = periodOfRange(range ?? null);
    setPeriod((prev) =>
      prev === CUSTOM_PERIOD && derived === CUSTOM_PERIOD ? prev : derived,
    );
  }, [range]);

  const applyRange = (dates: [Dayjs, Dayjs] | null) =>
    handler.executeEvent("filterByDate", { dates });

  const handlePeriodChange = (next: NkcPeriodKey) => {
    setPeriod(next);
    if (next !== CUSTOM_PERIOD) applyRange(rangeOfPeriod(next as DashboardPeriod));
  };

  const from = range?.[0] ?? null;
  const to = range?.[1] ?? null;
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
};
