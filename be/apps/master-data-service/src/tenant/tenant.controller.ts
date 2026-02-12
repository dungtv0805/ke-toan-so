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
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto } from '@app/dto';
import { JwtGuard, SuperAdminGuard } from '@app/auth';

@Controller('tenants')
@UseGuards(JwtGuard, SuperAdminGuard) // Only Super Admin can manage tenants
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async findAll() {
    const data = await this.tenantService.findAll();
    return { success: true, data };
  }

  @Get('users')
  async getAllUsers() {
    const data = await this.tenantService.getAllUsers();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.tenantService.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() createDto: CreateTenantDto) {
    const data = await this.tenantService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateTenantDto) {
    const data = await this.tenantService.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.tenantService.delete(id);
    return { success: true, message: 'Tenant deleted successfully' };
  }
}
