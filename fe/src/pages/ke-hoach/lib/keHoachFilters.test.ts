import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import {
  buildFilters,
  KE_HOACH_COLUMN_FILTER_KEYS,
  KE_HOACH_FILTER_LABELS,
  KE_HOACH_FILTER_STATE_KEYS,
} from "./keHoachFilters";

const get = (state: Record<string, unknown>) => (key: string) => state[key];

describe("buildFilters", () => {
  it("luôn có loại kế hoạch, mặc định là KE_HOACH", () => {
    expect(buildFilters(get({})).loaiKeHoach).toBe("KE_HOACH");
    expect(buildFilters(get({ loaiKeHoach: "DU_BAO" })).loaiKeHoach).toBe("DU_BAO");
  });

  it("đổi khoảng ngày thành startDate/endDate", () => {
    const f = buildFilters(
      get({ dateRange: [dayjs("2026-01-01"), dayjs("2026-12-31")] }),
    );
    expect(f).toMatchObject({ startDate: "2026-01-01", endDate: "2026-12-31" });
  });

  it("bỏ qua tiêu chí rỗng", () => {
    expect(buildFilters(get({ searchText: "", phienBan: undefined }))).not.toHaveProperty(
      "search",
    );
  });

  it("đưa tiêu chí lọc theo cột vào đúng query param", () => {
    const f = buildFilters(
      get({ filterDuAn: "DA01", filterTaiKhoanCo: "511", filterNhomQuanLy: "NQL1" }),
    );
    expect(f).toMatchObject({ duAn: "DA01", taiKhoanCo: "511", nhomQuanLy: "NQL1" });
  });
});

describe("bảng tiêu chí", () => {
  it("mọi tiêu chí đều có nhãn hiển thị", () => {
    for (const key of KE_HOACH_FILTER_STATE_KEYS) {
      expect(KE_HOACH_FILTER_LABELS[key]).toBeTruthy();
    }
  });

  it("mọi cột gắn lọc đều trỏ tới tiêu chí có thật", () => {
    for (const stateKey of Object.values(KE_HOACH_COLUMN_FILTER_KEYS)) {
      expect(KE_HOACH_FILTER_STATE_KEYS).toContain(stateKey);
    }
  });

  it("cột ĐT Nợ và ĐT Có dùng chung một tiêu chí đối tượng", () => {
    expect(KE_HOACH_COLUMN_FILTER_KEYS.doiTuong).toBe(
      KE_HOACH_COLUMN_FILTER_KEYS.doiTuong2,
    );
  });
});
