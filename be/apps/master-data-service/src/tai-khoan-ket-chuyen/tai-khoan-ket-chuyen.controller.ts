import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaiKhoanKetChuyenService } from './tai-khoan-ket-chuyen.service';
import {
  CreateTaiKhoanKetChuyenDto,
  UpdateTaiKhoanKetChuyenDto,
} from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';

const VAI_TRO_DOC = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_QUY',
  'KE_TOAN_CONG_NO',
  'KE_TOAN_TONG_HOP',
  'MANAGER',
  'KIEM_SOAT',
] as const;

@Controller('tai-khoan-ket-chuyen')
@UseGuards(JwtGuard, RoleGuard)
export class TaiKhoanKetChuyenController {
  constructor(private readonly service: TaiKhoanKetChuyenService) {}

  @Get()
  @Roles(...VAI_TRO_DOC)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all')
  @Roles(...VAI_TRO_DOC)
  async getAll() {
    const data = await this.service.findAll();
    return { success: true, data };
  }

  @Get('stats')
  @Roles(...VAI_TRO_DOC)
  async getStats() {
    const data = await this.service.getStats();
    return { success: true, data };
  }

  @Get('check-ma')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async checkMa(@Query('ma') ma: string, @Query('excludeId') excludeId?: string) {
    const exists = await this.service.checkMaExists(ma, excludeId);
    return { success: true, data: { exists } };
  }

  @Get(':id')
  @Roles(...VAI_TRO_DOC)
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async create(@Body() createDto: CreateTaiKhoanKetChuyenDto) {
    const data = await this.service.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaiKhoanKetChuyenDto,
  ) {
    const data = await this.service.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.service.deleteBatch(dto.ids);
    return { success: true, data };
  }
}
