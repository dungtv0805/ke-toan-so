import { hopDongService } from "@/services/hopDongService";
import { doiTuongService } from "@/services/doiTuongService";
import type { ImportDanhMucConfig } from "../types";

// Chỉ import các trường phẳng; phụ lục, điều khoản thanh toán, bảo hành,
// tiến độ thi công vẫn nhập tay trên form (cố ý ngoài phạm vi).
export const hopDongImportConfig: ImportDanhMucConfig = {
  title: "Hợp đồng",
  resource: "hop-dong",
  service: hopDongService,
  uniqueBy: ["soHopDong"],
  columns: [
    { key: "soHopDong", header: "Số hợp đồng", required: true, example: "HD-2026-001" },
    { key: "tenCongTrinh", header: "Tên công trình", required: true, example: "Nhà xưởng số 1" },
    { key: "nam", header: "Năm", type: "number", example: "2026" },
    { key: "giaTriSauThue", header: "Giá trị sau thuế", type: "number", example: "1500000000" },
    { key: "ngayKy", header: "Ngày ký", type: "date", example: "01/06/2026" },
    {
      key: "doiTuong",
      header: "Mã đối tượng",
      example: "KH01",
      ref: {
        service: doiTuongService,
        matchBy: "ma",
        label: "Đối tượng",
        displayField: "ten",
        assign: (found) => ({ doiTuongId: found.id }),
      },
    },
    { key: "nguoiKy", header: "Người ký", example: "Nguyễn Văn A" },
    { key: "chucVu", header: "Chức vụ", example: "Giám đốc" },
    { key: "nguoiGiaoDich", header: "Người giao dịch", example: "Trần Thị B" },
    {
      key: "trangThai",
      header: "Trạng thái",
      type: "enum",
      enumValues: [
        { label: "Chưa có HĐ", value: "CHUA_CO_HD" },
        { label: "HĐ chưa ký", value: "HD_CHUA_KY" },
        { label: "HĐ photo/scan", value: "HD_PHOTO_SCAN" },
        { label: "HĐ gốc", value: "HD_GOC" },
      ],
      example: "HĐ gốc",
    },
    { key: "soLuongLuu", header: "Số lượng lưu", type: "number", example: "1" },
  ],
};
