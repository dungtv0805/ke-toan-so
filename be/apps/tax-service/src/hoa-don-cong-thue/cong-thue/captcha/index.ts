/**
 * Lớp giải captcha cắm-rút được.
 *
 * Hợp đồng chung: `giai(svg)` trả về
 *   - chuỗi mã captcha -> giải tự động thành công
 *   - null             -> không tự giải được, phải nhường cho người
 *
 * Nhờ vậy phần còn lại của hệ thống không cần biết captcha được giải bằng cách
 * nào. Bật tự giải chỉ là đặt biến môi trường, KHÔNG phải sửa code — và giao
 * diện cũng không phải đổi: `batDauDangNhap()` trả thẳng 'da_dang_nhap' thay vì
 * 'can_captcha', nhánh nhập tay đơn giản là không chạy nữa.
 */
import { NhapTaySolver } from './nhap-tay';
import { DichVuSolver } from './dich-vu';

export interface CaptchaSolver {
  readonly ten: string;
  /** @returns mã captcha, hoặc null nếu cần người nhập tay */
  giai(svg: string): Promise<string | null>;
}

export function taoSolver(options: { provider?: string; apiKey?: string } = {}): CaptchaSolver {
  const provider = options.provider ?? process.env.CAPTCHA_PROVIDER ?? '';
  const apiKey = options.apiKey ?? process.env.CAPTCHA_API_KEY ?? '';

  if (provider && apiKey) return new DichVuSolver({ provider, apiKey });
  return new NhapTaySolver();
}

export { NhapTaySolver, DichVuSolver };
