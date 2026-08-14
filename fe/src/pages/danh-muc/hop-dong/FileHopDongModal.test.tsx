// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, waitFor } from "@testing-library/react";
import { FileHopDongModal } from "./FileHopDongModal";
import { HopDong } from "@/types";

const list = vi.fn().mockResolvedValue([]);
vi.mock("@/services/hopDongFileService", () => ({
  hopDongFileService: {
    list: (...args: unknown[]) => list(...args),
    upload: vi.fn(),
    remove: vi.fn(),
    fetchFileObjectUrl: vi.fn(),
  },
}));

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

const hopDong = { id: 'hd1', soHopDong: 'HD-001' } as HopDong;

/** Trang cha đúng như HopDongPage: onChanged cập nhật state nên cha render lại. */
function Cha() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  return (
    <>
      <span data-testid="counts">{JSON.stringify(counts)}</span>
      <FileHopDongModal
        hopDong={hopDong}
        open
        canUpload
        canDelete
        onClose={() => {}}
        onChanged={(id, so) => setCounts((p) => ({ ...p, [id]: so }))}
      />
    </>
  );
}

describe("FileHopDongModal", () => {
  it("chỉ tải danh sách một lần dù onChanged làm trang cha render lại", async () => {
    list.mockClear();
    render(<Cha />);

    await waitFor(() => expect(list).toHaveBeenCalled());
    // Để vòng lặp (nếu có) kịp quay thêm vài vòng.
    await new Promise((r) => setTimeout(r, 150));

    expect(list).toHaveBeenCalledTimes(1);
  });
});
