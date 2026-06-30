/**
 * Unit tests for AuthServiceService.ensureKeToanProvisioned
 *
 * Tests:
 *  (a) missing TenantAppConfig → creates it
 *  (b) existing TenantAppConfig → no create call
 *  (c) company-admin missing PhanQuyen/VaiTro/AppUserRole → creates all three
 *  (d) member (not admin) → only config, no Admin role
 *  (e) idempotent: second call when all data exists → no creates
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import {
  User,
  UserCredential,
  Tenant,
  UserTenant,
  PhanQuyen,
  VaiTro,
  AppUserRole,
  TenantAppConfig,
  TenantApp,
} from '@app/entities';
import { AuthServiceService } from './auth-service.service';
import { JwtService } from '@app/auth';
import { generateAllPermissions } from '@app/core';
import { ProvisioningService } from './provisioning/provisioning.service';

const TENANT_ID = 'tenant-abc';
const USER_ID = 'user-xyz';

function stubRepo() {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => x),
    remove: jest.fn(async () => undefined),
  };
}

async function buildService(overrides: Record<string, any> = {}) {
  const jwtStub = { sign: jest.fn(), verify: jest.fn(), signTempToken: jest.fn(), verifyTempToken: jest.fn() };

  const stringKeyDefaults: Record<string, any> = {
    [getRepositoryToken(User, 'identity') as string]: stubRepo(),
    [getRepositoryToken(UserCredential, 'identity') as string]: stubRepo(),
    [getRepositoryToken(Tenant, 'identity') as string]: stubRepo(),
    [getRepositoryToken(UserTenant, 'identity') as string]: stubRepo(),
    [getRepositoryToken(TenantApp, 'identity') as string]: stubRepo(),
    [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: stubRepo(),
    [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: stubRepo(),
    [getRepositoryToken(AppUserRole) as string]: stubRepo(),
    [getRepositoryToken(TenantAppConfig) as string]: stubRepo(),
  };

  // Apply string-key overrides
  const stringProviders = Object.entries({ ...stringKeyDefaults, ...overrides }).map(
    ([token, value]) => ({ provide: token, useValue: value }),
  );

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthServiceService,
      ProvisioningService,
      ...stringProviders,
      { provide: JwtService, useValue: jwtStub },
    ],
  }).compile();

  const service = module.get<AuthServiceService>(AuthServiceService);
  return { service, repos: { ...stringKeyDefaults, ...overrides } };
}

describe('AuthServiceService.ensureKeToanProvisioned', () => {
  describe('(a) missing TenantAppConfig → creates it', () => {
    it('creates TenantAppConfig with correct shape', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue(null); // config missing

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
      });

      await service.ensureKeToanProvisioned(TENANT_ID, USER_ID, false);

      expect(appConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          modules: ['KE_TOAN'],
          glossary: {},
          nganh: null,
          dashboardBlocks: null,
        }),
      );
      expect(appConfigRepo.save).toHaveBeenCalled();
    });
  });

  describe('(b) existing TenantAppConfig → no create', () => {
    it('skips creating config when it already exists', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue({ tenantId: TENANT_ID, modules: ['KE_TOAN'] });

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
      });

      await service.ensureKeToanProvisioned(TENANT_ID, USER_ID, false);

      expect(appConfigRepo.create).not.toHaveBeenCalled();
      expect(appConfigRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('(c) company-admin missing role → creates VaiTro + PhanQuyen + AppUserRole', () => {
    it('creates all Admin data when missing', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue({ tenantId: TENANT_ID, modules: ['KE_TOAN'] }); // config exists

      const vaiTroRepo = stubRepo();
      vaiTroRepo.findOne.mockResolvedValue(null); // VaiTro missing

      const phanQuyenRepo = stubRepo();
      phanQuyenRepo.findOne.mockResolvedValue(null); // PhanQuyen missing

      const appUserRoleRepo = stubRepo();
      appUserRoleRepo.findOne.mockResolvedValue(null); // AppUserRole missing

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: vaiTroRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: phanQuyenRepo,
        [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
      });

      await service.ensureKeToanProvisioned(TENANT_ID, USER_ID, true);

      // VaiTro should be created
      expect(vaiTroRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ten: 'Admin', isActive: true }),
      );
      expect(vaiTroRepo.save).toHaveBeenCalled();

      // PhanQuyen should be created with full permissions
      const allPerms = generateAllPermissions();
      expect(phanQuyenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vaiTro: 'Admin',
          tenantId: TENANT_ID,
          isActive: true,
          permissions: allPerms,
        }),
      );
      expect(phanQuyenRepo.save).toHaveBeenCalled();

      // AppUserRole should be created
      expect(appUserRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          tenantId: TENANT_ID,
          role: 'Admin',
          isActive: true,
        }),
      );
      expect(appUserRoleRepo.save).toHaveBeenCalled();
    });
  });

  describe('(d) member (not admin) → only config, no Admin role', () => {
    it('only provisions config for non-admin members', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue(null); // config missing

      const vaiTroRepo = stubRepo();
      const phanQuyenRepo = stubRepo();
      const appUserRoleRepo = stubRepo();

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: vaiTroRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: phanQuyenRepo,
        [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
      });

      await service.ensureKeToanProvisioned(TENANT_ID, USER_ID, false);

      // Config should be created
      expect(appConfigRepo.create).toHaveBeenCalled();
      expect(appConfigRepo.save).toHaveBeenCalled();

      // Admin role data should NOT be touched
      expect(vaiTroRepo.create).not.toHaveBeenCalled();
      expect(phanQuyenRepo.create).not.toHaveBeenCalled();
      expect(appUserRoleRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('(e) idempotent: second call when all data exists → no creates', () => {
    it('no creates when everything is already provisioned', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue({ tenantId: TENANT_ID, modules: ['KE_TOAN'] });

      const vaiTroRepo = stubRepo();
      vaiTroRepo.findOne.mockResolvedValue({ ten: 'Admin', isActive: true });

      const phanQuyenRepo = stubRepo();
      phanQuyenRepo.findOne.mockResolvedValue({
        vaiTro: 'Admin',
        tenantId: TENANT_ID,
        permissions: generateAllPermissions(),
        isActive: true,
      });

      const appUserRoleRepo = stubRepo();
      appUserRoleRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, role: 'Admin', isActive: true });

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: vaiTroRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: phanQuyenRepo,
        [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
      });

      // Call twice
      await service.ensureKeToanProvisioned(TENANT_ID, USER_ID, true);
      await service.ensureKeToanProvisioned(TENANT_ID, USER_ID, true);

      // No creates should have happened
      expect(appConfigRepo.create).not.toHaveBeenCalled();
      expect(vaiTroRepo.create).not.toHaveBeenCalled();
      expect(phanQuyenRepo.create).not.toHaveBeenCalled();
      expect(appUserRoleRepo.create).not.toHaveBeenCalled();
      // No saves either
      expect(appConfigRepo.save).not.toHaveBeenCalled();
      expect(vaiTroRepo.save).not.toHaveBeenCalled();
      expect(phanQuyenRepo.save).not.toHaveBeenCalled();
      expect(appUserRoleRepo.save).not.toHaveBeenCalled();
    });
  });
});
