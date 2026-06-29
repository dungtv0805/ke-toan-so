import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { Tenant, User, UserCredential, UserTenant, AppUserRole, TenantAppConfig, Nganh } from '@app/entities';
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

/** Minimal stub repo used for dependencies we don't care about in a given test. */
function stubRepo() {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => x),
    remove: jest.fn(async () => undefined),
    count: jest.fn(async () => 0),
  };
}

/** Build a test module with the new 7a injection tokens. */
async function buildModule(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    [getRepositoryToken(Tenant, 'identity') as string]: stubRepo(),
    [getRepositoryToken(User, 'identity') as string]: stubRepo(),
    [getRepositoryToken(UserCredential, 'identity') as string]: stubRepo(),
    [getRepositoryToken(UserTenant, 'identity') as string]: stubRepo(),
    [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: stubRepo(),
    [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: stubRepo(),
    [`${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`]: stubRepo(),
    [getRepositoryToken(AppUserRole) as string]: stubRepo(),
    [getRepositoryToken(TenantAppConfig) as string]: stubRepo(),
  };
  const repos = { ...defaults, ...overrides };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      TenantService,
      ...Object.entries(repos).map(([token, value]) => ({ provide: token, useValue: value })),
    ],
  }).compile();

  return { module, service: module.get<TenantService>(TenantService), repos };
}

// ─── 7b: Member profile & password (DI tokens updated; methods unchanged) ──────

describe('TenantService - member profile & password', () => {
  let service: TenantService;
  let userRepo: any;
  let credentialRepo: any;
  let userTenantRepo: any;

  beforeEach(async () => {
    userRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    credentialRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    userTenantRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

    const built = await buildModule({
      [getRepositoryToken(User, 'identity') as string]: userRepo,
      [getRepositoryToken(UserCredential, 'identity') as string]: credentialRepo,
      [getRepositoryToken(UserTenant, 'identity') as string]: userTenantRepo,
    });
    service = built.service;
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

// ─── Task 5: cloneGlossaryFromNganh ───────────────────────────────────────────

function repoWith(items: any[] = []) {
  const store = [...items];
  return {
    store,
    find: jest.fn(async () => store),
    findOne: jest.fn(async ({ where }: any) =>
      store.find((x) =>
        (where.code && x.code === where.code) ||
        (where._id && String(x._id) === String(where._id)) ||
        (where.tenantId && x.tenantId === where.tenantId),
      ) ?? null,
    ),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => x),
    remove: jest.fn(async () => undefined),
    count: jest.fn(async () => store.length),
  } as any;
}

describe('TenantService.cloneGlossaryFromNganh', () => {
  const XD = { code: 'XAY_DUNG', glossary: { chuDauTu: { label: 'Chủ đầu tư' } } };

  async function build(nganhItems: any[]) {
    const nganhRepo = repoWith(nganhItems);
    const built = await buildModule({
      [`${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`]: nganhRepo,
    });
    return { service: built.service, nganhRepo };
  }

  it('trả deep-copy glossary của ngành theo code', async () => {
    const built = await build([XD]);
    const g = await built.service.cloneGlossaryFromNganh('XAY_DUNG');
    expect(g).toEqual({ chuDauTu: { label: 'Chủ đầu tư' } });
    // deep copy: sửa kết quả không ảnh hưởng nguồn
    g.chuDauTu.label = 'X';
    expect(XD.glossary.chuDauTu.label).toBe('Chủ đầu tư');
  });

  it('không có code → {}', async () => {
    const built = await build([XD]);
    expect(await built.service.cloneGlossaryFromNganh(undefined)).toEqual({});
    expect(await built.service.cloneGlossaryFromNganh(null)).toEqual({});
  });

  it('code không tồn tại → {}', async () => {
    const built = await build([XD]);
    expect(await built.service.cloneGlossaryFromNganh('KHONG_CO')).toEqual({});
  });
});

// ─── Task 7a: create → TenantAppConfig nhận glossary clone từ Nganh ─────────

describe('TenantService.create — TenantAppConfig được tạo với config đúng', () => {
  const XD = { code: 'XAY_DUNG', _id: 'nganh-1', glossary: { chuDauTu: { label: 'Chủ đầu tư' } } };

  it('tạo TenantAppConfig với glossary clone từ Nganh và modules mặc định', async () => {
    const FAKE_OBJ_ID = { toString: () => '507f1f77bcf86cd799439011' };
    const tenantRepo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),   // findBySlug → null (no duplicate)
      create: jest.fn((x: any) => ({ ...x, _id: FAKE_OBJ_ID })),
      save: jest.fn(async (x: any) => ({ ...x, _id: FAKE_OBJ_ID })),
    };
    const appConfigRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((x: any) => ({ ...x })),
      save: jest.fn(async (x: any) => x),
    };

    const built = await buildModule({
      [getRepositoryToken(Tenant, 'identity') as string]: tenantRepo,
      [`${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`]: repoWith([XD]),
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });

    await built.service.create({ name: 'Công ty XD', slug: 'cong-ty-xd', nganh: 'XAY_DUNG' } as any);

    // Tenant (identity) should NOT have glossary/nganh/modules
    expect(tenantRepo.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ glossary: expect.anything() }),
    );

    // TenantAppConfig should be created with cloned glossary and correct fields
    expect(appConfigRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: '507f1f77bcf86cd799439011',
        nganh: 'XAY_DUNG',
        modules: ['KE_TOAN'],
        glossary: { chuDauTu: { label: 'Chủ đầu tư' } },
      }),
    );
  });
});

