import { describe, it, expect } from "vitest";
import * as ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { buildTemplateWorkbook } from "../template";
import { aoaToRawRows } from "../parseRows";
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

  it('sheet dữ liệu KHÔNG còn dòng ví dụ ở dòng 2 (Fix 2) — chỉ có 1 dòng header, để tải mẫu rồi tải lên ngay không tạo bản ghi rác', () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];
    expect(main.rowCount).toBe(1);
  });

  it('ví dụ từng cột vẫn xem được ở sheet "HuongDan" riêng (Fix 2)', () => {
    const wb = buildTemplateWorkbook(config, refData);
    const guide = wb.getWorksheet("HuongDan")!;
    expect(guide).toBeDefined();
    expect((guide.getRow(1).values as unknown[]).slice(1)).toEqual([
      "Cột",
      "Bắt buộc",
      "Ví dụ",
    ]);
    expect((guide.getRow(2).values as unknown[]).slice(1)).toEqual([
      "Mã dự án",
      "Bắt buộc",
      "DA01",
    ]);
    expect((guide.getRow(3).values as unknown[]).slice(1)).toEqual([
      "Tên dự án",
      "Bắt buộc",
      "Dự án A",
    ]);
    expect((guide.getRow(4).values as unknown[]).slice(1)).toEqual([
      "Trạng thái",
      "Tùy chọn",
      "Đang thực hiện",
    ]);
    expect((guide.getRow(5).values as unknown[]).slice(1)).toEqual([
      "Mã chủ đầu tư",
      "Tùy chọn",
      "CDT01",
    ]);
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
    // `Cell.dataValidation` (exceljs) chỉ tra đúng address khớp y hệt trong model;
    // vì cột được gắn dưới dạng MỘT dải "C2:C501" (Fix 1) chứ không phải từng ô rời,
    // tra thẳng bản đồ dataValidations bằng khoá dải thay vì qua getCell(2, 3).
    expect(main.dataValidations.model["C2:C501"]?.type).toBe("list");
  });

  it("config không có cột enum/ref thì chỉ có 2 sheet: DuLieu và HuongDan", () => {
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
    expect(wb.worksheets.map((w) => w.name)).toEqual(["DuLieu", "HuongDan"]);
  });
});

