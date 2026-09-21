import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard, CurrentUser, type UserPayload } from '@app/auth';
import {
  CreateKhoaSoDto,
  KhoaSoCauHinhDto,
  KiemTraKhoaSoDto,
  KhoaSoQueryDto,
} from '@app/dto';
import { KhoaSoService } from './khoa-so.service';

@Controller('khoa-so')
@UseGuards(JwtGuard)
export class KhoaSoController {
  constructor(private readonly khoaSoService: KhoaSoService) {}

  @Get('cau-hinh')
  async getCauHinh() {
    const data = await this.khoaSoService.getCauHinh();
    return { success: true, data };
  }

  @Put('cau-hinh')
  async saveCauHinh(@Body() dto: KhoaSoCauHinhDto) {
    const data = await this.khoaSoService.saveCauHinh(dto);
    return { success: true, data };
  }

  @Get()
  async getList(@Query() query: KhoaSoQueryDto) {
    return this.khoaSoService.getList(query);
  }

  @Post()
  async create(
    @Body() dto: CreateKhoaSoDto,
    @CurrentUser() user: UserPayload,
  ) {
    const data = await this.khoaSoService.create(dto, user.id);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.khoaSoService.delete(id);
  }

  @Post('kiem-tra')
  async kiemTra(@Body() dto: KiemTraKhoaSoDto) {
    return this.khoaSoService.kiemTra(dto);
  }
}
