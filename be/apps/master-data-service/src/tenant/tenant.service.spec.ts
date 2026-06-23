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

  describe('resetMemberPassword', () => {
    it('reset credential hiện có về mật khẩu mặc định 123456', async () => {
      userTenantRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, isActive: true });
      const credential = { userId: USER_ID, password: 'old-hash', isActive: true };
      credentialRepo.findOne.mockResolvedValue(credential);
      credentialRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.resetMemberPassword(TENANT_ID, USER_ID);

      expect(result).toEqual({ defaultPassword: '123456' });
      expect(credentialRepo.save).toHaveBeenCalledWith(credential);
      await expect(bcrypt.compare('123456', credential.password)).resolves.toBe(true);
    });

    it('tạo credential mới nếu user chưa có', async () => {
      userTenantRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, isActive: true });
      credentialRepo.findOne.mockResolvedValue(null);
      credentialRepo.create.mockImplementation((c: any) => c);
      credentialRepo.save.mockImplementation(async (c: any) => c);

      await service.resetMemberPassword(TENANT_ID, USER_ID);

      expect(credentialRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, isActive: true }),
      );
      expect(credentialRepo.save).toHaveBeenCalled();
    });

    it('ném NotFound khi không phải thành viên của tenant', async () => {
      userTenantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.resetMemberPassword(TENANT_ID, USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
