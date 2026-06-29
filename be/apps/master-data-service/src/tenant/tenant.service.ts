import { sanitizeUpdateDto, generateAllPermissions } from '@app/core';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Tenant,
  User,
  UserCredential,
  UserTenant,
  UserStatus,
  VaiTro,
  PhanQuyen,
  Nganh,
  Glossary,
  AppUserRole,
  TenantAppConfig,
} from '@app/entities';
import {
  CreateTenantDto,
  UpdateTenantDto,
  AddUserToTenantDto,
  UpdateTenantMemberDto,
  UpdateMemberProfileDto,
} from '@app/dto';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456';
const ADMIN_ROLE_NAME = 'Admin';

export interface TenantAdminInfo {
  id: string;
  email: string;
  hoTen: string;
}

export interface TenantWithAdmin {
  _id: string;
  id: string;
  name: string;
  slug: string;
  maSoThue?: string;
  diaChi?: string;
  dienThoai?: string;
  email?: string;
  nguoiDaiDien?: string;
  isActive: boolean;
  modules: string[];
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  admins: TenantAdminInfo[];
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    // ── Identity repos (masterceo_identity DB) ──────────────────────────────
    @InjectRepository(Tenant, 'identity')
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User, 'identity')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCredential, 'identity')
    private readonly credentialRepository: Repository<UserCredential>,
    @InjectRepository(UserTenant, 'identity')
    private readonly userTenantRepository: Repository<UserTenant>,
    // ── RAW repos (digital_book DB, bypass tenant filtering) ────────────────
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`)
    private readonly vaiTroRepository: Repository<VaiTro>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`)
    private readonly phanQuyenRepository: Repository<PhanQuyen>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}Nganh`)
    private readonly nganhRepository: Repository<Nganh>,
    // ── Default repos (digital_book DB, TENANT_EXEMPT so no proxy) ──────────
    @InjectRepository(AppUserRole)
    private readonly appUserRoleRepository: Repository<AppUserRole>,
    @InjectRepository(TenantAppConfig)
    private readonly tenantAppConfigRepository: Repository<TenantAppConfig>,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Internal fetch: raw Tenant from identity DB, no TenantAppConfig merging.
   * Use this when you will write back to tenantRepository (to avoid saving
   * config fields that belong in TenantAppConfig).
   */
  private async findTenantEntity(id: string): Promise<Tenant> {
    const { ObjectId } = await import('mongodb');
    const tenant = await this.tenantRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!tenant) {
      throw new NotFoundException(`Không tìm thấy công ty với ID ${id}`);
    }
    return tenant;
  }

  /** Clone (deep) glossary của ngành theo code; {} nếu không có code / không tìm thấy. */
  async cloneGlossaryFromNganh(nganhCode?: string | null): Promise<Glossary> {
    if (!nganhCode) return {};
    const nganh = await this.nganhRepository.findOne({ where: { code: nganhCode } });
    if (!nganh?.glossary) return {};
    return JSON.parse(JSON.stringify(nganh.glossary)) as Glossary;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7a: Company CRUD + config + admin-provisioning
  // ──────────────────────────────────────────────────────────────────────────

  async findAll(): Promise<TenantWithAdmin[]> {
    const tenants = await this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });

    const tenantsWithAdmins: TenantWithAdmin[] = await Promise.all(
      tenants.map(async (tenant) => {
        const tenantId = tenant._id.toString();

        // Load config from TenantAppConfig (modules, nganh live here after P2)
        const config = await this.tenantAppConfigRepository.findOne({
          where: { tenantId },
        });

        // Admin lookup: identity membership role is 'admin' (lowercase) after P2
        const adminMemberships = await this.userTenantRepository.find({
          where: {
            tenantId,
            role: 'admin',
            isActive: true,
          },
        });

        let admins: TenantAdminInfo[] = [];

        if (adminMemberships.length > 0) {
          const { ObjectId } = await import('mongodb');
          const adminUserIds = adminMemberships.map((m) => new ObjectId(m.userId));
          const adminUsers = await this.userRepository.find({
            where: {
              _id: { $in: adminUserIds } as any,
              isActive: true,
            },
          });

          admins = adminUsers.map((u) => ({
            id: u._id.toString(),
            email: u.email,
            hoTen: u.hoTen,
          }));
        }

        return {
          _id: tenantId,
          id: tenantId,
          name: tenant.name,
          slug: tenant.slug,
          maSoThue: tenant.maSoThue,
          diaChi: tenant.diaChi,
          dienThoai: tenant.dienThoai,
          email: tenant.email,
          nguoiDaiDien: tenant.nguoiDaiDien,
          isActive: tenant.isActive,
          modules: config?.modules ?? ['KE_TOAN'],
          tenantId: tenant.tenantId,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
          admins,
        };
      }),
    );

    return tenantsWithAdmins;
  }

  /**
   * Public findOne: fetches Tenant from identity DB and merges config fields
   * (modules, nganh, glossary, dashboardBlocks) from TenantAppConfig.
   * Used externally by controller and internally by 7b methods for verification.
   */
  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.findTenantEntity(id);

    // Merge config fields from TenantAppConfig
    const config = await this.tenantAppConfigRepository.findOne({
      where: { tenantId: id },
    });
    tenant.modules = config?.modules ?? ['KE_TOAN'];
    tenant.nganh = config?.nganh ?? null;
    tenant.glossary = config?.glossary ?? {};
    tenant.dashboardBlocks = config?.dashboardBlocks ?? null;

    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async create(createDto: CreateTenantDto): Promise<{ tenant: Tenant; admin?: Partial<User> }> {
    const existing = await this.findBySlug(createDto.slug);
    if (existing) {
      throw new ConflictException(`Công ty với slug ${createDto.slug} đã tồn tại`);
    }

    // Create Tenant in identity DB with identity fields only (no modules/nganh/glossary)
    const tenant = this.tenantRepository.create({
      name: createDto.name,
      slug: createDto.slug,
      maSoThue: createDto.maSoThue,
      diaChi: createDto.diaChi,
      dienThoai: createDto.dienThoai,
      email: createDto.email,
      nguoiDaiDien: createDto.nguoiDaiDien,
      isActive: createDto.isActive ?? true,
    });
    const savedTenant = await this.tenantRepository.save(tenant);

    // Clone glossary from nganh (if provided)
    const glossary = await this.cloneGlossaryFromNganh(createDto.nganh);

    // Create TenantAppConfig in digital_book DB
    const tenantConfig = this.tenantAppConfigRepository.create({
      tenantId: savedTenant._id.toString(),
      modules: createDto.modules?.length ? createDto.modules : ['KE_TOAN'],
      nganh: createDto.nganh ?? null,
      glossary,
      dashboardBlocks: null,
    });
    await this.tenantAppConfigRepository.save(tenantConfig);

    // Create admin user if provided
    let adminUser: Partial<User> | undefined;

    // Option 1: Use existing user by ID
    if (createDto.adminUserId) {
      const { ObjectId } = await import('mongodb');
      const existingUser = await this.userRepository.findOne({
        where: { _id: new ObjectId(createDto.adminUserId) as any },
      });

      if (existingUser) {
        // Check if user already has membership in this tenant
        const existingMembership = await this.userTenantRepository.findOne({
          where: {
            userId: existingUser._id.toString(),
            tenantId: savedTenant._id.toString(),
          },
        });

        if (!existingMembership) {
          // Create identity membership with lowercase 'admin' role
          const userTenant = this.userTenantRepository.create({
            userId: existingUser._id.toString(),
            tenantId: savedTenant._id.toString(),
            role: 'admin',
            isActive: true,
          });
          await this.userTenantRepository.save(userTenant);
        }

        // Create AppUserRole for the digital_book 'Admin' functional role
        const existingAppRole = await this.appUserRoleRepository.findOne({
          where: {
            userId: existingUser._id.toString(),
            tenantId: savedTenant._id.toString(),
          },
        });
        if (!existingAppRole) {
          await this.appUserRoleRepository.save(
            this.appUserRoleRepository.create({
              userId: existingUser._id.toString(),
              tenantId: savedTenant._id.toString(),
              role: ADMIN_ROLE_NAME,
              isActive: true,
            }),
          );
        }

        adminUser = { _id: existingUser._id, email: existingUser.email, hoTen: existingUser.hoTen };
      }
    }
    // Option 2: Create/link user with admin info
    else if (createDto.admin) {
      // Check if user with email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: createDto.admin.email.toLowerCase() },
      });

      if (existingUser) {
        // Link existing user to this tenant
        const existingMembership = await this.userTenantRepository.findOne({
          where: {
            userId: existingUser._id.toString(),
            tenantId: savedTenant._id.toString(),
          },
        });

        if (!existingMembership) {
          const userTenant = this.userTenantRepository.create({
            userId: existingUser._id.toString(),
            tenantId: savedTenant._id.toString(),
            role: 'admin',
            isActive: true,
          });
          await this.userTenantRepository.save(userTenant);
        }

        // Create AppUserRole for digital_book 'Admin' functional role
        const existingAppRole = await this.appUserRoleRepository.findOne({
          where: {
            userId: existingUser._id.toString(),
            tenantId: savedTenant._id.toString(),
          },
        });
        if (!existingAppRole) {
          await this.appUserRoleRepository.save(
            this.appUserRoleRepository.create({
              userId: existingUser._id.toString(),
              tenantId: savedTenant._id.toString(),
              role: ADMIN_ROLE_NAME,
              isActive: true,
            }),
          );
        }

        adminUser = { _id: existingUser._id, email: existingUser.email, hoTen: existingUser.hoTen };
      } else {
        // Create brand-new user in identity DB
        const password = createDto.admin.password || DEFAULT_PASSWORD;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = this.userRepository.create({
          email: createDto.admin.email.toLowerCase(),
          hoTen: createDto.admin.hoTen,
          trangThai: UserStatus.HOAT_DONG,
          isActive: true,
        });
        const savedUser = await this.userRepository.save(newUser);

        // Create credential in identity DB
        const credential = this.credentialRepository.create({
          userId: savedUser._id.toString(),
          password: hashedPassword,
          isActive: true,
        });
        await this.credentialRepository.save(credential);

        // Create identity membership with lowercase 'admin' role
        const userTenant = this.userTenantRepository.create({
          userId: savedUser._id.toString(),
          tenantId: savedTenant._id.toString(),
          role: 'admin',
          isActive: true,
        });
        await this.userTenantRepository.save(userTenant);

        // Create AppUserRole for the digital_book 'Admin' functional role
        await this.appUserRoleRepository.save(
          this.appUserRoleRepository.create({
            userId: savedUser._id.toString(),
            tenantId: savedTenant._id.toString(),
            role: ADMIN_ROLE_NAME,
            isActive: true,
          }),
        );

        adminUser = { _id: savedUser._id, email: savedUser.email, hoTen: savedUser.hoTen };
      }
    }

    // Auto-create 'Admin' VaiTro + PhanQuyen (full perms) in digital_book for this tenant
    await this.ensureAdminRole(savedTenant._id.toString());

    // Return tenant enriched with config data
    savedTenant.modules = tenantConfig.modules;
    savedTenant.nganh = tenantConfig.nganh;
    savedTenant.glossary = tenantConfig.glossary;
    savedTenant.dashboardBlocks = tenantConfig.dashboardBlocks ?? null;

    return { tenant: savedTenant, admin: adminUser };
  }

  /**
   * Ensure "Admin" role exists in vai_tro and has full permissions in phan_quyen
   * for the given tenant in digital_book DB.
   * ADMIN_ROLE_NAME = 'Admin' (capitalized) — the functional accounting role.
   */
  private async ensureAdminRole(tenantId: string): Promise<void> {
    try {
      const existingRole = await this.vaiTroRepository.findOne({
        where: { ten: ADMIN_ROLE_NAME },
      });

      if (!existingRole) {
        const adminRole = this.vaiTroRepository.create({
          ten: ADMIN_ROLE_NAME,
          moTa: 'Quản trị viên - toàn quyền',
          isActive: true,
        });
        await this.vaiTroRepository.save(adminRole);
      }

      const existingPhanQuyen = await this.phanQuyenRepository.findOne({
        where: { vaiTro: ADMIN_ROLE_NAME, tenantId },
      });

      if (!existingPhanQuyen) {
        const phanQuyen = this.phanQuyenRepository.create({
          vaiTro: ADMIN_ROLE_NAME,
          ten: ADMIN_ROLE_NAME,
          moTa: 'Toàn quyền hệ thống',
          tenantId,
          permissions: generateAllPermissions(),
          isActive: true,
        });
        await this.phanQuyenRepository.save(phanQuyen);
      } else if (!existingPhanQuyen.permissions || existingPhanQuyen.permissions.length === 0) {
        existingPhanQuyen.permissions = generateAllPermissions();
        await this.phanQuyenRepository.save(existingPhanQuyen);
      }
    } catch (error) {
      this.logger.warn(`Failed to ensure admin role: ${error.message}`);
    }
  }

  async update(id: string, updateDto: UpdateTenantDto): Promise<Tenant> {
    // Use raw entity fetch (no config merging) so we don't accidentally write config
    // fields back to the identity DB when saving the tenant.
    const tenant = await this.findTenantEntity(id);

    if (updateDto.slug && updateDto.slug !== tenant.slug) {
      const existing = await this.findBySlug(updateDto.slug);
      if (existing) {
        throw new ConflictException(`Công ty với slug ${updateDto.slug} đã tồn tại`);
      }
    }

    // Split identity fields vs config fields
    const { modules, nganh, ...identityDto } = sanitizeUpdateDto(updateDto);

    // Apply only identity fields to tenant (modules/nganh stay in TenantAppConfig)
    Object.assign(tenant, identityDto);
    const savedTenant = await this.tenantRepository.save(tenant);

    // Upsert TenantAppConfig when config fields are present in the dto
    let config: TenantAppConfig | null = null;
    if (modules !== undefined || nganh !== undefined) {
      config = await this.tenantAppConfigRepository.findOne({ where: { tenantId: id } });
      if (!config) {
        config = this.tenantAppConfigRepository.create({
          tenantId: id,
          modules: modules ?? ['KE_TOAN'],
          nganh: nganh ?? null,
          glossary: {},
          dashboardBlocks: null,
        });
      } else {
        if (modules !== undefined) config.modules = modules;
        if (nganh !== undefined) config.nganh = nganh;
      }
      await this.tenantAppConfigRepository.save(config);
    } else {
      // Load existing config to merge into return value
      config = await this.tenantAppConfigRepository.findOne({ where: { tenantId: id } });
    }

    // Merge config into returned tenant so caller sees up-to-date shape
    savedTenant.modules = config?.modules ?? ['KE_TOAN'];
    savedTenant.nganh = config?.nganh ?? null;
    savedTenant.glossary = config?.glossary ?? {};
    savedTenant.dashboardBlocks = config?.dashboardBlocks ?? null;

    return savedTenant;
  }

  /** Ghi đè glossary của 1 tenant (self-service: admin công ty sửa nhãn công ty mình). */
  async updateGlossary(tenantId: string, glossary: Glossary): Promise<Tenant> {
    // Verify tenant exists (raw, no config merge — we load config separately below)
    const tenant = await this.findTenantEntity(tenantId);

    // Upsert TenantAppConfig glossary
    let config = await this.tenantAppConfigRepository.findOne({ where: { tenantId } });
    if (!config) {
      config = this.tenantAppConfigRepository.create({
        tenantId,
        modules: ['KE_TOAN'],
        nganh: null,
        glossary: glossary ?? {},
        dashboardBlocks: null,
      });
    } else {
      config.glossary = glossary ?? {};
    }
    await this.tenantAppConfigRepository.save(config);

    // Return enriched tenant (no need to save to identity DB)
    tenant.modules = config.modules;
    tenant.nganh = config.nganh ?? null;
    tenant.glossary = config.glossary;
    tenant.dashboardBlocks = config.dashboardBlocks ?? null;
    return tenant;
  }

  /** Đọc cấu hình khối dashboard của tenant; null = chưa cấu hình (hiển thị tất cả). */
  async getDashboardBlocks(tenantId: string): Promise<string[] | null> {
    // Verify tenant exists
    await this.findTenantEntity(tenantId);
    const config = await this.tenantAppConfigRepository.findOne({ where: { tenantId } });
    return config?.dashboardBlocks ?? null;
  }

  /** Ghi đè danh sách khối dashboard hiển thị của 1 tenant. */
  async updateDashboardBlocks(
    tenantId: string,
    blocks: string[],
  ): Promise<{ dashboardBlocks: string[] }> {
    // Verify tenant exists
    await this.findTenantEntity(tenantId);

    const dashboardBlocks = Array.isArray(blocks) ? blocks : [];
    let config = await this.tenantAppConfigRepository.findOne({ where: { tenantId } });
    if (!config) {
      config = this.tenantAppConfigRepository.create({
        tenantId,
        modules: ['KE_TOAN'],
        nganh: null,
        glossary: {},
        dashboardBlocks,
      });
    } else {
      config.dashboardBlocks = dashboardBlocks;
    }
    await this.tenantAppConfigRepository.save(config);
    return { dashboardBlocks };
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findTenantEntity(id);
    tenant.isActive = false;
    await this.tenantRepository.save(tenant);

    // Deactivate all UserTenant memberships (identity DB)
    const memberships = await this.userTenantRepository.find({
      where: { tenantId: id, isActive: true },
    });
    if (memberships.length > 0) {
      for (const membership of memberships) {
        membership.isActive = false;
      }
      await this.userTenantRepository.save(memberships);
    }

    // Deactivate all AppUserRole rows for this tenant (digital_book DB)
    const appRoles = await this.appUserRoleRepository.find({
      where: { tenantId: id, isActive: true },
    });
    if (appRoles.length > 0) {
      for (const role of appRoles) {
        role.isActive = false;
      }
      await this.appUserRoleRepository.save(appRoles);
    }
  }

  async hardDelete(id: string): Promise<void> {
    const tenant = await this.findTenantEntity(id);
    await this.tenantRepository.remove(tenant);

    // Remove TenantAppConfig for this tenant
    const config = await this.tenantAppConfigRepository.findOne({ where: { tenantId: id } });
    if (config) {
      await this.tenantAppConfigRepository.remove(config);
    }

    // Remove all AppUserRole rows for this tenant
    const appRoles = await this.appUserRoleRepository.find({ where: { tenantId: id } });
    if (appRoles.length > 0) {
      await this.appUserRoleRepository.remove(appRoles);
    }
  }

  async getAllUsers(): Promise<Array<{ id: string; email: string; hoTen: string }>> {
    const users = await this.userRepository.find({
      where: { isActive: true },
    });

    return users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      hoTen: u.hoTen,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7b: Member management — DO NOT MODIFY in 7a
  // ──────────────────────────────────────────────────────────────────────────

  async getTenantMembers(tenantId: string): Promise<Array<{
    id: string;
    email: string;
    hoTen: string;
    role: string;
    isActive: boolean;
    membershipId: string;
  }>> {
    // Verify tenant exists
    await this.findOne(tenantId);

    const memberships = await this.userTenantRepository.find({
      where: { tenantId, isActive: true },
    });

    if (memberships.length === 0) return [];

    const { ObjectId } = await import('mongodb');
    const userIds = memberships.map((m) => new ObjectId(m.userId));
    const users = await this.userRepository.find({
      where: { _id: { $in: userIds } as any },
    });

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Load functional roles from AppUserRole (digital_book) — keyed by userId
    const appRoles = await this.appUserRoleRepository.find({
      where: { tenantId },
    });
    const appRoleMap = new Map(appRoles.map((r) => [r.userId, r.role]));

    return memberships
      .map((m) => {
        const user = userMap.get(m.userId);
        if (!user) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          hoTen: user.hoTen,
          // Functional role comes from AppUserRole, NOT from membership.role
          role: appRoleMap.get(m.userId) ?? '',
          isActive: m.isActive,
          membershipId: m._id.toString(),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }

  async addUserToTenant(tenantId: string, dto: AddUserToTenantDto): Promise<{
    user: { id: string; email: string; hoTen: string };
    role: string;
    isNew: boolean;
  }> {
    // Verify tenant exists
    await this.findOne(tenantId);

    let user: User;
    let isNew = false;

    if (dto.userId) {
      // Use existing user by ID
      const { ObjectId } = await import('mongodb');
      const found = await this.userRepository.findOne({
        where: { _id: new ObjectId(dto.userId) as any },
      });
      if (!found) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID ${dto.userId}`);
      }
      user = found;
    } else if (dto.email) {
      // Find by email or create new
      const existing = await this.userRepository.findOne({
        where: { email: dto.email.toLowerCase() },
      });

      if (existing) {
        user = existing;
      } else {
        // Create new user
        const password = dto.password || DEFAULT_PASSWORD;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = this.userRepository.create({
          email: dto.email.toLowerCase(),
          hoTen: dto.hoTen!,
          trangThai: UserStatus.HOAT_DONG,
          isActive: true,
        });
        user = await this.userRepository.save(newUser);

        const credential = this.credentialRepository.create({
          userId: user._id.toString(),
          password: hashedPassword,
          isActive: true,
        });
        await this.credentialRepository.save(credential);
        isNew = true;
      }
    } else {
      throw new ConflictException('Phải cung cấp userId hoặc email');
    }

    // Check existing membership
    const existingMembership = await this.userTenantRepository.findOne({
      where: { userId: user._id.toString(), tenantId },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException('User đã là thành viên của công ty này');
      }
      // Reactivate inactive membership — tier is always 'member' for added users
      existingMembership.isActive = true;
      existingMembership.role = 'member';
      await this.userTenantRepository.save(existingMembership);
    } else {
      // Identity membership tier: 'member' (NOT the functional accounting role)
      const userTenant = this.userTenantRepository.create({
        userId: user._id.toString(),
        tenantId,
        role: 'member',
        isActive: true,
      });
      await this.userTenantRepository.save(userTenant);
    }

    // Upsert functional role in AppUserRole (digital_book)
    const existingAppRole = await this.appUserRoleRepository.findOne({
      where: { userId: user._id.toString(), tenantId },
    });
    if (existingAppRole) {
      existingAppRole.role = dto.role;
      existingAppRole.isActive = true;
      await this.appUserRoleRepository.save(existingAppRole);
    } else {
      await this.appUserRoleRepository.save(
        this.appUserRoleRepository.create({
          userId: user._id.toString(),
          tenantId,
          role: dto.role,
          isActive: true,
        }),
      );
    }

    return {
      user: { id: user._id.toString(), email: user.email, hoTen: user.hoTen },
      role: dto.role,
      isNew,
    };
  }

  async updateTenantMember(
    tenantId: string,
    userId: string,
    dto: UpdateTenantMemberDto,
  ): Promise<void> {
    const membership = await this.userTenantRepository.findOne({
      where: { tenantId, userId },
    });

    if (!membership) {
      throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
    }

    // dto.isActive → update membership active state in identity DB
    if (dto.isActive !== undefined) {
      membership.isActive = dto.isActive;
      await this.userTenantRepository.save(membership);
    }

    // dto.role → upsert FUNCTIONAL role in AppUserRole (digital_book), NOT membership.role
    if (dto.role !== undefined) {
      const existingAppRole = await this.appUserRoleRepository.findOne({
        where: { userId, tenantId },
      });
      if (existingAppRole) {
        existingAppRole.role = dto.role;
        existingAppRole.isActive = true;
        await this.appUserRoleRepository.save(existingAppRole);
      } else {
        await this.appUserRoleRepository.save(
          this.appUserRoleRepository.create({
            userId,
            tenantId,
            role: dto.role,
            isActive: true,
          }),
        );
      }
    }
  }

  async updateMemberProfile(
    tenantId: string,
    userId: string,
    dto: UpdateMemberProfileDto,
  ): Promise<{ id: string; email: string; hoTen: string }> {
    const membership = await this.userTenantRepository.findOne({
      where: { tenantId, userId, isActive: true },
    });
    if (!membership) {
      throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
    }

    const { ObjectId } = await import('mongodb');
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (dto.email) {
      const email = dto.email.toLowerCase();
      if (email !== user.email) {
        const existing = await this.userRepository.findOne({ where: { email } });
        if (existing && existing._id.toString() !== userId) {
          throw new ConflictException('Email đã được sử dụng');
        }
        user.email = email;
      }
    }
    if (dto.hoTen !== undefined) {
      user.hoTen = dto.hoTen;
    }

    const saved = await this.userRepository.save(user);
    return { id: saved._id.toString(), email: saved.email, hoTen: saved.hoTen };
  }

  async resetMemberPassword(
    tenantId: string,
    userId: string,
  ): Promise<{ defaultPassword: string }> {
    const membership = await this.userTenantRepository.findOne({
      where: { tenantId, userId, isActive: true },
    });
    if (!membership) {
      throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    let credential = await this.credentialRepository.findOne({
      where: { userId },
    });
    if (credential) {
      credential.password = hashedPassword;
    } else {
      credential = this.credentialRepository.create({
        userId,
        password: hashedPassword,
        isActive: true,
      });
    }
    await this.credentialRepository.save(credential);

    return { defaultPassword: DEFAULT_PASSWORD };
  }

  async removeTenantMember(tenantId: string, userId: string): Promise<void> {
    const membership = await this.userTenantRepository.findOne({
      where: { tenantId, userId },
    });

    if (!membership) {
      throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
    }

    membership.isActive = false;
    await this.userTenantRepository.save(membership);

    // Also deactivate the member's functional role in AppUserRole (digital_book)
    const appRole = await this.appUserRoleRepository.findOne({
      where: { userId, tenantId },
    });
    if (appRole) {
      appRole.isActive = false;
      await this.appUserRoleRepository.save(appRole);
    }
  }
}
