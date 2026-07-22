import { nganHangService } from "@/services/nganHangService";
import type { ImportDanhMucConfig } from "../types";

export const nganHangImportConfig: ImportDanhMucConfig = {
  title: "Ngân hàng & Quỹ",
  resource: "ngan-hang",
  service: nganHangService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã", required: true, example: "NH01" },
    { key: "ten", header: "Tên", required: true, example: "Tài khoản Vietcombank" },
    {
      key: "loai",
      header: "Loại",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Tiền mặt", value: "TIEN_MAT" },
        { label: "Ngân hàng", value: "NGAN_HANG" },
      ],
      example: "Ngân hàng",
    },
    { key: "soDu", header: "Số dư", type: "number", example: "0" },
    { key: "nganHang", header: "Tên ngân hàng", example: "Vietcombank" },
    { key: "soTaiKhoan", header: "Số tài khoản", example: "0011001234567" },
    { key: "chiNhanh", header: "Chi nhánh", example: "Hà Nội" },
    { key: "chuTaiKhoan", header: "Chủ tài khoản", example: "Công ty A" },
    { key: "trangThai", header: "Đang hoạt động", type: "boolean", example: "Có" },
  ],
};
