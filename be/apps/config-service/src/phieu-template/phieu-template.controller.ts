import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PhieuTemplate_Service } from './phieu-template.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { UpsertPhieuTemplateDto } from './dto';

@Controller('phieu-template')
@UseGuards(JwtGuard, RoleGuard)
export class PhieuTemplate_Controller {
  constructor(private readonly service: PhieuTemplate_Service) {}

  @Get(':loai')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER')
  async findByLoai(@Param('loai') loai: string) {
    const data = await this.service.findByLoai(loai);
    return { success: true, data };
  }

  @Put(':loai')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async upsert(
    @Param('loai') loai: string,
    @Body() dto: UpsertPhieuTemplateDto,
  ) {
    const data = await this.service.upsert(loai, dto.html);
    return { success: true, data };
  }

  @Delete(':loai')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async remove(@Param('loai') loai: string) {
    await this.service.remove(loai);
    return { success: true, message: 'Đã khôi phục mẫu mặc định' };
  }
}
