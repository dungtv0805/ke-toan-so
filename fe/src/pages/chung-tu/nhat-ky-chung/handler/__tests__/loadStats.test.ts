import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Số liệu tổng quan (số lượng bút toán / tổng giá trị) luôn hiện 0 trên production
 * dù API trả đúng số. Nguyên nhân: `loadStats` có `@HandlerDecorator` nên chỉ chạy khi
 * được gọi qua `executeEvent`; `init`/`refresh` gọi thẳng `this.loadStats()` thì decorator
 * thoát sớm (không có `uniqId`) và thân hàm không bao giờ chạy — im lặng, không lỗi.
 */

const getStats = vi.fn();
const getEntries = vi.fn();

vi.mock("@/services/nhatKyChungService", () => ({
  nhatKyChungService: {
    getStats: (...args: unknown[]) => getStats(...args),
    getEntries: (...args: unknown[]) => getEntries(...args),
    getNguoiGiaoDichOptions: () => Promise.resolve([]),
  },
}));

vi.mock("@/services/taiKhoanService", () => ({
  taiKhoanService: { getLeafAccounts: () => Promise.resolve([]) },
}));

vi.mock("@/services/khoanMucService", () => ({
  khoanMucService: { getPaginated: () => Promise.resolve({ data: [] }) },
}));

const STATS_FROM_API = {
  tongSo: 777,
  tongPhatSinhNo: 1541079882,
  tongPhatSinhCo: 1690329870,
  tongGiaTri: 6863487528,
};

describe("nạp số liệu tổng quan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStats.mockResolvedValue(STATS_FROM_API);
    getEntries.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
    });
  });

  it('sự kiện "refresh" phải nạp lại số liệu tổng quan vào state', async () => {
    const { NhatKyChungHandler } = await import("../nhat-ky-chung.handler");
    const handler = new NhatKyChungHandler();

    await handler.executeEvent("refresh", {});

    expect(getStats).toHaveBeenCalledTimes(1);
    expect(handler.getState("stats")).toMatchObject({
      tongButToan: 777,
      tongGiaTri: 6863487528,
    });
  });
});
