import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import { loaiChungTuService } from "@/services/loaiChungTuService";
import type { ImportDanhMucConfig } from "../types";

export const loaiGiaoDichImportConfig: ImportDanhMucConfig = {
  title: "Loại giao dịch",
  resource: "loai-giao-dich",
  service: loaiGiaoDichService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã loại giao dịch", required: true, example: "LGD01" },
    { key: "ten", header: "Tên loại giao dịch", required: true, example: "Thu tiền bán hàng" },
    {
      key: "loaiChungTu",
      header: "Mã loại chứng từ",
      example: "PT",
      ref: {
        service: loaiChungTuService,
        matchBy: "ma",
        label: "Loại chứng từ",
        displayField: "ten",
        assign: (found) => ({ loaiChungTuMa: String(found.ma ?? "") }),
      },
    },
    { key: "color", header: "Màu sắc", example: "#1677ff" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
