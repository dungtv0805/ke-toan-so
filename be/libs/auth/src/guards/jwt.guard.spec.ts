import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as fc from 'fast-check';
import { JwtGuard } from './jwt.guard';
import { JwtService } from '../services/jwt.service';

describe('JwtGuard', () => {
  let jwtGuard: JwtGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService();
    jwtGuard = new JwtGuard(jwtService);
  });

  const createMockExecutionContext = (
    authHeader?: string,
  ): ExecutionContext => {
    const request = {
      headers: {
        authorization: authHeader,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  /**
   * **Feature: backend-migration, Property 1: JWT Guard Token Verification**
   * **Validates: Requirements 2.2, 2.6**
   *
   * For any request with Authorization header containing a Bearer token,
   * the JwtGuard SHALL extract the token and verify it using JwtService.
   * If valid, the decoded payload SHALL be attached to request.user.
   * If invalid, 401 Unauthorized SHALL be returned.
   */
  describe('Property 1: JWT Guard Token Verification', () => {
    it('should attach decoded payload to request.user for valid tokens', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            tenantId: fc.uuid(),
            vaiTro: fc.constantFrom(
              'ADMIN',
              'KE_TOAN_QUY',
              'KE_TOAN_CONG_NO',
              'MANAGER',
            ),
            permissions: fc.array(
              fc.constantFrom(
                'view_phieu_thu',
                'create_phieu_thu',
                'update_phieu_thu',
                'delete_phieu_thu',
                'approve_phieu_thu',
              ),
              { minLength: 0, maxLength: 5 },
            ),
          }),
          (userPayload) => {
            // Generate a valid token
            const token = jwtService.sign(userPayload);
            const context = createMockExecutionContext(`Bearer ${token}`);

            // Execute guard
            const result = jwtGuard.canActivate(context);

            // Verify result
            expect(result).toBe(true);

            // Verify user is attached to request
            const request = context.switchToHttp().getRequest();
            expect(request.user).toBeDefined();
            expect(request.user.id).toBe(userPayload.id);
            expect(request.user.email).toBe(userPayload.email);
            expect(request.user.tenantId).toBe(userPayload.tenantId);
            expect(request.user.vaiTro).toBe(userPayload.vaiTro);
            expect(request.user.permissions).toEqual(userPayload.permissions);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should throw UnauthorizedException for invalid tokens', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 10, maxLength: 100 })
            .filter((s) => !s.includes('.')),
          (invalidToken) => {
            const context = createMockExecutionContext(
              `Bearer ${invalidToken}`,
            );

            expect(() => jwtGuard.canActivate(context)).toThrow(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should throw UnauthorizedException when no Authorization header', () => {
      const context = createMockExecutionContext(undefined);

      expect(() => jwtGuard.canActivate(context)).toThrow(
        UnauthorizedException,
      );
      expect(() => jwtGuard.canActivate(context)).toThrow(
        'Authorization token is required',
      );
    });

    it('should throw UnauthorizedException for malformed Authorization header', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('Basic token123'),
            fc.constant('token123'),
            fc.constant('Bearer'),
            fc.constant('Bearer token1 token2'),
          ),
          (malformedHeader) => {
            const context = createMockExecutionContext(malformedHeader);

            expect(() => jwtGuard.canActivate(context)).toThrow(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
