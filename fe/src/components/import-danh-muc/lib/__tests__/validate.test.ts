import { describe, it, expect } from "vitest";
import { validateAndBuild, excelSerialToISO } from "../validate";
import type { ImportDanhMucConfig, RawImportRow, RefItem } from "../../types";

const noopService = { getAll: async (): Promise<RefItem[]> => [] };

const simpleConfig: ImportDanhMucConfig = {
  title: "Đơn vị tính",
  resource: "don-vi-tinh",
  service: noopService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã đơn vị tính", required: true },
    { key: "ten", header: "Tên đơn vị tính", required: true },
    { key: "moTa", header: "Mô tả" },
  ],
};

const row = (rowNumber: number, values: Record<string, string | number>): RawImportRow => ({
  rowNumber,
  values,
});

describe("validateAndBuild — trường bắt buộc", () => {
  it("dòng đủ trường thì hợp lệ và dựng payload đúng", () => {
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái", moTa: "ghi chú" })],
      simpleConfig,
      [],
      {},
    );
    expect(out.hasErrors).toBe(false);
    expect(out.validItems).toEqual([{ ma: "DVT01", ten: "Cái", moTa: "ghi chú" }]);
  });

  it("thiếu trường bắt buộc thì báo lỗi và không có payload", () => {
    const out = validateAndBuild(
      [row(2, { ma: "", ten: "Cái", moTa: "" })],
      simpleConfig,
      [],
      {},
    );
    expect(out.hasErrors).toBe(true);
    expect(out.results[0].errors).toContain("Thiếu Mã đơn vị tính");
    expect(out.results[0].payload).toBeNull();
    expect(out.validItems).toEqual([]);
  });

  it("bỏ trường tùy chọn rỗng ra khỏi payload", () => {
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái", moTa: "" })],
      simpleConfig,
      [],
      {},
    );
    expect(out.validItems[0]).toEqual({ ma: "DVT01", ten: "Cái" });
  });
});

describe("validateAndBuild — trùng mã", () => {
  it("trùng với dữ liệu đã có trong hệ thống", () => {
    const existingData = [{ id: "1", ma: "dvt01", ten: "Cái cũ" }];
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái" })],
      simpleConfig,
      existingData,
      {},
    );
    expect(out.results[0].errors).toContain("Mã đã tồn tại trong hệ thống");
  });

  it("trùng giữa hai dòng trong cùng file, báo ở dòng sau", () => {
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái" }), row(3, { ma: "DVT01", ten: "Hộp" })],
      simpleConfig,
      [],
      {},
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.results[1].errors).toContain("Mã bị trùng với dòng 2 trong file");
  });

  it("khóa trùng gồm nhiều cột thì phải trùng cả cụm mới báo lỗi", () => {
    const config: ImportDanhMucConfig = {
      ...simpleConfig,
      uniqueBy: ["loaiGiaoDich", "nghiepVu"],
      columns: [
        { key: "loaiGiaoDich", header: "Loại giao dịch", required: true },
        { key: "nghiepVu", header: "Nghiệp vụ", required: true },
      ],
    };
    const out = validateAndBuild(
      [
        row(2, { loaiGiaoDich: "THU", nghiepVu: "NV01" }),
        row(3, { loaiGiaoDich: "CHI", nghiepVu: "NV01" }),
      ],
      config,
      [],
      {},
    );
    expect(out.hasErrors).toBe(false);
  });
});

