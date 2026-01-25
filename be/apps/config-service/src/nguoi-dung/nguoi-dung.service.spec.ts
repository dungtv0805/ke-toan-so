import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fc from 'fast-check';
import { NguoiDung_Service, PaginatedResult } from './nguoi-dung.service';
import { User, UserRole, UserStatus } from '@app/entities';

/**
 * **Feature: phan-quyen-api-refactor, Property 2: Paginated Response Structure**
 * **Validates: Requirements 2.3, 7.1**
 */
describe('NguoiDung_Service - Property Tests', () => {
  let service: NguoiDung_Service;
  let mockRepo: any;

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    _id: { toString: () => 'mock-id' } as any,
    id: 'mock-id',
    email: 'test@example.com',
    hoTen: 'Test User',
    vaiTro: UserRole.AUDITOR,
    trangThai: UserStatus.HOAT_DONG,
    permissions: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NguoiDung_Service,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepo,
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
            const mockUsers = Object.values(UserRole).flatMap((role) =>
              Array.from({ length: 3 }, (_, i) =>
                createMockUser({
                  _id: { toString: () => `${role}-${i}` } as any,
                  email: `${role.toLowerCase()}${i}@example.com`,
                  vaiTro: role,
                }),
              ),
            );

            // Mock repo to return filtered results (simulating DB filter)
            mockRepo.find.mockImplementation(({ where }) => {
              if (where.vaiTro) {
                return Promise.resolve(
                  mockUsers.filter((u) => u.vaiTro === where.vaiTro),
                );
              }
              return Promise.resolve(mockUsers);
            });

            const result = await service.findAll({
              page: 1,
              limit: 100,
              vaiTro: filterVaiTro,
            });

            // All returned users should have the filtered vaiTro
            result.data.forEach((user) => {
              expect(user.vaiTro).toBe(filterVaiTro);
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
