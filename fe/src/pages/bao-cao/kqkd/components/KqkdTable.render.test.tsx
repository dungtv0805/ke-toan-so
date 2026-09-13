// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { KqkdTable } from "./KqkdTable";
import type { KqkdChiTieu } from "@/services/kqkdService";

const dong = (ma: string, ten: string): KqkdChiTieu =>
  ({ ma, ten, kyNay: 100, kyTruoc: 80 }) as unknown as KqkdChiTieu;

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    (((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia);
  window.ResizeObserver =
    window.ResizeObserver ||
    (class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver);
});

const data = [dong("01", "Doanh thu"), dong("02", "Giá vốn")];

describe("KqkdTable — ghim hàng tiêu đề", () => {
  it("có chiều cao thân thì antd tách hàng tiêu đề ra bảng riêng (tiêu đề đứng yên)", () => {
    const { container } = render(
      <KqkdTable data={data} loading={false} chieuCaoThan={400} />,
    );
    expect(container.querySelector(".ant-table-header")).toBeTruthy();
    expect(container.querySelector(".ant-table-body")).toBeTruthy();
  });

  it("mang class kh-bang — cột ghim (điện thoại) mới có nền đục", () => {
    // Mọi quy tắc "ô ghim phải đục" trong index.css đều khai dưới `.kh-bang`.
    const { container } = render(<KqkdTable data={data} loading={false} />);
    expect(container.querySelector(".ant-table-wrapper.kh-bang")).toBeTruthy();
  });

  it("không truyền thì giữ nguyên nếp cũ: một bảng, cuộn theo trang", () => {
    const { container } = render(<KqkdTable data={data} loading={false} />);
    expect(container.querySelector(".ant-table-header")).toBeNull();
  });
});