describe("validateAndBuild — kiểu dữ liệu", () => {
  const config: ImportDanhMucConfig = {
    ...simpleConfig,
    columns: [
      { key: "ma", header: "Mã", required: true },
      { key: "giaBan", header: "Giá bán", type: "number" },
      { key: "ngayBatDau", header: "Ngày bắt đầu", type: "date" },
      { key: "trangThai", header: "Trạng thái", type: "boolean" },
      {
        key: "loai",
        header: "Loại",
        type: "enum",
        enumValues: [
          { label: "Chi phí", value: "CHI_PHI" },
          { label: "Doanh thu", value: "DOANH_THU" },
        ],
      },
      {
        key: "phanLoai",
        header: "Phân loại",
        type: "enumList",
        enumValues: [
          { label: "Chi phí", value: "CHI_PHI" },
          { label: "Doanh thu", value: "DOANH_THU" },
        ],
      },
    ],
  };

  it("số hợp lệ được ép về number, bỏ dấu phân cách nghìn", () => {
    const out = validateAndBuild([row(2, { ma: "A", giaBan: "1.000.000" })], config, [], {});
    expect(out.validItems[0].giaBan).toBe(1000000);
  });

  it("số sai định dạng thì báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "A", giaBan: "abc" })], config, [], {});
    expect(out.results[0].errors).toContain("Giá bán phải là số");
  });

  it.each([
    ["1.000.000", 1000000],
    ["1.500,5", 1500.5],
    ["1500,5", 1500.5],
    ["1500.5", 1500.5],
    ["1.5", 1.5],
    ["1.500", 1500],
    ["-2.000", -2000],
  ])("parseNumber quy đổi %s → %s", (text, expected) => {
    const out = validateAndBuild([row(2, { ma: "A", giaBan: text })], config, [], {});
    expect(out.validItems[0].giaBan).toBe(expected);
  });

  it("số truyền vào dạng number (ô Excel gốc) giữ nguyên, không bị hiểu nhầm là chuỗi", () => {
    const out = validateAndBuild([row(2, { ma: "A", giaBan: 1500.5 })], config, [], {});
    expect(out.validItems[0].giaBan).toBe(1500.5);
  });

  it('số dạng "1..2" (hai dấu chấm liền) thì báo lỗi', () => {
    const out = validateAndBuild([row(2, { ma: "A", giaBan: "1..2" })], config, [], {});
    expect(out.results[0].errors).toContain("Giá bán phải là số");
  });

  it("ô số để trống (không bắt buộc) thì bỏ qua, không gọi parseNumber trên chuỗi rỗng", () => {
    const out = validateAndBuild([row(2, { ma: "A", giaBan: "" })], config, [], {});
    expect(out.hasErrors).toBe(false);
    expect(out.validItems[0]).not.toHaveProperty("giaBan");
  });

  it("ngày dạng dd/MM/yyyy được đổi sang ISO", () => {
    const out = validateAndBuild([row(2, { ma: "A", ngayBatDau: "01/06/2026" })], config, [], {});
    expect(out.validItems[0].ngayBatDau).toBe("2026-06-01");
  });

  it("ngày dạng serial của Excel được đổi sang ISO", () => {
    const out = validateAndBuild([row(2, { ma: "A", ngayBatDau: 46174 })], config, [], {});
    expect(out.validItems[0].ngayBatDau).toBe("2026-06-01");
  });

  it("ngày sai định dạng thì báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "A", ngayBatDau: "31/02/2026" })], config, [], {});
    expect(out.results[0].errors).toContain("Ngày bắt đầu không đúng định dạng ngày/tháng/năm");
  });

  it("enum nhận cả nhãn tiếng Việt lẫn giá trị", () => {
    const a = validateAndBuild([row(2, { ma: "A", loai: "Chi phí" })], config, [], {});
    const b = validateAndBuild([row(2, { ma: "A", loai: "DOANH_THU" })], config, [], {});
    expect(a.validItems[0].loai).toBe("CHI_PHI");
    expect(b.validItems[0].loai).toBe("DOANH_THU");
  });

  it("enum sai giá trị thì báo lỗi kèm danh sách cho phép", () => {
    const out = validateAndBuild([row(2, { ma: "A", loai: "XYZ" })], config, [], {});
    expect(out.results[0].errors[0]).toContain("Loại chỉ nhận:");
    expect(out.results[0].errors[0]).toContain("Chi phí");
  });

  it("boolean nhận Có/Không", () => {
    const out = validateAndBuild([row(2, { ma: "A", trangThai: "Có" })], config, [], {});
    expect(out.validItems[0].trangThai).toBe(true);
  });

  it('boolean nhận "Không" → false', () => {
    const out = validateAndBuild([row(2, { ma: "A", trangThai: "Không" })], config, [], {});
    expect(out.validItems[0].trangThai).toBe(false);
  });

  it("boolean giá trị không nhận diện được thì báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "A", trangThai: "maybe" })], config, [], {});
    expect(out.results[0].errors).toContain("Trạng thái chỉ nhận Có hoặc Không");
  });

  it("enumList tất cả phần tử hợp lệ", () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", phanLoai: "Chi phí, DOANH_THU" })],
      config,
      [],
      {},
    );
    expect(out.hasErrors).toBe(false);
    expect(out.validItems[0].phanLoai).toEqual(["CHI_PHI", "DOANH_THU"]);
  });

  it("enumList có phần tử không hợp lệ thì báo lỗi và không đưa mảng dở dang vào payload", () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", phanLoai: "Chi phí, XYZ" })],
      config,
      [],
      {},
    );
    expect(out.results[0].errors[0]).toContain("Phân loại chỉ nhận:");
    expect(out.results[0].payload).toBeNull();
    expect(out.validItems).toEqual([]);
  });
});

