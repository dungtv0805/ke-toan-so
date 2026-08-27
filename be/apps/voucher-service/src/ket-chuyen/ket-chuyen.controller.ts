import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtGuard,
  RoleGuard,
  Roles,
  type UserPayload,
} from '@app/auth';
import { CreateKetChuyenDto, PreviewKetChuyenDto, XoaKetChuyenDto } from './dto';
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

  /**
   * Cấu hình kết chuyển của công ty — hiện chỉ có mã Loại giao dịch mặc định.
   * Đặt TRƯỚC `@Get()` không cần thiết (path khác nhau), nhưng để cạnh nhau cho dễ đọc.
   */
  @Get('cau-hinh')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async layCauHinh() {
    const data = await this.ketChuyenService.layCauHinh();
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

  /**
   * `POST /xoa` thay vì `DELETE /:soPhieu`: số chứng từ luôn chứa dấu `/`
   * (`NVK202608/001`). Gateway giải mã `%2F` rồi ghép segment bằng `join('/')`
   * trước khi route, nên path-param không bao giờ khớp được số chứng từ có `/`.
   */
  @Post('xoa')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async remove(@Body() dto: XoaKetChuyenDto) {
    const data = await this.ketChuyenService.remove(dto.soPhieu);
    return { success: true, data };
  }
}
