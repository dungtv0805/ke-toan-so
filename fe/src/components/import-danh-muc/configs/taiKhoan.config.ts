import { taiKhoanCompleteSource } from "./completeSetSources";
import type { ImportDanhMucConfig } from "../types";

export const taiKhoanImportConfig: ImportDanhMucConfig = {
  title: "Tài khoản",
  resource: "tai-khoan",
  // Fix 1: KHÔNG dùng taiKhoanService (getAll() bị giới hạn 100 dòng) — dò trùng phải thấy
  // TOÀN BỘ tài khoản hiện có, không chỉ 100 dòng đầu. Xem lý do đầy đủ ở completeSetSources.ts.
  service: taiKhoanCompleteSource,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Số tài khoản", required: true, example: "1111" },
    { key: "ten", header: "Tên tài khoản", required: true, example: "Tiền mặt VND" },
    { key: "capDo", header: "Cấp độ", required: true, type: "number", example: "2" },
    {
      key: "loai",
      header: "Loại tài khoản",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Tài sản", value: "TAI_SAN" },
        { label: "Nợ phải trả", value: "NO_PHAI_TRA" },
        { label: "Vốn chủ sở hữu", value: "VON_CHU_SO_HUU" },
        { label: "Doanh thu", value: "DOANH_THU" },
        { label: "Chi phí", value: "CHI_PHI" },
        { label: "Thu nhập khác", value: "THU_NHAP_KHAC" },
        { label: "Chi phí khác", value: "CHI_PHI_KHAC" },
        { label: "Xác định kết quả kinh doanh", value: "XAC_DINH_KQKD" },
      ],
      example: "Tài sản",
    },
    {
      key: "nhom",
      header: "Nhóm",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Nợ", value: "NO" },
        { label: "Có", value: "CO" },
        { label: "Lưỡng tính (Số dư 2 bên)", value: "LUONG_TINH" },
        { label: "Không có số dư", value: "KHONG_CO_SO_DU" },
      ],
      example: "Nợ",
    },
    {
      key: "taiKhoanCha",
      header: "Số tài khoản cha",
      example: "111",
      ref: {
        // Fix 1: cũng phải dò trên TOÀN BỘ tài khoản, không phải 100 dòng đầu.
        service: taiKhoanCompleteSource,
        matchBy: "ma",
        label: "Tài khoản cha",
        displayField: "ten",
        assign: (found) => ({ parentId: found.id }),
      },
    },
    {
      key: "chiTietTheo",
      header: "Chi tiết theo",
      type: "enum",
      enumValues: [
        { label: "Khách hàng", value: "KHACH_HANG" },
        { label: "Nhà cung cấp", value: "NHA_CUNG_CAP" },
        { label: "Nhân viên", value: "NHAN_VIEN" },
        { label: "Nhà thầu", value: "NHA_THAU" },
        { label: "Ngân hàng & Quỹ", value: "NGAN_HANG_QUY" },
      ],
      example: "",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
