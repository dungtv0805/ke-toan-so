import { BadRequestException } from '@nestjs/common';

/**
 * Kiểm file hồ sơ đính kèm — mục 8: "cho phép tải file scan, ảnh, PDF và các
 * định dạng tài liệu phù hợp".
 *
 * Cùng bộ quy tắc với thư viện tài liệu (`tai-lieu.service`), thêm `image/tiff`
 * và `image/bmp` vì máy scan văn phòng hay xuất hai định dạng này.
 */

export const MAX_FILE = 25 * 1024 * 1024;

export const MIME_CHO_PHEP = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/bmp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export function kiemTraFile(file?: Express.Multer.File): void {
  if (!file) throw new BadRequestException('Thiếu file');
  if (file.size > MAX_FILE) {
    throw new BadRequestException('File vượt quá 25MB');
  }
  if (!MIME_CHO_PHEP.has(file.mimetype)) {
    throw new BadRequestException(
      `Định dạng "${file.mimetype}" không hỗ trợ. Chấp nhận PDF, ảnh scan, Word, Excel, PowerPoint.`,
    );
  }
}
