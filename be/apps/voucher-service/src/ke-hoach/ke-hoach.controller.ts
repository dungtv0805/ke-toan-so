import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { KeHoachService } from './ke-hoach.service';
import {
  BatchUpdateKeHoachItemDto,
  CreateKeHoachDto,
  DeleteBatchKeHoachDto,
  KeHoachQueryDto,
  KqkdQueryDto,
  SeriesQueryDto,
  SoSanhQueryDto,
  UpdateKeHoachDto,
} from './dto';
import {
  CHI_TIEU_LIST,
  ChiTieu,
  KE_HOACH_DIMENSIONS,
  KeHoachDimension,
} from './helpers';

const XEM = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'];
const SUA = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP'];

@Controller('ke-hoach')
@UseGuards(JwtGuard, RoleGuard)
export class KeHoachController {
  constructor(private readonly keHoachService: KeHoachService) {}

  @Get()
  @Roles(...XEM)
  async getEntries(@Query() query: KeHoachQueryDto) {
    return this.keHoachService.getEntries(query);
  }

  // Các route tĩnh phải đứng TRƯỚC @Get(':id') — nếu không ':id' nuốt hết.
  @Get('phien-ban')
  @Roles(...XEM)
  async getPhienBan(@Query('loaiKeHoach') loaiKeHoach?: string) {
    return this.keHoachService.getPhienBanOptions(loaiKeHoach);
  }

  @Get('series')
  @Roles(...XEM)
  async getSeries(@Query() query: SeriesQueryDto) {
    const year = parseInt(query.year ?? '', 10) || new Date().getFullYear();
    const month = query.month ? parseInt(query.month, 10) : undefined;
    return this.keHoachService.getSeries(
      year,
      month,
      query.loaiKeHoach || 'KE_HOACH',
      query.phienBan,
    );
  }

  @Get('so-sanh')
  @Roles(...XEM)
  async soSanh(@Query() query: SoSanhQueryDto) {
    const { type, chiTieu, ...filter } = query;
    return this.keHoachService.soSanh(
      this.chieu(type),
      this.chiTieu(chiTieu),
      filter,
    );
  }

  @Get('kqkd')
  @Roles(...XEM)
  async getKqkd(
    @Query() query: KqkdQueryDto,
    @Headers('authorization') authToken?: string,
  ) {
    return this.keHoachService.getKqkd(
      query.nam,
      query.loaiKeHoach || 'KE_HOACH',
      query.phienBan,
      authToken,
    );
  }

  @Get('summary/:type')
  @Roles(...XEM)
  async getSummary(@Param('type') type: string, @Query() query: KeHoachQueryDto) {
    return this.keHoachService.getSummary(this.chieu(type), query);
  }

  @Get(':id')
  @Roles(...XEM)
  async getById(@Param('id') id: string) {
    return this.keHoachService.findById(id);
  }

  @Post()
  @Roles(...SUA)
  async create(
    @Body() dto: CreateKeHoachDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.keHoachService.create(dto, user.id);
  }

  @Post('batch')
  @Roles(...SUA)
  async createBatch(
    @Body() items: CreateKeHoachDto[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.keHoachService.createBatch(items, user.id);
  }

  // Import Excel: cùng payload với batch, tách route để log/quyền sau này khác nhau được.
  @Post('import')
  @Roles(...SUA)
  async importEntries(
    @Body() items: CreateKeHoachDto[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.keHoachService.createBatch(items, user.id);
  }

  @Post('delete-batch')
  @Roles(...SUA)
  async deleteBatch(@Body() dto: DeleteBatchKeHoachDto) {
    return this.keHoachService.removeBatch(dto.ids);
  }

  @Patch('batch')
  @Roles(...SUA)
  async updateBatch(@Body() body: { items: BatchUpdateKeHoachItemDto[] }) {
    return this.keHoachService.updateBatch(body.items ?? []);
  }

  @Patch(':id')
  @Roles(...SUA)
  async update(@Param('id') id: string, @Body() dto: UpdateKeHoachDto) {
    return this.keHoachService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...SUA)
  async remove(@Param('id') id: string) {
    return this.keHoachService.remove(id);
  }

  private chieu(type?: string): KeHoachDimension {
    const chieu = (type || 'account') as KeHoachDimension;
    if (!KE_HOACH_DIMENSIONS.includes(chieu)) {
      throw new BadRequestException(
        `Chiều phân tích không hợp lệ. Hợp lệ: ${KE_HOACH_DIMENSIONS.join(', ')}`,
      );
    }
    return chieu;
  }

  private chiTieu(value?: string): ChiTieu {
    const ct = (value || 'tong') as ChiTieu;
    if (!CHI_TIEU_LIST.includes(ct)) {
      throw new BadRequestException(
        `Chỉ tiêu không hợp lệ. Hợp lệ: ${CHI_TIEU_LIST.join(', ')}`,
      );
    }
    return ct;
  }
}
