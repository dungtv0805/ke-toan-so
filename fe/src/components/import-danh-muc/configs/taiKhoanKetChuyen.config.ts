import { taiKhoanKetChuyenService } from "@/services/taiKhoanKetChuyenService";
import type { ImportDanhMucConfig } from "../types";

export const taiKhoanKetChuyenImportConfig: ImportDanhMucConfig = {
  title: "Tài khoản kết chuyển",
  resource: "tai-khoan-ket-chuyen",
  service: taiKhoanKetChuyenService,
  uniqueBy: ["ma"],
  columns: [
    { key: "thuTu", header: "Thứ tự kết chuyển", required: true, example: "10" },
    { key: "ma", header: "Mã kết chuyển", required: true, example: "511-911" },
    { key: "taiKhoanTu", header: "Kết chuyển từ", required: true, example: "511" },
    // Snapshot tên tài khoản: entity giữ hai field này để danh sách vẫn đọc được tên
    // kể cả khi danh mục Tài khoản đổi tên sau đó. Không bắt buộc để file cũ vẫn nhập được.
    { key: "tenTaiKhoanTu", header: "Tên tài khoản kết chuyển từ", example: "Doanh thu bán hàng và cung cấp dịch vụ" },
    { key: "taiKhoanDen", header: "Kết chuyển đến", required: true, example: "911" },
    { key: "tenTaiKhoanDen", header: "Tên tài khoản kết chuyển đến", example: "Xác định kết quả kinh doanh" },
    { key: "ben", header: "Bên kết chuyển (NO/CO/HAI_BEN)", required: true, example: "CO" },
    { key: "dienGiai", header: "Diễn giải", example: "Kết chuyển doanh thu bán hàng và cung cấp dịch vụ" },
  ],
};
