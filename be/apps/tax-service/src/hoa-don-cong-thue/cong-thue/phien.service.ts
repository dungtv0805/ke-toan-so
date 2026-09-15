import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongTyCongThue } from '@app/entities';
import crypto from 'node:crypto';
import { TOKEN_TTL_MS, CAPTCHA_TTL_MS } from './config';
import { GdtError } from './http';
import * as gdt from './gdt-client';
import { decrypt } from './crypto';

/**
 * Quản lý phiên đăng nhập vào cổng Thuế cho nhiều mã số thuế cùng lúc.
 *
 * Cổng Thuế bắt nhập captcha nên đăng nhập là hai bước:
 *
 *   batDauDangNhap()  -> lấy captcha -> trả SVG về cho giao diện
 *   guiCaptcha()      -> đăng nhập   -> giữ token
 *
 * Token nằm trong bộ nhớ tiến trình, KHÔNG ghi xuống cơ sở dữ liệu: nó là chìa
 * khóa truy cập dữ liệu thuế của khách hàng, hết hạn sau khoảng một giờ, không
 * đáng để lưu lâu dài.
 *
 * HỆ QUẢ TRIỂN KHAI: tax-service phải chạy MỘT tiến trình duy nhất
 * (`instances: 1, exec_mode: 'fork'` trong PM2 — đúng như cấu hình hiện tại).
 * Nhân bản lên nhiều instance thì mỗi bản giữ một token riêng và kế toán sẽ
 * phải gõ captcha lại liên tục.
 *
 * Token được khóa theo tenantId + mst: hai khách hàng cùng khai báo một mã số
 * thuế vẫn là hai phiên tách biệt.
 */
@Injectable()
export class PhienCongThueService {
  private readonly logger = new Logger(PhienCongThueService.name);

  /** `${tenantId}:${mst}` -> token còn hạn */
  private readonly tokens = new Map<string, { token: string; hetHan: number }>();

  /** sessionId -> phiên captcha đang chờ người nhập */
  private readonly dangCho = new Map<
    string,
    { khoa: string; mst: string; captchaKey: string; matKhau: string | null; hetHan: number }
  >();

  constructor(
    @InjectRepository(CongTyCongThue)
    private readonly congTyRepo: Repository<CongTyCongThue>,
  ) {}

  private khoa(tenantId: string, mst: string) {
    return `${tenantId || 'khong-ro'}:${mst}`;
  }

  private donHetHan() {
    const now = Date.now();
    for (const [k, v] of this.tokens) if (v.hetHan < now) this.tokens.delete(k);
    for (const [k, v] of this.dangCho) if (v.hetHan < now) this.dangCho.delete(k);
  }

  /** Token còn hạn, hoặc null nếu cần đăng nhập lại. */
  xemToken(tenantId: string, mst: string): string | null {
    this.donHetHan();
    return this.tokens.get(this.khoa(tenantId, mst))?.token ?? null;
  }

  daDangNhap(tenantId: string, mst: string): boolean {
    return this.xemToken(tenantId, mst) !== null;
  }

  /**
   * Lấy token để gọi cổng. Ném CHUA_DANG_NHAP nếu chưa có - lớp trên bắt lỗi
   * này để yêu cầu kế toán nhập captcha.
   */
  layToken(tenantId: string, mst: string): string {
    const token = this.xemToken(tenantId, mst);
    if (!token) {
      throw new GdtError(`MST ${mst} chưa đăng nhập hoặc token đã hết hạn`, {
        code: 'CHUA_DANG_NHAP',
      });
    }
    return token;
  }

  /**
   * Bỏ token đang giữ vì CỔNG vừa từ chối nó.
   *
   * Hạn token tính trong bộ nhớ chỉ là phỏng đoán; cổng Thuế mới là nơi quyết
   * định. Không có hàm này thì sau một lần 401, daDangNhap() vẫn trả true cho
   * tới khi hết hạn nội bộ, và mọi request sau đó đều hỏng theo.
   */
  boToken(tenantId: string, mst: string): void {
    this.tokens.delete(this.khoa(tenantId, mst));
  }

  private giuToken(tenantId: string, mst: string, token: string) {
    this.tokens.set(this.khoa(tenantId, mst), { token, hetHan: Date.now() + TOKEN_TTL_MS });
    return token;
  }

