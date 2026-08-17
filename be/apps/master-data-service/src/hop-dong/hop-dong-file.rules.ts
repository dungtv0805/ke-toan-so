import { BadRequestException } from '@nestjs/common';

/**
 * CHỈ nhận PDF: giấy tờ hợp đồng cần xem được ngay trên trình duyệt và không đổi
 * bố cục giữa các máy. File cũ thuộc định dạng khác vẫn giữ nguyên, chỉ chặn tải mới.
 */
export const ALLOWED_MIME = new Set(['application/pdf']);

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Chặn file quá lớn hoặc sai định dạng trước khi ghi vào GridFS. */
export function kiemTraFile(file?: Express.Multer.File): void {
  if (!file) throw new BadRequestException('Thiếu file');
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('File vượt quá 25MB');
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new BadRequestException('Chỉ nhận file PDF');
  }
}
