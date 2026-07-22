import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ImportEntry,
  ImportFailure,
  ImportResult,
} from './import-danh-muc.types';

@Injectable()
export class ImportDanhMucService {
  private readonly logger = new Logger(ImportDanhMucService.name);

  /**
   * Chạy tuần tự từng dòng: validate theo DTO của danh mục rồi gọi service.create().
   * Tuần tự (không Promise.all) để check trùng mã trong cùng một lần import vẫn đúng —
   * create() của mỗi service tự query DB trước khi ghi.
   * Một dòng lỗi không chặn các dòng sau.
   */
  async importItems(
    entry: ImportEntry,
    items: Record<string, unknown>[],
  ): Promise<ImportResult> {
    const failed: ImportFailure[] = [];
    let created = 0;

    for (let i = 0; i < items.length; i++) {
      // items[0] là dòng 2 của file Excel vì dòng 1 là header
      const row = i + 2;
      const dto = plainToInstance(entry.dtoClass, items[i]);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        failed.push({ row, message: this.formatValidationErrors(errors) });
        continue;
      }

      try {
        await entry.service.create(dto);
        created++;
      } catch (e) {
        const message =
          (e as { message?: string })?.message ??
          `Không tạo được ${entry.label}`;
        this.logger.warn(`Import ${entry.label} dòng ${row} lỗi: ${message}`);
        failed.push({ row, message });
      }
    }

    return { created, failed };
  }

  /**
   * class-validator trả constraint bằng tiếng Anh (vd "ma should not be empty") vì hầu hết
   * DTO danh mục không khai báo message tuỳ chỉnh. Không dịch từng constraint (không đủ tin cậy
   * và phải sửa 21 DTO) — thay vào đó trả thông báo tiếng Việt cố định, chỉ giữ lại tên trường
   * để người dùng biết ô nào trong file Excel bị sai.
   */
  private formatValidationErrors(
    errors: { property: string; constraints?: Record<string, string> }[],
  ): string {
    const fields = errors.map((e) => e.property).join(', ');
    return `Dữ liệu không hợp lệ ở các trường: ${fields}`;
  }
}
