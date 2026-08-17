// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  ToolbarSlot,
  ToolbarSlotProvider,
  useToolbarSlotRef,
} from "./ToolbarSlot";

const HangLoc = () => <div data-testid="slot" ref={useToolbarSlotRef()} />;

describe("ToolbarSlot", () => {
  it("bắn nút của bảng vào đúng chỗ trống trên hàng lọc", () => {
    const { getByTestId } = render(
      <ToolbarSlotProvider>
        <HangLoc />
        <div>
          <ToolbarSlot>
            <button>Xuất Excel</button>
          </ToolbarSlot>
        </div>
      </ToolbarSlotProvider>,
    );

    // Slot nằm ở component render TRƯỚC, nút lại khai báo ở component sau — nếu
    // portal không đợi được ref thì nút sẽ không có mặt ở đây.
    expect(getByTestId("slot").textContent).toBe("Xuất Excel");
  });

  it("không có provider/slot thì không dựng gì (không vỡ)", () => {
    const { container } = render(
      <ToolbarSlot>
        <button>Xuất Excel</button>
      </ToolbarSlot>,
    );

    expect(container.textContent).toBe("");
  });
});
