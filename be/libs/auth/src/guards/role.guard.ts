import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SUPER_ADMIN_EMAIL } from '@app/entities';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    // Super admin (by email) has access to all resources
    if (user.email === SUPER_ADMIN_EMAIL) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.vaiTro);

    if (!hasRole) {
      throw new ForbiddenException(
        `Your role (${user.vaiTro}) does not have access to this resource. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
