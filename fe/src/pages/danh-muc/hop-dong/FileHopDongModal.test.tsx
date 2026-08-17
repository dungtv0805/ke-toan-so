// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { FileHopDongModal } from "./FileHopDongModal";
import { HopDong } from "@/types";

const list = vi.fn().mockResolvedValue([]);
const fetchFileObjectUrl = vi.fn().mockResolvedValue("blob:fake");
vi.mock("@/services/hopDongFileService", () => ({
  hopDongFileService: {
    list: (...args: unknown[]) => list(...args),
    upload: vi.fn(),
    remove: vi.fn(),
    fetchFileObjectUrl: (...args: unknown[]) => fetchFileObjectUrl(...args),
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
  URL.createObjectURL = URL.createObjectURL || (() => "blob:fake");
  URL.revokeObjectURL = URL.revokeObjectURL || (() => {});
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

const fileMau = {
  _id: "f1",
  hopDongId: "hd1",
  tenFile: "hop-dong-001.pdf",
  mimeType: "application/pdf",
  size: 2048,
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("FileHopDongModal", () => {
  it("chỉ tải danh sách một lần dù onChanged làm trang cha render lại", async () => {
    list.mockClear().mockResolvedValue([]);
    render(<Cha />);

    await waitFor(() => expect(list).toHaveBeenCalled());
    // Để vòng lặp (nếu có) kịp quay thêm vài vòng.
    await new Promise((r) => setTimeout(r, 150));

    expect(list).toHaveBeenCalledTimes(1);
  });

  it("ô kéo-thả chỉ nhận PDF và cho chọn nhiều file", async () => {
    list.mockClear().mockResolvedValue([]);
    render(<Cha />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    // Modal của antd vẽ qua portal ra body nên phải tìm từ document.
    const input = document.querySelector<HTMLInputElement>(
      ".ant-upload-wrapper input[type=file]",
    );
    expect(input).toBeTruthy();
    expect(input!.accept).toBe(".pdf,application/pdf");
    expect(input!.multiple).toBe(true);
  });

  it("bấm tên file thì mở khung xem PDF, nạp file qua API (iframe không gửi được JWT)", async () => {
    list.mockClear().mockResolvedValue([fileMau]);
    fetchFileObjectUrl.mockClear().mockResolvedValue("blob:fake");
    render(<Cha />);

    await waitFor(() => expect(screen.getByText("hop-dong-001.pdf")).toBeTruthy());
    fireEvent.click(screen.getByText("hop-dong-001.pdf"));

    await waitFor(() => expect(fetchFileObjectUrl).toHaveBeenCalledWith("f1"));
    await waitFor(() =>
      expect(document.querySelector("iframe[src='blob:fake']")).toBeTruthy(),
    );
  });
});
