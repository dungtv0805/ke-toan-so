/** Hai cách nhìn danh sách quy chuẩn. */
export type CheDoXem = "cay" | "danhSach";

const KHOA = "quyChuan.cheDoXem";

export const CHE_DO_MAC_DINH: CheDoXem = "cay";

/**
 * Đọc chế độ đã lưu. Giá trị lạ (người dùng sửa tay localStorage, phiên bản cũ)
 * rơi về mặc định thay vì làm bảng trắng.
 */
export const docCheDoXem = (): CheDoXem => {
  try {
    const v = localStorage.getItem(KHOA);
    return v === "cay" || v === "danhSach" ? v : CHE_DO_MAC_DINH;
  } catch {
    return CHE_DO_MAC_DINH;
  }
};

export const luuCheDoXem = (v: CheDoXem): void => {
  try {
    localStorage.setItem(KHOA, v);
  } catch {
    // Chặn cookie/riêng tư → không lưu được thì thôi, không chặn thao tác.
  }
};
