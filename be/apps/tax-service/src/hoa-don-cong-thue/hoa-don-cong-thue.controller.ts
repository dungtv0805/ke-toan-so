import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { TenantContextService } from '@app/core';
import { HoaDonCongThueService } from './hoa-don-cong-thue.service';
import { PhienCongThueService } from './cong-thue/phien.service';
import { TaiHangLoatService } from './tai-hang-loat.service';

const KE_TOAN_ROLES = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_TONG_HOP',
  'KE_TOAN_QUY',
  'KE_TOAN_CONG_NO',
  'MANAGER',
  'KIEM_SOAT',
];

/** Thao tác chạm tới cổng Thuế bằng tài khoản của doanh nghiệp: siết chặt hơn. */
const QUAN_TRI_ROLES = ['ADMIN', 'KE_TOAN_TRUONG'];

/**
 * Tải hóa đơn điện tử từ cổng Thuế.
 *
 * Đăng nhập cổng Thuế là hai bước vì cổng bắt nhập captcha:
 *
 *   POST /dang-nhap          -> { trangThai: 'can_captcha', sessionId, captchaSvg }
 *   POST /captcha/:sessionId -> { trangThai: 'da_dang_nhap' }
 *
 * captchaSvg là chuỗi SVG do máy chủ ngoài sinh ra. Giao diện NÊN hiển thị qua
 * <img src="data:image/svg+xml;base64,..."> thay vì nhúng thẳng vào DOM.
 */
@Controller('hoa-don-cong-thue')
@UseGuards(JwtGuard, RoleGuard)
export class HoaDonCongThueController {
  constructor(
    private readonly service: HoaDonCongThueService,
    private readonly phien: PhienCongThueService,
    private readonly taiHangLoat: TaiHangLoatService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get tenantId(): string {
    return this.tenantContext.getCurrentTenantId() ?? '';
  }

  // ----------------------------------------------------------- Công ty

  @Get('cong-ty')
  @Roles(...KE_TOAN_ROLES)
  async danhSachCongTy() {
    return { success: true, data: await this.service.danhSachCongTy() };
  }

  @Post('cong-ty')
  @Roles(...QUAN_TRI_ROLES)
  async luuCongTy(@Body() dto: any) {
    return { success: true, data: await this.service.luuCongTy(dto) };
  }

  @Put('cong-ty/:mst/quen-mat-khau')
  @Roles(...QUAN_TRI_ROLES)
  async quenMatKhau(@Param('mst') mst: string) {
    return { success: true, data: await this.service.quenMatKhau(mst) };
  }

  /** Lịch tải riêng của từng công ty: giờ chạy và số ngày kéo lại. */
  @Put('cong-ty/:mst/lich')
  @Roles(...QUAN_TRI_ROLES)
  async datLich(@Param('mst') mst: string, @Body() dto: any) {
    return { success: true, data: await this.service.datLich(mst, dto) };
  }

  // -------------------------------------------------------- Đăng nhập

  @Get('phien')
  @Roles(...KE_TOAN_ROLES)
  async trangThaiPhien() {
    return { success: true, data: await this.phien.trangThai(this.tenantId) };
  }

  @Post('cong-ty/:mst/dang-nhap')
  @Roles(...QUAN_TRI_ROLES)
  async dangNhap(@Param('mst') mst: string, @Body() dto: { matKhau?: string }) {
    const ket = await this.phien.batDauDangNhap(this.tenantId, mst, { matKhau: dto?.matKhau ?? null });
    return { success: true, data: ket };
  }

  @Post('captcha/:sessionId')
  @Roles(...QUAN_TRI_ROLES)
  async guiCaptcha(
    @Param('sessionId') sessionId: string,
    @Body() dto: { giaTri: string; matKhau?: string },
  ) {
    const ket = await this.phien.guiCaptcha(this.tenantId, sessionId, dto.giaTri, {
      matKhau: dto?.matKhau ?? null,
    });
    return { success: true, data: ket };
  }

  // ---------------------------------------------------------- Đồng bộ

  @Post('cong-ty/:mst/dong-bo')
  @Roles(...QUAN_TRI_ROLES)
  async dongBo(@Param('mst') mst: string, @Body() dto: { tuNgay: string; denNgay: string }) {
    const ket = await this.service.dongBo(this.tenantId, {
      mst,
      tuNgay: dto.tuNgay,
      denNgay: dto.denNgay,
    });
    return { success: true, data: ket };
  }

  // ----------------------------------------------------- Tải hàng loạt

  /**
   * Tải cho nhiều mã số thuế một lượt.
   * Bỏ trống `dsMst` nghĩa là chạy hết mọi mã đang bật.
   */
  @Post('tai-hang-loat')
  @Roles(...QUAN_TRI_ROLES)
  async taiHangLoatBatDau(@Body() dto: { dsMst?: string[]; tuNgay: string; denNgay: string }) {
    const luot = await this.taiHangLoat.batDau(this.tenantId, dto);
    return { success: true, data: luot };
  }

  @Get('tai-hang-loat/gan-nhat')
  @Roles(...KE_TOAN_ROLES)
  async luotGanNhat() {
    return { success: true, data: this.taiHangLoat.ganNhat(this.tenantId) };
  }

  @Get('tai-hang-loat/:id')
  @Roles(...KE_TOAN_ROLES)
  async luotChay(@Param('id') id: string) {
    return { success: true, data: this.taiHangLoat.trangThai(Number(id)) };
  }

  /**
   * Chạy tiếp phần còn dở.
   * Mặc định chỉ lấy hàng chờ captcha; truyền `gom: ['loi']` để chạy lại phần lỗi.
   */
  @Post('tai-hang-loat/:id/chay-tiep')
  @Roles(...QUAN_TRI_ROLES)
  async chayTiep(@Param('id') id: string, @Body() dto: { gom?: string[] }) {
    const ket = await this.taiHangLoat.chayTiep(Number(id), { gom: dto?.gom as any });
    return { success: true, data: ket };
  }

  @Get('cong-ty/:mst/hoa-don')
  @Roles(...KE_TOAN_ROLES)
  async hoaDon(@Param('mst') mst: string, @Query() q: any) {
    const data = await this.service.timHoaDon({
      mst,
      chieu: q.chieu,
      tuNgay: q.tuNgay,
      denNgay: q.denNgay,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { success: true, data, total: data.length };
  }
}
