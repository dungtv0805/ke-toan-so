import { describe, it, expect } from "vitest";
import { tinhTinhHinhThucHien } from "./tinhHinhThucHien";

const diem = (thang: number, doanhThu: number, chiPhi: number) => ({
  thang,
  doanhThu,
  chiPhi,
  loiNhuan: doanhThu - chiPhi,
});

describe("tinhTinhHinhThucHien", () => {
  it("cộng dồn cả kỳ rồi so kế hoạch với thực hiện", () => {
    const ketQua = tinhTinhHinhThucHien(
      [diem(1, 100, 60), diem(2, 100, 40)],
      [diem(1, 80, 50), diem(2, 40, 30)],
    );
    expect(ketQua.doanhThu).toMatchObject({
      keHoach: 200,
      thucHien: 120,
      chenhLech: -80,
      tyLeDat: 60,
    });
    expect(ketQua.chiPhi).toMatchObject({ keHoach: 100, thucHien: 80, tyLeDat: 80 });
    expect(ketQua.loiNhuan).toMatchObject({ keHoach: 100, thucHien: 40, tyLeDat: 40 });
  });

  it("chưa có kế hoạch thì tỷ lệ đạt là 0 và cờ chuaCoKeHoach bật", () => {
    const ketQua = tinhTinhHinhThucHien([], [diem(1, 50, 20)]);
    expect(ketQua.doanhThu).toMatchObject({ keHoach: 0, thucHien: 50, tyLeDat: 0 });
    expect(ketQua.doanhThu.chuaCoKeHoach).toBe(true);
  });

  it("có kế hoạch thì cờ chuaCoKeHoach tắt", () => {
    const ketQua = tinhTinhHinhThucHien([diem(1, 10, 0)], []);
    expect(ketQua.doanhThu.chuaCoKeHoach).toBe(false);
  });

  it("lợi nhuận kế hoạch âm vẫn tính được tỷ lệ (không chia 0)", () => {
    const ketQua = tinhTinhHinhThucHien([diem(1, 50, 100)], [diem(1, 40, 60)]);
    expect(ketQua.loiNhuan.keHoach).toBe(-50);
    expect(ketQua.loiNhuan.thucHien).toBe(-20);
    expect(ketQua.loiNhuan.tyLeDat).toBe(40);
  });

  it("thiếu tháng ở một phía vẫn cộng đúng phần còn lại", () => {
    const ketQua = tinhTinhHinhThucHien([diem(1, 100, 0)], [diem(1, 30, 0), diem(2, 20, 0)]);
    expect(ketQua.doanhThu.thucHien).toBe(50);
  });
});