describe("validateAndBuild — cột tham chiếu", () => {
  const config: ImportDanhMucConfig = {
    ...simpleConfig,
    columns: [
      { key: "ma", header: "Mã dự án", required: true },
      {
        key: "chuDauTu",
        header: "Mã chủ đầu tư",
        ref: {
          service: noopService,
          matchBy: "ma",
          label: "Chủ đầu tư",
          assign: (found) => ({ chuDauTuId: found.id }),
        },
      },
    ],
  };

  const refData = { chuDauTu: [{ id: "cdt-1", ma: "CDT01", ten: "Công ty A" }] };

  it("dò được mã thì gán id vào payload", () => {
    const out = validateAndBuild([row(2, { ma: "DA01", chuDauTu: "CDT01" })], config, [], refData);
    expect(out.validItems[0]).toEqual({ ma: "DA01", chuDauTuId: "cdt-1" });
  });

  it("dò không ra thì báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "DA01", chuDauTu: "XXX" })], config, [], refData);
    expect(out.results[0].errors).toContain('Chủ đầu tư "XXX" không tồn tại');
  });

  it("ô rỗng ở cột tham chiếu không bắt buộc thì bỏ qua, không báo lỗi", () => {
    const out = validateAndBuild([row(2, { ma: "DA01", chuDauTu: "" })], config, [], refData);
    expect(out.hasErrors).toBe(false);
    expect(out.validItems[0]).toEqual({ ma: "DA01" });
  });

  it('ô rỗng ở cột tham chiếu bắt buộc thì báo "Thiếu ...", không phải "không tồn tại"', () => {
    const requiredRefConfig: ImportDanhMucConfig = {
      ...config,
      columns: [
        { key: "ma", header: "Mã dự án", required: true },
        { ...config.columns[1], required: true },
      ],
    };
    const out = validateAndBuild(
      [row(2, { ma: "DA01", chuDauTu: "" })],
      requiredRefConfig,
      [],
      refData,
    );
    expect(out.results[0].errors).toEqual(["Thiếu Mã chủ đầu tư"]);
  });

  it('nhận giá trị dạng "MÃ - Tên" do người dùng chọn từ danh sách thả xuống', () => {
    const out = validateAndBuild(
      [row(2, { ma: "DA01", chuDauTu: "CDT01 - Công ty A" })],
      config,
      [],
      refData,
    );
    expect(out.validItems[0].chuDauTuId).toBe("cdt-1");
  });

  it("cột tham chiếu nhiều giá trị tách theo dấu phẩy", () => {
    const multiConfig: ImportDanhMucConfig = {
      ...simpleConfig,
      columns: [
        { key: "ma", header: "Mã", required: true },
        {
          key: "hoSo",
          header: "Hồ sơ chứng từ",
          ref: {
            service: noopService,
            matchBy: "ma",
            label: "Hồ sơ chứng từ",
            multi: true,
            assign: (found) => ({
              hoSoChungTu: found.map((f) => ({
                id: f.id,
                ma: f.ma,
                ten: f.ten,
              })),
            }),
          },
        },
      ],
    };
    const hoSoRefData = {
      hoSo: [
        { id: "1", ma: "HS01", ten: "Hóa đơn" },
        { id: "2", ma: "HS02", ten: "Phiếu nhập" },
      ],
    };
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01, HS02" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "1", ma: "HS01", ten: "Hóa đơn" },
      { id: "2", ma: "HS02", ten: "Phiếu nhập" },
    ]);
  });
});

