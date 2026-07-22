import { describe, it, expect } from "vitest";
import { aoaToRawRows } from "../parseRows";
import { validateAndBuild } from "../validate";
import { excelRowsOfSentItems, mapFailuresToRows } from "../mapFailures";
import type { ImportColumn, RowValidationResult } from "../../types";
import type { ImportFailure } from "@/services/importDanhMucService";

const columns: ImportColumn[] = [
  { key: "ma", header: "Mã đơn vị tính", required: true },
  { key: "ten", header: "Tên đơn vị tính", required: true },
];

describe("excelRowsOfSentItems", () => {
  it("chỉ lấy rowNumber của các dòng có payload (đã gửi lên BE), đúng thứ tự", () => {
    const results: RowValidationResult[] = [
      { rowNumber: 2, display: "a", errors: [], payload: { ma: "A" } },
      { rowNumber: 3, display: "", errors: ["Thiếu ten"], payload: null },
      { rowNumber: 4, display: "b", errors: [], payload: { ma: "B" } },
    ];
    expect(excelRowsOfSentItems(results)).toEqual([2, 4]);
  });
});

describe("mapFailuresToRows — trường hợp file có dòng trống ở giữa", () => {
  /**
   * File Excel: dòng 2,3 có dữ liệu, dòng 4 trống hoàn toàn (bị parseRows bỏ qua),
   * dòng 5,6 có dữ liệu. aoaToRawRows chỉ trả 4 dòng nhưng rowNumber thật vẫn là 2,3,5,6 —
   * đây chính là ca mà `index + 2` của BE tính sai (sẽ ra 4 thay vì 5).
   */
  const aoa = [
    ["Mã đơn vị tính", "Tên đơn vị tính"],
    ["DVT01", "Cái"],
    ["DVT02", "Hộp"],
    ["", ""],
    ["DVT03", "Thùng"],
    ["DVT04", "Bộ"],
  ];

  it("dò đúng rowNumber Excel dù dòng trống làm lệch vị trí mảng đã gửi", () => {
    const rows = aoaToRawRows(aoa, columns);
    const { results, validItems } = validateAndBuild(
      rows,
      {
        title: "Đơn vị tính",
        resource: "don-vi-tinh",
        service: { getAll: async () => [] },
        uniqueBy: ["ma"],
        columns,
      },
      [],
      {},
    );

    // 4 dòng dữ liệu thật, không có dòng lỗi nào ở FE (dòng trống đã bị bỏ qua trước đó)
    expect(validItems).toHaveLength(4);
    expect(excelRowsOfSentItems(results)).toEqual([2, 3, 5, 6]);

    // BE trả lỗi ở phần tử index 2 (0-based) trong mảng 4 item đã gửi — item đó ứng với
    // dòng Excel 5, KHÔNG phải dòng 4 (dòng trống đã bị bỏ, không hề được gửi lên BE).
    const failures: ImportFailure[] = [
      { index: 2, message: "Mã DVT03 đã tồn tại" },
    ];
    const byRow = mapFailuresToRows(results, failures);

    expect(byRow.get(5)).toBe("Mã DVT03 đã tồn tại");
    expect(byRow.has(4)).toBe(false);
    expect(byRow.size).toBe(1);
  });

  it("bỏ qua failure có index vượt quá số dòng đã gửi (phòng vệ)", () => {
    const rows = aoaToRawRows(aoa, columns);
    const { results } = validateAndBuild(
      rows,
      {
        title: "Đơn vị tính",
        resource: "don-vi-tinh",
        service: { getAll: async () => [] },
        uniqueBy: ["ma"],
        columns,
      },
      [],
      {},
    );

    const byRow = mapFailuresToRows(results, [
      { index: 99, message: "không tồn tại" },
    ]);
    expect(byRow.size).toBe(0);
  });
});
