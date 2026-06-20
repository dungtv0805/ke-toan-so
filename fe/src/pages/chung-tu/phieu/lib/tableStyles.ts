/**
 * Style dùng chung cho các bảng trong trang phiếu (Danh sách & Tổng hợp),
 * để độ dày/độ cao/khoảng cách/cỡ chữ đồng nhất.
 */

// Khung ngoài bảng.
export const TABLE_CONTAINER = "rounded-md border";

// Áp lên <Table> qua descendant selector: header nền xám, cao 10,
// chữ nhỏ in hoa; ô dữ liệu nén dọc (py-2.5).
export const TABLE_DENSITY =
  "[&_thead_tr]:bg-muted/50 [&_th]:h-10 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_td]:py-2.5";

// Chiều cao thống nhất cho input/select trong FilterBar (khớp button size=sm).
export const CONTROL_H = "h-9";
