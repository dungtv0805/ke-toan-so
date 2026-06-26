import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserCredential, Tenant, UserStatus, UserTenant, PhanQuyen, SUPER_ADMIN_EMAIL } from '@app/entities';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
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


@Injectable()
export class AuthServiceService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCredential)
    private readonly userCredentialRepository: Repository<UserCredential>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserTenant)
    private readonly userTenantRepository: Repository<UserTenant>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`)
    private readonly phanQuyenRepo: Repository<PhanQuyen>,
    private readonly jwtService: JwtService,
  ) {}

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
   * Build TenantInfo from UserTenant and Tenant entity
   */
  private buildTenantInfo(
    userTenant: UserTenant,
    tenant: Tenant,
  ): TenantInfo {
    return {
      tenantId: tenant._id.toString(),
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      role: userTenant.role,
      modules: tenant.modules?.length ? tenant.modules : ['KE_TOAN'],
      glossary: tenant.glossary ?? {},
      nganh: tenant.nganh ?? null,
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
      // Get all tenants for super admin to choose
      const allTenants = await this.tenantRepository.find({
        where: { isActive: true },
      });

      if (allTenants.length === 0) {
        // Super admin with no tenants - create token without tenantId
        const payload: UserPayload = {
          id: user._id.toString(),
          email: user.email,
          tenantId: '', // Empty for super admin without tenant
          vaiTro: 'SUPER_ADMIN',
          permissions: ['*'],
        };

        const accessToken = this.jwtService.sign(payload);

        return {
          accessToken,
          user: userResponse,
        };
      }

      // Super admin with tenants - let them choose
      const tenantInfoList: TenantInfo[] = allTenants.map((tenant) => ({
        tenantId: tenant._id.toString(),
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        role: 'SUPER_ADMIN',
        modules: tenant.modules?.length ? tenant.modules : ['KE_TOAN'],
        glossary: tenant.glossary ?? {},
        nganh: tenant.nganh ?? null,
      }));

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

    // Build tenant info list
    const tenantInfoList: TenantInfo[] = tenants.map((tenant) => {
      const userTenant = userTenants.find(
        (ut) => ut.tenantId === tenant._id.toString(),
      );
      return this.buildTenantInfo(userTenant!, tenant);
    });

    // Case 1: Single tenant - return accessToken directly
    if (tenantInfoList.length === 1) {
      const tenantInfo = tenantInfoList[0];
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

    // Super admin can access any tenant
    if (this.isSuperAdmin(user)) {
      const tenantInfo: TenantInfo = {
        tenantId: tenant._id.toString(),
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        role: 'SUPER_ADMIN',
        modules: tenant.modules?.length ? tenant.modules : ['KE_TOAN'],
        glossary: tenant.glossary ?? {},
        nganh: tenant.nganh ?? null,
      };

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

    const tenantInfo = this.buildTenantInfo(userTenant, tenant);

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

    // Create user
    const user = this.userRepository.create({
      email,
      hoTen,
      trangThai: UserStatus.HOAT_DONG,
    });

    const savedUser = await this.userRepository.save(user);

    // Create UserCredential with hashed password
    const credential = this.userCredentialRepository.create({
      userId: savedUser._id.toString(),
      password: hashedPassword,
      isActive: true,
    });

    await this.userCredentialRepository.save(credential);

    // Create UserTenant membership if tenantId provided
    if (tenantId) {
      const userTenant = this.userTenantRepository.create({
        userId: savedUser._id.toString(),
        tenantId,
        role: role || 'KIEM_SOAT',
        isActive: true,
      });
      await this.userTenantRepository.save(userTenant);
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

    // Super admin - get all active tenants
    if (this.isSuperAdmin(user)) {
      const allTenants = await this.tenantRepository.find({
        where: { isActive: true },
      });

      const availableTenants: TenantInfo[] = allTenants.map((t) => ({
        tenantId: t._id.toString(),
        tenantName: t.name,
        tenantSlug: t.slug,
        role: 'SUPER_ADMIN',
        modules: t.modules?.length ? t.modules : ['KE_TOAN'],
        glossary: t.glossary ?? {},
        nganh: t.nganh ?? null,
      }));

      if (!tenantId) {
        return {
          user: this.buildUserResponse(user),
          availableTenants,
          permissions: ['*'],
        };
      }

      const tenant = allTenants.find((t) => t._id.toString() === tenantId);
      if (!tenant) {
        throw new ForbiddenException('Không tìm thấy công ty');
      }

      return {
        user: this.buildUserResponse(user),
        tenant: {
          tenantId: tenant._id.toString(),
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          role: 'SUPER_ADMIN',
          modules: tenant.modules?.length ? tenant.modules : ['KE_TOAN'],
          glossary: tenant.glossary ?? {},
          nganh: tenant.nganh ?? null,
        },
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

    const availableTenants: TenantInfo[] = allTenants.map((t) => {
      const ut = allUserTenants.find((m) => m.tenantId === t._id.toString());
      return {
        tenantId: t._id.toString(),
        tenantName: t.name,
        tenantSlug: t.slug,
        role: ut?.role || 'KIEM_SOAT',
        modules: t.modules?.length ? t.modules : ['KE_TOAN'],
        glossary: t.glossary ?? {},
        nganh: t.nganh ?? null,
      };
    });

    // Current tenant info
    const currentUserTenant = allUserTenants.find((ut) => ut.tenantId === tenantId);
    if (!currentUserTenant) {
      throw new ForbiddenException('Người dùng không thuộc công ty này');
    }

    const currentTenant = allTenants.find((t) => t._id.toString() === tenantId);
    if (!currentTenant) {
      throw new ForbiddenException('Không tìm thấy công ty');
    }

    return {
      user: this.buildUserResponse(user),
      tenant: this.buildTenantInfo(currentUserTenant, currentTenant),
      availableTenants,
      permissions: await this.loadPermissions(currentUserTenant.role, tenantId),
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

    // Super admin can access any tenant
    if (this.isSuperAdmin(user)) {
      const tenantInfo: TenantInfo = {
        tenantId: tenant._id.toString(),
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        role: 'SUPER_ADMIN',
        modules: tenant.modules?.length ? tenant.modules : ['KE_TOAN'],
        glossary: tenant.glossary ?? {},
        nganh: tenant.nganh ?? null,
      };

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

    const tenantInfo = this.buildTenantInfo(userTenant, tenant);

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
