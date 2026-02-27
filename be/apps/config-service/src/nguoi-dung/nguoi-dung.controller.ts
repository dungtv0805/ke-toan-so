import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NguoiDung_Service } from './nguoi-dung.service';
import {
  CreateNguoiDungDto,
  UpdateNguoiDungDto,
  PaginationQueryDto,
  AddExistingUserDto,
} from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('nguoi-dung')
@UseGuards(JwtGuard, RoleGuard)
export class NguoiDung_Controller {
  constructor(private readonly nguoiDungService: NguoiDung_Service) {}

  @Get()
  @Roles('ADMIN')
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.nguoiDungService.findAll(query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('ADMIN')
  async getStats() {
    const data = await this.nguoiDungService.getStats();
    return { success: true, data };
  }

  @Get('available-users')
  @Roles('ADMIN')
  async getAvailableUsers(@Query('search') search?: string) {
    const data = await this.nguoiDungService.searchUsersNotInTenant(search);
    return { success: true, data };
  }

  @Post('add-existing')
  @Roles('ADMIN')
  async addExistingUser(@Body() dto: AddExistingUserDto) {
    const data = await this.nguoiDungService.addExistingUser(dto);
    return { success: true, data };
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    const data = await this.nguoiDungService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateNguoiDungDto) {
    const data = await this.nguoiDungService.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateNguoiDungDto) {
    const data = await this.nguoiDungService.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.nguoiDungService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Patch(':id/toggle-status')
  @Roles('ADMIN')
  async toggleStatus(@Param('id') id: string) {
    const data = await this.nguoiDungService.toggleStatus(id);
    return { success: true, data };
  }
}
