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
    const out = validateAndBuild(
      [row(2, { ma: "DVT01", ten: "Cái" })],
      simpleConfig,
      [{ id: "1", ma: "dvt01", ten: "Cái cũ" }] as unknown as RefItem[],
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
    const out = validateAndBuild(
      [row(2, { ma: "A", hoSo: "HS01, HS02" })],
      multiConfig,
      [],
      {
        hoSo: [
          { id: "1", ma: "HS01", ten: "Hóa đơn" },
          { id: "2", ma: "HS02", ten: "Phiếu nhập" },
        ] as unknown as RefItem[],
      },
    );
    expect(out.validItems[0].hoSoChungTu).toEqual([
      { id: "1", ma: "HS01", ten: "Hóa đơn" },
      { id: "2", ma: "HS02", ten: "Phiếu nhập" },
    ]);
  });
});

describe("excelSerialToISO", () => {
  it("đổi serial 46174 thành 2026-06-01", () => {
    expect(excelSerialToISO(46174)).toBe("2026-06-01");
  });
});
