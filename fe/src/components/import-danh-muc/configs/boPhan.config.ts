import { boPhanService } from "@/services/boPhanService";
import type { ImportDanhMucConfig } from "../types";

export const boPhanImportConfig: ImportDanhMucConfig = {
  title: "Bộ phận",
  resource: "bo-phan",
  service: boPhanService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã bộ phận", required: true, example: "BP01" },
    { key: "ten", header: "Tên bộ phận", required: true, example: "Phòng Kế toán" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
