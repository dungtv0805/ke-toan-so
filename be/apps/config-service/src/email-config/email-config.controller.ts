import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { EmailConfig_Service } from './email-config.service';
import { JwtGuard, SuperAdminGuard } from '@app/auth';
import { CreateEmailConfigDto, UpdateEmailConfigDto, TestEmailDto } from './dto';

@Controller('email-config')
@UseGuards(JwtGuard, SuperAdminGuard)
export class EmailConfig_Controller {
  constructor(private readonly emailConfigService: EmailConfig_Service) {}

  @Get()
  async getConfig() {
    const data = await this.emailConfigService.findActive();
    // Mask password in response
    if (data) {
      const { smtpPass, ...rest } = data as Record<string, unknown>;
      return {
        success: true,
        data: { ...rest, smtpPass: smtpPass ? '••••••••' : '' },
      };
    }
    return { success: true, data: null };
  }

  @Post()
  async createOrUpdate(@Body() dto: CreateEmailConfigDto) {
    const data = await this.emailConfigService.createOrUpdate(dto);
    return { success: true, data };
  }

  @Put()
  async update(@Body() dto: UpdateEmailConfigDto) {
    const data = await this.emailConfigService.update(dto);
    return { success: true, data };
  }

  @Post('test')
  async testConnection(@Body() dto: TestEmailDto) {
    const result = await this.emailConfigService.testConnection(dto.to);
    return { success: true, data: result };
  }
}
