import { khoanMucService } from "@/services/khoanMucService";
import type { ImportDanhMucConfig } from "../types";

export const khoanMucImportConfig: ImportDanhMucConfig = {
  title: "Khoản mục",
  resource: "khoan-muc",
  service: khoanMucService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã khoản mục", required: true, example: "KM01" },
    { key: "ten", header: "Tên khoản mục", required: true, example: "Chi phí văn phòng" },
    {
      key: "loai",
      header: "Loại",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Chi phí", value: "CHI_PHI" },
        { label: "Doanh thu", value: "DOANH_THU" },
      ],
      example: "Chi phí",
    },
    { key: "nhom", header: "Nhóm", example: "" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
