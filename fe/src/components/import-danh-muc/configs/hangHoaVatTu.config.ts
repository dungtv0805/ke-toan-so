import { hangHoaVatTuService } from "@/services/hangHoaVatTuService";
import { donViTinhService } from "@/services/donViTinhService";
import { nhomVatTuService } from "@/services/nhomVatTuService";
import type { ImportDanhMucConfig } from "../types";

export const hangHoaVatTuImportConfig: ImportDanhMucConfig = {
  title: "Hàng hóa vật tư",
  resource: "hang-hoa-vat-tu",
  service: hangHoaVatTuService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã hàng hóa", required: true, example: "HH01" },
    { key: "ten", header: "Tên hàng hóa", required: true, example: "Gạo tẻ" },
    {
      key: "tinhChat",
      header: "Tính chất",
      type: "enum",
      enumValues: [
        { label: "Tài sản", value: "TAI_SAN" },
        { label: "Hàng hóa", value: "HANG_HOA" },
        { label: "Nguyên liệu", value: "NGUYEN_LIEU" },
      ],
      example: "Hàng hóa",
    },
    {
      key: "donViTinh",
      header: "Mã đơn vị tính",
      example: "DVT01",
      ref: {
        service: donViTinhService,
        matchBy: "ma",
        label: "Đơn vị tính",
        displayField: "ten",
        assign: (found) => ({
          donViTinhMa: String(found.ma ?? ""),
          donViTinhTen: String(found.ten ?? ""),
        }),
      },
    },
    {
      key: "nhomVatTu",
      header: "Mã nhóm vật tư",
      example: "NVT01",
      ref: {
        service: nhomVatTuService,
        matchBy: "ma",
        label: "Nhóm vật tư",
        displayField: "ten",
        assign: (found) => ({
          nhomVatTuMa: String(found.ma ?? ""),
          nhomVatTuTen: String(found.ten ?? ""),
        }),
      },
    },
    { key: "quyCach", header: "Quy cách", example: "Bao 50kg" },
    { key: "tkKho", header: "Tài khoản kho", example: "1561" },
    { key: "donGia", header: "Đơn giá", type: "number", example: "20000" },
    {
      key: "cachXuat",
      header: "Cách xuất",
      type: "enum",
      enumValues: [
        { label: "Định lượng", value: "DINH_LUONG" },
        { label: "Theo suất", value: "THEO_SUAT" },
        { label: "Đơn vị", value: "DON_VI" },
      ],
      example: "",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
