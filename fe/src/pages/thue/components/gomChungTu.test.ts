import { describe, expect, it } from "vitest";
import { gomChungTuTheoSoPhieu, xepGoiY } from "./gomChungTu";

describe("gomChungTuTheoSoPhieu", () => {
  it("gom nhiều bút toán cùng số phiếu thành 1 dòng, cộng đúng tổng tiền", () => {
    const result = gomChungTuTheoSoPhieu([
      { soPhieu: "PC001", ngay: "2026-08-01", dienGiai: "Mua văn phòng phẩm", soTien: 100_000 },
      { soPhieu: "PC001", ngay: "2026-08-01", dienGiai: "Mua văn phòng phẩm", soTien: 200_000 },
      { soPhieu: "PC001", ngay: "2026-08-01", dienGiai: "Mua văn phòng phẩm", soTien: 50_000 },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      soPhieu: "PC001",
      ngay: "2026-08-01",
      dienGiai: "Mua văn phòng phẩm",
      soTien: 350_000,
      soButToan: 3,
    });
  });

  it("mỗi bút toán một số phiếu khác nhau → giữ nguyên số dòng, soButToan = 1", () => {
    const result = gomChungTuTheoSoPhieu([
      { soPhieu: "PC001", ngay: "2026-08-01", dienGiai: "A", soTien: 100_000 },
      { soPhieu: "PC002", ngay: "2026-08-02", dienGiai: "B", soTien: 200_000 },
      { soPhieu: "PC003", ngay: "2026-08-03", dienGiai: "C", soTien: 300_000 },
    ]);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.soButToan)).toEqual([1, 1, 1]);
    expect(result.map((r) => r.soPhieu)).toEqual(["PC001", "PC002", "PC003"]);
  });

  it("danh sách rỗng → trả về mảng rỗng", () => {
    expect(gomChungTuTheoSoPhieu([])).toEqual([]);
  });

  it("giữ thứ tự xuất hiện đầu tiên của mỗi số phiếu, không sắp xếp lại", () => {
    const result = gomChungTuTheoSoPhieu([
      { soPhieu: "PC002", ngay: "2026-08-02", dienGiai: "B", soTien: 10 },
      { soPhieu: "PC001", ngay: "2026-08-01", dienGiai: "A", soTien: 20 },
      { soPhieu: "PC002", ngay: "2026-08-02", dienGiai: "B", soTien: 5 },
    ]);

    expect(result.map((r) => r.soPhieu)).toEqual(["PC002", "PC001"]);
    expect(result.find((r) => r.soPhieu === "PC002")?.soTien).toBe(15);
  });
});

describe("gomChungTuTheoSoPhieu — đơn hàng", () => {
  it("giữ đơn hàng của bút toán đầu tiên CÓ đơn hàng trong nhóm", () => {
    const [kq] = gomChungTuTheoSoPhieu([
      { soPhieu: "PT01", ngay: "2026-09-08", dienGiai: "Thu", soTien: 1 },
      { soPhieu: "PT01", ngay: "2026-09-08", dienGiai: "Thu", soTien: 2, soHopDong: "DH128" },
    ]);
    expect(kq.soHopDong).toBe("DH128");
  });
});

describe("xepGoiY", () => {
  const hd = { tongThanhToan: 25_000_000, giaTriChuaThue: 23_148_149, ngayHoaDon: "2026-09-08" };
  const ct = (soPhieu: string, ngay: string, soTien: number) => ({
    soPhieu,
    ngay,
    dienGiai: "",
    soTien,
    soButToan: 1,
  });

  it("chứng từ khớp số tiền (tổng TT hoặc giá trị chưa thuế) lên đầu, có cờ khopTien", () => {
    const kq = xepGoiY(
      [ct("PC9", "2026-09-08", 5), ct("PT1", "2026-01-01", 25_000_000), ct("PT2", "2026-02-01", 23_148_149)],
      hd,
    );
    expect(kq.map((c) => c.soPhieu)).toEqual(["PT2", "PT1", "PC9"]);
    expect(kq.map((c) => c.khopTien)).toEqual([true, true, false]);
  });

  it("cùng nhóm khớp/không khớp thì gần ngày hóa đơn trước", () => {
    const kq = xepGoiY(
      [ct("A", "2026-06-01", 1), ct("B", "2026-09-10", 1), ct("C", "2026-09-01", 1)],
      hd,
    );
    expect(kq.map((c) => c.soPhieu)).toEqual(["B", "C", "A"]);
  });

  it("lệch dưới 1 đồng (làm tròn) vẫn tính là khớp", () => {
    expect(xepGoiY([ct("X", "2026-09-08", 25_000_000.4)], hd)[0].khopTien).toBe(true);
  });

  it("hóa đơn chưa có số tiền (dòng nháp) thì không chứng từ nào 'khớp'", () => {
    const kq = xepGoiY([ct("X", "2026-09-08", 0)], { tongThanhToan: 0, giaTriChuaThue: 0, ngayHoaDon: "2026-09-08" });
    expect(kq[0].khopTien).toBe(false);
  });
});
