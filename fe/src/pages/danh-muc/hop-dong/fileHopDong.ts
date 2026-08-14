/** Cùng bộ định dạng/giới hạn với BE (`hop-dong-file.rules.ts`). */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export function dinhDangDungLuong(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${Number(mb.toFixed(1))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Lỗi hiển thị cho người dùng, `null` là hợp lệ — chặn ngay ở trình duyệt cho nhanh. */
export function kiemTraTruocKhiTaiLen(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return 'File vượt quá 25MB';
  if (!ALLOWED_MIME.has(file.type)) return 'Định dạng file không hỗ trợ';
  return null;
}
