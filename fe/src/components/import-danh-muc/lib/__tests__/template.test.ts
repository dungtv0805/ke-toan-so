import { describe, it, expect } from "vitest";
import { buildTemplateWorkbook } from "../template";
import type { ImportDanhMucConfig, RefItem } from "../../types";

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
