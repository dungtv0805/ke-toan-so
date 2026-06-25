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
import { BangKeBanRaService } from './bang-ke-ban-ra.service';
import {
  CreateBangKeBanRaDto,
  UpdateBangKeBanRaDto,
  BangKeBanRaQueryDto,
} from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

const KE_TOAN_ROLES = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_TONG_HOP',
  'KE_TOAN_QUY',
  'KE_TOAN_CONG_NO',
  'MANAGER',
  'KIEM_SOAT',
];

@Controller('bang-ke-ban-ra')
@UseGuards(JwtGuard, RoleGuard)
export class BangKeBanRaController {
  constructor(private readonly service: BangKeBanRaService) {}

  @Get()
  @Roles(...KE_TOAN_ROLES)
  async findAll(@Query() query: BangKeBanRaQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get(':id')
  @Roles(...KE_TOAN_ROLES)
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY')
  async create(@Body() createDto: CreateBangKeBanRaDto) {
    const data = await this.service.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBangKeBanRaDto,
  ) {
    const data = await this.service.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
