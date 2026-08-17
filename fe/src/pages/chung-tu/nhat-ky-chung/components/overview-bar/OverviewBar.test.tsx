// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  NhatKyChungHandlerProvider,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import type { NhatKyChungHandler } from "../../handler/nhat-ky-chung.handler";
import { OverviewBar } from "./OverviewBar";
import type { StatsData } from "../../handler/sub-handler/init/init.state";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }));
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

const STATS: StatsData = {
  tongButToan: 100,
  tongThu: 0,
  tongChi: 0,
  soDu: 0,
  tongGiaTri: 1_000_000_000,
  hopLe: { soLuong: 60, giaTri: 800_000_000 },
  chuaHopLe: { soLuong: 20, giaTri: 100_000_000 },
  khongHopLe: { soLuong: 5, giaTri: 50_000_000 },
  chuaKiemSoat: { soLuong: 15, giaTri: 50_000_000 },
};

/**
 * Phải nạp stats SAU khi OverviewBar mount xong — `useChandlerState` chỉ nghe thay đổi
 * từ lúc đăng ký (useEffect), set trước đó thì component giữ giá trị mặc định.
 */
const renderBar = (stats: StatsData) => {
  let handler: NhatKyChungHandler | null = null;
  const Capture = () => {
    handler = useNhatKyChungHandler();
    return null;
  };

  const result = render(
    <NhatKyChungHandlerProvider>
      <Capture />
      <OverviewBar />
    </NhatKyChungHandlerProvider>,
  );

  act(() => {
    handler!.setState("stats", stats);
  });

  return result;
};

describe("OverviewBar", () => {
  it("hiện đủ 8 thẻ số liệu theo đúng nhãn", () => {
    const { container } = renderBar(STATS);

    expect(container.querySelectorAll(".nkc-stat")).toHaveLength(8);
    for (const nhan of [
      "Tổng bút toán",
      "Hợp lệ",
      "Chưa hợp lệ",
      "Không hợp lệ",
      "Chưa kiểm soát",
      "Tỷ lệ hợp lệ",
      "Tỷ lệ chưa hợp lệ",
      "Tỷ lệ không hợp lệ",
    ]) {
      expect(screen.getByText(nhan)).toBeTruthy();
    }
  });

  it("thẻ đếm hiện số lượng ở trên, tiền quy về triệu ở dưới", () => {
    const { container } = renderBar(STATS);
    const the = container.querySelectorAll(".nkc-stat")[1]; // Hợp lệ

    expect(the.querySelector(".nkc-stat__value")?.textContent).toBe("60");
    expect(the.querySelector(".nkc-stat__sub")?.textContent).toBe("800 tr");
  });

  it("thẻ tỷ lệ hiện % theo số lượng ở trên, % theo giá trị ở dưới", () => {
    const { container } = renderBar(STATS);
    const the = container.querySelectorAll(".nkc-stat")[5]; // Tỷ lệ hợp lệ

    expect(the.querySelector(".nkc-stat__value")?.textContent).toBe("60%");
    expect(the.querySelector(".nkc-stat__sub")?.textContent).toBe("80% GT");
  });
});
