import { Controller, Get, Query, UseGuards, Headers, BadRequestException } from '@nestjs/common';
import { BaoCaoService } from './bao-cao.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('bao-cao')
@UseGuards(JwtGuard, RoleGuard)
export class BaoCaoController {
  constructor(private readonly baoCaoService: BaoCaoService) {}

  @Get('pnl')
  @Roles('ADMIN', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPnL(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken: string,
  ) {
    const data = await this.baoCaoService.getPnL(
      new Date(startDate),
      new Date(endDate),
      authToken,
    );
    return { success: true, data };
  }

  @Get('balance-sheet')
  @Roles('ADMIN', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getBalanceSheet(
    @Query('asOfDate') asOfDate: string,
    @Headers('authorization') authToken: string,
  ) {
    const data = await this.baoCaoService.getBalanceSheet(
      new Date(asOfDate),
      authToken,
    );
    return { success: true, data };
  }

  @Get('kqkd')
  @Roles('ADMIN', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getKqkd(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('periodType') periodType: string = 'thang',
    @Headers('authorization') authToken: string,
  ) {
    const validPeriodTypes = ['thang', 'quy', 'nam', 'tuyChon'];
    if (!validPeriodTypes.includes(periodType)) {
      throw new BadRequestException(
        `periodType phải là một trong: ${validPeriodTypes.join(', ')}`,
      );
    }

    const data = await this.baoCaoService.getKqkd(
      new Date(startDate),
      new Date(endDate),
      periodType,
      authToken,
    );
    return { success: true, data };
  }
}
