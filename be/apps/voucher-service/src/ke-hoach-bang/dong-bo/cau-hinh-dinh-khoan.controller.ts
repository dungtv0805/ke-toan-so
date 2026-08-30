import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DongBoHachToanKeHoachService } from './dong-bo.service';
import { LuuCauHinhDinhKhoanDto } from './dto';

const XEM = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_QUY',
  'KE_TOAN_TONG_HOP',
  'MANAGER',
  'KIEM_SOAT',
];
// Đổi định khoản làm lệch P&L Kế hoạch của cả công ty — chỉ hai vai được sửa.
const SUA = ['ADMIN', 'KE_TOAN_TRUONG'];

/**
 * Cấu hình cặp Nợ/Có dùng khi sinh dòng hạch toán kế hoạch từ bảng chi tiết.
 * Lần đọc đầu tiên tự seed bộ mặc định cho công ty.
 */
@Controller('ke-hoach-dinh-khoan')
@UseGuards(JwtGuard, RoleGuard)
export class CauHinhDinhKhoanController {
  constructor(private readonly service: DongBoHachToanKeHoachService) {}

  @Get()
  @Roles(...XEM)
  async lay() {
    return { success: true, data: await this.service.layCauHinh() };
  }

  @Put()
  @Roles(...SUA)
  async luu(@Body() dto: LuuCauHinhDinhKhoanDto) {
    return { success: true, data: await this.service.luuCauHinh(dto.items) };
  }
}
