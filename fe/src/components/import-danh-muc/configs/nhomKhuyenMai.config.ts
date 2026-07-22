import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import type { ImportDanhMucConfig } from "../types";

export const nhomKhuyenMaiImportConfig: ImportDanhMucConfig = {
  title: "Nhóm khuyến mại",
  resource: "nhom-khuyen-mai",
  service: nhomKhuyenMaiService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm khuyến mại", required: true, example: "KM01" },
    { key: "ten", header: "Tên nhóm khuyến mại", required: true, example: "Khuyến mại hè" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
