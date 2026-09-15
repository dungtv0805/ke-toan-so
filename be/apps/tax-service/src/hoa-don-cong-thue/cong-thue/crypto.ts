/**
 * Mã hóa mật khẩu cổng Thuế trước khi ghi xuống cơ sở dữ liệu.
 *
 * AES-256-GCM: vừa giấu nội dung vừa phát hiện được nếu bản mã bị sửa. Khóa
 * lấy từ biến môi trường, KHÔNG bao giờ nằm trong cơ sở dữ liệu - mất khóa là
 * mất toàn bộ mật khẩu đã lưu, và đó là chủ ý: bản sao lưu cơ sở dữ liệu lọt ra
 * ngoài cũng không lộ mật khẩu của khách hàng.
 */
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

function layKhoa(key?: string): Buffer {
  const hex = key || process.env.CONG_THUE_KEY || '';
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(
      'Thiếu hoặc sai CONG_THUE_KEY — cần chuỗi hex 64 ký tự. ' +
        'Sinh khóa mới: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

/** @returns chuỗi 'iv:tag:ciphertext' dạng base64, an toàn để lưu vào một cột text. */
export function encrypt(plain: string, key?: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, layKhoa(key), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

export function decrypt(payload: string, key?: string): string {
  const [iv, tag, data] = String(payload).split(':');
  if (!iv || !tag || !data) throw new Error('Bản mã không đúng định dạng');

  const decipher = crypto.createDecipheriv(ALGO, layKhoa(key), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
