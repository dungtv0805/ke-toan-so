/**
 * Giữ token của một mã số thuế cho suốt một công việc dài, và tự lấy token mới
 * khi cổng Thuế từ chối token cũ.
 *
 * Token cổng Thuế sống khoảng một giờ, ngắn hơn nhiều việc có thật: quét 4
 * nhánh của một kỳ, tải file gốc cho vài trăm hóa đơn, chạy hàng loạt vài chục
 * mã số thuế. Không có lớp này thì mỗi chỗ gọi cổng lại phải tự viết lại đúng
 * một đoạn xử lý 401 - và chỉ cần quên một chỗ là mất dữ liệu ở đó.
 *
 * Quy tắc: đăng nhập lại ĐÚNG MỘT LẦN cho mỗi lần gọi. Token vừa lấy mà vẫn bị
 * từ chối thì vấn đề nằm ở chỗ khác, thử thêm chỉ nhanh tới lúc bị chặn IP.
 */
import { GdtError } from './http';

export interface PhienCongThue {
  layToken(mst: string): string;
  boToken?(mst: string): void;
  batDauDangNhap?(mst: string): Promise<{ trangThai: string }>;
}

/** Cổng từ chối token: 401 từ http, hoặc CHUA_DANG_NHAP từ phiên. */
export const laLoiXacThuc = (err: any): boolean =>
  err?.status === 401 || err?.code === 'UNAUTHORIZED' || err?.code === 'CHUA_DANG_NHAP';

export function createTokenKeeper({ phien, mst }: { phien: PhienCongThue; mst: string }) {
  let token = phien.layToken(mst);

  async function lamMoi(): Promise<string | null> {
    if (typeof phien.batDauDangNhap !== 'function') return null;
    phien.boToken?.(mst);

    const ket = await phien.batDauDangNhap(mst);
    if (ket?.trangThai !== 'da_dang_nhap') {
      throw new GdtError(`Token của MST ${mst} hết hạn giữa chừng và cần nhập lại mã captcha`, {
        code: 'CHUA_DANG_NHAP',
      });
    }
    return phien.layToken(mst);
  }

  return {
    hienTai: () => token,

    /** Chạy `fn(token)`; nếu cổng từ chối token thì lấy token mới rồi chạy lại. */
    async chay<T>(fn: (token: string) => Promise<T>): Promise<T> {
      try {
        return await fn(token);
      } catch (err) {
        if (!laLoiXacThuc(err)) throw err;
        const moi = await lamMoi();
        if (!moi) throw err;
        token = moi;
        return fn(token);
      }
    },
  };
}
