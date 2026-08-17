/** Cùng bộ định dạng/giới hạn với BE (`hop-dong-file.rules.ts`) — chỉ nhận PDF. */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const PDF_MIME = 'application/pdf';

/** Giá trị cho thuộc tính `accept` của ô kéo-thả. */
export const ACCEPT_PDF = '.pdf,application/pdf';

export function dinhDangDungLuong(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${Number(mb.toFixed(1))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Lỗi hiển thị cho người dùng, `null` là hợp lệ — chặn ngay ở trình duyệt cho nhanh. */
export function kiemTraTruocKhiTaiLen(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return `${file.name}: vượt quá 25MB`;
  // Vài trình duyệt/OS không đoán ra MIME khi kéo-thả → xét thêm đuôi file.
  const laPdf =
    file.type === PDF_MIME ||
    (!file.type && file.name.toLowerCase().endsWith('.pdf'));
  if (!laPdf) return `${file.name}: chỉ nhận file PDF`;
  return null;
}
