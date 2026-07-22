import { describe, it, expect, vi, afterEach } from "vitest";
import { taiKhoanService } from "@/services/taiKhoanService";
import { khoanMucService } from "@/services/khoanMucService";
import { nganHangService } from "@/services/nganHangService";
import { taiKhoanImportConfig } from "../taiKhoan.config";
import { khoanMucImportConfig } from "../khoanMuc.config";
import { nganHangImportConfig } from "../nganHang.config";
import { quyChuanImportConfig } from "../quyChuan.config";
import type { TaiKhoan, KhoanMuc, TaiKhoanNganHang } from "@/types";

/**
 * Fix 1: taiKhoanService.getAll(), khoanMucService.getAll(), nganHangService.getAll() đều
 * là shim @deprecated giới hạn 100 dòng (getPaginated({ limit: 100 })). Test này chứng minh
 * 4 config bị ảnh hưởng (taiKhoan, khoanMuc, nganHang, quyChuan) KHÔNG còn gọi các getAll()
 * bị giới hạn đó nữa — cả ở `service` (dò trùng) lẫn `ref.service` (dò mã tham chiếu) — mà
 * dùng nguồn đầy đủ (completeSetSources.ts), bằng cách mock để trả về > 100 bản ghi và xác
 * nhận không có dữ liệu nào bị cắt cụt.
 */

const RECORD_COUNT = 150; // > 100: đủ để lộ ra nếu lỡ còn gọi getAll() bị giới hạn 100.

function makeTaiKhoan(i: number): TaiKhoan {
  return {
    id: `tk-${i}`,
    ma: `${1000 + i}`,
    ten: `Tài khoản ${i}`,
    capDo: 1,
    loai: "TAI_SAN",
    nhom: "NO",
  };
}
const manyTaiKhoan = Array.from({ length: RECORD_COUNT }, (_, i) => makeTaiKhoan(i));

function makeKhoanMuc(i: number): KhoanMuc {
  return { id: `km-${i}`, ma: `KM${i}`, ten: `Khoản mục ${i}`, loai: "CHI_PHI", nhom: "" };
}
const manyKhoanMuc = Array.from({ length: RECORD_COUNT }, (_, i) => makeKhoanMuc(i));

function makeNganHang(i: number): TaiKhoanNganHang {
  return { id: `nh-${i}`, ma: `NH${i}`, ten: `Ngân hàng ${i}`, loai: "NGAN_HANG", soDu: 0 };
}
const manyNganHang = Array.from({ length: RECORD_COUNT }, (_, i) => makeNganHang(i));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Fix 1 — Tài khoản: dùng getHierarchy() (đầy đủ), không dùng getAll() (100 dòng)", () => {
  it("taiKhoanImportConfig.service (dò trùng) gọi getHierarchy(), không gọi getAll()", async () => {
    const hierarchySpy = vi
      .spyOn(taiKhoanService, "getHierarchy")
      .mockResolvedValue(manyTaiKhoan);
    const cappedSpy = vi
      .spyOn(taiKhoanService, "getAll")
      .mockResolvedValue(manyTaiKhoan.slice(0, 100));

    const result = await taiKhoanImportConfig.service.getAll();

    expect(hierarchySpy).toHaveBeenCalledTimes(1);
    expect(cappedSpy).not.toHaveBeenCalled();
    expect(result).toHaveLength(RECORD_COUNT);
  });

  it('cột "Số tài khoản cha" (ref) dò trên getHierarchy(), không dùng getAll()', async () => {
    const hierarchySpy = vi
      .spyOn(taiKhoanService, "getHierarchy")
      .mockResolvedValue(manyTaiKhoan);
    const cappedSpy = vi.spyOn(taiKhoanService, "getAll").mockResolvedValue([]);

    const col = taiKhoanImportConfig.columns.find((c) => c.key === "taiKhoanCha");
    const result = await col!.ref!.service.getAll();

    expect(hierarchySpy).toHaveBeenCalledTimes(1);
    expect(cappedSpy).not.toHaveBeenCalled();
    expect(result).toHaveLength(RECORD_COUNT);
  });

  it('Quy chuẩn hạch toán: cột "TK Nợ" và "TK Có" đều dò trên getHierarchy(), không dùng getAll()', async () => {
    const hierarchySpy = vi
      .spyOn(taiKhoanService, "getHierarchy")
      .mockResolvedValue(manyTaiKhoan);
    const cappedSpy = vi.spyOn(taiKhoanService, "getAll").mockResolvedValue([]);

    const taiKhoanNo = quyChuanImportConfig.columns.find((c) => c.key === "taiKhoanNo");
    const taiKhoanCo = quyChuanImportConfig.columns.find((c) => c.key === "taiKhoanCo");

    const resultNo = await taiKhoanNo!.ref!.service.getAll();
    const resultCo = await taiKhoanCo!.ref!.service.getAll();

    expect(resultNo).toHaveLength(RECORD_COUNT);
    expect(resultCo).toHaveLength(RECORD_COUNT);
    expect(cappedSpy).not.toHaveBeenCalled();
    expect(hierarchySpy).toHaveBeenCalledTimes(2);
  });
});

describe("Fix 1 — Khoản mục: xin trang lớn qua getPaginated() (backend chưa có route trọn bộ), không dùng getAll() (100 dòng)", () => {
  it("khoanMucImportConfig.service trả về đủ > 100 bản ghi, không gọi getAll()", async () => {
    const paginatedSpy = vi.spyOn(khoanMucService, "getPaginated").mockResolvedValue({
      data: manyKhoanMuc,
      meta: { total: RECORD_COUNT, page: 1, limit: 10000, totalPages: 1 },
    });
    const cappedSpy = vi
      .spyOn(khoanMucService, "getAll")
      .mockResolvedValue(manyKhoanMuc.slice(0, 100));

    const result = await khoanMucImportConfig.service.getAll();

    expect(cappedSpy).not.toHaveBeenCalled();
    expect(result).toHaveLength(RECORD_COUNT);
    expect(paginatedSpy).toHaveBeenCalledTimes(1);
    const [params] = paginatedSpy.mock.calls[0];
    expect(params?.limit).toBeGreaterThan(100);
  });
});

describe("Fix 1 — Ngân hàng & Quỹ: xin trang lớn qua getPaginated() (backend chưa có route trọn bộ), không dùng getAll() (100 dòng)", () => {
  it("nganHangImportConfig.service trả về đủ > 100 bản ghi, không gọi getAll()", async () => {
    const paginatedSpy = vi.spyOn(nganHangService, "getPaginated").mockResolvedValue({
      data: manyNganHang,
      meta: { total: RECORD_COUNT, page: 1, limit: 10000, totalPages: 1 },
    });
    const cappedSpy = vi
      .spyOn(nganHangService, "getAll")
      .mockResolvedValue(manyNganHang.slice(0, 100));

    const result = await nganHangImportConfig.service.getAll();

    expect(cappedSpy).not.toHaveBeenCalled();
    expect(result).toHaveLength(RECORD_COUNT);
    expect(paginatedSpy).toHaveBeenCalledTimes(1);
    const [params] = paginatedSpy.mock.calls[0];
    expect(params?.limit).toBeGreaterThan(100);
  });
});
