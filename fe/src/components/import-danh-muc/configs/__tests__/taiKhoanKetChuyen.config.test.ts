import { describe, expect, it } from "vitest";
import { validateAndBuild } from "../../lib/validate";
import { taiKhoanKetChuyenImportConfig } from "../taiKhoanKetChuyen.config";

/** Dòng hợp lệ tối thiểu; từng test chỉ thay ô `ben`. */
const dongDayDu = {
  thuTu: "10",
  ma: "511-911",
  taiKhoanTu: "511",
  taiKhoanDen: "911",
};

const cot = (key: string) =>
  taiKhoanKetChuyenImportConfig.columns.find((c) => c.key === key);

describe("taiKhoanKetChuyenImportConfig", () => {
  // Entity giữ `tenTaiKhoanTu`/`tenTaiKhoanDen` làm snapshot tên tài khoản. Thiếu hai
  // cột này thì dòng nhập bằng Excel mang snapshot tên RỖNG — đúng thứ mà hai field
  // sinh ra để tránh.
  it("có cột tên tài khoản kết chuyển từ", () => {
    expect(cot("tenTaiKhoanTu")).toBeDefined();
  });

  it("có cột tên tài khoản kết chuyển đến", () => {
    expect(cot("tenTaiKhoanDen")).toBeDefined();
  });

  it("hai cột tên không bắt buộc — file cũ không có hai cột này vẫn nhập được", () => {
    expect(cot("tenTaiKhoanTu")?.required).toBeFalsy();
    expect(cot("tenTaiKhoanDen")?.required).toBeFalsy();
  });

  it("hai cột tên có ví dụ trong file mẫu", () => {
    expect(cot("tenTaiKhoanTu")?.example).toBeTruthy();
    expect(cot("tenTaiKhoanDen")?.example).toBeTruthy();
  });

  it("cột tên đứng ngay sau cột mã tài khoản tương ứng", () => {
    const keys = taiKhoanKetChuyenImportConfig.columns.map((c) => c.key);

    expect(keys.indexOf("tenTaiKhoanTu")).toBe(keys.indexOf("taiKhoanTu") + 1);
    expect(keys.indexOf("tenTaiKhoanDen")).toBe(keys.indexOf("taiKhoanDen") + 1);
  });
});

/**
 * Cột "Bên kết chuyển" là enum của BE (@IsIn(['NO','CO','HAI_BEN'])). Nếu cột này để
 * kiểu chuỗi thường, FE gửi thẳng chữ người dùng gõ và BE trả về đúng một câu chung
 * chung "Dữ liệu không hợp lệ ở các trường: ben" — không nói được ô nào, giá trị nào.
 * Trong khi đó danh sách và file xuất Excel của chính trang này hiển thị "Nợ/Có/Hai bên"
 * (NHAN_BEN), nên người dùng gõ tiếng Việt là chuyện đương nhiên.
 */
describe("cột Bên kết chuyển", () => {
  const ben = () => cot("ben");

  it("là cột enum để FE quy đổi trước khi gửi BE", () => {
    expect(ben()?.type).toBe("enum");
  });

  it("nhận nhãn tiếng Việt đúng như danh sách và file xuất hiển thị", () => {
    const values = ben()?.enumValues ?? [];
    expect(values.map((o) => [o.label, o.value])).toEqual([
      ["Nợ", "NO"],
      ["Có", "CO"],
      ["Hai bên", "HAI_BEN"],
    ]);
  });

  it("quy đổi nhãn tiếng Việt thành mã BE trước khi gửi", () => {
    const out = validateAndBuild(
      [{ rowNumber: 2, values: { ...dongDayDu, ben: "Có" } }],
      taiKhoanKetChuyenImportConfig,
      [],
      {},
    );

    expect(out.hasErrors).toBe(false);
    expect(out.validItems[0].ben).toBe("CO");
  });

  // File tải từ bản mẫu cũ ghi thẳng mã thô — resolveEnum khớp cả `value` nên vẫn chạy.
  it("vẫn nhận mã thô NO/CO/HAI_BEN để file cũ nhập được", () => {
    const out = validateAndBuild(
      [{ rowNumber: 2, values: { ...dongDayDu, ben: "HAI_BEN" } }],
      taiKhoanKetChuyenImportConfig,
      [],
      {},
    );

    expect(out.hasErrors).toBe(false);
    expect(out.validItems[0].ben).toBe("HAI_BEN");
  });

  // Giá trị rác phải chết ở preview kèm gợi ý tiếng Việt, không đi tới BE để nhận lại
  // câu "Dữ liệu không hợp lệ ở các trường: ben".
  it("báo lỗi ngay ở preview khi giá trị không thuộc danh sách", () => {
    const out = validateAndBuild(
      [{ rowNumber: 2, values: { ...dongDayDu, ben: "Cả hai" } }],
      taiKhoanKetChuyenImportConfig,
      [],
      {},
    );

    expect(out.hasErrors).toBe(true);
    expect(out.results[0].errors.join(" ")).toContain("Nợ, Có, Hai bên");
  });
});
