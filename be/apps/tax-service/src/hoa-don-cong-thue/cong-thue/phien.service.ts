import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongTyCongThue } from '@app/entities';
import crypto from 'node:crypto';
import { TOKEN_TTL_MS, CAPTCHA_TTL_MS } from './config';
import { GdtError } from './http';
import * as gdt from './gdt-client';
import { decrypt } from './crypto';
import { taoSolver, type CaptchaSolver } from './captcha';

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

  /**
   * Nhật ký các lần đăng nhập, để tự kìm nhịp.
   *
   * Ngày 15/09/2026 hệ thống gọi đăng nhập 40 lần trong một ngày, riêng một giờ
   * là 20 lần — cổng Thuế bật cơ chế chống truy cập tự động và chặn thẳng mọi
   * client không phải trình duyệt. Token sống cả giờ nên không có lý do gì phải
   * đăng nhập dày như vậy; giới hạn ở đây là để bảo vệ chính người dùng khỏi bị
   * cổng đánh dấu.
   */
  private readonly lanDangNhap = new Map<string, number[]>();

  /** Bộ giải captcha, chọn theo biến môi trường. Mặc định là nhập tay. */
  private readonly solver: CaptchaSolver = taoSolver();

  /**
   * Số lần thử lại khi dịch vụ giải SAI mã.
   *
   * Dịch vụ trả phí chỉ đúng khoảng 90-95%, nên một lần sai là chuyện bình
   * thường chứ không phải sự cố. Mỗi lần thử lại phải lấy captcha MỚI: mã cũ đã
   * bị cổng Thuế tiêu thụ, gửi lại cũng vô ích.
   */
  private readonly SO_LAN_THU_CAPTCHA = 3;

  constructor(
    @InjectRepository(CongTyCongThue)
    private readonly congTyRepo: Repository<CongTyCongThue>,
  ) {}

  /** Đang bật tự giải captcha hay không — giao diện dùng để đổi lời nhắc. */
  get tuGiaiCaptcha(): boolean {
    return this.solver.ten !== 'nhap-tay';
  }

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

  /**
   * Nhận token lấy từ phiên trình duyệt của chính kế toán.
   *
   * Đường vào dự phòng cho lúc cổng Thuế chặn đăng nhập bằng máy: từ
   * 15/09/2026 endpoint authenticate trả 403 "Hệ thống phát hiện hành vi không
   * hợp lệ" cho mọi client không phải trình duyệt thật, trong khi các endpoint
   * dữ liệu vẫn nhận token bình thường. Người dùng đăng nhập bằng tay trên cổng
   * rồi đưa token sang đây là chạy tiếp được.
   *
   * Không lưu xuống cơ sở dữ liệu: token sống khoảng một giờ, giữ trong bộ nhớ
   * tiến trình đúng như token do mình tự đăng nhập.
   */
  datTokenTay(tenantId: string, mst: string, token: string): { mst: string; hetHanLuc: string } {
    const sach = String(token ?? '').trim().replace(/^Bearer\s+/i, '');
    // Token của cổng là JWT: ba phần ngăn bằng dấu chấm. Kiểm sơ để người dùng
    // dán nhầm cả dòng "Authorization: ..." hay một chuỗi bất kỳ thì biết ngay.
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(sach)) {
      throw new GdtError(
        'Token không đúng định dạng. Hãy chép đúng giá trị token từ cổng Thuế (chuỗi ba phần ngăn bằng dấu chấm).',
        { code: 'CAN_MAT_KHAU' },
      );
    }
    this.giuToken(tenantId, mst, sach);
    return { mst, hetHanLuc: new Date(Date.now() + TOKEN_TTL_MS).toISOString() };
  }

  /** Ném lỗi nếu đăng nhập quá dày — giữ cho cổng Thuế không đánh dấu tài khoản. */
  private kiemNhipDangNhap(tenantId: string, mst: string) {
    const khoa = this.khoa(tenantId, mst);
    const gio = Date.now() - 60 * 60 * 1000;
    const ds = (this.lanDangNhap.get(khoa) ?? []).filter((t) => t > gio);

    if (ds.length >= 6) {
      const cho = Math.ceil((ds[0] + 60 * 60 * 1000 - Date.now()) / 60000);
      throw new GdtError(
        `Đã đăng nhập cổng Thuế ${ds.length} lần trong một giờ cho ${mst}. Tạm dừng ${cho} phút ` +
          'để cổng không đánh dấu tài khoản là truy cập tự động. Token hiện có vẫn dùng được, ' +
          'và các chức năng không cần cổng vẫn chạy bình thường.',
        { status: 429, code: 'QUA_NHIEU_LAN' },
      );
    }

    ds.push(Date.now());
    this.lanDangNhap.set(khoa, ds);
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
    this.kiemNhipDangNhap(tenantId, mst);

    // Kiểm tra mật khẩu TRƯỚC khi xin captcha: thiếu mật khẩu mà vẫn gọi
    // /captcha là làm phiền cổng Thuế một cách vô ích.
    await this.layThongTinDangNhap(tenantId, mst, matKhau);

    const { tenDangNhap, matKhau: mk } = await this.layThongTinDangNhap(tenantId, mst, matKhau);

    // Bật tự giải thì thử vài lần rồi mới chịu thua: dịch vụ sai mã là chuyện
    // thường, và mỗi lần thử phải xin captcha MỚI vì mã cũ đã bị tiêu thụ.
    for (let lan = 0; lan < this.SO_LAN_THU_CAPTCHA; lan++) {
      const captcha = await gdt.getCaptcha();
      const daGiai = await this.solver.giai(captcha.content);

      if (!daGiai) {
        // Không tự giải được (chế độ nhập tay, hoặc dịch vụ hỏng): nhường cho người.
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

      try {
        const token = await gdt.authenticate({
          username: tenDangNhap,
          password: mk,
          captchaKey: captcha.key,
          captchaValue: daGiai,
        });
        this.giuToken(tenantId, mst, token);
        return { trangThai: 'da_dang_nhap', mst };
      } catch (err: any) {
        // Cổng trả LOGIN_FAILED cho CẢ sai captcha lẫn sai mật khẩu. Thử lại
        // chỉ có nghĩa với trường hợp đầu; sai mật khẩu thì thử bao nhiêu lần
        // cũng hỏng, nhưng ta không phân biệt được nên vẫn giới hạn số lần.
        if (err?.code !== 'LOGIN_FAILED' || lan === this.SO_LAN_THU_CAPTCHA - 1) throw err;
        this.logger.warn(`MST ${mst}: giải captcha sai, thử lại lần ${lan + 2}`);
      }
    }

    throw new GdtError(`MST ${mst}: thử ${this.SO_LAN_THU_CAPTCHA} lần mà không đăng nhập được`, {
      code: 'LOGIN_FAILED',
    });
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
      /**
       * Đăng nhập lại giữa chừng khi cổng từ chối token.
       *
       * Chỉ chạy trọn vẹn khi BẬT tự giải captcha; ở chế độ nhập tay nó trả
       * 'can_captcha' và TokenKeeper ném CHUA_DANG_NHAP để lớp trên xếp mã số
       * thuế này vào hàng chờ — đúng hành vi cũ, không hồi quy.
       */
      batDauDangNhap: (m: string) => this.batDauDangNhap(tenantId, m),
    };
  }
}
