// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { KqkdTab } from "./KqkdTab";

vi.mock("@/services/kqkdKeHoachService", () => ({
  kqkdKeHoachService: {
    layBaoCao: () =>
      Promise.resolve({
        nam: 2026,
        doanhThuThuanNam: 100,
        doanhThuThuanThang: Array(12).fill(10),
        dinhPhiThang: Array(12).fill(0),
        bienPhiThang: Array(12).fill(0),
        dong: [
          { key: "01", soLaMa: "I", ten: "DOANH THU", cap: 0, thang: Array(12).fill(10) },
          { key: "02", soLaMa: "II", ten: "CÁC KHOẢN GIẢM TRỪ", cap: 0, thang: Array(12).fill(0) },
        ],
      }),
  },
}));

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

describe("KqkdTable", () => {
  it("mang class kh-bang — cột ghim mới có nền đục", async () => {
    // Mọi quy tắc "ô ghim phải đục" trong index.css đều khai dưới `.kh-bang`.
    // Bảng có cột ghim mà thiếu class này thì ô ghim trong suốt, phần bảng
    // đang cuộn hiện xuyên qua và chữ chồng lên nhau.
    const { container } = render(<KqkdTab nam={2026} loaiKeHoach="KE_HOACH" />);
    await waitFor(() =>
      expect(container.querySelector(".ant-table-wrapper")).toBeTruthy(),
    );
    expect(container.querySelector(".ant-table-wrapper.kh-bang")).toBeTruthy();
  });

  it("mỗi kỳ là một cụm Số tiền · %DS · Tỷ trọng", async () => {
    const { container } = render(<KqkdTab nam={2026} loaiKeHoach="KE_HOACH" />);
    await waitFor(() =>
      expect(container.querySelector(".ant-table-thead")).toBeTruthy(),
    );

    // Đếm trong MỘT thead: antd vẽ hai bảng (header cố định + thân) nên mỗi
    // tiêu đề xuất hiện hai lần trong DOM.
    const thead = container.querySelector(".ant-table-thead") as HTMLElement;
    const dem = (nhan: string) =>
      Array.from(thead.querySelectorAll("th")).filter(
        (th) => th.textContent?.trim() === nhan,
      ).length;

    expect(dem("Số tiền")).toBe(19);
    expect(dem("%DS")).toBe(19);
    expect(dem("Tỷ trọng")).toBe(19);
    // Hàng tiêu đề trên cùng là tên kỳ, đi từ rộng tới hẹp.
    const kyDau = Array.from(
      container.querySelectorAll(".ant-table-thead tr:first-child th"),
    )
      .map((th) => th.textContent?.trim())
      .slice(0, 5);
    expect(kyDau).toEqual([
      "Chỉ tiêu",
      "Cả năm",
      "6 tháng đầu",
      "6 tháng cuối",
      "QUÝ I",
    ]);
  });

  it("dòng không phát sinh để trống Tỷ trọng, không phải 100%", async () => {
    const { findByText, container } = render(
      <KqkdTab nam={2026} loaiKeHoach="KE_HOACH" />,
    );
    await findByText("II. CÁC KHOẢN GIẢM TRỪ");

    const hang = Array.from(container.querySelectorAll("tbody tr")).find((tr) =>
      tr.textContent?.includes("CÁC KHOẢN GIẢM TRỪ"),
    ) as HTMLElement;
    // Cả dòng chỉ có gạch ngang, không ô nào ghi 100.0%.
    expect(hang.textContent).not.toContain("100.0%");
  });
});