describe("validateAndBuild — cột tham chiếu nhiều giá trị, tên có chứa dấu phẩy (Fix 5, dò mã theo pool)", () => {
  const multiConfig: ImportDanhMucConfig = {
    ...simpleConfig,
    columns: [
      { key: "ma", header: "Mã", required: true },
      {
        key: "hoSo",
        header: "Hồ sơ chứng từ",
        ref: {
          service: noopService,
          matchBy: "ma",
          label: "Hồ sơ chứng từ",
          displayField: "ten",
          multi: true,
          assign: (found) => ({
            hoSoChungTu: found.map((f) => ({ id: f.id, ma: f.ma, ten: f.ten })),
          }),
        },
      },
    ],
  };
  const hoSoRefData = {
    hoSo: [
      { id: "1", ma: "HS01", ten: "Hóa đơn GTGT, bảng kê" },
      { id: "2", ma: "HS02", ten: "Biên bản bàn giao" },
    ],
  };

  it('một giá trị dạng "MÃ - Tên" do dropdown sinh ra, TÊN chứa dấu phẩy: không bị cắt thành hai mã giả', () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01 - Hóa đơn GTGT, bảng kê" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "1", ma: "HS01", ten: "Hóa đơn GTGT, bảng kê" },
    ]);
  });

  it("nhiều giá trị đều ở dạng mã trần", () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01,HS02" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "1", ma: "HS01", ten: "Hóa đơn GTGT, bảng kê" },
      { id: "2", ma: "HS02", ten: "Biên bản bàn giao" },
    ]);
  });

  it('nhiều giá trị đều ở dạng hiển thị "MÃ - Tên"', () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01 - Hóa đơn GTGT, bảng kê,HS02 - Biên bản bàn giao" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "1", ma: "HS01", ten: "Hóa đơn GTGT, bảng kê" },
      { id: "2", ma: "HS02", ten: "Biên bản bàn giao" },
    ]);
  });

  it('trộn lẫn: một mã trần và một giá trị dạng hiển thị có tên chứa dấu phẩy', () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS02,HS01 - Hóa đơn GTGT, bảng kê" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "2", ma: "HS02", ten: "Biên bản bàn giao" },
      { id: "1", ma: "HS01", ten: "Hóa đơn GTGT, bảng kê" },
    ]);
  });

  it("mã không dò được vẫn báo lỗi (không bị nuốt bởi việc gộp theo tên có dấu phẩy)", () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01,HS99" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.results[0].errors).toContain('Hồ sơ chứng từ "HS99" không tồn tại');
    expect(out.results[0].payload).toBeNull();
  });

  it('dạng hiển thị theo sau bởi một MÃ TRẦN khác: không được nuốt mã trần vào tên phần tử trước (bug đang sửa)', () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01 - Hóa đơn GTGT,HS02" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "1", ma: "HS01", ten: "Hóa đơn GTGT, bảng kê" },
      { id: "2", ma: "HS02", ten: "Biên bản bàn giao" },
    ]);
  });

  it('mã trần, rồi dạng hiển thị, rồi lại mã trần: cả 3 phần tử đều được nhận diện (bug đang sửa)', () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS02,HS01 - Hóa đơn GTGT,HS02" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "2", ma: "HS02", ten: "Biên bản bàn giao" },
      { id: "1", ma: "HS01", ten: "Hóa đơn GTGT, bảng kê" },
      { id: "2", ma: "HS02", ten: "Biên bản bàn giao" },
    ]);
  });

  it('một mảnh trần không dò được đứng ngay sau một phần tử dạng hiển thị hợp lệ: phải báo lỗi riêng, không bị nuốt câm thành phần nối tiếp tên', () => {
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01 - Hóa đơn GTGT,HS99" })],
      multiConfig,
      [],
      hoSoRefData,
    );
    expect(out.results[0].errors).toContain('Hồ sơ chứng từ "HS99" không tồn tại');
    expect(out.results[0].payload).toBeNull();
  });
});

