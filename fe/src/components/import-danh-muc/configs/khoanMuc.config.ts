import { nhomKhoanMucService } from "@/services/nhomKhoanMucService";
import { khoanMucCompleteSource } from "./completeSetSources";
import type { ImportDanhMucConfig } from "../types";

export const khoanMucImportConfig: ImportDanhMucConfig = {
  title: "Khoản mục",
  resource: "khoan-muc",
  // Fix 1: KHÔNG dùng khoanMucService (getAll() bị giới hạn 100 dòng) — xem completeSetSources.ts.
  service: khoanMucCompleteSource,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã khoản mục", required: true, example: "KM01" },
    { key: "ten", header: "Tên khoản mục", required: true, example: "Chi phí văn phòng" },
    {
      key: "loai",
      header: "Loại",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Chi phí", value: "CHI_PHI" },
        { label: "Doanh thu", value: "DOANH_THU" },
      ],
      example: "Chi phí",
    },
    {
      key: "nhom",
      header: "Nhóm",
      // Danh mục lưu MÃ nhóm. Trước 02/09/2026 cột này không có `ref` nên ô Excel
      // lọt xuống DB nguyên văn — người dùng gõ tên nhóm là mọi chỗ lọc theo mã
      // (rõ nhất: ô Khoản mục của Quy chuẩn hạch toán) im lặng trống trơn.
      // `matchAlso` nhận cả tên để file cũ vẫn nhập được, nhưng vẫn quy về mã.
      ref: {
        service: nhomKhoanMucService,
        matchBy: "ma",
        matchAlso: ["ten"],
        label: "Nhóm khoản mục",
        displayField: "ten",
        assign: (found) => ({ nhom: found.ma }),
      },
      example: "",
    },
    {
      key: "loaiChiPhi",
      header: "Loại chi phí",
      type: "enum",
      enumValues: [
        { label: "Cố định", value: "CO_DINH", aliases: ["Chi phí cố định"] },
        { label: "Biến đổi", value: "BIEN_DOI", aliases: ["Chi phí biến đổi"] },
      ],
      example: "Cố định",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
