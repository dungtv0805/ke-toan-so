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
import { KeHoachNguonVonService } from './nguon-von.service';
import {
  BatchKeHoachNguonVonDto,
  CreateKeHoachNguonVonDto,
  KeHoachNguonVonQueryDto,
  UpdateKeHoachNguonVonDto,
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

@Controller('ke-hoach-nguon-von')
@UseGuards(JwtGuard, RoleGuard)
export class KeHoachNguonVonController {
  constructor(private readonly service: KeHoachNguonVonService) {}

  @Get()
  @Roles(...XEM)
  async layTheoNam(@Query() query: KeHoachNguonVonQueryDto) {
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
    @Body() dto: CreateKeHoachNguonVonDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.taoMoi(dto, user.id) };
  }

  // Phải đứng TRƯỚC ':id' để 'batch' không bị ':id' nuốt.
  @Post('batch')
  @Roles(...SUA)
  async luuHangLoat(
    @Body() dto: BatchKeHoachNguonVonDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.luuHangLoat(dto, user.id) };
  }

  @Patch(':id')
  @Roles(...SUA)
  async capNhat(@Param('id') id: string, @Body() dto: UpdateKeHoachNguonVonDto) {
    return { success: true, data: await this.service.capNhat(id, dto) };
  }

  @Delete(':id')
  @Roles(...SUA)
  async xoa(@Param('id') id: string) {
    await this.service.xoa(id);
    return { success: true };
  }
}
