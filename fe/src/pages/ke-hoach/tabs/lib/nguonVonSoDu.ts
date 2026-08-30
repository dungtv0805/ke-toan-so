/**
 * Số dư từng kỳ của một chỉ tiêu nguồn vốn.
 *
 * Ô tháng người dùng nhập là BIẾN ĐỘNG (âm = giảm), không phải số dư — nhờ vậy
 * quy tắc chung của mọi bảng kế hoạch (Quý = tổng 3 tháng, Cả năm = tổng 12
 * tháng) vẫn đúng nguyên. Số dư là thứ suy ra, hiển thị ở dòng phụ.
 */

import { SO_THANG } from './tongHop';

/** Số dư CUỐI của từng tháng — 12 phần tử, chỉ số 0 là cuối T1. */
export function soDuLuyKe(soDuDauNam: number, thang: number[]): number[] {
  let luyKe = Number(soDuDauNam) || 0;
  return Array.from({ length: SO_THANG }, (_, i) => {
    luyKe += Number(thang[i]) || 0;
    return luyKe;
  });
}
