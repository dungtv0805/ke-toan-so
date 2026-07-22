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
        { label: "Phiếu thu", value: "THU" },
        { label: "Phiếu chi", value: "CHI" },
        { label: "Nhật ký chung", value: "KHAC" },
      ],
      example: "Phiếu thu",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
