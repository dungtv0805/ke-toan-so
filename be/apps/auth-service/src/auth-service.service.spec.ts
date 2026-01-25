import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';
import { AuthServiceService } from './auth-service.service';

describe('AuthServiceService', () => {
  /**
   * **Feature: backend-migration, Property 8: Password Hashing**
   * **Validates: Requirements 4.6**
   *
   * For any user password stored in the database, it SHALL be hashed using bcrypt,
   * and bcrypt.compare(plainPassword, hashedPassword) SHALL return true for the original password.
   */
  describe('Property 8: Password Hashing', () => {
    it('should hash passwords and verify correctly with bcrypt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 6, maxLength: 50 })
            .filter((s) => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s) && s.length >= 6),
          async (password) => {
            // Hash the password
            const hashedPassword =
              await AuthServiceService.hashPassword(password);

            // Verify it's a bcrypt hash (starts with $2b$ or $2a$)
            expect(hashedPassword).toMatch(/^\$2[ab]\$/);

            // Verify the original password matches
            const isMatch = await AuthServiceService.comparePassword(
              password,
              hashedPassword,
            );
            expect(isMatch).toBe(true);

            // Verify wrong password doesn't match
            const wrongPassword = password + 'wrong';
            const isWrongMatch = await AuthServiceService.comparePassword(
              wrongPassword,
              hashedPassword,
            );
            expect(isWrongMatch).toBe(false);

            return true;
          },
        ),
        { numRuns: 20 }, // Reduced runs due to bcrypt being slow
      );
    });

    it('should produce different hashes for same password (due to salt)', async () => {
      const password = 'testPassword123';

      const hash1 = await AuthServiceService.hashPassword(password);
      const hash2 = await AuthServiceService.hashPassword(password);

      // Hashes should be different due to random salt
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it('should use salt rounds of 10', async () => {
      const password = 'testPassword123';
      const hash = await AuthServiceService.hashPassword(password);

      // bcrypt hash format: $2b$10$... where 10 is the cost factor
      expect(hash).toMatch(/^\$2[ab]\$10\$/);
    });
  });
});
