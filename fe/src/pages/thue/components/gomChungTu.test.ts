import { describe, expect, it } from "vitest";
import { gomChungTuTheoSoPhieu } from "./gomChungTu";

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
