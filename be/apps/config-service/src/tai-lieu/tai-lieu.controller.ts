import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtGuard } from '@app/auth';
import { TaiLieu_Service } from './tai-lieu.service';
import { CreateFileDto, CreateYoutubeDto } from './dto';

/**
 * Quyền phụ thuộc `category` runtime nên không thể dùng @Permissions tĩnh.
 * Chỉ dùng JwtGuard (gắn req.user.permissions) + kiểm thủ công qua requirePerm().
 */
@Controller('tai-lieu')
@UseGuards(JwtGuard)
export class TaiLieu_Controller {
  constructor(private readonly service: TaiLieu_Service) {}

  @Get()
  async list(@Query('category') category: string, @Req() req: any) {
    requirePerm(req, category, 'xem');
    return { success: true, data: await this.service.list(category) };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFileDto,
    @Req() req: any,
  ) {
    requirePerm(req, dto.category, 'them');
    const data = await this.service.createFile(file, dto, {
      tenantId: req.user.tenantId,
      userId: req.user.id,
    });
    return { success: true, data };
  }

  @Post('youtube')
  async youtube(@Body() dto: CreateYoutubeDto, @Req() req: any) {
    requirePerm(req, dto.category, 'them');
    const data = await this.service.createYoutube(dto, { userId: req.user.id });
    return { success: true, data };
  }

  @Get(':id/file')
  async file(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { tl, stream } = await this.service.streamFile(
      id,
      req.user.tenantId,
    );
    requirePerm(req, tl.category, 'xem');
    const inline =
      tl.mimeType === 'application/pdf' || tl.mimeType?.startsWith('image/');
    res.setHeader('Content-Type', tl.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(
        tl.tenFile || 'file',
      )}"`,
    );
    (stream as any).pipe(res);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const tl = await this.service.findOne(id);
    requirePerm(req, tl.category, 'xoa');
    await this.service.remove(id);
    return { success: true };
  }
}

function requirePerm(req: any, category: string, action: string) {
  const perm = `/${category}:${action}`;
  const perms: string[] = req.user?.permissions || [];
  const isSuper = req.user?.isSuperAdmin;
  if (!isSuper && !perms.includes('*') && !perms.includes(perm)) {
    throw new ForbiddenException(`Bạn không có quyền: ${perm}`);
  }
}