// ─── Task 7a: update → nganh đổi không clone glossary (chỉ cập nhật TenantAppConfig.nganh) ─

describe('TenantService.update — đổi nganh chỉ cập nhật TenantAppConfig, không clone glossary', () => {
  it('đổi nganh → TenantAppConfig.nganh được cập nhật, glossary giữ nguyên', async () => {
    const TID = '507f1f77bcf86cd799439011';
    const tenant: any = {
      _id: { toString: () => TID },
      slug: 'old-slug',
      nganh: 'OLD',
      glossary: {},
    };
    const tenantRepo = {
      findOne: jest.fn(async () => tenant),
      save: jest.fn(async (x: any) => x),
    };
    const existingConfig: any = { tenantId: TID, nganh: 'OLD', modules: ['KE_TOAN'], glossary: {}, dashboardBlocks: null };
    const appConfigRepo = {
      findOne: jest.fn(async () => existingConfig),
      create: jest.fn((x: any) => ({ ...x })),
      save: jest.fn(async (x: any) => x),
    };
    const XD = { code: 'XAY_DUNG', _id: 'nganh-1', glossary: { chuDauTu: { label: 'Chủ đầu tư' } } };

    const built = await buildModule({
      [getRepositoryToken(Tenant, 'identity') as string]: tenantRepo,
      [`${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`]: repoWith([XD]),
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });
    const service = built.service;

    const result = await service.update(TID, { nganh: 'XAY_DUNG' } as any);

    // Only nganh in config should be updated, glossary should remain {}
    expect(existingConfig.nganh).toBe('XAY_DUNG');
    expect(result.glossary).toEqual({});
    // Tenant identity save was called
    expect(tenantRepo.save).toHaveBeenCalled();
    // TenantAppConfig save was called
    expect(appConfigRepo.save).toHaveBeenCalled();
  });
});

// ─── Task 7a: updateGlossary → ghi vào TenantAppConfig, không ghi vào Tenant ──

describe('TenantService.updateGlossary', () => {
  it('ghi glossary mới vào TenantAppConfig, trả tenant với glossary mới', async () => {
    const TID = '507f1f77bcf86cd799439011';
    const tenant: any = { _id: { toString: () => TID }, glossary: {} };
    const tenantRepo: any = {
      findOne: jest.fn(async () => tenant),
      save: jest.fn(async (x: any) => x),
    };
    const appConfigRepo: any = {
      findOne: jest.fn(async () => null),  // no existing config → will create
      create: jest.fn((x: any) => ({ ...x })),
      save: jest.fn(async (x: any) => x),
    };

    const built = await buildModule({
      [getRepositoryToken(Tenant, 'identity') as string]: tenantRepo,
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });
    const service = built.service;

    const g = { chuDauTu: { label: 'Nhà tài trợ' } };
    const res = await service.updateGlossary(TID, g as any);

    // TenantAppConfig should be saved (not tenantRepo)
    expect(appConfigRepo.save).toHaveBeenCalled();
    expect(tenantRepo.save).not.toHaveBeenCalled();

    // Returned tenant should have the new glossary
    expect(res.glossary).toEqual(g);
  });
});
