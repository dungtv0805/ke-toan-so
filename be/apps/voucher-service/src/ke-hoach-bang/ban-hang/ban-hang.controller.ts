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
import { LOAI_KE_HOACH_MAC_DINH } from '../helpers';
import { KeHoachBanHangService } from './ban-hang.service';
import {
  BatchKeHoachBanHangDto,
  CreateKeHoachBanHangDto,
  KeHoachBanHangQueryDto,
  UpdateKeHoachBanHangDto,
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

@Controller('ke-hoach-ban-hang')
@UseGuards(JwtGuard, RoleGuard)
export class KeHoachBanHangController {
  constructor(private readonly service: KeHoachBanHangService) {}

  @Get()
  @Roles(...XEM)
  async layTheoNam(@Query() query: KeHoachBanHangQueryDto) {
    return {
      success: true,
      data: await this.service.layTheoNam(
        query.nam,
        query.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
      ),
    };
  }

  @Post()
  @Roles(...SUA)
  async taoMoi(
    @Body() dto: CreateKeHoachBanHangDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.taoMoi(dto, user.id) };
  }

  // Phải đứng TRƯỚC @Patch(':id') / @Delete(':id') để 'batch' không bị ':id' nuốt.
  @Post('batch')
  @Roles(...SUA)
  async luuHangLoat(
    @Body() dto: BatchKeHoachBanHangDto,
    @CurrentUser() user: UserPayload,
  ) {
    return {
      success: true,
      data: await this.service.luuHangLoat(dto, user.id),
    };
  }

  @Patch(':id')
  @Roles(...SUA)
  async capNhat(
    @Param('id') id: string,
    @Body() dto: UpdateKeHoachBanHangDto,
  ) {
    return { success: true, data: await this.service.capNhat(id, dto) };
  }

  @Delete(':id')
  @Roles(...SUA)
  async xoa(@Param('id') id: string) {
    await this.service.xoa(id);
    return { success: true };
  }
}
