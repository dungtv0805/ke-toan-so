import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Cho qua nếu user là admin tenant (`vaiTro === 'ADMIN'`) hoặc super admin
 * (`vaiTro === 'SUPER_ADMIN'`). Dùng cho các thao tác cấu hình hệ thống mà
 * chỉ quản trị được phép (vd: lưu/xoá mẫu in).
 *
 * Kiểm tra theo `vaiTro` (luôn có trong JWT) thay vì mảng `permissions` —
 * một số login path ký token với `permissions: []` nên mảng quyền không tin cậy.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private static readonly ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('Không tìm thấy thông tin người dùng');
    }

    if (!AdminGuard.ADMIN_ROLES.includes(user.vaiTro)) {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền thực hiện');
    }

    return true;
  }
}
