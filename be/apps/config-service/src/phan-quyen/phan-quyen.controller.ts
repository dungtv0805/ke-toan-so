import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PhanQuyen_Service } from './phan-quyen.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { UpsertPermissionsDto } from './upsert-permissions.dto';

@Controller('phan-quyen')
@UseGuards(JwtGuard, RoleGuard)
export class PhanQuyen_Controller {
  constructor(private readonly phanQuyen_Service: PhanQuyen_Service) {}

  @Get()
  @Roles('ADMIN')
  async findAll() {
    const data = await this.phanQuyen_Service.findAll();
    return { success: true, data };
  }

  @Get('vai-tro/:vaiTro/permissions')
  @Roles('ADMIN')
  async getPermissions(@Param('vaiTro') vaiTro: string) {
    const data = await this.phanQuyen_Service.getPermissionsByVaiTro(vaiTro);
    return { success: true, data };
  }

  @Get('vai-tro/:vaiTro')
  @Roles('ADMIN')
  async findByVaiTro(@Param('vaiTro') vaiTro: string) {
    const data = await this.phanQuyen_Service.findByVaiTro(vaiTro);
    return { success: true, data };
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    const data = await this.phanQuyen_Service.findOne(id);
    return { success: true, data };
  }

  @Put('vai-tro/:vaiTro/permissions')
  @Roles('ADMIN')
  async upsertPermissions(
    @Param('vaiTro') vaiTro: string,
    @Body() body: UpsertPermissionsDto,
  ) {
    const data = await this.phanQuyen_Service.upsertPermissions(
      vaiTro,
      body.permissions,
    );
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() createDto: any) {
    const data = await this.phanQuyen_Service.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    const data = await this.phanQuyen_Service.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.phanQuyen_Service.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
