import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { SUPER_ADMIN_EMAIL, UserTenant, UserRole } from '@app/entities';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';

/**
 * Guard cho phép Super Admin hoặc user có role ADMIN trong tenant đó.
 * Yêu cầu route có param :id (tenantId).
 * Phải đặt sau JwtGuard.
 */
@Injectable()
export class TenantAdminGuard implements CanActivate {
  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}UserTenant`)
    private readonly userTenantRepository: Repository<UserTenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    // Super Admin bypass
    if (user.email === SUPER_ADMIN_EMAIL) {
      return true;
    }

    const tenantId = request.params.id;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID not found in request');
    }

    // Check if user is ADMIN in this tenant
    const membership = await this.userTenantRepository.findOne({
      where: {
        userId: user.id,
        tenantId,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý thành viên của công ty này. Yêu cầu quyền Admin.',
      );
    }

    return true;
  }
}
