import { describe, expect, it } from "vitest";
import { dungBangKqkd } from "./kqkdKeHoachRows";
import type { KqkdKeHoachReport } from "@/services/kqkdKeHoachService";

const thang = (...v: number[]) =>
  Array.from({ length: 12 }, (_, i) => v[i] ?? 0);

const baoCao = (
  dong: KqkdKeHoachReport["dong"],
  doanhThuThuanNam = 0,
  hoaVon: Partial<
    Pick<
      KqkdKeHoachReport,
      "doanhThuThuanThang" | "dinhPhiThang" | "bienPhiThang"
    >
  > = {},
): KqkdKeHoachReport => ({
  nam: 2026,
  dong,
  doanhThuThuanNam,
  doanhThuThuanThang: thang(),
  dinhPhiThang: thang(),
  bienPhiThang: thang(),
  ...hoaVon,
});

/** Dòng hòa vốn luôn là dòng cuối bảng. */
const dongHoaVon = (r: KqkdKeHoachReport) => dungBangKqkd(r).at(-1)!;

describe("dungBangKqkd", () => {
  it("quý là tổng đúng ba tháng của quý đó", () => {
    const [hang] = dungBangKqkd(
      baoCao([
        { key: "01", ten: "DOANH THU", cap: 0, thang: thang(1, 2, 3, 10, 0, 0, 0, 0, 0, 0, 0, 100) },
      ]),
    );
    expect(hang.quy).toEqual([6, 10, 0, 100]);
  });

  it("sáu tháng đầu là T1–T6, sáu tháng cuối là T7–T12", () => {
    const [hang] = dungBangKqkd(
      baoCao([
        { key: "01", ten: "DOANH THU", cap: 0, thang: thang(1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2) },
      ]),
    );
    expect(hang.sauThangDau).toBe(6);
    expect(hang.sauThangCuoi).toBe(12);
    expect(hang.nam).toBe(18);
  });

  it("phần trăm chia cho doanh thu thuần cả năm", () => {
    const [hang] = dungBangKqkd(
      baoCao(
        [{ key: "20", ten: "LỢI NHUẬN GỘP", cap: 0, thang: thang(250) }],
        1000,
      ),
    );
    expect(hang.phanTram).toBeCloseTo(0.25);
  });

  it("doanh thu thuần bằng 0 thì phần trăm là null, không chia cho 0", () => {
    const [hang] = dungBangKqkd(
      baoCao([{ key: "20", ten: "LỢI NHUẬN GỘP", cap: 0, thang: thang(250) }], 0),
    );
    expect(hang.phanTram).toBeNull();
  });

  it("nhãn dòng cấp 0 ghép số La Mã, dòng con giữ nguyên tên", () => {
    const [hang] = dungBangKqkd(
      baoCao([
        {
          key: "01",
          soLaMa: "I",
          ten: "DOANH THU",
          cap: 0,
          thang: thang(10),
          con: [{ key: "01:N1", ten: "Nội thất", cap: 1, thang: thang(10) }],
        },
      ]),
    );
    expect(hang.nhan).toBe("I. DOANH THU");
    expect(hang.children![0].nhan).toBe("Nội thất");
  });

  it("dòng không có số La Mã chỉ hiện tên", () => {
    const [hang] = dungBangKqkd(
      baoCao([{ key: "31", ten: "THU NHẬP KHÁC", cap: 0, thang: thang(5) }]),
    );
    expect(hang.nhan).toBe("THU NHẬP KHÁC");
  });

  it("dòng có mảng tháng ngắn hơn 12 coi như 0, không văng lỗi", () => {
    const [hang] = dungBangKqkd(
      baoCao([{ key: "01", ten: "DOANH THU", cap: 0, thang: [5, 5] }]),
    );
    expect(hang.nam).toBe(10);
    expect(hang.quy).toEqual([10, 0, 0, 0]);
  });

  it("dòng con rỗng thì không gắn children — antd sẽ không vẽ nút mở", () => {
    const [hang] = dungBangKqkd(
      baoCao([{ key: "21", ten: "DOANH THU TÀI CHÍNH", cap: 0, thang: thang(1), con: [] }]),
    );
    expect(hang.children).toBeUndefined();
  });
});

