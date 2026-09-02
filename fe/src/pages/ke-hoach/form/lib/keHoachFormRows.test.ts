import { describe, it, expect } from "vitest";
import {
  apDungQuyChuan,
  capNhat,
  dongMoi,
  giaoDichOptions,
  loiCuaLo,
  nghiepVuOptions,
  nhanBan,
  toPayloads,
  type DongKeHoach,
} from "./keHoachFormRows";
import type { DanhMucLists } from "../../lib/keHoachRow";

const lists: DanhMucLists = {
  taiKhoanList: [
    { ma: "131", ten: "Phải thu" },
    { ma: "511", ten: "Doanh thu" },
  ],
  doiTuongList: [],
  duAnList: [{ ma: "DA01", ten: "Dự án A" }],
  boPhanList: [],
  sanPhamList: [],
  dongTienList: [],
  khoanMucList: [],
  nhomQuanLyList: [],
  chuDauTuList: [],
  nhomKhoanMucList: [],
};

const dong = (p: Partial<DongKeHoach> = {}): DongKeHoach => ({
  ...dongMoi("2026-01-01T00:00:00.000Z"),
  ...p,
});

describe("dongMoi", () => {
  it("lấy ngày mặc định của form và số tiền 0", () => {
    const d = dongMoi("2026-03-01T00:00:00.000Z");
    expect(d.ngay).toBe("2026-03-01T00:00:00.000Z");
    expect(d.soTien).toBe(0);
  });

  it("mỗi dòng có key riêng", () => {
    expect(dongMoi().key).not.toBe(dongMoi().key);
  });
});

describe("nhanBan", () => {
  it("giữ nguyên mọi chiều nhưng đổi key", () => {
    const goc = dong({ duAn: "DA01", soTien: 500, noiDung: "Doanh thu T1" });
    const ban = nhanBan(goc);
    expect(ban).toMatchObject({ duAn: "DA01", soTien: 500, noiDung: "Doanh thu T1" });
    expect(ban.key).not.toBe(goc.key);
  });
});

describe("capNhat", () => {
  it("chỉ đổi dòng đúng key", () => {
    const a = dong({ soTien: 1 });
    const b = dong({ soTien: 2 });
    const sau = capNhat([a, b], b.key, { soTien: 99 });
    expect(sau[0].soTien).toBe(1);
    expect(sau[1].soTien).toBe(99);
  });
});

describe("apDungQuyChuan", () => {
  const quyChuan = [
    { nghiepVu: "Bán hàng", taiKhoanNo: "131", taiKhoanCo: "511", moTa: "Ghi nhận doanh thu" },
  ];

  it("điền TK Nợ/Có và diễn giải khi các ô còn trống", () => {
    const sau = apDungQuyChuan(dong(), "Bán hàng", quyChuan);
    expect(sau).toMatchObject({
      nghiepVu: "Bán hàng",
      taiKhoanNo: "131",
      taiKhoanCo: "511",
      noiDung: "Ghi nhận doanh thu",
    });
  });

  it("không ghi đè giá trị người dùng đã nhập", () => {
    const sau = apDungQuyChuan(
      dong({ taiKhoanNo: "111", noiDung: "Tự nhập" }),
      "Bán hàng",
      quyChuan,
    );
    expect(sau.taiKhoanNo).toBe("111");
    expect(sau.noiDung).toBe("Tự nhập");
    expect(sau.taiKhoanCo).toBe("511");
  });

  it("nghiệp vụ không có quy chuẩn thì chỉ gán nghiệp vụ", () => {
    const sau = apDungQuyChuan(dong(), "Khác", quyChuan);
    expect(sau.nghiepVu).toBe("Khác");
    expect(sau.taiKhoanNo).toBeUndefined();
  });
});

describe("loiCuaLo", () => {
  it("lô rỗng phải báo lỗi", () => {
    expect(loiCuaLo([])).toEqual(["Chưa có dòng kế hoạch nào"]);
  });

  it("nêu rõ số thứ tự dòng bị lỗi", () => {
    const loi = loiCuaLo([
      dong({ taiKhoanCo: "511", soTien: 100 }),
      dong({ soTien: 0, taiKhoanCo: "511" }),
    ]);
    expect(loi).toHaveLength(1);
    expect(loi[0]).toMatch(/^Dòng 2:/);
  });

  it("lô hợp lệ thì không có lỗi", () => {
    expect(loiCuaLo([dong({ taiKhoanCo: "511", soTien: 10 })])).toEqual([]);
  });
});

describe("toPayloads", () => {
  it("gắn loại kế hoạch và phiên bản cho mọi dòng", () => {
    const payloads = toPayloads(
      [dong({ taiKhoanCo: "511", soTien: 10 }), dong({ taiKhoanNo: "131", soTien: 20 })],
      lists,
      "KE_HOACH",
      "KH 2026",
    );
    expect(payloads).toHaveLength(2);
    expect(payloads.every((p) => p.loaiKeHoach === "KE_HOACH" && p.phienBan === "KH 2026")).toBe(true);
    expect(payloads[0].danhMuc?.taiKhoanCo?.ma).toBe("511");
  });
});

describe("locTheoGiaoDich / nghiepVuOptions", () => {
  const quyChuan = [
    { loaiGiaoDich: "Bán hàng", nghiepVu: "Ghi nhận doanh thu", taiKhoanNo: "131", taiKhoanCo: "511" },
    { loaiGiaoDich: "Bán hàng", nghiepVu: "Thu tiền khách hàng", taiKhoanNo: "111", taiKhoanCo: "131" },
    { loaiGiaoDich: "Lương & lao động", nghiepVu: "Ghi nhận lương phải trả", taiKhoanNo: "642", taiKhoanCo: "334" },
    // Bản ghi cũ chưa gắn loại giao dịch — không được biến mất khỏi danh sách đầy đủ.
    { loaiGiaoDich: "", nghiepVu: "Nghiệp vụ chưa phân loại", taiKhoanNo: "", taiKhoanCo: "" },
  ];

  it("bỏ trống giao dịch thì giữ nguyên toàn bộ nghiệp vụ", () => {
    expect(nghiepVuOptions(quyChuan, undefined).map((o) => o.value)).toEqual([
      "Ghi nhận doanh thu",
      "Ghi nhận lương phải trả",
      "Nghiệp vụ chưa phân loại",
      "Thu tiền khách hàng",
    ]);
  });

  it("chọn giao dịch thì chỉ còn nghiệp vụ của giao dịch đó", () => {
    expect(nghiepVuOptions(quyChuan, "Bán hàng").map((o) => o.value)).toEqual([
      "Ghi nhận doanh thu",
      "Thu tiền khách hàng",
    ]);
  });

  it("giao dịch không có nghiệp vụ nào thì trả danh sách rỗng, không âm thầm trả hết", () => {
    expect(nghiepVuOptions(quyChuan, "Kho vận")).toEqual([]);
  });

  it("một nghiệp vụ khai ở nhiều quy chuẩn chỉ hiện một lần", () => {
    const trung = [...quyChuan, { loaiGiaoDich: "Bán hàng", nghiepVu: "Ghi nhận doanh thu", taiKhoanNo: "131", taiKhoanCo: "5111" }];
    expect(nghiepVuOptions(trung, "Bán hàng")).toHaveLength(2);
  });

  it("danh sách giao dịch bỏ bản ghi chưa gắn loại", () => {
    expect(giaoDichOptions(quyChuan).map((o) => o.value)).toEqual([
      "Bán hàng",
      "Lương & lao động",
    ]);
  });
});
