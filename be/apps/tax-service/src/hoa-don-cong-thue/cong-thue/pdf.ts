import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const chay = promisify(execFile);

/**
 * Dựng bản thể hiện PDF của hóa đơn từ gói ZIP tải về từ cổng Thuế.
 *
 * KHÔNG tự vẽ lại hóa đơn từ dữ liệu XML. Gói ZIP của cổng đã kèm sẵn
 * `invoice.html` — chính bản thể hiện của người bán, HTML tĩnh với CSS in ấn
 * đầy đủ (`@page { size: A4 }`). Việc ở đây chỉ là in file đó ra PDF.
 *
 * Tự vẽ lại thì tờ hóa đơn sẽ trông khác bản gốc của người bán, gây phiền khi
 * đối chiếu với bên bán hoặc giải trình với cơ quan thuế — và phải bám theo mọi
 * lần mẫu hóa đơn thay đổi.
 *
 * Gọi thẳng binary Chromium thay vì Puppeteer/Playwright: hai gói đó kéo theo
 * hàng loạt phụ thuộc npm, mà thêm gói npm vào container này là cái bẫy đã gây
 * sự cố thật (xem skill db-deploy). Chromium cài bằng apk, không đụng tới
 * node_modules.
 */

const BINARY = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const HAN_MS = 60_000;

/** Kiểm tra máy chủ có Chromium chưa — để báo lỗi rõ thay vì ném ENOENT. */
export function coChromium(): boolean {
  return fs.existsSync(BINARY);
}

/**
 * @param duongDanZip gói ZIP gốc đã tải từ cổng Thuế
 * @returns nội dung file PDF
 */
export async function pdfTuZip(duongDanZip: string): Promise<Buffer> {
  if (!coChromium()) {
    throw new Error(
      `Máy chủ chưa cài Chromium (${BINARY}) nên không dựng được PDF. ` +
        'Cài trong container: apk add --no-cache chromium font-noto unzip',
    );
  }
  if (!fs.existsSync(duongDanZip)) {
    throw new Error('Chưa có file gốc của hóa đơn này, hãy tải file gốc trước');
  }

  const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-pdf-'));
  try {
    await chay('unzip', ['-q', '-o', duongDanZip, '-d', thuMuc], { timeout: HAN_MS });

    const html = path.join(thuMuc, 'invoice.html');
    if (!fs.existsSync(html)) {
      throw new Error('Gói hóa đơn không có invoice.html nên không dựng được bản thể hiện');
    }

    const dich = path.join(thuMuc, 'ra.pdf');
    await chay(
      BINARY,
      [
        '--headless',
        // Container chạy không có user namespace nên sandbox của Chromium
        // không bật được. An toàn ở đây đến từ chỗ khác: nội dung đưa vào là
        // file tĩnh lấy từ cổng Thuế, không phải trang web tùy ý.
        '--no-sandbox',
        '--disable-gpu',
        // /dev/shm trong container chỉ 64MB, thiếu là Chromium chết giữa chừng.
        '--disable-dev-shm-usage',
        '--no-pdf-header-footer',
        `--print-to-pdf=${dich}`,
        `file://${html}`,
      ],
      { timeout: HAN_MS },
    );

    if (!fs.existsSync(dich)) throw new Error('Chromium không tạo được file PDF');
    return fs.readFileSync(dich);
  } finally {
    fs.rmSync(thuMuc, { recursive: true, force: true });
  }
}
