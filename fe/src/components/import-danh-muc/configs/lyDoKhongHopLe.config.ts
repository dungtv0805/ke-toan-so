import { lyDoKhongHopLeService } from "@/services/lyDoKhongHopLeService";
import type { ImportDanhMucConfig } from "../types";

export const lyDoKhongHopLeImportConfig: ImportDanhMucConfig = {
  title: "Lý do không hợp lệ",
  resource: "ly-do-khong-hop-le",
  service: lyDoKhongHopLeService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã lý do", required: true, example: "LD01" },
    { key: "ten", header: "Tên lý do", required: true, example: "Thiếu hóa đơn" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
