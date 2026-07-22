import { donViTinhService } from "@/services/donViTinhService";
import type { ImportDanhMucConfig } from "../types";

export const donViTinhImportConfig: ImportDanhMucConfig = {
  title: "Đơn vị tính",
  resource: "don-vi-tinh",
  service: donViTinhService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã đơn vị tính", required: true, example: "DVT01" },
    { key: "ten", header: "Tên đơn vị tính", required: true, example: "Cái" },
    { key: "moTa", header: "Mô tả", example: "Đơn vị đếm" },
  ],
};
