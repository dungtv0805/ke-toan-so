import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { TenantService } from './tenant.service';

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439099';
const TENANT_ID = 'tenant-1';

function makeUser(overrides: any = {}) {
  return {
    _id: { toString: () => USER_ID },
    email: 'old@example.com',
    hoTen: 'Old Name',
    isActive: true,
    ...overrides,
  };
}

describe('TenantService - member profile & password', () => {
  let service: TenantService;
  let userRepo: any;
  let credentialRepo: any;
  let userTenantRepo: any;

  beforeEach(async () => {
    userRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    credentialRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    userTenantRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    const stub = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`, useValue: stub },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}User`, useValue: userRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}UserCredential`, useValue: credentialRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}UserTenant`, useValue: userTenantRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`, useValue: stub },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`, useValue: stub },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  describe('updateMemberProfile', () => {
    it('cập nhật hoTen và email (lowercase)', async () => {
      userTenantRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, isActive: true });
      const user = makeUser();
      userRepo.findOne
        .mockResolvedValueOnce(user)        // load user by _id
        .mockResolvedValueOnce(null);       // email dup check -> none
      userRepo.save.mockImplementation(async (u: any) => u);

      const result = await service.updateMemberProfile(TENANT_ID, USER_ID, {
        hoTen: 'New Name',
        email: 'NEW@Example.com',
      });

      expect(user.hoTen).toBe('New Name');
      expect(user.email).toBe('new@example.com');
      expect(result).toEqual({ id: USER_ID, email: 'new@example.com', hoTen: 'New Name' });
    });

    it('ném NotFound khi không phải thành viên của tenant', async () => {
      userTenantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateMemberProfile(TENANT_ID, USER_ID, { hoTen: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ném Conflict khi email đã thuộc user khác', async () => {
      userTenantRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, isActive: true });
      userRepo.findOne
        .mockResolvedValueOnce(makeUser())  // load user
        .mockResolvedValueOnce({ _id: { toString: () => OTHER_USER_ID }, email: 'taken@example.com' });
      await expect(
        service.updateMemberProfile(TENANT_ID, USER_ID, { email: 'taken@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
