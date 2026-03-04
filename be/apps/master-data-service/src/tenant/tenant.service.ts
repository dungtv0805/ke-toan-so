import { sanitizeUpdateDto } from '@app/core';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Tenant, User, UserCredential, UserTenant, UserRole, UserStatus } from '@app/entities';
import { CreateTenantDto, UpdateTenantDto, AddUserToTenantDto, UpdateTenantMemberDto } from '@app/dto';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456';

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
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  admins: TenantAdminInfo[];
}

@Injectable()
export class TenantService {
  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`)
    private readonly tenantRepository: Repository<Tenant>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}User`)
    private readonly userRepository: Repository<User>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}UserCredential`)
    private readonly credentialRepository: Repository<UserCredential>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}UserTenant`)
    private readonly userTenantRepository: Repository<UserTenant>,
  ) {}

  async findAll(): Promise<TenantWithAdmin[]> {
    const tenants = await this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Get all admin users for each tenant
    const tenantsWithAdmins: TenantWithAdmin[] = await Promise.all(
      tenants.map(async (tenant) => {
        const adminMemberships = await this.userTenantRepository.find({
          where: {
            tenantId: tenant._id.toString(),
            role: UserRole.ADMIN,
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
          _id: tenant._id.toString(),
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          maSoThue: tenant.maSoThue,
          diaChi: tenant.diaChi,
          dienThoai: tenant.dienThoai,
          email: tenant.email,
          nguoiDaiDien: tenant.nguoiDaiDien,
          isActive: tenant.isActive,
          tenantId: tenant.tenantId,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
          admins,
        };
      }),
    );

    return tenantsWithAdmins;
  }

  async findOne(id: string): Promise<Tenant> {
    const { ObjectId } = await import('mongodb');
    const tenant = await this.tenantRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!tenant) {
      throw new NotFoundException(`Không tìm thấy công ty với ID ${id}`);
    }

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

    // Create tenant
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
          // Create new membership
          const userTenant = this.userTenantRepository.create({
            userId: existingUser._id.toString(),
            tenantId: savedTenant._id.toString(),
            role: UserRole.ADMIN,
            isActive: true,
          });
          await this.userTenantRepository.save(userTenant);
        }

        adminUser = { _id: existingUser._id, email: existingUser.email, hoTen: existingUser.hoTen };
      }
    }
    // Option 2: Create new user with admin info
    else if (createDto.admin) {
      // Check if user with email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: createDto.admin.email.toLowerCase() },
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
          // Create new membership
          const userTenant = this.userTenantRepository.create({
            userId: existingUser._id.toString(),
            tenantId: savedTenant._id.toString(),
            role: UserRole.ADMIN,
            isActive: true,
          });
          await this.userTenantRepository.save(userTenant);
        }

        adminUser = { _id: existingUser._id, email: existingUser.email, hoTen: existingUser.hoTen };
      } else {
        // Create new user
        const password = createDto.admin.password || DEFAULT_PASSWORD;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = this.userRepository.create({
          email: createDto.admin.email.toLowerCase(),
          hoTen: createDto.admin.hoTen,
          trangThai: UserStatus.HOAT_DONG,
          isActive: true,
        });
        const savedUser = await this.userRepository.save(newUser);

        // Create credential
        const credential = this.credentialRepository.create({
          userId: savedUser._id.toString(),
          password: hashedPassword,
          isActive: true,
        });
        await this.credentialRepository.save(credential);

        // Create UserTenant membership
        const userTenant = this.userTenantRepository.create({
          userId: savedUser._id.toString(),
          tenantId: savedTenant._id.toString(),
          role: UserRole.ADMIN,
          isActive: true,
        });
        await this.userTenantRepository.save(userTenant);

        adminUser = { _id: savedUser._id, email: savedUser.email, hoTen: savedUser.hoTen };
      }
    }

    return { tenant: savedTenant, admin: adminUser };
  }

  async update(id: string, updateDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (updateDto.slug && updateDto.slug !== tenant.slug) {
      const existing = await this.findBySlug(updateDto.slug);
      if (existing) {
        throw new ConflictException(`Công ty với slug ${updateDto.slug} đã tồn tại`);
      }
    }

    Object.assign(tenant, sanitizeUpdateDto(updateDto));
    return this.tenantRepository.save(tenant);
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    tenant.isActive = false;
    await this.tenantRepository.save(tenant);

    // Deactivate tất cả UserTenant membership của tenant này
    const memberships = await this.userTenantRepository.find({
      where: { tenantId: id, isActive: true },
    });

    if (memberships.length > 0) {
      for (const membership of memberships) {
        membership.isActive = false;
      }
      await this.userTenantRepository.save(memberships);
    }
  }

  async hardDelete(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantRepository.remove(tenant);
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

  async getTenantMembers(tenantId: string): Promise<Array<{
    id: string;
    email: string;
    hoTen: string;
    role: UserRole;
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

    return memberships
      .map((m) => {
        const user = userMap.get(m.userId);
        if (!user) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          hoTen: user.hoTen,
          role: m.role,
          isActive: m.isActive,
          membershipId: m._id.toString(),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }

  async addUserToTenant(tenantId: string, dto: AddUserToTenantDto): Promise<{
    user: { id: string; email: string; hoTen: string };
    role: UserRole;
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
      // Reactivate inactive membership
      existingMembership.isActive = true;
      existingMembership.role = dto.role;
      await this.userTenantRepository.save(existingMembership);
    } else {
      const userTenant = this.userTenantRepository.create({
        userId: user._id.toString(),
        tenantId,
        role: dto.role,
        isActive: true,
      });
      await this.userTenantRepository.save(userTenant);
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

    if (dto.role !== undefined) membership.role = dto.role;
    if (dto.isActive !== undefined) membership.isActive = dto.isActive;

    await this.userTenantRepository.save(membership);
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
  }
}
