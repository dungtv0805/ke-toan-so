import { hoSoChungTuService } from "@/services/hoSoChungTuService";
import type { ImportDanhMucConfig } from "../types";

export const hoSoChungTuImportConfig: ImportDanhMucConfig = {
  title: "Hồ sơ chứng từ",
  resource: "ho-so-chung-tu",
  service: hoSoChungTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã hồ sơ", required: true, example: "HS01" },
    { key: "ten", header: "Tên hồ sơ", required: true, example: "Hóa đơn GTGT" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
