/**
 * HTTP client dùng chung cho mọi request tới cổng Thuế.
 *
 * Cổng Thuế là hệ thống nhà nước dùng chung cho cả nước. Công cụ tải ồ ạt là
 * công cụ sớm bị chặn IP, nên module này cố tình đi chậm và lịch sự:
 *  - giới hạn số request song song (mặc định 2)
 *  - chèn khoảng nghỉ tối thiểu giữa các request
 *  - tôn trọng 429/503 và header Retry-After thay vì thử lại ngay
 *  - cộng jitter vào thời gian chờ để nhiều mã số thuế không cùng thử lại một lúc
 *  - NGẮT MẠCH khi bị giới hạn liên tiếp: cả client nghỉ một lúc thay vì để
 *    từng request tự đốt hết lượt thử của nó
 */

/** Các mốc thời gian, gom một chỗ để test chỉnh được mà không phải chờ thật. */
export const tuning = {
  concurrency: Number(process.env.GDT_CONCURRENCY || 2),
  minGapMs: 300,
  maxRetries: 3,
  baseBackoffMs: 1_000,
  maxBackoffMs: 60_000,
  timeoutMs: 30_000,
  /** Bao nhiêu lần bị giới hạn liên tiếp thì ngắt mạch. */
  breakerThreshold: 5,
  /** Ngắt rồi thì cả client nghỉ bao lâu. */
  breakerCooldownMs: 60_000,
};

/** Lỗi có kèm status để lớp trên phân biệt sai mật khẩu / sai captcha / hết hạn token. */
export class GdtError extends Error {
  status: number;
  code: string;
  body: unknown;

  constructor(
    message: string,
    { status = 0, code = '', body = null }: { status?: number; code?: string; body?: unknown } = {},
  ) {
    super(message);
    this.name = 'GdtError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Semaphore nhỏ gọn - thay cho p-limit để không phải thêm dependency. */
function createLimiter(max: number) {
  let active = 0;
  const queue: Array<{
    fn: () => Promise<unknown>;
    resolve: (v: unknown) => void;
    reject: (e: unknown) => void;
  }> = [];

  const next = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const item = queue.shift();
    if (!item) return;
    item
      .fn()
      .then(item.resolve, item.reject)
      .finally(() => {
        active--;
        next();
      });
  };

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      next();
    });
}

const limit = createLimiter(tuning.concurrency);
let lastRequestAt = 0;

// ------------------------------------------------------------------ Ngắt mạch

const circuit = { consecutive: 0, openUntil: 0 };

export const circuitState = () => ({ ...circuit });

export function resetCircuit(): void {
  circuit.consecutive = 0;
  circuit.openUntil = 0;
}

function recordRateLimited() {
  circuit.consecutive++;
  if (circuit.consecutive >= tuning.breakerThreshold) {
    circuit.openUntil = Date.now() + tuning.breakerCooldownMs;
  }
}

/** Một lần gọi trót lọt là bằng chứng cổng đã bình thường trở lại. */
function recordSuccess() {
  circuit.consecutive = 0;
  circuit.openUntil = 0;
}

/** Mạch đang mở thì nằm im chờ hết giờ, không gõ cửa cổng Thuế thêm lần nào. */
async function waitForCircuit() {
  const remaining = circuit.openUntil - Date.now();
  if (remaining > 0) await sleep(remaining);
}

/**
 * Thời gian chờ trước lần thử kế tiếp.
 *
 * Cộng thêm tối đa 50% ngẫu nhiên: khi chạy hàng loạt, nhiều request cùng bị
 * 429 một lúc; nếu tất cả cùng chờ đúng một khoảng thì chúng sẽ lại cùng ập vào
 * cổng ở đúng một thời điểm. Jitter chỉ CỘNG THÊM, không bao giờ trừ bớt, nên
 * vẫn luôn chờ đủ mức cổng Thuế yêu cầu.
 */
export function computeBackoffMs(attempt: number, retryAfterSec = 0, random = Math.random): number {
  const base = retryAfterSec > 0 ? retryAfterSec * 1000 : tuning.baseBackoffMs * 2 ** attempt;
  const capped = Math.min(base, tuning.maxBackoffMs);
  return Math.min(tuning.maxBackoffMs, Math.round(capped + random() * capped * 0.5));
}

async function throttle() {
  const gap = Date.now() - lastRequestAt;
  if (gap < tuning.minGapMs) await sleep(tuning.minGapMs - gap);
  lastRequestAt = Date.now();
}

export interface RequestOptions {
  method?: string;
  token?: string | null;
  body?: unknown;
  raw?: boolean;
  timeoutMs?: number;
}

/** @returns JSON đã parse, hoặc Buffer nếu raw = true */
export async function request(url: string, options: RequestOptions = {}): Promise<any> {
  const { method = 'GET', token = null, body = null, raw = false, timeoutMs } = options;

  return limit(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= tuning.maxRetries; attempt++) {
      await waitForCircuit();
      await throttle();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs ?? tuning.timeoutMs);

      try {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        if (body) headers['Content-Type'] = 'application/json';

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        // Quá tải hoặc bị giới hạn: chờ đúng thời gian cổng yêu cầu rồi thử lại.
        if (res.status === 429 || res.status === 503) {
          recordRateLimited();
          const retryAfter = Number(res.headers.get('retry-after')) || 0;
          lastError = new GdtError(`Cổng Thuế đang giới hạn truy cập (HTTP ${res.status})`, {
            status: res.status,
          });
          if (attempt < tuning.maxRetries) {
            await sleep(computeBackoffMs(attempt, retryAfter));
            continue;
          }
          throw lastError;
        }

        if (res.status === 401) {
          // Cổng dùng 401 cho CẢ token hết hạn LẪN sai mật khẩu/captcha lúc đăng
          // nhập, nhưng thân phản hồi có nói rõ là cái nào. Vứt thân đi thì lớp
          // trên chỉ còn đoán, và người dùng nhận một câu chung chung vô dụng.
          const text = await res.text().catch(() => '');
          let parsed: any = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            /* thân không phải JSON, giữ nguyên text */
          }
          throw new GdtError(parsed?.message || 'Token hết hạn hoặc không hợp lệ', {
            status: 401,
            code: 'UNAUTHORIZED',
            body: parsed ?? text.slice(0, 500),
          });
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          let parsed: any = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            /* body không phải JSON, giữ nguyên text */
          }
          throw new GdtError(parsed?.message || `Cổng Thuế trả về HTTP ${res.status}`, {
            status: res.status,
            code: parsed?.code || '',
            body: parsed ?? text.slice(0, 500),
          });
        }

        recordSuccess();
        if (raw) return Buffer.from(await res.arrayBuffer());
        const text = await res.text();
        if (!text) return null;
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      } catch (err) {
        clearTimeout(timer);
        // Lỗi nghiệp vụ (401, 4xx) không nên thử lại - thử lại cũng cùng kết quả.
        if (err instanceof GdtError && err.status !== 429 && err.status !== 503) throw err;
        lastError = err;
        if (attempt < tuning.maxRetries) {
          await sleep(computeBackoffMs(attempt));
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError;
  });
}
