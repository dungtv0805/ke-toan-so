import { duAnService } from "@/services/duAnService";
import { chuDauTuService } from "@/services/chuDauTuService";
import type { ImportDanhMucConfig } from "../types";

export const duAnImportConfig: ImportDanhMucConfig = {
  title: "Dự án",
  resource: "du-an",
  service: duAnService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã dự án", required: true, example: "DA01" },
    { key: "ten", header: "Tên dự án", required: true, example: "Dự án Khu A" },
    { key: "ngayBatDau", header: "Ngày bắt đầu", type: "date", example: "01/06/2026" },
    { key: "ngayKetThuc", header: "Ngày kết thúc", type: "date", example: "31/12/2026" },
    {
      key: "chuDauTu",
      header: "Mã chủ đầu tư",
      example: "CDT01",
      ref: {
        service: chuDauTuService,
        matchBy: "ma",
        label: "Chủ đầu tư",
        displayField: "ten",
        assign: (found) => ({ chuDauTuId: found.id }),
      },
    },
    { key: "chuDuAn", header: "Chủ dự án", example: "Nguyễn Văn A" },
    {
      key: "trangThai",
      header: "Trạng thái",
      type: "enum",
      enumValues: [
        { label: "Đang thực hiện", value: "DANG_THUC_HIEN" },
        { label: "Hoàn thành", value: "HOAN_THANH" },
        { label: "Tạm dừng", value: "TAM_DUNG" },
      ],
      example: "Đang thực hiện",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
