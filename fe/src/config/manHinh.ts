/**
 * Điểm ngắt màn hình — NGUỒN DUY NHẤT cho phần responsive.
 *
 * Trùng Tailwind `md` (768) và `xl` (1280), nên trong className dùng thẳng
 * `max-md:` (điện thoại) / `max-xl:` (điện thoại + máy tính bảng), còn CSS
 * thuần dùng `MQ_MOBILE` / `MQ_TABLET_TRO_XUONG` dưới đây.
 *
 * KHÔNG áp lên thang breakpoint của antd (`Col xs/sm/md/lg/xl` = 576/768/992/
 * 1200): đổi thang đó là lệch bố cục mọi trang đang dùng `Col lg/xl`.
 *
 * Máy tính (≥ 1280) là bố cục gốc — mọi thay đổi responsive phải nằm sau điều
 * kiện màn hẹp hơn, không được chạm tới màn này.
 */
export const MOBILE_MAX = 767;
export const TABLET_MAX = 1279;

export type ManHinh = 'mobile' | 'tablet' | 'desktop';

export const manHinhTheoBeRong = (w: number): ManHinh =>
  w <= MOBILE_MAX ? 'mobile' : w <= TABLET_MAX ? 'tablet' : 'desktop';

/** `.98` để 767.5px (màn có tỉ lệ điểm ảnh lẻ) không lọt khe giữa hai truy vấn. */
export const MQ_MOBILE = `(max-width: ${MOBILE_MAX + 0.98}px)`;
export const MQ_TABLET_TRO_XUONG = `(max-width: ${TABLET_MAX + 0.98}px)`;
