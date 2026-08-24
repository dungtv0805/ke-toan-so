import { nhomDongTienService } from "@/services/nhomDongTienService";
import type { ImportDanhMucConfig } from "../types";

export const nhomDongTienImportConfig: ImportDanhMucConfig = {
  title: "Nhóm dòng tiền",
  resource: "nhom-dong-tien",
  service: nhomDongTienService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm dòng tiền", required: true, example: "NDT01" },
    { key: "ten", header: "Tên nhóm dòng tiền", required: true, example: "Dòng tiền bán hàng" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
