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
import { KeHoachTaiSanService } from './tai-san.service';
import {
  BatchKeHoachTaiSanDto,
  CreateKeHoachTaiSanDto,
  KeHoachTaiSanQueryDto,
  UpdateKeHoachTaiSanDto,
} from './dto';
import { LOAI_KE_HOACH_MAC_DINH } from '../helpers';

const XEM = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_QUY',
  'KE_TOAN_TONG_HOP',
  'MANAGER',
  'KIEM_SOAT',
];
const SUA = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP'];

@Controller('ke-hoach-tai-san')
@UseGuards(JwtGuard, RoleGuard)
export class KeHoachTaiSanController {
  constructor(private readonly service: KeHoachTaiSanService) {}

  @Get()
  @Roles(...XEM)
  async layTheoNam(@Query() query: KeHoachTaiSanQueryDto) {
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
    @Body() dto: CreateKeHoachTaiSanDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.taoMoi(dto, user.id) };
  }

  // Phải đứng TRƯỚC ':id' để 'batch' không bị ':id' nuốt.
  @Post('batch')
  @Roles(...SUA)
  async luuHangLoat(
    @Body() dto: BatchKeHoachTaiSanDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.luuHangLoat(dto, user.id) };
  }

  @Patch(':id')
  @Roles(...SUA)
  async capNhat(@Param('id') id: string, @Body() dto: UpdateKeHoachTaiSanDto) {
    return { success: true, data: await this.service.capNhat(id, dto) };
  }

  @Delete(':id')
  @Roles(...SUA)
  async xoa(@Param('id') id: string) {
    await this.service.xoa(id);
    return { success: true };
  }
}
