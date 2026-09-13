import { describe, expect, it } from "vitest";
import {
  dungBangKqkd,
  giaTri,
  phanTramDS,
  tyTrong,
  type HangKqkd,
} from "./kqkdKeHoachRows";
import type { KqkdKeHoachReport } from "@/services/kqkdKeHoachService";

const m = (...v: number[]) => {
  const a = Array(12).fill(0);
  v.forEach((x, i) => (a[i] = x));
  return a;
};

const bc = (
  dong: KqkdKeHoachReport["dong"],
  them: Partial<KqkdKeHoachReport> = {},
): KqkdKeHoachReport => ({
  nam: 2026,
  dong,
  doanhThuThuanNam: 0,
  doanhThuThuanThang: Array(12).fill(0),
  dinhPhiThang: Array(12).fill(0),
  bienPhiThang: Array(12).fill(0),
  ...them,
});

const T1 = [0, 1] as const;
const Q1 = [0, 3] as const;
const NAM = [0, 12] as const;

const theoKey = (hang: HangKqkd[], key: string) =>
  hang.find((h) => h.key === key)!;

describe("dungBangKqkd", () => {
  it("nhãn dòng cấp 0 ghép số La Mã, dòng con giữ nguyên tên", () => {
    const hang = dungBangKqkd(
      bc([
        {
          key: "01",
          soLaMa: "I",
          ten: "DOANH THU",
          cap: 0,
          thang: m(10),
          con: [{ key: "01:N1", ten: "Nhóm 1", cap: 1, thang: m(6) }],
        },
      ]),
    );
    expect(hang[0].nhan).toBe("I. DOANH THU");
    expect(hang[0].children![0].nhan).toBe("Nhóm 1");
  });

  it("dòng không có số La Mã chỉ hiện tên", () => {
    const hang = dungBangKqkd(
      bc([{ key: "50", ten: "LỢI NHUẬN KHÁC", cap: 0, thang: m(1) }]),
    );
    expect(hang[0].nhan).toBe("LỢI NHUẬN KHÁC");
  });

  it("dòng con rỗng thì không gắn children — antd sẽ không vẽ nút mở", () => {
    const hang = dungBangKqkd(
      bc([{ key: "01", ten: "DOANH THU", cap: 0, thang: m(1), con: [] }]),
    );
    expect(hang[0].children).toBeUndefined();
  });

  it("dòng có mảng tháng ngắn hơn 12 coi như 0, không văng lỗi", () => {
    const hang = dungBangKqkd(
      bc([{ key: "01", ten: "DOANH THU", cap: 0, thang: [5, 5] }]),
    );
    expect(giaTri(hang[0], ...NAM)).toBe(10);
  });
});

describe("giaTri — cộng đúng khoảng tháng của từng kỳ", () => {
  const hang = dungBangKqkd(
    bc([{ key: "01", ten: "DOANH THU", cap: 0, thang: m(10, 20, 30, 40) }]),
  );

  it("tháng lấy đúng một tháng, quý là ba tháng, năm là mười hai tháng", () => {
    expect(giaTri(hang[0], ...T1)).toBe(10);
    expect(giaTri(hang[0], ...Q1)).toBe(60);
    expect(giaTri(hang[0], ...NAM)).toBe(100);
  });

  it("sáu tháng đầu là T1–T6, sáu tháng cuối là T7–T12", () => {
    expect(giaTri(hang[0], 0, 6)).toBe(100);
    expect(giaTri(hang[0], 6, 12)).toBe(0);
  });
});

describe("phanTramDS — chia cho doanh thu thuần CỦA CHÍNH KỲ", () => {
  const baoCao = bc(
    [{ key: "25", ten: "GIÁ VỐN", cap: 0, thang: m(100, 300) }],
    { doanhThuThuanThang: m(1000, 1000) },
  );
  const hang = dungBangKqkd(baoCao);

  it("mỗi kỳ một mẫu số riêng, không dùng doanh thu cả năm", () => {
    expect(phanTramDS(baoCao, hang[0], ...T1)).toBeCloseTo(0.1);
    expect(phanTramDS(baoCao, hang[0], 1, 2)).toBeCloseTo(0.3);
    expect(phanTramDS(baoCao, hang[0], ...NAM)).toBeCloseTo(0.2);
  });

  it("kỳ chưa có doanh thu thì không chia được", () => {
    expect(phanTramDS(baoCao, hang[0], 5, 6)).toBeNull();
  });
});

