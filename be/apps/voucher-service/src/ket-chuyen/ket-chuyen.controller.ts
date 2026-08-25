import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtGuard,
  RoleGuard,
  Roles,
  type UserPayload,
} from '@app/auth';
import { CreateKetChuyenDto, PreviewKetChuyenDto } from './dto';
import { KetChuyenService } from './ket-chuyen.service';

@Controller('ket-chuyen')
@UseGuards(JwtGuard, RoleGuard)
export class KetChuyenController {
  constructor(private readonly ketChuyenService: KetChuyenService) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async list() {
    const data = await this.ketChuyenService.list();
    return { success: true, data };
  }

  @Post('preview')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async preview(
    @Body() dto: PreviewKetChuyenDto,
    @Headers('authorization') authToken?: string,
  ) {
    const data = await this.ketChuyenService.preview(dto.denNgay, authToken);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async create(
    @Body() dto: CreateKetChuyenDto,
    @CurrentUser() user: UserPayload,
    @Headers('authorization') authToken?: string,
  ) {
    const data = await this.ketChuyenService.create(dto, user.id, authToken);
    return { success: true, data };
  }

  @Delete(':soPhieu')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async remove(@Param('soPhieu') soPhieu: string) {
    const data = await this.ketChuyenService.remove(soPhieu);
    return { success: true, data };
  }
}
