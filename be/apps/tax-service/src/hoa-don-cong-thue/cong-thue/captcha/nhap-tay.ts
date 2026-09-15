import type { CaptchaSolver } from './index';

/**
 * Chế độ nhập tay: không tự giải, luôn nhường cho kế toán.
 *
 * Đây là mặc định và là phương án dự phòng cuối cùng. Nó không bao giờ hỏng,
 * không phụ thuộc bên thứ ba, không tốn phí — nên hệ thống luôn chạy được kể cả
 * khi dịch vụ tự giải chết hoặc hết tiền.
 */
export class NhapTaySolver implements CaptchaSolver {
  get ten() {
    return 'nhap-tay';
  }

  /** @returns luôn null: báo cho lớp trên rằng cần người nhập. */
  async giai(): Promise<null> {
    return null;
  }
}
