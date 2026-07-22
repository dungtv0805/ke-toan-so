import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import type { ImportDanhMucConfig } from "../types";

export const nhomQuanLyImportConfig: ImportDanhMucConfig = {
  title: "Nhóm quản lý",
  resource: "nhom-quan-ly",
  service: nhomQuanLyService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm quản lý", required: true, example: "NQL01" },
    { key: "ten", header: "Tên nhóm quản lý", required: true, example: "Khối văn phòng" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
