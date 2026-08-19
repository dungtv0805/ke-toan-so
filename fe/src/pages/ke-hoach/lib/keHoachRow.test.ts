import { describe, it, expect } from "vitest";
import {
  buildDanhMuc,
  loiCuaDong,
  nhomKhoanMucCua,
  toPayload,
  toRowValues,
  type DanhMucLists,
} from "./keHoachRow";
import type { KeHoachDong } from "@/services/keHoachService";

const lists: DanhMucLists = {
  taiKhoanList: [
    { ma: "511", ten: "Doanh thu bán hàng", loai: "DOANH_THU", nhom: "5" },
    { ma: "642", ten: "Chi phí QLDN", loai: "CHI_PHI", nhom: "6" },
  ],
  doiTuongList: [
    { ma: "KH01", ten: "Công ty A", loai: ["KHACH_HANG"] },
    { ma: "NV01", ten: "Nguyễn Văn B", loai: ["NHAN_VIEN"] },
  ],
  duAnList: [
    { ma: "DA01", ten: "Dự án A", trangThai: "DANG_THUC_HIEN", chuDuAnMa: "CDT1", chuDuAn: "Chủ đầu tư 1" },
  ],
  boPhanList: [
    { ma: "BP01", ten: "Phòng kinh doanh" },
    { ma: "DOI1", ten: "Đội 1" },
  ],
  sanPhamList: [{ ma: "SP01", ten: "Sản phẩm 1" }],
  dongTienList: [{ ma: "DT01", ten: "Thu bán hàng", loai: "THU" }],
  khoanMucList: [{ ma: "KM01", ten: "Doanh thu dịch vụ", loai: "DOANH_THU", nhom: "NKM1" }],
  nhomQuanLyList: [{ ma: "NQL1", ten: "Khối kinh doanh" }],
  chuDauTuList: [{ ma: "CDT1", ten: "Chủ đầu tư 1" }],
  nhomKhoanMucList: [{ id: "id-nkm1", ma: "NKM1", ten: "Nhóm doanh thu" }],
};

describe("buildDanhMuc", () => {
  it("dựng snapshot tài khoản theo mã", () => {
    const dm = buildDanhMuc({ taiKhoanNo: "642", taiKhoanCo: "511" }, lists);
    expect(dm.taiKhoanNo).toMatchObject({ ma: "642", ten: "Chi phí QLDN" });
    expect(dm.taiKhoanCo).toMatchObject({ ma: "511", ten: "Doanh thu bán hàng" });
  });

  it("dự án kéo theo chủ đầu tư của chính nó", () => {
    const dm = buildDanhMuc({ duAn: "DA01" }, lists);
    expect(dm.duAn).toMatchObject({ ma: "DA01", chuDauTuMa: "CDT1", chuDauTuTen: "Chủ đầu tư 1" });
  });

  it("chủ đầu tư chọn tay vẫn được giữ riêng", () => {
    const dm = buildDanhMuc({ chuDauTu: "CDT1" }, lists);
    expect(dm.chuDauTu).toMatchObject({ ma: "CDT1", ten: "Chủ đầu tư 1" });
  });

  it("đội lấy từ danh mục bộ phận, nhân viên lấy từ danh mục đối tượng", () => {
    const dm = buildDanhMuc({ doi: "DOI1", nhanVien: "NV01" }, lists);
    expect(dm.doi).toMatchObject({ ma: "DOI1", ten: "Đội 1" });
    expect(dm.nhanVien).toMatchObject({ ma: "NV01", ten: "Nguyễn Văn B" });
  });

  it("nghiệp vụ lưu thẳng tên đã chọn làm cả mã lẫn tên", () => {
    expect(buildDanhMuc({ nghiepVu: "Bán hàng" }, lists).nghiepVu).toEqual({
      ma: "Bán hàng",
      ten: "Bán hàng",
    });
  });

  it("mã không có trong danh mục thì bỏ trống thay vì dựng snapshot rỗng", () => {
    expect(buildDanhMuc({ taiKhoanNo: "999" }, lists).taiKhoanNo).toBeUndefined();
  });

  it("bỏ chọn một chiều thì chiều đó biến mất khỏi danh mục", () => {
    expect(buildDanhMuc({ duAn: undefined }, lists).duAn).toBeUndefined();
  });
});

