import { BadRequestException } from '@nestjs/common';

/** Cùng bộ định dạng với Thư viện tài liệu — giấy tờ hợp đồng cũng chỉ có bấy nhiêu. */
export const ALLOWED_MIME = new Set([
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

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Chặn file quá lớn hoặc sai định dạng trước khi ghi vào GridFS. */
export function kiemTraFile(file?: Express.Multer.File): void {
  if (!file) throw new BadRequestException('Thiếu file');
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('File vượt quá 25MB');
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new BadRequestException('Định dạng file không hỗ trợ');
  }
}
