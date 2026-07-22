import { nhomVatTuService } from "@/services/nhomVatTuService";
import type { ImportDanhMucConfig } from "../types";

export const nhomVatTuImportConfig: ImportDanhMucConfig = {
  title: "Nhóm vật tư",
  resource: "nhom-vat-tu",
  service: nhomVatTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm vật tư", required: true, example: "NVT01" },
    { key: "ten", header: "Tên nhóm vật tư", required: true, example: "Nguyên liệu" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
