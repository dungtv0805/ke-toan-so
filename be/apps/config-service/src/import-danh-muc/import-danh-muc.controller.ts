import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { ImportDanhMucService } from './import-danh-muc.service';
import { ImportEntry } from './import-danh-muc.types';
import { ImportItemsDto } from './dto/import-items.dto';
import { QuyChuan_Service } from '../quy-chuan/quy-chuan.service';
import { CreateQuyChuan_Dto } from '../quy-chuan/dto';

@Controller('import')
@UseGuards(JwtGuard, RoleGuard)
export class ImportDanhMucController {
  private registry: Map<string, ImportEntry>;

  constructor(
    private readonly importService: ImportDanhMucService,
    quyChuan: QuyChuan_Service,
  ) {
    this.registry = new Map<string, ImportEntry>([
      [
        'quy-chuan',
        {
          service: quyChuan,
          dtoClass: CreateQuyChuan_Dto,
          label: 'Quy chuẩn hạch toán',
        },
      ],
    ]);
  }

  @Post(':resource')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async importDanhMuc(
    @Param('resource') resource: string,
    @Body() dto: ImportItemsDto,
  ) {
    const entry = this.registry.get(resource);
    if (!entry) {
      throw new NotFoundException(`Không hỗ trợ import danh mục "${resource}"`);
    }
    const data = await this.importService.importItems(entry, dto.items ?? []);
    return { success: true, data };
  }
}
