import { describe, it, expect } from "vitest";

import { gomTheoNhom, laDongNhom, laKhoaNhom, NHOM_KEY_PREFIX, type MucNhom } from "./gomNhom";

interface BanGhi {
  id: string;
  loaiGiaoDich: string;
}

const qc = (id: string, loaiGiaoDich: string): BanGhi => ({ id, loaiGiaoDich });

const gom = (list: BanGhi[], danhMuc: MucNhom[]) =>
  gomTheoNhom(list, {
    layMa: (x) => x.loaiGiaoDich,
    danhMuc,
    nhanTrong: "(Chưa gán loại giao dịch)",
  });

const DANH_MUC: MucNhom[] = [
  { ma: "PHIEU_THU", ten: "Phiếu thu", color: "green" },
  { ma: "PHIEU_CHI", ten: "Phiếu chi", color: "red" },
  { ma: "BAO_CO", ten: "Báo có" },
];

describe("gomTheoNhom", () => {
  it("gom đúng cấp 1 loại giao dịch, cấp 2 quy chuẩn", () => {
    const rows = gom(
      [qc("a", "PHIEU_THU"), qc("b", "PHIEU_CHI"), qc("c", "PHIEU_THU")],
      DANH_MUC
    );

    expect(rows).toHaveLength(2);
    expect(rows.every(laDongNhom)).toBe(true);
    expect(rows.map((r) => (laDongNhom(r) ? r.ten : ""))).toEqual([
      "Phiếu thu",
      "Phiếu chi",
    ]);
    const thu = rows[0];
    if (!laDongNhom(thu)) throw new Error("phải là dòng nhóm");
    expect(thu.children.map((c) => c.id)).toEqual(["a", "c"]);
    expect(thu.soLuong).toBe(2);
    expect(thu.color).toBe("green");
  });

  it("KHÔNG đẻ nhóm rỗng cho loại giao dịch không có dữ liệu trong trang", () => {
    const rows = gom([qc("a", "PHIEU_THU")], DANH_MUC);

    expect(rows).toHaveLength(1);
    expect(laDongNhom(rows[0]) && rows[0].ma).toBe("PHIEU_THU");
  });

  it("giữ thứ tự danh mục, không sắp theo lượng hay A-Z", () => {
    const rows = gom(
      [qc("a", "BAO_CO"), qc("b", "PHIEU_CHI"), qc("c", "PHIEU_THU")],
      DANH_MUC
    );

    expect(rows.map((r) => (laDongNhom(r) ? r.ma : ""))).toEqual([
      "PHIEU_THU",
      "PHIEU_CHI",
      "BAO_CO",
    ]);
  });

  it("loại giao dịch lạ (không có trong danh mục) vẫn hiện, xếp cuối", () => {
    const rows = gom([qc("a", "LA_HOAC"), qc("b", "PHIEU_THU")], DANH_MUC);

    expect(rows.map((r) => (laDongNhom(r) ? r.ma : ""))).toEqual(["PHIEU_THU", "LA_HOAC"]);
    // Không có nhãn thì lấy chính mã, không được để trống.
    expect(laDongNhom(rows[1]) && rows[1].ten).toBe("LA_HOAC");
  });

  it("bản ghi chưa gán loại giao dịch vẫn xuất hiện", () => {
    const rows = gom([qc("a", "")], DANH_MUC);

    expect(rows).toHaveLength(1);
    expect(laDongNhom(rows[0]) && rows[0].ten).toBe("(Chưa gán loại giao dịch)");
    expect(laDongNhom(rows[0]) && rows[0].children.map((c) => c.id)).toEqual(["a"]);
  });

  it("danh sách rỗng → không dòng nào", () => {
    expect(gom([], DANH_MUC)).toEqual([]);
  });

  it("danh mục chưa tải xong vẫn gom được theo mã", () => {
    const rows = gom([qc("a", "PHIEU_THU"), qc("b", "PHIEU_THU")], []);

    expect(rows).toHaveLength(1);
    expect(laDongNhom(rows[0]) && rows[0].ten).toBe("PHIEU_THU");
  });

  it("khoá dòng nhóm phân biệt được với id quy chuẩn", () => {
    const rows = gom([qc("a", "PHIEU_THU")], DANH_MUC);

    expect(rows[0].id).toBe(`${NHOM_KEY_PREFIX}PHIEU_THU`);
    expect(laKhoaNhom(rows[0].id)).toBe(true);
    expect(laKhoaNhom("a")).toBe(false);
  });
});
