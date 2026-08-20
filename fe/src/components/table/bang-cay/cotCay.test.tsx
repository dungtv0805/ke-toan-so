import { describe, it, expect, vi } from "vitest";
import type { ColumnsType } from "antd/es/table";
import { dungCotCay } from "./cotCay";
import { gomTheoNhom, type NhomRow } from "./gomNhom";

const TUY_CHON = { donVi: "quy chuẩn", cotChoXuongDong: ["nghiepVu"] };

interface BanGhi {
  id: string;
  loaiGiaoDich: string;
  nghiepVu: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
}

const COT: ColumnsType<BanGhi> = [
  { title: "Nghiệp vụ", dataIndex: "nghiepVu", key: "nghiepVu", width: 220 },
  { title: "TK Nợ", dataIndex: "taiKhoanNo", key: "taiKhoanNo" },
  { title: "TK Có", dataIndex: "taiKhoanCo", key: "taiKhoanCo" },
];

const qc: BanGhi = {
  id: "a",
  loaiGiaoDich: "PHIEU_THU",
  nghiepVu: "Thu tiền bán hàng",
  taiKhoanNo: "111",
  taiKhoanCo: "511",
};

const nhom = gomTheoNhom([qc], {
  layMa: (x) => x.loaiGiaoDich,
  danhMuc: [{ ma: "PHIEU_THU", ten: "Phiếu thu", color: "green" }],
})[0] as NhomRow<BanGhi>;

/** onCell của cột thứ i khi gặp record. */
const cell = (i: number, record: Parameters<NonNullable<ReturnType<typeof dungCotCay>[number]["onCell"]>>[0]) => {
  const cot = dungCotCay(COT, TUY_CHON);
  const onCell = cot[i].onCell as (r: typeof record) => { colSpan?: number };
  return onCell(record);
};

describe("dungCotCay", () => {
  it("dòng nhóm chiếm trọn chiều ngang: cột đầu gộp hết, cột sau biến mất", () => {
    expect(cell(0, nhom)).toEqual({ colSpan: COT.length });
    expect(cell(1, nhom)).toEqual({ colSpan: 0 });
    expect(cell(2, nhom)).toEqual({ colSpan: 0 });
  });

  it("dòng con giữ nguyên từng cột, không bị gộp", () => {
    expect(cell(0, qc)).toEqual({});
    expect(cell(1, qc)).toEqual({});
  });

  it("cột Nghiệp vụ cho xuống dòng để đọc đủ chữ, cột còn lại cắt gọn", () => {
    const cot = dungCotCay(COT, TUY_CHON);
    expect(cot[0].ellipsis).toBe(false);
    expect(cot.slice(1).every((c) => c.ellipsis === true)).toBe(true);
  });

  it("dòng nhóm chỉ vẽ nội dung ở cột đầu", () => {
    const cot = dungCotCay(COT, TUY_CHON);
    const ve = (i: number) =>
      (cot[i].render as (v: unknown, r: unknown, idx: number) => unknown)(undefined, nhom, 0);
    expect(ve(0)).not.toBeNull();
    expect(ve(1)).toBeNull();
    expect(ve(2)).toBeNull();
  });

  it("dòng con vẫn dùng render gốc của cột", () => {
    const goc = vi.fn(() => "đã vẽ");
    const cot = dungCotCay([{ ...COT[0], render: goc }], TUY_CHON);
    const ra = (cot[0].render as (v: unknown, r: unknown, i: number) => unknown)("x", qc, 3);
    expect(ra).toBe("đã vẽ");
    expect(goc).toHaveBeenCalledWith("x", qc, 3);
  });

  it("cột không có render thì dòng con hiện thẳng giá trị", () => {
    const cot = dungCotCay(COT, TUY_CHON);
    const ra = (cot[0].render as (v: unknown, r: unknown, i: number) => unknown)("Thu tiền", qc, 0);
    expect(ra).toBe("Thu tiền");
  });
});

describe("cột đầu của bảng cây", () => {
  it("KHÔNG cắt gọn — nó còn phải chứa icon thu gọn và phần thụt lề", () => {
    // "C…" thay cho mã "CP001" là bảng vô dụng: không đọc được mã thì tra vào đâu.
    const cot = dungCotCay(COT, { donVi: "khoản mục" });
    expect(cot[0].ellipsis).toBe(false);
    expect(cot[1].ellipsis).toBe(true);
  });

  it("được nới thêm chỗ cho icon thu gọn, cột sau giữ nguyên bề rộng", () => {
    const cot = dungCotCay(
      [
        { title: "Mã", key: "ma", width: 100 },
        { title: "Tên", key: "ten", width: 200 },
      ],
      { donVi: "khoản mục" }
    );
    expect(cot[0].width).toBeGreaterThan(100);
    expect(cot[1].width).toBe(200);
  });

  it("cột đầu không khai bề rộng thì để nguyên, không tự bịa số", () => {
    const cot = dungCotCay([{ title: "Tên", key: "ten" }], { donVi: "x" });
    expect(cot[0].width).toBeUndefined();
  });
});
