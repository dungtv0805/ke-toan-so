import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Tenant, User, UserCredential, UserTenant, UserRole, UserStatus } from '@app/entities';
import { CreateTenantDto, UpdateTenantDto } from '@app/dto';
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
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async create(createDto: CreateTenantDto): Promise<{ tenant: Tenant; admin?: Partial<User> }> {
    const existing = await this.findBySlug(createDto.slug);
    if (existing) {
      throw new ConflictException(`Tenant with slug ${createDto.slug} already exists`);
    }

    // Create tenant
    const tenant = this.tenantRepository.create({
      name: createDto.name,
      slug: createDto.slug,
      isActive: createDto.isActive ?? true,
    });
    const savedTenant = await this.tenantRepository.save(tenant);

    // Create admin user if provided
    let adminUser: Partial<User> | undefined;
    if (createDto.admin) {
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
        throw new ConflictException(`Tenant with slug ${updateDto.slug} already exists`);
      }
    }

    Object.assign(tenant, updateDto);
    return this.tenantRepository.save(tenant);
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    tenant.isActive = false;
    await this.tenantRepository.save(tenant);
  }

  async hardDelete(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantRepository.remove(tenant);
  }
}
