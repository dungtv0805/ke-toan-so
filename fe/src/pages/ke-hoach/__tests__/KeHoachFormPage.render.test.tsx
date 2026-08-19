// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import KeHoachFormPage from "../form/KeHoachFormPage";

// Không gọi API thật: mọi danh mục trả rỗng, form vẫn phải dựng được.
vi.mock("@/services/keHoachService", () => ({
  keHoachService: {
    getPhienBanOptions: () => Promise.resolve([]),
    createBatch: () => Promise.resolve([]),
  },
}));
// vi.mock được hoist lên đầu file nên factory KHÔNG dùng được biến ngoài — viết thẳng
// danh mục rỗng trong từng factory.
vi.mock("@/services/taiKhoanService", () => ({
  taiKhoanService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
    getLeafAccounts: () => Promise.resolve([]),
  },
}));
vi.mock("@/services/khoanMucService", () => ({
  khoanMucService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/doiTuongService", () => ({
  doiTuongService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/duAnService", () => ({
  duAnService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/boPhanService", () => ({
  boPhanService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/sanPhamService", () => ({
  sanPhamService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/dongTienService", () => ({
  dongTienService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/nhomQuanLyService", () => ({
  nhomQuanLyService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/chuDauTuService", () => ({
  chuDauTuService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/nhomKhoanMucService", () => ({
  nhomKhoanMucService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
  },
}));
vi.mock("@/services/quyChaunService", () => ({
  quyChauanService: {
    getAll: () => Promise.resolve([]),
    getPaginated: () => Promise.resolve({ data: [], meta: {} }),
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

describe("Form nhập kế hoạch", () => {
  it("dựng được và hiện đủ hai khối như form chứng từ", async () => {
    render(
      <MemoryRouter>
        <KeHoachFormPage loaiKeHoach="KE_HOACH" />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Thông tin kế hoạch")).toBeTruthy();
    expect(screen.getByText("Chi tiết dòng kế hoạch")).toBeTruthy();
  });

  it("route dự báo đổi tiêu đề khối thông tin", async () => {
    render(
      <MemoryRouter>
        <KeHoachFormPage loaiKeHoach="DU_BAO" />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Thông tin dự báo")).toBeTruthy();
  });
});