describe("buildTemplateWorkbook — không cột nào bị Excel chặn cứng khi nhập tay (Fix 1)", () => {
  // Dropdown chỉ để tra cứu nhanh, KHÔNG được chặn nhập tay — dù là enum một-giá-trị,
  // enumList nhiều-giá-trị (vd "Khách hàng, Nhà cung cấp"), hay cột tham chiếu (vd mã
  // chủ đầu tư mới thêm sau khi tải file mẫu). Excel chỉ thật sự chặn (errorStyle=stop)
  // khi showErrorMessage=true; exceljs không bao giờ tự bật thuộc tính này, nên việc cần
  // xác nhận là template.ts KHÔNG cố tình bật nó cho bất kỳ loại cột nào.
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
  const refCol: ImportColumn = {
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
      refCol,
    ],
  };
  const refData = { chuDauTu: [{ id: "1", ma: "CDT01", ten: "Công ty A" }] };

  it("trong bộ nhớ: cả 3 loại cột (enumList, enum, tham chiếu) đều không bật showErrorMessage/errorStyle", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];

    // Tra bản đồ dataValidations bằng khoá dải (Fix 1), không dùng getCell(...).dataValidation
    // — getCell chỉ tra đúng address khớp y hệt, không khớp được khi model lưu theo dải.
    const dvEnumList = main.dataValidations.model["B2:B501"];
    const dvEnum = main.dataValidations.model["C2:C501"];
    const dvRef = main.dataValidations.model["D2:D501"];

    for (const dv of [dvEnumList, dvEnum, dvRef]) {
      expect(dv?.type).toBe("list");
      expect(dv?.showErrorMessage).not.toBe(true);
      expect(dv?.errorStyle).toBeUndefined();
    }
  });

  it("bằng chứng thực nghiệm: sau khi ghi buffer .xlsx thật và load lại, không cột nào chặn lỗi", async () => {
    const wb = buildTemplateWorkbook(config, refData);
    const buffer = await wb.xlsx.writeBuffer();

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer);
    const main = reloaded.getWorksheet("DuLieu")!;

    // Cột "Loại đối tượng" (B) — enumList.
    const dvEnumList = main.getCell("B2").dataValidation;
    expect(dvEnumList?.type).toBe("list");
    expect(dvEnumList?.showErrorMessage).not.toBe(true);
    expect(dvEnumList?.errorStyle).toBeUndefined();

    // Cột "Trạng thái" (C) — enum một-giá-trị.
    const dvEnum = main.getCell("C2").dataValidation;
    expect(dvEnum?.type).toBe("list");
    expect(dvEnum?.showErrorMessage).not.toBe(true);
    expect(dvEnum?.errorStyle).toBeUndefined();

    // Cột "Mã chủ đầu tư" (D) — tham chiếu.
    const dvRef = main.getCell("D2").dataValidation;
    expect(dvRef?.type).toBe("list");
    expect(dvRef?.showErrorMessage).not.toBe(true);
    expect(dvRef?.errorStyle).toBeUndefined();
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
    const sheetNames = wb.worksheets
      .map((w) => w.name)
      .filter((n) => n !== "DuLieu" && n !== "HuongDan");

    expect(sheetNames).toHaveLength(2);
    expect(new Set(sheetNames).size).toBe(2);
    for (const name of sheetNames) {
      expect(name.length).toBeLessThanOrEqual(31);
    }

    const main = wb.worksheets[0];
    // Tra bản đồ dataValidations bằng khoá dải (Fix 1) thay vì getCell(...).dataValidation.
    const dvA = main.dataValidations.model["B2:B501"];
    const dvB = main.dataValidations.model["C2:C501"];
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
    expect(wb.worksheets).toHaveLength(2); // DuLieu + HuongDan
    const main = wb.worksheets[0];
    expect(main.getCell(2, 2).dataValidation).toBeUndefined();

    // refData có khóa nhưng mảng rỗng — cùng kết quả, cùng không throw.
    expect(() => buildTemplateWorkbook(config, { chuDauTu: [] })).not.toThrow();
    const wb2 = buildTemplateWorkbook(config, { chuDauTu: [] });
    expect(wb2.getWorksheet("DS_chuDauTu")).toBeUndefined();
    expect(wb2.worksheets).toHaveLength(2); // DuLieu + HuongDan
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
    // Tra bản đồ dataValidations bằng khoá dải (Fix 1) thay vì getCell(...).dataValidation.
    expect(main.dataValidations.model["B2:B501"]?.allowBlank).toBe(false);
    expect(main.dataValidations.model["C2:C501"]?.allowBlank).toBe(true);
  });

  it("round-trip serialize/reload thật: ghi buffer .xlsx rồi load lại, dropdown và formula vẫn còn nguyên", async () => {
    const wb = buildTemplateWorkbook(config, refData);
    const buffer = await wb.xlsx.writeBuffer();

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer);
    const main = reloaded.getWorksheet("DuLieu")!;

    const dv = main.getCell("C2").dataValidation; // cột "Trạng thái", type enum
    expect(dv?.type).toBe("list");
    expect(dv?.formulae).toEqual(["'DS_trangThai'!$A$1:$A$2"]);

    const listWs = reloaded.getWorksheet("DS_trangThai")!;
    expect(listWs.getCell("A1").value).toBe("Đang thực hiện");
    expect(listWs.getCell("A2").value).toBe("Hoàn thành");
  });
});

