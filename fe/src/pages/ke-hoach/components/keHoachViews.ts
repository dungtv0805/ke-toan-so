import type { ChiTieu, KeHoachDimension } from "@/services/keHoachService";

export interface ViewOption {
  value: "list" | KeHoachDimension;
  label: string;
}

/**
 * Khung nhìn của màn hình — giống "Dữ liệu tổng hợp": một lưới nhập liệu và các
 * báo cáo tổng hợp theo chiều, ở đây mỗi báo cáo đều so kế hoạch với thực hiện.
 */
export const KE_HOACH_VIEWS: ViewOption[] = [
  { value: "list", label: "Dòng kế hoạch" },
  { value: "account", label: "So sánh theo tài khoản" },
  { value: "khoan-muc", label: "So sánh theo khoản mục" },
  { value: "nhom-khoan-muc", label: "So sánh theo nhóm khoản mục" },
  { value: "project", label: "So sánh theo dự án" },
  { value: "investor", label: "So sánh theo chủ đầu tư" },
  { value: "product", label: "So sánh theo sản phẩm" },
  { value: "department", label: "So sánh theo bộ phận" },
  { value: "team", label: "So sánh theo đội" },
  { value: "employee", label: "So sánh theo nhân viên" },
  { value: "doi-tuong", label: "So sánh theo đối tượng" },
  { value: "cash-flow", label: "So sánh theo dòng tiền" },
  { value: "management-group", label: "So sánh theo nhóm quản lý" },
];

export const CHI_TIEU_OPTIONS: { value: ChiTieu; label: string }[] = [
  { value: "tong", label: "Tổng số tiền" },
  { value: "doanhThu", label: "Doanh thu (Có 5xx)" },
  { value: "chiPhi", label: "Chi phí (Nợ 6xx)" },
  { value: "loiNhuan", label: "Lợi nhuận (DT − CP)" },
];