describe("validateAndBuild — khóa trùng dựng từ giá trị đã quy đổi", () => {
  it('cột uniqueBy kiểu enum: nhãn tiếng Việt và giá trị thô phải bị coi là trùng nhau', () => {
    const config: ImportDanhMucConfig = {
      ...simpleConfig,
      uniqueBy: ["loai"],
      columns: [
        { key: "ma", header: "Mã", required: true },
        {
          key: "loai",
          header: "Loại",
          type: "enum",
          required: true,
          enumValues: [
            { label: "Chi phí", value: "CHI_PHI" },
            { label: "Doanh thu", value: "DOANH_THU" },
          ],
        },
      ],
    };
    const out = validateAndBuild(
      [
        row(2, { ma: "A", loai: "Chi phí" }),
        row(3, { ma: "B", loai: "CHI_PHI" }),
      ],
      config,
      [],
      {},
    );
    expect(out.results[0].errors).toEqual([]);
    expect(out.results[1].errors).toContain("Mã bị trùng với dòng 2 trong file");
  });

  it('cột uniqueBy kiểu tham chiếu: ô dạng "MÃ - Tên" phải khớp với bản ghi đã có chỉ lưu "MÃ"', () => {
    const config: ImportDanhMucConfig = {
      ...simpleConfig,
      uniqueBy: ["loaiGiaoDich"],
      columns: [
        { key: "ma", header: "Mã", required: true },
        {
          key: "loaiGiaoDich",
          header: "Loại giao dịch",
          required: true,
          ref: {
            service: noopService,
            matchBy: "ma",
            label: "Loại giao dịch",
            assign: (found) => ({ loaiGiaoDichId: found.id }),
          },
        },
      ],
    };
    const refData = {
      loaiGiaoDich: [{ id: "lgd-1", ma: "LGD01", ten: "Thu tiền bán hàng" }],
    };
    const existingData = [{ id: "x", loaiGiaoDich: "LGD01" }];
    const out = validateAndBuild(
      [row(2, { ma: "A", loaiGiaoDich: "LGD01 - Thu tiền bán hàng" })],
      config,
      existingData,
      refData,
    );
    expect(out.results[0].errors).toContain("Mã đã tồn tại trong hệ thống");
  });
});

describe("validateAndBuild — display dựng từ giá trị đã quy đổi", () => {
  it("cột ngày trong 2 cột đầu hiển thị ISO đã quy đổi, không phải số serial thô", () => {
    const config: ImportDanhMucConfig = {
      ...simpleConfig,
      uniqueBy: ["ma"],
      columns: [
        { key: "ma", header: "Mã", required: true },
        { key: "ngay", header: "Ngày", type: "date" },
      ],
    };
    const out = validateAndBuild([row(2, { ma: "A", ngay: 46174 })], config, [], {});
    expect(out.results[0].display).toBe("A — 2026-06-01");
  });
});

describe("excelSerialToISO", () => {
  it("đổi serial 46174 thành 2026-06-01", () => {
    expect(excelSerialToISO(46174)).toBe("2026-06-01");
  });
});
