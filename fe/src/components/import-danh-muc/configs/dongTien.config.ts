import { dongTienService } from "@/services/dongTienService";
import { nhomDongTienService } from "@/services/nhomDongTienService";
import type { ImportDanhMucConfig } from "../types";

export const dongTienImportConfig: ImportDanhMucConfig = {
  title: "Dòng tiền",
  resource: "dong-tien",
  service: dongTienService,
  uniqueBy: ["ma"],
  columns: [
    { key: "ma", header: "Mã dòng tiền", required: true, example: "DT01" },
    { key: "ten", header: "Tên dòng tiền", required: true, example: "Thu bán hàng" },
    {
      key: "loai",
      header: "Loại hoạt động",
      required: true,
      type: "enum",
      enumValues: [
        { label: "Hoạt động kinh doanh", value: "KINH_DOANH" },
        { label: "Hoạt động đầu tư", value: "DAU_TU" },
        { label: "Hoạt động tài chính", value: "TAI_CHINH" },
      ],
      example: "Hoạt động kinh doanh",
    },
    {
      key: "nhom",
      header: "Nhóm dòng tiền",
      // Danh mục lưu MÃ nhóm. Trước 04/09/2026 cột này không có `ref` nên ô Excel
      // lọt xuống DB nguyên văn — người dùng gõ TÊN nhóm là mọi chỗ tra theo mã
      // im lặng không khớp (rõ nhất: Kế hoạch dòng tiền không suy được Thu/Chi
      // từ nhóm nên dòng chi nằm nhầm khối THU).
      // `matchAlso` nhận cả tên để file cũ vẫn nhập được, nhưng vẫn quy về mã.
      ref: {
        service: nhomDongTienService,
        matchBy: "ma",
        matchAlso: ["ten"],
        label: "Nhóm dòng tiền",
        displayField: "ten",
        assign: (found) => ({ nhom: found.ma }),
      },
      example: "NDT01",
    },
    { key: "moTa", header: "Mô tả", example: "" },
  ],
};
