const num = (v: unknown): number => Number(v) || 0;

/**
 * Giá trị một hóa đơn bán ra = tiền hàng + tiền thuế.
 * Bản ghi cũ nhập bằng Excel nhiều khi chỉ có `tong` — thiếu cả hai thành phần thì
 * rơi về `tong` để không mất số.
 */
export function tienHoaDon(h: {
  tienHang?: number;
  tienThue?: number;
  tong?: number;
}): number {
  if (h.tienHang == null && h.tienThue == null) return num(h.tong);
  return num(h.tienHang) + num(h.tienThue);
}
