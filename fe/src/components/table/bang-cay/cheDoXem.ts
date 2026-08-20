/** Hai cách nhìn một danh mục có nhóm. */
export type CheDoXem = "cay" | "danhSach";

export const CHE_DO_MAC_DINH: CheDoXem = "cay";

/**
 * Đọc chế độ đã lưu của một trang. Giá trị lạ (người dùng sửa tay localStorage,
 * phiên bản cũ) rơi về mặc định thay vì làm bảng trắng.
 */
export const docCheDoXem = (khoa: string): CheDoXem => {
  try {
    const v = localStorage.getItem(khoa);
    return v === "cay" || v === "danhSach" ? v : CHE_DO_MAC_DINH;
  } catch {
    return CHE_DO_MAC_DINH;
  }
};

export const luuCheDoXem = (khoa: string, v: CheDoXem): void => {
  try {
    localStorage.setItem(khoa, v);
  } catch {
    // Chặn cookie/riêng tư → không lưu được thì thôi, không chặn thao tác.
  }
};
