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
import { ImportDanhMucRegistry } from './import-danh-muc.registry';
import { ImportItemsDto } from './dto/import-items.dto';

@Controller('import')
@UseGuards(JwtGuard, RoleGuard)
export class ImportDanhMucController {
  constructor(
    private readonly importService: ImportDanhMucService,
    private readonly registry: ImportDanhMucRegistry,
  ) {}

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
