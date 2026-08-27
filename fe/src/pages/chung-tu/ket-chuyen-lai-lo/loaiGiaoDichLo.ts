/**
 * Quy tắc chọn Loại giao dịch cho một lô kết chuyển.
 *
 * Mỗi công ty tự đặt mã (MasterCeo dùng `KC`), nên không có mã nào fix cứng được ở
 * FE — mọi thứ ở đây chỉ làm việc trên danh mục thực tế của công ty.
 */

export interface LoaiGiaoDichToiThieu {
  ma: string;
  loaiChungTuMa?: string;
}

/** Tiền tố dự phòng của BE khi lô không gắn được loại chứng từ nào. */
export const TIEN_TO_DU_PHONG = 'NVK';

/**
 * Mã chọn sẵn khi mở form: mã đã dùng lần trước, nhưng chỉ khi nó còn trong danh mục —
 * loại giao dịch đã bị xóa/ngừng dùng mà vẫn chọn sẵn thì BE sẽ từ chối lúc Lưu.
 */
export function chonMacDinh(
  maDaLuu: string | undefined,
  danhSach: LoaiGiaoDichToiThieu[],
): string | undefined {
  if (!maDaLuu) return undefined;
  return danhSach.some((l) => l.ma === maDaLuu) ? maDaLuu : undefined;
}

/**
 * Có phải đang thiếu lựa chọn bắt buộc không. Công ty chưa khai loại giao dịch nào thì
 * KHÔNG chặn — vẫn ghi sổ được như trước khi có ô này.
 */
export function thieuLoaiGiaoDich(
  danhSach: LoaiGiaoDichToiThieu[],
  ma: string | undefined,
): boolean {
  return danhSach.length > 0 && !ma;
}

/** Tiền tố số phiếu sẽ sinh ra — theo Loại chứng từ mà Loại giao dịch trỏ tới. */
export function tienToSoPhieu(
  danhSach: LoaiGiaoDichToiThieu[],
  ma: string | undefined,
): string {
  return danhSach.find((l) => l.ma === ma)?.loaiChungTuMa || TIEN_TO_DU_PHONG;
}