describe("buildTemplateWorkbook — gộp dropdown thành đúng một dải liên tục mỗi cột (Fix 1)", () => {
  // Bug đã sửa: lặp add() từng ô một khiến exceljs (khi sắp xếp address theo chuỗi
  // để gộp dải ở bước optimiseDataValidations) tạo ra HAI dải chồng lấn cho mỗi cột
  // thay vì một. Test này khẳng định cấu trúc TỔNG THỂ — không chỉ một ô — bằng
  // cách đọc thẳng bản đồ address→rule (`dataValidations.model`) và bằng cách dò
  // các ô ở đầu/giữa/cuối dải sau khi ghi buffer thật rồi tải lại.
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
  const refCol: ImportColumn = {
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
      refCol,
    ],
  };
  const refData = { chuDauTu: [{ id: "1", ma: "CDT01", ten: "Công ty A" }] };

  it("bản đồ dataValidations chỉ có ĐÚNG MỘT entry cho mỗi cột, đúng khoá dải B2:B501/C2:C501/D2:D501 — không phải 500 entry rời rạc mỗi cột", () => {
    const wb = buildTemplateWorkbook(config, refData);
    const main = wb.worksheets[0];

    const keys = Object.keys(main.dataValidations.model);
    expect(keys).toHaveLength(3);
    expect(keys).toContain("B2:B501");
    expect(keys).toContain("C2:C501");
    expect(keys).toContain("D2:D501");

    // Thuộc tính mà lần sửa rowCount trước bảo vệ: sheet chính chỉ có 1 dòng header
    // (Fix 2 bỏ dòng ví dụ ở dòng 2 — xem describe "Fix 2" phía trên), không phình lên
    // 501 dòng vì việc gắn validation.
    expect(main.rowCount).toBe(1);
  });

  it("sau khi ghi buffer thật rồi tải lại: dải phủ đúng từ dòng 2 đến dòng 501, đầu/giữa/cuối cùng công thức, không lem ra ngoài", async () => {
    const wb = buildTemplateWorkbook(config, refData);
    expect(wb.worksheets[0].rowCount).toBe(1);
    const buffer = await wb.xlsx.writeBuffer();

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer);
    const main = reloaded.getWorksheet("DuLieu")!;

    // Kiểm tra rowCount NGAY sau khi tải lại, trước mọi lần gọi getCell bên dưới —
    // bản thân getCell tạo Row như tác dụng phụ (đây chính là nguồn gốc bug rowCount
    // 501 ở lần sửa trước), nên gọi sau sẽ tự làm sai lệch phép đo.
    expect(main.rowCount).toBe(1);

    // Sau khi tải lại, exceljs khai triển dải "C2:C501" thành từng ô riêng trong
    // model — nên getCell(...).dataValidation tra đúng ở đây (khác lúc trong bộ
    // nhớ trước khi ghi buffer, khi model vẫn còn lưu theo khoá dải).
    const expectedFormula = ["'DS_trangThai'!$A$1:$A$2"];
    for (const rowNumber of [2, 250, 501]) {
      const dv = main.getCell(`C${rowNumber}`).dataValidation;
      expect(dv?.type).toBe("list");
      expect(dv?.formulae).toEqual(expectedFormula);
    }

    // Ngoài dải (dòng header và dòng ngay sau dòng cuối) không bị gắn dropdown.
    expect(main.getCell("C1").dataValidation).toBeUndefined();
    expect(main.getCell("C502").dataValidation).toBeUndefined();
  });
});

describe("buildTemplateWorkbook — cột tham chiếu nhiều giá trị (MultiRefSpec, multi: true)", () => {
  const multiRefCol: ImportColumn = {
    key: "donViThamGia",
    header: "Các đơn vị tham gia",
    example: "DV01, DV02",
    ref: {
      service: noopService,
      matchBy: "ma",
      label: "Đơn vị tham gia",
      displayField: "ten",
      multi: true,
      assign: (found) => ({ donViIds: found.map((f) => f.id) }),
    },
  };
  const config: ImportDanhMucConfig = {
    title: "Dự án",
    resource: "du-an",
    service: noopService,
    uniqueBy: ["ma"],
    columns: [
      { key: "ma", header: "Mã dự án", required: true, example: "DA01" },
      multiRefCol,
    ],
  };
  const refData = {
    donViThamGia: [
      { id: "1", ma: "DV01", ten: "Đơn vị 1" },
      { id: "2", ma: "DV02", ten: "Đơn vị 2" },
    ],
  };

  it("sinh sheet danh sách cho cột tham chiếu multi, cùng cách gắn dropdown như cột tham chiếu một-giá-trị", () => {
    const wb = buildTemplateWorkbook(config, refData);

    const listWs = wb.getWorksheet("DS_donViThamGia")!;
    expect(listWs).toBeDefined();
    expect(listWs.getCell("A1").value).toBe("DV01 - Đơn vị 1");
    expect(listWs.getCell("A2").value).toBe("DV02 - Đơn vị 2");

    const main = wb.worksheets[0];
    const keys = Object.keys(main.dataValidations.model);
    expect(keys).toEqual(["B2:B501"]);

    // Tra bản đồ dataValidations bằng khoá dải (Fix 1) thay vì getCell(...).dataValidation.
    const dv = main.dataValidations.model["B2:B501"];
    expect(dv?.type).toBe("list");
    expect(dv?.formulae).toEqual(["'DS_donViThamGia'!$A$1:$A$2"]);
    expect(dv?.showErrorMessage).not.toBe(true);
    expect(dv?.errorStyle).toBeUndefined();
  });
});

