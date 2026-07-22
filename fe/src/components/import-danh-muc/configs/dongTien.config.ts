import { dongTienService } from "@/services/dongTienService";
import type { ImportDanhMucConfig } from "../types";

export const dongTienImportConfig: ImportDanhMucConfig = {
  title: "Dòng tiền",
  resource: "dong-tien",
  service: dongTienService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã dòng tiền", required: true, example: "DT01" },
    { key: "ten", header: "Tên dòng tiền", required: true, example: "Thu bán hàng" },
    {
      key: "loai",
      header: "Loại hoạt động",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Hoạt động kinh doanh", value: "KINH_DOANH" },
        { label: "Hoạt động đầu tư", value: "DAU_TU" },
        { label: "Hoạt động tài chính", value: "TAI_CHINH" },
      ],
      example: "Hoạt động kinh doanh",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
