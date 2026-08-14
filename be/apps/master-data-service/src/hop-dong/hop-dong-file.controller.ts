import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtGuard } from '@app/auth';
import { HopDongFileService } from './hop-dong-file.service';

/**
 * File đính kèm của hợp đồng. Để riêng khỏi `HopDongController` cho khỏi đụng thứ tự
 * route với `/hop-dong/:id`.
 */
@Controller('hop-dong-file')
@UseGuards(JwtGuard)
export class HopDongFileController {
  constructor(private readonly service: HopDongFileService) {}

  @Get()
  async list(@Query('hopDongId') hopDongId: string) {
    if (!hopDongId) throw new BadRequestException('Thiếu hopDongId');
    return { success: true, data: await this.service.list(hopDongId) };
  }

  /** Đếm file theo nhiều hợp đồng — bảng danh mục cần badge số lượng. */
  @Get('dem')
  async dem(@Query('ids') ids?: string) {
    const list = (ids || '').split(',').filter(Boolean);
    return { success: true, data: await this.service.demTheoHopDong(list) };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('hopDongId') hopDongId: string,
  ) {
    if (!hopDongId) throw new BadRequestException('Thiếu hopDongId');
    return { success: true, data: await this.service.create(hopDongId, file) };
  }

  @Get(':id/tai-ve')
  async taiVe(@Param('id') id: string, @Res() res: Response) {
    const { f, stream } = await this.service.streamFile(id);
    const inline =
      f.mimeType === 'application/pdf' || f.mimeType?.startsWith('image/');
    res.setHeader('Content-Type', f.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(
        f.tenFile || 'file',
      )}"`,
    );
    (stream as any).pipe(res);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }
}