describe("buildTemplateWorkbook — file mẫu tải về rồi tải lên ngay không tạo bản ghi rác (Fix 2)", () => {
  /** Đọc y hệt parse.handler.ts thật: XLSX.read + sheet_to_json({ header: 1, raw: true, defval: "" }). */
  function readMainSheetAoa(buffer: ArrayBuffer | Uint8Array): unknown[][] {
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: "",
    }) as unknown[][];
  }

  const refCol: ImportColumn = {
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
  };
  const configWithRef: ImportDanhMucConfig = {
    title: "Dự án",
    resource: "du-an",
    service: noopService,
    uniqueBy: ["ma"],
    columns: [
      { key: "ma", header: "Mã dự án", required: true, example: "DA01" },
      { key: "ten", header: "Tên dự án", required: true, example: "Dự án A" },
      refCol,
    ],
  };
  const refDataWithRef = { chuDauTu: [{ id: "1", ma: "CDT01", ten: "Công ty A" }] };

  it("template tải về rồi đọc lại bằng ĐÚNG bộ đọc thật (xlsx + aoaToRawRows) cho 0 dòng dữ liệu", async () => {
    const wb = buildTemplateWorkbook(configWithRef, refDataWithRef);
    const buffer = await wb.xlsx.writeBuffer();

    const aoa = readMainSheetAoa(buffer);
    const rows = aoaToRawRows(aoa, configWithRef.columns);

    // Trước Fix 2: dòng ví dụ ("DA01", "Dự án A", "CDT01") bị đọc thành 1 dòng dữ liệu thật
    // ở đây. Sau Fix 2: sheet dữ liệu chỉ còn header, nên phải ra đúng 0 dòng.
    expect(rows).toHaveLength(0);
  });

  it("danh mục đơn giản (không cột tham chiếu) cũng cho 0 dòng khi đọc lại template vừa tải", async () => {
    const simple: ImportDanhMucConfig = {
      title: "Đơn vị tính",
      resource: "don-vi-tinh",
      service: noopService,
      uniqueBy: ["ma"],
      columns: [
        { key: "ma", header: "Mã", required: true, example: "DVT01" },
        { key: "ten", header: "Tên", required: true, example: "Cái" },
        { key: "moTa", header: "Mô tả", example: "Đơn vị đếm" },
      ],
    };
    const wb = buildTemplateWorkbook(simple, {});
    const buffer = await wb.xlsx.writeBuffer();

    const rows = aoaToRawRows(readMainSheetAoa(buffer), simple.columns);

    expect(rows).toHaveLength(0);
  });

  it('ví dụ vẫn đọc lại được từ sheet "HuongDan" sau khi ghi buffer .xlsx thật và tải lại', async () => {
    const wb = buildTemplateWorkbook(configWithRef, refDataWithRef);
    const buffer = await wb.xlsx.writeBuffer();

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer);
    const guide = reloaded.getWorksheet("HuongDan")!;

    expect(guide).toBeDefined();
    expect((guide.getRow(2).values as unknown[]).slice(1)).toEqual([
      "Mã dự án",
      "Bắt buộc",
      "DA01",
    ]);
    expect((guide.getRow(4).values as unknown[]).slice(1)).toEqual([
      "Mã chủ đầu tư",
      "Tùy chọn",
      "CDT01",
    ]);
  });
});
