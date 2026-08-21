import { describe, expect, it } from "vitest";
import { dungBangKqkd } from "./kqkdKeHoachRows";
import type { KqkdKeHoachReport } from "@/services/kqkdKeHoachService";

const thang = (...v: number[]) =>
  Array.from({ length: 12 }, (_, i) => v[i] ?? 0);

const baoCao = (
  dong: KqkdKeHoachReport["dong"],
  doanhThuThuanNam = 0,
): KqkdKeHoachReport => ({ nam: 2026, dong, doanhThuThuanNam });

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
