import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '@app/auth';
import { TenantContextService } from '@app/core';
import type {
  BuocCauHinh,
  HoSoPheDuyet,
  LoaiDoiTuongPheDuyet,
} from '@app/entities';
import { CauHinhPheDuyetService } from './cau-hinh.service';
import { PheDuyetService } from './phe-duyet.service';
import { ThongBaoService } from './thong-bao.service';
import { TocDoService } from './toc-do.service';
import { ViTriPheDuyetService } from './vi-tri.service';

@Controller('phe-duyet')
@UseGuards(JwtGuard)
export class PheDuyetController {
  constructor(
    private readonly pheDuyet: PheDuyetService,
    private readonly cauHinh: CauHinhPheDuyetService,
    private readonly viTri: ViTriPheDuyetService,
    private readonly tocDo: TocDoService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ===== Cấu hình — mục 3 và 4 =====

  /** Ma trận: danh sách vị trí của công ty + cấu hình từng loại nghiệp vụ. */
  @Get('cau-hinh')
  async layCauHinh(@Query('loaiDoiTuong') loaiDoiTuong?: LoaiDoiTuongPheDuyet) {
    const [viTri, cauHinh] = await Promise.all([
      this.viTri.danhSachViTri(),
      this.cauHinh.danhSach(loaiDoiTuong ?? 'CHUNG_TU'),
    ]);
    return { success: true, data: { viTri, cauHinh } };
  }

  @Put('cau-hinh')
  async luuCauHinh(
    @Body()
    body: {
      loaiDoiTuong?: LoaiDoiTuongPheDuyet;
      loaiNghiepVuMa: string;
      loaiNghiepVuTen?: string;
      buoc: BuocCauHinh[];
    },
  ) {
    const data = await this.cauHinh.luu({
      loaiDoiTuong: body.loaiDoiTuong ?? 'CHUNG_TU',
      loaiNghiepVuMa: body.loaiNghiepVuMa,
      loaiNghiepVuTen: body.loaiNghiepVuTen,
      buoc: body.buoc ?? [],
    });
    return { success: true, data };
  }

  @Get('vi-tri')
  async layViTri() {
    const [viTri, gan] = await Promise.all([
      this.viTri.danhSachViTri(),
      this.viTri.danhSachGan(),
    ]);
    return { success: true, data: { viTri, gan } };
  }

  @Put('vi-tri')
  async ganViTri(
    @Body()
    body: {
      viTriTen: string;
      nguoiDung: { userId: string; hoTen?: string; email?: string }[];
    },
  ) {
    const data = await this.viTri.ganViTri({
      viTriTen: body.viTriTen,
      nguoiDung: body.nguoiDung ?? [],
    });
    return { success: true, data };
  }

  // ===== Luồng — mục 5, 6, 7 =====

  @Post('gui-duyet')
  async guiDuyet(
    @Body()
    body: {
      loaiDoiTuong?: LoaiDoiTuongPheDuyet;
      doiTuongId: string;
      loaiNghiepVuMa: string;
      loaiNghiepVuTen?: string;
      soPhieu?: string;
      noiDung?: string;
      soTien?: number;
      ngayNghiepVu?: string;
      boPhan?: string;
      nguoiLapTen?: string;
    },
  ) {
    const data = await this.pheDuyet.guiDuyet({
      ...body,
      loaiDoiTuong: body.loaiDoiTuong ?? 'CHUNG_TU',
    });
    return { success: true, data };
  }

  @Get('cho-toi-duyet')
  async choToiDuyet() {
    const data = await this.pheDuyet.choToiDuyet();
    return { success: true, data };
  }

  /**
   * Trạng thái hàng loạt cho lưới chứng từ. Đặt TRƯỚC `:id` — Nest khớp route
   * theo thứ tự khai báo, để sau thì 'trang-thai' bị nuốt thành một id.
   */
  @Post('trang-thai')
  async trangThai(
    @Body() body: { loaiDoiTuong?: LoaiDoiTuongPheDuyet; doiTuongIds: string[] },
  ) {
    const data = await this.pheDuyet.trangThaiHangLoat(
      body.loaiDoiTuong ?? 'CHUNG_TU',
      body.doiTuongIds ?? [],
    );
    return { success: true, data };
  }

  /** Nghiệp vụ vừa bị sửa — voucher-service gọi vào đây. Mục 11. */
  @Post('sau-khi-sua')
  async sauKhiSua(
    @Body()
    body: {
      loaiDoiTuong?: LoaiDoiTuongPheDuyet;
      doiTuongId: string;
      truoc: unknown;
      sau: unknown;
    },
  ) {
    const data = await this.pheDuyet.sauKhiSua(
      body.loaiDoiTuong ?? 'CHUNG_TU',
      body.doiTuongId,
      body.truoc,
      body.sau,
    );
    return { success: true, data };
  }

  @Get('bao-cao-toc-do')
  async baoCaoTocDo(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    const data = await this.tocDo.baoCao({ tuNgay, denNgay });
    return { success: true, data };
  }

  /** Quy trình theo ID nghiệp vụ gốc — màn chứng từ dùng để hiện nút và trạng thái. */
  @Get('theo-doi-tuong/:doiTuongId')
  async theoDoiTuong(
    @Param('doiTuongId') doiTuongId: string,
    @Query('loaiDoiTuong') loaiDoiTuong?: LoaiDoiTuongPheDuyet,
  ) {
    const data = await this.pheDuyet.timTheoDoiTuong(
      loaiDoiTuong ?? 'CHUNG_TU',
      doiTuongId,
    );
    return { success: true, data };
  }

  /** Màn chi tiết phê duyệt — mục 7. */
  @Get(':id')
  async chiTiet(@Param('id') id: string) {
    const [quyTrinh, lichSu] = await Promise.all([
      this.pheDuyet.chiTiet(id),
      this.pheDuyet.lichSu(id),
    ]);
    return { success: true, data: { quyTrinh, lichSu } };
  }

  @Post(':id/duyet')
  async duyet(@Param('id') id: string, @Body() body: { yKien?: string }) {
    const data = await this.pheDuyet.duyet(id, {
      yKien: body?.yKien,
      hoTen: this.tenantContext.getCurrentEmail(),
    });
    return { success: true, data };
  }

  @Post(':id/tra-lai')
  async traLai(@Param('id') id: string, @Body() body: { yKien?: string }) {
    const data = await this.pheDuyet.traLai(id, {
      yKien: body?.yKien,
      hoTen: this.tenantContext.getCurrentEmail(),
    });
    return { success: true, data };
  }

  @Post(':id/tu-choi')
  async tuChoi(@Param('id') id: string, @Body() body: { yKien?: string }) {
    const data = await this.pheDuyet.tuChoi(id, {
      yKien: body?.yKien,
      hoTen: this.tenantContext.getCurrentEmail(),
    });
    return { success: true, data };
  }

  /** Gắn hồ sơ/chứng từ kèm theo — mục 8. */
  @Post(':id/ho-so')
  async themHoSo(@Param('id') id: string, @Body() body: HoSoPheDuyet) {
    const data = await this.pheDuyet.themHoSo(id, body);
    return { success: true, data };
  }
}

@Controller('thong-bao')
@UseGuards(JwtGuard)
export class ThongBaoController {
  constructor(
    private readonly thongBao: ThongBaoService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private userId(): string {
    return this.tenantContext.getCurrentUserId() ?? '';
  }

  @Get()
  async danhSach() {
    const data = await this.thongBao.cuaToi(this.userId());
    return { success: true, data };
  }

  @Get('chua-doc')
  async chuaDoc() {
    const soLuong = await this.thongBao.demChuaDoc(this.userId());
    return { success: true, data: { soLuong } };
  }

  @Post('da-doc-tat-ca')
  async daDocTatCa() {
    await this.thongBao.danhDauTatCa(this.userId());
    return { success: true };
  }

  @Post(':id/da-doc')
  async daDoc(@Param('id') id: string) {
    await this.thongBao.danhDauDaDoc(id, this.userId());
    return { success: true };
  }
}
