/**
 * Phần THUẦN của việc co giãn cột: tính bề rộng mới và đọc/ghi bề rộng đã lưu.
 *
 * Tách khỏi hook để kiểm được bằng unit test — phần còn lại (kéo chuột, ô tiêu
 * đề, cột ghim) dính DOM và `position: sticky`, jsdom không tái hiện nổi.
 */

/** Hẹp hơn nữa là mất chữ, chỉ còn dấu ba chấm. */
export const RONG_TOI_THIEU = 60;

/** Rộng hơn nữa thì một cột nuốt hết màn hình, không còn chỗ cuộn. */
export const RONG_TOI_DA = 600;

const kep = (v: number) =>
  Math.min(RONG_TOI_DA, Math.max(RONG_TOI_THIEU, Math.round(v)));

/** Bề rộng mới sau khi kéo `dx` px từ bề rộng `rongDau`. */
export const rongMoi = (rongDau: number, dx: number): number =>
  kep(rongDau + dx);

/** Bề rộng đã lưu, khoá theo KEY cột. */
export type RongTheoCot = Record<string, number>;

/**
 * Đọc bề rộng đã lưu. Mọi giá trị hỏng đều bị bỏ qua thay vì ném lỗi: một mục
 * rác trong localStorage không được phép làm trắng cả bảng.
 */
export function docRongDaLuu(khoa: string): RongTheoCot {
  let tho: unknown;
  try {
    const chuoi = localStorage.getItem(khoa);
    if (!chuoi) return {};
    tho = JSON.parse(chuoi);
  } catch {
    return {};
  }
  if (!tho || typeof tho !== 'object' || Array.isArray(tho)) return {};

  const ket: RongTheoCot = {};
  for (const [key, v] of Object.entries(tho as Record<string, unknown>)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    ket[key] = kep(v);
  }
  return ket;
}

export function ghiRongDaLuu(khoa: string, rong: RongTheoCot): void {
  try {
    localStorage.setItem(khoa, JSON.stringify(rong));
  } catch {
    // Chế độ riêng tư / hết dung lượng — bảng vẫn dùng được, chỉ là không nhớ.
  }
}
