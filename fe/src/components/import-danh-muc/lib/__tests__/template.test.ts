import { describe, it, expect } from "vitest";
import * as ExcelJS from "exceljs";
import { buildTemplateWorkbook } from "../template";
import type { ImportColumn, ImportDanhMucConfig, RefItem } from "../../types";

const noopService = { getAll: async (): Promise<RefItem[]> => [] };

const config: ImportDanhMucConfig = {
  title: "Dự án",
  resource: "du-an",
  service: noopService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã dự án", required: true, example: "DA01" },
    { key: "ten", header: "Tên dự án", required: true, example: "Dự án A" },
    {
      key: "trangThai",
      header: "Trạng thái",
      type: "enum",
      enumValues: [
        { label: "Đang thực hiện", value: "DANG_THUC_HIEN" },
        { label: "Hoàn thành", value: "HOAN_THANH" },
      ],
      example: "Đang thực hiện",
    },
    {
      key: "chuDauTu",
      header: "Mã chủ đầu tư",
      example: "CDT01",
      ref: {
        service: noopService,
        matchBy: "ma",
        label: "Chủ đầu tư",
        displayField: "ten",
        assign: (f) => ({ chuDauTuId: f.id }),
      },
    },
  ],
};

const refData = { chuDauTu: [{ id: "1", ma: "CDT01", ten: "Công ty A" }] };

describe("buildTemplateWorkbook", () => {
  it("sheet đầu tiên có header đúng thứ tự config", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];
    const headers = (main.getRow(1).values as unknown[]).slice(1);
    expect(headers).toEqual([
      "Mã dự án",
      "Tên dự án",
      "Trạng thái",
      "Mã chủ đầu tư",
    ]);
  });

  it("có đúng một dòng ví dụ lấy từ example", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];
    const values = (main.getRow(2).values as unknown[]).slice(1);
    expect(values).toEqual(["DA01", "Dự án A", "Đang thực hiện", "CDT01"]);
    expect(main.rowCount).toBe(2);
  });

  it("tạo sheet danh sách cho cột enum và cột tham chiếu", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toContain("DS_trangThai");
    expect(names).toContain("DS_chuDauTu");
  });

  it('sheet tham chiếu ghi dạng "MÃ - Tên"', () => {
    const wb = buildTemplateWorkbook(config, refData);
    const ws = wb.getWorksheet("DS_chuDauTu")!;
    expect(ws.getCell("A1").value).toBe("CDT01 - Công ty A");
  });

  it("sheet enum ghi nhãn tiếng Việt", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const ws = wb.getWorksheet("DS_trangThai")!;
    expect(ws.getCell("A1").value).toBe("Đang thực hiện");
    expect(ws.getCell("A2").value).toBe("Hoàn thành");
  });

  it("gắn data validation cho cột enum ở dòng dữ liệu", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];
    expect(main.getCell(2, 3).dataValidation?.type).toBe("list");
  });

  it("config không có cột enum/ref thì chỉ có 1 sheet", () => {
    const plain: ImportDanhMucConfig = {
      title: "Đơn vị tính",
      resource: "don-vi-tinh",
      service: noopService,
      uniqueBy: ["ma"],
      columns: [
        { key: "ma", header: "Mã", required: true, example: "DVT01" },
        { key: "ten", header: "Tên", required: true, example: "Cái" },
      ],
    };
    const wb = buildTemplateWorkbook(plain, {});
    expect(wb.worksheets).toHaveLength(1);
  });
});

