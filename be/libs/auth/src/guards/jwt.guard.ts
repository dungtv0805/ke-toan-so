import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      const decoded = this.jwtService.verifyToken(token);

      // Reject temp tokens - they don't have tenantId
      if (this.jwtService.isTempToken(decoded)) {
        throw new UnauthorizedException(
          'Access token required. Temp token is not allowed for this endpoint.',
        );
      }

      // Attach decoded user to request
      (request as Request & { user: unknown }).user = {
        id: decoded.sub,
        email: decoded.email,
        tenantId: decoded.tenantId,
        vaiTro: decoded.vaiTro,
        permissions: decoded.permissions,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException((error as Error).message);
    }
  }

  /**
   * Extract Bearer token from Authorization header
   * @param request - Express request object
   * @returns Token string or null
   */
  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}
