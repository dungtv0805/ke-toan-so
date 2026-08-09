import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import {
  CUSTOM_PERIOD,
  NKC_PERIOD_OPTIONS,
  periodOfRange,
  rangeOfPeriod,
} from "./nkcPeriod";

const YEAR = 2026;
const d = (s: string) => dayjs(s, "YYYY-MM-DD");

describe("rangeOfPeriod", () => {
  it("tháng → trọn tháng đó", () => {
    const [from, to] = rangeOfPeriod("thang2", YEAR);
    expect(from.format("YYYY-MM-DD")).toBe("2026-02-01");
    expect(to.format("YYYY-MM-DD")).toBe("2026-02-28");
  });

  it("quý → 3 tháng của quý", () => {
    const [from, to] = rangeOfPeriod("quy3", YEAR);
    expect(from.format("YYYY-MM-DD")).toBe("2026-07-01");
    expect(to.format("YYYY-MM-DD")).toBe("2026-09-30");
  });

  it("năm nay / năm trước", () => {
    expect(rangeOfPeriod("namNay", YEAR)[0].format("YYYY-MM-DD")).toBe("2026-01-01");
    expect(rangeOfPeriod("namNay", YEAR)[1].format("YYYY-MM-DD")).toBe("2026-12-31");
    expect(rangeOfPeriod("namTruoc", YEAR)[0].format("YYYY-MM-DD")).toBe("2025-01-01");
    expect(rangeOfPeriod("namTruoc", YEAR)[1].format("YYYY-MM-DD")).toBe("2025-12-31");
  });
});

describe("periodOfRange", () => {
  it("khoảng ngày trùng một kỳ dựng sẵn → ra đúng kỳ đó", () => {
    expect(periodOfRange([d("2026-07-01"), d("2026-09-30")], YEAR)).toBe("quy3");
    expect(periodOfRange([d("2026-01-01"), d("2026-12-31")], YEAR)).toBe("namNay");
    expect(periodOfRange([d("2026-03-01"), d("2026-03-31")], YEAR)).toBe("thang3");
  });

  it("khoảng ngày lẻ → Tùy chọn", () => {
    expect(periodOfRange([d("2026-03-05"), d("2026-04-17")], YEAR)).toBe(CUSTOM_PERIOD);
  });

  it("chưa lọc ngày → mặc định Năm nay", () => {
    expect(periodOfRange(null, YEAR)).toBe("namNay");
  });

  it("đi vòng: mọi kỳ dựng sẵn đều nhận lại chính nó", () => {
    for (const opt of NKC_PERIOD_OPTIONS) {
      if (opt.value === CUSTOM_PERIOD) continue;
      const range = rangeOfPeriod(opt.value, YEAR);
      expect(periodOfRange(range, YEAR)).toBe(opt.value);
    }
  });
});