describe("buildTemplateWorkbook — dropdown enumList không chặn nhập nhiều giá trị (Fix 1)", () => {
  // Đúng tình huống thật ở task Đối tượng: "Loại đối tượng" là enumList, ví dụ
  // "Khách hàng, Nhà cung cấp" — tổ hợp này không khớp NGUYÊN VĂN một item nào
  // trong sheet danh sách, nên nếu validation chặt như enum một-giá-trị, Excel
  // sẽ chặn luôn giá trị mẫu hợp lệ.
  const enumListCol: ImportColumn = {
    key: "loaiDoiTuong",
    header: "Loại đối tượng",
    type: "enumList",
    enumValues: [
      { label: "Khách hàng", value: "KHACH_HANG" },
      { label: "Nhà cung cấp", value: "NHA_CUNG_CAP" },
    ],
    example: "Khách hàng, Nhà cung cấp",
  };
  const enumCol: ImportColumn = {
    key: "trangThai",
    header: "Trạng thái",
    type: "enum",
    enumValues: [
      { label: "Hoạt động", value: "HOAT_DONG" },
      { label: "Ngừng", value: "NGUNG" },
    ],
    example: "Hoạt động",
  };
  const config: ImportDanhMucConfig = {
    title: "Đối tượng",
    resource: "doi-tuong",
    service: noopService,
    uniqueBy: ["ma"],
    columns: [
      { key: "ma", header: "Mã", required: true, example: "DT01" },
      enumListCol,
      enumCol,
    ],
  };

  it("cột enumList: dropdown vẫn có nhưng showErrorMessage=false (không chặn nhập tay)", () => {
    const wb = buildTemplateWorkbook(config, {});
    const main = wb.worksheets[0];
    const dv = main.getCell(2, 2).dataValidation;
    expect(dv?.type).toBe("list");
    expect(dv?.formulae).toEqual(["'DS_loaiDoiTuong'!$A$1:$A$2"]);
    expect(dv?.showErrorMessage).toBe(false);
  });

  it("cột enum một-giá-trị: vẫn chặt, showErrorMessage=true và errorStyle=stop", () => {
    const wb = buildTemplateWorkbook(config, {});
    const main = wb.worksheets[0];
    const dv = main.getCell(2, 3).dataValidation;
    expect(dv?.type).toBe("list");
    expect(dv?.showErrorMessage).toBe(true);
    expect(dv?.errorStyle).toBe("stop");
  });

  it("bằng chứng thực nghiệm: sau khi ghi buffer .xlsx thật và load lại, enumList và enum khác nhau về chặn lỗi", async () => {
    const wb = buildTemplateWorkbook(config, {});
    const buffer = await wb.xlsx.writeBuffer();

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer as unknown as Buffer);
    const main = reloaded.getWorksheet("DuLieu")!;

    // Cột "Loại đối tượng" (B) — enumList: round-trip qua XML thật vẫn phải giữ
    // showErrorMessage tắt (không có thuộc tính này trong XML ⇒ Excel không chặn).
    const dvEnumList = main.getCell("B2").dataValidation;
    expect(dvEnumList?.type).toBe("list");
    expect(dvEnumList?.showErrorMessage).not.toBe(true);

    // Cột "Trạng thái" (C) — enum một-giá-trị: round-trip vẫn phải giữ nguyên
    // showErrorMessage=true + errorStyle=stop, tức Excel thật sự chặn giá trị sai.
    const dvEnum = main.getCell("C2").dataValidation;
    expect(dvEnum?.type).toBe("list");
    expect(dvEnum?.showErrorMessage).toBe(true);
    expect(dvEnum?.errorStyle).toBe("stop");
  });
});

describe("buildTemplateWorkbook — tên sheet danh sách an toàn khi key dài (Fix 2)", () => {
  it("hai cột key dài đụng độ sau khi cắt 31 ký tự vẫn ra 2 sheet riêng, mỗi cột trỏ đúng sheet của mình", () => {
    const longKeyA = "mot_ten_cot_rat_la_dai_phien_ban_A";
    const longKeyB = "mot_ten_cot_rat_la_dai_phien_ban_B";
    // Cả hai đều dài hơn 31 ký tự sau khi ghép "DS_" và 28 ký tự đầu giống hệt nhau
    // ⇒ nếu chỉ cắt chuỗi đơn giản, cả hai sẽ trùng tên sheet.
    expect(`DS_${longKeyA}`.length).toBeGreaterThan(31);
    expect(`DS_${longKeyA}`.slice(0, 31)).toBe(`DS_${longKeyB}`.slice(0, 31));

    const config: ImportDanhMucConfig = {
      title: "Test key dài",
      resource: "test-key-dai",
      service: noopService,
      uniqueBy: ["ma"],
      columns: [
        { key: "ma", header: "Mã", required: true, example: "M01" },
        {
          key: longKeyA,
          header: "Cột dài A",
          type: "enum",
          enumValues: [{ label: "Giá trị A", value: "A" }],
          example: "Giá trị A",
        },
        {
          key: longKeyB,
          header: "Cột dài B",
          type: "enum",
          enumValues: [{ label: "Giá trị B", value: "B" }],
          example: "Giá trị B",
        },
      ],
    };

    const wb = buildTemplateWorkbook(config, {});
    const sheetNames = wb.worksheets.map((w) => w.name).filter((n) => n !== "DuLieu");

    expect(sheetNames).toHaveLength(2);
    expect(new Set(sheetNames).size).toBe(2);
    for (const name of sheetNames) {
      expect(name.length).toBeLessThanOrEqual(31);
    }

    const main = wb.worksheets[0];
    const dvA = main.getCell(2, 2).dataValidation;
    const dvB = main.getCell(2, 3).dataValidation;
    const [sheetA, sheetB] = sheetNames;

    // Mỗi cột phải trỏ formula về đúng sheet của chính nó (không lẫn lộn),
    // và cả hai sheet thật sự tồn tại trong workbook.
    expect(dvA?.formulae?.[0]).toContain(sheetA);
    expect(dvB?.formulae?.[0]).toContain(sheetB);
    expect(wb.getWorksheet(sheetA)).toBeDefined();
    expect(wb.getWorksheet(sheetB)).toBeDefined();
  });
});

