import { describe, expect, it } from "vitest";
import {
  demThayDoi,
  gopNhap,
  laKhacNhau,
  tamId,
  type DongNhap,
} from "./nhapBang";

interface Val {
  luong: number;
  thang: number[];
}

const goc: { id: string; val: Val }[] = [
  { id: "a", val: { luong: 1, thang: [1, 2] } },
  { id: "b", val: { luong: 2, thang: [3] } },
];

describe("laKhacNhau", () => {
  it("hai giá trị giống hệt thì không tính là đổi", () => {
    expect(laKhacNhau({ luong: 1, thang: [1, 2] }, { luong: 1, thang: [1, 2] })).toBe(
      false,
    );
  });

  it("đổi số vô hướng thì tính là đổi", () => {
    expect(laKhacNhau({ luong: 1, thang: [1] }, { luong: 9, thang: [1] })).toBe(true);
  });

  it("đổi một phần tử trong mảng tháng thì tính là đổi", () => {
    expect(laKhacNhau({ luong: 1, thang: [1, 2] }, { luong: 1, thang: [1, 9] })).toBe(
      true,
    );
  });

  it("gõ rồi gõ trả lại như cũ thì không còn tính là đổi", () => {
    expect(laKhacNhau({ luong: 5, thang: [] }, { luong: 5, thang: [] })).toBe(false);
  });
});

describe("gopNhap", () => {
  it("không nháp gì thì trả nguyên bản đã lưu", () => {
    const kq = gopNhap(goc, {}, []);
    expect(kq.map((r) => r.id)).toEqual(["a", "b"]);
    expect(kq.every((r) => !r.tam && !r.doi)).toBe(true);
  });

  it("ô đang gõ thì lấy giá trị nháp, không lấy giá trị đã lưu", () => {
    const kq = gopNhap(goc, { a: { luong: 99, thang: [1, 2] } }, []);
    expect(kq[0].val.luong).toBe(99);
    expect(kq[0].doi).toBe(true);
    expect(kq[1].doi).toBe(false);
  });

  it("gõ trả về đúng giá trị cũ thì không còn đánh dấu đã đổi", () => {
    const kq = gopNhap(goc, { a: { luong: 1, thang: [1, 2] } }, []);
    expect(kq[0].doi).toBe(false);
  });

  it("dòng mới nối vào cuối và được đánh dấu tạm", () => {
    const moi: DongNhap<Val>[] = [{ id: "tam-1", val: { luong: 7, thang: [] } }];
    const kq = gopNhap(goc, {}, moi);
    expect(kq).toHaveLength(3);
    expect(kq[2].id).toBe("tam-1");
    expect(kq[2].tam).toBe(true);
  });

  it("giữ lại bản gốc để so khi lưu", () => {
    const kq = gopNhap(goc, { a: { luong: 99, thang: [1, 2] } }, []);
    expect(kq[0].goc).toEqual({ luong: 1, thang: [1, 2] });
    expect(kq[2]).toBeUndefined();
  });
});

describe("demThayDoi", () => {
  it("chưa đụng gì thì đếm bằng 0", () => {
    expect(demThayDoi(goc, {}, [])).toBe(0);
  });

  it("đếm cả dòng sửa lẫn dòng mới", () => {
    expect(
      demThayDoi(goc, { a: { luong: 99, thang: [1, 2] } }, [
        { id: "tam-1", val: { luong: 0, thang: [] } },
      ]),
    ).toBe(2);
  });

  it("dòng gõ rồi trả lại như cũ KHÔNG bị đếm", () => {
    expect(demThayDoi(goc, { a: { luong: 1, thang: [1, 2] } }, [])).toBe(0);
  });
});

describe("tamId", () => {
  it("sinh khoá khác nhau mỗi lần", () => {
    expect(tamId()).not.toBe(tamId());
  });

  it("khoá tạm phân biệt được với id thật của MongoDB", () => {
    expect(tamId().startsWith("tam-")).toBe(true);
  });
});
