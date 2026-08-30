import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { KeHoachDongTienService } from './dong-tien.service';
import {
  BatchKeHoachDongTienDto,
  CreateKeHoachDongTienDto,
  KeHoachDongTienQueryDto,
  LuuTonDauDto,
  TonDauQueryDto,
  UpdateKeHoachDongTienDto,
} from './dto';
import { LOAI_KE_HOACH_MAC_DINH } from '../helpers';

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

@Controller('ke-hoach-dong-tien')
@UseGuards(JwtGuard, RoleGuard)
export class KeHoachDongTienController {
  constructor(private readonly service: KeHoachDongTienService) {}

  @Get()
  @Roles(...XEM)
  async layTheoNam(@Query() query: KeHoachDongTienQueryDto) {
    return {
      success: true,
      data: await this.service.layTheoNam(
        query.nam,
        query.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
      ),
    };
  }

  // Phải đứng TRƯỚC ':id' để 'ton-dau' không bị ':id' nuốt.
  @Get('ton-dau')
  @Roles(...XEM)
  async layTonDau(@Query() query: TonDauQueryDto) {
    return { success: true, data: await this.service.layTonDau(query) };
  }

  @Put('ton-dau')
  @Roles(...SUA)
  async luuTonDau(
    @Body() dto: LuuTonDauDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.luuTonDau(dto, user.id) };
  }

  @Post()
  @Roles(...SUA)
  async taoMoi(
    @Body() dto: CreateKeHoachDongTienDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.taoMoi(dto, user.id) };
  }

  @Post('batch')
  @Roles(...SUA)
  async luuHangLoat(
    @Body() dto: BatchKeHoachDongTienDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.luuHangLoat(dto, user.id) };
  }

  @Patch(':id')
  @Roles(...SUA)
  async capNhat(
    @Param('id') id: string,
    @Body() dto: UpdateKeHoachDongTienDto,
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
