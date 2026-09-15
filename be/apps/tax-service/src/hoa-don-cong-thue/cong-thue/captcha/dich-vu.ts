import { Logger } from '@nestjs/common';
import type { CaptchaSolver } from './index';

const NHIP_HOI_MS = 5_000;
const CHO_TOI_DA_MS = 120_000;

const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Giải captcha tự động qua dịch vụ trả phí (2Captcha / Anti-Captcha).
 *
 * Captcha của cổng Thuế là SVG vẽ bằng path vector — đã kiểm chứng trực tiếp:
 * 200×40, đúng 8 thẻ `<path>`, KHÔNG có thẻ `<text>`. Nghĩa là chữ không nằm
 * dưới dạng văn bản, không đọc thẳng từ SVG được. Bắt buộc phải rasterize sang
 * ảnh rồi mới nhận dạng.
 *
 * `@resvg/resvg-js` được nạp ĐỘNG, chỉ khi thực sự bật chế độ tự giải. Nhờ vậy
 * bản cài mặc định không cần thư viện native nào, và thiếu nó cũng chỉ làm hỏng
 * đúng tính năng này chứ không làm sập cả service.
 */
export class DichVuSolver implements CaptchaSolver {
  private readonly logger = new Logger(DichVuSolver.name);
  private readonly provider: string;
  private readonly apiKey: string;

  constructor({ provider, apiKey }: { provider: string; apiKey: string }) {
    this.provider = provider.toLowerCase();
    this.apiKey = apiKey;
  }

  get ten() {
    return this.provider;
  }

  async giai(svg: string): Promise<string | null> {
    try {
      const anh = await this.svgSangPngBase64(svg);
      const ma =
        this.provider === 'anticaptcha'
          ? await this.giaiAntiCaptcha(anh)
          : await this.giai2Captcha(anh);

      return ma ? ma.trim() : null;
    } catch (err: any) {
      // Dịch vụ hỏng, hết tiền, mất mạng — KHÔNG được làm đổ luồng đăng nhập.
      // Trả null là hệ thống tự rơi về nhánh nhập tay, kế toán vẫn làm việc được.
      this.logger.warn(`Không tự giải được captcha (${this.provider}): ${err?.message ?? err}`);
      return null;
    }
  }

  private async svgSangPngBase64(svg: string): Promise<string> {
    /*
     * Nạp bằng tên ĐỘNG có chủ đích: gói này là phụ thuộc TÙY CHỌN, chỉ cài
     * trong container theo quy trình ở skill db-deploy. Viết tên tĩnh thì
     * webpack đòi resolve lúc build và `yarn install --frozen-lockfile` trong
     * Docker cũng gãy vì yarn.lock chưa có nó.
     */
    let Resvg: any;
    try {
      const ten = '@resvg/resvg-js';
      ({ Resvg } = await (Function('t', 'return import(t)')(ten) as Promise<any>));
    } catch {
      throw new Error(
        'Chế độ tự giải captcha cần gói "@resvg/resvg-js" để chuyển SVG sang ảnh. ' +
          'Cài trong container: npm install --no-save --legacy-peer-deps @resvg/resvg-js',
      );
    }

    // Phóng to 3 lần: captcha gốc chỉ 200×40, nhận dạng ở cỡ đó sai nhiều.
    const png = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: 3 },
      background: 'white',
    })
      .render()
      .asPng();

    return Buffer.from(png).toString('base64');
  }

  // ------------------------------------------------------------- 2Captcha

  private async giai2Captcha(base64: string): Promise<string | null> {
    const gui = await fetch('https://2captcha.com/in.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        key: this.apiKey,
        method: 'base64',
        body: base64,
        json: '1',
      }),
    }).then((r) => r.json() as any);

    if (gui?.status !== 1) throw new Error(`2Captcha từ chối: ${gui?.request ?? 'không rõ'}`);
    const id = gui.request;

    const han = Date.now() + CHO_TOI_DA_MS;
    while (Date.now() < han) {
      await nghi(NHIP_HOI_MS);
      const ket = await fetch(
        `https://2captcha.com/res.php?key=${this.apiKey}&action=get&id=${id}&json=1`,
      ).then((r) => r.json() as any);

      if (ket?.status === 1) return String(ket.request);
      if (ket?.request && ket.request !== 'CAPCHA_NOT_READY') {
        throw new Error(`2Captcha lỗi: ${ket.request}`);
      }
    }
    throw new Error('2Captcha không trả kết quả trong 2 phút');
  }

  // --------------------------------------------------------- Anti-Captcha

  private async giaiAntiCaptcha(base64: string): Promise<string | null> {
    const tao = await fetch('https://api.anti-captcha.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: this.apiKey,
        task: { type: 'ImageToTextTask', body: base64 },
      }),
    }).then((r) => r.json() as any);

    if (tao?.errorId) throw new Error(`Anti-Captcha từ chối: ${tao.errorDescription}`);
    const taskId = tao.taskId;

    const han = Date.now() + CHO_TOI_DA_MS;
    while (Date.now() < han) {
      await nghi(NHIP_HOI_MS);
      const ket = await fetch('https://api.anti-captcha.com/getTaskResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: this.apiKey, taskId }),
      }).then((r) => r.json() as any);

      if (ket?.errorId) throw new Error(`Anti-Captcha lỗi: ${ket.errorDescription}`);
      if (ket?.status === 'ready') return String(ket.solution?.text ?? '');
    }
    throw new Error('Anti-Captcha không trả kết quả trong 2 phút');
  }
}
