/**
 * EBITDA = Lợi nhuận trước thuế + chi phí lãi vay + khấu hao.
 *
 * Khấu hao lấy từ phát sinh Có TK 214. Công ty chưa hạch toán TK 214 thì khấu hao
 * bằng 0 và EBITDA rút về LNTT + lãi vay — đúng như dữ liệu đang có, không phải lỗi.
 */
export function tinhEbitda(
  loiNhuanTruocThue: number,
  chiPhiLaiVay: number,
  khauHao: number,
): number {
  return loiNhuanTruocThue + chiPhiLaiVay + khauHao;
}
