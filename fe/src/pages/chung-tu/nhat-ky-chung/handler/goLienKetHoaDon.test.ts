import { describe, it, expect, vi, afterEach } from "vitest";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { bangKeMuaVaoService, bangKeBanRaService } from "@/services/taxService";
import type { BangKeRecord } from "@/services/taxService";
import type { NhatKyChung } from "@/types";
import { goLienKetChoCacSoPhieu, loiGoLienKetMessage } from "./goLienKetHoaDon";

const hd = (id: string, soHoaDon = "HD001"): BangKeRecord =>
  ({ id, soHoaDon, ngayHoaDon: "2026-06-01", giaTriChuaThue: 0, thueSuat: "10", tienThue: 0, tongThanhToan: 0 } as BangKeRecord);

function mockAll(opts: {
  conLai?: Record<string, NhatKyChung[]>;
  mua?: Record<string, BangKeRecord[]>;
  ban?: Record<string, BangKeRecord[]>;
}) {
  const getBySoPhieu = vi
    .spyOn(nhatKyChungService, "getBySoPhieu")
    .mockImplementation(async (sp: string) => opts.conLai?.[sp] || []);
  vi.spyOn(bangKeMuaVaoService, "layTheoSoChungTu").mockImplementation(async (list: string[]) => {
    const out: Record<string, BangKeRecord[]> = {};
    for (const sp of list) if (opts.mua?.[sp]) out[sp] = opts.mua[sp];
    return out;
  });
  vi.spyOn(bangKeBanRaService, "layTheoSoChungTu").mockImplementation(async (list: string[]) => {
    const out: Record<string, BangKeRecord[]> = {};
    for (const sp of list) if (opts.ban?.[sp]) out[sp] = opts.ban[sp];
    return out;
  });
  const goMua = vi.spyOn(bangKeMuaVaoService, "goLienKet").mockResolvedValue({} as BangKeRecord);
  const goBan = vi.spyOn(bangKeBanRaService, "goLienKet").mockResolvedValue({} as BangKeRecord);
  return { getBySoPhieu, goMua, goBan };
}

afterEach(() => vi.restoreAllMocks());

describe("goLienKetChoCacSoPhieu", () => {
  it("chứng từ đã hết bút toán → gỡ liên kết cả hóa đơn mua vào lẫn bán ra", async () => {
    const { goMua, goBan } = mockAll({
      mua: { PC0001: [hd("m1"), hd("m2", "HD002")] },
      ban: { PC0001: [hd("b1")] },
    });

    expect(await goLienKetChoCacSoPhieu(["PC0001"])).toEqual([]);
    expect(goMua.mock.calls.map((c) => c[0])).toEqual(["m1", "m2"]);
    expect(goBan.mock.calls.map((c) => c[0])).toEqual(["b1"]);
  });

  it("chứng từ VẪN CÒN bút toán → tuyệt đối không gỡ", async () => {
    const { goMua, goBan } = mockAll({
      conLai: { PC0001: [{ id: "e1" } as NhatKyChung] },
      mua: { PC0001: [hd("m1")] },
    });

    expect(await goLienKetChoCacSoPhieu(["PC0001"])).toEqual([]);
    expect(goMua).not.toHaveBeenCalled();
    expect(goBan).not.toHaveBeenCalled();
  });

  it("xóa nhóm nhiều chứng từ: bỏ trùng, mỗi số phiếu kiểm đúng một lần", async () => {
    const { getBySoPhieu, goMua } = mockAll({
      mua: { PC0001: [hd("m1")], PC0002: [hd("m2")] },
    });

    await goLienKetChoCacSoPhieu(["PC0001", "PC0001", "PC0002", "", "  "]);
    expect(getBySoPhieu.mock.calls.map((c) => c[0])).toEqual(["PC0001", "PC0002"]);
    expect(goMua.mock.calls.map((c) => c[0]).sort()).toEqual(["m1", "m2"]);
  });

  it("một số phiếu lỗi thì các số phiếu còn lại vẫn được gỡ, và lỗi được trả về", async () => {
    mockAll({ mua: { PC0002: [hd("m2")] } });
    vi.spyOn(nhatKyChungService, "getBySoPhieu").mockImplementation(async (sp: string) => {
      if (sp === "PC0001") throw new Error("mạng lỗi");
      return [];
    });
    const goMua = vi
      .spyOn(bangKeMuaVaoService, "goLienKet")
      .mockResolvedValue({} as BangKeRecord);

    const hong = await goLienKetChoCacSoPhieu(["PC0001", "PC0002"]);
    expect(hong).toEqual(["PC0001"]);
    expect(goMua.mock.calls.map((c) => c[0])).toEqual(["m2"]);
  });

  it("danh sách rỗng → không gọi API nào", async () => {
    const { getBySoPhieu } = mockAll({});
    expect(await goLienKetChoCacSoPhieu([])).toEqual([]);
    expect(getBySoPhieu).not.toHaveBeenCalled();
  });
});

describe("loiGoLienKetMessage", () => {
  it("không có số phiếu hỏng → không báo gì", () => {
    expect(loiGoLienKetMessage([])).toBe("");
  });

  it("có số phiếu hỏng → nêu đúng tên chứng từ", () => {
    expect(loiGoLienKetMessage(["PC0001", "PC0002"])).toContain("PC0001, PC0002");
  });
});
