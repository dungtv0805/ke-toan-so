import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService, TenantContext } from './tenant-context.service';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  tenantId?: string;
  sub?: string;
  userId?: string;
  email?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantContextService: TenantContextService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const context = this.extractTenantContext(req);

    if (context) {
      this.tenantContextService.run(context, () => next());
    } else {
      next();
    }
  }

  private extractTenantContext(req: Request): TenantContext | null {
    // Only extract from JWT token - never trust headers for security-sensitive data
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.decode(token) as JwtPayload | null;
      if (decoded) {
        return {
          tenantId: decoded.tenantId || '',
          userId: decoded.sub ?? decoded.userId ?? '',
          email: decoded.email,
        };
      }
    } catch {
      // Token decode failed
    }

    return null;
  }
}
