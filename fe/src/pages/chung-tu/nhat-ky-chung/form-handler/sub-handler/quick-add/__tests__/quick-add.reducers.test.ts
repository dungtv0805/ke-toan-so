import { describe, it, expect } from "vitest";
import {
  applyNghiepVu,
  toTaiKhoanItem,
  quickAddQuyChuanReducer,
  quickAddDoiTuongReducer,
  quickAddTaiKhoanReducer,
} from "../quick-add.reducers";
import { ChungTuChiTiet, TaiKhoanItem } from "../../init/init.state";
import { QuyChuan, DoiTuong, TaiKhoan } from "@/types";

const row = (over: Partial<ChungTuChiTiet> = {}): ChungTuChiTiet => ({
  key: "r1",
  taiKhoanNo: "",
  taiKhoanCo: "",
  soTien: 0,
  noiDung: "",
  ...over,
});

const qc: QuyChuan = {
  id: "qc1",
  loaiGiaoDich: "MUA_HANG",
  nghiepVu: "Mua vật tư",
  taiKhoanNo: "152",
  taiKhoanCo: "331",
  moTa: "Mua vật tư nhập kho",
};

describe("applyNghiepVu", () => {
  it("điền nghiệp vụ + auto-fill TK Nợ/Có/nội dung từ quy chuẩn", () => {
    const out = applyNghiepVu(row(), qc);
    expect(out.nghiepVu).toBe("Mua vật tư");
    expect(out.nghiepVuTen).toBe("Mua vật tư");
    expect(out.taiKhoanNo).toBe("152");
    expect(out.taiKhoanCo).toBe("331");
    expect(out.noiDung).toBe("Mua vật tư nhập kho");
  });

  it("giữ TK cũ nếu quy chuẩn không có TK", () => {
    const out = applyNghiepVu(row({ taiKhoanNo: "111", taiKhoanCo: "111" }), { ...qc, taiKhoanNo: "", taiKhoanCo: "" });
    expect(out.taiKhoanNo).toBe("111");
    expect(out.taiKhoanCo).toBe("111");
  });
});

describe("toTaiKhoanItem", () => {
  it("map TaiKhoan -> TaiKhoanItem đúng shape dùng trong bảng", () => {
    const tk = {
      id: "t1", ma: "1531", ten: "Công cụ", capDo: 2,
      loai: "TAI_SAN", nhom: "NO", chiTietTheo: undefined, fieldRules: null,
    } as unknown as TaiKhoan;
    const item: TaiKhoanItem = toTaiKhoanItem(tk);
    expect(item).toEqual({ ma: "1531", ten: "Công cụ", loai: "TAI_SAN", nhom: "NO", chiTietTheo: undefined, fieldRules: null });
  });
});

describe("quickAddQuyChuanReducer", () => {
  it("append quyChaunList và áp nghiệp vụ vào đúng dòng", () => {
    const out = quickAddQuyChuanReducer({
      chiTietList: [row({ key: "a" }), row({ key: "b" })],
      quyChaunList: [],
      key: "b",
      created: qc,
    });
    expect(out.quyChaunList).toHaveLength(1);
    expect(out.chiTietList[0].nghiepVu).toBeUndefined();
    expect(out.chiTietList[1].nghiepVu).toBe("Mua vật tư");
    expect(out.chiTietList[1].taiKhoanNo).toBe("152");
  });
});

describe("quickAddDoiTuongReducer", () => {
  const dt = { id: "d1", loai: ["KHACH_HANG"], ma: "KH001", ten: "Cty A", maSoThue: "" } as unknown as DoiTuong;
  it("append doiTuongList và set doiTuongId + snapshot khi field = doiTuongId", () => {
    const out = quickAddDoiTuongReducer({
      chiTietList: [row({ key: "a" })],
      doiTuongList: [],
      key: "a",
      field: "doiTuongId",
      created: dt,
    });
    expect(out.doiTuongList).toHaveLength(1);
    expect(out.chiTietList[0].doiTuongId).toBe("d1");
    expect((out.chiTietList[0].doiTuongSnapshot as { ma: string }).ma).toBe("KH001");
  });
  it("set doiTuong2Id + doiTuong2Snapshot khi field = doiTuong2Id", () => {
    const out = quickAddDoiTuongReducer({
      chiTietList: [row({ key: "a" })], doiTuongList: [], key: "a", field: "doiTuong2Id", created: dt,
    });
    expect(out.chiTietList[0].doiTuong2Id).toBe("d1");
    expect(out.chiTietList[0].doiTuong2Snapshot).toBeDefined();
  });
});

describe("quickAddTaiKhoanReducer", () => {
  const tk = { id: "t1", ma: "1388", ten: "Phải thu khác", capDo: 1, loai: "TAI_SAN", nhom: "NO" } as unknown as TaiKhoan;
  it("append taiKhoanList (dạng item) và set taiKhoanNo = ma", () => {
    const out = quickAddTaiKhoanReducer({
      chiTietList: [row({ key: "a" })], taiKhoanList: [], key: "a", field: "taiKhoanNo", created: tk,
    });
    expect(out.taiKhoanList[0].ma).toBe("1388");
    expect(out.chiTietList[0].taiKhoanNo).toBe("1388");
  });
  it("set taiKhoanCo = ma khi field = taiKhoanCo", () => {
    const out = quickAddTaiKhoanReducer({
      chiTietList: [row({ key: "a" })], taiKhoanList: [], key: "a", field: "taiKhoanCo", created: tk,
    });
    expect(out.chiTietList[0].taiKhoanCo).toBe("1388");
  });
});
