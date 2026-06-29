import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserCredential, Tenant, UserStatus, UserTenant, PhanQuyen, VaiTro, SUPER_ADMIN_EMAIL, AppUserRole, TenantAppConfig, TenantApp } from '@app/entities';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { generateAllPermissions } from '@app/core';
import {
  LoginDto,
  RegisterDto,
  VerifyTokenDto,
  UpdateProfileDto,
  ChangePasswordDto,
  SelectTenantDto,
} from './dto';
import { JwtService, UserPayload } from '@app/auth';
import {
  TenantInfo,
  LoginResponse,
  SelectTenantResponse,
  AuthUserResponse,
} from '@app/dto';

const SALT_ROUNDS = 10;
const ADMIN_ROLE_NAME = 'Admin';
const KE_TOAN_APP_ID = 'ke-toan';

@Injectable()
export class AuthServiceService {
  private readonly logger = new Logger(AuthServiceService.name);

  constructor(
    @InjectRepository(User, 'identity')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCredential, 'identity')
    private readonly userCredentialRepository: Repository<UserCredential>,
    @InjectRepository(Tenant, 'identity')
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserTenant, 'identity')
    private readonly userTenantRepository: Repository<UserTenant>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`)
    private readonly phanQuyenRepo: Repository<PhanQuyen>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`)
    private readonly vaiTroRepo: Repository<VaiTro>,
    @InjectRepository(AppUserRole)
    private readonly appUserRoleRepo: Repository<AppUserRole>,
    @InjectRepository(TenantAppConfig)
    private readonly tenantAppConfigRepo: Repository<TenantAppConfig>,
    @InjectRepository(TenantApp, 'identity')
    private readonly tenantAppRepo: Repository<TenantApp>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Check if tenant has ke-toan app enabled in identity tenant_apps collection.
   */
  private async isKeToanEnabled(tenantId: string): Promise<boolean> {
    return !!(await this.tenantAppRepo.findOne({
      where: { tenantId, appId: KE_TOAN_APP_ID, isActive: true } as any,
    }));
  }

  /**
   * Filter a list of tenants to those entitled for ke-toan (batch check).
   */
  private async filterEntitledTenants(tenants: Tenant[]): Promise<Tenant[]> {
    const results = await Promise.all(
      tenants.map(async (t) => ({
        tenant: t,
        enabled: await this.isKeToanEnabled(t._id.toString()),
      })),
    );
    return results.filter((r) => r.enabled).map((r) => r.tenant);
  }

  /**
   * Load permissions from PhanQuyen entity by role name and tenant
   */
  private async loadPermissions(vaiTro: string, tenantId: string): Promise<string[]> {
    const phanQuyen = await this.phanQuyenRepo.findOne({ where: { vaiTro, tenantId, isActive: true } });
    return phanQuyen?.permissions || [];
  }

  /**
   * Check if user is super admin by email
   */
  private isSuperAdmin(user: User): boolean {
    return user.email === SUPER_ADMIN_EMAIL;
  }

  /**
   * Lazy-provision Kế toán-side config for a tenant that was created by the Portal
   * (Portal only writes identity data; it does NOT create TenantAppConfig, VaiTro,
   * PhanQuyen, or AppUserRole).
   *
   * Idempotent: each step is guarded by a findOne — subsequent calls are cheap.
   * Called inside selectTenant / switchTenant, wrapped in try/catch so provisioning
   * failure never blocks login.
   */
  async ensureKeToanProvisioned(
    tenantId: string,
    userId: string,
    isCompanyAdmin: boolean,
  ): Promise<void> {
    // Step 1: Ensure TenantAppConfig exists
    const existingConfig = await this.tenantAppConfigRepo.findOne({ where: { tenantId } as any });
    if (!existingConfig) {
      const newConfig = this.tenantAppConfigRepo.create({
        tenantId,
        modules: ['KE_TOAN'],
        glossary: {},
        nganh: null,
        dashboardBlocks: null,
      });
      await this.tenantAppConfigRepo.save(newConfig);
    }

    // Steps 2-3 only for company admins (identity membership.role === 'admin')
    if (!isCompanyAdmin) return;

    // Step 2: Ensure VaiTro 'Admin' exists + PhanQuyen for this tenant
    const existingVaiTro = await this.vaiTroRepo.findOne({ where: { ten: ADMIN_ROLE_NAME } } as any);
    if (!existingVaiTro) {
      const adminVaiTro = this.vaiTroRepo.create({
        ten: ADMIN_ROLE_NAME,
        moTa: 'Quản trị viên - toàn quyền',
        isActive: true,
      });
      await this.vaiTroRepo.save(adminVaiTro);
    }

    const existingPhanQuyen = await this.phanQuyenRepo.findOne({
      where: { vaiTro: ADMIN_ROLE_NAME, tenantId },
    } as any);
    if (!existingPhanQuyen) {
      const phanQuyen = this.phanQuyenRepo.create({
        vaiTro: ADMIN_ROLE_NAME,
        ten: ADMIN_ROLE_NAME,
        moTa: 'Toàn quyền hệ thống',
        tenantId,
        permissions: generateAllPermissions(),
        isActive: true,
      });
      await this.phanQuyenRepo.save(phanQuyen);
    } else if (!existingPhanQuyen.permissions || existingPhanQuyen.permissions.length === 0) {
      existingPhanQuyen.permissions = generateAllPermissions();
      await this.phanQuyenRepo.save(existingPhanQuyen);
    }

    // Step 3: Ensure AppUserRole 'Admin' exists for this user
    const existingAppRole = await this.appUserRoleRepo.findOne({
      where: { userId, tenantId, isActive: true },
    } as any);
    if (!existingAppRole) {
      const appRole = this.appUserRoleRepo.create({
        userId,
        tenantId,
        role: ADMIN_ROLE_NAME,
        isActive: true,
      });
      await this.appUserRoleRepo.save(appRole);
    }
  }

  /**
   * Build TenantInfo from role, Tenant entity, and TenantAppConfig
   */
  private buildTenantInfo(
    role: string,
    tenant: Tenant,
    cfg: TenantAppConfig | null,
  ): TenantInfo {
    return {
      tenantId: tenant._id.toString(),
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      role,
      modules: cfg?.modules?.length ? cfg.modules : ['KE_TOAN'],
      glossary: cfg?.glossary ?? {},
      nganh: cfg?.nganh ?? null,
    };
  }

  /**
   * Build AuthUserResponse from User entity
   */
  private buildUserResponse(user: User): AuthUserResponse {
    return {
      id: user._id.toString(),
      email: user.email,
      hoTen: user.hoTen,
      isSuperAdmin: this.isSuperAdmin(user),
    };
  }

  /**
   * Login with email and password - 2-step flow
   * Case 1: User có 1 tenant - trả về accessToken luôn
   * Case 2: User có nhiều tenants - trả về tempToken + danh sách tenants
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    if (user.trangThai !== UserStatus.HOAT_DONG) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // Lookup UserCredential by userId
    const credential = await this.userCredentialRepository.findOne({
      where: { userId: user._id.toString(), isActive: true },
    });

    if (!credential) {
      throw new InternalServerErrorException('Không tìm thấy thông tin xác thực');
    }

    const isPasswordValid = await bcrypt.compare(password, credential.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    // Update lastLoginAt
    credential.lastLoginAt = new Date();
    await this.userCredentialRepository.save(credential);

    const userResponse = this.buildUserResponse(user);

    // Super admin can login without tenant
    if (this.isSuperAdmin(user)) {
      // Get all tenants for super admin to choose, then filter to ke-toan entitled
      const allTenants = await this.tenantRepository.find({
        where: { isActive: true },
      });

      const entitledTenants = await this.filterEntitledTenants(allTenants);

      if (entitledTenants.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được cấp quyền sử dụng Kế toán ở công ty nào');
      }

      // Super admin with entitled tenants - let them choose
      const tenantInfoList: TenantInfo[] = await Promise.all(
        entitledTenants.map(async (tenant) => {
          const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId: tenant._id.toString() } as any });
          return this.buildTenantInfo('SUPER_ADMIN', tenant, cfg);
        }),
      );

      if (tenantInfoList.length === 1) {
        const tenantInfo = tenantInfoList[0];
        const payload: UserPayload = {
          id: user._id.toString(),
          email: user.email,
          tenantId: tenantInfo.tenantId,
          vaiTro: 'SUPER_ADMIN',
          permissions: ['*'],
        };

        const accessToken = this.jwtService.sign(payload);

        return {
          accessToken,
          tenant: tenantInfo,
          user: userResponse,
        };
      }

      // Multiple tenants - return tempToken
      const tempPayload = {
        id: user._id.toString(),
        email: user.email,
      };

      const tempToken = this.jwtService.signTempToken(tempPayload);

      return {
        tempToken,
        tenants: tenantInfoList,
        user: userResponse,
      };
    }

    // Get user's tenant memberships from UserTenant table
    const userTenants = await this.userTenantRepository.find({
      where: { userId: user._id.toString(), isActive: true },
    });

    if (userTenants.length === 0) {
      throw new ForbiddenException('Người dùng chưa được gán công ty');
    }

    // Fetch tenant details
    const { ObjectId } = await import('mongodb');
    const tenantIds = userTenants.map((ut) => new ObjectId(ut.tenantId));
    const tenants = await this.tenantRepository.find({
      where: {
        _id: { $in: tenantIds } as any,
        isActive: true,
      },
    });

    if (tenants.length === 0) {
      throw new ForbiddenException('Không tìm thấy công ty hoạt động');
    }

    // Filter tenants to those with ke-toan entitlement
    const entitledTenants = await this.filterEntitledTenants(tenants);
    if (entitledTenants.length === 0) {
      throw new ForbiddenException('Tài khoản chưa được cấp quyền sử dụng Kế toán ở công ty nào');
    }

    // Build tenant info list — role from AppUserRole, config from TenantAppConfig
    const tenantInfoList: TenantInfo[] = await Promise.all(
      entitledTenants.map(async (tenant) => {
        const tenantId = tenant._id.toString();
        const aur = await this.appUserRoleRepo.findOne({ where: { userId: user._id.toString(), tenantId, isActive: true } as any });
        const role = aur?.role || 'KIEM_SOAT';
        const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId } as any });
        return this.buildTenantInfo(role, tenant, cfg);
      }),
    );

    // Case 1: Single entitled tenant - return accessToken directly
    if (tenantInfoList.length === 1) {
      const tenant = entitledTenants[0];
      const tenantId = tenant._id.toString();
      // Lazy-provision Kế toán config/role nếu công ty tạo từ Portal chưa có (P3)
      const membership = userTenants.find((ut) => ut.tenantId === tenantId);
      const isCompanyAdmin = membership?.role === 'admin';
      try {
        await this.ensureKeToanProvisioned(tenantId, user._id.toString(), isCompanyAdmin);
      } catch (err) {
        this.logger.warn(`ensureKeToanProvisioned failed for tenant ${tenantId}: ${(err as Error).message}`);
      }
      // Đọc lại role + config sau provisioning
      const aur = await this.appUserRoleRepo.findOne({ where: { userId: user._id.toString(), tenantId, isActive: true } as any });
      const role = aur?.role || 'KIEM_SOAT';
      const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId } as any });
      const tenantInfo = this.buildTenantInfo(role, tenant, cfg);
      const permissions = await this.loadPermissions(role, tenantId);
      const payload: UserPayload = {
        id: user._id.toString(),
        email: user.email,
        tenantId,
        vaiTro: role,
        permissions: [],
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        tenant: tenantInfo,
        user: userResponse,
        permissions,
      };
    }

    // Case 2: Multiple tenants - return tempToken + tenants list
    const tempToken = this.jwtService.signTempToken({
      id: user._id.toString(),
      email: user.email,
    });

    return {
      tempToken,
      tenants: tenantInfoList,
      user: userResponse,
    };
  }

  /**
   * Select tenant after login (step 2 of 2-step flow)
   */
  async selectTenant(dto: SelectTenantDto): Promise<SelectTenantResponse> {
    // Verify temp token
    let decoded;
    try {
      decoded = this.jwtService.verifyTempToken(dto.tempToken);
    } catch (error) {
      throw new UnauthorizedException((error as Error).message);
    }

    const { ObjectId } = await import('mongodb');

    // Get user
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(decoded.sub) as any },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    if (user.trangThai !== UserStatus.HOAT_DONG) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // Get tenant details
    const tenant = await this.tenantRepository.findOne({
      where: { _id: new ObjectId(dto.tenantId) as any, isActive: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Không tìm thấy công ty hoặc công ty đã ngừng hoạt động');
    }

    // Enforce ke-toan entitlement (applies to all users, including super-admin)
    if (!(await this.isKeToanEnabled(dto.tenantId))) {
      throw new ForbiddenException('Công ty chưa kích hoạt ứng dụng Kế toán');
    }

    // Super admin can access any entitled tenant
    if (this.isSuperAdmin(user)) {
      const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId: tenant._id.toString() } as any });
      const tenantInfo = this.buildTenantInfo('SUPER_ADMIN', tenant, cfg);

      const payload: UserPayload = {
        id: user._id.toString(),
        email: user.email,
        tenantId: tenantInfo.tenantId,
        vaiTro: 'SUPER_ADMIN',
        permissions: ['*'],
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        tenant: tenantInfo,
        user: this.buildUserResponse(user),
        permissions: ['*'],
      };
    }

    // Regular user - check if belongs to tenant via UserTenant table
    const userTenant = await this.userTenantRepository.findOne({
      where: {
        userId: user._id.toString(),
        tenantId: dto.tenantId,
        isActive: true,
      },
    });

    if (!userTenant) {
      throw new ForbiddenException('Người dùng không thuộc công ty này');
    }

    // Lazy-provision Kế toán config + Admin role for Portal-created tenants
    const isCompanyAdmin = userTenant.role === 'admin';
    try {
      await this.ensureKeToanProvisioned(dto.tenantId, user._id.toString(), isCompanyAdmin);
    } catch (err) {
      this.logger.warn(`ensureKeToanProvisioned failed for tenant ${dto.tenantId}: ${(err as Error).message}`);
    }

    // Read functional role from AppUserRole, config from TenantAppConfig
    const aur = await this.appUserRoleRepo.findOne({ where: { userId: user._id.toString(), tenantId: dto.tenantId, isActive: true } as any });
    const role = aur?.role || 'KIEM_SOAT';
    const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId: dto.tenantId } as any });
    const tenantInfo = this.buildTenantInfo(role, tenant, cfg);

    // Create access token without permissions (too large for JWT/headers)
    const permissions = await this.loadPermissions(tenantInfo.role, tenantInfo.tenantId);
    const payload: UserPayload = {
      id: user._id.toString(),
      email: user.email,
      tenantId: tenantInfo.tenantId,
      vaiTro: tenantInfo.role,
      permissions: [],
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tenant: tenantInfo,
      user: this.buildUserResponse(user),
      permissions,
    };
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<Partial<User>> {
    const { email, password, hoTen, tenantId, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user (identity connection)
    const user = this.userRepository.create({
      email,
      hoTen,
      trangThai: UserStatus.HOAT_DONG,
    });

    const savedUser = await this.userRepository.save(user);

    // Create UserCredential with hashed password (identity connection)
    const credential = this.userCredentialRepository.create({
      userId: savedUser._id.toString(),
      password: hashedPassword,
      isActive: true,
    });

    await this.userCredentialRepository.save(credential);

    // Create UserTenant membership if tenantId provided (identity connection)
    if (tenantId) {
      const userTenant = this.userTenantRepository.create({
        userId: savedUser._id.toString(),
        tenantId,
        role: role || 'KIEM_SOAT',
        isActive: true,
      });
      await this.userTenantRepository.save(userTenant);

      // Create functional role in AppUserRole (digital_book connection)
      const appUserRole = this.appUserRoleRepo.create({
        userId: savedUser._id.toString(),
        tenantId,
        role: role || 'KIEM_SOAT',
        isActive: true,
      });
      await this.appUserRoleRepo.save(appUserRole);
    }

    return {
      _id: savedUser._id,
      email: savedUser.email,
      hoTen: savedUser.hoTen,
    };
  }

  /**
   * Verify a JWT token and return decoded payload
   */
  verify(verifyDto: VerifyTokenDto): UserPayload {
    try {
      const decoded = this.jwtService.verify(verifyDto.token);
      return {
        id: decoded.sub,
        email: decoded.email,
        tenantId: decoded.tenantId,
        vaiTro: decoded.vaiTro,
        permissions: decoded.permissions,
      };
    } catch (error) {
      throw new UnauthorizedException((error as Error).message);
    }
  }

  /**
   * Get current user profile with tenant info
   */
  async getMe(userId: string, tenantId: string): Promise<{
    user: AuthUserResponse;
    tenant?: TenantInfo;
    availableTenants: TenantInfo[];
    permissions: string[];
  }> {
    const { ObjectId } = await import('mongodb');
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    // Super admin - get all active tenants, filter to ke-toan entitled
    if (this.isSuperAdmin(user)) {
      const allTenants = await this.tenantRepository.find({
        where: { isActive: true },
      });

      const entitledTenants = await this.filterEntitledTenants(allTenants);

      // Config from TenantAppConfig for entitled tenants only
      const availableTenants: TenantInfo[] = await Promise.all(
        entitledTenants.map(async (t) => {
          const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId: t._id.toString() } as any });
          return this.buildTenantInfo('SUPER_ADMIN', t, cfg);
        }),
      );

      if (!tenantId) {
        return {
          user: this.buildUserResponse(user),
          availableTenants,
          permissions: ['*'],
        };
      }

      // Current tenant looked up from full list (token already validated at issue time)
      const tenant = allTenants.find((t) => t._id.toString() === tenantId);
      if (!tenant) {
        throw new ForbiddenException('Không tìm thấy công ty');
      }

      const currentCfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId } as any });

      return {
        user: this.buildUserResponse(user),
        tenant: this.buildTenantInfo('SUPER_ADMIN', tenant, currentCfg),
        availableTenants,
        permissions: ['*'],
      };
    }

    // Regular user - get all memberships for availableTenants
    const allUserTenants = await this.userTenantRepository.find({
      where: { userId: user._id.toString(), isActive: true },
    });

    const tenantIds = allUserTenants.map((ut) => new ObjectId(ut.tenantId));
    const allTenants = tenantIds.length > 0
      ? await this.tenantRepository.find({
          where: { _id: { $in: tenantIds } as any, isActive: true },
        })
      : [];

    // Filter membership tenants to ke-toan entitled ones for availableTenants
    const entitledTenants = await this.filterEntitledTenants(allTenants);

    // Role from AppUserRole, config from TenantAppConfig for entitled tenants only
    const availableTenants: TenantInfo[] = await Promise.all(
      entitledTenants.map(async (t) => {
        const tId = t._id.toString();
        const aur = await this.appUserRoleRepo.findOne({ where: { userId: user._id.toString(), tenantId: tId, isActive: true } as any });
        const role = aur?.role || 'KIEM_SOAT';
        const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId: tId } as any });
        return this.buildTenantInfo(role, t, cfg);
      }),
    );

    // Current tenant info
    const currentUserTenant = allUserTenants.find((ut) => ut.tenantId === tenantId);
    if (!currentUserTenant) {
      throw new ForbiddenException('Người dùng không thuộc công ty này');
    }

    const currentTenant = allTenants.find((t) => t._id.toString() === tenantId);
    if (!currentTenant) {
      throw new ForbiddenException('Không tìm thấy công ty');
    }

    const currentAur = await this.appUserRoleRepo.findOne({ where: { userId: user._id.toString(), tenantId, isActive: true } as any });
    const currentRole = currentAur?.role || 'KIEM_SOAT';
    const currentCfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId } as any });

    return {
      user: this.buildUserResponse(user),
      tenant: this.buildTenantInfo(currentRole, currentTenant, currentCfg),
      availableTenants,
      permissions: await this.loadPermissions(currentRole, tenantId),
    };
  }

  /**
   * Switch tenant for an already-authenticated user (no re-login needed)
   */
  async switchTenant(userId: string, tenantId: string): Promise<SelectTenantResponse> {
    const { ObjectId } = await import('mongodb');

    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    if (user.trangThai !== UserStatus.HOAT_DONG) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const tenant = await this.tenantRepository.findOne({
      where: { _id: new ObjectId(tenantId) as any, isActive: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Không tìm thấy công ty hoặc công ty đã ngừng hoạt động');
    }

    // Enforce ke-toan entitlement (applies to all users, including super-admin)
    if (!(await this.isKeToanEnabled(tenantId))) {
      throw new ForbiddenException('Công ty chưa kích hoạt ứng dụng Kế toán');
    }

    // Super admin can access any entitled tenant
    if (this.isSuperAdmin(user)) {
      const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId: tenant._id.toString() } as any });
      const tenantInfo = this.buildTenantInfo('SUPER_ADMIN', tenant, cfg);

      const payload: UserPayload = {
        id: user._id.toString(),
        email: user.email,
        tenantId: tenantInfo.tenantId,
        vaiTro: 'SUPER_ADMIN',
        permissions: ['*'],
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        tenant: tenantInfo,
        user: this.buildUserResponse(user),
        permissions: ['*'],
      };
    }

    // Regular user - verify membership
    const userTenant = await this.userTenantRepository.findOne({
      where: {
        userId: user._id.toString(),
        tenantId,
        isActive: true,
      },
    });

    if (!userTenant) {
      throw new ForbiddenException('Người dùng không thuộc công ty này');
    }

    // Lazy-provision Kế toán config + Admin role for Portal-created tenants
    const isCompanyAdmin = userTenant.role === 'admin';
    try {
      await this.ensureKeToanProvisioned(tenantId, user._id.toString(), isCompanyAdmin);
    } catch (err) {
      this.logger.warn(`ensureKeToanProvisioned failed for tenant ${tenantId}: ${(err as Error).message}`);
    }

    // Read functional role from AppUserRole, config from TenantAppConfig
    const aur = await this.appUserRoleRepo.findOne({ where: { userId: user._id.toString(), tenantId, isActive: true } as any });
    const role = aur?.role || 'KIEM_SOAT';
    const cfg = await this.tenantAppConfigRepo.findOne({ where: { tenantId } as any });
    const tenantInfo = this.buildTenantInfo(role, tenant, cfg);

    const permissions = await this.loadPermissions(tenantInfo.role, tenantInfo.tenantId);
    const payload: UserPayload = {
      id: user._id.toString(),
      email: user.email,
      tenantId: tenantInfo.tenantId,
      vaiTro: tenantInfo.role,
      permissions: [],
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tenant: tenantInfo,
      user: this.buildUserResponse(user),
      permissions,
    };
  }

  /**
   * Logout - invalidate token (placeholder for token blacklist)
   */
  logout(userId: string): { message: string } {
    // In a production system, you would add the token to a blacklist
    // For now, we just return success
    return { message: 'Đăng xuất thành công' };
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    const { ObjectId } = await import('mongodb');
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    // Update fields
    if (updateDto.hoTen) {
      user.hoTen = updateDto.hoTen;
    }

    const savedUser = await this.userRepository.save(user);

    return {
      _id: savedUser._id,
      email: savedUser.email,
      hoTen: savedUser.hoTen,
      trangThai: savedUser.trangThai,
    };
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { ObjectId } = await import('mongodb');
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    // Get user credential
    const credential = await this.userCredentialRepository.findOne({
      where: { userId: user._id.toString(), isActive: true },
    });

    if (!credential) {
      throw new InternalServerErrorException('Không tìm thấy thông tin xác thực');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      credential.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    // Hash new password and save
    credential.password = await bcrypt.hash(
      changePasswordDto.newPassword,
      SALT_ROUNDS,
    );
    credential.updatedAt = new Date();
    await this.userCredentialRepository.save(credential);

    return { message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
