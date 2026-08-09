import dayjs, { type Dayjs } from "dayjs";
import {
  PERIOD_OPTIONS,
  periodDateRange,
  resolvePeriod,
  type DashboardPeriod,
} from "@/components/shared/period";

/** Kỳ do người dùng tự chọn khoảng ngày. */
export const CUSTOM_PERIOD = "tuyChon";

export type NkcPeriodKey = DashboardPeriod | typeof CUSTOM_PERIOD;

/**
 * Danh sách kỳ của hàng lọc "Dữ liệu tổng hợp" — dùng đúng bộ kỳ của trang Tổng quan
 * để hai nơi giống nhau, thêm "Tùy chọn" cho ai cần chọn từ ngày → đến ngày.
 */
export const NKC_PERIOD_OPTIONS: { label: string; value: NkcPeriodKey }[] = [
  ...PERIOD_OPTIONS,
  { label: "Tùy chọn", value: CUSTOM_PERIOD },
];

const thisYear = () => new Date().getFullYear();

/** Khoảng ngày của một kỳ dựng sẵn. Không dùng cho `tuyChon`. */
export function rangeOfPeriod(
  period: DashboardPeriod,
  year = thisYear(),
): [Dayjs, Dayjs] {
  const { start, end } = periodDateRange(resolvePeriod(period, year));
  return [dayjs(start), dayjs(end)];
}

/**
 * Kỳ tương ứng với một khoảng ngày — để mở lại trang (khoảng ngày lưu ở bộ lọc) vẫn
 * hiện đúng nhãn kỳ. Không khớp kỳ dựng sẵn nào thì là "Tùy chọn".
 */
export function periodOfRange(
  range: [Dayjs, Dayjs] | null | undefined,
  year = thisYear(),
): NkcPeriodKey {
  if (!range?.[0] || !range?.[1]) return "namNay";

  for (const opt of PERIOD_OPTIONS) {
    const [start, end] = rangeOfPeriod(opt.value, year);
    if (range[0].isSame(start, "day") && range[1].isSame(end, "day")) {
      return opt.value;
    }
  }
  return CUSTOM_PERIOD;
}