describe("tyTrong — tỷ lệ trên dòng cha", () => {
  const hang = dungBangKqkd(
    bc([
      {
        key: "25",
        ten: "GIÁ VỐN",
        cap: 0,
        thang: m(1000),
        con: [
          { key: "25:CD", ten: "Cố định", cap: 1, thang: m(250) },
          { key: "25:BD", ten: "Biến đổi", cap: 1, thang: m(750) },
        ],
      },
      { key: "02", ten: "CÁC KHOẢN GIẢM TRỪ", cap: 0, thang: m(0) },
    ]),
  );

  it("dòng con cộng lại đúng 100% của dòng cha", () => {
    const [cd, bd] = theoKey(hang, "25").children!;
    expect(tyTrong(cd, ...T1)).toBeCloseTo(0.25);
    expect(tyTrong(bd, ...T1)).toBeCloseTo(0.75);
  });

  it("dòng mục La Mã là gốc của nhóm nên bằng 100%", () => {
    expect(tyTrong(theoKey(hang, "25"), ...T1)).toBe(1);
  });

  it("dòng KHÔNG PHÁT SINH để trống chứ không phải 100%", () => {
    expect(tyTrong(theoKey(hang, "02"), ...T1)).toBeNull();
  });

  it("dòng hòa vốn đứng ngoài mọi nhóm nên không có tỷ trọng", () => {
    expect(tyTrong(hang.at(-1)!, ...NAM)).toBeNull();
  });
});

describe("dòng DOANH THU HÒA VỐN", () => {
  const baoCao = bc([], {
    doanhThuThuanThang: m(1000, 1000),
    dinhPhiThang: m(40, 40),
    bienPhiThang: m(600, 900),
  });
  const hang = dungBangKqkd(baoCao);

  it("là dòng cuối cùng của bảng, cấp 0, không có dòng con", () => {
    const hv = hang.at(-1)!;
    expect(hv.key).toBe("HOA_VON");
    expect(hv.nhan).toBe("DOANH THU HÒA VỐN");
    expect(hv.cap).toBe(0);
    expect(hv.children).toBeUndefined();
  });

  it("áp đúng công thức định phí / (1 − biến phí / doanh thu)", () => {
    // T1: 40 / (1 − 600/1000) = 100.
    expect(giaTri(hang.at(-1)!, ...T1)).toBeCloseTo(100, 6);
  });

  it("mỗi cột tính lại từ số của chính kỳ đó, KHÔNG cộng dồn 12 tháng", () => {
    const hv = hang.at(-1)!;
    const t1 = giaTri(hv, ...T1); // 100
    const t2 = giaTri(hv, 1, 2); // 40 / (1 − 900/1000) = 400
    const q1 = giaTri(hv, ...Q1); // 80 / (1 − 1500/2000) = 320
    expect(t2).toBeCloseTo(400, 6);
    expect(q1).toBeCloseTo(320, 6);
    expect(q1).not.toBe(t1 + t2);
  });

  it("doanh thu bằng 0 thì trả 0 — không chia cho 0, không ra Infinity", () => {
    const rong = dungBangKqkd(bc([], { dinhPhiThang: m(40) }));
    expect(giaTri(rong.at(-1)!, ...T1)).toBe(0);
  });

  it("biến phí ăn hết doanh thu thì trả 0 — không ra số âm đánh lừa", () => {
    const het = dungBangKqkd(
      bc([], {
        doanhThuThuanThang: m(1000),
        dinhPhiThang: m(40),
        bienPhiThang: m(1200),
      }),
    );
    expect(giaTri(het.at(-1)!, ...T1)).toBe(0);
  });
});
