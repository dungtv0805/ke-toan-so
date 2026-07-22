import { chuDauTuService } from "@/services/chuDauTuService";
import type { ImportDanhMucConfig } from "../types";

export const chuDauTuImportConfig: ImportDanhMucConfig = {
  title: "Chủ đầu tư",
  resource: "chu-dau-tu",
  service: chuDauTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã chủ đầu tư", required: true, example: "CDT01" },
    { key: "ten", header: "Tên chủ đầu tư", required: true, example: "Công ty A" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
