import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fc from 'fast-check';
import { NguoiDung_Service, PaginatedResult } from './nguoi-dung.service';
import { User, UserCredential, UserTenant, AppUserRole, UserRole, UserStatus } from '@app/entities';
import { TenantContextService } from '@app/core';

/**
 * **Feature: phan-quyen-api-refactor, Property 2: Paginated Response Structure**
 * **Validates: Requirements 2.3, 7.1**
 */
describe('NguoiDung_Service - Property Tests', () => {
  let service: NguoiDung_Service;
  let mockRepo: any;
  let mockCredentialRepo: any;
  let mockUserTenantRepo: any;
  let mockAppUserRoleRepo: any;
  let mockTenantContext: any;

  // A single valid 24-char hex ObjectId to satisfy identity DB membership mock
  const DUMMY_MEMBERSHIP_USER_ID = '000000000000000000000001';

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    _id: { toString: () => 'mock-id' } as any,
    id: 'mock-id',
    email: 'test@example.com',
    hoTen: 'Test User',
    trangThai: UserStatus.HOAT_DONG,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User);

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockCredentialRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockUserTenantRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockAppUserRoleRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockTenantContext = {
      getCurrentTenantId: jest.fn().mockReturnValue('test-tenant'),
      isSuperAdmin: jest.fn().mockReturnValue(false),
    };

    // Default: identity DB has one membership so findAll doesn't early-return
    mockUserTenantRepo.find.mockResolvedValue([
      {
        userId: DUMMY_MEMBERSHIP_USER_ID,
        tenantId: 'test-tenant',
        role: 'member',
        isActive: true,
      },
    ]);

    // Default: no functional roles (users get 'KIEM_SOAT' fallback)
    mockAppUserRoleRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NguoiDung_Service,
        {
          provide: getRepositoryToken(User, 'identity'),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(UserCredential, 'identity'),
          useValue: mockCredentialRepo,
        },
        {
          provide: getRepositoryToken(UserTenant, 'identity'),
          useValue: mockUserTenantRepo,
        },
        {
          provide: getRepositoryToken(AppUserRole),
          useValue: mockAppUserRoleRepo,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
      ],
    }).compile();

    service = module.get<NguoiDung_Service>(NguoiDung_Service);
  });

  /**
   * **Feature: phan-quyen-api-refactor, Property 2: Paginated Response Structure**
   * *For any* API response from /nguoi-dung, the response SHALL contain data array,
   * total count, current page, limit, and totalPages that are mathematically consistent
   * (totalPages = ceil(total/limit)).
   * **Validates: Requirements 2.3, 7.1**
   */
  describe('Property 2: Paginated Response Structure', () => {
    it('should return mathematically consistent pagination metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // total items
          fc.integer({ min: 1, max: 10 }), // page
          fc.integer({ min: 1, max: 50 }), // limit
          async (totalItems, page, limit) => {
            // Generate mock users
            const mockUsers = Array.from({ length: totalItems }, (_, i) =>
              createMockUser({
                _id: { toString: () => `id-${i}` } as any,
                email: `user${i}@example.com`,
                hoTen: `User ${i}`,
              }),
            );

            // userTenantRepo returns one valid membership (default from beforeEach);
            // repo.find() returns all mockUsers (mock ignores $in filter)
            mockRepo.find.mockResolvedValue(mockUsers);

            const result = await service.findAll({ page, limit });

            // Verify structure
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('page');
            expect(result).toHaveProperty('limit');
            expect(result).toHaveProperty('totalPages');

            // Verify mathematical consistency
            expect(result.total).toBe(totalItems);
            expect(result.page).toBe(page);
            expect(result.limit).toBe(limit);
            expect(result.totalPages).toBe(Math.ceil(totalItems / limit));

            // Verify data array length
            const expectedDataLength = Math.min(
              limit,
              Math.max(0, totalItems - (page - 1) * limit),
            );
            expect(result.data.length).toBeLessThanOrEqual(limit);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return empty data for page beyond total pages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // total items
          fc.integer({ min: 5, max: 20 }), // limit
          async (totalItems, limit) => {
            const mockUsers = Array.from({ length: totalItems }, (_, i) =>
              createMockUser({ email: `user${i}@example.com` }),
            );

            mockRepo.find.mockResolvedValue(mockUsers);

            const totalPages = Math.ceil(totalItems / limit);
            const beyondPage = totalPages + 5;

            const result = await service.findAll({ page: beyondPage, limit });

            expect(result.data).toHaveLength(0);
            expect(result.total).toBe(totalItems);
            expect(result.totalPages).toBe(totalPages);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Feature: phan-quyen-api-refactor, Property 3: Filter Results Correctness**
   * *For any* filter combination (search, vaiTro, trangThai), all returned users
   * SHALL match the filter criteria.
   * **Validates: Requirements 7.2**
   */
  describe('Property 3: Filter Results Correctness', () => {
    it('should filter by vaiTro correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.values(UserRole)),
          async (filterVaiTro) => {
            // Build mock users with valid 24-char hex ObjectId strings
            // so new ObjectId(userId) succeeds when filtering via AppUserRole
            const roles = Object.values(UserRole);
            const mockUsersWithRoles: Array<{ user: User; role: string }> = [];
            roles.forEach((role, rIdx) => {
              for (let i = 0; i < 3; i++) {
                const userId = (rIdx * 3 + i + 1).toString(16).padStart(24, '0');
                mockUsersWithRoles.push({
                  user: createMockUser({
                    _id: { toString: () => userId } as any,
                    email: `user${rIdx * 3 + i}@example.com`,
                  }),
                  role,
                });
              }
            });

            const allMockUsers = mockUsersWithRoles.map(({ user }) => user);

            // Identity DB memberships for all users
            mockUserTenantRepo.find.mockResolvedValue(
              allMockUsers.map((u) => ({
                userId: u._id.toString(),
                tenantId: 'test-tenant',
                role: 'member',
                isActive: true,
              })),
            );

            // Functional roles in AppUserRole (digital_book)
            mockAppUserRoleRepo.find.mockResolvedValue(
              mockUsersWithRoles.map(({ user, role }) => ({
                userId: user._id.toString(),
                tenantId: 'test-tenant',
                role,
                isActive: true,
              })),
            );

            // repo.find() returns only users with the matching functional role
            // (service pre-filters userIds via AppUserRole before calling repo.find)
            const matchingUsers = mockUsersWithRoles
              .filter(({ role }) => role === filterVaiTro)
              .map(({ user }) => user);
            mockRepo.find.mockResolvedValue(matchingUsers);

            const result = await service.findAll({
              page: 1,
              limit: 100,
              vaiTro: filterVaiTro,
            });

            // All returned users should have the filtered vaiTro as their tenantRole
            result.data.forEach((user) => {
              expect(user.tenantRole).toBe(filterVaiTro);
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should filter by trangThai correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.values(UserStatus)),
          async (filterTrangThai) => {
            const mockUsers = Object.values(UserStatus).flatMap((status) =>
              Array.from({ length: 5 }, (_, i) =>
                createMockUser({
                  _id: { toString: () => `${status}-${i}` } as any,
                  email: `${status.toLowerCase()}${i}@example.com`,
                  trangThai: status,
                }),
              ),
            );

            // userTenantRepo default mock (one valid membership) lets service proceed past early-return;
            // repo.find() mock filters by trangThai (the service passes it in where clause)
            mockRepo.find.mockImplementation(({ where }) => {
              if (where.trangThai) {
                return Promise.resolve(
                  mockUsers.filter((u) => u.trangThai === where.trangThai),
                );
              }
              return Promise.resolve(mockUsers);
            });

            const result = await service.findAll({
              page: 1,
              limit: 100,
              trangThai: filterTrangThai,
            });

            result.data.forEach((user) => {
              expect(user.trangThai).toBe(filterTrangThai);
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should filter by search keyword correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 10 }),
          async (searchKeyword) => {
            const mockUsers = [
              createMockUser({
                _id: { toString: () => '1' } as any,
                hoTen: `${searchKeyword} User`,
                email: 'user1@example.com',
              }),
              createMockUser({
                _id: { toString: () => '2' } as any,
                hoTen: 'Other User',
                email: `${searchKeyword}@example.com`,
              }),
              createMockUser({
                _id: { toString: () => '3' } as any,
                hoTen: 'No Match',
                email: 'nomatch@example.com',
              }),
            ];

            // repo.find() returns all users; service filters by search keyword
            mockRepo.find.mockResolvedValue(mockUsers);

            const result = await service.findAll({
              page: 1,
              limit: 100,
              search: searchKeyword,
            });

            // All returned users should contain search keyword in hoTen or email
            result.data.forEach((user) => {
              const matchesHoTen = user.hoTen
                .toLowerCase()
                .includes(searchKeyword.toLowerCase());
              const matchesEmail = user.email
                .toLowerCase()
                .includes(searchKeyword.toLowerCase());
              expect(matchesHoTen || matchesEmail).toBe(true);
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
