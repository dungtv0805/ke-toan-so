import { doiTuongService } from "@/services/doiTuongService";
import type { ImportDanhMucConfig } from "../types";

export const doiTuongImportConfig: ImportDanhMucConfig = {
  title: "Đối tượng",
  resource: "doi-tuong",
  service: doiTuongService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã đối tượng", required: true, example: "KH01" },
    { key: "ten", header: "Tên đối tượng", required: true, example: "Công ty TNHH A" },
    {
      key: "loai",
      header: "Loại đối tượng",
      required: true,
      // Một đối tượng có thể thuộc nhiều loại — ngăn cách bằng dấu phẩy.
      type: "enumList",
      enumValues: [
        { label: "Khách hàng", value: "KHACH_HANG" },
        { label: "Nhà cung cấp", value: "NHA_CUNG_CAP" },
        { label: "Nhân viên", value: "NHAN_VIEN" },
        { label: "Nhà thầu", value: "NHA_THAU" },
      ],
      example: "Khách hàng, Nhà cung cấp",
    },
    { key: "diaChi", header: "Địa chỉ", example: "Số 1 Trần Duy Hưng" },
    { key: "soDienThoai", header: "Số điện thoại", example: "0901234567" },
    { key: "email", header: "Email", example: "lienhe@congtya.vn" },
    { key: "maSoThue", header: "Mã số thuế", example: "0101234567" },
    { key: "nguoiLienHe", header: "Người liên hệ", example: "Nguyễn Văn A" },
  ],
};
