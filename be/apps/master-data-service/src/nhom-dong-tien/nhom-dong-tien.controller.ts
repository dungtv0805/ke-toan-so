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
import { NhomDongTienService } from './nhom-dong-tien.service';
import { CreateNhomDongTienDto, UpdateNhomDongTienDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';

@Controller('nhom-dong-tien')
@UseGuards(JwtGuard, RoleGuard)
export class NhomDongTienController {
  constructor(private readonly nhomDongTienService: NhomDongTienService) {}

  @Get()
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.nhomDongTienService.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getAll() {
    const data = await this.nhomDongTienService.findAll();
    return { success: true, data };
  }

  @Get('stats')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getStats() {
    const data = await this.nhomDongTienService.getStats();
    return { success: true, data };
  }

  @Get('check-ma')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async checkMa(
    @Query('ma') ma: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.nhomDongTienService.checkMaExists(ma, excludeId);
    return { success: true, data: { exists } };
  }

  @Get(':id')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findOne(@Param('id') id: string) {
    const data = await this.nhomDongTienService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async create(@Body() createDto: CreateNhomDongTienDto) {
    const data = await this.nhomDongTienService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNhomDongTienDto,
  ) {
    const data = await this.nhomDongTienService.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async delete(@Param('id') id: string) {
    await this.nhomDongTienService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.nhomDongTienService.deleteBatch(dto.ids);
    return { success: true, data };
  }
}
