import { loaiChungTuService } from "@/services/loaiChungTuService";
import type { ImportDanhMucConfig } from "../types";

export const loaiChungTuImportConfig: ImportDanhMucConfig = {
  title: "Loại chứng từ",
  resource: "loai-chung-tu",
  service: loaiChungTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã loại chứng từ", required: true, example: "PT" },
    { key: "ten", header: "Tên loại chứng từ", required: true, example: "Phiếu thu" },
    {
      key: "phanLoai",
      header: "Phân loại",
      type: "enum",
      enumValues: [
        { label: "Thu", value: "THU" },
        { label: "Chi", value: "CHI" },
        { label: "Khác", value: "KHAC" },
      ],
      example: "Thu",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
