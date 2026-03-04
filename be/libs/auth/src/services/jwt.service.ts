import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DecodedToken, UserPayload, TempTokenPayload, DecodedTempToken } from '../interfaces';

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly tempTokenExpiresIn: string;

  constructor() {
    this.secret =
      process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.tempTokenExpiresIn = process.env.JWT_TEMP_EXPIRES_IN || '5m';
  }

  /**
   * Verify and decode a JWT token
   * @param token - JWT token string
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  verify(token: string): DecodedToken {
    try {
      return jwt.verify(token, this.secret) as DecodedToken;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token đã hết hạn');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token không hợp lệ');
      }
      throw new Error(`Xác thực token thất bại: ${(error as Error).message}`);
    }
  }

  /**
   * Sign a payload and create a JWT token
   * @param payload - User payload to encode
   * @param expiresIn - Optional expiration time (default from env)
   * @returns JWT token string
   */
  sign(payload: UserPayload, expiresIn?: string): string {
    const tokenPayload = {
      sub: payload.id,
      email: payload.email,
      tenantId: payload.tenantId,
      vaiTro: payload.vaiTro,
      permissions: payload.permissions,
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: expiresIn || this.expiresIn,
    });
  }

  /**
   * Sign a temporary token for tenant selection (no tenantId)
   * @param payload - Temp token payload
   * @returns JWT temp token string
   */
  signTempToken(payload: TempTokenPayload): string {
    const tokenPayload = {
      sub: payload.id,
      email: payload.email,
      type: 'temp',
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.tempTokenExpiresIn,
    });
  }

  /**
   * Verify and decode a temporary token
   * @param token - JWT temp token string
   * @returns Decoded temp token payload
   * @throws Error if token is invalid, expired, or not a temp token
   */
  verifyTempToken(token: string): DecodedTempToken {
    try {
      const decoded = jwt.verify(token, this.secret) as DecodedTempToken;
      if (decoded.type !== 'temp') {
        throw new Error('Loại token không hợp lệ');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token tạm thời đã hết hạn');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token tạm thời không hợp lệ');
      }
      throw new Error(`Xác thực token tạm thời thất bại: ${(error as Error).message}`);
    }
  }

  /**
   * Decode a JWT token without verification
   * @param token - JWT token string
   * @returns Decoded token payload or null if invalid
   */
  decode(token: string): DecodedToken | null {
    try {
      return jwt.decode(token) as DecodedToken;
    } catch {
      return null;
    }
  }

  /**
   * Alias for verify() - used by guards
   * @param token - JWT token string
   * @returns Decoded token payload
   */
  verifyToken(token: string): DecodedToken {
    return this.verify(token);
  }

  /**
   * Check if decoded token is a temp token (no tenantId)
   * @param decoded - Decoded token
   * @returns true if temp token
   */
  isTempToken(decoded: DecodedToken | DecodedTempToken): boolean {
    return 'type' in decoded && decoded.type === 'temp';
  }
}