describe("dòng DOANH THU HÒA VỐN", () => {
  it("là dòng cuối cùng của bảng, cấp 0, không có dòng con", () => {
    const bang = dungBangKqkd(
      baoCao([{ key: "01", ten: "DOANH THU", cap: 0, thang: thang(10) }]),
    );
    const cuoi = bang.at(-1)!;
    expect(bang).toHaveLength(2);
    expect(cuoi.key).toBe("HOA_VON");
    expect(cuoi.nhan).toBe("DOANH THU HÒA VỐN");
    expect(cuoi.cap).toBe(0);
    expect(cuoi.children).toBeUndefined();
  });

  it("áp đúng công thức định phí / (1 − biến phí / doanh thu)", () => {
    // T1: DT 1000, biến phí 600 -> tỷ lệ số dư đảm phí 0.4; định phí 200 -> 500.
    const hv = dongHoaVon(
      baoCao([], 1000, {
        doanhThuThuanThang: thang(1000),
        bienPhiThang: thang(600),
        dinhPhiThang: thang(200),
      }),
    );
    expect(hv.thang[0]).toBeCloseTo(500);
    expect(hv.nam).toBeCloseTo(500);
  });

  it("mỗi cột tính lại từ số của chính kỳ đó, KHÔNG cộng dồn 12 tháng", () => {
    // Hai tháng giống hệt nhau: hòa vốn từng tháng 500, cả năm 1000 (không phải
    // 500 vì tử số cộng đôi, cũng không phải tổng 12 ô tháng = 1000 tình cờ ở
    // đây — quý 1 mới là chỗ phân biệt rõ).
    const hv = dongHoaVon(
      baoCao([], 2000, {
        doanhThuThuanThang: thang(1000, 1000),
        bienPhiThang: thang(600, 600),
        dinhPhiThang: thang(200, 200),
      }),
    );
    expect(hv.thang[0]).toBeCloseTo(500);
    expect(hv.thang[1]).toBeCloseTo(500);
    expect(hv.quy[0]).toBeCloseTo(1000); // 400 / 0.4
    expect(hv.sauThangDau).toBeCloseTo(1000);
    expect(hv.sauThangCuoi).toBe(0);
  });

  it("tỷ lệ định phí/biến phí lệch nhau giữa các tháng thì hòa vốn năm không bằng tổng tháng", () => {
    const hv = dongHoaVon(
      baoCao([], 1200, {
        doanhThuThuanThang: thang(1000, 200),
        bienPhiThang: thang(500, 180),
        dinhPhiThang: thang(100, 100),
      }),
    );
    expect(hv.thang[0]).toBeCloseTo(200); // 100 / 0.5
    expect(hv.thang[1]).toBeCloseTo(1000); // 100 / 0.1
    // Năm: định phí 200, biến phí 680, DT 1200 -> 200 / (1 − 680/1200)
    expect(hv.nam).toBeCloseTo(461.538, 2);
    expect(hv.nam).not.toBeCloseTo(1200); // tổng hai ô tháng
  });

  it("doanh thu bằng 0 thì trả 0 — không chia cho 0, không ra Infinity", () => {
    const hv = dongHoaVon(baoCao([], 0, { dinhPhiThang: thang(200) }));
    expect(hv.thang[0]).toBe(0);
    expect(hv.nam).toBe(0);
    expect(hv.phanTram).toBeNull();
  });

  it("biến phí ăn hết doanh thu thì trả 0 — không ra số âm đánh lừa", () => {
    const hv = dongHoaVon(
      baoCao([], 1000, {
        doanhThuThuanThang: thang(1000),
        bienPhiThang: thang(1200),
        dinhPhiThang: thang(200),
      }),
    );
    expect(hv.thang[0]).toBe(0);
    expect(hv.nam).toBe(0);
  });

  it("phần trăm là hòa vốn năm trên doanh thu thuần năm", () => {
    const hv = dongHoaVon(
      baoCao([], 1000, {
        doanhThuThuanThang: thang(1000),
        bienPhiThang: thang(600),
        dinhPhiThang: thang(200),
      }),
    );
    expect(hv.phanTram).toBeCloseTo(0.5); // 500 / 1000
  });
});
