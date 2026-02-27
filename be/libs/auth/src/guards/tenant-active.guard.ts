import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { SUPER_ADMIN_EMAIL, Tenant } from '@app/entities';
import { DataSource } from 'typeorm';

/**
 * Guard kiểm tra tenant hiện tại còn active hay không.
 * Đặt sau JwtGuard để đảm bảo đã có user context.
 * Nếu chưa authenticate (không có user) → skip, để JwtGuard xử lý.
 * Super admin không có tenantId sẽ được bypass.
 */
@Injectable()
export class TenantActiveGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Chưa authenticate → skip, để JwtGuard xử lý
    if (!user || !user.tenantId) {
      return true;
    }

    // Super admin không có tenantId → bypass
    if (user.email === SUPER_ADMIN_EMAIL && !user.tenantId) {
      return true;
    }

    const { ObjectId } = await import('mongodb');
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { _id: new ObjectId(user.tenantId) as any },
    });

    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException(
        'Công ty đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên.',
      );
    }

    return true;
  }
}
