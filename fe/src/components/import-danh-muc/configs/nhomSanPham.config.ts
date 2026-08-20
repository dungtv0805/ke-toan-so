import { nhomSanPhamService } from "@/services/nhomSanPhamService";
import type { ImportDanhMucConfig } from "../types";

export const nhomSanPhamImportConfig: ImportDanhMucConfig = {
  title: "Nhóm sản phẩm",
  resource: "nhom-san-pham",
  service: nhomSanPhamService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã nhóm sản phẩm", required: true, example: "NSP01" },
    { key: "ten", header: "Tên nhóm sản phẩm", required: true, example: "Dịch vụ" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
