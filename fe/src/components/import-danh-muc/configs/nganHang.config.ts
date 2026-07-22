import { nganHangCompleteSource } from "./completeSetSources";
import type { ImportDanhMucConfig } from "../types";

export const nganHangImportConfig: ImportDanhMucConfig = {
  title: "Ngân hàng & Quỹ",
  resource: "ngan-hang",
  // Fix 1: KHÔNG dùng nganHangService (getAll() bị giới hạn 100 dòng) — xem completeSetSources.ts.
  service: nganHangCompleteSource,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã", required: true, example: "NH01" },
    { key: "ten", header: "Tên", required: true, example: "Tài khoản Vietcombank" },
    {
      key: "loai",
      header: "Loại",
      required: true,
      type: "enum",
      // Cố ý CHỈ có NGAN_HANG, dù backend DTO còn chấp nhận TIEN_MAT: trang này
      // (NganHangPage) chỉ lọc và tạo mới với loai: "NGAN_HANG" — không có trang
      // nào hiển thị/sửa được TIEN_MAT. Nếu cho import TIEN_MAT, dòng sẽ được BE
      // chấp nhận nhưng biến mất khỏi bảng ngay khi tải lại, không có lỗi/cảnh báo
      // nào giải thích. Đừng "nới lại" enum này nếu chưa có trang liệt kê TIEN_MAT.
      enumValues: [{ label: "Ngân hàng", value: "NGAN_HANG" }],
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
