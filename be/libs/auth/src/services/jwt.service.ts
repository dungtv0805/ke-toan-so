import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DecodedToken, UserPayload } from '../interfaces';

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    this.secret =
      process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
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
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error(`Token verification failed: ${(error as Error).message}`);
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
      vaiTro: payload.vaiTro,
      permissions: payload.permissions,
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: expiresIn || this.expiresIn,
    });
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
}
