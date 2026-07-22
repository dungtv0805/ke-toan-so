import { khoService } from "@/services/khoService";
import type { ImportDanhMucConfig } from "../types";

export const khoImportConfig: ImportDanhMucConfig = {
  title: "Kho",
  resource: "kho",
  service: khoService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã kho", required: true, example: "K01" },
    { key: "ten", header: "Tên kho", required: true, example: "Kho tổng" },
    { key: "diaChi", header: "Địa chỉ", example: "Số 1 Trần Duy Hưng" },
    { key: "thuKho", header: "Thủ kho", example: "Nguyễn Văn A" },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
