import { nhomKhoanMucService } from "@/services/nhomKhoanMucService";
import type { ImportDanhMucConfig } from "../types";

export const nhomKhoanMucImportConfig: ImportDanhMucConfig = {
  title: "Nhóm khoản mục",
  resource: "nhom-khoan-muc",
  service: nhomKhoanMucService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm khoản mục", required: true, example: "NKM01" },
    { key: "ten", header: "Tên nhóm khoản mục", required: true, example: "Chi phí bán hàng" },
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
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
