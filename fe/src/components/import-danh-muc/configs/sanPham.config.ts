import { sanPhamService } from "@/services/sanPhamService";
import type { ImportDanhMucConfig } from "../types";

export const sanPhamImportConfig: ImportDanhMucConfig = {
  title: "Sản phẩm",
  resource: "san-pham",
  service: sanPhamService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã sản phẩm", required: true, example: "SP01" },
    { key: "ten", header: "Tên sản phẩm", required: true, example: "Bàn làm việc" },
    { key: "donVi", header: "Đơn vị", example: "Cái" },
    { key: "giaBan", header: "Giá bán", type: "number", example: "1500000" },
    { key: "nhom", header: "Nhóm", example: "Nội thất" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
