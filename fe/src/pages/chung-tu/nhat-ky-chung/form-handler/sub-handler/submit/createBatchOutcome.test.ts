import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import { resolveCreateBatchOutcome } from "./createBatchOutcome";
import { ChungTuHeader } from "../init/init.state";

const header = (over: Partial<ChungTuHeader> = {}): ChungTuHeader => ({
  ngay: dayjs("2026-08-18"),
  ...over,
});

describe("resolveCreateBatchOutcome", () => {
  it('createBatch trả về số phiếu → "editMode": header mang soPhieu mới, isEditing = true (bug hồi quy: tránh createBatch lặp lại ở lần Lưu kế tiếp)', () => {
    const h = header({ hoaDon: [{ soHoaDon: "HD001", loai: "mua" }] });
    const outcome = resolveCreateBatchOutcome([{ soPhieu: "PT0001" }], h);

    expect(outcome.kind).toBe("editMode");
    if (outcome.kind !== "editMode") throw new Error("unreachable");
    expect(outcome.soPhieu).toBe("PT0001");
    expect(outcome.isEditing).toBe(true);
    expect(outcome.header.soPhieu).toBe("PT0001");
    // Các field khác của header giữ nguyên, không mất gì khi chuyển sang chế độ sửa.
    expect(outcome.header.hoaDon).toEqual(h.hoaDon);
  });

  it("không mutate header gốc (trả object mới)", () => {
    const h = header();
    const outcome = resolveCreateBatchOutcome([{ soPhieu: "PT0002" }], h);
    expect(h.soPhieu).toBeUndefined();
    if (outcome.kind === "editMode") {
      expect(outcome.header).not.toBe(h);
    }
  });

  it('createBatch KHÔNG trả số phiếu (mảng rỗng) NHƯNG form có hóa đơn → báo lỗi khuyên "mở lại chứng từ", KHÔNG khuyên "bấm Lưu lần nữa" (đúng bẫy cũ)', () => {
    const h = header({ hoaDon: [{ soHoaDon: "HD002", loai: "ban" }] });
    const outcome = resolveCreateBatchOutcome([], h);

    expect(outcome.kind).toBe("hoaDonKhongXacDinhDuocSoPhieu");
    if (outcome.kind !== "hoaDonKhongXacDinhDuocSoPhieu") throw new Error("unreachable");
    expect(outcome.message).toContain("Mở lại chứng từ");
    expect(outcome.message).not.toContain("lưu lần nữa");
    expect(outcome.message).not.toContain("Lưu lần nữa");
  });

  it("created[0].soPhieu rỗng chuỗi (falsy) cũng bị coi như không có số phiếu", () => {
    const h = header({ hoaDon: [{ soHoaDon: "HD003", loai: "mua" }] });
    const outcome = resolveCreateBatchOutcome([{ soPhieu: "" }], h);
    expect(outcome.kind).toBe("hoaDonKhongXacDinhDuocSoPhieu");
  });

  it("không có số phiếu và form không gắn hóa đơn nào → không cần báo lỗi, không cần chuyển chế độ sửa", () => {
    const h = header({ hoaDon: [] });
    const outcome = resolveCreateBatchOutcome([], h);
    expect(outcome.kind).toBe("khongCanGanHoaDon");
  });

  it("không có số phiếu và header.hoaDon undefined → vẫn coi như không cần gắn hóa đơn", () => {
    const h = header();
    const outcome = resolveCreateBatchOutcome([], h);
    expect(outcome.kind).toBe("khongCanGanHoaDon");
  });
});
