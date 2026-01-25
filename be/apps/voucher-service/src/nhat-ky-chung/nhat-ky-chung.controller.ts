import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NhatKyChungService } from './nhat-ky-chung.service';
import {
  NhatKyChungQueryDto,
  CreateNhatKyChungDto,
  UpdateNhatKyChungDto,
  BatchItemDto,
  SummaryType,
  SUMMARY_TYPES,
} from './dto';
import {
  JwtGuard,
  RoleGuard,
  Roles,
  CurrentUser,
  type UserPayload,
} from '@app/auth';
import { BadRequestException } from '@nestjs/common';

@Controller('nhat-ky-chung')
@UseGuards(JwtGuard, RoleGuard)
export class NhatKyChungController {
  constructor(private readonly nhatKyChungService: NhatKyChungService) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getEntries(@Query() query: NhatKyChungQueryDto) {
    return this.nhatKyChungService.getEntries(query);
  }

  @Get('stats')
  @Roles('ADMIN', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getStats(@Query() query: NhatKyChungQueryDto) {
    return this.nhatKyChungService.getStats(query);
  }

  @Get('summary/:type')
  @Roles('ADMIN', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getSummary(
    @Param('type') type: string,
    @Query() query: NhatKyChungQueryDto,
  ) {
    if (!SUMMARY_TYPES.includes(type as SummaryType)) {
      throw new BadRequestException(
        `Invalid summary type. Valid types: ${SUMMARY_TYPES.join(', ')}`,
      );
    }
    return this.nhatKyChungService.getSummary(type as SummaryType, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getById(@Param('id') id: string) {
    return this.nhatKyChungService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_QUY')
  async create(
    @Body() createDto: CreateNhatKyChungDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.nhatKyChungService.create(createDto, user.id);
  }

  @Post('batch')
  @Roles('ADMIN', 'KE_TOAN_QUY')
  async createBatch(
    @Body() items: CreateNhatKyChungDto[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.nhatKyChungService.createBatch(items, user.id);
  }

  @Patch('batch')
  @Roles('ADMIN', 'KE_TOAN_QUY')
  async updateBatch(
    @Body() body: { soPhieu: string; items: BatchItemDto[] },
    @CurrentUser() user: UserPayload,
  ) {
    return this.nhatKyChungService.updateBatch(body.soPhieu, body.items, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'KE_TOAN_QUY')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNhatKyChungDto,
  ) {
    console.log(updateDto);
    return this.nhatKyChungService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_QUY')
  async delete(@Param('id') id: string) {
    return this.nhatKyChungService.remove(id);
  }
}