describe("buildTemplateWorkbook — các hành vi khác cần cho 22 danh mục thật (Fix 3)", () => {
  it("cột tham chiếu thiếu refData (chưa từng seed) không tạo sheet rỗng, không có dropdown, không throw", () => {
    const config: ImportDanhMucConfig = {
      title: "Dự án",
      resource: "du-an",
      service: noopService,
      uniqueBy: ["ma"],
      columns: [
        { key: "ma", header: "Mã dự án", required: true, example: "DA01" },
        {
          key: "chuDauTu",
          header: "Mã chủ đầu tư",
          example: "CDT01",
          ref: {
            service: noopService,
            matchBy: "ma",
            label: "Chủ đầu tư",
            displayField: "ten",
            assign: (f) => ({ chuDauTuId: f.id }),
          },
        },
      ],
    };

    // refData không có khóa "chuDauTu" — danh mục tham chiếu chưa có bản ghi nào.
    expect(() => buildTemplateWorkbook(config, {})).not.toThrow();
    const wb = buildTemplateWorkbook(config, {});
    expect(wb.getWorksheet("DS_chuDauTu")).toBeUndefined();
    expect(wb.worksheets).toHaveLength(1);
    const main = wb.worksheets[0];
    expect(main.getCell(2, 2).dataValidation).toBeUndefined();

    // refData có khóa nhưng mảng rỗng — cùng kết quả, cùng không throw.
    expect(() => buildTemplateWorkbook(config, { chuDauTu: [] })).not.toThrow();
    const wb2 = buildTemplateWorkbook(config, { chuDauTu: [] });
    expect(wb2.getWorksheet("DS_chuDauTu")).toBeUndefined();
    expect(wb2.worksheets).toHaveLength(1);
  });

  it("allowBlank phản ánh đúng col.required: true cho cột tùy chọn, false cho cột bắt buộc", () => {
    const config: ImportDanhMucConfig = {
      title: "Test allowBlank",
      resource: "test-allow-blank",
      service: noopService,
      uniqueBy: ["ma"],
      columns: [
        { key: "ma", header: "Mã", required: true, example: "M01" },
        {
          key: "batBuoc",
          header: "Cột enum bắt buộc",
          type: "enum",
          required: true,
          enumValues: [{ label: "Có", value: "CO" }],
          example: "Có",
        },
        {
          key: "tuyChon",
          header: "Cột enum tùy chọn",
          type: "enum",
          enumValues: [{ label: "Có", value: "CO" }],
          example: "Có",
        },
      ],
    };

    const wb = buildTemplateWorkbook(config, {});
    const main = wb.worksheets[0];
    expect(main.getCell(2, 2).dataValidation?.allowBlank).toBe(false);
    expect(main.getCell(2, 3).dataValidation?.allowBlank).toBe(true);
  });

  it("round-trip serialize/reload thật: ghi buffer .xlsx rồi load lại, dropdown và formula vẫn còn nguyên", async () => {
    const wb = buildTemplateWorkbook(config, refData);
    const buffer = await wb.xlsx.writeBuffer();

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer as unknown as Buffer);
    const main = reloaded.getWorksheet("DuLieu")!;

    const dv = main.getCell("C2").dataValidation; // cột "Trạng thái", type enum
    expect(dv?.type).toBe("list");
    expect(dv?.formulae).toEqual(["'DS_trangThai'!$A$1:$A$2"]);

    const listWs = reloaded.getWorksheet("DS_trangThai")!;
    expect(listWs.getCell("A1").value).toBe("Đang thực hiện");
    expect(listWs.getCell("A2").value).toBe("Hoàn thành");
  });
});
