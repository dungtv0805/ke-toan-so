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
      const errors = await validate(dto as object, {
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

  private formatValidationErrors(
    errors: { property: string; constraints?: Record<string, string> }[],
  ): string {
    return errors
      .map((e) => {
        const detail = e.constraints
          ? Object.values(e.constraints).join(', ')
          : 'không hợp lệ';
        return `${e.property}: ${detail}`;
      })
      .join('; ');
  }
}
