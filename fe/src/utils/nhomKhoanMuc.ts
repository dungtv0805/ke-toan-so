import type { NhatKyChung } from "@/types";

/** Phần tử danh mục Nhóm khoản mục (chỉ cần mã/tên để hiển thị). */
export interface NhomKhoanMucItem {
  id?: string;
  ma: string;
  ten: string;
}

/**
 * Nhóm khoản mục KHÔNG phải trường nhập riêng: nó là thuộc tính `nhom` của khoản mục
 * đã chọn trên dòng hạch toán (danh mục Khoản mục lưu mã — dữ liệu cũ có thể lưu id).
 */
export const nhomKhoanMucMa = (nkc: NhatKyChung): string | undefined =>
  nkc.danhMuc?.khoanMuc?.nhom || undefined;

export const nhomKhoanMucTen = (
  nhom: string | undefined,
  danhSach: NhomKhoanMucItem[] = [],
): string => {
  if (!nhom) return "";
  const muc = danhSach.find((n) => n.ma === nhom || n.id === nhom);
  return muc?.ten ?? nhom;
};
