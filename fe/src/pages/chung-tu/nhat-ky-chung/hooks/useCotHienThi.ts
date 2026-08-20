import { useMemo } from "react";
import { readSavedKeys } from "@/components/table/columnVisibility";
import { NKC_COT_PAGE_KEY, taoBoLocTruong } from "../truongTheoCot";

/**
 * Trả `hienTruong(ten)` cho trang Thêm/Sửa chứng từ — theo đúng các cột đang
 * hiện ở bảng "Dữ liệu tổng hợp".
 *
 * Đọc thẳng lựa chọn đã lưu (localStorage) chứ không qua state: trang form là
 * route riêng, mỗi lần vào là mount mới nên luôn lấy được lựa chọn mới nhất, mà
 * cũng không cần handler của trang danh sách (không mount ở route này).
 */
export function useCotHienThi(): (truong: string) => boolean {
  return useMemo(() => taoBoLocTruong(readSavedKeys(NKC_COT_PAGE_KEY)), []);
}