  private async layThongTinDangNhap(tenantId: string, mst: string, matKhauTruyenThang?: string | null) {
    const congTy = await this.congTyRepo.findOne({ where: { mst } as any });
    if (!congTy) throw new GdtError(`Chưa khai báo MST ${mst}`, { code: 'KHONG_TIM_THAY' });

    if (matKhauTruyenThang) {
      return { tenDangNhap: congTy.tenDangNhap, matKhau: matKhauTruyenThang };
    }
    if (!congTy.matKhauMaHoa) {
      throw new GdtError(
        `MST ${mst} đang ở chế độ không lưu mật khẩu — phải gửi kèm mật khẩu khi đăng nhập`,
        { code: 'CAN_MAT_KHAU' },
      );
    }
    return { tenDangNhap: congTy.tenDangNhap, matKhau: decrypt(congTy.matKhauMaHoa) };
  }

  /**
   * Bắt đầu đăng nhập cho một mã số thuế.
   *
   * @param matKhau mật khẩu truyền thẳng, dùng cho công ty ở chế độ không lưu.
   *   Nó chỉ nằm trong bộ nhớ tối đa 5 phút (hạn của phiên captcha) rồi bị xóa
   *   cùng phiên, không bao giờ ghi xuống đĩa.
   */
  async batDauDangNhap(
    tenantId: string,
    mst: string,
    { matKhau = null }: { matKhau?: string | null } = {},
  ): Promise<{ trangThai: string; mst: string; sessionId?: string; captchaSvg?: string }> {
    this.donHetHan();

    // Kiểm tra mật khẩu TRƯỚC khi xin captcha: thiếu mật khẩu mà vẫn gọi
    // /captcha là làm phiền cổng Thuế một cách vô ích.
    await this.layThongTinDangNhap(tenantId, mst, matKhau);

    const captcha = await gdt.getCaptcha();
    const sessionId = crypto.randomUUID();

    this.dangCho.set(sessionId, {
      khoa: this.khoa(tenantId, mst),
      mst,
      captchaKey: captcha.key,
      matKhau,
      hetHan: Date.now() + CAPTCHA_TTL_MS,
    });

    return { trangThai: 'can_captcha', mst, sessionId, captchaSvg: captcha.content };
  }

  /**
   * Hoàn tất đăng nhập bằng mã captcha kế toán gõ.
   * Mật khẩu lấy từ phiên đã mở, hoặc truyền lại ở đây nếu giao diện muốn giữ
   * mật khẩu phía trình duyệt cho tới bước cuối.
   */
  async guiCaptcha(
    tenantId: string,
    sessionId: string,
    giaTri: string,
    { matKhau = null }: { matKhau?: string | null } = {},
  ): Promise<{ trangThai: string; mst: string }> {
    this.donHetHan();

    const phien = this.dangCho.get(sessionId);
    if (!phien) {
      throw new GdtError('Phiên captcha không tồn tại hoặc đã hết hạn, hãy lấy mã captcha mới', {
        code: 'CAPTCHA_HET_HAN',
      });
    }
    this.dangCho.delete(sessionId);

    const { tenDangNhap, matKhau: mk } = await this.layThongTinDangNhap(
      tenantId,
      phien.mst,
      matKhau ?? phien.matKhau,
    );

    const token = await gdt.authenticate({
      username: tenDangNhap,
      password: mk,
      captchaKey: phien.captchaKey,
      captchaValue: giaTri,
    });

    this.giuToken(tenantId, phien.mst, token);
    return { trangThai: 'da_dang_nhap', mst: phien.mst };
  }

  /** Trạng thái đăng nhập của mọi mã số thuế - cho màn hình quản trị. */
  async trangThai(tenantId: string) {
    this.donHetHan();
    const tatCa = await this.congTyRepo.find();
    return tatCa
      .filter((c) => c.isActive !== false)
      .map((c) => ({
      mst: c.mst,
      tenCongTy: c.tenCongTy,
      daDangNhap: this.tokens.has(this.khoa(tenantId, c.mst)),
      coLuuMatKhau: Boolean(c.matKhauMaHoa),
      }));
  }

  /** Bộ giữ token cho một mã số thuế, dùng cho các công việc dài. */
  boGiuToken(tenantId: string, mst: string) {
    return {
      layToken: () => this.layToken(tenantId, mst),
      boToken: () => this.boToken(tenantId, mst),
      // Việc chạy nền không tự gõ captcha được, nên chỉ đăng nhập lại được khi
      // công ty có lưu mật khẩu VÀ đã bật dịch vụ giải captcha tự động.
      batDauDangNhap: undefined,
    };
  }
}
