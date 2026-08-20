import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtGuard,
  RoleGuard,
  Roles,
  type UserPayload,
} from '@app/auth';
import { KeHoachNhanSuService } from './nhan-su.service';
import {
  CreateKeHoachNhanSuDto,
  KeHoachNhanSuQueryDto,
  UpdateKeHoachNhanSuDto,
} from './dto';

// Chưa phân quyền riêng cho bảng kế hoạch — dùng lại danh sách vai trò của Kế hoạch.
const XEM = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_QUY',
  'KE_TOAN_TONG_HOP',
  'MANAGER',
  'KIEM_SOAT',
];
const SUA = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP'];

@Controller('ke-hoach-nhan-su')
@UseGuards(JwtGuard, RoleGuard)
export class KeHoachNhanSuController {
  constructor(private readonly service: KeHoachNhanSuService) {}

  @Get()
  @Roles(...XEM)
  async layTheoNam(@Query() query: KeHoachNhanSuQueryDto) {
    return { success: true, data: await this.service.layTheoNam(query.nam) };
  }

  @Post()
  @Roles(...SUA)
  async taoMoi(
    @Body() dto: CreateKeHoachNhanSuDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.taoMoi(dto, user.id) };
  }

  @Patch(':id')
  @Roles(...SUA)
  async capNhat(@Param('id') id: string, @Body() dto: UpdateKeHoachNhanSuDto) {
    return { success: true, data: await this.service.capNhat(id, dto) };
  }

  @Delete(':id')
  @Roles(...SUA)
  async xoa(@Param('id') id: string) {
    await this.service.xoa(id);
    return { success: true };
  }
}