describe("toRowValues", () => {
  it("đọc ngược danh mục về giá trị phẳng theo mã", () => {
    const dong = {
      id: "1",
      loaiKeHoach: "KE_HOACH",
      phienBan: "Mặc định",
      ngay: "2026-03-01T00:00:00.000Z",
      soTien: 1000,
      noiDung: "Doanh thu tháng 3",
      danhMuc: {
        taiKhoanCo: { ma: "511", ten: "Doanh thu bán hàng", loai: "", nhom: "" },
        duAn: { ma: "DA01", ten: "Dự án A", trangThai: "" },
        khoanMuc: { ma: "KM01", ten: "Doanh thu dịch vụ", loai: "", nhom: "NKM1" },
      },
    } as unknown as KeHoachDong;

    expect(toRowValues(dong)).toMatchObject({
      soTien: 1000,
      noiDung: "Doanh thu tháng 3",
      taiKhoanCo: "511",
      duAn: "DA01",
      khoanMuc: "KM01",
    });
  });

  it("đi vòng buildDanhMuc → toRowValues giữ nguyên các chiều", () => {
    const values = { taiKhoanNo: "642", duAn: "DA01", nhanVien: "NV01", nghiepVu: "Chi phí" };
    const dm = buildDanhMuc(values, lists);
    const lai = toRowValues({ danhMuc: dm } as KeHoachDong);
    expect(lai).toMatchObject(values);
  });
});

describe("nhomKhoanMucCua", () => {
  it("suy nhóm khoản mục từ khoản mục đã chọn", () => {
    const dm = buildDanhMuc({ khoanMuc: "KM01" }, lists);
    expect(nhomKhoanMucCua(dm, lists.nhomKhoanMucList)).toBe("Nhóm doanh thu");
  });

  it("không chọn khoản mục thì để trống", () => {
    expect(nhomKhoanMucCua({}, lists.nhomKhoanMucList)).toBe("");
  });

  it("nhóm không có trong danh mục thì hiện thẳng giá trị đang lưu", () => {
    const dm = { khoanMuc: { ma: "KM09", ten: "Khác", loai: "", nhom: "NKM-LA" } };
    expect(nhomKhoanMucCua(dm, lists.nhomKhoanMucList)).toBe("NKM-LA");
  });
});

describe("loiCuaDong", () => {
  it("thiếu ngày thì báo lỗi", () => {
    expect(loiCuaDong({ soTien: 10, taiKhoanNo: "642" })).toMatch(/ngày/i);
  });

  it("số tiền phải lớn hơn 0", () => {
    expect(loiCuaDong({ ngay: "2026-01-01", soTien: 0, taiKhoanNo: "642" })).toMatch(/số tiền/i);
  });

  it("phải có ít nhất một tài khoản", () => {
    expect(loiCuaDong({ ngay: "2026-01-01", soTien: 10 })).toMatch(/tài khoản/i);
  });

  it("đủ điều kiện thì không có lỗi", () => {
    expect(loiCuaDong({ ngay: "2026-01-01", soTien: 10, taiKhoanCo: "511" })).toBeNull();
  });
});

describe("toPayload", () => {
  it("gắn loại kế hoạch và phiên bản đang chọn", () => {
    const payload = toPayload(
      { ngay: "2026-01-01", soTien: 10, noiDung: "x", taiKhoanCo: "511" },
      lists,
      "DU_BAO",
      "KH 2026 gốc",
    );
    expect(payload).toMatchObject({
      loaiKeHoach: "DU_BAO",
      phienBan: "KH 2026 gốc",
      soTien: 10,
      noiDung: "x",
    });
    expect(payload.danhMuc?.taiKhoanCo?.ma).toBe("511");
  });

  it("diễn giải bỏ trống vẫn gửi được (chuỗi rỗng)", () => {
    expect(toPayload({ ngay: "2026-01-01", soTien: 10 }, lists, "KE_HOACH").noiDung).toBe("");
  });
});
