/**
 * Điểm ngắt màn hình — NGUỒN DUY NHẤT cho phần responsive.
 *
 * - Điện thoại: hẹp hơn 768px, HOẶC màn thấp (cao ≤ 540px) mà hẹp hơn 1280px —
 *   tức điện thoại xoay ngang (rộng 844–932 nhưng chỉ cao 390–430). Chỉ nhìn bề
 *   rộng thì máy xoay ngang rơi vào bố cục máy tính bảng: trang cao một màn chỉ
 *   còn ~340px nội dung, popup không phủ màn.
 * - Máy tính bảng: 768–1279 và cao hơn 540.
 * - Máy tính: ≥ 1280 — bố cục gốc, mọi thay đổi responsive phải nằm sau điều
 *   kiện màn hẹp hơn, không được chạm tới màn này.
 *
 * Trong className: `dt:` (điện thoại — biến thể tự khai trong tailwind.config.ts,
 * KHÔNG dùng `max-md:` vì nó bỏ sót máy xoay ngang) / `max-xl:` (điện thoại +
 * máy tính bảng). CSS thuần dùng `MQ_MOBILE` / `MQ_TABLET_TRO_XUONG` dưới đây.
 *
 * KHÔNG áp lên thang breakpoint của antd (`Col xs/sm/md/lg/xl` = 576/768/992/
 * 1200): đổi thang đó là lệch bố cục mọi trang đang dùng `Col lg/xl`.
 */
export const MOBILE_MAX = 767;
export const TABLET_MAX = 1279;
/** Cao tối đa coi là "màn thấp" (điện thoại xoay ngang). iPad ngang cao ≥ 744. */
export const THAP_MAX = 540;

export type ManHinh = 'mobile' | 'tablet' | 'desktop';

export const manHinhTheoBeRong = (w: number, h = Number.POSITIVE_INFINITY): ManHinh =>
  w <= MOBILE_MAX || (w <= TABLET_MAX && h <= THAP_MAX)
    ? 'mobile'
    : w <= TABLET_MAX
      ? 'tablet'
      : 'desktop';

/** `.98` để 767.5px (màn có tỉ lệ điểm ảnh lẻ) không lọt khe giữa hai truy vấn. */
export const MQ_MOBILE = `(max-width: ${MOBILE_MAX + 0.98}px), (max-width: ${TABLET_MAX + 0.98}px) and (max-height: ${THAP_MAX}px)`;
export const MQ_TABLET_TRO_XUONG = `(max-width: ${TABLET_MAX + 0.98}px)`;
